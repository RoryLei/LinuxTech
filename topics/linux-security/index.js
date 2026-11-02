/**
 * Topic: Linux Security — Capabilities, LSM, seccomp, Namespaces & cgroups
 *
 * The Linux kernel security toolkit: the DAC permission model and its
 * limits; POSIX capabilities; the LSM hook framework with SELinux and
 * AppArmor; seccomp-bpf syscall filtering; the namespaces; cgroups v2;
 * how these layers together make a container; and measured/integrity
 * boot (IMA/EVM, TPM). Cross-links obmf and dc-scm (Root of Trust).
 */

/* Accessible palette (declared BEFORE use so the SVG helpers below are
 * initialized before the topic object literal calls them — avoids a
 * temporal-dead-zone ReferenceError at load time that would blank the site).
 * ONE neutral-blue hue for every box (#cfe3ff fill, #1f2d3d stroke) on a
 * #0d1117 background. Identity is carried by NUMBER badges + position +
 * shape + text, never by hue. No allow/deny is shown by colour. Table
 * borders use #30363d. */
const SEC_BOX_FILL = "#cfe3ff";
const SEC_BOX_STROKE = "#1f2d3d";
const SEC_TEXT = "#0f172a";
const SEC_NOTE = "#c9d4e0";
const SEC_ARROW = "#9db4cc";
const SEC_BG = "#0d1117";

/* =====================================================================
 * Accessible inline SVG diagram helpers (prefix sec).
 * =================================================================== */

function secBox(x, y, w, h, label, badge) {
  const cy = y + h / 2;
  const r = 13;
  let s =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ` +
    `fill="${SEC_BOX_FILL}" stroke="${SEC_BOX_STROKE}" stroke-width="1.5"></rect>`;
  if (badge !== undefined) {
    s +=
      `<circle cx="${x + r + 4}" cy="${cy}" r="${r}" fill="${SEC_BOX_STROKE}"></circle>` +
      `<text x="${x + r + 4}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="13" font-weight="700" fill="#ffffff">${badge}</text>`;
  }
  const tx = badge !== undefined ? x + r + 4 + (w - r - 4) / 2 : x + w / 2;
  s +=
    `<text x="${tx}" y="${cy + 5}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="13.5" font-weight="600" fill="${SEC_TEXT}">${label}</text>`;
  return s;
}

function secStepBox(x, y, w, h, label, badge) {
  const cy = y + h / 2;
  const r = 13;
  let s =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ` +
    `fill="${SEC_BOX_FILL}" stroke="${SEC_BOX_STROKE}" stroke-width="1.5"></rect>`;
  if (badge !== undefined) {
    s +=
      `<circle cx="${x + r + 4}" cy="${cy}" r="${r}" fill="${SEC_BOX_STROKE}"></circle>` +
      `<text x="${x + r + 4}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="13" font-weight="700" fill="#ffffff">${badge}</text>`;
  }
  s +=
    `<text x="${x + (badge !== undefined ? r + 24 : 14)}" y="${cy + 4}" ` +
    `font-family="sans-serif" font-size="12.5" fill="${SEC_TEXT}">${label}</text>`;
  return s;
}

function secCaption(cx, y, text) {
  return (
    `<text x="${cx}" y="${y}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="12" fill="${SEC_NOTE}">${text}</text>`
  );
}

function secDiamond(cx, cy, halfW, halfH, label) {
  let s =
    `<polygon points="${cx},${cy - halfH} ${cx + halfW},${cy} ${cx},${cy + halfH} ${cx - halfW},${cy}" ` +
    `fill="${SEC_BOX_FILL}" stroke="${SEC_BOX_STROKE}" stroke-width="1.5"></polygon>`;
  s +=
    `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="11.5" font-weight="600" fill="${SEC_TEXT}">${label}</text>`;
  return s;
}

function secVArrow(x, y1, y2) {
  return (
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${SEC_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x - 5},${y2 - 6} ${x + 5},${y2 - 6} ${x},${y2}" fill="${SEC_ARROW}"></polygon>`
  );
}

function secHArrow(x1, y, x2) {
  const dir = x2 >= x1 ? 1 : -1;
  return (
    `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${SEC_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x2 - dir * 7},${y - 5} ${x2 - dir * 7},${y + 5} ${x2},${y}" fill="${SEC_ARROW}"></polygon>`
  );
}

