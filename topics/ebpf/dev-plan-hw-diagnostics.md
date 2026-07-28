# Development Plan: eBPF Server HW Diagnostics Agent

## Project Overview

Build a unified eBPF-based hardware diagnostics agent for AI/Storage servers
that monitors storage, PCIe, network, GPU, thermal, and memory subsystems
with near-zero overhead.

**Repository Structure:**
```
ebpf-hw-diag/
├── cmd/
│   └── diagd/                    # Main daemon entry point
│       └── main.py              # Agent bootstrap: parse args, load config, init HAL registry,
│                                #   start collectors, open exporters, run event loop, handle signals
├── probes/                       # eBPF programs (kernel-side, compiled to bytecode)
│   ├── storage/
│   │   ├── nvme_latency.bpf.c  # Attach to block:block_rq_issue/complete; measure per-I/O latency;
│   │   │                        #   populate latency histogram in BPF_HISTOGRAM map
│   │   ├── nvme_queue_depth.bpf.c  # Track in-flight I/O count per device via atomic counter;
│   │   │                            #   detect queue saturation (in-flight > threshold)
│   │   └── block_errors.bpf.c  # Catch block layer errors (I/O timeout, EIO) via block:block_rq_error;
│   │                            #   emit device + error code to perf buffer
│   ├── pcie/
│   │   ├── aer_monitor.bpf.c   # Attach to tracepoint:ras:aer_event; filter by severity;
│   │   │                        #   decode status bits and forward to perf buffer with TLP header
│   │   └── link_recovery.bpf.c # kprobe on pcie_do_recovery; capture BDF and recovery type;
│   │                            #   detect link retraining and bus reset events
│   ├── network/
│   │   ├── tcp_retrans.bpf.c   # Attach to tcp:tcp_retransmit_skb; capture src/dst IP:port, state;
│   │   │                        #   aggregate retransmit count per flow in BPF_HASH map
│   │   └── rdma_errors.bpf.c   # Attach to rdma tracepoints (if available); capture QP errors,
│   │                            #   CQE status codes; detect RoCE/IB fabric degradation
│   ├── gpu/
│   │   ├── fence_timeout.bpf.c # Attach to dma_fence:dma_fence_init/signaled; track fence lifetime;
│   │   │                        #   alert if fence not signaled within timeout (GPU hang detection)
│   │   └── iommu_fault.bpf.c   # Attach to iommu:io_page_fault; capture faulting device + DMA addr;
│   │                            #   detect invalid GPU-to-host memory access
│   ├── thermal/
│   │   ├── throttle_events.bpf.c  # Attach to thermal:thermal_zone_trip; capture zone name, temp,
│   │   │                           #   trip type; emit event when thermal threshold crossed
│   │   └── cpu_freq.bpf.c      # Attach to power:cpu_frequency; track per-CPU frequency transitions;
│   │                            #   detect throttling (freq drop below baseline)
│   └── memory/
│       ├── dma_failures.bpf.c   # kretprobe on dma_map_page; detect return value == 0 (failure);
│       │                         #   capture calling process and device for DMA mapping errors
│       ├── numa_imbalance.bpf.c # Attach to kmem:mm_page_alloc; track allocation node vs expected;
│       │                         #   detect cross-NUMA allocations for latency-sensitive devices
│       └── mce_events.bpf.c     # Attach to ras:mc_event; capture DIMM label, error type, count;
│                                 #   track corrected ECC errors for predictive failure analysis
│   └── memory/
│       ├── dma_failures.bpf.c
│       ├── numa_imbalance.bpf.c
│       └── mce_events.bpf.c
├── hal/                          # Hardware Abstraction Layer
│   ├── __init__.py              # Package init; exports DeviceRegistry and all base classes
│   ├── base.py                   # HardwareDevice ABC: defines get_id(), get_type(), is_healthy(),
│   │                             #   get_properties() interface that ALL devices must implement
│   ├── registry.py              # DeviceRegistry: central catalog of all discovered HW;
│   │                             #   supports dynamic discover(), hot-swap, type-based filtering
│   ├── storage/
│   │   ├── __init__.py
│   │   ├── base.py              # AbstractStorageDevice: extends HardwareDevice with
│   │   │                         #   get_smart_data(), get_io_stats(), get_capacity_bytes(),
│   │   │                         #   supports_latency_monitoring() — common storage interface
│   │   ├── nvme.py              # NVMe implementation: uses nvme-cli JSON + /sys/class/nvme/
│   │   │                         #   for SMART, identify-ctrl, namespace info, firmware version
│   │   ├── sata.py              # SATA implementation: uses smartctl + /sys/block/sd*/
│   │   │                         #   for SMART attributes, error counters, link speed
│   │   └── sas.py               # SAS implementation: uses sg_ses + smartctl + sas_phy sysfs;
│   │                             #   reads phy error counters, enclosure slot mapping, SMART
│   ├── pcie/
│   │   ├── __init__.py
│   │   ├── base.py              # AbstractPCIeDevice: get_link_speed(), get_link_width(),
│   │   │                         #   supports_aer(), get_bdf(), get_driver() interface
│   │   ├── linux_sysfs.py       # Linux sysfs backend: reads /sys/bus/pci/devices/<BDF>/
│   │   │                         #   for config, link status, AER counters, NUMA node
│   │   └── lspci.py             # lspci/setpci backend: parses lspci -vvv output;
│   │                             #   reads extended capabilities, AER registers via setpci
│   ├── network/
│   │   ├── __init__.py
│   │   ├── base.py              # AbstractNIC: get_link_state(), get_speed(), get_stats(),
│   │   │                         #   get_ring_buffer_size(), supports_rdma() interface
│   │   ├── ethtool.py           # ethtool backend: queries NIC via ethtool ioctls/netlink;
│   │   │                         #   gets speed, duplex, offloads, error counters, driver info
│   │   └── rdma.py              # RDMA device backend: enumerates /sys/class/infiniband/;
│   │                             #   reads port state, link layer, GID table, error counters
│   ├── gpu/
│   │   ├── __init__.py
│   │   ├── base.py              # AbstractAccelerator: get_temperature(), get_utilization(),
│   │   │                         #   get_memory_usage(), get_pcie_bdf(), get_driver() interface
│   │   ├── nvidia.py            # NVIDIA backend: parses nvidia-smi --query-gpu JSON output;
│   │   │                         #   reads /sys/class/drm/card*/device/ for PCIe link info
│   │   └── amd.py               # AMD backend: parses rocm-smi output + /sys/class/drm/;
│   │                             #   reads hwmon for temp/power, amdgpu sysfs for utilization
│   ├── thermal/
│   │   ├── __init__.py
│   │   ├── base.py              # AbstractThermalZone: get_temperature(), get_trip_points(),
│   │   │                         #   get_cooling_devices(), is_throttling() interface
│   │   ├── hwmon.py             # Linux hwmon backend: reads /sys/class/hwmon/hwmon*/
│   │   │                         #   for temperature, fan speed, voltage, power sensors
│   │   └── ipmi.py              # IPMI SDR backend: uses ipmitool sdr to read BMC sensors;
│   │                             #   provides out-of-band thermal data independent of OS
│   └── platform/
│       ├── __init__.py
│       ├── base.py              # AbstractPlatform: defines which HAL backends to load,
│       │                         #   platform-specific quirks, expected device topology
│       ├── x86_server.py        # x86 server: auto-detects Intel/AMD chipset, loads i2c-i801
│       │                         #   or i2c-piix4, discovers PCIe topology via sysfs
│       └── arm_server.py        # ARM server (Ampere/Graviton): handles platform-specific
│                                 #   device tree paths, different hwmon layout, PCIe RC naming
├── collectors/                   # Userspace event handlers (Python)
│   ├── __init__.py              # Package init; exports all collector classes
│   ├── base.py                   # BaseCollector ABC: defines start(), stop(), process_event(),
│   │                             #   is_running property; accepts config + HAL registry
│   ├── storage.py               # StorageCollector: processes block I/O events from eBPF probes;
│   │                             #   computes latency histograms, percentiles; uses HAL for device info
│   ├── pcie.py                  # PCIeCollector: processes AER events; decodes status bits to error
│   │                             #   names; formats TLP headers; filters by severity
│   ├── network.py               # NetworkCollector: aggregates TCP retransmit events per flow;
│   │                             #   calculates rate; identifies NCCL/RDMA-related retransmissions
│   ├── gpu.py                   # GPUCollector: tracks DMA fence lifetimes; detects GPU hang when
│   │                             #   fence exceeds timeout; correlates with IOMMU faults
│   ├── thermal.py               # ThermalCollector: processes thermal trip events; tracks throttle
│   │                             #   duration; correlates CPU freq drops with I/O latency spikes
│   └── memory.py               # MemoryCollector: processes DMA failures, ECC/MCE events;
│                                 #   tracks NUMA imbalance; predicts DIMM failure from error trends
├── exporters/                    # Output backends (where processed data goes)
│   ├── __init__.py              # Package init; exports all exporter classes
│   ├── prometheus.py             # PrometheusExporter: registers counters, histograms, gauges;
│   │                             #   serves HTTP /metrics endpoint for Prometheus scraping
│   ├── json_log.py              # JsonLogExporter: writes each event as single-line JSON to file;
│   │                             #   supports log rotation by size; auto-adds timestamp field
│   └── alerter.py               # AlertEngine: evaluates declarative rules against metric values;
│                                 #   supports threshold + duration conditions; fires webhooks/syslog
├── config/
│   ├── default.yaml             # Default agent configuration: collector enable/disable, thresholds,
│   │                             #   exporter ports, log paths, poll intervals
│   ├── alert_rules.yaml         # Alert rule definitions: condition expressions, severity levels,
│   │                             #   duration requirements, notification backends
│   └── platforms/               # Platform-specific HAL configuration profiles
│       ├── generic_x86.yaml     # Generic x86 server: enables all standard backends
│       ├── nvidia_dgx.yaml      # NVIDIA DGX: enables NVIDIA GPU HAL, RDMA, fewer storage
│       └── storage_jbof.yaml    # Storage JBOF: many NVMe devices, no GPU, NVMe-oF networking
├── tests/
│   ├── unit/                    # Fast tests, no root, no hardware (mock everything)
│   │   ├── test_collectors.py   # Test event processing, device filtering, lifecycle
│   │   ├── test_decoders.py     # Test pure decoding functions (AER bits, latency calc, IP format)
│   │   ├── test_exporters.py    # Test Prometheus metrics, JSON serialization, alert evaluation
│   │   ├── test_config.py       # Test config loading, env overrides, validation, defaults
│   │   └── test_hal.py          # Test HAL registry, mock device behavior, backend swap
│   ├── integration/             # Requires root + BCC; tests actual eBPF probe loading
│   │   ├── test_probe_loading.py    # Verify each .bpf.c compiles and attaches in running kernel
│   │   ├── test_event_pipeline.py   # Verify events flow probe → perf buffer → userspace
│   │   └── test_prometheus.py       # Start agent, verify /metrics responds with expected metrics
│   ├── mock/                    # Test doubles for isolated testing
│   │   ├── mock_events.py       # Synthetic eBPF events (MockAEREvent, MockNVMeEvent, etc.)
│   │   ├── mock_tracepoints.py  # Fake tracepoint data generators for event burst simulation
│   │   └── mock_hal.py          # Mock HAL backends (MockStorageDevice, MockDeviceRegistry)
│   │                             #   — enables full testing without any real hardware
│   └── conftest.py              # pytest fixtures: temp dirs, mock registries, config factories
├── docs/
│   ├── architecture.md          # High-level system architecture diagram and data flow
│   ├── hal-design.md            # HAL design guide: how to add new HW backend, interface contracts
│   └── deployment.md            # Deployment guide: install deps, configure, systemd, Grafana
├── Makefile                     # Build targets: install, test, lint, format, clean, docker
├── pyproject.toml               # Python project metadata, dependencies, tool configs (pytest, black)
├── requirements.txt             # Pinned dependencies: bcc, prometheus_client, pyyaml, etc.
└── README.md                    # Project overview, quick start, feature list, architecture summary
```

