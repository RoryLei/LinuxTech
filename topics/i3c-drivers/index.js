/**
 * Topic: I3C Drivers
 */

/* Accessible palette (declared BEFORE use so the SVG helpers below are
 * initialized before the topic object literal calls them — avoids a
 * temporal-dead-zone ReferenceError at load time). ONE neutral-blue hue
 * for every box (#cfe3ff fill, #1f2d3d stroke) on a #0d1117 background.
 * Element identity is carried by NUMBER badges + position + shape + text,
 * never by hue. No red/green/yellow conveys meaning. Table borders #30363d. */
const I3C_BOX_FILL = "#cfe3ff";
const I3C_BOX_STROKE = "#1f2d3d";
const I3C_TEXT = "#0f172a";
const I3C_NOTE = "#c9d4e0";
const I3C_ARROW = "#9db4cc";
const I3C_BG = "#0d1117";

/* =====================================================================
 * Accessible inline SVG diagram helpers. Single blue fill, numbered
 * circle badges, arrows, diamond decision shapes, high-contrast text —
 * mirrors the ocp-diag / irq-domain / regmap visual style. Meaning is
 * carried by badge number + position + shape + text, never by colour.
 * =================================================================== */

// Centred-label box with an optional numbered badge.
function i3cBox(x, y, w, h, label, badge) {
  const cy = y + h / 2;
  const r = 13;
  let s =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ` +
    `fill="${I3C_BOX_FILL}" stroke="${I3C_BOX_STROKE}" stroke-width="1.5"></rect>`;
  if (badge !== undefined) {
    s +=
      `<circle cx="${x + r + 4}" cy="${cy}" r="${r}" fill="${I3C_BOX_STROKE}"></circle>` +
      `<text x="${x + r + 4}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="13" font-weight="700" fill="#ffffff">${badge}</text>`;
  }
  const tx = badge !== undefined ? x + r + 4 + (w - r - 4) / 2 : x + w / 2;
  s +=
    `<text x="${tx}" y="${cy + 5}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="13.5" font-weight="600" fill="${I3C_TEXT}">${label}</text>`;
  return s;
}

// A box with left-aligned text (used for wide flow-step boxes).
function i3cStepBox(x, y, w, h, label, badge) {
  const cy = y + h / 2;
  const r = 13;
  let s =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ` +
    `fill="${I3C_BOX_FILL}" stroke="${I3C_BOX_STROKE}" stroke-width="1.5"></rect>`;
  if (badge !== undefined) {
    s +=
      `<circle cx="${x + r + 4}" cy="${cy}" r="${r}" fill="${I3C_BOX_STROKE}"></circle>` +
      `<text x="${x + r + 4}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="13" font-weight="700" fill="#ffffff">${badge}</text>`;
  }
  s +=
    `<text x="${x + (badge !== undefined ? r + 24 : 14)}" y="${cy + 4}" ` +
    `font-family="sans-serif" font-size="12.5" fill="${I3C_TEXT}">${label}</text>`;
  return s;
}

// A diamond decision node (shape, not colour, carries the "decision" meaning).
function i3cDiamond(cx, cy, halfW, halfH, label, badge) {
  let s =
    `<polygon points="${cx},${cy - halfH} ${cx + halfW},${cy} ${cx},${cy + halfH} ${cx - halfW},${cy}" ` +
    `fill="${I3C_BOX_FILL}" stroke="${I3C_BOX_STROKE}" stroke-width="1.5"></polygon>`;
  if (badge !== undefined) {
    const r = 12;
    s +=
      `<circle cx="${cx - halfW + r + 2}" cy="${cy}" r="${r}" fill="${I3C_BOX_STROKE}"></circle>` +
      `<text x="${cx - halfW + r + 2}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="12" font-weight="700" fill="#ffffff">${badge}</text>`;
  }
  s +=
    `<text x="${cx + (badge !== undefined ? 8 : 0)}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="12" font-weight="600" fill="${I3C_TEXT}">${label}</text>`;
  return s;
}

function i3cVArrow(x, y1, y2) {
  return (
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${I3C_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x - 5},${y2 - 6} ${x + 5},${y2 - 6} ${x},${y2}" fill="${I3C_ARROW}"></polygon>`
  );
}

function i3cHArrow(x1, y, x2) {
  const dir = x2 >= x1 ? 1 : -1;
  return (
    `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${I3C_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x2 - dir * 7},${y - 5} ${x2 - dir * 7},${y + 5} ${x2},${y}" fill="${I3C_ARROW}"></polygon>`
  );
}

function i3cFrame(viewW, viewH, title, subtitle, body, ariaLabel) {
  return (
    `<div style="overflow-x:auto; margin:1rem 0; padding:1rem; background:${I3C_BG}; ` +
    `border:1px solid #30363d; border-radius:8px;">` +
    `<div style="text-align:center; font-weight:700; font-size:1.05rem; color:#58a6ff; margin-bottom:0.25rem;">${title}</div>` +
    `<div style="text-align:center; font-size:0.85rem; color:#8b949e; margin-bottom:0.75rem;">${subtitle}</div>` +
    `<svg viewBox="0 0 ${viewW} ${viewH}" width="100%" role="img" aria-label="${ariaLabel}">${body}</svg>` +
    `</div>`
  );
}

