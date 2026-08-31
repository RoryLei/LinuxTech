"""eBPF Hardware Diagnostics — command-line interface.

Usage:
    diag check [--pcie] [--storage] [--thermal] [--memory] [--network] [--all]
               [--json] [--fail-on {warning,critical}]
    diag caps  [--json]
    diag config [--config PATH] [--validate] [--json]
    diag monitor [--config PATH] [--log-level LEVEL]

`check` performs a one-shot snapshot from sysfs/procfs and needs no root or
eBPF. `monitor` launches the live agent (which does require root + BCC).
"""
import argparse
import json
import os
import sys

# Make the project root importable whether run as `python -m cli.main`,
# via the installed `diag` entry point, or from the standalone bundle.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cli import scanners
from cli import output


# Exit codes: 0 healthy, 1 warnings, 2 critical, 3 usage/other error.
EXIT_OK = 0
EXIT_WARNING = 1
EXIT_CRITICAL = 2
EXIT_ERROR = 3


def _selected_subsystems(args) -> list:
    """Resolve which scanners to run from the per-subsystem flags."""
    flags = {
        "pcie": args.pcie,
        "storage": args.storage,
        "thermal": args.thermal,
        "memory": args.memory,
        "network": args.network,
    }
    if args.all or not any(flags.values()):
        # Default (no flags) runs everything.
        return list(scanners.SCANNERS.keys())
    return [name for name, on in flags.items() if on]


def cmd_check(args) -> int:
    """One-shot hardware health scan."""
    subsystems = _selected_subsystems(args)
    findings = scanners.run_scanners(subsystems)
    summary = output.summarize(findings)

    if args.json:
        print(output.format_findings_json(findings, summary))
    else:
        sys.stdout.write(output.format_findings_text(findings, sys.stdout))
        sys.stdout.write(output.format_summary_line(summary, sys.stdout))

    # Decide exit code based on findings and the --fail-on threshold.
    worst = summary["worst_severity"]
    if args.fail_on == "warning" and worst in ("warning", "critical"):
        return EXIT_WARNING if worst == "warning" else EXIT_CRITICAL
    if args.fail_on == "critical" and worst == "critical":
        return EXIT_CRITICAL
    return EXIT_OK


def cmd_inventory(args) -> int:
    """Discover hardware via the HAL and print an inventory."""
    import yaml
    from hal import build_registry

    if args.platform:
        try:
            with open(args.platform) as f:
                platform_cfg = yaml.safe_load(f) or {}
        except OSError as e:
            print(f"Error: cannot read platform profile: {e}", file=sys.stderr)
            return EXIT_ERROR
    else:
        # Default: sysfs backends for PCIe and NVMe.
        platform_cfg = {"hal": {
            "storage": {"backends": [{"type": "nvme"}]},
            "pcie": {"backends": [{"type": "linux_sysfs"}]},
        }}

    registry = build_registry(platform_cfg)
    registry.discover()

    if args.json:
        devices = []
        for d in registry.all_devices():
            entry = {
                "id": d.get_id(),
                "type": d.get_type(),
                "healthy": d.is_healthy(),
                "properties": d.get_properties(),
            }
            devices.append(entry)
        print(json.dumps({"summary": registry.summary(), "devices": devices}, indent=2))
        return EXIT_OK

    pname = platform_cfg.get("platform", {}).get("name", "default (sysfs)")
    print(f"Hardware Inventory  (platform: {pname})")
    print("-" * 50)
    summary = registry.summary()
    if not summary:
        print("  No devices discovered.")
        return EXIT_OK
    for dtype in sorted(summary):
        devices = registry.get_devices_by_type(dtype)
        print(f"\n  {dtype.upper()} ({len(devices)}):")
        for d in devices:
            status = "healthy" if d.is_healthy() else "UNHEALTHY"
            props = d.get_properties()
            label = props.get("model") or props.get("vendor") or ""
            print(f"    {d.get_id():<20} {status:<10} {label}")
    print(f"\n  Total: {registry.device_count} device(s) across "
          f"{registry.backend_count} backend(s)")
    return EXIT_OK


def cmd_caps(args) -> int:
    """Show detected kernel capabilities."""
    from core.capabilities import CapabilityDetector
    info = CapabilityDetector().detect()

    if args.json:
        print(json.dumps(info, indent=2))
        return EXIT_OK

    print("Kernel Capabilities")
    print("-" * 40)
    print(f"  Kernel version : {info['kernel_version']}")
    print(f"  Root / CAP_BPF : {'yes' if info['has_root'] else 'no'}")
    print(f"  BTF (CO-RE)    : {'yes' if info['has_btf'] else 'no'}")
    print(f"  Tracepoint path: {info['tracepoint_path'] or '(none)'}")
    print(f"  Tracepoints    : {len(info['available_tracepoints'])} available, "
          f"{len(info['missing_tracepoints'])} missing")
    if info["available_tracepoints"]:
        print("\n  Available:")
        for tp in info["available_tracepoints"]:
            print(f"    + {tp}")
    if info["missing_tracepoints"]:
        print("\n  Missing:")
        for tp in info["missing_tracepoints"]:
            print(f"    - {tp}")
    if not info["has_root"]:
        print("\n  Note: run with sudo to load eBPF probes (diag monitor).")
    return EXIT_OK


