/**
 * Entry point — redirects to auth or tabs based on session state.
 */

import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { authClient } from "@/lib/auth-client";
import { COLORS, AUTH_BYPASS } from "@/lib/constants";

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    // Skip auth check if bypass is enabled
    if (AUTH_BYPASS) {
      setAuthenticated(true);
      setLoading(false);
      return;
    }

    authClient.getSession()
      .then((session) => {
        setAuthenticated(!!session);
        setLoading(false);
      })
      .catch(() => {
        setAuthenticated(false);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: COLORS.background,
        }}
      >
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (authenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}
