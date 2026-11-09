/**
 * Topic: VFIO (Virtual Function I/O) — Userspace Device Drivers & Device Passthrough
 *
 * Dedicated deep dive into the Linux VFIO framework: IOMMU groups, the
 * container/group/device object model, vfio-pci, interrupts via eventfd,
 * iommufd/cdev, SR-IOV and variant drivers, and userspace drivers (DPDK/SPDK).
 */
/* Accessible palette, declared BEFORE the helpers and the topic object so
 * nothing reads a const in its temporal dead zone at load time.
 * ONE neutral hue; meaning is carried by number badges, position, shape,
 * arrows and text — never by color. */
const VFIO_BOX_FILL = "#cfe3ff";
const VFIO_BOX_STROKE = "#1f2d3d";
const VFIO_TEXT = "#0f172a";
const VFIO_NOTE = "#c9d4e0";
const VFIO_ARROW = "#9db4cc";
const VFIO_BG = "#0d1117";

function vfioBadge(cx, cy, badge) {
  return (
    `<circle cx="${cx}" cy="${cy}" r="13" fill="${VFIO_BOX_STROKE}"></circle>` +
    `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="13" font-weight="700" fill="#ffffff">${badge}</text>`
  );
}
// Centered-label box with optional numbered badge on the left.
function vfioBox(x, y, w, h, label, badge) {
  const cy = y + h / 2;
  let s =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ` +
    `fill="${VFIO_BOX_FILL}" stroke="${VFIO_BOX_STROKE}" stroke-width="1.5"></rect>`;
  if (badge !== undefined) s += vfioBadge(x + 17, cy, badge);
  const tx = badge !== undefined ? x + 17 + (w - 17) / 2 : x + w / 2;
  s +=
    `<text x="${tx}" y="${cy + 5}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="13" font-weight="600" fill="${VFIO_TEXT}">${label}</text>`;
  return s;
}
// Wide box with left-aligned text (flow steps).
function vfioStepBox(x, y, w, h, label, badge) {
  const cy = y + h / 2;
  let s =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ` +
    `fill="${VFIO_BOX_FILL}" stroke="${VFIO_BOX_STROKE}" stroke-width="1.5"></rect>`;
  if (badge !== undefined) s += vfioBadge(x + 17, cy, badge);
  s +=
    `<text x="${x + 38}" y="${cy + 4}" font-family="sans-serif" ` +
    `font-size="12.5" fill="${VFIO_TEXT}">${label}</text>`;
  return s;
}
function vfioCaption(cx, y, text) {
  return (
    `<text x="${cx}" y="${y}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="12" fill="${VFIO_NOTE}">${text}</text>`
  );
}
// Diamond decision node: shape (not color) marks a decision.
function vfioDiamond(cx, cy, halfW, halfH, label, badge) {
  let s =
    `<polygon points="${cx},${cy - halfH} ${cx + halfW},${cy} ${cx},${cy + halfH} ${cx - halfW},${cy}" ` +
    `fill="${VFIO_BOX_FILL}" stroke="${VFIO_BOX_STROKE}" stroke-width="1.5"></polygon>`;
  s +=
    `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="12" font-weight="600" fill="${VFIO_TEXT}">${label}</text>`;
  if (badge !== undefined) s += vfioBadge(cx - halfW + 22, cy, badge);
  return s;
}
function vfioVArrow(x, y1, y2) {
  return (
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${VFIO_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x - 5},${y2 - 6} ${x + 5},${y2 - 6} ${x},${y2}" fill="${VFIO_ARROW}"></polygon>`
  );
}
function vfioHArrow(x1, y, x2) {
  const dir = x2 >= x1 ? 1 : -1;
  return (
    `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${VFIO_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x2 - dir * 7},${y - 5} ${x2 - dir * 7},${y + 5} ${x2},${y}" fill="${VFIO_ARROW}"></polygon>`
  );
}
function vfioArrow(x1, y1, x2, y2) {
  const a = Math.atan2(y2 - y1, x2 - x1), L = 8, sp = 0.45;
  const p1 = (x2 - L * Math.cos(a - sp)).toFixed(1) + "," + (y2 - L * Math.sin(a - sp)).toFixed(1);
  const p2 = (x2 - L * Math.cos(a + sp)).toFixed(1) + "," + (y2 - L * Math.sin(a + sp)).toFixed(1);
  return (
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${VFIO_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x2},${y2} ${p1} ${p2}" fill="${VFIO_ARROW}"></polygon>`
  );
}
function vfioLine(x1, y1, x2, y2) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${VFIO_ARROW}" stroke-width="2"></line>`;
}
// Dashed outline used to group boxes (an IOMMU group); shape/label, not color.
function vfioGroupFrame(x, y, w, h, label) {
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="none" ` +
    `stroke="${VFIO_ARROW}" stroke-width="2" stroke-dasharray="6 4"></rect>` +
    `<text x="${x + 8}" y="${y + 15}" font-family="sans-serif" font-size="11.5" ` +
    `font-weight="700" fill="${VFIO_NOTE}">${label}</text>`
  );
}
function vfioFrame(viewW, viewH, title, subtitle, body, ariaLabel) {
  return (
    `<div style="overflow-x:auto; margin:1rem 0; padding:1rem; background:${VFIO_BG}; ` +
    `border:1px solid #30363d; border-radius:8px;">` +
    `<div style="text-align:center; font-weight:700; font-size:1.05rem; color:#58a6ff; margin-bottom:0.25rem;">${title}</div>` +
    `<div style="text-align:center; font-size:0.85rem; color:#8b949e; margin-bottom:0.75rem;">${subtitle}</div>` +
    `<svg viewBox="0 0 ${viewW} ${viewH}" width="100%" role="img" aria-label="${ariaLabel}">${body}</svg>` +
    `</div>`
  );
}

