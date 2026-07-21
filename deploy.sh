#!/bin/bash
###############################################################################
# LinuxTech - 一鍵部署腳本
# 用途：將靜態網站部署到 Linux 伺服器（Nginx）
# 支援：Debian/Ubuntu, RHEL/CentOS/Fedora, Arch Linux
# 使用方式：sudo bash deploy.sh
###############################################################################

set -euo pipefail

# === 設定 ===
APP_NAME="linuxtech"
WEB_ROOT="/var/www/${APP_NAME}"
NGINX_CONF="/etc/nginx/sites-available/${APP_NAME}"
NGINX_LINK="/etc/nginx/sites-enabled/${APP_NAME}"
SERVER_NAME="_"  # 預設接受所有 domain，可改為你的域名如 "linuxtech.example.com"
PORT=8080

# === 顏色輸出 ===
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# === 檢查 root 權限 ===
if [[ $EUID -ne 0 ]]; then
  error "此腳本需要 root 權限執行，請使用: sudo bash deploy.sh"
fi

# === 偵測發行版 ===
detect_distro() {
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    DISTRO_ID="${ID}"
    DISTRO_NAME="${PRETTY_NAME}"
  elif [ -f /etc/redhat-release ]; then
    DISTRO_ID="rhel"
    DISTRO_NAME=$(cat /etc/redhat-release)
  else
    error "無法偵測 Linux 發行版"
  fi
  info "偵測到系統: ${DISTRO_NAME}"
}

# === 安裝 Nginx ===
install_nginx() {
  if command -v nginx &> /dev/null; then
    info "Nginx 已安裝，跳過安裝步驟"
    return
  fi

  info "正在安裝 Nginx..."
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
      error "不支援的發行版: ${DISTRO_ID}，請手動安裝 Nginx"
      ;;
  esac
  info "Nginx 安裝完成"
}

# === 部署網站檔案 ===
deploy_files() {
  info "部署網站檔案到 ${WEB_ROOT}..."

  # 取得腳本所在目錄（即專案根目錄）
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

  # 建立網站目錄
  mkdir -p "${WEB_ROOT}"

  # 複製檔案（排除 .git 和 deploy.sh 本身）
  if command -v rsync &> /dev/null; then
    rsync -av --delete \
      --exclude='.git' \
      --exclude='deploy.sh' \
      --exclude='.gitignore' \
      --exclude='README.md' \
      "${SCRIPT_DIR}/" "${WEB_ROOT}/"
  else
    # fallback: 使用 cp
    rm -rf "${WEB_ROOT:?}"/*
    cp -r "${SCRIPT_DIR}/index.html" "${WEB_ROOT}/"
    cp -r "${SCRIPT_DIR}/css" "${WEB_ROOT}/"
    cp -r "${SCRIPT_DIR}/js" "${WEB_ROOT}/"
  fi

  # 設定擁有者與權限
  chown -R www-data:www-data "${WEB_ROOT}" 2>/dev/null || \
  chown -R nginx:nginx "${WEB_ROOT}" 2>/dev/null || \
  chown -R http:http "${WEB_ROOT}" 2>/dev/null || true

  chmod -R 755 "${WEB_ROOT}"
  info "檔案部署完成"
}

# === 設定 Nginx ===
configure_nginx() {
  info "設定 Nginx 虛擬主機..."

  # 處理不同發行版的 Nginx 設定結構
  case "${DISTRO_ID}" in
    ubuntu|debian|linuxmint|pop)
      # Debian 系使用 sites-available / sites-enabled
      mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled

      cat > "${NGINX_CONF}" <<EOF
server {
    listen ${PORT};
    listen [::]:${PORT};

    server_name ${SERVER_NAME};
    root ${WEB_ROOT};
    index index.html;

    # 安全標頭
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 靜態資源快取
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # SPA 路由支援（hash-based 不需要，但保留以備未來擴充）
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # 禁止存取隱藏檔
    location ~ /\. {
        deny all;
    }
}
EOF

      # 移除預設站台（如果存在）
      rm -f /etc/nginx/sites-enabled/default

      # 建立 symlink 啟用站台
      ln -sf "${NGINX_CONF}" "${NGINX_LINK}"
      ;;

    centos|rhel|rocky|almalinux|fedora|arch|manjaro)
      # RHEL/Arch 系使用 conf.d
      mkdir -p /etc/nginx/conf.d

      cat > "/etc/nginx/conf.d/${APP_NAME}.conf" <<EOF
server {
    listen ${PORT};
    listen [::]:${PORT};

    server_name ${SERVER_NAME};
    root ${WEB_ROOT};
    index index.html;

    # 安全標頭
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 靜態資源快取
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
      # 註解掉預設 server block（如果在 nginx.conf 中）
      if grep -q "^\s*server {" /etc/nginx/nginx.conf 2>/dev/null; then
        warn "偵測到 nginx.conf 中有預設 server block，建議手動移除以避免衝突"
      fi
      ;;
  esac

  # 測試設定
  nginx -t || error "Nginx 設定檢測失敗，請檢查設定檔"
  info "Nginx 設定完成"
}

# === 設定防火牆 ===
configure_firewall() {
  info "設定防火牆..."

  if command -v ufw &> /dev/null; then
    ufw allow "${PORT}/tcp" >/dev/null 2>&1 || true
    info "已開啟 ufw port ${PORT}"
  elif command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-port="${PORT}/tcp" >/dev/null 2>&1 || true
    firewall-cmd --reload >/dev/null 2>&1 || true
    info "已開啟 firewalld port ${PORT}"
  else
    warn "未偵測到防火牆工具，請手動確認 port ${PORT} 已開啟"
  fi
}

# === 啟動 Nginx ===
start_nginx() {
  info "啟動 Nginx 服務..."
  systemctl enable nginx >/dev/null 2>&1
  systemctl restart nginx

  if systemctl is-active --quiet nginx; then
    info "Nginx 已成功啟動"
  else
    error "Nginx 啟動失敗，請檢查: systemctl status nginx"
  fi
}

# === 顯示結果 ===
show_result() {
  # 取得 IP
  LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

  echo ""
  echo "==========================================="
  echo -e "${GREEN} ✓ LinuxTech 部署成功！${NC}"
  echo "==========================================="
  echo ""
  echo "  網站目錄: ${WEB_ROOT}"
  echo "  存取網址: http://${LOCAL_IP}:${PORT}"
  echo ""
  echo "  管理指令:"
  echo "    重啟:  sudo systemctl restart nginx"
  echo "    狀態:  sudo systemctl status nginx"
  echo "    日誌:  sudo journalctl -u nginx -f"
  echo ""
  echo "==========================================="
}

# === 主流程 ===
main() {
  echo ""
  echo "╔═══════════════════════════════════════════╗"
  echo "║   🐧 LinuxTech 一鍵部署工具              ║"
  echo "╠═══════════════════════════════════════════╣"
  echo "║   將網站部署到本機 Nginx 伺服器          ║"
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