---

## Hardware Abstraction Layer (HAL) Design

The HAL decouples diagnostic logic from specific hardware implementations,
enabling hot-swap of backends without modifying collectors or probes.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Collectors                                │
│  (storage.py, pcie.py, network.py, gpu.py, thermal.py)      │
│                                                               │
│  Collectors use HAL interfaces — never access hardware       │
│  directly. This means:                                        │
│  - Same collector code works on NVMe, SAS, or SATA          │
│  - Same GPU collector works on NVIDIA or AMD                 │
│  - Swap hardware = swap HAL backend config, not code         │
└───────────────────────────────┬─────────────────────────────┘
                                │ calls abstract interface
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                   HAL Interface Layer                         │
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │AbstractStorage    │  │AbstractPCIeDevice│  ...            │
│  │  .get_devices()  │  │  .get_aer_status()│                │
│  │  .get_smart()    │  │  .get_link_speed()│                │
│  │  .get_latency()  │  │  .get_bdf()       │                │
│  └────────┬─────────┘  └────────┬─────────┘                 │
│           │                      │                            │
└───────────┼──────────────────────┼────────────────────────────┘
            │                      │
     ┌──────┴──────┐       ┌──────┴──────┐
     │             │       │             │
┌────┴────┐ ┌─────┴───┐ ┌─┴───────┐ ┌───┴──────┐
│NVMe HAL │ │SAS HAL  │ │sysfs HAL│ │lspci HAL │
│(nvme-cli│ │(sg_ses, │ │(/sys/bus│ │(setpci)  │
│ sysfs)  │ │ smp)    │ │ /pci/)  │ │          │
└─────────┘ └─────────┘ └─────────┘ └──────────┘
     │           │            │            │
     ▼           ▼            ▼            ▼
  Hardware    Hardware     Hardware     Hardware
