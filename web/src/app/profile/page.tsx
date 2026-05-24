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
                  <Link href={`/user?username=${req.senderUsername || req.senderId}`}><img src={req.senderAvatar} alt="" className="w-10 h-10 rounded-full object-cover border border-black/5" /></Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/user?username=${req.senderUsername || req.senderId}`} className="font-bold text-sm text-on-surface truncate block hover:text-primary">{req.senderName}</Link>
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

      {/* ===== Futurist Cyber-Loop Profile Page ===== */}
      <section className="px-4 pt-4 pb-2 text-left">
        {/* Row: Avatar | Stats */}
        <div className="flex items-center gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full p-[2px] bg-primary/20 shadow-[0_0_15px_rgba(107,255,87,0.2)]">
              <div className="w-full h-full rounded-full border-2 border-background overflow-hidden bg-black">
                <img src={currentUser.avatar} alt={currentUser.fullName} className="w-full h-full object-cover" />
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex-1">
            {/* Username row */}
            <div className="flex items-center gap-2 mb-2">
              <h1 className="font-bold text-xl text-white tracking-tight">@{currentUser.username || currentUser.email.split("@")[0]}</h1>
              <span className="material-symbols-outlined text-primary text-[18px] filter drop-shadow-[0_0_8px_rgba(107,255,87,0.6)]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            </div>

            {/* Stats: posts / followers / following */}
            <div className="flex gap-6">
              <div className="text-center"><p className="font-bold text-lg text-white leading-tight">{userPosts.length}</p><p className="text-[10px] text-white/50 uppercase tracking-widest font-sans font-semibold">posts</p></div>
              <div className="text-center"><p className="font-bold text-lg text-white leading-tight">{followerCount}</p><p className="text-[10px] text-white/50 uppercase tracking-widest font-sans font-semibold">followers</p></div>
              <div className="text-center"><p className="font-bold text-lg text-white leading-tight">{followingCount}</p><p className="text-[10px] text-white/50 uppercase tracking-widest font-sans font-semibold">following</p></div>
            </div>
          </div>
        </div>

        {/* Name & Bio */}
        <div className="mt-4 space-y-1">
          <p className="font-bold text-sm text-white">{currentUser.fullName}</p>
          {currentUser.bio && <p className="text-sm text-white/70 leading-relaxed font-sans">{currentUser.bio}</p>}
        </div>

        {/* Edit Profile + Settings Buttons */}
        <div className="flex gap-2 mt-5">
          <button onClick={() => { setEditName(currentUser.fullName); setEditUsername(currentUser.username || ""); setEditBio(currentUser.bio || ""); setEditAvatar(currentUser.avatar); setEditError(""); setShowEditModal(true); }}
            className="flex-1 py-2 rounded-xl bg-primary/10 border border-primary/20 font-bold text-xs uppercase tracking-wider text-primary active:scale-[0.97] transition-all hover:bg-primary/20 shadow-[0_0_10px_rgba(107,255,87,0.05)]">
            Edit profile
          </button>
          <button onClick={handleSignOut}
            className="flex-1 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 font-bold text-xs uppercase tracking-wider text-red-500 active:scale-[0.97] transition-all flex items-center justify-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">logout</span>
            Log out
          </button>
          <button onClick={() => setShowSettingsModal(true)}
            className="w-10 py-2 rounded-xl bg-black/60 border border-primary/20 flex items-center justify-center active:scale-[0.97] transition-all hover:bg-primary/10 text-primary"
            title="Settings"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </button>
        </div>
      </section>

      {/* Story Highlights */}
      <section className="px-4 py-4 border-b border-primary/10">
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
          <div className="flex flex-col items-center gap-1 min-w-[64px]">
            <div className="w-14 h-14 rounded-full border border-primary/20 flex items-center justify-center bg-black/40 hover:border-primary transition-colors cursor-pointer group">
              <span className="material-symbols-outlined text-primary text-[24px] group-hover:scale-110 transition-transform">add</span>
            </div>
            <span className="text-[10px] text-white/50 font-sans tracking-wide">New Highlight</span>
          </div>
        </div>
      </section>

      {/* Tab Bar with Icons */}
      <div className="flex border-b border-primary/10 bg-black/20">
        {(["posts", "reels", "saved"] as const).map(tab => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 flex items-center justify-center border-b-2 active:scale-95 transition-all ${activeTab === tab ? "text-primary border-primary shadow-[0_4px_15px_rgba(107,255,87,0.05)]" : "text-white/40 border-transparent hover:text-white/80"}`}>
            <span className="material-symbols-outlined text-[22px]" style={activeTab === tab ? { fontVariationSettings: "'FILL' 1" } : {}}>{tabIcons[tab]}</span>
          </button>
        ))}
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-3 gap-[2px] pt-1">
        {gridItems.length === 0 ? (
          <div className="col-span-3 text-center py-16 space-y-3">
            <span className="material-symbols-outlined text-white/20 text-[48px]">{activeTab === "posts" ? "photo_camera" : activeTab === "reels" ? "movie" : "bookmark"}</span>
            <p className="text-sm text-white font-bold">No {activeTab} yet</p>
            <p className="text-xs text-white/40">When you share {activeTab}, they&apos;ll appear here.</p>
          </div>
        ) : gridItems.map((item: any) => (
          <div key={item.id} onClick={() => { if (activeTab === "posts") setActivePost(item); }} className="aspect-square overflow-hidden relative group cursor-pointer border border-primary/5">
            <img className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" src={activeTab === "posts" ? item.imageUrl : "/images/cover_neon_1779191739839.png"} alt="" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4 text-white">
              {activeTab === "posts" && (
                <>
                  <div className="flex items-center gap-1"><span className="material-symbols-outlined text-[20px] text-primary">favorite</span><span className="text-sm font-bold">{(item.loveReaction?.count || 0)}</span></div>
                  <div className="flex items-center gap-1"><span className="material-symbols-outlined text-[20px] text-primary">chat_bubble</span><span className="text-sm font-bold">0</span></div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ===== EDIT PROFILE MODAL ===== */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
          <div className="w-full max-w-md glass-panel rounded-2xl border border-primary/25 shadow-[0_0_30px_rgba(107,255,87,0.15)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-primary/10">
              <button onClick={() => setShowEditModal(false)} className="text-xs font-bold uppercase tracking-wider text-white/50 hover:text-white">Cancel</button>
              <h3 className="font-bold text-sm tracking-widest uppercase text-primary font-sans">Edit Profile</h3>
              <button onClick={handleEditSave} disabled={editSaving} className="text-xs font-bold uppercase tracking-wider text-primary hover:text-primary-container disabled:opacity-50">
                {editSaving ? "..." : "Done"}
              </button>
            </div>

            <div className="p-5 space-y-6 overflow-y-auto max-h-[80vh] no-scrollbar">
              {/* Avatar Change */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/30 p-[2px] bg-black">
                  <img src={editAvatar} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                </div>
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleAvatarUpload} />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar} className="text-xs uppercase font-bold tracking-wider text-primary hover:underline disabled:opacity-50">
                  {uploadingAvatar ? "Uploading..." : "Change profile photo"}
                </button>
                {/* Avatar presets */}
                <div className="flex gap-2 flex-wrap justify-center">
                  {avatarPresets.map((url, i) => (
                    <button key={i} onClick={() => setEditAvatar(url)}
                      className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all active:scale-90 ${editAvatar === url ? "border-primary ring-2 ring-primary/30" : "border-primary/10"}`}>
                      <img src={url} alt="" className="w-full h-full object-cover rounded-full" />
                    </button>
                  ))}
                </div>
                {/* Custom URL */}
                <input type="text" value={editAvatar} onChange={e => setEditAvatar(e.target.value)} placeholder="Or paste image URL..."
                  className="w-full bg-black/60 border border-primary/20 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-sans text-white/80 placeholder:text-white/30" />
              </div>

              {/* Fields */}
              <div className="space-y-4 text-left">
                <div className="border-b border-primary/10 pb-3">
                  <label className="text-[10px] text-white/50 uppercase font-bold tracking-widest">Name</label>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                    className="w-full bg-transparent border-none p-0 mt-1 text-sm text-white font-medium focus:outline-none focus:ring-0 placeholder:text-white/20" placeholder="Your display name" />
                </div>
                <div className="border-b border-primary/10 pb-3">
                  <label className="text-[10px] text-white/50 uppercase font-bold tracking-widest">Username</label>
                  <div className="flex items-center mt-1">
                    <span className="text-sm text-primary font-semibold mr-1">@</span>
                    <input type="text" value={editUsername} onChange={e => { setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, "")); setEditError(""); }}
                      className="flex-1 bg-transparent border-none p-0 text-sm text-white font-medium focus:outline-none focus:ring-0 placeholder:text-white/20" placeholder="username" />
                  </div>
                  {editError && <p className="text-xs text-red-500 font-semibold mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[13px]">error</span>{editError}</p>}
                </div>
                <div className="border-b border-primary/10 pb-3">
                  <label className="text-[10px] text-white/50 uppercase font-bold tracking-widest">Bio</label>
                  <textarea value={editBio} onChange={e => setEditBio(e.target.value)} rows={3} placeholder="Write something about yourself..."
                    className="w-full bg-transparent border-none p-0 mt-1 text-sm text-white font-medium focus:outline-none focus:ring-0 resize-none placeholder:text-white/20" />
                </div>
                <div className="border-b border-primary/10 pb-3">
                  <label className="text-[10px] text-white/50 uppercase font-bold tracking-widest">Email</label>
                  <input type="email" value={editGmail} onChange={e => setEditGmail(e.target.value)}
                    className="w-full bg-transparent border-none p-0 mt-1 text-sm text-white font-medium focus:outline-none focus:ring-0 placeholder:text-white/20" placeholder="yourname@gmail.com" />
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
          <div className="w-full max-w-md glass-panel border border-primary/25 rounded-2xl shadow-[0_0_30px_rgba(107,255,87,0.15)] overflow-hidden text-white">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-primary/10">
              <div className="w-12" />
              <h3 className="font-bold text-sm tracking-widest uppercase font-sans text-primary">Settings</h3>
              <button 
                onClick={() => setShowSettingsModal(false)} 
                className="text-xs font-bold uppercase tracking-wider text-primary hover:text-primary-container"
              >
                Close
              </button>
            </div>

            {/* Content List */}
            <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto no-scrollbar text-left font-sans">
              
              {/* Theme Settings */}
              <div className="flex justify-between items-center py-2 border-b border-primary/10">
                <div>
                  <p className="text-sm font-bold text-white">App Theme</p>
                  <p className="text-xs text-white/50">Switch between dark and light themes</p>
                </div>
                <button
                  onClick={toggleTheme}
                  className="px-4 py-1.5 rounded-full text-xs font-bold bg-primary text-black transition-all active:scale-95 flex items-center gap-1.5 shadow-[0_0_12px_rgba(107,255,87,0.3)]"
                >
                  <span className="material-symbols-outlined text-[16px] font-bold">{theme === "dark" ? "light_mode" : "dark_mode"}</span>
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </button>
              </div>

              {/* Account Privacy Toggle */}
              <div className="flex justify-between items-center py-2 border-b border-primary/10">
                <div>
                  <p className="text-sm font-bold text-white">Account Privacy</p>
                  <p className="text-xs text-white/50">Control who sees your posts and stories</p>
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
                      ? "bg-primary text-black shadow-[0_0_12px_rgba(107,255,87,0.3)] font-bold" 
                      : "bg-black/60 border border-primary/20 text-primary"
                  }`}
                >
                  {isPrivateAccount ? "Private" : "Public"}
                </button>
              </div>

              {/* Account Block Management */}
              <div className="py-2 border-b border-primary/10 space-y-2">
                <div>
                  <p className="text-sm font-bold text-white">Blocked Accounts</p>
                  <p className="text-xs text-white/50">Manage who you have blocked</p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newBlockInput}
                    onChange={(e) => setNewBlockInput(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))}
                    placeholder="username to block..."
                    className="flex-1 bg-black/60 border border-primary/20 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-primary text-white placeholder:text-white/30"
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
                    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl text-xs font-bold transition-all"
                  >
                    Block
                  </button>
                </div>
                {blockedUsers.length > 0 ? (
                  <div className="flex gap-1.5 flex-wrap pt-1">
                    {blockedUsers.map((username) => (
                      <div key={username} className="flex items-center gap-1 bg-black/60 px-2.5 py-1 rounded-full text-xs text-white border border-primary/10">
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
                  <p className="text-xs text-white/30 italic">No blocked accounts.</p>
                )}
              </div>

              {/* About Section */}
              <div className="py-2 border-b border-primary/10">
                <p className="text-sm font-bold text-white">About Loop</p>
                <div className="mt-2 text-xs text-white/50 space-y-1 font-sans">
                  <p><strong>Version:</strong> 1.5.0-Stable</p>
                  <p><strong>Platform:</strong> AI-Powered Social Media Web App</p>
                  <p>Designed for premium creators, digital artists, and multi-user interactions.</p>
                </div>
              </div>

              {/* Help & Support Section */}
              <div className="py-2">
                <p className="text-sm font-bold text-white">Help & Support</p>
                <div className="mt-2">
                  <div className="p-3 bg-black/60 rounded-xl border border-primary/10 text-xs text-white/50 space-y-1">
                    <p className="font-bold text-white">Need assistance?</p>
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
