"""HAL factory: build a DeviceRegistry from a platform configuration.

The platform config's `hal:` section names, per subsystem, which backends to
load. This factory maps each backend `type` string to a backend class and wires
up a populated DeviceRegistry. Unknown or disabled backend types are skipped
with a warning, so a config referencing an unavailable backend degrades
gracefully rather than crashing the agent.
"""
import logging
from typing import Any, Dict, Type

from hal.base import DeviceRegistry, HardwareBackend
from hal.storage.nvme import NVMeBackend
from hal.pcie.sysfs import SysfsPCIeBackend

logger = logging.getLogger(__name__)


# Maps the `type` field in platform config to a backend class.
BACKEND_REGISTRY: Dict[str, Type[HardwareBackend]] = {
    "nvme": NVMeBackend,
    "linux_sysfs": SysfsPCIeBackend,
}


def register_backend_class(type_name: str, cls: Type[HardwareBackend]) -> None:
    """Register a new backend class so it can be referenced from config.

    Lets future subsystems (SAS, NVIDIA GPU, RDMA, IPMI thermal) plug in without
    editing this module.
    """
    BACKEND_REGISTRY[type_name] = cls


def build_registry(platform_config: Dict[str, Any]) -> DeviceRegistry:
    """Construct a DeviceRegistry from a platform config's `hal:` section.

    Expected shape::

        hal:
          storage:
            backends:
              - type: nvme
                discovery: sysfs
          pcie:
            backends:
              - type: linux_sysfs

    Returns a registry with backends registered but *not* yet discovered;
    call registry.discover() to populate it.
    """
    registry = DeviceRegistry()
    hal_config = (platform_config or {}).get("hal", {})

    for subsystem, sub_config in hal_config.items():
        backends = (sub_config or {}).get("backends", []) or []
        for backend_cfg in backends:
            if not isinstance(backend_cfg, dict):
                continue
            type_name = backend_cfg.get("type")
            if not type_name:
                continue
            cls = BACKEND_REGISTRY.get(type_name)
            if cls is None:
                logger.warning(
                    "HAL backend type '%s' (subsystem '%s') is not registered; skipping",
                    type_name, subsystem,
                )
                continue
            try:
                backend = cls(config=backend_cfg)
            except Exception as e:
                logger.error("Failed to construct backend '%s': %s", type_name, e)
                continue
            registry.register_backend(backend)
            logger.debug("Wired backend '%s' for subsystem '%s'", type_name, subsystem)

    return registry