```

### HAL Base Classes

```python
# hal/base.py
from abc import ABC, abstractmethod
from typing import List, Dict, Any


class HardwareDevice(ABC):
    """Base class for all HAL device representations."""

    @abstractmethod
    def get_id(self) -> str:
        """Unique identifier (e.g., BDF, /dev path, serial number)."""
        ...

    @abstractmethod
    def get_type(self) -> str:
        """Device type string (e.g., 'nvme', 'sas', 'gpu')."""
        ...

    @abstractmethod
    def is_healthy(self) -> bool:
        """Quick health check."""
        ...

    @abstractmethod
    def get_properties(self) -> Dict[str, Any]:
        """Get device properties (model, firmware, serial, etc.)."""
        ...


class DeviceRegistry:
    """Central registry for all discovered hardware devices."""

    def __init__(self):
        self._devices: Dict[str, HardwareDevice] = {}
        self._backends: List = []

    def discover(self) -> None:
        """Run discovery on all registered backends."""
        for backend in self._backends:
            for device in backend.enumerate():
                self._devices[device.get_id()] = device

    def get_devices_by_type(self, device_type: str) -> List[HardwareDevice]:
        """Get all devices of a given type."""
        return [d for d in self._devices.values() if d.get_type() == device_type]

    def register_backend(self, backend) -> None:
        """Register a HAL backend for device discovery."""
        self._backends.append(backend)
