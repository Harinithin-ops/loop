import { useEffect } from "react";
import { Redirect } from "expo-router";
import { supabase } from "../src/utils/supabase";
import { useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { COLORS } from "../src/utils/theme";

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(!!data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background }}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return loggedIn ? <Redirect href="/(tabs)" /> : <Redirect href="/(auth)/login" />;
}
