// All template files for the sandbox React dashboard.
// These are written to the sandbox filesystem when a new device is created.

export const templateFiles: { path: string; content: string }[] = [
  {
    path: "package.json",
    content: JSON.stringify(
      {
        name: "dashboard-template",
        private: true,
        version: "0.1.0",
        type: "module",
        scripts: {
          dev: "vite --host 0.0.0.0",
          build: "tsc -b && vite build",
        },
        dependencies: {
          react: "^19.0.0",
          "react-dom": "^19.0.0",
          "lucide-react": "^0.469.0",
          "home-assistant-js-websocket": "^9.4.0",
        },
        devDependencies: {
          "@types/react": "^19.0.0",
          "@types/react-dom": "^19.0.0",
          "@vitejs/plugin-react": "^4.3.0",
          autoprefixer: "^10.4.20",
          postcss: "^8.4.49",
          tailwindcss: "^3.4.17",
          typescript: "~5.7.0",
          vite: "^6.0.0",
        },
      },
      null,
      2
    ),
  },
  {
    path: "vite.config.ts",
    content: `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
`,
  },
  {
    path: "tsconfig.json",
    content: JSON.stringify(
      {
        compilerOptions: {
          target: "ES2020",
          useDefineForClassFields: true,
          lib: ["ES2020", "DOM", "DOM.Iterable"],
          module: "ESNext",
          skipLibCheck: true,
          moduleResolution: "bundler",
          allowImportingTsExtensions: true,
          isolatedModules: true,
          moduleDetection: "force",
          noEmit: true,
          jsx: "react-jsx",
          strict: true,
          noUnusedLocals: false,
          noUnusedParameters: false,
        },
        include: ["src"],
      },
      null,
      2
    ),
  },
  {
    path: "tailwind.config.ts",
    content: `import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#1a1a2e",
          light: "#222240",
          lighter: "#2a2a4a",
        },
        accent: {
          DEFAULT: "#c9a962",
          dim: "#a08840",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
`,
  },
  {
    path: "postcss.config.js",
    content: `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`,
  },
  {
    path: "index.html",
    content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Dashboard</title>
  </head>
  <body class="bg-[#0d0d1a] text-white antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
  },
  {
    path: "src/index.css",
    content: `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  background: #0d0d1a;
  color: #f5f5f0;
  font-family: system-ui, -apple-system, sans-serif;
}
`,
  },
  {
    path: "src/main.tsx",
    content: `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
  },
  {
    path: "src/App.tsx",
    content: `import { HAProvider } from "./lib/ha-provider";
import Dashboard from "./Dashboard";

export default function App() {
  return (
    <HAProvider>
      <Dashboard />
    </HAProvider>
  );
}
`,
  },

  {
    path: "src/vite-env.d.ts",
    content: `/// <reference types="vite/client" />
`,
  },

  // ---------------------------------------------------------------------------
  // lib/ — HA types, mock data, connection, provider
  // ---------------------------------------------------------------------------

  {
    path: "src/lib/ha-types.ts",
    content: `// Unified entity type mirroring Home Assistant's HassEntity shape.
// Used by both mock mode (sandbox) and live mode (Pi + WebSocket).

export interface HAEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
}

/** All entities keyed by entity_id */
export type HAEntities = Record<string, HAEntity>;

/** Extract the domain from an entity_id, e.g. "light" from "light.living_room" */
export function getDomain(entityId: string): string {
  return entityId.split(".")[0];
}

// ---------------------------------------------------------------------------
// Domain-specific attribute helpers (typed access into attributes)
// ---------------------------------------------------------------------------

export interface LightAttributes {
  friendly_name: string;
  brightness?: number; // 0-255
  color_temp?: number; // mireds
  rgb_color?: [number, number, number];
  min_mireds?: number;
  max_mireds?: number;
  supported_features?: number;
}

export interface SwitchAttributes {
  friendly_name: string;
}

export interface ClimateAttributes {
  friendly_name: string;
  temperature?: number; // target temp
  current_temperature?: number;
  hvac_action?: "heating" | "cooling" | "idle" | "off";
  hvac_modes?: string[];
  min_temp?: number;
  max_temp?: number;
  target_temp_step?: number;
}

export interface MediaPlayerAttributes {
  friendly_name: string;
  media_title?: string;
  media_artist?: string;
  media_album_name?: string;
  media_position?: number; // seconds
  media_duration?: number; // seconds
  volume_level?: number; // 0-1
  entity_picture?: string;
  source?: string;
  source_list?: string[];
}

export interface WeatherAttributes {
  friendly_name: string;
  temperature?: number;
  humidity?: number;
  pressure?: number;
  wind_speed?: number;
  forecast?: WeatherForecast[];
}

export interface WeatherForecast {
  datetime: string;
  temperature: number;
  templow?: number;
  condition: string;
}

export interface SensorAttributes {
  friendly_name: string;
  unit_of_measurement?: string;
  device_class?: string;
  state_class?: string;
  icon?: string;
}

export interface CoverAttributes {
  friendly_name: string;
  current_position?: number; // 0-100
  supported_features?: number;
}

export interface SceneAttributes {
  friendly_name: string;
  icon?: string;
}

export interface CameraAttributes {
  friendly_name: string;
  entity_picture?: string;
  supported_features?: number;
  access_token?: string;
}

export interface BinarySensorAttributes {
  friendly_name: string;
  device_class?:
    | "motion"
    | "person"
    | "vehicle"
    | "pet"
    | "door"
    | "window"
    | "occupancy"
    | "presence"
    | "smoke"
    | "moisture"
    | "vibration"
    | "sound"
    | string;
  icon?: string;
}
`,
  },
  {
    path: "src/lib/mock-data.ts",
    content: `import type { HAEntity, HAEntities } from "./ha-types";

const now = new Date().toISOString();

// ---------------------------------------------------------------------------
// Weather
// ---------------------------------------------------------------------------

const weatherHome: HAEntity = {
  entity_id: "weather.home",
  state: "partly-cloudy",
  attributes: {
    friendly_name: "Home",
    temperature: 18,
    humidity: 62,
    pressure: 1013,
    wind_speed: 12,
    forecast: [
      { datetime: "2025-01-28T12:00:00Z", temperature: 19, templow: 12, condition: "sunny" },
      { datetime: "2025-01-29T12:00:00Z", temperature: 17, templow: 11, condition: "cloudy" },
      { datetime: "2025-01-30T12:00:00Z", temperature: 15, templow: 9, condition: "rainy" },
      { datetime: "2025-01-31T12:00:00Z", temperature: 20, templow: 13, condition: "sunny" },
    ],
  },
  last_changed: now,
  last_updated: now,
};

// ---------------------------------------------------------------------------
// Lights
// ---------------------------------------------------------------------------

const lightLivingRoom: HAEntity = {
  entity_id: "light.living_room",
  state: "on",
  attributes: {
    friendly_name: "Living Room",
    brightness: 191,
    color_temp: 350,
    min_mireds: 153,
    max_mireds: 500,
    supported_features: 44,
  },
  last_changed: now,
  last_updated: now,
};

const lightKitchen: HAEntity = {
  entity_id: "light.kitchen",
  state: "off",
  attributes: {
    friendly_name: "Kitchen",
    brightness: 0,
    color_temp: 300,
    min_mireds: 153,
    max_mireds: 500,
    supported_features: 44,
  },
  last_changed: now,
  last_updated: now,
};

const lightBedroom: HAEntity = {
  entity_id: "light.bedroom",
  state: "on",
  attributes: {
    friendly_name: "Bedroom",
    brightness: 64,
    color_temp: 450,
    min_mireds: 153,
    max_mireds: 500,
    supported_features: 44,
  },
  last_changed: now,
  last_updated: now,
};

// ---------------------------------------------------------------------------
// Switches
// ---------------------------------------------------------------------------

const switchPorchLight: HAEntity = {
  entity_id: "switch.porch_light",
  state: "on",
  attributes: { friendly_name: "Porch Light" },
  last_changed: now,
  last_updated: now,
};

const switchGardenPump: HAEntity = {
  entity_id: "switch.garden_pump",
  state: "off",
  attributes: { friendly_name: "Garden Pump" },
  last_changed: now,
  last_updated: now,
};

// ---------------------------------------------------------------------------
// Climate
// ---------------------------------------------------------------------------

const climateHallway: HAEntity = {
  entity_id: "climate.hallway",
  state: "heat",
  attributes: {
    friendly_name: "Hallway Thermostat",
    temperature: 21,
    current_temperature: 19.5,
    hvac_action: "heating",
    hvac_modes: ["off", "heat", "cool", "auto"],
    min_temp: 7,
    max_temp: 35,
    target_temp_step: 0.5,
  },
  last_changed: now,
  last_updated: now,
};

// ---------------------------------------------------------------------------
// Media Player
// ---------------------------------------------------------------------------

const mediaPlayerLivingRoom: HAEntity = {
  entity_id: "media_player.living_room",
  state: "playing",
  attributes: {
    friendly_name: "Living Room Speaker",
    media_title: "Midnight City",
    media_artist: "M83",
    media_album_name: "Hurry Up, We're Dreaming",
    media_position: 96,
    media_duration: 228,
    volume_level: 0.45,
    entity_picture: "",
    source: "Spotify",
    source_list: ["Spotify", "AirPlay", "Line In"],
  },
  last_changed: now,
  last_updated: now,
};

// ---------------------------------------------------------------------------
// Sensors
// ---------------------------------------------------------------------------

const sensorOutdoorTemp: HAEntity = {
  entity_id: "sensor.outdoor_temp",
  state: "14.2",
  attributes: {
    friendly_name: "Outdoor Temperature",
    unit_of_measurement: "\u00B0C",
    device_class: "temperature",
    state_class: "measurement",
  },
  last_changed: now,
  last_updated: now,
};

const sensorIndoorHumidity: HAEntity = {
  entity_id: "sensor.indoor_humidity",
  state: "58",
  attributes: {
    friendly_name: "Indoor Humidity",
    unit_of_measurement: "%",
    device_class: "humidity",
    state_class: "measurement",
  },
  last_changed: now,
  last_updated: now,
};

const sensorPowerUsage: HAEntity = {
  entity_id: "sensor.power_usage",
  state: "342",
  attributes: {
    friendly_name: "Power Usage",
    unit_of_measurement: "W",
    device_class: "power",
    state_class: "measurement",
  },
  last_changed: now,
  last_updated: now,
};

// ---------------------------------------------------------------------------
// Covers
// ---------------------------------------------------------------------------

const coverLivingRoomBlinds: HAEntity = {
  entity_id: "cover.living_room_blinds",
  state: "open",
  attributes: {
    friendly_name: "Living Room Blinds",
    current_position: 75,
    supported_features: 15,
  },
  last_changed: now,
  last_updated: now,
};

// ---------------------------------------------------------------------------
// Scenes
// ---------------------------------------------------------------------------

const sceneMovieNight: HAEntity = {
  entity_id: "scene.movie_night",
  state: "scening",
  attributes: { friendly_name: "Movie Night" },
  last_changed: now,
  last_updated: now,
};

const sceneGoodMorning: HAEntity = {
  entity_id: "scene.good_morning",
  state: "scening",
  attributes: { friendly_name: "Good Morning" },
  last_changed: now,
  last_updated: now,
};

// ---------------------------------------------------------------------------
// Cameras
// ---------------------------------------------------------------------------

const cameraFrontDoor: HAEntity = {
  entity_id: "camera.front_door",
  state: "idle",
  attributes: { friendly_name: "Front Door", entity_picture: "", supported_features: 2 },
  last_changed: now,
  last_updated: now,
};

// ---------------------------------------------------------------------------
// Binary Sensors
// ---------------------------------------------------------------------------

const binaryMotionFrontDoor: HAEntity = {
  entity_id: "binary_sensor.front_door_motion",
  state: "off",
  attributes: { friendly_name: "Front Door Motion", device_class: "motion" },
  last_changed: now,
  last_updated: now,
};

const binaryPersonFrontDoor: HAEntity = {
  entity_id: "binary_sensor.front_door_person",
  state: "off",
  attributes: { friendly_name: "Front Door Person", device_class: "person" },
  last_changed: now,
  last_updated: now,
};

const binaryFrontDoorOpen: HAEntity = {
  entity_id: "binary_sensor.front_door_open",
  state: "off",
  attributes: { friendly_name: "Front Door", device_class: "door" },
  last_changed: now,
  last_updated: now,
};

// ---------------------------------------------------------------------------
// Aggregate
// ---------------------------------------------------------------------------

const allEntities: HAEntity[] = [
  weatherHome,
  lightLivingRoom,
  lightKitchen,
  lightBedroom,
  switchPorchLight,
  switchGardenPump,
  climateHallway,
  mediaPlayerLivingRoom,
  sensorOutdoorTemp,
  sensorIndoorHumidity,
  sensorPowerUsage,
  coverLivingRoomBlinds,
  sceneMovieNight,
  sceneGoodMorning,
  cameraFrontDoor,
  binaryMotionFrontDoor,
  binaryPersonFrontDoor,
  binaryFrontDoorOpen,
];

export const mockEntities: HAEntities = Object.fromEntries(
  allEntities.map((e) => [e.entity_id, e])
);
`,
  },
  {
    path: "src/lib/ha-connection.ts",
    content: `// Real Home Assistant WebSocket connection.
// Only used on the Pi device — never in the sandbox.

import {
  createConnection,
  subscribeEntities,
  callService as haCallService,
  createLongLivedTokenAuth,
  type Connection,
  type HassEntities,
} from "home-assistant-js-websocket";
import type { HAEntity, HAEntities } from "./ha-types";

/** Convert a HassEntities map to our HAEntities shape */
function toHAEntities(hass: HassEntities): HAEntities {
  const out: HAEntities = {};
  for (const [id, entity] of Object.entries(hass)) {
    out[id] = {
      entity_id: entity.entity_id,
      state: entity.state,
      attributes: entity.attributes as Record<string, any>,
      last_changed: entity.last_changed,
      last_updated: entity.last_updated,
    };
  }
  return out;
}

export interface HAConnection {
  connection: Connection;
  subscribe: (callback: (entities: HAEntities) => void) => () => void;
  callService: (
    domain: string,
    service: string,
    data?: Record<string, any>
  ) => Promise<void>;
  close: () => void;
}

/**
 * Create a live connection to Home Assistant.
 * @param url  HA base URL, e.g. "http://homeassistant.local:8123"
 * @param token  Long-lived access token
 */
export async function connectToHA(
  url: string,
  token: string
): Promise<HAConnection> {
  const auth = createLongLivedTokenAuth(url, token);
  const connection = await createConnection({ auth });

  return {
    connection,

    subscribe(callback: (entities: HAEntities) => void) {
      const unsub = subscribeEntities(connection, (hass) => {
        callback(toHAEntities(hass));
      });
      return typeof unsub === "function" ? unsub : () => unsub;
    },

    async callService(
      domain: string,
      service: string,
      data?: Record<string, any>
    ) {
      await haCallService(connection, domain, service, data);
    },

    close() {
      connection.close();
    },
  };
}
`,
  },
  {
    path: "src/lib/ha-provider.tsx",
    content: `import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import type { HAEntity, HAEntities } from "./ha-types";
import { getDomain } from "./ha-types";
import { mockEntities } from "./mock-data";

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface HAContextType {
  entities: HAEntities;
  callService: (
    domain: string,
    service: string,
    data?: Record<string, any>
  ) => void;
  connected: boolean;
  mode: "mock" | "live";
}

const HAContext = createContext<HAContextType | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function HAProvider({ children }: { children: React.ReactNode }) {
  const haUrl = import.meta.env.VITE_HA_URL as string | undefined;
  const haToken = import.meta.env.VITE_HA_TOKEN as string | undefined;
  const isLive = Boolean(haUrl && haToken);

  const [entities, setEntities] = useState<HAEntities>(
    isLive ? {} : structuredClone(mockEntities)
  );
  const [connected, setConnected] = useState(!isLive);
  const connectionRef = useRef<any>(null);

  // ---- Live mode: connect via WebSocket ----
  useEffect(() => {
    if (!isLive) return;

    let cancelled = false;

    (async () => {
      try {
        const { connectToHA } = await import("./ha-connection");
        if (cancelled) return;

        const conn = await connectToHA(haUrl!, haToken!);
        if (cancelled) {
          conn.close();
          return;
        }

        connectionRef.current = conn;
        setConnected(true);

        conn.subscribe((ents) => {
          if (!cancelled) setEntities(ents);
        });
      } catch (err) {
        console.error("[HA] Connection failed:", err);
        setConnected(false);
      }
    })();

    return () => {
      cancelled = true;
      connectionRef.current?.close();
      connectionRef.current = null;
      setConnected(false);
    };
  }, [isLive, haUrl, haToken]);

  // ---- callService: mock mutates local state, live sends WebSocket ----
  const callService = useCallback(
    (domain: string, service: string, data?: Record<string, any>) => {
      if (isLive && connectionRef.current) {
        connectionRef.current.callService(domain, service, data);
        return;
      }

      // Mock mode: simulate common service calls locally
      const entityId = data?.entity_id as string | undefined;
      if (!entityId) return;

      setEntities((prev) => {
        const entity = prev[entityId];
        if (!entity) return prev;

        const updated = {
          ...entity,
          attributes: { ...entity.attributes },
          last_changed: new Date().toISOString(),
          last_updated: new Date().toISOString(),
        };

        // --- Light services ---
        if (domain === "light") {
          if (service === "turn_on") {
            updated.state = "on";
            if (data?.brightness !== undefined)
              updated.attributes.brightness = data.brightness;
            else if (updated.attributes.brightness === 0)
              updated.attributes.brightness = 191;
            if (data?.color_temp !== undefined)
              updated.attributes.color_temp = data.color_temp;
          } else if (service === "turn_off") {
            updated.state = "off";
            updated.attributes.brightness = 0;
          } else if (service === "toggle") {
            if (entity.state === "on") {
              updated.state = "off";
              updated.attributes.brightness = 0;
            } else {
              updated.state = "on";
              updated.attributes.brightness =
                entity.attributes.brightness > 0
                  ? entity.attributes.brightness
                  : 191;
            }
          }
        }

        // --- Switch services ---
        if (domain === "switch") {
          if (service === "turn_on") updated.state = "on";
          else if (service === "turn_off") updated.state = "off";
          else if (service === "toggle")
            updated.state = entity.state === "on" ? "off" : "on";
        }

        // --- Climate services ---
        if (domain === "climate") {
          if (service === "set_temperature" && data?.temperature !== undefined) {
            updated.attributes.temperature = data.temperature;
          }
          if (service === "set_hvac_mode" && data?.hvac_mode !== undefined) {
            updated.state = data.hvac_mode;
            updated.attributes.hvac_action =
              data.hvac_mode === "off" ? "off" : "idle";
          }
        }

        // --- Media player services ---
        if (domain === "media_player") {
          if (service === "media_play") updated.state = "playing";
          else if (service === "media_pause") updated.state = "paused";
          else if (service === "media_play_pause")
            updated.state =
              entity.state === "playing" ? "paused" : "playing";
          else if (service === "media_next_track") {
            updated.attributes.media_title = "Next Track";
            updated.attributes.media_artist = "Unknown Artist";
            updated.attributes.media_position = 0;
          }
          else if (service === "media_previous_track") {
            updated.attributes.media_position = 0;
          }
          if (service === "volume_set" && data?.volume_level !== undefined) {
            updated.attributes.volume_level = data.volume_level;
          }
        }

        // --- Cover services ---
        if (domain === "cover") {
          if (service === "open_cover") {
            updated.state = "open";
            updated.attributes.current_position = 100;
          } else if (service === "close_cover") {
            updated.state = "closed";
            updated.attributes.current_position = 0;
          } else if (
            service === "set_cover_position" &&
            data?.position !== undefined
          ) {
            updated.attributes.current_position = data.position;
            updated.state = data.position > 0 ? "open" : "closed";
          }
        }

        // --- Scene services ---
        if (domain === "scene" && service === "turn_on") {
          // Scenes don't have meaningful state changes
        }

        // --- Camera services ---
        if (domain === "camera") {
          if (service === "turn_on") updated.state = "idle";
          else if (service === "turn_off") updated.state = "off";
        }

        return { ...prev, [entityId]: updated };
      });
    },
    [isLive]
  );

  const value = useMemo<HAContextType>(
    () => ({
      entities,
      callService,
      connected,
      mode: isLive ? "live" : "mock",
    }),
    [entities, callService, connected, isLive]
  );

  return <HAContext.Provider value={value}>{children}</HAContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Access the full HA context */
export function useHA() {
  const ctx = useContext(HAContext);
  if (!ctx) throw new Error("useHA must be used within <HAProvider>");
  return ctx;
}

/** Get a single entity by ID + a scoped callService */
export function useEntity(entityId: string) {
  const { entities, callService } = useHA();
  const entity = entities[entityId] ?? null;
  return { entity, callService };
}

/** Get all entities for a given domain (e.g. "light", "sensor") */
export function useEntitiesByDomain(domain: string) {
  const { entities, callService } = useHA();
  const filtered = useMemo(
    () =>
      Object.values(entities).filter((e) => getDomain(e.entity_id) === domain),
    [entities, domain]
  );
  return { entities: filtered, callService };
}
`,
  },

  // ---------------------------------------------------------------------------
  // ha-catalog.json — compact entity catalog for LLM discovery
  // ---------------------------------------------------------------------------

  {
    path: "src/lib/ha-catalog.json",
    content: JSON.stringify(
      {
        areas: ["Living Room", "Kitchen", "Bedroom", "Hallway"],
        entities: {
          weather: [
            { id: "weather.home", name: "Home", area: null },
          ],
          light: [
            { id: "light.living_room", name: "Living Room", area: "Living Room" },
            { id: "light.kitchen", name: "Kitchen", area: "Kitchen" },
            { id: "light.bedroom", name: "Bedroom", area: "Bedroom" },
          ],
          switch: [
            { id: "switch.porch_light", name: "Porch Light", area: null },
            { id: "switch.garden_pump", name: "Garden Pump", area: null },
          ],
          climate: [
            { id: "climate.hallway", name: "Hallway Thermostat", area: "Hallway" },
          ],
          media_player: [
            { id: "media_player.living_room", name: "Living Room Speaker", area: "Living Room" },
          ],
          sensor: [
            { id: "sensor.outdoor_temp", name: "Outdoor Temperature", area: null, class: "temperature", unit: "°C" },
            { id: "sensor.indoor_humidity", name: "Indoor Humidity", area: null, class: "humidity", unit: "%" },
            { id: "sensor.power_usage", name: "Power Usage", area: null, class: "power", unit: "W" },
          ],
          cover: [
            { id: "cover.living_room_blinds", name: "Living Room Blinds", area: "Living Room" },
          ],
          scene: [
            { id: "scene.movie_night", name: "Movie Night", area: null },
            { id: "scene.good_morning", name: "Good Morning", area: null },
          ],
          camera: [
            { id: "camera.front_door", name: "Front Door", area: null },
          ],
          binary_sensor: [
            { id: "binary_sensor.front_door_motion", name: "Front Door Motion", area: null, class: "motion" },
            { id: "binary_sensor.front_door_person", name: "Front Door Person", area: null, class: "person" },
            { id: "binary_sensor.front_door_open", name: "Front Door", area: null, class: "door" },
          ],
        },
        componentMap: {
          weather: "WeatherCard",
          light: "LightCard",
          switch: "SwitchCard",
          climate: "ClimateCard",
          media_player: "MediaCard",
          sensor: "SensorCard",
          cover: "CoverCard",
          scene: "SceneCard",
          camera: "CameraCard",
          binary_sensor: "BinarySensorCard",
        },
      },
      null,
      2
    ),
  },

  // ---------------------------------------------------------------------------
  // components/
  // ---------------------------------------------------------------------------

  {
    path: "src/components/WeatherCard.tsx",
    content: `import {
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
  sunny: <Sun className="w-10 h-10 text-amber-400" />,
  "clear-night": <Sun className="w-10 h-10 text-amber-200" />,
  cloudy: <Cloud className="w-10 h-10 text-slate-400" />,
  rainy: <CloudRain className="w-10 h-10 text-blue-400" />,
  snowy: <CloudSnow className="w-10 h-10 text-blue-200" />,
  "partly-cloudy": <CloudSun className="w-10 h-10 text-amber-300" />,
  "partlycloudy": <CloudSun className="w-10 h-10 text-amber-300" />,
  lightning: <CloudLightning className="w-10 h-10 text-violet-400" />,
};

const smallIcon: Record<string, React.ReactNode> = {
  sunny: <Sun className="w-4 h-4 text-amber-400" />,
  "clear-night": <Sun className="w-4 h-4 text-amber-200" />,
  cloudy: <Cloud className="w-4 h-4 text-slate-400" />,
  rainy: <CloudRain className="w-4 h-4 text-blue-400" />,
  snowy: <CloudSnow className="w-4 h-4 text-blue-200" />,
  "partly-cloudy": <CloudSun className="w-4 h-4 text-amber-300" />,
  "partlycloudy": <CloudSun className="w-4 h-4 text-amber-300" />,
  lightning: <CloudLightning className="w-4 h-4 text-violet-400" />,
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
    <div className="bg-surface rounded-2xl p-6 flex flex-col gap-4 shadow-lg shadow-black/20">
      {/* Current conditions */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white/50 uppercase tracking-wide">
            {attr.friendly_name}
          </p>
          <p className="text-5xl font-light mt-1">
            {attr.temperature !== undefined ? \`\${Math.round(attr.temperature)}\u00B0\` : "--"}
          </p>
          <p className="text-sm text-white/60 capitalize mt-1">
            {condition.replace(/-/g, " ")}
          </p>
        </div>
        <div className="flex flex-col items-center gap-2">
          {conditionIcon[condition] ?? conditionIcon.sunny}
          {attr.humidity !== undefined && (
            <div className="flex items-center gap-1 text-xs text-white/40">
              <Droplets className="w-3 h-3" />
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
              <span className="text-xs text-white/40">
                {dayLabel(day.datetime)}
              </span>
              {smallIcon[day.condition] ?? smallIcon.sunny}
              <span className="text-xs">
                {Math.round(day.temperature)}\u00B0{" "}
                {day.templow !== undefined && (
                  <span className="text-white/30">
                    {Math.round(day.templow)}\u00B0
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
`,
  },
  {
    path: "src/components/LightCard.tsx",
    content: `import { Lightbulb } from "lucide-react";
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
      className={\`bg-surface rounded-2xl p-4 flex flex-col gap-3 shadow-lg shadow-black/20 transition-all duration-300 \${
        isOn ? "ring-1 ring-accent/30" : ""
      }\`}
    >
      {/* Icon + Toggle row */}
      <div className="flex items-center justify-between">
        <div
          className={\`p-2 rounded-xl transition-colors duration-300 \${
            isOn ? "bg-accent/20" : "bg-white/5"
          }\`}
        >
          <Lightbulb
            className={\`w-5 h-5 transition-colors duration-300 \${
              isOn ? "text-accent" : "text-white/30"
            }\`}
          />
        </div>
        <button
          onClick={handleToggle}
          className={\`w-12 h-7 rounded-full transition-all duration-300 relative shrink-0 \${
            isOn ? "bg-accent" : "bg-white/10"
          }\`}
        >
          <span
            className={\`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all duration-300 \${
              isOn ? "left-6" : "left-1"
            }\`}
          />
        </button>
      </div>

      {/* Name + Status */}
      <div>
        <p className="text-sm font-medium leading-tight">
          {attr.friendly_name}
        </p>
        <p className="text-xs text-white/40 mt-0.5">
          {isOn ? \`\${brightnessPercent}%\` : "Off"}
        </p>
      </div>

      {/* Brightness slider */}
      <div
        className={\`transition-opacity duration-300 \${
          isOn ? "opacity-100" : "opacity-0 pointer-events-none"
        }\`}
      >
        <input
          type="range"
          min={1}
          max={100}
          value={brightnessPercent || 1}
          onChange={(e) => handleBrightness(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-accent cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-accent
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:cursor-pointer"
        />
      </div>
    </div>
  );
}
`,
  },
  {
    path: "src/components/MediaCard.tsx",
    content: `import { Play, Pause, SkipBack, SkipForward, Music, Volume2 } from "lucide-react";
import { useEntity } from "../lib/ha-provider";
import type { MediaPlayerAttributes } from "../lib/ha-types";

interface MediaCardProps {
  entityId: string;
}

export default function MediaCard({ entityId }: MediaCardProps) {
  const { entity, callService } = useEntity(entityId);
  if (!entity) return null;

  const attr = entity.attributes as MediaPlayerAttributes;
  const isPlaying = entity.state === "playing";
  const progress =
    attr.media_duration && attr.media_position
      ? Math.round((attr.media_position / attr.media_duration) * 100)
      : 0;

  const handlePlayPause = () => {
    callService("media_player", "media_play_pause", { entity_id: entityId });
  };

  const handleNext = () => {
    callService("media_player", "media_next_track", { entity_id: entityId });
  };

  const handlePrev = () => {
    callService("media_player", "media_previous_track", {
      entity_id: entityId,
    });
  };

  const handleVolume = (value: number) => {
    callService("media_player", "volume_set", {
      entity_id: entityId,
      volume_level: value / 100,
    });
  };

  return (
    <div className="bg-surface rounded-2xl p-5 flex flex-col gap-4 shadow-lg shadow-black/20">
      {/* Album art + track info */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-surface-lighter flex items-center justify-center shrink-0 overflow-hidden">
          {attr.entity_picture ? (
            <img
              src={attr.entity_picture}
              alt="Album art"
              className="w-full h-full object-cover"
            />
          ) : (
            <Music className="w-6 h-6 text-accent/60" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">
            {attr.media_title ?? "Nothing playing"}
          </p>
          <p className="text-xs text-white/40 truncate">
            {attr.media_artist ?? attr.friendly_name}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full bg-accent/70 rounded-full transition-all duration-500"
          style={{ width: \`\${progress}%\` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6">
        <button
          onClick={handlePrev}
          className="p-2 rounded-full hover:bg-white/5 transition-colors text-white/50 hover:text-white"
        >
          <SkipBack className="w-4 h-4" />
        </button>
        <button
          onClick={handlePlayPause}
          className="p-3 rounded-full bg-accent/20 hover:bg-accent/30 transition-colors text-accent"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5" />
          )}
        </button>
        <button
          onClick={handleNext}
          className="p-2 rounded-full hover:bg-white/5 transition-colors text-white/50 hover:text-white"
        >
          <SkipForward className="w-4 h-4" />
        </button>
      </div>

      {/* Volume slider */}
      {attr.volume_level !== undefined && (
        <div className="flex items-center gap-2">
          <Volume2 className="w-3.5 h-3.5 text-white/30 shrink-0" />
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(attr.volume_level * 100)}
            onChange={(e) => handleVolume(Number(e.target.value))}
            className="w-full h-1 rounded-full appearance-none bg-white/10 accent-accent cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-accent
              [&::-webkit-slider-thumb]:shadow-md
              [&::-webkit-slider-thumb]:cursor-pointer"
          />
        </div>
      )}
    </div>
  );
}
`,
  },
  {
    path: "src/components/ClimateCard.tsx",
    content: `import { Thermometer, Flame, Snowflake, Power } from "lucide-react";
import { useEntity } from "../lib/ha-provider";
import type { ClimateAttributes } from "../lib/ha-types";

interface ClimateCardProps {
  entityId: string;
}

const modeIcon: Record<string, React.ReactNode> = {
  heat: <Flame className="w-4 h-4 text-orange-400" />,
  cool: <Snowflake className="w-4 h-4 text-blue-400" />,
  auto: <Thermometer className="w-4 h-4 text-accent" />,
  off: <Power className="w-4 h-4 text-white/30" />,
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
    <div className="bg-surface rounded-2xl p-5 flex flex-col gap-4 shadow-lg shadow-black/20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Thermometer className="w-5 h-5 text-accent" />
          <p className="text-sm font-medium">{attr.friendly_name}</p>
        </div>
        {actionLabel && (
          <span className="text-xs text-white/40 capitalize">
            {actionLabel}
          </span>
        )}
      </div>

      {/* Temperature display */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-white/40">Current</p>
          <p className="text-3xl font-light">
            {currentTemp !== undefined ? \`\${currentTemp}\u00B0\` : "--"}
          </p>
        </div>
        {targetTemp !== undefined && hvacMode !== "off" && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleTempChange(-step)}
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors text-lg"
            >
              -
            </button>
            <div className="text-center">
              <p className="text-xs text-white/40">Target</p>
              <p className="text-2xl font-light">{targetTemp}\u00B0</p>
            </div>
            <button
              onClick={() => handleTempChange(step)}
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors text-lg"
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
            className={\`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs capitalize transition-all duration-200 \${
              hvacMode === mode
                ? "bg-accent/20 text-accent ring-1 ring-accent/30"
                : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
            }\`}
          >
            {modeIcon[mode] ?? null}
            {mode}
          </button>
        ))}
      </div>
    </div>
  );
}
`,
  },
  {
    path: "src/components/SensorCard.tsx",
    content: `import {
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
  temperature: <Thermometer className="w-5 h-5 text-orange-400" />,
  humidity: <Droplets className="w-5 h-5 text-blue-400" />,
  power: <Zap className="w-5 h-5 text-yellow-400" />,
  energy: <Zap className="w-5 h-5 text-green-400" />,
  pressure: <Gauge className="w-5 h-5 text-violet-400" />,
};

export default function SensorCard({ entityId }: SensorCardProps) {
  const { entity } = useEntity(entityId);
  if (!entity) return null;

  const attr = entity.attributes as SensorAttributes;
  const icon =
    classIcon[attr.device_class ?? ""] ?? (
      <Activity className="w-5 h-5 text-accent" />
    );

  return (
    <div className="bg-surface rounded-2xl p-4 flex flex-col gap-2 shadow-lg shadow-black/20">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl bg-white/5">{icon}</div>
        <p className="text-xs text-white/40">{attr.friendly_name}</p>
      </div>
      <div className="flex items-baseline gap-1">
        <p className="text-3xl font-light">{entity.state}</p>
        {attr.unit_of_measurement && (
          <span className="text-sm text-white/40">
            {attr.unit_of_measurement}
          </span>
        )}
      </div>
    </div>
  );
}
`,
  },
  {
    path: "src/components/SwitchCard.tsx",
    content: `import { Power } from "lucide-react";
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
    <div
      className={\`bg-surface rounded-2xl p-4 flex flex-col gap-3 shadow-lg shadow-black/20 transition-all duration-300 \${
        isOn ? "ring-1 ring-accent/30" : ""
      }\`}
    >
      <div className="flex items-center justify-between">
        <div
          className={\`p-2 rounded-xl transition-colors duration-300 \${
            isOn ? "bg-accent/20" : "bg-white/5"
          }\`}
        >
          <Power
            className={\`w-5 h-5 transition-colors duration-300 \${
              isOn ? "text-accent" : "text-white/30"
            }\`}
          />
        </div>
        <button
          onClick={handleToggle}
          className={\`w-12 h-7 rounded-full transition-all duration-300 relative shrink-0 \${
            isOn ? "bg-accent" : "bg-white/10"
          }\`}
        >
          <span
            className={\`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all duration-300 \${
              isOn ? "left-6" : "left-1"
            }\`}
          />
        </button>
      </div>
      <div>
        <p className="text-sm font-medium leading-tight">
          {attr.friendly_name}
        </p>
        <p className="text-xs text-white/40 mt-0.5">{isOn ? "On" : "Off"}</p>
      </div>
    </div>
  );
}
`,
  },
  {
    path: "src/components/CoverCard.tsx",
    content: `import { ChevronUp, ChevronDown, Blinds } from "lucide-react";
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
    <div className="bg-surface rounded-2xl p-4 flex flex-col gap-3 shadow-lg shadow-black/20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={\`p-2 rounded-xl transition-colors duration-300 \${
              isOpen ? "bg-accent/20" : "bg-white/5"
            }\`}
          >
            <Blinds
              className={\`w-5 h-5 transition-colors duration-300 \${
                isOpen ? "text-accent" : "text-white/30"
              }\`}
            />
          </div>
          <div>
            <p className="text-sm font-medium leading-tight">
              {attr.friendly_name}
            </p>
            <p className="text-xs text-white/40 mt-0.5">
              {position}% open
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={handleOpen}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/50 hover:text-white"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/50 hover:text-white"
          >
            <ChevronDown className="w-4 h-4" />
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
        className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-accent cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-accent
          [&::-webkit-slider-thumb]:shadow-md
          [&::-webkit-slider-thumb]:cursor-pointer"
      />
    </div>
  );
}
`,
  },
  {
    path: "src/components/SceneCard.tsx",
    content: `import { Sparkles } from "lucide-react";
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
      className={\`bg-surface rounded-2xl p-4 flex items-center gap-3 shadow-lg shadow-black/20 transition-all duration-300 text-left w-full \${
        activated ? "ring-1 ring-accent/40 bg-accent/10" : "hover:bg-surface-light"
      }\`}
    >
      <div
        className={\`p-2 rounded-xl transition-colors duration-300 \${
          activated ? "bg-accent/20" : "bg-white/5"
        }\`}
      >
        <Sparkles
          className={\`w-5 h-5 transition-colors duration-300 \${
            activated ? "text-accent" : "text-white/40"
          }\`}
        />
      </div>
      <div>
        <p className="text-sm font-medium">{attr.friendly_name}</p>
        <p className="text-xs text-white/40">
          {activated ? "Activated" : "Tap to activate"}
        </p>
      </div>
    </button>
  );
}
`,
  },

  // ---------------------------------------------------------------------------
  // CameraCard
  // ---------------------------------------------------------------------------

  {
    path: "src/components/CameraCard.tsx",
    content: `import { Camera, Video, VideoOff } from "lucide-react";
import { useEntity, useHA } from "../lib/ha-provider";
import { useState, useEffect, useRef } from "react";
import type { CameraAttributes } from "../lib/ha-types";

interface CameraCardProps {
  entityId: string;
  refreshInterval?: number;
}

export default function CameraCard({
  entityId,
  refreshInterval = 2000,
}: CameraCardProps) {
  const { entity, callService } = useEntity(entityId);
  const { mode } = useHA();
  const [imgError, setImgError] = useState(false);
  const [tick, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (mode !== "live") return;
    intervalRef.current = setInterval(() => setTick((t) => t + 1), refreshInterval);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [mode, refreshInterval]);

  if (!entity) return null;

  const attr = entity.attributes as CameraAttributes;
  const isOff = entity.state === "off";
  const haUrl = import.meta.env.VITE_HA_URL || "";
  const liveImgUrl =
    mode === "live" && attr.entity_picture
      ? \`\${haUrl}\${attr.entity_picture}&_t=\${tick}\`
      : null;

  return (
    <div className="bg-surface rounded-2xl overflow-hidden shadow-lg shadow-black/20">
      <div className="relative aspect-video bg-black/40 flex items-center justify-center">
        {isOff ? (
          <div className="flex flex-col items-center gap-2 text-white/30">
            <VideoOff className="w-10 h-10" />
            <span className="text-xs">Camera off</span>
          </div>
        ) : mode === "live" && liveImgUrl && !imgError ? (
          <img
            src={liveImgUrl}
            alt={attr.friendly_name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-white/20">
            <Camera className="w-12 h-12" />
            <span className="text-xs uppercase tracking-wider">Live Feed</span>
          </div>
        )}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
          <div className={\`w-2 h-2 rounded-full \${
            isOff ? "bg-white/30"
              : entity.state === "recording" ? "bg-red-500 animate-pulse"
              : "bg-green-500"
          }\`} />
          <span className="text-[10px] text-white/70 uppercase">{entity.state}</span>
        </div>
      </div>
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-accent" />
          <p className="text-sm font-medium">{attr.friendly_name}</p>
        </div>
      </div>
    </div>
  );
}
`,
  },

  // ---------------------------------------------------------------------------
  // BinarySensorCard
  // ---------------------------------------------------------------------------

  {
    path: "src/components/BinarySensorCard.tsx",
    content: `import {
  Activity, User, Car, Dog, DoorOpen, DoorClosed,
  Eye, Flame, Droplets, Volume2, Vibrate, ShieldAlert,
} from "lucide-react";
import { useEntity } from "../lib/ha-provider";
import type { BinarySensorAttributes } from "../lib/ha-types";

interface BinarySensorCardProps {
  entityId: string;
}

const deviceClassConfig: Record<string, {
  iconOn: React.ReactNode; iconOff: React.ReactNode;
  labelOn: string; labelOff: string; colorOn: string;
}> = {
  motion: { iconOn: <Activity className="w-5 h-5" />, iconOff: <Activity className="w-5 h-5" />, labelOn: "Motion detected", labelOff: "Clear", colorOn: "text-amber-400" },
  person: { iconOn: <User className="w-5 h-5" />, iconOff: <User className="w-5 h-5" />, labelOn: "Person detected", labelOff: "Clear", colorOn: "text-blue-400" },
  vehicle: { iconOn: <Car className="w-5 h-5" />, iconOff: <Car className="w-5 h-5" />, labelOn: "Vehicle detected", labelOff: "Clear", colorOn: "text-purple-400" },
  pet: { iconOn: <Dog className="w-5 h-5" />, iconOff: <Dog className="w-5 h-5" />, labelOn: "Pet detected", labelOff: "Clear", colorOn: "text-green-400" },
  door: { iconOn: <DoorOpen className="w-5 h-5" />, iconOff: <DoorClosed className="w-5 h-5" />, labelOn: "Open", labelOff: "Closed", colorOn: "text-orange-400" },
  window: { iconOn: <DoorOpen className="w-5 h-5" />, iconOff: <DoorClosed className="w-5 h-5" />, labelOn: "Open", labelOff: "Closed", colorOn: "text-orange-400" },
  occupancy: { iconOn: <Eye className="w-5 h-5" />, iconOff: <Eye className="w-5 h-5" />, labelOn: "Occupied", labelOff: "Clear", colorOn: "text-cyan-400" },
  presence: { iconOn: <User className="w-5 h-5" />, iconOff: <User className="w-5 h-5" />, labelOn: "Home", labelOff: "Away", colorOn: "text-green-400" },
  smoke: { iconOn: <ShieldAlert className="w-5 h-5" />, iconOff: <ShieldAlert className="w-5 h-5" />, labelOn: "Smoke detected!", labelOff: "Clear", colorOn: "text-red-500" },
  moisture: { iconOn: <Droplets className="w-5 h-5" />, iconOff: <Droplets className="w-5 h-5" />, labelOn: "Wet", labelOff: "Dry", colorOn: "text-blue-400" },
  sound: { iconOn: <Volume2 className="w-5 h-5" />, iconOff: <Volume2 className="w-5 h-5" />, labelOn: "Sound detected", labelOff: "Clear", colorOn: "text-violet-400" },
  vibration: { iconOn: <Vibrate className="w-5 h-5" />, iconOff: <Vibrate className="w-5 h-5" />, labelOn: "Vibration detected", labelOff: "Clear", colorOn: "text-amber-400" },
};

const defaultConfig = {
  iconOn: <Activity className="w-5 h-5" />, iconOff: <Activity className="w-5 h-5" />,
  labelOn: "On", labelOff: "Off", colorOn: "text-accent",
};

export default function BinarySensorCard({ entityId }: BinarySensorCardProps) {
  const { entity } = useEntity(entityId);
  if (!entity) return null;

  const attr = entity.attributes as BinarySensorAttributes;
  const isOn = entity.state === "on";
  const config = deviceClassConfig[attr.device_class ?? ""] ?? defaultConfig;

  return (
    <div className={\`bg-surface rounded-2xl p-4 flex items-center gap-3 shadow-lg shadow-black/20 transition-all duration-300 \${isOn ? "ring-1 ring-white/10" : ""}\`}>
      <div className={\`p-2 rounded-xl transition-colors duration-300 \${isOn ? "bg-white/10" : "bg-white/5"}\`}>
        <span className={\`transition-colors duration-300 \${isOn ? config.colorOn : "text-white/30"}\`}>
          {isOn ? config.iconOn : config.iconOff}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight truncate">{attr.friendly_name}</p>
        <p className={\`text-xs mt-0.5 transition-colors duration-300 \${isOn ? config.colorOn : "text-white/40"}\`}>
          {isOn ? config.labelOn : config.labelOff}
        </p>
      </div>
      <div className={\`w-2.5 h-2.5 rounded-full shrink-0 transition-all duration-300 \${isOn ? \`\${config.colorOn} bg-current animate-pulse\` : "bg-white/10"}\`} />
    </div>
  );
}
`,
  },

  // ---------------------------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------------------------

  {
    path: "src/Dashboard.tsx",
    content: `import WeatherCard from "./components/WeatherCard";
import MediaCard from "./components/MediaCard";
import LightCard from "./components/LightCard";
import ClimateCard from "./components/ClimateCard";
import SensorCard from "./components/SensorCard";
import SwitchCard from "./components/SwitchCard";
import CoverCard from "./components/CoverCard";
import SceneCard from "./components/SceneCard";
import CameraCard from "./components/CameraCard";
import BinarySensorCard from "./components/BinarySensorCard";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-[#0d0d1a] p-6">
      <div className="max-w-md mx-auto flex flex-col gap-4">
        {/* Weather — top */}
        <WeatherCard entityId="weather.home" />

        {/* Camera */}
        <CameraCard entityId="camera.front_door" />

        {/* Binary Sensors */}
        <div className="grid grid-cols-2 gap-4">
          <BinarySensorCard entityId="binary_sensor.front_door_motion" />
          <BinarySensorCard entityId="binary_sensor.front_door_person" />
        </div>

        {/* Climate */}
        <ClimateCard entityId="climate.hallway" />

        {/* Music — middle */}
        <MediaCard entityId="media_player.living_room" />

        {/* Lights */}
        <div className="grid grid-cols-2 gap-4">
          <LightCard entityId="light.living_room" />
          <LightCard entityId="light.kitchen" />
        </div>

        {/* Sensors */}
        <div className="grid grid-cols-3 gap-4">
          <SensorCard entityId="sensor.outdoor_temp" />
          <SensorCard entityId="sensor.indoor_humidity" />
          <SensorCard entityId="sensor.power_usage" />
        </div>

        {/* Switches + Cover */}
        <div className="grid grid-cols-2 gap-4">
          <SwitchCard entityId="switch.porch_light" />
          <CoverCard entityId="cover.living_room_blinds" />
        </div>

        {/* Scenes */}
        <div className="grid grid-cols-2 gap-4">
          <SceneCard entityId="scene.movie_night" />
          <SceneCard entityId="scene.good_morning" />
        </div>
      </div>
    </div>
  );
}
`,
  },
];
