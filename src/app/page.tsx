"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { DepartmentToolbar } from "@/components/chat/department-toolbar";
import { MessageFeed } from "@/components/chat/message-feed";
import { ChatInput } from "@/components/chat/chat-input";
import { NewChannelModal } from "@/components/modals/new-channel-modal";
import {
  DEPARTMENTS,
  CURRENT_USER,
  TEAM_MEMBERS,
  INITIAL_CHANNELS,
  INITIAL_MESSAGES,
} from "@/lib/mock-data";
import { DepartmentCode, Channel, Message, WorkspaceMember } from "@/types";
import {
  Hash,
  Lock,
  Users,
  Search,
  Bell,
  PanelRight,
  Sparkles,
  Info,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function KaelixoApp() {
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentCode>("all");
  const [channels, setChannels] = useState<Channel[]>(INITIAL_CHANNELS);
  const [activeChannelId, setActiveChannelId] = useState<string>("chan-announcements");
  const [messagesByChannel, setMessagesByChannel] = useState<Record<string, Message[]>>(INITIAL_MESSAGES);
  const [isNewChannelModalOpen, setIsNewChannelModalOpen] = useState(false);
  const [externalTemplateText, setExternalTemplateText] = useState("");
  const [showRightDrawer, setShowRightDrawer] = useState(false);

  const activeChannel = channels.find((c) => c.id === activeChannelId) || channels[0];
  const activeMessages = messagesByChannel[activeChannelId] || [];

  // Listen to Supabase Realtime if keys are provided in .env.local
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes("placeholder")) return;

    try {
      const supabase = createClient();
      const channel = supabase
        .channel("realtime-messages")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          (payload) => {
            console.log("New realtime message received:", payload);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.error("Supabase Realtime subscription error:", err);
    }
  }, []);

  const handleSendMessage = (content: string) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      channelId: activeChannelId,
      sender: CURRENT_USER,
      content,
      createdAt: timeString,
      reactions: [],
    };

    setMessagesByChannel((prev) => ({
      ...prev,
      [activeChannelId]: [...(prev[activeChannelId] || []), newMessage],
    }));
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
          const hasUser = reaction.users.includes(CURRENT_USER.id);

          if (hasUser) {
            // Remove user reaction
            const newUsers = reaction.users.filter((id) => id !== CURRENT_USER.id);
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
            // Add user reaction
            updatedReactions[existingReactionIndex] = {
              ...reaction,
              count: reaction.count + 1,
              users: [...reaction.users, CURRENT_USER.id],
            };
          }
        } else {
          // New reaction emoji
          updatedReactions.push({
            emoji,
            count: 1,
            users: [CURRENT_USER.id],
          });
        }

        return { ...msg, reactions: updatedReactions };
      });

      return { ...prev, [activeChannelId]: updatedList };
    });
  };

  const handleCreateChannel = (data: {
    name: string;
    topic: string;
    departmentCode: DepartmentCode;
    isPrivate: boolean;
  }) => {
    const newChannel: Channel = {
      id: `chan-${Date.now()}`,
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
          sender: CURRENT_USER,
          content: `🎉 #${data.name} ചാനൽ ആരംഭിച്ചു! ${data.topic ? `**ഉദ്ദേശ്യം:** ${data.topic}` : ""}`,
          createdAt: "Just now",
          reactions: [{ emoji: "🎉", count: 1, users: [CURRENT_USER.id] }],
        },
      ],
    }));
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
        currentUser={CURRENT_USER}
        onOpenNewChannelModal={() => setIsNewChannelModalOpen(true)}
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
            <div className="hidden sm:flex items-center text-xs text-neutral-500 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-1.5 space-x-2">
              <Search className="w-3.5 h-3.5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search messages..."
                className="bg-transparent focus:outline-none w-32 text-xs"
              />
            </div>

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
          currentUser={CURRENT_USER}
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
    </div>
  );
}
