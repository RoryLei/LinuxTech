/**
 * Topic: IRQ Domains & Hierarchical IRQ Routing
 */

/* Accessible palette (declared before use): ONE neutral-blue hue for every
 * box (#cfe3ff fill, #1f2d3d stroke) on a #0d1117 background. Element identity
 * is carried by NUMBER badges + position + text, never by hue. No red/green/
 * yellow conveys meaning. Table borders use #30363d. */
const IRQ_BOX_FILL = "#cfe3ff";
const IRQ_BOX_STROKE = "#1f2d3d";
const IRQ_TEXT = "#0f172a";
const IRQ_NOTE = "#c9d4e0";
const IRQ_ARROW = "#9db4cc";
const IRQ_BG = "#0d1117";

const TOPIC_IRQ_DOMAIN = {
  "id": "irq-domain",
  "category": "kernel",
  "icon": "🧭",
  "title": "IRQ Domains & Hierarchical IRQ Routing",
  "description": "How the Linux kernel maps hardware interrupt numbers (hwirq) to global Linux IRQs (virq) with irq_domain — Device Tree translation, stacked/hierarchical domains, MSI/MSI-X and PCIe multi-vector allocation, and interrupt remapping, with flow charts",
  "keywords": [
    "irq_domain", "hwirq", "virq", "virtual irq", "irq_create_mapping",
    "irq_find_mapping", "irq_dispose_mapping", "irq_domain_ops", "xlate",
    "translate", "revmap", "linear", "radix tree", "no-map", "direct",
    "hierarchical", "stacked domains", "irq_domain_create_hierarchy",
    "irq_domain_alloc_irqs", "irq_domain_set_hwirq_and_chip", "irq_chip",
    "msi", "msi-x", "msi_domain_info", "pci_alloc_irq_vectors", "gic", "its",
    "apic", "interrupt remapping", "iommu", "device tree interrupts",
    "interrupt-controller", "interrupt-cells", "interrupts-extended",
    "irq_of_parse_and_map", "platform_get_irq", "fwnode", "chained handler",
    "irq_set_chained_handler", "gpio irq", "cascaded", "vfio", "passthrough",
    "proc interrupts", "debugfs irq domains"
  ],
  "sections": [
    {
      "title": "1. Overview & Architecture",
      "content": `<p>Every interrupt controller numbers its inputs <em>locally</em>: line 7 on a GIC, pin 3 on a GPIO expander, vector 0 of a PCIe device. The kernel, however, wants a single <strong>global</strong> handle it can pass to <code>request_irq()</code>. The <strong>irq_domain</strong> subsystem is the translation layer that reconciles the two: it maps a controller-local <strong>hwirq</strong> (hardware interrupt number) to a <strong>virq</strong> (the kernel's virtual / Linux IRQ number).</p>
<p><strong>Why a flat global numbering space breaks down:</strong> early Linux handed out one contiguous IRQ array shared by all controllers. On a modern SoC with a root GIC, several GPIO controllers, an I2C IRQ expander, and PCIe MSI/MSI-X delivering thousands of vectors, a single static table collides, wastes memory, and cannot express <em>which</em> controller owns a number. irq_domain gives each controller its own namespace and a private reverse-map, so hwirq 3 on the GPIO chip and hwirq 3 on the GIC never clash.</p>
${irqDomainOverviewSVG()}
<h4>The three moving parts</h4>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Term</th><th style="text-align:left; padding:0.5rem;">Scope</th><th style="text-align:left; padding:0.5rem;">Meaning</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>hwirq</strong></td><td style="padding:0.5rem;">Per controller</td><td style="padding:0.5rem;">The raw line/pin/vector number as the hardware sees it</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>virq</strong></td><td style="padding:0.5rem;">Global (kernel-wide)</td><td style="padding:0.5rem;">The Linux IRQ number drivers pass to <code>request_irq()</code></td></tr>
<tr><td style="padding:0.5rem;"><strong>irq_domain</strong></td><td style="padding:0.5rem;">Per controller</td><td style="padding:0.5rem;">Owns the hwirq&rarr;virq mapping + ops for one controller</td></tr></table>
<p>The flow is a clean pipeline: <em>interrupt controller (hwirq) &rarr; irq_domain (mapping) &rarr; IRQ core / <code>irq_desc</code> (virq) &rarr; driver handler</em>. Everything in this topic is about how that mapping is created, how it stacks across multiple controllers, and how it serves MSI/MSI-X and PCIe multi-vector devices.</p>`
    },
    {
      "title": "2. Core Concepts: struct irq_domain & irq_domain_ops",
      "content": `<p>An <code>irq_domain</code> is registered by a controller driver and owns the mapping for that controller. It bundles a reverse-map (hwirq&rarr;virq lookup), a set of callbacks, and a pointer to the firmware node (<code>fwnode</code>) that identifies the controller.</p>
<h4>struct irq_domain (simplified)</h4>
<pre><code>struct irq_domain {
    const char            *name;
    const struct irq_domain_ops *ops;   // map/xlate/alloc callbacks
    void                  *host_data;    // controller private data
    struct fwnode_handle  *fwnode;       // DT/ACPI node identity
    struct irq_domain     *parent;       // non-NULL => hierarchical (section 4)
    unsigned int           revmap_size;  // size of the linear revmap
    struct radix_tree_root revmap_tree;  // for sparse (radix) maps
    unsigned int           linear_revmap[];  // fast hwirq -> virq array
};</code></pre>
<h4>The revmap: three strategies</h4>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Revmap</th><th style="text-align:left; padding:0.5rem;">Backing store</th><th style="text-align:left; padding:0.5rem;">Best for</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Linear</strong></td><td style="padding:0.5rem;">Flat array indexed by hwirq</td><td style="padding:0.5rem;">Small, dense hwirq ranges (most controllers / GICs)</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>Radix tree</strong></td><td style="padding:0.5rem;">Radix tree keyed by hwirq</td><td style="padding:0.5rem;">Large/sparse spaces (MSI, where hwirq can be huge)</td></tr>
<tr><td style="padding:0.5rem;"><strong>No-map / direct</strong></td><td style="padding:0.5rem;">None (hwirq == virq)</td><td style="padding:0.5rem;">Controllers that are themselves the root (e.g. some per-CPU)</td></tr></table>
<h4>struct irq_domain_ops — the callback contract</h4>
<pre><code>struct irq_domain_ops {
    // Non-hierarchical: wire a hwirq to a freshly created virq's irq_desc
    int  (*map)(struct irq_domain *d, unsigned int virq, irq_hw_number_t hw);
    void (*unmap)(struct irq_domain *d, unsigned int virq);

    // Turn a firmware interrupt specifier (DT/ACPI) into a hwirq + type
    int  (*xlate)(struct irq_domain *d, struct device_node *node,
                  const u32 *intspec, unsigned int intsize,
                  irq_hw_number_t *out_hwirq, unsigned int *out_type);
    int  (*translate)(struct irq_domain *d, struct irq_fwspec *fwspec,
                      irq_hw_number_t *out_hwirq, unsigned int *out_type);

    // Hierarchical: allocate/free a run of virqs down the domain stack
    int  (*alloc)(struct irq_domain *d, unsigned int virq,
                  unsigned int nr_irqs, void *arg);
    void (*free)(struct irq_domain *d, unsigned int virq,
                 unsigned int nr_irqs);
};</code></pre>
<h4>The lookup / creation API</h4>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Call</th><th style="text-align:left; padding:0.5rem;">Does</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>irq_create_mapping(d, hwirq)</code></td><td style="padding:0.5rem;">Find-or-create a virq for a hwirq (non-hierarchical)</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>irq_find_mapping(d, hwirq)</code></td><td style="padding:0.5rem;">Look up an existing virq (0 if none) &mdash; used in the ISR path</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>irq_dispose_mapping(virq)</code></td><td style="padding:0.5rem;">Tear down a mapping when the IRQ is no longer needed</td></tr>
<tr><td style="padding:0.5rem;"><code>irq_domain_add_linear / _tree</code></td><td style="padding:0.5rem;">Register a domain with a linear or radix revmap</td></tr></table>
<p>In the receive path a controller's demux reads its status register to get the <em>hwirq</em>, calls <code>irq_find_mapping()</code> to get the <em>virq</em>, then <code>generic_handle_irq(virq)</code> to run the registered handler.</p>`
    },
    {
      "title": "3. Device Tree Integration (xlate / translate)",
      "content": `<p>On DT-based platforms, interrupts are described declaratively. A controller advertises itself with <code>interrupt-controller;</code> and a <code>#interrupt-cells</code> count; consumers reference it with <code>interrupts</code> or <code>interrupts-extended</code>. At boot, the irq_domain's <code>.xlate</code>/<code>.translate</code> callback turns that DT <em>interrupt specifier</em> into a hwirq, which is then mapped to a virq.</p>
<h4>A controller and a consumer in DT</h4>
<pre><code>/* The interrupt controller (e.g. a GIC): 3 cells per interrupt */
gic: interrupt-controller@f9010000 {
    compatible = "arm,gic-400";
    interrupt-controller;          /* I provide interrupts */
    #interrupt-cells = &lt;3&gt;;        /* type, number, flags */
    reg = &lt;0xf9010000 0x1000&gt;;
};

/* A device that uses one SPI interrupt, line 42, level-high */
eth0: ethernet@e000b000 {
    compatible = "vendor,gige";
    reg = &lt;0xe000b000 0x1000&gt;;
    interrupt-parent = &lt;&amp;gic&gt;;
    interrupts = &lt;0 42 4&gt;;          /* 0=SPI, 42=hwirq, 4=level-high */
};

/* interrupts-extended lets a device name DIFFERENT parents per line: */
sensor@48 {
    interrupts-extended = &lt;&amp;gic 0 17 4&gt;, &lt;&amp;gpio1 5 2&gt;;
};</code></pre>
<h4>How a DT specifier becomes a virq</h4>
<pre><code>// Driver probe (DT): one call does parse + translate + map
int irq = irq_of_parse_and_map(dev->of_node, 0);  // index 0
// For platform devices the idiomatic wrapper is:
int irq = platform_get_irq(pdev, 0);              // calls the above

// Under the hood:
//   1. parse the 'interrupts' cells for index 0 into an irq_fwspec
//   2. find the parent domain via interrupt-parent / fwnode
//   3. domain->ops->translate(fwspec) -> out_hwirq + out_type
//   4. irq_create_mapping(domain, hwirq) -> virq
//   5. return the virq, ready for request_irq()</code></pre>
<h4>A controller's .xlate for #interrupt-cells = 3</h4>
<pre><code>static int my_gic_xlate(struct irq_domain *d, struct device_node *np,
                        const u32 *spec, unsigned int n,
                        irq_hw_number_t *out_hwirq, unsigned int *out_type)
{
    if (n != 3)
        return -EINVAL;
    // spec[0]=class (SPI/PPI), spec[1]=line, spec[2]=flags
    *out_hwirq = (spec[0] == 0) ? spec[1] + 32 : spec[1] + 16;  // SPI offset
    *out_type  = spec[2] & IRQ_TYPE_SENSE_MASK;
    return 0;
}</code></pre>
<p>The modern replacement for <code>.xlate</code> is <code>.translate</code>, which takes a firmware-agnostic <code>struct irq_fwspec</code> so the same code path serves both Device Tree and ACPI. New controller drivers should implement <code>.translate</code>.</p>`
    },
    {
      "title": "4. Hierarchical IRQ Domains (Stacked Domains)",
      "content": `<p>A single hwirq&rarr;virq map works when one controller sits between the device and the CPU. Real hardware stacks several: a PCIe MSI controller feeds an interrupt-remapping unit, which feeds the root GIC/APIC, which feeds the CPU. <strong>Hierarchical irq_domains</strong> model this as a <em>stack</em> of domains, parent above child, each contributing one layer of state to a single logical interrupt.</p>
<p><strong>Why hierarchy was introduced:</strong> MSI, interrupt remapping (IOMMU), inter-processor interrupts (IPIs), and CPU affinity all need each layer to program its <em>own</em> registers for the <em>same</em> virq. A flat domain could not express "the MSI layer owns the message address, the ITS layer owns the device-ID table, the GIC owns the CPU target." Stacking gives each layer its own <code>irq_chip</code> on the same <code>irq_data</code> chain.</p>
${irqDomainHierarchySVG()}
<h4>The key hierarchical calls</h4>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Call</th><th style="text-align:left; padding:0.5rem;">Role</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>irq_domain_create_hierarchy()</code></td><td style="padding:0.5rem;">Register a child domain with a <code>parent</code> pointer</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>irq_domain_alloc_irqs()</code></td><td style="padding:0.5rem;">Allocate a run of virqs top-to-bottom through the stack</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>irq_domain_alloc_irqs_parent()</code></td><td style="padding:0.5rem;">A child's <code>.alloc</code> asks its parent to allocate its layer</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>irq_domain_set_hwirq_and_chip()</code></td><td style="padding:0.5rem;">Bind this layer's hwirq + <code>irq_chip</code> to the virq</td></tr>
<tr><td style="padding:0.5rem;"><code>irq_chip_*_parent()</code></td><td style="padding:0.5rem;">An <code>irq_chip</code> op that forwards to the parent chip</td></tr></table>
<h4>A child domain's .alloc delegating upward</h4>
<pre><code>static int child_domain_alloc(struct irq_domain *d, unsigned int virq,
                              unsigned int nr_irqs, void *arg)
{
    irq_hw_number_t hwirq = compute_hwirq(arg);

    // 1. Ask the PARENT domain to set up its layer first (recurses to root)
    int ret = irq_domain_alloc_irqs_parent(d, virq, nr_irqs, arg);
    if (ret)
        return ret;

    // 2. Then bind OUR chip + hwirq onto the same virq
    for (unsigned int i = 0; i < nr_irqs; i++)
        irq_domain_set_hwirq_and_chip(d, virq + i, hwirq + i,
                                      &my_child_irq_chip, d->host_data);
    return 0;
}</code></pre>
<p>At delivery time the interrupt enters at the <em>root</em> (the CPU takes it), and each domain's handler calls down to its child via the stacked <code>irq_chip</code> until the leaf handler the driver registered runs. Masking, affinity, and EOI similarly ripple through the stack with the <code>*_parent()</code> helpers, so every layer stays consistent.</p>`
    },
    {
      "title": "5. MSI / MSI-X & PCIe Multi-Vector",
      "content": `<p>PCIe devices do not have interrupt wires; they <em>write a message</em> to a magic address, and the interrupt controller turns that memory write into a CPU interrupt. <strong>MSI</strong> (up to 32 vectors, one address) and <strong>MSI-X</strong> (up to 2048 vectors, a per-vector table) let one device own many interrupts &mdash; one per queue on a NIC or NVMe drive. This is where hierarchical domains earn their keep: an <strong>MSI irq_domain</strong> stacks on top of the GIC/APIC domain.</p>
${irqDomainMsixSVG()}
<h4>msi_domain_info ties the MSI layer together</h4>
<pre><code>// The MSI domain describes how to compose and program the message.
struct msi_domain_info {
    u32                       flags;      // MSI_FLAG_USE_DEF_* etc.
    struct msi_domain_ops    *ops;        // prepare/compose the message
    struct irq_chip          *chip;       // writes addr/data to the device
    void                     *data;
};
// Created on top of a parent (the GIC/ITS or APIC/vector domain):
d = msi_create_irq_domain(fwnode, &info, parent_domain);</code></pre>
<h4>How a driver asks for many vectors</h4>
<pre><code>// A NIC wanting one IRQ per RX/TX queue, with graceful fallback:
int nvec = pci_alloc_irq_vectors(pdev, 1, want,
                                 PCI_IRQ_MSIX | PCI_IRQ_MSI | PCI_IRQ_INTX);
if (nvec < 0)
    return nvec;                 // nothing available

for (int i = 0; i < nvec; i++) {
    int virq = pci_irq_vector(pdev, i);        // vector index -> Linux virq
    request_irq(virq, queue_isr, 0, "nic-q", &queues[i]);
}
// pci_alloc_irq_vectors() walks DOWN the stack: for each vector the MSI
// domain's .alloc calls irq_domain_alloc_irqs_parent(), so the ITS/IR layer
// and the GIC/APIC layer each allocate their slice -> one virq per vector.</code></pre>
<h4>Interrupt remapping (the middle layer)</h4>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Platform</th><th style="text-align:left; padding:0.5rem;">Remap layer</th><th style="text-align:left; padding:0.5rem;">Role</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">ARM64</td><td style="padding:0.5rem;">GIC <strong>ITS</strong></td><td style="padding:0.5rem;">Maps a device's <code>DeviceID</code>+<code>EventID</code> to a LPI via translation tables</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">x86 (Intel)</td><td style="padding:0.5rem;"><strong>Intel IR</strong> (VT-d)</td><td style="padding:0.5rem;">Remaps the message through an IOMMU interrupt-remapping table</td></tr>
<tr><td style="padding:0.5rem;">x86 (AMD)</td><td style="padding:0.5rem;">AMD IOMMU</td><td style="padding:0.5rem;">Equivalent remapping for isolation / affinity</td></tr></table>
<p>Remapping sits as a domain <em>between</em> the device's MSI domain and the root CPU-vector domain. It provides isolation (a device can only raise interrupts it was granted), flexible affinity, and is the mechanism that makes safe PCIe passthrough to virtual machines possible.</p>`
    },
    {
      "title": "6. The virq Allocation Flow",
      "content": `<p>Whether the trigger is a DT probe or a PCIe <code>pci_alloc_irq_vectors()</code> call, the end result is the same: a usable Linux <strong>virq</strong> backed by an <code>irq_desc</code> and an <code>irq_chip</code> stack. The flowchart below traces both entry points converging on the mapping machinery.</p>
${irqDomainAllocFlowSVG()}
<h4>Non-hierarchical path (irq_create_mapping)</h4>
<pre><code>virq = irq_create_mapping(domain, hwirq);
//  1. irq_find_mapping(domain, hwirq): already mapped? return existing virq
//  2. irq_domain_alloc_descs(): allocate a free virq + its irq_desc
//  3. store hwirq->virq in the domain revmap (linear or radix)
//  4. domain->ops->map(domain, virq, hwirq): set handler + irq_chip
//  5. return virq
request_irq(virq, handler, flags, name, dev);   // driver now owns it</code></pre>
<h4>Hierarchical path (irq_domain_alloc_irqs)</h4>
<pre><code>virq = irq_domain_alloc_irqs(child_domain, nr_irqs, node, arg);
//  1. reserve nr_irqs contiguous virqs + irq_descs
//  2. child_domain->ops->alloc(): computes its hwirq, then calls
//       irq_domain_alloc_irqs_parent() -> recurses UP to the root
//  3. unwinding DOWN, each layer runs irq_domain_set_hwirq_and_chip()
//       so the virq ends up with a STACK of irq_chips (one per domain)
//  4. return the base virq; pci_irq_vector()/request_irq() use it</code></pre>
<h4>Reading the result</h4>
<pre><code>// After allocation, each virq has an irq_data chain, one node per domain:
//   irq_data(virq) -> [MSI chip] -> [ITS/IR chip] -> [GIC chip]
// A mask/affinity call on the virq walks that chain via *_parent() helpers,
// so every hardware layer is reprogrammed consistently for one logical IRQ.</code></pre>`
    },
    {
      "title": "7. Platform Peripherals: Chained vs Hierarchical",
      "content": `<p>Not every secondary controller uses the hierarchical stack. GPIO controllers, I2C IRQ expanders, and other cascaded chips historically use <strong>chained handlers</strong>: the parent IRQ's handler is replaced by a demux routine that reads the child's status register and dispatches to the child's virqs. Both models remain in the kernel; the choice depends on whether per-layer hardware programming is needed.</p>
${irqDomainChainedSVG()}
<h4>Chained handler (demux) &mdash; the classic GPIO pattern</h4>
<pre><code>// The GPIO controller owns ITS OWN irq_domain (one hwirq per GPIO line).
// It installs a chained handler on the single parent (GIC) line it sits on.
static void gpio_irq_demux(struct irq_desc *desc)
{
    struct irq_chip *chip = irq_desc_get_chip(desc);
    struct my_gpio *g = irq_desc_get_handler_data(desc);
    unsigned long status = readl(g->base + GPIO_IRQ_STATUS);
    int bit;

    chained_irq_enter(chip, desc);          // ack the parent
    for_each_set_bit(bit, &status, g->ngpio) {
        // hwirq (the GPIO line) -> virq, then run its handler
        generic_handle_irq(irq_find_mapping(g->domain, bit));
    }
    chained_irq_exit(chip, desc);
}

// Wire the demux onto the parent line at probe time:
irq_set_chained_handler_and_data(parent_irq, gpio_irq_demux, g);</code></pre>
<h4>Chained vs hierarchical &mdash; when to use which</h4>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Aspect</th><th style="text-align:left; padding:0.5rem;">Chained</th><th style="text-align:left; padding:0.5rem;">Hierarchical</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">Child virq</td><td style="padding:0.5rem;">Separate domain, dispatched by demux</td><td style="padding:0.5rem;">One virq spanning all layers</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">Per-layer HW programming</td><td style="padding:0.5rem;">No &mdash; parent just forwards</td><td style="padding:0.5rem;">Yes &mdash; each layer has its <code>irq_chip</code></td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">Affinity / masking per layer</td><td style="padding:0.5rem;">Limited</td><td style="padding:0.5rem;">Full, via <code>*_parent()</code></td></tr>
<tr><td style="padding:0.5rem;">Typical users</td><td style="padding:0.5rem;">GPIO, simple cascaded expanders</td><td style="padding:0.5rem;">MSI/MSI-X, ITS, interrupt remapping</td></tr></table>
<p>A GPIO controller can also be built as a hierarchical domain (<code>GPIOLIB_IRQCHIP</code> with a parent fwnode) when it needs the parent to be reprogrammed per line &mdash; but the chained demux remains common and perfectly valid for pin-multiplexed interrupts.</p>`
    },
    {
      "title": "8. Virtualization, Debugging & End-to-End Walkthrough",
      "content": `<p>The same irq_domain machinery serves <strong>virtualized and passthrough devices</strong>. When a PCIe function is assigned to a guest via <strong>VFIO</strong>, the host still allocates real MSI/MSI-X vectors through the normal MSI domain stack; VFIO then wires each vector's completion to an <em>eventfd</em> that the VMM (e.g. QEMU/KVM) turns into a virtual interrupt for the guest. Interrupt remapping (ITS / Intel IR) is what makes this safe &mdash; it confines the device to the vectors it was granted. <code>virtio</code> devices likewise use the generic MSI layer: their vectors are ordinary virqs allocated down the same hierarchy. The key point is that passthrough does not bypass irq_domain; it rides on it.</p>
<h4>Introspection: /proc and debugfs</h4>
<pre><code># Per-CPU interrupt counts + the chip/domain name and the device handler:
cat /proc/interrupts
#            CPU0       CPU1
#   24:        10          0   GICv3  41 Level     eth0
#  512:         0       4312   ITS-MSI  ...  nvme0q1   <- an MSI-X vector

# Dump every registered irq_domain (needs CONFIG_GENERIC_IRQ_DEBUGFS):
cat /sys/kernel/debug/irq/domains
#   name        mapped  linear  radix  parent
#   PCI-MSIX     16      0       16     ITS
#   ITS          ...                    GICv3
#   GICv3        224     224     0      (root)

# Inspect a single virq's full domain stack (the irq_chip chain):
cat /sys/kernel/debug/irq/irqs/512
#   hwirq: 0x1a   chip: ITS-MSI   -> parent chip: GICv3 ...
#   affinity, trigger type, and per-layer state are all shown here</code></pre>
<h4>End-to-end: a PCIe NIC requesting MSI-X vectors</h4>
<pre><code>1. Driver probe: pci_alloc_irq_vectors(pdev, 1, 8, PCI_IRQ_MSIX)
2. PCI core finds the device's MSI irq_domain (child), calls
   irq_domain_alloc_irqs() for 8 vectors.
3. MSI domain .alloc: for each vector it calls
   irq_domain_alloc_irqs_parent() -> ITS/IR domain -> GICv3/APIC root.
4. Root (GIC/APIC) picks a CPU vector / LPI; ITS writes its translation
   table (DeviceID+EventID -> LPI); MSI layer composes the message
   (address+data) and writes it into the device's MSI-X table via its chip.
5. Each layer runs irq_domain_set_hwirq_and_chip() -> each of the 8 virqs
   now has a 3-deep irq_chip stack.
6. Driver: pci_irq_vector(pdev, i) -> virq; request_irq(virq, q_isr, ...).
7. At runtime the NIC writes its MSI-X message; the root controller raises
   the vector on the target CPU; the stacked handlers run top-down until
   q_isr() (the leaf handler) executes. /proc/interrupts shows the count.</code></pre>
<h4>Common pitfalls</h4>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Symptom</th><th style="text-align:left; padding:0.5rem;">Cause / fix</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>platform_get_irq()</code> returns <code>-EPROBE_DEFER</code></td><td style="padding:0.5rem;">Parent interrupt-controller not registered yet &mdash; return the error so probe retries</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">virq is 0 in the ISR demux</td><td style="padding:0.5rem;"><code>irq_find_mapping()</code> found no mapping &mdash; the hwirq was never <code>irq_create_mapping()</code>'d</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;">MSI-X alloc fails with few vectors</td><td style="padding:0.5rem;">Pass a <code>min</code>/<code>max</code> range to <code>pci_alloc_irq_vectors()</code> and handle fallback</td></tr>
<tr><td style="padding:0.5rem;">Wrong trigger type / spurious IRQs</td><td style="padding:0.5rem;">DT flags cell or <code>.xlate</code> type decode mismatched the hardware sense</td></tr></table>
<h4>Key takeaways</h4>
<ul>
<li><strong>irq_domain</strong> maps a controller-local <strong>hwirq</strong> to a global Linux <strong>virq</strong>, giving each controller its own namespace.</li>
<li><strong>Device Tree</strong> interrupt specifiers are decoded by <code>.xlate</code>/<code>.translate</code> into a hwirq, then mapped via <code>irq_create_mapping()</code>.</li>
<li><strong>Hierarchical domains</strong> stack one <code>irq_chip</code> per layer so MSI, remapping, and the root controller each program their own state for one virq.</li>
<li><strong>MSI/MSI-X</strong> and <code>pci_alloc_irq_vectors()</code> allocate many virqs down that stack; interrupt remapping (ITS / Intel IR) sits in the middle and enables safe passthrough.</li>
<li><strong>Chained handlers</strong> remain the simple model for GPIO/cascaded controllers; <code>/proc/interrupts</code> and <code>/sys/kernel/debug/irq/</code> expose the live mapping.</li>
</ul>
<p><strong>References:</strong></p>
<ul>
<li><a href="https://docs.kernel.org/core-api/irq/irq-domain.html" target="_blank">Linux Kernel: The irq_domain interrupt number mapping library</a></li>
<li><a href="https://www.kernel.org/doc/html/latest/core-api/irq/irq-domain.html" target="_blank">core-api/irq/irq-domain.html (latest)</a></li>
<li><a href="https://docs.kernel.org/PCI/msi-howto.html" target="_blank">Linux Kernel: The MSI Driver Guide HOWTO</a></li>
<li><a href="https://lwn.net/Articles/470820/" target="_blank">LWN: Interrupt mapping with irq_domain</a></li>
<li><a href="https://lwn.net/Articles/564741/" target="_blank">LWN: Hierarchical interrupt domains</a></li>
<li><a href="https://elixir.bootlin.com/linux/latest/source/include/linux/irqdomain.h" target="_blank">include/linux/irqdomain.h (API header)</a></li>
</ul>`
    }
  ]
};

