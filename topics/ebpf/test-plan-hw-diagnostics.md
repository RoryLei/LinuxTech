# Unit Test Plan: eBPF Server HW Diagnostics Agent

## Test Strategy

### Testing Layers

```
┌───────────────────────────────────────────────────┐
│ Layer 4: End-to-End (E2E) Tests                   │
│   Full pipeline: probe → collector → exporter     │
│   Requires: root + real/emulated hardware         │
├───────────────────────────────────────────────────┤
│ Layer 3: Integration Tests                        │
│   eBPF probe loading + event delivery             │
│   Requires: root + kernel >= 5.8                  │
├───────────────────────────────────────────────────┤
│ Layer 2: Component Tests                          │
│   Collector logic, exporter output, config        │
│   Requires: no root, mock events                  │
├───────────────────────────────────────────────────┤
│ Layer 1: Unit Tests                               │
│   Pure functions: decoders, formatters, parsers   │
│   Requires: nothing special                       │
└───────────────────────────────────────────────────┘
```

### Test Matrix

| Test Type | Count | Root? | CI-able? | Run Time |
|-----------|-------|-------|----------|----------|
| Unit | ~60 | No | Yes | < 5s |
| Component | ~30 | No | Yes | < 10s |
| Integration | ~15 | Yes | VM only | < 60s |
| E2E | ~5 | Yes | Manual/VM | < 120s |

---

## Unit Tests (Layer 1)

### test_decoders.py — Event Data Decoding

```python
"""Tests for raw event decoding logic."""
import pytest
from collectors.pcie import decode_aer_status, CORRECTABLE_ERRORS, UNCORRECTABLE_ERRORS


class TestAERStatusDecoder:
    """Decode PCIe AER status register bits."""

    def test_single_correctable_error(self):
        """0x00000040 = Bad TLP (bit 6)."""
        errors = decode_aer_status(0x00000040, severity=2)
        assert errors == ["Bad TLP"]

    def test_multiple_correctable_errors(self):
        """Multiple bits set simultaneously."""
        status = 0x00000040 | 0x00000080  # Bad TLP + Bad DLLP
        errors = decode_aer_status(status, severity=2)
        assert "Bad TLP" in errors
        assert "Bad DLLP" in errors

    def test_uncorrectable_fatal(self):
        """0x00040000 = Malformed TLP."""
        errors = decode_aer_status(0x00040000, severity=1)
        assert errors == ["Malformed TLP"]

    def test_unknown_status_bits(self):
        """Unknown bits return hex representation."""
        errors = decode_aer_status(0x80000000, severity=0)
        assert "Unknown (0x80000000)" in errors

    def test_zero_status(self):
        """Zero status returns unknown."""
        errors = decode_aer_status(0x00000000, severity=2)
        assert len(errors) == 1
        assert "Unknown" in errors[0]


class TestNVMeLatencyDecoder:
    """Decode NVMe latency events."""

    def test_latency_calculation(self):
        """Verify latency = complete_ns - issue_ns."""
        from collectors.storage import calculate_latency_us
        assert calculate_latency_us(1000000, 1050000) == 50  # 50 μs

    def test_histogram_bucket_assignment(self):
        """Verify log2 histogram bucketing."""
        from collectors.storage import latency_to_bucket
        assert latency_to_bucket(1) == 0       # 0-1 μs
        assert latency_to_bucket(4) == 2       # 4-7 μs
        assert latency_to_bucket(100) == 6     # 64-127 μs
        assert latency_to_bucket(5000) == 12   # 4096-8191 μs

    def test_percentile_calculation(self):
        """P50, P99, P999 from histogram."""
        from collectors.storage import calculate_percentiles
        # 1000 samples: 900 at 10μs, 90 at 100μs, 10 at 1000μs
        hist = {10: 900, 100: 90, 1000: 10}
        p50, p99, p999 = calculate_percentiles(hist)
        assert p50 == 10
        assert p99 == 100
        assert p999 == 1000
```

### test_thermal_decoder.py

