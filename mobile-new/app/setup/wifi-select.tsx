/**
 * Setup Step 2: Select a WiFi network.
 *
 * The Pi scans for nearby networks and returns the list.
 * The user picks their home WiFi network.
 */

import { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { DeviceClient, WifiNetwork } from "@/lib/device-client";
import { COLORS, PI_SERVER_PORT } from "@/lib/constants";

const AP_IP = "192.168.4.1";

export default function WifiSelectScreen() {
  const { deviceCode } = useLocalSearchParams<{ deviceCode: string }>();
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const client = new DeviceClient(AP_IP, PI_SERVER_PORT);

  const loadNetworks = async () => {
    try {
      setError(null);
      const nets = await client.scanWifi();
      setNetworks(nets);
    } catch (err: any) {
      setError(err.message || "Failed to scan WiFi networks");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNetworks();
  }, []);

  const handleSelectNetwork = (network: WifiNetwork) => {
    router.push({
      pathname: "/setup/wifi-password",
      params: { deviceCode, ssid: network.ssid },
    });
  };

  const getSignalBars = (signal: number) => {
    if (signal > -50) return "▂▄▆█";
    if (signal > -60) return "▂▄▆░";
    if (signal > -70) return "▂▄░░";
    return "▂░░░";
  };

  const renderNetwork = ({ item }: { item: WifiNetwork }) => (
    <TouchableOpacity
      style={styles.networkCard}
      onPress={() => handleSelectNetwork(item)}
      activeOpacity={0.7}
    >
      <Text style={styles.networkName}>{item.ssid}</Text>
      <Text style={styles.signalBars}>
        {getSignalBars(item.signal)}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Scanning for networks...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.step}>Step 2 of 4</Text>
      <Text style={styles.title}>Choose your WiFi</Text>
      <Text style={styles.subtitle}>
        Select the WiFi network your device should connect to
      </Text>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={networks}
        keyExtractor={(item) => item.ssid}
        renderItem={renderNetwork}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadNetworks();
            }}
            tintColor={COLORS.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No networks found</Text>
            <Text style={styles.emptySubtext}>
              Pull down to scan again
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    gap: 16,
  },
  step: {
    fontSize: 13,
    color: COLORS.accent,
    fontWeight: "600",
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textMuted,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  loadingText: {
    fontSize: 15,
    color: COLORS.textMuted,
  },
  list: {
    gap: 8,
  },
  networkCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  networkName: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.text,
  },
  signalBars: {
    fontSize: 14,
    color: COLORS.accent,
    letterSpacing: 1,
  },
  empty: {
    alignItems: "center",
    paddingTop: 48,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "500",
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  errorContainer: {
    backgroundColor: "rgba(248, 113, 113, 0.1)",
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
  },
});
