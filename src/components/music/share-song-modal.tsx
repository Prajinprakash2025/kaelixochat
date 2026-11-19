"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Search,
  Send,
  Radio,
  Check,
  Hash,
  Sparkles,
  Music,
  ExternalLink,
} from "lucide-react";
import { MusicTrack, WorkspaceMember, Channel } from "@/types";
import { usePreferences } from "@/context/preferences-context";
import { cleanSongTitle, cleanArtistName } from "./music-channel-view";

interface ShareSongModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: MusicTrack | null;
  currentUser: WorkspaceMember;
  channels: Channel[];
  members: WorkspaceMember[];
  onSendToTarget: (targetChannelId: string, content: string) => Promise<void> | void;
  onSelectChannel?: (channelId: string) => void;
  onSelectDirectMessage?: (member: WorkspaceMember) => void;
}

export function ShareSongModal({
  isOpen,
  onClose,
  track,
  currentUser,
  channels,
  members,
  onSendToTarget,
  onSelectChannel,
  onSelectDirectMessage,
}: ShareSongModalProps) {
  const { currentTheme, resolvedMode } = usePreferences();
  const themeAccent = currentTheme?.accentColor || "#10b981";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTargetId, setSelectedTargetId] = useState<string>("");
  const [customMessage, setCustomMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sentSuccessTarget, setSentSuccessTarget] = useState<string | null>(null);

  // Filter channels (exclude #music)
  const shareableChannels = useMemo(() => {
    return channels.filter((c) => c.name !== "music" && !c.isDm);
  }, [channels]);

  // Filter team members (exclude current user)
  const shareableMembers = useMemo(() => {
    return members.filter(
      (m) =>
        m.id !== currentUser.id &&
        m.name.trim().toLowerCase() !== currentUser.name.trim().toLowerCase()
    );
  }, [members, currentUser]);

  // Filtered lists based on search query
  const filteredChannels = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return shareableChannels;
    return shareableChannels.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.topic && c.topic.toLowerCase().includes(q))
    );
  }, [shareableChannels, searchQuery]);

  const filteredMembers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return shareableMembers;
    return shareableMembers.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.department?.toLowerCase().includes(q) ||
        m.role?.toLowerCase().includes(q)
    );
  }, [shareableMembers, searchQuery]);

  // Auto-select first channel if nothing selected
  React.useEffect(() => {
    if (isOpen && !selectedTargetId && shareableChannels.length > 0) {
      // Prefer general channel if exists
      const gen = shareableChannels.find((c) => c.name === "general");
      setSelectedTargetId(gen ? gen.id : shareableChannels[0].id);
    }
  }, [isOpen, selectedTargetId, shareableChannels]);

  if (!isOpen || !track) return null;

  const cleanTitle = cleanSongTitle(track.title);
  const cleanArtist = cleanArtistName(track.artist);
  const shareUrl = track.url || `https://www.youtube.com/watch?v=${track.id}`;

  const selectedChannel = channels.find((c) => c.id === selectedTargetId);
  const selectedMember = members.find((m) => m.id === selectedTargetId);
  const targetDisplayName = selectedChannel
    ? `#${selectedChannel.name}`
    : selectedMember
    ? `@${selectedMember.name}`
    : "chat";

  const handleSend = async () => {
    if (!selectedTargetId) return;
    setIsSending(true);

    try {
      // Build message payload with rich song info and link
      const userText = customMessage.trim();
      const messageContent = `${userText ? userText + "\n\n" : ""}🎶 [Track] **${cleanTitle}** - ${cleanArtist}\n${shareUrl}`;

      // Dispatch to chat input as well for instant staging if recipient active
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("kaelixo:stage-music-track", { detail: track })
        );
      }

      await onSendToTarget(selectedTargetId, messageContent);

      setSentSuccessTarget(targetDisplayName);

      setTimeout(() => {
        setIsSending(false);
        setCustomMessage("");
        setSentSuccessTarget(null);
        onClose();
      }, 700);
    } catch (err) {
      console.error("Failed to share song:", err);
      setIsSending(false);
    }
  };

  const handleJumpToChat = () => {
    if (selectedChannel && onSelectChannel) {
      onSelectChannel(selectedChannel.id);
    } else if (selectedMember && onSelectDirectMessage) {
      onSelectDirectMessage(selectedMember);
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-neutral-900 border border-neutral-700/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] text-white animate-in zoom-in-95 duration-200"
      >
        {/* Header Bar (WhatsApp / Slack Parity as shown in user screenshot) */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-base font-bold text-white flex items-center space-x-1.5">
              <span>Forward song to</span>
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">
            Interactive Playable
          </span>
        </div>

        {/* Search Input Filter */}
        <div className="p-3 border-b border-neutral-800/70 bg-neutral-950/30">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, channel or @username"
              className="w-full pl-9 pr-3 py-2 bg-neutral-800/80 border border-neutral-700/80 rounded-xl text-sm text-white placeholder-neutral-400 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 p-0.5 text-neutral-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Targets List (Scrollable) */}
        <div className="flex-1 overflow-y-auto divide-y divide-neutral-800/40 p-2 space-y-1">
          {/* Channels Section */}
          {filteredChannels.length > 0 && (
            <div className="py-1">
              <p className="px-3 py-1 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                Channels
              </p>
              {filteredChannels.map((ch) => {
                const isSelected = selectedTargetId === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setSelectedTargetId(ch.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition cursor-pointer text-left ${
                      isSelected
                        ? "bg-neutral-800/90 border border-neutral-600"
                        : "hover:bg-neutral-800/40"
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center flex-shrink-0">
                        <Hash className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {ch.name}
                        </p>
                        <p className="text-[11px] text-neutral-400 truncate">
                          {ch.topic || "Team channel"}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition flex-shrink-0 ml-2 ${
                        isSelected
                          ? "bg-emerald-500 border-emerald-500 text-black"
                          : "border-neutral-600 bg-neutral-800/60"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Direct Messages Section */}
          {filteredMembers.length > 0 && (
            <div className="py-1">
              <p className="px-3 py-1 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                Direct Messages
              </p>
              {filteredMembers.map((m) => {
                const isSelected = selectedTargetId === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedTargetId(m.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition cursor-pointer text-left ${
                      isSelected
                        ? "bg-neutral-800/90 border border-neutral-600"
                        : "hover:bg-neutral-800/40"
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="relative flex-shrink-0">
                        <img
                          src={m.avatar}
                          alt={m.name}
                          className="w-8 h-8 rounded-full object-cover border border-neutral-700"
                        />
                        <span
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-neutral-900 ${
                            m.status === "online" ? "bg-emerald-500" : "bg-neutral-500"
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {m.name}
                        </p>
                        <p className="text-[11px] text-neutral-400 truncate">
                          {m.role || "Member"} • {m.department || "General"}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition flex-shrink-0 ml-2 ${
                        isSelected
                          ? "bg-emerald-500 border-emerald-500 text-black"
                          : "border-neutral-600 bg-neutral-800/60"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {filteredChannels.length === 0 && filteredMembers.length === 0 && (
            <div className="py-8 text-center text-neutral-400 text-sm">
              No matching channels or colleagues found.
            </div>
          )}
        </div>

        {/* Bottom Pinned Preview & Send Bar (Exact match to Image 2) */}
        <div className="p-3.5 bg-neutral-950/80 border-t border-neutral-800 space-y-3">
          {/* Mini Track Preview Chip */}
          <div className="flex items-center space-x-3 p-2 rounded-xl bg-neutral-900 border border-neutral-800 shadow-sm">
            <img
              src={track.thumbnail}
              alt={track.title}
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-neutral-700"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">
                {cleanTitle}
              </p>
              <p className="text-[11px] text-neutral-400 truncate">
                {cleanArtist} • {track.durationFormatted || "3:30"}
              </p>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40 flex-shrink-0">
              Jam Ready
            </span>
          </div>

          {/* Optional Message Composer & Send Button */}
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`Add a message for ${targetDisplayName}... (optional)`}
              className="flex-1 px-3 py-2 bg-neutral-800/90 border border-neutral-700 rounded-xl text-xs sm:text-sm text-white placeholder-neutral-400 focus:outline-hidden focus:border-emerald-500 transition"
            />

            <button
              type="button"
              onClick={handleSend}
              disabled={!selectedTargetId || isSending}
              style={{
                backgroundColor: themeAccent,
              }}
              className="px-4 py-2 rounded-xl text-neutral-950 font-bold text-xs sm:text-sm flex items-center space-x-1.5 transition transform hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-500/20"
              title={`Send to ${targetDisplayName}`}
            >
              {isSending ? (
                <span>Sending...</span>
              ) : sentSuccessTarget ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Sent!</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Send</span>
                </>
              )}
            </button>
          </div>

          {/* Quick jump to chat link */}
          <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
            <span>
              Target: <strong className="text-white">{targetDisplayName}</strong>
            </span>
            <button
              type="button"
              onClick={handleJumpToChat}
              className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center space-x-1 transition cursor-pointer"
            >
              <span>Go to {targetDisplayName}</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
