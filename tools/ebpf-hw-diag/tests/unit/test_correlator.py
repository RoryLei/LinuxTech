"""Unit tests for correlation engine."""
import time
import pytest
from correlator.engine import CorrelationEngine
from correlator.rules import CorrelationRule, EventCondition
from events.pcie import PCIeAEREvent, AER_FATAL
from events.storage import NVMeLatencyEvent
from events.thermal import ThermalTripEvent


def make_rules():
    return [
        CorrelationRule(
            name="thermal_io_stall",
            conditions=[
                EventCondition(event_type="ThermalTripEvent", field="trip_type", op="<=", value=1),
                EventCondition(event_type="NVMeLatencyEvent", field="latency_us", op=">", value=5000),
            ],
            time_window_sec=60,
            device_scope="any",
            root_cause="Thermal throttle causing I/O stall",
            recommended_action="Fix cooling",
            confidence=0.85,
            cooldown_sec=5,
        ),
    ]


class TestCorrelationEngine:
    def test_no_match_single_event(self):
        engine = CorrelationEngine(rules=make_rules(), config={"enabled": True, "window_sec": 120})
        results = []
        engine.set_emit_callback(lambda e: results.append(e))
        engine.receive(ThermalTripEvent(zone_name="pkg", trip_type=1, temperature_mdeg=95000))
        assert len(results) == 0

    def test_match_fires_correlation(self):
        engine = CorrelationEngine(rules=make_rules(), config={"enabled": True, "window_sec": 120})
        results = []
        engine.set_emit_callback(lambda e: results.append(e))
        engine.receive(ThermalTripEvent(zone_name="pkg", trip_type=1, temperature_mdeg=95000))
        engine.receive(NVMeLatencyEvent(device_id="nvme0n1", latency_us=10000))
        assert len(results) == 1
        assert results[0].root_cause == "Thermal throttle causing I/O stall"
        assert results[0].confidence == 0.85

    def test_cooldown_prevents_repeat(self):
        engine = CorrelationEngine(rules=make_rules(), config={"enabled": True, "window_sec": 120})
        results = []
        engine.set_emit_callback(lambda e: results.append(e))
        # First pair fires
        engine.receive(ThermalTripEvent(zone_name="pkg", trip_type=0, temperature_mdeg=100000))
        engine.receive(NVMeLatencyEvent(device_id="nvme0n1", latency_us=8000))
        assert len(results) == 1
        # Second pair within cooldown does NOT fire
        engine.receive(ThermalTripEvent(zone_name="pkg", trip_type=0, temperature_mdeg=100000))
        engine.receive(NVMeLatencyEvent(device_id="nvme0n1", latency_us=8000))
        assert len(results) == 1  # still 1

    def test_disabled_engine(self):
        engine = CorrelationEngine(rules=make_rules(), config={"enabled": False})
        results = []
        engine.set_emit_callback(lambda e: results.append(e))
        engine.receive(ThermalTripEvent(zone_name="pkg", trip_type=0, temperature_mdeg=100000))
        engine.receive(NVMeLatencyEvent(device_id="nvme0n1", latency_us=8000))
        assert len(results) == 0

    def test_window_size(self):
        engine = CorrelationEngine(rules=make_rules(), config={"enabled": True, "window_sec": 120})
        for i in range(100):
            engine.receive(NVMeLatencyEvent(device_id="nvme0n1", latency_us=50))
        assert engine.window_size() == 100


class TestEventCondition:
    def test_exists_match(self):
        cond = EventCondition(event_type="PCIeAEREvent")
        evt = PCIeAEREvent(bdf="0000:03:00.0", status_raw=0x40, severity_code=2)
        assert cond.matches(evt) is True

    def test_type_mismatch(self):
        cond = EventCondition(event_type="PCIeAEREvent")
        evt = NVMeLatencyEvent(device_id="nvme0n1", latency_us=50)
        assert cond.matches(evt) is False

    def test_field_gt(self):
        cond = EventCondition(event_type="NVMeLatencyEvent", field="latency_us", op=">", value=1000)
        assert cond.matches(NVMeLatencyEvent(latency_us=5000)) is True
        assert cond.matches(NVMeLatencyEvent(latency_us=500)) is False

    def test_field_eq(self):
        cond = EventCondition(event_type="PCIeAEREvent", field="severity_code", op="==", value=1)
        assert cond.matches(PCIeAEREvent(severity_code=AER_FATAL, status_raw=0x10)) is True
        assert cond.matches(PCIeAEREvent(severity_code=2, status_raw=0x40)) is False

    def test_field_contains(self):
        cond = EventCondition(event_type="PCIeAEREvent", field="errors", op="contains", value="Bad TLP")
        evt = PCIeAEREvent(bdf="dev", status_raw=0x40, severity_code=2)
        assert cond.matches(evt) is True
