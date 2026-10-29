/**
 * Topic: OBMF — Open Boot and Management Framework
 *
 * An OCP (Open Compute Project) Hardware Management workstream that
 * standardizes the boot + management COMMUNICATION between the host
 * (Host Processor Module, HPM) and the BMC on a DC-SCM module. Its core
 * deliverable is the OBMF Interface Consolidation Protocol (OBMF-ICP),
 * which replaces a pile of fragmented legacy sideband interfaces with one
 * consolidated, vendor-agnostic, physical-interface-agnostic protocol.
 *
 * STATUS: emerging / still-evolving workstream. OBMF-ICP Specification
 * v1.0.0 is recent (2026); the DMTF MCTP binding (DSP0295) is WIP. Claims
 * are kept conservative per the sources below (OCP OBMF project page +
 * the ocp-obmf GitHub wiki / charter). Content was rephrased in our own
 * words for licensing compliance.
 */

/* Accessible palette (declared BEFORE use so the SVG helpers below are
 * initialized before the topic object literal calls them — avoids a
 * temporal-dead-zone ReferenceError at load time that would blank the
 * whole site). ONE neutral-blue hue for every box (#cfe3ff fill,
 * #1f2d3d stroke) on a #0d1117 background. Element identity is carried by
 * NUMBER badges + position + shape + text, never by hue. No red/green/
 * yellow conveys meaning; before/after and many/one are shown by count
 * and position only. Table borders use #30363d. */
const OBMF_BOX_FILL = "#cfe3ff";
const OBMF_BOX_STROKE = "#1f2d3d";
const OBMF_TEXT = "#0f172a";
const OBMF_NOTE = "#c9d4e0";
const OBMF_ARROW = "#9db4cc";
const OBMF_BG = "#0d1117";

/* =====================================================================
 * Accessible inline SVG diagram helpers (obmf-prefixed, copied from the
 * proven OCP-sibling pattern in topics/ocp-diag/index.js). Single blue
 * fill, numbered circle badges, arrows, high-contrast text.
 * =================================================================== */

function obmfBox(x, y, w, h, label, badge) {
  const cy = y + h / 2;
  const r = 13;
  let s =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ` +
    `fill="${OBMF_BOX_FILL}" stroke="${OBMF_BOX_STROKE}" stroke-width="1.5"></rect>`;
  if (badge !== undefined) {
    s +=
      `<circle cx="${x + r + 4}" cy="${cy}" r="${r}" fill="${OBMF_BOX_STROKE}"></circle>` +
      `<text x="${x + r + 4}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="13" font-weight="700" fill="#ffffff">${badge}</text>`;
  }
  const tx = badge !== undefined ? x + r + 4 + (w - r - 4) / 2 : x + w / 2;
  s +=
    `<text x="${tx}" y="${cy + 5}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="14" font-weight="600" fill="${OBMF_TEXT}">${label}</text>`;
  return s;
}

// A box with left-aligned text (used for wide flow-step boxes).
function obmfStepBox(x, y, w, h, label, badge) {
  const cy = y + h / 2;
  const r = 13;
  let s =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ` +
    `fill="${OBMF_BOX_FILL}" stroke="${OBMF_BOX_STROKE}" stroke-width="1.5"></rect>`;
  if (badge !== undefined) {
    s +=
      `<circle cx="${x + r + 4}" cy="${cy}" r="${r}" fill="${OBMF_BOX_STROKE}"></circle>` +
      `<text x="${x + r + 4}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="13" font-weight="700" fill="#ffffff">${badge}</text>`;
  }
  s +=
    `<text x="${x + (badge !== undefined ? r + 24 : 14)}" y="${cy + 4}" ` +
    `font-family="sans-serif" font-size="12.5" fill="${OBMF_TEXT}">${label}</text>`;
  return s;
}

// A diamond decision node (shape, not color, carries the "decision" meaning).
function obmfDiamond(cx, cy, halfW, halfH, label) {
  let s =
    `<polygon points="${cx},${cy - halfH} ${cx + halfW},${cy} ${cx},${cy + halfH} ${cx - halfW},${cy}" ` +
    `fill="${OBMF_BOX_FILL}" stroke="${OBMF_BOX_STROKE}" stroke-width="1.5"></polygon>`;
  s +=
    `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="12" font-weight="600" fill="${OBMF_TEXT}">${label}</text>`;
  return s;
}

