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
  X,
  EyeOff,
  Plus,
  Shuffle,
  RotateCcw,
  Tag,
  Film,
  Radio,
} from "lucide-react";
import { MusicTrack, WorkspaceMember, Message } from "@/types";
import { SyncedMusicPlayer } from "./synced-music-player";
import { MusicReelsView } from "./music-reels-view";
import { useMusic } from "@/context/music-context";

interface MusicChannelViewProps {
  currentUser: WorkspaceMember;
  messages: Message[];
  onSendMessage: (content: string) => void;
}

export interface MusicCategory {
  id: string;
  name: string;
  icon: string;
  group?: "language" | "artist" | "mood" | "custom";
}

const PRESET_CATEGORIES: MusicCategory[] = [
  // Trending
  { id: "trending", name: "Trending Now", icon: "🔥", group: "language" },
  // Languages & Regions
  { id: "malayalam", name: "Malayalam (Kerala)", icon: "🌴", group: "language" },
  { id: "tamil", name: "Tamil Viral", icon: "⚡", group: "language" },
  { id: "hindi", name: "Hindi (Bollywood)", icon: "🌙", group: "language" },
  { id: "english", name: "English Pop", icon: "🌍", group: "language" },
  { id: "korean", name: "Korean (K-Pop)", icon: "🌸", group: "language" },
  { id: "punjabi", name: "Punjabi Hits", icon: "🔥", group: "language" },
  { id: "arabic", name: "Arabic Beats", icon: "🕌", group: "language" },
  { id: "telugu", name: "Telugu Hits", icon: "🪕", group: "language" },
  // Top Artists & Singers
  { id: "sushin shyam", name: "Sushin Shyam", icon: "🎧", group: "artist" },
  { id: "anirudh", name: "Anirudh", icon: "🎸", group: "artist" },
  { id: "ar rahman", name: "A.R. Rahman", icon: "🎹", group: "artist" },
  { id: "arijit singh", name: "Arijit Singh", icon: "🎙️", group: "artist" },
  { id: "sid sriram", name: "Sid Sriram", icon: "✨", group: "artist" },
  { id: "bts", name: "BTS", icon: "💜", group: "artist" },
  // Moods & Vibes
  { id: "lofi", name: "Lo-Fi & Study", icon: "☕", group: "mood" },
  { id: "romantic", name: "Romantic Hits", icon: "💖", group: "mood" },
  { id: "gym", name: "Gym & High Bass", icon: "⚡", group: "mood" },
  { id: "nostalgia", name: "90s Evergreen", icon: "📻", group: "mood" },
];

