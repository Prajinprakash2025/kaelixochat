"use client";

import React, { useState, useRef } from "react";
import {
  Send,
  Smile,
  Paperclip,
  Code,
  Bold,
  Italic,
  Sparkles,
} from "lucide-react";

interface ChatInputProps {
  channelName: string;
  onSendMessage: (content: string) => void;
  externalText?: string;
  onClearExternalText?: () => void;
}

export function ChatInput({
  channelName,
  onSendMessage,
  externalText,
  onClearExternalText,
}: ChatInputProps) {
  const [content, setContent] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync external template text if applied from department toolbar
  React.useEffect(() => {
    if (externalText) {
      setContent((prev) => (prev ? `${prev}\n\n${externalText}` : externalText));
      if (onClearExternalText) onClearExternalText();
      textareaRef.current?.focus();
    }
  }, [externalText, onClearExternalText]);

  const handleSend = () => {
    if (!content.trim()) return;
    onSendMessage(content.trim());
    setContent("");
    setShowEmojiPicker(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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

  const emojis = ["❤️", "👍", "🚀", "🔥", "👏", "🎯", "😊", "🎉", "💼", "📚"];

  return (
    <div className="p-2.5 md:p-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/70">
      <div className="relative rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition shadow-sm">
        {/* Formatting Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-200 dark:border-neutral-700/60 text-neutral-500 dark:text-neutral-400 overflow-x-auto">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => insertFormatting("**")}
              className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md transition"
              title="Bold (**text**)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => insertFormatting("*")}
              className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md transition"
              title="Italic (*text*)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => insertFormatting("```\n")}
              className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md transition"
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
          placeholder={`#${channelName} ലേക്ക് മെസ്സേജ് ടൈപ്പ് ചെയ്യുക... (Enter to send)`}
          rows={3}
          className="w-full bg-transparent p-3 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none resize-none font-sans"
        />

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-neutral-200/50 dark:border-neutral-700/40">
          <div className="relative flex items-center space-x-1.5">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1.5 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 rounded-lg transition"
              title="Add Emoji"
            >
              <Smile className="w-4 h-4" />
            </button>
            <button
              className="p-1.5 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 rounded-lg transition"
              title="Attach File"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Emoji popover */}
            {showEmojiPicker && (
              <div className="absolute bottom-10 left-0 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-2 rounded-2xl shadow-xl flex gap-1 z-20">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      setContent((prev) => prev + emoji);
                      setShowEmojiPicker(false);
                      textareaRef.current?.focus();
                    }}
                    className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl text-base transition"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleSend}
            disabled={!content.trim()}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl font-medium text-xs transition shadow-sm ${
              content.trim()
                ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20 active:scale-95 cursor-pointer"
                : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed"
            }`}
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
