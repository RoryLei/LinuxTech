/**
 * Topic: DC-SCM — Datacenter-ready Secure Control Module
 *
 * The OCP spec (a sub-project of OCP Hardware Management, part of the
 * DC-MHS modularity family) that moves server management + security
 * firmware/control off the main motherboard (HPM) onto a small
 * standardized pluggable module, connected over the DC-SCI interface.
 * Covers the module contents, the DC-SCI interface, LTPI, versions/form
 * factors, and why it matters.
 */

/* Accessible palette — declared ABOVE the topic object so helpers are
 * initialized before the object literal calls them (TDZ guard). ONE
 * neutral-blue hue for every box (#cfe3ff fill, #1f2d3d stroke) on a
 * #0d1117 background. Identity carried by NUMBER badges + position +
 * shape + text, never hue. Table borders #30363d. Per-file prefix: scm. */
const SCM_BOX_FILL = "#cfe3ff";
const SCM_BOX_STROKE = "#1f2d3d";
const SCM_TEXT = "#0f172a";
const SCM_NOTE = "#c9d4e0";
const SCM_ARROW = "#9db4cc";
const SCM_BG = "#0d1117";

function scmBox(x, y, w, h, label, badge) {
  const cy = y + h / 2;
  const r = 13;
  let s =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ` +
    `fill="${SCM_BOX_FILL}" stroke="${SCM_BOX_STROKE}" stroke-width="1.5"></rect>`;
  if (badge !== undefined) {
    s +=
      `<circle cx="${x + r + 4}" cy="${cy}" r="${r}" fill="${SCM_BOX_STROKE}"></circle>` +
      `<text x="${x + r + 4}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="13" font-weight="700" fill="#ffffff">${badge}</text>`;
  }
  const tx = badge !== undefined ? x + r + 4 + (w - r - 4) / 2 : x + w / 2;
  s +=
    `<text x="${tx}" y="${cy + 5}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="13" font-weight="600" fill="${SCM_TEXT}">${label}</text>`;
  return s;
}

function scmStepBox(x, y, w, h, label, badge) {
  const cy = y + h / 2;
  const r = 13;
  let s =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ` +
    `fill="${SCM_BOX_FILL}" stroke="${SCM_BOX_STROKE}" stroke-width="1.5"></rect>`;
  if (badge !== undefined) {
    s +=
      `<circle cx="${x + r + 4}" cy="${cy}" r="${r}" fill="${SCM_BOX_STROKE}"></circle>` +
      `<text x="${x + r + 4}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="13" font-weight="700" fill="#ffffff">${badge}</text>`;
  }
  s +=
    `<text x="${x + (badge !== undefined ? r + 24 : 12)}" y="${cy + 4}" ` +
    `font-family="sans-serif" font-size="11.5" fill="${SCM_TEXT}">${label}</text>`;
  return s;
}

function scmHArrow(x1, y, x2) {
  const dir = x2 >= x1 ? 1 : -1;
  return (
    `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${SCM_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x2 - dir * 7},${y - 5} ${x2 - dir * 7},${y + 5} ${x2},${y}" fill="${SCM_ARROW}"></polygon>`
  );
}

function scmFrame(viewW, viewH, title, subtitle, body, ariaLabel) {
  return (
    `<div style="overflow-x:auto; margin:1rem 0; padding:1rem; background:${SCM_BG}; ` +
    `border:1px solid #30363d; border-radius:8px;">` +
    `<div style="text-align:center; font-weight:700; font-size:1.05rem; color:#58a6ff; margin-bottom:0.25rem;">${title}</div>` +
    `<div style="text-align:center; font-size:0.85rem; color:#8b949e; margin-bottom:0.75rem;">${subtitle}</div>` +
    `<svg viewBox="0 0 ${viewW} ${viewH}" width="100%" role="img" aria-label="${ariaLabel}">${body}</svg>` +
    `</div>`
  );
}

