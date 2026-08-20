# eBPF Hardware Diagnostics Agent — Software Specification

**Version:** 0.1.0
**Status:** Phase 1 (Core Framework + PCIe AER)
**Date:** August 2026

---

## 1. Purpose & Scope

### 1.1 Purpose
Provide real-time, low-overhead hardware fault detection and correlation
for AI/Storage Linux servers using eBPF kernel instrumentation.

### 1.2 Scope
This specification covers:
- Software architecture and component interfaces
- Event schema and data flow
- Probe specifications and kernel requirements
- Exporter output formats
- Correlation engine behavior
- Configuration schema
- Performance requirements

### 1.3 Out of Scope
- Hardware Abstraction Layer (HAL) — Phase 2
- CLI one-shot diagnostics — Phase 2
- libbpf/CO-RE production probes — Phase 3
- GUI/Dashboard implementation

---

## 2. System Architecture

### 2.1 Component Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                          KERNEL SPACE                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                 │
│  │ PCIe AER │ │  NVMe    │ │ Thermal  │ │ Network  │  (eBPF probes)  │
│  │  Probe   │ │ Latency  │ │  Probe   │ │  Probe   │                 │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘                 │
│       └─────────────┴────────────┴─────────────┘                       │
│                     Perf Ring Buffers                                    │
└─────────────────────────┬──────────────────────────────────────────────┘
                          │
┌─────────────────────────┼──────────────────────────────────────────────┐
│                         │     USERSPACE AGENT                           │
│                         ▼                                               │
│  ┌─────────────────────────────────────────┐                           │
│  │           ProbeManager                   │                           │
│  │  (load/attach/health-check/unload)      │                           │
│  └──────────────────┬──────────────────────┘                           │
│                     │ raw bytes                                         │
│                     ▼                                                   │
│  ┌─────────────────────────────────────────┐                           │
│  │           Collectors                     │                           │
│  │  (decode raw → typed DiagEvent)         │                           │
│  └──────────────────┬──────────────────────┘                           │
│                     │ DiagEvent                                         │
│                     ▼                                                   │
│  ┌─────────────────────────────────────────┐                           │
│  │    EventBus (rate_limiter → fan-out)    │                           │
│  └──┬───────┬──────────┬──────────┬───────┘                           │
│     │       │          │          │                                     │
│     ▼       ▼          ▼          ▼                                     │
│  ┌─────┐ ┌──────┐ ┌────────┐ ┌────────────┐                          │
│  │Prom.│ │ JSON │ │Alerter │ │ Correlator │                          │
│  │     │ │ Log  │ │        │ │            │                          │
│  └─────┘ └──────┘ └────────┘ └─────┬──────┘                          │
│                                      │                                  │
│                              CorrelatedEvent                            │
│                                      │                                  │
│                              (fed back to EventBus)                     │
│                                                                         │
│  ┌──────────────┐                                                      │
│  │ HealthCheck  │  /healthz (HTTP)                                     │
│  └──────────────┘                                                      │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
1. Kernel fires tracepoint (e.g., ras:aer_event)
2. eBPF probe captures event data, optionally filters, submits to perf buffer
3. ProbeManager polls perf buffer (configurable interval, default 1000ms)
4. Collector receives raw C struct, decodes to typed Python DiagEvent
5. Collector emits event to EventBus
6. EventBus applies rate limiter (TokenBucket)
7. EventBus dispatches to all registered consumers:
   a. PrometheusExporter → updates counters/histograms
   b. JsonLogExporter → writes JSONL line to file
   c. AlertEngine → evaluates rules, fires alerts if matched
   d. CorrelationEngine → ingests into sliding window, evaluates cross-layer rules