// (a) Architecture stack
function vfioArchitectureSVG() {
  const items = [
    "Userspace app: QEMU / DPDK / SPDK",
    "/dev/vfio/vfio + /dev/vfio/&lt;group&gt;  (character devices)",
    "VFIO core (container, group, device)",
    "vfio-pci  (bus driver, vfio-pci-core)",
    "IOMMU (VT-d / AMD-Vi / SMMU): DMA + interrupt remapping",
    "PCI device (physical function or SR-IOV VF)",
  ];
  let body = "";
  const x = 120, w = 520, h = 44, gap = 22;
  items.forEach((t, i) => {
    const y = 20 + i * (h + gap);
    body += vfioBox(x, y, w, h, t, i + 1);
    if (i < items.length - 1) body += vfioVArrow(x + w / 2, y + h, y + h + gap);
  });
  body += vfioCaption(380, 20 + items.length * (h + gap) - 6, "Numbers 1-6 follow the path from userspace down to the hardware");
  return vfioFrame(760, 20 + items.length * (h + gap) + 6, "VFIO architecture stack",
    "Userspace reaches the device only through VFIO; the IOMMU confines its DMA",
    body, "Architecture stack: userspace application, VFIO character devices, VFIO core, vfio-pci, IOMMU, then the PCI device");
}

// (b) ioctl flow chart
function vfioFlowSVG() {
  const steps = [
    "open(\"/dev/vfio/vfio\")  -&gt; container fd",
    "open(\"/dev/vfio/&lt;N&gt;\")  -&gt; group fd",
    null, // decision
    "ioctl(group, VFIO_GROUP_SET_CONTAINER, &amp;container)",
    "ioctl(container, VFIO_SET_IOMMU, VFIO_TYPE1v2_IOMMU)",
    "ioctl(container, VFIO_IOMMU_MAP_DMA, &amp;map)  (IOVA -&gt; user VA, pins pages)",
    "ioctl(group, VFIO_GROUP_GET_DEVICE_FD, \"0000:03:00.0\")  -&gt; device fd",
    "Device fd: GET_INFO, regions (BARs, config), IRQs (eventfd)",
  ];
  let body = "", y = 14;
  const x = 60, w = 640, h = 38, gap = 20;
  steps.forEach((t, i) => {
    if (t === null) {
      body += vfioDiamond(380, y + 26, 190, 26, "GROUP_GET_STATUS: VIABLE set?", i + 1);
      body += vfioCaption(610, y + 22, "no: stop (group not viable)");
      body += vfioCaption(430, y + 62, "yes");
      y += 52;
    } else {
      body += vfioStepBox(x, y, w, h, t, i + 1);
      y += h;
    }
    if (i < steps.length - 1) { body += vfioVArrow(380, y, y + gap); y += gap; }
  });
  return vfioFrame(760, y + 10, "Container / group / device ioctl flow",
    "Order matters: the group must be viable and attached to a container with an IOMMU backend before you can get a device fd",
    body, "Flow chart of eight steps with a decision diamond after opening the group: open container, open group, check viable, set container, set IOMMU, map DMA, get device fd, use device");
}

