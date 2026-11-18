"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Heart,
  MessageCircle,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ChevronUp,
  ChevronDown,
  ListPlus,
  Radio,
  Sparkles,
  Share2,
  RotateCcw,
  Maximize2,
  Check,
  Disc3,
  Flame,
  ArrowLeft,
  SlidersHorizontal,
  Plus,
} from "lucide-react";
import { MusicTrack, WorkspaceMember } from "@/types";
import { useMusic } from "@/context/music-context";

interface MusicReelsViewProps {
  initialTracks?: MusicTrack[];
  initialIndex?: number;
  onPlayFullTrack?: (track: MusicTrack) => void;
  onAddToQueue?: (track: MusicTrack) => void;
  onBackToJam?: () => void;
  currentUser?: WorkspaceMember;
}

const REEL_CATEGORIES = [
  { id: "reels", name: "Trending Reels", icon: "🔥" },
  { id: "malayalam reels", name: "Malayalam Viral", icon: "🌴" },
  { id: "tamil reels", name: "Tamil Hits", icon: "⚡" },
  { id: "hindi", name: "Bollywood Melodies", icon: "🌙" },
  { id: "korean", name: "K-Pop Viral", icon: "🌸" },
  { id: "english", name: "Global Pop", icon: "🌍" },
  { id: "lofi", name: "Lo-Fi Beats", icon: "☕" },
  { id: "sushin shyam", name: "Sushin Shyam", icon: "🎧" },
  { id: "anirudh", name: "Anirudh", icon: "🎸" },
];

