/**
 * Topic: Linux Memory Management (allocator & reclaim internals)
 *
 * The core kernel MM subsystem: the page as the unit of memory, the buddy
 * page allocator and its zones, the SLUB/SLAB/SLOB object allocators,
 * the page cache, swap & reclaim (kswapd / LRU / direct reclaim), huge
 * pages & THP, the OOM killer, the cgroup v2 memory controller, page
 * tables / TLB, and NUMA memory & tiering. Complements mmap-zerocopy
 * (virtual mapping / zero-copy) and cxl (CPU-less NUMA nodes / tiering)
 * without duplicating them — the focus here is allocator and reclaim
 * internals.
 */

/* Accessible palette (declared BEFORE use so the SVG helpers below are
 * initialized before the topic object literal calls them — avoids a
 * temporal-dead-zone ReferenceError at load time that would blank the site).
 * ONE neutral-blue hue for every box (#cfe3ff fill, #1f2d3d stroke) on a
 * #0d1117 background. Element identity is carried by NUMBER badges +
 * position + shape + text, never by hue. No red/green/yellow conveys
 * meaning. Table borders use #30363d. */
const MM_BOX_FILL = "#cfe3ff";
const MM_BOX_STROKE = "#1f2d3d";
const MM_TEXT = "#0f172a";
const MM_NOTE = "#c9d4e0";
const MM_ARROW = "#9db4cc";
const MM_BG = "#0d1117";

/* =====================================================================
 * Accessible inline SVG diagram helpers (prefix mm). Single blue fill,
 * numbered circle badges, arrows, high-contrast text.
 * =================================================================== */

function mmBox(x, y, w, h, label, badge) {
  const cy = y + h / 2;
  const r = 13;
  let s =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ` +
    `fill="${MM_BOX_FILL}" stroke="${MM_BOX_STROKE}" stroke-width="1.5"></rect>`;
  if (badge !== undefined) {
    s +=
      `<circle cx="${x + r + 4}" cy="${cy}" r="${r}" fill="${MM_BOX_STROKE}"></circle>` +
      `<text x="${x + r + 4}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="13" font-weight="700" fill="#ffffff">${badge}</text>`;
  }
  const tx = badge !== undefined ? x + r + 4 + (w - r - 4) / 2 : x + w / 2;
  s +=
    `<text x="${tx}" y="${cy + 5}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="13.5" font-weight="600" fill="${MM_TEXT}">${label}</text>`;
  return s;
}

function mmStepBox(x, y, w, h, label, badge) {
  const cy = y + h / 2;
  const r = 13;
  let s =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ` +
    `fill="${MM_BOX_FILL}" stroke="${MM_BOX_STROKE}" stroke-width="1.5"></rect>`;
  if (badge !== undefined) {
    s +=
      `<circle cx="${x + r + 4}" cy="${cy}" r="${r}" fill="${MM_BOX_STROKE}"></circle>` +
      `<text x="${x + r + 4}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="13" font-weight="700" fill="#ffffff">${badge}</text>`;
  }
  s +=
    `<text x="${x + (badge !== undefined ? r + 24 : 14)}" y="${cy + 4}" ` +
    `font-family="sans-serif" font-size="12.5" fill="${MM_TEXT}">${label}</text>`;
  return s;
}

function mmCaption(cx, y, text) {
  return (
    `<text x="${cx}" y="${y}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="12" fill="${MM_NOTE}">${text}</text>`
  );
}

function mmDiamond(cx, cy, halfW, halfH, label) {
  let s =
    `<polygon points="${cx},${cy - halfH} ${cx + halfW},${cy} ${cx},${cy + halfH} ${cx - halfW},${cy}" ` +
    `fill="${MM_BOX_FILL}" stroke="${MM_BOX_STROKE}" stroke-width="1.5"></polygon>`;
  s +=
    `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="12" font-weight="600" fill="${MM_TEXT}">${label}</text>`;
  return s;
}

function mmVArrow(x, y1, y2) {
  return (
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${MM_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x - 5},${y2 - 6} ${x + 5},${y2 - 6} ${x},${y2}" fill="${MM_ARROW}"></polygon>`
  );
}

