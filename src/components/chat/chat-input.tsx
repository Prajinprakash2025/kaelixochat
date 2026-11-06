"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Smile,
  Paperclip,
  Code,
  Bold,
  Italic,
  Sparkles,
  X,
  File as FileIcon,
  FileText,
  FileCode,
  ImageIcon,
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
  onSendMessage: (content: string, attachments?: Attachment[]) => void | Promise<void>;
  externalText?: string;
  onClearExternalText?: () => void;
  disabled?: boolean;
}

export function ChatInput({
  channelId = "general",
  channelName,
  onSendMessage,
  externalText,
  onClearExternalText,
  disabled = false,
}: ChatInputProps) {
  const [content, setContent] = useState("");
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef<number>(0);
  const stagedFilesRef = useRef<StagedFile[]>([]);
  stagedFilesRef.current = stagedFiles;

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
      const previewUrl = isImg ? URL.createObjectURL(file) : undefined;

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

  const insertFormatting = (wrapper: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);

    const replacement = `${wrapper}${selected || "text"}${wrapper}`;
    const newContent =
      content.substring(0, start) + replacement + content.substring(end);

    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + wrapper.length,
        start + wrapper.length + (selected.length || 4)
      );
    }, 50);
  };

  const handleInsertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
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
      case "pdf":
        return <FileText className="w-5 h-5 text-rose-500" />;
      case "code":
        return <FileCode className="w-5 h-5 text-emerald-500" />;
      default:
        return <FileIcon className="w-5 h-5 text-sky-500" />;
    }
  };

  return (
    <div
      className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/70 relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        multiple
        className="hidden"
        aria-label="Upload file attachments"
      />

      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-2 bg-indigo-500/10 dark:bg-indigo-500/20 border-2 border-dashed border-indigo-500 rounded-2xl flex flex-col items-center justify-center z-30 backdrop-blur-xs pointer-events-none transition-all">
          <UploadCloud className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-bounce mb-1" />
          <p className="font-semibold text-sm text-indigo-700 dark:text-indigo-300">
            Drop files here to upload to #{channelName}
          </p>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            Images, PDFs, documents, or code (up to 25 MB)
          </p>
        </div>
      )}

      <div className="relative rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition shadow-xs">
        {/* Formatting Bar */}
        <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-neutral-200 dark:border-neutral-700/60 text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => insertFormatting("**")}
              className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md transition cursor-pointer"
              title="Bold (**text**)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("*")}
              className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md transition cursor-pointer"
              title="Italic (*text*)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("```\n")}
              className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md transition cursor-pointer"
              title="Code Block"
            >
              <Code className="w-3.5 h-3.5" />
            </button>
            <span className="h-3 w-[1px] bg-neutral-300 dark:bg-neutral-700 mx-1" />
            <span className="text-[11px] text-neutral-400 font-medium">
              Markdown ready
            </span>
          </div>

          <div className="text-[11px] text-neutral-400 flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-indigo-500" />
            <span>Kaelixo Instant</span>
          </div>
        </div>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={`Message #${channelName}...`}
          rows={3}
          disabled={disabled}
          className="w-full bg-transparent p-3 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none resize-none font-sans"
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
                {item.previewUrl ? (
                  <img
                    src={item.previewUrl}
                    alt={item.name}
                    className="w-8 h-8 rounded-lg object-cover flex-shrink-0 bg-neutral-100 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-700"
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

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-neutral-200/50 dark:border-neutral-700/40">
          <div className="relative flex items-center space-x-1.5">
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
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 rounded-lg transition cursor-pointer"
              title="Attach Files or Images"
            >
              <Paperclip className="w-4 h-4" />
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

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl font-medium text-xs transition shadow-xs ${
              canSend
                ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20 active:scale-95 cursor-pointer"
                : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed"
            }`}
          >
            {isAnyUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-400" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
