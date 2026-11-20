"use client";

import React, { useState, useEffect } from "react";
import { Hash, Lock, X, Trash2, AlertTriangle, Check, Settings, ShieldAlert, Sparkles } from "lucide-react";
import { Channel, Department, DepartmentCode, WorkspaceMember } from "@/types";

export interface EditChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: Channel | null;
  departments: Department[];
  currentUser: WorkspaceMember;
  onUpdateChannel: (
    channelId: string,
    updates: {
      name: string;
      topic: string;
      departmentCode: DepartmentCode;
      isPrivate: boolean;
    }
  ) => Promise<void> | void;
  onDeleteChannel: (channelId: string) => Promise<void> | void;
}

export function EditChannelModal({
  isOpen,
  onClose,
  channel,
  departments,
  currentUser,
  onUpdateChannel,
  onDeleteChannel,
}: EditChannelModalProps) {
  const [activeTab, setActiveTab] = useState<"general" | "danger">("general");
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [departmentCode, setDepartmentCode] = useState<DepartmentCode>("all");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (channel && isOpen) {
      setName(channel.name || "");
      setTopic(channel.topic || "");
      setDepartmentCode(channel.departmentCode || "all");
      setIsPrivate(Boolean(channel.isPrivate));
      setActiveTab("general");
      setIsDeleting(false);
      setConfirmName("");
      setErrorMessage(null);
    }
  }, [channel, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !channel) return null;

  const isProtectedChannel = channel.name === "general";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Channel name cannot be empty.");
      return;
    }

    const formattedName = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-_]/g, "");

    if (!formattedName) {
      setErrorMessage("Please enter a valid channel name using lowercase letters and hyphens.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await onUpdateChannel(channel.id, {
        name: formattedName,
        topic: topic.trim(),
        departmentCode,
        isPrivate,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to save channel changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (isProtectedChannel) return;
    setIsSaving(true);
    try {
      await onDeleteChannel(channel.id);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to delete channel.");
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between flex-shrink-0 bg-neutral-50/70 dark:bg-neutral-900/70">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 shadow-xs border border-indigo-200 dark:border-indigo-800/40">
              {isPrivate ? <Lock className="w-5 h-5" /> : <Hash className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-extrabold text-lg text-neutral-900 dark:text-white tracking-tight">
                  Channel Settings
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-mono font-semibold">
                  #{channel.name}
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Manage channel name, description, department, and privacy
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-neutral-200 dark:border-neutral-800 px-5 pt-2 gap-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveTab("general");
              setIsDeleting(false);
            }}
            className={`pb-2.5 transition flex items-center space-x-1.5 border-b-2 cursor-pointer ${
              activeTab === "general"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>General Details</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("danger")}
            className={`pb-2.5 transition flex items-center space-x-1.5 border-b-2 cursor-pointer ${
              activeTab === "danger"
                ? "border-rose-600 text-rose-600 dark:text-rose-400"
                : "border-transparent text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400"
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete & Danger Zone</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-xs font-semibold text-rose-600 dark:text-rose-300 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {activeTab === "general" ? (
            <form id="edit-channel-form" onSubmit={handleSave} className="space-y-4">
              {/* Channel Name */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                  Channel Name
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-neutral-400 font-bold text-sm">#</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. dev-sprint, project-updates"
                    required
                    disabled={isProtectedChannel}
                    className={`w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isProtectedChannel ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                  />
                </div>
                {isProtectedChannel ? (
                  <p className="text-[11px] text-amber-500 dark:text-amber-400 mt-1 flex items-center space-x-1">
                    <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>#general is the permanent default workspace channel and cannot be renamed.</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Names must be lowercase, without spaces, periods, or special characters.
                  </p>
                )}
              </div>

              {/* Channel Topic / Description */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                  Topic / Purpose
                </label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="What is this channel about? (e.g. Daily standups and blocker discussions)"
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* Department Assignment */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
                  Department
                </label>
                <select
                  value={departmentCode}
                  onChange={(e) => setDepartmentCode(e.target.value as DepartmentCode)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.code}>
                      {dept.name} ({dept.code.toUpperCase()})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Assigning to a department filters this channel when that department is selected.
                </p>
              </div>

              {/* Privacy Setting */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-2">
                  Channel Privacy
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setIsPrivate(false)}
                    className={`p-3 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                      !isPrivate
                        ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-1 ring-indigo-500"
                        : "border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <Hash className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="font-bold text-xs text-neutral-900 dark:text-white">Public</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Anyone in the workspace can view and join this channel.
                    </p>
                  </div>

                  <div
                    onClick={() => {
                      if (!isProtectedChannel) setIsPrivate(true);
                    }}
                    className={`p-3 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                      isProtectedChannel
                        ? "opacity-50 cursor-not-allowed border-neutral-200 dark:border-neutral-800"
                        : isPrivate
                        ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-1 ring-indigo-500"
                        : "border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <Lock className="w-4 h-4 text-purple-500" />
                      <span className="font-bold text-xs text-neutral-900 dark:text-white">Private</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Only invited members can view this channel and its messages.
                    </p>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            /* Danger Zone Tab */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-rose-900 dark:text-rose-200">
                      Delete Channel #{channel.name}
                    </h3>
                    <p className="text-xs text-rose-700/80 dark:text-rose-300/80 mt-0.5 leading-relaxed">
                      Permanently delete this channel and its entire history. All messages, files, attachments, and
                      thread discussions in #{channel.name} will be removed forever.
                    </p>
                  </div>
                </div>

                {isProtectedChannel ? (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800/60 text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                    <span>#general is the core workspace channel and cannot be deleted.</span>
                  </div>
                ) : !isDeleting ? (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setIsDeleting(true)}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center space-x-2 cursor-pointer shadow-sm hover:scale-[1.01]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Channel</span>
                    </button>
                  </div>
                ) : (
                  <div className="pt-2 space-y-3 border-t border-rose-200 dark:border-rose-900/60 animate-in fade-in">
                    <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
                      Are you absolutely sure you want to delete <span className="underline">#{channel.name}</span>?
                    </p>
                    <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                      Please type <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{channel.name}</span> to confirm:
                    </p>
                    <input
                      type="text"
                      value={confirmName}
                      onChange={(e) => setConfirmName(e.target.value)}
                      placeholder={`Type "${channel.name}" to confirm`}
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />

                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={handleConfirmDelete}
                        disabled={confirmName.trim().toLowerCase() !== channel.name.toLowerCase() || isSaving}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-sm ${
                          confirmName.trim().toLowerCase() === channel.name.toLowerCase() && !isSaving
                            ? "bg-rose-600 hover:bg-rose-700 text-white cursor-pointer hover:scale-[1.01]"
                            : "bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed opacity-60"
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isSaving ? "Deleting..." : "Permanently Delete Channel"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsDeleting(false);
                          setConfirmName("");
                        }}
                        className="px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {activeTab === "general" && (
          <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/70 flex items-center justify-between flex-shrink-0">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              Press <kbd className="font-mono font-bold">Esc</kbd> to exit
            </span>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                form="edit-channel-form"
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-md hover:scale-[1.01]"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSaving ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
