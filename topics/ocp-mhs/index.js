/**
 * Topic: OCP Modular Hardware — DC-MHS & Open Rack (ORv3)
 *
 * The umbrella / map topic for the Open Compute Project hardware specs.
 * Describes what OCP is, how its specs organize into Projects/Subprojects,
 * the DC-MHS (Datacenter-ready Modular Hardware System) family, and the
 * Open Rack v3 (ORv3) rack standard. The DC-SCM, OpenBMC and OCP NIC
 * topics drill into individual building blocks.
 */

/* Accessible palette — declared ABOVE the topic object so the SVG helper
 * functions are initialized before the object literal calls them (avoids a
 * temporal-dead-zone ReferenceError at load that would blank the whole site).
 * ONE neutral-blue hue for every box (#cfe3ff fill, #1f2d3d stroke) on a
 * #0d1117 background. Identity is carried by NUMBER badges + position +
 * shape + text, never by hue. No red/green/yellow conveys meaning. Table
 * borders use #30363d. Per-file prefix: mhs. */
const MHS_BOX_FILL = "#cfe3ff";
const MHS_BOX_STROKE = "#1f2d3d";
const MHS_TEXT = "#0f172a";
const MHS_NOTE = "#c9d4e0";
const MHS_ARROW = "#9db4cc";
const MHS_BG = "#0d1117";

function mhsBox(x, y, w, h, label, badge) {
  const cy = y + h / 2;
  const r = 13;
  let s =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ` +
    `fill="${MHS_BOX_FILL}" stroke="${MHS_BOX_STROKE}" stroke-width="1.5"></rect>`;
  if (badge !== undefined) {
    s +=
      `<circle cx="${x + r + 4}" cy="${cy}" r="${r}" fill="${MHS_BOX_STROKE}"></circle>` +
      `<text x="${x + r + 4}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="13" font-weight="700" fill="#ffffff">${badge}</text>`;
  }
  const tx = badge !== undefined ? x + r + 4 + (w - r - 4) / 2 : x + w / 2;
  s +=
    `<text x="${tx}" y="${cy + 5}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="14" font-weight="600" fill="${MHS_TEXT}">${label}</text>`;
  return s;
}

function mhsStepBox(x, y, w, h, label, badge) {
  const cy = y + h / 2;
  const r = 13;
  let s =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ` +
    `fill="${MHS_BOX_FILL}" stroke="${MHS_BOX_STROKE}" stroke-width="1.5"></rect>`;
  if (badge !== undefined) {
    s +=
      `<circle cx="${x + r + 4}" cy="${cy}" r="${r}" fill="${MHS_BOX_STROKE}"></circle>` +
      `<text x="${x + r + 4}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="13" font-weight="700" fill="#ffffff">${badge}</text>`;
  }
  s +=
    `<text x="${x + (badge !== undefined ? r + 24 : 14)}" y="${cy + 4}" ` +
    `font-family="sans-serif" font-size="12.5" fill="${MHS_TEXT}">${label}</text>`;
  return s;
}

function mhsVArrow(x, y1, y2) {
  return (
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${MHS_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x - 5},${y2 - 6} ${x + 5},${y2 - 6} ${x},${y2}" fill="${MHS_ARROW}"></polygon>`
  );
}

function mhsHArrow(x1, y, x2) {
  const dir = x2 >= x1 ? 1 : -1;
  return (
    `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${MHS_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x2 - dir * 7},${y - 5} ${x2 - dir * 7},${y + 5} ${x2},${y}" fill="${MHS_ARROW}"></polygon>`
  );
}

function mhsFrame(viewW, viewH, title, subtitle, body, ariaLabel) {
  return (
    `<div style="overflow-x:auto; margin:1rem 0; padding:1rem; background:${MHS_BG}; ` +
    `border:1px solid #30363d; border-radius:8px;">` +
    `<div style="text-align:center; font-weight:700; font-size:1.05rem; color:#58a6ff; margin-bottom:0.25rem;">${title}</div>` +
    `<div style="text-align:center; font-size:0.85rem; color:#8b949e; margin-bottom:0.75rem;">${subtitle}</div>` +
    `<svg viewBox="0 0 ${viewW} ${viewH}" width="100%" role="img" aria-label="${ariaLabel}">${body}</svg>` +
    `</div>`
  );
}

