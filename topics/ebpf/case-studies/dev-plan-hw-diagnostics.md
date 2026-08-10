# Development Plan: eBPF Server HW Diagnostics Agent

## Project Overview

Build a unified eBPF-based hardware diagnostics agent for AI/Storage servers
that monitors storage, PCIe, network, GPU, thermal, and memory subsystems
with near-zero overhead.

**Repository Structure:**
```
ebpf-hw-diag/
├── cmd/
│   └── diagd/                    # Main daemon entry point
│       └── main.py              # Agent bootstrap: parse args, load config, init HAL registry,
│                                #   start collectors, open exporters, run event loop, handle signals
├── probes/                       # eBPF programs (kernel-side, compiled to bytecode)
│   ├── storage/
│   │   ├── nvme_latency.bpf.c  # Attach to block:block_rq_issue/complete; measure per-I/O latency;
│   │   │                        #   populate latency histogram in BPF_HISTOGRAM map
│   │   ├── nvme_queue_depth.bpf.c  # Track in-flight I/O count per device via atomic counter;
│   │   │                            #   detect queue saturation (in-flight > threshold)
│   │   └── block_errors.bpf.c  # Catch block layer errors (I/O timeout, EIO) via block:block_rq_error;
│   │                            #   emit device + error code to perf buffer
│   ├── pcie/
│   │   ├── aer_monitor.bpf.c   # Attach to tracepoint:ras:aer_event; filter by severity;
│   │   │                        #   decode status bits and forward to perf buffer with TLP header
│   │   └── link_recovery.bpf.c # kprobe on pcie_do_recovery; capture BDF and recovery type;
│   │                            #   detect link retraining and bus reset events
│   ├── network/
│   │   ├── tcp_retrans.bpf.c   # Attach to tcp:tcp_retransmit_skb; capture src/dst IP:port, state;
│   │   │                        #   aggregate retransmit count per flow in BPF_HASH map
│   │   └── rdma_errors.bpf.c   # Attach to rdma tracepoints (if available); capture QP errors,
│   │                            #   CQE status codes; detect RoCE/IB fabric degradation
│   ├── gpu/
│   │   ├── fence_timeout.bpf.c # Attach to dma_fence:dma_fence_init/signaled; track fence lifetime;
│   │   │                        #   alert if fence not signaled within timeout (GPU hang detection)
│   │   └── iommu_fault.bpf.c   # Attach to iommu:io_page_fault; capture faulting device + DMA addr;
│   │                            #   detect invalid GPU-to-host memory access
│   ├── thermal/
│   │   ├── throttle_events.bpf.c  # Attach to thermal:thermal_zone_trip; capture zone name, temp,
│   │   │                           #   trip type; emit event when thermal threshold crossed
│   │   └── cpu_freq.bpf.c      # Attach to power:cpu_frequency; track per-CPU frequency transitions;
│   │                            #   detect throttling (freq drop below baseline)
│   └── memory/
│       ├── dma_failures.bpf.c   # kretprobe on dma_map_page; detect return value == 0 (failure);
│       │                         #   capture calling process and device for DMA mapping errors
│       ├── numa_imbalance.bpf.c # Attach to kmem:mm_page_alloc; track allocation node vs expected;
│       │                         #   detect cross-NUMA allocations for latency-sensitive devices
│       └── mce_events.bpf.c     # Attach to ras:mc_event; capture DIMM label, error type, count;
│                                 #   track corrected ECC errors for predictive failure analysis
│
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐
│   │                    PROBE DIAGNOSTICS & JUDGMENT CRITERIA                                  │
│   ├──────────────────┬──────────────────────────────┬────────────────────────────────────────┤
│   │ Probe            │ Diagnosable Problems         │ Judgment Criteria (Alert Threshold)     │
│   ├──────────────────┼──────────────────────────────┼────────────────────────────────────────┤
│   │ nvme_latency     │ • SSD wear-out (NAND degrad) │ P99 > 5ms (normal: <100μs)            │
│   │                  │ • Firmware bug (periodic      │ P999 > 50ms                            │
│   │                  │   latency spikes)             │ Bimodal distribution (two peaks)       │
│   │                  │ • Thermal throttling on SSD   │ Latency correlates with temp >70°C     │
│   │                  │ • Controller hang/reset       │ Any I/O > 30s (NVMe timeout)           │
│   │                  │ • Write amplification issue   │ Write latency >> read latency (10x)    │
│   ├──────────────────┼──────────────────────────────┼────────────────────────────────────────┤
│   │ nvme_queue_depth │ • Queue saturation (backlog)  │ In-flight I/Os > 80% of max QD        │
│   │                  │ • Unbalanced multi-queue      │ One queue >90% while others <20%       │
│   │                  │ • Insufficient I/O threads    │ Sustained QD=max with I/O waiters      │
│   │                  │ • Device not draining         │ QD stuck at max for >5s                │
│   ├──────────────────┼──────────────────────────────┼────────────────────────────────────────┤
│   │ block_errors     │ • Failing drive (media error) │ Any EIO error (immediate alert)        │
│   │                  │ • Path failure (multipath)    │ I/O timeout on one path (not others)   │
│   │                  │ • Bad sector / unrecoverable  │ Repeated EIO on same LBA range         │
│   │                  │   read error                  │                                        │
│   │                  │ • Controller reset loop       │ >3 I/O timeouts within 60s             │
│   ├──────────────────┼──────────────────────────────┼────────────────────────────────────────┤
│   │ aer_monitor      │ • Degrading PCIe cable/conn   │ Correctable errors >10/hour (trending) │
│   │                  │ • Failing NIC/GPU/NVMe link   │ Any Fatal error (immediate)            │
│   │                  │ • Signal integrity issue      │ Bad TLP + Bad DLLP together            │
│   │                  │ • Connector reseat needed     │ Errors clear after reseat              │
│   │                  │ • Speed downgrade imminent    │ Correctable errors >100/hour           │
│   │                  │ • Retimer failure             │ Errors on retimer receiver point       │
│   ├──────────────────┼──────────────────────────────┼────────────────────────────────────────┤
│   │ link_recovery    │ • Unstable PCIe link          │ >1 recovery/hour (link retrain)        │
│   │                  │ • Surprise device removal     │ Any surprise-down event                │
│   │                  │ • Bus reset storm             │ >3 resets within 5 minutes             │
│   │                  │ • Hot-plug controller failure  │ Recovery fails (device disappears)     │
│   ├──────────────────┼──────────────────────────────┼────────────────────────────────────────┤
│   │ tcp_retrans      │ • Network fabric congestion   │ Retransmit rate >0.1% of total pkts   │
│   │                  │ • Switch buffer overflow      │ Burst retransmits to same dst          │
│   │                  │ • Cable/SFP degradation       │ Retransmits on single port only        │
│   │                  │ • ECMP path imbalance         │ Retransmits concentrate on 1 path      │
│   │                  │ • AI training stall (NCCL)    │ Retransmits on NCCL ports (18515,4420) │
│   ├──────────────────┼──────────────────────────────┼────────────────────────────────────────┤
│   │ rdma_errors      │ • RoCE fabric degradation     │ Any QP error (CQE status != success)   │
│   │                  │ • PFC storm / deadlock        │ RDMA timeouts + zero retransmits       │
│   │                  │ • NIC firmware bug            │ Specific vendor error codes            │
│   │                  │ • GPU-Direct RDMA failure     │ Errors correlated with GPU device      │
│   ├──────────────────┼──────────────────────────────┼────────────────────────────────────────┤
│   │ fence_timeout    │ • GPU hang (compute kernel)   │ Fence not signaled >5s                 │
│   │                  │ • GPU memory corruption       │ Repeated fence timeouts after reset    │
│   │                  │ • Driver deadlock             │ All fences stalled across all contexts │
│   │                  │ • Insufficient GPU memory     │ Fence timeout + OOM in dmesg          │
│   │                  │ • PCIe link failure to GPU    │ Fence timeout + AER error on same BDF  │
│   ├──────────────────┼──────────────────────────────┼────────────────────────────────────────┤
│   │ iommu_fault      │ • GPU driver bug (bad DMA)    │ Any io_page_fault event               │
│   │                  │ • Corrupted page table        │ Repeated faults on same address range  │
│   │                  │ • Device out-of-bounds access  │ DMA addr outside allocated region     │
│   │                  │ • Firmware/microcode issue    │ Faults after FW update                 │
│   ├──────────────────┼──────────────────────────────┼────────────────────────────────────────┤
│   │ throttle_events  │ • Cooling system failure      │ Critical trip (Tjmax) reached          │
│   │                  │ • Fan failure / blocked airflow│ Throttle with fan RPM < expected      │
│   │                  │ • Ambient temp too high        │ All zones trending up simultaneously  │
│   │                  │ • Heatsink detachment         │ Single zone spike (others normal)      │
│   │                  │ • TDP exceeded (power limit)  │ Throttle type=passive + freq drop      │
│   ├──────────────────┼──────────────────────────────┼────────────────────────────────────────┤
│   │ cpu_freq         │ • Power capping (RAPL limit)  │ All CPUs drop to min freq simultaneously│
│   │                  │ • Thermal throttling          │ Freq drop correlates with temp rise    │
│   │                  │ • C-state exit latency issue  │ Frequent transitions (>1000/s)         │
│   │                  │ • Governor misconfiguration   │ Freq never reaches max under load      │
│   ├──────────────────┼──────────────────────────────┼────────────────────────────────────────┤
│   │ dma_failures     │ • IOMMU/SMMU misconfiguration │ Any dma_map_page failure               │
│   │                  │ • Bounce buffer exhaustion    │ Failures under high I/O load only      │
│   │                  │ • Address space exhaustion    │ Failures increase over uptime          │
│   │                  │ • Kernel memory pressure      │ Correlates with low free memory        │
│   ├──────────────────┼──────────────────────────────┼────────────────────────────────────────┤
│   │ numa_imbalance   │ • Misconfigured NUMA affinity │ >20% allocations from remote node      │
│   │                  │ • Wrong CPU-device binding    │ NVMe IRQ on different NUMA than memory │
│   │                  │ • Memory bandwidth bottleneck │ Remote NUMA + high latency together    │
│   │                  │ • VM/container misplacement   │ Process on node 0, device on node 1   │
│   ├──────────────────┼──────────────────────────────┼────────────────────────────────────────┤
│   │ mce_events       │ • DIMM failing (wear-out)    │ Corrected errors >10/day on same DIMM  │
│   │                  │ • Memory row failure          │ Errors concentrate on same rank/bank   │
│   │                  │ • Thermal memory errors       │ MCE correlates with temp >85°C         │
│   │                  │ • DIMM seating issue          │ Errors on one channel only             │
│   │                  │ • Imminent uncorrectable fail │ Corrected error rate doubling weekly   │
│   └──────────────────┴──────────────────────────────┴────────────────────────────────────────┘
│
│   ┌─────────────────────────────────────────────────────────────────────────────────────────┐
│   │                    JUDGMENT CRITERIA REFERENCES                                           │
│   ├──────────────────────────────────────────────────────────────────────────────────────────┤
│   │                                                                                          │
│   │ NVMe Latency Thresholds:                                                                │
│   │   • NVMe spec: I/O timeout default = 30s (nvme_core.io_timeout kernel param)            │
│   │     Source: https://docs.aws.amazon.com/ebs/latest/userguide/timeout-nvme-ebs-volumes   │
│   │   • Normal NVMe 4K random read: 20-70 μs; degraded: >1ms; failing: >5ms                │
│   │     Source: https://simplyblock.io/glossary/nvme-latency/                               │
│   │   • vSAN storage: normal <1.5ms; warning 2-3ms (write cliff indicator)                  │
│   │     Source: https://knowledge.broadcom.com/external/article?articleNumber=424485         │
│   │                                                                                          │
│   │ PCIe AER Error Rates:                                                                    │
│   │   • PCIe Base Spec mandates BER ≤ 10⁻¹² per lane (1 error per 1 terabit)               │
│   │     Source: https://www.asteralabs.com/impact-of-bit-errors-in-pci-express-links/        │
│   │   • At 16 GT/s (Gen4), 10⁻¹² BER ≈ 1 correctable error per ~62 seconds per lane        │
│   │   • Threshold: operational experience — steady correctable errors indicate signal        │
│   │     degradation trending toward uncorrectable; any Fatal = immediate action              │
│   │     Source: PCIe Base Spec 5.0, Section 6.2 (Error Handling)                            │
│   │     Source: https://pcisig.com/specifications                                           │
│   │                                                                                          │
│   │ TCP Retransmission Rates:                                                                │
│   │   • Normal: ~0.0%; Warning: 0.1-0.5%; Critical: >0.5%                                  │
│   │     Source: https://knowledge.broadcom.com/external/article/424515 (vSAN thresholds)    │
│   │   • General: <1% acceptable; >2% indicates network problem                              │
│   │     Source: https://www.systutorials.com/too-many-tcp-segments-retransmited/             │
│   │   • Research: ~50% of monitored networks show aggregate retransmit >1%                  │
│   │     Source: https://www.researchgate.net/publication/51963432 (TCP retransmit study)     │
│   │                                                                                          │
│   │ GPU Fence Timeout:                                                                       │
│   │   • Linux DRM subsystem: default job timeout varies by driver                           │
│   │     - amdgpu: 10,000 ms (10s), configurable via amdgpu.lockup_timeout                  │
│   │     - i915: 5,000 ms (5s) for preempt timeout                                          │
│   │     Source: Linux kernel source drivers/gpu/drm/amd/amdgpu/amdgpu_job.c                │
│   │     Source: Linux kernel source drivers/gpu/drm/i915/gt/intel_engine_types.h            │
│   │   • Industry practice: 5s = suspected hang, 10s = confirmed hang + reset               │
│   │                                                                                          │
│   │ Thermal Throttling:                                                                      │
│   │   • Linux thermal framework trip types: active, passive, hot, critical                  │
│   │     - critical = Tjmax reached → orderly shutdown                                       │
│   │     - hot = near Tjmax → aggressive throttle                                            │
│   │     Source: https://docs.kernel.org/driver-api/thermal/sysfs-api.html                   │
│   │   • Intel CPU Tjmax: typically 100°C; throttle begins at ~95-100°C                      │
│   │     Source: Intel processor datasheets (Thermal Design Guide)                           │
│   │   • NVIDIA GPU Tmax: typically 83-90°C before throttle                                  │
│   │     Source: https://docs.nvidia.com/drive/archive/5.1.0.2L/nvvib_docs/                  │
│   │                                                                                          │
│   │ ECC/MCE Predictive Failure:                                                              │
│   │   • IBM PFA threshold: correctable ECC logging limit (vendor-configurable)              │
│   │     Source: https://www.ibm.com/support/pages/memory-correctable-error-logging-limit    │
│   │   • Research: corrected errors are strong predictor of uncorrectable errors              │
│   │     Source: https://arxiv.org/html/2312.02855v1 (Memory Failure Prediction, 2023)       │
│   │   • Google study: DIMMs with corrected errors are 2-14x more likely to have UE          │
│   │     Source: Schroeder et al., "DRAM Errors in the Wild", ACM SIGMETRICS 2009            │
│   │   • Industry practice: >10 CE/day on same DIMM → schedule replacement                  │
│   │                                                                                          │
│   │ NUMA Imbalance:                                                                          │
│   │   • Best practice: device IRQ affinity should match NUMA node of consuming process      │
│   │     Source: https://docs.kernel.org/admin-guide/pm/cpufreq.html                         │
│   │   • Cross-NUMA memory access penalty: ~40-100ns additional latency (2x local)           │
│   │     Source: Intel Xeon Scalable Memory Architecture whitepaper                          │
│   │   • >20% remote allocations = significant performance impact                            │
│   │     Source: operational experience, confirmed by numastat monitoring                    │
│   │                                                                                          │
│   │ DMA Mapping Failures:                                                                    │
│   │   • Any dma_map_page() returning 0/DMA_MAPPING_ERROR = immediate concern               │
│   │     Source: https://docs.kernel.org/core-api/dma-api.html (DMA API Guide)               │
│   │   • Common causes: IOMMU address space exhaustion, SWIOTLB buffer full                  │
│   │     Source: Linux kernel Documentation/core-api/dma-api-howto.rst                       │
│   │                                                                                          │
│   └──────────────────────────────────────────────────────────────────────────────────────────┘
│
├── hal/                          # Hardware Abstraction Layer
│   ├── __init__.py              # Package init; exports DeviceRegistry and all base classes
│   ├── base.py                   # HardwareDevice ABC: defines get_id(), get_type(), is_healthy(),
│   │                             #   get_properties() interface that ALL devices must implement
│   ├── registry.py              # DeviceRegistry: central catalog of all discovered HW;
│   │                             #   supports dynamic discover(), hot-swap, type-based filtering
│   ├── storage/
│   │   ├── __init__.py
│   │   ├── base.py              # AbstractStorageDevice: extends HardwareDevice with
│   │   │                         #   get_smart_data(), get_io_stats(), get_capacity_bytes(),
│   │   │                         #   supports_latency_monitoring() — common storage interface
│   │   ├── nvme.py              # NVMe implementation: uses nvme-cli JSON + /sys/class/nvme/
│   │   │                         #   for SMART, identify-ctrl, namespace info, firmware version
│   │   ├── sata.py              # SATA implementation: uses smartctl + /sys/block/sd*/
│   │   │                         #   for SMART attributes, error counters, link speed
│   │   └── sas.py               # SAS implementation: uses sg_ses + smartctl + sas_phy sysfs;
│   │                             #   reads phy error counters, enclosure slot mapping, SMART
│   ├── pcie/
│   │   ├── __init__.py
│   │   ├── base.py              # AbstractPCIeDevice: get_link_speed(), get_link_width(),
│   │   │                         #   supports_aer(), get_bdf(), get_driver() interface
│   │   ├── linux_sysfs.py       # Linux sysfs backend: reads /sys/bus/pci/devices/<BDF>/
│   │   │                         #   for config, link status, AER counters, NUMA node
│   │   └── lspci.py             # lspci/setpci backend: parses lspci -vvv output;
│   │                             #   reads extended capabilities, AER registers via setpci
│   ├── network/
│   │   ├── __init__.py
│   │   ├── base.py              # AbstractNIC: get_link_state(), get_speed(), get_stats(),
│   │   │                         #   get_ring_buffer_size(), supports_rdma() interface
│   │   ├── ethtool.py           # ethtool backend: queries NIC via ethtool ioctls/netlink;
│   │   │                         #   gets speed, duplex, offloads, error counters, driver info
│   │   └── rdma.py              # RDMA device backend: enumerates /sys/class/infiniband/;
│   │                             #   reads port state, link layer, GID table, error counters
│   ├── gpu/
│   │   ├── __init__.py
│   │   ├── base.py              # AbstractAccelerator: get_temperature(), get_utilization(),
│   │   │                         #   get_memory_usage(), get_pcie_bdf(), get_driver() interface
│   │   ├── nvidia.py            # NVIDIA backend: parses nvidia-smi --query-gpu JSON output;
│   │   │                         #   reads /sys/class/drm/card*/device/ for PCIe link info
│   │   └── amd.py               # AMD backend: parses rocm-smi output + /sys/class/drm/;
│   │                             #   reads hwmon for temp/power, amdgpu sysfs for utilization
│   ├── thermal/
│   │   ├── __init__.py
│   │   ├── base.py              # AbstractThermalZone: get_temperature(), get_trip_points(),
│   │   │                         #   get_cooling_devices(), is_throttling() interface
│   │   ├── hwmon.py             # Linux hwmon backend: reads /sys/class/hwmon/hwmon*/
│   │   │                         #   for temperature, fan speed, voltage, power sensors
│   │   └── ipmi.py              # IPMI SDR backend: uses ipmitool sdr to read BMC sensors;
│   │                             #   provides out-of-band thermal data independent of OS
│   └── platform/
│       ├── __init__.py
│       ├── base.py              # AbstractPlatform: defines which HAL backends to load,
│       │                         #   platform-specific quirks, expected device topology
│       ├── x86_server.py        # x86 server: auto-detects Intel/AMD chipset, loads i2c-i801
│       │                         #   or i2c-piix4, discovers PCIe topology via sysfs
│       └── arm_server.py        # ARM server (Ampere/Graviton): handles platform-specific
│                                 #   device tree paths, different hwmon layout, PCIe RC naming
├── collectors/                   # Userspace event handlers (Python)
│   ├── __init__.py              # Package init; exports all collector classes
│   ├── base.py                   # BaseCollector ABC: defines start(), stop(), process_event(),
│   │                             #   is_running property; accepts config + HAL registry
│   ├── storage.py               # StorageCollector: processes block I/O events from eBPF probes;
│   │                             #   computes latency histograms, percentiles; uses HAL for device info
│   ├── pcie.py                  # PCIeCollector: processes AER events; decodes status bits to error
│   │                             #   names; formats TLP headers; filters by severity
│   ├── network.py               # NetworkCollector: aggregates TCP retransmit events per flow;
│   │                             #   calculates rate; identifies NCCL/RDMA-related retransmissions
│   ├── gpu.py                   # GPUCollector: tracks DMA fence lifetimes; detects GPU hang when
│   │                             #   fence exceeds timeout; correlates with IOMMU faults
│   ├── thermal.py               # ThermalCollector: processes thermal trip events; tracks throttle
│   │                             #   duration; correlates CPU freq drops with I/O latency spikes
│   └── memory.py               # MemoryCollector: processes DMA failures, ECC/MCE events;
│                                 #   tracks NUMA imbalance; predicts DIMM failure from error trends
├── exporters/                    # Output backends (where processed data goes)
│   ├── __init__.py              # Package init; exports all exporter classes
│   ├── prometheus.py             # PrometheusExporter: registers counters, histograms, gauges;
│   │                             #   serves HTTP /metrics endpoint for Prometheus scraping
│   ├── json_log.py              # JsonLogExporter: writes each event as single-line JSON to file;
│   │                             #   supports log rotation by size; auto-adds timestamp field
│   └── alerter.py               # AlertEngine: evaluates declarative rules against metric values;
│                                 #   supports threshold + duration conditions; fires webhooks/syslog
├── events/                       # Typed event schema (data contracts between layers)
│   ├── __init__.py              # Package init; exports all event dataclasses
│   ├── base.py                   # DiagEvent base dataclass: timestamp, source_probe, device_id,
│   │                             #   severity; all events inherit from this
│   ├── storage.py               # NVMeLatencyEvent, BlockErrorEvent, QueueDepthEvent
│   ├── pcie.py                  # PCIeAEREvent (bdf, status_hex, errors[], tlp_header)
│   ├── network.py               # TCPRetransmitEvent, RDMAErrorEvent
│   ├── gpu.py                   # FenceTimeoutEvent, IOMMUFaultEvent
│   ├── thermal.py               # ThermalTripEvent, CpuFreqEvent
│   ├── memory.py               # DMAFailureEvent, MCEEvent, NUMAImbalanceEvent
│   └── correlated.py           # CorrelatedEvent: trigger_events[], root_cause, action, confidence
├── core/                         # Framework infrastructure (not domain-specific)
│   ├── __init__.py
│   ├── probe_manager.py         # ProbeManager: load/attach/monitor/hot-reload eBPF probes;
│   │                             #   detects kernel capabilities (tracepoint availability);
│   │                             #   graceful degradation if probe fails; atomic program replace
│   ├── event_bus.py             # EventBus: fan-out routing — collector.emit(event) dispatches
│   │                             #   to [prometheus, json_log, alerter, correlator] concurrently;
│   │                             #   supports filtering, rate limiting, backpressure
│   ├── rate_limiter.py          # TokenBucket rate limiter: per-collector event rate cap;
│   │                             #   prevents OOM under event storms (configurable burst/rate)
│   ├── health.py                # HealthCheck: /healthz HTTP endpoint; self-metrics
│   │                             #   (events_processed, probe_load_failures, uptime, memory_usage);
│   │                             #   liveness probe for Kubernetes readinessProbe
│   └── capabilities.py         # CapabilityDetector: check kernel version, available tracepoints,
│                                 #   CAP_PERFMON/CAP_BPF permissions, BTF availability;
│                                 #   determines which probes can be loaded on this system
├── correlator/                   # Cross-layer event correlation engine
│   ├── __init__.py
│   ├── engine.py                # CorrelationEngine: sliding window of recent events;
│   │                             #   evaluates rules against window; emits CorrelatedEvent
│   │                             #   when pattern matches across multiple probes/subsystems
│   ├── rules.py                 # CorrelationRule dataclass: conditions[], time_window,
│   │                             #   root_cause, recommended_action, confidence_score
│   └── builtin_rules.yaml      # Pre-defined correlation rules:
│                                 #   - thermal_trip + nvme_latency_spike = cooling_failure
│                                 #   - aer_fatal + fence_timeout + same_bdf = pcie_link_failure
│                                 #   - mce_burst + thermal_trip = memory_thermal_stress
│                                 #   - tcp_retrans + rdma_errors = fabric_congestion
├── cli/                          # Command-line interface for one-shot diagnostics
│   ├── __init__.py
│   ├── main.py                  # CLI entry: argparse with subcommands (run, check, status, version)
│   ├── check.py                 # One-shot health check: `diagd check --storage --pcie`
│   │                             #   runs probes for 10s, reports pass/fail, exits
│   └── status.py               # Show agent status: loaded probes, event rates, health
├── config/
│   ├── default.yaml             # Default agent configuration: collector enable/disable, thresholds,
│   │                             #   exporter ports, log paths, poll intervals
│   ├── alert_rules.yaml         # Alert rule definitions: condition expressions, severity levels,
│   │                             #   duration requirements, notification backends
│   └── platforms/               # Platform-specific HAL configuration profiles
│       ├── generic_x86.yaml     # Generic x86 server: enables all standard backends
│       ├── nvidia_dgx.yaml      # NVIDIA DGX: enables NVIDIA GPU HAL, RDMA, fewer storage
│       └── storage_jbof.yaml    # Storage JBOF: many NVMe devices, no GPU, NVMe-oF networking
├── tests/
│   ├── unit/                    # Fast tests, no root, no hardware (mock everything)
│   │   ├── test_collectors.py   # Test event processing, device filtering, lifecycle
│   │   ├── test_decoders.py     # Test pure decoding functions (AER bits, latency calc, IP format)
│   │   ├── test_exporters.py    # Test Prometheus metrics, JSON serialization, alert evaluation
│   │   ├── test_config.py       # Test config loading, env overrides, validation, defaults
│   │   ├── test_hal.py          # Test HAL registry, mock device behavior, backend swap
│   │   ├── test_correlator.py   # Test correlation rules, sliding window, pattern matching
│   │   ├── test_event_bus.py    # Test fan-out dispatch, rate limiting, backpressure
│   │   ├── test_probe_manager.py # Test capability detection, graceful degradation
│   │   └── test_events.py       # Test event serialization, schema validation
│   ├── integration/             # Requires root + BCC; tests actual eBPF probe loading
│   │   ├── test_probe_loading.py    # Verify each .bpf.c compiles and attaches in running kernel
│   │   ├── test_event_pipeline.py   # Verify events flow probe → perf buffer → userspace
│   │   ├── test_prometheus.py       # Start agent, verify /metrics responds with expected metrics
│   │   └── test_correlator_live.py  # Inject real events, verify correlation engine output
│   ├── perf/                    # Performance and stress tests
│   │   ├── test_throughput.py   # Measure: max events/sec before drop, CPU at 100K evt/s
│   │   ├── test_memory.py       # Verify memory stays bounded under sustained load
│   │   └── test_overhead.py     # Measure agent CPU overhead (target: <1% idle, <5% under load)
│   ├── chaos/                   # Fault injection and resilience tests
│   │   ├── test_probe_detach.py # Simulate probe detaching mid-run (kill BPF program)
│   │   ├── test_buffer_overflow.py  # Fill perf buffer faster than consumer, verify no OOM
│   │   ├── test_permission_loss.py  # Drop CAP_PERFMON during runtime, verify graceful degrade
│   │   └── test_hal_failure.py  # HAL backend subprocess crashes, verify agent survives
│   ├── mock/                    # Test doubles for isolated testing
│   │   ├── mock_events.py       # Synthetic eBPF events (MockAEREvent, MockNVMeEvent, etc.)
│   │   ├── mock_tracepoints.py  # Fake tracepoint data generators for event burst simulation
│   │   └── mock_hal.py          # Mock HAL backends (MockStorageDevice, MockDeviceRegistry)
│   │                             #   — enables full testing without any real hardware
│   └── conftest.py              # pytest fixtures: temp dirs, mock registries, config factories
├── docs/
│   ├── architecture.md          # High-level system architecture diagram and data flow
│   ├── hal-design.md            # HAL design guide: how to add new HW backend, interface contracts
│   └── deployment.md            # Deployment guide: install deps, configure, systemd, Grafana
├── Makefile                     # Build targets: install, test, lint, format, clean, docker
├── pyproject.toml               # Python project metadata, dependencies, tool configs (pytest, black)
├── requirements.txt             # Pinned dependencies: bcc, prometheus_client, pyyaml, etc.
└── README.md                    # Project overview, quick start, feature list, architecture summary
```

