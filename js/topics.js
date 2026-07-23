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
  }
];