// Diagram A: the OCP hardware stack — an Open Rack power/cooling envelope
// containing the modular building blocks HPM, DC-SCM and OCP NIC.
function mhsStackSVG() {
  const w = 760;
  let body = "";
  // Outer rack frame (dashed, labelled) = power/cooling envelope.
  body +=
    `<rect x="30" y="20" width="700" height="330" rx="10" fill="none" ` +
    `stroke="${MHS_BOX_STROKE}" stroke-width="1.5" stroke-dasharray="6 4"></rect>`;
  body += mhsStepBox(46, 34, 360, 30, "Open Rack v3 (ORv3) — 21\" equipment space + rack-level DC power/cooling", 1);
  // Power shelf / bus bar bar near the bottom inside the rack.
  body += mhsStepBox(46, 300, 668, 36, "Power shelf + DC bus bar: centralized rack power feeds every building block", 2);
  body += mhsVArrow(380, 294, 274);
  // The three modular building blocks that populate the rack.
  const blkY = 120, blkH = 120, blkW = 200;
  body += mhsBox(60, blkY, blkW, blkH, "", 3);
  body +=
    `<text x="${60 + blkW / 2 + 10}" y="${blkY + 44}" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="${MHS_TEXT}">HPM</text>` +
    `<text x="${60 + blkW / 2 + 10}" y="${blkY + 66}" text-anchor="middle" font-family="sans-serif" font-size="11" fill="${MHS_TEXT}">Host Processor Module</text>` +
    `<text x="${60 + blkW / 2 + 10}" y="${blkY + 84}" text-anchor="middle" font-family="sans-serif" font-size="11" fill="${MHS_TEXT}">CPUs / DRAM / PCIe</text>`;
  body += mhsBox(290, blkY, blkW, blkH, "", 4);
  body +=
    `<text x="${290 + blkW / 2 + 10}" y="${blkY + 44}" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="${MHS_TEXT}">DC-SCM</text>` +
    `<text x="${290 + blkW / 2 + 10}" y="${blkY + 66}" text-anchor="middle" font-family="sans-serif" font-size="11" fill="${MHS_TEXT}">management + security</text>` +
    `<text x="${290 + blkW / 2 + 10}" y="${blkY + 84}" text-anchor="middle" font-family="sans-serif" font-size="11" fill="${MHS_TEXT}">BMC / RoT / TPM</text>`;
  body += mhsBox(520, blkY, blkW, blkH, "", 5);
  body +=
    `<text x="${520 + blkW / 2 + 10}" y="${blkY + 44}" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="${MHS_TEXT}">OCP NIC</text>` +
    `<text x="${520 + blkW / 2 + 10}" y="${blkY + 66}" text-anchor="middle" font-family="sans-serif" font-size="11" fill="${MHS_TEXT}">modular networking</text>` +
    `<text x="${520 + blkW / 2 + 10}" y="${blkY + 84}" text-anchor="middle" font-family="sans-serif" font-size="11" fill="${MHS_TEXT}">PCIe + NC-SI</text>`;
  // DC-SCM <-> HPM and NIC <-> HPM interface links.
  body += mhsHArrow(290, blkY + blkH / 2, 260);
  body += mhsHArrow(520, blkY + blkH / 2, 490);
  body +=
    `<text x="275" y="${blkY + blkH / 2 - 10}" text-anchor="middle" font-family="sans-serif" font-size="10" fill="${MHS_NOTE}">DC-SCI</text>` +
    `<text x="505" y="${blkY + blkH / 2 - 10}" text-anchor="middle" font-family="sans-serif" font-size="10" fill="${MHS_NOTE}">SFF-TA-1002</text>`;
  return mhsFrame(
    w, 366,
    "OCP Hardware Stack — One Rack, Interchangeable Blocks",
    "Open Rack v3 (1) supplies the equipment space and rack-level DC power (2); the Host Processor Module (3), DC-SCM (4) and OCP NIC (5) are modular building blocks that populate it and connect over defined interfaces",
    body,
    "OCP hardware stack. A dashed outer frame represents an Open Rack v3 enclosure that provides a twenty-one inch equipment space and rack-level DC power and cooling. A power shelf and DC bus bar at the bottom feed every building block. Inside the rack sit three interchangeable modular building blocks: the Host Processor Module holding CPUs, DRAM and PCIe compute; the DC-SCM holding management and security such as the BMC, Root of Trust and TPM, connected to the HPM over the DC-SCI interface; and the OCP NIC providing modular networking with PCIe lanes and NC-SI sideband, connected over an SFF-TA-1002 connector."
  );
}

