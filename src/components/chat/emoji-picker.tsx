"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Smile,
  ThumbsUp,
  Users,
  Package,
  Heart,
  Search,
  X,
} from "lucide-react";

export interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
  align?: "left" | "right";
  className?: string;
}

interface EmojiItem {
  emoji: string;
  name: string;
  category: "smileys" | "gestures" | "people" | "objects" | "symbols";
  keywords: string[];
}

const EMOJI_DATA: EmojiItem[] = [
  // Smileys
  { emoji: "😀", name: "Grinning Face", category: "smileys", keywords: ["smile", "happy", "joy"] },
  { emoji: "😃", name: "Smiling Face with Big Eyes", category: "smileys", keywords: ["smile", "happy"] },
  { emoji: "😄", name: "Smiling Face with Smiling Eyes", category: "smileys", keywords: ["laugh", "happy"] },
  { emoji: "😁", name: "Beaming Face with Smiling Eyes", category: "smileys", keywords: ["grin", "cheerful"] },
  { emoji: "😆", name: "Grinning Squinting Face", category: "smileys", keywords: ["laugh", "lol"] },
  { emoji: "😅", name: "Grinning Face with Sweat", category: "smileys", keywords: ["sweat", "nervous"] },
  { emoji: "😂", name: "Face with Tears of Joy", category: "smileys", keywords: ["laugh", "crying", "lol"] },
  { emoji: "🤣", name: "Rolling on the Floor Laughing", category: "smileys", keywords: ["rofl", "lol"] },
  { emoji: "😊", name: "Smiling Face with Smiling Eyes", category: "smileys", keywords: ["warm", "happy"] },
  { emoji: "😇", name: "Smiling Face with Halo", category: "smileys", keywords: ["angel", "innocent"] },
  { emoji: "🙂", name: "Slightly Smiling Face", category: "smileys", keywords: ["polite", "smile"] },
  { emoji: "😉", name: "Winking Face", category: "smileys", keywords: ["wink", "flirt"] },
  { emoji: "😍", name: "Smiling Face with Heart-Eyes", category: "smileys", keywords: ["love", "heart"] },
  { emoji: "🥰", name: "Smiling Face with Hearts", category: "smileys", keywords: ["love", "crush"] },
  { emoji: "😘", name: "Face Blowing a Kiss", category: "smileys", keywords: ["kiss", "love"] },
  { emoji: "😋", name: "Face Savoring Food", category: "smileys", keywords: ["delicious", "tasty", "yum"] },
  { emoji: "😎", name: "Smiling Face with Sunglasses", category: "smileys", keywords: ["cool", "glasses"] },
  { emoji: "🥳", name: "Partying Face", category: "smileys", keywords: ["celebration", "party", "yay"] },
  { emoji: "🤔", name: "Thinking Face", category: "smileys", keywords: ["hmm", "curious", "think"] },
  { emoji: "🫡", name: "Saluting Face", category: "smileys", keywords: ["respect", "salute"] },
  { emoji: "🤫", name: "Shushing Face", category: "smileys", keywords: ["quiet", "secret"] },
  { emoji: "😴", name: "Sleeping Face", category: "smileys", keywords: ["sleep", "tired", "zzz"] },
  { emoji: "🤯", name: "Exploding Head", category: "smileys", keywords: ["mindblown", "shock"] },
  { emoji: "😭", name: "Loudly Crying Face", category: "smileys", keywords: ["cry", "sad", "tears"] },

  // Gestures
  { emoji: "👍", name: "Thumbs Up", category: "gestures", keywords: ["approve", "agree", "yes", "like"] },
  { emoji: "👎", name: "Thumbs Down", category: "gestures", keywords: ["disagree", "no", "dislike"] },
  { emoji: "👏", name: "Clapping Hands", category: "gestures", keywords: ["applause", "bravo", "good"] },
  { emoji: "🙌", name: "Raising Hands", category: "gestures", keywords: ["celebrate", "praise", "cheer"] },
  { emoji: "👐", name: "Open Hands", category: "gestures", keywords: ["open", "hug"] },
  { emoji: "🤝", name: "Handshake", category: "gestures", keywords: ["deal", "partner", "agreement"] },
  { emoji: "🙏", name: "Folded Hands", category: "gestures", keywords: ["please", "thank you", "pray"] },
  { emoji: "✌️", name: "Victory Hand", category: "gestures", keywords: ["peace", "v"] },
  { emoji: "🤞", name: "Crossed Fingers", category: "gestures", keywords: ["luck", "hope"] },
  { emoji: "🤟", name: "Love-You Gesture", category: "gestures", keywords: ["ily", "love"] },
  { emoji: "🤘", name: "Sign of the Horns", category: "gestures", keywords: ["rock", "metal"] },
  { emoji: "🤙", name: "Call Me Hand", category: "gestures", keywords: ["shaka", "call"] },
  { emoji: "👋", name: "Waving Hand", category: "gestures", keywords: ["hello", "bye", "hi"] },
  { emoji: "💪", name: "Flexed Biceps", category: "gestures", keywords: ["strong", "power", "flex"] },
  { emoji: "👊", name: "Oncoming Fist", category: "gestures", keywords: ["fistbump", "bro"] },
  { emoji: "👌", name: "OK Hand", category: "gestures", keywords: ["okay", "perfect", "ok"] },

  // People
  { emoji: "🧑‍💻", name: "Technologist", category: "people", keywords: ["coder", "developer", "engineer"] },
  { emoji: "👩‍💼", name: "Office Worker", category: "people", keywords: ["business", "manager", "work"] },
  { emoji: "👨‍🏫", name: "Teacher", category: "people", keywords: ["instructor", "teaching", "education"] },
  { emoji: "🕵️", name: "Detective", category: "people", keywords: ["investigate", "spy", "inspect"] },
  { emoji: "🚀", name: "Astronaut / Rocket", category: "people", keywords: ["ship", "launch", "space"] },
  { emoji: "🦸", name: "Superhero", category: "people", keywords: ["hero", "save"] },

  // Objects
  { emoji: "💻", name: "Laptop", category: "objects", keywords: ["computer", "code", "tech"] },
  { emoji: "📱", name: "Mobile Phone", category: "objects", keywords: ["cell", "call", "device"] },
  { emoji: "💡", name: "Light Bulb", category: "objects", keywords: ["idea", "smart", "insight"] },
  { emoji: "🔥", name: "Fire", category: "objects", keywords: ["lit", "hot", "trending"] },
  { emoji: "🎉", name: "Party Popper", category: "objects", keywords: ["celebrate", "tada", "congrats"] },
  { emoji: "🎯", name: "Bullseye", category: "objects", keywords: ["target", "goal", "accuracy"] },
  { emoji: "☕", name: "Hot Beverage", category: "objects", keywords: ["coffee", "tea", "break"] },
  { emoji: "📦", name: "Package", category: "objects", keywords: ["delivery", "box", "shipping"] },
  { emoji: "📎", name: "Paperclip", category: "objects", keywords: ["attachment", "file"] },
  { emoji: "💼", name: "Briefcase", category: "objects", keywords: ["business", "work", "job"] },
  { emoji: "📚", name: "Books", category: "objects", keywords: ["study", "learn", "reading"] },
  { emoji: "🏆", name: "Trophy", category: "objects", keywords: ["winner", "award", "prize"] },

  // Symbols
  { emoji: "❤️", name: "Red Heart", category: "symbols", keywords: ["love", "heart", "like"] },
  { emoji: "✨", name: "Sparkles", category: "symbols", keywords: ["magic", "shiny", "clean"] },
  { emoji: "⭐", name: "Star", category: "symbols", keywords: ["favorite", "gold"] },
  { emoji: "✅", name: "Check Mark Button", category: "symbols", keywords: ["done", "approve", "ok"] },
  { emoji: "❌", name: "Cross Mark", category: "symbols", keywords: ["cancel", "no", "error"] },
  { emoji: "⚠️", name: "Warning", category: "symbols", keywords: ["alert", "caution"] },
  { emoji: "💯", name: "Hundred Points", category: "symbols", keywords: ["100", "perfect", "full"] },
  { emoji: "👀", name: "Eyes", category: "symbols", keywords: ["look", "see", "review"] },
  { emoji: "💬", name: "Speech Balloon", category: "symbols", keywords: ["chat", "talk", "message"] },
];

