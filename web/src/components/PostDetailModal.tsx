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
  const commentsEndRef = useRef<HTMLDivElement | null>(null);

  // Load comments and likes from localStorage
  useEffect(() => {
    // 1. Comments
    const cachedComments = localStorage.getItem(`loop_comments_${post.id}`);
    if (cachedComments) {
      setComments(JSON.parse(cachedComments));
    } else {
      // Pre-populate with some beautiful simulated comments matching the vibe
      const initialComments: Comment[] = [
        {
          id: "initial-1",
          authorName: "Sarah Jenkins",
          authorUsername: "sarah_j",
          authorAvatar: "/images/avatar_sarah_17791904823.png",
          text: "This photo is absolutely stunning! The editing vibe is perfect. 🔥🙌",
          createdAt: "2d",
        },
        {
          id: "initial-2",
          authorName: "Elena Rostova",
          authorUsername: "elena_r",
          authorAvatar: "/images/avatar_elena_1779190722727.png",
          text: "Love the depth and the color grade on this one! Keep it up!",
          createdAt: "1d",
        },
      ];
      setComments(initialComments);
      localStorage.setItem(`loop_comments_${post.id}`, JSON.stringify(initialComments));
    }

    // 2. Likes
    const likedKey = `loop_post_liked_${post.id}`;
    const wasLiked = localStorage.getItem(likedKey) === "true";
    setIsLiked(wasLiked);

    const initialLikes = parseInt(localStorage.getItem(`loop_post_likes_count_${post.id}`) || "0", 10);
    if (initialLikes > 0) {
      setLikesCount(initialLikes);
    } else {
      const randomLikes = Math.floor(Math.random() * 450) + 42;
      setLikesCount(randomLikes);
      localStorage.setItem(`loop_post_likes_count_${post.id}`, randomLikes.toString());
    }
  }, [post.id]);

  // Scroll to bottom when comments change
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  const handleLikeToggle = () => {
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    localStorage.setItem(`loop_post_liked_${post.id}`, nextLiked ? "true" : "false");

    const newCount = nextLiked ? likesCount + 1 : likesCount - 1;
    setLikesCount(newCount);
    localStorage.setItem(`loop_post_likes_count_${post.id}`, newCount.toString());
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const newComment: Comment = {
      id: Date.now().toString(),
      authorName: currentUser?.fullName || "Guest User",
      authorUsername: currentUser?.username || "guest",
      authorAvatar: currentUser?.avatar || "/images/avatar_marcus_1779191788520.png",
      text: newCommentText.trim(),
      createdAt: "Just now",
    };

    const updatedComments = [...comments, newComment];
    setComments(updatedComments);
    localStorage.setItem(`loop_comments_${post.id}`, JSON.stringify(updatedComments));
    setNewCommentText("");
  };

  const isOwner = currentUser?.id === post.authorId;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-2 md:p-6 z-[150] animate-in fade-in duration-200">
      {/* Tap outside to close (desktop click-off helper) */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      {/* Close button at top right */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors z-50 p-2"
        aria-label="Close modal"
      >
        <span className="material-symbols-outlined text-[32px]">close</span>
      </button>

      {/* Main Container */}
      <div className="w-full max-w-5xl bg-[#121212] border border-[#262626] rounded-lg overflow-hidden flex flex-col md:flex-row max-h-[90vh] md:max-h-[85vh] relative z-10">
        
        {/* Left Side: Post Image */}
        <div className="flex-1 bg-black flex items-center justify-center min-h-[300px] md:min-h-0 relative select-none">
          <img
            src={post.imageUrl}
            alt="Post content"
            className="max-h-[50vh] md:max-h-[80vh] w-full object-contain"
          />
        </div>

        {/* Right Side: Sidebar */}
        <div className="w-full md:w-[420px] border-t md:border-t-0 md:border-l border-[#262626] flex flex-col bg-[#121212] text-white">
          
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#262626]">
            <div className="flex items-center gap-3">
              <img
                src={post.authorAvatar}
                alt={post.authorName}
                className="w-8 h-8 rounded-full object-cover border border-[#262626]"
              />
              <div className="text-left">
                <span className="font-bold text-sm hover:underline hover:text-primary transition-colors cursor-pointer">
                  {post.authorUsername || "user"}
                </span>
                <span className="text-[10px] text-gray-400 block">Royal Enfield</span>
              </div>
            </div>

            {/* Options button */}
            <div className="flex items-center gap-2">
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

          {/* Comments List (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[30vh] md:max-h-none select-text">
            
            {/* First Comment: Author Caption */}
            <div className="flex gap-3 text-left">
              <img
                src={post.authorAvatar}
                alt=""
                className="w-8 h-8 rounded-full object-cover border border-[#262626] flex-shrink-0"
              />
              <div>
                <p className="text-sm">
                  <span className="font-bold mr-2 hover:underline cursor-pointer">
                    {post.authorUsername}
                  </span>
                  <span className="text-gray-200 leading-snug whitespace-pre-wrap">
                    {post.caption}
                  </span>
                </p>
                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-gray-400">
                  <span>{post.createdAt}</span>
                  {post.aiTags && post.aiTags.length > 0 && (
                    <span className="text-primary font-medium">
                      Tags: {post.aiTags.join(", ")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Simulated/User Comments */}
            {comments.map((comment) => (
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
                    <span className="text-gray-200 leading-snug">
                      {comment.text}
                    </span>
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {comment.createdAt}
                  </p>
                </div>
              </div>
            ))}
            <div ref={commentsEndRef} />
          </div>

          {/* Footer details */}
          <div className="p-4 border-t border-[#262626] space-y-3 bg-[#121212]">
            
            {/* Action Icons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Heart/Like */}
                <button
                  onClick={handleLikeToggle}
                  className="hover:scale-110 active:scale-95 transition-transform"
                >
                  <span
                    className={`material-symbols-outlined text-[26px] ${
                      isLiked ? "text-red-500 fill-current" : "text-white"
                    }`}
                    style={isLiked ? { fontVariationSettings: "'FILL' 1" } : {}}
                  >
                    favorite
                  </span>
                </button>

                {/* Comment */}
                <button className="hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[26px] text-white">
                    chat_bubble
                  </span>
                </button>

                {/* Send/Share */}
                <button className="hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[26px] text-white">
                    send
                  </span>
                </button>
              </div>

              {/* Bookmark */}
              <button className="hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[26px] text-white">
                  bookmark
                </span>
              </button>
            </div>

            {/* Like Counter */}
            <div className="text-left">
              <p className="font-bold text-sm">
                Liked by <span className="hover:underline cursor-pointer">vv_krisha_sri</span> and{" "}
                <span className="hover:underline cursor-pointer">{likesCount.toLocaleString()} others</span>
              </p>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block mt-1">
                {post.createdAt}
              </span>
            </div>
          </div>

          {/* Add Comment Input Form */}
          <form
            onSubmit={handleAddComment}
            className="flex items-center gap-2 p-3 border-t border-[#262626] bg-[#121212]"
          >
            <span className="material-symbols-outlined text-gray-400 cursor-pointer hover:text-white p-1">
              sentiment_satisfied
            </span>
            <input
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