// (c) IOMMU group isolation
function vfioGroupsSVG() {
  let body = "";
  // Group A: two functions behind a switch without ACS
  body += vfioGroupFrame(20, 20, 210, 120, "IOMMU group 14 (no ACS between)");
  body += vfioBox(35, 45, 180, 40, "NIC port 0", 1);
  body += vfioBox(35, 92, 180, 40, "NIC port 1", 2);
  // Group B: single device
  body += vfioGroupFrame(20, 170, 210, 80, "IOMMU group 15");
  body += vfioBox(35, 195, 180, 40, "NVMe SSD", 3);
  // Group C
  body += vfioGroupFrame(20, 280, 210, 80, "IOMMU group 16");
  body += vfioBox(35, 305, 180, 40, "GPU", 4);
  // IOMMU
  body += vfioBox(330, 120, 170, 140, "IOMMU", 5);
  body += vfioCaption(415, 245, "page tables per domain");
  // Memory
  body += vfioBox(590, 90, 150, 50, "Domain A memory", 6);
  body += vfioBox(590, 160, 150, 50, "Domain B memory", 7);
  body += vfioBox(590, 230, 150, 50, "Domain C memory", 8);
  body += vfioArrow(230, 80, 330, 160);
  body += vfioArrow(230, 210, 330, 190);
  body += vfioArrow(230, 320, 330, 220);
  body += vfioArrow(500, 160, 590, 115);
  body += vfioArrow(500, 190, 590, 185);
  body += vfioArrow(500, 220, 590, 255);
  body += vfioCaption(380, 385, "The IOMMU can tell groups apart, not devices inside one group: the group is the unit of isolation and assignment");
  return vfioFrame(760, 400, "IOMMU groups and DMA remapping",
    "Each group gets its own translation domain; devices within a group cannot be separated from each other",
    body, "Devices placed in dashed IOMMU group outlines; each group goes through the IOMMU to its own memory domain. Group 14 holds two devices that must be assigned together");
}

// (d) interrupt delivery
function vfioIrqSVG() {
  let body = "";
  const y = 50, h = 56, w = 128;
  const labels = ["Device raises MSI-X vector", "IOMMU interrupt remapping", "vfio-pci IRQ handler", "eventfd_signal()", "Userspace poll / KVM irqfd"];
  labels.forEach((t, i) => {
    const x = 10 + i * 148;
    body += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${VFIO_BOX_FILL}" stroke="${VFIO_BOX_STROKE}" stroke-width="1.5"></rect>`;
    body += vfioBadge(x + 17, y + 14, i + 1);
    body += `<text x="${x + w / 2}" y="${y + 38}" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="600" fill="${VFIO_TEXT}">${t}</text>`;
    if (i < labels.length - 1) body += vfioHArrow(x + w, y + h / 2, x + 148);
  });
  body += vfioCaption(380, 140, "VFIO_DEVICE_SET_IRQS binds one eventfd per vector (INTx, MSI or MSI-X)");
  body += vfioCaption(380, 160, "Userspace driver: read/poll the eventfd.  VM: KVM irqfd injects the guest interrupt directly");
  return vfioFrame(760, 180, "Interrupt delivery through eventfd",
    "Hardware interrupt becomes a file-descriptor event",
    body, "Five step chain: device raises interrupt, IOMMU remaps it, vfio-pci handles it, signals an eventfd, userspace or KVM consumes it");
}

// (e) SR-IOV
function vfioSriovSVG() {
  let body = "";
  body += vfioBox(280, 15, 200, 44, "PF (host driver, e.g. ixgbe)", 1);
  for (let i = 0; i < 3; i++) {
    const x = 40 + i * 240;
    body += vfioLine(380, 59, x + 90, 90);
    body += vfioGroupFrame(x, 85, 180, 70, "IOMMU group " + (20 + i));
    body += vfioBox(x + 15, 105, 150, 40, "VF " + i, 2);
    body += vfioVArrow(x + 90, 155, 190);
    body += vfioBox(x, 190, 180, 40, "vfio-pci (VF " + i + ")", 3);
    body += vfioVArrow(x + 90, 230, 265);
    body += vfioBox(x, 265, 180, 40, "VM " + (i + 1) + " (QEMU)", 4);
  }
  body += vfioCaption(380, 335, "Each VF is bound to vfio-pci and handed to a different VM; the PF stays with the host");
  return vfioFrame(760, 350, "SR-IOV: one PF, many VFs, one VM each",
    "Whether each VF gets its own IOMMU group depends on platform topology and ACS",
    body, "A physical function feeds three virtual functions, each in an IOMMU group, bound to vfio-pci and assigned to its own virtual machine");
}

