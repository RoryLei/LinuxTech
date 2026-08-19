"""Storage event types."""
from dataclasses import dataclass
from events.base import DiagEvent


@dataclass
class NVMeLatencyEvent(DiagEvent):
    """NVMe I/O latency event."""

    source_probe: str = "nvme_latency"
    latency_us: int = 0
    opcode: int = 0       # 0x01=write, 0x02=read
    queue_id: int = 0
    namespace_id: int = 1


@dataclass
class BlockErrorEvent(DiagEvent):
    """Block I/O error event."""

    source_probe: str = "block_errors"
    error_code: int = 0   # e.g., -EIO = -5
    sector: int = 0
    nr_sectors: int = 0
    rwflag: str = "R"     # R or W
