"""Unit tests for the CLI module (scanners, output, command dispatch)."""
import io
import json

from cli import scanners
from cli import output
from cli.scanners import Finding
from cli import main as cli_main


# ---------------------------------------------------------------------------
# Scanner tests — driven off fake sysfs trees under tmp_path
# ---------------------------------------------------------------------------

class TestPCIeScanner:
    def _make_dev(self, root, bdf, correctable=None, fatal=None):
        dev = root / bdf
        dev.mkdir(parents=True)
        if correctable is not None:
            dev.joinpath("aer_dev_correctable").write_text(correctable)
        if fatal is not None:
            dev.joinpath("aer_dev_fatal").write_text(fatal)
        return dev

    def test_no_errors_reports_ok(self, tmp_path):
        self._make_dev(tmp_path, "0000:00:00.0",
                       correctable="RxErr 0\nBadTLP 0\n")
        findings = scanners.scan_pcie(str(tmp_path))
        assert len(findings) == 1
        assert findings[0].severity == "ok"

    def test_correctable_errors_warn(self, tmp_path):
        self._make_dev(tmp_path, "0000:03:00.0",
                       correctable="RxErr 5\nBadTLP 2\n")
        findings = scanners.scan_pcie(str(tmp_path))
        dev = [f for f in findings if f.device == "0000:03:00.0"]
        assert len(dev) == 1
        assert dev[0].severity == "warning"
        assert dev[0].metrics["correctable"] == 7

    def test_fatal_errors_critical(self, tmp_path):
        self._make_dev(tmp_path, "0000:03:00.0",
                       correctable="RxErr 1\n", fatal="MalfTLP 3\n")
        findings = scanners.scan_pcie(str(tmp_path))
        dev = [f for f in findings if f.device == "0000:03:00.0"][0]
        assert dev.severity == "critical"

    def test_missing_root_returns_empty(self, tmp_path):
        findings = scanners.scan_pcie(str(tmp_path / "does-not-exist"))
        assert findings == []


class TestMemoryScanner:
    def _make_mc(self, root, name, ce, ue):
        mc = root / name
        mc.mkdir(parents=True)
        mc.joinpath("ce_count").write_text(str(ce))
        mc.joinpath("ue_count").write_text(str(ue))

    def test_clean_memory_ok(self, tmp_path):
        self._make_mc(tmp_path, "mc0", 0, 0)
        findings = scanners.scan_memory(str(tmp_path))
        assert findings[0].severity == "ok"

    def test_corrected_errors_warn(self, tmp_path):
        self._make_mc(tmp_path, "mc0", 12, 0)
        findings = scanners.scan_memory(str(tmp_path))
        assert findings[0].severity == "warning"
        assert findings[0].metrics["ce_count"] == 12

    def test_uncorrected_errors_critical(self, tmp_path):
        self._make_mc(tmp_path, "mc0", 0, 3)
        findings = scanners.scan_memory(str(tmp_path))
        assert findings[0].severity == "critical"

    def test_no_edac_is_info(self, tmp_path):
        findings = scanners.scan_memory(str(tmp_path / "missing"))
        assert findings[0].severity == "info"


class TestThermalScanner:
    def _make_zone(self, root, idx, temp_mc, crit_mc=None):
        zone = root / f"thermal_zone{idx}"
        zone.mkdir(parents=True)
        zone.joinpath("temp").write_text(str(temp_mc))
        zone.joinpath("type").write_text("x86_pkg_temp")
        if crit_mc is not None:
            zone.joinpath("trip_point_0_type").write_text("critical")
            zone.joinpath("trip_point_0_temp").write_text(str(crit_mc))

    def test_cool_zone_ok(self, tmp_path):
        self._make_zone(tmp_path, 0, 45000, crit_mc=100000)
        findings = scanners.scan_thermal(str(tmp_path))
        assert findings[0].severity == "ok"
        assert findings[0].metrics["temp_c"] == 45.0

    def test_near_critical_warns(self, tmp_path):
        self._make_zone(tmp_path, 0, 97000, crit_mc=100000)  # 3C headroom
        findings = scanners.scan_thermal(str(tmp_path))
        assert findings[0].severity == "warning"

    def test_over_critical_is_critical(self, tmp_path):
        self._make_zone(tmp_path, 0, 101000, crit_mc=100000)
        findings = scanners.scan_thermal(str(tmp_path))
        assert findings[0].severity == "critical"


