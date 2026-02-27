/**
 * Vite Dev Server Manager
 *
 * Starts/stops the Vite dev server on demand for editing sessions.
 * The dev server is NOT a persistent service — it only runs while
 * the user is actively editing the dashboard via the companion app.
 */

import { spawn } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

export function createViteManager({ dashboardDir, devPort = 5173 }) {
  let process_ = null;
  let running = false;

  // Circular buffer of recent stderr lines (Vite errors, warnings)
  const MAX_ERROR_LINES = 50;
  let errorLines = [];

  async function start() {
    if (running) return;

    const pkgPath = join(dashboardDir, "package.json");
    if (!existsSync(pkgPath)) {
      throw new Error(`Dashboard not found at ${dashboardDir}`);
    }

    const nodeModules = join(dashboardDir, "node_modules");
    if (!existsSync(nodeModules)) {
      throw new Error(
        "Dependencies not installed. Run POST /api/build/install first."
      );
    }

    // Clear errors from any previous session
    errorLines = [];

    console.log(`[vite] Starting dev server on port ${devPort}...`);

    process_ = spawn("npx", ["vite", "--port", String(devPort), "--host"], {
      cwd: dashboardDir,
      stdio: "pipe",
      env: {
        ...process.env,
        // Always mock mode in dev server — real HA connection is in production build only
        VITE_HA_URL: "",
        VITE_HA_TOKEN: "",
      },
    });

    process_.stdout.on("data", (data) => {
      const line = data.toString().trim();
      if (line) console.log(`[vite] ${line}`);
    });

    process_.stderr.on("data", (data) => {
      const line = data.toString().trim();
      if (line) {
        console.warn(`[vite:err] ${line}`);
        // Capture error lines for getErrors()
        errorLines.push(line);
        if (errorLines.length > MAX_ERROR_LINES) {
          errorLines.shift();
        }
      }
    });

    process_.on("close", (code) => {
      console.log(`[vite] Dev server exited with code ${code}`);
      running = false;
      process_ = null;
    });

    process_.on("error", (err) => {
      console.error(`[vite] Failed to start: ${err.message}`);
      running = false;
      process_ = null;
    });

    // Wait for Vite to be ready (poll the port)
    // Pi can take a while — allow up to 60 seconds
    try {
      await waitForPort(devPort, 60000);
    } catch (err) {
      // Timeout — kill the spawned process so it doesn't linger
      console.error(`[vite] ${err.message} — killing spawned process`);
      if (process_) {
        process_.kill("SIGTERM");
        process_ = null;
      }
      throw err;
    }
    running = true;
    console.log(`[vite] Dev server ready on port ${devPort}`);
  }

  function stop() {
    if (!process_) return;

    console.log("[vite] Stopping dev server...");
    process_.kill("SIGTERM");

    // Force kill after 5 seconds
    const forceKill = setTimeout(() => {
      if (process_) {
        process_.kill("SIGKILL");
      }
    }, 5000);

    process_.on("close", () => {
      clearTimeout(forceKill);
    });

    running = false;
    process_ = null;
  }

  function isRunning() {
    return running;
  }

  /**
   * Return recent error/warning lines from the Vite dev server stderr.
   * Useful for the AI to diagnose build or HMR errors.
   */
  function getErrors() {
    return [...errorLines];
  }

  /**
   * Clear captured error lines (e.g. after the AI has read them).
   */
  function clearErrors() {
    errorLines = [];
  }

  return { start, stop, isRunning, getErrors, clearErrors };
}

/**
 * Wait for a port to become available (Vite dev server startup).
 */
function waitForPort(port, timeoutMs = 15000) {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      if (Date.now() - start > timeoutMs) {
        return reject(new Error(`Timeout waiting for port ${port}`));
      }

      import("net")
        .then(({ default: net }) => {
          const socket = new net.Socket();
          socket.setTimeout(500);

          socket.on("connect", () => {
            socket.destroy();
            resolve();
          });

          socket.on("timeout", () => {
            socket.destroy();
            setTimeout(check, 500);
          });

          socket.on("error", () => {
            socket.destroy();
            setTimeout(check, 500);
          });

          socket.connect(port, "127.0.0.1");
        })
        .catch(() => setTimeout(check, 500));
    };

    check();
  });
}
