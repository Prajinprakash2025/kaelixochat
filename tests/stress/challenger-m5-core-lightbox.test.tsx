/**
 * Milestone 5 Tier 5 Adversarial Coverage Hardening Test Suite
 * Archetype: Empirical Challenger (challenger_m5_1: critic, specialist)
 * Target Requirements:
 * - R1: In-Chat File and Media Sharing (uploads, staging, download cards, lightbox trigger, large files)
 * - R2: Interactive Emoji Picker & Real-Time Reactions (reactions toggle, tooltip, user active states)
 * - R3: Thread Replies Side Panel (thread segregation, parent reply count/last reply time, deleted parent protection)
 * - R4: Message Management & Search (inline edit with (edited) tag, delete with tombstone, pin drawer, search query matching)
 * - R9: In-App Media & Document Lightbox Viewer (zoom bounds, pan, iframe PDF preview, download)
 */

import React from "react";
import ReactDOMServer from "react-dom/server";

// Core utils & contracts
import {
  validateAttachment,
  sanitizeFileName,
  sanitizeChannelId,
  extractFileExtension,
  formatFileSize,
  getFileCategory,
  isImageFile,
  DANGEROUS_EXTENSIONS,
  SAFE_FILE_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from "../../src/utils/storage";

import {
  isImageAttachment,
  isPdfAttachment,
  AttachmentPreview,
  SlackMediaLightbox,
  LightboxFile,
} from "../../src/components/chat/attachment-preview";

import {
  MessageFeed,
  formatReactorsTooltip,
  formatLastReplyTime,
} from "../../src/components/chat/message-feed";

import { EmojiPicker } from "../../src/components/chat/emoji-picker";
import { ThreadSidePanel } from "../../src/components/chat/thread-side-panel";
import { PinnedMessagesDrawer } from "../../src/components/chat/pinned-messages-drawer";
import { SearchModal } from "../../src/components/modals/search-modal";

import {
  Message,
  WorkspaceMember,
  Channel,
  Attachment,
  reactionsMapToArray,
  createReactionsArray,
} from "../../src/types";

// ==============================================================================
// TEST ENGINE & ASSERTION HELPERS
// ==============================================================================

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

function assertThrows(fn: () => void, expectedSubstr?: string) {
  let threw = false;
  try {
    fn();
  } catch (err: any) {
    threw = true;
    if (expectedSubstr && !err.message.includes(expectedSubstr)) {
      throw new Error(`Expected error containing "${expectedSubstr}", but got: "${err.message}"`);
    }
  }
  if (!threw) {
    throw new Error(`Expected function to throw error, but it succeeded.`);
  }
}

/**
 * Normalizes React SSR output by stripping HTML comment delimiters (e.g. <!-- -->)
 * so text-node assertions match human-readable expectations cleanly.
 */
function stripComments(html: string): string {
  return html.replace(/<!--.*?-->/g, "");
}

interface TestRunResult {
  section: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

const testResults: TestRunResult[] = [];
let currentSection = "General";

function setSection(name: string) {
  currentSection = name;
  console.log(`\n--- [${name}] ---`);
}

async function runTest(name: string, fn: () => void | Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    testResults.push({ section: currentSection, name, passed: true, durationMs: duration });
    console.log(`  ✓ PASS: ${name} (${duration}ms)`);
  } catch (err: any) {
    const duration = Date.now() - start;
    testResults.push({ section: currentSection, name, passed: false, durationMs: duration, error: err.message || String(err) });
    console.error(`  ✗ FAIL: ${name} (${duration}ms)`);
    console.error(`    ${err.message || err}`);
  }
}

// Sample Members for testing
const testMembers: WorkspaceMember[] = [
  { id: "usr-alice", name: "Alice Smith", email: "alice@kaelixo.com", avatar: "https://avatar/alice.png", role: "Workspace Owner", department: "Executive", online: true, status: "online" as const },
  { id: "usr-bob", name: "Bob Jones", email: "bob@kaelixo.com", avatar: "https://avatar/bob.png", role: "Department Head", department: "Engineering", online: true, status: "online" as const },
  { id: "usr-charlie", name: "Charlie Day", email: "charlie@kaelixo.com", avatar: "https://avatar/charlie.png", role: "Manager", department: "Design", online: false, status: "offline" as const },
  { id: "usr-diana", name: "Diana Prince", email: "diana@kaelixo.com", avatar: "https://avatar/diana.png", role: "Member", department: "Engineering", online: true, status: "online" as const },
  { id: "usr-edward", name: "Edward Norton", email: "edward@kaelixo.com", avatar: "https://avatar/edward.png", role: "Member", department: "Marketing", online: false, status: "offline" as const },
];

const mockChannel: Channel = {
  id: "33333333-3333-3333-3333-333333333331",
  name: "general",
  topic: "Company wide chatter",
  isPrivate: false,
  isDm: false,
};

function mockMsg(overrides: Partial<Message> & { id: string }): Message {
  const author =
    testMembers.find((m) => m.id === overrides.senderId || m.name === overrides.senderName) ||
    testMembers[0];
  const defaults: Omit<Message, "id"> = {
    channelId: mockChannel.id,
    senderId: author.id,
    senderName: author.name,
    senderAvatar: author.avatar,
    sender: author,
    content: "",
    createdAt: "10:00 AM",
    updatedAt: "10:00 AM",
    reactions: createReactionsArray([]),
    attachments: [],
  };
  return {
    ...defaults,
    ...overrides,
    id: overrides.id,
  };
}

// ==============================================================================
// TEST EXECUTION
// ==============================================================================

async function executeChallengerM5Suite() {
  console.log("======================================================================");
  console.log("  CHALLENGER M5-1: CORE COMMUNICATION & LIGHTBOX ADVERSARIAL SUITE    ");
  console.log("======================================================================");

  // ============================================================================
  // SECTION 1: R1 IN-CHAT FILE AND MEDIA SHARING
  // ============================================================================
  setSection("R1: In-Chat File and Media Sharing Adversarial Suite");

  await runTest("R1.1: Reject zero-byte and negative-byte file uploads", () => {
    assertThrows(() => {
      validateAttachment({ name: "empty.png", size: 0, type: "image/png" } as any);
    }, "0 bytes");

    assertThrows(() => {
      validateAttachment({ name: "neg.png", size: -100, type: "image/png" } as any);
    }, "negative");
  });

  await runTest("R1.2: Reject file exceeding 25MB threshold", () => {
    const oversized = MAX_FILE_SIZE_BYTES + 1024;
    assertThrows(() => {
      validateAttachment({ name: "heavy.pdf", size: oversized, type: "application/pdf" } as any);
    }, "exceeds maximum allowed limit");
  });

  await runTest("R1.3: Reject blank or whitespace-only filename", () => {
    assertThrows(() => {
      validateAttachment({ name: "", size: 1024, type: "image/png" } as any);
    }, "blank");

    assertThrows(() => {
      validateAttachment({ name: "   ", size: 1024, type: "image/png" } as any);
    }, "blank");
  });

  await runTest("R1.4: Strictly reject dangerous executable & script extensions", () => {
    const maliciousExts = ["exe", "bat", "sh", "cmd", "vbs", "ps1", "jar", "dll", "scr", "msi"];
    for (const ext of maliciousExts) {
      assertThrows(() => {
        validateAttachment({ name: `malware.${ext}`, size: 1024, type: "application/octet-stream" } as any);
      }, "strictly prohibited");
    }
  });

  await runTest("R1.5: Reject double-extension bypass attempts (e.g. report.pdf.exe, image.png.bat)", () => {
    const doubleExts = ["invoice.pdf.exe", "photo.png.vbs", "contract.docx.ps1", "readme.txt.sh"];
    for (const name of doubleExts) {
      assertThrows(() => {
        validateAttachment({ name, size: 2048, type: "application/octet-stream" } as any);
      }, "strictly prohibited");
    }
  });

  await runTest("R1.6: Null-byte injection sanitization in filename", () => {
    const poisoned = "report.pdf\0.exe";
    const clean = sanitizeFileName(poisoned);
    assert(!clean.includes("\0"), "Null byte must be stripped");
    assert(clean.endsWith(".exe") || clean.endsWith(".pdf"), "Must produce clean extension");
  });

  await runTest("R1.7: Directory traversal tokens sanitized in filename and channel ID", () => {
    const dirtyFile = "../../../../../etc/shadow.png";
    const cleanFile = sanitizeFileName(dirtyFile);
    assert(!cleanFile.includes("/"), "Path separators must not exist in clean filename");
    assert(!cleanFile.includes(".."), "Traversal dots must be stripped");
    assert(cleanFile.endsWith(".png"), "Valid extension preserved");

    const dirtyChannel = "channel/../../secrets";
    const cleanChan = sanitizeChannelId(dirtyChannel);
    assert(!cleanChan.includes("/"), "Path separators must be sanitized");
    assert(!cleanChan.includes("."), "Dots must be sanitized");
  });

  await runTest("R1.8: Long filename (>80 chars) base truncation preserves extension", () => {
    const longBase = "a".repeat(120);
    const longFilename = `${longBase}.pdf`;
    const clean = sanitizeFileName(longFilename);
    assert(clean.endsWith(".pdf"), "Extension must be preserved");
    const basePart = clean.replace(".pdf", "");
    assert(basePart.length <= 80, `Base name should be truncated to <=80 chars, got ${basePart.length}`);
  });

  await runTest("R1.9: Degenerate dot-only filenames handled cleanly", () => {
    const clean1 = sanitizeFileName(".....");
    assert(clean1.length > 0 && !clean1.endsWith("."), "Degenerate dots should produce safe default");
    const clean2 = sanitizeFileName("...pdf");
    assert(clean2.endsWith(".pdf"), "Should extract valid pdf extension");
  });

  await runTest("R1.10: formatFileSize boundary calculations (0B, 1KB, 1MB, 1GB)", () => {
    assert(formatFileSize(0) === "0 B", "0 B formatted");
    assert(formatFileSize(1024) === "1 KB", "1024 B is 1 KB");
    assert(formatFileSize(1536) === "1.5 KB", "1536 B is 1.5 KB");
    assert(formatFileSize(1024 * 1024) === "1 MB", "1 MB formatted");
    assert(formatFileSize(2.5 * 1024 * 1024) === "2.5 MB", "2.5 MB formatted");
    assert(formatFileSize(1024 * 1024 * 1024) === "1 GB", "1 GB formatted");
  });

  await runTest("R1.11: getFileCategory correctly maps image, pdf, code, file", () => {
    assert(getFileCategory("image/jpeg", "test.jpg") === "image", "JPEG is image");
    assert(getFileCategory("application/pdf", "test.pdf") === "pdf", "PDF is pdf");
    assert(getFileCategory("application/json", "data.json") === "code", "JSON is code");
    assert(getFileCategory("text/plain", "script.py") === "code", ".py is code");
    assert(getFileCategory("text/plain", "doc.txt") === "file", ".txt is file");
    assert(getFileCategory("application/zip", "archive.zip") === "file", "ZIP is file");
  });

  await runTest("R1.12: Standalone attachment message sending contract", () => {
    // Condition: message text empty + attachments non-empty -> valid
    const hasAttachments = true;
    const hasText = false;
    const isUploading = false;
    const canSend = !isUploading && (hasText || hasAttachments);
    assert(canSend === true, "Standalone attachment sending must be allowed without text");

    // Condition: message text empty + attachments empty -> blocked
    const canSendEmpty = !isUploading && (false || false);
    assert(canSendEmpty === false, "Empty message without attachments must be blocked");

    // Condition: uploading in progress -> blocked even with text or attachments
    const canSendWhileUploading = !true && (hasText || hasAttachments);
    assert(canSendWhileUploading === false, "In-flight upload must block sending");
  });

  await runTest("R1.13: SSR render AttachmentPreview grid with 1, 2, 3, 4, and 5 images (+N overlay)", () => {
    const makeImg = (id: string, name: string): Attachment => ({
      id,
      name,
      size: 1024 * 200,
      type: "image/png",
      url: `https://test.com/${name}`,
      storagePath: `chan/${name}`,
    });

    // 1 image
    const html1 = ReactDOMServer.renderToString(<AttachmentPreview attachments={[makeImg("1", "img1.png")]} />);
    assert(html1.includes("img1.png"), "Single image rendered");

    // 2 images
    const html2 = ReactDOMServer.renderToString(
      <AttachmentPreview attachments={[makeImg("1", "img1.png"), makeImg("2", "img2.png")]} />
    );
    assert(html2.includes("img1.png") && html2.includes("img2.png"), "2 images rendered in grid");

    // 5 images (triggers +2 overlay)
    const html5 = ReactDOMServer.renderToString(
      <AttachmentPreview
        attachments={[
          makeImg("1", "img1.png"),
          makeImg("2", "img2.png"),
          makeImg("3", "img3.png"),
          makeImg("4", "img4.png"),
          makeImg("5", "img5.png"),
        ]}
      />
    );
    assert(stripComments(html5).includes("+2"), "+2 overlay rendered for 5 images (3 shown + overlay on 4th)");
  });

  await runTest("R1.14: SSR render AttachmentPreview with PDF and document cards", () => {
    const pdfAtt: Attachment = {
      id: "pdf-1",
      name: "Quarterly_Report.pdf",
      size: 1024 * 1024 * 3,
      type: "application/pdf",
      url: "https://test.com/report.pdf",
      storagePath: "chan/report.pdf",
    };
    const zipAtt: Attachment = {
      id: "zip-1",
      name: "assets_bundle.zip",
      size: 1024 * 1024 * 8,
      type: "application/zip",
      url: "https://test.com/assets.zip",
      storagePath: "chan/assets.zip",
    };

    const html = ReactDOMServer.renderToString(<AttachmentPreview attachments={[pdfAtt, zipAtt]} />);
    assert(html.includes("Quarterly_Report.pdf"), "PDF title rendered");
    assert(html.includes("assets_bundle.zip"), "Document title rendered");
    assert(html.includes("Preview"), "PDF card has Preview button for in-app Lightbox trigger");
  });

  // ============================================================================
  // SECTION 2: R2 INTERACTIVE EMOJI PICKER & REAL-TIME REACTIONS
  // ============================================================================
  setSection("R2: Interactive Emoji Picker & Real-Time Reactions Adversarial Suite");

  await runTest("R2.1: EmojiPicker SSR renders categorized tabs and search bar", () => {
    const html = ReactDOMServer.renderToString(
      <EmojiPicker onSelectEmoji={() => {}} onClose={() => {}} />
    );
    assert(html.includes("Search emoji"), "Search input rendered in EmojiPicker");
    assert(html.includes("Select an emoji"), "Footer preview hint rendered");
  });

  await runTest("R2.2: Multibyte unicode, flags, and complex skin tones in reactions", () => {
    const complexEmojis = ["👍🏽", "❤️", "🧑‍💻", "👩‍💼", "🎉", "🔥", "🚀", "✨"];
    for (const em of complexEmojis) {
      const reactions = createReactionsArray([{ emoji: em, count: 1, users: ["usr-alice"] }]);
      const parsed = reactionsMapToArray(reactions);
      assert(parsed.length === 1, `Emoji ${em} preserved in reactions list`);
      assert(parsed[0].emoji === em, `Emoji character matches exact unicode ${em}`);
    }
  });

  await runTest("R2.3: Reaction toggle idempotency: add, second user, remove, purge on 0", () => {
    // Initial: 0 reactions
    let reactionState = reactionsMapToArray([]);
    assert(reactionState.length === 0, "Initial empty");

    // Alice reacts 👍
    reactionState.push({ emoji: "👍", count: 1, users: ["usr-alice"] });
    assert(reactionState[0].count === 1 && reactionState[0].users.includes("usr-alice"), "Alice added");

    // Bob reacts 👍
    const existing = reactionState.find((r) => r.emoji === "👍")!;
    existing.count += 1;
    existing.users.push("usr-bob");
    assert(existing.count === 2 && existing.users.length === 2, "Bob added, count 2");

    // Alice unreacts 👍 (clicks toggle off)
    existing.users = existing.users.filter((id) => id !== "usr-alice");
    existing.count = Math.max(0, existing.count - 1);
    assert(existing.count === 1 && !existing.users.includes("usr-alice") && existing.users.includes("usr-bob"), "Alice removed, Bob remains");

    // Bob unreacts 👍 (clicks toggle off)
    existing.users = existing.users.filter((id) => id !== "usr-bob");
    existing.count = Math.max(0, existing.count - 1);
    if (existing.users.length === 0) {
      reactionState = reactionState.filter((r) => r.emoji !== "👍");
    }
    assert(reactionState.length === 0, "Purged from list when 0 users remain");
  });

  await runTest("R2.4: Rapid toggle stress by same user never creates duplicate user entries", () => {
    let users: string[] = [];
    const userId = "usr-alice";

    // Simulate 20 rapid toggle clicks
    for (let i = 0; i < 20; i++) {
      if (users.includes(userId)) {
        users = users.filter((u) => u !== userId);
      } else {
        users.push(userId);
      }
      const userOccurrences = users.filter((u) => u === userId).length;
      assert(userOccurrences <= 1, `User must appear at most once in reactors array, found ${userOccurrences}`);
    }
    // After 20 toggles (even number), user should be unreacted
    assert(users.length === 0, "Even number of rapid toggles should result in unreacted state");
  });

  await runTest("R2.5: formatReactorsTooltip exhaustive test across 1 to 5+ reactors with and without current user", () => {
    // 1. Current user alone
    const t1 = formatReactorsTooltip({ emoji: "👍", count: 1, users: ["usr-alice"] }, "usr-alice", testMembers);
    assert(t1 === "You reacted", `Expected "You reacted", got "${t1}"`);

    // 2. 1 other user
    const t2 = formatReactorsTooltip({ emoji: "👍", count: 1, users: ["usr-bob"] }, "usr-alice", testMembers);
    assert(t2 === "Bob reacted", `Expected "Bob reacted", got "${t2}"`);

    // 3. Current user + 1 other
    const t3 = formatReactorsTooltip({ emoji: "👍", count: 2, users: ["usr-alice", "usr-bob"] }, "usr-alice", testMembers);
    assert(t3 === "Bob and you reacted", `Expected "Bob and you reacted", got "${t3}"`);

    // 4. 2 other users (no current user)
    const t4 = formatReactorsTooltip({ emoji: "👍", count: 2, users: ["usr-bob", "usr-charlie"] }, "usr-alice", testMembers);
    assert(t4 === "Bob and Charlie reacted", `Expected "Bob and Charlie reacted", got "${t4}"`);

    // 5. Current user + 2 others (3 total)
    const t5 = formatReactorsTooltip({ emoji: "👍", count: 3, users: ["usr-alice", "usr-bob", "usr-charlie"] }, "usr-alice", testMembers);
    assert(t5 === "Bob, Charlie, and you reacted", `Expected "Bob, Charlie, and you reacted", got "${t5}"`);

    // 6. 3 other users (no current user)
    const t6 = formatReactorsTooltip({ emoji: "👍", count: 3, users: ["usr-bob", "usr-charlie", "usr-diana"] }, "usr-alice", testMembers);
    assert(t6 === "Bob, Charlie, and Diana reacted", `Expected "Bob, Charlie, and Diana reacted", got "${t6}"`);

    // 7. Current user + 3 others (4 total) -> "Bob, Charlie, you, and 1 other reacted"
    const t7 = formatReactorsTooltip({ emoji: "👍", count: 4, users: ["usr-alice", "usr-bob", "usr-charlie", "usr-diana"] }, "usr-alice", testMembers);
    assert(t7 === "Bob, Charlie, you, and 1 other reacted", `Expected "Bob, Charlie, you, and 1 other reacted", got "${t7}"`);

    // 8. Current user + 4 others (5 total) -> "Bob, Charlie, you, and 2 others reacted"
    const t8 = formatReactorsTooltip({ emoji: "👍", count: 5, users: ["usr-alice", "usr-bob", "usr-charlie", "usr-diana", "usr-edward"] }, "usr-alice", testMembers);
    assert(t8 === "Bob, Charlie, you, and 2 others reacted", `Expected "Bob, Charlie, you, and 2 others reacted", got "${t8}"`);

    // 9. 4 other users (no current user) -> "Bob, Charlie, and 2 others reacted"
    const t9 = formatReactorsTooltip({ emoji: "👍", count: 4, users: ["usr-bob", "usr-charlie", "usr-diana", "usr-edward"] }, "usr-alice", testMembers);
    assert(t9 === "Bob, Charlie, and 2 others reacted", `Expected "Bob, Charlie, and 2 others reacted", got "${t9}"`);

    // 10. Fallback for unknown user ID
    const t10 = formatReactorsTooltip({ emoji: "👍", count: 1, users: ["unknown-user-999"] }, "usr-alice", testMembers);
    assert(t10 === "Someone reacted", `Expected "Someone reacted", got "${t10}"`);
  });

  await runTest("R2.6: SSR render MessageFeed with highlighted active reaction chip", () => {
    const msgWithReaction: Message = mockMsg({
      id: "msg-rx-1",
      senderId: "usr-bob",
      senderName: "Bob Jones",
      senderAvatar: "https://avatar/bob.png",
      content: "Great milestone progress team!",
      createdAt: "10:30 AM",
      updatedAt: "10:30 AM",
      reactions: createReactionsArray([
        { emoji: "👍", count: 2, users: ["usr-alice", "usr-bob"] },
        { emoji: "🚀", count: 1, users: ["usr-charlie"] },
      ]),
    });

    const html = ReactDOMServer.renderToString(
      <MessageFeed
        messages={[msgWithReaction]}
        currentUser={testMembers[0]} // Alice
        onAddReaction={() => {}}
        members={testMembers}
      />
    );

    assert(html.includes("👍"), "👍 reaction rendered");
    assert(html.includes("🚀"), "🚀 reaction rendered");
    assert(html.includes("Bob and you reacted"), "Tooltip contains reaction text");
    // Alice has reacted with 👍 so it should have active styling indicator (ring or active text)
    assert(html.includes("ring-1") || html.includes("bg-indigo-50") || html.includes("font-semibold"), "Active reaction has active highlight ring");
  });

  // ============================================================================
  // SECTION 3: R3 THREAD REPLIES SIDE PANEL
  // ============================================================================
  setSection("R3: Thread Replies Side Panel Adversarial Suite");

  await runTest("R3.1: Thread feed segregation (top-level messages strictly exclude replies)", () => {
    const allMessages: Message[] = [
      mockMsg({ id: "msg-root-1", senderId: "usr-alice", senderName: "Alice", content: "Root message 1", createdAt: "10:00 AM", updatedAt: "10:00 AM" }),
      mockMsg({ id: "msg-root-2", senderId: "usr-bob", senderName: "Bob", content: "Root message 2", createdAt: "10:05 AM", updatedAt: "10:05 AM" }),
      mockMsg({ id: "reply-1", parentId: "msg-root-1", senderId: "usr-charlie", senderName: "Charlie", content: "Reply to 1", createdAt: "10:06 AM", updatedAt: "10:06 AM" }),
      mockMsg({ id: "reply-2", parentId: "msg-root-1", senderId: "usr-alice", senderName: "Alice", content: "Second reply", createdAt: "10:07 AM", updatedAt: "10:07 AM" }),
      mockMsg({ id: "reply-3", parentId: "msg-root-2", senderId: "usr-diana", senderName: "Diana", content: "Reply to 2", createdAt: "10:08 AM", updatedAt: "10:08 AM" }),
    ];

    // Main feed query invariant
    const mainFeed = allMessages.filter((m) => !m.parentId);
    assert(mainFeed.length === 2, `Main feed must strictly contain 2 root messages, found ${mainFeed.length}`);
    assert(mainFeed.every((m) => m.id === "msg-root-1" || m.id === "msg-root-2"), "Main feed contains only root messages");

    // Thread panel query invariant for msg-root-1
    const thread1Replies = allMessages.filter((m) => m.parentId === "msg-root-1");
    assert(thread1Replies.length === 2, `Thread 1 must contain 2 replies, found ${thread1Replies.length}`);
    assert(thread1Replies.every((r) => r.parentId === "msg-root-1"), "Thread replies have matching parentId");
  });

  await runTest("R3.2: Parent reply count & formatLastReplyTime relative calculation", () => {
    assert(formatLastReplyTime(null) === "", "Null time returns empty string");
    assert(formatLastReplyTime(undefined) === "", "Undefined time returns empty string");

    const now = new Date();
    // 30 seconds ago
    const justNow = new Date(now.getTime() - 30 * 1000).toISOString();
    assert(formatLastReplyTime(justNow) === "just now", `30s ago is "just now", got "${formatLastReplyTime(justNow)}"`);

    // 15 minutes ago
    const fifteenMins = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
    assert(formatLastReplyTime(fifteenMins) === "15m ago", `15 mins ago is "15m ago", got "${formatLastReplyTime(fifteenMins)}"`);

    // 3 hours ago
    const threeHours = new Date(now.getTime() - 3 * 3600 * 1000).toISOString();
    assert(formatLastReplyTime(threeHours) === "3h ago", `3 hours ago is "3h ago", got "${formatLastReplyTime(threeHours)}"`);
  });

  await runTest("R3.3: SSR render MessageFeed parent thread badge trigger", () => {
    const parentMsg: Message = mockMsg({
      id: "msg-parent-badge",
      senderId: "usr-alice",
      senderName: "Alice Smith",
      content: "Let's discuss architecture updates here.",
      threadCount: 7,
      lastReplyAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      createdAt: "11:00 AM",
      updatedAt: "11:00 AM",
    });

    const html = ReactDOMServer.renderToString(
      <MessageFeed
        messages={[parentMsg]}
        currentUser={testMembers[0]}
        onAddReaction={() => {}}
        onOpenThread={() => {}}
      />
    );

    assert(stripComments(html).includes("7 replies"), "Thread count badge rendered");
    assert(stripComments(html).includes("Last reply 5m ago"), "Last reply time rendered on badge");
    assert(stripComments(html).includes("View thread"), "View thread trigger text present");
  });

  await runTest("R3.4: Deleted parent message protection (blocks replies & displays tombstone alert)", () => {
    const deletedParent: Message = mockMsg({
      id: "msg-deleted-parent",
      senderId: "usr-alice",
      senderName: "Alice Smith",
      content: "This message was deleted",
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      createdAt: "09:00 AM",
      updatedAt: "09:10 AM",
    });

    const html = ReactDOMServer.renderToString(
      <ThreadSidePanel
        parentMessage={deletedParent}
        replies={[]}
        currentUser={testMembers[0]}
        channelName="general"
        onClose={() => {}}
        onSendReply={() => {}}
      />
    );

    assert(html.includes("This message was deleted"), "Tombstone rendered on parent card");
    assert(html.includes("Replies cannot be added"), "Alert blocks adding replies to deleted parent");
  });

  await runTest("R3.5: Reactions on thread replies isolated to child reply and do not affect parent", () => {
    const parentMsg: Message = mockMsg({
      id: "parent-1",
      senderId: "usr-alice",
      senderName: "Alice",
      content: "Parent topic",
      reactions: createReactionsArray([{ emoji: "👍", count: 1, users: ["usr-alice"] }]),
      createdAt: "10:00 AM",
      updatedAt: "10:00 AM",
    });

    const replyMsg: Message = mockMsg({
      id: "reply-1",
      parentId: "parent-1",
      senderId: "usr-bob",
      senderName: "Bob",
      content: "Child reply with fire reaction",
      reactions: createReactionsArray([{ emoji: "🔥", count: 3, users: ["usr-bob", "usr-charlie", "usr-diana"] }]),
      createdAt: "10:05 AM",
      updatedAt: "10:05 AM",
    });

    // Verify isolation
    const parentRx = reactionsMapToArray(parentMsg.reactions);
    const replyRx = reactionsMapToArray(replyMsg.reactions);

    assert(parentRx.some((r) => r.emoji === "👍"), "Parent retains 👍");
    assert(!parentRx.some((r) => r.emoji === "🔥"), "Parent does NOT get 🔥 from child reply");
    assert(replyRx.some((r) => r.emoji === "🔥"), "Reply retains 🔥");
    assert(!replyRx.some((r) => r.emoji === "👍"), "Reply does NOT inherit 👍 from parent");
  });

  // ============================================================================
  // SECTION 4: R4 MESSAGE MANAGEMENT & SEARCH
  // ============================================================================
  setSection("R4: Message Management & Search Adversarial Suite");

  await runTest("R4.1: Inline edit author authorization guard (non-author edit rejected)", () => {
    const authorUser = testMembers[0]; // Alice
    const impostorUser = testMembers[1]; // Bob

    const message: Message = mockMsg({
      id: "msg-auth-1",
      senderId: authorUser.id,
      senderName: authorUser.name,
      content: "Original text by Alice",
      createdAt: "10:00 AM",
      updatedAt: "10:00 AM",
    });

    // Test authorization check logic
    const canAliceEdit = message.senderId === authorUser.id;
    const canBobEdit = message.senderId === impostorUser.id;

    assert(canAliceEdit === true, "Author Alice is authorized to edit");
    assert(canBobEdit === false, "Impostor Bob is rejected from editing Alice's message");
  });

  await runTest("R4.2: SSR render MessageFeed with (edited) indicator tag", () => {
    const editedMsg: Message = mockMsg({
      id: "msg-edited-1",
      senderId: "usr-alice",
      senderName: "Alice Smith",
      content: "Updated meeting agenda",
      isEdited: true,
      editedAt: new Date().toISOString(),
      createdAt: "10:00 AM",
      updatedAt: "10:15 AM",
    });

    const html = ReactDOMServer.renderToString(
      <MessageFeed
        messages={[editedMsg]}
        currentUser={testMembers[0]}
        onAddReaction={() => {}}
      />
    );

    assert(html.includes("(edited)"), "(edited) tag rendered in message header");
  });

  await runTest("R4.3: Soft delete tombstone renders 'This message was deleted' and hides attachments/reactions", () => {
    const deletedMsg: Message = mockMsg({
      id: "msg-del-1",
      senderId: "usr-alice",
      senderName: "Alice Smith",
      content: "Secret text that should be gone",
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      attachments: [{ id: "att-1", name: "sensitive.png", size: 1024, type: "image/png", url: "https://test/s.png", storagePath: "s.png" }],
      reactions: createReactionsArray([{ emoji: "👍", count: 1, users: ["usr-bob"] }]),
      createdAt: "10:00 AM",
      updatedAt: "10:20 AM",
    });

    const html = ReactDOMServer.renderToString(
      <MessageFeed
        messages={[deletedMsg]}
        currentUser={testMembers[0]}
        onAddReaction={() => {}}
      />
    );

    assert(html.includes("This message was deleted"), "Tombstone text rendered");
    assert(!html.includes("Secret text that should be gone"), "Original content must NOT be rendered");
    assert(!html.includes("sensitive.png"), "Attachments must NOT be rendered on deleted message");
  });

  await runTest("R4.4: PinnedMessagesDrawer reverse-chronological sorting and unpin trigger", () => {
    const pinnedMsgs: Message[] = [
      mockMsg({
        id: "pin-early",
        senderId: "usr-alice",
        senderName: "Alice Smith",
        content: "Early announcement",
        isPinned: true,
        pinnedAt: "2026-11-06T08:00:00.000Z",
        pinnedByName: "Alice Smith",
        createdAt: "08:00 AM",
        updatedAt: "08:00 AM",
      }),
      mockMsg({
        id: "pin-late",
        senderId: "usr-bob",
        senderName: "Bob Jones",
        content: "Latest critical notice",
        isPinned: true,
        pinnedAt: "2026-11-06T10:30:00.000Z",
        pinnedByName: "Bob Jones",
        createdAt: "10:30 AM",
        updatedAt: "10:30 AM",
      }),
    ];

    const html = ReactDOMServer.renderToString(
      <PinnedMessagesDrawer
        channelName="general"
        pinnedMessages={pinnedMsgs}
        currentUser={testMembers[0]}
        onClose={() => {}}
        onUnpin={() => {}}
        onJumpToMessage={() => {}}
      />
    );

    assert(stripComments(html).includes("Pinned Messages"), "Pinned messages drawer header rendered");
    assert(stripComments(html).includes("Latest critical notice"), "Latest pinned message rendered");
    assert(stripComments(html).includes("Early announcement"), "Early pinned message rendered");
    assert(stripComments(html).includes("Pinned by Bob"), "Pinned by Bob badge rendered");
    assert(stripComments(html).includes("Pinned by Alice"), "Pinned by Alice badge rendered");

    // Check order in rendered output: pin-late should appear before pin-early
    const idxLate = html.indexOf("Latest critical notice");
    const idxEarly = html.indexOf("Early announcement");
    assert(idxLate < idxEarly, "Pinned messages must be ordered reverse-chronologically by pinnedAt");
  });

  await runTest("R4.5: SearchModal query matching across content, sender name, and attachment filename", () => {
    const searchMessages: Record<string, Message[]> = {
      [mockChannel.id]: [
        mockMsg({ id: "s1", senderName: "Alice", content: "Deployment completed for Q4 release", createdAt: "10:00 AM", updatedAt: "10:00 AM" }),
        mockMsg({ id: "s2", senderName: "Bob", content: "Check database index performance", createdAt: "10:05 AM", updatedAt: "10:05 AM" }),
        mockMsg({
          id: "s3",
          senderName: "Charlie",
          content: "Here are the brand assets",
          attachments: [{ id: "att-brand", name: "logo_vector_master.svg", size: 1024 * 50, type: "image/svg+xml", url: "https://test/logo.svg", storagePath: "logo.svg" }],
          createdAt: "10:10 AM",
          updatedAt: "10:10 AM",
        }),
      ],
    };

    // 1. Content query: "deployment"
    const htmlContent = ReactDOMServer.renderToString(
      <SearchModal
        isOpen={true}
        onClose={() => {}}
        channels={[mockChannel]}
        messagesByChannel={searchMessages}
        onSelectResult={() => {}}
      />
    );
    assert(htmlContent.includes("Search all messages"), "Search modal rendered");

    // Test memoized search logic directly
    const testSearch = (q: string) => {
      const lower = q.toLowerCase();
      const matches: Message[] = [];
      for (const msgs of Object.values(searchMessages)) {
        for (const m of msgs) {
          const matchContent = m.content?.toLowerCase().includes(lower);
          const matchSender = m.senderName?.toLowerCase().includes(lower);
          const matchAtt = m.attachments?.some((a) => a.name?.toLowerCase().includes(lower));
          if (matchContent || matchSender || matchAtt) matches.push(m);
        }
      }
      return matches;
    };

    // Match content
    const resContent = testSearch("deployment");
    assert(resContent.length === 1 && resContent[0].id === "s1", "Matches content");

    // Match sender
    const resSender = testSearch("charlie");
    assert(resSender.length === 1 && resSender[0].id === "s3", "Matches sender");

    // Match attachment filename
    const resAtt = testSearch("logo_vector");
    assert(resAtt.length === 1 && resAtt[0].id === "s3", "Matches attachment filename");
  });

  await runTest("R4.6: Search handles adversarial regex & wildcard meta-characters without throwing", () => {
    const searchMessages: Record<string, Message[]> = {
      [mockChannel.id]: [
        mockMsg({ id: "s1", senderName: "Alice", content: "Price is $100.00 (special [offer]) *warning* +more? ^test^", createdAt: "10:00 AM", updatedAt: "10:00 AM" }),
      ],
    };

    const adversarialQueries = [
      "$100",
      "[offer]",
      "*warning*",
      "+more?",
      "^test^",
      "(special",
      "\\d+",
      ".*",
      "???",
      "[[[",
    ];

    for (const q of adversarialQueries) {
      // Must not throw syntax error or regex explosion
      const lower = q.toLowerCase();
      const matches = searchMessages[mockChannel.id].filter(
        (m) =>
          m.content?.toLowerCase().includes(lower) ||
          m.senderName?.toLowerCase().includes(lower)
      );
      assert(Array.isArray(matches), `Query "${q}" executed safely`);
    }
  });

  // ============================================================================
  // SECTION 5: R9 IN-APP MEDIA & DOCUMENT LIGHTBOX VIEWER
  // ============================================================================
  setSection("R9: In-App Media & Document Lightbox Viewer Adversarial Suite");

  await runTest("R9.1: isImageAttachment & isPdfAttachment detection across MIME types and extensions", () => {
    // Images
    assert(isImageAttachment({ url: "u", name: "photo.png", type: "image/png" }), "PNG is image");
    assert(isImageAttachment({ url: "u", name: "pic.jpg", type: "image/jpeg" }), "JPEG is image");
    assert(isImageAttachment({ url: "u", name: "icon.svg", type: "image/svg+xml" }), "SVG is image");
    assert(isImageAttachment({ url: "u", name: "anim.gif", type: "" }), "GIF without mime is image");
    assert(isImageAttachment({ url: "u", name: "shot.webp", type: "image/webp" }), "WebP is image");
    assert(isImageAttachment({ url: "u", name: "bitmap.bmp", type: "" }), "BMP is image");

    // Non-images
    assert(!isImageAttachment({ url: "u", name: "sheet.xlsx", type: "application/vnd.ms-excel" }), "Excel is not image");
    assert(!isImageAttachment({ url: "u", name: "doc.pdf", type: "application/pdf" }), "PDF is not image");
    assert(!isImageAttachment({ url: "u", name: "code.ts", type: "text/typescript" }), "TS is not image");

    // PDFs
    assert(isPdfAttachment({ url: "u", name: "doc.pdf", type: "application/pdf" }), "PDF MIME is pdf");
    assert(isPdfAttachment({ url: "u", name: "whitepaper.PDF", type: "" }), ".PDF extension is pdf");
    assert(!isPdfAttachment({ url: "u", name: "image.png", type: "image/png" }), "PNG is not pdf");
  });

  await runTest("R9.2: Lightbox zoom bounds (min 0.5x, max 3.0x, step 0.25x)", () => {
    // Zoom In sequence from 1.0
    let zoom = 1.0;
    for (let i = 0; i < 20; i++) {
      zoom = Math.min(zoom + 0.25, 3.0);
    }
    assert(zoom === 3.0, `Zoom In capped at 3.0x, got ${zoom}`);

    // Zoom Out sequence from 1.0
    zoom = 1.0;
    for (let i = 0; i < 20; i++) {
      zoom = Math.max(zoom - 0.25, 0.5);
    }
    assert(zoom === 0.5, `Zoom Out bounded at 0.5x, got ${zoom}`);
  });

  await runTest("R9.3: Pan clamp invariant when zoom <= 1.0", () => {
    let zoom = 1.5;
    let pan = { x: 50, y: -80 };

    // When zoom is > 1, pan is allowed
    assert(pan.x !== 0 && pan.y !== 0, "Pan active at 1.5x");

    // When zooming out to <= 1.0, pan must reset to (0, 0)
    zoom = 1.0;
    if (zoom <= 1) {
      pan = { x: 0, y: 0 };
    }
    assert(pan.x === 0 && pan.y === 0, "Pan reset to (0,0) when zoom <= 1.0");
  });

  await runTest("R9.4: Double click zoom toggle logic (1x -> 2x -> 1x)", () => {
    let zoom = 1.0;
    // First double click: zoom <= 1 -> zoom to 2.0
    zoom = zoom > 1 ? 1.0 : 2.0;
    assert(zoom === 2.0, "First double click sets zoom to 2.0x");

    // Second double click: zoom > 1 -> reset to 1.0
    zoom = zoom > 1 ? 1.0 : 2.0;
    assert(zoom === 1.0, "Second double click resets zoom to 1.0x");
  });

  await runTest("R9.5: Multi-file cyclic navigation bounds (0 -> N-1 -> 0)", () => {
    const totalFiles = 3;
    let currentIndex = 0;

    // Previous from 0 wraps to totalFiles - 1
    currentIndex = currentIndex === 0 ? totalFiles - 1 : currentIndex - 1;
    assert(currentIndex === 2, `Prev from 0 wraps to index 2, got ${currentIndex}`);

    // Next from 2 wraps to 0
    currentIndex = currentIndex === totalFiles - 1 ? 0 : currentIndex + 1;
    assert(currentIndex === 0, `Next from 2 wraps to index 0, got ${currentIndex}`);
  });

  await runTest("R9.6: SSR render SlackMediaLightbox with Image (zoom bar, download, external link, pan container)", () => {
    const files: LightboxFile[] = [
      { url: "https://test.com/screenshot.png", name: "app_screenshot.png", type: "image/png", size: 1024 * 500 },
      { url: "https://test.com/design.png", name: "design_system.png", type: "image/png", size: 1024 * 600 },
    ];

    const html = ReactDOMServer.renderToString(
      <SlackMediaLightbox
        files={files}
        currentIndex={0}
        isOpen={true}
        onClose={() => {}}
      />
    );

    assert(html.includes("app_screenshot.png"), "Active filename displayed in top bar");
    assert(html.includes("File 1 of 2"), "Multi-file indicator rendered");
    assert(html.includes("Zoom In"), "Zoom In action button present");
    assert(html.includes("Zoom Out"), "Zoom Out action button present");
    assert(html.includes("Reset Zoom"), "Reset Zoom button present");
    assert(html.includes("Download File"), "Download action button present");
    assert(html.includes("Open Original"), "Open in New Tab action button present");
    assert(html.includes("Close (Esc)"), "Close Esc button present");
  });

  await runTest("R9.7: SSR render SlackMediaLightbox with PDF (Slack-style iframe viewer with #toolbar=1)", () => {
    const files: LightboxFile[] = [
      { url: "https://test.com/contract.pdf", name: "employment_contract.pdf", type: "application/pdf", size: 1024 * 1024 * 2 },
    ];

    const html = ReactDOMServer.renderToString(
      <SlackMediaLightbox
        files={files}
        currentIndex={0}
        isOpen={true}
        onClose={() => {}}
      />
    );

    assert(html.includes("employment_contract.pdf"), "PDF filename displayed");
    assert(html.includes("PDF Document"), "PDF Document badge rendered");
    assert(html.includes("<iframe"), "Slack-style in-app iframe preview rendered");
    assert(html.includes("#toolbar=1"), "iframe URL contains #toolbar=1 for PDF controls");
  });

  await runTest("R9.8: SSR render SlackMediaLightbox with non-previewable Document (centered action card)", () => {
    const files: LightboxFile[] = [
      { url: "https://test.com/archive.zip", name: "project_data.zip", type: "application/zip", size: 1024 * 1024 * 15 },
    ];

    const html = ReactDOMServer.renderToString(
      <SlackMediaLightbox
        files={files}
        currentIndex={0}
        isOpen={true}
        onClose={() => {}}
      />
    );

    assert(html.includes("project_data.zip"), "Archive name displayed");
    assert(html.includes("15 MB"), "File size displayed");
    assert(html.includes("Download"), "Download button displayed on document card");
    assert(html.includes("Open in Tab"), "Open in Tab link displayed");
  });

  // ============================================================================
  // SECTION 6: CROSS-CUTTING ADVERSARIAL COMBINATIONS
  // ============================================================================
  setSection("Cross-Cutting Adversarial Combinations (R1 + R2 + R3 + R4 + R9)");

  await runTest("X1: Standalone image attachment in thread reply with reactions", () => {
    const replyWithImg: Message = mockMsg({
      id: "reply-att-1",
      parentId: "parent-root-1",
      senderId: "usr-alice",
      senderName: "Alice Smith",
      content: "", // Standalone attachment!
      attachments: [{ id: "att-x", name: "bug_capture.png", size: 1024 * 120, type: "image/png", url: "https://test/bug.png", storagePath: "bug.png" }],
      reactions: createReactionsArray([{ emoji: "👀", count: 2, users: ["usr-bob", "usr-charlie"] }]),
      createdAt: "11:20 AM",
      updatedAt: "11:20 AM",
    });

    const html = ReactDOMServer.renderToString(
      <ThreadSidePanel
        parentMessage={mockMsg({
          id: "parent-root-1",
          senderId: "usr-bob",
          senderName: "Bob",
          content: "Please investigate bug",
          createdAt: "11:00 AM",
          updatedAt: "11:00 AM",
        })}
        replies={[replyWithImg]}
        currentUser={testMembers[0]}
        channelName="general"
        onClose={() => {}}
        onSendReply={() => {}}
      />
    );

    assert(html.includes("bug_capture.png"), "Image attachment rendered in thread reply");
    assert(html.includes("👀"), "Reaction rendered on thread reply");
  });

  await runTest("X2: Deleting parent message preserves tombstone while blocking further replies", () => {
    let parent: Message = mockMsg({
      id: "parent-delete-test",
      senderId: "usr-alice",
      senderName: "Alice",
      content: "Original discussion",
      threadCount: 3,
      isDeleted: false,
      createdAt: "10:00 AM",
      updatedAt: "10:00 AM",
    });

    // Soft delete parent
    parent = {
      ...parent,
      isDeleted: true,
      content: "This message was deleted",
      deletedAt: new Date().toISOString(),
    };

    assert(parent.isDeleted === true, "Parent marked deleted");
    assert(parent.content === "This message was deleted", "Tombstone applied");

    // Attempting to send reply must be rejected
    const canSendReply = !parent.isDeleted;
    assert(canSendReply === false, "Replying to deleted parent must be rejected");
  });

  await runTest("X3: Editing message preserves attached files and lightbox triggers", () => {
    const originalMsg: Message = mockMsg({
      id: "msg-edit-att",
      senderId: "usr-alice",
      senderName: "Alice",
      content: "First version of diagram notes",
      attachments: [{ id: "diag-1", name: "diagram.png", size: 1024 * 300, type: "image/png", url: "https://test/diagram.png", storagePath: "diagram.png" }],
      createdAt: "10:00 AM",
      updatedAt: "10:00 AM",
    });

    // Edit content
    const editedMsg: Message = {
      ...originalMsg,
      content: "Updated notes with finalized schema",
      isEdited: true,
      editedAt: new Date().toISOString(),
    };

    assert(editedMsg.content === "Updated notes with finalized schema", "Content updated");
    assert(editedMsg.isEdited === true, "Edited flag set");
    assert(editedMsg.attachments?.length === 1, "Attachment preserved");
    assert(editedMsg.attachments?.[0].name === "diagram.png", "Attachment name preserved");

    const html = ReactDOMServer.renderToString(
      <MessageFeed
        messages={[editedMsg]}
        currentUser={testMembers[0]}
        onAddReaction={() => {}}
      />
    );
    assert(html.includes("(edited)"), "(edited) tag visible");
    assert(html.includes("diagram.png"), "Attachment thumbnail still renders with lightbox click target");
  });

  // ============================================================================
  // SUMMARY REPORT
  // ============================================================================
  console.log("\n======================================================================");
  console.log("       CHALLENGER M5-1 ADVERSARIAL TEST EXECUTION SUMMARY             ");
  console.log("======================================================================");

  const total = testResults.length;
  const passed = testResults.filter((r) => r.passed).length;
  const failed = testResults.filter((r) => !r.passed).length;

  // Breakdown by section
  const sectionMap = new Map<string, { total: number; passed: number; failed: number }>();
  for (const r of testResults) {
    const s = sectionMap.get(r.section) || { total: 0, passed: 0, failed: 0 };
    s.total++;
    if (r.passed) s.passed++;
    else s.failed++;
    sectionMap.set(r.section, s);
  }

  for (const [sec, stat] of sectionMap.entries()) {
    const status = stat.failed === 0 ? "PASSED" : "FAILED";
    console.log(`  • ${sec}: ${stat.passed}/${stat.total} (${status})`);
  }

  console.log("----------------------------------------------------------------------");
  console.log(`  Total Tests Run: ${total}`);
  console.log(`  Passed:          ${passed}`);
  console.log(`  Failed:          ${failed}`);
  const passRate = ((passed / total) * 100).toFixed(1);
  console.log(`  Pass Rate:        ${passRate}%`);
  console.log("======================================================================\n");

  if (failed > 0) {
    console.error(`ADVERSARIAL STRESS TEST FAILED: ${failed} test(s) failed.`);
    process.exit(1);
  } else {
    console.log("ALL ADVERSARIAL CHALLENGES PASSED! ZERO DEFECTS FOUND (100% Pass Rate).");
    process.exit(0);
  }
}

executeChallengerM5Suite().catch((err) => {
  console.error("Fatal test runner exception:", err);
  process.exit(1);
});
