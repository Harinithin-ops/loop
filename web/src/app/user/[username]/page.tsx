"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  dbService,
  RealPost,
  RealReel,
  RealStory,
  RealUser,
  UserProfile,
  FollowStatus,
} from "@/app/utils/dbService";
import Link from "next/link";
import PostDetailModal from "@/components/PostDetailModal";

export default function PublicUserProfile() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [currentUser, setCurrentUser] = useState<RealUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [followStatus, setFollowStatus] = useState<FollowStatus>("none");
  const [followLoading, setFollowLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"posts" | "reels">("posts");
  const [posts, setPosts] = useState<RealPost[]>([]);
  const [reels, setReels] = useState<RealReel[]>([]);
  const [stories, setStories] = useState<RealStory[]>([]);

  // Story viewer
  const [activeStory, setActiveStory] = useState<RealStory | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const [activePost, setActivePost] = useState<RealPost | null>(null);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const me = await dbService.getActiveUser();
      setCurrentUser(me);

      const userProfile = await dbService.getProfileByUsername(username);
      if (!userProfile) {
        setLoading(false);
        return;
      }
      setProfile(userProfile);

      // If viewing own profile, redirect to /profile
      if (me && me.id === userProfile.id) {
        router.push("/profile");
        return;
      }

      // Load follow status
      if (me) {
        const status = await dbService.getFollowStatus(userProfile.id);
        setFollowStatus(status);
      }

      // Load content
      const userPosts = await dbService.getPostsByUserId(userProfile.id);
      setPosts(userPosts);

      const userReels = await dbService.getReelsByUserId(userProfile.id);
      setReels(userReels);

      const userStories = await dbService.getStoriesByUserId(userProfile.id);
      setStories(userStories);
    } catch (err) {
      console.error("Failed to load user profile", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [username]);

  // Story progress timer
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

  const handleFollowAction = async () => {
    if (!profile || !currentUser) return;
    setFollowLoading(true);

    try {
      if (followStatus === "none") {
        await dbService.sendFollowRequest(profile.id);
        setFollowStatus("pending");
      } else if (followStatus === "pending") {
        await dbService.cancelFollowRequest(profile.id);
        setFollowStatus("none");
      } else if (followStatus === "following") {
        await dbService.unfollowUser(profile.id);
        setFollowStatus("none");
        setProfile((p) =>
          p ? { ...p, followerCount: Math.max(0, p.followerCount - 1) } : p
        );
      }
    } catch (err) {
      console.error("Follow action failed", err);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = () => {
    if (followStatus === "following") {
      router.push("/messages");
    }
  };

  const getFollowButtonText = (): string => {
    switch (followStatus) {
      case "pending":
        return "REQUESTED";
      case "following":
        return "FOLLOWING";
      default:
        return "FOLLOW";
    }
  };

  const getFollowButtonClass = (): string => {
    switch (followStatus) {
      case "pending":
        return "bg-surface-container border-primary/20 text-primary";
      case "following":
        return "bg-surface border-primary/20 text-primary";
      default:
        return "bg-primary border-transparent text-white active-glow";
    }
  };

  if (loading) {
    return (
      <div className="pt-32 flex flex-col items-center justify-center space-y-4">
        <span className="material-symbols-outlined animate-spin text-[36px] text-primary">
          progress_activity
        </span>
        <p className="text-sm font-semibold text-outline-variant font-label-caps tracking-wider">
          LOADING PROFILE...
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="pt-20 pb-32 md:py-0 max-w-md mx-auto h-[70vh] flex flex-col items-center justify-center">
        <div className="glass-panel p-8 rounded-2xl border border-white/50 shadow-xl text-center space-y-6 w-full">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500">
            <span className="material-symbols-outlined text-[32px]">
              person_off
            </span>
          </div>
          <h2 className="text-2xl font-bold font-headline-md text-on-surface">
            User Not Found
          </h2>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            No user with username <strong>@{username}</strong> exists on Loop.
          </p>
          <Link
            href="/explore"
            className="block w-full py-3 rounded-xl bg-primary text-white font-bold text-sm tracking-wide shadow-lg hover:bg-primary/95 transition-all text-center font-label-caps"
          >
            BACK TO EXPLORE
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 pb-32 md:py-0 max-w-2xl mx-auto space-y-6">
      {/* Profile Header Card */}
      <section className="relative neumorphic-card bg-surface-container-lowest rounded-lg overflow-hidden border border-white/40">
        {/* Cover Photo */}
        <div className="h-40 w-full relative">
          <img
            src="/images/cover_neon_1779191739839.png"
            alt="Cover background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px]"></div>
        </div>

        {/* Profile Info */}
        <div className="px-5 pb-6">
          <div className="flex justify-between items-end -mt-12 relative z-10">
            {/* Avatar */}
            <div className="relative">
              <div
                className={`w-24 h-24 rounded-full p-1 shadow-lg bg-white ${stories.length > 0 ? "story-gradient cursor-pointer" : ""}`}
                onClick={() => stories.length > 0 && setActiveStory(stories[0])}
              >
                <div className="w-full h-full rounded-full border-4 border-surface-container-lowest overflow-hidden">
                  <img
                    src={profile.avatar}
                    alt={profile.fullName}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleFollowAction}
                disabled={followLoading}
                className={`px-5 py-2 rounded-full font-label-caps text-label-caps active:scale-95 transition-all shadow-md font-semibold text-xs border disabled:opacity-50 ${getFollowButtonClass()}`}
              >
                {followLoading ? (
                  <span className="material-symbols-outlined animate-spin text-[14px]">
                    progress_activity
                  </span>
                ) : (
                  getFollowButtonText()
                )}
              </button>

              {followStatus === "following" && (
                <button
                  type="button"
                  onClick={handleMessage}
                  className="px-4 py-2 rounded-full font-label-caps text-label-caps active:scale-95 transition-all shadow-md font-semibold text-xs border bg-surface-container border-primary/20 text-primary"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    chat_bubble
                  </span>
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <h1 className="font-bold text-2xl font-headline-md text-on-surface">
              {profile.fullName}
            </h1>
            <p className="font-semibold text-sm text-primary font-sans leading-none">
              @{profile.username}
            </p>

            {profile.bio && (
              <p className="text-sm text-on-surface-variant max-w-md leading-relaxed pt-1">
                {profile.bio}
              </p>
            )}

            {/* Stories row */}
            {stories.length > 0 && (
              <div className="flex gap-3 pt-2 overflow-x-auto no-scrollbar">
                {stories.map((story) => (
                  <div
                    key={story.id}
                    onClick={() => setActiveStory(story)}
                    className="flex-shrink-0 cursor-pointer group"
                  >
                    <div className="w-16 h-16 rounded-full story-gradient p-[2px] group-hover:scale-105 transition-transform">
                      <div className="w-full h-full rounded-full overflow-hidden border-2 border-white">
                        <img
                          src={story.mediaUrl}
                          alt="Story"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-8 mt-6">
            <div>
              <p className="font-bold text-lg font-headline-sm text-on-surface">
                {profile.followerCount}
              </p>
              <p className="text-[10px] text-outline-variant font-bold font-label-caps">
                FOLLOWERS
              </p>
            </div>
            <div>
              <p className="font-bold text-lg font-headline-sm text-on-surface">
                {profile.followingCount}
              </p>
              <p className="text-[10px] text-outline-variant font-bold font-label-caps">
                FOLLOWING
              </p>
            </div>
            <div>
              <p className="font-bold text-lg font-headline-sm text-on-surface">
                {profile.postCount}
              </p>
              <p className="text-[10px] text-outline-variant font-bold font-label-caps">
                POSTS
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Grid Tabs */}
      <div className="flex border-b border-surface-variant">
        {(["posts", "reels"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 pb-4 font-bold font-label-caps text-label-caps text-center border-b-2 active:scale-95 transition-all text-xs ${
              activeTab === tab
                ? "text-primary border-primary"
                : "text-outline-variant border-transparent"
            }`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-3 gap-1">
        {activeTab === "posts" ? (
          posts.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-outline-variant font-semibold text-xs font-label-caps uppercase">
              No posts yet
            </div>
          ) : (
            posts.map((post) => (
              <div
                key={post.id}
                onClick={() => setActivePost(post)}
                className="aspect-square overflow-hidden relative group cursor-pointer border border-black/5"
              >
                <img
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  src={post.imageUrl}
                  alt="Post"
                />
                <div className="absolute inset-0 bg-primary/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px] duration-300">
                  <p className="text-white text-xs font-semibold px-2 text-center line-clamp-2">
                    {post.caption}
                  </p>
                </div>
              </div>
            ))
          )
        ) : reels.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-outline-variant font-semibold text-xs font-label-caps uppercase">
            No reels yet
          </div>
        ) : (
          reels.map((reel) => (
            <div
              key={reel.id}
              className="aspect-square overflow-hidden relative group cursor-pointer border border-black/5 bg-black"
            >
              <div className="w-full h-full flex items-center justify-center">
                <span className="material-symbols-outlined text-white/50 text-[40px]">
                  play_circle
                </span>
              </div>
              <div className="absolute bottom-2 left-2 text-white text-[10px] font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">
                  favorite
                </span>
                {reel.likesCount}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Story Viewer Modal */}
      {activeStory && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[200] animate-in fade-in duration-200">
          <div className="w-full max-w-lg h-[90vh] flex flex-col items-center justify-center p-4 relative">
            <button
              onClick={() => setActiveStory(null)}
              className="absolute top-4 right-4 text-white hover:text-primary transition-colors z-35"
            >
              <span className="material-symbols-outlined text-[36px]">
                close
              </span>
            </button>

            <div className="w-full max-w-md bg-black rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden flex flex-col h-full">
              <div className="absolute top-4 left-4 right-4 flex gap-1 z-30">
                <div className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-100"
                    style={{ width: `${storyProgress}%` }}
                  />
                </div>
              </div>

              <div className="absolute top-8 left-4 right-4 flex items-center gap-3 z-30">
                <img
                  className="w-10 h-10 rounded-full border border-white object-cover"
                  src={profile.avatar}
                  alt={profile.fullName}
                />
                <span className="text-white font-bold text-sm tracking-wide drop-shadow-md">
                  @{profile.username}
                </span>
              </div>

              <div className="w-full h-full flex items-center justify-center relative">
                <img
                  className="w-full h-full object-contain"
                  src={activeStory.mediaUrl}
                  alt="Story content"
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
              // Instantly remove only the deleted post using functional update (no stale closure)
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
