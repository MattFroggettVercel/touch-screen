#!/usr/bin/env node

/**
 * TouchScreen Dev Orchestrator
 *
 * Single command to start the entire development environment:
 *   - vercel dev       (Next.js API, port 3000)
 *   - expo start       (mobile app, Expo Go on phone)
 *   - SSH agent        (device-agent on Pi with --watch)
 *   - file watcher     (auto-rsync to Pi on change)
 *
 * Usage:
 *   npm run dev                            # defaults to pi@touchscreen
 *   PI_HOST=pi@192.168.1.50 npm run dev    # custom Pi host
 *
 * Zero npm dependencies — uses only Node.js built-ins.
 */

import { spawn, execSync, spawnSync } from "child_process";
import { watch, existsSync } from "fs";
import { networkInterfaces } from "os";
import { resolve, dirname, relative } from "path";
import { fileURLToPath } from "url";

// ---------------------------------------------------------------------------
// Paths & config
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const PI_HOST = process.env.PI_HOST || "pi@touchscreen";
const PI_SERVER_DIR = "/opt/touchscreen/server";
const PI_DASHBOARD_DIR = "/opt/touchscreen/dashboard";
const PI_CONFIG_PATH = "/opt/touchscreen/config.json";

// ---------------------------------------------------------------------------
// ANSI helpers
// ---------------------------------------------------------------------------

const COLORS = {
  api: "\x1b[36m",    // cyan
  expo: "\x1b[35m",   // magenta
  pi: "\x1b[33m",     // yellow
  sync: "\x1b[32m",   // green
  dev: "\x1b[34m",    // blue
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
};

function log(label, color, msg) {
  const prefix = `${color}[${label}]${COLORS.reset}`;
  for (const line of msg.split("\n")) {
    if (line.trim()) console.log(`${prefix} ${line}`);
  }
}

function logDev(msg) {
  log("dev", COLORS.dev, msg);
}

function logError(msg) {
  log("dev", COLORS.red, msg);
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/** Detect the Mac's LAN IP address (first non-internal IPv4). */
function detectLanIP() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip internal, IPv6, and loopback
      if (net.internal) continue;
      if (net.family !== "IPv4") continue;
      return net.address;
    }
  }
  return "localhost";
}

/** Run a shell command synchronously, return true if it succeeds. */
function run(cmd, opts = {}) {
  const result = spawnSync("bash", ["-c", cmd], {
    stdio: opts.silent ? "pipe" : "inherit",
    timeout: opts.timeout || 30000,
  });
  return result.status === 0;
}

/** Run a shell command synchronously, return stdout. */
function runCapture(cmd, opts = {}) {
  const result = spawnSync("bash", ["-c", cmd], {
    stdio: ["pipe", "pipe", "pipe"],
    timeout: opts.timeout || 30000,
  });
  if (result.status !== 0) return null;
  return result.stdout?.toString().trim() || "";
}

// ---------------------------------------------------------------------------
// Pre-flight checks
// ---------------------------------------------------------------------------

function preflight() {
  logDev("Running pre-flight checks...");

  // Check SSH
  logDev(`  Checking SSH to ${PI_HOST}...`);
  if (!run(`ssh -o ConnectTimeout=5 -o BatchMode=yes ${PI_HOST} "echo ok"`, { silent: true })) {
    logError(`Cannot SSH to ${PI_HOST}`);
    logError("Make sure:");
    logError("  1. The Pi is on the network");
    logError("  2. SSH key is installed (ssh-copy-id " + PI_HOST + ")");
    logError('  3. Hostname resolves (or use PI_HOST=pi@<ip> npm run dev)');
    process.exit(1);
  }
  logDev("  SSH OK");

  // Check vercel CLI
  const vercelPath = runCapture("which vercel", { silent: true });
  if (!vercelPath) {
    logError("vercel CLI not found. Install with: npm i -g vercel");
    process.exit(1);
  }
  logDev("  vercel CLI OK");

  // Check expo CLI (via npx)
  const expoPath = runCapture("which npx", { silent: true });
  if (!expoPath) {
    logError("npx not found. Ensure Node.js is installed.");
    process.exit(1);
  }
  logDev("  npx OK");

  // Check Home Assistant connectivity from the Pi
  logDev("  Checking HA connectivity from Pi...");
  const haConfig = runCapture(
    `ssh -o ConnectTimeout=5 ${PI_HOST} "cat ${PI_CONFIG_PATH} 2>/dev/null"`,
    { silent: true }
  );

  if (haConfig) {
    try {
      const { haUrl, haToken } = JSON.parse(haConfig);
      if (haUrl && haToken) {
        // Ask the Pi to curl the HA API — the Pi must be able to reach HA
        const haCheck = runCapture(
          `ssh ${PI_HOST} "curl -sf -o /dev/null -w '%{http_code}' -H 'Authorization: Bearer ${haToken}' '${haUrl}/api/' 2>/dev/null"`,
          { silent: true, timeout: 15000 }
        );
        if (haCheck === "200") {
          // Count entities
          const entityCount = runCapture(
            `ssh ${PI_HOST} "curl -sf -H 'Authorization: Bearer ${haToken}' '${haUrl}/api/states' 2>/dev/null | node -e \\"process.stdin.setEncoding('utf8');let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).length)}catch{console.log('?')}})\\" "`,
            { silent: true, timeout: 15000 }
          );
          logDev(`  HA reachable at ${haUrl} (${entityCount || "?"} entities)`);
        } else {
          logError(`  HA not reachable from Pi at ${haUrl} (HTTP ${haCheck || "timeout"})`);
          logError("  Check haUrl and haToken in " + PI_CONFIG_PATH);
          logError("  Continuing anyway — HA is optional for dev");
        }
      } else {
        logDev("  HA not configured on Pi (haUrl/haToken empty) — skipping HA check");
      }
    } catch {
      logDev("  Could not parse Pi config — skipping HA check");
    }
  } else {
    logDev("  Could not read Pi config — skipping HA check");
  }

  logDev("Pre-flight checks passed.\n");
}