/* =====================================================================
 * Accessible inline SVG diagram helpers (palette constants are declared
 * at the top of this file so they are initialized before these run).
 * =================================================================== */

// Shared helpers -------------------------------------------------------
function irqBox(x, y, w, h, label, badge) {
  const cy = y + h / 2;
  const r = 13;
  let s =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ` +
    `fill="${IRQ_BOX_FILL}" stroke="${IRQ_BOX_STROKE}" stroke-width="1.5"></rect>`;
  if (badge !== undefined) {
    s +=
      `<circle cx="${x + r + 4}" cy="${cy}" r="${r}" fill="${IRQ_BOX_STROKE}"></circle>` +
      `<text x="${x + r + 4}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="13" font-weight="700" fill="#ffffff">${badge}</text>`;
  }
  const tx = badge !== undefined ? x + r + 4 + (w - r - 4) / 2 : x + w / 2;
  s +=
    `<text x="${tx}" y="${cy + 5}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="14" font-weight="600" fill="${IRQ_TEXT}">${label}</text>`;
  return s;
}

function irqVArrow(x, y1, y2) {
  return (
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${IRQ_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x - 5},${y2 - 6} ${x + 5},${y2 - 6} ${x},${y2}" fill="${IRQ_ARROW}"></polygon>`
  );
}

