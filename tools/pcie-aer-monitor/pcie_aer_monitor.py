#!/usr/bin/env python3
"""
pcie_aer_monitor.py — eBPF-based PCIe AER Error Monitor

Uses the kernel tracepoint 'ras:aer_event' to capture PCIe Advanced Error
Reporting events in real-time with zero polling overhead.

Requirements:
  - Linux kernel >= 4.10 with CONFIG_PCIEAER enabled
  - BCC (python3-bpfcc) installed
  - Root privileges

Usage:
  sudo python3 pcie_aer_monitor.py [options]

Options:
  --json          Output in JSON format (for log aggregation)
  --severity SEV  Filter by severity: corrected, fatal, nonfatal, all (default: all)
  --count N       Exit after N events (default: unlimited)
  --summary       Print summary statistics on exit (Ctrl+C)

Author: LinuxTech Project
"""

import argparse
import json
import signal
import sys
from datetime import datetime

try:
    from bcc import BPF
except ImportError:
    print("ERROR: BCC not installed. Install with:", file=sys.stderr)
    print("  Ubuntu/Debian: sudo apt install python3-bpfcc bpfcc-tools", file=sys.stderr)
    print("  RHEL/Fedora:   sudo dnf install python3-bcc bcc-tools", file=sys.stderr)
    sys.exit(1)

# ============================================================================
# eBPF Program (kernel space)
# ============================================================================
BPF_PROGRAM = r"""
#include <uapi/linux/ptrace.h>

// AER severity levels (from kernel include/linux/aer.h)
#define AER_CORRECTABLE 2
#define AER_FATAL       1
#define AER_NONFATAL    0

// Data structure passed from kernel to userspace
struct aer_event_t {
    char   dev_name[64];
    u32    status;
    u8     severity;
    u8     tlp_header_valid;
    u32    tlp_header[4];
    u64    timestamp_ns;
};

BPF_PERF_OUTPUT(aer_events);

// Optional severity filter (0xFF = all)
BPF_ARRAY(severity_filter, u8, 1);

TRACEPOINT_PROBE(ras, aer_event) {
    struct aer_event_t evt = {};

    // Check severity filter
    int key = 0;
    u8 *filter = severity_filter.lookup(&key);
    if (filter && *filter != 0xFF) {
        if (args->severity != *filter)
            return 0;
    }

    // Fill event data
    bpf_probe_read_str(&evt.dev_name, sizeof(evt.dev_name), args->dev_name);
    evt.status = args->status;
    evt.severity = args->severity;
    evt.tlp_header_valid = args->tlp_header_valid;

    if (args->tlp_header_valid) {
        evt.tlp_header[0] = args->tlp_header[0];
        evt.tlp_header[1] = args->tlp_header[1];
        evt.tlp_header[2] = args->tlp_header[2];
        evt.tlp_header[3] = args->tlp_header[3];
    }

    evt.timestamp_ns = bpf_ktime_get_ns();

    aer_events.perf_submit(args, &evt, sizeof(evt));
    return 0;
}
"""

# ============================================================================
# Error Code Definitions (from kernel pci_regs.h)
# ============================================================================
CORRECTABLE_ERRORS = {
    0x00000001: "Receiver Error",
    0x00000040: "Bad TLP",
    0x00000080: "Bad DLLP",
    0x00000100: "RELAY_NUM Rollover",
    0x00001000: "Replay Timer Timeout",
    0x00002000: "Advisory Non-Fatal Error",
    0x00004000: "Corrected Internal Error",
    0x00008000: "Header Log Overflow",
}

UNCORRECTABLE_ERRORS = {
    0x00000001: "Undefined",
    0x00000010: "Data Link Protocol Error",
    0x00000020: "Surprise Down Error",
    0x00001000: "Poisoned TLP",
    0x00002000: "Flow Control Protocol Error",
    0x00004000: "Completion Timeout",
    0x00008000: "Completer Abort",
    0x00010000: "Unexpected Completion",
    0x00020000: "Receiver Overflow",
    0x00040000: "Malformed TLP",
    0x00080000: "ECRC Error",
    0x00100000: "Unsupported Request Error",
    0x00200000: "ACS Violation",
    0x00400000: "Uncorrectable Internal Error",
    0x00800000: "MC Blocked TLP",
    0x01000000: "AtomicOp Egress Blocked",
    0x02000000: "TLP Prefix Blocked Error",
}

SEVERITY_MAP = {
    0: "Uncorrected (Non-Fatal)",
    1: "Fatal",
    2: "Corrected",
}

SEVERITY_COLORS = {
    0: "\033[33m",  # Yellow
    1: "\033[31m",  # Red
    2: "\033[36m",  # Cyan
}
RESET_COLOR = "\033[0m"


def decode_status(status, severity):
    """Decode AER status bits into human-readable error names."""
    errors = []
    error_table = CORRECTABLE_ERRORS if severity == 2 else UNCORRECTABLE_ERRORS
    for bit, name in error_table.items():
        if status & bit:
            errors.append(name)
    return errors if errors else [f"Unknown (0x{status:08x})"]


def format_tlp_header(tlp_valid, tlp):
    """Format TLP header for display."""
    if not tlp_valid:
        return "N/A"
    return f"{tlp[0]:08x} {tlp[1]:08x} {tlp[2]:08x} {tlp[3]:08x}"


