/**
 * Topic: OCP NIC 3.0 — The Modular Server NIC Form Factor
 *
 * The standardized, tool-less-serviceable mezzanine NIC form factor built
 * on the SFF-TA-1002 connector, so NICs from different vendors drop into
 * any compliant OCP server baseboard. Covers the problem it solves,
 * mechanical/form factors (SFF/LFF), electrical/interfaces (PCIe +
 * NC-SI sideband), out-of-band management/serviceability, its relation to
 * the Linux driver model, and why it matters.
 */

/* Accessible palette — declared ABOVE the topic object (TDZ guard). ONE
 * neutral-blue hue for every box (#cfe3ff fill, #1f2d3d stroke) on a
 * #0d1117 background. Identity carried by NUMBER badges + position + shape
 * + text, never hue. Table borders #30363d. Per-file prefix: onic. */
const ONIC_BOX_FILL = "#cfe3ff";
const ONIC_BOX_STROKE = "#1f2d3d";
const ONIC_TEXT = "#0f172a";
const ONIC_NOTE = "#c9d4e0";
const ONIC_ARROW = "#9db4cc";
const ONIC_BG = "#0d1117";

function onicBox(x, y, w, h, label, badge) {
  const cy = y + h / 2;
  const r = 13;
  let s =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ` +
    `fill="${ONIC_BOX_FILL}" stroke="${ONIC_BOX_STROKE}" stroke-width="1.5"></rect>`;
  if (badge !== undefined) {
    s +=
      `<circle cx="${x + r + 4}" cy="${cy}" r="${r}" fill="${ONIC_BOX_STROKE}"></circle>` +
      `<text x="${x + r + 4}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="13" font-weight="700" fill="#ffffff">${badge}</text>`;
  }
  const tx = badge !== undefined ? x + r + 4 + (w - r - 4) / 2 : x + w / 2;
  s +=
    `<text x="${tx}" y="${cy + 5}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="13" font-weight="600" fill="${ONIC_TEXT}">${label}</text>`;
  return s;
}

function onicStepBox(x, y, w, h, label, badge) {
  const cy = y + h / 2;
  const r = 13;
  let s =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ` +
    `fill="${ONIC_BOX_FILL}" stroke="${ONIC_BOX_STROKE}" stroke-width="1.5"></rect>`;
  if (badge !== undefined) {
    s +=
      `<circle cx="${x + r + 4}" cy="${cy}" r="${r}" fill="${ONIC_BOX_STROKE}"></circle>` +
      `<text x="${x + r + 4}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="13" font-weight="700" fill="#ffffff">${badge}</text>`;
  }
  s +=
    `<text x="${x + (badge !== undefined ? r + 24 : 12)}" y="${cy + 4}" ` +
    `font-family="sans-serif" font-size="11.5" fill="${ONIC_TEXT}">${label}</text>`;
  return s;
}

function onicVArrow(x, y1, y2) {
  return (
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${ONIC_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x - 5},${y2 - 6} ${x + 5},${y2 - 6} ${x},${y2}" fill="${ONIC_ARROW}"></polygon>`
  );
}

function onicHArrow(x1, y, x2) {
  const dir = x2 >= x1 ? 1 : -1;
  return (
    `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${ONIC_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x2 - dir * 7},${y - 5} ${x2 - dir * 7},${y + 5} ${x2},${y}" fill="${ONIC_ARROW}"></polygon>`
  );
}

function onicFrame(viewW, viewH, title, subtitle, body, ariaLabel) {
  return (
    `<div style="overflow-x:auto; margin:1rem 0; padding:1rem; background:${ONIC_BG}; ` +
    `border:1px solid #30363d; border-radius:8px;">` +
    `<div style="text-align:center; font-weight:700; font-size:1.05rem; color:#58a6ff; margin-bottom:0.25rem;">${title}</div>` +
    `<div style="text-align:center; font-size:0.85rem; color:#8b949e; margin-bottom:0.75rem;">${subtitle}</div>` +
    `<svg viewBox="0 0 ${viewW} ${viewH}" width="100%" role="img" aria-label="${ariaLabel}">${body}</svg>` +
    `</div>`
  );
}

