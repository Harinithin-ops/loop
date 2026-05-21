"use client";

import React, { useState, useEffect, useRef } from "react";
import { RealPost, RealUser } from "@/app/utils/dbService";
import Link from "next/link";

interface Comment {
  id: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  text: string;
  createdAt: string;
}

interface PostDetailModalProps {
  post: RealPost;
  currentUser: RealUser | null;
  onClose: () => void;
  onDeletePost?: (postId: string) => void;
}

export default function PostDetailModal({
  post,
  currentUser,
  onClose,
  onDeletePost,
}: PostDetailModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [lastLiker, setLastLiker] = useState<string>("");
  const commentsEndRef = useRef<HTMLDivElement | null>(null);

  // Load REAL comments and likes from localStorage (keyed strictly to post.id)
  useEffect(() => {
    // ── Comments: start empty, no fake built-in comments ──
    const rawComments = localStorage.getItem(`loop_real_comments_${post.id}`);
    if (rawComments) {
      try { setComments(JSON.parse(rawComments)); } catch { setComments([]); }
    } else {
      setComments([]); // always start empty — no fake comments
    }

    // ── Likes ──
    const likedKey = `loop_post_liked_${post.id}`;
    const wasLiked = localStorage.getItem(likedKey) === "true";
    setIsLiked(wasLiked);

    const storedCount = parseInt(localStorage.getItem(`loop_post_likes_count_${post.id}`) || "0", 10);
    setLikesCount(storedCount > 0 ? storedCount : 0);

    const storedLastLiker = localStorage.getItem(`loop_post_last_liker_${post.id}`) || "";
    setLastLiker(storedLastLiker);
  }, [post.id]);

  // Scroll to bottom when comments update
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  const handleLikeToggle = () => {
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    localStorage.setItem(`loop_post_liked_${post.id}`, nextLiked ? "true" : "false");

    const newCount = nextLiked ? likesCount + 1 : Math.max(0, likesCount - 1);
    setLikesCount(newCount);
    localStorage.setItem(`loop_post_likes_count_${post.id}`, newCount.toString());

    // Record the last person who liked (the current user)
    if (nextLiked && currentUser) {
      const myName = currentUser.username || currentUser.fullName;
      setLastLiker(myName);
      localStorage.setItem(`loop_post_last_liker_${post.id}`, myName);
    } else if (!nextLiked) {
      // If unliked, show next liker or clear
      const stored = localStorage.getItem(`loop_post_last_liker_${post.id}`) || "";
      if (stored === (currentUser?.username || currentUser?.fullName)) {
        setLastLiker("");
        localStorage.removeItem(`loop_post_last_liker_${post.id}`);
      }
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const newComment: Comment = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      authorName: currentUser?.fullName || "Guest User",
      authorUsername: currentUser?.username || "guest",
      authorAvatar: currentUser?.avatar || "/images/avatar_marcus_1779191788520.png",
      text: newCommentText.trim(),
      createdAt: "Just now",
    };

    const updated = [...comments, newComment];
    setComments(updated);
    // Persist under a "real" key so we never mix with the old fake-comment key
    localStorage.setItem(`loop_real_comments_${post.id}`, JSON.stringify(updated));
    setNewCommentText("");
  };

  const isOwner = currentUser?.id === post.authorId;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-2 md:p-6 z-[150] animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors z-50 p-2"
        aria-label="Close modal"
      >
        <span className="material-symbols-outlined text-[32px]">close</span>
      </button>

      {/* Main container */}
      <div className="w-full max-w-5xl bg-[#121212] border border-[#262626] rounded-xl overflow-hidden flex flex-col md:flex-row max-h-[92vh] relative z-10">

        {/* ── LEFT: Post Image ── */}
        <div className="flex-shrink-0 md:flex-1 bg-black flex items-center justify-center overflow-hidden"
          style={{ minHeight: "260px", maxHeight: "60vh" }}>
          <img
            src={post.imageUrl}
            alt="Post content"
            className="w-full h-full object-contain"
            style={{ display: "block" }}
          />
        </div>

        {/* ── RIGHT: Sidebar ── */}
        <div className="w-full md:w-[400px] flex-shrink-0 border-t md:border-t-0 md:border-l border-[#262626] flex flex-col bg-[#121212] text-white overflow-hidden">

          {/* Header: author info + options */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#262626] flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <Link href={post.authorUsername ? `/user/${post.authorUsername}` : "#"}>
                <img
                  src={post.authorAvatar}
                  alt={post.authorName}
                  className="w-9 h-9 rounded-full object-cover border border-[#262626] flex-shrink-0"
                />
              </Link>
              <div className="min-w-0">
                <Link
                  href={post.authorUsername ? `/user/${post.authorUsername}` : "#"}
                  className="font-bold text-sm hover:underline hover:text-primary transition-colors block truncate"
                >
                  {post.authorUsername || post.authorName}
                </Link>
                {/* Real bio instead of hardcoded "Royal Enfield" */}
                {post.authorBio && (
                  <span className="text-[11px] text-gray-400 block truncate max-w-[200px]">
                    {post.authorBio}
                  </span>
                )}
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {post.tone && (
                <span className="text-[10px] bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  {post.tone}
                </span>
              )}
              {isOwner && onDeletePost ? (
                <button
                  onClick={() => {
                    if (confirm("Delete this post?")) {
                      onDeletePost(post.id);
                      onClose();
                    }
                  }}
                  className="text-red-500 hover:text-red-400 transition-colors p-1"
                  title="Delete Post"
                >
                  <span className="material-symbols-outlined text-lg">delete</span>
                </button>
              ) : (
                <span className="material-symbols-outlined text-gray-400 cursor-pointer hover:text-white">
                  more_horiz
                </span>
              )}
            </div>
          </div>

          {/* Comments list (scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 select-text">

            {/* Caption as first comment */}
            <div className="flex gap-3 text-left">
              <img
                src={post.authorAvatar}
                alt=""
                className="w-8 h-8 rounded-full object-cover border border-[#262626] flex-shrink-0"
              />
              <div>
                <p className="text-sm">
                  <Link
                    href={post.authorUsername ? `/user/${post.authorUsername}` : "#"}
                    className="font-bold mr-2 hover:underline cursor-pointer"
                  >
                    {post.authorUsername}
                  </Link>
                  <span className="text-gray-200 leading-snug whitespace-pre-wrap">
                    {post.caption}
                  </span>
                </p>
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
                  <span>{post.createdAt}</span>
                  {post.aiTags && post.aiTags.length > 0 && (
                    <span className="text-primary font-medium">
                      {post.aiTags.map((t) => `#${t.replace(/\s+/g, "")}`).join(" ")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Real user comments — no fake ones */}
            {comments.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4 select-none">
                No comments yet. Be the first!
              </p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 text-left">
                  <img
                    src={comment.authorAvatar}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover border border-[#262626] flex-shrink-0"
                  />
                  <div>
                    <p className="text-sm">
                      <span className="font-bold mr-2 hover:underline cursor-pointer">
                        {comment.authorUsername}
                      </span>
                      <span className="text-gray-200 leading-snug">{comment.text}</span>
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{comment.createdAt}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={commentsEndRef} />
          </div>

          {/* Footer: actions + like info */}
          <div className="px-4 pt-3 pb-2 border-t border-[#262626] space-y-2 bg-[#121212] flex-shrink-0">

            {/* Action row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Like */}
                <button
                  onClick={handleLikeToggle}
                  className="hover:scale-110 active:scale-95 transition-transform"
                >
                  <span
                    className={`material-symbols-outlined text-[26px] transition-colors ${
                      isLiked ? "text-red-500" : "text-white"
                    }`}
                    style={isLiked ? { fontVariationSettings: "'FILL' 1" } : {}}
                  >
                    favorite
                  </span>
                </button>
                {/* Comment */}
                <button
                  className="hover:scale-110 transition-transform"
                  onClick={() => { const inp = document.getElementById(`cmt-input-${post.id}`); inp?.focus(); }}
                >
                  <span className="material-symbols-outlined text-[26px] text-white">chat_bubble</span>
                </button>
                {/* Share */}
                <button className="hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[26px] text-white">send</span>
                </button>
              </div>
              {/* Bookmark */}
              <button className="hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[26px] text-white">bookmark</span>
              </button>
            </div>

            {/* Like counter — real, with last liker name */}
            {likesCount > 0 ? (
              <p className="font-bold text-sm text-white text-left">
                {lastLiker ? (
                  <>
                    Liked by{" "}
                    <span className="hover:underline cursor-pointer">{lastLiker}</span>
                    {likesCount > 1 && (
                      <> and <span className="hover:underline cursor-pointer">{likesCount - 1} others</span></>
                    )}
                  </>
                ) : (
                  <>{likesCount.toLocaleString()} {likesCount === 1 ? "like" : "likes"}</>
                )}
              </p>
            ) : (
              <p className="text-sm text-gray-500 text-left">Be the first to like this</p>
            )}

            <span className="text-[10px] text-gray-400 uppercase tracking-wider block">
              {post.createdAt}
            </span>
          </div>

          {/* Add Comment form */}
          <form
            onSubmit={handleAddComment}
            className="flex items-center gap-2 px-3 py-2.5 border-t border-[#262626] bg-[#121212] flex-shrink-0"
          >
            <span className="material-symbols-outlined text-gray-400 cursor-pointer hover:text-white text-[22px]">
              sentiment_satisfied
            </span>
            <input
              id={`cmt-input-${post.id}`}
              type="text"
              placeholder="Add a comment..."
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              className="flex-1 bg-transparent text-sm focus:outline-none text-white placeholder-gray-500 py-1"
            />
            <button
              type="submit"
              disabled={!newCommentText.trim()}
              className="text-primary hover:text-white font-bold text-sm disabled:opacity-30 disabled:hover:text-primary transition-colors px-2"
            >
              Post
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
