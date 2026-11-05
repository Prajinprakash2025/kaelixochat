/**
 * Kaelixo Slack-Parity E2E Test Suite - Types and Interfaces
 */

export interface Attachment {
  id: string;
  name: string;
  size: number; // in bytes
  type: string; // MIME type
  url: string;  // Public URL in kaelixo-attachments
  storagePath: string;
}

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
  users: string[]; // user IDs or user names
}

export interface Message {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderRole?: string;
  senderDepartment?: string;
  content: string;
  parentId?: string | null;
  threadCount?: number;
  lastReplyAt?: string | null;
  attachments?: Attachment[];
  reactions?: Record<string, MessageReactionSummary>;
  isPinned?: boolean;
  pinnedAt?: string | null;
  pinnedByName?: string | null;
  isEdited?: boolean;
  editedAt?: string | null;
  isDeleted?: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Channel {
  id: string;
  name: string;
  topic?: string;
  isPrivate: boolean;
  isDm?: boolean;
  recipientId?: string;
  recipientName?: string;
  createdAt: string;
}

export interface UserPresence {
  userId: string;
  userName: string;
  status: "online" | "away" | "offline" | "in_call";
  statusText?: string;
  lastSeen: string;
}

export interface Notification {
  id: string;
  userId: string;
  senderId: string;
  senderName: string;
  type: "mention" | "dm" | "thread_reply";
  messageId: string;
  channelId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface TestResult {
  name: string;
  tier: number;
  suite: string;
  passed: boolean;
  durationMs: number;
  error?: Error | string;
}

export interface TestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  tiers: {
    [key: number]: {
      name: string;
      total: number;
      passed: number;
      failed: number;
    };
  };
}