```python
"""Tests for thermal event decoding."""
import pytest
from collectors.thermal import ThermalEvent, decode_thermal_trip


class TestThermalDecoder:
    def test_trip_type_mapping(self):
        """Map kernel trip type integers to names."""
        assert decode_thermal_trip(0) == "critical"
        assert decode_thermal_trip(1) == "hot"
        assert decode_thermal_trip(2) == "passive"
        assert decode_thermal_trip(3) == "active"

    def test_temperature_conversion(self):
        """Kernel reports millidegrees; convert to degrees."""
        from collectors.thermal import millideg_to_celsius
        assert millideg_to_celsius(85000) == 85.0
        assert millideg_to_celsius(42500) == 42.5

    def test_throttle_duration_calculation(self):
        """Track throttle start/end for duration metric."""
        from collectors.thermal import ThrottleTracker
        tracker = ThrottleTracker()
        tracker.start("zone0", ts_ns=1000000000)
        duration = tracker.end("zone0", ts_ns=3000000000)
        assert duration == 2.0  # 2 seconds
```

### test_network_decoder.py

```python
"""Tests for network event decoding."""
import pytest
from collectors.network import (
    decode_tcp_retransmit,
    format_ip_address,
    RetransmitEvent,
)


class TestNetworkDecoder:
    def test_ipv4_format(self):
        """Convert 32-bit integer to dotted notation."""
        assert format_ip_address(0x0100007F, family=2) == "127.0.0.1"
        assert format_ip_address(0x0101A8C0, family=2) == "192.168.1.1"

    def test_retransmit_event_creation(self):
        """Create RetransmitEvent from raw data."""
        event = RetransmitEvent(
            src_addr="10.0.0.1",
            dst_addr="10.0.0.2",
            src_port=45678,
            dst_port=4420,
            state=1,  # ESTABLISHED
            timestamp_ns=1000000000,
        )
        assert event.dst_port == 4420
        assert event.is_nccl_port()  # 4420 = typical NCCL port

    def test_rate_calculation(self):
        """Calculate retransmits per second."""
        from collectors.network import RateCounter
        counter = RateCounter(window_sec=60)
        for i in range(100):
            counter.record(ts_ns=i * 1_000_000_000)  # 1 per second
        assert counter.rate() == pytest.approx(100 / 60, rel=0.1)
```

### test_exporters.py

```python
"""Tests for output exporters."""
import pytest
import json
from unittest.mock import patch, MagicMock
from exporters.prometheus import PrometheusExporter
from exporters.json_log import JsonLogExporter
from exporters.alerter import AlertEngine


class TestPrometheusExporter:
    def test_counter_increment(self):
        """AER error counter increments correctly."""
        exporter = PrometheusExporter(port=0)  # port=0 = no HTTP server
        exporter.record_aer_event(device="0000:81:00.0", severity="Fatal")
        exporter.record_aer_event(device="0000:81:00.0", severity="Fatal")
        value = exporter.get_metric_value(
            "pcie_aer_errors_total",
            labels={"device": "0000:81:00.0", "severity": "Fatal"}
        )
        assert value == 2

    def test_histogram_observation(self):
        """NVMe latency histogram records observations."""
        exporter = PrometheusExporter(port=0)
        exporter.record_nvme_latency(device="nvme0n1", latency_us=50)
        exporter.record_nvme_latency(device="nvme0n1", latency_us=150)
        count = exporter.get_histogram_count(
            "nvme_io_latency_us", labels={"device": "nvme0n1"}
        )
        assert count == 2

    def test_metric_labels(self):
        """Verify correct label propagation."""
        exporter = PrometheusExporter(port=0)
        exporter.record_thermal_event(zone="x86_pkg_temp", trip_type="critical")
        # Should have zone and trip_type labels
        assert exporter.has_metric(
            "thermal_trip_events_total",
            {"zone": "x86_pkg_temp", "trip_type": "critical"}
        )


class TestJsonLogExporter:
    def test_event_serialization(self, tmp_path):
        """Events are written as single-line JSON."""
        logfile = tmp_path / "events.jsonl"
        exporter = JsonLogExporter(output=str(logfile))
        exporter.write_event({
            "type": "pcie_aer",
            "device": "0000:03:00.0",
            "severity": "Corrected",
            "errors": ["Bad TLP"],
        })
        exporter.flush()
        line = logfile.read_text().strip()
        data = json.loads(line)
        assert data["type"] == "pcie_aer"
        assert "timestamp" in data  # auto-added

    def test_rotation(self, tmp_path):
        """Log rotates when exceeding max size."""
        logfile = tmp_path / "events.jsonl"
        exporter = JsonLogExporter(output=str(logfile), rotate_mb=0.001)
        # Write enough to exceed 1KB
        for i in range(100):
            exporter.write_event({"i": i, "data": "x" * 100})
        assert (tmp_path / "events.jsonl.1").exists()


class TestAlertEngine:
    def test_threshold_alert_fires(self):
        """Alert fires when condition met."""
        engine = AlertEngine(rules=[{
            "name": "test_alert",
            "condition": "value > 100",
            "severity": "warning",
        }])
        alerts = engine.evaluate({"value": 150})
        assert len(alerts) == 1
        assert alerts[0]["name"] == "test_alert"

    def test_threshold_no_alert(self):
        """No alert when condition not met."""
        engine = AlertEngine(rules=[{
            "name": "test_alert",
            "condition": "value > 100",
            "severity": "warning",
        }])
        alerts = engine.evaluate({"value": 50})
        assert len(alerts) == 0

    def test_duration_requirement(self):
        """Alert only fires after sustained duration."""
        engine = AlertEngine(rules=[{
            "name": "sustained_alert",
            "condition": "value > 100",
            "duration_sec": 60,
            "severity": "critical",
        }])
        # First evaluation: starts timer
        alerts = engine.evaluate({"value": 150}, ts=0)
        assert len(alerts) == 0
        # After 30s: not yet
        alerts = engine.evaluate({"value": 150}, ts=30)
        assert len(alerts) == 0
        # After 60s: fires
        alerts = engine.evaluate({"value": 150}, ts=60)
        assert len(alerts) == 1
```

