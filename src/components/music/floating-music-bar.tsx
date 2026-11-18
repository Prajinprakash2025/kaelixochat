"use client";

import React, { useState } from "react";
import {
  Play,
  Pause,
  SkipForward,
  Maximize2,
  X,
  Radio,
  Users,
  Volume2,
} from "lucide-react";
import { MusicTrack, WorkspaceMember } from "@/types";
import { musicSync } from "@/utils/music-realtime";

interface FloatingMusicBarProps {
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  currentUser: WorkspaceMember;
  onExpand: () => void;
  onClose: () => void;
}

export function FloatingMusicBar({
  currentTrack,
  isPlaying,
  currentUser,
  onExpand,
  onClose,
}: FloatingMusicBarProps) {
  if (!currentTrack) return null;

  const togglePlay = () => {
    if (isPlaying) {
      musicSync.pause(0, currentUser);
    } else {
      musicSync.play(currentTrack, 0, currentUser);
    }
  };

  return (
    <aside
      aria-label="Floating audio player"
      className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-40 flex items-center p-2.5 rounded-2xl bg-neutral-900/95 text-white border border-neutral-700/80 shadow-2xl backdrop-blur-xl max-w-[340px] sm:max-w-md w-full transition-all duration-300 animate-in slide-in-from-bottom-5"
    >
      {/* Mini Album Art with Vinyl Hole */}
      <div
        onClick={onExpand}
        className="relative w-12 h-12 rounded-xl overflow-hidden shadow-md flex-shrink-0 cursor-pointer group"
      >
        <img
          src={currentTrack.thumbnail}
          alt={currentTrack.title}
          className={`w-full h-full object-cover transition-transform duration-700 ${
            isPlaying ? "scale-110" : ""
          }`}
        />
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 flex items-center justify-center transition">
          <Maximize2 className="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-100 transition" />
        </div>
      </div>

      {/* Track Info */}
      <div
        onClick={onExpand}
        className="min-w-0 flex-1 px-3 cursor-pointer select-none"
      >
        <div className="flex items-center space-x-1.5 mb-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
            Ad-Free Jam
          </span>
        </div>
        <p className="text-xs font-bold text-white truncate drop-shadow-sm">
          {currentTrack.title}
        </p>
        <p className="text-[11px] text-neutral-400 truncate">
          {currentTrack.artist}
        </p>
      </div>

      {/* Action Controls */}
      <div className="flex items-center space-x-1 flex-shrink-0">
        <button
          type="button"
          onClick={togglePlay}
          className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 flex items-center justify-center transition active:scale-95 cursor-pointer shadow-md"
          title={isPlaying ? "Pause for Everyone" : "Play for Everyone"}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        <button
          type="button"
          onClick={onExpand}
          className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition cursor-pointer"
          title="Expand Player"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-neutral-400 hover:text-red-400 rounded-lg hover:bg-neutral-800 transition cursor-pointer"
          title="Close Player"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
