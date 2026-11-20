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
  FolderCheck,
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
  Trash2,
  ArrowLeft,
  Pencil,
  Camera,
  Image as ImageIcon,
  Mic,
} from "lucide-react";
import { MusicTrack, WorkspaceMember, Message, Channel } from "@/types";
import { SyncedMusicPlayer } from "./synced-music-player";
import { MusicReelsView } from "./music-reels-view";
import { ShareSongModal } from "./share-song-modal";
import { EditPlaylistModal } from "./edit-playlist-modal";
import { useMusic } from "@/context/music-context";
import { usePreferences } from "@/context/preferences-context";

// Helper to determine optimal text color (dark vs white) for high contrast on any theme accent color
export function getContrastTextColor(hexColor?: string): string {
  if (!hexColor) return "#ffffff";
  const hex = hexColor.replace("#", "");
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 150 ? "#0f172a" : "#ffffff";
  }
  return "#ffffff";
}

// Global dispatcher to stage any music track into chat composer or message feed
export function stageTrackToChat(track: MusicTrack) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("kaelixo:stage-music-track", { detail: track })
    );
  }
}

// Helper to create a sleek compact 32px drag preview chip instead of dragging the massive full-size card
export function createCompactDragGhost(e: React.DragEvent, track: MusicTrack) {
  if (typeof document === "undefined") return;

  const ghost = document.createElement("div");
  ghost.style.position = "fixed";
  ghost.style.top = "-9999px";
  ghost.style.left = "-9999px";
  ghost.style.display = "flex";
  ghost.style.alignItems = "center";
  ghost.style.gap = "8px";
  ghost.style.width = "220px";
  ghost.style.maxWidth = "240px";
  ghost.style.padding = "5px 8px";
  ghost.style.background = "#18181b";
  ghost.style.border = "1.5px solid #10b981";
  ghost.style.borderRadius = "12px";
  ghost.style.boxShadow = "0 10px 25px -3px rgba(0, 0, 0, 0.7), 0 4px 6px -2px rgba(0, 0, 0, 0.5)";
  ghost.style.color = "#ffffff";
  ghost.style.zIndex = "999999";
  ghost.style.pointerEvents = "none";
  ghost.style.fontFamily = "system-ui, -apple-system, sans-serif";

  const img = document.createElement("img");
  img.src =
    track.thumbnail ||
    "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=120&q=80";
  img.style.width = "30px";
  img.style.height = "30px";
  img.style.borderRadius = "6px";
  img.style.objectFit = "cover";
  img.style.flexShrink = "0";
  ghost.appendChild(img);

  const textWrap = document.createElement("div");
  textWrap.style.flex = "1";
  textWrap.style.minWidth = "0";
  textWrap.style.overflow = "hidden";

  const titleEl = document.createElement("div");
  titleEl.innerText = cleanSongTitle(track.title);
  titleEl.style.fontSize = "11px";
  titleEl.style.fontWeight = "700";
  titleEl.style.color = "#ffffff";
  titleEl.style.whiteSpace = "nowrap";
  titleEl.style.overflow = "hidden";
  titleEl.style.textOverflow = "ellipsis";
  titleEl.style.lineHeight = "1.2";
  textWrap.appendChild(titleEl);

  const subEl = document.createElement("div");
  subEl.innerText = "🎵 Drop to Share";
  subEl.style.fontSize = "9px";
  subEl.style.fontWeight = "600";
  subEl.style.color = "#34d399";
  subEl.style.whiteSpace = "nowrap";
  subEl.style.overflow = "hidden";
  subEl.style.textOverflow = "ellipsis";
  textWrap.appendChild(subEl);

  ghost.appendChild(textWrap);
  document.body.appendChild(ghost);

  e.dataTransfer.setDragImage(ghost, 20, 20);

  setTimeout(() => {
    if (ghost.parentNode) {
      ghost.parentNode.removeChild(ghost);
    }
  }, 0);
}