### test_config.py

```python
"""Tests for configuration loading."""
import pytest
from config.loader import load_config, validate_config, ConfigError


class TestConfigLoader:
    def test_load_default(self, tmp_path):
        """Load default config file."""
        cfg_file = tmp_path / "config.yaml"
        cfg_file.write_text("""
agent:
  log_level: info
collectors:
  storage:
    enabled: true
  pcie:
    enabled: true
""")
        config = load_config(str(cfg_file))
        assert config["agent"]["log_level"] == "info"
        assert config["collectors"]["storage"]["enabled"] is True

    def test_env_override(self, tmp_path, monkeypatch):
        """Environment variables override config."""
        cfg_file = tmp_path / "config.yaml"
        cfg_file.write_text("agent:\n  log_level: info\n")
        monkeypatch.setenv("DIAG_LOG_LEVEL", "debug")
        config = load_config(str(cfg_file))
        assert config["agent"]["log_level"] == "debug"

    def test_invalid_config_raises(self, tmp_path):
        """Invalid config raises ConfigError."""
        cfg_file = tmp_path / "config.yaml"
        cfg_file.write_text("collectors:\n  storage:\n    enabled: banana\n")
        with pytest.raises(ConfigError):
            validate_config(load_config(str(cfg_file)))

    def test_missing_file(self):
        """Missing config file uses defaults."""
        config = load_config("/nonexistent/path.yaml")
        assert config["agent"]["log_level"] == "info"  # default
```

---

## Component Tests (Layer 2)

### test_collectors.py — Collector Logic

```python
"""Tests for collector event processing (no eBPF required)."""
import pytest
from unittest.mock import MagicMock
from collectors.base import BaseCollector
from collectors.storage import StorageCollector
from collectors.pcie import PCIeCollector


class TestBaseCollector:
    def test_abstract_methods(self):
        """BaseCollector cannot be instantiated directly."""
        with pytest.raises(TypeError):
            BaseCollector(config={})

    def test_collector_lifecycle(self):
        """Collectors support start/stop lifecycle."""
        collector = StorageCollector(config={"enabled": True, "devices": ["nvme*"]})
        # Mock the BPF object
        collector._bpf = MagicMock()
        collector.start()
        assert collector.is_running
        collector.stop()
        assert not collector.is_running


class TestStorageCollector:
    def test_event_processing(self):
        """Process a synthetic NVMe latency event."""
        collector = StorageCollector(config={"enabled": True, "devices": ["nvme*"]})
        mock_event = MagicMock()
        mock_event.device = b"nvme0n1"
        mock_event.latency_ns = 50000  # 50 μs

        result = collector.process_event(mock_event)
        assert result["device"] == "nvme0n1"
        assert result["latency_us"] == 50

    def test_device_filter(self):
        """Only matching devices are collected."""
        collector = StorageCollector(config={"enabled": True, "devices": ["nvme0*"]})
        assert collector.should_collect("nvme0n1") is True
        assert collector.should_collect("nvme1n1") is False
        assert collector.should_collect("sda") is False


class TestPCIeCollector:
    def test_severity_filter_all(self):
        """severity=all accepts all events."""
        collector = PCIeCollector(config={"enabled": True, "severity_filter": "all"})
        assert collector.should_collect_severity(0) is True  # non-fatal
        assert collector.should_collect_severity(1) is True  # fatal
        assert collector.should_collect_severity(2) is True  # corrected

    def test_severity_filter_fatal(self):
        """severity=fatal only accepts fatal."""
        collector = PCIeCollector(config={"enabled": True, "severity_filter": "fatal"})
        assert collector.should_collect_severity(0) is False
        assert collector.should_collect_severity(1) is True
        assert collector.should_collect_severity(2) is False

    def test_tlp_header_formatting(self):
        """TLP header formatted as hex string."""
        from collectors.pcie import format_tlp_header
        assert format_tlp_header(True, [0x04000001, 0x00000100, 0, 0]) == \
            "04000001 00000100 00000000 00000000"
        assert format_tlp_header(False, [0, 0, 0, 0]) == "N/A"
```

