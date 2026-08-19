/*
 * nvme_latency.bpf.c — NVMe I/O Latency Probe
 *
 * Attaches to block:block_rq_issue and block:block_rq_complete
 * to measure per-device I/O latency.
 *
 * Tracepoints: block:block_rq_issue, block:block_rq_complete
 * Kernel requirement: >= 4.10
 */

#include <uapi/linux/ptrace.h>

struct latency_event_t {
    char   device[32];
    u64    latency_ns;
    u32    opcode;       /* read=0, write=1 */
    u32    bytes;
};

BPF_HASH(start_time, u64, u64);
BPF_PERF_OUTPUT(latency_events);
BPF_HISTOGRAM(latency_hist, u64);

TRACEPOINT_PROBE(block, block_rq_issue) {
    u64 key = (u64)args->sector;
    u64 ts = bpf_ktime_get_ns();
    start_time.update(&key, &ts);
    return 0;
}

TRACEPOINT_PROBE(block, block_rq_complete) {
    u64 key = (u64)args->sector;
    u64 *tsp = start_time.lookup(&key);
    if (!tsp)
        return 0;

    u64 delta = bpf_ktime_get_ns() - *tsp;
    start_time.delete(&key);

    /* Log2 histogram for quick overview */
    latency_hist.log2l(delta / 1000);  /* microseconds */

    /* Detailed event if latency > 1ms (configurable threshold) */
    if (delta > 1000000) {
        struct latency_event_t evt = {};
        evt.latency_ns = delta;
        evt.bytes = args->nr_sector * 512;
        latency_events.perf_submit(args, &evt, sizeof(evt));
    }

    return 0;
}
