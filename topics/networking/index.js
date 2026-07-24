/**
 * Topic: Network Management
 */
const TOPIC_NETWORKING = {
  "id": "networking",
  "icon": "🌐",
  "title": "Network Management",
  "description": "Master IP configuration, firewall rules, and network debugging tools",
  "sections": [
    {
      "title": "Network Interface Configuration",
      "content": "\n          <pre><code># Show network interfaces\nip addr show\n\n# Set IP address\nip addr add 192.168.1.100/24 dev eth0\n\n# Enable/disable interface\nip link set eth0 up\nip link set eth0 down\n\n# Show routing table\nip route show</code></pre>\n        "
    },
    {
      "title": "Network Debugging Tools",
      "content": "\n          <ul>\n            <li><code>ping</code> — Test host connectivity</li>\n            <li><code>traceroute</code> — Trace packet path</li>\n            <li><code>netstat / ss</code> — View connections and port status</li>\n            <li><code>dig / nslookup</code> — DNS lookup</li>\n            <li><code>curl / wget</code> — HTTP request tools</li>\n            <li><code>tcpdump</code> — Packet capture and analysis</li>\n          </ul>\n          <pre><code># Show all listening ports\nss -tlnp\n\n# DNS lookup\ndig example.com\n\n# Capture packets\ntcpdump -i eth0 port 80</code></pre>\n        "
    },
    {
      "title": "Firewall (iptables / nftables)",
      "content": "\n          <pre><code># List rules\niptables -L -n\n\n# Allow SSH\niptables -A INPUT -p tcp --dport 22 -j ACCEPT\n\n# Block a specific IP\niptables -A INPUT -s 10.0.0.5 -j DROP\n\n# Using ufw (simplified firewall)\nufw allow 80/tcp\nufw enable</code></pre>\n        "
    }
  ]
};
