"""Token bucket rate limiter for event flow control."""
import time
import threading


class TokenBucketRateLimiter:
    """Token bucket rate limiter with configurable rate and burst."""

    def __init__(self, rate: float, burst: int):
        """
        Args:
            rate: tokens per second (sustained rate)
            burst: maximum tokens (burst capacity)
        """
        self._rate = rate
        self._burst = burst
        self._tokens = float(burst)
        self._last_refill = time.monotonic()
        self._lock = threading.Lock()
        self._allowed_count = 0
        self._dropped_count = 0

    def allow(self) -> bool:
        """Check if an event is allowed (consume one token)."""
        with self._lock:
            self._refill()
            if self._tokens >= 1.0:
                self._tokens -= 1.0
                self._allowed_count += 1
                return True
            else:
                self._dropped_count += 1
                return False

    def _refill(self):
        """Add tokens based on elapsed time."""
        now = time.monotonic()
        elapsed = now - self._last_refill
        self._tokens = min(self._burst, self._tokens + elapsed * self._rate)
        self._last_refill = now

    @property
    def allowed_count(self) -> int:
        return self._allowed_count

    @property
    def dropped_count(self) -> int:
        return self._dropped_count

    def reset_stats(self):
        with self._lock:
            self._allowed_count = 0
            self._dropped_count = 0
