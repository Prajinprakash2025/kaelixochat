"use client";

import React, { useState, useMemo } from "react";
import { Search, X, ArrowRight, Paperclip, MessageSquare } from "lucide-react";
import { Message, Channel } from "@/types";

export interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  channels: Channel[];
  messagesByChannel: Record<string, Message[]>;
  onSelectResult: (channelId: string, messageId: string, parentId?: string | null) => void;
}

export function SearchModal({
  isOpen,
  onClose,
  channels,
  messagesByChannel,
  onSelectResult,
}: SearchModalProps) {
  const [query, setQuery] = useState("");

  const channelMap = useMemo(() => {
    const map = new Map<string, Channel>();
    for (const c of channels) {
      map.set(c.id, c);
    }
    return map;
  }, [channels]);

  // Aggregate and search all messages
  const results = useMemo(() => {
    if (!query.trim()) return [];

    const lower = query.toLowerCase().trim();
    const matches: { message: Message; channel: Channel }[] = [];

    for (const [channelId, msgs] of Object.entries(messagesByChannel)) {
      const channel = channelMap.get(channelId);
      if (!channel) continue;

      for (const msg of msgs) {
        const contentMatch = msg.content?.toLowerCase().includes(lower);
        const senderMatch =
          msg.sender?.name?.toLowerCase().includes(lower) ||
          msg.senderName?.toLowerCase().includes(lower);
        const attachmentMatch = msg.attachments?.some((att) =>
          att.name?.toLowerCase().includes(lower)
        );

        if (contentMatch || senderMatch || attachmentMatch) {
          matches.push({ message: msg, channel });
        }
      }
    }

    return matches;
  }, [query, messagesByChannel, channelMap]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[75vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center space-x-3">
          <Search className="w-5 h-5 text-neutral-400 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all messages, attachments, and people..."
            autoFocus
            className="flex-1 bg-transparent text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 px-2 py-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition"
            title="Close Search (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
          {!query.trim() ? (
            <div className="py-14 text-center">
              <Search className="w-10 h-10 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Search messages and attachments
              </p>
              <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
                Type keywords, sender names, or attachment filenames to search across all channels and direct messages.
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                No results found
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                No messages or attachments match &quot;{query}&quot;. Try a different search term.
              </p>
            </div>
          ) : (
            results.map(({ message, channel }) => {
              const senderName = message.senderName || message.sender?.name || "Unknown";
              const senderAvatar =
                message.senderAvatar ||
                message.sender?.avatar ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(senderName)}`;
              const isDm = channel.isDm;
              const locationLabel = isDm
                ? `DM with @${channel.recipientName || channel.name}`
                : `#${channel.name}`;

              return (
                <div
                  key={message.id}
                  onClick={() => {
                    onSelectResult(channel.id, message.id, message.parentId);
                    onClose();
                  }}
                  className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 cursor-pointer transition flex items-start justify-between group"
                >
                  <div className="flex items-start space-x-3 min-w-0 flex-1">
                    <img
                      src={senderAvatar}
                      alt={senderName}
                      className="w-8 h-8 rounded-xl bg-neutral-200 dark:bg-neutral-700 object-cover mt-0.5 flex-shrink-0 ring-1 ring-neutral-300 dark:ring-neutral-750"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 mb-1 flex-wrap">
                        <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100">
                          {senderName}
                        </span>
                        <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200/50 dark:border-indigo-800/50">
                          {locationLabel}
                        </span>
                        {message.parentId && (
                          <span className="inline-flex items-center space-x-1 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded-md">
                            <MessageSquare className="w-2.5 h-2.5" />
                            <span>Thread</span>
                          </span>
                        )}
                        <span className="text-[10px] text-neutral-400">
                          • {message.createdAt}
                        </span>
                      </div>

                      {message.content && (
                        <p className="text-xs text-neutral-700 dark:text-neutral-300 line-clamp-2 leading-relaxed">
                          {message.content}
                        </p>
                      )}

                      {/* Attachment preview tags */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="flex items-center space-x-2 mt-1.5 flex-wrap">
                          {message.attachments.map((att) => (
                            <span
                              key={att.id}
                              className="inline-flex items-center space-x-1 text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded-md border border-neutral-200 dark:border-neutral-700 font-mono"
                            >
                              <Paperclip className="w-3 h-3 text-neutral-400" />
                              <span className="truncate max-w-[140px]">{att.name}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 transition p-1.5 text-indigo-500 self-center">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
