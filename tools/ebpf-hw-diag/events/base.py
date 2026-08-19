"""Base event class for all diagnostic events."""
from dataclasses import dataclass, field
import time


@dataclass
class DiagEvent:
    """Base class for all hardware diagnostic events."""

    timestamp: float = field(default_factory=time.time)
    source_probe: str = ""
    device_id: str = ""
    severity: str = "info"  # info, warning, critical

    def to_dict(self) -> dict:
        """Serialize event to dictionary."""
        return {k: v for k, v in self.__dict__.items() if v is not None}
