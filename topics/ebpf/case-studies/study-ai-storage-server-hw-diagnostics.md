# Study: eBPF for AI/Storage Server Hardware Diagnostics

## Overview

eBPF enables real-time, low-overhead hardware diagnostics by hooking into kernel
subsystems without kernel modification. For AI and storage servers, this means
monitoring NVMe drives, PCIe links, network fabric, GPUs, thermals, and memory —
all from a single unified framework.

```
┌──────────────────────────────────────────────────────────────────┐
│                  AI/Storage Server Hardware Stack                  │
│                                                                    │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌────────┐ │
│  │NVMe  │  │ GPU  │  │ NIC  │  │ SAS  │  │Memory│  │Thermal │ │
│  │SSDs  │  │(CUDA)│  │(RDMA)│  │ HBA  │  │(DDR5)│  │ /Power │ │
│  └──┬───┘  └──┬───┘  └──┬───┘  └──┬───┘  └──┬───┘  └───┬────┘ │
│     │         │         │         │         │           │       │
│     └─────────┴─────────┴─────────┴─────────┴───────────┘       │
│                          PCIe Fabric                               │
│                              │                                     │
│                           CPU / Root Complex                       │
└──────────────────────────────┼─────────────────────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │   Linux Kernel       │
                    │   (eBPF hooks at     │
                    │    every layer)      │
                    └─────────────────────┘
```

---

## Feature Matrix

| # | Diagnostic Feature | Kernel Hook Point | Existing Tool | Custom Required? |
|---|-------------------|-------------------|---------------|-----------------|
| 1 | NVMe I/O latency histogram | `block:block_rq_issue/complete` | biolatency | No |
| 2 | NVMe command tracing | `nvme:nvme_setup_cmd` | bpftrace 1-liner | No |
| 3 | NVMe queue depth saturation | `block:block_rq_issue` | custom counter | Yes |
| 4 | PCIe AER error monitoring | `ras:aer_event` | pcie_aer_monitor.py | Done |
| 5 | PCIe link recovery events | `kprobe:pcie_do_recovery` | custom | Yes |
| 6 | SAS phy error tracking | `kprobe:sas_phy_*` | custom | Yes |
| 7 | TCP retransmission (AI fabric) | `tcp:tcp_retransmit_skb` | tcpretrans | No |
| 8 | RDMA/RoCE error detection | `rdma:*` tracepoints | custom | Yes |
| 9 | GPU DMA fence timeout | `dma_fence:dma_fence_*` | custom | Yes |
| 10 | GPU PCIe P2P transfer tracing | kprobe on GPU driver | custom | Yes |
| 11 | DMA mapping failure | `kretprobe:dma_map_page` | custom | Yes |
| 12 | Thermal throttling | `thermal:thermal_zone_trip` | bpftrace 1-liner | No |
| 13 | CPU frequency scaling | `power:cpu_frequency` | cpufreq BCC | No |
| 14 | IRQ storm detection | `irq:irq_handler_entry/exit` | hardirqs | No |
| 15 | Scheduler latency (run queue) | `sched:sched_switch` | runqlat | No |
| 16 | Memory pressure / OOM | `oom:*`, `vmscan:*` | oomkill | No |
| 17 | NUMA allocation imbalance | `kmem:mm_page_alloc` | custom | Yes |
| 18 | File system latency | `ext4:*`, `xfs:*` | ext4slower | No |
| 19 | PMBus VRM fault detection | `kprobe:i2c_smbus_xfer` | custom | Yes |
| 20 | ECC memory errors (MCE) | `ras:mc_event` | rasdaemon / custom | Partial |

---

## Detailed Feature Descriptions

### 1. Storage I/O Diagnostics

#### NVMe Latency Histogram
```
Hook: tracepoint:block:block_rq_issue + block_rq_complete
Value: Detect SSD wear-out, firmware bugs, thermal throttling via latency spikes
```

```bash
# Per-device latency histogram (microseconds)
sudo biolatency-bpfcc -D nvme0n1

# Output:
#   usecs      : count   distribution
#   0 -> 1     : 0      |                    |
#   2 -> 3     : 15     |**                  |
#   4 -> 7     : 3210   |********************|
#   8 -> 15    : 1847   |***********         |
#   16 -> 31   : 423    |**                  |
#   32 -> 63   : 12     |                    |
#   64 -> 127  : 3      |                    |  ← latency outliers = problem
```