// Diagram A: I3C SUBSYSTEM LAYERING — vertical numbered stack from the
// device driver down to the target devices on the two-wire bus.
function i3cSubsystemLayeringSVG() {
  const w = 780, boxW = 460, boxX = 170, h = 50, gap = 26;
  const layers = [
    { l: "Your I3C device driver (struct i3c_driver)", n: "probe/remove, private xfers, IBI handler" },
    { l: "I3C core (drivers/i3c/)", n: "bus & device model, DAA, CCC engine, IBI dispatch" },
    { l: "Master controller driver (i3c_master_controller_ops)", n: "drivers/i3c/master/: cdns-i3c, dw-i3c-master, MIPI HCI" },
    { l: "Controller hardware", n: "DAA/CCC/SDR/HDR, IBI capture, arbitration logic" },
    { l: "Two-wire I3C bus (SDA / SCL)", n: "shared open-drain + push-pull signalling" },
    { l: "Target device(s)", n: "I3C targets (+ optional legacy I2C devices)" },
  ];
  let body = "";
  const topY = 18;
  layers.forEach((s, i) => {
    const y = topY + i * (h + gap);
    const cy = y + h / 2;
    body += i3cBox(boxX, y, boxW, h, s.l, i + 1);
    body +=
      `<text x="${boxX + boxW + 12}" y="${cy + 4}" font-family="sans-serif" ` +
      `font-size="11" fill="${I3C_NOTE}">${s.n}</text>`;
    if (i < layers.length - 1)
      body += i3cVArrow(boxX + boxW / 2, y + h, y + h + gap);
  });
  const vh = topY + layers.length * (h + gap) + 6;
  return i3cFrame(
    w, vh,
    "Diagram A — I3C Subsystem Layering (controller side)",
    "Your driver (1) sits on the I3C core (2); the core drives the master controller driver (3) and its hardware (4), which runs the two-wire bus (5) down to the target devices (6)",
    body,
    "Vertical layered stack of the I3C subsystem. From top to bottom: layer 1 your I3C device driver using struct i3c_driver; layer 2 the I3C core under drivers slash i3c providing the bus and device model, dynamic address assignment, the common command code engine and in-band interrupt dispatch; layer 3 the master controller driver implementing i3c_master_controller_ops, with vendor examples cdns-i3c, dw-i3c-master and the MIPI I3C HCI controller; layer 4 the controller hardware; layer 5 the two-wire I3C bus carrying SDA and SCL; layer 6 the target devices plus optional legacy I2C devices. Arrows connect each layer downward."
  );
}

// Diagram B: IBI END-TO-END DELIVERY FLOW — top-to-bottom numbered flow
// with an address-arbitration decision diamond (lower address wins; losers
// retry), through pool-slot capture, queue, core match, workqueue handler,
// and slot recycle.
function i3cIbiFlowSVG() {
  const w = 760;
  const colX = 150, boxW = 460;
  let body = "";
  const steps = [
    "Target drives its own dynamic address in an arbitrable window",
  ];
  // step 1 box
  const h = 46, gap = 30;
  let y = 16;
  body += i3cStepBox(colX, y, boxW, h, steps[0], 1);
  const midX = colX + boxW / 2;
  // arrow to decision
  body += i3cVArrow(midX, y + h, y + h + gap);
  // decision diamond (arbitration)
  const dY = y + h + gap;
  const dCy = dY + 34;
  body += i3cDiamond(midX, dCy, 150, 34, "Bus arbitration", 2);
  body +=
    `<text x="${midX}" y="${dCy + 22}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="10.5" fill="${I3C_TEXT}">lower address wins</text>`;
  // loser retry side-label (text + shape, no colour)
  body +=
    `<text x="${midX + 170}" y="${dCy - 2}" font-family="sans-serif" font-size="11" ` +
    `fill="${I3C_NOTE}">losers back off</text>` +
    `<text x="${midX + 170}" y="${dCy + 14}" font-family="sans-serif" font-size="11" ` +
    `fill="${I3C_NOTE}">and retry next window</text>`;
  // retry arrow curving back up (dashed line + arrowhead to step 1)
  body +=
    `<path d="M ${midX + 150} ${dCy} H ${colX + boxW + 60} V ${y + h / 2} H ${colX + boxW}" ` +
    `fill="none" stroke="${I3C_ARROW}" stroke-width="1.6" stroke-dasharray="5 4"></path>` +
    `<polygon points="${colX + boxW + 6},${y + h / 2 - 5} ${colX + boxW + 6},${y + h / 2 + 5} ${colX + boxW},${y + h / 2}" fill="${I3C_ARROW}"></polygon>`;
  // continue down the main path: winner
  const restSteps = [
    "Winner identified by its address → controller HW captures the IBI and mandatory data byte(s) into a FREE pool slot (i3c_generic_ibi_get_free_slot)",
    "Controller hands the slot to the core: i3c_master_queue_ibi(dev, slot)",
    "Core matches the arbitrated address to the owning i3c_dev_desc",
    "Owning device's IBI handler runs in WORKQUEUE context (may sleep / do private transfers)",
    "Slot recycled: i3c_generic_ibi_recycle_slot() via ops->recycle_ibi()",
  ];
  let cursorY = dCy + 34 + gap;
  const sh = 52;
  restSteps.forEach((label, i) => {
    body += i3cVArrow(midX, cursorY - gap, cursorY);
    body += i3cStepBoxWrapped(colX, cursorY, boxW, sh, label, i + 3);
    cursorY += sh;
    if (i < restSteps.length - 1) cursorY += gap;
  });
  const vh = cursorY + 10;
  return i3cFrame(
    w, vh,
    "Diagram B — IBI End-to-End Delivery Flow",
    "A target asserts its address (1); open-drain arbitration picks the lower address as winner (2) while losers retry; the controller captures the IBI into a pool slot (3), queues it (4), the core matches the owner (5), the handler runs in workqueue context (6), and the slot is recycled (7)",
    body,
    "Top-to-bottom flow chart of in-band interrupt delivery. Step 1: a target drives its own dynamic address during an arbitrable window. Step 2 is a diamond decision node for open-drain bus arbitration where the lower address wins deterministically and losing targets back off and retry on the next window, shown by a dashed arrow returning to step 1. Step 3: the winning controller hardware captures the in-band interrupt and its mandatory data bytes into a free pool slot obtained from i3c_generic_ibi_get_free_slot. Step 4: the controller hands the slot to the core via i3c_master_queue_ibi. Step 5: the core matches the arbitrated address to the owning i3c_dev_desc. Step 6: the owning device's in-band interrupt handler runs in workqueue context and may sleep or perform private transfers. Step 7: the slot is recycled through i3c_generic_ibi_recycle_slot via the ops recycle_ibi callback."
  );
}

