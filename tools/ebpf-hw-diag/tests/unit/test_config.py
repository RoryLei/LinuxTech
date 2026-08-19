"""Unit tests for configuration loading."""
import pytest
import os
from config.loader import load_config, validate_config, ConfigError


class TestConfigLoader:
    def test_load_defaults_when_missing(self):
        config = load_config("/nonexistent/path.yaml")
        assert config["agent"]["log_level"] == "info"
        assert config["collectors"]["pcie"]["enabled"] is True

    def test_load_from_file(self, tmp_path):
        cfg_file = tmp_path / "test.yaml"
        cfg_file.write_text("agent:\n  log_level: debug\n")
        config = load_config(str(cfg_file))
        assert config["agent"]["log_level"] == "debug"
        # Other defaults preserved
        assert config["collectors"]["pcie"]["enabled"] is True

    def test_env_override(self, tmp_path, monkeypatch):
        cfg_file = tmp_path / "test.yaml"
        cfg_file.write_text("agent:\n  log_level: info\n")
        monkeypatch.setenv("DIAG_LOG_LEVEL", "warning")
        config = load_config(str(cfg_file))
        assert config["agent"]["log_level"] == "warning"

    def test_validate_valid_config(self):
        config = load_config("/nonexistent")
        result = validate_config(config)
        assert result is not None

    def test_validate_invalid_log_level(self):
        config = load_config("/nonexistent")
        config["agent"]["log_level"] = "banana"
        with pytest.raises(ConfigError):
            validate_config(config)

    def test_validate_invalid_enabled_type(self):
        config = load_config("/nonexistent")
        config["collectors"]["pcie"]["enabled"] = "yes"
        with pytest.raises(ConfigError):
            validate_config(config)