// Diagram B: DC-MHS modularity map — the HPM at the centre with defined
// interfaces to the sibling modules.
function mhsModularityMapSVG() {
  const w = 760;
  let body = "";
  // Central HPM.
  const hpmW = 240, hpmH = 90, hpmX = 260, hpmY = 150;
  body += mhsBox(hpmX, hpmY, hpmW, hpmH, "", 1);
  body +=
    `<text x="${hpmX + hpmW / 2 + 10}" y="${hpmY + 36}" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="700" fill="${MHS_TEXT}">HPM (Host Processor Module)</text>` +
    `<text x="${hpmX + hpmW / 2 + 10}" y="${hpmY + 58}" text-anchor="middle" font-family="sans-serif" font-size="11" fill="${MHS_TEXT}">the compute motherboard — DC-MHS core</text>`;
  // DC-SCM above.
  body += mhsBox(300, 30, 200, 60, "", 2);
  body +=
    `<text x="410" y="56" text-anchor="middle" font-family="sans-serif" font-size="12.5" font-weight="700" fill="${MHS_TEXT}">DC-SCM</text>` +
    `<text x="410" y="74" text-anchor="middle" font-family="sans-serif" font-size="10.5" fill="${MHS_TEXT}">management module</text>`;
  body += mhsVArrow(380, 150, 92);
  body += `<text x="470" y="128" font-family="sans-serif" font-size="10" fill="${MHS_NOTE}">DC-SCI</text>`;
  // OCP NIC left.
  body += mhsBox(30, 160, 190, 70, "", 3);
  body +=
    `<text x="125" y="188" text-anchor="middle" font-family="sans-serif" font-size="12.5" font-weight="700" fill="${MHS_TEXT}">OCP NIC 3.0</text>` +
    `<text x="125" y="206" text-anchor="middle" font-family="sans-serif" font-size="10.5" fill="${MHS_TEXT}">modular networking</text>`;
  body += mhsHArrow(220, 195, 258);
  // Power/physical below.
  body += mhsBox(300, 280, 200, 60, "", 4);
  body +=
    `<text x="400" y="306" text-anchor="middle" font-family="sans-serif" font-size="12.5" font-weight="700" fill="${MHS_TEXT}">Open Rack / power</text>` +
    `<text x="400" y="324" text-anchor="middle" font-family="sans-serif" font-size="10.5" fill="${MHS_TEXT}">physical + power envelope</text>`;
  body += mhsVArrow(380, 240, 278);
  // Peripheral/storage right.
  body += mhsBox(540, 160, 190, 70, "", 5);
  body +=
    `<text x="635" y="188" text-anchor="middle" font-family="sans-serif" font-size="12.5" font-weight="700" fill="${MHS_TEXT}">Peripheral / storage</text>` +
    `<text x="635" y="206" text-anchor="middle" font-family="sans-serif" font-size="10.5" fill="${MHS_TEXT}">PCIe / power modules</text>`;
  body += mhsHArrow(500, 195, 538);
  return mhsFrame(
    w, 356,
    "DC-MHS Modularity Map — Defined Interfaces Around the HPM",
    "DC-MHS puts the Host Processor Module (1) at the centre; sibling modules — DC-SCM (2), OCP NIC (3), the rack/power envelope (4) and peripheral/storage (5) — attach over standardized interfaces so vendors can mix and match",
    body,
    "DC-MHS modularity map. The Host Processor Module, the compute motherboard, sits at the centre. Around it, connected by defined standardized interfaces, are the DC-SCM management module attached over the DC-SCI interface above it, the OCP NIC modular networking card to the left, the Open Rack physical and power envelope below, and peripheral or storage modules to the right. The Modular Building Block Architecture lets vendors mix and match these blocks because every interface is specified."
  );
}

