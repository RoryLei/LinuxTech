#!/bin/bash
###############################################################################
# build-standalone.sh — Build ebpf-hw-diag as a standalone distributable package
#
# Creates a self-contained directory or tarball that can be deployed to any
# Linux server without cloning the full LinuxTech repository.
#
# Usage:
#   ./build-standalone.sh [--tarball] [--output DIR]
#
# Output:
#   dist/ebpf-hw-diag-standalone/    (directory)
#   dist/ebpf-hw-diag-standalone.tar.gz  (if --tarball)
###############################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERSION="0.1.0"
BUILD_DIR="${SCRIPT_DIR}/dist/ebpf-hw-diag-standalone"
MAKE_TARBALL=false
OUTPUT_DIR=""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[BUILD]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }

# Parse args
while [[ $# -gt 0 ]]; do
    case $1 in
        --tarball) MAKE_TARBALL=true; shift ;;
        --output) OUTPUT_DIR="$2"; shift 2 ;;
        -h|--help)
            echo "Usage: $0 [--tarball] [--output DIR]"
            echo "  --tarball   Also create .tar.gz archive"
            echo "  --output    Output directory (default: dist/)"
            exit 0
            ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

if [[ -n "$OUTPUT_DIR" ]]; then
    BUILD_DIR="${OUTPUT_DIR}/ebpf-hw-diag-standalone"
fi

# Clean previous build
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

info "Building ebpf-hw-diag standalone v${VERSION}"
info "Output: ${BUILD_DIR}"

# === Copy source packages ===
info "Copying source packages..."
for pkg in agent_cmd collectors config core correlator events exporters probes; do
    if [[ -d "${SCRIPT_DIR}/${pkg}" ]]; then
        cp -r "${SCRIPT_DIR}/${pkg}" "${BUILD_DIR}/"
        # Remove __pycache__
        find "${BUILD_DIR}/${pkg}" -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    fi
done

# === Copy config files ===
info "Copying configuration..."
mkdir -p "${BUILD_DIR}/config"
cp "${SCRIPT_DIR}/config/default.yaml" "${BUILD_DIR}/config/"
cp "${SCRIPT_DIR}/config/alert_rules.yaml" "${BUILD_DIR}/config/"
cp "${SCRIPT_DIR}/correlator/builtin_rules.yaml" "${BUILD_DIR}/correlator/"

# === Copy docs ===
info "Copying documentation..."
mkdir -p "${BUILD_DIR}/docs"
cp "${SCRIPT_DIR}/docs/user-guide.md" "${BUILD_DIR}/docs/" 2>/dev/null || true
cp "${SCRIPT_DIR}/docs/specification.md" "${BUILD_DIR}/docs/" 2>/dev/null || true

# === Copy tests ===
info "Copying tests..."
cp -r "${SCRIPT_DIR}/tests" "${BUILD_DIR}/"
find "${BUILD_DIR}/tests" -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true

# === Generate install script ===
info "Generating install script..."
cat > "${BUILD_DIR}/install.sh" << 'INSTALL_EOF'
#!/bin/bash
###############################################################################
# install.sh — Install ebpf-hw-diag on the target system
###############################################################################
set -euo pipefail

INSTALL_DIR="/opt/ebpf-hw-diag"
CONFIG_DIR="/etc/ebpf-hw-diag"
LOG_DIR="/var/log/ebpf-hw-diag"
SERVICE_NAME="ebpf-hw-diag"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INSTALL]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Check root
if [[ $EUID -ne 0 ]]; then
    error "This script requires root. Run with: sudo bash install.sh"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Detect distro and install dependencies
info "Installing dependencies..."
if command -v apt-get &>/dev/null; then
    apt-get update -qq
    apt-get install -y -qq python3 python3-pip python3-yaml python3-bpfcc 2>/dev/null || \
    apt-get install -y -qq python3 python3-pip python3-yaml
elif command -v dnf &>/dev/null; then
    dnf install -y python3 python3-pip python3-pyyaml python3-bcc 2>/dev/null || \
    dnf install -y python3 python3-pip python3-pyyaml
