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

## Probe Scope: What Each Probe Expects to Achieve

### The Detection → Diagnosis → Action → Prevention Pipeline

Every probe serves a role in this operational pipeline:

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│   DETECT    │ ──▶│   DIAGNOSE   │ ──▶│     ACT     │ ──▶│   PREVENT    │
│  (eBPF      │    │ (Correlate   │    │ (Automated  │    │ (Policy &    │
│   probes)   │    │  across      │    │  remediation│    │  design      │
│             │    │  layers)     │    │  or alert)  │    │  change)     │
└─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘
 "Something is      "This is WHY"       "Fix it NOW"       "Never again"
  abnormal"
```

### Probe Scope & Remediation Matrix

| # | Probe | Detection Scope (What It Finds) | Diagnosis (Root Cause) | Immediate Action | Long-Term Prevention |
|---|-------|-------------------------------|----------------------|-----------------|---------------------|
| 1 | nvme_latency | P99 latency spike (50μs → 5ms) | SSD wear-out / thermal throttle / FW bug | Migrate workload off drive; alert ops | Predictive replacement schedule; better cooling |
| 2 | nvme_queue_depth | Queue 100% full >5s (device stalled) | Controller hang / firmware deadlock | NVMe controller reset (echo 1 > reset); failover path | Firmware update; reduce max QD per namespace |
| 3 | block_errors | EIO on specific LBA range | Bad NAND blocks / media failure | Mark drive for replacement; RAID rebuild from parity | Over-provisioning policy; SMART monitoring |
| 4 | aer_monitor | Correctable errors trending up | Cable degradation / connector oxidation / signal integrity | Alert: "replace cable within 7 days"; reduce link speed | Scheduled connector maintenance; better cable routing |
| 5 | link_recovery | >3 bus resets in 5 min | Unstable link / failing retimer / thermal expansion | Disable device; hot-remove; drain from scheduler | Board layout review; retimer firmware update |
| 6 | sas_phy_errors | Invalid DWord / disparity errors | Cable damage / EMI / backplane connector | Reseat cable; replace if persists; failover path | Cable quality audit; EMI shielding |
| 7 | tcp_retrans | >0.5% retransmit rate on NCCL ports | Switch buffer overflow / SFP degradation / ECMP imbalance | Reroute traffic; check SFP (ethtool -m); pause job | Upgrade switch buffer; rebalance ECMP; PFC tuning |
| 8 | rdma_errors | QP errors / CQE failures | RoCE fabric congestion / PFC storm / NIC FW bug | Enable adaptive routing; reduce QD; TCP fallback | NIC firmware update; ECN/DCQCN tuning |
| 9 | fence_timeout | GPU fence >5s (hang) | Kernel stall / GPU memory corruption / driver bug | GPU reset; kill process; drain node from scheduler | Driver update; reduce GPU overcommit; ECC enable |
| 10 | iommu_fault | io_page_fault on GPU device | Invalid DMA / driver bug / corrupted page table | Kill offending process; disable device; collect dump | Driver patch; IOMMU strict mode; firmware update |
| 11 | dma_failures | dma_map_page returns 0 | SWIOTLB full / IOMMU address space exhausted | Reduce concurrent DMA consumers; increase SWIOTLB | Kernel boot param (swiotlb=65536); IOMMU passthrough |
| 12 | throttle_events | Thermal trip (critical/hot) | Cooling failure / blocked airflow / heatsink detach | Alert facilities; migrate workloads; reduce power limit | Cooling system audit; thermal paste refresh |
| 13 | cpu_freq | All CPUs drop to min freq | RAPL power limit / thermal throttle / governor bug | Raise RAPL limit; fix cooling; check governor config | Proper TDP planning; BIOS power policy review |
| 14 | irq_storm | >100K IRQs/sec on single line | Failing device / misconfigured interrupt / driver bug | Disable offending IRQ source; reset device | Driver fix; IRQ coalescing; threaded IRQ migration |
| 15 | mce_events | Corrected ECC errors >10/day | DIMM degradation / row failure / thermal stress | Schedule DIMM replacement; page-offline bad pages | ECC scrubbing policy; proper DIMM cooling |

### What Happens AFTER Detection? (Detailed Action Flows)

#### Flow 1: Storage Degradation Detected

```
nvme_latency probe detects P99 > 5ms
    │
    ├──▶ Correlate: Check thermal probe (is drive overheating?)
    │                Check aer_monitor (PCIe link errors?)
    │                Check SMART (media_errors increasing?)
    │
    ├──▶ Diagnose: "Drive 0000:81:00.0 NAND wear-out confirmed"
    │
    ├──▶ Immediate Actions:
    │    ├── Alert Prometheus → PagerDuty → on-call SRE
    │    ├── Auto: Set drive read-only (prevent further writes)
    │    ├── Auto: Redistribute I/O to healthy drives (dm-multipath)
    │    └── Auto: Begin background data migration to spare
    │
    └──▶ Long-Term:
         ├── Update procurement: order replacement drive
         ├── Update firmware across fleet (if FW bug)
         └── Adjust write amplification budget in storage policy