function irqVArrowUp(x, y1, y2) {
  // arrow pointing up: from y1 (lower) to y2 (upper)
  return (
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${IRQ_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x - 5},${y2 + 6} ${x + 5},${y2 + 6} ${x},${y2}" fill="${IRQ_ARROW}"></polygon>`
  );
}

function irqFrame(viewW, viewH, title, subtitle, body, ariaLabel) {
  return (
    `<div style="overflow-x:auto; margin:1rem 0; padding:1rem; background:${IRQ_BG}; ` +
    `border:1px solid #30363d; border-radius:8px;">` +
    `<div style="text-align:center; font-weight:700; font-size:1.05rem; color:#58a6ff; margin-bottom:0.25rem;">${title}</div>` +
    `<div style="text-align:center; font-size:0.85rem; color:#8b949e; margin-bottom:0.75rem;">${subtitle}</div>` +
    `<svg viewBox="0 0 ${viewW} ${viewH}" width="100%" role="img" aria-label="${ariaLabel}">${body}</svg>` +
    `</div>`
  );
}

// Diagram 1: Overview — hwirq -> irq_domain -> virq -------------------
function irqDomainOverviewSVG() {
  const w = 760, boxW = 180, h = 54;
  const colX = [30, 290, 550];
  const rowY = 40;
  let body = "";
  // three controllers on the left feeding one domain layer feeding IRQ core
  const ctrls = ["GIC (hwirq)", "GPIO chip (hwirq)", "PCIe MSI (hwirq)"];
  ctrls.forEach((c, i) => {
    const y = rowY + i * 70;
    body += irqBox(colX[0], y, boxW, h, c, i + 1);
    // arrow to the domain column
    const ax1 = colX[0] + boxW, ax2 = colX[1];
    const ay = y + h / 2, dy = rowY + 70 + h / 2;
    body +=
      `<line x1="${ax1}" y1="${ay}" x2="${ax2}" y2="${dy}" stroke="${IRQ_ARROW}" stroke-width="2"></line>` +
      `<polygon points="${ax2 - 8},${dy - 4} ${ax2 - 8},${dy + 4} ${ax2},${dy}" fill="${IRQ_ARROW}"></polygon>`;
  });
  // domain middle box
  body += irqBox(colX[1], rowY + 70, boxW, h, "irq_domain", 4);
  body +=
    `<text x="${colX[1] + boxW / 2}" y="${rowY + 70 + h + 18}" text-anchor="middle" ` +
    `font-family="sans-serif" font-size="12" fill="${IRQ_NOTE}">per-controller hwirq&rarr;virq map</text>`;
  // arrow domain -> IRQ core
  const my = rowY + 70 + h / 2;
  body +=
    `<line x1="${colX[1] + boxW}" y1="${my}" x2="${colX[2]}" y2="${my}" stroke="${IRQ_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${colX[2] - 8},${my - 4} ${colX[2] - 8},${my + 4} ${colX[2]},${my}" fill="${IRQ_ARROW}"></polygon>`;
  // IRQ core + driver
  body += irqBox(colX[2], rowY + 40, boxW, h, "IRQ core (virq)", 5);
  body += irqVArrow(colX[2] + boxW / 2, rowY + 40 + h, rowY + 70 + 40);
  body += irqBox(colX[2], rowY + 70 + 40, boxW, h, "Driver handler", 6);
  const vh = rowY + 70 + 40 + h + 30;
  return irqFrame(
    w, vh,
    "irq_domain — hwirq to virq Mapping",
    "Each interrupt controller (1-3) keeps its own hwirq namespace | the domain (4) maps it to a global virq (5) the driver uses (6)",
    body,
    "Overview: three interrupt controllers each with local hwirq numbers feed an irq_domain that maps hwirq to a global virq consumed by the IRQ core and the driver handler."
  );
}

