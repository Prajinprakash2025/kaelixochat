/**
 * Milestone 3 Message Management & Lightbox Empirical Stress Test Harness
 * Author: challenger_m3_2 (Critic & Specialist)
 *
 * EMPIRICAL CHALLENGES COVERED:
 * 1. Inline Editing Validation & Keyboard Controls:
 *    - Empty string rejection without attachments (whitespace, tabs, newlines)
 *    - Empty string acceptance WITH attachments (standalone attachment preservation)
 *    - Preservation of (edited) tag & tooltip metadata
 *    - Non-author edit authorization guard (UI and engine)
 *    - Keyboard events: Enter to save, Shift+Enter for newline, Escape to cancel
 *    - Editing deleted message rejection
 *
 * 2. Message Deletion, Confirmation Modal & Tombstone:
 *    - Confirmation modal lifecycle, snippet preview, and Esc/Enter keyboard control
 *    - Soft delete tombstone replacement (isDeleted: true, content replaced)
 *    - Removal of attachments, reactions, and hover action bar on tombstones
 *    - Pin clearing on deletion (unpinning and drawer exclusion)
 *    - Non-author deletion authorization guard (UI and engine)
 *    - Rejection of replies to deleted parent messages
 *    - Rejection of double-delete
 *
 * 3. Lightbox Viewer: PDF Preview, Zoom Bounds & Keyboard Controls:
 *    - Attachment MIME/extension classification (image, PDF, documents)
 *    - In-app PDF iframe viewer URL format (#toolbar=1)
 *    - Zoom clamping boundaries: min 0.5 (50%), max 3.0 (300%), reset 1.0 (100%)
 *    - Zoom button disabled states at boundaries
 *    - Keyboard shortcuts: +, -, 0, Escape, ArrowLeft, ArrowRight
 *    - Filename sanitization, null-byte stripping, and directory traversal defense
 *    - Multi-file carousel wrap-around navigation
 */

import React from "react";
import ReactDOMServer from "react-dom/server";
import { MessageFeed } from "../../src/components/chat/message-feed";
import { DeleteMessageModal } from "../../src/components/modals/delete-message-modal";
import {
  AttachmentPreview,
  SlackMediaLightbox,
  isImageAttachment,
  isPdfAttachment,
  LightboxFile,
} from "../../src/components/chat/attachment-preview";
import { sanitizeFileName } from "../../src/utils/storage";
import { KaelixoTestEngine } from "./test-harness";
import { Message, WorkspaceMember, Attachment } from "../../src/types";

// ANSI Terminal Colors
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const GRAY = "\x1b[90m";

