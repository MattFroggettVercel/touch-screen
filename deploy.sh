#!/bin/bash
set -euo pipefail

# ============================================================================
# TouchScreen Pi Deployment Script
#
# Syncs code to a Raspberry Pi and updates services for testing.
#
# Usage: ./deploy.sh [PI_HOST] [--skip-install] [--restart]
#
#   PI_HOST      — SSH hostname (default: touchscreen)
#   --skip-install — Skip npm install steps
#   --restart     — Restart systemd services after deployment
# ============================================================================

PI_HOST="touchscreen"
PI_USER="pi"
SKIP_INSTALL=false
RESTART=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --skip-install)
      SKIP_INSTALL=true
      ;;
    --restart)
      RESTART=true
      ;;
    *)
      # First non-flag argument is the hostname (can include user@host)
      if [ "$PI_HOST" = "touchscreen" ] && [[ ! "$arg" =~ ^-- ]]; then
        if [[ "$arg" == *"@"* ]]; then
          # User@host format
          PI_USER="${arg%%@*}"
          PI_HOST="${arg#*@}"
        else
          PI_HOST="$arg"
        fi
      fi
      ;;
  esac
done

# Construct full SSH target
SSH_TARGET="${PI_USER}@${PI_HOST}"

echo "============================================"
echo "  TouchScreen Deployment"
echo "  Target: $SSH_TARGET"
echo "============================================"
echo ""

# Check SSH connection
echo "[1/6] Checking SSH connection..."
if ! ssh -o ConnectTimeout=5 "$SSH_TARGET" "echo 'Connected'" > /dev/null 2>&1; then
  echo "❌ Cannot connect to $SSH_TARGET"
  echo ""
  echo "Make sure:"
  echo "  1. The Pi is on the network"
  echo "  2. SSH key is installed (run: ssh-copy-id $SSH_TARGET)"
  echo "  3. Hostname is correct (or use IP: ./deploy.sh pi@192.168.x.x)"
  exit 1
fi
echo "✅ Connected"
echo ""

# Create remote directories
echo "[2/6] Creating remote directories..."
ssh "$SSH_TARGET" "mkdir -p /opt/touchscreen/server /opt/touchscreen/dashboard"
echo "✅ Directories ready"
echo ""

# Sync device-agent (server)
echo "[3/6] Syncing device-agent code..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '*.log' \
  --exclude 'config.json' \
  device-agent/ "$SSH_TARGET:/opt/touchscreen/server/"

# Copy config if it exists locally, otherwise use example
if [ -f "device-agent/config.json" ]; then
  echo "  → Copying config.json"
  scp device-agent/config.json "$SSH_TARGET:/opt/touchscreen/config.json"
else
  echo "  ⚠️  No local config.json found, using existing on Pi"
fi

echo "✅ Server code synced"
echo ""

# Sync sandbox-template (dashboard)
echo "[4/6] Syncing dashboard code..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  --exclude '*.log' \
  sandbox-template/ "$SSH_TARGET:/opt/touchscreen/dashboard/"

echo "✅ Dashboard code synced"
echo ""

# Install dependencies
if [ "$SKIP_INSTALL" = false ]; then
  echo "[5/6] Installing dependencies..."
  
  echo "  → Server dependencies..."
  ssh "$SSH_TARGET" "cd /opt/touchscreen/server && npm install --production --loglevel error"
  
  echo "  → Dashboard dependencies..."
  ssh "$SSH_TARGET" "cd /opt/touchscreen/dashboard && npm install --loglevel error"
  
  echo "✅ Dependencies installed"
else
  echo "[5/6] ⏭️  Skipping npm install (--skip-install)"
fi
echo ""

# Install/update systemd service
echo "[6/7] Installing/updating systemd service..."
if [ -f "device-agent/systemd/touchscreen-server.service" ]; then
  scp device-agent/systemd/touchscreen-server.service "$SSH_TARGET:/tmp/touchscreen-server.service"
  ssh "$SSH_TARGET" "sudo cp /tmp/touchscreen-server.service /etc/systemd/system/touchscreen-server.service && sudo systemctl daemon-reload"
  echo "✅ Service file updated"
else
  echo "  ⚠️  Service file not found, skipping"
fi
echo ""

# Restart services
if [ "$RESTART" = true ]; then
  echo "[7/7] Restarting services..."
  # Check if service file exists
  if ssh "$SSH_TARGET" "test -f /etc/systemd/system/touchscreen-server.service" 2>/dev/null; then
    ssh "$SSH_TARGET" "sudo systemctl daemon-reload && sudo systemctl restart touchscreen-server"
    echo "✅ Services restarted"
  else
    echo "  ⚠️  touchscreen-server.service not found"
    echo "  → The service file should have been installed in step 6"
    echo "  → To install manually:"
    echo "     ssh $SSH_TARGET 'sudo cp /opt/touchscreen/server/systemd/touchscreen-server.service /etc/systemd/system/'"
    echo "     ssh $SSH_TARGET 'sudo systemctl daemon-reload'"
    echo "     ssh $SSH_TARGET 'sudo systemctl enable --now touchscreen-server'"
  fi
else
  echo "[7/7] ⏭️  Skipping service restart (use --restart to enable)"
fi

echo ""
echo "============================================"
echo "  Deployment Complete!"
echo ""
echo "  Server:  ssh $SSH_TARGET 'curl http://localhost:3001/api/status'"
echo "  Logs:    ssh $SSH_TARGET 'journalctl -u touchscreen-server -f'"
echo ""
if ssh "$SSH_TARGET" "systemctl list-unit-files | grep -q touchscreen-server.service" 2>/dev/null; then
  echo "  To restart services:"
  echo "    ssh $SSH_TARGET 'sudo systemctl restart touchscreen-server'"
else
  echo "  ⚠️  Service not installed. To install:"
  echo "    1. Run setup.sh on the Pi, OR"
  echo "    2. Manually: ssh $SSH_TARGET 'sudo systemctl enable --now /etc/systemd/system/touchscreen-server.service'"
fi
echo "============================================"