const TOPIC_OCP_MHS = {
  "id": "ocp-mhs",
  "category": "ocp",
  "icon": "🏗️",
  "title": "OCP Modular Hardware: DC-MHS & Open Rack (ORv3)",
  "description": "The map of Open Compute Project hardware specs: what OCP is and its tenets, how specs organize into Projects/Subprojects, the DC-MHS (Datacenter-ready Modular Hardware System) family and the Host Processor Module (HPM), and Open Rack v3 (ORv3) with rack-level DC power and cooling — the umbrella topic from which DC-SCM, OpenBMC and OCP NIC drill in",
  "keywords": [
    "ocp", "open compute project", "modular hardware", "dc-mhs",
    "datacenter-ready modular hardware system", "mba",
    "modular building block architecture", "hpm", "host processor module",
    "open rack", "orv3", "open rack v3", "21 inch rack", "bus bar",
    "power shelf", "rack power", "dc power", "building block",
    "interoperability", "hyperscaler", "sustainability", "efficiency",
    "openness", "impact", "scale", "server", "datacenter", "form factor"
  ],
  "sections": [
    {
      "title": "1. What OCP Is (Overview & Tenets)",
      "content": `<p>The <strong>Open Compute Project (OCP)</strong> is a community-driven effort, started by data-center hyperscalers, to design and share <strong>open hardware</strong> — servers, racks, storage, networking and the management plumbing that ties them together. Instead of each operator building bespoke, proprietary gear, OCP publishes specifications that multiple vendors can build to, so a buyer can source interchangeable parts from a competitive supply chain. See the <a href="https://www.opencompute.org/" target="_blank">OCP homepage</a>.</p>
<p>OCP frames its work around a small set of guiding <strong>tenets</strong>:</p>
<ul>
<li><strong>Openness</strong> — specifications and designs are published so anyone can build, review and improve them.</li>
<li><strong>Efficiency</strong> — reduce wasted power, material and cost across the fleet.</li>
<li><strong>Impact</strong> — move the whole industry, not one vendor.</li>
<li><strong>Scale</strong> — designs must work from a single rack up to hyperscale deployments.</li>
<li><strong>Sustainability</strong> — longer service life, reuse and serviceability reduce environmental cost.</li>
</ul>
<p>This topic is the <strong>map</strong> of OCP's hardware specifications. It shows how the pieces fit, then hands off to three companion topics that drill into individual building blocks: the <em>DC-SCM</em> management module, the <em>OpenBMC</em> firmware that runs on it, and the <em>OCP NIC 3.0</em> networking form factor.</p>
${mhsStackSVG()}`
    },
    {
      "title": "2. How OCP Specs Are Organized (Projects & Subprojects)",
      "content": `<p>OCP's output is organized into <strong>Projects</strong>, each owning a domain, with <strong>Subprojects</strong> that refine a narrower slice. A hardware deployment usually touches several projects at once:</p>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Project area</th><th style="text-align:left; padding:0.5rem;">What it standardizes</th><th style="text-align:left; padding:0.5rem;">Companion topic</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>DC-MHS</strong></td><td style="padding:0.5rem;">Modular server building blocks &amp; their interfaces</td><td style="padding:0.5rem;">this topic</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Open Rack</strong></td><td style="padding:0.5rem;">Rack geometry, rack-level power &amp; cooling</td><td style="padding:0.5rem;">this topic</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Hardware Management</strong></td><td style="padding:0.5rem;">DC-SCM module, management interfaces</td><td style="padding:0.5rem;">DC-SCM / OpenBMC</td></tr>
<tr><td style="padding:0.5rem;"><strong>Server / NIC</strong></td><td style="padding:0.5rem;">OCP NIC 3.0 modular network card</td><td style="padding:0.5rem;">OCP NIC</td></tr></table>
<p>Because the projects agree on shared interfaces, a module defined by one project (for example a DC-SCM from Hardware Management) can plug into a motherboard defined by another (a DC-MHS Host Processor Module). That cross-project interoperability is the point.</p>`
    },
    {
      "title": "3. DC-MHS — Datacenter-ready Modular Hardware System",
      "content": `<p><strong>DC-MHS (Datacenter-ready Modular Hardware System)</strong> is a family of specifications that defines consistent <strong>interfaces and form factors</strong> for the modular building blocks of a server. Its goal is that infrastructure assembled from multiple vendors — across datacenter, edge and enterprise — <em>interoperates</em> because the physical fit, the electrical signaling and the management protocols between blocks are all standardized. See the <a href="https://www.opencompute.org/projects/dc-mhs" target="_blank">OCP DC-MHS project</a> and the <a href="https://www.opencompute.org/wiki/Server/DC-MHS" target="_blank">DC-MHS wiki</a>.</p>
<p>DC-MHS standardizes three layers at once:</p>
<ul>
<li><strong>Physical</strong> — board outlines, connector placement, mechanical keep-outs.</li>
<li><strong>Signaling</strong> — the electrical interfaces that cross a connector between two blocks.</li>
<li><strong>Protocol</strong> — the management and control protocols that ride those signals.</li>
</ul>
<p>The organizing idea is the <strong>Modular Building Block Architecture (MBA)</strong>: break a server into well-defined blocks with specified interfaces so each block can evolve or be sourced independently. The central block is the <strong>Host Processor Module (HPM)</strong> — the compute motherboard carrying the CPUs, DRAM and PCIe. DC-MHS defines the HPM and the interfaces it exposes, and the <strong>DC-SCM</strong> is a sibling module (owned by the Hardware Management project) that plugs into the HPM over a defined interface. The map below shows those defined interfaces radiating from the HPM.</p>
${mhsModularityMapSVG()}`
    },
    {
      "title": "4. Open Rack v3 (ORv3) — The Rack Standard",
      "content": `<p><strong>Open Rack</strong> is OCP's rack specification, and <strong>Open Rack v3 (ORv3)</strong> is the current generation. Where a traditional EIA rack gives roughly a <strong>19-inch</strong> mounting width, Open Rack widens the usable <strong>equipment space to 21 inches</strong>, giving more room for cooling and for wider boards. See the <a href="https://www.opencompute.org/projects/open-rack" target="_blank">OCP Open Rack project</a>.</p>
<p>The defining change is moving power and cooling to the <strong>rack level</strong> rather than per-server:</p>
<ul>
<li><strong>Centralized DC power</strong> — a <em>power shelf</em> converts incoming AC to DC and delivers it over a shared <strong>bus bar</strong> that runs the height of the rack. Individual nodes tap the bus bar instead of each carrying its own AC power supply.</li>
<li><strong>Improved thermal design</strong> — the wider envelope and rack-level approach make room for better airflow and for liquid-cooling manifolds.</li>
<li><strong>Serviceability</strong> — blind-mate power and standardized sleds make nodes quicker to insert, service and replace.</li>
</ul>
<p>In short, ORv3's differentiator is that power and cooling are a property of the <em>rack</em>, shared by every block that populates it, rather than being duplicated inside each server.</p>`
    },
    {
      "title": "5. How the Pieces Fit Together",
      "content": `<p>The four OCP hardware topics on this site map onto four roles. Reading the stack diagram in section 1 from the outside in:</p>
<ul>
<li><strong>Open Rack (ORv3)</strong> is the <em>rack + power/cooling envelope</em> — the shared physical and electrical foundation.</li>
<li><strong>DC-MHS</strong> defines the <em>modular server building blocks</em> (notably the HPM) that populate the rack.</li>
<li><strong>DC-SCM</strong> is the <em>modular management</em> block: it carries the BMC, Root of Trust and TPM, and plugs into the HPM. The <em>DC-SCM topic</em> drills into it.</li>
<li><strong>OCP NIC 3.0</strong> is the <em>modular networking</em> block. The <em>OCP NIC topic</em> drills into it.</li>
<li><strong>OpenBMC</strong> is the <em>firmware</em> that typically runs on the BMC of a DC-SCM. The <em>OpenBMC topic</em> drills into it.</li>
</ul>
<p>Each block has a defined interface to the others, so a datacenter operator can source an HPM from one vendor, a DC-SCM from another and an OCP NIC from a third and still expect them to interoperate. This topic is the overview; the three companion topics go deep on the individual blocks.</p>`
    },
    {
      "title": "6. Why It Matters",
      "content": `<p>Modular, standardized hardware changes the economics and operations of a fleet:</p>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Benefit</th><th style="text-align:left; padding:0.5rem;">Why the modular approach delivers it</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Vendor interoperability</strong></td><td style="padding:0.5rem;">Specified interfaces let blocks from different vendors mix and match.</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Faster sourcing &amp; manufacturing</strong></td><td style="padding:0.5rem;">A competitive multi-vendor supply chain and reusable designs shorten lead times.</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Efficiency</strong></td><td style="padding:0.5rem;">Rack-level power and cooling reduce conversion losses and duplicated hardware.</td></tr>
<tr><td style="padding:0.5rem;"><strong>Sustainability</strong></td><td style="padding:0.5rem;">Serviceable, reusable blocks extend service life and reduce waste.</td></tr></table>
<p>These align directly with OCP's tenets from section 1: openness enables the interoperability, and efficiency and sustainability fall out of sharing power, cooling and designs across the rack and the supply chain.</p>`
    },
    {
      "title": "7. References & Further Reading",
      "content": `<ul>
<li><a href="https://www.opencompute.org/projects/dc-mhs" target="_blank">OCP DC-MHS project</a> — the Datacenter-ready Modular Hardware System project.</li>
<li><a href="https://www.opencompute.org/wiki/Server/DC-MHS" target="_blank">OCP DC-MHS wiki</a> — specification index and building-block detail.</li>
<li><a href="https://www.opencompute.org/projects/open-rack" target="_blank">OCP Open Rack project</a> — rack geometry and rack-level power/cooling, including ORv3.</li>
<li><a href="https://www.opencompute.org/" target="_blank">opencompute.org</a> — the Open Compute Project homepage.</li>
</ul>
<p>For the individual building blocks, see the companion topics on this site: <em>DC-SCM</em> (management module), <em>OpenBMC</em> (BMC firmware) and <em>OCP NIC 3.0</em> (networking form factor).</p>`
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) { module.exports = TOPIC_OCP_MHS; }
