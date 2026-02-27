import {
  Activity,
  User,
  Car,
  Dog,
  DoorOpen,
  DoorClosed,
  Eye,
  Flame,
  Droplets,
  Volume2,
  Vibrate,
  ShieldAlert,
} from "lucide-react";
import { useEntity } from "../lib/ha-provider";
import type { BinarySensorAttributes } from "../lib/ha-types";

interface BinarySensorCardProps {
  entityId: string;
}

const deviceClassConfig: Record<
  string,
  {
    iconOn: React.ReactNode;
    iconOff: React.ReactNode;
    labelOn: string;
    labelOff: string;
    colorOn: string;
  }
> = {
  motion: {
    iconOn: <Activity className="w-8 h-8" />,
    iconOff: <Activity className="w-8 h-8" />,
    labelOn: "Motion detected",
    labelOff: "Clear",
    colorOn: "text-amber-400",
  },
  person: {
    iconOn: <User className="w-8 h-8" />,
    iconOff: <User className="w-8 h-8" />,
    labelOn: "Person detected",
    labelOff: "Clear",
    colorOn: "text-blue-400",
  },
  vehicle: {
    iconOn: <Car className="w-8 h-8" />,
    iconOff: <Car className="w-8 h-8" />,
    labelOn: "Vehicle detected",
    labelOff: "Clear",
    colorOn: "text-purple-400",
  },
  pet: {
    iconOn: <Dog className="w-8 h-8" />,
    iconOff: <Dog className="w-8 h-8" />,
    labelOn: "Pet detected",
    labelOff: "Clear",
    colorOn: "text-green-400",
  },
  door: {
    iconOn: <DoorOpen className="w-8 h-8" />,
    iconOff: <DoorClosed className="w-8 h-8" />,
    labelOn: "Open",
    labelOff: "Closed",
    colorOn: "text-orange-400",
  },
  window: {
    iconOn: <DoorOpen className="w-8 h-8" />,
    iconOff: <DoorClosed className="w-8 h-8" />,
    labelOn: "Open",
    labelOff: "Closed",
    colorOn: "text-orange-400",
  },
  occupancy: {
    iconOn: <Eye className="w-8 h-8" />,
    iconOff: <Eye className="w-8 h-8" />,
    labelOn: "Occupied",
    labelOff: "Clear",
    colorOn: "text-cyan-400",
  },
  presence: {
    iconOn: <User className="w-8 h-8" />,
    iconOff: <User className="w-8 h-8" />,
    labelOn: "Home",
    labelOff: "Away",
    colorOn: "text-green-400",
  },
  smoke: {
    iconOn: <ShieldAlert className="w-8 h-8" />,
    iconOff: <ShieldAlert className="w-8 h-8" />,
    labelOn: "Smoke detected!",
    labelOff: "Clear",
    colorOn: "text-red-500",
  },
  moisture: {
    iconOn: <Droplets className="w-8 h-8" />,
    iconOff: <Droplets className="w-8 h-8" />,
    labelOn: "Wet",
    labelOff: "Dry",
    colorOn: "text-blue-400",
  },
  sound: {
    iconOn: <Volume2 className="w-8 h-8" />,
    iconOff: <Volume2 className="w-8 h-8" />,
    labelOn: "Sound detected",
    labelOff: "Clear",
    colorOn: "text-violet-400",
  },
  vibration: {
    iconOn: <Vibrate className="w-8 h-8" />,
    iconOff: <Vibrate className="w-8 h-8" />,
    labelOn: "Vibration detected",
    labelOff: "Clear",
    colorOn: "text-amber-400",
  },
};

const defaultConfig = {
  iconOn: <Activity className="w-8 h-8" />,
  iconOff: <Activity className="w-8 h-8" />,
  labelOn: "On",
  labelOff: "Off",
  colorOn: "text-accent",
};

export default function BinarySensorCard({ entityId }: BinarySensorCardProps) {
  const { entity } = useEntity(entityId);
  if (!entity) return null;

  const attr = entity.attributes as BinarySensorAttributes;
  const isOn = entity.state === "on";
  const config = deviceClassConfig[attr.device_class ?? ""] ?? defaultConfig;

  return (
    <div
      className={`bg-surface rounded-card p-card-px flex items-center gap-4 shadow-lg shadow-black/20 transition-all duration-300 min-h-touch-min ${
        isOn ? "ring-1 ring-white/10" : ""
      }`}
    >
      <div
        className={`p-3 rounded-btn transition-colors duration-300 shrink-0 ${
          isOn ? "bg-white/10" : "bg-white/5"
        }`}
      >
        <span
          className={`transition-colors duration-300 ${
            isOn ? config.colorOn : "text-white/30"
          }`}
        >
          {isOn ? config.iconOn : config.iconOff}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-device-sm font-medium leading-tight truncate">
          {attr.friendly_name}
        </p>
        <p
          className={`text-device-xs mt-0.5 transition-colors duration-300 ${
            isOn ? config.colorOn : "text-white/40"
          }`}
        >
          {isOn ? config.labelOn : config.labelOff}
        </p>
      </div>
      {/* Indicator dot */}
      <div
        className={`w-4 h-4 rounded-full shrink-0 transition-all duration-300 ${
          isOn ? `${config.colorOn} bg-current animate-pulse` : "bg-white/10"
        }`}
      />
    </div>
  );
}
