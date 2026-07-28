# Development Plan: eBPF Server HW Diagnostics Agent

## Project Overview

Build a unified eBPF-based hardware diagnostics agent for AI/Storage servers
that monitors storage, PCIe, network, GPU, thermal, and memory subsystems
with near-zero overhead.

**Repository Structure:**
```
ebpf-hw-diag/
├── cmd/
│   └── diagd/                    # Main daemon binary
│       └── main.py
├── probes/                       # eBPF programs (kernel-side)
│   ├── storage/
│   │   ├── nvme_latency.bpf.c
│   │   ├── nvme_queue_depth.bpf.c
│   │   └── block_errors.bpf.c
│   ├── pcie/
│   │   ├── aer_monitor.bpf.c
│   │   └── link_recovery.bpf.c
│   ├── network/
│   │   ├── tcp_retrans.bpf.c
│   │   └── rdma_errors.bpf.c
│   ├── gpu/
│   │   ├── fence_timeout.bpf.c
│   │   └── iommu_fault.bpf.c
│   ├── thermal/
│   │   ├── throttle_events.bpf.c
│   │   └── cpu_freq.bpf.c
│   └── memory/
│       ├── dma_failures.bpf.c
│       ├── numa_imbalance.bpf.c
│       └── mce_events.bpf.c
├── collectors/                   # Userspace event handlers (Python)
│   ├── __init__.py
│   ├── base.py                   # Abstract collector class
│   ├── storage.py
│   ├── pcie.py
│   ├── network.py
│   ├── gpu.py
│   ├── thermal.py
│   └── memory.py
├── exporters/                    # Output backends
│   ├── __init__.py
│   ├── prometheus.py             # Prometheus metrics exporter
│   ├── json_log.py              # JSON log file / stdout
│   └── alerter.py               # Alert rules engine
├── config/
│   ├── default.yaml             # Default configuration
│   └── alert_rules.yaml         # Alert thresholds
├── tests/
│   ├── unit/
│   │   ├── test_collectors.py
│   │   ├── test_decoders.py
│   │   ├── test_exporters.py
│   │   └── test_config.py
│   ├── integration/
│   │   ├── test_probe_loading.py
│   │   ├── test_event_pipeline.py
│   │   └── test_prometheus.py
│   ├── mock/
│   │   ├── mock_events.py       # Synthetic eBPF events for testing
│   │   └── mock_tracepoints.py  # Fake tracepoint data
│   └── conftest.py              # pytest fixtures
├── docs/
│   ├── architecture.md
│   └── deployment.md
├── Makefile
├── pyproject.toml
├── requirements.txt
└── README.md
```

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
