import { supabase } from "./supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ===================== TYPES =====================
export interface RealUser { id: string; email: string; fullName: string; username: string; avatar: string; bio: string; gmail?: string; }
export interface RealPost { id: string; caption: string; imageUrl: string; authorId: string; authorName: string; authorUsername: string; authorAvatar: string; authorBio: string; createdAt: string; tone?: string; aiTags: string[]; }
export interface RealStory { id: string; mediaUrl: string; userId: string; userName: string; userUsername: string; userAvatar: string; expiresAt: string; createdAt: string; }
export interface RealReel { id: string; videoUrl: string; caption: string; userId: string; userName: string; userUsername: string; userAvatar: string; likesCount: number; createdAt: string; }
export interface RealMessage { id: string; senderId: string; senderName: string; senderAvatar: string; text: string; createdAt: string; isRead: boolean; }
export interface RealNotification { id: string; receiverId: string; senderId: string; senderName: string; senderUsername: string; senderAvatar: string; type: "like_post" | "like_reel" | "comment_post" | "follow_request"; relatedId?: string; content?: string; isRead: boolean; createdAt: string; }
export interface RealChat { id: string; name: string; username: string; avatar: string; messages: RealMessage[]; unreadCount: number; lastMessageTime: string; }
export interface UserProfile { id: string; email: string; fullName: string; username: string; avatar: string; bio: string; followerCount: number; followingCount: number; postCount: number; gmail?: string; }
export interface FollowRequest { id: string; senderId: string; senderName: string; senderUsername: string; senderAvatar: string; status: "pending" | "accepted" | "rejected"; createdAt: string; }
export type FollowStatus = "none" | "pending" | "accepted" | "following";
interface LocalFollowRequest { id: string; senderId: string; receiverId: string; status: "pending" | "accepted" | "rejected"; createdAt: string; }

// ===================== UUID =====================
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUUID = (id: string) => UUID_REGEX.test(id);

// ===================== ASYNC STORAGE HELPERS =====================
const aGet = async (key: string) => { try { return await AsyncStorage.getItem(key); } catch { return null; } };
const aSet = async (key: string, val: string) => { try { await AsyncStorage.setItem(key, val); } catch {} };
const aRemove = async (key: string) => { try { await AsyncStorage.removeItem(key); } catch {} };

const getLocalFollowRequests = async (): Promise<LocalFollowRequest[]> => {
  const raw = await aGet("loop_local_follow_requests");
  return raw ? JSON.parse(raw) : [];
};
const saveLocalFollowRequests = async (reqs: LocalFollowRequest[]) => {
  await aSet("loop_local_follow_requests", JSON.stringify(reqs));
};
const getLocalStories = async (): Promise<RealStory[]> => {
  const raw = await aGet("loop_local_stories");
  return raw ? JSON.parse(raw) : [];
};
const saveLocalStories = async (stories: RealStory[]) => {
  await aSet("loop_local_stories", JSON.stringify(stories));
};

// ===================== PROFILE CACHE =====================
const profileCache = new Map<string, { name: string; username: string; avatar: string; bio: string; gmail: string }>();

const getProfile = async (userId: string) => {
  if (profileCache.has(userId)) return profileCache.get(userId)!;
  const localAvatar = await aGet(`loop_profile_avatar_${userId}`);
  const localName = await aGet(`loop_profile_name_${userId}`);
  let dbProfile = null;
  if (isValidUUID(userId)) {
    try {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
      dbProfile = data;
    } catch {}
  }
  const result = {
    name: localName || dbProfile?.full_name || dbProfile?.username || "Unknown User",
    username: dbProfile?.username || "",
    avatar: localAvatar || dbProfile?.avatar_url || "https://ui-avatars.com/api/?name=User&background=4F6BFF&color=fff",
    bio: dbProfile?.bio || "",
    gmail: dbProfile?.gmail || "",
  };
  profileCache.set(userId, result);
  return result;
};

// ===================== ACTIVE USER =====================
let cachedActiveUser: RealUser | null = null;

const getStoredActiveUser = async (): Promise<RealUser | null> => {
  const raw = await aGet("loop_active_user");
  return raw ? JSON.parse(raw) : null;
};
const setStoredActiveUser = async (user: RealUser | null) => {
  if (user) await aSet("loop_active_user", JSON.stringify(user));
  else await aRemove("loop_active_user");
};

