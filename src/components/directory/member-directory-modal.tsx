"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Search,
  UserPlus,
  MessageCircle,
  User,
  LayoutGrid,
  List,
  Mail,
  Phone,
  Shield,
  Trash2,
  Building2,
  Link as LinkIcon,
  Check,
  AlertTriangle,
} from "lucide-react";
import { WorkspaceMember, Department, Organization } from "@/types";
import {
  isWorkspaceOwner,
  canAddMember,
  canRemoveMember,
  formatRoleLabel,
} from "@/utils/permissions";

export interface MemberDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: WorkspaceMember[];
  currentUser: WorkspaceMember;
  departments: Department[];
  activeOrg: Organization;
  onSelectMemberForDm: (member: WorkspaceMember) => void;
  onOpenProfileDrawer?: (member: WorkspaceMember) => void;
  onOpenAddMemberModal: () => void;
  onRemoveMember: (memberId: string) => void;
  onToggleDeactivateMember?: (memberId: string, active: boolean) => void;
}

export function MemberDirectoryModal({
  isOpen,
  onClose,
  members,
  currentUser,
  departments,
  activeOrg,
  onSelectMemberForDm,
  onOpenProfileDrawer,
  onOpenAddMemberModal,
  onRemoveMember,
  onToggleDeactivateMember,
}: MemberDirectoryModalProps) {
  const [activeTab, setActiveTab] = useState<"people" | "departments" | "invitations">("people");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [memberPendingRemoval, setMemberPendingRemoval] = useState<WorkspaceMember | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Filter members based on search and department
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      // Department filter
      if (selectedDept !== "all" && member.department !== selectedDept) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const nameMatch = member.name?.toLowerCase().includes(query);
        const emailMatch = member.email?.toLowerCase().includes(query);
        const roleMatch = member.role?.toLowerCase().includes(query);
        const deptMatch = member.department?.toLowerCase().includes(query);
        return nameMatch || emailMatch || roleMatch || deptMatch;
      }
      return true;
    });
  }, [members, selectedDept, searchQuery]);

  if (!isOpen) return null;

  const userCanAdd = canAddMember(currentUser);

  const getStatusColor = (status: WorkspaceMember["status"], isOnline?: boolean) => {
    if (status === "in_call") return "bg-rose-500 ring-2 ring-white dark:ring-neutral-900 animate-pulse";
    if (status === "away") return "bg-amber-500 ring-2 ring-white dark:ring-neutral-900";
    if (isOnline || status === "online") return "bg-emerald-500 ring-2 ring-white dark:ring-neutral-900";
    return "bg-neutral-400 ring-2 ring-white dark:ring-neutral-900";
  };

  const getRoleBadgeStyle = (role: WorkspaceMember["role"]) => {
    const formatted = formatRoleLabel(role);
    switch (formatted) {
      case "Workspace Owner":
        return "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
      case "Department Head":
      case "Manager":
        return "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      default:
        return "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700";
    }
  };

  const handleCopyInviteLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const inviteUrl = `${origin}?invite=${activeOrg.invite_code || "kaelixo-prod"}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Top Header */}
        <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-bold text-lg text-neutral-900 dark:text-neutral-100">
                  People &amp; Member Directory
                </h2>
                <span className="text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded-full font-mono border border-neutral-200 dark:border-neutral-700">
                  {members.length} members
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Browse colleagues, connect directly, and manage department permissions.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            {userCanAdd && (
              <button
                onClick={onOpenAddMemberModal}
                className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition cursor-pointer"
                title="Add new member to workspace"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Member</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              title="Close Directory (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800 px-6 pt-3 bg-neutral-50/50 dark:bg-neutral-900/50">
          <button
            onClick={() => setActiveTab("people")}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === "people"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}
          >
            People ({members.length})
          </button>
          <button
            onClick={() => setActiveTab("departments")}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === "departments"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}
          >
            Departments ({departments.filter((d) => d.code !== "all").length})
          </button>
          <button
            onClick={() => setActiveTab("invitations")}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === "invitations"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}
          >
            Workspace Invitations
          </button>
        </div>

        {/* Tab 1: People Content */}
        {activeTab === "people" && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Search, Filter & View Mode Controls */}
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email, role, or department..."
                  className="w-full pl-9 pr-4 py-2 bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              {/* Department Filter & View Switcher */}
              <div className="flex items-center space-x-2">
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="px-3 py-2 bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                >
                  <option value="all">All Departments</option>
                  {departments
                    .filter((d) => d.code !== "all")
                    .map((dept) => (
                      <option key={dept.id} value={dept.code}>
                        {dept.name}
                      </option>
                    ))}
                </select>

                <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-0.5">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded-lg text-xs transition ${
                      viewMode === "grid"
                        ? "bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                    }`}
                    title="Grid Card View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-1.5 rounded-lg text-xs transition ${
                      viewMode === "list"
                        ? "bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                    }`}
                    title="List Table View"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Members View Body */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {filteredMembers.length === 0 ? (
                <div className="py-16 text-center">
                  <User className="w-10 h-10 text-neutral-300 dark:text-neutral-700 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                    No members found
                  </p>
                  <p className="text-xs text-neutral-400 mt-1">
                    Try adjusting your search query or department filter.
                  </p>
                </div>
              ) : viewMode === "grid" ? (
                /* Grid View */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMembers.map((member) => {
                    const removeCheck = canRemoveMember(currentUser, member);
                    const isSelf = currentUser.id === member.id;

                    return (
                      <div
                        key={member.id}
                        className={`p-4 rounded-2xl border transition bg-white dark:bg-neutral-800/40 hover:shadow-md flex flex-col justify-between ${
                          member.isActive === false
                            ? "border-neutral-200 dark:border-neutral-800 opacity-60"
                            : "border-neutral-200 dark:border-neutral-800 hover:border-indigo-300 dark:hover:border-indigo-700"
                        }`}
                      >
                        {/* Member Header */}
                        <div>
                          <div className="flex items-start justify-between mb-3">
                            <div className="relative">
                              <img
                                src={
                                  member.avatar ||
                                  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                                    member.name
                                  )}`
                                }
                                alt={member.name}
                                className="w-12 h-12 rounded-2xl object-cover bg-neutral-200 dark:bg-neutral-700 ring-2 ring-neutral-200 dark:ring-neutral-700"
                              />
                              <span
                                className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full ${getStatusColor(
                                  member.status,
                                  member.online
                                )}`}
                                title={member.status}
                              />
                            </div>

                            <span
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${getRoleBadgeStyle(
                                member.role
                              )}`}
                            >
                              {formatRoleLabel(member.role)}
                            </span>
                          </div>

                          <div className="mb-2">
                            <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100 flex items-center space-x-1.5">
                              <span>{member.name}</span>
                              {isSelf && (
                                <span className="text-[10px] font-medium text-neutral-400">
                                  (You)
                                </span>
                              )}
                            </h3>
                            {member.displayName && member.displayName !== member.name && (
                              <p className="text-[11px] text-neutral-400">@{member.displayName}</p>
                            )}
                            <span className="inline-block mt-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md uppercase">
                              {member.department}
                            </span>
                          </div>

                          {member.statusText && (
                            <p className="text-xs text-neutral-600 dark:text-neutral-400 italic mb-2 line-clamp-1">
                              {member.statusEmoji} {member.statusText}
                            </p>
                          )}

                          <div className="space-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                            <div className="flex items-center space-x-1.5 truncate">
                              <Mail className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                              <span className="truncate">{member.email}</span>
                            </div>
                            {member.phone && (
                              <div className="flex items-center space-x-1.5">
                                <Phone className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                                <span>{member.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-1.5">
                            {!isSelf && (
                              <button
                                onClick={() => {
                                  onSelectMemberForDm(member);
                                  onClose();
                                }}
                                className="px-2.5 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-750 rounded-xl transition flex items-center space-x-1"
                                title="Send direct message"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>Message</span>
                              </button>
                            )}

                            {onOpenProfileDrawer && (
                              <button
                                onClick={() => {
                                  onOpenProfileDrawer(member);
                                  onClose();
                                }}
                                className="px-2.5 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-750 rounded-xl transition flex items-center space-x-1"
                                title="View profile details"
                              >
                                <User className="w-3.5 h-3.5" />
                                <span>Profile</span>
                              </button>
                            )}
                          </div>

                          {removeCheck.allowed && (
                            <button
                              onClick={() => setMemberPendingRemoval(member)}
                              className="p-1.5 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                              title="Remove member from workspace"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* List Table View */
                <div className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 uppercase tracking-wider font-semibold border-b border-neutral-200 dark:border-neutral-800">
                      <tr>
                        <th className="p-3">Member</th>
                        <th className="p-3">Role</th>
                        <th className="p-3">Department</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                      {filteredMembers.map((member) => {
                        const removeCheck = canRemoveMember(currentUser, member);
                        const isSelf = currentUser.id === member.id;

                        return (
                          <tr
                            key={member.id}
                            className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition"
                          >
                            <td className="p-3">
                              <div className="flex items-center space-x-2.5">
                                <div className="relative">
                                  <img
                                    src={
                                      member.avatar ||
                                      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                                        member.name
                                      )}`
                                    }
                                    alt={member.name}
                                    className="w-8 h-8 rounded-xl object-cover bg-neutral-200 dark:bg-neutral-700"
                                  />
                                  <span
                                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${getStatusColor(
                                      member.status,
                                      member.online
                                    )}`}
                                  />
                                </div>
                                <div>
                                  <span className="font-bold text-neutral-900 dark:text-neutral-100">
                                    {member.name}
                                  </span>
                                  {isSelf && (
                                    <span className="text-[10px] text-neutral-400 ml-1">
                                      (You)
                                    </span>
                                  )}
                                  {member.displayName && (
                                    <span className="block text-[11px] text-neutral-400">
                                      @{member.displayName}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="p-3">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRoleBadgeStyle(
                                  member.role
                                )}`}
                              >
                                {formatRoleLabel(member.role)}
                              </span>
                            </td>

                            <td className="p-3 font-medium uppercase text-neutral-600 dark:text-neutral-300">
                              {member.department}
                            </td>

                            <td className="p-3 text-neutral-500 dark:text-neutral-400 font-mono">
                              {member.email}
                            </td>

                            <td className="p-3">
                              <span className="capitalize text-neutral-600 dark:text-neutral-300">
                                {member.status || "offline"}
                              </span>
                            </td>

                            <td className="p-3 text-right">
                              <div className="inline-flex items-center space-x-1.5">
                                {!isSelf && (
                                  <button
                                    onClick={() => {
                                      onSelectMemberForDm(member);
                                      onClose();
                                    }}
                                    className="p-1.5 text-neutral-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
                                    title="Send direct message"
                                  >
                                    <MessageCircle className="w-4 h-4" />
                                  </button>
                                )}

                                {onOpenProfileDrawer && (
                                  <button
                                    onClick={() => {
                                      onOpenProfileDrawer(member);
                                      onClose();
                                    }}
                                    className="p-1.5 text-neutral-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
                                    title="View Profile"
                                  >
                                    <User className="w-4 h-4" />
                                  </button>
                                )}

                                {removeCheck.allowed && (
                                  <button
                                    onClick={() => setMemberPendingRemoval(member)}
                                    className="p-1.5 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                                    title="Remove Member"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Departments Breakdown */}
        {activeTab === "departments" && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {departments
                .filter((d) => d.code !== "all")
                .map((dept) => {
                  const deptMembers = members.filter((m) => m.department === dept.code);
                  return (
                    <div
                      key={dept.id}
                      className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/40"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                          {dept.name}
                        </h4>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 uppercase">
                          {dept.code}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
                        {dept.description || "Active department within Kaelixo workspace."}
                      </p>
                      <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                        <span className="text-neutral-400 font-medium">Team Size</span>
                        <span className="font-bold text-neutral-900 dark:text-white">
                          {deptMembers.length} staff
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Tab 3: Workspace Invitations */}
        {activeTab === "invitations" && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-xl mx-auto custom-scrollbar">
            <div className="p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 space-y-4">
              <div>
                <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100 mb-1">
                  Workspace Invite Link
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Anyone with this invite link can join the {activeOrg.name} workspace as a team member.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={
                    typeof window !== "undefined"
                      ? `${window.location.origin}?invite=${activeOrg.invite_code || "kaelixo-prod"}`
                      : ""
                  }
                  className="flex-1 px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs font-mono text-neutral-700 dark:text-neutral-300 select-all"
                />
                <button
                  onClick={handleCopyInviteLink}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition flex items-center space-x-1.5 cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>

              <div className="pt-2">
                <p className="text-[11px] text-neutral-400">
                  Invite Code: <span className="font-mono font-bold">{activeOrg.invite_code || "kaelixo-prod"}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Removal Confirmation Dialog Modal */}
        {memberPendingRemoval && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
              <div className="flex items-center space-x-3 text-rose-600">
                <div className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-neutral-900 dark:text-neutral-100">
                    Remove Team Member?
                  </h3>
                  <p className="text-xs text-neutral-500">
                    This action will remove the member from your workspace.
                  </p>
                </div>
              </div>

              <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                Are you sure you want to remove <strong className="text-neutral-900 dark:text-white">{memberPendingRemoval.name}</strong> ({memberPendingRemoval.email}) from the workspace?
              </p>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  onClick={() => setMemberPendingRemoval(null)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onRemoveMember(memberPendingRemoval.id);
                    setMemberPendingRemoval(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition"
                >
                  Yes, Remove Member
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
