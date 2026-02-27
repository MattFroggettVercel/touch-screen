"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

const PROGRESS_MESSAGES = [
  "Understanding your request…",
  "Reading the dashboard…",
  "Planning changes…",
  "Writing components…",
  "Applying updates…",
  "Almost there…",
];

const PROGRESS_INTERVAL_MS = 2800;

export default function DemoPage() {
  const [sandboxUrl, setSandboxUrl] = useState<string | null>(null);
  const [sandboxId, setSandboxId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [input, setInput] = useState("");
  const [progressIdx, setProgressIdx] = useState(0);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- Spin up ephemeral sandbox on mount ----
  useEffect(() => {
    document.body.style.overflow = "hidden";

    fetch("/api/demo/sandbox")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to start demo");
        return res.json();
      })
      .then((data) => {
        setSandboxUrl(data.url);
        setSandboxId(data.sandboxId);
        setLoading(false);
      })
      .catch((err) => {
        setLoadError(err.message);
        setLoading(false);
      });

    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // ---- Chat transport ----
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/demo/chat",
        body: { sandboxId },
      }),
    [sandboxId]
  );

  const { sendMessage, status, error } = useChat({ transport });

  const isGenerating = status === "submitted" || status === "streaming";

  // ---- Progress messages ----
  useEffect(() => {
    if (isGenerating) {
      setProgressIdx(0);
      progressTimer.current = setInterval(() => {
        setProgressIdx((i) =>
          i < PROGRESS_MESSAGES.length - 1 ? i + 1 : i
        );
      }, PROGRESS_INTERVAL_MS);
    } else {
      if (progressTimer.current) {
        clearInterval(progressTimer.current);
        progressTimer.current = null;
      }
    }
    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, [isGenerating]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isGenerating) return;
      sendMessage({ text: input });
      setInput("");
    },
    [input, isGenerating, sendMessage]
  );

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted">Starting demo environment...</p>
          <p className="text-xs text-white/30">
            This may take a moment on first load
          </p>
        </div>
      </div>
    );
  }

  // ---- Error state ----
  if (loadError) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="text-center space-y-4 max-w-sm px-6">
          <p className="text-red-400 text-sm">{loadError}</p>
          <Link
            href="/"
            className="inline-block text-sm text-accent hover:text-accent/80 transition-colors"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <Link href="/" className="text-lg font-light tracking-tight">
            Touch<span className="text-accent">Screen</span>
            <span className="text-xs text-white/30 ml-2 font-normal">
              Demo
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-xs text-white/40">
              Try it free — no device required
            </span>
            <Link
              href="/#buy"
              className="text-xs px-4 py-2 bg-accent text-black rounded-full font-medium hover:bg-accent/90 transition-colors"
            >
              Buy TouchScreen
            </Link>
          </div>
        </div>
      </div>

      {/* Sandbox preview iframe */}
      {sandboxUrl && (
        <iframe
          src={sandboxUrl}
          title="Dashboard demo preview"
          sandbox="allow-scripts allow-same-origin"
          style={{
            position: "fixed",
            top: 56,
            left: 0,
            width: "100vw",
            height: "calc(100vh - 56px)",
            border: "none",
            zIndex: 0,
          }}
        />
      )}

      {/* Chat bar at bottom */}
      <div className="fixed left-0 right-0 bottom-0 z-50">
        <div className="h-8 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

        <div className="bg-black/70 backdrop-blur-2xl backdrop-saturate-150 px-4 pt-3 pb-4">
          <div className="max-w-2xl mx-auto">
            {/* Error */}
            {error && (
              <div className="mb-2">
                <p className="text-xs text-red-400/90 bg-red-500/10 border border-red-500/20 backdrop-blur-xl px-3 py-1.5 rounded-xl">
                  {error.message}
                </p>
              </div>
            )}

            {isGenerating ? (
              <div className="bg-white/[0.06] border border-white/[0.08] rounded-2xl px-5 py-3.5 flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-white/10 border-t-white/60 rounded-full animate-spin shrink-0" />
                <p className="text-sm text-white/50">
                  {PROGRESS_MESSAGES[progressIdx]}
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-white/[0.06] border border-white/[0.08] rounded-2xl flex items-center gap-2 pl-4 pr-2 transition-colors duration-200 focus-within:border-white/[0.15] focus-within:bg-white/[0.08]"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Try: Show me a dashboard with lights and weather..."
                  className="flex-1 py-3 bg-transparent text-white/90 placeholder:text-white/25 focus:outline-none text-base"
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/90 text-black transition-all duration-200 hover:bg-white disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer shrink-0"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M8 12V4M8 4L4 8M8 4L12 8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