// Diagram 2: Hierarchical domain stack --------------------------------
function irqDomainHierarchySVG() {
  const w = 760, boxW = 320, boxX = 220, h = 50, gap = 34;
  const layers = [
    "Device MSI domain (leaf)",
    "ITS / Interrupt-Remap domain",
    "GIC / APIC root domain",
    "CPU (takes the interrupt)",
  ];
  let body = "";
  const topY = 24;
  layers.forEach((l, i) => {
    const y = topY + i * (h + gap);
    body += irqBox(boxX, y, boxW, h, l, i + 1);
    if (i < layers.length - 1) {
      const yb = y + h, yn = y + h + gap;
      // down arrow (allocation) on the left of center
      body += irqVArrow(boxX + boxW / 2 - 60, yb, yn);
      // up arrow (delivery) on the right of center
      body += irqVArrowUp(boxX + boxW / 2 + 60, yn, yb);
    }
  });
  // side labels
  const midY = topY + 1.5 * (h + gap);
  body +=
    `<text x="40" y="${midY}" font-family="sans-serif" font-size="12" fill="${IRQ_NOTE}">alloc</text>` +
    `<text x="40" y="${midY + 18}" font-family="sans-serif" font-size="12" fill="${IRQ_NOTE}">(top&rarr;down)</text>`;
  body +=
    `<text x="${w - 110}" y="${midY}" font-family="sans-serif" font-size="12" fill="${IRQ_NOTE}">delivery</text>` +
    `<text x="${w - 110}" y="${midY + 18}" font-family="sans-serif" font-size="12" fill="${IRQ_NOTE}">(bottom&rarr;up)</text>`;
  const vh = topY + layers.length * (h + gap) + 10;
  return irqFrame(
    w, vh,
    "Hierarchical irq_domain Stack",
    "One virq spans every layer (1-4). Allocation flows top-down (left arrow); an actual interrupt is delivered bottom-up (right arrow)",
    body,
    "Hierarchical domain stack: the device MSI domain sits above the ITS or interrupt-remap domain, above the GIC or APIC root domain, above the CPU. Allocation flows downward; interrupt delivery flows upward."
  );
}

