/**
 * Topic: Python Programming
 */
const TOPIC_PYTHON_LANG = {
  "id": "python-lang",
  "icon": "🐍",
  "title": "Python Programming",
  "description": "Python for Linux automation, scripting, system administration, and rapid prototyping",
  "sections": [
    {
      "id": "python-for-systems",
      "title": "Python for Systems Programming",
      "content": `
<h3>Python for Systems Programming</h3>
<p>Python is the lingua franca of Linux system administration. Its rich standard library provides direct access to OS primitives, making it ideal for automation scripts, monitoring tools, and system utilities.</p>

<table>
  <thead>
    <tr><th>Module</th><th>Purpose</th><th>Common Use</th></tr>
  </thead>
  <tbody>
    <tr><td>os</td><td>OS interface</td><td>Environment, process info, file operations</td></tr>
    <tr><td>sys</td><td>System-specific</td><td>Args, stdin/stdout, exit codes</td></tr>
    <tr><td>platform</td><td>Platform info</td><td>Distro detection, architecture</td></tr>
    <tr><td>signal</td><td>Signal handling</td><td>Graceful shutdown, SIGHUP reload</td></tr>
    <tr><td>resource</td><td>Resource limits</td><td>ulimit equivalents in Python</td></tr>
    <tr><td>ctypes</td><td>C library access</td><td>Call shared libraries directly</td></tr>
  </tbody>
</table>

<pre><code>#!/usr/bin/env python3
"""System information gathering tool for Linux."""

import os
import sys
import platform
import signal
import resource
import struct
from pathlib import Path

def get_system_info() -> dict:
    """Gather comprehensive system information."""
    return {
        "hostname": platform.node(),
        "kernel": platform.release(),
        "arch": platform.machine(),
        "python": platform.python_version(),
        "distro": get_distro_info(),
        "uptime": get_uptime(),
        "load_avg": os.getloadavg(),
        "cpu_count": os.cpu_count(),
        "uid": os.getuid(),
        "pid": os.getpid(),
    }

def get_distro_info() -> str:
    """Read distro info from os-release."""
    os_release = Path("/etc/os-release")
    if os_release.exists():
        for line in os_release.read_text().splitlines():
            if line.startswith("PRETTY_NAME="):
                return line.split("=", 1)[1].strip('"')
    return "Unknown"

def get_uptime() -> float:
    """Read system uptime from /proc."""
    uptime_str = Path("/proc/uptime").read_text().split()[0]
    return float(uptime_str)

def get_memory_info() -> dict:
    """Parse /proc/meminfo for memory statistics."""
    meminfo = {}
    for line in Path("/proc/meminfo").read_text().splitlines():
        parts = line.split(":")
        if len(parts) == 2:
            key = parts[0].strip()
            value = parts[1].strip().split()[0]  # Value in kB
            meminfo[key] = int(value)
    return {
        "total_mb": meminfo.get("MemTotal", 0) // 1024,
        "free_mb": meminfo.get("MemFree", 0) // 1024,
        "available_mb": meminfo.get("MemAvailable", 0) // 1024,
        "cached_mb": meminfo.get("Cached", 0) // 1024,
    }

# Signal handling for daemons
def setup_signal_handlers():
    """Set up graceful signal handling."""
    def handle_sigterm(signum, frame):
        print(f"\\nReceived signal {signum}, shutting down gracefully...")
        sys.exit(0)

    def handle_sighup(signum, frame):
        print("Received SIGHUP — reloading configuration...")

    signal.signal(signal.SIGTERM, handle_sigterm)
    signal.signal(signal.SIGINT, handle_sigterm)
    signal.signal(signal.SIGHUP, handle_sighup)

# Resource limits
def set_resource_limits():
    """Set process resource limits (equivalent to ulimit)."""
    # Max open files
    soft, hard = resource.getrlimit(resource.RLIMIT_NOFILE)
    print(f"File descriptors: soft={soft}, hard={hard}")

    # Set max memory (512MB)
    resource.setrlimit(resource.RLIMIT_AS, (512 * 1024 * 1024, -1))

if __name__ == "__main__":
    setup_signal_handlers()

    info = get_system_info()
    mem = get_memory_info()

    print(f"System: {info['distro']}")
    print(f"Kernel: {info['kernel']} ({info['arch']})")
    print(f"Uptime: {info['uptime'] / 3600:.1f} hours")
    print(f"Load:   {info['load_avg']}")
    print(f"Memory: {mem['available_mb']}MB available / {mem['total_mb']}MB total")
    print(f"CPUs:   {info['cpu_count']}")
    print(f"PID:    {info['pid']} (UID: {info['uid']})")</code></pre>
      `
    },
    {
      "id": "file-io-pathlib",
      "title": "File I/O & pathlib",
      "content": `
<h3>File I/O & pathlib</h3>
<p>Python's pathlib module provides an object-oriented interface to the filesystem that's both elegant and powerful. Combined with context managers, it makes file operations safe and expressive for Linux scripting.</p>

<table>
  <thead>
    <tr><th>Operation</th><th>pathlib Method</th><th>os.path Equivalent</th></tr>
  </thead>
  <tbody>
    <tr><td>Join paths</td><td>path / "subdir"</td><td>os.path.join()</td></tr>
    <tr><td>Read file</td><td>path.read_text()</td><td>open().read()</td></tr>
    <tr><td>Check exists</td><td>path.exists()</td><td>os.path.exists()</td></tr>
    <tr><td>List directory</td><td>path.iterdir()</td><td>os.listdir()</td></tr>
    <tr><td>Glob pattern</td><td>path.glob("*.py")</td><td>glob.glob()</td></tr>
    <tr><td>File info</td><td>path.stat()</td><td>os.stat()</td></tr>
    <tr><td>Resolve symlinks</td><td>path.resolve()</td><td>os.path.realpath()</td></tr>
  </tbody>
</table>

<pre><code>#!/usr/bin/env python3
"""File operations with pathlib — Linux examples."""

from pathlib import Path
import tempfile
import shutil
import os
import stat
import json
from datetime import datetime
from contextlib import contextmanager

# Basic pathlib operations
home = Path.home()
config_dir = home / ".config" / "myapp"
config_file = config_dir / "settings.json"

def setup_config():
    """Create config directory with proper permissions."""
    config_dir.mkdir(parents=True, exist_ok=True)
    # Set directory permissions (rwx------)
    config_dir.chmod(0o700)

    default_config = {
        "log_level": "info",
        "log_path": str(Path("/var/log/myapp")),
        "pid_file": "/run/myapp.pid",
    }

    if not config_file.exists():
        config_file.write_text(json.dumps(default_config, indent=2))
        config_file.chmod(0o600)  # rw-------

    return json.loads(config_file.read_text())

# Safe file writing with atomic rename
def atomic_write(path: Path, content: str) -> None:
    """Write file atomically to prevent corruption."""
    tmp_path = path.with_suffix(".tmp")
    try:
        tmp_path.write_text(content)
        tmp_path.replace(path)  # Atomic on same filesystem
    except Exception:
        tmp_path.unlink(missing_ok=True)
        raise

# Process /proc filesystem
def list_running_processes() -> list[dict]:
    """List processes by reading /proc."""
    processes = []
    proc = Path("/proc")

    for entry in proc.iterdir():
        if entry.name.isdigit():
            try:
                cmdline = (entry / "cmdline").read_text().replace("\\x00", " ").strip()
                status = {}
                for line in (entry / "status").read_text().splitlines():
                    if ":" in line:
                        key, val = line.split(":", 1)
                        status[key.strip()] = val.strip()

                processes.append({
                    "pid": int(entry.name),
                    "name": status.get("Name", ""),
                    "state": status.get("State", ""),
                    "memory_kb": int(status.get("VmRSS", "0 kB").split()[0]),
                    "cmdline": cmdline[:80],
                })
            except (PermissionError, FileNotFoundError):
                continue

    return sorted(processes, key=lambda p: p["memory_kb"], reverse=True)

# Recursive file search with glob
def find_large_files(directory: Path, min_size_mb: float = 100) -> list[Path]:
    """Find files larger than specified size."""
    min_bytes = int(min_size_mb * 1024 * 1024)
    large_files = []

    for f in directory.rglob("*"):
        try:
            if f.is_file() and f.stat().st_size > min_bytes:
                large_files.append(f)
        except (PermissionError, OSError):
            continue

    return sorted(large_files, key=lambda f: f.stat().st_size, reverse=True)

# Context manager for temporary working directory
@contextmanager
def temp_workspace(prefix: str = "work_"):
    """Create and clean up a temporary workspace."""
    tmp_dir = Path(tempfile.mkdtemp(prefix=prefix))
    try:
        yield tmp_dir
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)

# Log rotation
def rotate_log(log_path: Path, max_files: int = 5):
    """Simple log rotation."""
    if not log_path.exists():
        return

    for i in range(max_files - 1, 0, -1):
        src = log_path.with_suffix(f".{i}")
        dst = log_path.with_suffix(f".{i + 1}")
        if src.exists():
            src.rename(dst)

    log_path.rename(log_path.with_suffix(".1"))
    log_path.touch()

if __name__ == "__main__":
    # Setup and read config
    config = setup_config()
    print(f"Config: {config}")

    # List top 5 memory-consuming processes
    procs = list_running_processes()[:5]
    print("\\nTop processes by memory:")
    for p in procs:
        print(f"  {p['pid']:>6} {p['name']:<20} {p['memory_kb']:>8} kB")

    # Temp workspace demo
    with temp_workspace("demo_") as ws:
        (ws / "output.txt").write_text("Hello from temp workspace")
        print(f"\\nTemp workspace: {ws}")
        print(f"  Files: {list(ws.iterdir())}")</code></pre>
      `
    },
    {
      "id": "subprocess-commands",
      "title": "subprocess & System Commands",
      "content": `
<h3>subprocess & System Commands</h3>
<p>The subprocess module is your bridge to Linux commands from Python. It provides fine-grained control over process execution, I/O redirection, and pipeline construction.</p>

<table>
  <thead>
    <tr><th>Function</th><th>Use Case</th><th>Blocking</th></tr>
  </thead>
  <tbody>
    <tr><td>subprocess.run()</td><td>Run command, wait for completion</td><td>Yes</td></tr>
    <tr><td>subprocess.Popen()</td><td>Full control, streaming I/O</td><td>No (unless .wait())</td></tr>
    <tr><td>subprocess.check_output()</td><td>Capture output, raise on error</td><td>Yes</td></tr>
    <tr><td>subprocess.PIPE</td><td>Redirect stdin/stdout/stderr</td><td>—</td></tr>
    <tr><td>subprocess.DEVNULL</td><td>Discard output</td><td>—</td></tr>
  </tbody>
</table>

<pre><code>#!/usr/bin/env python3
"""subprocess examples for Linux system automation."""

import subprocess
import shlex
import os
import sys
from pathlib import Path
from typing import Optional

def run_cmd(cmd: str, check: bool = True, timeout: int = 30) -> subprocess.CompletedProcess:
    """Run a shell command safely."""
    return subprocess.run(
        shlex.split(cmd),
        capture_output=True,
        text=True,
        check=check,
        timeout=timeout,
    )

def get_disk_usage() -> list[dict]:
    """Get disk usage using df."""
    result = run_cmd("df -h --output=source,size,used,avail,pcent,target -x tmpfs -x devtmpfs")
    lines = result.stdout.strip().splitlines()[1:]  # Skip header

    disks = []
    for line in lines:
        parts = line.split()
        if len(parts) >= 6:
            disks.append({
                "device": parts[0],
                "size": parts[1],
                "used": parts[2],
                "available": parts[3],
                "percent": parts[4],
                "mount": parts[5],
            })
    return disks

def find_listening_ports() -> list[dict]:
    """Find all listening TCP/UDP ports."""
    result = run_cmd("ss -tlnp", check=False)
    ports = []

    for line in result.stdout.strip().splitlines()[1:]:
        parts = line.split()
        if len(parts) >= 5:
            local = parts[3]
            port = local.rsplit(":", 1)[-1]
            process = parts[5] if len(parts) > 5 else ""
            ports.append({"port": port, "address": local, "process": process})

    return ports

# Pipeline — equivalent to: ps aux | grep python | grep -v grep
def find_python_processes() -> str:
    """Chain commands using pipes."""
    ps = subprocess.Popen(
        ["ps", "aux"],
        stdout=subprocess.PIPE,
    )
    grep = subprocess.Popen(
        ["grep", "python"],
        stdin=ps.stdout,
        stdout=subprocess.PIPE,
    )
    grep_v = subprocess.Popen(
        ["grep", "-v", "grep"],
        stdin=grep.stdout,
        stdout=subprocess.PIPE,
        text=True,
    )
    ps.stdout.close()
    grep.stdout.close()

    output, _ = grep_v.communicate()
    return output

# Streaming output for long-running commands
def stream_command(cmd: str):
    """Stream command output line by line."""
    process = subprocess.Popen(
        shlex.split(cmd),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )

    for line in process.stdout:
        print(f"  | {line}", end="")

    process.wait()
    return process.returncode

# Safe command execution with environment
def run_with_env(cmd: str, extra_env: Optional[dict] = None) -> subprocess.CompletedProcess:
    """Run command with modified environment."""
    env = os.environ.copy()
    if extra_env:
        env.update(extra_env)

    return subprocess.run(
        shlex.split(cmd),
        capture_output=True,
        text=True,
        env=env,
    )

# Service management
def systemctl(action: str, service: str) -> bool:
    """Manage systemd services."""
    result = subprocess.run(
        ["systemctl", action, service],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"systemctl {action} {service} failed: {result.stderr}", file=sys.stderr)
    return result.returncode == 0

if __name__ == "__main__":
    # Disk usage
    print("Disk Usage:")
    for disk in get_disk_usage():
        print(f"  {disk['mount']:<20} {disk['used']}/{disk['size']} ({disk['percent']})")

    # Listening ports
    print("\\nListening Ports:")
    for port in find_listening_ports()[:10]:
        print(f"  :{port['port']:<6} {port['process']}")

    # Streaming example
    print("\\nKernel messages (last 5):")
    stream_command("dmesg --time-format=reltime | tail -5")

    # Python processes
    print("\\nPython processes:")
    print(find_python_processes())</code></pre>
      `
    },
    {
      "id": "networking-asyncio",
      "title": "Networking & asyncio",
      "content": `
<h3>Networking & asyncio</h3>
<p>Python's asyncio enables high-performance concurrent networking without threads. Combined with the socket module and libraries like aiohttp, it's ideal for building network tools on Linux.</p>

<table>
  <thead>
    <tr><th>Library</th><th>Purpose</th><th>Async</th></tr>
  </thead>
  <tbody>
    <tr><td>asyncio</td><td>Event loop, coroutines</td><td>Yes</td></tr>
    <tr><td>socket</td><td>Low-level BSD sockets</td><td>No (use asyncio streams)</td></tr>
    <tr><td>aiohttp</td><td>Async HTTP client/server</td><td>Yes</td></tr>
    <tr><td>aiofiles</td><td>Async file I/O</td><td>Yes</td></tr>
    <tr><td>uvloop</td><td>Fast event loop (libuv-based)</td><td>Yes</td></tr>
    <tr><td>httpx</td><td>Modern HTTP client</td><td>Both</td></tr>
  </tbody>
</table>

<pre><code>#!/usr/bin/env python3
"""Async networking examples for Linux."""

import asyncio
import socket
import struct
import time
from pathlib import Path

# TCP port scanner using asyncio
async def scan_port(host: str, port: int, timeout: float = 1.0) -> tuple[int, bool]:
    """Check if a port is open."""
    try:
        _, writer = await asyncio.wait_for(
            asyncio.open_connection(host, port),
            timeout=timeout,
        )
        writer.close()
        await writer.wait_closed()
        return port, True
    except (asyncio.TimeoutError, ConnectionRefusedError, OSError):
        return port, False

async def scan_ports(host: str, ports: range) -> list[int]:
    """Scan multiple ports concurrently."""
    tasks = [scan_port(host, port) for port in ports]
    results = await asyncio.gather(*tasks)
    return [port for port, is_open in results if is_open]

# Simple async echo server
async def handle_client(reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
    """Handle a single client connection."""
    addr = writer.get_extra_info("peername")
    print(f"Connection from {addr}")

    try:
        while True:
            data = await asyncio.wait_for(reader.readline(), timeout=30.0)
            if not data:
                break

            message = data.decode().strip()
            print(f"  [{addr}] {message}")

            response = f"echo: {message}\\n"
            writer.write(response.encode())
            await writer.drain()
    except asyncio.TimeoutError:
        print(f"  [{addr}] Timeout — closing")
    finally:
        writer.close()
        await writer.wait_closed()
        print(f"  [{addr}] Disconnected")

async def start_echo_server(host: str = "127.0.0.1", port: int = 8888):
    """Start an async TCP echo server."""
    server = await asyncio.start_server(handle_client, host, port)
    addr = server.sockets[0].getsockname()
    print(f"Echo server running on {addr}")

    async with server:
        await server.serve_forever()

# Unix domain socket client
async def query_unix_socket(socket_path: str, message: str) -> str:
    """Send a message over a Unix domain socket."""
    reader, writer = await asyncio.open_unix_connection(socket_path)
    writer.write(message.encode() + b"\\n")
    await writer.drain()

    response = await reader.readline()
    writer.close()
    await writer.wait_closed()
    return response.decode().strip()

# Concurrent HTTP health checker
async def check_health(url: str, timeout: float = 5.0) -> dict:
    """Check HTTP endpoint health (using asyncio streams)."""
    from urllib.parse import urlparse
    parsed = urlparse(url)
    host = parsed.hostname
    port = parsed.port or 80

    start = time.monotonic()
    try:
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(host, port),
            timeout=timeout,
        )
        request = f"GET {parsed.path or '/'} HTTP/1.1\\r\\nHost: {host}\\r\\nConnection: close\\r\\n\\r\\n"
        writer.write(request.encode())
        await writer.drain()

        response = await reader.read(1024)
        writer.close()
        await writer.wait_closed()

        elapsed = time.monotonic() - start
        status_line = response.decode().split("\\r\\n")[0]
        return {"url": url, "status": status_line, "time_ms": elapsed * 1000, "healthy": True}
    except Exception as e:
        elapsed = time.monotonic() - start
        return {"url": url, "error": str(e), "time_ms": elapsed * 1000, "healthy": False}

async def health_check_all(urls: list[str]) -> list[dict]:
    """Check multiple endpoints concurrently."""
    tasks = [check_health(url) for url in urls]
    return await asyncio.gather(*tasks)

# Network interface info
def get_network_interfaces() -> dict:
    """Get network interface information from /proc and /sys."""
    interfaces = {}
    net_dir = Path("/sys/class/net")

    for iface in net_dir.iterdir():
        name = iface.name
        interfaces[name] = {
            "state": (iface / "operstate").read_text().strip(),
            "mtu": int((iface / "mtu").read_text().strip()),
            "mac": (iface / "address").read_text().strip(),
        }
        # Read stats
        stats_dir = iface / "statistics"
        if stats_dir.exists():
            interfaces[name]["rx_bytes"] = int((stats_dir / "rx_bytes").read_text().strip())
            interfaces[name]["tx_bytes"] = int((stats_dir / "tx_bytes").read_text().strip())

    return interfaces

if __name__ == "__main__":
    # Show network interfaces
    print("Network Interfaces:")
    for name, info in get_network_interfaces().items():
        rx_mb = info.get("rx_bytes", 0) / (1024 * 1024)
        tx_mb = info.get("tx_bytes", 0) / (1024 * 1024)
        print(f"  {name:<12} state={info['state']:<6} mtu={info['mtu']} "
              f"rx={rx_mb:.1f}MB tx={tx_mb:.1f}MB")

    # Port scan localhost
    print("\\nScanning localhost common ports...")
    open_ports = asyncio.run(scan_ports("127.0.0.1", range(1, 1025)))
    print(f"Open ports: {open_ports}")

    # To run the echo server:
    # asyncio.run(start_echo_server())</code></pre>
      `
    },
    {
      "id": "type-hints-dataclasses",
      "title": "Type Hints & Dataclasses",
      "content": `
<h3>Type Hints & Dataclasses</h3>
<p>Type hints and dataclasses bring structure and documentation to Python code. They enable static analysis with mypy, better IDE support, and reduce boilerplate — especially useful for configuration management and data modeling in system tools.</p>

<table>
  <thead>
    <tr><th>Feature</th><th>Module</th><th>Python Version</th></tr>
  </thead>
  <tbody>
    <tr><td>Type hints</td><td>typing</td><td>3.5+</td></tr>
    <tr><td>dataclasses</td><td>dataclasses</td><td>3.7+</td></tr>
    <tr><td>TypedDict</td><td>typing</td><td>3.8+</td></tr>
    <tr><td>Protocol</td><td>typing</td><td>3.8+</td></tr>
    <tr><td>ParamSpec</td><td>typing</td><td>3.10+</td></tr>
    <tr><td>type statement</td><td>built-in</td><td>3.12+</td></tr>
  </tbody>
</table>

<pre><code>#!/usr/bin/env python3
"""Type hints and dataclasses for Linux system tools."""

from dataclasses import dataclass, field
from typing import Protocol, Optional, TypedDict, Iterator
from enum import Enum, auto
from pathlib import Path
import json
import os

# Enums for type-safe states
class ServiceState(Enum):
    RUNNING = auto()
    STOPPED = auto()
    FAILED = auto()
    UNKNOWN = auto()

class LogLevel(Enum):
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

# Dataclass for configuration
@dataclass
class AppConfig:
    """Application configuration with validation."""
    name: str
    log_level: LogLevel = LogLevel.INFO
    log_path: Path = Path("/var/log")
    pid_file: Path = Path("/run")
    max_connections: int = 100
    bind_address: str = "127.0.0.1"
    bind_port: int = 8080
    workers: int = field(default_factory=lambda: os.cpu_count() or 4)
    allowed_hosts: list[str] = field(default_factory=lambda: ["localhost"])

    def __post_init__(self):
        """Validate configuration after initialization."""
        if self.max_connections < 1:
            raise ValueError("max_connections must be positive")
        if not (1 <= self.bind_port <= 65535):
            raise ValueError(f"Invalid port: {self.bind_port}")
        # Ensure paths exist
        self.log_path = Path(self.log_path)
        self.pid_file = Path(self.pid_file) / f"{self.name}.pid"

    @classmethod
    def from_file(cls, path: Path) -> "AppConfig":
        """Load config from JSON file."""
        data = json.loads(path.read_text())
        data["log_level"] = LogLevel(data.get("log_level", "info"))
        return cls(**data)

    def to_file(self, path: Path) -> None:
        """Save config to JSON file."""
        data = {
            "name": self.name,
            "log_level": self.log_level.value,
            "log_path": str(self.log_path),
            "bind_address": self.bind_address,
            "bind_port": self.bind_port,
            "max_connections": self.max_connections,
            "workers": self.workers,
            "allowed_hosts": self.allowed_hosts,
        }
        path.write_text(json.dumps(data, indent=2))

# Protocol (structural subtyping / duck typing with types)
class Monitorable(Protocol):
    """Any object that can report its health."""
    @property
    def name(self) -> str: ...
    def is_healthy(self) -> bool: ...
    def status(self) -> dict[str, str]: ...

# Dataclass implementing the protocol
@dataclass
class ProcessMonitor:
    """Monitor a running process."""
    name: str
    pid_file: Path
    _pid: Optional[int] = field(default=None, init=False, repr=False)

    @property
    def pid(self) -> Optional[int]:
        if self._pid is None and self.pid_file.exists():
            self._pid = int(self.pid_file.read_text().strip())
        return self._pid

    def is_healthy(self) -> bool:
        pid = self.pid
        if pid is None:
            return False
        try:
            os.kill(pid, 0)  # Check if process exists
            return True
        except ProcessLookupError:
            return False

    def status(self) -> dict[str, str]:
        if self.is_healthy():
            return {"state": "running", "pid": str(self.pid)}
        return {"state": "stopped", "pid": "N/A"}

@dataclass
class DiskMonitor:
    """Monitor disk usage."""
    name: str
    mount_point: Path
    threshold_percent: float = 90.0

    def is_healthy(self) -> bool:
        stat = os.statvfs(self.mount_point)
        used_percent = (1 - stat.f_bavail / stat.f_blocks) * 100
        return used_percent < self.threshold_percent

    def status(self) -> dict[str, str]:
        stat = os.statvfs(self.mount_point)
        used = (1 - stat.f_bavail / stat.f_blocks) * 100
        free_gb = (stat.f_bavail * stat.f_frsize) / (1024**3)
        return {"used_percent": f"{used:.1f}%", "free_gb": f"{free_gb:.1f}GB"}

# TypedDict for structured dictionaries
class ProcessInfo(TypedDict):
    pid: int
    name: str
    state: str
    memory_kb: int

# Generic monitoring function using Protocol
def check_all(monitors: list[Monitorable]) -> dict[str, bool]:
    """Check health of all monitors."""
    return {m.name: m.is_healthy() for m in monitors}

if __name__ == "__main__":
    # Create typed config
    config = AppConfig(
        name="myservice",
        log_level=LogLevel.DEBUG,
        bind_port=9090,
        max_connections=500,
    )
    print(f"Config: {config}")

    # Create monitors
    monitors: list[Monitorable] = [
        DiskMonitor(name="root_disk", mount_point=Path("/")),
        DiskMonitor(name="home_disk", mount_point=Path("/home"), threshold_percent=85.0),
    ]

    # Check health
    health = check_all(monitors)
    for name, healthy in health.items():
        status = "OK" if healthy else "ALERT"
        print(f"  {name}: {status}")</code></pre>
      `
    },
    {
      "id": "packaging-pyproject-venv",
      "title": "Packaging — pyproject.toml & venv",
      "content": `
<h3>Packaging — pyproject.toml & venv</h3>
<p>Modern Python packaging centers on pyproject.toml and virtual environments. This approach ensures reproducible environments and clean dependency isolation — essential for deploying Python tools on Linux servers.</p>

<table>
  <thead>
    <tr><th>Tool</th><th>Purpose</th><th>Configuration</th></tr>
  </thead>
  <tbody>
    <tr><td>venv</td><td>Virtual environments</td><td>Built-in (python -m venv)</td></tr>
    <tr><td>pip</td><td>Package installer</td><td>requirements.txt / pyproject.toml</td></tr>
    <tr><td>pyproject.toml</td><td>Project metadata & build config</td><td>PEP 517/518/621</td></tr>
    <tr><td>setuptools</td><td>Build backend</td><td>pyproject.toml [build-system]</td></tr>
    <tr><td>hatchling</td><td>Modern build backend</td><td>pyproject.toml [build-system]</td></tr>
    <tr><td>pipx</td><td>Install CLI tools in isolation</td><td>pipx install &lt;package&gt;</td></tr>
  </tbody>
</table>

<pre><code># pyproject.toml — Complete project configuration
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "linux-monitor"
version = "1.0.0"
description = "Linux system monitoring tool"
readme = "README.md"
license = {text = "MIT"}
requires-python = ">=3.11"
authors = [
    {name = "Your Name", email = "you@example.com"},
]
keywords = ["linux", "monitoring", "system"]
classifiers = [
    "Development Status :: 4 - Beta",
    "Environment :: Console",
    "Operating System :: POSIX :: Linux",
    "Programming Language :: Python :: 3.11",
    "Programming Language :: Python :: 3.12",
    "Topic :: System :: Monitoring",
]

dependencies = [
    "click>=8.1",
    "rich>=13.0",
    "psutil>=5.9",
    "pydantic>=2.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4",
    "pytest-cov>=4.1",
    "pytest-asyncio>=0.21",
    "mypy>=1.5",
    "ruff>=0.1",
]
docs = [
    "mkdocs>=1.5",
    "mkdocs-material>=9.0",
]

[project.scripts]
linux-monitor = "linux_monitor.cli:main"
lm-check = "linux_monitor.cli:health_check"

[project.urls]
Homepage = "https://github.com/user/linux-monitor"
Documentation = "https://user.github.io/linux-monitor"
Issues = "https://github.com/user/linux-monitor/issues"

# Tool configurations
[tool.ruff]
target-version = "py311"
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "W", "I", "N", "UP", "S", "B", "A", "C4", "PT"]
ignore = ["S101"]  # Allow assert in tests

[tool.mypy]
python_version = "3.11"
strict = true
warn_return_any = true
warn_unused_configs = true

[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
addopts = "-v --cov=linux_monitor --cov-report=term-missing"

[tool.coverage.run]
branch = true
source = ["linux_monitor"]</code></pre>

<h4>Development Workflow</h4>
<pre><code>#!/bin/bash
# Project setup and workflow on Linux

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install project in development mode
pip install -e ".[dev]"

# Project structure
# linux-monitor/
# ├── pyproject.toml
# ├── src/
# │   └── linux_monitor/
# │       ├── __init__.py
# │       ├── cli.py
# │       ├── monitor.py
# │       └── utils.py
# ├── tests/
# │   ├── __init__.py
# │   ├── test_monitor.py
# │   └── test_utils.py
# └── .venv/

# Run tools
ruff check src/ tests/         # Linting
ruff format src/ tests/        # Formatting
mypy src/                      # Type checking
pytest                         # Testing

# Build distribution
pip install build
python -m build                # Creates dist/*.whl and dist/*.tar.gz

# Install globally with pipx
pipx install dist/linux_monitor-1.0.0-py3-none-any.whl

# Create systemd service for the tool
cat > /etc/systemd/system/linux-monitor.service &lt;&lt;EOF
[Unit]
Description=Linux Monitor Service
After=network.target

[Service]
Type=simple
User=monitor
ExecStart=/usr/local/bin/linux-monitor serve
Restart=always
RestartSec=5
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now linux-monitor</code></pre>
      `
    },
    {
      "id": "testing-debugging",
      "title": "Testing & Debugging",
      "content": `
<h3>Testing & Debugging</h3>
<p>Python's testing ecosystem is mature and well-suited for testing system tools. pytest is the standard, offering powerful fixtures, parametrization, and plugins for async code, coverage, and more.</p>

<table>
  <thead>
    <tr><th>Tool</th><th>Purpose</th><th>Install</th></tr>
  </thead>
  <tbody>
    <tr><td>pytest</td><td>Test framework</td><td>pip install pytest</td></tr>
    <tr><td>pytest-cov</td><td>Coverage reporting</td><td>pip install pytest-cov</td></tr>
    <tr><td>pytest-asyncio</td><td>Async test support</td><td>pip install pytest-asyncio</td></tr>
    <tr><td>unittest.mock</td><td>Mocking & patching</td><td>Built-in</td></tr>
    <tr><td>pdb / ipdb</td><td>Interactive debugger</td><td>Built-in / pip install ipdb</td></tr>
    <tr><td>logging</td><td>Structured logging</td><td>Built-in</td></tr>
  </tbody>
</table>

<pre><code># tests/test_monitor.py
"""Tests for Linux monitoring functions."""

import pytest
import asyncio
import os
from pathlib import Path
from unittest.mock import patch, mock_open, MagicMock
from dataclasses import dataclass

# Example module under test
from linux_monitor.monitor import (
    get_memory_info,
    get_cpu_usage,
    check_disk_space,
    scan_ports,
    ProcessMonitor,
)

# Fixtures — reusable test setup
@pytest.fixture
def mock_proc_meminfo():
    """Mock /proc/meminfo content."""
    return """MemTotal:       16384000 kB
MemFree:         4096000 kB
MemAvailable:    8192000 kB
Buffers:          512000 kB
Cached:          3584000 kB
SwapTotal:       8192000 kB
SwapFree:        8192000 kB
"""

@pytest.fixture
def tmp_pid_file(tmp_path):
    """Create a temporary PID file."""
    pid_file = tmp_path / "test.pid"
    pid_file.write_text(str(os.getpid()))
    return pid_file

# Parametrized tests
@pytest.mark.parametrize("meminfo_line,expected_key,expected_value", [
    ("MemTotal:       16384000 kB", "total_mb", 16000),
    ("MemFree:         4096000 kB", "free_mb", 4000),
    ("MemAvailable:    8192000 kB", "available_mb", 8000),
])
def test_parse_meminfo_line(meminfo_line, expected_key, expected_value):
    """Test individual meminfo line parsing."""
    parts = meminfo_line.split(":")
    key = parts[0].strip()
    value_kb = int(parts[1].strip().split()[0])
    value_mb = value_kb // 1024
    assert abs(value_mb - expected_value) < 10

# Mock system files
def test_get_memory_info(mock_proc_meminfo):
    """Test memory info parsing with mocked /proc/meminfo."""
    with patch("pathlib.Path.read_text", return_value=mock_proc_meminfo):
        info = get_memory_info()
        assert info["total_mb"] == 16000
        assert info["available_mb"] == 8000
        assert info["free_mb"] == 4000

# Test process monitoring
class TestProcessMonitor:
    """Test suite for ProcessMonitor."""

    def test_healthy_process(self, tmp_pid_file):
        """Current process should be detected as healthy."""
        monitor = ProcessMonitor(name="test", pid_file=tmp_pid_file)
        assert monitor.is_healthy() is True

    def test_dead_process(self, tmp_path):
        """Non-existent PID should report unhealthy."""
        pid_file = tmp_path / "dead.pid"
        pid_file.write_text("99999999")
        monitor = ProcessMonitor(name="dead", pid_file=pid_file)
        assert monitor.is_healthy() is False

    def test_missing_pid_file(self, tmp_path):
        """Missing PID file should report unhealthy."""
        monitor = ProcessMonitor(name="missing", pid_file=tmp_path / "nope.pid")
        assert monitor.is_healthy() is False

# Async tests
@pytest.mark.asyncio
async def test_scan_ports_localhost():
    """Test port scanning on localhost."""
    # Port 22 might be open (SSH), test basic functionality
    open_ports = await scan_ports("127.0.0.1", range(1, 100))
    assert isinstance(open_ports, list)
    assert all(isinstance(p, int) for p in open_ports)

# Test with temporary files
def test_disk_check(tmp_path):
    """Test disk space checking."""
    result = check_disk_space(tmp_path)
    assert "used_percent" in result
    assert 0 <= result["used_percent"] <= 100

# Exception testing
def test_invalid_config():
    """Test that invalid config raises ValueError."""
    with pytest.raises(ValueError, match="must be positive"):
        AppConfig(name="test", max_connections=-1)

# Debugging tips
def test_with_debugging():
    """Example showing debugging techniques."""
    data = [1, 2, 3, 4, 5]

    # Use breakpoint() to drop into debugger:
    # breakpoint()  # Uncomment to debug

    # Or use pytest --pdb to break on failures
    result = sum(data)
    assert result == 15</code></pre>

<h4>Running Tests & Debugging</h4>
<pre><code># Run all tests with coverage
pytest --cov=linux_monitor --cov-report=html

# Run specific test
pytest tests/test_monitor.py::TestProcessMonitor::test_healthy_process -v

# Drop into debugger on failure
pytest --pdb

# Show print output
pytest -s

# Run with logging visible
pytest --log-cli-level=DEBUG

# Interactive debugging
python -m pdb src/linux_monitor/cli.py
# (Pdb) break monitor.py:42
# (Pdb) continue
# (Pdb) p variable_name
# (Pdb) n  (next line)
# (Pdb) s  (step into)

# Logging configuration for debugging
import logging
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
    handlers=[
        logging.FileHandler("/var/log/myapp/debug.log"),
        logging.StreamHandler(),
    ],
)</code></pre>
      `
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) { module.exports = TOPIC_PYTHON_LANG; }
