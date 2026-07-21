/**
 * Linux Tech - Topic Data
 * Each topic defines its card info and learning content sections.
 */
const TOPICS = [
  {
    id: 'filesystem',
    icon: '📁',
    title: '檔案系統',
    description: '了解 Linux 的目錄結構、檔案類型與掛載機制',
    sections: [
      {
        title: '目錄結構總覽',
        content: `
          <p>Linux 採用樹狀目錄結構，一切從根目錄 <code>/</code> 開始：</p>
          <ul>
            <li><code>/bin</code> — 基本使用者指令</li>
            <li><code>/etc</code> — 系統設定檔</li>
            <li><code>/home</code> — 使用者家目錄</li>
            <li><code>/var</code> — 可變資料（日誌、快取）</li>
            <li><code>/tmp</code> — 暫存檔案</li>
            <li><code>/usr</code> — 使用者程式與函式庫</li>
            <li><code>/dev</code> — 裝置檔案</li>
            <li><code>/proc</code> — 虛擬檔案系統（行程資訊）</li>
          </ul>
        `
      },
      {
        title: '常用指令',
        content: `
          <pre><code># 列出檔案（含隱藏檔）
ls -la

# 查看磁碟使用量
df -h

# 查看目錄大小
du -sh /var/log

# 搜尋檔案
find / -name "*.conf" -type f

# 掛載裝置
mount /dev/sdb1 /mnt/usb</code></pre>
        `
      },
      {
        title: '檔案權限',
        content: `
          <p>每個檔案有三組權限：擁有者 (owner)、群組 (group)、其他 (others)。</p>
          <pre><code># 變更權限
chmod 755 script.sh

# 變更擁有者
chown user:group file.txt

# 權限數字對應
# r=4, w=2, x=1
# 755 = rwxr-xr-x</code></pre>
        `
      }
    ]
  },
  {
    id: 'networking',
    icon: '🌐',
    title: '網路管理',
    description: '掌握 IP 設定、防火牆規則與網路除錯工具',
    sections: [
      {
        title: '網路介面設定',
        content: `
          <pre><code># 查看網路介面
ip addr show

# 設定 IP 位址
ip addr add 192.168.1.100/24 dev eth0

# 啟用/停用介面
ip link set eth0 up
ip link set eth0 down

# 查看路由表
ip route show</code></pre>
        `
      },
      {
        title: '網路除錯工具',
        content: `
          <ul>
            <li><code>ping</code> — 測試主機連通性</li>
            <li><code>traceroute</code> — 追蹤封包路徑</li>
            <li><code>netstat / ss</code> — 查看連線與 port 狀態</li>
            <li><code>dig / nslookup</code> — DNS 查詢</li>
            <li><code>curl / wget</code> — HTTP 請求工具</li>
            <li><code>tcpdump</code> — 封包擷取分析</li>
          </ul>
          <pre><code># 查看所有監聽的 port
ss -tlnp

# DNS 查詢
dig example.com

# 抓取封包
tcpdump -i eth0 port 80</code></pre>
        `
      },
      {
        title: '防火牆 (iptables / nftables)',
        content: `
          <pre><code># 查看規則
iptables -L -n

# 允許 SSH
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# 封鎖特定 IP
iptables -A INPUT -s 10.0.0.5 -j DROP

# 使用 ufw (簡易防火牆)
ufw allow 80/tcp
ufw enable</code></pre>
        `
      }
    ]
  },
  {
    id: 'process',
    icon: '⚙️',
    title: '行程管理',
    description: '學習如何監控、控制與排程系統行程',
    sections: [
      {
        title: '行程監控',
        content: `
          <pre><code># 即時系統監控
top
htop

# 列出所有行程
ps aux

# 查看行程樹
pstree

# 搜尋特定行程
pgrep -a nginx</code></pre>
        `
      },
      {
        title: '行程控制',
        content: `
          <pre><code># 傳送訊號
kill -15 PID      # 優雅終止 (SIGTERM)
kill -9 PID       # 強制終止 (SIGKILL)
killall nginx     # 終止所有同名行程

# 背景執行
command &
nohup command &   # 不受終端關閉影響

# 前景/背景切換
Ctrl+Z            # 暫停
bg                # 送到背景
fg                # 拉回前景
jobs              # 列出工作</code></pre>
        `
      },
      {
        title: '排程工作 (Cron)',
        content: `
          <pre><code># 編輯 crontab
crontab -e

# 格式：分 時 日 月 星期 指令
# 每天凌晨 2 點執行備份
0 2 * * * /usr/local/bin/backup.sh

# 每 5 分鐘執行
*/5 * * * * /scripts/health-check.sh

# 查看目前排程
crontab -l</code></pre>
        `
      }
    ]
  },
  {
    id: 'shell',
    icon: '💻',
    title: 'Shell 腳本',
    description: '撰寫自動化腳本，提升工作效率',
    sections: [
      {
        title: '基礎語法',
        content: `
          <pre><code>#!/bin/bash
# 變數
NAME="Linux"
echo "Hello, $NAME"

# 條件判斷
if [ -f "/etc/passwd" ]; then
  echo "檔案存在"
fi

# 迴圈
for i in {1..5}; do
  echo "第 $i 次"
done

# 函式
greet() {
  echo "Hi, $1!"
}
greet "World"</code></pre>
        `
      },
      {
        title: '實用技巧',
        content: `
          <pre><code># 管道與重導向
cat access.log | grep "404" | wc -l
command > output.txt 2>&1

# 字串處理
filename="report_2026.tar.gz"
echo "\${filename%.tar.gz}"  # report_2026
echo "\${filename##*.}"       # gz

# 陣列
arr=("apple" "banana" "cherry")
echo "\${arr[1]}"    # banana
echo "\${#arr[@]}"   # 3

# 讀取使用者輸入
read -p "Enter name: " username
echo "Hello, $username"</code></pre>
        `
      },
      {
        title: '錯誤處理',
        content: `
          <pre><code>#!/bin/bash
set -euo pipefail

# set -e  : 遇到錯誤立即退出
# set -u  : 使用未定義變數時報錯
# set -o pipefail : 管道中任一指令失敗即失敗

trap 'echo "Error on line $LINENO"; exit 1' ERR

# 檢查指令是否存在
if ! command -v docker &> /dev/null; then
  echo "Docker 未安裝"
  exit 1
fi</code></pre>
        `
      }
    ]
  },
  {
    id: 'packages',
    icon: '📦',
    title: '套件管理',
    description: '使用 apt、yum、dnf 等工具管理軟體套件',
    sections: [
      {
        title: 'Debian / Ubuntu (apt)',
        content: `
          <pre><code># 更新套件清單
sudo apt update

# 升級已安裝套件
sudo apt upgrade

# 安裝套件
sudo apt install nginx

# 移除套件
sudo apt remove nginx
sudo apt purge nginx    # 連設定檔一起移除

# 搜尋套件
apt search keyword

# 查看已安裝套件
dpkg -l | grep nginx</code></pre>
        `
      },
      {
        title: 'RHEL / CentOS / Fedora (dnf/yum)',
        content: `
          <pre><code># 安裝套件
sudo dnf install httpd

# 移除套件
sudo dnf remove httpd

# 搜尋套件
dnf search keyword

# 列出已安裝
dnf list installed

# 查看套件資訊
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
    title: '使用者與權限',
    description: '管理帳號、群組與 sudo 設定',
    sections: [
      {
        title: '使用者管理',
        content: `
          <pre><code># 新增使用者
sudo useradd -m -s /bin/bash username
sudo passwd username

# 刪除使用者
sudo userdel -r username

# 修改使用者
sudo usermod -aG docker username  # 加入群組
sudo usermod -s /bin/zsh username # 變更 shell

# 查看使用者資訊
id username
whoami</code></pre>
        `
      },
      {
        title: '群組管理',
        content: `
          <pre><code># 新增群組
sudo groupadd developers

# 將使用者加入群組
sudo usermod -aG developers username

# 查看群組成員
getent group developers

# 刪除群組
sudo groupdel developers</code></pre>
        `
      },
      {
        title: 'sudo 設定',
        content: `
          <p>透過 <code>/etc/sudoers</code> 控制哪些使用者可以執行管理指令：</p>
          <pre><code># 編輯 sudoers（務必使用 visudo）
sudo visudo

# 允許使用者執行所有指令
username ALL=(ALL:ALL) ALL

# 允許群組免密碼執行
%developers ALL=(ALL) NOPASSWD: ALL

# 限制特定指令
username ALL=(ALL) /usr/bin/systemctl restart nginx</code></pre>
        `
      }
    ]
  },
  {
    id: 'systemd',
    icon: '🔧',
    title: 'Systemd 與服務',
    description: '管理系統服務、開機啟動與日誌查詢',
    sections: [
      {
        title: '服務管理',
        content: `
          <pre><code># 啟動/停止/重啟服務
sudo systemctl start nginx
sudo systemctl stop nginx
sudo systemctl restart nginx
sudo systemctl reload nginx

# 開機啟用/停用
sudo systemctl enable nginx
sudo systemctl disable nginx

# 查看服務狀態
systemctl status nginx

# 列出所有服務
systemctl list-units --type=service</code></pre>
        `
      },
      {
        title: '自訂服務',
        content: `
          <p>在 <code>/etc/systemd/system/</code> 建立 unit 檔案：</p>
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
          <pre><code># 重新載入設定
sudo systemctl daemon-reload

# 啟動自訂服務
sudo systemctl enable --now myapp.service</code></pre>
        `
      },
      {
        title: '日誌查詢 (journalctl)',
        content: `
          <pre><code># 查看特定服務日誌
journalctl -u nginx

# 即時追蹤
journalctl -u nginx -f

# 查看最近 1 小時
journalctl --since "1 hour ago"

# 查看開機日誌
journalctl -b

# 依照優先權篩選
journalctl -p err</code></pre>
        `
      }
    ]
  },
  {
    id: 'docker',
    icon: '🐳',
    title: 'Docker 容器',
    description: '學習容器化部署、映像檔管理與 Compose 編排',
    sections: [
      {
        title: '基本操作',
        content: `
          <pre><code># 拉取映像檔
docker pull nginx:latest

# 執行容器
docker run -d -p 8080:80 --name web nginx

# 查看執行中容器
docker ps

# 停止/移除容器
docker stop web
docker rm web

# 查看日誌
docker logs -f web

# 進入容器
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
          <pre><code># 建置映像檔
docker build -t myapp:1.0 .

# 推送到 Registry
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
          <pre><code># 啟動
docker compose up -d

# 查看狀態
docker compose ps

# 停止並移除
docker compose down</code></pre>
        `
      }
    ]
  }
  ,
  {
    id: 'ebpf',
    icon: '🔬',
    title: 'eBPF',
    description: '深入學習 eBPF — 在核心中安全執行自訂程式，實現高效能觀測、網路與安全',
    sections: [
      {
        title: '1. 什麼是 eBPF？',
        content: `
          <p><strong>eBPF (extended Berkeley Packet Filter)</strong> 是一項 Linux 核心技術，允許在不修改核心原始碼、不載入核心模組的前提下，於核心中安全執行使用者自訂的沙箱程式。</p>
          <p>它最初源自封包過濾（BPF），但現在已遠遠超越網路領域，廣泛應用於：</p>
          <ul>
            <li><strong>可觀測性 (Observability)</strong> — 追蹤系統呼叫、函式延遲、I/O 行為</li>
            <li><strong>網路 (Networking)</strong> — 高速封包處理、負載平衡 (如 Cilium)</li>
            <li><strong>安全 (Security)</strong> — 執行期策略強制、異常行為偵測 (如 Falco、Tetragon)</li>
            <li><strong>效能分析 (Profiling)</strong> — CPU flamegraph、記憶體追蹤</li>
          </ul>
          <p>參考資源：<a href="https://ebpf.io/" target="_blank">ebpf.io</a></p>
        `
      },
      {
        title: '2. 核心架構與原理',
        content: `
          <p>一支 eBPF 程式的生命週期：</p>
          <ol>
            <li><strong>撰寫</strong> — 使用受限 C 語言撰寫 eBPF 程式</li>
            <li><strong>編譯</strong> — 透過 Clang/LLVM 編譯為 eBPF bytecode</li>
            <li><strong>驗證 (Verifier)</strong> — 核心驗證器確保程式安全（無無限迴圈、不越界存取、512 byte stack 限制）</li>
            <li><strong>JIT 編譯</strong> — bytecode 被 JIT 編譯為原生機器碼，接近零額外開銷</li>
            <li><strong>掛載 (Attach)</strong> — 掛到指定的 Hook 點執行</li>
          </ol>
          <h4>Hook 類型</h4>
          <ul>
            <li><code>kprobe / kretprobe</code> — 核心函式進入/返回</li>
            <li><code>tracepoint</code> — 核心靜態追蹤點</li>
            <li><code>uprobe / uretprobe</code> — 使用者空間函式追蹤</li>
            <li><code>XDP (eXpress Data Path)</code> — 網路卡驅動層的極早期封包處理</li>
            <li><code>TC (Traffic Control)</code> — 網路流量控制層</li>
            <li><code>perf_event</code> — 硬體/軟體效能事件</li>
            <li><code>LSM (Linux Security Modules)</code> — 安全策略掛勾</li>
          </ul>
          <h4>Maps（資料結構）</h4>
          <p>eBPF Maps 是核心與使用者空間之間的共享資料結構：</p>
          <pre><code>常見 Map 類型：
BPF_MAP_TYPE_HASH         — 雜湊表
BPF_MAP_TYPE_ARRAY        — 陣列
BPF_MAP_TYPE_PERF_EVENT_ARRAY — 事件緩衝區
BPF_MAP_TYPE_RINGBUF      — 高效環形緩衝區
BPF_MAP_TYPE_LRU_HASH     — LRU 淘汰雜湊表</code></pre>
        `
      },
      {
        title: '3. 開發環境建置',
        content: `
          <p>根據你的發行版安裝必要工具：</p>
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

# === 驗證安裝 ===
# 確認核心版本 >= 4.15（建議 5.8+）
uname -r

# 測試 bpftrace
sudo bpftrace -e 'BEGIN { printf("eBPF works!\\n"); exit(); }'</code></pre>
          <p><strong>核心版本建議：</strong></p>
          <ul>
            <li>4.15+ — 基本 eBPF 支援</li>
            <li>5.3+ — BPF trampolines, bounded loops</li>
            <li>5.8+ — ringbuf、CO-RE BTF 完整支援</li>
            <li>5.15+ — 完整 BTF for modules</li>
          </ul>
        `
      },
      {
        title: '4. BCC 工具實戰',
        content: `
          <p><a href="https://github.com/iovisor/bcc" target="_blank">BCC (BPF Compiler Collection)</a> 提供了大量現成的追蹤工具，可直接使用：</p>
          <pre><code># 追蹤行程執行
sudo execsnoop-bpfcc

# 追蹤 TCP 連線
sudo tcpconnect-bpfcc

# 追蹤檔案開啟
sudo opensnoop-bpfcc

# 追蹤 block I/O 延遲
sudo biolatency-bpfcc

# 追蹤高延遲系統呼叫
sudo syscount-bpfcc -L

# 追蹤 DNS 查詢
sudo gethostlatency-bpfcc

# 追蹤 CPU 上的函式 (產生 flamegraph 資料)
sudo profile-bpfcc -F 99 -p PID 10</code></pre>
          <p><strong>bpftrace — 單行追蹤利器：</strong></p>
          <pre><code># 統計系統呼叫次數（按行程）
sudo bpftrace -e 'tracepoint:raw_syscalls:sys_enter { @[comm] = count(); }'

# 追蹤 open() 系統呼叫的檔案名稱
sudo bpftrace -e 'tracepoint:syscalls:sys_enter_openat { printf("%s %s\\n", comm, str(args->filename)); }'

# 統計 VFS read 大小分佈
sudo bpftrace -e 'kprobe:vfs_read { @bytes = hist(arg2); }'

# 追蹤行程排程延遲
sudo bpftrace -e 'tracepoint:sched:sched_wakeup { @[comm] = count(); }'</code></pre>
        `
      },
      {
        title: '5. 用 BCC Python 寫第一支程式',
        content: `
          <p>BCC 提供 Python 前端，讓你可以快速撰寫自訂的 eBPF 程式：</p>
          <pre><code>#!/usr/bin/env python3
# hello_ebpf.py — 追蹤 clone() 系統呼叫（新行程建立）
from bcc import BPF

# eBPF 程式 (C 語言)
bpf_program = """
int hello_world(void *ctx) {
    bpf_trace_printk("Hello eBPF! New process created\\\\n");
    return 0;
}
"""

# 載入並掛載到 clone 系統呼叫
b = BPF(text=bpf_program)
b.attach_kprobe(event=b.get_syscall_fnname("clone"), fn_name="hello_world")

print("Tracing new processes... Ctrl+C to exit")
b.trace_print()</code></pre>

          <p><strong>進階範例 — 統計系統呼叫延遲：</strong></p>
          <pre><code>#!/usr/bin/env python3
# syscall_latency.py — 測量 read() 系統呼叫延遲
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
        dist.log2l(delta / 1000);  // 微秒
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
          <pre><code># 執行
sudo python3 hello_ebpf.py
sudo python3 syscall_latency.py</code></pre>
        `
      },
      {
        title: '6. libbpf + CO-RE 進階開發',
        content: `
          <p>BCC 適合原型開發與除錯，但生產環境建議使用 <strong>libbpf + CO-RE</strong>：</p>
          <table style="width:100%; border-collapse:collapse; margin:1rem 0;">
            <tr style="border-bottom:1px solid #30363d;">
              <th style="text-align:left; padding:0.5rem;">特性</th>
              <th style="text-align:left; padding:0.5rem;">BCC</th>
              <th style="text-align:left; padding:0.5rem;">libbpf + CO-RE</th>
            </tr>
            <tr style="border-bottom:1px solid #30363d;">
              <td style="padding:0.5rem;">編譯時機</td>
              <td style="padding:0.5rem;">執行時 (需 Clang/LLVM)</td>
              <td style="padding:0.5rem;">開發時一次編譯</td>
            </tr>
            <tr style="border-bottom:1px solid #30363d;">
              <td style="padding:0.5rem;">目標機器依賴</td>
              <td style="padding:0.5rem;">需 kernel headers</td>
              <td style="padding:0.5rem;">只需 BTF 資訊</td>
            </tr>
            <tr style="border-bottom:1px solid #30363d;">
              <td style="padding:0.5rem;">啟動速度</td>
              <td style="padding:0.5rem;">慢（需編譯）</td>
              <td style="padding:0.5rem;">快（預編譯 bytecode）</td>
            </tr>
            <tr style="border-bottom:1px solid #30363d;">
              <td style="padding:0.5rem;">資源消耗</td>
              <td style="padding:0.5rem;">高 (Clang ~100MB)</td>
              <td style="padding:0.5rem;">低 (~KB 等級)</td>
            </tr>
            <tr>
              <td style="padding:0.5rem;">適用場景</td>
              <td style="padding:0.5rem;">原型、一次性除錯</td>
              <td style="padding:0.5rem;">生產環境工具</td>
            </tr>
          </table>
          <p><strong>CO-RE (Compile Once, Run Everywhere)</strong> 利用 BTF（BPF Type Format）在載入時自動調整 struct offset，同一個二進位檔可以跑在不同核心版本上。</p>
          <pre><code># 確認核心支援 BTF
ls /sys/kernel/btf/vmlinux

# libbpf 專案結構
my-ebpf-tool/
├── src/
│   ├── tool.bpf.c      # eBPF 核心程式
│   ├── tool.c           # 使用者空間程式
│   └── tool.h           # 共用型別定義
├── Makefile
└── vmlinux.h            # 由 bpftool 產生</code></pre>
          <pre><code># 產生 vmlinux.h（包含所有核心型別）
bpftool btf dump file /sys/kernel/btf/vmlinux format c > vmlinux.h

# 編譯 eBPF 程式
clang -O2 -target bpf -g -c tool.bpf.c -o tool.bpf.o

# 產生 skeleton header
bpftool gen skeleton tool.bpf.o > tool.skel.h</code></pre>
        `
      },
      {
        title: '7. 實戰應用場景',
        content: `
          <h4>🌐 網路 — XDP 高速封包處理</h4>
          <pre><code>// xdp_drop_icmp.bpf.c — 丟棄所有 ICMP 封包
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

          <h4>🔒 安全 — 偵測可疑行為</h4>
          <p>使用 eBPF 監控敏感檔案存取、權限提升等行為，相關專案：</p>
          <ul>
            <li><strong>Falco</strong> — 執行期威脅偵測</li>
            <li><strong>Tetragon</strong> — Cilium 的安全可觀測引擎</li>
            <li><strong>Tracee</strong> — 容器安全追蹤</li>
          </ul>

          <h4>📊 效能分析 — 全方位系統診斷</h4>
          <pre><code># CPU 火焰圖
sudo profile-bpfcc -F 99 30 > profile.out
# 配合 flamegraph.pl 產生 SVG

# I/O 延遲熱力圖
sudo biolatency-bpfcc -m

# 記憶體洩漏追蹤
sudo memleak-bpfcc -p PID

# TCP 重傳追蹤
sudo tcpretrans-bpfcc

# 檔案系統延遲
sudo ext4slower-bpfcc 1</code></pre>

          <h4>📚 學習路線建議</h4>
          <ol>
            <li>先用 <code>bpftrace</code> 寫單行追蹤，培養直覺</li>
            <li>使用 BCC 現成工具診斷真實問題</li>
            <li>用 BCC Python 寫自訂追蹤工具</li>
            <li>學習 libbpf + CO-RE 開發正式工具</li>
            <li>深入特定領域（XDP 網路、LSM 安全）</li>
          </ol>
          <p><strong>推薦閱讀：</strong></p>
          <ul>
            <li><a href="https://ebpf.io/" target="_blank">ebpf.io</a> — 官方入口</li>
            <li><a href="https://github.com/iovisor/bcc" target="_blank">iovisor/bcc</a> — BCC 工具集</li>
            <li>Brendan Gregg《BPF Performance Tools》</li>
            <li>Liz Rice《Learning eBPF》</li>
          </ul>
        `
      }
    ]
  }
];
