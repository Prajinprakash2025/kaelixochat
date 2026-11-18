"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Play,
  ListPlus,
  Sparkles,
  Radio,
  Flame,
  Music2,
  Check,
  Disc3,
  Volume2,
} from "lucide-react";
import { MusicTrack, WorkspaceMember, Message } from "@/types";
import { SyncedMusicPlayer } from "./synced-music-player";
import { useMusic } from "@/context/music-context";

interface MusicChannelViewProps {
  currentUser: WorkspaceMember;
  messages: Message[];
  onSendMessage: (content: string) => void;
}

export function MusicChannelView({
  currentUser,
  messages,
  onSendMessage,
}: MusicChannelViewProps) {
  const { playTrack, addToQueue, currentTrack } = useMusic();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MusicTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [trendingTracks, setTrendingTracks] = useState<MusicTrack[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load trending and curated tracks on mount
  useEffect(() => {
    fetch("/api/music/search?trending=true")
      .then((res) => res.json())
      .then((data) => {
        if (data.tracks) {
          setTrendingTracks(data.tracks);
        }
      })
      .catch((err) => console.warn("Failed to load trending music:", err));
  }, []);

  // Search handler with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsSearching(true);
      fetch(`/api/music/search?q=${encodeURIComponent(searchQuery.trim())}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.tracks) {
            setSearchResults(data.tracks);
          }
        })
        .catch((err) => console.warn("Search error:", err))
        .finally(() => setIsSearching(false));
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handlePlaySong = (track: MusicTrack) => {
    playTrack(track, 0);
    showToast(`Playing "${track.title}" on all devices!`);
  };

  const handleAddToQueue = (track: MusicTrack) => {
    addToQueue(track);
    showToast(`Added "${track.title}" to queue`);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-neutral-50 dark:bg-neutral-900/40 p-4 md:p-6 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 bg-neutral-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-emerald-500/40 flex items-center space-x-2 text-xs font-semibold animate-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Synced Player */}
      <div className="w-full max-w-4xl mx-auto">
        <SyncedMusicPlayer mode="embedded" />
      </div>

      {/* Search & URL Input Bar */}
      <div className="w-full max-w-4xl mx-auto">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search songs or paste any YouTube link (e.g. Aavesham, Sushin Shyam, Lo-Fi beats)..."
            className="w-full pl-10 pr-24 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
          />
          {isSearching && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Live Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800/60 max-h-80 overflow-y-auto">
            {searchResults.map((track) => (
              <div
                key={track.id}
                className="p-3 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition"
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <img
                    src={track.thumbnail}
                    alt={track.title}
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                      {track.title}
                    </p>
                    <p className="text-xs text-neutral-500 truncate">
                      {track.artist} • {track.durationFormatted}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
                  <button
                    type="button"
                    onClick={() => handlePlaySong(track)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1 transition cursor-pointer shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Play (All Devices)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddToQueue(track)}
                    className="p-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-medium transition cursor-pointer"
                    title="Add to Queue"
                  >
                    <ListPlus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Curated Trending & Lo-Fi Radio Shelf */}
      <div className="w-full max-w-4xl mx-auto space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Flame className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
              Trending In Team & 24/7 Lo-Fi Stations
            </h3>
          </div>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            Zero Ads • 2-Device Synced
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {trendingTracks.map((t) => (
            <div
              key={t.id}
              className={`group p-3 rounded-xl bg-white dark:bg-neutral-900/90 border transition flex items-center space-x-3 cursor-pointer ${
                currentTrack?.id === t.id
                  ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-md"
                  : "border-neutral-200 dark:border-neutral-800/80 hover:border-emerald-500/50 hover:shadow-md"
              }`}
            >
              <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={t.thumbnail}
                  alt={t.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                />
                <button
                  type="button"
                  onClick={() => handlePlaySong(t)}
                  className="absolute inset-0 bg-black/40 group-hover:bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  <Play className="w-4 h-4 text-white fill-current" />
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                  {t.title}
                </p>
                <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                  {t.artist}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {t.durationFormatted}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToQueue(t);
                    }}
                    className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                  >
                    + Queue
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