function secFrame(viewW, viewH, title, subtitle, body, ariaLabel) {
  return (
    `<div style="overflow-x:auto; margin:1rem 0; padding:1rem; background:${SEC_BG}; ` +
    `border:1px solid #30363d; border-radius:8px;">` +
    `<div style="text-align:center; font-weight:700; font-size:1.05rem; color:#58a6ff; margin-bottom:0.25rem;">${title}</div>` +
    `<div style="text-align:center; font-size:0.85rem; color:#8b949e; margin-bottom:0.75rem;">${subtitle}</div>` +
    `<svg viewBox="0 0 ${viewW} ${viewH}" width="100%" role="img" aria-label="${ariaLabel}">${body}</svg>` +
    `</div>`
  );
}

// Diagram 1: LSM hook model — syscall -> DAC -> capability -> LSM hook -> decision.
function secLsmSVG() {
  const w = 760, boxW = 460, boxX = 150, h = 48, gap = 24;
  let body = "";
  const topY = 16;
  body += secStepBox(boxX, topY, boxW, h, "process makes a syscall (e.g. open, execve, socket)", 1);
  body += secVArrow(boxX + boxW / 2, topY + h, topY + h + gap);
  const y2 = topY + h + gap;
  body += secStepBox(boxX, y2, boxW, h, "classic DAC check: file mode / owner / group", 2);
  body += secVArrow(boxX + boxW / 2, y2 + h, y2 + h + gap);
  const y3 = y2 + h + gap;
  body += secStepBox(boxX, y3, boxW, h, "capability check (if privileged op, e.g. CAP_NET_ADMIN)", 3);
  body += secVArrow(boxX + boxW / 2, y3 + h, y3 + h + gap);
  const y4 = y3 + h + gap;
  body += secStepBox(boxX, y4, boxW, h, "LSM hook: active module is consulted", 4);
  body += secVArrow(boxX + boxW / 2, y4 + h, y4 + h + gap);
  const y5 = y4 + h + gap;
  // two module boxes side by side under the hook
  body += secBox(90, y5, 300, h, "SELinux: type enforcement on labels", 5);
  body += secBox(420, y5, 280, h, "AppArmor: path-based profile", 6);
  body += secVArrow(240, y5 + h, y5 + h + gap);
  body += secVArrow(560, y5 + h, y5 + h + gap);
  const y6 = y5 + h + gap;
  body += secStepBox(boxX, y6, boxW, h, "decision: operation permitted or denied (and audited)", 7);
  const vh = y6 + h + 16;
  return secFrame(
    w, vh,
    "Access-Control Pipeline & LSM Hook Model",
    "A syscall (1) passes the DAC check (2) and capability check (3); the LSM hook (4) consults the active module — SELinux (5) or AppArmor (6) — which returns a permit-or-deny decision (7)",
    body,
    "Access control pipeline. A process makes a syscall such as open, execve or socket. First the classic discretionary access control check tests file mode, owner and group. If the operation is privileged, a capability check tests the relevant CAP bit. Then the Linux Security Module hook is reached and the active module is consulted. SELinux applies type enforcement on security labels, while AppArmor applies a path based profile. The module returns a decision that permits or denies the operation, and the event may be audited. The permit or deny outcome is conveyed by text, never by colour."
  );
}

// Diagram 2: what makes a container — layered isolation primitives.
function secContainerSVG() {
  const w = 760, boxW = 560, boxX = 100, h = 46, gap = 22;
  const layers = [
    { l: "Namespaces — isolate what the process can SEE", n: "mnt, pid, net, uts, ipc, user, cgroup, time" },
    { l: "cgroups v2 — limit what the process can USE", n: "cpu, memory.max, io, pids caps" },
    { l: "Capabilities — trim root to specific CAP_* bits", n: "drop CAP_SYS_ADMIN, keep only what's needed" },
    { l: "seccomp-bpf — restrict which syscalls are allowed", n: "block dangerous syscalls entirely" },
    { l: "LSM profile (SELinux / AppArmor) — label/path confinement", n: "mandatory access control on top" },
  ];
  let body = "";
  const topY = 16;
  layers.forEach((s, i) => {
    const y = topY + i * (h + gap);
    const cy = y + h / 2;
    body += secBox(boxX, y, boxW, h, s.l, i + 1);
    body +=
      `<text x="${boxX + boxW + 10}" y="${cy + 4}" font-family="sans-serif" ` +
      `font-size="10.5" fill="${SEC_NOTE}">${s.n}</text>`;
    if (i < layers.length - 1)
      body += secVArrow(boxX + boxW / 2, y + h, y + h + gap);
  });
  const resY = topY + layers.length * (h + gap);
  body += secStepBox(boxX, resY, boxW, h, "= a container (an ordinary process, strongly confined)", 6);
  const vh = resY + h + 16;
  return secFrame(
    w, vh,
    "What Makes a Container",
    "Namespaces (1) + cgroups (2) + capabilities (3) + seccomp (4) + an LSM profile (5) layered together confine an ordinary process into a container (6) — no special 'container' kernel object",
    body,
    "Layered view of the primitives that compose a container. Namespaces isolate what a process can see, across the mount, pid, network, uts, ipc, user, cgroup and time dimensions. cgroups version two limit what it can use, such as CPU, memory and I O. Capabilities trim the all powerful root identity down to specific CAP bits. A seccomp BPF filter restricts which syscalls it may call. An LSM profile from SELinux or AppArmor adds mandatory access control. Combined, these turn an ordinary Linux process into a strongly confined container. There is no dedicated container object in the kernel."
  );
}

