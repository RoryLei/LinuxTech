"""Abstract storage device interface."""
from abc import abstractmethod
from typing import Any, Dict

from hal.base import HardwareDevice


class AbstractStorageDevice(HardwareDevice):
    """Common interface for all storage devices (NVMe, SAS, SATA).

    Collectors use this interface so the same code path works regardless of the
    underlying transport or vendor.
    """

    @abstractmethod
    def get_capacity_bytes(self) -> int:
        """Total device capacity in bytes (0 if unknown)."""
        ...

    @abstractmethod
    def get_smart_data(self) -> Dict[str, Any]:
        """Return SMART/health data (temperature, wear, error counts).

        Keys are normalized across backends where possible:
            critical_warning, temperature_c, percentage_used,
            media_errors, unsafe_shutdowns
        """
        ...

    @abstractmethod
    def get_io_stats(self) -> Dict[str, int]:
        """Current cumulative I/O statistics (reads, writes, sectors, ms)."""
        ...

    @abstractmethod
    def get_firmware_version(self) -> str:
        """Firmware revision string ('unknown' if unavailable)."""
        ...

    @abstractmethod
    def supports_latency_monitoring(self) -> bool:
        """Whether this device supports eBPF block-layer latency tracing."""
        ...

    def get_type(self) -> str:
        return "storage"
