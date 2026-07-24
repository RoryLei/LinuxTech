# PCIe AER Monitor — Architecture & Data Flow

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER SPACE                                      │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │           pcie_aer_monitor.py  (BCC Python)                      │    │
│  │                                                                   │    │
│  │  1. Load eBPF program into kernel                                │    │
│  │  2. Set severity filter in BPF_ARRAY map                        │    │
│  │  3. Open perf buffer for event reception                         │    │
│  │  4. Poll perf buffer in event loop                               │    │
│  │  5. Decode status bits → human-readable error names              │    │
│  │  6. Output: terminal (colored) / JSON / statistics               │    │
│  │                                                                   │    │
│  │  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌────────────┐   │    │
│  │  │  Filter  │   │  Decode  │   │  Stats   │   │   Output   │   │    │
│  │  │ severity │──▶│  status  │──▶│ collect  │──▶│ text/json  │   │    │
│  │  └──────────┘   └──────────┘   └──────────┘   └────────────┘   │    │
│  └───────────────────────────▲───────────────────────────────────────┘    │
│                              │                                            │
│                    Perf Buffer (ring buffer)                              │
│                    struct aer_event_t {                                   │
│                      dev_name[64], status,                                │
│                      severity, tlp_header_valid,                          │
│                      tlp_header[4], timestamp_ns                          │
│                    }                                                      │
│                              │                                            │
├──────────────────────────────┼────────────────────────────────────────────┤
│                              │          KERNEL SPACE                      │
│                              │                                            │
│  ┌───────────────────────────┴───────────────────────────────────────┐   │
│  │              eBPF Program (JIT-compiled, sandboxed)                │   │
│  │                                                                    │   │
│  │   TRACEPOINT_PROBE(ras, aer_event) {                              │   │
│  │     1. Check severity_filter map                                   │   │
│  │     2. Read args→dev_name, status, severity, tlp_header           │   │
│  │     3. Fill struct aer_event_t                                     │   │
│  │     4. perf_submit() → send to userspace                          │   │
│  │   }                                                                │   │
│  └───────────────────────────▲───────────────────────────────────────┘   │
│                              │                                            │
│                   tracepoint: ras:aer_event                               │
│                              │                                            │
│  ┌───────────────────────────┴───────────────────────────────────────┐   │
│  │                   PCIe AER Kernel Driver                           │   │
│  │                   (drivers/pci/pcie/aer.c)                        │   │
│  │                                                                    │   │
│  │   1. Root Port detects error via AER interrupt (MSI/MSI-X)        │   │
│  │   2. Driver reads AER capability registers:                        │   │
│  │      - Uncorrectable Error Status (offset 0x04)                   │   │
│  │      - Correctable Error Status (offset 0x10)                     │   │
│  │      - Header Log Register (offset 0x1C, 4 DWORDs)               │   │
│  │   3. Determines severity (Corrected / Non-Fatal / Fatal)          │   │
│  │   4. Calls trace_aer_event(dev_name, status, severity, tlp)      │   │
│  │   5. Logs to dmesg and notifies error recovery subsystem          │   │
│  │                                                                    │   │
│  └───────────────────────────▲───────────────────────────────────────┘   │
│                              │                                            │
│                     AER Interrupt (MSI/MSI-X)                             │
│                              │                                            │
├──────────────────────────────┼────────────────────────────────────────────┤
│                              │          HARDWARE                          │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                      PCIe Root Complex                              │  │
│  │                                                                     │  │
│  │   ┌──────────┐     ┌──────────┐     ┌──────────┐                  │  │
│  │   │Root Port │     │Root Port │     │Root Port │                  │  │
│  │   │  00:01.0 │     │  00:02.0 │     │  00:03.0 │                  │  │
│  │   └────┬─────┘     └────┬─────┘     └────┬─────┘                  │  │
│  │        │                 │                 │                         │  │
│  └────────┼─────────────────┼─────────────────┼─────────────────────── │  │
│           │                 │                 │                            │
│  ┌────────▼─────┐  ┌───────▼──────┐  ┌───────▼──────┐                   │
│  │  PCIe Device │  │  PCIe Device │  │  PCIe Device │                   │
│  │   03:00.0    │  │   05:00.0    │  │   06:00.0    │                   │
│  │  (NVMe SSD)  │  │  (NIC)       │  │  (GPU)       │                   │
│  │              │  │              │  │              │                   │
│  │ AER Cap:     │  │ AER Cap:     │  │ AER Cap:     │                   │
│  │ ┌──────────┐│  │ ┌──────────┐│  │ ┌──────────┐│                   │
│  │ │Uncorr Err││  │ │Uncorr Err││  │ │Uncorr Err││                   │
│  │ │Corr Err  ││  │ │Corr Err  ││  │ │Corr Err  ││                   │
│  │ │TLP Header││  │ │TLP Header││  │ │TLP Header││                   │
│  │ └──────────┘│  │ └──────────┘│  │ └──────────┘│                   │
│  └──────────────┘  └──────────────┘  └──────────────┘                   │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

