"""Prometheus metrics exporter."""
import logging
import threading
from typing import Optional
from events.base import DiagEvent
from events.pcie import PCIeAEREvent
from events.storage import NVMeLatencyEvent
from events.thermal import ThermalTripEvent

logger = logging.getLogger(__name__)

try:
    from prometheus_client import Counter, Histogram, Gauge, start_http_server
    HAS_PROMETHEUS = True
except ImportError:
    HAS_PROMETHEUS = False


class PrometheusExporter:
    """Exports diagnostic events as Prometheus metrics."""

    def __init__(self, config: dict):
        self._config = config
        self._port = config.get("port", 9101)
        self._enabled = config.get("enabled", True) and HAS_PROMETHEUS
        self._started = False

        if self._enabled:
            self._setup_metrics()

    def _setup_metrics(self):
        """Define Prometheus metrics."""
        self._aer_errors = Counter(
            "diagd_pcie_aer_errors_total",
            "PCIe AER errors by device and severity",
            ["device", "severity"]
        )
        self._nvme_latency = Histogram(
            "diagd_nvme_io_latency_us",
            "NVMe I/O latency in microseconds",
            ["device"],
            buckets=[10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 50000]
        )
        self._thermal_trips = Counter(
            "diagd_thermal_trip_events_total",
            "Thermal trip events by zone and type",
            ["zone", "trip_type"]
        )
        self._events_total = Counter(
            "diagd_events_processed_total",
            "Total events processed by source",
            ["source_probe"]
        )

    def start(self) -> None:
        """Start the HTTP metrics server."""
        if not self._enabled:
            logger.info("PrometheusExporter: disabled (prometheus_client not installed or config)")
            return
        if self._started:
            return
        try:
            start_http_server(self._port)
            self._started = True
            logger.info(f"PrometheusExporter: metrics on :{self._port}/metrics")
        except OSError as e:
            logger.error(f"PrometheusExporter: failed to start on port {self._port}: {e}")

    def stop(self) -> None:
        """Stop exporter (prometheus_client doesn't support clean shutdown)."""
        pass

    def receive(self, event: DiagEvent) -> None:
        """Receive an event and update metrics."""
        if not self._enabled:
            return

        self._events_total.labels(source_probe=event.source_probe).inc()

        if isinstance(event, PCIeAEREvent):
            self._aer_errors.labels(
                device=event.bdf,
                severity=event.severity_name
            ).inc()

        elif isinstance(event, NVMeLatencyEvent):
            self._nvme_latency.labels(device=event.device_id).observe(event.latency_us)

        elif isinstance(event, ThermalTripEvent):
            self._thermal_trips.labels(
                zone=event.zone_name,
                trip_type=event.trip_type_name
            ).inc()
