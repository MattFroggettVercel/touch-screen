/**
 * HA Entity Stream
 *
 * Provides React hooks for subscribing to real-time Home Assistant
 * entity updates from the Pi's WebSocket server.
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { DeviceClient, HAEntity } from "./device-client";

/**
 * Hook that maintains a live connection to the Pi's HA entity stream.
 */
export function useHAEntities(client: DeviceClient | null) {
  const [entities, setEntities] = useState<Record<string, HAEntity>>({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!client) return;

    // Initial fetch
    client.getEntities().then(setEntities).catch(() => {});

    // Subscribe to real-time updates
    client.connectWebSocket();

    const unsubEntities = client.onEntitiesChanged(setEntities);
    const unsubStatus = client.onHAStatusChanged((status) => {
      setConnected(status.connected);
    });

    return () => {
      unsubEntities();
      unsubStatus();
      client.disconnectWebSocket();
    };
  }, [client]);

  const callService = useCallback(
    (domain: string, service: string, data?: Record<string, any>) => {
      if (client) {
        client.callServiceWS(domain, service, data);
      }
    },
    [client]
  );

  return { entities, connected, callService };
}

/**
 * Hook for a single entity.
 */
export function useEntity(
  entities: Record<string, HAEntity>,
  entityId: string
): HAEntity | undefined {
  return entities[entityId];
}

/**
 * Hook for entities by domain.
 */
export function useEntitiesByDomain(
  entities: Record<string, HAEntity>,
  domain: string
): HAEntity[] {
  return Object.values(entities).filter((e) =>
    e.entity_id.startsWith(`${domain}.`)
  );
}

/**
 * Group entities by area (using device_registry info from the Pi).
 */
export function groupEntitiesByArea(
  entities: Record<string, HAEntity>,
  areas: Array<{ area_id: string; name: string }>
): Record<string, HAEntity[]> {
  const result: Record<string, HAEntity[]> = {
    "Unassigned": [],
  };

  // Initialise area buckets
  for (const area of areas) {
    result[area.name] = [];
  }

  for (const entity of Object.values(entities)) {
    const areaId = entity.attributes?.area_id;
    if (areaId) {
      const area = areas.find((a) => a.area_id === areaId);
      if (area) {
        result[area.name].push(entity);
        continue;
      }
    }
    result["Unassigned"].push(entity);
  }

  return result;
}
