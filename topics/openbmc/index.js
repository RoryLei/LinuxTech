/**
 * Topic: OpenBMC — The Open-Source BMC Firmware Stack
 *
 * What a BMC is (out-of-band management), what OpenBMC is (a Yocto-built
 * open-source Linux distribution for embedded management controllers, a
 * Linux Foundation project), its D-Bus / phosphor software architecture,
 * northbound (Redfish via bmcweb, IPMI, PLDM/MCTP) and southbound (hwmon,
 * GPIO, I2C/I3C) interfaces, capabilities, how it ties to DC-SCM hardware,
 * and how it is built with Yocto layers.
 */

/* Accessible palette — declared ABOVE the topic object (TDZ guard). ONE
 * neutral-blue hue for every box (#cfe3ff fill, #1f2d3d stroke) on a
 * #0d1117 background. Identity carried by NUMBER badges + position + shape
 * + text, never hue. Table borders #30363d. Per-file prefix: obmc. */
const OBMC_BOX_FILL = "#cfe3ff";
const OBMC_BOX_STROKE = "#1f2d3d";
const OBMC_TEXT = "#0f172a";
const OBMC_NOTE = "#c9d4e0";
const OBMC_ARROW = "#9db4cc";
const OBMC_BG = "#0d1117";

function obmcBox(x, y, w, h, label, badge) {
  const cy = y + h / 2;
  const r = 13;
  let s =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ` +
    `fill="${OBMC_BOX_FILL}" stroke="${OBMC_BOX_STROKE}" stroke-width="1.5"></rect>`;
  if (badge !== undefined) {
    s +=
      `<circle cx="${x + r + 4}" cy="${cy}" r="${r}" fill="${OBMC_BOX_STROKE}"></circle>` +
      `<text x="${x + r + 4}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="13" font-weight="700" fill="#ffffff">${badge}</text>`;
  }
  const tx = badge !== undefined ? x + r + 4 + (w - r - 4) / 2 : x + w / 2;
  s +=
    `<text x="${tx}" y="${cy + 5}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="13" font-weight="600" fill="${OBMC_TEXT}">${label}</text>`;
  return s;
}

function obmcStepBox(x, y, w, h, label, badge) {
  const cy = y + h / 2;
  const r = 13;
  let s =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ` +
    `fill="${OBMC_BOX_FILL}" stroke="${OBMC_BOX_STROKE}" stroke-width="1.5"></rect>`;
  if (badge !== undefined) {
    s +=
      `<circle cx="${x + r + 4}" cy="${cy}" r="${r}" fill="${OBMC_BOX_STROKE}"></circle>` +
      `<text x="${x + r + 4}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="13" font-weight="700" fill="#ffffff">${badge}</text>`;
  }
  s +=
    `<text x="${x + (badge !== undefined ? r + 24 : 12)}" y="${cy + 4}" ` +
    `font-family="sans-serif" font-size="11.5" fill="${OBMC_TEXT}">${label}</text>`;
  return s;
}

function obmcVArrow(x, y1, y2) {
  return (
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${OBMC_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x - 5},${y2 - 6} ${x + 5},${y2 - 6} ${x},${y2}" fill="${OBMC_ARROW}"></polygon>`
  );
}

function obmcHArrow(x1, y, x2) {
  const dir = x2 >= x1 ? 1 : -1;
  return (
    `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${OBMC_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x2 - dir * 7},${y - 5} ${x2 - dir * 7},${y + 5} ${x2},${y}" fill="${OBMC_ARROW}"></polygon>`
  );
}

function obmcFrame(viewW, viewH, title, subtitle, body, ariaLabel) {
  return (
    `<div style="overflow-x:auto; margin:1rem 0; padding:1rem; background:${OBMC_BG}; ` +
    `border:1px solid #30363d; border-radius:8px;">` +
    `<div style="text-align:center; font-weight:700; font-size:1.05rem; color:#58a6ff; margin-bottom:0.25rem;">${title}</div>` +
    `<div style="text-align:center; font-size:0.85rem; color:#8b949e; margin-bottom:0.75rem;">${subtitle}</div>` +
    `<svg viewBox="0 0 ${viewW} ${viewH}" width="100%" role="img" aria-label="${ariaLabel}">${body}</svg>` +
    `</div>`
  );
}

