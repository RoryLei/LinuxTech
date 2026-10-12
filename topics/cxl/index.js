/**
 * Topic: Linux CXL (Compute Express Link) Memory Management & the cxl_mem Subsystem
 *
 * A deep architectural dive into how the Linux kernel discovers, configures,
 * and exposes CXL memory, centered on the CXL.mem Type-3 memory-device
 * subsystem (cxl_pci / cxl_memdev / cxl_port / HDM decoders / cxl_region).
 */

/* Accessible palette (declared BEFORE use so the SVG helpers below are
 * initialized before the topic object literal calls them — avoids a
 * temporal-dead-zone ReferenceError at load time that would blank the site).
 * ONE neutral-blue hue for every box (#cfe3ff fill, #1f2d3d stroke) on a
 * #0d1117 background. Element identity is carried by NUMBER badges +
 * position + shape + text, never by hue. No red/green/yellow conveys
 * meaning. Table borders use #30363d. */
const CXL_BOX_FILL = "#cfe3ff";
const CXL_BOX_STROKE = "#1f2d3d";
const CXL_TEXT = "#0f172a";
const CXL_NOTE = "#c9d4e0";
const CXL_ARROW = "#9db4cc";
const CXL_BG = "#0d1117";

/* =====================================================================
 * Accessible inline SVG diagram helpers. Single blue fill, numbered
 * circle badges, arrows, high-contrast text — mirrors the regmap /
 * irq-domain / ocp-diag visual style.
 * =================================================================== */

// Centered-label box with an optional numbered badge on the left.
function cxlBox(x, y, w, h, label, badge) {
  const cy = y + h / 2;
  const r = 13;
  let s =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ` +
    `fill="${CXL_BOX_FILL}" stroke="${CXL_BOX_STROKE}" stroke-width="1.5"></rect>`;
  if (badge !== undefined) {
    s +=
      `<circle cx="${x + r + 4}" cy="${cy}" r="${r}" fill="${CXL_BOX_STROKE}"></circle>` +
      `<text x="${x + r + 4}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="13" font-weight="700" fill="#ffffff">${badge}</text>`;
  }
  const tx = badge !== undefined ? x + r + 4 + (w - r - 4) / 2 : x + w / 2;
  s +=
    `<text x="${tx}" y="${cy + 5}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="13.5" font-weight="600" fill="${CXL_TEXT}">${label}</text>`;
  return s;
}

// Wide box with left-aligned text (used for flow-step boxes).
function cxlStepBox(x, y, w, h, label, badge) {
  const cy = y + h / 2;
  const r = 13;
  let s =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ` +
    `fill="${CXL_BOX_FILL}" stroke="${CXL_BOX_STROKE}" stroke-width="1.5"></rect>`;
  if (badge !== undefined) {
    s +=
      `<circle cx="${x + r + 4}" cy="${cy}" r="${r}" fill="${CXL_BOX_STROKE}"></circle>` +
      `<text x="${x + r + 4}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="13" font-weight="700" fill="#ffffff">${badge}</text>`;
  }
  s +=
    `<text x="${x + (badge !== undefined ? r + 24 : 14)}" y="${cy + 4}" ` +
    `font-family="sans-serif" font-size="12.5" fill="${CXL_TEXT}">${label}</text>`;
  return s;
}

// Small label (two optional lines) centered under a point.
function cxlCaption(cx, y, text) {
  return (
    `<text x="${cx}" y="${y}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="12" fill="${CXL_NOTE}">${text}</text>`
  );
}

// A diamond decision node (shape, not color, carries the "decision" meaning).
function cxlDiamond(cx, cy, halfW, halfH, label) {
  let s =
    `<polygon points="${cx},${cy - halfH} ${cx + halfW},${cy} ${cx},${cy + halfH} ${cx - halfW},${cy}" ` +
    `fill="${CXL_BOX_FILL}" stroke="${CXL_BOX_STROKE}" stroke-width="1.5"></polygon>`;
  s +=
    `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="12" font-weight="600" fill="${CXL_TEXT}">${label}</text>`;
  return s;
}

function cxlVArrow(x, y1, y2) {
  return (
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${CXL_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x - 5},${y2 - 6} ${x + 5},${y2 - 6} ${x},${y2}" fill="${CXL_ARROW}"></polygon>`
  );
}

function cxlVArrowUp(x, y1, y2) {
  return (
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${CXL_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x - 5},${y2 + 6} ${x + 5},${y2 + 6} ${x},${y2}" fill="${CXL_ARROW}"></polygon>`
  );
}

function cxlHArrow(x1, y, x2) {
  const dir = x2 >= x1 ? 1 : -1;
  return (
    `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${CXL_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x2 - dir * 7},${y - 5} ${x2 - dir * 7},${y + 5} ${x2},${y}" fill="${CXL_ARROW}"></polygon>`
  );
}

// Plain line (no arrowhead) for topology links.
function cxlLine(x1, y1, x2, y2) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${CXL_ARROW}" stroke-width="2"></line>`;
}

