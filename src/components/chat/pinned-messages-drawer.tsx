"use client";

import React from "react";
import { Message, WorkspaceMember } from "@/types";
import { Pin, PinOff, X, ArrowUpRight, MessageSquare } from "lucide-react";
import { AttachmentPreview } from "./attachment-preview";

export interface PinnedMessagesDrawerProps {
  channelName: string;
  isDm?: boolean;
  pinnedMessages: Message[];
  currentUser: WorkspaceMember;
  onClose: () => void;
  onUnpin: (messageId: string) => void;
  onJumpToMessage: (messageId: string) => void;
}

export function PinnedMessagesDrawer({
  channelName,
  isDm = false,
  pinnedMessages,
  currentUser: _currentUser,
  onClose,
  onUnpin,
  onJumpToMessage,
}: PinnedMessagesDrawerProps) {
  // Sort reverse-chronologically by pinnedAt (fallback to createdAt)
  const sortedPinnedMessages = [...pinnedMessages].sort((a, b) => {
    const timeA = a.pinnedAt ? new Date(a.pinnedAt).getTime() : new Date(a.createdAt).getTime();
    const timeB = b.pinnedAt ? new Date(b.pinnedAt).getTime() : new Date(b.createdAt).getTime();
    return timeB - timeA;
  });

  return (
    <aside className="w-80 md:w-96 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col h-screen z-30 shadow-xl flex-shrink-0 animate-in slide-in-from-right duration-200">
      {/* Drawer Header */}
      <div className="h-16 px-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between flex-shrink-0 bg-neutral-50/70 dark:bg-neutral-900/80">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800/50">
            <Pin className="w-4 h-4 fill-amber-500" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-sm text-neutral-900 dark:text-white truncate">
                Pinned Messages
              </h3>
              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                {pinnedMessages.length}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 truncate">
              {isDm ? `@${channelName}` : `#${channelName}`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
          title="Close drawer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Pinned Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
        {sortedPinnedMessages.length === 0 ? (
          /* Empty State */
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-400">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 flex items-center justify-center text-amber-500 mb-4 shadow-xs">
              <Pin className="w-8 h-8 text-amber-400 stroke-1" />
            </div>
            <h4 className="font-semibold text-sm text-neutral-800 dark:text-neutral-200">
              No pinned messages yet
            </h4>
            <p className="text-xs text-neutral-500 max-w-xs mt-1.5 leading-relaxed">
              Keep important announcements, documents, and messages easily accessible for everyone in this{" "}
              {isDm ? "chat" : "channel"}.
            </p>
            <div className="mt-4 px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-700/50 text-[11px] text-neutral-500 flex items-center space-x-1.5">
              <span>💡</span>
              <span>Hover over any message and click the pin icon.</span>
            </div>
          </div>
        ) : (
          /* Pinned Message Cards */
          sortedPinnedMessages.map((msg) => {
            const senderName = msg.sender?.name || msg.senderName || "Colleague";
            const senderAvatar =
              msg.sender?.avatar ||
              msg.senderAvatar ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(senderName)}`;

            return (
              <div
                key={msg.id}
                className="group p-3.5 rounded-2xl bg-neutral-50/80 dark:bg-neutral-800/40 border border-amber-200/60 dark:border-amber-900/40 hover:border-amber-300 dark:hover:border-amber-800 transition duration-150 relative space-y-2.5"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <img
                      src={senderAvatar}
                      alt={senderName}
                      className="w-7 h-7 rounded-lg bg-neutral-200 dark:bg-neutral-700 object-cover flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100 truncate">
                          {senderName}
                        </span>
                        <span className="text-[10px] text-neutral-400 flex-shrink-0">
                          {msg.createdAt}
                        </span>
                      </div>
                      {msg.pinnedByName && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center space-x-1">
                          <Pin className="w-2.5 h-2.5 fill-amber-500" />
                          <span>Pinned by {msg.pinnedByName.split(" ")[0]}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions: Jump-To & Unpin */}
                  <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition">
                    <button
                      type="button"
                      onClick={() => onJumpToMessage(msg.id)}
                      className="p-1 rounded-lg text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-neutral-700 transition cursor-pointer"
                      title="Jump to message in feed"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onUnpin(msg.id)}
                      className="p-1 rounded-lg text-neutral-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-neutral-700 transition cursor-pointer"
                      title="Unpin message"
                    >
                      <PinOff className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Message Body */}
                {msg.content && (
                  <p className="text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>
                )}

                {/* Attachments if present */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="pt-1">
                    <AttachmentPreview attachments={msg.attachments} />
                  </div>
                )}

                {/* Footer metadata (Thread replies count) */}
                {msg.threadCount && msg.threadCount > 0 && (
                  <div className="flex items-center space-x-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium pt-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>
                      {msg.threadCount} {msg.threadCount === 1 ? "reply" : "replies"}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