def cmd_config(args) -> int:
    """Show or validate the effective configuration."""
    from config.loader import load_config, validate_config, ConfigError
    config = load_config(args.config)

    if args.validate:
        try:
            validate_config(config)
        except ConfigError as e:
            print(f"Config INVALID: {e}", file=sys.stderr)
            return EXIT_ERROR
        print("Config OK")
        if not args.json:
            return EXIT_OK

    if args.json:
        print(json.dumps(config, indent=2))
    else:
        print(f"Effective configuration (source: {args.config})")
        print("-" * 40)
        _print_config_tree(config, indent=2)
    return EXIT_OK


def _print_config_tree(node, indent: int) -> None:
    """Pretty-print a nested config dict as an indented tree."""
    pad = " " * indent
    for key, val in node.items():
        if isinstance(val, dict):
            print(f"{pad}{key}:")
            _print_config_tree(val, indent + 2)
        else:
            print(f"{pad}{key}: {val}")


def cmd_monitor(args) -> int:
    """Launch the live eBPF monitoring agent (delegates to the daemon)."""
    from config.loader import load_config, validate_config
    import logging

    config = load_config(args.config)
    config = validate_config(config)

    log_level = args.log_level or config.get("agent", {}).get("log_level", "info")
    logging.basicConfig(
        level=getattr(logging, log_level.upper(), logging.INFO),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )

    if os.geteuid() != 0:
        print("Error: 'monitor' needs root to load eBPF probes. Re-run with sudo, "
              "or use 'diag check' for a one-shot snapshot without root.",
              file=sys.stderr)
        return EXIT_ERROR

    # Import lazily so `check`/`caps` never pull in the full agent stack.
    from agent_cmd.diagd.main import DiagnosticsAgent
    import signal

    agent = DiagnosticsAgent(config)

    def _handler(sig, frame):
        agent.stop()
        sys.exit(EXIT_OK)

    signal.signal(signal.SIGINT, _handler)
    signal.signal(signal.SIGTERM, _handler)

    agent.start()
    agent.run()
    return EXIT_OK


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="diag",
        description="eBPF Hardware Diagnostics — one-shot checks and live monitoring.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # check
    p_check = sub.add_parser("check", help="One-shot hardware health scan (no root needed)")
    p_check.add_argument("--pcie", action="store_true", help="Scan PCIe AER counters")
    p_check.add_argument("--storage", action="store_true", help="Scan NVMe controllers")
    p_check.add_argument("--thermal", action="store_true", help="Scan thermal zones")
    p_check.add_argument("--memory", action="store_true", help="Scan EDAC/ECC counters")
    p_check.add_argument("--network", action="store_true", help="Scan network interfaces")
    p_check.add_argument("--all", action="store_true", help="Scan all subsystems (default)")
    p_check.add_argument("--json", action="store_true", help="Emit JSON instead of text")
    p_check.add_argument("--fail-on", choices=["warning", "critical"], default=None,
                         help="Exit non-zero when a finding reaches this severity")
    p_check.set_defaults(func=cmd_check)

    # caps
    p_caps = sub.add_parser("caps", help="Show detected kernel capabilities")
    p_caps.add_argument("--json", action="store_true", help="Emit JSON instead of text")
    p_caps.set_defaults(func=cmd_caps)

    # inventory
    p_inv = sub.add_parser("inventory", help="Discover hardware via the HAL")
    p_inv.add_argument("--platform", default=None,
                       help="Path to a platform profile (config/platforms/*.yaml)")
    p_inv.add_argument("--json", action="store_true", help="Emit JSON instead of text")
    p_inv.set_defaults(func=cmd_inventory)

    # config
    p_config = sub.add_parser("config", help="Show or validate configuration")
    p_config.add_argument("--config", default="config/default.yaml", help="Path to config file")
    p_config.add_argument("--validate", action="store_true", help="Validate and report result")
    p_config.add_argument("--json", action="store_true", help="Emit JSON instead of text")
    p_config.set_defaults(func=cmd_config)

    # monitor
    p_monitor = sub.add_parser("monitor", help="Launch live eBPF monitoring agent (needs root)")
    p_monitor.add_argument("--config", default="config/default.yaml", help="Path to config file")
    p_monitor.add_argument("--log-level", default=None, help="Override log level")
    p_monitor.set_defaults(func=cmd_monitor)

    return parser


def main(argv=None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return args.func(args)
    except KeyboardInterrupt:
        return EXIT_OK
    except Exception as e:  # noqa: BLE001 — top-level guard for a clean exit code
        print(f"Error: {e}", file=sys.stderr)
        return EXIT_ERROR


if __name__ == "__main__":
    sys.exit(main())