// Diagram 3: virq allocation flowchart --------------------------------
function irqDomainAllocFlowSVG() {
  const w = 760, boxW = 420, boxX = 170, h = 46, gap = 26;
  const steps = [
    "Trigger: DT probe (platform_get_irq) OR pci_alloc_irq_vectors",
    "Resolve parent domain via fwnode / interrupt-parent",
    "translate(): interrupt specifier -> hwirq + type",
    "Allocate free virq + irq_desc; store hwirq in revmap",
    "ops->map / ops->alloc: bind irq_chip(s) to the virq",
    "request_irq(virq, handler): driver owns a usable Linux IRQ",
  ];
  let body = "";
  const topY = 20;
  steps.forEach((s, i) => {
    const y = topY + i * (h + gap);
    body += irqBox(boxX, y, boxW, h, "", i + 1);
    // left-aligned text inside wide box (override centered label)
    const cy = y + h / 2;
    body +=
      `<text x="${boxX + 40}" y="${cy + 4}" font-family="sans-serif" font-size="12.5" ` +
      `fill="${IRQ_TEXT}">${s}</text>`;
    if (i < steps.length - 1)
      body += irqVArrow(boxX + boxW / 2, y + h, y + h + gap);
  });
  const vh = topY + steps.length * (h + gap) + 6;
  return irqFrame(
    w, vh,
    "virq Allocation Flow (DT & MSI converge)",
    "Steps 1-6: both a Device Tree probe and a PCIe MSI request end at a usable virq passed to request_irq()",
    body,
    "Flowchart of virq allocation: a trigger from a Device Tree probe or a PCIe MSI request resolves the parent domain, translates the specifier to a hwirq, allocates a virq and irq_desc, binds the irq_chips, and finishes at request_irq."
  );
}

