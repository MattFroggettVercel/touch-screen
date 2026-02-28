/**
 * Persistent Home Assistant WebSocket connection service.
 *
 * Maintains a long-lived WebSocket connection to HA, tracks entity state,
 * and provides real-time entity streaming to subscribers.
 *
 * When dashboardDir is provided, writes a compact entity catalog file
 * (ha-catalog.json) to the dashboard project so the LLM can discover
 * available entities via its readFile tool.
 */

import WebSocket from "ws";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";

const RECONNECT_DELAY_MS = 5000;
const COMMAND_TIMEOUT_MS = 30000;

/** Domains that have a corresponding dashboard component */
const SUPPORTED_DOMAINS = new Set([
  "light",
  "switch",
  "sensor",
  "climate",
  "media_player",
  "cover",
  "scene",
  "camera",
  "binary_sensor",
  "weather",
]);

/** Maps each supported domain to its dashboard component name */
const COMPONENT_MAP = {
  light: "LightCard",
  switch: "SwitchCard",
  sensor: "SensorCard",
  climate: "ClimateCard",
  media_player: "MediaCard",
  cover: "CoverCard",
  scene: "SceneCard",
  camera: "CameraCard",
  binary_sensor: "BinarySensorCard",
  weather: "WeatherCard",
};

export function createHAConnection({ haUrl, haToken, dashboardDir }) {
  let ws = null;
  let msgId = 1;
  let connected = false;
  let reconnectTimer = null;
  let entities = {};
  let areas = [];
  let devices = [];
  let entityRegistry = [];
  let catalog = null;
  const pending = new Map();
  const entityListeners = new Set();
  const statusListeners = new Set();

  // ---- Internal helpers ----

  function notifyEntityListeners() {
    for (const fn of entityListeners) {
      try {
        fn(entities);
      } catch {}
    }
  }

  function notifyStatusListeners(status) {
    for (const fn of statusListeners) {
      try {
        fn(status);
      } catch {}
    }
  }

  function sendCommand(type, extra = {}) {
    const id = msgId++;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Timeout waiting for response to ${type}`));
      }, COMMAND_TIMEOUT_MS);

      pending.set(id, {
        resolve: (msg) => {
          clearTimeout(timeout);
          resolve(msg);
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        },
      });

      ws.send(JSON.stringify({ id, type, ...extra }));
    });
  }

  async function handleAuth() {
    // Wait for auth_required
    await new Promise((resolve, reject) => {
      ws.once("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "auth_required") resolve();
        else reject(new Error(`Expected auth_required, got ${msg.type}`));
      });
    });

    // Send auth
    ws.send(JSON.stringify({ type: "auth", access_token: haToken }));

    // Wait for auth_ok
    await new Promise((resolve, reject) => {
      ws.once("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "auth_ok") resolve(msg);
        else reject(new Error(`HA auth failed: ${msg.message || "unknown"}`));
      });
    });
  }

  function setupMessageHandler() {
    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());

      // Handle command responses
      if (msg.id && pending.has(msg.id)) {
        const { resolve } = pending.get(msg.id);
        pending.delete(msg.id);
        resolve(msg);
        return;
      }

      // Handle entity state change events
      if (msg.type === "event" && msg.event?.event_type === "state_changed") {
        const { entity_id, new_state } = msg.event.data;
        if (new_state) {
          entities[entity_id] = {
            entity_id: new_state.entity_id,
            state: new_state.state,
            attributes: new_state.attributes,
            last_changed: new_state.last_changed,
            last_updated: new_state.last_updated,
          };
          notifyEntityListeners();
        }
      }
    });
  }

  async function fetchInitialData() {
    // Fetch all states, devices, areas, and entity registry in parallel
    const [statesResp, devicesResp, areasResp, entityRegResp] =
      await Promise.all([
        sendCommand("get_states"),
        sendCommand("config/device_registry/list"),
        sendCommand("config/area_registry/list"),
        sendCommand("config/entity_registry/list"),
      ]);

    // Process entities
    const states = statesResp.result || [];
    entities = {};
    for (const s of states) {
      entities[s.entity_id] = {
        entity_id: s.entity_id,
        state: s.state,
        attributes: s.attributes,
        last_changed: s.last_changed,
        last_updated: s.last_updated,
      };
    }

    // Process devices
    const haDevices = devicesResp.result || [];
    devices = haDevices.map((d) => ({
      id: d.id,
      name: d.name_by_user || d.name,
      manufacturer: d.manufacturer,
      model: d.model,
      area_id: d.area_id,
    }));

    // Process areas
    const haAreas = areasResp.result || [];
    areas = haAreas.map((a) => ({
      area_id: a.area_id,
      name: a.name,
    }));

    // Process entity registry (for entity → device/area mapping)
    entityRegistry = entityRegResp.result || [];

    console.log(
      `[ha] Loaded ${Object.keys(entities).length} entities, ${devices.length} devices, ${areas.length} areas`
    );

    // Build and write the entity catalog for LLM discovery
    catalog = buildCatalog();
    writeCatalog();

    notifyEntityListeners();
  }

  // ---- Catalog generation ----

  /**
   * Build a compact entity catalog for LLM consumption.
   * Only includes supported domains with minimal metadata.
   */
  function buildCatalog() {
    // Build area lookup: area_id → name
    const areaMap = new Map();
    for (const a of areas) {
      areaMap.set(a.area_id, a.name);
    }

    // Build device → area lookup: device_id → area_id
    const deviceAreaMap = new Map();
    for (const d of devices) {
      if (d.area_id) deviceAreaMap.set(d.id, d.area_id);
    }

    // Build entity → area lookup using entity registry
    // Entity can have its own area_id, or inherit from its device
    const entityAreaMap = new Map();
    for (const reg of entityRegistry) {
      const entityAreaId = reg.area_id;
      const deviceAreaId = reg.device_id
        ? deviceAreaMap.get(reg.device_id)
        : null;
      const resolvedAreaId = entityAreaId || deviceAreaId;
      if (resolvedAreaId) {
        entityAreaMap.set(reg.entity_id, areaMap.get(resolvedAreaId) || null);
      }
    }

    // Group entities by domain, filtering to supported domains only
    const grouped = {};
    for (const e of Object.values(entities)) {
      const domain = e.entity_id.split(".")[0];
      if (!SUPPORTED_DOMAINS.has(domain)) continue;

      if (!grouped[domain]) grouped[domain] = [];

      const entry = {
        id: e.entity_id,
        name: e.attributes.friendly_name || e.entity_id.split(".")[1],
        area: entityAreaMap.get(e.entity_id) || null,
      };

      // Add sensor-specific metadata
      if (domain === "sensor") {
        if (e.attributes.device_class) entry.class = e.attributes.device_class;
        if (e.attributes.unit_of_measurement)
          entry.unit = e.attributes.unit_of_measurement;
      }

      // Add binary_sensor device_class
      if (domain === "binary_sensor" && e.attributes.device_class) {
        entry.class = e.attributes.device_class;
      }

      grouped[domain].push(entry);
    }

    return {
      areas: [...new Set(Object.values(entities)
        .map((e) => entityAreaMap.get(e.entity_id))
        .filter(Boolean)
      )].sort(),
      entities: grouped,
      componentMap: { ...COMPONENT_MAP },
    };
  }

  /**
   * Write the catalog file to the dashboard project filesystem.
   */
  function writeCatalog() {
    if (!dashboardDir || !catalog) return;

    const catalogPath = join(dashboardDir, "src", "lib", "ha-catalog.json");
    try {
      mkdirSync(dirname(catalogPath), { recursive: true });
      writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), "utf-8");
      const entityCount = Object.values(catalog.entities).reduce(
        (sum, arr) => sum + arr.length,
        0
      );
      console.log(
        `[ha] Wrote entity catalog (${entityCount} entities, ${catalog.areas.length} areas) to ${catalogPath}`
      );
    } catch (err) {
      console.error(`[ha] Failed to write catalog: ${err.message}`);
    }
  }

  async function subscribeToStateChanges() {
    await sendCommand("subscribe_events", {
      event_type: "state_changed",
    });
    console.log("[ha] Subscribed to state_changed events");
  }

  // ---- Public API ----

  async function connect() {
    if (!haUrl || !haToken) {
      console.log("[ha] No HA URL or token configured, skipping connection");
      return;
    }

    const wsUrl = haUrl.replace(/^http/, "ws") + "/api/websocket";
    console.log(`[ha] Connecting to ${wsUrl}...`);

    return new Promise((resolve, reject) => {
      ws = new WebSocket(wsUrl);

      ws.on("open", async () => {
        try {
          await handleAuth();
          setupMessageHandler();
          await fetchInitialData();
          await subscribeToStateChanges();

          connected = true;
          notifyStatusListeners({ connected: true });
          console.log("[ha] Connected and subscribed");
          resolve();
        } catch (err) {
          console.error("[ha] Setup failed:", err.message);
          ws.close();
          reject(err);
        }
      });

      ws.on("close", () => {
        const wasConnected = connected;
        connected = false;
        if (wasConnected) {
          notifyStatusListeners({ connected: false });
          console.log("[ha] Disconnected, will reconnect...");
          scheduleReconnect();
        }
      });

      ws.on("error", (err) => {
        console.error("[ha] WebSocket error:", err.message);
        if (!connected) reject(err);
      });
    });
  }

  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws) {
      ws.close();
      ws = null;
    }
    connected = false;
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect().catch((err) => {
        console.warn(`[ha] Reconnect failed: ${err.message}`);
        scheduleReconnect();
      });
    }, RECONNECT_DELAY_MS);
  }

  async function callService(domain, service, data = {}) {
    if (!connected || !ws) {
      throw new Error("Not connected to Home Assistant");
    }

    const resp = await sendCommand("call_service", {
      domain,
      service,
      service_data: data,
    });

    if (!resp.success) {
      throw new Error(resp.error?.message || "Service call failed");
    }

    return resp;
  }

  function isConnected() {
    return connected;
  }

  function getEntities() {
    return entities;
  }

  function getAreas() {
    return areas;
  }

  function getDevices() {
    return devices;
  }

  function getCatalog() {
    return catalog;
  }

  function onEntitiesChanged(fn) {
    entityListeners.add(fn);
    return () => entityListeners.delete(fn);
  }

  function onStatusChanged(fn) {
    statusListeners.add(fn);
    return () => statusListeners.delete(fn);
  }

  return {
    connect,
    disconnect,
    callService,
    isConnected,
    getEntities,
    getAreas,
    getDevices,
    getCatalog,
    onEntitiesChanged,
    onStatusChanged,
  };
}
