"""eBPF Hardware Diagnostics Agent — Main Entry Point.

Usage:
    sudo python -m cmd.diagd.main [--config PATH]
"""
import argparse
import logging
import signal
import sys
import time
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from config.loader import load_config, validate_config
from core.event_bus import EventBus
from core.rate_limiter import TokenBucketRateLimiter
from core.probe_manager import ProbeManager
from core.health import HealthCheck
from core.capabilities import CapabilityDetector
from collectors.pcie import PCIeCollector
from collectors.storage import StorageCollector
from collectors.thermal import ThermalCollector
from collectors.network import NetworkCollector
from collectors.memory import MemoryCollector
from exporters.prometheus_exp import PrometheusExporter
from exporters.json_log import JsonLogExporter
from exporters.alerter import AlertEngine
from correlator.engine import CorrelationEngine
from correlator.rules import load_rules_from_yaml

logger = logging.getLogger("diagd")


class DiagnosticsAgent:
    """Main agent: orchestrates probes, collectors, exporters, and correlator."""

    def __init__(self, config: dict):
        self._config = config
        self._running = False
        self._collectors = []

        # Core infrastructure
        rate_limit = config.get("rate_limiting", {}).get("global_max_events_per_sec", 100000)
        self._rate_limiter = TokenBucketRateLimiter(rate=rate_limit, burst=min(rate_limit, 10000))
        self._event_bus = EventBus(rate_limiter=self._rate_limiter)
        self._probe_manager = ProbeManager(config)

        # Exporters
        self._prometheus = PrometheusExporter(config.get("exporters", {}).get("prometheus", {}))
        self._json_log = JsonLogExporter(config.get("exporters", {}).get("json_log", {}))
        self._alerter = AlertEngine(config.get("exporters", {}).get("alerter", {}))

        # Correlator
        correlator_config = config.get("correlator", {})
        rules_file = os.path.join(os.path.dirname(__file__), "../../correlator/builtin_rules.yaml")
        rules = load_rules_from_yaml(rules_file) if correlator_config.get("enabled") else []
        self._correlator = CorrelationEngine(rules=rules, config=correlator_config)

        # Health
        health_config = config.get("health", {})
        self._health = HealthCheck(
            self._probe_manager, self._event_bus,
            port=health_config.get("port", 9102)
        )

    def start(self) -> None:
        """Initialize and start all components."""
        logger.info("=" * 60)
        logger.info("  eBPF Hardware Diagnostics Agent")
        logger.info("=" * 60)

        # Check capabilities
        caps = CapabilityDetector()
        cap_info = caps.detect()
        if not cap_info["has_root"]:
            logger.error("Root privileges required for eBPF. Run with sudo.")
            sys.exit(1)

        logger.info(f"Kernel: {cap_info['kernel_version']}")
        logger.info(f"BTF: {'available' if cap_info['has_btf'] else 'not available'}")
        logger.info(f"Tracepoints: {len(cap_info['available_tracepoints'])} available")

        # Register exporters on the event bus
        self._event_bus.register(self._prometheus)
        self._event_bus.register(self._json_log)
        self._event_bus.register(self._alerter)
        self._event_bus.register(self._correlator)

        # Correlator emits back to bus (for correlated events to reach exporters)
        self._correlator.set_emit_callback(lambda evt: self._event_bus.emit(evt))

        # Start exporters
        self._prometheus.start()
        self._json_log.start()
        self._alerter.start()

        # Start health endpoint
        if self._config.get("health", {}).get("enabled", True):
            self._health.start()

        # Start collectors based on config
        self._start_collectors()

        self._running = True
        logger.info(f"Agent started: {len(self._collectors)} collectors active")
        logger.info("Waiting for hardware events... (Ctrl+C to stop)")

    def _start_collectors(self) -> None:
        """Initialize and start enabled collectors."""
        collectors_config = self._config.get("collectors", {})

        # PCIe AER
        if collectors_config.get("pcie", {}).get("enabled", False):
            pcie = PCIeCollector(
                config=collectors_config["pcie"],
                event_bus=self._event_bus,
                probe_manager=self._probe_manager,
            )
            if pcie.start():
                self._collectors.append(pcie)

        # Storage (NVMe latency + block errors)
        if collectors_config.get("storage", {}).get("enabled", False):
            storage = StorageCollector(
                config=collectors_config["storage"],
                event_bus=self._event_bus,
                probe_manager=self._probe_manager,
            )
            if storage.start():
                self._collectors.append(storage)

        # Thermal (throttle events + CPU freq)
        if collectors_config.get("thermal", {}).get("enabled", False):
            thermal = ThermalCollector(
                config=collectors_config["thermal"],
                event_bus=self._event_bus,
                probe_manager=self._probe_manager,
            )
            if thermal.start():
                self._collectors.append(thermal)

        # Network (TCP retransmissions)
        if collectors_config.get("network", {}).get("enabled", False):
            network = NetworkCollector(
                config=collectors_config["network"],
                event_bus=self._event_bus,
                probe_manager=self._probe_manager,
            )
            if network.start():
                self._collectors.append(network)

        # Memory (ECC/MCE errors)
        if collectors_config.get("memory", {}).get("enabled", False):
            memory = MemoryCollector(
                config=collectors_config["memory"],
                event_bus=self._event_bus,
                probe_manager=self._probe_manager,
            )
            if memory.start():
                self._collectors.append(memory)

    def run(self) -> None:
        """Main event loop — poll all collectors."""
        poll_interval = self._config.get("agent", {}).get("poll_interval_ms", 1000) / 1000.0

        while self._running:
            for collector in self._collectors:
                try:
                    collector.poll()
                except Exception as e:
                    logger.error(f"Collector {collector.name} poll error: {e}")

            # Flush JSON log periodically
            self._json_log.flush()

            # Sleep for remaining time (if poll was fast)
            time.sleep(poll_interval)

    def stop(self) -> None:
        """Graceful shutdown."""
        logger.info("Shutting down...")
        self._running = False

        # Stop collectors
        for collector in self._collectors:
            try:
                collector.stop()
            except Exception as e:
                logger.error(f"Error stopping {collector.name}: {e}")

        # Stop exporters
        self._prometheus.stop()
        self._json_log.stop()
        self._alerter.stop()
        self._health.stop()

        # Unload all probes
        self._probe_manager.unload_all()

        # Print summary
        stats = self._event_bus.stats
        logger.info(f"Events processed: {stats['events_dispatched']}")
        logger.info(f"Events dropped (rate limit): {stats['events_dropped_rate_limit']}")
        logger.info(f"Consumer errors: {stats['consumer_errors']}")
        logger.info("Agent stopped.")


def main():
    parser = argparse.ArgumentParser(description="eBPF HW Diagnostics Agent")
    parser.add_argument("--config", default="config/default.yaml",
                        help="Path to config file (default: config/default.yaml)")
    parser.add_argument("--log-level", default=None,
                        help="Override log level (debug/info/warning/error)")
    args = parser.parse_args()

    # Load config
    config = load_config(args.config)
    config = validate_config(config)

    # Setup logging
    log_level = args.log_level or config.get("agent", {}).get("log_level", "info")
    logging.basicConfig(
        level=getattr(logging, log_level.upper(), logging.INFO),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )

    # Create and run agent
    agent = DiagnosticsAgent(config)

    # Handle signals for graceful shutdown
    def signal_handler(sig, frame):
        agent.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    agent.start()
    agent.run()


if __name__ == "__main__":
    main()
