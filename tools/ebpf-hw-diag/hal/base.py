"""HAL base classes: HardwareDevice, HardwareBackend, DeviceRegistry."""
import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


class HardwareDevice(ABC):
    """Base class for all HAL device representations.

    A HardwareDevice is a hardware-agnostic handle onto one physical or logical
    device. Collectors interact only with this interface (and its subtype
    interfaces), never with vendor tools or sysfs paths directly.
    """

    @abstractmethod
    def get_id(self) -> str:
        """Unique identifier (e.g. BDF, /dev path, serial number)."""
        ...

    @abstractmethod
    def get_type(self) -> str:
        """Device type string (e.g. 'nvme', 'sas', 'pcie', 'gpu')."""
        ...

    @abstractmethod
    def is_healthy(self) -> bool:
        """Quick health check. Should never raise; return False on uncertainty."""
        ...

    @abstractmethod
    def get_properties(self) -> Dict[str, Any]:
        """Return device properties (model, firmware, serial, etc.)."""
        ...

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} {self.get_type()}:{self.get_id()}>"


class HardwareBackend(ABC):
    """Base class for discovery backends.

    A backend knows how to enumerate a particular class of devices from a
    particular source (sysfs, nvme-cli, lspci, nvidia-smi, ...). Backends are
    registered with a DeviceRegistry, which calls enumerate() during discovery.
    """

    #: Backend type identifier used in platform config (e.g. "nvme", "linux_sysfs").
    backend_type: str = "base"

    def __init__(self, config: Dict[str, Any] | None = None):
        self._config = config or {}

    @property
    def enabled(self) -> bool:
        return self._config.get("enabled", True)

    @abstractmethod
    def enumerate(self) -> List[HardwareDevice]:
        """Discover and return all devices this backend can see.

        Must not raise: return an empty list if the underlying source is
        unavailable, so that a broken backend degrades gracefully.
        """
        ...

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} type={self.backend_type} enabled={self.enabled}>"


class DeviceRegistry:
    """Central registry for all discovered hardware devices."""

    def __init__(self):
        self._devices: Dict[str, HardwareDevice] = {}
        self._backends: List[HardwareBackend] = []

    def register_backend(self, backend: HardwareBackend) -> None:
        """Register a HAL backend for device discovery."""
        self._backends.append(backend)
        logger.debug("Registered backend: %r", backend)

    def discover(self) -> None:
        """Run discovery on all registered (enabled) backends.

        A failure in one backend is logged and skipped — the registry still
        collects devices from every other backend (graceful degradation).
        """
        self._devices.clear()
        for backend in self._backends:
            if not backend.enabled:
                logger.info("Backend %s disabled, skipping", backend.backend_type)
                continue
            try:
                found = backend.enumerate()
            except Exception as e:  # a backend must never abort discovery
                logger.error("Backend %s failed during enumerate: %s",
                             backend.backend_type, e)
                continue
            for device in found:
                self._devices[device.get_id()] = device
            logger.info("Backend %s discovered %d device(s)",
                        backend.backend_type, len(found))

    def get_devices_by_type(self, device_type: str) -> List[HardwareDevice]:
        """Return all discovered devices of the given type."""
        return [d for d in self._devices.values() if d.get_type() == device_type]

    def get_device(self, device_id: str) -> HardwareDevice | None:
        """Return a single device by id, or None."""
        return self._devices.get(device_id)

    def all_devices(self) -> List[HardwareDevice]:
        """Return every discovered device."""
        return list(self._devices.values())

    @property
    def backend_count(self) -> int:
        return len(self._backends)

    @property
    def device_count(self) -> int:
        return len(self._devices)

    def summary(self) -> Dict[str, int]:
        """Return a {device_type: count} summary of the discovered inventory."""
        counts: Dict[str, int] = {}
        for d in self._devices.values():
            counts[d.get_type()] = counts.get(d.get_type(), 0) + 1
        return counts
