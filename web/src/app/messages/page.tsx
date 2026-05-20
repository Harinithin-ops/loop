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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // AI tools
  const [translationLang] = useState<string>("Spanish");
  const [translatedMsgIds, setTranslatedMsgIds] = useState<Record<string, string>>({});

  const loadChats = async () => {
    try {
      const user = await dbService.getActiveUser();
      setCurrentUser(user);

      if (user) {
        const activeChats = await dbService.getChats();
        setChats(activeChats);
        if (activeChats.length > 0 && !selectedChatId) {
          setSelectedChatId(activeChats[0].id);
        }

        const requests = await dbService.getIncomingRequests();
        setIncomingRequests(requests);
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
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages",
          },
          async () => {
            await loadChats();
          }
        )
        .subscribe();
    };

    setupSubscription();

    const interval = setInterval(() => {
      loadChats();
    }, 5000);

    window.addEventListener("new_message", loadChats);
    window.addEventListener("loop_follow_sync", loadChats);
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      clearInterval(interval);
      window.removeEventListener("new_message", loadChats);
      window.removeEventListener("loop_follow_sync", loadChats);
    };
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats, selectedChatId]);

  // Mark messages as read when chat is selected
  useEffect(() => {
    if (selectedChatId && currentUser) {
      dbService.markMessagesAsRead(selectedChatId);
      setChats((prev) =>
        prev.map((c) =>
          c.id === selectedChatId ? { ...c, unreadCount: 0 } : c
        )
      );
    }
  }, [selectedChatId, currentUser]);

  const activeChat = chats.find((c) => c.id === selectedChatId) || null;

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyText.trim() || !activeChat || !currentUser) return;

    const messageText = replyText;
    setReplyText("");

    // Optimistic update
    const optimisticMsg = {
      id: "temp_" + Date.now(),
      senderId: currentUser.id,
      senderName: currentUser.fullName,
      senderAvatar: currentUser.avatar,
      text: messageText,
      createdAt: new Date().toISOString(),
      isRead: false,
    };

    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChat.id
          ? { ...c, messages: [...c.messages, optimisticMsg] }
          : c
      )
    );

    await dbService.sendMessage(activeChat.id, messageText);

    // Refresh to get real data
    const updatedChats = await dbService.getChats();
    setChats(updatedChats);
  };

  const handleAcceptRequest = async (requestId: string) => {
    await dbService.acceptFollowRequest(requestId);
    setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
    // Refresh chats since a new connection was made
    const updatedChats = await dbService.getChats();
    setChats(updatedChats);
  };

  const handleRejectRequest = async (requestId: string) => {
    await dbService.rejectFollowRequest(requestId);
    setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
  };

  // AI draft reply
  const handleDraftReply = () => {
    const drafts = [
      "That sounds absolutely phenomenal! Let's collaborate on this.",
      "Totally agree — the aesthetics on your latest post are incredible.",
      "Awesome! I'll check out your latest story right now.",
    ];
    setReplyText(drafts[Math.floor(Math.random() * drafts.length)]);
  };

  // AI translate
  const handleTranslate = () => {
    if (!activeChat) return;
    const transMap: Record<string, string> = {};
    activeChat.messages.forEach((msg) => {
      transMap[msg.id] = `[Translated to ${translationLang}]: ${msg.text}`;
    });
    setTranslatedMsgIds(transMap);
  };

  const filteredChats = chats.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
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
      <div className="pt-32 flex flex-col items-center justify-center space-y-4">
        <span className="material-symbols-outlined animate-spin text-[36px] text-primary">
          progress_activity
        </span>
        <p className="text-sm font-semibold text-outline-variant font-label-caps tracking-wider">
          LOADING CHATS...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="pt-20 pb-32 md:py-0 max-w-md mx-auto h-[70vh] flex flex-col items-center justify-center">
        <div className="glass-panel p-8 rounded-2xl border border-white/50 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary animate-bounce">
            <span className="material-symbols-outlined text-[32px]">chat</span>
          </div>
          <h2 className="text-2xl font-bold font-headline-md text-on-surface">Secure Messages</h2>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Sign in to start messaging your connections on Loop.
          </p>
          <Link
            href="/login"
            className="block w-full py-3 rounded-xl bg-primary text-white font-bold text-sm tracking-wide shadow-lg hover:bg-primary/95 transition-all text-center font-label-caps"
          >
            SIGN IN TO CHAT
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 pb-32 md:py-0 flex flex-col lg:flex-row gap-6 max-w-5xl mx-auto h-[calc(100vh-120px)] md:h-[calc(100vh-64px)] animate-in fade-in duration-300">
      {/* Sidebar */}
      <div className="w-full lg:w-96 flex flex-col h-full bg-transparent overflow-y-auto no-scrollbar pr-2 border-r border-white/20">
        <h2 className="text-2xl font-bold font-headline-md mb-4 hidden lg:block">Messages</h2>

        {/* Tab buttons */}
        <nav className="flex gap-2 mb-4 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setActiveTab("chats")}
            className={`px-4 py-2 rounded-full font-label-caps text-label-caps whitespace-nowrap active:scale-95 transition-all text-xs font-semibold relative ${
              activeTab === "chats"
                ? "bg-primary text-white shadow-md active-glow"
                : "bg-surface-container-lowest/70 backdrop-blur-md border border-white/20 text-on-surface-variant hover:bg-white/50"
            }`}
          >
            CHATS
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {totalUnread}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-4 py-2 rounded-full font-label-caps text-label-caps whitespace-nowrap active:scale-95 transition-all text-xs font-semibold relative ${
              activeTab === "requests"
                ? "bg-primary text-white shadow-md active-glow"
                : "bg-surface-container-lowest/70 backdrop-blur-md border border-white/20 text-on-surface-variant hover:bg-white/50"
            }`}
          >
            REQUESTS
            {incomingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {incomingRequests.length}
              </span>
            )}
          </button>
        </nav>

        {/* Search */}
        <div className="relative mb-4 group">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline-variant text-[20px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-12 pr-4 rounded-lg bg-surface-container border-none focus:ring-2 focus:ring-primary/20 shadow-inner placeholder:text-outline-variant font-sans text-sm transition-all"
            placeholder="Search conversations..."
          />
        </div>

        {activeTab === "chats" ? (
          /* Chat list */
          <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar">
            {filteredChats.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <span className="material-symbols-outlined text-outline-variant text-[40px]">forum</span>
                <p className="text-sm text-outline-variant font-semibold">No conversations yet</p>
                <p className="text-xs text-outline-variant">Follow users and accept requests to start chatting</p>
              </div>
            ) : (
              filteredChats.map((c) => {
                const isSelected = c.id === selectedChatId;
                const lastMsg = c.messages[c.messages.length - 1];
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedChatId(c.id)}
                    className={`floating-chat-bubble p-4 rounded-lg flex flex-col gap-2 cursor-pointer shadow-sm border transition-all ${
                      isSelected
                        ? "bg-white border-primary/30 ring-1 ring-primary/10 shadow-md"
                        : "border-transparent hover:bg-white/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          className="w-12 h-12 rounded-full object-cover border border-black/5"
                          src={c.avatar}
                          alt={c.name}
                        />
                        {c.unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                            {c.unreadCount}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <h3 className="font-bold text-sm text-on-surface truncate">{c.name}</h3>
                          {lastMsg && (
                            <span className="text-[10px] text-outline-variant flex-shrink-0 ml-2">
                              {formatTime(lastMsg.createdAt)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <p className="text-xs text-primary font-semibold">@{c.username}</p>
                        </div>
                        <p className={`text-xs truncate mt-0.5 ${c.unreadCount > 0 ? "text-on-surface font-semibold" : "text-on-surface-variant"}`}>
                          {lastMsg
                            ? (lastMsg.senderId === currentUser.id ? "You: " : "") + lastMsg.text
                            : "Start a conversation"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Requests list */
          <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar">
            {incomingRequests.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <span className="material-symbols-outlined text-outline-variant text-[40px]">person_add</span>
                <p className="text-sm text-outline-variant font-semibold">No pending requests</p>
                <p className="text-xs text-outline-variant">When someone sends you a follow request, it&apos;ll appear here</p>
              </div>
            ) : (
              incomingRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-lg glass-panel border border-white/40 shadow-sm space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <Link href={`/user/${req.senderUsername}`}>
                      <img
                        src={req.senderAvatar}
                        alt={req.senderName}
                        className="w-12 h-12 rounded-full object-cover border border-black/5"
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/user/${req.senderUsername}`} className="font-bold text-sm text-on-surface truncate block hover:text-primary">
                        {req.senderName}
                      </Link>
                      <p className="text-xs text-primary font-semibold">@{req.senderUsername}</p>
                      <p className="text-[10px] text-outline-variant mt-0.5">
                        {formatTime(req.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptRequest(req.id)}
                      className="flex-1 py-2 bg-primary text-white rounded-lg text-xs font-bold active:scale-95 transition-all shadow-md"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRejectRequest(req.id)}
                      className="flex-1 py-2 bg-surface-container border border-black/10 text-on-surface-variant rounded-lg text-xs font-bold active:scale-95 transition-all"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Main Panel: Chat Window */}
      {activeChat ? (
        <div className="flex-1 flex flex-col glass-panel rounded-lg shadow-xl border-white/50 bg-white/70 overflow-hidden h-full">
          {/* Chat Header */}
          <div className="p-4 border-b border-black/5 flex justify-between items-center bg-white/40 backdrop-blur-md">
            <Link href={`/user/${activeChat.username}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <img className="w-10 h-10 rounded-full object-cover" src={activeChat.avatar} alt={activeChat.name} />
              <div>
                <h3 className="font-bold text-[15px] font-headline-sm">{activeChat.name}</h3>
                <p className="text-xs text-primary font-semibold">@{activeChat.username}</p>
              </div>
            </Link>

            {/* AI Helper Tools */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleDraftReply}
                className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold whitespace-nowrap active:scale-95 transition-all shadow-[0_0_10px_rgba(42,73,223,0.05)]"
              >
                <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
                Draft
              </button>
              <button
                onClick={handleTranslate}
                className="flex items-center gap-1 px-3 py-1.5 bg-surface-container-high/60 text-on-surface-variant rounded-full text-xs font-bold whitespace-nowrap active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[15px]">translate</span>
                Translate
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-4 overflow-y-auto no-scrollbar space-y-4">
            {activeChat.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                <span className="material-symbols-outlined text-outline-variant text-[48px]">waving_hand</span>
                <p className="text-sm text-outline-variant font-semibold">Start the conversation!</p>
                <p className="text-xs text-outline-variant max-w-xs">
                  Send a message to @{activeChat.username} to begin chatting.
                </p>
              </div>
            ) : (
              activeChat.messages.map((msg) => {
                const isMe = msg.senderId === currentUser.id;
                const translation = translatedMsgIds[msg.id];
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2.5 text-sm leading-relaxed ${
                        isMe
                          ? "bg-primary text-white shadow-md rounded-br-none"
                          : "bg-surface-container-low/70 border border-black/5 text-on-surface rounded-bl-none"
                      }`}
                    >
                      {msg.text}
                    </div>

                    {/* Timestamp */}
                    <span className={`text-[10px] text-outline-variant mt-1 px-1 ${isMe ? "text-right" : "text-left"}`}>
                      {formatTime(msg.createdAt)}
                      {isMe && (
                        <span className="ml-1">
                          {msg.isRead ? "✓✓" : "✓"}
                        </span>
                      )}
                    </span>

                    {translation && (
                      <div
                        className={`max-w-[70%] text-[11px] font-semibold italic text-outline mt-1 px-2 ${
                          isMe ? "text-right" : "text-left"
                        }`}
                      >
                        🌐 {translation}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-black/5 bg-white/40 backdrop-blur-md flex items-center gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="flex-1 bg-white/60 border border-black/5 rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent font-sans"
              placeholder="Type your message..."
            />
            <button
              type="submit"
              className="w-11 h-11 bg-primary hover:bg-primary-container text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all flex-shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center glass-panel rounded-lg shadow-xl bg-white/70 h-full text-center p-6 space-y-4">
          <span className="material-symbols-outlined text-outline-variant text-[56px]">chat_bubble</span>
          <p className="text-lg font-bold text-on-surface">Your Messages</p>
          <p className="text-sm text-outline-variant max-w-xs">
            {chats.length === 0
              ? "Follow other users and accept their requests to start chatting."
              : "Select a conversation to start messaging."}
          </p>
          {chats.length === 0 && (
            <Link
              href="/explore"
              className="px-6 py-2.5 bg-primary text-white rounded-full font-bold text-sm active:scale-95 transition-all shadow-lg font-label-caps"
            >
              DISCOVER USERS
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// Simple helper to avoid import in component
function supabaseSubscribe(userId: string) {
  // Placeholder for realtime subscription — extend with Supabase realtime channels
  return null;
}
