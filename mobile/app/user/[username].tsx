import React, { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { dbService, RealPost, UserProfile, FollowStatus } from "../../src/utils/dbService";
import { COLORS, SPACING, RADIUS, FONTS } from "../../src/utils/theme";

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<RealPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [followStatus, setFollowStatus] = useState<FollowStatus>("none");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);

  const load = async () => {
    if (!username) return;
    const [u, p] = await Promise.all([dbService.getActiveUser(), dbService.getProfileByUsername(username as string)]);
    setCurrentUserId(u?.id || null);
    setProfile(p);
    if (p) {
      const [postsData, status] = await Promise.all([dbService.getPostsByUserId(p.id), dbService.getFollowStatus(p.id)]);
      setPosts(postsData); setFollowStatus(status);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [username]);

  const handleFollow = async () => {
    if (!profile || !currentUserId) return;
    setFollowLoading(true);
    if (followStatus === "none") {
      await dbService.sendFollowRequest(profile.id);
      setFollowStatus("pending");
    } else if (followStatus === "pending") {
      await dbService.cancelFollowRequest(profile.id);
      setFollowStatus("none");
    } else if (followStatus === "following") {
      Alert.alert("Unfollow", `Unfollow @${profile.username}?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Unfollow", style: "destructive", onPress: async () => { await dbService.unfollowUser(profile.id); setFollowStatus("none"); } },
      ]);
    }
    setFollowLoading(false);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  if (!profile) return <View style={styles.center}><Text style={{ color: COLORS.onSurfaceVariant }}>User not found</Text></View>;

  const isOwn = currentUserId === profile.id;
  const btnLabel = isOwn ? "Edit Profile" : followStatus === "none" ? "Follow" : followStatus === "pending" ? "Requested" : "Following";
  const btnColor = followStatus === "following" ? COLORS.surfaceContainer : COLORS.primary;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Back button */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ fontSize: 22, color: COLORS.onSurface }}>←</Text>
        </TouchableOpacity>

        <LinearGradient colors={[COLORS.primary, COLORS.primaryLight]} style={styles.banner} />

        <View style={styles.profileSection}>
          <Image source={{ uri: profile.avatar }} style={styles.avatar} />
          <View style={{ flex: 1, paddingLeft: SPACING.md }}>
            <Text style={styles.name}>{profile.fullName}</Text>
            <Text style={styles.username}>@{profile.username}</Text>
          </View>
        </View>

        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

        <View style={styles.stats}>
          <View style={styles.stat}><Text style={styles.statNum}>{profile.postCount}</Text><Text style={styles.statLabel}>Posts</Text></View>
          <View style={[styles.stat, styles.divider]}><Text style={styles.statNum}>{profile.followerCount}</Text><Text style={styles.statLabel}>Followers</Text></View>
          <View style={styles.stat}><Text style={styles.statNum}>{profile.followingCount}</Text><Text style={styles.statLabel}>Following</Text></View>
        </View>

        <View style={{ paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg }}>
          <TouchableOpacity onPress={isOwn ? () => router.push("/(tabs)/profile") : handleFollow} disabled={followLoading} style={[styles.followBtn, { backgroundColor: followStatus === "following" ? COLORS.surfaceContainer : undefined, overflow: "hidden" }]}>
            {followStatus !== "following" && !isOwn && <LinearGradient colors={[COLORS.primary, COLORS.primaryLight]} style={StyleSheet.absoluteFill} />}
            {followLoading ? <ActivityIndicator color={followStatus === "following" ? COLORS.onSurface : "#fff"} /> : <Text style={[styles.followBtnText, followStatus === "following" && { color: COLORS.onSurface }]}>{btnLabel}</Text>}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Posts</Text>
        {posts.length === 0 ? (
          <View style={{ alignItems: "center", padding: 32 }}><Text style={{ fontSize: 32 }}>📸</Text><Text style={{ color: COLORS.onSurfaceVariant, marginTop: 8 }}>No posts yet</Text></View>
        ) : (
          <View style={styles.grid}>
            {posts.map(p => (
              <TouchableOpacity key={p.id} style={styles.gridItem}>
                <Image source={{ uri: p.imageUrl }} style={{ width: "100%", aspectRatio: 1 }} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  backBtn: { position: "absolute", top: 16, left: 16, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center" },
  banner: { height: 120 },
  profileSection: { flexDirection: "row", padding: SPACING.lg, marginTop: -44, alignItems: "flex-end" },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 4, borderColor: "#fff" },
  name: { fontSize: 18, ...FONTS.bold, color: COLORS.onSurface },
  username: { fontSize: 13, color: COLORS.primary },
  bio: { paddingHorizontal: SPACING.lg, fontSize: 14, color: COLORS.onSurfaceVariant, marginBottom: SPACING.lg, lineHeight: 20 },
  stats: { flexDirection: "row", borderTopWidth: 1, borderBottomWidth: 1, borderColor: "rgba(0,0,0,0.06)", marginHorizontal: SPACING.lg, borderRadius: RADIUS.md, backgroundColor: "#fff", marginBottom: SPACING.lg },
  stat: { flex: 1, alignItems: "center", paddingVertical: SPACING.md },
  divider: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: "rgba(0,0,0,0.06)" },
  statNum: { fontSize: 20, ...FONTS.bold, color: COLORS.onSurface },
  statLabel: { fontSize: 12, color: COLORS.onSurfaceVariant },
  followBtn: { paddingVertical: SPACING.md, borderRadius: RADIUS.md, alignItems: "center", justifyContent: "center", height: 46 },
  followBtnText: { color: "#fff", fontSize: 15, ...FONTS.bold },
  sectionTitle: { fontSize: 16, ...FONTS.bold, paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: SPACING.lg, gap: 2 },
  gridItem: { width: "32.5%", borderRadius: 4, overflow: "hidden" },
});
