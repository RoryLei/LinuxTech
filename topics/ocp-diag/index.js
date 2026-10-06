/**
 * Topic: OCP Test & Validation (Diag) Specification
 *
 * The Open Compute Project's hardware Test & Validation / diagnostics
 * framework and its structured JSON Output Specification. NOT the Linux
 * kernel — an industry diagnostics framework whose diagnostics run on
 * Linux hosts and whose output feeds lab / MES / fleet systems.
 */

/* Accessible palette (declared BEFORE use so the SVG helpers below are
 * initialized before the topic object literal calls them — avoids a
 * temporal-dead-zone ReferenceError at load time). ONE neutral-blue hue
 * for every box (#cfe3ff fill, #1f2d3d stroke) on a #0d1117 background.
 * Element identity is carried by NUMBER badges + position + shape + text,
 * never by hue. No red/green/yellow conveys meaning; pass/fail is shown by
 * text and shape only. Table borders use #30363d. */
const OCP_BOX_FILL = "#cfe3ff";
const OCP_BOX_STROKE = "#1f2d3d";
const OCP_TEXT = "#0f172a";
const OCP_NOTE = "#c9d4e0";
const OCP_ARROW = "#9db4cc";
const OCP_BG = "#0d1117";

/* =====================================================================
 * Accessible inline SVG diagram helpers. Single blue fill, numbered
 * circle badges, arrows, high-contrast text — mirrors the regmap /
 * irq-domain visual style.
 * =================================================================== */

function ocpBox(x, y, w, h, label, badge) {
  const cy = y + h / 2;
  const r = 13;
  let s =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ` +
    `fill="${OCP_BOX_FILL}" stroke="${OCP_BOX_STROKE}" stroke-width="1.5"></rect>`;
  if (badge !== undefined) {
    s +=
      `<circle cx="${x + r + 4}" cy="${cy}" r="${r}" fill="${OCP_BOX_STROKE}"></circle>` +
      `<text x="${x + r + 4}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="13" font-weight="700" fill="#ffffff">${badge}</text>`;
  }
  const tx = badge !== undefined ? x + r + 4 + (w - r - 4) / 2 : x + w / 2;
  s +=
    `<text x="${tx}" y="${cy + 5}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="14" font-weight="600" fill="${OCP_TEXT}">${label}</text>`;
  return s;
}

// A box with left-aligned text (used for wide flow-step boxes).
function ocpStepBox(x, y, w, h, label, badge) {
  const cy = y + h / 2;
  const r = 13;
  let s =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ` +
    `fill="${OCP_BOX_FILL}" stroke="${OCP_BOX_STROKE}" stroke-width="1.5"></rect>`;
  if (badge !== undefined) {
    s +=
      `<circle cx="${x + r + 4}" cy="${cy}" r="${r}" fill="${OCP_BOX_STROKE}"></circle>` +
      `<text x="${x + r + 4}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="13" font-weight="700" fill="#ffffff">${badge}</text>`;
  }
  s +=
    `<text x="${x + (badge !== undefined ? r + 24 : 14)}" y="${cy + 4}" ` +
    `font-family="sans-serif" font-size="12.5" fill="${OCP_TEXT}">${label}</text>`;
  return s;
}

// A diamond decision node (shape, not color, carries the "decision" meaning).
function ocpDiamond(cx, cy, halfW, halfH, label) {
  let s =
    `<polygon points="${cx},${cy - halfH} ${cx + halfW},${cy} ${cx},${cy + halfH} ${cx - halfW},${cy}" ` +
    `fill="${OCP_BOX_FILL}" stroke="${OCP_BOX_STROKE}" stroke-width="1.5"></polygon>`;
  s +=
    `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="12.5" font-weight="600" fill="${OCP_TEXT}">${label}</text>`;
  return s;
}

function ocpVArrow(x, y1, y2) {
  return (
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${OCP_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x - 5},${y2 - 6} ${x + 5},${y2 - 6} ${x},${y2}" fill="${OCP_ARROW}"></polygon>`
  );
}

function ocpVArrowUp(x, y1, y2) {
  return (
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${OCP_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x - 5},${y2 + 6} ${x + 5},${y2 + 6} ${x},${y2}" fill="${OCP_ARROW}"></polygon>`
  );
}

function ocpHArrow(x1, y, x2) {
  const dir = x2 >= x1 ? 1 : -1;
  return (
    `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${OCP_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x2 - dir * 7},${y - 5} ${x2 - dir * 7},${y + 5} ${x2},${y}" fill="${OCP_ARROW}"></polygon>`
  );
}

function ocpFrame(viewW, viewH, title, subtitle, body, ariaLabel) {
  return (
    `<div style="overflow-x:auto; margin:1rem 0; padding:1rem; background:${OCP_BG}; ` +
    `border:1px solid #30363d; border-radius:8px;">` +
    `<div style="text-align:center; font-weight:700; font-size:1.05rem; color:#58a6ff; margin-bottom:0.25rem;">${title}</div>` +
    `<div style="text-align:center; font-size:0.85rem; color:#8b949e; margin-bottom:0.75rem;">${subtitle}</div>` +
    `<svg viewBox="0 0 ${viewW} ${viewH}" width="100%" role="img" aria-label="${ariaLabel}">${body}</svg>` +
    `</div>`
  );
}

// Diagram 1: SOFTWARE ARCHITECTURE — producer SDK -> diagnostic ->
// JSON artifact stream -> consumers. Layered top-to-bottom.
function ocpArchitectureSVG() {
  const w = 760, boxW = 420, boxX = 170, h = 50, gap = 28;
  const layers = [
    { l: "Producer SDK (C++ / Python / Go)", n: "ergonomic API: TestRun, TestStep, Measurement, Diagnosis" },
    { l: "Compliant diagnostic (SAT, memtester, pcicrawler, fio)", n: "exercises memory / PCIe-AER / NVMe / NIC on a Linux host" },
    { l: "OCP JSON artifact stream (stdout, line-delimited)", n: "SchemaVersion, TestRun*, TestStep*, Measurement, Diagnosis ..." },
    { l: "Consumer / parser / validator", n: "reads artifacts as the test runs (sequenceNumber + timestamp)" },
    { l: "Test executive / MES / lab DB / ML repair", n: "fleet-scale troubleshooting & repair automation" },
  ];
  let body = "";
  const topY = 20;
  layers.forEach((s, i) => {
    const y = topY + i * (h + gap);
    const cy = y + h / 2;
    body += ocpBox(boxX, y, boxW, h, s.l, i + 1);
    body +=
      `<text x="${boxX + boxW + 12}" y="${cy + 4}" font-family="sans-serif" ` +
      `font-size="11.5" fill="${OCP_NOTE}">${s.n}</text>`;
    if (i < layers.length - 1)
      body += ocpVArrow(boxX + boxW / 2, y + h, y + h + gap);
  });
  // bracket note: top two = producer side, bottom three = consumer side
  body +=
    `<text x="40" y="${topY + h / 2 + 4}" font-family="sans-serif" font-size="11.5" fill="${OCP_NOTE}">producer</text>` +
    `<text x="40" y="${topY + 3 * (h + gap) + h / 2 + 4}" font-family="sans-serif" font-size="11.5" fill="${OCP_NOTE}">consumer</text>`;
  const vh = topY + layers.length * (h + gap) + 6;
  return ocpFrame(
    w, vh,
    "OCP Diag — Software Architecture (producer to consumer)",
    "A producer SDK (1) drives a diagnostic (2) that emits a line-delimited JSON stream (3); consumers (4) parse it live and feed test executives / MES / fleet ML (5)",
    body,
    "Layered software architecture. A producer SDK in C++, Python or Go drives a compliant diagnostic running on a Linux host; the diagnostic emits a line-delimited OCP JSON artifact stream on stdout; a consumer parser and validator reads it as the test runs; the parsed results feed a test executive, manufacturing execution system, lab database, and fleet-scale machine-learning repair systems."
  );
}

