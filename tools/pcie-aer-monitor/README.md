# PCIe AER Error Monitor (eBPF)

使用 eBPF 即時監控 PCIe Advanced Error Reporting (AER) 事件，零輪詢開銷。

## 工具列表

| 檔案 | 說明 |
|------|------|
| `pcie_aer_monitor.py` | BCC Python 完整版（含 JSON 輸出、過濾、統計） |
| `pcie_aer_monitor.bt` | bpftrace 精簡版（快速除錯用） |

## 監控的錯誤類型

### Correctable Errors (可修正)
- Receiver Error
- Bad TLP / Bad DLLP
- Replay Timer Timeout
- Advisory Non-Fatal Error
- Corrected Internal Error
- Header Log Overflow

### Uncorrectable Errors (不可修正)
- Data Link Protocol Error
- Surprise Down Error
- Poisoned TLP
- Flow Control Protocol Error
- Completion Timeout
- Completer Abort
- Malformed TLP
- ECRC Error
- Unsupported Request Error
- ACS Violation

## 環境需求

- Linux Kernel >= 4.10
- `CONFIG_PCIEAER=y` (核心需啟用 PCIe AER)
- 韌體需透過 ACPI `_OSC` 授權 OS 處理 AER

### 安裝依賴

```bash
# Ubuntu / Debian
sudo apt install python3-bpfcc bpfcc-tools bpftrace linux-headers-$(uname -r)

# RHEL / Fedora
sudo dnf install python3-bcc bcc-tools bpftrace kernel-devel
```

## 使用方式

### BCC Python 版（完整功能）

```bash
# 監控所有 AER 事件
sudo python3 pcie_aer_monitor.py

# 只看 Fatal 等級
sudo python3 pcie_aer_monitor.py --severity fatal

# JSON 格式輸出（適合 log 管道）
sudo python3 pcie_aer_monitor.py --json | tee pcie_errors.jsonl

# 擷取 10 個事件後結束，並印出統計
sudo python3 pcie_aer_monitor.py --count 10 --summary
```

### bpftrace 版（快速除錯）

```bash
sudo bpftrace pcie_aer_monitor.bt
```

## 輸出範例

### Human-readable 模式
```
[2026-07-21T14:30:15.123] 0000:03:00.0 | Corrected | status=0x00000040
  Errors: Bad TLP
  TLP Header: 04000001 00000100 00000000 00000000

[2026-07-21T14:30:16.456] 0000:05:00.0 | Fatal | status=0x00040000
  Errors: Malformed TLP
  TLP Header: 40000018 01000004 00000000 00000000
```

### JSON 模式
```json
{
  "timestamp": "2026-07-21T14:30:15.123",
  "device": "0000:03:00.0",
  "severity": "Corrected",
  "status_hex": "0x00000040",
  "errors": ["Bad TLP"],
  "tlp_header_valid": true,
  "tlp_header": "04000001 00000100 00000000 00000000"
}
```

## 驗證核心是否支援

```bash
# 確認 AER tracepoint 存在
sudo cat /sys/kernel/debug/tracing/events/ras/aer_event/format

# 確認 AER 驅動已載入
lspci -vvv | grep "Advanced Error Reporting"

# 查看 dmesg 中的 AER 訊息
dmesg | grep -i aer
```

## 與其他工具整合

### 搭配 journalctl
```bash
sudo python3 pcie_aer_monitor.py --json | systemd-cat -t pcie-aer
```

### 搭配 Prometheus (textfile collector)
```bash
sudo python3 pcie_aer_monitor.py --json | \
  jq -r '"pcie_aer_error{device=\"" + .device + "\",severity=\"" + .severity + "\"} 1"' \
  > /var/lib/prometheus/node-exporter/pcie_aer.prom
```

### 搭配 alerting
```bash
# 偵測 Fatal 錯誤時觸發告警
sudo python3 pcie_aer_monitor.py --severity fatal --json | \
  while read line; do
    echo "$line" | logger -t pcie-aer-fatal
    # 發送告警（Slack/PagerDuty/Email）
  done
```

## 原理說明

此工具利用 Linux 核心的 `ras:aer_event` tracepoint，當 PCIe AER 驅動偵測到
硬體錯誤時，核心會觸發此 tracepoint。eBPF 程式掛載在此 tracepoint 上，
即時擷取錯誤資訊並透過 perf buffer 傳回使用者空間。

相比傳統的 dmesg 輪詢或 rasdaemon，eBPF 方式具有：
- **零輪詢** — 事件驅動，無 CPU 浪費
- **低延遲** — 微秒等級的事件通知
- **可程式化** — 可在核心端過濾，減少資料傳輸
- **安全** — 沙箱環境，不影響系統穩定性
