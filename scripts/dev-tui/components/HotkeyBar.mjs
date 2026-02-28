/**
 * HotkeyBar — bottom bar showing available keyboard shortcuts and status.
 *
 * Props:
 *   status — optional transient status message
 */

import React from "react";
import { Box, Text } from "ink";
import htm from "htm";

const html = htm.bind(React.createElement);

const HOTKEYS = [
  { key: "1-5", desc: "switch tab" },
  { key: "R", desc: "restart pi" },
  { key: "S", desc: "sync" },
  { key: "V", desc: "restart vite" },
  { key: "O", desc: "open vite" },
  { key: "C", desc: "clear" },
  { key: "Q", desc: "quit" },
];

export function HotkeyBar({ status }) {
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
