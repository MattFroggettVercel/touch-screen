/**
 * Setup Step 3: Enter WiFi password and connect.
 */

import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { DeviceClient } from "@/lib/device-client";
import { COLORS, PI_SERVER_PORT } from "@/lib/constants";

const AP_IP = "192.168.4.1";

export default function WifiPasswordScreen() {
  const { deviceCode, ssid } = useLocalSearchParams<{
    deviceCode: string;
    ssid: string;
  }>();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const client = new DeviceClient(AP_IP, PI_SERVER_PORT);
      await client.connectWifi(ssid!, password);

      // Navigate to the "connecting" screen
      router.push({
        pathname: "/setup/connecting",
        params: { deviceCode, ssid },
      });
    } catch (err: any) {
      setError(err.message || "Failed to send WiFi credentials");
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <Text style={styles.step}>Step 3 of 4</Text>
        <Text style={styles.title}>Enter password</Text>
        <Text style={styles.subtitle}>
          for <Text style={styles.highlight}>{ssid}</Text>
        </Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="WiFi password"
            placeholderTextColor={COLORS.textDim}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoFocus
            returnKeyType="go"
            onSubmitEditing={handleConnect}
          />

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.button,
              loading && styles.buttonDisabled,
            ]}
            onPress={handleConnect}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Connecting..." : "Connect"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => {
              // Open network, no password needed
              handleConnect();
            }}
          >
            <Text style={styles.skipText}>No password (open network)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginBottom: 32,
  },
  highlight: {
    color: COLORS.accent,
    fontWeight: "600",
  },
  form: {
    gap: 16,
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
  },
  button: {
    height: 56,
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.background,
  },
  skipButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  errorContainer: {
    backgroundColor: "rgba(248, 113, 113, 0.1)",
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
  },
});
