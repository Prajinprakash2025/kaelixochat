"use client";

import React, { useState } from "react";
import {
  X,
  MessageCircle,
  Pencil,
  Mail,
  Phone,
  Clock,
  Building,
  Check,
  Copy,
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
  const isSelf = currentUser.id === member.id;

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
    if (isOnline || status === "online") return "bg-emerald-500 ring-2 ring-white dark:ring-neutral-900";
    return "bg-neutral-400 ring-2 ring-white dark:ring-neutral-900";
  };

  const getStatusLabel = (status: WorkspaceMember["status"], isOnline?: boolean) => {
    if (status === "in_call") return "In a call";
    if (status === "away") return "Away";
    if (isOnline || status === "online") return "Active now";
    return "Offline";
  };

  return (
    <aside className="w-80 sm:w-96 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col h-full flex-shrink-0 animate-in slide-in-from-right duration-200 overflow-hidden">
      {/* Top Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
        <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
          Profile
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          title="Close Profile (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Profile Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
        {/* Large Avatar Hero */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-3">
            <img
              src={
                member.avatar ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.name)}`
              }
              alt={member.name}
              className="w-44 h-44 rounded-3xl object-cover bg-neutral-100 dark:bg-neutral-800 shadow-md ring-1 ring-neutral-200 dark:ring-neutral-700"
            />
            <span
              className={`absolute bottom-2 right-2 w-5 h-5 rounded-full ${getStatusColor(
                member.status,
                member.online
              )}`}
              title={getStatusLabel(member.status, member.online)}
            />
          </div>

          <h2 className="font-bold text-lg text-neutral-900 dark:text-neutral-100">
            {member.name}
          </h2>
          {member.displayName && (
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              {`@${member.displayName}`}
            </p>
          )}

          <div className="flex items-center space-x-2 mt-2">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 uppercase">
              {formatRoleLabel(member.role)}
            </span>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 uppercase">
              {member.department}
            </span>
          </div>

          <p className="text-xs text-neutral-400 mt-1">
            {getStatusLabel(member.status, member.online)}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {isSelf ? (
            <button
              onClick={onOpenEditProfile}
              className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => onStartDm(member)}
                className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Message</span>
              </button>
              <button
                onClick={handleCopyEmail}
                className="flex items-center justify-center space-x-1 py-2 px-3 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-750 rounded-xl transition cursor-pointer"
                title="Copy email address"
              >
                {copiedEmail ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Email</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {/* Status Card */}
        {(member.statusText || member.statusEmoji) && (
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 flex items-center space-x-2.5 text-xs text-neutral-700 dark:text-neutral-300">
            <span className="text-base">{member.statusEmoji || "💬"}</span>
            <span className="italic">{member.statusText}</span>
          </div>
        )}

        {/* Contact Information */}
        <div className="space-y-3 pt-2 border-t border-neutral-200 dark:border-neutral-800">
          <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
            Contact Information
          </h4>

          {/* Email */}
          <div className="flex items-start space-x-3 text-xs">
            <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
              <Mail className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-neutral-400 block text-[11px]">Email Address</span>
              <a
                href={`mailto:${member.email}`}
                className="text-indigo-600 dark:text-indigo-400 font-medium truncate hover:underline block"
              >
                {member.email}
              </a>
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-start space-x-3 text-xs">
            <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
              <Phone className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-neutral-400 block text-[11px]">Phone</span>
              {member.phone ? (
                <a
                  href={`tel:${member.phone}`}
                  className="text-neutral-900 dark:text-white font-medium hover:underline block"
                >
                  {member.phone}
                </a>
              ) : (
                <span className="text-neutral-400 italic">Not specified</span>
              )}
            </div>
          </div>

          {/* Local Time */}
          <div className="flex items-start space-x-3 text-xs">
            <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-neutral-400 block text-[11px]">Local Time</span>
              <span className="text-neutral-900 dark:text-white font-medium">
                {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        </div>

        {/* About Me Section */}
        <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
          <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
            About Me
          </h4>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
            {member.bio ||
              `${member.name} is a member of the ${member.department.toUpperCase()} team at Kaelixo.`}
          </p>

          <div className="flex items-center space-x-2 text-xs text-neutral-500 pt-1">
            <Building className="w-3.5 h-3.5 text-neutral-400" />
            <span className="capitalize">{member.department} Department</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
