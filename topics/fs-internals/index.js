/**
 * Topic: Filesystem Internals — ext4, XFS, Btrfs & the VFS
 *
 * On-disk / kernel filesystem internals (complements the user-level
 * "filesystem" topic): the VFS abstraction (superblock/inode/dentry/file);
 * on-disk concepts (inodes, blocks, extents, journaling); ext4 (block
 * groups, extents, jbd2 journal modes, delayed allocation); XFS
 * (allocation groups, B+trees, metadata journaling); Btrfs (COW,
 * subvolumes, snapshots, built-in RAID, checksums) and ZFS conceptually;
 * overlayfs (the union fs behind container images); journaling vs COW
 * crash-consistency; fsck/repair & tuning. Cross-links filesystem,
 * docker and block-io.
 */

/* Accessible palette (declared BEFORE use so the SVG helpers below are
 * initialized before the topic object literal calls them — avoids a
 * temporal-dead-zone ReferenceError at load time that would blank the site).
 * ONE neutral-blue hue for every box (#cfe3ff fill, #1f2d3d stroke) on a
 * #0d1117 background. Identity is carried by NUMBER badges + position +
 * shape + text, never by hue. Table borders use #30363d. */
const FS_BOX_FILL = "#cfe3ff";
const FS_BOX_STROKE = "#1f2d3d";
const FS_TEXT = "#0f172a";
const FS_NOTE = "#c9d4e0";
const FS_ARROW = "#9db4cc";
const FS_BG = "#0d1117";

/* =====================================================================
 * Accessible inline SVG diagram helpers (prefix fs).
 * =================================================================== */

function fsBox(x, y, w, h, label, badge) {
  const cy = y + h / 2;
  const r = 13;
  let s =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ` +
    `fill="${FS_BOX_FILL}" stroke="${FS_BOX_STROKE}" stroke-width="1.5"></rect>`;
  if (badge !== undefined) {
    s +=
      `<circle cx="${x + r + 4}" cy="${cy}" r="${r}" fill="${FS_BOX_STROKE}"></circle>` +
      `<text x="${x + r + 4}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="13" font-weight="700" fill="#ffffff">${badge}</text>`;
  }
  const tx = badge !== undefined ? x + r + 4 + (w - r - 4) / 2 : x + w / 2;
  s +=
    `<text x="${tx}" y="${cy + 5}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="13.5" font-weight="600" fill="${FS_TEXT}">${label}</text>`;
  return s;
}

function fsStepBox(x, y, w, h, label, badge) {
  const cy = y + h / 2;
  const r = 13;
  let s =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ` +
    `fill="${FS_BOX_FILL}" stroke="${FS_BOX_STROKE}" stroke-width="1.5"></rect>`;
  if (badge !== undefined) {
    s +=
      `<circle cx="${x + r + 4}" cy="${cy}" r="${r}" fill="${FS_BOX_STROKE}"></circle>` +
      `<text x="${x + r + 4}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="13" font-weight="700" fill="#ffffff">${badge}</text>`;
  }
  s +=
    `<text x="${x + (badge !== undefined ? r + 24 : 14)}" y="${cy + 4}" ` +
    `font-family="sans-serif" font-size="12" fill="${FS_TEXT}">${label}</text>`;
  return s;
}

function fsCaption(cx, y, text) {
  return (
    `<text x="${cx}" y="${y}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="12" fill="${FS_NOTE}">${text}</text>`
  );
}

function fsVArrow(x, y1, y2) {
  return (
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${FS_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x - 5},${y2 - 6} ${x + 5},${y2 - 6} ${x},${y2}" fill="${FS_ARROW}"></polygon>`
  );
}

function fsHArrow(x1, y, x2) {
  const dir = x2 >= x1 ? 1 : -1;
  return (
    `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${FS_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x2 - dir * 7},${y - 5} ${x2 - dir * 7},${y + 5} ${x2},${y}" fill="${FS_ARROW}"></polygon>`
  );
}

