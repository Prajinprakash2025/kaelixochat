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
} from "lucide-react";
import { Attachment, FileCategory } from "@/types";
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
  const [isDragging, setIsDragging] = useState(false);
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
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(Array.from(e.dataTransfer.files));
    }
  };

  // Clipboard paste support (e.g. screenshot paste)
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      e.preventDefault();
      handleFilesAdded(Array.from(e.clipboardData.files));
    }
  };

  // Standalone and text sending conditions
  const isAnyUploading = stagedFiles.some((f) => f.status === "uploading");
  const completedAttachments = stagedFiles
    .filter((f) => f.status === "complete" && f.attachment)
    .map((f) => f.attachment!);
  const hasText = content.trim().length > 0;
  const hasAttachments = completedAttachments.length > 0;
  const canSend = !isAnyUploading && (hasText || hasAttachments) && !disabled;

  const handleSend = () => {
    if (!canSend) return;

    onSendMessage(
      content.trim(),
      completedAttachments.length > 0 ? completedAttachments : undefined
    );

    // Clean up previews
    stagedFiles.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });

    setContent("");
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
      className="p-2 md:p-4 border-t border-[#1e2227] md:border-neutral-200 md:dark:border-neutral-800 bg-[#121517] md:bg-white md:dark:bg-neutral-900/70 relative"
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
        <div className="absolute inset-2 bg-indigo-500/10 dark:bg-indigo-500/20 border-2 border-dashed border-indigo-500 rounded-2xl flex flex-col items-center justify-center z-30 backdrop-blur-xs pointer-events-none transition-all">
          <UploadCloud className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-bounce mb-1" />
          <p className="font-semibold text-sm text-indigo-700 dark:text-indigo-300">
            Drop files here to upload to #{cleanName}
          </p>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            Images, videos, PDFs, documents, or code (up to 25 MB)
          </p>
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

        {/* Staged files on mobile */}
        {stagedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 py-1 px-1 max-h-24 overflow-y-auto no-scrollbar">
            {stagedFiles.map((item) => (
              <div
                key={item.id}
                className="flex items-center space-x-1.5 px-2 py-1 rounded-xl bg-[#1e2227] border border-[#2d3239] text-xs text-neutral-200 shadow-xs"
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
          <div className="flex items-center space-x-1 py-1.5 px-2 bg-[#1a1d21] border border-neutral-800 rounded-xl overflow-x-auto no-scrollbar text-neutral-300 shadow-md">
            <button
              type="button"
              onClick={() => insertFormatting("**", "**", "bold text")}
              className="p-1.5 hover:bg-neutral-800 rounded-lg transition cursor-pointer"
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("*", "*", "italic text")}
              className="p-1.5 hover:bg-neutral-800 rounded-lg transition cursor-pointer"
              title="Italic"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("<u>", "</u>", "underline text")}
              className="p-1.5 hover:bg-neutral-800 rounded-lg transition cursor-pointer"
              title="Underline"
            >
              <Underline className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("~", "~", "strikethrough text")}
              className="p-1.5 hover:bg-neutral-800 rounded-lg transition cursor-pointer"
              title="Strikethrough"
            >
              <Strikethrough className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("`", "`", "code")}
              className="p-1.5 hover:bg-neutral-800 rounded-lg transition cursor-pointer"
              title="Code"
            >
              <Code className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("```\n", "\n```", "code block")}
              className="p-1.5 hover:bg-neutral-800 rounded-lg transition cursor-pointer"
              title="Code Block"
            >
              <SquareCode className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("> ", "", "quote")}
              className="p-1.5 hover:bg-neutral-800 rounded-lg transition cursor-pointer"
              title="Quote"
            >
              <Quote className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("• ", "", "list item")}
              className="p-1.5 hover:bg-neutral-800 rounded-lg transition cursor-pointer"
              title="Bullet"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleInsertLink}
              className="p-1.5 hover:bg-neutral-800 rounded-lg transition cursor-pointer"
              title="Link"
            >
              <Link2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Mobile Input Row matching Slack Mobile Screenshot */}
        <div className="relative flex items-center bg-[#1a1d21] border border-neutral-800/90 rounded-2xl px-2 py-1 shadow-sm focus-within:border-neutral-700">
          {/* Left Slack-Style Quick Action Buttons */}
          <div className="flex items-center space-x-1.5 text-neutral-400 flex-shrink-0">
            {/* (+) Add Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-7 h-7 rounded-full bg-neutral-800/90 hover:bg-neutral-700 flex items-center justify-center text-neutral-300 transition active:scale-95 cursor-pointer"
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
                  : "text-neutral-400 hover:text-white"
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
                  ? "text-emerald-400"
                  : "text-neutral-400 hover:text-white"
              }`}
              title="Emoji"
            >
              <Smile className="w-4 h-4" />
            </button>

            {/* @ Mention */}
            <button
              type="button"
              onClick={() => insertFormatting("@", "", "colleague")}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white transition cursor-pointer"
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
              className="w-5 h-5 rounded border border-neutral-600/80 flex items-center justify-center text-[10px] font-mono font-bold text-neutral-400 hover:text-white transition cursor-pointer"
              title="Shortcuts"
            >
              /
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
                  mobileTextareaRef.current.style.height = `${Math.min(mobileTextareaRef.current.scrollHeight, 100)}px`;
                }
              }}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={placeholderText}
              rows={1}
              disabled={disabled}
              className="w-full bg-transparent text-[14px] leading-snug text-neutral-100 placeholder-neutral-500 focus:outline-none resize-none font-sans min-h-[28px] max-h-24 py-1"
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
              textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
            }
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholderText}
          rows={1}
          disabled={disabled}
          className="w-full bg-transparent px-3 py-2 sm:py-2.5 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none resize-none font-sans min-h-[36px] max-h-28"
        />

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
          <div className="flex items-center">
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl transition shadow-xs cursor-pointer ${
                canSend
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 active:scale-95"
                  : "bg-neutral-200 dark:bg-neutral-700/70 text-neutral-400 dark:text-neutral-500 cursor-not-allowed"
              }`}
              title="Send message (Enter)"
            >
              {isAnyUploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <>
                  <SendHorizontal className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Send</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