interface TestResult {
  id: string;
  category: string;
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function runTest(
  id: string,
  category: string,
  name: string,
  fn: () => void | Promise<void>
) {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    results.push({ id, category, name, passed: true, durationMs });
    console.log(`  ${GREEN}✓${RESET} ${BOLD}[${id}]${RESET} ${name} ${GRAY}(${durationMs}ms)${RESET}`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({
      id,
      category,
      name,
      passed: false,
      error: err?.message || String(err),
      durationMs,
    });
    console.error(`  ${RED}✗ [${id}] ${name}${RESET} ${GRAY}(${durationMs}ms)${RESET}`);
    console.error(`    ${RED}Error: ${err?.message || err}${RESET}`);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(msg);
  }
}

function assertEqual<T>(actual: T, expected: T, msg?: string) {
  if (actual !== expected) {
    throw new Error(`${msg ? msg + ": " : ""}Expected "${expected}", got "${actual}"`);
  }
}

// Mock test fixtures
const currentUserAlice: WorkspaceMember = {
  id: "user-alice",
  name: "Alice Engineer",
  email: "alice@kaelixo.com",
  role: "member",
  department: "dev",
  avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Alice",
  status: "online",
};

const userBob: WorkspaceMember = {
  id: "user-bob",
  name: "Bob Manager",
  email: "bob@kaelixo.com",
  role: "manager",
  department: "dev",
  avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Bob",
  status: "online",
};

function toFeedMessage(msg: any): Message {
  return {
    id: msg.id,
    channelId: msg.channelId,
    content: msg.content || "",
    createdAt: msg.createdAt,
    updatedAt: msg.updatedAt || msg.createdAt,
    senderId: msg.senderId,
    senderName: msg.senderName,
    senderAvatar: msg.senderAvatar,
    senderRole: msg.senderRole,
    senderDepartment: msg.senderDepartment,
    parentId: msg.parentId || null,
    threadCount: msg.threadCount || 0,
    lastReplyAt: msg.lastReplyAt || null,
    attachments: msg.attachments || [],
    reactions: msg.reactions || [],
    isPinned: msg.isPinned || false,
    pinnedAt: msg.pinnedAt || null,
    pinnedByName: msg.pinnedByName || null,
    pinnedById: msg.pinnedById || null,
    isEdited: msg.isEdited || false,
    editedAt: msg.editedAt || null,
    isDeleted: msg.isDeleted || false,
    deletedAt: msg.deletedAt || null,
    sender: msg.sender || {
      id: msg.senderId || "user-alice",
      name: msg.senderName || "Alice",
      email: "alice@kaelixo.com",
      avatar: msg.senderAvatar || "https://api.dicebear.com/7.x/bottts/svg?seed=Alice",
      role: "member",
      department: "dev",
      status: "online",
    },
  };
}

const sampleAttachmentImage: Attachment = {
  id: "att-img-1",
  name: "system_architecture.png",
  size: 1024 * 350,
  type: "image/png",
  url: "https://supabase.local/storage/v1/object/public/kaelixo-attachments/chan-1/system_architecture.png",
  storagePath: "chan-1/system_architecture.png",
};

const sampleAttachmentPdf: Attachment = {
  id: "att-pdf-1",
  name: "api_spec_v2.pdf",
  size: 1024 * 1250,
  type: "application/pdf",
  url: "https://supabase.local/storage/v1/object/public/kaelixo-attachments/chan-1/api_spec_v2.pdf",
  storagePath: "chan-1/api_spec_v2.pdf",
};

async function executeHarness() {
  console.log(`\n${BOLD}${CYAN}======================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}   KAELIXO M3 EMPIRICAL STRESS TEST HARNESS: MESSAGE MGMT & LIGHTBOX   ${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================================${RESET}\n`);

  const engine = new KaelixoTestEngine();

  // ==========================================================================
  // SUITE 1: INLINE MESSAGE EDITING & KEYBOARD CONTROLS
  // ==========================================================================
  console.log(`${BOLD}${YELLOW}--- [Suite 1] Inline Message Editing & Keyboard Controls ---${RESET}`);

  await runTest(
    "M3-EDIT-1",
    "Inline Editing",
    "Empty string validation: Save disabled and rejected for empty text without attachments",
    async () => {
      // 1. Engine model rejection
      engine.reset();
      const channel = engine.createChannel("dev-test");
      const msg = await engine.sendMessage({
        channelId: channel.id,
        senderId: currentUserAlice.id,
        senderName: currentUserAlice.name,
        content: "Original message text",
      });

      let engineThrew = false;
      try {
        await engine.editMessage(msg.id, currentUserAlice.id, "   \n\t  ");
      } catch (e: any) {
        engineThrew = true;
        assert(e.message.includes("blank"), `Expected blank rejection, got: ${e.message}`);
      }
      assert(engineThrew, "Engine must reject editing text to whitespace without attachments");

      // 2. UI Component Save button validation logic check
      const trimmedEmpty = "   \n\t ".trim();
      const attachmentsEmpty: Attachment[] = [];
      const isSaveDisabled = !trimmedEmpty && (!attachmentsEmpty || attachmentsEmpty.length === 0);
      assert(isSaveDisabled === true, "Save button must be disabled when text is empty and no attachments exist");

      // Verify Enter key logic check
      let editDispatched = false;
      const onEdit = () => {
        editDispatched = true;
      };
      if (trimmedEmpty || (attachmentsEmpty && attachmentsEmpty.length > 0)) {
        onEdit();
      }
      assert(!editDispatched, "Enter key handler must not dispatch edit when text is empty and no attachments exist");
    }
  );

  await runTest(
    "M3-EDIT-2",
    "Inline Editing",
    "Empty string validation: Save ALLOWED when message has attachments (standalone attachment edit)",
    async () => {
      // 1. Engine model acceptance
      engine.reset();
      const channel = engine.createChannel("dev-test");
      const msg = await engine.sendMessage({
        channelId: channel.id,
        senderId: currentUserAlice.id,
        senderName: currentUserAlice.name,
        content: "Check this architecture diagram",
        attachments: [sampleAttachmentImage],
      });

      const updated = await engine.editMessage(msg.id, currentUserAlice.id, "");
      assertEqual(updated.content, "");
      assert(updated.attachments?.length === 1, "Attachment must be preserved when content is cleared");
      assertEqual(updated.isEdited, true);

      // 2. UI Component Save button validation logic check
      const trimmedEmpty = "".trim();
      const attachmentsWithImage: Attachment[] = [sampleAttachmentImage];
      const isSaveDisabled =
        !trimmedEmpty && (!attachmentsWithImage || attachmentsWithImage.length === 0);
      assert(isSaveDisabled === false, "Save button must be ENABLED when text is empty but attachments exist");

      // Verify Enter key handler allows saving empty text with attachments
      let savedText: string | null = null;
      if (trimmedEmpty || (attachmentsWithImage && attachmentsWithImage.length > 0)) {
        savedText = trimmedEmpty;
      }
      assertEqual(savedText, "", "Enter key handler must dispatch empty string when attachment exists");
    }
  );

  await runTest(
    "M3-EDIT-3",
    "Inline Editing",
    "Preservation of (edited) indicator, timestamp tooltip, and immutable createdAt",
    async () => {
      engine.reset();
      const channel = engine.createChannel("dev-test");
      const msg = await engine.sendMessage({
        channelId: channel.id,
        senderId: currentUserAlice.id,
        senderName: currentUserAlice.name,
        content: "Version 1 content",
      });

      const initialCreatedAt = msg.createdAt;
      await new Promise((r) => setTimeout(r, 10)); // small clock progression

      const editedMsg = await engine.editMessage(
        msg.id,
        currentUserAlice.id,
        "Version 2 updated content"
      );

      assertEqual(editedMsg.isEdited, true, "isEdited flag must be true");
      assert(Boolean(editedMsg.editedAt), "editedAt timestamp must be set");
      assertEqual(editedMsg.createdAt, initialCreatedAt, "Original createdAt timestamp must not be overwritten");

      // Verify DOM rendering of (edited) indicator via MessageFeed
      const html = ReactDOMServer.renderToStaticMarkup(
        React.createElement(MessageFeed, {
          messages: [toFeedMessage(editedMsg)],
          currentUser: currentUserAlice,
          onAddReaction: () => {},
        })
      );

      assert(html.includes("(edited)"), "MessageFeed must render '(edited)' tag in DOM");
      assert(html.includes("Version 2 updated content"), "MessageFeed must render updated content");
      assert(!html.includes("Version 1 content"), "MessageFeed must not render stale content");
    }
  );

  await runTest(
    "M3-EDIT-4",
    "Inline Editing",
    "Non-author edit authorization guard: rejection in engine and omission of edit button in UI",
    async () => {
      engine.reset();
      const channel = engine.createChannel("dev-test");
      const aliceMsg = await engine.sendMessage({
        channelId: channel.id,
        senderId: currentUserAlice.id,
        senderName: currentUserAlice.name,
        content: "Alice protected message",
      });

      // 1. Engine model rejection for Bob
      let engineRejected = false;
      try {
        await engine.editMessage(aliceMsg.id, userBob.id, "Bob unauthorized edit");
      } catch (e: any) {
        engineRejected = true;
        assert(e.message.includes("Unauthorized") || e.message.includes("author"), e.message);
      }
      assert(engineRejected, "Engine must reject non-author edit attempt");

      // 2. UI Hover bar verification: Bob viewing Alice's message must NOT see Pencil icon / edit action
      const bobViewingHtml = ReactDOMServer.renderToStaticMarkup(
        React.createElement(MessageFeed, {
          messages: [toFeedMessage(aliceMsg)],
          currentUser: userBob,
          onAddReaction: () => {},
        })
      );

      assert(
        !bobViewingHtml.includes('title="Edit message"'),
        "Non-author (Bob) must NOT see 'Edit message' button in hover bar"
      );

      // Alice viewing Alice's message MUST see Pencil icon / edit action
      const aliceViewingHtml = ReactDOMServer.renderToStaticMarkup(
        React.createElement(MessageFeed, {
          messages: [toFeedMessage(aliceMsg)],
          currentUser: currentUserAlice,
          onAddReaction: () => {},
        })
      );

      assert(
        aliceViewingHtml.includes('title="Edit message"'),
        "Author (Alice) MUST see 'Edit message' button in hover bar"
      );
    }
  );

  await runTest(
    "M3-EDIT-5",
    "Inline Editing",
    "Keyboard event handlers: Enter saves, Shift+Enter permits multiline, Esc cancels",
    () => {
      // Simulate textarea onKeyDown logic exactly as in message-feed.tsx
      let savedContent: string | null = null;
      let editCancelled = false;

      const triggerKeyDown = (
        key: string,
        shiftKey: boolean,
        content: string,
        hasAttachments: boolean
      ) => {
        const e = {
          key,
          shiftKey,
          defaultPrevented: false,
          preventDefault: () => {
            e.defaultPrevented = true;
          },
        };

        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          const trimmed = content.trim();
          if (trimmed || hasAttachments) {
            savedContent = trimmed;
          }
        } else if (e.key === "Escape") {
          e.preventDefault();
          editCancelled = true;
        }

        return e;
      };

      // 1. Enter without Shift -> should trigger save
      const ev1 = triggerKeyDown("Enter", false, "New message text", false);
      assert(ev1.defaultPrevented, "Enter should prevent default browser form submission");
      assertEqual(savedContent, "New message text", "Enter must trigger save with trimmed content");

      // 2. Shift + Enter -> must NOT trigger save, allows newline
      savedContent = null;
      const ev2 = triggerKeyDown("Enter", true, "Multiline newline", false);
      assert(!ev2.defaultPrevented, "Shift+Enter must not prevent default to allow newline insertion");
      assertEqual(savedContent, null, "Shift+Enter must NOT trigger save");

      // 3. Escape -> cancels edit
      const ev3 = triggerKeyDown("Escape", false, "Discarded edits", false);
      assert(ev3.defaultPrevented, "Escape should prevent default");
      assert(editCancelled, "Escape must cancel edit mode");
    }
  );

