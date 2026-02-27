/**
 * Cloud API client.
 *
 * Handles authenticated requests to the Vercel-hosted Next.js API
 * for device registration, credit management, etc.
 */

import { CLOUD_API_URL, AUTH_BYPASS } from "./constants";
import { authClient } from "./auth-client";

export interface CloudDevice {
  code: string;
  name: string | null;
  registeredAt: string | null;
  sandboxUrl: string | null;
}

/**
 * Get auth headers with cookies for API requests.
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  // Return empty headers if auth bypass is enabled
  if (AUTH_BYPASS) {
    return {
      "Content-Type": "application/json",
    };
  }

  const cookies = authClient.getCookie();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (cookies) {
    headers.Cookie = cookies;
  }
  return headers;
}

/**
 * List all devices registered to the current user.
 */
export async function listDevices(): Promise<CloudDevice[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${CLOUD_API_URL}/api/devices`, {
    headers,
    credentials: "omit", // Better Auth handles cookies manually
  });

  if (!res.ok) {
    // If auth bypass is enabled, return empty array instead of throwing
    if (AUTH_BYPASS && res.status === 401) {
      return [];
    }
    throw new Error("Failed to fetch devices");
  }
  const data = await res.json();
  return data.devices || [];
}

/**
 * Provision (register) a device to the current user's account.
 */
export async function provisionDevice(
  code: string,
  name: string
): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${CLOUD_API_URL}/api/devices/register`, {
    method: "POST",
    headers,
    body: JSON.stringify({ code, name }),
    credentials: "omit",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to provision device");
  }
}

/**
 * Get user's credit balance.
 */
export async function getCreditBalance(): Promise<number> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${CLOUD_API_URL}/api/credits`, {
    headers,
    credentials: "omit",
  });

  if (!res.ok) {
    // If auth bypass is enabled, return 0 for credit balance
    if (AUTH_BYPASS) {
      return 0;
    }
    return 0;
  }
  const data = await res.json();
  return data.balance || 0;
}
