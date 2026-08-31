"""Command-line interface for the eBPF Hardware Diagnostics Agent.

Provides one-shot diagnostic commands that work without loading eBPF probes
(reading directly from sysfs/procfs), plus wrappers to launch the live agent.

Subcommands:
    check    One-shot hardware health scan (sysfs/procfs based, no root needed)
    caps     Show detected kernel capabilities (tracepoints, BTF, permissions)
    config   Show or validate the effective configuration
    monitor  Launch the live eBPF monitoring agent (delegates to the daemon)
"""