// A wide step box whose label wraps onto up to two lines (used by Diagram B).
function i3cStepBoxWrapped(x, y, w, h, label, badge) {
  const cy = y + h / 2;
  const r = 13;
  let s =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ` +
    `fill="${I3C_BOX_FILL}" stroke="${I3C_BOX_STROKE}" stroke-width="1.5"></rect>`;
  s +=
    `<circle cx="${x + r + 4}" cy="${cy}" r="${r}" fill="${I3C_BOX_STROKE}"></circle>` +
    `<text x="${x + r + 4}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="13" font-weight="700" fill="#ffffff">${badge}</text>`;
  // naive word wrap into two lines
  const words = label.split(" ");
  const lines = ["", ""];
  const maxChars = Math.floor((w - r - 40) / 6.4);
  let li = 0;
  words.forEach((wd) => {
    if (li === 0 && (lines[0] + " " + wd).trim().length > maxChars) li = 1;
    lines[li] = (lines[li] + " " + wd).trim();
  });
  const tx = x + r + 24;
  if (lines[1]) {
    s +=
      `<text x="${tx}" y="${cy - 3}" font-family="sans-serif" font-size="11.5" fill="${I3C_TEXT}">${lines[0]}</text>` +
      `<text x="${tx}" y="${cy + 14}" font-family="sans-serif" font-size="11.5" fill="${I3C_TEXT}">${lines[1]}</text>`;
  } else {
    s +=
      `<text x="${tx}" y="${cy + 4}" font-family="sans-serif" font-size="11.5" fill="${I3C_TEXT}">${lines[0]}</text>`;
  }
  return s;
}

// Diagram C: IBI TAXONOMY — one arbitration source branching to three
// numbered outcomes. Branch identity is badge + text only (no colour).
function i3cIbiTaxonomySVG() {
  const w = 780, vh = 360;
  let body = "";
  const srcX = 240, srcY = 20, srcW = 300, srcH = 52;
  body += i3cStepBox(srcX, srcY, srcW, srcH, "A device asserts an IBI via address arbitration", undefined);
  const srcMidX = srcX + srcW / 2;
  const srcBottom = srcY + srcH;
  // three columns of outcomes
  const colW = 230, colGap = 28;
  const totalW = colW * 3 + colGap * 2;
  const startX = (w - totalW) / 2;
  const colY = 150;
  const cols = [
    { badge: 1, head: "Target interrupt", steps: ["Run the owning device's IBI handler", "(common case, see section 6)"] },
    { badge: 2, head: "Hot-join", steps: ["Controller runs DAA for the newcomer", "→ core probe() the new device"] },
    { badge: 3, head: "Controller-role request", steps: ["Secondary controller asks for the bus", "→ defined mastership handover"] },
  ];
  // vertical drop from source to a horizontal bus line
  const busY = colY - 40;
  body += i3cVArrow(srcMidX, srcBottom, busY - 18);
  cols.forEach((c, i) => {
    const cx = startX + i * (colW + colGap) + colW / 2;
    // horizontal connector from source centre to this column top, then down
    body +=
      `<line x1="${srcMidX}" y1="${busY}" x2="${cx}" y2="${busY}" stroke="${I3C_ARROW}" stroke-width="2"></line>` +
      `<line x1="${cx}" y1="${busY}" x2="${cx}" y2="${colY}" stroke="${I3C_ARROW}" stroke-width="2"></line>` +
      `<polygon points="${cx - 5},${colY - 6} ${cx + 5},${colY - 6} ${cx},${colY}" fill="${I3C_ARROW}"></polygon>`;
    // outcome head box with badge
    body += i3cBox(startX + i * (colW + colGap), colY, colW, 48, c.head, c.badge);
    // detail lines below
    let dy = colY + 48 + 26;
    body += i3cVArrow(cx, colY + 48, colY + 48 + 26);
    c.steps.forEach((line, j) => {
      body +=
        `<text x="${cx}" y="${dy + j * 20}" text-anchor="middle" font-family="sans-serif" ` +
        `font-size="11.5" fill="${I3C_NOTE}">${line}</text>`;
    });
  });
  // connect source horizontal bar origin
  body +=
    `<line x1="${srcMidX}" y1="${busY - 18}" x2="${srcMidX}" y2="${busY}" stroke="${I3C_ARROW}" stroke-width="2"></line>`;
  return i3cFrame(
    w, vh,
    "Diagram C — IBI Taxonomy (three purposes, one arbitration)",
    "The same in-band arbitration serves three outcomes, distinguished by the arbitrating address/request type: (1) a target interrupt, (2) a hot-join, or (3) a controller-role request",
    body,
    "Branching diagram of the three in-band interrupt purposes. A single source at the top reads: a device asserts an in-band interrupt via address arbitration. It branches to three numbered outcomes. Outcome 1, target interrupt: run the owning device's in-band interrupt handler, the common case from section 6. Outcome 2, hot-join: the controller runs dynamic address assignment for the newcomer and the core probes the new device. Outcome 3, controller-role request: a secondary controller asks for the bus and a defined mastership handover follows. Branches are distinguished by numbered badges and text labels, not by colour."
  );
}

// Diagram D: IBI LIFECYCLE — device-side calls paired to controller ops.
function i3cIbiLifecycleSVG() {
  const w = 760, h = 46, gap = 26;
  const leftX = 60, rightX = 420, boxW = 280;
  const pairs = [
    ["i3c_device_request_ibi()", "ops->request_ibi()  (alloc HW slots / pool)"],
    ["i3c_device_enable_ibi()", "ops->enable_ibi()   (arm reception)"],
    ["i3c_device_disable_ibi()", "ops->disable_ibi()  (mask reception)"],
    ["i3c_device_free_ibi()", "ops->free_ibi()     (release resources)"],
  ];
  let body = "";
  const topY = 46;
  // column headers
  body +=
    `<text x="${leftX + boxW / 2}" y="26" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="12.5" font-weight="700" fill="${I3C_NOTE}">Device-side call</text>` +
    `<text x="${rightX + boxW / 2}" y="26" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="12.5" font-weight="700" fill="${I3C_NOTE}">Core invokes controller op</text>`;
  pairs.forEach((p, i) => {
    const y = topY + i * (h + gap);
    body += i3cStepBox(leftX, y, boxW, h, p[0], i + 1);
    body += i3cStepBox(rightX, y, boxW, h, p[1], undefined);
    body += i3cHArrow(leftX + boxW, y + h / 2, rightX);
  });
  // recycle note spanning the bottom
  const recY = topY + pairs.length * (h + gap);
  body +=
    `<text x="${w / 2}" y="${recY + 6}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="11.5" fill="${I3C_NOTE}">Per-IBI runtime: core calls ops->recycle_ibi() to return each slot to the pool after the handler finishes.</text>`;
  const vh = recY + 20;
  return i3cFrame(
    w, vh,
    "Diagram D — IBI Lifecycle (device call → controller op)",
    "Each device-side IBI call (left, numbered) is turned by the core into the matching controller op (right): request_ibi, enable_ibi, disable_ibi, free_ibi — with recycle_ibi returning slots at runtime",
    body,
    "Two-column pairing diagram. Each numbered device-side call on the left maps by a horizontal arrow to the controller operation the core invokes on the right. Row 1: i3c_device_request_ibi maps to ops request_ibi, which allocates hardware slots or the pool. Row 2: i3c_device_enable_ibi maps to ops enable_ibi, arming reception. Row 3: i3c_device_disable_ibi maps to ops disable_ibi, masking reception. Row 4: i3c_device_free_ibi maps to ops free_ibi, releasing resources. A footnote notes that at runtime the core calls ops recycle_ibi to return each slot to the pool after the handler finishes."
  );
}

