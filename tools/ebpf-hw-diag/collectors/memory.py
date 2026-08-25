"""Memory diagnostics collector — ECC/MCE errors and DMA failures."""
import logging
from collectors.base import BaseCollector
from events.memory import MCEEvent, DMAFailureEvent
from core.event_bus import EventBus
from core.probe_manager import ProbeManager

logger = logging.getLogger(__name__)

MEMORY_BPF_PROGRAM = r"""
#include <uapi/linux/ptrace.h>

struct mce_event_t {
    char   label[64];
    u32    error_type;
    u32    error_count;
    u32    grain;
};

BPF_PERF_OUTPUT(mce_events);

TRACEPOINT_PROBE(ras, mc_event) {
    struct mce_event_t evt = {};
    bpf_probe_read_str(&evt.label, sizeof(evt.label), args->label);
    evt.error_type = args->error_type;
    evt.error_count = args->error_count;
    evt.grain = args->grain;
    mce_events.perf_submit(args, &evt, sizeof(evt));
    return 0;
}
"""


class MemoryCollector(BaseCollector):
    """Monitors ECC/MCE memory errors via ras:mc_event tracepoint."""

    def __init__(self, config: dict, event_bus: EventBus, probe_manager: ProbeManager):
        super().__init__(config, event_bus, probe_manager)
        self._bpf = None
        self._mce_alert = config.get("mce_alert", True)

    def start(self) -> bool:
        if not self.enabled:
            logger.info("MemoryCollector: disabled in config")
            return False

        result = self._probe_manager.try_load(
            probe_name="mce_monitor",
            bpf_text=MEMORY_BPF_PROGRAM,
            tracepoint="ras:mc_event",
        )

        if not result.success:
            logger.warning(f"MemoryCollector: failed to load probe: {result.reason}")
            return False

        self._bpf = result.bpf_object
        self._bpf["mce_events"].open_perf_buffer(self._handle_mce)

        self._running = True
        logger.info("MemoryCollector: started")
        return True

    def stop(self) -> None:
        self._running = False
        self._probe_manager.unload("mce_monitor")
        self._bpf = None
        logger.info("MemoryCollector: stopped")

    def poll(self) -> None:
        if self._bpf and self._running:
            self._bpf.perf_buffer_poll(timeout=100)

    def _handle_mce(self, cpu, data, size) -> None:
        evt = self._bpf["mce_events"].event(data)
        label = evt.label.decode("utf-8", errors="replace").strip("\x00")

        severity = "warning" if evt.error_type == 0 else "critical"
        event = MCEEvent(
            device_id=label,
            dimm_label=label,
            error_type=evt.error_type,
            error_count=evt.error_count,
            grain=evt.grain,
            severity=severity,
        )
        self._emit(event)
