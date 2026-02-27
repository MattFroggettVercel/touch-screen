/**
 * Home Assistant routes
 *
 * GET  /api/ha/entities  - Full entity snapshot
 * POST /api/ha/service   - Call an HA service
 * GET  /api/ha/areas     - List HA areas
 * GET  /api/ha/devices   - List HA devices
 */

export function registerHARoutes(app, ctx) {
  const { haConnection } = ctx;

  // Get all entities
  app.get("/api/ha/entities", async (request, reply) => {
    if (!haConnection.isConnected()) {
      return reply
        .status(503)
        .send({ error: "Home Assistant not connected" });
    }

    return { entities: haConnection.getEntities() };
  });

  // Call a service
  app.post("/api/ha/service", async (request, reply) => {
    if (!haConnection.isConnected()) {
      return reply
        .status(503)
        .send({ error: "Home Assistant not connected" });
    }

    const { domain, service, data } = request.body || {};

    if (!domain || !service) {
      return reply
        .status(400)
        .send({ error: "domain and service are required" });
    }

    try {
      await haConnection.callService(domain, service, data || {});
      return { success: true };
    } catch (err) {
      return reply
        .status(500)
        .send({ error: `Service call failed: ${err.message}` });
    }
  });

  // Get areas
  app.get("/api/ha/areas", async (request, reply) => {
    if (!haConnection.isConnected()) {
      return reply
        .status(503)
        .send({ error: "Home Assistant not connected" });
    }

    return { areas: haConnection.getAreas() };
  });

  // Get devices
  app.get("/api/ha/devices", async (request, reply) => {
    if (!haConnection.isConnected()) {
      return reply
        .status(503)
        .send({ error: "Home Assistant not connected" });
    }

    return { devices: haConnection.getDevices() };
  });
}
