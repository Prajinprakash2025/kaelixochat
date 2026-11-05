/**
 * Tier 3: Cross-Feature Combinations
 * Exercises pairwise feature interactions between attachments, reactions, threads,
 * search, pinning, editing/deleting, presence, and notifications.
 */

import {
  assertEqual,
  assertNotEqual,
  assertTrue,
  assertFalse,
  assertContains,
  assertRejects,
  test,
  setTestContext,
  KaelixoTestEngine,
} from "../test-harness";

function assertExists<T>(val: T | null | undefined, msg?: string): asserts val is T {
  if (val === null || val === undefined) {
    throw new Error(msg || "Expected value to exist");
  }
}

export function registerTier3Tests(engine: KaelixoTestEngine) {
  setTestContext(3, "Cross-Feature Combinations");

  test("3.1: Edit message with attachments: modifying text preserves attached files", async () => {
    const channel = engine.createChannel("project-review");
    const attachment = await engine.uploadAttachment(
      { name: "architecture_diagram.png", size: 1024 * 300, type: "image/png" },
      channel.id
    );

    const message = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-architect",
      senderName: "Architect",
      content: "Draft v1 of system architecture",
      attachments: [attachment],
    });

    assertEqual(message.attachments?.length, 1);
    assertEqual(message.attachments?.[0].name, "architecture_diagram.png");

    // Author edits message text
    const edited = await engine.editMessage(
      message.id,
      "user-architect",
      "Final v2 of system architecture (approved)"
    );

    assertTrue(edited.isEdited === true);
    assertEqual(edited.content, "Final v2 of system architecture (approved)");
    // Attachments must be preserved
    assertEqual(edited.attachments?.length, 1);
    assertEqual(edited.attachments?.[0].id, attachment.id);
  });

  test("3.2: Reactions on thread replies: reactions stay isolated to child reply and do not affect parent", async () => {
    const channel = engine.createChannel("dev-threads");
    const parent = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-parent",
      senderName: "Parent Author",
      content: "What database should we use for caching?",
    });

    const reply1 = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-child1",
      senderName: "Child 1",
      content: "Redis is standard and fast",
      parentId: parent.id,
    });

    const reply2 = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-child2",
      senderName: "Child 2",
      content: "Memcached could also work",
      parentId: parent.id,
    });

    // React with 👍 to reply 1
    await engine.toggleReaction(reply1.id, "user-voter", "Voter", "👍");
    // React with 🚀 to reply 2
    await engine.toggleReaction(reply2.id, "user-voter", "Voter", "🚀");

    const updatedParent = engine.messages.get(parent.id);
    const updatedReply1 = engine.messages.get(reply1.id);
    const updatedReply2 = engine.messages.get(reply2.id);

    // Parent should have NO reactions
    assertEqual(Object.keys(updatedParent?.reactions || {}).length, 0);
    // Reply 1 has only 👍
    assertEqual(updatedReply1?.reactions?.["👍"]?.count, 1);
    assertFalse("🚀" in (updatedReply1?.reactions || {}));
    // Reply 2 has only 🚀
    assertEqual(updatedReply2?.reactions?.["🚀"]?.count, 1);
    assertFalse("👍" in (updatedReply2?.reactions || {}));
  });

  test("3.3: Cross-channel search finds pinned messages and thread replies with accurate flags", async () => {
    const channel1 = engine.createChannel("frontend");
    const channel2 = engine.createChannel("backend");

    const pinnedMsg = await engine.sendMessage({
      channelId: channel1.id,
      senderId: "user-lead",
      senderName: "Lead",
      content: "CRITICAL: Security patch rollout scheduled tonight",
    });
    await engine.pinMessage(pinnedMsg.id, "user-lead", "Lead");

    const threadParent = await engine.sendMessage({
      channelId: channel2.id,
      senderId: "user-dev",
      senderName: "Dev",
      content: "Security patch testing",
    });
    const threadReply = await engine.sendMessage({
      channelId: channel2.id,
      senderId: "user-tester",
      senderName: "Tester",
      content: "Security patch verified in staging environment",
      parentId: threadParent.id,
    });

    // Search query "Security patch"
    const results = engine.searchMessages("Security patch");
    assertEqual(results.length, 3);

    // Verify pinned message in search results has isPinned = true
    const foundPinned = results.find((m) => m.id === pinnedMsg.id);
    assertExists(foundPinned);
    assertTrue(foundPinned.isPinned === true);

    // Verify thread reply in search results has parentId set
    const foundReply = results.find((m) => m.id === threadReply.id);
    assertExists(foundReply);
    assertEqual(foundReply.parentId, threadParent.id);
  });

  test("3.4: Notifications on thread replies: notifies parent message author and mentions inside thread", async () => {
    engine.setUserPresence("user-parent", "ParentAuthor", "online");
    engine.setUserPresence("user-replier", "Replier", "online");
    engine.setUserPresence("user-mentioned", "MentionedDev", "online");

    const channel = engine.createChannel("incident-response");
    const parent = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-parent",
      senderName: "ParentAuthor",
      content: "Investigating spike in 504 gateway timeouts",
    });

    // Replier posts reply mentioning MentionedDev
    await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-replier",
      senderName: "Replier",
      content: "Root cause found. @MentionedDev can you verify the ingress controller?",
      parentId: parent.id,
    });

    // Parent author should get thread_reply notification
    const parentNotifs = engine.getNotifications("user-parent");
    assertTrue(parentNotifs.some((n) => n.type === "thread_reply"));

    // Mentioned user should get mention notification
    const mentionedNotifs = engine.getNotifications("user-mentioned");
    assertTrue(mentionedNotifs.some((n) => n.type === "mention"));
  });

  test("3.5: Deleting parent message with active reactions, pins, and thread replies", async () => {
    const channel = engine.createChannel("cleanup-test");
    const parent = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-author",
      senderName: "Author",
      content: "Parent message to be deleted with reactions and pins",
    });

    // Add reactions and pin
    await engine.toggleReaction(parent.id, "user-bob", "Bob", "👍");
    await engine.pinMessage(parent.id, "user-admin", "Admin");

    // Add thread reply
    const reply = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-bob",
      senderName: "Bob",
      content: "Thread reply to parent",
      parentId: parent.id,
    });

    // Author deletes parent message
    await engine.deleteMessage(parent.id, "user-author");

    const tombstone = engine.messages.get(parent.id);
    assertExists(tombstone);
    assertTrue(tombstone.isDeleted === true);
    assertFalse(tombstone.isPinned === true, "Pinned state must be cleared on deletion");
    assertEqual(Object.keys(tombstone.reactions || {}).length, 0, "Reactions must be cleared on deletion");

    // Attempting to add a new reply to deleted parent must be rejected
    await assertRejects(
      async () => {
        await engine.sendMessage({
          channelId: channel.id,
          senderId: "user-carol",
          senderName: "Carol",
          content: "Trying to reply to tombstone",
          parentId: parent.id,
        });
      },
      "Replying to deleted parent message must reject"
    );
  });

  test("3.6: Standalone file attachment inside thread reply with emoji reactions", async () => {
    const channel = engine.createChannel("design-feedback");
    const parent = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-pm",
      senderName: "PM",
      content: "Please attach revised banner designs here",
    });

    const file = await engine.uploadAttachment(
      { name: "banner_revised_v2.png", size: 1024 * 500, type: "image/png" },
      channel.id
    );

    // Reply containing only the attachment and empty text
    const reply = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-designer",
      senderName: "Designer",
      content: "",
      parentId: parent.id,
      attachments: [file],
    });

    assertEqual(reply.attachments?.length, 1);
    assertEqual(reply.attachments?.[0].name, "banner_revised_v2.png");
    assertEqual(reply.parentId, parent.id);

    // Team reacts to the attached design
    await engine.toggleReaction(reply.id, "user-pm", "PM", "❤️");
    await engine.toggleReaction(reply.id, "user-lead", "Lead", "🔥");

    const updatedReply = engine.messages.get(reply.id);
    assertEqual(updatedReply?.reactions?.["❤️"]?.count, 1);
    assertEqual(updatedReply?.reactions?.["🔥"]?.count, 1);

    // Parent indicators updated
    const updatedParent = engine.messages.get(parent.id);
    assertEqual(updatedParent?.threadCount, 1);
  });
}
