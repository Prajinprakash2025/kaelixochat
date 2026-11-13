"use client";

import React, { useState } from "react";
import {
  Hash,
  Lock,
  Plus,
  Smile,
  PhoneCall,
  GraduationCap,
  Code2,
  Briefcase,
  LayoutGrid,
  Sparkles,
  ChevronDown,
  Building2,
  Copy,
  Check,
  FolderPlus,
  MessageCircle,
  X,
  Share2,
  LogOut,
  Users,
  Gamepad2,
  Settings,
  MessageSquare,
  Compass,
  FileText,
  Bot,
  Home as HomeIcon,
  Trash2,
} from "lucide-react";
import { DepartmentCode, Channel, WorkspaceMember, Department, Organization } from "@/types";
import { canRemoveMember } from "@/utils/permissions";

interface SidebarProps {
  organizations: Organization[];
  activeOrg: Organization;
  onSelectOrg: (org: Organization) => void;
  onOpenNewCompanyModal: () => void;
  onOpenEditCompanyModal?: () => void;
  departments: Department[];
  selectedDepartment: DepartmentCode;
  onSelectDepartment: (dept: DepartmentCode) => void;
  onOpenNewDepartmentModal: () => void;
  channels: Channel[];
  activeChannelId: string;
  onSelectChannel: (channelId: string) => void;
  teamMembers: WorkspaceMember[];
  currentUser: WorkspaceMember;
  onOpenNewChannelModal: () => void;
  onOpenAuthModal: () => void;
  onOpenInviteModal?: () => void;
  onOpenMemberDirectory?: () => void;
  onOpenGamesModal?: () => void;
  onOpenPreferences?: () => void;
  onOpenUserProfile?: (member: WorkspaceMember) => void;
  onSelectDirectMessage: (member: WorkspaceMember) => void;
  onLogout?: () => void;
  onRemoveMember?: (memberId: string) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({
  organizations,
  activeOrg,
  onSelectOrg,
  onOpenNewCompanyModal,
  onOpenEditCompanyModal,
  departments,
  selectedDepartment,
  onSelectDepartment,
  onOpenNewDepartmentModal,
  channels,
  activeChannelId,
  onSelectChannel,
  teamMembers,
  currentUser,
  onOpenNewChannelModal,
  onOpenAuthModal,
  onOpenInviteModal,
  onOpenMemberDirectory,
  onOpenGamesModal,
  onOpenPreferences,
  onOpenUserProfile,
  onSelectDirectMessage,
  onLogout,
  onRemoveMember,
  isMobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeRailTab, setActiveRailTab] = useState<"home" | "dms" | "activity" | "files" | "games">("home");

  const handleCopyInvite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeOrg.invite_code) {
      navigator.clipboard.writeText(activeOrg.invite_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Filter channels based on selected department tab
  const filteredChannels = channels.filter((ch) => {
    if (ch.isDm || ch.name.startsWith("dm:") || ch.name.includes(":")) return false;
    if (selectedDepartment === "all") return true;
    return ch.departmentCode === selectedDepartment || ch.departmentCode === "all";
  });

  const getDeptIcon = (code: DepartmentCode) => {
    switch (code) {
      case "dev":
        return <Code2 className="w-3.5 h-3.5" />;
      case "teaching":
        return <GraduationCap className="w-3.5 h-3.5" />;
      case "telecalling":
        return <PhoneCall className="w-3.5 h-3.5" />;
      case "management":
        return <Briefcase className="w-3.5 h-3.5" />;
      default:
        return <LayoutGrid className="w-3.5 h-3.5" />;
    }
  };

  const getStatusColor = (status: WorkspaceMember["status"]) => {
    switch (status) {
      case "online":
        return "bg-emerald-500 ring-2 ring-white dark:ring-neutral-900";
      case "away":
        return "bg-amber-500 ring-2 ring-white dark:ring-neutral-900";
      case "in_call":
        return "bg-rose-500 animate-pulse ring-2 ring-white dark:ring-neutral-900";
      default:
        return "bg-neutral-400 ring-2 ring-white dark:ring-neutral-900";
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Main Container: Thin Slack Rail + Channel Navigation Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex h-full select-none transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          isMobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* ============================================================== */}
        {/* 1. SLACK LEFT ACTIVITY RAIL (Themed Workspace Bar)             */}
        {/* ============================================================== */}
        <div
          className="w-16 flex-shrink-0 flex flex-col items-center justify-between py-3.5 bg-neutral-900 text-neutral-300 border-r border-neutral-800 select-none"
        >
          {/* Top workspace / app icons */}
          <div className="flex flex-col items-center space-y-4 w-full">
            {/* Workspace Squircle Logo */}
            {activeOrg.logo_url ? (
              <img
                src={activeOrg.logo_url}
                alt={activeOrg.name}
                onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                className="w-10 h-10 rounded-2xl object-cover ring-1 ring-white/20 shadow-md hover:scale-105 transition cursor-pointer"
                title={`${activeOrg.name} — Switch Workspace`}
              />
            ) : (
              <button
                onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center text-white font-extrabold shadow-md hover:scale-105 transition cursor-pointer"
                title={`${activeOrg.name} — Switch Workspace`}
              >
                <span className="text-sm tracking-wider">
                  {activeOrg.name.charAt(0).toUpperCase()}
                </span>
              </button>
            )}

            {/* Rail Navigation Icons */}
            <div className="flex flex-col items-center space-y-2 w-full pt-1">
              <button
                onClick={() => setActiveRailTab("home")}
                className={`flex flex-col items-center justify-center w-12 py-1.5 rounded-xl transition cursor-pointer ${
                  activeRailTab === "home"
                    ? "bg-white/20 text-white font-bold shadow-xs"
                    : "text-neutral-400 hover:text-white hover:bg-white/10"
                }`}
                title="Home"
              >
                <HomeIcon className="w-4 h-4" />
                <span className="text-[10px] mt-0.5 font-medium leading-none">Home</span>
              </button>

              <button
                onClick={() => setActiveRailTab("dms")}
                className={`flex flex-col items-center justify-center w-12 py-1.5 rounded-xl transition cursor-pointer ${
                  activeRailTab === "dms"
                    ? "bg-white/20 text-white font-bold shadow-xs"
                    : "text-neutral-400 hover:text-white hover:bg-white/10"
                }`}
                title="Direct Messages"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="text-[10px] mt-0.5 font-medium leading-none">DMs</span>
              </button>

              <button
                onClick={() => {
                  setActiveRailTab("activity");
                  if (onOpenMemberDirectory) onOpenMemberDirectory();
                }}
                className={`flex flex-col items-center justify-center w-12 py-1.5 rounded-xl transition cursor-pointer ${
                  activeRailTab === "activity"
                    ? "bg-white/20 text-white font-bold shadow-xs"
                    : "text-neutral-400 hover:text-white hover:bg-white/10"
                }`}
                title="Activity & Directory"
              >
                <Compass className="w-4 h-4" />
                <span className="text-[10px] mt-0.5 font-medium leading-none">Activity</span>
              </button>

              <button
                onClick={() => {
                  setActiveRailTab("games");
                  if (onOpenGamesModal) onOpenGamesModal();
                }}
                className={`flex flex-col items-center justify-center w-12 py-1.5 rounded-xl transition cursor-pointer ${
                  activeRailTab === "games"
                    ? "bg-white/20 text-white font-bold shadow-xs"
                    : "text-neutral-400 hover:text-white hover:bg-white/10"
                }`}
                title="Team Arcade"
              >
                <Gamepad2 className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] mt-0.5 font-medium leading-none">Arcade</span>
              </button>
            </div>
          </div>

          {/* Bottom Rail Actions */}
          <div className="flex flex-col items-center space-y-3 w-full">
            {onOpenPreferences && (
              <button
                onClick={onOpenPreferences}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title="Preferences [Ctrl+,]"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            {/* Profile Avatar with Status Dot */}
            <div
              onClick={() => {
                if (onOpenUserProfile) onOpenUserProfile(currentUser);
                else onOpenAuthModal();
              }}
              className="relative cursor-pointer hover:scale-105 transition"
              title={`${currentUser.name} (${currentUser.role})`}
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-8 h-8 rounded-xl object-cover ring-1 ring-black/20 dark:ring-white/20"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                    currentUser.name
                  )}`;
                }}
              />
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${getStatusColor(
                  currentUser.status
                )}`}
              />
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. CHANNELS & CONVERSATIONS SIDEBAR                            */}
        {/* ============================================================== */}
        <aside
          style={{
            backgroundColor: "var(--theme-sidebar-bg, #ffffff)",
            borderColor: "var(--theme-sidebar-border, #e2e8f0)",
          }}
          className="w-64 sm:w-72 border-r flex flex-col h-full bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
        >
          {/* Workspace Switcher Header */}
          <div className="relative p-3.5 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                className="flex-1 flex items-center justify-between p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition text-left group min-w-0 cursor-pointer"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  {activeOrg.logo_url ? (
                    <img
                      src={activeOrg.logo_url}
                      alt={activeOrg.name}
                      className="w-8 h-8 rounded-xl object-cover ring-1 ring-black/10 dark:ring-white/10 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md shadow-purple-500/20 flex-shrink-0 text-white font-extrabold text-xs">
                      {activeOrg.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="truncate">
                    <div className="flex items-center space-x-1.5">
                      <h1 className="font-bold text-sm tracking-tight text-neutral-900 dark:text-white truncate">
                        {activeOrg.name}
                      </h1>
                      <ChevronDown className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white transition flex-shrink-0" />
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                      {activeOrg.slug || "Enterprise Workspace"}
                    </p>
                  </div>
                </div>
              </button>

              {/* Edit Company Settings Button */}
              {onOpenEditCompanyModal && (
                <button
                  onClick={onOpenEditCompanyModal}
                  className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer ml-1"
                  title="Edit Company Name & Logo (Manager)"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}

              {/* Mobile close button */}
              <button
                onClick={onCloseMobile}
                className="p-1.5 rounded-xl text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white md:hidden hover:bg-neutral-100 dark:hover:bg-neutral-800 transition ml-1"
                title="Close sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Invite Code Bar */}
            <div className="mt-2.5 flex items-center space-x-1.5">
              <button
                onClick={onOpenInviteModal}
                className="flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 text-xs transition group cursor-pointer"
                title="Invite Team Members"
              >
                <div className="flex items-center space-x-1.5 min-w-0">
                  <Share2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 truncate">
                    Invite Team
                  </span>
                </div>
                {activeOrg.invite_code && (
                  <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800/50">
                    {activeOrg.invite_code}
                  </span>
                )}
              </button>
              {activeOrg.invite_code && (
                <button
                  onClick={handleCopyInvite}
                  className="p-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition flex-shrink-0 cursor-pointer"
                  title="Copy Invite Code"
                >
                  {copiedCode ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>

            {/* Workspace Dropdown */}
            {showOrgDropdown && (
              <div className="absolute top-16 left-3 right-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl p-2 z-30 space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Workspaces
                </div>
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => {
                      onSelectOrg(org);
                      setShowOrgDropdown(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      org.id === activeOrg.id
                        ? "bg-indigo-600 text-white"
                        : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{org.name}</span>
                    </div>
                    {org.id === activeOrg.id && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}

                <div className="pt-1.5 border-t border-neutral-200 dark:border-neutral-800 space-y-0.5">
                  {onOpenEditCompanyModal && (
                    <button
                      onClick={() => {
                        setShowOrgDropdown(false);
                        onOpenEditCompanyModal();
                      }}
                      className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                    >
                      <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Edit Company & Logo</span>
                    </button>
                  )}
                  {onOpenPreferences && (
                    <button
                      onClick={() => {
                        setShowOrgDropdown(false);
                        onOpenPreferences();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                    >
                      <div className="flex items-center space-x-2">
                        <Settings className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Preferences</span>
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono">Ctrl + ,</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowOrgDropdown(false);
                      onOpenNewCompanyModal();
                    }}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Create New Company</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Department Filter Bar */}
          <div className="p-3 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Departments
              </span>
              <button
                onClick={onOpenNewDepartmentModal}
                title="Create New Department"
                className="flex items-center space-x-1 text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold p-0.5 rounded cursor-pointer"
              >
                <FolderPlus className="w-3 h-3" />
                <span>+ Add</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
              {departments.map((dept) => {
                const isActive = selectedDepartment === dept.code;
                return (
                  <button
                    key={dept.id}
                    onClick={() => onSelectDepartment(dept.code)}
                    className={`flex items-center space-x-1 text-xs px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-xs font-semibold"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                    }`}
                  >
                    <span>{getDeptIcon(dept.code)}</span>
                    <span>{dept.code === "all" ? "All" : dept.name.split(" ")[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Channels & Direct Messages (DMs) */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-6 custom-scrollbar">
            {/* Channels Section */}
            <div>
              <div className="flex items-center justify-between px-2 mb-1.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                <span>Channels</span>
                <button
                  onClick={onOpenNewChannelModal}
                  title="Add New Channel"
                  className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-0.5">
                {filteredChannels.map((ch) => {
                  const isActive = activeChannelId === ch.id;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => {
                        onSelectChannel(ch.id);
                        if (onCloseMobile) onCloseMobile();
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-xs font-semibold"
                          : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/70 hover:text-neutral-900 dark:hover:text-white"
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        {ch.isPrivate ? (
                          <Lock className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
                        ) : (
                          <Hash className="w-4 h-4 text-neutral-500 flex-shrink-0" />
                        )}
                        <span className="truncate">{ch.name}</span>
                      </div>

                      {ch.unreadCount && ch.unreadCount > 0 ? (
                        <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[18px] text-center">
                          {ch.unreadCount}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Direct Messages Section */}
            <div>
              <div className="px-2 mb-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                <span>Direct Messages</span>
                <MessageCircle className="w-3 h-3 text-neutral-400" />
              </div>

              <div className="space-y-1">
                {(() => {
                  const seenNames = new Set<string>();
                  return teamMembers
                    .filter((m) => {
                      if (!m || !m.name) return false;
                      const norm = m.name.trim().toLowerCase();
                      if (m.id === currentUser.id || norm === currentUser.name.trim().toLowerCase()) return false;
                      if (seenNames.has(norm)) return false;
                      seenNames.add(norm);
                      return true;
                    })
                    .map((member) => {
                      const dmChannelId = `dm-${[currentUser.id, member.id].sort().join("-")}`;
                      const isDmActive = activeChannelId === dmChannelId;

                    return (
                      <button
                        key={member.id}
                        onClick={() => {
                          onSelectDirectMessage(member);
                          if (onCloseMobile) onCloseMobile();
                        }}
                        className={`w-full group flex items-center justify-between px-2.5 py-1.5 rounded-xl text-sm transition text-left cursor-pointer ${
                          isDmActive
                            ? "bg-indigo-600 text-white font-medium shadow-xs"
                            : "hover:bg-neutral-100 dark:hover:bg-neutral-800/70 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className="relative flex-shrink-0">
                            <img
                              src={member.avatar}
                              alt={member.name}
                              className="w-6 h-6 rounded-lg bg-neutral-200 dark:bg-neutral-800 object-cover"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                                  member.name
                                )}`;
                              }}
                            />
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ${getStatusColor(
                                member.status
                              )}`}
                            />
                          </div>
                          <div className="truncate">
                            <p className="text-xs truncate">{member.name}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 flex-shrink-0">
                          {onRemoveMember && canRemoveMember(currentUser, member).allowed && (
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Are you sure you want to remove ${member.name} from the company?`)) {
                                  onRemoveMember(member.id);
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-rose-500 rounded transition cursor-pointer"
                              title={`Remove ${member.name} from company`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </span>
                          )}
                          <span className="text-[9px] px-1 py-0.2 rounded uppercase font-semibold text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60">
                            {member.department}
                          </span>
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>
            </div>
          </div>

          {/* User Footer Profile */}
          <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/95 flex items-center justify-between">
            <div
              onClick={() => {
                if (onOpenUserProfile) {
                  onOpenUserProfile(currentUser);
                } else {
                  onOpenAuthModal();
                }
              }}
              className="flex items-center space-x-2.5 min-w-0 cursor-pointer flex-1 group"
              title="View profile and status"
            >
              <div className="relative flex-shrink-0">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-xl bg-neutral-200 dark:bg-neutral-800 ring-1 ring-neutral-300 dark:ring-neutral-700 group-hover:ring-indigo-500 transition object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                      currentUser.name
                    )}`;
                  }}
                />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${getStatusColor(
                    currentUser.status
                  )}`}
                />
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition truncate">
                  {currentUser.name}
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 truncate flex items-center space-x-1">
                  <span>●</span>
                  <span>{currentUser.statusText || currentUser.department.toUpperCase()}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1 flex-shrink-0">
              {onOpenPreferences && (
                <button
                  onClick={onOpenPreferences}
                  title="Preferences (Appearance, Themes, Dark/Light mode) [Ctrl+,]"
                  className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 transition cursor-pointer"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onOpenAuthModal}
                title="Switch Account / Edit Profile"
                className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 transition cursor-pointer"
              >
                <Smile className="w-4 h-4" />
              </button>
              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Sign Out"
                  className="text-neutral-500 dark:text-neutral-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-500/10 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