// Diagram 3: seccomp-bpf filter decision flow.
function secSeccompSVG() {
  const w = 760, h = 46;
  let body = "";
  const topY = 16;
  body += secStepBox(150, topY, 460, h, "process invokes a syscall (nr + arguments)", 1);
  body += secVArrow(380, topY + h, topY + h + 22);
  const diaCy = topY + h + 22 + 42;
  body += secDiamond(380, diaCy, 160, 42, "seccomp-bpf filter: nr in allow-set?");
  // yes branch -> down -> allow
  body += secVArrow(380, diaCy + 42, diaCy + 42 + 20);
  body +=
    `<text x="392" y="${diaCy + 42 + 14}" font-family="sans-serif" font-size="11.5" fill="${SEC_NOTE}">SECCOMP_RET_ALLOW</text>`;
  const yAllow = diaCy + 42 + 20;
  body += secStepBox(150, yAllow, 460, h, "syscall proceeds into the kernel", 2);
  // no branch -> right -> several possible actions
  const rx = 660;
  body +=
    `<line x1="540" y1="${diaCy}" x2="${rx}" y2="${diaCy}" stroke="${SEC_ARROW}" stroke-width="2"></line>` +
    `<line x1="${rx}" y1="${diaCy}" x2="${rx}" y2="${diaCy + 60}" stroke="${SEC_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${rx - 5},${diaCy + 54} ${rx + 5},${diaCy + 54} ${rx},${diaCy + 60}" fill="${SEC_ARROW}"></polygon>` +
    `<text x="548" y="${diaCy - 8}" font-family="sans-serif" font-size="11.5" fill="${SEC_NOTE}">not allowed</text>`;
  const yAct = diaCy + 60;
  body += secBox(540, yAct, 190, h, "ERRNO / KILL / TRAP / LOG", 3);
  body +=
    `<text x="635" y="${yAct + h + 16}" text-anchor="middle" font-family="sans-serif" font-size="10.5" fill="${SEC_NOTE}">action chosen by the filter, not by colour</text>`;
  const vh = Math.max(yAllow + h, yAct + h + 24) + 12;
  return secFrame(
    w, vh,
    "seccomp-bpf Syscall Filtering",
    "Each syscall (1) is screened by a BPF filter; allowed syscalls proceed (2); others get a filter-chosen action (3) — return an errno, kill the thread, trap, or log",
    body,
    "seccomp BPF filtering decision flow. A process invokes a syscall identified by its number and arguments. A seccomp BPF filter, a diamond decision, tests whether the syscall number is in the allowed set. If allowed, the syscall proceeds into the kernel. If not allowed, the filter applies a chosen action: return an errno to fake failure, kill the thread or process, trap to a handler, or log the attempt. The action is selected by the filter program and expressed in text, never by colour."
  );
}