function mmVArrowUp(x, y1, y2) {
  return (
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${MM_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x - 5},${y2 + 6} ${x + 5},${y2 + 6} ${x},${y2}" fill="${MM_ARROW}"></polygon>`
  );
}

function mmHArrow(x1, y, x2) {
  const dir = x2 >= x1 ? 1 : -1;
  return (
    `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${MM_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x2 - dir * 7},${y - 5} ${x2 - dir * 7},${y + 5} ${x2},${y}" fill="${MM_ARROW}"></polygon>`
  );
}

function mmFrame(viewW, viewH, title, subtitle, body, ariaLabel) {
  return (
    `<div style="overflow-x:auto; margin:1rem 0; padding:1rem; background:${MM_BG}; ` +
    `border:1px solid #30363d; border-radius:8px;">` +
    `<div style="text-align:center; font-weight:700; font-size:1.05rem; color:#58a6ff; margin-bottom:0.25rem;">${title}</div>` +
    `<div style="text-align:center; font-size:0.85rem; color:#8b949e; margin-bottom:0.75rem;">${subtitle}</div>` +
    `<svg viewBox="0 0 ${viewW} ${viewH}" width="100%" role="img" aria-label="${ariaLabel}">${body}</svg>` +
    `</div>`
  );
}

// Diagram 1: MM layering — virtual address space / page tables ->
// page allocator (buddy) -> zones / physical frames.
function mmLayeringSVG() {
  const w = 760, boxW = 440, boxX = 160, h = 52, gap = 28;
  const layers = [
    { l: "Process virtual address space (VMAs)", n: "mmap / brk / stack / file mappings — see mmap-zerocopy" },
    { l: "Page tables (PGD -> P4D -> PUD -> PMD -> PTE)", n: "MMU walks them; TLB caches translations" },
    { l: "Page allocator (buddy system)", n: "hands out physical page frames in orders 0..MAX_ORDER-1" },
    { l: "Zones: DMA / DMA32 / NORMAL / MOVABLE / (HIGHMEM)", n: "per-NUMA-node pools of frames with placement rules" },
    { l: "Physical page frames (struct page, 4 KiB base)", n: "RAM backing — the unit the whole subsystem tracks" },
  ];
  let body = "";
  const topY = 20;
  layers.forEach((s, i) => {
    const y = topY + i * (h + gap);
    const cy = y + h / 2;
    body += mmBox(boxX, y, boxW, h, s.l, i + 1);
    body +=
      `<text x="${boxX + boxW + 12}" y="${cy + 4}" font-family="sans-serif" ` +
      `font-size="11" fill="${MM_NOTE}">${s.n}</text>`;
    if (i < layers.length - 1)
      body += mmVArrow(boxX + boxW / 2, y + h, y + h + gap);
  });
  body +=
    `<text x="30" y="${topY + h / 2 + 4}" font-family="sans-serif" font-size="11.5" fill="${MM_NOTE}">virtual</text>` +
    `<text x="30" y="${topY + 4 * (h + gap) + h / 2 + 4}" font-family="sans-serif" font-size="11.5" fill="${MM_NOTE}">physical</text>`;
  const vh = topY + layers.length * (h + gap) + 6;
  return mmFrame(
    w, vh,
    "Memory-Management Layering (virtual to physical)",
    "A process' virtual address space (1) is translated by page tables (2); the buddy page allocator (3) hands out frames from zones (4) backed by physical page frames (5)",
    body,
    "Layered view of Linux memory management from virtual to physical. A process virtual address space built from VMAs sits on top. Page tables, a four or five level radix tree from PGD down to PTE, translate virtual to physical and are cached by the TLB. Below them the buddy page allocator hands out physical page frames in power-of-two orders. The frames come from zones such as DMA, DMA32, NORMAL, MOVABLE and on some 32-bit systems HIGHMEM, each a per NUMA node pool. At the bottom are the physical page frames, each described by a struct page, the unit the whole subsystem tracks."
  );
}

