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
  playlist: MusicTrack[];
  showVideo: boolean;
  activeDj: WorkspaceMember | null;
  listeners: WorkspaceMember[];
  reactions: MusicReaction[];
  isPlayerOpen: boolean;
  needsUserInteraction: boolean;
  hiddenTrackIds: string[];
  hideTrack: (trackId: string) => void;
  playTrack: (track: MusicTrack, position?: number, newPlaylist?: MusicTrack[]) => void;
  setPlaylist: (tracks: MusicTrack[]) => void;
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
  const [playlist, setPlaylist] = useState<MusicTrack[]>([]);
  const playlistRef = useRef<MusicTrack[]>([]);
  playlistRef.current = playlist;
  const [showVideo, setShowVideo] = useState<boolean>(false);
  const [activeDj, setActiveDj] = useState<WorkspaceMember | null>(null);
  const [listeners, setListeners] = useState<WorkspaceMember[]>([currentUser]);
  const [reactions, setReactions] = useState<MusicReaction[]>([]);
  const [isPlayerOpen, setIsPlayerOpen] = useState<boolean>(false);
  const [needsUserInteraction, setNeedsUserInteraction] = useState<boolean>(false);
  const [hiddenTrackIds, setHiddenTrackIds] = useState<string[]>([]);
  const [origin, setOrigin] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
      try {
        const saved = localStorage.getItem("kaelixo_hidden_tracks");
        if (saved) {
          setHiddenTrackIds(JSON.parse(saved));
        }
      } catch {}
    }
  }, []);

  const hideTrack = (trackId: string) => {
    setHiddenTrackIds((prev) => {
      if (prev.includes(trackId)) return prev;
      const next = [...prev, trackId];
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("kaelixo_hidden_tracks", JSON.stringify(next));
        } catch {}
      }
      return next;
    });
    if (currentTrack?.id === trackId) {
      handlePlayNext();
    }
  };

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasUserInteractedRef = useRef<boolean>(false);

  // Unlock mobile hardware Web Audio context (resumes suspended mobile audio pipeline)
  const unlockHardwareAudio = () => {
    try {
      if (typeof window !== "undefined") {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          if (!(window as any).__kaelixoAudioCtx) {
            (window as any).__kaelixoAudioCtx = new AudioCtx();
          }
          const ctx = (window as any).__kaelixoAudioCtx;
          if (ctx.state === "suspended") {
            ctx.resume();
          }
        }
      }
    } catch {}
  };

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
          setCurrentTime(pos);
          setDuration(track.duration || 180);
          setIsPlaying(true);
          setNeedsUserInteraction(false);

          setTimeout(() => {
            postYtCommand("seekTo", [targetPos, true]);
            postYtCommand("unMute");
            postYtCommand("setVolume", [volume > 0 ? volume : 100]);
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
            setCurrentTime(targetPos);
            setDuration(state.currentTrack.duration || 180);
            setIsPlaying(state.isPlaying);
            setActiveDj(state.dj as any);
            setQueue(state.queue || []);

            setTimeout(() => {
              postYtCommand("seekTo", [targetPos, true]);
              postYtCommand("unMute");
              postYtCommand("setVolume", [volume > 0 ? volume : 100]);
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

        // Catch YouTube errors (150/101: embedding disabled, 100: not found/deleted)
        if (data?.event === "onError" || (data?.info && data.info.errorCode !== undefined)) {
          const errCode = data?.data || data?.info?.errorCode;
          console.warn("YouTube player error:", errCode, "Auto-skipping broken track:", currentTrack?.title);
          if (currentTrack) {
            hideTrack(currentTrack.id);
          }
          setTimeout(() => {
            handlePlayNext();
          }, 400);
          return;
        }

        if (data?.event === "infoDelivery" && data.info) {
          if (data.info.currentTime !== undefined) {
            setCurrentTime(Math.floor(data.info.currentTime));
          }
          if (data.info.duration !== undefined && data.info.duration > 0) {
            setDuration(Math.floor(data.info.duration));
          }
          if (data.info.muted !== undefined) {
            setIsMuted(Boolean(data.info.muted));
          }
          if (data.info.volume !== undefined && data.info.volume > 0) {
            setVolume(data.info.volume);
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

  // Global Mobile Touch & Click Audio-Unlock Listener
  // Mobile browsers require a user gesture to route audio through speakers.
  // When user taps/scrolls anywhere on their phone screen, we unlock the Web Audio pipeline
  // and unmute YouTube so the phone speakers immediately play the music!
  useEffect(() => {
    const handleUserGesture = () => {
      unlockHardwareAudio();
      postYtCommand("unMute");
      postYtCommand("setVolume", [volume > 0 ? volume : 100]);
      if (isPlaying) {
        postYtCommand("playVideo");
      }
    };

    window.addEventListener("touchstart", handleUserGesture, { passive: true });
    window.addEventListener("pointerdown", handleUserGesture, { passive: true });
    window.addEventListener("click", handleUserGesture, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleUserGesture);
      window.removeEventListener("pointerdown", handleUserGesture);
      window.removeEventListener("click", handleUserGesture);
    };
  }, [isPlaying, volume]);

  // Tell iframe we are listening to events whenever iframe loads
  const onIframeLoad = () => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: "listening" }),
          "*"
        );
        postYtCommand("unMute");
        postYtCommand("setVolume", [volume > 0 ? volume : 100]);
        if (isPlaying) {
          postYtCommand("playVideo");
        }
      } catch {}
    }
  };

  // Active playback second-by-second ticker
  // Ensures scrubber slider and time counters (0:01, 0:02...) advance smoothly in real time!
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 1;
          if (duration > 0 && next >= duration) {
            handlePlayNext();
            return 0;
          }
          return next;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, duration]);

  // Play Specific Track
  const playTrack = (track: MusicTrack, position: number = 0, newPlaylist?: MusicTrack[]) => {
    hasUserInteractedRef.current = true;
    unlockHardwareAudio();
    setCurrentTrack(track);
    setCurrentTime(position);
    setDuration(track.duration || 180);
    setIsPlaying(true);
    setIsMuted(false);
    setActiveDj(currentUser);

    if (newPlaylist && newPlaylist.length > 0) {
      setPlaylist(newPlaylist);
      playlistRef.current = newPlaylist;
    }

    // Broadcast PLAY to all devices
    musicSync.play(track, position, currentUser);

    setTimeout(() => {
      postYtCommand("seekTo", [position, true]);
      postYtCommand("unMute");
      postYtCommand("setVolume", [volume > 0 ? volume : 100]);
      postYtCommand("playVideo");
    }, 300);
  };

  // Toggle Play / Pause
  const togglePlay = () => {
    hasUserInteractedRef.current = true;
    unlockHardwareAudio();
    const nextState = !isPlaying;
    setIsPlaying(nextState);

    if (nextState) {
      postYtCommand("unMute");
      postYtCommand("setVolume", [volume > 0 ? volume : 100]);
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
    unlockHardwareAudio();
    setIsPlaying(true);
    postYtCommand("unMute");
    postYtCommand("setVolume", [volume > 0 ? volume : 100]);
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
    unlockHardwareAudio();
    if (isMuted) {
      postYtCommand("unMute");
      postYtCommand("setVolume", [volume > 0 ? volume : 100]);
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
    // 1. If user has items in custom queue, prioritize queue
    if (queue.length > 0) {
      const next = queue[0];
      setQueue((prev) => prev.slice(1));
      playTrack(next, 0);
      return;
    }

    // 2. Otherwise play next song in the active category / playlist
    const activeList = playlistRef.current;
    if (activeList.length > 0 && currentTrack) {
      const currentIndex = activeList.findIndex((t) => t.id === currentTrack.id);
      if (currentIndex !== -1 && currentIndex < activeList.length - 1) {
        playTrack(activeList[currentIndex + 1], 0);
        return;
      } else if (currentIndex === activeList.length - 1) {
        // Loop back to first song in category
        playTrack(activeList[0], 0);
        return;
      } else if (currentIndex === -1) {
        playTrack(activeList[0], 0);
        return;
      }
    }

    if (currentTrack) {
      seekTo(0);
    }
  };

  const playPrevious = () => {
    // If current song has played for more than 3 seconds, restart it first
    if (currentTime > 3) {
      seekTo(0);
      return;
    }

    // Otherwise play previous song in active category / playlist
    const activeList = playlistRef.current;
    if (activeList.length > 0 && currentTrack) {
      const currentIndex = activeList.findIndex((t) => t.id === currentTrack.id);
      if (currentIndex > 0) {
        playTrack(activeList[currentIndex - 1], 0);
        return;
      } else if (currentIndex === 0) {
        // Loop to last song in category
        playTrack(activeList[activeList.length - 1], 0);
        return;
      }
    }

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
    setIsMuted(false);
    unlockHardwareAudio();
    postYtCommand("unMute");
    postYtCommand("setVolume", [volume > 0 ? volume : 100]);
    if (isPlaying) {
      postYtCommand("playVideo");
    }
  };

  const hostOrigin = origin || (typeof window !== "undefined" ? window.location.origin : "");

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
        playlist,
        setPlaylist,
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
        hiddenTrackIds,
        hideTrack,
      }}
    >
      {/* 
        =======================================================================
        GLOBAL AUDIO ENGINE (Singleton IFrame)
        Mounted ONCE at the root of the app. Never unmounts when changing chats!
        Uses an offscreen opacity-100 footprint so Chrome / Android / iOS
        never throttle or silence the audio hardware stream.
        =======================================================================
      */}
      <div
        className={`fixed z-0 pointer-events-none transition-all duration-300 ${
          showVideo
            ? "bottom-20 right-4 w-72 sm:w-96 aspect-video bg-black rounded-xl shadow-2xl border border-neutral-700 pointer-events-auto overflow-hidden z-50"
            : "fixed -bottom-10 -right-10 w-2 h-2 opacity-100 overflow-hidden pointer-events-none z-[-1]"
        }`}
      >
        {currentTrack && (
          <iframe
            ref={iframeRef}
            key={currentTrack.id}
            src={`https://www.youtube.com/embed/${currentTrack.id}?autoplay=1&enablejsapi=1&origin=${encodeURIComponent(
              hostOrigin
            )}&widget_referrer=${encodeURIComponent(hostOrigin)}&rel=0&modestbranding=1&playsinline=1`}
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