// Diagram A: OCP NIC 3.0 card <-> SFF-TA-1002 edge connector <-> baseboard,
// showing PCIe lanes + NC-SI sideband to the BMC.
function onicConnectSVG() {
  const w = 760;
  let body = "";
  // NIC card (left).
  body += onicBox(30, 40, 230, 120, "", 1);
  body +=
    `<text x="155" y="72" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="${ONIC_TEXT}">OCP NIC 3.0 card</text>` +
    `<text x="155" y="94" text-anchor="middle" font-family="sans-serif" font-size="10.5" fill="${ONIC_TEXT}">network controller (ASIC)</text>` +
    `<text x="155" y="112" text-anchor="middle" font-family="sans-serif" font-size="10.5" fill="${ONIC_TEXT}">+ ports (Ethernet)</text>` +
    `<text x="155" y="130" text-anchor="middle" font-family="sans-serif" font-size="10.5" fill="${ONIC_TEXT}">edge connector / gold fingers</text>`;
  // SFF-TA-1002 connector (centre).
  body += onicStepBox(300, 60, 150, 80, "SFF-TA-1002 connector", 2);
  body += onicHArrow(260, 100, 300);
  // Baseboard (right).
  body += onicBox(490, 40, 240, 120, "", 3);
  body +=
    `<text x="610" y="72" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="${ONIC_TEXT}">server baseboard</text>` +
    `<text x="610" y="94" text-anchor="middle" font-family="sans-serif" font-size="10.5" fill="${ONIC_TEXT}">PCIe root complex (host)</text>`;
  body += onicHArrow(450, 90, 490);
  body += `<text x="470" y="76" text-anchor="middle" font-family="sans-serif" font-size="9.5" fill="${ONIC_NOTE}">PCIe lanes</text>`;
  // BMC box lower-right, reached by NC-SI sideband.
  body += onicStepBox(520, 220, 180, 44, "BMC (NC-SI sideband)", 4);
  body += onicVArrow(610, 160, 220);
  body += `<text x="618" y="195" font-family="sans-serif" font-size="9.5" fill="${ONIC_NOTE}">NC-SI over MCTP/RBT</text>`;
  body +=
    `<text x="280" y="190" text-anchor="middle" font-family="sans-serif" font-size="10.5" fill="${ONIC_NOTE}">tool-less insertion from the faceplate; card edge mates with the baseboard connector</text>`;
  return onicFrame(
    w, 290,
    "OCP NIC 3.0 — Card, Connector, Baseboard",
    "The NIC card (1) mates through an SFF-TA-1002 connector (2) into the server baseboard (3); PCIe lanes carry data to the host while an NC-SI sideband reaches the BMC (4)",
    body,
    "OCP NIC 3.0 physical and electrical connection. On the left, the NIC card carries a network controller ASIC, Ethernet ports and a card-edge connector with gold fingers. In the centre, an industry SFF-TA-1002 connector joins the card to the baseboard; insertion is tool-less from the faceplate. On the right, the server baseboard provides the host PCIe root complex, and PCIe lanes carry network data between card and host. A separate NC-SI sideband, carried over MCTP or RBT, runs from the card down to the BMC so the controller can be managed out of band."
  );
}

// Diagram B: NC-SI / MCTP out-of-band management path (BMC <-> NIC) with an
// SFF-vs-LFF note.
function onicOobSVG() {
  const w = 760;
  let body = "";
  // BMC on the left.
  body += onicBox(40, 70, 180, 90, "", 1);
  body +=
    `<text x="130" y="105" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="${ONIC_TEXT}">BMC</text>` +
    `<text x="130" y="127" text-anchor="middle" font-family="sans-serif" font-size="10.5" fill="${ONIC_TEXT}">OpenBMC, out-of-band</text>`;
  // NC-SI / MCTP transport in the middle.
  body += onicStepBox(290, 80, 180, 70, "NC-SI over MCTP", 2);
  body += onicHArrow(220, 115, 290);
  body += onicHArrow(470, 115, 540);
  body +=
    `<text x="380" y="70" text-anchor="middle" font-family="sans-serif" font-size="10" fill="${ONIC_NOTE}">SMBus / PCIe VDM / RBT</text>`;
  // NIC on the right.
  body += onicBox(540, 70, 180, 90, "", 3);
  body +=
    `<text x="630" y="98" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="${ONIC_TEXT}">OCP NIC 3.0</text>` +
    `<text x="630" y="120" text-anchor="middle" font-family="sans-serif" font-size="10" fill="${ONIC_TEXT}">sensors + inventory</text>` +
    `<text x="630" y="138" text-anchor="middle" font-family="sans-serif" font-size="10" fill="${ONIC_TEXT}">firmware / FRU</text>`;
  body +=
    `<text x="380" y="195" text-anchor="middle" font-family="sans-serif" font-size="10.5" fill="${ONIC_NOTE}">The BMC reads NIC sensors/inventory independently of the host OS — same OOB theme as the host-data PCIe path.</text>`;
  return onicFrame(
    w, 220,
    "Out-of-Band Management Path — BMC to NIC",
    "The BMC (1) reaches the NIC's sensors, inventory and firmware (3) over NC-SI carried on MCTP (2) — independent of the host OS",
    body,
    "Out-of-band management path. On the left the BMC, running OpenBMC, performs management independently of the host operating system. In the centre, NC-SI carried over MCTP is the transport, which can run over SMBus, a PCIe vendor-defined message channel, or RBT. On the right the OCP NIC 3.0 exposes its sensors, inventory, firmware and FRU data. The BMC reads and manages the NIC over this sideband even when the host is off, which is the same out-of-band theme used elsewhere in OCP management."
  );
}