// Diagram A: HPM (compute) <-> DC-SCI interface <-> DC-SCM block diagram.
function scmBlockSVG() {
  const w = 760;
  let body = "";
  // HPM side (left).
  body +=
    `<rect x="20" y="30" width="250" height="320" rx="10" fill="none" ` +
    `stroke="${SCM_BOX_STROKE}" stroke-width="1.5" stroke-dasharray="6 4"></rect>`;
  body += scmStepBox(34, 44, 222, 30, "HPM (Host Processor Module)", 1);
  body += scmStepBox(34, 92, 222, 40, "CPUs", undefined);
  body += scmStepBox(34, 142, 222, 40, "DRAM (host memory)", undefined);
  body += scmStepBox(34, 192, 222, 40, "PCIe root complex / lanes", undefined);
  body += scmStepBox(34, 242, 222, 40, "host SPI flash (BIOS)*", undefined);
  body +=
    `<text x="34" y="306" font-family="sans-serif" font-size="10.5" fill="${SCM_NOTE}">* BIOS flash may live on the SCM</text>` +
    `<text x="34" y="322" font-family="sans-serif" font-size="10.5" fill="${SCM_NOTE}">and be read by the host over DC-SCI</text>`;
  // DC-SCI interface column (centre).
  body += scmStepBox(300, 170, 160, 44, "DC-SCI interface", 2);
  body += scmHArrow(270, 192, 300);
  body += scmHArrow(460, 192, 490);
  body +=
    `<text x="380" y="150" text-anchor="middle" font-family="sans-serif" font-size="10.5" fill="${SCM_NOTE}">SPI / I2C / I3C / eSPI</text>` +
    `<text x="380" y="234" text-anchor="middle" font-family="sans-serif" font-size="10.5" fill="${SCM_NOTE}">GPIO / USB / RGMII / LTPI</text>`;
  // DC-SCM side (right).
  body +=
    `<rect x="490" y="30" width="250" height="320" rx="10" fill="none" ` +
    `stroke="${SCM_BOX_STROKE}" stroke-width="1.5" stroke-dasharray="6 4"></rect>`;
  body += scmStepBox(504, 44, 222, 30, "DC-SCM (Secure Control Module)", 3);
  body += scmStepBox(504, 86, 108, 34, "BMC (OpenBMC)", undefined);
  body += scmStepBox(618, 86, 108, 34, "BMC boot flash", undefined);
  body += scmStepBox(504, 128, 108, 34, "Root of Trust", undefined);
  body += scmStepBox(618, 128, 108, 34, "TPM", undefined);
  body += scmStepBox(504, 170, 108, 34, "BIOS SPI flash", undefined);
  body += scmStepBox(618, 170, 108, 34, "management DRAM", undefined);
  body += scmStepBox(504, 212, 108, 34, "SCM CPLD", undefined);
  body += scmStepBox(618, 212, 108, 34, "video", undefined);
  body += scmStepBox(504, 254, 108, 34, "temp sensor", undefined);
  body += scmStepBox(618, 254, 108, 34, "FRU EEPROM", undefined);
  body += scmStepBox(504, 296, 222, 34, "connectors", undefined);
  return scmFrame(
    w, 366,
    "DC-SCM Block Diagram — Compute vs Management Split",
    "The HPM (1) keeps CPUs, DRAM and PCIe compute; the DC-SCI interface (2) crosses the connector; the DC-SCM (3) carries the BMC, Root of Trust, TPM, flashes and management peripherals",
    body,
    "DC-SCM block diagram. On the left, a dashed frame labelled HPM, the Host Processor Module, keeps the compute: CPUs, host DRAM, the PCIe root complex and lanes, and optionally host BIOS SPI flash. In the centre, the DC-SCI interface crosses the connector carrying SPI, I2C, I3C, eSPI, GPIO, USB, RGMII and LTPI. On the right, a dashed frame labelled DC-SCM holds the management and security parts: the BMC running OpenBMC, BMC boot flash, a Root of Trust, a TPM, BIOS SPI flash, management DRAM, an SCM CPLD, video, a temperature sensor, a FRU EEPROM and connectors."
  );
}

