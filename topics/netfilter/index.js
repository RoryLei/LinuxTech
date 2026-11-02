/**
 * Topic: Netfilter, nftables & Network Namespaces
 *
 * The Linux packet-filtering framework: the five netfilter hooks and
 * packet traversal; iptables (tables, chains, targets) and its successor
 * nftables; conntrack and stateful filtering; NAT; network namespaces,
 * veth pairs and bridges (container networking); tc/traffic control; and
 * eBPF/XDP as the modern fast path. Cross-links the XDP topic.
 */

/* Accessible palette (declared BEFORE use so the SVG helpers below are
 * initialized before the topic object literal calls them — avoids a
 * temporal-dead-zone ReferenceError at load time that would blank the site).
 * ONE neutral-blue hue for every box (#cfe3ff fill, #1f2d3d stroke) on a
 * #0d1117 background. Identity is carried by NUMBER badges + position +
 * shape + text, never by hue. accept/drop is shown by text, not colour.
 * Table borders use #30363d. */
const NF_BOX_FILL = "#cfe3ff";
const NF_BOX_STROKE = "#1f2d3d";
const NF_TEXT = "#0f172a";
const NF_NOTE = "#c9d4e0";
const NF_ARROW = "#9db4cc";
const NF_BG = "#0d1117";

/* =====================================================================
 * Accessible inline SVG diagram helpers (prefix nf).
 * =================================================================== */

function nfBox(x, y, w, h, label, badge) {
  const cy = y + h / 2;
  const r = 13;
  let s =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ` +
    `fill="${NF_BOX_FILL}" stroke="${NF_BOX_STROKE}" stroke-width="1.5"></rect>`;
  if (badge !== undefined) {
    s +=
      `<circle cx="${x + r + 4}" cy="${cy}" r="${r}" fill="${NF_BOX_STROKE}"></circle>` +
      `<text x="${x + r + 4}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="13" font-weight="700" fill="#ffffff">${badge}</text>`;
  }
  const tx = badge !== undefined ? x + r + 4 + (w - r - 4) / 2 : x + w / 2;
  s +=
    `<text x="${tx}" y="${cy + 5}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="13" font-weight="600" fill="${NF_TEXT}">${label}</text>`;
  return s;
}

function nfStepBox(x, y, w, h, label, badge) {
  const cy = y + h / 2;
  const r = 13;
  let s =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ` +
    `fill="${NF_BOX_FILL}" stroke="${NF_BOX_STROKE}" stroke-width="1.5"></rect>`;
  if (badge !== undefined) {
    s +=
      `<circle cx="${x + r + 4}" cy="${cy}" r="${r}" fill="${NF_BOX_STROKE}"></circle>` +
      `<text x="${x + r + 4}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
      `font-size="13" font-weight="700" fill="#ffffff">${badge}</text>`;
  }
  s +=
    `<text x="${x + (badge !== undefined ? r + 24 : 14)}" y="${cy + 4}" ` +
    `font-family="sans-serif" font-size="12" fill="${NF_TEXT}">${label}</text>`;
  return s;
}

function nfCaption(cx, y, text) {
  return (
    `<text x="${cx}" y="${y}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="12" fill="${NF_NOTE}">${text}</text>`
  );
}

function nfDiamond(cx, cy, halfW, halfH, label) {
  let s =
    `<polygon points="${cx},${cy - halfH} ${cx + halfW},${cy} ${cx},${cy + halfH} ${cx - halfW},${cy}" ` +
    `fill="${NF_BOX_FILL}" stroke="${NF_BOX_STROKE}" stroke-width="1.5"></polygon>`;
  s +=
    `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-family="sans-serif" ` +
    `font-size="11.5" font-weight="600" fill="${NF_TEXT}">${label}</text>`;
  return s;
}

function nfVArrow(x, y1, y2) {
  return (
    `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${NF_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x - 5},${y2 - 6} ${x + 5},${y2 - 6} ${x},${y2}" fill="${NF_ARROW}"></polygon>`
  );
}

function nfHArrow(x1, y, x2) {
  const dir = x2 >= x1 ? 1 : -1;
  return (
    `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${NF_ARROW}" stroke-width="2"></line>` +
    `<polygon points="${x2 - dir * 7},${y - 5} ${x2 - dir * 7},${y + 5} ${x2},${y}" fill="${NF_ARROW}"></polygon>`
  );
}

