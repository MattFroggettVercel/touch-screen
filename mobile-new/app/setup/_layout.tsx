import { Stack } from "expo-router";
import { COLORS } from "@/lib/constants";

export default function SetupLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.text,
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen name="scan" options={{ title: "Add Device" }} />
      <Stack.Screen name="wifi-select" options={{ title: "Select WiFi" }} />
      <Stack.Screen name="wifi-password" options={{ title: "WiFi Password" }} />
      <Stack.Screen name="connecting" options={{ title: "Connecting", headerBackVisible: false }} />
      <Stack.Screen name="complete" options={{ title: "Setup Complete", headerBackVisible: false }} />
    </Stack>
  );
}