// ---------------------------------------------------------------------------
// Initial sync to Pi
// ---------------------------------------------------------------------------

function initialSync() {
  logDev("Syncing code to Pi...");

  // Sync device-agent
  log("sync", COLORS.sync, "Syncing device-agent/ → " + PI_HOST + ":" + PI_SERVER_DIR);
  if (!run(
    `rsync -az --delete ` +
    `--exclude node_modules --exclude .git --exclude '*.log' --exclude config.json ` +
    `"${resolve(ROOT, "device-agent")}/" "${PI_HOST}:${PI_SERVER_DIR}/"`
  )) {
    logError("Failed to rsync device-agent");
    process.exit(1);
  }

  // Sync sandbox-template
  log("sync", COLORS.sync, "Syncing sandbox-template/ → " + PI_HOST + ":" + PI_DASHBOARD_DIR);
  if (!run(
    `rsync -az --delete ` +
    `--exclude node_modules --exclude .git --exclude dist --exclude '*.log' ` +
    `"${resolve(ROOT, "sandbox-template")}/" "${PI_HOST}:${PI_DASHBOARD_DIR}/"`
  )) {
    logError("Failed to rsync sandbox-template");
    process.exit(1);
  }

  // Check if node_modules exist on Pi, install if missing
  log("sync", COLORS.sync, "Checking Pi dependencies...");

  const serverModulesExist = run(
    `ssh ${PI_HOST} "test -d ${PI_SERVER_DIR}/node_modules"`,
    { silent: true }
  );
  if (!serverModulesExist) {
    log("sync", COLORS.sync, "Installing server dependencies on Pi...");
    run(`ssh ${PI_HOST} "cd ${PI_SERVER_DIR} && npm install --production --loglevel error"`);
  } else {
    log("sync", COLORS.sync, "Server node_modules OK (skip install)");
  }

  const dashboardModulesExist = run(
    `ssh ${PI_HOST} "test -d ${PI_DASHBOARD_DIR}/node_modules"`,
    { silent: true }
  );
  if (!dashboardModulesExist) {
    log("sync", COLORS.sync, "Installing dashboard dependencies on Pi...");
    run(`ssh ${PI_HOST} "cd ${PI_DASHBOARD_DIR} && npm install --loglevel error"`);
  } else {
    log("sync", COLORS.sync, "Dashboard node_modules OK (skip install)");
  }

  logDev("Initial sync complete.\n");
}

// ---------------------------------------------------------------------------
// Process management
// ---------------------------------------------------------------------------

/** All spawned child processes — killed on cleanup. */
const children = [];

/**
 * Spawn a labeled child process with color-coded output piping.
 */
function spawnLabeled(label, color, command, args, opts = {}) {
  const child = spawn(command, args, {
    cwd: opts.cwd || ROOT,
    env: { ...process.env, ...opts.env, FORCE_COLOR: "1" },
    stdio: ["ignore", "pipe", "pipe"],
    shell: opts.shell || false,
  });

  child.stdout.on("data", (data) => log(label, color, data.toString()));
  child.stderr.on("data", (data) => log(label, color, data.toString()));

  child.on("error", (err) => {
    logError(`[${label}] Failed to start: ${err.message}`);
  });

  child.on("close", (code) => {
    if (!shuttingDown) {
      log(label, color, `Process exited with code ${code}`);
    }
  });

  children.push(child);
  return child;
}

