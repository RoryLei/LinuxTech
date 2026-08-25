"""Thermal throttling and CPU frequency collector."""
import logging
from collectors.base import BaseCollector
from events.thermal import ThermalTripEvent, CpuFreqEvent
from core.event_bus import EventBus
from core.probe_manager import ProbeManager

logger = logging.getLogger(__name__)

THERMAL_BPF_PROGRAM = r"""
#include <uapi/linux/ptrace.h>

struct thermal_event_t {
    char   zone[64];
    s32    temperature;    // millidegrees
    u32    trip_type;      // 0=critical, 1=hot, 2=passive, 3=active
};

struct freq_event_t {
    u32    cpu_id;
    u32    freq_khz;
};

BPF_PERF_OUTPUT(thermal_events);
BPF_PERF_OUTPUT(freq_events);

TRACEPOINT_PROBE(thermal, thermal_zone_trip) {
    struct thermal_event_t evt = {};
    bpf_probe_read_str(&evt.zone, sizeof(evt.zone), args->thermal_zone);
    evt.temperature = args->temp;
    evt.trip_type = args->trip;
    thermal_events.perf_submit(args, &evt, sizeof(evt));
    return 0;
}

TRACEPOINT_PROBE(power, cpu_frequency) {
    struct freq_event_t evt = {};
    evt.cpu_id = bpf_get_smp_processor_id();
    evt.freq_khz = args->state;
    freq_events.perf_submit(args, &evt, sizeof(evt));
    return 0;
}
"""


class ThermalCollector(BaseCollector):
    """Monitors thermal throttling events and CPU frequency changes."""

    def __init__(self, config: dict, event_bus: EventBus, probe_manager: ProbeManager):
        super().__init__(config, event_bus, probe_manager)
        self._bpf = None
        self._throttle_alert = config.get("throttle_alert", True)

    def start(self) -> bool:
        if not self.enabled:
            logger.info("ThermalCollector: disabled in config")
            return False

        result = self._probe_manager.try_load(
            probe_name="thermal_monitor",
            bpf_text=THERMAL_BPF_PROGRAM,
            tracepoint="thermal:thermal_zone_trip",
        )

        if not result.success:
            logger.warning(f"ThermalCollector: failed to load probe: {result.reason}")
            return False

        self._bpf = result.bpf_object
        self._bpf["thermal_events"].open_perf_buffer(self._handle_thermal)
        self._bpf["freq_events"].open_perf_buffer(self._handle_freq)

        self._running = True
        logger.info("ThermalCollector: started")
        return True

    def stop(self) -> None:
        self._running = False
        self._probe_manager.unload("thermal_monitor")
        self._bpf = None
        logger.info("ThermalCollector: stopped")

    def poll(self) -> None:
        if self._bpf and self._running:
            self._bpf.perf_buffer_poll(timeout=100)

    def _handle_thermal(self, cpu, data, size) -> None:
        evt = self._bpf["thermal_events"].event(data)
        zone = evt.zone.decode("utf-8", errors="replace").strip("\x00")

        severity = "critical" if evt.trip_type <= 1 else "warning"
        event = ThermalTripEvent(
            device_id=zone,
            zone_name=zone,
            temperature_mdeg=evt.temperature,
            trip_type=evt.trip_type,
            severity=severity,
        )
        self._emit(event)

    def _handle_freq(self, cpu, data, size) -> None:
        evt = self._bpf["freq_events"].event(data)
        event = CpuFreqEvent(
            device_id=f"cpu{evt.cpu_id}",
            cpu_id=evt.cpu_id,
            freq_khz=evt.freq_khz,
            severity="info",
        )
        self._emit(event)
