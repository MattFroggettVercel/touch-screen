import { Thermometer, Flame, Snowflake, Power } from "lucide-react";
import { useEntity } from "../lib/ha-provider";
import type { ClimateAttributes } from "../lib/ha-types";

interface ClimateCardProps {
  entityId: string;
}

const modeIcon: Record<string, React.ReactNode> = {
  heat: <Flame className="w-7 h-7 text-orange-400" />,
  cool: <Snowflake className="w-7 h-7 text-blue-400" />,
  auto: <Thermometer className="w-7 h-7 text-accent" />,
  off: <Power className="w-7 h-7 text-white/30" />,
};

export default function ClimateCard({ entityId }: ClimateCardProps) {
  const { entity, callService } = useEntity(entityId);
  if (!entity) return null;

  const attr = entity.attributes as ClimateAttributes;
  const hvacMode = entity.state;
  const currentTemp = attr.current_temperature;
  const targetTemp = attr.temperature;
  const step = attr.target_temp_step ?? 0.5;
  const minTemp = attr.min_temp ?? 7;
  const maxTemp = attr.max_temp ?? 35;
  const modes = attr.hvac_modes ?? ["off", "heat", "cool", "auto"];

  const handleTempChange = (delta: number) => {
    if (targetTemp === undefined) return;
    const newTemp = Math.min(maxTemp, Math.max(minTemp, targetTemp + delta));
    callService("climate", "set_temperature", {
      entity_id: entityId,
      temperature: newTemp,
    });
  };

  const handleModeChange = (mode: string) => {
    callService("climate", "set_hvac_mode", {
      entity_id: entityId,
      hvac_mode: mode,
    });
  };

  const actionLabel =
    attr.hvac_action === "heating"
      ? "Heating"
      : attr.hvac_action === "cooling"
      ? "Cooling"
      : attr.hvac_action === "idle"
      ? "Idle"
      : hvacMode === "off"
      ? "Off"
      : "";

  return (
    <div className="bg-surface rounded-card p-card-px flex flex-col gap-3 shadow-lg shadow-black/20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Thermometer className="w-8 h-8 text-accent" />
          <p className="text-device-sm font-medium">{attr.friendly_name}</p>
        </div>
        {actionLabel && (
          <span className="text-device-xs text-white/40 capitalize">
            {actionLabel}
          </span>
        )}
      </div>

      {/* Temperature display */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-device-xs text-white/40">Current</p>
          <p className="text-device-xl font-light">
            {currentTemp !== undefined ? `${currentTemp}°` : "--"}
          </p>
        </div>
        {targetTemp !== undefined && hvacMode !== "off" && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleTempChange(-step)}
              className="w-[56px] h-[56px] rounded-full bg-white/5 active:bg-white/15 flex items-center justify-center text-white/60 active:text-white transition-colors text-device-lg"
              aria-label="Decrease temperature"
            >
              −
            </button>
            <div className="text-center">
              <p className="text-device-xs text-white/40">Target</p>
              <p className="text-device-lg font-light">{targetTemp}°</p>
            </div>
            <button
              onClick={() => handleTempChange(step)}
              className="w-[56px] h-[56px] rounded-full bg-white/5 active:bg-white/15 flex items-center justify-center text-white/60 active:text-white transition-colors text-device-lg"
              aria-label="Increase temperature"
            >
              +
            </button>
          </div>
        )}
      </div>

      {/* Mode selector */}
      <div className="flex gap-2">
        {modes.map((mode) => (
          <button
            key={mode}
            onClick={() => handleModeChange(mode)}
            className={`flex-1 py-2 rounded-btn flex items-center justify-center gap-1.5 text-device-xs capitalize transition-all duration-200 min-h-[48px] ${
              hvacMode === mode
                ? "bg-accent/20 text-accent ring-1 ring-accent/30"
                : "bg-white/5 text-white/40 active:bg-white/10 active:text-white/60"
            }`}
          >
            {modeIcon[mode] ?? null}
            {mode}
          </button>
        ))}
      </div>
    </div>
  );
}