const TOPIC_I3C_DRIVERS = {
  "id": "i3c-drivers",
  "category": "drivers",
  "icon": "🪝",
  "title": "I3C Drivers",
  "description": "Writing Linux I3C device drivers — the I3C subsystem, dynamic address assignment (DAA), driver binding by PID, private transfers, CCC commands, In-Band Interrupts (IBI) & hot-join, with flow charts throughout",
  "keywords": [
    "i3c driver", "i3c", "i3c_driver", "i3c_device", "mipi", "daa",
    "dynamic address assignment", "pid", "provisional id", "bcr", "dcr",
    "ccc", "common command code", "ibi", "in-band interrupt", "hot-join",
    "i3c_device_do_priv_xfers", "i3c_device_request_ibi", "master controller",
    "static address", "regmap i3c", "probe", "legacy i2c", "sdr", "hdr"
  ],
  "sections": [
    {
      "title": "1. I3C in Linux: Why a New Subsystem",
      "content": "<p>This is the <strong>driver author's</strong> view of I3C — how to write a Linux driver for an I3C device. For the protocol/hardware comparison with I2C (speeds, DAA, IBI, hot-join concepts), see the <strong>I2C &amp; I3C</strong> topic; here we focus on the kernel code. If you know the <strong>I2C Drivers</strong> topic, this builds on it — I3C keeps a similar client-driver shape but adds dynamic addressing and richer bus features.</p><h4>What I3C adds over I2C (driver-relevant)</h4><table style=\"width:100%; border-collapse:collapse; margin:1rem 0;\"><tr style=\"border-bottom:1px solid #30363d;\"><th style=\"text-align:left; padding:0.5rem;\">Feature</th><th style=\"text-align:left; padding:0.5rem;\">Driver impact</th></tr><tr style=\"border-bottom:1px solid #30363d;\"><td style=\"padding:0.5rem;\"><strong>Dynamic address (DAA)</strong></td><td style=\"padding:0.5rem;\">Address is assigned at runtime, not fixed — you match by PID, not address</td></tr><tr style=\"border-bottom:1px solid #30363d;\"><td style=\"padding:0.5rem;\"><strong>In-Band Interrupt (IBI)</strong></td><td style=\"padding:0.5rem;\">No GPIO IRQ line — the device interrupts over the bus itself</td></tr><tr style=\"border-bottom:1px solid #30363d;\"><td style=\"padding:0.5rem;\"><strong>CCC commands</strong></td><td style=\"padding:0.5rem;\">Standard broadcast/direct commands the core issues for you</td></tr><tr style=\"border-bottom:1px solid #30363d;\"><td style=\"padding:0.5rem;\"><strong>Hot-join</strong></td><td style=\"padding:0.5rem;\">Devices can appear at runtime → probe later</td></tr><tr><td style=\"padding:0.5rem;\"><strong>Legacy I2C on same bus</strong></td><td style=\"padding:0.5rem;\">An I3C bus can carry old I2C devices too</td></tr></table><h4>The I3C subsystem architecture</h4><pre><code>┌───────────────────────────────────────────────────────────────┐\n│ YOUR I3C DEVICE DRIVER  (struct i3c_driver: probe, remove)      │\n│   private transfers, IBI handling; often via a regmap           │\n├───────────────────────────────────────────────────────────────┤\n│ I3C CORE  (drivers/i3c/)  DAA, device<->driver match by PID,     │\n│                           CCC engine, IBI dispatch, hot-join     │\n├───────────────────────────────────────────────────────────────┤\n│ I3C MASTER CONTROLLER DRIVER  (e.g. dw-i3c-master, cdns)        │\n│   runs DAA, does SDR/HDR transfers on the wire                  │\n├───────────────────────────────────────────────────────────────┤\n│ CONTROLLER HW  ──►  SDA / SCL  ──►  I3C targets (+ legacy I2C)  │\n└───────────────────────────────────────────────────────────────┘\n#\n# As with I2C, you write the top box (a device driver). The master\n# controller driver for your SoC already exists; the I3C core handles the\n# bus-management protocol (DAA/CCC/IBI) so your driver stays high-level.</code></pre>"
    },
    {
      "title": "2. Device Identity: PID, BCR, DCR",
      "content": "<p>Because I3C addresses are assigned dynamically, a device can't be identified by a fixed address like I2C. Instead each device has a permanent <strong>Provisioned ID (PID)</strong> plus characteristic bytes that describe what it is.</p><h4>The identity fields</h4><table style=\"width:100%; border-collapse:collapse; margin:1rem 0;\"><tr style=\"border-bottom:1px solid #30363d;\"><th style=\"text-align:left; padding:0.5rem;\">Field</th><th style=\"text-align:left; padding:0.5rem;\">Meaning</th></tr><tr style=\"border-bottom:1px solid #30363d;\"><td style=\"padding:0.5rem;\"><strong>PID</strong> (48-bit)</td><td style=\"padding:0.5rem;\">Provisioned ID: manufacturer ID + part ID + instance — the permanent identity used for matching</td></tr><tr style=\"border-bottom:1px solid #30363d;\"><td style=\"padding:0.5rem;\"><strong>BCR</strong></td><td style=\"padding:0.5rem;\">Bus Characteristics Register — capabilities (IBI support, HDR, etc.)</td></tr><tr style=\"border-bottom:1px solid #30363d;\"><td style=\"padding:0.5rem;\"><strong>DCR</strong></td><td style=\"padding:0.5rem;\">Device Characteristics Register — device type (accelerometer, etc.)</td></tr><tr><td style=\"padding:0.5rem;\">Dynamic address</td><td style=\"padding:0.5rem;\">Assigned during DAA — changes across boots; NOT used for matching</td></tr></table><h4>The driver ID table matches on PID</h4><pre><code>#include <linux/i3c/device.h>\n\nstatic const struct i3c_device_id my_i3c_ids[] = {\n    // Match a specific manufacturer + part number:\n    I3C_DEVICE(0x104 /*mfg id*/, 0x4210 /*part id*/, NULL /*driver data*/),\n    // Or match any device of a given DCR (device class):\n    // I3C_DEVICE_EXTRA_INFO(mfg, part, dcr, data),\n    { /* sentinel */ },\n};\nMODULE_DEVICE_TABLE(i3c, my_i3c_ids);\n\n# Contrast with I2C: there you match by a static 7-bit address / compatible\n# string; here you match by the device's PID components. The runtime address\n# is irrelevant to matching -- the core tracks it for you.</code></pre>"
    },
    {
      "title": "3. Dynamic Address Assignment (DAA)",
      "content": "<p><strong>DAA</strong> is the defining I3C bus event: the master discovers every target and hands each a unique <strong>dynamic address</strong>. This happens before your driver ever runs — but understanding it explains why binding works the way it does.</p><h4>DAA flow (run by the master + core)</h4><pre><code>bus initialization / hot-join\n   │\n   ▼\nmaster broadcasts ENTDAA (a CCC: \"Enter Dynamic Address Assignment\")\n   │\n   ▼\nall un-addressed targets drive their PID onto the bus\n   │\n   ▼  arbitration: LOWEST PID wins each round (like open-drain arbitration)\n   ▼\nmaster assigns the winner a dynamic address, reads its BCR/DCR\n   │\n   ▼  repeat until no targets remain un-addressed\n   ▼\nI3C core now has a table of {PID, dynamic addr, BCR, DCR} for each device\n   │\n   ▼\nfor each device: match PID against registered i3c_driver id_tables\n   │                                              │ no match\n   │ match                                         ▼\n   ▼                                        device left unbound\nyour_driver.probe(i3c_device)   ── you own the device</code></pre><h4>Binding: the whole picture</h4><pre><code># You never call DAA yourself. The sequence is:\n#   master controller runs DAA  ->  core builds the device list  ->\n#   core matches PID to your id_table  ->  core calls your probe().\n#\n# A device that HOT-JOINS later triggers DAA again for itself, and your\n# probe() runs at that point -- so drivers must handle devices appearing\n# at runtime, not only at boot.\n\n# A device may also have a STATIC address (e.g. an I2C-compatible chip);\n# the master can assign it a dynamic address via SETDASA instead of ENTDAA.</code></pre>"
    },
    {
      "title": "4. struct i3c_driver & probe()",
      "content": "<p>An I3C device driver mirrors the I2C shape: a <code>struct i3c_driver</code> with <code>probe</code>/<code>remove</code>, registered with a macro. In <code>probe()</code> you get an <code>i3c_device</code> handle.</p><h4>Declaring the driver</h4><pre><code>#include <linux/i3c/device.h>\n#include <linux/module.h>\n\nstatic int my_probe(struct i3c_device *i3cdev);\nstatic void my_remove(struct i3c_device *i3cdev);\n\nstatic struct i3c_driver my_driver = {\n    .driver = {\n        .name = \"accel3c\",\n    },\n    .id_table = my_i3c_ids,     // matches on PID (section 2)\n    .probe    = my_probe,\n    .remove   = my_remove,\n};\nmodule_i3c_driver(my_driver);   // registers on load, unregisters on unload\nMODULE_LICENSE(\"GPL\");</code></pre><h4>A worked probe</h4><pre><code>struct accel3c { struct i3c_device *i3cdev; /* + state */ };\n\nstatic int my_probe(struct i3c_device *i3cdev)\n{\n    struct accel3c *data;\n    struct i3c_device_info info;\n\n    data = devm_kzalloc(i3cdev_to_dev(i3cdev), sizeof(*data), GFP_KERNEL);\n    if (!data)\n        return -ENOMEM;\n    data->i3cdev = i3cdev;\n    i3cdev_set_drvdata(i3cdev, data);\n\n    // Inspect the device the core already characterized during DAA:\n    i3c_device_get_info(i3cdev, &info);\n    dev_info(i3cdev_to_dev(i3cdev),\n             \"bound: PID=%012llx dyn_addr=0x%02x BCR=0x%02x DCR=0x%02x\\n\",\n             info.pid, info.dyn_addr, info.bcr, info.dcr);\n\n    // ... read a WHOAMI register via a private transfer (section 5),\n    //     enable IBIs (section 6), register hwmon/iio, etc.\n    return 0;\n}\n\nstatic void my_remove(struct i3c_device *i3cdev)\n{\n    // disable IBIs, unregister upper interface...\n}</code></pre><p><strong>Note:</strong> there's no <code>client-&gt;addr</code> to hard-code — the address in <code>info.dyn_addr</code> was assigned by DAA and may differ each boot. Your logic uses register offsets and the <code>i3c_device</code> handle, never a literal address.</p>"
    },
    {
      "title": "5. Private Transfers & CCC Commands",
      "content": "<p>I3C has two flavors of communication: <strong>private transfers</strong> (device-specific register reads/writes, like I2C data) and <strong>CCC commands</strong> (standardized bus/device management the core mostly handles).</p><h4>Private transfers (your register access)</h4><pre><code>#include <linux/i3c/device.h>\n\n// Read register 0x0F: write the register pointer, then read the value.\nstatic int accel3c_read_reg(struct accel3c *d, u8 reg, u8 *val)\n{\n    struct i3c_priv_xfer xfers[] = {\n        { .rnw = false, .len = 1, .data.out = &reg },  // write reg pointer\n        { .rnw = true,  .len = 1, .data.in  = val },   // read the value\n    };\n    return i3c_device_do_priv_xfers(d->i3cdev, xfers, 2);\n}\n// rnw = \"read, not write\". Two xfers in ONE call = a repeated-start sequence,\n// exactly like the I2C write-then-read pattern (see the I2C Drivers topic).</code></pre><h4>Private-transfer flow</h4><pre><code>your driver ─► i3c_device_do_priv_xfers(dev, xfers, n)\n   │\n   ▼\nI3C core routes to the MASTER CONTROLLER driver for this bus\n   │\n   ▼\ncontroller performs SDR (or HDR) transfers on SDA/SCL to the dynamic addr\n   │\n   ▼\ndata returned into your buffers (or -errno on failure)</code></pre><h4>Regmap over I3C (recommended)</h4><pre><code>// As with I2C, prefer a regmap so you get caching/validation and bus-agnostic\n// register logic (see the Regmap topic):\n#include <linux/regmap.h>\nstruct regmap *rm = devm_regmap_init_i3c(i3cdev, &my_regmap_config);\nregmap_read(rm, REG_WHOAMI, &id);\nregmap_update_bits(rm, REG_CTRL, BIT(0), BIT(0));</code></pre><h4>CCC (Common Command Codes)</h4><pre><code># CCCs are standardized commands defined by the I3C spec -- ENTDAA, SETMRL\n# (max read length), GETMWL/GETMRL, ENEC/DISEC (enable/disable events like\n# IBIs), RSTDAA, etc. The CORE issues most of these for you as part of bus\n# management and IBI setup. A driver rarely sends raw CCCs itself; when it\n# must, it uses the master's CCC interface. Broadcast CCCs go to all devices;\n# direct CCCs target one dynamic address.</code></pre>"
    },
    {
      "title": "6. In-Band Interrupts (IBI) & Hot-Join",
      "content": "<p>I3C's headline feature for drivers: a device can raise an interrupt <strong>over the bus</strong> (an IBI) — no dedicated GPIO line. Your driver requests IBIs and gets a callback with the payload.</p><h4>Requesting IBIs in probe()</h4><pre><code>// 1. Describe how you want IBIs delivered:\nstatic void accel3c_ibi_handler(struct i3c_device *dev,\n                                const struct i3c_ibi_payload *payload)\n{\n    struct accel3c *d = i3cdev_get_drvdata(dev);\n    // payload->data / payload->len carry the mandatory data byte(s).\n    // Runs in a safe (sleepable) context -> you MAY do private transfers here.\n    /* read the data register, report upward ... */\n}\n\nstatic const struct i3c_ibi_setup ibi = {\n    .max_payload_len = 2,\n    .num_slots       = 4,\n    .handler         = accel3c_ibi_handler,\n};\n\n// 2. In probe(): request, then enable.\ni3c_device_request_ibi(i3cdev, &ibi);\ni3c_device_enable_ibi(i3cdev);\n// In remove(): i3c_device_disable_ibi(); i3c_device_free_ibi();</code></pre><h4>IBI delivery flow</h4>" + i3cIbiFlowSVG() + "<p>Short textual summary of the same path:</p><pre><code>device has data / event\n   │\n   ▼\ntarget issues an IBI on the bus (drives its address during bus-available)\n   │\n   ▼\nmaster controller accepts it, collects the mandatory data byte(s)\n   │\n   ▼\nI3C core matches the IBI to the owning device\n   │\n   ▼\nyour accel3c_ibi_handler(dev, payload) runs\n   │  (do private transfers to read more, report to input/iio/hwmon)\n   ▼\ndone -- no GPIO line was involved at any point\n#\n# Contrast with I2C (see I2C Drivers): there you wired client->irq to a GPIO\n# and used a threaded IRQ. I3C folds the interrupt INTO the bus protocol.</code></pre><h4>Hot-join</h4><pre><code># A device powered on after boot can HOT-JOIN: it signals the master, which\n# runs DAA for it, the core characterizes it and matches drivers -> your\n# probe() runs at runtime. Design drivers so nothing assumes \"all devices\n# exist at boot\"; the master can also be configured to accept/reject hot-join.</code></pre>"
    },
    {
      "title": "7. I3C Subsystem & IBI Architecture (Controller Side)",
      "content":
        "<p>Sections 1–6 took the <strong>device driver</strong> view. This section looks <em>down</em> the stack at how the kernel actually routes an IBI — the pieces a <strong>master controller driver</strong> implements and the core machinery it plugs into. You rarely write this layer (your SoC vendor does), but knowing it explains why your <code>i3c_device_request_ibi()</code>/<code>enable_ibi()</code> calls behave the way they do.</p>" +
        "<h4>Subsystem layering</h4>" +
        "<p>Five pieces cooperate, top to bottom. Your driver talks only to the top of this stack; everything below is the core plus the vendor controller driver.</p>" +
        i3cSubsystemLayeringSVG() +
        "<p>The <strong>master controller driver</strong> registers a <code>struct i3c_master_controller</code> and a <code>struct i3c_master_controller_ops</code>. Vendor drivers live under <code>drivers/i3c/master/</code> — for example Cadence <code>cdns-i3c</code>, Synopsys DesignWare <code>dw-i3c-master</code>, or a MIPI I3C HCI controller. The <strong>I3C core</strong> (<code>drivers/i3c/</code>) owns the bus and device model, DAA, the CCC engine and IBI dispatch, and calls into those ops as needed.</p>" +
        "<h4>Controller-side IBI ops</h4>" +
        "<p>The core never touches hardware directly. When your driver makes a device-side IBI call, the core turns it into the matching controller op:</p>" +
        "<table style=\"width:100%; border-collapse:collapse; margin:1rem 0;\"><tr style=\"border-bottom:1px solid #30363d;\"><th style=\"text-align:left; padding:0.5rem;\">Device-side call</th><th style=\"text-align:left; padding:0.5rem;\">Core invokes op</th><th style=\"text-align:left; padding:0.5rem;\">Controller does</th></tr>" +
        "<tr style=\"border-bottom:1px solid #30363d;\"><td style=\"padding:0.5rem;\"><code>i3c_device_request_ibi()</code></td><td style=\"padding:0.5rem;\"><code>ops-&gt;request_ibi()</code></td><td style=\"padding:0.5rem;\">allocate hardware IBI slots for this device</td></tr>" +
        "<tr style=\"border-bottom:1px solid #30363d;\"><td style=\"padding:0.5rem;\"><code>i3c_device_enable_ibi()</code></td><td style=\"padding:0.5rem;\"><code>ops-&gt;enable_ibi()</code></td><td style=\"padding:0.5rem;\">arm reception (often via an ENEC CCC)</td></tr>" +
        "<tr style=\"border-bottom:1px solid #30363d;\"><td style=\"padding:0.5rem;\"><code>i3c_device_disable_ibi()</code></td><td style=\"padding:0.5rem;\"><code>ops-&gt;disable_ibi()</code></td><td style=\"padding:0.5rem;\">mask reception (DISEC CCC)</td></tr>" +
        "<tr style=\"border-bottom:1px solid #30363d;\"><td style=\"padding:0.5rem;\"><code>i3c_device_free_ibi()</code></td><td style=\"padding:0.5rem;\"><code>ops-&gt;free_ibi()</code></td><td style=\"padding:0.5rem;\">release the slots/resources</td></tr>" +
        "<tr><td style=\"padding:0.5rem;\">(per-IBI, runtime)</td><td style=\"padding:0.5rem;\"><code>ops-&gt;recycle_ibi()</code></td><td style=\"padding:0.5rem;\">return a used slot to the pool after the handler runs</td></tr></table>" +
        i3cIbiLifecycleSVG() +
        "<h4>IBI slot / pool mechanism</h4>" +
        "<p>Most controller drivers lean on the core's <strong>generic IBI pool</strong> helpers instead of rolling their own slot bookkeeping. The end-to-end path is:</p>" +
        "<ul>" +
        "<li><code>i3c_generic_ibi_alloc_pool(dev, req)</code> builds a pool sized from the driver's <code>struct i3c_ibi_setup</code> (<code>num_slots</code>, <code>max_payload_len</code>) at <code>request_ibi</code> time.</li>" +
        "<li>On an incoming IBI the controller grabs a free slot with <code>i3c_generic_ibi_get_free_slot(pool)</code> and fills in the payload byte(s).</li>" +
        "<li>It hands the slot to the core via <code>i3c_master_queue_ibi(dev, slot)</code>.</li>" +
        "<li>The core runs the owning device's handler <strong>from a workqueue context</strong> — so the handler may sleep and issue private transfers (exactly the freedom section 6 relied on).</li>" +
        "<li>Afterwards the slot is returned with <code>i3c_generic_ibi_recycle_slot(pool, slot)</code> through <code>ops-&gt;recycle_ibi()</code>.</li>" +
        "</ul>" +
        "<p>Diagram B in section 6 shows this controller → core → handler → recycle path as a flow chart.</p>" +
        "<h4>Address arbitration — the defining mechanism</h4>" +
        "<p>There is <strong>no interrupt line</strong>. A target raises an IBI by driving <em>its own dynamic address</em> onto the bus during an available, arbitrable window. If several targets assert at once, the collision is resolved by <strong>open-drain, address-based bus arbitration</strong>: the <strong>lower address wins deterministically</strong>, and the losers back off and retry on the next window. The winning address is also the identity — the controller matches it to the owning <code>i3c_dev_desc</code> and its registered handler. The interrupt is, in effect, folded into the bus protocol.</p>" +
        "<h4>IBI taxonomy — three purposes, one arbitration</h4>" +
        "<p>The same in-band arbitration serves three distinct purposes, distinguished by the arbitrating address / request type:</p>" +
        i3cIbiTaxonomySVG() +
        "<ul>" +
        "<li><strong>(1) Target interrupt</strong> — the common case from section 6: the core dispatches to the owning device's handler.</li>" +
        "<li><strong>(2) Hot-join</strong> — a device powered on after boot wants to join; the controller runs DAA for it and the core instantiates/probes it.</li>" +
        "<li><strong>(3) Controller-role / mastership request</strong> — a secondary controller requests bus ownership.</li>" +
        "</ul>" +
        "<h4>Multi-master note</h4>" +
        "<p>I3C is multi-master, but only <strong>one controller is active at a time</strong>. A controller-role-request IBI plus a defined handover procedure moves mastership between controllers; bus-maintenance operations take the bus lock while they run.</p>" +
        "<h4>Cross-link: the irq_domain analogy</h4>" +
        "<p>If you know the site's <strong>IRQ Domains &amp; Hierarchical IRQ Routing</strong> topic, an IBI is the I3C analogue of a wired IRQ plus an irq_domain mapping: the arbitrated dynamic address plays the role that the hwirq→virq mapping plays for wired interrupts — it is how an in-band event is translated into \"which device, which handler.\" Contrast this once more with I2C, where an interrupt needs a separate GPIO line and a threaded IRQ; I3C needs neither.</p>"
    },
    {
      "title": "8. A Complete I3C Driver Sketch",
      "content": "<p>A minimal I3C device driver tying it together: match by PID, read an ID via a private transfer, and register for IBIs.</p><pre><code>#include <linux/module.h>\n#include <linux/i3c/device.h>\n\n#define REG_WHOAMI 0x0f\n#define REG_DATA   0x00\n#define CHIP_ID    0x33\n\nstruct accel3c { struct i3c_device *dev; };\n\nstatic int accel3c_read(struct accel3c *d, u8 reg, u8 *val)\n{\n    struct i3c_priv_xfer x[] = {\n        { .rnw = false, .len = 1, .data.out = &reg },\n        { .rnw = true,  .len = 1, .data.in  = val },\n    };\n    return i3c_device_do_priv_xfers(d->dev, x, 2);\n}\n\nstatic void accel3c_ibi(struct i3c_device *dev,\n                        const struct i3c_ibi_payload *p)\n{\n    struct accel3c *d = i3cdev_get_drvdata(dev);\n    u8 v;\n    if (!accel3c_read(d, REG_DATA, &v))\n        dev_info(i3cdev_to_dev(dev), \"IBI: data=0x%02x\\n\", v);\n}\n\nstatic const struct i3c_ibi_setup ibi_setup = {\n    .max_payload_len = 2, .num_slots = 4, .handler = accel3c_ibi,\n};\n\nstatic int accel3c_probe(struct i3c_device *dev)\n{\n    struct accel3c *d;\n    u8 id;\n    int ret;\n\n    d = devm_kzalloc(i3cdev_to_dev(dev), sizeof(*d), GFP_KERNEL);\n    if (!d) return -ENOMEM;\n    d->dev = dev;\n    i3cdev_set_drvdata(dev, d);\n\n    ret = accel3c_read(d, REG_WHOAMI, &id);\n    if (ret) return ret;\n    if (id != CHIP_ID) return -ENODEV;\n\n    ret = i3c_device_request_ibi(dev, &ibi_setup);\n    if (ret) return ret;\n    return i3c_device_enable_ibi(dev);\n}\n\nstatic void accel3c_remove(struct i3c_device *dev)\n{\n    i3c_device_disable_ibi(dev);\n    i3c_device_free_ibi(dev);\n}\n\nstatic const struct i3c_device_id accel3c_ids[] = {\n    I3C_DEVICE(0x104, 0x4210, NULL),\n    { },\n};\nMODULE_DEVICE_TABLE(i3c, accel3c_ids);\n\nstatic struct i3c_driver accel3c_driver = {\n    .driver = { .name = \"accel3c\" },\n    .id_table = accel3c_ids,\n    .probe = accel3c_probe,\n    .remove = accel3c_remove,\n};\nmodule_i3c_driver(accel3c_driver);\nMODULE_LICENSE(\"GPL\");</code></pre><h4>The bus in Device Tree</h4><pre><code>&amp;i3c0 {\n    status = \"okay\";\n    // I3C device: address is the STATIC/init address; PID identifies it.\n    accel@3c,0x6104420010 {\n        reg = <0x3c 0x6104 0x420010>;   // static addr + PID hi/lo\n    };\n    // A legacy I2C device can coexist on the same bus:\n    // eeprom@50 { compatible = \"atmel,24c02\"; reg = <0x50>; };\n};\n// The controller runs DAA at probe; your driver binds by PID afterwards.</code></pre>"
    },
    {
      "title": "9. Debugging & References",
      "content": "<h4>Inspecting the I3C bus</h4><pre><code>ls /sys/bus/i3c/devices/         # masters + devices on I3C buses\n#   i3c-0            (a bus/master)\n#   0-6104420010     (a device: bus-PID)\ncat /sys/bus/i3c/devices/0-6104420010/pid       # provisioned ID\ncat /sys/bus/i3c/devices/0-6104420010/dynamic_address\ncat /sys/bus/i3c/devices/0-6104420010/bcr\ncat /sys/bus/i3c/devices/0-6104420010/dcr\n\nls -l /sys/bus/i3c/devices/0-6104420010/driver  # is your driver bound?\ndmesg | grep -i i3c              # DAA, hot-join, bind/probe messages</code></pre><h4>Common pitfalls</h4><table style=\"width:100%; border-collapse:collapse; margin:1rem 0;\"><tr style=\"border-bottom:1px solid #30363d;\"><th style=\"text-align:left; padding:0.5rem;\">Symptom</th><th style=\"text-align:left; padding:0.5rem;\">Cause</th></tr><tr style=\"border-bottom:1px solid #30363d;\"><td style=\"padding:0.5rem;\">probe() never called</td><td style=\"padding:0.5rem;\">PID mismatch in <code>i3c_device_id</code> table</td></tr><tr style=\"border-bottom:1px solid #30363d;\"><td style=\"padding:0.5rem;\">Hard-coded address fails</td><td style=\"padding:0.5rem;\">Address is DYNAMIC — use the <code>i3c_device</code> handle, not a literal</td></tr><tr style=\"border-bottom:1px solid #30363d;\"><td style=\"padding:0.5rem;\">No IBIs delivered</td><td style=\"padding:0.5rem;\">Forgot <code>enable_ibi</code>, or device's BCR says no IBI support</td></tr><tr style=\"border-bottom:1px solid #30363d;\"><td style=\"padding:0.5rem;\">Device missing after boot</td><td style=\"padding:0.5rem;\">Hot-join not enabled / DAA didn't reach it</td></tr><tr><td style=\"padding:0.5rem;\">Transfer errors</td><td style=\"padding:0.5rem;\">Wrong <code>rnw</code>/len, or controller lacks the mode (HDR)</td></tr></table><h4>Key takeaways</h4><ul><li>You write an <strong>i3c_driver</strong> and match by <strong>PID</strong> — never by a fixed address (I3C addresses are assigned by <strong>DAA</strong>).</li><li>Register access uses <strong>private transfers</strong> (<code>i3c_device_do_priv_xfers</code>) or, preferably, <strong>Regmap over I3C</strong>.</li><li>Interrupts arrive as <strong>IBIs</strong> over the bus (request + enable in probe) — no GPIO line.</li><li>Support <strong>hot-join</strong>: devices can probe at runtime, and an I3C bus may also carry legacy I2C devices.</li></ul><p><strong>References:</strong></p><ul><li><a href=\"https://docs.kernel.org/driver-api/i3c/index.html\" target=\"_blank\">Linux Kernel: I3C subsystem</a></li><li><a href=\"https://docs.kernel.org/driver-api/i3c/protocol.html\" target=\"_blank\">Linux Kernel: I3C protocol overview (DAA/CCC/IBI)</a></li><li><a href=\"https://docs.kernel.org/driver-api/i3c/device-driver-api.html\" target=\"_blank\">Linux Kernel: I3C device driver API</a></li><li><a href=\"https://mipi.org/resources/I3C-frequently-asked-questions\" target=\"_blank\">MIPI I3C FAQ</a></li><li><a href=\"https://docs.kernel.org/driver-api/regmap.html\" target=\"_blank\">Linux Kernel: Register Map (regmap) API</a></li></ul>"
    }
  ]
};
