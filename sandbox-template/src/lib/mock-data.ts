import type { HAEntity, HAEntities } from "./ha-types";

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
    brightness: 191, // ~75% of 255
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
    brightness: 64, // ~25%
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
    unit_of_measurement: "°C",
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
  attributes: {
    friendly_name: "Front Door",
    entity_picture: "",
    supported_features: 2,
  },
  last_changed: now,
  last_updated: now,
};

// ---------------------------------------------------------------------------
// Binary Sensors
// ---------------------------------------------------------------------------

const binaryMotionFrontDoor: HAEntity = {
  entity_id: "binary_sensor.front_door_motion",
  state: "off",
  attributes: {
    friendly_name: "Front Door Motion",
    device_class: "motion",
  },
  last_changed: now,
  last_updated: now,
};

const binaryPersonFrontDoor: HAEntity = {
  entity_id: "binary_sensor.front_door_person",
  state: "off",
  attributes: {
    friendly_name: "Front Door Person",
    device_class: "person",
  },
  last_changed: now,
  last_updated: now,
};

const binaryFrontDoorOpen: HAEntity = {
  entity_id: "binary_sensor.front_door_open",
  state: "off",
  attributes: {
    friendly_name: "Front Door",
    device_class: "door",
  },
  last_changed: now,
  last_updated: now,
};

// ---------------------------------------------------------------------------
// Aggregate: all mock entities keyed by entity_id
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
