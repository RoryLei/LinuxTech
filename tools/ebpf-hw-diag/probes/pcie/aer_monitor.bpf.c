/*
 * aer_monitor.bpf.c — PCIe AER Error Monitor eBPF Probe
 *
 * Attaches to the ras:aer_event tracepoint to capture PCIe Advanced
 * Error Reporting events in real-time.
 *
 * This file is the standalone .bpf.c source for reference and
 * future libbpf CO-RE migration. The BCC inline version is
 * embedded in collectors/pcie.py.
 *
 * Tracepoint: ras:aer_event
 * Kernel requirement: >= 4.10 with CONFIG_PCIEAER
 *
 * Fields from tracepoint:
 *   - dev_name (__data_loc char[])
 *   - status (u32)
 *   - severity (u8): 0=Non-Fatal, 1=Fatal, 2=Corrected
 *   - tlp_header_valid (u8)
 *   - tlp_header (u32[4])
 */

#include <uapi/linux/ptrace.h>

/* Event structure passed to userspace via perf buffer */
struct aer_event_t {
    char   dev_name[64];       /* PCIe device BDF string */
    u32    status;             /* AER status register (error bits) */
    u8     severity;           /* 0=Non-Fatal, 1=Fatal, 2=Corrected */
    u8     tlp_header_valid;   /* 1 if TLP header captured */
    u32    tlp_header[4];      /* Transaction Layer Packet header (4 DWORDs) */
    u64    timestamp_ns;       /* Kernel timestamp (bpf_ktime_get_ns) */
};

/* Perf buffer for sending events to userspace */
BPF_PERF_OUTPUT(aer_events);

/* Severity filter: 0xFF = all, 0/1/2 = specific severity */
BPF_ARRAY(severity_filter, u8, 1);

/*
 * Tracepoint handler: fires on every PCIe AER event reported by the kernel.
 *
 * The ras:aer_event tracepoint is triggered by drivers/pci/pcie/aer.c
 * when the PCIe AER driver processes an error interrupt from a Root Port.
 */
TRACEPOINT_PROBE(ras, aer_event) {
    struct aer_event_t evt = {};

    /* Check severity filter (kernel-side filtering = less data to userspace) */
    int key = 0;
    u8 *filter = severity_filter.lookup(&key);
    if (filter && *filter != 0xFF) {
        if (args->severity != *filter)
            return 0;
    }

    /* Read device name (__data_loc field requires special macro) */
    TP_DATA_LOC_READ_STR(&evt.dev_name, dev_name, sizeof(evt.dev_name));

    /* Copy fixed fields */
    evt.status = args->status;
    evt.severity = args->severity;
    evt.tlp_header_valid = args->tlp_header_valid;

    /* Copy TLP header if available */
    if (args->tlp_header_valid) {
        evt.tlp_header[0] = args->tlp_header[0];
        evt.tlp_header[1] = args->tlp_header[1];
        evt.tlp_header[2] = args->tlp_header[2];
        evt.tlp_header[3] = args->tlp_header[3];
    }

    evt.timestamp_ns = bpf_ktime_get_ns();

    /* Submit to userspace via perf ring buffer */
    aer_events.perf_submit(args, &evt, sizeof(evt));
    return 0;
}