#### NVMe Command-Level Tracing
```bash
# Trace every NVMe command with opcode, namespace, and latency
sudo bpftrace -e '
tracepoint:nvme:nvme_setup_cmd {
  @start[args->disk, args->qid, args->cmdid] = nsecs;
  @op[args->disk, args->qid, args->cmdid] = args->opcode;
}
tracepoint:nvme:nvme_complete_rq {
  $key = (args->disk, args->qid, args->cmdid);
  $lat = (nsecs - @start[$key]) / 1000;
  if ($lat > 1000) {  // > 1ms
    printf("SLOW: disk=%s op=0x%x lat=%d us\n",
      str(args->disk), @op[$key], $lat);
  }
  delete(@start[$key]);
  delete(@op[$key]);
}'
```

#### NVMe Queue Depth Monitoring
```bash
# Track in-flight I/O count per device — detect queue saturation
sudo bpftrace -e '
tracepoint:block:block_rq_issue { @inflight[str(args->dev)] = count(); }
tracepoint:block:block_rq_complete { @inflight[str(args->dev)] = count() - 1; }
interval:s:1 { print(@inflight); }'
```

---

### 2. PCIe Link Health

#### AER Error Monitoring (Implemented)
```
Hook: tracepoint:ras:aer_event
Value: Detect correctable errors trending toward link failure
Tool: topics/pcie/tools/pcie_aer_monitor.py
```

```bash
# Real-time AER monitoring with severity filter
sudo python3 topics/pcie/tools/pcie_aer_monitor.py --severity corrected --json

# JSON output for trending:
# {"timestamp":"2026-07-24T10:30:15","device":"0000:81:00.0",
#  "severity":"Corrected","errors":["Bad TLP"],"status_hex":"0x00000040"}
```

#### PCIe Link Recovery Tracking
```bash
# Detect when kernel initiates PCIe error recovery (link retrain)
sudo bpftrace -e '
kprobe:pcie_do_recovery {
  printf("PCIe RECOVERY: dev=%s\n", str(((struct pci_dev *)arg0)->dev.kobj.name));
}'
```

#### PCIe Surprise Removal Detection
```bash
# Track device removal events (critical for hot-swap JBOF)
sudo bpftrace -e '
kprobe:pci_dev_set_disconnected {
  printf("PCIe DISCONNECT: %s\n",
    str(((struct pci_dev *)arg0)->dev.kobj.name));
}'
```

---

### 3. Network Fabric Diagnostics (AI Training Clusters)

#### TCP Retransmission Tracking
```
Hook: tracepoint:tcp:tcp_retransmit_skb
Value: Detect fabric congestion causing NCCL/collective slowdowns
```

```bash
# Retransmissions by destination (identify congested paths)
sudo bpftrace -e '
tracepoint:tcp:tcp_retransmit_skb {
  @retrans[ntop(args->daddr)] = count();
}'
```

#### RDMA/RoCE Connection Errors
```bash
# Track RDMA QP (Queue Pair) errors — critical for GPU-Direct RDMA
sudo bpftrace -e '
tracepoint:rdma_core:cq_poll {
  if (args->status != 0) {
    printf("RDMA ERROR: status=%d qp=%d\n", args->status, args->qpn);
    @rdma_errors[args->status] = count();
  }
}'
```

#### NIC Ring Buffer Drops
```bash
# Detect when NIC drops packets due to full RX ring
sudo bpftrace -e '
tracepoint:net:netif_receive_skb {
  @rx_pkts[str(args->name)] = count();
}
tracepoint:napi:napi_poll {
  @napi_budget[str(args->dev_name)] = hist(args->budget);
}'

# Also check:
cat /proc/net/softnet_stat  # columns: total, dropped, time_squeeze
```

---

### 4. GPU/Accelerator Diagnostics

#### GPU DMA Fence Timeout (Hang Detection)
```bash
# Detect GPU operations that take too long (potential hang)
sudo bpftrace -e '
tracepoint:dma_fence:dma_fence_init {
  @fence_start[args->context, args->seqno] = nsecs;
}
tracepoint:dma_fence:dma_fence_signaled {
  $start = @fence_start[args->context, args->seqno];
  if ($start > 0) {
    $lat = (nsecs - $start) / 1000000;  // ms
    if ($lat > 5000) {  // > 5 seconds = possible hang
      printf("GPU FENCE SLOW: ctx=%d seq=%d lat=%d ms\n",
        args->context, args->seqno, $lat);
    }
    delete(@fence_start[args->context, args->seqno]);
  }
}'
```

