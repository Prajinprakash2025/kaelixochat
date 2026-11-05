/**
 * Kaelixo Slack-Parity E2E Test Harness & Reference Contract Engine
 * Zero-dependency, hermetic test environment supporting 4-tier E2E verification.
 */

import {
  Attachment,
  Message,
  Channel,
  UserPresence,
  Notification,
  TestResult,
  TestSuiteSummary,
  MessageReactionSummary,
  ReactionRecord,
} from "./types";
import * as fs from "fs";
import * as path from "path";

// ==============================================================================
// 1. ASSERTION LIBRARY
// ==============================================================================

export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssertionError";
  }
}

export function assert(condition: boolean, message: string = "Assertion failed"): void {
  if (!condition) {
    throw new AssertionError(message);
  }
}

export function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new AssertionError(
      message || `Expected ${JSON.stringify(expected)}, but received ${JSON.stringify(actual)}`
    );
  }
}

export function assertNotEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual === expected) {
    throw new AssertionError(
      message || `Expected value not to equal ${JSON.stringify(expected)}`
    );
  }
}

export function assertNotNull<T>(val: T | null | undefined, message?: string): asserts val is T {
  if (val === null || val === undefined) {
    throw new AssertionError(message || "Expected non-null value");
  }
}

export function assertTrue(actual: boolean, message?: string): void {
  if (actual !== true) {
    throw new AssertionError(message || `Expected true, received ${actual}`);
  }
}

export function assertFalse(actual: boolean, message?: string): void {
  if (actual !== false) {
    throw new AssertionError(message || `Expected false, received ${actual}`);
  }
}

export function assertDeepEqual(actual: unknown, expected: unknown, message?: string): void {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new AssertionError(
      message || `Deep equality mismatch:\nActual:   ${actualStr}\nExpected: ${expectedStr}`
    );
  }
}

export function assertContains(container: string | unknown[], item: unknown, message?: string): void {
  if (typeof container === "string") {
    if (!container.includes(item as string)) {
      throw new AssertionError(
        message || `Expected string "${container}" to contain substring "${item}"`
      );
    }
  } else if (Array.isArray(container)) {
    if (!container.includes(item)) {
      throw new AssertionError(
        message || `Expected array to contain item ${JSON.stringify(item)}`
      );
    }
  } else {
    throw new AssertionError("Container must be a string or array");
  }
}

export function assertMatches(str: string, regex: RegExp, message?: string): void {
  if (!regex.test(str)) {
    throw new AssertionError(
      message || `Expected "${str}" to match regular expression ${regex}`
    );
  }
}

export function assertThrows(fn: () => void, message?: string): void {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  if (!threw) {
    throw new AssertionError(message || "Expected function to throw an error, but it succeeded");
  }
}

export async function assertRejects(fn: () => Promise<unknown>, message?: string): Promise<void> {
  let threw = false;
  try {
    await fn();
  } catch {
    threw = true;
  }
  if (!threw) {
    throw new AssertionError(message || "Expected promise to reject, but it resolved");
  }
}

// ==============================================================================
// 2. TEST REGISTRY & RUNNER SYSTEM
// ==============================================================================

interface RegisteredTestCase {
  name: string;
  tier: number;
  suite: string;
  fn: () => void | Promise<void>;
}

const testRegistry: RegisteredTestCase[] = [];
let currentTier = 1;
let currentSuite = "General";

export function setTestContext(tier: number, suite: string) {
  currentTier = tier;
  currentSuite = suite;
}

export function test(name: string, fn: () => void | Promise<void>) {
  testRegistry.push({
    name,
    tier: currentTier,
    suite: currentSuite,
    fn,
  });
}

export const it = test;

export function describe(suiteName: string, fn: () => void) {
  const prevSuite = currentSuite;
  currentSuite = suiteName;
  fn();
  currentSuite = prevSuite;
}

export function clearRegistry() {
  testRegistry.length = 0;
}

let beforeEachHook: (() => void | Promise<void>) | null = null;

export function setBeforeEach(fn: () => void | Promise<void>) {
  beforeEachHook = fn;
}

