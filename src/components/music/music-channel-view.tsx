"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Play,
  Pause,
  ListPlus,
  Flame,
  Check,
  Disc3,
  Loader2,
  Sparkles,
  Volume2,
  ChevronDown,
} from "lucide-react";
import { MusicTrack, WorkspaceMember, Message } from "@/types";
import { SyncedMusicPlayer } from "./synced-music-player";
import { useMusic } from "@/context/music-context";

interface MusicChannelViewProps {
  currentUser: WorkspaceMember;
  messages: Message[];
  onSendMessage: (content: string) => void;
}

const CATEGORIES = [
  { id: "trending", name: "Trending Now", icon: "🔥" },
  { id: "malayalam", name: "Malayalam Hits", icon: "🌴" },
  { id: "tamil", name: "Tamil Viral", icon: "⚡" },
  { id: "english", name: "English & Pop", icon: "🌍" },
  { id: "lofi", name: "Lo-Fi & Focus", icon: "☕" },
  { id: "hindi", name: "Hindi & Bollywood", icon: "🌙" },
];

export function MusicChannelView({
  currentUser,
  messages,
  onSendMessage,
}: MusicChannelViewProps) {
  const { playTrack, togglePlay, addToQueue, currentTrack, isPlaying, setPlaylist } = useMusic();

  const [activeCategory, setActiveCategory] = useState("trending");
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MusicTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);

  // Fetch Category Songs
  const fetchCategoryTracks = useCallback(
    async (category: string, pageNum: number, append: boolean = false) => {
      if (loadingMoreRef.current) return;
      loadingMoreRef.current = true;
      setIsLoading(true);

      try {
        const res = await fetch(`/api/music/search?category=${category}&page=${pageNum}`);
        const data = await res.json();
        if (data.tracks) {
          if (append) {
            setTracks((prev) => {
              const existingIds = new Set(prev.map((t) => t.id));
              const newTracks = data.tracks.filter((t: MusicTrack) => !existingIds.has(t.id));
              return [...prev, ...newTracks];
            });
          } else {
            setTracks(data.tracks);
          }
          setHasMore(data.hasMore !== false);
        }
      } catch (err) {
        console.warn("Failed to fetch tracks for category:", category, err);
      } finally {
        setIsLoading(false);
        loadingMoreRef.current = false;
      }
    },
    []
  );

  // Reset and load when category changes
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchCategoryTracks(activeCategory, 1, false);
  }, [activeCategory, fetchCategoryTracks]);

  // Load More for infinite scroll
  const handleLoadMore = () => {
    if (isLoading || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchCategoryTracks(activeCategory, nextPage, true);
  };

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
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sync active category tracks to global playlist so Next/Prev navigates seamlessly
  useEffect(() => {
    if (tracks.length > 0) {
      setPlaylist(tracks);
    }
  }, [tracks, setPlaylist]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handlePlaySong = (track: MusicTrack) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      playTrack(track, 0, tracks);
      showToast(`Playing "${track.title}" on all devices!`);
    }
  };

  const handleAddToQueue = (track: MusicTrack) => {
    addToQueue(track);
    showToast(`Added "${track.title}" to shared queue`);
  };

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 flex flex-col h-full overflow-y-auto bg-neutral-50 dark:bg-neutral-900/40 p-4 md:p-6 space-y-6 scrollbar-thin"
    >
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
            placeholder="Search songs or paste any YouTube link (e.g. Aavesham, Anirudh, Taylor Swift, Lo-Fi)..."
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
            {searchResults.map((track) => {
              const isThisPlaying = currentTrack?.id === track.id && isPlaying;
              return (
                <div
                  key={track.id}
                  className="p-3 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition"
                >
                  <div
                    onClick={() => handlePlaySong(track)}
                    className="flex items-center space-x-3 min-w-0 flex-1 cursor-pointer"
                  >
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-800">
                      <img
                        src={track.thumbnail}
                        alt={track.title}
                        className="w-full h-full object-cover"
                      />
                      {isThisPlaying && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        </div>
                      )}
                    </div>
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition cursor-pointer shadow-sm ${
                        isThisPlaying
                          ? "bg-emerald-500 text-neutral-950 font-bold"
                          : "bg-emerald-600 hover:bg-emerald-500 text-white"
                      }`}
                    >
                      {isThisPlaying ? (
                        <Pause className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current" />
                      )}
                      <span>{isThisPlaying ? "Pause" : "Play"}</span>
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
              );
            })}
          </div>
        )}
      </div>

      {/* CATEGORY SELECTOR PILLS */}
      <div className="w-full max-w-4xl mx-auto space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
              Music Categories & Discover
            </h3>
          </div>
          <span className="text-xs text-neutral-500 font-medium">
            Tap category • Endless scroll
          </span>
        </div>

        {/* Scrollable Horizontal Pill Bar */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 flex-shrink-0 cursor-pointer shadow-xs ${
                activeCategory === cat.id
                  ? "bg-emerald-600 text-white shadow-emerald-500/20 scale-102"
                  : "bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300"
              }`}
            >
              <span className="text-base">{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* TRACKS GRID (Endless recommendations) */}
      <div className="w-full max-w-4xl mx-auto space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {tracks.map((t, idx) => {
            const isThisPlaying = currentTrack?.id === t.id && isPlaying;
            return (
              <div
                key={`${t.id}-${idx}`}
                onClick={() => handlePlaySong(t)}
                className={`group p-3 rounded-xl bg-white dark:bg-neutral-900/90 border transition-all duration-200 flex items-center space-x-3 cursor-pointer select-none ${
                  isThisPlaying
                    ? "border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg bg-emerald-500/5 dark:bg-emerald-950/20"
                    : "border-neutral-200 dark:border-neutral-800/80 hover:border-emerald-500/60 hover:shadow-md hover:-translate-y-0.5"
                }`}
              >
                {/* Artwork with Play Hover Overlay */}
                <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 shadow-sm bg-neutral-950">
                  <img
                    src={t.thumbnail}
                    alt={t.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                  />

                  {/* Play / Playing Badge */}
                  <div
                    className={`absolute inset-0 flex items-center justify-center transition ${
                      isThisPlaying
                        ? "bg-black/45"
                        : "bg-black/30 opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    {isThisPlaying ? (
                      <div className="flex items-center space-x-0.5">
                        <span className="w-1 h-3.5 bg-emerald-400 rounded-full animate-bounce" />
                        <span className="w-1 h-5 bg-emerald-400 rounded-full animate-[bounce_1s_infinite_200ms]" />
                        <span className="w-1 h-3 bg-emerald-400 rounded-full animate-[bounce_1s_infinite_400ms]" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-md">
                        <Play className="w-3.5 h-3.5 text-neutral-950 fill-neutral-950 ml-0.5" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Track Information */}
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-xs font-bold truncate ${
                      isThisPlaying
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-neutral-900 dark:text-white"
                    }`}
                    title={t.title}
                  >
                    {t.title}
                  </p>
                  <p className="text-[11px] text-neutral-500 truncate mt-0.5" title={t.artist}>
                    {t.artist}
                  </p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {t.durationFormatted}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToQueue(t);
                      }}
                      className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 font-bold px-1.5 py-0.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition cursor-pointer"
                    >
                      + Queue
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* LOAD MORE / ENDLESS BUTTON */}
        <div className="pt-4 pb-8 flex flex-col items-center justify-center">
          {isLoading ? (
            <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-500 py-3">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Fetching more songs...</span>
            </div>
          ) : hasMore ? (
            <button
              type="button"
              onClick={handleLoadMore}
              className="px-6 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-emerald-500 text-xs font-bold text-neutral-700 dark:text-neutral-200 hover:text-emerald-600 dark:hover:text-emerald-400 shadow-sm transition flex items-center space-x-2 cursor-pointer active:scale-95"
            >
              <span>Explore More {CATEGORIES.find((c) => c.id === activeCategory)?.name}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          ) : (
            <p className="text-xs text-neutral-400 py-2">
              You’ve reached the top of this category! Try searching or another category.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
