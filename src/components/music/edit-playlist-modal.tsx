"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Pencil,
  Image as ImageIcon,
  Palette,
  Upload,
  Check,
  Sparkles,
  Camera,
  Trash2,
} from "lucide-react";
import { Playlist } from "./music-channel-view";

interface EditPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: Playlist | null;
  onSave: (updated: Playlist) => void;
  themeAccent: string;
  themeTextColor: string;
}

const PRESET_ICONS = ["🎵", "🔥", "🌴", "☕", "⚡", "🌙", "🎸", "💖", "🎧", "🚀", "💻", "🏆", "🌊", "✨", "🎮", "🏎️"];

const PRESET_GRADIENTS = [
  { name: "Neon Purple", value: "from-purple-600 to-pink-600" },
  { name: "Ocean Blue", value: "from-blue-600 to-cyan-600" },
  { name: "Emerald Mint", value: "from-emerald-600 to-teal-600" },
  { name: "Sunset Ember", value: "from-amber-600 to-orange-600" },
  { name: "Rose Crimson", value: "from-rose-600 to-red-600" },
  { name: "Midnight Noir", value: "from-neutral-800 to-neutral-950" },
  { name: "Cyber Magenta", value: "from-fuchsia-600 to-indigo-700" },
  { name: "Lime Punch", value: "from-lime-500 to-emerald-700" },
];

const PRESET_COVERS = [
  {
    name: "Lo-Fi Vibe",
    url: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=500&q=80",
  },
  {
    name: "Late Night Neon",
    url: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=500&q=80",
  },
  {
    name: "Retro Vinyl",
    url: "https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=500&q=80",
  },
  {
    name: "Chill Sunset",
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=500&q=80",
  },
  {
    name: "Gym Energy",
    url: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=500&q=80",
  },
  {
    name: "Cyberpunk Stage",
    url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=500&q=80",
  },
];

