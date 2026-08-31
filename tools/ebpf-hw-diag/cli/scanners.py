"""Sysfs/procfs-based hardware scanners for one-shot diagnostics.

These scanners read hardware state directly from the kernel's sysfs and procfs
interfaces. Unlike the live collectors (which attach eBPF probes to capture
events as they happen), scanners take an instantaneous snapshot of accumulated
counters and current state. This lets `diag check` run without root privileges,
without BCC, and without loading any eBPF program.

Each scanner returns a list of Finding objects. A Finding maps cleanly onto the
severity model used elsewhere in the project (info / warning / critical).
"""
import glob
import os
import re
from dataclasses import dataclass, field
from typing import List, Optional


# ---------------------------------------------------------------------------
# Finding model
# ---------------------------------------------------------------------------

SEVERITY_ORDER = {"info": 0, "ok": 0, "warning": 1, "critical": 2}


@dataclass
class Finding:
    """A single diagnostic observation from a scanner."""

    subsystem: str                     # pcie, storage, thermal, memory, network
    device: str                        # device identifier (BDF, block name, zone...)
    severity: str = "info"             # ok, info, warning, critical
    summary: str = ""                  # short human-readable description
    detail: str = ""                   # optional extra context
    metrics: dict = field(default_factory=dict)  # numeric values for the finding

    def to_dict(self) -> dict:
        return {
            "subsystem": self.subsystem,
            "device": self.device,
            "severity": self.severity,
            "summary": self.summary,
            "detail": self.detail,
            "metrics": self.metrics,
        }


def _read(path: str) -> Optional[str]:
    """Read a sysfs/procfs file, returning stripped text or None on failure."""
    try:
        with open(path) as f:
            return f.read().strip()
    except (OSError, IOError):
        return None


def _read_int(path: str) -> Optional[int]:
    """Read a file and parse it as an integer (handles hex 0x prefixes)."""
    raw = _read(path)
    if raw is None:
        return None
    try:
        return int(raw, 0)
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# PCIe AER scanner
# ---------------------------------------------------------------------------

# The kernel exposes accumulated AER counters per device once the pcie_aer
# sysfs interface is enabled (CONFIG_PCIEAER). Files are one counter per line
# in "Name N" format under aer_dev_correctable / aer_dev_fatal / aer_dev_nonfatal.
_AER_FILES = {
    "correctable": ("aer_dev_correctable", "warning"),
    "nonfatal": ("aer_dev_nonfatal", "warning"),
    "fatal": ("aer_dev_fatal", "critical"),
}


def _parse_aer_counter_file(path: str) -> dict:
    """Parse an aer_dev_* file into {error_name: count}, skipping zero counts."""
    text = _read(path)
    counts = {}
    if not text:
        return counts
    for line in text.splitlines():
        parts = line.rsplit(" ", 1)
        if len(parts) != 2:
            continue
        name, value = parts[0].strip(), parts[1].strip()
        try:
            n = int(value)
        except ValueError:
            continue
        if n > 0:
            counts[name] = n
    return counts


def scan_pcie(sysfs_root: str = "/sys/bus/pci/devices") -> List[Finding]:
    """Scan all PCIe devices for accumulated AER error counters."""
    findings: List[Finding] = []
    if not os.path.isdir(sysfs_root):
        return findings

    any_aer = False
    for dev_path in sorted(glob.glob(os.path.join(sysfs_root, "*"))):
        bdf = os.path.basename(dev_path)
        dev_total = 0
        dev_metrics = {}
        dev_severity = "ok"

        for kind, (fname, sev) in _AER_FILES.items():
            counts = _parse_aer_counter_file(os.path.join(dev_path, fname))
            if counts:
                any_aer = True
                subtotal = sum(counts.values())
                dev_total += subtotal
                dev_metrics[kind] = subtotal
                if SEVERITY_ORDER[sev] > SEVERITY_ORDER[dev_severity]:
                    dev_severity = sev

        if dev_total > 0:
            # Build a compact detail string of the non-zero categories.
            detail = ", ".join(f"{k}={v}" for k, v in dev_metrics.items())
            findings.append(Finding(
                subsystem="pcie",
                device=bdf,
                severity=dev_severity,
                summary=f"{dev_total} AER error(s) accumulated",
                detail=detail,
                metrics=dev_metrics,
            ))

    if not findings:
        if any_aer:
            findings.append(Finding("pcie", "all", "ok", "No AER errors on any device"))
        else:
            findings.append(Finding(
                "pcie", "all", "ok",
                "No AER errors detected",
                detail="AER sysfs counters read; all zero (or AER not enabled)",
            ))
    return findings


