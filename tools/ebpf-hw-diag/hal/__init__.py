"""Hardware Abstraction Layer (HAL).

The HAL decouples diagnostic logic from specific hardware implementations,
enabling hardware backends to be swapped without modifying collectors or probes.

Collectors ask the DeviceRegistry for devices by type (e.g. "nvme") and interact
with them through abstract interfaces (AbstractStorageDevice, AbstractPCIeDevice).
Whether the underlying device is NVMe or SAS, Intel or AMD, the collector code is
unchanged — only the backend registered in the platform profile differs.

Public API:
    HardwareDevice     ABC every device representation implements
    HardwareBackend    ABC every discovery backend implements
    DeviceRegistry     central registry of discovered devices
    build_registry     construct a registry from a platform config dict
"""
from hal.base import HardwareDevice, HardwareBackend, DeviceRegistry
from hal.factory import build_registry, BACKEND_REGISTRY

__all__ = [
    "HardwareDevice",
    "HardwareBackend",
    "DeviceRegistry",
    "build_registry",
    "BACKEND_REGISTRY",
]
