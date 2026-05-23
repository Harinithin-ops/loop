import React, { useState, useEffect, useRef } from "react";
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, Alert } from "react-native";
import { Video, ResizeMode } from "expo-av";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { dbService, RealReel, RealUser } from "../../src/utils/dbService";
import { COLORS, SPACING, FONTS } from "../../src/utils/theme";

const { height: SCREEN_H } = Dimensions.get("window");
const REEL_HEIGHT = SCREEN_H - 64;

export default function ReelsScreen() {
  const [reels, setReels] = useState<RealReel[]>([]);
  const [user, setUser] = useState<RealUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 70 });

  useEffect(() => {
    Promise.all([dbService.getReels(), dbService.getActiveUser()]).then(([r, u]) => {
      setReels(r); setUser(u); setLoading(false);
    });
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems[0]) setActiveIndex(viewableItems[0].index);
  });

  const toggleLike = (id: string) => setLiked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleDelete = async (id: string) => {
    Alert.alert("Delete Reel", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        const ok = await dbService.deleteReel(id);
        if (ok) setReels(p => p.filter(r => r.id !== id));
        else Alert.alert("Error", "Could not delete reel");
      }},
    ]);
  };

  const renderReel = ({ item, index }: { item: RealReel; index: number }) => {
    const isLiked = liked.has(item.id);
    const isOwner = user?.id === item.userId;
    return (
      <View style={[styles.reel]}>
        <Video source={{ uri: item.videoUrl }} style={StyleSheet.absoluteFill} resizeMode={ResizeMode.COVER} isLooping shouldPlay={index === activeIndex} isMuted={index !== activeIndex} />
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.8)"]} style={styles.gradient} />
        {/* User info */}
        <View style={styles.bottomInfo}>
          <TouchableOpacity style={styles.userRow} onPress={() => router.push(`/user/${item.userUsername || item.userId}`)}>
            <Image source={{ uri: item.userAvatar }} style={styles.avatar} />
            <Text style={styles.username}>@{item.userUsername || item.userName}</Text>
          </TouchableOpacity>
          {item.caption ? <Text style={styles.caption} numberOfLines={2}>{item.caption}</Text> : null}
        </View>
        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => toggleLike(item.id)}>
            <Text style={[styles.actionIcon, isLiked && { color: "#ff3040" }]}>❤️</Text>
            <Text style={styles.actionLabel}>{item.likesCount + (isLiked ? 1 : 0)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}><Text style={styles.actionIcon}>💬</Text><Text style={styles.actionLabel}>0</Text></TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}><Text style={styles.actionIcon}>↗️</Text></TouchableOpacity>
          {isOwner && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id)}>
              <Text style={[styles.actionIcon, { color: "#ff3040" }]}>🗑️</Text>
            </TouchableOpacity>
          )}
          {/* Spinning avatar disc */}
          <Image source={{ uri: item.userAvatar }} style={styles.disc} />
        </View>
      </View>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  if (reels.length === 0) return (
    <SafeAreaView style={styles.center}>
      <Text style={{ fontSize: 40 }}>🎬</Text>
      <Text style={{ color: COLORS.onSurfaceVariant, marginTop: 12, fontSize: 16 }}>No reels yet</Text>
    </SafeAreaView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <FlatList
        data={reels} keyExtractor={r => r.id} renderItem={renderReel}
        pagingEnabled snapToInterval={REEL_HEIGHT} decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig.current}
        getItemLayout={(_, i) => ({ length: REEL_HEIGHT, offset: REEL_HEIGHT * i, index: i })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  reel: { height: REEL_HEIGHT, backgroundColor: "#000" },
  gradient: { position: "absolute", bottom: 0, left: 0, right: 0, height: 280 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background },
  bottomInfo: { position: "absolute", bottom: 80, left: SPACING.lg, right: 80 },
  userRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: "#fff", marginRight: 8 },
  username: { color: "#fff", ...FONTS.bold, fontSize: 14 },
  caption: { color: "rgba(255,255,255,0.9)", fontSize: 13 },
  actions: { position: "absolute", bottom: 80, right: SPACING.md, alignItems: "center", gap: 20 },
  actionBtn: { alignItems: "center" },
  actionIcon: { fontSize: 28, color: "#fff" },
  actionLabel: { color: "#fff", fontSize: 12, ...FONTS.bold, marginTop: 2 },
  disc: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: "rgba(255,255,255,0.3)", marginTop: 8 },
});