function cxlFrame(viewW, viewH, title, subtitle, body, ariaLabel) {
  return (
    `<div style="overflow-x:auto; margin:1rem 0; padding:1rem; background:${CXL_BG}; ` +
    `border:1px solid #30363d; border-radius:8px;">` +
    `<div style="text-align:center; font-weight:700; font-size:1.05rem; color:#58a6ff; margin-bottom:0.25rem;">${title}</div>` +
    `<div style="text-align:center; font-size:0.85rem; color:#8b949e; margin-bottom:0.75rem;">${subtitle}</div>` +
    `<svg viewBox="0 0 ${viewW} ${viewH}" width="100%" role="img" aria-label="${ariaLabel}">${body}</svg>` +
    `</div>`
  );
}

// Diagram 1: ARCHITECTURE — the CXL stack over PCIe PHY, the three
// protocols, and a Type-3 memory expander exposing media.
function cxlArchitectureSVG() {
  const w = 760, h = 50;
  let body = "";

  // Host side (left) and Device side (right), linked by the CXL link.
  const hostX = 30, devX = 500, colW = 230;

  // Host CPU + home agent box (badge 1)
  body += cxlBox(hostX, 30, colW, h, "Host CPU + coherency", 1);
  body += cxlCaption(hostX + colW / 2, 30 + h + 16, "issues loads/stores in SPA/HPA");

  // Three protocol lanes in the middle
  const laneX = 300, laneW = 160, laneTop = 120;
  const lanes = ["CXL.io", "CXL.cache", "CXL.mem"];
  const laneNotes = [
    "discovery / config / IO (PCIe-like)",
    "device coherently caches host memory",
    "host accesses device memory coherently",
  ];
  lanes.forEach((l, i) => {
    const y = laneTop + i * (h + 14);
    body += cxlBox(laneX, y, laneW, h, l, i + 2);
    body += cxlCaption(laneX + laneW + 160, y + h / 2 + 4, laneNotes[i]);
  });

  // PCIe PHY carrier bar under the lanes
  const phyY = laneTop + 3 * (h + 14) + 6;
  body += cxlStepBox(laneX - 150, phyY, 460, 38,
    "CXL link multiplexed on the PCIe physical / electrical layer (FLITs)", 5);

  // Device: Type-3 memory expander (badge 6) + media (badge 7)
  body += cxlBox(devX, 30, colW, h, "Type-3 memory expander", 6);
  body += cxlCaption(devX + colW / 2, 30 + h + 16, "CXL.io + CXL.mem only");
  body += cxlBox(devX, 30 + h + 36, colW, h, "Device media (RAM / pmem)", 7);

  // Links: host -> lanes (CXL.mem highlighted as the memory path by label)
  body += cxlHArrow(hostX + colW, 30 + h / 2, laneX);
  // lanes -> device (the CXL.mem lane, badge 4, feeds the expander)
  const memLaneY = laneTop + 2 * (h + 14) + h / 2;
  body += cxlHArrow(laneX + laneW, memLaneY, devX);
  body += cxlCaption((laneX + laneW + devX) / 2, memLaneY - 10, "memory path");
  // expander -> media
  body += cxlVArrow(devX + colW / 2, 30 + h, 30 + h + 36);

  const vh = phyY + 60;
  return cxlFrame(
    w, vh,
    "CXL Architecture — Three Protocols over the PCIe PHY",
    "Host (1) drives CXL.io/.cache/.mem (2-4) over the shared PCIe electrical layer (5); a Type-3 expander (6) exposes media (7) via CXL.mem",
    body,
    "CXL architecture: the host CPU issues loads and stores; the CXL.io, CXL.cache and CXL.mem protocols are multiplexed over the shared PCIe physical layer; a Type-3 memory expander exposes RAM or persistent-memory media over the CXL.mem memory path."
  );
}

// Diagram 2: DRIVER OBJECT MODEL / TOPOLOGY — cxl_pci -> cxl_memdev and
// the cxl_port tree (root -> host-bridge port -> switch port -> endpoint),
// with HDM decoders and a cxl_region spanning endpoints.
function cxlObjectModelSVG() {
  const w = 760, h = 46;
  let body = "";

  // Left column: PCI binding path.
  body += cxlBox(30, 40, 200, h, "cxl_pci (PCIe func)", 1);
  body += cxlVArrow(130, 40 + h, 120);
  body += cxlBox(30, 120, 200, h, "cxl_memdev — memN", 2);
  body += cxlCaption(130, 120 + h + 16, "/sys/bus/cxl/devices/memN");

  // Right column: cxl_port topology (badge chain 3..6).
  const px = 320, pw = 410;
  const ports = [
    ["cxl_port: root (platform decode ranges from firmware)", 3],
    ["cxl_port: host-bridge port (HDM decoder)", 4],
    ["cxl_port: switch port (interleave split point)", 5],
    ["cxl_port: endpoint (HDM decoder, SPA->DPA)", 6],
  ];
  const topY = 40, gap = 24;
  ports.forEach((p, i) => {
    const y = topY + i * (h + gap);
    body += cxlStepBox(px, y, pw, h, p[0], p[1]);
    if (i < ports.length - 1) body += cxlVArrow(px + pw / 2, y + h, y + h + gap);
  });

  // cxl_region spanning the endpoints (badge 7), drawn as a tall bracket box.
  const endY = topY + 3 * (h + gap);
  body += cxlStepBox(px, endY + h + 18, pw, h, "cxl_region — assembled SPA/HPA range (nr_targets endpoints)", 7);
  body += cxlVArrow(px + pw / 2, endY + h, endY + h + 18);

  // Link the memdev to the endpoint port (the endpoint represents this memN).
  body += cxlLine(230, 120 + h / 2, px, topY + 3 * (h + gap) + h / 2);
  body += cxlCaption(275, 120 + h / 2 - 8, "endpoint = memN");

  const vh = endY + h + 18 + h + 30;
  return cxlFrame(
    w, vh,
    "Linux CXL Driver Object Model & Port Topology",
    "cxl_pci (1) binds the expander and brings up cxl_memdev memN (2); the cxl_port tree root->host-bridge->switch->endpoint (3-6) decodes CXL.mem; a cxl_region (7) assembles across endpoints",
    body,
    "Linux CXL object model: cxl_pci binds the PCIe function and creates the cxl_memdev memN device; the cxl_port topology descends from the root through host-bridge and switch ports to the endpoint, each carrying HDM decoders; a cxl_region assembles a contiguous address range across one or more endpoints."
  );
}

