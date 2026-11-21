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
  Settings,
  Moon,
  Sun,
  Pin,
  Gamepad2,
  Share2,
  LogOut,
  Trash2,
  AlertTriangle,
  UserMinus,
  UserCheck,
} from "lucide-react";
import { WorkspaceMember } from "@/types";
import { formatRoleLabel, canRemoveMember } from "@/utils/permissions";

export interface UserProfileDrawerProps {
  member: WorkspaceMember;
  currentUser: WorkspaceMember;
  onClose: () => void;
  onStartDm: (member: WorkspaceMember) => void;
  onOpenEditProfile: () => void;
  onOpenPreferences?: () => void;
  onToggleColorMode?: () => void;
  resolvedMode?: "light" | "dark";
  onOpenPinned?: () => void;
  onOpenGames?: () => void;
  onOpenInvite?: () => void;
  onSignOut?: () => void;
  onSwitchAccount?: () => void;
  onRemoveMember?: (memberId: string) => void | Promise<void>;
}

export function UserProfileDrawer({
  member,
  currentUser,
  onClose,
  onStartDm,
  onOpenEditProfile,
  onOpenPreferences,
  onToggleColorMode,
  resolvedMode,
  onOpenPinned,
  onOpenGames,
  onOpenInvite,
  onSignOut,
  onSwitchAccount,
  onRemoveMember,
}: UserProfileDrawerProps) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [localTime, setLocalTime] = useState("");
  const [isConfirmRemoveOpen, setIsConfirmRemoveOpen] = useState(false);
  const isSelf =
    (currentUser?.id && currentUser.id === member?.id) ||
    ((currentUser?.name || "").trim().toLowerCase() === (member?.name || "").trim().toLowerCase());
  const removeCheck = canRemoveMember(currentUser, member);

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

  const getStatusColor = (status: WorkspaceMember["status"], isOnline?: boolean) => {
    if (status === "in_call") return "bg-rose-500 ring-2 ring-white dark:ring-neutral-900 animate-pulse";
    if (status === "away") return "bg-amber-500 ring-2 ring-white dark:ring-neutral-900";
    if (status === "online" || isOnline) return "bg-emerald-500 ring-2 ring-white dark:ring-neutral-900";
    return "bg-neutral-400 ring-2 ring-white dark:ring-neutral-900";
  };

  const getStatusLabel = (m: WorkspaceMember, isOnline?: boolean) => {
    if (m.statusText) return m.statusText;
    if (m.status === "in_call") return "In a call";
    if (m.status === "away") return "Away";
    if (m.status === "online" || isOnline) return "Active now";
    return "Offline";
  };

  const isOnline = member.online || member.status === "online";
  const effectiveAvatar =
    member.avatar && !member.avatar.includes("seed=")
      ? member.avatar
      : member.name.trim().toLowerCase() === "prajin prakash"
      ? "https://untypucxdpgxnfezzwuo.supabase.co/storage/v1/object/public/kaelixo-attachments/avatars/user-aparna-sharma/1794211392212-IMG_20260622_000048_052.webp"
      : member.name.trim().toLowerCase() === "anagha"
      ? "https://untypucxdpgxnfezzwuo.supabase.co/storage/v1/object/public/kaelixo-attachments/avatars/user-prajin_prakash/1794041835002-anagha_fish.png"
      : member.avatar;

  const isSvgAvatar =
    !effectiveAvatar ||
    effectiveAvatar.includes("dicebear.com") ||
    effectiveAvatar.endsWith(".svg") ||
    effectiveAvatar.includes("/svg");

  return (
    <aside className="fixed inset-0 z-50 sm:static sm:inset-auto sm:z-auto w-full sm:w-80 md:w-96 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col h-full flex-shrink-0 animate-in slide-in-from-right duration-200 overflow-hidden shadow-xl sm:shadow-none">
      {/* Top Header */}
      <div className="px-5 py-3.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2 min-w-0">
          <h3 className="font-extrabold text-base text-neutral-900 dark:text-neutral-100 flex-shrink-0">
            Profile
          </h3>
          <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium truncate max-w-[160px]">
            {member.name}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer flex-shrink-0"
          title="Close Profile (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Profile Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
        {/* Full-width Cover Photo Preview */}
        {isSvgAvatar ? (
          <div className="w-full h-44 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-gradient-to-b from-neutral-50 to-neutral-100 dark:from-neutral-800/80 dark:to-neutral-900 flex items-center justify-center p-4 relative shadow-xs">
            <div className="w-24 h-24 rounded-2xl bg-white dark:bg-[#1a1d21] p-2 shadow-sm border border-neutral-200/80 dark:border-neutral-700/80 flex items-center justify-center">
              <img
                src={
                  effectiveAvatar ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.name)}`
                }
                alt={member.name}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        ) : (
          <div className="w-full aspect-[4/3] max-h-64 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 shadow-xs">
            <img
              src={effectiveAvatar}
              alt={member.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.name)}`;
              }}
            />
          </div>
        )}

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
                title="Edit Profile"
              >
                Edit Profile
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
              className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor(
                member.status,
                isOnline
              )}`}
            />
            <span className="truncate">
              {getStatusLabel(member, isOnline)}
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
                className="flex-1 py-1.5 px-3 text-sm font-semibold text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition cursor-pointer shadow-xs text-center"
              >
                Set a status
              </button>
              <button
                type="button"
                onClick={onOpenEditProfile}
                className="py-1.5 px-3 text-sm font-semibold text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition cursor-pointer shadow-xs flex items-center space-x-1"
              >
                <span>View as</span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
              </button>
              <button
                type="button"
                onClick={onOpenEditProfile}
                className="p-1.5 text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition cursor-pointer shadow-xs"
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
                className="py-2 px-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-lg transition cursor-pointer shadow-xs"
                title="Copy email"
              >
                {copiedEmail ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
              {removeCheck.allowed && onRemoveMember && (
                <button
                  type="button"
                  onClick={() => setIsConfirmRemoveOpen(true)}
                  className="py-2 px-3 text-sm font-semibold text-rose-600 dark:text-rose-400 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer shadow-xs"
                  title={`Remove ${member.name} from company`}
                >
                  <Trash2 className="w-4 h-4 text-rose-500" />
                </button>
              )}
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

        {/* Workspace Administration / Member Removal */}
        {!isSelf && removeCheck.allowed && onRemoveMember && (
          <div className="pt-2">
            <div className="border-t border-neutral-200 dark:border-neutral-800 my-4" />
            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 space-y-3">
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Workspace Administration
                </h4>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1">
                  As the workspace administrator, you can manage access for this team member.
                </p>
              </div>

              {!isConfirmRemoveOpen ? (
                <button
                  type="button"
                  onClick={() => setIsConfirmRemoveOpen(true)}
                  className="w-full flex items-center justify-center space-x-2 py-2 px-3 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900 rounded-xl transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove User from Company</span>
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-left space-y-2.5 animate-in fade-in">
                  <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-300">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <p className="text-xs font-bold">Remove {member.name}?</p>
                  </div>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-snug">
                    This will immediately revoke their access to the company workspace and remove them from all channels.
                  </p>
                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsConfirmRemoveOpen(false)}
                      className="flex-1 py-1.5 px-2 text-xs font-semibold bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-lg hover:bg-neutral-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsConfirmRemoveOpen(false);
                        onRemoveMember(member.id);
                      }}
                      className="flex-1 py-1.5 px-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm cursor-pointer"
                    >
                      Yes, Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Settings & Tools (Slack Parity) */}
        {isSelf && (
          <>
            <div className="border-t border-neutral-200 dark:border-neutral-800" />
            <div>
              <h4 className="font-bold text-sm text-neutral-900 dark:text-neutral-100 mb-2.5">
                Settings & Preferences
              </h4>
              <div className="space-y-1.5">
                {/* Theme / Appearance Toggle */}
                {onToggleColorMode && (
                  <button
                    type="button"
                    onClick={onToggleColorMode}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-500">
                        {resolvedMode === "dark" ? (
                          <Sun className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <Moon className="w-3.5 h-3.5 text-indigo-500" />
                        )}
                      </div>
                      <span className="font-semibold">
                        Appearance ({resolvedMode === "dark" ? "Dark Mode" : "Light Mode"})
                      </span>
                    </div>
                    <span className="text-[11px] text-sky-600 dark:text-sky-400 font-bold">
                      Switch
                    </span>
                  </button>
                )}

                {/* Preferences */}
                {onOpenPreferences && (
                  <button
                    type="button"
                    onClick={onOpenPreferences}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-500">
                        <Settings className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-semibold">Preferences (Themes, Sounds)</span>
                    </div>
                    <kbd className="text-[10px] bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded font-mono text-neutral-500">
                      Ctrl+,
                    </kbd>
                  </button>
                )}

                {/* Pinned Messages */}
                {onOpenPinned && (
                  <button
                    type="button"
                    onClick={onOpenPinned}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-500">
                        <Pin className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-semibold">Pinned Messages</span>
                    </div>
                    <span className="text-[11px] text-neutral-400">View</span>
                  </button>
                )}

                {/* Team Arcade Games */}
                {onOpenGames && (
                  <button
                    type="button"
                    onClick={onOpenGames}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-500">
                        <Gamepad2 className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-semibold">Team Arcade Games</span>
                    </div>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                      Play
                    </span>
                  </button>
                )}

                {/* Invite Members */}
                {onOpenInvite && (
                  <button
                    type="button"
                    onClick={onOpenInvite}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-500">
                        <Share2 className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-semibold">Invite Team Members</span>
                    </div>
                    <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                      Invite
                    </span>
                  </button>
                )}

                {/* Switch Account / Change User */}
                {onSwitchAccount && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSwitchAccount();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition cursor-pointer mt-1"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/60 flex items-center justify-center text-sky-500">
                        <UserCheck className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold">Switch Account / Change User</span>
                    </div>
                    <span className="text-[11px] font-semibold">Switch</span>
                  </button>
                )}

                {/* Sign Out */}
                {onSignOut && (
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="w-full flex items-center space-x-2.5 p-2.5 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer mt-1"
                  >
                    <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center text-rose-500">
                      <LogOut className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold">Sign out of Kaelixo</span>
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