// Diagram 2: OUTPUT ARTIFACT MODEL / hierarchy (containment / nesting).
function ocpArtifactModelSVG() {
  const w = 760, h = 42;
  let body = "";
  // SchemaVersion at the very top
  body += ocpStepBox(40, 20, 300, h, "SchemaVersion (emitted first)", 1);
  body += ocpVArrow(190, 20 + h, 20 + h + 20);
  // TestRunStart .. TestRunEnd big container
  const runY = 20 + h + 20;
  const runH = 300;
  body +=
    `<rect x="40" y="${runY}" width="680" height="${runH}" rx="8" ` +
    `fill="none" stroke="${OCP_BOX_STROKE}" stroke-width="1.5" stroke-dasharray="6 4"></rect>`;
  body += ocpStepBox(56, runY + 14, 360, h, "TestRunStart { DutInfo: Platform/HW/SW/Subcomponents }", 2);
  body += ocpStepBox(430, runY + 14, 274, h, "TestRunEnd { TestResult, TestStatus }", 3);
  body +=
    `<text x="56" y="${runY + 14 + h + 20}" font-family="sans-serif" font-size="11.5" ` +
    `fill="${OCP_NOTE}">run-scoped Error artifacts may appear between start and end</text>`;
  // One-or-more TestStep container nested inside the run
  const stepY = runY + 14 + h + 34;
  const stepH = 182;
  body +=
    `<rect x="70" y="${stepY}" width="620" height="${stepH}" rx="8" ` +
    `fill="none" stroke="${OCP_BOX_STROKE}" stroke-width="1.5" stroke-dasharray="4 3"></rect>`;
  body +=
    `<text x="80" y="${stepY + 16}" font-family="sans-serif" font-size="11.5" font-weight="700" ` +
    `fill="${OCP_NOTE}">one or more Test Steps</text>`;
  body += ocpStepBox(86, stepY + 24, 240, h, "TestStepStart", 4);
  body += ocpStepBox(440, stepY + 24, 230, h, "TestStepEnd { TestStatus }", 5);
  // nested-under-step artifacts
  const na = [
    "Measurement { + Validators }",
    "MeasurementSeries Start/Element/End",
    "Diagnosis { PASS or FAIL verdict }",
    "Error / Log / File",
    "Extension (vendor) / Metadata",
  ];
  const nestY = stepY + 24 + h + 10;
  na.forEach((t, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 86 + col * 300;
    const y = nestY + row * 34;
    body += ocpStepBox(x, y, 290, 28, t, undefined);
  });
  const vh = runY + runH + 16;
  return ocpFrame(
    w, vh,
    "OCP Output Spec v2.0 — Artifact Object Model (containment)",
    "SchemaVersion (1) is first; a Test Run (2 to 3) wraps one or more Test Steps (4 to 5); Measurements, Diagnoses, Errors, Logs, Files, Extensions and Metadata nest inside a step",
    body,
    "Artifact object-model hierarchy. A SchemaVersion artifact is emitted first. Then a Test Run, bounded by TestRunStart carrying DutInfo and TestRunEnd carrying a TestResult and TestStatus, wraps one or more Test Steps. Each step is bounded by TestStepStart and TestStepEnd, and contains Measurements with Validators, measurement series, a Diagnosis with a pass or fail verdict, Errors, Logs, Files, vendor Extensions and Metadata."
  );
}

// Diagram 3: FLOW CHART of a diagnostic's execution emitting the stream
// over time, with the loop over steps and incremental emission.
function ocpExecutionFlowSVG() {
  const w = 760, boxW = 440, boxX = 90, h = 44, gap = 24;
  let body = "";
  const topY = 20;
  // linear pre-loop steps
  body += ocpStepBox(boxX, topY, boxW, h, "emit SchemaVersion (declare spec version)", 1);
  body += ocpVArrow(boxX + boxW / 2, topY + h, topY + h + gap);
  const y2 = topY + h + gap;
  body += ocpStepBox(boxX, y2, boxW, h, "emit TestRunStart ( + DutInfo for the DUT )", 2);
  body += ocpVArrow(boxX + boxW / 2, y2 + h, y2 + h + gap);
  // loop header
  const y3 = y2 + h + gap;
  body += ocpStepBox(boxX, y3, boxW, h, "for each Test Step: emit TestStepStart", 3);
  body += ocpVArrow(boxX + boxW / 2, y3 + h, y3 + h + gap);
  const y4 = y3 + h + gap;
  body += ocpStepBox(boxX, y4, boxW, h, "run checks; emit Measurements (validate limits)", 4);
  body += ocpVArrow(boxX + boxW / 2, y4 + h, y4 + h + gap);
  const y5 = y4 + h + gap;
  body += ocpStepBox(boxX, y5, boxW, h, "emit Diagnosis (PASS / FAIL by text), Log / Error", 5);
  body += ocpVArrow(boxX + boxW / 2, y5 + h, y5 + h + gap);
  const y6 = y5 + h + gap;
  body += ocpStepBox(boxX, y6, boxW, h, "emit TestStepEnd { TestStatus }", 6);
  // loop-back arrow (right side) from step end up to step start
  const rbx = boxX + boxW + 30;
  body +=
    `<line x1="${boxX + boxW}" y1="${y6 + h / 2}" x2="${rbx}" y2="${y6 + h / 2}" stroke="${OCP_ARROW}" stroke-width="2"></line>` +
    `<line x1="${rbx}" y1="${y6 + h / 2}" x2="${rbx}" y2="${y3 + h / 2}" stroke="${OCP_ARROW}" stroke-width="2"></line>` +
    `<line x1="${rbx}" y1="${y3 + h / 2}" x2="${boxX + boxW}" y2="${y3 + h / 2}" stroke="${OCP_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${boxX + boxW + 7},${y3 + h / 2 - 5} ${boxX + boxW + 7},${y3 + h / 2 + 5} ${boxX + boxW},${y3 + h / 2}" fill="${OCP_ARROW}"></polygon>` +
    `<text x="${rbx + 8}" y="${(y3 + y6) / 2 + h / 2}" font-family="sans-serif" font-size="11.5" fill="${OCP_NOTE}">more</text>` +
    `<text x="${rbx + 8}" y="${(y3 + y6) / 2 + h / 2 + 16}" font-family="sans-serif" font-size="11.5" fill="${OCP_NOTE}">steps</text>`;
  // final: TestRunEnd
  body += ocpVArrow(boxX + boxW / 2, y6 + h, y6 + h + gap);
  const y7 = y6 + h + gap;
  body += ocpStepBox(boxX, y7, boxW, h, "emit TestRunEnd { TestResult, TestStatus }", 7);
  // streaming note on left
  body +=
    `<text x="20" y="${y4 + 4}" font-family="sans-serif" font-size="11" fill="${OCP_NOTE}">every</text>` +
    `<text x="20" y="${y4 + 18}" font-family="sans-serif" font-size="11" fill="${OCP_NOTE}">artifact:</text>` +
    `<text x="20" y="${y4 + 32}" font-family="sans-serif" font-size="11" fill="${OCP_NOTE}">seq# +</text>` +
    `<text x="20" y="${y4 + 46}" font-family="sans-serif" font-size="11" fill="${OCP_NOTE}">time</text>`;
  const vh = y7 + h + 16;
  return ocpFrame(
    w, vh,
    "Diagnostic Execution — Streaming Artifact Emission",
    "Emit SchemaVersion (1) then TestRunStart (2); loop over steps (3 to 6), emitting Measurements and a Diagnosis incrementally; finish with TestRunEnd (7). Each artifact carries a sequenceNumber + timestamp",
    body,
    "Execution flow chart. The diagnostic first emits a SchemaVersion artifact, then a TestRunStart with DutInfo. It then loops over one or more test steps: emit TestStepStart, run checks and emit Measurements validated against limits, emit a Diagnosis with a pass or fail verdict plus logs or errors, and emit TestStepEnd. The loop repeats for more steps. Finally it emits TestRunEnd carrying the overall TestResult. Every artifact carries a sequence number and timestamp so results stream incrementally."
  );
}