// Diagram A: OpenBMC software stack — kernel+drivers -> D-Bus/phosphor ->
// northbound Redfish(bmcweb)/IPMI/PLDM.
function obmcStackSVG() {
  const w = 760, boxX = 130, boxW = 500, h = 54, gap = 30;
  const layers = [
    { l: "Northbound APIs: Redfish (bmcweb) / IPMI / PLDM", n: "remote admin & orchestration talk to the BMC" },
    { l: "phosphor services (D-Bus objects & properties)", n: "sensors, inventory, logs, power, LEDs, fans" },
    { l: "systemd + D-Bus message bus", n: "the backbone that wires services together" },
    { l: "Linux kernel + drivers (hwmon, GPIO, I2C/I3C)", n: "southbound access to real hardware" },
  ];
  let body = "";
  const topY = 20;
  layers.forEach((s, i) => {
    const y = topY + i * (h + gap);
    const cy = y + h / 2;
    body += obmcBox(boxX, y, boxW, h, s.l, i + 1);
    body +=
      `<text x="${boxX + boxW + 12}" y="${cy + 4}" font-family="sans-serif" ` +
      `font-size="10.5" fill="${OBMC_NOTE}">${s.n}</text>`;
    if (i < layers.length - 1)
      body += obmcVArrow(boxX + boxW / 2, y + h, y + h + gap);
  });
  body +=
    `<text x="20" y="${topY + h / 2 + 4}" font-family="sans-serif" font-size="10.5" fill="${OBMC_NOTE}">remote</text>` +
    `<text x="20" y="${topY + 3 * (h + gap) + h / 2 + 4}" font-family="sans-serif" font-size="10.5" fill="${OBMC_NOTE}">hardware</text>`;
  const vh = topY + layers.length * (h + gap) + 6;
  return obmcFrame(
    w, vh,
    "OpenBMC Software Stack — D-Bus at the Centre",
    "Northbound APIs (1) sit on top of phosphor D-Bus services (2); the systemd + D-Bus bus (3) is the backbone; the Linux kernel and drivers (4) reach the real hardware",
    body,
    "OpenBMC software stack, layered top to bottom. At the top are northbound APIs: Redfish served by bmcweb, legacy IPMI and PLDM, which remote administrators and orchestration use. Below them the phosphor family of services models management state as D-Bus objects and properties: sensors, inventory, event logs, power and boot state, LEDs and fan control. Beneath that, systemd and the D-Bus message bus form the backbone that wires the services together. At the bottom, the Linux kernel and its drivers — hwmon for sensors, GPIO and I2C or I3C — provide southbound access to the real hardware."
  );
}

// Diagram B: telemetry flow — hwmon read -> D-Bus property -> Redfish/IPMI
// exposure to a remote admin.
function obmcFlowSVG() {
  const w = 760, boxW = 150, h = 70;
  let body = "";
  const topY = 60;
  const steps = [
    { l1: "hwmon sysfs", l2: "kernel reads sensor" },
    { l1: "D-Bus sensor", l2: "phosphor property +" },
    { l1: "northbound API", l2: "bmcweb / IPMI maps" },
    { l1: "remote admin", l2: "reads value / alerts" },
  ];
  const xs = [20, 210, 400, 590];
  steps.forEach((s, i) => {
    const x = xs[i];
    body += obmcBox(x, topY, boxW, h, "", i + 1);
    const cx = x + boxW / 2 + 10;
    body +=
      `<text x="${cx}" y="${topY + 30}" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="${OBMC_TEXT}">${s.l1}</text>` +
      `<text x="${cx}" y="${topY + 50}" text-anchor="middle" font-family="sans-serif" font-size="10" fill="${OBMC_TEXT}">${s.l2}</text>`;
    if (i < steps.length - 1) body += obmcHArrow(x + boxW, topY + h / 2, xs[i + 1]);
  });
  body +=
    `<text x="95" y="40" text-anchor="middle" font-family="sans-serif" font-size="10" fill="${OBMC_NOTE}">temperature / fan / voltage</text>` +
    `<text x="285" y="155" text-anchor="middle" font-family="sans-serif" font-size="10" fill="${OBMC_NOTE}">PropertiesChanged signal broadcast</text>` +
    `<text x="665" y="155" text-anchor="middle" font-family="sans-serif" font-size="10" fill="${OBMC_NOTE}">over the management network</text>`;
  return obmcFrame(
    w, 180,
    "Telemetry Flow — From hwmon to a Remote Admin",
    "A kernel hwmon read (1) becomes a D-Bus sensor property (2); a northbound API (3) maps it to Redfish or IPMI so a remote admin (4) can read it — the property update is broadcast as a PropertiesChanged signal",
    body,
    "Telemetry flow, left to right. First the Linux kernel reads a sensor such as temperature, fan speed or voltage through the hwmon sysfs interface. A phosphor service turns that reading into a D-Bus sensor property and broadcasts a PropertiesChanged signal when it updates. A northbound API, bmcweb for Redfish or the IPMI daemon, maps the D-Bus property to its protocol. Finally a remote administrator reads the value or receives alerts over the management network."
  );
}

