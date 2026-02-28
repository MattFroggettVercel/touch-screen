/**
 * ServiceManager — orchestration layer extracted from dev.mjs
 *
 * Manages spawning, syncing, and lifecycle of all dev services.
 * Each service writes to a per-service circular log buffer that the
 * ink TUI reads from.
 */

import { spawn, spawnSync } from "child_process";
import { watch, existsSync } from "fs";
import { networkInterfaces } from "os";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { EventEmitter } from "events";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PI_HOST = process.env.PI_HOST || "pi@touchscreen";
const PI_SERVER_DIR = "/opt/touchscreen/server";
const PI_DASHBOARD_DIR = "/opt/touchscreen/dashboard";
const PI_CONFIG_PATH = "/opt/touchscreen/config.json";

// ---------------------------------------------------------------------------
// Service definitions
// ---------------------------------------------------------------------------

/** @type {Array<{id: string, label: string, color: string}>} */
const SERVICE_DEFS = [
  { id: "api", label: "API", color: "cyan" },
  { id: "expo", label: "Expo", color: "magenta" },
  { id: "pi", label: "Pi Agent", color: "yellow" },
  { id: "vite", label: "Vite", color: "yellow" },
  { id: "sync", label: "Sync", color: "green" },
];

// ---------------------------------------------------------------------------
// Helpers (same as original dev.mjs)
// ---------------------------------------------------------------------------

function detectLanIP() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.internal) continue;
      if (net.family !== "IPv4") continue;
      return net.address;
    }
  }
  return "localhost";
}

function run(cmd, opts = {}) {
  const result = spawnSync("bash", ["-c", cmd], {
    stdio: opts.silent ? "pipe" : "pipe",
    timeout: opts.timeout || 30000,
  });
  return result.status === 0;
}

function runCapture(cmd, opts = {}) {
  const result = spawnSync("bash", ["-c", cmd], {
    stdio: ["pipe", "pipe", "pipe"],
    timeout: opts.timeout || 30000,
  });
  if (result.status !== 0) return null;
  return result.stdout?.toString().trim() || "";
}

// ---------------------------------------------------------------------------
// ServiceManager
// ---------------------------------------------------------------------------

const MAX_LOG_LINES = 500;

export { SERVICE_DEFS, PI_HOST };

export class ServiceManager extends EventEmitter {
  constructor() {
    super();
    /** Per-service log buffers */
    this.logs = {};
    for (const s of SERVICE_DEFS) {
      this.logs[s.id] = [];
    }

    /** Spawned child processes */
    this.children = [];

    /** Resolved IPs */
    this.lanIP = null;
    this.piIP = null;

    /** State */
    this.shuttingDown = false;
    this.piAgentReady = null; // Promise<boolean>

    /** File watcher handles */
    this._watchers = [];
    this._agentTimer = null;
    this._dashboardTimer = null;
  }

  // -------------------------------------------------------------------------
  // Logging into per-service buffers
  // -------------------------------------------------------------------------

  /** Push a log line to a service buffer and emit an event */
  _log(serviceId, line) {
    const buf = this.logs[serviceId];
    if (!buf) return;
    const lines = line.split("\n").filter((l) => l.trim());
    for (const l of lines) {
      buf.push(l);
      if (buf.length > MAX_LOG_LINES) buf.shift();
    }
    this.emit("log", serviceId);
  }

  /** Get lines for a service */
  getLog(serviceId) {
    return this.logs[serviceId] || [];
  }

  /** Clear a service's log buffer */
  clearLog(serviceId) {
    if (this.logs[serviceId]) {
      this.logs[serviceId] = [];
      this.emit("log", serviceId);
    }
  }

  // -------------------------------------------------------------------------
  // Pre-flight
  // -------------------------------------------------------------------------

