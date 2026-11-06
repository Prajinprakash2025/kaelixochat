"use client";

import React, { useState, useRef, useEffect } from "react";
import { Bell, CheckCheck, MessageCircle, MessageSquare, AtSign, Check } from "lucide-react";
import { Notification } from "@/types";

export interface NotificationCenterProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onSelectNotification: (notification: Notification) => void;
}

export function NotificationCenter({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onSelectNotification,
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "mentions" | "unread">("all");
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        isOpen &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Filter notifications by active tab
  const filteredNotifications = notifications.filter((n) => {
    const isUnread = n.read === false || n.isRead === false;
    if (activeTab === "unread") return isUnread;
    if (activeTab === "mentions") return n.type === "mention";
    return true;
  });

  const getTypeBadge = (type: Notification["type"]) => {
    switch (type) {
      case "mention":
        return (
          <span className="inline-flex items-center space-x-1 text-[10px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
            <AtSign className="w-2.5 h-2.5" />
            <span>Mention</span>
          </span>
        );
      case "dm":
        return (
          <span className="inline-flex items-center space-x-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
            <MessageCircle className="w-2.5 h-2.5" />
            <span>Direct Message</span>
          </span>
        );
      case "thread_reply":
      case "reply":
        return (
          <span className="inline-flex items-center space-x-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
            <MessageSquare className="w-2.5 h-2.5" />
            <span>Thread Reply</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative">
      {/* Trigger Bell Button */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition focus:outline-none"
        title="Notifications"
        aria-label="Open Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-500 rounded-full ring-2 ring-white dark:ring-neutral-900 animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col max-h-[500px]"
        >
          {/* Header */}
          <div className="p-3.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="text-[11px] font-semibold bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="inline-flex items-center space-x-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition cursor-pointer"
                title="Mark all notifications as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Tab Filter Bar */}
          <div className="flex border-b border-neutral-200 dark:border-neutral-800 px-3 pt-2 bg-neutral-50/50 dark:bg-neutral-900/50">
            <button
              onClick={() => setActiveTab("all")}
              className={`pb-2 px-3 text-xs font-medium border-b-2 transition ${
                activeTab === "all"
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab("mentions")}
              className={`pb-2 px-3 text-xs font-medium border-b-2 transition ${
                activeTab === "mentions"
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              Mentions
            </button>
            <button
              onClick={() => setActiveTab("unread")}
              className={`pb-2 px-3 text-xs font-medium border-b-2 transition ${
                activeTab === "unread"
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/60 custom-scrollbar">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-8 h-8 text-neutral-300 dark:text-neutral-700 mx-auto mb-2" />
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {activeTab === "unread"
                    ? "You are all caught up! No unread notifications."
                    : activeTab === "mentions"
                    ? "No mentions yet."
                    : "No notifications yet."}
                </p>
              </div>
            ) : (
              filteredNotifications.map((n) => {
                const isUnread = n.read === false || n.isRead === false;
                const senderName = n.senderName || "Team Member";
                const senderAvatar =
                  n.senderAvatar ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(senderName)}`;

                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      onMarkAsRead(n.id);
                      onSelectNotification(n);
                      setIsOpen(false);
                    }}
                    className={`p-3.5 flex items-start space-x-3 transition cursor-pointer group ${
                      isUnread
                        ? "bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40"
                        : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                    }`}
                  >
                    {/* Sender Avatar */}
                    <img
                      src={senderAvatar}
                      alt={senderName}
                      className="w-8 h-8 rounded-xl object-cover bg-neutral-200 dark:bg-neutral-700 flex-shrink-0 mt-0.5 ring-1 ring-neutral-300 dark:ring-neutral-700"
                    />

                    {/* Notification Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
                            {senderName}
                          </span>
                          {getTypeBadge(n.type)}
                        </div>
                        <span className="text-[10px] text-neutral-400 flex-shrink-0">
                          {n.createdAt}
                        </span>
                      </div>

                      {n.channelName && (
                        <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mb-0.5">
                          #{n.channelName}
                        </p>
                      )}

                      <p className="text-xs text-neutral-700 dark:text-neutral-300 line-clamp-2 leading-relaxed">
                        {n.content}
                      </p>
                    </div>

                    {/* Unread dot / Mark read action */}
                    <div className="flex flex-col items-center justify-between self-stretch flex-shrink-0">
                      {isUnread ? (
                        <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-neutral-400 opacity-0 group-hover:opacity-100 transition" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