8. If correlation matches → CorrelatedEvent emitted back to EventBus (step 6)
```

---

## 3. Component Specifications

### 3.1 Events (events/)

#### 3.1.1 DiagEvent (Base Class)

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | float | Unix timestamp (time.time()) |
| `source_probe` | str | Probe identifier (e.g., "aer_monitor") |
| `device_id` | str | Hardware device identifier (BDF, /dev path, etc.) |
| `severity` | str | "info", "warning", "critical" |

#### 3.1.2 PCIeAEREvent

| Field | Type | Description |
|-------|------|-------------|
| (inherits DiagEvent) | | |
| `bdf` | str | PCI Bus:Device.Function (e.g., "0000:03:00.0") |
| `status_raw` | int | AER status register value |
| `severity_code` | int | 0=Non-Fatal, 1=Fatal, 2=Corrected |
| `errors` | list[str] | Decoded error names (e.g., ["Bad TLP"]) |
| `tlp_header` | str | TLP header hex string (if available) |

#### 3.1.3 NVMeLatencyEvent

| Field | Type | Description |
|-------|------|-------------|
| (inherits DiagEvent) | | |
| `latency_us` | int | I/O latency in microseconds |
| `opcode` | int | NVMe opcode (0x01=write, 0x02=read) |
| `queue_id` | int | NVMe queue ID |
| `namespace_id` | int | NVMe namespace |

#### 3.1.4 CorrelatedEvent

| Field | Type | Description |
|-------|------|-------------|
| (inherits DiagEvent) | | |
| `rule_name` | str | Which correlation rule matched |
| `trigger_events` | list[DiagEvent] | Events that triggered the correlation |
| `root_cause` | str | Diagnosed root cause (human-readable) |
| `recommended_action` | str | Remediation guidance |
| `confidence` | float | 0.0-1.0 confidence score |
| `correlated_devices` | list[str] | Devices involved |

---

### 3.2 Core Infrastructure (core/)

#### 3.2.1 EventBus

**Purpose:** Fan-out event routing with rate limiting and error isolation.

**Interface:**
```python
class EventBus:
    def register(consumer) -> None       # Add consumer (must have .receive(event))
    def unregister(consumer) -> None     # Remove consumer
    def emit(event: DiagEvent) -> None   # Dispatch to all (rate-limited)
    @property
    def stats -> dict                    # {events_dispatched, events_dropped, errors}
```

**Behavior:**
- If rate limiter denies, event is silently dropped (counter incremented)
- If consumer.receive() throws, exception is logged but other consumers still receive
- Thread-safe (lock protects consumer list)

#### 3.2.2 TokenBucketRateLimiter

**Purpose:** Prevent event flood from causing OOM.

**Interface:**
```python
class TokenBucketRateLimiter:
    def __init__(rate: float, burst: int)   # tokens/sec, max burst
    def allow() -> bool                     # consume 1 token, return allowed/denied
    @property allowed_count -> int
    @property dropped_count -> int
```

**Behavior:**
- Tokens refill at `rate` per second
- Burst allows short spikes up to `burst` tokens
- Thread-safe (internal lock)

#### 3.2.3 ProbeManager

**Purpose:** Load/unload eBPF probes with graceful degradation.

**Interface:**
```python
class ProbeManager:
    def try_load(probe_name, bpf_text, tracepoint) -> ProbeLoadResult
    def unload(probe_name) -> None
    def unload_all() -> None
    @property is_running -> bool
    @property loaded_count -> int
    @property failed_count -> int
    def get_status() -> dict
```

**Behavior:**
- Checks tracepoint existence before attempting load
- Checks root permissions
- On failure: logs warning, marks as failed, agent continues
- Never crashes the agent on probe failure

#### 3.2.4 HealthCheck

**Purpose:** Self-monitoring + liveness endpoint.

**Endpoint:** `GET /healthz` on configurable port (default 9102)

**Response:**
```json
{
  "status": "healthy",          // "healthy" or "unhealthy"
  "uptime_seconds": 3600,
  "probes_loaded": 3,
  "probes_failed": 1,
  "events_dispatched": 12345,
  "events_dropped": 0,
  "consumer_errors": 0
}
```

**HTTP Status:** 200 if healthy, 503 if unhealthy.

#### 3.2.5 CapabilityDetector

**Purpose:** Determine what the current system can support.

**Detects:**
- Kernel version
- Root/CAP_BPF permission
- BTF availability (/sys/kernel/btf/vmlinux)
- Available tracepoints (reads /sys/kernel/tracing/events/ or debugfs)

---

### 3.3 Collectors (collectors/)

#### 3.3.1 BaseCollector (Abstract)

```python
class BaseCollector(ABC):
    @abstractmethod start() -> bool    # Load probe, return success
    @abstractmethod stop() -> None     # Unload probe, cleanup
    @abstractmethod poll() -> None     # Poll perf buffer (called from main loop)
    @property enabled -> bool          # From config
    @property is_running -> bool
    @property events_processed -> int
