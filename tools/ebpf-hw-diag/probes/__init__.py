"""eBPF probe source files.

The .bpf.c files in this directory are the standalone eBPF programs.
For BCC mode, the program text is embedded inline in each collector.
For libbpf/CO-RE mode, compile these with:
    clang -O2 -target bpf -g -c probe.bpf.c -o probe.bpf.o
"""
