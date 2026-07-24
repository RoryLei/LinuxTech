/**
 * Topic: File System
 */
const TOPIC_FILESYSTEM = {
  "id": "filesystem",
  "icon": "📁",
  "title": "File System",
  "description": "Understand the Linux directory structure, file types, and mount mechanisms",
  "sections": [
    {
      "title": "Directory Structure Overview",
      "content": "\n          <p>Linux uses a tree-based directory structure. Everything starts from the root <code>/</code>:</p>\n          <ul>\n            <li><code>/bin</code> — Essential user commands</li>\n            <li><code>/etc</code> — System configuration files</li>\n            <li><code>/home</code> — User home directories</li>\n            <li><code>/var</code> — Variable data (logs, caches)</li>\n            <li><code>/tmp</code> — Temporary files</li>\n            <li><code>/usr</code> — User programs and libraries</li>\n            <li><code>/dev</code> — Device files</li>\n            <li><code>/proc</code> — Virtual filesystem (process info)</li>\n          </ul>\n        "
    },
    {
      "title": "Common Commands",
      "content": "\n          <pre><code># List files (including hidden)\nls -la\n\n# Check disk usage\ndf -h\n\n# Check directory size\ndu -sh /var/log\n\n# Search for files\nfind / -name \"*.conf\" -type f\n\n# Mount a device\nmount /dev/sdb1 /mnt/usb</code></pre>\n        "
    },
    {
      "title": "File Permissions",
      "content": "\n          <p>Each file has three permission groups: owner, group, and others.</p>\n          <pre><code># Change permissions\nchmod 755 script.sh\n\n# Change ownership\nchown user:group file.txt\n\n# Permission number mapping\n# r=4, w=2, x=1\n# 755 = rwxr-xr-x</code></pre>\n        "
    }
  ]
};
