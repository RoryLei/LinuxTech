# Correlator Engine Design Specification

## Purpose

The Correlator Engine is the "intelligence" layer of the HW diagnostics agent.
It receives typed events from all collectors and identifies **cross-layer patterns**
that indicate a root cause — something no single probe can determine alone.

Example: A PCIe Fatal AER error followed by a GPU fence timeout on the same BDF
within 30 seconds → root cause = "PCIe link failure causing GPU hang."

---

## Architecture

```
Events from all collectors
    │
    ▼
┌───────────────────────────────────────────────────────────┐
│                    Correlator Engine                        │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │           Sliding Event Window                      │   │
│  │  (deque, max_age=window_sec, max_size=10000)       │   │
│  │                                                      │   │
│  │  [evt_t-0] [evt_t-1] [evt_t-2] ... [evt_t-N]      │   │
│  └────────────────────────┬───────────────────────────┘   │
│                           │                                 │
│                  on each new event:                         │
│                           │                                 │
│  ┌────────────────────────▼───────────────────────────┐   │
│  │          Rule Evaluation Loop                       │   │
│  │                                                      │   │
│  │  for rule in rules:                                 │   │
│  │    if all(rule.conditions match events in window):  │   │
│  │      if rule.device_scope satisfied:                │   │
│  │        if not rule.already_fired (cooldown):        │   │
│  │          emit CorrelatedEvent(rule.root_cause, ...)│   │
│  └────────────────────────┬───────────────────────────┘   │
│                           │                                 │
│  ┌────────────────────────▼───────────────────────────┐   │
│  │        Deduplication & Cooldown                      │   │
│  │                                                      │   │
│  │  - Same correlation not fired again within cooldown │   │
│  │  - Default cooldown: 5 minutes per rule+device      │   │
│  │  - Prevents alert flood from sustained failure      │   │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
                   CorrelatedEvent
                   → Event Bus → Alerter / Prometheus / Log
```

---

## Data Structures

### DiagEvent (Base — from events/base.py)

```python
@dataclass
class DiagEvent:
    timestamp: float          # unix timestamp (time.time())
    source_probe: str         # which probe generated this ("aer_monitor")
    device_id: str            # device identifier ("0000:3b:00.0")
    severity: str             # "info", "warning", "critical"
```

### CorrelationRule (from correlator/rules.py)

```python
@dataclass
class CorrelationRule:
    name: str                          # unique rule name
    conditions: list[EventCondition]   # all must match
    time_window_sec: float             # conditions must co-occur within this window
    device_scope: str                  # "same_device" | "any" | "same_bus"
    root_cause: str                    # human-readable diagnosis
    recommended_action: str            # what to do
    confidence: float                  # 0.0 - 1.0
    cooldown_sec: float = 300          # don't re-fire for this duration
    priority: int = 5                  # 1=highest, 10=lowest

@dataclass
class EventCondition:
    event_type: str            # class name: "PCIeAEREvent"
    field: str = ""            # optional field to check
    op: str = "exists"         # "exists", "==", "!=", ">", "<", "contains"
    value: Any = None          # comparison value
```

### CorrelatedEvent (Output — from events/correlated.py)

```python
@dataclass
class CorrelatedEvent(DiagEvent):
    source_probe: str = "correlator"
    rule_name: str = ""
    trigger_events: list[DiagEvent] = field(default_factory=list)
    root_cause: str = ""
    recommended_action: str = ""
    confidence: float = 0.0
    correlated_devices: list[str] = field(default_factory=list)
```

---

## Correlation Rules (Built-in)

### correlator/builtin_rules.yaml

