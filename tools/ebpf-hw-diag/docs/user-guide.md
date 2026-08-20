# eBPF Hardware Diagnostics Agent — User Guide

## Overview

`ebpf-hw-diag` is a real-time hardware diagnostics agent for Linux servers. It uses
eBPF to hook into kernel subsystems and monitor hardware health with near-zero overhead.

**Target Users:**
- SRE/Platform engineers managing AI/Storage server fleets
- Hardware validation engineers during bring-up
- Data center operations teams needing automated HW fault detection

---

## Installation

### Prerequisites

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Linux Kernel | 5.8+ | 6.1+ |
| Python | 3.10+ | 3.11+ |
| BCC (python3-bpfcc) | 0.28+ | Latest |
| Root / CAP_BPF | Required | Required |

### Install from Source

```bash
cd tools/ebpf-hw-diag

# Install Python dependencies
pip install -e ".[test]"

# Install BCC (system package)
# Ubuntu/Debian:
sudo apt install python3-bpfcc bpfcc-tools

# RHEL/Fedora:
sudo dnf install python3-bcc bcc-tools
```

### Verify Installation

```bash
# Run unit tests (no root needed)
python3 -m pytest tests/unit/ -v
# Expected: 34 passed

# Check capabilities (root needed for full detection)
sudo python3 -c "
import sys; sys.path.insert(0,'.')
from core.capabilities import CapabilityDetector
caps = CapabilityDetector().detect()
print(f'Kernel: {caps[\"kernel_version\"]}')
print(f'BTF: {caps[\"has_btf\"]}')
print(f'Root: {caps[\"has_root\"]}')
print(f'Tracepoints: {len(caps[\"available_tracepoints\"])}')
"
```

---

## Quick Start

### Start the Agent

```bash
# Default configuration (monitors PCIe AER + thermal)
sudo python3 -m agent_cmd.diagd.main

# With custom config
sudo python3 -m agent_cmd.diagd.main --config config/default.yaml

# Verbose logging
sudo python3 -m agent_cmd.diagd.main --log-level debug
```

### Expected Output

```
2026-08-20T10:00:00 [INFO] diagd: ============================================================
2026-08-20T10:00:00 [INFO] diagd:   eBPF Hardware Diagnostics Agent
2026-08-20T10:00:00 [INFO] diagd: ============================================================
2026-08-20T10:00:00 [INFO] diagd: Kernel: 6.8.0-41-generic
2026-08-20T10:00:00 [INFO] diagd: BTF: available
2026-08-20T10:00:00 [INFO] diagd: Tracepoints: 8 available
2026-08-20T10:00:00 [INFO] diagd: PCIeCollector: started (filter=all)
2026-08-20T10:00:00 [INFO] diagd: PrometheusExporter: metrics on :9101/metrics
2026-08-20T10:00:00 [INFO] diagd: Health endpoint listening on :9102/healthz
2026-08-20T10:00:00 [INFO] diagd: Agent started: 1 collectors active
2026-08-20T10:00:00 [INFO] diagd: Waiting for hardware events... (Ctrl+C to stop)
```

### Check Metrics

```bash
# Prometheus metrics
curl -s http://localhost:9101/metrics | grep diagd

# Health check
curl -s http://localhost:9102/healthz | python3 -m json.tool
# {
#     "status": "healthy",
#     "uptime_seconds": 120,
#     "probes_loaded": 1,
#     "probes_failed": 0,
#     "events_dispatched": 42,
#     "events_dropped": 0
# }
```

### Stop the Agent

Press `Ctrl+C` or send `SIGTERM`:
```bash
sudo kill -TERM $(pgrep -f "agent_cmd.diagd.main")
```

---

## Configuration

### Config File Location

Default: `config/default.yaml`

Override with `--config`:
```bash
sudo python3 -m agent_cmd.diagd.main --config /etc/ebpf-hw-diag/config.yaml
```

### Configuration Reference

