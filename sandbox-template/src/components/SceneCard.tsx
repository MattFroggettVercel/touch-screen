import { Sparkles } from "lucide-react";
import { useEntity } from "../lib/ha-provider";
import { useState } from "react";
import type { SceneAttributes } from "../lib/ha-types";

interface SceneCardProps {
  entityId: string;
}

export default function SceneCard({ entityId }: SceneCardProps) {
  const { entity, callService } = useEntity(entityId);
  const [activated, setActivated] = useState(false);

  if (!entity) return null;

  const attr = entity.attributes as SceneAttributes;

  const handleActivate = () => {
    callService("scene", "turn_on", { entity_id: entityId });
    setActivated(true);
    setTimeout(() => setActivated(false), 1200);
  };

  return (
    <button
      onClick={handleActivate}
      className={`bg-surface rounded-card p-card-px flex items-center gap-4 shadow-lg shadow-black/20 transition-all duration-300 text-left w-full min-h-touch-min ${
        activated ? "ring-1 ring-accent/40 bg-accent/10" : "active:bg-surface-light"
      }`}
    >
      <div
        className={`p-3 rounded-btn transition-colors duration-300 shrink-0 ${
          activated ? "bg-accent/20" : "bg-white/5"
        }`}
      >
        <Sparkles
          className={`w-8 h-8 transition-colors duration-300 ${
            activated ? "text-accent" : "text-white/40"
          }`}
        />
      </div>
      <div>
        <p className="text-device-sm font-medium">{attr.friendly_name}</p>
        <p className="text-device-xs text-white/40">
          {activated ? "Activated" : "Tap to activate"}
        </p>
      </div>
    </button>
  );
}
