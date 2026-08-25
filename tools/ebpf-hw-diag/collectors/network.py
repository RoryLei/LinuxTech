"""TCP retransmission collector for network fabric monitoring."""
import logging
import struct
import socket
from collectors.base import BaseCollector
from events.network import TCPRetransmitEvent
from core.event_bus import EventBus
from core.probe_manager import ProbeManager

logger = logging.getLogger(__name__)

NETWORK_BPF_PROGRAM = r"""
#include <uapi/linux/ptrace.h>
#include <net/sock.h>

struct retrans_event_t {
    u32    saddr;
    u32    daddr;
    u16    sport;
    u16    dport;
    u8     state;
};

BPF_PERF_OUTPUT(retrans_events);
BPF_HASH(retrans_count, u64, u64);

TRACEPOINT_PROBE(tcp, tcp_retransmit_skb) {
    struct retrans_event_t evt = {};
    evt.saddr = args->saddr;
    evt.daddr = args->daddr;
    evt.sport = args->sport;
    evt.dport = args->dport;
    evt.state = args->state;

    retrans_events.perf_submit(args, &evt, sizeof(evt));

    // Aggregate count by destination
    u64 key = ((u64)evt.daddr << 16) | evt.dport;
    u64 *count = retrans_count.lookup_or_try_init(&key, &(u64){0});
    if (count)
        __sync_fetch_and_add(count, 1);

    return 0;
}
"""


def _int_to_ip(addr: int) -> str:
    """Convert u32 to dotted IPv4 string (network byte order)."""
    return socket.inet_ntoa(struct.pack("I", addr))


class NetworkCollector(BaseCollector):
    """Monitors TCP retransmissions (critical for AI training fabric)."""

    def __init__(self, config: dict, event_bus: EventBus, probe_manager: ProbeManager):
        super().__init__(config, event_bus, probe_manager)
        self._bpf = None
        self._alert_rate = config.get("retransmit_alert_rate", 100)

    def start(self) -> bool:
        if not self.enabled:
            logger.info("NetworkCollector: disabled in config")
            return False

        result = self._probe_manager.try_load(
            probe_name="tcp_retrans",
            bpf_text=NETWORK_BPF_PROGRAM,
            tracepoint="tcp:tcp_retransmit_skb",
        )

        if not result.success:
            logger.warning(f"NetworkCollector: failed to load probe: {result.reason}")
            return False

        self._bpf = result.bpf_object
        self._bpf["retrans_events"].open_perf_buffer(self._handle_retrans)

        self._running = True
        logger.info("NetworkCollector: started")
        return True

    def stop(self) -> None:
        self._running = False
        self._probe_manager.unload("tcp_retrans")
        self._bpf = None
        logger.info("NetworkCollector: stopped")

    def poll(self) -> None:
        if self._bpf and self._running:
            self._bpf.perf_buffer_poll(timeout=100)

    def _handle_retrans(self, cpu, data, size) -> None:
        evt = self._bpf["retrans_events"].event(data)
        src_addr = _int_to_ip(evt.saddr)
        dst_addr = _int_to_ip(evt.daddr)

        event = TCPRetransmitEvent(
            device_id=f"{dst_addr}:{evt.dport}",
            src_addr=src_addr,
            dst_addr=dst_addr,
            src_port=evt.sport,
            dst_port=evt.dport,
            state=evt.state,
            severity="warning",
        )
        self._emit(event)
