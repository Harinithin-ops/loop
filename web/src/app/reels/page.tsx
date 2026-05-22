"use client";

import React, { useState, useEffect, useRef } from "react";
import { dbService, RealReel, RealUser } from "@/app/utils/dbService";
import Link from "next/link";

export default function ReelsPage() {
  const [reels, setReels] = useState<RealReel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [likedReels, setLikedReels] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<RealUser | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const reelRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [data, userObj] = await Promise.all([
          dbService.getReels(),
          dbService.getActiveUser()
        ]);
        setReels(data);
        setCurrentUser(userObj);
      } catch (err) {
        console.error("Failed to load reels", err);
      } finally {
        setLoading(false);
      }
    };
    load();
    window.addEventListener("loop_feed_refresh", load);
    return () => window.removeEventListener("loop_feed_refresh", load);
  }, []);

  // Intersection Observer for auto-play active reel
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = Number(entry.target.getAttribute("data-index"));
          if (entry.isIntersecting) {
            setActiveIndex(idx);
            const video = entry.target.querySelector("video");
            if (video) video.play().catch(() => {});
          } else {
            const video = entry.target.querySelector("video");
            if (video) video.pause();
          }
        });
      },
      { threshold: 0.7 }
    );

    reelRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [reels]);

  const handleLike = (reelId: string) => {
    setLikedReels((prev) => {
      const next = new Set(prev);
      if (next.has(reelId)) next.delete(reelId);
      else next.add(reelId);
      return next;
    });
  };

  const scrollToReel = (direction: "up" | "down") => {
    const nextIdx = direction === "down" ? Math.min(activeIndex + 1, reels.length - 1) : Math.max(activeIndex - 1, 0);
    reelRefs.current[nextIdx]?.scrollIntoView({ behavior: "smooth" });
  };

  const handleDeleteReel = async (reelId: string) => {
    if (!confirm("Are you sure you want to delete this reel?")) return;

    try {
      const success = await dbService.deleteReel(reelId);
      if (success) {
        setReels((prev) => prev.filter((r) => r.id !== reelId));
        alert("Reel deleted successfully!");
      } else {
        alert("Failed to delete reel.");
      }
    } catch (err) {
      console.error("Error deleting reel:", err);
      alert("An error occurred while deleting the reel.");
    }
  };

  if (loading) {
    return (
      <div className="pt-32 flex flex-col items-center justify-center space-y-4">
        <span className="material-symbols-outlined animate-spin text-[36px] text-primary">progress_activity</span>
        <p className="text-sm font-semibold text-outline-variant font-label-caps tracking-wider">LOADING REELS...</p>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="pt-20 pb-32 md:py-0 max-w-md mx-auto h-[70vh] flex flex-col items-center justify-center">
        <div className="glass-panel p-8 rounded-2xl border border-white/50 shadow-xl text-center space-y-6 w-full">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
            <span className="material-symbols-outlined text-[32px]">movie</span>
          </div>
          <h2 className="text-2xl font-bold font-headline-md text-on-surface">No Reels Yet</h2>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Be the first to post a reel! Click <strong>Create</strong> in the sidebar and select <strong>Reel</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16 pb-24 md:pt-0 md:pb-0 max-w-[480px] mx-auto">
      {/* Reels vertical scroll container */}
      <div ref={containerRef} className="snap-y snap-mandatory overflow-y-auto h-[calc(100vh-64px)] no-scrollbar">
        {reels.map((reel, index) => (
          <div
            key={reel.id}
            ref={(el) => { reelRefs.current[index] = el; }}
            data-index={index}
            className="snap-start h-[calc(100vh-64px)] w-full relative bg-black rounded-xl overflow-hidden mb-1"
          >
            {/* Video */}
            <video
              src={reel.videoUrl}
              className="w-full h-full object-contain bg-black"
              loop
              muted={index !== activeIndex}
              playsInline
              onClick={(e) => {
                const v = e.currentTarget;
                void (v.paused ? v.play() : v.pause());
              }}
            />

            {/* Gradient overlay at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

            {/* Bottom info: user + caption */}
            <div className="absolute bottom-6 left-4 right-16 space-y-2 z-10">
              <Link href={`/user/${reel.userUsername}`} className="flex items-center gap-2 group">
                <img src={reel.userAvatar} alt="" className="w-9 h-9 rounded-full border-2 border-white object-cover" />
                <span className="text-white font-bold text-sm group-hover:text-primary transition-colors">
                  {reel.userUsername || reel.userName}
                </span>
              </Link>
              {reel.caption && (
                <p className="text-white text-sm leading-snug line-clamp-2">{reel.caption}</p>
              )}
            </div>

            {/* Right side action buttons */}
            <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5 z-10">
              {/* Like */}
              <button onClick={() => handleLike(reel.id)} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
                <span
                  className={`material-symbols-outlined text-[28px] transition-colors ${likedReels.has(reel.id) ? "text-red-500" : "text-white"}`}
                  style={likedReels.has(reel.id) ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  favorite
                </span>
                <span className="text-white text-[11px] font-bold">
                  {reel.likesCount + (likedReels.has(reel.id) ? 1 : 0)}
                </span>
              </button>

              {/* Comment */}
              <button className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
                <span className="material-symbols-outlined text-[28px] text-white">chat_bubble</span>
                <span className="text-white text-[11px] font-bold">0</span>
              </button>

              {/* Share */}
              <button className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
                <span className="material-symbols-outlined text-[28px] text-white">send</span>
              </button>

              {/* Delete Reel (Only for creator) */}
              {currentUser && currentUser.id === reel.userId && (
                <button
                  onClick={() => handleDeleteReel(reel.id)}
                  className="flex flex-col items-center gap-1 active:scale-90 transition-transform text-[#ff3040] hover:text-red-500"
                  title="Delete Reel"
                >
                  <span className="material-symbols-outlined text-[28px]">delete</span>
                </button>
              )}

              {/* Music disc animation */}
              <div className="w-9 h-9 rounded-full border-2 border-white/30 overflow-hidden mt-2 animate-spin" style={{ animationDuration: "4s" }}>
                <img src={reel.userAvatar} alt="" className="w-full h-full object-cover" />
              </div>
            </div>

            {/* Play/Pause indicator (shows briefly) */}
            {index === activeIndex && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* Tap to play overlay is handled by video onClick */}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Navigation arrows (desktop) */}
      <div className="hidden md:flex fixed right-8 top-1/2 -translate-y-1/2 flex-col gap-2 z-20">
        <button onClick={() => scrollToReel("up")} disabled={activeIndex === 0}
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 disabled:opacity-30 transition-all">
          <span className="material-symbols-outlined">keyboard_arrow_up</span>
        </button>
        <button onClick={() => scrollToReel("down")} disabled={activeIndex === reels.length - 1}
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 disabled:opacity-30 transition-all">
          <span className="material-symbols-outlined">keyboard_arrow_down</span>
        </button>
      </div>
    </div>
  );
}
