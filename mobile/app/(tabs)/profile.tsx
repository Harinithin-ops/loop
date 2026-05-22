import React, { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, TextInput, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { dbService, RealUser, RealPost, uploadFileToStorage } from "../../src/utils/dbService";
import { COLORS, SPACING, RADIUS, FONTS } from "../../src/utils/theme";

export default function ProfileScreen() {
  const [user, setUser] = useState<RealUser | null>(null);
  const [posts, setPosts] = useState<RealPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [gmail, setGmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const load = async () => {
    const u = await dbService.getActiveUser();
    setUser(u);
    if (u) { const p = await dbService.getPostsByUserId(u.id); setPosts(p); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openEdit = () => {
    if (!user) return;
    setFullName(user.fullName); setBio(user.bio || ""); setGmail(user.gmail || "");
    setEditModal(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    await dbService.updateProfile({ full_name: fullName, bio, gmail });
    await load(); setEditModal(false); setSaving(false);
  };

  const changeAvatar = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (res.canceled) return;
    setAvatarLoading(true);
    try {
      const url = await uploadFileToStorage(res.assets[0].uri, "avatars", "image/jpeg");
      await dbService.updateProfile({ avatar_url: url });
      await load();
    } catch (e: any) { Alert.alert("Error", e.message); } finally { setAvatarLoading(false); }
  };

  const signOut = () => {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: async () => { await dbService.signOut(); router.replace("/(auth)/login"); } },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  if (!user) return <View style={styles.center}><Text>Not logged in</Text></View>;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header gradient */}
        <LinearGradient colors={[COLORS.primary, COLORS.primaryLight]} style={styles.banner} />

        <View style={styles.profileSection}>
          {/* Avatar */}
          <TouchableOpacity onPress={changeAvatar} style={styles.avatarWrap}>
            {avatarLoading ? <View style={[styles.avatar, { backgroundColor: COLORS.surfaceLow, alignItems: "center", justifyContent: "center" }]}><ActivityIndicator color={COLORS.primary} /></View> : <Image source={{ uri: user.avatar }} style={styles.avatar} />}
            <View style={styles.editAvatarBadge}><Text style={{ fontSize: 14 }}>📷</Text></View>
          </TouchableOpacity>

          <View style={{ flex: 1, paddingLeft: SPACING.md }}>
            <Text style={styles.name}>{user.fullName}</Text>
            <Text style={styles.username}>@{user.username}</Text>
            {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.stat}><Text style={styles.statNum}>{posts.length}</Text><Text style={styles.statLabel}>Posts</Text></View>
          <View style={[styles.stat, styles.statDivider]}><Text style={styles.statNum}>–</Text><Text style={styles.statLabel}>Followers</Text></View>
          <View style={styles.stat}><Text style={styles.statNum}>–</Text><Text style={styles.statLabel}>Following</Text></View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.editBtn} onPress={openEdit}>
            <Text style={{ color: COLORS.onSurface, ...FONTS.bold, fontSize: 14 }}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
            <Text style={{ color: COLORS.error, ...FONTS.bold, fontSize: 14 }}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Posts grid */}
        <Text style={styles.sectionTitle}>Posts</Text>
        {posts.length === 0 ? (
          <View style={{ alignItems: "center", padding: 40 }}>
            <Text style={{ fontSize: 36 }}>📸</Text>
            <Text style={{ color: COLORS.onSurfaceVariant, marginTop: 12 }}>No posts yet</Text>
          </View>
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

      {/* Edit Profile Modal */}
      <Modal visible={editModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Full Name" />
            <Text style={styles.fieldLabel}>Bio</Text>
            <TextInput style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]} value={bio} onChangeText={setBio} placeholder="Tell people about yourself..." multiline />
            <Text style={styles.fieldLabel}>Gmail</Text>
            <TextInput style={styles.input} value={gmail} onChangeText={setGmail} placeholder="your@gmail.com" keyboardType="email-address" autoCapitalize="none" />
            <View style={{ flexDirection: "row", gap: 12, marginTop: SPACING.md }}>
              <TouchableOpacity onPress={() => setEditModal(false)} style={[styles.modalBtn, { backgroundColor: COLORS.surfaceContainer }]}>
                <Text style={{ color: COLORS.onSurface, ...FONTS.bold }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveEdit} style={[styles.modalBtn, { overflow: "hidden" }]} disabled={saving}>
                <LinearGradient colors={[COLORS.primary, COLORS.primaryLight]} style={StyleSheet.absoluteFill} />
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", ...FONTS.bold }}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  banner: { height: 120 },
  profileSection: { flexDirection: "row", padding: SPACING.lg, marginTop: -40, alignItems: "flex-end" },
  avatarWrap: { position: "relative" },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 4, borderColor: "#fff" },
  editAvatarBadge: { position: "absolute", bottom: 0, right: 0, backgroundColor: "#fff", borderRadius: 12, width: 24, height: 24, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  name: { fontSize: 18, ...FONTS.bold, color: COLORS.onSurface },
  username: { fontSize: 13, color: COLORS.primary, ...FONTS.medium },
  bio: { fontSize: 13, color: COLORS.onSurfaceVariant, marginTop: 4 },
  stats: { flexDirection: "row", borderTopWidth: 1, borderBottomWidth: 1, borderColor: "rgba(0,0,0,0.06)", marginHorizontal: SPACING.lg, borderRadius: RADIUS.md, backgroundColor: "#fff", marginBottom: SPACING.lg },
  stat: { flex: 1, alignItems: "center", paddingVertical: SPACING.md },
  statDivider: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: "rgba(0,0,0,0.06)" },
  statNum: { fontSize: 20, ...FONTS.bold, color: COLORS.onSurface },
  statLabel: { fontSize: 12, color: COLORS.onSurfaceVariant },
  actionsRow: { flexDirection: "row", paddingHorizontal: SPACING.lg, gap: 12, marginBottom: SPACING.lg },
  editBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, backgroundColor: "#fff", alignItems: "center", borderWidth: 1, borderColor: "rgba(0,0,0,0.1)" },
  signOutBtn: { paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderRadius: RADIUS.md, backgroundColor: `${COLORS.error}15`, alignItems: "center" },
  sectionTitle: { fontSize: 16, ...FONTS.bold, paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: SPACING.lg, gap: 2 },
  gridItem: { width: "32.5%", overflow: "hidden", borderRadius: 4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.xxl, paddingBottom: SPACING.xxxl },
  modalTitle: { fontSize: 20, ...FONTS.bold, marginBottom: SPACING.lg },
  fieldLabel: { fontSize: 12, ...FONTS.semibold, color: COLORS.onSurfaceVariant, marginBottom: 4 },
  input: { backgroundColor: COLORS.surfaceLow, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2, fontSize: 14, color: COLORS.onSurface, marginBottom: SPACING.md, borderWidth: 1, borderColor: "rgba(0,0,0,0.06)" },
  modalBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, alignItems: "center", justifyContent: "center", height: 48 },
});
