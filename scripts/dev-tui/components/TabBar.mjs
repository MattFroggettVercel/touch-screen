/**
 * TabBar — horizontal row of tab labels with the active one highlighted.
 *
 * Props:
 *   tabs     — Array<{id, label}>
 *   active   — id of the currently active tab
 *   haConnected — boolean, show HA status indicator
 */

import React from "react";
import { Box, Text } from "ink";
import htm from "htm";

const html = htm.bind(React.createElement);

export function TabBar({ tabs, active, haConnected }) {
  return html`
    <${Box} flexDirection="row" paddingX=${1}>
      ${tabs.map(
        (tab, i) => html`
          <${React.Fragment} key=${tab.id}>
            ${i > 0 && html`<${Text} color="gray"> │ </Text>`}
            <${Text}
              bold=${tab.id === active}
              color=${tab.id === active ? "white" : "gray"}
              backgroundColor=${tab.id === active ? "blue" : undefined}
            >
              ${" "}${String(i + 1)} ${tab.label}${" "}
            </Text>
          </React.Fragment>
        `
      )}
      <${Box} flexGrow=${1} />
      <${Text} color=${haConnected ? "green" : "red"}>
        ● HA: ${haConnected ? "connected" : "disconnected"}
      </Text>
    </Box>
  `;
}
