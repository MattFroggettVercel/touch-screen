#!/bin/bash
set -euo pipefail

# ============================================================================
# TouchScreen Pi Setup Script
#
# Installs all dependencies and configures the Raspberry Pi for the
# TouchScreen home automation dashboard system.
#
# Usage: sudo bash setup.sh <DEVICE_CODE> [HA_URL] [HA_TOKEN]
# ============================================================================

DEVICE_CODE="${1:-}"
HA_URL="${2:-}"
HA_TOKEN="${3:-}"

if [ -z "$DEVICE_CODE" ]; then
  echo "Usage: sudo bash setup.sh <DEVICE_CODE> [HA_URL] [HA_TOKEN]"
  echo ""
  echo "  DEVICE_CODE  — The unique device code (e.g. ABCD1234)"
  echo "  HA_URL       — Home Assistant URL (e.g. http://homeassistant:8123)"
  echo "  HA_TOKEN     — Home Assistant long-lived access token"
  exit 1
fi

echo "============================================"
echo "  TouchScreen Pi Setup"
echo "  Device Code: $DEVICE_CODE"
echo "============================================"
echo ""

# ---- System Packages ----

echo "[1/8] Installing system packages..."
apt-get update -qq

# Check if Node.js is already installed
if command -v node >/dev/null 2>&1; then
  NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
  echo "  Node.js already installed: v$(node -v | sed 's/v//')"
  
  # If Node.js < 20, upgrade via NodeSource
  if [ "$NODE_VERSION" -lt 20 ]; then
    echo "[!] Node.js $NODE_VERSION is too old. Upgrading to Node.js 22..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y -qq nodejs
  fi
else
  # Node.js not installed - try to install from apt first
  echo "  Installing Node.js from system packages..."
  if apt-get install -y -qq nodejs npm 2>/dev/null; then
    NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VERSION" -lt 20 ]; then
      echo "[!] System Node.js $NODE_VERSION is too old. Installing Node.js 22 from NodeSource..."
      curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
      apt-get install -y -qq nodejs
    fi
  else
    # If apt install fails (conflicts), install from NodeSource directly
    echo "  System package conflict detected. Installing Node.js 22 from NodeSource..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y -qq nodejs
  fi
fi

# Detect which Chromium package is available (newer Pi OS uses 'chromium', older uses 'chromium-browser')
CHROMIUM_PKG="chromium"
if ! apt-cache show chromium >/dev/null 2>&1; then
  CHROMIUM_PKG="chromium-browser"
fi
echo "  Using Chromium package: $CHROMIUM_PKG"

apt-get install -y -qq \
  $CHROMIUM_PKG \
  avahi-daemon \
  avahi-utils \
  hostapd \
  dnsmasq \
  unclutter \
  xdotool

# ---- Copy Dashboard Template ----

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ---- Config File ----


# ---- mDNS (Avahi) ----

echo "[6/8] Configuring mDNS advertisement..."
mkdir -p /etc/avahi/services

cat > /etc/avahi/services/touchscreen.service << EOF
<?xml version="1.0" standalone='no'?>
<!DOCTYPE service-group SYSTEM "avahi-service.dtd">
<service-group>
  <name>TouchScreen $DEVICE_CODE</name>
  <service>
    <type>_touchscreen._tcp</type>
    <port>3001</port>
    <txt-record>code=$DEVICE_CODE</txt-record>
  </service>
</service-group>
EOF

systemctl enable avahi-daemon
systemctl restart avahi-daemon

# ---- WiFi AP Mode ----

echo "[7/8] Configuring WiFi AP mode services..."

# Disable hostapd and dnsmasq by default (will be started on demand)
systemctl stop hostapd 2>/dev/null || true
systemctl stop dnsmasq 2>/dev/null || true
systemctl disable hostapd 2>/dev/null || true
systemctl disable dnsmasq 2>/dev/null || true

# ---- Systemd Services ----

echo "[8/8] Installing systemd services..."
cp "$SCRIPT_DIR/systemd/touchscreen-server.service" /etc/systemd/system/

# Detect Chromium binary path and update kiosk service
CHROMIUM_BIN="/usr/bin/chromium"
if [ ! -f "$CHROMIUM_BIN" ]; then
  CHROMIUM_BIN="/usr/bin/chromium-browser"
fi
echo "  Using Chromium binary: $CHROMIUM_BIN"

# Create kiosk service with correct binary path
cat > /etc/systemd/system/touchscreen-kiosk.service << EOF
[Unit]
Description=TouchScreen Chromium Kiosk
After=graphical.target touchscreen-server.service
Wants=touchscreen-server.service

[Service]
Type=simple
User=pi
Environment=DISPLAY=:0
Environment=XAUTHORITY=/home/pi/.Xauthority
ExecStartPre=/bin/sleep 5
ExecStart=$CHROMIUM_BIN \\
  --noerrdialogs \\
  --disable-infobars \\
  --disable-session-crashed-bubble \\
  --kiosk \\
  --incognito \\
  --disable-translate \\
  --disable-features=TranslateUI \\
  --overscroll-history-navigation=0 \\
  --disable-pinch \\
  --autoplay-policy=no-user-gesture-required \\
  http://localhost:5173
Restart=on-failure
RestartSec=5

[Install]
WantedBy=graphical.target
EOF

systemctl daemon-reload
systemctl enable touchscreen-server
systemctl enable touchscreen-kiosk
systemctl start touchscreen-server

echo ""
echo "============================================"
echo "  Setup Complete!"
echo ""
echo "  Server:  http://localhost:3001"
echo "  mDNS:    touchscreen-${DEVICE_CODE}._touchscreen._tcp.local"
echo ""
echo "  The server is running. The kiosk will"
echo "  start on the next reboot (or start it"
echo "  now with: systemctl start touchscreen-kiosk)"
echo "============================================"
