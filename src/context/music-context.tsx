"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { MusicTrack, MusicSyncState, WorkspaceMember, MusicReaction } from "@/types";
import { musicSync } from "@/utils/music-realtime";

interface MusicContextType {
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  queue: MusicTrack[];
  showVideo: boolean;
  activeDj: WorkspaceMember | null;
  listeners: WorkspaceMember[];
  reactions: MusicReaction[];
  isPlayerOpen: boolean;
  needsUserInteraction: boolean;
  playTrack: (track: MusicTrack, position?: number) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  seekTo: (seconds: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  addToQueue: (track: MusicTrack) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  playNext: () => void;
  playPrevious: () => void;
  setShowVideo: (show: boolean) => void;
  setIsPlayerOpen: (open: boolean) => void;
  sendReaction: (emoji: string) => void;
  unlockMobileAudio: () => void;
}

const MusicContext = createContext<MusicContextType | null>(null);

interface MusicProviderProps {
  children: ReactNode;
  currentUser: WorkspaceMember;
}

export function MusicProvider({ children, currentUser }: MusicProviderProps) {
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [queue, setQueue] = useState<MusicTrack[]>([]);
  const [showVideo, setShowVideo] = useState<boolean>(false);
  const [activeDj, setActiveDj] = useState<WorkspaceMember | null>(null);
  const [listeners, setListeners] = useState<WorkspaceMember[]>([currentUser]);
  const [reactions, setReactions] = useState<MusicReaction[]>([]);
  const [isPlayerOpen, setIsPlayerOpen] = useState<boolean>(false);
  const [needsUserInteraction, setNeedsUserInteraction] = useState<boolean>(false);
  const [origin, setOrigin] = useState<string>("");

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasUserInteractedRef = useRef<boolean>(false);

  // Listen to window-level custom event to toggle player from any component
  useEffect(() => {
    const handleToggle = () => setIsPlayerOpen((prev) => !prev);
    const handleOpen = () => setIsPlayerOpen(true);
    window.addEventListener("kaelixo:toggle-music", handleToggle);
    window.addEventListener("kaelixo:open-music", handleOpen);
    return () => {
      window.removeEventListener("kaelixo:toggle-music", handleToggle);
      window.removeEventListener("kaelixo:open-music", handleOpen);
    };
  }, []);

  // PostMessage helper to control YouTube IFrame
  const postYtCommand = (func: string, args: any[] = []) => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func, args }),
          "*"
        );
      } catch (err) {
        console.warn("postYtCommand error:", err);
      }
    }
  };

  // 1. Initialize Supabase Realtime channel once globally
  useEffect(() => {
    musicSync.init(currentUser, "workspace-hq");

    const unsubAction = musicSync.subscribe((action) => {
      switch (action.type) {
        case "PLAY": {
          const track = action.payload.track as MusicTrack;
          const pos = action.payload.position || 0;
          const elapsed = (Date.now() - action.sentAt) / 1000;
          const targetPos = Math.max(0, pos + elapsed);

          setActiveDj(action.sender as any);
          setCurrentTrack(track);
          setIsPlaying(true);
          setNeedsUserInteraction(false);

          setTimeout(() => {
            postYtCommand("seekTo", [targetPos, true]);
            postYtCommand("playVideo");
          }, 350);
          break;
        }

        case "PAUSE": {
          setIsPlaying(false);
          postYtCommand("pauseVideo");
          if (action.payload.position !== undefined) {
            postYtCommand("seekTo", [action.payload.position, true]);
          }
          break;
        }

        case "SEEK": {
          const pos = action.payload.position || 0;
          const elapsed = (Date.now() - action.sentAt) / 1000;
          const targetPos = pos + elapsed;
          setCurrentTime(targetPos);
          postYtCommand("seekTo", [targetPos, true]);
          break;
        }

        case "TRACK_CHANGE": {
          const track = action.payload.track as MusicTrack;
          setActiveDj(action.sender as any);
          setCurrentTrack(track);
          setIsPlaying(true);
          break;
        }

        case "QUEUE_ADD": {
          const track = action.payload.track as MusicTrack;
          setQueue((prev) => [...prev, track]);
          break;
        }

        case "QUEUE_REMOVE": {
          const idx = action.payload.index;
          setQueue((prev) => prev.filter((_, i) => i !== idx));
          break;
        }

        case "QUEUE_CLEAR": {
          setQueue([]);
          break;
        }

        case "SYNC_REQUEST": {
          if (currentTrack) {
            musicSync.respondState(
              {
                currentTrack,
                isPlaying,
                position: currentTime,
                sentAt: Date.now(),
                dj: activeDj || { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar },
                queue,
              },
              currentUser
            );
          }
          break;
        }

        case "SYNC_RESPONSE": {
          const state = action.payload as MusicSyncState;
          if (state && state.currentTrack && (!currentTrack || currentTrack.id !== state.currentTrack.id)) {
            const elapsed = (Date.now() - state.sentAt) / 1000;
            const targetPos = (state.position || 0) + (state.isPlaying ? elapsed : 0);

            setCurrentTrack(state.currentTrack);
            setIsPlaying(state.isPlaying);
            setActiveDj(state.dj as any);
            setQueue(state.queue || []);

            setTimeout(() => {
              postYtCommand("seekTo", [targetPos, true]);
              if (state.isPlaying) {
                postYtCommand("playVideo");
              } else {
                postYtCommand("pauseVideo");
              }
            }, 400);
          }
          break;
        }

        case "REACTION": {
          triggerReactionAnimation(action.payload.emoji, action.sender.name);
          break;
        }
      }
    });

    const unsubPresence = musicSync.subscribePresence((activeListeners) => {
      setListeners(activeListeners.length > 0 ? activeListeners : [currentUser]);
    });

    return () => {
      unsubAction();
      unsubPresence();
    };
  }, [currentUser, currentTrack, isPlaying, currentTime, activeDj, queue]);

  // 2. Window postMessage listener from YouTube iframe
  useEffect(() => {
    const handleWindowMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data?.event === "infoDelivery" && data.info) {
          if (data.info.currentTime !== undefined) {
            setCurrentTime(data.info.currentTime);
          }
          if (data.info.duration !== undefined && data.info.duration > 0) {
            setDuration(data.info.duration);
          }
          if (data.info.playerState !== undefined) {
            // 1: PLAYING, 2: PAUSED, 0: ENDED
            if (data.info.playerState === 1) {
              setIsPlaying(true);
            } else if (data.info.playerState === 2) {
              setIsPlaying(false);
            } else if (data.info.playerState === 0) {
              handlePlayNext();
            }
          }
        }
      } catch {
        // Safe to ignore non-JSON messages
      }
    };

    window.addEventListener("message", handleWindowMessage);
    return () => window.removeEventListener("message", handleWindowMessage);
  }, [queue, currentTrack]);

  // Tell iframe we are listening to events whenever iframe loads
  const onIframeLoad = () => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "listening" }),
          "*"
        );
        postYtCommand("setVolume", [volume]);
        if (isPlaying) {
          postYtCommand("playVideo");
        }
      } catch {}
    }
  };

  // Periodic heartbeat to pull current time from iframe
  useEffect(() => {
    if (isPlaying) {
      progressIntervalRef.current = setInterval(() => {
        postYtCommand("listening");
      }, 1000);
    } else {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    }
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isPlaying]);

  // Play Specific Track
  const playTrack = (track: MusicTrack, position: number = 0) => {
    hasUserInteractedRef.current = true;
    setCurrentTrack(track);
    setCurrentTime(position);
    setIsPlaying(true);
    setActiveDj(currentUser);

    // Broadcast PLAY to all devices
    musicSync.play(track, position, currentUser);

    setTimeout(() => {
      postYtCommand("seekTo", [position, true]);
      postYtCommand("playVideo");
    }, 300);
  };

  // Toggle Play / Pause
  const togglePlay = () => {
    hasUserInteractedRef.current = true;
    const nextState = !isPlaying;
    setIsPlaying(nextState);

    if (nextState) {
      postYtCommand("playVideo");
      if (currentTrack) {
        musicSync.play(currentTrack, currentTime, currentUser);
        setActiveDj(currentUser);
      }
    } else {
      postYtCommand("pauseVideo");
      musicSync.pause(currentTime, currentUser);
    }
  };

  const pause = () => {
    setIsPlaying(false);
    postYtCommand("pauseVideo");
    musicSync.pause(currentTime, currentUser);
  };

  const resume = () => {
    hasUserInteractedRef.current = true;
    setIsPlaying(true);
    postYtCommand("playVideo");
    if (currentTrack) {
      musicSync.play(currentTrack, currentTime, currentUser);
      setActiveDj(currentUser);
    }
  };

  // Seek
  const seekTo = (seconds: number) => {
    setCurrentTime(seconds);
    postYtCommand("seekTo", [seconds, true]);
    musicSync.seek(seconds, currentUser);
  };

  // Volume
  const handleVolume = (vol: number) => {
    setVolume(vol);
    setIsMuted(vol === 0);
    postYtCommand("setVolume", [vol]);
  };

  const toggleMute = () => {
    if (isMuted) {
      postYtCommand("unMute");
      postYtCommand("setVolume", [volume || 75]);
      setIsMuted(false);
    } else {
      postYtCommand("mute");
      setIsMuted(true);
    }
  };

  // Queue Operations
  const addToQueue = (track: MusicTrack) => {
    setQueue((prev) => [...prev, track]);
    musicSync.addToQueue(track, currentUser);
  };

  const removeFromQueue = (index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
    musicSync.removeFromQueue(index, currentUser);
  };

  const clearQueue = () => {
    setQueue([]);
    musicSync.broadcastAction({
      type: "QUEUE_CLEAR",
      payload: {},
      sentAt: Date.now(),
      sender: { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar },
    });
  };

  // Next / Previous
  const handlePlayNext = () => {
    if (queue.length > 0) {
      const next = queue[0];
      setQueue((prev) => prev.slice(1));
      playTrack(next, 0);
    } else if (currentTrack) {
      seekTo(0);
    }
  };

  const playPrevious = () => {
    seekTo(0);
  };

  // Floating Reactions
  const triggerReactionAnimation = (emoji: string, userName: string) => {
    const rx: MusicReaction = {
      id: `rx-${Date.now()}-${Math.random()}`,
      emoji,
      userName,
      sentAt: Date.now(),
    };
    setReactions((prev) => [...prev, rx]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== rx.id));
    }, 2500);
  };

  const sendReaction = (emoji: string) => {
    triggerReactionAnimation(emoji, currentUser.name);
    musicSync.sendReaction(emoji, currentUser);
  };

  const unlockMobileAudio = () => {
    hasUserInteractedRef.current = true;
    setNeedsUserInteraction(false);
    postYtCommand("playVideo");
  };

  return (
    <MusicContext.Provider
      value={{
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
        isPlayerOpen,
        needsUserInteraction,
        playTrack,
        togglePlay,
        pause,
        resume,
        seekTo,
        setVolume: handleVolume,
        toggleMute,
        addToQueue,
        removeFromQueue,
        clearQueue,
        playNext: handlePlayNext,
        playPrevious,
        setShowVideo,
        setIsPlayerOpen,
        sendReaction,
        unlockMobileAudio,
      }}
    >
      {/* 
        =======================================================================
        GLOBAL AUDIO ENGINE (Hidden / Offscreen Singleton IFrame)
        Mounted ONCE at the root of the app. Never unmounts when changing chats!
        Uses an on-screen minimum dimension (w-12 h-12 opacity-5) so Chrome and 
        Brave never block audio playback or consider it an invisible frame!
        =======================================================================
      */}
      <div
        className={`fixed z-0 pointer-events-none transition-all duration-300 ${
          showVideo
            ? "bottom-20 right-4 w-72 sm:w-96 aspect-video bg-black rounded-xl shadow-2xl border border-neutral-700 pointer-events-auto overflow-hidden z-50"
            : "bottom-0 right-0 w-12 h-12 opacity-[0.02] overflow-hidden"
        }`}
      >
        {currentTrack && (
          <iframe
            ref={iframeRef}
            key={currentTrack.id}
            src={`https://www.youtube-nocookie.com/embed/${currentTrack.id}?autoplay=1&enablejsapi=1&origin=${encodeURIComponent(
              origin || ""
            )}&rel=0&modestbranding=1&playsinline=1`}
            title={currentTrack.title}
            onLoad={onIframeLoad}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        )}
      </div>

      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error("useMusic must be used within a MusicProvider");
  }
  return context;
}