function nfLine(x1, y1, x2, y2) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${NF_ARROW}" stroke-width="2"></line>`;
}

function nfFrame(viewW, viewH, title, subtitle, body, ariaLabel) {
  return (
    `<div style="overflow-x:auto; margin:1rem 0; padding:1rem; background:${NF_BG}; ` +
    `border:1px solid #30363d; border-radius:8px;">` +
    `<div style="text-align:center; font-weight:700; font-size:1.05rem; color:#58a6ff; margin-bottom:0.25rem;">${title}</div>` +
    `<div style="text-align:center; font-size:0.85rem; color:#8b949e; margin-bottom:0.75rem;">${subtitle}</div>` +
    `<svg viewBox="0 0 ${viewW} ${viewH}" width="100%" role="img" aria-label="${ariaLabel}">${body}</svg>` +
    `</div>`
  );
}

// Diagram 1: netfilter hooks & packet traversal with a routing-decision diamond.
function nfHooksSVG() {
  const w = 760, h = 44, boxW = 220;
  let body = "";
  const topY = 16;
  // ingress
  body += nfBox(270, topY, boxW, h, "packet arrives (ingress)", 1);
  body += nfVArrow(380, topY + h, topY + h + 20);
  const y2 = topY + h + 20;
  body += nfBox(270, y2, boxW, h, "PREROUTING (raw/mangle/nat: DNAT)", 2);
  body += nfVArrow(380, y2 + h, y2 + h + 20);
  // routing decision diamond
  const diaCy = y2 + h + 20 + 40;
  body += nfDiamond(380, diaCy, 140, 40, "routing: for this host?");
  // local -> left down -> INPUT
  body +=
    `<line x1="240" y1="${diaCy}" x2="150" y2="${diaCy}" stroke="${NF_ARROW}" stroke-width="2"></line>` +
    `<line x1="150" y1="${diaCy}" x2="150" y2="${diaCy + 40}" stroke="${NF_ARROW}" stroke-width="2"></line>` +
    `<polygon points="145,${diaCy + 34} 155,${diaCy + 34} 150,${diaCy + 40}" fill="${NF_ARROW}"></polygon>` +
    `<text x="175" y="${diaCy - 8}" font-family="sans-serif" font-size="11" fill="${NF_NOTE}">local</text>`;
  body += nfBox(60, diaCy + 40, 190, h, "INPUT (filter)", 3);
  body += nfVArrow(155, diaCy + 40 + h, diaCy + 40 + h + 18);
  body += nfBox(60, diaCy + 40 + h + 18, 190, h, "local process", 4);
  // forward -> right down -> FORWARD
  body +=
    `<line x1="520" y1="${diaCy}" x2="620" y2="${diaCy}" stroke="${NF_ARROW}" stroke-width="2"></line>` +
    `<line x1="620" y1="${diaCy}" x2="620" y2="${diaCy + 40}" stroke="${NF_ARROW}" stroke-width="2"></line>` +
    `<polygon points="615,${diaCy + 34} 625,${diaCy + 34} 620,${diaCy + 40}" fill="${NF_ARROW}"></polygon>` +
    `<text x="548" y="${diaCy - 8}" font-family="sans-serif" font-size="11" fill="${NF_NOTE}">forward</text>`;
  body += nfBox(520, diaCy + 40, 190, h, "FORWARD (filter)", 5);
  // both converge to POSTROUTING
  const yPost = diaCy + 40 + h + 18 + 26;
  body += nfBox(270, yPost, boxW, h, "POSTROUTING (nat: SNAT/MASQUERADE)", 6);
  body += nfLine(620, diaCy + 40 + h, 620, yPost + h / 2);
  body += nfHArrow(620, yPost + h / 2, 490);
  // OUTPUT path from local process also reaches POSTROUTING
  body += nfLine(155, diaCy + 40 + h + 18 + h, 155, yPost + h / 2);
  body += nfHArrow(155, yPost + h / 2, 270);
  body += nfCaption(155, diaCy + 40 + h + 18 + h + 16, "locally-generated -> OUTPUT then POSTROUTING");
  body += nfVArrow(380, yPost + h, yPost + h + 18);
  body += nfBox(270, yPost + h + 18, boxW, h, "packet leaves (egress)", 7);
  const vh = yPost + h + 18 + h + 16;
  return nfFrame(
    w, vh,
    "Netfilter Hooks & Packet Traversal",
    "Ingress (1) hits PREROUTING (2); a routing decision sends it to INPUT (3->4) for local delivery or FORWARD (5); all egress passes POSTROUTING (6) before leaving (7)",
    body,
    "Netfilter hook traversal. A packet arrives at ingress and first hits the PREROUTING hook, where raw, mangle and destination NAT run. A routing decision diamond asks whether the packet is destined for this host. If local, it goes through the INPUT hook with filter rules to a local process. If it must be forwarded, it goes through the FORWARD hook. Locally generated traffic enters at OUTPUT. All outbound traffic passes the POSTROUTING hook, where source NAT and masquerade run, before leaving at egress. Decision and outcome are shown by shape, position and text, never by colour."
  );
}