export function EditPlaylistModal({
  isOpen,
  onClose,
  playlist,
  onSave,
  themeAccent,
  themeTextColor,
}: EditPlaylistModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverMode, setCoverMode] = useState<"image" | "gradient">("gradient");
  const [selectedIcon, setSelectedIcon] = useState("🎵");
  const [selectedGradient, setSelectedGradient] = useState("from-purple-600 to-pink-600");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [customUrlInput, setCustomUrlInput] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when playlist changes
  useEffect(() => {
    if (playlist) {
      setName(playlist.name);
      setDescription(playlist.description || "");
      setSelectedIcon(playlist.icon || "🎵");
      setSelectedGradient(playlist.gradient || "from-purple-600 to-pink-600");
      setThumbnailUrl(playlist.thumbnail || "");
      setCustomUrlInput(playlist.thumbnail || "");
      setCoverMode(playlist.thumbnail ? "image" : "gradient");
    }
  }, [playlist]);

  if (!isOpen || !playlist) return null;

  // Handle local file upload (convert to Base64 data URL)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 6 * 1024 * 1024) {
        alert("Please choose an image file under 6MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setThumbnailUrl(result);
          setCustomUrlInput("");
          setCoverMode("image");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyCustomUrl = () => {
    const trimmed = customUrlInput.trim();
    if (trimmed) {
      setThumbnailUrl(trimmed);
      setCoverMode("image");
    }
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const updated: Playlist = {
      ...playlist,
      name: trimmedName,
      description: description.trim() || undefined,
      thumbnail: coverMode === "image" && thumbnailUrl.trim() ? thumbnailUrl.trim() : undefined,
      icon: coverMode === "gradient" ? selectedIcon : undefined,
      gradient: coverMode === "gradient" ? selectedGradient : undefined,
      isCustom: true,
    };

    onSave(updated);
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
        className="w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-neutral-900 dark:text-white animate-in zoom-in-95 duration-200"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/60">
          <div className="flex items-center space-x-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${themeAccent}20`, color: themeAccent }}
            >
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white leading-tight">
                Edit Playlist Details
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Update name, cover photo, colors & description
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Top Live Preview Banner */}
          <div className="flex items-center space-x-4 p-3.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60">
            {/* 1:1 Live Square Cover */}
            <div className="relative w-24 h-24 rounded-xl overflow-hidden shadow-md flex-shrink-0 bg-neutral-200 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700">
              {coverMode === "image" && thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt={name || "Preview"}
                  className="w-full h-full object-cover"
                  onError={() => {
                    // Fallback to gradient if image URL broken
                    setCoverMode("gradient");
                  }}
                />
              ) : (
                <div
                  className={`w-full h-full bg-gradient-to-br ${selectedGradient} flex items-center justify-center text-3xl`}
                >
                  {selectedIcon}
                </div>
              )}
            </div>

            {/* Live Text Preview */}
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Live Preview
              </span>
              <h4 className="text-base font-extrabold text-neutral-900 dark:text-white truncate mt-0.5">
                {name.trim() || "Untitled Playlist"}
              </h4>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate mt-0.5">
                {description.trim() || "No description provided"}
              </p>
              <div className="flex items-center space-x-2 mt-1.5 text-[11px] text-neutral-500">
                <span>{playlist.songCount || 0} songs</span>
                <span>•</span>
                <span className="text-emerald-500 font-medium">Ready</span>
              </div>
            </div>
          </div>

          {/* Playlist Name Input */}
          <div>
            <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
              Playlist Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Malayalam Favorites, Workout Fuel, Late Night Coding"
              className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              autoFocus
            />
          </div>

          {/* Description Input */}
          <div>
            <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
              Description <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Give your playlist a nice mood description..."
              className="w-full px-3.5 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Cover Style Selector Tabs */}
          <div>
            <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mb-2">
              Playlist Cover Style
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 mb-3">
              <button
                type="button"
                onClick={() => setCoverMode("image")}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer ${
                  coverMode === "image"
                    ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5 text-sky-500" />
                <span>Custom Image / Photo</span>
              </button>

              <button
                type="button"
                onClick={() => setCoverMode("gradient")}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer ${
                  coverMode === "gradient"
                    ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                <Palette className="w-3.5 h-3.5 text-fuchsia-500" />
                <span>Icon & Gradient</span>
              </button>
            </div>

            {/* TAB 1: Custom Image / Photo */}
            {coverMode === "image" && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                {/* Upload or URL Row */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2 px-3 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-800 dark:text-white transition flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Upload from Computer</span>
                  </button>

                  {thumbnailUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setThumbnailUrl("");
                        setCustomUrlInput("");
                      }}
                      className="px-3 py-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-300 dark:border-rose-900 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 cursor-pointer"
                      title="Clear photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                {/* Paste URL Input */}
                <div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customUrlInput}
                      onChange={(e) => setCustomUrlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleApplyCustomUrl();
                        }
                      }}
                      placeholder="Or paste any image web URL (https://...)"
                      className="flex-1 px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCustomUrl}
                      disabled={!customUrlInput.trim()}
                      className="px-3 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-700 hover:brightness-110 disabled:opacity-40 text-xs font-bold transition cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                {/* Preset Aesthetic Covers */}
                <div>
                  <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 block mb-2">
                    Or choose a curated aesthetic cover:
                  </span>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {PRESET_COVERS.map((preset) => {
                      const isChosen = thumbnailUrl === preset.url;
                      return (
                        <div
                          key={preset.name}
                          onClick={() => {
                            setThumbnailUrl(preset.url);
                            setCustomUrlInput(preset.url);
                          }}
                          className={`group relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition transform hover:scale-105 ${
                            isChosen
                              ? "border-emerald-500 ring-2 ring-emerald-500/50 shadow-md"
                              : "border-transparent opacity-80 hover:opacity-100"
                          }`}
                          title={preset.name}
                        >
                          <img
                            src={preset.url}
                            alt={preset.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <span className="text-[9px] font-bold text-white text-center px-1 leading-tight">
                              {preset.name}
                            </span>
                          </div>
                          {isChosen && (
                            <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Gradient & Emoji Icon */}
            {coverMode === "gradient" && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* Pick Icon */}
                <div>
                  <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 block mb-2">
                    Select Icon Emoji:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_ICONS.map((emoji) => {
                      const isSelected = selectedIcon === emoji;
                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setSelectedIcon(emoji)}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition cursor-pointer border ${
                            isSelected
                              ? "border-emerald-500 bg-emerald-500/20 scale-110 shadow-sm"
                              : "border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                          }`}
                        >
                          {emoji}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Pick Gradient Color */}
                <div>
                  <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300 block mb-2">
                    Select Background Gradient:
                  </span>
                  <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
                    {PRESET_GRADIENTS.map((grad) => {
                      const isSelected = selectedGradient === grad.value;
                      return (
                        <button
                          key={grad.value}
                          type="button"
                          onClick={() => setSelectedGradient(grad.value)}
                          className={`h-9 rounded-xl bg-gradient-to-r ${grad.value} flex items-center justify-center transition cursor-pointer relative shadow-xs ${
                            isSelected
                              ? "ring-2 ring-neutral-900 dark:ring-white scale-105"
                              : "hover:scale-102 opacity-90 hover:opacity-100"
                          }`}
                          title={grad.name}
                        >
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-white text-black flex items-center justify-center shadow">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-bold transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            style={{
              backgroundColor: themeAccent,
              color: themeTextColor,
              boxShadow: `0 4px 14px ${themeAccent}40`,
            }}
            className="px-5 py-2 rounded-xl text-xs font-bold transition transform hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer shadow-md"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
