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
    <div className="bg-surface rounded-card p-card-px flex flex-col gap-3 shadow-lg shadow-black/20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`p-3 rounded-btn transition-colors duration-300 ${
              isOpen ? "bg-accent/20" : "bg-white/5"
            }`}
          >
            <Blinds
              className={`w-8 h-8 transition-colors duration-300 ${
                isOpen ? "text-accent" : "text-white/30"
              }`}
            />
          </div>
          <div>
            <p className="text-device-sm font-medium leading-tight">
              {attr.friendly_name}
            </p>
            <p className="text-device-xs text-white/40 mt-0.5">
              {position}% open
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleOpen}
            className="w-[56px] h-[56px] rounded-btn bg-white/5 active:bg-white/15 transition-colors text-white/50 active:text-white flex items-center justify-center"
            aria-label="Open cover"
          >
            <ChevronUp className="w-7 h-7" />
          </button>
          <button
            onClick={handleClose}
            className="w-[56px] h-[56px] rounded-btn bg-white/5 active:bg-white/15 transition-colors text-white/50 active:text-white flex items-center justify-center"
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
  );
}