// Diagram 2: container networking — two netns with veth pairs into a bridge, NAT out.
function nfContainerNetSVG() {
  const w = 760, h = 46;
  let body = "";
  const topY = 20;
  // two container netns
  body += nfBox(40, topY, 200, h, "netns A: eth0 (veth)", 1);
  body += nfBox(520, topY, 200, h, "netns B: eth0 (veth)", 2);
  // veth peers down to bridge
  const yBr = topY + h + 70;
  body += nfVArrow(140, topY + h, yBr);
  body += nfVArrow(620, topY + h, yBr);
  body += nfCaption(140, topY + h + 22, "veth pair A");
  body += nfCaption(620, topY + h + 22, "veth pair B");
  body += nfStepBox(170, yBr, 420, h, "host bridge (e.g. docker0) — L2 switch for veth peers", 3);
  // bridge up to host routing + NAT
  const yNat = yBr + h + 40;
  body += nfVArrow(380, yBr + h, yNat);
  body += nfStepBox(170, yNat, 420, h, "host routing + POSTROUTING MASQUERADE (SNAT)", 4);
  const yExt = yNat + h + 36;
  body += nfVArrow(380, yNat + h, yExt);
  body += nfBox(270, yExt, 220, h, "physical NIC -> external network", 5);
  const vh = yExt + h + 16;
  return nfFrame(
    w, vh,
    "Container Networking: netns + veth + bridge + NAT",
    "Each container netns (1,2) has a veth end whose peer plugs into a host bridge (3); the host routes and masquerades (4) traffic out the physical NIC (5)",
    body,
    "Container networking topology. Two container network namespaces, A and B, each hold one end of a veth pair presented as eth0. The peer ends plug into a host bridge such as docker0, which acts as a layer two switch between containers. The bridge connects to the host routing stack, where a POSTROUTING masquerade rule performs source NAT so container traffic appears to come from the host. Traffic then leaves through the physical NIC to the external network. This is the pattern Docker and Kubernetes build programmatically."
  );
}

// Diagram 3: iptables vs nftables structural comparison.
function nfCompareSVG() {
  const w = 760, h = 42;
  let body = "";
  const topY = 16;
  // left column: iptables
  body += nfBox(40, topY, 320, h, "iptables (legacy)", 1);
  const ipItems = [
    "separate tools: iptables / ip6tables / arptables",
    "fixed tables: filter / nat / mangle / raw",
    "built-in chains per table",
    "rules evaluated linearly, one proto per tool",
  ];
  ipItems.forEach((t, i) => {
    body += nfStepBox(40, topY + h + 14 + i * (h + 10), 320, h, t, undefined);
  });
  // right column: nftables
  body += nfBox(400, topY, 320, h, "nftables (nft)", 2);
  const nftItems = [
    "one tool: nft, one framework (nf_tables)",
    "user-defined tables & chains, address families",
    "sets & maps for O(1) lookups",
    "atomic rule replacement; v4+v6 in one rule (inet)",
  ];
  nftItems.forEach((t, i) => {
    body += nfStepBox(400, topY + h + 14 + i * (h + 10), 320, h, t, undefined);
  });
  const vh = topY + h + 14 + 4 * (h + 10) + 16;
  body += nfCaption(380, vh - 6, "Both program the same in-kernel netfilter hooks; iptables-nft is a compat shim over nf_tables");
  return nfFrame(
    w, vh,
    "iptables vs nftables (structure)",
    "iptables (1) uses several tools with fixed tables and linear rules; nftables (2) uses one tool with user-defined tables, sets/maps and atomic updates — both drive the same hooks",
    body,
    "Structural comparison of iptables and nftables. On the left, legacy iptables uses separate tools for IPv4, IPv6 and ARP, a fixed set of tables named filter, nat, mangle and raw, built in chains per table, and linear per protocol rule evaluation. On the right, nftables uses a single nft tool and the nf_tables framework, with user defined tables and chains across address families, sets and maps for constant time lookups, atomic rule replacement, and the ability to match IPv4 and IPv6 in one inet rule. Both ultimately program the same in kernel netfilter hooks, and iptables-nft is a compatibility shim built on nf_tables."
  );
}

