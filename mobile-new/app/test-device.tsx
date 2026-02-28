/**
 * Test Device Entry Screen
 *
 * Allows manual entry of device code and Pi IP address to bypass
 * device registration and directly access the edit screen for testing.
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
  Alert,
} from "react-native";
import { router } from "expo-router";
import { COLORS } from "@/lib/constants";
import { createTimeoutSignal } from "@/lib/fetch-timeout";

export default function TestDeviceScreen() {
  const [deviceCode, setDeviceCode] = useState("TEST123456");
  const [piIP, setPiIP] = useState("192.168.1.239");
  const [loading, setLoading] = useState(false);

  const canSubmit = deviceCode.trim().length === 10 && piIP.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setLoading(true);

    // Validate IP format (basic check)
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipPattern.test(piIP.trim())) {
      Alert.alert("Invalid IP", "Please enter a valid IP address (e.g., 192.168.1.100)");
      setLoading(false);
      return;
    }

    // Test connection to Pi
    try {
      const response = await fetch(`http://${piIP.trim()}:3001/api/status`, {
        signal: createTimeoutSignal(3000),
      });

      if (!response.ok) {
        throw new Error("Device not reachable");
      }

      // Navigate to edit screen
      router.push({
        pathname: "/device/[id]/edit",
        params: {
          id: deviceCode.trim(),
          name: `Test Device (${deviceCode.trim()})`,
          localIP: piIP.trim(),
          localPort: "3001",
        },
      });
    } catch (error: any) {
      Alert.alert(
        "Connection Failed",
        `Could not connect to device at ${piIP.trim()}:3001\n\n${error.message}\n\nMake sure:\n- Pi is on the same network\n- Device-agent server is running\n- IP address is correct`
      );
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={100}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Test Device</Text>
          <Text style={styles.subtitle}>
            Enter device code and Pi IP to bypass registration and test directly
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Device Code</Text>
            <TextInput
              style={styles.input}
              placeholder="TEST123456"
              placeholderTextColor={COLORS.textDim}
              value={deviceCode}
              onChangeText={setDeviceCode}
              autoCapitalize="characters"
              maxLength={10}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Pi IP Address</Text>
            <TextInput
              style={styles.input}
              placeholder="192.168.1.100"
              placeholderTextColor={COLORS.textDim}
              value={piIP}
              onChangeText={setPiIP}
              keyboardType="numeric"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            <Text style={styles.hint}>
              The IP address of your Raspberry Pi on the local network
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, (!canSubmit || loading) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? "Connecting..." : "Connect to Device"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.info}>
          <Text style={styles.infoTitle}>Note:</Text>
          <Text style={styles.infoText}>
            This screen is for testing only. Make sure the test device exists in the database
            (run: npm run create-test-device in the app folder).
          </Text>
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
    padding: 20,
    justifyContent: "center",
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textMuted,
    lineHeight: 22,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  hint: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.background,
  },
  info: {
    marginTop: 32,
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
});
