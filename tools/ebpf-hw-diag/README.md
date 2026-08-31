# eBPF Hardware Diagnostics Agent

Real-time hardware diagnostics for AI/Storage servers using eBPF.

## Quick Start

```bash
# Install
pip install -e ".[test]"

# One-shot health check (no root, no eBPF — reads sysfs/procfs)
python -m cli.main check              # scan all subsystems
python -m cli.main check --pcie       # scan only PCIe AER counters
python -m cli.main check --json       # machine-readable output

# Show detected kernel capabilities
python -m cli.main caps

# Show / validate effective config
python -m cli.main config --validate

# Live monitoring agent (requires root for eBPF)
sudo python -m cli.main monitor
# equivalently:
sudo python -m agent_cmd.diagd.main

# Run tests (no root needed)
pytest tests/unit/ -v
```

## CLI

The `diag` command (also `python -m cli.main`) provides:

| Command | Root? | Purpose |
|---------|-------|---------|
| `check` | no | One-shot snapshot from sysfs/procfs; per-subsystem flags `--pcie --storage --thermal --memory --network`; `--fail-on {warning,critical}` for CI/monitoring exit codes |
| `caps`  | no | Report kernel version, BTF, root/CAP_BPF, and available tracepoints |
| `inventory` | no | Discover hardware via the HAL; `--platform config/platforms/*.yaml` selects a profile |
| `config`| no | Show or `--validate` the effective merged configuration |
| `monitor`| yes | Launch the live eBPF agent (loads probes, exports metrics) |

## Hardware Abstraction Layer (HAL)

The HAL (`hal/`) decouples diagnostic logic from specific hardware so backends
can be swapped without changing collectors:

```
hal/
├── base.py            HardwareDevice / HardwareBackend ABCs + DeviceRegistry
├── factory.py         build_registry() maps platform config -> backends
├── storage/
│   ├── base.py        AbstractStorageDevice interface
│   └── nvme.py        NVMe backend (sysfs + optional nvme-cli enrichment)
└── pcie/
    ├── base.py        AbstractPCIeDevice interface
    └── sysfs.py       PCIe backend (/sys/bus/pci/devices, AER counters, link status)
```

Platform profiles under `config/platforms/` (`generic_x86`, `nvidia_dgx`,
`storage_jbof`) declare which backends to load per subsystem. Unknown or
disabled backends are skipped gracefully, so a profile can reference backends
that are not yet implemented (e.g. NVIDIA GPU, RDMA) without breaking discovery.

```bash
python -m cli.main inventory                                   # sysfs defaults
python -m cli.main inventory --platform config/platforms/storage_jbof.yaml
python -m cli.main inventory --json                            # machine-readable
```

Exit codes for `check`: `0` healthy, `1` warning (with `--fail-on warning`), `2` critical, `3` error.

## Architecture

```
probes/*.bpf.c → collectors/*.py → event_bus → exporters (prometheus/json/alerts)
                                       ↓
                                  correlator (cross-layer pattern matching)
```

## Metrics

Prometheus metrics exposed on `http://localhost:9101/metrics`
