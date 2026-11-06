"use client";

import React, { useState, useMemo } from "react";
import { Search, X, Hash, MessageSquare, ArrowRight, User } from "lucide-react";
import { Message, Channel } from "@/types";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  channels: Channel[];
  messagesByChannel: Record<string, Message[]>;
  onSelectResult: (channelId: string, messageId: string) => void;
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
        if (
          msg.content.toLowerCase().includes(lower) ||
          msg.sender.name.toLowerCase().includes(lower)
        ) {
          matches.push({ message: msg, channel });
        }
      }
    }

    return matches;
  }, [query, messagesByChannel, channelMap]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[75vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center space-x-3">
          <Search className="w-5 h-5 text-neutral-400 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all messages, files, and channels..."
            autoFocus
            className="flex-1 bg-transparent text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 px-1.5 py-0.5 rounded"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {!query.trim() ? (
            <div className="py-12 text-center text-xs text-neutral-400">
              സന്ദേശങ്ങളോ ഫയലുകളോ തിരയാൻ ഒരു വാക്ക് ടൈപ്പ് ചെയ്യുക
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-400">
              &quot;{query}&quot; എന്ന വാക്കുമായി പൊരുത്തപ്പെടുന്ന മെസ്സേജുകൾ ലഭ്യമല്ല.
            </div>
          ) : (
            results.map(({ message, channel }) => (
              <div
                key={message.id}
                onClick={() => {
                  onSelectResult(channel.id, message.id);
                  onClose();
                }}
                className="p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 cursor-pointer transition flex items-start justify-between group"
              >
                <div className="flex items-start space-x-3 min-w-0 flex-1">
                  <img
                    src={message.sender.avatar}
                    alt={message.sender.name}
                    className="w-8 h-8 rounded-xl bg-neutral-200 dark:bg-neutral-700 object-cover mt-0.5 flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
                        {message.sender.name}
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        in #{channel.name}
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        • {message.createdAt}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-700 dark:text-neutral-300 line-clamp-2 leading-relaxed">
                      {message.content}
                    </p>
                  </div>
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition p-1.5 text-indigo-500">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
