import { supabase } from "./supabase";

// ===================== TYPES =====================

export interface RealUser {
  id: string;
  email: string;
  fullName: string;
  username: string;
  avatar: string;
  bio: string;
  gmail?: string;
}

export interface RealPost {
  id: string;
  caption: string;
  imageUrl: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  createdAt: string;
  tone?: string;
  aiTags: string[];
}

export interface RealStory {
  id: string;
  mediaUrl: string;
  userId: string;
  userName: string;
  userUsername: string;
  userAvatar: string;
  expiresAt: string;
  createdAt: string;
}

export interface RealReel {
  id: string;
  videoUrl: string;
  caption: string;
  userId: string;
  userName: string;
  userUsername: string;
  userAvatar: string;
  likesCount: number;
  createdAt: string;
}

export interface RealMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  createdAt: string;
  isRead: boolean;
}

export interface RealNotification {
  id: string;
  receiverId: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  senderAvatar: string;
  type: "like_post" | "like_reel" | "comment_post" | "follow_request";
  relatedId?: string;
  content?: string;
  isRead: boolean;
  createdAt: string;
}

export interface RealChat {
  id: string;
  name: string;
  username: string;
  avatar: string;
  messages: RealMessage[];
  unreadCount: number;
  lastMessageTime: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  username: string;
  avatar: string;
  bio: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  gmail?: string;
}

export interface FollowRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  senderAvatar: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

export type FollowStatus = "none" | "pending" | "accepted" | "following";

// ===================== HELPERS =====================

export interface LocalFollowRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

export interface LocalMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  isRead: boolean;
}

// Real UUIDs for all demo profiles - sim-user-* strings caused Postgres UUID type errors (HTTP 400)
export const DEMO_PROFILES = [
  { id: "c4d21906-938b-4fe1-a5aa-86c86c318611", username: "hari__nithin", full_name: "nithin07", avatar_url: "/images/avatar_marcus_1779191788520.png", bio: "Tech enthusiast & creator", gmail: "harinithin007@gmail.com" },
  { id: "bb856f24-28e9-4ddd-b5ad-5155ac1cc34d", username: "kani_06", full_name: "kanishka", avatar_url: "/images/avatar_sarah_1779191804823.png", bio: "Social loop connector", gmail: "kanishkaaaj2006@gmail.com" },
  { id: "a1b2c3d4-e5f6-7890-abcd-ef1234567801", username: "luna_dream", full_name: "Luna Dream", avatar_url: "/images/avatar_elena_1779191722727.png", bio: "Cyberpunk visual artist", gmail: "luna@loop.ai" },
  { id: "a1b2c3d4-e5f6-7890-abcd-ef1234567802", username: "elena_rostova", full_name: "Elena Rostova", avatar_url: "/images/avatar_elena_1779191722727.png", bio: "AI Developer & Writer", gmail: "elena@loop.ai" },
  { id: "a1b2c3d4-e5f6-7890-abcd-ef1234567803", username: "marcus_v", full_name: "Marcus Vance", avatar_url: "/images/avatar_marcus_1779191788520.png", bio: "Gadget reviewer & developer", gmail: "marcus@loop.ai" },
  { id: "a1b2c3d4-e5f6-7890-abcd-ef1234567804", username: "alex_design", full_name: "Alex Rivera", avatar_url: "/images/avatar_sarah_1779191804823.png", bio: "Lead UX Designer & Photographer", gmail: "alex@loop.ai" },
  { id: "a1b2c3d4-e5f6-7890-abcd-ef1234567805", username: "sophia_code", full_name: "Sophia Chen", avatar_url: "/images/avatar_elena_1779191722727.png", bio: "Full Stack Engineer & Dog Lover", gmail: "sophia@loop.ai" },
  { id: "a1b2c3d4-e5f6-7890-abcd-ef1234567806", username: "lucas_sound", full_name: "Lucas Martinez", avatar_url: "/images/avatar_marcus_1779191788520.png", bio: "Music Producer & Sound Designer", gmail: "lucas@loop.ai" },
  { id: "a1b2c3d4-e5f6-7890-abcd-ef1234567807", username: "emma_travels", full_name: "Emma Watson", avatar_url: "/images/avatar_sarah_1779191804823.png", bio: "Digital Nomad & Travel Blogger", gmail: "emma@loop.ai" },
  { id: "a1b2c3d4-e5f6-7890-abcd-ef1234567808", username: "david_fit", full_name: "David Miller", avatar_url: "/images/avatar_marcus_1779191788520.png", bio: "Personal Trainer & Nutritionist", gmail: "david@loop.ai" }
];

// UUID validation helper — prevents Postgres "invalid input syntax for type uuid" (HTTP 400) errors
// when sim/demo IDs are used in Supabase queries on UUID-typed columns
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isValidUUID = (id: string): boolean => UUID_REGEX.test(id);

// ===================== LOCAL STORAGE (SAME-DEVICE OPTIMISTIC CACHE ONLY) =====================
// IMPORTANT: localStorage is ONLY for same-device optimistic UI updates.
// It is NOT the source of truth for any data - Supabase is.
// When multiple users on different devices interact, only Supabase data is shared.

export const getLocalFollowRequests = (): LocalFollowRequest[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem("loop_local_follow_requests") ||
                localStorage.getItem("loop_local_follow_requests");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveLocalFollowRequests = (requests: LocalFollowRequest[]) => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem("loop_local_follow_requests", JSON.stringify(requests));
    localStorage.setItem("loop_local_follow_requests", JSON.stringify(requests));
    window.dispatchEvent(new Event("loop_follow_sync"));
  } catch {}
};

export const getLocalMessages = (): LocalMessage[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem("loop_local_messages") ||
                localStorage.getItem("loop_local_messages");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveLocalMessages = (messages: LocalMessage[]) => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem("loop_local_messages", JSON.stringify(messages));
    localStorage.setItem("loop_local_messages", JSON.stringify(messages));
    window.dispatchEvent(new Event("loop_message_sync"));
  } catch {}
};

export const profileCache = new Map<string, { name: string; username: string; avatar: string; bio: string; gmail: string }>();

const getProfile = async (userId: string) => {
  if (profileCache.has(userId)) {
    return profileCache.get(userId)!;
  }

  // Skip Supabase query entirely for non-UUID IDs to prevent HTTP 400
  // (Postgres rejects non-UUID strings in UUID-typed columns)
  let dbProfile = null;
  if (isValidUUID(userId)) {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      dbProfile = data;
    } catch (e) {
      console.warn("Could not query profile from Supabase:", e);
    }
  }

  const result = (() => {
    if (!dbProfile) {
      const demo = DEMO_PROFILES.find(p => p.id === userId);
      if (demo) {
        return {
          name: demo.full_name,
          username: demo.username,
          avatar: demo.avatar_url,
          bio: demo.bio,
          gmail: demo.gmail,
        };
      }
    }

    return {
      name: dbProfile?.full_name || dbProfile?.username || "Unknown User",
      username: dbProfile?.username || "",
      avatar: dbProfile?.avatar_url || "/images/avatar_marcus_1779191788520.png",
      bio: dbProfile?.bio || "",
      gmail: dbProfile?.gmail || "",
    };
  })();

  profileCache.set(userId, result);
  return result;
};

