"use client";

import React, { useState } from "react";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  ListMusic,
  Radio,
  Sparkles,
  Maximize2,
  Minimize2,
  X,
  Users,
  Share2,
} from "lucide-react";
import { useMusic } from "@/context/music-context";

interface SyncedMusicPlayerProps {
  onClose?: () => void;
  mode?: "full" | "embedded" | "modal";
}

export function SyncedMusicPlayer({
  onClose,
  mode = "full",
}: SyncedMusicPlayerProps) {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    queue,
    showVideo,
    activeDj,
    listeners,
    reactions,
    togglePlay,
    seekTo,
    setVolume,
    toggleMute,
    removeFromQueue,
    clearQueue,
    playNext,
    playPrevious,
    setShowVideo,
    sendReaction,
    playTrack,
    unlockMobileAudio,
    resync,
    syncDriftSeconds,
  } = useMusic();

  const [showQueue, setShowQueue] = useState(false);

  const formatSeconds = (sec: number) => {
    if (!sec || isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="relative flex flex-col w-full bg-neutral-900/95 text-white rounded-2xl border border-neutral-700/60 shadow-2xl backdrop-blur-xl overflow-hidden select-none">
      {/* Realtime Floating Reactions */}
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
        {reactions.map((r, i) => (
          <div
            key={r.id}
            className="absolute bottom-16 animate-bounce transition-all duration-1000 ease-out flex items-center space-x-1"
            style={{
              left: `${20 + ((i * 18) % 65)}%`,
              animation: "floatUp 2.4s ease-out forwards",
            }}
          >
            <span className="text-3xl filter drop-shadow-md">{r.emoji}</span>
            <span className="text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-white font-medium">
              {r.userName}
            </span>
          </div>
        ))}
      </div>

      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800/80 bg-neutral-950/40">
        <div className="flex items-center space-x-2.5">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isPlaying ? "bg-emerald-500 animate-pulse" : "bg-neutral-600"
            }`}
          />
          <div className="flex items-center space-x-1.5">
            <Radio className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold tracking-wider text-emerald-400 uppercase">
              Ad-Free Clean Audio Jam
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Live Sync Status & Tap to Resync Button */}
          <button
            type="button"
            onClick={resync}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition flex items-center space-x-1 cursor-pointer border ${
              syncDriftSeconds > 1.2
                ? "bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30 animate-pulse"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
            }`}
            title="Click to instantly re-align audio lockstep with DJ"
          >
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>
              {syncDriftSeconds > 1.2
                ? `⚠️ Drift: ${syncDriftSeconds.toFixed(1)}s (Tap to Sync)`
                : "⚡ Live Synced"}
            </span>
          </button>

          {/* Active Listeners Badges */}
          <div className="flex items-center -space-x-1.5 bg-neutral-800/80 px-2 py-1 rounded-full text-xs text-neutral-300">
            <Users className="w-3.5 h-3.5 mr-1.5 text-neutral-400" />
            <span className="font-semibold text-xs mr-1 text-white">
              {listeners.length}
            </span>
            {listeners.slice(0, 3).map((l, i) => (
              <img
                key={l.id || i}
                src={l.avatar}
                alt={l.name}
                title={`${l.name} is listening`}
                className="w-4 h-4 rounded-full border border-neutral-700 object-cover"
              />
            ))}
          </div>

          {/* Toggle Video Button */}
          <button
            type="button"
            onClick={() => setShowVideo(!showVideo)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer flex items-center space-x-1.5 ${
              showVideo
                ? "bg-purple-600 text-white"
                : "bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700"
            }`}
            title={showVideo ? "Switch to Audio Mode" : "Expand Video"}
          >
            {showVideo ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{showVideo ? "Audio View" : "Video"}</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile / Browser Mute Warning Banner */}
      {isMuted && isPlaying && (
        <button
          type="button"
          onClick={() => {
            unlockMobileAudio();
            toggleMute();
          }}
          className="w-full bg-amber-500/20 border-b border-amber-500/30 px-4 py-2 flex items-center justify-center space-x-2 text-amber-300 text-xs font-semibold animate-pulse cursor-pointer hover:bg-amber-500/30 transition"
        >
          <VolumeX className="w-4 h-4 text-amber-400" />
          <span>Sound is muted on this phone. Tap here to unmute phone speakers!</span>
        </button>
      )}

      {/* Main Track Display Area */}
      <div className="p-5 flex flex-col md:flex-row items-center gap-5">
        {/* Rotating Vinyl Cover Art with Waveform */}
        <div
          draggable={!!currentTrack}
          onDragStart={(e) => {
            if (!currentTrack) return;
            e.dataTransfer.setData("application/x-kaelixo-track", JSON.stringify(currentTrack));
            const shareUrl = currentTrack.url || `https://www.youtube.com/watch?v=${currentTrack.id}`;
            e.dataTransfer.setData("text/plain", `🎶 **${currentTrack.title}** - ${currentTrack.artist}\n${shareUrl}`);
            e.dataTransfer.setData("text/uri-list", shareUrl);
            e.dataTransfer.effectAllowed = "copy";
          }}
          className="relative group flex-shrink-0 cursor-grab active:cursor-grabbing"
          title={currentTrack ? `${currentTrack.title} - ${currentTrack.artist} (Drag to chat)` : undefined}
        >
          <div
            className={`w-24 h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden shadow-2xl border-2 border-neutral-700/80 relative transition-transform duration-500 ${
              isPlaying ? "scale-105" : "scale-100"
            }`}
          >
            <img
              src={
                currentTrack?.thumbnail ||
                "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80"
              }
              alt={currentTrack?.title || "Track"}
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80";
              }}
              className={`w-full h-full object-cover transition-transform duration-1000 ${
                isPlaying ? "scale-110" : ""
              }`}
            />
            {/* Center Vinyl Hole Ring */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/25">
              <div className="w-7 h-7 rounded-full bg-neutral-900/90 border border-neutral-600 flex items-center justify-center">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    isPlaying ? "bg-emerald-400 animate-ping" : "bg-neutral-500"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Live Soundwave Bars */}
          {isPlaying && (
            <div className="absolute -bottom-2 -right-2 bg-neutral-950/90 border border-emerald-500/40 px-2 py-1 rounded-full flex items-center space-x-1 shadow-lg">
              <span className="w-1 h-3 bg-emerald-400 rounded-full animate-[bounce_1s_infinite_100ms]" />
              <span className="w-1 h-4.5 bg-emerald-400 rounded-full animate-[bounce_1s_infinite_300ms]" />
              <span className="w-1 h-2.5 bg-emerald-400 rounded-full animate-[bounce_1s_infinite_200ms]" />
              <span className="w-1 h-5 bg-emerald-400 rounded-full animate-[bounce_1s_infinite_400ms]" />
            </div>
          )}
        </div>

        {/* Track Metadata & DJ Info */}
        <div className="flex-1 min-w-0 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1.5">
            {activeDj ? (
              <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <img
                  src={activeDj.avatar}
                  alt={activeDj.name}
                  className="w-3.5 h-3.5 rounded-full object-cover"
                />
                <span>DJ: {activeDj.name}</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-neutral-800 text-neutral-400">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Kaelixo Lounge</span>
              </span>
            )}

            <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-800/40">
              ⚡ Zero Ads
            </span>
          </div>

          <h3
            className="text-base md:text-lg font-bold text-white truncate drop-shadow-sm"
            title={currentTrack?.title || "Choose a song to start jam"}
          >
            {currentTrack?.title || "Choose a song to start jam"}
          </h3>
          <p
            className="text-xs md:text-sm text-neutral-400 truncate mt-0.5"
            title={currentTrack?.artist || "Search songs or select from below"}
          >
            {currentTrack?.artist || "Search songs or paste YouTube links"}
          </p>

          {/* Reaction Buttons Bar */}
          <div className="flex items-center justify-center md:justify-start space-x-1.5 mt-3">
            <span className="text-[11px] text-neutral-500 font-medium mr-1 hidden sm:inline">
              React:
            </span>
            {["🔥", "💃", "🎶", "❤️", "👏"].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => sendReaction(emoji)}
                className="w-7 h-7 rounded-lg bg-neutral-800/70 hover:bg-neutral-700 hover:scale-125 transition-all text-sm flex items-center justify-center cursor-pointer active:scale-95"
                title={`Send ${emoji}`}
              >
                {emoji}
              </button>
            ))}

            {currentTrack && (
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(
                      new CustomEvent("kaelixo:stage-music-track", { detail: currentTrack })
                    );
                  }
                }}
                className="ml-2 px-2.5 py-1 rounded-lg bg-neutral-800/90 hover:bg-sky-600/30 text-neutral-300 hover:text-sky-300 border border-neutral-700/60 hover:border-sky-500/40 text-[11px] font-bold flex items-center space-x-1 transition cursor-pointer"
                title="Share track into Chat composer"
              >
                <Share2 className="w-3 h-3 text-sky-400" />
                <span className="hidden sm:inline">Share to Chat</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Scrub Bar & Time */}
      <div className="px-5 pb-2">
        <div className="flex items-center space-x-3">
          <span className="text-[11px] font-mono text-neutral-400 min-w-[32px] text-right">
            {formatSeconds(currentTime)}
          </span>
          <div className="relative flex-1 group py-2">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => seekTo(Number(e.target.value))}
              className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 group-hover:h-2 transition-all"
            />
          </div>
          <span className="text-[11px] font-mono text-neutral-400 min-w-[32px]">
            {duration ? formatSeconds(duration) : currentTrack?.durationFormatted || "--:--"}
          </span>
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-800/70 bg-neutral-950/60">
        {/* Left: Queue Toggle */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowQueue(!showQueue)}
            className={`p-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer ${
              showQueue
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
            title="Room Queue"
          >
            <ListMusic className="w-4 h-4" />
            <span className="hidden sm:inline">Queue</span>
            {queue.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-black text-[10px] font-bold flex items-center justify-center">
                {queue.length}
              </span>
            )}
          </button>
        </div>

        {/* Center: Play / Pause / Skip */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => {
              unlockMobileAudio();
              playPrevious();
            }}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition cursor-pointer"
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
            disabled={!currentTrack}
            className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer ${
              isPlaying
                ? "bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-500/20"
                : "bg-white hover:bg-neutral-200 text-neutral-950 shadow-white/20"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isPlaying ? "Pause for Everyone (2 Devices)" : "Play for Everyone (2 Devices)"}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              unlockMobileAudio();
              playNext();
            }}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition cursor-pointer"
            title="Next Track"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Volume Slider */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={toggleMute}
            className="text-neutral-400 hover:text-white transition cursor-pointer"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-16 sm:w-20 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>
      </div>

      {/* Shared Queue Drawer */}
      {showQueue && (
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/80 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              Up Next ({queue.length})
            </span>
            {queue.length > 0 && (
              <button
                type="button"
                onClick={clearQueue}
                className="text-[11px] text-red-400 hover:text-red-300 cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>

          {queue.length === 0 ? (
            <p className="text-xs text-neutral-500 py-3 text-center">
              Queue is empty. Search below or paste links to add songs!
            </p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
              {queue.map((t, idx) => (
                <div
                  key={`${t.id}-${idx}`}
                  className="flex items-center justify-between p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800/80 transition group"
                >
                  <div
                    onClick={() => {
                      removeFromQueue(idx);
                      playTrack(t, 0);
                    }}
                    className="flex items-center space-x-2.5 min-w-0 flex-1 cursor-pointer"
                  >
                    <span className="text-xs font-mono text-neutral-500 w-4 text-center">
                      {idx + 1}
                    </span>
                    <img
                      src={t.thumbnail}
                      alt={t.title}
                      className="w-8 h-8 rounded object-cover flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-white truncate">
                        {t.title}
                      </p>
                      <p className="text-[10px] text-neutral-400 truncate">
                        {t.artist}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <span className="text-[10px] font-mono text-neutral-400">
                      {t.durationFormatted}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFromQueue(idx)}
                      className="text-neutral-500 hover:text-red-400 p-1 rounded cursor-pointer"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Floating Style animation for reactions */}
      <style jsx global>{`
        @keyframes floatUp {
          0% {
            opacity: 0;
            transform: translateY(0) scale(0.7);
          }
          15% {
            opacity: 1;
            transform: translateY(-20px) scale(1.15);
          }
          80% {
            opacity: 0.9;
            transform: translateY(-90px) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-130px) scale(0.85);
          }
        }
      `}</style>
    </div>
  );
}
