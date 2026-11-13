"use client";

import React, { useState } from "react";
import {
  Hash,
  Lock,
  Plus,
  Clock,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Search,
  Bell,
  MoreHorizontal,
  Home as HomeIcon,
  MessageCircle,
  FileText,
  Building2,
  Users,
  Gamepad2,
  Settings,
  LogOut,
  Sparkles,
  Paperclip,
  Share2,
  Check,
  X,
  ExternalLink,
  Filter,
  Trash2,
} from "lucide-react";
import {
  Channel,
  WorkspaceMember,
  Organization,
  Message,
  Notification,
} from "@/types";
import { PresenceMap } from "@/utils/realtime";
import { canRemoveMember } from "@/utils/permissions";

export type MobileTabType = "home" | "dms" | "activity" | "search" | "more";

interface MobileSlackViewProps {
  organizations: Organization[];
  activeOrg: Organization;
  onSelectOrg: (org: Organization) => void;
  channels: Channel[];
  activeChannelId: string;
  onSelectChannel: (channelId: string) => void;
  teamMembers: WorkspaceMember[];
  currentUser: WorkspaceMember;
  onSelectDirectMessage: (member: WorkspaceMember) => void;
  messagesByChannel: Record<string, Message[]>;
  notifications: Notification[];
  presenceMap: PresenceMap;
  activeTab: MobileTabType;
  onChangeTab: (tab: MobileTabType) => void;
  onOpenNewChannelModal: () => void;
  onOpenInviteModal: () => void;
  onOpenMemberDirectory: () => void;
  onOpenGamesModal: () => void;
  onOpenPreferences: () => void;
  onOpenUserProfile: (member: WorkspaceMember) => void;
  onLogout: () => void;
  onRemoveMember?: (memberId: string) => void;
}

