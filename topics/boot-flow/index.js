/**
 * Topic: Linux Boot Flow — Firmware -> Bootloader -> Kernel -> init
 *
 * The full boot chain: platform firmware (UEFI vs legacy BIOS, ESP,
 * Secure Boot & shim); the bootloader (GRUB2, systemd-boot); kernel
 * handoff (bzImage, decompression, kernel command line); initramfs/initrd
 * and the switch_root pivot; PID 1 / systemd startup; the measured/secure
 * boot chain (TPM); and troubleshooting. Cross-links obmf, lfs and
 * linux-security (IMA/measured boot).
 */

/* Accessible palette (declared BEFORE use so the SVG helpers below are
 * initialized before the topic object literal calls them — avoids a
 * temporal-dead-zone ReferenceError at load time that would blank the site).
 * ONE neutral-blue hue for every box (#cfe3ff fill, #1f2d3d stroke) on a
 * #0d1117 background. Identity is carried by NUMBER badges + position +
 * shape + text, never by hue. Table borders use #30363d. */
const BOOT_BOX_FILL = "#cfe3ff";
const BOOT_BOX_STROKE = "#1f2d3d";
const BOOT_TEXT = "#0f172a";
const BOOT_NOTE = "#c9d4e0";
const BOOT_ARROW = "#9db4cc";
const BOOT_BG = "#0d1117";

/* =====================================================================
 * Accessible inline SVG diagram helpers (prefix boot).
 * =================================================================== */

function bootBox(x, y, w, h, label, badge) {
  const cy = y + h / 2;
  const r = 13;
  let s =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ` +
    `fill="${BOOT_BOX_FILL}" stroke="${BOOT_BOX_STROKE}" stroke-width="1.5"></rect>`;
  if (badge !== undefined) {
    s +=
      `<circle cx="${x + r + 4}" cy="${cy}" r="${r}" fill="${BOOT_BOX_STROKE}"></circle>` +
      `<text x="${x + r + 4}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="13" font-weight="700" fill="#ffffff">${badge}</text>`;
  }
  const tx = badge !== undefined ? x + r + 4 + (w - r - 4) / 2 : x + w / 2;
  s +=
    `<text x="${tx}" y="${cy + 5}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="13.5" font-weight="600" fill="${BOOT_TEXT}">${label}</text>`;
  return s;
}

function bootStepBox(x, y, w, h, label, badge) {
  const cy = y + h / 2;
  const r = 13;
  let s =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ` +
    `fill="${BOOT_BOX_FILL}" stroke="${BOOT_BOX_STROKE}" stroke-width="1.5"></rect>`;
  if (badge !== undefined) {
    s +=
      `<circle cx="${x + r + 4}" cy="${cy}" r="${r}" fill="${BOOT_BOX_STROKE}"></circle>` +
      `<text x="${x + r + 4}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="13" font-weight="700" fill="#ffffff">${badge}</text>`;
  }
  s +=
    `<text x="${x + (badge !== undefined ? r + 24 : 14)}" y="${cy + 4}" ` +
    `font-family="sans-serif" font-size="12.5" fill="${BOOT_TEXT}">${label}</text>`;
  return s;
}

function bootCaption(cx, y, text) {
  return (
    `<text x="${cx}" y="${y}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="12" fill="${BOOT_NOTE}">${text}</text>`
  );
}

function bootDiamond(cx, cy, halfW, halfH, label) {
  let s =
    `<polygon points="${cx},${cy - halfH} ${cx + halfW},${cy} ${cx},${cy + halfH} ${cx - halfW},${cy}" ` +
    `fill="${BOOT_BOX_FILL}" stroke="${BOOT_BOX_STROKE}" stroke-width="1.5"></polygon>`;
  s +=
    `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="11.5" font-weight="600" fill="${BOOT_TEXT}">${label}</text>`;
  return s;
}

function bootVArrow(x, y1, y2) {
  return (
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${BOOT_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x - 5},${y2 - 6} ${x + 5},${y2 - 6} ${x},${y2}" fill="${BOOT_ARROW}"></polygon>`
  );
}

function bootHArrow(x1, y, x2) {
  const dir = x2 >= x1 ? 1 : -1;
  return (
    `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${BOOT_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x2 - dir * 7},${y - 5} ${x2 - dir * 7},${y + 5} ${x2},${y}" fill="${BOOT_ARROW}"></polygon>`
  );
}

