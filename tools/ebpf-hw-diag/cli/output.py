"""Output formatting for CLI commands.

Two formats are supported:

    text  Human-readable, aligned tables. Severity is shown with an explicit
          word label (OK / WARN / CRIT) rather than relying on color alone, so
          the output stays legible for low-vision users and in logs/pipes.
    json  Machine-readable, one JSON document per command for scripting.

Color is applied only as an *additional* cue on top of the text label, and only
when writing to an interactive TTY. It is never the sole carrier of meaning.
"""
import json
import sys
from typing import List

from cli.scanners import Finding, SEVERITY_ORDER


# Explicit text labels — the primary (color-independent) severity signal.
_LABELS = {
    "ok": "OK",
    "info": "INFO",
    "warning": "WARN",
    "critical": "CRIT",
}

# ANSI colors, used only as a secondary cue on a TTY.
_COLORS = {
    "ok": "\033[32m",       # green
    "info": "\033[36m",     # cyan
    "warning": "\033[33m",  # yellow
    "critical": "\033[31m", # red
}
_RESET = "\033[0m"


def _use_color(stream) -> bool:
    return hasattr(stream, "isatty") and stream.isatty()


def _label(severity: str, colorize: bool) -> str:
    text = _LABELS.get(severity, severity.upper())
    padded = f"[{text:^4}]"
    if colorize and severity in _COLORS:
        return f"{_COLORS[severity]}{padded}{_RESET}"
    return padded


def format_findings_text(findings: List[Finding], stream=sys.stdout) -> str:
    """Render findings as an aligned text table grouped by subsystem."""
    if not findings:
        return "No findings.\n"

    colorize = _use_color(stream)
    lines: List[str] = []

    # Column widths from the data.
    dev_w = max((len(f.device) for f in findings), default=6)
    dev_w = max(dev_w, 6)

    current_sub = None
    for f in sorted(findings, key=lambda x: (x.subsystem, -SEVERITY_ORDER.get(x.severity, 0))):
        if f.subsystem != current_sub:
            current_sub = f.subsystem
            lines.append("")
            lines.append(f"== {current_sub.upper()} ==")
        label = _label(f.severity, colorize)
        row = f"  {label} {f.device:<{dev_w}}  {f.summary}"
        if f.detail:
            row += f"  ({f.detail})"
        lines.append(row)

    return "\n".join(lines).lstrip("\n") + "\n"


def format_findings_json(findings: List[Finding], summary: dict) -> str:
    """Render findings and a summary block as a single JSON document."""
    doc = {
        "summary": summary,
        "findings": [f.to_dict() for f in findings],
    }
    return json.dumps(doc, indent=2)


def summarize(findings: List[Finding]) -> dict:
    """Compute counts per severity and the overall worst severity."""
    counts = {"ok": 0, "info": 0, "warning": 0, "critical": 0}
    worst = "ok"
    for f in findings:
        counts[f.severity] = counts.get(f.severity, 0) + 1
        if SEVERITY_ORDER.get(f.severity, 0) > SEVERITY_ORDER.get(worst, 0):
            worst = f.severity
    return {
        "total": len(findings),
        "by_severity": counts,
        "worst_severity": worst,
    }


def format_summary_line(summary: dict, stream=sys.stdout) -> str:
    """One-line overall verdict shown at the end of a text report."""
    colorize = _use_color(stream)
    worst = summary["worst_severity"]
    counts = summary["by_severity"]
    verdict = {
        "ok": "HEALTHY",
        "info": "HEALTHY",
        "warning": "ATTENTION NEEDED",
        "critical": "CRITICAL ISSUES",
    }.get(worst, worst.upper())
    label = _label(worst, colorize)
    return (
        f"\n{label} Overall: {verdict}  "
        f"(crit={counts['critical']} warn={counts['warning']} "
        f"info={counts['info']} ok={counts['ok']})\n"
    )