// Diagram 4: NPI hardware life-cycle — same diagnostics reused across
// design/validation, manufacturing, deployment and RMA.
function ocpLifecycleSVG() {
  const w = 760, boxW = 150, h = 60;
  let body = "";
  const stages = [
    { l: "Design & Validation", n: "bringup, SIT, reliability" },
    { l: "Manufacturing", n: "mass production / MES" },
    { l: "Data-Center Deployment", n: "fleet operations" },
    { l: "RMA / Reverse Logistics", n: "root-cause, repair" },
  ];
  const topY = 30;
  const xs = [20, 215, 410, 600 - 10];
  stages.forEach((s, i) => {
    const x = xs[i];
    body += ocpBox(x, topY, boxW, h, "", i + 1);
    const cx = x + boxW / 2;
    body +=
      `<text x="${cx + 10}" y="${topY + 26}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="12.5" font-weight="600" fill="${OCP_TEXT}">${s.l}</text>` +
      `<text x="${cx + 10}" y="${topY + 44}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="10.5" fill="${OCP_TEXT}">${s.n}</text>`;
    if (i < stages.length - 1)
      body += ocpHArrow(x + boxW, topY + h / 2, xs[i + 1]);
  });
  // shared-diagnostic bar underneath spanning all stages
  const barY = topY + h + 40;
  body += ocpStepBox(20, barY, 720, 42, "Same OCP-compliant diagnostics reused end-to-end (one dev effort, same JSON output model)", 5);
  // up arrows from the bar to each stage
  stages.forEach((s, i) => {
    const cx = xs[i] + boxW / 2 + 10;
    body += ocpVArrowUp(cx, barY, topY + h + 2);
  });
  const vh = barY + 42 + 16;
  return ocpFrame(
    w, vh,
    "NPI Hardware Life Cycle — One Diagnostic, Reused",
    "The same diagnostics (5) run across Design & Validation (1), Manufacturing (2), Deployment (3) and RMA (4) — reproducible issues and shared vendor tests across the whole life cycle",
    body,
    "New product introduction life-cycle flow. Four stages run left to right: Design and Validation, Manufacturing, Data-Center Deployment, and RMA or reverse logistics. A single bar underneath represents the same OCP-compliant diagnostics with one shared JSON output model reused across every stage, so diagnostic effort is reused and issues are reproducible across partners."
  );
}

// Diagram 5: Measurement -> Validator pass/fail decision (shape, not color).
function ocpValidatorFlowSVG() {
  const w = 760, h = 44;
  let body = "";
  const cx = 300;
  body += ocpStepBox(90, 20, 420, h, "Measurement value (e.g. temperature, latency, error count)", 1);
  body += ocpVArrow(cx, 20 + h, 20 + h + 20);
  const dY = 20 + h + 20;
  body += ocpStepBox(90, dY, 420, h, "apply Validator: value vs limit (ValidatorType, e.g. <=, >=, ==)", 2);
  body += ocpVArrow(cx, dY + h, dY + h + 20);
  const diaY = dY + h + 20;
  body += ocpDiamond(cx, diaY + 34, 120, 34, "limit satisfied?");
  // two labelled branches — meaning in TEXT/SHAPE, not colour
  const branchY = diaY + 34;
  // left = PASS
  body +=
    `<line x1="${cx - 120}" y1="${branchY}" x2="150" y2="${branchY}" stroke="${OCP_ARROW}" stroke-width="2"></line>` +
    `<line x1="150" y1="${branchY}" x2="150" y2="${branchY + 50}" stroke="${OCP_ARROW}" stroke-width="2"></line>` +
    `<polygon points="145,${branchY + 44} 155,${branchY + 44} 150,${branchY + 50}" fill="${OCP_ARROW}"></polygon>` +
    `<text x="${cx - 150}" y="${branchY - 8}" font-family="sans-serif" font-size="11.5" fill="${OCP_NOTE}">yes</text>`;
  // right = FAIL
  body +=
    `<line x1="${cx + 120}" y1="${branchY}" x2="610" y2="${branchY}" stroke="${OCP_ARROW}" stroke-width="2"></line>` +
    `<line x1="610" y1="${branchY}" x2="610" y2="${branchY + 50}" stroke="${OCP_ARROW}" stroke-width="2"></line>` +
    `<polygon points="605,${branchY + 44} 615,${branchY + 44} 610,${branchY + 50}" fill="${OCP_ARROW}"></polygon>` +
    `<text x="${cx + 128}" y="${branchY - 8}" font-family="sans-serif" font-size="11.5" fill="${OCP_NOTE}">no</text>`;
  const outY = branchY + 50;
  body += ocpBox(60, outY, 180, h, "Diagnosis: PASS", 3);
  body += ocpBox(520, outY, 180, h, "Diagnosis: FAIL", 4);
  body +=
    `<text x="150" y="${outY + h + 18}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="11" fill="${OCP_NOTE}">DiagnosisType = PASS (verdict by text)</text>` +
    `<text x="610" y="${outY + h + 18}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="11" fill="${OCP_NOTE}">DiagnosisType = FAIL (verdict by text)</text>`;
  const vh = outY + h + 30;
  return ocpFrame(
    w, vh,
    "Measurement to Validator — Pass/Fail Decision",
    "A Measurement (1) is checked by a Validator (2); the decision diamond branches by TEXT, not colour, to a PASS (3) or FAIL (4) Diagnosis",
    body,
    "Decision flow. A measurement value flows into a Validator that compares it against a limit using a validator type such as less-than-or-equal, greater-than-or-equal or equal. A diamond decision node asks whether the limit is satisfied. The yes branch leads to a Diagnosis with type PASS; the no branch leads to a Diagnosis with type FAIL. The verdict is carried by text labels and node shape, never by colour."
  );
}

