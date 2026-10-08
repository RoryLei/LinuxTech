/**
 * Topic: EEVDF (Earliest Eligible Virtual Deadline First)
 */

/* Accessible palette + SVG helpers. These MUST be declared ABOVE
 * `const TOPIC_EEVDF = {` because the topic object literal is evaluated at
 * load time and its section `content` strings call these helpers. A const
 * or function referenced before its declaration throws a temporal-dead-zone
 * ReferenceError at load that blanks the whole site, and `node --check`
 * does NOT catch it — only an actual runtime execution does.
 *
 * ACCESSIBILITY (site owner is 色弱 / color-vision-deficient): NO color
 * carries meaning. ONE neutral-blue hue for every box (#cfe3ff fill,
 * #1f2d3d stroke) on a #0d1117 background. Identity/meaning is carried by
 * NUMBER badges + position + shape (diamond = decision) + arrows + text,
 * never by hue. Eligible vs ineligible and pick vs skip are shown by text,
 * label, and shape only. */
const EEVDF_BOX_FILL = "#cfe3ff";
const EEVDF_BOX_STROKE = "#1f2d3d";
const EEVDF_TEXT = "#0f172a";
const EEVDF_NOTE = "#c9d4e0";
const EEVDF_ARROW = "#9db4cc";
const EEVDF_BG = "#0d1117";

function eevdfBox(x, y, w, h, label, badge) {
  const cy = y + h / 2;
  const r = 13;
  let s =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ` +
    `fill="${EEVDF_BOX_FILL}" stroke="${EEVDF_BOX_STROKE}" stroke-width="1.5"></rect>`;
  if (badge !== undefined) {
    s +=
      `<circle cx="${x + r + 4}" cy="${cy}" r="${r}" fill="${EEVDF_BOX_STROKE}"></circle>` +
      `<text x="${x + r + 4}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="13" font-weight="700" fill="#ffffff">${badge}</text>`;
  }
  const tx = badge !== undefined ? x + r + 4 + (w - r - 4) / 2 : x + w / 2;
  s +=
    `<text x="${tx}" y="${cy + 5}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="14" font-weight="600" fill="${EEVDF_TEXT}">${label}</text>`;
  return s;
}

// A box with left-aligned text (used for wide flow-step boxes).
function eevdfStepBox(x, y, w, h, label, badge) {
  const cy = y + h / 2;
  const r = 13;
  let s =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ` +
    `fill="${EEVDF_BOX_FILL}" stroke="${EEVDF_BOX_STROKE}" stroke-width="1.5"></rect>`;
  if (badge !== undefined) {
    s +=
      `<circle cx="${x + r + 4}" cy="${cy}" r="${r}" fill="${EEVDF_BOX_STROKE}"></circle>` +
      `<text x="${x + r + 4}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="13" font-weight="700" fill="#ffffff">${badge}</text>`;
  }
  s +=
    `<text x="${x + (badge !== undefined ? r + 24 : 14)}" y="${cy + 4}" ` +
    `font-family="sans-serif" font-size="12.5" fill="${EEVDF_TEXT}">${label}</text>`;
  return s;
}

// A diamond decision node (shape, not color, carries the "gate" meaning).
function eevdfDiamond(cx, cy, halfW, halfH, label) {
  let s =
    `<polygon points="${cx},${cy - halfH} ${cx + halfW},${cy} ${cx},${cy + halfH} ${cx - halfW},${cy}" ` +
    `fill="${EEVDF_BOX_FILL}" stroke="${EEVDF_BOX_STROKE}" stroke-width="1.5"></polygon>`;
  s +=
    `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="12" font-weight="600" fill="${EEVDF_TEXT}">${label}</text>`;
  return s;
}

function eevdfVArrow(x, y1, y2) {
  return (
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${EEVDF_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x - 5},${y2 - 6} ${x + 5},${y2 - 6} ${x},${y2}" fill="${EEVDF_ARROW}"></polygon>`
  );
}

function eevdfHArrow(x1, y, x2) {
  const dir = x2 >= x1 ? 1 : -1;
  return (
    `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${EEVDF_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x2 - dir * 7},${y - 5} ${x2 - dir * 7},${y + 5} ${x2},${y}" fill="${EEVDF_ARROW}"></polygon>`
  );
}

function eevdfFrame(viewW, viewH, title, subtitle, body, ariaLabel) {
  return (
    `<div style="overflow-x:auto; margin:1rem 0; padding:1rem; background:${EEVDF_BG}; ` +
    `border:1px solid #30363d; border-radius:8px;">` +
    `<div style="text-align:center; font-weight:700; font-size:1.05rem; color:#58a6ff; margin-bottom:0.25rem;">${title}</div>` +
    `<div style="text-align:center; font-size:0.85rem; color:#8b949e; margin-bottom:0.75rem;">${subtitle}</div>` +
    `<svg viewBox="0 0 ${viewW} ${viewH}" width="100%" role="img" aria-label="${ariaLabel}">${body}</svg>` +
    `</div>`
  );
}

/* Diagram A (section 3, most important): EEVDF task-selection FLOW CHART.
 * Top-to-bottom numbered steps with the two key gates (eligible filter,
 * earliest-deadline pick) drawn as DIAMOND decision shapes, and a right-
 * side loop-back arrow returning to the next scheduling decision. */
function eevdfSelectionFlowSVG() {
  const w = 760, boxW = 470, boxX = 150, h = 44, gap = 26;
  let body = "";
  const topY = 20;

  // Start node (rounded box, explicitly labeled as the trigger).
  body += eevdfStepBox(boxX, topY, boxW, h, "Start: scheduling decision (tick / wakeup / task blocks)");
  body += eevdfVArrow(boxX + boxW / 2, topY + h, topY + h + gap);

  // Step 1
  const y1 = topY + h + gap;
  body += eevdfStepBox(boxX, y1, boxW, h, "Advance the virtual clock (by total weight of runnable tasks)", 1);
  body += eevdfVArrow(boxX + boxW / 2, y1 + h, y1 + h + gap);

  // Step 2 — eligible filter GATE, drawn as a diamond.
  const y2 = y1 + h + gap;
  const dH = 56;
  const dcx = boxX + boxW / 2;
  const dcy = y2 + dH / 2;
  body += eevdfDiamond(dcx, dcy, 240, dH / 2, "");
  body +=
    `<text x="${dcx}" y="${dcy - 4}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="12" font-weight="700" fill="${EEVDF_TEXT}">(2) Eligible filter gate</text>` +
    `<text x="${dcx}" y="${dcy + 13}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="11.5" fill="${EEVDF_TEXT}">compute lag; keep tasks with lag &gt;= 0 as ELIGIBLE</text>`;
  body += eevdfVArrow(dcx, y2 + dH, y2 + dH + gap);

  // Step 3 — earliest-deadline pick GATE, drawn as a diamond.
  const y3 = y2 + dH + gap;
  const d2cy = y3 + dH / 2;
  body += eevdfDiamond(dcx, d2cy, 240, dH / 2, "");
  body +=
    `<text x="${dcx}" y="${d2cy - 4}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="12" font-weight="700" fill="${EEVDF_TEXT}">(3) Earliest-deadline pick gate</text>` +
    `<text x="${dcx}" y="${d2cy + 13}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="11.5" fill="${EEVDF_TEXT}">among ELIGIBLE, pick the EARLIEST virtual deadline</text>`;
  body += eevdfVArrow(dcx, y3 + dH, y3 + dH + gap);

  // Step 4
  const y4 = y3 + dH + gap;
  body += eevdfStepBox(boxX, y4, boxW, h, "Run it for up to its requested slice r", 4);
  body += eevdfVArrow(boxX + boxW / 2, y4 + h, y4 + h + gap);

  // Step 5
  const y5 = y4 + h + gap;
  body += eevdfStepBox(boxX, y5, boxW, h, "Charge CPU used; update lag/vruntime; recompute virtual deadline", 5);

  // Loop-back arrow (right side) from step 5 up to the Start node.
  const rbx = boxX + boxW + 34;
  body +=
    `<line x1="${boxX + boxW}" y1="${y5 + h / 2}" x2="${rbx}" y2="${y5 + h / 2}" stroke="${EEVDF_ARROW}" stroke-width="2"></line>` +
    `<line x1="${rbx}" y1="${y5 + h / 2}" x2="${rbx}" y2="${topY + h / 2}" stroke="${EEVDF_ARROW}" stroke-width="2"></line>` +
    `<line x1="${rbx}" y1="${topY + h / 2}" x2="${boxX + boxW}" y2="${topY + h / 2}" stroke="${EEVDF_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${boxX + boxW + 7},${topY + h / 2 - 5} ${boxX + boxW + 7},${topY + h / 2 + 5} ${boxX + boxW},${topY + h / 2}" fill="${EEVDF_ARROW}"></polygon>` +
    `<text x="${rbx + 8}" y="${(topY + y5) / 2 + h / 2 - 8}" font-family="sans-serif" font-size="11.5" fill="${EEVDF_NOTE}">next</text>` +
    `<text x="${rbx + 8}" y="${(topY + y5) / 2 + h / 2 + 8}" font-family="sans-serif" font-size="11.5" fill="${EEVDF_NOTE}">decision</text>`;

  const vh = y5 + h + 16;
  return eevdfFrame(
    w, vh,
    "EEVDF Task-Selection Flow Chart",
    "A scheduling decision (tick / wakeup / block) advances the virtual clock (1), filters to ELIGIBLE tasks with lag >= 0 (2), picks the EARLIEST virtual deadline among them (3), runs it for slice r (4), then charges CPU and recomputes lag / deadline (5) before the next decision",
    body,
    "Flow chart of the EEVDF scheduling loop, read top to bottom. It starts at a scheduling decision triggered by a timer tick, a wakeup, or a task blocking. Step 1 advances the virtual clock by the total weight of runnable tasks. Step 2 is the eligible-filter gate, drawn as a diamond: it computes each task's lag and keeps only tasks whose lag is greater than or equal to zero as eligible. Step 3 is the earliest-deadline-pick gate, also a diamond: among the eligible tasks it selects the one with the earliest virtual deadline. Step 4 runs that task for up to its requested slice r. Step 5 charges the CPU time used and updates the task's lag, virtual runtime, and virtual deadline. A loop-back arrow then returns to the next scheduling decision."
  );
}