const TOPIC_OPENBMC = {
  "id": "openbmc",
  "category": "ocp",
  "icon": "🖲️",
  "title": "OpenBMC: The Open-Source BMC Firmware Stack",
  "description": "What a BMC (Baseboard Management Controller) is and why out-of-band management matters, and what OpenBMC is: a Yocto-built open-source Linux distribution for embedded management controllers, governed as a Linux Foundation project. Covers the D-Bus / phosphor software architecture, northbound Redfish (bmcweb), IPMI and PLDM/MCTP interfaces, southbound hwmon/GPIO/I2C-I3C drivers, key capabilities, how it runs on a DC-SCM, and how it is built with Yocto layers",
  "keywords": [
    "openbmc", "bmc", "baseboard management controller", "out-of-band",
    "oob management", "ocp", "open compute project", "linux foundation",
    "yocto", "openembedded", "bitbake", "d-bus", "dbus", "phosphor",
    "bmcweb", "redfish", "ipmi", "pldm", "mctp", "hwmon", "sensors",
    "fan control", "thermal", "power control", "sel", "event log",
    "firmware update", "kvm", "serial over lan", "fru", "inventory",
    "peci", "espi", "systemd", "meta-layer", "dc-scm", "i3c"
  ],
  "sections": [
    {
      "title": "1. What a BMC Is",
      "content": `<p>A <strong>BMC (Baseboard Management Controller)</strong> is a small, always-on management processor that lives alongside the main server hardware. Its job is <strong>out-of-band (OOB) management</strong>: it can <em>monitor, configure, diagnose, recover and power-cycle</em> the host <strong>independently of the host operating system</strong> — even when the host is powered off or hung.</p>
<p>That independence is the whole value. If the host OS crashes, or a technician needs to reinstall it remotely, or a sensor must be read while the machine is in standby, the BMC is still up and reachable over the management network. On modern OCP hardware the BMC commonly lives on the <strong>DC-SCM</strong> (see the companion <em>DC-SCM</em> topic), which gathers the management and security hardware onto a pluggable module.</p>`
    },
    {
      "title": "2. What OpenBMC Is",
      "content": `<p><strong>OpenBMC</strong> is a free, open-source <strong>Linux distribution</strong> built specifically for embedded management controllers — the BMCs found in servers, top-of-rack (ToR) switches and RAID/storage appliances. Rather than a single firmware blob, it is a full Linux system: a kernel plus a userspace of management services.</p>
<ul>
<li><strong>Built with Yocto / OpenEmbedded</strong> — OpenBMC is assembled with the <a href="https://www.openbmc.org/" target="_blank">Yocto Project</a> build system, so each machine image is a customized embedded Linux build.</li>
<li><strong>Linux Foundation project</strong> — it is governed as a Linux Foundation project with heavy involvement from OCP members and hyperscalers, which is why it shows up throughout the OCP hardware ecosystem.</li>
<li><strong>Ships a kernel + management userspace</strong> — the Linux kernel provides hardware access; the userspace provides the sensors, logging, power control and remote APIs that make it a BMC.</li>
</ul>
<p>The reference sources are the project's <a href="https://github.com/openbmc/openbmc" target="_blank">GitHub repository</a> and <a href="https://github.com/openbmc/docs" target="_blank">documentation</a>.</p>`
    },
    {
      "title": "3. Architecture — D-Bus & phosphor",
      "content": `<p>The heart of OpenBMC is its <strong>software architecture</strong>, and that architecture is built around <strong>D-Bus</strong>. On top of a Linux kernel and <code>systemd</code>, a <strong>D-Bus message bus</strong> acts as the backbone that connects all the management services.</p>
<p>Management state is modeled as <strong>D-Bus objects</strong>. The <strong>"phosphor"</strong> family of services exposes sensors, inventory, event logs, power and boot state, LEDs and fan control as D-Bus <em>objects</em> with <em>properties</em>, and broadcasts <code>PropertiesChanged</code> signals when a value updates. Any other service — including the northbound API servers — can read a property or subscribe to its changes without talking to hardware directly.</p>
${obmcStackSVG()}
<p>This decoupling is what makes OpenBMC extensible: a new sensor source or a new remote API is just another D-Bus participant.</p>`
    },
    {
      "title": "4. Northbound & Southbound Interfaces",
      "content": `<p>Around the D-Bus core, OpenBMC has two faces.</p>
<h4>Northbound (toward remote administrators)</h4>
<ul>
<li><strong>Redfish</strong> — the DMTF REST/JSON management standard, served by <strong>bmcweb</strong>. This is the modern primary interface.</li>
<li><strong>IPMI</strong> — the legacy management protocol, still supported for compatibility.</li>
<li><strong>PLDM / MCTP</strong> — platform-level data and transport used to talk to other management endpoints.</li>
</ul>
<h4>Southbound (toward hardware)</h4>
<ul>
<li>Linux kernel drivers feed the D-Bus services: <strong>hwmon</strong> for sensors, <strong>GPIO</strong> for discrete signals, and <strong>I2C / I3C</strong> for device buses (see the site's <em>I2C/I3C</em> and <em>I3C drivers</em> topics).</li>
</ul>
<p>A northbound request for a sensor value is answered from a D-Bus property that a southbound driver populated — the two faces never touch directly, they meet on D-Bus.</p>`
    },
    {
      "title": "5. Telemetry & Control Flow",
      "content": `<p>Putting sections 3 and 4 together, here is how a single sensor reading travels from silicon to a remote console:</p>
${obmcFlowSVG()}
<p>The kernel reads the physical sensor through <strong>hwmon</strong>; a phosphor service publishes it as a <strong>D-Bus property</strong> and emits a <code>PropertiesChanged</code> signal; <strong>bmcweb</strong> (Redfish) or the IPMI daemon maps that property to its protocol; and a remote administrator reads the value or receives an alert. Control flows the same way in reverse — a Redfish power-on request becomes a D-Bus method call that a service turns into GPIO/sequencing actions.</p>`
    },
    {
      "title": "6. Key Capabilities",
      "content": `<p>A production OpenBMC image typically provides:</p>
<ul>
<li><strong>Sensor telemetry</strong> — temperatures, voltages, currents, fan speeds.</li>
<li><strong>Thermal / fan control</strong> — closed-loop fan management from sensor inputs.</li>
<li><strong>Power sequencing &amp; host power control</strong> — power on/off/cycle and ordered rail sequencing.</li>
<li><strong>Boot-progress tracking</strong> — observing where the host is in its boot.</li>
<li><strong>Event / error logging</strong> — including the IPMI <strong>SEL</strong> (System Event Log).</li>
<li><strong>Firmware update</strong> — of the BMC's own image and of host BIOS.</li>
<li><strong>KVM &amp; serial-over-LAN</strong> — remote keyboard/video/mouse and console.</li>
<li><strong>FRU / inventory</strong> — reading field-replaceable-unit identity data.</li>
</ul>`
    },
    {
      "title": "7. How It Ties to the Hardware",
      "content": `<p>OpenBMC runs <strong>on the BMC</strong>, which on OCP platforms commonly sits on a <strong>DC-SCM</strong> (see the <em>DC-SCM</em> topic). From there it reaches the host over the management interfaces carried across the DC-SCI, including:</p>
<ul>
<li><strong>I2C / I3C</strong> — sensor and device buses (see the <em>I3C drivers</em> topic for the kernel side of I3C).</li>
<li><strong>eSPI</strong> — the host-to-BMC enhanced serial peripheral interface.</li>
<li><strong>PLDM / MCTP</strong> — management messaging to other endpoints.</li>
<li><strong>PECI</strong> — the platform environment control interface for CPU telemetry.</li>
</ul>
<p>So the DC-SCM provides the hardware home and the physical paths to the host; OpenBMC is the software that drives them.</p>`
    },
    {
      "title": "8. Build & Customize (Yocto Layers)",
      "content": `<p>Because OpenBMC is a Yocto/OpenEmbedded distribution, porting it to a new machine is mostly a matter of <strong>layers</strong> and <strong>machine configuration</strong>:</p>
<ul>
<li><strong><code>meta-&lt;vendor&gt;</code> / <code>meta-&lt;machine&gt;</code> layers</strong> hold the board-specific recipes, device tree and configuration for a given platform.</li>
<li><strong><code>bitbake</code></strong> builds an image for a selected <em>machine</em> configuration, pulling in the common OpenBMC recipes plus the board layer.</li>
</ul>
<pre><code># conceptual: select a machine and build an image
MACHINE=&lt;your-machine&gt; bitbake obmc-phosphor-image</code></pre>
<p>At a high level, the common phosphor/bmcweb/IPMI stack is shared, and the per-board layer supplies what is unique — which sensors exist, how fans are wired, which GPIOs control power. That is how one codebase supports many different server boards.</p>`
    },
    {
      "title": "9. References & Further Reading",
      "content": `<ul>
<li><a href="https://github.com/openbmc/openbmc" target="_blank">OpenBMC on GitHub</a> — the main repository.</li>
<li><a href="https://github.com/openbmc/docs" target="_blank">OpenBMC documentation</a>.</li>
<li><a href="https://github.com/openbmc/docs/blob/master/architecture/sensor-architecture.md" target="_blank">OpenBMC sensor architecture</a> — how sensors become D-Bus objects.</li>
<li><a href="https://www.openbmc.org/" target="_blank">OpenBMC project site</a>.</li>
</ul>
<p>Related topics on this site: <em>DC-SCM</em> (the module OpenBMC runs on), <em>OCP Modular Hardware</em> (the larger picture), and <em>I3C drivers</em> (a southbound bus).</p>`
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) { module.exports = TOPIC_OPENBMC; }