function bootFrame(viewW, viewH, title, subtitle, body, ariaLabel) {
  return (
    `<div style="overflow-x:auto; margin:1rem 0; padding:1rem; background:${BOOT_BG}; ` +
    `border:1px solid #30363d; border-radius:8px;">` +
    `<div style="text-align:center; font-weight:700; font-size:1.05rem; color:#58a6ff; margin-bottom:0.25rem;">${title}</div>` +
    `<div style="text-align:center; font-size:0.85rem; color:#8b949e; margin-bottom:0.75rem;">${subtitle}</div>` +
    `<svg viewBox="0 0 ${viewW} ${viewH}" width="100%" role="img" aria-label="${ariaLabel}">${body}</svg>` +
    `</div>`
  );
}

// Diagram 1: end-to-end boot flow chart.
function bootFlowSVG() {
  const w = 760, boxW = 500, boxX = 130, h = 46, gap = 24;
  const steps = [
    { l: "Power-on / reset", n: "CPU starts executing firmware" },
    { l: "Platform firmware (UEFI / BIOS)", n: "POST; init devices; find a boot target" },
    { l: "ESP / bootloader (GRUB2 or systemd-boot)", n: "read config, pick a kernel entry" },
    { l: "Load kernel (vmlinuz) + initramfs into memory", n: "pass the kernel command line" },
    { l: "Kernel: decompress, init subsystems, mount initramfs", n: "temporary root in RAM" },
    { l: "initramfs: load drivers, find & mount real root", n: "then switch_root to it" },
    { l: "systemd PID 1 starts", n: "reach default.target" },
    { l: "getty / display manager / login", n: "system is up" },
  ];
  let body = "";
  const topY = 14;
  steps.forEach((s, i) => {
    const y = topY + i * (h + gap);
    const cy = y + h / 2;
    body += bootStepBox(boxX, y, boxW, h, s.l, i + 1);
    body +=
      `<text x="${boxX + boxW + 10}" y="${cy + 4}" font-family="sans-serif" ` +
      `font-size="10.5" fill="${BOOT_NOTE}">${s.n}</text>`;
    if (i < steps.length - 1)
      body += bootVArrow(boxX + boxW / 2, y + h, y + h + gap);
  });
  const vh = topY + steps.length * (h + gap) + 6;
  return bootFrame(
    w, vh,
    "End-to-End Boot Flow",
    "Power-on (1) runs firmware (2), which launches a bootloader (3) that loads the kernel+initramfs (4,5); initramfs mounts the real root and pivots (6); systemd (7) brings the system to login (8)",
    body,
    "End to end Linux boot flow. Power on or reset starts the CPU executing platform firmware. The firmware, UEFI or legacy BIOS, runs power on self test, initialises devices and finds a boot target. It launches a bootloader from the EFI system partition, GRUB2 or systemd-boot, which reads its configuration and picks a kernel entry. The bootloader loads the kernel image and the initramfs into memory and passes the kernel command line. The kernel decompresses itself, initialises subsystems and mounts the initramfs as a temporary root in RAM. The initramfs loads the drivers needed, finds and mounts the real root filesystem, and switch_root pivots onto it. systemd starts as PID 1 and brings the machine to its default target, then getty or a display manager presents login."
  );
}