elif command -v pacman &>/dev/null; then
    pacman -Sy --noconfirm python python-pip python-yaml python-bcc 2>/dev/null || \
    pacman -Sy --noconfirm python python-pip python-yaml
fi

# Install Python deps that may not be in system packages
pip3 install --break-system-packages prometheus-client 2>/dev/null || \
pip3 install prometheus-client 2>/dev/null || true

# Create directories
info "Creating directories..."
mkdir -p "$INSTALL_DIR"
mkdir -p "$CONFIG_DIR"
mkdir -p "$LOG_DIR"

# Copy application
info "Installing to ${INSTALL_DIR}..."
cp -r "${SCRIPT_DIR}/agent_cmd" "$INSTALL_DIR/"
cp -r "${SCRIPT_DIR}/collectors" "$INSTALL_DIR/"
cp -r "${SCRIPT_DIR}/config" "$INSTALL_DIR/"
cp -r "${SCRIPT_DIR}/core" "$INSTALL_DIR/"
cp -r "${SCRIPT_DIR}/correlator" "$INSTALL_DIR/"
cp -r "${SCRIPT_DIR}/events" "$INSTALL_DIR/"
cp -r "${SCRIPT_DIR}/exporters" "$INSTALL_DIR/"
cp -r "${SCRIPT_DIR}/probes" "$INSTALL_DIR/"

# Copy config to /etc (don't overwrite existing)
if [[ ! -f "${CONFIG_DIR}/config.yaml" ]]; then
    cp "${SCRIPT_DIR}/config/default.yaml" "${CONFIG_DIR}/config.yaml"
    info "Default config installed to ${CONFIG_DIR}/config.yaml"
else
    info "Config already exists at ${CONFIG_DIR}/config.yaml (not overwritten)"
fi

if [[ ! -f "${CONFIG_DIR}/alert_rules.yaml" ]]; then
    cp "${SCRIPT_DIR}/config/alert_rules.yaml" "${CONFIG_DIR}/alert_rules.yaml"
fi

# Create convenience wrapper script
info "Creating /usr/local/bin/diagd..."
cat > /usr/local/bin/diagd << 'WRAPPER_EOF'
#!/bin/bash
exec python3 -m agent_cmd.diagd.main --config /etc/ebpf-hw-diag/config.yaml "$@"
WRAPPER_EOF
chmod +x /usr/local/bin/diagd

# Create systemd service
info "Installing systemd service..."
cat > "/etc/systemd/system/${SERVICE_NAME}.service" << SERVICE_EOF
[Unit]
Description=eBPF Hardware Diagnostics Agent
After=network.target
Documentation=file://${INSTALL_DIR}/docs/user-guide.md

[Service]
Type=simple
ExecStart=/usr/local/bin/diagd
WorkingDirectory=${INSTALL_DIR}
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICE_EOF

systemctl daemon-reload

# Copy docs
if [[ -d "${SCRIPT_DIR}/docs" ]]; then
    cp -r "${SCRIPT_DIR}/docs" "$INSTALL_DIR/"
fi

# Copy tests (optional, for validation on target)
if [[ -d "${SCRIPT_DIR}/tests" ]]; then
    cp -r "${SCRIPT_DIR}/tests" "$INSTALL_DIR/"
fi

# Print summary
echo ""
echo "==========================================="
echo -e "${GREEN} ✓ ebpf-hw-diag installed successfully!${NC}"
echo "==========================================="
echo ""
echo "  Install dir:  ${INSTALL_DIR}"
echo "  Config:       ${CONFIG_DIR}/config.yaml"
echo "  Log dir:      ${LOG_DIR}"
echo "  Wrapper:      /usr/local/bin/diagd"
echo ""
echo "  Usage:"
echo "    sudo diagd                         # run foreground"
echo "    sudo systemctl start ${SERVICE_NAME}  # run as service"
echo "    sudo systemctl enable ${SERVICE_NAME} # start on boot"
echo "    sudo systemctl status ${SERVICE_NAME} # check status"
echo ""
echo "  Metrics:  http://localhost:9101/metrics"
echo "  Health:   http://localhost:9102/healthz"
echo ""
echo "  Uninstall:"
echo "    sudo systemctl disable --now ${SERVICE_NAME}"
echo "    sudo rm -rf ${INSTALL_DIR} ${CONFIG_DIR} /usr/local/bin/diagd"
echo "    sudo rm /etc/systemd/system/${SERVICE_NAME}.service"
echo ""
echo "==========================================="
INSTALL_EOF
chmod +x "${BUILD_DIR}/install.sh"