const TOPIC_VFIO = {
  "id": "vfio",
  "category": "drivers",
  "icon": "🚪",
  "title": "VFIO: Userspace Device Drivers & Device Passthrough",
  "description": "How Linux VFIO lets an unprivileged process or a VM drive a real device safely: IOMMU groups, the container/group/device ioctl model, vfio-pci, regions and eventfd interrupts, iommufd and the device cdev, SR-IOV and variant drivers, and userspace drivers such as DPDK and SPDK.",
  "keywords": [
    "vfio", "virtual function io", "userspace driver", "userspace device driver",
    "iommu", "iommufd", "iommu group", "acs", "access control services",
    "dma remapping", "interrupt remapping", "vt-d", "amd-vi", "smmu",
    "vfio-pci", "vfio-pci-core", "variant driver", "passthrough", "device passthrough",
    "gpu passthrough", "sr-iov", "vf", "pf", "mdev", "mediated device",
    "dpdk", "spdk", "uio", "igb_uio", "type1", "vfio_type1v2_iommu", "container",
    "eventfd", "msi-x", "msi", "intx", "irqfd", "noiommu", "enable_unsafe_noiommu_mode",
    "qemu", "kvm", "driver_override", "flr", "iova", "hugepages", "memlock",
    "cdev", "/dev/vfio", "live migration", "bar", "mmap"
  ],
  "sections": [
    {
      "title": "1. Overview & Architecture",
      "content": `<p><strong>VFIO (Virtual Function I/O)</strong> is the Linux framework that lets a userspace process, typically QEMU or a poll-mode networking/storage stack, drive a real hardware device <em>directly</em> while the kernel keeps the system safe. The safety comes from the IOMMU: every DMA the device issues is translated and confined to memory the process explicitly mapped for it.</p>
<p>Three ways to drive a PCI device compare as follows:</p>
<ul>
<li><strong>In-kernel driver</strong>: full kernel privilege, mature subsystems (net, block), but every I/O crosses the syscall and kernel stack. See the PCI Drivers topic for that model.</li>
<li><strong>UIO</strong>: a legacy framework that maps registers to userspace and delivers interrupts through a file descriptor. It provides <em>no</em> DMA isolation, so a buggy process can overwrite any RAM.</li>
<li><strong>VFIO</strong>: userspace register access plus IOMMU-enforced DMA isolation, interrupt remapping where available, and a clean path to hand a device to a VM.</li>
</ul>
<p>Typical use cases: VM passthrough of GPUs, NICs and NVMe drives; DPDK and SPDK userspace polling-mode drivers; FPGA and accelerator access from user code.</p>
${vfioArchitectureSVG()}
<p>Related topics: the DMA topic covers the DMA API and IOMMU basics, Virtualization covers QEMU/KVM, IRQ Domain covers how MSI vectors are routed, and Linux Security covers the wider isolation model. This topic focuses on VFIO itself.</p>`
    },
    {
      "title": "2. The IOMMU Foundation & IOMMU Groups",
      "content": `<p>VFIO is only safe because an <strong>IOMMU</strong> sits between devices and memory: Intel VT-d, AMD-Vi or Arm SMMU. It provides three things VFIO depends on:</p>
<ul>
<li><strong>DMA remapping</strong>: the device uses I/O virtual addresses (IOVAs); the IOMMU translates them through per-domain page tables and faults on anything unmapped.</li>
<li><strong>Interrupt remapping</strong>: device-generated interrupts are validated and translated, so a device cannot inject arbitrary vectors.</li>
<li><strong>Isolation</strong>: each translation domain sees only what its owner mapped.</li>
</ul>
<h4>IOMMU groups</h4>
<p>An <strong>IOMMU group</strong> is the smallest set of devices the hardware can isolate from one another. Grouping is derived from topology and <strong>ACS (Access Control Services)</strong> on PCIe root ports and switches. Without ACS, peer-to-peer transactions between devices behind the same switch can be routed directly without ever reaching the IOMMU, so those devices cannot be told apart and land in one group. VFIO therefore requires you to assign the <em>whole group</em> to one owner.</p>
${vfioGroupsSVG()}
<pre><code># list every group and its devices
for g in /sys/kernel/iommu_groups/*; do
  echo "IOMMU group $(basename $g)"
  for d in $g/devices/*; do echo -n "    "; lspci -nns "$(basename $d)"; done
done

# group of one device
readlink /sys/bus/pci/devices/0000:03:00.0/iommu_group</code></pre>
<p><strong>ACS override caveat:</strong> some out-of-tree/distro patches and kernel parameters can pretend that ACS isolation exists to split groups. This removes the hardware guarantee: devices may still reach each other by peer-to-peer DMA. It is a security trade-off for trusted lab setups only and is not recommended for hosts running untrusted guests.</p>
<p>See the DMA topic for how the in-kernel DMA API uses the same IOMMU, and Linux Security for the broader threat model.</p>`
    },
    {
      "title": "3. The VFIO Object Model (Container, Group, Device)",
      "content": `<p>The classic interface has three objects, each a file descriptor:</p>
<ul>
<li><strong>Container</strong> (<code>/dev/vfio/vfio</code>): an IOMMU address space. With the <code>VFIO_TYPE1v2_IOMMU</code> backend it holds the IOVA to process-virtual-address mappings shared by all attached groups.</li>
<li><strong>Group</strong> (<code>/dev/vfio/&lt;N&gt;</code>): one IOMMU group. It is only usable when every device in it is bound to vfio-pci (or another VFIO driver) or to no driver.</li>
<li><strong>Device</strong>: a descriptor returned by <code>VFIO_GROUP_GET_DEVICE_FD</code>, used for regions and interrupts.</li>
</ul>
${vfioFlowSVG()}
<p>The order is: open the container, open the group, check <code>VFIO_GROUP_GET_STATUS</code> for <code>VFIO_GROUP_FLAGS_VIABLE</code>, attach with <code>VFIO_GROUP_SET_CONTAINER</code>, select the backend with <code>VFIO_SET_IOMMU</code>, create DMA mappings with <code>VFIO_IOMMU_MAP_DMA</code> (the kernel <strong>pins</strong> the pages so they cannot move or be swapped while the device may DMA to them), then call <code>VFIO_GROUP_GET_DEVICE_FD</code>.</p>
<p>Illustrative sketch only (error handling omitted, not production code):</p>
<pre><code>#include &lt;fcntl.h&gt;
#include &lt;stdint.h&gt;
#include &lt;sys/ioctl.h&gt;
#include &lt;sys/mman.h&gt;
#include &lt;linux/vfio.h&gt;

int container = open("/dev/vfio/vfio", O_RDWR);
int group     = open("/dev/vfio/42", O_RDWR);

struct vfio_group_status status = { .argsz = sizeof(status) };
ioctl(group, VFIO_GROUP_GET_STATUS, &amp;status);
if (!(status.flags &amp; VFIO_GROUP_FLAGS_VIABLE))
    return -1;  /* another device in the group has a host driver */

ioctl(group, VFIO_GROUP_SET_CONTAINER, &amp;container);
ioctl(container, VFIO_SET_IOMMU, VFIO_TYPE1v2_IOMMU);

void *buf = mmap(NULL, 1UL &lt;&lt; 21, PROT_READ | PROT_WRITE,
                 MAP_PRIVATE | MAP_ANONYMOUS | MAP_HUGETLB, -1, 0);
struct vfio_iommu_type1_dma_map map = {
    .argsz = sizeof(map),
    .flags = VFIO_DMA_MAP_FLAG_READ | VFIO_DMA_MAP_FLAG_WRITE,
    .vaddr = (uintptr_t)buf,
    .iova  = 0x100000,        /* address the device will use */
    .size  = 1UL &lt;&lt; 21,
};
ioctl(container, VFIO_IOMMU_MAP_DMA, &amp;map);   /* pins pages */

int device = ioctl(group, VFIO_GROUP_GET_DEVICE_FD, "0000:03:00.0");</code></pre>`
    },
    {
      "title": "4. The Device Interface: Regions & Interrupts",
      "content": `<p>With a device fd, <code>VFIO_DEVICE_GET_INFO</code> reports the number of regions and IRQ indexes. Each region is described by <code>VFIO_DEVICE_GET_REGION_INFO</code> (size, offset, flags such as read, write, mmap).</p>
<h4>Regions</h4>
<ul>
<li><strong>BARs</strong>: if the region reports the mmap flag, <code>mmap()</code> the device fd at the reported offset for direct MMIO access with no syscall per register access. Otherwise use <code>pread</code>/<code>pwrite</code>.</li>
<li><strong>PCI config space</strong>: accessed with <code>pread</code>/<code>pwrite</code> on the config region; vfio-pci filters and virtualizes some fields for safety.</li>
<li><strong>ROM</strong>: the expansion ROM region, read through the same interface.</li>
</ul>
<h4>Interrupts</h4>
<p><code>VFIO_DEVICE_GET_IRQ_INFO</code> describes the INTx, MSI and MSI-X indexes. <code>VFIO_DEVICE_SET_IRQS</code> attaches an <strong>eventfd</strong> to each vector (or masks/unmasks it). When the device fires, vfio-pci signals the eventfd. A userspace driver reads or polls it; QEMU can instead register it as a KVM <strong>irqfd</strong>, so the guest interrupt is injected in the kernel without waking QEMU.</p>
${vfioIrqSVG()}
<pre><code>int efd = eventfd(0, EFD_CLOEXEC);
/* argsz covers the header plus one int32 fd */
struct vfio_irq_set *irq = malloc(sizeof(*irq) + sizeof(int));
irq-&gt;argsz = sizeof(*irq) + sizeof(int);
irq-&gt;flags = VFIO_IRQ_SET_DATA_EVENTFD | VFIO_IRQ_SET_ACTION_TRIGGER;
irq-&gt;index = VFIO_PCI_MSIX_IRQ_INDEX;
irq-&gt;start = 0;
irq-&gt;count = 1;
memcpy(irq-&gt;data, &amp;efd, sizeof(int));
ioctl(device, VFIO_DEVICE_SET_IRQS, irq);</code></pre>
<p>For how MSI vectors are allocated and routed inside the kernel, see the IRQ Domain topic.</p>`
    },
    {
      "title": "5. vfio-pci in Practice",
      "content": `<p><strong>vfio-pci</strong> is the generic PCI bus driver for VFIO. Hardware and kernel prerequisites: VT-d or AMD-Vi enabled in firmware, and on x86 the kernel parameter <code>intel_iommu=on</code> or <code>amd_iommu=on</code> (some kernels enable the IOMMU by default; check <code>dmesg</code>). <code>iommu=pt</code> (passthrough for host-owned devices) can reduce host DMA overhead; it does not stop VFIO from translating devices you assign, but evaluate it against your own security requirements.</p>
<h4>Binding a device</h4>
<pre><code># identify the device and its current driver
lspci -nnk -s 0000:03:00.0

# preferred: driver_override, then re-probe
modprobe vfio-pci
echo vfio-pci &gt; /sys/bus/pci/devices/0000:03:00.0/driver_override
echo 0000:03:00.0 &gt; /sys/bus/pci/devices/0000:03:00.0/driver/unbind
echo 0000:03:00.0 &gt; /sys/bus/pci/drivers_probe

# alternative: bind every device with a vendor:device ID
echo "10de 1c82" &gt; /sys/bus/pci/drivers/vfio-pci/new_id

# at boot: module option or kernel command line
#   modprobe vfio-pci ids=10de:1c82,10de:0fb9
#   vfio-pci.ids=10de:1c82,10de:0fb9

# check the group and the device node
readlink /sys/bus/pci/devices/0000:03:00.0/iommu_group
ls -l /dev/vfio/</code></pre>
<p>Every device in the group must be unbound from its host driver (bridges/root ports are tolerated by the kernel) or bound to vfio-pci. <strong>Permissions:</strong> <code>/dev/vfio/&lt;N&gt;</code> is owned by root by default; use a udev rule to give a specific user or group access rather than running as root.</p>
<h4>VM passthrough with QEMU</h4>
<pre><code>qemu-system-x86_64 -machine q35,accel=kvm -m 8G \
  -device vfio-pci,host=03:00.0 \
  ...</code></pre>
<p>QEMU opens the container and group, maps all guest RAM through <code>MAP_DMA</code> so the device DMAs with guest-physical addresses as IOVAs, and wires MSI-X to KVM through irqfd. See the Virtualization topic for the KVM side.</p>
<h4>GPU passthrough caveats (conservative)</h4>
<ul>
<li><strong>Reset behaviour</strong>: VFIO resets the device between owners, preferring Function Level Reset (FLR). Devices without a reliable reset may not return to a clean state, so reuse after a guest shutdown can fail until the host reboots (the so-called "reset bug" on some devices).</li>
<li><strong>VGA arbitration</strong>: a GPU used as the boot display involves legacy VGA resources; passing through the boot GPU is trickier than a secondary one.</li>
<li>Audio and other functions of the same card typically share an IOMMU group and must be assigned together.</li>
</ul>`
    },
    {
      "title": "6. IOMMUFD & the Device cdev (Newer Direction)",
      "content": `<p><strong>iommufd</strong> (<code>/dev/iommu</code>) is the newer userspace API for managing IOMMU address spaces, designed to replace the container-based type1 backend. VFIO can then expose each device through a per-device character device (<code>/dev/vfio/devices/vfioX</code>) instead of going through groups. Goals include better exposure of IOMMU features and nested translation (a guest-controlled first stage over a host-controlled second stage).</p>
<p>Version note, stated conservatively: iommufd landed in mainline around Linux 6.2 and the VFIO device cdev around Linux 6.6, with more features arriving in later 6.x releases. Check the current kernel documentation for your exact kernel. The legacy container/group API remains supported.</p>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Aspect</th><th style="text-align:left; padding:0.5rem;">Legacy container/group</th><th style="text-align:left; padding:0.5rem;">iommufd / cdev</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">Entry points</td><td style="padding:0.5rem;"><code>/dev/vfio/vfio</code> + <code>/dev/vfio/&lt;N&gt;</code></td><td style="padding:0.5rem;"><code>/dev/iommu</code> + <code>/dev/vfio/devices/vfioX</code></td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">Unit of access</td><td style="padding:0.5rem;">Group</td><td style="padding:0.5rem;">Device (group isolation still enforced underneath)</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">Address space</td><td style="padding:0.5rem;">Container with type1 backend</td><td style="padding:0.5rem;">IOAS object in iommufd, shareable</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">Nested translation</td><td style="padding:0.5rem;">Not available</td><td style="padding:0.5rem;">Supported via HW page table objects (hardware dependent)</td></tr>
<tr><td style="padding:0.5rem;">Status</td><td style="padding:0.5rem;">Stable, widely deployed</td><td style="padding:0.5rem;">Mainline, evolving</td></tr></table>
<p>The kernel can also offer a compatibility layer so old container-API programs run on top of iommufd. Verify availability and config options (such as <code>CONFIG_IOMMUFD</code>) against your kernel's documentation.</p>`
    },
    {
      "title": "7. SR-IOV, Variant Drivers & Mediated Devices",
      "content": `<p><strong>SR-IOV</strong> lets one physical function (PF) expose many lightweight virtual functions (VFs). A VF is a natural VFIO unit: it looks like an independent PCI function, and whether it lands in its own IOMMU group depends on platform topology and ACS. The PF usually stays with a host driver which creates VFs:</p>
<pre><code>echo 4 &gt; /sys/bus/pci/devices/0000:03:00.0/sriov_numvfs
lspci -nn | grep -i "virtual function"
# then bind each VF to vfio-pci as in the previous section</code></pre>
${vfioSriovSVG()}
<h4>vfio-pci-core and variant drivers</h4>
<p>The reusable part of vfio-pci is built as <strong>vfio-pci-core</strong>. Vendor <strong>variant drivers</strong> build on it to add device-specific behaviour, for example saving and restoring a device's internal state for <strong>live migration</strong> through the VFIO migration uAPI (v2). The generic idea: the variant driver exposes a migration state machine on the device fd, and the VMM streams the device state alongside guest memory. Support is specific to each device and driver.</p>
<h4>Mediated devices (mdev)</h4>
<p><strong>mdev</strong> is the older framework for software-multiplexed devices, where a vendor driver carves one physical device into virtual instances (the vGPU style). The trend is toward SR-IOV and variant drivers for new designs, though mdev remains in the tree for existing users.</p>`
    },
    {
      "title": "8. Userspace Drivers: DPDK, SPDK & the Security Model",
      "content": `<p>DPDK (networking) and SPDK (storage) run <strong>poll-mode drivers</strong> on VFIO: the application owns the queues, polls descriptors on dedicated cores, and uses hugepages for packet or I/O buffers. There are no syscalls and no interrupts on the datapath, and buffers are zero-copy because the device DMAs straight into application memory.</p>
<h4>Security model</h4>
<ul>
<li>The device can DMA only to IOVA ranges the process mapped with <code>MAP_DMA</code>; anything else faults in the IOMMU.</li>
<li>Interrupt remapping prevents the device from injecting arbitrary interrupt vectors.</li>
<li>A buggy or malicious userspace driver can still crash or wedge <em>the device</em>, or corrupt memory it legitimately has mapped.</li>
</ul>
<h4>Performance model</h4>
<ul>
<li><strong>IOTLB</strong>: translation misses cost time; hugepage-backed mappings reduce IOTLB pressure.</li>
<li><strong>Pinning cost</strong>: <code>MAP_DMA</code> pins pages, so map large regions once at startup rather than per I/O.</li>
<li>Pinned memory counts against the locked-memory limit (see troubleshooting).</li>
</ul>
<h4>NOIOMMU mode</h4>
<p>Setting the module parameter <code>enable_unsafe_noiommu_mode=1</code> lets VFIO run on machines with no IOMMU. There is <strong>no DMA protection</strong>, the kernel is tainted, and it is for testing only. Never use it on a system holding untrusted workloads.</p>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Aspect</th><th style="text-align:left; padding:0.5rem;">UIO</th><th style="text-align:left; padding:0.5rem;">VFIO</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">DMA isolation</td><td style="padding:0.5rem;">None</td><td style="padding:0.5rem;">IOMMU enforced</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">Interrupts</td><td style="padding:0.5rem;">Single, via small kernel module; no remapping guarantee</td><td style="padding:0.5rem;">eventfd per vector, MSI/MSI-X, remapping</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">Unprivileged use</td><td style="padding:0.5rem;">Unsafe, effectively root</td><td style="padding:0.5rem;">Possible with group permissions</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">VM passthrough</td><td style="padding:0.5rem;">No</td><td style="padding:0.5rem;">Yes</td></tr>
<tr><td style="padding:0.5rem;">Status</td><td style="padding:0.5rem;">Legacy; igb_uio is out-of-tree</td><td style="padding:0.5rem;">Preferred</td></tr></table>
<p>For zero-copy mapping concepts see the mmap Zero-Copy topic; for RDMA-style kernel bypass see InfiniBand.</p>`
    },
    {
      "title": "9. Troubleshooting & References",
      "content": `<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Symptom</th><th style="text-align:left; padding:0.5rem;">Likely cause and fix</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">"group is not viable"</td><td style="padding:0.5rem;">Another device in the group is bound to a host driver. Bind all non-bridge devices in the group to vfio-pci or unbind them.</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">No <code>/dev/vfio/N</code>, empty <code>iommu_groups</code></td><td style="padding:0.5rem;">IOMMU disabled in firmware or kernel command line.</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">Huge group with unrelated devices</td><td style="padding:0.5rem;">Missing ACS on switch or root port; choose another slot. ACS override weakens isolation.</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>MAP_DMA</code> fails with ENOMEM / EPERM</td><td style="padding:0.5rem;">Pinned pages exceed the memlock limit (<code>ulimit -l</code> or <code>LimitMEMLOCK</code>); raise it for the service.</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">Permission denied on <code>/dev/vfio/N</code></td><td style="padding:0.5rem;">Add a udev rule or group membership for the user.</td></tr>
<tr><td style="padding:0.5rem;">Interrupt remapping messages or unsafe-interrupts warning</td><td style="padding:0.5rem;">Interrupt remapping disabled or unsupported; enable it in firmware rather than forcing unsafe interrupts.</td></tr></table>
<pre><code>dmesg | grep -i -e DMAR -e IOMMU -e vfio
lspci -vvv -s 0000:03:00.0
find /sys/kernel/iommu_groups -type l
cat /sys/module/vfio_iommu_type1/parameters/allow_unsafe_interrupts
ulimit -l</code></pre>
<h4>References</h4>
<ul>
<li><a href="https://docs.kernel.org/driver-api/vfio.html" target="_blank" rel="noopener">Kernel VFIO documentation</a></li>
<li><a href="https://docs.kernel.org/userspace-api/iommufd.html" target="_blank" rel="noopener">iommufd documentation</a></li>
<li><a href="https://elixir.bootlin.com/linux/latest/source/include/uapi/linux/vfio.h" target="_blank" rel="noopener">VFIO uAPI header (include/uapi/linux/vfio.h)</a></li>
<li><a href="https://doc.dpdk.org/" target="_blank" rel="noopener">DPDK documentation</a></li>
<li><a href="https://www.qemu.org/docs/master/" target="_blank" rel="noopener">QEMU documentation</a></li>
</ul>`
    }
  ]
};
