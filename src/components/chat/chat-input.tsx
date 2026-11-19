"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Smile,
  Paperclip,
  Code,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Pilcrow,
  Link2,
  ListOrdered,
  List,
  Quote,
  SquareCode,
  Plus,
  Type,
  AtSign,
  Mic,
  Slash,
  ChevronDown,
  SendHorizontal,
  Sparkles,
  X,
  File as FileIcon,
  FileText,
  FileCode,
  ImageIcon,
  Video as VideoIcon,
  Check,
  Loader2,
  UploadCloud,
  AlertCircle,
  Clipboard,
  Camera,
  Music,
} from "lucide-react";
import { Attachment, FileCategory, MusicTrack } from "@/types";
import {
  uploadAttachment,
  validateAttachment,
  formatFileSize,
  getFileCategory,
  isImageFile,
  isVideoFile,
  deleteAttachment,
} from "@/utils/storage";
import { EmojiPicker } from "./emoji-picker";

export interface StagedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  category: FileCategory;
  progress: number;
  status: "uploading" | "complete" | "error";
  attachment?: Attachment;
  error?: string;
  previewUrl?: string;
}

interface ChatInputProps {
  channelId?: string;
  channelName: string;
  isDm?: boolean;
  recipientName?: string;
  onSendMessage: (content: string, attachments?: Attachment[]) => void | Promise<void>;
  externalText?: string;
  onClearExternalText?: () => void;
  disabled?: boolean;
}