// Diagram 4: MSI-X multi-vector allocation ----------------------------
function irqDomainMsixSVG() {
  const w = 760, h = 48;
  let body = "";
  // top: PCIe device requesting N vectors
  const devW = 300, devX = 230, devY = 20;
  body += irqBox(devX, devY, devW, h, "PCIe NIC: 4 MSI-X vectors", 1);
  // four vector boxes
  const vecW = 150, vecH = 42, vecY = 110;
  const vecXs = [40, 230, 420, 610 - 40];
  const xs = [30, 215, 400, 585];
  for (let i = 0; i < 4; i++) {
    const x = xs[i];
    body += irqBox(x, vecY, vecW, vecH, "vector " + i + " \u2192 virq", undefined);
    // arrow from device down to each vector
    const sx = devX + devW / 2, sy = devY + h;
    const tx = x + vecW / 2, ty = vecY;
    body +=
      `<line x1="${sx}" y1="${sy}" x2="${tx}" y2="${ty}" stroke="${IRQ_ARROW}" stroke-width="1.8"></line>` +
      `<polygon points="${tx - 5},${ty - 7} ${tx + 5},${ty - 7} ${tx},${ty}" fill="${IRQ_ARROW}"></polygon>`;
  }
  // MSI domain stack note below
  const stackY = 200;
  body += irqBox(230, stackY, devW, h, "MSI domain", 2);
  body += irqBox(230, stackY + h + 24, devW, h, "ITS / IR domain", 3);
  body += irqBox(230, stackY + 2 * (h + 24), devW, h, "GIC / APIC root", 4);
  // connect vectors to MSI domain (single bus line)
  const busY = vecY + vecH + 18;
  body += `<line x1="105" y1="${vecY + vecH}" x2="105" y2="${busY}" stroke="${IRQ_ARROW}" stroke-width="1.6"></line>`;
  body += `<line x1="${585 + vecW / 2}" y1="${vecY + vecH}" x2="${585 + vecW / 2}" y2="${busY}" stroke="${IRQ_ARROW}" stroke-width="1.6"></line>`;
  body += `<line x1="105" y1="${busY}" x2="${585 + vecW / 2}" y2="${busY}" stroke="${IRQ_ARROW}" stroke-width="1.6"></line>`;
  body += irqVArrow(380, busY, stackY);
  // arrows down the stack
  body += irqVArrow(380, stackY + h, stackY + h + 24);
  body += irqVArrow(380, stackY + 2 * h + 24, stackY + 2 * (h + 24));
  const vh = stackY + 2 * (h + 24) + h + 14;
  return irqFrame(
    w, vh,
    "PCIe MSI-X Multi-Vector Allocation",
    "One device (1) owns several vectors, each becoming its own virq; every vector is allocated down the MSI (2) -> remap (3) -> root (4) stack",
    body,
    "PCIe MSI-X multi-vector allocation: a NIC requests four MSI-X vectors, each mapped to its own virq, and every vector is allocated down a stack of the MSI domain, the ITS or interrupt-remap domain, and the GIC or APIC root domain."
  );
}