function fsFrame(viewW, viewH, title, subtitle, body, ariaLabel) {
  return (
    `<div style="overflow-x:auto; margin:1rem 0; padding:1rem; background:${FS_BG}; ` +
    `border:1px solid #30363d; border-radius:8px;">` +
    `<div style="text-align:center; font-weight:700; font-size:1.05rem; color:#58a6ff; margin-bottom:0.25rem;">${title}</div>` +
    `<div style="text-align:center; font-size:0.85rem; color:#8b949e; margin-bottom:0.75rem;">${subtitle}</div>` +
    `<svg viewBox="0 0 ${viewW} ${viewH}" width="100%" role="img" aria-label="${ariaLabel}">${body}</svg>` +
    `</div>`
  );
}

// Diagram 1: VFS layering — syscalls -> VFS -> concrete fs -> block layer.
function fsVfsSVG() {
  const w = 760, boxW = 440, boxX = 160, h = 50, gap = 26;
  const layers = [
    { l: "Application syscalls (open, read, write, stat)", n: "one uniform API regardless of filesystem" },
    { l: "VFS: superblock / inode / dentry / file objects", n: "generic objects + function-pointer ops" },
    { l: "Concrete filesystem (ext4 / XFS / Btrfs / overlayfs)", n: "implements the VFS operations on-disk" },
    { l: "Page cache / buffer cache", n: "caches data & metadata" },
    { l: "Block layer -> driver -> device", n: "see the block-io topic" },
  ];
  let body = "";
  const topY = 16;
  layers.forEach((s, i) => {
    const y = topY + i * (h + gap);
    const cy = y + h / 2;
    body += fsBox(boxX, y, boxW, h, s.l, i + 1);
    body +=
      `<text x="${boxX + boxW + 10}" y="${cy + 4}" font-family="sans-serif" ` +
      `font-size="10.5" fill="${FS_NOTE}">${s.n}</text>`;
    if (i < layers.length - 1)
      body += fsVArrow(boxX + boxW / 2, y + h, y + h + gap);
  });
  const vh = topY + layers.length * (h + gap) + 6;
  return fsFrame(
    w, vh,
    "VFS Layering (syscall to device)",
    "Syscalls (1) hit the VFS (2) generic objects; a concrete filesystem (3) implements them on-disk via the page cache (4) and the block layer (5)",
    body,
    "Virtual filesystem layering from syscall to device. Applications issue uniform syscalls such as open, read, write and stat. The VFS presents generic objects, the superblock, inode, dentry and file, each with a table of function pointer operations. A concrete filesystem such as ext4, XFS, Btrfs or overlayfs implements those operations against its on-disk format. Data and metadata pass through the page and buffer caches, and finally reach the block layer, driver and device covered in the block I O topic."
  );
}

// Diagram 2: journaling vs copy-on-write write paths.
function fsJournalCowSVG() {
  const w = 760, h = 44;
  let body = "";
  const topY = 16;
  // left column: journaling
  body += fsBox(40, topY, 320, h, "Journaling (ext4 / XFS)", 1);
  const jSteps = [
    "1. write intended change to the journal",
    "2. commit record marks journal entry complete",
    "3. checkpoint: apply change to final location",
    "crash? replay journal -> consistent metadata",
  ];
  jSteps.forEach((t, i) => {
    body += fsStepBox(40, topY + h + 14 + i * (h + 10), 320, h, t, undefined);
    if (i < jSteps.length - 1)
      body += fsVArrow(200, topY + h + 14 + i * (h + 10) + h, topY + h + 14 + (i + 1) * (h + 10));
  });
  // right column: copy-on-write
  body += fsBox(400, topY, 320, h, "Copy-on-Write (Btrfs / ZFS)", 2);
  const cSteps = [
    "1. write new data to FREE blocks (never in place)",
    "2. write new metadata pointing at new blocks",
    "3. atomically switch the superblock/root",
    "crash? old consistent tree is still intact",
  ];
  cSteps.forEach((t, i) => {
    body += fsStepBox(400, topY + h + 14 + i * (h + 10), 320, h, t, undefined);
    if (i < cSteps.length - 1)
      body += fsVArrow(560, topY + h + 14 + i * (h + 10) + h, topY + h + 14 + (i + 1) * (h + 10));
  });
  const vh = topY + h + 14 + 4 * (h + 10) + 16;
  body += fsCaption(380, vh - 6, "Both give crash-consistency; journaling writes twice, COW never overwrites live data");
  return fsFrame(
    w, vh,
    "Crash-Consistency: Journaling vs Copy-on-Write",
    "Journaling (1) records intent then checkpoints, replaying on crash; copy-on-write (2) writes to free blocks and atomically switches the root, leaving the old tree intact",
    body,
    "Two approaches to crash consistency shown as parallel write paths. On the left, a journaling filesystem such as ext4 or XFS first writes the intended change to a journal, then writes a commit record, then checkpoints the change to its final location; after a crash it replays the journal to reach consistent metadata. On the right, a copy on write filesystem such as Btrfs or ZFS writes new data into free blocks never overwriting live data, writes new metadata pointing at the new blocks, then atomically switches the superblock or root; after a crash the previous consistent tree is still intact. The difference is conveyed by text and position, not colour."
  );
}

