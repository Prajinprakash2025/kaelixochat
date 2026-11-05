"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { DepartmentToolbar } from "@/components/chat/department-toolbar";
import { MessageFeed } from "@/components/chat/message-feed";
import { ChatInput } from "@/components/chat/chat-input";
import { NewChannelModal } from "@/components/modals/new-channel-modal";
import { AuthModal } from "@/components/modals/auth-modal";
import {
  DEPARTMENTS,
  CURRENT_USER as DEFAULT_USER,
  TEAM_MEMBERS,
  INITIAL_CHANNELS,
  INITIAL_MESSAGES,
} from "@/lib/mock-data";
import { DepartmentCode, Channel, Message, WorkspaceMember } from "@/types";
import {
  Hash,
  Lock,
  Search,
  PanelRight,
  Radio,
  UserCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const DEPT_ID_TO_CODE: Record<string, DepartmentCode> = {
  "22222222-2222-2222-2222-222222222221": "dev",
  "22222222-2222-2222-2222-222222222222": "teaching",
  "22222222-2222-2222-2222-222222222223": "telecalling",
  "22222222-2222-2222-2222-222222222224": "management",
};

const CODE_TO_DEPT_ID: Record<string, string> = {
  dev: "22222222-2222-2222-2222-222222222221",
  teaching: "22222222-2222-2222-2222-222222222222",
  telecalling: "22222222-2222-2222-2222-222222222223",
  management: "22222222-2222-2222-2222-222222222224",
};

export default function KaelixoApp() {
  const [currentUser, setCurrentUser] = useState<WorkspaceMember>(DEFAULT_USER);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentCode>("all");
  const [channels, setChannels] = useState<Channel[]>(INITIAL_CHANNELS);
  const [activeChannelId, setActiveChannelId] = useState<string>("chan-announcements");
  const [messagesByChannel, setMessagesByChannel] = useState<Record<string, Message[]>>(INITIAL_MESSAGES);
  const [isNewChannelModalOpen, setIsNewChannelModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [externalTemplateText, setExternalTemplateText] = useState("");
  const [showRightDrawer, setShowRightDrawer] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  const supabase = createClient();

  // Load user profile from localStorage if exists
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("kaelixo_user");
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.warn("Storage not available");
    }
  }, []);

  const handleSaveProfile = (profile: WorkspaceMember) => {
    setCurrentUser(profile);
    try {
      localStorage.setItem("kaelixo_user", JSON.stringify(profile));
    } catch (e) {
      console.warn("Storage error");
    }
  };

  // Play a soft notification chime using Web Audio API
  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  // 1. Fetch live channels from Supabase
  useEffect(() => {
    async function loadChannels() {
      try {
        const { data: dbChannels, error } = await supabase
          .from("channels")
          .select("*")
          .order("created_at", { ascending: true });

        if (!error && dbChannels && dbChannels.length > 0) {
          const formattedChannels: Channel[] = dbChannels.map((ch: any) => ({
            id: ch.id,
            name: ch.name,
            topic: ch.topic || "",
            departmentId: ch.department_id,
            departmentCode: ch.department_id ? DEPT_ID_TO_CODE[ch.department_id] || "all" : "all",
            isPrivate: ch.is_private || false,
          }));

          setChannels(formattedChannels);
          setActiveChannelId(formattedChannels[0].id);
          setIsLiveConnected(true);
        }
      } catch (err) {
        console.warn("Using fallback channels data:", err);
      }
    }

    loadChannels();
  }, []);

  // 2. Fetch live messages for active channel
  useEffect(() => {
    async function loadMessages() {
      try {
        const { data: dbMessages, error } = await supabase
          .from("messages")
          .select("*")
          .eq("channel_id", activeChannelId)
          .order("created_at", { ascending: true });

        if (!error && dbMessages && dbMessages.length > 0) {
          const mapped: Message[] = dbMessages.map((m: any) => ({
            id: m.id,
            channelId: m.channel_id,
            sender: {
              id: m.sender_id || `user-anon`,
              name: m.sender_name || "Team Member",
              email: "member@kaelixo.com",
              avatar: m.sender_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(m.sender_name || "member")}`,
              role: (m.sender_role as any) || "member",
              department: (m.sender_department as any) || "dev",
              status: "online",
            },
            content: m.content,
            createdAt: new Date(m.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            reactions: [],
            isPinned: m.is_pinned || false,
          }));

          setMessagesByChannel((prev) => ({
            ...prev,
            [activeChannelId]: mapped,
          }));
          setIsLiveConnected(true);
        }
      } catch (err) {
        console.warn("Could not load remote messages:", err);
      }
    }

    loadMessages();
  }, [activeChannelId]);

  // 3. Supabase Realtime Subscription
  useEffect(() => {
    const channel = supabase
      .channel("realtime-messages-stream")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newMsg = payload.new as any;
          if (newMsg && newMsg.channel_id) {
            const formatted: Message = {
              id: newMsg.id,
              channelId: newMsg.channel_id,
              sender: {
                id: newMsg.sender_id || `user-anon`,
                name: newMsg.sender_name || "Colleague",
                email: "colleague@kaelixo.com",
                avatar: newMsg.sender_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(newMsg.sender_name || "team")}`,
                role: (newMsg.sender_role as any) || "member",
                department: (newMsg.sender_department as any) || "dev",
                status: "online",
              },
              content: newMsg.content,
              createdAt: new Date(newMsg.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              reactions: [],
            };

            setMessagesByChannel((prev) => {
              const currentList = prev[newMsg.channel_id] || [];
              if (currentList.some((m) => m.id === newMsg.id)) return prev;

              // Play chime for incoming messages from others
              if (newMsg.sender_name !== currentUser.name) {
                playChime();
              }

              return {
                ...prev,
                [newMsg.channel_id]: [...currentList, formatted],
              };
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsLiveConnected(true);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser.name]);

  const activeChannel =
    channels.find((c) => c.id === activeChannelId) || channels[0] || INITIAL_CHANNELS[0];
  const activeMessages = messagesByChannel[activeChannelId] || [];

  const handleSendMessage = async (content: string) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const localId = `msg-${Date.now()}`;

    const newMessage: Message = {
      id: localId,
      channelId: activeChannelId,
      sender: currentUser,
      content,
      createdAt: timeString,
      reactions: [],
    };

    // Optimistic UI update
    setMessagesByChannel((prev) => ({
      ...prev,
      [activeChannelId]: [...(prev[activeChannelId] || []), newMessage],
    }));

    // Insert into Supabase
    try {
      await supabase.from("messages").insert({
        channel_id: activeChannelId,
        content,
        sender_name: currentUser.name,
        sender_avatar: currentUser.avatar,
        sender_role: currentUser.role,
        sender_department: currentUser.department,
      });
      setIsLiveConnected(true);
    } catch (e) {
      console.warn("Message stored in local session:", e);
    }
  };

  const handleAddReaction = (messageId: string, emoji: string) => {
    setMessagesByChannel((prev) => {
      const currentList = prev[activeChannelId] || [];
      const updatedList = currentList.map((msg) => {
        if (msg.id !== messageId) return msg;

        const existingReactionIndex = msg.reactions.findIndex((r) => r.emoji === emoji);
        let updatedReactions = [...msg.reactions];

        if (existingReactionIndex > -1) {
          const reaction = updatedReactions[existingReactionIndex];
          const hasUser = reaction.users.includes(currentUser.id);

          if (hasUser) {
            const newUsers = reaction.users.filter((id) => id !== currentUser.id);
            if (newUsers.length === 0) {
              updatedReactions = updatedReactions.filter((r) => r.emoji !== emoji);
            } else {
              updatedReactions[existingReactionIndex] = {
                ...reaction,
                count: reaction.count - 1,
                users: newUsers,
              };
            }
          } else {
            updatedReactions[existingReactionIndex] = {
              ...reaction,
              count: reaction.count + 1,
              users: [...reaction.users, currentUser.id],
            };
          }
        } else {
          updatedReactions.push({
            emoji,
            count: 1,
            users: [currentUser.id],
          });
        }

        return { ...msg, reactions: updatedReactions };
      });

      return { ...prev, [activeChannelId]: updatedList };
    });
  };

  const handleCreateChannel = async (data: {
    name: string;
    topic: string;
    departmentCode: DepartmentCode;
    isPrivate: boolean;
  }) => {
    const localId = `chan-${Date.now()}`;
    const newChannel: Channel = {
      id: localId,
      name: data.name,
      topic: data.topic || "Discussion channel",
      departmentCode: data.departmentCode,
      isPrivate: data.isPrivate,
    };

    setChannels((prev) => [...prev, newChannel]);
    setActiveChannelId(newChannel.id);
    setMessagesByChannel((prev) => ({
      ...prev,
      [newChannel.id]: [
        {
          id: `msg-init-${Date.now()}`,
          channelId: newChannel.id,
          sender: currentUser,
          content: `🎉 #${data.name} ചാനൽ ആരംഭിച്ചു! ${data.topic ? `**ഉദ്ദേശ്യം:** ${data.topic}` : ""}`,
          createdAt: "Just now",
          reactions: [{ emoji: "🎉", count: 1, users: [currentUser.id] }],
        },
      ],
    }));

    // Save to Supabase
    try {
      const deptId = data.departmentCode !== "all" ? CODE_TO_DEPT_ID[data.departmentCode] : null;
      await supabase.from("channels").insert({
        organization_id: "11111111-1111-1111-1111-111111111111",
        department_id: deptId,
        name: data.name,
        topic: data.topic,
        is_private: data.isPrivate,
      });
      setIsLiveConnected(true);
    } catch (err) {
      console.warn("Saved channel locally:", err);
    }
  };

  return (
    <div className="flex h-screen bg-white dark:bg-neutral-950 overflow-hidden font-sans antialiased text-neutral-900 dark:text-neutral-100">
      {/* Sidebar */}
      <Sidebar
        departments={DEPARTMENTS}
        selectedDepartment={selectedDepartment}
        onSelectDepartment={setSelectedDepartment}
        channels={channels}
        activeChannelId={activeChannelId}
        onSelectChannel={setActiveChannelId}
        teamMembers={TEAM_MEMBERS}
        currentUser={currentUser}
        onOpenNewChannelModal={() => setIsNewChannelModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Main Chat Stage */}
      <main className="flex-1 flex flex-col h-screen min-w-0 bg-white dark:bg-neutral-950">
        {/* Top Channel Header */}
        <header className="h-16 px-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between flex-shrink-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="flex items-center space-x-2">
              {activeChannel.isPrivate ? (
                <Lock className="w-4 h-4 text-neutral-400" />
              ) : (
                <Hash className="w-5 h-5 text-neutral-400" />
              )}
              <h2 className="font-bold text-base text-neutral-900 dark:text-white tracking-tight truncate">
                {activeChannel.name}
              </h2>
            </div>

            {/* Department Badge */}
            {activeChannel.departmentCode && activeChannel.departmentCode !== "all" && (
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40">
                {activeChannel.departmentCode}
              </span>
            )}

            {/* Topic preview */}
            {activeChannel.topic && (
              <span className="text-xs text-neutral-400 border-l border-neutral-200 dark:border-neutral-800 pl-3 truncate max-w-md hidden md:inline">
                {activeChannel.topic}
              </span>
            )}
          </div>

          {/* Header Action Tools */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Live Supabase Connection Badge */}
            <div
              className={`flex items-center space-x-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border ${
                isLiveConnected
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50"
                  : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50"
              }`}
            >
              <Radio
                className={`w-3 h-3 ${
                  isLiveConnected ? "text-emerald-500 animate-pulse" : "text-indigo-500"
                }`}
              />
              <span>{isLiveConnected ? "Supabase Live" : "Connected"}</span>
            </div>

            {/* User Profile Switch Button */}
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center space-x-1 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200/80 px-2.5 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 transition"
              title="Change your display name or department"
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">{currentUser.name.split(" ")[0]}</span>
            </button>

            <button
              onClick={() => setShowRightDrawer(!showRightDrawer)}
              title="Channel Details"
              className={`p-2 rounded-xl transition ${
                showRightDrawer
                  ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400"
                  : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900"
              }`}
            >
              <PanelRight className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Specialized Department Quick Actions Bar */}
        <DepartmentToolbar
          departmentCode={activeChannel.departmentCode}
          onApplyTemplate={(text) => setExternalTemplateText(text)}
        />

        {/* Scrollable Message List */}
        <MessageFeed
          messages={activeMessages}
          currentUser={currentUser}
          onAddReaction={handleAddReaction}
        />

        {/* Input Composer */}
        <ChatInput
          channelName={activeChannel.name}
          onSendMessage={handleSendMessage}
          externalText={externalTemplateText}
          onClearExternalText={() => setExternalTemplateText("")}
        />
      </main>

      {/* Right Drawer (Channel Details & Members) */}
      {showRightDrawer && (
        <aside className="w-80 border-l border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 p-5 flex flex-col h-screen overflow-y-auto">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
            <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
              ചാനൽ വിവരങ്ങൾ (About)
            </h3>
            <button
              onClick={() => setShowRightDrawer(false)}
              className="text-neutral-400 hover:text-neutral-600 text-xs font-semibold"
            >
              Close
            </button>
          </div>

          <div className="py-4 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                ഉദ്ദേശ്യം (Topic)
              </p>
              <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                {activeChannel.topic || "No topic set for this channel"}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                ഡിപ്പാർട്ട്മെന്റ് (Department)
              </p>
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 capitalize">
                {activeChannel.departmentCode || "Company Wide"}
              </p>
            </div>

            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  അംഗങ്ങൾ (Members - {TEAM_MEMBERS.length})
                </span>
              </div>

              <div className="space-y-2">
                {TEAM_MEMBERS.map((m) => (
                  <div key={m.id} className="flex items-center space-x-2.5">
                    <img
                      src={m.avatar}
                      alt={m.name}
                      className="w-6 h-6 rounded-lg bg-neutral-200 dark:bg-neutral-800"
                    />
                    <div className="truncate">
                      <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">
                        {m.name}
                      </p>
                      <p className="text-[10px] text-neutral-400 capitalize">
                        {m.role} • {m.department}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* New Channel Modal */}
      <NewChannelModal
        isOpen={isNewChannelModalOpen}
        onClose={() => setIsNewChannelModalOpen(false)}
        departments={DEPARTMENTS}
        onCreateChannel={handleCreateChannel}
      />

      {/* Auth & Profile Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        departments={DEPARTMENTS}
        currentUser={currentUser}
        onSaveProfile={handleSaveProfile}
      />
    </div>
  );
}