function obmfVArrow(x, y1, y2) {
  return (
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${OBMF_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x - 5},${y2 - 6} ${x + 5},${y2 - 6} ${x},${y2}" fill="${OBMF_ARROW}"></polygon>`
  );
}

function obmfVArrowUp(x, y1, y2) {
  return (
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${OBMF_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x - 5},${y2 + 6} ${x + 5},${y2 + 6} ${x},${y2}" fill="${OBMF_ARROW}"></polygon>`
  );
}

function obmfHArrow(x1, y, x2) {
  const dir = x2 >= x1 ? 1 : -1;
  return (
    `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${OBMF_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x2 - dir * 7},${y - 5} ${x2 - dir * 7},${y + 5} ${x2},${y}" fill="${OBMF_ARROW}"></polygon>`
  );
}

function obmfFrame(viewW, viewH, title, subtitle, body, ariaLabel) {
  return (
    `<div style="overflow-x:auto; margin:1rem 0; padding:1rem; background:${OBMF_BG}; ` +
    `border:1px solid #30363d; border-radius:8px;">` +
    `<div style="text-align:center; font-weight:700; font-size:1.05rem; color:#58a6ff; margin-bottom:0.25rem;">${title}</div>` +
    `<div style="text-align:center; font-size:0.85rem; color:#8b949e; margin-bottom:0.75rem;">${subtitle}</div>` +
    `<svg viewBox="0 0 ${viewW} ${viewH}" width="100%" role="img" aria-label="${ariaLabel}">${body}</svg>` +
    `</div>`
  );
}

// Diagram 1: ARCHITECTURE — HPM (host CPU + host devices) on the left, the
// DC-SCM (BMC) on the right, with ONE OBMF-ICP protocol link between them
// over a physical binding (USB / MCTP), replacing many legacy interfaces.
function obmfArchitectureSVG() {
  const w = 760, vh = 300;
  let body = "";
  // Left dashed frame: HPM
  body +=
    `<rect x="24" y="40" width="250" height="220" rx="10" fill="none" ` +
    `stroke="${OBMF_BOX_STROKE}" stroke-width="1.5" stroke-dasharray="6 4"></rect>` +
    `<text x="149" y="34" text-anchor="middle" font-family="sans-serif" font-size="12.5" ` +
    `font-weight="700" fill="${OBMF_NOTE}">HPM (Host Processor Module)</text>`;
  body += obmfBox(44, 58, 210, 44, "Host Processor / CPU", 1);
  body += obmfStepBox(44, 118, 210, 36, "Host firmware / boot agent", undefined);
  body += obmfStepBox(44, 164, 210, 36, "Host devices (PCIe / CXL)", undefined);
  body += obmfStepBox(44, 210, 210, 36, "ICP initiator endpoint", undefined);
  // Right dashed frame: DC-SCM
  body +=
    `<rect x="486" y="40" width="250" height="220" rx="10" fill="none" ` +
    `stroke="${OBMF_BOX_STROKE}" stroke-width="1.5" stroke-dasharray="6 4"></rect>` +
    `<text x="611" y="34" text-anchor="middle" font-family="sans-serif" font-size="12.5" ` +
    `font-weight="700" fill="${OBMF_NOTE}">DC-SCM module</text>`;
  body += obmfBox(506, 58, 210, 44, "BMC (OpenBMC)", 2);
  body += obmfStepBox(506, 118, 210, 36, "Management services", undefined);
  body += obmfStepBox(506, 164, 210, 36, "Root of Trust / security", undefined);
  body += obmfStepBox(506, 210, 210, 36, "ICP target endpoint", undefined);
  // Center: ONE consolidated OBMF-ICP link
  body += obmfBox(300, 118, 160, 50, "OBMF-ICP", 3);
  body +=
    `<text x="380" y="190" text-anchor="middle" font-family="sans-serif" font-size="11" ` +
    `fill="${OBMF_NOTE}">one consolidated link</text>` +
    `<text x="380" y="206" text-anchor="middle" font-family="sans-serif" font-size="11" ` +
    `fill="${OBMF_NOTE}">over a physical binding</text>` +
    `<text x="380" y="222" text-anchor="middle" font-family="sans-serif" font-size="11" ` +
    `fill="${OBMF_NOTE}">(USB device-class / MCTP)</text>`;
  // bidirectional arrows between endpoints and the ICP box
  body += obmfHArrow(254, 143, 300);
  body += obmfHArrow(460, 143, 506);
  body += obmfHArrow(300, 143, 254);
  body += obmfHArrow(506, 143, 460);
  return obmfFrame(
    w, vh,
    "OBMF Architecture — Host (HPM) to BMC (DC-SCM) over OBMF-ICP",
    "The Host Processor Module (1) and the BMC on the DC-SCM (2) exchange boot, configuration and runtime management over a single OBMF-ICP link (3) carried on a physical binding such as USB device-class or DMTF MCTP, replacing many legacy sideband interfaces",
    body,
    "Architecture diagram. On the left a dashed frame labelled HPM, the Host Processor Module, contains the host processor or CPU, host firmware and boot agent, host devices such as PCIe and CXL cards, and an ICP initiator endpoint. On the right a dashed frame labelled DC-SCM module contains the BMC running OpenBMC, management services, a Root of Trust and security block, and an ICP target endpoint. In the centre a single OBMF-ICP box represents one consolidated protocol link carried over a physical binding such as USB device-class or DMTF MCTP. Bidirectional arrows connect the two endpoints through the single OBMF-ICP link, which replaces the many separate legacy sideband interfaces."
  );
}

