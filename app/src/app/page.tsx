"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";

type Variant = "freestanding" | "plaster_in";

const COLOURS = [
  { id: "charcoal", label: "Charcoal", hex: "#2a2a2a" },
  { id: "arctic", label: "Arctic White", hex: "#e8e8e8" },
  { id: "slate", label: "Slate", hex: "#5a5a6a" },
];

const PRICING: Record<Variant, { price: number; label: string }> = {
  freestanding: { price: 99, label: "Freestanding" },
  plaster_in: { price: 89, label: "Plaster-in" },
};

export default function ProductPage() {
  const router = useRouter();
  const [variant, setVariant] = useState<Variant>("freestanding");
  const [colour, setColour] = useState("charcoal");
  const [user, setUser] = useState<boolean | null>(null);

  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      setUser(!!data?.session);
    });
  }, []);

  const selected = PRICING[variant];

  function handleBuy() {
    const params = new URLSearchParams({ variant, colour });
    if (user) {
      router.push(`/checkout?${params}`);
    } else {
      router.push(`/auth?redirect=${encodeURIComponent(`/checkout?${params}`)}`);
    }
  }

  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <Link href="/" className="text-lg font-light tracking-tight">
            Touch<span className="text-accent">Screen</span>
          </Link>
          {user === false && (
            <Link
              href="/auth"
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              Log in
            </Link>
          )}
          {user === true && (
            <Link
              href="/app"
              className="text-sm text-accent hover:text-accent/80 transition-colors"
            >
              Dashboard
            </Link>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-40 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-5xl sm:text-7xl font-extralight tracking-tight leading-[1.1]">
            Your smart home,
            <br />
            <span className="text-accent">your interface.</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted max-w-2xl mx-auto leading-relaxed font-light">
            A premium touch panel for Home Assistant. Describe the dashboard you want.
            AI builds it. No code, no YAML, no compromise.
          </p>
          <div className="pt-4 flex items-center justify-center gap-4 flex-wrap">
            <a
              href="#buy"
              className="inline-block px-8 py-4 bg-accent text-black rounded-full text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              Buy TouchScreen
            </a>
            <Link
              href="/demo"
              className="inline-block px-8 py-4 bg-white/5 border border-white/10 text-white/80 rounded-full text-sm font-medium hover:bg-white/10 hover:border-white/20 transition-colors"
            >
              Try the demo
            </Link>
          </div>
        </div>
      </section>

      {/* Product hero image placeholder */}
      <section className="px-6 pb-32">
        <div className="max-w-5xl mx-auto">
          <div className="aspect-[16/9] rounded-3xl bg-surface border border-white/5 flex items-center justify-center">
            <span className="text-muted text-sm">Product image</span>
          </div>
        </div>
      </section>

      {/* Showcase */}
      <section className="px-6 pb-32">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="aspect-square rounded-3xl bg-surface border border-white/5 flex items-center justify-center">
              <div className="text-center space-y-2">
                <span className="text-muted text-sm">Freestanding</span>
                <p className="text-xs text-white/30 max-w-[200px]">On your desk, kitchen counter, bedside table</p>
              </div>
            </div>
            <div className="aspect-square rounded-3xl bg-surface border border-white/5 flex items-center justify-center">
              <div className="text-center space-y-2">
                <span className="text-muted text-sm">Plaster-in</span>
                <p className="text-xs text-white/30 max-w-[200px]">Flush mounted into the wall, completely seamless</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 pb-32">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extralight tracking-tight text-center mb-16">
            Three steps. That&apos;s it.
          </h2>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                step: "01",
                title: "Describe it",
                description:
                  "Tell the AI what you want your dashboard to look like. Rooms, controls, style. Plain English.",
              },
              {
                step: "02",
                title: "AI builds it",
                description:
                  "Your interface is generated in real time. Watch it come together. Tweak it with follow-up prompts.",
              },
              {
                step: "03",
                title: "Deploy to device",
                description:
                  "Push the finished dashboard to your TouchScreen over WiFi. It runs locally, no cloud required.",
              },
            ].map((item) => (
              <div key={item.step} className="space-y-4">
                <span className="text-accent text-sm font-mono">{item.step}</span>
                <h3 className="text-xl font-light">{item.title}</h3>
                <p className="text-sm text-muted leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-32">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extralight tracking-tight text-center mb-16">
            Built for people who care
            <br />
            about their home.
          </h2>
          <div className="grid sm:grid-cols-2 gap-8">
            {[
              {
                title: "Works with Home Assistant",
                description:
                  "Native integration with the world's most powerful home automation platform. Controls your lights, climate, media, locks, and everything else.",
              },
              {
                title: "Runs locally",
                description:
                  "Your dashboard lives on the device. It talks directly to your Home Assistant instance over WiFi. No internet dependency, no cloud latency, no privacy concerns.",
              },
              {
                title: "AI-generated interface",
                description:
                  "Describe the dashboard you want in plain language. The AI generates a fully custom React interface tailored to your home and your taste.",
              },
              {
                title: "Premium hardware",
                description:
                  "4-inch IPS capacitive touchscreen. Raspberry Pi Compute Module. Available freestanding or flush-mounted into your wall.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-2xl bg-surface border border-white/5 space-y-3"
              >
                <h3 className="text-base font-medium">{feature.title}</h3>
                <p className="text-sm text-muted leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy / Trust */}
      <section className="px-6 pb-32">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-3xl bg-surface border border-white/5 p-8 sm:p-12 space-y-6">
            <h2 className="text-2xl sm:text-3xl font-extralight tracking-tight">
              Your data stays <span className="text-accent">yours</span>.
            </h2>
            <div className="grid sm:grid-cols-2 gap-6 text-sm text-muted leading-relaxed">
              <div className="space-y-3">
                <h3 className="text-foreground font-medium text-base">During editing</h3>
                <p>
                  When you design your dashboard, your Home Assistant device list
                  is shared with the AI so it can suggest the right components.
                  This data is sent from your phone to the AI and is{" "}
                  <strong className="text-foreground">never stored</strong> —
                  it exists only for the duration of your editing session.
                </p>
              </div>
              <div className="space-y-3">
                <h3 className="text-foreground font-medium text-base">After publishing</h3>
                <p>
                  Your finished dashboard runs entirely on the device. It talks
                  directly to Home Assistant over your local network. No cloud
                  relay, no external servers, no tracking. Your home stays
                  private.
                </p>
              </div>
            </div>
            <p className="text-xs text-white/30 pt-2">
              We never store your Home Assistant URL, tokens, entity data, or device
              information in our cloud. The only data we hold is your account email
              and credit balance.
            </p>
          </div>
        </div>
      </section>

      {/* Buy section */}
      <section id="buy" className="px-6 pb-32 scroll-mt-24">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extralight tracking-tight text-center mb-12">
            Choose yours.
          </h2>

          <div className="space-y-8">
            {/* Variant selector */}
            <div className="space-y-3">
              <label className="block text-sm text-muted">Model</label>
              <div className="grid grid-cols-2 gap-3">
                {(Object.entries(PRICING) as [Variant, typeof PRICING.freestanding][]).map(
                  ([key, val]) => (
                    <button
                      key={key}
                      onClick={() => setVariant(key)}
                      className={`py-4 px-5 rounded-2xl text-left transition-all cursor-pointer ${
                        variant === key
                          ? "bg-accent/10 border-accent/40 border"
                          : "bg-surface border border-white/10 hover:border-white/20"
                      }`}
                    >
                      <span
                        className={`block text-sm font-medium ${
                          variant === key ? "text-accent" : "text-foreground"
                        }`}
                      >
                        {val.label}
                      </span>
                      <span className="block text-sm text-muted mt-1">
                        &pound;{val.price}
                      </span>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Colour selector (freestanding only) */}
            {variant === "freestanding" && (
              <div className="space-y-3">
                <label className="block text-sm text-muted">Colour</label>
                <div className="flex gap-3">
                  {COLOURS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setColour(c.id)}
                      className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all cursor-pointer ${
                        colour === c.id
                          ? "bg-accent/10 border-accent/40 border"
                          : "bg-surface border border-white/10 hover:border-white/20"
                      }`}
                    >
                      <span
                        className="w-5 h-5 rounded-full border border-white/20 flex-shrink-0"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span
                        className={`text-sm ${
                          colour === c.id ? "text-accent" : "text-muted"
                        }`}
                      >
                        {c.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Price + CTA */}
            <div className="pt-4 space-y-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-light">&pound;{selected.price}</span>
                  <span className="text-sm text-muted ml-2">incl. 10 AI credits</span>
                </div>
              </div>
              <button
                onClick={handleBuy}
                className="w-full py-4 bg-accent text-black rounded-2xl font-medium text-sm hover:bg-accent/90 transition-colors cursor-pointer"
              >
                Buy now
              </button>
              <p className="text-xs text-muted text-center">
                Free shipping to the UK. Credits never expire.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-sm text-muted font-light">
            Touch<span className="text-accent">Screen</span>
          </span>
          <span className="text-xs text-white/30">
            &copy; {new Date().getFullYear()}
          </span>
        </div>
      </footer>
    </main>
  );
}