  preflight() {
    this._log("sync", "Running pre-flight checks...");

    // SSH
    this._log("sync", `  Checking SSH to ${PI_HOST}...`);
    if (
      !run(
        `ssh -o ConnectTimeout=5 -o BatchMode=yes ${PI_HOST} "echo ok"`,
        { silent: true }
      )
    ) {
      this._log("sync", `ERROR: Cannot SSH to ${PI_HOST}`);
      this._log("sync", "  1. Is the Pi on the network?");
      this._log("sync", `  2. SSH key installed? (ssh-copy-id ${PI_HOST})`);
      this._log("sync", '  3. Hostname resolves? (PI_HOST=pi@<ip>)');
      throw new Error(`Cannot SSH to ${PI_HOST}`);
    }
    this._log("sync", "  SSH OK");

    // vercel CLI
    if (!runCapture("which vercel", { silent: true })) {
      throw new Error("vercel CLI not found. Install with: npm i -g vercel");
    }
    this._log("sync", "  vercel CLI OK");

    // npx
    if (!runCapture("which npx", { silent: true })) {
      throw new Error("npx not found. Ensure Node.js is installed.");
    }
    this._log("sync", "  npx OK");

    // Home Assistant connectivity
    this._log("sync", "  Checking HA connectivity from Pi...");
    const haConfig = runCapture(
      `ssh -o ConnectTimeout=5 ${PI_HOST} "cat ${PI_CONFIG_PATH} 2>/dev/null"`,
      { silent: true }
    );

    if (haConfig) {
      try {
        const { haUrl, haToken } = JSON.parse(haConfig);
        if (haUrl && haToken) {
          const haCheck = runCapture(
            `ssh ${PI_HOST} "curl -sf -o /dev/null -w '%{http_code}' -H 'Authorization: Bearer ${haToken}' '${haUrl}/api/' 2>/dev/null"`,
            { silent: true, timeout: 15000 }
          );
          if (haCheck === "200") {
            const entityCount = runCapture(
              `ssh ${PI_HOST} "curl -sf -H 'Authorization: Bearer ${haToken}' '${haUrl}/api/states' 2>/dev/null | node -e \\"process.stdin.setEncoding('utf8');let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).length)}catch{console.log('?')}})\\" "`,
              { silent: true, timeout: 15000 }
            );
            this._log("sync", `  HA reachable at ${haUrl} (${entityCount || "?"} entities)`);
            this.emit("ha", true);
          } else {
            this._log("sync", `  HA not reachable from Pi at ${haUrl} (HTTP ${haCheck || "timeout"})`);
            this._log("sync", "  Continuing anyway — HA is optional for dev");
          }
        } else {
          this._log("sync", "  HA not configured on Pi — skipping");
        }
      } catch {
        this._log("sync", "  Could not parse Pi config — skipping HA check");
      }
    } else {
      this._log("sync", "  Could not read Pi config — skipping HA check");
    }

    this._log("sync", "Pre-flight checks passed.");
  }

  // -------------------------------------------------------------------------
  // Detect IPs
  // -------------------------------------------------------------------------

  detectIPs() {
    this.lanIP = detectLanIP();
    this._log("sync", `Detected LAN IP: ${this.lanIP}`);

    this.piIP =
      runCapture(
        `ssh -o ConnectTimeout=5 ${PI_HOST} "hostname -I | awk '{print \\$1}'"`,
        { silent: true }
      ) || PI_HOST.split("@")[1];
    this._log("sync", `Pi address: ${this.piIP}`);
  }

  // -------------------------------------------------------------------------
  // Initial sync
  // -------------------------------------------------------------------------

