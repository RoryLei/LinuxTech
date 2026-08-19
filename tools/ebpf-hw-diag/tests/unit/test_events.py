"""Unit tests for event types."""
import pytest
from events.base import DiagEvent
from events.pcie import PCIeAEREvent, decode_aer_status, AER_CORRECTABLE, AER_FATAL


class TestDiagEvent:
    def test_default_fields(self):
        evt = DiagEvent()
        assert evt.source_probe == ""
        assert evt.severity == "info"
        assert evt.timestamp > 0

    def test_to_dict(self):
        evt = DiagEvent(source_probe="test", device_id="dev0", severity="warning")
        d = evt.to_dict()
        assert d["source_probe"] == "test"
        assert d["device_id"] == "dev0"


class TestPCIeAEREvent:
    def test_decode_single_correctable(self):
        errors = decode_aer_status(0x00000040, severity=AER_CORRECTABLE)
        assert errors == ["Bad TLP"]

    def test_decode_multiple_correctable(self):
        errors = decode_aer_status(0x000000C0, severity=AER_CORRECTABLE)
        assert "Bad TLP" in errors
        assert "Bad DLLP" in errors

    def test_decode_uncorrectable(self):
        errors = decode_aer_status(0x00040000, severity=AER_FATAL)
        assert errors == ["Malformed TLP"]

    def test_decode_unknown_bits(self):
        errors = decode_aer_status(0x80000000, severity=AER_CORRECTABLE)
        assert "Unknown" in errors[0]

    def test_decode_zero(self):
        errors = decode_aer_status(0x00000000, severity=AER_CORRECTABLE)
        assert len(errors) == 1
        assert "Unknown" in errors[0]

    def test_event_auto_decode(self):
        evt = PCIeAEREvent(bdf="0000:03:00.0", status_raw=0x00000040,
                           severity_code=AER_CORRECTABLE)
        assert "Bad TLP" in evt.errors
        assert evt.device_id == "0000:03:00.0"
        assert evt.severity == "info"

    def test_fatal_severity_mapping(self):
        evt = PCIeAEREvent(bdf="0000:03:00.0", status_raw=0x00040000,
                           severity_code=AER_FATAL)
        assert evt.severity == "critical"
        assert evt.severity_name == "Fatal"
