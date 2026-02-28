/**
 * App — root ink component for the TouchScreen dev TUI.
 *
 * Manages tab state, service lifecycle, and hotkey dispatch.
 */

import React, { useState, useEffect, useRef } from "react";
import { Box, Text, useApp, useInput } from "ink";
import htm from "htm";

import { SERVICE_DEFS } from "./services.mjs";
import { TabBar } from "./components/TabBar.mjs";
import { LogPane } from "./components/LogPane.mjs";
import { HotkeyBar } from "./components/HotkeyBar.mjs";

const html = htm.bind(React.createElement);

/**
 * @param {{ services: import("./services.mjs").ServiceManager }} props
 */
export function App({ services }) {
  const { exit } = useApp();
  const [activeTab, setActiveTab] = useState(SERVICE_DEFS[0].id);
  const [logVersion, setLogVersion] = useState(0);
  const [haConnected, setHaConnected] = useState(false);
  const [status, setStatus] = useState("");
  const statusTimer = useRef(null);

  // We keep mutable refs so the useInput callback always sees current values
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  // Force re-render when any service logs
  useEffect(() => {
    const onLog = () => setLogVersion((v) => v + 1);
    const onHA = (connected) => setHaConnected(connected);
    services.on("log", onLog);
    services.on("ha", onHA);
    return () => {
      services.off("log", onLog);
      services.off("ha", onHA);
    };
  }, [services]);

  // Start all services on mount
  useEffect(() => {
    services.startAll();
  }, [services]);

  // Show a temporary status message
  function flash(msg) {
    setStatus(msg);
    if (statusTimer.current) clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatus(""), 3000);
  }

  // Hotkey handling
  useInput((input, key) => {
    // Tab switching: 1-5
    const num = parseInt(input, 10);
    if (num >= 1 && num <= SERVICE_DEFS.length) {
      setActiveTab(SERVICE_DEFS[num - 1].id);
      return;
    }

    const ch = input.toLowerCase();

    if (ch === "r") {
      flash("Restarting Pi agent...");
      services.restartPiAgent();
      return;
    }

    if (ch === "s") {
      flash("Force syncing...");
      services.forceSync();
      return;
    }

    if (ch === "v") {
      flash("Restarting Vite...");
      services.restartVite();
      return;
    }

    if (ch === "o") {
      flash("Opening Vite in Chrome...");
      services.openViteInBrowser();
      return;
    }

    if (ch === "c") {
      services.clearLog(activeTabRef.current);
      flash(`Cleared ${activeTabRef.current} log`);
      return;
    }

    if (ch === "q") {
      services.cleanup();
      exit();
      return;
    }
  });

  const lines = services.getLog(activeTab);

  return html`
    <${Box} flexDirection="column">
      <${TabBar}
        tabs=${SERVICE_DEFS}
        active=${activeTab}
        haConnected=${haConnected}
      />

      <${LogPane} lines=${lines} />

      <${HotkeyBar} status=${status} />
    </Box>
  `;
}
