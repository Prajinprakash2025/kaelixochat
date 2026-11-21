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
import { getSmartRelatedRecommendation, cleanRawTitle, isMusicSongTrack } from "@/utils/music-recommendations";

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
  resync: () => void;
  syncDriftSeconds: number;
  hasJoinedJam: boolean;
  joinJam: () => void;
  leaveJam: () => void;
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
  const [syncDriftSeconds, setSyncDriftSeconds] = useState<number>(0);
  const [origin, setOrigin] = useState<string>("");

  const [hasJoinedJam, setHasJoinedJam] = useState<boolean>(false);
  const hasJoinedJamRef = useRef<boolean>(false);
  hasJoinedJamRef.current = hasJoinedJam;

  const joinJam = () => {
    setHasJoinedJam(true);
    hasJoinedJamRef.current = true;
    setIsPlaying(true);
    isPlayingRef.current = true;
    setNeedsUserInteraction(false);
    unlockHardwareAudio();

    if (currentTrackRef.current) {
      setTimeout(() => {
        postYtCommand("seekTo", [currentTimeRef.current || 0, true]);
        postYtCommand("unMute");
        postYtCommand("setVolume", [volume > 0 ? volume : 100]);
        postYtCommand("playVideo");
      }, 350);
    }
  };

  const leaveJam = () => {
    setHasJoinedJam(false);
    hasJoinedJamRef.current = false;
    setIsPlaying(false);
    isPlayingRef.current = false;
    postYtCommand("pauseVideo");
  };

  const currentTrackRef = useRef<MusicTrack | null>(null);
  currentTrackRef.current = currentTrack;
  const isPlayingRef = useRef<boolean>(false);
  isPlayingRef.current = isPlaying;
  const currentTimeRef = useRef<number>(0);
  currentTimeRef.current = currentTime;
  const activeDjRef = useRef<WorkspaceMember | null>(null);
  activeDjRef.current = activeDj;
  const queueRef = useRef<MusicTrack[]>([]);
  queueRef.current = queue;
  const isAutoplayingRef = useRef<boolean>(false);
  const recentlyPlayedRef = useRef<string[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
      try {
        const saved = localStorage.getItem("kaelixo_hidden_tracks");
        if (saved) {
          setHiddenTrackIds(JSON.parse(saved));
        }
      } catch {}

      const handleLeave = () => {
        leaveJam();
      };
      window.addEventListener("kaelixo:leave-music-jam", handleLeave);
      return () => {
        window.removeEventListener("kaelixo:leave-music-jam", handleLeave);
      };
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

  // 1. DJ Heartbeat Emitter: Every 3 seconds, active DJ emits exact position to keep all devices in sync
  useEffect(() => {
    if (!isPlaying || !currentTrack) return;
    const isDj = !activeDj || activeDj.id === currentUser.id;
    if (!isDj) return;

    const interval = setInterval(() => {
      if (currentTrackRef.current && isPlayingRef.current) {
        musicSync.heartbeat(
          currentTimeRef.current,
          isPlayingRef.current,
          currentTrackRef.current.id,
          currentUser
        );
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isPlaying, currentTrack?.id, activeDj?.id, currentUser]);

  // 2. Stable Supabase Realtime channel subscription (Initialized ONCE, avoids dropped packets)
  useEffect(() => {
    musicSync.init(currentUser, "workspace-hq");

    const unsubAction = musicSync.subscribe((action) => {
      switch (action.type) {
        case "PLAY": {
          const track = action.payload.track as MusicTrack;
          const pos = Number(action.payload.position) || 0;
          let elapsed = (Date.now() - action.sentAt) / 1000;
          if (elapsed < 0 || elapsed > 5) elapsed = 0.15; // Clock skew protection
          const targetPos = Math.max(0, pos + elapsed);

          setActiveDj(action.sender as any);
          setCurrentTrack(track);
          setCurrentTime(Math.floor(targetPos));
          setDuration(track.duration || 180);

          if (hasJoinedJamRef.current) {
            setIsPlaying(true);
            setNeedsUserInteraction(false);

            // Execute immediate seek and play
            postYtCommand("seekTo", [targetPos, true]);
            postYtCommand("unMute");
            postYtCommand("setVolume", [volume > 0 ? volume : 100]);
            postYtCommand("playVideo");

            setTimeout(() => {
              postYtCommand("seekTo", [targetPos, true]);
              postYtCommand("playVideo");
            }, 350);
          } else {
            setIsPlaying(false);
          }
          break;
        }

        case "PAUSE": {
          setIsPlaying(false);
          const pos = action.payload.position;
          postYtCommand("pauseVideo");
          if (pos !== undefined && !isNaN(pos)) {
            const pausePos = Math.floor(pos);
            setCurrentTime(pausePos);
            postYtCommand("seekTo", [pausePos, true]);
          }
          break;
        }

        case "SEEK": {
          const pos = Number(action.payload.position) || 0;
          let elapsed = (Date.now() - action.sentAt) / 1000;
          if (elapsed < 0 || elapsed > 5) elapsed = 0.15;
          const targetPos = pos + elapsed;
          setCurrentTime(Math.floor(targetPos));
          if (hasJoinedJamRef.current) {
            postYtCommand("seekTo", [targetPos, true]);
          }
          break;
        }

        case "TRACK_CHANGE": {
          const track = action.payload.track as MusicTrack;
          setActiveDj(action.sender as any);
          setCurrentTrack(track);
          setCurrentTime(0);
          if (hasJoinedJamRef.current) {
            setIsPlaying(true);
            postYtCommand("seekTo", [0, true]);
            postYtCommand("unMute");
            postYtCommand("setVolume", [volume > 0 ? volume : 100]);
            postYtCommand("playVideo");
          } else {
            setIsPlaying(false);
          }
          break;
        }

        case "HEARTBEAT": {
          if (!hasJoinedJamRef.current) break;
          // Ignore own heartbeats
          if (action.sender.id === currentUser.id) break;

          // Ensure it's for current track
          if (
            action.payload.trackId &&
            currentTrackRef.current &&
            currentTrackRef.current.id !== action.payload.trackId
          ) {
            break;
          }

          const djPlaying = Boolean(action.payload.isPlaying);
          const djPos = Number(action.payload.position) || 0;

          // Latency & clock-skew compensation
          let latency = (Date.now() - action.sentAt) / 1000;
          if (latency < 0 || latency > 4) latency = 0.15;
          const expectedPos = djPos + (djPlaying ? latency : 0);

          const localPos = currentTimeRef.current;
          const drift = Math.abs(localPos - expectedPos);
          setSyncDriftSeconds(drift);

          // Align playing state if DJ paused/resumed
          if (djPlaying !== isPlayingRef.current) {
            setIsPlaying(djPlaying);
            if (djPlaying) {
              postYtCommand("playVideo");
            } else {
              postYtCommand("pauseVideo");
              postYtCommand("seekTo", [djPos, true]);
              setCurrentTime(Math.floor(djPos));
            }
          }

          // If audio drifted by more than 1.2s, automatically pull it back into lockstep!
          if (djPlaying && drift > 1.2) {
            console.log(`[MusicSync] Drift of ${drift.toFixed(2)}s detected -> Snapping to ${expectedPos.toFixed(2)}s`);
            setCurrentTime(Math.floor(expectedPos));
            postYtCommand("seekTo", [expectedPos, true]);
            postYtCommand("playVideo");
          }
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
          if (currentTrackRef.current) {
            musicSync.respondState(
              {
                currentTrack: currentTrackRef.current,
                isPlaying: isPlayingRef.current,
                position: currentTimeRef.current,
                sentAt: Date.now(),
                dj: activeDjRef.current || {
                  id: currentUser.id,
                  name: currentUser.name,
                  avatar: currentUser.avatar,
                },
                queue: queueRef.current,
              },
              currentUser
            );
          }
          break;
        }

        case "SYNC_RESPONSE": {
          const state = action.payload as MusicSyncState;
          if (state && state.currentTrack) {
            let elapsed = (Date.now() - state.sentAt) / 1000;
            if (elapsed < 0 || elapsed > 5) elapsed = 0.15;
            const targetPos = (state.position || 0) + (state.isPlaying ? elapsed : 0);

            setActiveDj(state.dj as any);
            setQueue(state.queue || []);
            setDuration(state.currentTrack.duration || 180);

            if (!currentTrackRef.current || currentTrackRef.current.id !== state.currentTrack.id) {
              setCurrentTrack(state.currentTrack);
              setCurrentTime(Math.floor(targetPos));

              if (hasJoinedJamRef.current) {
                setIsPlaying(state.isPlaying);

                setTimeout(() => {
                  postYtCommand("seekTo", [targetPos, true]);
                  postYtCommand("unMute");
                  postYtCommand("setVolume", [volume > 0 ? volume : 100]);
                  if (state.isPlaying) {
                    postYtCommand("playVideo");
                  } else {
                    postYtCommand("pauseVideo");
                  }
                }, 350);
              } else {
                setIsPlaying(false);
              }
            } else {
              if (hasJoinedJamRef.current) {
                // Same track: align playing state and position immediately!
                setIsPlaying(state.isPlaying);
                const drift = Math.abs(currentTimeRef.current - targetPos);
                if (drift > 1.0) {
                  setCurrentTime(Math.floor(targetPos));
                  postYtCommand("seekTo", [targetPos, true]);
                }
                if (state.isPlaying) {
                  postYtCommand("playVideo");
                } else {
                  postYtCommand("pauseVideo");
                }
              }
            }
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
  }, [currentUser.id]);

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
      if (!hasJoinedJamRef.current) return;
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
    if (!hasJoinedJamRef.current) return;
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
    setHasJoinedJam(true);
    hasJoinedJamRef.current = true;
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

    if (track?.id) {
      recentlyPlayedRef.current = [
        track.id,
        ...recentlyPlayedRef.current.filter((id) => id !== track.id),
      ].slice(0, 50);
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
    if (!hasJoinedJam) {
      joinJam();
      return;
    }
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
    if (!hasJoinedJam) {
      joinJam();
      return;
    }
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

    // 2. Otherwise play next song in the active category / playlist / search pool
    const activeList = playlistRef.current;
    if (activeList.length > 1 && currentTrack) {
      const currentIndex = activeList.findIndex((t) => t.id === currentTrack.id);
      if (currentIndex !== -1 && currentIndex < activeList.length - 1) {
        playTrack(activeList[currentIndex + 1], 0);
        return;
      }
    }

    // 3. YouTube-Style Related Songs Autoplay (Up Next)
    // When queue is empty AND we reached the end of search results/playlist (or played a standalone song),
    // intelligently recommend and auto-play related songs in the same language and genre!
    if (typeof window !== "undefined") {
      if (isAutoplayingRef.current) return;
      isAutoplayingRef.current = true;

      if (currentTrack) {
        const recommendation = getSmartRelatedRecommendation(currentTrack);
        const queryParam = encodeURIComponent(recommendation.query);

        const handleAutoplayResult = (candidateTracks: MusicTrack[]): boolean => {
          const freshTracks = candidateTracks.filter(
            (t) =>
              isMusicSongTrack(t.title, t.artist, t.duration || 0) &&
              t.id !== currentTrack.id &&
              !recentlyPlayedRef.current.includes(t.id) &&
              !hiddenTrackIds.includes(t.id)
          );
          const pool =
            freshTracks.length > 0
              ? freshTracks
              : candidateTracks.filter(
                  (t) =>
                    isMusicSongTrack(t.title, t.artist, t.duration || 0) &&
                    t.id !== currentTrack.id &&
                    !hiddenTrackIds.includes(t.id)
                );

          if (pool.length > 0) {
            const nextTrack = pool[0];
            // Set the rest of the related songs as the new active playlist for seamless continuous playback!
            playTrack(nextTrack, 0, pool);
            try {
              window.dispatchEvent(
                new CustomEvent("kaelixo:music-toast", {
                  detail: `Up Next: "${cleanRawTitle(nextTrack.title)}" (${recommendation.descriptor})`,
                })
              );
            } catch {}
            return true;
          }
          return false;
        };

        fetch(`/api/music/search?q=${queryParam}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success && Array.isArray(data.tracks) && data.tracks.length > 0) {
              const played = handleAutoplayResult(data.tracks);
              if (played) return;
            }
            // Fallback to language category if query had no fresh matches
            return fetch(
              `/api/music/search?category=${encodeURIComponent(
                recommendation.fallbackCategory
              )}&page=${Math.floor(Math.random() * 2) + 1}`
            )
              .then((res) => res.json())
              .then((catData) => {
                if (catData.success && Array.isArray(catData.tracks) && catData.tracks.length > 0) {
                  const played = handleAutoplayResult(catData.tracks);
                  if (!played && currentTrack) seekTo(0);
                } else if (currentTrack) {
                  seekTo(0);
                }
              });
          })
          .catch((err) => {
            console.warn("Autoplay related search failed, trying category fallback:", err);
            fetch(
              `/api/music/search?category=${encodeURIComponent(
                recommendation.fallbackCategory
              )}&page=1`
            )
              .then((res) => res.json())
              .then((catData) => {
                if (catData.success && Array.isArray(catData.tracks) && catData.tracks.length > 0) {
                  const played = handleAutoplayResult(catData.tracks);
                  if (!played && currentTrack) seekTo(0);
                } else if (currentTrack) {
                  seekTo(0);
                }
              })
              .catch(() => {
                if (currentTrack) seekTo(0);
              });
          })
          .finally(() => {
            setTimeout(() => {
              isAutoplayingRef.current = false;
            }, 800);
          });
        return;
      }

      // Initial starter if no current track exists yet
      fetch(`/api/music/search?category=trending&page=1`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.tracks) && data.tracks.length > 0) {
            playTrack(data.tracks[0], 0, data.tracks);
          }
        })
        .catch(() => {})
        .finally(() => {
          isAutoplayingRef.current = false;
        });
      return;
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

  const resync = () => {
    unlockMobileAudio();
    musicSync.requestSync(currentUser);
    console.log("[MusicSync] Sent manual resync request to DJ");
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
        resync,
        syncDriftSeconds,
        hiddenTrackIds,
        hideTrack,
        hasJoinedJam,
        joinJam,
        leaveJam,
      }}
    >
      {/* 
        =======================================================================
        GLOBAL AUDIO ENGINE (Singleton IFrame)
        Mounted ONCE at the root of the app. Never unmounts when changing chats!
        Uses an offscreen opacity-100 footprint so Chrome / Android / iOS
        never throttle or silence the audio hardware stream.
        Gated by hasJoinedJam: Audio only plays for users who clicked Play or Join Jam!
        =======================================================================
      */}
      <div
        className={`fixed z-0 pointer-events-none transition-all duration-300 ${
          showVideo
            ? "bottom-20 right-4 w-72 sm:w-96 aspect-video bg-black rounded-xl shadow-2xl border border-neutral-700 pointer-events-auto overflow-hidden z-50"
            : "fixed -bottom-10 -right-10 w-2 h-2 opacity-100 overflow-hidden pointer-events-none z-[-1]"
        }`}
      >
        {currentTrack && hasJoinedJam && (
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
