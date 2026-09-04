/**
 * Topic: Go Programming
 */
const TOPIC_GO_LANG = {
  "id": "go-lang",
  "icon": "🐹",
  "title": "Go Programming",
  "description": "Go for cloud-native tools, networking, concurrency, and systems utilities on Linux",
  "sections": [
    {
      "id": "why-go-for-linux-tools",
      "title": "Why Go for Linux Tools",
      "content": `
<h3>Why Go for Linux Tools</h3>
<p>Go has become the language of choice for Linux infrastructure tools. Its static binaries, fast compilation, built-in concurrency, and robust standard library make it ideal for building CLI tools, daemons, and cloud-native applications.</p>

<table>
  <thead>
    <tr><th>Advantage</th><th>Description</th><th>Examples</th></tr>
  </thead>
  <tbody>
    <tr><td>Static binaries</td><td>Single binary, no runtime deps</td><td>Deploy anywhere, container-friendly</td></tr>
    <tr><td>Cross-compilation</td><td>Build for any OS/arch from Linux</td><td>GOOS=linux GOARCH=arm64 go build</td></tr>
    <tr><td>Fast compilation</td><td>Seconds, not minutes</td><td>Rapid iteration on tools</td></tr>
    <tr><td>Goroutines</td><td>Lightweight concurrency</td><td>Thousands of concurrent operations</td></tr>
    <tr><td>Standard library</td><td>Batteries included</td><td>HTTP, crypto, JSON, testing built-in</td></tr>
    <tr><td>Memory safety</td><td>GC + no pointer arithmetic</td><td>Fewer crashes in production</td></tr>
  </tbody>
</table>

<pre><code>// main.go — Linux system info tool
package main

import (
	"bufio"
	"fmt"
	"os"
	"runtime"
	"strconv"
	"strings"
	"syscall"
	"time"
)

// SystemInfo holds basic system information
type SystemInfo struct {
	Hostname    string
	Kernel      string
	Arch        string
	GoVersion   string
	CPUs        int
	Uptime      time.Duration
	MemTotal    uint64
	MemFree     uint64
	LoadAvg     [3]float64
}

func getSystemInfo() (*SystemInfo, error) {
	var info SystemInfo
	var err error

	info.Hostname, err = os.Hostname()
	if err != nil {
		return nil, fmt.Errorf("hostname: %w", err)
	}

	// Read kernel version
	if data, err := os.ReadFile("/proc/sys/kernel/osrelease"); err == nil {
		info.Kernel = strings.TrimSpace(string(data))
	}

	info.Arch = runtime.GOARCH
	info.GoVersion = runtime.Version()
	info.CPUs = runtime.NumCPU()

	// Get uptime using sysinfo syscall
	var sysinfo syscall.Sysinfo_t
	if err := syscall.Sysinfo(&sysinfo); err == nil {
		info.Uptime = time.Duration(sysinfo.Uptime) * time.Second
		info.MemTotal = sysinfo.Totalram
		info.MemFree = sysinfo.Freeram
	}

	// Load average from /proc/loadavg
	if data, err := os.ReadFile("/proc/loadavg"); err == nil {
		fields := strings.Fields(string(data))
		for i := 0; i < 3 && i < len(fields); i++ {
			info.LoadAvg[i], _ = strconv.ParseFloat(fields[i], 64)
		}
	}

	return &info, nil
}

// Parse /proc/meminfo
func getMemoryDetails() map[string]uint64 {
	result := make(map[string]uint64)

	f, err := os.Open("/proc/meminfo")
	if err != nil {
		return result
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Text()
		parts := strings.SplitN(line, ":", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		valueStr := strings.TrimSpace(parts[1])
		valueStr = strings.TrimSuffix(valueStr, " kB")
		if val, err := strconv.ParseUint(strings.TrimSpace(valueStr), 10, 64); err == nil {
			result[key] = val * 1024 // Convert to bytes
		}
	}
	return result
}

func main() {
	info, err := getSystemInfo()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Host:    %s\n", info.Hostname)
	fmt.Printf("Kernel:  %s (%s)\n", info.Kernel, info.Arch)
	fmt.Printf("Go:      %s\n", info.GoVersion)
	fmt.Printf("CPUs:    %d\n", info.CPUs)
	fmt.Printf("Uptime:  %s\n", info.Uptime.Round(time.Second))
	fmt.Printf("Load:    %.2f %.2f %.2f\n",
		info.LoadAvg[0], info.LoadAvg[1], info.LoadAvg[2])
	fmt.Printf("Memory:  %d MB free / %d MB total\n",
		info.MemFree/(1024*1024), info.MemTotal/(1024*1024))

	mem := getMemoryDetails()
	if avail, ok := mem["MemAvailable"]; ok {
		fmt.Printf("Available: %d MB\n", avail/(1024*1024))
	}
}</code></pre>

<h4>Go Installation & Setup on Linux</h4>
<pre><code># Install Go on Linux
wget https://go.dev/dl/go1.22.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.22.0.linux-amd64.tar.gz

# Add to ~/.bashrc or ~/.profile
export PATH=$PATH:/usr/local/go/bin
export GOPATH=$HOME/go
export PATH=$PATH:$GOPATH/bin

# Verify installation
go version
go env

# Initialize a new project
mkdir mylinuxtool && cd mylinuxtool
go mod init github.com/user/mylinuxtool

# Build static binary
CGO_ENABLED=0 go build -ldflags="-s -w" -o mylinuxtool .

# Cross-compile for ARM (Raspberry Pi)
GOOS=linux GOARCH=arm64 go build -o mylinuxtool-arm64 .</code></pre>
      `
    },
    {
      "id": "goroutines-channels",
      "title": "Goroutines & Channels",
      "content": `
<h3>Goroutines & Channels</h3>
<p>Go's concurrency model — goroutines and channels — is one of its defining features. Goroutines are lightweight green threads (a few KB of stack), and channels provide safe communication between them. This maps perfectly to Linux workloads involving parallel I/O, monitoring, and request handling.</p>

<table>
  <thead>
    <tr><th>Primitive</th><th>Purpose</th><th>Usage</th></tr>
  </thead>
  <tbody>
    <tr><td>go func()</td><td>Launch goroutine</td><td>Lightweight concurrent execution</td></tr>
    <tr><td>chan T</td><td>Typed channel</td><td>Communication between goroutines</td></tr>
    <tr><td>select</td><td>Multiplex channels</td><td>Wait on multiple operations</td></tr>
    <tr><td>sync.WaitGroup</td><td>Wait for completion</td><td>Fan-out/fan-in patterns</td></tr>
    <tr><td>sync.Mutex</td><td>Mutual exclusion</td><td>Protect shared state</td></tr>
    <tr><td>context.Context</td><td>Cancellation/timeout</td><td>Propagate deadlines</td></tr>
  </tbody>
</table>

<pre><code>package main

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// Fan-out pattern: watch multiple log files concurrently
type LogEntry struct {
	File    string
	Line    string
	Time    time.Time
}

func watchFile(ctx context.Context, path string, entries chan<- LogEntry) {
	f, err := os.Open(path)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Cannot open %s: %v\\n", path, err)
		return
	}
	defer f.Close()

	// Seek to end
	f.Seek(0, 2)
	scanner := bufio.NewScanner(f)

	for {
		select {
		case <-ctx.Done():
			return
		default:
			if scanner.Scan() {
				entries <- LogEntry{
					File: filepath.Base(path),
					Line: scanner.Text(),
					Time: time.Now(),
				}
			} else {
				time.Sleep(100 * time.Millisecond)
			}
		}
	}
}

// Worker pool pattern
type Task struct {
	ID   int
	Path string
}

type Result struct {
	TaskID    int
	LineCount int
	Err       error
}

func worker(id int, tasks <-chan Task, results chan<- Result, wg *sync.WaitGroup) {
	defer wg.Done()
	for task := range tasks {
		count, err := countLines(task.Path)
		results <- Result{TaskID: task.ID, LineCount: count, Err: err}
	}
}

func countLines(path string) (int, error) {
	f, err := os.Open(path)
	if err != nil {
		return 0, err
	}
	defer f.Close()

	count := 0
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		count++
	}
	return count, scanner.Err()
}

// Pipeline pattern: producer -> transformer -> consumer
func producer(ctx context.Context, dir string) <-chan string {
	out := make(chan string)
	go func() {
		defer close(out)
		entries, _ := os.ReadDir(dir)
		for _, entry := range entries {
			select {
			case <-ctx.Done():
				return
			case out <- filepath.Join(dir, entry.Name()):
			}
		}
	}()
	return out
}

func filter(ctx context.Context, in <-chan string, suffix string) <-chan string {
	out := make(chan string)
	go func() {
		defer close(out)
		for path := range in {
			if strings.HasSuffix(path, suffix) {
				select {
				case <-ctx.Done():
					return
				case out <- path:
				}
			}
		}
	}()
	return out
}

// Rate limiter using channels
func rateLimiter(rate int) <-chan time.Time {
	limiter := make(chan time.Time, rate)
	go func() {
		ticker := time.NewTicker(time.Second / time.Duration(rate))
		defer ticker.Stop()
		for t := range ticker.C {
			limiter <- t
		}
	}()
	return limiter
}

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Worker pool: count lines in /etc files
	tasks := make(chan Task, 100)
	results := make(chan Result, 100)
	var wg sync.WaitGroup

	// Start workers
	numWorkers := 4
	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go worker(i, tasks, results, &wg)
	}

	// Send tasks
	go func() {
		entries, _ := os.ReadDir("/etc")
		for i, entry := range entries {
			if !entry.IsDir() {
				path := filepath.Join("/etc", entry.Name())
				tasks <- Task{ID: i, Path: path}
			}
		}
		close(tasks)
	}()

	// Collect results
	go func() {
		wg.Wait()
		close(results)
	}()

	totalLines := 0
	fileCount := 0
	for result := range results {
		if result.Err == nil {
			totalLines += result.LineCount
			fileCount++
		}
	}
	fmt.Printf("Counted %d lines across %d files in /etc\\n", totalLines, fileCount)

	// Pipeline: find and filter files
	files := producer(ctx, "/etc")
	confFiles := filter(ctx, files, ".conf")
	for path := range confFiles {
		fmt.Printf("  Config: %s\\n", path)
	}
}</code></pre>
      `
    },
    {
      "id": "error-handling-interfaces",
      "title": "Error Handling & Interfaces",
      "content": `
<h3>Error Handling & Interfaces</h3>
<p>Go's explicit error handling and interface system promote clear, maintainable code. Errors are values that can be wrapped and inspected, while interfaces enable polymorphism without inheritance — perfect for composable system tools.</p>

<table>
  <thead>
    <tr><th>Pattern</th><th>Function</th><th>Use Case</th></tr>
  </thead>
  <tbody>
    <tr><td>errors.New()</td><td>Create simple error</td><td>Static error messages</td></tr>
    <tr><td>fmt.Errorf("%w")</td><td>Wrap error with context</td><td>Add context to errors</td></tr>
    <tr><td>errors.Is()</td><td>Check error identity</td><td>Match sentinel errors</td></tr>
    <tr><td>errors.As()</td><td>Extract typed error</td><td>Get error details</td></tr>
    <tr><td>Custom error types</td><td>Implement error interface</td><td>Structured error info</td></tr>
  </tbody>
</table>

<pre><code>package main

import (
	"errors"
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"
	"syscall"
)

// Sentinel errors
var (
	ErrNotFound     = errors.New("not found")
	ErrPermission   = errors.New("permission denied")
	ErrInvalidInput = errors.New("invalid input")
)

// Custom error type with context
type ProcessError struct {
	PID int
	Op  string
	Err error
}

func (e *ProcessError) Error() string {
	return fmt.Sprintf("process %d: %s: %v", e.PID, e.Op, e.Err)
}

func (e *ProcessError) Unwrap() error {
	return e.Err
}

// Interface: anything that can report its status
type HealthChecker interface {
	Name() string
	Check() error
}

// Interface: system resource monitor
type ResourceMonitor interface {
	HealthChecker
	Usage() (used, total uint64)
	Alert() bool
}

// Concrete implementation: disk monitor
type DiskMonitor struct {
	MountPoint string
	Threshold  float64
}

func (d *DiskMonitor) Name() string {
	return fmt.Sprintf("disk:%s", d.MountPoint)
}

func (d *DiskMonitor) Check() error {
	var stat syscall.Statfs_t
	if err := syscall.Statfs(d.MountPoint, &stat); err != nil {
		return fmt.Errorf("statfs %s: %w", d.MountPoint, err)
	}
	usedPercent := 1.0 - float64(stat.Bavail)/float64(stat.Blocks)
	if usedPercent > d.Threshold {
		return fmt.Errorf("disk usage %.1f%% exceeds threshold %.1f%%",
			usedPercent*100, d.Threshold*100)
	}
	return nil
}

func (d *DiskMonitor) Usage() (used, total uint64) {
	var stat syscall.Statfs_t
	if err := syscall.Statfs(d.MountPoint, &stat); err != nil {
		return 0, 0
	}
	total = stat.Blocks * uint64(stat.Bsize)
	free := stat.Bavail * uint64(stat.Bsize)
	used = total - free
	return used, total
}

func (d *DiskMonitor) Alert() bool {
	return d.Check() != nil
}

// Concrete implementation: process monitor
type ProcMonitor struct {
	ProcessName string
}

func (p *ProcMonitor) Name() string {
	return fmt.Sprintf("proc:%s", p.ProcessName)
}

func (p *ProcMonitor) Check() error {
	pid, err := findProcess(p.ProcessName)
	if err != nil {
		return &ProcessError{PID: 0, Op: "find", Err: err}
	}
	// Check if process is alive
	proc, err := os.FindProcess(pid)
	if err != nil {
		return &ProcessError{PID: pid, Op: "open", Err: err}
	}
	// Signal 0 checks existence without killing
	if err := proc.Signal(syscall.Signal(0)); err != nil {
		return &ProcessError{PID: pid, Op: "signal", Err: ErrNotFound}
	}
	return nil
}

func findProcess(name string) (int, error) {
	entries, err := os.ReadDir("/proc")
	if err != nil {
		return 0, fmt.Errorf("read /proc: %w", err)
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		pid, err := strconv.Atoi(entry.Name())
		if err != nil {
			continue
		}
		comm, err := os.ReadFile(fmt.Sprintf("/proc/%d/comm", pid))
		if err != nil {
			continue
		}
		if strings.TrimSpace(string(comm)) == name {
			return pid, nil
		}
	}
	return 0, fmt.Errorf("%s: %w", name, ErrNotFound)
}

// Generic health check runner — uses interface
func runHealthChecks(checkers []HealthChecker, w io.Writer) int {
	failures := 0
	for _, checker := range checkers {
		if err := checker.Check(); err != nil {
			fmt.Fprintf(w, "FAIL %s: %v\\n", checker.Name(), err)
			failures++

			// Inspect error type
			var procErr *ProcessError
			if errors.As(err, &procErr) {
				fmt.Fprintf(w, "     (process error, PID: %d, op: %s)\\n",
					procErr.PID, procErr.Op)
			}
			if errors.Is(err, ErrNotFound) {
				fmt.Fprintf(w, "     (resource not found)\\n")
			}
		} else {
			fmt.Fprintf(w, "OK   %s\\n", checker.Name())
		}
	}
	return failures
}

func main() {
	checkers := []HealthChecker{
		&DiskMonitor{MountPoint: "/", Threshold: 0.95},
		&DiskMonitor{MountPoint: "/home", Threshold: 0.90},
		&ProcMonitor{ProcessName: "systemd"},
		&ProcMonitor{ProcessName: "sshd"},
	}

	fmt.Println("=== Health Check Report ===")
	failures := runHealthChecks(checkers, os.Stdout)
	fmt.Printf("\\nResult: %d checks passed, %d failed\\n",
		len(checkers)-failures, failures)

	if failures > 0 {
		os.Exit(1)
	}
}</code></pre>
      `
    },
    {
      "id": "cli-tools-system-interaction",
      "title": "CLI Tools & System Interaction",
      "content": `
<h3>CLI Tools & System Interaction</h3>
<p>Go excels at building CLI tools for Linux. The cobra library provides a battle-tested framework, while Go's os/exec and syscall packages give direct access to Linux system calls and process management.</p>

<table>
  <thead>
    <tr><th>Package</th><th>Purpose</th><th>Common Use</th></tr>
  </thead>
  <tbody>
    <tr><td>os</td><td>OS functionality</td><td>Files, env vars, process info</td></tr>
    <tr><td>os/exec</td><td>Run external commands</td><td>Shell commands, pipelines</td></tr>
    <tr><td>os/signal</td><td>Signal handling</td><td>Graceful shutdown</td></tr>
    <tr><td>syscall</td><td>Low-level syscalls</td><td>mount, chroot, namespaces</td></tr>
    <tr><td>flag / pflag</td><td>Argument parsing</td><td>CLI flags and options</td></tr>
    <tr><td>cobra</td><td>CLI framework</td><td>Subcommands, help, completion</td></tr>
  </tbody>
</table>

<pre><code>package main

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"
)

// Graceful shutdown with signal handling
func setupSignalHandler() context.Context {
	ctx, cancel := context.WithCancel(context.Background())

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM, syscall.SIGHUP)

	go func() {
		sig := <-sigCh
		fmt.Fprintf(os.Stderr, "\\nReceived %v, shutting down...\\n", sig)
		cancel()
	}()

	return ctx
}

// Execute command with timeout and streaming output
func execWithTimeout(ctx context.Context, name string, args ...string) error {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			return fmt.Errorf("command timed out: %s", name)
		}
		return fmt.Errorf("command failed: %w", err)
	}
	return nil
}

// Capture command output
func captureOutput(name string, args ...string) (string, error) {
	cmd := exec.Command(name, args...)
	output, err := cmd.Output()
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			return "", fmt.Errorf("%s failed (exit %d): %s",
				name, exitErr.ExitCode(), string(exitErr.Stderr))
		}
		return "", err
	}
	return strings.TrimSpace(string(output)), nil
}

// Pipeline: equivalent to "journalctl -u sshd | grep Failed | tail -5"
func pipeline(ctx context.Context) (string, error) {
	journal := exec.CommandContext(ctx, "journalctl", "-u", "sshd", "--no-pager", "-n", "100")
	grep := exec.CommandContext(ctx, "grep", "Failed")
	tail := exec.CommandContext(ctx, "tail", "-5")

	// Connect pipes
	var err error
	grep.Stdin, err = journal.StdoutPipe()
	if err != nil {
		return "", err
	}
	tail.Stdin, err = grep.StdoutPipe()
	if err != nil {
		return "", err
	}

	var output strings.Builder
	tail.Stdout = &output

	// Start in reverse order
	if err := tail.Start(); err != nil {
		return "", err
	}
	if err := grep.Start(); err != nil {
		return "", err
	}
	if err := journal.Start(); err != nil {
		return "", err
	}

	// Wait for all
	journal.Wait()
	grep.Wait()
	tail.Wait()

	return output.String(), nil
}

// Watch a file for changes (like tail -f)
func tailFile(ctx context.Context, path string, w io.Writer) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()

	// Seek to end
	f.Seek(0, io.SeekEnd)
	reader := bufio.NewReader(f)

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			line, err := reader.ReadString('\\n')
			if err != nil {
				time.Sleep(100 * time.Millisecond)
				continue
			}
			fmt.Fprint(w, line)
		}
	}
}

// Find files matching pattern (like find command)
func findFiles(root string, pattern string, maxDepth int) ([]string, error) {
	var matches []string
	rootDepth := strings.Count(root, string(filepath.Separator))

	err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil // Skip permission errors
		}
		depth := strings.Count(path, string(filepath.Separator)) - rootDepth
		if depth > maxDepth {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}
		if matched, _ := filepath.Match(pattern, info.Name()); matched {
			matches = append(matches, path)
		}
		return nil
	})

	return matches, err
}

// Daemon PID file management
type PIDFile struct {
	Path string
}

func NewPIDFile(path string) (*PIDFile, error) {
	pf := &PIDFile{Path: path}
	pid := os.Getpid()
	if err := os.WriteFile(path, []byte(fmt.Sprintf("%d", pid)), 0644); err != nil {
		return nil, fmt.Errorf("write pid file: %w", err)
	}
	return pf, nil
}

func (pf *PIDFile) Remove() error {
	return os.Remove(pf.Path)
}

func main() {
	ctx := setupSignalHandler()

	// System info via commands
	kernel, _ := captureOutput("uname", "-r")
	hostname, _ := captureOutput("hostname")
	fmt.Printf("Host: %s (kernel %s)\\n", hostname, kernel)

	// Find config files
	configs, _ := findFiles("/etc", "*.conf", 2)
	fmt.Printf("\\nConfig files in /etc (depth 2): %d\\n", len(configs))
	for _, c := range configs[:min(5, len(configs))] {
		fmt.Printf("  %s\\n", c)
	}

	// Execute with timeout
	fmt.Println("\\nDisk usage:")
	execWithTimeout(ctx, "df", "-h", "--total", "-x", "tmpfs")

	fmt.Println("\\nDone.")
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}</code></pre>
      `
    },
    {
      "id": "networking-http-servers",
      "title": "Networking & HTTP Servers",
      "content": `
<h3>Networking & HTTP Servers</h3>
<p>Go's net/http package is production-ready out of the box — no framework needed. Combined with the net package for raw sockets and the standard TLS support, Go is the go-to language for networking tools on Linux.</p>

<table>
  <thead>
    <tr><th>Package</th><th>Purpose</th><th>Features</th></tr>
  </thead>
  <tbody>
    <tr><td>net/http</td><td>HTTP client/server</td><td>HTTP/2, TLS, middleware</td></tr>
    <tr><td>net</td><td>Low-level networking</td><td>TCP, UDP, Unix sockets</td></tr>
    <tr><td>net/url</td><td>URL parsing</td><td>Query params, encoding</td></tr>
    <tr><td>crypto/tls</td><td>TLS connections</td><td>Cert loading, mTLS</td></tr>
    <tr><td>encoding/json</td><td>JSON handling</td><td>Marshal/unmarshal</td></tr>
    <tr><td>net/http/httputil</td><td>HTTP utilities</td><td>Reverse proxy, dump</td></tr>
  </tbody>
</table>

<pre><code>package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"sync"
	"syscall"
	"time"
)

// Response types
type HealthResponse struct {
	Status    string    \`json:"status"\`
	Uptime    string    \`json:"uptime"\`
	GoVersion string    \`json:"go_version"\`
	Goroutines int      \`json:"goroutines"\`
	Timestamp time.Time \`json:"timestamp"\`
}

type MetricsResponse struct {
	MemAlloc      uint64 \`json:"mem_alloc_bytes"\`
	MemTotal      uint64 \`json:"mem_total_alloc_bytes"\`
	NumGC         uint32 \`json:"num_gc"\`
	NumGoroutines int    \`json:"num_goroutines"\`
	NumCPU        int    \`json:"num_cpu"\`
}

// Middleware: logging
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %s %v", r.Method, r.URL.Path, r.RemoteAddr, time.Since(start))
	})
}

// Middleware: rate limiting per IP
type RateLimiter struct {
	mu       sync.Mutex
	visitors map[string]*visitor
	rate     int
	burst    int
}

type visitor struct {
	tokens   int
	lastSeen time.Time
}

func NewRateLimiter(rate, burst int) *RateLimiter {
	rl := &RateLimiter{
		visitors: make(map[string]*visitor),
		rate:     rate,
		burst:    burst,
	}
	// Cleanup old entries periodically
	go func() {
		for range time.Tick(time.Minute) {
			rl.mu.Lock()
			for ip, v := range rl.visitors {
				if time.Since(v.lastSeen) > 3*time.Minute {
					delete(rl.visitors, ip)
				}
			}
			rl.mu.Unlock()
		}
	}()
	return rl
}

func (rl *RateLimiter) Allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	v, exists := rl.visitors[ip]
	if !exists {
		rl.visitors[ip] = &visitor{tokens: rl.burst - 1, lastSeen: time.Now()}
		return true
	}
	v.lastSeen = time.Now()
	if v.tokens > 0 {
		v.tokens--
		return true
	}
	return false
}

// TCP port checker
func checkPort(host string, port int, timeout time.Duration) bool {
	addr := fmt.Sprintf("%s:%d", host, port)
	conn, err := net.DialTimeout("tcp", addr, timeout)
	if err != nil {
		return false
	}
	conn.Close()
	return true
}

// Unix socket server (for local IPC)
func startUnixSocket(ctx context.Context, path string) error {
	os.Remove(path) // Clean up old socket

	listener, err := net.Listen("unix", path)
	if err != nil {
		return err
	}
	defer listener.Close()
	defer os.Remove(path)

	// Set socket permissions
	os.Chmod(path, 0660)

	go func() {
		<-ctx.Done()
		listener.Close()
	}()

	for {
		conn, err := listener.Accept()
		if err != nil {
			if ctx.Err() != nil {
				return nil
			}
			continue
		}
		go handleUnixConn(conn)
	}
}

func handleUnixConn(conn net.Conn) {
	defer conn.Close()
	conn.Write([]byte("OK\\n"))
}

func main() {
	startTime := time.Now()
	limiter := NewRateLimiter(10, 20)

	mux := http.NewServeMux()

	// Health endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		resp := HealthResponse{
			Status:     "healthy",
			Uptime:     time.Since(startTime).Round(time.Second).String(),
			GoVersion:  runtime.Version(),
			Goroutines: runtime.NumGoroutine(),
			Timestamp:  time.Now(),
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	})

	// Metrics endpoint
	mux.HandleFunc("/metrics", func(w http.ResponseWriter, r *http.Request) {
		var mem runtime.MemStats
		runtime.ReadMemStats(&mem)

		resp := MetricsResponse{
			MemAlloc:      mem.Alloc,
			MemTotal:      mem.TotalAlloc,
			NumGC:         mem.NumGC,
			NumGoroutines: runtime.NumGoroutine(),
			NumCPU:        runtime.NumCPU(),
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	})

	// Rate-limited endpoint
	mux.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) {
		ip, _, _ := net.SplitHostPort(r.RemoteAddr)
		if !limiter.Allow(ip) {
			http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
			return
		}
		fmt.Fprintf(w, "Hello from %s\\n", r.URL.Path)
	})

	// Create server with timeouts
	server := &http.Server{
		Addr:         ":8080",
		Handler:      loggingMiddleware(mux),
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// Graceful shutdown
	ctx, cancel := signal.NotifyContext(context.Background(),
		syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	go func() {
		log.Printf("Server starting on %s", server.Addr)
		if err := server.ListenAndServe(); err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	<-ctx.Done()
	log.Println("Shutting down...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()
	server.Shutdown(shutdownCtx)
	log.Println("Server stopped")
}</code></pre>
      `
    },
    {
      "id": "testing-benchmarking",
      "title": "Testing & Benchmarking",
      "content": `
<h3>Testing & Benchmarking</h3>
<p>Go has testing built into the language and toolchain. The testing package provides unit tests, benchmarks, fuzz testing, and examples — all run with <code>go test</code>. No external framework needed.</p>

<table>
  <thead>
    <tr><th>Feature</th><th>Function Prefix</th><th>Command</th></tr>
  </thead>
  <tbody>
    <tr><td>Unit tests</td><td>Test*(t *testing.T)</td><td>go test ./...</td></tr>
    <tr><td>Benchmarks</td><td>Benchmark*(b *testing.B)</td><td>go test -bench=.</td></tr>
    <tr><td>Fuzz tests</td><td>Fuzz*(f *testing.F)</td><td>go test -fuzz=FuzzName</td></tr>
    <tr><td>Examples</td><td>Example*()</td><td>go test (validated output)</td></tr>
    <tr><td>Table-driven</td><td>Subtests with t.Run()</td><td>go test -run=TestName/subtest</td></tr>
    <tr><td>Test helpers</td><td>t.Helper()</td><td>Clean stack traces</td></tr>
  </tbody>
</table>

<pre><code>// monitor_test.go
package monitor

import (
	"context"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"testing"
	"time"
)

// Table-driven tests
func TestParseMemInfo(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		wantKey  string
		wantVal  uint64
		wantErr  bool
	}{
		{
			name:    "valid MemTotal",
			input:   "MemTotal:       16384000 kB",
			wantKey: "MemTotal",
			wantVal: 16384000 * 1024,
		},
		{
			name:    "valid MemFree",
			input:   "MemFree:         4096000 kB",
			wantKey: "MemFree",
			wantVal: 4096000 * 1024,
		},
		{
			name:    "invalid format",
			input:   "not a valid line",
			wantErr: true,
		},
		{
			name:    "empty input",
			input:   "",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			key, val, err := parseMemInfoLine(tt.input)
			if tt.wantErr {
				if err == nil {
					t.Errorf("expected error, got key=%s val=%d", key, val)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if key != tt.wantKey {
				t.Errorf("key = %q, want %q", key, tt.wantKey)
			}
			if val != tt.wantVal {
				t.Errorf("val = %d, want %d", val, tt.wantVal)
			}
		})
	}
}

// Test with temporary files
func TestPIDFile(t *testing.T) {
	dir := t.TempDir() // Auto-cleaned up
	pidPath := filepath.Join(dir, "test.pid")

	pf, err := NewPIDFile(pidPath)
	if err != nil {
		t.Fatalf("NewPIDFile: %v", err)
	}

	// Verify PID file exists
	data, err := os.ReadFile(pidPath)
	if err != nil {
		t.Fatalf("ReadFile: %v", err)
	}

	if got := string(data); got != fmt.Sprintf("%d", os.Getpid()) {
		t.Errorf("PID = %q, want %q", got, fmt.Sprintf("%d", os.Getpid()))
	}

	// Cleanup
	if err := pf.Remove(); err != nil {
		t.Errorf("Remove: %v", err)
	}
}

// Test helper functions
func assertNoError(t *testing.T, err error) {
	t.Helper()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func assertEqual[T comparable](t *testing.T, got, want T) {
	t.Helper()
	if got != want {
		t.Errorf("got %v, want %v", got, want)
	}
}

// Integration test with real TCP server
func TestPortScanner(t *testing.T) {
	// Start a test server
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("Listen: %v", err)
	}
	defer listener.Close()

	port := listener.Addr().(*net.TCPAddr).Port

	go func() {
		for {
			conn, err := listener.Accept()
			if err != nil {
				return
			}
			conn.Close()
		}
	}()

	// Test scanner finds our port
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	open := scanPort(ctx, "127.0.0.1", port, time.Second)
	if !open {
		t.Errorf("port %d should be open", port)
	}

	// Test closed port
	closed := scanPort(ctx, "127.0.0.1", port+1, 100*time.Millisecond)
	if closed {
		t.Errorf("port %d should be closed", port+1)
	}
}

// Benchmark
func BenchmarkParseMemInfo(b *testing.B) {
	line := "MemTotal:       16384000 kB"
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		parseMemInfoLine(line)
	}
}

func BenchmarkReadProcStat(b *testing.B) {
	for i := 0; i < b.N; i++ {
		data, _ := os.ReadFile("/proc/stat")
		_ = data
	}
}

// Fuzz test (Go 1.18+)
func FuzzParseMemInfo(f *testing.F) {
	// Seed corpus
	f.Add("MemTotal:       16384000 kB")
	f.Add("MemFree:         4096000 kB")
	f.Add("Buffers:          512000 kB")

	f.Fuzz(func(t *testing.T, input string) {
		// Should not panic on any input
		_, _, _ = parseMemInfoLine(input)
	})
}</code></pre>

<h4>Running Tests</h4>
<pre><code># Run all tests
go test ./...

# Verbose with coverage
go test -v -cover ./...

# Run specific test
go test -run TestParseMemInfo/valid -v

# Benchmarks
go test -bench=. -benchmem ./...

# Fuzz testing (runs until stopped or failure found)
go test -fuzz=FuzzParseMemInfo -fuzztime=30s

# Race detector (finds data races)
go test -race ./...

# Coverage report
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out -o coverage.html

# CPU profiling
go test -cpuprofile=cpu.prof -bench=BenchmarkReadProcStat
go tool pprof cpu.prof</code></pre>
      `
    },
    {
      "id": "project-structure-build",
      "title": "Project Structure & Build",
      "content": `
<h3>Project Structure & Build</h3>
<p>Go projects follow conventions that make code predictable and easy to navigate. A well-structured Go project builds reliably, cross-compiles easily, and deploys as a single static binary — ideal for Linux infrastructure.</p>

<table>
  <thead>
    <tr><th>Directory</th><th>Purpose</th><th>Convention</th></tr>
  </thead>
  <tbody>
    <tr><td>cmd/</td><td>Entry points</td><td>One subdir per binary</td></tr>
    <tr><td>internal/</td><td>Private packages</td><td>Cannot be imported externally</td></tr>
    <tr><td>pkg/</td><td>Public libraries</td><td>Safe for external use</td></tr>
    <tr><td>api/</td><td>API definitions</td><td>OpenAPI, protobuf schemas</td></tr>
    <tr><td>configs/</td><td>Config templates</td><td>Default configurations</td></tr>
    <tr><td>scripts/</td><td>Build/deploy scripts</td><td>Makefiles, shell scripts</td></tr>
  </tbody>
</table>

<pre><code># Project layout for a Linux monitoring tool
# github.com/user/linuxmon/
# ├── cmd/
# │   ├── linuxmon/           # Main daemon binary
# │   │   └── main.go
# │   └── lmctl/              # CLI control tool
# │       └── main.go
# ├── internal/
# │   ├── config/             # Configuration loading
# │   │   ├── config.go
# │   │   └── config_test.go
# │   ├── monitor/            # Core monitoring logic
# │   │   ├── cpu.go
# │   │   ├── disk.go
# │   │   ├── memory.go
# │   │   └── monitor_test.go
# │   └── server/             # HTTP/gRPC server
# │       ├── handler.go
# │       ├── middleware.go
# │       └── server.go
# ├── pkg/
# │   └── procfs/             # /proc filesystem parser (reusable)
# │       ├── meminfo.go
# │       ├── stat.go
# │       └── procfs_test.go
# ├── configs/
# │   ├── linuxmon.yaml       # Default config
# │   └── linuxmon.service    # systemd unit file
# ├── scripts/
# │   ├── build.sh
# │   └── install.sh
# ├── go.mod
# ├── go.sum
# ├── Makefile
# └── Dockerfile</code></pre>

<h4>go.mod — Module Definition</h4>
<pre><code>// go.mod
module github.com/user/linuxmon

go 1.22

require (
    github.com/spf13/cobra v1.8.0
    github.com/spf13/viper v1.18.0
    github.com/prometheus/client_golang v1.18.0
    golang.org/x/sys v0.16.0
    gopkg.in/yaml.v3 v3.0.1
)</code></pre>

<h4>Makefile — Build Automation</h4>
<pre><code># Makefile for Go Linux project
APP_NAME := linuxmon
VERSION := $(shell git describe --tags --always --dirty)
BUILD_TIME := $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")
LDFLAGS := -s -w \\
    -X main.version=$(VERSION) \\
    -X main.buildTime=$(BUILD_TIME)

.PHONY: all build test lint clean install

all: lint test build

build:
	CGO_ENABLED=0 go build -ldflags="$(LDFLAGS)" -o bin/$(APP_NAME) ./cmd/linuxmon/
	CGO_ENABLED=0 go build -ldflags="$(LDFLAGS)" -o bin/lmctl ./cmd/lmctl/

build-all: ## Cross-compile for multiple architectures
	GOOS=linux GOARCH=amd64 go build -ldflags="$(LDFLAGS)" -o bin/$(APP_NAME)-linux-amd64 ./cmd/linuxmon/
	GOOS=linux GOARCH=arm64 go build -ldflags="$(LDFLAGS)" -o bin/$(APP_NAME)-linux-arm64 ./cmd/linuxmon/
	GOOS=linux GOARCH=arm GOARM=7 go build -ldflags="$(LDFLAGS)" -o bin/$(APP_NAME)-linux-armv7 ./cmd/linuxmon/

test:
	go test -race -cover ./...

test-integration:
	go test -tags=integration -race ./...

lint:
	golangci-lint run ./...

clean:
	rm -rf bin/
	go clean -cache

install: build
	sudo install -m 755 bin/$(APP_NAME) /usr/local/bin/
	sudo install -m 755 bin/lmctl /usr/local/bin/
	sudo install -m 644 configs/linuxmon.service /etc/systemd/system/
	sudo install -m 644 configs/linuxmon.yaml /etc/linuxmon/config.yaml
	sudo systemctl daemon-reload

# Development
dev:
	go run ./cmd/linuxmon/ --config configs/linuxmon.yaml

# Docker
docker-build:
	docker build -t $(APP_NAME):$(VERSION) .

# Generate
generate:
	go generate ./...</code></pre>

<h4>Dockerfile — Multi-stage Build</h4>
<pre><code># Dockerfile — minimal production image
FROM golang:1.22-alpine AS builder

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /bin/linuxmon ./cmd/linuxmon/

# Final image — scratch (no OS, ~5MB)
FROM scratch
COPY --from=builder /bin/linuxmon /linuxmon
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

EXPOSE 8080
ENTRYPOINT ["/linuxmon"]</code></pre>

<h4>systemd Service File</h4>
<pre><code># configs/linuxmon.service
[Unit]
Description=Linux Monitor Daemon
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=linuxmon
Group=linuxmon
ExecStart=/usr/local/bin/linuxmon --config /etc/linuxmon/config.yaml
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=5

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadOnlyPaths=/
ReadWritePaths=/var/log/linuxmon

# Resource limits
LimitNOFILE=65536
MemoryMax=256M
CPUQuota=50%

[Install]
WantedBy=multi-user.target</code></pre>
      `
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) { module.exports = TOPIC_GO_LANG; }
