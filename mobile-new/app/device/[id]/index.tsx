/**
 * Device detail screen.
 *
 * Shows the current dashboard (WebView pointing at Pi production server),
 * device status, and actions (Edit, HA Entities, Settings).
 */

import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { DeviceClient, DeviceStatus } from "@/lib/device-client";
import { findDevice } from "@/lib/discovery";
import { getKnownDevices } from "@/lib/storage";
import { COLORS, PI_SERVER_PORT, PI_DEV_PORT } from "@/lib/constants";

export default function DeviceIndexScreen() {
  const { id, name, localIP, localPort } = useLocalSearchParams<{
    id: string;
    name?: string;
    localIP?: string;
    localPort?: string;
  }>();

  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [host, setHost] = useState<string | null>(localIP || null);

  // Resolve device host
  useEffect(() => {
    const resolve = async () => {
      // Try params first
      if (localIP) {
        setHost(localIP);
        return;
      }

      // Try mDNS
      const discovered = findDevice(id!);
      if (discovered) {
        setHost(discovered.host);
        return;
      }

      // Try local storage
      const known = await getKnownDevices();
      const stored = known.find((d) => d.code === id);
      if (stored?.localIP) {
        setHost(stored.localIP);
      }
    };

    resolve();
  }, [id, localIP]);

  // Fetch device status
  useEffect(() => {
    if (!host) return;

    const client = new DeviceClient(host, PI_SERVER_PORT);
    client
      .getStatus()
      .then((s) => {
        setStatus(s);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [host]);

  const navigateToEdit = () => {
    router.push({
      pathname: "/device/[id]/edit",
      params: { id: id!, name: name || id, localIP: host || "", localPort: localPort || "" },
    });
  };

  const navigateToEntities = () => {
    router.push({
      pathname: "/device/[id]/ha-entities",
      params: { id: id!, localIP: host || "" },
    });
  };

  const navigateToSettings = () => {
    router.push({
      pathname: "/device/[id]/settings",
      params: { id: id!, name: name || id, localIP: host || "" },
    });
  };

  if (!host) {
    return (
      <View style={styles.centered}>
        <Text style={styles.offlineTitle}>Device offline</Text>
        <Text style={styles.offlineSubtitle}>
          Make sure your device is on the same network
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Status card */}
      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Status</Text>
          <View style={styles.statusBadge}>
            <View
              style={[
                styles.dot,
                { backgroundColor: error ? COLORS.error : COLORS.success },
              ]}
            />
            <Text style={styles.statusValue}>
              {error ? "Unreachable" : "Online"}
            </Text>
          </View>
        </View>

        {status && (
          <>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>HA Connected</Text>
              <Text style={styles.statusValue}>
                {status.ha.connected
                  ? `Yes (${status.ha.entityCount} entities)`
                  : "No"}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Mode</Text>
              <Text style={styles.statusValue}>
                {status.editing ? "Editing" : "Production"}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={navigateToEdit}
        >
          <Text style={styles.actionEmoji}>✏️</Text>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Edit Dashboard</Text>
            <Text style={styles.actionSubtitle}>
              Modify your dashboard with AI
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={navigateToEntities}
        >
          <Text style={styles.actionEmoji}>🏠</Text>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>HA Entities</Text>
            <Text style={styles.actionSubtitle}>
              Browse Home Assistant devices
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={navigateToSettings}
        >
          <Text style={styles.actionEmoji}>⚙️</Text>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Device Settings</Text>
            <Text style={styles.actionSubtitle}>
              Name, HA config, remove device
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    paddingHorizontal: 32,
  },
  offlineTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  offlineSubtitle: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: "center",
  },
  statusCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "500",
  },
  actions: {
    gap: 12,
  },
  actionButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionEmoji: {
    fontSize: 28,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
});
