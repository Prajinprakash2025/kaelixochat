"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Maximize2,
  Volume2,
  VolumeX,
  GripVertical,
  Minus,
  ChevronUp,
  X,
  Radio,
  Users,
  Sparkles,
  LogOut,
  Headphones,
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
    resync,
    syncDriftSeconds,
    hasJoinedJam,
    joinJam,
    leaveJam,
  } = useMusic();

  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const barRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

  // Load saved position or default safely above chat composer (bottom: 120px, right: 24px)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("kaelixo-floating-music-pos");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (typeof parsed.x === "number" && typeof parsed.y === "number") {
            // Validate still on screen
            const validX = Math.min(Math.max(10, parsed.x), window.innerWidth - 100);
            const validY = Math.min(Math.max(10, parsed.y), window.innerHeight - 60);
            setPosition({ x: validX, y: validY });
            return;
          }
        } catch {}
      }
      // Default position: floating well above bottom chat composer (bottom: 120px)
      const barWidth = 350;
      const defaultX = Math.max(16, window.innerWidth - barWidth - 24);
      const defaultY = Math.max(60, window.innerHeight - 150);
      setPosition({ x: defaultX, y: defaultY });
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setIsDragging(true);

    const barWidth = 350;
    const currentX = position?.x ?? Math.max(16, window.innerWidth - barWidth - 24);
    const currentY = position?.y ?? (window.innerHeight - 150);

    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: currentX,
      startY: currentY,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - dragStartRef.current.mouseX;
      const deltaY = moveEvent.clientY - dragStartRef.current.mouseY;

      const currentBarWidth = barRef.current?.offsetWidth || barWidth;
      const barHeight = barRef.current?.offsetHeight || 60;

      const newX = Math.min(
        Math.max(10, dragStartRef.current.startX + deltaX),
        window.innerWidth - currentBarWidth - 16
      );
      const newY = Math.min(
        Math.max(10, dragStartRef.current.startY + deltaY),
        window.innerHeight - barHeight - 10
      );

      const nextPos = { x: newX, y: newY };
      setPosition(nextPos);
      sessionStorage.setItem("kaelixo-floating-music-pos", JSON.stringify(nextPos));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Touch drag support for mobile / tablets
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    setIsDragging(true);

    const barWidth = 350;
    const currentX = position?.x ?? Math.max(16, window.innerWidth - barWidth - 24);
    const currentY = position?.y ?? (window.innerHeight - 150);

    dragStartRef.current = {
      mouseX: touch.clientX,
      mouseY: touch.clientY,
      startX: currentX,
      startY: currentY,
    };

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length !== 1) return;
      const moveTouch = moveEvent.touches[0];
      const deltaX = moveTouch.clientX - dragStartRef.current.mouseX;
      const deltaY = moveTouch.clientY - dragStartRef.current.mouseY;

      const currentBarWidth = barRef.current?.offsetWidth || barWidth;
      const barHeight = barRef.current?.offsetHeight || 60;

      const newX = Math.min(
        Math.max(10, dragStartRef.current.startX + deltaX),
        window.innerWidth - currentBarWidth - 16
      );
      const newY = Math.min(
        Math.max(10, dragStartRef.current.startY + deltaY),
        window.innerHeight - barHeight - 10
      );

      const nextPos = { x: newX, y: newY };
      setPosition(nextPos);
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };

    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
  };

  if (!currentTrack || isDismissed) return null;

  const handleOpenPlayer = () => {
    unlockMobileAudio();
    setIsPlayerOpen(true);
  };

  // Minimized Compact Pill Mode (takes minimal screen space and completely frees up chat input)
  if (isMinimized) {
    return (
      <div
        ref={barRef}
        style={{
          left: position ? `${position.x}px` : undefined,
          top: position ? `${position.y}px` : undefined,
        }}
        className={`fixed z-50 flex items-center space-x-2 p-1.5 pr-2.5 rounded-full bg-neutral-900/95 text-white border border-neutral-700 shadow-2xl backdrop-blur-xl select-none transition-shadow ${
          isDragging ? "shadow-emerald-500/30 ring-2 ring-emerald-500 cursor-grabbing" : ""
        } ${!position ? "bottom-28 right-6" : ""}`}
      >
        <div
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className="cursor-grab active:cursor-grabbing p-1 text-neutral-400 hover:text-white"
          title="Drag to move mini bar"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <img
          src={currentTrack.thumbnail}
          alt={currentTrack.title}
          className={`w-7 h-7 rounded-full object-cover ${isPlaying ? "animate-spin duration-3000" : ""}`}
        />
        <span className="text-xs font-bold max-w-[120px] truncate">{currentTrack.title}</span>
        <button
          type="button"
          onClick={() => {
            unlockMobileAudio();
            togglePlay();
          }}
          className="p-1 rounded-full bg-emerald-500 text-black hover:bg-emerald-400 transition cursor-pointer"
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
        </button>
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="p-1 text-neutral-400 hover:text-white rounded-md transition cursor-pointer"
          title="Expand music bar"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Full Floating Audio Bar (Draggable Anywhere)
  return (
    <aside
      ref={barRef}
      aria-label="Floating audio player"
      style={{
        left: position ? `${position.x}px` : undefined,
        top: position ? `${position.y}px` : undefined,
      }}
      className={`fixed z-40 flex items-center p-2 rounded-2xl bg-neutral-900/95 text-white border border-neutral-700/80 shadow-2xl backdrop-blur-xl w-[340px] sm:w-[350px] max-w-[calc(100vw-32px)] select-none ${
        isDragging
          ? "ring-2 ring-emerald-400 shadow-emerald-500/30 cursor-grabbing"
          : "transition-shadow"
      } ${!position ? "bottom-28 right-6" : ""}`}
    >
      {/* Drag Grip Handle */}
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className="cursor-grab active:cursor-grabbing p-1.5 text-neutral-400 hover:text-white transition flex items-center justify-center rounded-lg hover:bg-neutral-800"
        title="Click and drag anywhere to move this music bar"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Mini Album Art with Vinyl Hole */}
      <div
        onClick={handleOpenPlayer}
        className="relative w-11 h-11 rounded-xl overflow-hidden shadow-md flex-shrink-0 cursor-pointer group ml-0.5"
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
        className="min-w-0 flex-1 px-2.5 cursor-pointer select-none"
      >
        <div className="flex items-center space-x-1.5 mb-0.5">
          {!hasJoinedJam ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/40">
                📻 Live Jam in progress
              </span>
            </>
          ) : (
            <>
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
                  🔊 Unmute
                </span>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    resync();
                  }}
                  className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 uppercase tracking-wider cursor-pointer flex items-center space-x-1"
                  title="Click to re-align playback with DJ"
                >
                  <span>
                    {syncDriftSeconds > 1.2
                      ? `⚡ Tap to Sync (${syncDriftSeconds.toFixed(1)}s)`
                      : listeners.length > 1
                      ? `⚡ Synced (${listeners.length})`
                      : "⚡ Live Synced"}
                  </span>
                </button>
              )}
            </>
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
      {!hasJoinedJam ? (
        <div className="flex items-center space-x-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              unlockMobileAudio();
              joinJam();
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-neutral-950 font-extrabold text-xs shadow-md shadow-emerald-500/30 active:scale-95 transition cursor-pointer"
            title="Click to join live team jam and listen to audio"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Join Jam</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsDismissed(true);
            }}
            className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition cursor-pointer"
            title="Dismiss bar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center space-x-0.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              unlockMobileAudio();
              playPrevious();
            }}
            className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition cursor-pointer"
            title="Previous Track"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              unlockMobileAudio();
              togglePlay();
            }}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer shadow-md ${
              isPlaying
                ? "bg-emerald-500 hover:bg-emerald-400 text-neutral-950"
                : "bg-white hover:bg-neutral-200 text-neutral-950"
            }`}
            title={isPlaying ? "Pause for All Devices" : "Play for All Devices"}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              unlockMobileAudio();
              playNext();
            }}
            className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition cursor-pointer"
            title="Next Track"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          {/* Volume / Unmute button for Phone Speaker */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              unlockMobileAudio();
              toggleMute();
            }}
            className={`p-1 rounded-lg transition cursor-pointer ${
              isMuted
                ? "text-amber-400 bg-amber-400/20 ring-1 ring-amber-400/50 animate-pulse"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
            title={isMuted ? "Unmute Speaker" : "Mute Audio"}
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Leave Jam button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              leaveJam();
            }}
            className="p-1 text-neutral-400 hover:text-rose-400 hover:bg-rose-500/20 rounded-lg transition cursor-pointer"
            title="Leave Jam (Stop & Mute Local Audio)"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>

          {/* AI Voice DJ Assistant Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("kaelixo-open-ai-dj"));
              }
            }}
            className="p-1 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 rounded-lg transition cursor-pointer"
            title="Open AI Voice DJ [Ctrl+Shift+A]"
          >
            <Sparkles className="w-3.5 h-3.5 animate-spin-slow" />
          </button>

          {/* Minimize Button */}
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition cursor-pointer"
            title="Minimize player to small pill"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {/* Close/Dismiss Button */}
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition cursor-pointer"
            title="Hide player (access via headphones icon in top bar)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </aside>
  );
}