// Diagram 6: EFFICIENCY DECISION FLOW — choose the artifact-emission
// strategy by measurement rate. Shape + text carry the branch meaning,
// never colour.
function ocpEfficiencyFlowSVG() {
  const w = 760, boxW = 300, boxX = 230, h = 46, gap = 26;
  let body = "";
  const topY = 20;
  // 1. start: a diagnostic produces measurements
  body += ocpStepBox(boxX, topY, boxW, h, "diagnostic produces measurement values", 1);
  body += ocpVArrow(boxX + boxW / 2, topY + h, topY + h + gap);
  // 2. decision diamond: is the measurement rate high-frequency?
  const diaCy = topY + h + gap + 44;
  body += ocpDiamond(boxX + boxW / 2, diaCy, 150, 46, "high-frequency rate?");
  // yes branch -> right -> aggregate
  const yesX = 650, noX = 120;
  body +=
    `<line x1="${boxX + boxW / 2 + 150}" y1="${diaCy}" x2="${yesX}" y2="${diaCy}" stroke="${OCP_ARROW}" stroke-width="2"></line>` +
    `<line x1="${yesX}" y1="${diaCy}" x2="${yesX}" y2="${diaCy + 50}" stroke="${OCP_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${yesX - 5},${diaCy + 44} ${yesX + 5},${diaCy + 44} ${yesX},${diaCy + 50}" fill="${OCP_ARROW}"></polygon>` +
    `<text x="${boxX + boxW / 2 + 158}" y="${diaCy - 8}" font-family="sans-serif" font-size="11.5" fill="${OCP_NOTE}">yes</text>`;
  // no branch -> left -> per-measurement
  body +=
    `<line x1="${boxX + boxW / 2 - 150}" y1="${diaCy}" x2="${noX}" y2="${diaCy}" stroke="${OCP_ARROW}" stroke-width="2"></line>` +
    `<line x1="${noX}" y1="${diaCy}" x2="${noX}" y2="${diaCy + 50}" stroke="${OCP_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${noX - 5},${diaCy + 44} ${noX + 5},${diaCy + 44} ${noX},${diaCy + 50}" fill="${OCP_ARROW}"></polygon>` +
    `<text x="${boxX + boxW / 2 - 180}" y="${diaCy - 8}" font-family="sans-serif" font-size="11.5" fill="${OCP_NOTE}">no</text>`;
  const outY = diaCy + 50;
  body += ocpBox(20, outY, 200, h, "emit per-measurement artifact", 2);
  body += ocpBox(540, outY, 200, h, "aggregate: MeasurementSeries", 3);
  body +=
    `<text x="120" y="${outY + h + 18}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="11" fill="${OCP_NOTE}">overhead negligible vs hardware latency</text>` +
    `<text x="640" y="${outY + h + 18}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="11" fill="${OCP_NOTE}">batch-like: one Start/End, many Elements</text>`;
  // converge note
  body +=
    `<text x="380" y="${outY + h + 44}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="11.5" fill="${OCP_NOTE}">both emit the same line-delimited JSON stream; the choice trades serialization cost against reporting granularity</text>`;
  const vh = outY + h + 60;
  return ocpFrame(
    w, vh,
    "Choosing an Emission Strategy by Measurement Rate",
    "A diagnostic (1) asks whether its measurement rate is high-frequency; the no branch emits a per-measurement artifact (2), the yes branch aggregates into a MeasurementSeries (3) to amortize JSON serialization cost",
    body,
    "Decision flow chart for emission strategy. A diagnostic produces measurement values and reaches a diamond decision node asking whether the measurement rate is high-frequency. The no branch, where per-measurement overhead is negligible compared with hardware access latency, emits one JSON artifact per measurement. The yes branch, used for tight high-frequency loops such as memory-pattern tests, aggregates values into a MeasurementSeries with one start and end and many elements to amortize serialization cost. Both branches produce the same line-delimited JSON stream; the branch is chosen by text and node shape, never by colour."
  );
}

