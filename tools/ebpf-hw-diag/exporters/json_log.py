"""JSON log exporter — writes events as single-line JSONL."""
import json
import os
import logging
from datetime import datetime, timezone
from typing import Optional, IO
from events.base import DiagEvent

logger = logging.getLogger(__name__)


class JsonLogExporter:
    """Writes diagnostic events as newline-delimited JSON (JSONL)."""

    def __init__(self, config: dict):
        self._config = config
        self._output_path = config.get("output", "/var/log/ebpf-hw-diag/events.jsonl")
        self._rotate_mb = config.get("rotate_mb", 100)
        self._enabled = config.get("enabled", True)
        self._file: Optional[IO] = None
        self._bytes_written = 0

    def start(self) -> None:
        """Open the log file."""
        if not self._enabled:
            logger.info("JsonLogExporter: disabled")
            return
        try:
            os.makedirs(os.path.dirname(self._output_path), exist_ok=True)
            self._file = open(self._output_path, "a")
            logger.info(f"JsonLogExporter: writing to {self._output_path}")
        except OSError as e:
            logger.warning(f"JsonLogExporter: cannot open {self._output_path}: {e}, using stdout")
            self._file = None

    def stop(self) -> None:
        """Close the log file."""
        if self._file:
            self._file.close()
            self._file = None

    def receive(self, event: DiagEvent) -> None:
        """Receive an event and write as JSON line."""
        if not self._enabled:
            return

        record = event.to_dict()
        record["@timestamp"] = datetime.now(timezone.utc).isoformat(timespec="milliseconds")
        record["event_type"] = type(event).__name__

        line = json.dumps(record, default=str) + "\n"

        if self._file:
            self._file.write(line)
            self._bytes_written += len(line)
            self._check_rotate()
        else:
            # Fallback to stdout
            print(line, end="", flush=True)

    def flush(self) -> None:
        """Flush the file buffer."""
        if self._file:
            self._file.flush()

    def _check_rotate(self) -> None:
        """Rotate log file if it exceeds max size."""
        max_bytes = self._rotate_mb * 1024 * 1024
        if self._bytes_written >= max_bytes:
            self._file.close()
            rotated = self._output_path + ".1"
            if os.path.exists(rotated):
                os.remove(rotated)
            os.rename(self._output_path, rotated)
            self._file = open(self._output_path, "a")
            self._bytes_written = 0
            logger.info(f"JsonLogExporter: rotated to {rotated}")
