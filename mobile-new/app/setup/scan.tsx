/**
 * Setup Step 1: Instructions to connect to the Pi's WiFi AP.
 *
 * The user is told to go to Settings > WiFi and connect to "TouchScreen-XXXX".
 * Once connected, the app checks the Pi's /api/status endpoint at 192.168.4.1.
 */

import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { COLORS, PI_SERVER_PORT } from "@/lib/constants";
import { createTimeoutSignal } from "@/lib/fetch-timeout";

const AP_IP = "192.168.4.1";
const POLL_INTERVAL = 3000;

export default function ScanScreen() {
  const [checking, setChecking] = useState(false);
  const [deviceCode, setDeviceCode] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-poll the Pi AP when the screen is visible
  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, []);

  const startPolling = () => {
    stopPolling();
    checkConnection(); // Immediate first check
    intervalRef.current = setInterval(checkConnection, POLL_INTERVAL);
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const checkConnection = async () => {
    try {
      setChecking(true);
      const res = await fetch(
        `http://${AP_IP}:${PI_SERVER_PORT}/api/status`,
        { signal: createTimeoutSignal(2000) }
      );
      const data = await res.json();

      if (data.deviceCode && data.mode === "setup") {
        stopPolling();
        setDeviceCode(data.deviceCode);
        // Navigate to WiFi selection
        router.push({
          pathname: "/setup/wifi-select",
          params: { deviceCode: data.deviceCode },
        });
      }
    } catch {
      // Not connected to AP yet — keep polling
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.step}>Step 1 of 4</Text>
        <Text style={styles.title}>Connect to your device</Text>

        <View style={styles.instructions}>
          <View style={styles.instructionRow}>
            <Text style={styles.number}>1</Text>
            <Text style={styles.instruction}>
              Open your phone's <Text style={styles.bold}>Settings</Text> app
            </Text>
          </View>
          <View style={styles.instructionRow}>
            <Text style={styles.number}>2</Text>
            <Text style={styles.instruction}>
              Go to <Text style={styles.bold}>WiFi</Text>
            </Text>
          </View>
          <View style={styles.instructionRow}>
            <Text style={styles.number}>3</Text>
            <Text style={styles.instruction}>
              Connect to the network named{"\n"}
              <Text style={styles.highlight}>TouchScreen-XXXX</Text>
            </Text>
          </View>
          <View style={styles.instructionRow}>
            <Text style={styles.number}>4</Text>
            <Text style={styles.instruction}>
              Come back to this app
            </Text>
          </View>
        </View>

        <View style={styles.statusContainer}>
          {checking ? (
            <ActivityIndicator size="small" color={COLORS.accent} />
          ) : (
            <View style={styles.statusDot} />
          )}
          <Text style={styles.statusText}>
            {deviceCode
              ? `Found device: ${deviceCode}`
              : "Waiting for connection..."}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 32,
  },
  step: {
    fontSize: 13,
    color: COLORS.accent,
    fontWeight: "600",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 32,
  },
  instructions: {
    gap: 24,
    marginBottom: 48,
  },
  instructionRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "flex-start",
  },
  number: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 28,
    overflow: "hidden",
  },
  instruction: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
  },
  bold: {
    fontWeight: "700",
  },
  highlight: {
    color: COLORS.accent,
    fontWeight: "600",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textMuted,
  },
  statusText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
});
