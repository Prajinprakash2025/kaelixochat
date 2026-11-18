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
  VolumeX,
  ChevronDown,
  X,
  Plus,
  Shuffle,
  RotateCcw,
  Tag,
  Film,
  Radio,
  Heart,
  Home,
  Music,
  FolderPlus,
  Compass,
  Download,
  SkipForward,
  SkipBack,
  Repeat,
  Headphones,
  Mic2,
  Library,
  Clock,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Share2,
  Maximize2,
  MoreVertical,
  CheckCircle2,
  TrendingUp,
  Folder,
  Layers,
  Smile,
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

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  songCount: number;
  icon?: string;
  thumbnail?: string;
  gradient?: string;
  isCustom?: boolean;
}

// Clean YouTube song titles to remove ugly SEO clutter
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
  return clean.length >= 2 ? clean : title.split("|")[0].trim() || title;
}

export function cleanArtistName(artist: string): string {
  if (!artist) return "Artist";
  return artist
    .replace(/\s*-\s*topic/gi, "")
    .replace(/\s*official/gi, "")
    .trim() || artist;
}

// Curated Initial Trending Tracks (matching screenshot)
const INITIAL_TRENDING_TRACKS: MusicTrack[] = [
  {
    id: "a3Ue-LN5B9U",
    title: "Aavesham (From Aavesham)",
    artist: "Sushin Shyam",
    thumbnail: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80",
    duration: 220,
    durationFormatted: "03:40",
    url: "https://www.youtube.com/watch?v=a3Ue-LN5B9U",
    source: "youtube",
  },
  {
    id: "tOM-nWPcR4U",
    title: "Illuminati",
    artist: "Dabzee",
    thumbnail: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80",
    duration: 198,
    durationFormatted: "03:18",
    url: "https://www.youtube.com/watch?v=tOM-nWPcR4U",
    source: "youtube",
  },
  {
    id: "B9rx8j9Qh-A",
    title: "Manjummel Boys",
    artist: "Sushin Shyam",
    thumbnail: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80",
    duration: 235,
    durationFormatted: "03:55",
    url: "https://www.youtube.com/watch?v=B9rx8j9Qh-A",
    source: "youtube",
  },
  {
    id: "eH3GzNx56UQ",
    title: "Premalu",
    artist: "Vishnu Vijay",
    thumbnail: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=800&q=80",
    duration: 210,
    durationFormatted: "03:30",
    url: "https://www.youtube.com/watch?v=eH3GzNx56UQ",
    source: "youtube",
  },
  {
    id: "l4Z8a-XmY4Q",
    title: "Kadha Thudarunnu",
    artist: "Sushin Shyam",
    thumbnail: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80",
    duration: 245,
    durationFormatted: "04:05",
    url: "https://www.youtube.com/watch?v=l4Z8a-XmY4Q",
    source: "youtube",
  },
];

// Curated Playlists (matching screenshot)
const INITIAL_PLAYLISTS: Playlist[] = [
  {
    id: "liked",
    name: "Liked Songs",
    songCount: 128,
    icon: "❤️",
    gradient: "from-rose-500 to-pink-600",
  },
  {
    id: "malayalam-hits",
    name: "Malayalam Hits",
    songCount: 64,
    thumbnail: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80",
    gradient: "from-amber-500 to-orange-600",
  },
  {
    id: "workout-mix",
    name: "Workout Mix",
    songCount: 42,
    thumbnail: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=400&q=80",
    gradient: "from-purple-600 to-indigo-700",
  },
  {
    id: "chill-vibes",
    name: "Chill Vibes",
    songCount: 56,
    thumbnail: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80",
    gradient: "from-blue-500 to-cyan-600",
  },
  {
    id: "coding-flow",
    name: "Coding Flow",
    songCount: 38,
    thumbnail: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=400&q=80",
    gradient: "from-emerald-500 to-teal-700",
  },
];

// Sub-nav Pills
const NAV_TABS = [
  { id: "home", label: "Home", icon: Home },
  { id: "songs", label: "Songs", icon: Music },
  { id: "playlists", label: "Playlists", icon: Library },
  { id: "artists", label: "Artists", icon: Mic2 },
  { id: "albums", label: "Albums", icon: Disc3 },
  { id: "genres", label: "Genres", icon: Tag },
  { id: "liked", label: "Liked", icon: Heart },
  { id: "recent", label: "Recently Played", icon: Clock },
];