---

## Hardware Abstraction Layer (HAL) Design

The HAL decouples diagnostic logic from specific hardware implementations,
enabling hot-swap of backends without modifying collectors or probes.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Collectors                                │
│  (storage.py, pcie.py, network.py, gpu.py, thermal.py)      │
│                                                               │
│  Collectors use HAL interfaces — never access hardware       │
│  directly. This means:                                        │
│  - Same collector code works on NVMe, SAS, or SATA          │
│  - Same GPU collector works on NVIDIA or AMD                 │
│  - Swap hardware = swap HAL backend config, not code         │
└───────────────────────────────┬─────────────────────────────┘
                                │ calls abstract interface
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                   HAL Interface Layer                         │
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │AbstractStorage    │  │AbstractPCIeDevice│  ...            │
│  │  .get_devices()  │  │  .get_aer_status()│                │
│  │  .get_smart()    │  │  .get_link_speed()│                │
│  │  .get_latency()  │  │  .get_bdf()       │                │
│  └────────┬─────────┘  └────────┬─────────┘                 │
│           │                      │                            │
└───────────┼──────────────────────┼────────────────────────────┘
            │                      │
     ┌──────┴──────┐       ┌──────┴──────┐
     │             │       │             │
┌────┴────┐ ┌─────┴───┐ ┌─┴───────┐ ┌───┴──────┐
│NVMe HAL │ │SAS HAL  │ │sysfs HAL│ │lspci HAL │
│(nvme-cli│ │(sg_ses, │ │(/sys/bus│ │(setpci)  │
│ sysfs)  │ │ smp)    │ │ /pci/)  │ │          │
└─────────┘ └─────────┘ └─────────┘ └──────────┘
     │           │            │            │
     ▼           ▼            ▼            ▼
  Hardware    Hardware     Hardware     Hardware
