"""PCIe AER error collector using ras:aer_event tracepoint."""
import logging
from typing import Optional
from collectors.base import BaseCollector
from events.pcie import PCIeAEREvent, decode_aer_status, SEVERITY_MAP
from core.event_bus import EventBus
from core.probe_manager import ProbeManager

logger = logging.getLogger(__name__)

# eBPF program for PCIe AER monitoring
PCIE_AER_BPF_PROGRAM = r"""
#include <uapi/linux/ptrace.h>

struct aer_event_t {
    char   dev_name[64];
    u32    status;
    u8     severity;
    u8     tlp_header_valid;
    u32    tlp_header[4];
    u64    timestamp_ns;
};

BPF_PERF_OUTPUT(aer_events);
BPF_ARRAY(severity_filter, u8, 1);

TRACEPOINT_PROBE(ras, aer_event) {
    struct aer_event_t evt = {};

    // Check severity filter
    int key = 0;
    u8 *filter = severity_filter.lookup(&key);
    if (filter && *filter != 0xFF) {
        if (args->severity != *filter)
            return 0;
    }

    // Fill event data
    TP_DATA_LOC_READ_STR(&evt.dev_name, dev_name, sizeof(evt.dev_name));
    evt.status = args->status;
    evt.severity = args->severity;
    evt.tlp_header_valid = args->tlp_header_valid;

    if (args->tlp_header_valid) {
        evt.tlp_header[0] = args->tlp_header[0];
        evt.tlp_header[1] = args->tlp_header[1];
        evt.tlp_header[2] = args->tlp_header[2];
        evt.tlp_header[3] = args->tlp_header[3];
    }

    evt.timestamp_ns = bpf_ktime_get_ns();
    aer_events.perf_submit(args, &evt, sizeof(evt));
    return 0;
}
"""

# Severity filter values
SEVERITY_FILTER_MAP = {
    "all": 0xFF,
    "corrected": 2,
    "fatal": 1,
    "nonfatal": 0,
}


class PCIeCollector(BaseCollector):
    """Collects PCIe AER events via eBPF tracepoint."""

    def __init__(self, config: dict, event_bus: EventBus, probe_manager: ProbeManager):
        super().__init__(config, event_bus, probe_manager)
        self._bpf = None
        self._severity_filter = config.get("severity_filter", "all")

    def start(self) -> bool:
        """Load AER probe and register perf buffer."""
        if not self.enabled:
            logger.info("PCIeCollector: disabled in config")
            return False

        result = self._probe_manager.try_load(
            probe_name="aer_monitor",
            bpf_text=PCIE_AER_BPF_PROGRAM,
            tracepoint="ras:aer_event",
        )

        if not result.success:
            logger.warning(f"PCIeCollector: failed to load probe: {result.reason}")
            return False

        self._bpf = result.bpf_object

        # Set severity filter
        filter_value = SEVERITY_FILTER_MAP.get(self._severity_filter, 0xFF)
        self._bpf["severity_filter"][0] = self._bpf["severity_filter"].Leaf(filter_value)

        # Register perf buffer callback
        self._bpf["aer_events"].open_perf_buffer(self._handle_event)

        self._running = True
        logger.info(f"PCIeCollector: started (filter={self._severity_filter})")
        return True

    def stop(self) -> None:
        """Stop and unload probe."""
        self._running = False
        self._probe_manager.unload("aer_monitor")
        self._bpf = None
        logger.info("PCIeCollector: stopped")

    def poll(self) -> None:
        """Poll perf buffer for events."""
        if self._bpf and self._running:
            self._bpf.perf_buffer_poll(timeout=100)

    def _handle_event(self, cpu, data, size) -> None:
        """Process raw perf buffer event into typed PCIeAEREvent."""
        evt = self._bpf["aer_events"].event(data)

        device = evt.dev_name.decode("utf-8", errors="replace").strip("\x00")
        severity_code = evt.severity
        status = evt.status
        tlp_valid = evt.tlp_header_valid

        errors = decode_aer_status(status, severity_code)
        tlp_str = None
        if tlp_valid:
            tlp_str = f"{evt.tlp_header[0]:08x} {evt.tlp_header[1]:08x} " \
                      f"{evt.tlp_header[2]:08x} {evt.tlp_header[3]:08x}"

        event = PCIeAEREvent(
            device_id=device,
            bdf=device,
            status_raw=status,
            severity_code=severity_code,
            errors=errors,
            tlp_header=tlp_str,
        )

        self._emit(event)

    def should_collect_severity(self, severity_code: int) -> bool:
        """Check if this severity passes the filter."""
        if self._severity_filter == "all":
            return True
        expected = SEVERITY_FILTER_MAP.get(self._severity_filter, 0xFF)
        return severity_code == expected
