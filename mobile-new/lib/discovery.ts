/**
 * mDNS device discovery using react-native-zeroconf.
 *
 * Scans the local network for TouchScreen devices advertising
 * the _touchscreen._tcp mDNS service.
 *
 * NOTE: react-native-zeroconf requires native code and won't work in Expo Go.
 * Use a development build for full mDNS discovery, or rely on known devices
 * from local storage.
 */

import { Platform } from "react-native";
import { createTimeoutSignal } from "./fetch-timeout";

export interface DiscoveredDevice {
  code: string;
  name: string;
  host: string;
  port: number;
}

// Lazy load Zeroconf to handle cases where it's not available (Expo Go, web, etc.)
let Zeroconf: any = null;
let zeroconf: any = null;
let zeroconfAvailable = false;

try {
  if (Platform.OS !== "web") {
    // Check if we're in Expo Go (which doesn't support custom native modules)
    const isExpoGo = 
      typeof navigator !== "undefined" && 
      (navigator as any).product === "ReactNative" &&
      !(global as any).__DEV__?.isCustomDevClient;
    
    if (!isExpoGo) {
      Zeroconf = require("react-native-zeroconf").default;
      zeroconf = new Zeroconf();
      zeroconfAvailable = true;
    } else {
      console.warn("Zeroconf not available in Expo Go - use a development build for mDNS discovery");
    }
  }
} catch (error) {
  console.warn("Zeroconf not available:", error);
  zeroconfAvailable = false;
}

let scanning = false;
const listeners = new Set<(devices: DiscoveredDevice[]) => void>();
const discoveredDevices = new Map<string, DiscoveredDevice>();

if (zeroconf) {
  zeroconf.on("resolved", (service: any) => {
    const code = service.txt?.code;
    if (!code) return;

    const device: DiscoveredDevice = {
      code,
      name: service.name || `TouchScreen-${code}`,
      host: service.host || service.addresses?.[0],
      port: service.port || 3001,
    };

    discoveredDevices.set(code, device);
    notifyListeners();
  });

  zeroconf.on("removed", (service: any) => {
    const code = service.txt?.code;
    if (code) {
      discoveredDevices.delete(code);
      notifyListeners();
    }
  });
}

function notifyListeners() {
  const devices = Array.from(discoveredDevices.values());
  for (const fn of listeners) {
    try {
      fn(devices);
    } catch {}
  }
}

/**
 * Start scanning for TouchScreen devices on the local network.
 * 
 * In Expo Go, this will silently fail and rely on known devices
 * from local storage instead.
 */
export function startDiscovery(): void {
  if (scanning) return;
  if (!zeroconfAvailable || !zeroconf) {
    // In Expo Go or when Zeroconf isn't available, discovery is disabled
    // The app will rely on known devices from local storage
    console.warn("mDNS discovery not available - using known devices from storage");
    scanning = false;
    return;
  }
  scanning = true;
  discoveredDevices.clear();
  try {
    zeroconf.scan("touchscreen", "tcp", "local.");
  } catch (error) {
    console.error("Failed to start discovery:", error);
    scanning = false;
  }
}

/**
 * Stop scanning.
 */
export function stopDiscovery(): void {
  if (!scanning) return;
  if (!zeroconf) return;
  scanning = false;
  try {
    zeroconf.stop();
  } catch (error) {
    console.error("Failed to stop discovery:", error);
  }
}

/**
 * Subscribe to discovered device updates.
 */
export function onDevicesDiscovered(
  fn: (devices: DiscoveredDevice[]) => void
): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Get currently discovered devices.
 */
export function getDiscoveredDevices(): DiscoveredDevice[] {
  return Array.from(discoveredDevices.values());
}

/**
 * Find a specific device by code.
 */
export function findDevice(code: string): DiscoveredDevice | undefined {
  return discoveredDevices.get(code);
}

/**
 * Try to resolve a device by hostname (fallback when mDNS isn't available).
 * Returns a DiscoveredDevice if the hostname resolves and the device responds.
 */
export async function resolveDeviceByHostname(
  hostname: string,
  port: number = 3001
): Promise<DiscoveredDevice | null> {
  try {
    // Try to fetch device status to verify it's reachable
    const res = await fetch(`http://${hostname}:${port}/api/status`, {
      signal: createTimeoutSignal(2000),
    });
    
    if (!res.ok) return null;
    
    const data = await res.json();
    if (!data.deviceCode) return null;
    
    return {
      code: data.deviceCode,
      name: `TouchScreen-${data.deviceCode}`,
      host: hostname,
      port,
    };
  } catch {
    return null;
  }
}