// Diagram B: LTPI concept — many low-speed interfaces tunneled over a few
// LVDS differential pairs to reduce connector pin count.
function scmLtpiSVG() {
  const w = 760;
  let body = "";
  // Left: many low-speed interfaces (one box each) feeding a serializer.
  const ifs = ["I2C / I3C", "many GPIOs", "UART / serial", "RGMII / PHY", "sideband control"];
  ifs.forEach((t, i) => {
    body += scmStepBox(20, 40 + i * 54, 200, 38, t, undefined);
    body += scmHArrow(220, 59 + i * 54, 270);
  });
  // Serializer box.
  body += scmBox(270, 110, 110, 100, "", 1);
  body +=
    `<text x="325" y="150" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="${SCM_TEXT}">LTPI</text>` +
    `<text x="325" y="168" text-anchor="middle" font-family="sans-serif" font-size="10.5" fill="${SCM_TEXT}">serialize</text>` +
    `<text x="325" y="184" text-anchor="middle" font-family="sans-serif" font-size="10.5" fill="${SCM_TEXT}">over LVDS</text>`;
  // The few LVDS pairs across the connector.
  body += scmHArrow(380, 160, 470);
  body += `<text x="425" y="145" text-anchor="middle" font-family="sans-serif" font-size="10.5" fill="${SCM_NOTE}">few LVDS pairs</text>`;
  body += `<text x="425" y="182" text-anchor="middle" font-family="sans-serif" font-size="10.5" fill="${SCM_NOTE}">(low pin count)</text>`;
  // Deserializer box.
  body += scmBox(470, 110, 110, 100, "", 2);
  body +=
    `<text x="525" y="150" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="${SCM_TEXT}">LTPI</text>` +
    `<text x="525" y="168" text-anchor="middle" font-family="sans-serif" font-size="10.5" fill="${SCM_TEXT}">de-serialize</text>`;
  // Right: reconstructed interfaces.
  body += scmHArrow(580, 160, 630);
  body += scmBox(630, 110, 110, 100, "", 3);
  body +=
    `<text x="685" y="150" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="700" fill="${SCM_TEXT}">BMC</text>` +
    `<text x="685" y="168" text-anchor="middle" font-family="sans-serif" font-size="10" fill="${SCM_TEXT}">peripherals</text>` +
    `<text x="685" y="184" text-anchor="middle" font-family="sans-serif" font-size="10" fill="${SCM_TEXT}">reconstructed</text>`;
  body +=
    `<text x="380" y="300" text-anchor="middle" font-family="sans-serif" font-size="11" fill="${SCM_NOTE}">Many low-speed interfaces (left) are tunneled over a few differential pairs; the connector needs far fewer pins.</text>`;
  return scmFrame(
    w, 320,
    "LTPI Concept — Tunnel Many Slow Interfaces Over Few Pairs",
    "LTPI (1) serializes many low-speed interfaces onto a few LVDS differential pairs across the connector, then de-serializes (2) them so the BMC sees its peripherals (3) — with a much lower pin count",
    body,
    "LTPI concept diagram. On the left, several low-speed interfaces — I2C and I3C, many GPIOs, UART, RGMII and sideband control — feed into an LTPI block that serializes them onto a small number of LVDS differential pairs. Those few pairs cross the SCM-to-HPM connector, so the connector needs far fewer pins. On the other side, a second LTPI block de-serializes the stream so the BMC sees its peripherals reconstructed. The benefit is lower pin count with support for remote peripheral expansion and low-latency transfers."
  );
}