const TOPIC_LINUX_SECURITY = {
  "id": "linux-security",
  "category": "kernel",
  "icon": "🔒",
  "title": "Linux Security: Capabilities, LSM, seccomp, Namespaces & cgroups",
  "description": "The Linux kernel security toolkit end to end: the DAC permission model and its limits, POSIX capabilities (CAP_* bits and the capability sets), the LSM hook framework with SELinux type enforcement vs AppArmor path-based profiles, seccomp-bpf syscall filtering, the namespaces, cgroups v2 resource control, how these layers combine to make a container, and measured/integrity boot (IMA/EVM, TPM) — with accessible diagrams.",
  "keywords": [
    "linux security", "security", "dac", "permissions", "setuid", "setgid",
    "capabilities", "posix capabilities", "cap_net_admin", "cap_sys_admin",
    "cap_dac_override", "effective", "permitted", "inheritable", "ambient",
    "bounding set", "capsh", "getcap", "setcap", "lsm", "linux security module",
    "hook", "selinux", "type enforcement", "security context", "enforcing",
    "permissive", "apparmor", "profile", "mac", "mandatory access control",
    "seccomp", "seccomp-bpf", "syscall filter", "namespaces", "namespace",
    "mnt", "pid", "net", "uts", "ipc", "user namespace", "cgroup namespace",
    "time namespace", "cgroups", "cgroup v2", "container", "unshare", "lsns",
    "ima", "evm", "measured boot", "integrity", "tpm", "root of trust",
    "ausearch", "sealert", "aa-status", "systemd-cgls"
  ],
  "sections": [
    {
      "title": "1. The UNIX permission model and its limits",
      "content": `<p>The oldest Linux access-control layer is <strong>Discretionary Access Control (DAC)</strong>: every file has an owner, a group, and <code>rwx</code> bits for owner/group/other. A process runs with a user ID and group IDs, and the kernel checks those against the file's bits. The owner <em>discretionarily</em> sets permissions — hence "discretionary".</p>
<p>This model is simple and effective, but it has two big limits that the rest of this topic addresses:</p>
<ul>
<li><strong>Root is all-or-nothing.</strong> UID 0 bypasses almost every DAC check. A program that needs just one privilege (say, binding a low port) historically ran as full root — a huge attack surface. <strong>Capabilities</strong> (section 2) break root into pieces.</li>
<li><strong>DAC can't express system-wide policy.</strong> It cannot say "this web server may only ever read files of type <code>httpd_content_t</code>, no matter who owns them". <strong>Mandatory Access Control</strong> via the LSM framework (section 3) adds that.</li>
</ul>
<p>Two further gaps — that any process can call any syscall, and that processes share one global view of the system — are closed by <strong>seccomp</strong> (section 4) and <strong>namespaces</strong> (section 5). Together these are the kernel building blocks of containers (section 6).</p>
<pre><code>ls -l /usr/bin/passwd      # -rwsr-xr-x : the 's' is the setuid bit
id                         # uid, gid, and supplementary groups
stat -c '%A %U:%G' file</code></pre>`
    },
    {
      "title": "2. Linux capabilities",
      "content": `<p><strong>Capabilities</strong> split the monolithic power of root into ~40 independent <code>CAP_*</code> bits, so a program can hold exactly the privilege it needs and nothing more. Examples:</p>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Capability</th><th style="text-align:left; padding:0.5rem;">Grants</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>CAP_NET_BIND_SERVICE</code></td><td style="padding:0.5rem;">Bind to ports below 1024</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>CAP_NET_ADMIN</code></td><td style="padding:0.5rem;">Configure interfaces, routing, firewall</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>CAP_SYS_ADMIN</code></td><td style="padding:0.5rem;">A broad, overloaded "near-root" grab-bag — avoid</td></tr>
<tr><td style="padding:0.5rem;"><code>CAP_DAC_OVERRIDE</code></td><td style="padding:0.5rem;">Bypass file permission checks</td></tr></table>
<h4>Capability sets</h4>
<p>Each thread carries capability sets: <strong>permitted</strong> (the ceiling), <strong>effective</strong> (currently active for checks), <strong>inheritable</strong> and <strong>ambient</strong> (preserved across <code>execve</code> in specific ways), bounded by the <strong>bounding set</strong>. File capabilities attached to an executable (via extended attributes) can raise a non-root program's privileges precisely — a modern replacement for setuid-root. Shrinking the setuid surface this way is a core hardening technique.</p>
<pre><code>capsh --print               # decode the current process' capability sets
getcap /usr/bin/ping        # cap_net_raw+ep  (ping no longer needs setuid)
sudo setcap cap_net_bind_service=+ep ./myserver</code></pre>`
    },
    {
      "title": "3. The LSM framework: SELinux vs AppArmor",
      "content": `<p>The <strong>Linux Security Module (LSM)</strong> framework places <em>hooks</em> at security-relevant decision points throughout the kernel (opening a file, executing a program, creating a socket). After the DAC and capability checks pass, the active LSM is consulted and can <em>additionally</em> deny the operation — it can tighten policy but not loosen DAC. This is <strong>Mandatory Access Control</strong>: the policy is set by an administrator, not by file owners.</p>
${secLsmSVG()}
<h4>The two major modules</h4>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;"></th><th style="text-align:left; padding:0.5rem;">SELinux</th><th style="text-align:left; padding:0.5rem;">AppArmor</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Model</strong></td><td style="padding:0.5rem;">Type enforcement on <em>labels</em> (every object has a context)</td><td style="padding:0.5rem;">Profiles keyed on <em>file paths</em></td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Granularity</strong></td><td style="padding:0.5rem;">Very fine; label-based, survives renames</td><td style="padding:0.5rem;">Coarser; easier to read and write</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Modes</strong></td><td style="padding:0.5rem;"><code>enforcing</code> / <code>permissive</code> / <code>disabled</code></td><td style="padding:0.5rem;">per-profile <code>enforce</code> / <code>complain</code></td></tr>
<tr><td style="padding:0.5rem;"><strong>Typical distro</strong></td><td style="padding:0.5rem;">Fedora / RHEL</td><td style="padding:0.5rem;">Ubuntu / SUSE</td></tr></table>
<p>SELinux's <strong>type enforcement</strong> assigns a security context (user:role:type:level) to every process and object and governs which type may act on which; <strong>permissive</strong> mode logs would-be denials without blocking, which is how policy is debugged. AppArmor instead confines a program to a whitelist of path-based rules, which is simpler to author.</p>
<pre><code>getenforce; sestatus         # SELinux mode & policy
sudo ausearch -m avc -ts recent | audit2allow   # analyse denials
sudo sealert -a /var/log/audit/audit.log        # human-readable advice
aa-status                     # AppArmor profiles & their modes</code></pre>`
    },
    {
      "title": "4. seccomp — syscall filtering",
      "content": `<p>Even a well-confined process can still call <em>any</em> of the hundreds of kernel syscalls, each a potential attack surface. <strong>seccomp</strong> (secure computing) lets a process install a <strong>BPF filter</strong> that the kernel runs on every syscall, deciding per-call what to do.</p>
${secSeccompSVG()}
<p>A <strong>seccomp-bpf</strong> filter inspects the syscall number and argument registers and returns an action: <code>ALLOW</code>, <code>ERRNO</code> (fail with a chosen error), <code>KILL</code> (terminate), <code>TRAP</code> (signal), or <code>LOG</code>. Filters are <em>one-way</em>: once installed they cannot be relaxed, and they are inherited across <code>fork</code> and <code>execve</code>.</p>
<p>This is how container runtimes and sandboxes shrink the kernel surface: Docker, for example, applies a default seccomp profile that blocks dozens of rarely-needed, dangerous syscalls. systemd services use <code>SystemCallFilter=</code> to the same end.</p>
<pre><code>grep Seccomp /proc/self/status        # 0=off 1=strict 2=filter
systemd-analyze security &lt;unit&gt;       # scores a service's seccomp/caps/ns</code></pre>`
    },
    {
      "title": "5. Namespaces",
      "content": `<p><strong>Namespaces</strong> virtualise global system resources so that processes in different namespaces see different, isolated instances of them. They control <em>what a process can see</em>. Linux provides several:</p>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Namespace</th><th style="text-align:left; padding:0.5rem;">Isolates</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>mnt</strong></td><td style="padding:0.5rem;">Mount points / filesystem view</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>pid</strong></td><td style="padding:0.5rem;">Process IDs (own PID 1 per namespace)</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>net</strong></td><td style="padding:0.5rem;">Interfaces, routes, firewall, sockets</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>uts</strong></td><td style="padding:0.5rem;">Hostname &amp; domain name</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>ipc</strong></td><td style="padding:0.5rem;">System V IPC &amp; POSIX message queues</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>user</strong></td><td style="padding:0.5rem;">UID/GID mappings (root in-ns, unprivileged out)</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>cgroup</strong></td><td style="padding:0.5rem;">The cgroup root a process sees</td></tr>
<tr><td style="padding:0.5rem;"><strong>time</strong></td><td style="padding:0.5rem;">Boot/monotonic clock offsets</td></tr></table>
<p>The <strong>user namespace</strong> is especially important for security: it lets an unprivileged user be root <em>inside</em> their namespace while remaining unprivileged on the host, enabling rootless containers. The <strong>net namespace</strong> underpins container networking (see the <em>Netfilter</em> topic, which covers veth pairs and bridges).</p>
<pre><code>lsns                          # list namespaces and their member processes
sudo unshare --pid --fork --mount-proc bash   # new PID+mount namespace
ls -l /proc/$$/ns             # the namespaces of the current shell</code></pre>`
    },
    {
      "title": "6. cgroups v2 & what makes a container",
      "content": `<p><strong>Control groups v2 (cgroups)</strong> account for and limit the resources a group of processes may <em>use</em>: CPU time, memory, I/O bandwidth, PID count. Namespaces say what a process can <em>see</em>; cgroups say what it can <em>consume</em>. (The memory controller and PSI are covered in depth in the <em>Linux Memory Management</em> topic.)</p>
<p>A <strong>container is not a kernel object</strong> — it is an ordinary process that a runtime has wrapped in all of these primitives at once:</p>
${secContainerSVG()}
<p>This is exactly what Docker, Podman and Kubernetes (via the OCI runtime) do: create namespaces, place the process in a cgroup, drop capabilities to a minimal set, install a seccomp profile, and often apply an SELinux/AppArmor profile. Understanding the layers is what lets you reason about, and harden, container isolation.</p>
<pre><code>systemd-cgls                  # tree of cgroups and their processes
cat /sys/fs/cgroup/&lt;group&gt;/cgroup.controllers
systemctl show --property=Delegate &lt;unit&gt;</code></pre>`
    },
    {
      "title": "7. Integrity & measured boot (IMA/EVM, TPM)",
      "content": `<p>Runtime confinement assumes the system started from trustworthy code. Two kernel integrity subsystems extend trust from boot into the running system:</p>
<ul>
<li><strong>IMA (Integrity Measurement Architecture)</strong> — measures (hashes) files such as executables and config as they are opened, extends the measurements into a TPM Platform Configuration Register, and can <em>appraise</em> files against signed reference values, refusing to run anything modified.</li>
<li><strong>EVM (Extended Verification Module)</strong> — protects a file's security-relevant metadata (including IMA hashes and SELinux labels) from tampering.</li>
</ul>
<p>These anchor to a <strong>TPM</strong> and a hardware <strong>Root of Trust</strong>. The chain that gets you to a trusted kernel — firmware, Secure Boot, shim, bootloader — is detailed in the <em>Linux Boot Flow</em> topic. The platform Root of Trust that measured boot depends on is covered by the <em>OBMF (Open Boot &amp; Management Framework)</em> and <em>DC-SCM</em> topics; IMA/EVM continue that measured-boot story into user space.</p>
<pre><code>cat /sys/kernel/security/ima/ascii_runtime_measurements
tpm2_pcrread                  # read TPM PCR values (tpm2-tools)
dmesg | grep -i ima</code></pre>`
    },
    {
      "title": "8. Putting it together & references",
      "content": `<p>Linux security is <strong>layered and additive</strong>. A request must pass DAC, then capabilities, then (if privileged) the LSM policy, while seccomp independently gates the syscall itself, namespaces bound what is visible, and cgroups bound what is consumable. No single layer is sufficient; defence in depth means an attacker must defeat several.</p>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Layer</th><th style="text-align:left; padding:0.5rem;">Question it answers</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">DAC</td><td style="padding:0.5rem;">Does this user own / have rights to this file?</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">Capabilities</td><td style="padding:0.5rem;">Does this process hold this specific privilege?</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">LSM (SELinux/AppArmor)</td><td style="padding:0.5rem;">Does site policy allow this subject→object action?</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">seccomp</td><td style="padding:0.5rem;">Is this syscall even permitted to this process?</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">namespaces</td><td style="padding:0.5rem;">What can this process see?</td></tr>
<tr><td style="padding:0.5rem;">cgroups</td><td style="padding:0.5rem;">How much can this process consume?</td></tr></table>
<h4>References & further reading</h4>
<ul>
<li><a href="https://www.kernel.org/doc/man-pages/" target="_blank">man-pages: <code>capabilities(7)</code>, <code>namespaces(7)</code>, <code>user_namespaces(7)</code>, <code>seccomp(2)</code>, <code>cgroups(7)</code></a></li>
<li><a href="https://docs.kernel.org/admin-guide/LSM/index.html" target="_blank">Kernel docs — Linux Security Modules</a></li>
<li><a href="https://docs.kernel.org/security/IMA-templates.html" target="_blank">Kernel docs — Integrity Measurement Architecture (IMA)</a></li>
<li><a href="https://docs.kernel.org/userspace-api/seccomp_filter.html" target="_blank">Kernel docs — seccomp BPF filtering</a></li>
</ul>`
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) { module.exports = TOPIC_LINUX_SECURITY; }