// Diagram 3: overlayfs lower+upper+work -> merged view.
function fsOverlaySVG() {
  const w = 760, h = 50;
  let body = "";
  const topY = 20;
  // three source layers on the left
  body += fsBox(40, topY, 240, h, "lowerdir (read-only image layers)", 1);
  body += fsBox(40, topY + h + 18, 240, h, "upperdir (writable layer)", 2);
  body += fsBox(40, topY + 2 * (h + 18), 240, h, "workdir (internal staging)", 3);
  // merge arrow to the right
  const midY = topY + h + 9;
  body += fsHArrow(280, midY, 420);
  body += fsHArrow(280, topY + h + 18 + h / 2, 420);
  body += fsBox(430, topY + h / 2 + 4, 280, h, "merged mountpoint", 4);
  body += fsCaption(570, topY + h / 2 + 4 + h + 18, "reads: upper shadows lower; writes go to upper (copy-up)");
  const vh = topY + 3 * (h + 18) + 10;
  return fsFrame(
    w, vh,
    "overlayfs: Union of Layers",
    "A read-only lowerdir (1), a writable upperdir (2) and a workdir (3) combine into one merged mountpoint (4); the upper layer shadows the lower and writes copy up into it",
    body,
    "Overlay filesystem union. A read only lowerdir, which may itself be several stacked image layers, a writable upperdir, and an internal workdir combine into a single merged mountpoint. Reads see the upper layer shadowing the lower layer, so a file present in both shows the upper version. Writes go to the upper layer, and modifying a file that exists only in the lower layer first copies it up into the upper layer. This is the mechanism behind container image layers, where the image is read only lower layers and the container's changes land in a writable upper layer."
  );
}

