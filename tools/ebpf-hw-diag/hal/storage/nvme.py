"""NVMe storage HAL backend.

Discovers NVMe controllers/namespaces from sysfs and exposes health data.
SMART data is enriched via `nvme-cli` when present; otherwise the backend
falls back to sysfs-only fields so it still works (and is testable) without
the nvme tool installed.
"""
import fnmatch
import glob
import json
import logging
import os
import shutil
import subprocess
from typing import Any, Dict, List

from hal.base import HardwareBackend, HardwareDevice
from hal.storage.base import AbstractStorageDevice

logger = logging.getLogger(__name__)


def _read(path: str) -> str | None:
    try:
        with open(path) as f:
            return f.read().strip()
    except (OSError, IOError):
        return None


def _read_int(path: str) -> int | None:
    raw = _read(path)
    if raw is None:
        return None
    try:
        return int(raw, 0)
    except ValueError:
        return None


class NVMeDevice(AbstractStorageDevice):
    """NVMe device HAL implementation (sysfs + optional nvme-cli)."""

    def __init__(self, namespace_path: str, sys_block: str = "/sys/block",
                 nvme_cli: str | None = "auto"):
        # namespace_path is the block name, e.g. "nvme0n1"
        self._name = os.path.basename(namespace_path)
        self._dev_path = f"/dev/{self._name}"
        self._sys_block = os.path.join(sys_block, self._name)
        if nvme_cli == "auto":
            self._nvme_cli = shutil.which("nvme")
        else:
            self._nvme_cli = nvme_cli  # explicit path or None (disabled)

    # --- HardwareDevice interface ---

    def get_id(self) -> str:
        return self._dev_path

    def get_type(self) -> str:
        return "nvme"

    def is_healthy(self) -> bool:
        smart = self.get_smart_data()
        # critical_warning == 0 means no warnings raised by the controller.
        return smart.get("critical_warning", 1) == 0

    def get_properties(self) -> Dict[str, Any]:
        props = {
            "name": self._name,
            "model": _read(os.path.join(self._sys_block, "device/model")) or "unknown",
            "serial": _read(os.path.join(self._sys_block, "device/serial")) or "unknown",
            "firmware_rev": _read(os.path.join(self._sys_block, "device/firmware_rev")) or "unknown",
        }
        return props

    # --- AbstractStorageDevice interface ---

    def get_capacity_bytes(self) -> int:
        # sysfs "size" is in 512-byte sectors.
        sectors = _read_int(os.path.join(self._sys_block, "size"))
        return sectors * 512 if sectors is not None else 0

    def get_firmware_version(self) -> str:
        return self.get_properties().get("firmware_rev", "unknown")

    def supports_latency_monitoring(self) -> bool:
        # NVMe goes through the block layer → block:block_rq_* tracepoints apply.
        return True

    def get_io_stats(self) -> Dict[str, int]:
        """Parse /sys/block/<dev>/stat (see Documentation/block/stat.rst)."""
        raw = _read(os.path.join(self._sys_block, "stat"))
        if not raw:
            return {}
        fields = raw.split()
        # First 11 fields are the standard block stats.
        names = [
            "read_ios", "read_merges", "read_sectors", "read_ticks_ms",
            "write_ios", "write_merges", "write_sectors", "write_ticks_ms",
            "in_flight", "io_ticks_ms", "time_in_queue_ms",
        ]
        stats: Dict[str, int] = {}
        for name, value in zip(names, fields):
            try:
                stats[name] = int(value)
            except ValueError:
                continue
        return stats

    def get_smart_data(self) -> Dict[str, Any]:
        """Return normalized SMART data, using nvme-cli if available."""
        if self._nvme_cli:
            data = self._smart_via_nvme_cli()
            if data:
                return data
        return self._smart_via_sysfs()

    def _smart_via_nvme_cli(self) -> Dict[str, Any]:
        try:
            result = subprocess.run(
                [self._nvme_cli, "smart-log", self._dev_path, "-o", "json"],
                capture_output=True, text=True, timeout=5,
            )
            if result.returncode != 0 or not result.stdout:
                return {}
            raw = json.loads(result.stdout)
        except (subprocess.SubprocessError, OSError, ValueError) as e:
            logger.debug("nvme smart-log failed for %s: %s", self._dev_path, e)
            return {}
        # nvme reports temperature in Kelvin.
        temp_k = raw.get("temperature")
        temp_c = round(temp_k - 273.15, 1) if isinstance(temp_k, (int, float)) else None
        return {
            "source": "nvme-cli",
            "critical_warning": raw.get("critical_warning", 0),
            "temperature_c": temp_c,
            "percentage_used": raw.get("percent_used", raw.get("percentage_used")),
            "media_errors": raw.get("media_errors"),
            "unsafe_shutdowns": raw.get("unsafe_shutdowns"),
            "power_on_hours": raw.get("power_on_hours"),
        }

    def _smart_via_sysfs(self) -> Dict[str, Any]:
        # Limited health signal from sysfs when nvme-cli is unavailable.
        state = _read(os.path.join(self._sys_block, "device/state"))
        # Controller-level temperature is sometimes exposed via hwmon; skip if absent.
        return {
            "source": "sysfs",
            "critical_warning": 0 if state in (None, "live") else 1,
            "temperature_c": None,
            "percentage_used": None,
            "media_errors": None,
            "state": state,
        }


class NVMeBackend(HardwareBackend):
    """Discovers NVMe namespaces from /sys/block."""

    backend_type = "nvme"

    def __init__(self, config: Dict[str, Any] | None = None,
                 sys_block: str = "/sys/block"):
        super().__init__(config)
        self._sys_block = self._config.get("sys_block", sys_block)
        # Namespace name filter, e.g. "nvme[0-9]*n[0-9]*".
        self._filter = self._config.get("filter", "nvme*n*")
        self._nvme_cli = self._config.get("nvme_cli", "auto")

    def enumerate(self) -> List[HardwareDevice]:
        devices: List[HardwareDevice] = []
        if not os.path.isdir(self._sys_block):
            return devices
        for path in sorted(glob.glob(os.path.join(self._sys_block, "nvme*"))):
            name = os.path.basename(path)
            if not fnmatch.fnmatch(name, self._filter):
                continue
            devices.append(NVMeDevice(name, sys_block=self._sys_block,
                                      nvme_cli=self._nvme_cli))
        return devices
