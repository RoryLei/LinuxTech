/**
 * Topic: Block I/O Layer & I/O Schedulers
 *
 * The Linux block layer: the stack from VFS/filesystem through the page
 * cache, block layer, request queue, driver and device; the bio and
 * request structures; legacy single-queue vs the modern multi-queue
 * (blk-mq) block layer; I/O schedulers (none, mq-deadline, BFQ, Kyber);
 * merging & plugging; the request lifecycle; device-mapper & LVM; and
 * observability. Cross-links block-drivers (driver side) and fs-internals
 * (filesystem -> block layer) without duplicating them.
 */

/* Accessible palette (declared BEFORE use so the SVG helpers below are
 * initialized before the topic object literal calls them — avoids a
 * temporal-dead-zone ReferenceError at load time that would blank the site).
 * ONE neutral-blue hue for every box (#cfe3ff fill, #1f2d3d stroke) on a
 * #0d1117 background. Identity is carried by NUMBER badges + position +
 * shape + text, never by hue. Table borders use #30363d. */
const BIO_BOX_FILL = "#cfe3ff";
const BIO_BOX_STROKE = "#1f2d3d";
const BIO_TEXT = "#0f172a";
const BIO_NOTE = "#c9d4e0";
const BIO_ARROW = "#9db4cc";
const BIO_BG = "#0d1117";

/* =====================================================================
 * Accessible inline SVG diagram helpers (prefix bio).
 * =================================================================== */

function bioBox(x, y, w, h, label, badge) {
  const cy = y + h / 2;
  const r = 13;
  let s =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ` +
    `fill="${BIO_BOX_FILL}" stroke="${BIO_BOX_STROKE}" stroke-width="1.5"></rect>`;
  if (badge !== undefined) {
    s +=
      `<circle cx="${x + r + 4}" cy="${cy}" r="${r}" fill="${BIO_BOX_STROKE}"></circle>` +
      `<text x="${x + r + 4}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="13" font-weight="700" fill="#ffffff">${badge}</text>`;
  }
  const tx = badge !== undefined ? x + r + 4 + (w - r - 4) / 2 : x + w / 2;
  s +=
    `<text x="${tx}" y="${cy + 5}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="13.5" font-weight="600" fill="${BIO_TEXT}">${label}</text>`;
  return s;
}

function bioStepBox(x, y, w, h, label, badge) {
  const cy = y + h / 2;
  const r = 13;
  let s =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ` +
    `fill="${BIO_BOX_FILL}" stroke="${BIO_BOX_STROKE}" stroke-width="1.5"></rect>`;
  if (badge !== undefined) {
    s +=
      `<circle cx="${x + r + 4}" cy="${cy}" r="${r}" fill="${BIO_BOX_STROKE}"></circle>` +
      `<text x="${x + r + 4}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="13" font-weight="700" fill="#ffffff">${badge}</text>`;
  }
  s +=
    `<text x="${x + (badge !== undefined ? r + 24 : 14)}" y="${cy + 4}" ` +
    `font-family="sans-serif" font-size="12.5" fill="${BIO_TEXT}">${label}</text>`;
  return s;
}

function bioCaption(cx, y, text) {
  return (
    `<text x="${cx}" y="${y}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="12" fill="${BIO_NOTE}">${text}</text>`
  );
}

function bioDiamond(cx, cy, halfW, halfH, label) {
  let s =
    `<polygon points="${cx},${cy - halfH} ${cx + halfW},${cy} ${cx},${cy + halfH} ${cx - halfW},${cy}" ` +
    `fill="${BIO_BOX_FILL}" stroke="${BIO_BOX_STROKE}" stroke-width="1.5"></polygon>`;
  s +=
    `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="12" font-weight="600" fill="${BIO_TEXT}">${label}</text>`;
  return s;
}

function bioVArrow(x, y1, y2) {
  return (
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${BIO_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x - 5},${y2 - 6} ${x + 5},${y2 - 6} ${x},${y2}" fill="${BIO_ARROW}"></polygon>`
  );
}

function bioHArrow(x1, y, x2) {
  const dir = x2 >= x1 ? 1 : -1;
  return (
    `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${BIO_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x2 - dir * 7},${y - 5} ${x2 - dir * 7},${y + 5} ${x2},${y}" fill="${BIO_ARROW}"></polygon>`
  );
}

