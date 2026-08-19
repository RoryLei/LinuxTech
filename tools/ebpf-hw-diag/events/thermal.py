"""Thermal event types."""
from dataclasses import dataclass
from events.base import DiagEvent

TRIP_TYPE_MAP = {0: "critical", 1: "hot", 2: "passive", 3: "active"}


@dataclass
class ThermalTripEvent(DiagEvent):
    """Thermal zone trip point event."""

    source_probe: str = "throttle_events"
    zone_name: str = ""
    temperature_mdeg: int = 0   # millidegrees Celsius
    trip_type: int = 0          # 0=critical, 1=hot, 2=passive, 3=active

    @property
    def temperature_c(self) -> float:
        return self.temperature_mdeg / 1000.0

    @property
    def trip_type_name(self) -> str:
        return TRIP_TYPE_MAP.get(self.trip_type, "unknown")


@dataclass
class CpuFreqEvent(DiagEvent):
    """CPU frequency change event."""

    source_probe: str = "cpu_freq"
    cpu_id: int = 0
    freq_khz: int = 0

    @property
    def freq_mhz(self) -> int:
        return self.freq_khz // 1000
