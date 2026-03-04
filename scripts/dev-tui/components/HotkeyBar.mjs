/**
 * HotkeyBar — bottom bar showing available keyboard shortcuts and status.
 *
 * Props:
 *   status        — optional transient status message
 *   confirmLabel  — if set, shows a confirmation prompt instead of normal hotkeys
 */

import React from "react";
import { Box, Text } from "ink";
import htm from "htm";

const html = htm.bind(React.createElement);

const HOTKEYS = [
  { key: "1-5", desc: "switch tab" },
  { key: "R", desc: "restart pi" },
  { key: "O", desc: "open vite" },
  { key: "X", desc: "shutdown pi" },
  { key: "Q", desc: "quit" },
];

export function HotkeyBar({ status, confirmLabel }) {
  if (confirmLabel) {
    return html`
      <${Box} flexDirection="row" paddingX=${1} justifyContent="center" gap=${2}>
        <${Text} bold color="red">${confirmLabel}</Text>
        <${Text}>
          <${Text} bold color="cyan">Y</Text>
          <${Text} color="gray">${" "}confirm</Text>
        </Text>
        <${Text}>
          <${Text} bold color="cyan">N</Text>
          <${Text} color="gray">${" "}cancel</Text>
        </Text>
      </Box>
    `;
  }

  return html`
    <${Box} flexDirection="row" paddingX=${1} justifyContent="space-between">
      <${Box} gap=${2}>
        ${HOTKEYS.map(
          (h) => html`
            <${Text} key=${h.key}>
              <${Text} bold color="cyan">${h.key}</Text>
              <${Text} color="gray">${" "}${h.desc}</Text>
            </Text>
          `
        )}
      </Box>
      ${status
        ? html`<${Text} color="yellow">${status}</Text>`
        : html`<${Text} color="gray">TouchScreen Dev</Text>`}
    </Box>
  `;
}