export function MusicChannelView({
  currentUser,
  messages,
  onSendMessage,
}: MusicChannelViewProps) {
  const {
    playTrack,
    togglePlay,
    addToQueue,
    currentTrack,
    isPlaying,
    setPlaylist,
    hiddenTrackIds,
    hideTrack,
  } = useMusic();

  const [activeCategory, setActiveCategory] = useState("trending");
  const [viewMode, setViewMode] = useState<"jam" | "reels">("jam");
  const [reelsInitialIndex, setReelsInitialIndex] = useState(0);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Custom User Categories & Filter Tabs
  const [customCategories, setCustomCategories] = useState<MusicCategory[]>([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MusicTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const observerTargetRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);

  // Load custom categories saved by user from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("kaelixo_custom_music_tags");
        if (saved) {
          setCustomCategories(JSON.parse(saved));
        }
      } catch {}
    }
  }, []);

  const allCategories = [...customCategories, ...PRESET_CATEGORIES];
  const filteredCategories =
    selectedGroup === "all"
      ? allCategories
      : allCategories.filter(
          (c) =>
            c.group === selectedGroup || (selectedGroup === "custom" && c.group === "custom")
        );

  // Fetch Category Songs with timestamp seed so each load/reload has DIFFERENT fresh songs!
  const fetchCategoryTracks = useCallback(
    async (category: string, pageNum: number, append: boolean = false, seed?: number) => {
      if (loadingMoreRef.current) return;
      loadingMoreRef.current = true;
      setIsLoading(true);

      try {
        const seedParam = seed || Date.now();
        const res = await fetch(
          `/api/music/search?category=${encodeURIComponent(category)}&page=${pageNum}&seed=${seedParam}`
        );
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

  // Reset and load when category changes (with fresh random seed!)
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchCategoryTracks(activeCategory, 1, false, Date.now());
  }, [activeCategory, fetchCategoryTracks]);

  // Load More for infinite scroll
  const handleLoadMore = () => {
    if (isLoading || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchCategoryTracks(activeCategory, nextPage, true);
  };

  // Fresh Mix / Shuffle action
  const handleFreshMix = () => {
    setPage(1);
    fetchCategoryTracks(activeCategory, 1, false, Date.now());
    showToast("🎲 Mixed fresh new songs from YouTube!");
  };

  // Add Custom Category / Filter
  const handleAddCustomCategory = (name: string) => {
    const clean = name.trim();
    if (!clean) return;
    const id = clean.toLowerCase();
    if (allCategories.some((c) => c.id === id)) {
      setActiveCategory(id);
      setIsAddingCategory(false);
      setNewCategoryName("");
      return;
    }
    const newCat: MusicCategory = { id, name: clean, icon: "🎵", group: "custom" };
    const updated = [newCat, ...customCategories];
    setCustomCategories(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("kaelixo_custom_music_tags", JSON.stringify(updated));
      } catch {}
    }
    setActiveCategory(id);
    setIsAddingCategory(false);
    setNewCategoryName("");
    showToast(`Added "${clean}" category!`);
  };

  // Remove Custom Category
  const handleRemoveCustomCategory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customCategories.filter((c) => c.id !== id);
    setCustomCategories(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("kaelixo_custom_music_tags", JSON.stringify(updated));
      } catch {}
    }
    if (activeCategory === id) {
      setActiveCategory("trending");
    }
    showToast("Category removed");
  };

  // Automatic Infinite Scroll on Sentinel Intersection (No button click needed!)
  useEffect(() => {
    const target = observerTargetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoading && hasMore) {
          setPage((prevPage) => {
            const nextPage = prevPage + 1;
            fetchCategoryTracks(activeCategory, nextPage, true);
            return nextPage;
          });
        }
      },
      { threshold: 0.1, rootMargin: "350px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [activeCategory, isLoading, hasMore, fetchCategoryTracks]);

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

  // If user selected 60s Music Reels (Instagram Feed) Mode
  if (viewMode === "reels") {
    return (
      <MusicReelsView
        initialTracks={tracks}
        initialIndex={reelsInitialIndex}
        onPlayFullTrack={(track) => {
          playTrack(track, 0, tracks);
          setViewMode("jam");
          showToast(`Playing "${track.title}" in Jam!`);
        }}
        onAddToQueue={(track) => {
          addToQueue(track);
          showToast(`Added "${track.title}" to shared queue`);
        }}
        onBackToJam={() => setViewMode("jam")}
        currentUser={currentUser}
      />
    );
  }

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

      {/* View Switcher: Audio Jam vs 60s Music Reels (Insta Feed) */}
      <div className="w-full max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-neutral-900/80 p-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div className="flex items-center space-x-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setViewMode("jam")}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm flex items-center justify-center space-x-2 transition cursor-pointer"
          >
            <Radio className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
            <span>📻 Ad-Free Audio Jam</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setReelsInitialIndex(0);
              setViewMode("reels");
            }}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:text-white hover:bg-gradient-to-r hover:from-purple-600 hover:via-pink-600 hover:to-rose-600 border border-neutral-200 dark:border-neutral-700/80 hover:border-transparent flex items-center justify-center space-x-2 transition cursor-pointer group shadow-xs"
          >
            <Film className="w-4 h-4 text-pink-500 group-hover:text-white" />
            <span>📱 60s Music Reels</span>
            <span className="text-[9px] bg-rose-500 text-white px-1.5 py-0.5 rounded-full uppercase font-black animate-pulse">
              Insta Feed
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setReelsInitialIndex(0);
            setViewMode("reels");
          }}
          className="text-xs font-bold text-rose-500 hover:text-rose-400 flex items-center space-x-1.5 transition cursor-pointer py-1 px-2.5 rounded-lg hover:bg-rose-500/10"
        >
          <span>✨ Scroll 60s Video Clips like Reels →</span>
        </button>
      </div>

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

        {/* Quick Trending Chips */}
        <div className="flex items-center space-x-2 mt-2.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-neutral-400 font-medium flex-shrink-0 flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>Trending:</span>
          </span>
          {[
            "Aavesham Illuminati",
            "Anirudh Hits",
            "K-Pop Viral",
            "Kerala Indie",
            "Arijit Singh",
            "A.R. Rahman",
            "Taylor Swift",
            "Sid Sriram",
            "Lo-Fi Study",
            "Gym Phonk",
          ].map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSearchQuery(tag)}
              className="px-2.5 py-1 rounded-full bg-white dark:bg-neutral-800/80 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700/60 transition flex-shrink-0 cursor-pointer shadow-2xs hover:border-emerald-500/50"
            >
              #{tag}
            </button>
          ))}
        </div>

        {/* Live Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800/60 max-h-80 overflow-y-auto">
            {searchResults
              .filter((track) => !hiddenTrackIds.includes(track.id))
              .map((track) => {
              const isThisPlaying = currentTrack?.id === track.id && isPlaying;
              return (
                <div
                  key={track.id}
                  className="p-3 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition group"
                >
                  <div
                    onClick={() => handlePlaySong(track)}
                    className="flex items-center space-x-3 min-w-0 flex-1 cursor-pointer"
                  >
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-800">
                      <img
                        src={track.thumbnail}
                        alt={track.title}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80";
                        }}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        hideTrack(track.id);
                        showToast(`Hidden "${track.title.slice(0, 18)}..."`);
                      }}
                      className="p-1.5 text-neutral-400 hover:text-red-400 opacity-0 group-hover:opacity-100 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                      title="Hide from suggestions"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
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
                      onClick={() => {
                        setTracks((prev) => [track, ...prev.filter((p) => p.id !== track.id)]);
                        setReelsInitialIndex(0);
                        setViewMode("reels");
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-semibold transition cursor-pointer flex items-center space-x-1"
                      title="Watch as 60s Reel"
                    >
                      <Film className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">60s Reel</span>
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

      {/* CATEGORY & DISCOVER SYSTEM */}
      <div className="w-full max-w-4xl mx-auto space-y-3">
        {/* Header with Title and Fresh Mix / Add Filter buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
              Music Radios & Categories
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
              {allCategories.length} Mixes
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Fresh Mix / Shuffle Button */}
            <button
              type="button"
              onClick={handleFreshMix}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center space-x-1.5 transition cursor-pointer shadow-xs active:scale-95"
              title="Mix new fresh songs from YouTube"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>🎲 Fresh Mix</span>
            </button>

            {/* Add Custom Filter Button */}
            <button
              type="button"
              onClick={() => setIsAddingCategory((v) => !v)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Filter</span>
            </button>
          </div>
        </div>

        {/* Inline Add Custom Category / Filter Form */}
        {isAddingCategory && (
          <div className="p-3 bg-white dark:bg-neutral-900 border border-emerald-500/40 rounded-xl shadow-lg space-y-2.5 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center space-x-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-500" />
                <span>Add any Singer, Language, or Place</span>
              </span>
              <button
                type="button"
                onClick={() => setIsAddingCategory(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomCategory(newCategoryName);
                  }
                }}
                placeholder="e.g. Korea, Kerala Indie, Coldplay, Sid Sriram, Sushin Shyam, Brazil Funk..."
                className="flex-1 px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
              <button
                type="button"
                onClick={() => handleAddCustomCategory(newCategoryName)}
                disabled={!newCategoryName.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition shadow-xs cursor-pointer"
              >
                Save Filter
              </button>
            </div>

            {/* Quick suggestions */}
            <div className="flex items-center space-x-1.5 overflow-x-auto text-[11px] pt-1">
              <span className="text-neutral-400 text-[10px] flex-shrink-0">Quick Add:</span>
              {["Korea", "Kerala Indie", "Coldplay", "Taylor Swift", "Travis Scott", "Brazil Funk"].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleAddCustomCategory(suggestion)}
                  className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 flex-shrink-0 cursor-pointer"
                >
                  +{suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Group Tabs (All, Languages & Places, Singers & Artists, Moods, Custom) */}
        <div className="flex items-center space-x-1 border-b border-neutral-200 dark:border-neutral-800/80 pb-1.5 overflow-x-auto scrollbar-none text-xs">
          {[
            { id: "all", label: "🌟 All Mixes" },
            { id: "language", label: "🌐 Languages & Places" },
            { id: "artist", label: "🎤 Singers & Artists" },
            { id: "mood", label: "🎧 Moods & Vibes" },
            { id: "custom", label: `⭐ My Filters (${customCategories.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedGroup(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex-shrink-0 cursor-pointer text-xs ${
                selectedGroup === tab.id
                  ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Horizontal Pill Bar */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
          {filteredCategories.map((cat) => {
            const isActive = activeCategory === cat.id;
            const isCustom = cat.group === "custom";

            return (
              <div
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`group px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 flex-shrink-0 cursor-pointer shadow-xs border ${
                  isActive
                    ? "bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20 scale-102"
                    : "bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white border-neutral-200 dark:border-neutral-800 hover:border-neutral-300"
                }`}
              >
                <span className="text-base">{cat.icon}</span>
                <span>{cat.name}</span>
                {isCustom && (
                  <button
                    type="button"
                    onClick={(e) => handleRemoveCustomCategory(cat.id, e)}
                    className="p-0.5 rounded-full hover:bg-neutral-700/50 text-neutral-400 hover:text-white transition ml-1"
                    title="Remove custom tag"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Current Radio Category Title & Info */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center space-x-2">
            <span className="text-base">
              {allCategories.find((c) => c.id === activeCategory)?.icon || "🎵"}
            </span>
            <span className="text-xs font-extrabold text-neutral-900 dark:text-white uppercase tracking-wider">
              {allCategories.find((c) => c.id === activeCategory)?.name || activeCategory}
            </span>
            <span className="text-[11px] text-neutral-400 font-medium">
              • Live dynamic rotation (Page {page})
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">
              ⚡ Zero Ads • 100% Synced
            </span>
          </div>
        </div>
      </div>

      {/* TRACKS GRID (Endless recommendations) */}
      <div className="w-full max-w-4xl mx-auto space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {tracks
            .filter((t) => !hiddenTrackIds.includes(t.id))
            .map((t, idx) => {
            const isThisPlaying = currentTrack?.id === t.id && isPlaying;
            return (
              <div
                key={`${t.id}-${idx}`}
                onClick={() => handlePlaySong(t)}
                className={`group p-3 rounded-xl bg-white dark:bg-neutral-900/90 border transition-all duration-200 flex items-center space-x-3 cursor-pointer select-none relative ${
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
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80";
                    }}
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
                  <div className="flex items-start justify-between">
                    <p
                      className={`text-xs font-bold truncate pr-1 ${
                        isThisPlaying
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-neutral-900 dark:text-white"
                      }`}
                      title={t.title}
                    >
                      {t.title}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        hideTrack(t.id);
                        showToast(`Removed "${t.title.slice(0, 20)}..." from recommendations`);
                      }}
                      className="p-1 -mr-1 -mt-1 text-neutral-400 hover:text-red-400 opacity-0 group-hover:opacity-100 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                      title="Hide this song from recommendations"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-neutral-500 truncate mt-0.5" title={t.artist}>
                    {t.artist}
                  </p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {t.durationFormatted}
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReelsInitialIndex(idx);
                          setViewMode("reels");
                        }}
                        className="text-[10px] text-rose-500 hover:text-rose-400 font-bold px-1.5 py-0.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer flex items-center space-x-0.5"
                        title="Watch 60s Reel"
                      >
                        <Film className="w-2.5 h-2.5" />
                        <span>60s Reel</span>
                      </button>
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
              </div>
            );
          })}
        </div>

        {/* Infinite Scroll Auto-Load Sentinel (Auto-loads smoothly on scroll without button click) */}
        <div ref={observerTargetRef} className="pt-6 pb-16 flex items-center justify-center">
          {isLoading && (
            <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-500 py-4 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading more songs...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