```

#### 3.3.2 PCIeCollector

**Probe:** Embedded BPF program attaching to `tracepoint:ras:aer_event`
**Filter:** Severity filter applied in kernel (BPF_ARRAY map)
**Output:** PCIeAEREvent with decoded error names and TLP header

**Kernel Requirements:**
- `CONFIG_PCIEAER=y`
- ACPI `_OSC` grants AER control to OS
- Tracepoint: `ras:aer_event` must exist

---

### 3.4 Exporters (exporters/)

#### 3.4.1 PrometheusExporter

**Interface:** `.receive(event)` + HTTP `/metrics` server
**Port:** Configurable (default 9101)
**Metrics registered:**
- `diagd_pcie_aer_errors_total` (Counter, labels: device, severity)
- `diagd_nvme_io_latency_us` (Histogram, labels: device)
- `diagd_thermal_trip_events_total` (Counter, labels: zone, trip_type)
- `diagd_events_processed_total` (Counter, labels: source_probe)

#### 3.4.2 JsonLogExporter

**Interface:** `.receive(event)` → write to file
**Format:** Newline-delimited JSON (JSONL), one event per line
**Features:**
- Auto-adds `@timestamp` and `event_type` fields
- File rotation when size exceeds `rotate_mb`
- Falls back to stdout if file cannot be opened

#### 3.4.3 AlertEngine

**Interface:** `.receive(event)` → evaluate rules → fire alerts
**Rules format:** YAML with condition expressions, severity, duration
**Cooldown:** Same alert not re-fired within `cooldown_sec` (default 300s)

---

### 3.5 Correlator (correlator/)

#### 3.5.1 CorrelationEngine

**Purpose:** Detect cross-layer failure patterns.

**Algorithm:**
1. Ingest event into sliding window (deque, max size configurable)
2. Prune events older than `window_sec`
3. For each rule: check if all conditions are satisfied by events in window
4. If matched: check device scope (same_device / any / same_bus)
5. If device scope passes: check cooldown (don't re-fire within cooldown_sec)
6. If all pass: emit CorrelatedEvent via callback

**Performance:**
- O(1) event ingestion (append to deque)
- O(R × W) rule evaluation (R=rules, W=window events per condition)
- Memory: ~25 MB for 50K events in window

#### 3.5.2 CorrelationRule

| Field | Type | Description |
|-------|------|-------------|
| `name` | str | Unique rule identifier |
| `conditions` | list[EventCondition] | All must match |
| `time_window_sec` | float | Events must co-occur within this window |
| `device_scope` | str | "any", "same_device", "same_bus" |
| `root_cause` | str | Human-readable diagnosis |
| `recommended_action` | str | Remediation guidance |
| `confidence` | float | 0.0-1.0 |
| `cooldown_sec` | float | Don't re-fire within this duration |
| `priority` | int | 1=highest, 10=lowest |

#### 3.5.3 EventCondition

| Field | Type | Description |
|-------|------|-------------|
| `event_type` | str | Python class name to match |
| `field` | str | Optional: field to check |
| `op` | str | "exists", "==", "!=", ">", "<", ">=", "<=", "contains" |
| `value` | Any | Comparison value |

---

## 4. Configuration Schema

### 4.1 Loading Priority

```
1. Hardcoded defaults (config/loader.py DEFAULTS)
2. YAML config file (--config argument)
3. Environment variables (DIAG_* prefix)
```

Higher number overrides lower.

### 4.2 Validation Rules

- `agent.log_level` must be in {debug, info, warning, error, critical}
- `collectors.*.enabled` must be boolean
- `exporters.prometheus.port` must be integer
- Missing sections use defaults (never error on missing optional field)

---

## 5. Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| CPU overhead (idle) | < 0.5% | No events flowing |
| CPU overhead (active) | < 2% | 10K events/sec sustained |
| Event processing rate | ≥ 100K events/sec | EventBus throughput |
| Memory (steady state) | < 100 MB | All collectors active |
| Memory (correlation window) | < 50 MB | 50K events buffered |
| Event latency (probe → exporter) | < 10 ms | Perf buffer poll interval |
| Startup time | < 3 seconds | Config load + probe attach |
| Graceful shutdown | < 5 seconds | SIGTERM → exit |

---

## 6. Kernel Requirements

### 6.1 Required Kernel Config

```
CONFIG_BPF=y
CONFIG_BPF_SYSCALL=y
CONFIG_BPF_JIT=y
CONFIG_HAVE_EBPF_JIT=y
CONFIG_TRACEPOINTS=y
```

### 6.2 Per-Probe Requirements

| Probe | Config | Tracepoint | Min Kernel |
|-------|--------|-----------|-----------|
| PCIe AER | `CONFIG_PCIEAER=y` | `ras:aer_event` | 4.10 |
| NVMe Latency | `CONFIG_BLK_DEV_NVME=y` | `block:block_rq_*` | 4.10 |
| Thermal | `CONFIG_THERMAL=y` | `thermal:thermal_zone_trip` | 4.10 |
| CPU Freq | `CONFIG_CPU_FREQ=y` | `power:cpu_frequency` | 4.10 |
| TCP Retrans | `CONFIG_INET=y` | `tcp:tcp_retransmit_skb` | 4.15 |
| MCE/ECC | `CONFIG_X86_MCE=y` | `ras:mc_event` | 4.10 |
| DMA Fence | `CONFIG_DMA_SHARED_BUFFER=y` | `dma_fence:*` | 5.1 |
| IOMMU Fault | `CONFIG_IOMMU_API=y` | `iommu:io_page_fault` | 5.8 |

---

## 7. Error Handling

### 7.1 Graceful Degradation Matrix

| Failure | Agent Behavior |
|---------|---------------|
| Probe load fails (missing tracepoint) | Log warning, skip this collector, continue |
| Probe load fails (no permission) | Log error, exit with message |
| BCC not installed | Log error, exit with install instructions |
| Perf buffer overflow | Increment `lost_events` counter, continue |
| Consumer throws exception | Log error, other consumers still receive |
| Config file missing | Use hardcoded defaults |
| Config file malformed | Log error, exit |
| Prometheus port in use | Log warning, exporter disabled |
| JSON log file not writable | Fall back to stdout |
| SIGINT/SIGTERM | Graceful shutdown (unload probes, flush logs) |

### 7.2 Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Normal shutdown (SIGINT/SIGTERM) |
| 1 | Configuration error |
| 2 | Permission error (not root) |
| 3 | Critical dependency missing (BCC) |

---

## 8. Testing Strategy

| Layer | Tests | Root Required | CI |
|-------|-------|--------------|-----|
| Unit | ~34 (events, core, config, correlator) | No | Yes |
| Integration | Probe loading, event pipeline | Yes | Privileged container |
| Performance | Throughput, memory bounds | Yes | VM |
| Chaos | Buffer overflow, permission loss | Yes | VM |

### 8.1 Running Tests

```bash
# Unit (fast, no root)
python3 -m pytest tests/unit/ -v

# With coverage
python3 -m pytest tests/unit/ --cov=events --cov=core --cov=correlator --cov=config

# Integration (root)
sudo python3 -m pytest tests/integration/ -v
```

---

## 9. Future Phases

| Phase | Timeline | Content |
|-------|----------|---------|
| Phase 2 | Weeks 3-6 | Storage (NVMe latency/QD), Network (TCP retrans), Thermal collectors |
| Phase 3 | Weeks 7-10 | GPU (fence timeout, IOMMU), Memory (DMA, ECC), HAL integration |
| Phase 4 | Weeks 11-12 | CLI mode, Grafana dashboards, deployment automation, perf benchmarks |
| Phase 5 | Future | libbpf CO-RE migration, ML-based correlation, CXL memory support |

---

## 10. References

- [eBPF HW Diagnostics Study](../case-studies/study-ai-storage-server-hw-diagnostics.md)
- [Development Plan](../case-studies/dev-plan-hw-diagnostics.md)
- [Test Plan](../case-studies/test-plan-hw-diagnostics.md)
- [Correlator Design](../case-studies/correlator-design.md)
- [BCC Reference](https://github.com/iovisor/bcc)
- [Linux Kernel Tracepoints](https://docs.kernel.org/trace/tracepoints.html)