# === Generate uninstall script ===
cat > "${BUILD_DIR}/uninstall.sh" << 'UNINSTALL_EOF'
#!/bin/bash
set -euo pipefail
echo "Removing ebpf-hw-diag..."
sudo systemctl disable --now ebpf-hw-diag 2>/dev/null || true
sudo rm -rf /opt/ebpf-hw-diag
sudo rm -rf /etc/ebpf-hw-diag
sudo rm -f /usr/local/bin/diagd
sudo rm -f /etc/systemd/system/ebpf-hw-diag.service
sudo systemctl daemon-reload
echo "Done. Log directory /var/log/ebpf-hw-diag preserved."
UNINSTALL_EOF
chmod +x "${BUILD_DIR}/uninstall.sh"

# === Generate run-without-install script ===
cat > "${BUILD_DIR}/run.sh" << 'RUN_EOF'
#!/bin/bash
# Run ebpf-hw-diag directly without installing (for testing)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
if [[ $EUID -ne 0 ]]; then
    echo "Requires root. Run with: sudo ./run.sh"
    exit 1
fi
exec python3 -m agent_cmd.diagd.main --config config/default.yaml "$@"
RUN_EOF
chmod +x "${BUILD_DIR}/run.sh"

# === Generate test script ===
cat > "${BUILD_DIR}/run-tests.sh" << 'TEST_EOF'
#!/bin/bash
# Run unit tests (no root needed)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
python3 -m pytest tests/unit/ -v
TEST_EOF
chmod +x "${BUILD_DIR}/run-tests.sh"

# === Copy metadata ===
cp "${SCRIPT_DIR}/pyproject.toml" "${BUILD_DIR}/"
cp "${SCRIPT_DIR}/Makefile" "${BUILD_DIR}/"
cp "${SCRIPT_DIR}/README.md" "${BUILD_DIR}/"

# === Generate VERSION file ===
echo "$VERSION" > "${BUILD_DIR}/VERSION"

# === Create tarball ===
if [[ "$MAKE_TARBALL" == "true" ]]; then
    TARBALL="$(dirname "$BUILD_DIR")/ebpf-hw-diag-${VERSION}.tar.gz"
    info "Creating tarball: ${TARBALL}"
    tar -czf "$TARBALL" -C "$(dirname "$BUILD_DIR")" "$(basename "$BUILD_DIR")"
    info "Tarball size: $(du -h "$TARBALL" | cut -f1)"
fi

# === Summary ===
echo ""
echo "==========================================="
info "Build complete!"
echo "==========================================="
echo ""
echo "  Output directory: ${BUILD_DIR}"
echo "  Files: $(find "$BUILD_DIR" -type f | wc -l)"
echo "  Size: $(du -sh "$BUILD_DIR" | cut -f1)"
echo ""
echo "  To deploy on a target server:"
echo "    1. Copy the directory (or tarball) to the target"
echo "    2. Run: sudo bash install.sh"
echo ""
echo "  To run without installing (for testing):"
echo "    sudo ./run.sh"
echo ""
echo "  To run unit tests:"
echo "    ./run-tests.sh"
echo ""
if [[ "$MAKE_TARBALL" == "true" ]]; then
    echo "  Tarball: ${TARBALL}"
    echo "  Deploy:  scp ${TARBALL} user@server:/tmp/"
    echo "           ssh server 'cd /tmp && tar xzf ebpf-hw-diag-*.tar.gz && cd ebpf-hw-diag-standalone && sudo bash install.sh'"
    echo ""
fi
echo "==========================================="
