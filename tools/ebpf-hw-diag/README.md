# eBPF Hardware Diagnostics Agent

Real-time hardware diagnostics for AI/Storage servers using eBPF.

## Quick Start

```bash
# Install
pip install -e ".[test]"

# Run (requires root for eBPF)
sudo python -m cmd.diagd.main

# One-shot check
sudo python -m cli.main check --pcie

# Run tests (no root needed)
pytest tests/unit/ -v
```

## Architecture

```
probes/*.bpf.c → collectors/*.py → event_bus → exporters (prometheus/json/alerts)
                                       ↓
                                  correlator (cross-layer pattern matching)
```

## Metrics

Prometheus metrics exposed on `http://localhost:9101/metrics`
