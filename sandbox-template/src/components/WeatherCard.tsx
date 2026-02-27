import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudSun,
  CloudLightning,
  Droplets,
} from "lucide-react";
import { useEntity } from "../lib/ha-provider";
import type { WeatherAttributes, WeatherForecast } from "../lib/ha-types";

const conditionIcon: Record<string, React.ReactNode> = {
  sunny: <Sun className="w-14 h-14 text-amber-400" />,
  "clear-night": <Sun className="w-14 h-14 text-amber-200" />,
  cloudy: <Cloud className="w-14 h-14 text-slate-400" />,
  rainy: <CloudRain className="w-14 h-14 text-blue-400" />,
  snowy: <CloudSnow className="w-14 h-14 text-blue-200" />,
  "partly-cloudy": <CloudSun className="w-14 h-14 text-amber-300" />,
  "partlycloudy": <CloudSun className="w-14 h-14 text-amber-300" />,
  lightning: <CloudLightning className="w-14 h-14 text-violet-400" />,
};

const smallIcon: Record<string, React.ReactNode> = {
  sunny: <Sun className="w-6 h-6 text-amber-400" />,
  "clear-night": <Sun className="w-6 h-6 text-amber-200" />,
  cloudy: <Cloud className="w-6 h-6 text-slate-400" />,
  rainy: <CloudRain className="w-6 h-6 text-blue-400" />,
  snowy: <CloudSnow className="w-6 h-6 text-blue-200" />,
  "partly-cloudy": <CloudSun className="w-6 h-6 text-amber-300" />,
  "partlycloudy": <CloudSun className="w-6 h-6 text-amber-300" />,
  lightning: <CloudLightning className="w-6 h-6 text-violet-400" />,
};

function dayLabel(datetime: string): string {
  const d = new Date(datetime);
  return d.toLocaleDateString("en", { weekday: "short" });
}

interface WeatherCardProps {
  entityId: string;
}

export default function WeatherCard({ entityId }: WeatherCardProps) {
  const { entity } = useEntity(entityId);
  if (!entity) return null;

  const attr = entity.attributes as WeatherAttributes;
  const condition = entity.state;
  const forecast = (attr.forecast ?? []).slice(0, 4) as WeatherForecast[];

  return (
    <div className="bg-surface rounded-card p-card-px flex flex-col gap-3 shadow-lg shadow-black/20">
      {/* Current conditions */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-device-xs text-white/50 uppercase tracking-wide">
            {attr.friendly_name}
          </p>
          <p className="text-device-hero font-light mt-1">
            {attr.temperature !== undefined ? `${Math.round(attr.temperature)}°` : "--"}
          </p>
          <p className="text-device-xs text-white/60 capitalize mt-1">
            {condition.replace(/-/g, " ")}
          </p>
        </div>
        <div className="flex flex-col items-center gap-2">
          {conditionIcon[condition] ?? conditionIcon.sunny}
          {attr.humidity !== undefined && (
            <div className="flex items-center gap-1 text-device-xs text-white/40">
              <Droplets className="w-5 h-5" />
              {attr.humidity}%
            </div>
          )}
        </div>
      </div>

      {/* Forecast */}
      {forecast.length > 0 && (
        <div className="border-t border-white/10 pt-3 grid grid-cols-4 gap-2">
          {forecast.map((day) => (
            <div
              key={day.datetime}
              className="flex flex-col items-center gap-1"
            >
              <span className="text-device-xs text-white/40">
                {dayLabel(day.datetime)}
              </span>
              {smallIcon[day.condition] ?? smallIcon.sunny}
              <span className="text-device-xs">
                {Math.round(day.temperature)}°{" "}
                {day.templow !== undefined && (
                  <span className="text-white/30">
                    {Math.round(day.templow)}°
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