```yaml
rules:
  # --- PCIe + GPU ---
  - name: pcie_link_failure_gpu_hang
    conditions:
      - event_type: PCIeAEREvent
        field: severity
        op: "=="
        value: "Fatal"
      - event_type: FenceTimeoutEvent
    time_window_sec: 30
    device_scope: same_device
    root_cause: "PCIe link failure causing GPU hang"
    recommended_action: "Disable device; drain node from scheduler; inspect connector"
    confidence: 0.92
    priority: 1

  # --- Thermal + Storage ---
  - name: thermal_throttle_io_stall
    conditions:
      - event_type: ThermalTripEvent
        field: trip_type
        op: "contains"
        value: "hot"
      - event_type: NVMeLatencyEvent
        field: latency_us
        op: ">"
        value: 5000
    time_window_sec: 60
    device_scope: any
    root_cause: "Thermal throttling causing I/O latency spike"
    recommended_action: "Alert cooling team; reduce CPU power limit; migrate workloads"
    confidence: 0.85
    priority: 2

  # --- Memory + Thermal ---
  - name: memory_thermal_stress
    conditions:
      - event_type: MCEEvent
        field: error_count
        op: ">"
        value: 5
      - event_type: ThermalTripEvent
    time_window_sec: 120
    device_scope: any
    root_cause: "Memory ECC errors induced by thermal stress"
    recommended_action: "Check memory cooling; page-offline affected pages; schedule DIMM RMA"
    confidence: 0.80
    priority: 2

  # --- Network + RDMA ---
  - name: fabric_congestion
    conditions:
      - event_type: TCPRetransmitEvent
        field: retransmit_rate
        op: ">"
        value: 0.005
      - event_type: RDMAErrorEvent
    time_window_sec: 30
    device_scope: any
    root_cause: "Network fabric congestion affecting both TCP and RDMA"
    recommended_action: "Check switch PFC; reroute ECMP; reduce parallel streams"
    confidence: 0.88
    priority: 1

  # --- Storage + PCIe ---
  - name: nvme_pcie_degradation
    conditions:
      - event_type: PCIeAEREvent
        field: errors
        op: "contains"
        value: "Bad TLP"
      - event_type: NVMeLatencyEvent
        field: latency_us
        op: ">"
        value: 1000
    time_window_sec: 60
    device_scope: same_device
    root_cause: "PCIe signal degradation causing NVMe performance drop"
    recommended_action: "Replace PCIe cable/riser; reseat NVMe device; check retimer"
    confidence: 0.87
    priority: 2

  # --- IRQ + Storage ---
  - name: irq_storm_io_stall
    conditions:
      - event_type: IRQStormEvent
        field: irq_rate
        op: ">"
        value: 100000
      - event_type: NVMeLatencyEvent
        field: latency_us
        op: ">"
        value: 10000
    time_window_sec: 10
    device_scope: any
    root_cause: "IRQ storm starving I/O completion processing"
    recommended_action: "Identify IRQ source; disable offending device; rebalance IRQ affinity"
    confidence: 0.82
    priority: 1

  # --- GPU + Memory ---
  - name: gpu_dma_fault_chain
    conditions:
      - event_type: IOMMUFaultEvent
      - event_type: FenceTimeoutEvent
    time_window_sec: 5
    device_scope: same_device
    root_cause: "IOMMU fault causing GPU hang (invalid DMA)"
    recommended_action: "Kill offending process; collect GPU dump; report driver bug"
    confidence: 0.95
    priority: 1

  # --- CPU + Storage ---
  - name: cpu_throttle_queue_stall
    conditions:
      - event_type: CpuFreqEvent
        field: freq_mhz
        op: "<"
        value: 1000
      - event_type: QueueDepthEvent
        field: queue_depth_percent
        op: ">"
        value: 90
    time_window_sec: 30
    device_scope: any
    root_cause: "CPU frequency throttle causing NVMe queue stall (completion processing starved)"
    recommended_action: "Fix CPU throttle cause (thermal/RAPL); verify NVMe IRQ affinity"
    confidence: 0.78
    priority: 3

  # --- NUMA + Latency ---
  - name: numa_misplacement_latency
    conditions:
      - event_type: NUMAImbalanceEvent
        field: remote_alloc_percent
        op: ">"
        value: 30
      - event_type: NVMeLatencyEvent
        field: latency_us
        op: ">"
        value: 200
    time_window_sec: 300
    device_scope: same_device
    root_cause: "NUMA misplacement causing cross-node I/O latency penalty"
    recommended_action: "Re-pin IRQ affinity; set numactl for workload; review PCIe slot placement"
    confidence: 0.75
    priority: 3
```

---

## Engine Implementation

### Core Algorithm

