/**
 * Topic: C++ Programming
 */
const TOPIC_CPP_LANG = {
  "id": "cpp-lang",
  "icon": "⚡",
  "title": "C++ Programming",
  "description": "Modern C++ for Linux systems — RAII, smart pointers, concurrency, and high-performance applications",
  "sections": [
    {
      "id": "modern-cpp-fundamentals",
      "title": "Modern C++ Fundamentals",
      "content": `
<h3>Modern C++ Fundamentals</h3>
<p>Modern C++ (C++11 and beyond) introduces powerful features that make code safer, more expressive, and easier to maintain on Linux systems. Understanding these fundamentals is essential for writing robust system-level software.</p>

<table>
  <thead>
    <tr><th>Feature</th><th>Standard</th><th>Purpose</th></tr>
  </thead>
  <tbody>
    <tr><td>auto</td><td>C++11</td><td>Type inference for cleaner declarations</td></tr>
    <tr><td>Range-based for</td><td>C++11</td><td>Simplified iteration over containers</td></tr>
    <tr><td>constexpr</td><td>C++11/14/17</td><td>Compile-time evaluation</td></tr>
    <tr><td>Structured bindings</td><td>C++17</td><td>Decompose structs/tuples into variables</td></tr>
    <tr><td>Concepts</td><td>C++20</td><td>Constrain template parameters</td></tr>
    <tr><td>Modules</td><td>C++20</td><td>Replace headers with faster compilation units</td></tr>
  </tbody>
</table>

<pre><code>// Modern C++ on Linux — compile with: g++ -std=c++20 -Wall -O2 main.cpp -o main
#include &lt;iostream&gt;
#include &lt;vector&gt;
#include &lt;algorithm&gt;
#include &lt;string_view&gt;
#include &lt;optional&gt;

// constexpr function evaluated at compile time
constexpr int factorial(int n) {
    return n <= 1 ? 1 : n * factorial(n - 1);
}

// std::optional for nullable returns
std::optional&lt;std::string&gt; find_env(std::string_view name) {
    if (const char* val = std::getenv(name.data())) {
        return std::string(val);
    }
    return std::nullopt;
}

int main() {
    // auto and structured bindings
    std::vector&lt;std::pair&lt;std::string, int&gt;&gt; processes = {
        {"systemd", 1}, {"sshd", 892}, {"nginx", 1204}
    };

    // Range-based for with structured bindings (C++17)
    for (const auto& [name, pid] : processes) {
        std::cout &lt;&lt; name &lt;&lt; " (PID: " &lt;&lt; pid &lt;&lt; ")\\n";
    }

    // constexpr at compile time
    static_assert(factorial(5) == 120);

    // std::optional usage
    if (auto home = find_env("HOME")) {
        std::cout &lt;&lt; "Home directory: " &lt;&lt; *home &lt;&lt; "\\n";
    }

    // Lambda with captures
    auto is_system_proc = [](const auto& p) { return p.second &lt; 1000; };
    auto count = std::count_if(processes.begin(), processes.end(), is_system_proc);
    std::cout &lt;&lt; "System processes: " &lt;&lt; count &lt;&lt; "\\n";

    return 0;
}</code></pre>

<h4>Compiler Setup on Linux</h4>
<pre><code># Install GCC with C++20 support
sudo apt install g++-12    # Debian/Ubuntu
sudo dnf install gcc-c++   # Fedora

# Check version and supported standards
g++ --version
g++ -std=c++20 -dM -E -x c++ /dev/null | grep cplusplus

# Compile with warnings and sanitizers during development
g++ -std=c++20 -Wall -Wextra -Wpedantic -fsanitize=address,undefined main.cpp -o main</code></pre>
      `
    },
    {
      "id": "raii-smart-pointers",
      "title": "RAII & Smart Pointers",
      "content": `
<h3>RAII & Smart Pointers</h3>
<p>Resource Acquisition Is Initialization (RAII) is the cornerstone of modern C++ resource management. By tying resource lifetime to object scope, RAII eliminates leaks for memory, file handles, sockets, and mutex locks — critical for long-running Linux daemons and system services.</p>

<table>
  <thead>
    <tr><th>Smart Pointer</th><th>Ownership</th><th>Use Case</th></tr>
  </thead>
  <tbody>
    <tr><td>std::unique_ptr</td><td>Exclusive</td><td>Single owner, most common default</td></tr>
    <tr><td>std::shared_ptr</td><td>Shared (ref-counted)</td><td>Multiple owners, shared resources</td></tr>
    <tr><td>std::weak_ptr</td><td>Non-owning observer</td><td>Break cycles, caches</td></tr>
  </tbody>
</table>

<pre><code>#include &lt;memory&gt;
#include &lt;fstream&gt;
#include &lt;iostream&gt;
#include &lt;cstring&gt;
#include &lt;unistd.h&gt;
#include &lt;fcntl.h&gt;

// RAII wrapper for Linux file descriptors
class FileDescriptor {
    int fd_ = -1;
public:
    explicit FileDescriptor(const char* path, int flags)
        : fd_(::open(path, flags)) {
        if (fd_ == -1) {
            throw std::runtime_error(
                std::string("open failed: ") + strerror(errno));
        }
    }

    ~FileDescriptor() {
        if (fd_ != -1) ::close(fd_);
    }

    // Non-copyable, moveable
    FileDescriptor(const FileDescriptor&) = delete;
    FileDescriptor& operator=(const FileDescriptor&) = delete;
    FileDescriptor(FileDescriptor&& other) noexcept : fd_(other.fd_) {
        other.fd_ = -1;
    }
    FileDescriptor& operator=(FileDescriptor&& other) noexcept {
        if (this != &other) {
            if (fd_ != -1) ::close(fd_);
            fd_ = other.fd_;
            other.fd_ = -1;
        }
        return *this;
    }

    int get() const { return fd_; }

    ssize_t read(void* buf, size_t count) {
        return ::read(fd_, buf, count);
    }

    ssize_t write(const void* buf, size_t count) {
        return ::write(fd_, buf, count);
    }
};

// Custom deleter for C-style resources (e.g., FILE*)
struct FileCloser {
    void operator()(FILE* f) const {
        if (f) fclose(f);
    }
};
using UniqueFILE = std::unique_ptr&lt;FILE, FileCloser&gt;;

// Smart pointer factory
std::unique_ptr&lt;FileDescriptor&gt; open_log(const char* path) {
    return std::make_unique&lt;FileDescriptor&gt;(path, O_RDONLY);
}

int main() {
    // unique_ptr — automatic cleanup
    {
        auto fd = open_log("/var/log/syslog");
        char buf[256];
        auto bytes = fd-&gt;read(buf, sizeof(buf) - 1);
        if (bytes &gt; 0) {
            buf[bytes] = '\\0';
            std::cout &lt;&lt; "First bytes: " &lt;&lt; buf &lt;&lt; "\\n";
        }
    } // fd closed automatically here

    // shared_ptr for shared resources
    auto config = std::make_shared&lt;std::string&gt;("/etc/myapp.conf");
    auto worker1_conf = config;  // ref count = 2
    auto worker2_conf = config;  // ref count = 3
    std::cout &lt;&lt; "Config refs: " &lt;&lt; config.use_count() &lt;&lt; "\\n";

    // unique_ptr with custom deleter for FILE*
    UniqueFILE proc_file(fopen("/proc/meminfo", "r"));
    if (proc_file) {
        char line[128];
        if (fgets(line, sizeof(line), proc_file.get())) {
            std::cout &lt;&lt; line;
        }
    }

    return 0;
}</code></pre>

<h4>RAII Best Practices for Linux Services</h4>
<pre><code>// Mutex RAII with std::lock_guard / std::scoped_lock
#include &lt;mutex&gt;
#include &lt;shared_mutex&gt;

class ThreadSafeLog {
    mutable std::shared_mutex mutex_;
    std::vector&lt;std::string&gt; entries_;
public:
    void add(std::string entry) {
        std::unique_lock lock(mutex_);  // exclusive access
        entries_.push_back(std::move(entry));
    } // lock released automatically

    std::string last() const {
        std::shared_lock lock(mutex_);  // shared read access
        return entries_.empty() ? "" : entries_.back();
    } // shared lock released automatically
};</code></pre>
      `
    },
    {
      "id": "concurrency-threads-atomics-async",
      "title": "Concurrency — Threads, Atomics & Async",
      "content": `
<h3>Concurrency — Threads, Atomics & Async</h3>
<p>Linux systems rely heavily on concurrent processing. Modern C++ provides portable concurrency primitives that map directly to POSIX threads underneath, giving you both performance and cross-platform safety.</p>

<table>
  <thead>
    <tr><th>Primitive</th><th>Header</th><th>Use Case</th></tr>
  </thead>
  <tbody>
    <tr><td>std::thread</td><td>&lt;thread&gt;</td><td>OS threads (wraps pthreads on Linux)</td></tr>
    <tr><td>std::mutex</td><td>&lt;mutex&gt;</td><td>Mutual exclusion</td></tr>
    <tr><td>std::atomic</td><td>&lt;atomic&gt;</td><td>Lock-free shared variables</td></tr>
    <tr><td>std::async / std::future</td><td>&lt;future&gt;</td><td>Task-based parallelism</td></tr>
    <tr><td>std::condition_variable</td><td>&lt;condition_variable&gt;</td><td>Thread signaling</td></tr>
    <tr><td>std::jthread</td><td>&lt;thread&gt; (C++20)</td><td>Auto-joining, cancellable thread</td></tr>
  </tbody>
</table>

<pre><code>#include &lt;iostream&gt;
#include &lt;thread&gt;
#include &lt;mutex&gt;
#include &lt;atomic&gt;
#include &lt;future&gt;
#include &lt;vector&gt;
#include &lt;queue&gt;
#include &lt;condition_variable&gt;
#include &lt;functional&gt;
#include &lt;fstream&gt;
#include &lt;sstream&gt;

// Atomic counter — lock-free
std::atomic&lt;int&gt; active_connections{0};

// Thread-safe work queue (producer-consumer pattern)
template&lt;typename T&gt;
class WorkQueue {
    std::queue&lt;T&gt; queue_;
    mutable std::mutex mutex_;
    std::condition_variable cv_;
    bool done_ = false;

public:
    void push(T item) {
        {
            std::lock_guard lock(mutex_);
            queue_.push(std::move(item));
        }
        cv_.notify_one();
    }

    std::optional&lt;T&gt; pop() {
        std::unique_lock lock(mutex_);
        cv_.wait(lock, [this] { return !queue_.empty() || done_; });
        if (queue_.empty()) return std::nullopt;
        T item = std::move(queue_.front());
        queue_.pop();
        return item;
    }

    void shutdown() {
        {
            std::lock_guard lock(mutex_);
            done_ = true;
        }
        cv_.notify_all();
    }
};

// Read CPU info using async
std::future&lt;int&gt; get_cpu_count() {
    return std::async(std::launch::async, [] {
        std::ifstream f("/proc/cpuinfo");
        std::string line;
        int count = 0;
        while (std::getline(f, line)) {
            if (line.find("processor") == 0) ++count;
        }
        return count;
    });
}

int main() {
    // std::jthread (C++20) — auto-joins on destruction
    {
        std::jthread worker([](std::stop_token st) {
            while (!st.stop_requested()) {
                active_connections.fetch_add(1, std::memory_order_relaxed);
                std::this_thread::sleep_for(std::chrono::milliseconds(100));
            }
        });
        std::this_thread::sleep_for(std::chrono::milliseconds(500));
        // worker automatically stops and joins here
    }

    std::cout &lt;&lt; "Connections processed: " &lt;&lt; active_connections.load() &lt;&lt; "\\n";

    // Task-based parallelism with std::async
    auto cpu_future = get_cpu_count();
    std::cout &lt;&lt; "CPUs: " &lt;&lt; cpu_future.get() &lt;&lt; "\\n";

    // Thread pool pattern with work queue
    WorkQueue&lt;std::function&lt;void()&gt;&gt; tasks;
    std::vector&lt;std::jthread&gt; pool;

    for (int i = 0; i &lt; 4; ++i) {
        pool.emplace_back([&tasks] {
            while (auto task = tasks.pop()) {
                (*task)();
            }
        });
    }

    // Submit work
    for (int i = 0; i &lt; 20; ++i) {
        tasks.push([i] {
            std::ostringstream oss;
            oss &lt;&lt; "Task " &lt;&lt; i &lt;&lt; " on thread "
                &lt;&lt; std::this_thread::get_id() &lt;&lt; "\\n";
            std::cout &lt;&lt; oss.str();
        });
    }

    tasks.shutdown();
    return 0;
}
// Compile: g++ -std=c++20 -pthread concurrency.cpp -o concurrency</code></pre>
      `
    },
    {
      "id": "templates-stl",
      "title": "Templates & the Standard Template Library",
      "content": `
<h3>Templates & the Standard Template Library</h3>
<p>Templates enable generic, type-safe code without runtime overhead. The STL provides battle-tested containers, algorithms, and iterators that form the backbone of efficient C++ programs on Linux.</p>

<table>
  <thead>
    <tr><th>Container</th><th>Access</th><th>Insert</th><th>Use Case</th></tr>
  </thead>
  <tbody>
    <tr><td>std::vector</td><td>O(1)</td><td>O(1) amortized back</td><td>Default sequential container</td></tr>
    <tr><td>std::array</td><td>O(1)</td><td>Fixed size</td><td>Stack-allocated fixed arrays</td></tr>
    <tr><td>std::unordered_map</td><td>O(1) avg</td><td>O(1) avg</td><td>Hash-based key-value lookup</td></tr>
    <tr><td>std::map</td><td>O(log n)</td><td>O(log n)</td><td>Ordered key-value store</td></tr>
    <tr><td>std::deque</td><td>O(1)</td><td>O(1) front/back</td><td>Double-ended operations</td></tr>
    <tr><td>std::span (C++20)</td><td>O(1)</td><td>Non-owning</td><td>View over contiguous data</td></tr>
  </tbody>
</table>

<pre><code>#include &lt;iostream&gt;
#include &lt;vector&gt;
#include &lt;algorithm&gt;
#include &lt;numeric&gt;
#include &lt;span&gt;
#include &lt;ranges&gt;
#include &lt;concepts&gt;
#include &lt;fstream&gt;
#include &lt;sstream&gt;
#include &lt;unordered_map&gt;

// C++20 Concepts — constrain templates
template&lt;typename T&gt;
concept Numeric = std::integral&lt;T&gt; || std::floating_point&lt;T&gt;;

template&lt;Numeric T&gt;
T safe_average(std::span&lt;const T&gt; data) {
    if (data.empty()) return T{};
    return std::accumulate(data.begin(), data.end(), T{}) / static_cast&lt;T&gt;(data.size());
}

// Variadic template for logging
template&lt;typename... Args&gt;
void log(Args&&... args) {
    (std::cout &lt;&lt; ... &lt;&lt; std::forward&lt;Args&gt;(args)) &lt;&lt; '\\n';
}

// Parse /proc/stat using STL
std::unordered_map&lt;std::string, std::vector&lt;long&gt;&gt; parse_proc_stat() {
    std::unordered_map&lt;std::string, std::vector&lt;long&gt;&gt; result;
    std::ifstream f("/proc/stat");
    std::string line;

    while (std::getline(f, line)) {
        std::istringstream iss(line);
        std::string key;
        iss &gt;&gt; key;
        if (key.find("cpu") == 0) {
            std::vector&lt;long&gt; values;
            long val;
            while (iss &gt;&gt; val) values.push_back(val);
            result[key] = std::move(values);
        }
    }
    return result;
}

int main() {
    // C++20 Ranges — composable, lazy operations
    std::vector&lt;int&gt; data = {15, 3, 42, 8, 27, 1, 99, 4, 56, 12};

    // Filter, transform, take — no intermediate allocations
    auto result = data
        | std::views::filter([](int x) { return x &gt; 10; })
        | std::views::transform([](int x) { return x * 2; })
        | std::views::take(4);

    log("Filtered & doubled (first 4): ");
    for (int v : result) std::cout &lt;&lt; v &lt;&lt; " ";
    std::cout &lt;&lt; "\\n";

    // std::span — non-owning view
    std::vector&lt;double&gt; measurements = {23.5, 24.1, 22.8, 25.0, 23.2};
    std::cout &lt;&lt; "Average: " &lt;&lt; safe_average&lt;double&gt;(measurements) &lt;&lt; "\\n";

    // STL algorithms
    std::ranges::sort(data);
    auto [min_it, max_it] = std::ranges::minmax_element(data);
    log("Min: ", *min_it, " Max: ", *max_it);

    // Parse system info
    auto stats = parse_proc_stat();
    if (auto it = stats.find("cpu"); it != stats.end()) {
        log("CPU total values: ", it-&gt;second.size());
    }

    return 0;
}
// Compile: g++ -std=c++20 -O2 templates_stl.cpp -o templates_stl</code></pre>
      `
    },
    {
      "id": "error-handling-move-semantics",
      "title": "Error Handling & Move Semantics",
      "content": `
<h3>Error Handling & Move Semantics</h3>
<p>Robust error handling and efficient value transfer via move semantics are crucial for systems programs that handle large data or interact with OS resources on Linux.</p>

<table>
  <thead>
    <tr><th>Strategy</th><th>When to Use</th><th>Overhead</th></tr>
  </thead>
  <tbody>
    <tr><td>Exceptions</td><td>Unexpected/unrecoverable errors</td><td>Zero-cost happy path, expensive throw</td></tr>
    <tr><td>std::expected (C++23)</td><td>Expected failures (file not found, parse error)</td><td>No overhead, value or error</td></tr>
    <tr><td>std::optional</td><td>May or may not have a value</td><td>Minimal — one extra bool</td></tr>
    <tr><td>Error codes</td><td>C interop, performance-critical</td><td>None</td></tr>
    <tr><td>std::error_code</td><td>System error reporting</td><td>Minimal</td></tr>
  </tbody>
</table>

<pre><code>#include &lt;iostream&gt;
#include &lt;string&gt;
#include &lt;optional&gt;
#include &lt;variant&gt;
#include &lt;system_error&gt;
#include &lt;fstream&gt;
#include &lt;vector&gt;
#include &lt;cstring&gt;
#include &lt;utility&gt;
#include &lt;unistd.h&gt;
#include &lt;sys/stat.h&gt;

// Result type (pre-C++23 std::expected equivalent)
template&lt;typename T, typename E = std::string&gt;
using Result = std::variant&lt;T, E&gt;;

template&lt;typename T, typename E&gt;
bool is_ok(const Result&lt;T, E&gt;& r) { return r.index() == 0; }

template&lt;typename T, typename E&gt;
const T& get_value(const Result&lt;T, E&gt;& r) { return std::get&lt;0&gt;(r); }

template&lt;typename T, typename E&gt;
const E& get_error(const Result&lt;T, E&gt;& r) { return std::get&lt;1&gt;(r); }

// Read file with error handling
Result&lt;std::string&gt; read_file(const std::string& path) {
    std::ifstream f(path);
    if (!f.is_open()) {
        return "Cannot open: " + path + " (" + strerror(errno) + ")";
    }
    std::string content((std::istreambuf_iterator&lt;char&gt;(f)),
                         std::istreambuf_iterator&lt;char&gt;());
    return content;  // moved implicitly (NRVO)
}

// Move semantics — efficient resource transfer
class Buffer {
    std::vector&lt;char&gt; data_;
    std::string name_;
public:
    Buffer(std::string name, size_t size)
        : data_(size), name_(std::move(name)) {}

    // Move constructor — steals resources
    Buffer(Buffer&& other) noexcept
        : data_(std::move(other.data_)),
          name_(std::move(other.name_)) {}

    // Move assignment
    Buffer& operator=(Buffer&& other) noexcept {
        data_ = std::move(other.data_);
        name_ = std::move(other.name_);
        return *this;
    }

    size_t size() const { return data_.size(); }
    const std::string& name() const { return name_; }
};

// System error handling with std::error_code
std::optional&lt;struct stat&gt; file_stat(const std::string& path) {
    struct stat st;
    if (::stat(path.c_str(), &st) == 0) {
        return st;
    }
    return std::nullopt;
}

int main() {
    // Result-based error handling
    auto content = read_file("/etc/hostname");
    if (is_ok(content)) {
        std::cout &lt;&lt; "Hostname: " &lt;&lt; get_value(content);
    } else {
        std::cerr &lt;&lt; "Error: " &lt;&lt; get_error(content) &lt;&lt; "\\n";
    }

    // Move semantics in action
    Buffer buf1("network_buffer", 1024 * 1024);  // 1MB
    std::cout &lt;&lt; "buf1 size: " &lt;&lt; buf1.size() &lt;&lt; "\\n";

    Buffer buf2 = std::move(buf1);  // Zero-copy transfer
    std::cout &lt;&lt; "buf2 size: " &lt;&lt; buf2.size() &lt;&lt; "\\n";
    std::cout &lt;&lt; "buf1 size after move: " &lt;&lt; buf1.size() &lt;&lt; "\\n";  // 0

    // Perfect forwarding with std::forward
    auto make_buffers = []&lt;typename... Args&gt;(Args&&... args) {
        std::vector&lt;Buffer&gt; buffers;
        (buffers.push_back(Buffer(std::forward&lt;Args&gt;(args), 512)), ...);
        return buffers;  // NRVO — no copy
    };
    auto buffers = make_buffers("tcp", "udp", "unix");
    std::cout &lt;&lt; "Buffers: " &lt;&lt; buffers.size() &lt;&lt; "\\n";

    // System error codes
    if (auto st = file_stat("/proc/self/status")) {
        std::cout &lt;&lt; "File size: " &lt;&lt; st-&gt;st_size &lt;&lt; " bytes\\n";
    }

    return 0;
}</code></pre>
      `
    },
    {
      "id": "build-systems-cmake-vcpkg-conan",
      "title": "Build Systems — CMake, vcpkg & Conan",
      "content": `
<h3>Build Systems — CMake, vcpkg & Conan</h3>
<p>Linux C++ projects need reliable build systems and dependency management. CMake is the de facto standard, while vcpkg and Conan handle third-party libraries seamlessly.</p>

<table>
  <thead>
    <tr><th>Tool</th><th>Purpose</th><th>Install</th></tr>
  </thead>
  <tbody>
    <tr><td>CMake</td><td>Cross-platform build generator</td><td>apt install cmake</td></tr>
    <tr><td>Ninja</td><td>Fast parallel build backend</td><td>apt install ninja-build</td></tr>
    <tr><td>vcpkg</td><td>Microsoft's C++ package manager</td><td>git clone from GitHub</td></tr>
    <tr><td>Conan</td><td>Decentralized C++ package manager</td><td>pip install conan</td></tr>
    <tr><td>pkg-config</td><td>Query installed libraries</td><td>apt install pkg-config</td></tr>
    <tr><td>ccache</td><td>Compiler cache for faster rebuilds</td><td>apt install ccache</td></tr>
  </tbody>
</table>

<pre><code># CMakeLists.txt — Modern CMake best practices
cmake_minimum_required(VERSION 3.20)
project(linux_tool
    VERSION 1.0.0
    LANGUAGES CXX
    DESCRIPTION "A Linux system tool"
)

# Require C++20
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Export compile_commands.json for LSP (clangd)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Use ccache if available
find_program(CCACHE_PROGRAM ccache)
if(CCACHE_PROGRAM)
    set(CMAKE_CXX_COMPILER_LAUNCHER \${CCACHE_PROGRAM})
endif()

# Find system packages
find_package(Threads REQUIRED)
find_package(PkgConfig REQUIRED)
pkg_check_modules(SYSTEMD IMPORTED_TARGET libsystemd)

# Main executable
add_executable(linux_tool
    src/main.cpp
    src/config.cpp
    src/daemon.cpp
)

target_link_libraries(linux_tool PRIVATE
    Threads::Threads
    PkgConfig::SYSTEMD
)

# Compiler warnings
target_compile_options(linux_tool PRIVATE
    -Wall -Wextra -Wpedantic
    -Werror=return-type
    -Wshadow
)

# Sanitizers for debug builds
if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    target_compile_options(linux_tool PRIVATE
        -fsanitize=address,undefined
    )
    target_link_options(linux_tool PRIVATE
        -fsanitize=address,undefined
    )
endif()

# Install rules
include(GNUInstallDirs)
install(TARGETS linux_tool RUNTIME DESTINATION \${CMAKE_INSTALL_BINDIR})
install(FILES config/linux_tool.conf
    DESTINATION \${CMAKE_INSTALL_SYSCONFDIR}/linux_tool
)</code></pre>

<h4>Build & Development Workflow</h4>
<pre><code># Configure and build with Ninja
cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build --parallel

# Debug build with sanitizers
cmake -B build-debug -G Ninja -DCMAKE_BUILD_TYPE=Debug
cmake --build build-debug

# Install
sudo cmake --install build

# vcpkg integration
git clone https://github.com/microsoft/vcpkg.git ~/vcpkg
~/vcpkg/bootstrap-vcpkg.sh
~/vcpkg/vcpkg install fmt spdlog nlohmann-json

# Use vcpkg with CMake
cmake -B build -G Ninja \\
    -DCMAKE_TOOLCHAIN_FILE=~/vcpkg/scripts/buildsystems/vcpkg.cmake

# Conan integration
pip install conan
conan profile detect
conan install . --output-folder=build --build=missing
cmake -B build -G Ninja -DCMAKE_PREFIX_PATH=build</code></pre>
      `
    },
    {
      "id": "debugging-profiling",
      "title": "Debugging & Profiling",
      "content": `
<h3>Debugging & Profiling</h3>
<p>Linux provides world-class debugging and profiling tools. From GDB for step-through debugging to perf for CPU profiling, these tools are essential for optimizing system-level C++ code.</p>

<table>
  <thead>
    <tr><th>Tool</th><th>Purpose</th><th>Install</th></tr>
  </thead>
  <tbody>
    <tr><td>GDB</td><td>Interactive debugger</td><td>apt install gdb</td></tr>
    <tr><td>Valgrind</td><td>Memory error & leak detection</td><td>apt install valgrind</td></tr>
    <tr><td>perf</td><td>CPU profiling & hardware counters</td><td>apt install linux-tools-common</td></tr>
    <tr><td>AddressSanitizer</td><td>Memory error detection (compile-time)</td><td>Built into GCC/Clang</td></tr>
    <tr><td>strace</td><td>System call tracing</td><td>apt install strace</td></tr>
    <tr><td>heaptrack</td><td>Heap memory profiler</td><td>apt install heaptrack</td></tr>
  </tbody>
</table>

<pre><code>// debug_example.cpp — compile with: g++ -g -O0 -std=c++20 debug_example.cpp
#include &lt;iostream&gt;
#include &lt;vector&gt;
#include &lt;numeric&gt;
#include &lt;chrono&gt;

// Intentional bug for demonstration
class DataProcessor {
    std::vector&lt;int&gt; data_;
public:
    void load(size_t count) {
        data_.resize(count);
        std::iota(data_.begin(), data_.end(), 1);
    }

    // Hot function — will show up in profiling
    long long process() {
        long long sum = 0;
        for (size_t i = 0; i &lt; data_.size(); ++i) {
            sum += data_[i] * data_[i];
        }
        return sum;
    }

    int& at(size_t idx) { return data_.at(idx); }  // bounds-checked
};

int main() {
    DataProcessor proc;
    proc.load(10'000'000);

    auto start = std::chrono::high_resolution_clock::now();
    auto result = proc.process();
    auto end = std::chrono::high_resolution_clock::now();

    auto duration = std::chrono::duration_cast&lt;std::chrono::microseconds&gt;(end - start);
    std::cout &lt;&lt; "Result: " &lt;&lt; result &lt;&lt; "\\n";
    std::cout &lt;&lt; "Time: " &lt;&lt; duration.count() &lt;&lt; " μs\\n";

    return 0;
}</code></pre>

<h4>Debugging & Profiling Commands</h4>
<pre><code># GDB — Interactive debugging
g++ -g -O0 -std=c++20 debug_example.cpp -o debug_example
gdb ./debug_example
# (gdb) break main
# (gdb) run
# (gdb) next
# (gdb) print proc.data_.size()
# (gdb) backtrace
# (gdb) watch result

# Valgrind — Memory leak detection
valgrind --leak-check=full --show-leak-kinds=all ./debug_example

# AddressSanitizer — Compile-time memory checking
g++ -g -O1 -std=c++20 -fsanitize=address -fno-omit-frame-pointer \\
    debug_example.cpp -o debug_asan
./debug_asan

# perf — CPU profiling
g++ -g -O2 -std=c++20 debug_example.cpp -o debug_perf
perf record -g ./debug_perf
perf report
perf stat ./debug_perf

# strace — System call tracing
strace -c ./debug_example           # Summary of syscalls
strace -e trace=file ./debug_example  # Only file-related syscalls

# heaptrack — Heap allocation profiling
heaptrack ./debug_example
heaptrack --analyze heaptrack.debug_example.*.gz

# Flamegraph generation
perf record -F 99 -g ./debug_perf
perf script | stackcollapse-perf.pl | flamegraph.pl &gt; flamegraph.svg</code></pre>
      `
    }
  ]
};

module.exports = TOPIC_CPP_LANG;
