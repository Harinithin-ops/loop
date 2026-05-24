"use client";

import React, { useState, useEffect, useRef } from "react";
import { dbService, RealChat, RealUser, FollowRequest } from "@/app/utils/dbService";
import { supabase } from "@/app/utils/supabase";
import Link from "next/link";

export default function Messages() {
  const [currentUser, setCurrentUser] = useState<RealUser | null>(null);
  const [activeTab, setActiveTab] = useState<"chats" | "requests">("chats");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [chats, setChats] = useState<RealChat[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FollowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [newChatFlash, setNewChatFlash] = useState<string | null>(null); // userId of newly added chat
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedChatIdRef = useRef<string | null>(null);
  const hasInitiallySelectedRef = useRef(false);

  // Sync ref with selectedChatId to prevent stale closure bugs in setInterval
  useEffect(() => {
    selectedChatIdRef.current = selectedChatId;
  }, [selectedChatId]);

  const [translatedMsgIds, setTranslatedMsgIds] = useState<Record<string, string>>({});

  const loadChats = async () => {
    try {
      const user = await dbService.getActiveUser();
      setCurrentUser(user);
      if (user) {
        const [activeChats, requests] = await Promise.all([
          dbService.getChats(),
          dbService.getIncomingRequests(),
        ]);
        setChats(activeChats);
        setIncomingRequests(requests);

        // Only auto-select the first chat on the VERY FIRST load, and ONLY on desktop viewports
        if (
          activeChats.length > 0 &&
          !selectedChatIdRef.current &&
          !hasInitiallySelectedRef.current &&
          typeof window !== "undefined" &&
          window.innerWidth >= 1024
        ) {
          hasInitiallySelectedRef.current = true;
          setSelectedChatId(activeChats[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load chats", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChats();

    let channel: any = null;
    const setupSubscription = async () => {
      const user = await dbService.getActiveUser();
      if (!user) return;
      channel = supabase
        .channel(`messages_room_${user.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, loadChats)
        .on("postgres_changes", { event: "*", schema: "public", table: "follow_requests" }, loadChats)
        .subscribe();
    };
    setupSubscription();

    const interval = setInterval(loadChats, 5000);
    window.addEventListener("new_message", loadChats);
    window.addEventListener("loop_follow_sync", loadChats);
    return () => {
      if (channel) supabase.removeChannel(channel);
      clearInterval(interval);
      window.removeEventListener("new_message", loadChats);
      window.removeEventListener("loop_follow_sync", loadChats);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats, selectedChatId]);

  useEffect(() => {
    if (selectedChatId && currentUser) {
      dbService.markMessagesAsRead(selectedChatId);
      setChats(prev => prev.map(c => c.id === selectedChatId ? { ...c, unreadCount: 0 } : c));
    }
  }, [selectedChatId, currentUser]);

  const activeChat = chats.find(c => c.id === selectedChatId) || null;

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyText.trim() || !activeChat || !currentUser) return;
    const messageText = replyText;
    setReplyText("");
    const optimisticMsg = {
      id: "temp_" + Date.now(),
      senderId: currentUser.id,
      senderName: currentUser.fullName,
      senderAvatar: currentUser.avatar,
      text: messageText,
      createdAt: new Date().toISOString(),
      isRead: false,
    };
    setChats(prev => prev.map(c => c.id === activeChat.id ? { ...c, messages: [...c.messages, optimisticMsg] } : c));
    await dbService.sendMessage(activeChat.id, messageText);
    const updatedChats = await dbService.getChats();
    setChats(updatedChats);
  };

  // Accept follow request → mutual connection → both appear in each other's chats
  const handleAcceptRequest = async (req: FollowRequest) => {
    setAcceptingId(req.id);
    try {
      // 1. Remove from requests list locally
      setIncomingRequests(prev => prev.filter(r => r.id !== req.id));
      
      // 2. Construct local chat object so it is visible IMMEDIATELY
      const newChatObj: RealChat = {
        id: req.senderId,
        name: req.senderName,
        username: req.senderUsername,
        avatar: req.senderAvatar,
        messages: [],
        unreadCount: 0,
        lastMessageTime: new Date().toISOString()
      };

      // 3. Insert and select instantly (eliminates database/RLS race conditions)
      setChats(prev => {
        if (prev.some(c => c.id === req.senderId)) return prev;
        return [newChatObj, ...prev];
      });
      setSelectedChatId(req.senderId);
      setActiveTab("chats");

      // 4. Flash the new chat entry
      setNewChatFlash(req.senderId);
      setTimeout(() => setNewChatFlash(null), 3000);

      // 5. Send backend follow accept (creates mutual follow in background)
      await dbService.acceptFollowRequest(req.id);

      // 6. Refresh chats in background to fetch true messages state
      const updatedChats = await dbService.getChats();
      setChats(updatedChats);

      // 7. Re-confirm selection
      const newChat = updatedChats.find(c => c.id === req.senderId);
      if (newChat) {
        setSelectedChatId(newChat.id);
      } else {
        // Fallback: keep our local object selected
        setSelectedChatId(req.senderId);
      }
    } catch (err) {
      console.error("Error accepting request:", err);
    } finally {
      setAcceptingId(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    await dbService.rejectFollowRequest(requestId);
    setIncomingRequests(prev => prev.filter(r => r.id !== requestId));
  };

  const handleDraftReply = () => {
    const drafts = [
      "That sounds absolutely phenomenal! Let's collaborate on this.",
      "Totally agree — the aesthetics on your latest post are incredible.",
      "Awesome! I'll check out your latest story right now.",
    ];
    setReplyText(drafts[Math.floor(Math.random() * drafts.length)]);
  };

  const handleTranslate = () => {
    if (!activeChat) return;
    const transMap: Record<string, string> = {};
    activeChat.messages.forEach(msg => {
      transMap[msg.id] = `[Translated to Spanish]: ${msg.text}`;
    });
    setTranslatedMsgIds(transMap);
  };

  const filteredChats = chats.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  const totalUnread = chats.reduce((sum, c) => sum + c.unreadCount, 0);

  if (loading) {
    return (
      <div className="pt-32 flex flex-col items-center justify-center space-y-4 min-h-[50vh]">
        <span className="material-symbols-outlined animate-spin text-[36px] text-primary">progress_activity</span>
        <p className="text-xs font-semibold text-primary/60 font-sans tracking-widest">DECRYPTING SECURE FEED...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="pt-20 pb-32 md:py-0 max-w-md mx-auto h-[70vh] flex flex-col items-center justify-center">
        <div className="glass-panel p-8 rounded-2xl border border-primary/20 shadow-[0_0_30px_rgba(107,255,87,0.1)] text-center space-y-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary animate-pulse">
            <span className="material-symbols-outlined text-[32px]">chat</span>
          </div>
          <h2 className="text-xl font-bold tracking-widest uppercase text-white font-sans">Secure Messages</h2>
          <p className="text-xs text-white/50 leading-relaxed font-sans">Connect to the cyber-feed to start chatting with your network.</p>
          <Link href="/login" className="block w-full py-3 rounded-xl bg-primary text-black font-bold text-xs tracking-widest shadow-lg hover:bg-primary/95 transition-all text-center font-sans uppercase">
            ESTABLISH CONNECTION
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 pb-32 md:py-0 flex flex-col lg:flex-row gap-6 max-w-5xl mx-auto h-[calc(100vh-130px)] md:h-[calc(100vh-64px)] animate-in fade-in duration-300">
      {/* Sidebar - Hidden on mobile if a chat is active */}
      <div className={`w-full lg:w-96 flex flex-col h-full bg-transparent overflow-y-auto no-scrollbar pr-2 lg:border-r border-primary/10 ${
        selectedChatId ? "hidden lg:flex" : "flex"
      }`}>
        <h2 className="text-xl font-bold tracking-widest uppercase text-primary font-sans mb-4 hidden lg:block">Cyber Messages</h2>

        {/* Tabs */}
        <nav className="flex gap-2 mb-4 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setActiveTab("chats")}
            className={`px-4 py-2 rounded-full active:scale-95 transition-all text-[10px] uppercase font-bold tracking-wider relative font-sans ${
              activeTab === "chats"
                ? "bg-primary text-black shadow-[0_0_12px_rgba(107,255,87,0.3)] font-bold"
                : "bg-black/60 border border-primary/20 text-white/60 hover:text-white"
            }`}
          >
            CHATS
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-black text-[10px] font-bold rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(107,255,87,0.5)]">{totalUnread}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-4 py-2 rounded-full active:scale-95 transition-all text-[10px] uppercase font-bold tracking-wider relative font-sans ${
              activeTab === "requests"
                ? "bg-primary text-black shadow-[0_0_12px_rgba(107,255,87,0.3)] font-bold"
                : "bg-black/60 border border-primary/20 text-white/60 hover:text-white"
            }`}
          >
            REQUESTS
            {incomingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{incomingRequests.length}</span>
            )}
          </button>
        </nav>

        {/* Search */}
        <div className="relative mb-4">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-primary/40 text-[20px]">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-12 pr-4 rounded-xl bg-black/60 border border-primary/20 focus:border-primary focus:ring-1 focus:ring-primary/20 placeholder:text-white/30 font-sans text-sm transition-all text-white"
            placeholder="Search network nodes..."
          />
        </div>

        {activeTab === "chats" ? (
          <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar">
            {filteredChats.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <span className="material-symbols-outlined text-white/20 text-[40px]">forum</span>
                <p className="text-sm text-white/50 font-bold">No active feeds</p>
                <p className="text-xs text-white/30">Connect with creators to exchange secure data packs</p>
                <button
                  onClick={() => setActiveTab("requests")}
                  className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-bold transition-all hover:bg-primary/20"
                >
                  {incomingRequests.length > 0 ? `View ${incomingRequests.length} Connection Request${incomingRequests.length > 1 ? "s" : ""}` : "Check Handshakes"}
                </button>
              </div>
            ) : (
              filteredChats.map(c => {
                const isSelected = c.id === selectedChatId;
                const isNew = newChatFlash === c.id;
                const lastMsg = c.messages[c.messages.length - 1];
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedChatId(c.id)}
                    className={`p-4 rounded-xl flex flex-col gap-2 cursor-pointer border transition-all ${
                      isNew ? "bg-primary/10 border-primary animate-pulse" :
                      isSelected ? "bg-primary/5 border-primary/30 shadow-[0_0_15px_rgba(107,255,87,0.05)]" :
                      "border-primary/5 hover:bg-primary/[0.02]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img className="w-12 h-12 rounded-full object-cover border border-primary/10" src={c.avatar} alt={c.name} />
                        {c.unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-black text-[9px] font-bold rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(107,255,87,0.4)]">{c.unreadCount}</div>
                        )}
                        {isNew && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary text-black text-[9px] font-bold rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-[12px]">check</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex justify-between items-baseline">
                          <h3 className="font-bold text-sm text-white truncate">{c.name}</h3>
                          {lastMsg && <span className="text-[10px] text-white/30 flex-shrink-0 ml-2">{formatTime(lastMsg.createdAt)}</span>}
                        </div>
                        <p className="text-xs text-primary font-semibold">@{c.username}</p>
                        {isNew && <p className="text-[10px] text-primary font-semibold mt-0.5">✓ Node Connected — transmit hello!</p>}
                        {!isNew && (
                          <p className={`text-xs truncate mt-0.5 ${c.unreadCount > 0 ? "text-white font-semibold" : "text-white/50"}`}>
                            {lastMsg ? (lastMsg.senderId === currentUser.id ? "You: " : "") + lastMsg.text : "Send message"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Requests tab */
          <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar text-left">
            {incomingRequests.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <span className="material-symbols-outlined text-white/20 text-[40px]">person_add</span>
                <p className="text-sm text-white/50 font-bold">No handshakes pending</p>
                <p className="text-xs text-white/30">When someone attempts a peer connection, it appears here</p>
              </div>
            ) : (
              incomingRequests.map(req => (
                <div key={req.id} className="p-4 rounded-xl glass-panel border border-primary/20 shadow-sm space-y-3 bg-[#050505]/45">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-[9px] font-bold font-sans tracking-wider uppercase">
                      <span className="material-symbols-outlined text-[11px]">person_add</span>
                      Connection handshake
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <Link href={`/user/${req.senderUsername || req.senderId}`}>
                      <img src={req.senderAvatar} alt={req.senderName} className="w-12 h-12 rounded-full object-cover border border-primary/10" />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/user/${req.senderUsername || req.senderId}`} className="font-bold text-sm text-white truncate block hover:text-primary transition-colors">
                        {req.senderName}
                      </Link>
                      <p className="text-xs text-primary font-semibold">@{req.senderUsername}</p>
                      <p className="text-[10px] text-white/30 mt-0.5">{formatTime(req.createdAt)}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptRequest(req)}
                      disabled={acceptingId === req.id}
                      className="flex-1 py-2.5 bg-primary text-black rounded-xl text-xs font-bold active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-60"
                    >
                      {acceptingId === req.id ? (
                        <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          Approve Link
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleRejectRequest(req.id)}
                      disabled={acceptingId === req.id}
                      className="px-4 py-2.5 bg-black/60 border border-primary/15 text-white/70 hover:text-white rounded-xl text-xs font-bold active:scale-95 transition-all"
                    >
                      Decline
                    </button>
                  </div>

                  <p className="text-[10px] text-white/30 text-center">
                    Accepting will configure a persistent secure chat node between your accounts.
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Chat Window - Hidden on mobile if no chat is active */}
      {activeChat ? (
        <div className={`flex-1 flex flex-col glass-panel rounded-2xl border border-primary/25 shadow-[0_0_30px_rgba(107,255,87,0.05)] overflow-hidden h-full ${
          selectedChatId ? "flex" : "hidden lg:flex"
        }`}>
          {/* Header */}
          <div className="p-4 border-b border-primary/10 flex justify-between items-center bg-black/40 backdrop-blur-md">
            <div className="flex items-center gap-3">
              {/* Responsive Mobile Back Button */}
              <button
                onClick={() => setSelectedChatId(null)}
                className="lg:hidden w-8 h-8 flex items-center justify-center rounded-full hover:bg-primary/10 active:scale-95 transition-all text-primary mr-1"
              >
                <span className="material-symbols-outlined text-[24px]">arrow_back</span>
              </button>

              <Link href={`/user/${activeChat.username || activeChat.id}`} className="flex items-center gap-3 hover:opacity-85 transition-opacity">
                <img className="w-10 h-10 rounded-full object-cover border border-primary/10" src={activeChat.avatar} alt={activeChat.name} />
                <div className="text-left">
                  <h3 className="font-bold text-[14px] leading-tight text-white">{activeChat.name}</h3>
                  <p className="text-xs text-primary font-semibold">@{activeChat.username}</p>
                </div>
              </Link>
            </div>
            
            <div className="flex items-center gap-2">
              <button onClick={handleDraftReply} className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-bold whitespace-nowrap active:scale-95 transition-all">
                <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
                Draft
              </button>
              <button onClick={handleTranslate} className="flex items-center gap-1 px-3 py-1.5 bg-black/60 text-white/70 border border-primary/10 rounded-full text-xs font-bold whitespace-nowrap active:scale-95 transition-all">
                <span className="material-symbols-outlined text-[15px]">translate</span>
                Translate
              </button>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto no-scrollbar space-y-4 bg-gradient-to-b from-[#050505]/40 to-transparent">
            {activeChat.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                <span className="material-symbols-outlined text-primary/30 text-[48px] animate-pulse">waving_hand</span>
                <p className="text-sm text-white/50 font-bold">Node link established!</p>
                <p className="text-xs text-white/30 max-w-xs">
                  Say hello to @{activeChat.username} — start transmitting secure text packages.
                </p>
              </div>
            ) : (
              activeChat.messages.map(msg => {
                const isMe = msg.senderId === currentUser.id;
                const translation = translatedMsgIds[msg.id];
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <div className={`max-w-[70%] rounded-xl px-4 py-2.5 text-sm leading-relaxed text-left ${
                      isMe 
                        ? "bg-primary/15 border border-primary/30 text-white rounded-tr-none shadow-[0_0_15px_rgba(107,255,87,0.03)]" 
                        : "bg-black/60 border border-primary/10 text-white/90 rounded-tl-none"
                    }`}>
                      {msg.text}
                    </div>
                    <span className={`text-[9px] text-white/30 mt-1 px-1 flex items-center gap-1 ${isMe ? "text-right" : "text-left"}`}>
                      {formatTime(msg.createdAt)}
                      {isMe && <span className="text-primary/70">{msg.isRead ? "✓✓" : "✓"}</span>}
                    </span>
                    {translation && (
                      <div className={`max-w-[70%] text-[10px] font-semibold italic text-primary/70 mt-1 px-2 text-left`}>
                        🌐 {translation}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="p-4 border-t border-primary/10 bg-black/40 backdrop-blur-md flex items-center gap-2">
            <input
              type="text"
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              className="flex-1 bg-black/60 border border-primary/20 rounded-xl px-5 py-3 text-sm focus:outline-none focus:border-primary text-white placeholder:text-white/30 font-sans"
              placeholder={`Message @${activeChat.username}...`}
            />
            <button type="submit" className="w-11 h-11 bg-primary hover:scale-105 hover:shadow-[0_0_15px_rgba(107,255,87,0.4)] text-black rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all flex-shrink-0">
              <span className="material-symbols-outlined text-[20px] font-bold">send</span>
            </button>
          </form>
        </div>
      ) : (
        /* Hidden on mobile completely when no active chat is loaded */
        <div className={`flex-1 flex flex-col items-center justify-center glass-panel rounded-2xl border border-primary/20 shadow-xl bg-black/10 h-full text-center p-6 space-y-4 ${
          selectedChatId ? "flex" : "hidden lg:flex"
        }`}>
          <span className="material-symbols-outlined text-primary/20 text-[56px] filter drop-shadow-[0_0_20px_rgba(107,255,87,0.05)]">chat_bubble</span>
          <p className="text-base font-bold text-white uppercase tracking-wider">Secure Node Terminal</p>
          <p className="text-xs text-white/40 max-w-xs leading-relaxed">
            {chats.length === 0
              ? "Establish connection links with other creators to start secure transfers."
              : "Select an active channel from your node list."}
          </p>
          {chats.length === 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("requests")}
                className="px-5 py-2.5 bg-primary text-black rounded-xl font-bold text-xs uppercase tracking-wider active:scale-95 transition-all shadow-[0_0_15px_rgba(107,255,87,0.25)] font-sans"
              >
                {incomingRequests.length > 0 ? `VIEW ${incomingRequests.length} HANDSHAKE${incomingRequests.length > 1 ? "S" : ""}` : "VIEW HANDSHAKES"}
              </button>
              <Link href="/explore" className="px-5 py-2.5 bg-black/60 border border-primary/20 text-primary rounded-xl font-bold text-xs uppercase tracking-wider active:scale-95 transition-all font-sans">
                EXPLORE
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