const TOPIC_NETFILTER = {
  "id": "netfilter",
  "category": "networking",
  "icon": "🛂",
  "title": "Netfilter, nftables & Network Namespaces",
  "description": "The Linux packet-filtering and NAT framework: the five netfilter hooks and packet traversal, iptables (tables, chains, targets) and its nftables successor, connection tracking (conntrack) and stateful filtering, SNAT/DNAT/masquerade, network namespaces with veth pairs and bridges (how Docker/Kubernetes build container networking), tc traffic control, and eBPF/XDP as the modern fast path — with accessible diagrams.",
  "keywords": [
    "netfilter", "nftables", "nft", "iptables", "ip6tables", "firewall",
    "hooks", "prerouting", "input", "forward", "output", "postrouting",
    "table", "chain", "target", "accept", "drop", "reject", "filter table",
    "nat table", "mangle", "raw", "dnat", "snat", "masquerade",
    "conntrack", "connection tracking", "stateful", "nat", "address family",
    "inet", "sets", "maps", "network namespace", "netns", "veth",
    "veth pair", "bridge", "docker0", "container networking", "kubernetes",
    "tc", "traffic control", "qdisc", "shaping", "ebpf", "xdp",
    "ip netns", "ip link"
  ],
  "sections": [
    {
      "title": "1. The netfilter framework & the five hooks",
      "content": `<p><strong>Netfilter</strong> is the in-kernel framework that lets code inspect, modify, redirect and drop packets as they pass through the network stack. Everything else in this topic — iptables, nftables, NAT, conntrack, container networking — is built on it. Netfilter exposes <strong>five hook points</strong> in the IPv4/IPv6 path where callbacks can run:</p>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Hook</th><th style="text-align:left; padding:0.5rem;">Fires when</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>PREROUTING</strong></td><td style="padding:0.5rem;">A packet arrives, before the routing decision (DNAT here)</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>INPUT</strong></td><td style="padding:0.5rem;">A packet is destined for this host</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>FORWARD</strong></td><td style="padding:0.5rem;">A packet is routed through this host to another</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>OUTPUT</strong></td><td style="padding:0.5rem;">A locally-generated packet is leaving</td></tr>
<tr><td style="padding:0.5rem;"><strong>POSTROUTING</strong></td><td style="padding:0.5rem;">Just before a packet leaves (SNAT/masquerade here)</td></tr>
</table>
${nfHooksSVG()}
<p>The <em>routing decision</em> between PREROUTING and the INPUT/FORWARD split is what determines a packet's path — understanding it is the key to reasoning about any firewall rule.</p>`
    },
    {
      "title": "2. iptables: tables, chains & targets",
      "content": `<p><strong>iptables</strong> was for two decades the standard front-end to netfilter. It organises rules into <strong>tables</strong>, each holding <strong>chains</strong> attached to the hooks, each chain a list of rules with a match and a <strong>target</strong>.</p>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Table</th><th style="text-align:left; padding:0.5rem;">Purpose</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>filter</code></td><td style="padding:0.5rem;">Accept/drop/reject decisions (the firewall proper)</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>nat</code></td><td style="padding:0.5rem;">Address/port translation (DNAT, SNAT, MASQUERADE)</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><code>mangle</code></td><td style="padding:0.5rem;">Packet header modification (TOS, TTL, marks)</td></tr>
<tr><td style="padding:0.5rem;"><code>raw</code></td><td style="padding:0.5rem;">Exemptions from connection tracking</td></tr></table>
<p>Common <strong>targets</strong>: <code>ACCEPT</code>, <code>DROP</code> (silently discard), <code>REJECT</code> (discard with an error), <code>DNAT</code>/<code>SNAT</code>/<code>MASQUERADE</code> (translate). Rules in a chain are evaluated top to bottom until one matches with a terminating target.</p>
<pre><code>iptables -L -n -v              # list filter-table rules with counters
iptables -t nat -L -n -v       # list NAT-table rules
iptables -A INPUT -p tcp --dport 22 -j ACCEPT</code></pre>`
    },
    {
      "title": "3. nftables: the successor",
      "content": `<p><strong>nftables</strong> (the <code>nft</code> tool over the <code>nf_tables</code> kernel subsystem) replaced iptables as the default on modern distributions. It keeps the same hooks but modernises the user model.</p>
${nfCompareSVG()}
<h4>Why nft replaced iptables</h4>
<ul>
<li><strong>One framework, one tool.</strong> <code>nft</code> handles IPv4, IPv6, ARP and bridge via <em>address families</em> (notably <code>inet</code> for dual-stack rules), instead of four separate legacy tools.</li>
<li><strong>Sets and maps.</strong> Native data structures give constant-time lookups (match thousands of IPs/ports in one rule) instead of long linear chains.</li>
<li><strong>Atomic replacement.</strong> A whole ruleset is loaded transactionally — no window of half-applied rules.</li>
<li><strong>User-defined tables and chains.</strong> No fixed table set; you build exactly the structure you need.</li>
</ul>
<p>For compatibility, <code>iptables-nft</code> presents the old syntax but programs <code>nf_tables</code> underneath, so legacy scripts keep working during migration.</p>
<pre><code>nft list ruleset               # dump the entire active nft ruleset
nft add table inet myfw
nft add chain inet myfw input '{ type filter hook input priority 0; }'
nft add rule inet myfw input tcp dport { 22, 80, 443 } accept</code></pre>`
    },
    {
      "title": "4. Connection tracking (conntrack) & stateful filtering",
      "content": `<p>A stateless firewall judges each packet in isolation. <strong>Connection tracking (conntrack)</strong> lets netfilter remember <em>flows</em>: it records each connection's state (NEW, ESTABLISHED, RELATED, INVALID) so rules can say "allow replies to connections we initiated" without opening every port.</p>
<p>This is what makes a practical firewall concise: one rule accepts ESTABLISHED/RELATED traffic, and the rest of the policy only has to decide about NEW connections. Conntrack is also the foundation of NAT (next section), because translating a flow requires remembering it in both directions.</p>
<pre><code>conntrack -L                   # list tracked connections
conntrack -S                   # per-CPU conntrack statistics
# nft stateful accept:
nft add rule inet myfw input ct state established,related accept
nft add rule inet myfw input ct state invalid drop</code></pre>`
    },
    {
      "title": "5. NAT: SNAT, DNAT & masquerade",
      "content": `<p><strong>Network Address Translation (NAT)</strong> rewrites addresses/ports as packets traverse a router, tracked statefully by conntrack so the reverse translation happens automatically.</p>
<table style="width:100%; border-collapse:collapse; margin:1rem 0;"><tr style="border-bottom:1px solid #30363d;"><th style="text-align:left; padding:0.5rem;">Kind</th><th style="text-align:left; padding:0.5rem;">Rewrites</th><th style="text-align:left; padding:0.5rem;">Hook / use</th></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>SNAT</strong></td><td style="padding:0.5rem;">Source address (to a fixed IP)</td><td style="padding:0.5rem;">POSTROUTING, static egress IP</td></tr>
<tr style="border-bottom:1px solid #30363d;"><td style="padding:0.5rem;"><strong>MASQUERADE</strong></td><td style="padding:0.5rem;">Source address (to the outgoing interface's IP)</td><td style="padding:0.5rem;">POSTROUTING, dynamic/DHCP uplinks</td></tr>
<tr><td style="padding:0.5rem;"><strong>DNAT</strong></td><td style="padding:0.5rem;">Destination address/port</td><td style="padding:0.5rem;">PREROUTING, port-forwarding / load-balancing</td></tr></table>
<p>MASQUERADE is the everyday "share one public IP" mechanism on home routers and the exact rule container runtimes add to give containers outbound Internet access (section 6).</p>
<pre><code>nft add rule ip myfw postrouting oifname "eth0" masquerade
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE</code></pre>`
    },
    {
      "title": "6. Network namespaces, veth & bridges",
      "content": `<p>A <strong>network namespace (netns)</strong> is an isolated copy of the entire network stack — its own interfaces, routes, firewall rules and sockets (see the <em>Linux Security</em> topic for namespaces generally). Container networking is built from three primitives:</p>
<ul>
<li><strong>netns</strong> — each container gets its own.</li>
<li><strong>veth pair</strong> — a virtual Ethernet "cable" with two ends; one end lives in the container's netns, the other on the host.</li>
<li><strong>bridge</strong> — a software L2 switch on the host (e.g. <code>docker0</code>) into which the host-side veth ends plug.</li>
</ul>
${nfContainerNetSVG()}
<p>Put together: each container's traffic goes container eth0 → veth → host bridge → host routing, and a <strong>POSTROUTING MASQUERADE</strong> rule gives it outbound access; <strong>DNAT</strong> rules publish container ports. This is precisely what Docker and Kubernetes assemble programmatically — there is no magic, just netns + veth + bridge + netfilter rules.</p>
<pre><code>ip netns add demo
ip link add veth0 type veth peer name veth0-c
ip link set veth0-c netns demo
ip netns exec demo ip addr add 10.0.0.2/24 dev veth0-c</code></pre>`
    },
    {
      "title": "7. Traffic control (tc) & QoS",
      "content": `<p>Netfilter decides <em>whether</em> a packet passes; <strong>traffic control (tc)</strong> decides <em>when and how fast</em>. The <code>tc</code> subsystem attaches <strong>queueing disciplines (qdiscs)</strong> to interfaces to shape, prioritise, police and schedule traffic — rate-limiting a container, prioritising latency-sensitive flows, or smoothing bursts.</p>
<p>This topic only introduces tc; the key idea is the division of labour: netfilter/nftables for policy and NAT, tc for bandwidth and scheduling. Modern qdiscs like <code>fq_codel</code> and <code>cake</code> fight bufferbloat by default on many distributions.</p>
<pre><code>tc qdisc show dev eth0
tc qdisc add dev eth0 root tbf rate 100mbit burst 32kbit latency 400ms</code></pre>`
    },
    {
      "title": "8. eBPF / XDP: the modern fast path",
      "content": `<p>For the highest packet rates, running rules through the full netfilter path is too slow. <strong>XDP (eXpress Data Path)</strong> runs an eBPF program at the earliest possible point — in the NIC driver, before an <code>skb</code> is even allocated — to drop, redirect or pass packets at line rate. It is the basis of high-performance firewalls, DDoS scrubbers and load balancers, and projects like Cilium implement Kubernetes networking policy in eBPF instead of iptables.</p>
<p>The full treatment of XDP and the eBPF data path is in the dedicated <em>XDP</em> topic; the relationship to remember is: netfilter/nftables is the general, stateful, feature-rich framework, while XDP/eBPF is the programmable fast path you reach for when raw throughput dominates. The two coexist and are often combined.</p>
<h4>References & further reading</h4>
<ul>
<li><a href="https://wiki.nftables.org/" target="_blank">nftables wiki (official documentation)</a></li>
<li><a href="https://www.netfilter.org/" target="_blank">The netfilter.org project</a></li>
<li><a href="https://docs.kernel.org/networking/index.html" target="_blank">Kernel docs — Networking</a></li>
<li><a href="https://www.kernel.org/doc/man-pages/" target="_blank">man-pages: <code>nft(8)</code>, <code>iptables(8)</code>, <code>conntrack(8)</code>, <code>ip-netns(8)</code>, <code>tc(8)</code></a></li>
</ul>`
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) { module.exports = TOPIC_NETFILTER; }
