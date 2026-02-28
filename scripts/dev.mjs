#!/usr/bin/env node

/**
 * TouchScreen Dev Orchestrator
 *
 * Tabbed terminal UI powered by ink.
 *
 * Usage:
 *   npm run dev                            # defaults to pi@touchscreen
 *   PI_HOST=pi@192.168.1.50 npm run dev    # custom Pi host
 */

import React from "react";
import { render } from "ink";
import htm from "htm";

import { ServiceManager } from "./dev-tui/services.mjs";
import { App } from "./dev-tui/App.mjs";

const html = htm.bind(React.createElement);

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

const services = new ServiceManager();

// Preflight and initial sync run synchronously before the TUI starts
// so any fatal errors are printed plainly to stderr.
try {
  services.preflight();
  services.detectIPs();
  services.initialSync();
} catch (err) {
  console.error(`\x1b[31m[dev] Fatal: ${err.message}\x1b[0m`);
  process.exit(1);
}

// Render the ink TUI — services.startAll() is called inside <App> on mount
const { waitUntilExit } = render(html`<${App} services=${services} />`);

// Handle signals — cleanup is done by the App component via useInput('q')
// but we also handle raw signals for safety
process.on("SIGINT", () => {
  services.cleanup();
  process.exit(0);
});
process.on("SIGTERM", () => {
  services.cleanup();
  process.exit(0);
});

await waitUntilExit();
services.cleanup();
process.exit(0);
