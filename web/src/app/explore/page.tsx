"use client";

import React, { useState, useEffect, useCallback } from "react";
import { dbService, RealPost } from "@/app/utils/dbService";
import Link from "next/link";

interface SearchResult {
  id: string;
  fullName: string;
  username: string;
  avatar: string;
}

interface ExploreItem {
  id: string;
  image: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  avatar: string;
  caption: string;
  category: string;
  aspectClass: string;
  trending?: boolean;
}

export default function ExploreSearch() {
  const categories = ["FOR YOU", "ART", "FASHION", "TECH", "AI"];
  const [activeCategory, setActiveCategory] = useState("FOR YOU");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const [allItems, setAllItems] = useState<ExploreItem[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profiles = await dbService.getAllProfiles();
        const posts = await dbService.getPosts();

        setSuggestedUsers(
          profiles.slice(0, 8).map((p: any) => ({
            id: p.id,
            fullName: p.full_name || p.username || "User",
            username: p.username || "",
            avatar:
              p.avatar_url || "/images/avatar_marcus_1779191788520.png",
          }))
        );

        setAllItems(
          posts.map((p) => ({
            id: p.id,
            image: p.imageUrl,
            authorId: p.authorId,
            authorName: p.authorName,
            authorUsername: p.authorUsername,
            avatar: p.authorAvatar,
            caption: p.caption,
            category: (p.tone || "ART").toUpperCase(),
            aspectClass: [
              "aspect-[3/4]",
              "aspect-[4/5]",
              "aspect-[1/1]",
            ][Math.floor(Math.random() * 3)],
            trending: Math.random() > 0.7,
          }))
        );
      } catch (err) {
        console.error("Explore fetch failed", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Debounced search
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await dbService.searchUsers(query);
      setSearchResults(results);
      setShowResults(true);
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  const filteredItems = allItems.filter((item) => {
    const matchesCategory =
      activeCategory === "FOR YOU" ||
      item.category === activeCategory;
    return matchesCategory;
  });

  return (
    <div className="pt-20 pb-32 md:py-0 max-w-2xl mx-auto space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <div className="search-glow neumorphic-inset flex items-center bg-white/60 rounded-full px-5 py-3.5 border border-primary/10 transition-shadow focus-within:shadow-[0_0_25px_rgba(42,73,223,0.25)]">
          <span className="material-symbols-outlined text-primary mr-3 text-[22px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.trim() && setShowResults(true)}
            placeholder="Search users by name or @username..."
            className="bg-transparent border-none outline-none focus:ring-0 w-full font-sans text-on-surface text-[15px] p-0 placeholder:text-outline-variant"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setShowResults(false);
              }}
              className="material-symbols-outlined text-outline-variant hover:text-primary text-[20px]"
            >
              close
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showResults && (
          <div className="absolute top-full left-0 right-0 mt-2 glass-panel rounded-lg border border-white/50 shadow-2xl z-50 max-h-80 overflow-y-auto no-scrollbar">
            {isSearching ? (
              <div className="p-6 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined animate-spin text-primary text-[20px]">
                  progress_activity
                </span>
                <span className="text-sm text-outline-variant font-semibold">
                  Searching...
                </span>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-6 text-center">
                <span className="material-symbols-outlined text-outline-variant text-[32px] mb-2">
                  person_search
                </span>
                <p className="text-sm text-outline-variant font-semibold">
                  No users found for &quot;{searchQuery}&quot;
                </p>
              </div>
            ) : (
              <div className="py-2">
                {searchResults.map((user) => (
                  <Link
                    key={user.id}
                    href={`/user/${user.username || user.id}`}
                    onClick={() => setTimeout(() => setShowResults(false), 10)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-primary/5 transition-colors"
                  >
                    <img
                      src={user.avatar}
                      alt={user.fullName}
                      className="w-11 h-11 rounded-full object-cover border border-black/5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-on-surface truncate">
                        {user.fullName}
                      </p>
                      <p className="text-xs text-primary font-semibold truncate">
                        @{user.username}
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-outline-variant text-[18px]">
                      chevron_right
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Click overlay to close search */}
      {showResults && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowResults(false)}
        />
      )}

      {/* Categories */}
      <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`glass-panel px-6 py-2 rounded-full font-label-caps text-label-caps whitespace-nowrap active:scale-95 transition-all ${
              activeCategory === cat
                ? "bg-primary/10 border-primary/40 text-primary shadow-[0_0_15px_rgba(42,73,223,0.1)] active-glow"
                : "text-on-surface-variant hover:bg-white/40 border-white/20"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Suggested Users Carousel */}
      {suggestedUsers.length > 0 && (
        <section className="space-y-4">
          <div className="flex justify-between items-end">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-headline-sm text-on-surface">
                Suggested For You
              </h2>
              <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-label-caps font-bold animate-pulse">
                LIVE
              </span>
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar py-1">
            {suggestedUsers.map((u) => (
              <Link
                key={u.id}
                href={`/user/${u.username || u.id}`}
                className="flex flex-col items-center gap-2 min-w-[75px] cursor-pointer group"
              >
                <div className="w-16 h-16 rounded-full story-border p-0.5 overflow-hidden group-hover:scale-105 active:scale-90 transition-transform relative bg-white shadow-md">
                  <img
                    src={u.avatar}
                    alt={u.fullName}
                    className="w-full h-full rounded-full bg-surface-container-high object-cover"
                  />
                </div>
                <div className="flex flex-col items-center text-center">
                  <span className="font-bold text-[10px] text-on-surface tracking-tighter truncate w-16">
                    {u.fullName}
                  </span>
                  {u.username && (
                    <span className="text-[8px] text-primary font-bold font-label-caps tracking-widest leading-none mt-0.5">
                      @{u.username.toUpperCase()}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Content Grid */}
      <div className="space-y-4">
        {/* AI Recommendation Panel */}
        <div className="glass-panel p-5 rounded-lg border-white/50 overflow-hidden relative group shadow-xl ai-glow-border">
          <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-2">
              <span
                className="material-symbols-outlined text-primary text-[18px] animate-pulse"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                auto_awesome
              </span>
              <span className="font-label-caps text-[10px] text-primary tracking-widest font-bold">
                AI RECOMMENDATION
              </span>
            </div>
            <h3 className="font-bold text-headline-sm text-on-surface leading-tight">
              Discover New Creators
            </h3>
            <p className="text-body-md text-on-surface-variant text-[14px] leading-relaxed">
              Search for users by their name or @username. Follow them to see
              their posts in your feed and start conversations.
            </p>
          </div>
          <div className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 rotate-12 select-none pointer-events-none">
            <span
              className="material-symbols-outlined text-primary text-[120px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              psychology
            </span>
          </div>
        </div>

        {/* Dynamic Cards Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <span className="material-symbols-outlined animate-spin text-[36px] text-primary">
              progress_activity
            </span>
            <p className="text-sm font-semibold text-outline-variant font-label-caps tracking-wider">
              LOADING EXPLORE...
            </p>
          </div>
        ) : (
          <div className="masonry-grid">
            {filteredItems.map((item) => (
              <Link
                key={item.id}
                href={`/user/${item.authorUsername || item.authorId}`}
                className="masonry-item glass-panel rounded-lg overflow-hidden flex flex-col relative shadow-md border-white/40 cursor-pointer"
              >
                {item.trending && (
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 glass-panel rounded-full z-10 border-white/40">
                    <div className="w-1.5 h-1.5 rounded-full bg-error animate-ping"></div>
                    <span className="text-[9px] font-label-caps text-on-surface font-bold">
                      TRENDING NOW
                    </span>
                  </div>
                )}
                <img
                  className={`w-full ${item.aspectClass} object-cover`}
                  src={item.image}
                  alt="Explore media"
                />
                <div className="p-3 bg-white/40 backdrop-blur-md flex items-center justify-between border-t border-white/20">
                  <div className="flex items-center gap-2">
                    <img
                      className="w-5 h-5 rounded-full"
                      src={item.avatar}
                      alt={item.authorName}
                    />
                    <span className="font-label-caps text-[10px] text-on-surface-variant font-semibold truncate w-24">
                      @{item.authorUsername || item.authorName}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
