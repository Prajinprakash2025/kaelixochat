"use client";

import React, { useState, useEffect, useRef } from "react";
import { Message, WorkspaceMember, reactionsMapToArray } from "@/types";
import { Pin, MessageSquare, MoreHorizontal, Check, SmilePlus, Pencil, Trash2, ArrowDown } from "lucide-react";
import { AttachmentPreview } from "./attachment-preview";
import { EmojiPicker } from "./emoji-picker";
import { DeleteMessageModal } from "@/components/modals/delete-message-modal";

interface MessageFeedProps {
  messages: Message[];
  currentUser: WorkspaceMember;
  onAddReaction: (messageId: string, emoji: string) => void;
  members?: WorkspaceMember[];
  onOpenThread?: (message: Message) => void;
  onTogglePin?: (messageId: string, currentPinStatus: boolean) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onOpenProfile?: (member: WorkspaceMember) => void;
  channelId?: string;
}

export function formatReactorsTooltip(
  reaction: { emoji: string; count: number; users: string[]; userNames?: string[] },
  currentUserId: string,
  members: WorkspaceMember[] = []
): string {
  const memberMap = new Map<string, string>();
  for (const m of members) {
    memberMap.set(m.id, m.name.split(" ")[0]);
  }

  const hasYou = reaction.users.includes(currentUserId);
  const otherIds = reaction.users.filter((id) => id !== currentUserId);

  const otherNames = otherIds.map((id) => {
    if (memberMap.has(id)) return memberMap.get(id)!;
    const originalIndex = reaction.users.indexOf(id);
    if (
      reaction.userNames &&
      originalIndex !== -1 &&
      reaction.userNames[originalIndex] &&
      reaction.userNames[originalIndex].trim()
    ) {
      return reaction.userNames[originalIndex].trim();
    }
    if (id.startsWith("user-")) {
      const part = id.replace("user-", "");
      return part.charAt(0).toUpperCase() + part.slice(1);
    }
    return "Someone";
  });

  if (hasYou) {
    if (otherNames.length === 0) return "You reacted";
    if (otherNames.length === 1) return `${otherNames[0]} and you reacted`;
    if (otherNames.length === 2) return `${otherNames[0]}, ${otherNames[1]}, and you reacted`;
    const remaining = otherNames.length - 2;
    const othersLabel = remaining === 1 ? "1 other" : `${remaining} others`;
    return `${otherNames[0]}, ${otherNames[1]}, you, and ${othersLabel} reacted`;
  } else {
    if (otherNames.length === 0) return "Someone reacted";
    if (otherNames.length === 1) return `${otherNames[0]} reacted`;
    if (otherNames.length === 2) return `${otherNames[0]} and ${otherNames[1]} reacted`;
    if (otherNames.length === 3) return `${otherNames[0]}, ${otherNames[1]}, and ${otherNames[2]} reacted`;
    return `${otherNames[0]}, ${otherNames[1]}, and ${otherNames.length - 2} others reacted`;
  }
}

