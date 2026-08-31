"""Unit tests for the Hardware Abstraction Layer (HAL)."""
from typing import Any, Dict, List

import pytest

from hal.base import DeviceRegistry, HardwareBackend, HardwareDevice
from hal.factory import build_registry, register_backend_class, BACKEND_REGISTRY
from hal.pcie.sysfs import SysfsPCIeBackend, SysfsPCIeDevice
from hal.storage.nvme import NVMeBackend, NVMeDevice


# ---------------------------------------------------------------------------
# Test doubles
# ---------------------------------------------------------------------------

class FakeDevice(HardwareDevice):
    def __init__(self, dev_id: str, dev_type: str, healthy: bool = True):
        self._id = dev_id
        self._type = dev_type
        self._healthy = healthy

    def get_id(self) -> str:
        return self._id

    def get_type(self) -> str:
        return self._type

    def is_healthy(self) -> bool:
        return self._healthy

    def get_properties(self) -> Dict[str, Any]:
        return {"id": self._id}


class FakeBackend(HardwareBackend):
    backend_type = "fake"

    def __init__(self, devices: List[HardwareDevice], config=None):
        super().__init__(config)
        self._devices = devices

    def enumerate(self) -> List[HardwareDevice]:
        return list(self._devices)


class BrokenBackend(HardwareBackend):
    backend_type = "broken"

    def enumerate(self) -> List[HardwareDevice]:
        raise RuntimeError("backend exploded")


# ---------------------------------------------------------------------------
# DeviceRegistry
# ---------------------------------------------------------------------------

class TestDeviceRegistry:
    def test_discover_collects_devices(self):
        reg = DeviceRegistry()
        reg.register_backend(FakeBackend([
            FakeDevice("/dev/nvme0n1", "nvme"),
            FakeDevice("0000:03:00.0", "pcie"),
        ]))
        reg.discover()
        assert reg.device_count == 2
        assert reg.summary() == {"nvme": 1, "pcie": 1}

    def test_get_devices_by_type(self):
        reg = DeviceRegistry()
        reg.register_backend(FakeBackend([
            FakeDevice("/dev/nvme0n1", "nvme"),
            FakeDevice("/dev/nvme1n1", "nvme"),
            FakeDevice("0000:03:00.0", "pcie"),
        ]))
        reg.discover()
        assert len(reg.get_devices_by_type("nvme")) == 2
        assert len(reg.get_devices_by_type("pcie")) == 1
        assert reg.get_devices_by_type("gpu") == []

    def test_get_device_by_id(self):
        reg = DeviceRegistry()
        reg.register_backend(FakeBackend([FakeDevice("/dev/nvme0n1", "nvme")]))
        reg.discover()
        assert reg.get_device("/dev/nvme0n1") is not None
        assert reg.get_device("missing") is None

    def test_disabled_backend_skipped(self):
        reg = DeviceRegistry()
        reg.register_backend(FakeBackend([FakeDevice("x", "nvme")],
                                         config={"enabled": False}))
        reg.discover()
        assert reg.device_count == 0

    def test_broken_backend_does_not_abort_discovery(self):
        reg = DeviceRegistry()
        reg.register_backend(BrokenBackend())
        reg.register_backend(FakeBackend([FakeDevice("ok", "pcie")]))
        reg.discover()  # must not raise
        assert reg.device_count == 1

    def test_rediscover_clears_stale_devices(self):
        reg = DeviceRegistry()
        backend = FakeBackend([FakeDevice("a", "pcie")])
        reg.register_backend(backend)
        reg.discover()
        assert reg.device_count == 1
        backend._devices = []      # device disappeared
        reg.discover()
        assert reg.device_count == 0


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

class TestFactory:
    def test_build_registry_wires_known_backends(self):
        cfg = {"hal": {
            "storage": {"backends": [{"type": "nvme"}]},
            "pcie": {"backends": [{"type": "linux_sysfs"}]},
        }}
        reg = build_registry(cfg)
        assert reg.backend_count == 2

    def test_unknown_backend_skipped(self):
        cfg = {"hal": {
            "gpu": {"backends": [{"type": "nvidia"}]},
            "pcie": {"backends": [{"type": "linux_sysfs"}]},
        }}
        reg = build_registry(cfg)
        assert reg.backend_count == 1  # nvidia skipped, sysfs kept

    def test_empty_config(self):
        assert build_registry({}).backend_count == 0
        assert build_registry({"hal": {}}).backend_count == 0

    def test_empty_backends_list(self):
        cfg = {"hal": {"gpu": {"backends": []}}}
        assert build_registry(cfg).backend_count == 0

    def test_register_custom_backend_class(self):
        register_backend_class("fake", FakeBackend)
        try:
            assert "fake" in BACKEND_REGISTRY
        finally:
            BACKEND_REGISTRY.pop("fake", None)


# ---------------------------------------------------------------------------
# PCIe sysfs backend (fake sysfs tree)
# ---------------------------------------------------------------------------

