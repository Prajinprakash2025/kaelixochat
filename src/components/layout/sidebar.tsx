"use client";

import React from "react";
import {
  Hash,
  Lock,
  Plus,
  Smile,
  Circle,
  PhoneCall,
  GraduationCap,
  Code2,
  Briefcase,
  LayoutGrid,
  Sparkles,
  Settings,
} from "lucide-react";
import { DepartmentCode, Channel, WorkspaceMember, Department } from "@/types";

interface SidebarProps {
  departments: Department[];
  selectedDepartment: DepartmentCode;
  onSelectDepartment: (dept: DepartmentCode) => void;
  channels: Channel[];
  activeChannelId: string;
  onSelectChannel: (channelId: string) => void;
  teamMembers: WorkspaceMember[];
  currentUser: WorkspaceMember;
  onOpenNewChannelModal: () => void;
  onOpenAuthModal?: () => void;
}

export function Sidebar({
  departments,
  selectedDepartment,
  onSelectDepartment,
  channels,
  activeChannelId,
  onSelectChannel,
  teamMembers,
  currentUser,
  onOpenNewChannelModal,
  onOpenAuthModal,
}: SidebarProps) {
  // Filter channels based on selected department tab
  const filteredChannels = channels.filter((ch) => {
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
    <aside className="w-72 bg-neutral-900 text-neutral-100 flex flex-col h-screen border-r border-neutral-800 select-none">
      {/* Workspace Brand Header */}
      <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="font-bold text-base tracking-tight text-white">Kaelixo</h1>
              <span className="text-[10px] font-semibold bg-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded-full border border-indigo-400/20">
                HQ
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-medium">Internal & SaaS Platform</p>
          </div>
        </div>
        <button
          title="Workspace Settings"
          className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Department Filter Bar (Cute Pills) */}
      <div className="p-3 border-b border-neutral-800/60">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2 px-1">
          ഡിപ്പാർട്ട്മെന്റ് ഫിൽട്ടർ (Departments)
        </div>
        <div className="flex flex-wrap gap-1.5">
          {departments.map((dept) => {
            const isActive = selectedDepartment === dept.code;
            return (
              <button
                key={dept.id}
                onClick={() => onSelectDepartment(dept.code)}
                className={`flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
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

      {/* Channels & DMs Scrollable View */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-6 custom-scrollbar">
        {/* Channels Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            <span>ചാനലുകൾ (Channels)</span>
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
                  onClick={() => onSelectChannel(ch.id)}
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

        {/* Team Members / Direct Messages */}
        <div>
          <div className="px-2 mb-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            <span>ടീം അംഗങ്ങൾ (Team)</span>
          </div>

          <div className="space-y-1">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between px-2 py-1.5 rounded-xl text-sm hover:bg-neutral-800/60 cursor-pointer transition group"
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="relative flex-shrink-0">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-7 h-7 rounded-lg bg-neutral-800"
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${getStatusColor(
                        member.status
                      )}`}
                    />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-medium text-neutral-200 group-hover:text-white truncate">
                      {member.name}
                    </p>
                    <p className="text-[10px] text-neutral-400 truncate">
                      {member.statusText || member.role}
                    </p>
                  </div>
                </div>

                <span className="text-[9px] px-1.5 py-0.5 rounded-md uppercase font-semibold text-neutral-400 bg-neutral-800 border border-neutral-700/60">
                  {member.department}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Footer Profile */}
      <div 
        onClick={onOpenAuthModal}
        className="p-3 border-t border-neutral-800 bg-neutral-900/90 flex items-center justify-between cursor-pointer hover:bg-neutral-800/80 transition group"
        title="Click to edit profile & department"
      >
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="relative">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-8 h-8 rounded-xl bg-neutral-800 ring-1 ring-neutral-700 group-hover:ring-indigo-500 transition"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-neutral-900" />
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
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenAuthModal) onOpenAuthModal();
          }}
          title="Change Profile"
          className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition"
        >
          <Smile className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