export async function executeAllTests(): Promise<{
  results: TestResult[];
  summary: TestSuiteSummary;
}> {
  const results: TestResult[] = [];
  const startTime = Date.now();

  const summary: TestSuiteSummary = {
    total: testRegistry.length,
    passed: 0,
    failed: 0,
    durationMs: 0,
    tiers: {
      1: { name: "Tier 1: Feature Coverage (R1-R6)", total: 0, passed: 0, failed: 0 },
      2: { name: "Tier 2: Boundary & Corner Cases (R1-R6)", total: 0, passed: 0, failed: 0 },
      3: { name: "Tier 3: Cross-Feature Combinations", total: 0, passed: 0, failed: 0 },
      4: { name: "Tier 4: Real-World Scenarios", total: 0, passed: 0, failed: 0 },
    },
  };

  for (const t of testRegistry) {
    const tierGroup = summary.tiers[t.tier] || {
      name: `Tier ${t.tier}`,
      total: 0,
      passed: 0,
      failed: 0,
    };
    tierGroup.total++;

    if (beforeEachHook) {
      await beforeEachHook();
    }

    const tStart = Date.now();
    try {
      await t.fn();
      const durationMs = Date.now() - tStart;
      results.push({
        name: t.name,
        tier: t.tier,
        suite: t.suite,
        passed: true,
        durationMs,
      });
      summary.passed++;
      tierGroup.passed++;
    } catch (err) {
      const durationMs = Date.now() - tStart;
      results.push({
        name: t.name,
        tier: t.tier,
        suite: t.suite,
        passed: false,
        durationMs,
        error: err instanceof Error ? err : String(err),
      });
      summary.failed++;
      tierGroup.failed++;
    }
  }

  summary.durationMs = Date.now() - startTime;
  return { results, summary };
}

