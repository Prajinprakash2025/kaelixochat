"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  MessageCircle,
  Mail,
  Phone,
  Clock,
  Check,
  Copy,
  ChevronDown,
  MoreHorizontal,
  Smile,
  Calendar,
  Shield,
  Building,
} from "lucide-react";
import { WorkspaceMember } from "@/types";
import { formatRoleLabel } from "@/utils/permissions";

export interface UserProfileDrawerProps {
  member: WorkspaceMember;
  currentUser: WorkspaceMember;
  onClose: () => void;
  onStartDm: (member: WorkspaceMember) => void;
  onOpenEditProfile: () => void;
}

export function UserProfileDrawer({
  member,
  currentUser,
  onClose,
  onStartDm,
  onOpenEditProfile,
}: UserProfileDrawerProps) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [localTime, setLocalTime] = useState("");
  const isSelf = currentUser.id === member.id;

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLocalTime(
        now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) + " local time"
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleCopyEmail = () => {
    if (member.email) {
      navigator.clipboard.writeText(member.email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const isOnline = member.online || member.status === "online";

  return (
    <aside className="fixed inset-0 z-50 sm:static sm:inset-auto sm:z-auto w-full sm:w-80 md:w-96 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col h-full flex-shrink-0 animate-in slide-in-from-right duration-200 overflow-hidden shadow-xl sm:shadow-none">
      {/* Top Header */}
      <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
        <h3 className="font-extrabold text-base text-neutral-900 dark:text-neutral-100">
          Profile
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
          title="Close Profile (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Profile Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
        {/* Full-width Cover Photo Preview */}
        <div className="w-full aspect-[4/3] rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 shadow-xs">
          <img
            src={
              member.avatar ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.name)}`
            }
            alt={member.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Identity & Header Row */}
        <div>
          <div className="flex items-baseline justify-between">
            <h2 className="font-extrabold text-2xl text-neutral-900 dark:text-neutral-100 tracking-tight">
              {member.name}
            </h2>
            {isSelf && (
              <button
                type="button"
                onClick={onOpenEditProfile}
                className="text-sm font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
              >
                Edit
              </button>
            )}
          </div>

          {member.title && (
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 mt-0.5">
              {member.title}
            </p>
          )}

          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {member.displayName ? `@${member.displayName}` : member.name.toLowerCase().replace(/\s+/g, "")}
          </p>

          {/* Status Indicator */}
          <div className="flex items-center space-x-2 mt-2 text-xs text-neutral-600 dark:text-neutral-300">
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                isOnline ? "bg-emerald-500" : "bg-neutral-400"
              }`}
            />
            <span className="truncate">
              {member.statusText || (isOnline ? "Active, notifications snoozed" : "Away")}
            </span>
          </div>

          {/* Local Time */}
          {localTime && (
            <div className="flex items-center space-x-1.5 text-xs text-neutral-500 dark:text-neutral-400 mt-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{localTime}</span>
            </div>
          )}
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center space-x-2 pt-1">
          {isSelf ? (
            <>
              <button
                type="button"
                onClick={onOpenEditProfile}
                className="flex-1 py-1.5 px-3 text-sm font-semibold text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-750 transition cursor-pointer shadow-xs text-center"
              >
                Set a status
              </button>
              <button
                type="button"
                onClick={onOpenEditProfile}
                className="py-1.5 px-3 text-sm font-semibold text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-750 transition cursor-pointer shadow-xs flex items-center space-x-1"
              >
                <span>View as</span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
              </button>
              <button
                type="button"
                onClick={onOpenEditProfile}
                className="p-1.5 text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-750 transition cursor-pointer shadow-xs"
                title="More options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onStartDm(member)}
                className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 text-sm font-bold text-white bg-[#007a5a] hover:bg-[#006a4e] rounded-lg shadow-sm transition cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Message</span>
              </button>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="py-2 px-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-750 rounded-lg transition cursor-pointer shadow-xs"
                title="Copy email"
              >
                {copiedEmail ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </>
          )}
        </div>

        <div className="border-t border-neutral-200 dark:border-neutral-800" />

        {/* Contact Information Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
              Contact Information
            </h4>
            {isSelf && (
              <button
                type="button"
                onClick={onOpenEditProfile}
                className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
              >
                Edit
              </button>
            )}
          </div>

          <div className="space-y-3 text-xs">
            {/* Email Address */}
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Mail className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-neutral-500 dark:text-neutral-400">
                  Email address
                </p>
                <a
                  href={`mailto:${member.email || "colleague@kaelixo.com"}`}
                  className="font-medium text-sky-600 dark:text-sky-400 hover:underline break-all"
                >
                  {member.email || "colleague@kaelixo.com"}
                </a>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Phone className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-neutral-500 dark:text-neutral-400">
                  Phone
                </p>
                {member.phone ? (
                  <a
                    href={`tel:${member.phone}`}
                    className="font-medium text-sky-600 dark:text-sky-400 hover:underline"
                  >
                    {member.phone}
                  </a>
                ) : isSelf ? (
                  <button
                    type="button"
                    onClick={onOpenEditProfile}
                    className="font-medium text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                  >
                    + Add Phone
                  </button>
                ) : (
                  <span className="text-neutral-400">Not provided</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-200 dark:border-neutral-800" />

        {/* About Me Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
              About me
            </h4>
            {isSelf && (
              <button
                type="button"
                onClick={onOpenEditProfile}
                className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
              >
                Edit
              </button>
            )}
          </div>

          <div className="space-y-3 text-xs">
            {/* Start Date */}
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Calendar className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-neutral-500 dark:text-neutral-400">
                  Start Date
                </p>
                <p className="font-medium text-neutral-800 dark:text-neutral-200">
                  Joined October 2026
                </p>
              </div>
            </div>

            {/* Department */}
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Building className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-neutral-500 dark:text-neutral-400">
                  Department
                </p>
                <p className="font-medium text-neutral-800 dark:text-neutral-200 uppercase">
                  {member.department || "General"}
                </p>
              </div>
            </div>

            {/* Role */}
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Shield className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-neutral-500 dark:text-neutral-400">
                  Role
                </p>
                <p className="font-medium text-neutral-800 dark:text-neutral-200">
                  {formatRoleLabel(member.role)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
