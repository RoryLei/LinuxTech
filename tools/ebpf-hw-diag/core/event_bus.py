"""Event bus: fan-out routing from collectors to exporters/correlator."""
import logging
import threading
from typing import List, Callable, Optional
from events.base import DiagEvent
from core.rate_limiter import TokenBucketRateLimiter

logger = logging.getLogger(__name__)


class EventBus:
    """Dispatches events from collectors to all registered consumers."""

    def __init__(self, rate_limiter: Optional[TokenBucketRateLimiter] = None):
        self._consumers: List[object] = []
        self._rate_limiter = rate_limiter
        self._lock = threading.Lock()
        self._stats = {
            "events_dispatched": 0,
            "events_dropped_rate_limit": 0,
            "consumer_errors": 0,
        }

    def register(self, consumer) -> None:
        """Register a consumer (must have a .receive(event) method)."""
        with self._lock:
            self._consumers.append(consumer)

    def unregister(self, consumer) -> None:
        """Remove a consumer."""
        with self._lock:
            self._consumers = [c for c in self._consumers if c is not consumer]

    def emit(self, event: DiagEvent) -> None:
        """Dispatch event to all consumers. Rate-limited."""
        if self._rate_limiter and not self._rate_limiter.allow():
            self._stats["events_dropped_rate_limit"] += 1
            return

        self._stats["events_dispatched"] += 1
        with self._lock:
            consumers = list(self._consumers)

        for consumer in consumers:
            try:
                consumer.receive(event)
            except Exception as e:
                self._stats["consumer_errors"] += 1
                logger.error(f"Consumer {type(consumer).__name__} error: {e}")

    @property
    def stats(self) -> dict:
        return dict(self._stats)