```

### HAL Storage Example

```python
# hal/storage/base.py
from abc import abstractmethod
from hal.base import HardwareDevice
from typing import Dict, Optional


class AbstractStorageDevice(HardwareDevice):
    """Abstract storage device interface."""

    @abstractmethod
    def get_capacity_bytes(self) -> int:
        ...

    @abstractmethod
    def get_smart_data(self) -> Dict[str, Any]:
        """Return SMART/health data (temperature, wear, errors)."""
        ...

    @abstractmethod
    def get_io_stats(self) -> Dict[str, int]:
        """Current I/O statistics (reads, writes, latency)."""
        ...

    @abstractmethod
    def get_firmware_version(self) -> str:
        ...

    @abstractmethod
    def supports_latency_monitoring(self) -> bool:
        """Whether this device supports eBPF latency tracing."""
        ...


# hal/storage/nvme.py
import subprocess
import json
from hal.storage.base import AbstractStorageDevice


class NVMeDevice(AbstractStorageDevice):
    """NVMe device HAL implementation."""

    def __init__(self, dev_path: str):
        self._path = dev_path  # e.g., /dev/nvme0n1

    def get_id(self) -> str:
        return self._path

    def get_type(self) -> str:
        return "nvme"

    def is_healthy(self) -> bool:
        smart = self.get_smart_data()
        return smart.get("critical_warning", 1) == 0

    def get_smart_data(self) -> Dict[str, Any]:
        result = subprocess.run(
            ["nvme", "smart-log", self._path, "-o", "json"],
            capture_output=True, text=True
        )
        return json.loads(result.stdout)

    def get_io_stats(self) -> Dict[str, int]:
        # Read from /sys/block/nvme0n1/stat
        ...

    def get_firmware_version(self) -> str:
        props = self.get_properties()
        return props.get("firmware_rev", "unknown")

    def get_capacity_bytes(self) -> int:
        ...

    def supports_latency_monitoring(self) -> bool:
        return True  # NVMe always supports block tracepoints

    def get_properties(self) -> Dict[str, Any]:
        result = subprocess.run(
            ["nvme", "id-ctrl", self._path, "-o", "json"],
            capture_output=True, text=True
        )
        return json.loads(result.stdout)