// ---------------------------------------------------------------------------
// Start vercel dev (Next.js API)
// ---------------------------------------------------------------------------

function startAPI() {
  logDev("Starting vercel dev...");
  return spawnLabeled("api", COLORS.api, "vercel", ["dev"], {
    cwd: resolve(ROOT, "app"),
  });
}

// ---------------------------------------------------------------------------
// Start Expo (mobile app)
// ---------------------------------------------------------------------------

function startExpo(lanIP) {
  logDev("Starting Expo...");
  return spawnLabeled("expo", COLORS.expo, "npx", ["expo", "start"], {
    cwd: resolve(ROOT, "mobile-new"),
    env: {
      EXPO_PUBLIC_API_URL: `http://${lanIP}:3000`,
    },
  });
}

// ---------------------------------------------------------------------------
// Start device-agent on Pi via SSH
// ---------------------------------------------------------------------------

function startPiAgent() {
  logDev("Starting device-agent on Pi (SSH)...");

  // Stop the systemd service first, fix ownership (systemd runs as root),
  // then run in dev mode with --watch as user pi
  const remoteCmd = [
    "sudo systemctl stop touchscreen-server 2>/dev/null || true",
    "sudo chown -R pi:pi /opt/touchscreen",
    `cd ${PI_SERVER_DIR}`,
    `DEVICE_CONFIG=${PI_CONFIG_PATH} node --watch src/index.js`,
  ].join(" && ");

  // Use -tt to force pseudo-terminal allocation so the remote process dies
  // when the SSH connection drops
  return spawnLabeled("pi", COLORS.pi, "ssh", ["-tt", PI_HOST, remoteCmd]);
}

// ---------------------------------------------------------------------------
// Auto-start Vite dev server on Pi
// ---------------------------------------------------------------------------

/**
 * Wait for the Pi agent to be ready, then start the Vite dev server.
 * Polls GET /api/status until the agent responds, then sends POST /api/dev/start.
 */