// Diagram 2: allocation-and-reclaim flow with a diamond decision.
function mmReclaimFlowSVG() {
  const w = 760, boxW = 440, boxX = 160, h = 46, gap = 24;
  let body = "";
  const topY = 20;
  body += mmStepBox(boxX, topY, boxW, h, "allocation request (alloc_pages / kmalloc / fault)", 1);
  body += mmVArrow(boxX + boxW / 2, topY + h, topY + h + gap);
  const diaCy = topY + h + gap + 40;
  body += mmDiamond(boxX + boxW / 2, diaCy, 150, 40, "free page at order?");
  // yes branch -> right -> served
  const yesX = 660;
  body +=
    `<line x1="${boxX + boxW / 2 + 150}" y1="${diaCy}" x2="${yesX}" y2="${diaCy}" stroke="${MM_ARROW}" stroke-width="2"></line>` +
    `<line x1="${yesX}" y1="${diaCy}" x2="${yesX}" y2="${diaCy + 50}" stroke="${MM_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${yesX - 5},${diaCy + 44} ${yesX + 5},${diaCy + 44} ${yesX},${diaCy + 50}" fill="${MM_ARROW}"></polygon>` +
    `<text x="${boxX + boxW / 2 + 158}" y="${diaCy - 8}" font-family="sans-serif" font-size="11.5" fill="${MM_NOTE}">yes</text>`;
  body += mmBox(580, diaCy + 50, 160, h, "serve the pages", 2);
  // no branch continues downward
  body += mmVArrow(boxX + boxW / 2, diaCy + 40, diaCy + 40 + gap);
  body +=
    `<text x="${boxX + boxW / 2 + 10}" y="${diaCy + 40 + gap - 6}" font-family="sans-serif" font-size="11.5" fill="${MM_NOTE}">no</text>`;
  const y3 = diaCy + 40 + gap;
  body += mmStepBox(boxX, y3, boxW, h, "wake kswapd; reclaim LRU pages (clean drop / write back)", 3);
  body += mmVArrow(boxX + boxW / 2, y3 + h, y3 + h + gap);
  const y4 = y3 + h + gap;
  body += mmStepBox(boxX, y4, boxW, h, "still short? direct reclaim in caller context", 4);
  body += mmVArrow(boxX + boxW / 2, y4 + h, y4 + h + gap);
  const y5 = y4 + h + gap;
  body += mmStepBox(boxX, y5, boxW, h, "fragmented? memory compaction to form high-order pages", 5);
  body += mmVArrow(boxX + boxW / 2, y5 + h, y5 + h + gap);
  const y6 = y5 + h + gap;
  body += mmStepBox(boxX, y6, boxW, h, "last resort: OOM killer selects a victim by oom_score", 6);
  const vh = y6 + h + 16;
  return mmFrame(
    w, vh,
    "Allocation & Reclaim Flow",
    "A request (1) is served if a free page of the right order exists (2); otherwise kswapd reclaim (3), direct reclaim (4) and compaction (5) run, with the OOM killer (6) as the last resort",
    body,
    "Allocation and reclaim flow chart. An allocation request arrives. A diamond decision asks whether a free page exists at the requested order. If yes, the pages are served. If no, the kernel wakes kswapd and reclaims pages from the LRU lists by dropping clean pages or writing back dirty ones. If still short, the caller performs direct reclaim synchronously. If memory is fragmented, compaction runs to form higher order pages. As a last resort the out of memory killer selects a victim process by its oom_score. Branch meaning is carried by text labels and the diamond shape, not by colour."
  );
}

