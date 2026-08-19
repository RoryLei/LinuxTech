"""Alert engine — evaluates rules against events and fires notifications."""
import logging
import time
from typing import List, Dict, Any, Optional
from events.base import DiagEvent

logger = logging.getLogger(__name__)


class AlertRule:
    """A single alert rule definition."""

    def __init__(self, name: str, condition: str, severity: str = "warning",
                 message: str = "", duration_sec: float = 0):
        self.name = name
        self.condition = condition
        self.severity = severity
        self.message = message
        self.duration_sec = duration_sec
        self._first_triggered: Optional[float] = None

    def evaluate(self, event: DiagEvent) -> bool:
        """Check if event matches this rule's condition."""
        try:
            # Build evaluation context from event fields
            ctx = event.to_dict()
            return bool(eval(self.condition, {"__builtins__": {}}, ctx))
        except Exception:
            return False

    def check_duration(self, ts: float) -> bool:
        """Check if the condition has been sustained for duration_sec."""
        if self.duration_sec <= 0:
            return True  # no duration requirement
        if self._first_triggered is None:
            self._first_triggered = ts
            return False
        if (ts - self._first_triggered) >= self.duration_sec:
            self._first_triggered = None  # reset for next cycle
            return True
        return False

    def reset(self):
        self._first_triggered = None


class AlertEngine:
    """Evaluates alert rules against incoming events."""

    def __init__(self, config: dict):
        self._config = config
        self._enabled = config.get("enabled", False)
        self._rules: List[AlertRule] = []
        self._fired_alerts: List[Dict[str, Any]] = []
        self._cooldown: Dict[str, float] = {}
        self._cooldown_sec = 300  # don't re-fire same alert within 5 min

        if self._enabled:
            self._load_rules()

    def _load_rules(self) -> None:
        """Load rules from config."""
        rules_file = self._config.get("rules_file", "")
        if not rules_file:
            return
        try:
            import yaml
            with open(rules_file) as f:
                data = yaml.safe_load(f) or {}
            for r in data.get("rules", []):
                self._rules.append(AlertRule(
                    name=r["name"],
                    condition=r["condition"],
                    severity=r.get("severity", "warning"),
                    message=r.get("message", ""),
                    duration_sec=r.get("duration_sec", 0),
                ))
            logger.info(f"AlertEngine: loaded {len(self._rules)} rules")
        except Exception as e:
            logger.warning(f"AlertEngine: failed to load rules: {e}")

    def start(self) -> None:
        if self._enabled:
            logger.info(f"AlertEngine: active with {len(self._rules)} rules")

    def stop(self) -> None:
        pass

    def receive(self, event: DiagEvent) -> None:
        """Evaluate event against all rules."""
        if not self._enabled or not self._rules:
            return

        now = time.time()
        for rule in self._rules:
            if rule.evaluate(event):
                if rule.check_duration(now):
                    self._fire_alert(rule, event, now)
            else:
                rule.reset()

    def _fire_alert(self, rule: AlertRule, event: DiagEvent, ts: float) -> None:
        """Fire an alert (respecting cooldown)."""
        cooldown_key = f"{rule.name}:{event.device_id}"
        last_fired = self._cooldown.get(cooldown_key, 0)
        if (ts - last_fired) < self._cooldown_sec:
            return  # in cooldown

        self._cooldown[cooldown_key] = ts
        alert = {
            "rule": rule.name,
            "severity": rule.severity,
            "device": event.device_id,
            "message": rule.message.format(**event.to_dict()),
            "timestamp": ts,
        }
        self._fired_alerts.append(alert)
        logger.warning(f"ALERT [{rule.severity}] {rule.name}: {alert['message']}")

    @property
    def fired_alerts(self) -> List[Dict[str, Any]]:
        return list(self._fired_alerts)
