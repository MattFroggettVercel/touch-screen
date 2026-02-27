"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const LOCATIONS = ["Kitchen", "Living Room", "Bedroom", "Hallway"] as const;

type DeviceStatus =
  | { state: "loading" }
  | { state: "available" }
  | { state: "owned"; name: string }
  | { state: "error"; message: string };

export default function RegisterDevicePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();
  const [status, setStatus] = useState<DeviceStatus>({ state: "loading" });
  const [location, setLocation] = useState("");
  const [customLocation, setCustomLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const selectedLocation = location === "Other" ? customLocation : location;
  const canSubmit = selectedLocation.length > 0 && !isSubmitting;

  useEffect(() => {
    fetch(`/api/devices/${code}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 409) {
            setStatus({ state: "error", message: "This device is already registered to another account." });
          } else if (res.status === 404) {
            setStatus({ state: "error", message: "Device not recognised. Check the QR code and try again." });
          } else {
            setStatus({ state: "error", message: data.error || "Something went wrong." });
          }
          return;
        }
        if (data.ownedByMe) {
          setStatus({ state: "owned", name: data.name });
        } else {
          setStatus({ state: "available" });
        }
      })
      .catch(() => {
        setStatus({ state: "error", message: "Failed to check device. Please try again." });
      });
  }, [code]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch("/api/devices/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name: selectedLocation }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to register device");
      }

      router.push(`/app/device/${code}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong");
      setIsSubmitting(false);
    }
  }

  // Loading
  if (status.state === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted">Checking device...</p>
        </div>
      </main>
    );
  }

  // Error (invalid code or claimed by someone else)
  if (status.state === "error") {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="w-12 h-12 rounded-full bg-red-400/10 border border-red-400/20 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-light tracking-tight">Can&apos;t register device</h1>
            <p className="mt-3 text-sm text-muted leading-relaxed">{status.message}</p>
          </div>
          <Link
            href="/"
            className="inline-block text-sm text-accent hover:text-accent/80 transition-colors"
          >
            Go to homepage
          </Link>
        </div>
      </main>
    );
  }

  // Already owned by this user
  if (status.state === "owned") {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-light tracking-tight">Device already registered</h1>
            <p className="mt-3 text-sm text-muted leading-relaxed">
              This device is registered as <span className="text-foreground">{status.name}</span>.
            </p>
          </div>
          <Link
            href={`/app/device/${code}`}
            className="inline-block w-full py-4 bg-accent text-black rounded-2xl font-medium text-sm hover:bg-accent/90 transition-colors text-center"
          >
            Open dashboard editor
          </Link>
        </div>
      </main>
    );
  }

  // Available to register
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-sm w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-light tracking-tight">Register your device</h1>
          <p className="text-sm text-muted">
            Give your TouchScreen a name so you know where it lives.
          </p>
        </div>

        {/* Device code display */}
        <div className="space-y-2">
          <label className="block text-sm text-muted">Device code</label>
          <div className="w-full px-4 py-3 bg-surface border border-white/10 rounded-xl font-mono tracking-wider text-accent/80 text-center">
            {code}
          </div>
        </div>

        {/* Location picker */}
        <form onSubmit={handleRegister} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm text-muted">Location</label>
            <div className="grid grid-cols-2 gap-2">
              {LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocation(loc)}
                  className={`py-2.5 px-4 rounded-xl text-sm transition-all duration-200 cursor-pointer ${
                    location === loc
                      ? "bg-accent/20 border-accent/50 text-accent border"
                      : "bg-surface border border-white/10 text-white/60 hover:border-white/20"
                  }`}
                >
                  {loc}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setLocation("Other")}
                className={`py-2.5 px-4 rounded-xl text-sm transition-all duration-200 col-span-2 cursor-pointer ${
                  location === "Other"
                    ? "bg-accent/20 border-accent/50 text-accent border"
                    : "bg-surface border border-white/10 text-white/60 hover:border-white/20"
                }`}
              >
                Other
              </button>
            </div>

            {location === "Other" && (
              <input
                type="text"
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                placeholder="e.g. Garage, Office"
                className="w-full px-4 py-3 bg-surface border border-white/10 rounded-xl text-foreground placeholder:text-white/20 focus:outline-none focus:border-accent/50 transition-colors mt-2"
              />
            )}
          </div>

          {/* Error */}
          {submitError && (
            <p className="text-sm text-red-400 bg-red-400/10 px-4 py-2 rounded-xl">
              {submitError}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full py-4 rounded-xl font-medium text-sm transition-all duration-300 ${
              canSubmit
                ? "bg-accent text-black hover:bg-accent/90 cursor-pointer"
                : "bg-white/5 text-white/20 cursor-not-allowed"
            }`}
          >
            {isSubmitting ? "Registering..." : "Register device"}
          </button>
        </form>
      </div>
    </main>
  );
}
