"""Health check and self-monitoring."""
import time
import threading
import json
import logging
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Optional

logger = logging.getLogger(__name__)


class HealthCheck:
    """Agent self-monitoring with /healthz HTTP endpoint."""

    def __init__(self, probe_manager, event_bus, port: int = 9102):
        self._probe_manager = probe_manager
        self._event_bus = event_bus
        self._port = port
        self._start_time = time.time()
        self._server: Optional[HTTPServer] = None
        self._thread: Optional[threading.Thread] = None

    def start(self) -> None:
        """Start the health check HTTP server in background."""
        handler = self._make_handler()
        try:
            self._server = HTTPServer(("0.0.0.0", self._port), handler)
            self._thread = threading.Thread(target=self._server.serve_forever, daemon=True)
            self._thread.start()
            logger.info(f"Health endpoint listening on :{self._port}/healthz")
        except OSError as e:
            logger.warning(f"Could not start health endpoint: {e}")

    def stop(self) -> None:
        """Stop the health server."""
        if self._server:
            self._server.shutdown()

    def get_status(self) -> dict:
        """Return current health status."""
        probe_status = self._probe_manager.get_status()
        bus_stats = self._event_bus.stats
        return {
            "status": "healthy" if self._probe_manager.is_running else "unhealthy",
            "uptime_seconds": int(time.time() - self._start_time),
            "probes_loaded": self._probe_manager.loaded_count,
            "probes_failed": self._probe_manager.failed_count,
            "events_dispatched": bus_stats.get("events_dispatched", 0),
            "events_dropped": bus_stats.get("events_dropped_rate_limit", 0),
            "consumer_errors": bus_stats.get("consumer_errors", 0),
        }

    def _make_handler(self):
        health_check = self

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                if self.path == "/healthz":
                    status = health_check.get_status()
                    code = 200 if status["status"] == "healthy" else 503
                    self.send_response(code)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json.dumps(status).encode())
                else:
                    self.send_response(404)
                    self.end_headers()

            def log_message(self, format, *args):
                pass  # suppress HTTP access logs

        return Handler
