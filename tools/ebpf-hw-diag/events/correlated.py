"""Correlated event type — output of the correlation engine."""
from dataclasses import dataclass, field
from typing import List
from events.base import DiagEvent


@dataclass
class CorrelatedEvent(DiagEvent):
    """Cross-layer correlation result."""

    source_probe: str = "correlator"
    rule_name: str = ""
    trigger_events: List[DiagEvent] = field(default_factory=list)
    root_cause: str = ""
    recommended_action: str = ""
    confidence: float = 0.0
    correlated_devices: List[str] = field(default_factory=list)