const TOPIC_OCP_NIC = {
  "id": "ocp-nic",
  "category": "ocp",
  "icon": "📶",
  "title": "OCP NIC 3.0: The Modular Server NIC Form Factor",
  "description": "The OCP NIC 3.0 standardized, tool-less-serviceable mezzanine NIC form factor built on the SFF-TA-1002 connector, so NICs from different vendors drop into any compliant OCP server baseboard. Covers the problem it solves (vs proprietary mezzanine or PCIe add-in cards), SFF and LFF form factors and lane counts, PCIe data lanes plus NC-SI sideband management to the BMC, out-of-band management and serviceability, and how such a card still appears to Linux as an ordinary PCIe NIC",
  "keywords": [
    "ocp nic", "ocp nic 3.0", "nic form factor", "mezzanine", "ocp mezz",
    "sff-ta-1002", "sff", "lff", "small form factor", "large form factor",
    "ocp", "open compute project", "server", "baseboard", "gold finger",
    "edge connector", "pcie", "pci express", "bifurcation", "nc-si",
    "mctp", "rbt", "sideband", "out-of-band", "bmc", "openbmc",
    "tool-less", "serviceability", "network card", "net driver"
  ],
  "sections": [
    {
      "title": "1. The Problem It Solves",
      "content": `<p>Server network cards historically came in two awkward shapes: <strong>proprietary mezzanine cards</strong> that only fit one vendor's board, or standard <strong>PCIe add-in cards</strong> that take a full slot and need the chassis opened to service. Neither is ideal at fleet scale, where you want to source NICs competitively and swap them quickly.</p>
<p><strong>OCP NIC 3.0</strong> defines a <strong>standardized, tool-less-serviceable mezzanine form factor</strong>: a network card from any vendor that builds to the spec drops into any compliant OCP server baseboard, and a technician can insert or remove it from the faceplate without tools or opening the chassis. It is the <strong>third generation</strong> of the OCP NIC form factor, superseding <strong>OCP Mezz 2.0</strong>. See the <a href="https://www.opencompute.org/projects/server" target="_blank">OCP Server project</a>.</p>`
    },
    {
      "title": "2. Mechanical & Form Factors",
      "content": `<p>OCP NIC 3.0 is built on the industry <strong>SFF-TA-1002</strong> connector standard (referenced by name; see the <a href="https://www.snia.org/technology-standards/sff" target="_blank">SNIA SFF standards</a>). The card presents a card-edge connector — the <em>"gold fingers"</em> — that mates with a baseboard connector; retention and insertion are <strong>tool-less from the faceplate</strong>.</p>
<p>There are two primary sizes:</p>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Form factor</th><th style="text-align:left; padding:0.5rem;">PCIe lanes on the card edge</th><th style="text-align:left; padding:0.5rem;">Typical use</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Small Form Factor (SFF)</strong></td><td style="padding:0.5rem;">up to 16 lanes</td><td style="padding:0.5rem;">mainstream single/dual-port NICs</td></tr>
<tr><td style="padding:0.5rem;"><strong>Large Form Factor (LFF)</strong></td><td style="padding:0.5rem;">up to 32 lanes</td><td style="padding:0.5rem;">higher-bandwidth / multi-host cards</td></tr></table>
<p>The spec also defines <strong>Z-height profiles</strong> so cards fit different chassis clearances. The diagram shows how the card mates through the connector into the baseboard.</p>
${onicConnectSVG()}`
    },
    {
      "title": "3. Electrical & Interfaces",
      "content": `<p>Across the connector the card carries two broad classes of signal:</p>
<ul>
<li><strong>PCIe data lanes</strong> — Gen4/Gen5-class PCI Express carries the actual network traffic between the NIC and the host CPU, exactly like any PCIe device.</li>
<li><strong>Sideband management</strong> — <strong>NC-SI</strong> (Network Controller Sideband Interface), carried over <strong>MCTP</strong> (on SMBus or a PCIe channel) or over <strong>RBT</strong>, lets the BMC manage the NIC <em>out of band</em> (see the companion <em>OpenBMC</em> and <em>DC-SCM</em> topics).</li>
<li><strong>Power delivery</strong> and <strong>presence / bifurcation signaling</strong> — the baseboard learns a card is present and how its lanes are configured.</li>
</ul>
<p><strong>Bifurcation</strong> means a single physical connector's lanes can be split — for example one slot's lanes divided across multiple endpoints or hosts — which the presence/configuration signaling negotiates at bring-up.</p>`
    },
    {
      "title": "4. Management & Serviceability",
      "content": `<p>Because the NIC exposes a <strong>sideband</strong>, the BMC can read its <strong>sensors and inventory</strong> and manage its firmware over <strong>NC-SI / MCTP</strong> — independently of the host OS. That is the same out-of-band philosophy used by the DC-SCM and OpenBMC: management works even when the host is off or unresponsive.</p>
${onicOobSVG()}
<p>Combined with <strong>tool-less front serviceability</strong>, this makes the card a clean fleet-management unit: it can be monitored remotely and physically swapped from the faceplate without downtime for the rest of the chassis.</p>`
    },
    {
      "title": "5. Relation to Linux",
      "content": `<p>It is worth being precise about what OCP NIC 3.0 does and does not standardize. To the operating system, an OCP NIC 3.0 card appears as an <strong>ordinary PCIe network device</strong>, bound by its vendor's normal net driver and presented as a standard network interface. Nothing about the Linux driver model changes.</p>
<p>OCP NIC 3.0 standardizes the <strong>physical and management envelope</strong> — the connector, mechanicals, serviceability and the sideband path to the BMC — <em>not</em> the Linux driver model. For the driver side and the bus itself, see the site's existing <em>NIC Drivers</em> and <em>PCIe</em> topics; this topic does not re-teach them.</p>`
    },
    {
      "title": "6. Why It Matters",
      "content": `<ul>
<li><strong>Multi-vendor interoperability</strong> — any compliant card fits any compliant baseboard, so NICs can be sourced competitively.</li>
<li><strong>Tool-less field service</strong> — faceplate insertion/removal shortens maintenance and reduces the blast radius of a swap.</li>
<li><strong>Consistent out-of-band management</strong> — NC-SI/MCTP gives a uniform way for the BMC to monitor and update NICs across a whole fleet.</li>
</ul>
<p>In the broader OCP picture (see the <em>OCP Modular Hardware</em> topic), the OCP NIC is the <em>networking</em> building block that complements the compute HPM and the DC-SCM management module.</p>`
    },
    {
      "title": "7. References & Further Reading",
      "content": `<ul>
<li><a href="https://www.opencompute.org/" target="_blank">Open Compute Project</a> — OCP NIC 3.0 design and validation materials.</li>
<li><a href="https://www.opencompute.org/projects/server" target="_blank">OCP Server project</a> — home of the OCP NIC specifications.</li>
<li><strong>SFF-TA-1002</strong> — the industry connector standard OCP NIC 3.0 builds on; see the <a href="https://www.snia.org/technology-standards/sff" target="_blank">SNIA SFF technology standards</a>.</li>
<li><a href="https://www.fs.com/" target="_blank">FS.com</a> — a vendor explainer on OCP NIC form factors.</li>
</ul>
<p>Related topics on this site: <em>NIC Drivers</em> and <em>PCIe</em> (the Linux driver and bus side), plus <em>OpenBMC</em> and <em>DC-SCM</em> (the out-of-band management side).</p>`
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) { module.exports = TOPIC_OCP_NIC; }
