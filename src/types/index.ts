// ==============================================================================
// KAELIXO TYPE DEFINITIONS & INTERFACE CONTRACTS
// ==============================================================================

export type DepartmentCode = string;

export interface Department {
  id: string;
  organization_id?: string;
  name: string;
  code: DepartmentCode;
  description: string;
  icon: string;
  color: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  plan?: string;
  invite_code?: string;
}

export type MemberRole =
  | "owner"
  | "admin"
  | "manager"
  | "member"
  | "Workspace Owner"
  | "Department Head"
  | "Manager"
  | "Member";

export interface WorkspaceMember {
  id: string;
  name: string;
  displayName?: string;
  email: string;
  phone?: string;
  avatar: string;
  role: MemberRole;
  title?: string;
  department: DepartmentCode;
  status: "online" | "away" | "offline" | "in_call";
  statusText?: string;
  statusEmoji?: string;
  bio?: string;
  online?: boolean;
  isActive?: boolean;
}

// ------------------------------------------------------------------------------
// Channel Contracts
// ------------------------------------------------------------------------------

export interface Channel {
  id: string;
  organizationId?: string;
  name: string;
  topic?: string;
  departmentId?: string;
  departmentCode?: DepartmentCode;
  isPrivate: boolean;
  unreadCount?: number;
  isDm?: boolean;
  recipientId?: string;
  recipientName?: string;
  recipientAvatar?: string;
  createdAt?: string;
}

// ------------------------------------------------------------------------------
// Attachment Contracts (R1 / PROJECT.md Contract 1)
// ------------------------------------------------------------------------------

export type FileCategory = "image" | "file" | "code" | "pdf";

export interface Attachment {
  id: string;
  name: string;
  size: number; // Size in bytes
  type: string; // MIME type (e.g. "image/png", "application/pdf")
  url: string;  // Public URL in kaelixo-attachments bucket
  storagePath: string; // Storage path: `${channelId}/${timestamp}-${safeFileName}`
}

/** @deprecated Use Attachment instead */
export type MessageAttachment = Attachment;

// ------------------------------------------------------------------------------
// Reaction Contracts (R2 / PROJECT.md Contract 3)
// ------------------------------------------------------------------------------

export interface ReactionRecord {
  id: string;
  messageId: string;
  userId: string;
  userName: string;
  emoji: string;
  createdAt: string;
}

export interface MessageReactionSummary {
  count: number;
  users: string[]; // user IDs or names who reacted
  userNames?: string[];
}

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[]; // User IDs or names who reacted
  userNames?: string[];
}

export interface MessageReactionsArray extends Array<MessageReaction> {
  [emoji: string]: any;
}

export type ReactionsMap = Record<string, MessageReactionSummary>;
export type MessageReactions = MessageReactionsArray;

// ------------------------------------------------------------------------------
// Message Entity Contract (R1-R4 / PROJECT.md Contract 2)
// ------------------------------------------------------------------------------

export interface Message {
  id: string;
  channelId: string;
  // Denormalized sender metadata (high-performance chat feed)
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  senderRole?: string;
  senderDepartment?: string;
  // Backward compatibility object for existing frontend components
  sender: WorkspaceMember;
  content: string;
  // Thread replies support (R3)
  parentId?: string | null;
  threadCount?: number;
  lastReplyAt?: string | null;
  // File attachments (R1)
  attachments?: Attachment[];
  // Emoji reactions (R2)
  reactions: MessageReactions;
  // Pinning (R4)
  isPinned?: boolean;
  pinnedAt?: string | null;
  pinnedByName?: string | null;
  pinnedById?: string | null;
  // Editing (R4)
  isEdited?: boolean;
  editedAt?: string | null;
  // Soft deletion tombstone (R4)
  isDeleted?: boolean;
  deletedAt?: string | null;
  // Timestamps
  createdAt: string;
  updatedAt?: string;
}

// ------------------------------------------------------------------------------
// Right Dock State Contract (PROJECT.md Contract 4)
// ------------------------------------------------------------------------------

export type RightPanelMode = "none" | "thread" | "pinned" | "details" | "profile";

// ------------------------------------------------------------------------------
// Notification Contracts (R5)
// ------------------------------------------------------------------------------

export type NotificationType = "mention" | "dm" | "reaction" | "reply" | "thread_reply";

export interface Notification {
  id: string;
  userId: string;       // Target recipient
  senderId?: string;    // Actor who triggered notification
  senderName?: string;
  senderAvatar?: string;
  type: NotificationType;
  channelId: string;
  channelName?: string;
  messageId?: string;
  content: string;
  read?: boolean;
  isRead?: boolean;
  createdAt: string;
}

// ------------------------------------------------------------------------------
// Member Presence Contracts (R5)
// ------------------------------------------------------------------------------

export interface UserPresence {
  userId: string;
  name?: string;
  userName?: string;
  avatar?: string;
  department?: string;
  role?: string;
  status: "online" | "away" | "offline" | "in_call";
  statusText?: string;
  lastSeen: string;
  updatedAt?: string;
}

// ------------------------------------------------------------------------------
// Search Contracts (R4)
// ------------------------------------------------------------------------------

export interface SearchMessageResult {
  id: string;
  channelId: string;
  channelName: string;
  senderId?: string;
  senderName: string;
  senderAvatar?: string;
  senderRole?: string;
  content: string;
  attachments?: Attachment[];
  parentId?: string | null;
  replyCount?: number;
  isPinned?: boolean;
  createdAt: string;
  rank?: number;
}

// ------------------------------------------------------------------------------
// Helper Type Converters (Reactions Normalization)
// ------------------------------------------------------------------------------

export function reactionsMapToArray(reactions?: MessageReactions | ReactionsMap): MessageReaction[] {
  if (!reactions) return [];
  if (Array.isArray(reactions)) return reactions;
  return Object.entries(reactions).map(([emoji, data]) => ({
    emoji,
    count: data.count,
    users: data.users,
    userNames: (data as MessageReactionSummary).userNames,
  }));
}

export function reactionListToMap(reactions?: MessageReaction[] | MessageReactions): ReactionsMap {
  if (!reactions) return {};
  const map: ReactionsMap = {};
  for (const r of reactions) {
    map[r.emoji] = { count: r.count, users: r.users };
  }
  return map;
}

/**
 * Wraps an array or map of reactions into a dual Array/Record structure (MessageReactionsArray).
 * Satisfies both Array iteration (.map(), .filter(), .length) and dictionary access (reactions["🚀"]).
 */
export function createReactionsArray(
  items: MessageReaction[] | ReactionsMap = []
): MessageReactionsArray {
  const list: MessageReaction[] = Array.isArray(items)
    ? items
    : reactionsMapToArray(items);
  const arr = [...list] as MessageReactionsArray;
  for (const item of list) {
    if (item && item.emoji) {
      (arr as unknown as Record<string, MessageReactionSummary>)[item.emoji] = {
        count: item.count,
        users: item.users,
        userNames: item.userNames,
      };
    }
  }
  return arr;
}
