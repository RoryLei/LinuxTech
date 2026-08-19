"""Configuration loader with YAML parsing and environment overrides."""
import os
import logging
from pathlib import Path
from typing import Any, Dict

logger = logging.getLogger(__name__)


class ConfigError(Exception):
    """Configuration validation error."""
    pass


# Default configuration (used when no file found)
DEFAULTS: Dict[str, Any] = {
    "agent": {
        "log_level": "info",
        "poll_interval_ms": 1000,
    },
    "collectors": {
        "storage": {"enabled": True, "latency_threshold_us": 5000, "devices": ["nvme*"]},
        "pcie": {"enabled": True, "severity_filter": "all"},
        "network": {"enabled": False, "retransmit_alert_rate": 100},
        "thermal": {"enabled": True, "throttle_alert": True},
        "gpu": {"enabled": False, "fence_timeout_ms": 5000},
        "memory": {"enabled": True, "mce_alert": True},
    },
    "exporters": {
        "prometheus": {"enabled": True, "port": 9101, "path": "/metrics"},
        "json_log": {"enabled": True, "output": "/var/log/ebpf-hw-diag/events.jsonl", "rotate_mb": 100},
        "alerter": {"enabled": False, "rules_file": "config/alert_rules.yaml", "backends": []},
    },
    "correlator": {
        "enabled": True,
        "window_sec": 300,
        "max_window_events": 50000,
        "cooldown_sec": 300,
    },
    "rate_limiting": {
        "global_max_events_per_sec": 100000,
        "per_collector": {
            "storage": 50000,
            "pcie": 10000,
            "network": 50000,
            "thermal": 1000,
            "memory": 5000,
        },
    },
    "health": {
        "enabled": True,
        "port": 9102,
    },
}


def _deep_merge(base: dict, override: dict) -> dict:
    """Deep merge override into base (override wins)."""
    result = base.copy()
    for key, val in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(val, dict):
            result[key] = _deep_merge(result[key], val)
        else:
            result[key] = val
    return result


def _apply_env_overrides(config: dict) -> dict:
    """Apply environment variable overrides."""
    env_map = {
        "DIAG_LOG_LEVEL": ("agent", "log_level"),
        "DIAG_PROMETHEUS_PORT": ("exporters", "prometheus", "port"),
        "DIAG_HEALTH_PORT": ("health", "port"),
        "DIAG_JSON_LOG_OUTPUT": ("exporters", "json_log", "output"),
    }
    for env_var, path in env_map.items():
        value = os.environ.get(env_var)
        if value is not None:
            # Navigate to the right place and set
            obj = config
            for key in path[:-1]:
                obj = obj.setdefault(key, {})
            # Try to preserve type
            final_key = path[-1]
            if final_key in obj and isinstance(obj[final_key], int):
                obj[final_key] = int(value)
            else:
                obj[final_key] = value
    return config


def load_config(path: str) -> dict:
    """Load config from YAML file, merge with defaults, apply env overrides."""
    config = DEFAULTS.copy()

    config_path = Path(path)
    if config_path.exists():
        try:
            import yaml
            with open(config_path) as f:
                file_config = yaml.safe_load(f) or {}
            config = _deep_merge(config, file_config)
            logger.info(f"Loaded config from {path}")
        except Exception as e:
            logger.warning(f"Failed to load config from {path}: {e}, using defaults")
    else:
        logger.info(f"Config file {path} not found, using defaults")

    config = _apply_env_overrides(config)
    return config


def validate_config(config: dict) -> dict:
    """Validate configuration values."""
    # Check required structure
    if "agent" not in config:
        raise ConfigError("Missing 'agent' section")
    if "collectors" not in config:
        raise ConfigError("Missing 'collectors' section")

    # Validate log level
    valid_levels = {"debug", "info", "warning", "error", "critical"}
    level = config["agent"].get("log_level", "info")
    if level not in valid_levels:
        raise ConfigError(f"Invalid log_level: {level}. Must be one of {valid_levels}")

    # Validate collector enabled flags are booleans
    for name, coll_cfg in config.get("collectors", {}).items():
        if not isinstance(coll_cfg.get("enabled", True), bool):
            raise ConfigError(f"collectors.{name}.enabled must be boolean")

    # Validate ports are integers
    for section in ["prometheus", "json_log"]:
        port = config.get("exporters", {}).get(section, {}).get("port")
        if port is not None and not isinstance(port, int):
            raise ConfigError(f"exporters.{section}.port must be integer")

    return config