```yaml
# === Agent Settings ===
agent:
  log_level: info              # debug, info, warning, error, critical
  poll_interval_ms: 1000       # how often to poll perf buffers (ms)

# === Collectors (enable/disable per subsystem) ===
collectors:
  pcie:
    enabled: true
    severity_filter: all       # all | corrected | fatal | nonfatal
  storage:
    enabled: true
    latency_threshold_us: 5000 # alert if P99 > this value
    devices: ["nvme*"]         # glob pattern for devices to monitor
  thermal:
    enabled: true
    throttle_alert: true
  network:
    enabled: false             # enable for AI training clusters
    retransmit_alert_rate: 100 # alerts/sec threshold
  gpu:
    enabled: false             # enable on GPU servers
    fence_timeout_ms: 5000
  memory:
    enabled: true
    mce_alert: true

# === Exporters (output destinations) ===
exporters:
  prometheus:
    enabled: true
    port: 9101
    path: /metrics
  json_log:
    enabled: true
    output: /var/log/ebpf-hw-diag/events.jsonl
    rotate_mb: 100             # rotate when file exceeds this size
  alerter:
    enabled: false
    rules_file: config/alert_rules.yaml
    backends: []               # webhook URLs, syslog, etc.

# === Correlator (cross-layer pattern matching) ===
correlator:
  enabled: true
  window_sec: 300              # sliding window size (seconds)
  max_window_events: 50000     # memory cap on event buffer
  cooldown_sec: 300            # don't re-fire same rule within this time

# === Rate Limiting ===
rate_limiting:
  global_max_events_per_sec: 100000
  per_collector:
    pcie: 10000
    storage: 50000
    thermal: 1000
    network: 50000
    memory: 5000

# === Health Endpoint ===
health:
  enabled: true
  port: 9102
```

### Environment Variable Overrides

| Variable | Overrides |
|----------|-----------|
| `DIAG_LOG_LEVEL` | `agent.log_level` |
| `DIAG_PROMETHEUS_PORT` | `exporters.prometheus.port` |
| `DIAG_HEALTH_PORT` | `health.port` |
| `DIAG_JSON_LOG_OUTPUT` | `exporters.json_log.output` |

---

## Monitoring & Integration

### Prometheus + Grafana

```yaml
# prometheus.yml scrape config:
scrape_configs:
  - job_name: 'ebpf-hw-diag'
    static_configs:
      - targets: ['server1:9101', 'server2:9101']
    scrape_interval: 15s
```

**Available Metrics:**
| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `diagd_pcie_aer_errors_total` | Counter | device, severity | PCIe AER errors |
| `diagd_nvme_io_latency_us` | Histogram | device | NVMe I/O latency |
| `diagd_thermal_trip_events_total` | Counter | zone, trip_type | Thermal events |
| `diagd_events_processed_total` | Counter | source_probe | Total events by probe |

### Kubernetes Deployment

```yaml
# Pod spec with health probes:
containers:
  - name: ebpf-hw-diag
    image: your-registry/ebpf-hw-diag:latest
    securityContext:
      privileged: true     # required for eBPF
    ports:
      - containerPort: 9101  # prometheus
      - containerPort: 9102  # health
    livenessProbe:
      httpGet:
        path: /healthz
        port: 9102
      initialDelaySeconds: 10
      periodSeconds: 30
    readinessProbe:
      httpGet:
        path: /healthz
        port: 9102
```

### systemd Service

```ini
# /etc/systemd/system/ebpf-hw-diag.service
[Unit]
Description=eBPF Hardware Diagnostics Agent
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 -m agent_cmd.diagd.main --config /etc/ebpf-hw-diag/config.yaml
WorkingDirectory=/opt/ebpf-hw-diag
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now ebpf-hw-diag
sudo journalctl -u ebpf-hw-diag -f
```

---

## JSON Log Format

Each event is written as a single JSON line to the configured output file:

```json
{
  "@timestamp": "2026-08-20T10:30:15.123Z",
  "event_type": "PCIeAEREvent",
  "source_probe": "aer_monitor",
  "device_id": "0000:03:00.0",
  "severity": "info",
  "bdf": "0000:03:00.0",
  "status_raw": 64,
  "severity_code": 2,
  "errors": ["Bad TLP"],
  "tlp_header": "04000001 00000100 00000000 00000000"
}
```

### Correlated Event Example

```json
{
  "@timestamp": "2026-08-20T10:30:45.456Z",
  "event_type": "CorrelatedEvent",
  "source_probe": "correlator",
  "device_id": "0000:03:00.0",
  "severity": "critical",
  "rule_name": "nvme_pcie_degradation",
  "root_cause": "PCIe signal degradation causing NVMe performance drop",
  "recommended_action": "Replace PCIe cable/riser; reseat NVMe device",
  "confidence": 0.87,
  "correlated_devices": ["0000:03:00.0"]
}
```