#### GPU IOMMU/DMA Fault Detection
```bash
# Detect invalid DMA access from GPU to host memory
sudo bpftrace -e '
tracepoint:iommu:io_page_fault {
  printf("IOMMU FAULT: dev=%s addr=0x%lx flags=0x%x\n",
    str(args->dev), args->dma_addr, args->flags);
  @iommu_faults[str(args->dev)] = count();
}'
```

---

### 5. Memory & DMA Subsystem

#### DMA Mapping Failure Detection
```bash
# Critical for NVMe, GPU, NIC — DMA mapping failures mean I/O will fail
sudo bpftrace -e '
kretprobe:dma_map_page {
  if (retval == 0) {
    printf("DMA MAP FAILED: %s (pid %d)\n", comm, pid);
    @dma_failures[comm] = count();
  }
}'
```

#### NUMA Allocation Imbalance
```bash
# Verify GPU/NVMe memory is allocated on the correct NUMA node
sudo bpftrace -e '
tracepoint:kmem:mm_page_alloc {
  @alloc_node[args->order] = lhist(args->pfn >> 18, 0, 8, 1);
  // pfn ranges map to NUMA nodes
}'
```

#### ECC / Machine Check Events
```bash
# Track corrected memory errors (MCE) — predict DIMM failure
sudo bpftrace -e '
tracepoint:ras:mc_event {
  printf("MCE: %s type=%d grain=%d count=%d\n",
    str(args->label), args->error_type, args->grain, args->error_count);
  @mce_by_dimm[str(args->label)] = count();
}'
```

---

### 6. Thermal & Power Management

#### Thermal Throttling Events
```bash
# Detect when hardware hits thermal limit
sudo bpftrace -e '
tracepoint:thermal:thermal_zone_trip {
  printf("THERMAL TRIP: zone=%s temp=%d trip_type=%d\n",
    str(args->thermal_zone), args->temp, args->trip);
  @thermal_trips[str(args->thermal_zone)] = count();
}'
```

#### CPU Frequency Tracking (Throttling Correlation)
```bash
# Correlate CPU frequency drops with I/O latency spikes
sudo bpftrace -e '
tracepoint:power:cpu_frequency {
  @freq[cpu] = args->state;
}
interval:s:5 { print(@freq); clear(@freq); }'
```

#### PMBus VRM Fault Detection
```bash
# Monitor SMBus traffic to VRMs — detect over-current/over-voltage
sudo bpftrace -e '
kprobe:i2c_smbus_xfer {
  $addr = arg1;
  $cmd = arg3;
  // PMBus STATUS_WORD = 0x79
  if ($cmd == 0x79 && ($addr >= 0x60 && $addr <= 0x6F)) {
    printf("PMBus STATUS read: bus=%d addr=0x%x\n", arg0, $addr);
  }
}'
```

---

### 7. IRQ & Scheduler Diagnostics

#### IRQ Storm Detection
```bash
# Detect excessive interrupts (often caused by failing hardware)
sudo bpftrace -e '
tracepoint:irq:irq_handler_entry {
  @irq_count[args->irq, str(args->name)] = count();
}
interval:s:1 {
  print(@irq_count);
  clear(@irq_count);
}'
```

#### Softirq Stall Detection
```bash
# Network/block softirqs taking too long = latency for everything
sudo bpftrace -e '
tracepoint:irq:softirq_entry { @start[cpu, args->vec] = nsecs; }
tracepoint:irq:softirq_exit {
  $lat = (nsecs - @start[cpu, args->vec]) / 1000;
  if ($lat > 10000) {  // > 10ms
    printf("SOFTIRQ STALL: cpu=%d vec=%d lat=%d us\n", cpu, args->vec, $lat);
  }
  delete(@start[cpu, args->vec]);
}'
```

---

## Architecture: Unified eBPF Diagnostics Agent

