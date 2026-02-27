// Real Home Assistant WebSocket connection.
// Only used on the Pi device — never in the sandbox.

import {
  createConnection,
  subscribeEntities,
  callService as haCallService,
  createLongLivedTokenAuth,
  type Connection,
  type HassEntities,
} from "home-assistant-js-websocket";
import type { HAEntity, HAEntities } from "./ha-types";

/** Convert a HassEntities map to our HAEntities shape */
function toHAEntities(hass: HassEntities): HAEntities {
  const out: HAEntities = {};
  for (const [id, entity] of Object.entries(hass)) {
    out[id] = {
      entity_id: entity.entity_id,
      state: entity.state,
      attributes: entity.attributes as Record<string, any>,
      last_changed: entity.last_changed,
      last_updated: entity.last_updated,
    };
  }
  return out;
}

export interface HAConnection {
  connection: Connection;
  subscribe: (callback: (entities: HAEntities) => void) => () => void;
  callService: (
    domain: string,
    service: string,
    data?: Record<string, any>
  ) => Promise<void>;
  close: () => void;
}

/**
 * Create a live connection to Home Assistant.
 * @param url  HA base URL, e.g. "http://homeassistant.local:8123"
 * @param token  Long-lived access token
 */
export async function connectToHA(
  url: string,
  token: string
): Promise<HAConnection> {
  const auth = createLongLivedTokenAuth(url, token);
  const connection = await createConnection({ auth });

  return {
    connection,

    subscribe(callback: (entities: HAEntities) => void) {
      const unsub = subscribeEntities(connection, (hass) => {
        callback(toHAEntities(hass));
      });
      return typeof unsub === "function" ? unsub : () => unsub;
    },

    async callService(
      domain: string,
      service: string,
      data?: Record<string, any>
    ) {
      await haCallService(connection, domain, service, data);
    },

    close() {
      connection.close();
    },
  };
}
