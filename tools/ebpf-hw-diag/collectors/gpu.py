"""GPU diagnostics collector — fence timeout and IOMMU fault detection."""
import logging
import time
from collectors.base import BaseCollector
from events.base import DiagEvent
from core.event_bus import EventBus
from core.probe_manager import ProbeManager

logger = logging.getLogger(__name__)

# GPU fence timeout event (not in events/ yet, define inline)
from dataclasses import dataclass


@dataclass
class FenceTimeoutEvent(DiagEvent):
    """GPU DMA fence exceeded timeout — indicates GPU hang."""
    source_probe: str = "fence_timeout"
    context_id: int = 0
    seqno: int = 0
    duration_ms: int = 0
    driver: str = ""


@dataclass
class IOMMUFaultEvent(DiagEvent):
    """IOMMU page fault from GPU or other device — invalid DMA access."""
    source_probe: str = "iommu_fault"
    fault_addr: int = 0
    flags: int = 0


GPU_BPF_PROGRAM = r"""
#include <uapi/linux/ptrace.h>

struct fence_event_t {
    u32    context;
    u32    seqno;
    u64    timestamp_ns;
};

struct iommu_event_t {
    char   dev_name[64];
    u64    dma_addr;
    u32    flags;
};

BPF_HASH(fence_start, u64, u64);
BPF_PERF_OUTPUT(fence_events);
BPF_PERF_OUTPUT(iommu_events);
BPF_ARRAY(fence_timeout_ns, u64, 1);

// Track fence creation
TRACEPOINT_PROBE(dma_fence, dma_fence_init) {
    u64 key = ((u64)args->context << 32) | args->seqno;
    u64 ts = bpf_ktime_get_ns();
    fence_start.update(&key, &ts);
    return 0;
}

// Track fence signal (completion)
TRACEPOINT_PROBE(dma_fence, dma_fence_signaled) {
    u64 key = ((u64)args->context << 32) | args->seqno;
    u64 *start_ts = fence_start.lookup(&key);
    if (!start_ts) return 0;

    u64 duration = bpf_ktime_get_ns() - *start_ts;
    fence_start.delete(&key);

    // Check against timeout threshold
    int th_key = 0;
    u64 *timeout = fence_timeout_ns.lookup(&th_key);
    u64 th_val = timeout ? *timeout : 5000000000ULL;  // default 5s

    if (duration > th_val) {
        struct fence_event_t evt = {};
        evt.context = args->context;
        evt.seqno = args->seqno;
        evt.timestamp_ns = duration;
        fence_events.perf_submit(args, &evt, sizeof(evt));
    }

    return 0;
}

// IOMMU page fault detection
TRACEPOINT_PROBE(iommu, io_page_fault) {
    struct iommu_event_t evt = {};
    bpf_probe_read_str(&evt.dev_name, sizeof(evt.dev_name), args->dev);
    evt.dma_addr = args->dma_addr;
    evt.flags = args->flags;
    iommu_events.perf_submit(args, &evt, sizeof(evt));
    return 0;
}
"""


class GPUCollector(BaseCollector):
    """Monitors GPU hangs (fence timeout) and IOMMU DMA faults."""

    def __init__(self, config: dict, event_bus: EventBus, probe_manager: ProbeManager):
        super().__init__(config, event_bus, probe_manager)
        self._bpf = None
        self._fence_timeout_ms = config.get("fence_timeout_ms", 5000)
        self._fence_loaded = False
        self._iommu_loaded = False

    def start(self) -> bool:
        if not self.enabled:
            logger.info("GPUCollector: disabled in config")
            return False

        # Try to load fence timeout probe
        result = self._probe_manager.try_load(
            probe_name="gpu_fence",
            bpf_text=GPU_BPF_PROGRAM,
            tracepoint="dma_fence:dma_fence_init",
        )

        if result.success:
            self._bpf = result.bpf_object

            # Set timeout threshold in BPF map
            timeout_ns = self._fence_timeout_ms * 1_000_000
            self._bpf["fence_timeout_ns"][0] = self._bpf["fence_timeout_ns"].Leaf(timeout_ns)

            # Register perf buffer callbacks
            self._bpf["fence_events"].open_perf_buffer(self._handle_fence_event)
            self._bpf["iommu_events"].open_perf_buffer(self._handle_iommu_event)

            self._fence_loaded = True
            self._iommu_loaded = True
            self._running = True
            logger.info(f"GPUCollector: started (fence_timeout={self._fence_timeout_ms}ms)")
            return True
        else:
            logger.warning(f"GPUCollector: failed to load probe: {result.reason}")
            # Try IOMMU-only fallback
            return self._try_iommu_only()

    def _try_iommu_only(self) -> bool:
        """Fallback: load only IOMMU fault monitoring if dma_fence not available."""
        iommu_program = r"""
#include <uapi/linux/ptrace.h>

struct iommu_event_t {
    char   dev_name[64];
    u64    dma_addr;
    u32    flags;
};

BPF_PERF_OUTPUT(iommu_events);

TRACEPOINT_PROBE(iommu, io_page_fault) {
    struct iommu_event_t evt = {};
    bpf_probe_read_str(&evt.dev_name, sizeof(evt.dev_name), args->dev);
    evt.dma_addr = args->dma_addr;
    evt.flags = args->flags;
    iommu_events.perf_submit(args, &evt, sizeof(evt));
    return 0;
}
"""
        result = self._probe_manager.try_load(
            probe_name="gpu_iommu_only",
            bpf_text=iommu_program,
            tracepoint="iommu:io_page_fault",
        )
        if result.success:
            self._bpf = result.bpf_object
            self._bpf["iommu_events"].open_perf_buffer(self._handle_iommu_event)
            self._iommu_loaded = True
            self._running = True
            logger.info("GPUCollector: started (IOMMU-only mode, dma_fence not available)")
            return True

        logger.warning("GPUCollector: neither dma_fence nor iommu tracepoints available")
        return False

    def stop(self) -> None:
        self._running = False
        if self._fence_loaded:
            self._probe_manager.unload("gpu_fence")
        elif self._iommu_loaded:
            self._probe_manager.unload("gpu_iommu_only")
        self._bpf = None
        logger.info("GPUCollector: stopped")

    def poll(self) -> None:
        if self._bpf and self._running:
            self._bpf.perf_buffer_poll(timeout=100)

    def _handle_fence_event(self, cpu, data, size) -> None:
        """Process GPU fence timeout event."""
        evt = self._bpf["fence_events"].event(data)
        duration_ms = evt.timestamp_ns // 1_000_000

        event = FenceTimeoutEvent(
            device_id=f"gpu-ctx-{evt.context}",
            context_id=evt.context,
            seqno=evt.seqno,
            duration_ms=duration_ms,
            severity="critical",
        )
        self._emit(event)
        logger.warning(f"GPU FENCE TIMEOUT: context={evt.context} seqno={evt.seqno} "
                       f"duration={duration_ms}ms")

    def _handle_iommu_event(self, cpu, data, size) -> None:
        """Process IOMMU page fault event."""
        evt = self._bpf["iommu_events"].event(data)
        dev_name = evt.dev_name.decode("utf-8", errors="replace").strip("\x00")

        event = IOMMUFaultEvent(
            device_id=dev_name,
            fault_addr=evt.dma_addr,
            flags=evt.flags,
            severity="critical",
        )
        self._emit(event)
        logger.warning(f"IOMMU FAULT: device={dev_name} addr=0x{evt.dma_addr:016x} "
                       f"flags=0x{evt.flags:x}")
