import { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Message, WorkspaceMember } from "@/types";

export interface RealtimeHandlers {
  onMessageInsert: (message: Message) => void;
  onMessageUpdate: (message: Message) => void;
  onMessageDelete: (messageId: string, channelId?: string) => void;
  onReactionInsert: (reaction: {
    messageId: string;
    userId: string;
    userName: string;
    emoji: string;
  }) => void;
  onReactionDelete: (reaction: {
    messageId: string;
    userId: string;
    userName: string;
    emoji: string;
  }) => void;
  onStatusChange?: (status: string) => void;
}

/**
 * Formats a raw database message row into the application's Message model.
 */
export function formatDbMessage(row: any): Message {
  let parsedAttachments = [];
  if (Array.isArray(row.attachments)) {
    parsedAttachments = row.attachments;
  } else if (typeof row.attachments === "string") {
    try {
      parsedAttachments = JSON.parse(row.attachments);
    } catch {
      parsedAttachments = [];
    }
  }

  const senderId = row.sender_id || "user-anon";
  const senderName = row.sender_name || "Colleague";
  const senderAvatar =
    row.sender_avatar ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(senderName)}`;
  const senderRole = row.sender_role || "member";
  const senderDepartment = row.sender_department || "dev";

  return {
    id: row.id,
    channelId: row.channel_id,
    senderId,
    senderName,
    senderAvatar,
    senderRole,
    senderDepartment,
    sender: {
      id: senderId,
      name: senderName,
      email: `${senderId}@kaelixo.com`,
      avatar: senderAvatar,
      role: (senderRole === "owner" || senderRole === "admin" || senderRole === "manager") ? senderRole : "member",
      department: senderDepartment,
      status: "online",
    },
    content: row.content || "",
    createdAt: new Date(row.created_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    reactions: [], // Reconciled from reactions table
    attachments: parsedAttachments,
    parentId: row.parent_id || null,
    threadCount: row.reply_count || 0,
    lastReplyAt: row.last_reply_at || null,
    isPinned: Boolean(row.is_pinned),
    pinnedAt: row.pinned_at || null,
    pinnedByName: row.pinned_by_name || null,
    pinnedById: row.pinned_by_id || null,
    isEdited: Boolean(row.is_edited),
    editedAt: row.edited_at || null,
    isDeleted: Boolean(row.is_deleted),
    deletedAt: row.deleted_at || null,
    updatedAt: row.updated_at || row.created_at,
    rawTimestamp: row.created_at,
  };
}

/**
 * Subscribes to Postgres changes on messages and reactions tables.
 * Returns the active RealtimeChannel instance.
 */
export function subscribeToChatEvents(handlers: RealtimeHandlers): RealtimeChannel {
  const supabase = createClient();

  const channel = supabase
    .channel("kaelixo-db-events")
    // 1. Messages INSERT
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      (payload: any) => {
        const row = payload.new;
        if (row && row.id) {
          handlers.onMessageInsert(formatDbMessage(row));
        }
      }
    )
    // 2. Messages UPDATE
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "messages" },
      (payload: any) => {
        const row = payload.new;
        if (row && row.id) {
          handlers.onMessageUpdate(formatDbMessage(row));
        }
      }
    )
    // 3. Messages DELETE
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "messages" },
      (payload: any) => {
        const oldRow = payload.old;
        if (oldRow && oldRow.id) {
          handlers.onMessageDelete(oldRow.id, oldRow.channel_id);
        }
      }
    )
    // 4. Reactions INSERT
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "reactions" },
      (payload: any) => {
        const row = payload.new as any;
        if (row && row.message_id) {
          handlers.onReactionInsert({
            messageId: row.message_id,
            userId: row.user_id || row.member_id || "",
            userName: row.user_name || "Member",
            emoji: row.emoji,
          });
        }
      }
    )
    // 5. Reactions DELETE
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "reactions" },
      (payload: any) => {
        const oldRow = payload.old as any;
        if (oldRow && oldRow.message_id) {
          handlers.onReactionDelete({
            messageId: oldRow.message_id,
            userId: oldRow.user_id || oldRow.member_id || "",
            userName: oldRow.user_name || "Member",
            emoji: oldRow.emoji,
          });
        }
      }
    )
    .subscribe((status: any) => {
      if (handlers.onStatusChange) {
        handlers.onStatusChange(status);
      }
    });

  return channel;
}

/**
 * Presence Manager Interface
 */
export interface UserPresenceState {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  department: string;
  status: "online" | "away" | "in_call" | "offline";
  statusText?: string;
  onlineAt: string;
}

export type PresenceMap = Record<string, UserPresenceState>;

/**
 * Initializes and joins the kaelixo-presence channel.
 * Synchronizes online state across all active workspace members.
 */
export function initPresenceTracker(
  currentUser: WorkspaceMember,
  onPresenceChange: (presences: PresenceMap) => void
): RealtimeChannel {
  const supabase = createClient();

  const presenceChannel = supabase.channel("kaelixo-presence", {
    config: {
      presence: {
        key: currentUser.id,
      },
    },
  });

  const broadcastCurrentPresences = () => {
    const rawState = presenceChannel.presenceState();
    const map: PresenceMap = {};

    Object.keys(rawState).forEach((key) => {
      const presences = rawState[key] as any[];
      if (presences && presences.length > 0) {
        // Take latest presence payload for this key
        const latest = presences[presences.length - 1];
        map[key] = {
          id: latest.id || key,
          name: latest.name || "Member",
          email: latest.email || "",
          avatar: latest.avatar || "",
          role: latest.role || "member",
          department: latest.department || "dev",
          status: latest.status || "online",
          statusText: latest.statusText || "",
          onlineAt: latest.onlineAt || new Date().toISOString(),
        };
      }
    });

    onPresenceChange(map);
  };

  presenceChannel
    .on("presence", { event: "sync" }, () => {
      broadcastCurrentPresences();
    })
    .on("presence", { event: "join" }, () => {
      broadcastCurrentPresences();
    })
    .on("presence", { event: "leave" }, () => {
      broadcastCurrentPresences();
    })
    .subscribe(async (status: any) => {
      if (status === "SUBSCRIBED") {
        await presenceChannel.track({
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          avatar: currentUser.avatar,
          role: currentUser.role,
          department: currentUser.department,
          status: "online",
          statusText: currentUser.statusText || "",
          onlineAt: new Date().toISOString(),
        });
      }
    });

  return presenceChannel;
}

/**
 * Safely unbinds and leaves a RealtimeChannel.
 */
export function teardownChannel(channel: RealtimeChannel | null): void {
  if (!channel) return;
  const supabase = createClient();
  try {
    channel.untrack?.();
    supabase.removeChannel(channel);
  } catch (err) {
    console.warn("Error tearing down realtime channel:", err);
  }
}
