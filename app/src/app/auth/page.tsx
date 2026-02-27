"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type AuthMode = "register" | "login";

export default function AuthPage() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/app";
  const [mode, setMode] = useState<AuthMode>("register");
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleOAuth(provider: "apple" | "google") {
    setError("");
    await authClient.signIn.social({
      provider,
      callbackURL: redirect,
    });
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError("");

    const { error: magicLinkError } = await authClient.signIn.magicLink({
      email,
      callbackURL: redirect,
    });

    if (magicLinkError) {
      setError(magicLinkError.message || "Failed to send sign-in link");
    } else {
      setEmailSent(true);
    }
    setLoading(false);
  }

  if (emailSent) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-light tracking-tight">Check your email</h1>
            <p className="mt-3 text-sm text-muted leading-relaxed">
              We sent a sign-in link to <span className="text-foreground">{email}</span>.
              Click the link in your inbox to continue.
            </p>
          </div>
          <button
            onClick={() => { setEmailSent(false); setEmail(""); }}
            className="text-sm text-accent hover:text-accent/80 transition-colors cursor-pointer"
          >
            Use a different email
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-sm w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-light tracking-tight">
            {mode === "register" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-sm text-muted">
            {mode === "register"
              ? "Sign up to get started with TouchScreen."
              : "Log in to manage your devices."}
          </p>
        </div>

        {/* OAuth buttons */}
        <div className="space-y-3">
          <button
            onClick={() => handleOAuth("apple")}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white text-black rounded-xl font-medium text-sm hover:bg-white/90 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Continue with Apple
          </button>

          <button
            onClick={() => handleOAuth("google")}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-surface border border-white/10 rounded-xl font-medium text-sm hover:border-white/20 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-muted">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmail} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full px-4 py-3.5 bg-surface border border-white/10 rounded-xl text-sm text-foreground placeholder:text-white/30 focus:outline-none focus:border-accent/50 transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !email}
            className={`w-full py-3.5 rounded-xl text-sm font-medium transition-all ${
              loading || !email
                ? "bg-white/5 text-white/20 cursor-not-allowed"
                : "bg-accent text-black hover:bg-accent/90 cursor-pointer"
            }`}
          >
            {loading ? "Sending link..." : "Continue with Email"}
          </button>
        </form>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-400 bg-red-400/10 px-4 py-2.5 rounded-xl text-center">
            {error}
          </p>
        )}

        {/* Mode toggle */}
        <div className="text-center pt-2">
          {mode === "register" ? (
            <button
              onClick={() => setMode("login")}
              className="text-sm text-muted hover:text-foreground transition-colors cursor-pointer"
            >
              Already have a device? <span className="text-accent">Log in</span>
            </button>
          ) : (
            <button
              onClick={() => setMode("register")}
              className="text-sm text-muted hover:text-foreground transition-colors cursor-pointer"
            >
              New here? <span className="text-accent">Create an account</span>
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