// Diagram 2: BEFORE / AFTER consolidation. LEFT = many separate legacy
// interfaces between host and BMC (numbered). RIGHT = one consolidated
// OBMF-ICP link. Many->one shown by COUNT and POSITION, never by colour.
function obmfConsolidationSVG() {
  const w = 760, vh = 320;
  let body = "";
  // Section labels (text, not colour)
  body +=
    `<text x="190" y="24" text-anchor="middle" font-family="sans-serif" font-size="13" ` +
    `font-weight="700" fill="${OBMF_NOTE}">Before: fragmented interfaces</text>` +
    `<text x="575" y="24" text-anchor="middle" font-family="sans-serif" font-size="13" ` +
    `font-weight="700" fill="${OBMF_NOTE}">After: one consolidated link</text>`;
  // divider
  body +=
    `<line x1="380" y1="34" x2="380" y2="300" stroke="${OBMF_ARROW}" stroke-width="1" ` +
    `stroke-dasharray="3 4"></line>`;
  // BEFORE: Host + BMC endpoints
  body += obmfBox(30, 130, 90, 56, "Host", 1);
  body += obmfBox(270, 130, 90, 56, "BMC", 2);
  // many fragmented interfaces (5 lines), labelled generically
  const legacy = ["sideband A", "sideband B", "sideband C", "ad-hoc signal D", "ad-hoc signal E"];
  const ys = [56, 93, 130, 167, 204];
  legacy.forEach((lab, i) => {
    const y = ys[i] + 22;
    body +=
      `<line x1="120" y1="${y}" x2="270" y2="${y}" stroke="${OBMF_ARROW}" stroke-width="1.6"></line>` +
      `<text x="195" y="${y - 5}" text-anchor="middle" font-family="sans-serif" font-size="10.5" ` +
      `fill="${OBMF_NOTE}">${lab}</text>`;
  });
  body +=
    `<text x="195" y="300" text-anchor="middle" font-family="sans-serif" font-size="11" ` +
    `fill="${OBMF_NOTE}">5 separate interfaces (count shows fragmentation)</text>`;
  // AFTER: Host + BMC with ONE link
  body += obmfBox(430, 130, 90, 56, "Host", 1);
  body += obmfBox(680, 130, 70, 56, "BMC", 2);
  body +=
    `<line x1="520" y1="158" x2="680" y2="158" stroke="${OBMF_ARROW}" stroke-width="3"></line>`;
  body += obmfBox(560, 92, 80, 40, "OBMF-ICP", 3);
  body +=
    `<text x="600" y="152" text-anchor="middle" font-family="sans-serif" font-size="10.5" ` +
    `fill="${OBMF_NOTE}">single link</text>` +
    `<text x="585" y="300" text-anchor="middle" font-family="sans-serif" font-size="11" ` +
    `fill="${OBMF_NOTE}">1 consolidated OBMF-ICP link (count shows consolidation)</text>`;
  return obmfFrame(
    w, vh,
    "The Problem — Fragmented Interfaces Consolidated Into One",
    "Left (before): the host (1) and BMC (2) connect through five separate legacy sideband and ad-hoc interfaces. Right (after): the same two endpoints connect through a single OBMF-ICP link (3). The many-to-one change is shown by interface count and layout, not by colour",
    body,
    "Before-and-after consolidation diagram. On the left, labelled before, a Host box and a BMC box are joined by five separate lines representing fragmented legacy interfaces labelled sideband A, sideband B, sideband C, ad-hoc signal D and ad-hoc signal E; a caption notes five separate interfaces. A dashed vertical divider separates the halves. On the right, labelled after, the same Host and BMC boxes are joined by a single thick line through one OBMF-ICP box; a caption notes one consolidated link. The reduction from many interfaces to one is conveyed entirely by the number and position of the connecting lines and by text labels, never by colour."
  );
}