function bioFrame(viewW, viewH, title, subtitle, body, ariaLabel) {
  return (
    `<div style="overflow-x:auto; margin:1rem 0; padding:1rem; background:${BIO_BG}; ` +
    `border:1px solid #30363d; border-radius:8px;">` +
    `<div style="text-align:center; font-weight:700; font-size:1.05rem; color:#58a6ff; margin-bottom:0.25rem;">${title}</div>` +
    `<div style="text-align:center; font-size:0.85rem; color:#8b949e; margin-bottom:0.75rem;">${subtitle}</div>` +
    `<svg viewBox="0 0 ${viewW} ${viewH}" width="100%" role="img" aria-label="${ariaLabel}">${body}</svg>` +
    `</div>`
  );
}

// Diagram 1: block I/O stack top-to-bottom.
function bioStackSVG() {
  const w = 760, boxW = 440, boxX = 160, h = 50, gap = 26;
  const layers = [
    { l: "Application (read/write, fsync, O_DIRECT)", n: "syscalls into the VFS" },
    { l: "VFS & filesystem (ext4 / XFS / Btrfs)", n: "maps file offsets to block numbers — see fs-internals" },
    { l: "Page cache", n: "buffered I/O lands here; O_DIRECT bypasses it" },
    { l: "Block layer (bio -> request queue)", n: "merging, sorting, scheduling" },
    { l: "I/O scheduler (none / mq-deadline / BFQ / Kyber)", n: "orders & throttles requests" },
    { l: "Block device driver (NVMe / SCSI / virtio-blk)", n: "see the block-drivers topic" },
    { l: "Physical device (SSD / NVMe / HDD)", n: "completes the I/O, raises an IRQ" },
  ];
  let body = "";
  const topY = 16;
  layers.forEach((s, i) => {
    const y = topY + i * (h + gap);
    const cy = y + h / 2;
    body += bioBox(boxX, y, boxW, h, s.l, i + 1);
    body +=
      `<text x="${boxX + boxW + 12}" y="${cy + 4}" font-family="sans-serif" ` +
      `font-size="11" fill="${BIO_NOTE}">${s.n}</text>`;
    if (i < layers.length - 1)
      body += bioVArrow(boxX + boxW / 2, y + h, y + h + gap);
  });
  const vh = topY + layers.length * (h + gap) + 6;
  return bioFrame(
    w, vh,
    "The Block I/O Stack (top to bottom)",
    "An application (1) calls the VFS/filesystem (2); buffered I/O passes through the page cache (3); the block layer (4) builds requests scheduled (5) and handed to the driver (6) and device (7)",
    body,
    "Top to bottom block input output stack. An application issues read and write syscalls into the VFS. The filesystem, such as ext4, XFS or Btrfs, maps file offsets to device block numbers. Buffered I/O passes through the page cache while O_DIRECT bypasses it. The block layer turns I/O into bios and requests on a request queue. An I/O scheduler orders and throttles those requests. The block device driver for NVMe, SCSI or virtio-blk hands them to the physical device, which completes the I/O and raises an interrupt."
  );
}

