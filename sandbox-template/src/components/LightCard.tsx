import { Lightbulb } from "lucide-react";
import { useEntity } from "../lib/ha-provider";
import type { LightAttributes } from "../lib/ha-types";

interface LightCardProps {
  entityId: string;
}

export default function LightCard({ entityId }: LightCardProps) {
  const { entity, callService } = useEntity(entityId);
  if (!entity) return null;

  const attr = entity.attributes as LightAttributes;
  const isOn = entity.state === "on";
  const brightnessPercent = isOn
    ? Math.round(((attr.brightness ?? 0) / 255) * 100)
    : 0;

  const handleToggle = () => {
    callService("light", "toggle", { entity_id: entityId });
  };

  const handleBrightness = (value: number) => {
    const brightness = Math.round((value / 100) * 255);
    callService("light", "turn_on", { entity_id: entityId, brightness });
  };

  return (
    <div
      className={`bg-surface rounded-card p-card-px flex flex-col gap-3 shadow-lg shadow-black/20 transition-all duration-300 ${
        isOn ? "ring-1 ring-accent/30" : ""
      }`}
    >
      {/* Icon + Toggle row */}
      <div className="flex items-center justify-between">
        <div
          className={`p-3 rounded-btn transition-colors duration-300 ${
            isOn ? "bg-accent/20" : "bg-white/5"
          }`}
        >
          <Lightbulb
            className={`w-8 h-8 transition-colors duration-300 ${
              isOn ? "text-accent" : "text-white/30"
            }`}
          />
        </div>
        {/* Toggle — 72×40px to fit in card, whole card is also tappable */}
        <button
          onClick={handleToggle}
          className={`w-[72px] h-[40px] rounded-full transition-all duration-300 relative shrink-0 ${
            isOn ? "bg-accent" : "bg-white/10"
          }`}
          aria-label={`Toggle ${attr.friendly_name}`}
        >
          <span
            className={`absolute top-[4px] w-[32px] h-[32px] rounded-full bg-white shadow transition-all duration-300 ${
              isOn ? "left-[36px]" : "left-[4px]"
            }`}
          />
        </button>
      </div>

      {/* Name + Status */}
      <div>
        <p className="text-device-sm font-medium leading-tight">
          {attr.friendly_name}
        </p>
        <p className="text-device-xs text-white/40 mt-0.5">
          {isOn ? `${brightnessPercent}%` : "Off"}
        </p>
      </div>

      {/* Brightness slider */}
      <div
        className={`transition-opacity duration-300 ${
          isOn ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <input
          type="range"
          min={1}
          max={100}
          value={brightnessPercent || 1}
          onChange={(e) => handleBrightness(Number(e.target.value))}
          className="w-full h-slider-track rounded-full appearance-none bg-white/10 accent-accent cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-[48px]
            [&::-webkit-slider-thumb]:h-[48px]
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-accent
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:cursor-pointer"
        />
      </div>
    </div>
  );
}