export function MobileSlackView({
  organizations,
  activeOrg,
  onSelectOrg,
  channels,
  activeChannelId,
  onSelectChannel,
  teamMembers,
  currentUser,
  onSelectDirectMessage,
  messagesByChannel,
  notifications,
  presenceMap,
  activeTab,
  onChangeTab,
  onOpenNewChannelModal,
  onOpenInviteModal,
  onOpenMemberDirectory,
  onOpenGamesModal,
  onOpenPreferences,
  onOpenUserProfile,
  onLogout,
  onRemoveMember,
}: MobileSlackViewProps) {
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [isDmsExpanded, setIsDmsExpanded] = useState(true);
  const [isChannelsExpanded, setIsChannelsExpanded] = useState(true);
  const [dmFilter, setDmFilter] = useState<"all" | "unread" | "external">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFabMenu, setShowFabMenu] = useState(false);

  // Presence helper
  const isUserOnline = (member: WorkspaceMember) => {
    if (presenceMap[member.id]) {
      return presenceMap[member.id].status === "online";
    }
    return member.online || member.status === "online";
  };

  // Get last message snippet for a DM
  const getDmSnippet = (member: WorkspaceMember) => {
    // Look up in messagesByChannel using channel id or recipient
    for (const [key, msgs] of Object.entries(messagesByChannel)) {
      if (
        (key.includes(member.id) || key.includes(member.name)) &&
        msgs.length > 0
      ) {
        const lastMsg = msgs[msgs.length - 1];
        return lastMsg;
      }
    }
    return null;
  };

  // Filter channels (exclude DMs)
  const regularChannels = channels.filter((c) => !c.isDm);

  // Deduplicated members excluding current user
  const uniqueTeamMembers = React.useMemo(() => {
    const seen = new Set<string>();
    return teamMembers.filter((m) => {
      if (!m || !m.name) return false;
      const key = m.name.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [teamMembers]);

  const otherMembers = uniqueTeamMembers.filter(
    (m) => m.id !== currentUser.id && m.name.trim().toLowerCase() !== currentUser.name.trim().toLowerCase()
  );

  return (
    <div className="flex flex-col h-screen w-full bg-[#121517] text-neutral-100 select-none overflow-hidden">
      {/* =========================================================================
          TOP MOBILE BRANDED HEADER (Slack Forest Green / Branded Bar)
          ========================================================================= */}
      <header className="bg-[#143621] text-white px-4 pt-3 pb-3 flex items-center justify-between flex-shrink-0 shadow-sm border-b border-[#1b432a]">
        {activeTab === "home" ? (
          <div className="flex items-center space-x-2.5">
            {/* Workspace Logo Squircle */}
            <div
              onClick={() => setShowOrgDropdown(!showOrgDropdown)}
              className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 via-indigo-600 to-amber-500 flex items-center justify-center text-white font-extrabold text-xs shadow-md cursor-pointer flex-shrink-0"
            >
              {activeOrg.name.charAt(0)}
            </div>
            {/* Workspace Name + Dropdown Chevron */}
            <button
              type="button"
              onClick={() => setShowOrgDropdown(!showOrgDropdown)}
              className="flex items-center space-x-1 font-bold text-lg tracking-tight hover:opacity-90 cursor-pointer"
            >
              <span>{activeOrg.name}</span>
              <ChevronDown className="w-4 h-4 text-neutral-300" />
            </button>
          </div>
        ) : activeTab === "dms" ? (
          <h1 className="font-bold text-xl tracking-tight">Direct messages</h1>
        ) : activeTab === "activity" ? (
          <h1 className="font-bold text-xl tracking-tight">Activity</h1>
        ) : activeTab === "search" ? (
          <h1 className="font-bold text-xl tracking-tight">Search</h1>
        ) : (
          <h1 className="font-bold text-xl tracking-tight">More</h1>
        )}

        {/* Right side header actions */}
        <div className="flex items-center space-x-3">
          {activeTab === "home" && (
            <button
              type="button"
              onClick={() => onChangeTab("search")}
              className="p-1.5 rounded-full hover:bg-white/10 text-neutral-200 transition cursor-pointer"
              title="Recent history & search"
            >
              <Clock className="w-5 h-5" />
            </button>
          )}

          {/* Current User Avatar with Online Indicator */}
          <div
            onClick={() => onOpenUserProfile(currentUser)}
            className="relative cursor-pointer"
            title="My Profile"
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-8 h-8 rounded-xl object-cover bg-neutral-800 ring-1 ring-white/20"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#143621]" />
          </div>
        </div>
      </header>

      {/* Workspace Switcher Modal / Dropdown */}
      {showOrgDropdown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1d21] border border-neutral-700 rounded-2xl w-full max-w-sm p-4 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="font-bold text-base">Workspaces</h3>
              <button
                onClick={() => setShowOrgDropdown(false)}
                className="p-1 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-3 space-y-2">
              {organizations.map((org) => (
                <div
                  key={org.id}
                  onClick={() => {
                    onSelectOrg(org);
                    setShowOrgDropdown(false);
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition ${
                    org.id === activeOrg.id
                      ? "bg-emerald-950/60 border border-emerald-600/40"
                      : "hover:bg-neutral-800/60"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-sm">
                      {org.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{org.name}</p>
                      <p className="text-xs text-neutral-400">{org.slug}.kaelixo.com</p>
                    </div>
                  </div>
                  {org.id === activeOrg.id && (
                    <Check className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
              <button
                onClick={() => {
                  setShowOrgDropdown(false);
                  onOpenInviteModal();
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium py-1"
              >
                + Invite Teammates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB BODY CONTENT
          ========================================================================= */}
      <main className="flex-1 overflow-y-auto custom-scrollbar pb-24">
        {/* -------------------------------------------------------------------
            1. HOME TAB (Channels, DMs, Apps matching Screenshot 1)
            ------------------------------------------------------------------- */}
        {activeTab === "home" && (
          <div className="divide-y divide-neutral-800/80">
            {/* Channels Section */}
            <div className="py-2">
              <div
                onClick={() => setIsChannelsExpanded(!isChannelsExpanded)}
                className="flex items-center justify-between px-4 py-2 cursor-pointer text-neutral-300 hover:text-white"
              >
                <div className="flex items-center space-x-2">
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isChannelsExpanded ? "" : "-rotate-90"
                    }`}
                  />
                  <span className="text-sm font-semibold tracking-wide">Channels</span>
                </div>
              </div>

              {isChannelsExpanded && (
                <div className="space-y-0.5 px-2">
                  {regularChannels.map((c) => {
                    const isActive = c.id === activeChannelId;
                    return (
                      <div
                        key={c.id}
                        onClick={() => onSelectChannel(c.id)}
                        className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl cursor-pointer transition ${
                          isActive
                            ? "bg-neutral-800/80 text-white font-semibold"
                            : "text-neutral-300 hover:bg-neutral-800/50 hover:text-white"
                        }`}
                      >
                        {c.isPrivate ? (
                          <Lock className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                        ) : (
                          <Hash className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                        )}
                        <span className="text-sm tracking-tight truncate flex-1">
                          {c.name}
                        </span>
                      </div>
                    );
                  })}

                  {/* + Add Channel Button */}
                  <div
                    onClick={onOpenNewChannelModal}
                    className="flex items-center space-x-3 px-3 py-2.5 text-neutral-400 hover:text-white cursor-pointer transition rounded-xl hover:bg-neutral-800/50"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">Add channel</span>
                  </div>
                </div>
              )}
            </div>

            {/* Direct Messages Section */}
            <div className="py-2">
              <div
                onClick={() => setIsDmsExpanded(!isDmsExpanded)}
                className="flex items-center justify-between px-4 py-2 cursor-pointer text-neutral-300 hover:text-white"
              >
                <div className="flex items-center space-x-2">
                  <MessageCircle className="w-4 h-4 text-neutral-400" />
                  <span className="text-sm font-semibold tracking-wide">
                    Direct messages
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${
                    isDmsExpanded ? "" : "-rotate-90"
                  }`}
                />
              </div>

              {isDmsExpanded && (
                <div className="space-y-0.5 px-2">
                  {/* Current User (You) */}
                  <div
                    onClick={() => onSelectDirectMessage(currentUser)}
                    className="flex items-center space-x-3 px-3 py-2 rounded-xl cursor-pointer hover:bg-neutral-800/50 transition text-neutral-300 hover:text-white"
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={currentUser.avatar}
                        alt={currentUser.name}
                        className="w-7 h-7 rounded-xl object-cover bg-neutral-800"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[#121517]" />
                    </div>
                    <span className="text-sm truncate">
                      {currentUser.name} <span className="text-neutral-500 text-xs">(you)</span>
                    </span>
                  </div>

                  {/* Teammates List */}
                  {otherMembers.map((member) => {
                    const online = isUserOnline(member);
                    return (
                      <div
                        key={member.id}
                        onClick={() => onSelectDirectMessage(member)}
                        className="flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer hover:bg-neutral-800/50 transition text-neutral-300 hover:text-white"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="relative flex-shrink-0">
                            <img
                              src={member.avatar}
                              alt={member.name}
                              className="w-7 h-7 rounded-xl object-cover bg-neutral-800"
                            />
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-[#121517] ${
                                online ? "bg-emerald-500" : "bg-neutral-500"
                              }`}
                            />
                          </div>
                          <span className="text-sm truncate">{member.name}</span>
                        </div>
                        {onRemoveMember && canRemoveMember(currentUser, member).allowed && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Are you sure you want to remove ${member.name} from the company?`)) {
                                onRemoveMember(member.id);
                              }
                            }}
                            className="p-1.5 text-neutral-500 hover:text-rose-400 rounded-lg hover:bg-neutral-700/60 transition cursor-pointer"
                            title={`Remove ${member.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Apps Section */}
            <div className="py-2">
              <div
                onClick={onOpenGamesModal}
                className="flex items-center justify-between px-4 py-2.5 text-neutral-300 hover:text-white cursor-pointer rounded-xl hover:bg-neutral-800/40 transition mx-2"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 grid grid-cols-2 gap-0.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-400" />
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                  </div>
                  <span className="text-sm font-semibold">Apps & Games</span>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-500" />
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------
            2. DMS TAB (Carousel + Filter Chips + Rich List - Screenshot 2)
            ------------------------------------------------------------------- */}
        {activeTab === "dms" && (
          <div className="pt-2">
            {/* Top Horizontal Teammates Carousel (Stories / Quick Contacts) */}
            <div className="px-3 pb-3 overflow-x-auto no-scrollbar flex items-center space-x-3 border-b border-neutral-800/80">
              {otherMembers.map((member) => {
                const online = isUserOnline(member);
                return (
                  <div
                    key={member.id}
                    onClick={() => onSelectDirectMessage(member)}
                    className="flex flex-col items-center flex-shrink-0 cursor-pointer group"
                    style={{ width: "64px" }}
                  >
                    <div className="relative mb-1">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-12 h-12 rounded-2xl object-cover bg-neutral-800 ring-1 ring-white/10 group-hover:scale-105 transition"
                      />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-[#121517] ${
                          online ? "bg-emerald-500" : "bg-neutral-500"
                        }`}
                      />
                    </div>
                    <span className="text-[11px] text-neutral-300 group-hover:text-white truncate w-full text-center">
                      {member.name.split(" ")[0]}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Filter Chips: [All], [Unread messages], [External] */}
            <div className="flex items-center space-x-2 px-4 py-3">
              <button
                type="button"
                onClick={() => setDmFilter("all")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  dmFilter === "all"
                    ? "bg-[#14532d] text-white border border-[#22c55e]/40 shadow-xs"
                    : "bg-neutral-800/80 text-neutral-300 hover:text-white border border-neutral-700/60"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setDmFilter("unread")}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  dmFilter === "unread"
                    ? "bg-[#14532d] text-white border border-[#22c55e]/40 shadow-xs"
                    : "bg-neutral-800/80 text-neutral-300 hover:text-white border border-neutral-700/60"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Unread messages</span>
              </button>
              <button
                type="button"
                onClick={() => setDmFilter("external")}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  dmFilter === "external"
                    ? "bg-[#14532d] text-white border border-[#22c55e]/40 shadow-xs"
                    : "bg-neutral-800/80 text-neutral-300 hover:text-white border border-neutral-700/60"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>External</span>
              </button>
            </div>

            {/* Rich DM Conversations List */}
            <div className="divide-y divide-neutral-800/60">
              {otherMembers.map((member) => {
                const snippet = getDmSnippet(member);
                const online = isUserOnline(member);
                return (
                  <div
                    key={member.id}
                    onClick={() => onSelectDirectMessage(member)}
                    className="flex items-start space-x-3 px-4 py-3 hover:bg-neutral-800/40 transition cursor-pointer"
                  >
                    {/* Avatar with Status Dot */}
                    <div className="relative flex-shrink-0 mt-0.5">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-10 h-10 rounded-2xl object-cover bg-neutral-800"
                      />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#121517] ${
                          online ? "bg-emerald-500" : "bg-neutral-500"
                        }`}
                      />
                    </div>

                    {/* Middle: Name + Snippet */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h3 className="font-semibold text-sm text-neutral-100 truncate">
                          {member.name}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <span className="text-[11px] text-neutral-400">
                            {snippet ? "2h" : "active"}
                          </span>
                          {onRemoveMember && canRemoveMember(currentUser, member).allowed && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Are you sure you want to remove ${member.name} from the company?`)) {
                                  onRemoveMember(member.id);
                                }
                              }}
                              className="p-1 text-neutral-500 hover:text-rose-400 rounded hover:bg-neutral-800 transition cursor-pointer"
                              title={`Remove ${member.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {snippet ? (
                        snippet.attachments && snippet.attachments.length > 0 ? (
                          <div className="mt-1 flex items-center space-x-2 bg-neutral-800/80 border border-neutral-700/70 px-2.5 py-1 rounded-xl max-w-fit">
                            <FileText className="w-4 h-4 text-rose-400" />
                            <span className="text-xs text-neutral-200 font-medium truncate max-w-[170px]">
                              {snippet.attachments[0].name}
                            </span>
                            <span className="text-[10px] text-neutral-400">
                              pdf
                            </span>
                          </div>
                        ) : (
                          <p className="text-xs text-neutral-400 truncate">
                            {snippet.content || "Started a conversation"}
                          </p>
                        )
                      ) : (
                        <p className="text-xs text-neutral-500 truncate">
                          {member.role || "Member"} • {member.department}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------
            3. ACTIVITY TAB (Notifications, Mentions, Replies)
            ------------------------------------------------------------------- */}
        {activeTab === "activity" && (
          <div className="p-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
              Recent Notifications
            </h2>
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-neutral-500">
                <Bell className="w-10 h-10 mx-auto mb-2 text-neutral-600" />
                <p className="text-sm font-medium">All caught up!</p>
                <p className="text-xs text-neutral-500 mt-1">
                  You have no unread notifications or mentions.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-3 bg-neutral-800/60 rounded-xl border border-neutral-800 flex items-start space-x-3"
                  >
                    <Bell className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-neutral-200">
                        {n.senderName || "New notification"} • #{n.channelName || "general"}
                      </p>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {n.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* -------------------------------------------------------------------
            4. SEARCH TAB (Instant search across channels, DMs, files)
            ------------------------------------------------------------------- */}
        {activeTab === "search" && (
          <div className="p-4">
            <div className="relative mb-4">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages, channels, or files..."
                className="w-full pl-9 pr-3 py-2 bg-neutral-800/80 border border-neutral-700/80 rounded-xl text-sm text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                  Matching Channels
                </h3>
                <div className="space-y-1">
                  {channels
                    .filter((c) =>
                      c.name.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .slice(0, 5)
                    .map((c) => (
                      <div
                        key={c.id}
                        onClick={() => onSelectChannel(c.id)}
                        className="p-2.5 bg-neutral-800/40 rounded-xl flex items-center space-x-2 text-sm text-neutral-200 cursor-pointer hover:bg-neutral-800"
                      >
                        <Hash className="w-4 h-4 text-neutral-400" />
                        <span>{c.name}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                  People
                </h3>
                <div className="space-y-1">
                  {teamMembers
                    .filter((m) =>
                      m.name.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .slice(0, 5)
                    .map((m) => (
                      <div
                        key={m.id}
                        onClick={() => onSelectDirectMessage(m)}
                        className="p-2.5 bg-neutral-800/40 rounded-xl flex items-center space-x-3 text-sm text-neutral-200 cursor-pointer hover:bg-neutral-800"
                      >
                        <img
                          src={m.avatar}
                          alt={m.name}
                          className="w-6 h-6 rounded-lg object-cover"
                        />
                        <span>{m.name}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------
            5. MORE TAB (Files, External connections, Preferences - Screenshot 3)
            ------------------------------------------------------------------- */}
        {activeTab === "more" && (
          <div className="p-4 space-y-4">
            {/* Options List matching Screenshot 3 */}
            <div className="bg-neutral-800/50 border border-neutral-800 rounded-2xl divide-y divide-neutral-800/80 overflow-hidden">
              {/* Files */}
              <div
                onClick={onOpenPreferences}
                className="flex items-start space-x-3 p-4 hover:bg-neutral-800 transition cursor-pointer"
              >
                <FileText className="w-5 h-5 text-neutral-300 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-neutral-100">Files</h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Browse your canvases, lists and attachments
                  </p>
                </div>
              </div>

              {/* External Connections [PRO] */}
              <div
                onClick={onOpenInviteModal}
                className="flex items-start space-x-3 p-4 hover:bg-neutral-800 transition cursor-pointer"
              >
                <Building2 className="w-5 h-5 text-neutral-300 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-semibold text-neutral-100">
                      External connections
                    </h3>
                    <span className="px-1.5 py-0.5 rounded bg-purple-900/60 border border-purple-500/40 text-[10px] font-bold text-purple-300 uppercase">
                      PRO
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Work with people from other organisations
                  </p>
                </div>
              </div>

              {/* Member Directory */}
              <div
                onClick={onOpenMemberDirectory}
                className="flex items-start space-x-3 p-4 hover:bg-neutral-800 transition cursor-pointer"
              >
                <Users className="w-5 h-5 text-neutral-300 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-neutral-100">
                    Member Directory
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    View team roles, departments and contact info
                  </p>
                </div>
              </div>

              {/* Preferences & Appearance */}
              <div
                onClick={onOpenPreferences}
                className="flex items-start space-x-3 p-4 hover:bg-neutral-800 transition cursor-pointer"
              >
                <Settings className="w-5 h-5 text-neutral-300 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-neutral-100">
                    Preferences & Themes
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Dark mode, notifications, language & sounds
                  </p>
                </div>
              </div>

              {/* Arcade / Games */}
              <div
                onClick={onOpenGamesModal}
                className="flex items-start space-x-3 p-4 hover:bg-neutral-800 transition cursor-pointer"
              >
                <Gamepad2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-neutral-100">
                    Team Games & Arcade
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Play multiplayer mini-games during team breaks
                  </p>
                </div>
              </div>

              {/* Sign Out */}
              <div
                onClick={onLogout}
                className="flex items-start space-x-3 p-4 hover:bg-neutral-800 transition cursor-pointer text-rose-400"
              >
                <LogOut className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold">Sign Out</h3>
                  <p className="text-xs text-rose-400/70 mt-0.5">
                    Sign out of {activeOrg.name} on this device
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* =========================================================================
          FLOATING ACTION BUTTON (FAB) - Green Squircle with +
          ========================================================================= */}
      <div className="fixed bottom-20 right-4 z-30">
        <button
          type="button"
          onClick={() => setShowFabMenu(!showFabMenu)}
          className="w-13 h-13 rounded-2xl bg-[#007a5a] hover:bg-[#00664b] active:scale-95 text-white flex items-center justify-center shadow-2xl transition cursor-pointer"
          title="New Message or Channel"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>

        {/* FAB Quick Menu Modal */}
        {showFabMenu && (
          <div className="absolute bottom-16 right-0 w-48 bg-[#1a1d21] border border-neutral-700 rounded-2xl shadow-2xl py-2 z-40 text-sm">
            <button
              onClick={() => {
                setShowFabMenu(false);
                onChangeTab("dms");
              }}
              className="w-full text-left px-4 py-2 hover:bg-neutral-800 text-neutral-200 flex items-center space-x-2"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>New direct message</span>
            </button>
            <button
              onClick={() => {
                setShowFabMenu(false);
                onOpenNewChannelModal();
              }}
              className="w-full text-left px-4 py-2 hover:bg-neutral-800 text-neutral-200 flex items-center space-x-2"
            >
              <Hash className="w-4 h-4 text-indigo-400" />
              <span>Create channel</span>
            </button>
            <button
              onClick={() => {
                setShowFabMenu(false);
                onOpenInviteModal();
              }}
              className="w-full text-left px-4 py-2 hover:bg-neutral-800 text-neutral-200 flex items-center space-x-2"
            >
              <Share2 className="w-4 h-4 text-amber-400" />
              <span>Invite people</span>
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
          FIXED MOBILE BOTTOM TAB NAVIGATION BAR (Home, DMs, Activity, Search, More)
          ========================================================================= */}
      <nav className="fixed bottom-0 inset-x-0 bg-[#121517] border-t border-neutral-800/90 h-16 z-40 px-2 flex items-center justify-around select-none">
        {/* Home */}
        <button
          type="button"
          onClick={() => onChangeTab("home")}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
            activeTab === "home" ? "text-white" : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <div
            className={`flex items-center justify-center px-4 py-1 rounded-full transition ${
              activeTab === "home" ? "bg-[#14532d]" : ""
            }`}
          >
            <HomeIcon className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium mt-0.5">Home</span>
        </button>

        {/* DMs */}
        <button
          type="button"
          onClick={() => onChangeTab("dms")}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
            activeTab === "dms" ? "text-white" : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <div
            className={`flex items-center justify-center px-4 py-1 rounded-full transition ${
              activeTab === "dms" ? "bg-[#14532d]" : ""
            }`}
          >
            <MessageSquare className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium mt-0.5">DMs</span>
        </button>

        {/* Activity */}
        <button
          type="button"
          onClick={() => onChangeTab("activity")}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer relative ${
            activeTab === "activity" ? "text-white" : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <div
            className={`flex items-center justify-center px-4 py-1 rounded-full transition ${
              activeTab === "activity" ? "bg-[#14532d]" : ""
            }`}
          >
            <Bell className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium mt-0.5">Activity</span>
          {notifications.length > 0 && (
            <span className="absolute top-1.5 right-6 w-2 h-2 rounded-full bg-emerald-500" />
          )}
        </button>

        {/* Search */}
        <button
          type="button"
          onClick={() => onChangeTab("search")}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
            activeTab === "search" ? "text-white" : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <div
            className={`flex items-center justify-center px-4 py-1 rounded-full transition ${
              activeTab === "search" ? "bg-[#14532d]" : ""
            }`}
          >
            <Search className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium mt-0.5">Search</span>
        </button>

        {/* More */}
        <button
          type="button"
          onClick={() => onChangeTab("more")}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
            activeTab === "more" ? "text-white" : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <div
            className={`flex items-center justify-center px-4 py-1 rounded-full transition ${
              activeTab === "more" ? "bg-[#14532d]" : ""
            }`}
          >
            <MoreHorizontal className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium mt-0.5">More</span>
        </button>
      </nav>
    </div>
  );
}
