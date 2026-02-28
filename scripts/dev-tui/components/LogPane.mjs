/**
 * LogPane — displays the last N lines from a service's log buffer.
 *
 * Takes up all remaining vertical space. Shows the tail of the buffer
 * so the most recent output is always visible.
 *
 * Props:
 *   lines — string[] of log lines to display
 */

import React from "react";
import { Box, Text } from "ink";
import htm from "htm";

const html = htm.bind(React.createElement);

export function LogPane({ lines }) {
  // ink renders all children; we show the last chunk that fits.
  // useStdout gives us rows but the simplest approach is to just
  // render the last ~100 lines and let ink handle it.
  const visible = lines.slice(-200);

  return html`
    <${Box}
      flexDirection="column"
      flexGrow=${1}
      paddingX=${1}
      borderStyle="single"
      borderColor="gray"
    >
      ${visible.length === 0
        ? html`<${Text} color="gray" dimColor>Waiting for output...</Text>`
        : visible.map(
            (line, i) =>
              html`<${Text} key=${i} wrap="truncate">${line}</Text>`
          )}
    </Box>
  `;
}
