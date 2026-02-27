/**
 * Better Auth wrapper for React Native.
 * 
 * This file provides a simplified API on top of Better Auth's client
 * for use throughout the app.
 */

import { authClient } from "./auth-client";

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
}

export interface Session {
  user: User;
  token: string;
}

/**
 * Get the current session.
 */
export async function getSession(): Promise<Session | null> {
  const session = await authClient.getSession();
  if (!session) return null;

  // Get the session cookie/token for API requests
  const cookies = authClient.getCookie();
  const token = cookies?.split("better-auth.session_token=")[1]?.split(";")[0] || session.session.id;

  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image || undefined,
    },
    token,
  };
}

/**
 * Sign in with magic link (email).
 */
export async function signInWithEmail(email: string): Promise<void> {
  const { error } = await authClient.signIn.magicLink({
    email,
    callbackURL: "/", // Better Auth Expo plugin converts this to deep link automatically
  });

  if (error) {
    throw new Error(error.message || "Failed to send magic link");
  }
}

/**
 * Handle the magic link callback (deep link with token).
 * Better Auth handles this automatically via the expoClient plugin.
 */
export async function handleAuthCallback(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new Error("Invalid session after callback");
  return session;
}

/**
 * Sign out.
 */
export async function signOut(): Promise<void> {
  await authClient.signOut();
}

/**
 * Get auth headers for cloud API requests.
 * Better Auth's expoClient handles cookies automatically.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const cookies = authClient.getCookie();
  if (!cookies) return {};
  return { Cookie: cookies };
}
