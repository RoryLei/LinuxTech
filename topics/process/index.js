/**
 * Topic: Process Management
 */
const TOPIC_PROCESS = {
  "id": "process",
  "icon": "⚙️",
  "title": "Process Management",
  "description": "Learn how to monitor, control, and schedule system processes",
  "sections": [
    {
      "title": "Process Monitoring",
      "content": "\n          <pre><code># Real-time system monitor\ntop\nhtop\n\n# List all processes\nps aux\n\n# View process tree\npstree\n\n# Search for a specific process\npgrep -a nginx</code></pre>\n        "
    },
    {
      "title": "Process Control",
      "content": "\n          <pre><code># Send signals\nkill -15 PID      # Graceful termination (SIGTERM)\nkill -9 PID       # Force kill (SIGKILL)\nkillall nginx     # Kill all processes with same name\n\n# Background execution\ncommand &\nnohup command &   # Survives terminal close\n\n# Foreground/background switching\nCtrl+Z            # Suspend\nbg                # Send to background\nfg                # Bring to foreground\njobs              # List jobs</code></pre>\n        "
    },
    {
      "title": "Scheduled Jobs (Cron)",
      "content": "\n          <pre><code># Edit crontab\ncrontab -e\n\n# Format: min hour day month weekday command\n# Run backup daily at 2 AM\n0 2 * * * /usr/local/bin/backup.sh\n\n# Run every 5 minutes\n*/5 * * * * /scripts/health-check.sh\n\n# List current schedules\ncrontab -l</code></pre>\n        "
    }
  ]
};
