"use client";

import React from "react";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Maximize2,
  Volume2,
  VolumeX,
  Radio,
  Users,
} from "lucide-react";
import { useMusic } from "@/context/music-context";

export function FloatingMusicBar() {
  const {
    currentTrack,
    isPlaying,
    isMuted,
    activeDj,
    listeners,
    togglePlay,
    playNext,
    playPrevious,
    toggleMute,
    unlockMobileAudio,
    setIsPlayerOpen,
  } = useMusic();

  if (!currentTrack) return null;

  const handleOpenPlayer = () => {
    unlockMobileAudio();
    setIsPlayerOpen(true);
  };

  return (
    <aside
      aria-label="Floating audio player"
      className="fixed bottom-20 right-3 left-3 sm:left-auto md:bottom-6 md:right-6 z-40 flex items-center p-2.5 rounded-2xl bg-neutral-900/95 text-white border border-neutral-700/80 shadow-2xl backdrop-blur-xl max-w-[350px] sm:max-w-md w-full transition-all duration-300 animate-in slide-in-from-bottom-5 select-none"
    >
      {/* Mini Album Art with Vinyl Hole */}
      <div
        onClick={handleOpenPlayer}
        className="relative w-12 h-12 rounded-xl overflow-hidden shadow-md flex-shrink-0 cursor-pointer group"
      >
        <img
          src={currentTrack.thumbnail}
          alt={currentTrack.title}
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80";
          }}
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
        onClick={handleOpenPlayer}
        className="min-w-0 flex-1 px-3 cursor-pointer select-none"
      >
        <div className="flex items-center space-x-1.5 mb-0.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isPlaying
                ? isMuted
                  ? "bg-amber-400 animate-ping"
                  : "bg-emerald-400 animate-pulse"
                : "bg-neutral-500"
            }`}
          />
          {isMuted && isPlaying ? (
            <span
              onClick={(e) => {
                e.stopPropagation();
                unlockMobileAudio();
                toggleMute();
              }}
              className="text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/40 animate-pulse"
            >
              🔊 Tap to Unmute Phone
            </span>
          ) : (
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
              {listeners.length > 1 ? `Synced (${listeners.length} devices)` : "Ad-Free Jam"}
            </span>
          )}
        </div>
        <p className="text-xs font-bold text-white truncate drop-shadow-sm">
          {currentTrack.title}
        </p>
        <p className="text-[11px] text-neutral-400 truncate">
          {activeDj ? `DJ: ${activeDj.name}` : currentTrack.artist}
        </p>
      </div>

      {/* Action Controls */}
      <div className="flex items-center space-x-0.5 sm:space-x-1 flex-shrink-0">
        <button
          type="button"
          onClick={() => {
            unlockMobileAudio();
            playPrevious();
          }}
          className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition cursor-pointer"
          title="Previous Track"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => {
            unlockMobileAudio();
            togglePlay();
          }}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer shadow-md ${
            isPlaying
              ? "bg-emerald-500 hover:bg-emerald-400 text-neutral-950"
              : "bg-white hover:bg-neutral-200 text-neutral-950"
          }`}
          title={isPlaying ? "Pause for All Devices" : "Play for All Devices"}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            unlockMobileAudio();
            playNext();
          }}
          className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition cursor-pointer"
          title="Next Track"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        {/* Volume / Unmute button for Phone Speaker */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            unlockMobileAudio();
            toggleMute();
          }}
          className={`p-1.5 rounded-lg transition cursor-pointer ${
            isMuted
              ? "text-amber-400 bg-amber-400/20 ring-1 ring-amber-400/50 animate-pulse"
              : "text-neutral-400 hover:text-white hover:bg-neutral-800"
          }`}
          title={isMuted ? "Unmute Speaker (Tap to Hear)" : "Mute Audio"}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-amber-400" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>

        <button
          type="button"
          onClick={handleOpenPlayer}
          className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition cursor-pointer"
          title="Expand Player"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
