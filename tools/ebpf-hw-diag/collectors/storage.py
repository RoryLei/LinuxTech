"""NVMe/Block storage collector — latency histogram and queue depth monitoring."""
import logging
import time
from typing import Optional
from collectors.base import BaseCollector
from events.storage import NVMeLatencyEvent, BlockErrorEvent
from core.event_bus import EventBus
from core.probe_manager import ProbeManager

logger = logging.getLogger(__name__)

# eBPF program for block I/O latency and error monitoring
STORAGE_BPF_PROGRAM = r"""
#include <uapi/linux/ptrace.h>

struct latency_event_t {
    char   device[32];
    u64    latency_ns;
    u32    data_len;
    u8     rwflag;       // 0=read, 1=write
};

struct error_event_t {
    char   device[32];
    u64    sector;
    u32    nr_sector;
    s32    error;
    u8     rwflag;
};

BPF_HASH(start_ts, u64, u64);
BPF_PERF_OUTPUT(latency_events);
BPF_PERF_OUTPUT(error_events);
BPF_HISTOGRAM(latency_hist_us);
BPF_ARRAY(queue_depth, u64, 1);
BPF_ARRAY(latency_threshold, u64, 1);

TRACEPOINT_PROBE(block, block_rq_issue) {
    u64 key = (u64)args->sector;
    u64 ts = bpf_ktime_get_ns();
    start_ts.update(&key, &ts);

    // Increment in-flight counter
    int qd_key = 0;
    u64 *qd = queue_depth.lookup(&qd_key);
    if (qd)
        __sync_fetch_and_add(qd, 1);

    return 0;
}

TRACEPOINT_PROBE(block, block_rq_complete) {
    u64 key = (u64)args->sector;
    u64 *tsp = start_ts.lookup(&key);
    if (!tsp)
        return 0;

    u64 delta_ns = bpf_ktime_get_ns() - *tsp;
    start_ts.delete(&key);

    // Decrement in-flight counter
    int qd_key = 0;
    u64 *qd = queue_depth.lookup(&qd_key);
    if (qd && *qd > 0)
        __sync_fetch_and_sub(qd, 1);

    // Histogram (always)
    u64 delta_us = delta_ns / 1000;
    latency_hist_us.log2l(delta_us);

    // Emit detailed event only if above threshold
    int th_key = 0;
    u64 *threshold = latency_threshold.lookup(&th_key);
    u64 th_val = threshold ? *threshold : 1000;  // default 1ms

    if (delta_us > th_val) {
        struct latency_event_t evt = {};
        evt.latency_ns = delta_ns;
        evt.data_len = args->nr_sector * 512;
        evt.rwflag = (args->rwbs[0] == 'W') ? 1 : 0;
        bpf_probe_read_str(&evt.device, sizeof(evt.device), args->disk);
        latency_events.perf_submit(args, &evt, sizeof(evt));
    }

    // Check for error
    if (args->error != 0) {
        struct error_event_t err = {};
        err.sector = args->sector;
        err.nr_sector = args->nr_sector;
        err.error = args->error;
        err.rwflag = (args->rwbs[0] == 'W') ? 1 : 0;
        bpf_probe_read_str(&err.device, sizeof(err.device), args->disk);
        error_events.perf_submit(args, &err, sizeof(err));
    }

    return 0;
}
"""


class StorageCollector(BaseCollector):
    """Monitors NVMe/block I/O latency and errors via eBPF."""

    def __init__(self, config: dict, event_bus: EventBus, probe_manager: ProbeManager):
        super().__init__(config, event_bus, probe_manager)
        self._bpf = None
        self._latency_threshold_us = config.get("latency_threshold_us", 5000)
        self._devices_filter = config.get("devices", ["nvme*"])
        self._last_hist_report = time.time()
        self._hist_report_interval = 60  # report histogram stats every 60s

    def start(self) -> bool:
        """Load storage probes."""
        if not self.enabled:
            logger.info("StorageCollector: disabled in config")
            return False

        result = self._probe_manager.try_load(
            probe_name="storage_latency",
            bpf_text=STORAGE_BPF_PROGRAM,
            tracepoint="block:block_rq_issue",
        )

        if not result.success:
            logger.warning(f"StorageCollector: failed to load probe: {result.reason}")
            return False

        self._bpf = result.bpf_object

        # Set latency threshold in BPF map
        self._bpf["latency_threshold"][0] = self._bpf["latency_threshold"].Leaf(
            self._latency_threshold_us
        )

        # Initialize queue depth counter
        self._bpf["queue_depth"][0] = self._bpf["queue_depth"].Leaf(0)

        # Register perf buffer callbacks
        self._bpf["latency_events"].open_perf_buffer(self._handle_latency_event)
        self._bpf["error_events"].open_perf_buffer(self._handle_error_event)

        self._running = True
        logger.info(f"StorageCollector: started (threshold={self._latency_threshold_us}μs, "
                    f"devices={self._devices_filter})")
        return True

    def stop(self) -> None:
        """Stop and unload probe."""
        self._running = False
        self._probe_manager.unload("storage_latency")
        self._bpf = None
        logger.info("StorageCollector: stopped")

    def poll(self) -> None:
        """Poll perf buffers and periodically report histogram."""
        if not self._bpf or not self._running:
            return
        self._bpf.perf_buffer_poll(timeout=100)

    def _handle_latency_event(self, cpu, data, size) -> None:
        """Process high-latency I/O event."""
        evt = self._bpf["latency_events"].event(data)
        device = evt.device.decode("utf-8", errors="replace").strip("\x00")

        if not self._device_matches(device):
            return

        latency_us = evt.latency_ns // 1000
        opcode = 0x01 if evt.rwflag else 0x02  # 0x01=write, 0x02=read

        event = NVMeLatencyEvent(
            device_id=device,
            latency_us=latency_us,
            opcode=opcode,
            severity="warning" if latency_us < 50000 else "critical",
        )
        self._emit(event)

    def _handle_error_event(self, cpu, data, size) -> None:
        """Process block I/O error event."""
        evt = self._bpf["error_events"].event(data)
        device = evt.device.decode("utf-8", errors="replace").strip("\x00")

        if not self._device_matches(device):
            return

        event = BlockErrorEvent(
            device_id=device,
            error_code=evt.error,
            sector=evt.sector,
            nr_sectors=evt.nr_sector,
            rwflag="W" if evt.rwflag else "R",
            severity="critical",
        )
        self._emit(event)

    def _device_matches(self, device: str) -> bool:
        """Check if device matches the configured filter pattern."""
        import fnmatch
        for pattern in self._devices_filter:
            if fnmatch.fnmatch(device, pattern):
                return True
        return False

    def get_queue_depth(self) -> int:
        """Read current in-flight I/O count from BPF map."""
        if self._bpf:
            try:
                return self._bpf["queue_depth"][0].value
            except Exception:
                return 0
        return 0

    def get_histogram(self) -> dict:
        """Read the latency histogram from BPF map."""
        if not self._bpf:
            return {}
        hist = {}
        try:
            for k, v in self._bpf["latency_hist_us"].items():
                if v.value > 0:
                    bucket_us = 2 ** k.value
                    hist[bucket_us] = v.value
        except Exception:
            pass
        return hist