// Diagram 5: chained vs hierarchical ----------------------------------
function irqDomainChainedSVG() {
  const w = 760, h = 46;
  let body = "";
  // Left column: chained
  const lX = 40, colW = 300;
  body +=
    `<text x="${lX + colW / 2}" y="18" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="13" font-weight="700" fill="#58a6ff">A. Chained (GPIO)</text>`;
  body += irqBox(lX, 30, colW, h, "Parent GIC line", 1);
  body += irqVArrow(lX + colW / 2, 30 + h, 30 + h + 24);
  body += irqBox(lX, 30 + h + 24, colW, h, "demux handler reads status", 2);
  body += irqVArrow(lX + colW / 2, 30 + 2 * h + 24, 30 + 2 * h + 48);
  body += irqBox(lX, 30 + 2 * h + 48, colW, h, "GPIO domain: hwirq\u2192virq", 3);
  body += irqVArrow(lX + colW / 2, 30 + 3 * h + 48, 30 + 3 * h + 72);
  body += irqBox(lX, 30 + 3 * h + 72, colW, h, "line handler runs", 4);
  // Right column: hierarchical
  const rX = 420;
  body +=
    `<text x="${rX + colW / 2}" y="18" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="13" font-weight="700" fill="#58a6ff">B. Hierarchical (MSI)</text>`;
  body += irqBox(rX, 30, colW, h, "Leaf: MSI chip", 1);
  body += irqVArrowUp(rX + colW / 2, 30 + h + 24, 30 + h);
  body += irqBox(rX, 30 + h + 24, colW, h, "Middle: ITS/IR chip", 2);
  body += irqVArrowUp(rX + colW / 2, 30 + 2 * h + 48, 30 + 2 * h + 24);
  body += irqBox(rX, 30 + 2 * h + 48, colW, h, "Root: GIC/APIC chip", 3);
  body += irqVArrowUp(rX + colW / 2, 30 + 3 * h + 72, 30 + 3 * h + 48);
  body += irqBox(rX, 30 + 3 * h + 72, colW, h, "one virq, chip stack", 4);
  const vh = 30 + 3 * h + 72 + h + 16;
  return irqFrame(
    w, vh,
    "Chained vs Hierarchical Handlers",
    "A (left): a GPIO demux dispatches to a separate child domain | B (right): one virq carries a stack of irq_chips, one per layer",
    body,
    "Comparison of two dispatch models. On the left, a chained GPIO handler: the parent GIC line runs a demux that reads status and dispatches to a separate GPIO domain line handler. On the right, a hierarchical MSI stack where one virq carries a stack of irq_chips from leaf MSI to root GIC."
  );
}
