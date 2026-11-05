"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { DepartmentToolbar } from "@/components/chat/department-toolbar";
import { MessageFeed } from "@/components/chat/message-feed";
import { ChatInput } from "@/components/chat/chat-input";
import { NewChannelModal } from "@/components/modals/new-channel-modal";
import { NewCompanyModal } from "@/components/modals/new-company-modal";
import { NewDepartmentModal } from "@/components/modals/new-department-modal";
import { SlackAuthModal } from "@/components/modals/slack-auth-modal";
import {
  DEPARTMENTS as INITIAL_DEPTS,
  CURRENT_USER as DEFAULT_USER,
  TEAM_MEMBERS,
  INITIAL_CHANNELS,
  INITIAL_MESSAGES,
} from "@/lib/mock-data";
import {
  DepartmentCode,
  Channel,
  Message,
  WorkspaceMember,
  Department,
  Organization,
  Attachment,
  MessageReaction,
  MessageReactionsArray,
  reactionsMapToArray,
} from "@/types";
import { formatFileSize } from "@/utils/storage";
import { getOrCreateDmChannel } from "@/utils/channels";
import {
  Hash,
  Lock,
  Search,
  PanelRight,
  Radio,
  UserCheck,
  User,
  Plus,
  Building2,
  Menu,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const DEFAULT_ORGS: Organization[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Kaelixo HQ",
    slug: "kaelixo-hq",
    invite_code: "KAELIXO-938c7e",
    plan: "pro",
  },
];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function createReactionsArray(items: MessageReaction[] = []): MessageReactionsArray {
  const arr = [...items] as MessageReactionsArray;
  for (const item of items) {
    (arr as any)[item.emoji] = { count: item.count, users: item.users };
  }
  return arr;
}

