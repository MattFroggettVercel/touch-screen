/**
 * Dev server routes
 *
 * POST /api/dev/start  - Start Vite dev server for editing session
 * POST /api/dev/stop   - Stop Vite dev server, switch to production
 * GET  /api/dev/status  - Check if dev server is running
 */

export function registerDevRoutes(app, ctx) {
  const { viteManager, devPort } = ctx;

  app.post("/api/dev/start", async (request, reply) => {
    if (viteManager.isRunning()) {
      return { success: true, message: "Dev server already running", port: devPort };
    }

    try {
      await viteManager.start();
      return { success: true, message: "Dev server started", port: devPort };
    } catch (err) {
      return reply
        .status(500)
        .send({ error: `Failed to start dev server: ${err.message}` });
    }
  });

  app.post("/api/dev/stop", async (request, reply) => {
    if (!viteManager.isRunning()) {
      return { success: true, message: "Dev server not running" };
    }

    try {
      viteManager.stop();
      return { success: true, message: "Dev server stopped" };
    } catch (err) {
      return reply
        .status(500)
        .send({ error: `Failed to stop dev server: ${err.message}` });
    }
  });

  app.get("/api/dev/status", async () => {
    return {
      running: viteManager.isRunning(),
      port: viteManager.isRunning() ? devPort : null,
    };
  });

  /**
   * GET /api/dev/errors — Return recent Vite stderr output.
   * The AI uses this to diagnose compilation / HMR errors.
   */
  app.get("/api/dev/errors", async () => {
    const errors = viteManager.getErrors();
    return {
      errors,
      count: errors.length,
      running: viteManager.isRunning(),
    };
  });

  /**
   * POST /api/dev/errors/clear — Clear captured error lines.
   */
  app.post("/api/dev/errors/clear", async () => {
    viteManager.clearErrors();
    return { success: true, message: "Error buffer cleared" };
  });
}
