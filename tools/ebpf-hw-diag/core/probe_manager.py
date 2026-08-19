"""Probe lifecycle management: load, attach, health check, unload."""
import logging
from dataclasses import dataclass
from typing import Dict, Optional, Any
from core.capabilities import CapabilityDetector

logger = logging.getLogger(__name__)


@dataclass
class ProbeLoadResult:
    """Result of attempting to load a probe."""
    success: bool
    probe_name: str
    reason: str = ""
    bpf_object: Any = None


class ProbeManager:
    """Manages eBPF probe lifecycle with graceful degradation."""

    def __init__(self, config: dict):
        self._config = config
        self._loaded_probes: Dict[str, Any] = {}
        self._failed_probes: Dict[str, str] = {}
        self._capabilities = CapabilityDetector()
        self._is_running = True

    def try_load(self, probe_name: str, bpf_text: str = "",
                 tracepoint: str = "") -> ProbeLoadResult:
        """Attempt to load a probe; graceful failure if not possible."""
        # Check if tracepoint exists
        if tracepoint and not self._capabilities.has_tracepoint(tracepoint):
            reason = f"tracepoint_not_found: {tracepoint}"
            self._failed_probes[probe_name] = reason
            logger.warning(f"Probe {probe_name}: {reason}")
            return ProbeLoadResult(success=False, probe_name=probe_name, reason=reason)

        # Check permissions
        if not self._capabilities.has_bpf_permission():
            reason = "insufficient_permissions (need root or CAP_BPF)"
            self._failed_probes[probe_name] = reason
            logger.error(f"Probe {probe_name}: {reason}")
            return ProbeLoadResult(success=False, probe_name=probe_name, reason=reason)

        # Attempt BCC load
        try:
            from bcc import BPF
            bpf = BPF(text=bpf_text)
            self._loaded_probes[probe_name] = bpf
            logger.info(f"Probe {probe_name}: loaded successfully")
            return ProbeLoadResult(success=True, probe_name=probe_name, bpf_object=bpf)
        except ImportError:
            reason = "bcc_not_installed"
            self._failed_probes[probe_name] = reason
            logger.error(f"Probe {probe_name}: BCC not installed")
            return ProbeLoadResult(success=False, probe_name=probe_name, reason=reason)
        except Exception as e:
            reason = f"load_failed: {e}"
            self._failed_probes[probe_name] = reason
            logger.error(f"Probe {probe_name}: {reason}")
            return ProbeLoadResult(success=False, probe_name=probe_name, reason=reason)

    def unload(self, probe_name: str) -> None:
        """Unload a probe and free resources."""
        if probe_name in self._loaded_probes:
            del self._loaded_probes[probe_name]
            logger.info(f"Probe {probe_name}: unloaded")

    def unload_all(self) -> None:
        """Unload all probes (shutdown)."""
        for name in list(self._loaded_probes.keys()):
            self.unload(name)
        self._is_running = False

    @property
    def is_running(self) -> bool:
        return self._is_running

    @property
    def loaded_count(self) -> int:
        return len(self._loaded_probes)

    @property
    def failed_count(self) -> int:
        return len(self._failed_probes)

    def get_status(self) -> dict:
        return {
            "loaded": list(self._loaded_probes.keys()),
            "failed": dict(self._failed_probes),
        }
