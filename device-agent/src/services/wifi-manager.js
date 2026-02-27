/**
 * WiFi Manager
 *
 * Manages WiFi AP mode (hostapd + dnsmasq) for first-boot setup,
 * and client mode (wpa_supplicant) for normal operation.
 *
 * On first boot the Pi creates a WiFi AP named "TouchScreen-{CODE}".
 * The companion app connects to this AP, configures the home WiFi
 * credentials, and the Pi switches to client mode.
 *
 * Note: WiFi management requires root privileges. The systemd service
 * should run as root, or the user should have sudo access without password
 * for the relevant commands.
 */

import { execSync, exec } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";

const SETUP_FLAG = "/opt/touchscreen/.wifi-configured";
const WPA_CONF = "/etc/wpa_supplicant/wpa_supplicant.conf";
const HOSTAPD_CONF = "/etc/hostapd/hostapd.conf";
const DNSMASQ_CONF = "/etc/dnsmasq.d/touchscreen.conf";

export function createWifiManager({ deviceCode }) {
  let apMode = false;
  let currentSSID = null;

  // Check if we should start in AP mode
  if (!existsSync(SETUP_FLAG)) {
    apMode = true;
    console.log("[wifi] No WiFi configured — starting in AP mode");
  } else {
    apMode = false;
    // Try to read current SSID
    try {
      currentSSID = execSync("iwgetid -r 2>/dev/null", { encoding: "utf-8" }).trim();
    } catch {
      currentSSID = null;
    }
  }

  function getAPSSID() {
    return `TouchScreen-${deviceCode}`;
  }

  function isAPMode() {
    return apMode;
  }

  function getCurrentSSID() {
    if (apMode) return null;
    try {
      return execSync("iwgetid -r 2>/dev/null", { encoding: "utf-8" }).trim() || null;
    } catch {
      return currentSSID;
    }
  }

  function getCurrentIP() {
    if (apMode) return "192.168.4.1";
    try {
      const result = execSync(
        "hostname -I 2>/dev/null | awk '{print $1}'",
        { encoding: "utf-8" }
      ).trim();
      return result || null;
    } catch {
      return null;
    }
  }

  /**
   * Scan for available WiFi networks.
   * Works in both AP and client mode.
   */
  async function scan() {
    try {
      // Use iw or iwlist to scan
      const raw = execSync(
        "sudo iwlist wlan0 scan 2>/dev/null | grep -E 'ESSID|Signal level'",
        { encoding: "utf-8", timeout: 15000 }
      );

      const lines = raw.split("\n").filter((l) => l.trim());
      const networks = [];
      let current = {};

      for (const line of lines) {
        if (line.includes("Signal level")) {
          const match = line.match(/Signal level[=:](-?\d+)/);
          if (match) current.signal = parseInt(match[1]);
        }
        if (line.includes("ESSID")) {
          const match = line.match(/ESSID:"(.+?)"/);
          if (match && match[1]) {
            current.ssid = match[1];
            if (current.ssid && current.ssid !== getAPSSID()) {
              networks.push({ ...current });
            }
            current = {};
          }
        }
      }

      // Deduplicate by SSID, keep strongest signal
      const seen = new Map();
      for (const n of networks) {
        if (!seen.has(n.ssid) || (n.signal && n.signal > seen.get(n.ssid).signal)) {
          seen.set(n.ssid, n);
        }
      }

      return Array.from(seen.values()).sort(
        (a, b) => (b.signal || -100) - (a.signal || -100)
      );
    } catch (err) {
      console.error("[wifi] Scan failed:", err.message);
      return [];
    }
  }

  /**
   * Connect to a WiFi network.
   * Saves credentials, stops AP mode, starts client mode.
   */
  async function connect(ssid, password) {
    console.log(`[wifi] Connecting to ${ssid}...`);

    // Generate wpa_supplicant config
    const wpaConfig = `ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
country=GB

network={
  ssid="${ssid}"
  psk="${password}"
  key_mgmt=${password ? "WPA-PSK" : "NONE"}
}
`;

    try {
      // Write wpa_supplicant config
      writeFileSync(WPA_CONF, wpaConfig, "utf-8");
      console.log("[wifi] WPA config written");

      // Stop AP mode services
      try {
        execSync("sudo systemctl stop hostapd 2>/dev/null || true");
        execSync("sudo systemctl stop dnsmasq 2>/dev/null || true");
      } catch {}

      // Reconfigure the interface
      try {
        execSync("sudo ip addr flush dev wlan0 2>/dev/null || true");
        execSync("sudo dhclient -r wlan0 2>/dev/null || true");
      } catch {}

      // Start wpa_supplicant and DHCP
      execSync("sudo wpa_cli -i wlan0 reconfigure 2>/dev/null || true");
      execSync("sudo dhclient wlan0 2>/dev/null || true");

      // Wait for connection (up to 15 seconds)
      let connected = false;
      for (let i = 0; i < 15; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        try {
          const result = execSync("iwgetid -r 2>/dev/null", {
            encoding: "utf-8",
          }).trim();
          if (result === ssid) {
            connected = true;
            break;
          }
        } catch {}
      }

      if (!connected) {
        throw new Error(`Failed to connect to ${ssid} within 15 seconds`);
      }

      // Mark as configured
      writeFileSync(SETUP_FLAG, new Date().toISOString(), "utf-8");

      apMode = false;
      currentSSID = ssid;
      console.log(`[wifi] Connected to ${ssid}`);

      return true;
    } catch (err) {
      console.error("[wifi] Connect failed:", err.message);
      throw err;
    }
  }

  /**
   * Start AP mode (for factory reset or first boot).
   */
  function startAPMode() {
    const ssid = getAPSSID();
    console.log(`[wifi] Starting AP mode with SSID: ${ssid}`);

    // Write hostapd config
    const hostapdConfig = `interface=wlan0
driver=nl80211
ssid=${ssid}
hw_mode=g
channel=7
wmm_enabled=0
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0
wpa=0
`;

    // Write dnsmasq config
    const dnsmasqConfig = `interface=wlan0
dhcp-range=192.168.4.2,192.168.4.20,255.255.255.0,24h
address=/#/192.168.4.1
`;

    try {
      writeFileSync(HOSTAPD_CONF, hostapdConfig, "utf-8");
      writeFileSync(DNSMASQ_CONF, dnsmasqConfig, "utf-8");

      // Configure static IP
      execSync("sudo ip addr flush dev wlan0 2>/dev/null || true");
      execSync(
        "sudo ip addr add 192.168.4.1/24 dev wlan0 2>/dev/null || true"
      );
      execSync("sudo ip link set wlan0 up 2>/dev/null || true");

      // Stop wpa_supplicant
      execSync("sudo systemctl stop wpa_supplicant 2>/dev/null || true");

      // Start AP services
      execSync("sudo systemctl start dnsmasq 2>/dev/null || true");
      execSync("sudo systemctl start hostapd 2>/dev/null || true");

      apMode = true;
      console.log(`[wifi] AP mode started: ${ssid}`);
    } catch (err) {
      console.error("[wifi] Failed to start AP mode:", err.message);
    }
  }

  // Auto-start AP mode if not configured
  if (apMode) {
    // Defer to avoid blocking constructor
    setTimeout(() => startAPMode(), 1000);
  }

  return {
    isAPMode,
    getAPSSID,
    getCurrentSSID,
    getCurrentIP,
    scan,
    connect,
    startAPMode,
  };
}
