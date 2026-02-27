#!/bin/bash
# Helper script to test WiFi AP mode on the Pi

PI_HOST="${1:-touchscreen}"
PI_USER="${PI_HOST%%@*}"
if [ "$PI_USER" = "$PI_HOST" ]; then
  PI_USER="pi"
  SSH_TARGET="pi@${PI_HOST}"
else
  SSH_TARGET="$PI_HOST"
fi

echo "============================================"
echo "  Testing WiFi AP Mode"
echo "  Target: $SSH_TARGET"
echo "============================================"
echo ""

echo "[1/3] Removing WiFi configured flag..."
ssh "$SSH_TARGET" "sudo rm -f /opt/touchscreen/.wifi-configured"
echo "✅ Flag removed"
echo ""

echo "[2/3] Restarting touchscreen-server..."
ssh "$SSH_TARGET" "sudo systemctl restart touchscreen-server"
echo "✅ Server restarted"
echo ""

echo "[3/3] Checking status..."
sleep 2
ssh "$SSH_TARGET" "curl -s http://localhost:3001/api/status | python3 -m json.tool || echo 'Server not responding yet'"
echo ""

echo "============================================"
echo "  Next Steps:"
echo ""
echo "  1. Check the server logs:"
echo "     ssh $SSH_TARGET 'journalctl -u touchscreen-server -f'"
echo ""
echo "  2. Look for WiFi AP:"
echo "     - SSID: TouchScreen-{DEVICE_CODE}"
echo "     - IP: 192.168.4.1"
echo ""
echo "  3. Connect your phone to the AP"
echo "  4. Open the mobile app and go to 'Add Device'"
echo "============================================"