export function MusicChannelView({
  currentUser,
  messages,
  onSendMessage,
}: MusicChannelViewProps) {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playTrack,
    togglePlay,
    seekTo,
    toggleMute,
    playNext,
    playPrevious,
    addToQueue,
    setPlaylist,
    hiddenTrackIds,
    hideTrack,
    unlockMobileAudio,
  } = useMusic();

  // Navigation & View Mode
  const [activeTab, setActiveTab] = useState<string>("home");
  const [viewMode, setViewMode] = useState<"jam" | "reels">("jam");
  const [reelsInitialIndex, setReelsInitialIndex] = useState(0);
  const [reelsCategory, setReelsCategory] = useState<string>("reels");

  // Dynamic Content & Playlists
  const [trendingTracks, setTrendingTracks] = useState<MusicTrack[]>(INITIAL_TRENDING_TRACKS);
  const [playlists, setPlaylists] = useState<Playlist[]>(INITIAL_PLAYLISTS);
  const [activeCategory, setActiveCategory] = useState<string>("trending");
  const [catalogTracks, setCatalogTracks] = useState<MusicTrack[]>(INITIAL_TRENDING_TRACKS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);

  // Likes & History
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [likedTracks, setLikedTracks] = useState<MusicTrack[]>([]);
  const [recentTracks, setRecentTracks] = useState<MusicTrack[]>([]);

  // Modals & User Actions
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState<boolean>(false);
  const [newPlaylistName, setNewPlaylistName] = useState<string>("");
  const [newPlaylistDesc, setNewPlaylistDesc] = useState<string>("");
  const [newPlaylistIcon, setNewPlaylistIcon] = useState<string>("🎵");
  const [newPlaylistColor, setNewPlaylistColor] = useState<string>("from-purple-600 to-pink-600");

  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importUrl, setImportUrl] = useState<string>("");
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Search
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<MusicTrack[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const observerTargetRef = useRef<HTMLDivElement | null>(null);

  // Load custom playlists and liked songs from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedPlaylists = localStorage.getItem("kaelixo_custom_playlists");
        if (savedPlaylists) {
          const parsed = JSON.parse(savedPlaylists);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPlaylists([...INITIAL_PLAYLISTS, ...parsed]);
          }
        }
        const savedLikes = localStorage.getItem("kaelixo_liked_songs");
        if (savedLikes) {
          const parsedLikes = JSON.parse(savedLikes);
          if (Array.isArray(parsedLikes)) {
            setLikedTracks(parsedLikes);
            const map: Record<string, boolean> = {};
            parsedLikes.forEach((t) => {
              if (t?.id) map[t.id] = true;
            });
            setLikedMap(map);
          }
        }
        const savedRecent = localStorage.getItem("kaelixo_recently_played_tracks");
        if (savedRecent) {
          setRecentTracks(JSON.parse(savedRecent));
        }
      } catch (err) {
        console.warn("Error reading localStorage:", err);
      }
    }
  }, []);

  // Sync Recently Played when currentTrack changes
  useEffect(() => {
    if (currentTrack) {
      setRecentTracks((prev) => {
        const filtered = prev.filter((t) => t.id !== currentTrack.id);
        const updated = [currentTrack, ...filtered].slice(0, 30);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("kaelixo_recently_played_tracks", JSON.stringify(updated));
          } catch {}
        }
        return updated;
      });
    }
  }, [currentTrack]);

  // Fetch Tracks from YouTube API for active category
  const fetchCategoryTracks = useCallback(
    async (cat: string, pageNum: number, append: boolean = false) => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/music/search?category=${encodeURIComponent(cat)}&page=${pageNum}&seed=${Date.now()}`
        );
        const data = await res.json();
        if (data.tracks && data.tracks.length > 0) {
          if (append) {
            setCatalogTracks((prev) => {
              const seen = new Set(prev.map((t) => t.id));
              const fresh = data.tracks.filter((t: MusicTrack) => !seen.has(t.id));
              return [...prev, ...fresh];
            });
          } else {
            setCatalogTracks(data.tracks);
            if (cat === "trending") {
              setTrendingTracks(data.tracks.slice(0, 5));
            }
          }
          setHasMore(data.hasMore !== false);
        }
      } catch (err) {
        console.warn("Failed to fetch tracks:", err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchCategoryTracks(activeCategory, 1, false);
  }, [activeCategory, fetchCategoryTracks]);

  // Search handler
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Play Track Handler
  const handlePlaySong = (track: MusicTrack, playlistPool?: MusicTrack[]) => {
    unlockMobileAudio();
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      const pool = playlistPool || catalogTracks;
      playTrack(track, 0, pool);
      showToast(`Now Playing "${cleanSongTitle(track.title)}"`);
    }
  };

  // Like Song Toggle
  const toggleLike = (track: MusicTrack) => {
    const isLiked = !likedMap[track.id];
    const newMap = { ...likedMap, [track.id]: isLiked };
    setLikedMap(newMap);

    let newLikedTracks: MusicTrack[];
    if (isLiked) {
      newLikedTracks = [track, ...likedTracks.filter((t) => t.id !== track.id)];
      showToast(`❤️ Saved to Liked Songs`);
    } else {
      newLikedTracks = likedTracks.filter((t) => t.id !== track.id);
      showToast(`Removed from Liked Songs`);
    }
    setLikedTracks(newLikedTracks);

    // Update Liked Songs count in Playlists
    setPlaylists((prev) =>
      prev.map((p) => (p.id === "liked" ? { ...p, songCount: newLikedTracks.length } : p))
    );

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("kaelixo_liked_songs", JSON.stringify(newLikedTracks));
      } catch {}
    }
  };

  // Create Playlist Action
  const handleCreatePlaylist = () => {
    const name = newPlaylistName.trim();
    if (!name) return;
    const newPl: Playlist = {
      id: `pl-${Date.now()}`,
      name,
      description: newPlaylistDesc.trim() || "Custom Team Playlist",
      songCount: 0,
      icon: newPlaylistIcon,
      gradient: newPlaylistColor,
      isCustom: true,
    };
    const updated = [...playlists, newPl];
    setPlaylists(updated);
    if (typeof window !== "undefined") {
      try {
        const customOnly = updated.filter((p) => p.isCustom);
        localStorage.setItem("kaelixo_custom_playlists", JSON.stringify(customOnly));
      } catch {}
    }
    setIsCreatePlaylistOpen(false);
    setNewPlaylistName("");
    setNewPlaylistDesc("");
    showToast(`✨ Created playlist "${name}"!`);
  };

  // Discover Action (picks surprise track & plays)
  const handleDiscover = () => {
    unlockMobileAudio();
    const pool = catalogTracks.length > 0 ? catalogTracks : trendingTracks;
    if (pool.length === 0) return;
    const randomTrack = pool[Math.floor(Math.random() * pool.length)];
    playTrack(randomTrack, 0, pool);
    showToast(`🔮 Discovered: "${cleanSongTitle(randomTrack.title)}"`);
  };

  // Shuffle Play Action
  const handleShufflePlay = () => {
    unlockMobileAudio();
    const pool = [...catalogTracks];
    if (pool.length === 0) return;
    // Fisher-Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    playTrack(pool[0], 0, pool);
    showToast(`🔀 Shuffled & playing ${pool.length} tracks!`);
  };

  // Import from YouTube Action
  const handleImportYouTube = async () => {
    const url = importUrl.trim();
    if (!url) return;
    setIsImporting(true);
    try {
      let query = url;
      // Extract video ID if standard YouTube link
      const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      if (match && match[1]) {
        query = match[1];
      }
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.tracks && data.tracks.length > 0) {
        const track = data.tracks[0];
        handlePlaySong(track);
        setIsImportModalOpen(false);
        setImportUrl("");
        showToast(`Imported & playing "${cleanSongTitle(track.title)}"!`);
      } else {
        showToast("Could not find video. Try search keyword instead.");
      }
    } catch (err) {
      showToast("Import failed. Check connection.");
    } finally {
      setIsImporting(false);
    }
  };

  // Scrubber Seek Handler
  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    const effectiveDuration = duration || activeDisplayTrack.duration || 220;
    const targetSecond = Math.floor(percent * effectiveDuration);
    seekTo(targetSecond);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Display track: current active track or fallback to first trending track
  const activeDisplayTrack = currentTrack || trendingTracks[0] || INITIAL_TRENDING_TRACKS[0];
  const isDisplayLiked = activeDisplayTrack ? !!likedMap[activeDisplayTrack.id] : false;
  const effectiveDuration = duration || activeDisplayTrack?.duration || 220;
  const progressPercent = Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100));

  // If user opened 60s Music Reels (Instagram feed view)
  if (viewMode === "reels") {
    return (
      <MusicReelsView
        initialTracks={catalogTracks}
        initialIndex={reelsInitialIndex}
        initialCategory={reelsCategory}
        onPlayFullTrack={(track) => {
          handlePlaySong(track);
          setViewMode("jam");
        }}
        onAddToQueue={(track) => {
          addToQueue(track);
          showToast(`Added "${cleanSongTitle(track.title)}" to queue`);
        }}
        onBackToJam={() => setViewMode("jam")}
        currentUser={currentUser}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d0d12] text-white select-none overflow-y-auto scrollbar-thin relative pb-28">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 bg-neutral-900/95 backdrop-blur-md text-white px-4 py-2.5 rounded-xl shadow-2xl border border-purple-500/50 flex items-center space-x-2 text-xs font-semibold animate-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-purple-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. TOP CHANNEL SUB-TABS (Messages, Canvas, Files & Links, Active Purple Music Tab) */}
      <div className="flex items-center justify-between border-b border-neutral-800/80 px-4 sm:px-6 py-2.5 bg-neutral-950/70 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <button
            type="button"
            className="px-3 py-1 rounded-lg text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            Messages
          </button>
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

          {/* Active Music Tab Pill matching Screenshot */}
          <div className="px-3.5 py-1 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white flex items-center space-x-1.5 shadow-md shadow-purple-900/40">
            <Music className="w-3.5 h-3.5 fill-white" />
            <span>Music</span>
          </div>
        </div>

        {/* Switch to Reels Studio button */}
        <button
          type="button"
          onClick={() => {
            setReelsCategory("reels");
            setReelsInitialIndex(0);
            setViewMode("reels");
          }}
          className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-gradient-to-r hover:from-purple-600 hover:to-pink-600 border border-neutral-800 hover:border-transparent text-xs font-bold text-neutral-300 hover:text-white transition flex items-center space-x-1.5 cursor-pointer shadow-xs group"
          title="Switch to 9:16 Video Reels View"
        >
          <Film className="w-3.5 h-3.5 text-pink-400 group-hover:text-white" />
          <span>📱 Switch to Reels</span>
        </button>
      </div>

      {/* 2. HERO KAELIXO MUSIC HEADER WITH SOUNDWAVE GRAPHIC (Exact Screenshot) */}
      <div className="px-4 sm:px-6 pt-5 pb-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-purple-950/30 via-neutral-900/60 to-purple-900/20 border border-purple-500/20 rounded-2xl p-5 relative overflow-hidden backdrop-blur-md shadow-xl">
          {/* Left Title & Subtitle */}
          <div className="flex items-center space-x-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-purple-900/50 flex-shrink-0">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center space-x-2">
                <span>Kaelixo Music</span>
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400 mt-0.5 font-medium">
                Stream, organize and jam your favorite songs
              </p>
            </div>
          </div>

          {/* Right Glowing Soundwave Art Graphic */}
          <div className="hidden md:flex items-center space-x-3 opacity-90 pointer-events-none">
            <div className="flex items-center space-x-1 h-8">
              {[40, 70, 45, 90, 60, 30, 85, 100, 50, 75, 40, 65, 80, 55, 95, 35].map((h, i) => (
                <span
                  key={i}
                  className="w-1 bg-gradient-to-t from-purple-500 to-pink-400 rounded-full animate-pulse"
                  style={{
                    height: `${h}%`,
                    animationDelay: `${i * 80}ms`,
                  }}
                />
              ))}
            </div>
            <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Disc3 className="w-6 h-6 animate-spin duration-3000" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. SUB-NAVIGATION PILL BAR (Exact Screenshot: Home, Songs, Playlists, Artists, Albums, Genres, Liked, Recently Played) */}
      <div className="px-4 sm:px-6 py-2 flex items-center space-x-2 overflow-x-auto scrollbar-none flex-shrink-0">
        {NAV_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === "liked") {
                  setCatalogTracks(likedTracks);
                } else if (tab.id === "recent") {
                  setCatalogTracks(recentTracks);
                } else if (tab.id === "home") {
                  fetchCategoryTracks("trending", 1, false);
                }
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 flex-shrink-0 cursor-pointer shadow-xs border ${
                isActive
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white border-transparent shadow-purple-900/40 scale-102"
                  : "bg-neutral-900/90 hover:bg-neutral-800 text-neutral-400 hover:text-white border-neutral-800"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.id === "liked" && likedTracks.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 font-extrabold">
                  {likedTracks.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. MAIN DASHBOARD CONTENT */}
      <div className="px-4 sm:px-6 py-3 space-y-6">
        {/* ================= HERO TWO-PANEL SECTION: NOW PLAYING & QUICK ACTIONS (Exact Screenshot) ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT CARD: NOW PLAYING CARD (Exact Screenshot) */}
          <div className="lg:col-span-8 bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-5 backdrop-blur-md shadow-xl relative overflow-hidden">
            {/* Square Album Cover with Floating Heart Button */}
            <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden shadow-2xl bg-neutral-950 flex-shrink-0 group">
              <img
                src={activeDisplayTrack.thumbnail}
                alt={activeDisplayTrack.title}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

              {/* Floating Heart Button */}
              <button
                type="button"
                onClick={() => toggleLike(activeDisplayTrack)}
                className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition shadow-lg cursor-pointer backdrop-blur-md ${
                  isDisplayLiked
                    ? "bg-rose-600 text-white scale-110"
                    : "bg-black/60 hover:bg-black/80 text-white/90 hover:text-white"
                }`}
                title="Like Song"
              >
                <Heart className={`w-4 h-4 ${isDisplayLiked ? "fill-white text-white" : ""}`} />
              </button>
            </div>

            {/* Right: Track Info, Scrubber Timeline & Playback Controls */}
            <div className="flex-1 w-full flex flex-col justify-between space-y-3 min-w-0">
              <div>
                {/* Now Playing Tag */}
                <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-400 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="tracking-wide uppercase text-[10px]">Now Playing</span>
                </div>

                {/* Song Title & Artist */}
                <h2 className="text-lg sm:text-xl font-extrabold text-white truncate drop-shadow-sm">
                  {cleanSongTitle(activeDisplayTrack.title)}
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400 font-medium truncate mt-0.5">
                  {cleanArtistName(activeDisplayTrack.artist)}
                </p>
              </div>

              {/* Progress Scrubber Line */}
              <div className="space-y-1.5">
                <div className="flex items-center space-x-3 text-[11px] font-mono text-neutral-400">
                  <span>{formatTime(currentTime)}</span>
                  <div
                    ref={progressBarRef}
                    onClick={handleScrubberClick}
                    className="flex-1 h-1.5 bg-neutral-800 hover:h-2 rounded-full overflow-hidden cursor-pointer relative transition-all duration-150"
                  >
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="text-neutral-400 hover:text-white transition cursor-pointer"
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Playback Controls (Shuffle, Prev, Big Purple Play/Pause, Next, Repeat) */}
              <div className="flex items-center justify-center space-x-4 pt-1">
                {/* Shuffle */}
                <button
                  type="button"
                  onClick={handleShufflePlay}
                  className="p-2 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition cursor-pointer"
                  title="Shuffle Library"
                >
                  <Shuffle className="w-4 h-4" />
                </button>

                {/* Previous */}
                <button
                  type="button"
                  onClick={playPrevious}
                  className="p-2 text-neutral-300 hover:text-white rounded-full hover:bg-neutral-800 transition cursor-pointer"
                  title="Previous Track"
                >
                  <SkipBack className="w-5 h-5" />
                </button>

                {/* BIG PURPLE PLAY / PAUSE BUTTON (Exact Screenshot) */}
                <button
                  type="button"
                  onClick={() => handlePlaySong(activeDisplayTrack)}
                  className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white flex items-center justify-center shadow-lg shadow-purple-900/50 transition transform hover:scale-108 active:scale-95 cursor-pointer"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </button>

                {/* Next */}
                <button
                  type="button"
                  onClick={playNext}
                  className="p-2 text-neutral-300 hover:text-white rounded-full hover:bg-neutral-800 transition cursor-pointer"
                  title="Next Track"
                >
                  <SkipForward className="w-5 h-5" />
                </button>

                {/* Repeat */}
                <button
                  type="button"
                  onClick={() => {
                    seekTo(0);
                    showToast("Replaying track from beginning");
                  }}
                  className="p-2 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition cursor-pointer"
                  title="Replay from start"
                >
                  <Repeat className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT CARD: QUICK ACTIONS (Exact Screenshot) */}
          <div className="lg:col-span-4 bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between backdrop-blur-md shadow-xl">
            <div>
              <h3 className="text-sm font-bold text-white mb-3 flex items-center space-x-1.5">
                <span>Quick Actions</span>
              </h3>

              {/* 2x2 Grid of Actions matching Screenshot */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* 1. + Create Playlist */}
                <button
                  type="button"
                  onClick={() => setIsCreatePlaylistOpen(true)}
                  className="p-3 bg-neutral-800/70 hover:bg-purple-900/30 border border-neutral-700/60 hover:border-purple-500/60 rounded-xl text-left transition cursor-pointer group shadow-xs"
                >
                  <div className="flex items-center space-x-2 text-xs font-bold text-white group-hover:text-purple-300">
                    <Plus className="w-4 h-4 text-purple-400" />
                    <span>Create Playlist</span>
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1">Make custom mix</p>
                </button>

                {/* 2. 🔮 Discover */}
                <button
                  type="button"
                  onClick={handleDiscover}
                  className="p-3 bg-neutral-800/70 hover:bg-fuchsia-900/30 border border-neutral-700/60 hover:border-fuchsia-500/60 rounded-xl text-left transition cursor-pointer group shadow-xs"
                >
                  <div className="flex items-center space-x-2 text-xs font-bold text-white group-hover:text-fuchsia-300">
                    <Compass className="w-4 h-4 text-fuchsia-400" />
                    <span>Discover</span>
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1">Find fresh viral hits</p>
                </button>

                {/* 3. ⬇ Import (YouTube) */}
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="p-3 bg-neutral-800/70 hover:bg-rose-900/30 border border-neutral-700/60 hover:border-rose-500/60 rounded-xl text-left transition cursor-pointer group shadow-xs"
                >
                  <div className="flex items-center space-x-2 text-xs font-bold text-white group-hover:text-rose-300">
                    <Download className="w-4 h-4 text-rose-400" />
                    <span>Import (YouTube)</span>
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1">Paste any video link</p>
                </button>

                {/* 4. 🔀 Shuffle Play */}
                <button
                  type="button"
                  onClick={handleShufflePlay}
                  className="p-3 bg-neutral-800/70 hover:bg-indigo-900/30 border border-neutral-700/60 hover:border-indigo-500/60 rounded-xl text-left transition cursor-pointer group shadow-xs"
                >
                  <div className="flex items-center space-x-2 text-xs font-bold text-white group-hover:text-indigo-300">
                    <Shuffle className="w-4 h-4 text-indigo-400" />
                    <span>Shuffle Play</span>
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1">Play random mix</p>
                </button>
              </div>
            </div>

            {/* Jam Session Status Indicator */}
            <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
              <span className="flex items-center space-x-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Ad-Free Synchronized Jam</span>
              </span>
              <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
                100% Synced
              </span>
            </div>
          </div>
        </div>

        {/* ================= SECTION 1: 🔥 TRENDING SONGS (Exact Screenshot) ================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Flame className="w-4 h-4 text-rose-500" />
              <h3 className="text-sm font-bold text-white tracking-wide">Trending Songs</h3>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("songs")}
              className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center space-x-1 cursor-pointer"
            >
              <span>View All</span>
              <span>→</span>
            </button>
          </div>

          {/* 5 Wide Aspect Cards matching Screenshot */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
            {trendingTracks.slice(0, 5).map((track) => {
              const isPlayingThis = currentTrack?.id === track.id && isPlaying;
              return (
                <div
                  key={track.id}
                  onClick={() => handlePlaySong(track, trendingTracks)}
                  className="group flex flex-col space-y-2 cursor-pointer"
                >
                  {/* Thumbnail Card with 16:9 / 16:10 aspect ratio */}
                  <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800/80 group-hover:border-purple-500/60 transition duration-300 shadow-md">
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-full h-full object-cover group-hover:scale-108 transition duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                    {/* Circular White Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200">
                      <div className="w-10 h-10 rounded-full bg-white text-neutral-950 flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition">
                        {isPlayingThis ? (
                          <Pause className="w-4 h-4 fill-neutral-950 text-neutral-950" />
                        ) : (
                          <Play className="w-4 h-4 fill-neutral-950 text-neutral-950 ml-0.5" />
                        )}
                      </div>
                    </div>

                    {/* Bottom Duration Badge */}
                    <span className="absolute bottom-1.5 right-1.5 text-[9px] font-mono bg-black/60 backdrop-blur-xs px-1.5 py-0.5 rounded text-white/90">
                      {track.durationFormatted || "3:30"}
                    </span>
                  </div>

                  {/* Title & Artist */}
                  <div className="px-0.5 min-w-0">
                    <p className="text-xs font-bold text-white truncate group-hover:text-purple-300 transition">
                      {cleanSongTitle(track.title)}
                    </p>
                    <p className="text-[11px] text-neutral-400 truncate">
                      {cleanArtistName(track.artist)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= SECTION 2: 📁 YOUR PLAYLISTS (Exact Screenshot) ================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Library className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white tracking-wide">Your Playlists</h3>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("playlists")}
              className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center space-x-1 cursor-pointer"
            >
              <span>View All</span>
              <span>→</span>
            </button>
          </div>

          {/* Horizontal Playlist Cards matching Screenshot */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {playlists.map((pl) => (
              <div
                key={pl.id}
                onClick={() => {
                  if (pl.id === "liked") {
                    setActiveTab("liked");
                  } else {
                    setActiveCategory(pl.id);
                    setActiveTab("songs");
                  }
                }}
                className="group p-3 rounded-xl bg-neutral-900/60 hover:bg-neutral-800/80 border border-neutral-800/80 hover:border-purple-500/60 transition cursor-pointer flex flex-col justify-between shadow-md"
              >
                <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-neutral-950 flex items-center justify-center mb-2 shadow-inner">
                  {pl.thumbnail ? (
                    <img
                      src={pl.thumbnail}
                      alt={pl.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  ) : (
                    <div
                      className={`w-full h-full bg-gradient-to-br ${
                        pl.gradient || "from-purple-600 to-pink-600"
                      } flex items-center justify-center text-3xl`}
                    >
                      {pl.icon || "🎵"}
                    </div>
                  )}

                  {/* Play on hover */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <div className="w-8 h-8 rounded-full bg-white text-neutral-950 flex items-center justify-center shadow-lg">
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-white truncate group-hover:text-purple-300 transition">
                    {pl.name}
                  </p>
                  <p className="text-[10px] text-neutral-400 mt-0.5">
                    {pl.songCount} songs
                  </p>
                </div>
              </div>
            ))}

            {/* + New Playlist Action Card */}
            <div
              onClick={() => setIsCreatePlaylistOpen(true)}
              className="p-3 rounded-xl border border-dashed border-neutral-700 hover:border-purple-500 bg-neutral-900/30 hover:bg-purple-950/20 transition cursor-pointer flex flex-col items-center justify-center text-center group min-h-[140px]"
            >
              <div className="w-10 h-10 rounded-full bg-neutral-800 group-hover:bg-purple-600 text-neutral-400 group-hover:text-white flex items-center justify-center transition mb-2 shadow-sm">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-neutral-300 group-hover:text-white">
                New Playlist
              </span>
            </div>
          </div>
        </div>

        {/* ================= SEARCH & EXPLORE MORE SECTION ================= */}
        <div className="pt-4 border-t border-neutral-800/80 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search any song, artist, album or paste YouTube URL (e.g. Aavesham, Anirudh, Taylor Swift)..."
              className="w-full pl-10 pr-24 py-2.5 bg-neutral-900/90 border border-neutral-800 rounded-xl text-xs sm:text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-inner"
            />
            {isSearching && (
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
              </div>
            )}
          </div>

          {/* Quick trending chips */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-neutral-400 text-[11px] font-semibold flex items-center space-x-1 flex-shrink-0">
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>Trending Tags:</span>
            </span>
            {["Aavesham", "Illuminati", "Manjummel Boys", "Anirudh", "Malayalam Viral", "K-Pop", "Lo-Fi", "Arijit Singh"].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSearchQuery(tag)}
                className="px-2.5 py-1 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition text-[11px] flex-shrink-0 cursor-pointer"
              >
                #{tag}
              </button>
            ))}
          </div>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl p-2 divide-y divide-neutral-800/60 max-h-72 overflow-y-auto">
              {searchResults.map((t) => (
                <div
                  key={t.id}
                  onClick={() => handlePlaySong(t)}
                  className="p-2 flex items-center justify-between hover:bg-neutral-800/60 rounded-lg transition cursor-pointer group"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <img
                      src={t.thumbnail}
                      alt={t.title}
                      className="w-9 h-9 rounded-lg object-cover bg-neutral-950 flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">{cleanSongTitle(t.title)}</p>
                      <p className="text-[10px] text-neutral-400 truncate">{cleanArtistName(t.artist)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToQueue(t);
                        showToast(`Added to queue`);
                      }}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-700 text-xs"
                      title="Add to queue"
                    >
                      <ListPlus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlaySong(t);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
                    >
                      Play
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Songs Catalog Grid for Tab Filtering */}
        {activeTab !== "home" && (
          <div className="pt-4 border-t border-neutral-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {activeTab === "liked"
                  ? `Liked Songs (${likedTracks.length})`
                  : activeTab === "recent"
                  ? `Recently Played (${recentTracks.length})`
                  : `${activeTab} Catalog`}
              </h3>
              <button
                type="button"
                onClick={handleShufflePlay}
                className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center space-x-1"
              >
                <Shuffle className="w-3 h-3" />
                <span>Shuffle All</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {catalogTracks.map((t, i) => (
                <div
                  key={`${t.id}-${i}`}
                  onClick={() => handlePlaySong(t)}
                  className="p-2.5 rounded-xl bg-neutral-900/60 hover:bg-neutral-800/70 border border-neutral-800 flex items-center space-x-3 transition cursor-pointer group"
                >
                  <img
                    src={t.thumbnail}
                    alt={t.title}
                    className="w-12 h-12 rounded-lg object-cover bg-neutral-950 flex-shrink-0 group-hover:scale-105 transition"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate group-hover:text-purple-300">
                      {cleanSongTitle(t.title)}
                    </p>
                    <p className="text-[10px] text-neutral-400 truncate">{cleanArtistName(t.artist)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLike(t);
                    }}
                    className="p-1 text-neutral-400 hover:text-rose-400"
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${likedMap[t.id] ? "fill-rose-500 text-rose-500" : ""}`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL 1: CREATE PLAYLIST ================= */}
      {isCreatePlaylistOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-2xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center space-x-2">
                <FolderPlus className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Create New Playlist</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatePlaylistOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                  Playlist Name
                </label>
                <input
                  type="text"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="e.g. Late Night Vibes, Gym Energy..."
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={newPlaylistDesc}
                  onChange={(e) => setNewPlaylistDesc(e.target.value)}
                  placeholder="e.g. Best tracks for study & coding sessions"
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                  Pick an Icon
                </label>
                <div className="flex items-center space-x-2">
                  {["🎵", "🔥", "🌴", "☕", "⚡", "🌙", "🎸", "💖", "🎧", "🚀"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewPlaylistIcon(emoji)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition cursor-pointer border ${
                        newPlaylistIcon === emoji
                          ? "bg-purple-600 border-purple-500 scale-110"
                          : "bg-neutral-800 border-neutral-700 hover:bg-neutral-700"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                  Color Theme
                </label>
                <div className="flex items-center space-x-2">
                  {[
                    "from-purple-600 to-pink-600",
                    "from-blue-600 to-cyan-600",
                    "from-emerald-600 to-teal-600",
                    "from-amber-600 to-orange-600",
                    "from-rose-600 to-red-600",
                  ].map((grad) => (
                    <button
                      key={grad}
                      type="button"
                      onClick={() => setNewPlaylistColor(grad)}
                      className={`w-7 h-7 rounded-full bg-gradient-to-r ${grad} transition cursor-pointer ${
                        newPlaylistColor === grad ? "ring-2 ring-white scale-110" : ""
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setIsCreatePlaylistOpen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreatePlaylist}
                disabled={!newPlaylistName.trim()}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white text-xs font-bold transition shadow-md"
              >
                Create Playlist
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: IMPORT YOUTUBE ================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-2xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center space-x-2">
                <Download className="w-5 h-5 text-rose-500" />
                <h3 className="text-sm font-bold text-white">Import from YouTube</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                YouTube URL or Song Title
              </label>
              <input
                type="text"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... or song name"
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-xl text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                autoFocus
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                Paste any YouTube video link to add it directly to your shared Jam queue.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportYouTube}
                disabled={!importUrl.trim() || isImporting}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center space-x-1.5"
              >
                {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                <span>Import & Play</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
