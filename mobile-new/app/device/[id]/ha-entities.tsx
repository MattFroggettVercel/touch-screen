/**
 * HA Entity Browser.
 *
 * Live entity list from the Pi's WebSocket, grouped by domain.
 * Shows entity state in real-time.
 */

import { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { DeviceClient, HAEntity } from "@/lib/device-client";
import { useHAEntities } from "@/lib/ha-stream";
import { COLORS, PI_SERVER_PORT } from "@/lib/constants";

const DOMAIN_LABELS: Record<string, string> = {
  light: "💡 Lights",
  switch: "🔌 Switches",
  climate: "🌡️ Climate",
  media_player: "🎵 Media Players",
  sensor: "📊 Sensors",
  binary_sensor: "🔘 Binary Sensors",
  cover: "🪟 Covers",
  camera: "📹 Cameras",
  scene: "🎬 Scenes",
  weather: "🌤 Weather",
  automation: "🤖 Automations",
  script: "📜 Scripts",
  person: "👤 People",
  zone: "📍 Zones",
  input_boolean: "☑️ Input Booleans",
  input_number: "🔢 Input Numbers",
  input_select: "📋 Input Selects",
};

function getDomainLabel(domain: string): string {
  return DOMAIN_LABELS[domain] || domain;
}

function getStateBadgeColor(state: string): string {
  switch (state) {
    case "on":
    case "home":
    case "playing":
      return COLORS.success;
    case "off":
    case "not_home":
    case "paused":
    case "idle":
      return COLORS.textMuted;
    case "unavailable":
    case "unknown":
      return COLORS.error;
    default:
      return COLORS.accent;
  }
}

export default function HAEntitiesScreen() {
  const { localIP } = useLocalSearchParams<{ localIP: string }>();
  const [client, setClient] = useState<DeviceClient | null>(null);
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    if (!localIP) return;
    const c = new DeviceClient(localIP, PI_SERVER_PORT);
    setClient(c);
  }, [localIP]);

  const { entities, connected } = useHAEntities(client);

  // Group by domain
  const sections = useMemo(() => {
    const grouped: Record<string, HAEntity[]> = {};

    for (const entity of Object.values(entities)) {
      const domain = entity.entity_id.split(".")[0];
      if (!grouped[domain]) grouped[domain] = [];
      grouped[domain].push(entity);
    }

    return Object.entries(grouped)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([domain, data]) => ({
        title: getDomainLabel(domain),
        domain,
        data: expandedDomains.has(domain) ? data : [],
        count: data.length,
      }));
  }, [entities, expandedDomains]);

  const toggleDomain = (domain: string) => {
    setExpandedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });
  };

  if (!localIP) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Device not reachable</Text>
      </View>
    );
  }

  if (Object.keys(entities).length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>
          {connected
            ? "Loading entities..."
            : "Connecting to Home Assistant..."}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.connectionStatus}>
          <View
            style={[
              styles.dot,
              { backgroundColor: connected ? COLORS.success : COLORS.error },
            ]}
          />
          <Text style={styles.connectionText}>
            {connected ? "Connected" : "Disconnected"}
          </Text>
        </View>
        <Text style={styles.entityCount}>
          {Object.keys(entities).length} entities
        </Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.entity_id}
        renderSectionHeader={({ section }) => (
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleDomain(section.domain)}
          >
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionCount}>
              {section.count}{" "}
              {expandedDomains.has(section.domain) ? "▼" : "▶"}
            </Text>
          </TouchableOpacity>
        )}
        renderItem={({ item }) => (
          <View style={styles.entityRow}>
            <View style={styles.entityInfo}>
              <Text style={styles.entityName}>
                {item.attributes?.friendly_name || item.entity_id}
              </Text>
              <Text style={styles.entityId}>{item.entity_id}</Text>
            </View>
            <View
              style={[
                styles.stateBadge,
                { backgroundColor: getStateBadgeColor(item.state) + "20" },
              ]}
            >
              <Text
                style={[
                  styles.stateText,
                  { color: getStateBadgeColor(item.state) },
                ]}
              >
                {item.state}
              </Text>
            </View>
          </View>
        )}
        stickySectionHeadersEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: COLORS.textMuted,
  },
  errorText: {
    fontSize: 15,
    color: COLORS.error,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  connectionStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectionText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  entityCount: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  sectionCount: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  entityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  entityInfo: {
    flex: 1,
    marginRight: 12,
  },
  entityName: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: "500",
    marginBottom: 2,
  },
  entityId: {
    fontSize: 12,
    color: COLORS.textDim,
  },
  stateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stateText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
