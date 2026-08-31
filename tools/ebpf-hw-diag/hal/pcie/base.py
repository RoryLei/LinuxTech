"""Abstract PCIe device interface."""
from abc import abstractmethod
from typing import Any, Dict

from hal.base import HardwareDevice


class AbstractPCIeDevice(HardwareDevice):
    """Common interface for PCIe devices across access backends (sysfs, setpci)."""

    @abstractmethod
    def get_bdf(self) -> str:
        """Bus:Device.Function address, e.g. '0000:03:00.0'."""
        ...

    @abstractmethod
    def get_aer_counts(self) -> Dict[str, int]:
        """Return accumulated AER error counts.

        Keys: 'correctable', 'nonfatal', 'fatal' (each a summed count).
        """
        ...

    @abstractmethod
    def get_link_status(self) -> Dict[str, Any]:
        """Return current link speed/width and their max capable values."""
        ...

    def get_type(self) -> str:
        return "pcie"
