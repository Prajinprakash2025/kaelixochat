"use client";

import React, { useState, useRef, useEffect } from "react";
import { Message, WorkspaceMember, Attachment, reactionsMapToArray } from "@/types";
import {
  X,
  MessageSquare,
  Send,
  Smile,
  Paperclip,
  Trash2,
  FileText,
  AlertCircle,
} from "lucide-react";
import { AttachmentPreview } from "./attachment-preview";
import { EmojiPicker } from "./emoji-picker";
import { formatReactorsTooltip } from "./message-feed";
import { uploadAttachment } from "@/utils/storage";

export interface ThreadSidePanelProps {
  parentMessage: Message;
  replies: Message[];
  currentUser: WorkspaceMember;
  channelName: string;
  isDm?: boolean;
  onClose: () => void;
  onSendReply: (content: string, parentId: string, attachments?: Attachment[]) => void;
  onAddReaction?: (messageId: string, emoji: string) => void;
  members?: WorkspaceMember[];
  onOpenProfile?: (member: WorkspaceMember) => void;
}

export function ThreadSidePanel({
  parentMessage,
  replies,
  currentUser,
  channelName,
  isDm = false,
  onClose,
  onSendReply,
  onAddReaction,
  members = [],
  onOpenProfile,
}: ThreadSidePanelProps) {
  const [replyText, setReplyText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Attachment upload staging
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [uploadingProgress, setUploadingProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const repliesEndRef = useRef<HTMLDivElement>(null);

  const quickEmojis = ["👍", "❤️", "😂", "🎉", "🚀"];

  // Auto-scroll to bottom on replies change
  useEffect(() => {
    repliesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies.length]);

  const handleSend = async () => {
    const trimmed = replyText.trim();
    if (!trimmed && stagedFiles.length === 0) return;
    if (parentMessage.isDeleted) return;

    let uploadedAttachments: Attachment[] = [];

    if (stagedFiles.length > 0) {
      setUploadingProgress(10);
      try {
        for (let i = 0; i < stagedFiles.length; i++) {
          const file = stagedFiles[i];
          const att = await uploadAttachment(file, parentMessage.channelId, (percent) => {
            setUploadingProgress(Math.round(((i + percent / 100) / stagedFiles.length) * 100));
          });
          uploadedAttachments.push(att);
        }
      } catch (err: any) {
        console.warn("Upload failed in thread reply:", err);
        setUploadError(err.message || "Failed to upload attachments");
        setUploadingProgress(null);
        return;
      }
    }

    onSendReply(trimmed, parentMessage.id, uploadedAttachments);
    setReplyText("");
    setStagedFiles([]);
    setUploadingProgress(null);
    setShowEmojiPicker(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setStagedFiles((prev) => [...prev, ...files]);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeStagedFile = (index: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Content formatting for markdown/code
  const formatContent = (content: string) => {
    if (!content) return null;

    if (content.includes("```")) {
      const parts = content.split("```");
      return parts.map((part, index) => {
        if (index % 2 === 1) {
          const lines = part.trim().split("\n");
          const lang = lines[0].match(/^[a-z]+/i) ? lines[0] : "";
          const code = lang ? lines.slice(1).join("\n") : part;
          return (
            <div
              key={index}
              className="my-2 rounded-xl bg-neutral-900 border border-neutral-800 p-2.5 font-mono text-xs text-neutral-200 overflow-x-auto shadow-inner"
            >
              {lang && (
                <div className="text-[10px] text-neutral-400 uppercase font-semibold mb-1 pb-1 border-b border-neutral-800">
                  {lang}
                </div>
              )}
              <pre className="whitespace-pre">{code}</pre>
            </div>
          );
        }
        return (
          <p key={index} className="whitespace-pre-wrap leading-relaxed">
            {part}
          </p>
        );
      });
    }

    return (
      <div className="whitespace-pre-wrap leading-relaxed space-y-1">
        {content.split("\n").map((line, i) => {
          const boldFormatted = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
          return <div key={i} dangerouslySetInnerHTML={{ __html: boldFormatted }} />;
        })}
      </div>
    );
  };

  const parentSenderId =
    parentMessage.sender?.id || parentMessage.senderId || `user-${parentMessage.id}`;
  const parentSenderName = parentMessage.sender?.name || parentMessage.senderName || "Colleague";
  const parentSenderAvatar =
    parentMessage.sender?.avatar ||
    parentMessage.senderAvatar ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(parentSenderName)}`;

  const parentReactionList = reactionsMapToArray(parentMessage.reactions);

  return (
    <aside className="w-80 md:w-96 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col h-screen z-30 shadow-xl flex-shrink-0 animate-in slide-in-from-right duration-200">
      {/* Thread Header */}
      <div className="h-16 px-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between flex-shrink-0 bg-neutral-50/70 dark:bg-neutral-900/80">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800/50">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-neutral-900 dark:text-white truncate">Thread</h3>
            <p className="text-[11px] text-neutral-400 truncate">
              {isDm ? `@${channelName}` : `#${channelName}`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
          title="Close Thread"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Thread Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {/* Parent Message Card */}
        <div
          className={`group/parent relative p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border ${
            parentMessage.isDeleted
              ? "border-neutral-300 dark:border-neutral-700 opacity-70"
              : "border-neutral-200 dark:border-neutral-700/60"
          }`}
        >
          <div className="flex items-center space-x-2.5 mb-2">
            <img
              src={parentSenderAvatar}
              alt={parentSenderName}
              onClick={() => {
                if (onOpenProfile) {
                  const target = members.find((m) => m.id === parentSenderId) || parentMessage.sender || {
                    id: parentSenderId,
                    name: parentSenderName,
                    avatar: parentSenderAvatar,
                  };
                  onOpenProfile(target as WorkspaceMember);
                }
              }}
              className={`w-8 h-8 rounded-lg bg-neutral-200 dark:bg-neutral-700 object-cover flex-shrink-0 ${
                onOpenProfile ? "cursor-pointer hover:ring-2 hover:ring-indigo-500 transition" : ""
              }`}
            />
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span
                  onClick={() => {
                    if (onOpenProfile) {
                      const target = members.find((m) => m.id === parentSenderId) || parentMessage.sender || {
                        id: parentSenderId,
                        name: parentSenderName,
                        avatar: parentSenderAvatar,
                      };
                      onOpenProfile(target as WorkspaceMember);
                    }
                  }}
                  className={`font-bold text-xs text-neutral-900 dark:text-neutral-100 truncate ${
                    onOpenProfile ? "cursor-pointer hover:underline hover:text-indigo-600 dark:hover:text-indigo-400" : ""
                  }`}
                >
                  {parentSenderName}
                </span>
                <span className="text-[10px] text-neutral-400 flex-shrink-0">
                  {parentMessage.createdAt}
                </span>
                {parentMessage.isEdited && (
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500 italic select-none">
                    (edited)
                  </span>
                )}
              </div>
            </div>
          </div>

          {parentMessage.isDeleted ? (
            <div className="flex items-center space-x-2 py-1 text-xs text-neutral-400 dark:text-neutral-500 italic">
              <Trash2 className="w-3.5 h-3.5 opacity-50 flex-shrink-0" />
              <span>This message was deleted</span>
            </div>
          ) : (
            <>
              {parentMessage.content && (
                <div className="text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap break-words">
                  {formatContent(parentMessage.content)}
                </div>
              )}

              {/* Attachments if any */}
              {parentMessage.attachments && parentMessage.attachments.length > 0 && (
                <div className="mt-2.5">
                  <AttachmentPreview attachments={parentMessage.attachments} />
                </div>
              )}

              {/* Parent Reactions */}
              {parentReactionList.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                  {parentReactionList.map((reaction, i) => {
                    const hasReacted = reaction.users.includes(currentUser.id);
                    const tooltipText = formatReactorsTooltip(reaction, currentUser.id, members);
                    return (
                      <div key={i} className="relative group/chip">
                        <button
                          type="button"
                          onClick={() => onAddReaction?.(parentMessage.id, reaction.emoji)}
                          className={`flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-xs font-medium transition cursor-pointer ${
                            hasReacted
                              ? "bg-indigo-50 border border-indigo-300 text-indigo-700 dark:bg-indigo-950/70 dark:border-indigo-600 dark:text-indigo-200 ring-1 ring-indigo-400/30"
                              : "bg-white hover:bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700"
                          }`}
                        >
                          <span>{reaction.emoji}</span>
                          <span className="text-[10px]">{reaction.count}</span>
                        </button>
                        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/chip:flex flex-col items-center z-30">
                          <div className="bg-neutral-900 text-white dark:bg-neutral-800 dark:border dark:border-neutral-700 text-[10px] font-medium px-2 py-0.5 rounded-md shadow-lg whitespace-nowrap">
                            <span className="mr-1">{reaction.emoji}</span>
                            {tooltipText}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Reply Count Separator */}
        <div className="flex items-center space-x-2 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider py-1">
          <div className="h-[1px] flex-1 bg-neutral-200 dark:bg-neutral-800" />
          <span>
            {replies.length} {replies.length === 1 ? "Reply" : "Replies"}
          </span>
          <div className="h-[1px] flex-1 bg-neutral-200 dark:bg-neutral-800" />
        </div>

        {/* Replies List */}
        {replies.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-400">
            No replies yet. Be the first to reply!
          </div>
        ) : (
          replies.map((reply) => {
            const replySenderId = reply.sender?.id || reply.senderId;
            const replySenderName = reply.sender?.name || reply.senderName || "Colleague";
            const replySenderAvatar =
              reply.sender?.avatar ||
              reply.senderAvatar ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(replySenderName)}`;
            const replyReactions = reactionsMapToArray(reply.reactions);

            return (
              <div
                key={reply.id}
                className="group relative flex items-start space-x-2.5 p-2 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition"
              >
                <img
                  src={replySenderAvatar}
                  alt={replySenderName}
                  onClick={() => {
                    if (onOpenProfile) {
                      const target = members.find((m) => m.id === replySenderId) || reply.sender || {
                        id: replySenderId,
                        name: replySenderName,
                        avatar: replySenderAvatar,
                      };
                      onOpenProfile(target as WorkspaceMember);
                    }
                  }}
                  className={`w-7 h-7 rounded-lg bg-neutral-200 dark:bg-neutral-700 object-cover mt-0.5 flex-shrink-0 ${
                    onOpenProfile ? "cursor-pointer hover:ring-2 hover:ring-indigo-500 transition" : ""
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-0.5">
                    <span
                      onClick={() => {
                        if (onOpenProfile) {
                          const target = members.find((m) => m.id === replySenderId) || reply.sender || {
                            id: replySenderId,
                            name: replySenderName,
                            avatar: replySenderAvatar,
                          };
                          onOpenProfile(target as WorkspaceMember);
                        }
                      }}
                      className={`font-semibold text-xs text-neutral-900 dark:text-neutral-100 truncate ${
                        onOpenProfile ? "cursor-pointer hover:underline hover:text-indigo-600 dark:hover:text-indigo-400" : ""
                      }`}
                    >
                      {replySenderName}
                    </span>
                    <span className="text-[10px] text-neutral-400 flex-shrink-0">
                      {reply.createdAt}
                    </span>
                    {reply.isEdited && (
                      <span className="text-[10px] text-neutral-400 dark:text-neutral-500 italic select-none">
                        (edited)
                      </span>
                    )}
                  </div>

                  {reply.isDeleted ? (
                    <div className="flex items-center space-x-1.5 py-1 text-xs text-neutral-400 dark:text-neutral-500 italic">
                      <Trash2 className="w-3 h-3 opacity-50 flex-shrink-0" />
                      <span>This message was deleted</span>
                    </div>
                  ) : (
                    <>
                      {reply.content && (
                        <div className="text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap break-words">
                          {formatContent(reply.content)}
                        </div>
                      )}

                      {reply.attachments && reply.attachments.length > 0 && (
                        <div className="mt-1.5">
                          <AttachmentPreview attachments={reply.attachments} />
                        </div>
                      )}

                      {/* Reactions on reply */}
                      {replyReactions.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 mt-1.5">
                          {replyReactions.map((reaction, i) => {
                            const hasReacted = reaction.users.includes(currentUser.id);
                            const tooltipText = formatReactorsTooltip(
                              reaction,
                              currentUser.id,
                              members
                            );
                            return (
                              <div key={i} className="relative group/chip">
                                <button
                                  type="button"
                                  onClick={() => onAddReaction?.(reply.id, reaction.emoji)}
                                  className={`flex items-center space-x-1 px-2 py-0.2 rounded-full text-[11px] font-medium transition cursor-pointer ${
                                    hasReacted
                                      ? "bg-indigo-50 border border-indigo-300 text-indigo-700 dark:bg-indigo-950/70 dark:border-indigo-600 dark:text-indigo-200 ring-1 ring-indigo-400/30"
                                      : "bg-white hover:bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700"
                                  }`}
                                >
                                  <span>{reaction.emoji}</span>
                                  <span className="text-[10px]">{reaction.count}</span>
                                </button>
                                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/chip:flex flex-col items-center z-30">
                                  <div className="bg-neutral-900 text-white dark:bg-neutral-800 dark:border dark:border-neutral-700 text-[10px] font-medium px-2 py-0.5 rounded-md shadow-lg whitespace-nowrap">
                                    <span className="mr-1">{reaction.emoji}</span>
                                    {tooltipText}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Reply hover reaction action */}
                {!reply.isDeleted && onAddReaction && (
                  <div className="absolute top-1 right-2 opacity-0 group-hover:opacity-100 transition flex items-center space-x-0.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-0.5 shadow-xs">
                    {quickEmojis.slice(0, 3).map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => onAddReaction(reply.id, emoji)}
                        className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded text-xs transition cursor-pointer"
                        title={`React with ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={repliesEndRef} />
      </div>

      {/* Reply Composer */}
      <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        {parentMessage.isDeleted ? (
          <div className="flex items-center space-x-2 p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800/60 text-xs text-neutral-500 border border-neutral-200 dark:border-neutral-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-500" />
            <span>This message was deleted. Replies cannot be added.</span>
          </div>
        ) : (
          <div className="relative rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 p-2 focus-within:ring-2 focus-within:ring-indigo-500 transition">
            {/* Upload progress indicator */}
            {uploadingProgress !== null && (
              <div className="mb-2">
                <div className="flex items-center justify-between text-[11px] text-indigo-600 font-medium mb-1">
                  <span>Uploading attachments...</span>
                  <span>{uploadingProgress}%</span>
                </div>
                <div className="w-full h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-200"
                    style={{ width: `${uploadingProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Upload error */}
            {uploadError && (
              <div className="mb-2 p-1.5 rounded-lg bg-rose-50 text-rose-600 text-xs flex items-center justify-between">
                <span>{uploadError}</span>
                <button
                  type="button"
                  onClick={() => setUploadError(null)}
                  className="p-0.5 hover:bg-rose-100 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Staged attachments chips */}
            {stagedFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {stagedFiles.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 text-[11px]"
                  >
                    <FileText className="w-3 h-3 text-indigo-500" />
                    <span className="truncate max-w-[120px] font-medium">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeStagedFile(i)}
                      className="p-0.5 hover:text-rose-500 text-neutral-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Reply in thread... (Enter to send, Shift+Enter for newline)"
              rows={2}
              className="w-full bg-transparent text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none resize-none"
            />

            <div className="flex items-center justify-between pt-1 border-t border-neutral-200 dark:border-neutral-700/50">
              <div className="flex items-center space-x-1">
                {/* File Attachment Button */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  multiple
                  className="hidden"
                  id="thread-file-upload"
                />
                <label
                  htmlFor="thread-file-upload"
                  className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition cursor-pointer"
                  title="Attach file"
                >
                  <Paperclip className="w-4 h-4" />
                </label>

                {/* Emoji Picker */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition cursor-pointer"
                    title="Add Emoji"
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute left-0 bottom-full mb-2 z-50">
                      <EmojiPicker
                        onSelectEmoji={(emoji) => {
                          setReplyText((prev) => prev + emoji);
                          setShowEmojiPicker(false);
                        }}
                        onClose={() => setShowEmojiPicker(false)}
                      />
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleSend}
                disabled={(!replyText.trim() && stagedFiles.length === 0) || uploadingProgress !== null}
                className={`p-1.5 rounded-xl transition ${
                  replyText.trim() || stagedFiles.length > 0
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm cursor-pointer"
                    : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed"
                }`}
                title="Send reply"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