## Data Flow (numbered sequence)

```
 ①  PCIe Device detects a protocol error
     (e.g., Bad TLP, Completion Timeout, ECRC failure)
          │
          ▼
 ②  Device sets error bit in its AER Capability Status Register
     and signals the Root Port
          │
          ▼
 ③  Root Port generates AER interrupt (MSI/MSI-X) to CPU
          │
          ▼
 ④  Kernel AER driver interrupt handler fires
     - Reads error status registers from device config space
     - Reads TLP Header Log (if available)
     - Determines severity level
          │
          ▼
 ⑤  AER driver calls trace_aer_event()
     → triggers tracepoint "ras:aer_event"
     → also logs to dmesg (kernel ring buffer)
          │
          ▼
 ⑥  eBPF program (attached to tracepoint) executes
     - Checks severity filter (BPF_ARRAY map)
     - Copies event data into struct aer_event_t
     - Calls perf_submit() to enqueue into perf buffer
          │
          ▼
 ⑦  Userspace Python program receives event from perf buffer
     - Decodes status bits to error names
     - Formats output (text or JSON)
     - Accumulates statistics
     - Prints to stdout / pipes to log system
```

## Key Components Explained

### Hardware Layer
- **PCIe AER Capability** — Each PCIe device has an optional AER Extended Capability structure (PCIe spec §6.2) containing error status registers, mask registers, and a 4-DWORD TLP Header Log.
- **Root Port** — Acts as the aggregation point; receives error messages from downstream devices and generates interrupts to notify the OS.

### Kernel Layer
- **AER Driver** (`drivers/pci/pcie/aer.c`) — Handles the interrupt, reads registers, and invokes error recovery (if needed). Requires firmware to grant AER control to OS via ACPI `_OSC`.
- **Tracepoint** (`ras:aer_event`) — Static instrumentation point defined in `include/ras/ras_event.h`. Zero overhead when no consumer is attached.
- **eBPF Verifier + JIT** — Ensures our program is safe, then compiles it to native code for near-zero runtime cost.

### Userspace Layer
- **BCC** — Compiles the C eBPF code, loads it into the kernel, and provides Python bindings for map/buffer access.
- **Perf Buffer** — Lock-free ring buffer for efficient kernel→userspace data transfer (one per CPU).
- **Application Logic** — Decoding, filtering, formatting, statistics — all done in userspace to keep the eBPF program minimal and fast.

## Performance Characteristics

| Metric | Value |
|--------|-------|
| Kernel-side overhead per event | ~200-500 ns |
| Userspace latency (event → output) | ~1-10 μs |
| Memory (BPF maps + perf buffer) | ~64 KB per CPU |
| CPU when idle (no errors) | 0% (event-driven) |
| CPU during burst (1000 errors/sec) | < 1% |