// Diagram 2: initramfs role — why kernel can't mount root directly.
function bootInitramfsSVG() {
  const w = 760, h = 48;
  let body = "";
  const topY = 16;
  body += bootStepBox(130, topY, 500, h, "kernel wants to mount real root (e.g. on LVM/RAID/NVMe/encrypted)", 1);
  body += bootVArrow(380, topY + h, topY + h + 22);
  const diaCy = topY + h + 22 + 42;
  body += bootDiamond(380, diaCy, 180, 42, "needed driver built into kernel?");
  // yes -> left -> mount directly (rare)
  body +=
    `<line x1="200" y1="${diaCy}" x2="110" y2="${diaCy}" stroke="${BOOT_ARROW}" stroke-width="2"></line>` +
    `<line x1="110" y1="${diaCy}" x2="110" y2="${diaCy + 46}" stroke="${BOOT_ARROW}" stroke-width="2"></line>` +
    `<polygon points="105,${diaCy + 40} 115,${diaCy + 40} 110,${diaCy + 46}" fill="${BOOT_ARROW}"></polygon>` +
    `<text x="135" y="${diaCy - 8}" font-family="sans-serif" font-size="11" fill="${BOOT_NOTE}">yes (rare)</text>`;
  body += bootBox(30, diaCy + 46, 170, h, "mount root directly", 2);
  // no -> right -> initramfs provides it
  body +=
    `<line x1="560" y1="${diaCy}" x2="660" y2="${diaCy}" stroke="${BOOT_ARROW}" stroke-width="2"></line>` +
    `<line x1="660" y1="${diaCy}" x2="660" y2="${diaCy + 46}" stroke="${BOOT_ARROW}" stroke-width="2"></line>` +
    `<polygon points="655,${diaCy + 40} 665,${diaCy + 40} 660,${diaCy + 46}" fill="${BOOT_ARROW}"></polygon>` +
    `<text x="568" y="${diaCy - 8}" font-family="sans-serif" font-size="11" fill="${BOOT_NOTE}">no (usual)</text>`;
  body += bootBox(560, diaCy + 46, 170, h, "initramfs loads modules", 3);
  body += bootVArrow(645, diaCy + 46 + h, diaCy + 46 + h + 18);
  const y4 = diaCy + 46 + h + 18;
  body += bootStepBox(400, y4, 330, h, "assemble LVM/RAID, unlock LUKS, mount real root", 4);
  body += bootVArrow(565, y4 + h, y4 + h + 18);
  const y5 = y4 + h + 18;
  body += bootStepBox(400, y5, 330, h, "switch_root: pivot onto the real root, exec /sbin/init", 5);
  const vh = y5 + h + 16;
  return bootFrame(
    w, vh,
    "Why initramfs Exists",
    "The kernel (1) can mount root directly only if the driver is built in (2, rare); normally the initramfs (3) loads modules, assembles storage (4) and pivots to the real root (5)",
    body,
    "The role of the initramfs. The kernel wants to mount the real root filesystem, but that root may live on LVM, software RAID, NVMe or an encrypted LUKS volume whose drivers are not built into the kernel. A decision diamond asks whether the needed driver is built in. In the rare yes case the kernel mounts root directly. In the usual no case, a small initramfs in RAM loads the necessary modules, assembles RAID or LVM and unlocks encryption, mounts the real root, and then switch_root pivots onto it and executes the real init. Outcomes are shown by shape and text, not colour."
  );
}

// Diagram 3: Secure Boot trust chain.
function bootSecureSVG() {
  const w = 760, boxW = 540, boxX = 110, h = 46, gap = 26;
  const links = [
    { l: "Platform firmware (UEFI) + Platform Key / db", n: "root of trust in firmware, keys in db/dbx" },
    { l: "shim (signed by Microsoft UEFI CA)", n: "distro's first-stage, carries the distro key (MOK)" },
    { l: "GRUB2 / bootloader (signed by distro)", n: "shim verifies it before executing" },
    { l: "Linux kernel + modules (signed)", n: "GRUB/shim verifies the kernel signature" },
    { l: "Measured into TPM PCRs along the way", n: "enables remote attestation; see IMA" },
  ];
  let body = "";
  const topY = 16;
  links.forEach((s, i) => {
    const y = topY + i * (h + gap);
    const cy = y + h / 2;
    body += bootStepBox(boxX, y, boxW, h, s.l, i + 1);
    body +=
      `<text x="${boxX + boxW + 8}" y="${cy + 4}" font-family="sans-serif" ` +
      `font-size="10" fill="${BOOT_NOTE}">${s.n}</text>`;
    if (i < links.length - 1)
      body += bootVArrow(boxX + boxW / 2, y + h, y + h + gap);
  });
  body += bootCaption(boxX + boxW / 2, topY + links.length * (h + gap) + 4, "each stage verifies the signature of the next before handing off");
  const vh = topY + links.length * (h + gap) + 20;
  return bootFrame(
    w, vh,
    "Secure Boot Trust Chain",
    "Firmware keys (1) verify shim (2), which verifies GRUB (3), which verifies the kernel (4); each stage is also measured into TPM PCRs (5) for attestation",
    body,
    "Secure Boot chain of trust. The platform firmware holds the root of trust with a platform key and the signature databases db and dbx. The firmware verifies and launches shim, which is signed by the Microsoft UEFI certificate authority and carries the distribution key, including machine owner keys. shim verifies GRUB2 or the bootloader signed by the distribution. The bootloader and shim verify the signed Linux kernel and its modules. At each hand off the stage verifies the signature of the next before executing it, and each component is also measured into TPM platform configuration registers to enable remote attestation, which connects to IMA in the security topic."
  );
}

