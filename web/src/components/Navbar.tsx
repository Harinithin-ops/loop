"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/app/utils/supabase";
import { dbService, uploadFileToStorage, RealNotification } from "@/app/utils/dbService";
import { useTheme } from "@/app/utils/ThemeProvider";

export default function Navbar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [hideNav, setHideNav] = useState(false);
  const [lastScrollTop, setLastScrollTop] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // Create modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<"post" | "story" | "reel">("post");
  const [createStep, setCreateStep] = useState<"upload" | "details">("upload");
  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [tone, setTone] = useState("Cyberpunk");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notifications, setNotifications] = useState<RealNotification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await dbService.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error("Failed to load notifications", err);
    }
  }, []);

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const success = await dbService.acceptFollowRequest(requestId);
      if (success) {
        setNotifications(prev =>
          prev.map(n => (n.id === requestId ? { ...n, type: "comment_post", content: "Accepted follow request! Chat is unlocked." } as any : n))
        );
        window.dispatchEvent(new Event("loop_feed_refresh"));
      } else {
        alert("Failed to accept request");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const success = await dbService.rejectFollowRequest(requestId);
      if (success) {
        setNotifications(prev => prev.filter(n => n.id !== requestId));
      } else {
        alert("Failed to delete request");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearNotifications = async () => {
    await dbService.markNotificationsAsRead();
    // Only keep follow requests
    setNotifications(prev => prev.filter(n => n.type === "follow_request"));
  };
  const dropZoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkUser = async () => {
      const active = await dbService.getActiveUser();
      setUser(active);
      if (active) {
        const count = await dbService.getTotalUnreadCount();
        setUnreadCount(count);
        // Load initial notifications
        try {
          const data = await dbService.getNotifications();
          setNotifications(data);
        } catch {}
      }
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async () => {
      const active = await dbService.getActiveUser();
      setUser(active);
    });

    // Realtime follow requests live sync
    const followChannel = supabase
      .channel("follow_requests_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "follow_requests" },
        async () => {
          try {
            const data = await dbService.getNotifications();
            setNotifications(data);
            window.dispatchEvent(new Event("loop_follow_sync"));
          } catch {}
        }
      )
      .subscribe();

    // Realtime notifications live sync
    const notifChannel = supabase
      .channel("notifications_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        async () => {
          try {
            const data = await dbService.getNotifications();
            setNotifications(data);
          } catch {}
        }
      )
      .subscribe();

    window.addEventListener("loop_auth_changed", checkUser);
    const interval = setInterval(async () => {
      try {
        const c = await dbService.getTotalUnreadCount();
        setUnreadCount(c);
        const activeUser = await dbService.getActiveUser();
        if (activeUser) {
          const data = await dbService.getNotifications();
          setNotifications(data);
        }
      } catch {}
    }, 15000);

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(followChannel);
      supabase.removeChannel(notifChannel);
      window.removeEventListener("loop_auth_changed", checkUser);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (showNotifications) {
      fetchNotifications();
    }
  }, [showNotifications, fetchNotifications]);

  const handleSignOut = async () => {
    sessionStorage.removeItem("loop_mock_session");
    localStorage.removeItem("loop_mock_session");
    window.dispatchEvent(new Event("loop_auth_changed"));
    try {
      supabase.auth.signOut().catch(() => {});
    } catch {}
    window.location.href = "/login";
  };

  // File handling
  const handleFileSelect = useCallback((file: File) => {
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isImage && !isVideo) { alert("Please select an image or video file."); return; }
    if (file.size > 50 * 1024 * 1024) { alert("File too large. Max 50MB."); return; }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    if (isVideo) setCreateType("reel");
    setCreateStep("details");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);

  const resetCreateModal = () => {
    setCreateStep("upload"); setSelectedFile(null); setPreviewUrl("");
    setCaption(""); setImageUrl(""); setVideoUrl(""); setUploadProgress("");
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { alert("Please sign in first to publish content!"); return; }
    setLoading(true);
    try {
      let mediaUrl = imageUrl || videoUrl;

      // Upload file if selected from system
      if (selectedFile) {
        setUploadProgress("Uploading...");
        const folder = selectedFile.type.startsWith("video/") ? "reels" : createType === "story" ? "stories" : "posts";
        mediaUrl = await uploadFileToStorage(selectedFile, folder);
        setUploadProgress("");
      }

      if (!mediaUrl) throw new Error("Please select a file or provide a URL.");

      if (createType === "post") {
        const tags = caption.match(/#[a-zA-Z0-9]+/g) || ["#LoopAI", "#Social"];
        await dbService.createPost(caption, mediaUrl, tone, tags);
      } else if (createType === "story") {
        await dbService.addStory(mediaUrl);
      } else if (createType === "reel") {
        await dbService.addReel(mediaUrl, caption);
      }

      resetCreateModal(); setIsCreateOpen(false);
      window.dispatchEvent(new Event("loop_feed_refresh"));
      alert(`${createType.toUpperCase()} published successfully!`);
    } catch (err: any) { alert(err.message || "Failed to publish"); } finally { setLoading(false); }
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      if (scrollTop > lastScrollTop && scrollTop > 100) setHideNav(true); else setHideNav(false);
      setLastScrollTop(scrollTop <= 0 ? 0 : scrollTop);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollTop]);

  // Navigation items matching Instagram sidebar order
  const sidebarItems = [
    { name: "Home", icon: "home", href: "/" },
    { name: "Reels", icon: "movie", href: "/reels" },
    { name: "Messages", icon: "chat_bubble", href: "/messages", badge: unreadCount },
    { name: "Search", icon: "search", href: "/explore" },
    { name: "Notifications", icon: "favorite", href: "#", action: "notifications" },
    { name: "Create", icon: "add_box", href: "#", action: "create" },
    { name: "Profile", icon: "person", href: "/profile", isProfile: true },
  ];

  const mobileItems = [
    { name: "Home", icon: "home", href: "/" },
    { name: "Explore", icon: "search", href: "/explore" },
    { name: "Create", icon: "add_circle", href: "#", action: "create" },
    { name: "Messages", icon: "chat_bubble", href: "/messages", badge: unreadCount },
    { name: "Profile", icon: "person", href: "/profile", isProfile: true },
  ];

  const userAvatar = user?.avatar || "/images/avatar_marcus_1779191788520.png";

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#fbf8ff]">
      {/* ===== DARK INSTAGRAM-STYLE SIDEBAR ===== */}
      <aside className="hidden md:flex flex-col w-[220px] lg:w-[245px] fixed h-screen bg-[#000000] border-r border-[#262626] px-3 py-8 z-40">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 px-3 mb-8">
          <span className="material-symbols-outlined text-white text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>all_inclusive</span>
          <span className="text-[24px] tracking-tight text-white font-bold" style={{ fontFamily: "'Segoe UI', sans-serif" }}>Loop</span>
        </Link>

        {/* Nav Items */}
        <nav className="flex-1 flex flex-col gap-0.5">
          {sidebarItems.map((item) => {
            const isActive = item.href !== "#" && pathname === item.href;
            const isSearch = item.name === "Search";

            // Action buttons (Create, Notifications)
            if (item.action === "create") {
              return (
                <button key={item.name} onClick={() => setIsCreateOpen(true)}
                  className="flex items-center gap-4 px-3 py-3 rounded-lg text-[#f5f5f5] hover:bg-[#1a1a1a] transition-all duration-200 group w-full text-left">
                  <span className="material-symbols-outlined text-[28px] text-[#f5f5f5] group-hover:scale-110 transition-transform">{item.icon}</span>
                  <span className="text-[15px] font-normal">{item.name}</span>
                </button>
              );
            }
            if (item.action === "notifications") {
              return (
                <button key={item.name} onClick={() => setShowNotifications(!showNotifications)}
                  className="flex items-center gap-4 px-3 py-3 rounded-lg text-[#f5f5f5] hover:bg-[#1a1a1a] transition-all duration-200 group w-full text-left">
                  <span className="material-symbols-outlined text-[28px] text-[#f5f5f5] group-hover:scale-110 transition-transform"
                    style={showNotifications ? { fontVariationSettings: "'FILL' 1" } : {}}>{item.icon}</span>
                  <span className="text-[15px] font-normal">{item.name}</span>
                </button>
              );
            }

            return (
              <Link key={item.name} href={item.href}
                className={`flex items-center gap-4 px-3 py-3 rounded-lg transition-all duration-200 group relative ${
                  isActive ? "text-white font-bold" : isSearch ? "text-[#f5f5f5] bg-[#1a1a1a]" : "text-[#f5f5f5] hover:bg-[#1a1a1a]"
                }`}>
                {/* Profile uses avatar, others use icon */}
                {item.isProfile ? (
                  <div className={`w-[28px] h-[28px] rounded-full overflow-hidden border-2 ${isActive ? "border-white" : "border-transparent"}`}>
                    <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <span className="material-symbols-outlined text-[28px] group-hover:scale-110 transition-transform"
                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>{item.icon}</span>
                )}
                <span className={`text-[15px] ${isActive ? "font-bold" : "font-normal"}`}>{item.name}</span>

                {/* Unread badge for Messages */}
                {item.badge && item.badge > 0 ? (
                  <span className="absolute left-8 top-2 w-[18px] h-[18px] bg-[#ff3040] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section: More + User */}
        <div className="mt-auto space-y-1 pt-4 border-t border-[#262626]">
          {/* More Button */}
          <div className="relative">
            <button onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="flex items-center gap-4 px-3 py-3 rounded-lg text-[#f5f5f5] hover:bg-[#1a1a1a] transition-all duration-200 w-full text-left group">
              <span className="material-symbols-outlined text-[28px] group-hover:scale-110 transition-transform">menu</span>
              <span className="text-[15px] font-normal">More</span>
            </button>

            {/* More dropdown */}
            {showMoreMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                <div className="absolute bottom-full left-0 mb-2 w-[220px] bg-[#262626] rounded-2xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
                  {/* Theme Toggle */}
                  <button onClick={() => { toggleTheme(); }}
                    className="flex items-center gap-3 px-4 py-3 text-[#f5f5f5] hover:bg-[#363636] transition-colors text-sm w-full text-left">
                    <span className="material-symbols-outlined text-[22px]">{theme === "dark" ? "light_mode" : "dark_mode"}</span>
                    {theme === "dark" ? "Switch to Light" : "Switch to Dark"}
                  </button>
                  <div className="border-t border-[#363636]" />
                  <Link href="/ai-studio" onClick={() => setShowMoreMenu(false)}
                    className="flex items-center gap-3 px-4 py-3 text-[#f5f5f5] hover:bg-[#363636] transition-colors text-sm">
                    <span className="material-symbols-outlined text-[22px]">smart_toy</span>AI Studio
                  </Link>
                  <div className="border-t border-[#363636]" />
                  {user ? (
                    <button onClick={() => { setShowMoreMenu(false); handleSignOut(); }}
                      className="flex items-center gap-3 px-4 py-3 text-[#ed4956] hover:bg-[#363636] transition-colors text-sm w-full text-left">
                      <span className="material-symbols-outlined text-[22px]">logout</span>Log out
                    </button>
                  ) : (
                    <Link href="/login" onClick={() => setShowMoreMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 text-[#f5f5f5] hover:bg-[#363636] transition-colors text-sm">
                      <span className="material-symbols-outlined text-[22px]">login</span>Sign in
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 md:pl-[220px] lg:pl-[245px] flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header style={{ transform: hideNav ? "translateY(-120%)" : "translateY(0)" }}
          className="md:hidden fixed top-3 left-3 right-3 rounded-lg border border-white/40 bg-surface-container-lowest/60 backdrop-blur-2xl shadow-xl flex justify-between items-center px-container-margin h-16 z-50 transition-transform duration-300 ease-out">
          <Link href="/" className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>all_inclusive</span>
            <span className="text-[24px] tracking-tighter text-primary font-bold">Loop</span>
          </Link>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowNotifications(!showNotifications)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors active:scale-95 duration-200 relative">
              <span className="material-symbols-outlined text-on-surface-variant text-[24px]">favorite</span>
            </button>
            <Link href="/messages" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors active:scale-95 duration-200 relative">
              <span className="material-symbols-outlined text-on-surface-variant text-[24px]">chat_bubble</span>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#ff3040] text-white text-[9px] font-bold rounded-full flex items-center justify-center">{unreadCount > 9 ? "9+" : unreadCount}</span>
              )}
            </Link>
          </div>
        </header>

        {/* Backdrops for dismissing */}
        {showNotifications && (
          <div className="fixed inset-0 z-20 bg-black/30 backdrop-blur-[1px]" onClick={() => setShowNotifications(false)} />
        )}

        {/* ===== PREMIUM NOTIFICATIONS DRAWER ===== */}
        {/* Desktop Drawer (slides out next to sidebar) */}
        <div className={`hidden md:flex flex-col fixed top-0 bottom-0 w-[397px] bg-[#000000] border-r border-[#262626] z-30 transition-transform duration-300 ease-in-out shadow-2xl left-[220px] lg:left-[245px] ${
          showNotifications ? "translate-x-0" : "-translate-x-full pointer-events-none"
        }`}>
          <div className="flex flex-col h-full pt-8 px-6 pb-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white tracking-tight">Notifications</h2>
              {notifications.length > 0 && (
                <button onClick={handleClearNotifications} className="text-xs font-bold text-primary hover:text-primary/80 transition-colors">
                  MARK ALL READ
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-1">
              {loadingNotifications ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <span className="material-symbols-outlined animate-spin text-[28px] text-primary">progress_activity</span>
                  <p className="text-xs text-white/40">Loading your alerts...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center text-white/40">
                    <span className="material-symbols-outlined text-[24px]">notifications_off</span>
                  </div>
                  <h4 className="text-sm font-bold text-white">No notifications yet</h4>
                  <p className="text-xs text-white/40 max-w-[200px] leading-relaxed">
                    Follow requests, likes and comments on your posts will appear here.
                  </p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className="flex gap-3 items-start text-sm border-b border-[#1a1a1a] pb-3 last:border-0">
                    {/* User Avatar */}
                    <Link href={`/user/${n.senderUsername}`} onClick={() => setShowNotifications(false)} className="flex-shrink-0">
                      <img src={n.senderAvatar || "/images/avatar_marcus_1779191788520.png"} alt="" className="w-10 h-10 rounded-full object-cover border border-[#262626]" />
                    </Link>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs leading-normal">
                        <Link href={`/user/${n.senderUsername}`} onClick={() => setShowNotifications(false)} className="font-bold hover:text-primary transition-colors mr-1">
                          @{n.senderUsername || n.senderName}
                        </Link>
                        {n.type === "follow_request" && "sent you a follow request."}
                        {n.type === "like_post" && "liked your post."}
                        {n.type === "like_reel" && "liked your reel."}
                        {n.type === "comment_post" && <span>commented: <span className="text-white/80">"{n.content}"</span></span>}
                      </p>
                      
                      {/* Timestamp */}
                      <span className="text-[10px] text-white/40 block mt-1">
                        {new Date(n.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>

                      {/* Action buttons for follow requests */}
                      {n.type === "follow_request" && (
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => handleAcceptRequest(n.id)} className="px-3 py-1.5 bg-primary hover:bg-primary/95 text-white font-bold text-[11px] rounded-lg shadow-sm active:scale-95 transition-all">
                            Confirm
                          </button>
                          <button onClick={() => handleRejectRequest(n.id)} className="px-3 py-1.5 bg-[#262626] hover:bg-[#363636] text-white font-bold text-[11px] rounded-lg active:scale-95 transition-all border border-white/5">
                            Delete
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Right post/reel thumbnail preview */}
                    {(n.type === "like_post" || n.type === "comment_post") && (
                      <div className="w-9 h-9 rounded-md bg-[#1a1a1a] flex-shrink-0 overflow-hidden border border-white/5 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[16px] text-white/30">favorite</span>
                      </div>
                    )}
                    {n.type === "like_reel" && (
                      <div className="w-9 h-9 rounded-md bg-[#1a1a1a] flex-shrink-0 overflow-hidden border border-white/5 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-[16px]">movie</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Mobile Bottom Drawer (slides up from bottom) */}
        <div className={`md:hidden fixed bottom-0 left-0 right-0 max-h-[80vh] bg-[#121212] border-t border-[#262626] rounded-t-[24px] z-50 transition-transform duration-300 ease-in-out flex flex-col ${
          showNotifications ? "translate-y-0" : "translate-y-full pointer-events-none"
        }`} style={{ paddingBottom: "72px" }}>
          {/* Notch handle */}
          <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto my-3 flex-shrink-0" onClick={() => setShowNotifications(false)} />
          
          <div className="flex justify-between items-center px-6 pb-4 border-b border-[#262626]">
            <h3 className="text-lg font-bold text-white">Notifications</h3>
            {notifications.length > 0 && (
              <button onClick={handleClearNotifications} className="text-xs font-bold text-primary">
                Mark all read
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-4 space-y-4">
            {loadingNotifications ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <span className="material-symbols-outlined animate-spin text-[28px] text-primary">progress_activity</span>
                <p className="text-xs text-white/40">Loading...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                <span className="material-symbols-outlined text-[32px] text-white/20">notifications_off</span>
                <h4 className="text-sm font-bold text-white">No notifications yet</h4>
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="flex gap-3 items-start text-sm border-b border-[#1a1a1a] pb-3 last:border-0">
                  <img src={n.senderAvatar || "/images/avatar_marcus_1779191788520.png"} alt="" className="w-9 h-9 rounded-full object-cover border border-[#262626]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs leading-normal">
                      <span className="font-bold mr-1">@{n.senderUsername || n.senderName}</span>
                      {n.type === "follow_request" && "sent you a follow request."}
                      {n.type === "like_post" && "liked your post."}
                      {n.type === "like_reel" && "liked your reel."}
                      {n.type === "comment_post" && <span>commented: <span className="text-white/80">"{n.content}"</span></span>}
                    </p>
                    <span className="text-[10px] text-white/40 block mt-0.5">
                      {new Date(n.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {n.type === "follow_request" && (
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => handleAcceptRequest(n.id)} className="px-3 py-1 bg-primary text-white font-bold text-[10px] rounded-lg">
                          Confirm
                        </button>
                        <button onClick={() => handleRejectRequest(n.id)} className="px-3 py-1 bg-[#262626] text-white font-bold text-[10px] rounded-lg border border-white/5">
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  {(n.type === "like_post" || n.type === "comment_post") && (
                    <div className="w-8 h-8 rounded bg-[#1a1a1a] flex-shrink-0 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[14px] text-white/30">favorite</span>
                    </div>
                  )}
                  {n.type === "like_reel" && (
                    <div className="w-8 h-8 rounded bg-[#1a1a1a] flex-shrink-0 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[14px]">movie</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <main className="flex-1 md:p-8">{children}</main>

        {/* ===== MOBILE BOTTOM NAV ===== */}
        <nav style={{ transform: hideNav ? "translateY(120%)" : "translateY(0)" }}
          className="md:hidden fixed bottom-4 left-5 right-5 rounded-full border border-white/20 bg-surface-container-lowest/70 backdrop-blur-xl shadow-xl flex justify-around items-center h-16 px-gutter z-50 transition-transform duration-300 ease-out">
          {mobileItems.map((item) => {
            const isActive = item.href !== "#" && pathname === item.href;
            if (item.action) {
              return (
                <button key={item.name} onClick={() => setIsCreateOpen(true)}
                  className="text-outline-variant hover:text-primary transition-all active:scale-90 duration-300 flex flex-col items-center relative">
                  <span className="material-symbols-outlined text-[28px]">{item.icon}</span>
                </button>
              );
            }
            return (
              <Link key={item.name} href={item.href}
                className={`transition-all duration-300 flex flex-col items-center relative ${isActive ? "text-primary scale-110" : "text-outline-variant hover:text-primary"}`}>
                {item.isProfile ? (
                  <div className={`w-[26px] h-[26px] rounded-full overflow-hidden border-2 ${isActive ? "border-primary" : "border-transparent"}`}>
                    <img src={userAvatar} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <span className="material-symbols-outlined text-[26px]" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>{item.icon}</span>
                )}
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#ff3040] text-white text-[9px] font-bold rounded-full flex items-center justify-center">{item.badge}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* ===== CREATE MODAL (Instagram-style) ===== */}
        {isCreateOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-[#262626] rounded-xl shadow-2xl overflow-hidden">
              {/* Hidden file input */}
              <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#363636]">
                {createStep === "details" ? (
                  <button onClick={() => { setCreateStep("upload"); setSelectedFile(null); setPreviewUrl(""); }}
                    className="text-white hover:text-white/70 transition-colors">
                    <span className="material-symbols-outlined text-[24px]">arrow_back</span>
                  </button>
                ) : <div className="w-6" />}
                <h3 className="text-white font-bold text-base">Create new post</h3>
                {createStep === "details" ? (
                  <button onClick={handleCreateSubmit as any} disabled={loading}
                    className="text-primary font-bold text-sm hover:text-primary/80 disabled:opacity-50">
                    {loading ? "..." : "Share"}
                  </button>
                ) : (
                  <button onClick={() => { resetCreateModal(); setIsCreateOpen(false); }}
                    className="text-white/70 hover:text-white">
                    <span className="material-symbols-outlined text-[22px]">close</span>
                  </button>
                )}
              </div>

              {/* STEP 1: Upload / Drag & Drop */}
              {createStep === "upload" && (
                <div ref={dropZoneRef} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
                  className={`flex flex-col items-center justify-center p-8 min-h-[400px] transition-all duration-200 ${
                    isDragging ? "bg-primary/10 border-2 border-dashed border-primary" : "bg-[#1a1a1a]"
                  }`}>
                  {/* Icons */}
                  <div className="flex items-center gap-1 mb-6">
                    <span className="material-symbols-outlined text-[48px] text-white/60 -rotate-12">photo_library</span>
                    <span className="material-symbols-outlined text-[44px] text-white/60 rotate-6">smart_display</span>
                  </div>
                  <p className="text-white text-xl font-light mb-4">
                    {isDragging ? "Drop your file here" : "Drag photos and videos here"}
                  </p>
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-sm rounded-lg active:scale-95 transition-all shadow-lg">
                    Select from computer
                  </button>

                  {/* Divider */}
                  <div className="flex items-center gap-3 w-full max-w-xs mt-8 mb-4">
                    <div className="flex-1 h-px bg-[#363636]" />
                    <span className="text-xs text-white/40 font-semibold">OR PASTE URL</span>
                    <div className="flex-1 h-px bg-[#363636]" />
                  </div>

                  {/* URL Input fallback */}
                  <div className="w-full max-w-xs space-y-2">
                    <input type="text" value={createType === "reel" ? videoUrl : imageUrl}
                      onChange={(e) => { if (createType === "reel") { setVideoUrl(e.target.value); } else { setImageUrl(e.target.value); } }}
                      placeholder="Paste image or video URL..."
                      className="w-full bg-[#363636] border border-[#464646] rounded-lg py-2.5 px-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-primary" />
                    {(imageUrl || videoUrl) && (
                      <button type="button" onClick={() => setCreateStep("details")}
                        className="w-full py-2 bg-primary/20 text-primary rounded-lg text-xs font-bold hover:bg-primary/30 transition-colors">
                        Continue with URL →
                      </button>
                    )}
                  </div>

                  {/* Type selector */}
                  <div className="flex gap-2 mt-6">
                    {(["post", "story", "reel"] as const).map((t) => (
                      <button key={t} type="button" onClick={() => setCreateType(t)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                          createType === t ? "bg-primary text-white" : "bg-[#363636] text-white/60 hover:text-white"
                        }`}>
                        {t.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 2: Preview + Details */}
              {createStep === "details" && (
                <div className="flex flex-col md:flex-row">
                  {/* Preview */}
                  <div className="w-full md:w-1/2 bg-black flex items-center justify-center min-h-[300px] max-h-[400px] overflow-hidden">
                    {previewUrl ? (
                      selectedFile?.type.startsWith("video/") ? (
                        <video src={previewUrl} controls className="w-full h-full object-contain" />
                      ) : (
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                      )
                    ) : (imageUrl || videoUrl) ? (
                      <img src={imageUrl || videoUrl} alt="URL Preview" className="w-full h-full object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <div className="text-white/30 text-center">
                        <span className="material-symbols-outlined text-[48px]">image</span>
                        <p className="text-sm mt-2">No preview</p>
                      </div>
                    )}
                  </div>

                  {/* Details form */}
                  <div className="w-full md:w-1/2 p-4 space-y-4 bg-[#262626]">
                    {/* User info */}
                    {user && (
                      <div className="flex items-center gap-2 pb-3 border-b border-[#363636]">
                        <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                        <span className="text-white font-bold text-sm">{user.username || user.fullName}</span>
                      </div>
                    )}

                    {/* Type selector */}
                    <div className="flex gap-2">
                      {(["post", "story", "reel"] as const).map((t) => (
                        <button key={t} type="button" onClick={() => setCreateType(t)}
                          className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                            createType === t ? "bg-primary text-white" : "bg-[#363636] text-white/60 hover:text-white"
                          }`}>
                          {t.toUpperCase()}
                        </button>
                      ))}
                    </div>

                    {/* Caption */}
                    {createType !== "story" && (
                      <textarea value={caption} onChange={(e) => setCaption(e.target.value)}
                        placeholder="Write a caption..." rows={4}
                        className="w-full bg-transparent border-none text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-0 resize-none" />
                    )}

                    {/* Tone (post only) */}
                    {createType === "post" && (
                      <div className="space-y-1">
                        <label className="text-[11px] text-white/50 font-bold uppercase tracking-wider">Tone</label>
                        <select value={tone} onChange={(e) => setTone(e.target.value)}
                          className="w-full bg-[#363636] border border-[#464646] rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary">
                          <option value="Cyberpunk">Cyberpunk</option><option value="Minimalist">Minimalist</option>
                          <option value="Hype Aesthetic">Hype Aesthetic</option><option value="Bio Digital">Bio Digital</option>
                        </select>
                      </div>
                    )}

                    {/* Upload progress */}
                    {uploadProgress && (
                      <div className="flex items-center gap-2 py-2">
                        <span className="material-symbols-outlined animate-spin text-primary text-[18px]">progress_activity</span>
                        <span className="text-xs text-white/60 font-semibold">{uploadProgress}</span>
                      </div>
                    )}

                    {/* File info */}
                    {selectedFile && (
                      <div className="flex items-center gap-2 text-xs text-white/40 border-t border-[#363636] pt-3">
                        <span className="material-symbols-outlined text-[16px]">attach_file</span>
                        <span className="truncate">{selectedFile.name}</span>
                        <span>({(selectedFile.size / 1024 / 1024).toFixed(1)}MB)</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