/* Diagram B (section 2): lag / eligibility number-line + two example tasks
 * showing smaller slice -> earlier deadline, larger slice -> later. */
function eevdfLagEligibilitySVG() {
  const w = 760;
  let body = "";

  // --- Lag number-line ---
  const lineY = 70, x0 = 60, x1 = 700, threshX = 380;
  body += `<text x="${x0}" y="34" font-family="sans-serif" font-size="13" font-weight="700" fill="${EEVDF_NOTE}">Lag number-line (eligibility threshold at lag = 0)</text>`;
  body += eevdfHArrow(x0, lineY, x1);
  // threshold marker
  body +=
    `<line x1="${threshX}" y1="${lineY - 22}" x2="${threshX}" y2="${lineY + 22}" stroke="${EEVDF_BOX_STROKE}" stroke-width="2"></line>` +
    `<text x="${threshX}" y="${lineY - 28}" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="${EEVDF_NOTE}">lag = 0 (exactly fair)</text>`;
  // left region: lag < 0 -> NOT eligible yet
  body +=
    `<text x="${(x0 + threshX) / 2}" y="${lineY + 42}" text-anchor="middle" font-family="sans-serif" font-size="12.5" font-weight="700" fill="${EEVDF_NOTE}">lag &lt; 0 : ahead</text>` +
    `<text x="${(x0 + threshX) / 2}" y="${lineY + 60}" text-anchor="middle" font-family="sans-serif" font-size="12" fill="${EEVDF_NOTE}">NOT eligible yet</text>`;
  // right region: lag > 0 -> eligible
  body +=
    `<text x="${(threshX + x1) / 2}" y="${lineY + 42}" text-anchor="middle" font-family="sans-serif" font-size="12.5" font-weight="700" fill="${EEVDF_NOTE}">lag &gt; 0 : owed</text>` +
    `<text x="${(threshX + x1) / 2}" y="${lineY + 60}" text-anchor="middle" font-family="sans-serif" font-size="12" fill="${EEVDF_NOTE}">ELIGIBLE (ran less than fair)</text>`;

  // --- Two example tasks: deadline ordering by horizontal position ---
  const taskY = 185, bH = 56, bW = 300;
  body += `<text x="${x0}" y="${taskY - 14}" font-family="sans-serif" font-size="13" font-weight="700" fill="${EEVDF_NOTE}">Virtual deadline from requested slice (earlier = left = sooner)</text>`;
  // badge 1: small slice -> earlier deadline (left)
  body += eevdfBox(x0, taskY, bW, bH, "", 1);
  body +=
    `<text x="${x0 + 40}" y="${taskY + 22}" font-family="sans-serif" font-size="12.5" font-weight="700" fill="${EEVDF_TEXT}">small slice -&gt; EARLIER deadline</text>` +
    `<text x="${x0 + 40}" y="${taskY + 40}" font-family="sans-serif" font-size="11.5" fill="${EEVDF_TEXT}">runs sooner / more often, short bursts</text>`;
  // horizontal "earlier ... later" axis arrow between the two
  body += eevdfHArrow(x0 + bW + 10, taskY + bH / 2, x0 + bW + 90);
  body += `<text x="${x0 + bW + 50}" y="${taskY + bH / 2 - 10}" text-anchor="middle" font-family="sans-serif" font-size="11" fill="${EEVDF_NOTE}">later</text>`;
  // badge 2: large slice -> later deadline (right)
  const x2b = x0 + bW + 100;
  body += eevdfBox(x2b, taskY, bW, bH, "", 2);
  body +=
    `<text x="${x2b + 40}" y="${taskY + 22}" font-family="sans-serif" font-size="12.5" font-weight="700" fill="${EEVDF_TEXT}">large slice -&gt; LATER deadline</text>` +
    `<text x="${x2b + 40}" y="${taskY + 40}" font-family="sans-serif" font-size="11.5" fill="${EEVDF_TEXT}">runs less often, longer chunks</text>`;

  const vh = taskY + bH + 20;
  return eevdfFrame(
    w, vh,
    "Lag, Eligibility & Virtual Deadline",
    "A task with lag >= 0 is ELIGIBLE (owed or exactly fair); lag < 0 means it got ahead and is not eligible yet. A smaller requested slice yields an EARLIER virtual deadline (task 1, left), a larger slice a LATER deadline (task 2, right)",
    body,
    "Two-part diagram. The top is a lag number-line with the eligibility threshold at lag equals zero. To the left of the threshold, lag less than zero means the task got ahead of its fair share and is not eligible yet. At the threshold, lag equals zero is exactly fair. To the right, lag greater than zero means the task is owed time and is eligible because it ran less than its fair share. The bottom shows two example task boxes. Task 1, on the left, has a small requested slice giving it an earlier virtual deadline, so it runs sooner and more often in short bursts. Task 2, on the right, has a large requested slice giving it a later virtual deadline, so it runs less often in longer chunks. A horizontal arrow from task 1 to task 2 marks the earlier-to-later ordering by position."
  );
}