---

## Integration Tests (Layer 3)

### test_probe_loading.py — eBPF Program Loading

```python
"""Integration tests: verify eBPF probes load into the kernel.
Requires: root privileges, kernel >= 5.8, BCC installed.
"""
import pytest
import os

pytestmark = pytest.mark.skipif(
    os.geteuid() != 0, reason="Requires root"
)


class TestProbeLoading:
    def test_pcie_aer_probe_loads(self):
        """PCIe AER probe compiles and attaches."""
        from bcc import BPF
        from probes import PCIE_AER_PROGRAM
        b = BPF(text=PCIE_AER_PROGRAM)
        # If we get here without exception, probe loaded
        assert b is not None
        del b  # cleanup

    def test_block_latency_probe_loads(self):
        """Block I/O latency probe compiles and attaches."""
        from bcc import BPF
        from probes import BLOCK_LATENCY_PROGRAM
        b = BPF(text=BLOCK_LATENCY_PROGRAM)
        assert b is not None
        del b

    def test_thermal_probe_loads(self):
        """Thermal event probe compiles and attaches."""
        from bcc import BPF
        from probes import THERMAL_PROGRAM
        b = BPF(text=THERMAL_PROGRAM)
        assert b is not None
        del b

    def test_tracepoint_exists(self):
        """Verify required tracepoints exist in running kernel."""
        required = [
            "/sys/kernel/debug/tracing/events/block/block_rq_issue",
            "/sys/kernel/debug/tracing/events/block/block_rq_complete",
        ]
        for tp in required:
            assert os.path.exists(tp), f"Tracepoint missing: {tp}"

    def test_optional_tracepoint_ras_aer(self):
        """ras:aer_event may not exist on all kernels."""
        path = "/sys/kernel/debug/tracing/events/ras/aer_event"
        if not os.path.exists(path):
            pytest.skip("ras:aer_event not available (no PCIe AER support)")


class TestEventPipeline:
    def test_perf_buffer_receives_events(self):
        """Verify events flow from probe to userspace via perf buffer."""
        from bcc import BPF
        import ctypes
        received = []

        # Simple probe that fires on any syscall
        program = r"""
        BPF_PERF_OUTPUT(test_events);
        struct event_t { u32 pid; };
        TRACEPOINT_PROBE(raw_syscalls, sys_enter) {
            struct event_t evt = { .pid = bpf_get_current_pid_tgid() >> 32 };
            test_events.perf_submit(args, &evt, sizeof(evt));
            return 0;
        }
        """
        b = BPF(text=program)

        def handle(cpu, data, size):
            received.append(True)

        b["test_events"].open_perf_buffer(handle)
        # Poll for 100ms — should get at least 1 event
        b.perf_buffer_poll(timeout=100)
        assert len(received) > 0
        del b
```

---

## E2E Tests (Layer 4)

### test_full_agent.py