const TOPIC_BOOT_FLOW = {
  "id": "boot-flow",
  "category": "core",
  "icon": "🥾",
  "title": "Linux Boot Flow: Firmware → Bootloader → Kernel → init",
  "description": "The complete Linux boot chain: platform firmware (UEFI vs legacy BIOS, the EFI System Partition, Secure Boot & shim), the bootloader (GRUB2 and systemd-boot), the kernel handoff (bzImage decompression, the kernel command line), the initramfs/initrd and the switch_root pivot, PID 1 / systemd startup and targets, the measured/secure boot chain with the TPM, and boot troubleshooting — with accessible diagrams.",
  "keywords": [
    "boot", "boot flow", "boot process", "firmware", "uefi", "bios",
    "legacy bios", "efi system partition", "esp", "boot manager",
    "efibootmgr", "secure boot", "shim", "mok", "bootloader", "grub",
    "grub2", "grub.cfg", "systemd-boot", "bootctl", "vmlinuz", "bzImage",
    "decompression", "kernel command line", "cmdline", "initramfs",
    "initrd", "dracut", "mkinitramfs", "lsinitramfs", "lsinitrd",
    "switch_root", "pivot_root", "pid 1", "init", "systemd", "default.target",
    "targets", "getty", "login", "tpm", "measured boot", "pcr", "attestation",
    "journalctl", "dmesg", "rescue", "emergency", "root of trust"
  ],
  "sections": [
    {
      "title": "1. The boot chain, end to end",
      "content": `<p>Booting Linux is a relay race: each stage initialises just enough, then hands control to the next, more capable stage. Power-on → firmware → bootloader → kernel → initramfs → <code>init</code> (systemd) → login. Knowing the hand-offs is what lets you diagnose a machine that stops anywhere along the way.</p>
${bootFlowSVG()}
<p>This topic walks each stage. It connects to several others: the platform <strong>Root of Trust</strong> that the firmware relies on is covered by the <em>OBMF (Open Boot &amp; Management Framework)</em> and <em>DC-SCM</em> topics; building a system from source (which makes every stage explicit) is the <em>Linux From Scratch (LFS)</em> topic; and the measured-boot continuation into user space (IMA/EVM) is in the <em>Linux Security</em> topic.</p>`
    },
    {
      "title": "2. Platform firmware: UEFI vs legacy BIOS",
      "content": `<p>The first code a CPU runs is <strong>platform firmware</strong>, which performs power-on self-test (POST), initialises the CPU, memory and buses, and locates something to boot.</p>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;"></th><th style="text-align:left; padding:0.5rem;">Legacy BIOS</th><th style="text-align:left; padding:0.5rem;">UEFI</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Finds bootloader via</strong></td><td style="padding:0.5rem;">MBR boot code in the first sector</td><td style="padding:0.5rem;">EFI executables on the EFI System Partition (ESP)</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Partition scheme</strong></td><td style="padding:0.5rem;">MBR (≤2&nbsp;TiB, 4 primary)</td><td style="padding:0.5rem;">GPT (large disks, many partitions)</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Boot entries</strong></td><td style="padding:0.5rem;">Implicit (disk order)</td><td style="padding:0.5rem;">NVRAM boot variables (BootOrder, Boot####)</td></tr>
<tr><td style="padding:0.5rem;"><strong>Secure Boot</strong></td><td style="padding:0.5rem;">No</td><td style="padding:0.5rem;">Yes (signature verification)</td></tr></table>
<p><strong>UEFI</strong> is now standard. It runs a <strong>boot manager</strong> driven by NVRAM variables and loads <code>.efi</code> binaries from the FAT-formatted <strong>ESP</strong> (typically mounted at <code>/boot/efi</code>). <strong>Secure Boot</strong> (section 7) lets the firmware refuse to launch any boot binary whose signature is not trusted.</p>
<pre><code>efibootmgr -v              # list/modify UEFI boot entries and BootOrder
[ -d /sys/firmware/efi ] && echo "booted via UEFI" || echo "legacy BIOS"
mount | grep /boot/efi     # the ESP</code></pre>`
    },
    {
      "title": "3. The bootloader: GRUB2 & systemd-boot",
      "content": `<p>The firmware launches a <strong>bootloader</strong> whose job is to find a kernel, load it plus an initramfs into memory, set the kernel command line, and jump to the kernel.</p>
<h4>GRUB2</h4>
<p><strong>GRUB2</strong> is the most common Linux bootloader. On UEFI it is a <code>.efi</code> binary on the ESP; it reads <code>grub.cfg</code> (usually generated, not hand-edited) to present a menu. Each entry uses the <code>linux</code> command to load the kernel and <code>initrd</code> to load the initramfs, with the kernel command line appended. GRUB can read many filesystems, so it can load a kernel from <code>/boot</code> directly.</p>
<h4>systemd-boot</h4>
<p><strong>systemd-boot</strong> is a simpler UEFI-only alternative: tiny boot-entry text files on the ESP, managed with <code>bootctl</code>. It has no scripting and relies on the firmware to read the FAT ESP, which makes it fast and easy to reason about where UEFI is guaranteed.</p>
<pre><code>sudo grub2-mkconfig -o /boot/grub2/grub.cfg   # regenerate GRUB menu
# (Debian/Ubuntu: update-grub -> /boot/grub/grub.cfg)
bootctl status             # systemd-boot entries & default</code></pre>`
    },
    {
      "title": "4. Kernel handoff",
      "content": `<p>The bootloader loads <strong><code>vmlinuz</code></strong> — a <code>bzImage</code>, which is a small setup stub plus a <em>compressed</em> kernel. Early real-mode/EFI setup code runs, then the kernel <strong>self-decompresses</strong>, sets up initial page tables and the console, and begins bringing up subsystems.</p>
<p>A critical input is the <strong>kernel command line</strong>: a string of parameters (e.g. <code>root=UUID=…</code>, <code>ro</code>, <code>quiet</code>, <code>console=ttyS0</code>, <code>systemd.unit=…</code>) the bootloader hands over. It tells the kernel where the root filesystem is, which console to use, and dozens of tunables. Getting it wrong is a classic cause of an unbootable system.</p>
<pre><code>cat /proc/cmdline          # the command line THIS boot used
uname -r                   # running kernel version
ls -l /boot/vmlinuz-*      # installed kernel images</code></pre>`
    },
    {
      "title": "5. initramfs / initrd & switch_root",
      "content": `<p>There is a chicken-and-egg problem: the kernel must mount the root filesystem, but the root may live on hardware or storage layers (NVMe, SAS, LVM, software RAID, LUKS encryption, network storage) whose drivers are modules — and the modules live <em>on that very root filesystem</em>. The <strong>initramfs</strong> breaks the loop.</p>
<p>The <strong>initramfs</strong> (modern) or <strong>initrd</strong> (older) is a small compressed archive the bootloader loads into RAM alongside the kernel. The kernel unpacks it as a temporary root, runs its <code>init</code>, which loads the needed modules, assembles RAID/LVM, unlocks encryption, finds the real root, mounts it, and finally calls <strong><code>switch_root</code></strong> to pivot onto the real root and exec the real <code>/sbin/init</code>.</p>
${bootInitramfsSVG()}
<p>Distributions build the initramfs with <strong>dracut</strong> (Fedora/RHEL/SUSE) or <strong>mkinitramfs/initramfs-tools</strong> (Debian/Ubuntu). Building one by hand is a core <em>Linux From Scratch</em> exercise.</p>
<pre><code>lsinitrd /boot/initramfs-$(uname -r).img   # (dracut) list contents
lsinitramfs /boot/initrd.img-$(uname -r)   # (Debian/Ubuntu)
sudo dracut --force                        # rebuild the current initramfs</code></pre>`
    },
    {
      "title": "6. PID 1: systemd startup",
      "content": `<p>Once on the real root, the kernel executes the first user-space process, <strong>PID&nbsp;1</strong> — on modern distributions, <strong>systemd</strong>. Everything else descends from it. systemd brings the system up by resolving a dependency graph of <strong>units</strong> toward a <strong>target</strong>.</p>
<ul>
<li><strong>default.target</strong> — the goal state, usually <code>graphical.target</code> or <code>multi-user.target</code>.</li>
<li><strong>Unit ordering</strong> — <code>Requires=</code>/<code>Wants=</code> express dependencies, <code>Before=</code>/<code>After=</code> express ordering; systemd starts independent units in parallel.</li>
<li><strong>getty / display manager</strong> — the final units spawn login prompts (<code>getty@ttyN</code>) or a graphical login.</li>
</ul>
<p>The dedicated <em>systemd</em> topic covers unit management in depth; here the point is that PID&nbsp;1 is the last link in the boot chain, turning a mounted root into a running, logged-in system.</p>
<pre><code>systemctl get-default          # the default.target
systemd-analyze                # total boot time (firmware/loader/kernel/userspace)
systemd-analyze blame          # slowest units at boot</code></pre>`
    },
    {
      "title": "7. Secure Boot & the measured/trusted chain",
      "content": `<p><strong>Secure Boot</strong> extends trust from firmware upward: the firmware only runs signed binaries it trusts, each stage verifies the next, so malware cannot silently insert itself before the kernel. On Linux the standard chain adds <strong>shim</strong> — a small first-stage loader signed by the Microsoft UEFI CA that carries the distribution's own key (and user-enrolled <em>Machine Owner Keys</em>, MOK) — so distributions boot on stock firmware without every vendor shipping keys.</p>
${bootSecureSVG()}
<p>Alongside signature <em>verification</em>, components are <strong>measured</strong> into the <strong>TPM</strong>'s Platform Configuration Registers (PCRs) — a hash chain of exactly what ran. This enables <strong>remote attestation</strong> (prove to a server the machine booted known-good code) and continues into user space as <strong>IMA/EVM</strong> (see the <em>Linux Security</em> topic). The hardware Root of Trust underpinning all of this is the subject of the <em>OBMF</em> and <em>DC-SCM</em> topics.</p>
<pre><code>mokutil --sb-state             # is Secure Boot enabled?
tpm2_pcrread                   # read TPM PCR measurements (tpm2-tools)</code></pre>`
    },
    {
      "title": "8. Troubleshooting a boot",
      "content": `<p>Because boot is a chain, diagnosis is about finding <em>which link</em> failed:</p>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Symptom</th><th style="text-align:left; padding:0.5rem;">Likely stage</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">No boot menu / "no bootable device"</td><td style="padding:0.5rem;">Firmware / ESP / boot entries (<code>efibootmgr</code>)</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">GRUB rescue prompt</td><td style="padding:0.5rem;">Bootloader config / missing kernel</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">"Cannot mount root" / dropped to initramfs shell</td><td style="padding:0.5rem;">initramfs missing a driver, or wrong <code>root=</code></td></tr>
<tr><td style="padding:0.5rem;">Hang after "Reached target" messages</td><td style="padding:0.5rem;">A systemd unit / service</td></tr></table>
<p>Core tools: edit the GRUB entry at boot (press <kbd>e</kbd>) to add <code>systemd.unit=rescue.target</code> or <code>emergency</code> for a minimal shell; after booting, inspect logs.</p>
<pre><code>journalctl -b              # full log for the current boot
journalctl -b -1 -p err    # previous boot, errors only
dmesg --level=err,warn     # kernel ring-buffer problems
systemctl --failed         # units that failed this boot</code></pre>
<h4>References & further reading</h4>
<ul>
<li><a href="https://www.freedesktop.org/software/systemd/man/latest/bootup.html" target="_blank">systemd <code>bootup(7)</code> — the boot process</a></li>
<li><a href="https://www.gnu.org/software/grub/manual/grub/grub.html" target="_blank">GNU GRUB Manual</a></li>
<li><a href="https://www.kernel.org/doc/html/latest/admin-guide/kernel-parameters.html" target="_blank">Kernel docs — The kernel's command-line parameters</a></li>
<li><a href="https://www.kernel.org/doc/man-pages/" target="_blank">man-pages: <code>efibootmgr(8)</code>, <code>bootctl(1)</code>, <code>dracut(8)</code>, <code>journalctl(1)</code></a></li>
</ul>`
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) { module.exports = TOPIC_BOOT_FLOW; }