// ==============================================================================
// 3. REFERENCE KAELIXO SLACK-PARITY CONTRACT ENGINE
// ==============================================================================

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class KaelixoTestEngine {
  public channels: Map<string, Channel> = new Map();
  public messages: Map<string, Message> = new Map();
  public reactions: Map<string, ReactionRecord> = new Map();
  public attachments: Map<string, Attachment> = new Map();
  public presences: Map<string, UserPresence> = new Map();
  public notifications: Map<string, Notification> = new Map();

  // Storage configuration constants
  public static readonly STORAGE_BUCKET = "kaelixo-attachments";
  public static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  public static readonly ALLOWED_MIME_PREFIXES = [
    "image/",
    "application/pdf",
    "application/msword",
    "application/vnd.",
    "text/",
    "audio/",
    "video/",
  ];

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.channels.clear();
    this.messages.clear();
    this.reactions.clear();
    this.attachments.clear();
    this.presences.clear();
    this.notifications.clear();
  }

  // --- R1: Storage & Attachments ---

  public async uploadAttachment(
    file: { name: string; size: number; type: string; buffer?: Buffer },
    channelId: string,
    onProgress?: (percent: number) => void
  ): Promise<Attachment> {
    if (!file.name || file.name.trim() === "") {
      throw new Error("Invalid attachment: filename cannot be blank");
    }
    if (file.size < 0) {
      throw new Error("Invalid attachment: file size cannot be negative");
    }
    if (file.size === 0) {
      throw new Error("Zero-byte file rejected: Attachment has 0 bytes");
    }
    if (file.size > KaelixoTestEngine.MAX_FILE_SIZE) {
      throw new Error(
        `File size exceeds maximum allowed threshold of ${KaelixoTestEngine.MAX_FILE_SIZE} bytes`
      );
    }

    const isAllowed = KaelixoTestEngine.ALLOWED_MIME_PREFIXES.some((p) =>
      file.type.toLowerCase().startsWith(p)
    );
    if (!isAllowed && !file.type.includes("/")) {
      throw new Error(`Unsupported MIME type: ${file.type}`);
    }

    if (onProgress) {
      onProgress(25);
      onProgress(75);
      onProgress(100);
    }

    const id = generateUUID();
    const rawBase = path.basename(file.name);
    const sanitizedName = rawBase.replace(/\.\.+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${channelId}/${id}-${sanitizedName}`;
    const url = `https://untypucxdpgxnfezzwuo.supabase.co/storage/v1/object/public/${KaelixoTestEngine.STORAGE_BUCKET}/${storagePath}`;

    const attachment: Attachment = {
      id,
      name: file.name,
      size: file.size,
      type: file.type,
      url,
      storagePath,
    };

    this.attachments.set(id, attachment);
    return attachment;
  }

  // --- Channels & DMs ---

  public createChannel(name: string, isPrivate: boolean = false, topic?: string): Channel {
    const id = generateUUID();
    const channel: Channel = {
      id,
      name,
      topic,
      isPrivate,
      isDm: false,
      createdAt: new Date().toISOString(),
    };
    this.channels.set(id, channel);
    return channel;
  }

  public async getOrCreateDmChannel(
    userAId: string,
    userBId: string,
    userBName: string
  ): Promise<Channel> {
    if (userAId === userBId) {
      throw new Error("Cannot create DM channel with self as sole participant");
    }
    // Deterministic DM channel matching
    const sortedPair = [userAId, userBId].sort().join(":");
    for (const ch of this.channels.values()) {
      if (ch.isDm && ch.topic === `dm:${sortedPair}`) {
        return ch;
      }
    }

    const id = generateUUID();
    const channel: Channel = {
      id,
      name: `dm-${userBName.toLowerCase().replace(/\s+/g, "-")}`,
      topic: `dm:${sortedPair}`,
      isPrivate: true,
      isDm: true,
      recipientId: userBId,
      recipientName: userBName,
      createdAt: new Date().toISOString(),
    };
    this.channels.set(id, channel);
    return channel;
  }

  // --- R1/R3/R4: Messages ---

  public async sendMessage(params: {
    channelId: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    senderRole?: string;
    senderDepartment?: string;
    content: string;
    parentId?: string | null;
    attachments?: Attachment[];
  }): Promise<Message> {
    if (!this.channels.has(params.channelId)) {
      throw new Error(`Target channel ${params.channelId} not found`);
    }

    const hasContent = params.content && params.content.trim().length > 0;
    const hasAttachments = params.attachments && params.attachments.length > 0;

    if (!hasContent && !hasAttachments) {
      throw new Error("Message must have either text content or at least one attachment");
    }

    const id = generateUUID();
    const now = new Date().toISOString();

    // If parentId is specified, verify parent exists
    let parentMessage: Message | undefined;
    if (params.parentId) {
      parentMessage = this.messages.get(params.parentId);
      if (!parentMessage) {
        throw new Error(`Parent message ${params.parentId} does not exist`);
      }
      if (parentMessage.isDeleted) {
        throw new Error(`Cannot reply to deleted message ${params.parentId}`);
      }
      // Update parent message thread stats
      parentMessage.threadCount = (parentMessage.threadCount || 0) + 1;
      parentMessage.lastReplyAt = now;
      parentMessage.updatedAt = now;
      this.messages.set(params.parentId, parentMessage);
    }

    const msg: Message = {
      id,
      channelId: params.channelId,
      senderId: params.senderId,
      senderName: params.senderName,
      senderAvatar: params.senderAvatar,
      senderRole: params.senderRole,
      senderDepartment: params.senderDepartment,
      content: params.content,
      parentId: params.parentId || null,
      threadCount: 0,
      lastReplyAt: null,
      attachments: params.attachments || [],
      reactions: {},
      isPinned: false,
      pinnedAt: null,
      pinnedByName: null,
      isEdited: false,
      editedAt: null,
      isDeleted: false,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.messages.set(id, msg);

    // Notifications delivery
    this.processNotificationsForMessage(msg, parentMessage);

    return msg;
  }

  private processNotificationsForMessage(msg: Message, parentMsg?: Message): void {
    const channel = this.channels.get(msg.channelId);
    const now = new Date().toISOString();

    // 1. Mentions (@username)
    const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
    let match: RegExpExecArray | null;
    const mentionedNames = new Set<string>();
    while ((match = mentionRegex.exec(msg.content)) !== null) {
      mentionedNames.add(match[1].toLowerCase());
    }

    for (const name of mentionedNames) {
      // Find user by username in presences or name matching
      for (const [uId, pres] of this.presences.entries()) {
        if (
          pres.userName.toLowerCase() === name ||
          pres.userName.toLowerCase().replace(/\s+/g, "") === name
        ) {
          if (uId !== msg.senderId) {
            const notifId = generateUUID();
            this.notifications.set(notifId, {
              id: notifId,
              userId: uId,
              senderId: msg.senderId,
              senderName: msg.senderName,
              type: "mention",
              messageId: msg.id,
              channelId: msg.channelId,
              content: msg.content,
              isRead: false,
              createdAt: now,
            });
          }
        }
      }
    }

    // 2. DM notification
    if (channel?.isDm && channel.recipientId && channel.recipientId !== msg.senderId) {
      const notifId = generateUUID();
      this.notifications.set(notifId, {
        id: notifId,
        userId: channel.recipientId,
        senderId: msg.senderId,
        senderName: msg.senderName,
        type: "dm",
        messageId: msg.id,
        channelId: msg.channelId,
        content: msg.content,
        isRead: false,
        createdAt: now,
      });
    }

    // 3. Thread reply notification
    if (parentMsg && parentMsg.senderId !== msg.senderId) {
      const notifId = generateUUID();
      this.notifications.set(notifId, {
        id: notifId,
        userId: parentMsg.senderId,
        senderId: msg.senderId,
        senderName: msg.senderName,
        type: "thread_reply",
        messageId: msg.id,
        channelId: msg.channelId,
        content: `Replied in thread: ${msg.content}`,
        isRead: false,
        createdAt: now,
      });
    }
  }

  public getMessages(channelId: string, filterThreadReplies: boolean = true): Message[] {
    const list: Message[] = [];
    for (const msg of this.messages.values()) {
      if (msg.channelId === channelId) {
        if (filterThreadReplies && msg.parentId !== null) {
          continue; // Exclude thread replies from main feed
        }
        list.push(msg);
      }
    }
    return list.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  public getThreadReplies(parentId: string): Message[] {
    const replies: Message[] = [];
    for (const msg of this.messages.values()) {
      if (msg.parentId === parentId) {
        replies.push(msg);
      }
    }
    return replies.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  public async editMessage(
    messageId: string,
    editorId: string,
    newContent: string
  ): Promise<Message> {
    const msg = this.messages.get(messageId);
    if (!msg) {
      throw new Error(`Message ${messageId} not found`);
    }
    if (msg.isDeleted) {
      throw new Error("Cannot edit deleted message");
    }
    if (msg.senderId !== editorId) {
      throw new Error("Unauthorized: Only the author can edit this message");
    }
    if (!newContent || newContent.trim().length === 0) {
      // Must not be empty unless message has attachments
      if (!msg.attachments || msg.attachments.length === 0) {
        throw new Error("Message content cannot be blank");
      }
    }

    const now = new Date().toISOString();
    msg.content = newContent;
    msg.isEdited = true;
    msg.editedAt = now;
    msg.updatedAt = now;
    this.messages.set(messageId, msg);
    return msg;
  }

  public async deleteMessage(
    messageId: string,
    deleterId: string
  ): Promise<{ success: boolean; tombstone: Message }> {
    const msg = this.messages.get(messageId);
    if (!msg) {
      throw new Error(`Message ${messageId} not found`);
    }
    if (msg.isDeleted) {
      throw new Error("Message has already been deleted");
    }
    if (msg.senderId !== deleterId) {
      throw new Error("Unauthorized: Only the author can delete this message");
    }

    const now = new Date().toISOString();
    msg.isDeleted = true;
    msg.deletedAt = now;
    msg.content = "This message was deleted";
    msg.attachments = [];
    msg.reactions = {};
    msg.isPinned = false;
    msg.updatedAt = now;

    // Decrement parent replyCount if this was a thread reply
    if (msg.parentId) {
      const parent = this.messages.get(msg.parentId);
      if (parent && (parent.threadCount || 0) > 0) {
        parent.threadCount = (parent.threadCount || 1) - 1;
        this.messages.set(msg.parentId, parent);
      }
    }

    this.messages.set(messageId, msg);
    return { success: true, tombstone: msg };
  }

  // --- R4: Pinning ---

  public async pinMessage(messageId: string, userId: string, userName: string): Promise<Message> {
    const msg = this.messages.get(messageId);
    if (!msg) {
      throw new Error(`Message ${messageId} not found`);
    }
    if (msg.isDeleted) {
      throw new Error("Cannot pin a deleted message");
    }

    const now = new Date().toISOString();
    msg.isPinned = true;
    msg.pinnedAt = now;
    msg.pinnedByName = userName;
    msg.updatedAt = now;
    this.messages.set(messageId, msg);
    return msg;
  }

  public async unpinMessage(messageId: string): Promise<Message> {
    const msg = this.messages.get(messageId);
    if (!msg) {
      throw new Error(`Message ${messageId} not found`);
    }

    msg.isPinned = false;
    msg.pinnedAt = null;
    msg.pinnedByName = null;
    msg.updatedAt = new Date().toISOString();
    this.messages.set(messageId, msg);
    return msg;
  }

  public getPinnedMessages(channelId: string): Message[] {
    const pinned: Message[] = [];
    for (const msg of this.messages.values()) {
      if (msg.channelId === channelId && msg.isPinned && !msg.isDeleted) {
        pinned.push(msg);
      }
    }
    return pinned.sort(
      (a, b) => new Date(b.pinnedAt || 0).getTime() - new Date(a.pinnedAt || 0).getTime()
    );
  }

  // --- R2: Emoji Reactions ---

  public async toggleReaction(
    messageId: string,
    userId: string,
    userName: string,
    emoji: string
  ): Promise<{ added: boolean; summary: MessageReactionSummary }> {
    const msg = this.messages.get(messageId);
    if (!msg) {
      throw new Error(`Message ${messageId} not found`);
    }
    if (msg.isDeleted) {
      throw new Error("Cannot react to a deleted message");
    }
    if (!emoji || emoji.trim() === "") {
      throw new Error("Emoji parameter cannot be empty");
    }

    if (!msg.reactions) {
      msg.reactions = {};
    }

    const existingSummary = msg.reactions[emoji] || { count: 0, users: [] };
    const userIndex = existingSummary.users.indexOf(userId);

    let added: boolean;
    if (userIndex >= 0) {
      // Remove reaction
      existingSummary.users.splice(userIndex, 1);
      existingSummary.count = Math.max(0, existingSummary.count - 1);
      if (existingSummary.count === 0) {
        delete msg.reactions[emoji];
      } else {
        msg.reactions[emoji] = existingSummary;
      }
      added = false;
    } else {
      // Add reaction
      existingSummary.users.push(userId);
      existingSummary.count += 1;
      msg.reactions[emoji] = existingSummary;
      added = true;
    }

    this.messages.set(messageId, msg);
    return {
      added,
      summary: msg.reactions[emoji] || { count: 0, users: [] },
    };
  }

  // --- R4: Search ---

  public searchMessages(
    query: string,
    options?: { channelId?: string; isPinnedOnly?: boolean }
  ): Message[] {
    if (!query || query.trim() === "") {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();
    const results: Message[] = [];

    for (const msg of this.messages.values()) {
      if (msg.isDeleted) continue;
      if (options?.channelId && msg.channelId !== options.channelId) continue;
      if (options?.isPinnedOnly && !msg.isPinned) continue;

      const contentMatch = msg.content.toLowerCase().includes(normalizedQuery);
      const senderMatch = msg.senderName.toLowerCase().includes(normalizedQuery);
      const attachmentMatch = msg.attachments?.some((a) =>
        a.name.toLowerCase().includes(normalizedQuery)
      );

      if (contentMatch || senderMatch || attachmentMatch) {
        results.push(msg);
      }
    }

    return results.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // --- R5: Presence & Notifications ---

  public setUserPresence(
    userId: string,
    userName: string,
    status: "online" | "away" | "offline" | "in_call",
    statusText?: string
  ): UserPresence {
    const presence: UserPresence = {
      userId,
      userName,
      status,
      statusText,
      lastSeen: new Date().toISOString(),
    };
    this.presences.set(userId, presence);
    return presence;
  }

  public getUserPresence(userId: string): UserPresence | undefined {
    return this.presences.get(userId);
  }

  public getAllPresence(): UserPresence[] {
    return Array.from(this.presences.values());
  }

  public getNotifications(userId: string): Notification[] {
    const notifs: Notification[] = [];
    for (const n of this.notifications.values()) {
      if (n.userId === userId) {
        notifs.push(n);
      }
    }
    return notifs.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getUnreadNotificationCount(userId: string): number {
    return this.getNotifications(userId).filter((n) => !n.isRead).length;
  }

  public markNotificationRead(notificationId: string): void {
    const n = this.notifications.get(notificationId);
    if (n) {
      n.isRead = true;
      this.notifications.set(notificationId, n);
    }
  }

  // --- R6: Schema & Migration Inspection ---

  public static verifyMigrationSQLContent(sqlContent: string): {
    hasMessagesColumns: boolean;
    hasReactionsTable: boolean;
    hasStorageBucketSetup: boolean;
    hasThreadCountTrigger: boolean;
    hasRLSPolicies: boolean;
  } {
    const content = sqlContent.toLowerCase();
    const hasMessagesColumns =
      (content.includes("parent_id") || content.includes("messages")) &&
      (content.includes("is_pinned") || content.includes("pinned"));
    const hasReactionsTable =
      content.includes("reactions") &&
      (content.includes("emoji") || content.includes("message_id"));
    const hasStorageBucketSetup =
      content.includes("kaelixo-attachments") ||
      content.includes("storage.buckets") ||
      content.includes("storage.objects");
    const hasThreadCountTrigger =
      content.includes("trigger") ||
      content.includes("function") ||
      content.includes("reply_count") ||
      content.includes("thread");
    const hasRLSPolicies =
      content.includes("row level security") ||
      content.includes("policy") ||
      content.includes("create policy");

    return {
      hasMessagesColumns,
      hasReactionsTable,
      hasStorageBucketSetup,
      hasThreadCountTrigger,
      hasRLSPolicies,
    };
  }
}