/* Diagram C (section 1): CFS vs EEVDF selection-rule, side-by-side panels. */
function eevdfCfsVsEevdfSVG() {
  const w = 760, panelW = 330, panelH = 150, pH = 70;
  let body = "";
  const topY = 24;
  const leftX = 40, rightX = w - 40 - panelW;

  // Panel 1: CFS
  body += eevdfBox(leftX, topY, panelW, pH, "", 1);
  body +=
    `<text x="${leftX + 38}" y="${topY + 28}" font-family="sans-serif" font-size="13.5" font-weight="700" fill="${EEVDF_TEXT}">CFS (&lt;= 6.5)</text>` +
    `<text x="${leftX + 38}" y="${topY + 48}" font-family="sans-serif" font-size="12" fill="${EEVDF_TEXT}">pick SMALLEST vruntime</text>` +
    `<text x="${leftX + 38}" y="${topY + 64}" font-family="sans-serif" font-size="12" fill="${EEVDF_TEXT}">(the task most behind)</text>`;
  body +=
    `<text x="${leftX}" y="${topY + pH + 36}" font-family="sans-serif" font-size="11.5" fill="${EEVDF_NOTE}">One gate: who is furthest behind?</text>` +
    `<text x="${leftX}" y="${topY + pH + 54}" font-family="sans-serif" font-size="11.5" fill="${EEVDF_NOTE}">Latency handled by heuristics / tunables.</text>`;

  // Panel 2: EEVDF
  body += eevdfBox(rightX, topY, panelW, pH, "", 2);
  body +=
    `<text x="${rightX + 38}" y="${topY + 24}" font-family="sans-serif" font-size="13.5" font-weight="700" fill="${EEVDF_TEXT}">EEVDF (&gt;= 6.6)</text>` +
    `<text x="${rightX + 38}" y="${topY + 42}" font-family="sans-serif" font-size="12" fill="${EEVDF_TEXT}">among ELIGIBLE (lag &gt;= 0),</text>` +
    `<text x="${rightX + 38}" y="${topY + 58}" font-family="sans-serif" font-size="12" fill="${EEVDF_TEXT}">pick EARLIEST virtual deadline</text>`;
  body +=
    `<text x="${rightX}" y="${topY + pH + 36}" font-family="sans-serif" font-size="11.5" fill="${EEVDF_NOTE}">Two gates: eligibility, then deadline.</text>` +
    `<text x="${rightX}" y="${topY + pH + 54}" font-family="sans-serif" font-size="11.5" fill="${EEVDF_NOTE}">Fairness + latency in one rule.</text>`;

  const vh = topY + panelH + 10;
  return eevdfFrame(
    w, vh,
    "Selection Rule: CFS vs EEVDF",
    "CFS (panel 1) picks the task with the smallest vruntime — the one most behind. EEVDF (panel 2) first filters to ELIGIBLE tasks (lag >= 0), then picks the earliest virtual deadline among them, unifying fairness and latency",
    body,
    "Side-by-side comparison of two selection rules in the single accessible blue style. Panel 1, on the left, is CFS for Linux 6.5 and earlier: it picks the task with the smallest virtual runtime, that is, the task most behind, using a single gate, and handles latency with separate heuristics and tunables. Panel 2, on the right, is EEVDF for Linux 6.6 and later: it first keeps only eligible tasks whose lag is greater than or equal to zero, then picks the earliest virtual deadline among them, using two gates to combine fairness and latency in one rule. The panels are distinguished by numbered badges, headings, and position, not by color."
  );
}

/* Section 3: INTERACTIVE step-through animation of EEVDF task selection.
 *
 * Returns an HTML string containing (a) a scoped wrapper #eevdf-anim-root,
 * (b) real <button> controls, (c) an SVG render target + caption + timeline,
 * and (d) an embedded <script> that drives a small state machine.
 *
 * MUST be declared ABOVE `const TOPIC_EEVDF = {` (temporal dead zone): the
 * object literal calls this at load time.
 *
 * ACCESSIBILITY: single neutral-blue hue (EEVDF_BOX_FILL / EEVDF_BOX_STROKE)
 * on EEVDF_BG. NO meaning is carried by color — eligible/ineligible,
 * running/waiting and earliest-deadline are all conveyed by TEXT labels,
 * numbered badges, position, and outline thickness.
 *
 * TRAP AVOIDANCE: the embedded <script> body below is assembled with PLAIN
 * single-quoted string concatenation only. It contains NO backtick and NO
 * dollar-brace sequence, so it cannot terminate the outer template literal
 * early. Keep it that way when editing. */