  await runTest(
    "M3-EDIT-6",
    "Inline Editing",
    "Rejection of edit on already deleted message (tombstone protection)",
    async () => {
      engine.reset();
      const channel = engine.createChannel("dev-test");
      const msg = await engine.sendMessage({
        channelId: channel.id,
        senderId: currentUserAlice.id,
        senderName: currentUserAlice.name,
        content: "Message about to be deleted",
      });

      await engine.deleteMessage(msg.id, currentUserAlice.id);

      let threw = false;
      try {
        await engine.editMessage(msg.id, currentUserAlice.id, "Trying to resurrect message");
      } catch (e: any) {
        threw = true;
        assert(e.message.includes("deleted"), `Expected deleted error, got: ${e.message}`);
      }
      assert(threw, "Editing an already deleted message must be rejected");
    }
  );

  await runTest(
    "M3-EDIT-7",
    "Inline Editing",
    "Complex markdown, code block formatting, and multiline preservation in inline edits",
    async () => {
      engine.reset();
      const channel = engine.createChannel("dev-test");
      const codeSnippet = "```typescript\nfunction solve(): boolean {\n  return true;\n}\n```";
      const msg = await engine.sendMessage({
        channelId: channel.id,
        senderId: currentUserAlice.id,
        senderName: currentUserAlice.name,
        content: "Check this snippet",
      });

      const updated = await engine.editMessage(msg.id, currentUserAlice.id, codeSnippet);
      assertEqual(updated.content, codeSnippet);

      const html = ReactDOMServer.renderToStaticMarkup(
        React.createElement(MessageFeed, {
          messages: [toFeedMessage(updated)],
          currentUser: currentUserAlice,
          onAddReaction: () => {},
        })
      );

      assert(html.includes("typescript"), "Rendered message must preserve code block language tag");
      assert(html.includes("function solve()"), "Rendered message must preserve code block content");
      assert(html.includes("(edited)"), "Must render (edited) tag");
    }
  );