```

#### Flow 2: AI Training Failure Detected

```
fence_timeout probe: GPU 0000:3b:00.0 fence > 10s
    │
    ├──▶ Correlate: Check aer_monitor (PCIe errors on same BDF?)
    │                Check iommu_fault (DMA errors?)
    │                Check thermal (GPU overheating?)
    │                Check tcp_retrans (NCCL fabric issue?)
    │
    ├──▶ Diagnose: "GPU hang due to PCIe link instability"
    │
    ├──▶ Immediate Actions:
    │    ├── GPU reset via sysfs (echo 1 > /sys/.../reset)
    │    ├── Checkpoint training state (if framework supports)
    │    ├── Drain node from Kubernetes/Slurm scheduler
    │    ├── Notify ML team: "Job X paused, resuming on node Y"
    │    └── Collect GPU state dump + dmesg for driver team
    │
    └──▶ Long-Term:
         ├── RMA GPU card if hardware fault confirmed
         ├── Update GPU driver across fleet
         ├── Add GPU health check to pre-job validation
         └── Implement per-GPU fence timeout SLO monitoring
```

#### Flow 3: Network Fabric Degradation Detected

```
tcp_retrans probe: >2% retransmit to 10.0.0.50:18515 (NCCL)
    │
    ├──▶ Correlate: Check rdma_errors (RoCE QP state?)
    │                Check irq_storm (NIC IRQ overload?)
    │                Check ethtool -S (NIC HW error counters?)
    │
    ├──▶ Diagnose: "SFP module degrading on switch port Eth1/5"
    │
    ├──▶ Immediate Actions:
    │    ├── Auto: ECMP rebalance (route around bad path)
    │    ├── Alert: Network team + switch port identification
    │    ├── Auto: Reduce NCCL parallelism (fewer connections)
    │    └── If >5%: Pause training job gracefully
    │
    └──▶ Long-Term:
         ├── Replace SFP module
         ├── Add SFP DOM (Digital Optical Monitoring) to dashboard
         ├── Set preventive replacement threshold (TX power < -5dBm)
         └── Implement network health pre-check before job start
```

#### Flow 4: Memory Failure Prediction

```
mce_events probe: >50 corrected ECC errors on DIMM A1 today
    │
    ├──▶ Correlate: Check thermal (memory temperature?)
    │                Check numa_imbalance (traffic pattern?)
    │                Historical: error rate trend (doubling weekly?)
    │
    ├──▶ Diagnose: "DIMM A1 row failure — uncorrectable imminent"
    │
    ├──▶ Immediate Actions:
    │    ├── Alert: "Schedule DIMM replacement within 48 hours"
    │    ├── Auto: kernel page-offline (poison affected pages)
    │    ├── Auto: Migrate VMs/containers away from this NUMA node
    │    └── Increase monitoring frequency on this DIMM
    │
    └──▶ Long-Term:
         ├── RMA DIMM (warranty claim with ECC log evidence)
         ├── Update fleet: check same DIMM batch (manufacturing defect?)
         ├── Enable more aggressive ECC scrubbing interval
         └── Add memory health to node admission criteria
