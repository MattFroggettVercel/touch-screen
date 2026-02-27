/**
 * Build routes
 *
 * POST /api/build                - Run npm install + npm run build
 * POST /api/build/install        - Run npm install only
 * POST /api/packages/install     - Install specific npm package(s)
 */

export function registerBuildRoutes(app, ctx) {
  const { buildManager, viteManager } = ctx;

  app.post("/api/build", async (request, reply) => {
    // Stop dev server before building
    if (viteManager.isRunning()) {
      viteManager.stop();
    }

    try {
      await buildManager.installAndBuild();
      return { success: true, message: "Build complete" };
    } catch (err) {
      return reply
        .status(500)
        .send({ error: `Build failed: ${err.message}` });
    }
  });

  app.post("/api/build/install", async (request, reply) => {
    try {
      await buildManager.install();
      return { success: true, message: "Install complete" };
    } catch (err) {
      return reply
        .status(500)
        .send({ error: `Install failed: ${err.message}` });
    }
  });

  /**
   * POST /api/packages/install — Install a specific npm package.
   * Body: { packageName: "react-icons" } or { packageName: "react-icons@5.0.0" }
   *
   * Used by the AI when it writes code that imports a package not yet installed.
   */
  app.post("/api/packages/install", async (request, reply) => {
    const { packageName } = request.body || {};

    if (!packageName || typeof packageName !== "string") {
      return reply
        .status(400)
        .send({ error: "packageName is required (string)" });
    }

    // Basic safety: only allow typical npm package name characters
    if (!/^(@[\w-]+\/)?[\w.-]+(@[\w.^~><=|-]+)?$/.test(packageName)) {
      return reply
        .status(400)
        .send({ error: `Invalid package name: ${packageName}` });
    }

    try {
      await buildManager.installPackage(packageName);
      return {
        success: true,
        message: `Installed ${packageName}`,
      };
    } catch (err) {
      return reply
        .status(500)
        .send({ error: `Failed to install ${packageName}: ${err.message}` });
    }
  });
}
