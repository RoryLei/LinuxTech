/**
 * Topic: Shell Scripting
 */
const TOPIC_SHELL = {
  "id": "shell",
  "icon": "💻",
  "title": "Shell Scripting",
  "description": "Write automation scripts to boost productivity",
  "sections": [
    {
      "title": "Basic Syntax",
      "content": "\n          <pre><code>#!/bin/bash\n# Variables\nNAME=\"Linux\"\necho \"Hello, $NAME\"\n\n# Conditionals\nif [ -f \"/etc/passwd\" ]; then\n  echo \"File exists\"\nfi\n\n# Loops\nfor i in {1..5}; do\n  echo \"Iteration $i\"\ndone\n\n# Functions\ngreet() {\n  echo \"Hi, $1!\"\n}\ngreet \"World\"</code></pre>\n        "
    },
    {
      "title": "Practical Tips",
      "content": "\n          <pre><code># Pipes and redirection\ncat access.log | grep \"404\" | wc -l\ncommand > output.txt 2>&1\n\n# String manipulation\nfilename=\"report_2026.tar.gz\"\necho \"${filename%.tar.gz}\"  # report_2026\necho \"${filename##*.}\"       # gz\n\n# Arrays\narr=(\"apple\" \"banana\" \"cherry\")\necho \"${arr[1]}\"    # banana\necho \"${#arr[@]}\"   # 3\n\n# Read user input\nread -p \"Enter name: \" username\necho \"Hello, $username\"</code></pre>\n        "
    },
    {
      "title": "Error Handling",
      "content": "\n          <pre><code>#!/bin/bash\nset -euo pipefail\n\n# set -e  : Exit immediately on error\n# set -u  : Error on undefined variables\n# set -o pipefail : Pipeline fails if any command fails\n\ntrap 'echo \"Error on line $LINENO\"; exit 1' ERR\n\n# Check if a command exists\nif ! command -v docker &> /dev/null; then\n  echo \"Docker is not installed\"\n  exit 1\nfi</code></pre>\n        "
    }
  ]
};