```

### HAL Base Classes

```python
# hal/base.py
from abc import ABC, abstractmethod
from typing import List, Dict, Any


class HardwareDevice(ABC):
    """Base class for all HAL device representations."""

    @abstractmethod
    def get_id(self) -> str:
        """Unique identifier (e.g., BDF, /dev path, serial number)."""
        ...

    @abstractmethod
    def get_type(self) -> str:
        """Device type string (e.g., 'nvme', 'sas', 'gpu')."""
        ...

    @abstractmethod
    def is_healthy(self) -> bool:
        """Quick health check."""
        ...

    @abstractmethod
    def get_properties(self) -> Dict[str, Any]:
        """Get device properties (model, firmware, serial, etc.)."""
        ...


class DeviceRegistry:
    """Central registry for all discovered hardware devices."""

    def __init__(self):
        self._devices: Dict[str, HardwareDevice] = {}
        self._backends: List = []

    def discover(self) -> None:
        """Run discovery on all registered backends."""
        for backend in self._backends:
            for device in backend.enumerate():
                self._devices[device.get_id()] = device

    def get_devices_by_type(self, device_type: str) -> List[HardwareDevice]:
        """Get all devices of a given type."""
        return [d for d in self._devices.values() if d.get_type() == device_type]

    def register_backend(self, backend) -> None:
        """Register a HAL backend for device discovery."""
        self._backends.append(backend)
