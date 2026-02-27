/**
 * Build Manager
 *
 * Handles npm install + Vite build for the dashboard project.
 * Used when the user finishes editing and wants to "save" the
 * current state as the production dashboard.
 */

import { execSync } from "child_process";

export function createBuildManager({ dashboardDir }) {
  function install() {
    console.log("[build] Installing dependencies...");
    execSync("npm install --loglevel error", {
      cwd: dashboardDir,
      stdio: "pipe",
      timeout: 120000,
    });
    console.log("[build] Dependencies installed");
  }

  function build(haUrl = "", haToken = "") {
    console.log("[build] Building dashboard...");
    execSync("npm run build", {
      cwd: dashboardDir,
      stdio: "pipe",
      timeout: 120000,
      env: {
        ...process.env,
        // Pass HA credentials so the production build connects to real HA
        VITE_HA_URL: haUrl,
        VITE_HA_TOKEN: haToken,
      },
    });
    console.log("[build] Build complete");
  }

  function installAndBuild(haUrl = "", haToken = "") {
    install();
    build(haUrl, haToken);
  }

  /**
   * Install a specific npm package (e.g. "react-icons" or "framer-motion@11").
   */
  function installPackage(packageName) {
    console.log(`[build] Installing package: ${packageName}...`);
    execSync(`npm install ${packageName} --loglevel error`, {
      cwd: dashboardDir,
      stdio: "pipe",
      timeout: 60000,
    });
    console.log(`[build] Package installed: ${packageName}`);
  }

  return { install, build, installAndBuild, installPackage };
}