// Diagram 3: SLUB-on-buddy relationship.
function mmSlubSVG() {
  const w = 760, h = 50;
  let body = "";
  const topY = 20;
  body += mmStepBox(120, topY, 520, h, "kmalloc(size) / kmem_cache_alloc(cache) — callers want small objects", 1);
  body += mmVArrow(380, topY + h, topY + h + 24);
  const y2 = topY + h + 24;
  body += mmStepBox(120, y2, 520, h, "SLUB slab cache: per-CPU active slab, freelist of objects", 2);
  // side note
  body +=
    `<text x="648" y="${y2 + h / 2 + 4}" font-family="sans-serif" font-size="11" fill="${MM_NOTE}">per-CPU, lockless fast path</text>`;
  body += mmVArrow(380, y2 + h, y2 + h + 24);
  const y3 = y2 + h + 24;
  body += mmStepBox(120, y3, 520, h, "slab = one or more contiguous pages carved into equal objects", 3);
  body += mmVArrow(380, y3 + h, y3 + h + 24);
  const y4 = y3 + h + 24;
  body += mmStepBox(120, y4, 520, h, "buddy page allocator supplies the backing pages (order-N)", 4);
  body +=
    `<text x="648" y="${y4 + h / 2 + 4}" font-family="sans-serif" font-size="11" fill="${MM_NOTE}">refills when empty</text>`;
  const vh = y4 + h + 16;
  return mmFrame(
    w, vh,
    "SLUB on Top of the Buddy Allocator",
    "kmalloc (1) draws objects from a SLUB per-CPU slab (2); a slab (3) is backed by pages the buddy allocator (4) supplies and refills",
    body,
    "Relationship between the SLUB object allocator and the buddy page allocator. Callers use kmalloc or kmem_cache_alloc to request small objects. SLUB serves them from a per CPU active slab with a lockless freelist fast path. A slab is one or more contiguous pages carved into equal sized objects. The buddy page allocator supplies those backing pages in power of two orders and refills the cache when it empties."
  );
}

