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
} from "lucide-react";
import { DepartmentCode, Channel, WorkspaceMember, Department, Organization } from "@/types";

interface SidebarProps {
  organizations: Organization[];
  activeOrg: Organization;
  onSelectOrg: (org: Organization) => void;
  onOpenNewCompanyModal: () => void;
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
  onOpenUserProfile?: (member: WorkspaceMember) => void;
  onSelectDirectMessage: (member: WorkspaceMember) => void;
  onLogout?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({
  organizations,
  activeOrg,
  onSelectOrg,
  onOpenNewCompanyModal,
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
  onOpenUserProfile,
  onSelectDirectMessage,
  onLogout,
  isMobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

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
    if (ch.isDm || ch.name.startsWith("dm:") || ch.name.includes(":")) return false; // DMs are handled in Direct Messages section
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
        return "bg-emerald-500 ring-2 ring-neutral-900";
      case "away":
        return "bg-amber-500 ring-2 ring-neutral-900";
      case "in_call":
        return "bg-rose-500 animate-pulse ring-2 ring-neutral-900";
      default:
        return "bg-neutral-500 ring-2 ring-neutral-900";
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

      {/* Main Sidebar Element */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-neutral-900 text-neutral-100 flex flex-col h-screen border-r border-neutral-800 select-none transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          isMobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Workspace / Company Switcher Header */}
        <div className="relative p-3.5 border-b border-neutral-800">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowOrgDropdown(!showOrgDropdown)}
              className="flex-1 flex items-center justify-between p-1.5 rounded-xl hover:bg-neutral-800/80 transition text-left group min-w-0"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md shadow-purple-500/20 flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="truncate">
                  <div className="flex items-center space-x-1.5">
                    <h1 className="font-bold text-sm tracking-tight text-white truncate">
                      {activeOrg.name}
                    </h1>
                    <ChevronDown className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white transition flex-shrink-0" />
                  </div>
                  <p className="text-[11px] text-neutral-400 truncate">
                    Enterprise Workspace
                  </p>
                </div>
              </div>
            </button>

            {/* Mobile close button */}
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-white md:hidden hover:bg-neutral-800 transition ml-1"
              title="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        {/* Invite Code Bar & Invite Team Trigger */}
        <div className="mt-2.5 flex items-center space-x-1.5">
          <button
            onClick={onOpenInviteModal}
            className="flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60 text-xs transition group"
            title="Open Team Invite Modal (Generate link & invite code)"
          >
            <div className="flex items-center space-x-1.5 min-w-0">
              <Share2 className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-300" />
              <span className="text-[11px] font-semibold text-neutral-300 truncate">
                Invite Team
              </span>
            </div>
            {activeOrg.invite_code && (
              <span className="font-mono text-[10px] text-indigo-400 font-bold bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/50">
                {activeOrg.invite_code}
              </span>
            )}
          </button>
          {activeOrg.invite_code && (
            <button
              onClick={handleCopyInvite}
              className="p-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60 text-neutral-400 hover:text-white transition flex-shrink-0"
              title="Copy Invite Code"
            >
              {copiedCode ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>

        {/* Member Directory Navigation Trigger */}
        {onOpenMemberDirectory && (
          <div className="mt-2">
            <button
              onClick={onOpenMemberDirectory}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/60 text-xs transition group cursor-pointer"
              title="Open People & Team Member Directory"
            >
              <div className="flex items-center space-x-1.5 min-w-0">
                <Users className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-300" />
                <span className="text-[11px] font-semibold text-neutral-300 group-hover:text-white truncate">
                  Member Directory
                </span>
              </div>
              <span className="font-mono text-[10px] text-neutral-400 font-bold bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-700">
                {teamMembers.length}
              </span>
            </button>
          </div>
        )}

        {/* Team Arcade & Games Navigation Trigger */}
        {onOpenGamesModal && (
          <div className="mt-1.5">
            <button
              onClick={onOpenGamesModal}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/60 text-xs transition group cursor-pointer"
              title="Open Team Arcade (Snake, Duo Tic-Tac-Toe, Reflex Duel)"
            >
              <div className="flex items-center space-x-1.5 min-w-0">
                <Gamepad2 className="w-3.5 h-3.5 text-emerald-400 group-hover:text-emerald-300" />
                <span className="text-[11px] font-semibold text-neutral-300 group-hover:text-white truncate">
                  Team Arcade
                </span>
              </div>
              <span className="font-mono text-[9px] text-emerald-400 font-extrabold bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-800/70">
                PLAY
              </span>
            </button>
          </div>
        )}

        {/* Company Switcher Dropdown */}
        {showOrgDropdown && (
          <div className="absolute top-16 left-3 right-3 bg-neutral-850 border border-neutral-700 rounded-2xl shadow-2xl p-2 z-30 space-y-1 bg-neutral-900">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Workspaces
            </div>
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => {
                  onSelectOrg(org);
                  setShowOrgDropdown(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition ${
                  org.id === activeOrg.id
                    ? "bg-indigo-600 text-white"
                    : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{org.name}</span>
                </div>
                {org.id === activeOrg.id && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}

            <div className="pt-1.5 border-t border-neutral-800">
              <button
                onClick={() => {
                  setShowOrgDropdown(false);
                  onOpenNewCompanyModal();
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:bg-neutral-800 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Create New Company</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Department Filter Bar & Add Department */}
      <div className="p-3 border-b border-neutral-800/60">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Departments
          </span>
          <button
            onClick={onOpenNewDepartmentModal}
            title="Create New Department"
            className="flex items-center space-x-1 text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold p-0.5 rounded hover:bg-neutral-800 transition"
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
                className={`flex items-center space-x-1 text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 font-semibold"
                    : "bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700/80 hover:text-white"
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
          <div className="flex items-center justify-between px-2 mb-1.5 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            <span>Channels</span>
            <button
              onClick={onOpenNewChannelModal}
              title="Add New Channel"
              className="p-1 hover:bg-neutral-800 rounded-md text-neutral-400 hover:text-white transition"
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
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-neutral-300 hover:bg-neutral-800/70 hover:text-white"
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    {ch.isPrivate ? (
                      <Lock className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                    ) : (
                      <Hash className="w-4 h-4 text-neutral-400 flex-shrink-0" />
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

        {/* 1-on-1 Direct Messages (DMs) */}
        <div>
          <div className="px-2 mb-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
            <span>Direct Messages</span>
            <MessageCircle className="w-3 h-3 text-neutral-500" />
          </div>

          <div className="space-y-1">
            {teamMembers
              .filter((m) => m.id !== currentUser.id)
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
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-sm transition text-left ${
                      isDmActive
                        ? "bg-indigo-600 text-white font-medium"
                        : "hover:bg-neutral-800/70 text-neutral-300 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="relative flex-shrink-0">
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-6 h-6 rounded-lg bg-neutral-800 object-cover"
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

                    <span className="text-[9px] px-1 py-0.2 rounded uppercase font-semibold text-neutral-400 bg-neutral-800 border border-neutral-700/60">
                      {member.department}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      </div>

      {/* User Footer Profile & Slack Auth Trigger */}
      <div className="p-3 border-t border-neutral-800 bg-neutral-900/95 flex items-center justify-between">
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
              className="w-8 h-8 rounded-xl bg-neutral-800 ring-1 ring-neutral-700 group-hover:ring-indigo-500 transition object-cover"
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
            <p className="text-xs font-semibold text-neutral-100 group-hover:text-indigo-300 transition truncate">
              {currentUser.name}
            </p>
            <p className="text-[11px] text-emerald-400 truncate flex items-center space-x-1">
              <span>●</span>
              <span>{currentUser.statusText || currentUser.department.toUpperCase()}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1 flex-shrink-0">
          <button
            onClick={onOpenAuthModal}
            title="Switch Account / Edit Profile"
            className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition"
          >
            <Smile className="w-4 h-4" />
          </button>
          {onLogout && (
            <button
              onClick={onLogout}
              title="Sign Out"
              className="text-neutral-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
    </>
  );
}
