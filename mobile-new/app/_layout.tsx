/**
 * Root layout — wraps the entire app with providers.
 */

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "@/lib/constants";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerTitleStyle: { fontWeight: "600" },
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="device/[id]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="setup"
          options={{
            headerShown: false,
            presentation: "modal",
          }}
        />
      </Stack>
    </>
  );
}
