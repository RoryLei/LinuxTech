"""Abstract base class for all collectors."""
import logging
from abc import ABC, abstractmethod
from typing import Optional
from core.event_bus import EventBus
from core.probe_manager import ProbeManager

logger = logging.getLogger(__name__)


class BaseCollector(ABC):
    """Base class for hardware event collectors.

    Each collector:
    1. Loads an eBPF probe via ProbeManager
    2. Registers a perf buffer callback
    3. Processes raw events into typed DiagEvent objects
    4. Emits events to the EventBus
    """

    def __init__(self, config: dict, event_bus: EventBus, probe_manager: ProbeManager):
        self._config = config
        self._event_bus = event_bus
        self._probe_manager = probe_manager
        self._running = False
        self._events_processed = 0

    @property
    def name(self) -> str:
        return self.__class__.__name__

    @property
    def is_running(self) -> bool:
        return self._running

    @property
    def events_processed(self) -> int:
        return self._events_processed

    @property
    def enabled(self) -> bool:
        return self._config.get("enabled", False)

    @abstractmethod
    def start(self) -> bool:
        """Start the collector. Returns True if successful."""
        ...

    @abstractmethod
    def stop(self) -> None:
        """Stop the collector and release resources."""
        ...

    @abstractmethod
    def poll(self) -> None:
        """Poll for new events (called from main loop)."""
        ...

    def _emit(self, event) -> None:
        """Emit a processed event to the bus."""
        self._events_processed += 1
        self._event_bus.emit(event)