---

## Troubleshooting

### Agent Won't Start

| Error | Cause | Fix |
|-------|-------|-----|
| `Root privileges required` | Not running as root | `sudo python3 -m agent_cmd.diagd.main` |
| `BCC not installed` | Missing python3-bpfcc | `sudo apt install python3-bpfcc` |
| `tracepoint_not_found: ras:aer_event` | Kernel lacks PCIe AER support | Check `CONFIG_PCIEAER=y` in kernel config |
| `Failed to load probe` | Kernel too old or BTF missing | Upgrade to kernel 5.8+; install `linux-headers` |

### No Events Appearing

1. **Check if hardware supports AER:**
   ```bash
   sudo lspci -vvv | grep "Advanced Error Reporting"
   ```
2. **Check if firmware grants AER to OS:**
   ```bash
   dmesg | grep -i "AER\|_OSC"
   ```
3. **This machine is a VM:** VMs typically have no real PCIe AER hardware.

### High CPU Usage

- Reduce `poll_interval_ms` (increase from 1000 to 2000)
- Lower `rate_limiting.global_max_events_per_sec`
- Disable unused collectors in config

---

## Verifying Error Detection (Is Hardware Healthy?)

Once the agent is running, use these methods to check if any hardware errors have been detected:

### Quick Status Check

```bash
# One-liner: any problems detected?
curl -s http://localhost:9102/healthz | python3 -m json.tool
# If events_dispatched > 0 → hardware events have been captured
```

### Method 1: Prometheus Metrics (Real-time Counters)

```bash
# Check PCIe AER errors
curl -s http://localhost:9101/metrics | grep "diagd_pcie_aer_errors_total"
# diagd_pcie_aer_errors_total{device="0000:03:00.0",severity="Corrected"} 5
# diagd_pcie_aer_errors_total{device="0000:81:00.0",severity="Fatal"} 1

# Check total events by probe
curl -s http://localhost:9101/metrics | grep "diagd_events_processed_total"

# If value is 0 → no errors detected (hardware healthy)
# If value > 0 → errors detected (check JSON log for details)
```

### Method 2: JSON Log (Full Event History)

```bash
# View recent events
tail -10 /var/log/ebpf-hw-diag/events.jsonl

# Filter critical events only
grep '"severity": "critical"' /var/log/ebpf-hw-diag/events.jsonl

# Filter correlated events (root cause analysis)
grep '"event_type": "CorrelatedEvent"' /var/log/ebpf-hw-diag/events.jsonl

# Count errors by device
cat /var/log/ebpf-hw-diag/events.jsonl | \
  python3 -c "
import json, sys, collections
c = collections.Counter()
for line in sys.stdin:
    e = json.loads(line)
    c[f\"{e.get('device_id','')} [{e.get('severity','')}]\"] += 1
for k, v in c.most_common(10):
    print(f'  {v:5d}  {k}')
"
```

### Method 3: journalctl (Agent Warnings & Correlations)

```bash
# Correlation events and alerts are logged to systemd journal
sudo journalctl -u ebpf-hw-diag --since "1 hour ago" | grep -E "ALERT|CORRELATION|WARNING"

# Example output:
# CORRELATION [nvme_pcie_degradation]: PCIe signal degradation causing NVMe performance drop
# ALERT [critical] pcie_fatal_error: PCIe Fatal error on device 0000:81:00.0
```

### Interpretation Guide

| events_dispatched | Meaning | Action |
|-------------------|---------|--------|
| 0 | No hardware errors detected | Hardware healthy ✅ |
| Low (<10/hour) | Occasional correctable errors | Monitor trend, likely normal |
| Medium (10-100/hour) | Degradation in progress | Investigate device, plan maintenance |
| High (>100/hour) | Active hardware failure | Immediate action (see JSON log for device) |
| CorrelatedEvent in log | Cross-layer root cause identified | Follow `recommended_action` field |

---

## Security Considerations

- Agent requires `root` or `CAP_BPF + CAP_PERFMON` capabilities
- eBPF programs are verified by the kernel (safe, cannot crash)
- Prometheus endpoint has no authentication (bind to localhost or use firewall)
- JSON log may contain device serial numbers (treat as sensitive in some environments)
