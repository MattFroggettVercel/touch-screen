import { Camera, Video, VideoOff } from "lucide-react";
import { useEntity, useHA } from "../lib/ha-provider";
import { useState, useEffect, useRef } from "react";
import type { CameraAttributes } from "../lib/ha-types";

interface CameraCardProps {
  entityId: string;
  /** Refresh interval in ms for live mode snapshot (default 2000) */
  refreshInterval?: number;
}

export default function CameraCard({
  entityId,
  refreshInterval = 2000,
}: CameraCardProps) {
  const { entity, callService } = useEntity(entityId);
  const { mode } = useHA();
  const [imgError, setImgError] = useState(false);
  const [tick, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // In live mode, refresh the camera snapshot periodically
  useEffect(() => {
    if (mode !== "live") return;

    intervalRef.current = setInterval(() => {
      setTick((t) => t + 1);
    }, refreshInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [mode, refreshInterval]);

  if (!entity) return null;

  const attr = entity.attributes as CameraAttributes;
  const isOff = entity.state === "off";

  // In live mode, construct the camera proxy URL with a cache-busting param
  const haUrl = import.meta.env.VITE_HA_URL || "";
  const haToken = import.meta.env.VITE_HA_TOKEN || "";
  const liveImgUrl =
    mode === "live" && attr.entity_picture
      ? `${haUrl}${attr.entity_picture}&_t=${tick}`
      : null;

  return (
    <div className="bg-surface rounded-card overflow-hidden shadow-lg shadow-black/20">
      {/* Camera feed / placeholder */}
      <div className="relative aspect-square bg-black/40 flex items-center justify-center">
        {isOff ? (
          <div className="flex flex-col items-center gap-2 text-white/30">
            <VideoOff className="w-14 h-14" />
            <span className="text-device-xs">Camera off</span>
          </div>
        ) : mode === "live" && liveImgUrl && !imgError ? (
          <img
            src={liveImgUrl}
            alt={attr.friendly_name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          /* Mock mode placeholder */
          <div className="flex flex-col items-center gap-2 text-white/20">
            <Camera className="w-16 h-16" />
            <span className="text-device-xs uppercase tracking-wider">Live Feed</span>
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
          <div
            className={`w-3 h-3 rounded-full ${
              isOff
                ? "bg-white/30"
                : entity.state === "recording"
                ? "bg-red-500 animate-pulse"
                : "bg-green-500"
            }`}
          />
          <span className="text-device-xs text-white/70 uppercase">
            {entity.state}
          </span>
        </div>
      </div>

      {/* Info bar */}
      <div className="px-card-px py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Video className="w-7 h-7 text-accent" />
          <p className="text-device-sm font-medium">{attr.friendly_name}</p>
        </div>
      </div>
    </div>
  );
}
