"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { DepartmentToolbar } from "@/components/chat/department-toolbar";
import { MessageFeed } from "@/components/chat/message-feed";
import { ChatInput } from "@/components/chat/chat-input";
import { NewChannelModal } from "@/components/modals/new-channel-modal";
import { NewCompanyModal } from "@/components/modals/new-company-modal";
import { EditCompanyModal } from "@/components/modals/edit-company-modal";
import { NewDepartmentModal } from "@/components/modals/new-department-modal";
import { SlackAuthModal } from "@/components/modals/slack-auth-modal";
import { InviteTeamModal } from "@/components/modals/invite-team-modal";
import { ThreadPanel } from "@/components/chat/thread-panel";
import { PinnedMessagesDrawer } from "@/components/chat/pinned-messages-drawer";
import { SearchModal } from "@/components/modals/search-modal";
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
  RightPanelMode,
  Notification,
  reactionsMapToArray,
  createReactionsArray,
} from "@/types";
import { formatFileSize } from "@/utils/storage";
import { getOrCreateDmChannel } from "@/utils/channels";
import { initPresenceTracker, PresenceMap } from "@/utils/realtime";
import { NotificationCenter } from "@/components/layout/notification-center";
import { MemberDirectoryModal } from "@/components/directory/member-directory-modal";
import { AddMemberModal } from "@/components/directory/add-member-modal";
import { UserProfileDrawer } from "@/components/profile/user-profile-drawer";
import { EditProfileModal } from "@/components/profile/edit-profile-modal";
import { GamesModal } from "@/components/games/games-modal";
import { PreferencesModal } from "@/components/preferences/preferences-modal";
import { InstallPwaButton } from "@/components/layout/install-pwa-button";
import { usePreferences } from "@/context/preferences-context";
import {
  Hash,
  Lock,
  Search,
  PanelRight,
  Radio,
  User,
  Menu,
  Share2,
  Pin,
  Users,
  Gamepad2,
  X as CloseIcon,
  Sun,
  Moon,
  Settings,
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

function mergeMessageIntoList(currentList: Message[], incoming: Message): Message[] {
  // 1. Exact ID match check
  if (currentList.some((m) => m.id === incoming.id)) {
    return currentList;
  }

  // 2. Check if this incoming message matches a temporary optimistic message
  const optimisticIndex = currentList.findIndex(
    (m) =>
      (m.id.startsWith("msg-") || m.id.includes("reply-")) &&
      m.sender.name === incoming.sender.name &&
      m.content === incoming.content
  );

  if (optimisticIndex !== -1) {
    const updated = [...currentList];
    updated[optimisticIndex] = incoming;
    return updated;
  }

  // 3. Fallback duplicate check: same sender, same content, and identical timestamp
  const contentDuplicate = currentList.find(
    (m) =>
      m.sender.name === incoming.sender.name &&
      m.content.trim() === incoming.content.trim() &&
      m.content.trim().length > 0 &&
      m.createdAt === incoming.createdAt
  );

  if (contentDuplicate) {
    return currentList;
  }

  return [...currentList, incoming];
}

export default function KaelixoApp() {
  const [organizations, setOrganizations] = useState<Organization[]>(DEFAULT_ORGS);
  const [activeOrg, setActiveOrg] = useState<Organization>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedOrg = localStorage.getItem("kaelixo_org");
        if (savedOrg) return JSON.parse(savedOrg);
      } catch {}
    }
    return DEFAULT_ORGS[0];
  });
  const [departments, setDepartments] = useState<Department[]>(INITIAL_DEPTS);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentCode>("all");
  const [channels, setChannels] = useState<Channel[]>(INITIAL_CHANNELS);
  const [activeChannelId, setActiveChannelId] = useState<string>("33333333-3333-3333-3333-333333333331");
  const [activeDmRecipient, setActiveDmRecipient] = useState<WorkspaceMember | null>(null);
  const [messagesByChannel, setMessagesByChannel] = useState<Record<string, Message[]>>(INITIAL_MESSAGES);
  const [currentUser, setCurrentUser] = useState<WorkspaceMember>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("kaelixo_user");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed.avatar === "string" && parsed.avatar.startsWith("blob:")) {
            parsed.avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(parsed.name || "user")}`;
          }
          return parsed;
        }
      } catch {}
    }
    return DEFAULT_USER;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        return Boolean(localStorage.getItem("kaelixo_user"));
      } catch {}
    }
    return false;
  });

  // Dynamic Workspace Members State (Features 25 & 26 / R7)
  const [teamMembers, setTeamMembers] = useState<WorkspaceMember[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("kaelixo_team_members");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((m: any) => {
              if (m.avatar && typeof m.avatar === "string" && m.avatar.startsWith("blob:")) {
                return {
                  ...m,
                  avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(m.name || "member")}`,
                };
              }
              return m;
            });
          }
        }
      } catch {}
    }
    return TEAM_MEMBERS;
  });

  // Real-time Presence State (Feature 20 / R5)
  const [presenceMap, setPresenceMap] = useState<PresenceMap>({});

  // In-App Notifications State (Feature 21 / R5)
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("kaelixo_notifications");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  });

  // Modals state
  const [isNewChannelModalOpen, setIsNewChannelModalOpen] = useState(false);
  const [isNewCompanyModalOpen, setIsNewCompanyModalOpen] = useState(false);
  const [isEditCompanyModalOpen, setIsEditCompanyModalOpen] = useState(false);
  const [isNewDepartmentModalOpen, setIsNewDepartmentModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("invite")) return true;
      try {
        return !localStorage.getItem("kaelixo_user");
      } catch {}
    }
    return false;
  });
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isMemberDirectoryOpen, setIsMemberDirectoryOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isGamesModalOpen, setIsGamesModalOpen] = useState(false);
  const [activeProfileMember, setActiveProfileMember] = useState<WorkspaceMember | null>(null);

  const [initialInviteCode] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("invite") || "";
    }
    return "";
  });

  const [activeToast, setActiveToast] = useState<{
    id: string;
    senderName: string;
    senderAvatar?: string;
    content: string;
    channelName: string;
    channelId: string;
    messageId: string;
  } | null>(null);

  const [externalTemplateText, setExternalTemplateText] = useState("");
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Milestone 3: Right Dock Architecture (Feature 12, extended for Feature 27 Profile)
  const [rightPanelMode, setRightPanelMode] = useState<RightPanelMode>("none");
  const [activeThreadParent, setActiveThreadParent] = useState<Message | null>(null);
  const [threadReplies, setThreadReplies] = useState<Message[]>([]);
  const [_isThreadLoading, setIsThreadLoading] = useState(false);

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Appearance & Preferences
  const {
    colorMode,
    resolvedMode,
    toggleColorMode,
    isPreferencesOpen,
    openPreferences,
    closePreferences,
    initialTab,
  } = usePreferences();

  const realtimeChannelRef = useRef<any>(null);

  const supabase = useMemo(() => createClient(), []);

  // Presence Tracker Initialization (Feature 20)
  useEffect(() => {
    const channel = initPresenceTracker(currentUser, (newMap) => {
      setPresenceMap(newMap);
    });
    return () => {
      try {
        channel.unsubscribe();
      } catch {}
    };
  }, [currentUser]);

  // Persist teamMembers and notifications to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("kaelixo_team_members", JSON.stringify(teamMembers));
    } catch {}
  }, [teamMembers]);

  useEffect(() => {
    try {
      localStorage.setItem("kaelixo_notifications", JSON.stringify(notifications));
    } catch {}
  }, [notifications]);

  // Dynamic presence overlay onto teamMembers
  const membersWithPresence = useMemo(() => {
    return teamMembers.map((m) => {
      if (m.id === currentUser.id) {
        return {
          ...m,
          ...currentUser,
          status: currentUser.status || "online",
          online: currentUser.status !== "offline",
        };
      }
      const presence = presenceMap[m.id];
      if (presence) {
        return {
          ...m,
          status: presence.status || "online",
          online: presence.status !== "offline",
          statusText: presence.statusText || m.statusText,
        };
      }
      return {
        ...m,
        online: m.status === "online",
      };
    });
  }, [teamMembers, currentUser, presenceMap]);

  const unreadNotificationCount = useMemo(() => {
    return notifications.filter((n) => n.read === false || n.isRead === false).length;
  }, [notifications]);

  // Cmd+K search shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);



  const handleLoginSuccess = (user: WorkspaceMember, org?: Organization) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setIsAuthModalOpen(false);
    if (org) {
      setActiveOrg(org);
      setOrganizations((prev) => {
        if (!prev.some((o) => o.id === org.id)) {
          return [...prev, org];
        }
        return prev;
      });
      try {
        localStorage.setItem("kaelixo_org", JSON.stringify(org));
      } catch {
        // ignore
      }
    }
    try {
      localStorage.setItem("kaelixo_user", JSON.stringify(user));
    } catch {
      // ignore
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    try {
      localStorage.removeItem("kaelixo_user");
      localStorage.removeItem("kaelixo_org");
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
    setIsAuthModalOpen(true);
  };

  const handleUpdateOrgInviteCode = (newCode: string) => {
    setActiveOrg((prev) => ({ ...prev, invite_code: newCode }));
    setOrganizations((prev) =>
      prev.map((o) => (o.id === activeOrg.id ? { ...o, invite_code: newCode } : o))
    );
  };

  // Message Jump-To & Visual Highlight Pulse
  const handleJumpToMessage = (messageId: string, parentId?: string | null) => {
    if (parentId) {
      // Find parent message and open thread panel
      for (const msgs of Object.values(messagesByChannel)) {
        const parentMsg = msgs.find((m) => m.id === parentId);
        if (parentMsg) {
          setActiveThreadParent(parentMsg);
          setRightPanelMode("thread");
          break;
        }
      }
    }
    setTimeout(() => {
      const el = document.getElementById(`message-${messageId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-indigo-500", "bg-indigo-50/70", "dark:bg-indigo-950/60");
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-indigo-500", "bg-indigo-50/70", "dark:bg-indigo-950/60");
        }, 2500);
      }
    }, 250);
  };

  const handleSelectSearchResult = (
    channelId: string,
    messageId: string,
    parentId?: string | null
  ) => {
    setActiveChannelId(channelId);
    setIsSearchModalOpen(false);
    handleJumpToMessage(messageId, parentId);
  };

  const handleSelectNotification = (n: Notification) => {
    setActiveChannelId(n.channelId);
    if (n.messageId) {
      handleJumpToMessage(n.messageId);
    }
  };

  const handleMarkNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true, isRead: true } : n))
    );
  };

  const handleMarkAllNotificationsAsRead = () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true, isRead: true }))
    );
  };

  const handleAddMember = async (data: {
    email: string;
    name?: string;
    department: DepartmentCode;
    role: "Member" | "Manager";
  }) => {
    const newMember: WorkspaceMember = {
      id: `user-${Date.now()}`,
      name: data.name || data.email.split("@")[0],
      displayName: (data.name || data.email.split("@")[0]).toLowerCase().replace(/\s+/g, "."),
      email: data.email,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
        data.name || data.email
      )}`,
      role: data.role,
      department: data.department,
      status: "online",
      statusText: "Just joined Kaelixo",
      statusEmoji: "👋",
      online: true,
      isActive: true,
    };

    setTeamMembers((prev) => [...prev, newMember]);
  };

  const handleRemoveMember = (memberId: string) => {
    setTeamMembers((prev) => prev.filter((m) => m.id !== memberId));
    if (activeProfileMember?.id === memberId) {
      setActiveProfileMember(null);
      setRightPanelMode("none");
    }
  };

  const handleSaveProfile = async (updatedData: Partial<WorkspaceMember>) => {
    const updatedUser: WorkspaceMember = {
      ...currentUser,
      ...updatedData,
    };
    setCurrentUser(updatedUser);
    try {
      localStorage.setItem("kaelixo_user", JSON.stringify(updatedUser));
    } catch {}

    setTeamMembers((prev) => {
      const idx = prev.findIndex((m) => m.id === currentUser.id || m.name === currentUser.name);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...updatedData };
        return next;
      }
      return [...prev, updatedUser];
    });

    if (
      activeProfileMember?.id === currentUser.id ||
      activeProfileMember?.name === currentUser.name
    ) {
      setActiveProfileMember((prev) => (prev ? { ...prev, ...updatedData } : null));
    }

    // 1. Instant Realtime broadcast to all connected clients
    if (realtimeChannelRef.current) {
      try {
        realtimeChannelRef.current.send({
          type: "broadcast",
          event: "profile_update",
          payload: updatedUser,
        });
      } catch (broadcastErr) {
        console.warn("Realtime broadcast note:", broadcastErr);
      }
    }

    // 2. Persist to Supabase database so all other devices & future visits see it
    try {
      await supabase.from("user_presence").upsert({
        user_id: updatedUser.id,
        name: updatedUser.name,
        avatar: updatedUser.avatar,
        department: updatedUser.department,
        role: updatedUser.role,
        status: updatedUser.status || "online",
        status_text: updatedUser.statusText || "",
        updated_at: new Date().toISOString(),
      });

      // Update previous messages in Supabase & local state so past chat shows new avatar
      if (updatedData.avatar) {
        await supabase
          .from("messages")
          .update({ sender_avatar: updatedData.avatar })
          .or(`sender_id.eq.${updatedUser.id},sender_name.eq.${updatedUser.name}`);

        setMessagesByChannel((prev) => {
          const nextState: Record<string, Message[]> = {};
          for (const [chId, msgList] of Object.entries(prev)) {
            nextState[chId] = msgList.map((msg) => {
              if (
                msg.senderId === updatedUser.id ||
                msg.sender?.id === updatedUser.id ||
                msg.senderName === updatedUser.name ||
                msg.sender?.name === updatedUser.name
              ) {
                return {
                  ...msg,
                  sender: msg.sender ? { ...msg.sender, avatar: updatedData.avatar! } : msg.sender,
                  senderAvatar: updatedData.avatar,
                };
              }
              return msg;
            });
          }
          return nextState;
        });
      }
    } catch (dbErr) {
      console.warn("Supabase profile persistence note:", dbErr);
    }
  };

  const processIncomingNotification = (
    msg: {
      id: string;
      channelId: string;
      senderId?: string;
      senderName?: string;
      senderAvatar?: string;
      content: string;
      parentId?: string | null;
    },
    channelObj?: Channel
  ) => {
    if (msg.senderName === currentUser.name || msg.senderId === currentUser.id) return;

    const channelName = channelObj?.name || "conversation";
    const isDm = channelObj?.isDm || msg.channelId.startsWith("dm-");

    const contentLower = (msg.content || "").toLowerCase();
    const myName = currentUser.name.toLowerCase();
    const myDisplayName = (currentUser.displayName || "").toLowerCase();
    const isMention =
      contentLower.includes(`@${myName}`) ||
      (myDisplayName && contentLower.includes(`@${myDisplayName}`)) ||
      contentLower.includes("@channel") ||
      contentLower.includes("@here");

    const isDmToMe = Boolean(isDm);
    const isThreadReplyToMe = Boolean(
      msg.parentId &&
        activeThreadParent &&
        activeThreadParent.id === msg.parentId &&
        (activeThreadParent.senderId === currentUser.id ||
          activeThreadParent.sender?.name === currentUser.name)
    );

    if (isMention || isDmToMe || isThreadReplyToMe) {
      const type = isMention ? "mention" : isDmToMe ? "dm" : "thread_reply";
      const notif: Notification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: currentUser.id,
        senderId: msg.senderId || "",
        senderName: msg.senderName || "Colleague",
        senderAvatar:
          msg.senderAvatar ||
          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
            msg.senderName || "User"
          )}`,
        type,
        channelId: msg.channelId,
        channelName,
        messageId: msg.id,
        content: msg.content || "",
        read: false,
        isRead: false,
        createdAt: "Just now",
      };

      setNotifications((prev) => [notif, ...prev]);

      setActiveToast({
        id: notif.id,
        senderName: notif.senderName || "Colleague",
        senderAvatar: notif.senderAvatar,
        content: notif.content,
        channelName: isDm ? "Direct Message" : `#${channelName}`,
        channelId: notif.channelId,
        messageId: notif.messageId || "",
      });

      setTimeout(() => {
        setActiveToast((prev) => (prev?.id === notif.id ? null : prev));
      }, 5000);
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

  // 0. Supabase Auth state listener (OAuth and OTP session persistence)
  useEffect(() => {
    let isMounted = true;

    // Check for existing session from OAuth redirect or session cookie
    supabase.auth.getSession().then(({ data }: any) => {
      const session = data?.session;
      if (!isMounted || !session?.user) return;
      const u = session.user;
      const meta = u.user_metadata || {};
      const fullName = meta.full_name || meta.name || u.email?.split("@")[0] || "User";
      const avatar =
        meta.avatar_url ||
        meta.picture ||
        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(fullName)}`;

      const authMember: WorkspaceMember = {
        id: u.id,
        name: fullName,
        email: u.email || "",
        avatar,
        role: "member",
        department: "dev",
        status: "online",
        statusText: "🟢 Online",
      };

      handleLoginSuccess(authMember);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (!isMounted) return;
      if ((event === "SIGNED_IN" || event === "USER_UPDATED") && session?.user) {
        const u = session.user;
        const meta = u.user_metadata || {};
        const fullName = meta.full_name || meta.name || u.email?.split("@")[0] || "User";
        const avatar =
          meta.avatar_url ||
          meta.picture ||
          `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(fullName)}`;

        try {
          await supabase.from("profiles").upsert({
            id: u.id,
            email: u.email || "",
            full_name: fullName,
            avatar_url: avatar,
          });
        } catch (e) {
          console.warn("Profile upsert note:", e);
        }

        const authMember: WorkspaceMember = {
          id: u.id,
          name: fullName,
          email: u.email || "",
          avatar,
          role: "member",
          department: "dev",
          status: "online",
          statusText: "🟢 Online",
        };

        handleLoginSuccess(authMember);
      } else if (event === "SIGNED_OUT") {
        setIsAuthenticated(false);
        setIsAuthModalOpen(true);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

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
        const deptCodeMap = new Map<string, DepartmentCode>();
        if (dbDepts && dbDepts.length > 0) {
          dbDepts.forEach((d: any) => {
            deptCodeMap.set(d.id, d.code as DepartmentCode);
          });
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
          const formatted: Channel[] = dbChannels
            .filter((ch: any) => !ch.is_dm && !ch.name.startsWith("dm:") && !ch.name.includes(":"))
            .map((ch: any) => {
              let deptCode: DepartmentCode = "all";
              if (ch.department_id) {
                deptCode = deptCodeMap.get(ch.department_id) || "dev";
              }
              return {
                id: ch.id,
                name: ch.name,
                topic: ch.topic || "",
                departmentId: ch.department_id,
                departmentCode: deptCode,
                isPrivate: ch.is_private || false,
                isDm: false,
                recipientId: ch.recipient_id,
                recipientName: ch.recipient_name,
                recipientAvatar: ch.recipient_avatar,
              };
            });

          setChannels(formatted);
          setActiveChannelId((prev) => {
            if (prev && formatted.some((c) => c.id === prev)) return prev;
            const firstNonDm = formatted.find((c) => !c.isDm) || formatted[0];
            return firstNonDm ? firstNonDm.id : prev;
          });
          setIsLiveConnected(true);
        }

        // Fetch Live User Profiles & Presence from Supabase so all devices see latest profiles
        try {
          const { data: dbMembers } = await supabase
            .from("user_presence")
            .select("*")
            .order("updated_at", { ascending: false });

          if (dbMembers && dbMembers.length > 0) {
            setTeamMembers((prev) => {
              const merged = [...prev];
              for (const row of dbMembers) {
                const idx = merged.findIndex((m) => m.id === row.user_id || m.name === row.name);
                const memberData: Partial<WorkspaceMember> = {
                  id: row.user_id,
                  name: row.name,
                  avatar: row.avatar || undefined,
                  department: (row.department as any) || "management",
                  role: (row.role as any) || "member",
                  status: (row.status as any) || "online",
                  statusText: row.status_text || "",
                };
                if (idx > -1) {
                  merged[idx] = {
                    ...merged[idx],
                    ...memberData,
                    avatar: row.avatar || merged[idx].avatar,
                  };
                } else {
                  merged.push({
                    id: row.user_id,
                    name: row.name,
                    email: `${row.name.toLowerCase().replace(/\s+/g, ".")}@kaelixo.com`,
                    avatar:
                      row.avatar ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(row.name)}`,
                    role: (row.role as any) || "member",
                    department: (row.department as any) || "management",
                    status: (row.status as any) || "online",
                    statusText: row.status_text || "",
                  });
                }
              }
              return merged;
            });

            // If currentUser profile exists in Supabase with a valid avatar, sync it
            const currentDbProfile = dbMembers.find(
              (m: any) => m.name === currentUser.name || m.user_id === currentUser.id
            );
            if (
              currentDbProfile &&
              currentDbProfile.avatar &&
              currentUser.avatar !== currentDbProfile.avatar
            ) {
              setCurrentUser((prev) => {
                const updated = {
                  ...prev,
                  avatar: currentDbProfile.avatar,
                };
                try {
                  localStorage.setItem("kaelixo_user", JSON.stringify(updated));
                } catch {}
                return updated;
              });
            }
          }
        } catch (memberErr) {
          console.warn("User presence fetch note:", memberErr);
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

          const updatedReactions = [...currentReactions];
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

    // Also update thread replies if message is in current thread
    setThreadReplies((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        const currentReactions = reactionsMapToArray(msg.reactions);
        const existingIdx = currentReactions.findIndex((r) => r.emoji === emoji);
        const updatedReactions = [...currentReactions];

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
            updatedReactions.push({ emoji, count: 1, users: [userId] });
          }
        } else if (action === "remove" && existingIdx > -1) {
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

        return { ...msg, reactions: createReactionsArray(updatedReactions) };
      })
    );
  };

  // 2. Fetch live messages for active channel or DM (Feature 15: parent_id IS NULL for main feed)
  useEffect(() => {
    async function loadMessages() {
      try {
        const { data: dbMessages } = await supabase
          .from("messages")
          .select("*")
          .eq("channel_id", activeChannelId)
          .is("parent_id", null) // Top-level messages only in main chat feed
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
              parentId: m.parent_id || null,
              threadCount: m.reply_count || 0,
              lastReplyAt: m.last_reply_at || null,
              isPinned: m.is_pinned || false,
              pinnedAt: m.pinned_at || null,
              pinnedByName: m.pinned_by_name || null,
              pinnedById: m.pinned_by_id || null,
              isEdited: m.is_edited || false,
              editedAt: m.edited_at || null,
              isDeleted: m.is_deleted || false,
              deletedAt: m.deleted_at || null,
              senderId: m.sender_id,
              senderName: m.sender_name,
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
              rawTimestamp: m.created_at,
              attachments: parsedAttachments,
              reactions: createReactionsArray(reactionsByMessage[m.id] || []),
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

  // 3. Supabase Realtime Subscription + Multi-Client Synchronization
  useEffect(() => {
    const channel = supabase
      .channel("realtime-messages-stream-v2")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload: any) => {
          const newMsg = payload.new as any;
          if (!newMsg || !newMsg.channel_id) return;

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
            parentId: newMsg.parent_id || null,
            threadCount: newMsg.reply_count || 0,
            lastReplyAt: newMsg.last_reply_at || null,
            isPinned: newMsg.is_pinned || false,
            pinnedAt: newMsg.pinned_at || null,
            pinnedByName: newMsg.pinned_by_name || null,
            pinnedById: newMsg.pinned_by_id || null,
            isEdited: newMsg.is_edited || false,
            editedAt: newMsg.edited_at || null,
            isDeleted: newMsg.is_deleted || false,
            deletedAt: newMsg.deleted_at || null,
            senderId: newMsg.sender_id,
            senderName: newMsg.sender_name,
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
            rawTimestamp: newMsg.created_at,
            attachments: parsedAttachments,
            reactions: createReactionsArray([]),
          };

          // Check for in-app notifications (mentions, DMs, thread replies)
          processIncomingNotification(
            formatted,
            channels.find((c) => c.id === newMsg.channel_id)
          );

          // Feature 15: Thread message segregation
          if (newMsg.parent_id) {
            // Only add to threadReplies if this thread is currently open
            if (activeThreadParent && activeThreadParent.id === newMsg.parent_id) {
              setThreadReplies((prev) => {
                if (prev.some((r) => r.id === newMsg.id)) return prev;
                return [...prev, formatted];
              });
              if (newMsg.sender_name !== currentUser.name) {
                playChime();
              }
            }
            return; // DO NOT append thread reply to main channel feed!
          }

          // Top-level message: append to main feed
          setMessagesByChannel((prev) => {
            const currentList = prev[newMsg.channel_id] || [];
            const updated = mergeMessageIntoList(currentList, formatted);
            if (updated === currentList) return prev;

            if (newMsg.sender_name !== currentUser.name) {
              playChime();
            }

            return {
              ...prev,
              [newMsg.channel_id]: updated,
            };
          });
          setIsLiveConnected(true);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload: any) => {
          const updatedRow = payload.new as any;
          if (!updatedRow || !updatedRow.id) return;

          // 1. Update matching message in messagesByChannel
          setMessagesByChannel((prev) => {
            const chId = updatedRow.channel_id;
            const list = prev[chId];
            if (!list) return prev;

            return {
              ...prev,
              [chId]: list.map((m) => {
                if (m.id !== updatedRow.id) return m;

                let attachments = m.attachments;
                if (updatedRow.attachments) {
                  attachments = Array.isArray(updatedRow.attachments)
                    ? updatedRow.attachments
                    : JSON.parse(updatedRow.attachments || "[]");
                }

                return {
                  ...m,
                  content: updatedRow.content ?? m.content,
                  isPinned: updatedRow.is_pinned !== undefined ? updatedRow.is_pinned : m.isPinned,
                  pinnedAt: updatedRow.pinned_at !== undefined ? updatedRow.pinned_at : m.pinnedAt,
                  pinnedByName:
                    updatedRow.pinned_by_name !== undefined
                      ? updatedRow.pinned_by_name
                      : m.pinnedByName,
                  pinnedById:
                    updatedRow.pinned_by_id !== undefined ? updatedRow.pinned_by_id : m.pinnedById,
                  isEdited: updatedRow.is_edited !== undefined ? updatedRow.is_edited : m.isEdited,
                  editedAt: updatedRow.edited_at !== undefined ? updatedRow.edited_at : m.editedAt,
                  isDeleted:
                    updatedRow.is_deleted !== undefined ? updatedRow.is_deleted : m.isDeleted,
                  deletedAt:
                    updatedRow.deleted_at !== undefined ? updatedRow.deleted_at : m.deletedAt,
                  threadCount:
                    updatedRow.reply_count !== undefined ? updatedRow.reply_count : m.threadCount,
                  lastReplyAt:
                    updatedRow.last_reply_at !== undefined
                      ? updatedRow.last_reply_at
                      : m.lastReplyAt,
                  attachments,
                };
              }),
            };
          });

          // 2. If activeThreadParent was updated, sync its state
          setActiveThreadParent((prev) => {
            if (!prev || prev.id !== updatedRow.id) return prev;
            return {
              ...prev,
              content: updatedRow.content ?? prev.content,
              isPinned: updatedRow.is_pinned !== undefined ? updatedRow.is_pinned : prev.isPinned,
              isEdited: updatedRow.is_edited !== undefined ? updatedRow.is_edited : prev.isEdited,
              isDeleted:
                updatedRow.is_deleted !== undefined ? updatedRow.is_deleted : prev.isDeleted,
              threadCount:
                updatedRow.reply_count !== undefined ? updatedRow.reply_count : prev.threadCount,
              lastReplyAt:
                updatedRow.last_reply_at !== undefined
                  ? updatedRow.last_reply_at
                  : prev.lastReplyAt,
            };
          });

          // 3. If child reply in threadReplies was updated, sync its state
          setThreadReplies((prev) =>
            prev.map((r) => {
              if (r.id !== updatedRow.id) return r;
              return {
                ...r,
                content: updatedRow.content ?? r.content,
                isEdited: updatedRow.is_edited !== undefined ? updatedRow.is_edited : r.isEdited,
                editedAt: updatedRow.edited_at !== undefined ? updatedRow.edited_at : r.editedAt,
                isDeleted:
                  updatedRow.is_deleted !== undefined ? updatedRow.is_deleted : r.isDeleted,
                deletedAt:
                  updatedRow.deleted_at !== undefined ? updatedRow.deleted_at : r.deletedAt,
              };
            })
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages" },
        (payload: any) => {
          const deletedId = payload.old?.id;
          if (!deletedId) return;

          setMessagesByChannel((prev) => {
            let changed = false;
            const nextState: Record<string, Message[]> = {};

            for (const [chId, msgList] of Object.entries(prev)) {
              if (msgList.some((m) => m.id === deletedId)) {
                changed = true;
                nextState[chId] = msgList.filter((m) => m.id !== deletedId);
              } else {
                nextState[chId] = msgList;
              }
            }

            return changed ? nextState : prev;
          });

          // If thread reply was deleted, remove from threadReplies
          setThreadReplies((prev) => prev.filter((r) => r.id !== deletedId));

          // If parent message was hard-deleted, close thread
          setActiveThreadParent((prev) => {
            if (prev && prev.id === deletedId) {
              setRightPanelMode((mode) => (mode === "thread" ? "none" : mode));
              return null;
            }
            return prev;
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reactions" },
        (payload: any) => {
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
        (payload: any) => {
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
      .on("broadcast", { event: "profile_update" }, ({ payload }: any) => {
        if (!payload || !payload.id) return;
        setTeamMembers((prev) => {
          const idx = prev.findIndex((m) => m.id === payload.id || m.name === payload.name);
          if (idx > -1) {
            const next = [...prev];
            next[idx] = { ...next[idx], ...payload };
            return next;
          }
          return [...prev, payload];
        });

        // Also update open profile drawer if viewing this member
        setActiveProfileMember((prev) => {
          if (prev && (prev.id === payload.id || prev.name === payload.name)) {
            return { ...prev, ...payload };
          }
          return prev;
        });

        // Also update avatar on any messages in feed from this member
        if (payload.avatar) {
          setMessagesByChannel((prev) => {
            const nextState: Record<string, Message[]> = {};
            for (const [chId, msgList] of Object.entries(prev)) {
              nextState[chId] = msgList.map((msg) => {
                if (
                  msg.senderId === payload.id ||
                  msg.sender?.id === payload.id ||
                  msg.senderName === payload.name ||
                  msg.sender?.name === payload.name
                ) {
                  return {
                    ...msg,
                    sender: msg.sender ? { ...msg.sender, avatar: payload.avatar } : msg.sender,
                    senderAvatar: payload.avatar,
                  };
                }
                return msg;
              });
            }
            return nextState;
          });
        }
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_presence" },
        (payload: any) => {
          const row = (payload.new || payload.old) as any;
          if (!row || !row.user_id) return;
          setTeamMembers((prev) => {
            const idx = prev.findIndex((m) => m.id === row.user_id || m.name === row.name);
            if (idx > -1) {
              const next = [...prev];
              next[idx] = {
                ...next[idx],
                avatar: row.avatar || next[idx].avatar,
                name: row.name || next[idx].name,
                role: (row.role as any) || next[idx].role,
                department: (row.department as any) || next[idx].department,
                status: (row.status as any) || next[idx].status,
                statusText: row.status_text !== undefined ? row.status_text : next[idx].statusText,
              };
              return next;
            }
            return [
              ...prev,
              {
                id: row.user_id,
                name: row.name,
                email: `${row.name.toLowerCase().replace(/\s+/g, ".")}@kaelixo.com`,
                avatar: row.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(row.name)}`,
                role: (row.role as any) || "member",
                department: (row.department as any) || "management",
                status: (row.status as any) || "online",
                statusText: row.status_text || "",
              },
            ];
          });
        }
      )
      .subscribe((status: any) => {
        if (status === "SUBSCRIBED") {
          setIsLiveConnected(true);
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setIsLiveConnected(false);
        }
      });

    realtimeChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      realtimeChannelRef.current = null;
    };
  }, [currentUser.name, activeThreadParent?.id]);

  // 4. Background Sync Polling Fallback (sync every 4 seconds for active channel root messages)
  useEffect(() => {
    if (!activeChannelId || !UUID_REGEX.test(activeChannelId)) return;

    const syncInterval = setInterval(async () => {
      try {
        const { data: dbMessages } = await supabase
          .from("messages")
          .select("*")
          .eq("channel_id", activeChannelId)
          .is("parent_id", null)
          .order("created_at", { ascending: true });

        if (dbMessages && dbMessages.length > 0) {
          setMessagesByChannel((prev) => {
            const currentList = prev[activeChannelId] || [];
            let updatedList = [...currentList];
            let changed = false;

            for (const m of dbMessages) {
              let parsedAttachments: Attachment[] = [];
              if (Array.isArray(m.attachments)) parsedAttachments = m.attachments;
              else if (typeof m.attachments === "string") {
                try {
                  parsedAttachments = JSON.parse(m.attachments);
                } catch {
                  parsedAttachments = [];
                }
              }

              const formatted: Message = {
                id: m.id,
                channelId: m.channel_id,
                parentId: m.parent_id || null,
                threadCount: m.reply_count || 0,
                lastReplyAt: m.last_reply_at || null,
                isPinned: m.is_pinned || false,
                pinnedAt: m.pinned_at || null,
                pinnedByName: m.pinned_by_name || null,
                pinnedById: m.pinned_by_id || null,
                isEdited: m.is_edited || false,
                editedAt: m.edited_at || null,
                isDeleted: m.is_deleted || false,
                deletedAt: m.deleted_at || null,
                senderId: m.sender_id,
                senderName: m.sender_name,
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
                rawTimestamp: m.created_at,
                attachments: parsedAttachments,
                reactions: createReactionsArray([]),
              };

              const merged = mergeMessageIntoList(updatedList, formatted);
              if (merged !== updatedList) {
                updatedList = merged;
                changed = true;
              }
            }

            if (!changed) return prev;
            return {
              ...prev,
              [activeChannelId]: updatedList,
            };
          });
        }
      } catch {
        // silent fallback
      }
    }, 4000);

    return () => clearInterval(syncInterval);
  }, [activeChannelId]);

  // Handle switching to a Direct Message with a team member
  const handleSelectDirectMessage = async (member: WorkspaceMember) => {
    // Reset right dock when switching channels to avoid cross-context confusion
    if (rightPanelMode === "thread") {
      setRightPanelMode("none");
      setActiveThreadParent(null);
    }

    setIsMobileSidebarOpen(false);
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
    if (rightPanelMode === "thread") {
      setRightPanelMode("none");
      setActiveThreadParent(null);
    }
    setActiveDmRecipient(null);
    setActiveChannelId(channelId);
    setIsMobileSidebarOpen(false);
  };

  // Active channel resolution
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
  const mainFeedMessages = activeMessages.filter((m) => !m.parentId);

  // Send message
  const handleSendMessage = async (content: string, attachments?: Attachment[]) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const messageUuid =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `msg-${Date.now()}`;

    // Target channel UUID resolution
    let targetChannelId = activeChannelId;
    if (!UUID_REGEX.test(targetChannelId)) {
      const matched = channels.find(
        (c) => c.id === targetChannelId || c.name === activeChannel.name
      );
      if (matched && UUID_REGEX.test(matched.id)) {
        targetChannelId = matched.id;
      }
    }

    const newMessage: Message = {
      id: messageUuid,
      channelId: targetChannelId,
      sender: currentUser,
      senderId: currentUser.id,
      senderName: currentUser.name,
      content,
      attachments: attachments || [],
      createdAt: timeString,
      rawTimestamp: new Date().toISOString(),
      reactions: createReactionsArray([]),
    };

    // Optimistically add to state with de-duplication check
    setMessagesByChannel((prev) => ({
      ...prev,
      [targetChannelId]: mergeMessageIntoList(prev[targetChannelId] || [], newMessage),
    }));

    try {
      const { error: insertError } = await supabase
        .from("messages")
        .insert({
          id: messageUuid,
          channel_id: targetChannelId,
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
      if (attachments && attachments.length > 0) {
        for (const att of attachments) {
          await supabase.from("attachments").insert({
            message_id: messageUuid,
            channel_id: targetChannelId,
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

  // Reactions (Feature 11)
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

    // Also update thread replies if message is in thread panel
    setThreadReplies((prev) =>
      prev.map((r) => {
        if (r.id !== messageId) return r;
        const currentReactions = reactionsMapToArray(r.reactions);
        const existingIdx = currentReactions.findIndex((x) => x.emoji === emoji);
        let updatedReactions = [...currentReactions];

        if (existingIdx > -1) {
          const rx = updatedReactions[existingIdx];
          const hasUser = rx.users.includes(currentUser.id);
          if (hasUser) {
            const nextUsers = rx.users.filter((id) => id !== currentUser.id);
            if (nextUsers.length === 0) {
              updatedReactions.splice(existingIdx, 1);
            } else {
              updatedReactions[existingIdx] = {
                ...rx,
                count: Math.max(0, rx.count - 1),
                users: nextUsers,
              };
            }
          } else {
            updatedReactions[existingIdx] = {
              ...rx,
              count: rx.count + 1,
              users: [...rx.users, currentUser.id],
            };
          }
        } else {
          updatedReactions.push({ emoji, count: 1, users: [currentUser.id] });
        }

        return { ...r, reactions: createReactionsArray(updatedReactions) };
      })
    );

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

  // Feature 13: Open Thread in Side Panel
  const handleOpenThread = async (parentMessage: Message) => {
    setActiveThreadParent(parentMessage);
    setRightPanelMode("thread");
    setIsThreadLoading(true);

    try {
      // 1. Initial local load
      const channelMsgs = messagesByChannel[activeChannelId] || [];
      const localReplies = channelMsgs.filter((m) => m.parentId === parentMessage.id);
      if (localReplies.length > 0) {
        setThreadReplies(localReplies);
      }

      // 2. Supabase DB fetch
      if (UUID_REGEX.test(parentMessage.id)) {
        const { data: dbReplies, error } = await supabase
          .from("messages")
          .select("*")
          .eq("parent_id", parentMessage.id)
          .order("created_at", { ascending: true });

        if (error) throw error;

        if (dbReplies) {
          const replyIds = dbReplies.map((r: any) => r.id);
          let reactionsByMsg: Record<string, { emoji: string; count: number; users: string[] }[]> = {};

          if (replyIds.length > 0) {
            const { data: dbReactions } = await supabase
              .from("reactions")
              .select("*")
              .in("message_id", replyIds);

            if (dbReactions) {
              for (const r of dbReactions) {
                const mId = r.message_id;
                if (!reactionsByMsg[mId]) reactionsByMsg[mId] = [];
                const existing = reactionsByMsg[mId].find((x) => x.emoji === r.emoji);
                const uId = r.user_id || r.member_id || "";
                if (existing) {
                  existing.count += 1;
                  if (!existing.users.includes(uId)) existing.users.push(uId);
                } else {
                  reactionsByMsg[mId].push({ emoji: r.emoji, count: 1, users: [uId] });
                }
              }
            }
          }

          const formattedReplies: Message[] = dbReplies.map((r: any) => {
            let atts: Attachment[] = [];
            if (Array.isArray(r.attachments)) atts = r.attachments;
            else if (typeof r.attachments === "string") {
              try {
                atts = JSON.parse(r.attachments);
              } catch {
                atts = [];
              }
            }
            return {
              id: r.id,
              channelId: r.channel_id,
              parentId: r.parent_id,
              senderId: r.sender_id,
              senderName: r.sender_name,
              sender: {
                id: r.sender_id || "user-anon",
                name: r.sender_name || "Colleague",
                email: "colleague@kaelixo.com",
                avatar:
                  r.sender_avatar ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                    r.sender_name || "member"
                  )}`,
                role: (r.sender_role as any) || "member",
                department: (r.sender_department as any) || "dev",
                status: "online",
              },
              content: r.content || "",
              createdAt: new Date(r.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              attachments: atts,
              reactions: createReactionsArray(reactionsByMsg[r.id] || []),
              isEdited: r.is_edited || false,
              editedAt: r.edited_at || null,
              isDeleted: r.is_deleted || false,
              deletedAt: r.deleted_at || null,
            };
          });

          setThreadReplies(formattedReplies);
        }
      }
    } catch (err) {
      console.warn("Failed to load thread replies:", err);
    } finally {
      setIsThreadLoading(false);
    }
  };

  // Feature 13: Send Thread Reply
  const handleSendThreadReply = async (
    content: string,
    parentId: string,
    attachments?: Attachment[]
  ) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const replyUuid =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `reply-${Date.now()}`;

    const newReply: Message = {
      id: replyUuid,
      channelId: activeChannelId,
      parentId,
      sender: currentUser,
      senderId: currentUser.id,
      senderName: currentUser.name,
      content,
      attachments: attachments || [],
      createdAt: timeString,
      rawTimestamp: new Date().toISOString(),
      reactions: createReactionsArray([]),
    };

    // 1. Optimistic update in threadReplies
    setThreadReplies((prev) => [...prev, newReply]);

    // 2. Increment parent threadCount & update lastReplyAt in main feed
    setMessagesByChannel((prev) => {
      const channelMsgs = prev[activeChannelId] || [];
      const updated = channelMsgs.map((m) => {
        if (m.id === parentId) {
          return {
            ...m,
            threadCount: (m.threadCount || 0) + 1,
            lastReplyAt: now.toISOString(),
          };
        }
        return m;
      });
      return {
        ...prev,
        [activeChannelId]: updated,
      };
    });

    // 3. Update activeThreadParent state
    setActiveThreadParent((prev) => {
      if (prev && prev.id === parentId) {
        return {
          ...prev,
          threadCount: (prev.threadCount || 0) + 1,
          lastReplyAt: now.toISOString(),
        };
      }
      return prev;
    });

    // 4. Persist to Supabase
    try {
      await supabase.from("messages").insert({
        id: replyUuid,
        channel_id: activeChannelId,
        parent_id: parentId,
        content: content || "",
        sender_name: currentUser.name,
        sender_avatar: currentUser.avatar,
        sender_role: currentUser.role,
        sender_department: currentUser.department,
        attachments: attachments || [],
      });

      if (attachments && attachments.length > 0) {
        for (const att of attachments) {
          await supabase.from("attachments").insert({
            message_id: replyUuid,
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
    } catch (err) {
      console.warn("Thread reply insert note:", err);
    }
  };

  // Feature 18: Toggle Message Pin
  const handleTogglePin = async (messageId: string, currentPinStatus: boolean) => {
    const channelList = messagesByChannel[activeChannelId] || [];
    const targetMessage = channelList.find((m) => m.id === messageId);
    if (!targetMessage) return;

    // Guard: Reject pinning an already deleted message (contract requirement R4-B.5)
    if (!currentPinStatus && targetMessage.isDeleted) {
      console.warn("Cannot pin a deleted message");
      return;
    }

    const nextStatus = !currentPinStatus;
    const nowIso = new Date().toISOString();

    // 1. Optimistic local state update
    setMessagesByChannel((prev) => {
      const list = prev[activeChannelId] || [];
      return {
        ...prev,
        [activeChannelId]: list.map((m) =>
          m.id === messageId
            ? {
                ...m,
                isPinned: nextStatus,
                pinnedAt: nextStatus ? nowIso : null,
                pinnedByName: nextStatus ? currentUser.name : null,
                pinnedById: nextStatus ? currentUser.id : null,
              }
            : m
        ),
      };
    });

    // 2. Persist to Supabase if valid UUID
    if (UUID_REGEX.test(messageId)) {
      try {
        await supabase
          .from("messages")
          .update({
            is_pinned: nextStatus,
            pinned_at: nextStatus ? nowIso : null,
            pinned_by_name: nextStatus ? currentUser.name : null,
            pinned_by_id: nextStatus ? currentUser.id : null,
          })
          .eq("id", messageId);
      } catch (e) {
        console.warn("Toggle pin error:", e);
      }
    }
  };

  // Feature 16: Edit Message (Inline with author check & Enter/Esc controls)
  const handleEditMessage = async (messageId: string, newContent: string) => {
    const nowIso = new Date().toISOString();

    // 1. Optimistic update
    setMessagesByChannel((prev) => {
      const list = prev[activeChannelId] || [];
      const targetMsg = list.find((m) => m.id === messageId);
      if (!targetMsg) return prev;

      // Guard: Author check
      const isAuthor =
        targetMsg.sender.id === currentUser.id ||
        targetMsg.sender.name === currentUser.name ||
        targetMsg.senderId === currentUser.id;
      if (!isAuthor) {
        console.warn("Unauthorized: only author can edit message");
        return prev;
      }

      return {
        ...prev,
        [activeChannelId]: list.map((m) =>
          m.id === messageId
            ? { ...m, content: newContent, isEdited: true, editedAt: nowIso, updatedAt: nowIso }
            : m
        ),
      };
    });

    // Sync to thread replies if present
    setThreadReplies((prev) =>
      prev.map((r) =>
        r.id === messageId
          ? { ...r, content: newContent, isEdited: true, editedAt: nowIso }
          : r
      )
    );

    // Sync to active thread parent if present
    setActiveThreadParent((prev) =>
      prev && prev.id === messageId
        ? { ...prev, content: newContent, isEdited: true, editedAt: nowIso }
        : prev
    );

    // 2. Supabase DB update
    if (UUID_REGEX.test(messageId)) {
      try {
        await supabase
          .from("messages")
          .update({
            content: newContent,
            is_edited: true,
            edited_at: nowIso,
            updated_at: nowIso,
          })
          .eq("id", messageId);
      } catch (e) {
        console.warn("Edit message error:", e);
      }
    }
  };

  // Feature 17: Delete Message (Soft delete tombstone & unpinning)
  const handleDeleteMessage = async (messageId: string) => {
    const nowIso = new Date().toISOString();

    // 1. Optimistic update
    setMessagesByChannel((prev) => {
      const list = prev[activeChannelId] || [];
      const targetMsg = list.find((m) => m.id === messageId);
      if (!targetMsg) return prev;

      // Guard: Author check
      const isAuthor =
        targetMsg.sender.id === currentUser.id ||
        targetMsg.sender.name === currentUser.name ||
        targetMsg.senderId === currentUser.id;
      if (!isAuthor) {
        console.warn("Unauthorized: only author can delete message");
        return prev;
      }

      return {
        ...prev,
        [activeChannelId]: list.map((m) =>
          m.id === messageId
            ? {
                ...m,
                isDeleted: true,
                content: "This message was deleted",
                isPinned: false,
                pinnedAt: null,
                pinnedByName: null,
                deletedAt: nowIso,
              }
            : m
        ),
      };
    });

    // Sync to thread replies if present
    setThreadReplies((prev) =>
      prev.map((r) =>
        r.id === messageId
          ? { ...r, isDeleted: true, content: "This message was deleted", deletedAt: nowIso }
          : r
      )
    );

    // Sync to active thread parent if present
    setActiveThreadParent((prev) =>
      prev && prev.id === messageId
        ? { ...prev, isDeleted: true, content: "This message was deleted", deletedAt: nowIso }
        : prev
    );

    // 2. Supabase DB update
    if (UUID_REGEX.test(messageId)) {
      try {
        await supabase
          .from("messages")
          .update({
            is_deleted: true,
            content: "This message was deleted",
            is_pinned: false,
            pinned_at: null,
            pinned_by_name: null,
            deleted_at: nowIso,
            updated_at: nowIso,
          })
          .eq("id", messageId);
      } catch (e) {
        console.warn("Delete message error:", e);
      }
    }
  };



  // Dock toggles
  const handleTogglePinnedDrawer = () => {
    setRightPanelMode((prev) => (prev === "pinned" ? "none" : "pinned"));
  };

  const handleToggleDetailsDrawer = () => {
    setRightPanelMode((prev) => (prev === "details" ? "none" : "details"));
  };

  const handleCloseRightDock = () => {
    setRightPanelMode("none");
    setActiveThreadParent(null);
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
          content: `🎉 #${data.name} channel created! ${
            data.topic ? `**Topic:** ${data.topic}` : ""
          }`,
          createdAt: "Just now",
          reactions: createReactionsArray([{ emoji: "🎉", count: 1, users: [currentUser.id] }]),
        },
      ],
    }));

    try {
      const { data: dbChan } = await supabase
        .from("channels")
        .insert({
          organization_id: activeOrg.id,
          name: data.name,
          topic: data.topic,
          is_private: data.isPrivate,
        })
        .select()
        .single();

      if (dbChan?.id) {
        setChannels((prev) =>
          prev.map((c) => (c.id === localId ? { ...c, id: dbChan.id } : c))
        );
        setActiveChannelId(dbChan.id);
        setMessagesByChannel((prev) => {
          const list = prev[localId] || [];
          const next = { ...prev };
          delete next[localId];
          next[dbChan.id] = list.map((m) => ({ ...m, channelId: dbChan.id }));
          return next;
        });
      }
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

  // Update Company (Name & Logo managed by manager)
  const handleUpdateCompany = async (
    orgId: string,
    updates: { name: string; logo_url?: string | null }
  ) => {
    const updatedOrg = { ...activeOrg, ...updates };
    setActiveOrg(updatedOrg);
    setOrganizations((prev) =>
      prev.map((o) => (o.id === orgId ? { ...o, ...updates } : o))
    );
    try {
      localStorage.setItem("kaelixo_org", JSON.stringify(updatedOrg));
    } catch {}

    try {
      await supabase
        .from("organizations")
        .update({
          name: updates.name,
          logo_url: updates.logo_url ?? null,
        })
        .eq("id", orgId);
    } catch (err) {
      console.error("Failed to update organization in Supabase:", err);
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

  const pinnedCount = activeMessages.filter((m) => m.isPinned && !m.isDeleted).length;
  const isPinnedOpen = rightPanelMode === "pinned";

  return (
    <div className="flex h-screen bg-white dark:bg-neutral-950 overflow-hidden font-sans antialiased text-neutral-900 dark:text-neutral-100">
      {/* Sidebar with Company Switcher & DMs */}
      <Sidebar
        organizations={organizations}
        activeOrg={activeOrg}
        onSelectOrg={setActiveOrg}
        onOpenNewCompanyModal={() => setIsNewCompanyModalOpen(true)}
        onOpenEditCompanyModal={() => setIsEditCompanyModalOpen(true)}
        departments={departments}
        selectedDepartment={selectedDepartment}
        onSelectDepartment={setSelectedDepartment}
        onOpenNewDepartmentModal={() => setIsNewDepartmentModalOpen(true)}
        channels={channels}
        activeChannelId={activeChannelId}
        onSelectChannel={handleSelectRegularChannel}
        teamMembers={membersWithPresence}
        currentUser={currentUser}
        onOpenNewChannelModal={() => setIsNewChannelModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenInviteModal={() => setIsInviteModalOpen(true)}
        onOpenMemberDirectory={() => setIsMemberDirectoryOpen(true)}
        onOpenGamesModal={() => setIsGamesModalOpen(true)}
        onOpenPreferences={() => openPreferences("appearance")}
        onOpenUserProfile={(member) => {
          setActiveProfileMember(member);
          setRightPanelMode("profile");
        }}
        onSelectDirectMessage={handleSelectDirectMessage}
        onLogout={handleLogout}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Chat Stage */}
      <main
        className={`flex-1 flex flex-col h-screen min-w-0 bg-white dark:bg-neutral-950 transition-all duration-300 ${
          !isAuthenticated ? "filter blur-[2px] pointer-events-none select-none opacity-40" : ""
        }`}
      >
        {/* Top Header */}
        <header className="h-14 sm:h-16 px-3 sm:px-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between flex-shrink-0 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md transition-colors duration-200">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1 mr-2">
            {/* Mobile Hamburger Toggle with Realtime Status Dot */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="relative p-2 -ml-1 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900 md:hidden transition flex-shrink-0 cursor-pointer"
              title="Open Navigation"
            >
              <Menu className="w-5 h-5" />
              <span
                className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
                  isLiveConnected ? "bg-emerald-500 animate-pulse" : "bg-indigo-500"
                }`}
              />
            </button>
            {activeDmRecipient ? (
              <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0">
                <div
                  className="relative flex-shrink-0 cursor-pointer group/dmheader"
                  onClick={() => {
                    setActiveProfileMember(activeDmRecipient);
                    setRightPanelMode("profile");
                  }}
                  title="View Profile Details"
                >
                  <img
                    src={activeDmRecipient.avatar}
                    alt={activeDmRecipient.name}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-neutral-200 dark:bg-neutral-800 ring-1 ring-neutral-300 dark:ring-neutral-700 group-hover/dmheader:ring-2 group-hover/dmheader:ring-indigo-500 transition object-cover"
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-neutral-900 ${
                      activeDmRecipient.online || activeDmRecipient.status === "online"
                        ? "bg-emerald-500"
                        : activeDmRecipient.status === "away"
                        ? "bg-amber-500"
                        : activeDmRecipient.status === "in_call"
                        ? "bg-rose-500 animate-pulse"
                        : "bg-neutral-400"
                    }`}
                  />
                </div>
                <div
                  className="min-w-0 truncate cursor-pointer"
                  onClick={() => {
                    setActiveProfileMember(activeDmRecipient);
                    setRightPanelMode("profile");
                  }}
                >
                  <h2 className="font-bold text-sm sm:text-base text-neutral-900 dark:text-white tracking-tight truncate hover:underline hover:text-indigo-600 dark:hover:text-indigo-400">
                    {activeDmRecipient.name}
                  </h2>
                  <p className="text-[10px] sm:text-[11px] text-neutral-400 capitalize truncate hidden sm:block">
                    {activeDmRecipient.role} • {activeDmRecipient.department} Department
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
                {activeChannel.isPrivate ? (
                  <Lock className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                ) : (
                  <Hash className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-400 flex-shrink-0" />
                )}
                <h2 className="font-bold text-sm sm:text-base text-neutral-900 dark:text-white tracking-tight truncate flex-shrink-0 max-w-[130px] sm:max-w-none">
                  {activeChannel.name}
                </h2>
                {activeChannel.departmentCode && activeChannel.departmentCode !== "all" && (
                  <span className="hidden sm:inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40 flex-shrink-0">
                    {activeChannel.departmentCode}
                  </span>
                )}
                {activeChannel.topic && (
                  <span className="text-xs text-neutral-400 border-l border-neutral-200 dark:border-neutral-800 pl-3 truncate max-w-[180px] md:max-w-xs lg:max-w-md hidden md:inline">
                    {activeChannel.topic}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Action Tools: Minimal Slack-Parity Navbar (Search, Notifications, Members, Profile) */}
          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            {/* 1. Global Search Pill */}
            <button
              type="button"
              onClick={() => setIsSearchModalOpen(true)}
              className="hidden sm:flex items-center justify-between w-40 md:w-56 lg:w-72 h-8 px-2.5 rounded-lg bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200/80 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition cursor-pointer"
              title="Search messages & channels (Ctrl+K)"
            >
              <div className="flex items-center space-x-2">
                <Search className="w-3.5 h-3.5 text-neutral-400" />
                <span>Search...</span>
              </div>
              <kbd className="text-[10px] bg-white dark:bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 font-mono text-neutral-400 shadow-2xs">
                Ctrl K
              </kbd>
            </button>
            <button
              type="button"
              onClick={() => setIsSearchModalOpen(true)}
              className="sm:hidden p-2 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
              title="Search (Ctrl+K)"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* 2. In-App Notifications Center (Bell) */}
            <NotificationCenter
              notifications={notifications}
              unreadCount={unreadNotificationCount}
              onMarkAsRead={handleMarkNotificationAsRead}
              onMarkAllAsRead={handleMarkAllNotificationsAsRead}
              onSelectNotification={handleSelectNotification}
            />

            {/* 3. Member Directory Trigger (Users) */}
            <button
              type="button"
              onClick={() => setIsMemberDirectoryOpen(true)}
              className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
              title="People & Member Directory"
            >
              <Users className="w-4 h-4" />
            </button>

            {/* 4. User Profile Avatar Trigger */}
            <button
              type="button"
              onClick={() => {
                setActiveProfileMember(currentUser);
                setRightPanelMode((prev) => (prev === "profile" ? "none" : "profile"));
              }}
              className="relative p-0.5 rounded-lg hover:ring-2 hover:ring-indigo-500/50 transition cursor-pointer flex-shrink-0"
              title={`${currentUser.name} — Profile & Settings`}
            >
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-cover ring-1 ring-neutral-200 dark:ring-neutral-700"
                />
              ) : (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-neutral-950 ${
                  currentUser.online || currentUser.status === "online"
                    ? "bg-emerald-500"
                    : "bg-neutral-400"
                }`}
              />
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

        {/* Message Feed (Features 14, 15, 16, 17, 18) */}
        <MessageFeed
          messages={mainFeedMessages}
          currentUser={currentUser}
          onAddReaction={handleAddReaction}
          members={membersWithPresence}
          onOpenThread={handleOpenThread}
          onTogglePin={handleTogglePin}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          onOpenProfile={(member) => {
            setActiveProfileMember(member);
            setRightPanelMode("profile");
          }}
          channelId={activeChannelId}
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

      {/* Feature 12 & Feature 27: Unified Multi-Dock Right Rail Architecture */}
      {rightPanelMode === "pinned" && (
        <PinnedMessagesDrawer
          channelName={activeChannel.name}
          isDm={activeChannel.isDm}
          pinnedMessages={activeMessages.filter((m) => m.isPinned && !m.isDeleted)}
          currentUser={currentUser}
          onClose={handleCloseRightDock}
          onUnpin={(messageId) => handleTogglePin(messageId, true)}
          onJumpToMessage={handleJumpToMessage}
        />
      )}

      {rightPanelMode === "thread" && activeThreadParent && (
        <ThreadPanel
          parentMessage={activeThreadParent}
          replies={threadReplies}
          currentUser={currentUser}
          channelName={activeChannel.name}
          isDm={activeChannel.isDm}
          onClose={handleCloseRightDock}
          onSendReply={handleSendThreadReply}
          onAddReaction={handleAddReaction}
          members={membersWithPresence}
          onOpenProfile={(member) => {
            setActiveProfileMember(member);
            setRightPanelMode("profile");
          }}
        />
      )}

      {rightPanelMode === "profile" && activeProfileMember && (
        <UserProfileDrawer
          member={activeProfileMember}
          currentUser={currentUser}
          onClose={handleCloseRightDock}
          onStartDm={(member) => {
            handleSelectDirectMessage(member);
            handleCloseRightDock();
          }}
          onOpenEditProfile={() => setIsEditProfileModalOpen(true)}
          onOpenPreferences={() => openPreferences("appearance")}
          onToggleColorMode={toggleColorMode}
          resolvedMode={resolvedMode}
          onOpenPinned={handleTogglePinnedDrawer}
          onOpenGames={() => setIsGamesModalOpen(true)}
          onOpenInvite={() => setIsInviteModalOpen(true)}
          onSignOut={handleLogout}
        />
      )}

      {rightPanelMode === "details" && (
        <aside className="fixed inset-0 z-50 sm:static sm:inset-auto sm:z-30 w-full sm:w-80 border-l border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 p-5 flex flex-col h-screen overflow-y-auto shadow-xl animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
            <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
              {activeDmRecipient ? "Member Profile" : "Channel Details"}
            </h3>
            <button
              onClick={handleCloseRightDock}
              className="text-neutral-400 hover:text-neutral-600 text-xs font-semibold cursor-pointer"
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
                    Topic
                  </p>
                  <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                    {activeChannel.topic || "No topic set for this channel"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                    Department
                  </p>
                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 capitalize">
                    {activeChannel.departmentCode || "Company Wide"}
                  </p>
                </div>
              </>
            )}

            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3 block">
                Workspace Members ({membersWithPresence.length})
              </span>
              <div className="space-y-2">
                {membersWithPresence.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => {
                      setActiveProfileMember(m);
                      setRightPanelMode("profile");
                    }}
                    className="flex items-center space-x-2.5 p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition"
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={m.avatar}
                        alt={m.name}
                        className="w-6 h-6 rounded-lg bg-neutral-200 dark:bg-neutral-800"
                      />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ${
                          m.status === "in_call"
                            ? "bg-rose-500 animate-pulse"
                            : m.status === "away"
                            ? "bg-amber-500"
                            : m.online || m.status === "online"
                            ? "bg-emerald-500"
                            : "bg-neutral-400"
                        }`}
                      />
                    </div>
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

      {/* Toast Alert Banner */}
      {activeToast && (
        <div
          onClick={() => {
            setActiveChannelId(activeToast.channelId);
            if (activeToast.messageId) {
              handleJumpToMessage(activeToast.messageId);
            }
            setActiveToast(null);
          }}
          className="fixed top-5 right-5 z-50 max-w-sm bg-white dark:bg-neutral-900 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-3.5 shadow-2xl flex items-start space-x-3 cursor-pointer hover:shadow-indigo-500/10 transition animate-in slide-in-from-top-3 duration-200"
        >
          <img
            src={
              activeToast.senderAvatar ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                activeToast.senderName
              )}`
            }
            alt={activeToast.senderName}
            className="w-9 h-9 rounded-xl object-cover bg-neutral-200 dark:bg-neutral-700 flex-shrink-0 ring-1 ring-neutral-300 dark:ring-neutral-700"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="font-bold text-xs text-neutral-900 dark:text-neutral-100 truncate">
                {activeToast.senderName}
              </span>
              <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.2 rounded">
                {activeToast.channelName}
              </span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-300 line-clamp-2 leading-relaxed">
              {activeToast.content}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveToast(null);
            }}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white p-1"
          >
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        </div>
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

      <EditCompanyModal
        isOpen={isEditCompanyModalOpen}
        onClose={() => setIsEditCompanyModalOpen(false)}
        activeOrg={activeOrg}
        onUpdateCompany={handleUpdateCompany}
      />

      <NewDepartmentModal
        isOpen={isNewDepartmentModalOpen}
        onClose={() => setIsNewDepartmentModalOpen(false)}
        onCreateDepartment={handleCreateDepartment}
      />

      <InviteTeamModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        activeOrg={activeOrg}
        currentUser={currentUser}
        onUpdateOrgInviteCode={handleUpdateOrgInviteCode}
      />

      <SlackAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          if (isAuthenticated) setIsAuthModalOpen(false);
        }}
        departments={departments}
        currentUser={currentUser}
        organizations={organizations}
        initialInviteCode={initialInviteCode}
        onLoginSuccess={handleLoginSuccess}
        isDismissible={isAuthenticated}
      />

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        channels={channels}
        messagesByChannel={messagesByChannel}
        onSelectResult={handleSelectSearchResult}
      />

      {/* Member Directory Modal (Features 25 & 26 / R7) */}
      <MemberDirectoryModal
        isOpen={isMemberDirectoryOpen}
        onClose={() => setIsMemberDirectoryOpen(false)}
        members={membersWithPresence}
        currentUser={currentUser}
        departments={departments}
        activeOrg={activeOrg}
        onSelectMemberForDm={(member) => {
          handleSelectDirectMessage(member);
          setIsMemberDirectoryOpen(false);
        }}
        onOpenProfileDrawer={(member) => {
          setActiveProfileMember(member);
          setRightPanelMode("profile");
          setIsMemberDirectoryOpen(false);
        }}
        onOpenAddMemberModal={() => {
          setIsMemberDirectoryOpen(false);
          setIsAddMemberModalOpen(true);
        }}
        onRemoveMember={handleRemoveMember}
      />

      {/* Add Member Modal (Feature 26 / R7) */}
      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        currentUser={currentUser}
        departments={departments}
        existingEmails={teamMembers.map((m) => m.email)}
        onAddMember={handleAddMember}
      />

      {/* Edit Profile Modal (Feature 27 / R8) */}
      <EditProfileModal
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
        currentUser={currentUser}
        departments={departments}
        onSaveProfile={handleSaveProfile}
        companyName={activeOrg.name}
      />

      {/* Team Arcade & Duo Games Modal */}
      <GamesModal
        isOpen={isGamesModalOpen}
        onClose={() => setIsGamesModalOpen(false)}
        currentUser={currentUser}
        teamMembers={membersWithPresence}
        onShareToChannel={(text) => handleSendMessage(text)}
        activeChannelName={activeChannel.name}
      />

      {/* Slack Preferences & Appearance Modal */}
      <PreferencesModal
        isOpen={isPreferencesOpen}
        onClose={closePreferences}
        defaultTab={initialTab}
      />
    </div>
  );
}
