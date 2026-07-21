#!/bin/bash
###############################################################################
# LinuxTech - One-Click Deployment Script
# Purpose: Deploy the static website to a Linux server (Nginx)
# Supports: Debian/Ubuntu, RHEL/CentOS/Fedora, Arch Linux
# Usage: sudo bash deploy.sh
###############################################################################

set -euo pipefail

# === Configuration ===
APP_NAME="linuxtech"
WEB_ROOT="/var/www/${APP_NAME}"
NGINX_CONF="/etc/nginx/sites-available/${APP_NAME}"
NGINX_LINK="/etc/nginx/sites-enabled/${APP_NAME}"
SERVER_NAME="_"  # Default accepts all domains; change to your domain e.g. "linuxtech.example.com"
PORT=8080

# === Color Output ===
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# === Check Root Privileges ===
if [[ $EUID -ne 0 ]]; then
  error "This script requires root privileges. Run with: sudo bash deploy.sh"
fi

# === Detect Distribution ===
detect_distro() {
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    DISTRO_ID="${ID}"
    DISTRO_NAME="${PRETTY_NAME}"
  elif [ -f /etc/redhat-release ]; then
    DISTRO_ID="rhel"
    DISTRO_NAME=$(cat /etc/redhat-release)
  else
    error "Unable to detect Linux distribution"
  fi
  info "Detected system: ${DISTRO_NAME}"
}

# === Install Nginx ===
install_nginx() {
  if command -v nginx &> /dev/null; then
    info "Nginx already installed, skipping"
    return
  fi

  info "Installing Nginx..."
  case "${DISTRO_ID}" in
    ubuntu|debian|linuxmint|pop)
      apt-get update -qq
      apt-get install -y -qq nginx
      ;;
    centos|rhel|rocky|almalinux|fedora)
      if command -v dnf &> /dev/null; then
        dnf install -y nginx
      else
        yum install -y nginx
      fi
      ;;
    arch|manjaro)
      pacman -Sy --noconfirm nginx
      ;;
    *)
      error "Unsupported distribution: ${DISTRO_ID}. Please install Nginx manually."
      ;;
  esac
  info "Nginx installation complete"
}

# === Deploy Website Files ===
deploy_files() {
  info "Deploying website files to ${WEB_ROOT}..."

  # Get the script directory (project root)
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

  # Create web root directory
  mkdir -p "${WEB_ROOT}"

  # Copy files (exclude .git and deploy.sh)
  if command -v rsync &> /dev/null; then
    rsync -av --delete \
      --exclude='.git' \
      --exclude='deploy.sh' \
      --exclude='.gitignore' \
      --exclude='README.md' \
      "${SCRIPT_DIR}/" "${WEB_ROOT}/"
  else
    # fallback: use cp
    rm -rf "${WEB_ROOT:?}"/*
    cp -r "${SCRIPT_DIR}/index.html" "${WEB_ROOT}/"
    cp -r "${SCRIPT_DIR}/css" "${WEB_ROOT}/"
    cp -r "${SCRIPT_DIR}/js" "${WEB_ROOT}/"
  fi

  # Set ownership and permissions
  chown -R www-data:www-data "${WEB_ROOT}" 2>/dev/null || \
  chown -R nginx:nginx "${WEB_ROOT}" 2>/dev/null || \
  chown -R http:http "${WEB_ROOT}" 2>/dev/null || true

  chmod -R 755 "${WEB_ROOT}"
  info "File deployment complete"
}

# === Configure Nginx ===
configure_nginx() {
  info "Configuring Nginx virtual host..."

  # Handle different distro Nginx config structures
  case "${DISTRO_ID}" in
    ubuntu|debian|linuxmint|pop)
      # Debian-based uses sites-available / sites-enabled
      mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled

      cat > "${NGINX_CONF}" <<EOF
server {
    listen ${PORT};
    listen [::]:${PORT};

    server_name ${SERVER_NAME};
    root ${WEB_ROOT};
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Static asset caching
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing support (hash-based doesn't need this, but kept for future)
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
    }
}
EOF

      # Remove default site (if exists)
      rm -f /etc/nginx/sites-enabled/default

      # Enable site via symlink
      ln -sf "${NGINX_CONF}" "${NGINX_LINK}"
      ;;

    centos|rhel|rocky|almalinux|fedora|arch|manjaro)
      # RHEL/Arch-based uses conf.d
      mkdir -p /etc/nginx/conf.d

      cat > "/etc/nginx/conf.d/${APP_NAME}.conf" <<EOF
server {
    listen ${PORT};
    listen [::]:${PORT};

    server_name ${SERVER_NAME};
    root ${WEB_ROOT};
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Static asset caching
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location ~ /\. {
        deny all;
    }
}
EOF
      # Warn about potential default server block conflict
      if grep -q "^\s*server {" /etc/nginx/nginx.conf 2>/dev/null; then
        warn "Default server block detected in nginx.conf; consider removing it to avoid conflicts"
      fi
      ;;
  esac

  # Test configuration
  nginx -t || error "Nginx configuration test failed. Please check the config file."
  info "Nginx configuration complete"
}

# === Configure Firewall ===
configure_firewall() {
  info "Configuring firewall..."

  if command -v ufw &> /dev/null; then
    ufw allow "${PORT}/tcp" >/dev/null 2>&1 || true
    info "Opened ufw port ${PORT}"
  elif command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-port="${PORT}/tcp" >/dev/null 2>&1 || true
    firewall-cmd --reload >/dev/null 2>&1 || true
    info "Opened firewalld port ${PORT}"
  else
    warn "No firewall tool detected. Please manually ensure port ${PORT} is open."
  fi
}

# === Start Nginx ===
start_nginx() {
  info "Starting Nginx service..."
  systemctl enable nginx >/dev/null 2>&1
  systemctl restart nginx

  if systemctl is-active --quiet nginx; then
    info "Nginx started successfully"
  else
    error "Nginx failed to start. Check with: systemctl status nginx"
  fi
}

# === Show Result ===
show_result() {
  # Get IP address
  LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

  echo ""
  echo "==========================================="
  echo -e "${GREEN} ✓ LinuxTech deployed successfully!${NC}"
  echo "==========================================="
  echo ""
  echo "  Web root:  ${WEB_ROOT}"
  echo "  Access URL: http://${LOCAL_IP}:${PORT}"
  echo ""
  echo "  Management commands:"
  echo "    Restart: sudo systemctl restart nginx"
  echo "    Status:  sudo systemctl status nginx"
  echo "    Logs:    sudo journalctl -u nginx -f"
  echo ""
  echo "==========================================="
}

# === Main Flow ===
main() {
  echo ""
  echo "╔═══════════════════════════════════════════╗"
  echo "║   🐧 LinuxTech One-Click Deployment      ║"
  echo "╠═══════════════════════════════════════════╣"
  echo "║   Deploy website to local Nginx server    ║"
  echo "╚═══════════════════════════════════════════╝"
  echo ""

  detect_distro
  install_nginx
  deploy_files
  configure_nginx
  configure_firewall
  start_nginx
  show_result
}

main "$@"
