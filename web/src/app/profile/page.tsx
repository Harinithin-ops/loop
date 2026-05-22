"use client";

import React, { useState, useEffect, useRef } from "react";
import { dbService, RealPost, RealReel, RealUser, FollowRequest, uploadFileToStorage } from "@/app/utils/dbService";
import Link from "next/link";
import PostDetailModal from "@/components/PostDetailModal";
import { supabase } from "@/app/utils/supabase";
import { useTheme } from "@/app/utils/ThemeProvider";

export default function CreatorProfile() {
  const [currentUser, setCurrentUser] = useState<RealUser | null>(null);
  const [activeTab, setActiveTab] = useState<"posts" | "reels" | "saved">("posts");

  const { theme, toggleTheme } = useTheme();

  // Settings states
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isPrivateAccount, setIsPrivateAccount] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [newBlockInput, setNewBlockInput] = useState("");

  const handleSignOut = async () => {
    sessionStorage.removeItem("loop_mock_session");
    localStorage.removeItem("loop_mock_session");
    window.dispatchEvent(new Event("loop_auth_changed"));
    try {
      supabase.auth.signOut().catch(() => {});
    } catch {}
    window.location.href = "/login";
  };
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userPosts, setUserPosts] = useState<RealPost[]>([]);
  const [userReels, setUserReels] = useState<RealReel[]>([]);

  // Edit profile modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editGmail, setEditGmail] = useState("");
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [activePost, setActivePost] = useState<RealPost | null>(null);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingAvatar(true);
      const url = await uploadFileToStorage(file, "avatars");
      setEditAvatar(url);
    } catch (err) {
      setEditError("Failed to upload image");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Follow requests
  const [incomingRequests, setIncomingRequests] = useState<FollowRequest[]>([]);
  const [showRequests, setShowRequests] = useState(false);

  const avatarPresets = [
    "/images/avatar_marcus_1779191788520.png",
    "/images/avatar_elena_1779191722727.png",
    "/images/avatar_sarah_1779191804823.png",
    "/images/cover_neon_1779191739839.png",
    "/images/post_art_1_1779191755679.png",
  ];

  const loadProfileData = async () => {
    setLoading(true);
    try {
      const u = await dbService.getActiveUser();
      setCurrentUser(u);
      if (u) {
        setEditName(u.fullName); setEditUsername(u.username || ""); setEditBio(u.bio || ""); setEditAvatar(u.avatar); setEditGmail(u.gmail || "");
        const posts = await dbService.getPostsByUserId(u.id); setUserPosts(posts);
        const reels = await dbService.getReelsByUserId(u.id); setUserReels(reels);
        setFollowerCount(await dbService.getFollowerCount(u.id));
        setFollowingCount(await dbService.getFollowingCount(u.id));
        setIncomingRequests(await dbService.getIncomingRequests());
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { loadProfileData(); window.addEventListener("loop_feed_refresh", loadProfileData); return () => window.removeEventListener("loop_feed_refresh", loadProfileData); }, []);

  useEffect(() => {
    if (currentUser) {
      const privateVal = localStorage.getItem(`loop_user_private_${currentUser.id}`);
      setIsPrivateAccount(privateVal === "true");

      const blockedVal = localStorage.getItem(`loop_blocked_users_${currentUser.id}`);
      if (blockedVal) {
        try {
          setBlockedUsers(JSON.parse(blockedVal));
        } catch {
          setBlockedUsers(["spammer_bot", "troll_creator"]);
        }
      } else {
        setBlockedUsers(["spammer_bot", "troll_creator"]);
      }
    }
  }, [currentUser]);

  const handleEditSave = async () => {
    setEditError(""); setEditSaving(true);
    try {
      if (editUsername !== (currentUser?.username || "")) {
        const res = await dbService.updateUsername(editUsername);
        if (!res.success) { setEditError(res.error || "Username error"); setEditSaving(false); return; }
      }
      const success = await dbService.updateProfile({ full_name: editName, bio: editBio, avatar_url: editAvatar, gmail: editGmail });
      if (!success) { setEditError("Failed to save profile. Check Supabase RLS policies."); setEditSaving(false); return; }

      // Immediately reflect the new values in the UI without waiting for a full reload
      setCurrentUser((prev) => prev ? {
        ...prev,
        fullName: editName,
        username: editUsername,
        bio: editBio,
        avatar: editAvatar,
        gmail: editGmail,
      } : prev);

      setShowEditModal(false);
      // Trigger a background reload to sync any server-side changes
      loadProfileData();
      // Notify Navbar to refresh the user avatar
      window.dispatchEvent(new Event("loop_auth_changed"));
    } catch { setEditError("Failed to save"); } finally { setEditSaving(false); }
  };

  const handleAccept = async (id: string) => { await dbService.acceptFollowRequest(id); setIncomingRequests(p => p.filter(r => r.id !== id)); setFollowerCount(c => c + 1); };
  const handleReject = async (id: string) => { await dbService.rejectFollowRequest(id); setIncomingRequests(p => p.filter(r => r.id !== id)); };

  const tabIcons: Record<string, string> = { posts: "grid_on", reels: "movie", saved: "bookmark" };

  if (loading) return (
    <div className="pt-32 flex flex-col items-center justify-center space-y-4">
      <span className="material-symbols-outlined animate-spin text-[36px] text-primary">progress_activity</span>
      <p className="text-sm font-semibold text-outline-variant font-label-caps tracking-wider">LOADING PROFILE...</p>
    </div>
  );

  if (!currentUser) return (
    <div className="pt-20 pb-32 md:py-0 max-w-md mx-auto h-[70vh] flex flex-col items-center justify-center">
      <div className="glass-panel p-8 rounded-2xl border border-white/50 shadow-xl text-center space-y-6 w-full">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary animate-bounce">
          <span className="material-symbols-outlined text-[32px]">person</span>
        </div>
        <h2 className="text-2xl font-bold font-headline-md text-on-surface">Private Profile</h2>
        <p className="text-sm text-on-surface-variant leading-relaxed">Sign in to view your creator profile.</p>
        <Link href="/login" className="block w-full py-3 rounded-xl bg-primary text-white font-bold text-sm tracking-wide shadow-lg hover:bg-primary/95 transition-all text-center font-label-caps">SIGN IN NOW</Link>
      </div>
    </div>
  );

  const gridItems = activeTab === "posts" ? userPosts : activeTab === "reels" ? userReels : [];

  return (
    <div className="pt-20 pb-32 md:py-0 max-w-2xl mx-auto space-y-0">
      {/* Follow Requests Banner */}
      {incomingRequests.length > 0 && (
        <div className="glass-panel p-4 rounded-lg border border-primary/20 shadow-md mb-4">
          <button onClick={() => setShowRequests(!showRequests)} className="w-full flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary"><span className="material-symbols-outlined text-[20px]">person_add</span></div>
              <div className="text-left"><p className="font-bold text-sm text-on-surface">Follow Requests</p><p className="text-xs text-on-surface-variant">{incomingRequests.length} pending</p></div>
            </div>
            <span className="material-symbols-outlined text-outline-variant">{showRequests ? "expand_less" : "expand_more"}</span>
          </button>
          {showRequests && (
            <div className="mt-4 space-y-3 border-t border-black/5 pt-4">
              {incomingRequests.map(req => (
                <div key={req.id} className="flex items-center gap-3">
                  <Link href={`/user/${req.senderUsername}`}><img src={req.senderAvatar} alt="" className="w-10 h-10 rounded-full object-cover border border-black/5" /></Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/user/${req.senderUsername}`} className="font-bold text-sm text-on-surface truncate block hover:text-primary">{req.senderName}</Link>
                    <p className="text-xs text-primary font-semibold">@{req.senderUsername}</p>
                  </div>
                  <button onClick={() => handleAccept(req.id)} className="px-3 py-1.5 bg-primary text-white rounded-full text-xs font-bold active:scale-95 transition-all">Accept</button>
                  <button onClick={() => handleReject(req.id)} className="px-3 py-1.5 bg-surface-container border border-black/10 text-on-surface-variant rounded-full text-xs font-bold active:scale-95 transition-all">Reject</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== INSTAGRAM-STYLE PROFILE HEADER ===== */}
      <section className="px-4 pt-4 pb-2">
        {/* Row: Avatar | Stats */}
        <div className="flex items-center gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full p-1 border-2 border-primary/20 bg-surface-container-low">
              <div className="w-full h-full rounded-full border-[3px] border-surface-container-lowest overflow-hidden bg-white">
                <img src={currentUser.avatar} alt={currentUser.fullName} className="w-full h-full object-cover" />
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex-1">
            {/* Username row */}
            <div className="flex items-center gap-2 mb-2">
              <h1 className="font-bold text-xl text-on-surface tracking-tight">{currentUser.username || currentUser.email.split("@")[0]}</h1>
              <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            </div>

            {/* Stats: posts / followers / following */}
            <div className="flex gap-6">
              <div className="text-center"><p className="font-bold text-lg text-on-surface leading-tight">{userPosts.length}</p><p className="text-[11px] text-on-surface-variant">posts</p></div>
              <div className="text-center"><p className="font-bold text-lg text-on-surface leading-tight">{followerCount}</p><p className="text-[11px] text-on-surface-variant">followers</p></div>
              <div className="text-center"><p className="font-bold text-lg text-on-surface leading-tight">{followingCount}</p><p className="text-[11px] text-on-surface-variant">following</p></div>
            </div>
          </div>
        </div>

        {/* Name & Bio */}
        <div className="mt-3 space-y-1">
          <p className="font-bold text-sm text-on-surface">{currentUser.fullName}</p>
          {currentUser.bio && <p className="text-sm text-on-surface-variant leading-snug whitespace-pre-line">{currentUser.bio}</p>}
        </div>

        {/* Edit Profile + Settings Buttons */}
        <div className="flex gap-2 mt-4">
          <button onClick={() => { setEditName(currentUser.fullName); setEditUsername(currentUser.username || ""); setEditBio(currentUser.bio || ""); setEditAvatar(currentUser.avatar); setEditError(""); setShowEditModal(true); }}
            className="flex-1 py-2 rounded-lg bg-surface-container border border-black/10 font-bold text-sm text-on-surface active:scale-[0.97] transition-all hover:bg-surface-container-high">
            Edit profile
          </button>
          <button onClick={handleSignOut}
            className="flex-1 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 font-bold text-sm text-red-600 active:scale-[0.97] transition-all flex items-center justify-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Log out
          </button>
          <button onClick={() => setShowSettingsModal(true)}
            className="w-10 py-2 rounded-lg bg-surface-container border border-black/10 flex items-center justify-center active:scale-[0.97] transition-all hover:bg-surface-container-high"
            title="Settings"
          >
            <span className="material-symbols-outlined text-on-surface text-[20px]">settings</span>
          </button>
        </div>
      </section>

      {/* Story Highlights */}
      <section className="px-4 py-4 border-b border-surface-variant/50">
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
          <div className="flex flex-col items-center gap-1 min-w-[64px]">
            <div className="w-16 h-16 rounded-full border-2 border-surface-variant flex items-center justify-center bg-surface-container-low">
              <span className="material-symbols-outlined text-on-surface-variant text-[28px]">add</span>
            </div>
            <span className="text-[11px] text-on-surface-variant">New</span>
          </div>
        </div>
      </section>

      {/* Tab Bar with Icons */}
      <div className="flex border-b border-surface-variant/50">
        {(["posts", "reels", "saved"] as const).map(tab => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 flex items-center justify-center border-b-2 active:scale-95 transition-all ${activeTab === tab ? "text-primary border-primary" : "text-outline-variant border-transparent"}`}>
            <span className="material-symbols-outlined text-[22px]" style={activeTab === tab ? { fontVariationSettings: "'FILL' 1" } : {}}>{tabIcons[tab]}</span>
          </button>
        ))}
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-3 gap-[2px]">
        {gridItems.length === 0 ? (
          <div className="col-span-3 text-center py-16 space-y-3">
            <span className="material-symbols-outlined text-outline-variant text-[48px]">{activeTab === "posts" ? "photo_camera" : activeTab === "reels" ? "movie" : "bookmark"}</span>
            <p className="text-sm text-on-surface font-bold">No {activeTab} yet</p>
            <p className="text-xs text-outline-variant">When you share {activeTab}, they&apos;ll appear here.</p>
          </div>
        ) : gridItems.map((item: any) => (
          <div key={item.id} onClick={() => { if (activeTab === "posts") setActivePost(item); }} className="aspect-square overflow-hidden relative group cursor-pointer">
            <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src={activeTab === "posts" ? item.imageUrl : "/images/cover_neon_1779191739839.png"} alt="" />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        ))}
      </div>

      {/* ===== EDIT PROFILE MODAL ===== */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
          <div className="w-full max-w-md glass-panel rounded-2xl border border-white/40 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
              <button onClick={() => setShowEditModal(false)} className="text-sm font-semibold text-on-surface-variant hover:text-on-surface">Cancel</button>
              <h3 className="font-bold text-base text-on-surface">Edit Profile</h3>
              <button onClick={handleEditSave} disabled={editSaving} className="text-sm font-bold text-primary hover:text-primary/80 disabled:opacity-50">
                {editSaving ? "..." : "Done"}
              </button>
            </div>

            <div className="p-5 space-y-6">
              {/* Avatar Change */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/20">
                  <img src={editAvatar} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleAvatarUpload} />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar} className="text-sm text-primary font-bold hover:underline disabled:opacity-50">
                  {uploadingAvatar ? "Uploading..." : "Change profile photo"}
                </button>
                {/* Avatar presets */}
                <div className="flex gap-2 flex-wrap justify-center">
                  {avatarPresets.map((url, i) => (
                    <button key={i} onClick={() => setEditAvatar(url)}
                      className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all active:scale-90 ${editAvatar === url ? "border-primary ring-2 ring-primary/30" : "border-black/10"}`}>
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
                {/* Custom URL */}
                <input type="text" value={editAvatar} onChange={e => setEditAvatar(e.target.value)} placeholder="Or paste image URL..."
                  className="w-full bg-surface-container-low border border-black/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary font-sans text-on-surface-variant" />
              </div>

              {/* Fields */}
              <div className="space-y-4">
                <div className="border-b border-black/5 pb-3">
                  <label className="text-xs text-on-surface-variant font-semibold">Name</label>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                    className="w-full bg-transparent border-none p-0 mt-1 text-sm text-on-surface font-medium focus:outline-none focus:ring-0" placeholder="Your display name" />
                </div>
                <div className="border-b border-black/5 pb-3">
                  <label className="text-xs text-on-surface-variant font-semibold">Username</label>
                  <div className="flex items-center mt-1">
                    <span className="text-sm text-primary font-semibold mr-1">@</span>
                    <input type="text" value={editUsername} onChange={e => { setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, "")); setEditError(""); }}
                      className="flex-1 bg-transparent border-none p-0 text-sm text-on-surface font-medium focus:outline-none focus:ring-0" placeholder="username" />
                  </div>
                  {editError && <p className="text-xs text-red-500 font-semibold mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">error</span>{editError}</p>}
                </div>
                <div className="border-b border-black/5 pb-3">
                  <label className="text-xs text-on-surface-variant font-semibold">Bio</label>
                  <textarea value={editBio} onChange={e => setEditBio(e.target.value)} rows={3} placeholder="Write something about yourself..."
                    className="w-full bg-transparent border-none p-0 mt-1 text-sm text-on-surface font-medium focus:outline-none focus:ring-0 resize-none" />
                </div>
                <div className="border-b border-black/5 pb-3">
                  <label className="text-xs text-on-surface-variant font-semibold">Email</label>
                  <input type="email" value={editGmail} onChange={e => setEditGmail(e.target.value)}
                    className="w-full bg-transparent border-none p-0 mt-1 text-sm text-on-surface font-medium focus:outline-none focus:ring-0" placeholder="yourname@gmail.com" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Post Detail Overlay Modal */}
      {activePost && (
        <PostDetailModal
          post={activePost}
          currentUser={currentUser}
          onClose={() => setActivePost(null)}
          onDeletePost={async (postId) => {
            const success = await dbService.deletePost(postId);
            if (success) {
              // Instantly remove the post from the grid using functional update (no stale closure)
              setUserPosts((prev) => prev.filter((p) => p.id !== postId));
              setActivePost(null);
              alert("Post deleted successfully!");
            } else {
              alert("Failed to delete post. Please run the Supabase RLS SQL fix script and try again.");
            }
          }}
        />
      )}

      {/* ===== SETTINGS MODAL ===== */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl border border-white/40 shadow-2xl overflow-hidden text-on-surface">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/5">
              <div className="w-12" />
              <h3 className="font-bold text-base">Settings</h3>
              <button 
                onClick={() => setShowSettingsModal(false)} 
                className="text-sm font-bold text-primary hover:text-primary/80"
              >
                Close
              </button>
            </div>

            {/* Content List */}
            <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto no-scrollbar">
              
              {/* Theme Settings */}
              <div className="flex justify-between items-center py-2 border-b border-black/5">
                <div>
                  <p className="text-sm font-bold">App Theme</p>
                  <p className="text-xs text-on-surface-variant">Switch between dark and light themes</p>
                </div>
                <button
                  onClick={toggleTheme}
                  className="px-4 py-1.5 rounded-full text-xs font-bold bg-primary text-white transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">{theme === "dark" ? "light_mode" : "dark_mode"}</span>
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </button>
              </div>

              {/* Account Privacy Toggle */}
              <div className="flex justify-between items-center py-2 border-b border-black/5">
                <div>
                  <p className="text-sm font-bold">Account Privacy</p>
                  <p className="text-xs text-on-surface-variant">Control who sees your posts and stories</p>
                </div>
                <button
                  onClick={() => {
                    const nextPrivate = !isPrivateAccount;
                    setIsPrivateAccount(nextPrivate);
                    if (currentUser) {
                      localStorage.setItem(`loop_user_private_${currentUser.id}`, String(nextPrivate));
                    }
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                    isPrivateAccount 
                      ? "bg-primary text-white" 
                      : "bg-surface-container border border-black/10 text-on-surface"
                  }`}
                >
                  {isPrivateAccount ? "Private" : "Public"}
                </button>
              </div>

              {/* Account Block Management */}
              <div className="py-2 border-b border-black/5 space-y-2">
                <div>
                  <p className="text-sm font-bold">Blocked Accounts</p>
                  <p className="text-xs text-on-surface-variant">Manage who you have blocked</p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newBlockInput}
                    onChange={(e) => setNewBlockInput(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))}
                    placeholder="username to block..."
                    className="flex-1 bg-surface-container border border-black/10 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-on-surface"
                  />
                  <button
                    onClick={() => {
                      if (!newBlockInput) return;
                      if (blockedUsers.includes(newBlockInput)) {
                        alert("User is already blocked.");
                        return;
                      }
                      const updated = [...blockedUsers, newBlockInput];
                      setBlockedUsers(updated);
                      if (currentUser) {
                        localStorage.setItem(`loop_blocked_users_${currentUser.id}`, JSON.stringify(updated));
                      }
                      setNewBlockInput("");
                    }}
                    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 rounded-lg text-xs font-bold transition-all"
                  >
                    Block
                  </button>
                </div>
                {blockedUsers.length > 0 ? (
                  <div className="flex gap-1.5 flex-wrap pt-1">
                    {blockedUsers.map((username) => (
                      <div key={username} className="flex items-center gap-1 bg-surface-container px-2.5 py-1 rounded-full text-xs text-on-surface border border-black/5">
                        <span>@{username}</span>
                        <button
                          onClick={() => {
                            const updated = blockedUsers.filter((u) => u !== username);
                            setBlockedUsers(updated);
                            if (currentUser) {
                              localStorage.setItem(`loop_blocked_users_${currentUser.id}`, JSON.stringify(updated));
                            }
                          }}
                          className="text-red-500 hover:text-red-700 font-bold ml-1"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-on-surface-variant italic">No blocked accounts.</p>
                )}
              </div>

              {/* About Section */}
              <div className="py-2 border-b border-black/5">
                <p className="text-sm font-bold">About Loop</p>
                <div className="mt-2 text-xs text-on-surface-variant space-y-1">
                  <p><strong>Version:</strong> 1.5.0-Stable</p>
                  <p><strong>Platform:</strong> AI-Powered Social Media Web App</p>
                  <p>Designed for premium creators, digital artists, and multi-user interactions.</p>
                </div>
              </div>

              {/* Help & Support Section */}
              <div className="py-2">
                <p className="text-sm font-bold">Help & Support</p>
                <div className="mt-2">
                  <div className="p-3 bg-surface-container rounded-lg border border-black/5 text-xs text-on-surface-variant space-y-1">
                    <p className="font-bold text-on-surface">Need assistance?</p>
                    <p>Email: <a href="mailto:support@loopsocial.ai" className="text-primary font-semibold hover:underline">support@loopsocial.ai</a></p>
                    <p>FAQ: Toggle your theme, post high-definition reels, customize captions using AI commands, or privatize your account dynamically.</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