interface MusicChannelViewProps {
  currentUser: WorkspaceMember;
  messages: Message[];
  onSendMessage: (content: string) => void;
  channels?: Channel[];
  members?: WorkspaceMember[];
  onSelectChannel?: (channelId: string) => void;
  onSelectDirectMessage?: (member: WorkspaceMember) => void;
  onSendMessageToTarget?: (targetChannelId: string, content: string) => Promise<void> | void;
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

export interface MusicCategory {
  id: string;
  name: string;
  icon: string;
  group?: "language" | "artist" | "mood" | "custom";
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

// Curated Playlists
const INITIAL_PLAYLISTS: Playlist[] = [
  {
    id: "liked",
    name: "Liked Songs",
    description: "Your favorite saved tracks",
    songCount: 128,
    icon: "❤️",
    gradient: "from-rose-500 to-pink-600",
  },
  {
    id: "malayalam-hits",
    name: "Malayalam Hits",
    description: "Top viral Malayalam tracks & cinema soundtracks",
    songCount: 5,
    thumbnail: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80",
    gradient: "from-amber-500 to-orange-600",
  },
  {
    id: "workout-mix",
    name: "Workout Mix",
    description: "High bass, gym phonk & beast mode energy",
    songCount: 4,
    thumbnail: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=400&q=80",
    gradient: "from-purple-600 to-indigo-700",
  },
  {
    id: "chill-vibes",
    name: "Chill Vibes",
    description: "Sunset acoustic, calm melody & study beats",
    songCount: 3,
    thumbnail: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80",
    gradient: "from-blue-500 to-cyan-600",
  },
  {
    id: "coding-flow",
    name: "Coding Flow",
    description: "Deep focus synthwave & chiptune for developers",
    songCount: 2,
    thumbnail: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=400&q=80",
    gradient: "from-emerald-500 to-teal-700",
  },
];

// Initial Curated Tracks per Playlist
const DEFAULT_PLAYLIST_TRACKS: Record<string, MusicTrack[]> = {
  "malayalam-hits": INITIAL_TRENDING_TRACKS,
  "workout-mix": [
    {
      id: "7wtfhZwyrcc",
      title: "Badass (From Leo)",
      artist: "Anirudh Ravichander",
      thumbnail: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80",
      duration: 230,
      durationFormatted: "03:50",
      url: "https://www.youtube.com/watch?v=7wtfhZwyrcc",
      source: "youtube",
    },
    {
      id: "tOM-nWPcR4U",
      title: "Illuminati (Bass Boosted)",
      artist: "Dabzee",
      thumbnail: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80",
      duration: 198,
      durationFormatted: "03:18",
      url: "https://www.youtube.com/watch?v=tOM-nWPcR4U",
      source: "youtube",
    },
    {
      id: "fn3K-K3n28E",
      title: "Hukum - Thalaivar Alappara",
      artist: "Anirudh Ravichander",
      thumbnail: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80",
      duration: 215,
      durationFormatted: "03:35",
      url: "https://www.youtube.com/watch?v=fn3K-K3n28E",
      source: "youtube",
    },
    {
      id: "a3Ue-LN5B9U",
      title: "Aavesham High Bass",
      artist: "Sushin Shyam",
      thumbnail: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80",
      duration: 220,
      durationFormatted: "03:40",
      url: "https://www.youtube.com/watch?v=a3Ue-LN5B9U",
      source: "youtube",
    },
  ],
  "chill-vibes": [
    {
      id: "eH3GzNx56UQ",
      title: "Premalu Chill Acoustic",
      artist: "Vishnu Vijay",
      thumbnail: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=800&q=80",
      duration: 210,
      durationFormatted: "03:30",
      url: "https://www.youtube.com/watch?v=eH3GzNx56UQ",
      source: "youtube",
    },
    {
      id: "B9rx8j9Qh-A",
      title: "Manjummel Boys Acoustic Sunset",
      artist: "Sushin Shyam",
      thumbnail: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80",
      duration: 235,
      durationFormatted: "03:55",
      url: "https://www.youtube.com/watch?v=B9rx8j9Qh-A",
      source: "youtube",
    },
    {
      id: "l4Z8a-XmY4Q",
      title: "Kadha Thudarunnu (Lo-Fi)",
      artist: "Sushin Shyam",
      thumbnail: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80",
      duration: 245,
      durationFormatted: "04:05",
      url: "https://www.youtube.com/watch?v=l4Z8a-XmY4Q",
      source: "youtube",
    },
  ],
  "coding-flow": [
    {
      id: "jfKfPfyJRdk",
      title: "Lofi Hip Hop - Beats to Relax/Study to",
      artist: "Lofi Girl",
      thumbnail: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80",
      duration: 3600,
      durationFormatted: "60:00",
      url: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
      source: "youtube",
    },
    {
      id: "4xDzrJKXOOY",
      title: "Synthwave Radio - Chill Synth / Cyber beats",
      artist: "Lofi Girl Synth",
      thumbnail: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
      duration: 3600,
      durationFormatted: "60:00",
      url: "https://www.youtube.com/watch?v=4xDzrJKXOOY",
      source: "youtube",
    },
  ],
};

// Rich Categories & Radios
const PRESET_CATEGORIES: MusicCategory[] = [
  { id: "trending", name: "Trending Now", icon: "🔥", group: "language" },
  { id: "malayalam", name: "Malayalam (Kerala)", icon: "🌴", group: "language" },
  { id: "tamil", name: "Tamil Viral", icon: "⚡", group: "language" },
  { id: "hindi", name: "Hindi (Bollywood)", icon: "🌙", group: "language" },
  { id: "english", name: "English Pop", icon: "🌍", group: "language" },
  { id: "korean", name: "Korean (K-Pop)", icon: "🌸", group: "language" },
  { id: "punjabi", name: "Punjabi Hits", icon: "🔥", group: "language" },
  { id: "sushin shyam", name: "Sushin Shyam", icon: "🎧", group: "artist" },
  { id: "anirudh", name: "Anirudh", icon: "🎸", group: "artist" },
  { id: "ar rahman", name: "A.R. Rahman", icon: "🎹", group: "artist" },
  { id: "arijit singh", name: "Arijit Singh", icon: "🎙️", group: "artist" },
  { id: "lofi", name: "Lo-Fi & Study", icon: "☕", group: "mood" },
  { id: "gym", name: "Gym & High Bass", icon: "⚡", group: "mood" },
  { id: "nostalgia", name: "90s Evergreen", icon: "📻", group: "mood" },
];

export const FEATURED_ARTISTS = [
  {
    id: "sushin-shyam",
    name: "Sushin Shyam",
    tag: "Aavesham • Manjummel Boys",
    query: "Sushin Shyam songs",
    image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
    monthlyListeners: "4.8M listeners",
  },
  {
    id: "anirudh",
    name: "Anirudh Ravichander",
    tag: "Leo • Jailer • Master",
    query: "Anirudh Ravichander songs",
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=600&q=80",
    monthlyListeners: "14.2M listeners",
  },
  {
    id: "ar-rahman",
    name: "A.R. Rahman",
    tag: "Rockstar • Dil Se • PS1",
    query: "AR Rahman songs",
    image: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80",
    monthlyListeners: "22.5M listeners",
  },
  {
    id: "arijit-singh",
    name: "Arijit Singh",
    tag: "Kesariya • Tum Hi Ho",
    query: "Arijit Singh songs",
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
    monthlyListeners: "38.1M listeners",
  },
  {
    id: "dabzee",
    name: "Dabzee",
    tag: "Illuminati • Manavaalan Thug",
    query: "Dabzee songs",
    image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80",
    monthlyListeners: "3.2M listeners",
  },
  {
    id: "vishnu-vijay",
    name: "Vishnu Vijay",
    tag: "Premalu • Thallumaala",
    query: "Vishnu Vijay songs",
    image: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=600&q=80",
    monthlyListeners: "2.9M listeners",
  },
  {
    id: "sid-sriram",
    name: "Sid Sriram",
    tag: "Ennodu Nee Irundhaal",
    query: "Sid Sriram songs",
    image: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80",
    monthlyListeners: "9.5M listeners",
  },
  {
    id: "taylor-swift",
    name: "Taylor Swift",
    tag: "1989 • Midnights • Pop",
    query: "Taylor Swift hits",
    image: "https://images.unsplash.com/photo-1520523839898-50712825e3a7?auto=format&fit=crop&w=600&q=80",
    monthlyListeners: "105M listeners",
  },
  {
    id: "bts",
    name: "BTS",
    tag: "Dynamite • Butter • K-Pop",
    query: "BTS songs",
    image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=600&q=80",
    monthlyListeners: "28M listeners",
  },
  {
    id: "the-weeknd",
    name: "The Weeknd",
    tag: "Blinding Lights • Starboy",
    query: "The Weeknd hits",
    image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
    monthlyListeners: "112M listeners",
  },
  {
    id: "coldplay",
    name: "Coldplay",
    tag: "Yellow • Viva La Vida",
    query: "Coldplay hits",
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
    monthlyListeners: "84M listeners",
  },
  {
    id: "shreya-ghoshal",
    name: "Shreya Ghoshal",
    tag: "Melody Queen • Evergreen",
    query: "Shreya Ghoshal songs",
    image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=600&q=80",
    monthlyListeners: "26M listeners",
  },
];

export const FEATURED_ALBUMS = [
  {
    id: "album-aavesham",
    title: "Aavesham",
    artist: "Sushin Shyam",
    year: "2024",
    tracksCount: 8,
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
    query: "Aavesham full album songs",
  },
  {
    id: "album-manjummel-boys",
    title: "Manjummel Boys",
    artist: "Sushin Shyam",
    year: "2024",
    tracksCount: 6,
    image: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80",
    query: "Manjummel Boys full album songs",
  },
  {
    id: "album-premalu",
    title: "Premalu",
    artist: "Vishnu Vijay",
    year: "2024",
    tracksCount: 6,
    image: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=600&q=80",
    query: "Premalu full album songs",
  },
  {
    id: "album-leo",
    title: "Leo",
    artist: "Anirudh Ravichander",
    year: "2023",
    tracksCount: 7,
    image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80",
    query: "Leo songs Anirudh",
  },
  {
    id: "album-jailer",
    title: "Jailer",
    artist: "Anirudh Ravichander",
    year: "2023",
    tracksCount: 8,
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
    query: "Jailer songs Anirudh",
  },
  {
    id: "album-animal",
    title: "Animal",
    artist: "Pritam & Harshavardhan",
    year: "2023",
    tracksCount: 10,
    image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80",
    query: "Animal songs Pritam",
  },
  {
    id: "album-rockstar",
    title: "Rockstar",
    artist: "A.R. Rahman",
    year: "2011",
    tracksCount: 14,
    image: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80",
    query: "Rockstar AR Rahman songs",
  },
  {
    id: "album-starboy",
    title: "Starboy",
    artist: "The Weeknd",
    year: "2016",
    tracksCount: 18,
    image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
    query: "Starboy The Weeknd album",
  },
  {
    id: "album-1989",
    title: "1989 (Taylor's Version)",
    artist: "Taylor Swift",
    year: "2023",
    tracksCount: 21,
    image: "https://images.unsplash.com/photo-1520523839898-50712825e3a7?auto=format&fit=crop&w=600&q=80",
    query: "Taylor Swift 1989 album",
  },
];

export const FEATURED_GENRES = [
  {
    id: "malayalam-viral",
    name: "Malayalam Viral",
    query: "malayalam trending songs",
    icon: "🌴",
    gradient: "from-emerald-600 via-teal-600 to-cyan-700",
    description: "Aavesham, Premalu, Dabzee, Sushin Shyam hits",
  },
  {
    id: "tamil-hits",
    name: "Tamil Hits",
    query: "tamil trending viral songs",
    icon: "⚡",
    gradient: "from-amber-600 via-orange-600 to-red-700",
    description: "Anirudh, AR Rahman, Yuvan, Harris hits",
  },
  {
    id: "bollywood-melodies",
    name: "Bollywood Melodies",
    query: "hindi bollywood hit songs",
    icon: "🌙",
    gradient: "from-purple-600 via-fuchsia-600 to-pink-700",
    description: "Arijit Singh, Pritam, Shreya, romantic classics",
  },
  {
    id: "global-pop",
    name: "Global Pop",
    query: "top global pop hits billboard",
    icon: "🌍",
    gradient: "from-blue-600 via-indigo-600 to-violet-700",
    description: "Taylor Swift, The Weeknd, Dua Lipa, Bruno Mars",
  },
  {
    id: "lofi-chill",
    name: "Lo-Fi & Study",
    query: "lofi hip hop chill beats study relax",
    icon: "☕",
    gradient: "from-indigo-700 via-purple-700 to-rose-700",
    description: "Peaceful instrumental beats for focus and code",
  },
  {
    id: "gym-bass",
    name: "Gym & High Bass",
    query: "workout high bass edm workout mix",
    icon: "🏋️",
    gradient: "from-red-600 via-rose-600 to-orange-700",
    description: "Heavy bass, trap, and phonk for maximum workout",
  },
  {
    id: "indie-vibes",
    name: "Indie & Acoustic",
    query: "indie acoustic songs",
    icon: "🎸",
    gradient: "from-teal-600 via-emerald-600 to-lime-700",
    description: "Raw acoustic guitar, indie folk, and chill melodies",
  },
  {
    id: "90s-nostalgia",
    name: "90s Evergreen",
    query: "90s evergreen hits songs",
    icon: "📻",
    gradient: "from-orange-600 via-amber-600 to-yellow-600",
    description: "Golden 90s nostalgia across Malayalam, Tamil & Hindi",
  },
  {
    id: "k-pop-fever",
    name: "K-Pop Fever",
    query: "kpop viral songs bts blackpink",
    icon: "🌸",
    gradient: "from-pink-500 via-rose-500 to-fuchsia-600",
    description: "BTS, BLACKPINK, NewJeans, Stray Kids hype",
  },
  {
    id: "hiphop-rap",
    name: "Hip-Hop & Rap",
    query: "hip hop rap trending songs",
    icon: "🔥",
    gradient: "from-violet-800 via-purple-900 to-zinc-900",
    description: "Hard-hitting lyrical beats, rap & drill anthems",
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

// ================= YOUTUBE-STYLE 16:9 CARD COMPONENT (1:1 Parity) =================
interface YouTubeSongCardProps {
  track: MusicTrack;
  isThisPlaying: boolean;
  isLiked: boolean;
  onPlay: () => void;
  onToggleLike: (e: React.MouseEvent) => void;
  onAddToPlaylist: (e: React.MouseEvent) => void;
  onAddToQueue: (e: React.MouseEvent) => void;
  onHide?: (e: React.MouseEvent) => void;
  onShareToChat?: (e: React.MouseEvent) => void;
}

export function YouTubeSongCard({
  track,
  isThisPlaying,
  isLiked,
  onPlay,
  onToggleLike,
  onAddToPlaylist,
  onAddToQueue,
  onHide,
  onShareToChat,
}: YouTubeSongCardProps) {
  const { currentTheme, resolvedMode } = usePreferences();
  const isDark = resolvedMode === "dark";
  const accent = currentTheme?.accentColor || "#84cc16";
  const contrastText = getContrastTextColor(accent);

  const cleanTitle = cleanSongTitle(track.title);
  const cleanArtist = cleanArtistName(track.artist);
  const artistInitial = cleanArtist ? cleanArtist.charAt(0).toUpperCase() : "🎵";

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("application/x-kaelixo-track", JSON.stringify(track));
    const shareUrl = track.url || `https://www.youtube.com/watch?v=${track.id}`;
    e.dataTransfer.setData("text/plain", `🎶 **${cleanTitle}** - ${cleanArtist}\n${shareUrl}`);
    e.dataTransfer.setData("text/uri-list", shareUrl);
    e.dataTransfer.effectAllowed = "copy";
    createCompactDragGhost(e, track);
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onShareToChat) {
      onShareToChat(e);
    } else {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("kaelixo:open-share-song-modal", { detail: track })
        );
      }
    }
  };

  return (
    <div
      onClick={onPlay}
      draggable={true}
      onDragStart={handleDragStart}
      className={`group cursor-grab active:cursor-grabbing select-none flex flex-col transition-all duration-200 ${
        isThisPlaying ? "scale-[1.01]" : ""
      }`}
      title={`${cleanTitle} — ${cleanArtist} (Drag to chat to share)`}
    >
      {/* 16:9 Thumbnail Container matching YouTube 1:1 */}
      <div
        className="relative aspect-video w-full rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 shadow-sm dark:shadow-md border border-neutral-200 dark:border-neutral-800/80 transition-all duration-300"
        style={isThisPlaying ? { borderColor: `${accent}80` } : undefined}
      >
        <img
          src={track.thumbnail}
          alt={track.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80";
          }}
        />

