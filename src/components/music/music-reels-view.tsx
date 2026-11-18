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
  Clock,
  Eye,
  EyeOff,
  MoreVertical,
  MoreHorizontal,
  Bookmark,
  Send,
  Film,
  Search,
  ExternalLink,
  ChevronRight,
  UserCheck,
} from "lucide-react";
import { MusicTrack, WorkspaceMember } from "@/types";
import { useMusic } from "@/context/music-context";

interface MusicReelsViewProps {
  initialTracks?: MusicTrack[];
  initialIndex?: number;
  initialCategory?: string;
  onPlayFullTrack?: (track: MusicTrack) => void;
  onAddToQueue?: (track: MusicTrack) => void;
  onBackToJam?: () => void;
  currentUser?: WorkspaceMember;
}

// Clean YouTube song titles to remove ugly SEO clutter, movie credits, and pipes
export function cleanSongTitle(title: string): string {
  if (!title) return "";
  let clean = title;

  if (clean.includes("|")) {
    clean = clean.split("|")[0].trim();
  }

  clean = clean
    .replace(/\s*-\s*(official\s*)?(video|audio|lyric(s)?|music\s*video|visualizer|teaser|trailer|song).*$/gi, "")
    .replace(/\s*[\(\[](official\s*)?(music\s*)?(video|audio|lyric(s)?|4k|hd|remastered|full\s*song|visualizer|special\s*edition).*?[\)\]]/gi, "")
    .replace(/\s*[\(\[](from\s+["'].*?["']|from\s+.*?|soundtrack)[\)\]]/gi, "")
    .replace(/\s*[\(\[](feat\.|ft\.).*?[\)\]]/gi, "")
    .replace(/^@/, "")
    .trim();

  if (clean.length >= 2) return clean;
  return title.split("|")[0].trim() || title;
}

export function cleanArtistName(artist: string): string {
  if (!artist) return "Artist";
  return artist
    .replace(/\s*-\s*topic/gi, "")
    .replace(/\s*official/gi, "")
    .trim() || artist;
}

interface ReelComment {
  id: string;
  userName: string;
  userAvatar?: string;
  timeAgo: string;
  text: string;
  likes: number;
  likedByUser?: boolean;
}

const DEFAULT_COMMENTS: ReelComment[] = [
  {
    id: "c1",
    userName: "Anagha",
    timeAgo: "2d ago",
    text: "This playlist is 🔥",
    likes: 7,
  },
  {
    id: "c2",
    userName: "Nived",
    timeAgo: "1d ago",
    text: "Nice vibe! 🎧",
    likes: 4,
  },
  {
    id: "c3",
    userName: "Sahama",
    timeAgo: "1d ago",
    text: "Add more Malayalam pop pls ✨",
    likes: 3,
  },
];

const PRESET_CATEGORIES = [
  { id: "reels", name: "Trending", icon: "🔥" },
  { id: "new", name: "New", icon: "✨" },
  { id: "malayalam reels", name: "Malayalam", icon: "🌴" },
  { id: "tamil reels", name: "Tamil", icon: "⚡" },
  { id: "hindi", name: "Hindi", icon: "🌙" },
  { id: "english", name: "Pop", icon: "🌍" },
  { id: "indie", name: "Indie", icon: "🎸" },
  { id: "liked", name: "Liked", icon: "❤️" },
  { id: "rock", name: "Rock", icon: "⚡" },
  { id: "lofi", name: "Lo-Fi", icon: "☕" },
];

export function MusicReelsView({
  initialTracks = [],
  initialIndex = 0,
  initialCategory,
  onPlayFullTrack,
  onAddToQueue,
  onBackToJam,
  currentUser,
}: MusicReelsViewProps) {
  const { playTrack, addToQueue, unlockMobileAudio } = useMusic();

  const [activeCategory, setActiveCategory] = useState(initialCategory || "reels");
  const [reels, setReels] = useState<MusicTrack[]>(initialTracks);
  const [activeIndex, setActiveIndex] = useState(initialIndex || 0);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  // Clean View & Options Modals
  const [cleanView, setCleanView] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDescriptionMore, setShowDescriptionMore] = useState(false);
  const [scrollTransition, setScrollTransition] = useState<"up" | "down">("up");

  // Playback & Custom Duration Timer (Default: 2 minutes / 120s)
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [currentSecond, setCurrentSecond] = useState(0);
  const [durationLimit, setDurationLimit] = useState<number>(120);
  const [customInputSeconds, setCustomInputSeconds] = useState<string>("");
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [fitMode, setFitMode] = useState<"fill" | "fit">("fill");
  const [showPlayPauseIcon, setShowPlayPauseIcon] = useState<"play" | "pause" | null>(null);

  // YouTube IFrame Ref & Safe postMessage Control (prevents restarting video on mute/unmute)
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const isMutedRef = useRef(isMuted);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // PostMessage helper to control YouTube IFrame directly WITHOUT modifying src URL
  const postYtReelCommand = useCallback((func: string, args: any[] = []) => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func, args }),
          "*"
        );
      } catch (err) {
        console.warn("postYtReelCommand error:", err);
      }
    }
  }, []);

  // Mute / Unmute handler using postMessage (prevents video reload / restart bug!)
  const toggleMute = useCallback(() => {
    unlockMobileAudio();
    setIsMuted((prev) => {
      const next = !prev;
      postYtReelCommand(next ? "mute" : "unMute");
      return next;
    });
  }, [unlockMobileAudio, postYtReelCommand]);

  // Play / Pause toggle with YouTube API command
  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => {
      const next = !prev;
      postYtReelCommand(next ? "playVideo" : "pauseVideo");
      setShowPlayPauseIcon(next ? "play" : "pause");
      setTimeout(() => setShowPlayPauseIcon(null), 700);
      return next;
    });
  }, [postYtReelCommand]);

  // Load duration preference from localStorage (defaults to 120s / 2 minutes)
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedDuration = localStorage.getItem("kaelixo_reels_duration");
        if (savedDuration) {
          const parsed = parseInt(savedDuration, 10);
          if (!isNaN(parsed) && parsed >= 0) {
            setDurationLimit(parsed);
          }
        } else {
          setDurationLimit(120);
          localStorage.setItem("kaelixo_reels_duration", "120");
        }
      } catch {}
    }
  }, []);

  const changeDurationLimit = (seconds: number) => {
    setDurationLimit(seconds);
    setCurrentSecond(0);
    setShowMoreMenu(false);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("kaelixo_reels_duration", seconds.toString());
      } catch {}
    }
    showToast(
      seconds === 0
        ? "Reel duration set to: Full Song"
        : `Reel duration set to: ${formatDurationLabel(seconds)}`
    );
  };

  const formatDurationLabel = (sec: number) => {
    if (sec === 0 || sec >= 9999) return "Full Song";
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s > 0 ? `${m}m ${s}s` : `${m} min`;
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Likes & Dedicated "Liked Reels" Persistent Storage
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [likedTracks, setLikedTracks] = useState<MusicTrack[]>([]);
  const [likeCountMap, setLikeCountMap] = useState<Record<string, number>>({});
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [showReactionMenu, setShowReactionMenu] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<
    { id: string; emoji: string; x: number }[]
  >([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Comments State
  const [commentsMap, setCommentsMap] = useState<Record<string, ReelComment[]>>({});
  const [commentInput, setCommentInput] = useState("");
  const [isFollowing, setIsFollowing] = useState<Record<string, boolean>>({});

  const containerRef = useRef<HTMLDivElement | null>(null);
  const touchStartY = useRef<number>(0);
  const wheelTimeout = useRef<NodeJS.Timeout | null>(null);
  const doubleClickTimeout = useRef<NodeJS.Timeout | null>(null);

  // Load liked reels and map from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedTracks = localStorage.getItem("kaelixo_liked_reels_tracks");
        if (savedTracks) {
          const parsed = JSON.parse(savedTracks);
          if (Array.isArray(parsed)) {
            setLikedTracks(parsed);
            const map: Record<string, boolean> = {};
            parsed.forEach((t) => {
              if (t && t.id) map[t.id] = true;
            });
            setLikedMap(map);
          }
        } else {
          const savedLikes = localStorage.getItem("kaelixo_reels_liked");
          if (savedLikes) {
            setLikedMap(JSON.parse(savedLikes));
          }
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
      if (category === "liked") {
        return;
      }
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
    if (reels.length === 0 && activeCategory !== "liked") {
      fetchReels(activeCategory, 1, false);
    }
  }, [activeCategory, fetchReels, reels.length]);

  // When changing category
  const handleCategorySelect = (catId: string) => {
    setActiveCategory(catId);
    setPage(1);
    if (catId === "liked") {
      setReels(likedTracks);
      setActiveIndex(0);
      setCurrentSecond(0);
    } else {
      fetchReels(catId, 1, false);
    }
  };

  // Dynamic Loop & Auto-Advance Timer using customizable durationLimit
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentSecond((sec) => {
        const cur = reels[activeIndex];
        const effectiveLimit =
          durationLimit === 0 ? cur?.duration || 180 : durationLimit;
        if (sec >= effectiveLimit) {
          if (autoAdvance) {
            handleNextReel();
            return 0;
          }
          return 0;
        }
        return sec + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, autoAdvance, reels, activeIndex, durationLimit]);

  // Reset second and prefetch when reel changes
  useEffect(() => {
    setCurrentSecond(0);
    setIsPlaying(true);

    if (activeCategory !== "liked" && activeIndex >= reels.length - 3 && !isLoading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchReels(activeCategory, nextPage, true);
    }
  }, [activeIndex, reels.length, isLoading, page, activeCategory, fetchReels]);

  // Navigation handlers with smooth scrolling animation transition
  const handleNextReel = useCallback(() => {
    setScrollTransition("up");
    if (activeIndex < reels.length - 1) {
      setActiveIndex((prev) => prev + 1);
    } else {
      setActiveIndex(0);
    }
  }, [activeIndex, reels.length]);

  const handlePrevReel = useCallback(() => {
    if (activeIndex > 0) {
      setScrollTransition("down");
      setActiveIndex((prev) => prev - 1);
    }
  }, [activeIndex]);

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
        toggleMute();
      } else if (e.key.toLowerCase() === "l") {
        e.preventDefault();
        triggerLike();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, reels.length, toggleMute, togglePlayPause]);

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
      handleNextReel();
    } else if (diff < -50) {
      handlePrevReel();
    }
  };

  // Click & Double-click on video (Play/Pause vs Instagram Like)
  const handleVideoClick = () => {
    if (doubleClickTimeout.current) {
      clearTimeout(doubleClickTimeout.current);
      doubleClickTimeout.current = null;
      triggerLike();
    } else {
      doubleClickTimeout.current = setTimeout(() => {
        doubleClickTimeout.current = null;
        togglePlayPause();
      }, 250);
    }
  };

  // Filtered Reels based on search
  const filteredReels = searchQuery.trim()
    ? reels.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.artist.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : reels;

  const currentTrack = filteredReels[activeIndex] || reels[activeIndex];
  const isCurrentLiked = currentTrack ? !!likedMap[currentTrack.id] : false;

  const triggerLike = () => {
    if (!currentTrack) return;
    unlockMobileAudio();

    const trackId = currentTrack.id;
    const wasLiked = !!likedMap[trackId];
    const nextLiked = !wasLiked;

    const nextMap = { ...likedMap, [trackId]: nextLiked };
    setLikedMap(nextMap);

    let nextTracks: MusicTrack[];
    if (nextLiked) {
      const exists = likedTracks.some((t) => t.id === trackId);
      nextTracks = exists ? likedTracks : [currentTrack, ...likedTracks];
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 900);
      showToast("❤️ Saved to Liked Reels!");
    } else {
      nextTracks = likedTracks.filter((t) => t.id !== trackId);
      showToast("Removed from Liked Reels");
      if (activeCategory === "liked") {
        setReels(nextTracks);
      }
    }
    setLikedTracks(nextTracks);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("kaelixo_reels_liked", JSON.stringify(nextMap));
        localStorage.setItem("kaelixo_liked_reels_tracks", JSON.stringify(nextTracks));
      } catch {}
    }
  };

  // Floating Emoji Reaction
  const sendEmojiReaction = (emoji: string) => {
    const id = `reaction-${Date.now()}-${Math.random()}`;
    const x = Math.floor(Math.random() * 60) + 20;
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

  // Add Comment
  const handleAddComment = () => {
    if (!commentInput.trim() || !currentTrack) return;
    const newComment: ReelComment = {
      id: `c-${Date.now()}`,
      userName: currentUser?.name || "You",
      userAvatar: currentUser?.avatar,
      timeAgo: "Just now",
      text: commentInput.trim(),
      likes: 0,
    };
    setCommentsMap((prev) => ({
      ...prev,
      [currentTrack.id]: [newComment, ...(prev[currentTrack.id] || DEFAULT_COMMENTS)],
    }));
    setCommentInput("");
    showToast("Comment posted!");
  };

  // Like Comment
  const handleLikeComment = (commentId: string) => {
    if (!currentTrack) return;
    setCommentsMap((prev) => {
      const list = prev[currentTrack.id] || DEFAULT_COMMENTS;
      const updated = list.map((c) => {
        if (c.id === commentId) {
          const nextLiked = !c.likedByUser;
          return {
            ...c,
            likedByUser: nextLiked,
            likes: c.likes + (nextLiked ? 1 : -1),
          };
        }
        return c;
      });
      return { ...prev, [currentTrack.id]: updated };
    });
  };

  // Toggle Creator Follow
  const toggleFollow = (artistName: string) => {
    setIsFollowing((prev) => {
      const next = !prev[artistName];
      showToast(next ? `Following ${artistName}` : `Unfollowed ${artistName}`);
      return { ...prev, [artistName]: next };
    });
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

  const currentComments = currentTrack
    ? commentsMap[currentTrack.id] || DEFAULT_COMMENTS
    : DEFAULT_COMMENTS;

  const upNextTracks = reels.slice(activeIndex + 1, activeIndex + 5);
  const moreReels = reels.filter((_, idx) => idx !== activeIndex).slice(0, 10);

  if (reels.length === 0 && activeCategory !== "liked") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-neutral-400 space-y-4">
        <Disc3 className="w-12 h-12 text-purple-500 animate-spin" />
        <p className="text-sm font-semibold text-white">Loading viral reels...</p>
      </div>
    );
  }

  const categoryList = PRESET_CATEGORIES.map((c) =>
    c.id === "liked" ? { ...c, name: `Liked (${likedTracks.length})` } : c
  );

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="flex-1 flex flex-col h-full bg-[#0d0d12] text-white select-none overflow-y-auto scrollbar-thin relative"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 bg-neutral-900/95 backdrop-blur-md text-white px-4 py-2.5 rounded-xl shadow-2xl border border-purple-500/50 flex items-center space-x-2 text-xs font-semibold animate-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-purple-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. TOP CHANNEL SUBTABS BAR (Messages, Canvas, Files & Links, Reels) */}
      <div className="flex items-center justify-between border-b border-neutral-800/80 px-4 sm:px-6 py-2 bg-neutral-950/70 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          {onBackToJam && (
            <button
              type="button"
              onClick={onBackToJam}
              className="px-3 py-1 rounded-lg text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
            >
              Messages
            </button>
          )}
          <button
            type="button"
            className="px-3 py-1 rounded-lg text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer hidden xs:inline"
          >
            Canvas
          </button>
          <button
            type="button"
            className="px-3 py-1 rounded-lg text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer hidden sm:inline"
          >
            Files & links
          </button>

          {/* Active Reels Tab Pill matching Screenshot 2 */}
          <div className="px-3 py-1 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white flex items-center space-x-1.5 shadow-md shadow-purple-900/40">
            <Film className="w-3.5 h-3.5 fill-white" />
            <span>Reels</span>
          </div>
        </div>

        {/* Back to Jam Action Button */}
        {onBackToJam && (
          <button
            type="button"
            onClick={onBackToJam}
            className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-bold text-neutral-300 hover:text-white transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>Back to Jam</span>
          </button>
        )}
      </div>

      {/* 2. HERO MUSIC REELS TITLE & SEARCH BANNER (Exact Screenshot 2) */}
      <div className="px-4 sm:px-6 pt-4 pb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative overflow-hidden flex-shrink-0">
        <div className="relative z-10">
          <div className="flex items-center space-x-2">
            <span className="text-purple-400 text-xl font-bold">♫</span>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Music Reels
            </h1>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5 font-medium">
            Short music videos, trending tracks and team vibes
          </p>
        </div>

        {/* Search Bar matching Screenshot 2 */}
        <div className="relative w-full sm:w-64 z-10">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reels..."
            className="w-full pl-9 pr-3 py-1.5 bg-neutral-900/90 border border-neutral-800/80 rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition shadow-inner"
          />
        </div>
      </div>

      {/* 3. SLEEK CATEGORY FILTER PILLS (Exact Screenshot 2 Style) */}
      <div className="px-4 sm:px-6 py-2 flex-shrink-0">
        <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none pb-1">
          {categoryList.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategorySelect(cat.id)}
              className={`px-4 py-1.5 rounded-full text-xs transition flex items-center space-x-1.5 flex-shrink-0 cursor-pointer ${
                activeCategory === cat.id
                  ? "bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white font-bold shadow-md shadow-purple-900/40 border border-purple-400/40 scale-102"
                  : "bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 font-semibold"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={handleNextReel}
            className="w-7 h-7 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center flex-shrink-0 cursor-pointer transition"
            title="Next Reel"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4. MAIN STUDIO 3-COLUMN LAYOUT (Exact Screenshot 2) */}
      <div className="px-4 sm:px-6 py-3 flex-1 flex flex-col lg:flex-row items-start justify-center gap-5 xl:gap-6">
        {/* ================= COLUMN 1: REEL VIDEO PLAYER & ACTION BAR ================= */}
        <div className="flex items-start justify-center space-x-3 sm:space-x-3.5 mx-auto lg:mx-0 flex-shrink-0">
          {/* Vertical 9:16 Video Card */}
          <div
            key={currentTrack?.id || activeIndex}
            onClick={handleVideoClick}
            className={`relative w-[300px] xs:w-[330px] sm:w-[360px] aspect-[9/16] rounded-2xl overflow-hidden bg-black shadow-2xl border border-neutral-800 flex flex-col justify-between group select-none cursor-pointer ${
              scrollTransition === "up" ? "animate-reel-up" : "animate-reel-down"
            }`}
          >
            {/* Background YouTube Video */}
            <div className="absolute inset-0 overflow-hidden bg-neutral-950 flex items-center justify-center">
              {currentTrack && (
                <iframe
                  ref={iframeRef}
                  key={currentTrack.id}
                  src={`https://www.youtube-nocookie.com/embed/${currentTrack.id}?autoplay=1&controls=0&modestbranding=1&rel=0&playsinline=1&enablejsapi=1&loop=1&playlist=${currentTrack.id}`}
                  title={currentTrack.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  onLoad={() => {
                    if (isMutedRef.current) {
                      postYtReelCommand("mute");
                    }
                    if (!isPlaying) {
                      postYtReelCommand("pauseVideo");
                    }
                  }}
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

              {/* Blurred background backdrop for 'fit' mode */}
              {fitMode === "fit" && currentTrack && (
                <div
                  className="absolute inset-0 -z-10 bg-cover bg-center filter blur-2xl opacity-40 scale-125"
                  style={{ backgroundImage: `url(${currentTrack.thumbnail})` }}
                />
              )}
            </div>

            {/* Dark gradient overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/85 pointer-events-none" />

            {/* Floating emoji reactions */}
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

            {/* Heart Burst on Like */}
            {showHeartBurst && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40 animate-in zoom-in-50 duration-300">
                <Heart className="w-24 h-24 text-rose-500 fill-rose-500 drop-shadow-2xl animate-pulse" />
              </div>
            )}

            {/* Play / Pause Center Fade Icon */}
            {showPlayPauseIcon && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40 animate-in fade-in zoom-in-75 duration-200">
                <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white shadow-xl">
                  {showPlayPauseIcon === "play" ? (
                    <Play className="w-8 h-8 fill-current ml-1 text-purple-400" />
                  ) : (
                    <Pause className="w-8 h-8 fill-current text-white" />
                  )}
                </div>
              </div>
            )}

            {/* Top Bar Badges inside Video (Exact Screenshot 2) */}
            <div className="relative z-20 p-3 flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center space-x-1.5 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 shadow-sm">
                <Sparkles className="w-3 h-3 text-purple-400 animate-pulse" />
                <span className="text-[11px] text-white/90">
                  Reel {activeIndex + 1} of {reels.length}
                </span>
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMoreMenu(true);
                  }}
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/50 hover:bg-neutral-800 text-purple-300 border border-purple-500/30 backdrop-blur-md transition flex items-center space-x-1 cursor-pointer"
                  title="Click to customize duration"
                >
                  <Clock className="w-3 h-3 text-purple-400" />
                  <span>{formatDurationLabel(durationLimit)}</span>
                </button>
              </div>
            </div>

            {/* Bottom Scrubber & Embedded Controls inside Video (Exact Screenshot 2) */}
            <div className="relative z-20 p-3 pb-3 space-y-2">
              <div className="flex items-center justify-between text-white/90 text-xs">
                {/* Play / Pause toggle */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlayPause();
                  }}
                  className="p-1 rounded-full hover:bg-white/20 transition cursor-pointer"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </button>

                {/* Timestamps */}
                <span className="text-[11px] font-mono text-white/80">
                  {formatTime(currentSecond)} /{" "}
                  {formatTime(
                    durationLimit === 0 ? currentTrack?.duration || 180 : durationLimit
                  )}
                </span>

                <div className="flex items-center space-x-2">
                  {/* Sound Toggle */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMute();
                    }}
                    className="p-1 rounded-full hover:bg-white/20 transition cursor-pointer text-white/90"
                    title={isMuted ? "Unmute (M)" : "Mute (M)"}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>

                  {/* Aspect Ratio Mode */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFitMode((m) => (m === "fill" ? "fit" : "fill"));
                    }}
                    className="p-1 rounded-full hover:bg-white/20 transition cursor-pointer text-white/90"
                    title="Toggle Aspect Ratio"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm relative">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 transition-all duration-1000 ease-linear rounded-full shadow-[0_0_8px_rgba(168,85,247,0.7)]"
                  style={{
                    width: `${
                      durationLimit === 0
                        ? Math.min(100, (currentSecond / (currentTrack?.duration || 180)) * 100)
                        : Math.min(100, (currentSecond / durationLimit) * 100)
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Vertical Floating Action Icons right beside the Video (Exact Screenshot 2) */}
          <div className="flex flex-col items-center justify-end space-y-3.5 pt-12">
            {/* 1. Like Heart Button */}
            <div className="flex flex-col items-center space-y-1">
              <button
                type="button"
                onClick={triggerLike}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition shadow-xl cursor-pointer ${
                  isCurrentLiked
                    ? "bg-rose-600 text-white scale-110 shadow-rose-500/40"
                    : "bg-neutral-900/90 hover:bg-neutral-800 text-white border border-neutral-800 hover:scale-105"
                }`}
                title="Like Reel (L)"
              >
                <Heart
                  className={`w-4 h-4 ${isCurrentLiked ? "fill-white text-white" : "text-white"}`}
                />
              </button>
              <span className="text-[10px] font-bold text-neutral-400">
                {currentTrack ? getLikeCount(currentTrack.id) : 96}
              </span>
            </div>

            {/* 2. Comments Icon */}
            <div className="flex flex-col items-center space-y-1">
              <button
                type="button"
                onClick={() => {
                  const inputEl = document.getElementById("reel-comment-input");
                  inputEl?.focus();
                }}
                className="w-10 h-10 rounded-full bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 flex items-center justify-center text-white transition shadow-xl cursor-pointer hover:scale-105"
                title="View Comments"
              >
                <MessageCircle className="w-4 h-4 text-white" />
              </button>
              <span className="text-[10px] font-bold text-neutral-400">
                {currentComments.length}
              </span>
            </div>

            {/* 3. Share / Play in Jam Button */}
            <div className="flex flex-col items-center space-y-1">
              <button
                type="button"
                onClick={handlePlayFullSong}
                className="w-10 h-10 rounded-full bg-neutral-900/90 hover:bg-purple-600 border border-neutral-800 hover:border-purple-500 flex items-center justify-center text-white transition shadow-xl cursor-pointer hover:scale-105"
                title="Play full track in channel Jam"
              >
                <Share2 className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* 4. Bookmark / Save to Liked */}
            <div className="flex flex-col items-center space-y-1">
              <button
                type="button"
                onClick={triggerLike}
                className={`w-10 h-10 rounded-full border border-neutral-800 flex items-center justify-center transition shadow-xl cursor-pointer hover:scale-105 ${
                  isCurrentLiked
                    ? "bg-purple-600 text-white border-purple-500"
                    : "bg-neutral-900/90 hover:bg-neutral-800 text-white"
                }`}
                title="Save Reel to Liked Shelf"
              >
                <Bookmark
                  className={`w-4 h-4 ${isCurrentLiked ? "fill-white" : ""}`}
                />
              </button>
            </div>

            {/* 5. Three Dots More Options Button */}
            <div className="relative flex flex-col items-center space-y-1">
              <button
                type="button"
                onClick={() => setShowMoreMenu((v) => !v)}
                className={`w-10 h-10 rounded-full border border-neutral-800 flex items-center justify-center transition shadow-xl cursor-pointer hover:scale-105 ${
                  showMoreMenu ? "bg-purple-600 text-white" : "bg-neutral-900/90 hover:bg-neutral-800 text-white"
                }`}
                title="More Reel Settings"
              >
                <MoreVertical className="w-4 h-4 text-white" />
              </button>

              {/* Three Dots Dropdown Popover */}
              {showMoreMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
                    onClick={() => setShowMoreMenu(false)}
                  />
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-12 bottom-0 z-50 w-72 bg-neutral-900/95 backdrop-blur-2xl border border-neutral-700/80 rounded-2xl p-3.5 shadow-2xl animate-in zoom-in-95 duration-150 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-white">
                        <MoreHorizontal className="w-4 h-4 text-purple-400" />
                        <span>Reel Settings</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowMoreMenu(false)}
                        className="text-neutral-400 hover:text-white p-1 rounded-md text-xs font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Clip Duration Limit Grid */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-bold text-neutral-300 mb-1.5">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-purple-400" />
                          <span>Duration Limit:</span>
                        </span>
                        <span className="text-purple-400 font-extrabold">{formatDurationLabel(durationLimit)}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1 text-[10px] font-bold">
                        {[
                          { label: "15s", sec: 15 },
                          { label: "30s", sec: 30 },
                          { label: "45s", sec: 45 },
                          { label: "1m", sec: 60 },
                          { label: "1.5m", sec: 90 },
                          { label: "2m", sec: 120 },
                          { label: "3m", sec: 180 },
                          { label: "Full", sec: 0 },
                        ].map((opt) => (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => changeDurationLimit(opt.sec)}
                            className={`py-1.5 px-1 rounded-lg text-center transition cursor-pointer border ${
                              durationLimit === opt.sec
                                ? "bg-purple-600 text-white border-purple-500 shadow-sm"
                                : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700/60"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      {/* Custom seconds input */}
                      <div className="pt-2 flex items-center space-x-1.5">
                        <input
                          type="number"
                          min="5"
                          max="600"
                          value={customInputSeconds}
                          onChange={(e) => setCustomInputSeconds(e.target.value)}
                          placeholder="Custom sec (e.g. 25)"
                          className="flex-1 px-2.5 py-1 bg-neutral-800 border border-neutral-700 rounded-lg text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const val = parseInt(customInputSeconds, 10);
                              if (!isNaN(val) && val > 0) {
                                changeDurationLimit(val);
                                setCustomInputSeconds("");
                              }
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const val = parseInt(customInputSeconds, 10);
                            if (!isNaN(val) && val > 0) {
                              changeDurationLimit(val);
                              setCustomInputSeconds("");
                            }
                          }}
                          className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                        >
                          Set
                        </button>
                      </div>
                    </div>

                    {/* Quick action list */}
                    <div className="space-y-1 pt-1.5 border-t border-neutral-800">
                      <button
                        type="button"
                        onClick={() => {
                          handleAddToQueue();
                          setShowMoreMenu(false);
                        }}
                        className="w-full px-2.5 py-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700/80 text-white text-xs font-semibold flex items-center justify-between transition cursor-pointer"
                      >
                        <span className="flex items-center space-x-2">
                          <ListPlus className="w-4 h-4 text-emerald-400" />
                          <span>Add to Jam Queue</span>
                        </span>
                        <span className="text-[10px] text-neutral-400">+ Queue</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCurrentSecond(0);
                          setIsPlaying(true);
                          postYtReelCommand("seekTo", [0, true]);
                          postYtReelCommand("playVideo");
                          showToast("Replayed clip");
                          setShowMoreMenu(false);
                        }}
                        className="w-full px-2.5 py-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700/80 text-white text-xs font-semibold flex items-center justify-between transition cursor-pointer"
                      >
                        <span className="flex items-center space-x-2">
                          <RotateCcw className="w-4 h-4 text-blue-400" />
                          <span>Replay from Start</span>
                        </span>
                        <span className="text-[10px] text-neutral-400">0:00</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAutoAdvance((v) => !v);
                          showToast(autoAdvance ? "Auto-Next disabled" : "Auto-Next enabled");
                        }}
                        className="w-full px-2.5 py-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700/80 text-white text-xs font-semibold flex items-center justify-between transition cursor-pointer"
                      >
                        <span className="flex items-center space-x-2">
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          <span>Auto-Advance</span>
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${autoAdvance ? "bg-purple-500/20 text-purple-400" : "bg-neutral-700 text-neutral-400"}`}>
                          {autoAdvance ? "ON" : "OFF"}
                        </span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ================= COLUMN 2: TRACK DETAILS & COMMENTS PANEL (Exact Screenshot 2) ================= */}
        <div className="w-full lg:flex-1 max-w-xl bg-neutral-900/60 border border-neutral-800/90 rounded-2xl p-4 sm:p-5 flex flex-col justify-between backdrop-blur-md shadow-xl min-h-[480px]">
          <div>
            {/* Creator Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-neutral-700 bg-neutral-800 flex-shrink-0">
                  <img
                    src={currentTrack?.thumbnail}
                    alt={currentTrack?.artist}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <p className="text-sm font-bold text-white hover:underline cursor-pointer">
                      {cleanArtistName(currentTrack?.artist || "Creator")}
                    </p>
                    <span className="w-3.5 h-3.5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px] font-bold">
                      ✓
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-400">
                    2 days ago • Viral Track
                  </span>
                </div>
              </div>

              {/* Follow Button matching Screenshot 2 */}
              <button
                type="button"
                onClick={() => toggleFollow(currentTrack?.artist || "Artist")}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-md ${
                  isFollowing[currentTrack?.artist || ""]
                    ? "bg-neutral-800 text-neutral-300 border border-neutral-700"
                    : "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/30"
                }`}
              >
                {isFollowing[currentTrack?.artist || ""] ? "Following" : "Follow"}
              </button>
            </div>

            {/* Song Title (Clean, Bold) */}
            <div className="mt-3.5">
              <h2 className="text-base sm:text-lg font-extrabold text-white leading-snug">
                {cleanSongTitle(currentTrack?.title || "Song Title")}
              </h2>

              {/* Audio Subtitle / Description */}
              <div className="mt-1 text-xs text-neutral-300 flex items-start space-x-1.5">
                <span className="text-rose-400">♫</span>
                <p className={`text-neutral-400 leading-relaxed ${showDescriptionMore ? "" : "line-clamp-2"}`}>
                  {cleanSongTitle(currentTrack?.title || "")} - Top Viral Songs 2025 • Billboard Hits, Team Jam & Discover.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDescriptionMore((v) => !v)}
                className="text-[11px] font-bold text-purple-400 hover:text-purple-300 mt-1 cursor-pointer"
              >
                {showDescriptionMore ? "Show less ▴" : "Show more ▾"}
              </button>

              {/* Hashtags matching Screenshot 2 */}
              <div className="flex items-center space-x-2 mt-2.5">
                <span className="text-xs font-semibold text-purple-400 hover:underline cursor-pointer">
                  #Pop
                </span>
                <span className="text-xs font-semibold text-purple-400 hover:underline cursor-pointer">
                  #TopHits
                </span>
                <span className="text-xs font-semibold text-purple-400 hover:underline cursor-pointer">
                  #Music2025
                </span>
                <span className="text-xs font-semibold text-purple-400 hover:underline cursor-pointer">
                  #KaelixoJam
                </span>
              </div>
            </div>

            {/* Comments Section (Exact Screenshot 2) */}
            <div className="mt-5 border-t border-neutral-800/80 pt-3">
              <h3 className="text-xs font-bold text-neutral-300 mb-3">
                Comments ({currentComments.length})
              </h3>

              {/* Comments Feed */}
              <div className="space-y-3 max-h-44 overflow-y-auto pr-1 scrollbar-thin">
                {currentComments.map((comment) => (
                  <div key={comment.id} className="flex items-start justify-between text-xs group">
                    <div className="flex items-start space-x-2.5">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                        {comment.userName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-white">{comment.userName}</span>
                          <span className="text-[10px] text-neutral-500">{comment.timeAgo}</span>
                        </div>
                        <p className="text-neutral-300 mt-0.5">{comment.text}</p>
                      </div>
                    </div>

                    {/* Like on comment */}
                    <button
                      type="button"
                      onClick={() => handleLikeComment(comment.id)}
                      className="flex items-center space-x-1 text-neutral-400 hover:text-rose-400 transition cursor-pointer pt-0.5"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          comment.likedByUser ? "fill-rose-500 text-rose-500" : ""
                        }`}
                      />
                      <span className="text-[10px]">{comment.likes}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Comment Input Bar matching Screenshot 2 */}
          <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center space-x-2">
            <input
              id="reel-comment-input"
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 px-3 py-2 bg-neutral-800/90 border border-neutral-700/80 rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddComment();
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddComment}
              className="p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-900/40 transition cursor-pointer"
              title="Post comment"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ================= COLUMN 3: "UP NEXT" QUEUE (Exact Screenshot 2) ================= */}
        <div className="w-full lg:w-64 xl:w-72 bg-neutral-900/40 border border-neutral-800/70 rounded-2xl p-4 flex flex-col justify-start backdrop-blur-md shadow-lg flex-shrink-0">
          <div className="flex items-center justify-between mb-3 border-b border-neutral-800/80 pb-2">
            <h3 className="text-xs font-bold text-white">Up Next</h3>
            <span className="text-[10px] text-purple-400 font-semibold cursor-pointer hover:underline" onClick={handleNextReel}>
              Next Reel →
            </span>
          </div>

          {/* Up Next List */}
          <div className="space-y-2.5">
            {upNextTracks.length > 0 ? (
              upNextTracks.map((track, i) => (
                <div
                  key={track.id}
                  onClick={() => {
                    const targetIdx = reels.findIndex((r) => r.id === track.id);
                    if (targetIdx !== -1) {
                      setScrollTransition("up");
                      setActiveIndex(targetIdx);
                    }
                  }}
                  className="flex items-center space-x-2.5 p-1.5 rounded-xl hover:bg-neutral-800/60 transition cursor-pointer group"
                >
                  {/* Thumbnail with hover play icon */}
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-neutral-800 flex-shrink-0 border border-neutral-700/60">
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <Play className="w-4 h-4 fill-white text-white" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate group-hover:text-purple-300 transition">
                      {cleanSongTitle(track.title)}
                    </p>
                    <p className="text-[10px] text-neutral-400 truncate">
                      {cleanArtistName(track.artist)} • {formatTime(track.duration || 180)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-neutral-500 py-4 text-center">
                End of playlist. Loop around for more reels!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 5. BOTTOM SHELF: "MORE REELS FOR YOU" CAROUSEL (Exact Screenshot 2) */}
      <div className="px-4 sm:px-6 pt-3 pb-6 border-t border-neutral-800/80 mt-2 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Film className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-bold text-white">More Reels for You</h3>
          </div>
          <button
            type="button"
            onClick={handleNextReel}
            className="text-[11px] font-bold text-purple-400 hover:text-purple-300 flex items-center space-x-1 cursor-pointer"
          >
            <span>View All</span>
            <span>→</span>
          </button>
        </div>

        {/* Horizontal Carousel */}
        <div className="flex items-center space-x-3 overflow-x-auto scrollbar-none pb-2">
          {moreReels.map((track) => (
            <div
              key={track.id}
              onClick={() => {
                const targetIdx = reels.findIndex((r) => r.id === track.id);
                if (targetIdx !== -1) {
                  setScrollTransition("up");
                  setActiveIndex(targetIdx);
                }
              }}
              className="group relative w-36 sm:w-44 aspect-[16/10] rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 flex-shrink-0 cursor-pointer shadow-md hover:border-purple-500/60 transition"
            >
              <img
                src={track.thumbnail}
                alt={track.title}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-2">
                <div className="w-6 h-6 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center self-end opacity-80 group-hover:opacity-100 group-hover:bg-purple-600 transition">
                  <Play className="w-3 h-3 fill-white text-white ml-0.5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-white truncate drop-shadow-sm">
                    {cleanSongTitle(track.title)}
                  </p>
                  <p className="text-[9px] text-neutral-400 truncate">
                    {cleanArtistName(track.artist)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Global CSS for floating reactions and snap-scrolling transitions */}
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

        @keyframes reelSlideInUp {
          0% {
            opacity: 0.35;
            transform: translateY(50px) scale(0.97);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes reelSlideInDown {
          0% {
            opacity: 0.35;
            transform: translateY(-50px) scale(0.97);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .animate-reel-up {
          animation: reelSlideInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .animate-reel-down {
          animation: reelSlideInDown 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