export function ChatInput({
  channelId = "general",
  channelName,
  isDm = false,
  recipientName,
  onSendMessage,
  externalText,
  onClearExternalText,
  disabled = false,
}: ChatInputProps) {
  const [content, setContent] = useState("");
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [stagedTrack, setStagedTrack] = useState<MusicTrack | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isMusicDragging, setIsMusicDragging] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFormatting, setShowFormatting] = useState(false);
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mobileTextareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef<number>(0);
  const stagedFilesRef = useRef<StagedFile[]>([]);
  stagedFilesRef.current = stagedFiles;

  // Listen for global music staging events (e.g. from Drag & Drop or Share to Chat)
  useEffect(() => {
    // Check initial staged track from window or sessionStorage
    if (typeof window !== "undefined") {
      const windowTrack = (window as any).__stagedMusicTrack;
      if (windowTrack) {
        setStagedTrack(windowTrack);
        (window as any).__stagedMusicTrack = null;
        sessionStorage.removeItem("kaelixo-staged-music-track");
      } else {
        const stored = sessionStorage.getItem("kaelixo-staged-music-track");
        if (stored) {
          try {
            setStagedTrack(JSON.parse(stored));
            sessionStorage.removeItem("kaelixo-staged-music-track");
          } catch {}
        }
      }
    }

    const handleStageTrack = (e: Event) => {
      const customEvent = e as CustomEvent<MusicTrack>;
      if (customEvent.detail) {
        setStagedTrack(customEvent.detail);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
          } else if (mobileTextareaRef.current) {
            mobileTextareaRef.current.focus();
          }
        }, 50);
      }
    };

    window.addEventListener("kaelixo:stage-music-track", handleStageTrack);
    return () => {
      window.removeEventListener("kaelixo:stage-music-track", handleStageTrack);
    };
  }, [channelId]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const audioFile = new File(
            [audioBlob],
            `voice-note-${Date.now()}.webm`,
            { type: "audio/webm" }
          );
          await processAndUploadFile(audioFile);
        }
      };

      mediaRecorder.start();
      setIsRecordingVoice(true);
      setRecordingSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.warn("Microphone access unavailable or denied:", err);
      alert("Microphone access could not be initialized. Please check browser microphone permissions.");
    }
  };

  const stopVoiceRecording = (cancel = false) => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      if (cancel) {
        audioChunksRef.current = [];
      }
      mediaRecorderRef.current.stop();
    }
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
  };

  // Cleanup object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      stagedFilesRef.current.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, []);

  // Sync external template text if applied from department toolbar
  useEffect(() => {
    if (externalText) {
      setContent((prev) => (prev ? `${prev}\n\n${externalText}` : externalText));
      if (onClearExternalText) onClearExternalText();
      textareaRef.current?.focus();
    }
  }, [externalText, onClearExternalText]);

  // Auto-resize textarea to expand smoothly with multi-line text up to max height, then scroll (Slack-parity)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const nextHeight = Math.min(Math.max(textareaRef.current.scrollHeight, 40), 240);
      textareaRef.current.style.height = `${nextHeight}px`;
    }
    if (mobileTextareaRef.current) {
      mobileTextareaRef.current.style.height = "auto";
      const nextMobileHeight = Math.min(Math.max(mobileTextareaRef.current.scrollHeight, 28), 144);
      mobileTextareaRef.current.style.height = `${nextMobileHeight}px`;
    }
  }, [content]);

  // Upload single file and track progress
  const processAndUploadFile = useCallback(
    async (file: File) => {
      const stageId = `stage-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const category = getFileCategory(file.type || "", file.name);
      const isImg = isImageFile(file.type || "");
      const isVid = isVideoFile(file.type || "");
      const previewUrl = isImg || isVid ? URL.createObjectURL(file) : undefined;

      // Initial validation check
      try {
        validateAttachment(file);
      } catch (valErr: any) {
        setStagedFiles((prev) => [
          ...prev,
          {
            id: stageId,
            file,
            name: file.name,
            size: file.size,
            type: file.type || "application/octet-stream",
            category,
            progress: 0,
            status: "error",
            error: valErr.message || "Invalid file",
            previewUrl,
          },
        ]);
        return;
      }

      // Add to staging in uploading state
      const initialItem: StagedFile = {
        id: stageId,
        file,
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        category,
        progress: 0,
        status: "uploading",
        previewUrl,
      };

      setStagedFiles((prev) => [...prev, initialItem]);

      try {
        const attachment = await uploadAttachment(file, channelId, (percent) => {
          setStagedFiles((prev) =>
            prev.map((item) =>
              item.id === stageId ? { ...item, progress: percent } : item
            )
          );
        });

        setStagedFiles((prev) =>
          prev.map((item) =>
            item.id === stageId
              ? { ...item, status: "complete", progress: 100, attachment }
              : item
          )
        );
      } catch (err: any) {
        setStagedFiles((prev) =>
          prev.map((item) =>
            item.id === stageId
              ? {
                  ...item,
                  status: "error",
                  error: err.message || "Upload failed",
                }
              : item
          )
        );
      }
    },
    [channelId]
  );

  const handleFilesAdded = useCallback(
    (files: File[]) => {
      if (!files || files.length === 0) return;
      files.forEach((file) => processAndUploadFile(file));
    },
    [processAndUploadFile]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesAdded(Array.from(e.target.files));
      e.target.value = ""; // Reset so identical file can be selected again
    }
  };

  const handleRemoveStagedFile = (id: string) => {
    setStagedFiles((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      if (target?.attachment?.storagePath) {
        deleteAttachment(target.attachment.storagePath).catch(() => {});
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    const isTrack = e.dataTransfer.types.includes("application/x-kaelixo-track");
    if (isTrack) {
      setIsMusicDragging(true);
      setIsDragging(true);
      return;
    }
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
      setIsMusicDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    if (e.dataTransfer.types.includes("application/x-kaelixo-track")) {
      setIsMusicDragging(true);
      setIsDragging(true);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    setIsMusicDragging(false);

    // 1. Check for Kaelixo Track
    const rawTrack = e.dataTransfer.getData("application/x-kaelixo-track");
    if (rawTrack) {
      try {
        const track = JSON.parse(rawTrack) as MusicTrack;
        setStagedTrack(track);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
          } else if (mobileTextareaRef.current) {
            mobileTextareaRef.current.focus();
          }
        }, 50);
        return;
      } catch (err) {
        console.warn("Failed to parse dragged track:", err);
      }
    }

    // 2. Check for Files
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(Array.from(e.dataTransfer.files));
    }
  };

  // Clipboard paste support (e.g. screenshot paste from mobile & desktop)
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files: File[] = [];

    // 1. Check clipboardData.files (desktop Chrome, Edge, Firefox)
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      for (let i = 0; i < e.clipboardData.files.length; i++) {
        const f = e.clipboardData.files[i];
        if (f.type.startsWith("image/") || f.size > 0) {
          files.push(f);
        }
      }
    }

    // 2. Check clipboardData.items (Crucial for Android/iOS mobile keyboard paste & screenshots)
    if (e.clipboardData.items && e.clipboardData.items.length > 0) {
      for (let i = 0; i < e.clipboardData.items.length; i++) {
        const item = e.clipboardData.items[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            const ext = item.type.split("/")[1] || "png";
            const namedFile =
              file.name && file.name !== "image.png"
                ? file
                : new File([file], `screenshot_${Date.now()}.${ext}`, { type: file.type });
            if (!files.some((f) => f.name === namedFile.name && f.size === namedFile.size)) {
              files.push(namedFile);
            }
          }
        }
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      handleFilesAdded(files);
    }
  };

  // Direct Mobile / Button Clipboard Paste (WhatsApp / Slack style "Paste Screenshot")
  const handlePasteScreenshot = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.read) {
        const clipboardItems = await navigator.clipboard.read();
        const files: File[] = [];
        for (const item of clipboardItems) {
          for (const type of item.types) {
            if (type.startsWith("image/")) {
              const blob = await item.getType(type);
              const ext = type.split("/")[1] || "png";
              const file = new File([blob], `screenshot_${Date.now()}.${ext}`, { type });
              files.push(file);
            }
          }
        }
        if (files.length > 0) {
          handleFilesAdded(files);
          return;
        }
      }
    } catch (err) {
      console.warn("Clipboard read permission or data unavailable:", err);
    }
    // Fallback: trigger file input directly for instant selection of screenshot
    fileInputRef.current?.click();
  };

  // Window-level paste listener for instant screenshot pasting
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.tagName === "INPUT") return;
      if (
        target &&
        target.tagName === "TEXTAREA" &&
        target !== textareaRef.current &&
        target !== mobileTextareaRef.current
      ) {
        return;
      }

      const files: File[] = [];
      if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
        for (let i = 0; i < e.clipboardData.files.length; i++) {
          const f = e.clipboardData.files[i];
          if (f.type.startsWith("image/") || f.size > 0) files.push(f);
        }
      }
      if (e.clipboardData?.items && e.clipboardData.items.length > 0) {
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          const item = e.clipboardData.items[i];
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) {
              const ext = item.type.split("/")[1] || "png";
              const namedFile =
                file.name && file.name !== "image.png"
                  ? file
                  : new File([file], `screenshot_${Date.now()}.${ext}`, { type: file.type });
              if (!files.some((f) => f.name === namedFile.name && f.size === namedFile.size)) {
                files.push(namedFile);
              }
            }
          }
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        handleFilesAdded(files);
      }
    };

    window.addEventListener("paste", handleGlobalPaste);
    return () => window.removeEventListener("paste", handleGlobalPaste);
  }, [handleFilesAdded]);

  // Standalone and text sending conditions
  const isAnyUploading = stagedFiles.some((f) => f.status === "uploading");
  const completedAttachments = stagedFiles
    .filter((f) => f.status === "complete" && f.attachment)
    .map((f) => f.attachment!);
  const hasText = content.trim().length > 0;
  const hasAttachments = completedAttachments.length > 0;
  const hasTrack = Boolean(stagedTrack);
  const canSend = !isAnyUploading && (hasText || hasAttachments || hasTrack) && !disabled;

  const handleSend = () => {
    if (!canSend) return;

    let finalContent = content.trim();
    if (stagedTrack) {
      const shareUrl = stagedTrack.url || `https://www.youtube.com/watch?v=${stagedTrack.id}`;
      if (!finalContent) {
        finalContent = `🎶 Sharing song: **${stagedTrack.title}** by *${stagedTrack.artist}*\n${shareUrl}`;
      } else {
        finalContent = `${finalContent}\n\n🎶 **${stagedTrack.title}** — ${stagedTrack.artist}\n${shareUrl}`;
      }
    }

    onSendMessage(
      finalContent,
      completedAttachments.length > 0 ? completedAttachments : undefined
    );

    // Clean up previews
    stagedFiles.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });

    setContent("");
    setStagedTrack(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    if (mobileTextareaRef.current) {
      mobileTextareaRef.current.style.height = "auto";
    }
    setStagedFiles([]);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) {
        handleSend();
      }
    }
  };

  const insertFormatting = (
    prefix: string,
    suffix: string = prefix,
    defaultPlaceholder: string = "text"
  ) => {
    const textarea = textareaRef.current || mobileTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);
    const textToWrap = selected || defaultPlaceholder;

    const replacement = `${prefix}${textToWrap}${suffix}`;
    const newContent =
      content.substring(0, start) + replacement + content.substring(end);

    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + textToWrap.length
      );
    }, 50);
  };

  const handleInsertLink = () => {
    const url = prompt("Enter link URL (e.g. https://example.com):", "https://");
    if (url) {
      insertFormatting("[", `](${url})`, "link title");
    }
  };

  const handleInsertEmoji = (emoji: string) => {
    const textarea = textareaRef.current || mobileTextareaRef.current;
    if (!textarea) {
      setContent((prev) => prev + emoji);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = content.substring(0, start) + emoji + content.substring(end);
    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const renderCategoryIcon = (category: FileCategory) => {
    switch (category) {
      case "image":
        return <ImageIcon className="w-5 h-5 text-indigo-500" />;
      case "video":
        return <VideoIcon className="w-5 h-5 text-purple-500" />;
      case "pdf":
        return <FileText className="w-5 h-5 text-rose-500" />;
      case "code":
        return <FileCode className="w-5 h-5 text-emerald-500" />;
      default:
        return <FileIcon className="w-5 h-5 text-sky-500" />;
    }
  };

  const isDirectMessage = isDm || channelName.startsWith("@") || Boolean(recipientName);
  const rawTargetName = recipientName || channelName;
  const cleanName = rawTargetName.replace(/^[#@]+/, "").trim();
  const placeholderText = isDirectMessage
    ? `Message ${cleanName}`
    : `Message #${cleanName}`;

  return (
    <div
      className="p-2 md:p-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/70 relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        multiple
        className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.json,.zip,.md,.py,.js,.ts"
        aria-label="Upload file attachments"
      />
      <input
        type="file"
        ref={videoInputRef}
        onChange={handleFileInputChange}
        className="hidden"
        accept="video/*"
        aria-label="Upload video attachment"
      />

      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div
          className={`absolute inset-2 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center z-30 backdrop-blur-xs pointer-events-none transition-all ${
            isMusicDragging
              ? "bg-purple-500/15 dark:bg-purple-500/25 border-purple-500"
              : "bg-indigo-500/10 dark:bg-indigo-500/20 border-indigo-500"
          }`}
        >
          {isMusicDragging ? (
            <>
              <Music className="w-9 h-9 text-purple-600 dark:text-purple-400 animate-bounce mb-1" />
              <p className="font-bold text-sm text-purple-700 dark:text-purple-300">
                Drop song to share in #{cleanName}
              </p>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                Team members will be able to play live in chat or jam synchronously
              </p>
            </>
          ) : (
            <>
              <UploadCloud className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-bounce mb-1" />
              <p className="font-semibold text-sm text-indigo-700 dark:text-indigo-300">
                Drop files here to upload to #{cleanName}
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Images, videos, PDFs, documents, or code (up to 25 MB)
              </p>
            </>
          )}
        </div>
      )}

      {/* =========================================================================
          MOBILE COMPOSER (md:hidden) - Exact Slack mobile layout matching Screenshot
          ========================================================================= */}
      <div className="md:hidden flex flex-col space-y-1.5">
        {/* Voice recording strip on mobile */}
        {isRecordingVoice && (
          <div className="flex items-center justify-between bg-rose-950/80 border border-rose-800/80 px-3 py-2 rounded-xl text-white shadow-lg animate-in fade-in">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-mono font-bold text-rose-300">
                {Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, "0")}
              </span>
              <span className="text-xs text-rose-200">Recording voice note...</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => stopVoiceRecording(false)}
                className="p-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white transition cursor-pointer"
                title="Send voice note"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => stopVoiceRecording(true)}
                className="p-1.5 bg-neutral-800 hover:bg-rose-600 rounded-lg text-neutral-300 hover:text-white transition cursor-pointer"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Staged Music Track on mobile */}
        {stagedTrack && (
          <div className="flex items-center justify-between p-2 mx-1 rounded-xl bg-purple-500/10 dark:bg-purple-950/40 border border-purple-500/30 text-xs animate-in fade-in">
            <div className="flex items-center space-x-2 min-w-0">
              <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-black flex-shrink-0 shadow-xs">
                <img src={stagedTrack.thumbnail} alt={stagedTrack.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Music className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-xs text-neutral-900 dark:text-white truncate">
                  {stagedTrack.title}
                </p>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                  {stagedTrack.artist} • {stagedTrack.durationFormatted || "3:30"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStagedTrack(null)}
              className="p-1 rounded-lg text-neutral-400 hover:text-rose-500 cursor-pointer"
              title="Remove song"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Staged files on mobile */}
        {stagedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 py-1 px-1 max-h-24 overflow-y-auto no-scrollbar">
            {stagedFiles.map((item) => (
              <div
                key={item.id}
                className="flex items-center space-x-1.5 px-2 py-1 rounded-xl bg-neutral-100 dark:bg-[#1e2227] border border-neutral-200 dark:border-[#2d3239] text-xs text-neutral-800 dark:text-neutral-200 shadow-xs"
              >
                {item.previewUrl && item.category === "image" ? (
                  <img src={item.previewUrl} alt={item.name} className="w-5 h-5 rounded object-cover" />
                ) : (
                  renderCategoryIcon(item.category)
                )}
                <span className="truncate max-w-[110px] text-[11px]">{item.name}</span>
                {item.status === "uploading" && <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />}
                {item.status === "complete" && <Check className="w-3 h-3 text-emerald-400" />}
                <button
                  type="button"
                  onClick={() => handleRemoveStagedFile(item.id)}
                  className="text-neutral-400 hover:text-rose-400 cursor-pointer ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Collapsible Mobile Formatting Bar (Toggled via Aa button) */}
        {showFormatting && (
          <div className="flex items-center space-x-1 py-1.5 px-2 bg-neutral-100 dark:bg-[#1a1d21] border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-x-auto no-scrollbar text-neutral-700 dark:text-neutral-300 shadow-md">
            <button
              type="button"
              onClick={() => insertFormatting("**", "**", "bold text")}
              className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg transition cursor-pointer"
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("*", "*", "italic text")}
              className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg transition cursor-pointer"
              title="Italic"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("<u>", "</u>", "underline text")}
              className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg transition cursor-pointer"
              title="Underline"
            >
              <Underline className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("~", "~", "strikethrough text")}
              className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg transition cursor-pointer"
              title="Strikethrough"
            >
              <Strikethrough className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("`", "`", "code")}
              className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg transition cursor-pointer"
              title="Code"
            >
              <Code className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("```\n", "\n```", "code block")}
              className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg transition cursor-pointer"
              title="Code Block"
            >
              <SquareCode className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("> ", "", "quote")}
              className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg transition cursor-pointer"
              title="Quote"
            >
              <Quote className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("• ", "", "list item")}
              className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg transition cursor-pointer"
              title="Bullet"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleInsertLink}
              className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg transition cursor-pointer"
              title="Link"
            >
              <Link2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Mobile Input Row matching Slack Mobile Screenshot */}
        <div className="relative flex items-center bg-neutral-100 dark:bg-[#1a1d21] border border-neutral-200 dark:border-neutral-800/90 rounded-2xl px-2 py-1 shadow-xs focus-within:border-indigo-500 dark:focus-within:border-neutral-700">
          {/* Left Slack-Style Quick Action Buttons */}
          <div className="flex items-center space-x-1.5 text-neutral-500 dark:text-neutral-400 flex-shrink-0">
            {/* (+) Add Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-800/90 hover:bg-neutral-300 dark:hover:bg-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-300 transition active:scale-95 cursor-pointer"
              title="Add attachment"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>

            {/* Aa Rich Text Format Toggle */}
            <button
              type="button"
              onClick={() => setShowFormatting(!showFormatting)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs tracking-tight transition cursor-pointer ${
                showFormatting
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-600/40"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              }`}
              title="Formatting"
            >
              Aa
            </button>

            {/* 😊 Emoji Selector */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition cursor-pointer ${
                showEmojiPicker
                  ? "text-emerald-500 dark:text-emerald-400"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              }`}
              title="Emoji"
            >
              <Smile className="w-4 h-4" />
            </button>

            {/* @ Mention */}
            <button
              type="button"
              onClick={() => insertFormatting("@", "", "colleague")}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition cursor-pointer"
              title="Mention"
            >
              <AtSign className="w-4 h-4" />
            </button>

            {/* [/] Slash Commands / Shortcuts */}
            <button
              type="button"
              onClick={() => {
                setContent((prev) => (prev.startsWith("/") ? prev : "/" + prev));
                mobileTextareaRef.current?.focus();
              }}
              className="w-5 h-5 rounded border border-neutral-300 dark:border-neutral-600/80 flex items-center justify-center text-[10px] font-mono font-bold text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition cursor-pointer"
              title="Shortcuts"
            >
              /
            </button>

            {/* 📋 Paste Screenshot (WhatsApp / Slack mobile style) */}
            <button
              type="button"
              onClick={handlePasteScreenshot}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 active:scale-95 transition cursor-pointer"
              title="Paste screenshot from clipboard"
            >
              <Clipboard className="w-4 h-4" />
            </button>
          </div>

          {/* Center: Message Textarea */}
          <div className="flex-1 min-w-0 px-2 py-0.5">
            <textarea
              ref={mobileTextareaRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (mobileTextareaRef.current) {
                  mobileTextareaRef.current.style.height = "auto";
                  const nextH = Math.min(Math.max(mobileTextareaRef.current.scrollHeight, 28), 144);
                  mobileTextareaRef.current.style.height = `${nextH}px`;
                }
              }}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={placeholderText}
              rows={1}
              disabled={disabled}
              className="w-full bg-transparent text-[14px] leading-snug text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none resize-none font-sans min-h-[28px] max-h-36 overflow-y-auto custom-scrollbar py-1"
            />
          </div>

          {/* Right: Paper Airplane Send Button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition flex-shrink-0 cursor-pointer ${
              canSend
                ? "bg-[#007a5a] text-white hover:bg-[#00664b] active:scale-95 shadow-xs"
                : "text-neutral-500 cursor-not-allowed opacity-40"
            }`}
            title="Send"
          >
            {isAnyUploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <SendHorizontal className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Mobile Emoji Popover */}
          {showEmojiPicker && (
            <div className="absolute bottom-full left-0 mb-2 z-50">
              <EmojiPicker
                onSelectEmoji={handleInsertEmoji}
                onClose={() => setShowEmojiPicker(false)}
              />
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          DESKTOP COMPOSER (hidden md:block) - Enterprise Slack Rich Experience
          ========================================================================= */}
      <div className="hidden md:block relative rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition shadow-xs">
        {/* Slack-Grade Top Rich Text Formatting Toolbar */}
        {showFormatting && (
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-200 dark:border-neutral-700/60 text-neutral-500 dark:text-neutral-400 bg-neutral-100/40 dark:bg-neutral-800/40 rounded-t-2xl">
            <div className="flex items-center space-x-0.5 sm:space-x-1 overflow-x-auto no-scrollbar">
              {/* Bold */}
              <button
                type="button"
                onClick={() => insertFormatting("**", "**", "bold text")}
                className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition cursor-pointer text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white"
                title="Bold (Ctrl+B)"
              >
                <Bold className="w-4 h-4" />
              </button>

              {/* Italic */}
              <button
                type="button"
                onClick={() => insertFormatting("*", "*", "italic text")}
                className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition cursor-pointer text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white"
                title="Italic (Ctrl+I)"
              >
                <Italic className="w-4 h-4" />
              </button>

              {/* Underline */}
              <button
                type="button"
                onClick={() => insertFormatting("<u>", "</u>", "underline text")}
                className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition cursor-pointer text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white"
                title="Underline (Ctrl+U)"
              >
                <Underline className="w-4 h-4" />
              </button>

              {/* Strikethrough */}
              <button
                type="button"
                onClick={() => insertFormatting("~", "~", "strikethrough text")}
                className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition cursor-pointer text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white"
                title="Strikethrough"
              >
                <Strikethrough className="w-4 h-4" />
              </button>

              {/* Heading / Paragraph */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowHeadingMenu(!showHeadingMenu)}
                  className="flex items-center space-x-0.5 p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition cursor-pointer text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white"
                  title="Headings & Paragraph (¶)"
                >
                  <Pilcrow className="w-4 h-4" />
                  <ChevronDown className="w-2.5 h-2.5" />
                </button>
                {showHeadingMenu && (
                  <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl py-1 w-36 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        insertFormatting("# ", "", "Large Heading");
                        setShowHeadingMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 font-bold"
                    >
                      Heading 1
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        insertFormatting("## ", "", "Medium Heading");
                        setShowHeadingMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 font-semibold"
                    >
                      Heading 2
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        insertFormatting("### ", "", "Small Heading");
                        setShowHeadingMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 font-medium"
                    >
                      Heading 3
                    </button>
                  </div>
                )}
              </div>

              <span className="h-4 w-[1px] bg-neutral-300 dark:bg-neutral-700 mx-1" />

              {/* Link */}
              <button
                type="button"
                onClick={handleInsertLink}
                className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition cursor-pointer text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white"
                title="Add link"
              >
                <Link2 className="w-4 h-4" />
              </button>

              {/* Numbered List */}
              <button
                type="button"
                onClick={() => insertFormatting("1. ", "", "List item")}
                className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition cursor-pointer text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white"
                title="Ordered list"
              >
                <ListOrdered className="w-4 h-4" />
              </button>

              {/* Bulleted List */}
              <button
                type="button"
                onClick={() => insertFormatting("• ", "", "List item")}
                className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition cursor-pointer text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white"
                title="Bulleted list"
              >
                <List className="w-4 h-4" />
              </button>

              {/* Blockquote */}
              <button
                type="button"
                onClick={() => insertFormatting("> ", "", "Quote text")}
                className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition cursor-pointer text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white"
                title="Quote"
              >
                <Quote className="w-4 h-4" />
              </button>

              {/* Inline Code */}
              <button
                type="button"
                onClick={() => insertFormatting("`", "`", "code")}
                className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition cursor-pointer text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white"
                title="Inline code"
              >
                <Code className="w-4 h-4" />
              </button>

              {/* Code Block */}
              <button
                type="button"
                onClick={() => insertFormatting("```\n", "\n```", "code block")}
                className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition cursor-pointer text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white"
                title="Code block"
              >
                <SquareCode className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            if (textareaRef.current) {
              textareaRef.current.style.height = "auto";
              const nextH = Math.min(Math.max(textareaRef.current.scrollHeight, 40), 240);
              textareaRef.current.style.height = `${nextH}px`;
            }
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholderText}
          rows={1}
          disabled={disabled}
          className="w-full bg-transparent px-3 py-2 sm:py-2.5 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none resize-none font-sans min-h-[40px] max-h-60 overflow-y-auto custom-scrollbar leading-relaxed"
        />

        {/* Staged Music Track on desktop */}
        {stagedTrack && (
          <div className="flex items-center justify-between px-3.5 py-2 mx-3 my-1.5 rounded-xl bg-purple-500/10 dark:bg-purple-950/40 border border-purple-500/30 text-xs shadow-xs animate-in fade-in">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-black flex-shrink-0 shadow-md">
                <img src={stagedTrack.thumbnail} alt={stagedTrack.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Music className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-600 text-white shadow-xs">
                    🎵 Song Attached
                  </span>
                  <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                    {stagedTrack.durationFormatted || "3:30"}
                  </span>
                  <span className="text-neutral-400">•</span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    Interactive Player Ready
                  </span>
                </div>
                <p className="font-bold text-sm text-neutral-900 dark:text-white truncate mt-0.5">
                  {stagedTrack.title}
                </p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
                  {stagedTrack.artist}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStagedTrack(null)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-500 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition cursor-pointer"
              title="Remove song"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* File Attachments Staging Area */}
        {stagedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3 py-2 border-t border-neutral-200/60 dark:border-neutral-700/50 bg-neutral-100/50 dark:bg-neutral-800/40 max-h-40 overflow-y-auto custom-scrollbar">
            {stagedFiles.map((item) => (
              <div
                key={item.id}
                className={`relative group flex items-center space-x-2.5 px-2.5 py-1.5 rounded-xl border transition shadow-xs max-w-[240px] ${
                  item.status === "error"
                    ? "bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800"
                    : "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                }`}
              >
                {/* Thumbnail or Category Icon */}
                {item.previewUrl && item.category === "image" ? (
                  <img
                    src={item.previewUrl}
                    alt={item.name}
                    className="w-8 h-8 rounded-lg object-cover flex-shrink-0 bg-neutral-100 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-700"
                  />
                ) : item.previewUrl && item.category === "video" ? (
                  <video
                    src={item.previewUrl}
                    className="w-8 h-8 rounded-lg object-cover flex-shrink-0 bg-black border border-neutral-700"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-700/60 flex items-center justify-center flex-shrink-0">
                    {renderCategoryIcon(item.category)}
                  </div>
                )}

                {/* Name, Size & Progress Info */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center justify-between space-x-1">
                    <p
                      className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate"
                      title={item.name}
                    >
                      {item.name}
                    </p>
                    {item.status === "complete" && (
                      <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    )}
                  </div>

                  <p className="text-[10px] text-neutral-400">
                    {formatFileSize(item.size)}
                    {item.status === "uploading" && ` • ${item.progress}%`}
                  </p>

                  {/* Progress Bar */}
                  {item.status === "uploading" && (
                    <div className="w-full h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all duration-150"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}

                  {/* Error Indicator */}
                  {item.status === "error" && (
                    <div
                      className="flex items-center space-x-1 text-[10px] text-rose-500 mt-0.5 truncate"
                      title={item.error}
                    >
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{item.error || "Upload failed"}</span>
                    </div>
                  )}
                </div>

                {/* Remove Staged Item Button */}
                <button
                  type="button"
                  onClick={() => handleRemoveStagedFile(item.id)}
                  className="p-1 text-neutral-400 hover:text-rose-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition cursor-pointer"
                  title="Remove attachment"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Desktop Bottom Actions Bar */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-neutral-200/50 dark:border-neutral-700/40">
          <div className="relative flex items-center space-x-1.5">
            {/* + Add Attachment / Media */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition cursor-pointer"
              title="Add attachment, photo, or document (+)"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* 📋 Paste Screenshot / Image */}
            <button
              type="button"
              onClick={handlePasteScreenshot}
              className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
              title="Paste screenshot from clipboard [Ctrl+V]"
            >
              <Clipboard className="w-4 h-4" />
            </button>

            {/* Aa Toggle Formatting Bar */}
            <button
              type="button"
              onClick={() => setShowFormatting(!showFormatting)}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                showFormatting
                  ? "bg-neutral-200 dark:bg-neutral-700 text-indigo-600 dark:text-indigo-400 font-bold"
                  : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60"
              }`}
              title="Hide / show text formatting (Aa)"
            >
              <Type className="w-4 h-4" />
            </button>

            {/* Emoji Picker */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                showEmojiPicker
                  ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400"
                  : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60"
              }`}
              title="Add Emoji"
            >
              <Smile className="w-4 h-4" />
            </button>

            {/* @ Mention */}
            <button
              type="button"
              onClick={() => {
                insertFormatting("@", "", "colleague");
              }}
              className="p-1.5 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 rounded-lg transition cursor-pointer"
              title="Mention a colleague (@)"
            >
              <AtSign className="w-4 h-4" />
            </button>

            {/* 📹 Video Clip */}
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className="inline-flex p-1.5 text-neutral-500 hover:text-purple-600 dark:text-neutral-400 dark:hover:text-purple-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 rounded-lg transition cursor-pointer"
              title="Record or upload video clip"
            >
              <VideoIcon className="w-4 h-4" />
            </button>

            {/* 🎙️ Voice Recording */}
            {isRecordingVoice ? (
              <div className="flex items-center space-x-2 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 px-2.5 py-1 rounded-xl">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span className="text-xs font-mono font-semibold text-rose-600 dark:text-rose-300">
                  {Math.floor(recordingSeconds / 60)}:
                  {String(recordingSeconds % 60).padStart(2, "0")}
                </span>
                <button
                  type="button"
                  onClick={() => stopVoiceRecording(false)}
                  className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition cursor-pointer"
                  title="Send voice note"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => stopVoiceRecording(true)}
                  className="p-1 bg-neutral-200 dark:bg-neutral-700 hover:bg-rose-600 text-neutral-600 dark:text-neutral-300 hover:text-white rounded-lg transition cursor-pointer"
                  title="Cancel voice recording"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={startVoiceRecording}
                className="p-1.5 text-neutral-500 hover:text-rose-500 dark:text-neutral-400 dark:hover:text-rose-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 rounded-lg transition cursor-pointer"
                title="Record audio voice note"
              >
                <Mic className="w-4 h-4" />
              </button>
            )}

            <span className="inline-block h-4 w-[1px] bg-neutral-300 dark:bg-neutral-700 mx-0.5" />

            {/* [/] Slash Commands */}
            <button
              type="button"
              onClick={() => {
                setContent((prev) => (prev.startsWith("/") ? prev : "/" + prev));
                textareaRef.current?.focus();
              }}
              className="inline-flex p-1.5 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 rounded-lg transition cursor-pointer"
              title="Run a shortcut or slash command (/)"
            >
              <Slash className="w-4 h-4" />
            </button>

            {/* Categorized Emoji Popover */}
            {showEmojiPicker && (
              <div className="absolute bottom-full left-0 mb-2 z-40">
                <EmojiPicker
                  onSelectEmoji={handleInsertEmoji}
                  onClose={() => setShowEmojiPicker(false)}
                />
              </div>
            )}
          </div>

          {/* Right Side: Desktop Send Button with shortcut */}
          <div className="flex items-center space-x-2.5">
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 select-none hidden sm:inline">
              <kbd className="font-sans font-medium text-neutral-600 dark:text-neutral-300">Shift + Enter</kbd> to add a new line
            </span>
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition shadow-xs cursor-pointer ${
                canSend
                  ? "bg-[#007a5a] hover:bg-[#00664b] text-white active:scale-95 shadow-sm"
                  : "bg-neutral-200 dark:bg-neutral-700/60 text-neutral-400 dark:text-neutral-500 cursor-not-allowed"
              }`}
              title="Send message (Enter)"
            >
              {isAnyUploading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <SendHorizontal className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