        {/* Gradient Shadow Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

        {/* Center Play Button / Soundwave Overlay */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${
            isThisPlaying
              ? "bg-black/50 opacity-100"
              : "bg-black/30 opacity-0 group-hover:opacity-100"
          }`}
        >
          {isThisPlaying ? (
            <div
              className="flex items-center space-x-1 bg-black/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border shadow-xl"
              style={{ borderColor: `${accent}80` }}
            >
              <span className="w-1.5 h-4 rounded-full animate-bounce" style={{ backgroundColor: accent }} />
              <span className="w-1.5 h-6 rounded-full animate-[bounce_1s_infinite_200ms]" style={{ backgroundColor: accent }} />
              <span className="w-1.5 h-3 rounded-full animate-[bounce_1s_infinite_400ms]" style={{ backgroundColor: accent }} />
              <span className="w-1.5 h-5 rounded-full animate-[bounce_1s_infinite_100ms]" style={{ backgroundColor: accent }} />
              <span className="text-xs font-bold ml-1.5" style={{ color: accent }}>Playing</span>
            </div>
          ) : (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform cursor-pointer"
              style={{ backgroundColor: accent, color: contrastText }}
            >
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </div>
          )}
        </div>

        {/* Floating Quick Action Overlay on Thumbnail (Top Right) */}
        <div className="absolute top-2.5 right-2.5 flex items-center space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <button
            type="button"
            onClick={handleShareClick}
            className="w-7 h-7 rounded-full bg-black/70 hover:bg-sky-600 text-white/90 hover:text-white flex items-center justify-center backdrop-blur-md transition cursor-pointer shadow-md"
            title="Share to Chat (or drag song card)"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onToggleLike}
            className={`w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md transition cursor-pointer shadow-md ${
              isLiked
                ? "bg-rose-600 text-white"
                : "bg-black/70 hover:bg-black text-white/90 hover:text-white"
            }`}
            title={isLiked ? "Unlike" : "Like Song"}
          >
            <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-white text-white" : ""}`} />
          </button>
          <button
            type="button"
            onClick={onAddToPlaylist}
            className="w-7 h-7 rounded-full bg-black/70 hover:brightness-125 text-white/90 hover:text-white flex items-center justify-center backdrop-blur-md transition cursor-pointer shadow-md"
            title="Add to Playlist"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onAddToQueue}
            className="w-7 h-7 rounded-full bg-black/70 hover:brightness-125 text-white/90 hover:text-white flex items-center justify-center backdrop-blur-md transition cursor-pointer shadow-md"
            title="Add to Queue"
          >
            <ListPlus className="w-3.5 h-3.5" />
          </button>
          {onHide && (
            <button
              type="button"
              onClick={onHide}
              className="w-7 h-7 rounded-full bg-black/70 hover:bg-rose-600 text-white/90 hover:text-white flex items-center justify-center backdrop-blur-md transition cursor-pointer shadow-md"
              title="Hide"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Drag Hint on Hover (Top Left) */}
        <div className="absolute top-2.5 left-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-white/95 shadow-md border border-white/15 flex items-center space-x-1">
            <span>⋮⋮ Drag to chat</span>
          </span>
        </div>

        {/* Always Visible Like indicator if song is liked */}
        {isLiked && (
          <div className="absolute top-2.5 left-2.5 w-6 h-6 rounded-full bg-rose-600/90 backdrop-blur-md flex items-center justify-center text-white shadow-md group-hover:hidden">
            <Heart className="w-3 h-3 fill-white" />
          </div>
        )}

        {/* YouTube-style Duration Badge on Bottom Right */}
        <div className="absolute bottom-2.5 right-2.5 bg-black/85 backdrop-blur-xs text-white text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md shadow-md border border-white/10 flex items-center space-x-1">
          <span>{track.durationFormatted || "3:30"}</span>
        </div>
      </div>

      {/* Info Section below Thumbnail (YouTube 1:1 Parity) */}
      <div className="flex items-start space-x-3 pt-3 px-0.5">
        {/* Channel / Artist Avatar Circle */}
        <div
          className="relative w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-xs shadow-sm flex-shrink-0 mt-0.5 border transition"
          style={{
            background: `linear-gradient(135deg, ${accent}dd, ${accent}66)`,
            color: contrastText,
            borderColor: `${accent}40`,
          }}
        >
          {isThisPlaying ? (
            <Disc3 className="w-5 h-5 animate-spin duration-3000" style={{ color: contrastText }} />
          ) : (
            <span>{artistInitial}</span>
          )}
        </div>

        {/* Title, Artist, and Meta */}
        <div className="min-w-0 flex-1">
          <h4
            className="text-sm font-bold line-clamp-2 leading-snug transition-colors duration-150 text-neutral-900 dark:text-white"
            style={isThisPlaying ? { color: accent, fontWeight: 800 } : undefined}
            title={track.title}
          >
            {cleanTitle}
          </h4>

          {/* Artist Name with Verified Checkmark */}
          <div className="flex items-center space-x-1.5 mt-1 text-xs text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-300 transition">
            <span className="truncate font-medium">{cleanArtist}</span>
            <span
              className="w-3.5 h-3.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-[9px] flex items-center justify-center flex-shrink-0 font-bold"
              title="Verified Artist"
            >
              ✓
            </span>
          </div>

          {/* Metadata & Quick Action Pills */}
          <div className="flex items-center justify-between mt-2 pt-1 border-t border-neutral-200 dark:border-neutral-800/40 text-[11px]">
            <span className="text-neutral-500 font-mono">
              {track.durationFormatted || "3:30"} • Live Jam
            </span>

            <div className="flex items-center space-x-1.5 opacity-80 group-hover:opacity-100 transition">
              <button
                type="button"
                onClick={handleShareClick}
                className="text-[10px] text-neutral-600 dark:text-neutral-400 hover:text-sky-500 dark:hover:text-sky-400 font-bold px-1.5 py-0.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer flex items-center space-x-1 border border-neutral-300 dark:border-neutral-700"
                title="Share to Chat"
              >
                <Share2 className="w-3 h-3 text-sky-500" />
                <span>Share</span>
              </button>
              <button
                type="button"
                onClick={onAddToPlaylist}
                style={{
                  color: accent,
                  borderColor: `${accent}50`,
                  backgroundColor: `${accent}18`,
                }}
                className="text-[10px] font-bold px-2 py-0.5 rounded-md hover:brightness-125 transition cursor-pointer flex items-center space-x-1 border"
                title="Add to Playlist"
              >
                <FolderPlus className="w-3 h-3" />
                <span>+ Playlist</span>
              </button>
              <button
                type="button"
                onClick={onAddToQueue}
                className="text-[10px] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white font-bold px-1.5 py-0.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer flex items-center space-x-0.5 border border-neutral-300 dark:border-neutral-700"
                title="Add to Queue"
              >
                <ListPlus className="w-3 h-3" />
                <span>Queue</span>
              </button>
              <button
                type="button"
                onClick={onToggleLike}
                className="p-1 text-neutral-400 hover:text-rose-500 transition"
                title={isLiked ? "Unlike" : "Like Song"}
              >
                <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-rose-500 text-rose-500" : ""}`} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MusicChannelView({
  currentUser,
  messages,
  onSendMessage,
  channels = [],
  members = [],
  onSelectChannel,
  onSelectDirectMessage,
  onSendMessageToTarget,
}: MusicChannelViewProps) {
  const { currentTheme, resolvedMode } = usePreferences();
  const isDark = resolvedMode === "dark";
  const themeAccent = currentTheme?.accentColor || "#84cc16";
  const themeTextColor = getContrastTextColor(themeAccent);

  // Forward / Share Song Modal State (WhatsApp / Slack Parity)
  const [shareModalTrack, setShareModalTrack] = useState<MusicTrack | null>(null);

  useEffect(() => {
    const handleOpenShare = (e: CustomEvent<MusicTrack>) => {
      if (e.detail) {
        setShareModalTrack(e.detail);
      }
    };
    window.addEventListener("kaelixo:open-share-song-modal", handleOpenShare as EventListener);
    return () => {
      window.removeEventListener("kaelixo:open-share-song-modal", handleOpenShare as EventListener);
    };
  }, []);

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

  // Categories & Filters
  const [customCategories, setCustomCategories] = useState<MusicCategory[]>([]);
  const [isAddingCategory, setIsAddingCategory] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>("");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");

  // Playlist Tracks Map: Stores tracks per playlist ID
  const [playlistTracksMap, setPlaylistTracksMap] = useState<Record<string, MusicTrack[]>>(DEFAULT_PLAYLIST_TRACKS);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  // Modal 1: Add a song to a playlist
  const [songToAddToPlaylist, setSongToAddToPlaylist] = useState<MusicTrack | null>(null);

  // Modal 2: Create new playlist
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState<boolean>(false);
  const [newPlaylistName, setNewPlaylistName] = useState<string>("");
  const [newPlaylistDesc, setNewPlaylistDesc] = useState<string>("");
  const [newPlaylistIcon, setNewPlaylistIcon] = useState<string>("🎵");
  const [newPlaylistColor, setNewPlaylistColor] = useState<string>("from-purple-600 to-pink-600");

  // Modal: Edit existing playlist details & cover
  const [playlistToEdit, setPlaylistToEdit] = useState<Playlist | null>(null);

  // Modal 3: Import from YouTube
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importUrl, setImportUrl] = useState<string>("");
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Likes & History
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [likedTracks, setLikedTracks] = useState<MusicTrack[]>([]);
  const [recentTracks, setRecentTracks] = useState<MusicTrack[]>([]);

  // Search
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<MusicTrack[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const observerTargetRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef<boolean>(false);

  // Load custom playlists, playlist tracks map, and liked songs from localStorage
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

        const savedTracksMap = localStorage.getItem("kaelixo_playlist_tracks_map");
        if (savedTracksMap) {
          const parsedMap = JSON.parse(savedTracksMap);
          setPlaylistTracksMap((prev) => ({ ...prev, ...parsedMap }));
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

        const savedCustomCats = localStorage.getItem("kaelixo_custom_music_tags");
        if (savedCustomCats) {
          setCustomCategories(JSON.parse(savedCustomCats));
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

  // Combined Categories
  const allCategories = [...customCategories, ...PRESET_CATEGORIES];
  const filteredCategories =
    selectedGroup === "all"
      ? allCategories
      : allCategories.filter(
          (c) => c.group === selectedGroup || (selectedGroup === "custom" && c.group === "custom")
        );

  // Fetch Tracks from YouTube API for active category
  const fetchCategoryTracks = useCallback(
    async (cat: string, pageNum: number, append: boolean = false) => {
      if (loadingMoreRef.current && append) return;
      loadingMoreRef.current = true;
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

  // Automatic Infinite Scroll on Sentinel Intersection (Endless stream of songs!)
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

    setPlaylists((prev) =>
      prev.map((p) => (p.id === "liked" ? { ...p, songCount: newLikedTracks.length } : p))
    );

    setPlaylistTracksMap((prev) => ({
      ...prev,
      liked: newLikedTracks,
    }));

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("kaelixo_liked_songs", JSON.stringify(newLikedTracks));
      } catch {}
    }
  };

  // ================= PLAYLIST ADD / REMOVE LOGIC =================
  const handleToggleSongInPlaylist = (playlistId: string, track: MusicTrack) => {
    if (playlistId === "liked") {
      toggleLike(track);
      return;
    }

    setPlaylistTracksMap((prev) => {
      const currentList = prev[playlistId] || [];
      const exists = currentList.some((t) => t.id === track.id);
      let updated: MusicTrack[];

      if (exists) {
        updated = currentList.filter((t) => t.id !== track.id);
        showToast(`Removed from playlist`);
      } else {
        updated = [track, ...currentList];
        const targetPl = playlists.find((p) => p.id === playlistId);
        showToast(`✨ Added "${cleanSongTitle(track.title)}" to "${targetPl?.name || "playlist"}"!`);
      }

      setPlaylists((pls) =>
        pls.map((p) => (p.id === playlistId ? { ...p, songCount: updated.length } : p))
      );

      const nextMap = { ...prev, [playlistId]: updated };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("kaelixo_playlist_tracks_map", JSON.stringify(nextMap));
        } catch {}
      }
      return nextMap;
    });
  };

  // Remove song specifically from playlist view
  const handleRemoveFromPlaylist = (playlistId: string, trackId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (playlistId === "liked") {
      const target = likedTracks.find((t) => t.id === trackId);
      if (target) toggleLike(target);
      return;
    }

    setPlaylistTracksMap((prev) => {
      const currentList = prev[playlistId] || [];
      const updated = currentList.filter((t) => t.id !== trackId);
      setPlaylists((pls) =>
        pls.map((p) => (p.id === playlistId ? { ...p, songCount: updated.length } : p))
      );
      const nextMap = { ...prev, [playlistId]: updated };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("kaelixo_playlist_tracks_map", JSON.stringify(nextMap));
        } catch {}
      }
      showToast("Removed song from playlist");
      return nextMap;
    });
  };

  // Create Playlist Action
  const handleCreatePlaylist = () => {
    const name = newPlaylistName.trim();
    if (!name) return;
    const newId = `pl-${Date.now()}`;
    const initialList = songToAddToPlaylist ? [songToAddToPlaylist] : [];

    const newPl: Playlist = {
      id: newId,
      name,
      description: newPlaylistDesc.trim() || "Custom Team Playlist",
      songCount: initialList.length,
      icon: newPlaylistIcon,
      gradient: newPlaylistColor,
      isCustom: true,
    };

    const updatedPlaylists = [...playlists, newPl];
    setPlaylists(updatedPlaylists);

    if (initialList.length > 0) {
      setPlaylistTracksMap((prev) => {
        const nextMap = { ...prev, [newId]: initialList };
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("kaelixo_playlist_tracks_map", JSON.stringify(nextMap));
          } catch {}
        }
        return nextMap;
      });
    }

    if (typeof window !== "undefined") {
      try {
        const customOnly = updatedPlaylists.filter((p) => p.isCustom);
        localStorage.setItem("kaelixo_custom_playlists", JSON.stringify(customOnly));
      } catch {}
    }

    setIsCreatePlaylistOpen(false);
    setNewPlaylistName("");
    setNewPlaylistDesc("");
    showToast(`✨ Created playlist "${name}"!`);

    if (songToAddToPlaylist) {
      setSongToAddToPlaylist(null);
    }
  };

  // Update Custom Playlist Details (Name, Image, Icon, Gradient, Description)
  const handleUpdatePlaylist = (updated: Playlist) => {
    setPlaylists((prev) => {
      const nextList = prev.map((p) => (p.id === updated.id ? updated : p));
      if (typeof window !== "undefined") {
        try {
          const customOnly = nextList.filter((p) => p.isCustom);
          localStorage.setItem("kaelixo_custom_playlists", JSON.stringify(customOnly));
        } catch {}
      }
      return nextList;
    });
    showToast(`✨ Updated playlist "${updated.name}"!`);
    setPlaylistToEdit(null);
  };

  // Delete Custom Playlist
  const handleDeletePlaylist = (playlistId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const target = playlists.find((p) => p.id === playlistId);
    if (!target?.isCustom) return;

    if (!confirm(`Are you sure you want to delete playlist "${target.name}"?`)) return;

    const updated = playlists.filter((p) => p.id !== playlistId);
    setPlaylists(updated);

    setPlaylistTracksMap((prev) => {
      const copy = { ...prev };
      delete copy[playlistId];
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("kaelixo_playlist_tracks_map", JSON.stringify(copy));
        } catch {}
      }
      return copy;
    });

    if (typeof window !== "undefined") {
      try {
        const customOnly = updated.filter((p) => p.isCustom);
        localStorage.setItem("kaelixo_custom_playlists", JSON.stringify(customOnly));
      } catch {}
    }

    if (selectedPlaylistId === playlistId) {
      setSelectedPlaylistId(null);
    }
    showToast(`Deleted playlist "${target.name}"`);
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
  const handleShufflePlay = (customPool?: MusicTrack[]) => {
    unlockMobileAudio();
    const pool = customPool && customPool.length > 0 ? [...customPool] : [...catalogTracks];
    if (pool.length === 0) return;
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    playTrack(pool[0], 0, pool);
    showToast(`🔀 Shuffled & playing ${pool.length} tracks!`);
  };

  // Clear Recently Played History
  const handleClearRecent = () => {
    setRecentTracks([]);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("kaelixo_recently_played_tracks");
      } catch {}
    }
    showToast("Cleared recently played history");
  };

  // Play All tracks in a view
  const handlePlayAllInView = (tracks: MusicTrack[]) => {
    if (tracks.length === 0) return;
    unlockMobileAudio();
    handlePlaySong(tracks[0], tracks);
    showToast(`Playing all ${tracks.length} tracks!`);
  };

  // Shuffle All tracks in a view
  const handleShuffleAllInView = (tracks: MusicTrack[]) => {
    if (tracks.length === 0) return;
    unlockMobileAudio();
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    handlePlaySong(shuffled[0], shuffled);
    showToast(`Shuffled & playing ${shuffled.length} tracks!`);
  };

  // Play Artist Top Tracks
  const handlePlayArtist = async (artist: (typeof FEATURED_ARTISTS)[0]) => {
    unlockMobileAudio();
    showToast(`Loading hits by ${artist.name}...`);
    try {
      setIsSearching(true);
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(artist.query)}`);
      const data = await res.json();
      if (data.tracks && data.tracks.length > 0) {
        handlePlaySong(data.tracks[0], data.tracks);
        setCatalogTracks(data.tracks);
        setActiveTab("songs");
        showToast(`Now playing top tracks by ${artist.name}`);
      } else {
        showToast(`Could not load tracks for ${artist.name}`);
      }
    } catch {
      showToast(`Error playing ${artist.name}`);
    } finally {
      setIsSearching(false);
    }
  };

  // Play Album Tracks
  const handlePlayAlbum = async (album: (typeof FEATURED_ALBUMS)[0]) => {
    unlockMobileAudio();
    showToast(`Loading album "${album.title}"...`);
    try {
      setIsSearching(true);
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(album.query)}`);
      const data = await res.json();
      if (data.tracks && data.tracks.length > 0) {
        handlePlaySong(data.tracks[0], data.tracks);
        setCatalogTracks(data.tracks);
        setActiveTab("songs");
        showToast(`Playing album "${album.title}"`);
      } else {
        showToast(`Could not load album "${album.title}"`);
      }
    } catch {
      showToast(`Error loading album "${album.title}"`);
    } finally {
      setIsSearching(false);
    }
  };

  // Play Genre Radio
  const handlePlayGenre = (genre: (typeof FEATURED_GENRES)[0]) => {
    unlockMobileAudio();
    showToast(`Starting ${genre.name} Radio...`);
    setActiveCategory(genre.id);
    fetchCategoryTracks(genre.id, 1, false);
    setActiveTab("home");
  };

  // ================= DEDICATED TAB VIEW RENDERERS =================
  const renderSongsView = () => (
    <div className="px-4 sm:px-6 py-4 space-y-5 animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-xs dark:shadow-md">
        <div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setActiveTab("home")}
              className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white p-1 -ml-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              title="Back to Home"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${themeAccent}20`, color: themeAccent }}
            >
              <Music className="w-4 h-4" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">All Songs Catalog</h2>
            <span
              className="text-xs font-bold px-2.5 py-0.5 rounded-full border"
              style={{ color: themeAccent, backgroundColor: `${themeAccent}15`, borderColor: `${themeAccent}30` }}
            >
              {catalogTracks.length} tracks
            </span>
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
            Browse, search and stream from your team music library & YouTube recommendations
          </p>
        </div>

        {/* Action Buttons: Play All & Shuffle */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => handlePlayAllInView(catalogTracks)}
            style={{
              backgroundColor: themeAccent,
              color: themeTextColor,
              boxShadow: `0 4px 14px ${themeAccent}40`,
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer hover:brightness-110"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Play All</span>
          </button>
          <button
            type="button"
            onClick={() => handleShuffleAllInView(catalogTracks)}
            className="px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-200 text-xs font-semibold border border-neutral-300 dark:border-neutral-700 flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Shuffle</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search any song, artist, film or paste YouTube link..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-neutral-900/90 border border-neutral-300 dark:border-neutral-800 rounded-xl text-xs sm:text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-1 shadow-inner"
          />
        </div>
      </div>

      {/* Grid of Songs (YouTube 1:1 Parity) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6">
        {catalogTracks.map((t, idx) => {
          const isThisPlaying = currentTrack?.id === t.id && isPlaying;
          return (
            <YouTubeSongCard
              key={`${t.id}-${idx}`}
              track={t}
              isThisPlaying={isThisPlaying}
              isLiked={!!likedMap[t.id]}
              onPlay={() => handlePlaySong(t)}
              onToggleLike={(e) => {
                e.stopPropagation();
                toggleLike(t);
              }}
              onAddToPlaylist={(e) => {
                e.stopPropagation();
                setSongToAddToPlaylist(t);
              }}
              onAddToQueue={(e) => {
                e.stopPropagation();
                addToQueue(t);
                showToast("Added to queue");
              }}
              onShareToChat={() => setShareModalTrack(t)}
            />
          );
        })}
      </div>

      {/* Endless Sentinel */}
      <div ref={observerTargetRef} className="pt-6 pb-12 flex items-center justify-center">
        {isLoading && (
          <div
            className="flex items-center space-x-2 text-xs font-semibold py-3 animate-pulse"
            style={{ color: themeAccent }}
          >
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: themeAccent }} />
            <span>Loading more songs endlessly from YouTube...</span>
          </div>
        )}
      </div>
    </div>
  );

  const renderPlaylistsView = () => (
    <div className="px-4 sm:px-6 py-4 space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-xs dark:shadow-md">
        <div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setActiveTab("home")}
              className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white p-1 -ml-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              title="Back to Home"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${themeAccent}20`, color: themeAccent }}
            >
              <Library className="w-4 h-4" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">Your Playlists & Mixes</h2>
            <span
              className="text-xs font-bold px-2.5 py-0.5 rounded-full border"
              style={{ color: themeAccent, backgroundColor: `${themeAccent}15`, borderColor: `${themeAccent}30` }}
            >
              {playlists.length} playlists
            </span>
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
            Curated team vibes, study mixes, workout energy, and custom collections
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreatePlaylistOpen(true)}
          style={{
            backgroundColor: themeAccent,
            color: themeTextColor,
            boxShadow: `0 4px 14px ${themeAccent}40`,
          }}
          className="px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer self-start sm:self-auto hover:brightness-110"
        >
          <Plus className="w-4 h-4" />
          <span>Create Playlist</span>
        </button>
      </div>

      {/* Grid of Playlists */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {playlists.map((pl) => {
          const count = pl.id === "liked" ? likedTracks.length : (playlistTracksMap[pl.id]?.length ?? pl.songCount);
          return (
            <div
              key={pl.id}
              onClick={() => setSelectedPlaylistId(pl.id)}
              className="group p-3 rounded-2xl bg-white dark:bg-neutral-900/60 hover:bg-neutral-50 dark:hover:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-800/80 transition duration-200 cursor-pointer flex flex-col justify-between shadow-xs dark:shadow-lg"
            >
              <div className="relative aspect-square rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-950 mb-3 shadow-md">
                {pl.thumbnail ? (
                  <img
                    src={pl.thumbnail}
                    alt={pl.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                ) : (
                  <div
                    className={`w-full h-full bg-gradient-to-br ${
                      pl.gradient || "from-purple-600 to-pink-600"
                    } flex items-center justify-center text-4xl`}
                  >
                    {pl.icon || "🎵"}
                  </div>
                )}
                {/* Play hover button */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <div className="w-10 h-10 rounded-full bg-white text-neutral-950 flex items-center justify-center shadow-xl">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                </div>

                {/* Edit hover button */}
                {pl.isCustom && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlaylistToEdit(pl);
                    }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/75 hover:bg-black text-white/90 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-md z-10 cursor-pointer"
                    title="Edit playlist"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div>
                <p className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate transition">
                  {pl.name}
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                  {pl.description || `${count} songs`}
                </p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-800/60 text-[10px] text-neutral-500 dark:text-neutral-400 font-semibold">
                  <span>{count} songs</span>
                  <span style={{ color: themeAccent }} className="font-bold group-hover:underline">Open →</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* + Create New Playlist Card */}
        <div
          onClick={() => setIsCreatePlaylistOpen(true)}
          style={{
            borderColor: isDark ? `${themeAccent}60` : `${themeAccent}80`,
            backgroundColor: isDark ? `${themeAccent}08` : `${themeAccent}12`,
          }}
          className="p-4 rounded-2xl border-2 border-dashed transition cursor-pointer flex flex-col items-center justify-center text-center group min-h-[200px] hover:brightness-105"
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center transition mb-3 shadow-md"
            style={{ backgroundColor: `${themeAccent}25`, color: themeAccent }}
          >
            <Plus className="w-6 h-6" />
          </div>
          <p className="text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white">
            Create Playlist
          </p>
          <p className="text-[10px] text-neutral-500 mt-1 max-w-[120px]">
            Make custom team mix or mood collection
          </p>
        </div>
      </div>
    </div>
  );

  const renderArtistsView = () => (
    <div className="px-4 sm:px-6 py-4 space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-xs dark:shadow-md">
        <div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setActiveTab("home")}
              className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white p-1 -ml-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              title="Back to Home"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${themeAccent}20`, color: themeAccent }}
            >
              <Mic2 className="w-4 h-4" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">Top Artists & Composers</h2>
            <span
              className="text-xs font-bold px-2.5 py-0.5 rounded-full border"
              style={{ color: themeAccent, backgroundColor: `${themeAccent}15`, borderColor: `${themeAccent}30` }}
            >
              {FEATURED_ARTISTS.length} Featured
            </span>
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
            Tap any artist to start streaming their top tracks or view full discography
          </p>
        </div>
      </div>

      {/* Grid of Artists */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        {FEATURED_ARTISTS.map((artist) => (
          <div
            key={artist.id}
            onClick={() => handlePlayArtist(artist)}
            className="group p-3.5 rounded-2xl bg-white dark:bg-neutral-900/60 hover:bg-neutral-50 dark:hover:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-800/80 transition duration-200 cursor-pointer flex flex-col items-center text-center shadow-xs dark:shadow-lg"
          >
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-950 mb-3 shadow-xl ring-2 ring-transparent group-hover:ring-neutral-400 dark:group-hover:ring-neutral-700 transition">
              <img
                src={artist.image}
                alt={artist.name}
                className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: themeAccent, color: themeTextColor }}
                >
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </div>
              </div>
            </div>

            <p className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate max-w-full transition">
              {artist.name}
            </p>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">
              {artist.tag}
            </p>
            <span
              className="text-[9px] font-mono mt-1 font-semibold"
              style={{ color: themeAccent }}
            >
              {artist.monthlyListeners}
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePlayArtist(artist);
              }}
              style={{
                backgroundColor: `${themeAccent}15`,
                color: themeAccent,
                borderColor: `${themeAccent}30`,
              }}
              className="mt-3 w-full py-1.5 rounded-xl border text-[11px] font-bold transition flex items-center justify-center space-x-1 hover:brightness-110"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Play Hits</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAlbumsView = () => (
    <div className="px-4 sm:px-6 py-4 space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-xs dark:shadow-md">
        <div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setActiveTab("home")}
              className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white p-1 -ml-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              title="Back to Home"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${themeAccent}20`, color: themeAccent }}
            >
              <Disc3 className="w-4 h-4" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">Soundtracks & Studio Albums</h2>
            <span
              className="text-xs font-bold px-2.5 py-0.5 rounded-full border"
              style={{ color: themeAccent, backgroundColor: `${themeAccent}15`, borderColor: `${themeAccent}30` }}
            >
              {FEATURED_ALBUMS.length} Albums
            </span>
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
            Stream whole album soundtracks and superhit movie collections in HD audio
          </p>
        </div>
      </div>

      {/* Grid of Albums */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {FEATURED_ALBUMS.map((album) => (
          <div
            key={album.id}
            onClick={() => handlePlayAlbum(album)}
            className="group p-3 rounded-2xl bg-white dark:bg-neutral-900/60 hover:bg-neutral-50 dark:hover:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-800/80 transition duration-200 cursor-pointer flex flex-col justify-between shadow-xs dark:shadow-lg"
          >
            <div className="relative aspect-square rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-950 mb-3 shadow-md">
              <img
                src={album.image}
                alt={album.title}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shadow-xl"
                  style={{ backgroundColor: themeAccent, color: themeTextColor }}
                >
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </div>
              </div>
              <span className="absolute bottom-2 right-2 text-[10px] font-bold bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded text-white">
                {album.tracksCount} tracks
              </span>
            </div>

            <div>
              <p className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate transition">
                {album.title}
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                {album.artist}
              </p>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-800/60 text-[10px] text-neutral-500 font-semibold">
                <span>{album.year} • Soundtrack</span>
                <span style={{ color: themeAccent }} className="font-bold group-hover:underline">Play →</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderGenresView = () => (
    <div className="px-4 sm:px-6 py-4 space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-xs dark:shadow-md">
        <div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setActiveTab("home")}
              className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white p-1 -ml-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              title="Back to Home"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${themeAccent}20`, color: themeAccent }}
            >
              <Tag className="w-4 h-4" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">Browse All Genres & Moods</h2>
            <span
              className="text-xs font-bold px-2.5 py-0.5 rounded-full border"
              style={{ color: themeAccent, backgroundColor: `${themeAccent}15`, borderColor: `${themeAccent}30` }}
            >
              {FEATURED_GENRES.length} Radios
            </span>
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
            Pick any vibe or language to start endless live radio recommendations
          </p>
        </div>
      </div>

      {/* Grid of Genres */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {FEATURED_GENRES.map((genre) => (
          <div
            key={genre.id}
            onClick={() => handlePlayGenre(genre)}
            className={`group p-5 rounded-2xl bg-gradient-to-br ${genre.gradient} border border-white/10 hover:border-white/30 transition duration-200 cursor-pointer flex flex-col justify-between shadow-xl relative overflow-hidden min-h-[140px] hover:brightness-105`}
          >
            <div className="flex items-start justify-between">
              <span className="text-3xl sm:text-4xl filter drop-shadow-md group-hover:scale-110 transition duration-300">
                {genre.icon}
              </span>
              <div className="w-8 h-8 rounded-full bg-white/20 group-hover:bg-white text-white group-hover:text-neutral-950 flex items-center justify-center transition shadow-md">
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              </div>
            </div>

            <div className="mt-4">
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight drop-shadow-sm">
                {genre.name}
              </h3>
              <p className="text-xs text-white/80 line-clamp-1 mt-0.5">
                {genre.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderLikedView = () => (
    <div className="px-4 sm:px-6 py-4 space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-xs dark:shadow-md">
        <div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setActiveTab("home")}
              className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white p-1 -ml-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              title="Back to Home"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">Liked Songs</h2>
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
              {likedTracks.length} tracks
            </span>
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
            All your favorite tracks saved across live Jam sessions
          </p>
        </div>

        {likedTracks.length > 0 && (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => handlePlayAllInView(likedTracks)}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-900/30 flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Play All</span>
            </button>
            <button
              type="button"
              onClick={() => handleShuffleAllInView(likedTracks)}
              className="px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-200 text-xs font-semibold border border-neutral-300 dark:border-neutral-700 flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Shuffle</span>
            </button>
          </div>
        )}
      </div>

      {likedTracks.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-3 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
            <Heart className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">No liked songs yet</h3>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-sm mx-auto">
            Click the heart icon on any track while listening or browsing to save it to your Liked collection.
          </p>
          <button
            type="button"
            onClick={() => setActiveTab("home")}
            style={{ backgroundColor: themeAccent, color: themeTextColor }}
            className="mt-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs hover:brightness-110"
          >
            Explore Songs
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6">
          {likedTracks.map((t, idx) => {
            const isThisPlaying = currentTrack?.id === t.id && isPlaying;
            return (
              <YouTubeSongCard
                key={`${t.id}-${idx}`}
                track={t}
                isThisPlaying={isThisPlaying}
                isLiked={true}
                onPlay={() => handlePlaySong(t)}
                onToggleLike={(e) => {
                  e.stopPropagation();
                  toggleLike(t);
                }}
                onAddToPlaylist={(e) => {
                  e.stopPropagation();
                  setSongToAddToPlaylist(t);
                }}
                onAddToQueue={(e) => {
                  e.stopPropagation();
                  addToQueue(t);
                  showToast("Added to queue");
                }}
                onShareToChat={() => setShareModalTrack(t)}
              />
            );
          })}
        </div>
      )}
    </div>
  );

  const renderRecentView = () => (
    <div className="px-4 sm:px-6 py-4 space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-xs dark:shadow-md">
        <div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setActiveTab("home")}
              className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white p-1 -ml-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              title="Back to Home"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${themeAccent}20`, color: themeAccent }}
            >
              <Clock className="w-4 h-4" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">Recently Played</h2>
            <span
              className="text-xs font-bold px-2.5 py-0.5 rounded-full border"
              style={{ color: themeAccent, backgroundColor: `${themeAccent}15`, borderColor: `${themeAccent}30` }}
            >
              {recentTracks.length} tracks
            </span>
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
            Tracks you recently enjoyed during your live team Jam sessions
          </p>
        </div>

        {recentTracks.length > 0 && (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => handlePlayAllInView(recentTracks)}
              style={{
                backgroundColor: themeAccent,
                color: themeTextColor,
                boxShadow: `0 4px 14px ${themeAccent}40`,
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer hover:brightness-110"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Play All</span>
            </button>
            <button
              type="button"
              onClick={handleClearRecent}
              className="px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-rose-50 text-neutral-700 hover:text-rose-600 dark:bg-neutral-800 dark:hover:bg-rose-950/40 dark:text-neutral-300 dark:hover:text-rose-300 text-xs font-semibold border border-neutral-300 dark:border-neutral-700 hover:border-rose-300 dark:hover:border-rose-500/40 flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          </div>
        )}
      </div>

      {recentTracks.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-3 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">No recently played tracks</h3>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-sm mx-auto">
            Songs you play will automatically appear here for quick replay and queuing.
          </p>
          <button
            type="button"
            onClick={() => setActiveTab("home")}
            style={{ backgroundColor: themeAccent, color: themeTextColor }}
            className="mt-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs hover:brightness-110"
          >
            Start Listening
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6">
          {recentTracks.map((t, idx) => {
            const isThisPlaying = currentTrack?.id === t.id && isPlaying;
            return (
              <YouTubeSongCard
                key={`${t.id}-${idx}`}
                track={t}
                isThisPlaying={isThisPlaying}
                isLiked={!!likedMap[t.id]}
                onPlay={() => handlePlaySong(t)}
                onToggleLike={(e) => {
                  e.stopPropagation();
                  toggleLike(t);
                }}
                onAddToPlaylist={(e) => {
                  e.stopPropagation();
                  setSongToAddToPlaylist(t);
                }}
                onAddToQueue={(e) => {
                  e.stopPropagation();
                  addToQueue(t);
                  showToast("Added to queue");
                }}
                onShareToChat={() => setShareModalTrack(t)}
              />
            );
          })}
        </div>
      )}
    </div>
  );

  // Import from YouTube Action
  const handleImportYouTube = async () => {
    const url = importUrl.trim();
    if (!url) return;
    setIsImporting(true);
    try {
      let query = url;
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

  // Display track
  const activeDisplayTrack = currentTrack || trendingTracks[0] || INITIAL_TRENDING_TRACKS[0];
  const isDisplayLiked = activeDisplayTrack ? !!likedMap[activeDisplayTrack.id] : false;
  const effectiveDuration = duration || activeDisplayTrack?.duration || 220;
  const progressPercent = Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100));

  // Current selected playlist object and track list
  const selectedPlaylist = selectedPlaylistId ? playlists.find((p) => p.id === selectedPlaylistId) : null;
  const selectedPlaylistTracks = selectedPlaylistId
    ? selectedPlaylistId === "liked"
      ? likedTracks
      : playlistTracksMap[selectedPlaylistId] || []
    : [];

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
    <div className="flex-1 flex flex-col h-full w-full max-w-full bg-[#f8f9fa] dark:bg-[#0d0d12] text-neutral-900 dark:text-white select-none overflow-y-auto overflow-x-hidden scrollbar-thin relative pb-28">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md text-neutral-900 dark:text-white px-4 py-2.5 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 flex items-center space-x-2 text-xs font-semibold animate-in slide-in-from-top-2">
          <Check className="w-4 h-4" style={{ color: themeAccent }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP BAR: Clean & Unified Channel Actions */}
      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800/80 px-4 sm:px-6 py-2 bg-white/80 dark:bg-neutral-950/70 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">#music • Live Jam Session</span>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full hidden sm:inline border"
            style={{ color: themeAccent, backgroundColor: `${themeAccent}15`, borderColor: `${themeAccent}30` }}
          >
            Zero Ads
          </span>
        </div>

        {/* Switch to Reels Studio button */}
        <button
          type="button"
          onClick={() => {
            setReelsCategory("reels");
            setReelsInitialIndex(0);
            setViewMode("reels");
          }}
          className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300 transition flex items-center space-x-1.5 cursor-pointer shadow-xs group"
          title="Switch to 9:16 Video Reels View"
        >
          <Film className="w-3.5 h-3.5 text-pink-500" />
          <span>📱 Switch to Reels</span>
        </button>
      </div>

      {/* 2. HERO KAELIXO MUSIC HEADER WITH SOUNDWAVE GRAPHIC (Exact Screenshot) */}
      <div className="px-4 sm:px-6 pt-4 pb-2">
        <div
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 border rounded-2xl p-5 relative overflow-hidden backdrop-blur-md shadow-sm dark:shadow-xl"
          style={{
            borderColor: `${themeAccent}30`,
            background: isDark
              ? `linear-gradient(90deg, ${themeAccent}18, rgba(23,23,23,0.6), ${themeAccent}10)`
              : `linear-gradient(90deg, ${themeAccent}12, rgba(255,255,255,0.95), ${themeAccent}08)`,
          }}
        >
          {/* Left Title & Subtitle */}
          <div className="flex items-center space-x-4 relative z-10">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0"
              style={{
                backgroundColor: themeAccent,
                color: themeTextColor,
                boxShadow: `0 8px 24px ${themeAccent}40`,
              }}
            >
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center space-x-2">
                <span>Kaelixo Music</span>
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-0.5 font-medium">
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
                  className="w-1 rounded-full animate-pulse"
                  style={{
                    backgroundColor: themeAccent,
                    height: `${h}%`,
                    animationDelay: `${i * 80}ms`,
                  }}
                />
              ))}
            </div>
            <div
              className="w-10 h-10 rounded-full border flex items-center justify-center"
              style={{
                backgroundColor: `${themeAccent}20`,
                borderColor: `${themeAccent}50`,
                color: themeAccent,
              }}
            >
              <Disc3 className="w-6 h-6 animate-spin duration-3000" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. SUB-NAVIGATION PILL BAR (Exact Screenshot: Home, Songs, Playlists, Artists, Albums, Genres, Liked, Recently Played) */}
      <div className="px-4 sm:px-6 py-2 flex items-center space-x-2 overflow-x-auto scrollbar-none flex-shrink-0">
        {NAV_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id && !selectedPlaylistId;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setSelectedPlaylistId(null);
                setActiveTab(tab.id);
                if (tab.id === "liked") {
                  setCatalogTracks(likedTracks);
                } else if (tab.id === "recent") {
                  setCatalogTracks(recentTracks);
                } else if (tab.id === "home") {
                  fetchCategoryTracks("trending", 1, false);
                }
              }}
              style={
                isActive
                  ? {
                      backgroundColor: themeAccent,
                      color: themeTextColor,
                      borderColor: themeAccent,
                      boxShadow: `0 4px 14px ${themeAccent}40`,
                    }
                  : undefined
              }
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 flex-shrink-0 cursor-pointer shadow-xs border ${
                isActive
                  ? "scale-102"
                  : "bg-white hover:bg-neutral-100 text-neutral-700 hover:text-neutral-900 border-neutral-300 dark:bg-neutral-900/90 dark:hover:bg-neutral-800 dark:text-neutral-400 dark:hover:text-white dark:border-neutral-800"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.id === "liked" && likedTracks.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-300 font-extrabold">
                  {likedTracks.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ================= DEDICATED PLAYLIST DETAIL VIEW ================= */}
      {selectedPlaylistId && selectedPlaylist ? (
        <div className="px-4 sm:px-6 py-4 space-y-6">
          {/* Back button */}
          <button
            type="button"
            onClick={() => setSelectedPlaylistId(null)}
            className="flex items-center space-x-1.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>

          {/* Playlist Header Banner */}
          <div className="flex flex-col sm:flex-row items-center gap-5 bg-white dark:bg-neutral-900/70 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs dark:shadow-xl">
            {/* Square Cover with Click/Hover to Edit */}
            <div
              onClick={() => setPlaylistToEdit(selectedPlaylist)}
              className="relative w-36 h-36 rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center flex-shrink-0 shadow-md group cursor-pointer border border-neutral-300 dark:border-neutral-700 hover:brightness-105 transition"
              title="Click to edit playlist cover image & details"
            >
              {selectedPlaylist.thumbnail ? (
                <img
                  src={selectedPlaylist.thumbnail}
                  alt={selectedPlaylist.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
              ) : (
                <div
                  className={`w-full h-full bg-gradient-to-br ${
                    selectedPlaylist.gradient || "from-purple-600 to-pink-600"
                  } flex items-center justify-center text-4xl group-hover:scale-105 transition duration-500`}
                >
                  {selectedPlaylist.icon || "🎵"}
                </div>
              )}

              {/* Hover Edit Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white space-y-1">
                <Camera className="w-6 h-6 text-white drop-shadow-md" />
                <span className="text-[11px] font-bold">Edit Cover</span>
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ color: themeAccent, backgroundColor: `${themeAccent}15` }}
              >
                Playlist
              </span>
              <div className="flex items-center justify-center sm:justify-start space-x-2">
                <h2 className="text-2xl font-black text-neutral-900 dark:text-white truncate">
                  {selectedPlaylist.name}
                </h2>
                <button
                  type="button"
                  onClick={() => setPlaylistToEdit(selectedPlaylist)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition cursor-pointer"
                  title="Edit playlist name & description"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">{selectedPlaylist.description || "Custom Team Mix"}</p>
              <div className="flex items-center justify-center sm:justify-start space-x-3 pt-1 text-xs text-neutral-600 dark:text-neutral-300">
                <span>{selectedPlaylistTracks.length} songs</span>
                <span>•</span>
                <span>Synced Jam Ready</span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedPlaylistTracks.length > 0) {
                      handlePlaySong(selectedPlaylistTracks[0], selectedPlaylistTracks);
                    } else {
                      showToast("Playlist is empty. Add songs first!");
                    }
                  }}
                  style={{
                    backgroundColor: themeAccent,
                    color: themeTextColor,
                    boxShadow: `0 4px 14px ${themeAccent}40`,
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer hover:brightness-110"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play All</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleShufflePlay(selectedPlaylistTracks)}
                  className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white rounded-xl text-xs font-bold border border-neutral-300 dark:border-neutral-700 transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Shuffle</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPlaylistToEdit(selectedPlaylist)}
                  className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-white rounded-xl text-xs font-bold border border-neutral-300 dark:border-neutral-700 transition flex items-center space-x-1.5 cursor-pointer"
                  title="Edit playlist name, cover photo & description"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit Playlist</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("home");
                    setSelectedPlaylistId(null);
                    showToast(`Browse songs below and click "+ Playlist" to add to "${selectedPlaylist.name}"!`);
                  }}
                  style={{
                    color: themeAccent,
                    borderColor: `${themeAccent}50`,
                    backgroundColor: `${themeAccent}15`,
                  }}
                  className="px-3.5 py-2 border rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer hover:brightness-125"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>+ Add Songs to Playlist</span>
                </button>

                {selectedPlaylist.isCustom && (
                  <button
                    type="button"
                    onClick={(e) => handleDeletePlaylist(selectedPlaylist.id, e)}
                    className="p-2 text-neutral-400 hover:text-rose-500 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                    title="Delete custom playlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tracks List in this Playlist */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
              Songs in this playlist ({selectedPlaylistTracks.length})
            </h3>

            {selectedPlaylistTracks.length > 0 ? (
              <div className="space-y-1.5">
                {selectedPlaylistTracks.map((track, idx) => {
                  const isThisPlaying = currentTrack?.id === track.id && isPlaying;
                  return (
                    <div
                      key={`${track.id}-${idx}`}
                      onClick={() => handlePlaySong(track, selectedPlaylistTracks)}
                      className="p-2.5 rounded-xl bg-white hover:bg-neutral-50 dark:bg-neutral-900/60 dark:hover:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-800/80 flex items-center justify-between transition cursor-pointer group shadow-2xs"
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500 w-5 text-center">
                          {idx + 1}
                        </span>
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-950 flex-shrink-0">
                          <img
                            src={track.thumbnail}
                            alt={track.title}
                            className="w-full h-full object-cover"
                          />
                          {isThisPlaying && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <span
                                className="w-2 h-2 rounded-full animate-ping"
                                style={{ backgroundColor: themeAccent }}
                              />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className="text-xs font-bold truncate text-neutral-900 dark:text-white"
                            style={isThisPlaying ? { color: themeAccent } : undefined}
                          >
                            {cleanSongTitle(track.title)}
                          </p>
                          <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                            {cleanArtistName(track.artist)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 text-xs text-neutral-500 dark:text-neutral-400 flex-shrink-0">
                        <span className="font-mono text-[11px]">{track.durationFormatted || "3:30"}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLike(track);
                          }}
                          className="p-1 hover:text-rose-500"
                        >
                          <Heart className={`w-3.5 h-3.5 ${likedMap[track.id] ? "fill-rose-500 text-rose-500" : ""}`} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleRemoveFromPlaylist(selectedPlaylist.id, track.id, e)}
                          className="p-1 hover:text-rose-500 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition"
                          title="Remove from playlist"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl bg-white dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 border-dashed space-y-3">
                <Music className="w-8 h-8 text-neutral-400 dark:text-neutral-600 mx-auto" />
                <p className="text-xs text-neutral-600 dark:text-neutral-400">This playlist has no songs yet.</p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("home");
                    setSelectedPlaylistId(null);
                  }}
                  style={{ backgroundColor: themeAccent, color: themeTextColor }}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold transition shadow-xs hover:brightness-110"
                >
                  Browse Songs to Add
                </button>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === "songs" ? (
        renderSongsView()
      ) : activeTab === "playlists" ? (
        renderPlaylistsView()
      ) : activeTab === "artists" ? (
        renderArtistsView()
      ) : activeTab === "albums" ? (
        renderAlbumsView()
      ) : activeTab === "genres" ? (
        renderGenresView()
      ) : activeTab === "liked" ? (
        renderLikedView()
      ) : activeTab === "recent" ? (
        renderRecentView()
      ) : (
        /* 4. MAIN DASHBOARD CONTENT (When activeTab === "home") */
        <div className="px-4 sm:px-6 py-3 space-y-6">
          {/* ================= HERO TWO-PANEL SECTION: NOW PLAYING & QUICK ACTIONS (Exact Screenshot) ================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* LEFT CARD: NOW PLAYING CARD (Exact Screenshot) */}
            <div className="lg:col-span-8 bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-5 backdrop-blur-md shadow-xs dark:shadow-xl relative overflow-hidden">
              {/* Square Album Cover with Floating Heart Button */}
              <div
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/x-kaelixo-track", JSON.stringify(activeDisplayTrack));
                  const shareUrl = activeDisplayTrack.url || `https://www.youtube.com/watch?v=${activeDisplayTrack.id}`;
                  e.dataTransfer.setData("text/plain", `🎶 **${cleanSongTitle(activeDisplayTrack.title)}** - ${cleanArtistName(activeDisplayTrack.artist)}\n${shareUrl}`);
                  e.dataTransfer.setData("text/uri-list", shareUrl);
                  e.dataTransfer.effectAllowed = "copy";
                  createCompactDragGhost(e, activeDisplayTrack);
                }}
                className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden shadow-md dark:shadow-2xl bg-neutral-100 dark:bg-neutral-950 flex-shrink-0 group cursor-grab active:cursor-grabbing"
                title={`${cleanSongTitle(activeDisplayTrack.title)} - ${cleanArtistName(activeDisplayTrack.artist)} (Drag to chat)`}
              >
                <img
                  src={activeDisplayTrack.thumbnail}
                  alt={activeDisplayTrack.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

                {/* Drag Hint on Hover */}
                <div className="absolute bottom-2.5 left-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-white/95 shadow-md border border-white/15 flex items-center space-x-1">
                    <span>⋮⋮ Drag to chat</span>
                  </span>
                </div>

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
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="tracking-wide uppercase text-[10px]">Now Playing</span>
                  </div>

                  {/* Song Title & Artist */}
                  <h2 className="text-lg sm:text-xl font-extrabold text-neutral-900 dark:text-white truncate drop-shadow-sm">
                    {cleanSongTitle(activeDisplayTrack.title)}
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 font-medium truncate mt-0.5">
                    {cleanArtistName(activeDisplayTrack.artist)}
                  </p>
                </div>

                {/* Progress Scrubber Line */}
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-3 text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                    <span>{formatTime(currentTime)}</span>
                    <div
                      ref={progressBarRef}
                      onClick={handleScrubberClick}
                      className="flex-1 h-1.5 bg-neutral-200 dark:bg-neutral-800 hover:h-2 rounded-full overflow-hidden cursor-pointer relative transition-all duration-150"
                    >
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%`, backgroundColor: themeAccent }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition cursor-pointer"
                      title={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Playback Controls (Shuffle, Prev, Big Theme Play/Pause, Next, Repeat + ADD TO PLAYLIST) */}
                <div className="flex items-center justify-center space-x-3 sm:space-x-4 pt-1">
                  {/* Shuffle */}
                  <button
                    type="button"
                    onClick={() => handleShufflePlay()}
                    className="p-2 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                    title="Shuffle Library"
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>

                  {/* Previous */}
                  <button
                    type="button"
                    onClick={playPrevious}
                    className="p-2 text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                    title="Previous Track"
                  >
                    <SkipBack className="w-5 h-5" />
                  </button>

                  {/* BIG THEME PLAY / PAUSE BUTTON */}
                  <button
                    type="button"
                    onClick={() => handlePlaySong(activeDisplayTrack)}
                    style={{
                      backgroundColor: themeAccent,
                      color: themeTextColor,
                      boxShadow: `0 6px 20px ${themeAccent}50`,
                    }}
                    className="w-12 h-12 rounded-full flex items-center justify-center transition transform hover:scale-108 active:scale-95 cursor-pointer"
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
                    className="p-2 text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
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
                    className="p-2 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                    title="Replay from start"
                  >
                    <Repeat className="w-4 h-4" />
                  </button>

                  {/* + ADD TO PLAYLIST BUTTON RIGHT ON NOW PLAYING CARD */}
                  <button
                    type="button"
                    onClick={() => setSongToAddToPlaylist(activeDisplayTrack)}
                    style={{
                      color: themeAccent,
                      borderColor: `${themeAccent}50`,
                      backgroundColor: `${themeAccent}18`,
                    }}
                    className="p-2 rounded-full transition cursor-pointer hover:brightness-125 border"
                    title="Add current song to a playlist"
                  >
                    <FolderPlus className="w-4 h-4" />
                  </button>

                  {/* Share to Chat button */}
                  <button
                    type="button"
                    onClick={() => setShareModalTrack(activeDisplayTrack)}
                    className="p-2 text-neutral-500 hover:text-sky-500 dark:text-neutral-400 dark:hover:text-sky-400 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                    title="Forward song to chat or colleague"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT CARD: QUICK ACTIONS (Exact Screenshot) */}
            <div className="lg:col-span-4 bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between backdrop-blur-md shadow-xs dark:shadow-xl">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-3 flex items-center space-x-1.5">
                  <span>Quick Actions</span>
                </h3>

                {/* 2x2 Grid of Actions matching Screenshot */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* 1. + Create Playlist */}
                  <button
                    type="button"
                    onClick={() => setIsCreatePlaylistOpen(true)}
                    style={{ borderColor: `${themeAccent}40` }}
                    className="p-3 bg-neutral-50 dark:bg-neutral-800/70 hover:bg-neutral-100 dark:hover:bg-neutral-800 border rounded-xl text-left transition cursor-pointer group shadow-xs"
                  >
                    <div className="flex items-center space-x-2 text-xs font-bold">
                      <Plus className="w-4 h-4" style={{ color: themeAccent }} />
                      <span style={{ color: themeAccent }}>Create Playlist</span>
                    </div>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">Make custom mix</p>
                  </button>

                  {/* 2. 🔮 Discover */}
                  <button
                    type="button"
                    onClick={handleDiscover}
                    className="p-3 bg-neutral-50 dark:bg-neutral-800/70 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 rounded-xl text-left transition cursor-pointer group shadow-xs"
                  >
                    <div className="flex items-center space-x-2 text-xs font-bold text-neutral-800 dark:text-white">
                      <Compass className="w-4 h-4 text-fuchsia-500" />
                      <span>Discover</span>
                    </div>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">Find fresh viral hits</p>
                  </button>

                  {/* 3. ⬇ Import (YouTube) */}
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(true)}
                    className="p-3 bg-neutral-50 dark:bg-neutral-800/70 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 rounded-xl text-left transition cursor-pointer group shadow-xs"
                  >
                    <div className="flex items-center space-x-2 text-xs font-bold text-neutral-800 dark:text-white">
                      <Download className="w-4 h-4 text-rose-500" />
                      <span>Import (YouTube)</span>
                    </div>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">Paste any video link</p>
                  </button>

                  {/* 4. 🔀 Shuffle Play */}
                  <button
                    type="button"
                    onClick={() => handleShufflePlay()}
                    className="p-3 bg-neutral-50 dark:bg-neutral-800/70 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 rounded-xl text-left transition cursor-pointer group shadow-xs"
                  >
                    <div className="flex items-center space-x-2 text-xs font-bold text-neutral-800 dark:text-white">
                      <Shuffle className="w-4 h-4 text-indigo-500" />
                      <span>Shuffle Play</span>
                    </div>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">Play random mix</p>
                  </button>

                  {/* 5. ✨ AI Voice DJ */}
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(new CustomEvent("kaelixo-open-ai-dj"));
                      }
                    }}
                    className="col-span-2 p-3 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-emerald-500/10 hover:from-purple-500/20 hover:via-pink-500/20 hover:to-emerald-500/20 border border-purple-500/30 rounded-xl text-left transition cursor-pointer group shadow-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2 text-xs font-bold text-neutral-900 dark:text-white">
                        <Sparkles className="w-4 h-4 text-purple-500 animate-spin-slow" />
                        <span>AI Voice DJ</span>
                        <span className="px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-300 text-[9px] font-extrabold uppercase">
                          Voice & Text
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Say "Next", "Volume 80%", "Play Aavesham"
                      </p>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition">
                      <Mic className="w-3.5 h-3.5" />
                    </div>
                  </button>
                </div>
              </div>

              {/* Jam Session Status Indicator */}
              <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-800/80 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                <span className="flex items-center space-x-1.5">
                  <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                  <span>Ad-Free Synchronized Jam</span>
                </span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ color: themeAccent, backgroundColor: `${themeAccent}20` }}
                >
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
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-wide">Trending Songs</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("songs")}
                style={{ color: themeAccent }}
                className="text-xs font-bold flex items-center space-x-1 cursor-pointer hover:brightness-125"
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
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/x-kaelixo-track", JSON.stringify(track));
                      const shareUrl = track.url || `https://www.youtube.com/watch?v=${track.id}`;
                      e.dataTransfer.setData("text/plain", `🎶 **${cleanSongTitle(track.title)}** - ${cleanArtistName(track.artist)}\n${shareUrl}`);
                      e.dataTransfer.setData("text/uri-list", shareUrl);
                      e.dataTransfer.effectAllowed = "copy";
                      createCompactDragGhost(e, track);
                    }}
                    onClick={() => handlePlaySong(track, trendingTracks)}
                    className="group flex flex-col space-y-2 cursor-pointer cursor-grab active:cursor-grabbing relative"
                    title={`${cleanSongTitle(track.title)} - ${cleanArtistName(track.artist)} (Drag to chat)`}
                  >
                    {/* Thumbnail Card with 16:9 / 16:10 aspect ratio */}
                    <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/80 transition duration-300 shadow-xs dark:shadow-md">
                      <img
                        src={track.thumbnail}
                        alt={track.title}
                        className="w-full h-full object-cover group-hover:scale-108 transition duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                      {/* Top Action Overlay: Share + Playlist */}
                      <div className="absolute top-2 right-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition z-10">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShareModalTrack(track);
                          }}
                          className="w-7 h-7 rounded-full bg-black/70 hover:bg-sky-600 text-white flex items-center justify-center transition shadow-md cursor-pointer"
                          title="Forward song to chat or colleague"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSongToAddToPlaylist(track);
                          }}
                          className="w-7 h-7 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition shadow-md cursor-pointer"
                          title="Add to playlist"
                        >
                          <FolderPlus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Drag hint on hover */}
                      <span className="absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-black/80 text-white/90 opacity-0 group-hover:opacity-100 transition pointer-events-none">
                        ⋮⋮ Drag
                      </span>

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
                      <p className="text-xs font-bold text-neutral-900 dark:text-white truncate transition">
                        {cleanSongTitle(track.title)}
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
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
                <Library className="w-4 h-4" style={{ color: themeAccent }} />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-wide">Your Playlists</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("playlists")}
                style={{ color: themeAccent }}
                className="text-xs font-bold flex items-center space-x-1 cursor-pointer hover:brightness-125"
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
                  onClick={() => setSelectedPlaylistId(pl.id)}
                  className="group p-3 rounded-xl bg-white dark:bg-neutral-900/60 hover:bg-neutral-50 dark:hover:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-800/80 transition cursor-pointer flex flex-col justify-between shadow-xs dark:shadow-md relative hover:brightness-105"
                >
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center mb-2 shadow-inner">
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

                    {/* Edit button on hover */}
                    {pl.isCustom && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlaylistToEdit(pl);
                        }}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/75 hover:bg-black text-white/90 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-md z-10 cursor-pointer"
                        title="Edit playlist"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-bold text-neutral-900 dark:text-white truncate transition">
                      {pl.name}
                    </p>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      {pl.id === "liked" ? likedTracks.length : (playlistTracksMap[pl.id]?.length ?? pl.songCount)} songs
                    </p>
                  </div>
                </div>
              ))}

              {/* + New Playlist Action Card */}
              <div
                onClick={() => setIsCreatePlaylistOpen(true)}
                className="p-3 rounded-xl border border-dashed hover:brightness-105 transition cursor-pointer flex flex-col items-center justify-center text-center group min-h-[140px]"
                style={{
                  borderColor: isDark ? `${themeAccent}60` : `${themeAccent}80`,
                  backgroundColor: isDark ? `${themeAccent}08` : `${themeAccent}12`,
                }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center transition mb-2 shadow-sm"
                  style={{ backgroundColor: `${themeAccent}25`, color: themeAccent }}
                >
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white">
                  New Playlist
                </span>
              </div>
            </div>
          </div>

          {/* ================= SEARCH BAR ================= */}
          <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800/80 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search any song, artist, album or paste YouTube URL (e.g. Aavesham, Anirudh, Taylor Swift)..."
                className="w-full pl-10 pr-24 py-2.5 bg-white dark:bg-neutral-900/90 border border-neutral-300 dark:border-neutral-800 rounded-xl text-xs sm:text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-1 shadow-inner transition"
              />
              {isSearching && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: themeAccent }} />
                </div>
              )}
            </div>

            {/* Quick trending chips */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              <span className="text-neutral-600 dark:text-neutral-400 text-[11px] font-semibold flex items-center space-x-1 flex-shrink-0">
                <Sparkles className="w-3 h-3" style={{ color: themeAccent }} />
                <span>Trending Tags:</span>
              </span>
              {["Aavesham", "Illuminati", "Manjummel Boys", "Anirudh", "Malayalam Viral", "K-Pop", "Lo-Fi", "Arijit Singh"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSearchQuery(tag)}
                  className="px-2.5 py-1 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-700 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white border border-neutral-300 dark:border-neutral-800 transition text-[11px] flex-shrink-0 cursor-pointer"
                >
                  #{tag}
                </button>
              ))}
            </div>

            {/* Search Results Dropdown with "Add to Playlist" Option */}
            {searchResults.length > 0 && (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl p-2 divide-y divide-neutral-100 dark:divide-neutral-800/60 max-h-72 overflow-y-auto">
                {searchResults.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => handlePlaySong(t)}
                    className="p-2 flex items-center justify-between hover:bg-neutral-100 dark:hover:bg-neutral-800/60 rounded-lg transition cursor-pointer group"
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <img
                        src={t.thumbnail}
                        alt={t.title}
                        className="w-9 h-9 rounded-lg object-cover bg-neutral-100 dark:bg-neutral-950 flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">{cleanSongTitle(t.title)}</p>
                        <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">{cleanArtistName(t.artist)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSongToAddToPlaylist(t);
                        }}
                        style={{ color: themeAccent, borderColor: `${themeAccent}50` }}
                        className="p-1.5 rounded-lg hover:brightness-125 text-xs border"
                        title="Add to Playlist"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToQueue(t);
                          showToast(`Added to queue`);
                        }}
                        className="p-1.5 rounded-lg text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs transition"
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
                        style={{ backgroundColor: themeAccent, color: themeTextColor }}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold transition hover:brightness-110 shadow-xs"
                      >
                        Play
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ================= SECTION 3: ✨ ALL MUSIC RADIOS & ENDLESS STREAM (Always on Home) ================= */}
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800/80 space-y-4">
            {/* Header with Title and Fresh Mix */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4" style={{ color: themeAccent }} />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                  Music Radios & Categories
                </h3>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-bold border"
                  style={{ color: themeAccent, backgroundColor: `${themeAccent}15`, borderColor: `${themeAccent}30` }}
                >
                  {allCategories.length} Mixes
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setPage(1);
                    fetchCategoryTracks(activeCategory, 1, false);
                    showToast("🎲 Mixed fresh songs!");
                  }}
                  style={{
                    color: themeAccent,
                    backgroundColor: `${themeAccent}15`,
                    borderColor: `${themeAccent}30`,
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center space-x-1.5 transition cursor-pointer hover:brightness-125"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Fresh Mix</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddingCategory((v) => !v)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 flex items-center space-x-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Filter</span>
                </button>
              </div>
            </div>

            {/* Inline Add Custom Category / Filter Form */}
            {isAddingCategory && (
              <div className="p-3 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl shadow-lg space-y-2 animate-in slide-in-from-top-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center space-x-1.5">
                    <Tag className="w-3.5 h-3.5" style={{ color: themeAccent }} />
                    <span>Add Singer, Language, or Place</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(false)}
                    className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g. Coldplay, Sid Sriram, Taylor Swift, Kerala Indie..."
                    className="flex-1 px-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newCategoryName.trim()) {
                        const clean = newCategoryName.trim();
                        const id = clean.toLowerCase();
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
                        showToast(`Added filter "${clean}"!`);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newCategoryName.trim()) return;
                      const clean = newCategoryName.trim();
                      const id = clean.toLowerCase();
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
                      showToast(`Added filter "${clean}"!`);
                    }}
                    style={{ backgroundColor: themeAccent, color: themeTextColor }}
                    className="px-3.5 py-1.5 text-xs font-bold rounded-lg transition hover:brightness-110"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {/* Scrollable Horizontal Pill Bar matching YouTube 1:1 */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
              {filteredCategories.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    style={
                      isActive
                        ? {
                            backgroundColor: themeAccent,
                            color: themeTextColor,
                            borderColor: themeAccent,
                          }
                        : undefined
                    }
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center space-x-1.5 flex-shrink-0 cursor-pointer shadow-xs border ${
                      isActive
                        ? "font-bold shadow-md scale-102"
                        : "bg-white hover:bg-neutral-100 text-neutral-800 hover:text-neutral-900 border-neutral-300 dark:bg-neutral-800/90 dark:hover:bg-neutral-700 dark:text-neutral-200 dark:hover:text-white dark:border-neutral-700/60"
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>

            {/* ENDLESS RECOMMENDATIONS GRID (YouTube 1:1 Parity) */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-neutral-800 dark:text-neutral-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: themeAccent }} />
                  <span>{allCategories.find((c) => c.id === activeCategory)?.name || activeCategory}</span>
                  <span className="text-neutral-500 font-normal">• Endless Stream (Page {page})</span>
                </span>
                <span
                  className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border"
                  style={{ color: themeAccent, backgroundColor: `${themeAccent}15`, borderColor: `${themeAccent}30` }}
                >
                  ⚡ Auto-Loading on Scroll
                </span>
              </div>

              {/* YouTube-style 16:9 4-column Card Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6">
                {catalogTracks
                  .filter((t) => !hiddenTrackIds.includes(t.id))
                  .map((t, idx) => {
                    const isThisPlaying = currentTrack?.id === t.id && isPlaying;
                    return (
                      <YouTubeSongCard
                        key={`${t.id}-${idx}`}
                        track={t}
                        isThisPlaying={isThisPlaying}
                        isLiked={!!likedMap[t.id]}
                        onPlay={() => handlePlaySong(t)}
                        onToggleLike={(e) => {
                          e.stopPropagation();
                          toggleLike(t);
                        }}
                        onAddToPlaylist={(e) => {
                          e.stopPropagation();
                          setSongToAddToPlaylist(t);
                        }}
                        onAddToQueue={(e) => {
                          e.stopPropagation();
                          addToQueue(t);
                          showToast(`Added to queue`);
                        }}
                        onHide={(e) => {
                          e.stopPropagation();
                          hideTrack(t.id);
                          showToast(`Hidden song from recommendations`);
                        }}
                        onShareToChat={() => setShareModalTrack(t)}
                      />
                    );
                  })}
              </div>

              {/* Infinite Scroll Auto-Load Sentinel */}
              <div ref={observerTargetRef} className="pt-6 pb-12 flex items-center justify-center">
                {isLoading && (
                  <div
                    className="flex items-center space-x-2 text-xs font-semibold py-3 animate-pulse"
                    style={{ color: themeAccent }}
                  >
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: themeAccent }} />
                    <span>Loading more songs endlessly from YouTube...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 1: ADD SONG TO PLAYLIST ================= */}
      {songToAddToPlaylist && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700/80 rounded-2xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <div className="flex items-center space-x-2">
                <FolderPlus className="w-5 h-5" style={{ color: themeAccent }} />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Add Song to Playlist</h3>
              </div>
              <button
                type="button"
                onClick={() => setSongToAddToPlaylist(null)}
                className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Target Song Info */}
            <div className="flex items-center space-x-3 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60">
              <img
                src={songToAddToPlaylist.thumbnail}
                alt={songToAddToPlaylist.title}
                className="w-11 h-11 rounded-lg object-cover bg-neutral-100 dark:bg-neutral-950 flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                  {cleanSongTitle(songToAddToPlaylist.title)}
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                  {cleanArtistName(songToAddToPlaylist.artist)}
                </p>
              </div>
            </div>

            {/* Playlists List */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
              {playlists.map((pl) => {
                const list = pl.id === "liked" ? likedTracks : playlistTracksMap[pl.id] || [];
                const isInPlaylist = pl.id === "liked" ? !!likedMap[songToAddToPlaylist.id] : list.some((t) => t.id === songToAddToPlaylist.id);

                return (
                  <div
                    key={pl.id}
                    onClick={() => handleToggleSongInPlaylist(pl.id, songToAddToPlaylist)}
                    className="p-2.5 rounded-xl bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800/40 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/50 flex items-center justify-between transition cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 text-lg flex-shrink-0">
                        {pl.thumbnail ? (
                          <img src={pl.thumbnail} alt={pl.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{pl.icon || "🎵"}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">{pl.name}</p>
                        <p className="text-[10px] text-neutral-500 dark:text-neutral-400">{list.length} songs</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      style={
                        isInPlaylist
                          ? undefined
                          : { backgroundColor: themeAccent, color: themeTextColor }
                      }
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                        isInPlaylist
                          ? "bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40"
                          : "hover:brightness-110"
                      }`}
                    >
                      {isInPlaylist ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => {
                  setIsCreatePlaylistOpen(true);
                }}
                style={{ color: themeAccent }}
                className="text-xs font-bold flex items-center space-x-1 cursor-pointer hover:brightness-125"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Playlist</span>
              </button>

              <button
                type="button"
                onClick={() => setSongToAddToPlaylist(null)}
                className="px-4 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-300 text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: CREATE PLAYLIST ================= */}
      {isCreatePlaylistOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <div className="flex items-center space-x-2">
                <FolderPlus className="w-5 h-5" style={{ color: themeAccent }} />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Create New Playlist</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatePlaylistOpen(false)}
                className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Playlist Name
                </label>
                <input
                  type="text"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="e.g. Late Night Vibes, Gym Energy..."
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-1"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={newPlaylistDesc}
                  onChange={(e) => setNewPlaylistDesc(e.target.value)}
                  placeholder="e.g. Best tracks for study & coding sessions"
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-1"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Pick an Icon
                </label>
                <div className="flex items-center space-x-2">
                  {["🎵", "🔥", "🌴", "☕", "⚡", "🌙", "🎸", "💖", "🎧", "🚀"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewPlaylistIcon(emoji)}
                      style={
                        newPlaylistIcon === emoji
                          ? { backgroundColor: themeAccent, borderColor: themeAccent, color: themeTextColor }
                          : undefined
                      }
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition cursor-pointer border ${
                        newPlaylistIcon === emoji
                          ? "scale-110"
                          : "bg-neutral-100 hover:bg-neutral-200 border-neutral-300 text-neutral-800 dark:bg-neutral-800 dark:border-neutral-700 dark:hover:bg-neutral-700 dark:text-white"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
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
                        newPlaylistColor === grad ? "ring-2 ring-neutral-900 dark:ring-white scale-110" : ""
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setIsCreatePlaylistOpen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreatePlaylist}
                disabled={!newPlaylistName.trim()}
                style={{
                  backgroundColor: themeAccent,
                  color: themeTextColor,
                  boxShadow: `0 4px 14px ${themeAccent}40`,
                }}
                className="px-4 py-1.5 rounded-xl disabled:opacity-50 text-xs font-bold transition shadow-md hover:brightness-110"
              >
                Create Playlist
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: IMPORT YOUTUBE ================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <div className="flex items-center space-x-2">
                <Download className="w-5 h-5 text-rose-500" />
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Import from YouTube</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                YouTube URL or Song Title
              </label>
              <input
                type="text"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... or song name"
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                autoFocus
              />
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">
                Paste any YouTube video link to add it directly to your shared Jam queue.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-semibold"
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

      {/* Share / Forward Song Modal (WhatsApp / Slack Parity as requested by user) */}
      <ShareSongModal
        isOpen={Boolean(shareModalTrack)}
        onClose={() => setShareModalTrack(null)}
        track={shareModalTrack}
        currentUser={currentUser}
        channels={channels}
        members={members}
        onSendToTarget={async (targetId, content) => {
          if (onSendMessageToTarget) {
            await onSendMessageToTarget(targetId, content);
          } else {
            onSendMessage(content);
          }
        }}
        onSelectChannel={onSelectChannel}
        onSelectDirectMessage={onSelectDirectMessage}
      />

      {/* Edit Playlist Details & Cover Modal */}
      <EditPlaylistModal
        isOpen={Boolean(playlistToEdit)}
        onClose={() => setPlaylistToEdit(null)}
        playlist={playlistToEdit}
        onSave={handleUpdatePlaylist}
        themeAccent={themeAccent}
        themeTextColor={themeTextColor}
      />
    </div>
  );
}
