"""Unit tests for core infrastructure."""
import time
import pytest
from unittest.mock import MagicMock
from core.event_bus import EventBus
from core.rate_limiter import TokenBucketRateLimiter
from events.base import DiagEvent


class TestEventBus:
    def test_fanout_to_consumers(self):
        bus = EventBus()
        c1 = MagicMock()
        c2 = MagicMock()
        bus.register(c1)
        bus.register(c2)
        evt = DiagEvent(source_probe="test")
        bus.emit(evt)
        c1.receive.assert_called_once_with(evt)
        c2.receive.assert_called_once_with(evt)

    def test_consumer_error_isolation(self):
        bus = EventBus()
        bad = MagicMock()
        bad.receive.side_effect = RuntimeError("crash")
        good = MagicMock()
        bus.register(bad)
        bus.register(good)
        evt = DiagEvent(source_probe="test")
        bus.emit(evt)  # should not raise
        good.receive.assert_called_once_with(evt)

    def test_unregister(self):
        bus = EventBus()
        consumer = MagicMock()
        bus.register(consumer)
        bus.unregister(consumer)
        bus.emit(DiagEvent(source_probe="test"))
        consumer.receive.assert_not_called()

    def test_rate_limiting(self):
        limiter = TokenBucketRateLimiter(rate=10, burst=2)
        bus = EventBus(rate_limiter=limiter)
        consumer = MagicMock()
        bus.register(consumer)
        # Emit 5 events — only first 2 should pass (burst=2)
        for _ in range(5):
            bus.emit(DiagEvent(source_probe="test"))
        assert consumer.receive.call_count == 2
        assert bus.stats["events_dropped_rate_limit"] == 3

    def test_stats_tracking(self):
        bus = EventBus()
        consumer = MagicMock()
        bus.register(consumer)
        bus.emit(DiagEvent(source_probe="test"))
        bus.emit(DiagEvent(source_probe="test"))
        assert bus.stats["events_dispatched"] == 2


class TestTokenBucketRateLimiter:
    def test_allows_within_burst(self):
        limiter = TokenBucketRateLimiter(rate=100, burst=5)
        for _ in range(5):
            assert limiter.allow() is True

    def test_blocks_over_burst(self):
        limiter = TokenBucketRateLimiter(rate=10, burst=3)
        for _ in range(3):
            limiter.allow()
        assert limiter.allow() is False

    def test_refills_over_time(self):
        limiter = TokenBucketRateLimiter(rate=1000, burst=5)
        for _ in range(5):
            limiter.allow()
        assert limiter.allow() is False
        time.sleep(0.01)  # 10ms → 10 tokens at 1000/s
        assert limiter.allow() is True

    def test_stats(self):
        limiter = TokenBucketRateLimiter(rate=10, burst=2)
        for _ in range(4):
            limiter.allow()
        assert limiter.allowed_count == 2
        assert limiter.dropped_count == 2