// Diagram 3: PROTOCOL STACK / BINDINGS. OBMF-ICP application protocol on
// top, riding over a binding layer (USB device-class OR MCTP DSP0295) over
// the physical interface; the DMTF MCTP/PLDM relationship shown alongside.
function obmfStackSVG() {
  const w = 760, h = 50, gap = 26, boxX = 150, boxW = 420;
  let body = "";
  const topY = 20;
  const layers = [
    { l: "OBMF-ICP application protocol", n: "initiator/target roles, states, API, message formats, encoding" },
    { l: "Binding layer", n: "USB device-class binding (v1.0) OR MCTP binding (DSP0295, WIP)" },
    { l: "DMTF MCTP transport", n: "management messages over SMBus/I2C, PCIe, USB" },
    { l: "Physical interface", n: "interface-agnostic; USB high-speed link in demos" },
  ];
  layers.forEach((s, i) => {
    const y = topY + i * (h + gap);
    const cy = y + h / 2;
    body += obmfStepBox(boxX, y, boxW, h, s.l, i + 1);
    body +=
      `<text x="${boxX + boxW + 12}" y="${cy + 4}" font-family="sans-serif" ` +
      `font-size="10.5" fill="${OBMF_NOTE}">${s.n}</text>`;
    if (i < layers.length - 1)
      body += obmfVArrow(boxX + boxW / 2, y + h, y + h + gap);
  });
  // PLDM alongside note (semantics layered over MCTP)
  const pldmY = topY + 2 * (h + gap);
  body += obmfStepBox(20, pldmY, 110, h, "DMTF PLDM", 5);
  body +=
    `<text x="20" y="${pldmY + h + 16}" font-family="sans-serif" font-size="10" ` +
    `fill="${OBMF_NOTE}">data-model</text>` +
    `<text x="20" y="${pldmY + h + 28}" font-family="sans-serif" font-size="10" ` +
    `fill="${OBMF_NOTE}">semantics reused</text>`;
  body += obmfHArrow(130, pldmY + h / 2, boxX);
  const vh = topY + layers.length * (h + gap) + 6;
  return obmfFrame(
    w, vh,
    "OBMF-ICP Protocol Stack & Bindings",
    "OBMF-ICP (1) rides over a binding layer (2) — USB device-class or MCTP DSP0295 — over DMTF MCTP transport (3) and the physical interface (4). DMTF PLDM (5) data-model semantics are reused rather than replaced",
    body,
    "Layered protocol-stack diagram. From top to bottom: the OBMF-ICP application protocol, defining initiator and target roles, protocol states, an API, message formats and encoding; a binding layer, which is either the USB device-class binding version one or the MCTP binding specification DSP0295 that is work in progress; the DMTF MCTP transport, which carries management messages over SMBus or I2C, PCIe and USB; and the physical interface, which is interface-agnostic and in industry demos is a high-speed USB link. Alongside, a DMTF PLDM box represents standardized management data-model semantics that OBMF reuses rather than replaces, connected into the application protocol layer."
  );
}