export function formatLastReplyTime(isoString?: string | null): string {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function MessageFeed({
  messages,
  currentUser,
  onAddReaction,
  members = [],
  onOpenThread,
  onTogglePin,
  onEditMessage,
  onDeleteMessage,
  onOpenProfile,
  channelId,
}: MessageFeedProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeHoverPickerId, setActiveHoverPickerId] = useState<string | null>(null);
  const [activeChipPickerId, setActiveChipPickerId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [unreadBelowCount, setUnreadBelowCount] = useState(0);
  const isNearBottomRef = useRef(true);
  const prevChannelIdRef = useRef<string | undefined>(channelId);
  const prevMessagesLengthRef = useRef(messages.length);
  const isInitialMountRef = useRef(true);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
    if (containerRef.current) {
      if (behavior === "auto") {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      } else {
        containerRef.current.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }
    setShowScrollBottom(false);
    setUnreadBelowCount(0);
    isNearBottomRef.current = true;
  };

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const threshold = 120;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isClose = distanceToBottom <= threshold;
    isNearBottomRef.current = isClose;

    if (isClose) {
      setShowScrollBottom(false);
      setUnreadBelowCount(0);
    } else if (distanceToBottom > 200) {
      setShowScrollBottom(true);
    }
  };

  // Scroll to bottom on channel change or initial mount
  useEffect(() => {
    if (isInitialMountRef.current || prevChannelIdRef.current !== channelId) {
      isInitialMountRef.current = false;
      prevChannelIdRef.current = channelId;
      prevMessagesLengthRef.current = messages.length;
      setShowScrollBottom(false);
      setUnreadBelowCount(0);
      isNearBottomRef.current = true;

      const timer = setTimeout(() => {
        scrollToBottom("auto");
      }, 30);
      return () => clearTimeout(timer);
    }

    // New messages added to active channel
    if (messages.length > prevMessagesLengthRef.current) {
      const diff = messages.length - prevMessagesLengthRef.current;
      const lastMessage = messages[messages.length - 1];
      const isSentByMe = Boolean(
        (lastMessage?.senderId && lastMessage.senderId === currentUser.id) ||
        (lastMessage?.sender?.id && lastMessage.sender.id === currentUser.id) ||
        (lastMessage?.senderName && lastMessage.senderName === currentUser.name) ||
        (lastMessage?.sender?.name && lastMessage.sender.name === currentUser.name)
      );

      if (isSentByMe || isNearBottomRef.current) {
        requestAnimationFrame(() => {
          scrollToBottom("smooth");
        });
      } else {
        setShowScrollBottom(true);
        setUnreadBelowCount((c) => c + diff);
      }
    }

    prevMessagesLengthRef.current = messages.length;
  }, [messages, channelId, currentUser]);

  // Keep pinned to bottom when content/images resize if user was already at bottom
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver(() => {
      if (isNearBottomRef.current) {
        el.scrollTop = el.scrollHeight;
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isAuthor = (msg: Message) => {
    return Boolean(
      (msg.senderId && msg.senderId === currentUser.id) ||
      (msg.sender?.id && msg.sender.id === currentUser.id) ||
      (msg.senderName && msg.senderName === currentUser.name) ||
      (msg.sender?.name && msg.sender.name === currentUser.name)
    );
  };

  const quickEmojis = ["👍", "❤️", "😂", "🎉", "🚀"];

  const renderRoleBadge = (role?: string, department?: string) => {
    if (!role) return null;
    let color = "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300";
    if (role === "owner" || role === "Workspace Owner")
      color =
        "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800/40";
    else if (role === "manager" || role === "admin" || role === "Department Head" || role === "Manager")
      color =
        "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/40";

    return (
      <span
        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${color} uppercase tracking-wider`}
      >
        {role} {department ? `• ${department}` : ""}
      </span>
    );
  };

  // Markdown formatter for bold, code blocks, lists
  const formatContent = (content: string) => {
    if (!content) return null;

    if (content.includes("```")) {
      const parts = content.split("```");
      return parts.map((part, index) => {
        if (index % 2 === 1) {
          const lines = part.trim().split("\n");
          const lang = lines[0].match(/^[a-z]+/i) ? lines[0] : "";
          const code = lang ? lines.slice(1).join("\n") : part;
          return (
            <div
              key={index}
              className="my-2.5 rounded-xl bg-neutral-900 border border-neutral-800 p-3.5 font-mono text-xs text-neutral-200 overflow-x-auto shadow-inner"
            >
              {lang && (
                <div className="text-[10px] text-neutral-400 uppercase font-semibold mb-1 pb-1 border-b border-neutral-800">
                  {lang}
                </div>
              )}
              <pre className="whitespace-pre">{code}</pre>
            </div>
          );
        }
        return (
          <p key={index} className="whitespace-pre-wrap leading-relaxed">
            {part}
          </p>
        );
      });
    }

    return (
      <div className="whitespace-pre-wrap leading-relaxed space-y-1">
        {content.split("\n").map((line, i) => {
          const boldFormatted = line.replace(
            /\*\*(.*?)\*\*/g,
            "<strong>$1</strong>"
          );
          return (
            <div
              key={i}
              dangerouslySetInnerHTML={{ __html: boldFormatted }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="relative flex-1 overflow-y-auto px-6 py-6 space-y-5 custom-scrollbar"
    >
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center text-neutral-400 py-16">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-neutral-800 flex items-center justify-center text-indigo-500 mb-3 text-2xl">
            💬
          </div>
          <h3 className="font-semibold text-neutral-700 dark:text-neutral-200">
            No messages yet
          </h3>
          <p className="text-xs text-neutral-500 max-w-sm mt-1">
            Start the conversation by sending the first message to this channel.
          </p>
        </div>
      ) : (
        messages.map((msg) => {
          const senderId = msg.sender?.id || msg.senderId || `user-${msg.id}`;
          const matchedMember = members.find(
            (m) =>
              (m.id && (m.id === senderId || m.id === msg.senderId || m.id === msg.sender?.id)) ||
              (m.name && (m.name === msg.senderName || m.name === msg.sender?.name))
          );
          const senderName = matchedMember?.name || msg.sender?.name || msg.senderName || "Colleague";
          const senderAvatar =
            matchedMember?.avatar ||
            msg.sender?.avatar ||
            msg.senderAvatar ||
            `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(senderName)}`;
          const senderRole = matchedMember?.role || msg.sender?.role || msg.senderRole;
          const senderDepartment = matchedMember?.department || msg.sender?.department || msg.senderDepartment;

          const isHoverBarPickerOpen = activeHoverPickerId === msg.id;
          const isChipPickerOpen = activeChipPickerId === msg.id;
          const reactionList = reactionsMapToArray(msg.reactions);

          return (
            <div
              key={msg.id}
              id={`message-${msg.id}`}
              className={`group relative flex items-start space-x-3.5 p-3 rounded-2xl transition duration-200 hover:bg-neutral-100/70 dark:hover:bg-neutral-900/60 ${
                msg.isPinned
                  ? "bg-amber-50/40 dark:bg-amber-950/20 border-l-4 border-l-amber-500 border-t border-r border-b border-amber-200/50 dark:border-amber-900/30 shadow-xs"
                  : ""
              }`}
            >
              {/* Avatar */}
              <div
                className={`flex-shrink-0 mt-0.5 ${onOpenProfile ? "cursor-pointer group/avatar" : ""}`}
                onClick={() => {
                  if (onOpenProfile) {
                    const profileTarget = matchedMember || members.find((m) => m.id === senderId) || msg.sender || {
                      id: senderId,
                      name: senderName,
                      avatar: senderAvatar,
                      role: senderRole,
                      department: senderDepartment,
                    };
                    onOpenProfile(profileTarget as WorkspaceMember);
                  }
                }}
              >
                <img
                  src={senderAvatar}
                  alt={senderName}
                  className="w-10 h-10 rounded-xl bg-neutral-200 dark:bg-neutral-800 object-cover ring-1 ring-neutral-300 dark:ring-neutral-700 group-hover/avatar:ring-2 group-hover/avatar:ring-indigo-500 transition"
                />
              </div>

              {/* Message Content */}
              <div className="flex-1 min-w-0">
                {/* Header (Sender, Badge, Timestamp, Edited, Pinned) */}
                <div className="flex items-center space-x-2.5 mb-1 flex-wrap">
                  <span
                    onClick={() => {
                      if (onOpenProfile) {
                        const profileTarget = matchedMember || members.find((m) => m.id === senderId) || msg.sender || {
                          id: senderId,
                          name: senderName,
                          avatar: senderAvatar,
                          role: senderRole,
                          department: senderDepartment,
                        };
                        onOpenProfile(profileTarget as WorkspaceMember);
                      }
                    }}
                    className={`font-semibold text-sm text-neutral-900 dark:text-neutral-100 ${
                      onOpenProfile ? "cursor-pointer hover:underline hover:text-indigo-600 dark:hover:text-indigo-400" : ""
                    }`}
                  >
                    {senderName}
                  </span>
                  {renderRoleBadge(senderRole, senderDepartment)}
                  <span className="text-[11px] text-neutral-400">
                    {msg.createdAt}
                  </span>

                  {/* Edited indicator (Feature 16) */}
                  {msg.isEdited && (
                    <span
                      className="text-[11px] text-neutral-400 dark:text-neutral-500 italic select-none"
                      title={
                        msg.editedAt
                          ? `Edited at ${new Date(msg.editedAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`
                          : "Edited"
                      }
                    >
                      (edited)
                    </span>
                  )}

                  {/* Pinned badge (Feature 18) */}
                  {msg.isPinned && (
                    <div
                      className="flex items-center space-x-1 px-1.5 py-0.5 rounded-md bg-amber-100/80 dark:bg-amber-950/70 border border-amber-300/60 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 text-[10px] font-medium"
                      title={
                        msg.pinnedAt
                          ? `Pinned on ${new Date(msg.pinnedAt).toLocaleDateString()} at ${new Date(
                              msg.pinnedAt
                            ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                          : "Pinned message"
                      }
                    >
                      <Pin className="w-2.5 h-2.5 fill-amber-500 text-amber-600 dark:text-amber-400" />
                      <span>
                        Pinned{msg.pinnedByName ? ` by ${msg.pinnedByName.split(" ")[0]}` : ""}
                      </span>
                    </div>
                  )}
                </div>

                {/* Body Text & Inline Editor (Feature 16) & Tombstone (Feature 17) */}
                {editingMessageId === msg.id ? (
                  <div className="mt-1 space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          const trimmed = editContent.trim();
                          if (trimmed || (msg.attachments && msg.attachments.length > 0)) {
                            onEditMessage?.(msg.id, trimmed);
                            setEditingMessageId(null);
                          }
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          setEditingMessageId(null);
                        }
                      }}
                      className="w-full text-sm p-2.5 rounded-xl border border-indigo-400 dark:border-indigo-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                      rows={Math.max(2, editContent.split("\n").length)}
                      autoFocus
                    />
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = editContent.trim();
                            if (trimmed || (msg.attachments && msg.attachments.length > 0)) {
                              onEditMessage?.(msg.id, trimmed);
                            }
                            setEditingMessageId(null);
                          }}
                          disabled={
                            !editContent.trim() &&
                            (!msg.attachments || msg.attachments.length === 0)
                          }
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition cursor-pointer shadow-sm"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingMessageId(null)}
                          className="px-3 py-1 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                      <span className="text-[11px] text-neutral-400 select-none">
                        <kbd className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded text-[10px]">
                          esc
                        </kbd>{" "}
                        to cancel •{" "}
                        <kbd className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded text-[10px]">
                          enter
                        </kbd>{" "}
                        to save
                      </span>
                    </div>
                  </div>
                ) : msg.isDeleted ? (
                  /* Tombstone rendering (Feature 17) */
                  <div className="flex items-center space-x-2 py-1 text-xs text-neutral-400 dark:text-neutral-500 italic">
                    <Trash2 className="w-3.5 h-3.5 opacity-50 flex-shrink-0" />
                    <span>This message was deleted</span>
                  </div>
                ) : (
                  msg.content &&
                  msg.content.trim() && (
                    <div className="text-sm text-neutral-800 dark:text-neutral-200 text-pretty">
                      {formatContent(msg.content)}
                    </div>
                  )
                )}

                {/* Attachments (only if not deleted) */}
                {!msg.isDeleted && msg.attachments && msg.attachments.length > 0 && (
                  <AttachmentPreview attachments={msg.attachments} />
                )}

                {/* Reactions list & inline add reaction button (only if not deleted) */}
                {!msg.isDeleted && (reactionList.length > 0 || isChipPickerOpen) && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                    {reactionList.map((reaction, i) => {
                      const hasReacted = reaction.users.includes(currentUser.id);
                      const tooltipText = formatReactorsTooltip(reaction, currentUser.id, members);

                      return (
                        <div key={i} className="relative group/chip">
                          <button
                            type="button"
                            onClick={() => onAddReaction(msg.id, reaction.emoji)}
                            className={`flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium transition cursor-pointer ${
                              hasReacted
                                ? "bg-indigo-50 border border-indigo-300 text-indigo-700 dark:bg-indigo-950/70 dark:border-indigo-600 dark:text-indigo-200 ring-1 ring-indigo-400/30 font-semibold"
                                : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700"
                            }`}
                          >
                            <span>{reaction.emoji}</span>
                            <span className="text-[11px]">{reaction.count}</span>
                          </button>

                          {/* Reactor Tooltip */}
                          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/chip:flex flex-col items-center z-30">
                            <div className="bg-neutral-900 text-white dark:bg-neutral-800 dark:border dark:border-neutral-700 text-[11px] font-medium px-2.5 py-1 rounded-md shadow-lg whitespace-nowrap">
                              <span className="mr-1">{reaction.emoji}</span>
                              {tooltipText}
                            </div>
                            <div className="w-1.5 h-1.5 bg-neutral-900 dark:bg-neutral-800 rotate-45 -mt-0.5" />
                          </div>
                        </div>
                      );
                    })}

                    {/* Compact inline Add Reaction button */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setActiveChipPickerId(isChipPickerOpen ? null : msg.id)}
                        className="flex items-center justify-center w-6 h-6 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-xs transition cursor-pointer border border-dashed border-neutral-300 dark:border-neutral-700"
                        title="Add reaction"
                      >
                        <SmilePlus className="w-3.5 h-3.5" />
                      </button>
                      {isChipPickerOpen && (
                        <div className="absolute left-0 bottom-full mb-2 z-40">
                          <EmojiPicker
                            onSelectEmoji={(emoji) => {
                              onAddReaction(msg.id, emoji);
                              setActiveChipPickerId(null);
                            }}
                            onClose={() => setActiveChipPickerId(null)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Thread Parent Feed Indicator Badge (Feature 14) */}
                {Boolean(msg.threadCount && msg.threadCount > 0) && (
                  <button
                    type="button"
                    onClick={() => onOpenThread?.(msg)}
                    className="mt-2.5 inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-indigo-50/80 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/60 transition group/thread cursor-pointer text-left"
                    title="Open thread replies"
                  >
                    <div className="flex items-center space-x-1.5 text-indigo-600 dark:text-indigo-400">
                      <MessageSquare className="w-3.5 h-3.5 group-hover/thread:scale-110 transition-transform" />
                      <span className="text-xs font-semibold">
                        {msg.threadCount} {msg.threadCount === 1 ? "reply" : "replies"}
                      </span>
                    </div>

                    {msg.lastReplyAt && (
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-normal border-l border-indigo-200 dark:border-indigo-800 pl-2">
                        Last reply {formatLastReplyTime(msg.lastReplyAt)}
                      </span>
                    )}

                    <span className="text-[10px] text-indigo-500 font-medium opacity-0 group-hover/thread:opacity-100 transition-opacity ml-1">
                      View thread →
                    </span>
                  </button>
                )}
              </div>

              {/* Floating Message Hover Action Bar (Feature 10) */}
              {!msg.isDeleted && (
                <div
                  className={`absolute -top-3.5 right-4 z-20 flex items-center space-x-0.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-md rounded-xl p-0.5 transition-opacity ${
                    isHoverBarPickerOpen
                      ? "opacity-100 pointer-events-auto"
                      : "opacity-0 group-hover:opacity-100"
                  }`}
                >
                  {/* 5 Quick Emojis */}
                  {quickEmojis.map((emoji) => {
                    const hasReacted = reactionList.some(
                      (r) => r.emoji === emoji && r.users.includes(currentUser.id)
                    );
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => onAddReaction(msg.id, emoji)}
                        className={`p-1 rounded-lg text-sm transition cursor-pointer ${
                          hasReacted
                            ? "bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300"
                            : "hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
                        }`}
                        title={`React with ${emoji}`}
                      >
                        {emoji}
                      </button>
                    );
                  })}

                  {/* Full Emoji Picker Trigger (SmilePlus) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveHoverPickerId(isHoverBarPickerOpen ? null : msg.id)}
                      className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg text-neutral-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
                      title="Add Reaction"
                    >
                      <SmilePlus className="w-4 h-4" />
                    </button>
                    {isHoverBarPickerOpen && (
                      <div className="absolute right-0 top-full mt-1.5 z-40">
                        <EmojiPicker
                          align="right"
                          onSelectEmoji={(emoji) => {
                            onAddReaction(msg.id, emoji);
                            setActiveHoverPickerId(null);
                          }}
                          onClose={() => setActiveHoverPickerId(null)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Reply in Thread Action */}
                  <button
                    type="button"
                    onClick={() => onOpenThread?.(msg)}
                    className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg text-neutral-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
                    title="Reply in thread"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>

                  {/* Pin / Unpin Action (Feature 18) */}
                  <button
                    type="button"
                    onClick={() => onTogglePin?.(msg.id, !!msg.isPinned)}
                    className={`p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition cursor-pointer ${
                      msg.isPinned
                        ? "text-amber-500 bg-amber-50 dark:bg-amber-950/50"
                        : "text-neutral-500 hover:text-amber-500"
                    }`}
                    title={msg.isPinned ? "Unpin message" : "Pin message"}
                  >
                    <Pin className={`w-4 h-4 ${msg.isPinned ? "fill-amber-500 text-amber-500" : ""}`} />
                  </button>

                  {/* Edit & Delete Actions (for author only) */}
                  {isAuthor(msg) && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMessageId(msg.id);
                          setEditContent(msg.content);
                        }}
                        className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg text-neutral-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
                        title="Edit message"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setMessageToDelete(msg)}
                        className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg text-neutral-500 hover:text-rose-500 transition cursor-pointer"
                        title="Delete message"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}

                  {/* Copy Button */}
                  <button
                    type="button"
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition cursor-pointer"
                    title="Copy message"
                  >
                    {copiedId === msg.id ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <MoreHorizontal className="w-4 h-4" />
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Auto-scroll Bottom Anchor */}
      <div ref={messagesEndRef} className="h-px w-full pointer-events-none" />

      {/* Floating Slack-grade Scroll to Bottom Pill */}
      {showScrollBottom && (
        <div className="sticky bottom-2 left-0 right-0 flex justify-center z-30 pointer-events-none">
          <button
            type="button"
            onClick={() => scrollToBottom("smooth")}
            className="pointer-events-auto flex items-center space-x-2 px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl text-xs font-semibold cursor-pointer transition-all transform hover:scale-105 active:scale-95 border border-indigo-400/40"
          >
            <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
            <span>
              {unreadBelowCount > 0
                ? `${unreadBelowCount} new ${unreadBelowCount === 1 ? "message" : "messages"}`
                : "Scroll to latest"}
            </span>
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal (Feature 17) */}
      <DeleteMessageModal
        isOpen={Boolean(messageToDelete)}
        message={messageToDelete}
        onClose={() => setMessageToDelete(null)}
        onConfirm={(id) => {
          onDeleteMessage?.(id);
          setMessageToDelete(null);
        }}
      />
    </div>
  );
}
