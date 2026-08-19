"""Detect kernel capabilities for eBPF probe loading."""
import os
import platform
import logging

logger = logging.getLogger(__name__)


class CapabilityDetector:
    """Detect what the current system can support."""

    def __init__(self):
        self._tracepoint_base = self._find_tracepoint_path()

    def _find_tracepoint_path(self) -> str:
        """Find the tracepoint sysfs path."""
        paths = [
            "/sys/kernel/tracing/events",
            "/sys/kernel/debug/tracing/events",
        ]
        for p in paths:
            if os.path.isdir(p):
                return p
        return ""

    def has_tracepoint(self, tp: str) -> bool:
        """Check if a specific tracepoint exists (e.g., 'ras:aer_event')."""
        if not self._tracepoint_base:
            return False
        parts = tp.replace(":", "/")
        path = os.path.join(self._tracepoint_base, parts)
        return os.path.isdir(path)

    def has_bpf_permission(self) -> bool:
        """Check if we can load BPF programs."""
        return os.geteuid() == 0

    def kernel_version(self) -> str:
        """Return running kernel version."""
        return platform.release()

    def has_btf(self) -> bool:
        """Check if kernel has BTF (needed for CO-RE/libbpf)."""
        return os.path.exists("/sys/kernel/btf/vmlinux")

    def detect(self) -> dict:
        """Full capability detection."""
        common_tracepoints = [
            "block:block_rq_issue",
            "block:block_rq_complete",
            "ras:aer_event",
            "ras:mc_event",
            "thermal:thermal_zone_trip",
            "power:cpu_frequency",
            "tcp:tcp_retransmit_skb",
            "irq:irq_handler_entry",
            "dma_fence:dma_fence_signaled",
            "iommu:io_page_fault",
        ]
        available = [tp for tp in common_tracepoints if self.has_tracepoint(tp)]
        missing = [tp for tp in common_tracepoints if not self.has_tracepoint(tp)]

        caps = {
            "kernel_version": self.kernel_version(),
            "has_root": self.has_bpf_permission(),
            "has_btf": self.has_btf(),
            "tracepoint_path": self._tracepoint_base,
            "available_tracepoints": available,
            "missing_tracepoints": missing,
        }
        logger.info(f"Capabilities: {len(available)} tracepoints available, "
                    f"{len(missing)} missing, BTF={'yes' if caps['has_btf'] else 'no'}")
        return caps