// Diagram 3: ADDRESS TRANSLATION — HPA/SPA -> root -> switch -> endpoint
// decoder -> DPA, with an interleave illustration.
function cxlTranslationSVG() {
  const w = 760, h = 46, gap = 26;
  let body = "";

  const bx = 150, bw = 460, topY = 20;
  const steps = [
    "CPU issues HPA / SPA (host physical address)",
    "Root decoder: platform window -> select host bridge / port",
    "Switch decoder: apply interleave ways + granularity",
    "Endpoint decoder: translate HPA -> DPA (device physical address)",
    "DPA: offset within this endpoint's media",
  ];
  steps.forEach((s, i) => {
    const y = topY + i * (h + gap);
    body += cxlStepBox(bx, y, bw, h, s, i + 1);
    if (i < steps.length - 1) body += cxlVArrow(bx + bw / 2, y + h, y + h + gap);
  });

  // Interleave illustration on the right: four consecutive HPA granules
  // (G0..G3) landing alternately on endpoint A / endpoint B.
  const ilX = 30, ilY = topY;
  body += cxlCaption(ilX + 50, ilY - 2, "interleave");
  const gran = ["G0", "G1", "G2", "G3"];
  gran.forEach((g, i) => {
    const y = ilY + 12 + i * 34;
    body += cxlBox(ilX, y, 46, 28, g);
    // route even granules to EP-A, odd to EP-B (handled by labels in caption)
  });
  body += cxlCaption(ilX + 23, ilY + 12 + 4 * 34 + 2, "G0,G2->EP A");
  body += cxlCaption(ilX + 23, ilY + 12 + 4 * 34 + 20, "G1,G3->EP B");

  const vh = topY + steps.length * (h + gap) + 10;
  return cxlFrame(
    w, vh,
    "Address Translation — HPA/SPA to DPA through the Decoder Chain",
    "Steps 1-5: the CPU's host physical address descends root -> switch -> endpoint decoders to a device physical address; interleave spreads consecutive granules across endpoints (RAID-set analogy)",
    body,
    "CXL address translation flow: the CPU issues a host physical address; the root decoder selects a host bridge, the switch decoder applies interleave ways and granularity, and the endpoint decoder translates the host physical address to a device physical address, an offset within that endpoint's media. Consecutive address granules are spread across endpoints like an interleaved RAID set."
  );
}

