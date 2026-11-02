/**
 * Topic: Rust Programming
 *
 * Rust for Linux systems engineers coming from C/C++ — memory safety without a
 * garbage collector, ownership/borrowing/lifetimes, the type system and
 * value-based error handling, the memory model, fearless concurrency, the
 * cargo/rustc toolchain, FFI to C, and the Rust-for-Linux kernel effort.
 */

/* Accessible palette (declared BEFORE use so the SVG helpers below are
 * initialized before the topic object literal calls them — avoids a
 * temporal-dead-zone ReferenceError at load time that would blank the site).
 * ONE neutral-blue hue for every box (#cfe3ff fill, #1f2d3d stroke) on a
 * #0d1117 background. Element identity and meaning are carried by NUMBER
 * badges + position + shape (diamonds = decisions) + text, never by hue.
 * No red/green/yellow conveys meaning. Table borders use #30363d. */
const RUST_BOX_FILL = "#cfe3ff";
const RUST_BOX_STROKE = "#1f2d3d";
const RUST_TEXT = "#0f172a";
const RUST_NOTE = "#c9d4e0";
const RUST_ARROW = "#9db4cc";
const RUST_BG = "#0d1117";

/* =====================================================================
 * Accessible inline SVG diagram helpers (rust- prefix). Single blue fill,
 * numbered circle badges, arrows, diamonds for decisions, high-contrast
 * text — mirrors the cxl / irq-domain / ocp-diag visual style.
 * =================================================================== */

// Centered-label box with an optional numbered badge on the left.
function rustBox(x, y, w, h, label, badge) {
  const cy = y + h / 2;
  const r = 13;
  let s =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ` +
    `fill="${RUST_BOX_FILL}" stroke="${RUST_BOX_STROKE}" stroke-width="1.5"></rect>`;
  if (badge !== undefined) {
    s +=
      `<circle cx="${x + r + 4}" cy="${cy}" r="${r}" fill="${RUST_BOX_STROKE}"></circle>` +
      `<text x="${x + r + 4}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="13" font-weight="700" fill="#ffffff">${badge}</text>`;
  }
  const tx = badge !== undefined ? x + r + 4 + (w - r - 4) / 2 : x + w / 2;
  s +=
    `<text x="${tx}" y="${cy + 5}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="13" font-weight="600" fill="${RUST_TEXT}">${label}</text>`;
  return s;
}

// Wide box with left-aligned text (flow-step boxes).
function rustStepBox(x, y, w, h, label, badge) {
  const cy = y + h / 2;
  const r = 13;
  let s =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ` +
    `fill="${RUST_BOX_FILL}" stroke="${RUST_BOX_STROKE}" stroke-width="1.5"></rect>`;
  if (badge !== undefined) {
    s +=
      `<circle cx="${x + r + 4}" cy="${cy}" r="${r}" fill="${RUST_BOX_STROKE}"></circle>` +
      `<text x="${x + r + 4}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="13" font-weight="700" fill="#ffffff">${badge}</text>`;
  }
  s +=
    `<text x="${x + (badge !== undefined ? r + 24 : 14)}" y="${cy + 4}" ` +
    `font-family="sans-serif" font-size="12" fill="${RUST_TEXT}">${label}</text>`;
  return s;
}

// Small caption centered under/near a point.
function rustCaption(cx, y, text) {
  return (
    `<text x="${cx}" y="${y}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="11.5" fill="${RUST_NOTE}">${text}</text>`
  );
}

// A diamond decision node (shape, not color, carries the "decision" meaning).
function rustDiamond(cx, cy, halfW, halfH, label) {
  let s =
    `<polygon points="${cx},${cy - halfH} ${cx + halfW},${cy} ${cx},${cy + halfH} ${cx - halfW},${cy}" ` +
    `fill="${RUST_BOX_FILL}" stroke="${RUST_BOX_STROKE}" stroke-width="1.5"></polygon>`;
  s +=
    `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="11.5" font-weight="600" fill="${RUST_TEXT}">${label}</text>`;
  return s;
}

function rustVArrow(x, y1, y2) {
  return (
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${RUST_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x - 5},${y2 - 6} ${x + 5},${y2 - 6} ${x},${y2}" fill="${RUST_ARROW}"></polygon>`
  );
}

function rustHArrow(x1, y, x2) {
  const dir = x2 >= x1 ? 1 : -1;
  return (
    `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${RUST_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x2 - dir * 7},${y - 5} ${x2 - dir * 7},${y + 5} ${x2},${y}" fill="${RUST_ARROW}"></polygon>`
  );
}

// Plain line (no arrowhead) for links / dividers.
function rustLine(x1, y1, x2, y2) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${RUST_ARROW}" stroke-width="2"></line>`;
}