function eevdfAnimationBlock() {
  // Static chrome (safe to use a template literal here — no script yet).
  const chrome =
    `<div class="eevdf-anim" id="eevdf-anim-root" ` +
    `style="margin:1rem 0; padding:1rem; background:${EEVDF_BG}; ` +
    `border:1px solid #30363d; border-radius:8px;">` +
      `<div style="display:flex; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.75rem;">` +
        `<button type="button" id="eevdf-anim-play" aria-label="Play the EEVDF animation" ` +
          `style="font-size:16px; padding:0.4rem 0.9rem; border:2px solid #58a6ff; ` +
          `border-radius:6px; background:#161b22; color:#e6edf3; cursor:pointer;">&#9654; Play</button>` +
        `<button type="button" id="eevdf-anim-pause" aria-label="Pause the EEVDF animation" ` +
          `style="font-size:16px; padding:0.4rem 0.9rem; border:2px solid #58a6ff; ` +
          `border-radius:6px; background:#161b22; color:#e6edf3; cursor:pointer;">&#10073;&#10073; Pause</button>` +
        `<button type="button" id="eevdf-anim-step" aria-label="Advance the EEVDF animation one step" ` +
          `style="font-size:16px; padding:0.4rem 0.9rem; border:2px solid #58a6ff; ` +
          `border-radius:6px; background:#161b22; color:#e6edf3; cursor:pointer;">&#9654;&#9646; Step</button>` +
        `<button type="button" id="eevdf-anim-reset" aria-label="Reset the EEVDF animation to the start" ` +
          `style="font-size:16px; padding:0.4rem 0.9rem; border:2px solid #58a6ff; ` +
          `border-radius:6px; background:#161b22; color:#e6edf3; cursor:pointer;">&#8635; Reset</button>` +
        `<span id="eevdf-anim-stepreadout" aria-live="polite" ` +
          `style="font-size:15px; color:#8b949e; align-self:center; margin-left:0.25rem;">Step 0 / 6</span>` +
      `</div>` +
      `<svg id="eevdf-anim-svg" viewBox="0 0 760 300" width="100%" role="img" ` +
        `aria-label="EEVDF task-selection animation frame. Each task row shows its lag relative to the lag equals zero threshold, whether it is eligible or ineligible, its virtual deadline, and whether it is running or waiting, all labeled in text."></svg>` +
      `<p id="eevdf-anim-caption" aria-live="polite" ` +
        `style="font-size:0.95rem; color:#c9d4e0; margin:0.5rem 0 0 0; line-height:1.5;"></p>` +
    `</div>`;

  // Embedded driver script. PLAIN single-quoted concatenation only — no
  // backtick, no dollar-brace, so the outer template literal is never closed
  // early. Everything is wrapped in an IIFE; no globals leak.
  const script =
    '<script>' +
    '(function(){' +
    '"use strict";' +
    'var ID = "eevdf-anim-root";' +
    'var FILL = "' + EEVDF_BOX_FILL + '";' +
    'var STROKE = "' + EEVDF_BOX_STROKE + '";' +
    'var TXT = "' + EEVDF_TEXT + '";' +
    'var NOTE = "' + EEVDF_NOTE + '";' +
    // Precomputed, illustrative step-states. Invariant at each running step:
    // the running task is eligible (lag>=0) and has the minimum deadline
    // among eligible tasks. deadline: earlier = smaller number.
    'var STEPS = [' +
      '{caption:"Press Play or Step. Three equal-weight tasks: B = audio (small slice, low latency), A and C = CPU-bound (large slice). All start exactly fair (lag = 0).",' +
       'tasks:[{name:"A",badge:1,lag:0,eligible:true,deadline:6,running:false},' +
              '{name:"B",badge:2,lag:0,eligible:true,deadline:2,running:false},' +
              '{name:"C",badge:3,lag:0,eligible:true,deadline:6,running:false}]},' +
      '{caption:"Step 1: all three are eligible (lag >= 0). B has the earliest virtual deadline (2) because its requested slice is small, so among the eligible tasks EEVDF picks B to run next for a short slice.",' +
       'tasks:[{name:"A",badge:1,lag:2,eligible:true,deadline:6,running:false},' +
              '{name:"B",badge:2,lag:0,eligible:true,deadline:2,running:true},' +
              '{name:"C",badge:3,lag:2,eligible:true,deadline:6,running:false}]},' +
      '{caption:"Step 2: B just ran, so its lag went negative (it got ahead) and B is now INELIGIBLE. Among the eligible tasks A and C tie on deadline (6); A is picked and runs a long slice.",' +
       'tasks:[{name:"A",badge:1,lag:2,eligible:true,deadline:6,running:true},' +
              '{name:"B",badge:2,lag:-2,eligible:false,deadline:2,running:false},' +
              '{name:"C",badge:3,lag:2,eligible:true,deadline:6,running:false}]},' +
      '{caption:"Step 3: time advanced and B\\u0027s lag climbed back to >= 0, so B is ELIGIBLE again with the earliest deadline (2). A got ahead when it ran (lag < 0), so A is ineligible for now; B runs again, staying responsive.",' +
       'tasks:[{name:"A",badge:1,lag:-1,eligible:false,deadline:7,running:false},' +
              '{name:"B",badge:2,lag:0,eligible:true,deadline:2,running:true},' +
              '{name:"C",badge:3,lag:3,eligible:true,deadline:6,running:false}]},' +
      '{caption:"Step 4: B is ineligible again (it just ran, lag < 0). A is still slightly ahead too. C is eligible with the earliest deadline (6), so C runs its long slice.",' +
       'tasks:[{name:"A",badge:1,lag:-1,eligible:false,deadline:7,running:false},' +
              '{name:"B",badge:2,lag:-2,eligible:false,deadline:2,running:false},' +
              '{name:"C",badge:3,lag:3,eligible:true,deadline:6,running:true}]},' +
      '{caption:"Step 5: the clock advanced; A is owed time again (eligible), while C just ran and is briefly ahead (ineligible). B is eligible with the earliest deadline, so B runs. A and C keep making steady progress between B\\u0027s short slices.",' +
       'tasks:[{name:"A",badge:1,lag:1,eligible:true,deadline:7,running:false},' +
              '{name:"B",badge:2,lag:0,eligible:true,deadline:2,running:true},' +
              '{name:"C",badge:3,lag:-1,eligible:false,deadline:8,running:false}]},' +
      '{caption:"End: all three advanced fairly. B stayed responsive with short, timely slices; A and C got their full share in longer chunks. No task exceeded its fair share (lag stayed bounded).",' +
       'tasks:[{name:"A",badge:1,lag:0,eligible:true,deadline:7,running:false},' +
              '{name:"B",badge:2,lag:0,eligible:true,deadline:2,running:false},' +
              '{name:"C",badge:3,lag:0,eligible:true,deadline:8,running:false}]}' +
    '];' +
    'var idx = 0;' +
    'function esc(t){return String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}' +
    // Build the SVG markup for step i.
    'function svgFor(i){' +
      'var step = STEPS[i];' +
      'var W = 760;' +
      'var threshX = 300;' +            // lag = 0 vertical line
      'var s = "";' +
      // Time axis across the top; fills left->right by step index.
      'var axX = 40, axY = 34, axW = 680;' +
      'var frac = STEPS.length > 1 ? (i / (STEPS.length - 1)) : 0;' +
      's += "<text x=\\"" + axX + "\\" y=\\"20\\" font-family=\\"sans-serif\\" font-size=\\"12\\" font-weight=\\"700\\" fill=\\"" + NOTE + "\\">Time axis (fills as steps advance)</text>";' +
      's += "<rect x=\\"" + axX + "\\" y=\\"" + axY + "\\" width=\\"" + axW + "\\" height=\\"10\\" rx=\\"5\\" fill=\\"none\\" stroke=\\"" + STROKE + "\\" stroke-width=\\"1.5\\"></rect>";' +
      's += "<rect x=\\"" + axX + "\\" y=\\"" + axY + "\\" width=\\"" + Math.round(axW * frac) + "\\" height=\\"10\\" rx=\\"5\\" fill=\\"" + FILL + "\\" stroke=\\"" + STROKE + "\\" stroke-width=\\"1.5\\"></rect>";' +
      // lag = 0 threshold line + labels (position carries eligibility too).
      'var tTop = 60, tBot = 288;' +
      's += "<line x1=\\"" + threshX + "\\" y1=\\"" + tTop + "\\" x2=\\"" + threshX + "\\" y2=\\"" + tBot + "\\" stroke=\\"" + STROKE + "\\" stroke-width=\\"2\\" stroke-dasharray=\\"4 3\\"></line>";' +
      's += "<text x=\\"" + threshX + "\\" y=\\"" + (tTop - 4) + "\\" text-anchor=\\"middle\\" font-family=\\"sans-serif\\" font-size=\\"11.5\\" font-weight=\\"700\\" fill=\\"" + NOTE + "\\">lag = 0</text>";' +
      's += "<text x=\\"" + (threshX - 70) + "\\" y=\\"" + (tTop - 4) + "\\" text-anchor=\\"middle\\" font-family=\\"sans-serif\\" font-size=\\"10.5\\" fill=\\"" + NOTE + "\\">&lt;- ahead (ineligible)</text>";' +
      's += "<text x=\\"" + (threshX + 80) + "\\" y=\\"" + (tTop - 4) + "\\" text-anchor=\\"middle\\" font-family=\\"sans-serif\\" font-size=\\"10.5\\" fill=\\"" + NOTE + "\\">owed (eligible) -&gt;</text>";' +
      // Deadline axis header (right portion of each row shows a vd marker).
      's += "<text x=\\"560\\" y=\\"" + (tTop - 4) + "\\" text-anchor=\\"middle\\" font-family=\\"sans-serif\\" font-size=\\"11\\" fill=\\"" + NOTE + "\\">virtual deadline (earlier = left)</text>";' +
      // One row per task.
      'var rowH = 66, rowGap = 10, row0 = tTop + 8;' +
      'for (var k = 0; k < step.tasks.length; k++){' +
        'var t = step.tasks[k];' +
        'var ry = row0 + k * (rowH + rowGap);' +
        'var cy = ry + rowH / 2;' +
        'var sw = t.running ? 4 : 1.5;' +
        // Row container box (identity by badge + letter + fixed row position).
        's += "<rect x=\\"40\\" y=\\"" + ry + "\\" width=\\"680\\" height=\\"" + rowH + "\\" rx=\\"6\\" fill=\\"" + FILL + "\\" stroke=\\"" + STROKE + "\\" stroke-width=\\"" + sw + "\\"></rect>";' +
        // Numbered badge + task letter.
        's += "<circle cx=\\"66\\" cy=\\"" + cy + "\\" r=\\"14\\" fill=\\"" + STROKE + "\\"></circle>";' +
        's += "<text x=\\"66\\" y=\\"" + (cy + 4) + "\\" text-anchor=\\"middle\\" font-family=\\"sans-serif\\" font-size=\\"13\\" font-weight=\\"700\\" fill=\\"#ffffff\\">" + t.badge + "</text>";' +
        's += "<text x=\\"90\\" y=\\"" + (cy - 10) + "\\" font-family=\\"sans-serif\\" font-size=\\"14\\" font-weight=\\"700\\" fill=\\"" + TXT + "\\">Task " + esc(t.name) + "</text>";' +
        // Eligibility: WORD label + numeric lag + marker position vs threshold.
        'var eligWord = t.eligible ? "ELIGIBLE" : "ineligible";' +
        's += "<text x=\\"90\\" y=\\"" + (cy + 10) + "\\" font-family=\\"sans-serif\\" font-size=\\"12\\" fill=\\"" + TXT + "\\">" + eligWord + "  (lag = " + t.lag + ")</text>";' +
        // Lag marker: a small square placed left/right of the threshold line.
        'var lagX = threshX + t.lag * 18;' +
        'if (lagX < 150) { lagX = 150; } if (lagX > 450) { lagX = 450; }' +
        's += "<rect x=\\"" + (lagX - 6) + "\\" y=\\"" + (cy - 6) + "\\" width=\\"12\\" height=\\"12\\" fill=\\"" + STROKE + "\\"></rect>";' +
        // Virtual deadline marker on the right, position by deadline value.
        'var vdX = 470 + t.deadline * 22;' +
        'if (vdX > 690) { vdX = 690; }' +
        's += "<line x1=\\"" + vdX + "\\" y1=\\"" + (ry + 8) + "\\" x2=\\"" + vdX + "\\" y2=\\"" + (ry + rowH - 8) + "\\" stroke=\\"" + STROKE + "\\" stroke-width=\\"2\\"></line>";' +
        's += "<text x=\\"" + vdX + "\\" y=\\"" + (ry + rowH - 10) + "\\" text-anchor=\\"middle\\" font-family=\\"sans-serif\\" font-size=\\"11\\" fill=\\"" + TXT + "\\">vd = " + t.deadline + "</text>";' +
        // Running vs waiting: WORD label + (for running) a marker + thick outline above.
        'var runWord = t.running ? "RUNNING" : "waiting";' +
        's += "<text x=\\"300\\" y=\\"" + (cy - 10) + "\\" text-anchor=\\"middle\\" font-family=\\"sans-serif\\" font-size=\\"12.5\\" font-weight=\\"700\\" fill=\\"" + TXT + "\\">" + runWord + "</text>";' +
        'if (t.running){' +
          's += "<text x=\\"300\\" y=\\"" + (cy + 12) + "\\" text-anchor=\\"middle\\" font-family=\\"sans-serif\\" font-size=\\"12\\" font-weight=\\"700\\" fill=\\"" + TXT + "\\">&#9664; picked (earliest vd)</text>";' +
        '}' +
      '}' +
      'return s;' +
    '}' +
    // Render step i into the DOM, all lookups null-guarded.
    'function render(i){' +
      'var root = document.getElementById(ID);' +
      'if (!root) { return; }' +
      'var svg = document.getElementById("eevdf-anim-svg");' +
      'if (svg) { svg.innerHTML = svgFor(i); }' +
      'var cap = document.getElementById("eevdf-anim-caption");' +
      'if (cap) { cap.textContent = STEPS[i].caption; }' +
      'var ro = document.getElementById("eevdf-anim-stepreadout");' +
      'if (ro) { ro.textContent = "Step " + i + " / " + (STEPS.length - 1); }' +
    '}' +
    'function stopTimer(){' +
      'var root = document.getElementById(ID);' +
      'if (root && root.__eevdfTimer){ clearInterval(root.__eevdfTimer); root.__eevdfTimer = null; }' +
    '}' +
    'function tick(){' +
      'if (!document.getElementById(ID)) { stopTimer(); return; }' +
      'idx = (idx + 1) % STEPS.length;' +
      'render(idx);' +
    '}' +
    'function play(){' +
      'var root = document.getElementById(ID);' +
      'if (!root) { return; }' +
      'stopTimer();' +
      'root.__eevdfTimer = setInterval(tick, 1500);' +
    '}' +
    'function pause(){ stopTimer(); }' +
    'function stepOnce(){ stopTimer(); idx = (idx + 1) % STEPS.length; render(idx); }' +
    'function reset(){ stopTimer(); idx = 0; render(0); }' +
    'function wire(id, fn){ var b = document.getElementById(id); if (b) { b.addEventListener("click", fn); } }' +
    'wire("eevdf-anim-play", play);' +
    'wire("eevdf-anim-pause", pause);' +
    'wire("eevdf-anim-step", stepOnce);' +
    'wire("eevdf-anim-reset", reset);' +
    'render(0);' +
    'var rm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;' +
    'if (!rm) { play(); }' +
    '})();' +
    '<\/script>';

  return chrome + script;
}