// Diagram 4: APPLICABILITY FAN-OUT. One OBMF-ICP protocol reused across
// several use cases (DC-SCM, non-DC-SCM, PCIe cards, CXL cards). Meaning by
// position + badges + text, never colour.
function obmfApplicabilitySVG() {
  const w = 760, vh = 250;
  let body = "";
  // root protocol
  body += obmfBox(290, 24, 180, 50, "OBMF-ICP", 1);
  // four target use cases
  const targets = [
    { l: "DC-SCM use case", n: "recommended physical interfaces" },
    { l: "Non-DC-SCM use cases", n: "not tied to the SCM module" },
    { l: "PCIe cards", n: "reusable for other devices" },
    { l: "CXL cards", n: "reusable for other devices" },
  ];
  const boxW = 160, y = 150, xs = [20, 200, 390, 580];
  targets.forEach((t, i) => {
    const x = xs[i];
    body += obmfBox(x, y, boxW, 46, "", i + 2);
    const cx = x + boxW / 2 + 10;
    body +=
      `<text x="${cx}" y="${y + 20}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="11.5" font-weight="600" fill="${OBMF_TEXT}">${t.l}</text>` +
      `<text x="${cx}" y="${y + 36}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="9.5" fill="${OBMF_TEXT}">${t.n}</text>`;
    // arrow from root down to each target
    body += obmfVArrow(x + boxW / 2 + 10, 74, y);
  });
  body +=
    `<text x="380" y="118" text-anchor="middle" font-family="sans-serif" font-size="11" ` +
    `fill="${OBMF_NOTE}">CPU vendor-agnostic &amp; physical-interface-agnostic: one protocol, many targets</text>`;
  return obmfFrame(
    w, vh,
    "One Protocol, Many Targets — Applicability",
    "A single vendor-agnostic OBMF-ICP (1) is reusable across the DC-SCM use case (2), non-DC-SCM use cases (3), PCIe cards (4) and CXL cards (5)",
    body,
    "Applicability fan-out diagram. A single OBMF-ICP box at the top branches by downward arrows to four target use cases arranged left to right: the DC-SCM use case with recommended physical interfaces, non-DC-SCM use cases not tied to the SCM module, PCIe cards as other reusable devices, and CXL cards as other reusable devices. A caption states the protocol is CPU vendor-agnostic and physical-interface-agnostic, so one protocol serves many targets. Grouping is shown by position, numbered badges and text, never by colour."
  );
}