const CATEGORIES = [
  { id: "smileys", label: "Smileys", icon: Smile },
  { id: "gestures", label: "Gestures", icon: ThumbsUp },
  { id: "people", label: "People", icon: Users },
  { id: "objects", label: "Objects", icon: Package },
  { id: "symbols", label: "Symbols", icon: Heart },
] as const;

export function EmojiPicker({
  onSelectEmoji,
  onClose,
  align = "left",
  className = "",
}: EmojiPickerProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("smileys");
  const [hoveredEmoji, setHoveredEmoji] = useState<EmojiItem | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const filteredEmojis = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return EMOJI_DATA.filter((e) => e.category === activeCategory);
    }
    return EMOJI_DATA.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.keywords.some((k) => k.includes(q)) ||
        e.emoji.includes(q)
    );
  }, [search, activeCategory]);

  return (
    <div
      ref={containerRef}
      className={`w-80 h-96 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 ${
        align === "right" ? "right-0" : "left-0"
      } ${className}`}
    >
      {/* Search Header */}
      <div className="p-2.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
        <Search className="w-4 h-4 text-neutral-400" />
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search emoji (e.g. fire, smile, rocket)..."
          className="flex-1 bg-transparent text-xs text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 outline-none"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="p-0.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full text-neutral-400 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Category Tabs (shown when not searching) */}
      {!search && (
        <div className="flex items-center justify-around px-1 py-1.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/40">
          {CATEGORIES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveCategory(id)}
              className={`p-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 cursor-pointer ${
                activeCategory === id
                  ? "bg-white dark:bg-neutral-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              }`}
              title={label}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      )}

      {/* Emojis Grid */}
      <div className="flex-1 overflow-y-auto p-2.5 custom-scrollbar">
        {filteredEmojis.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-neutral-400 py-8">
            <span className="text-2xl mb-1">🔍</span>
            <p className="text-xs">No emojis found</p>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {filteredEmojis.map((item) => (
              <button
                key={item.emoji}
                type="button"
                onClick={() => {
                  onSelectEmoji(item.emoji);
                  onClose();
                }}
                onMouseEnter={() => setHoveredEmoji(item)}
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xl transition hover:scale-125 active:scale-95 cursor-pointer"
                title={item.name}
              >
                {item.emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Preview Footer */}
      <div className="px-3 py-2 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/40 flex items-center justify-between text-xs text-neutral-500">
        {hoveredEmoji ? (
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl flex-shrink-0">{hoveredEmoji.emoji}</span>
            <span className="font-medium text-neutral-700 dark:text-neutral-200 truncate">
              {hoveredEmoji.name}
            </span>
          </div>
        ) : (
          <span className="text-neutral-400 text-[11px]">Select an emoji</span>
        )}
      </div>
    </div>
  );
}