const TOPIC_FS_INTERNALS = {
  "id": "fs-internals",
  "category": "core",
  "icon": "🗂️",
  "title": "Filesystem Internals: ext4, XFS, Btrfs & the VFS",
  "description": "On-disk and kernel filesystem internals (complementing the user-level filesystem topic): the VFS abstraction (superblock, inode, dentry, file), on-disk concepts (inodes, blocks, extents, journaling), ext4 (block groups, extents, the jbd2 journal modes, delayed allocation), XFS (allocation groups, B+trees, metadata journaling), Btrfs (copy-on-write, subvolumes, snapshots, built-in RAID, checksums) and ZFS conceptually, overlayfs (the union filesystem behind container images), journaling vs COW crash-consistency, and fsck/repair & tuning — with accessible diagrams.",
  "keywords": [
    "filesystem internals", "vfs", "virtual filesystem", "superblock",
    "inode", "dentry", "file object", "on-disk", "block", "extent",
    "block mapping", "journaling", "ext4", "block group", "jbd2",
    "journal", "ordered", "writeback", "data=journal", "delayed allocation",
    "xfs", "allocation group", "b+tree", "metadata journaling", "btrfs",
    "copy-on-write", "cow", "subvolume", "snapshot", "built-in raid",
    "checksum", "self-healing", "zfs", "pool", "send", "receive",
    "overlayfs", "lowerdir", "upperdir", "workdir", "union filesystem",
    "container image", "crash consistency", "fsck", "tune2fs", "xfs_info",
    "debugfs", "mount", "stat"
  ],
  "sections": [
    {
      "title": "1. Scope: internals, not usage",
      "content": `<p>This topic is about how Linux filesystems work <em>inside</em> — the kernel's VFS abstraction and the on-disk layouts of ext4, XFS and Btrfs — not the day-to-day commands for mounting, permissions and navigation. Those user-level basics are the dedicated <strong>File System</strong> topic; here we go one level down, into superblocks, inodes, extents, journals and copy-on-write trees.</p>
<p>It also connects downward and sideways: everything a filesystem reads or writes ultimately becomes block I/O (the <em>Block I/O Layer</em> topic), and the union filesystem that powers container images (overlayfs) ties directly to the <em>Docker</em> topic.</p>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Filesystem</th><th style="text-align:left; padding:0.5rem;">Model</th><th style="text-align:left; padding:0.5rem;">Strength</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>ext4</strong></td><td style="padding:0.5rem;">Journaled, extent-based</td><td style="padding:0.5rem;">Mature, predictable general-purpose default</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>XFS</strong></td><td style="padding:0.5rem;">Journaled, allocation groups + B+trees</td><td style="padding:0.5rem;">Scales to huge files &amp; parallel I/O</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Btrfs</strong></td><td style="padding:0.5rem;">Copy-on-write B-trees</td><td style="padding:0.5rem;">Snapshots, checksums, built-in RAID</td></tr>
<tr><td style="padding:0.5rem;"><strong>overlayfs</strong></td><td style="padding:0.5rem;">Union of layers</td><td style="padding:0.5rem;">Container images</td></tr></table>`
    },
    {
      "title": "2. The VFS abstraction",
      "content": `<p>The <strong>Virtual File System (VFS)</strong> is the kernel layer that lets one set of syscalls (<code>open</code>, <code>read</code>, <code>write</code>, <code>stat</code>) work across dozens of filesystems. It defines generic objects, each carrying a table of function pointers that the concrete filesystem fills in — classic polymorphism in C.</p>
<ul>
<li><strong>superblock</strong> — one per mounted filesystem; describes the whole filesystem (size, block size, state) and holds <code>super_operations</code>.</li>
<li><strong>inode</strong> — one per file/directory/device; holds metadata (owner, mode, size, timestamps, block pointers) and <code>inode_operations</code>. Note the on-disk inode vs the in-memory VFS inode.</li>
<li><strong>dentry</strong> — a directory-entry cache object linking a name to an inode; the dcache makes path lookups fast.</li>
<li><strong>file</strong> — a per-open-instance object tracking the current offset and <code>file_operations</code>.</li>
</ul>
${fsVfsSVG()}
<p>Because the syscall layer talks only to VFS objects, mounting ext4, XFS, Btrfs, a network filesystem or a pseudo-filesystem like <code>/proc</code> all look identical to applications.</p>`
    },
    {
      "title": "3. On-disk concepts: inodes, blocks, extents & journals",
      "content": `<p>Every disk filesystem must answer: where is a file's data, and how is that recorded? The building blocks:</p>
<ul>
<li><strong>Blocks</strong> — the allocation unit (commonly 4&nbsp;KiB). Files occupy whole blocks.</li>
<li><strong>Inodes</strong> — the on-disk record of a file's metadata and a map to its data blocks. Directories are just files whose data maps names to inode numbers.</li>
<li><strong>Block mapping vs extents</strong> — old designs listed every block individually (slow, bloated for big files). <strong>Extents</strong> record a <em>range</em> ("10,000 contiguous blocks starting here") in one entry — compact and fast for large, contiguous files. ext4 and XFS are both extent-based.</li>
<li><strong>Journaling</strong> — writing metadata changes to a log first so an interrupted operation can be replayed or rolled back, avoiding a slow full-disk check after a crash.</li>
</ul>
<pre><code>stat file                   # inode number, blocks, timestamps
df -T                       # filesystem type per mount
sudo debugfs -R 'stat &lt;inode&gt;' /dev/sda1   # inspect an ext4 inode</code></pre>`
    },
    {
      "title": "4. ext4",
      "content": `<p><strong>ext4</strong> is the long-standing general-purpose default. Its disk is divided into <strong>block groups</strong>, each with its own inode table, block bitmap and data blocks, which keeps related data and metadata physically close and limits the damage of localized corruption.</p>
<h4>Key features</h4>
<ul>
<li><strong>Extents</strong> replace the old indirect-block mapping, cutting metadata and fragmentation for large files.</li>
<li><strong>Delayed allocation</strong> — ext4 defers choosing on-disk blocks until writeback, so it can allocate large contiguous extents for data that is still accumulating in the page cache.</li>
<li><strong>The jbd2 journal</strong> provides three modes, trading safety against speed:</li>
</ul>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Mode</th><th style="text-align:left; padding:0.5rem;">What is journaled</th><th style="text-align:left; padding:0.5rem;">Trade-off</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>data=ordered</code> (default)</td><td style="padding:0.5rem;">Metadata; data written before the commit</td><td style="padding:0.5rem;">Good balance of safety &amp; speed</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>data=writeback</code></td><td style="padding:0.5rem;">Metadata only; data order not enforced</td><td style="padding:0.5rem;">Fastest; stale data possible after crash</td></tr>
<tr><td style="padding:0.5rem;"><code>data=journal</code></td><td style="padding:0.5rem;">Both data and metadata</td><td style="padding:0.5rem;">Safest; slowest (double writes)</td></tr></table>
<pre><code>sudo tune2fs -l /dev/sda1    # ext4 superblock: features, mount count, UUID
sudo dumpe2fs /dev/sda1 | head   # block groups &amp; layout</code></pre>`
    },
    {
      "title": "5. XFS",
      "content": `<p><strong>XFS</strong> is a high-performance, extent-based journaling filesystem built for scalability. Instead of many small block groups it uses a few large <strong>allocation groups (AGs)</strong>, each managing its own free space and inodes largely independently — which is the key to its <em>parallelism</em>: multiple CPUs can allocate in different AGs at once without contending.</p>
<h4>Key features</h4>
<ul>
<li><strong>B+tree everything</strong> — free space (by size and by location), inode allocation, and extent maps are all B+trees, giving fast lookups even on enormous filesystems.</li>
<li><strong>Metadata journaling</strong> — XFS journals metadata (not file data) for fast, consistent recovery; delayed logging batches journal updates for throughput.</li>
<li><strong>Large-file / large-filesystem oriented</strong> — a favourite for media, HPC scratch, and database volumes where big, parallel, streaming I/O dominates.</li>
</ul>
<p>XFS can grow but not shrink, a deliberate design choice. It pairs naturally with the striped device-mapper/LVM targets from the <em>Block I/O Layer</em> topic for parallel throughput.</p>
<pre><code>sudo xfs_info /mountpoint    # AG count/size, block size, log size
sudo xfs_growfs /mountpoint  # grow online
sudo xfs_repair /dev/sdb1    # offline repair</code></pre>`
    },
    {
      "title": "6. Btrfs & (conceptually) ZFS",
      "content": `<p><strong>Btrfs</strong> abandons in-place updates for <strong>copy-on-write (COW)</strong>: changed data and metadata are written to <em>new</em> locations and the filesystem's B-trees are updated to point at them, so live data is never overwritten. This unlocks a cluster of advanced features:</p>
<ul>
<li><strong>Subvolumes &amp; snapshots</strong> — a snapshot is just a COW clone of a subvolume's tree root; it is instant and initially shares all blocks, diverging only as data changes.</li>
<li><strong>Checksums &amp; self-healing</strong> — every data and metadata block is checksummed; with redundancy (built-in RAID profiles), a bad copy is detected and repaired from a good one.</li>
<li><strong>Built-in volume management</strong> — Btrfs spans multiple devices itself (no separate LVM layer needed).</li>
</ul>
<h4>ZFS, conceptually</h4>
<p><strong>ZFS</strong> shares the COW philosophy and goes further with storage <em>pools</em>, end-to-end checksums, and efficient <code>send</code>/<code>receive</code> replication of snapshots. The important caveat is <strong>licensing</strong>: ZFS's CDDL is considered incompatible with the kernel's GPL, so ZFS ships <em>out of tree</em> (e.g. OpenZFS) rather than in the mainline kernel. Btrfs is the in-tree COW filesystem.</p>
<pre><code>sudo btrfs subvolume list /
sudo btrfs subvolume snapshot / /snap-$(date +%F)
sudo btrfs filesystem df /     # space usage by data/metadata/system
sudo btrfs scrub start /       # verify checksums & self-heal</code></pre>`
    },
    {
      "title": "7. overlayfs & container images",
      "content": `<p><strong>overlayfs</strong> is a <em>union</em> filesystem: it presents several directories stacked on top of each other as one merged tree. It is the storage engine behind container images.</p>
${fsOverlaySVG()}
<ul>
<li><strong>lowerdir</strong> — one or more read-only layers (the container image's layers).</li>
<li><strong>upperdir</strong> — the single writable layer where all changes land.</li>
<li><strong>workdir</strong> — an empty directory overlayfs uses internally for atomic operations.</li>
</ul>
<p>Reads return the topmost version of a file; writing to a file that only exists in a lower layer triggers a <strong>copy-up</strong> into the upper layer. This is exactly how a container shares immutable image layers across many instances while keeping each container's writes private and cheap — the <em>Docker</em> topic covers the image/layer side; here the focus is the kernel mechanism.</p>
<pre><code>mount -t overlay overlay -o lowerdir=/a:/b,upperdir=/u,workdir=/w /merged
mount | grep overlay          # container runtimes mount these automatically</code></pre>`
    },
    {
      "title": "8. Crash-consistency: journaling vs COW",
      "content": `<p>Both families solve the same problem — surviving a power loss mid-write without corruption — by never leaving on-disk structures in a half-updated state that cannot be recovered. They do it differently:</p>
${fsJournalCowSVG()}
<ul>
<li><strong>Journaling (ext4, XFS)</strong> records intended changes in a log, commits, then checkpoints them in place; on recovery it replays or discards incomplete journal transactions. Metadata is cheap to journal; journaling all data costs a double write.</li>
<li><strong>Copy-on-write (Btrfs, ZFS)</strong> never overwrites live data: it writes new blocks, builds new metadata pointing at them, and atomically flips the root. A crash simply leaves the previous consistent tree, which is what snapshots preserve for free.</li>
</ul>
<p>Neither guarantees <em>your application's</em> data is durable unless it uses <code>fsync()</code> at the right points — the filesystem guarantees its own structural consistency, not your write ordering.</p>`
    },
    {
      "title": "9. Repair, tuning & references",
      "content": `<p>When consistency is lost (hardware fault, bug), each filesystem has a checker/repairer, and each exposes tunables:</p>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Filesystem</th><th style="text-align:left; padding:0.5rem;">Check / repair</th><th style="text-align:left; padding:0.5rem;">Tune / inspect</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">ext4</td><td style="padding:0.5rem;"><code>fsck.ext4 -f</code></td><td style="padding:0.5rem;"><code>tune2fs</code>, <code>debugfs</code></td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">XFS</td><td style="padding:0.5rem;"><code>xfs_repair</code></td><td style="padding:0.5rem;"><code>xfs_info</code>, <code>xfs_db</code></td></tr>
<tr><td style="padding:0.5rem;">Btrfs</td><td style="padding:0.5rem;"><code>btrfs check</code>, <code>scrub</code></td><td style="padding:0.5rem;"><code>btrfs filesystem</code></td></tr></table>
<p>Golden rule: run a repairer only on an <em>unmounted</em> filesystem, and prefer the filesystem's own journal/COW recovery (which happens automatically at mount) over manual repair whenever possible.</p>
<pre><code>df -T                        # which filesystem is where
mount -o remount,ro /mnt     # quiesce before offline checks
sudo fsck -N /dev/sda1       # show what fsck WOULD run (no changes)</code></pre>
<h4>References & further reading</h4>
<ul>
<li><a href="https://docs.kernel.org/filesystems/vfs.html" target="_blank">Kernel docs — Overview of the Linux Virtual File System</a></li>
<li><a href="https://docs.kernel.org/filesystems/ext4/index.html" target="_blank">Kernel docs — ext4 Data Structures and Algorithms</a></li>
<li><a href="https://docs.kernel.org/filesystems/xfs/index.html" target="_blank">Kernel docs — XFS</a></li>
<li><a href="https://docs.kernel.org/filesystems/overlayfs.html" target="_blank">Kernel docs — Overlay Filesystem</a></li>
<li><a href="https://btrfs.readthedocs.io/" target="_blank">Btrfs documentation</a></li>
</ul>`
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) { module.exports = TOPIC_FS_INTERNALS; }