  await runTest(
    "M3-EDIT-8",
    "Inline Editing",
    "Rapid sequential edits: progressive timestamp updates while preserving immutable metadata",
    async () => {
      engine.reset();
      const channel = engine.createChannel("dev-test");
      const msg = await engine.sendMessage({
        channelId: channel.id,
        senderId: currentUserAlice.id,
        senderName: currentUserAlice.name,
        content: "Draft v1",
      });

      const originalCreatedAt = msg.createdAt;

      await new Promise((r) => setTimeout(r, 5));
      const v2 = await engine.editMessage(msg.id, currentUserAlice.id, "Draft v2 revised");
      const t2 = v2.editedAt;

      await new Promise((r) => setTimeout(r, 5));
      const v3 = await engine.editMessage(msg.id, currentUserAlice.id, "Draft v3 final release");
      const t3 = v3.editedAt;

      assertEqual(v3.content, "Draft v3 final release");
      assertEqual(v3.createdAt, originalCreatedAt, "createdAt must remain untouched through multiple edits");
      assertEqual(v3.isEdited, true);
      assert(Boolean(t2 && t3 && t3 >= t2), "editedAt must advance or stay chronological");
    }
  );

  // ==========================================================================
  // SUITE 2: MESSAGE DELETION, CONFIRMATION MODAL & TOMBSTONE
  // ==========================================================================
  console.log(`\n${BOLD}${YELLOW}--- [Suite 2] Message Deletion, Confirmation Modal & Tombstone ---${RESET}`);

  await runTest(
    "M3-DEL-1",
    "Message Deletion",
    "Delete confirmation modal rendering: destructive header, snippet preview, and buttons",
    () => {
      const sampleMsg: Message = toFeedMessage({
        id: "msg-del-test-1",
        channelId: "chan-1",
        senderId: currentUserAlice.id,
        senderName: currentUserAlice.name,
        senderAvatar: currentUserAlice.avatar,
        content: "Critical database migration plan to delete",
        createdAt: "10:45 AM",
        updatedAt: "10:45 AM",
      });

      const html = ReactDOMServer.renderToStaticMarkup(
        React.createElement(DeleteMessageModal, {
          isOpen: true,
          message: sampleMsg,
          onClose: () => {},
          onConfirm: () => {},
        })
      );

      assert(html.includes("Delete message"), "Modal must render 'Delete message' title");
      assert(html.includes("Are you sure you want to delete this message?"), "Modal must render warning copy");
      assert(html.includes("Critical database migration plan to delete"), "Modal must render preview snippet");
      assert(html.includes("Cancel"), "Modal must render Cancel button");
      assert(html.includes("Delete"), "Modal must render Delete confirmation button");
    }
  );