```

### HAL Configuration (Platform Profiles)

```yaml
# config/platforms/nvidia_dgx.yaml
platform:
  name: "NVIDIA DGX A100"
  arch: x86_64

hal:
  storage:
    backends:
      - type: nvme
        discovery: sysfs       # /sys/class/nvme/
      - type: sas
        enabled: false

  pcie:
    backends:
      - type: linux_sysfs

  network:
    backends:
      - type: ethtool
      - type: rdma
        enabled: true          # GPU-Direct RDMA present

  gpu:
    backends:
      - type: nvidia
        smi_path: /usr/bin/nvidia-smi

  thermal:
    backends:
      - type: hwmon
      - type: ipmi
        enabled: true


# config/platforms/storage_jbof.yaml
platform:
  name: "Storage JBOF (NVMe-oF Target)"
  arch: x86_64

hal:
  storage:
    backends:
      - type: nvme
        discovery: sysfs
        filter: "nvme[0-9]*"   # all NVMe devices

  pcie:
    backends:
      - type: linux_sysfs

  network:
    backends:
      - type: ethtool
      - type: rdma
        enabled: true          # NVMe-oF over RDMA

  gpu:
    backends: []               # no GPUs on storage node

  thermal:
    backends:
      - type: hwmon
      - type: ipmi
```

### How Collectors Use HAL

```python
# collectors/storage.py (updated to use HAL)
from hal.registry import DeviceRegistry
from hal.storage.base import AbstractStorageDevice
from collectors.base import BaseCollector


class StorageCollector(BaseCollector):
    """Storage diagnostics collector — hardware-agnostic via HAL."""

    def __init__(self, config, registry: DeviceRegistry):
        super().__init__(config)
        self._registry = registry

    def discover_devices(self):
        """Get all storage devices from HAL (NVMe, SAS, SATA — transparent)."""
        return self._registry.get_devices_by_type("nvme") + \
               self._registry.get_devices_by_type("sas") + \
               self._registry.get_devices_by_type("sata")

    def collect_health(self):
        """Collect health from all storage devices, regardless of type."""
        for device in self.discover_devices():
            smart = device.get_smart_data()
            yield {
                "device": device.get_id(),
                "type": device.get_type(),
                "healthy": device.is_healthy(),
                "temperature": smart.get("temperature"),
                "wear_level": smart.get("percentage_used"),
            }

    def get_probe_targets(self):
        """Return only devices that support eBPF latency tracing."""
        return [d for d in self.discover_devices()
                if d.supports_latency_monitoring()]
