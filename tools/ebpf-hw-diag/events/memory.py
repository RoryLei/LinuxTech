"""Memory event types."""
from dataclasses import dataclass
from events.base import DiagEvent


@dataclass
class MCEEvent(DiagEvent):
    """Machine Check Exception (ECC error) event."""

    source_probe: str = "mce_events"
    dimm_label: str = ""
    error_type: int = 0       # corrected=0, uncorrected=1
    error_count: int = 1
    grain: int = 0            # error granularity in bytes

    @property
    def is_corrected(self) -> bool:
        return self.error_type == 0


@dataclass
class DMAFailureEvent(DiagEvent):
    """DMA mapping failure event."""

    source_probe: str = "dma_failures"
    calling_function: str = ""
    pid: int = 0
    comm: str = ""