const TOPIC_OBMF = {
  "id": "obmf",
  "category": "ocp",
  "icon": "🧰",
  "title": "OBMF: Open Boot & Management Framework",
  "description": "An OCP Hardware Management workstream standardizing host-to-BMC boot, configuration and runtime communication: its core deliverable OBMF-ICP (Interface Consolidation Protocol) replaces fragmented legacy sideband interfaces between the Host Processor Module (HPM) and the BMC on a DC-SCM with one consolidated, vendor-agnostic link — covered with architecture, consolidation, protocol-stack and flow diagrams.",
  "keywords": [
    "obmf", "open boot and management framework", "obmf-icp",
    "interface consolidation protocol", "ocp", "open compute project",
    "hardware management", "ocp hardware management", "dc-scm", "bmc",
    "baseboard management controller", "hpm", "host processor module",
    "host processor", "mctp", "pldm", "dmtf", "dsp0295", "usb",
    "usb device class", "spdm", "security protocol and data model",
    "streaming boot", "caliptra", "root of trust", "vendor agnostic",
    "vendor extensions", "physical interface agnostic", "sideband",
    "redfish", "openbmc", "cxl", "pcie", "aspeed", "ast2700", "ast1030",
    "initiator", "target", "boot", "management", "firmware", "interoperability"
  ],
  "sections": [
    {
      "title": "1. Overview & Architecture",
      "content": `<p>The <strong>Open Boot and Management Framework (OBMF)</strong> is a workstream under the <a href="https://www.opencompute.org/projects/hardware-management" target="_blank">OCP Hardware Management Project</a>. That project defines a small, stable set of tools and standards for managing machines remotely at scale; OBMF is the piece that standardizes the <strong>boot and management communication</strong> between the host and the Baseboard Management Controller (BMC). It is a <em>semi-private</em> (closed-CLA) workstream, with materials published on the OBMF GitHub wiki and the OCP site, led by Janusz Jurski (Intel) and Bharat Pillilli (Microsoft). Audience: firmware, platform and systems engineers.</p>
<p>Concretely, OBMF aims to produce a specification that prescribes the <strong>DC-SCM interface</strong> (or a list of recommended physical interfaces) <em>and</em> a standardized <strong>protocol</strong> for boot, configuration and runtime communication between the <strong>Host Processor</strong> (or other devices on the <strong>Host Processor Module, HPM</strong>) and the <strong>BMC</strong> sitting on the DC-SCM module. This maps directly onto two other topics on this site: the <em>DC-SCM</em> topic describes the HPM&harr;DC-SCM hardware split and the module that physically carries the BMC, and the <em>OpenBMC</em> topic describes the BMC firmware stack that would speak this protocol.</p>
${obmfArchitectureSVG()}
<p><strong>Status:</strong> OBMF is a recent and still-evolving workstream. Treat it as an <em>emerging standard</em>: the core protocol specification reached v1.0.0 in 2026, while some transport bindings are still work-in-progress. The sections below keep claims conservative and anchored to the cited OCP sources rather than inventing protocol specifics.</p>`
    },
    {
      "title": "2. The Problem: Fragmented Host↔BMC Interfaces",
      "content": `<p>Today, communication between the host and the BMC is <strong>fragmented</strong>. Management functions are spread across many legacy interfaces — assorted sideband buses and ad-hoc signals — each added over time for a specific purpose. The result is a brittle, vendor-specific tangle that makes BMCs and host platforms harder to pair across suppliers and harder to port software between.</p>
<p>OBMF's goal is to <strong>consolidate</strong> these fragmented interfaces into a single standardized, vendor-agnostic protocol so that BMCs and host platforms can exchange information and execute management functions more efficiently. The payoff is better <strong>interoperability</strong> between host and BMC vendors and improved <strong>software portability</strong> across platforms.</p>
${obmfConsolidationSVG()}
<p>The many-to-one picture above is the essence of the problem statement: the same two endpoints that were previously wired together with several distinct interfaces are, after OBMF, joined by one consolidated protocol link. That one link is <strong>OBMF-ICP</strong>, covered next.</p>`
    },
    {
      "title": "3. OBMF-ICP: The Interface Consolidation Protocol",
      "content": `<p>The central deliverable of the workstream is the <strong>OBMF Interface Consolidation Protocol (OBMF-ICP)</strong> — the protocol that folds multiple fragmented legacy management interfaces into a single high-speed link. Public drafts appeared as 0.7 / 0.7.1 in late 2025, and the <strong>OBMF-ICP Specification reached v1.0.0 (dated Oct 7, 2026)</strong>.</p>
<h4>What the specification defines (scope)</h4>
<ul>
<li><strong>Use cases &amp; applicability</strong> — where and how the protocol applies.</li>
<li><strong>Initiator and Target roles</strong> — which endpoint drives a transaction and which responds.</li>
<li><strong>Protocol states &amp; state-transition flows</strong> — how the link is brought up and used.</li>
<li><strong>API definition</strong>, plus <strong>message formats and encoding</strong>.</li>
<li><strong>Security requirements</strong>, and <strong>alignment/reuse of existing DMTF communication standards</strong>.</li>
<li><strong>Firmware requirements/operation</strong> for protocol initialization and usage, interop design docs, and requirements relating to MHS, DC-SCM, Streaming Boot, DMTF MCTP and DMTF PLDM.</li>
</ul>
${obmfStackSVG()}
<h4>Explicitly out of scope</h4>
<p>The spec is careful about what it does <em>not</em> cover, which keeps it from over-claiming:</p>
<ul>
<li>Firmware <strong>implementation</strong> (it defines requirements and operation, not the implementation itself).</li>
<li>Creation of any <strong>new security protocols or methodologies</strong>.</li>
<li><strong>Electrical compliance</strong> requirements.</li>
</ul>
<p>In other words, OBMF-ICP standardizes the <em>contract</em> — roles, states, messages, encoding, security alignment — and leaves implementation and electrical validation to adopters and existing standards.</p>`
    },
    {
      "title": "4. Transports & Bindings (USB, MCTP, PLDM)",
      "content": `<p>OBMF-ICP is deliberately <strong>physical-interface-agnostic</strong>: it is designed to ride over different <em>bindings</em> rather than being welded to one wire. Two bindings are defined or in progress.</p>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Binding</th><th style="text-align:left; padding:0.5rem;">Document</th><th style="text-align:left; padding:0.5rem;">Status</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>USB device-class</strong></td><td style="padding:0.5rem;">Universal Serial Bus Device Class Specification for OBMF-ICP (v1.0, 2026)</td><td style="padding:0.5rem;">Published</td></tr>
<tr><td style="padding:0.5rem;"><strong>DMTF MCTP</strong></td><td style="padding:0.5rem;">DSP0295: OBMF-ICP over MCTP Binding Specification</td><td style="padding:0.5rem;">Work-in-progress</td></tr></table>
<p>Industry demos ran OBMF-ICP over USB — for example an ASPEED <strong>AST2700</strong> BMC paired with an <strong>AST1030</strong> auxiliary management controller — consolidating fragmented legacy interfaces into one high-speed USB connection. The MCTP binding (DSP0295) ties OBMF into the broader DMTF management stack.</p>
<h4>A quick MCTP / PLDM primer</h4>
<p>Both come from the <a href="https://www.dmtf.org/standards/pmci" target="_blank">DMTF PMCI</a> family and are the same stack referenced in the <em>OpenBMC</em> topic:</p>
<ul>
<li><strong>MCTP (Management Component Transport Protocol)</strong> — a transport for management messages that can run over SMBus/I2C, PCIe or USB. It moves management traffic between components regardless of the underlying bus.</li>
<li><strong>PLDM (Platform Level Data Model)</strong> — standardized data models for management (sensors, firmware update, BIOS attributes, and so on) layered on top of a transport like MCTP.</li>
</ul>
<p>The important point: OBMF <strong>reuses</strong> MCTP and PLDM rather than replacing them. OBMF-ICP can bind to MCTP as a transport and align with PLDM semantics, leveraging existing OCP and DMTF standards instead of reinventing them.</p>`
    },
    {
      "title": "5. Design Requirements & Vendor Extensions",
      "content": `<p>The OBMF charter sets out a set of <strong>design requirements</strong> that shape the protocol. Several of them are about keeping the protocol broadly reusable rather than tied to one vendor, module or wire.</p>
<ul>
<li><strong>Host-processor (CPU) vendor-agnostic</strong> — not specific to any one CPU vendor.</li>
<li><strong>Applicable to non-DC-SCM use cases</strong> — usable beyond the DC-SCM module context.</li>
<li><strong>Reusable for other devices</strong> — e.g. PCIe cards and CXL cards (see the site's <em>CXL</em> topic), not just the BMC.</li>
<li><strong>Physical-interface-agnostic</strong> — built to ride over bindings such as MCTP/PLDM.</li>
<li><strong>Recommended physical-interface choices</strong> for the DC-SCM use case specifically.</li>
<li><strong>A vendor-extension adoption model</strong> — a defined way to add vendor-specific features without breaking the standard baseline.</li>
<li><strong>Leverages existing OCP + DMTF standards</strong>, and <strong>aligns to existing security standards</strong> (e.g. SPDM).</li>
</ul>
${obmfApplicabilitySVG()}
<p>The vendor-extension adoption model matters in practice: it lets suppliers differentiate (add their own features) while everyone still shares one interoperable baseline protocol. That is the balance OBMF tries to strike — consolidation and portability without freezing out vendor-specific capability.</p>`
    },
    {
      "title": "6. Security: SPDM Alignment",
      "content": `<p>Security in OBMF-ICP is handled by <strong>alignment with existing standards</strong>, not by inventing new ones. The charter explicitly lists aligning to existing security standards/requirements, with <strong>SPDM</strong> called out as an example.</p>
<p><strong>SPDM (Security Protocol and Data Model)</strong> is a DMTF security standard used to authenticate hardware/firmware components and establish measured, trusted channels between them — for example, letting a BMC verify the identity and integrity of a device before trusting it. Conceptually it provides identity, measurement and session establishment for management communication.</p>
<p>Crucially, recall the scope boundary from section 3: creating any <strong>new security protocols or methodologies is out of scope</strong> for OBMF-ICP. So OBMF does not define its own cryptography; it specifies <em>security requirements</em> and <em>aligns</em> to standards like SPDM, reusing the established security model the same way it reuses MCTP/PLDM for transport and data modeling.</p>`
    },
    {
      "title": "7. Relation to DC-SCM, OpenBMC & Streaming Boot",
      "content": `<p>OBMF is the piece that ties the OCP management story together. The three parts fit like this:</p>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Layer</th><th style="text-align:left; padding:0.5rem;">Role</th><th style="text-align:left; padding:0.5rem;">Companion topic</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>DC-SCM</strong></td><td style="padding:0.5rem;">The physical module that carries the BMC (and RoT, flashes) and plugs into the HPM</td><td style="padding:0.5rem;"><em>DC-SCM</em></td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>OpenBMC</strong></td><td style="padding:0.5rem;">The BMC firmware stack that runs on that module and would speak OBMF-ICP</td><td style="padding:0.5rem;"><em>OpenBMC</em></td></tr>
<tr><td style="padding:0.5rem;"><strong>OBMF-ICP</strong></td><td style="padding:0.5rem;">Standardizes <em>how</em> the host and that BMC talk for boot, config and runtime management</td><td style="padding:0.5rem;">this topic</td></tr></table>
<p>So OBMF-ICP replaces a pile of vendor-specific sideband interfaces with one consolidated, vendor-agnostic protocol that runs <em>across</em> the DC-SCM hardware and the OpenBMC software. Because it is physical-interface-agnostic and reusable for other devices, it also reaches beyond the BMC to PCIe and CXL cards (see the <em>CXL</em> topic).</p>
<h4>Streaming Boot (adjacent capability)</h4>
<p><strong>Streaming Boot</strong> is referenced as a related capability that OBMF requirements touch — streaming the host boot image, associated with the Caliptra root-of-trust ecosystem in industry demos. It is adjacent rather than part of OBMF-ICP proper, so we mention it without over-specifying: OBMF-ICP lists requirements relating to Streaming Boot alongside MHS, DC-SCM, MCTP and PLDM.</p>
<p>For a Linux platform or firmware engineer, this is the practical takeaway: DC-SCM gives you the module, OpenBMC gives you the BMC firmware, and OBMF-ICP standardizes the conversation between the host and that BMC — one consolidated protocol instead of a per-vendor collection of sideband signals.</p>`
    },
    {
      "title": "8. Status, Scope & Further Reading",
      "content": `<p><strong>Status: emerging standard.</strong> OBMF-ICP v1.0.0 is recent (dated Oct 7, 2026), earlier public drafts were 0.7 / 0.7.1 (late 2025), the USB device-class binding is v1.0 (2026), and the MCTP binding (DSP0295) is still work-in-progress. Keep expectations conservative: the framework is still evolving and details may change.</p>
<h4>Scope at a glance</h4>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">In scope</th><th style="text-align:left; padding:0.5rem;">Out of scope</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">Use cases, initiator/target roles, protocol states</td><td style="padding:0.5rem;">Firmware implementation</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">API, message formats &amp; encoding, security requirements</td><td style="padding:0.5rem;">New security protocols / methodologies</td></tr>
<tr><td style="padding:0.5rem;">Reuse/alignment of DMTF standards (MCTP/PLDM, SPDM)</td><td style="padding:0.5rem;">Electrical compliance requirements</td></tr></table>
<h4>References &amp; sources</h4>
<ul>
<li><a href="https://www.opencompute.org/projects/semi-private-workstreams/open-boot-and-management-framework/" target="_blank">OCP — Open Boot and Management Framework (project page)</a></li>
<li><a href="https://github.com/opencomputeproject/ocp-obmf" target="_blank">GitHub — opencomputeproject/ocp-obmf</a> and its <a href="https://github.com/opencomputeproject/ocp-obmf/wiki" target="_blank">wiki (charter &amp; specs)</a></li>
<li><a href="https://www.opencompute.org/projects/hardware-management" target="_blank">OCP — Hardware Management Project</a></li>
<li><a href="https://www.dmtf.org/standards/pmci" target="_blank">DMTF — PMCI (MCTP / PLDM standards)</a></li>
</ul>
<p>Related topics on this site: <em>DC-SCM</em> (the module that carries the BMC), <em>OpenBMC</em> (the BMC firmware that speaks the protocol) and <em>CXL</em> (one of the other devices OBMF-ICP is reusable for).</p>
<p style="font-size:0.85rem; color:#8b949e;">Content on this page was rephrased in our own words for licensing compliance and summarized from the OCP sources above; OBMF is a recent, still-evolving workstream, so treat version numbers and binding status as point-in-time.</p>`
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) { module.exports = TOPIC_OBMF; }