```

### HAL Storage Example

```python
# hal/storage/base.py
from abc import abstractmethod
from hal.base import HardwareDevice
from typing import Dict, Optional


class AbstractStorageDevice(HardwareDevice):
    """Abstract storage device interface."""

    @abstractmethod
    def get_capacity_bytes(self) -> int:
        ...

    @abstractmethod
    def get_smart_data(self) -> Dict[str, Any]:
        """Return SMART/health data (temperature, wear, errors)."""
        ...

    @abstractmethod
    def get_io_stats(self) -> Dict[str, int]:
        """Current I/O statistics (reads, writes, latency)."""
        ...

    @abstractmethod
    def get_firmware_version(self) -> str:
        ...

    @abstractmethod
    def supports_latency_monitoring(self) -> bool:
        """Whether this device supports eBPF latency tracing."""
        ...


# hal/storage/nvme.py
import subprocess
import json
from hal.storage.base import AbstractStorageDevice


class NVMeDevice(AbstractStorageDevice):
    """NVMe device HAL implementation."""

    def __init__(self, dev_path: str):
        self._path = dev_path  # e.g., /dev/nvme0n1

    def get_id(self) -> str:
        return self._path

    def get_type(self) -> str:
        return "nvme"

    def is_healthy(self) -> bool:
        smart = self.get_smart_data()
        return smart.get("critical_warning", 1) == 0

    def get_smart_data(self) -> Dict[str, Any]:
        result = subprocess.run(
            ["nvme", "smart-log", self._path, "-o", "json"],
            capture_output=True, text=True
        )
        return json.loads(result.stdout)

    def get_io_stats(self) -> Dict[str, int]:
        # Read from /sys/block/nvme0n1/stat
        ...

    def get_firmware_version(self) -> str:
        props = self.get_properties()
        return props.get("firmware_rev", "unknown")

    def get_capacity_bytes(self) -> int:
        ...

    def supports_latency_monitoring(self) -> bool:
        return True  # NVMe always supports block tracepoints

    def get_properties(self) -> Dict[str, Any]:
        result = subprocess.run(
            ["nvme", "id-ctrl", self._path, "-o", "json"],
            capture_output=True, text=True
        )
        return json.loads(result.stdout)
