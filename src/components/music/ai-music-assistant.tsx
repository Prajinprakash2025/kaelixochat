"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Sparkles,
  Volume2,
  VolumeX,
  Volume1,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  X,
  Send,
  Loader2,
  Music,
  Check,
  ChevronDown,
  Bot,
  Zap,
  SlidersHorizontal,
  PlayCircle,
} from "lucide-react";
import { useMusic } from "@/context/music-context";
import { MusicTrack } from "@/types";

interface MessageItem {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  track?: MusicTrack;
  actionType?: "play" | "pause" | "volume" | "next" | "prev" | "shuffle" | "search";
}

interface AiMusicAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  themeAccent?: string;
  themeTextColor?: string;
}

export function AiMusicAssistant({
  isOpen,
  onClose,
  themeAccent = "#10b981",
  themeTextColor = "#ffffff",
}: AiMusicAssistantProps) {
  const music = useMusic();
  const {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    playTrack,
    pause,
    resume,
    playNext,
    playPrevious,
    setVolume,
    toggleMute,
    playlist,
  } = music;

  const [isListening, setIsListening] = useState<boolean>(false);
  const [liveTranscript, setLiveTranscript] = useState<string>("");
  const [textInput, setTextInput] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(true);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "👋 Hi! I'm your Kaelixo AI Music Assistant. Tell me what to play, say 'Next', 'Volume 80%', 'Pause', or ask for any song in English or Manglish!",
      timestamp: "Just now",
    },
  ]);

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>("");
  const [voicePersonality, setVoicePersonality] = useState<"natural_female" | "cool_dj" | "desi_indian" | "custom">("natural_female");
  const [isVoiceSettingsOpen, setIsVoiceSettingsOpen] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, liveTranscript]);

  // Load and prioritize natural neural human voices
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const loadVoices = () => {
      const all = window.speechSynthesis.getVoices();
      if (!all || all.length === 0) return;

      setAvailableVoices(all);

      const savedVoice = localStorage.getItem("kaelixo_ai_voice_name");
      const savedPersonality = localStorage.getItem("kaelixo_ai_voice_personality") as any;
      if (savedPersonality) setVoicePersonality(savedPersonality);

      if (savedVoice && all.some((v) => v.name === savedVoice)) {
        setSelectedVoiceName(savedVoice);
      } else {
        // Auto-select the BEST natural human voice (prioritize Edge Natural, Google, Apple Siri)
        const bestVoice =
          all.find((v) => /natural.*jenny|jenny.*natural/i.test(v.name)) ||
          all.find((v) => /natural.*aria|aria.*natural/i.test(v.name)) ||
          all.find((v) => /google\s+us\s+english/i.test(v.name)) ||
          all.find((v) => /samantha|siri/i.test(v.name)) ||
          all.find((v) => /natural|online|neural/i.test(v.name) && v.lang.startsWith("en")) ||
          all.find((v) => v.lang.startsWith("en")) ||
          all[0];

        if (bestVoice) {
          setSelectedVoiceName(bestVoice.name);
        }
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  // Voice Speech Synthesis (TTS) with Human-Grade Neural Voices
  const speakText = (text: string, overrideVoice?: string, overridePersonality?: string) => {
    if (!ttsEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      // Clean text of emojis & punctuation for smooth speech
      const cleaned = text.replace(/[\u{1F300}-\u{1F9FF}]/gu, "").replace(/[^\w\s.,!?'"-]/g, "");
      const utterance = new SpeechSynthesisUtterance(cleaned);

      const all = window.speechSynthesis.getVoices();
      const targetName = overrideVoice || selectedVoiceName;
      let targetVoice = all.find((v) => v.name === targetName);

      if (!targetVoice) {
        targetVoice =
          all.find((v) => /natural|online|google|neural|samantha/i.test(v.name) && v.lang.startsWith("en")) ||
          all.find((v) => v.lang.startsWith("en"));
      }

      if (targetVoice) {
        utterance.voice = targetVoice;
      }

      const activePersonality = overridePersonality || voicePersonality;
      if (activePersonality === "cool_dj") {
        utterance.rate = 0.98;
        utterance.pitch = 0.90; // Deep relaxed DJ bass
      } else if (activePersonality === "desi_indian") {
        utterance.rate = 1.0;
        utterance.pitch = 1.02;
      } else {
        // Natural female / warm
        utterance.rate = 1.0;
        utterance.pitch = 1.05;
      }
      utterance.volume = 1.0;

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech synthesis error:", e);
    }
  };

  const selectVoicePersonality = (personality: "natural_female" | "cool_dj" | "desi_indian") => {
    setVoicePersonality(personality);
    if (typeof window !== "undefined") {
      localStorage.setItem("kaelixo_ai_voice_personality", personality);
    }

    const all = availableVoices;
    let target: SpeechSynthesisVoice | undefined;

    if (personality === "natural_female") {
      target =
        all.find((v) => /natural.*jenny|jenny.*natural|natural.*aria|aria.*natural/i.test(v.name)) ||
        all.find((v) => /google\s+us\s+english|samantha|zira/i.test(v.name)) ||
        all.find((v) => /female/i.test(v.name) && v.lang.startsWith("en"));
    } else if (personality === "cool_dj") {
      target =
        all.find((v) => /natural.*guy|guy.*natural|natural.*ryan|ryan.*natural/i.test(v.name)) ||
        all.find((v) => /google\s+uk\s+english\s+male|daniel|david/i.test(v.name)) ||
        all.find((v) => /male/i.test(v.name) && v.lang.startsWith("en"));
    } else if (personality === "desi_indian") {
      target =
        all.find((v) => /natural.*neerja|neerja.*natural|natural.*prabhat/i.test(v.name)) ||
        all.find((v) => /india|en-in/i.test(v.lang) || /india|heera|ravi/i.test(v.name));
    }

    if (target) {
      setSelectedVoiceName(target.name);
      if (typeof window !== "undefined") {
        localStorage.setItem("kaelixo_ai_voice_name", target.name);
      }
      speakText(
        personality === "natural_female"
          ? "Hi! I'm your smooth natural AI DJ. How does this sound?"
          : personality === "cool_dj"
          ? "Yo! This is your cool DJ voice. Ready for the music!"
          : "Namaste! This is your Indian English AI voice. All set!",
        target.name,
        personality
      );
    }
  };

  const handleSelectSpecificVoice = (voiceName: string) => {
    setSelectedVoiceName(voiceName);
    setVoicePersonality("custom");
    if (typeof window !== "undefined") {
      localStorage.setItem("kaelixo_ai_voice_name", voiceName);
      localStorage.setItem("kaelixo_ai_voice_personality", "custom");
    }
    speakText("Testing this voice sound for Kaelixo AI DJ.", voiceName, "custom");
  };

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-IN"; // Handles Indian English and Manglish phonetics

      recognition.onstart = () => {
        setIsListening(true);
        setLiveTranscript("");
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        if (final) {
          setLiveTranscript(final);
          // Push-to-talk: auto-stop listening on final command so room banter is ignored
          try {
            recognition.stop();
          } catch {}
          setIsListening(false);
          handleExecuteCommand(final);
        } else {
          setLiveTranscript(interim);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          addAiMessage("⚠️ Microphone access was blocked. You can type commands below!");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.warn("Speech recognition init error:", err);
      setSpeechSupported(false);
    }

    return () => {
      try {
        if (recognitionRef.current) {
          recognitionRef.current.abort();
        }
      } catch {}
    };
  }, []);

  const toggleListening = () => {
    if (!speechSupported) {
      alert("Voice speech recognition is not supported in this browser. Please use the text input below!");
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListening(false);
    } else {
      try {
        setLiveTranscript("");
        recognitionRef.current?.start();
      } catch (e) {
        console.warn("Failed to start speech recognition:", e);
      }
    }
  };

  const addAiMessage = (
    text: string,
    actionType?: MessageItem["actionType"],
    track?: MusicTrack
  ) => {
    const newMsg: MessageItem = {
      id: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sender: "ai",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      actionType,
      track,
    };
    setMessages((prev) => [...prev, newMsg]);
    speakText(text);
  };

  const addUserMessage = (text: string) => {
    const newMsg: MessageItem = {
      id: `user-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, newMsg]);
  };

  // Main Natural Language Command Execution Engine (Strict Intent: No False Triggers)
  const handleExecuteCommand = async (rawCmd: string) => {
    let clean = rawCmd.trim();
    if (!clean) return;

    addUserMessage(clean);
    setIsProcessing(true);
    setLiveTranscript("");

    // Strip wake prefixes like "Hey Kaelixo", "DJ", "Hey DJ", "Computer"
    clean = clean.replace(/^(?:hey\s+kaelixo|kaelixo|hey\s+dj|dj|computer)\s*[,:]?\s*/i, "").trim();
    const lower = clean.toLowerCase();

    // 1. VOLUME NUMERIC: "volume 80", "sound 50%", "set volume to 60", "vol 90"
    const volNumMatch =
      lower.match(/(?:volume|sound|vol|shabdam)\s*(?:to\s*|level\s*|set to\s*|aakku\s*)?(\d{1,3})(?:%|percent)?/i) ||
      lower.match(/^(\d{1,3})%\s*(?:volume|sound)?$/i);

    if (volNumMatch && volNumMatch[1]) {
      const targetVol = Math.min(100, Math.max(0, parseInt(volNumMatch[1], 10)));
      setVolume(targetVol);
      addAiMessage(`🔊 Volume set to ${targetVol}%.`, "volume");
      setIsProcessing(false);
      return;
    }

    // 2. VOLUME INCREASE: "volume kootu", "volume koottu", "louder", "sound kootu", "volume up"
    if (
      /(?:volume|sound)\s*(?:koottu|kootu|up|increase|raise|high)|louder|sound\s*kootu|sound\s*koottu/i.test(lower)
    ) {
      const nextVol = Math.min(100, volume + 15);
      setVolume(nextVol);
      addAiMessage(`🔊 Increased volume to ${nextVol}%.`, "volume");
      setIsProcessing(false);
      return;
    }

    // 3. VOLUME DECREASE: "volume kuraykku", "sound kuraykku", "volume down", "softer", "lower sound"
    if (
      /(?:volume|sound)\s*(?:kuraykku|kurachu|korakku|down|decrease|lower|low)|softer|sound\s*kuraykku|sound\s*korakku/i.test(lower)
    ) {
      const nextVol = Math.max(0, volume - 15);
      setVolume(nextVol);
      addAiMessage(`🔉 Decreased volume to ${nextVol}%.`, "volume");
      setIsProcessing(false);
      return;
    }

    // 4. MUTE: "mute", "sound off", "silent", "sound nirthu"
    if (/\b(?:mute\s+music|mute\s+sound|sound\s+off|music\s+mute|^mute$|^silent$)\b/i.test(lower)) {
      if (!isMuted) toggleMute();
      addAiMessage("🔇 Music muted.", "volume");
      setIsProcessing(false);
      return;
    }

    // 5. UNMUTE: "unmute", "sound on", "volume on"
    if (/\b(?:unmute\s+music|unmute\s+sound|sound\s+on|music\s+unmute|^unmute$)\b/i.test(lower)) {
      if (isMuted) toggleMute();
      addAiMessage("🔊 Sound unmuted.", "volume");
      setIsProcessing(false);
      return;
    }

    // 6. STOP / PAUSE: Must be an explicit command, NEVER triggered by casual banter
    const isStopNegative = /\b(?:don'?t\s+stop|can'?t\s+stop|non-?stop|never\s+stop)\b/i.test(lower);
    const isExplicitPause =
      !isStopNegative &&
      (/^(?:stop|pause|nirthu|freeze|hold)$/i.test(lower) ||
        /\b(?:stop\s+music|pause\s+music|stop\s+the\s+music|pause\s+the\s+music|music\s+stop|music\s+pause|paattu\s+nirthu|paatu\s+nirthu|music\s+nirthu|stop\s+cheyyu|stop\s+cheyy|stop\s+aakku|pause\s+cheyyu)\b/i.test(
          lower
        ));

    if (isExplicitPause && !/\b(?:play|start|thudangu)\b/i.test(lower)) {
      pause();
      addAiMessage("⏸️ Paused the music.", "pause");
      setIsProcessing(false);
      return;
    }

    // 7. RESUME / PLAY:
    const isExplicitResume =
      /^(?:resume|continue|unpause|thudangu)$/i.test(lower) ||
      /^(?:play|play\s+music|start\s+music|continue\s+music|paattu\s+thudangu|music\s+thudangu|resume\s+cheyyu|resume\s+music)$/i.test(
        lower
      );

    if (isExplicitResume) {
      resume();
      addAiMessage("▶️ Resumed music playback.", "play");
      setIsProcessing(false);
      return;
    }

    // 8. CHANGE SONG / NEXT TRACK: Explicit user phrases (e.g. "change song", "music change", "next song", "skip")
    const isChangeSong =
      /^(?:next|skip|change)$/i.test(lower) ||
      /\b(?:change\s+song|change\s+music|song\s+change|music\s+change|change\s+the\s+song|change\s+track|change\s+cheyyu|change\s+cheyy|change\s+aakku|change\s+aakko|next\s+song|next\s+track|skip\s+song|skip\s+track|adutha\s+paattu|adutha\s+song|matte\s+paattu)\b/i.test(
        lower
      );

    if (isChangeSong) {
      playNext();
      addAiMessage("⏭️ Changing to next song.", "next");
      setIsProcessing(false);
      return;
    }

    // 9. PREVIOUS / BACK:
    const isPrevSong =
      /^(?:previous|prev|back)$/i.test(lower) ||
      /\b(?:previous\s+song|prev\s+song|last\s+song|back\s+song|munnathe\s+paattu|munpathe\s+paattu)\b/i.test(
        lower
      );

    if (isPrevSong) {
      playPrevious();
      addAiMessage("⏮️ Playing previous song.", "prev");
      setIsProcessing(false);
      return;
    }

    // 10. WHAT IS PLAYING?:
    if (
      /\b(?:what\s+is\s+playing|what\s+song\s+is\s+this|current\s+song|ethu\s+paatta|ethaa\s+paattu|which\s+song|song\s+name)\b/i.test(
        lower
      )
    ) {
      if (currentTrack) {
        addAiMessage(`🎵 Currently playing "${currentTrack.title}" by ${currentTrack.artist}.`);
      } else {
        addAiMessage("No song is currently playing. Ask me to play any track!");
      }
      setIsProcessing(false);
      return;
    }

    // 11. SHUFFLE:
    if (/\b(?:shuffle\s+music|shuffle\s+playlist|shuffle\s+play|^shuffle$|kuzhachu\s+paadu)\b/i.test(lower)) {
      if (playlist && playlist.length > 0) {
        const randomIndex = Math.floor(Math.random() * playlist.length);
        const randomTrack = playlist[randomIndex];
        playTrack(randomTrack, 0, playlist);
        addAiMessage(`🔀 Shuffled! Now playing "${randomTrack.title}".`, "shuffle", randomTrack);
      } else {
        try {
          const res = await fetch("/api/music/search?category=trending&page=1");
          const data = await res.json();
          if (data.success && data.tracks && data.tracks.length > 0) {
            const randomIndex = Math.floor(Math.random() * data.tracks.length);
            const randomTrack = data.tracks[randomIndex];
            playTrack(randomTrack, 0, data.tracks);
            addAiMessage(`🔀 Shuffled! Now playing "${randomTrack.title}".`, "shuffle", randomTrack);
          }
        } catch {}
      }
      setIsProcessing(false);
      return;
    }

    // Helper to get liked tracks from localStorage
    const getStoredLikedTracks = (): MusicTrack[] => {
      if (typeof window === "undefined") return [];
      try {
        const raw = localStorage.getItem("kaelixo_liked_songs");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
      return [];
    };

    // Helper to get playlists and their tracks from localStorage
    const getStoredPlaylists = () => {
      if (typeof window === "undefined") return { playlists: [] as any[], tracksMap: {} as Record<string, MusicTrack[]> };
      try {
        const savedPl = localStorage.getItem("kaelixo_custom_playlists");
        const savedMap = localStorage.getItem("kaelixo_playlist_tracks_map");
        const playlists = savedPl ? JSON.parse(savedPl) : [];
        const tracksMap = savedMap ? JSON.parse(savedMap) : {};
        return { playlists: Array.isArray(playlists) ? playlists : [], tracksMap };
      } catch {}
      return { playlists: [], tracksMap: {} };
    };

    // 12. LIKED MUSIC / SONGS ("play liked music", "play liked songs", "liked songs", "liked music")
    if (
      /\b(?:liked\s+music|liked\s+songs|liked\s+tracks|my\s+liked|play\s+liked|favorite\s+songs|liked\s+paattu)\b/i.test(
        lower
      )
    ) {
      const likes = getStoredLikedTracks();
      if (likes.length > 0) {
        playTrack(likes[0], 0, likes);
        addAiMessage(`❤️ Playing your Liked Songs collection (${likes.length} tracks)!`, "play", likes[0]);
      } else {
        addAiMessage("Your Liked Songs collection is currently empty! Click the heart ❤️ icon on any song to add it.");
      }
      setIsProcessing(false);
      return;
    }

    // 13. PLAYLIST HANDLER: "play my playlist", "my playlist", "play playlist <name>"
    const playlistMatch = lower.match(
      /(?:play\s+)?(?:my\s+playlist|playlist\s+(.+)|(.+?)\s+playlist|custom\s+playlist)/i
    );

    if (
      playlistMatch ||
      lower === "my playlist" ||
      lower === "play my playlist" ||
      lower.includes("my playlist")
    ) {
      const { playlists: customList, tracksMap } = getStoredPlaylists();
      let targetPlaylistName = playlistMatch?.[1] || playlistMatch?.[2] || "";
      targetPlaylistName = targetPlaylistName.trim().toLowerCase();

      let matchedPl: any = null;
      if (!targetPlaylistName || targetPlaylistName === "my" || targetPlaylistName === "custom") {
        matchedPl =
          customList.find((p: any) => p.name?.toLowerCase().includes("my playlist")) ||
          customList[0];
      } else {
        matchedPl = customList.find((p: any) =>
          p.name?.toLowerCase().includes(targetPlaylistName)
        );
      }

      if (matchedPl) {
        const tracks: MusicTrack[] = tracksMap[matchedPl.id] || [];
        if (tracks.length > 0) {
          playTrack(tracks[0], 0, tracks);
          addAiMessage(`📁 Playing your playlist "${matchedPl.name}" (${tracks.length} tracks)!`, "play", tracks[0]);
        } else {
          addAiMessage(
            `Your playlist "${matchedPl.name}" is currently empty. Open it and click '+ Add Songs' to add music!`
          );
        }
        setIsProcessing(false);
        return;
      } else if (customList.length === 0) {
        addAiMessage(
          "You haven't created any custom playlists yet! Go to the Playlists tab to create one."
        );
        setIsProcessing(false);
        return;
      }
    }

    // 14. ROMANTIC SONGS: "play romantic songs", "romantic songs", "romantic melody"
    if (
      /\b(?:romantic|love\s+songs|romantic\s+songs|romantic\s+melody|romantic\s+hits|romantic\s+paattu)\b/i.test(
        lower
      )
    ) {
      try {
        const res = await fetch("/api/music/search?q=" + encodeURIComponent("romantic melody songs hits"));
        const data = await res.json();
        if (data.success && data.tracks && data.tracks.length > 0) {
          playTrack(data.tracks[0], 0, data.tracks);
          addAiMessage(`💖 Playing romantic melody hits for you!`, "search", data.tracks[0]);
          setIsProcessing(false);
          return;
        }
      } catch {}
    }

    // 15. EXPLICIT SONG / ARTIST SEARCH:
    // Requires clear search or play intent prefix/suffix so casual talk NEVER searches random things!
    let searchTarget = "";

    // A. Explicit Mood keywords with play/music context
    if (/\b(?:lofi|lo-fi|chill\s+beats|study\s+music|sleep\s+music)\b/i.test(lower)) {
      searchTarget = "lo-fi chill beats relax";
    } else if (
      /\b(?:workout|gym|energy|power)\s*(?:music|songs|hits)?\b/i.test(lower) &&
      /\b(?:play|vekku|music|songs)\b/i.test(lower)
    ) {
      searchTarget = "gym workout energetic phonk hits";
    } else if (
      /\b(?:party|dance|club|dj)\s*(?:music|songs|hits)?\b/i.test(lower) &&
      /\b(?:play|vekku|music|songs)\b/i.test(lower)
    ) {
      searchTarget = "party dance music hits viral";
    } else if (
      /\b(?:sad|emotional)\s*(?:music|songs|acoustic)?\b/i.test(lower) &&
      /\b(?:play|vekku|music|songs)\b/i.test(lower)
    ) {
      searchTarget = "sad emotional acoustic songs";
    }

    // B. Prefix Patterns: "play <song>", "search <song>", "put on <song>", "listen to <song>"
    if (!searchTarget) {
      const playMatch = lower.match(/^(?:play|search|put\s+on|listen\s+to|start)\s+(.+)/i);
      const malMatch = lower.match(
        /(.+?)\s+(?:paattu\s+vekku|paatu\s+vekku|play\s+aakku|play\s+cheyyu|song\s+vekku|vekku|paadu)$/i
      );

      if (playMatch && playMatch[1]) {
        searchTarget = playMatch[1];
      } else if (malMatch && malMatch[1]) {
        searchTarget = malMatch[1];
      }
    }

    // If an explicit song search query was found:
    if (searchTarget) {
      searchTarget = searchTarget
        .replace(/\b(?:song|songs|music|paattu|paatu|track|please|now|official)\b/gi, "")
        .trim();

      if (searchTarget.length >= 2) {
        try {
          const res = await fetch(`/api/music/search?q=${encodeURIComponent(searchTarget)}`);
          const data = await res.json();

          if (data.success && data.tracks && data.tracks.length > 0) {
            const topTrack: MusicTrack = data.tracks[0];
            playTrack(topTrack, 0, data.tracks);
            addAiMessage(`🎵 Found and playing "${topTrack.title}"!`, "search", topTrack);
            setIsProcessing(false);
            return;
          } else {
            addAiMessage(`❌ Couldn't find songs for "${searchTarget}". Try another artist or title!`);
            setIsProcessing(false);
            return;
          }
        } catch (err) {
          console.error("Assistant search error:", err);
          addAiMessage(`⚠️ Could not search for "${searchTarget}". Please try again!`);
          setIsProcessing(false);
          return;
        }
      }
    }

    // 16. STRICT SAFEGUARD FOR CASUAL / CHUMMA TALK:
    // If the spoken text did NOT match any music command, DO NOT INTERRUPT CURRENT MUSIC!
    addAiMessage(
      "🤔 I only respond to music commands like 'Play romantic songs', 'Play liked music', 'Play my playlist', 'Change song', 'Volume 80%', or 'Pause'. Your music was not interrupted."
    );
    setIsProcessing(false);
  };

  const handleSendText = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!textInput.trim() || isProcessing) return;
    const cmd = textInput.trim();
    setTextInput("");
    handleExecuteCommand(cmd);
  };

  // Quick Action Chips
  const QUICK_CHIPS = [
    { label: "💖 Romantic Songs", cmd: "play romantic songs" },
    { label: "❤️ Liked Songs", cmd: "play liked music" },
    { label: "📁 My Playlist", cmd: "play my playlist" },
    { label: "⏭️ Next Song", cmd: "change song" },
    { label: "⏸️ Pause", cmd: "pause" },
    { label: "▶️ Resume", cmd: "resume" },
    { label: "🔊 Vol 80%", cmd: "volume 80" },
    { label: "🔥 Illuminati", cmd: "play Illuminati" },
    { label: "🌙 Chill Lo-Fi", cmd: "play lofi beats" },
    { label: "🔀 Shuffle", cmd: "shuffle" },
  ];

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center sm:items-end justify-center sm:justify-end p-3 sm:p-6 bg-black/60 sm:bg-transparent backdrop-blur-xs sm:backdrop-blur-none pointer-events-auto animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-sm sm:max-w-md bg-white/95 dark:bg-neutral-900/95 backdrop-blur-2xl border border-purple-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[600px] text-neutral-900 dark:text-white transition-all transform animate-in slide-in-from-bottom-6 duration-300 ring-1 ring-white/10"
      >
        {/* Glowing Top Rainbow Accent Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-purple-500 via-pink-500 via-emerald-400 to-indigo-500 animate-pulse" />

        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 via-pink-500 to-emerald-400 p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full bg-white dark:bg-neutral-900 rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-purple-500 animate-spin-slow" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="text-sm font-black text-neutral-900 dark:text-white leading-tight">
                  Kaelixo AI DJ
                </h3>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-extrabold uppercase tracking-wider">
                  Live
                </span>
              </div>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                Voice & Text Smart Controller
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {/* Change AI Voice Button */}
            <button
              type="button"
              onClick={() => setIsVoiceSettingsOpen(!isVoiceSettingsOpen)}
              className={`p-2 rounded-xl transition cursor-pointer ${
                isVoiceSettingsOpen
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-purple-500 hover:text-purple-400 hover:bg-purple-500/10"
              }`}
              title="Change AI Voice Sound & Tone"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            {/* Toggle Audio Voice Responses (TTS) */}
            <button
              type="button"
              onClick={() => setTtsEnabled(!ttsEnabled)}
              className={`p-2 rounded-xl transition cursor-pointer ${
                ttsEnabled
                  ? "text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
              title={ttsEnabled ? "Voice responses: ON (Click to mute)" : "Voice responses: MUTED"}
            >
              {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
              title="Close Assistant"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Voice Customization Settings Drawer */}
        {isVoiceSettingsOpen && (
          <div className="p-3.5 bg-neutral-100 dark:bg-neutral-800/90 border-b border-neutral-200 dark:border-neutral-700 space-y-2.5 animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                <span>AI Voice Personality</span>
              </span>
              <button
                type="button"
                onClick={() => speakText("Hey Prajin! I am your Kaelixo AI DJ. Testing my voice sound for you!")}
                className="text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center space-x-1 cursor-pointer"
              >
                <PlayCircle className="w-3 h-3" />
                <span>Test Voice Sample</span>
              </button>
            </div>

            {/* 3 Quick Personality Presets */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => selectVoicePersonality("natural_female")}
                className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                  voicePersonality === "natural_female"
                    ? "border-purple-500 bg-purple-500/20 text-purple-600 dark:text-purple-300 font-bold shadow-xs"
                    : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                }`}
              >
                <span className="text-base block">🌸</span>
                <span className="text-[10px] font-extrabold block leading-tight mt-0.5">Smooth</span>
                <span className="text-[9px] text-neutral-400 block">Natural Female</span>
              </button>

              <button
                type="button"
                onClick={() => selectVoicePersonality("cool_dj")}
                className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                  voicePersonality === "cool_dj"
                    ? "border-purple-500 bg-purple-500/20 text-purple-600 dark:text-purple-300 font-bold shadow-xs"
                    : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                }`}
              >
                <span className="text-base block">🎧</span>
                <span className="text-[10px] font-extrabold block leading-tight mt-0.5">Cool DJ</span>
                <span className="text-[9px] text-neutral-400 block">Deep Radio Bass</span>
              </button>

              <button
                type="button"
                onClick={() => selectVoicePersonality("desi_indian")}
                className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                  voicePersonality === "desi_indian"
                    ? "border-purple-500 bg-purple-500/20 text-purple-600 dark:text-purple-300 font-bold shadow-xs"
                    : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                }`}
              >
                <span className="text-base block">🇮🇳</span>
                <span className="text-[10px] font-extrabold block leading-tight mt-0.5">Desi</span>
                <span className="text-[9px] text-neutral-400 block">Indian English</span>
              </button>
            </div>

            {/* Dropdown for All Installed Voices */}
            {availableVoices.length > 0 && (
              <div>
                <label className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 block mb-1">
                  Device Voices ({availableVoices.filter((v) => v.lang.startsWith("en")).length} English):
                </label>
                <select
                  value={selectedVoiceName}
                  onChange={(e) => handleSelectSpecificVoice(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg text-[11px] text-neutral-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                >
                  {availableVoices
                    .filter((v) => v.lang.startsWith("en") || v.default)
                    .map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name} {/natural|online/i.test(v.name) ? "✨ (High Quality)" : ""}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Central Visualizer & Listening Orb */}
        <div className="p-4 bg-gradient-to-b from-purple-500/10 via-transparent to-transparent flex flex-col items-center justify-center border-b border-neutral-100 dark:border-neutral-800/60">
          <div className="relative flex items-center justify-center">
            {/* Pulsing glow rings when listening */}
            {isListening && (
              <>
                <div className="absolute w-24 h-24 rounded-full bg-purple-500/25 animate-ping" />
                <div className="absolute w-20 h-20 rounded-full bg-pink-500/20 animate-pulse" />
              </>
            )}

            {/* Main Interactive Mic Button */}
            <button
              type="button"
              onClick={toggleListening}
              style={{
                boxShadow: isListening
                  ? "0 0 25px rgba(168, 85, 247, 0.6)"
                  : "0 4px 14px rgba(0,0,0,0.1)",
              }}
              className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center transition duration-300 transform active:scale-95 cursor-pointer ${
                isListening
                  ? "bg-gradient-to-tr from-purple-600 to-pink-500 text-white scale-105"
                  : "bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-white border border-neutral-200 dark:border-neutral-700"
              }`}
              title={isListening ? "Listening... click to stop" : "Click to speak with AI"}
            >
              {isListening ? (
                <Mic className="w-7 h-7 text-white animate-pulse" />
              ) : (
                <Mic className="w-6 h-6 text-purple-500 dark:text-purple-400" />
              )}
            </button>
          </div>

          {/* Sound Wave Animation (While listening) */}
          {isListening ? (
            <div className="flex items-center space-x-1.5 mt-3 h-5">
              {[40, 75, 100, 60, 90, 45, 80].map((height, i) => (
                <div
                  key={i}
                  style={{
                    height: `${height}%`,
                    animationDuration: `${0.4 + (i % 3) * 0.2}s`,
                  }}
                  className="w-1 bg-gradient-to-t from-purple-500 to-emerald-400 rounded-full animate-bounce"
                />
              ))}
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 ml-2 animate-pulse">
                Listening...
              </span>
            </div>
          ) : isProcessing ? (
            <div className="flex items-center space-x-2 mt-3 text-xs font-bold text-emerald-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Processing command...</span>
            </div>
          ) : (
            <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mt-2.5">
              Tap mic & say <span className="text-purple-500 font-bold">"Play Aavesham"</span> or <span className="text-emerald-500 font-bold">"Volume 80"</span>
            </p>
          )}

          {/* Live Transcript Bubble */}
          {liveTranscript && (
            <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-xs font-semibold text-purple-600 dark:text-purple-300 animate-in fade-in max-w-full text-center truncate">
              "{liveTranscript}"
            </div>
          )}
        </div>

        {/* Conversation History Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[140px] text-xs">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-xs ${
                  msg.sender === "user"
                    ? "bg-purple-600 text-white rounded-tr-xs"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-tl-xs border border-neutral-200 dark:border-neutral-700/60"
                }`}
              >
                <p className="leading-relaxed">{msg.text}</p>

                {/* If command triggered a track play, render mini track card */}
                {msg.track && (
                  <div className="mt-2.5 p-2 rounded-xl bg-black/20 dark:bg-black/40 border border-white/10 flex items-center space-x-2.5">
                    <img
                      src={msg.track.thumbnail}
                      alt={msg.track.title}
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0 shadow-xs"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[11px] truncate text-white">
                        {msg.track.title}
                      </p>
                      <p className="text-[10px] text-white/70 truncate">
                        {msg.track.artist}
                      </p>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-black flex items-center justify-center flex-shrink-0">
                      <Play className="w-3 h-3 fill-current ml-0.5" />
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[9px] text-neutral-400 mt-1 px-1">
                {msg.timestamp}
              </span>
            </div>
          ))}
          <div ref={chatBottomRef} />
        </div>

        {/* Quick Suggestion Chips (Horizontal Scroll) */}
        <div className="px-3.5 py-2 border-t border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-950/40">
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pb-1">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleExecuteCommand(chip.cmd)}
                className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-neutral-200/80 hover:bg-neutral-300/80 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-[11px] font-semibold text-neutral-800 dark:text-neutral-200 transition cursor-pointer hover:scale-102 active:scale-98 flex-shrink-0"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Footer Input Bar */}
        <form
          onSubmit={handleSendText}
          className="p-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex items-center space-x-2"
        >
          <button
            type="button"
            onClick={toggleListening}
            className={`p-2.5 rounded-xl transition cursor-pointer flex-shrink-0 ${
              isListening
                ? "bg-purple-600 text-white animate-pulse"
                : "bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
            }`}
            title="Toggle Microphone"
          >
            {isListening ? <Mic className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4" />}
          </button>

          <input
            ref={inputRef}
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type 'volume 80', 'next', 'play lofi'..."
            className="flex-1 px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl text-base sm:text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
          />

          <button
            type="submit"
            disabled={!textInput.trim() || isProcessing}
            style={{
              backgroundColor: themeAccent,
              color: themeTextColor,
            }}
            className="p-2.5 rounded-xl disabled:opacity-40 transition cursor-pointer hover:brightness-110 flex-shrink-0 shadow-xs"
            title="Send command"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// Floating Trigger Pill Button for Global / Music View
export function AiAssistantTriggerButton({
  onClick,
  isOpen,
}: {
  onClick: () => void;
  isOpen: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        boxShadow: "0 4px 20px rgba(168, 85, 247, 0.4)",
      }}
      className={`fixed bottom-24 right-4 sm:bottom-8 sm:right-8 z-40 p-1 rounded-full bg-gradient-to-tr from-purple-600 via-pink-500 to-emerald-400 transition-all duration-300 transform hover:scale-108 active:scale-95 cursor-pointer group shadow-xl ${
        isOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"
      }`}
      title="Open AI Music Assistant [Ctrl+Shift+A]"
    >
      <div className="px-3.5 py-2 bg-neutral-950 rounded-full flex items-center space-x-2 border border-white/20">
        <div className="relative">
          <Sparkles className="w-4 h-4 text-purple-400 animate-spin-slow" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </div>
        <span className="text-xs font-extrabold text-white tracking-wide">
          AI DJ
        </span>
      </div>
    </button>
  );
}