const TOPIC_OCP_DIAG = {
  "id": "ocp-diag",
  "category": "tooling",
  "icon": "🧪",
  "title": "OCP Test & Validation (Diag) Specification",
  "description": "The Open Compute Project's hardware Test & Validation / diagnostics framework and its structured JSON Output Specification v2.0 — software architecture of the producer SDKs, the TestRun/TestStep/Measurement/Diagnosis artifact model, the test runners (AutoVal, CTAM) and compliant diagnostics (SAT, memtester, pcicrawler, fio), with flow charts",
  "keywords": [
    "ocp", "open compute project", "test and validation", "test & validation",
    "ocp-diag", "ocp diag", "diagnostics", "hardware validation",
    "output specification", "output spec", "artifact", "json stream",
    "schemaversion", "test run", "testrunstart", "testrunend", "test step",
    "teststepstart", "teststepend", "measurement", "measurement series",
    "validator", "validatortype", "diagnosis", "diagnosistype", "testresult",
    "teststatus", "dut", "dutinfo", "platforminfo", "hardwareinfo",
    "softwareinfo", "subcomponent", "severity", "extension", "metadata",
    "sequencenumber", "timestamp", "streaming", "incremental reporting",
    "ocp-diag-core", "ocp-diag-core-cpp", "ocp-diag-core-python", "go bindings",
    "autoval", "autoval-ssd", "ctam", "redfish", "sat",
    "stressful application test", "memtester", "pcicrawler", "ssd-qual",
    "fio", "aer", "advanced error reporting", "pcie", "nvme",
    "npi", "new product introduction", "rma", "mes",
    "manufacturing execution system", "burn-in", "reliability",
    "fleet", "repair automation", "machine learning", "root cause"
  ],
  "sections": [
    {
      "title": "1. Overview & Architecture",
      "content": `<p>The <strong>OCP Test &amp; Validation Initiative</strong> (often shortened to <strong>OCP Diag</strong>) is a collaboration among data-center hyperscalers under the <a href="https://www.opencompute.org/" target="_blank">Open Compute Project</a> to <strong>standardize hardware validation and diagnosis</strong> and to supply shared tooling. It is <em>not</em> part of the Linux kernel — it is an industry diagnostics framework. The diagnostics themselves run on Linux hosts and exercise familiar Linux subsystems (memory, PCIe/AER, NVMe/SSD, NICs), but the framework's real contribution is a <strong>portable way to execute diagnostics</strong> plus a <strong>rich, structured output model</strong> that plugs cleanly into test executives, manufacturing execution systems (MES), and lab / data-center data-collection pipelines.</p>
<p>The core repository is <a href="https://github.com/opencomputeproject/ocp-diag-core" target="_blank">github.com/opencomputeproject/ocp-diag-core</a>. Two things define the project: a <strong>software architecture</strong> that separates the <em>producer</em> (an SDK and the diagnostic that uses it) from the <em>consumer</em> (whatever parses the results), and an <strong>Output Specification</strong> that fixes the wire format between them so any compliant producer talks to any compliant consumer.</p>
${ocpArchitectureSVG()}
<h4>The layered picture</h4>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Layer</th><th style="text-align:left; padding:0.5rem;">Role</th><th style="text-align:left; padding:0.5rem;">Example</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Producer SDK</strong></td><td style="padding:0.5rem;">Ergonomic API that serializes compliant output</td><td style="padding:0.5rem;">ocp-diag-core-cpp / -python / Go bindings</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Compliant diagnostic</strong></td><td style="padding:0.5rem;">Actual test exercising hardware</td><td style="padding:0.5rem;">SAT, memtester, pcicrawler, SSD-qual (fio)</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>JSON artifact stream</strong></td><td style="padding:0.5rem;">Line-delimited stdout, the standard wire format</td><td style="padding:0.5rem;">SchemaVersion, TestRun*, TestStep*, Measurement…</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Consumer / parser</strong></td><td style="padding:0.5rem;">Reads &amp; validates artifacts as the test runs</td><td style="padding:0.5rem;">Test-executive adapters, log collectors</td></tr>
<tr><td style="padding:0.5rem;"><strong>Executive / MES / fleet</strong></td><td style="padding:0.5rem;">Decisions, storage, automation at scale</td><td style="padding:0.5rem;">MES, lab DB, ML-based repair automation</td></tr></table>
<p>The rest of this topic drills into the two mandatory pillars: the <strong>software architecture</strong> (sections 3, 5, 6) and the <strong>flow / data-model diagrams</strong> (sections 3, 4, 7, 8). It relates to the site's <em>PCIe/AER</em>, <em>NVMe</em>, <em>memory</em> and <em>hardware-diagnostics</em> topics without duplicating them — here the focus is the T&amp;V framework and its output model.</p>`
    },
    {
      "title": "2. Why OCP Diag? (Motivation)",
      "content": `<p>A single piece of server hardware is diagnosed many times across its life. Historically each stage reinvented its own tooling, with its own output format, so effort could not be reused and results could not be compared. OCP Diag exists to run the <strong>same diagnostics across the whole NPI (new product introduction) hardware life cycle</strong>.</p>
${ocpLifecycleSVG()}
<h4>The life-cycle problem it addresses</h4>
<ul>
<li><strong>Design &amp; validation</strong> — bringup, system integration test (SIT), reliability test, and third-party lab validation.</li>
<li><strong>Mass production &amp; deployment</strong> — manufacturing, data-center operations, and RMA / reverse logistics.</li>
</ul>
<p>Running one diagnostic across all of these yields concrete wins:</p>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Problem</th><th style="text-align:left; padding:0.5rem;">How OCP Diag helps</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">Diagnostic effort rebuilt at every stage</td><td style="padding:0.5rem;"><strong>Reuse</strong> one dev/integration effort across the whole life cycle</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">Tests tied to one product / environment</td><td style="padding:0.5rem;"><strong>Portability</strong> across products, environments and use cases</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">Issues not reproducible across partners</td><td style="padding:0.5rem;"><strong>Reproducible</strong> T&amp;V issues across HW/SW partners</td></tr>
<tr><td style="padding:0.5rem;">Slow RMA / root-cause with component vendors</td><td style="padding:0.5rem;"><strong>Shareable</strong> component-vendor tests accelerate RMA &amp; root-cause</td></tr></table>
<p>Because every stage emits the <em>same</em> structured output, the data stream can feed heuristic and ML-based troubleshooting and repair automation at fleet scale — the diagnostic effort compounds instead of being thrown away at each hand-off.</p>`
    },
    {
      "title": "3. The Output Specification v2.0 — Artifact Data Model",
      "content": `<p>The heart of the architecture is the <strong>OCP Test and Validation Output Specification</strong>, currently at <strong>version 2.0</strong>. It defines a stream of JSON <strong>OutputArtifacts</strong> — a <em>line-delimited</em> JSON stream (one artifact per line) written to stdout, so a consumer can read results <strong>as the test runs</strong> rather than waiting for a final report.</p>
${ocpArtifactModelSVG()}
<h4>The hierarchy</h4>
<ul>
<li><strong>SchemaVersion</strong> — emitted first; declares the spec version so the consumer knows how to parse what follows.</li>
<li><strong>Test Run</strong> — <code>TestRunStart</code> carries <strong>DutInfo</strong> (device-under-test info: <code>PlatformInfo</code>, <code>HardwareInfo</code>, <code>SoftwareInfo</code>, <code>Subcomponents</code>); <code>TestRunEnd</code> carries a <code>TestResult</code> plus a <code>TestStatus</code>; run-scoped <code>Error</code> artifacts may appear in between.</li>
<li><strong>Test Step</strong> — a run contains <em>one or more</em> steps. Each is bounded by <code>TestStepStart</code> and <code>TestStepEnd</code> (which carries a <code>TestStatus</code>). Inside a step you find <code>Measurement</code>, the streaming trio <code>MeasurementSeriesStart</code> / <code>MeasurementSeriesElement</code> / <code>MeasurementSeriesEnd</code>, <code>Diagnosis</code>, <code>Error</code>, <code>Log</code>, <code>File</code>, <code>Extension</code> (the vendor-specific extension point) and <code>Metadata</code>.</li>
</ul>
<h4>Which artifact nests where</h4>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Scope</th><th style="text-align:left; padding:0.5rem;">Artifacts</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Stream root</strong></td><td style="padding:0.5rem;"><code>SchemaVersion</code></td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Test Run</strong></td><td style="padding:0.5rem;"><code>TestRunStart</code> (DutInfo), <code>TestRunEnd</code> (TestResult, TestStatus), run-scoped <code>Error</code></td></tr>
<tr><td style="padding:0.5rem;"><strong>Test Step</strong></td><td style="padding:0.5rem;"><code>TestStepStart</code>, <code>TestStepEnd</code> (TestStatus), <code>Measurement</code>, <code>MeasurementSeries*</code>, <code>Diagnosis</code>, <code>Error</code>, <code>Log</code>, <code>File</code>, <code>Extension</code>, <code>Metadata</code></td></tr></table>
<h4>Key enums</h4>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Enum</th><th style="text-align:left; padding:0.5rem;">Values (representative)</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>DiagnosisType</code></td><td style="padding:0.5rem;">PASS / FAIL / UNKNOWN</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>TestResult</code></td><td style="padding:0.5rem;">PASS / FAIL / NOT_APPLICABLE</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>TestStatus</code></td><td style="padding:0.5rem;">COMPLETE / ERROR / SKIP</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>ValidatorType</code></td><td style="padding:0.5rem;">LESS_THAN_OR_EQUAL / GREATER_THAN_OR_EQUAL / EQUAL / …</td></tr>
<tr><td style="padding:0.5rem;">Others</td><td style="padding:0.5rem;"><code>Severity</code>, <code>SoftwareType</code>, <code>SubcomponentType</code></td></tr></table>
<h4>Streaming &amp; incremental reporting</h4>
<p>Every artifact carries a <code>sequenceNumber</code> and a <code>timestamp</code>. Combined with the line-delimited format and the <code>MeasurementSeries</code> trio, this lets very-long-running tests report <strong>incrementally</strong> — a consumer sees progress and partial results while the test is still executing, instead of a single blob at the end. The design goals are therefore <strong>Standardization</strong>, <strong>Structured Output</strong>, <strong>Portability</strong>, and <strong>Extensibility</strong> (via the <code>Extension</code> artifact and <code>Metadata</code>).</p>`
    },
    {
      "title": "4. Measurements, Validators & Diagnoses",
      "content": `<p>Inside a step, the framework separates <em>what was observed</em> from <em>whether it passed</em>. A <code>Measurement</code> records an observed value; a <code>Validator</code> attached to it encodes the pass/fail limit; a <code>Diagnosis</code> records the resulting verdict with a <code>DiagnosisType</code>.</p>
${ocpValidatorFlowSVG()}
<h4>How pass/fail is encoded</h4>
<p>A <code>Measurement</code> may carry one or more <strong>Validators</strong>. Each Validator has a <code>ValidatorType</code> (for example <code>LESS_THAN_OR_EQUAL</code>, <code>GREATER_THAN_OR_EQUAL</code>, <code>EQUAL</code>) plus a limit value, so the pass/fail rule travels <em>with</em> the data. A Measurement may also reference a <code>HardwareInfo</code> or a <code>Subcomponent</code> so the result is tied to a specific part of the DUT.</p>
<h4>Worked example — a Measurement with a Validator</h4>
<pre><code>{
  "testStepArtifact": {
    "testStepId": "1",
    "measurement": {
      "name": "cpu0_core_temp_c",
      "unit": "Celsius",
      "value": 71.5,
      "hardwareInfoId": "cpu0",
      "validators": [
        {
          "name": "max operating temperature",
          "type": "LESS_THAN_OR_EQUAL",
          "value": 95.0
        }
      ]
    }
  },
  "sequenceNumber": 42,
  "timestamp": "2024-05-01T10:15:30.123Z"
}</code></pre>
<p>Here the observed 71.5&nbsp;&deg;C is compared against the <code>LESS_THAN_OR_EQUAL</code> limit of 95.0 — the value is within limit, so a corresponding <code>Diagnosis</code> would record <code>DiagnosisType = PASS</code>. Note the <code>sequenceNumber</code> and <code>timestamp</code> on the artifact itself.</p>
<h4>The Diagnosis verdict</h4>
<pre><code>{
  "testStepArtifact": {
    "testStepId": "1",
    "diagnosis": {
      "verdict": "cpu0-temp-within-limit",
      "type": "PASS",
      "message": "cpu0 core temperature 71.5C <= 95.0C limit",
      "hardwareInfoId": "cpu0"
    }
  },
  "sequenceNumber": 43,
  "timestamp": "2024-05-01T10:15:30.140Z"
}</code></pre>
<p>The verdict is carried by the <code>type</code> field (text), never by colour — which is exactly how the diagrams in this topic show PASS vs FAIL as well, so the result is unambiguous to a colour-vision-deficient reader.</p>`
    },
    {
      "title": "5. Producer-side SDKs (C++ / Python / Go)",
      "content": `<p>The <strong>producer</strong> side is where a diagnostic author lives. An SDK gives ergonomic APIs — start a <code>TestRun</code>, add a <code>TestStep</code>, record <code>Measurement</code>s with <code>Validator</code>s, emit <code>Diagnosis</code> / <code>Error</code> / <code>Log</code> — and takes care of serializing all of that into the spec-compliant, line-delimited JSON artifact stream. The author never hand-writes JSON.</p>
<h4>The official SDKs</h4>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">SDK</th><th style="text-align:left; padding:0.5rem;">Notes</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>ocp-diag-core-cpp</code></td><td style="padding:0.5rem;">Bazel-based C++ API; can also serve Python via bindings</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>ocp-diag-core-python</code></td><td style="padding:0.5rem;">Pure-Python implementation emitting spec-compliant output</td></tr>
<tr><td style="padding:0.5rem;">Go bindings</td><td style="padding:0.5rem;">Community Go bindings also exist</td></tr></table>
<h4>Illustrative Python sketch</h4>
<pre><code># Illustrative use of a producer SDK (ocp-diag-core-python style).
# The SDK serializes each call into a compliant JSON artifact on stdout.
import ocptv.output as tv
from ocptv.output import TestResult, TestStatus, DiagnosisType, Validator, ValidatorType

run = tv.TestRun(name="server-burnin", version="1.0")
run.start(dut=tv.Dut(id="dut0", name="rack3-node7"))   # -> TestRunStart (+ DutInfo)

step = run.add_step("cpu-thermal")
step.start()                                            # -> TestStepStart

temp = 71.5
step.add_measurement(
    name="cpu0_core_temp_c", value=temp, unit="Celsius",
    validators=[Validator(type=ValidatorType.LESS_THAN_OR_EQUAL, value=95.0)],
)                                                       # -> Measurement (+ Validator)

verdict = DiagnosisType.PASS if temp <= 95.0 else DiagnosisType.FAIL
step.add_diagnosis(verdict, verdict="cpu0-temp-within-limit")  # -> Diagnosis

step.end(status=TestStatus.COMPLETE)                    # -> TestStepEnd
run.end(status=TestStatus.COMPLETE, result=TestResult.PASS)    # -> TestRunEnd</code></pre>
<p>Each highlighted call maps directly to an artifact in the stream (shown in the comments). Because the serialization is the SDK's job, the same test logic emits byte-for-byte compliant output whether it is written in C++, Python or Go — which is what makes the output <em>portable</em> across the consumer tools in the next section.</p>`
    },
    {
      "title": "6. Test Runners & Tooling (AutoVal, CTAM)",
      "content": `<p>Above a single diagnostic sit <strong>test runners</strong> — frameworks that orchestrate diagnostics across one or many hosts, collect their artifact streams, and present results. They are part of the <em>execution</em> architecture: they drive producers and route the output to consumers.</p>
<h4>AutoVal</h4>
<ul>
<li><code>ocp-diag-autoval</code> — a test-runner framework from Meta that provides validation functionality and utilities.</li>
<li>Supports a <strong>single host or multiple hosts</strong>, so the same diagnostics scale from a lab bench to a fleet.</li>
<li><code>autoval-ssd</code> is the <strong>SSD-qualification variant</strong> built on AutoVal.</li>
</ul>
<h4>CTAM</h4>
<ul>
<li><code>ocp-diag-ctam</code> — the <strong>Compliance Tool for Accelerator/Management</strong>.</li>
<li>A <strong>Redfish-based compliance test suite</strong> that validates management interfaces against expectations.</li>
</ul>
<h4>Where runners fit in the architecture</h4>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Component</th><th style="text-align:left; padding:0.5rem;">Produces or consumes?</th><th style="text-align:left; padding:0.5rem;">Role</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>SDK</strong></td><td style="padding:0.5rem;">Produces</td><td style="padding:0.5rem;">Serializes compliant artifacts for one diagnostic</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Diagnostic</strong></td><td style="padding:0.5rem;">Produces</td><td style="padding:0.5rem;">The actual test exercising hardware</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>AutoVal / CTAM</strong></td><td style="padding:0.5rem;">Orchestrates + consumes</td><td style="padding:0.5rem;">Runs diagnostics (single/multi host), collects streams</td></tr>
<tr><td style="padding:0.5rem;"><strong>MES / lab DB / ML</strong></td><td style="padding:0.5rem;">Consumes</td><td style="padding:0.5rem;">Stores, decides, automates at fleet scale</td></tr></table>
<p>Because every diagnostic emits the same artifact stream, a runner does not need bespoke parsing per test — it reads the standard format from any compliant producer, which is the whole point of fixing the output spec.</p>`
    },
    {
      "title": "7. Compliant Diagnostics in Practice",
      "content": `<p>On the <em>consumer / implementer</em> side there is a growing set of ready-made, OCP-compliant diagnostics. Each wraps a well-known Linux hardware test and emits the standard artifact stream, so they drop straight into any compliant runner.</p>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Diagnostic</th><th style="text-align:left; padding:0.5rem;">Wraps</th><th style="text-align:left; padding:0.5rem;">Exercises</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>ocp-diag-sat</code></td><td style="padding:0.5rem;">Google's Stressful Application Test (SAT)</td><td style="padding:0.5rem;">Server / storage burn-in</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>ocp-diag-memtester</code></td><td style="padding:0.5rem;">the <code>memtester</code> tool</td><td style="padding:0.5rem;">DIMM / embedded memory pattern test</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>ocp-diag-pcicrawler</code></td><td style="padding:0.5rem;">PCIe bus walk + AER</td><td style="padding:0.5rem;">PCIe health, Advanced Error Reporting</td></tr>
<tr><td style="padding:0.5rem;"><code>ocp-diag-ssd-qual</code></td><td style="padding:0.5rem;"><code>fio</code> (Linux storage benchmark)</td><td style="padding:0.5rem;">NVMe / SSD qualification</td></tr></table>
<h4>Streaming in action — the memtester example</h4>
<p><code>ocp-diag-memtester</code> is a concrete illustration of the incremental-reporting design. It wraps the <code>memtester</code> tool and <strong>parses that tool's output at runtime</strong> — using <strong>SLY</strong>, a Python lex/yacc library — so it can report <em>partial</em> results while the test is still running, rather than only at the end.</p>
<pre><code># Conceptual: memtester prints progress for each pattern as it runs.
# The OCP wrapper parses each line with SLY and emits a MeasurementSeries,
# so a consumer sees progress live (every artifact has seq# + timestamp):

memtester 1G 1            # underlying tool, long-running
  Stuck Address       : ok           -> MeasurementSeriesElement (seq 10)
  Random Value        : ok           -> MeasurementSeriesElement (seq 11)
  Compare XOR         : ok           -> MeasurementSeriesElement (seq 12)
  ...                                     (stream continues as patterns finish)</code></pre>
<p>This is the payoff of the line-delimited stream + <code>MeasurementSeries</code> + <code>sequenceNumber</code>/<code>timestamp</code> design from section 3: a multi-hour memory test is observable the whole time. These diagnostics touch the same subsystems covered elsewhere on the site (PCIe/AER, NVMe, memory) — see those topics for the kernel-side detail; here the point is how their results become standardized artifacts.</p>`
    },
    {
      "title": "8. Integration & Fleet / ML Use",
      "content": `<p>The final architectural pillar is what happens <em>after</em> the stream is produced. Because the output is standardized and structured, it integrates cleanly with the systems that consume test results across design, manufacturing and operations.</p>
${ocpExecutionFlowSVG()}
<h4>End-to-end integration</h4>
<ul>
<li><strong>Test executives</strong> read the stream live, make pass/fail decisions per step, and drive the next action.</li>
<li><strong>MES (manufacturing execution systems)</strong> record which units passed which diagnostics on the line, tying results to serial numbers / subcomponents.</li>
<li><strong>Lab &amp; data-center data collection</strong> archive the artifacts for later comparison across the life cycle.</li>
<li><strong>Repair automation</strong> — because the same structured output is available at fleet scale, heuristic and ML-based systems can mine it for troubleshooting and automated repair decisions.</li>
</ul>
<h4>Why structure matters here</h4>
<p>A free-form log is hard to mine; a stream of typed artifacts with explicit <code>Measurement</code>/<code>Validator</code>/<code>Diagnosis</code> relationships, stable enums, and per-artifact <code>sequenceNumber</code>/<code>timestamp</code> is machine-friendly. That is what lets the <em>same</em> diagnostic data drive a bench engineer's console, a factory MES, and a fleet-scale ML repair model without re-instrumentation — the architecture and the output spec are two sides of the same goal.</p>
<h4>Where it fits for a Linux engineer</h4>
<p>These diagnostics run on Linux hosts and exercise Linux hardware paths — memory, PCIe/AER, NVMe/SSD via <code>fio</code>, NICs — and their JSON output is consumed by lab / MES / fleet systems. If you work on the kernel side of those subsystems, OCP Diag is the framework that turns your hardware's behaviour into portable, comparable, fleet-wide evidence.</p>
<h4>References</h4>
<ul>
<li><a href="https://github.com/opencomputeproject/ocp-diag-core" target="_blank">ocp-diag-core (core repo + Output Specification)</a></li>
<li><a href="https://github.com/opencomputeproject/ocp-diag-core-python" target="_blank">ocp-diag-core-python</a> &nbsp;|&nbsp; <a href="https://github.com/opencomputeproject/ocp-diag-core-cpp" target="_blank">ocp-diag-core-cpp</a></li>
<li><a href="https://github.com/opencomputeproject/ocp-diag-autoval" target="_blank">ocp-diag-autoval</a> &nbsp;|&nbsp; <a href="https://github.com/opencomputeproject/ocp-diag-ctam" target="_blank">ocp-diag-ctam</a></li>
<li><a href="https://www.opencompute.org/projects/hardware-management" target="_blank">Open Compute Project — Hardware Management / Test &amp; Validation</a></li>
</ul>`
    },
    {
      "title": "9. Strengths & Limitations Analysis (優缺點分析)",
      "content": `<p>This section is a deliberately <strong>balanced, technical</strong> appraisal of the OCP Diag framework — not a sales pitch. The framework solves real problems, but every design choice carries a cost, and knowing both sides is what lets a team decide whether to adopt it, wrap existing tools, or stay with a proprietary suite.</p>
<h4>Strengths</h4>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Strength</th><th style="text-align:left; padding:0.5rem;">Description</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Standardized, machine-readable output</strong></td><td style="padding:0.5rem;">The JSON artifact stream (<code>SchemaVersion</code>, <code>TestRun</code>, <code>TestStep</code>, <code>Measurement</code>, <code>Diagnosis</code>) is a <em>common contract</em>. A lab engineer, an MES, and a fleet-scale ML repair model all read the same shape — versus ad-hoc text output that forces every consumer to write and maintain its own parser.</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Life-cycle portability</strong></td><td style="padding:0.5rem;">The same diagnostic and the same output run unchanged from bringup through integration, reliability test, manufacturing, data-center operations and RMA / reverse logistics. The alternative is a separate suite — and separate output formats — per phase.</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Incremental / streaming reporting</strong></td><td style="padding:0.5rem;">The <code>sequenceNumber</code> + <code>timestamp</code> on every artifact let long-running tests (memory burn-in, SSD endurance) emit partial results in real time: live monitoring, early-abort on first failure, and partial-result archival even if the host later crashes.</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Reusable SDKs</strong></td><td style="padding:0.5rem;">The C++ and Python SDKs remove compliant-JSON boilerplate, so a diagnostic author writes hardware-exercise logic rather than hand-serializing the spec.</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Extensibility without breakage</strong></td><td style="padding:0.5rem;">The <code>Extension</code> artifact and <code>Metadata</code> let a vendor add proprietary fields without violating the contract — consumers that do not understand the extension simply ignore it.</td></tr>
<tr><td style="padding:0.5rem;"><strong>Open governance</strong></td><td style="padding:0.5rem;">Maintained in the open under the Open Compute Project, so there is no single-vendor lock-in and the spec is community-reviewed and public.</td></tr></table>
<p>The through-line of the strengths is <em>leverage</em>: fixing one output contract lets a single diagnostic effort be reused across every life-cycle stage and consumed by everything from a bench console to a fleet ML model. The streaming design turns multi-hour tests from opaque black boxes into observable processes, and the SDK plus <code>Extension</code> model keeps the barrier to writing a compliant diagnostic low while still allowing vendor-specific data. These benefits compound at scale — the larger the fleet and the more partners in the supply chain, the more a shared, machine-readable contract pays off.</p>
<h4>Limitations</h4>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Limitation</th><th style="text-align:left; padding:0.5rem;">Description</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Adoption barrier</strong></td><td style="padding:0.5rem;">An existing proprietary diagnostic suite needs non-trivial re-instrumentation or wrapping to become compliant. The <code>ocp-diag-memtester</code> wrapper — which uses SLY to parse <code>memtester</code>'s runtime text into OCP artifacts — shows both the solution and its cost: someone has to build and maintain that translation layer.</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Schema rigidity vs expressiveness</strong></td><td style="padding:0.5rem;">The fixed artifact types (<code>Measurement</code>, <code>Diagnosis</code>, <code>Error</code>, <code>Log</code>, <code>File</code>, <code>Extension</code>) cover the common cases, but edge cases — multi-dimensional measurements, correlated failure clusters, conditional / branching test-step flows — get shoehorned into <code>Extension</code> / <code>Metadata</code>, which quietly erodes the standardization benefit the spec exists to provide.</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Tooling maturity</strong></td><td style="padding:0.5rem;">AutoVal and CTAM exist, but the surrounding ecosystem is young next to established proprietary frameworks such as NI TestStand or Keysight PathWave. IDE / debugger integration, out-of-the-box GUI dashboards, and ready-made analytics are limited — teams often build their own.</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Validator model simplicity</strong></td><td style="padding:0.5rem;">Validators do per-measurement limit checks (<code>LESS_THAN</code>, <code>EQUAL</code>, <code>REGEX_MATCH</code> and so on) but offer no native cross-measurement correlation, multi-variate pass/fail, or statistical-process-control rules. Any such logic lives downstream, outside the spec.</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Ecosystem fragmentation risk</strong></td><td style="padding:0.5rem;">Multiple SDK languages, independently maintained compliant diagnostics, and vendor <code>Extension</code>s together create room for subtle incompatibilities unless schema versioning is applied strictly.</td></tr>
<tr><td style="padding:0.5rem;"><strong>Documentation &amp; community size</strong></td><td style="padding:0.5rem;">The specification itself is thorough, but tutorials, worked examples beyond the quickstart, and active community channels are sparse relative to mainstream test frameworks — the learning curve is steeper than the spec's quality alone would suggest.</td></tr></table>
<p>The limitations share a root cause: the value of a standard comes from everyone agreeing to the same fixed shape, and that same fixity is what makes unusual requirements awkward and migration expensive. The <code>Extension</code> escape hatch keeps the framework usable for edge cases, but every use of it is a small retreat from standardization. The young tooling and thin documentation are maturity problems that time can fix; the schema-rigidity and simple-validator trade-offs are more fundamental, and a team with heavy multi-variate or SPC analysis needs should expect to build that layer themselves on top of the stream rather than find it in the spec.</p>
<h4>Reading the trade-off</h4>
<p>Net, OCP Diag is strongest where <em>breadth and scale</em> dominate — many partners, many life-cycle stages, large fleets — and weakest where a single team needs deep, specialized analysis inside a mature turnkey tool. Adoption is rarely all-or-nothing: wrapping one high-value diagnostic (as the memtester example does) is a common, low-risk first step that proves the contract before a broader migration.</p>`
    },
    {
      "title": "10. Efficiency & Performance Analysis (效率分析)",
      "content": `<p>Structured output is not free. Every <code>Measurement</code>, <code>Diagnosis</code> and <code>Log</code> is a full JSON object carrying schema fields, a <code>timestamp</code> and a <code>sequenceNumber</code>. This section looks at where that cost actually bites, where it is negligible, and how the spec's own features let you manage it.</p>
<h4>Where the overhead comes from</h4>
<ul>
<li><strong>JSON serialization per artifact.</strong> Consider a tight C diagnostic walking memory and checking patterns at <em>millions of addresses per second</em>. If it serialized one JSON <code>Measurement</code> per address, the formatting plus the stream writes would dominate — the diagnostic would spend more time producing output than exercising hardware. Compare this to a binary protocol or even a bare exit code, where emitting a result is almost free.</li>
<li><strong>Streaming vs batch I/O.</strong> Streaming (one line per artifact, flushed as it goes) buys real-time observability but costs a serialization step and an I/O syscall per artifact. A single batched report at the end is far cheaper on I/O but loses incremental reporting entirely. The spec's <code>MeasurementSeries</code> (a <code>MeasurementSeriesStart</code>, many lightweight <code>MeasurementSeriesElement</code>s, then a <code>MeasurementSeriesEnd</code>) is the middle ground: batch-like semantics <em>within</em> the live stream, so you keep observability without a full artifact envelope per sample.</li>
<li><strong>SDK abstraction cost.</strong> The SDKs add function calls, object construction and serialization over raw I/O. In C++ (compiled, with zero-copy or fast JSON libraries such as nlohmann/json or simdjson) that overhead is small. In Python (interpreted, a <code>json.dumps</code> per artifact) it is measurable inside a tight loop. It matters for high-frequency measurement diagnostics; it is noise for I/O- or hardware-bound subsystem tests.</li>
</ul>
<h4>Comparison of output approaches</h4>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Approach</th><th style="text-align:left; padding:0.5rem;">Serialization overhead</th><th style="text-align:left; padding:0.5rem;">Structure</th><th style="text-align:left; padding:0.5rem;">Trade-off</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Plain text / log</strong></td><td style="padding:0.5rem;">Very low</td><td style="padding:0.5rem;">None</td><td style="padding:0.5rem;">Cheapest to emit, but every consumer writes a custom, fragile parser</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>OCP JSON</strong></td><td style="padding:0.5rem;">Moderate</td><td style="padding:0.5rem;">Rich, self-describing</td><td style="padding:0.5rem;">Human-inspectable and standardized; heavier per artifact than binary</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Binary / protobuf</strong></td><td style="padding:0.5rem;">Low</td><td style="padding:0.5rem;">Rich (schema)</td><td style="padding:0.5rem;">Smaller and faster than JSON, but not human-readable and the schema must be distributed to every consumer</td></tr>
<tr><td style="padding:0.5rem;"><strong>XML</strong></td><td style="padding:0.5rem;">High</td><td style="padding:0.5rem;">Rich, verbose</td><td style="padding:0.5rem;">Most verbose of the four — larger payloads and heavier parsing</td></tr></table>
<p>OCP's choice of line-delimited JSON is a deliberate midpoint: more overhead than raw text or binary, but human-inspectable, self-describing, and parseable one line at a time without a full-document reader. Being line-delimited is itself an efficiency feature — a consumer processes each artifact as a single line and never has to buffer and parse one giant document.</p>
<h4>Scaling across a fleet</h4>
<p>Running the same diagnostic across thousands of hosts does <em>not</em> stress the spec — each host serializes its own output independently. The bottleneck moves to <strong>ingestion</strong>: parsing thousands of concurrent JSON streams on the collection side. Line-delimited JSON helps directly (process per line, no whole-document parse), and the usual answer is event-stream ingestion — pipelines built on Kafka, Fluentd or similar — that treat each artifact line as an event. The spec scales because the per-host cost is bounded and the aggregation is a solved data-engineering problem.</p>
<h4>Decision: how to emit by measurement rate</h4>
<p>The practical lever a diagnostic author controls is <em>granularity</em>. The flow chart below captures the rule of thumb: aggregate only when the measurement rate is high enough that per-artifact serialization would compete with the hardware access itself.</p>
${ocpEfficiencyFlowSVG()}
<h4>Practical guidance</h4>
<ul>
<li>For the <strong>vast majority</strong> of hardware validation — boot checks, peripheral probes, firmware-version queries, moderate sensor sweeps — the JSON overhead is negligible next to the hardware access latency it is reporting on. Emit a per-measurement artifact and keep the code simple.</li>
<li>It <strong>only</strong> matters for ultra-high-frequency measurement loops, such as memory-pattern tests running at millions of operations per second. There, do not emit one artifact per address: aggregate into a <code>MeasurementSeries</code>, or emit summary <code>Measurement</code>s (min / max / fail-count over a window) instead of per-sample ones.</li>
<li>Pick the SDK to match the loop: a C++ diagnostic for the tightest high-frequency paths, Python where author velocity matters more than per-artifact cost.</li>
</ul>
<p>In short, the efficiency question is almost always answered by granularity, not by abandoning the format. The spec gives you the tools — <code>MeasurementSeries</code>, summary measurements, line-delimited streaming — to keep structured, standardized output affordable even in the demanding cases.</p>`
    }
  ]
};
