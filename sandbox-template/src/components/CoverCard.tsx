import { ChevronUp, ChevronDown, Blinds } from "lucide-react";
import { useEntity } from "../lib/ha-provider";
import type { CoverAttributes } from "../lib/ha-types";

interface CoverCardProps {
  entityId: string;
}

export default function CoverCard({ entityId }: CoverCardProps) {
  const { entity, callService } = useEntity(entityId);
  if (!entity) return null;

  const attr = entity.attributes as CoverAttributes;
  const position = attr.current_position ?? 0;
  const isOpen = entity.state === "open" || entity.state === "opening";

  const handleOpen = () => {
    callService("cover", "open_cover", { entity_id: entityId });
  };

  const handleClose = () => {
    callService("cover", "close_cover", { entity_id: entityId });
  };

  const handlePosition = (value: number) => {
    callService("cover", "set_cover_position", {
      entity_id: entityId,
      position: value,
    });
  };

  return (
    <div className="bg-surface rounded-card p-card-px flex flex-col gap-3 shadow-lg shadow-black/20 h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-1 min-h-0">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`p-3 rounded-btn transition-colors duration-300 shrink-0 ${
              isOpen ? "bg-accent/20" : "bg-white/5"
            }`}
          >
            <Blinds
              className={`w-8 h-8 transition-colors duration-300 ${
                isOpen ? "text-accent" : "text-white/30"
              }`}
            />
          </div>
          <div className="min-w-0">
            <p className="text-device-sm font-medium leading-tight truncate">
              {attr.friendly_name}
            </p>
            <p className="text-device-xs text-white/40 mt-0.5">
              {position}% open
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleOpen}
            className="w-[48px] h-[48px] rounded-btn bg-white/5 active:bg-white/15 transition-colors text-white/50 active:text-white flex items-center justify-center"
            aria-label="Open cover"
          >
            <ChevronUp className="w-7 h-7" />
          </button>
          <button
            onClick={handleClose}
            className="w-[48px] h-[48px] rounded-btn bg-white/5 active:bg-white/15 transition-colors text-white/50 active:text-white flex items-center justify-center"
            aria-label="Close cover"
          >
            <ChevronDown className="w-7 h-7" />
          </button>
        </div>
      </div>

      {/* Position slider */}
      <input
        type="range"
        min={0}
        max={100}
        value={position}
        onChange={(e) => handlePosition(Number(e.target.value))}
        className="w-full h-slider-track rounded-full appearance-none bg-white/10 accent-accent cursor-pointer shrink-0
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-[48px]
          [&::-webkit-slider-thumb]:h-[48px]
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-accent
          [&::-webkit-slider-thumb]:shadow-md
          [&::-webkit-slider-thumb]:cursor-pointer"
      />
    </div>
  );
}
