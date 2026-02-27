/**
 * Better Auth client for Expo.
 * Uses the official @better-auth/expo integration.
 */

import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { CLOUD_API_URL } from "./constants";

export const authClient = createAuthClient({
  baseURL: CLOUD_API_URL,
  plugins: [
    expoClient({
      storage: SecureStore,
      scheme: "touchscreen", // From app.json
    }),
  ],
});

// Re-export types for convenience
export type Session = typeof authClient.$Infer.Session;
export type User = typeof authClient.$Infer.User;