```

### HAL Configuration (Platform Profiles)

```yaml
# config/platforms/nvidia_dgx.yaml
platform:
  name: "NVIDIA DGX A100"
  arch: x86_64

hal:
  storage:
    backends:
      - type: nvme
        discovery: sysfs       # /sys/class/nvme/
      - type: sas
        enabled: false

  pcie:
    backends:
      - type: linux_sysfs

  network:
    backends:
      - type: ethtool
      - type: rdma
        enabled: true          # GPU-Direct RDMA present

  gpu:
    backends:
      - type: nvidia
        smi_path: /usr/bin/nvidia-smi

  thermal:
    backends:
      - type: hwmon
      - type: ipmi
        enabled: true


# config/platforms/storage_jbof.yaml
platform:
  name: "Storage JBOF (NVMe-oF Target)"
  arch: x86_64

hal:
  storage:
    backends:
      - type: nvme
        discovery: sysfs
        filter: "nvme[0-9]*"   # all NVMe devices

  pcie:
    backends:
      - type: linux_sysfs

  network:
    backends:
      - type: ethtool
      - type: rdma
        enabled: true          # NVMe-oF over RDMA

  gpu:
    backends: []               # no GPUs on storage node

  thermal:
    backends:
      - type: hwmon
      - type: ipmi
