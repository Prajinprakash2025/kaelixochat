"use client";

import React, { useEffect } from "react";
import { Message } from "@/types";
import { Trash2, X } from "lucide-react";

export interface DeleteMessageModalProps {
  isOpen: boolean;
  message: Message | null;
  onClose: () => void;
  onConfirm: (messageId: string) => void;
}

export function DeleteMessageModal({
  isOpen,
  message,
  onClose,
  onConfirm,
}: DeleteMessageModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Enter" && !e.shiftKey) {
        if (message) {
          e.preventDefault();
          onConfirm(message.id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, message, onClose, onConfirm]);

  if (!isOpen || !message) return null;

  const senderName = message.sender?.name || message.senderName || "Unknown";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-md p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Delete message
              </h3>
              <p className="text-xs text-neutral-500">
                Are you sure you want to delete this message? This cannot be undone.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Snippet Preview */}
        <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 text-xs">
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-semibold text-neutral-900 dark:text-white">
              {senderName}
            </span>
            <span className="text-[10px] text-neutral-400">
              {message.createdAt}
            </span>
          </div>
          <p className="text-neutral-700 dark:text-neutral-300 line-clamp-3 whitespace-pre-wrap break-words">
            {message.content ||
              (message.attachments && message.attachments.length > 0
                ? `[Attachment: ${message.attachments[0].name}]`
                : "")}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(message.id)}
            className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-xl shadow-sm transition cursor-pointer flex items-center space-x-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}
