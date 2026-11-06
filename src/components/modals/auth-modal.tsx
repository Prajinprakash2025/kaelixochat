"use client";

import React, { useState } from "react";
import { User, X } from "lucide-react";
import { DepartmentCode, WorkspaceMember, Department } from "@/types";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: Department[];
  currentUser: WorkspaceMember;
  onSaveProfile: (updatedProfile: {
    name: string;
    department: DepartmentCode;
    role: WorkspaceMember["role"];
    statusText?: string;
  }) => void;
}

export function AuthModal({
  isOpen,
  onClose,
  departments,
  currentUser,
  onSaveProfile,
}: AuthModalProps) {
  const [name, setName] = useState(currentUser.name);
  const [department, setDepartment] = useState<DepartmentCode>(currentUser.department);
  const [role, setRole] = useState<WorkspaceMember["role"]>(currentUser.role);
  const [statusText, setStatusText] = useState(currentUser.statusText || "");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSaveProfile({
      name: name.trim(),
      department,
      role,
      statusText: statusText.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-neutral-900 dark:text-white">
                Edit Profile
              </h2>
              <p className="text-xs text-neutral-500">
                Update your display name, department, and role
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Avatar Preview */}
          <div className="flex items-center space-x-3.5 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60">
            <img
              src={`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                name || "User"
              )}`}
              alt="Avatar"
              className="w-12 h-12 rounded-xl bg-neutral-200 dark:bg-neutral-700 ring-2 ring-indigo-500/30"
            />
            <div>
              <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                {name || "Your Name"}
              </p>
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400 capitalize">
                {role} • {department}
              </p>
            </div>
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Morgan"
              required
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Department Selection */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
              Department
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value as DepartmentCode)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {departments
                .filter((d) => d.code !== "all")
                .map((dept) => (
                  <option key={dept.id} value={dept.code}>
                    {dept.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="owner">Owner / Founder</option>
              <option value="manager">Manager / Team Lead</option>
              <option value="member">Team Member</option>
            </select>
          </div>

          {/* Status text */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5">
              Status Message
            </label>
            <input
              type="text"
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              placeholder="e.g. Focused on sprint, In client review"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Submit */}
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
              Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