```

### Automated Remediation Decision Matrix

```
┌─────────────────────────────────────────────────────────────────────────┐
│                  Should We Auto-Remediate?                                │
├───────────────┬─────────────────────┬────────────────────────────────────┤
│ Risk Level    │ Auto-Action OK?     │ Examples                           │
├───────────────┼─────────────────────┼────────────────────────────────────┤
│ Low           │ YES — just do it    │ Increase ring buffer, adjust       │
│               │                     │ coalescing, page-offline, log      │
├───────────────┼─────────────────────┼────────────────────────────────────┤
│ Medium        │ YES with rollback   │ Migrate workload, reduce link      │
│               │                     │ speed, failover path, GPU reset    │
├───────────────┼─────────────────────┼────────────────────────────────────┤
│ High          │ ALERT + human       │ Drive replacement, node drain,     │
│               │ approval            │ firmware update, disable device    │
├───────────────┼─────────────────────┼────────────────────────────────────┤
│ Critical      │ ALERT + emergency   │ System shutdown (thermal),         │
│               │ action only         │ data protection (read-only drive)  │
└───────────────┴─────────────────────┴────────────────────────────────────┘
```

### Integration with Orchestration Systems

```
eBPF Diagnostics Agent
    │
    ├──▶ Prometheus (metrics) ──▶ Grafana (visualization)
    │                          ──▶ Alertmanager (routing)
    │
    ├──▶ Kubernetes API
    │    ├── Taint node (NoSchedule) when hardware degrading
    │    ├── Drain node when hardware failing
    │    └── Update node labels (gpu-health=degraded)
    │
    ├──▶ Slurm / PBS (HPC scheduler)
    │    ├── Set node state "drain" with reason
    │    └── Requeue affected jobs on healthy nodes
    │
    ├──▶ BMC / IPMI (out-of-band)
    │    ├── Read additional sensors not visible to OS
    │    ├── Trigger chassis LED identification (locate failed part)
    │    └── Force power cycle (last resort)
    │
    └──▶ Ticketing System (Jira, ServiceNow)
         ├── Auto-create incident with diagnostic data
         ├── Attach logs, correlation timeline, SMART data
         └── Assign to hardware team with replacement instructions
```

---

- [BCC Tools Reference](https://github.com/iovisor/bcc/tree/master/tools)
- [bpftrace Reference Guide](https://github.com/bpftrace/bpftrace/blob/master/docs/reference_guide.md)
- [Brendan Gregg — BPF Performance Tools](https://www.brendangregg.com/bpf-performance-tools-book.html)
- [Linux Kernel Tracepoints](https://docs.kernel.org/trace/tracepoints.html)
- [eBPF for Storage Observability (Tanel Põder)](https://blog.tanelpoder.com/posts/optimizing-ebpf-biolatency-accounting/)
- [Host-Side GPU Telemetry with eBPF (arXiv)](https://arxiv.org/html/2510.16946v1)

## References

- [BCC Tools Reference](https://github.com/iovisor/bcc/tree/master/tools)
- [bpftrace Reference Guide](https://github.com/bpftrace/bpftrace/blob/master/docs/reference_guide.md)
- [Brendan Gregg — BPF Performance Tools](https://www.brendangregg.com/bpf-performance-tools-book.html)
- [Linux Kernel Tracepoints](https://docs.kernel.org/trace/tracepoints.html)
- [eBPF for Storage Observability (Tanel Põder)](https://blog.tanelpoder.com/posts/optimizing-ebpf-biolatency-accounting/)
- [Host-Side GPU Telemetry with eBPF (arXiv)](https://arxiv.org/html/2510.16946v1)