```

### How Collectors Use HAL

```python
# collectors/storage.py (updated to use HAL)
from hal.registry import DeviceRegistry
from hal.storage.base import AbstractStorageDevice
from collectors.base import BaseCollector


class StorageCollector(BaseCollector):
    """Storage diagnostics collector — hardware-agnostic via HAL."""

    def __init__(self, config, registry: DeviceRegistry):
        super().__init__(config)
        self._registry = registry

    def discover_devices(self):
        """Get all storage devices from HAL (NVMe, SAS, SATA — transparent)."""
        return self._registry.get_devices_by_type("nvme") + \
               self._registry.get_devices_by_type("sas") + \
               self._registry.get_devices_by_type("sata")

    def collect_health(self):
        """Collect health from all storage devices, regardless of type."""
        for device in self.discover_devices():
            smart = device.get_smart_data()
            yield {
                "device": device.get_id(),
                "type": device.get_type(),
                "healthy": device.is_healthy(),
                "temperature": smart.get("temperature"),
                "wear_level": smart.get("percentage_used"),
            }

    def get_probe_targets(self):
        """Return only devices that support eBPF latency tracing."""
        return [d for d in self.discover_devices()
                if d.supports_latency_monitoring()]
```

### Benefits of HAL

| Benefit | Description |
|---------|-------------|
| **Hardware hot-swap** | Replace NVMe with SAS → change platform config, not code |
| **Multi-vendor support** | Same collector works for Samsung, Intel, Micron NVMe |
| **Testing** | Mock HAL backends in unit tests (no real hardware) |
| **Platform profiles** | DGX, storage JBOF, generic x86 — preconfigured |
| **Graceful degradation** | If a HAL backend fails to load, agent continues with others |
| **Discovery** | Auto-detect available hardware at startup |
| **Future-proof** | Add CXL memory, new GPU vendors without touching core |

---

## Phase 1: Core Framework (Weeks 1-2)

### Sprint 1.1: Agent Skeleton

| Task | Description | Deliverable |
|------|-------------|-------------|
| 1.1.1 | Project scaffolding (pyproject.toml, Makefile) | Build system |
| 1.1.2 | Config loader (YAML-based, env overrides) | `config/default.yaml` |
| 1.1.3 | Abstract `BaseCollector` class | `collectors/base.py` |
| 1.1.4 | Event pipeline (collector → exporter) | `cmd/diagd/main.py` |
| 1.1.5 | Prometheus exporter (HTTP /metrics) | `exporters/prometheus.py` |
| 1.1.6 | JSON log exporter (stdout/file) | `exporters/json_log.py` |
| 1.1.7 | Graceful shutdown (SIGINT/SIGTERM) | Signal handlers |
| 1.1.8 | Systemd unit file | `ebpf-hw-diag.service` |

### Sprint 1.2: First Probe (PCIe AER — already done)

| Task | Description | Deliverable |
|------|-------------|-------------|
| 1.2.1 | Port `pcie_aer_monitor.py` into agent framework | `collectors/pcie.py` |
| 1.2.2 | Define Prometheus metrics (counter, histogram) | AER metrics |
| 1.2.3 | Add alert rules (Fatal → critical alert) | `alert_rules.yaml` |
| 1.2.4 | Unit tests for PCIe decoder | `tests/unit/test_decoders.py` |
| 1.2.5 | Integration test (load probe, verify event) | `tests/integration/` |

---

## Phase 2: Storage Diagnostics (Weeks 3-4)

| Task | Description | Deliverable |
|------|-------------|-------------|
| 2.1 | NVMe I/O latency probe (block tracepoints) | `probes/storage/nvme_latency.bpf.c` |
| 2.2 | NVMe collector (decode events, compute histograms) | `collectors/storage.py` |
| 2.3 | Per-device latency percentiles (P50/P99/P999) | Prometheus histogram |
| 2.4 | NVMe queue depth saturation probe | `probes/storage/nvme_queue_depth.bpf.c` |
| 2.5 | Latency threshold alerting (P99 > X μs) | Alert rule |
| 2.6 | Unit tests for histogram computation | Tests |
| 2.7 | Integration test with real NVMe (or mock) | Tests |

---

## Phase 3: Network Fabric (Weeks 5-6)

| Task | Description | Deliverable |
|------|-------------|-------------|
| 3.1 | TCP retransmission probe | `probes/network/tcp_retrans.bpf.c` |
| 3.2 | Network collector (per-flow retransmit stats) | `collectors/network.py` |
| 3.3 | RDMA error probe (if tracepoints available) | `probes/network/rdma_errors.bpf.c` |
| 3.4 | NIC drop correlation (softnet_stat reader) | Supplementary metric |
| 3.5 | Alert: retransmit rate > threshold | Alert rule |
| 3.6 | Unit tests for network decoder | Tests |

---

## Phase 4: Thermal & Power (Weeks 7-8)

| Task | Description | Deliverable |
|------|-------------|-------------|
| 4.1 | Thermal throttle probe | `probes/thermal/throttle_events.bpf.c` |
| 4.2 | CPU frequency tracking probe | `probes/thermal/cpu_freq.bpf.c` |
| 4.3 | Thermal collector (event → metric) | `collectors/thermal.py` |
| 4.4 | Cross-layer correlation engine | Correlate thermal + I/O latency |
| 4.5 | PMBus VRM monitor probe (optional) | `probes/thermal/pmbus_fault.bpf.c` |
| 4.6 | Alert: thermal trip or sustained throttle | Alert rule |
| 4.7 | Unit tests | Tests |

---

## Phase 5: GPU & Memory (Weeks 9-10)

| Task | Description | Deliverable |
|------|-------------|-------------|
| 5.1 | GPU DMA fence timeout probe | `probes/gpu/fence_timeout.bpf.c` |
| 5.2 | IOMMU fault probe | `probes/gpu/iommu_fault.bpf.c` |
| 5.3 | GPU collector | `collectors/gpu.py` |
| 5.4 | DMA mapping failure probe | `probes/memory/dma_failures.bpf.c` |
| 5.5 | MCE (ECC error) probe | `probes/memory/mce_events.bpf.c` |
| 5.6 | Memory collector | `collectors/memory.py` |
| 5.7 | Alert: GPU hang, ECC threshold | Alert rules |
| 5.8 | Unit tests | Tests |

---

## Phase 6: Integration & Deployment (Weeks 11-12)

| Task | Description | Deliverable |
|------|-------------|-------------|
| 6.1 | Cross-layer event correlation engine | `collectors/correlator.py` |
| 6.2 | Grafana dashboard templates | `docs/grafana-dashboard.json` |
| 6.3 | Deployment automation (Ansible/script) | Deployment docs |
| 6.4 | Performance benchmarking (overhead < 1% CPU) | Benchmark report |
| 6.5 | End-to-end integration tests | Full pipeline tests |
| 6.6 | Documentation & README | Final docs |

---

## Configuration Design

```yaml
# config/default.yaml
agent:
  log_level: info
  poll_interval_ms: 1000

