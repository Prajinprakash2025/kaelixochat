"use client";

import React, { useState } from "react";
import { Message, WorkspaceMember, reactionsMapToArray } from "@/types";
import { Pin, MessageSquare, MoreHorizontal, Check, SmilePlus, Pencil, Trash2 } from "lucide-react";
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
}: MessageFeedProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeHoverPickerId, setActiveHoverPickerId] = useState<string | null>(null);
  const [activeChipPickerId, setActiveChipPickerId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickEmojis = ["👍", "❤️", "😂", "🎉", "🚀"];

  const renderRoleBadge = (role?: string, department?: string) => {
    if (!role) return null;
    let color = "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300";
    if (role === "owner")
      color =
        "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800/40";
    else if (role === "manager" || role === "admin")
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

  // Simple Markdown formatter for bold, code blocks, lists
  const formatContent = (content: string) => {
    if (!content) return null;

    // Check for code blocks
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
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5 custom-scrollbar">
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
          const senderName = msg.sender?.name || msg.senderName || "Colleague";
          const senderAvatar =
            msg.sender?.avatar ||
            msg.senderAvatar ||
            `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(senderName)}`;
          const senderRole = msg.sender?.role || msg.senderRole;
          const senderDepartment = msg.sender?.department || msg.senderDepartment;

          const isHoverBarPickerOpen = activeHoverPickerId === msg.id;
          const isChipPickerOpen = activeChipPickerId === msg.id;
          const reactionList = reactionsMapToArray(msg.reactions);

          return (
            <div
              key={msg.id}
              className={`group relative flex items-start space-x-3.5 p-3 rounded-2xl transition hover:bg-neutral-100/70 dark:hover:bg-neutral-900/60 ${
                msg.isPinned
                  ? "bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30"
                  : ""
              }`}
            >
              {/* Avatar */}
              <div className="flex-shrink-0 mt-0.5">
                <img
                  src={senderAvatar}
                  alt={senderName}
                  className="w-10 h-10 rounded-xl bg-neutral-200 dark:bg-neutral-800 object-cover ring-1 ring-neutral-300 dark:ring-neutral-700"
                />
              </div>

              {/* Message Content */}
              <div className="flex-1 min-w-0">
                {/* Header (Sender, Badge, Timestamp) */}
                <div className="flex items-center space-x-2.5 mb-1 flex-wrap">
                  <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                    {senderName}
                  </span>
                  {renderRoleBadge(senderRole, senderDepartment)}
                  <span className="text-[11px] text-neutral-400">
                    {msg.createdAt}
                  </span>
                  {msg.isPinned && (
                    <span className="flex items-center space-x-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                      <Pin className="w-3 h-3 fill-amber-500" />
                      <span>Pinned</span>
                    </span>
                  )}
                </div>

                {/* Body Text */}
                {editingMessageId === msg.id ? (
                  <div className="mt-1 space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full text-sm p-2 rounded-xl border border-indigo-400 dark:border-indigo-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      rows={2}
                    />
                    <div className="flex items-center space-x-2 text-xs">
                      <button
                        onClick={() => {
                          if (onEditMessage && editContent.trim()) {
                            onEditMessage(msg.id, editContent.trim());
                          }
                          setEditingMessageId(null);
                        }}
                        className="px-3 py-1 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 transition cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingMessageId(null)}
                        className="px-3 py-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  msg.content && msg.content.trim() && (
                    <div className="text-sm text-neutral-800 dark:text-neutral-200 text-pretty">
                      {formatContent(msg.content)}
                    </div>
                  )
                )}

                {/* Attachments (Feature 7) */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <AttachmentPreview attachments={msg.attachments} />
                )}

                {/* Reactions list & inline add reaction button (Feature 11) */}
                {(reactionList.length > 0 || isChipPickerOpen) && (
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

                {/* Thread reply count if any */}
                {msg.threadCount && msg.threadCount > 0 && (
                  <div
                    onClick={() => onOpenThread?.(msg)}
                    className="mt-2 flex items-center space-x-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{msg.threadCount} {msg.threadCount === 1 ? "reply" : "replies"} in thread</span>
                  </div>
                )}
              </div>

              {/* Floating Message Hover Action Bar (Feature 10) */}
              <div
                className={`absolute -top-3.5 right-4 z-20 flex items-center space-x-0.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-md rounded-xl p-0.5 transition-opacity ${
                  isHoverBarPickerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 group-hover:opacity-100"
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

                {/* Pin / Unpin Action */}
                <button
                  type="button"
                  onClick={() => onTogglePin?.(msg.id, !!msg.isPinned)}
                  className={`p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition cursor-pointer ${
                    msg.isPinned ? "text-amber-500" : "text-neutral-500 hover:text-amber-500"
                  }`}
                  title={msg.isPinned ? "Unpin message" : "Pin message"}
                >
                  <Pin className={`w-4 h-4 ${msg.isPinned ? "fill-amber-500" : ""}`} />
                </button>

                {/* Edit & Delete Actions (for author) */}
                {(msg.sender.id === currentUser.id || msg.sender.name === currentUser.name) && (
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
                      onClick={() => onDeleteMessage?.(msg.id)}
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
            </div>
          );
        })
      )}
    </div>
  );
}
