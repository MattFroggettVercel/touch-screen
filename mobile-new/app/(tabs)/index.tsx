/**
 * Device list screen.
 *
 * Shows cloud-registered devices merged with local mDNS discovery
 * to display online/offline status per device.
 */

import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { listDevices, CloudDevice } from "@/lib/api";
import {
  startDiscovery,
  stopDiscovery,
  onDevicesDiscovered,
  DiscoveredDevice,
  resolveDeviceByHostname,
} from "@/lib/discovery";
import { saveKnownDevice, getKnownDevices, KnownDevice } from "@/lib/storage";
import { COLORS, COMMON_DEVICE_HOSTNAMES } from "@/lib/constants";
import { createTimeoutSignal } from "@/lib/fetch-timeout";

interface MergedDevice extends CloudDevice {
  online: boolean;
  localIP?: string;
  localPort?: number;
}

export default function DeviceListScreen() {
  const [devices, setDevices] = useState<MergedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [discovered, setDiscovered] = useState<DiscoveredDevice[]>([]);

  // Fetch cloud devices
  const fetchDevices = useCallback(async () => {
    try {
      const cloudDevices = await listDevices();
      
      // Get known devices from storage (fallback when mDNS isn't available)
      const knownDevices = await getKnownDevices();
      const knownMap = new Map(knownDevices.map(d => [d.code, d]));
      
      // Try hostname resolution for devices (fallback when mDNS isn't available)
      const hostnameResolutions = new Map<string, DiscoveredDevice>();
      if (discovered.length === 0) {
        // If mDNS didn't find anything, try common hostnames
        for (const hostname of COMMON_DEVICE_HOSTNAMES) {
          try {
            const resolved = await resolveDeviceByHostname(hostname);
            if (resolved) {
              hostnameResolutions.set(resolved.code, resolved);
              console.log(`Found device via hostname ${hostname}:`, resolved.code);
            }
          } catch {
            // Ignore hostname resolution failures
          }
        }
      }
      
      const merged = await Promise.all(cloudDevices.map(async (d) => {
        // Try mDNS discovery first
        const local = discovered.find((l) => l.code === d.code);
        if (local) {
          return {
            ...d,
            online: true,
            localIP: local.host,
            localPort: local.port,
          };
        }
        
        // Try hostname resolution
        const hostnameDevice = hostnameResolutions.get(d.code);
        if (hostnameDevice) {
          return {
            ...d,
            online: true,
            localIP: hostnameDevice.host,
            localPort: hostnameDevice.port,
          };
        }
        
        // Fallback to known devices from storage
        const known = knownMap.get(d.code);
        if (known?.localIP) {
          // Try to verify the device is still reachable
          try {
            const res = await fetch(`http://${known.localIP}:${known.localPort || 3001}/api/status`, {
              signal: createTimeoutSignal(1000),
            });
            if (res.ok) {
              return {
                ...d,
                online: true,
                localIP: known.localIP,
                localPort: known.localPort,
              };
            }
          } catch {
            // Device not reachable
          }
          return {
            ...d,
            online: false,
            localIP: known.localIP,
            localPort: known.localPort,
          };
        }
        
        return {
          ...d,
          online: false,
        };
      }));
      
      setDevices(merged);

      // Save discovered devices to local storage
      for (const d of merged) {
        if (d.online && d.localIP) {
          await saveKnownDevice({
            code: d.code,
            name: d.name || d.code,
            localIP: d.localIP,
            localPort: d.localPort,
            lastSeen: new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch devices:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [discovered]);

  // Start mDNS discovery
  useEffect(() => {
    startDiscovery();

    const unsub = onDevicesDiscovered((devs) => {
      setDiscovered(devs);
    });

    return () => {
      unsub();
      stopDiscovery();
    };
  }, []);

  // Refetch when discovery changes
  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDevices();
  };

  const handleDevicePress = (device: MergedDevice) => {
    router.push({
      pathname: "/device/[id]",
      params: {
        id: device.code,
        name: device.name || device.code,
        localIP: device.localIP || "",
        localPort: String(device.localPort || ""),
      },
    });
  };

  const renderDevice = ({ item }: { item: MergedDevice }) => (
    <TouchableOpacity
      style={styles.deviceCard}
      onPress={() => handleDevicePress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.deviceInfo}>
        <View style={styles.deviceHeader}>
          <Text style={styles.deviceName}>
            {item.name || item.code}
          </Text>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: item.online ? COLORS.success : COLORS.textMuted },
            ]}
          />
        </View>
        <Text style={styles.deviceCode}>{item.code}</Text>
        {item.online && item.localIP && (
          <Text style={styles.deviceIP}>{item.localIP}</Text>
        )}
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={devices}
        keyExtractor={(item) => item.code}
        renderItem={renderDevice}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No devices yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your first TouchScreen device to get started
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push("/setup/scan")}
      >
        <Text style={styles.addButtonText}>+ Add Device</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.testButton}
        onPress={() => router.push("/test-device")}
      >
        <Text style={styles.testButtonText}>🧪 Test Device</Text>
      </TouchableOpacity>
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
  },
  list: {
    padding: 16,
    gap: 12,
  },
  deviceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  deviceCode: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  deviceIP: {
    fontSize: 12,
    color: COLORS.textDim,
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    color: COLORS.textMuted,
    fontWeight: "300",
  },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  addButton: {
    position: "absolute",
    bottom: 96,
    left: 16,
    right: 16,
    height: 56,
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.background,
  },
  testButton: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    height: 56,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
});
