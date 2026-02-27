import WeatherCard from "./components/WeatherCard";
import MediaCard from "./components/MediaCard";
import LightCard from "./components/LightCard";
import ClimateCard from "./components/ClimateCard";
import SensorCard from "./components/SensorCard";
import SwitchCard from "./components/SwitchCard";
import CoverCard from "./components/CoverCard";
import SceneCard from "./components/SceneCard";

export default function Dashboard() {
  return (
    <div className="w-screen-device h-screen-device bg-[#0d0d1a] p-[20px] overflow-hidden flex flex-col gap-card-gap">
      {/* Row 1 — Weather summary (compact) + Climate */}
      <div className="grid grid-cols-2 gap-card-gap min-h-0">
        <WeatherCard entityId="weather.home" />
        <ClimateCard entityId="climate.hallway" />
      </div>

      {/* Row 2 — Lights + Switch / Cover */}
      <div className="grid grid-cols-2 gap-card-gap min-h-0">
        <LightCard entityId="light.living_room" />
        <LightCard entityId="light.kitchen" />
      </div>

      {/* Row 3 — Sensors (3-col) */}
      <div className="grid grid-cols-3 gap-card-gap min-h-0">
        <SensorCard entityId="sensor.outdoor_temp" />
        <SensorCard entityId="sensor.indoor_humidity" />
        <SensorCard entityId="sensor.power_usage" />
      </div>

      {/* Row 4 — Scenes / quick actions */}
      <div className="grid grid-cols-2 gap-card-gap min-h-0">
        <SceneCard entityId="scene.movie_night" />
        <SceneCard entityId="scene.good_morning" />
      </div>
    </div>
  );
}
