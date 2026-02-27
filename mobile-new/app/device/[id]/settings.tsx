/**
 * Device settings screen.
 *
 * Device name, HA config, and remove device.
 */

import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { DeviceClient, DeviceStatus } from "@/lib/device-client";
import { removeKnownDevice } from "@/lib/storage";
import { COLORS, PI_SERVER_PORT } from "@/lib/constants";

export default function DeviceSettingsScreen() {
  const { id, name, localIP } = useLocalSearchParams<{
    id: string;
    name?: string;
    localIP?: string;
  }>();

  const [client, setClient] = useState<DeviceClient | null>(null);
  const [status, setStatus] = useState<DeviceStatus | null>(null);

  useEffect(() => {
    if (!localIP) return;
    const c = new DeviceClient(localIP, PI_SERVER_PORT);
    setClient(c);
    c.getStatus().then(setStatus).catch(() => {});
  }, [localIP]);

  const handleRemoveDevice = () => {
    Alert.alert(
      "Remove Device",
      "This will unlink this device from your account. The device will need to be set up again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await removeKnownDevice(id!);
            router.replace("/(tabs)");
          },
        },
      ]
    );
  };

  const handleBuild = async () => {
    if (!client) return;

    Alert.alert(
      "Build Dashboard",
      "This will build the current dashboard for production use on the device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Build",
          onPress: async () => {
            try {
              await client.build();
              Alert.alert("Success", "Dashboard built successfully");
            } catch (err: any) {
              Alert.alert("Build Failed", err.message);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Device Info</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Device Code</Text>
          <Text style={styles.value}>{id}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{name || "—"}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Local IP</Text>
          <Text style={styles.value}>{localIP || "Unknown"}</Text>
        </View>

        {status && (
          <>
            <View style={styles.card}>
              <Text style={styles.label}>WiFi Network</Text>
              <Text style={styles.value}>{status.wifi.ssid || "—"}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.label}>HA Connection</Text>
              <Text style={styles.value}>
                {status.ha.connected
                  ? `Connected (${status.ha.entityCount} entities)`
                  : "Not connected"}
              </Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>

        <TouchableOpacity style={styles.actionButton} onPress={handleBuild}>
          <Text style={styles.actionButtonText}>Build Production Dashboard</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dangerZone}>
        <Text style={styles.dangerTitle}>Danger Zone</Text>
        <TouchableOpacity
          style={styles.dangerButton}
          onPress={handleRemoveDevice}
        >
          <Text style={styles.dangerButtonText}>Remove Device</Text>
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
    gap: 32,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  label: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "500",
  },
  actionButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.accent + "40",
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.accent,
  },
  dangerZone: {
    gap: 8,
    marginTop: 16,
  },
  dangerTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.error,
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingHorizontal: 4,
  },
  dangerButton: {
    backgroundColor: "rgba(248, 113, 113, 0.1)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.3)",
  },
  dangerButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.error,
  },
});
