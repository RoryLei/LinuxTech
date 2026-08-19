"""PCIe AER event types."""
from dataclasses import dataclass, field
from typing import List, Optional
from events.base import DiagEvent

# AER severity levels (from kernel)
AER_NONFATAL = 0
AER_FATAL = 1
AER_CORRECTABLE = 2

SEVERITY_MAP = {
    AER_NONFATAL: "Uncorrected (Non-Fatal)",
    AER_FATAL: "Fatal",
    AER_CORRECTABLE: "Corrected",
}

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
}


def decode_aer_status(status: int, severity: int) -> List[str]:
    """Decode AER status register bits into error names."""
    table = CORRECTABLE_ERRORS if severity == AER_CORRECTABLE else UNCORRECTABLE_ERRORS
    errors = [name for bit, name in table.items() if status & bit]
    return errors if errors else [f"Unknown (0x{status:08x})"]


@dataclass
class PCIeAEREvent(DiagEvent):
    """PCIe Advanced Error Reporting event."""

    source_probe: str = "aer_monitor"
    bdf: str = ""                          # Bus:Device.Function (e.g., "0000:03:00.0")
    status_raw: int = 0                    # raw AER status register
    severity_code: int = AER_CORRECTABLE   # 0=nonfatal, 1=fatal, 2=corrected
    errors: List[str] = field(default_factory=list)
    tlp_header: Optional[str] = None       # TLP header hex string

    def __post_init__(self):
        if not self.errors and self.status_raw:
            self.errors = decode_aer_status(self.status_raw, self.severity_code)
        if not self.device_id and self.bdf:
            self.device_id = self.bdf
        self.severity = self._map_severity()

    def _map_severity(self) -> str:
        if self.severity_code == AER_FATAL:
            return "critical"
        elif self.severity_code == AER_NONFATAL:
            return "warning"
        return "info"

    @property
    def severity_name(self) -> str:
        return SEVERITY_MAP.get(self.severity_code, "Unknown")
