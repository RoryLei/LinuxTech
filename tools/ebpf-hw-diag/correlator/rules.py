"""Correlation rule definitions."""
import logging
from dataclasses import dataclass, field
from typing import Any, List, Optional

import yaml

logger = logging.getLogger(__name__)


@dataclass
class EventCondition:
    """A single condition matching an event type + optional field check."""

    event_type: str              # class name, e.g. "PCIeAEREvent"
    field: str = ""              # optional field to check
    op: str = "exists"           # "exists", "==", "!=", ">", "<", "contains"
    value: Any = None            # comparison value

    def matches(self, event) -> bool:
        """Check if an event satisfies this condition."""
        if type(event).__name__ != self.event_type:
            return False
        if self.op == "exists":
            return True
        val = getattr(event, self.field, None)
        if val is None:
            return False
        if self.op == "==":
            return val == self.value
        if self.op == "!=":
            return val != self.value
        if self.op == ">":
            return val > self.value
        if self.op == "<":
            return val < self.value
        if self.op == "<=":
            return val <= self.value
        if self.op == ">=":
            return val >= self.value
        if self.op == "contains":
            return self.value in val if isinstance(val, (str, list)) else False
        return False


@dataclass
class CorrelationRule:
    """Defines a cross-layer correlation pattern."""

    name: str
    conditions: List[EventCondition]
    time_window_sec: float
    device_scope: str = "any"          # "any", "same_device", "same_bus"
    root_cause: str = ""
    recommended_action: str = ""
    confidence: float = 0.8
    cooldown_sec: float = 300
    priority: int = 5

    def __post_init__(self):
        if not self.conditions:
            raise ValueError(f"Rule '{self.name}' must have at least one condition")


def load_rules_from_yaml(path: str) -> List[CorrelationRule]:
    """Load correlation rules from a YAML file."""
    try:
        with open(path) as f:
            data = yaml.safe_load(f) or {}
    except Exception as e:
        logger.warning(f"Cannot load correlation rules from {path}: {e}")
        return []

    rules = []
    for r in data.get("rules", []):
        conditions = []
        for c in r.get("conditions", []):
            conditions.append(EventCondition(
                event_type=c["event_type"],
                field=c.get("field", ""),
                op=c.get("op", "exists"),
                value=c.get("value"),
            ))
        rules.append(CorrelationRule(
            name=r["name"],
            conditions=conditions,
            time_window_sec=r.get("time_window_sec", 60),
            device_scope=r.get("device_scope", "any"),
            root_cause=r.get("root_cause", ""),
            recommended_action=r.get("recommended_action", ""),
            confidence=r.get("confidence", 0.8),
            cooldown_sec=r.get("cooldown_sec", 300),
            priority=r.get("priority", 5),
        ))

    logger.info(f"Loaded {len(rules)} correlation rules from {path}")
    return rules
