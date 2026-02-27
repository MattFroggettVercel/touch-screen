import {
  Thermometer,
  Droplets,
  Zap,
  Activity,
  Gauge,
} from "lucide-react";
import { useEntity } from "../lib/ha-provider";
import type { SensorAttributes } from "../lib/ha-types";

interface SensorCardProps {
  entityId: string;
}

const classIcon: Record<string, React.ReactNode> = {
  temperature: <Thermometer className="w-8 h-8 text-orange-400" />,
  humidity: <Droplets className="w-8 h-8 text-blue-400" />,
  power: <Zap className="w-8 h-8 text-yellow-400" />,
  energy: <Zap className="w-8 h-8 text-green-400" />,
  pressure: <Gauge className="w-8 h-8 text-violet-400" />,
};

export default function SensorCard({ entityId }: SensorCardProps) {
  const { entity } = useEntity(entityId);
  if (!entity) return null;

  const attr = entity.attributes as SensorAttributes;
  const icon =
    classIcon[attr.device_class ?? ""] ?? (
      <Activity className="w-8 h-8 text-accent" />
    );

  return (
    <div className="bg-surface rounded-card p-card-px flex flex-col gap-2 shadow-lg shadow-black/20">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-btn bg-white/5">{icon}</div>
      </div>
      <div className="flex items-baseline gap-1">
        <p className="text-device-lg font-light">{entity.state}</p>
        {attr.unit_of_measurement && (
          <span className="text-device-xs text-white/40">
            {attr.unit_of_measurement}
          </span>
        )}
      </div>
      <p className="text-device-xs text-white/40 truncate">{attr.friendly_name}</p>
    </div>
  );
}