// Diagram 2: bio -> request-queue -> blk-mq (sw queues -> hw queues) -> driver.
function bioMqSVG() {
  const w = 760, h = 46;
  let body = "";
  const topY = 16;
  body += bioStepBox(200, topY, 360, h, "submit_bio(): filesystem/page cache builds a bio", 1);
  body += bioVArrow(380, topY + h, topY + h + 22);
  const y2 = topY + h + 22;
  body += bioStepBox(200, y2, 360, h, "bio merged into a request (plugging batches them)", 2);
  body += bioVArrow(380, y2 + h, y2 + h + 22);
  // per-CPU software queues
  const y3 = y2 + h + 22;
  body += bioCaption(380, y3 - 4, "per-CPU software staging queues (ctx)");
  const swW = 150;
  body += bioBox(90, y3 + 6, swW, h, "sw queue CPU0", 3);
  body += bioBox(90 + swW + 20, y3 + 6, swW, h, "sw queue CPU1", 3);
  body += bioBox(90 + 2 * (swW + 20), y3 + 6, swW, h, "sw queue CPUn", 3);
  // map down to hw queues
  const y4 = y3 + 6 + h + 40;
  body += bioVArrow(165, y3 + 6 + h, y4);
  body += bioVArrow(165 + swW + 20, y3 + 6 + h, y4);
  body += bioVArrow(165 + 2 * (swW + 20), y3 + 6 + h, y4);
  body += bioCaption(380, y4 - 4, "hardware dispatch queues (hctx), one per device queue");
  const hwW = 220;
  body += bioBox(130, y4 + 6, hwW, h, "hw queue 0", 4);
  body += bioBox(130 + hwW + 40, y4 + 6, hwW, h, "hw queue 1", 4);
  const y5 = y4 + 6 + h + 36;
  body += bioVArrow(240, y4 + 6 + h, y5);
  body += bioVArrow(240 + hwW + 40, y4 + 6 + h, y5);
  body += bioStepBox(200, y5, 360, h, "device driver submits to NVMe/SCSI hardware queues", 5);
  const vh = y5 + h + 16;
  return bioFrame(
    w, vh,
    "blk-mq: bio to Hardware Queues",
    "A bio (1) becomes a request (2) staged on per-CPU software queues (3), mapped to hardware dispatch queues (4), and submitted by the driver (5) — parallelism that matches multi-queue NVMe/SSD hardware",
    body,
    "Multi queue block layer data path. A submit_bio call builds a bio from the filesystem or page cache. The bio is merged into a request, and plugging batches several together. Requests are staged on per CPU software queues. These are mapped down to a smaller set of hardware dispatch queues, one per device hardware queue. The device driver submits from the hardware queues to the NVMe or SCSI device. The per CPU staging removes the single lock bottleneck of the old single queue design and matches the parallelism of modern SSD and NVMe hardware."
  );
}

// Diagram 3: scheduler positioning for rotational vs SSD vs NVMe (shape/badges).
function bioSchedSVG() {
  const w = 760, h = 56, boxW = 210;
  let body = "";
  const topY = 20;
  // three device columns
  const cols = [
    { x: 40, dev: "Rotational HDD", note: "seeks dominate; order matters", sched: "mq-deadline or BFQ", badge: 1 },
    { x: 275, dev: "SATA/SAS SSD", note: "some queue depth; light ordering", sched: "mq-deadline (or Kyber)", badge: 2 },
    { x: 510, dev: "NVMe SSD", note: "huge parallelism; low latency", sched: "none (multi-queue direct)", badge: 3 },
  ];
  cols.forEach((c) => {
    body += bioBox(c.x, topY, boxW, h, "", c.badge);
    const cx = c.x + boxW / 2 + 8;
    body +=
      `<text x="${cx}" y="${topY + 24}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="13" font-weight="700" fill="${BIO_TEXT}">${c.dev}</text>` +
      `<text x="${cx}" y="${topY + 44}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="10.5" fill="${BIO_TEXT}">${c.note}</text>`;
    // arrow down to recommended scheduler box
    body += bioVArrow(c.x + boxW / 2, topY + h, topY + h + 26);
    body += bioStepBox(c.x, topY + h + 26, boxW, 46, c.sched, undefined);
  });
  const vh = topY + h + 26 + 46 + 24;
  body += bioCaption(380, vh - 6, "Recommendation shown by text/position, not colour; always benchmark your real workload");
  return bioFrame(
    w, vh,
    "I/O Scheduler Positioning by Device Type",
    "Rotational HDD (1) benefits from ordering (mq-deadline/BFQ); SATA/SAS SSD (2) wants light ordering; NVMe (3) is usually fastest with 'none' — meaning carried by text and position",
    body,
    "I/O scheduler selection by device class. Three device columns are shown. A rotational hard disk, where mechanical seeks dominate, benefits from request ordering with mq-deadline or BFQ. A SATA or SAS solid state disk, with moderate queue depth, usually wants light ordering such as mq-deadline or Kyber. An NVMe solid state disk, with very high parallelism and low latency, is usually fastest with the none scheduler that dispatches directly through the multi queue layer. The recommendation is conveyed by text and position rather than colour, and the correct choice should always be confirmed by benchmarking the real workload."
  );
}