const TOPIC_DC_SCM = {
  "id": "dc-scm",
  "category": "ocp",
  "icon": "🛡️",
  "title": "DC-SCM: Datacenter-ready Secure Control Module",
  "description": "The OCP Hardware Management spec (part of the DC-MHS modularity family) that moves server management and security firmware/control off the motherboard onto a small standardized pluggable module connected over the DC-SCI interface: what sits on a DC-SCM (BMC, Root of Trust, TPM, flashes), the DC-SCI interface and LTPI pin-count reduction, the 1.0 and 2.x versions, HFF/VFF form factors, and why decoupling management from compute matters",
  "keywords": [
    "dc-scm", "datacenter-ready secure control module", "secure control module",
    "ocp", "open compute project", "hardware management", "dc-mhs",
    "dc-sci", "secure control interface", "bmc", "openbmc",
    "root of trust", "rot", "tpm", "cpld", "fru eeprom", "bios flash",
    "spi flash", "ltpi", "low-speed transport protocol interface", "lvds",
    "pin count", "hff", "vff", "horizontal form factor", "vertical form factor",
    "plug and code", "dc-scm 1.0", "dc-scm 2.0", "dc-scm 2.1", "hpm",
    "management", "security", "out-of-band"
  ],
  "sections": [
    {
      "title": "1. Overview & Architecture",
      "content": `<p><strong>DC-SCM (Datacenter-ready Secure Control Module)</strong> is an OCP specification — a sub-project of <a href="https://www.opencompute.org/projects/hardware-management" target="_blank">OCP Hardware Management</a> and part of the DC-MHS modularity family (see the companion <em>OCP Modular Hardware</em> topic). Its core idea is simple: take the <strong>management and security</strong> firmware and control that traditionally lived scattered across the server motherboard and move them onto one small, standardized <strong>pluggable module</strong>.</p>
<p>The motherboard — in DC-MHS terms the <strong>Host Processor Module (HPM)</strong> — keeps the compute (CPUs, DRAM, PCIe). The DC-SCM carries the management brain and the hardware-security anchors, and connects to the HPM over a defined interface called the <strong>DC-SCI (Datacenter-ready Secure Control Interface)</strong>. Because the interface is standardized, a management module from one vendor can plug into a motherboard from another.</p>
<p>The payoff is that the <em>lifecycle</em> of management and security — which changes often, for features and for security fixes — is <strong>decoupled</strong> from the compute board, which changes on a slower cadence tied to CPU generations.</p>`
    },
    {
      "title": "2. What's on a DC-SCM",
      "content": `<p>A DC-SCM concentrates the management and security hardware onto one module. A representative module carries:</p>
<ul>
<li><strong>BMC</strong> — the Baseboard Management Controller, commonly running <em>OpenBMC</em> (see the companion <em>OpenBMC</em> topic).</li>
<li><strong>BMC boot flash(es)</strong> — the firmware the BMC boots from.</li>
<li><strong>BIOS / host SPI flash(es)</strong> — the host firmware image, which the host reads over the interface.</li>
<li><strong>Root of Trust (RoT)</strong> — anchors firmware measurement and verified boot.</li>
<li><strong>TPM</strong> — stores measurements and keys for platform attestation.</li>
<li><strong>Management DRAM</strong>, <strong>video</strong>, an <strong>SCM CPLD</strong> for glue logic and sequencing.</li>
<li><strong>Temperature sensor</strong> and <strong>FRU EEPROM</strong> (field-replaceable-unit inventory), plus the connectors.</li>
</ul>
<p>The HPM side keeps the <strong>CPUs, DRAM, PCIe and compute</strong>. The block diagram makes the split explicit, with the DC-SCI crossing the middle.</p>
${scmBlockSVG()}`
    },
    {
      "title": "3. The DC-SCI Interface",
      "content": `<p>The <strong>DC-SCI (Datacenter-ready Secure Control Interface)</strong> is the connector and signal set between the DC-SCM and the HPM. It bundles the interfaces that management and host firmware need to cross between the two boards, including:</p>
<ul>
<li><strong>SPI</strong> — so the host can reach BIOS flash and the BMC can reach its own flash.</li>
<li><strong>I2C / I3C</strong> — sensor and device management buses.</li>
<li><strong>GPIOs</strong> — discrete control and status signals.</li>
<li><strong>eSPI</strong> — the host-to-BMC enhanced serial peripheral interface.</li>
<li><strong>USB</strong> and <strong>RGMII / PHY</strong> — for features such as virtual media and the management network path.</li>
</ul>
<p>Carrying all of these as dedicated parallel signals would need a large, expensive connector. That is the problem LTPI solves, covered next.</p>`
    },
    {
      "title": "4. LTPI — Low-speed Transport Protocol Interface",
      "content": `<p><strong>LTPI (Low-speed Transport Protocol Interface)</strong> is a serialized <strong>LVDS</strong> link that <strong>reduces the pin count</strong> across the SCM-to-HPM connector. Instead of routing many slow interfaces (I2C/I3C, numerous GPIOs, UART, RGMII and so on) as individual signals, LTPI <em>tunnels</em> them over a few differential pairs: it serializes them on one side and reconstructs them on the other.</p>
<p>Beyond saving pins, LTPI enables <strong>remote BMC peripheral expansion</strong> — the BMC can reach peripherals on the far side of the link as if they were local — with <strong>low-latency</strong> transfers. In <strong>DC-SCM 2.x</strong>, LTPI was significant enough that it was extracted into its <em>own</em> specification.</p>
${scmLtpiSVG()}`
    },
    {
      "title": "5. Versions & Form Factors",
      "content": `<p>DC-SCM has evolved across two major generations:</p>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Version</th><th style="text-align:left; padding:0.5rem;">Notes</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>DC-SCM 1.0</strong> (2021)</td><td style="padding:0.5rem;">The first standardized module and DC-SCI connector.</td></tr>
<tr><td style="padding:0.5rem;"><strong>DC-SCM 2.0 / 2.1</strong></td><td style="padding:0.5rem;">Introduced <strong>LTPI</strong>, a <em>"Plug &amp; Code"</em> universality goal, refined power states, and dual-node alternate pin definitions.</td></tr></table>
<p>The 2.0 connector includes a deliberate <strong>mechanical break</strong> — connector skew / notches — so that a 2.0 module <em>cannot mis-mate</em> with a 1.0 socket. This prevents a physically possible but electrically wrong pairing.</p>
<p>DC-SCM also defines mechanical variants for different chassis:</p>
<ul>
<li><strong>HFF — Horizontal Form Factor</strong></li>
<li><strong>VFF — Vertical Form Factor</strong></li>
</ul>
<p>The two form factors let the same logical module fit systems with different height and airflow constraints.</p>`
    },
    {
      "title": "6. Why It Matters",
      "content": `<p>Putting management and security on a standardized module has three durable benefits:</p>
<ul>
<li><strong>Decoupled lifecycles</strong> — management and security firmware iterate on their own cadence without respinning the compute board, and a single DC-SCM design can be reused across many HPMs.</li>
<li><strong>Standardized security stack</strong> — the Root of Trust, TPM and BMC are gathered into one specified, auditable module, giving a consistent hardware-security baseline across platforms.</li>
<li><strong>Vendor interoperability</strong> — because the DC-SCI interface is specified, management modules become interchangeable the same way DC-MHS makes compute blocks interchangeable.</li>
</ul>
<p>In the larger OCP picture (see the <em>OCP Modular Hardware</em> topic), the DC-SCM is the <em>management</em> building block that plugs into the HPM, while OpenBMC is the firmware that typically runs on its BMC.</p>`
    },
    {
      "title": "7. References & Further Reading",
      "content": `<ul>
<li><a href="https://www.opencompute.org/documents/ocp-dc-scm-2-0-ver-1-0-pdf" target="_blank">OCP DC-SCM 2.0 specification</a>.</li>
<li><a href="https://www.opencompute.org/documents/ocp-dc-scm-spec-rev-1-0-pdf" target="_blank">OCP DC-SCM 1.0 specification</a>.</li>
<li><a href="https://www.opencompute.org/projects/hardware-management" target="_blank">OCP Hardware Management project</a> — the project that owns DC-SCM.</li>
</ul>
<p>Related topics on this site: <em>OpenBMC</em> (the BMC firmware on a DC-SCM) and <em>OCP Modular Hardware</em> (how the DC-SCM fits the DC-MHS / Open Rack picture).</p>`
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) { module.exports = TOPIC_DC_SCM; }