  initialSync() {
    this._log("sync", "Syncing code to Pi...");

    // device-agent
    this._log("sync", `Syncing device-agent/ → ${PI_HOST}:${PI_SERVER_DIR}`);
    if (
      !run(
        `rsync -az --delete ` +
          `--exclude node_modules --exclude .git --exclude '*.log' --exclude config.json ` +
          `"${resolve(ROOT, "device-agent")}/" "${PI_HOST}:${PI_SERVER_DIR}/"`
      )
    ) {
      throw new Error("Failed to rsync device-agent");
    }

    // sandbox-template
    this._log("sync", `Syncing sandbox-template/ → ${PI_HOST}:${PI_DASHBOARD_DIR}`);
    if (
      !run(
        `rsync -az --delete ` +
          `--exclude node_modules --exclude .git --exclude dist --exclude '*.log' ` +
          `"${resolve(ROOT, "sandbox-template")}/" "${PI_HOST}:${PI_DASHBOARD_DIR}/"`
      )
    ) {
      throw new Error("Failed to rsync sandbox-template");
    }

    // Check deps
    this._log("sync", "Checking Pi dependencies...");

    if (!run(`ssh ${PI_HOST} "test -d ${PI_SERVER_DIR}/node_modules"`, { silent: true })) {
      this._log("sync", "Installing server dependencies on Pi...");
      run(`ssh ${PI_HOST} "cd ${PI_SERVER_DIR} && npm install --production --loglevel error"`);
    } else {
      this._log("sync", "Server node_modules OK");
    }

    if (!run(`ssh ${PI_HOST} "test -d ${PI_DASHBOARD_DIR}/node_modules"`, { silent: true })) {
      this._log("sync", "Installing dashboard dependencies on Pi...");
      run(`ssh ${PI_HOST} "cd ${PI_DASHBOARD_DIR} && npm install --loglevel error"`);
    } else {
      this._log("sync", "Dashboard node_modules OK");
    }

    this._log("sync", "Initial sync complete.");
  }

  // -------------------------------------------------------------------------
  // Spawn helpers
  // -------------------------------------------------------------------------

  _spawnService(serviceId, command, args, opts = {}) {
    const child = spawn(command, args, {
      cwd: opts.cwd || ROOT,
      env: { ...process.env, ...opts.env, FORCE_COLOR: "1" },
      stdio: ["ignore", "pipe", "pipe"],
      shell: opts.shell || false,
    });

    child.stdout.on("data", (data) => this._log(serviceId, data.toString()));
    child.stderr.on("data", (data) => this._log(serviceId, data.toString()));

    child.on("error", (err) => {
      this._log(serviceId, `Failed to start: ${err.message}`);
    });

    child.on("close", (code) => {
      if (!this.shuttingDown) {
        this._log(serviceId, `Process exited with code ${code}`);
      }
    });

    this.children.push({ id: serviceId, child });
    return child;
  }

  // -------------------------------------------------------------------------
  // Start individual services
  // -------------------------------------------------------------------------

  startAPI() {
    this._log("api", "Starting vercel dev...");
    this._spawnService("api", "vercel", ["dev"], {
      cwd: resolve(ROOT, "app"),
    });
  }

  startExpo() {
    this._log("expo", "Starting Expo...");
    this._spawnService("expo", "npx", ["expo", "start"], {
      cwd: resolve(ROOT, "mobile-new"),
      env: {
        EXPO_PUBLIC_API_URL: `http://${this.lanIP}:3000`,
      },
    });
  }

  startPiAgent() {
    this._log("pi", "Starting device-agent on Pi (SSH)...");

    const remoteCmd = [
      "sudo systemctl stop touchscreen-server 2>/dev/null || true",
      "sudo chown -R pi:pi /opt/touchscreen",
      `cd ${PI_SERVER_DIR}`,
      `DEVICE_CONFIG=${PI_CONFIG_PATH} node --watch src/index.js`,
    ].join(" && ");

    const child = this._spawnService("pi", "ssh", ["-tt", PI_HOST, remoteCmd]);

    // Wait for the NEW agent to log it's listening
    this.piAgentReady = new Promise((resolve) => {
      const timeout = setTimeout(() => {
        child.stdout.removeListener("data", onData);
        this._log("pi", "WARNING: Pi agent did not start within 90 seconds");
        resolve(false);
      }, 90000);

      const onData = (data) => {
        const text = data.toString();
        if (text.includes("server running") || text.includes("Server listening")) {
          child.stdout.removeListener("data", onData);
          clearTimeout(timeout);
          resolve(true);
        }
      };
      child.stdout.on("data", onData);
    });
  }

