/**
 * Topic: Package Management
 */
const TOPIC_PACKAGES = {
  "id": "packages",
  "icon": "📦",
  "title": "Package Management",
  "description": "Manage software packages using apt, yum, dnf, and more",
  "sections": [
    {
      "title": "Debian / Ubuntu (apt)",
      "content": "\n          <pre><code># Update package list\nsudo apt update\n\n# Upgrade installed packages\nsudo apt upgrade\n\n# Install a package\nsudo apt install nginx\n\n# Remove a package\nsudo apt remove nginx\nsudo apt purge nginx    # Also remove config files\n\n# Search packages\napt search keyword\n\n# List installed packages\ndpkg -l | grep nginx</code></pre>\n        "
    },
    {
      "title": "RHEL / CentOS / Fedora (dnf/yum)",
      "content": "\n          <pre><code># Install a package\nsudo dnf install httpd\n\n# Remove a package\nsudo dnf remove httpd\n\n# Search packages\ndnf search keyword\n\n# List installed\ndnf list installed\n\n# Show package info\ndnf info nginx</code></pre>\n        "
    },
    {
      "title": "Snap & Flatpak",
      "content": "\n          <pre><code># Snap\nsudo snap install code --classic\nsnap list\nsudo snap remove code\n\n# Flatpak\nflatpak install flathub org.gimp.GIMP\nflatpak list\nflatpak uninstall org.gimp.GIMP</code></pre>\n        "
    }
  ]
};
