/**
 * Secure storage for auth tokens and device connection info.
 */

import * as SecureStore from "expo-secure-store";

const AUTH_TOKEN_KEY = "auth_session_token";
const DEVICES_KEY = "known_devices";

// ---- Auth Token ----

export async function getAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

export async function setAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

export async function clearAuthToken(): Promise<void> {
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
}

// ---- Known Devices ----

export interface KnownDevice {
  code: string;
  name: string;
  localIP?: string;
  localPort?: number;
  lastSeen?: string;
}

export async function getKnownDevices(): Promise<KnownDevice[]> {
  const raw = await SecureStore.getItemAsync(DEVICES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveKnownDevice(device: KnownDevice): Promise<void> {
  const devices = await getKnownDevices();
  const idx = devices.findIndex((d) => d.code === device.code);
  if (idx !== -1) {
    devices[idx] = { ...devices[idx], ...device };
  } else {
    devices.push(device);
  }
  await SecureStore.setItemAsync(DEVICES_KEY, JSON.stringify(devices));
}

export async function removeKnownDevice(code: string): Promise<void> {
  const devices = await getKnownDevices();
  const filtered = devices.filter((d) => d.code !== code);
  await SecureStore.setItemAsync(DEVICES_KEY, JSON.stringify(filtered));
}
