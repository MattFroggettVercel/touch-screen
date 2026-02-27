/**
 * App constants
 */

// Temporary auth bypass for testing (set to false for production)
export const AUTH_BYPASS = true;

// API URL — local dev server for testing, Vercel deployment for production
export const CLOUD_API_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.126:3000";

// Pi local server port
export const PI_SERVER_PORT = 3001;

// Pi dev server port (Vite)
export const PI_DEV_PORT = 5173;

// mDNS service type
export const MDNS_SERVICE_TYPE = "touchscreen";
export const MDNS_SERVICE_PROTOCOL = "tcp";

// Common hostnames to try when mDNS isn't available
export const COMMON_DEVICE_HOSTNAMES = [
  "touchscreen.mynet",
  "touchscreen.local",
  "touchscreen",
];

// Colors (matching the web app theme)
export const COLORS = {
  background: "#0d0d1a",
  surface: "#1a1a2e",
  accent: "#c9a962",
  text: "#ffffff",
  textMuted: "rgba(255, 255, 255, 0.5)",
  textDim: "rgba(255, 255, 255, 0.2)",
  border: "rgba(255, 255, 255, 0.1)",
  success: "#4ade80",
  error: "#f87171",
  warning: "#fbbf24",
};