collectors:
  storage:
    enabled: true
    latency_threshold_us: 5000     # P99 alert threshold
    devices: ["nvme*"]             # glob pattern
  pcie:
    enabled: true
    severity_filter: all           # all, corrected, fatal, nonfatal
  network:
    enabled: true
    retransmit_alert_rate: 100     # per second
  thermal:
    enabled: true
    throttle_alert: true
  gpu:
    enabled: false                 # enable on GPU servers
    fence_timeout_ms: 5000
  memory:
    enabled: true
    mce_alert: true

exporters:
  prometheus:
    enabled: true
    port: 9101
    path: /metrics
  json_log:
    enabled: true
    output: /var/log/ebpf-hw-diag/events.jsonl
    rotate_mb: 100
  alerter:
    enabled: true
    rules_file: /etc/ebpf-hw-diag/alert_rules.yaml
    backends:
      - type: webhook
        url: https://hooks.slack.com/services/XXX
      - type: syslog
        facility: local0
```

---

## Alert Rules Design

```yaml
# config/alert_rules.yaml
rules:
  - name: pcie_fatal_error
    condition: "pcie_aer_errors{severity='Fatal'} > 0"
    severity: critical
    message: "PCIe Fatal error on device {{ .device }}"

  - name: nvme_high_latency
    condition: "nvme_latency_p99_us > 5000"
    duration: 60s
    severity: warning
    message: "NVMe {{ .device }} P99 latency {{ .value }}μs"

  - name: tcp_retransmit_storm
    condition: "rate(tcp_retransmits_total[1m]) > 100"
    severity: warning
    message: "High TCP retransmit rate to {{ .dest }}"

  - name: thermal_throttle
    condition: "thermal_throttle_events_total increase > 0"
    severity: warning
    message: "Thermal throttling on zone {{ .zone }}"

  - name: gpu_hang
    condition: "gpu_fence_timeout_total > 0"
    severity: critical
    message: "GPU hang detected: fence timeout {{ .duration_ms }}ms"

  - name: ecc_errors
    condition: "rate(mce_corrected_errors_total[1h]) > 10"
    severity: warning
    message: "ECC errors increasing on {{ .dimm }}"
```

---

## Technology Stack

| Component | Choice | Reason |
|-----------|--------|--------|
| Language (userspace) | Python 3.10+ | BCC bindings, rapid development |
| eBPF framework | BCC (dev) → libbpf (prod) | BCC for prototyping, libbpf for deployment |
| Metrics | Prometheus client_python | Industry standard |
| Config | PyYAML | Simple, human-readable |
| Testing | pytest + pytest-mock | Standard Python testing |
| Packaging | systemd + pip/deb | Easy deployment |
| CI | GitHub Actions | Automated testing |

---

## Milestones & Acceptance Criteria

| Milestone | Week | Acceptance |
|-----------|------|------------|
| M1: Framework MVP | 2 | Agent starts, loads 1 probe, exports metrics |
| M2: Storage monitoring | 4 | NVMe latency + PCIe AER → Prometheus |
| M3: Network monitoring | 6 | TCP retrans tracking, alerts fire |
| M4: Full sensor coverage | 10 | All 6 subsystems monitored |
| M5: Production ready | 12 | <1% CPU overhead, Grafana dashboard, docs |

---

## BCC → libbpf Migration Strategy

### Why Migrate

| Aspect | BCC (Development) | libbpf + CO-RE (Production) |
|--------|-------------------|----------------------------|
| Startup | Slow (compiles at runtime) | Fast (pre-compiled .o) |
| Dependencies | Clang/LLVM + kernel headers on target | Only libbpf (~100KB) |
| Portability | Needs exact kernel headers | CO-RE + BTF = run anywhere |
| Resource | ~150MB RAM for compiler | ~5MB total |

### Migration Criteria (When to Switch)

```
Phase 1-4: Use BCC (rapid prototyping, easier debugging)
    ↓ trigger: when probe is STABLE (no changes for 2+ sprints)