// Edge label placed on an arrow (text identity, never color).
function rustEdgeLabel(cx, y, text) {
  return (
    `<rect x="${cx - 52}" y="${y - 11}" width="104" height="18" rx="4" ` +
    `fill="${RUST_BG}" stroke="${RUST_BOX_STROKE}" stroke-width="1"></rect>` +
    `<text x="${cx}" y="${y + 2}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="10.5" fill="${RUST_NOTE}">${text}</text>`
  );
}

function rustFrame(viewW, viewH, title, subtitle, body, ariaLabel) {
  return (
    `<div style="overflow-x:auto; margin:1rem 0; padding:1rem; background:${RUST_BG}; ` +
    `border:1px solid #30363d; border-radius:8px;">` +
    `<div style="text-align:center; font-weight:700; font-size:1.05rem; color:#58a6ff; margin-bottom:0.25rem;">${title}</div>` +
    `<div style="text-align:center; font-size:0.85rem; color:#8b949e; margin-bottom:0.75rem;">${subtitle}</div>` +
    `<svg viewBox="0 0 ${viewW} ${viewH}" width="100%" role="img" aria-label="${ariaLabel}">${body}</svg>` +
    `</div>`
  );
}

/* ---------------------------------------------------------------------
 * Diagram 1: POSITIONING — where Rust sits for Linux systems work, and
 * the safe-abstraction-over-unsafe-core idea, next to C / C++ / Go.
 * ------------------------------------------------------------------- */
function rustPositioningSVG() {
  const w = 780, h = 340;
  let body = "";

  // Top: the four systems languages as peers (identity via badges + text).
  body += rustBox(30, 24, 165, 48, "Rust", 1);
  body += rustBox(215, 24, 165, 48, "C", 2);
  body += rustBox(400, 24, 165, 48, "C++", 3);
  body += rustBox(585, 24, 165, 48, "Go", 4);
  body += rustCaption(112, 90, "safety w/o GC");
  body += rustCaption(297, 90, "manual memory");
  body += rustCaption(482, 90, "manual + RAII");
  body += rustCaption(667, 90, "GC + goroutines");

  // Arrow down from Rust into its Linux niches.
  body += rustVArrow(112, 100, 138);

  // Rust's safe surface over an unsafe core.
  body += rustStepBox(30, 140, 340, 46, "Safe Rust (checked at compile time)", 5);
  body += rustVArrow(200, 186, 212);
  body += rustStepBox(30, 212, 340, 46, "unsafe core / FFI to C (raw pointers)", 6);
  body += rustCaption(200, 284, "safe abstraction wraps a small unsafe core");

  // Right column: Linux use cases.
  const ux = 430, uw = 320;
  body += rustStepBox(ux, 120, uw, 34, "CLI tools & systems daemons", 7);
  body += rustStepBox(ux, 162, uw, 34, "WebAssembly & embedded (no_std)", 8);
  body += rustStepBox(ux, 204, uw, 34, "FFI: link with existing C libraries", 9);
  body += rustStepBox(ux, 246, uw, 34, "Linux kernel: Rust-for-Linux (6.1+)", 10);

  return rustFrame(
    w, h,
    "Rust's place for Linux systems work",
    "One neutral hue; meaning via numbered badges, position & text (no color coding)",
    body,
    "Rust shown as a peer of C, C plus plus and Go, with a safe surface over an unsafe core, feeding Linux use cases: CLI tools, daemons, WebAssembly, embedded, FFI, and the kernel."
  );
}

/* ---------------------------------------------------------------------
 * Diagram 2: OWNERSHIP MOVE + the BORROW-CHECKER decision (aliasing XOR
 * mutability). The signature Rust concept. Outcome shown by shape/text,
 * never by color.
 * ------------------------------------------------------------------- */