```python
"""End-to-end tests: start agent, generate events, verify output.
Requires: root, real hardware or event injection.
"""
import pytest
import subprocess
import time
import json
import requests
import os

pytestmark = pytest.mark.skipif(
    os.geteuid() != 0, reason="Requires root"
)


class TestFullAgent:
    @pytest.fixture(autouse=True)
    def start_agent(self, tmp_path):
        """Start the diagnostics agent as subprocess."""
        self.log_file = tmp_path / "events.jsonl"
        self.proc = subprocess.Popen(
            ["python3", "cmd/diagd/main.py",
             "--config", "config/test.yaml",
             "--log-output", str(self.log_file)],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        )
        time.sleep(2)  # wait for startup
        yield
        self.proc.terminate()
        self.proc.wait(timeout=5)

    def test_agent_starts_cleanly(self):
        """Agent process is running."""
        assert self.proc.poll() is None  # not exited

    def test_prometheus_endpoint(self):
        """Prometheus /metrics endpoint responds."""
        resp = requests.get("http://localhost:9101/metrics", timeout=5)
        assert resp.status_code == 200
        assert "pcie_aer_errors_total" in resp.text
        assert "nvme_io_latency_us" in resp.text

    def test_block_io_generates_events(self):
        """Generate I/O and verify latency events appear."""
        # Trigger some I/O
        subprocess.run(["dd", "if=/dev/zero", "of=/dev/null",
                       "bs=4k", "count=100"], check=True)
        time.sleep(1)
        # Check metrics
        resp = requests.get("http://localhost:9101/metrics")
        assert "nvme_io_latency_us_count" in resp.text or \
               "block_io_latency_us_count" in resp.text

    def test_graceful_shutdown(self):
        """Agent cleans up eBPF resources on SIGTERM."""
        self.proc.terminate()
        exit_code = self.proc.wait(timeout=10)
        assert exit_code == 0
```

---

## Mock Infrastructure

### mock_events.py

```python
"""Generate synthetic eBPF events for testing without hardware."""
import ctypes
import struct


class MockAEREvent:
    """Simulate a PCIe AER event."""
    def __init__(self, device="0000:03:00.0", status=0x00000040,
                 severity=2, tlp_valid=True):
        self.dev_name = device.encode()
        self.status = status
        self.severity = severity
        self.tlp_header_valid = 1 if tlp_valid else 0
        self.tlp_header = [0x04000001, 0x00000100, 0, 0]
        self.timestamp_ns = 1000000000


class MockNVMeEvent:
    """Simulate an NVMe I/O completion event."""
    def __init__(self, device="nvme0n1", latency_us=50, opcode=0x02):
        self.device = device.encode()
        self.latency_ns = latency_us * 1000
        self.opcode = opcode
        self.nsid = 1
        self.qid = 1
        self.cmdid = 42


class MockThermalEvent:
    """Simulate a thermal trip event."""
    def __init__(self, zone="x86_pkg_temp", temp_mdeg=85000, trip_type=0):
        self.thermal_zone = zone.encode()
        self.temp = temp_mdeg
        self.trip = trip_type


def generate_aer_burst(count=100, device="0000:81:00.0"):
    """Generate a burst of AER events (simulates failing link)."""
    events = []
    for i in range(count):
        events.append(MockAEREvent(
            device=device,
            status=0x00000040,  # Bad TLP
            severity=2,         # Corrected
        ))
    return events
```

---

## CI/CD Configuration

### .github/workflows/test.yml

```yaml
name: Tests
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install -e ".[test]"
      - run: pytest tests/unit/ -v --tb=short

  component-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install -e ".[test]"
      - run: pytest tests/unit/ tests/component/ -v --tb=short

  integration-tests:
    runs-on: ubuntu-latest
    # Requires privileged mode for eBPF
    container:
      image: ubuntu:24.04
      options: --privileged
    steps:
      - uses: actions/checkout@v4
      - run: |
          apt-get update
          apt-get install -y python3-pip python3-bpfcc linux-headers-$(uname -r)
      - run: pip install -e ".[test]"
      - run: pytest tests/integration/ -v --tb=short
```

---

## Test Coverage Targets

| Module | Target Coverage | Priority |
|--------|----------------|----------|
| `collectors/pcie.py` | >= 90% | P0 |
| `collectors/storage.py` | >= 90% | P0 |
| `collectors/network.py` | >= 85% | P1 |
| `collectors/thermal.py` | >= 85% | P1 |
| `collectors/gpu.py` | >= 80% | P2 |
| `collectors/memory.py` | >= 80% | P2 |
| `exporters/prometheus.py` | >= 95% | P0 |
| `exporters/json_log.py` | >= 90% | P0 |
| `exporters/alerter.py` | >= 90% | P1 |
| `config/loader.py` | >= 95% | P0 |
| **Overall** | **>= 85%** | |

---

## Test Execution Commands

```bash
# Run all unit tests (fast, no root needed)
pytest tests/unit/ -v

# Run with coverage
pytest tests/unit/ --cov=collectors --cov=exporters --cov-report=html

# Run integration tests (requires root)
sudo pytest tests/integration/ -v

# Run specific test class
pytest tests/unit/test_decoders.py::TestAERStatusDecoder -v

# Run tests matching keyword
pytest -k "thermal" -v

# Run with verbose output on failure
pytest tests/ -v --tb=long -x  # stop on first failure
```