```python
# correlator/engine.py
from collections import deque
from dataclasses import field
from typing import Optional
import time

class CorrelationEngine:
    def __init__(self, rules: list[CorrelationRule], window_sec: float = 300):
        self._rules = rules
        self._window_sec = window_sec
        self._events: deque = deque(maxlen=50000)
        self._fired: dict[str, float] = {}  # rule_key → last_fired_ts

    def ingest(self, event: DiagEvent) -> list[CorrelatedEvent]:
        """Ingest a new event and evaluate all correlation rules."""
        self._events.append(event)
        self._prune_expired()
        return self._evaluate_rules(event)

    def _prune_expired(self):
        """Remove events older than window from deque."""
        cutoff = time.time() - self._window_sec
        while self._events and self._events[0].timestamp < cutoff:
            self._events.popleft()

    def _evaluate_rules(self, trigger: DiagEvent) -> list[CorrelatedEvent]:
        """Check if the new event completes any rule's conditions."""
        results = []
        for rule in self._rules:
            if not self._event_matches_any_condition(trigger, rule):
                continue  # this event isn't relevant to this rule

            # Check if ALL conditions are satisfied in the window
            matched_events = self._find_matching_events(rule)
            if matched_events is None:
                continue  # not all conditions met

            # Check device scope
            if not self._check_device_scope(rule, matched_events):
                continue

            # Check cooldown (don't fire same rule+device too often)
            cooldown_key = f"{rule.name}:{self._device_key(matched_events)}"
            if self._is_in_cooldown(cooldown_key, rule.cooldown_sec):
                continue

            # FIRE: create correlated event
            self._fired[cooldown_key] = time.time()
            results.append(CorrelatedEvent(
                timestamp=time.time(),
                device_id=self._device_key(matched_events),
                severity="critical" if rule.priority <= 2 else "warning",
                rule_name=rule.name,
                trigger_events=matched_events,
                root_cause=rule.root_cause,
                recommended_action=rule.recommended_action,
                confidence=rule.confidence,
                correlated_devices=[e.device_id for e in matched_events],
            ))
        return results

    def _find_matching_events(self, rule) -> Optional[list[DiagEvent]]:
        """Find one event per condition within rule's time window."""
        cutoff = time.time() - rule.time_window_sec
        window_events = [e for e in self._events if e.timestamp >= cutoff]
        matched = []
        for condition in rule.conditions:
            found = None
            for evt in reversed(window_events):  # newest first
                if self._matches_condition(evt, condition):
                    found = evt
                    break
            if found is None:
                return None  # condition not satisfied
            matched.append(found)
        return matched

    def _matches_condition(self, event: DiagEvent, condition: EventCondition) -> bool:
        """Check if a single event matches a condition."""
        if type(event).__name__ != condition.event_type:
            return False
        if condition.op == "exists":
            return True
        val = getattr(event, condition.field, None)
        if val is None:
            return False
        if condition.op == "==":
            return val == condition.value
        if condition.op == "!=":
            return val != condition.value
        if condition.op == ">":
            return val > condition.value
        if condition.op == "<":
            return val < condition.value
        if condition.op == "contains":
            return condition.value in val if isinstance(val, (str, list)) else False
        return False

    def _check_device_scope(self, rule, events: list[DiagEvent]) -> bool:
        """Verify device scope constraint."""
        if rule.device_scope == "any":
            return True
        if rule.device_scope == "same_device":
            devices = set(e.device_id for e in events if e.device_id)
            return len(devices) <= 1
        if rule.device_scope == "same_bus":
            # Extract bus from BDF (0000:XX:00.0 → XX)
            buses = set(e.device_id.split(":")[1] for e in events
                       if ":" in e.device_id)
            return len(buses) <= 1
        return True

    def _is_in_cooldown(self, key: str, cooldown_sec: float) -> bool:
        last = self._fired.get(key, 0)
        return (time.time() - last) < cooldown_sec

    def _device_key(self, events: list[DiagEvent]) -> str:
        devices = [e.device_id for e in events if e.device_id]
        return devices[0] if devices else "unknown"

    def window_size(self) -> int:
        return len(self._events)
```

---

## Device Scope Matching

| Scope | Meaning | Example |
|-------|---------|---------|
| `any` | Events from any device can correlate | thermal + latency (different subsystems) |
| `same_device` | Events must share the same device_id | AER on 3b:00.0 + fence on 3b:00.0 |
| `same_bus` | Events must be on the same PCIe bus | AER on 3b:00.0 + latency on 3b:00.1 |

---

## Cooldown & Deduplication

```
Scenario: NVMe drive degrading → generates AER + latency events continuously

Without cooldown:
  t=0:  AER+latency → FIRE "nvme_pcie_degradation"
  t=1:  AER+latency → FIRE again
  t=2:  AER+latency → FIRE again (alert flood!)

With cooldown (300s):
  t=0:    AER+latency → FIRE "nvme_pcie_degradation"
  t=1:    AER+latency → suppressed (cooldown active)
  t=300:  AER+latency → FIRE again (cooldown expired, problem persists)
```

---

## Configuration

```yaml
# config/default.yaml (correlator section)
correlator:
  enabled: true
  window_sec: 300              # how far back to look for patterns
  max_window_events: 50000     # memory cap on event buffer
  rules_file: /etc/ebpf-hw-diag/correlation_rules.yaml
  cooldown_sec: 300            # default per-rule cooldown
  log_unmatched: false         # log events that don't match any rule (debug)
```

---

## Performance Characteristics

| Metric | Value | Notes |
|--------|-------|-------|
| Event ingestion | O(1) | Append to deque |
| Rule evaluation | O(R × W) | R=rules, W=window events per rule |
| Memory (10K events) | ~5 MB | Dataclass instances |
| Memory (50K events) | ~25 MB | Upper bound (maxlen) |
| Latency per event | <100 μs | Evaluated inline before exporter |
| Typical rules | 10-20 | More rules = more eval time, but still fast |

---

## Future Enhancements

1. **ML-based correlation** — Learn new patterns from historical data
2. **Temporal patterns** — "A followed by B within 10s" (sequence, not just co-occurrence)
3. **Confidence decay** — Lower confidence if events are far apart in the window
4. **Rule chaining** — CorrelatedEvent can trigger another rule (hierarchical diagnosis)
5. **External enrichment** — Query HAL for device info when correlating (e.g., "are these on same NUMA node?")