  async autoStartVite() {
    if (!this.piIP) return;

    const agentUrl = `http://${this.piIP}:3001`;

    try {
      const check = await fetch(`${agentUrl}/api/status`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!check.ok) {
        this._log("vite", "Pi agent health check failed — skipping Vite auto-start");
        return;
      }
    } catch {
      this._log("vite", "Pi agent not reachable — skipping Vite auto-start");
      return;
    }

    this._log("vite", "Pi agent is ready. Starting Vite dev server...");

    try {
      const res = await fetch(`${agentUrl}/api/dev/start`, {
        method: "POST",
        signal: AbortSignal.timeout(90000),
      });
      const data = await res.json();
      if (data.success) {
        this._log("vite", `Vite dev server started on port ${data.port}`);
      } else {
        this._log("vite", `Failed to start Vite: ${data.error || "unknown error"}`);
      }
    } catch (err) {
      this._log("vite", `Failed to start Vite dev server: ${err.message}`);
    }
  }

  startFileWatcher() {
    this._log("sync", "Starting file watcher...");
    const DEBOUNCE_MS = 500;

    const syncAgent = () => {
      this._log("sync", "Change in device-agent/ → syncing to Pi...");
      const result = spawnSync("bash", [
        "-c",
        `rsync -az --delete ` +
          `--exclude node_modules --exclude .git --exclude '*.log' --exclude config.json ` +
          `"${resolve(ROOT, "device-agent")}/" "${PI_HOST}:${PI_SERVER_DIR}/"`,
      ], { stdio: "pipe" });

      if (result.status === 0) {
        this._log("sync", "device-agent synced (node --watch will restart)");
      } else {
        this._log("sync", "rsync failed for device-agent");
      }
    };

    const syncDashboard = () => {
      this._log("sync", "Change in sandbox-template/ → syncing to Pi...");
      const result = spawnSync("bash", [
        "-c",
        `rsync -az --delete ` +
          `--exclude node_modules --exclude .git --exclude dist --exclude '*.log' ` +
          `"${resolve(ROOT, "sandbox-template")}/" "${PI_HOST}:${PI_DASHBOARD_DIR}/"`,
      ], { stdio: "pipe" });

      if (result.status === 0) {
        this._log("sync", "sandbox-template synced (Vite HMR will refresh)");
      } else {
        this._log("sync", "rsync failed for sandbox-template");
      }
    };

    // Watch device-agent/
    const agentDir = resolve(ROOT, "device-agent");
    try {
      const w = watch(agentDir, { recursive: true }, (_ev, filename) => {
        if (!filename) return;
        if (filename.includes("node_modules") || filename.includes(".git") || filename.endsWith(".log")) return;
        if (this._agentTimer) clearTimeout(this._agentTimer);
        this._agentTimer = setTimeout(syncAgent, DEBOUNCE_MS);
      });
      this._watchers.push(w);
      this._log("sync", "Watching device-agent/ for changes");
    } catch (err) {
      this._log("sync", `Failed to watch device-agent/: ${err.message}`);
    }

    // Watch sandbox-template/
    const dashboardDir = resolve(ROOT, "sandbox-template");
    try {
      const w = watch(dashboardDir, { recursive: true }, (_ev, filename) => {
        if (!filename) return;
        if (filename.includes("node_modules") || filename.includes(".git") || filename.includes("dist") || filename.endsWith(".log")) return;
        if (this._dashboardTimer) clearTimeout(this._dashboardTimer);
        this._dashboardTimer = setTimeout(syncDashboard, DEBOUNCE_MS);
      });
      this._watchers.push(w);
      this._log("sync", "Watching sandbox-template/ for changes");
    } catch (err) {
      this._log("sync", `Failed to watch sandbox-template/: ${err.message}`);
    }
  }

  // -------------------------------------------------------------------------
  // Start everything
  // -------------------------------------------------------------------------

  async startAll() {
    this.startPiAgent();
    this.startAPI();
    this.startExpo();
    this.startFileWatcher();

    // Wait for the NEW Pi agent, then start Vite
    const ready = await this.piAgentReady;
    if (ready) {
      await this.autoStartVite();
    } else {
      this._log("vite", "Skipping Vite auto-start — Pi agent not ready");
    }
  }

