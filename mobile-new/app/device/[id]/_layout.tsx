import { Stack, useLocalSearchParams } from "expo-router";
import { COLORS } from "@/lib/constants";

export default function DeviceLayout() {
  const { name } = useLocalSearchParams<{ name?: string }>();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.text,
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: name || "Device" }}
      />
      <Stack.Screen
        name="edit"
        options={{ title: "Edit Dashboard", headerShown: false }}
      />
      <Stack.Screen
        name="ha-entities"
        options={{ title: "HA Entities", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="settings"
        options={{ title: "Device Settings", headerBackTitle: "Back" }}
      />
    </Stack>
  );
}