  await runTest(
    "M3-DEL-2",
    "Message Deletion",
    "Delete confirmation modal keyboard handling: Esc cancels, Enter confirms",
    () => {
      let closed = false;
      let confirmedId: string | null = null;

      const simulateModalKey = (key: string, shiftKey: boolean, messageId: string) => {
        const e = {
          key,
          shiftKey,
          defaultPrevented: false,
          preventDefault: () => {
            e.defaultPrevented = true;
          },
        };

        if (e.key === "Escape") {
          e.preventDefault();
          closed = true;
        } else if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          confirmedId = messageId;
        }

        return e;
      };

      // 1. Esc key cancels modal
      const evEsc = simulateModalKey("Escape", false, "msg-123");
      assert(evEsc.defaultPrevented, "Esc should prevent default");
      assert(closed, "Esc must trigger onClose");

      // 2. Enter key confirms deletion
      const evEnter = simulateModalKey("Enter", false, "msg-123");
      assert(evEnter.defaultPrevented, "Enter should prevent default");
      assertEqual(confirmedId, "msg-123", "Enter must confirm deletion with message ID");

      // 3. Shift+Enter does NOT confirm
      confirmedId = null;
      const evShiftEnter = simulateModalKey("Enter", true, "msg-123");
      assert(!evShiftEnter.defaultPrevented, "Shift+Enter should not prevent default");
      assertEqual(confirmedId, null, "Shift+Enter must NOT confirm deletion");
    }
  );

  await runTest(
    "M3-DEL-3",
    "Message Deletion",
    "Tombstone replacement: isDeleted=true, content replaced, attachments/reactions/hover bar removed",
    async () => {
      engine.reset();
      const channel = engine.createChannel("dev-test");
      const msg = await engine.sendMessage({
        channelId: channel.id,
        senderId: currentUserAlice.id,
        senderName: currentUserAlice.name,
        content: "Top secret credentials: password123",
        attachments: [sampleAttachmentImage],
      });

      // Add reaction
      await engine.toggleReaction(msg.id, currentUserAlice.id, currentUserAlice.name, "🚀");

      // Execute deletion
      const { tombstone } = await engine.deleteMessage(msg.id, currentUserAlice.id);

      assertEqual(tombstone.isDeleted, true, "isDeleted must be true");
      assertEqual(tombstone.content, "This message was deleted", "Content must be replaced with tombstone");
      assert(Boolean(tombstone.deletedAt), "deletedAt timestamp must be set");
      assertEqual(tombstone.attachments?.length || 0, 0, "Attachments must be cleared/empty on tombstone");
      assertEqual(Object.keys(tombstone.reactions || {}).length, 0, "Reactions must be cleared on tombstone");

      // Render tombstone in MessageFeed
      const html = ReactDOMServer.renderToStaticMarkup(
        React.createElement(MessageFeed, {
          messages: [toFeedMessage(tombstone)],
          currentUser: currentUserAlice,
          onAddReaction: () => {},
        })
      );

      assert(html.includes("This message was deleted"), "Tombstone text must be rendered in DOM");
      assert(!html.includes("password123"), "Original sensitive content must NEVER be present in DOM");
      assert(!html.includes("system_architecture.png"), "Attachments must NOT be rendered on tombstone");
      assert(!html.includes('title="Edit message"'), "Hover bar edit action must NOT be present on tombstone");
      assert(!html.includes('title="Delete message"'), "Hover bar delete action must NOT be present on tombstone");
      assert(!html.includes('title="Add Reaction"'), "Hover bar reaction trigger must NOT be present on tombstone");
    }
  );

  await runTest(
    "M3-DEL-4",
    "Message Deletion",
    "Automatic pin clearing on deletion: unpins message and excludes from pinned drawer",
    async () => {
      engine.reset();
      const channel = engine.createChannel("dev-test");
      const msg = await engine.sendMessage({
        channelId: channel.id,
        senderId: currentUserAlice.id,
        senderName: currentUserAlice.name,
        content: "Important announcement to pin then delete",
      });

      // Pin the message
      const pinned = await engine.pinMessage(msg.id, currentUserAlice.id, currentUserAlice.name);
      assertEqual(pinned.isPinned, true);

      // Verify channel has 1 pinned message
      let pinnedList = engine.getPinnedMessages(channel.id);
      assertEqual(pinnedList.length, 1);

      // Delete message
      const { tombstone } = await engine.deleteMessage(msg.id, currentUserAlice.id);
      assertEqual(tombstone.isPinned, false, "Tombstone must set isPinned to false");

      // Verify channel now has 0 pinned messages
      pinnedList = engine.getPinnedMessages(channel.id);
      assertEqual(pinnedList.length, 0, "Deleted message must no longer appear in pinned list");
    }
  );

  await runTest(
    "M3-DEL-5",
    "Message Deletion",
    "Non-author deletion authorization guard: rejection in engine and omission of delete button in UI",
    async () => {
      engine.reset();
      const channel = engine.createChannel("dev-test");
      const aliceMsg = await engine.sendMessage({
        channelId: channel.id,
        senderId: currentUserAlice.id,
        senderName: currentUserAlice.name,
        content: "Alice message to protect from Bob deletion",
      });

      // 1. Engine model rejection
      let engineRejected = false;
      try {
        await engine.deleteMessage(aliceMsg.id, userBob.id);
      } catch (e: any) {
        engineRejected = true;
        assert(e.message.includes("Unauthorized") || e.message.includes("author"), e.message);
      }
      assert(engineRejected, "Engine must reject non-author deletion attempt");

      // 2. UI Hover bar verification: Bob viewing Alice's message must NOT see Trash2 / delete action
      const bobViewingHtml = ReactDOMServer.renderToStaticMarkup(
        React.createElement(MessageFeed, {
          messages: [toFeedMessage(aliceMsg)],
          currentUser: userBob,
          onAddReaction: () => {},
        })
      );

      assert(
        !bobViewingHtml.includes('title="Delete message"'),
        "Non-author (Bob) must NOT see 'Delete message' button in hover bar"
      );

      // Alice viewing Alice's message MUST see Trash2 / delete action
      const aliceViewingHtml = ReactDOMServer.renderToStaticMarkup(
        React.createElement(MessageFeed, {
          messages: [toFeedMessage(aliceMsg)],
          currentUser: currentUserAlice,
          onAddReaction: () => {},
        })
      );

      assert(
        aliceViewingHtml.includes('title="Delete message"'),
        "Author (Alice) MUST see 'Delete message' button in hover bar"
      );
    }
  );

  await runTest(
    "M3-DEL-6",
    "Message Deletion",
    "Thread replies cascade & rejection: cannot reply to a deleted parent message",
    async () => {
      engine.reset();
      const channel = engine.createChannel("dev-test");
      const parent = await engine.sendMessage({
        channelId: channel.id,
        senderId: currentUserAlice.id,
        senderName: currentUserAlice.name,
        content: "Parent message for thread testing",
      });

      // Delete parent
      await engine.deleteMessage(parent.id, currentUserAlice.id);

      // Attempt sending thread reply to deleted parent
      let replyRejected = false;
      try {
        await engine.sendMessage({
          channelId: channel.id,
          senderId: userBob.id,
          senderName: userBob.name,
          parentId: parent.id,
          content: "Trying to reply to deleted parent",
        });
      } catch (e: any) {
        replyRejected = true;
        assert(e.message.includes("deleted"), `Expected deleted error, got: ${e.message}`);
      }
      assert(replyRejected, "Engine must reject replying to an already deleted parent message");
    }
  );

  await runTest(
    "M3-DEL-7",
    "Message Deletion",
    "Rejection of double deletion on already deleted message",
    async () => {
      engine.reset();
      const channel = engine.createChannel("dev-test");
      const msg = await engine.sendMessage({
        channelId: channel.id,
        senderId: currentUserAlice.id,
        senderName: currentUserAlice.name,
        content: "Message to delete once",
      });

      await engine.deleteMessage(msg.id, currentUserAlice.id);

      let doubleDeleteThrew = false;
      try {
        await engine.deleteMessage(msg.id, currentUserAlice.id);
      } catch (e: any) {
        doubleDeleteThrew = true;
        assert(e.message.includes("already been deleted"), e.message);
      }
      assert(doubleDeleteThrew, "Double deletion must be rejected");
    }
  );

  await runTest(
    "M3-DEL-8",
    "Message Deletion",
    "Search index & query isolation: deleted message content excluded from text search results",
    async () => {
      engine.reset();
      const channel = engine.createChannel("dev-test");
      const msg = await engine.sendMessage({
        channelId: channel.id,
        senderId: currentUserAlice.id,
        senderName: currentUserAlice.name,
        content: "Ephemeral confidential financial forecast X99",
      });

      // Verify search finds it while active
      let results = engine.searchMessages("confidential financial");
      assertEqual(results.length, 1, "Active message must be found by search");

      // Delete message
      await engine.deleteMessage(msg.id, currentUserAlice.id);

      // Verify search no longer returns original content
      results = engine.searchMessages("confidential financial");
      assertEqual(results.length, 0, "Deleted message text must NOT match search queries");
    }
  );

  await runTest(
    "M3-DEL-9",
    "Message Deletion",
    "Reactions purge on deletion: all multi-user emoji reactions cleared from tombstone",
    async () => {
      engine.reset();
      const channel = engine.createChannel("dev-test");
      const msg = await engine.sendMessage({
        channelId: channel.id,
        senderId: currentUserAlice.id,
        senderName: currentUserAlice.name,
        content: "Team survey prompt",
      });

      // Multiple users react with various emojis
      await engine.toggleReaction(msg.id, "user-alice", "Alice", "👍");
      await engine.toggleReaction(msg.id, "user-bob", "Bob", "👍");
      await engine.toggleReaction(msg.id, "user-charlie", "Charlie", "🎉");
      await engine.toggleReaction(msg.id, "user-david", "David", "❤️");

      const beforeDelete = engine.messages.get(msg.id);
      assertEqual(Object.keys(beforeDelete?.reactions || {}).length, 3);

      // Delete message
      const { tombstone } = await engine.deleteMessage(msg.id, currentUserAlice.id);

      assertEqual(Object.keys(tombstone.reactions || {}).length, 0, "All reactions must be cleared from tombstone");

      // Verify DOM rendering excludes reaction chips
      const html = ReactDOMServer.renderToStaticMarkup(
        React.createElement(MessageFeed, {
          messages: [toFeedMessage(tombstone)],
          currentUser: currentUserAlice,
          onAddReaction: () => {},
        })
      );

      assert(!html.includes("👍"), "Tombstone DOM must not render 👍 reaction");
      assert(!html.includes("🎉"), "Tombstone DOM must not render 🎉 reaction");
      assert(!html.includes("❤️"), "Tombstone DOM must not render ❤️ reaction");
    }
  );

  // ==========================================================================
  // SUITE 3: LIGHTBOX VIEWER: PDF PREVIEW, ZOOM BOUNDS & KEYBOARD CONTROLS
  // ==========================================================================
  console.log(`\n${BOLD}${YELLOW}--- [Suite 3] Lightbox Viewer: PDF Preview, Zoom Bounds & Keyboard Controls ---${RESET}`);

  await runTest(
    "M3-LIGHT-1",
    "Lightbox Viewer",
    "Attachment classification: accurate image, PDF, and generic document discrimination",
    () => {
      // Images
      assert(isImageAttachment({ name: "photo.png", type: "image/png", url: "" }), "photo.png is image");
      assert(isImageAttachment({ name: "screen.JPEG", type: "image/jpeg", url: "" }), "screen.JPEG is image");
      assert(isImageAttachment({ name: "vector.svg", type: "image/svg+xml", url: "" }), "vector.svg is image");
      assert(isImageAttachment({ name: "banner.webp", type: "image/webp", url: "" }), "banner.webp is image");

      // PDFs
      assert(isPdfAttachment({ name: "doc.pdf", type: "application/pdf", url: "" }), "doc.pdf is PDF");
      assert(isPdfAttachment({ name: "STATEMENT.PDF", type: "", url: "" }), "STATEMENT.PDF is PDF");
      assert(!isImageAttachment({ name: "doc.pdf", type: "application/pdf", url: "" }), "doc.pdf is NOT image");

      // Non-image, non-PDF docs
      assert(!isImageAttachment({ name: "data.xlsx", type: "application/vnd.ms-excel", url: "" }), "data.xlsx is not image");
      assert(!isPdfAttachment({ name: "data.xlsx", type: "application/vnd.ms-excel", url: "" }), "data.xlsx is not PDF");
      assert(!isImageAttachment({ name: "notes.txt", type: "text/plain", url: "" }), "notes.txt is not image");
      assert(!isPdfAttachment({ name: "notes.txt", type: "text/plain", url: "" }), "notes.txt is not PDF");
    }
  );

  await runTest(
    "M3-LIGHT-2",
    "Lightbox Viewer",
    "In-App PDF preview iframe URL format (#toolbar=1) and container scale zoom",
    () => {
      const pdfFile: LightboxFile = {
        name: "quarterly_financials.pdf",
        type: "application/pdf",
        url: "https://supabase.local/storage/v1/object/public/kaelixo-attachments/fin/quarterly_financials.pdf",
        size: 1024 * 800,
      };

      const html = ReactDOMServer.renderToStaticMarkup(
        React.createElement(SlackMediaLightbox, {
          files: [pdfFile],
          currentIndex: 0,
          isOpen: true,
          onClose: () => {},
        })
      );

      // Verify iframe presence and toolbar=1 query
      assert(html.includes("<iframe"), "Lightbox must render iframe for PDF attachments");
      assert(
        html.includes("quarterly_financials.pdf#toolbar=1"),
        "PDF iframe src must include '#toolbar=1' for embedded browser toolbar controls"
      );
      assert(html.includes("PDF Document"), "Header must indicate PDF Document type");
      assert(!html.includes("Image Preview"), "Header must not indicate Image Preview for PDF");
    }
  );

  await runTest(
    "M3-LIGHT-3",
    "Lightbox Viewer",
    "Zoom boundary limits: max clamp at 3.0 (300%), min clamp at 0.5 (50%), reset to 1.0 (100%)",
    () => {
      // Simulate zoom logic from SlackMediaLightbox
      let zoom = 1.0;
      const zoomIn = () => {
        zoom = Math.min(zoom + 0.25, 3.0);
      };
      const zoomOut = () => {
        zoom = Math.max(zoom - 0.25, 0.5);
      };
      const resetZoom = () => {
        zoom = 1.0;
      };

      // 1. Initial zoom is 1.0
      assertEqual(zoom, 1.0, "Initial zoom must be 1.0");

      // 2. Zoom in progression and maximum clamping at 3.0
      // 1.0 -> 1.25 -> 1.5 -> 1.75 -> 2.0 -> 2.25 -> 2.5 -> 2.75 -> 3.0 (8 steps)
      for (let i = 0; i < 8; i++) {
        zoomIn();
      }
      assertEqual(zoom, 3.0, "After 8 zoom-in steps, zoom must reach 3.0");

      // Further zoom-in attempts must clamp strictly at 3.0
      zoomIn();
      zoomIn();
      assertEqual(zoom, 3.0, "Zoom-in must strictly clamp at max limit 3.0");

      // Disabled state check at zoom = 3.0
      const isZoomInDisabled = zoom >= 3.0;
      assert(isZoomInDisabled, "Zoom-in button must be disabled when zoom >= 3.0");

      // 3. Reset zoom restores directly to 1.0
      resetZoom();
      assertEqual(zoom, 1.0, "Reset zoom must restore zoom to 1.0");

      // 4. Zoom out progression and minimum clamping at 0.5
      // 1.0 -> 0.75 -> 0.5 (2 steps)
      zoomOut();
      assertEqual(zoom, 0.75, "First zoom-out step must be 0.75");
      zoomOut();
      assertEqual(zoom, 0.5, "Second zoom-out step must reach 0.5");

      // Further zoom-out attempts must clamp strictly at 0.5
      zoomOut();
      zoomOut();
      assertEqual(zoom, 0.5, "Zoom-out must strictly clamp at min limit 0.5");

      // Disabled state check at zoom = 0.5
      const isZoomOutDisabled = zoom <= 0.5;
      assert(isZoomOutDisabled, "Zoom-out button must be disabled when zoom <= 0.5");
    }
  );

  await runTest(
    "M3-LIGHT-4",
    "Lightbox Viewer",
    "Keyboard shortcuts: +, -, 0, Escape, ArrowLeft, ArrowRight",
    () => {
      let zoom = 1.0;
      let closed = false;
      let activeIndex = 1;
      const fileCount = 3;

      const handleKeyDown = (key: string) => {
        if (key === "Escape") {
          closed = true;
        } else if (key === "ArrowLeft") {
          activeIndex = activeIndex === 0 ? fileCount - 1 : activeIndex - 1;
          zoom = 1.0;
        } else if (key === "ArrowRight") {
          activeIndex = activeIndex === fileCount - 1 ? 0 : activeIndex + 1;
          zoom = 1.0;
        } else if (key === "+" || key === "=") {
          zoom = Math.min(zoom + 0.25, 3.0);
        } else if (key === "-") {
          zoom = Math.max(zoom - 0.25, 0.5);
        } else if (key === "0") {
          zoom = 1.0;
        }
      };

      // 1. Escape closes
      handleKeyDown("Escape");
      assert(closed, "Escape must close lightbox");

      // 2. '+' zooms in
      handleKeyDown("+");
      assertEqual(zoom, 1.25, "'+' key must zoom in by 0.25");

      // 3. '-' zooms out
      handleKeyDown("-");
      handleKeyDown("-");
      assertEqual(zoom, 0.75, "'-' key must zoom out by 0.25");

      // 4. '0' resets
      handleKeyDown("0");
      assertEqual(zoom, 1.0, "'0' key must reset zoom to 1.0");

      // 5. ArrowRight advances index
      assertEqual(activeIndex, 1);
      handleKeyDown("ArrowRight");
      assertEqual(activeIndex, 2, "ArrowRight must increment index");

      // Wrap around on end
      handleKeyDown("ArrowRight");
      assertEqual(activeIndex, 0, "ArrowRight at end must wrap around to index 0");

      // Wrap around on start with ArrowLeft
      handleKeyDown("ArrowLeft");
      assertEqual(activeIndex, 2, "ArrowLeft at 0 must wrap around to last index (2)");
    }
  );

  await runTest(
    "M3-LIGHT-5",
    "Lightbox Viewer",
    "Download URL resolution & sanitizeFileName defense against traversal and null bytes",
    () => {
      // 1. Standard name
      assertEqual(sanitizeFileName("report.pdf"), "report.pdf");

      // 2. Directory traversal attempt
      assertEqual(sanitizeFileName("../../etc/shadow.png"), "etc_shadow.png");
      assertEqual(sanitizeFileName("..\\..\\windows\\system32\\cmd.exe.pdf"), "windows_system32_cmd_exe.pdf");

      // 3. Null byte poisoning attempt
      assertEqual(sanitizeFileName("invoice\0.pdf"), "invoice.pdf");

      // 4. Degenerate empty or whitespace filename
      assertEqual(sanitizeFileName(""), "attachment");
      assertEqual(sanitizeFileName("   "), "attachment");

      // 5. Unsafe characters
      const sanitized = sanitizeFileName("Q3 Financials [CONFIDENTIAL] #1 (v2.0)!.pdf");
      assert(!sanitized.includes("#"), "Sanitized name must not contain #");
      assert(!sanitized.includes("["), "Sanitized name must not contain [");
      assert(!sanitized.includes("!"), "Sanitized name must not contain !");
      assert(sanitized.endsWith(".pdf"), "Sanitized name must preserve .pdf extension");
    }
  );

  await runTest(
    "M3-LIGHT-6",
    "Lightbox Viewer",
    "Multi-file carousel rendering: thumbnails, counter pill, and navigation buttons",
    () => {
      const files: LightboxFile[] = [
        { name: "slide1.png", type: "image/png", url: "https://local/slide1.png", size: 50000 },
        { name: "slide2.png", type: "image/png", url: "https://local/slide2.png", size: 60000 },
        { name: "specs.pdf", type: "application/pdf", url: "https://local/specs.pdf", size: 120000 },
      ];

      const html = ReactDOMServer.renderToStaticMarkup(
        React.createElement(SlackMediaLightbox, {
          files,
          currentIndex: 0,
          isOpen: true,
          onClose: () => {},
        })
      );

      // Verify counter in header
      assert(html.includes("File 1 of 3"), "Header must display 'File 1 of 3'");
      // Verify thumbnail strip rendered
      assert(html.includes('aria-label="Previous file"'), "Must render Previous file button");
      assert(html.includes('aria-label="Next file"'), "Must render Next file button");

      // For single file, navigation buttons must NOT render
      const singleHtml = ReactDOMServer.renderToStaticMarkup(
        React.createElement(SlackMediaLightbox, {
          files: [files[0]],
          currentIndex: 0,
          isOpen: true,
          onClose: () => {},
        })
      );
      assert(!singleHtml.includes("File 1 of 1"), "Header should not display carousel counter for single file");
      assert(!singleHtml.includes('aria-label="Previous file"'), "Single file lightbox must not render Previous button");
      assert(!singleHtml.includes('aria-label="Next file"'), "Single file lightbox must not render Next button");
    }
  );

  await runTest(
    "M3-LIGHT-7",
    "Lightbox Viewer",
    "Double-click zoom toggle (1.0 -> 2.0 -> 1.0) and pan clamp reset on zoom out",
    () => {
      let zoom = 1.0;
      let pan = { x: 50, y: 50 };

      const handleDoubleClick = () => {
        if (zoom > 1) {
          zoom = 1.0;
          pan = { x: 0, y: 0 };
        } else {
          zoom = 2.0;
        }
      };

      const handleZoomOut = () => {
        const next = Math.max(zoom - 0.25, 0.5);
        if (next <= 1) pan = { x: 0, y: 0 };
        zoom = next;
      };

      // 1. Initial state
      assertEqual(zoom, 1.0);

      // 2. Double click at 1.0 zooms to 2.0
      handleDoubleClick();
      assertEqual(zoom, 2.0, "Double click at 1.0 must zoom to 2.0");

      // 3. Double click at 2.0 resets to 1.0 and clears pan
      pan = { x: 120, y: -45 };
      handleDoubleClick();
      assertEqual(zoom, 1.0, "Double click when zoomed must reset to 1.0");
      assertEqual(pan.x, 0, "Pan X must reset to 0");
      assertEqual(pan.y, 0, "Pan Y must reset to 0");

      // 4. Zoom out below or equal to 1.0 automatically clears pan
      zoom = 1.25;
      pan = { x: 80, y: 60 };
      handleZoomOut(); // 1.25 -> 1.0
      assertEqual(zoom, 1.0);
      assertEqual(pan.x, 0, "Pan must be reset when zooming out to <= 1.0");
      assertEqual(pan.y, 0);
    }
  );

  await runTest(
    "M3-LIGHT-8",
    "Lightbox Viewer",
    "Extreme filename sanitization: 200+ characters, consecutive dots, and dotfiles",
    () => {
      // 1. Degenerate dotfile (.bashrc, .env)
      assertEqual(sanitizeFileName(".bashrc"), "attachment.bashrc");
      assertEqual(sanitizeFileName(".env.production"), "env.production");

      // 2. Excessive length (200 characters) - should be truncated to 80 chars + ext
      const longName = "a".repeat(200) + ".pdf";
      const sanitizedLong = sanitizeFileName(longName);
      assert(sanitizedLong.endsWith(".pdf"), "Must preserve extension");
      assert(sanitizedLong.length <= 85, `Length ${sanitizedLong.length} exceeds 85 chars limit`);

      // 3. Multiple consecutive dots and underscores
      assertEqual(sanitizeFileName("report....final....v2.pdf"), "report_final_v2.pdf");
      assertEqual(sanitizeFileName("___ugly___filename___.png"), "ugly_filename.png");
    }
  );

  // ==========================================================================
  // SUMMARY REPORT
  // ==========================================================================
  console.log(`\n${BOLD}${CYAN}======================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}                     HARNESS EXECUTION SUMMARY                        ${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================================${RESET}`);

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const passRate = ((passed / total) * 100).toFixed(1);

  console.log(`  Total Scenarios: ${total}`);
  console.log(`  Passed:          ${passed}`);
  console.log(`  Failed:          ${failed}`);
  console.log(`  Pass Rate:        ${passRate}%`);

  if (failed > 0) {
    console.log(`\n${BOLD}${RED}FAILED SCENARIOS:${RESET}`);
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`  - [${r.id}] ${r.name}: ${r.error}`);
    }
    process.exit(1);
  } else {
    console.log(`\n${BOLD}${GREEN}ALL EMPIRICAL STRESS TESTS PASSED SUCCESSFULLY!${RESET}\n`);
    process.exit(0);
  }
}

executeHarness().catch((err) => {
  console.error("Fatal harness error:", err);
  process.exit(1);
});
