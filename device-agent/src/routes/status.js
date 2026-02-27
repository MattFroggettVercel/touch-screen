/**
 * Status routes
 *
 * GET /api/status - Device info, HA connection status, current mode
 */

export function registerStatusRoutes(app, ctx) {
  app.get("/api/status", async () => {
    const { deviceCode, haConnection, viteManager, wifiManager } = ctx;

    return {
      deviceCode,
      mode: wifiManager.isAPMode() ? "setup" : "ready",
      editing: viteManager.isRunning(),
      ha: {
        connected: haConnection.isConnected(),
        entityCount: Object.keys(haConnection.getEntities()).length,
      },
      wifi: {
        mode: wifiManager.isAPMode() ? "ap" : "client",
        ssid: wifiManager.getCurrentSSID(),
      },
    };
  });
}