```
┌────────────────────────────────────────────────────────────────────┐
│                    eBPF HW Diagnostics Agent                        │
│                                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │
│  │ Storage  │ │  PCIe    │ │ Network  │ │   GPU    │ │Thermal │  │
│  │ Monitor  │ │  AER     │ │  Fabric  │ │  Fence   │ │ Power  │  │
│  │          │ │  Monitor │ │  Monitor │ │  Monitor │ │Monitor │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬────┘  │
│       │             │            │             │            │       │
│       └─────────────┴────────────┴─────────────┴────────────┘       │
│                              │                                       │
│                    Perf Buffer / Ring Buffer                         │
│                              │                                       │
│                ┌─────────────┴──────────────┐                       │
│                │      Event Aggregator       │                       │
│                │  (correlate across layers)  │                       │
│                └─────────────┬──────────────┘                       │
│                              │                                       │
│         ┌────────────────────┼────────────────────┐                 │
│         │                    │                    │                 │
│    ┌────┴────┐         ┌────┴────┐         ┌────┴────┐            │
│    │Prometheus│         │  JSON   │         │  Alert  │            │
│    │ Exporter │         │  Logs   │         │  Engine │            │
│    └─────────┘         └─────────┘         └─────────┘            │
│                                                                      │
└────────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
    Grafana               ELK/Loki           PagerDuty/Slack
```

---

## Implementation Priority (Recommended Order)

| Priority | Feature | Effort | Impact | Reason |
|----------|---------|--------|--------|--------|
| P0 | NVMe I/O latency | Low (existing tool) | High | Most common storage issue |
| P0 | PCIe AER monitoring | Low (done) | High | Predicts link failures |
| P1 | TCP retransmission | Low (existing tool) | High | AI training fabric health |
| P1 | Thermal throttling | Low (1-liner) | High | Server reliability |
| P1 | IRQ storm detection | Low (existing tool) | Medium | Identifies failing HW |
| P2 | NVMe command tracing | Medium | Medium | Debug firmware issues |
| P2 | GPU fence timeout | Medium | High | AI workload hangs |
| P2 | DMA mapping failure | Medium | Medium | IOMMU/driver issues |
| P3 | RDMA error tracking | High | High | Needs custom RDMA hooks |
| P3 | SAS phy error tracking | High | Medium | Enterprise storage only |
| P3 | ECC/MCE monitoring | Medium | Medium | Memory failure prediction |
| P3 | PMBus VRM faults | High | Low | Rare but catastrophic |

---

## Cross-Layer Correlation Examples

### Example 1: NVMe Latency Spike Root Cause
```
Symptom: NVMe read latency jumps from 50μs to 5ms
Correlation:
  eBPF Layer 1 (thermal) → CPU throttling event at same timestamp
  eBPF Layer 2 (power)   → CPU frequency dropped to 800MHz
  Root Cause: Cooling failure → thermal throttle → I/O stall
```

### Example 2: AI Training Slowdown
```
Symptom: NCCL AllReduce takes 3x longer
Correlation:
  eBPF Layer 1 (network) → TCP retransmissions on port 18515 (NCCL)
  eBPF Layer 2 (NIC)     → RX ring drops on mlx5_0
  eBPF Layer 3 (IRQ)     → IRQ coalescing too aggressive
  Root Cause: NIC ring buffer too small for burst traffic
```

### Example 3: Disk Failure Prediction
```
Symptom: Increasing PCIe correctable errors on NVMe device
Correlation:
  eBPF Layer 1 (PCIe)    → Bad TLP errors: 0→5→50→500 per hour
  eBPF Layer 2 (storage) → NVMe latency P99 increasing
  eBPF Layer 3 (SMART)   → media_errors incrementing
  Prediction: Drive or connector failing → schedule replacement
```

---

## References

- [BCC Tools Reference](https://github.com/iovisor/bcc/tree/master/tools)
- [bpftrace Reference Guide](https://github.com/bpftrace/bpftrace/blob/master/docs/reference_guide.md)
- [Brendan Gregg — BPF Performance Tools](https://www.brendangregg.com/bpf-performance-tools-book.html)
- [Linux Kernel Tracepoints](https://docs.kernel.org/trace/tracepoints.html)
- [eBPF for Storage Observability (Tanel Põder)](https://blog.tanelpoder.com/posts/optimizing-ebpf-biolatency-accounting/)
- [Host-Side GPU Telemetry with eBPF (arXiv)](https://arxiv.org/html/2510.16946v1)
