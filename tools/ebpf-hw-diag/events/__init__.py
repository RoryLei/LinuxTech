"""Typed event schema for the diagnostics agent."""
from events.base import DiagEvent
from events.pcie import PCIeAEREvent
from events.storage import NVMeLatencyEvent, BlockErrorEvent
from events.thermal import ThermalTripEvent, CpuFreqEvent
from events.network import TCPRetransmitEvent
from events.memory import MCEEvent, DMAFailureEvent
from events.correlated import CorrelatedEvent

__all__ = [
    "DiagEvent",
    "PCIeAEREvent",
    "NVMeLatencyEvent",
    "BlockErrorEvent",
    "ThermalTripEvent",
    "CpuFreqEvent",
    "TCPRetransmitEvent",
    "MCEEvent",
    "DMAFailureEvent",
    "CorrelatedEvent",
]