// ===================== SERVICE =====================

// Upload a file to Supabase Storage and return its public URL
async function uploadFileToStorage(file: File, folder: string): Promise<string> {
  const ext = file.name.split(".").pop() || "png";
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

  const { data, error } = await supabase.storage
    .from("media")
    .upload(fileName, file, { cacheControl: "3600", upsert: false });

  if (error) throw new Error("Upload failed: " + error.message);

  const { data: urlData } = supabase.storage.from("media").getPublicUrl(data.path);
  return urlData.publicUrl;
}

export { uploadFileToStorage };

export const dbService = {
  // =================== AUTH ===================

  async ensureProfileExists(user: RealUser): Promise<void> {
    try {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (!existing) {
        await supabase.from("profiles").insert({
          id: user.id,
          full_name: user.fullName,
          username: user.username,
          avatar_url: user.avatar,
          bio: user.bio || "Demo User Bio",
          gmail: user.gmail || user.email
        });
      }
    } catch (e) {
      console.warn("ensureProfileExists failed:", e);
    }
  },

  async getOrCreateProfileByEmail(email: string, fullName?: string): Promise<RealUser> {
    const cleanEmail = email.toLowerCase().trim();
    
    // Find the username from demo profiles or email split
    const demo = DEMO_PROFILES.find(p => 
      p.gmail?.toLowerCase() === cleanEmail || 
      p.username.toLowerCase() === cleanEmail.split("@")[0]
    );
    
    const username = demo ? demo.username : cleanEmail.split("@")[0];
    const name = demo ? demo.full_name : (fullName || cleanEmail.split("@")[0].toUpperCase());
    const avatar = demo ? demo.avatar_url : "/images/avatar_marcus_1779191788520.png";
    const bio = demo ? demo.bio : "Demo User Bio";

    // Use a special demo email to authenticate in Supabase
    const demoEmail = `demo_${username.replace(/[^a-zA-Z0-9]/g, "_")}@loop.ai`.toLowerCase();
    const demoPassword = "DemoPassword123!";

    let authUser = null;
    try {
      // 1. Try signing in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPassword
      });

      if (signInData?.user) {
        authUser = signInData.user;
      } else if (signInError) {
        // 2. Try signing up if sign in failed
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: demoEmail,
          password: demoPassword,
          options: {
            data: {
              full_name: name
            }
          }
        });
        
        if (signUpData?.user) {
          authUser = signUpData.user;
        }
      }
    } catch (e) {
      console.warn("Bypass auth helper failed:", e);
    }

    // Fallback if background auth fails (e.g. offline or network issue)
    const userId = authUser?.id || (demo ? demo.id : "demo-user-id");

    const userObj: RealUser = {
      id: userId,
      email: cleanEmail,
      fullName: name,
      username: username,
      avatar: avatar,
      bio: bio || "Demo User Bio",
      gmail: cleanEmail
    };

    await this.ensureProfileExists(userObj);
    return userObj;
  },

  async getActiveUser(): Promise<RealUser | null> {
    // PRIORITY 1: Real Supabase auth session (works across all devices & tabs)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        const profile = await getProfile(session.user.id);
        const userObj = {
          id: session.user.id,
          email: session.user.email || "",
          fullName: (!profile.name || profile.name === "Unknown User") 
            ? (session.user.user_metadata?.full_name || session.user.email?.split("@")[0].toUpperCase() || "Real User") 
            : profile.name,
          username: profile.username || session.user.email?.split("@")[0] || "real_user",
          avatar: profile.avatar || "/images/avatar_marcus_1779191788520.png",
          bio: profile.bio || "Active User Bio",
          gmail: profile.gmail || session.user.email || "",
        };
        await this.ensureProfileExists(userObj);
        return userObj;
      }
    } catch (e) {
      console.warn("Auth session check failed:", e);
    }

    // PRIORITY 2: Demo/bypass mock session (same-device only, stored in sessionStorage/localStorage)
    // This is only for demo purposes and does NOT work across different devices/browsers.
    // For real multi-user deployment, users should sign in with Supabase auth.
    if (typeof window !== "undefined") {
      try {
        // sessionStorage is preferred (tab-scoped), localStorage is device-scoped
        const mockRaw = sessionStorage.getItem("loop_mock_session") || localStorage.getItem("loop_mock_session");
        if (mockRaw) {
          const mockUser = JSON.parse(mockRaw);
          // Validate mock session has required fields
          if (!mockUser?.id || !mockUser?.username) {
            // Clear invalid mock session
            sessionStorage.removeItem("loop_mock_session");
            localStorage.removeItem("loop_mock_session");
            return null;
          }
          const userObj = {
            id: mockUser.id,
            email: mockUser.email || "tester@loop.ai",
            fullName: mockUser.fullName || "TEST CREATOR",
            username: mockUser.username || mockUser.email?.split("@")[0] || "test_creator",
            avatar: mockUser.avatar || "/images/avatar_marcus_1779191788520.png",
            bio: mockUser.bio || "Demo User Bio",
            gmail: mockUser.email || "tester@loop.ai",
          };
          await this.ensureProfileExists(userObj);
          return userObj;
        }
      } catch (e) {
        console.warn("Mock session check failed:", e);
      }
    }

    return null;
  },

  // =================== PROFILES ===================

  async getAllProfiles() {
    let list: any[] = [];
    try {
      const { data } = await supabase.from("profiles").select("*");
      if (data) list = data;
    } catch (e) {
      console.warn("Supabase getAllProfiles failed:", e);
    }

    const merged = [...list];
    DEMO_PROFILES.forEach(demo => {
      if (!merged.some(p => p.id === demo.id)) {
        merged.push({
          id: demo.id,
          username: demo.username,
          full_name: demo.full_name,
          avatar_url: demo.avatar_url,
          bio: demo.bio,
          gmail: demo.gmail
        });
      }
    });

    return merged;
  },

  async getProfileByUsername(username: string): Promise<UserProfile | null> {
    let profileData = null;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();
      profileData = data;
    } catch (e) {
      console.warn("Could not query profile by username from Supabase:", e);
    }

    if (!profileData) {
      const demo = DEMO_PROFILES.find(p => p.username === username);
      if (demo) {
        profileData = {
          id: demo.id,
          gmail: demo.gmail,
          email: demo.gmail,
          full_name: demo.full_name,
          username: demo.username,
          avatar_url: demo.avatar_url,
          bio: demo.bio
        };
      } else {
        return null;
      }
    }

    const followerCount = await this.getFollowerCount(profileData.id);
    const followingCount = await this.getFollowingCount(profileData.id);

    let postCount = 0;
    if (isValidUUID(profileData.id)) {
      try {
        const { count } = await supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .eq("authorId", profileData.id);
        postCount = count || 0;
      } catch {}
    }

    return {
      id: profileData.id,
      email: profileData.gmail || profileData.email || "",
      fullName: profileData.full_name || profileData.username || "User",
      username: profileData.username || "",
      avatar: profileData.avatar_url || "/images/avatar_marcus_1779191788520.png",
      bio: profileData.bio || "",
      followerCount,
      followingCount,
      postCount,
      gmail: profileData.gmail || "",
    };
  },

  async getProfileById(userId: string): Promise<UserProfile | null> {
    let profileData = null;
    if (isValidUUID(userId)) {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();
        profileData = data;
      } catch (e) {
        console.warn("Could not query profile by ID from Supabase:", e);
      }
    }

    if (!profileData) {
      const demo = DEMO_PROFILES.find(p => p.id === userId);
      if (demo) {
        profileData = {
          id: demo.id,
          gmail: demo.gmail,
          email: demo.gmail,
          full_name: demo.full_name,
          username: demo.username,
          avatar_url: demo.avatar_url,
          bio: demo.bio
        };
      } else {
        return null;
      }
    }

    const followerCount = await this.getFollowerCount(profileData.id);
    const followingCount = await this.getFollowingCount(profileData.id);

    let postCount = 0;
    if (isValidUUID(profileData.id)) {
      try {
        const { count } = await supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .eq("authorId", profileData.id);
        postCount = count || 0;
      } catch {}
    }

    return {
      id: profileData.id,
      email: profileData.email || "",
      fullName: profileData.full_name || profileData.username || "User",
      username: profileData.username || "",
      avatar: profileData.avatar_url || "/images/avatar_marcus_1779191788520.png",
      bio: profileData.bio || "",
      followerCount,
      followingCount,
      postCount,
    };
  },

  // =================== USERNAME ===================

  async checkUsernameAvailable(
    username: string,
    excludeUserId?: string
  ): Promise<boolean> {
    let query = supabase
      .from("profiles")
      .select("id")
      .eq("username", username);

    if (excludeUserId) {
      query = query.neq("id", excludeUserId);
    }

    const { data } = await query;
    return !data || data.length === 0;
  },

  async updateUsername(newUsername: string): Promise<{ success: boolean; error?: string }> {
    const user = await this.getActiveUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Validate format
    const cleaned = newUsername.toLowerCase().replace(/\s/g, "");
    if (cleaned.length < 3)
      return { success: false, error: "Username must be at least 3 characters" };
    if (!/^[a-z0-9._]+$/.test(cleaned))
      return {
        success: false,
        error: "Only lowercase letters, numbers, dots and underscores allowed",
      };

    // Check availability
    const available = await this.checkUsernameAvailable(cleaned, user.id);
    if (!available) return { success: false, error: "Username already taken" };

    const { error } = await supabase
      .from("profiles")
      .update({ username: cleaned })
      .eq("id", user.id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async updateProfile(updates: {
    full_name?: string;
    bio?: string;
    avatar_url?: string;
    gmail?: string;
  }): Promise<boolean> {
    const user = await this.getActiveUser();
    if (!user) return false;

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    return !error;
  },

  // =================== SEARCH ===================

  async searchUsers(
    query: string
  ): Promise<
    Array<{
      id: string;
      fullName: string;
      username: string;
      avatar: string;
    }>
  > {
    if (!query.trim()) return [];

    const cleanQuery = query.toLowerCase().replace("@", "").trim();

    // 1. Fetch exact match by username
    const { data: exactMatch } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", cleanQuery)
      .maybeSingle();

    // 2. Fetch partial matches by username or full name
    const { data: partialMatches } = await supabase
      .from("profiles")
      .select("*")
      .or(`username.ilike.%${cleanQuery}%,full_name.ilike.%${cleanQuery}%`)
      .limit(20);

    // 3. Combine results in a Map to prevent duplicates
    const combinedMap = new Map<string, any>();

    if (exactMatch) {
      combinedMap.set(exactMatch.id, exactMatch);
    }

    if (partialMatches) {
      partialMatches.forEach((p) => {
        if (!combinedMap.has(p.id)) {
          combinedMap.set(p.id, p);
        }
      });
    }

    const mergedList = Array.from(combinedMap.values());

    // 4. Map and sort so that exact username match is always #1, followed by prefix username matches
    return mergedList
      .map((p: any) => ({
        id: p.id,
        fullName: p.full_name || p.username || "User",
        username: p.username || "",
        avatar: p.avatar_url || "/images/avatar_marcus_1779191788520.png",
      }))
      .sort((a, b) => {
        const aExact = a.username.toLowerCase() === cleanQuery;
        const bExact = b.username.toLowerCase() === cleanQuery;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        const aStarts = a.username.toLowerCase().startsWith(cleanQuery);
        const bStarts = b.username.toLowerCase().startsWith(cleanQuery);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        return 0;
      });
  },

  // =================== POSTS ===================

  async getPosts(): Promise<RealPost[]> {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("createdAt", { ascending: false });

    if (error || !data) return [];

    // Pre-batch missing profiles to optimize DB requests
    const authorIds = Array.from(new Set(data.map((p: any) => p.authorId)));
    const missingIds = authorIds.filter((id) => !profileCache.has(id));
    if (missingIds.length > 0) {
      try {
        const { data: dbProfiles } = await supabase
          .from("profiles")
          .select("*")
          .in("id", missingIds);
        if (dbProfiles) {
          dbProfiles.forEach((p: any) => {
            profileCache.set(p.id, {
              name: p.full_name || p.username || "Unknown User",
              username: p.username || "",
              avatar: p.avatar_url || "/images/avatar_marcus_1779191788520.png",
              bio: p.bio || "",
              gmail: p.gmail || "",
            });
          });
        }
      } catch (e) {
        console.warn("Batch profile prefetch error:", e);
      }
    }

    return Promise.all(
      data.map(async (p: any) => {
        const profile = await getProfile(p.authorId);
        return {
          id: p.id,
          caption: p.caption,
          imageUrl: p.imageUrl,
          authorId: p.authorId,
          authorName: profile.name,
          authorUsername: profile.username,
          authorAvatar: profile.avatar,
          createdAt: new Date(p.createdAt || Date.now()).toLocaleDateString(),
          tone: p.tone,
          aiTags: p.aiTags || [],
        };
      })
    );
  },

  async getPostsByUserId(userId: string): Promise<RealPost[]> {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("authorId", userId)
      .order("createdAt", { ascending: false });

    if (error || !data) return [];

    const profile = await getProfile(userId);
    return data.map((p: any) => ({
      id: p.id,
      caption: p.caption,
      imageUrl: p.imageUrl,
      authorId: p.authorId,
      authorName: profile.name,
      authorUsername: profile.username,
      authorAvatar: profile.avatar,
      createdAt: new Date(p.createdAt || Date.now()).toLocaleDateString(),
      tone: p.tone,
      aiTags: p.aiTags || [],
    }));
  },

  async createPost(
    caption: string,
    imageUrl: string,
    tone?: string,
    aiTags: string[] = []
  ): Promise<RealPost | null> {
    const user = await this.getActiveUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("posts")
      .insert({ caption, imageUrl, tone, aiTags, authorId: user.id })
      .select()
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      caption: data.caption,
      imageUrl: data.imageUrl,
      authorId: user.id,
      authorName: user.fullName,
      authorUsername: user.username,
      authorAvatar: user.avatar,
      createdAt: new Date(data.createdAt || Date.now()).toLocaleDateString(),
      tone: data.tone,
      aiTags: data.aiTags || [],
    };
  },

  async updatePost(postId: string, caption: string): Promise<boolean> {
    const { error } = await supabase
      .from("posts")
      .update({ caption })
      .eq("id", postId);
    return !error;
  },

  async deletePost(postId: string): Promise<boolean> {
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId);
    return !error;
  },

  // =================== STORIES ===================

  async getStories(): Promise<RealStory[]> {
    const { data, error } = await supabase
      .from("stories")
      .select("*")
      .gt("expiresAt", new Date().toISOString())
      .order("createdAt", { ascending: true });

    if (error || !data) return [];

    // Pre-batch missing profiles to optimize DB requests
    const userIds = Array.from(new Set(data.map((s: any) => s.userId)));
    const missingIds = userIds.filter((id) => !profileCache.has(id));
    if (missingIds.length > 0) {
      try {
        const { data: dbProfiles } = await supabase
          .from("profiles")
          .select("*")
          .in("id", missingIds);
        if (dbProfiles) {
          dbProfiles.forEach((p: any) => {
            profileCache.set(p.id, {
              name: p.full_name || p.username || "Unknown User",
              username: p.username || "",
              avatar: p.avatar_url || "/images/avatar_marcus_1779191788520.png",
              bio: p.bio || "",
              gmail: p.gmail || "",
            });
          });
        }
      } catch (e) {
        console.warn("Batch profile prefetch error:", e);
      }
    }

    return Promise.all(
      data.map(async (s: any) => {
        const profile = await getProfile(s.userId);
        return {
          id: s.id,
          mediaUrl: s.mediaUrl,
          userId: s.userId,
          userName: profile.name,
          userUsername: profile.username,
          userAvatar: profile.avatar,
          expiresAt: s.expiresAt,
          createdAt: s.createdAt,
        };
      })
    );
  },

  async getStoriesByUserId(userId: string): Promise<RealStory[]> {
    const { data, error } = await supabase
      .from("stories")
      .select("*")
      .eq("userId", userId)
      .gt("expiresAt", new Date().toISOString())
      .order("createdAt", { ascending: true });

    if (error || !data) return [];

    const profile = await getProfile(userId);
    return data.map((s: any) => ({
      id: s.id,
      mediaUrl: s.mediaUrl,
      userId: s.userId,
      userName: profile.name,
      userUsername: profile.username,
      userAvatar: profile.avatar,
      expiresAt: s.expiresAt,
      createdAt: s.createdAt,
    }));
  },

  async addStory(mediaUrl: string): Promise<RealStory | null> {
    const user = await this.getActiveUser();
    if (!user) return null;

    const expiresAt = new Date(Date.now() + 86400000).toISOString();
    const { data, error } = await supabase
      .from("stories")
      .insert({ mediaUrl, userId: user.id, expiresAt })
      .select()
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      mediaUrl: data.mediaUrl,
      userId: user.id,
      userName: user.fullName,
      userUsername: user.username,
      userAvatar: user.avatar,
      expiresAt: data.expiresAt,
      createdAt: data.createdAt || new Date().toISOString(),
    };
  },

  // =================== REELS ===================

  async getReels(): Promise<RealReel[]> {
    const { data, error } = await supabase
      .from("reels")
      .select("*")
      .order("createdAt", { ascending: false });

    if (error || !data) return [];

    // Pre-batch missing profiles to optimize DB requests
    const userIds = Array.from(new Set(data.map((r: any) => r.userId)));
    const missingIds = userIds.filter((id) => !profileCache.has(id));
    if (missingIds.length > 0) {
      try {
        const { data: dbProfiles } = await supabase
          .from("profiles")
          .select("*")
          .in("id", missingIds);
        if (dbProfiles) {
          dbProfiles.forEach((p: any) => {
            profileCache.set(p.id, {
              name: p.full_name || p.username || "Unknown User",
              username: p.username || "",
              avatar: p.avatar_url || "/images/avatar_marcus_1779191788520.png",
              bio: p.bio || "",
              gmail: p.gmail || "",
            });
          });
        }
      } catch (e) {
        console.warn("Batch profile prefetch error:", e);
      }
    }

    return Promise.all(
      data.map(async (r: any) => {
        const profile = await getProfile(r.userId);
        return {
          id: r.id,
          videoUrl: r.videoUrl,
          caption: r.caption || "",
          userId: r.userId,
          userName: profile.name,
          userUsername: profile.username,
          userAvatar: profile.avatar,
          likesCount: r.likesCount || 0,
          createdAt: r.createdAt,
        };
      })
    );
  },

  async getReelsByUserId(userId: string): Promise<RealReel[]> {
    const { data, error } = await supabase
      .from("reels")
      .select("*")
      .eq("userId", userId)
      .order("createdAt", { ascending: false });

    if (error || !data) return [];

    const profile = await getProfile(userId);
    return data.map((r: any) => ({
      id: r.id,
      videoUrl: r.videoUrl,
      caption: r.caption || "",
      userId: r.userId,
      userName: profile.name,
      userUsername: profile.username,
      userAvatar: profile.avatar,
      likesCount: r.likesCount || 0,
      createdAt: r.createdAt,
    }));
  },

  async addReel(videoUrl: string, caption: string): Promise<RealReel | null> {
    const user = await this.getActiveUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("reels")
      .insert({ videoUrl, caption, userId: user.id })
      .select()
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      videoUrl: data.videoUrl,
      caption: data.caption,
      userId: user.id,
      userName: user.fullName,
      userUsername: user.username,
      userAvatar: user.avatar,
      likesCount: 0,
      createdAt: data.createdAt || new Date().toISOString(),
    };
  },

  // =================== FOLLOW REQUEST SYSTEM ===================

  async getFollowStatus(targetUserId: string): Promise<FollowStatus> {
    const user = await this.getActiveUser();
    if (!user) return "none";
    if (user.id === targetUserId) return "none";

    // 1. Check Supabase first (source of truth for real-time cross-device updates)
    try {
      const { data: accepted } = await supabase
        .from("follow_requests")
        .select("id, createdAt")
        .eq("senderId", user.id)
        .eq("receiverId", targetUserId)
        .eq("status", "accepted")
        .maybeSingle();

      if (accepted) {
        // Sync local storage so future local reads match
        const localReqs = getLocalFollowRequests();
        const existing = localReqs.find(r => r.senderId === user.id && r.receiverId === targetUserId);
        if (!existing || existing.status !== "accepted") {
          const filtered = localReqs.filter(r => !(r.senderId === user.id && r.receiverId === targetUserId));
          filtered.push({
            id: existing?.id || "req-" + Math.random().toString(36).substring(2, 9),
            senderId: user.id,
            receiverId: targetUserId,
            status: "accepted",
            createdAt: accepted.createdAt || existing?.createdAt || new Date().toISOString()
          });
          saveLocalFollowRequests(filtered);
        }
        return "following";
      }

      const { data: reverseAccepted } = await supabase
        .from("follow_requests")
        .select("id, createdAt")
        .eq("senderId", targetUserId)
        .eq("receiverId", user.id)
        .eq("status", "accepted")
        .maybeSingle();

      if (reverseAccepted) {
        // Sync local storage so future local reads match
        const localReqs = getLocalFollowRequests();
        const existing = localReqs.find(r => r.senderId === targetUserId && r.receiverId === user.id);
        if (!existing || existing.status !== "accepted") {
          const filtered = localReqs.filter(r => !(r.senderId === targetUserId && r.receiverId === user.id));
          filtered.push({
            id: existing?.id || "req-" + Math.random().toString(36).substring(2, 9),
            senderId: targetUserId,
            receiverId: user.id,
            status: "accepted",
            createdAt: reverseAccepted.createdAt || existing?.createdAt || new Date().toISOString()
          });
          saveLocalFollowRequests(filtered);
        }
        return "following";
      }

      const { data: pending } = await supabase
        .from("follow_requests")
        .select("id")
        .eq("senderId", user.id)
        .eq("receiverId", targetUserId)
        .eq("status", "pending")
        .maybeSingle();

      if (pending) {
        // Sync pending status locally if missing
        const localReqs = getLocalFollowRequests();
        const existing = localReqs.find(r => r.senderId === user.id && r.receiverId === targetUserId);
        if (!existing) {
          localReqs.push({
            id: "req-" + Math.random().toString(36).substring(2, 9),
            senderId: user.id,
            receiverId: targetUserId,
            status: "pending",
            createdAt: new Date().toISOString()
          });
          saveLocalFollowRequests(localReqs);
        }
        return "pending";
      }

      const { data: reversePending } = await supabase
        .from("follow_requests")
        .select("id")
        .eq("senderId", targetUserId)
        .eq("receiverId", user.id)
        .eq("status", "pending")
        .maybeSingle();

      if (reversePending) {
        // Sync pending status locally if missing
        const localReqs = getLocalFollowRequests();
        const existing = localReqs.find(r => r.senderId === targetUserId && r.receiverId === user.id);
        if (!existing) {
          localReqs.push({
            id: "req-" + Math.random().toString(36).substring(2, 9),
            senderId: targetUserId,
            receiverId: user.id,
            status: "pending",
            createdAt: new Date().toISOString()
          });
          saveLocalFollowRequests(localReqs);
        }
        return "pending";
      }
    } catch (e) {
      console.warn("Supabase follow status check failed:", e);
    }

    // 2. Fallback to local storage (e.g. offline fallback or local mock data)
    const localReqs = getLocalFollowRequests();
    const localSent = localReqs.find(r => r.senderId === user.id && r.receiverId === targetUserId);
    const localReceived = localReqs.find(r => r.senderId === targetUserId && r.receiverId === user.id);

    if (localSent?.status === "accepted" || localReceived?.status === "accepted") return "following";
    if (localSent?.status === "pending" || localReceived?.status === "pending") return "pending";

    return "none";
  },

  async sendFollowRequest(targetUserId: string): Promise<boolean> {
    const user = await this.getActiveUser();
    if (!user || user.id === targetUserId) return false;

    // 1. Save to localStorage for instant local UI feedback
    const localReqs = getLocalFollowRequests();
    const filtered = localReqs.filter(r =>
      !(r.senderId === user.id && r.receiverId === targetUserId) &&
      !(r.senderId === targetUserId && r.receiverId === user.id)
    );
    const newRequest: LocalFollowRequest = {
      id: "local-req-" + Math.random().toString(36).substring(2, 9),
      senderId: user.id,
      receiverId: targetUserId,
      status: "pending",
      createdAt: new Date().toISOString()
    };
    filtered.push(newRequest);
    saveLocalFollowRequests(filtered);

    // 2. Try via Next.js API route (bypasses RLS using service role key)
    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          senderId: user.id,
          receiverId: targetUserId,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        console.error("API follow request failed:", json.error);
      } else {
        console.log("Follow request sent via API:", json);
        return true;
      }
    } catch (e) {
      console.error("API follow request exception:", e);
    }

    // 3. Fallback: Try direct Supabase upsert
    try {
      const { error: sbError } = await supabase.from("follow_requests").upsert(
        { senderId: user.id, receiverId: targetUserId, status: "pending" },
        { onConflict: "senderId,receiverId", ignoreDuplicates: false }
      );
      if (sbError) {
        console.error("Supabase follow request upsert error:", sbError.message, sbError.code, sbError.details);
      }
    } catch (e) {
      console.error("Supabase follow request insert failed:", e);
    }

    return true;
  },

  async cancelFollowRequest(targetUserId: string): Promise<boolean> {
    const user = await this.getActiveUser();
    if (!user) return false;

    // 1. Delete from local storage
    const localReqs = getLocalFollowRequests();
    const filtered = localReqs.filter(r => 
      !(r.senderId === user.id && r.receiverId === targetUserId)
    );
    saveLocalFollowRequests(filtered);

    // 2. Try Supabase delete
    try {
      await supabase
        .from("follow_requests")
        .delete()
        .eq("senderId", user.id)
        .eq("receiverId", targetUserId)
        .eq("status", "pending");
    } catch (e) {
      console.warn("Supabase cancel follow request failed:", e);
    }

    return true;
  },

  async acceptFollowRequest(requestId: string): Promise<boolean> {
    // 1. Find the request first to see who sent it
    const localReqs = getLocalFollowRequests();
    const req = localReqs.find(r => r.id === requestId);
    let updated = localReqs.map(r => r.id === requestId ? { ...r, status: "accepted" as const } : r);

    if (req) {
      // Also add the reverse request to local storage so both are accepted locally (mutual follow)
      const reverseExists = updated.some(r => r.senderId === req.receiverId && r.receiverId === req.senderId);
      if (!reverseExists) {
        updated.push({
          id: "local-req-rev-" + Math.random().toString(36).substring(2, 9),
          senderId: req.receiverId,
          receiverId: req.senderId,
          status: "accepted",
          createdAt: new Date().toISOString()
        });
      } else {
        updated = updated.map(r => 
          (r.senderId === req.receiverId && r.receiverId === req.senderId)
            ? { ...r, status: "accepted" as const }
            : r
        );
      }
    }
    saveLocalFollowRequests(updated);

    // 2. Use API route (bypasses RLS)
    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept", requestId }),
      });
      if (!res.ok) {
        const json = await res.json();
        console.error("API accept follow request failed:", json.error);
      }
    } catch (e) {
      console.error("API accept follow request exception:", e);
      // Fallback to direct Supabase
      try {
        await supabase.from("follow_requests").update({ status: "accepted" }).eq("id", requestId);
      } catch {}
    }

    return true;
  },

  async rejectFollowRequest(requestId: string): Promise<boolean> {
    // 1. Update in local storage
    const localReqs = getLocalFollowRequests();
    const updated = localReqs.map(r => r.id === requestId ? { ...r, status: "rejected" as const } : r);
    saveLocalFollowRequests(updated);

    // 2. Use API route (bypasses RLS)
    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", requestId }),
      });
      if (!res.ok) {
        const json = await res.json();
        console.error("API reject follow request failed:", json.error);
      }
    } catch (e) {
      console.error("API reject follow request exception:", e);
      // Fallback to direct Supabase
      try {
        await supabase.from("follow_requests").update({ status: "rejected" }).eq("id", requestId);
      } catch {}
    }

    return true;
  },

  async unfollowUser(targetUserId: string): Promise<boolean> {
    const user = await this.getActiveUser();
    if (!user) return false;

    // 1. Delete from local storage
    const localReqs = getLocalFollowRequests();
    const filtered = localReqs.filter(r => 
      !(r.senderId === user.id && r.receiverId === targetUserId) &&
      !(r.senderId === targetUserId && r.receiverId === user.id)
    );
    saveLocalFollowRequests(filtered);

    // 2. Try Supabase delete
    try {
      await supabase
        .from("follow_requests")
        .delete()
        .eq("senderId", user.id)
        .eq("receiverId", targetUserId)
        .eq("status", "accepted");

      await supabase
        .from("follow_requests")
        .delete()
        .eq("senderId", targetUserId)
        .eq("receiverId", user.id)
        .eq("status", "accepted");
    } catch (e) {
      console.warn("Supabase unfollow user failed:", e);
    }

    return true;
  },

  async getIncomingRequests(): Promise<FollowRequest[]> {
    const user = await this.getActiveUser();
    if (!user) return [];

    const requestsMap = new Map<string, any>();

    // 1. Fetch via API route (uses service role key - bypasses RLS, works cross-user)
    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "incoming", receiverId: user.id }),
      });
      if (res.ok) {
        const json = await res.json();
        (json.requests || []).forEach((r: any) => {
          requestsMap.set(`${r.senderId}-${r.receiverId}`, {
            id: r.id,
            senderId: r.senderId,
            status: r.status,
            createdAt: r.createdAt,
          });
        });
      } else {
        console.error("API incoming requests failed:", await res.text());
      }
    } catch (e) {
      console.error("API incoming requests exception:", e);
      // Fallback: Fetch directly from Supabase
      try {
        const { data } = await supabase
          .from("follow_requests")
          .select("*")
          .eq("receiverId", user.id)
          .eq("status", "pending")
          .order("createdAt", { ascending: false });
        if (data) {
          data.forEach((r: any) => {
            requestsMap.set(`${r.senderId}-${r.receiverId}`, {
              id: r.id, senderId: r.senderId, status: r.status, createdAt: r.createdAt,
            });
          });
        }
      } catch {}
    }

    // 2. Merge localStorage (for same-device local requests)
    const localReqs = getLocalFollowRequests();
    localReqs.forEach(r => {
      if (r.receiverId === user.id && r.status === "pending") {
        if (!requestsMap.has(`${r.senderId}-${r.receiverId}`)) {
          requestsMap.set(`${r.senderId}-${r.receiverId}`, r);
        }
      }
    });

    const combined = Array.from(requestsMap.values());

    return Promise.all(
      combined.map(async (r: any) => {
        const profile = await getProfile(r.senderId);
        return {
          id: r.id,
          senderId: r.senderId,
          senderName: profile.name,
          senderUsername: profile.username,
          senderAvatar: profile.avatar,
          status: r.status,
          createdAt: r.createdAt,
        };
      })
    );
  },

  // =================== FOLLOWER COUNTS ===================

  async getFollowerCount(userId: string): Promise<number> {
    // Skip Supabase query for non-UUID IDs to prevent HTTP 400
    if (!isValidUUID(userId)) {
      const localReqs = getLocalFollowRequests();
      return localReqs.filter(r => r.receiverId === userId && r.status === "accepted").length;
    }
    let count = 0;
    try {
      const { count: dbCount } = await supabase
        .from("follow_requests")
        .select("*", { count: "exact", head: true })
        .eq("receiverId", userId)
        .eq("status", "accepted");
      count = dbCount || 0;
    } catch (e) {
      console.warn("Supabase getFollowerCount failed:", e);
    }

    const localReqs = getLocalFollowRequests();
    const localCount = localReqs.filter(r => r.receiverId === userId && r.status === "accepted").length;

    return Math.max(count, localCount);
  },

  async getFollowingCount(userId: string): Promise<number> {
    // Skip Supabase query for non-UUID IDs to prevent HTTP 400
    if (!isValidUUID(userId)) {
      const localReqs = getLocalFollowRequests();
      return localReqs.filter(r => r.senderId === userId && r.status === "accepted").length;
    }
    let count = 0;
    try {
      const { count: dbCount } = await supabase
        .from("follow_requests")
        .select("*", { count: "exact", head: true })
        .eq("senderId", userId)
        .eq("status", "accepted");
      count = dbCount || 0;
    } catch (e) {
      console.warn("Supabase getFollowingCount failed:", e);
    }

    const localReqs = getLocalFollowRequests();
    const localCount = localReqs.filter(r => r.senderId === userId && r.status === "accepted").length;

    return Math.max(count, localCount);
  },

  async getConnectedUserIds(userId: string): Promise<string[]> {
    const ids = new Set<string>();
    const localReqs = getLocalFollowRequests();
    let updatedLocal = [...localReqs];
    let dirty = false;

    // Only query Supabase if userId is a valid UUID
    if (isValidUUID(userId)) {
      try {
        const { data: sent } = await supabase
          .from("follow_requests")
          .select("id, receiverId, createdAt")
          .eq("senderId", userId)
          .eq("status", "accepted");

        const { data: received } = await supabase
          .from("follow_requests")
          .select("id, senderId, createdAt")
          .eq("receiverId", userId)
          .eq("status", "accepted");

        if (sent) {
          sent.forEach((r: any) => {
            ids.add(r.receiverId);
            const existing = updatedLocal.find(l => l.senderId === userId && l.receiverId === r.receiverId);
            if (!existing || existing.status !== "accepted") {
              updatedLocal = updatedLocal.filter(l => !(l.senderId === userId && l.receiverId === r.receiverId));
              updatedLocal.push({
                id: r.id || "req-" + Math.random().toString(36).substring(2, 9),
                senderId: userId,
                receiverId: r.receiverId,
                status: "accepted",
                createdAt: r.createdAt || new Date().toISOString()
              });
              dirty = true;
            }
          });
        }

        if (received) {
          received.forEach((r: any) => {
            ids.add(r.senderId);
            const existing = updatedLocal.find(l => l.senderId === r.senderId && l.receiverId === userId);
            if (!existing || existing.status !== "accepted") {
              updatedLocal = updatedLocal.filter(l => !(l.senderId === r.senderId && l.receiverId === userId));
              updatedLocal.push({
                id: r.id || "req-" + Math.random().toString(36).substring(2, 9),
                senderId: r.senderId,
                receiverId: userId,
                status: "accepted",
                createdAt: r.createdAt || new Date().toISOString()
              });
              dirty = true;
            }
          });
        }
      } catch (e) {
        console.warn("Supabase getConnectedUserIds failed:", e);
      }
    } // end isValidUUID guard

    if (dirty) {
      saveLocalFollowRequests(updatedLocal);
    }

    // Fallback/merge from local storage
    const currentLocal = getLocalFollowRequests();
    currentLocal.forEach(r => {
      if (r.status === "accepted") {
        if (r.senderId === userId) ids.add(r.receiverId);
        if (r.receiverId === userId) ids.add(r.senderId);
      }
    });

    return Array.from(ids);
  },

  // Legacy compatibility
  async toggleFollow(followingId: string): Promise<boolean> {
    const status = await this.getFollowStatus(followingId);
    if (status === "following") {
      await this.unfollowUser(followingId);
      return false;
    } else if (status === "pending") {
      await this.cancelFollowRequest(followingId);
      return false;
    } else {
      await this.sendFollowRequest(followingId);
      return true;
    }
  },

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const localReqs = getLocalFollowRequests();
    const localIsFollowing = localReqs.some(r => 
      r.status === "accepted" &&
      ((r.senderId === followerId && r.receiverId === followingId) ||
       (r.senderId === followingId && r.receiverId === followerId))
    );
    if (localIsFollowing) return true;

    try {
      const { data } = await supabase
        .from("follow_requests")
        .select("id")
        .or(
          `and(senderId.eq.${followerId},receiverId.eq.${followingId},status.eq.accepted),and(senderId.eq.${followingId},receiverId.eq.${followerId},status.eq.accepted)`
        )
        .maybeSingle();

      return !!data;
    } catch (e) {
      console.warn("Supabase isFollowing check failed:", e);
    }

    return false;
  },

  async getFollowingList(userId: string): Promise<string[]> {
    return this.getConnectedUserIds(userId);
  },

  // =================== CHAT & MESSAGES ===================

  async getChats(): Promise<RealChat[]> {
    const user = await this.getActiveUser();
    if (!user) return [];

    const connectedIds = await this.getConnectedUserIds(user.id);
    if (connectedIds.length === 0) return [];

    let dbProfiles: any[] = [];
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .in("id", connectedIds);
      if (data) dbProfiles = data;
    } catch (e) {
      console.warn("Supabase fetch profiles for chats failed:", e);
    }

    const profiles = connectedIds.map(id => {
      const dbProf = dbProfiles.find(p => p.id === id);
      if (dbProf) return dbProf;
      const demo = DEMO_PROFILES.find(p => p.id === id);
      if (demo) {
        return {
          id: demo.id,
          full_name: demo.full_name,
          username: demo.username,
          avatar_url: demo.avatar_url
        };
      }
      return {
        id,
        full_name: "User " + id.substring(0, 4),
        username: "user_" + id.substring(0, 4),
        avatar_url: "/images/avatar_marcus_1779191788520.png"
      };
    });

    const chats: RealChat[] = await Promise.all(
      profiles.map(async (profile: any) => {
        let dbMessages: any[] = [];
        try {
          const { data } = await supabase
            .from("messages")
            .select("*")
            .or(
              `and(senderId.eq.${user.id},receiverId.eq.${profile.id}),and(senderId.eq.${profile.id},receiverId.eq.${user.id})`
            )
            .order("createdAt", { ascending: true });
          if (data) dbMessages = data;
        } catch (e) {
          console.warn("Supabase fetch messages failed:", e);
        }

        const localMsgs = getLocalMessages().filter(m => 
          (m.senderId === user.id && m.receiverId === profile.id) ||
          (m.senderId === profile.id && m.receiverId === user.id)
        );

        const messageMap = new Map<string, any>();
        dbMessages.forEach(m => {
          messageMap.set(m.id, {
            id: m.id,
            senderId: m.senderId,
            senderName: m.senderId === user.id ? user.fullName : (profile.full_name || profile.username),
            senderAvatar: m.senderId === user.id ? user.avatar : (profile.avatar_url || "/images/avatar_marcus_1779191788520.png"),
            text: m.content,
            createdAt: m.createdAt,
            isRead: m.isRead ?? true,
          });
        });

        localMsgs.forEach(m => {
          messageMap.set(m.id, {
            id: m.id,
            senderId: m.senderId,
            senderName: m.senderId === user.id ? user.fullName : (profile.full_name || profile.username),
            senderAvatar: m.senderId === user.id ? user.avatar : (profile.avatar_url || "/images/avatar_marcus_1779191788520.png"),
            text: m.content,
            createdAt: m.createdAt,
            isRead: m.isRead ?? true,
          });
        });

        const msgList = Array.from(messageMap.values());
        msgList.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        const unread = msgList.filter(
          (m) => m.senderId !== user.id && !m.isRead
        ).length;

        const lastMsg = msgList[msgList.length - 1];

        return {
          id: profile.id,
          name: profile.full_name || profile.username || "User",
          username: profile.username || "",
          avatar: profile.avatar_url || "/images/avatar_marcus_1779191788520.png",
          messages: msgList,
          unreadCount: unread,
          lastMessageTime: lastMsg?.createdAt || "",
        };
      })
    );

    chats.sort(
      (a, b) =>
        new Date(b.lastMessageTime || 0).getTime() -
        new Date(a.lastMessageTime || 0).getTime()
    );

    return chats;
  },

  async getMessageRequests(): Promise<RealChat[]> {
    const user = await this.getActiveUser();
    if (!user) return [];

    const pendingReqsMap = new Map<string, any>();

    try {
      const { data } = await supabase
        .from("follow_requests")
        .select("*")
        .eq("receiverId", user.id)
        .eq("status", "pending");
      if (data) {
        data.forEach(r => pendingReqsMap.set(r.senderId, r));
      }
    } catch (e) {
      console.warn("Supabase fetch message requests failed:", e);
    }

    const localReqs = getLocalFollowRequests();
    localReqs.forEach(r => {
      if (r.receiverId === user.id && r.status === "pending") {
        pendingReqsMap.set(r.senderId, r);
      }
    });

    const senderIds = Array.from(pendingReqsMap.keys());
    if (senderIds.length === 0) return [];

    let dbProfiles: any[] = [];
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .in("id", senderIds);
      if (data) dbProfiles = data;
    } catch (e) {
      console.warn("Supabase fetch profiles for message requests failed:", e);
    }

    const profiles = senderIds.map(id => {
      const dbProf = dbProfiles.find(p => p.id === id);
      if (dbProf) return dbProf;
      const demo = DEMO_PROFILES.find(p => p.id === id);
      if (demo) {
        return {
          id: demo.id,
          full_name: demo.full_name,
          username: demo.username,
          avatar_url: demo.avatar_url
        };
      }
      return {
        id,
        full_name: "User " + id.substring(0, 4),
        username: "user_" + id.substring(0, 4),
        avatar_url: "/images/avatar_marcus_1779191788520.png"
      };
    });

    return profiles.map((profile: any) => ({
      id: profile.id,
      name: profile.full_name || profile.username || "User",
      username: profile.username || "",
      avatar: profile.avatar_url || "/images/avatar_marcus_1779191788520.png",
      messages: [],
      unreadCount: 1,
      lastMessageTime: "",
    }));
  },

  async sendMessage(
    receiverId: string,
    text: string
  ): Promise<RealMessage | null> {
    const user = await this.getActiveUser();
    if (!user) return null;

    const timestamp = new Date().toISOString();

    // PRIORITY 1: Write to Supabase first so the other user (on any device) can see it immediately
    let savedId: string | null = null;
    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          content: text,
          senderId: user.id,
          receiverId: receiverId,
          isRead: false,
          createdAt: timestamp,
        })
        .select("id")
        .single();

      if (!error && data?.id) {
        savedId = data.id;
      } else if (error) {
        console.warn("Supabase sendMessage failed:", error.message);
      }
    } catch (e) {
      console.warn("Supabase sendMessage exception:", e);
    }

    // PRIORITY 2: Save to localStorage as optimistic UI cache (same-device only)
    const msgId = savedId || ("local-msg-" + Math.random().toString(36).substring(2, 9));
    const newMsg: LocalMessage = {
      id: msgId,
      senderId: user.id,
      receiverId: receiverId,
      content: text,
      createdAt: timestamp,
      isRead: false,
    };
    const localMsgs = getLocalMessages().filter(m => m.id !== msgId); // avoid duplicates if retrying
    localMsgs.push(newMsg);
    saveLocalMessages(localMsgs);

    return {
      id: msgId,
      senderId: user.id,
      senderName: user.fullName,
      senderAvatar: user.avatar,
      text: text,
      createdAt: timestamp,
      isRead: false,
    };
  },

  async markMessagesAsRead(
    chatUserId: string
  ): Promise<void> {
    const user = await this.getActiveUser();
    if (!user) return;

    const localMsgs = getLocalMessages();
    const updated = localMsgs.map(m => {
      if (m.senderId === chatUserId && m.receiverId === user.id && !m.isRead) {
        return { ...m, isRead: true };
      }
      return m;
    });
    saveLocalMessages(updated);

    try {
      await supabase
        .from("messages")
        .update({ isRead: true })
        .eq("senderId", chatUserId)
        .eq("receiverId", user.id)
        .eq("isRead", false);
    } catch (e) {
      console.warn("Supabase markMessagesAsRead failed:", e);
    }
  },

  async getTotalUnreadCount(): Promise<number> {
    const user = await this.getActiveUser();
    if (!user) return 0;

    // Primary source: Supabase (cross-device, real-time accurate)
    try {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiverId", user.id)
        .eq("isRead", false);
      if (count !== null) return count;
    } catch (e) {
      console.warn("Supabase getTotalUnreadCount failed, falling back to localStorage:", e);
    }

    // Fallback: local messages (only visible on same device)
    const localMsgs = getLocalMessages();
    return localMsgs.filter(m => m.receiverId === user.id && !m.isRead).length;
  },

  // =================== NOTIFICATIONS SYSTEM ===================

  async getNotifications(): Promise<RealNotification[]> {
    const user = await this.getActiveUser();
    if (!user) return [];

    // Get real incoming follow requests first!
    const incomingRequests = await this.getIncomingRequests();
    const requestNotifications: RealNotification[] = incomingRequests.map(r => ({
      id: r.id,
      receiverId: user.id,
      senderId: r.senderId,
      senderName: r.senderName,
      senderUsername: r.senderUsername,
      senderAvatar: r.senderAvatar,
      type: "follow_request",
      relatedId: r.id,
      isRead: false,
      createdAt: r.createdAt || new Date().toISOString()
    }));

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("receiver_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!data) return requestNotifications;

      const dbNotifications = await Promise.all(
        data.map(async (n: any) => {
          const profile = await getProfile(n.sender_id);
          return {
            id: n.id,
            receiverId: n.receiver_id,
            senderId: n.sender_id,
            senderName: profile.name,
            senderUsername: profile.username,
            senderAvatar: profile.avatar,
            type: n.type as any,
            relatedId: n.related_id,
            content: n.content,
            isRead: n.is_read,
            createdAt: n.created_at,
          };
        })
      );

      const merged = [...requestNotifications, ...dbNotifications].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return merged;
    } catch (err) {
      // Graceful fallback for when the notifications table hasn't been created yet
      console.warn("Notifications table query failed, using live follow requests + simulated notifications:", err);
      
      // Generate some highly realistic feed notifications so the page is alive
      const simulated: RealNotification[] = [
        {
          id: "sim-1",
          receiverId: user.id,
          senderId: "sim-user-1",
          senderName: "Luna Dream",
          senderUsername: "luna_dream",
          senderAvatar: "/images/avatar_elena_1779191722727.png",
          type: "like_post",
          content: "your Cyberpunk visual art post",
          isRead: false,
          createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString()
        },
        {
          id: "sim-2",
          receiverId: user.id,
          senderId: "sim-user-2",
          senderName: "Elena Rostova",
          senderUsername: "elena_rostova",
          senderAvatar: "/images/avatar_elena_1779191722727.png",
          type: "comment_post",
          content: "Wow, this looks absolutely breathtaking! 😍",
          isRead: false,
          createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString()
        },
        {
          id: "sim-3",
          receiverId: user.id,
          senderId: "sim-user-3",
          senderName: "Marcus Vance",
          senderUsername: "marcus_v",
          senderAvatar: "/images/avatar_marcus_1779191788520.png",
          type: "like_reel",
          content: "your tech loop video reel",
          isRead: true,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        }
      ];

      return [...requestNotifications, ...simulated];
    }
  },

  async createNotification(
    receiverId: string,
    type: "like_post" | "like_reel" | "comment_post",
    relatedId?: string,
    content?: string
  ): Promise<boolean> {
    const user = await this.getActiveUser();
    if (!user || user.id === receiverId) return false;

    try {
      const { error } = await supabase.from("notifications").insert({
        receiver_id: receiverId,
        sender_id: user.id,
        type,
        related_id: relatedId,
        content,
        is_read: false
      });
      return !error;
    } catch (err) {
      console.warn("Could not save database notification (table may not exist yet):", err);
      return false;
    }
  },

  async markNotificationsAsRead(): Promise<void> {
    const user = await this.getActiveUser();
    if (!user) return;

    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("receiver_id", user.id)
        .eq("is_read", false);
    } catch (err) {
      console.warn("Failed to mark notifications as read:", err);
    }
  },

  async deleteNotification(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);
      return !error;
    } catch (err) {
      console.warn("Failed to delete notification:", err);
      return false;
    }
  }
};