# ---------------------------------------------------------------------------
# Storage (NVMe) scanner
# ---------------------------------------------------------------------------

def scan_storage(sysfs_block: str = "/sys/class/nvme") -> List[Finding]:
    """Scan NVMe controllers for SMART-adjacent health indicators via sysfs."""
    findings: List[Finding] = []
    if not os.path.isdir(sysfs_block):
        findings.append(Finding(
            "storage", "nvme", "info",
            "No NVMe controllers found",
            detail=f"{sysfs_block} not present",
        ))
        return findings

    for ctrl_path in sorted(glob.glob(os.path.join(sysfs_block, "nvme*"))):
        ctrl = os.path.basename(ctrl_path)
        model = _read(os.path.join(ctrl_path, "model")) or "unknown"
        state = _read(os.path.join(ctrl_path, "state"))
        metrics = {}
        severity = "ok"
        notes = [f"model={model}"]

        if state and state != "live":
            severity = "warning"
            notes.append(f"state={state}")
        elif state:
            notes.append(f"state={state}")

        findings.append(Finding(
            subsystem="storage",
            device=ctrl,
            severity=severity,
            summary=f"NVMe controller {ctrl}",
            detail=", ".join(notes),
            metrics=metrics,
        ))
    if not findings:
        findings.append(Finding("storage", "nvme", "info", "No NVMe controllers found"))
    return findings


# ---------------------------------------------------------------------------
# Thermal scanner
# ---------------------------------------------------------------------------

def scan_thermal(sysfs_thermal: str = "/sys/class/thermal") -> List[Finding]:
    """Scan thermal zones; warn when temperature approaches trip points."""
    findings: List[Finding] = []
    if not os.path.isdir(sysfs_thermal):
        findings.append(Finding("thermal", "all", "info", "No thermal zones found"))
        return findings

    for zone_path in sorted(glob.glob(os.path.join(sysfs_thermal, "thermal_zone*"))):
        zone = os.path.basename(zone_path)
        temp_mc = _read_int(os.path.join(zone_path, "temp"))
        if temp_mc is None:
            continue
        temp_c = temp_mc / 1000.0
        ztype = _read(os.path.join(zone_path, "type")) or zone

        # Find the lowest trip point of type "critical"/"hot" for headroom calc.
        crit_c = None
        for trip_type_file in sorted(glob.glob(os.path.join(zone_path, "trip_point_*_type"))):
            ttype = _read(trip_type_file)
            if ttype in ("critical", "hot"):
                idx = re.search(r"trip_point_(\d+)_type", trip_type_file)
                if idx:
                    trip_temp = _read_int(os.path.join(
                        zone_path, f"trip_point_{idx.group(1)}_temp"))
                    if trip_temp is not None:
                        c = trip_temp / 1000.0
                        crit_c = c if crit_c is None else min(crit_c, c)

        severity = "ok"
        detail = f"type={ztype}"
        metrics = {"temp_c": round(temp_c, 1)}
        if crit_c is not None:
            metrics["critical_c"] = round(crit_c, 1)
            headroom = crit_c - temp_c
            detail += f", critical={crit_c:.0f}C, headroom={headroom:.0f}C"
            if headroom <= 0:
                severity = "critical"
            elif headroom <= 5:
                severity = "warning"

        findings.append(Finding(
            subsystem="thermal",
            device=zone,
            severity=severity,
            summary=f"{temp_c:.1f}C",
            detail=detail,
            metrics=metrics,
        ))
    if not findings:
        findings.append(Finding("thermal", "all", "info", "No readable thermal zones"))
    return findings


