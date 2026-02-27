import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import type { HAEntity, HAEntities } from "./ha-types";
import { getDomain } from "./ha-types";
import { mockEntities } from "./mock-data";

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface HAContextType {
  entities: HAEntities;
  callService: (
    domain: string,
    service: string,
    data?: Record<string, any>
  ) => void;
  connected: boolean;
  mode: "mock" | "live";
}

const HAContext = createContext<HAContextType | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function HAProvider({ children }: { children: React.ReactNode }) {
  const haUrl = import.meta.env.VITE_HA_URL as string | undefined;
  const haToken = import.meta.env.VITE_HA_TOKEN as string | undefined;
  const isLive = Boolean(haUrl && haToken);

  const [entities, setEntities] = useState<HAEntities>(
    isLive ? {} : structuredClone(mockEntities)
  );
  const [connected, setConnected] = useState(!isLive); // mock is always "connected"
  const connectionRef = useRef<any>(null);

  // ---- Live mode: connect via WebSocket ----
  useEffect(() => {
    if (!isLive) return;

    let cancelled = false;

    (async () => {
      try {
        // Dynamic import so the HA websocket package is never bundled in mock mode
        const { connectToHA } = await import("./ha-connection");
        if (cancelled) return;

        const conn = await connectToHA(haUrl!, haToken!);
        if (cancelled) {
          conn.close();
          return;
        }

        connectionRef.current = conn;
        setConnected(true);

        conn.subscribe((ents) => {
          if (!cancelled) setEntities(ents);
        });
      } catch (err) {
        console.error("[HA] Connection failed:", err);
        setConnected(false);
      }
    })();

    return () => {
      cancelled = true;
      connectionRef.current?.close();
      connectionRef.current = null;
      setConnected(false);
    };
  }, [isLive, haUrl, haToken]);

  // ---- callService: mock mutates local state, live sends WebSocket ----
  const callService = useCallback(
    (domain: string, service: string, data?: Record<string, any>) => {
      if (isLive && connectionRef.current) {
        connectionRef.current.callService(domain, service, data);
        return;
      }

      // Mock mode: simulate common service calls locally
      const entityId = data?.entity_id as string | undefined;
      if (!entityId) return;

      setEntities((prev) => {
        const entity = prev[entityId];
        if (!entity) return prev;

        const updated = {
          ...entity,
          attributes: { ...entity.attributes },
          last_changed: new Date().toISOString(),
          last_updated: new Date().toISOString(),
        };

        // --- Light services ---
        if (domain === "light") {
          if (service === "turn_on") {
            updated.state = "on";
            if (data?.brightness !== undefined)
              updated.attributes.brightness = data.brightness;
            else if (updated.attributes.brightness === 0)
              updated.attributes.brightness = 191;
            if (data?.color_temp !== undefined)
              updated.attributes.color_temp = data.color_temp;
          } else if (service === "turn_off") {
            updated.state = "off";
            updated.attributes.brightness = 0;
          } else if (service === "toggle") {
            if (entity.state === "on") {
              updated.state = "off";
              updated.attributes.brightness = 0;
            } else {
              updated.state = "on";
              updated.attributes.brightness =
                entity.attributes.brightness > 0
                  ? entity.attributes.brightness
                  : 191;
            }
          }
        }

        // --- Switch services ---
        if (domain === "switch") {
          if (service === "turn_on") updated.state = "on";
          else if (service === "turn_off") updated.state = "off";
          else if (service === "toggle")
            updated.state = entity.state === "on" ? "off" : "on";
        }

        // --- Climate services ---
        if (domain === "climate") {
          if (service === "set_temperature" && data?.temperature !== undefined) {
            updated.attributes.temperature = data.temperature;
          }
          if (service === "set_hvac_mode" && data?.hvac_mode !== undefined) {
            updated.state = data.hvac_mode;
            updated.attributes.hvac_action =
              data.hvac_mode === "off" ? "off" : "idle";
          }
        }

        // --- Media player services ---
        if (domain === "media_player") {
          if (service === "media_play") updated.state = "playing";
          else if (service === "media_pause") updated.state = "paused";
          else if (service === "media_play_pause")
            updated.state =
              entity.state === "playing" ? "paused" : "playing";
          else if (service === "media_next_track") {
            updated.attributes.media_title = "Next Track";
            updated.attributes.media_artist = "Unknown Artist";
            updated.attributes.media_position = 0;
          }
          else if (service === "media_previous_track") {
            updated.attributes.media_position = 0;
          }
          if (service === "volume_set" && data?.volume_level !== undefined) {
            updated.attributes.volume_level = data.volume_level;
          }
        }

        // --- Cover services ---
        if (domain === "cover") {
          if (service === "open_cover") {
            updated.state = "open";
            updated.attributes.current_position = 100;
          } else if (service === "close_cover") {
            updated.state = "closed";
            updated.attributes.current_position = 0;
          } else if (
            service === "set_cover_position" &&
            data?.position !== undefined
          ) {
            updated.attributes.current_position = data.position;
            updated.state = data.position > 0 ? "open" : "closed";
          }
        }

        // --- Scene services ---
        if (domain === "scene" && service === "turn_on") {
          // Scenes don't have meaningful state changes but we can flash briefly
          // by updating last_changed
        }

        // --- Camera services ---
        if (domain === "camera") {
          if (service === "turn_on") updated.state = "idle";
          else if (service === "turn_off") updated.state = "off";
        }

        return { ...prev, [entityId]: updated };
      });
    },
    [isLive]
  );

  const value = useMemo<HAContextType>(
    () => ({
      entities,
      callService,
      connected,
      mode: isLive ? "live" : "mock",
    }),
    [entities, callService, connected, isLive]
  );

  return <HAContext.Provider value={value}>{children}</HAContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Access the full HA context */
export function useHA() {
  const ctx = useContext(HAContext);
  if (!ctx) throw new Error("useHA must be used within <HAProvider>");
  return ctx;
}

/** Get a single entity by ID + a scoped callService */
export function useEntity(entityId: string) {
  const { entities, callService } = useHA();
  const entity = entities[entityId] ?? null;
  return { entity, callService };
}

/** Get all entities for a given domain (e.g. "light", "sensor") */
export function useEntitiesByDomain(domain: string) {
  const { entities, callService } = useHA();
  const filtered = useMemo(
    () =>
      Object.values(entities).filter((e) => getDomain(e.entity_id) === domain),
    [entities, domain]
  );
  return { entities: filtered, callService };
}