export function MusicReelsView({
  initialTracks = [],
  initialIndex = 0,
  onPlayFullTrack,
  onAddToQueue,
  onBackToJam,
  currentUser,
}: MusicReelsViewProps) {
  const { playTrack, addToQueue, unlockMobileAudio } = useMusic();

  const [activeCategory, setActiveCategory] = useState("reels");
  const [reels, setReels] = useState<MusicTrack[]>(initialTracks);
  const [activeIndex, setActiveIndex] = useState(initialIndex || 0);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);

  // Playback & 60-Second Timer
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [currentSecond, setCurrentSecond] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [fitMode, setFitMode] = useState<"fill" | "fit">("fill");
  const [showPlayPauseIcon, setShowPlayPauseIcon] = useState<"play" | "pause" | null>(null);

  // Likes & Interactions
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [likeCountMap, setLikeCountMap] = useState<Record<string, number>>({});
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [showReactionMenu, setShowReactionMenu] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<
    { id: string; emoji: string; x: number }[]
  >([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const touchStartY = useRef<number>(0);
  const wheelTimeout = useRef<NodeJS.Timeout | null>(null);
  const doubleClickTimeout = useRef<NodeJS.Timeout | null>(null);

  // Load liked items from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedLikes = localStorage.getItem("kaelixo_reels_liked");
        if (savedLikes) {
          setLikedMap(JSON.parse(savedLikes));
        }
      } catch {}
    }
  }, []);

  // Show Toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Fetch Reels for selected category
  const fetchReels = useCallback(
    async (category: string, pageNum: number, append: boolean = false) => {
      setIsLoading(true);
      try {
        const seed = Date.now();
        const res = await fetch(
          `/api/music/search?category=${encodeURIComponent(category)}&page=${pageNum}&reels=true&seed=${seed}`
        );
        const data = await res.json();
        if (data.tracks && data.tracks.length > 0) {
          if (append) {
            setReels((prev) => {
              const seen = new Set(prev.map((t) => t.id));
              const fresh = data.tracks.filter((t: MusicTrack) => !seen.has(t.id));
              return [...prev, ...fresh];
            });
          } else {
            setReels(data.tracks);
            setActiveIndex(0);
            setCurrentSecond(0);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch reels:", err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Initial load if no tracks passed
  useEffect(() => {
    if (reels.length === 0) {
      fetchReels(activeCategory, 1, false);
    }
  }, [activeCategory, fetchReels, reels.length]);

  // When changing category
  const handleCategorySelect = (catId: string) => {
    setActiveCategory(catId);
    setPage(1);
    fetchReels(catId, 1, false);
  };

  // 60-Second Loop & Auto-Advance Timer
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentSecond((sec) => {
        if (sec >= 60) {
          if (autoAdvance) {
            // Auto advance to next reel at 60 seconds
            handleNextReel();
            return 0;
          }
          // Loop current reel
          return 0;
        }
        return sec + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, autoAdvance, reels.length, activeIndex]);

  // Reset second and prefetch when reel changes
  useEffect(() => {
    setCurrentSecond(0);
    setIsPlaying(true);

    // Prefetch next page if reaching end
    if (activeIndex >= reels.length - 3 && !isLoading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchReels(activeCategory, nextPage, true);
    }
  }, [activeIndex, reels.length, isLoading, page, activeCategory, fetchReels]);

  // Navigation handlers
  const handleNextReel = () => {
    if (activeIndex < reels.length - 1) {
      setActiveIndex((prev) => prev + 1);
    } else {
      setActiveIndex(0); // loop around
    }
  };

  const handlePrevReel = () => {
    if (activeIndex > 0) {
      setActiveIndex((prev) => prev - 1);
    }
  };

  // Keyboard navigation (Arrow Up / Down, Space, M, L)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        handleNextReel();
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        handlePrevReel();
      } else if (e.key === " ") {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key.toLowerCase() === "m") {
        e.preventDefault();
        setIsMuted((m) => !m);
      } else if (e.key.toLowerCase() === "l") {
        e.preventDefault();
        triggerLike();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, reels.length]);

  // Mouse wheel scroll handler (throttled)
  const handleWheel = (e: React.WheelEvent) => {
    if (wheelTimeout.current) return;
    if (Math.abs(e.deltaY) > 40) {
      wheelTimeout.current = setTimeout(() => {
        wheelTimeout.current = null;
      }, 400);

      if (e.deltaY > 0) {
        handleNextReel();
      } else {
        handlePrevReel();
      }
    }
  };

  // Touch Swipe on mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY;
    if (diff > 50) {
      handleNextReel(); // Swiped Up -> Next Reel
    } else if (diff < -50) {
      handlePrevReel(); // Swiped Down -> Prev Reel
    }
  };

  // Click & Double-click on video (Play/Pause vs Instagram Like)
  const handleVideoClick = () => {
    if (doubleClickTimeout.current) {
      clearTimeout(doubleClickTimeout.current);
      doubleClickTimeout.current = null;
      // Double click detected -> Instagram Heart Burst Like!
      triggerLike();
    } else {
      doubleClickTimeout.current = setTimeout(() => {
        doubleClickTimeout.current = null;
        togglePlayPause();
      }, 250);
    }
  };

  const togglePlayPause = () => {
    setIsPlaying((prev) => {
      const next = !prev;
      setShowPlayPauseIcon(next ? "play" : "pause");
      setTimeout(() => setShowPlayPauseIcon(null), 700);
      return next;
    });
  };

  // Like action
  const currentTrack = reels[activeIndex];
  const isCurrentLiked = currentTrack ? !!likedMap[currentTrack.id] : false;

  const triggerLike = () => {
    if (!currentTrack) return;
    unlockMobileAudio();

    const trackId = currentTrack.id;
    const nextLiked = !likedMap[trackId];

    const updated = { ...likedMap, [trackId]: nextLiked };
    setLikedMap(updated);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("kaelixo_reels_liked", JSON.stringify(updated));
      } catch {}
    }

    if (nextLiked) {
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 900);
      showToast("❤️ Liked reel!");
    }
  };

  // Floating Emoji Reaction (like Instagram Live)
  const sendEmojiReaction = (emoji: string) => {
    const id = `reaction-${Date.now()}-${Math.random()}`;
    const x = Math.floor(Math.random() * 60) + 20; // 20% to 80%
    setFloatingReactions((prev) => [...prev, { id, emoji, x }]);

    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2000);

    setShowReactionMenu(false);
  };

  // Play full song in channel jam
  const handlePlayFullSong = () => {
    if (!currentTrack) return;
    if (onPlayFullTrack) {
      onPlayFullTrack(currentTrack);
    } else {
      playTrack(currentTrack, 0, reels);
    }
    showToast(`Playing full song "${currentTrack.title}" in Jam!`);
  };

  // Add to queue
  const handleAddToQueue = () => {
    if (!currentTrack) return;
    if (onAddToQueue) {
      onAddToQueue(currentTrack);
    } else {
      addToQueue(currentTrack);
    }
    showToast(`Added "${currentTrack.title}" to shared queue`);
  };

  // Estimated likes counter (seed + like state)
  const getLikeCount = (trackId: string) => {
    if (!likeCountMap[trackId]) {
      const hash = trackId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const base = 80 + (hash % 450);
      likeCountMap[trackId] = base;
    }
    return likeCountMap[trackId] + (likedMap[trackId] ? 1 : 0);
  };

  if (reels.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-neutral-400 space-y-4">
        <Disc3 className="w-12 h-12 text-emerald-500 animate-spin" />
        <p className="text-sm font-semibold text-white">Loading 60s viral reels...</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="flex-1 flex flex-col h-full bg-neutral-950 text-white select-none overflow-hidden relative"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 bg-neutral-900/90 backdrop-blur-md text-white px-4 py-2.5 rounded-xl shadow-2xl border border-emerald-500/50 flex items-center space-x-2 text-xs font-semibold animate-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP NAVIGATION & CATEGORY BAR */}
      <div className="w-full max-w-5xl mx-auto px-4 pt-3 pb-2 z-20 flex flex-col sm:flex-row items-center justify-between gap-2.5 border-b border-neutral-900/80 bg-neutral-950/80 backdrop-blur-md">
        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-start">
          {onBackToJam && (
            <button
              type="button"
              onClick={onBackToJam}
              className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-bold text-neutral-300 hover:text-white transition flex items-center space-x-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Jam</span>
            </button>
          )}

          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-rose-400 to-amber-300">
              60s Music Reels
            </h2>
            <span className="text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold">
              Insta Feed
            </span>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 scrollbar-none">
          {REEL_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategorySelect(cat.id)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition flex items-center space-x-1 flex-shrink-0 cursor-pointer ${
                activeCategory === cat.id
                  ? "bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-rose-900/40 scale-102"
                  : "bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* CENTER REEL STAGE */}
      <div className="flex-1 flex items-center justify-center relative p-2 sm:p-4 overflow-hidden">
        {/* Instagram Reel Container (Vertical 9:16 Aspect Ratio) */}
        <div className="flex items-center space-x-3 sm:space-x-5 h-full max-h-[780px]">
          {/* Vertical 9:16 Video Card */}
          <div
            onClick={handleVideoClick}
            className="relative w-[340px] xs:w-[380px] sm:w-[410px] aspect-[9/16] h-full max-h-[760px] rounded-3xl overflow-hidden bg-black shadow-2xl border border-neutral-800/80 flex flex-col justify-between group select-none cursor-pointer"
          >
            {/* Background Video Player (YouTube embedded with vertical crop/fit) */}
            <div className="absolute inset-0 overflow-hidden bg-neutral-950 flex items-center justify-center">
              {currentTrack && (
                <iframe
                  key={currentTrack.id}
                  src={`https://www.youtube-nocookie.com/embed/${currentTrack.id}?autoplay=1&mute=${
                    isMuted ? 1 : 0
                  }&controls=0&modestbranding=1&rel=0&playsinline=1&enablejsapi=1&loop=1&playlist=${
                    currentTrack.id
                  }`}
                  title={currentTrack.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  style={
                    fitMode === "fill"
                      ? {
                          width: "320%",
                          height: "100%",
                          maxWidth: "none",
                          position: "absolute",
                          left: "50%",
                          top: "50%",
                          transform: "translate(-50%, -50%)",
                          pointerEvents: "none",
                        }
                      : {
                          width: "100%",
                          height: "100%",
                          pointerEvents: "none",
                        }
                  }
                />
              )}

              {/* Atmospheric blurred backdrop for 'fit' mode */}
              {fitMode === "fit" && currentTrack && (
                <div
                  className="absolute inset-0 -z-10 bg-cover bg-center filter blur-2xl opacity-40 scale-125"
                  style={{ backgroundImage: `url(${currentTrack.thumbnail})` }}
                />
              )}
            </div>

            {/* Dark Vignette Overlay for Crisp Readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/90 pointer-events-none" />

            {/* Live Floating Reactions (Moving Upward) */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
              {floatingReactions.map((r) => (
                <div
                  key={r.id}
                  className="absolute text-4xl animate-bounce filter drop-shadow-lg"
                  style={{
                    left: `${r.x}%`,
                    bottom: "20%",
                    animation: "floatUpReel 1.8s ease-out forwards",
                  }}
                >
                  {r.emoji}
                </div>
              ))}
            </div>

            {/* Popping Heart Burst Animation on Like */}
            {showHeartBurst && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40 animate-in zoom-in-50 duration-300">
                <div className="relative">
                  <Heart className="w-24 h-24 text-rose-500 fill-rose-500 drop-shadow-2xl animate-pulse" />
                  <Sparkles className="w-10 h-10 text-amber-300 absolute -top-3 -right-3 animate-spin" />
                </div>
              </div>
            )}

            {/* Quick Play/Pause Center Fade Icon */}
            {showPlayPauseIcon && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40 animate-in fade-in zoom-in-75 duration-200">
                <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white shadow-xl">
                  {showPlayPauseIcon === "play" ? (
                    <Play className="w-8 h-8 fill-current ml-1 text-emerald-400" />
                  ) : (
                    <Pause className="w-8 h-8 fill-current text-white" />
                  )}
                </div>
              </div>
            )}

            {/* TOP BAR INSIDE REEL */}
            <div className="relative z-20 p-4 flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center space-x-2 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] text-white/90">
                  Reel {activeIndex + 1} of {reels.length}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                {/* Auto Next Toggle */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAutoAdvance((v) => !v);
                    showToast(autoAdvance ? "Auto-Next disabled" : "Auto-Next enabled (60s)");
                  }}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition flex items-center space-x-1 cursor-pointer ${
                    autoAdvance
                      ? "bg-rose-500/30 text-rose-300 border-rose-500/40"
                      : "bg-black/40 text-neutral-400 border-white/10"
                  }`}
                  title="Auto-scroll to next reel when 60s completes"
                >
                  <span>⚡ 60s Auto: {autoAdvance ? "ON" : "OFF"}</span>
                </button>

                {/* Fit / Fill Aspect Toggle */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFitMode((m) => (m === "fill" ? "fit" : "fill"));
                  }}
                  className="p-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/80 hover:text-white transition cursor-pointer"
                  title="Toggle Video Zoom Fit / Fill"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* BOTTOM REEL INFO (Title, Artist, Audio Track Ticker, 60s Progress Bar) */}
            <div className="relative z-20 p-4 space-y-2.5">
              {/* Creator / DJ Badge */}
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-white/30 bg-neutral-800 shadow-md flex-shrink-0">
                  <img
                    src={currentTrack?.thumbnail}
                    alt={currentTrack?.artist}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-1.5">
                    <p className="text-xs font-bold text-white drop-shadow-sm truncate">
                      {currentTrack?.artist}
                    </p>
                    <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px] font-bold">
                      ✓
                    </span>
                  </div>
                  <span className="text-[10px] text-white/70">Kaelixo Audio • 60s Clip</span>
                </div>
              </div>

              {/* Track Title */}
              <p className="text-sm font-extrabold text-white leading-tight drop-shadow-md line-clamp-2">
                {currentTrack?.title}
              </p>

              {/* Spinning Vinyl Record Audio Ticker */}
              <div className="flex items-center space-x-2 text-xs text-white/80 overflow-hidden pt-0.5">
                <Disc3
                  className={`w-4 h-4 text-rose-400 flex-shrink-0 ${
                    isPlaying ? "animate-spin" : ""
                  }`}
                  style={{ animationDuration: "3s" }}
                />
                <div className="min-w-0 flex-1 overflow-hidden whitespace-nowrap">
                  <p className="text-[11px] truncate text-white/90 font-medium">
                    ♫ {currentTrack?.title} • {currentTrack?.artist} • 60s Reel Highlight
                  </p>
                </div>
              </div>

              {/* Quick Actions (Play in Jam & Add to Queue) */}
              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayFullSong();
                  }}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md transition flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>Play Full in Jam</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToQueue();
                  }}
                  className="py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-xs font-bold transition flex items-center space-x-1 cursor-pointer border border-white/20"
                >
                  <ListPlus className="w-3.5 h-3.5" />
                  <span>+ Queue</span>
                </button>
              </div>

              {/* 60-SECOND NEON SCRUBBER PROGRESS BAR */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-[10px] text-white/80 font-mono mb-1">
                  <span>⏱️ 0:{currentSecond < 10 ? `0${currentSecond}` : currentSecond}</span>
                  <span className="text-white/60">60s Reel Limit</span>
                  <span>1:00</span>
                </div>
                <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm relative">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 via-pink-500 to-emerald-400 transition-all duration-1000 ease-linear rounded-full shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                    style={{ width: `${(currentSecond / 60) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT ACTION BAR (Instagram Desktop Layout from user's screenshot) */}
          <div className="flex flex-col items-center justify-end space-y-4 pb-4">
            {/* Up Arrow (Previous Reel) */}
            <button
              type="button"
              onClick={handlePrevReel}
              disabled={activeIndex === 0}
              className="w-10 h-10 rounded-full bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700/80 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white transition shadow-lg cursor-pointer hover:scale-105 active:scale-95"
              title="Previous Reel (Up Arrow)"
            >
              <ChevronUp className="w-5 h-5" />
            </button>

            {/* Like Heart Button */}
            <div className="flex flex-col items-center space-y-1">
              <button
                type="button"
                onClick={triggerLike}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-xl cursor-pointer ${
                  isCurrentLiked
                    ? "bg-rose-600 text-white scale-110 shadow-rose-500/40"
                    : "bg-neutral-900/90 hover:bg-neutral-800 text-white border border-neutral-700/80 hover:scale-105"
                }`}
                title="Like this Reel (L)"
              >
                <Heart
                  className={`w-6 h-6 ${isCurrentLiked ? "fill-white text-white" : "text-white"}`}
                />
              </button>
              <span className="text-[11px] font-bold text-neutral-300">
                {currentTrack ? getLikeCount(currentTrack.id) : 105}
              </span>
            </div>

            {/* Reaction Emoji Trigger */}
            <div className="relative flex flex-col items-center space-y-1">
              <button
                type="button"
                onClick={() => setShowReactionMenu((v) => !v)}
                className="w-12 h-12 rounded-full bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700/80 flex items-center justify-center text-white transition shadow-xl cursor-pointer hover:scale-105"
                title="React to Reel"
              >
                <MessageCircle className="w-6 h-6 text-white" />
              </button>
              <span className="text-[11px] font-bold text-neutral-300">React</span>

              {/* Reaction Picker Popup */}
              {showReactionMenu && (
                <div className="absolute right-14 bottom-0 bg-neutral-900 border border-neutral-700 rounded-2xl p-2 shadow-2xl flex items-center space-x-2 z-50 animate-in zoom-in-75 duration-150">
                  {["🔥", "❤️", "👏", "💜", "💃", "🚀"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => sendEmojiReaction(emoji)}
                      className="text-2xl p-1.5 hover:scale-125 transition transform cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mute / Unmute Button */}
            <div className="flex flex-col items-center space-y-1">
              <button
                type="button"
                onClick={() => {
                  unlockMobileAudio();
                  setIsMuted((m) => !m);
                }}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition shadow-xl cursor-pointer border ${
                  isMuted
                    ? "bg-amber-600/30 text-amber-300 border-amber-500/50 hover:bg-amber-600/40"
                    : "bg-neutral-900/90 hover:bg-neutral-800 text-white border-neutral-700/80"
                }`}
                title="Toggle Mute (M)"
              >
                {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </button>
              <span className="text-[10px] font-bold text-neutral-400">
                {isMuted ? "Unmute" : "Sound"}
              </span>
            </div>

            {/* Restart 60s Reel */}
            <div className="flex flex-col items-center space-y-1">
              <button
                type="button"
                onClick={() => {
                  setCurrentSecond(0);
                  setIsPlaying(true);
                  showToast("Replayed 60s clip");
                }}
                className="w-10 h-10 rounded-full bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700/80 flex items-center justify-center text-white transition shadow-lg cursor-pointer hover:scale-105"
                title="Replay 60s Clip"
              >
                <RotateCcw className="w-4 h-4 text-neutral-300" />
              </button>
              <span className="text-[10px] font-bold text-neutral-400">Replay</span>
            </div>

            {/* Down Arrow (Next Reel) */}
            <button
              type="button"
              onClick={handleNextReel}
              className="w-10 h-10 rounded-full bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700/80 flex items-center justify-center text-white transition shadow-lg cursor-pointer hover:scale-105 active:scale-95"
              title="Next Reel (Down Arrow)"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Global CSS for floating reactions in reels */}
      <style jsx global>{`
        @keyframes floatUpReel {
          0% {
            opacity: 1;
            transform: translateY(0) scale(0.8);
          }
          100% {
            opacity: 0;
            transform: translateY(-260px) scale(1.4);
          }
        }
      `}</style>
    </div>
  );
}
