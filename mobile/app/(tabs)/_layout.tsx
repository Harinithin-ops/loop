import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../../src/utils/theme";

const TabIcon = ({ focused, label, icon }: { focused: boolean; label: string; icon: string }) => (
  <View style={styles.tabItem}>
    <Text style={[styles.icon, focused && styles.iconActive]}>{icon}</Text>
    <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
  </View>
);

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: styles.tabBar,
      tabBarShowLabel: false,
    }}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Home" icon="🏠" /> }} />
      <Tabs.Screen name="explore" options={{ title: "Explore", tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Explore" icon="🔍" /> }} />
      <Tabs.Screen name="reels" options={{ title: "Reels", tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Reels" icon="🎬" /> }} />
      <Tabs.Screen name="messages" options={{ title: "Messages", tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Messages" icon="💬" /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Profile" icon="👤" /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: { backgroundColor: "#fff", borderTopWidth: 0, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 16, height: 64, paddingBottom: 8 },
  tabItem: { alignItems: "center", justifyContent: "center", paddingTop: 6 },
  icon: { fontSize: 22, opacity: 0.5 },
  iconActive: { opacity: 1 },
  label: { fontSize: 10, color: COLORS.outline, marginTop: 2 },
  labelActive: { color: COLORS.primary, fontWeight: "700" },
});
