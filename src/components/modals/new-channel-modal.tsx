"use client";

import React, { useState } from "react";
import { X, Hash, Lock, Users, Sparkles } from "lucide-react";
import { DepartmentCode, Department } from "@/types";

interface NewChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: Department[];
  onCreateChannel: (channel: {
    name: string;
    topic: string;
    departmentCode: DepartmentCode;
    isPrivate: boolean;
  }) => void;
}

export function NewChannelModal({
  isOpen,
  onClose,
  departments,
  onCreateChannel,
}: NewChannelModalProps) {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [departmentCode, setDepartmentCode] = useState<DepartmentCode>("all");
  const [isPrivate, setIsPrivate] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Sanitize name: lowercase, hyphens instead of spaces
    const sanitizedName = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-_]/g, "");

    onCreateChannel({
      name: sanitizedName,
      topic: topic.trim(),
      departmentCode,
      isPrivate,
    });

    setName("");
    setTopic("");
    setIsPrivate(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Hash className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-neutral-900 dark:text-white">
                പുതിയ ചാനൽ ഉണ്ടാക്കുക (New Channel)
              </h2>
              <p className="text-xs text-neutral-500">
                ചർച്ചകൾക്കായി പുതിയൊരു ചാനൽ ആരംഭിക്കുക
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Channel Name */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
              ചാനൽ പേര് (Channel Name)
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-neutral-400 font-bold text-sm">
                #
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. batch-4-updates, sprint-reviews"
                required
                className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Department Selection */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
              ഡിപ്പാർട്ട്മെന്റ് (Department)
            </label>
            <select
              value={departmentCode}
              onChange={(e) => setDepartmentCode(e.target.value as DepartmentCode)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {departments.map((dept) => (
                <option key={dept.id} value={dept.code}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Topic / Description */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
              വിവരണം / ഉദ്ദേശ്യം (Topic)
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="ഈ ചാനലിന്റെ ഉദ്ദേശ്യം എന്താണ്?"
              className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Private Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60">
            <div className="flex items-center space-x-2.5">
              <Lock className="w-4 h-4 text-neutral-500" />
              <div>
                <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  സ്വകാര്യ ചാനൽ (Private Channel)
                </p>
                <p className="text-[11px] text-neutral-500">
                  ക്ഷണിച്ച അംഗങ്ങൾക്ക് മാത്രം പ്രവേശനം നൽകുക
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition"
            >
              ചാനൽ ഉണ്ടാക്കുക
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