// Diagram 4: OS-EXPOSURE flow chart — region -> dax -> devdax OR
// system-ram -> page allocator -> CPU-less NUMA node, with the
// EFI_MEMORY_SP firmware-defer decision as an upstream gate.
function cxlExposureSVG() {
  const w = 760, h = 48, gap = 26;
  let body = "";

  const cx = w / 2;
  let y = 16;

  // Upstream gate: EFI_MEMORY_SP decision diamond.
  body += cxlDiamond(cx, y + 34, 150, 40, "EFI_MEMORY_SP set?");
  body += cxlCaption(cx, y + 34 + 58, "firmware vs driver ownership");
  // "no" branch note to the left
  body += cxlCaption(cx - 210, y + 34, "no -> normal RAM at __init");
  y += 110;

  // yes -> CXL driver owns the range -> region created
  body += cxlVArrow(cx, y - 18, y);
  body += cxlStepBox(cx - 180, y, 360, h, "CXL driver owns range; cxl_region created", 1);
  y += h + gap;
  body += cxlVArrow(cx, y - gap, y);
  body += cxlStepBox(cx - 180, y, 360, h, "Convert region capacity to a DAX device", 2);
  const branchY = y + h;
  y += h + gap + 6;

  // Branch into devdax (left) and system-ram (right).
  const leftX = 60, rightX = 420, bw = 280;
  body += cxlLine(cx, branchY, leftX + bw / 2, y);
  body += cxlVArrow(leftX + bw / 2, y - 2, y);
  body += cxlLine(cx, branchY, rightX + bw / 2, y);
  body += cxlVArrow(rightX + bw / 2, y - 2, y);

  body += cxlStepBox(leftX, y, bw, h, "devdax: /dev/daxN.N (mmap, byte-addr)", 3);
  body += cxlStepBox(rightX, y, bw, h, "system-ram: daxctl reconfigure-device", 4);
  const ry = y + h + gap;
  body += cxlVArrow(rightX + bw / 2, y + h, ry);
  body += cxlStepBox(rightX, ry, bw, h, "Hot-add to page allocator", 5);
  const ry2 = ry + h + gap;
  body += cxlVArrow(rightX + bw / 2, ry + h, ry2);
  body += cxlStepBox(rightX, ry2, bw, h, "CPU-less NUMA node (slow tier)", 6);

  // devdax terminal caption
  body += cxlCaption(leftX + bw / 2, y + h + 20, "good for pmem / app-managed mmap");

  const vh = ry2 + h + 24;
  return cxlFrame(
    w, vh,
    "Exposing CXL Memory to the OS",
    "Firmware's EFI_MEMORY_SP gate defers the range to the CXL driver; a region (1) becomes a DAX device (2) used either as devdax (3) or onlined as system-ram (4-6), a CPU-less NUMA tier",
    body,
    "OS exposure flow chart: the EFI_MEMORY_SP firmware flag decides whether a range is deferred to the CXL driver or treated as normal RAM at boot. Once the driver owns it, a cxl_region is created and converted to a DAX device, which is then used either as a byte-addressable devdax device or reconfigured to system-ram, hot-added into the page allocator and surfaced as a CPU-less NUMA node for tiering."
  );
}

// Diagram 5: LIFECYCLE / HOTPLUG sequence — bind, enumerate port
// topology, program decoders, assemble region, expose, teardown.
function cxlLifecycleSVG() {
  const w = 760, h = 46, gap = 24;
  let body = "";
  const bx = 120, bw = 520, topY = 20;
  const steps = [
    "CXL.mem device arrives -> PCI core binds cxl_pci",
    "cxl_memdev memN created; mailbox ready (identify / health)",
    "Port topology enumerated (root -> ports -> endpoint)",
    "HDM decoders programmed; cxl_region assembled",
    "Region exposed to OS (devdax or system-ram NUMA node)",
    "Hot-unplug: endpoint ->remove() unwinds port/region state",
  ];
  steps.forEach((s, i) => {
    const y = topY + i * (h + gap);
    body += cxlStepBox(bx, y, bw, h, s, i + 1);
    if (i < steps.length - 1) body += cxlVArrow(bx + bw / 2, y + h, y + h + gap);
  });
  const vh = topY + steps.length * (h + gap) + 8;
  return cxlFrame(
    w, vh,
    "Lifecycle & Hotplug — Bind, Assemble, Expose, Tear Down",
    "Steps 1-6: port topology is built only on CXL.mem device arrival; the mailbox manages the device; endpoint remove() unwinds the state the expander established",
    body,
    "CXL lifecycle: a CXL.mem device arrives and the PCI core binds cxl_pci; the cxl_memdev memN device and its mailbox come up; the cxl_port topology is enumerated; HDM decoders are programmed and a cxl_region is assembled; the region is exposed to the OS as devdax or a system-ram NUMA node; on hot-unplug the endpoint remove callback unwinds the port and region state."
  );
}

