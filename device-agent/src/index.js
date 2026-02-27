#!/usr/bin/env node

/**
 * TouchScreen Pi Local Server
 *
 * Fastify HTTP + WebSocket server that runs on the Raspberry Pi.
 * Provides REST API for file operations, HA entity access, WiFi setup,
 * and Vite dev server lifecycle management. The React Native companion
 * app connects to this server over the local network.
 */

import { readFileSync } from "fs";
import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";

import { registerStatusRoutes } from "./routes/status.js";
import { registerFileRoutes } from "./routes/files.js";
import { registerHARoutes } from "./routes/ha.js";
import { registerDevRoutes } from "./routes/dev.js";
import { registerWifiRoutes } from "./routes/wifi.js";
import { registerBuildRoutes } from "./routes/build.js";
import { createHAConnection } from "./services/ha-connection.js";
import { createViteManager } from "./services/vite-manager.js";
import { createBuildManager } from "./services/build-manager.js";
import { createWifiManager } from "./services/wifi-manager.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CONFIG_PATH =
  process.env.DEVICE_CONFIG || "/opt/touchscreen/config.json";

let config;
try {
  config = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
} catch {
  console.error(`Failed to read config from ${CONFIG_PATH}`);
  console.error(
    'Create a config.json with: { "deviceCode": "...", "dashboardDir": "/opt/touchscreen/dashboard" }'
  );
  process.exit(1);
}

const {
  deviceCode,
  dashboardDir = "/opt/touchscreen/dashboard",
  serverPort = 3001,
  devPort = 5173,
  productionPort = 5173,
  haUrl,
  haToken,
} = config;

if (!deviceCode) {
  console.error("Config must include deviceCode");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

const haConnection = createHAConnection({ haUrl, haToken });
const viteManager = createViteManager({ dashboardDir, devPort });
const buildManager = createBuildManager({ dashboardDir });
const wifiManager = createWifiManager({ deviceCode });

// Shared context passed to all routes
const context = {
  config,
  deviceCode,
  dashboardDir,
  devPort,
  productionPort,
  haConnection,
  viteManager,
  buildManager,
  wifiManager,
};

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(websocket);

// Register routes
registerStatusRoutes(app, context);
registerFileRoutes(app, context);
registerHARoutes(app, context);
registerDevRoutes(app, context);
registerWifiRoutes(app, context);
registerBuildRoutes(app, context);

// WebSocket endpoint for real-time HA entity streaming
app.register(async function (fastify) {
  fastify.get("/ws", { websocket: true }, (socket, req) => {
    app.log.info("WebSocket client connected");

    // Send current HA entities immediately
    const entities = haConnection.getEntities();
    if (Object.keys(entities).length > 0) {
      socket.send(
        JSON.stringify({ type: "ha:entities", data: entities })
      );
    }

    // Subscribe to HA entity updates
    const unsubEntities = haConnection.onEntitiesChanged((ents) => {
      socket.send(
        JSON.stringify({ type: "ha:entities", data: ents })
      );
    });

    // Subscribe to HA connection status
    const unsubStatus = haConnection.onStatusChanged((status) => {
      socket.send(
        JSON.stringify({ type: "ha:status", data: status })
      );
    });

    // Handle incoming messages from the app
    socket.on("message", async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === "ha:service") {
          const { domain, service, data } = msg;
          await haConnection.callService(domain, service, data);
        }
      } catch (err) {
        app.log.error("WebSocket message error:", err.message);
      }
    });

    socket.on("close", () => {
      app.log.info("WebSocket client disconnected");
      unsubEntities();
      unsubStatus();
    });
  });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

try {
  // Connect to HA if configured
  if (haUrl && haToken) {
    haConnection.connect().catch((err) => {
      app.log.warn(`HA connection failed (will retry): ${err.message}`);
    });
  }

  // Start the HTTP server
  await app.listen({ port: serverPort, host: "0.0.0.0" });
  app.log.info(`TouchScreen server running on port ${serverPort}`);
  app.log.info(`Device code: ${deviceCode}`);
  app.log.info(`Dashboard dir: ${dashboardDir}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

// Graceful shutdown
process.on("SIGINT", async () => {
  app.log.info("Shutting down...");
  viteManager.stop();
  haConnection.disconnect();
  await app.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  app.log.info("Shutting down...");
  viteManager.stop();
  haConnection.disconnect();
  await app.close();
  process.exit(0);
});
