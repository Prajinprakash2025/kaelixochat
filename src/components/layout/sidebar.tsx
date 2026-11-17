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

  const getStatusColor = (status: WorkspaceMember["status"], isOnline?: boolean) => {
    if (isOnline || status === "online") {
      return "bg-emerald-500 ring-2 ring-white dark:ring-neutral-900";
    }
    switch (status) {
      case "away":
        return "bg-amber-500 ring-2 ring-white dark:ring-neutral-900";
      case "in_call":
        return "bg-rose-500 animate-pulse ring-2 ring-white dark:ring-neutral-900";
      default:
        return "border border-neutral-400 dark:border-neutral-500 bg-transparent ring-1 ring-white dark:ring-neutral-900";
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
          style={{
            backgroundColor: "var(--theme-header-tint, #171717)",
            borderColor: "var(--theme-header-border, rgba(255,255,255,0.1))",
            color: "var(--theme-header-text, #ffffff)",
          }}
          className="w-16 flex-shrink-0 flex flex-col items-center justify-between py-3.5 border-r select-none transition-colors duration-200"
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
                style={
                  activeRailTab === "home"
                    ? {
                        backgroundColor: "var(--theme-sidebar-active-bg, rgba(255,255,255,0.22))",
                        color: "var(--theme-sidebar-active-text, #ffffff)",
                      }
                    : { color: "var(--theme-header-text, #ffffff)" }
                }
                className={`flex flex-col items-center justify-center w-12 py-1.5 rounded-xl transition cursor-pointer ${
                  activeRailTab === "home"
                    ? "font-bold shadow-xs"
                    : "opacity-80 hover:opacity-100 hover:bg-white/10 dark:hover:bg-white/10"
                }`}
                title="Home"
              >
                <HomeIcon className="w-4 h-4" />
                <span className="text-[10px] mt-0.5 font-medium leading-none">Home</span>
              </button>

              <button
                onClick={() => setActiveRailTab("dms")}
                style={
                  activeRailTab === "dms"
                    ? {
                        backgroundColor: "var(--theme-sidebar-active-bg, rgba(255,255,255,0.22))",
                        color: "var(--theme-sidebar-active-text, #ffffff)",
                      }
                    : { color: "var(--theme-header-text, #ffffff)" }
                }
                className={`flex flex-col items-center justify-center w-12 py-1.5 rounded-xl transition cursor-pointer ${
                  activeRailTab === "dms"
                    ? "font-bold shadow-xs"
                    : "opacity-80 hover:opacity-100 hover:bg-white/10 dark:hover:bg-white/10"
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
                style={
                  activeRailTab === "activity"
                    ? {
                        backgroundColor: "var(--theme-sidebar-active-bg, rgba(255,255,255,0.22))",
                        color: "var(--theme-sidebar-active-text, #ffffff)",
                      }
                    : { color: "var(--theme-header-text, #ffffff)" }
                }
                className={`flex flex-col items-center justify-center w-12 py-1.5 rounded-xl transition cursor-pointer ${
                  activeRailTab === "activity"
                    ? "font-bold shadow-xs"
                    : "opacity-80 hover:opacity-100 hover:bg-white/10 dark:hover:bg-white/10"
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
                style={
                  activeRailTab === "games"
                    ? {
                        backgroundColor: "var(--theme-sidebar-active-bg, rgba(255,255,255,0.22))",
                        color: "var(--theme-sidebar-active-text, #ffffff)",
                      }
                    : { color: "var(--theme-header-text, #ffffff)" }
                }
                className={`flex flex-col items-center justify-center w-12 py-1.5 rounded-xl transition cursor-pointer ${
                  activeRailTab === "games"
                    ? "font-bold shadow-xs"
                    : "opacity-80 hover:opacity-100 hover:bg-white/10 dark:hover:bg-white/10"
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
                style={{ color: "var(--theme-header-text, #ffffff)" }}
                className="w-9 h-9 rounded-xl flex items-center justify-center opacity-80 hover:opacity-100 hover:bg-white/10 dark:hover:bg-white/10 transition cursor-pointer"
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
            color: "var(--theme-sidebar-text, #0f172a)",
          }}
          className="w-64 sm:w-72 border-r flex flex-col h-full select-none transition-colors duration-200"
        >
          {/* Workspace Switcher Header */}
          <div
            style={{ borderColor: "var(--theme-sidebar-border, #e2e8f0)" }}
            className="relative p-3.5 border-b"
          >
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                className="flex-1 flex items-center justify-between p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition text-left group min-w-0 cursor-pointer"
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
                      <h1
                        style={{ color: "var(--theme-sidebar-text, #0f172a)" }}
                        className="font-bold text-sm tracking-tight truncate"
                      >
                        {activeOrg.name}
                      </h1>
                      <ChevronDown className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition flex-shrink-0" />
                    </div>
                    <p
                      style={{ color: "var(--theme-sidebar-muted, #64748b)" }}
                      className="text-[11px] truncate capitalize"
                    >
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
          <div
            style={{ borderColor: "var(--theme-sidebar-border, #e2e8f0)" }}
            className="p-3 border-b"
          >
            <div className="flex items-center justify-between mb-2 px-1">
              <span
                style={{ color: "var(--theme-sidebar-muted, #64748b)" }}
                className="text-[11px] font-semibold uppercase tracking-wider"
              >
                Departments
              </span>
              <button
                onClick={onOpenNewDepartmentModal}
                title="Create New Department"
                style={{ color: "var(--theme-sidebar-active-bg, #4f46e5)" }}
                className="flex items-center space-x-1 text-[10px] hover:underline font-semibold p-0.5 rounded cursor-pointer"
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
                    style={
                      isActive
                        ? {
                            backgroundColor: "var(--theme-sidebar-active-bg, #4f46e5)",
                            color: "var(--theme-sidebar-active-text, #ffffff)",
                          }
                        : {
                            backgroundColor: "var(--theme-sidebar-card, rgba(0,0,0,0.05))",
                            color: "var(--theme-sidebar-text, #0f172a)",
                          }
                    }
                    className="flex items-center space-x-1 text-xs px-2.5 py-1 rounded-lg font-medium transition cursor-pointer shadow-2xs"
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
              <div
                style={{ color: "var(--theme-sidebar-muted, #64748b)" }}
                className="flex items-center justify-between px-2 mb-1.5 text-xs font-semibold uppercase tracking-wider"
              >
                <span>Channels</span>
                <button
                  onClick={onOpenNewChannelModal}
                  title="Add New Channel"
                  className="p-1 rounded-md opacity-75 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
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
                      style={
                        isActive
                          ? {
                              backgroundColor: "var(--theme-sidebar-active-bg, #4f46e5)",
                              color: "var(--theme-sidebar-active-text, #ffffff)",
                            }
                          : {
                              color: "var(--theme-sidebar-text, #0f172a)",
                            }
                      }
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-sm font-medium transition cursor-pointer ${
                        isActive
                          ? "shadow-xs font-semibold"
                          : "hover:bg-black/5 dark:hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        {ch.isPrivate ? (
                          <Lock className="w-3.5 h-3.5 opacity-60 flex-shrink-0" />
                        ) : (
                          <Hash className="w-4 h-4 opacity-60 flex-shrink-0" />
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
              <div
                style={{ color: "var(--theme-sidebar-muted, #64748b)" }}
                className="px-2 mb-2 text-xs font-semibold uppercase tracking-wider flex items-center justify-between"
              >
                <span>Direct Messages</span>
                <MessageCircle className="w-3 h-3 opacity-60" />
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
                      const isOnline = Boolean(member.online || member.status === "online");

                      return (
                        <button
                          key={member.id}
                          onClick={() => {
                            onSelectDirectMessage(member);
                            if (onCloseMobile) onCloseMobile();
                          }}
                          style={
                            isDmActive
                              ? {
                                  backgroundColor: "var(--theme-sidebar-active-bg, #4f46e5)",
                                  color: "var(--theme-sidebar-active-text, #ffffff)",
                                }
                              : {
                                  color: "var(--theme-sidebar-text, #0f172a)",
                                }
                          }
                          className={`w-full group flex items-center justify-between px-2.5 py-1.5 rounded-xl text-sm transition text-left cursor-pointer ${
                            isDmActive
                              ? "font-semibold shadow-xs"
                              : "hover:bg-black/5 dark:hover:bg-white/10"
                          }`}
                          title={`${member.name}${member.department ? ` • ${member.department.toUpperCase()}` : ""}${isOnline ? " (Online)" : " (Offline)"}`}
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
                              {isOnline ? (
                                <span
                                  className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-neutral-900 shadow-xs"
                                  title="Online"
                                />
                              ) : (
                                <span
                                  className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-neutral-400 dark:border-neutral-500 bg-transparent ring-1 ring-white dark:ring-neutral-900"
                                  title="Offline"
                                />
                              )}
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
                            {isOnline && (
                              <span
                                className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs flex-shrink-0"
                                title="Online"
                              />
                            )}
                          </div>
                        </button>
                      );
                    });
                })()}
              </div>
            </div>
          </div>

          {/* User Footer Profile */}
          <div
            style={{
              borderColor: "var(--theme-sidebar-border, #e2e8f0)",
              backgroundColor: "var(--theme-sidebar-card, rgba(0,0,0,0.03))",
            }}
            className="p-3 border-t flex items-center justify-between"
          >
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
                <p
                  style={{ color: "var(--theme-sidebar-text, #0f172a)" }}
                  className="text-xs font-semibold group-hover:underline transition truncate"
                >
                  {currentUser.name}
                </p>
                <p
                  style={{ color: "var(--theme-sidebar-muted, #64748b)" }}
                  className="text-[11px] truncate flex items-center space-x-1"
                >
                  <span className="text-emerald-500">●</span>
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