```

### Benefits of HAL

| Benefit | Description |
|---------|-------------|
| **Hardware hot-swap** | Replace NVMe with SAS → change platform config, not code |
| **Multi-vendor support** | Same collector works for Samsung, Intel, Micron NVMe |
| **Testing** | Mock HAL backends in unit tests (no real hardware) |
| **Platform profiles** | DGX, storage JBOF, generic x86 — preconfigured |
| **Graceful degradation** | If a HAL backend fails to load, agent continues with others |
| **Discovery** | Auto-detect available hardware at startup |
| **Future-proof** | Add CXL memory, new GPU vendors without touching core |

---

## Phase 1: Core Framework (Weeks 1-2)

### Sprint 1.1: Agent Skeleton

| Task | Description | Deliverable |
|------|-------------|-------------|
| 1.1.1 | Project scaffolding (pyproject.toml, Makefile) | Build system |
| 1.1.2 | Config loader (YAML-based, env overrides) | `config/default.yaml` |
| 1.1.3 | Abstract `BaseCollector` class | `collectors/base.py` |
| 1.1.4 | Event pipeline (collector → exporter) | `cmd/diagd/main.py` |
| 1.1.5 | Prometheus exporter (HTTP /metrics) | `exporters/prometheus.py` |
| 1.1.6 | JSON log exporter (stdout/file) | `exporters/json_log.py` |
| 1.1.7 | Graceful shutdown (SIGINT/SIGTERM) | Signal handlers |
| 1.1.8 | Systemd unit file | `ebpf-hw-diag.service` |

### Sprint 1.2: First Probe (PCIe AER — already done)

| Task | Description | Deliverable |
|------|-------------|-------------|
| 1.2.1 | Port `pcie_aer_monitor.py` into agent framework | `collectors/pcie.py` |
| 1.2.2 | Define Prometheus metrics (counter, histogram) | AER metrics |
| 1.2.3 | Add alert rules (Fatal → critical alert) | `alert_rules.yaml` |
| 1.2.4 | Unit tests for PCIe decoder | `tests/unit/test_decoders.py` |
| 1.2.5 | Integration test (load probe, verify event) | `tests/integration/` |

---

## Phase 2: Storage Diagnostics (Weeks 3-4)

| Task | Description | Deliverable |
|------|-------------|-------------|
| 2.1 | NVMe I/O latency probe (block tracepoints) | `probes/storage/nvme_latency.bpf.c` |
| 2.2 | NVMe collector (decode events, compute histograms) | `collectors/storage.py` |
| 2.3 | Per-device latency percentiles (P50/P99/P999) | Prometheus histogram |
| 2.4 | NVMe queue depth saturation probe | `probes/storage/nvme_queue_depth.bpf.c` |
| 2.5 | Latency threshold alerting (P99 > X μs) | Alert rule |
| 2.6 | Unit tests for histogram computation | Tests |
| 2.7 | Integration test with real NVMe (or mock) | Tests |

---

## Phase 3: Network Fabric (Weeks 5-6)

| Task | Description | Deliverable |
|------|-------------|-------------|
| 3.1 | TCP retransmission probe | `probes/network/tcp_retrans.bpf.c` |
| 3.2 | Network collector (per-flow retransmit stats) | `collectors/network.py` |
| 3.3 | RDMA error probe (if tracepoints available) | `probes/network/rdma_errors.bpf.c` |
| 3.4 | NIC drop correlation (softnet_stat reader) | Supplementary metric |
| 3.5 | Alert: retransmit rate > threshold | Alert rule |
| 3.6 | Unit tests for network decoder | Tests |

---

## Phase 4: Thermal & Power (Weeks 7-8)

| Task | Description | Deliverable |
|------|-------------|-------------|
| 4.1 | Thermal throttle probe | `probes/thermal/throttle_events.bpf.c` |
| 4.2 | CPU frequency tracking probe | `probes/thermal/cpu_freq.bpf.c` |
| 4.3 | Thermal collector (event → metric) | `collectors/thermal.py` |
| 4.4 | Cross-layer correlation engine | Correlate thermal + I/O latency |
| 4.5 | PMBus VRM monitor probe (optional) | `probes/thermal/pmbus_fault.bpf.c` |
| 4.6 | Alert: thermal trip or sustained throttle | Alert rule |
| 4.7 | Unit tests | Tests |

---

## Phase 5: GPU & Memory (Weeks 9-10)

| Task | Description | Deliverable |
|------|-------------|-------------|
| 5.1 | GPU DMA fence timeout probe | `probes/gpu/fence_timeout.bpf.c` |
| 5.2 | IOMMU fault probe | `probes/gpu/iommu_fault.bpf.c` |
| 5.3 | GPU collector | `collectors/gpu.py` |
| 5.4 | DMA mapping failure probe | `probes/memory/dma_failures.bpf.c` |
| 5.5 | MCE (ECC error) probe | `probes/memory/mce_events.bpf.c` |
| 5.6 | Memory collector | `collectors/memory.py` |
| 5.7 | Alert: GPU hang, ECC threshold | Alert rules |
| 5.8 | Unit tests | Tests |

---

## Phase 6: Integration & Deployment (Weeks 11-12)

| Task | Description | Deliverable |
|------|-------------|-------------|
| 6.1 | Cross-layer event correlation engine | `collectors/correlator.py` |
| 6.2 | Grafana dashboard templates | `docs/grafana-dashboard.json` |
| 6.3 | Deployment automation (Ansible/script) | Deployment docs |
| 6.4 | Performance benchmarking (overhead < 1% CPU) | Benchmark report |
| 6.5 | End-to-end integration tests | Full pipeline tests |
| 6.6 | Documentation & README | Final docs |

---

## Configuration Design

```yaml
# config/default.yaml
agent:
  log_level: info
  poll_interval_ms: 1000