const TOPIC_EEVDF = {
  "id": "eevdf",
  "category": "kernel",
  "icon": "⏱️",
  "title": "EEVDF Scheduler",
  "description": "The Linux kernel scheduler revolution — from CFS to EEVDF (Earliest Eligible Virtual Deadline First), the algorithm that replaced the Completely Fair Scheduler in Linux 6.6",
  "keywords": [
    "eevdf", "cfs", "scheduler", "sched", "scheduling", "fair", "completely fair",
    "vruntime", "virtual deadline", "eligible", "lag", "latency", "nice",
    "weight", "timeslice", "preemption", "ingo molnar", "peter zijlstra",
    "linux 6.6", "sched_ext", "latency-nice", "run queue", "red-black tree",
    "slice", "request size", "cpu"
  ],
  "sections": [
    {
      "title": "1. From CFS to EEVDF",
      "content": eevdfCfsVsEevdfSVG() + "<p><strong>EEVDF</strong> stands for <strong>Earliest Eligible Virtual Deadline First</strong>. Starting with <strong>Linux 6.6</strong> (released late 2023), the <strong>Completely Fair Scheduler (CFS)</strong> — which had served the Linux community for over 15 years — was retired, and the EEVDF scheduling algorithm, driven by <strong>Ingo Molnar</strong> and <strong>Peter Zijlstra</strong>, took over as the default scheduler for normal tasks (the <code>SCHED_NORMAL</code> / fair class).</p><h4>Why replace CFS at all?</h4><p>CFS was excellent at one thing: throughput fairness. It divided CPU time proportionally to task weight and generally kept every task's accumulated runtime balanced. But it had a persistent weakness: <strong>latency</strong>. CFS had no first-class notion of \"this task needs to run <em>soon</em>, even if briefly.\" Interactive and latency-sensitive tasks were served by heuristics and tunables (<code>sched_min_granularity</code>, <code>sched_wakeup_granularity</code>, GENTLE_FAIR_SLEEPERS, ...) that grew fragile and hard to reason about over the years.</p><pre><code># The core problem CFS could not express cleanly:\n#\n#   Task A: a batch compiler job   -> wants lots of CPU, doesn't care when\n#   Task B: an audio thread        -> wants tiny slices, but ON TIME\n#\n# CFS gives both \"fair\" total time, but B may wait too long between slices\n# and glitch. EEVDF lets B ask for a shorter latency target and honors it\n# WITHOUT giving B more than its fair share overall.</code></pre><h4>The headline idea</h4><ul><li><strong>CFS answered:</strong> \"who has received the least CPU so far?\" → pick that task (smallest <code>vruntime</code>).</li><li><strong>EEVDF answers:</strong> \"among tasks that are <em>eligible</em> (haven't gotten ahead of their fair share), who has the earliest <em>virtual deadline</em>?\" → pick that one.</li></ul><p>EEVDF unifies fairness <em>and</em> latency into a single, well-defined algorithm from academic literature (Stoica &amp; Abdel-Wahab, 1995), replacing a pile of heuristics with one coherent model.</p>"
    },
    {
      "title": "2. Core Concepts: Lag, Eligibility, Virtual Deadline",
      "content": eevdfLagEligibilitySVG() + "<p>EEVDF rests on three tightly related ideas. Understanding them is understanding the whole scheduler.</p><h4>1. Virtual runtime & the fair share</h4><pre><code># Like CFS, each task accrues virtual runtime. In an ideal, perfectly fair\n# system, every runnable task would receive CPU time proportional to its\n# weight (derived from nice value). The scheduler tracks how far each task\n# is AHEAD of or BEHIND that ideal.</code></pre><h4>2. Lag — the fairness debt</h4><pre><code># lag = (fair share the task SHOULD have received) - (what it ACTUALLY got)\n#\n#   lag > 0  : task is OWED time  (it ran less than fair)  -> eligible\n#   lag < 0  : task got AHEAD     (it ran more than fair)  -> NOT eligible yet\n#   lag = 0  : exactly fair\n#\n# EEVDF's fairness guarantee is expressed directly in terms of bounded lag.\n# A task that overran is temporarily held back until time \"catches up\" and\n# its lag returns to >= 0.</code></pre><h4>3. Eligibility</h4><p>A task is <strong>eligible</strong> only when its lag is non-negative — i.e. it has not already consumed more than its fair share up to now. This is the \"Eligible\" in EEVDF. Ineligible tasks are simply skipped for selection until the virtual clock advances enough to make them eligible again.</p><h4>4. Virtual deadline</h4><pre><code># Each task requests a time slice of size 'r' (its request / slice length).\n# EEVDF assigns a virtual DEADLINE = virtual_eligible_time + (r / weight).\n#\n#   - A SMALLER requested slice  -> EARLIER deadline -> scheduled sooner,\n#     more often, in shorter bursts   (great for latency-sensitive tasks)\n#   - A LARGER requested slice   -> LATER deadline -> runs less often but\n#     in longer chunks               (great for throughput/batch tasks)</code></pre><h4>The selection rule</h4><p>Among all <strong>eligible</strong> tasks, EEVDF runs the one with the <strong>earliest virtual deadline</strong> — hence <em>Earliest Eligible Virtual Deadline First</em>. This single rule delivers proportional fairness (via eligibility/lag) and latency control (via the deadline computed from the requested slice).</p>"
    },
    {
      "title": "3. Watch EEVDF in Action (Animation)",
      "content": "<p>The math is easier to feel than to read. This step-through animation runs three equal-weight tasks through EEVDF's two gates — <strong>eligibility</strong> (<code>lag &gt;= 0</code>) and <strong>earliest virtual deadline</strong> — one scheduling decision at a time. Task <strong>B</strong> is an audio thread that asks for a <em>small</em> slice (so it gets an early deadline and stays responsive); tasks <strong>A</strong> and <strong>C</strong> are CPU-bound and ask for <em>large</em> slices.</p><p>Use <strong>Step</strong> to advance one decision at a time, <strong>Play</strong> to auto-advance, <strong>Pause</strong> to stop, and <strong>Reset</strong> to return to the start. Every state is spelled out in words and position — <code>ELIGIBLE</code>/<code>ineligible</code>, <code>RUNNING</code>/<code>waiting</code>, the numeric lag relative to the dashed <code>lag = 0</code> line, and each task's virtual deadline <code>vd</code> — so nothing depends on color. The running task also gets a thick outline and a &#9664; <em>picked</em> marker.</p>" + eevdfAnimationBlock() + "<p><strong>What to watch:</strong> whenever B is eligible it has the earliest deadline (vd = 2), so it runs a short, timely slice and then goes briefly ineligible (its lag dips below zero). While B waits, A and C — the only remaining eligible tasks — take turns running their longer slices. Over the sequence all three advance fairly, yet B never exceeds its fair share: it simply receives its time in smaller, more frequent pieces. That is EEVDF turning the <code>vd = ve + r/w</code> formula and the lag-based eligibility rule from section 2 into visible, bounded behavior.</p>"
    },
    {
      "title": "4. How EEVDF Picks the Next Task",
      "content": eevdfSelectionFlowSVG() + "<h4>The algorithm in plain steps</h4><pre><code># On every scheduling decision (tick, wakeup, or task blocking):\n#\n# 1. Advance the virtual clock based on total weight of runnable tasks.\n# 2. Determine which tasks are ELIGIBLE now  (lag >= 0).\n# 3. Among eligible tasks, choose the one with the EARLIEST virtual deadline.\n# 4. Run it for up to its requested slice 'r'.\n# 5. Charge the CPU time used, update its lag/vruntime, recompute deadline.\n# 6. Repeat.</code></pre><h4>Worked intuition</h4><pre><code>   Three tasks, equal weight. Audio (B) asks for a small slice; the two\n   compilers (A, C) ask for large slices.\n\n   eligible?   deadline (earlier = sooner)\n   ┌──────┬───────────┬──────────────────────────┐\n   │ A    │  yes      │  late   (big slice)        │\n   │ B    │  yes      │  EARLY  (small slice) ◄──── picked: earliest deadline\n   │ C    │  yes      │  late   (big slice)        │\n   └──────┴───────────┴──────────────────────────┘\n\n   B runs its short slice, glitch-free, then yields. A and C still get\n   their full fair share over time because B's total CPU stays bounded by\n   its lag budget -- it just gets its time in smaller, more timely pieces.</code></pre><h4>Data structure</h4><pre><code># CFS kept an rbtree keyed by vruntime (\"who is furthest behind\").\n# EEVDF keeps runnable tasks in an augmented red-black tree that lets the\n# scheduler efficiently find the earliest-deadline task AMONG the eligible\n# subset. The augmentation stores the min virtual deadline of each subtree,\n# so selection stays O(log n).</code></pre><h4>Preemption</h4><pre><code># A newly-woken task that is eligible and has an earlier virtual deadline\n# than the running task can preempt it. Because latency-sensitive tasks\n# request small slices, they naturally get earlier deadlines and thus\n# timely preemption -- no separate wakeup-granularity heuristic needed.</code></pre>"
    },
    {
      "title": "5. CFS vs EEVDF — Side by Side",
      "content": "<table style=\"width:100%; border-collapse:collapse; margin:1rem 0;\"><tr style=\"border-bottom:1px solid #30363d;\"><th style=\"text-align:left; padding:0.5rem;\">Aspect</th><th style=\"text-align:left; padding:0.5rem;\">CFS (≤ 6.5)</th><th style=\"text-align:left; padding:0.5rem;\">EEVDF (≥ 6.6)</th></tr><tr style=\"border-bottom:1px solid #30363d;\"><td style=\"padding:0.5rem;\">Selection rule</td><td style=\"padding:0.5rem;\">Smallest vruntime (most behind)</td><td style=\"padding:0.5rem;\">Earliest deadline among eligible</td></tr><tr style=\"border-bottom:1px solid #30363d;\"><td style=\"padding:0.5rem;\">Fairness model</td><td style=\"padding:0.5rem;\">Balance accumulated vruntime</td><td style=\"padding:0.5rem;\">Bounded lag (formal guarantee)</td></tr><tr style=\"border-bottom:1px solid #30363d;\"><td style=\"padding:0.5rem;\">Latency handling</td><td style=\"padding:0.5rem;\">Heuristics &amp; tunables</td><td style=\"padding:0.5rem;\">First-class via requested slice</td></tr><tr style=\"border-bottom:1px solid #30363d;\"><td style=\"padding:0.5rem;\">Per-task latency hint</td><td style=\"padding:0.5rem;\">None (only nice)</td><td style=\"padding:0.5rem;\">latency-nice → slice size</td></tr><tr style=\"border-bottom:1px solid #30363d;\"><td style=\"padding:0.5rem;\">Key tunables</td><td style=\"padding:0.5rem;\">sched_min_granularity, wakeup_granularity</td><td style=\"padding:0.5rem;\">Largely removed / obsolete</td></tr><tr style=\"border-bottom:1px solid #30363d;\"><td style=\"padding:0.5rem;\">Data structure</td><td style=\"padding:0.5rem;\">rbtree keyed by vruntime</td><td style=\"padding:0.5rem;\">Augmented rbtree (min-deadline)</td></tr><tr><td style=\"padding:0.5rem;\">Complexity</td><td style=\"padding:0.5rem;\">O(log n)</td><td style=\"padding:0.5rem;\">O(log n)</td></tr></table><h4>What stayed the same</h4><ul><li>Both are <strong>weight-based, proportional-share</strong> schedulers driven by the <code>nice</code> value (nice −20…+19 maps to a weight table).</li><li>Both live in the <strong>fair scheduling class</strong> (<code>kernel/sched/fair.c</code>) serving <code>SCHED_NORMAL</code>, <code>SCHED_BATCH</code>, <code>SCHED_IDLE</code>.</li><li>Both still track a form of <strong>virtual runtime</strong> and integrate with load balancing, cgroups (CPU controller), and the wider scheduler infrastructure.</li></ul><h4>What changed for users</h4><ul><li>Interactive/latency-sensitive workloads generally feel more responsive under contention without manual tuning.</li><li>Several old CFS knobs are gone or no longer meaningful; scripts that poked <code>sched_*_granularity</code> in <code>/proc/sys/kernel</code> may find them absent.</li><li>A new per-task <strong>latency-nice</strong> control lets you bias a task toward lower latency (smaller slice) or higher throughput (larger slice).</li></ul>"
    },
    {
      "title": "6. Mathematical Foundations: Verifying & Comparing CFS vs EEVDF",
      "content": "<p>Yes — there is a solid body of formal, mathematical theory behind both CFS and EEVDF, and it is exactly what lets you <strong>verify</strong> each scheduler's fairness/latency behavior and <strong>compare</strong> the two on a common footing. Both are <strong>proportional-share</strong> schedulers that approximate the same idealized model; EEVDF additionally carries a <em>provable</em> accuracy bound that CFS never had as a first-class guarantee.</p><h4>1. Shared formal model: proportional share &amp; the GPS fluid ideal</h4><p>Each task <code>i</code> has a <strong>weight</strong> <code>w_i</code> derived from its <code>nice</code> value (nice &minus;20&hellip;+19 maps to a weight table; a lower nice means a higher weight). Its target <strong>fair share</strong> of the CPU is <code>w_i / &Sum; w_j</code> over the runnable set. The idealized reference is <strong>Generalized Processor Sharing (GPS)</strong> (Parekh &amp; Gallager) — a fluid-flow model in which <em>every</em> runnable task is served continuously and simultaneously, each receiving CPU in exact proportion to its weight. GPS is not implementable (a real CPU is discrete and serial, running one task at a time), so every real scheduler is a <strong>discrete approximation of GPS</strong>, and the theory measures a scheduler by how closely its schedule tracks the GPS ideal.</p><pre><code># Ideal (GPS / fluid) service each task should receive over [t0, t1]:\n#   S_i^ideal(t0,t1) = (t1 - t0) &middot; w_i / &Sum;_j w_j\n#\n# Instantaneous fair share of task i:\n#   share_i = w_i / &Sum;_j w_j</code></pre><h4>2. Virtual time &amp; lag — the formal fairness metric</h4><p>Both schedulers track a per-task <strong>virtual runtime</strong> (<code>vruntime</code>). Real time <code>&Delta;t</code> charged to task <code>i</code> advances its vruntime weight-scaled, so equal vruntime progress corresponds to a proportional real-time share, and the <strong>system virtual time</strong> <code>V(t)</code> acts as the weighted-fair reference clock. <strong>Lag</strong> is the signed deviation from the GPS ideal: the service a task <em>should</em> have received minus what it <em>actually</em> received up to time <code>t</code>. It is the quantity both schedulers try to keep near zero (implicitly for CFS, explicitly for EEVDF).</p><pre><code># Weight-scaled virtual time (w_0 = reference weight of nice 0):\n#   vruntime_i += &Delta;t &middot; (w_0 / w_i)\n#\n# Lag = ideal service - actual service, measured against GPS:\n#   lag_i(t) = S_i^ideal(t) - s_i^actual(t)\n#     lag &gt; 0 : under-served (owed CPU)  -&gt; EEVDF ELIGIBLE\n#     lag &lt; 0 : over-served  (ran ahead) -&gt; NOT eligible yet\n#     lag = 0 : exactly fair\n#\n# Formal fairness: a scheduler is fair to within a bound B iff\n#   |lag_i(t)| &le; B   for all tasks i and all times t.</code></pre><p>The kernel's own documentation (<code>Documentation/scheduler/sched-eevdf.rst</code>) frames it the same way: EEVDF assigns a virtual runtime that yields a lag value — positive lag means the task is owed CPU, negative means it has exceeded its share — and the scheduler considers only tasks with lag &ge; 0, running the one with the earliest virtual deadline. (Content was rephrased for compliance with licensing restrictions.)</p><h4>3. The virtual-deadline formula (EEVDF's latency lever)</h4><p>For a requested slice (request size) <code>r_i</code>, EEVDF computes a virtual eligible time <code>ve_i</code> and a <strong>virtual deadline</strong> <code>vd_i</code>. Among eligible tasks it runs the <strong>earliest</strong> <code>vd_i</code>. A smaller <code>r_i</code> yields an earlier deadline — so the task is scheduled sooner and more often (lower latency) — without changing its long-run fair share, which stays governed by <code>w_i / &Sum; w_j</code>.</p><pre><code># Virtual deadline from the requested slice r_i:\n#   vd_i = ve_i + r_i / w_i        (ve_i = virtual eligible time)\n#\n# Selection rule: among tasks with lag &ge; 0, run the smallest vd_i.\n# Smaller r_i -&gt; earlier vd_i -&gt; sooner / more often (lower latency);\n# long-run share unchanged (set by w_i / &Sum; w_j).</code></pre><h4>4. The EEVDF theorem — what is provable (the &quot;verification&quot;)</h4><p>The core formal result comes from <strong>Stoica &amp; Abdel-Wahab (1995)</strong>, <em>Earliest Eligible Virtual Deadline First: A Flexible and Accurate Mechanism for Proportional Share Resource Allocation</em>. EEVDF <strong>proves bounded lag / optimal allocation accuracy</strong>: a task's service error (lag) stays bounded by a small constant on the order of the maximum request size — roughly within one request/quantum — <em>independent of the number of tasks and of how long the system runs</em>. It likewise bounds per-task <strong>lateness</strong>, which is the responsiveness guarantee for latency-sensitive tasks. This is a formal theorem, not a heuristic.</p><pre><code># EEVDF accuracy bound (Stoica &amp; Abdel-Wahab, 1995):\n#   |lag_i(t)| &le; r_max          (on the order of the max request size)\n#   for all tasks i, all times t, independent of n and of elapsed time.\n# Per-task lateness is likewise bounded -> a latency guarantee.</code></pre><p>CFS is also a weighted virtual-time scheduler — it always runs the smallest-<code>vruntime</code> task, trying to equalize vruntimes, and it keeps them <em>informally</em> close. But CFS provides <strong>no clean, provable lag/lateness bound</strong>: its latency behavior relied on heuristics and tunables (<code>sched_min_granularity</code>, <code>sched_wakeup_granularity</code>, <code>GENTLE_FAIR_SLEEPERS</code>) rather than a single formal guarantee. EEVDF's advantage is therefore theoretically grounded, not merely empirical.</p><h4>5. How the math lets you compare &amp; verify the two</h4><p>Because both approximate GPS, they share a yardstick: measure each by its <strong>lag / service-error bound</strong> and its <strong>lateness bound</strong>. CFS minimizes vruntime spread (informal fairness) with no first-class latency bound; its selection is <code>O(log n)</code> via an rbtree keyed by vruntime. EEVDF offers a provable lag bound (within about the max request size, independent of task count) plus bounded lateness, with latency as a tunable <em>input</em> (the request size <code>r_i</code>) rather than an emergent heuristic; its selection is <code>O(log n)</code> via an augmented rbtree keyed by virtual deadline (each subtree stores its minimum deadline).</p><table style=\"width:100%; border-collapse:collapse; margin:1rem 0;\"><tr style=\"border-bottom:1px solid #30363d;\"><th style=\"text-align:left; padding:0.5rem;\">Property</th><th style=\"text-align:left; padding:0.5rem;\">CFS</th><th style=\"text-align:left; padding:0.5rem;\">EEVDF</th></tr><tr style=\"border-bottom:1px solid #30363d;\"><td style=\"padding:0.5rem;\">Fairness reference</td><td style=\"padding:0.5rem;\">GPS approximation</td><td style=\"padding:0.5rem;\">GPS approximation</td></tr><tr style=\"border-bottom:1px solid #30363d;\"><td style=\"padding:0.5rem;\">Fairness metric</td><td style=\"padding:0.5rem;\">vruntime balancing</td><td style=\"padding:0.5rem;\">bounded lag</td></tr><tr style=\"border-bottom:1px solid #30363d;\"><td style=\"padding:0.5rem;\">Formal guarantee</td><td style=\"padding:0.5rem;\">none for latency; informal vruntime closeness</td><td style=\"padding:0.5rem;\">proven |lag| &le; &asymp; max request size; bounded lateness</td></tr><tr style=\"border-bottom:1px solid #30363d;\"><td style=\"padding:0.5rem;\">Latency control</td><td style=\"padding:0.5rem;\">heuristics &amp; tunables</td><td style=\"padding:0.5rem;\">first-class via requested slice r_i</td></tr><tr style=\"border-bottom:1px solid #30363d;\"><td style=\"padding:0.5rem;\">Selection key</td><td style=\"padding:0.5rem;\">min vruntime</td><td style=\"padding:0.5rem;\">earliest virtual deadline among eligible</td></tr><tr style=\"border-bottom:1px solid #30363d;\"><td style=\"padding:0.5rem;\">Data structure</td><td style=\"padding:0.5rem;\">rbtree by vruntime</td><td style=\"padding:0.5rem;\">augmented rbtree by virtual deadline</td></tr><tr><td style=\"padding:0.5rem;\">Complexity</td><td style=\"padding:0.5rem;\">O(log n)</td><td style=\"padding:0.5rem;\">O(log n)</td></tr></table><h4>6. The displayed formulas, together</h4><pre><code># Fair share:          share_i      = w_i / &Sum;_j w_j\n# Virtual time:        vruntime_i  += &Delta;t &middot; (w_0 / w_i)\n# Lag &amp; eligibility:    lag_i(t)     = S_i^ideal(t) - s_i^actual(t)\n#                      eligible    &hArr; lag_i(t) &ge; 0\n# Virtual deadline:    vd_i         = ve_i + r_i / w_i\n# Accuracy bound:      |lag_i(t)|   &le; r_max   (&asymp; max request size,\n#                                   for all i and all t)</code></pre><p>Keep the accuracy claim conservative: the bound is <em>on the order of</em> the maximum request size, consistent with the paper's accuracy result — not an exact, over-precise constant.</p><h4>7. Verifying it on a live system</h4><p>The theory is checkable in practice: compare each task's measured CPU service against the <code>w_i / &Sum; w_j</code> ideal and watch lag/vruntime, using the exact tooling in the next section — <code>/proc/&lt;pid&gt;/sched</code>, <code>/sys/kernel/debug/sched/debug</code>, and run-queue latency tools such as <code>runqlat</code>.</p><p><strong>Further reading:</strong></p><ul><li><a href=\"https://dl.acm.org/doi/10.1145/207502.207503\" target=\"_blank\">Stoica &amp; Abdel-Wahab (1995): Earliest Eligible Virtual Deadline First</a></li><li><a href=\"https://docs.kernel.org/scheduler/sched-eevdf.html\" target=\"_blank\">Linux Kernel: EEVDF scheduler documentation</a></li><li><a href=\"https://lwn.net/Articles/925371/\" target=\"_blank\">LWN: An EEVDF CPU scheduler for Linux</a></li><li><a href=\"https://lwn.net/Articles/969062/\" target=\"_blank\">LWN: Completing the EEVDF scheduler</a></li><li><a href=\"https://en.wikipedia.org/wiki/Generalized_processor_sharing\" target=\"_blank\">Generalized Processor Sharing (Parekh &amp; Gallager)</a></li></ul>"
    },
    {
      "title": "7. Tuning & Observability",
      "content": "<h4>latency-nice: request lower latency per task</h4><pre><code># latency-nice is a per-task hint (range like nice: -20..19). LOWER values\n# request lower scheduling latency (shorter slice, earlier deadlines).\n# It does NOT grant more CPU -- only changes HOW the fair share is delivered.\n\n#include <sched.h>\nstruct sched_attr attr = {\n    .size            = sizeof(attr),\n    .sched_policy    = SCHED_NORMAL,\n    .sched_flags     = SCHED_FLAG_LATENCY_NICE ,\n    .sched_latency_nice = -10,   // bias toward low latency\n};\nsched_setattr(0, &attr, 0);\n\n# From the shell, chrt reports/sets scheduling attributes:\nchrt -p $$            # show current policy for this shell</code></pre><h4>Inspecting the scheduler</h4><pre><code># Per-task scheduling stats (vruntime, deadline, slice, etc.)\ncat /proc/<pid>/sched\n\n# System-wide fair-class scheduler state (very detailed)\nsudo cat /sys/kernel/debug/sched/debug\n\n# Remaining scheduler tunables under debugfs (EEVDF era)\nls /sys/kernel/debug/sched/\n#   base_slice_ns   <- the default request/slice length used by EEVDF\n\n# Read/adjust the base time slice (nanoseconds)\ncat /sys/kernel/debug/sched/base_slice_ns</code></pre><h4>Tracing scheduling decisions with eBPF</h4><pre><code># Run-queue latency histogram (how long tasks wait to get on-CPU)\nsudo runqlat-bpfcc\n\n# Watch context switches and pick decisions live\nsudo bpftrace -e 'tracepoint:sched:sched_switch {\n  printf(\"%s -> %s\\n\", args->prev_comm, args->next_comm); }'\n\n# Wakeup-to-run latency (scheduler responsiveness)\nsudo bpftrace -e 'tracepoint:sched:sched_wakeup { @q[args->comm] = nsecs; }\n  tracepoint:sched:sched_switch /@q[args->next_comm]/ {\n    printf(\"%s waited %d us\\n\", args->next_comm,\n           (nsecs - @q[args->next_comm])/1000);\n    delete(@q[args->next_comm]); }'</code></pre><h4>Checking which scheduler / kernel you run</h4><pre><code>uname -r                       # 6.6+ ships EEVDF as the fair scheduler\ngrep -i eevdf /sys/kernel/debug/sched/* 2>/dev/null\n# Note: there is no runtime switch between CFS and EEVDF -- EEVDF simply\n# IS the fair class from 6.6 onward. To run a different policy engine, see\n# sched_ext (BPF schedulers) in newer kernels.</code></pre>"
    },
    {
      "title": "8. Practical Impact & Further Reading",
      "content": "<h4>Who benefits</h4><table style=\"width:100%; border-collapse:collapse; margin:1rem 0;\"><tr style=\"border-bottom:1px solid #30363d;\"><th style=\"text-align:left; padding:0.5rem;\">Workload</th><th style=\"text-align:left; padding:0.5rem;\">Effect under EEVDF</th></tr><tr style=\"border-bottom:1px solid #30363d;\"><td style=\"padding:0.5rem;\">Audio / real-time-ish media</td><td style=\"padding:0.5rem;\">Fewer glitches — timely short slices without extra CPU</td></tr><tr style=\"border-bottom:1px solid #30363d;\"><td style=\"padding:0.5rem;\">Desktop / interactive</td><td style=\"padding:0.5rem;\">More responsive under heavy background load</td></tr><tr style=\"border-bottom:1px solid #30363d;\"><td style=\"padding:0.5rem;\">Batch / compilation / HPC</td><td style=\"padding:0.5rem;\">Similar throughput; can request larger slices</td></tr><tr style=\"border-bottom:1px solid #30363d;\"><td style=\"padding:0.5rem;\">Mixed latency + throughput</td><td style=\"padding:0.5rem;\">Both served from one coherent model, less tuning</td></tr><tr><td style=\"padding:0.5rem;\">Latency-sensitive services</td><td style=\"padding:0.5rem;\">Per-task latency-nice replaces fragile hacks</td></tr></table><h4>Key takeaways</h4><ul><li>EEVDF = <strong>Earliest Eligible Virtual Deadline First</strong>; default fair scheduler since <strong>Linux 6.6</strong>, replacing CFS after 15+ years.</li><li>It selects the <strong>earliest virtual-deadline</strong> task among those that are <strong>eligible</strong> (non-negative lag), unifying fairness and latency.</li><li><strong>Requested slice size</strong> controls latency: smaller slice → earlier deadline → run sooner/more often, without exceeding fair share.</li><li>Replaces a decade of CFS latency heuristics with a formally-grounded algorithm; adds a per-task <strong>latency-nice</strong> knob.</li><li>Led by <strong>Ingo Molnar</strong> and <strong>Peter Zijlstra</strong>, based on the 1995 EEVDF paper.</li></ul><p><strong>References:</strong></p><ul><li><a href=\"https://lwn.net/Articles/925371/\" target=\"_blank\">LWN: An EEVDF CPU scheduler for Linux</a></li><li><a href=\"https://lwn.net/Articles/969062/\" target=\"_blank\">LWN: Completing the EEVDF scheduler</a></li><li><a href=\"https://docs.kernel.org/scheduler/sched-design-CFS.html\" target=\"_blank\">Linux Kernel: Scheduler documentation</a></li><li><a href=\"https://elixir.bootlin.com/linux/latest/source/kernel/sched/fair.c\" target=\"_blank\">kernel/sched/fair.c (EEVDF implementation)</a></li><li><a href=\"https://dl.acm.org/doi/10.1145/207502.207503\" target=\"_blank\">Stoica &amp; Abdel-Wahab (1995): Earliest Eligible Virtual Deadline First</a></li></ul>"
    }
  ]
};