// ===================== STORAGE UPLOAD =====================
export async function uploadFileToStorage(uri: string, folder: string, mimeType: string): Promise<string> {
  const ext = uri.split(".").pop() || "jpg";
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const formData = new FormData();
  formData.append("file", { uri, name: fileName, type: mimeType } as any);
  const { data, error } = await supabase.storage.from("media").upload(fileName, formData, { contentType: mimeType });
  if (error) throw new Error("Upload failed: " + error.message);
  const { data: urlData } = supabase.storage.from("media").getPublicUrl(data.path);
  return urlData.publicUrl;
}

// ===================== SERVICE =====================
export const dbService = {
  // AUTH
  async getActiveUser(): Promise<RealUser | null> {
    if (cachedActiveUser) return cachedActiveUser;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const stored = await getStoredActiveUser();
        if (stored && stored.id === session.user.id) {
          cachedActiveUser = stored;
          return stored;
        }
        const profile = await getProfile(session.user.id);
        const userObj: RealUser = {
          id: session.user.id,
          email: session.user.email || "",
          fullName: profile.name !== "Unknown User" ? profile.name : session.user.email?.split("@")[0] || "User",
          username: profile.username || session.user.email?.split("@")[0] || "user",
          avatar: profile.avatar,
          bio: profile.bio || "",
          gmail: profile.gmail || session.user.email || "",
        };
        await setStoredActiveUser(userObj);
        cachedActiveUser = userObj;
        return userObj;
      }
    } catch {}
    return null;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    cachedActiveUser = null;
    return data;
  },

  async signUp(email: string, password: string, fullName: string, username: string) {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, username } } });
    if (error) throw error;
    if (data.user) {
      await supabase.from("profiles").upsert({ id: data.user.id, full_name: fullName, username, avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=4F6BFF&color=fff`, bio: "" });
    }
    return data;
  },

  async signOut() {
    cachedActiveUser = null;
    await setStoredActiveUser(null);
    profileCache.clear();
    await supabase.auth.signOut();
  },

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  },

  async updateProfile(updates: { full_name?: string; bio?: string; avatar_url?: string; gmail?: string }): Promise<boolean> {
    const user = await this.getActiveUser();
    if (!user) return false;
    const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
    if (error) return false;
    profileCache.delete(user.id);
    const updatedUser = {
      ...user,
      fullName: updates.full_name ?? user.fullName,
      bio: updates.bio ?? user.bio,
      avatar: updates.avatar_url ?? user.avatar,
      gmail: updates.gmail ?? user.gmail,
    };
    await setStoredActiveUser(updatedUser);
    cachedActiveUser = updatedUser;
    if (updates.avatar_url) await aSet(`loop_profile_avatar_${user.id}`, updates.avatar_url);
    if (updates.full_name) await aSet(`loop_profile_name_${user.id}`, updates.full_name);
    return true;
  },

  // PROFILES
  async getProfileByUsername(username: string): Promise<UserProfile | null> {
    let data = null;
    try {
      const res = await supabase.from("profiles").select("*").ilike("username", username).maybeSingle();
      data = res.data;
    } catch {}
    if (!data) return null;
    const followerCount = await this.getFollowerCount(data.id);
    const followingCount = await this.getFollowingCount(data.id);
    let postCount = 0;
    try { const r = await supabase.from("posts").select("*", { count: "exact", head: true }).eq("authorId", data.id); postCount = r.count || 0; } catch {}
    return { id: data.id, email: data.gmail || "", fullName: data.full_name || data.username || "User", username: data.username || "", avatar: data.avatar_url || "https://ui-avatars.com/api/?name=User&background=4F6BFF&color=fff", bio: data.bio || "", followerCount, followingCount, postCount, gmail: data.gmail || "" };
  },

  async searchUsers(query: string): Promise<Array<{ id: string; fullName: string; username: string; avatar: string }>> {
    if (!query.trim()) return [];
    const clean = query.toLowerCase().replace("@", "").trim();
    const { data } = await supabase.from("profiles").select("*").or(`username.ilike.%${clean}%,full_name.ilike.%${clean}%`).limit(20);
    return (data || []).map((p: any) => ({ id: p.id, fullName: p.full_name || p.username || "User", username: p.username || "", avatar: p.avatar_url || "https://ui-avatars.com/api/?name=User&background=4F6BFF&color=fff" }));
  },

  // POSTS
  async getPosts(): Promise<RealPost[]> {
    const { data, error } = await supabase.from("posts").select("*").order("createdAt", { ascending: false });
    if (error || !data) return [];
    return Promise.all(data.map(async (p: any) => {
      const profile = await getProfile(p.authorId);
      return { id: p.id, caption: p.caption, imageUrl: p.imageUrl, authorId: p.authorId, authorName: profile.name, authorUsername: profile.username, authorAvatar: profile.avatar, authorBio: profile.bio || "", createdAt: new Date(p.createdAt || Date.now()).toLocaleDateString(), tone: p.tone, aiTags: p.aiTags || [] };
    }));
  },

  async getPostsByUserId(userId: string): Promise<RealPost[]> {
    const { data, error } = await supabase.from("posts").select("*").eq("authorId", userId).order("createdAt", { ascending: false });
    if (error || !data) return [];
    const profile = await getProfile(userId);
    return data.map((p: any) => ({ id: p.id, caption: p.caption, imageUrl: p.imageUrl, authorId: p.authorId, authorName: profile.name, authorUsername: profile.username, authorAvatar: profile.avatar, authorBio: profile.bio || "", createdAt: new Date(p.createdAt || Date.now()).toLocaleDateString(), tone: p.tone, aiTags: p.aiTags || [] }));
  },

  async createPost(caption: string, imageUrl: string): Promise<RealPost | null> {
    const user = await this.getActiveUser();
    if (!user) return null;
    const { data, error } = await supabase.from("posts").insert({ id: generateUUID(), caption, imageUrl, authorId: user.id, aiTags: [] }).select().single();
    if (error || !data) return null;
    return { id: data.id, caption: data.caption, imageUrl: data.imageUrl, authorId: user.id, authorName: user.fullName, authorUsername: user.username, authorAvatar: user.avatar, authorBio: user.bio || "", createdAt: new Date().toLocaleDateString(), aiTags: [] };
  },

  async deletePost(postId: string): Promise<boolean> {
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    return !error;
  },

  // STORIES
  async getStories(): Promise<RealStory[]> {
    let dbStories: any[] = [];
    try {
      const { data } = await supabase.from("stories").select("*").gt("expiresAt", new Date().toISOString()).order("createdAt", { ascending: false });
      if (data) dbStories = data;
    } catch {}
    const mapped = await Promise.all(dbStories.map(async (s: any) => {
      const profile = await getProfile(s.userId);
      return { id: s.id, mediaUrl: s.mediaUrl, userId: s.userId, userName: profile.name, userUsername: profile.username, userAvatar: profile.avatar, expiresAt: s.expiresAt, createdAt: s.createdAt };
    }));
    const local = await getLocalStories();
    const seen = new Set(local.map(s => s.id));
    for (const s of mapped) { if (!seen.has(s.id)) { local.push(s); seen.add(s.id); } }
    const now = Date.now();
    return local.filter(s => new Date(s.expiresAt).getTime() > now).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async addStory(mediaUrl: string): Promise<RealStory | null> {
    const user = await this.getActiveUser();
    if (!user) return null;
    const expiresAt = new Date(Date.now() + 86400000).toISOString();
    const id = generateUUID();
    const story: RealStory = { id, mediaUrl, userId: user.id, userName: user.fullName, userUsername: user.username, userAvatar: user.avatar, expiresAt, createdAt: new Date().toISOString() };
    const local = await getLocalStories();
    await saveLocalStories([story, ...local]);
    try { await supabase.from("stories").insert({ id, mediaUrl, userId: user.id, expiresAt }); } catch {}
    return story;
  },

  // REELS
  async getReels(): Promise<RealReel[]> {
    const { data, error } = await supabase.from("reels").select("*").order("createdAt", { ascending: false });
    if (error || !data) return [];
    return Promise.all(data.map(async (r: any) => {
      const profile = await getProfile(r.userId);
      return { id: r.id, videoUrl: r.videoUrl, caption: r.caption || "", userId: r.userId, userName: profile.name, userUsername: profile.username, userAvatar: profile.avatar, likesCount: r.likesCount || 0, createdAt: r.createdAt };
    }));
  },

  async getReelsByUserId(userId: string): Promise<RealReel[]> {
    const { data, error } = await supabase.from("reels").select("*").eq("userId", userId).order("createdAt", { ascending: false });
    if (error || !data) return [];
    const profile = await getProfile(userId);
    return data.map((r: any) => ({ id: r.id, videoUrl: r.videoUrl, caption: r.caption || "", userId: r.userId, userName: profile.name, userUsername: profile.username, userAvatar: profile.avatar, likesCount: r.likesCount || 0, createdAt: r.createdAt }));
  },

  async addReel(videoUrl: string, caption: string): Promise<RealReel | null> {
    const user = await this.getActiveUser();
    if (!user) return null;
    const { data, error } = await supabase.from("reels").insert({ id: generateUUID(), videoUrl, caption, userId: user.id }).select().single();
    if (error || !data) return null;
    return { id: data.id, videoUrl, caption, userId: user.id, userName: user.fullName, userUsername: user.username, userAvatar: user.avatar, likesCount: 0, createdAt: data.createdAt || new Date().toISOString() };
  },

  async deleteReel(reelId: string): Promise<boolean> {
    const user = await this.getActiveUser();
    if (!user) return false;
    const { error } = await supabase.from("reels").delete().eq("id", reelId).eq("userId", user.id);
    return !error;
  },

  // FOLLOW SYSTEM
  async getFollowerCount(userId: string): Promise<number> {
    if (!isValidUUID(userId)) return 0;
    try {
      const { count } = await supabase.from("follow_requests").select("*", { count: "exact", head: true }).eq("receiverId", userId).eq("status", "accepted");
      return count || 0;
    } catch { return 0; }
  },

  async getFollowingCount(userId: string): Promise<number> {
    if (!isValidUUID(userId)) return 0;
    try {
      const { count } = await supabase.from("follow_requests").select("*", { count: "exact", head: true }).eq("senderId", userId).eq("status", "accepted");
      return count || 0;
    } catch { return 0; }
  },

  async getFollowStatus(targetUserId: string): Promise<FollowStatus> {
    const user = await this.getActiveUser();
    if (!user || user.id === targetUserId) return "none";
    try {
      const { data: accepted } = await supabase.from("follow_requests").select("id").eq("senderId", user.id).eq("receiverId", targetUserId).eq("status", "accepted").maybeSingle();
      if (accepted) return "following";
      const { data: pending } = await supabase.from("follow_requests").select("id").eq("senderId", user.id).eq("receiverId", targetUserId).eq("status", "pending").maybeSingle();
      if (pending) return "pending";
    } catch {}
    const local = await getLocalFollowRequests();
    const sent = local.find(r => r.senderId === user.id && r.receiverId === targetUserId);
    if (sent?.status === "accepted") return "following";
    if (sent?.status === "pending") return "pending";
    return "none";
  },

  async sendFollowRequest(targetUserId: string): Promise<boolean> {
    const user = await this.getActiveUser();
    if (!user || user.id === targetUserId) return false;
    const local = await getLocalFollowRequests();
    const filtered = local.filter(r => !(r.senderId === user.id && r.receiverId === targetUserId));
    filtered.push({ id: "local-" + generateUUID(), senderId: user.id, receiverId: targetUserId, status: "pending", createdAt: new Date().toISOString() });
    await saveLocalFollowRequests(filtered);
    try {
      await supabase.from("follow_requests").insert({ senderId: user.id, receiverId: targetUserId, status: "pending" });
    } catch {}
    return true;
  },

  async cancelFollowRequest(targetUserId: string): Promise<boolean> {
    const user = await this.getActiveUser();
    if (!user) return false;
    const local = await getLocalFollowRequests();
    await saveLocalFollowRequests(local.filter(r => !(r.senderId === user.id && r.receiverId === targetUserId)));
    try { await supabase.from("follow_requests").delete().eq("senderId", user.id).eq("receiverId", targetUserId); } catch {}
    return true;
  },

  async unfollowUser(targetUserId: string): Promise<boolean> {
    const user = await this.getActiveUser();
    if (!user) return false;
    const local = await getLocalFollowRequests();
    await saveLocalFollowRequests(local.filter(r => !(r.senderId === user.id && r.receiverId === targetUserId)));
    try { await supabase.from("follow_requests").delete().eq("senderId", user.id).eq("receiverId", targetUserId).eq("status", "accepted"); } catch {}
    return true;
  },

  async getIncomingRequests(): Promise<FollowRequest[]> {
    const user = await this.getActiveUser();
    if (!user) return [];
    try {
      const { data } = await supabase.from("follow_requests").select("*").eq("receiverId", user.id).eq("status", "pending");
      if (!data) return [];
      return Promise.all(data.map(async (r: any) => {
        const profile = await getProfile(r.senderId);
        return { id: r.id, senderId: r.senderId, senderName: profile.name, senderUsername: profile.username, senderAvatar: profile.avatar, status: r.status, createdAt: r.createdAt };
      }));
    } catch { return []; }
  },

  async acceptFollowRequest(requestId: string): Promise<boolean> {
    try { await supabase.from("follow_requests").update({ status: "accepted" }).eq("id", requestId); } catch {}
    return true;
  },

  async rejectFollowRequest(requestId: string): Promise<boolean> {
    try { await supabase.from("follow_requests").update({ status: "rejected" }).eq("id", requestId); } catch {}
    return true;
  },

  // MESSAGES / CHATS
  async getChats(): Promise<RealChat[]> {
    const user = await this.getActiveUser();
    if (!user) return [];
    try {
      const { data: followData } = await supabase.from("follow_requests").select("*").or(`senderId.eq.${user.id},receiverId.eq.${user.id}`).eq("status", "accepted");
      if (!followData || followData.length === 0) return [];
      const chatUserIds = [...new Set(followData.map((f: any) => f.senderId === user.id ? f.receiverId : f.senderId))];
      const chats: RealChat[] = [];
      for (const partnerId of chatUserIds) {
        const profile = await getProfile(partnerId as string);
        const { data: msgs } = await supabase.from("messages").select("*").or(`and(senderId.eq.${user.id},receiverId.eq.${partnerId}),and(senderId.eq.${partnerId},receiverId.eq.${user.id})`).order("createdAt", { ascending: true }).limit(50);
        const messages: RealMessage[] = (msgs || []).map((m: any) => ({ id: m.id, senderId: m.senderId, senderName: m.senderId === user.id ? user.fullName : profile.name, senderAvatar: m.senderId === user.id ? user.avatar : profile.avatar, text: m.content, createdAt: m.createdAt, isRead: m.isRead }));
        const unread = messages.filter(m => !m.isRead && m.senderId !== user.id).length;
        chats.push({ id: partnerId as string, name: profile.name, username: profile.username, avatar: profile.avatar, messages, unreadCount: unread, lastMessageTime: messages[messages.length - 1]?.createdAt || new Date().toISOString() });
      }
      return chats.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
    } catch { return []; }
  },

  async sendMessage(receiverId: string, content: string): Promise<boolean> {
    const user = await this.getActiveUser();
    if (!user) return false;
    try {
      await supabase.from("messages").insert({ id: generateUUID(), senderId: user.id, receiverId, content, isRead: false });
      return true;
    } catch { return false; }
  },

  async markMessagesAsRead(partnerId: string): Promise<void> {
    const user = await this.getActiveUser();
    if (!user) return;
    try { await supabase.from("messages").update({ isRead: true }).eq("senderId", partnerId).eq("receiverId", user.id).eq("isRead", false); } catch {}
  },

  // NOTIFICATIONS
  async getNotifications(): Promise<RealNotification[]> {
    const user = await this.getActiveUser();
    if (!user) return [];
    try {
      const { data } = await supabase.from("notifications").select("*").eq("receiverId", user.id).order("createdAt", { ascending: false }).limit(30);
      return (data || []).map((n: any) => ({ id: n.id, receiverId: n.receiverId, senderId: n.senderId, senderName: n.senderName || "Someone", senderUsername: n.senderUsername || "", senderAvatar: n.senderAvatar || "https://ui-avatars.com/api/?name=User&background=4F6BFF&color=fff", type: n.type, relatedId: n.relatedId, content: n.content, isRead: n.isRead, createdAt: n.createdAt }));
    } catch { return []; }
  },

  async markNotificationsRead(): Promise<void> {
    const user = await this.getActiveUser();
    if (!user) return;
    try { await supabase.from("notifications").update({ isRead: true }).eq("receiverId", user.id).eq("isRead", false); } catch {}
  },

  async getUnreadNotificationCount(): Promise<number> {
    const user = await this.getActiveUser();
    if (!user) return 0;
    try {
      const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("receiverId", user.id).eq("isRead", false);
      return count || 0;
    } catch { return 0; }
  },
};
