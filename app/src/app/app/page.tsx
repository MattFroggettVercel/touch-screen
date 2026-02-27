"use client";

import { useEffect, useState } from "react";

type Device = {
  code: string;
  name: string | null;
  registeredAt: string | null;
};

export default function AppHome() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/devices").then((res) => res.json()),
      fetch("/api/credits").then((res) => res.json()).catch(() => ({ balance: 0 })),
    ])
      .then(([devData, credData]) => {
        setDevices(devData.devices || []);
        setCredits(credData.balance ?? 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-8">
      <div className="max-w-2xl mx-auto w-full space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-light tracking-tight">Your account</h1>
          <p className="mt-1 text-muted text-sm">
            Manage your devices and credits.
          </p>
        </div>

        {/* Credits */}
        <div className="p-5 bg-surface border border-white/5 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wide">
                AI Credits
              </p>
              <p className="text-3xl font-light mt-1">
                {credits ?? 0}
                <span className="text-sm text-white/40 ml-2">remaining</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/checkout?type=credits"
                className="text-xs px-4 py-2 bg-accent/10 border border-accent/30 text-accent rounded-xl hover:bg-accent/20 transition-colors"
              >
                Buy more credits
              </a>
            </div>
          </div>
          <p className="text-xs text-white/30 mt-2">
            Each prompt uses 1 credit. Credits never expire.
          </p>
        </div>

        {/* Devices */}
        <div>
          <h2 className="text-xl font-light tracking-tight mb-4">
            Your devices
          </h2>
          <p className="text-sm text-muted mb-4">
            {devices.length === 0
              ? "No devices registered yet. Use the companion app to set up your TouchScreen."
              : `${devices.length} device${devices.length !== 1 ? "s" : ""} registered`}
          </p>

          {devices.length > 0 && (
            <div className="space-y-3">
              {devices.map((device) => (
                <div
                  key={device.code}
                  className="flex items-center justify-between p-5 bg-surface border border-white/5 rounded-2xl"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-accent"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 002.25-2.25v-15a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v15a2.25 2.25 0 002.25 2.25z"
                        />
                      </svg>
                    </div>

                    <div>
                      <p className="font-medium text-sm">
                        {device.name || "Unnamed device"}
                      </p>
                      <p className="text-xs text-muted font-mono mt-0.5">
                        {device.code}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-white/30">
                    Edit via companion app
                  </p>
                </div>
              ))}
            </div>
          )}

          {devices.length === 0 && (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-surface border border-white/5 flex items-center justify-center mx-auto">
                <svg
                  className="w-8 h-8 text-white/20"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 002.25-2.25v-15a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v15a2.25 2.25 0 002.25 2.25z"
                  />
                </svg>
              </div>
              <p className="text-sm text-muted max-w-xs mx-auto leading-relaxed">
                Download the TouchScreen companion app to set up and customise your devices.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
