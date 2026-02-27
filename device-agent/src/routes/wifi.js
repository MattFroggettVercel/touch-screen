/**
 * WiFi routes
 *
 * GET  /api/wifi/scan     - Scan available WiFi networks
 * POST /api/wifi/connect  - Save WiFi credentials, switch from AP to client
 * GET  /api/wifi/status   - Current WiFi connection status
 */

export function registerWifiRoutes(app, ctx) {
  const { wifiManager } = ctx;

  app.get("/api/wifi/scan", async (request, reply) => {
    try {
      const networks = await wifiManager.scan();
      return { networks };
    } catch (err) {
      return reply
        .status(500)
        .send({ error: `WiFi scan failed: ${err.message}` });
    }
  });

  app.post("/api/wifi/connect", async (request, reply) => {
    const { ssid, password } = request.body || {};

    if (!ssid) {
      return reply.status(400).send({ error: "ssid is required" });
    }

    try {
      await wifiManager.connect(ssid, password || "");
      return { success: true, message: `Connecting to ${ssid}...` };
    } catch (err) {
      return reply
        .status(500)
        .send({ error: `WiFi connect failed: ${err.message}` });
    }
  });

  app.get("/api/wifi/status", async () => {
    return {
      mode: wifiManager.isAPMode() ? "ap" : "client",
      ssid: wifiManager.getCurrentSSID(),
      ip: wifiManager.getCurrentIP(),
      apSSID: wifiManager.isAPMode()
        ? wifiManager.getAPSSID()
        : null,
    };
  });

  app.post("/api/wifi/start-ap", async (request, reply) => {
    try {
      wifiManager.startAPMode();
      return { success: true, message: "AP mode started" };
    } catch (err) {
      return reply
        .status(500)
        .send({ error: `Failed to start AP mode: ${err.message}` });
    }
  });
}