class TestSysfsPCIe:
    def _make_dev(self, root, bdf, vendor="0x8086", correctable="RxErr 0\n",
                  fatal=None):
        dev = root / bdf
        dev.mkdir(parents=True)
        dev.joinpath("vendor").write_text(vendor)
        dev.joinpath("device").write_text("0x1234")
        dev.joinpath("class").write_text("0x010802")
        dev.joinpath("aer_dev_correctable").write_text(correctable)
        if fatal:
            dev.joinpath("aer_dev_fatal").write_text(fatal)
        return dev

    def test_enumerate(self, tmp_path):
        self._make_dev(tmp_path, "0000:00:00.0")
        self._make_dev(tmp_path, "0000:03:00.0")
        backend = SysfsPCIeBackend(sysfs_root=str(tmp_path))
        devices = backend.enumerate()
        assert len(devices) == 2
        assert all(isinstance(d, SysfsPCIeDevice) for d in devices)

    def test_aer_counts_and_health(self, tmp_path):
        self._make_dev(tmp_path, "0000:03:00.0",
                       correctable="RxErr 4\nBadTLP 1\n", fatal="MalfTLP 2\n")
        dev = SysfsPCIeBackend(sysfs_root=str(tmp_path)).enumerate()[0]
        counts = dev.get_aer_counts()
        assert counts["correctable"] == 5
        assert counts["fatal"] == 2
        assert dev.is_healthy() is False   # fatal errors present

    def test_healthy_device(self, tmp_path):
        self._make_dev(tmp_path, "0000:00:00.0", correctable="RxErr 0\n")
        dev = SysfsPCIeBackend(sysfs_root=str(tmp_path)).enumerate()[0]
        assert dev.is_healthy() is True

    def test_properties(self, tmp_path):
        self._make_dev(tmp_path, "0000:03:00.0", vendor="0x10de")
        dev = SysfsPCIeBackend(sysfs_root=str(tmp_path)).enumerate()[0]
        props = dev.get_properties()
        assert props["vendor"] == "0x10de"
        assert props["bdf"] == "0000:03:00.0"

    def test_missing_root(self, tmp_path):
        backend = SysfsPCIeBackend(sysfs_root=str(tmp_path / "nope"))
        assert backend.enumerate() == []


# ---------------------------------------------------------------------------
# NVMe backend (fake sysfs tree, nvme-cli disabled)
# ---------------------------------------------------------------------------

class TestNVMeBackend:
    def _make_ns(self, root, name, size_sectors=1000000, model="TestSSD",
                 state="live"):
        ns = root / name
        (ns / "device").mkdir(parents=True)
        ns.joinpath("size").write_text(str(size_sectors))
        ns.joinpath("stat").write_text(
            "100 0 8000 50 200 0 16000 80 0 120 130")
        ns.joinpath("device", "model").write_text(model)
        ns.joinpath("device", "serial").write_text("SN123")
        ns.joinpath("device", "firmware_rev").write_text("FW1.0")
        ns.joinpath("device", "state").write_text(state)
        return ns

    def test_enumerate_filters(self, tmp_path):
        self._make_ns(tmp_path, "nvme0n1")
        self._make_ns(tmp_path, "nvme1n1")
        (tmp_path / "sda").mkdir()  # non-nvme ignored by glob
        backend = NVMeBackend(config={"nvme_cli": None}, sys_block=str(tmp_path))
        devices = backend.enumerate()
        assert len(devices) == 2
        assert all(d.get_type() == "nvme" for d in devices)

    def test_capacity_and_firmware(self, tmp_path):
        self._make_ns(tmp_path, "nvme0n1", size_sectors=2000)
        dev = NVMeBackend(config={"nvme_cli": None},
                          sys_block=str(tmp_path)).enumerate()[0]
        assert dev.get_capacity_bytes() == 2000 * 512
        assert dev.get_firmware_version() == "FW1.0"
        assert dev.supports_latency_monitoring() is True

    def test_io_stats_parsed(self, tmp_path):
        self._make_ns(tmp_path, "nvme0n1")
        dev = NVMeBackend(config={"nvme_cli": None},
                          sys_block=str(tmp_path)).enumerate()[0]
        stats = dev.get_io_stats()
        assert stats["read_ios"] == 100
        assert stats["write_ios"] == 200

    def test_sysfs_smart_healthy(self, tmp_path):
        self._make_ns(tmp_path, "nvme0n1", state="live")
        dev = NVMeBackend(config={"nvme_cli": None},
                          sys_block=str(tmp_path)).enumerate()[0]
        smart = dev.get_smart_data()
        assert smart["source"] == "sysfs"
        assert smart["critical_warning"] == 0
        assert dev.is_healthy() is True

    def test_sysfs_smart_unhealthy_state(self, tmp_path):
        self._make_ns(tmp_path, "nvme0n1", state="dead")
        dev = NVMeBackend(config={"nvme_cli": None},
                          sys_block=str(tmp_path)).enumerate()[0]
        assert dev.is_healthy() is False

    def test_missing_sys_block(self, tmp_path):
        backend = NVMeBackend(config={"nvme_cli": None},
                              sys_block=str(tmp_path / "nope"))
        assert backend.enumerate() == []


# ---------------------------------------------------------------------------
# Platform profiles load and build
# ---------------------------------------------------------------------------

class TestPlatformProfiles:
    @pytest.mark.parametrize("profile", [
        "generic_x86", "nvidia_dgx", "storage_jbof",
    ])
    def test_profile_builds_registry(self, profile):
        import yaml
        import os
        path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "config", "platforms", f"{profile}.yaml",
        )
        cfg = yaml.safe_load(open(path))
        reg = build_registry(cfg)
        # Every profile should wire at least the sysfs PCIe + NVMe backends.
        assert reg.backend_count >= 2