  // -------------------------------------------------------------------------
  // Hotkey actions
  // -------------------------------------------------------------------------

  /** Force rsync both directories to Pi */
  forceSync() {
    this._log("sync", "Force sync triggered...");

    this._log("sync", `Syncing device-agent/ → ${PI_HOST}:${PI_SERVER_DIR}`);
    const r1 = spawnSync("bash", [
      "-c",
      `rsync -az --delete ` +
        `--exclude node_modules --exclude .git --exclude '*.log' --exclude config.json ` +
        `"${resolve(ROOT, "device-agent")}/" "${PI_HOST}:${PI_SERVER_DIR}/"`,
    ], { stdio: "pipe" });
    this._log("sync", r1.status === 0 ? "device-agent synced" : "rsync failed for device-agent");

    this._log("sync", `Syncing sandbox-template/ → ${PI_HOST}:${PI_DASHBOARD_DIR}`);
    const r2 = spawnSync("bash", [
      "-c",
      `rsync -az --delete ` +
        `--exclude node_modules --exclude .git --exclude dist --exclude '*.log' ` +
        `"${resolve(ROOT, "sandbox-template")}/" "${PI_HOST}:${PI_DASHBOARD_DIR}/"`,
    ], { stdio: "pipe" });
    this._log("sync", r2.status === 0 ? "sandbox-template synced" : "rsync failed for sandbox-template");
  }

  /** Restart Pi agent: kill SSH, re-sync, spawn again */
  async restartPiAgent() {
    this._log("pi", "Restarting Pi agent...");

    // Kill current SSH child
    const idx = this.children.findIndex((c) => c.id === "pi");
    if (idx !== -1) {
      try {
        this.children[idx].child.kill("SIGTERM");
      } catch {}
      this.children.splice(idx, 1);
    }

    // Re-sync
    this._log("sync", "Re-syncing device-agent before restart...");
    run(
      `rsync -az --delete ` +
        `--exclude node_modules --exclude .git --exclude '*.log' --exclude config.json ` +
        `"${resolve(ROOT, "device-agent")}/" "${PI_HOST}:${PI_SERVER_DIR}/"`
    );

    // Restart
    this.startPiAgent();

    const ready = await this.piAgentReady;
    if (ready) {
      await this.autoStartVite();
    }
  }

  /** Open the Vite dev server in Chrome on macOS */
  openViteInBrowser() {
    if (!this.piIP) {
      this._log("vite", "Cannot open browser — Pi IP not detected");
      return;
    }
    const url = `http://${this.piIP}:5173`;
    this._log("vite", `Opening ${url} in Chrome...`);
    spawn("open", ["-a", "Google Chrome", url], { stdio: "ignore", detached: true }).unref();
  }

  /** Restart Vite via the Pi agent API */
  async restartVite() {
    if (!this.piIP) return;
    this._log("vite", "Restarting Vite...");

    const agentUrl = `http://${this.piIP}:3001`;
    try {
      // Stop first
      await fetch(`${agentUrl}/api/dev/stop`, {
        method: "POST",
        signal: AbortSignal.timeout(10000),
      }).catch(() => {});

      // Then start
      await this.autoStartVite();
    } catch (err) {
      this._log("vite", `Failed to restart Vite: ${err.message}`);
    }
  }

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------

  cleanup() {
    if (this.shuttingDown) return;
    this.shuttingDown = true;

    // Close file watchers
    for (const w of this._watchers) {
      try { w.close(); } catch {}
    }

    // Kill all children
    for (const { child } of this.children) {
      try {
        child.kill("SIGTERM");
      } catch {}
    }

    // Restart systemd service
    run(
      `ssh -o ConnectTimeout=5 ${PI_HOST} "sudo systemctl start touchscreen-server 2>/dev/null || true"`,
      { silent: true, timeout: 10000 }
    );
  }
}
