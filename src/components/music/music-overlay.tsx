"use client";

import React, { useState, useEffect } from "react";
import { Headphones, Sparkles } from "lucide-react";
import { useMusic } from "@/context/music-context";
import { SyncedMusicPlayer } from "./synced-music-player";
import { FloatingMusicBar } from "./floating-music-bar";
import { AiMusicAssistant, AiAssistantTriggerButton } from "./ai-music-assistant";

// Helper to open AI Assistant from any button in the app
export const openAiMusicAssistant = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("kaelixo-open-ai-dj"));
  }
};

export function HeaderMusicButton() {
  const { isPlayerOpen, setIsPlayerOpen, isPlaying, listeners } = useMusic();

  return (
    <div className="flex items-center space-x-1">
      {/* AI Voice DJ Quick Trigger in Header */}
      <button
        type="button"
        onClick={openAiMusicAssistant}
        className="p-1.5 sm:p-2 rounded-lg text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition cursor-pointer relative"
        title="AI Voice DJ (Voice & Text Music Control) [Ctrl+Shift+A]"
      >
        <Sparkles className="w-4 h-4 animate-spin-slow" />
      </button>

      <button
        type="button"
        onClick={() => setIsPlayerOpen(!isPlayerOpen)}
        className={`p-1.5 sm:p-2 rounded-lg transition cursor-pointer relative ${
          isPlaying
            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
            : "text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
        }`}
        title="Listen Together / Ad-Free Music Jam [Ctrl+Shift+H]"
      >
        <Headphones className="w-4 h-4" />
        {isPlaying && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        )}
        {listeners.length > 1 && (
          <span className="hidden sm:inline-block ml-1 text-[10px] font-bold text-emerald-400">
            {listeners.length}
          </span>
        )}
      </button>
    </div>
  );
}

interface WorkspaceMusicOverlayProps {
  activeChannelName: string;
}

export function WorkspaceMusicOverlay({ activeChannelName }: WorkspaceMusicOverlayProps) {
  const { isPlayerOpen, setIsPlayerOpen, currentTrack } = useMusic();
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleOpenAi = () => setIsAiAssistantOpen(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        setIsAiAssistantOpen((prev) => !prev);
      }
    };

    window.addEventListener("kaelixo-open-ai-dj", handleOpenAi);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("kaelixo-open-ai-dj", handleOpenAi);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <>
      {/* Synced Music Jam Modal */}
      {isPlayerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl">
            <SyncedMusicPlayer onClose={() => setIsPlayerOpen(false)} />
          </div>
        </div>
      )}

      {/* Floating Persistent Mini-Player (shows when music is active and not on #music) */}
      {!isPlayerOpen && activeChannelName !== "music" && currentTrack && (
        <FloatingMusicBar />
      )}

      {/* AI Voice Assistant Modal */}
      <AiMusicAssistant
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
      />

      {/* Floating AI DJ Trigger Button (Bottom-Right) */}
      <AiAssistantTriggerButton
        onClick={() => setIsAiAssistantOpen(true)}
        isOpen={isAiAssistantOpen}
      />
    </>
  );
}