function rustBorrowSVG() {
  const w = 780, h = 430;
  let body = "";

  // Ownership move chain across the top.
  body += rustBox(30, 24, 180, 46, "let s = String::new()", 1);
  body += rustHArrow(210, 47, 290);
  body += rustEdgeLabel(250, 20, "move (not copy)");
  body += rustBox(290, 24, 180, 46, "takes(s) owns s now", 2);
  body += rustHArrow(470, 47, 550);
  body += rustEdgeLabel(510, 20, "s invalid here");
  body += rustBox(550, 24, 200, 46, "dropped at scope end", 3);
  body += rustCaption(390, 92, "one owner at a time; value freed (Drop) when the owner leaves scope");

  // Borrow-checker decision flow.
  body += rustStepBox(250, 120, 280, 40, "A reference to the value is requested", 4);
  body += rustVArrow(390, 160, 186);

  body += rustDiamond(390, 230, 150, 44, "&mut while any");
  body += rustCaption(390, 234 + 0, "");
  body += rustCaption(390, 300, "other borrow is live?");

  // NO branch -> OK (left). YES branch -> compile error (right).
  body += rustHArrow(240, 230, 150);
  body += rustEdgeLabel(195, 230, "no — aliasing XOR mut holds");
  body += rustStepBox(20, 330, 150, 50, "Compiles: many &T OR one &mut T", 5);

  body += rustHArrow(540, 230, 620);
  body += rustEdgeLabel(585, 230, "yes — rule violated");
  body += rustStepBox(615, 330, 150, 50, "Compile error (rejected build)", 6);

  // connect decision down to the two outcomes visually
  body += rustLine(95, 274, 95, 330);
  body += rustLine(690, 274, 690, 330);
  body += rustLine(240, 230, 95, 230);
  body += rustLine(95, 230, 95, 274);
  body += rustLine(540, 230, 690, 230);
  body += rustLine(690, 230, 690, 274);

  body += rustCaption(390, 405, "the borrow checker also rejects references that would outlive their data (dangling), all at COMPILE time");

  return rustFrame(
    w, h,
    "Ownership move & the borrow-checker rule",
    "Decision = diamond; outcome shown by position + badge + text, not color",
    body,
    "A value moves between owners and is dropped at scope end. A decision diamond asks whether a mutable borrow overlaps any other live borrow: if not, the code compiles with many shared or one mutable reference; if so, the build is rejected at compile time."
  );
}

/* ---------------------------------------------------------------------
 * Diagram 3: FEARLESS CONCURRENCY — a data race the compiler REJECTS vs
 * the safe Arc<Mutex<T>> pattern it accepts. Outcome via shape/badge/text.
 * ------------------------------------------------------------------- */
function rustConcurrencySVG() {
  const w = 780, h = 360;
  let body = "";

  // Left column: rejected sharing of a plain &mut across threads.
  body += rustStepBox(30, 30, 330, 34, "Try: share &mut T across two threads", 1);
  body += rustVArrow(195, 64, 92);
  body += rustDiamond(195, 140, 150, 46, "T: Send/Sync?");
  body += rustCaption(195, 206, "type-system marker check");
  body += rustVArrow(195, 186, 240);
  body += rustEdgeLabel(195, 215, "not satisfied");
  body += rustStepBox(30, 250, 330, 54, "Compiler rejects: potential data race never builds", 2);

  // Divider (no meaning, just separation).
  body += rustLine(390, 24, 390, 320);

  // Right column: accepted Arc<Mutex<T>> shared state.
  body += rustStepBox(420, 30, 330, 34, "Use: Arc&lt;Mutex&lt;T&gt;&gt; + mpsc channels", 3);
  body += rustVArrow(585, 64, 92);
  body += rustDiamond(585, 140, 150, 46, "T: Send/Sync?");
  body += rustCaption(585, 206, "Arc&lt;Mutex&gt; is Send+Sync");
  body += rustVArrow(585, 186, 240);
  body += rustEdgeLabel(585, 215, "satisfied");
  body += rustStepBox(420, 250, 330, 54, "Compiles: lock() gives exclusive access, no race", 4);

  body += rustCaption(390, 340, "Send = safe to move to another thread; Sync = safe to share by &ref. The checks happen at COMPILE time.");

  return rustFrame(
    w, h,
    "Fearless concurrency: rejected race vs safe Arc&lt;Mutex&gt;",
    "Both paths use the SAME hue; the difference is position + badge + text, not color",
    body,
    "Left path: sharing a mutable reference across threads fails the Send and Sync marker-trait check and the compiler rejects it. Right path: wrapping shared state in Arc of Mutex satisfies Send and Sync, so it compiles and the lock gives race-free exclusive access."
  );
}

/* ---------------------------------------------------------------------
 * Diagram 4: BUILD PIPELINE — source -> cargo -> rustc + LLVM -> binary.
 * ------------------------------------------------------------------- */
function rustPipelineSVG() {
  const w = 780, h = 170;
  let body = "";
  const y = 50, bh = 52;
  body += rustBox(20, y, 150, bh, "src/*.rs + Cargo.toml", 1);
  body += rustHArrow(170, y + bh / 2, 215);
  body += rustBox(215, y, 150, bh, "cargo (resolve deps)", 2);
  body += rustHArrow(365, y + bh / 2, 410);
  body += rustBox(410, y, 165, bh, "rustc front-end (MIR, borrow-ck)", 3);
  body += rustHArrow(575, y + bh / 2, 620);
  body += rustBox(620, y, 140, bh, "LLVM -> binary", 4);

  body += rustCaption(95, 130, "crates.io deps");
  body += rustCaption(290, 130, "cargo build/run/test");
  body += rustCaption(492, 130, "ownership & types checked");
  body += rustCaption(690, 130, "native executable");

  return rustFrame(
    w, h,
    "The Rust build pipeline",
    "cargo drives rustc; the borrow checker runs before LLVM codegen",
    body,
    "Source files and Cargo.toml flow into cargo which resolves dependencies, then into the rustc front-end which runs the borrow checker on MIR, then into the LLVM backend that emits a native binary."
  );
}

