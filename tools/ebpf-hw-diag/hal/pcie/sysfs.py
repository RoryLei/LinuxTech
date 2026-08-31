"""Sysfs-based PCIe HAL backend.

Reads PCIe device identity, link status, and accumulated AER error counters
from /sys/bus/pci/devices. Requires no external tools and no root for reads.
"""
import glob
import logging
import os
from typing import Any, Dict, List

from hal.base import HardwareBackend, HardwareDevice
from hal.pcie.base import AbstractPCIeDevice

logger = logging.getLogger(__name__)

_AER_FILES = {
    "correctable": "aer_dev_correctable",
    "nonfatal": "aer_dev_nonfatal",
    "fatal": "aer_dev_fatal",
}


def _read(path: str) -> str | None:
    try:
        with open(path) as f:
            return f.read().strip()
    except (OSError, IOError):
        return None


def _parse_aer_file(path: str) -> int:
    """Sum all non-zero counters in an aer_dev_* file."""
    text = _read(path)
    if not text:
        return 0
    total = 0
    for line in text.splitlines():
        parts = line.rsplit(" ", 1)
        if len(parts) != 2:
            continue
        try:
            total += int(parts[1])
        except ValueError:
            continue
    return total


class SysfsPCIeDevice(AbstractPCIeDevice):
    """A PCIe device backed by its sysfs directory."""

    def __init__(self, dev_path: str):
        self._path = dev_path                       # /sys/bus/pci/devices/<bdf>
        self._bdf = os.path.basename(dev_path)

    def get_id(self) -> str:
        return self._bdf

    def get_bdf(self) -> str:
        return self._bdf

    def is_healthy(self) -> bool:
        counts = self.get_aer_counts()
        return counts.get("fatal", 0) == 0 and counts.get("nonfatal", 0) == 0

    def get_properties(self) -> Dict[str, Any]:
        return {
            "bdf": self._bdf,
            "vendor": _read(os.path.join(self._path, "vendor")) or "unknown",
            "device": _read(os.path.join(self._path, "device")) or "unknown",
            "class": _read(os.path.join(self._path, "class")) or "unknown",
            "driver": self._driver_name(),
        }

    def _driver_name(self) -> str:
        link = os.path.join(self._path, "driver")
        if os.path.islink(link):
            return os.path.basename(os.readlink(link))
        return "none"

    def get_aer_counts(self) -> Dict[str, int]:
        return {kind: _parse_aer_file(os.path.join(self._path, fname))
                for kind, fname in _AER_FILES.items()}

    def get_link_status(self) -> Dict[str, Any]:
        return {
            "current_speed": _read(os.path.join(self._path, "current_link_speed")),
            "current_width": _read(os.path.join(self._path, "current_link_width")),
            "max_speed": _read(os.path.join(self._path, "max_link_speed")),
            "max_width": _read(os.path.join(self._path, "max_link_width")),
        }


class SysfsPCIeBackend(HardwareBackend):
    """Discovers PCIe devices from /sys/bus/pci/devices."""

    backend_type = "linux_sysfs"

    def __init__(self, config: Dict[str, Any] | None = None,
                 sysfs_root: str = "/sys/bus/pci/devices"):
        super().__init__(config)
        self._root = self._config.get("sysfs_root", sysfs_root)
        # Optionally restrict to devices that expose AER counters.
        self._only_aer = self._config.get("only_aer_capable", False)

    def enumerate(self) -> List[HardwareDevice]:
        devices: List[HardwareDevice] = []
        if not os.path.isdir(self._root):
            return devices
        for path in sorted(glob.glob(os.path.join(self._root, "*"))):
            if self._only_aer and not any(
                os.path.exists(os.path.join(path, f)) for f in _AER_FILES.values()
            ):
                continue
            devices.append(SysfsPCIeDevice(path))
        return devices