# ---------------------------------------------------------------------------
# Memory (EDAC / ECC) scanner
# ---------------------------------------------------------------------------

def scan_memory(sysfs_edac: str = "/sys/devices/system/edac/mc") -> List[Finding]:
    """Scan EDAC memory controllers for corrected/uncorrected ECC error counts."""
    findings: List[Finding] = []
    if not os.path.isdir(sysfs_edac):
        findings.append(Finding(
            "memory", "edac", "info",
            "EDAC not available",
            detail="No ECC memory controller exposed via EDAC",
        ))
        return findings

    for mc_path in sorted(glob.glob(os.path.join(sysfs_edac, "mc*"))):
        mc = os.path.basename(mc_path)
        ce = _read_int(os.path.join(mc_path, "ce_count"))
        ue = _read_int(os.path.join(mc_path, "ue_count"))
        ce = ce or 0
        ue = ue or 0

        severity = "ok"
        if ue > 0:
            severity = "critical"
        elif ce > 0:
            severity = "warning"

        findings.append(Finding(
            subsystem="memory",
            device=mc,
            severity=severity,
            summary=f"CE={ce} UE={ue}",
            detail="corrected + uncorrected ECC error counts",
            metrics={"ce_count": ce, "ue_count": ue},
        ))
    if not findings:
        findings.append(Finding("memory", "edac", "ok", "No EDAC controllers with errors"))
    return findings


# ---------------------------------------------------------------------------
# Network scanner
# ---------------------------------------------------------------------------

def scan_network(sysfs_net: str = "/sys/class/net") -> List[Finding]:
    """Scan network interfaces for link state and error/drop counters."""
    findings: List[Finding] = []
    if not os.path.isdir(sysfs_net):
        findings.append(Finding("network", "all", "info", "No network interfaces found"))
        return findings

    for iface_path in sorted(glob.glob(os.path.join(sysfs_net, "*"))):
        iface = os.path.basename(iface_path)
        if iface == "lo":
            continue
        operstate = _read(os.path.join(iface_path, "operstate")) or "unknown"
        rx_err = _read_int(os.path.join(iface_path, "statistics/rx_errors")) or 0
        tx_err = _read_int(os.path.join(iface_path, "statistics/tx_errors")) or 0
        rx_drop = _read_int(os.path.join(iface_path, "statistics/rx_dropped")) or 0
        tx_drop = _read_int(os.path.join(iface_path, "statistics/tx_dropped")) or 0
        total_err = rx_err + tx_err

        severity = "ok"
        if total_err > 0:
            severity = "warning"

        findings.append(Finding(
            subsystem="network",
            device=iface,
            severity=severity,
            summary=f"link={operstate}, errors={total_err}",
            detail=f"rx_err={rx_err}, tx_err={tx_err}, rx_drop={rx_drop}, tx_drop={tx_drop}",
            metrics={
                "rx_errors": rx_err, "tx_errors": tx_err,
                "rx_dropped": rx_drop, "tx_dropped": tx_drop,
            },
        ))
    if not findings:
        findings.append(Finding("network", "all", "info", "No non-loopback interfaces"))
    return findings


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

SCANNERS = {
    "pcie": scan_pcie,
    "storage": scan_storage,
    "thermal": scan_thermal,
    "memory": scan_memory,
    "network": scan_network,
}


def run_scanners(subsystems: List[str]) -> List[Finding]:
    """Run the named scanners and return the aggregated findings."""
    findings: List[Finding] = []
    for name in subsystems:
        scanner = SCANNERS.get(name)
        if scanner is None:
            continue
        try:
            findings.extend(scanner())
        except Exception as e:  # a broken scanner must not abort the whole run
            findings.append(Finding(
                subsystem=name, device="-", severity="warning",
                summary="scanner error", detail=str(e),
            ))
    return findings
