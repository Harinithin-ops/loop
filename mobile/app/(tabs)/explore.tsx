import React, { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, Image, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Keyboard } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { dbService } from "../../src/utils/dbService";
import { COLORS, SPACING, RADIUS, FONTS } from "../../src/utils/theme";

type UserResult = { id: string; fullName: string; username: string; avatar: string };

export default function ExploreScreen() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<UserResult[]>([]);

  useEffect(() => {
    // Load all profiles as suggestions on mount
    const init = async () => {
      setLoading(true);
      const all = await dbService.searchUsers("a");
      setRecent(all.slice(0, 12));
      setLoading(false);
    };
    init();
  }, []);

  const search = useCallback(async (q: string) => {
    setQuery(q);
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    const res = await dbService.searchUsers(q);
    setResults(res);
    setLoading(false);
  }, []);

  const displayList = query.trim() ? results : recent;

  const renderUser = ({ item }: { item: UserResult }) => (
    <TouchableOpacity style={styles.userCard} onPress={() => { Keyboard.dismiss(); router.push(`/user/${item.username}`); }}>
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.fullName}</Text>
        <Text style={styles.username}>@{item.username}</Text>
      </View>
      <View style={styles.followBadge}><Text style={{ color: COLORS.primary, fontSize: 12, ...FONTS.semibold }}>View →</Text></View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>Explore</Text>
      <View style={styles.searchBar}>
        <Text style={{ fontSize: 18, marginRight: 8 }}>🔍</Text>
        <TextInput style={styles.searchInput} placeholder="Search users..." placeholderTextColor={COLORS.outline} value={query} onChangeText={search} autoCapitalize="none" autoCorrect={false} returnKeyType="search" />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(""); setResults([]); }}><Text style={{ color: COLORS.outline, fontSize: 18 }}>✕</Text></TouchableOpacity>
        )}
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={displayList} keyExtractor={i => i.id} renderItem={renderUser}
          ListHeaderComponent={!query.trim() ? <Text style={styles.sectionLabel}>People you may know</Text> : <Text style={styles.sectionLabel}>{results.length} result{results.length !== 1 ? "s" : ""} for "{query}"</Text>}
          ListEmptyComponent={<View style={styles.center}><Text style={{ color: COLORS.onSurfaceVariant }}>No users found</Text></View>}
          contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 80 }}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  title: { fontSize: 26, ...FONTS.bold, color: COLORS.onSurface, paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, marginBottom: SPACING.md },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", marginHorizontal: SPACING.lg, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, marginBottom: SPACING.lg },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.onSurface },
  sectionLabel: { fontSize: 13, color: COLORS.onSurfaceVariant, ...FONTS.semibold, marginBottom: SPACING.md },
  userCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: SPACING.md },
  name: { fontSize: 15, ...FONTS.bold, color: COLORS.onSurface },
  username: { fontSize: 13, color: COLORS.primary, ...FONTS.medium },
  followBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: `${COLORS.primary}15` },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
});
