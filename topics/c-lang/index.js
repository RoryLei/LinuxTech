/**
 * Topic: C Programming
 */
const TOPIC_C_LANG = {
  "id": "c-lang",
  "icon": "🔧",
  "title": "C Programming",
  "description": "Master C for systems programming — pointers, memory management, kernel modules, and embedded development",
  "sections": [
    {
      "title": "1. C Fundamentals for Linux",
      "content": "\n<h4>Why C for Linux?</h4>\n<ul>\n  <li>Linux kernel is written in C (~28M lines)</li>\n  <li>Direct hardware access (pointers, bitwise, volatile)</li>\n  <li>Zero runtime overhead (no GC, no VM)</li>\n  <li>POSIX API is C-native</li>\n</ul>\n<h4>Compilation & Toolchain</h4>\n<pre><code># Compile\ngcc -Wall -Wextra -O2 -o app main.c\n\n# With debug symbols\ngcc -g -fsanitize=address -o app_dbg main.c\n\n# Compile to object file (for linking)\ngcc -c -o module.o module.c\n\n# Link\ngcc -o app main.o module.o -lpthread -lm\n\n# Static analysis\ncppcheck --enable=all main.c\ngcc -fanalyzer main.c</code></pre>"
    },
    {
      "title": "2. Pointers & Memory Management",
      "content": "\n<h4>Pointer Arithmetic</h4>\n<pre><code>int arr[5] = {10, 20, 30, 40, 50};\nint *p = arr;\nprintf(\"%d\\n\", *(p + 2));   // 30 — pointer arithmetic\nprintf(\"%d\\n\", p[3]);       // 40 — equivalent to *(p+3)\n\n// Void pointer (generic)\nvoid *generic = malloc(100);\nint *typed = (int *)generic;\n\n// Function pointer\nint (*compare)(const void *, const void *) = strcmp;\nqsort(arr, 5, sizeof(int), compare_ints);</code></pre>\n<h4>Dynamic Memory</h4>\n<pre><code>#include &lt;stdlib.h&gt;\n\n// Allocate\nint *buf = malloc(100 * sizeof(int));\nint *zbuf = calloc(100, sizeof(int));    // zero-initialized\nbuf = realloc(buf, 200 * sizeof(int));   // resize\n\n// Free\nfree(buf);\nbuf = NULL;  // avoid dangling pointer\n\n// Common bugs:\n// - Use after free\n// - Double free\n// - Buffer overflow (write past allocation)\n// - Memory leak (forget to free)\n\n// Detect with:\n// gcc -fsanitize=address (ASan)\n// valgrind --leak-check=full ./app</code></pre>"
    },
    {
      "title": "3. System Programming (POSIX)",
      "content": "\n<h4>File I/O (Low-Level)</h4>\n<pre><code>#include &lt;fcntl.h&gt;\n#include &lt;unistd.h&gt;\n\nint fd = open(\"/dev/nvme0n1\", O_RDONLY | O_DIRECT);\nchar buf[4096] __attribute__((aligned(4096)));\nssize_t n = read(fd, buf, sizeof(buf));\nclose(fd);\n\n// mmap\n#include &lt;sys/mman.h&gt;\nvoid *map = mmap(NULL, size, PROT_READ, MAP_PRIVATE, fd, 0);\n// use map[0..size-1]\nmunmap(map, size);</code></pre>\n<h4>Threads (pthreads)</h4>\n<pre><code>#include &lt;pthread.h&gt;\n\nvoid *worker(void *arg) {\n    int id = *(int *)arg;\n    printf(\"Thread %d running\\n\", id);\n    return NULL;\n}\n\npthread_t threads[4];\nint ids[4] = {0, 1, 2, 3};\nfor (int i = 0; i < 4; i++)\n    pthread_create(&threads[i], NULL, worker, &ids[i]);\nfor (int i = 0; i < 4; i++)\n    pthread_join(threads[i], NULL);</code></pre>\n<h4>Signals & Error Handling</h4>\n<pre><code>#include &lt;signal.h&gt;\n#include &lt;errno.h&gt;\n\n// Signal handler\nvoid sigint_handler(int sig) { /* cleanup */ }\nsignal(SIGINT, sigint_handler);\n\n// Error handling pattern\nif (open(\"/missing\", O_RDONLY) == -1) {\n    perror(\"open failed\");       // prints: open failed: No such file or directory\n    fprintf(stderr, \"errno=%d\\n\", errno);\n}</code></pre>"
    },
    {
      "title": "4. Data Structures in C",
      "content": "\n<h4>Linked List (Linux Kernel Style)</h4>\n<pre><code>// Intrusive linked list (no separate node allocation)\nstruct list_head {\n    struct list_head *next, *prev;\n};\n\nstruct my_entry {\n    int data;\n    struct list_head list;  // embedded list node\n};\n\n// container_of macro (get parent struct from member pointer)\n#define container_of(ptr, type, member) \\\n    ((type *)((char *)(ptr) - offsetof(type, member)))\n\n// Iterate\nstruct list_head *pos;\nlist_for_each(pos, &head) {\n    struct my_entry *entry = container_of(pos, struct my_entry, list);\n    printf(\"%d\\n\", entry->data);\n}</code></pre>\n<h4>Hash Table (uthash)</h4>\n<pre><code>#include \"uthash.h\"\n\nstruct user {\n    int id;            // key\n    char name[64];\n    UT_hash_handle hh; // makes this struct hashable\n};\n\nstruct user *users = NULL;\n\n// Add\nstruct user *u = malloc(sizeof(*u));\nu->id = 42;\nstrcpy(u->name, \"Alice\");\nHASH_ADD_INT(users, id, u);\n\n// Find\nstruct user *found;\nint key = 42;\nHASH_FIND_INT(users, &key, found);\n// found->name == \"Alice\"</code></pre>"
    },
    {
      "title": "5. Kernel Module Development",
      "content": "\n<pre><code>#include &lt;linux/module.h&gt;\n#include &lt;linux/kernel.h&gt;\n#include &lt;linux/init.h&gt;\n\nstatic int __init hello_init(void) {\n    pr_info(\"Hello from kernel module!\\n\");\n    return 0;\n}\n\nstatic void __exit hello_exit(void) {\n    pr_info(\"Goodbye from kernel module!\\n\");\n}\n\nmodule_init(hello_init);\nmodule_exit(hello_exit);\nMODULE_LICENSE(\"GPL\");\nMODULE_AUTHOR(\"LinuxTech\");\nMODULE_DESCRIPTION(\"Example kernel module\");</code></pre>\n<h4>Makefile</h4>\n<pre><code>obj-m += hello.o\n\nKDIR := /lib/modules/$(shell uname -r)/build\n\nall:\n\\tmake -C $(KDIR) M=$(PWD) modules\n\nclean:\n\\tmake -C $(KDIR) M=$(PWD) clean\n\n# Build and load:\n# make\n# sudo insmod hello.ko\n# dmesg | tail\n# sudo rmmod hello</code></pre>"
    },
    {
      "title": "6. Build Systems & Best Practices",
      "content": "\n<h4>Makefile Pattern</h4>\n<pre><code>CC = gcc\nCFLAGS = -Wall -Wextra -O2 -std=c11\nLDFLAGS = -lpthread\nSRC = $(wildcard src/*.c)\nOBJ = $(SRC:.c=.o)\nTARGET = myapp\n\n$(TARGET): $(OBJ)\n\\t$(CC) -o $@ $^ $(LDFLAGS)\n\n%.o: %.c\n\\t$(CC) $(CFLAGS) -c -o $@ $&lt;\n\nclean:\n\\trm -f $(OBJ) $(TARGET)</code></pre>\n<h4>CMake (Modern C)</h4>\n<pre><code># CMakeLists.txt\ncmake_minimum_required(VERSION 3.16)\nproject(myapp C)\nset(CMAKE_C_STANDARD 11)\nadd_executable(myapp src/main.c src/utils.c)\ntarget_link_libraries(myapp pthread)</code></pre>\n<h4>Best Practices</h4>\n<ul>\n  <li><strong>Always compile with -Wall -Wextra</strong></li>\n  <li><strong>Use ASan/UBSan in development</strong>: -fsanitize=address,undefined</li>\n  <li><strong>Check every return value</strong> (open, malloc, read, write)</li>\n  <li><strong>Use const</strong> for read-only pointers</li>\n  <li><strong>Avoid magic numbers</strong> — use #define or enum</li>\n  <li><strong>Free what you malloc</strong> — consider RAII-like patterns (goto cleanup)</li>\n</ul>"
    },
    {
      "title": "7. Debugging & Profiling",
      "content": "\n<pre><code># GDB\ngcc -g -O0 -o app main.c\ngdb ./app\n(gdb) break main\n(gdb) run\n(gdb) print variable\n(gdb) backtrace\n(gdb) next / step / continue\n\n# Valgrind (memory errors + leaks)\nvalgrind --leak-check=full --track-origins=yes ./app\n\n# strace (syscall tracing)\nstrace -f -e trace=read,write,open ./app\n\n# perf (profiling)\nperf record -g ./app\nperf report\n\n# AddressSanitizer (compile-time)\ngcc -fsanitize=address -g -o app main.c\n./app  # prints detailed error on memory bug</code></pre>\n<p><strong>References:</strong></p>\n<ul>\n  <li><a href=\"https://man7.org/linux/man-pages/\" target=\"_blank\">Linux Man Pages</a></li>\n  <li><a href=\"https://docs.kernel.org/process/coding-style.html\" target=\"_blank\">Linux Kernel Coding Style</a></li>\n  <li><a href=\"https://beej.us/guide/bgc/\" target=\"_blank\">Beej's Guide to C Programming</a></li>\n</ul>"
    }
  ]
};