async function autoStartVite(piIP) {
  const agentUrl = `http://${piIP}:3001`;
  const POLL_INTERVAL = 2000;
  const MAX_WAIT = 60000;
  const start = Date.now();

  logDev("Waiting for Pi agent to be ready...");

  // Poll until the agent is up
  while (Date.now() - start < MAX_WAIT) {
    try {
      const res = await fetch(`${agentUrl}/api/status`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) break;
    } catch {
      // Not ready yet
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }

  // Verify it's actually up
  try {
    const check = await fetch(`${agentUrl}/api/status`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!check.ok) {
      logError("Pi agent did not become ready in time — skipping Vite auto-start");
      return;
    }
  } catch {
    logError("Pi agent did not become ready in time — skipping Vite auto-start");
    return;
  }

  logDev("Pi agent is ready. Starting Vite dev server...");

  try {
    const res = await fetch(`${agentUrl}/api/dev/start`, {
      method: "POST",
      signal: AbortSignal.timeout(90000),
    });
    const data = await res.json();
    if (data.success) {
      log("pi", COLORS.pi, `Vite dev server started on port ${data.port}`);
    } else {
      logError(`Failed to start Vite: ${data.error || "unknown error"}`);
    }
  } catch (err) {
    logError(`Failed to start Vite dev server: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// File watcher → rsync to Pi
// ---------------------------------------------------------------------------

function startFileWatcher() {
  logDev("Starting file watcher for device-agent/ and sandbox-template/...");

  // Debounce timers — one per watched directory
  let agentTimer = null;
  let dashboardTimer = null;
  const DEBOUNCE_MS = 500;

  function syncAgent() {
    log("sync", COLORS.sync, "Change in device-agent/ → syncing to Pi...");
    const result = spawnSync("bash", ["-c",
      `rsync -az --delete ` +
      `--exclude node_modules --exclude .git --exclude '*.log' --exclude config.json ` +
      `"${resolve(ROOT, "device-agent")}/" "${PI_HOST}:${PI_SERVER_DIR}/"`
    ], { stdio: "pipe" });

    if (result.status === 0) {
      log("sync", COLORS.sync, "device-agent synced (node --watch will restart)");
    } else {
      log("sync", COLORS.red, "rsync failed for device-agent");
    }
  }

  function syncDashboard() {
    log("sync", COLORS.sync, "Change in sandbox-template/ → syncing to Pi...");
    const result = spawnSync("bash", ["-c",
      `rsync -az --delete ` +
      `--exclude node_modules --exclude .git --exclude dist --exclude '*.log' ` +
      `"${resolve(ROOT, "sandbox-template")}/" "${PI_HOST}:${PI_DASHBOARD_DIR}/"`
    ], { stdio: "pipe" });

    if (result.status === 0) {
      log("sync", COLORS.sync, "sandbox-template synced (Vite HMR will refresh)");
    } else {
      log("sync", COLORS.red, "rsync failed for sandbox-template");
    }
  }

  // Watch device-agent/
  const agentDir = resolve(ROOT, "device-agent");
  try {
    watch(agentDir, { recursive: true }, (eventType, filename) => {
      if (!filename) return;
      // Ignore node_modules, .git, logs
      if (filename.includes("node_modules") || filename.includes(".git") || filename.endsWith(".log")) return;
      if (agentTimer) clearTimeout(agentTimer);
      agentTimer = setTimeout(syncAgent, DEBOUNCE_MS);
    });
    log("sync", COLORS.sync, "Watching device-agent/ for changes");
  } catch (err) {
    logError(`Failed to watch device-agent/: ${err.message}`);
  }

  // Watch sandbox-template/
  const dashboardDir = resolve(ROOT, "sandbox-template");
  try {
    watch(dashboardDir, { recursive: true }, (eventType, filename) => {
      if (!filename) return;
      // Ignore node_modules, .git, dist, logs
      if (filename.includes("node_modules") || filename.includes(".git") || filename.includes("dist") || filename.endsWith(".log")) return;
      if (dashboardTimer) clearTimeout(dashboardTimer);
      dashboardTimer = setTimeout(syncDashboard, DEBOUNCE_MS);
    });
    log("sync", COLORS.sync, "Watching sandbox-template/ for changes");
  } catch (err) {
    logError(`Failed to watch sandbox-template/: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

let shuttingDown = false;

function cleanup() {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(""); // newline after ^C
  logDev("Shutting down...");

  // Kill all child processes
  for (const child of children) {
    try {
      child.kill("SIGTERM");
    } catch {
      // already dead
    }
  }

  // Restart the systemd service on Pi so it returns to production mode
  logDev("Restarting touchscreen-server service on Pi...");
  run(
    `ssh -o ConnectTimeout=5 ${PI_HOST} "sudo systemctl start touchscreen-server 2>/dev/null || true"`,
    { silent: true, timeout: 10000 }
  );

  logDev("Done. Goodbye!");
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("");
  console.log(`${COLORS.bold}${COLORS.dev}╔════════════════════════════════════════╗${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.dev}║   TouchScreen Dev Environment          ║${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.dev}╚════════════════════════════════════════╝${COLORS.reset}`);
  console.log("");

  // 1. Pre-flight
  preflight();

  // 2. Detect LAN IP
  const lanIP = detectLanIP();
  logDev(`Detected LAN IP: ${COLORS.bold}${lanIP}${COLORS.reset}`);

  // Resolve Pi IP for the summary
  const piIP = runCapture(
    `ssh -o ConnectTimeout=5 ${PI_HOST} "hostname -I | awk '{print \\$1}'"`,
    { silent: true }
  ) || PI_HOST.split("@")[1];
  logDev(`Pi address: ${COLORS.bold}${piIP}${COLORS.reset}\n`);

  // 3. Initial sync
  initialSync();

  // 4. Start all processes
  startPiAgent();
  startAPI();
  startExpo(lanIP);
  startFileWatcher();

  // 5. Print summary
  console.log("");
  console.log(`${COLORS.bold}${COLORS.dev}╔════════════════════════════════════════╗${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.dev}║   All services starting...             ║${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.dev}╚════════════════════════════════════════╝${COLORS.reset}`);
  console.log("");
  console.log(`  ${COLORS.api}[api]${COLORS.reset}   Next.js API    → http://localhost:3000`);
  console.log(`  ${COLORS.expo}[expo]${COLORS.reset}  Expo (mobile)  → Scan QR in terminal with Expo Go`);
  console.log(`  ${COLORS.pi}[pi]${COLORS.reset}    Device Agent   → http://${piIP}:3001`);
  console.log(`  ${COLORS.pi}[pi]${COLORS.reset}    Vite Preview   → http://${piIP}:5173 (auto-starting...)`);
  console.log(`  ${COLORS.sync}[sync]${COLORS.reset}  File watcher   → auto-rsync to Pi on save`);
  console.log("");
  console.log(`  ${COLORS.dim}Mobile app API URL: http://${lanIP}:3000${COLORS.reset}`);
  console.log(`  ${COLORS.dim}Pi host: ${PI_HOST}${COLORS.reset}`);
  console.log(`  ${COLORS.dim}Press Ctrl+C to stop all services${COLORS.reset}`);
  console.log("");

  // 6. Auto-start Vite dev server on Pi (runs in background, doesn't block)
  autoStartVite(piIP);
}

main().catch((err) => {
  logError(`Fatal: ${err.message}`);
  process.exit(1);
});
