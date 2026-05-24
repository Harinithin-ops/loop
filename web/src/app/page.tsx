"use client";

import React, { useState, useEffect, useRef } from "react";
import { dbService, RealPost, RealStory, RealUser } from "@/app/utils/dbService";
import Link from "next/link";
import PostDetailModal from "@/components/PostDetailModal";
import { withTimeout, logInfo, logError } from "@/app/utils/mobileOptimization";

interface Reaction {
  emoji: string;
  label: string;
  count: number;
  active: boolean;
}

export default function HomeFeed() {
  const [currentUser, setCurrentUser] = useState<RealUser | null>(null);
  const [posts, setPosts] = useState<RealPost[]>([]);
  const [stories, setStories] = useState<RealStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Active Story viewer modal
  const [activeStory, setActiveStory] = useState<RealStory | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);

  // Post edit states
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [activePost, setActivePost] = useState<RealPost | null>(null);
  // Which post's "..." action sheet is open
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);

  // Post reactions state map
  const [postReactions, setPostReactions] = useState<Record<string, Reaction[]>>({});

  // AI assistant chat states
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [aiCommandText, setAiCommandText] = useState("");
  const [aiMessages, setAiMessages] = useState<Array<{ sender: string; text: string }>>([
    { sender: "assistant", text: "Hey! I'm Loop Assistant. Ask me to generate captions, optimize hashtags, or analyze feed vibes!" },
  ]);

  // Safety timeout ref — prevents infinite loading spinner
  const loadingTimeoutRef = useRef<any>(null);

  const loadData = async (isInitial = false) => {
    if (isInitial || (posts.length === 0 && stories.length === 0)) {
      setLoading(true);
      setLoadError(false);
    }

    // Safety timeout: force stop loading after 12 seconds no matter what
    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    loadingTimeoutRef.current = setTimeout(() => {
      setLoading(false);
      logError("Feed loading safety timeout triggered (12s)");
    }, 12000);

    try {
      // Wrap each call with individual timeouts to prevent one slow API from blocking everything
      const [user, fetchedPosts, fetchedStories] = await Promise.all([
        withTimeout(dbService.getActiveUser(), 8000, null, "getActiveUser"),
        withTimeout(dbService.getPosts(), 10000, [] as RealPost[], "getPosts"),
        withTimeout(dbService.getStories(), 10000, [] as RealStory[], "getStories"),
      ]);

      setCurrentUser(user);
      setPosts(fetchedPosts);
      setStories(fetchedStories);

      // Initialize reactions for each post
      const reactionsMap: Record<string, Reaction[]> = {};
      fetchedPosts.forEach((post) => {
        reactionsMap[post.id] = [
          { emoji: "❤️", label: "Love", count: Math.floor(Math.random() * 200) + 15, active: false },
          { emoji: "🔥", label: "Inspiring", count: Math.floor(Math.random() * 100) + 8, active: false },
          { emoji: "💡", label: "Smart", count: Math.floor(Math.random() * 50) + 2, active: false },
          { emoji: "🚀", label: "Motivating", count: Math.floor(Math.random() * 30) + 1, active: false },
        ];
      });
      setPostReactions((prev) => ({ ...reactionsMap, ...prev }));

      if (isInitial) logInfo("Feed data loaded successfully");
    } catch (err) {
      logError("Error loading feed data:", err);
      setLoadError(true);
    } finally {
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);

    // Listen to publish events from Navbar/Create dialog
    const handleRefresh = () => loadData(false);
    window.addEventListener("loop_feed_refresh", handleRefresh);

    // Listen to app resume events — silently refresh data when app comes back to foreground
    const handleResume = () => {
      logInfo("Home feed: app resumed, refreshing data silently");
      loadData(false);
    };
    window.addEventListener("loop_app_resume", handleResume);

    // Listen to online sync events — retry loading when connection returns
    const handleOnlineSync = () => {
      logInfo("Home feed: online sync, reloading data");
      loadData(false);
    };
    window.addEventListener("loop_online_sync", handleOnlineSync);

    return () => {
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
      window.removeEventListener("loop_feed_refresh", handleRefresh);
      window.removeEventListener("loop_app_resume", handleResume);
      window.removeEventListener("loop_online_sync", handleOnlineSync);
    };
  }, []);

  // Stories progress timer
  useEffect(() => {
    if (!activeStory) return;
    setStoryProgress(0);
    const interval = setInterval(() => {
      setStoryProgress((prev) => {
        if (prev >= 100) {
          setActiveStory(null);
          return 0;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [activeStory]);

  const handleReact = (postId: string, reactionLabel: string) => {
    const postReacs = postReactions[postId] || [];
    const updated = postReacs.map((r) => {
      if (r.label === reactionLabel) {
        return {
          ...r,
          active: !r.active,
          count: r.active ? r.count - 1 : r.count + 1,
        };
      }
      return r;
    });
    setPostReactions({
      ...postReactions,
      [postId]: updated,
    });
  };

  const handleApplyCaption = (postId: string, suggestion: string) => {
    setPosts(
      posts.map((post) => {
        if (post.id === postId) {
          return { ...post, caption: suggestion };
        }
        return post;
      })
    );
  };

  const handleEditSubmit = async (postId: string) => {
    if (!editCaption.trim()) return;
    await dbService.updatePost(postId, editCaption);
    setPosts(
      posts.map((p) => (p.id === postId ? { ...p, caption: editCaption } : p))
    );
    setEditingPostId(null);
    alert("Post updated successfully!");
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    const success = await dbService.deletePost(postId);
    if (success) {
      // Use functional update to avoid stale-closure: always filter from the latest state
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      alert("Post deleted successfully!");
    } else {
      alert("Failed to delete post. Please run the Supabase RLS SQL fix script and try again.");
    }
  };

  const sendAiCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiCommandText.trim()) return;

    const userMsg = aiCommandText;
    setAiMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setAiCommandText("");

    setTimeout(() => {
      let reply = "I analyzed your request! ";
      if (userMsg.toLowerCase().includes("caption")) {
        reply += "Here is a sleek, premium caption suggestion: 'Deep in the neon streams, searching for natural connection. #RetroFuture #LoopSocial'";
      } else if (userMsg.toLowerCase().includes("tag") || userMsg.toLowerCase().includes("hashtag")) {
        reply += "Optimized Tags for you: #CyberAesthetic, #CreativeEvolution, #AIStudio, #NextGenCreators";
      } else {
        reply += "Loop's multi-modal engine recommendation: Create a visual carousel showcasing raw AI renders alongside a short text diary on the generative process. Engagement could lift by 18%!";
      }
      setAiMessages((prev) => [...prev, { sender: "assistant", text: reply }]);
    }, 1000);
  };

  return (
    <div className="pt-20 pb-32 md:py-0 space-y-8 max-w-2xl mx-auto">
      {/* Pulse Stories Row */}
      <section className="overflow-hidden bg-black/30 backdrop-blur-md p-4 rounded-2xl border border-primary/10 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
          {/* Add Pulse Story Action */}
          <div 
            onClick={() => window.dispatchEvent(new Event("loop_open_create_story"))}
            className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer group"
          >
            <div className="w-[72px] h-[72px] rounded-full p-[2px] bg-black border border-primary/30 shadow-[0_0_10px_rgba(107,255,87,0.1)] hover:border-primary hover:shadow-[0_0_15px_rgba(107,255,87,0.3)] transition-all duration-300 flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[24px]">add</span>
              </div>
            </div>
            <span className="font-sans text-[10px] text-primary/80 font-bold uppercase tracking-wider">Live Pulse</span>
          </div>

          {/* Active pulse stories rendering */}
          {stories.map((story) => (
            <div
              key={story.id}
              onClick={() => setActiveStory(story)}
              className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer group"
            >
              <div className="story-gradient w-[72px] h-[72px] rounded-full flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                <div className="w-full h-full rounded-full border-2 border-background overflow-hidden">
                  <img
                    className="w-full h-full object-cover"
                    src={story.userAvatar}
                    alt={story.userName}
                  />
                </div>
              </div>
              <span className="font-sans text-[10px] text-on-surface-variant group-hover:text-primary transition-colors truncate w-14 text-center tracking-tight">
                {story.userName}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Main Stream Feed Section */}
      <section className="space-y-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <span className="material-symbols-outlined animate-spin text-[36px] text-primary">progress_activity</span>
            <p className="text-sm font-semibold text-outline-variant font-label-caps tracking-wider">LOADING LOOP STREAM...</p>
          </div>
        ) : loadError && posts.length === 0 ? (
          <div className="glass-panel p-8 rounded-lg border border-white/40 shadow-md text-center space-y-4">
            <span className="material-symbols-outlined text-[48px] text-red-400">cloud_off</span>
            <h3 className="text-xl font-bold text-on-surface">Failed to Load Feed</h3>
            <p className="text-sm text-on-surface-variant max-w-sm mx-auto">
              Something went wrong loading your feed. Please check your connection and try again.
            </p>
            <button
              onClick={() => loadData(true)}
              className="mt-2 px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 active:scale-95 transition-all"
            >
              Retry
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="glass-panel p-8 rounded-lg border border-white/40 shadow-md text-center space-y-4">
            <span className="material-symbols-outlined text-[48px] text-primary">feed</span>
            <h3 className="text-xl font-bold text-on-surface">No Feed Posts Yet</h3>
            <p className="text-sm text-on-surface-variant max-w-sm mx-auto">
              Connect and write down a fresh experience! Click the <span className="font-bold text-primary">"CREATE"</span> button to upload a post, story, or reel.
            </p>
          </div>
        ) : (
          posts.map((post) => {
            const isOwner = currentUser?.id === post.authorId;
            const isEditing = editingPostId === post.id;
            const reacs = postReactions[post.id] || [];
            const loveReaction = reacs.find((r) => r.label === "Love") || {
              active: false,
              count: 0,
            };

            return (
              <div
                key={post.id}
                className="glass-panel neumorphic-card rounded-2xl border border-primary/10 text-on-surface overflow-hidden flex flex-col relative transition-all duration-300"
              >
                {/* Header */}
                <div className="flex justify-between items-center p-4">
                  <div className="flex items-center gap-3">
                    <Link href={post.authorUsername || post.authorId ? `/user/${post.authorUsername || post.authorId}` : "#"} className="relative">
                      <div className="w-10 h-10 rounded-full p-[1.5px] bg-primary/20 hover:bg-primary transition-all duration-300">
                        <img
                          className="w-full h-full rounded-full object-cover border border-background"
                          src={post.authorAvatar}
                          alt={post.authorName}
                        />
                      </div>
                    </Link>
                    <div className="text-left">
                      <div className="flex items-center gap-1.5 font-sans">
                        <Link
                          href={post.authorUsername || post.authorId ? `/user/${post.authorUsername || post.authorId}` : "#"}
                          className="font-bold text-[14px] hover:text-primary transition-colors leading-none"
                        >
                          {post.authorUsername || "user"}
                        </Link>
                        <span
                          className="material-symbols-outlined text-primary text-[14px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          verified
                        </span>
                        <span className="text-[11px] text-on-surface-variant font-medium">
                          • {post.createdAt}
                        </span>
                      </div>
                      {post.authorBio && (
                        <span className="text-[10px] text-on-surface-variant block mt-0.5 text-left truncate max-w-[160px]">
                          {post.authorBio}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {post.tone && (
                      <span className="text-[9px] bg-primary/10 text-primary border border-primary/25 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider font-label-caps">
                        {post.tone}
                      </span>
                    )}
                    {/* Unified "..." menu button for ALL posts */}
                    <button
                      onClick={() => setOpenMenuPostId(openMenuPostId === post.id ? null : post.id)}
                      className="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
                      title="More options"
                    >
                      <span className="material-symbols-outlined text-[22px]">more_horiz</span>
                    </button>
                  </div>
                </div>

                {/* ── ACTION SHEET (Instagram-style) ── */}
                {openMenuPostId === post.id && (
                  <>
                    {/* Backdrop to dismiss */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setOpenMenuPostId(null)}
                    />
                    <div className="relative z-50">
                      <div className="mx-3 mb-1 bg-[#1c1c1e] dark:bg-[#2c2c2e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-top-1 fade-in duration-150">

                        {/* OWNER-ONLY: Delete */}
                        {isOwner && (
                          <>
                            <button
                              onClick={() => { setOpenMenuPostId(null); handleDeletePost(post.id); }}
                              className="w-full px-4 py-3.5 text-center text-[15px] font-semibold text-red-500 hover:bg-white/5 active:bg-white/10 transition-colors border-b border-white/10"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => { setOpenMenuPostId(null); setEditingPostId(post.id); setEditCaption(post.caption); }}
                              className="w-full px-4 py-3.5 text-center text-[15px] font-medium text-on-surface hover:bg-white/5 active:bg-white/10 transition-colors border-b border-white/10"
                            >
                              Edit
                            </button>
                          </>
                        )}

                        {/* ALL USERS */}
                        <button
                          onClick={() => { setOpenMenuPostId(null); alert("Like count visibility toggled."); }}
                          className="w-full px-4 py-3.5 text-center text-[15px] font-medium text-on-surface hover:bg-white/5 active:bg-white/10 transition-colors border-b border-white/10"
                        >
                          Unhide like count to others
                        </button>
                        <button
                          onClick={() => { setOpenMenuPostId(null); alert("Commenting setting toggled."); }}
                          className="w-full px-4 py-3.5 text-center text-[15px] font-medium text-on-surface hover:bg-white/5 active:bg-white/10 transition-colors border-b border-white/10"
                        >
                          Turn on commenting
                        </button>
                        <button
                          onClick={() => { setOpenMenuPostId(null); setActivePost(post); }}
                          className="w-full px-4 py-3.5 text-center text-[15px] font-medium text-on-surface hover:bg-white/5 active:bg-white/10 transition-colors border-b border-white/10"
                        >
                          Go to post
                        </button>
                        <button
                          onClick={() => { setOpenMenuPostId(null); window.location.href = post.authorUsername || post.authorId ? `/user/${post.authorUsername || post.authorId}` : "#"; }}
                          className="w-full px-4 py-3.5 text-center text-[15px] font-medium text-on-surface hover:bg-white/5 active:bg-white/10 transition-colors border-b border-white/10"
                        >
                          About this account
                        </button>

                        {/* Cancel */}
                        <button
                          onClick={() => setOpenMenuPostId(null)}
                          className="w-full px-4 py-3.5 text-center text-[15px] font-semibold text-on-surface hover:bg-white/5 active:bg-white/10 transition-colors"
                        >
                          Cancel
                        </button>

                      </div>
                    </div>
                  </>
                )}

                {/* Description content or Edit Box */}
                {isEditing ? (
                  <div className="px-4 pb-3 space-y-2 bg-surface-container-low/50 border-t border-black/5 pt-3">
                    <textarea
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value)}
                      className="w-full bg-white border border-black/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary font-sans"
                      rows={2}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingPostId(null)}
                        className="px-3 py-1 rounded bg-surface border text-xs font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleEditSubmit(post.id)}
                        className="px-3 py-1 bg-primary text-white rounded text-xs font-bold shadow-md hover:bg-primary/95"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Visual Attachment */}
                <div
                  onClick={() => setActivePost(post)}
                  className="w-full overflow-hidden relative cursor-pointer group bg-black select-none aspect-square md:aspect-[4/5] flex items-center justify-center border-y border-primary/5"
                >
                  <img
                    className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-700"
                    src={post.imageUrl}
                    alt="Post Media"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </div>

                {/* Actions & Reactions Row */}
                <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Like Heart */}
                    <button
                      onClick={() => handleReact(post.id, "Love")}
                      className="hover:scale-110 active:scale-95 transition-transform"
                    >
                      <span
                        className={`material-symbols-outlined text-[26px] ${
                          loveReaction?.active ? "text-red-500 fill-current" : "text-on-surface"
                        }`}
                        style={loveReaction?.active ? { fontVariationSettings: "'FILL' 1" } : {}}
                      >
                        favorite
                      </span>
                    </button>

                    {/* Comment Bubble */}
                    <button
                      onClick={() => setActivePost(post)}
                      className="hover:scale-110 active:scale-95 transition-transform"
                    >
                      <span className="material-symbols-outlined text-[26px] text-on-surface">
                        chat_bubble
                      </span>
                    </button>

                    {/* Share */}
                    <button className="hover:scale-110 active:scale-95 transition-transform">
                      <span className="material-symbols-outlined text-[26px] text-on-surface">
                        send
                      </span>
                    </button>
                  </div>

                  {/* Bookmark */}
                  <button className="hover:scale-110 active:scale-95 transition-transform">
                    <span className="material-symbols-outlined text-[26px] text-on-surface">
                      bookmark
                    </span>
                  </button>
                </div>

                {/* Likes info */}
                <div className="px-4 pb-1 text-left">
                  <p className="font-bold text-sm">
                    Liked by <span className="hover:underline cursor-pointer">vv_krisha_sri</span> and{" "}
                    <span className="hover:underline cursor-pointer">
                      {(loveReaction?.count || 0).toLocaleString()} others
                    </span>
                  </p>
                </div>

                {/* Caption / Text Details */}
                <div className="px-4 pb-4 space-y-2 text-left">
                  {!isEditing && (
                    <p className="text-sm text-on-surface leading-relaxed">
                      <span className="font-bold mr-2 hover:underline cursor-pointer">
                        {post.authorUsername}
                      </span>
                      {post.caption}
                    </p>
                  )}

                  {/* AI Visual Tags */}
                  {post.aiTags && post.aiTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {post.aiTags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs text-primary font-medium hover:underline cursor-pointer"
                        >
                          #{tag.replace(/\s+/g, "")}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* AI Suggestions Toggle Button */}
                  <div className="pt-2">
                    <details className="group">
                      <summary className="list-none flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-widest cursor-pointer hover:underline font-label-caps select-none">
                        <span className="material-symbols-outlined text-[14px]">magic_button</span>
                        AI Caption Studio
                        <span className="material-symbols-outlined text-[14px] transition-transform group-open:rotate-180">
                          expand_more
                        </span>
                      </summary>
                      <div className="mt-2.5 p-3 rounded-xl bg-black/60 border border-primary/15 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200 shadow-inner">
                        <p className="text-[10px] text-white/50">
                          Tap an AI suggestion to apply it to your post caption:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            "Optimize visual depth.",
                            "Grounded in aesthetics.",
                            "A perfect stream flow.",
                          ].map((suggestion, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleApplyCaption(post.id, suggestion)}
                              className="px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 hover:border-primary active:scale-95 transition-all text-[11px] font-semibold tracking-wide font-sans shadow-[0_0_10px_rgba(107,255,87,0.05)]"
                            >
                              &ldquo;{suggestion}&rdquo;
                            </button>
                          ))}
                        </div>
                      </div>
                    </details>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Floating AI Command Trigger */}
      <button
        onClick={() => setAiAssistantOpen(!aiAssistantOpen)}
        aria-label="Open AI assistant"
        className="fixed bottom-24 right-6 md:bottom-8 md:right-8 w-14 h-14 bg-primary text-black rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(107,255,87,0.4)] z-50 hover:scale-105 active:scale-95 transition-transform overflow-hidden ai-shimmer"
      >
        <span className="material-symbols-outlined text-[28px] font-bold">auto_awesome</span>
      </button>

      {/* AI Assistant Chat Drawer */}
      {aiAssistantOpen && (
        <div className="fixed bottom-[96px] right-4 left-4 md:left-auto md:bottom-28 md:right-8 w-auto md:w-80 h-96 glass-panel border border-primary/20 shadow-[0_15px_40px_rgba(0,0,0,0.8),_0_0_25px_rgba(107,255,87,0.08)] rounded-2xl p-4 z-50 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center pb-2.5 border-b border-primary/10">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px] animate-pulse">smart_toy</span>
              <span className="font-bold text-[13px] tracking-wider text-primary uppercase font-sans">Loop AI Partner</span>
            </div>
            <button onClick={() => setAiAssistantOpen(false)} className="material-symbols-outlined text-white/50 hover:text-primary text-[18px] transition-colors">
              close
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-3 no-scrollbar pr-0.5">
            {aiMessages.map((msg, index) => (
              <div
                key={index}
                className={`max-w-[85%] rounded-2xl p-3 text-[12px] leading-relaxed shadow-sm ${
                  msg.sender === "user"
                    ? "bg-primary text-black font-semibold self-end ml-auto"
                    : "bg-black/40 border border-primary/10 text-white/90 self-start"
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>

          <form onSubmit={sendAiCommand} className="flex gap-2 pt-2 border-t border-primary/10 mt-auto">
            <input
              type="text"
              value={aiCommandText}
              onChange={(e) => setAiCommandText(e.target.value)}
              placeholder="Ask Loop AI..."
              className="flex-1 text-[12.5px] bg-black/60 border border-primary/20 rounded-full px-4 py-2.5 text-white placeholder:text-white/30 outline-none focus:ring-1 focus:ring-primary focus:border-transparent font-sans shadow-inner"
            />
            <button
              type="submit"
              className="bg-primary text-black w-9 h-9 rounded-full flex items-center justify-center hover:bg-primary-container active:scale-95 transition-all flex-shrink-0 shadow-lg"
            >
              <span className="material-symbols-outlined text-[16px] font-bold">send</span>
            </button>
          </form>
        </div>
      )}

      {/* Glassmorphic Instagram-style Story Viewer Modal */}
      {activeStory && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[200] animate-in fade-in duration-200">
          <div className="w-full max-w-lg h-[90vh] flex flex-col items-center justify-center p-4 relative">
            
            {/* Top Close Button */}
            <button
              onClick={() => setActiveStory(null)}
              className="absolute top-4 right-4 text-white hover:text-primary transition-colors z-35"
            >
              <span className="material-symbols-outlined text-[36px]">close</span>
            </button>

            {/* Story Card Container */}
            <div className="w-full max-w-md bg-[#050505] rounded-3xl border border-primary/25 shadow-[0_0_30px_rgba(107,255,87,0.15)] relative overflow-hidden flex flex-col h-full">
              
              {/* Progress Bars */}
              <div className="absolute top-4 left-4 right-4 flex gap-1 z-30">
                <div className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary shadow-[0_0_8px_rgba(107,255,87,0.8)] transition-all duration-100"
                    style={{ width: `${storyProgress}%` }}
                  />
                </div>
              </div>

              {/* Creator Metadata Header */}
              <div className="absolute top-8 left-4 right-4 flex items-center gap-3 z-30">
                <img
                  className="w-10 h-10 rounded-full border border-white object-cover"
                  src={activeStory.userAvatar}
                  alt={activeStory.userName}
                />
                <span className="text-white font-bold text-sm tracking-wide drop-shadow-md">
                  {activeStory.userName}
                </span>
                
                {currentUser?.id === activeStory.userId && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (confirm("Are you sure you want to delete this story?")) {
                        const success = await dbService.deleteStory(activeStory.id);
                        if (success) {
                          setStories((prev) => prev.filter((s) => s.id !== activeStory.id));
                          setActiveStory(null);
                          alert("Story deleted successfully!");
                        } else {
                          alert("Failed to delete story. Please try again.");
                        }
                      }
                    }}
                    className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-red-500 hover:text-red-400 transition-colors ml-auto z-40"
                    title="Delete Story"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                )}

                <span className={`text-white/60 text-xs drop-shadow-md ${currentUser?.id === activeStory.userId ? "" : "ml-auto"}`}>
                  Story view
                </span>
              </div>

              {/* Story visual media */}
              <div className="w-full h-full flex items-center justify-center relative">
                <img
                  className="w-full h-full object-contain"
                  src={activeStory.mediaUrl}
                  alt="Story Visual content"
                />
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
              // Use functional update to avoid stale-closure: always filter from the latest state
              setPosts((prev) => prev.filter((p) => p.id !== postId));
              setActivePost(null);
              alert("Post deleted successfully!");
            } else {
              alert("Failed to delete post. Please run the Supabase RLS SQL fix script and try again.");
            }
          }}
        />
      )}
    </div>
  );
}
