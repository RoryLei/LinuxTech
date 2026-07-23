/**
 * Linux Tech - Topic Data
 * Each topic defines its card info and learning content sections.
 */
const TOPICS = [
  {
    id: 'filesystem',
    icon: '📁',
    title: 'File System',
    description: 'Understand the Linux directory structure, file types, and mount mechanisms',
    sections: [
      {
        title: 'Directory Structure Overview',
        content: `
          <p>Linux uses a tree-based directory structure. Everything starts from the root <code>/</code>:</p>
          <ul>
            <li><code>/bin</code> — Essential user commands</li>
            <li><code>/etc</code> — System configuration files</li>
            <li><code>/home</code> — User home directories</li>
            <li><code>/var</code> — Variable data (logs, caches)</li>
            <li><code>/tmp</code> — Temporary files</li>
            <li><code>/usr</code> — User programs and libraries</li>
            <li><code>/dev</code> — Device files</li>
            <li><code>/proc</code> — Virtual filesystem (process info)</li>
          </ul>
        `
      },
      {
        title: 'Common Commands',
        content: `
          <pre><code># List files (including hidden)
ls -la

# Check disk usage
df -h

# Check directory size
du -sh /var/log

# Search for files
find / -name "*.conf" -type f

# Mount a device
mount /dev/sdb1 /mnt/usb</code></pre>
        `
      },
      {
        title: 'File Permissions',
        content: `
          <p>Each file has three permission groups: owner, group, and others.</p>
          <pre><code># Change permissions
chmod 755 script.sh

# Change ownership
chown user:group file.txt

# Permission number mapping
# r=4, w=2, x=1
# 755 = rwxr-xr-x</code></pre>
        `
      }
    ]
  },
  {
    id: 'networking',
    icon: '🌐',
    title: 'Network Management',
    description: 'Master IP configuration, firewall rules, and network debugging tools',
    sections: [
      {
        title: 'Network Interface Configuration',
        content: `
          <pre><code># Show network interfaces
ip addr show

# Set IP address
ip addr add 192.168.1.100/24 dev eth0

# Enable/disable interface
ip link set eth0 up
ip link set eth0 down

# Show routing table
ip route show</code></pre>
        `
      },
      {
        title: 'Network Debugging Tools',
        content: `
          <ul>
            <li><code>ping</code> — Test host connectivity</li>
            <li><code>traceroute</code> — Trace packet path</li>
            <li><code>netstat / ss</code> — View connections and port status</li>
            <li><code>dig / nslookup</code> — DNS lookup</li>
            <li><code>curl / wget</code> — HTTP request tools</li>
            <li><code>tcpdump</code> — Packet capture and analysis</li>
          </ul>
          <pre><code># Show all listening ports
ss -tlnp

# DNS lookup
dig example.com

# Capture packets
tcpdump -i eth0 port 80</code></pre>
        `
      },
      {
        title: 'Firewall (iptables / nftables)',
        content: `
          <pre><code># List rules
iptables -L -n

# Allow SSH
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Block a specific IP
iptables -A INPUT -s 10.0.0.5 -j DROP

# Using ufw (simplified firewall)
ufw allow 80/tcp
ufw enable</code></pre>
        `
      }
    ]
  },
  {
    id: 'process',
    icon: '⚙️',
    title: 'Process Management',
    description: 'Learn how to monitor, control, and schedule system processes',
    sections: [
      {
        title: 'Process Monitoring',
        content: `
          <pre><code># Real-time system monitor
top
htop

# List all processes
ps aux

# View process tree
pstree

# Search for a specific process
pgrep -a nginx</code></pre>
        `
      },
      {
        title: 'Process Control',
        content: `
          <pre><code># Send signals
kill -15 PID      # Graceful termination (SIGTERM)
kill -9 PID       # Force kill (SIGKILL)
killall nginx     # Kill all processes with same name

# Background execution
command &
nohup command &   # Survives terminal close

# Foreground/background switching
Ctrl+Z            # Suspend
bg                # Send to background
fg                # Bring to foreground
jobs              # List jobs</code></pre>
        `
      },
      {
        title: 'Scheduled Jobs (Cron)',
        content: `
          <pre><code># Edit crontab
crontab -e

# Format: min hour day month weekday command
# Run backup daily at 2 AM
0 2 * * * /usr/local/bin/backup.sh

# Run every 5 minutes
*/5 * * * * /scripts/health-check.sh

# List current schedules
crontab -l</code></pre>
        `
      }
    ]
  },
  {
    id: 'shell',
    icon: '💻',
    title: 'Shell Scripting',
    description: 'Write automation scripts to boost productivity',
    sections: [
      {
        title: 'Basic Syntax',
        content: `
          <pre><code>#!/bin/bash
# Variables
NAME="Linux"
echo "Hello, $NAME"

# Conditionals
if [ -f "/etc/passwd" ]; then
  echo "File exists"
fi

# Loops
for i in {1..5}; do
  echo "Iteration $i"
done

# Functions
greet() {
  echo "Hi, $1!"
}
greet "World"</code></pre>
        `
      },
      {
        title: 'Practical Tips',
        content: `
          <pre><code># Pipes and redirection
cat access.log | grep "404" | wc -l
command > output.txt 2>&1

# String manipulation
filename="report_2026.tar.gz"
echo "\${filename%.tar.gz}"  # report_2026
echo "\${filename##*.}"       # gz

# Arrays
arr=("apple" "banana" "cherry")
echo "\${arr[1]}"    # banana
echo "\${#arr[@]}"   # 3

# Read user input
read -p "Enter name: " username
echo "Hello, $username"</code></pre>
        `
      },
      {
        title: 'Error Handling',
        content: `
          <pre><code>#!/bin/bash
set -euo pipefail

# set -e  : Exit immediately on error
# set -u  : Error on undefined variables
# set -o pipefail : Pipeline fails if any command fails

trap 'echo "Error on line $LINENO"; exit 1' ERR

# Check if a command exists
if ! command -v docker &> /dev/null; then
  echo "Docker is not installed"
  exit 1
fi</code></pre>
        `
      }
    ]
  },
  {
    id: 'packages',
    icon: '📦',
    title: 'Package Management',
    description: 'Manage software packages using apt, yum, dnf, and more',
    sections: [
      {
        title: 'Debian / Ubuntu (apt)',
        content: `
          <pre><code># Update package list
sudo apt update

# Upgrade installed packages
sudo apt upgrade

# Install a package
sudo apt install nginx

# Remove a package
sudo apt remove nginx
sudo apt purge nginx    # Also remove config files

# Search packages
apt search keyword

# List installed packages
dpkg -l | grep nginx</code></pre>
        `
      },
      {
        title: 'RHEL / CentOS / Fedora (dnf/yum)',
        content: `
          <pre><code># Install a package
sudo dnf install httpd

# Remove a package
sudo dnf remove httpd

# Search packages
dnf search keyword

# List installed
dnf list installed

# Show package info
dnf info nginx</code></pre>
        `
      },
      {
        title: 'Snap & Flatpak',
        content: `
          <pre><code># Snap
sudo snap install code --classic
snap list
sudo snap remove code

# Flatpak
flatpak install flathub org.gimp.GIMP
flatpak list
flatpak uninstall org.gimp.GIMP</code></pre>
        `
      }
    ]
  },
  {
    id: 'users',
    icon: '👥',
    title: 'Users & Permissions',
    description: 'Manage accounts, groups, and sudo configuration',
    sections: [
      {
        title: 'User Management',
        content: `
          <pre><code># Add a user
sudo useradd -m -s /bin/bash username
sudo passwd username

# Delete a user
sudo userdel -r username

# Modify a user
sudo usermod -aG docker username  # Add to group
sudo usermod -s /bin/zsh username # Change shell

# View user info
id username
whoami</code></pre>
        `
      },
      {
        title: 'Group Management',
        content: `
          <pre><code># Add a group
sudo groupadd developers

# Add user to group
sudo usermod -aG developers username

# View group members
getent group developers

# Delete a group
sudo groupdel developers</code></pre>
        `
      },
      {
        title: 'sudo Configuration',
        content: `
          <p>Control which users can run admin commands via <code>/etc/sudoers</code>:</p>
          <pre><code># Edit sudoers (always use visudo)
sudo visudo

# Allow user to run all commands
username ALL=(ALL:ALL) ALL

# Allow group passwordless execution
%developers ALL=(ALL) NOPASSWD: ALL

# Restrict to specific commands
username ALL=(ALL) /usr/bin/systemctl restart nginx</code></pre>
        `
      }
    ]
  },
  {
    id: 'systemd',
    icon: '🔧',
    title: 'Systemd & Services',
    description: 'Manage system services, boot targets, and log queries',
    sections: [
      {
        title: 'Service Management',
        content: `
          <pre><code># Start/stop/restart a service
sudo systemctl start nginx
sudo systemctl stop nginx
sudo systemctl restart nginx
sudo systemctl reload nginx

# Enable/disable at boot
sudo systemctl enable nginx
sudo systemctl disable nginx

# Check service status
systemctl status nginx

# List all services
systemctl list-units --type=service</code></pre>
        `
      },
      {
        title: 'Custom Services',
        content: `
          <p>Create a unit file in <code>/etc/systemd/system/</code>:</p>
          <pre><code>[Unit]
Description=My Application
After=network.target

[Service]
Type=simple
User=appuser
WorkingDirectory=/opt/myapp
ExecStart=/opt/myapp/start.sh
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target</code></pre>
          <pre><code># Reload configuration
sudo systemctl daemon-reload

# Start custom service
sudo systemctl enable --now myapp.service</code></pre>
        `
      },
      {
        title: 'Log Queries (journalctl)',
        content: `
          <pre><code># View logs for a specific service
journalctl -u nginx

# Follow in real-time
journalctl -u nginx -f

# View last hour
journalctl --since "1 hour ago"

# View boot logs
journalctl -b

# Filter by priority
journalctl -p err</code></pre>
        `
      }
    ]
  },
  {
    id: 'docker',
    icon: '🐳',
    title: 'Docker Containers',
    description: 'Learn containerized deployment, image management, and Compose orchestration',
    sections: [
      {
        title: 'Basic Operations',
        content: `
          <pre><code># Pull an image
docker pull nginx:latest

# Run a container
docker run -d -p 8080:80 --name web nginx

# List running containers
docker ps

# Stop/remove a container
docker stop web
docker rm web

# View logs
docker logs -f web

# Enter a container
docker exec -it web bash</code></pre>
        `
      },
      {
        title: 'Dockerfile',
        content: `
          <pre><code>FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

EXPOSE 3000

USER node
CMD ["node", "server.js"]</code></pre>
          <pre><code># Build image
docker build -t myapp:1.0 .

# Push to registry
docker tag myapp:1.0 registry.example.com/myapp:1.0
docker push registry.example.com/myapp:1.0</code></pre>
        `
      },
      {
        title: 'Docker Compose',
        content: `
          <pre><code># docker-compose.yml
version: "3.9"
services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DB_HOST=db
    depends_on:
      - db

  db:
    image: postgres:16
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD=secret

volumes:
  pgdata:</code></pre>
          <pre><code># Start
docker compose up -d

# Check status
docker compose ps

# Stop and remove
docker compose down</code></pre>
        `
      }
    ]
  },
  {
    id: 'ebpf',
    icon: '🔬',
    title: 'eBPF',
    description: 'Learn eBPF — safely run custom programs in the kernel for observability, networking, and security',
    sections: [
      {
        title: '1. What is eBPF?',
        content: `
          <p><strong>eBPF (extended Berkeley Packet Filter)</strong> is a Linux kernel technology that allows running user-defined sandboxed programs in the kernel without modifying kernel source code or loading kernel modules.</p>
          <p>Originally derived from packet filtering (BPF), it now extends far beyond networking into:</p>
          <ul>
            <li><strong>Observability</strong> — Trace syscalls, function latency, I/O behavior</li>
            <li><strong>Networking</strong> — High-speed packet processing, load balancing (e.g., Cilium)</li>
            <li><strong>Security</strong> — Runtime policy enforcement, anomaly detection (e.g., Falco, Tetragon)</li>
            <li><strong>Profiling</strong> — CPU flamegraphs, memory tracing</li>
          </ul>
          <p>Reference: <a href="https://ebpf.io/" target="_blank">ebpf.io</a></p>
        `
      },
      {
        title: '2. Core Architecture & Principles',
        content: `
          <p>Lifecycle of an eBPF program:</p>
          <ol>
            <li><strong>Write</strong> — Author the eBPF program in restricted C</li>
            <li><strong>Compile</strong> — Compile to eBPF bytecode via Clang/LLVM</li>
            <li><strong>Verify</strong> — Kernel verifier ensures safety (no infinite loops, no out-of-bounds access, 512-byte stack limit)</li>
            <li><strong>JIT Compile</strong> — Bytecode JIT-compiled to native machine code for near-zero overhead</li>
            <li><strong>Attach</strong> — Attach to a designated hook point for execution</li>
          </ol>
          <h4>Hook Types</h4>
          <ul>
            <li><code>kprobe / kretprobe</code> — Kernel function entry/return</li>
            <li><code>tracepoint</code> — Kernel static tracing points</li>
            <li><code>uprobe / uretprobe</code> — Userspace function tracing</li>
            <li><code>XDP (eXpress Data Path)</code> — Earliest packet processing at NIC driver level</li>
            <li><code>TC (Traffic Control)</code> — Network traffic control layer</li>
            <li><code>perf_event</code> — Hardware/software performance events</li>
            <li><code>LSM (Linux Security Modules)</code> — Security policy hooks</li>
          </ul>
          <h4>Maps (Data Structures)</h4>
          <p>eBPF Maps are shared data structures between kernel and userspace:</p>
          <pre><code>Common Map types:
BPF_MAP_TYPE_HASH         — Hash table
BPF_MAP_TYPE_ARRAY        — Array
BPF_MAP_TYPE_PERF_EVENT_ARRAY — Event buffer
BPF_MAP_TYPE_RINGBUF      — High-performance ring buffer
BPF_MAP_TYPE_LRU_HASH     — LRU-eviction hash table</code></pre>
        `
      },
      {
        title: '3. Development Environment Setup',
        content: `
          <p>Install the required tools for your distribution:</p>
          <pre><code># === Ubuntu / Debian ===
sudo apt update
sudo apt install -y \\
  bpfcc-tools libbpfcc-dev \\
  linux-headers-$(uname -r) \\
  bpftrace \\
  clang llvm \\
  libbpf-dev \\
  python3-bpfcc

# === RHEL / Fedora ===
sudo dnf install -y \\
  bcc bcc-tools bcc-devel \\
  kernel-devel \\
  bpftrace \\
  clang llvm \\
  libbpf-devel

# === Verify installation ===
# Ensure kernel version >= 4.15 (5.8+ recommended)
uname -r

# Test bpftrace
sudo bpftrace -e 'BEGIN { printf("eBPF works!\\n"); exit(); }'</code></pre>
          <p><strong>Kernel version recommendations:</strong></p>
          <ul>
            <li>4.15+ — Basic eBPF support</li>
            <li>5.3+ — BPF trampolines, bounded loops</li>
            <li>5.8+ — ringbuf, full CO-RE BTF support</li>
            <li>5.15+ — Full BTF for modules</li>
          </ul>
        `
      },
      {
        title: '4. BCC Tools in Practice',
        content: `
          <p><a href="https://github.com/iovisor/bcc" target="_blank">BCC (BPF Compiler Collection)</a> provides many ready-to-use tracing tools:</p>
          <pre><code># Trace process execution
sudo execsnoop-bpfcc

# Trace TCP connections
sudo tcpconnect-bpfcc

# Trace file opens
sudo opensnoop-bpfcc

# Trace block I/O latency
sudo biolatency-bpfcc

# Trace high-latency syscalls
sudo syscount-bpfcc -L

# Trace DNS lookups
sudo gethostlatency-bpfcc

# Profile CPU functions (generate flamegraph data)
sudo profile-bpfcc -F 99 -p PID 10</code></pre>
          <p><strong>bpftrace — One-liner tracing tool:</strong></p>
          <pre><code># Count syscalls by process
sudo bpftrace -e 'tracepoint:raw_syscalls:sys_enter { @[comm] = count(); }'

# Trace open() syscall file names
sudo bpftrace -e 'tracepoint:syscalls:sys_enter_openat { printf("%s %s\\n", comm, str(args->filename)); }'

# Histogram of VFS read sizes
sudo bpftrace -e 'kprobe:vfs_read { @bytes = hist(arg2); }'

# Trace process scheduling wakeups
sudo bpftrace -e 'tracepoint:sched:sched_wakeup { @[comm] = count(); }'</code></pre>
        `
      },
      {
        title: '5. Writing Your First BCC Python Program',
        content: `
          <p>BCC provides a Python frontend for quickly writing custom eBPF programs:</p>
          <pre><code>#!/usr/bin/env python3
# hello_ebpf.py — Trace clone() syscall (new process creation)
from bcc import BPF

# eBPF program (C language)
bpf_program = """
int hello_world(void *ctx) {
    bpf_trace_printk("Hello eBPF! New process created\\\\n");
    return 0;
}
"""

# Load and attach to clone syscall
b = BPF(text=bpf_program)
b.attach_kprobe(event=b.get_syscall_fnname("clone"), fn_name="hello_world")

print("Tracing new processes... Ctrl+C to exit")
b.trace_print()</code></pre>

          <p><strong>Advanced example — Measuring syscall latency:</strong></p>
          <pre><code>#!/usr/bin/env python3
# syscall_latency.py — Measure read() syscall latency
from bcc import BPF
import time

bpf_program = """
#include &lt;uapi/linux/ptrace.h&gt;

BPF_HASH(start, u32);
BPF_HISTOGRAM(dist);

TRACEPOINT_PROBE(syscalls, sys_enter_read) {
    u32 pid = bpf_get_current_pid_tgid() >> 32;
    u64 ts = bpf_ktime_get_ns();
    start.update(&pid, &ts);
    return 0;
}

TRACEPOINT_PROBE(syscalls, sys_exit_read) {
    u32 pid = bpf_get_current_pid_tgid() >> 32;
    u64 *tsp = start.lookup(&pid);
    if (tsp != 0) {
        u64 delta = bpf_ktime_get_ns() - *tsp;
        dist.log2l(delta / 1000);  // microseconds
        start.delete(&pid);
    }
    return 0;
}
"""

b = BPF(text=bpf_program)
print("Measuring read() latency... Ctrl+C for results")

try:
    time.sleep(10)
except KeyboardInterrupt:
    pass

print("\\nread() latency (microseconds):")
b["dist"].print_log2_hist("usecs")</code></pre>
          <pre><code># Run
sudo python3 hello_ebpf.py
sudo python3 syscall_latency.py</code></pre>
        `
      },
      {
        title: '6. libbpf + CO-RE Advanced Development',
        content: `
          <p>BCC is great for prototyping, but production environments should use <strong>libbpf + CO-RE</strong>:</p>
          <table style="width:100%; border-collapse:collapse; margin:1rem 0;">
            <tr style="border-bottom:1px solid #30363d;">
              <th style="text-align:left; padding:0.5rem;">Feature</th>
              <th style="text-align:left; padding:0.5rem;">BCC</th>
              <th style="text-align:left; padding:0.5rem;">libbpf + CO-RE</th>
            </tr>
            <tr style="border-bottom:1px solid #30363d;">
              <td style="padding:0.5rem;">Compilation</td>
              <td style="padding:0.5rem;">At runtime (needs Clang/LLVM)</td>
              <td style="padding:0.5rem;">Once at build time</td>
            </tr>
            <tr style="border-bottom:1px solid #30363d;">
              <td style="padding:0.5rem;">Target machine deps</td>
              <td style="padding:0.5rem;">Needs kernel headers</td>
              <td style="padding:0.5rem;">Only BTF info needed</td>
            </tr>
            <tr style="border-bottom:1px solid #30363d;">
              <td style="padding:0.5rem;">Startup speed</td>
              <td style="padding:0.5rem;">Slow (compilation)</td>
              <td style="padding:0.5rem;">Fast (pre-compiled bytecode)</td>
            </tr>
            <tr style="border-bottom:1px solid #30363d;">
              <td style="padding:0.5rem;">Resource usage</td>
              <td style="padding:0.5rem;">High (Clang ~100MB)</td>
              <td style="padding:0.5rem;">Low (~KB level)</td>
            </tr>
            <tr>
              <td style="padding:0.5rem;">Use case</td>
              <td style="padding:0.5rem;">Prototyping, one-off debugging</td>
              <td style="padding:0.5rem;">Production tools</td>
            </tr>
          </table>
          <p><strong>CO-RE (Compile Once, Run Everywhere)</strong> uses BTF (BPF Type Format) to automatically adjust struct offsets at load time, so the same binary runs on different kernel versions.</p>
          <pre><code># Verify kernel supports BTF
ls /sys/kernel/btf/vmlinux

# libbpf project structure
my-ebpf-tool/
├── src/
│   ├── tool.bpf.c      # eBPF kernel program
│   ├── tool.c           # Userspace program
│   └── tool.h           # Shared type definitions
├── Makefile
└── vmlinux.h            # Generated by bpftool</code></pre>
          <pre><code># Generate vmlinux.h (contains all kernel types)
bpftool btf dump file /sys/kernel/btf/vmlinux format c > vmlinux.h

# Compile eBPF program
clang -O2 -target bpf -g -c tool.bpf.c -o tool.bpf.o

# Generate skeleton header
bpftool gen skeleton tool.bpf.o > tool.skel.h</code></pre>
        `
      },
      {
        title: '7. Real-World Applications',
        content: `
          <h4>🌐 Networking — XDP High-Speed Packet Processing</h4>
          <pre><code>// xdp_drop_icmp.bpf.c — Drop all ICMP packets
#include "vmlinux.h"
#include &lt;bpf/bpf_helpers.h&gt;

SEC("xdp")
int xdp_drop_icmp(struct xdp_md *ctx) {
    void *data = (void *)(long)ctx->data;
    void *data_end = (void *)(long)ctx->data_end;

    struct ethhdr *eth = data;
    if ((void *)(eth + 1) > data_end)
        return XDP_PASS;

    if (eth->h_proto != __constant_htons(ETH_P_IP))
        return XDP_PASS;

    struct iphdr *ip = (void *)(eth + 1);
    if ((void *)(ip + 1) > data_end)
        return XDP_PASS;

    if (ip->protocol == IPPROTO_ICMP)
        return XDP_DROP;

    return XDP_PASS;
}</code></pre>

          <h4>🔒 Security — Detecting Suspicious Behavior</h4>
          <p>Use eBPF to monitor sensitive file access, privilege escalation, etc. Related projects:</p>
          <ul>
            <li><strong>Falco</strong> — Runtime threat detection</li>
            <li><strong>Tetragon</strong> — Cilium's security observability engine</li>
            <li><strong>Tracee</strong> — Container security tracing</li>
          </ul>

          <h4>📊 Performance Analysis — Full System Diagnostics</h4>
          <pre><code># CPU flamegraph
sudo profile-bpfcc -F 99 30 > profile.out
# Use with flamegraph.pl to generate SVG

# I/O latency heatmap
sudo biolatency-bpfcc -m

# Memory leak tracing
sudo memleak-bpfcc -p PID

# TCP retransmission tracing
sudo tcpretrans-bpfcc

# Filesystem latency
sudo ext4slower-bpfcc 1</code></pre>

          <h4>📚 Recommended Learning Path</h4>
          <ol>
            <li>Start with <code>bpftrace</code> one-liners to build intuition</li>
            <li>Use BCC ready-made tools to diagnose real problems</li>
            <li>Write custom tracing tools with BCC Python</li>
            <li>Learn libbpf + CO-RE for production-grade tools</li>
            <li>Specialize in a domain (XDP networking, LSM security)</li>
          </ol>
          <p><strong>Recommended Reading:</strong></p>
          <ul>
            <li><a href="https://ebpf.io/" target="_blank">ebpf.io</a> — Official portal</li>
            <li><a href="https://github.com/iovisor/bcc" target="_blank">iovisor/bcc</a> — BCC toolkit</li>
            <li>Brendan Gregg, <em>BPF Performance Tools</em></li>
            <li>Liz Rice, <em>Learning eBPF</em></li>
          </ul>
        `
      }
    ]
  },
  {
    id: 'pcie',
    icon: '🔌',
    title: 'PCIe (PCI Express)',
    description: 'Understand PCIe architecture, configuration space, Linux subsystem tools, and AER error handling',
    sections: [
      {
        title: '1. What is PCIe?',
        content: `
          <p><strong>PCI Express (PCIe)</strong> is a high-speed serial interconnect standard that replaced legacy parallel PCI/PCI-X buses. It connects CPUs to peripheral devices such as GPUs, NVMe SSDs, NICs, and HBAs.</p>
          <h4>Key Characteristics</h4>
          <ul>
            <li><strong>Serial point-to-point</strong> — Each device has a dedicated link (no shared bus)</li>
            <li><strong>Lane-based scaling</strong> — x1, x2, x4, x8, x16 lanes for bandwidth scaling</li>
            <li><strong>Packet-based protocol</strong> — Data transmitted as Transaction Layer Packets (TLPs)</li>
            <li><strong>Hot-plug capable</strong> — Devices can be added/removed at runtime</li>
          </ul>
          <h4>PCIe Generations</h4>
          <table style="width:100%; border-collapse:collapse; margin:1rem 0;">
            <tr style="border-bottom:1px solid #30363d;">
              <th style="text-align:left; padding:0.5rem;">Gen</th>
              <th style="text-align:left; padding:0.5rem;">Transfer Rate</th>
              <th style="text-align:left; padding:0.5rem;">x1 Bandwidth</th>
              <th style="text-align:left; padding:0.5rem;">x16 Bandwidth</th>
            </tr>
            <tr style="border-bottom:1px solid #30363d;">
              <td style="padding:0.5rem;">Gen 1</td><td style="padding:0.5rem;">2.5 GT/s</td><td style="padding:0.5rem;">250 MB/s</td><td style="padding:0.5rem;">4 GB/s</td>
            </tr>
            <tr style="border-bottom:1px solid #30363d;">
              <td style="padding:0.5rem;">Gen 2</td><td style="padding:0.5rem;">5 GT/s</td><td style="padding:0.5rem;">500 MB/s</td><td style="padding:0.5rem;">8 GB/s</td>
            </tr>
            <tr style="border-bottom:1px solid #30363d;">
              <td style="padding:0.5rem;">Gen 3</td><td style="padding:0.5rem;">8 GT/s</td><td style="padding:0.5rem;">~1 GB/s</td><td style="padding:0.5rem;">~16 GB/s</td>
            </tr>
            <tr style="border-bottom:1px solid #30363d;">
              <td style="padding:0.5rem;">Gen 4</td><td style="padding:0.5rem;">16 GT/s</td><td style="padding:0.5rem;">~2 GB/s</td><td style="padding:0.5rem;">~32 GB/s</td>
            </tr>
            <tr style="border-bottom:1px solid #30363d;">
              <td style="padding:0.5rem;">Gen 5</td><td style="padding:0.5rem;">32 GT/s</td><td style="padding:0.5rem;">~4 GB/s</td><td style="padding:0.5rem;">~64 GB/s</td>
            </tr>
            <tr>
              <td style="padding:0.5rem;">Gen 6</td><td style="padding:0.5rem;">64 GT/s</td><td style="padding:0.5rem;">~8 GB/s</td><td style="padding:0.5rem;">~128 GB/s</td>
            </tr>
          </table>
        `
      },
      {
        title: '2. Protocol Layers',
        content: `
          <p>PCIe uses a layered protocol architecture (similar to networking):</p>
          <pre><code>┌─────────────────────────────────┐
│       Application Layer         │  Software / Driver
├─────────────────────────────────┤
│      Transaction Layer (TL)     │  TLPs: Memory Rd/Wr, IO, Config, Msg
├─────────────────────────────────┤
│       Data Link Layer (DLL)     │  ACK/NAK, Sequence #, CRC (LCRC)
├─────────────────────────────────┤
│       Physical Layer (PHY)      │  Encoding (128b/130b), Electrical, Lanes
└─────────────────────────────────┘</code></pre>
          <h4>Transaction Layer</h4>
          <ul>
            <li>Generates and consumes <strong>TLPs</strong> (Transaction Layer Packets)</li>
            <li>TLP types: Memory Read/Write, IO Read/Write, Config Read/Write, Messages</li>
            <li>Manages flow control using credit-based mechanism</li>
            <li>Handles ordering rules (relaxed ordering, ID-based ordering)</li>
          </ul>
          <h4>Data Link Layer</h4>
          <ul>
            <li>Adds sequence number and LCRC to each TLP</li>
            <li>ACK/NAK protocol for reliable delivery</li>
            <li>Replay buffer for retransmission on NAK</li>
            <li>Generates DLLPs (Data Link Layer Packets): ACK, NAK, Flow Control, Power Management</li>
          </ul>
          <h4>Physical Layer</h4>
          <ul>
            <li>Electrical signaling (differential pairs per lane)</li>
            <li>Encoding: 8b/10b (Gen 1-2), 128b/130b (Gen 3+)</li>
            <li>Link training and initialization (LTSSM state machine)</li>
            <li>Lane reversal and polarity inversion handling</li>
          </ul>
        `
      },
      {
        title: '3. PCIe Topology & Addressing',
        content: `
          <p>PCIe uses a tree topology with a <strong>Root Complex</strong> at the top:</p>
          <pre><code>         CPU
          │
    Root Complex (RC)
     ┌────┼────┐
     │    │    │
    RP   RP   RP        ← Root Ports
     │    │    │
    EP  Switch  EP       ← Endpoints / Switches
         ┌┼┐
         │││
        EP EP EP         ← Downstream Endpoints</code></pre>
          <h4>BDF Addressing (Bus:Device.Function)</h4>
          <p>Every PCIe function is identified by a 16-bit address:</p>
          <ul>
            <li><strong>Bus</strong> (8 bits) — 0-255, assigned during enumeration</li>
            <li><strong>Device</strong> (5 bits) — 0-31, physical slot on a bus</li>
            <li><strong>Function</strong> (3 bits) — 0-7, functions within a device</li>
          </ul>
          <pre><code># BDF format example: 0000:03:00.0
#   Domain: 0000
#   Bus:    03
#   Device: 00
#   Function: 0

# List all PCIe devices with BDF
lspci

# Show tree topology
lspci -tv</code></pre>
        `
      },
      {
        title: '4. Configuration Space',
        content: `
          <p>Each PCIe function has a <strong>4 KB configuration space</strong> (vs 256 bytes for legacy PCI):</p>
          <pre><code>Offset    Content
──────────────────────────────────────
0x00-0x3F   Standard Header (Type 0 or Type 1)
              - Vendor ID, Device ID (0x00)
              - Command, Status (0x04)
              - Class Code (0x08)
              - BAR0-BAR5 (0x10-0x27)
              - Subsystem Vendor/Device ID (0x2C)
              - Capabilities Pointer (0x34)

0x40-0xFF   Legacy PCI Capabilities
              - MSI, MSI-X, Power Management, PCIe Cap

0x100-0xFFF Extended PCIe Capabilities
              - AER, ACS, L1 PM Substates, PASID, etc.</code></pre>
          <pre><code># Read full config space
sudo lspci -vvv -s 03:00.0

# Read specific register (Vendor ID at offset 0x00)
sudo setpci -s 03:00.0 0x00.w

# Read Device ID at offset 0x02
sudo setpci -s 03:00.0 0x02.w

# Read Command register
sudo setpci -s 03:00.0 COMMAND

# View config space via sysfs
hexdump -C /sys/bus/pci/devices/0000:03:00.0/config | head -20</code></pre>
        `
      },
      {
        title: '5. Linux PCIe Subsystem',
        content: `
          <h4>Key Tools</h4>
          <table style="width:100%; border-collapse:collapse; margin:1rem 0;">
            <tr style="border-bottom:1px solid #30363d;">
              <th style="text-align:left; padding:0.5rem;">Tool</th>
              <th style="text-align:left; padding:0.5rem;">Purpose</th>
            </tr>
            <tr style="border-bottom:1px solid #30363d;">
              <td style="padding:0.5rem;"><code>lspci</code></td>
              <td style="padding:0.5rem;">List/inspect PCIe devices and capabilities</td>
            </tr>
            <tr style="border-bottom:1px solid #30363d;">
              <td style="padding:0.5rem;"><code>setpci</code></td>
              <td style="padding:0.5rem;">Read/write PCI config space registers</td>
            </tr>
            <tr style="border-bottom:1px solid #30363d;">
              <td style="padding:0.5rem;"><code>lspci -tv</code></td>
              <td style="padding:0.5rem;">Show PCIe topology as tree</td>
            </tr>
            <tr style="border-bottom:1px solid #30363d;">
              <td style="padding:0.5rem;"><code>pcieport</code></td>
              <td style="padding:0.5rem;">Kernel driver for Root Port services (AER, PME, HP)</td>
            </tr>
            <tr>
              <td style="padding:0.5rem;"><code>/sys/bus/pci/</code></td>
              <td style="padding:0.5rem;">sysfs interface for PCI device attributes</td>
            </tr>
          </table>
          <pre><code># List all devices (verbose)
lspci -vvv

# Show only PCIe capabilities
lspci -vvv -s 03:00.0 | grep -A 5 "Express"

# Check link speed and width
lspci -vvv -s 03:00.0 | grep -i "lnksta\\|lnkcap"

# Show NUMA node for a device
cat /sys/bus/pci/devices/0000:03:00.0/numa_node

# Show driver binding
ls -la /sys/bus/pci/devices/0000:03:00.0/driver

# Rescan PCI bus
echo 1 > /sys/bus/pci/rescan

# Remove a device
echo 1 > /sys/bus/pci/devices/0000:03:00.0/remove

# Reset a device (Function Level Reset)
echo 1 > /sys/bus/pci/devices/0000:03:00.0/reset</code></pre>
        `
      },
      {
        title: '6. PCIe AER (Advanced Error Reporting)',
        content: `
          <p><strong>AER</strong> is a PCIe Extended Capability that provides detailed error reporting and logging. It classifies errors into three severity levels:</p>
          <h4>Correctable Errors</h4>
          <p>Hardware automatically recovers; no data loss but may indicate degradation:</p>
          <ul>
            <li>Receiver Error</li>
            <li>Bad TLP / Bad DLLP</li>
            <li>Replay Timer Timeout</li>
            <li>Replay Num Rollover</li>
            <li>Advisory Non-Fatal Error</li>
          </ul>
          <h4>Uncorrectable Non-Fatal Errors</h4>
          <p>Transaction fails but link remains operational:</p>
          <ul>
            <li>Completion Timeout</li>
            <li>Completer Abort</li>
            <li>Unexpected Completion</li>
            <li>Unsupported Request</li>
            <li>Poisoned TLP</li>
          </ul>
          <h4>Uncorrectable Fatal Errors</h4>
          <p>Link is unreliable; device reset typically required:</p>
          <ul>
            <li>Data Link Protocol Error</li>
            <li>Surprise Down</li>
            <li>Malformed TLP</li>
            <li>Flow Control Protocol Error</li>
            <li>ECRC Error</li>
          </ul>
          <pre><code># Check if AER is supported on a device
lspci -vvv -s 03:00.0 | grep "Advanced Error Reporting"

# View AER status via sysfs
cat /sys/bus/pci/devices/0000:03:00.0/aer_dev_correctable
cat /sys/bus/pci/devices/0000:03:00.0/aer_dev_fatal
cat /sys/bus/pci/devices/0000:03:00.0/aer_dev_nonfatal

# Check kernel AER support
dmesg | grep -i aer

# Verify AER kernel config
grep CONFIG_PCIEAER /boot/config-$(uname -r)

# Kernel tracepoint for real-time AER monitoring
cat /sys/kernel/debug/tracing/events/ras/aer_event/format</code></pre>
        `
      },
      {
        title: '7. Real-Time AER Monitoring with eBPF',
        content: `
          <p>Traditional AER monitoring relies on polling dmesg or using rasdaemon. Our eBPF-based tool provides <strong>event-driven, zero-overhead</strong> monitoring:</p>
          <pre><code># Install dependencies
sudo apt install python3-bpfcc bpfcc-tools bpftrace

# Quick monitoring with bpftrace
sudo bpftrace -e 'tracepoint:ras:aer_event {
  printf("%s | severity=%d | status=0x%x\\n",
    str(args->dev_name), args->severity, args->status);
}'

# Full-featured monitoring (from our tools/)
sudo python3 tools/pcie-aer-monitor/pcie_aer_monitor.py

# Filter only Fatal errors
sudo python3 tools/pcie-aer-monitor/pcie_aer_monitor.py --severity fatal

# JSON output for log pipelines
sudo python3 tools/pcie-aer-monitor/pcie_aer_monitor.py --json --summary</code></pre>
          <h4>Data Flow: Hardware → Kernel → eBPF → Userspace</h4>
          <pre><code>PCIe Device (error detected)
    ↓ sets AER Status Register
Root Port (MSI/MSI-X interrupt)
    ↓
Kernel AER Driver (reads registers, determines severity)
    ↓ trace_aer_event()
ras:aer_event tracepoint
    ↓
eBPF program (filter + perf_submit)
    ↓ perf buffer
Userspace (decode → output/alert)</code></pre>
          <h4>eBPF vs Traditional Approaches</h4>
          <table style="width:100%; border-collapse:collapse; margin:1rem 0;">
            <tr style="border-bottom:1px solid #30363d;">
              <th style="text-align:left; padding:0.5rem;">Method</th>
              <th style="text-align:left; padding:0.5rem;">Mechanism</th>
              <th style="text-align:left; padding:0.5rem;">Latency</th>
              <th style="text-align:left; padding:0.5rem;">CPU Overhead</th>
            </tr>
            <tr style="border-bottom:1px solid #30363d;">
              <td style="padding:0.5rem;">dmesg polling</td>
              <td style="padding:0.5rem;">Periodic grep</td>
              <td style="padding:0.5rem;">Seconds</td>
              <td style="padding:0.5rem;">Wastes CPU cycles</td>
            </tr>
            <tr style="border-bottom:1px solid #30363d;">
              <td style="padding:0.5rem;">rasdaemon</td>
              <td style="padding:0.5rem;">Netlink + SQLite</td>
              <td style="padding:0.5rem;">~ms</td>
              <td style="padding:0.5rem;">Low</td>
            </tr>
            <tr>
              <td style="padding:0.5rem;">eBPF (our tool)</td>
              <td style="padding:0.5rem;">Tracepoint + perf buffer</td>
              <td style="padding:0.5rem;">~us</td>
              <td style="padding:0.5rem;">Near-zero (event-driven)</td>
            </tr>
          </table>
          <p><strong>References:</strong></p>
          <ul>
            <li><a href="https://docs.kernel.org/PCI/pcieaer-howto.html" target="_blank">Kernel AER HOWTO</a></li>
            <li><a href="https://pcisig.com/" target="_blank">PCI-SIG</a> — PCIe specification body</li>
            <li><a href="https://docs.kernel.org/PCI/index.html" target="_blank">Linux PCI Subsystem Docs</a></li>
          </ul>
        `
      }
    ]
  },
  {
    id: 'i2c-i3c',
    icon: '🔗',
    title: 'I2C & I3C',
    description: 'Master the I2C/I3C serial bus protocols, Linux kernel subsystem, and userspace tools',
    sections: [
      {
        title: '1. What is I2C?',
        content: `
          <p><strong>I2C (Inter-Integrated Circuit)</strong> is a synchronous, multi-controller, multi-target serial bus invented by Philips in 1982. It uses just two wires to connect multiple devices:</p>
          <ul>
            <li><strong>SDA</strong> — Serial Data (bidirectional)</li>
            <li><strong>SCL</strong> — Serial Clock (driven by controller)</li>
          </ul>
          <h4>Key Characteristics</h4>
          <ul>
            <li>7-bit or 10-bit device addressing</li>
            <li>Open-drain bus with pull-up resistors</li>
            <li>Multi-controller support with arbitration</li>
            <li>Simple protocol: START, Address, R/W, Data, ACK/NACK, STOP</li>
          </ul>
          <h4>Speed Modes</h4>
          <table style="width:100%; border-collapse:collapse; margin:1rem 0;">
            <tr style="border-bottom:1px solid #30363d;">
              <th style="text-align:left; padding:0.5rem;">Mode</th>
              <th style="text-align:left; padding:0.5rem;">Max Speed</th>
              <th style="text-align:left; padding:0.5rem;">Use Case</th>
            </tr>
            <tr style="border-bottom:1px solid #30363d;">
              <td style="padding:0.5rem;">Standard Mode</td><td style="padding:0.5rem;">100 kHz</td><td style="padding:0.5rem;">Simple sensors, EEPROMs</td>
            </tr>
            <tr style="border-bottom:1px solid #30363d;">
              <td style="padding:0.5rem;">Fast Mode</td><td style="padding:0.5rem;">400 kHz</td><td style="padding:0.5rem;">Most peripherals</td>
            </tr>
            <tr style="border-bottom:1px solid #30363d;">
              <td style="padding:0.5rem;">Fast Mode Plus</td><td style="padding:0.5rem;">1 MHz</td><td style="padding:0.5rem;">Higher throughput sensors</td>
            </tr>
            <tr style="border-bottom:1px solid #30363d;">
              <td style="padding:0.5rem;">High Speed Mode</td><td style="padding:0.5rem;">3.4 MHz</td><td style="padding:0.5rem;">High-bandwidth devices</td>
            </tr>
            <tr>
              <td style="padding:0.5rem;">Ultra Fast Mode</td><td style="padding:0.5rem;">5 MHz</td><td style="padding:0.5rem;">Unidirectional push-pull</td>
            </tr>
          </table>
          <h4>I2C Transaction Format</h4>
          <pre><code>START → [7-bit Addr + R/W] → ACK → [Data Byte] → ACK → ... → STOP

Example: Write 0x42 to register 0x10 of device at address 0x48
  START → [0x48 + W] → ACK → [0x10] → ACK → [0x42] → ACK → STOP

Example: Read 2 bytes from register 0x00 of device 0x50
  START → [0x50 + W] → ACK → [0x00] → ACK →
  RESTART → [0x50 + R] → ACK → [Data0] → ACK → [Data1] → NACK → STOP</code></pre>
        `
      },
      {
        title: '2. What is I3C?',
        content: `
          <p><strong>I3C (Improved Inter-Integrated Circuit)</strong> is a MIPI Alliance specification designed as the successor to I2C, maintaining backward compatibility while adding modern features:</p>
          <h4>I3C vs I2C Comparison</h4>
          <table style="width:100%; border-collapse:collapse; margin:1rem 0;">
            <tr style="border-bottom:1px solid #30363d;">
              <th style="text-align:left; padding:0.5rem;">Feature</th>
              <th style="text-align:left; padding:0.5rem;">I2C</th>
              <th style="text-align:left; padding:0.5rem;">I3C</th>
            </tr>
            <tr style="border-bottom:1px solid #30363d;">
              <td style="padding:0.5rem;">Max Speed (SDR)</td><td style="padding:0.5rem;">3.4 MHz</td><td style="padding:0.5rem;">12.5 MHz</td>
            </tr>
            <tr style="border-bottom:1px solid #30363d;">
              <td style="padding:0.5rem;">HDR Mode</td><td style="padding:0.5rem;">N/A</td><td style="padding:0.5rem;">Up to 33 MHz (HDR-DDR)</td>
            </tr>
            <tr style="border-bottom:1px solid #30363d;">
              <td style="padding:0.5rem;">Addressing</td><td style="padding:0.5rem;">Static (7/10-bit)</td><td style="padding:0.5rem;">Dynamic (7-bit, assigned at runtime)</td>
            </tr>
            <tr style="border-bottom:1px solid #30363d;">
              <td style="padding:0.5rem;">Interrupts</td><td style="padding:0.5rem;">External GPIO pin</td><td style="padding:0.5rem;">In-Band Interrupt (IBI) on SDA</td>
            </tr>
            <tr style="border-bottom:1px solid #30363d;">
              <td style="padding:0.5rem;">Hot-Join</td><td style="padding:0.5rem;">No</td><td style="padding:0.5rem;">Yes (devices join at runtime)</td>
            </tr>
            <tr style="border-bottom:1px solid #30363d;">
              <td style="padding:0.5rem;">Device Discovery</td><td style="padding:0.5rem;">Manual probing</td><td style="padding:0.5rem;">Automatic (DAA procedure)</td>
            </tr>
            <tr style="border-bottom:1px solid #30363d;">
              <td style="padding:0.5rem;">Bus Lines</td><td style="padding:0.5rem;">SDA + SCL (open-drain)</td><td style="padding:0.5rem;">SDA + SCL (push-pull in SDR)</td>
            </tr>
            <tr style="border-bottom:1px solid #30363d;">
              <td style="padding:0.5rem;">Power</td><td style="padding:0.5rem;">Higher (pull-ups)</td><td style="padding:0.5rem;">Lower (push-pull, no pull-ups needed)</td>
            </tr>
            <tr>
              <td style="padding:0.5rem;">Legacy I2C Devices</td><td style="padding:0.5rem;">N/A</td><td style="padding:0.5rem;">Supported on same bus</td>
            </tr>
          </table>
          <h4>I3C Key Concepts</h4>
          <ul>
            <li><strong>DAA (Dynamic Address Assignment)</strong> — Controller assigns addresses to targets at bus init</li>
            <li><strong>CCC (Common Command Codes)</strong> — Standardized commands all I3C devices understand</li>
            <li><strong>IBI (In-Band Interrupt)</strong> — Targets request controller attention via SDA without extra GPIO</li>
            <li><strong>HDR (High Data Rate)</strong> — DDR, Ternary modes for higher throughput</li>
            <li><strong>Hot-Join</strong> — Devices can be connected while bus is active</li>
          </ul>
          <p>Reference: <a href="https://mipi.org/resources/I3C-frequently-asked-questions" target="_blank">MIPI I3C FAQ</a></p>
        `
      },
      {
        title: '3. Linux I2C Subsystem',
        content: `
          <p>The Linux kernel I2C subsystem consists of:</p>
          <ul>
            <li><strong>I2C Core</strong> — Bus registration, device/driver matching</li>
            <li><strong>Adapter Drivers</strong> — Platform-specific controller drivers (e.g., i2c-designware, i2c-bcm2835)</li>
            <li><strong>Client Drivers</strong> — Device-specific drivers (e.g., sensors, EEPROMs)</li>
            <li><strong>i2c-dev</strong> — Exposes I2C buses as /dev/i2c-N for userspace access</li>
          </ul>
          <pre><code># Load i2c-dev module for userspace access
sudo modprobe i2c-dev

# List available I2C buses
i2cdetect -l

# Scan bus 1 for devices (shows address grid)
sudo i2cdetect -y 1

# Example output:
#      0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f
# 00:          -- -- -- -- -- -- -- -- -- -- -- -- --
# 10: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
# 20: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
# 30: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
# 40: -- -- -- -- -- -- -- -- 48 -- -- -- -- -- -- --
# 50: 50 -- -- -- -- -- -- -- -- -- -- -- -- -- -- --

# Read a byte from device 0x48, register 0x00
sudo i2cget -y 1 0x48 0x00

# Read a word (2 bytes)
sudo i2cget -y 1 0x48 0x00 w

# Write a byte to device 0x48, register 0x01
sudo i2cset -y 1 0x48 0x01 0xFF

# Dump all registers of a device
sudo i2cdump -y 1 0x48

# Transfer raw I2C messages
sudo i2ctransfer -y 1 w2@0x48 0x00 0x01 r4</code></pre>
          <h4>sysfs Interface</h4>
          <pre><code># View I2C bus info
ls /sys/bus/i2c/devices/

# View adapter details
cat /sys/bus/i2c/devices/i2c-1/name

# View device driver binding
ls /sys/bus/i2c/devices/1-0048/
cat /sys/bus/i2c/devices/1-0048/name</code></pre>
        `
      },
      {
        title: '4. Linux I3C Subsystem',
        content: `
          <p>Linux kernel I3C support was introduced in kernel 5.0. The subsystem lives under <code>drivers/i3c/</code>:</p>
          <ul>
            <li><strong>I3C Core</strong> — Bus management, DAA, CCC handling</li>
            <li><strong>Master Drivers</strong> — Controller-specific (e.g., dw-i3c-master, svc-i3c-master)</li>
            <li><strong>Device Drivers</strong> — Target device drivers</li>
            <li><strong>i3c-dev (WIP)</strong> — Userspace access similar to i2c-dev</li>
          </ul>
          <h4>Kernel Configuration</h4>
          <pre><code># Check if I3C is enabled
grep CONFIG_I3C /boot/config-$(uname -r)

# Required options:
# CONFIG_I3C=y (or m)
# CONFIG_I3C_MASTER_DW=m       (DesignWare controller)
# CONFIG_I3C_MASTER_SVC=m      (Silvaco controller)
# CONFIG_I3C_MASTER_CDNS=m     (Cadence controller)</code></pre>
          <h4>Device Tree Binding (ARM/embedded)</h4>
          <pre><code>/* Example: DesignWare I3C controller in device tree */
i3c0: i3c@d040000 {
    compatible = "snps,dw-i3c-master-1.00a";
    reg = <0xd040000 0x1000>;
    interrupts = <GIC_SPI 65 IRQ_TYPE_LEVEL_HIGH>;
    clocks = <&clk_i3c>;
    #address-cells = <3>;
    #size-cells = <0>;

    /* I3C target device (dynamic address assigned) */
    sensor@0,0x6c,0x0 {
        reg = <0 0x6c 0x0>;
        /* Provisional ID: manuf_id, part_id, instance */
    };

    /* Legacy I2C device on I3C bus */
    eeprom@50 {
        compatible = "atmel,24c02";
        reg = <0x50 0x0 0x0>;
    };
};</code></pre>
          <h4>I3C sysfs</h4>
          <pre><code># List I3C buses
ls /sys/bus/i3c/devices/

# View I3C device info
cat /sys/bus/i3c/devices/0-6c00000000/dynamic_address
cat /sys/bus/i3c/devices/0-6c00000000/pid
cat /sys/bus/i3c/devices/0-6c00000000/bcr
cat /sys/bus/i3c/devices/0-6c00000000/dcr</code></pre>
        `
      },
      {
        title: '5. Writing an I2C Client Driver',
        content: `
          <p>A minimal Linux kernel I2C client driver:</p>
          <pre><code>#include &lt;linux/module.h&gt;
#include &lt;linux/i2c.h&gt;

/* Probe: called when device is matched */
static int my_sensor_probe(struct i2c_client *client)
{
    u8 chip_id;
    int ret;

    /* Read chip ID register */
    ret = i2c_smbus_read_byte_data(client, 0x00);
    if (ret < 0)
        return ret;

    chip_id = ret;
    dev_info(&client->dev, "Sensor detected, chip ID: 0x%02x\\n", chip_id);

    /* Configure sensor: write to config register */
    ret = i2c_smbus_write_byte_data(client, 0x01, 0x80);
    if (ret < 0)
        return ret;

    return 0;
}

static void my_sensor_remove(struct i2c_client *client)
{
    dev_info(&client->dev, "Sensor removed\\n");
}

/* Device matching table */
static const struct i2c_device_id my_sensor_id[] = {
    { "my-sensor", 0 },
    { }
};
MODULE_DEVICE_TABLE(i2c, my_sensor_id);

static const struct of_device_id my_sensor_of_match[] = {
    { .compatible = "vendor,my-sensor" },
    { }
};
MODULE_DEVICE_TABLE(of, my_sensor_of_match);

static struct i2c_driver my_sensor_driver = {
    .driver = {
        .name = "my-sensor",
        .of_match_table = my_sensor_of_match,
    },
    .probe = my_sensor_probe,
    .remove = my_sensor_remove,
    .id_table = my_sensor_id,
};
module_i2c_driver(my_sensor_driver);

MODULE_LICENSE("GPL");
MODULE_DESCRIPTION("My I2C Sensor Driver");
MODULE_AUTHOR("LinuxTech");</code></pre>
          <h4>SMBus API (most common)</h4>
          <pre><code>/* Read operations */
s32 i2c_smbus_read_byte(client);               // Read 1 byte (no register)
s32 i2c_smbus_read_byte_data(client, reg);     // Read 1 byte from register
s32 i2c_smbus_read_word_data(client, reg);     // Read 2 bytes from register
s32 i2c_smbus_read_block_data(client, reg, buf); // Read block

/* Write operations */
s32 i2c_smbus_write_byte(client, value);
s32 i2c_smbus_write_byte_data(client, reg, value);
s32 i2c_smbus_write_word_data(client, reg, value);
s32 i2c_smbus_write_block_data(client, reg, len, buf);

/* Raw I2C transfer (for non-SMBus devices) */
int i2c_transfer(adapter, msgs, num_msgs);</code></pre>
        `
      },
      {
        title: '6. Debugging & Troubleshooting',
        content: `
          <h4>Common Issues</h4>
          <table style="width:100%; border-collapse:collapse; margin:1rem 0;">
            <tr style="border-bottom:1px solid #30363d;">
              <th style="text-align:left; padding:0.5rem;">Symptom</th>
              <th style="text-align:left; padding:0.5rem;">Possible Cause</th>
              <th style="text-align:left; padding:0.5rem;">Solution</th>
            </tr>
            <tr style="border-bottom:1px solid #30363d;">
              <td style="padding:0.5rem;">Device not detected</td>
              <td style="padding:0.5rem;">Wrong bus, address conflict, missing pull-ups</td>
              <td style="padding:0.5rem;">Check wiring, use i2cdetect, verify pull-up resistors</td>
            </tr>
            <tr style="border-bottom:1px solid #30363d;">
              <td style="padding:0.5rem;">NACK on write</td>
              <td style="padding:0.5rem;">Wrong address, device busy, write-protect</td>
              <td style="padding:0.5rem;">Verify datasheet address, check WP pin</td>
            </tr>
            <tr style="border-bottom:1px solid #30363d;">
              <td style="padding:0.5rem;">Bus hangs (SDA stuck low)</td>
              <td style="padding:0.5rem;">Target holding SDA during interrupted transfer</td>
              <td style="padding:0.5rem;">Toggle SCL 9 times to release, or power cycle</td>
            </tr>
            <tr>
              <td style="padding:0.5rem;">Corrupted data</td>
              <td style="padding:0.5rem;">Bus capacitance too high, speed too fast</td>
              <td style="padding:0.5rem;">Lower speed, reduce bus length, adjust pull-ups</td>
            </tr>
          </table>
          <h4>Debugging Commands</h4>
          <pre><code># Check kernel log for I2C errors
dmesg | grep -i i2c

# Trace I2C transactions (requires ftrace)
echo 1 > /sys/kernel/debug/tracing/events/i2c/enable
cat /sys/kernel/debug/tracing/trace_pipe

# Logic analyzer decode (with sigrok/PulseView)
sigrok-cli -d fx2lafw -c samplerate=1000000 -P i2c:scl=D0:sda=D1

# Monitor I2C bus with eBPF (trace all transfers)
sudo bpftrace -e 'kprobe:i2c_transfer {
  printf("%s: adapter=%s msgs=%d\\n",
    comm, str(((struct i2c_adapter *)arg0)->name), arg2);
}'

# Check bus speed
cat /sys/bus/i2c/devices/i2c-1/bus_clk_rate 2>/dev/null

# Instantiate a device manually (for testing)
echo "my-sensor 0x48" > /sys/bus/i2c/devices/i2c-1/new_device
echo "0x48" > /sys/bus/i2c/devices/i2c-1/delete_device</code></pre>
        `
      },
      {
        title: '7. Practical Examples',
        content: `
          <h4>Read Temperature from a Sensor (LM75)</h4>
          <pre><code># LM75 temperature sensor at address 0x48
# Temperature register = 0x00 (2 bytes, 9-bit resolution)

# Read raw value
RAW=$(sudo i2cget -y 1 0x48 0x00 w)

# Parse: swap bytes (SMBus word is little-endian), shift right 7
# LM75 format: MSB[7:0] = integer, LSB[7] = 0.5 degree
python3 -c "
raw = $RAW
# Swap bytes for big-endian sensor
msb = raw & 0xFF
lsb = (raw >> 8) & 0xFF
temp = ((msb << 8) | lsb) >> 5
if temp & 0x400:  # negative (11-bit signed)
    temp -= 2048
print(f'Temperature: {temp * 0.125:.1f} C')
"</code></pre>
          <h4>Write to EEPROM (24C02)</h4>
          <pre><code># AT24C02 EEPROM at address 0x50
# 256 bytes, page write = 8 bytes

# Write single byte at address 0x10
sudo i2cset -y 1 0x50 0x10 0xAB

# Read it back
sudo i2cget -y 1 0x50 0x10
# Returns: 0xab

# Write multiple bytes (block write to address 0x20)
sudo i2ctransfer -y 1 w5@0x50 0x20 0x48 0x65 0x6C 0x6C  # "Hell"

# Read back 4 bytes from address 0x20
sudo i2ctransfer -y 1 w1@0x50 0x20 r4
# Returns: 0x48 0x65 0x6c 0x6c</code></pre>
          <h4>Python Userspace I2C Access</h4>
          <pre><code>#!/usr/bin/env python3
# Read temperature from LM75 sensor using smbus2
import smbus2

BUS = 1
ADDR = 0x48
TEMP_REG = 0x00

bus = smbus2.SMBus(BUS)

# Read 2 bytes from temperature register
data = bus.read_i2c_block_data(ADDR, TEMP_REG, 2)
raw = (data[0] << 8) | data[1]
temp = (raw >> 5) * 0.125

if raw & 0x8000:  # negative
    temp -= 256

print(f"Temperature: {temp:.1f} C")
bus.close()</code></pre>
          <p><strong>References:</strong></p>
          <ul>
            <li><a href="https://docs.kernel.org/driver-api/i2c.html" target="_blank">Linux Kernel I2C Documentation</a></li>
            <li><a href="https://docs.kernel.org/driver-api/i3c/protocol.html" target="_blank">Linux Kernel I3C Protocol</a></li>
            <li><a href="https://mipi.org/resources/I3C-frequently-asked-questions" target="_blank">MIPI I3C FAQ</a></li>
          </ul>
        `
      }
    ]
  },
  {
    id: 'gpio',
    icon: '⚡',
    title: 'GPIO',
    description: 'Control General Purpose I/O pins on Linux using libgpiod, character devices, and kernel drivers',
    sections: [
      {
        title: '1. What is GPIO?',
        content: `
          <p><strong>GPIO (General Purpose Input/Output)</strong> refers to digital pins on a processor or SoC that can be software-controlled to read or drive logic levels (high/low). They are the fundamental interface for interacting with LEDs, buttons, relays, sensors, and other hardware.</p>
          <h4>Key Concepts</h4>
          <ul>
            <li><strong>Direction</strong> — Input (read external signal) or Output (drive a signal)</li>
            <li><strong>Value</strong> — 0 (low) or 1 (high)</li>
            <li><strong>Active-Low</strong> — Logic inverted: physical low = logical active</li>
            <li><strong>Pull-up / Pull-down</strong> — Internal resistors to bias the pin when floating</li>
            <li><strong>Interrupt / Edge detection</strong> — Trigger on rising, falling, or both edges</li>
            <li><strong>Open-drain / Open-source</strong> — Output drives only one direction; needs external pull</li>
          </ul>
          <h4>GPIO Controllers (gpiochip)</h4>
          <p>A GPIO controller manages a bank of pins. A system may have multiple controllers:</p>
          <pre><code># List all GPIO controllers
gpiodetect

# Example output:
# gpiochip0 [pinctrl-bcm2711] (58 lines)
# gpiochip1 [raspberrypi-exp-gpio] (8 lines)

# On x86 servers:
# gpiochip0 [INT3450:00] (267 lines)
# gpiochip1 [INT3450:01] (24 lines)</code></pre>
        `
      },
      {
        title: '2. Linux GPIO Interfaces (Legacy vs Modern)',
        content: `
          <h4>Legacy: sysfs interface (DEPRECATED since kernel 4.8)</h4>
          <pre><code># DO NOT use in new code — shown only for reference
echo 17 > /sys/class/gpio/export
echo out > /sys/class/gpio/gpio17/direction
echo 1 > /sys/class/gpio/gpio17/value
echo 17 > /sys/class/gpio/unexport</code></pre>
          <p><strong>Problems with sysfs:</strong></p>
          <ul>
            <li>No ownership tracking — multiple processes can conflict</li>
            <li>No atomic multi-line operations</li>
            <li>No event/interrupt support</li>
            <li>Resources not freed on process exit</li>
            <li>Race conditions between export/configure/use</li>
          </ul>
          <h4>Modern: Character device interface (/dev/gpiochipN)</h4>
          <p>Since kernel 4.8, the proper interface is via character devices. <strong>libgpiod</strong> provides the userspace library and CLI tools:</p>
          <ul>
            <li>Automatic cleanup on file descriptor close</li>
            <li>Atomic multi-line operations</li>
            <li>Edge event monitoring (poll/epoll)</li>
            <li>Ownership and access control</li>
            <li>Bias configuration (pull-up/down)</li>
          </ul>
          <pre><code># Install libgpiod tools
# Ubuntu/Debian
sudo apt install gpiod libgpiod-dev

# RHEL/Fedora
sudo dnf install libgpiod-utils libgpiod-devel

# Arch
sudo pacman -S libgpiod</code></pre>
        `
      },
      {
        title: '3. libgpiod CLI Tools',
        content: `
          <h4>gpiodetect — List GPIO controllers</h4>
          <pre><code>gpiodetect
# gpiochip0 [pinctrl-bcm2711] (58 lines)
# gpiochip1 [raspberrypi-exp-gpio] (8 lines)</code></pre>
          <h4>gpioinfo — Show line info for a chip</h4>
          <pre><code>gpioinfo gpiochip0
# gpiochip0 - 58 lines:
#   line  0: "ID_SDA"   unused  input  active-high
#   line  1: "ID_SCL"   unused  input  active-high
#   line  2: "GPIO2"    unused  input  active-high
#   ...
#   line 17: "GPIO17"  "my-led" output active-high [used]</code></pre>
          <h4>gpioget — Read line value</h4>
          <pre><code># Read GPIO 4 on gpiochip0
gpioget gpiochip0 4
# Output: 1

# Read multiple lines at once
gpioget gpiochip0 4 5 6
# Output: 1 0 1</code></pre>
          <h4>gpioset — Set output value</h4>
          <pre><code># Set GPIO 17 high
gpioset gpiochip0 17=1

# Set GPIO 17 low
gpioset gpiochip0 17=0

# Set multiple lines atomically
gpioset gpiochip0 17=1 27=0 22=1

# Hold the line (don't exit immediately)
gpioset --mode=wait gpiochip0 17=1
# Line stays driven until Ctrl+C or signal</code></pre>
          <h4>gpiomon — Monitor edge events</h4>
          <pre><code># Monitor rising edges on GPIO 4
gpiomon --rising-edge gpiochip0 4
# Output:
# event: RISING EDGE offset: 4 timestamp: [1689012345.123456789]

# Monitor both edges on multiple lines
gpiomon --falling-edge --rising-edge gpiochip0 4 17 27

# Limit to 10 events then exit
gpiomon --num-events=10 gpiochip0 4</code></pre>
          <h4>gpionotify — Watch line state changes</h4>
          <pre><code># Watch for any config changes on lines
gpionotify gpiochip0 4 17</code></pre>
        `
      },
      {
        title: '4. Programming with libgpiod (C & Python)',
        content: `
          <h4>C Example — Blink an LED</h4>
          <pre><code>#include &lt;gpiod.h&gt;
#include &lt;stdio.h&gt;
#include &lt;unistd.h&gt;

int main(void) {
    struct gpiod_chip *chip;
    struct gpiod_line_request *request;
    struct gpiod_request_config *req_cfg;
    struct gpiod_line_settings *settings;
    struct gpiod_line_config *line_cfg;

    chip = gpiod_chip_open("/dev/gpiochip0");
    if (!chip) return 1;

    settings = gpiod_line_settings_new();
    gpiod_line_settings_set_direction(settings, GPIOD_LINE_DIRECTION_OUTPUT);

    line_cfg = gpiod_line_config_new();
    unsigned int offset = 17;
    gpiod_line_config_add_line_settings(line_cfg, &offset, 1, settings);

    req_cfg = gpiod_request_config_new();
    gpiod_request_config_set_consumer(req_cfg, "blink-led");

    request = gpiod_chip_request_lines(chip, req_cfg, line_cfg);

    /* Blink 10 times */
    for (int i = 0; i < 10; i++) {
        gpiod_line_request_set_value(request, 17, GPIOD_LINE_VALUE_ACTIVE);
        sleep(1);
        gpiod_line_request_set_value(request, 17, GPIOD_LINE_VALUE_INACTIVE);
        sleep(1);
    }

    gpiod_line_request_release(request);
    gpiod_request_config_free(req_cfg);
    gpiod_line_config_free(line_cfg);
    gpiod_line_settings_free(settings);
    gpiod_chip_close(chip);
    return 0;
}

/* Compile: gcc -o blink blink.c -lgpiod */</code></pre>
          <h4>Python Example — Read Button, Drive LED</h4>
          <pre><code>#!/usr/bin/env python3
import gpiod
import time

CHIP = "/dev/gpiochip0"
LED_LINE = 17
BUTTON_LINE = 4

with gpiod.request_lines(
    CHIP,
    consumer="button-led",
    config={
        LED_LINE: gpiod.LineSettings(
            direction=gpiod.line.Direction.OUTPUT,
        ),
        BUTTON_LINE: gpiod.LineSettings(
            direction=gpiod.line.Direction.INPUT,
            bias=gpiod.line.Bias.PULL_UP,
            edge_detection=gpiod.line.Edge.FALLING,
        ),
    },
) as request:
    print("Waiting for button press...")
    while True:
        # Wait for edge event (button press)
        if request.wait_edge_events(timeout=1):
            events = request.read_edge_events()
            for event in events:
                print(f"Button pressed at {event.timestamp_ns}")
                # Toggle LED
                val = request.get_value(LED_LINE)
                new_val = gpiod.line.Value.INACTIVE if val else gpiod.line.Value.ACTIVE
                request.set_value(LED_LINE, new_val)</code></pre>
          <pre><code># Install Python bindings
pip install gpiod</code></pre>
        `
      },
      {
        title: '5. Kernel GPIO Driver Development',
        content: `
          <p>Kernel drivers use the <strong>gpiolib</strong> framework to consume or provide GPIOs:</p>
          <h4>Consuming GPIOs in a Driver (Descriptor API)</h4>
          <pre><code>#include &lt;linux/gpio/consumer.h&gt;
#include &lt;linux/module.h&gt;
#include &lt;linux/platform_device.h&gt;

struct my_device {
    struct gpio_desc *led_gpio;
    struct gpio_desc *reset_gpio;
};

static int my_probe(struct platform_device *pdev)
{
    struct my_device *priv;

    priv = devm_kzalloc(&pdev->dev, sizeof(*priv), GFP_KERNEL);

    /* Request GPIO from device tree / ACPI */
    priv->led_gpio = devm_gpiod_get(&pdev->dev, "led", GPIOD_OUT_LOW);
    if (IS_ERR(priv->led_gpio))
        return PTR_ERR(priv->led_gpio);

    priv->reset_gpio = devm_gpiod_get(&pdev->dev, "reset", GPIOD_OUT_HIGH);
    if (IS_ERR(priv->reset_gpio))
        return PTR_ERR(priv->reset_gpio);

    /* Use GPIOs */
    gpiod_set_value(priv->led_gpio, 1);    /* LED on */

    /* Pulse reset line */
    gpiod_set_value(priv->reset_gpio, 0);
    msleep(10);
    gpiod_set_value(priv->reset_gpio, 1);

    /* GPIO as interrupt source */
    int irq = gpiod_to_irq(priv->led_gpio);
    /* ... request_irq(irq, handler, ...) */

    return 0;
}</code></pre>
          <h4>Device Tree GPIO Binding</h4>
          <pre><code>my-device {
    compatible = "vendor,my-device";
    led-gpios = <&gpio0 17 GPIO_ACTIVE_HIGH>;
    reset-gpios = <&gpio0 27 GPIO_ACTIVE_LOW>;
};</code></pre>
          <h4>Registering a GPIO Controller (Provider)</h4>
          <pre><code>/* Simplified GPIO chip registration */
#include &lt;linux/gpio/driver.h&gt;

static int my_gpio_get(struct gpio_chip *gc, unsigned int offset)
{
    /* Read hardware register */
    return !!(readl(base + GPIO_DATA_REG) & BIT(offset));
}

static void my_gpio_set(struct gpio_chip *gc, unsigned int offset, int value)
{
    u32 reg = readl(base + GPIO_DATA_REG);
    if (value)
        reg |= BIT(offset);
    else
        reg &= ~BIT(offset);
    writel(reg, base + GPIO_DATA_REG);
}

static struct gpio_chip my_gc = {
    .label = "my-gpio",
    .owner = THIS_MODULE,
    .base = -1,             /* Dynamic allocation */
    .ngpio = 32,
    .get = my_gpio_get,
    .set = my_gpio_set,
    .direction_input = my_gpio_dir_in,
    .direction_output = my_gpio_dir_out,
};

/* Register in probe function */
gpiochip_add_data(&my_gc, priv);</code></pre>
        `
      },
      {
        title: '6. GPIO Interrupts & Edge Detection',
        content: `
          <h4>Userspace: Event Monitoring with libgpiod</h4>
          <pre><code># Monitor rising edge on GPIO 4 (button press)
gpiomon --rising-edge gpiochip0 4

# In Python:
import gpiod

with gpiod.request_lines(
    "/dev/gpiochip0",
    consumer="edge-watcher",
    config={
        4: gpiod.LineSettings(
            direction=gpiod.line.Direction.INPUT,
            edge_detection=gpiod.line.Edge.BOTH,
            debounce_period=gpiod.line.Duration(microseconds=5000),
        ),
    },
) as req:
    while True:
        if req.wait_edge_events(timeout=5):
            for event in req.read_edge_events():
                edge = "RISING" if event.event_type == gpiod.edge.Event.RISING_EDGE else "FALLING"
                print(f"{edge} on line {event.line_offset} at {event.timestamp_ns}ns")</code></pre>
          <h4>Kernel: GPIO IRQ in a Driver</h4>
          <pre><code>#include &lt;linux/interrupt.h&gt;
#include &lt;linux/gpio/consumer.h&gt;

static irqreturn_t button_irq_handler(int irq, void *dev_id)
{
    struct my_device *priv = dev_id;
    int value = gpiod_get_value(priv->button_gpio);
    pr_info("Button state: %d\\n", value);
    return IRQ_HANDLED;
}

static int my_probe(struct platform_device *pdev)
{
    struct my_device *priv;
    int irq, ret;

    priv->button_gpio = devm_gpiod_get(&pdev->dev, "button", GPIOD_IN);
    irq = gpiod_to_irq(priv->button_gpio);

    ret = devm_request_threaded_irq(&pdev->dev, irq,
        NULL, button_irq_handler,
        IRQF_TRIGGER_FALLING | IRQF_ONESHOT,
        "my-button", priv);

    return ret;
}</code></pre>
          <h4>Debouncing</h4>
          <pre><code># Hardware debounce (if supported by controller)
# In device tree:
button-gpios = <&gpio0 4 GPIO_ACTIVE_LOW>;
/* driver sets: gpiod_set_debounce(gpio, 5000); // 5ms */

# Software debounce with libgpiod v2:
# debounce_period parameter in LineSettings (shown above)</code></pre>
        `
      },
      {
        title: '7. Debugging & Practical Tips',
        content: `
          <h4>Debugging Tools</h4>
          <pre><code># View all GPIO states (kernel debugfs)
sudo cat /sys/kernel/debug/gpio

# Example output:
# gpiochip0: GPIOs 0-53, parent: platform/fe200000.gpio, pinctrl-bcm2711:
#  gpio-4   (                    |button          ) in  hi IRQ
#  gpio-17  (                    |led             ) out lo

# View pinctrl state
sudo cat /sys/kernel/debug/pinctrl/fe200000.gpio-pinctrl-bcm2711/pins

# Check for GPIO conflicts
gpioinfo gpiochip0 | grep "\\[used\\]"

# Trace GPIO operations with ftrace
echo 1 > /sys/kernel/debug/tracing/events/gpio/enable
cat /sys/kernel/debug/tracing/trace_pipe
# gpio_value: 17 set 1
# gpio_value: 17 set 0</code></pre>
          <h4>Common Issues</h4>
          <table style="width:100%; border-collapse:collapse; margin:1rem 0;">
            <tr style="border-bottom:1px solid #30363d;">
              <th style="text-align:left; padding:0.5rem;">Problem</th>
              <th style="text-align:left; padding:0.5rem;">Cause</th>
              <th style="text-align:left; padding:0.5rem;">Solution</th>
            </tr>
            <tr style="border-bottom:1px solid #30363d;">
              <td style="padding:0.5rem;">Permission denied</td>
              <td style="padding:0.5rem;">/dev/gpiochipN owned by root</td>
              <td style="padding:0.5rem;">Add user to <code>gpio</code> group or use udev rules</td>
            </tr>
            <tr style="border-bottom:1px solid #30363d;">
              <td style="padding:0.5rem;">Line busy</td>
              <td style="padding:0.5rem;">Another process or kernel driver holds the line</td>
              <td style="padding:0.5rem;">Check <code>gpioinfo</code> for [used], unbind driver if needed</td>
            </tr>
            <tr style="border-bottom:1px solid #30363d;">
              <td style="padding:0.5rem;">Output not toggling</td>
              <td style="padding:0.5rem;">Pin muxed to alternate function</td>
              <td style="padding:0.5rem;">Check pinctrl settings in device tree / BIOS</td>
            </tr>
            <tr>
              <td style="padding:0.5rem;">Spurious interrupts</td>
              <td style="padding:0.5rem;">Floating input, no debounce</td>
              <td style="padding:0.5rem;">Enable pull-up/down bias, add debounce</td>
            </tr>
          </table>
          <h4>udev Rule for Non-Root GPIO Access</h4>
          <pre><code># /etc/udev/rules.d/99-gpio.rules
SUBSYSTEM=="gpio", KERNEL=="gpiochip*", MODE="0660", GROUP="gpio"

# Create gpio group and add user
sudo groupadd -f gpio
sudo usermod -aG gpio $USER
sudo udevadm control --reload-rules
sudo udevadm trigger</code></pre>
          <p><strong>References:</strong></p>
          <ul>
            <li><a href="https://libgpiod.readthedocs.io/" target="_blank">libgpiod Documentation</a></li>
            <li><a href="https://docs.kernel.org/driver-api/gpio/index.html" target="_blank">Linux Kernel GPIO Documentation</a></li>
            <li><a href="https://docs.kernel.org/admin-guide/gpio/sysfs.html" target="_blank">GPIO sysfs (deprecated) Reference</a></li>
          </ul>
        `
      }
    ]
  }
];
