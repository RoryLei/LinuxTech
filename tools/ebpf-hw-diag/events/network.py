"""Network event types."""
from dataclasses import dataclass
from events.base import DiagEvent


@dataclass
class TCPRetransmitEvent(DiagEvent):
    """TCP retransmission event."""

    source_probe: str = "tcp_retrans"
    src_addr: str = ""
    dst_addr: str = ""
    src_port: int = 0
    dst_port: int = 0
    state: int = 0  # TCP state (1=ESTABLISHED, etc.)

    def is_nccl_port(self) -> bool:
        """Check if this is a NCCL/GPU communication port."""
        return self.dst_port in (4420, 18515, 29400)