class TestNetworkScanner:
    def _make_iface(self, root, name, operstate="up", rx_err=0, tx_err=0):
        iface = root / name
        (iface / "statistics").mkdir(parents=True)
        iface.joinpath("operstate").write_text(operstate)
        iface.joinpath("statistics", "rx_errors").write_text(str(rx_err))
        iface.joinpath("statistics", "tx_errors").write_text(str(tx_err))
        iface.joinpath("statistics", "rx_dropped").write_text("0")
        iface.joinpath("statistics", "tx_dropped").write_text("0")

    def test_healthy_iface_ok(self, tmp_path):
        self._make_iface(tmp_path, "eth0")
        findings = scanners.scan_network(str(tmp_path))
        assert findings[0].severity == "ok"

    def test_errors_warn(self, tmp_path):
        self._make_iface(tmp_path, "eth0", rx_err=10)
        findings = scanners.scan_network(str(tmp_path))
        assert findings[0].severity == "warning"

    def test_loopback_skipped(self, tmp_path):
        self._make_iface(tmp_path, "lo")
        self._make_iface(tmp_path, "eth0")
        findings = scanners.scan_network(str(tmp_path))
        assert all(f.device != "lo" for f in findings)


class TestScannerRegistry:
    def test_run_scanners_unknown_ignored(self):
        findings = scanners.run_scanners(["not-a-real-subsystem"])
        assert findings == []

    def test_run_scanners_aggregates(self):
        # Real scanners against the live system; just assert it does not raise
        # and returns findings for each requested subsystem.
        findings = scanners.run_scanners(["pcie", "memory"])
        subs = {f.subsystem for f in findings}
        assert "pcie" in subs
        assert "memory" in subs


# ---------------------------------------------------------------------------
# Output tests
# ---------------------------------------------------------------------------

class TestOutput:
    def test_summarize_counts(self):
        findings = [
            Finding("pcie", "a", "ok", "x"),
            Finding("memory", "b", "warning", "y"),
            Finding("thermal", "c", "critical", "z"),
        ]
        s = output.summarize(findings)
        assert s["total"] == 3
        assert s["worst_severity"] == "critical"
        assert s["by_severity"]["warning"] == 1

    def test_text_output_has_labels_not_only_color(self):
        # A non-TTY StringIO stream must not emit ANSI codes, and must still
        # carry the explicit word label (accessibility requirement).
        findings = [Finding("memory", "mc0", "critical", "UE=3")]
        stream = io.StringIO()
        text = output.format_findings_text(findings, stream)
        assert "CRIT" in text
        assert "\033[" not in text  # no color codes on non-tty

    def test_json_output_roundtrip(self):
        findings = [Finding("pcie", "0000:03:00.0", "warning", "5 errors",
                            metrics={"correctable": 5})]
        summary = output.summarize(findings)
        doc = json.loads(output.format_findings_json(findings, summary))
        assert doc["summary"]["total"] == 1
        assert doc["findings"][0]["metrics"]["correctable"] == 5


# ---------------------------------------------------------------------------
# Command dispatch / exit code tests
# ---------------------------------------------------------------------------

class TestCommandDispatch:
    def test_check_healthy_exit_zero(self, monkeypatch):
        monkeypatch.setattr(scanners, "run_scanners",
                            lambda subs: [Finding("pcie", "all", "ok", "clean")])
        assert cli_main.main(["check", "--pcie"]) == cli_main.EXIT_OK

    def test_check_fail_on_warning(self, monkeypatch):
        monkeypatch.setattr(scanners, "run_scanners",
                            lambda subs: [Finding("memory", "mc0", "warning", "CE=5")])
        rc = cli_main.main(["check", "--memory", "--fail-on", "warning"])
        assert rc == cli_main.EXIT_WARNING

    def test_check_fail_on_critical(self, monkeypatch):
        monkeypatch.setattr(scanners, "run_scanners",
                            lambda subs: [Finding("memory", "mc0", "critical", "UE=1")])
        rc = cli_main.main(["check", "--memory", "--fail-on", "critical"])
        assert rc == cli_main.EXIT_CRITICAL

    def test_check_json_flag(self, monkeypatch, capsys):
        monkeypatch.setattr(scanners, "run_scanners",
                            lambda subs: [Finding("pcie", "all", "ok", "clean")])
        cli_main.main(["check", "--pcie", "--json"])
        out = capsys.readouterr().out
        doc = json.loads(out)
        assert doc["summary"]["worst_severity"] == "ok"

    def test_caps_runs(self):
        assert cli_main.main(["caps"]) == cli_main.EXIT_OK

    def test_config_validate_ok(self):
        assert cli_main.main(["config", "--validate"]) == cli_main.EXIT_OK

    def test_no_subcommand_errors(self):
        # argparse exits with SystemExit(2) when a required subcommand is missing
        try:
            cli_main.main([])
            assert False, "expected SystemExit"
        except SystemExit as e:
            assert e.code == 2
