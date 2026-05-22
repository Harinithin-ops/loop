import React, { useState, useEffect, useRef } from "react";
import { View, Text, FlatList, Image, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { dbService, RealChat, RealUser, FollowRequest } from "../../src/utils/dbService";
import { COLORS, SPACING, RADIUS, FONTS } from "../../src/utils/theme";

export default function MessagesScreen() {
  const [user, setUser] = useState<RealUser | null>(null);
  const [chats, setChats] = useState<RealChat[]>([]);
  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [tab, setTab] = useState<"chats" | "requests">("chats");
  const [selectedChat, setSelectedChat] = useState<RealChat | null>(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const listRef = useRef<FlatList>(null);

  const load = async () => {
    const u = await dbService.getActiveUser();
    setUser(u);
    if (u) {
      const [c, r] = await Promise.all([dbService.getChats(), dbService.getIncomingRequests()]);
      setChats(c); setRequests(r);
    }
    setLoading(false);
  };

  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, []);

  const sendMessage = async () => {
    if (!message.trim() || !selectedChat || !user) return;
    const txt = message; setMessage("");
    const opt = { id: "tmp_" + Date.now(), senderId: user.id, senderName: user.fullName, senderAvatar: user.avatar, text: txt, createdAt: new Date().toISOString(), isRead: false };
    setChats(p => p.map(c => c.id === selectedChat.id ? { ...c, messages: [...c.messages, opt] } : c));
    setSelectedChat(p => p ? { ...p, messages: [...p.messages, opt] } : p);
    await dbService.sendMessage(selectedChat.id, txt);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 200);
  };

  const acceptRequest = async (req: FollowRequest) => {
    setRequests(p => p.filter(r => r.id !== req.id));
    await dbService.acceptFollowRequest(req.id);
    await load();
    setTab("chats");
  };

  const fmt = (d: string) => { if (!d) return ""; const ms = Date.now() - new Date(d).getTime(); const m = Math.floor(ms / 60000); const h = Math.floor(ms / 3600000); if (m < 1) return "now"; if (m < 60) return `${m}m`; if (h < 24) return `${h}h`; return `${Math.floor(ms / 86400000)}d`; };
  const filtered = chats.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.username.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;

  // Chat window
  if (selectedChat) {
    const msgs = chats.find(c => c.id === selectedChat.id)?.messages || selectedChat.messages;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={() => setSelectedChat(null)} style={{ padding: 8 }}><Text style={{ fontSize: 22 }}>←</Text></TouchableOpacity>
          <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", flex: 1 }} onPress={() => router.push(`/user/${selectedChat.username}`)}>
            <Image source={{ uri: selectedChat.avatar }} style={styles.chatAvatar} />
            <View>
              <Text style={styles.chatName}>{selectedChat.name}</Text>
              <Text style={styles.chatUsername}>@{selectedChat.username}</Text>
            </View>
          </TouchableOpacity>
        </View>
        <FlatList ref={listRef} data={msgs} keyExtractor={m => m.id} contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 12 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item: m }) => {
            const mine = m.senderId === user?.id;
            return (
              <View style={[styles.msgRow, mine && { justifyContent: "flex-end" }]}>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                  <Text style={[styles.bubbleText, mine && { color: "#fff" }]}>{m.text}</Text>
                  <Text style={[styles.bubbleTime, mine && { color: "rgba(255,255,255,0.7)" }]}>{fmt(m.createdAt)} {mine && (m.isRead ? "✓✓" : "✓")}</Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={{ textAlign: "center", color: COLORS.onSurfaceVariant, marginTop: 40 }}>Say hello 👋</Text>}
        />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.inputRow}>
            <TextInput style={styles.msgInput} placeholder={`Message @${selectedChat.username}...`} placeholderTextColor={COLORS.outline} value={message} onChangeText={setMessage} multiline />
            <TouchableOpacity onPress={sendMessage} style={styles.sendBtn} disabled={!message.trim()}>
              <Text style={{ color: "#fff", fontSize: 18 }}>↑</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>Messages</Text>
      {/* Tabs */}
      <View style={styles.tabs}>
        {(["chats", "requests"] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tabBtn, tab === t && styles.tabBtnActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === "chats" ? "Chats" : `Requests${requests.length > 0 ? ` (${requests.length})` : ""}`}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "chats" ? (
        <>
          <View style={styles.searchBar}>
            <Text style={{ marginRight: 6 }}>🔍</Text>
            <TextInput style={{ flex: 1, fontSize: 14, color: COLORS.onSurface }} placeholder="Search..." placeholderTextColor={COLORS.outline} value={search} onChangeText={setSearch} />
          </View>
          <FlatList data={filtered} keyExtractor={c => c.id}
            renderItem={({ item: c }) => {
              const last = c.messages[c.messages.length - 1];
              return (
                <TouchableOpacity style={styles.chatRow} onPress={() => setSelectedChat(c)}>
                  <View style={{ position: "relative" }}>
                    <Image source={{ uri: c.avatar }} style={styles.chatRowAvatar} />
                    {c.unreadCount > 0 && <View style={styles.badge}><Text style={{ color: "#fff", fontSize: 10 }}>{c.unreadCount}</Text></View>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={styles.chatRowName}>{c.name}</Text>
                      {last && <Text style={styles.chatRowTime}>{fmt(last.createdAt)}</Text>}
                    </View>
                    <Text style={styles.chatRowUsername}>@{c.username}</Text>
                    {last && <Text style={[styles.chatRowLast, c.unreadCount > 0 && { ...FONTS.bold, color: COLORS.onSurface }]} numberOfLines={1}>{last.senderId === user?.id ? "You: " : ""}{last.text}</Text>}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={<View style={styles.center}><Text style={{ fontSize: 36 }}>💬</Text><Text style={{ color: COLORS.onSurfaceVariant, marginTop: 12 }}>No chats yet. Accept requests to chat.</Text></View>}
            contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 80 }}
          />
        </>
      ) : (
        <FlatList data={requests} keyExtractor={r => r.id}
          renderItem={({ item: r }) => (
            <View style={styles.reqCard}>
              <TouchableOpacity onPress={() => router.push(`/user/${r.senderUsername}`)}>
                <Image source={{ uri: r.senderAvatar }} style={styles.reqAvatar} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.reqName}>{r.senderName}</Text>
                <Text style={{ color: COLORS.primary, fontSize: 12 }}>@{r.senderUsername}</Text>
                <Text style={{ color: COLORS.outline, fontSize: 11 }}>{fmt(r.createdAt)}</Text>
              </View>
              <View style={{ gap: 8 }}>
                <TouchableOpacity onPress={() => acceptRequest(r)} style={styles.acceptBtn}><Text style={{ color: "#fff", ...FONTS.bold, fontSize: 13 }}>✓ Accept</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => dbService.rejectFollowRequest(r.id).then(() => setRequests(p => p.filter(x => x.id !== r.id)))} style={styles.rejectBtn}><Text style={{ color: COLORS.onSurfaceVariant, fontSize: 13 }}>Decline</Text></TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<View style={styles.center}><Text style={{ color: COLORS.onSurfaceVariant }}>No pending requests</Text></View>}
          contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 80 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  title: { fontSize: 26, ...FONTS.bold, color: COLORS.onSurface, padding: SPACING.lg, paddingBottom: SPACING.sm },
  tabs: { flexDirection: "row", paddingHorizontal: SPACING.lg, gap: 12, marginBottom: SPACING.md },
  tabBtn: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, backgroundColor: COLORS.surfaceLow },
  tabBtnActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 13, ...FONTS.semibold, color: COLORS.onSurfaceVariant },
  tabTextActive: { color: "#fff" },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", marginHorizontal: SPACING.lg, borderRadius: RADIUS.lg, padding: SPACING.sm + 2, marginBottom: SPACING.md },
  chatRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, gap: 12 },
  chatRowAvatar: { width: 52, height: 52, borderRadius: 26 },
  badge: { position: "absolute", top: -4, right: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  chatRowName: { fontSize: 15, ...FONTS.bold, color: COLORS.onSurface },
  chatRowUsername: { fontSize: 12, color: COLORS.primary },
  chatRowLast: { fontSize: 13, color: COLORS.onSurfaceVariant, marginTop: 2 },
  chatRowTime: { fontSize: 11, color: COLORS.outline },
  chatHeader: { flexDirection: "row", alignItems: "center", padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.05)" },
  chatAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: SPACING.md },
  chatName: { fontSize: 16, ...FONTS.bold, color: COLORS.onSurface },
  chatUsername: { fontSize: 12, color: COLORS.primary },
  msgRow: { flexDirection: "row", marginBottom: SPACING.sm },
  bubble: { maxWidth: "75%", borderRadius: RADIUS.lg, padding: SPACING.sm + 2, paddingHorizontal: SPACING.md },
  bubbleMine: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: COLORS.surfaceLow, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, color: COLORS.onSurface, lineHeight: 20 },
  bubbleTime: { fontSize: 10, color: COLORS.outline, marginTop: 2 },
  inputRow: { flexDirection: "row", padding: SPACING.md, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.06)", alignItems: "flex-end", gap: 8, backgroundColor: "#fff" },
  msgInput: { flex: 1, backgroundColor: COLORS.surfaceLow, borderRadius: RADIUS.full, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm + 2, fontSize: 14, maxHeight: 100 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  reqCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, gap: 12 },
  reqAvatar: { width: 52, height: 52, borderRadius: 26 },
  reqName: { fontSize: 15, ...FONTS.bold, color: COLORS.onSurface },
  acceptBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  rejectBtn: { backgroundColor: COLORS.surfaceLow, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
});