collectors:
  storage:
    enabled: true
    latency_threshold_us: 5000     # P99 alert threshold
    devices: ["nvme*"]             # glob pattern
  pcie:
    enabled: true
    severity_filter: all           # all, corrected, fatal, nonfatal
  network:
    enabled: true
    retransmit_alert_rate: 100     # per second
  thermal:
    enabled: true
    throttle_alert: true
  gpu:
    enabled: false                 # enable on GPU servers
    fence_timeout_ms: 5000
  memory:
    enabled: true
    mce_alert: true

exporters:
  prometheus:
    enabled: true
    port: 9101
    path: /metrics
  json_log:
    enabled: true
    output: /var/log/ebpf-hw-diag/events.jsonl
    rotate_mb: 100
  alerter:
    enabled: true
    rules_file: /etc/ebpf-hw-diag/alert_rules.yaml
    backends:
      - type: webhook
        url: https://hooks.slack.com/services/XXX
      - type: syslog
        facility: local0
```

---

## Alert Rules Design

```yaml
# config/alert_rules.yaml
rules:
  - name: pcie_fatal_error
    condition: "pcie_aer_errors{severity='Fatal'} > 0"
    severity: critical
    message: "PCIe Fatal error on device {{ .device }}"

  - name: nvme_high_latency
    condition: "nvme_latency_p99_us > 5000"
    duration: 60s
    severity: warning
    message: "NVMe {{ .device }} P99 latency {{ .value }}μs"

  - name: tcp_retransmit_storm
    condition: "rate(tcp_retransmits_total[1m]) > 100"
    severity: warning
    message: "High TCP retransmit rate to {{ .dest }}"

  - name: thermal_throttle
    condition: "thermal_throttle_events_total increase > 0"
    severity: warning
    message: "Thermal throttling on zone {{ .zone }}"

  - name: gpu_hang
    condition: "gpu_fence_timeout_total > 0"
    severity: critical
    message: "GPU hang detected: fence timeout {{ .duration_ms }}ms"

  - name: ecc_errors
    condition: "rate(mce_corrected_errors_total[1h]) > 10"
    severity: warning
    message: "ECC errors increasing on {{ .dimm }}"
```

---

## Technology Stack

| Component | Choice | Reason |
|-----------|--------|--------|
| Language (userspace) | Python 3.10+ | BCC bindings, rapid development |
| eBPF framework | BCC (dev) → libbpf (prod) | BCC for prototyping, libbpf for deployment |
| Metrics | Prometheus client_python | Industry standard |
| Config | PyYAML | Simple, human-readable |
| Testing | pytest + pytest-mock | Standard Python testing |
| Packaging | systemd + pip/deb | Easy deployment |
| CI | GitHub Actions | Automated testing |

---

## Milestones & Acceptance Criteria

| Milestone | Week | Acceptance |
|-----------|------|------------|
| M1: Framework MVP | 2 | Agent starts, loads 1 probe, exports metrics |
| M2: Storage monitoring | 4 | NVMe latency + PCIe AER → Prometheus |
| M3: Network monitoring | 6 | TCP retrans tracking, alerts fire |
| M4: Full sensor coverage | 10 | All 6 subsystems monitored |
| M5: Production ready | 12 | <1% CPU overhead, Grafana dashboard, docs |
