import React, { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, RefreshControl, Modal, TextInput, Alert, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { dbService, RealPost, RealStory, RealUser, uploadFileToStorage } from "../../src/utils/dbService";
import { COLORS, SPACING, RADIUS, FONTS } from "../../src/utils/theme";

export default function HomeScreen() {
  const [user, setUser] = useState<RealUser | null>(null);
  const [posts, setPosts] = useState<RealPost[]>([]);
  const [stories, setStories] = useState<RealStory[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeStory, setActiveStory] = useState<RealStory | null>(null);
  const [createModal, setCreateModal] = useState(false);
  const [createType, setCreateType] = useState<"post" | "story">("post");
  const [caption, setCaption] = useState("");
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [u, p, s] = await Promise.all([dbService.getActiveUser(), dbService.getPosts(), dbService.getStories()]);
      setUser(u); setPosts(p); setStories(s);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled) setPickedUri(result.assets[0].uri);
  };

  const handleCreate = async () => {
    if (!pickedUri) { Alert.alert("Pick an image first"); return; }
    setUploading(true);
    try {
      const folder = createType === "story" ? "stories" : "posts";
      const url = await uploadFileToStorage(pickedUri, folder, "image/jpeg");
      if (createType === "story") { await dbService.addStory(url); }
      else { await dbService.createPost(caption, url); }
      setCreateModal(false); setCaption(""); setPickedUri(null);
      load();
    } catch (e: any) { Alert.alert("Upload Failed", e.message); } finally { setUploading(false); }
  };

  const renderStory = ({ item }: { item: RealStory }) => (
    <TouchableOpacity onPress={() => setActiveStory(item)} style={styles.storyWrap}>
      <LinearGradient colors={[COLORS.primary, COLORS.primaryLight, COLORS.accent]} style={styles.storyRing}>
        <Image source={{ uri: item.userAvatar }} style={styles.storyAvatar} />
      </LinearGradient>
      <Text style={styles.storyName} numberOfLines={1}>{item.userUsername || item.userName}</Text>
    </TouchableOpacity>
  );

  const renderPost = ({ item }: { item: RealPost }) => (
    <View style={styles.postCard}>
      <TouchableOpacity style={styles.postHeader} onPress={() => router.push(`/user/${item.authorUsername}`)}>
        <Image source={{ uri: item.authorAvatar }} style={styles.postAvatar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.postAuthor}>{item.authorName}</Text>
          <Text style={styles.postUsername}>@{item.authorUsername} · {item.createdAt}</Text>
        </View>
      </TouchableOpacity>
      {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.postImage} resizeMode="cover" /> : null}
      {item.caption ? <Text style={styles.postCaption}>{item.caption}</Text> : null}
      {item.aiTags?.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm }}>
          {item.aiTags.map(tag => (
            <View key={tag} style={styles.tag}><Text style={styles.tagText}>#{tag}</Text></View>
          ))}
        </ScrollView>
      )}
      <View style={styles.postActions}>
        <TouchableOpacity style={styles.actionBtn}><Text style={styles.actionIcon}>❤️</Text><Text style={styles.actionCount}>Like</Text></TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}><Text style={styles.actionIcon}>💬</Text><Text style={styles.actionCount}>Comment</Text></TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}><Text style={styles.actionIcon}>🔗</Text><Text style={styles.actionCount}>Share</Text></TouchableOpacity>
      </View>
    </View>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Loop</Text>
        <TouchableOpacity onPress={() => setCreateModal(true)} style={styles.createBtn}>
          <LinearGradient colors={[COLORS.primary, COLORS.primaryLight]} style={styles.createBtnGrad}>
            <Text style={{ color: "#fff", fontSize: 20 }}>+</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        keyExtractor={i => i.id}
        renderItem={renderPost}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[COLORS.primary]} />}
        ListHeaderComponent={
          stories.length > 0 ? (
            <View style={styles.storiesSection}>
              <FlatList horizontal data={stories} keyExtractor={s => s.id} renderItem={renderStory} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm }} />
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 80 }}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No posts yet. Be the first!</Text></View>}
      />

      {/* Story Viewer Modal */}
      <Modal visible={!!activeStory} transparent animationType="fade">
        <View style={styles.storyModal}>
          <TouchableOpacity style={styles.storyClose} onPress={() => setActiveStory(null)}>
            <Text style={{ color: "#fff", fontSize: 28 }}>✕</Text>
          </TouchableOpacity>
          {activeStory && <Image source={{ uri: activeStory.mediaUrl }} style={styles.storyFullImg} resizeMode="contain" />}
          {activeStory && (
            <View style={styles.storyUserRow}>
              <Image source={{ uri: activeStory.userAvatar }} style={{ width: 36, height: 36, borderRadius: 18, marginRight: 8 }} />
              <Text style={{ color: "#fff", fontWeight: "700" }}>@{activeStory.userUsername}</Text>
            </View>
          )}
        </View>
      </Modal>

      {/* Create Modal */}
      <Modal visible={createModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create</Text>
            <View style={styles.typeRow}>
              {(["post", "story"] as const).map(t => (
                <TouchableOpacity key={t} onPress={() => setCreateType(t)} style={[styles.typeBtn, createType === t && styles.typeBtnActive]}>
                  <Text style={[styles.typeBtnText, createType === t && { color: "#fff" }]}>{t === "post" ? "📸 Post" : "⏳ Story"}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {createType === "post" && <TextInput style={styles.captionInput} placeholder="Write a caption..." placeholderTextColor={COLORS.outline} value={caption} onChangeText={setCaption} multiline />}
            <TouchableOpacity style={styles.pickBtn} onPress={pickImage}>
              {pickedUri ? <Image source={{ uri: pickedUri }} style={styles.pickedImg} /> : <Text style={{ color: COLORS.primary, fontWeight: "600" }}>📷 Choose Photo</Text>}
            </TouchableOpacity>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.surfaceContainer, flex: 1 }]} onPress={() => { setCreateModal(false); setPickedUri(null); setCaption(""); }}>
                <Text style={{ color: COLORS.onSurface, fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { flex: 1, overflow: "hidden" }]} onPress={handleCreate} disabled={uploading}>
                <LinearGradient colors={[COLORS.primary, COLORS.primaryLight]} style={StyleSheet.absoluteFill} />
                {uploading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700" }}>Share</Text>}
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
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.05)", backgroundColor: "#fff" },
  headerTitle: { fontSize: 28, color: COLORS.primary, ...FONTS.extrabold },
  createBtn: { width: 40, height: 40, borderRadius: 20, overflow: "hidden" },
  createBtnGrad: { flex: 1, alignItems: "center", justifyContent: "center" },
  storiesSection: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.05)" },
  storyWrap: { alignItems: "center", marginRight: SPACING.md, width: 68 },
  storyRing: { width: 64, height: 64, borderRadius: 32, padding: 2.5, marginBottom: 4 },
  storyAvatar: { width: "100%", height: "100%", borderRadius: 30, borderWidth: 2, borderColor: "#fff" },
  storyName: { fontSize: 11, color: COLORS.onSurfaceVariant, textAlign: "center", maxWidth: 64 },
  postCard: { backgroundColor: "#fff", marginBottom: 8 },
  postHeader: { flexDirection: "row", alignItems: "center", padding: SPACING.lg },
  postAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: SPACING.md },
  postAuthor: { fontSize: 14, color: COLORS.onSurface, ...FONTS.bold },
  postUsername: { fontSize: 12, color: COLORS.onSurfaceVariant },
  postImage: { width: "100%", aspectRatio: 1 },
  postCaption: { padding: SPACING.lg, fontSize: 14, color: COLORS.onSurface, lineHeight: 20 },
  tag: { backgroundColor: `${COLORS.primary}15`, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3, marginRight: 6 },
  tagText: { color: COLORS.primary, fontSize: 12, ...FONTS.semibold },
  postActions: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.05)" },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: SPACING.sm, gap: 4 },
  actionIcon: { fontSize: 18 },
  actionCount: { fontSize: 13, color: COLORS.onSurfaceVariant, ...FONTS.medium },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { color: COLORS.onSurfaceVariant, fontSize: 15 },
  storyModal: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center", alignItems: "center" },
  storyClose: { position: "absolute", top: 60, right: 24, zIndex: 10 },
  storyFullImg: { width: "100%", height: "75%", maxHeight: 600 },
  storyUserRow: { position: "absolute", top: 80, left: 20, flexDirection: "row", alignItems: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.xxl, paddingBottom: SPACING.xxxl },
  modalTitle: { fontSize: 20, ...FONTS.bold, marginBottom: SPACING.lg },
  typeRow: { flexDirection: "row", gap: 12, marginBottom: SPACING.lg },
  typeBtn: { flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.md, alignItems: "center", backgroundColor: COLORS.surfaceLow, borderWidth: 1, borderColor: "rgba(0,0,0,0.06)" },
  typeBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeBtnText: { fontSize: 14, ...FONTS.semibold, color: COLORS.onSurface },
  captionInput: { backgroundColor: COLORS.surfaceLow, borderRadius: RADIUS.md, padding: SPACING.md, fontSize: 14, color: COLORS.onSurface, marginBottom: SPACING.md, minHeight: 80, textAlignVertical: "top" },
  pickBtn: { backgroundColor: COLORS.surfaceLow, borderRadius: RADIUS.md, padding: SPACING.lg, alignItems: "center", marginBottom: SPACING.lg, minHeight: 80, justifyContent: "center" },
  pickedImg: { width: "100%", height: 160, borderRadius: RADIUS.md },
  modalBtn: { paddingVertical: SPACING.md, borderRadius: RADIUS.md, alignItems: "center", justifyContent: "center", height: 48 },
});