const TOPIC_RUST_LANG = {
  "id": "rust-lang",
  "category": "languages",
  "icon": "🦀",
  "title": "Rust Programming",
  "description": "Rust for Linux systems engineers — memory safety without a garbage collector, ownership/borrowing/lifetimes, value-based error handling (Option/Result), fearless concurrency, the cargo/rustc toolchain, FFI to C, and the Rust-for-Linux kernel effort, with accessible flow charts",
  "keywords": [
    "rust", "rustlang", "rust programming", "ownership", "borrowing",
    "borrow checker", "lifetimes", "move semantics", "memory safety",
    "cargo", "rustup", "crates", "crates.io", "rustc", "llvm",
    "traits", "generics", "monomorphization", "option", "result",
    "enum", "struct", "pattern matching", "match", "unsafe", "ffi",
    "bindgen", "cbindgen", "no_std", "async", "await", "tokio",
    "box", "rc", "arc", "mutex", "refcell", "send", "sync",
    "fearless concurrency", "data race", "rust-for-linux", "kernel",
    "clippy", "rustfmt", "edition", "ferris", "systems programming",
    "zero-cost abstractions", "raii", "wasm", "clap"
  ],
  "sections": [
    {
      "title": "1. Overview & Why Rust",
      "content": `<h4>Why Rust for Linux systems work?</h4><ul><li><strong>Memory safety without a garbage collector.</strong> Rust prevents use-after-free, double-free, dangling pointers, and buffer overflows at <em>compile time</em> via ownership and borrowing — no runtime GC, no stop-the-world pauses.</li><li><strong>"Fearless concurrency."</strong> The same type-system rules that guarantee memory safety also reject data races before the program runs.</li><li><strong>Zero-cost abstractions.</strong> Iterators, generics, and traits compile down to code comparable to hand-written C; you do not pay at runtime for the abstraction.</li><li><strong>Performance comparable to C/C++.</strong> Rust compiles through LLVM to native machine code with no interpreter or VM.</li></ul>${rustPositioningSVG()}<h4>Where Rust fits on Linux</h4><ul><li><strong>CLI tools &amp; systems daemons</strong> — ripgrep, fd, bat, and many modern utilities are Rust.</li><li><strong>WebAssembly</strong> — a first-class Rust target.</li><li><strong>Embedded</strong> — <code>no_std</code> builds run without an OS or allocator.</li><li><strong>The Linux kernel</strong> — the <strong>Rust-for-Linux</strong> project merged <em>initial</em> support in Linux <strong>6.1</strong> (2022). It is an ongoing effort used for some drivers and abstractions — not a rewrite of the kernel (covered in section 7).</li></ul><h4>Coming from C or C++?</h4><p>If you know C, you know manual <code>malloc</code>/<code>free</code> and the undefined behavior that follows a mistake. Rust keeps C-like control and layout but moves those bugs into compile errors. Versus C++, Rust offers RAII-style resource management too, but the borrow checker enforces aliasing rules the C++ compiler leaves to discipline.</p><ul><li>See the <strong>C Programming</strong> topic for manual memory and undefined behavior.</li><li>See the <strong>C++ Programming</strong> topic for RAII, move semantics, and smart pointers (close cousins of Rust's model).</li><li>See the <strong>Go Programming</strong> topic for the GC + goroutines trade-off Rust deliberately avoids.</li></ul>`
    },
    {
      "title": "2. Ownership, Borrowing & Lifetimes",
      "content": `<p>This is the heart of Rust and what replaces manual <code>malloc</code>/<code>free</code> while giving safety <em>without</em> a GC. Three rules do most of the work.</p><h4>Ownership</h4><ul><li>Each value has exactly <strong>one owner</strong>.</li><li>When the owner goes out of scope, the value is <strong>dropped</strong> (its destructor runs, memory is freed) — deterministically, like C++ RAII.</li></ul><h4>Move vs Copy</h4><pre><code>let a = String::from("hi");
let b = a;          // MOVE: ownership transfers to b
// println!("{}", a);  // compile error: 'a' was moved, no longer valid

let x = 5;
let y = x;          // COPY: integers are Copy, x is still usable
println!("{} {}", x, y);   // ok</code></pre><p>Heap-owning types (<code>String</code>, <code>Vec&lt;T&gt;</code>, <code>Box&lt;T&gt;</code>) <em>move</em>; small <code>Copy</code> types (integers, <code>bool</code>, <code>char</code>) duplicate. A move means there is still only ever one owner responsible for freeing.</p><h4>Borrowing &amp; the borrow-checker rule</h4><pre><code>fn len(s: &amp;String) -&gt; usize { s.len() }   // &amp;T: shared, read-only borrow

let mut v = vec![1, 2, 3];
let r1 = &amp;v;        // shared borrow
let r2 = &amp;v;        // another shared borrow — fine, both read
// let m = &amp;mut v;  // ERROR: cannot borrow mut while shared borrows live
println!("{:?} {:?}", r1, r2);

let m = &amp;mut v;     // &amp;mut T: exclusive, mutable borrow
m.push(4);          // ok — no other borrow is alive</code></pre><p>The rule is <strong>aliasing XOR mutability</strong>: at any moment you may have <em>either</em> many shared <code>&amp;T</code> readers <em>or</em> exactly one <code>&amp;mut T</code> writer — never both. This is what makes data races and iterator-invalidation bugs impossible.</p>${rustBorrowSVG()}<h4>Lifetimes</h4><p>A lifetime is the compile-time region for which a reference is valid. The borrow checker uses lifetimes to prove a reference never outlives the data it points to, so <strong>dangling pointers cannot exist</strong>. Most lifetimes are inferred; occasionally you annotate them with <code>'a</code>:</p><pre><code>// "the returned reference lives as long as both inputs"
fn longest&lt;'a&gt;(x: &amp;'a str, y: &amp;'a str) -&gt; &amp;'a str {
    if x.len() &gt; y.len() { x } else { y }
}</code></pre><p>You are not managing memory here — you are giving the compiler enough information to <em>check</em> that your references are sound. The C equivalent ("don't return a pointer to a local") is a convention; in Rust it is a compile error.</p>`
    },
    {
      "title": "3. The Type System & Error Handling",
      "content": `<h4>Strong static typing with inference</h4><pre><code>let n = 42;              // inferred i32
let name: &amp;str = "rust"; // explicit when you want it
let mut total = 0u64;    // suffix picks the integer type</code></pre><h4>Structs &amp; enums (algebraic data types)</h4><pre><code>struct Point { x: f64, y: f64 }

enum Shape {                 // an enum is a tagged union / sum type
    Circle { r: f64 },
    Rect { w: f64, h: f64 },
    Empty,
}</code></pre><h4>Pattern matching</h4><pre><code>fn area(s: &amp;Shape) -&gt; f64 {
    match s {                               // exhaustive: every variant handled
        Shape::Circle { r } =&gt; 3.14159 * r * r,
        Shape::Rect { w, h } =&gt; w * h,
        Shape::Empty =&gt; 0.0,
    }
}

if let Shape::Circle { r } = shape {        // match a single case
    println!("radius {}", r);
}</code></pre><h4>No null, no exceptions — errors are values</h4><p>Rust has no <code>null</code> and no exceptions. Absence is <code>Option&lt;T&gt;</code>; fallibility is <code>Result&lt;T, E&gt;</code>. The compiler forces you to handle both.</p><pre><code>enum Option&lt;T&gt; { Some(T), None }
enum Result&lt;T, E&gt; { Ok(T), Err(E) }

fn parse(s: &amp;str) -&gt; Result&lt;i32, std::num::ParseIntError&gt; {
    let n: i32 = s.trim().parse()?;   // ? = return Err early, else unwrap Ok
    Ok(n * 2)
}</code></pre><p>The <code>?</code> operator propagates errors up the call stack without <code>try/catch</code>: on <code>Err</code> it returns early; on <code>Ok</code> it hands you the inner value.</p>${rustPipelineSVG()}<h4>Traits &amp; generics</h4><pre><code>trait Area { fn area(&amp;self) -&gt; f64; }      // like an interface / typeclass

impl Area for Point { fn area(&amp;self) -&gt; f64 { 0.0 } }

fn total&lt;T: Area&gt;(items: &amp;[T]) -&gt; f64 {     // generic, bounded by a trait
    items.iter().map(|x| x.area()).sum()
}</code></pre><p>Generics are <strong>monomorphized</strong>: the compiler generates a specialized copy per concrete type, so there is no runtime dispatch cost (a zero-cost abstraction). The <code>#[derive(Debug, Clone, PartialEq)]</code> macro auto-implements common traits.</p>`
    },
    {
      "title": "4. Memory Model & Safety in Practice",
      "content": `<p>Rust gives you the same stack/heap distinction as C, but the owning types encode <em>who frees what</em> in the type itself.</p><h4>Stack, heap &amp; the owning pointers</h4><table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Type</th><th style="text-align:left; padding:0.5rem;">What it is</th><th style="text-align:left; padding:0.5rem;">C analogy</th></tr><tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>Box&lt;T&gt;</code></td><td style="padding:0.5rem;">single owner of a heap value</td><td style="padding:0.5rem;"><code>malloc</code> + guaranteed <code>free</code></td></tr><tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>Rc&lt;T&gt;</code></td><td style="padding:0.5rem;">shared ownership, reference-counted (single thread)</td><td style="padding:0.5rem;">manual refcount</td></tr><tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>Arc&lt;T&gt;</code></td><td style="padding:0.5rem;"><strong>atomic</strong> refcount — safe to share across threads</td><td style="padding:0.5rem;">refcount with atomics</td></tr><tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>Cell&lt;T&gt;</code> / <code>RefCell&lt;T&gt;</code></td><td style="padding:0.5rem;">interior mutability; <code>RefCell</code> checks borrows at <em>runtime</em></td><td style="padding:0.5rem;">mutable field behind a check</td></tr></table><pre><code>let b = Box::new(42);              // heap int, freed when b drops
let shared = Rc::new(vec![1, 2]);  // clone() bumps the count, not the data
let r = RefCell::new(0);
*r.borrow_mut() += 1;              // panics if borrow rules broken at runtime</code></pre><h4>unsafe Rust — the escape hatch</h4><p>Some operations the compiler cannot prove sound require an <code>unsafe</code> block: dereferencing raw pointers (<code>*const T</code>/<code>*mut T</code>), calling FFI functions, and a few others. Crucially, <code>unsafe</code> does <strong>not</strong> turn off the borrow checker or type checker — it only unlocks that small set of extra abilities and shifts the proof of soundness onto you.</p><pre><code>unsafe {
    let p: *const i32 = &amp;x;
    println!("{}", *p);   // dereferencing a raw pointer needs 'unsafe'
}</code></pre><p>The idiomatic pattern is a <strong>safe abstraction over an unsafe core</strong>: a tiny audited <code>unsafe</code> block wrapped in a safe API, so callers never touch raw pointers. This is exactly how <code>Vec</code>, <code>std</code>, and the Rust-for-Linux C bindings are built.</p>`
    },
    {
      "title": "5. Concurrency (\"Fearless Concurrency\")",
      "content": `<p>Rust's promise is that concurrent code which compiles is free of data races. The ownership rules plus two marker traits do this at compile time.</p><h4>Threads</h4><pre><code>use std::thread;
let handles: Vec&lt;_&gt; = (0..4).map(|i| {
    thread::spawn(move || i * i)   // 'move' gives the closure ownership of i
}).collect();
for h in handles { println!("{}", h.join().unwrap()); }</code></pre><h4>Send &amp; Sync — the type-system guard</h4><ul><li><code>Send</code>: a type is safe to <em>move</em> to another thread.</li><li><code>Sync</code>: a type is safe to <em>share</em> by <code>&amp;reference</code> across threads.</li></ul><p>The compiler only lets you move a value into a thread if its type is <code>Send</code>. A plain <code>Rc&lt;T&gt;</code> is not <code>Send</code> (its count is non-atomic), so sharing it across threads simply will not compile — the data race never ships.</p>${rustConcurrencySVG()}<h4>Channels &amp; shared state</h4><pre><code>use std::sync::{Arc, Mutex, mpsc};

// message passing
let (tx, rx) = mpsc::channel();
thread::spawn(move || tx.send(42).unwrap());
println!("{}", rx.recv().unwrap());

// shared mutable state, done safely
let counter = Arc::new(Mutex::new(0));
let c = Arc::clone(&amp;counter);
thread::spawn(move || { *c.lock().unwrap() += 1; });</code></pre><p><code>Arc&lt;Mutex&lt;T&gt;&gt;</code> is the standard shared-state pattern: <code>Arc</code> handles thread-safe sharing, <code>Mutex</code> grants exclusive access through <code>lock()</code>.</p><h4>async/await</h4><p>For I/O-bound work (thousands of connections), Rust offers <code>async</code>/<code>await</code>. Async functions return futures that an <strong>executor</strong> drives; the most common runtime is <strong>tokio</strong>. This is cooperative scheduling for I/O, distinct from the OS threads above.</p>`
    },
    {
      "title": "6. The Toolchain & Ecosystem",
      "content": `<h4>rustup — the toolchain manager</h4><pre><code>curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup update                 # update toolchains
rustup component add clippy rustfmt
rustup target add wasm32-unknown-unknown   # add a cross target</code></pre><h4>cargo — build, test, run, dependencies</h4><pre><code>cargo new myapp        # scaffold a project (+ git)
cargo build            # debug build;  --release for optimized
cargo run              # build + run
cargo test             # run unit + integration tests
cargo clippy           # lint (catches non-idiomatic / buggy patterns)
cargo fmt              # format to the community style</code></pre><h4>Cargo.toml, crates.io &amp; semantic versioning</h4><pre><code># Cargo.toml
[package]
name = "myapp"
version = "0.1.0"
edition = "2021"

[dependencies]
serde = { version = "1", features = ["derive"] }
clap  = "4"</code></pre><p>Dependencies ("crates") come from <strong>crates.io</strong> and are pinned by <strong>semantic versioning</strong>; <code>Cargo.lock</code> records exact resolved versions for reproducible builds.</p><h4>Editions</h4><p>The <strong>edition</strong> (<code>2015</code>, <code>2018</code>, <code>2021</code>, <code>2024</code>) lets the language evolve without breaking old code: a crate opts in per <code>Cargo.toml</code>, and editions interoperate. Picking a newer edition never forces your dependencies to change theirs.</p><h4>Under the hood</h4><p>cargo drives <strong>rustc</strong>, which runs the borrow checker and type checker, lowers to MIR, then hands off to the <strong>LLVM</strong> backend for optimization and native code generation (see the pipeline diagram in section 3). <code>clippy</code> adds lint analysis and <code>rustfmt</code> enforces formatting.</p>`
    },
    {
      "title": "7. Rust for Linux & Systems",
      "content": `<h4>Command-line tools</h4><pre><code>use clap::Parser;

#[derive(Parser)]
struct Args { #[arg(short, long)] name: String }

fn main() {
    let args = Args::parse();
    println!("hello, {}", args.name);
}</code></pre><p><code>clap</code> is the de-facto argument parser; combined with <code>serde</code> (serialization) and <code>anyhow</code>/<code>thiserror</code> (error ergonomics) it makes robust CLI tools and daemons straightforward.</p><h4>FFI: talking to C</h4><p>Linux systems code must interoperate with C. Rust speaks the C ABI directly:</p><pre><code>extern "C" {                 // declare a C function to call from Rust
    fn abs(input: i32) -&gt; i32;
}

#[no_mangle]
pub extern "C" fn add(a: i32, b: i32) -&gt; i32 { a + b }  // export to C</code></pre><ul><li><strong>bindgen</strong> generates Rust declarations from C headers.</li><li><strong>cbindgen</strong> generates a C header from your Rust library.</li><li>Calls across the C-ABI boundary are <code>unsafe</code> — you wrap them in a safe abstraction (section 4).</li></ul><h4>no_std for embedded &amp; kernel</h4><p><code>#![no_std]</code> drops the standard library's OS-dependent parts (keeping the <code>core</code> library), so Rust runs on bare metal or inside a kernel where there is no OS underneath and allocation is provided explicitly.</p><h4>Rust-for-Linux (accurate &amp; conservative)</h4><p><strong>Rust-for-Linux</strong> is the effort to allow writing Linux kernel components in Rust. Facts as they stand:</p><ul><li>Linux <strong>6.1</strong> (2022) merged the <em>initial</em> Rust support and infrastructure.</li><li>Work since then has focused on abstractions and a growing set of <strong>drivers</strong>; it is an <em>ongoing</em> effort, <strong>not</strong> a wholesale rewrite of the kernel. C remains the primary kernel language.</li><li>The kernel uses a <strong>constrained subset</strong> of Rust: <code>no_std</code>, its own allocation APIs, and hand-written <strong>abstractions over existing C kernel APIs</strong> so Rust code calls into C safely.</li></ul><p>Conceptually this builds on the same foundations as the site's driver topics — see <strong>Character Drivers</strong>, <strong>Block Drivers</strong>, and the <strong>C Programming</strong> topic for the C APIs these Rust abstractions wrap.</p>`
    },
    {
      "title": "8. A Worked Example & Idioms",
      "content": `<p>A small but complete sketch tying the pieces together — a struct with methods, an enum + <code>match</code>, a <code>Result</code>-returning function with <code>?</code>, and an iterator chain.</p><pre><code>use std::collections::HashMap;

#[derive(Debug)]
struct Inventory { items: HashMap&lt;String, u32&gt; }

enum Op { Add(String, u32), Remove(String) }

impl Inventory {
    fn new() -&gt; Self { Inventory { items: HashMap::new() } }

    fn apply(&amp;mut self, op: Op) {
        match op {
            Op::Add(name, qty) =&gt; *self.items.entry(name).or_insert(0) += qty,
            Op::Remove(name)   =&gt; { self.items.remove(&amp;name); }
        }
    }

    fn total(&amp;self) -&gt; u32 {
        self.items.values().copied().sum()   // iterator chain, zero-cost
    }
}

fn parse_qty(s: &amp;str) -&gt; Result&lt;u32, std::num::ParseIntError&gt; {
    let n: u32 = s.trim().parse()?;          // ? propagates the error
    Ok(n)
}

fn main() {
    let mut inv = Inventory::new();
    inv.apply(Op::Add("bolt".to_string(), 10));
    inv.apply(Op::Add("nut".to_string(), 5));
    match parse_qty("3") {
        Ok(q)  =&gt; inv.apply(Op::Add("washer".to_string(), q)),
        Err(e) =&gt; eprintln!("bad qty: {}", e),
    }
    println!("total items: {}", inv.total());
}</code></pre><h4>Idioms worth internalizing</h4><ul><li><strong>Iterators &amp; closures:</strong> <code>v.iter().filter(|x| **x &gt; 0).map(|x| x * 2).collect()</code> — lazy, fused, and as fast as a hand loop.</li><li><strong>Option combinators:</strong> prefer <code>opt.map(..).unwrap_or(default)</code> or <code>if let Some(x) = opt</code> over null-style checks.</li><li><strong>The newtype pattern:</strong> <code>struct Meters(f64);</code> wraps a primitive to get a distinct type — compile-time prevention of mixing, say, meters and seconds, at zero runtime cost.</li><li><strong>Let the compiler help:</strong> run <code>cargo clippy</code> — it teaches idiomatic Rust as you go.</li></ul>`
    },
    {
      "title": "9. Rust vs C vs C++ vs Go",
      "content": `<p>How Rust compares with the other systems languages covered on this site. Each is a reasonable choice for Linux work; the trade-offs differ.</p><table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Aspect</th><th style="text-align:left; padding:0.5rem;">Rust</th><th style="text-align:left; padding:0.5rem;">C</th><th style="text-align:left; padding:0.5rem;">C++</th><th style="text-align:left; padding:0.5rem;">Go</th></tr><tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">Memory management</td><td style="padding:0.5rem;">ownership + borrow checker</td><td style="padding:0.5rem;">manual <code>malloc</code>/<code>free</code></td><td style="padding:0.5rem;">manual + RAII / smart pointers</td><td style="padding:0.5rem;">garbage collected</td></tr><tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">Memory safety</td><td style="padding:0.5rem;">compile-time guaranteed (safe subset)</td><td style="padding:0.5rem;">programmer discipline</td><td style="padding:0.5rem;">discipline + tooling</td><td style="padding:0.5rem;">GC + bounds checks</td></tr><tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">Concurrency model</td><td style="padding:0.5rem;">threads + async; races rejected at compile time</td><td style="padding:0.5rem;">pthreads, manual locking</td><td style="padding:0.5rem;">threads + <code>std::thread</code>, manual</td><td style="padding:0.5rem;">goroutines + channels</td></tr><tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">Runtime</td><td style="padding:0.5rem;">none (no GC/VM)</td><td style="padding:0.5rem;">none</td><td style="padding:0.5rem;">none</td><td style="padding:0.5rem;">small runtime + GC</td></tr><tr><td style="padding:0.5rem;">Typical Linux use</td><td style="padding:0.5rem;">CLI tools, daemons, some kernel/drivers, embedded</td><td style="padding:0.5rem;">kernel, drivers, libc, embedded</td><td style="padding:0.5rem;">large apps, performance-critical services</td><td style="padding:0.5rem;">cloud-native tools, network services</td></tr></table><p>Cross-links: <strong>C Programming</strong>, <strong>C++ Programming</strong>, and <strong>Go Programming</strong> each cover their language in depth.</p><h4>Further reading</h4><ul><li><a href="https://doc.rust-lang.org/book/" target="_blank">The Rust Programming Language ("The Book")</a></li><li><a href="https://doc.rust-lang.org/std/" target="_blank">Rust standard library documentation</a></li><li><a href="https://rust-for-linux.com/" target="_blank">Rust-for-Linux project</a> and <a href="https://docs.kernel.org/rust/" target="_blank">kernel Rust documentation</a></li><li><a href="https://crates.io/" target="_blank">crates.io — the Rust package registry</a></li><li><a href="https://doc.rust-lang.org/cargo/" target="_blank">The Cargo Book</a></li></ul>`
    }
  ]
};
if (typeof module !== 'undefined' && module.exports) { module.exports = TOPIC_RUST_LANG; }
