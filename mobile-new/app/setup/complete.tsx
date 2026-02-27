/**
 * Setup Step 4: Device found on network, register to account.
 */

import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { provisionDevice } from "@/lib/api";
import { saveKnownDevice } from "@/lib/storage";
import { COLORS } from "@/lib/constants";

const LOCATIONS = [
  "Kitchen",
  "Living Room",
  "Bedroom",
  "Bathroom",
  "Office",
  "Hallway",
  "Garage",
  "Garden",
];

export default function CompleteScreen() {
  const { deviceCode, localIP, localPort } = useLocalSearchParams<{
    deviceCode: string;
    localIP: string;
    localPort: string;
  }>();
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = selectedLocation || customName;
  const canSubmit = name.trim().length > 0 && !loading;

  const handleRegister = async () => {
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    try {
      await provisionDevice(deviceCode!, name.trim());

      // Save to local storage
      await saveKnownDevice({
        code: deviceCode!,
        name: name.trim(),
        localIP: localIP || undefined,
        localPort: localPort ? parseInt(localPort) : undefined,
        lastSeen: new Date().toISOString(),
      });

      // Navigate to the device
      router.replace({
        pathname: "/device/[id]",
        params: {
          id: deviceCode!,
          name: name.trim(),
          localIP: localIP || "",
          localPort: localPort || "",
        },
      });
    } catch (err: any) {
      setError(err.message || "Failed to register device");
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={styles.step}>Step 4 of 4</Text>
      <Text style={styles.title}>Name your device</Text>
      <Text style={styles.subtitle}>
        Where is this TouchScreen located?
      </Text>

      <View style={styles.grid}>
        {LOCATIONS.map((loc) => (
          <TouchableOpacity
            key={loc}
            style={[
              styles.locationChip,
              selectedLocation === loc && styles.locationChipSelected,
            ]}
            onPress={() => {
              setSelectedLocation(loc);
              setCustomName("");
            }}
          >
            <Text
              style={[
                styles.locationText,
                selectedLocation === loc && styles.locationTextSelected,
              ]}
            >
              {loc}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <TextInput
        style={styles.input}
        placeholder="Custom name..."
        placeholderTextColor={COLORS.textDim}
        value={customName}
        onChangeText={(text) => {
          setCustomName(text);
          setSelectedLocation(null);
        }}
      />

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, !canSubmit && styles.buttonDisabled]}
        onPress={handleRegister}
        disabled={!canSubmit}
      >
        <Text style={styles.buttonText}>
          {loading ? "Registering..." : "Complete Setup"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: 32,
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginBottom: 24,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  locationChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  locationChipSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  locationText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "500",
  },
  locationTextSelected: {
    color: COLORS.background,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  input: {
    height: 56,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 24,
  },
  button: {
    height: 56,
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.background,
  },
  errorContainer: {
    backgroundColor: "rgba(248, 113, 113, 0.1)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
  },
});