# ============================================================================
# Event Statistics
# ============================================================================
class Stats:
    def __init__(self):
        self.total = 0
        self.by_severity = {0: 0, 1: 0, 2: 0}
        self.by_device = {}
        self.by_error = {}

    def record(self, severity, device, errors):
        self.total += 1
        self.by_severity[severity] = self.by_severity.get(severity, 0) + 1
        self.by_device[device] = self.by_device.get(device, 0) + 1
        for err in errors:
            self.by_error[err] = self.by_error.get(err, 0) + 1

    def print_summary(self):
        if self.total == 0:
            print("\n--- No PCIe AER events captured ---")
            return

        print(f"\n{'='*60}")
        print(f"  PCIe AER Event Summary (total: {self.total})")
        print(f"{'='*60}")

        print("\n  By Severity:")
        for sev, count in sorted(self.by_severity.items()):
            if count > 0:
                print(f"    {SEVERITY_MAP.get(sev, '?'):30s} : {count}")

        print("\n  By Device:")
        for dev, count in sorted(self.by_device.items(), key=lambda x: -x[1]):
            print(f"    {dev:30s} : {count}")

        print("\n  By Error Type:")
        for err, count in sorted(self.by_error.items(), key=lambda x: -x[1]):
            print(f"    {err:30s} : {count}")

        print(f"{'='*60}\n")


# ============================================================================
# Main
# ============================================================================
def main():
    parser = argparse.ArgumentParser(
        description="eBPF-based PCIe AER Error Monitor"
    )
    parser.add_argument("--json", action="store_true",
                        help="Output events in JSON format")
    parser.add_argument("--severity", choices=["all", "corrected", "fatal", "nonfatal"],
                        default="all", help="Filter by severity (default: all)")
    parser.add_argument("--count", type=int, default=0,
                        help="Exit after N events (0 = unlimited)")
    parser.add_argument("--summary", action="store_true",
                        help="Print summary statistics on exit")
    args = parser.parse_args()

    # Map severity arg to kernel value
    severity_value = {
        "all": 0xFF,
        "corrected": 2,
        "fatal": 1,
        "nonfatal": 0,
    }[args.severity]

    # Load eBPF program
    try:
        b = BPF(text=BPF_PROGRAM)
    except Exception as e:
        print(f"ERROR: Failed to load eBPF program: {e}", file=sys.stderr)
        print("\nPossible causes:", file=sys.stderr)
        print("  - Kernel does not support ras:aer_event tracepoint", file=sys.stderr)
        print("  - CONFIG_PCIEAER not enabled in kernel", file=sys.stderr)
        print("  - Insufficient privileges (need root)", file=sys.stderr)
        print("\nCheck with: cat /sys/kernel/debug/tracing/events/ras/aer_event/format",
              file=sys.stderr)
        sys.exit(1)

    # Set severity filter
    filter_table = b["severity_filter"]
    filter_table[0] = filter_table.Leaf(severity_value)

    stats = Stats()
    event_count = [0]

    # Event handler callback
    def handle_event(cpu, data, size):
        evt = b["aer_events"].event(data)
        device = evt.dev_name.decode("utf-8", errors="replace")
        severity = evt.severity
        status = evt.status
        timestamp = datetime.now().isoformat(timespec="milliseconds")

        errors = decode_status(status, severity)
        tlp_str = format_tlp_header(evt.tlp_header_valid,
                                    [evt.tlp_header[i] for i in range(4)])

        if args.summary:
            stats.record(severity, device, errors)

        if args.json:
            output = {
                "timestamp": timestamp,
                "device": device,
                "severity": SEVERITY_MAP.get(severity, "Unknown"),
                "status_hex": f"0x{status:08x}",
                "errors": errors,
                "tlp_header_valid": bool(evt.tlp_header_valid),
                "tlp_header": tlp_str if evt.tlp_header_valid else None,
            }
            print(json.dumps(output))
        else:
            color = SEVERITY_COLORS.get(severity, "")
            sev_str = SEVERITY_MAP.get(severity, "Unknown")
            err_str = ", ".join(errors)

            print(f"{color}[{timestamp}] {device} | {sev_str} | "
                  f"status=0x{status:08x}{RESET_COLOR}")
            print(f"  Errors: {err_str}")
            if evt.tlp_header_valid:
                print(f"  TLP Header: {tlp_str}")
            print()

        sys.stdout.flush()
        event_count[0] += 1
        if args.count > 0 and event_count[0] >= args.count:
            sys.exit(0)

    # Register event handler
    b["aer_events"].open_perf_buffer(handle_event)

    # Print header
    if not args.json:
        print("=" * 60)
        print("  🔬 PCIe AER Error Monitor (eBPF)")
        print("=" * 60)
        print(f"  Filter:  severity={args.severity}")
        print(f"  Format:  {'JSON' if args.json else 'Human-readable'}")
        print(f"  Limit:   {'unlimited' if args.count == 0 else args.count}")
        print("=" * 60)
        print("  Waiting for PCIe AER events... (Ctrl+C to exit)\n")

    # Handle graceful exit
    def signal_handler(sig, frame):
        if args.summary:
            stats.print_summary()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Main event loop
    while True:
        try:
            b.perf_buffer_poll(timeout=1000)
        except KeyboardInterrupt:
            if args.summary:
                stats.print_summary()
            break


if __name__ == "__main__":
    main()