const TOPIC_MEMORY_MANAGEMENT = {
  "id": "memory-management",
  "category": "kernel",
  "icon": "🗃️",
  "title": "Linux Memory Management",
  "description": "The core kernel memory-management subsystem: the page and the buddy page allocator, zones (DMA/NORMAL/HIGHMEM) and fragmentation/compaction, the SLUB/SLAB/SLOB object allocators (kmalloc vs vmalloc), the page cache and writeback, swap & reclaim (kswapd, LRU, direct reclaim, swappiness), huge pages & THP, the OOM killer, the cgroup v2 memory controller and PSI, page tables & the TLB, and NUMA memory & tiering — with accessible diagrams.",
  "keywords": [
    "memory management", "mm", "page", "struct page", "page frame",
    "buddy allocator", "page allocator", "alloc_pages", "get_free_pages",
    "zone", "zone_dma", "zone_normal", "zone_highmem", "zone_movable",
    "order", "pageblock", "fragmentation", "compaction", "migratetype",
    "slab", "slub", "slob", "kmalloc", "kmem_cache", "vmalloc",
    "per-cpu cache", "slabinfo", "page cache", "dirty page", "writeback",
    "readahead", "swap", "swappiness", "reclaim", "kswapd", "direct reclaim",
    "lru", "active list", "inactive list", "huge pages", "hugetlb",
    "transparent huge pages", "thp", "oom killer", "oom_score", "oom_score_adj",
    "cgroup", "cgroup v2", "memory controller", "memory.max", "memory.high",
    "memory.low", "psi", "pressure stall information", "page tables", "tlb",
    "numa", "memory tiering", "numactl", "meminfo", "buddyinfo", "vmstat"
  ],
  "sections": [
    {
      "title": "1. Virtual vs physical memory & the page",
      "content": `<p>Linux memory management sits between two views of memory. Each process sees a private, contiguous <strong>virtual address space</strong>; the hardware MMU and the kernel translate those addresses to scattered <strong>physical page frames</strong> in RAM. The unit of all of this is the <strong>page</strong> — almost universally 4&nbsp;KiB on x86-64 and arm64 (larger base pages exist on some arches). Every physical page frame is described by a <code>struct page</code> (now increasingly a <code>struct folio</code> for multi-page objects).</p>
<p>This topic is about the <em>supply side</em>: how the kernel tracks, allocates and reclaims those physical frames. The <em>mapping side</em> — how virtual areas (VMAs), <code>mmap()</code>, demand paging and zero-copy work — is covered in the <strong>Virtual Memory Mapping (mmap-zerocopy)</strong> topic; this topic cross-links it rather than repeating it.</p>
${mmLayeringSVG()}
<h4>The big subsystems at a glance</h4>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Subsystem</th><th style="text-align:left; padding:0.5rem;">Unit it manages</th><th style="text-align:left; padding:0.5rem;">Covered in</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">Buddy page allocator</td><td style="padding:0.5rem;">Physical page frames (orders)</td><td style="padding:0.5rem;">Section 2</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">SLUB/SLAB/SLOB</td><td style="padding:0.5rem;">Small kernel objects</td><td style="padding:0.5rem;">Section 3</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">Page cache</td><td style="padding:0.5rem;">File-backed pages</td><td style="padding:0.5rem;">Section 4</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">Swap &amp; reclaim</td><td style="padding:0.5rem;">LRU pages under pressure</td><td style="padding:0.5rem;">Section 5</td></tr>
<tr><td style="padding:0.5rem;">cgroup v2 memory</td><td style="padding:0.5rem;">Per-group limits &amp; pressure</td><td style="padding:0.5rem;">Section 8</td></tr></table>
<p>A quick way to see the whole picture at runtime:</p>
<pre><code>cat /proc/meminfo        # MemTotal/MemFree/Buffers/Cached/SwapTotal/Slab...
free -h                  # human-readable summary of the same numbers
vmstat 1                 # si/so (swap), free, buff, cache over time</code></pre>`
    },
    {
      "title": "2. The buddy page allocator & zones",
      "content": `<p>The <strong>buddy allocator</strong> is the kernel's physical page-frame allocator. Free frames are grouped into <strong>orders</strong>: order-0 is a single 4&nbsp;KiB page, order-1 is two contiguous pages, order-2 is four, up to <code>MAX_ORDER-1</code>. When a request of order <em>n</em> cannot be satisfied, the allocator splits a larger free block in half repeatedly; when a block is freed, it is merged ("buddied") with its free neighbour to rebuild larger blocks. This keeps allocation and freeing close to O(log&nbsp;N) while fighting fragmentation.</p>
<h4>Zones</h4>
<p>Physical memory is partitioned into <strong>zones</strong> because not all memory is equally usable:</p>
<ul>
<li><strong>ZONE_DMA / ZONE_DMA32</strong> — low physical addresses usable by devices with limited addressing.</li>
<li><strong>ZONE_NORMAL</strong> — the directly-mapped workhorse memory on 64-bit systems.</li>
<li><strong>ZONE_HIGHMEM</strong> — legacy 32-bit memory above the kernel's direct map (rare on modern 64-bit).</li>
<li><strong>ZONE_MOVABLE</strong> — holds only movable allocations, which makes compaction and hot-unplug easier.</li>
</ul>
<p>Each NUMA node has its own set of zones. Allocations carry GFP flags (e.g. <code>GFP_KERNEL</code>, <code>GFP_ATOMIC</code>, <code>__GFP_DMA</code>) that steer which zones are eligible.</p>
<h4>Fragmentation & compaction</h4>
<p>Long-running systems scatter free pages so that, although plenty of memory is free, no large contiguous block exists — this is <strong>external fragmentation</strong>. The allocator groups pages by <strong>migratetype</strong> within <strong>pageblocks</strong> so movable pages cluster together, and <strong>memory compaction</strong> migrates movable pages to coalesce free high-order blocks (vital for huge pages).</p>
<pre><code>cat /proc/buddyinfo      # free blocks per order, per zone, per node
# Node 0, zone   Normal   1432   901   433   210 ... (order 0,1,2,3,...)
cat /proc/pagetypeinfo   # free blocks broken down by migratetype</code></pre>
<p>The CPU-less NUMA node exposed by a <strong>CXL</strong> memory device (see the <em>CXL</em> topic) appears here as just another node with its own zones that the buddy allocator can hand out.</p>`
    },
    {
      "title": "3. SLAB / SLUB / SLOB object allocators",
      "content": `<p>The buddy allocator only deals in whole pages, but the kernel constantly needs small objects (a <code>task_struct</code>, a <code>dentry</code>, a network buffer header). The <strong>slab allocators</strong> sit on top of the buddy allocator and carve pages into equal-sized objects, keeping freelists so allocation and freeing are a few pointer operations.</p>
${mmSlubSVG()}
<h4>The three implementations</h4>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Allocator</th><th style="text-align:left; padding:0.5rem;">Design</th><th style="text-align:left; padding:0.5rem;">Where used</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>SLUB</strong></td><td style="padding:0.5rem;">Per-CPU slabs, minimal metadata, good scalability</td><td style="padding:0.5rem;">Default on virtually all modern kernels</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>SLAB</strong></td><td style="padding:0.5rem;">Older design with per-CPU + per-node queues</td><td style="padding:0.5rem;">Legacy; removed from recent kernels</td></tr>
<tr><td style="padding:0.5rem;"><strong>SLOB</strong></td><td style="padding:0.5rem;">Tiny, simple first-fit</td><td style="padding:0.5rem;">Was for deeply embedded; now removed</td></tr></table>
<h4>kmalloc vs vmalloc</h4>
<ul>
<li><strong><code>kmalloc()</code></strong> returns memory that is <em>physically contiguous</em> and comes from the SLUB kmalloc caches (sizes rounded up to <code>kmalloc-8</code>, <code>kmalloc-16</code>, … powers of two). Best for small, DMA-friendly, performance-sensitive allocations.</li>
<li><strong><code>vmalloc()</code></strong> returns memory that is <em>virtually contiguous but physically scattered</em>, assembled by mapping individual pages into the vmalloc area. Good for large buffers where physical contiguity is not required; slower and uses page-table entries.</li>
</ul>
<p>Named caches created with <code>kmem_cache_create()</code> back frequently-used object types, and <strong>per-CPU caches</strong> give each CPU a private freelist so the hot path needs no shared lock.</p>
<pre><code>sudo cat /proc/slabinfo  # name, active_objs, num_objs, objsize, objperslab...
slabtop                  # live top-like view of slab caches by size</code></pre>`
    },
    {
      "title": "4. The page cache, dirty writeback & readahead",
      "content": `<p>Almost all file I/O flows through the <strong>page cache</strong>: file contents are cached in page-sized units keyed by (inode, offset). A read that hits the cache avoids touching the disk; a write usually lands in the cache first and is written back later. This is why "free" memory on a healthy Linux box is low — most of it is productive page cache, not wasted.</p>
<h4>Dirty pages & writeback</h4>
<p>A modified cached page is <strong>dirty</strong> until its contents reach storage. Per-bdi (backing device) writeback threads flush dirty pages, bounded by tunables such as <code>vm.dirty_ratio</code> / <code>vm.dirty_background_ratio</code>. The write path here connects to the <strong>Block I/O Layer</strong> topic, where those writes become bios and requests.</p>
<h4>Readahead</h4>
<p>On sequential reads the kernel speculatively loads pages ahead of the current position, so later reads hit the cache. The window grows while the access pattern stays sequential and collapses on random access.</p>
<pre><code>grep -E 'Dirty|Writeback|Cached' /proc/meminfo
sysctl vm.dirty_ratio vm.dirty_background_ratio
# drop clean cache for a benchmark (not for production tuning):
echo 1 | sudo tee /proc/sys/vm/drop_caches</code></pre>
<p>The zero-copy techniques in the <em>mmap-zerocopy</em> topic (e.g. <code>mmap</code>, <code>sendfile</code>, <code>splice</code>) are fundamentally ways to share page-cache pages without copying them to user space.</p>`
    },
    {
      "title": "5. Swap, reclaim, kswapd & the LRU lists",
      "content": `<p>When free memory drops below a zone's watermarks, the kernel must <strong>reclaim</strong> pages. It tracks pages on <strong>LRU lists</strong> — split into <em>active</em> and <em>inactive</em>, and separately for <em>anonymous</em> (heap/stack) and <em>file-backed</em> pages. Reclaim scans the inactive lists first; frequently used pages get promoted to active, cold pages get evicted.</p>
<h4>Clean vs dirty, file vs anon</h4>
<ul>
<li><strong>Clean file pages</strong> can be dropped instantly — they can be re-read from the file.</li>
<li><strong>Dirty file pages</strong> must be written back before freeing.</li>
<li><strong>Anonymous pages</strong> have no backing file, so reclaiming them requires writing to <strong>swap</strong>.</li>
</ul>
<h4>kswapd vs direct reclaim</h4>
<p><strong>kswapd</strong> is a per-node kernel thread that reclaims in the background when free memory falls below the low watermark, keeping allocations fast. If an allocation still cannot be satisfied, the requesting task performs <strong>direct reclaim</strong> synchronously in its own context — which is why a process can stall under memory pressure. The <strong>swappiness</strong> knob (<code>vm.swappiness</code>, 0–200) biases reclaim between evicting file pages and swapping anonymous pages.</p>
${mmReclaimFlowSVG()}
<pre><code>vmstat 1                 # si (swap-in) / so (swap-out) columns
cat /proc/vmstat | grep -E 'pgscan|pgsteal|kswapd'
sysctl vm.swappiness
swapon --show            # active swap devices / files</code></pre>`
    },
    {
      "title": "6. Huge pages & Transparent Huge Pages (THP)",
      "content": `<p>Mapping memory with the base 4&nbsp;KiB page means a large working set needs many page-table entries and many TLB slots. <strong>Huge pages</strong> (2&nbsp;MiB and 1&nbsp;GiB on x86-64) map more memory per TLB entry, cutting TLB misses and page-walk cost for big, dense workloads such as databases and VMs.</p>
<h4>Two flavours</h4>
<ul>
<li><strong>HugeTLB</strong> — explicitly reserved huge pages from a pool, requested via <code>MAP_HUGETLB</code> or hugetlbfs. Deterministic but requires pre-reservation and contiguous memory.</li>
<li><strong>Transparent Huge Pages (THP)</strong> — the kernel automatically promotes eligible anonymous ranges to huge pages and demotes them as needed, with the <code>khugepaged</code> thread collapsing small pages into huge ones in the background. Modes: <code>always</code>, <code>madvise</code>, <code>never</code>.</li>
</ul>
<p>Huge pages depend directly on the buddy allocator producing high-order contiguous blocks, which is exactly why <strong>compaction</strong> (section 2) matters so much.</p>
<pre><code>grep Huge /proc/meminfo
cat /sys/kernel/mm/transparent_hugepage/enabled   # [always] madvise never
cat /sys/kernel/mm/hugepages/hugepages-2048kB/nr_hugepages</code></pre>`
    },
    {
      "title": "7. The OOM killer",
      "content": `<p>If reclaim, direct reclaim and compaction all fail to free enough memory, the kernel invokes the <strong>Out-Of-Memory (OOM) killer</strong> as a last resort to avoid a total deadlock. It chooses a <strong>victim</strong> process to kill and free its memory.</p>
<h4>Choosing a victim</h4>
<p>Each task gets an <strong>oom_score</strong> derived mainly from its resident memory footprint (so large memory hogs are preferred), adjusted by <code>oom_score_adj</code> (−1000 to +1000). Setting <code>oom_score_adj</code> to −1000 makes a task effectively unkillable; raising it marks a task as a preferred victim. The goal is to recover the most memory by killing the fewest, least-critical processes.</p>
<pre><code>dmesg | grep -i 'killed process\\|oom'     # kernel log of OOM events
cat /proc/&lt;pid&gt;/oom_score                 # current score
cat /proc/&lt;pid&gt;/oom_score_adj             # tunable bias (-1000..1000)</code></pre>
<p>Under cgroup v2 (next section) OOM handling can be scoped <em>per group</em>: a container that exceeds its <code>memory.max</code> triggers a cgroup-local OOM kill instead of threatening the whole host.</p>`
    },
    {
      "title": "8. cgroup v2 memory controller & PSI",
      "content": `<p>The <strong>cgroup v2 memory controller</strong> accounts and limits memory per control group, which is how containers and systemd services get memory isolation. The key knobs form a band:</p>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Knob</th><th style="text-align:left; padding:0.5rem;">Meaning</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>memory.low</code></td><td style="padding:0.5rem;">Best-effort protection — reclaim avoids this group until others are squeezed</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>memory.high</code></td><td style="padding:0.5rem;">Throttle point — over this, the group is aggressively reclaimed and throttled</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>memory.max</code></td><td style="padding:0.5rem;">Hard limit — exceeding it triggers a cgroup OOM kill</td></tr>
<tr><td style="padding:0.5rem;"><code>memory.current</code></td><td style="padding:0.5rem;">Current usage (read-only)</td></tr></table>
<h4>Pressure Stall Information (PSI)</h4>
<p><strong>PSI</strong> quantifies how much time tasks stalled waiting on a resource. <code>memory.pressure</code> (per cgroup) and <code>/proc/pressure/memory</code> (system) report <em>some</em> and <em>full</em> stall percentages over 10s/60s/300s windows — a direct signal that a workload is memory-starved, far more actionable than a bare free-memory number.</p>
<pre><code>cat /sys/fs/cgroup/&lt;group&gt;/memory.max
cat /sys/fs/cgroup/&lt;group&gt;/memory.current
cat /sys/fs/cgroup/&lt;group&gt;/memory.pressure   # some/full avg10/avg60/avg300
cat /proc/pressure/memory                     # system-wide PSI</code></pre>
<p>The full container isolation story — how this combines with namespaces, capabilities and seccomp — is in the <em>Linux Security</em> topic.</p>`
    },
    {
      "title": "9. Page tables, TLB, NUMA & memory tiering",
      "content": `<p><strong>Page tables</strong> are the per-process radix tree the MMU walks to translate a virtual address into a physical frame plus permission bits. On x86-64 this is typically 4 levels (PGD → PUD → PMD → PTE), with 5-level paging for very large address spaces. Because a full walk is expensive, the CPU caches recent translations in the <strong>TLB</strong>; a context switch or an <code>mmu</code> change can force a TLB flush, and huge pages exist partly to reduce TLB pressure.</p>
<h4>NUMA</h4>
<p>On multi-socket servers, memory is <strong>Non-Uniform</strong>: a core accesses its local node faster than a remote node. The kernel represents each node with its own zones and free lists, and NUMA policy (local, bind, interleave) decides where a task's pages are allocated. Keeping memory local to the CPU using it is a major performance lever.</p>
<h4>Memory tiering</h4>
<p>Modern systems add slower-but-larger memory tiers — notably <strong>CXL-attached memory</strong>, which shows up as a <em>CPU-less NUMA node</em> (see the <em>CXL</em> topic). Linux memory tiering promotes hot pages toward fast local DRAM and demotes cold pages toward the slower tier, reusing the same NUMA machinery.</p>
<pre><code>numactl -H               # nodes, sizes, and inter-node distances
numastat                 # per-node hit/miss allocation stats
cat /sys/devices/system/node/node0/meminfo</code></pre>
<h4>References & further reading</h4>
<ul>
<li><a href="https://docs.kernel.org/admin-guide/mm/concepts.html" target="_blank">Kernel docs — Memory Management concepts</a></li>
<li><a href="https://docs.kernel.org/admin-guide/mm/transhuge.html" target="_blank">Kernel docs — Transparent Hugepage Support</a></li>
<li><a href="https://docs.kernel.org/admin-guide/cgroup-v2.html" target="_blank">Kernel docs — Control Group v2 (Memory controller &amp; PSI)</a></li>
<li><a href="https://www.kernel.org/doc/man-pages/" target="_blank">man-pages: <code>proc(5)</code>, <code>numactl(8)</code>, <code>vmstat(8)</code>, <code>free(1)</code></a></li>
</ul>`
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) { module.exports = TOPIC_MEMORY_MANAGEMENT; }
