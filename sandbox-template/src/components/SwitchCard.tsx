import { Power } from "lucide-react";
import { useEntity } from "../lib/ha-provider";
import type { SwitchAttributes } from "../lib/ha-types";

interface SwitchCardProps {
  entityId: string;
}

export default function SwitchCard({ entityId }: SwitchCardProps) {
  const { entity, callService } = useEntity(entityId);
  if (!entity) return null;

  const attr = entity.attributes as SwitchAttributes;
  const isOn = entity.state === "on";

  const handleToggle = () => {
    callService("switch", "toggle", { entity_id: entityId });
  };

  return (
    <button
      onClick={handleToggle}
      className={`bg-surface rounded-card p-card-px flex items-center gap-4 shadow-lg shadow-black/20 transition-all duration-300 text-left w-full min-h-touch-min ${
        isOn ? "ring-1 ring-accent/30" : ""
      }`}
      aria-label={`Toggle ${attr.friendly_name}`}
    >
      <div
        className={`p-3 rounded-btn transition-colors duration-300 shrink-0 ${
          isOn ? "bg-accent/20" : "bg-white/5"
        }`}
      >
        <Power
          className={`w-8 h-8 transition-colors duration-300 ${
            isOn ? "text-accent" : "text-white/30"
          }`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-device-sm font-medium leading-tight truncate">
          {attr.friendly_name}
        </p>
        <p className="text-device-xs text-white/40 mt-0.5">
          {isOn ? "On" : "Off"}
        </p>
      </div>
      {/* Visual toggle indicator */}
      <div
        className={`w-[72px] h-[40px] rounded-full transition-all duration-300 relative shrink-0 ${
          isOn ? "bg-accent" : "bg-white/10"
        }`}
      >
        <span
          className={`absolute top-[4px] w-[32px] h-[32px] rounded-full bg-white shadow transition-all duration-300 ${
            isOn ? "left-[36px]" : "left-[4px]"
          }`}
        />
      </div>
    </button>
  );
}