const TOPIC_BLOCK_IO = {
  "id": "block-io",
  "category": "io",
  "icon": "💽",
  "title": "Block I/O Layer & I/O Schedulers",
  "description": "The Linux block layer end to end: the stack from VFS/filesystem through the page cache to driver and device, the bio and request structures, legacy single-queue vs the modern multi-queue (blk-mq) design with software and hardware queues, I/O schedulers (none, mq-deadline, BFQ, Kyber), merging & plugging, the request lifecycle, device-mapper & LVM, and observability (iostat, sysfs, blktrace) — with accessible diagrams.",
  "keywords": [
    "block io", "block layer", "block device", "bio", "struct bio",
    "request", "request queue", "blk-mq", "multi-queue", "single-queue",
    "software queue", "hardware queue", "hctx", "ctx", "io scheduler",
    "none", "noop", "mq-deadline", "deadline", "bfq", "kyber", "elevator",
    "merging", "plugging", "submit_bio", "dispatch", "completion", "irq",
    "device mapper", "dm", "lvm", "linear", "stripe", "mirror", "thin",
    "dm-crypt", "writeback", "page cache", "nvme", "ssd", "hdd", "sata",
    "scsi", "virtio-blk", "lsblk", "iostat", "blktrace", "blkparse",
    "iotop", "queue depth", "sysfs", "scheduler"
  ],
  "sections": [
    {
      "title": "1. What the block layer does",
      "content": `<p>The <strong>block layer</strong> is the kernel subsystem that sits between filesystems (and raw block access) above, and block device drivers below. It turns high-level read/write intentions into <em>I/O requests</em>, batches and orders them, and feeds them to the right driver — while providing merging, scheduling, accounting and a uniform interface across wildly different hardware (spinning disks, SATA/SAS SSDs, NVMe, virtio-blk, device-mapper targets).</p>
<p>Block devices are <strong>random-access, fixed-size-block</strong> devices (unlike character devices). The classic logical block size is 512 bytes; physical sectors are often 4&nbsp;KiB. The block layer's job is to make many small or scattered accesses efficient on devices whose performance characteristics differ by orders of magnitude.</p>
${bioStackSVG()}
<p>This topic covers the <em>block layer itself</em>. How a specific driver is written is the <strong>Block Device Drivers</strong> topic; how filesystems map file offsets to block numbers above the block layer is the <strong>Filesystem Internals</strong> topic — both cross-linked, not repeated here.</p>
<pre><code>lsblk -o NAME,SIZE,TYPE,ROTA,SCHED,MODEL   # tree of block devices
cat /sys/block/sda/queue/rotational        # 1 = HDD, 0 = SSD/NVMe
cat /sys/block/sda/queue/logical_block_size</code></pre>`
    },
    {
      "title": "2. The bio and the request",
      "content": `<p>Two structures carry I/O through the block layer:</p>
<ul>
<li><strong><code>struct bio</code></strong> — the fundamental unit of block I/O. A bio describes a transfer: a target device, a starting sector, a direction (read/write), and a list of <em>bio_vec</em> segments pointing at pages in memory (so a single bio can scatter/gather non-contiguous memory). The filesystem or page cache builds bios and calls <code>submit_bio()</code>.</li>
<li><strong><code>struct request</code></strong> — one or more bios combined into a unit the driver will execute. Requests live on a request queue, can be merged and reordered, and track completion status.</li>
</ul>
<p>Keeping these separate lets the upper layers think in terms of "read these pages from this file region" (bios) while the lower layers optimise "what the device should actually do next" (requests).</p>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Structure</th><th style="text-align:left; padding:0.5rem;">Granularity</th><th style="text-align:left; padding:0.5rem;">Built by</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>bio</code></td><td style="padding:0.5rem;">One contiguous device region, scatter-gather memory</td><td style="padding:0.5rem;">Filesystem / page cache / direct I/O</td></tr>
<tr><td style="padding:0.5rem;"><code>request</code></td><td style="padding:0.5rem;">One or more merged bios</td><td style="padding:0.5rem;">Block layer / scheduler</td></tr></table>`
    },
    {
      "title": "3. Single-queue vs multi-queue (blk-mq)",
      "content": `<p>The original block layer used a <strong>single request queue per device</strong> protected by one lock. That was fine for a spinning disk serving a few hundred IOPS, but it became a hard bottleneck when a single NVMe SSD can sustain <em>millions</em> of IOPS across many CPUs contending for one lock.</p>
<p>The <strong>multi-queue block layer (blk-mq)</strong> replaced it. It has two tiers of queues:</p>
<ul>
<li><strong>Software staging queues</strong> (one per CPU) — a CPU enqueues its I/O lock-free into its own queue, eliminating cross-CPU contention.</li>
<li><strong>Hardware dispatch queues</strong> (one per device hardware queue) — the software queues are mapped onto the device's real submission queues, matching the parallelism NVMe exposes.</li>
</ul>
<p>blk-mq is now the only path; the legacy single-queue code was removed. All I/O schedulers today are <em>multi-queue</em> schedulers.</p>
${bioMqSVG()}`
    },
    {
      "title": "4. I/O schedulers: none, mq-deadline, BFQ, Kyber",
      "content": `<p>An <strong>I/O scheduler</strong> (historically "elevator") decides the order and timing of request dispatch. With fast, deeply-parallel devices the best policy is often to do almost nothing; with slow or contended devices, smart ordering matters a lot.</p>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Scheduler</th><th style="text-align:left; padding:0.5rem;">Optimises for</th><th style="text-align:left; padding:0.5rem;">Typical use</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>none</strong> (noop)</td><td style="padding:0.5rem;">Minimum overhead; FIFO straight to hardware</td><td style="padding:0.5rem;">NVMe / fast SSD with deep queues</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>mq-deadline</strong></td><td style="padding:0.5rem;">Bounded latency with read/write deadlines + sorting</td><td style="padding:0.5rem;">General purpose, SATA/SAS, HDD</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>BFQ</strong></td><td style="padding:0.5rem;">Fairness &amp; interactive responsiveness (per-process weights)</td><td style="padding:0.5rem;">Desktops, mixed latency-sensitive workloads</td></tr>
<tr><td style="padding:0.5rem;"><strong>Kyber</strong></td><td style="padding:0.5rem;">Low latency via token-based read/write throttling</td><td style="padding:0.5rem;">Fast multi-queue devices under mixed load</td></tr></table>
${bioSchedSVG()}
<pre><code>cat /sys/block/nvme0n1/queue/scheduler   # [none] mq-deadline kyber bfq
echo mq-deadline | sudo tee /sys/block/sda/queue/scheduler
cat /sys/block/sda/queue/nr_requests     # queue depth the scheduler manages</code></pre>`
    },
    {
      "title": "5. Merging & plugging",
      "content": `<p>Two optimisations cut per-request overhead:</p>
<ul>
<li><strong>Merging</strong> — if a new bio is physically adjacent to an existing queued request (front or back merge), the block layer combines them into one larger request, so the device does fewer, bigger transfers. Sequential workloads benefit enormously.</li>
<li><strong>Plugging</strong> — when a process starts submitting I/O, the block layer "plugs" the queue for a short window, accumulating and merging requests, then "unplugs" to dispatch them as a batch. This trades a tiny latency for much better throughput and merge rates.</li>
</ul>
<p>Both are transparent to applications. They are also why raw micro-benchmarks that submit one tiny I/O at a time can badly mis-measure a device's real throughput.</p>`
    },
    {
      "title": "6. The request lifecycle",
      "content": `<p>Putting the pieces together, a buffered write to a file travels like this:</p>
<ol>
<li><strong>submit_bio()</strong> — the filesystem/page-cache writeback builds a bio and submits it.</li>
<li><strong>merge / sort</strong> — the block layer tries to merge it into an existing request; plugging batches several.</li>
<li><strong>schedule</strong> — the I/O scheduler orders requests (or passes straight through with <code>none</code>).</li>
<li><strong>dispatch</strong> — the request moves to a hardware dispatch queue and the driver submits it to the device.</li>
<li><strong>completion IRQ</strong> — the device finishes and raises an interrupt; the driver completes the request, which wakes any waiter and runs end-of-I/O callbacks (e.g. marking pages clean).</li>
</ol>
<p>The completion path ties back to the kernel's interrupt handling (see the <em>IRQ Domains</em> and <em>Workqueues</em> topics): hard-IRQ completion is kept short, with heavier work deferred to softirq/threaded context.</p>`
    },
    {
      "title": "7. Device-mapper & LVM",
      "content": `<p><strong>Device-mapper (dm)</strong> is a block-layer framework that builds <em>virtual</em> block devices by mapping their I/O onto one or more underlying devices through stackable <strong>targets</strong>. Each target implements a mapping policy; dm devices can be stacked, so complex storage is composed from simple pieces.</p>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Target</th><th style="text-align:left; padding:0.5rem;">Mapping</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>linear</code></td><td style="padding:0.5rem;">Concatenate ranges of underlying devices</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>striped</code></td><td style="padding:0.5rem;">RAID-0-style striping across devices</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>mirror</code> / <code>raid</code></td><td style="padding:0.5rem;">Redundancy across devices</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>thin</code></td><td style="padding:0.5rem;">Thin provisioning &amp; snapshots</td></tr>
<tr><td style="padding:0.5rem;"><code>crypt</code> (dm-crypt)</td><td style="padding:0.5rem;">Transparent encryption (LUKS)</td></tr></table>
<p><strong>LVM</strong> (Logical Volume Manager) is the user-space layer built on dm: physical volumes group into volume groups, from which logical volumes are carved and resized on the fly. Every logical volume is ultimately a dm device sitting in the block layer.</p>
<pre><code>lsblk                       # shows dm-/LVM devices stacked over disks
sudo dmsetup ls --tree      # device-mapper target stack
sudo lvs; sudo vgs; sudo pvs</code></pre>`
    },
    {
      "title": "8. Writeback & the page cache",
      "content": `<p>Most block I/O is not direct — it flows through the <strong>page cache</strong>. Reads are satisfied from cache when possible; buffered writes land in cache as <em>dirty</em> pages and are flushed later by writeback threads, which is when they become bios and enter the block layer. This decoupling is what makes writes feel fast and lets the block layer merge many small writes into fewer large ones.</p>
<p><code>O_DIRECT</code> bypasses the page cache for applications (databases) that manage their own caching, trading the cache's benefits for predictable, double-buffer-free I/O. The page-cache and writeback mechanics themselves live in the <strong>Linux Memory Management</strong> topic; here the point is simply that writeback is the main <em>source</em> of block-layer traffic.</p>
<pre><code>grep -E 'Dirty|Writeback' /proc/meminfo
sysctl vm.dirty_ratio vm.dirty_background_ratio</code></pre>`
    },
    {
      "title": "9. Observability & tuning",
      "content": `<p>The block layer is heavily instrumented. Start broad with <code>iostat</code>, then drill into sysfs and tracing.</p>
<pre><code>iostat -x 1               # per-device util%, await, r/s w/s, queue size
cat /sys/block/nvme0n1/queue/scheduler       # active scheduler
cat /sys/block/nvme0n1/queue/nr_requests     # queue depth
iotop -o                  # per-process I/O (needs privileges)

# deep per-request tracing of the block layer:
sudo blktrace -d /dev/sda -o - | blkparse -i -</code></pre>
<p>Key <code>iostat -x</code> fields: <code>%util</code> (device busy time — misleading on parallel NVMe), <code>await</code> (average latency), <code>aqu-sz</code> (average queue depth), and <code>r/s</code>/<code>w/s</code> (IOPS). For request-level forensics, <strong>blktrace/blkparse</strong> traces every queue, merge, dispatch and completion event — the definitive tool for understanding what the block layer actually did.</p>
<h4>References & further reading</h4>
<ul>
<li><a href="https://docs.kernel.org/block/index.html" target="_blank">Kernel docs — Block Layer</a></li>
<li><a href="https://docs.kernel.org/block/blk-mq.html" target="_blank">Kernel docs — Multi-Queue Block IO Queueing (blk-mq)</a></li>
<li><a href="https://docs.kernel.org/admin-guide/device-mapper/index.html" target="_blank">Kernel docs — Device Mapper</a></li>
<li><a href="https://www.kernel.org/doc/man-pages/" target="_blank">man-pages: <code>iostat(1)</code>, <code>lsblk(8)</code>, <code>blktrace(8)</code>, <code>lvm(8)</code></a></li>
</ul>`
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) { module.exports = TOPIC_BLOCK_IO; }
