/**
 * Persistent Home Assistant WebSocket connection service.
 *
 * Maintains a long-lived WebSocket connection to HA, tracks entity state,
 * and provides real-time entity streaming to subscribers.
 */

import WebSocket from "ws";

const RECONNECT_DELAY_MS = 5000;
const COMMAND_TIMEOUT_MS = 30000;

export function createHAConnection({ haUrl, haToken }) {
  let ws = null;
  let msgId = 1;
  let connected = false;
  let reconnectTimer = null;
  let entities = {};
  let areas = [];
  let devices = [];
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
    // Fetch all states, devices, and areas in parallel
    const [statesResp, devicesResp, areasResp] = await Promise.all([
      sendCommand("get_states"),
      sendCommand("config/device_registry/list"),
      sendCommand("config/area_registry/list"),
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

    console.log(
      `[ha] Loaded ${Object.keys(entities).length} entities, ${devices.length} devices, ${areas.length} areas`
    );

    notifyEntityListeners();
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
    onEntitiesChanged,
    onStatusChanged,
  };
}
