"use client";

import React from "react";
import { Message, WorkspaceMember } from "@/types";
import { Pin, MessageSquare, Smile, MoreHorizontal, Check } from "lucide-react";

interface MessageFeedProps {
  messages: Message[];
  currentUser: WorkspaceMember;
  onAddReaction: (messageId: string, emoji: string) => void;
}

export function MessageFeed({
  messages,
  currentUser,
  onAddReaction,
}: MessageFeedProps) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const commonEmojis = ["❤️", "👍", "🚀", "🔥", "👏", "🎯"];

  const renderRoleBadge = (role: string, department: string) => {
    let color = "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300";
    if (role === "owner") color = "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800/40";
    else if (role === "manager") color = "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/40";

    return (
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${color} uppercase tracking-wider`}>
        {role} • {department}
      </span>
    );
  };

  // Simple Markdown formatter for bold, code blocks, lists
  const formatContent = (content: string) => {
    // Check for code blocks
    if (content.includes("```")) {
      const parts = content.split("```");
      return parts.map((part, index) => {
        if (index % 2 === 1) {
          // This is a code block
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
          // Check for bold text **text**
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
    <div className="flex-1 overflow-y-auto px-3 md:px-6 py-4 md:py-6 space-y-4 md:space-y-5 custom-scrollbar">
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center text-neutral-400 py-16">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-neutral-800 flex items-center justify-center text-indigo-500 mb-3 text-2xl">
            💬
          </div>
          <h3 className="font-semibold text-neutral-700 dark:text-neutral-200">സംഭാഷണങ്ങൾ ആരംഭിച്ചിട്ടില്ല</h3>
          <p className="text-xs text-neutral-500 max-w-sm mt-1">
            ഈ ചാനലിൽ ആദ്യത്തെ മെസ്സേജ് അയച്ച് ടീമുമായി ആശയവിനിമയം ആരംഭിക്കുക!
          </p>
        </div>
      ) : (
        messages.map((msg) => {
          const isCurrentUser = msg.sender.id === currentUser.id;

          return (
            <div
              key={msg.id}
              className={`group relative flex items-start space-x-3.5 p-3 rounded-2xl transition hover:bg-neutral-100/70 dark:hover:bg-neutral-900/60 ${
                msg.isPinned ? "bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30" : ""
              }`}
            >
              {/* Avatar */}
              <div className="flex-shrink-0 mt-0.5">
                <img
                  src={msg.sender.avatar}
                  alt={msg.sender.name}
                  className="w-10 h-10 rounded-xl bg-neutral-200 dark:bg-neutral-800 object-cover ring-1 ring-neutral-300 dark:ring-neutral-700"
                />
              </div>

              {/* Message Content */}
              <div className="flex-1 min-w-0">
                {/* Header (Sender, Badge, Timestamp) */}
                <div className="flex items-center space-x-2.5 mb-1 flex-wrap">
                  <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                    {msg.sender.name}
                  </span>
                  {renderRoleBadge(msg.sender.role, msg.sender.department)}
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
                <div className="text-sm text-neutral-800 dark:text-neutral-200 text-pretty">
                  {formatContent(msg.content)}
                </div>

                {/* Reactions list */}
                {msg.reactions && msg.reactions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {msg.reactions.map((reaction, i) => {
                      const hasReacted = reaction.users.includes(currentUser.id);
                      return (
                        <button
                          key={i}
                          onClick={() => onAddReaction(msg.id, reaction.emoji)}
                          className={`flex items-center space-x-1 px-2 py-0.5 rounded-lg text-xs font-medium transition ${
                            hasReacted
                              ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700"
                              : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700/60"
                          }`}
                        >
                          <span>{reaction.emoji}</span>
                          <span className="text-[11px]">{reaction.count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Thread reply count if any */}
                {msg.threadCount && msg.threadCount > 0 && (
                  <div className="mt-2 flex items-center space-x-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline cursor-pointer">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{msg.threadCount} replies in thread</span>
                  </div>
                )}
              </div>

              {/* Hover Quick Action Bar */}
              <div className="absolute top-2 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-md rounded-xl p-1">
                {commonEmojis.slice(0, 3).map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => onAddReaction(msg.id, emoji)}
                    className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg text-sm transition"
                    title={`React with ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
                <button
                  onClick={() => handleCopy(msg.id, msg.content)}
                  className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition"
                  title="Copy message"
                >
                  {copiedId === msg.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <MoreHorizontal className="w-3.5 h-3.5" />
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
