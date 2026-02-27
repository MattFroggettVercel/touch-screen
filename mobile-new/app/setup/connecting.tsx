/**
 * Setup Step 3b: Waiting for the Pi to connect to home WiFi.
 *
 * After sending WiFi credentials, the Pi disconnects its AP and
 * tries to join the home network. This screen tells the user to
 * reconnect to their own WiFi, then uses mDNS to find the Pi.
 */

import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  startDiscovery,
  stopDiscovery,
  onDevicesDiscovered,
  DiscoveredDevice,
} from "@/lib/discovery";
import { COLORS } from "@/lib/constants";

export default function ConnectingScreen() {
  const { deviceCode, ssid } = useLocalSearchParams<{
    deviceCode: string;
    ssid: string;
  }>();
  const [status, setStatus] = useState<"reconnect" | "searching" | "found">(
    "reconnect"
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Give the user 8 seconds to reconnect to their home WiFi
    timerRef.current = setTimeout(() => {
      setStatus("searching");
      startMDNSScan();
    }, 8000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      stopDiscovery();
    };
  }, []);

  const startMDNSScan = () => {
    startDiscovery();

    const unsub = onDevicesDiscovered((devices: DiscoveredDevice[]) => {
      const found = devices.find((d) => d.code === deviceCode);
      if (found) {
        setStatus("found");
        unsub();
        stopDiscovery();

        // Navigate to complete screen
        setTimeout(() => {
          router.push({
            pathname: "/setup/complete",
            params: {
              deviceCode: deviceCode!,
              localIP: found.host,
              localPort: String(found.port),
            },
          });
        }, 1000);
      }
    });

    // Timeout after 60 seconds
    setTimeout(() => {
      unsub();
      stopDiscovery();
    }, 60000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {status === "reconnect" && (
          <>
            <Text style={styles.emoji}>📱</Text>
            <Text style={styles.title}>Reconnect to WiFi</Text>
            <Text style={styles.subtitle}>
              Your device is connecting to{" "}
              <Text style={styles.highlight}>{ssid}</Text>.{"\n\n"}
              Please reconnect your phone to your home WiFi network now.
            </Text>
            <ActivityIndicator
              size="large"
              color={COLORS.accent}
              style={styles.spinner}
            />
          </>
        )}

        {status === "searching" && (
          <>
            <Text style={styles.emoji}>🔍</Text>
            <Text style={styles.title}>Searching for device...</Text>
            <Text style={styles.subtitle}>
              Looking for your TouchScreen on the network.{"\n"}
              This usually takes 10–30 seconds.
            </Text>
            <ActivityIndicator
              size="large"
              color={COLORS.accent}
              style={styles.spinner}
            />
          </>
        )}

        {status === "found" && (
          <>
            <Text style={styles.emoji}>✅</Text>
            <Text style={styles.title}>Device found!</Text>
            <Text style={styles.subtitle}>
              Your TouchScreen is now on your network
            </Text>
          </>
        )}
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
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 24,
  },
  highlight: {
    color: COLORS.accent,
    fontWeight: "600",
  },
  spinner: {
    marginTop: 32,
  },
});