Phase 5+:  Compile stable probes to .bpf.o with libbpf
    ↓ trigger: production deployment target
Release:   Ship only .bpf.o files (no BCC dependency on target)
```

### Migration Steps Per Probe

1. Rewrite `.bpf.c` to use libbpf conventions (`SEC()`, `vmlinux.h`, no BCC macros)
2. Generate skeleton: `bpftool gen skeleton probe.bpf.o > probe.skel.h`
3. Write thin Python wrapper using `ctypes` + subprocess to load skeleton
4. Alternatively: use `pylibbpf` or call Go/Rust loader from Python via subprocess
5. Keep BCC version as fallback for kernels without BTF

### Dual-Mode Support

```python
# core/probe_manager.py
class ProbeManager:
    def load_probe(self, probe_name: str):
        if self._has_libbpf_binary(probe_name):
            return self._load_libbpf(probe_name)  # fast path
        elif self._has_bcc_source(probe_name):
            return self._load_bcc(probe_name)      # dev/fallback path
        else:
            raise ProbeNotFoundError(probe_name)
```

---

## Rate Limiting & Backpressure Strategy

### Problem
Under failure conditions (e.g., IRQ storm, AER burst), a probe can generate
millions of events/second. Without rate limiting, the agent will:
- Exhaust perf buffer → events dropped silently
- OOM from unbounded event queue in userspace
- Starve CPU processing events instead of actual workload

### Solution: Three-Layer Protection

```
Layer 1: Kernel-side (BPF program)
    - BPF_HASH rate counter per device
    - If events > threshold/sec → stop submitting to perf buffer
    - Log "rate limited" counter in BPF map (visible to userspace)

Layer 2: Perf Buffer (kernel ↔ userspace boundary)
    - Fixed-size ring buffer (configurable, default 64 pages/CPU)
    - If full → kernel drops oldest events (not blocking producer)
    - Agent reads lost_events count and reports as metric

Layer 3: Userspace Event Bus
    - Token bucket rate limiter per collector (default: 10K events/sec)
    - Backpressure: if exporter queue full, drop with "backpressure" metric
    - Sampling: under overload, switch to 1-in-N sampling (configurable)
```

### Configuration

```yaml
# config/default.yaml additions:
rate_limiting:
  global_max_events_per_sec: 100000
  per_collector:
    storage: 50000
    pcie: 10000
    network: 50000
    gpu: 5000
    thermal: 1000
    memory: 5000
  backpressure:
    strategy: drop_oldest       # drop_oldest | sample | block
    sample_rate_under_pressure: 10  # keep 1 in 10 events
  perf_buffer:
    pages_per_cpu: 64           # 64 * 4KB = 256KB per CPU
    lost_events_alert_threshold: 1000  # alert if >1000 events lost/minute
```

### Self-Monitoring Metrics

```
# Exposed on /metrics:
diagd_events_processed_total{collector="storage"} 12345
diagd_events_dropped_total{collector="storage",reason="rate_limit"} 0
diagd_events_dropped_total{collector="pcie",reason="backpressure"} 42
diagd_perf_buffer_lost_total{probe="aer_monitor"} 0
diagd_probe_load_failures_total{probe="rdma_errors"} 1
diagd_uptime_seconds 3600
diagd_cpu_usage_percent 0.8
diagd_memory_bytes 52428800
```

---

## Event Flow Architecture (Updated)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Kernel Space                                  │
│                                                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│  │ Probe 1  │ │ Probe 2  │ │ Probe 3  │ │ Probe N  │              │
│  │(storage) │ │ (pcie)   │ │(network) │ │  (...)   │              │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘              │
│       │ [rate limit]│            │             │                     │
│       ▼             ▼            ▼             ▼                     │
│  ┌────────────────────────────────────────────────────┐             │
│  │              Perf Ring Buffers (per-CPU)            │             │
│  └────────────────────────┬───────────────────────────┘             │
└───────────────────────────┼─────────────────────────────────────────┘
                            │ poll (1ms interval)
                            ▼
┌───────────────────────────────────────────────────────────────────────┐
│                        Userspace Agent                                  │
│                                                                         │
│  ┌──────────────┐                                                      │
│  │ ProbeManager │ — load/attach/health-check/hot-reload probes        │
│  └──────┬───────┘                                                      │
│         │ raw bytes                                                     │
│         ▼                                                               │
│  ┌──────────────┐                                                      │
│  │ Collectors   │ — decode raw → typed DiagEvent; apply device filter  │
│  │ (per-subsys) │                                                      │
│  └──────┬───────┘                                                      │
│         │ DiagEvent                                                     │
│         ▼                                                               │
│  ┌──────────────┐   rate_limiter (token bucket per collector)          │
│  │  Event Bus   │ ─────────────────────────────────────────────┐      │
│  └──┬───┬───┬───┘                                              │      │
│     │   │   │                                                   │      │
│     ▼   ▼   ▼                                                   ▼      │
│  ┌────┐┌────┐┌────────┐                              ┌──────────────┐ │
│  │Prom││JSON││Alerter │                              │ Correlator   │ │
│  │etheus││Log ││        │                              │ Engine       │ │
│  └────┘└────┘└────────┘                              │ (sliding     │ │
│                                                       │  window +    │ │
│                                                       │  rule eval)  │ │
│                                                       └──────┬───────┘ │
│                                                              │         │
│                                                    CorrelatedEvent     │
│                                                              │         │
│                                                     ┌────────▼───────┐ │
│                                                     │ Action Engine  │ │
│                                                     │ (webhook, K8s  │ │
│                                                     │  taint, IPMI)  │ │
│                                                     └────────────────┘ │
│                                                                         │
│  ┌──────────────┐                                                      │
│  │ Health Check │ — /healthz + self-metrics + liveness probe           │
│  └──────────────┘                                                      │
└───────────────────────────────────────────────────────────────────────┘
```
