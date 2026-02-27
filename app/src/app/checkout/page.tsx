"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const VARIANT_INFO: Record<string, { label: string; price: number }> = {
  freestanding: { label: "TouchScreen Freestanding", price: 99 },
  plaster_in: { label: "TouchScreen Plaster-in", price: 89 },
};

const COLOUR_LABELS: Record<string, string> = {
  charcoal: "Charcoal",
  arctic: "Arctic White",
  slate: "Slate",
};

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const variant = searchParams.get("variant") || "freestanding";
  const colour = searchParams.get("colour") || "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const info = VARIANT_INFO[variant] || VARIANT_INFO.freestanding;
  const colourLabel = COLOUR_LABELS[colour] || colour;

  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
  }, []);

  async function handleCheckout() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variant, colour }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start checkout");
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md w-full space-y-8">
        {/* Back link */}
        <Link
          href="/#buy"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back
        </Link>

        <div className="space-y-2">
          <h1 className="text-2xl font-light tracking-tight">Order summary</h1>
          <p className="text-sm text-muted">Review your order before checkout.</p>
        </div>

        {/* Order details */}
        <div className="bg-surface border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="font-medium text-sm">{info.label}</p>
              {variant === "freestanding" && colourLabel && (
                <p className="text-sm text-muted">{colourLabel}</p>
              )}
            </div>
            <span className="text-lg font-light">&pound;{info.price}</span>
          </div>

          <div className="h-px bg-white/10" />

          <div className="flex justify-between items-center text-sm text-muted">
            <span>Included AI credits</span>
            <span>10 credits</span>
          </div>

          <div className="flex justify-between items-center text-sm text-muted">
            <span>Shipping</span>
            <span>Free</span>
          </div>

          <div className="h-px bg-white/10" />

          <div className="flex justify-between items-center">
            <span className="font-medium">Total</span>
            <span className="text-xl font-light">&pound;{info.price}</span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-400 bg-red-400/10 px-4 py-2.5 rounded-xl text-center">
            {error}
          </p>
        )}

        {/* Checkout button */}
        <button
          onClick={handleCheckout}
          disabled={loading}
          className={`w-full py-4 rounded-2xl font-medium text-sm transition-all ${
            loading
              ? "bg-white/5 text-white/20 cursor-not-allowed"
              : "bg-accent text-black hover:bg-accent/90 cursor-pointer"
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              Redirecting to payment...
            </span>
          ) : (
            "Proceed to payment"
          )}
        </button>

        <p className="text-xs text-white/30 text-center">
          Secure payment processed by Stripe. You&apos;ll be redirected to complete your purchase.
        </p>
      </div>
    </main>
  );
}
