"""Correlation engine: sliding window + rule evaluation."""
import logging
import time
from collections import deque
from typing import List, Optional, Dict
from events.base import DiagEvent
from events.correlated import CorrelatedEvent
from correlator.rules import CorrelationRule

logger = logging.getLogger(__name__)


class CorrelationEngine:
    """Evaluates cross-layer correlation rules against a sliding event window."""

    def __init__(self, rules: List[CorrelationRule], config: dict):
        self._rules = rules
        self._window_sec = config.get("window_sec", 300)
        self._max_events = config.get("max_window_events", 50000)
        self._cooldown_sec = config.get("cooldown_sec", 300)
        self._events: deque = deque(maxlen=self._max_events)
        self._fired: Dict[str, float] = {}  # rule_key → last_fired_ts
        self._enabled = config.get("enabled", True)

    def receive(self, event: DiagEvent) -> None:
        """Ingest event; evaluate rules. Emits CorrelatedEvent via callback if match."""
        if not self._enabled:
            return
        self._events.append(event)
        self._prune_expired()
        correlated = self._evaluate_rules(event)
        # Store correlated events back in the bus via the emit callback
        for ce in correlated:
            if self._on_correlate:
                self._on_correlate(ce)

    def set_emit_callback(self, callback) -> None:
        """Set function to call when a correlation fires."""
        self._on_correlate = callback

    _on_correlate = None

    def _prune_expired(self):
        """Remove events older than window."""
        cutoff = time.time() - self._window_sec
        while self._events and self._events[0].timestamp < cutoff:
            self._events.popleft()

    def _evaluate_rules(self, trigger: DiagEvent) -> List[CorrelatedEvent]:
        """Check if the new event completes any rule's conditions."""
        results = []
        for rule in self._rules:
            # Quick check: does trigger match any condition in this rule?
            if not any(c.matches(trigger) for c in rule.conditions):
                continue

            # Find matching events for ALL conditions in the window
            matched = self._find_matching_events(rule)
            if matched is None:
                continue

            # Check device scope
            if not self._check_device_scope(rule, matched):
                continue

            # Check cooldown
            key = f"{rule.name}:{self._device_key(matched)}"
            if self._in_cooldown(key, rule.cooldown_sec):
                continue

            # FIRE
            self._fired[key] = time.time()
            ce = CorrelatedEvent(
                device_id=self._device_key(matched),
                severity="critical" if rule.priority <= 2 else "warning",
                rule_name=rule.name,
                trigger_events=matched,
                root_cause=rule.root_cause,
                recommended_action=rule.recommended_action,
                confidence=rule.confidence,
                correlated_devices=[e.device_id for e in matched if e.device_id],
            )
            results.append(ce)
            logger.warning(f"CORRELATION [{rule.name}]: {rule.root_cause} "
                           f"(confidence={rule.confidence}, devices={ce.correlated_devices})")

        return results

    def _find_matching_events(self, rule: CorrelationRule) -> Optional[List[DiagEvent]]:
        """Find one event per condition within rule's time window."""
        cutoff = time.time() - rule.time_window_sec
        window = [e for e in self._events if e.timestamp >= cutoff]
        matched = []
        for condition in rule.conditions:
            found = None
            for evt in reversed(window):  # newest first
                if condition.matches(evt):
                    found = evt
                    break
            if found is None:
                return None  # condition not satisfied
            matched.append(found)
        return matched

    def _check_device_scope(self, rule: CorrelationRule, events: List[DiagEvent]) -> bool:
        """Verify device scope constraint."""
        if rule.device_scope == "any":
            return True
        devices = set(e.device_id for e in events if e.device_id)
        if rule.device_scope == "same_device":
            return len(devices) <= 1
        if rule.device_scope == "same_bus":
            buses = set(d.split(":")[1] for d in devices if ":" in d)
            return len(buses) <= 1
        return True

    def _in_cooldown(self, key: str, cooldown: float) -> bool:
        last = self._fired.get(key, 0)
        return (time.time() - last) < cooldown

    def _device_key(self, events: List[DiagEvent]) -> str:
        devices = [e.device_id for e in events if e.device_id]
        return devices[0] if devices else "unknown"

    def window_size(self) -> int:
        return len(self._events)

    def get_status(self) -> dict:
        return {
            "enabled": self._enabled,
            "rules_count": len(self._rules),
            "window_size": self.window_size(),
            "correlations_fired": len(self._fired),
        }
