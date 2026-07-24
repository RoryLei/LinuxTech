/**
 * Topic: Systemd & Services
 */
const TOPIC_SYSTEMD = {
  "id": "systemd",
  "icon": "🔧",
  "title": "Systemd & Services",
  "description": "Manage system services, boot targets, and log queries",
  "sections": [
    {
      "title": "Service Management",
      "content": "\n          <pre><code># Start/stop/restart a service\nsudo systemctl start nginx\nsudo systemctl stop nginx\nsudo systemctl restart nginx\nsudo systemctl reload nginx\n\n# Enable/disable at boot\nsudo systemctl enable nginx\nsudo systemctl disable nginx\n\n# Check service status\nsystemctl status nginx\n\n# List all services\nsystemctl list-units --type=service</code></pre>\n        "
    },
    {
      "title": "Custom Services",
      "content": "\n          <p>Create a unit file in <code>/etc/systemd/system/</code>:</p>\n          <pre><code>[Unit]\nDescription=My Application\nAfter=network.target\n\n[Service]\nType=simple\nUser=appuser\nWorkingDirectory=/opt/myapp\nExecStart=/opt/myapp/start.sh\nRestart=on-failure\nRestartSec=5\n\n[Install]\nWantedBy=multi-user.target</code></pre>\n          <pre><code># Reload configuration\nsudo systemctl daemon-reload\n\n# Start custom service\nsudo systemctl enable --now myapp.service</code></pre>\n        "
    },
    {
      "title": "Log Queries (journalctl)",
      "content": "\n          <pre><code># View logs for a specific service\njournalctl -u nginx\n\n# Follow in real-time\njournalctl -u nginx -f\n\n# View last hour\njournalctl --since \"1 hour ago\"\n\n# View boot logs\njournalctl -b\n\n# Filter by priority\njournalctl -p err</code></pre>\n        "
    }
  ]
};