export default function KaelixoApp() {
  const [organizations, setOrganizations] = useState<Organization[]>(DEFAULT_ORGS);
  const [activeOrg, setActiveOrg] = useState<Organization>(DEFAULT_ORGS[0]);
  const [departments, setDepartments] = useState<Department[]>(INITIAL_DEPTS);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentCode>("all");
  const [channels, setChannels] = useState<Channel[]>(INITIAL_CHANNELS);
  const [activeChannelId, setActiveChannelId] = useState<string>("chan-announcements");
  const [activeDmRecipient, setActiveDmRecipient] = useState<WorkspaceMember | null>(null);
  const [messagesByChannel, setMessagesByChannel] = useState<Record<string, Message[]>>(INITIAL_MESSAGES);
  const [currentUser, setCurrentUser] = useState<WorkspaceMember>(DEFAULT_USER);

  // Modals state
  const [isNewChannelModalOpen, setIsNewChannelModalOpen] = useState(false);
  const [isNewCompanyModalOpen, setIsNewCompanyModalOpen] = useState(false);
  const [isNewDepartmentModalOpen, setIsNewDepartmentModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [externalTemplateText, setExternalTemplateText] = useState("");
  const [showRightDrawer, setShowRightDrawer] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const supabase = createClient();

  // Load user from localStorage
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("kaelixo_user");
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleLoginSuccess = (user: WorkspaceMember) => {
    setCurrentUser(user);
    try {
      localStorage.setItem("kaelixo_user", JSON.stringify(user));
    } catch {
      // ignore
    }
  };

  // Play audio chime
  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch {
      // ignore
    }
  };

  // 1. Fetch live organizations, departments & channels from Supabase
  useEffect(() => {
    async function loadWorkspaceData() {
      try {
        // Fetch Organizations
        const { data: dbOrgs } = await supabase.from("organizations").select("*");
        if (dbOrgs && dbOrgs.length > 0) {
          setOrganizations(dbOrgs);
          setActiveOrg(dbOrgs[0]);
        }

        // Fetch Departments
        const { data: dbDepts } = await supabase.from("departments").select("*");
        if (dbDepts && dbDepts.length > 0) {
          const deptsWithAll: Department[] = [
            INITIAL_DEPTS[0], // All Departments
            ...dbDepts.map((d: any) => ({
              id: d.id,
              name: d.name,
              code: d.code,
              description: d.description || "",
              icon: d.icon || "Briefcase",
              color: "bg-indigo-500",
            })),
          ];
          setDepartments(deptsWithAll);
        }

        // Fetch Channels
        const { data: dbChannels } = await supabase
          .from("channels")
          .select("*")
          .order("created_at", { ascending: true });

        if (dbChannels && dbChannels.length > 0) {
          const formatted: Channel[] = dbChannels.map((ch: any) => ({
            id: ch.id,
            name: ch.name,
            topic: ch.topic || "",
            departmentId: ch.department_id,
            departmentCode: ch.department_id ? "dev" : "all",
            isPrivate: ch.is_private || false,
            isDm: ch.is_dm || false,
            recipientId: ch.recipient_id,
            recipientName: ch.recipient_name,
            recipientAvatar: ch.recipient_avatar,
          }));

          setChannels(formatted);
          const firstNonDm = formatted.find((c) => !c.isDm) || formatted[0];
          setActiveChannelId(firstNonDm.id);
          setIsLiveConnected(true);
        }
      } catch (err) {
        console.warn("Using local cache:", err);
      }
    }

    loadWorkspaceData();
  }, []);

  const applyReactionChange = (
    messageId: string,
    emoji: string,
    userId: string,
    action: "add" | "remove"
  ) => {
    setMessagesByChannel((prev) => {
      let changed = false;
      const nextState: Record<string, Message[]> = {};

      for (const [chId, msgList] of Object.entries(prev)) {
        if (!msgList.some((m) => m.id === messageId)) {
          nextState[chId] = msgList;
          continue;
        }

        changed = true;
        nextState[chId] = msgList.map((msg) => {
          if (msg.id !== messageId) return msg;

          const currentReactions = reactionsMapToArray(msg.reactions);
          const existingIdx = currentReactions.findIndex((r) => r.emoji === emoji);

          let updatedReactions = [...currentReactions];
          if (action === "add") {
            if (existingIdx > -1) {
              const r = updatedReactions[existingIdx];
              if (!r.users.includes(userId)) {
                updatedReactions[existingIdx] = {
                  ...r,
                  count: r.count + 1,
                  users: [...r.users, userId],
                };
              }
            } else {
              updatedReactions.push({
                emoji,
                count: 1,
                users: [userId],
              });
            }
          } else if (action === "remove") {
            if (existingIdx > -1) {
              const r = updatedReactions[existingIdx];
              const nextUsers = r.users.filter((id) => id !== userId);
              if (nextUsers.length === 0) {
                updatedReactions.splice(existingIdx, 1);
              } else {
                updatedReactions[existingIdx] = {
                  ...r,
                  count: Math.max(0, r.count - 1),
                  users: nextUsers,
                };
              }
            }
          }

          return {
            ...msg,
            reactions: createReactionsArray(updatedReactions),
          };
        });
      }

      return changed ? nextState : prev;
    });
  };

  // 2. Fetch live messages for active channel or DM
  useEffect(() => {
    async function loadMessages() {
      try {
        const { data: dbMessages } = await supabase
          .from("messages")
          .select("*")
          .eq("channel_id", activeChannelId)
          .order("created_at", { ascending: true });

        if (dbMessages && dbMessages.length > 0) {
          const messageIds = dbMessages.map((m: any) => m.id);
          const reactionsByMessage: Record<string, { emoji: string; count: number; users: string[] }[]> = {};

          if (messageIds.length > 0) {
            try {
              const { data: dbReactions } = await supabase
                .from("reactions")
                .select("*")
                .in("message_id", messageIds);

              if (dbReactions) {
                for (const r of dbReactions) {
                  const mId = r.message_id;
                  if (!reactionsByMessage[mId]) reactionsByMessage[mId] = [];
                  const existing = reactionsByMessage[mId].find((x) => x.emoji === r.emoji);
                  const uId = r.user_id || r.member_id || "";
                  if (existing) {
                    existing.count += 1;
                    if (!existing.users.includes(uId)) existing.users.push(uId);
                  } else {
                    reactionsByMessage[mId].push({
                      emoji: r.emoji,
                      count: 1,
                      users: [uId],
                    });
                  }
                }
              }
            } catch (rErr) {
              console.warn("Error fetching reactions:", rErr);
            }
          }

          const mapped: Message[] = dbMessages.map((m: any) => {
            let parsedAttachments: Attachment[] = [];
            if (Array.isArray(m.attachments)) {
              parsedAttachments = m.attachments;
            } else if (typeof m.attachments === "string") {
              try {
                parsedAttachments = JSON.parse(m.attachments);
              } catch {
                parsedAttachments = [];
              }
            }

            return {
              id: m.id,
              channelId: m.channel_id,
              sender: {
                id: m.sender_id || `user-anon`,
                name: m.sender_name || "Colleague",
                email: "member@kaelixo.com",
                avatar:
                  m.sender_avatar ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                    m.sender_name || "member"
                  )}`,
                role: (m.sender_role as any) || "member",
                department: (m.sender_department as any) || "dev",
                status: "online",
              },
              content: m.content || "",
              createdAt: new Date(m.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              attachments: parsedAttachments,
              reactions: createReactionsArray(reactionsByMessage[m.id] || []),
              isPinned: m.is_pinned || false,
            };
          });

          setMessagesByChannel((prev) => ({
            ...prev,
            [activeChannelId]: mapped,
          }));
          setIsLiveConnected(true);
        }
      } catch (err) {
        console.warn("Load messages error:", err);
      }
    }

    loadMessages();
  }, [activeChannelId]);

  // 3. Supabase Realtime Subscription
  useEffect(() => {
    const channel = supabase
      .channel("realtime-messages-stream-v2")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newMsg = payload.new as any;
          if (newMsg && newMsg.channel_id) {
            let parsedAttachments: Attachment[] = [];
            if (Array.isArray(newMsg.attachments)) {
              parsedAttachments = newMsg.attachments;
            } else if (typeof newMsg.attachments === "string") {
              try {
                parsedAttachments = JSON.parse(newMsg.attachments);
              } catch {
                parsedAttachments = [];
              }
            }

            const formatted: Message = {
              id: newMsg.id,
              channelId: newMsg.channel_id,
              sender: {
                id: newMsg.sender_id || `user-anon`,
                name: newMsg.sender_name || "Colleague",
                email: "colleague@kaelixo.com",
                avatar:
                  newMsg.sender_avatar ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                    newMsg.sender_name || "team"
                  )}`,
                role: (newMsg.sender_role as any) || "member",
                department: (newMsg.sender_department as any) || "dev",
                status: "online",
              },
              content: newMsg.content || "",
              createdAt: new Date(newMsg.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              attachments: parsedAttachments,
              reactions: createReactionsArray([]),
            };

            setMessagesByChannel((prev) => {
              const currentList = prev[newMsg.channel_id] || [];
              if (currentList.some((m) => m.id === newMsg.id)) return prev;

              if (newMsg.sender_name !== currentUser.name) {
                playChime();
              }

              return {
                ...prev,
                [newMsg.channel_id]: [...currentList, formatted],
              };
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reactions" },
        (payload) => {
          const row = payload.new as any;
          if (row && row.message_id && row.emoji) {
            applyReactionChange(
              row.message_id,
              row.emoji,
              row.user_id || row.member_id || "",
              "add"
            );
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "reactions" },
        (payload) => {
          const oldRow = payload.old as any;
          if (oldRow && oldRow.message_id && oldRow.emoji) {
            applyReactionChange(
              oldRow.message_id,
              oldRow.emoji,
              oldRow.user_id || oldRow.member_id || "",
              "remove"
            );
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsLiveConnected(true);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser.name]);

  // Handle switching to a Direct Message with a team member
  const handleSelectDirectMessage = async (member: WorkspaceMember) => {
    try {
      const dmId = await getOrCreateDmChannel(
        currentUser.id,
        member.id,
        member.name,
        member.avatar
      );

      setActiveDmRecipient(member);
      setActiveChannelId(dmId);

      // If channel doesn't exist locally, register it
      if (!channels.some((c) => c.id === dmId)) {
        const dmChannel: Channel = {
          id: dmId,
          name: `@${member.name}`,
          topic: `Direct 1-on-1 message with ${member.name} (${member.role} • ${member.department})`,
          isPrivate: true,
          isDm: true,
          recipientId: member.id,
          recipientName: member.name,
          recipientAvatar: member.avatar,
        };
        setChannels((prev) => [...prev, dmChannel]);
      }
    } catch (err) {
      console.warn("Error getting DM channel UUID:", err);
      const fallbackId = `dm-${[currentUser.id, member.id].sort().join("-")}`;
      setActiveDmRecipient(member);
      setActiveChannelId(fallbackId);
    }
  };

  const handleSelectRegularChannel = (channelId: string) => {
    setActiveDmRecipient(null);
    setActiveChannelId(channelId);
  };

  // Active channel
  const activeChannel =
    channels.find((c) => c.id === activeChannelId) ||
    (activeDmRecipient
      ? {
          id: activeChannelId,
          name: `@${activeDmRecipient.name}`,
          topic: `1-on-1 Chat with ${activeDmRecipient.name}`,
          isPrivate: true,
          isDm: true,
        }
      : channels[0] || INITIAL_CHANNELS[0]);

  const activeMessages = messagesByChannel[activeChannelId] || [];

  // Send message
  const handleSendMessage = async (content: string, attachments?: Attachment[]) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const localId = `msg-${Date.now()}`;

    const newMessage: Message = {
      id: localId,
      channelId: activeChannelId,
      sender: currentUser,
      content,
      attachments: attachments || [],
      createdAt: timeString,
      reactions: createReactionsArray([]),
    };

    setMessagesByChannel((prev) => ({
      ...prev,
      [activeChannelId]: [...(prev[activeChannelId] || []), newMessage],
    }));

    try {
      const { data: insertedMsg, error: insertError } = await supabase
        .from("messages")
        .insert({
          channel_id: activeChannelId,
          content: content || "",
          sender_name: currentUser.name,
          sender_avatar: currentUser.avatar,
          sender_role: currentUser.role,
          sender_department: currentUser.department,
          attachments: attachments || [],
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      // If attachments exist, also register in public.attachments table
      if (attachments && attachments.length > 0 && insertedMsg?.id) {
        for (const att of attachments) {
          await supabase.from("attachments").insert({
            message_id: insertedMsg.id,
            channel_id: activeChannelId,
            file_name: att.name,
            file_size: formatFileSize(att.size),
            file_type: att.type,
            mime_type: att.type,
            storage_path: att.storagePath,
            url: att.url,
            uploader_name: currentUser.name,
          });
        }
      }

      setIsLiveConnected(true);
    } catch (e) {
      console.warn("Saved to local state:", e);
    }
  };

  // Reactions
  const handleAddReaction = async (messageId: string, emoji: string) => {
    let willRemove = false;

    // 1. Optimistic toggle in local state
    setMessagesByChannel((prev) => {
      const currentList = prev[activeChannelId] || [];
      const updatedList = currentList.map((msg) => {
        if (msg.id !== messageId) return msg;

        const currentReactions = reactionsMapToArray(msg.reactions);
        const existingReactionIndex = currentReactions.findIndex((r) => r.emoji === emoji);
        let updatedReactions = [...currentReactions];

        if (existingReactionIndex > -1) {
          const reaction = updatedReactions[existingReactionIndex];
          const hasUser = reaction.users.includes(currentUser.id);

          if (hasUser) {
            willRemove = true;
            const newUsers = reaction.users.filter((id) => id !== currentUser.id);
            if (newUsers.length === 0) {
              updatedReactions = updatedReactions.filter((r) => r.emoji !== emoji);
            } else {
              updatedReactions[existingReactionIndex] = {
                ...reaction,
                count: Math.max(0, reaction.count - 1),
                users: newUsers,
              };
            }
          } else {
            willRemove = false;
            updatedReactions[existingReactionIndex] = {
              ...reaction,
              count: reaction.count + 1,
              users: [...reaction.users, currentUser.id],
            };
          }
        } else {
          willRemove = false;
          updatedReactions.push({
            emoji,
            count: 1,
            users: [currentUser.id],
          });
        }

        return { ...msg, reactions: createReactionsArray(updatedReactions) };
      });

      return { ...prev, [activeChannelId]: updatedList };
    });

    // 2. Persist to Supabase if valid UUID
    if (UUID_REGEX.test(messageId)) {
      try {
        if (willRemove) {
          await supabase
            .from("reactions")
            .delete()
            .match({
              message_id: messageId,
              emoji: emoji,
              user_id: currentUser.id,
            });
        } else {
          await supabase
            .from("reactions")
            .insert({
              message_id: messageId,
              emoji: emoji,
              user_id: currentUser.id,
              user_name: currentUser.name,
            });
        }
      } catch (err) {
        console.warn("Reaction persistence error:", err);
      }
    }
  };

  // Create Channel
  const handleCreateChannel = async (data: {
    name: string;
    topic: string;
    departmentCode: DepartmentCode;
    isPrivate: boolean;
  }) => {
    const localId = `chan-${Date.now()}`;
    const newChannel: Channel = {
      id: localId,
      name: data.name,
      topic: data.topic || "Discussion channel",
      departmentCode: data.departmentCode,
      isPrivate: data.isPrivate,
    };

    setChannels((prev) => [...prev, newChannel]);
    setActiveChannelId(newChannel.id);
    setActiveDmRecipient(null);

    setMessagesByChannel((prev) => ({
      ...prev,
      [newChannel.id]: [
        {
          id: `msg-init-${Date.now()}`,
          channelId: newChannel.id,
          sender: currentUser,
          content: `🎉 #${data.name} ചാനൽ ആരംഭിച്ചു! ${
            data.topic ? `**ഉദ്ദേശ്യം:** ${data.topic}` : ""
          }`,
          createdAt: "Just now",
          reactions: [{ emoji: "🎉", count: 1, users: [currentUser.id] }],
        },
      ],
    }));

    try {
      await supabase.from("channels").insert({
        organization_id: activeOrg.id,
        name: data.name,
        topic: data.topic,
        is_private: data.isPrivate,
      });
      setIsLiveConnected(true);
    } catch {
      // ignore
    }
  };

  // Create Company (Workspace)
  const handleCreateCompany = async (company: { name: string; slug: string }) => {
    const inviteCode = `KAELIXO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const newOrg: Organization = {
      id: `org-${Date.now()}`,
      name: company.name,
      slug: company.slug,
      invite_code: inviteCode,
      plan: "pro",
    };

    setOrganizations((prev) => [...prev, newOrg]);
    setActiveOrg(newOrg);

    try {
      await supabase.from("organizations").insert({
        name: company.name,
        slug: company.slug,
        invite_code: inviteCode,
      });
    } catch {
      // ignore
    }
  };

  // Create Department
  const handleCreateDepartment = async (dept: {
    name: string;
    code: string;
    description: string;
    icon: string;
  }) => {
    const newDept: Department = {
      id: `dept-${Date.now()}`,
      organization_id: activeOrg.id,
      name: dept.name,
      code: dept.code,
      description: dept.description,
      icon: dept.icon,
      color: "bg-indigo-500",
    };

    setDepartments((prev) => [...prev, newDept]);
    setSelectedDepartment(dept.code);

    try {
      await supabase.from("departments").insert({
        organization_id: activeOrg.id,
        name: dept.name,
        code: dept.code,
        description: dept.description,
        icon: dept.icon,
      });
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex h-screen bg-white dark:bg-neutral-950 overflow-hidden font-sans antialiased text-neutral-900 dark:text-neutral-100">
      {/* Sidebar with Company Switcher & DMs */}
      <Sidebar
        organizations={organizations}
        activeOrg={activeOrg}
        onSelectOrg={setActiveOrg}
        onOpenNewCompanyModal={() => setIsNewCompanyModalOpen(true)}
        departments={departments}
        selectedDepartment={selectedDepartment}
        onSelectDepartment={setSelectedDepartment}
        onOpenNewDepartmentModal={() => setIsNewDepartmentModalOpen(true)}
        channels={channels}
        activeChannelId={activeChannelId}
        onSelectChannel={handleSelectRegularChannel}
        teamMembers={TEAM_MEMBERS}
        currentUser={currentUser}
        onOpenNewChannelModal={() => setIsNewChannelModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onSelectDirectMessage={handleSelectDirectMessage}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Chat Stage */}
      <main className="flex-1 flex flex-col h-screen min-w-0 bg-white dark:bg-neutral-950">
        {/* Top Header */}
        <header className="h-16 px-4 md:px-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between flex-shrink-0 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md">
          <div className="flex items-center space-x-2 md:space-x-3 min-w-0">
            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 -ml-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900 md:hidden transition flex-shrink-0"
              title="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            {activeDmRecipient ? (
              <div className="flex items-center space-x-2.5">
                <div className="relative">
                  <img
                    src={activeDmRecipient.avatar}
                    alt={activeDmRecipient.name}
                    className="w-8 h-8 rounded-xl bg-neutral-200 dark:bg-neutral-800"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-neutral-900" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-neutral-900 dark:text-white tracking-tight">
                    {activeDmRecipient.name}
                  </h2>
                  <p className="text-[11px] text-neutral-400 capitalize">
                    {activeDmRecipient.role} • {activeDmRecipient.department} Department
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                {activeChannel.isPrivate ? (
                  <Lock className="w-4 h-4 text-neutral-400" />
                ) : (
                  <Hash className="w-5 h-5 text-neutral-400" />
                )}
                <h2 className="font-bold text-base text-neutral-900 dark:text-white tracking-tight truncate">
                  {activeChannel.name}
                </h2>
                {activeChannel.departmentCode && activeChannel.departmentCode !== "all" && (
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40">
                    {activeChannel.departmentCode}
                  </span>
                )}
                {activeChannel.topic && (
                  <span className="text-xs text-neutral-400 border-l border-neutral-200 dark:border-neutral-800 pl-3 truncate max-w-md hidden md:inline">
                    {activeChannel.topic}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Action Tools */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Supabase Status */}
            <div
              className={`flex items-center space-x-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border ${
                isLiveConnected
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50"
                  : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50"
              }`}
            >
              <Radio
                className={`w-3 h-3 ${
                  isLiveConnected ? "text-emerald-500 animate-pulse" : "text-indigo-500"
                }`}
              />
              <span>{isLiveConnected ? "Supabase Live" : "Connected"}</span>
            </div>

            {/* User Profile Switch Button */}
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center space-x-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 transition"
              title="Slack Auth & Profile Setup"
            >
              <User className="w-3.5 h-3.5 text-indigo-500" />
              <span>{currentUser.name.split(" ")[0]}</span>
            </button>

            <button
              onClick={() => setShowRightDrawer(!showRightDrawer)}
              title="Channel Details"
              className={`p-2 rounded-xl transition ${
                showRightDrawer
                  ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400"
                  : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900"
              }`}
            >
              <PanelRight className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Specialized Department Toolbar (only for channels, not in DMs) */}
        {!activeDmRecipient && (
          <DepartmentToolbar
            departmentCode={activeChannel.departmentCode}
            onApplyTemplate={(text) => setExternalTemplateText(text)}
          />
        )}

        {/* Message Feed */}
        <MessageFeed
          messages={activeMessages}
          currentUser={currentUser}
          onAddReaction={handleAddReaction}
          members={TEAM_MEMBERS}
        />

        {/* Input Composer */}
        <ChatInput
          channelId={activeChannelId}
          channelName={activeChannel.name}
          onSendMessage={handleSendMessage}
          externalText={externalTemplateText}
          onClearExternalText={() => setExternalTemplateText("")}
        />
      </main>

      {/* Right Drawer */}
      {showRightDrawer && (
        <aside className="w-80 border-l border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 p-5 flex flex-col h-screen overflow-y-auto">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
            <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
              {activeDmRecipient ? "അംഗത്തിന്റെ വിവരങ്ങൾ" : "ചാനൽ വിവരങ്ങൾ"}
            </h3>
            <button
              onClick={() => setShowRightDrawer(false)}
              className="text-neutral-400 hover:text-neutral-600 text-xs font-semibold"
            >
              Close
            </button>
          </div>

          <div className="py-4 space-y-4">
            {activeDmRecipient ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-white dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700">
                  <img
                    src={activeDmRecipient.avatar}
                    alt={activeDmRecipient.name}
                    className="w-16 h-16 rounded-2xl mb-2"
                  />
                  <h4 className="font-bold text-sm text-neutral-900 dark:text-white">
                    {activeDmRecipient.name}
                  </h4>
                  <p className="text-xs text-neutral-500">{activeDmRecipient.email}</p>
                  <span className="mt-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    {activeDmRecipient.role} • {activeDmRecipient.department}
                  </span>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                    ഉദ്ദേശ്യം (Topic)
                  </p>
                  <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                    {activeChannel.topic || "No topic set for this channel"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                    ഡിപ്പാർട്ട്മെന്റ് (Department)
                  </p>
                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 capitalize">
                    {activeChannel.departmentCode || "Company Wide"}
                  </p>
                </div>
              </>
            )}

            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3 block">
                കമ്പനി അംഗങ്ങൾ ({TEAM_MEMBERS.length})
              </span>
              <div className="space-y-2">
                {TEAM_MEMBERS.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => handleSelectDirectMessage(m)}
                    className="flex items-center space-x-2.5 p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition"
                  >
                    <img
                      src={m.avatar}
                      alt={m.name}
                      className="w-6 h-6 rounded-lg bg-neutral-200 dark:bg-neutral-800"
                    />
                    <div className="truncate">
                      <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">
                        {m.name}
                      </p>
                      <p className="text-[10px] text-neutral-400 capitalize">
                        {m.role} • {m.department}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Modals */}
      <NewChannelModal
        isOpen={isNewChannelModalOpen}
        onClose={() => setIsNewChannelModalOpen(false)}
        departments={departments}
        onCreateChannel={handleCreateChannel}
      />

      <NewCompanyModal
        isOpen={isNewCompanyModalOpen}
        onClose={() => setIsNewCompanyModalOpen(false)}
        onCreateCompany={handleCreateCompany}
      />

      <NewDepartmentModal
        isOpen={isNewDepartmentModalOpen}
        onClose={() => setIsNewDepartmentModalOpen(false)}
        onCreateDepartment={handleCreateDepartment}
      />

      <SlackAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        departments={departments}
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