const TOPIC_CXL = {
  "id": "cxl",
  "category": "hardware",
  "icon": "🧮",
  "title": "CXL Memory & the cxl_mem Subsystem",
  "description": "How the Linux kernel discovers, configures, and exposes CXL (Compute Express Link) Type-3 memory — the cxl_pci / cxl_memdev / cxl_port / HDM-decoder / cxl_region object model, HPA->DPA address translation and interleave, DAX devdax vs system-ram NUMA exposure, and sysfs + ndctl/daxctl tooling, with architecture and flow-chart diagrams",
  "keywords": [
    "cxl", "compute express link", "cxl.mem", "cxl_mem", "cxl.io", "cxl.cache",
    "type 3", "type-3", "memory expander", "cxl_pci", "cxl_memdev", "memdev",
    "cxl_port", "cxl_region", "hdm decoder", "hdm", "root decoder",
    "switch decoder", "endpoint decoder", "interleave", "interleave ways",
    "granularity", "hpa", "spa", "dpa", "system physical address",
    "device physical address", "address translation", "dax", "devdax",
    "system-ram", "daxctl", "ndctl", "cxl list", "cxl create-region",
    "numa", "cpu-less numa node", "memory tiering", "demotion", "promotion",
    "pmem", "nvdimm", "libnvdimm", "lsa", "label storage area", "mailbox",
    "mmio mailbox", "efi_memory_sp", "special purpose memory", "numactl",
    "pcie", "coherent interconnect", "memory expansion", "sysfs"
  ],
  "sections": [
    {
      "title": "1. Overview & Architecture",
      "content": `<p><strong>Compute Express Link (CXL)</strong> is a cache-coherent interconnect for CPUs, memory expansion, and accelerators that is built <em>on top of</em> the PCIe physical and electrical layer. It is an open industry standard governed by the CXL Consortium. For a Linux engineer the headline is memory: CXL lets a host attach, address, and manage memory that lives behind a PCIe-class link as if it were part of the system's physical address space.</p>
<p>Three protocols are multiplexed on a single CXL link:</p>
<ul>
<li><strong>CXL.io</strong> — PCIe-like semantics used for discovery, configuration, and plain I/O. Every CXL device speaks this.</li>
<li><strong>CXL.cache</strong> — lets a device coherently cache host memory.</li>
<li><strong>CXL.mem</strong> — lets the host access device-attached memory coherently. This is the memory-expansion path and the focus of this topic.</li>
</ul>
${cxlArchitectureSVG()}
<h4>Device types</h4>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Type</th><th style="text-align:left; padding:0.5rem;">Protocols</th><th style="text-align:left; padding:0.5rem;">What it is</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Type-1</strong></td><td style="padding:0.5rem;">CXL.io + CXL.cache</td><td style="padding:0.5rem;">Accelerator with a cache but no device memory</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Type-2</strong></td><td style="padding:0.5rem;">all three</td><td style="padding:0.5rem;">Accelerator with its own memory (e.g. GPU/FPGA)</td></tr>
<tr><td style="padding:0.5rem;"><strong>Type-3</strong></td><td style="padding:0.5rem;">CXL.io + CXL.mem</td><td style="padding:0.5rem;"><strong>Memory expander</strong> — volatile and/or persistent memory. The subject of this topic.</td></tr></table>
<p>CXL sits conceptually on PCIe (see the site's PCIe topic for the link layer) and is fundamentally a <em>memory-management</em> subject: once the kernel assembles a CXL memory range it is exposed through DAX, the page allocator, and NUMA — the same machinery used for mmap/zero-copy and NUMA placement elsewhere on this site. This topic concentrates on the CXL subsystem itself, not on re-teaching PCIe or the page allocator.</p>`
    },
    {
      "title": "2. The CXL.mem Type-3 Memory Device",
      "content": `<p>A <strong>CXL Type-3 Memory Device</strong> implements the CXL.mem protocol and contains volatile memory, persistent memory, or both. From the host's point of view it is enumerated as a <strong>PCI device</strong> for configuration — the ordinary PCI core discovers the function, assigns BARs, and lets the CXL driver bind.</p>
<h4>The MMIO mailbox</h4>
<p>Beyond plain config space, a Type-3 device exposes a memory-mapped <strong>mailbox</strong>. The driver passes <em>commands</em> to the device through this mailbox rather than through a data-plane queue — the mailbox is a control channel for device management, not for memory traffic (CXL.mem reads/writes bypass it entirely and go straight to media).</p>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Mailbox command class</th><th style="text-align:left; padding:0.5rem;">Purpose</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Identify</strong></td><td style="padding:0.5rem;">Report total capacity, partition between volatile and persistent, LSA size</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Get/Set LSA</strong></td><td style="padding:0.5rem;">Read/write the Label Storage Area (persistent-memory labels)</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Health / Poison</strong></td><td style="padding:0.5rem;">Media health, error status, poison list management</td></tr>
<tr><td style="padding:0.5rem;"><strong>Firmware</strong></td><td style="padding:0.5rem;">Firmware download/activate</td></tr></table>
<p>Once decoders are programmed (next sections), the device's memory contributes to the <strong>System Physical Address (SPA)</strong> space — the CPU can issue ordinary loads and stores that land in the expander's media. The mailbox remains the side channel for everything about managing the device.</p>
<pre><code># The expander shows up first as a PCI function:
$ lspci | grep -i cxl
35:00.0 CXL: &lt;vendor&gt; CXL Memory Device

# ...and then as a CXL mem device once cxl_pci binds it:
$ ls /sys/bus/cxl/devices/
mem0  port1  ...</code></pre>`
    },
    {
      "title": "3. The Linux CXL Driver Object Model",
      "content": `<p>The "subsystem" in <em>cxl_mem subsystem</em> is a small tree of kernel objects, each exposed under <code>/sys/bus/cxl/devices/</code>. Understanding these objects and how they relate is the core of working with CXL memory on Linux.</p>
${cxlObjectModelSVG()}
<h4>The objects</h4>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Object</th><th style="text-align:left; padding:0.5rem;">Role</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>cxl_pci</code></td><td style="padding:0.5rem;">The driver that attaches to the memory expander's PCIe function via the normal PCI core. Binding a memory expander is what gives the CXL Port objects a role at all.</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>cxl_memdev</code> (<code>mem0</code>, <code>mem1</code>…)</td><td style="padding:0.5rem;"><code>struct cxl_memdev</code> represents the "CXL memory expander (Type-3 device)". It appears as <code>memN</code> under the CXL bus; libcxl's <code>cxl_memdev_</code> interfaces are mostly sysfs interactions with it.</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>cxl_port</code></td><td style="padding:0.5rem;">A device that can <em>decode CXL.mem to its descendants</em>. The topology is <strong>root</strong> &rarr; <strong>ports</strong> &rarr; <strong>endpoints</strong> (below).</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>cxl_decoder</code> (HDM)</td><td style="padding:0.5rem;">Host-managed Device Memory decoders — root, switch, and endpoint subtypes — that define a device's contribution to an address range (section 4).</td></tr>
<tr><td style="padding:0.5rem;"><code>cxl_region</code></td><td style="padding:0.5rem;">An assembled, contiguous SPA/HPA range built by programming a consistent chain of decoders, optionally interleaved across devices. The unit the OS ultimately consumes.</td></tr></table>
<h4>The cxl_port topology</h4>
<ul>
<li><strong>root</strong> — claims the non-PCIe-enumerable platform decode ranges that firmware describes and decodes them down to ports. Each root/port/endpoint is a kernel <code>struct cxl_port</code>.</li>
<li><strong>ports</strong> — decode toward endpoints; <em>each PCIe switch</em> in the path is a port where interleave can be split.</li>
<li><strong>endpoints</strong> — perform the final decode from SPA to DPA (device physical address) inside one expander.</li>
</ul>
<p><strong>Arrival-driven topology.</strong> CXL Port topology is enumerated only upon the <em>arrival</em> of a CXL.mem device — until <code>cxl_pci</code> binds a memory expander, the port objects have no role. On hot-unplug the endpoint's <code>-&gt;remove()</code> cleans up the port data established for that expander; the PCI core itself does not tear down switch-level CXL resources.</p>`
    },
    {
      "title": "4. HDM Decoders & Address Translation",
      "content": `<p><strong>HDM (Host-managed Device Memory) decoders</strong> are programmable decoders that define how a device's media contributes to an address range — potentially interleaved across devices under a host bridge, or interleaved across host bridges. The HDM capability applies to <em>endpoints</em>, <em>upstream switch ports</em>, and <em>VH host bridges</em>. Platform firmware enumerates a menu of interleave options at the CXL root port; each switch in the path is a point where interleave can split.</p>
${cxlTranslationSVG()}
<h4>HPA / SPA to DPA</h4>
<ul>
<li><strong>SPA / HPA</strong> (System / Host Physical Address) is what the CPU issues.</li>
<li>The decoder chain translates <strong>HPA &rarr; … &rarr; DPA</strong> (Device Physical Address — an offset within a specific endpoint's media).</li>
<li>The hierarchy is <strong>root decoder</strong> (platform window) &rarr; <strong>switch decoder(s)</strong> &rarr; <strong>endpoint decoder</strong> (HPA&rarr;DPA).</li>
</ul>
<h4>Interleave</h4>
<p>Interleaving means consecutive host cachelines/granules map to different endpoints. Decoders at each level carry <em>interleave ways</em> and <em>granularity</em> so a given HPA resolves to a <code>(endpoint, DPA)</code> pair. The kernel documentation draws an explicit <strong>RAID analogy</strong>: topology metadata plus on-device metadata assemble a "set" — here a CXL.mem decode topology — and an environment chooses capacity-via-striping versus fault-tolerance-via-no-striping, just as a RAID set maps a logical offset to a <code>(disk, disk-offset)</code>.</p>
<pre><code># Decoders are visible in sysfs; targets and interleave are attributes:
$ ls /sys/bus/cxl/devices/ | grep decoder
decoder0.0   # root decoder (platform window)
decoder1.0   # switch/host-bridge decoder
decoder2.0   # endpoint decoder (HPA -> DPA)

$ cat /sys/bus/cxl/devices/decoder0.0/interleave_ways
2
$ cat /sys/bus/cxl/devices/decoder0.0/interleave_granularity
256</code></pre>`
    },
    {
      "title": "5. Regions: Assembling CXL Memory",
      "content": `<p>A <strong><code>cxl_region</code></strong> (<code>struct cxl_region</code>) is an assembled, contiguous SPA/HPA range created by programming a <em>consistent chain of decoders</em> — root &rarr; switch(es) &rarr; endpoint(s) — across one or more memory devices. The region is the unit the OS ultimately consumes; nothing before a region is directly usable memory.</p>
<h4>What "assembling" means</h4>
<ul>
<li>Pick a platform decode window from the root decoder's menu.</li>
<li>Program the switch decoder(s) along the path with matching interleave settings.</li>
<li>Program each participating endpoint decoder to map its slice of the HPA window to its own DPA range.</li>
<li>If <code>nr_targets &gt; 1</code>, the region is <strong>interleaved</strong> across host bridges / root ports / endpoints; every decoder in the chain must agree on ways and granularity or the region will not assemble.</li>
</ul>
<p>Regions come in two capability flavours that mirror the device's media partition:</p>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Region kind</th><th style="text-align:left; padding:0.5rem;">Backed by</th><th style="text-align:left; padding:0.5rem;">Typical use</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>ram (volatile)</strong></td><td style="padding:0.5rem;">Volatile media</td><td style="padding:0.5rem;">Memory expansion / tiering as a NUMA node</td></tr>
<tr><td style="padding:0.5rem;"><strong>pmem (persistent)</strong></td><td style="padding:0.5rem;">Persistent media</td><td style="padding:0.5rem;">Persistent namespaces via the nvdimm bridge (section 7)</td></tr></table>
<pre><code># Create an x1 (non-interleaved) region from one endpoint's capacity:
$ cxl create-region -m mem0 -d decoder0.0 -s 256M -t ram

# Create an interleaved region across two expanders (nr_targets = 2):
$ cxl create-region -m mem0 mem1 -d decoder0.0 \\
      -w 2 -g 256 -s 512M -t ram

# List regions:
$ cxl list -R</code></pre>
<p>Because every level must stay consistent, "the region won't assemble" is the classic CXL failure mode; section 9 covers where to look.</p>`
    },
    {
      "title": "6. Exposing CXL Memory to the OS",
      "content": `<p>Once a region exists, its capacity can reach the OS by two routes. Both start from converting the region into a <strong>DAX device</strong>.</p>
${cxlExposureSVG()}
<h4>(a) devdax — direct byte-addressable access</h4>
<p>The region is surfaced as a DAX device, <code>/dev/daxN.N</code>, in <strong>devdax</strong> mode. Applications <code>mmap()</code> it for direct, byte-addressable access with no page cache in the way. This suits persistent memory and applications that manage the mapping themselves (fsdax/devdax).</p>
<h4>(b) system-ram — hot-add into the page allocator</h4>
<p>Alternatively the DAX capacity is converted to <strong>system-ram</strong> via the dax <code>kmem</code> path, hot-adding it into the kernel page allocator so it behaves like ordinary RAM:</p>
<pre><code>$ daxctl list
$ daxctl reconfigure-device --mode=system-ram dax0.0   # online as RAM
$ daxctl reconfigure-device --mode=devdax     dax0.0   # back to devdax</code></pre>
<p>Onlined this way, CXL memory typically appears as a <strong>separate, often CPU-less NUMA node</strong>, so it can be used like normal RAM with NUMA-aware placement.</p>
<h4>Who owns the range: EFI_MEMORY_SP</h4>
<p>Firmware decides whether early boot hands a memory range to the page allocator or defers it to the CXL driver. The EFI/ACPI "special purpose" flag (<code>EFI_MEMORY_SP</code>) tells Linux to <em>defer</em> the range to the CXL driver instead of treating it as normal memory at <code>__init</code>. If the flag is not set, the range is onlined as ordinary memory during boot. This is the gate at the top of the flow chart above.</p>
<h4>Memory tiering</h4>
<p>CXL memory is generally higher-latency than direct-attached DRAM, so it fits the kernel's <strong>tiered-memory</strong> story: a CPU-less NUMA node acts as a slower tier, and the kernel's demotion/promotion machinery can move pages between the fast DRAM tier and the slower CXL tier. This — not any CXL-specific magic — is the practical reason CXL regions are often onlined as a distinct NUMA node.</p>
<pre><code>$ numactl -H          # CXL capacity shows as a node with no CPUs
$ ls /sys/devices/system/node/</code></pre>`
    },
    {
      "title": "7. Persistence: pmem-capable CXL & the nvdimm Bridge",
      "content": `<p>A <strong>pmem-capable</strong> CXL region integrates with <strong>libnvdimm</strong> through an nvdimm "bridge" so persistent CXL capacity can appear as a <em>pmem namespace</em>, reusing the existing persistent-memory stack rather than inventing a parallel one.</p>
<ul>
<li>Persistence metadata lives in the device's <strong>Label Storage Area (LSA)</strong>, which the driver reads and writes through the <em>mailbox</em> (the Get/Set LSA commands from section 2).</li>
<li>The nvdimm bridge lets a pmem CXL region be managed with the same namespace tooling used for traditional NVDIMMs, surfacing either fsdax or devdax namespaces.</li>
</ul>
<pre><code># A pmem-capable region can surface as a pmem namespace:
$ ndctl list -N
$ cxl list -R -t pmem</code></pre>
<p>This section is intentionally brief: the focus of the topic is memory management, and the full pmem/libnvdimm stack is a subject in its own right. The key point is that CXL does not replace libnvdimm — it feeds into it for the persistent case.</p>`
    },
    {
      "title": "8. sysfs & Tooling (cxl / daxctl / numactl)",
      "content": `<p>Everything above is observable and configurable from user space through sysfs plus the <code>ndctl</code> project's <code>cxl</code> tool and <code>daxctl</code>.</p>
<h4>sysfs layout</h4>
<pre><code>/sys/bus/cxl/devices/
├── memN         # cxl_memdev (the expander)
├── portN        # cxl_port (root / switch / host-bridge)
├── decoderX.Y   # HDM decoders (root / switch / endpoint)
├── regionN      # assembled cxl_region
└── rootN        # the CXL root</code></pre>
<h4>The cxl tool</h4>
<pre><code>$ cxl list                 # dump the whole CXL topology as JSON
$ cxl list -BDMu           # Bus, Decoders, Memdevs, human units
$ cxl list -d root         # just the root
$ cxl list -m mem0         # one memdev
$ cxl create-region ...    # assemble a region (section 5)
$ cxl list -R              # list regions
$ cxl enable-region  regionN
$ cxl disable-region regionN</code></pre>
<h4>daxctl & numactl</h4>
<pre><code>$ daxctl list
$ daxctl reconfigure-device --mode=system-ram dax0.0
$ numactl -H               # observe the CPU-less CXL NUMA node</code></pre>
<h4>End-to-end example</h4>
<pre><code># 1. A Type-3 expander appears as mem0
$ cxl list -m mem0

# 2. Assemble a region (optionally interleaved across mem0+mem1)
$ cxl create-region -m mem0 -d decoder0.0 -s 256M -t ram

# 3. The region surfaces a dax device
$ daxctl list

# 4a. Use it as devdax (mmap it directly), OR
# 4b. Online it as system-ram:
$ daxctl reconfigure-device --mode=system-ram dax0.0

# 5. It is now a CPU-less NUMA node usable with numactl / tiering
$ numactl -H</code></pre>`
    },
    {
      "title": "9. Lifecycle, Hotplug & Troubleshooting",
      "content": `<p>Pulling the pieces together, a CXL memory device moves through a clear lifecycle, and most problems are "the region didn't assemble" issues traced to one broken link in the decoder chain.</p>
${cxlLifecycleSVG()}
<h4>The lifecycle</h4>
<ol>
<li><strong>Bind</strong> — a CXL.mem device arrives; the PCI core binds <code>cxl_pci</code>.</li>
<li><strong>memdev + mailbox</strong> — <code>cxl_memdev</code> <code>memN</code> comes up; the mailbox answers identify/health.</li>
<li><strong>Topology</strong> — the <code>cxl_port</code> tree (root &rarr; ports &rarr; endpoint) is enumerated <em>because</em> the device arrived.</li>
<li><strong>Decoders + region</strong> — HDM decoders are programmed and a <code>cxl_region</code> is assembled.</li>
<li><strong>Expose</strong> — the region becomes devdax or a system-ram NUMA node.</li>
<li><strong>Teardown</strong> — on hot-unplug the endpoint's <code>-&gt;remove()</code> unwinds the port and region state the expander established.</li>
</ol>
<h4>Where to look when a region won't assemble</h4>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Symptom</th><th style="text-align:left; padding:0.5rem;">Where to look</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>memN</code> missing</td><td style="padding:0.5rem;"><code>cxl_pci</code> didn't bind — check <code>lspci</code> and <code>dmesg | grep cxl</code></td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">No decoders / no root window</td><td style="padding:0.5rem;">Firmware didn't advertise a CXL window; check <code>EFI_MEMORY_SP</code> handling and ACPI CEDT</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">Region create fails</td><td style="padding:0.5rem;">Mismatched <code>interleave_ways</code>/<code>interleave_granularity</code> along the chain</td></tr>
<tr><td style="padding:0.5rem;">Capacity never becomes RAM</td><td style="padding:0.5rem;"><code>daxctl reconfigure-device --mode=system-ram</code> step missing, or kmem not loaded</td></tr></table>
<p>Physical hotplug relies on the same arrival/removal path; the mailbox stays the control channel for device management across the device's whole life.</p>
<h4>Key takeaways</h4>
<ul>
<li><strong>CXL</strong> rides on the PCIe PHY and multiplexes CXL.io/.cache/.mem; <strong>Type-3</strong> memory expanders use CXL.io + CXL.mem.</li>
<li>The Linux object model is <code>cxl_pci</code> &rarr; <code>cxl_memdev</code> (<code>memN</code>) and a <code>cxl_port</code> tree (root &rarr; ports &rarr; endpoint) carrying <strong>HDM decoders</strong>; a <code>cxl_region</code> assembles a usable address range.</li>
<li>The decoder chain translates <strong>HPA/SPA &rarr; DPA</strong>, with interleave ways/granularity spreading granules across endpoints like a RAID set.</li>
<li>A region reaches the OS as <strong>devdax</strong> (byte-addressable) or <strong>system-ram</strong> (page allocator, CPU-less NUMA node, tiering); <code>EFI_MEMORY_SP</code> decides firmware vs driver ownership.</li>
<li>Persistent CXL plugs into <strong>libnvdimm</strong> via the nvdimm bridge (LSA through the mailbox); configure and inspect everything with <code>cxl</code>, <code>daxctl</code>, and sysfs.</li>
</ul>
<p><strong>References:</strong></p>
<ul>
<li><a href="https://cxl.docs.kernel.org/" target="_blank">Compute Express Link (CXL) — Linux kernel documentation</a></li>
<li><a href="https://docs.kernel.org/driver-api/cxl/index.html" target="_blank">Linux Kernel: CXL driver-api (Theory of Operation)</a></li>
<li><a href="https://docs.kernel.org/admin-guide/mm/numaperf.html" target="_blank">Linux Kernel: NUMA memory performance / tiering</a></li>
<li><a href="https://github.com/pmem/ndctl" target="_blank">ndctl / daxctl / cxl tooling</a></li>
<li><a href="https://computeexpresslink.org/" target="_blank">CXL Consortium</a></li>
</ul>`
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) { module.exports = TOPIC_CXL; }
