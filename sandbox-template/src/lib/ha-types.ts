// Unified entity type mirroring Home Assistant's HassEntity shape.
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
  device_class?: string; // "temperature" | "humidity" | "power" | "energy" etc.
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
  entity_picture?: string; // HA camera proxy URL (relative)
  supported_features?: number; // 2 = stream
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
