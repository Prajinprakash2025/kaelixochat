/**
 * Tier 1: Feature Coverage - R3: Thread Replies Side Panel
 * Validates baseline happy path for creating thread replies, updating parent indicators,
 * and maintaining feed segregation.
 */

import {
  assertEqual,
  assertTrue,
  assertNotNull,
  test,
  setTestContext,
  KaelixoTestEngine,
} from "../test-harness";

// Small helper for non-null checks
function assertExists<T>(val: T | null | undefined, msg?: string): asserts val is T {
  if (val === null || val === undefined) {
    throw new Error(msg || "Expected value to exist");
  }
}

export function registerTier1R3Tests(engine: KaelixoTestEngine) {
  setTestContext(1, "R3: Thread Replies Side Panel");

  test("R3.1: Should create thread reply referencing parentId", async () => {
    const channel = engine.createChannel("dev-discuss");
    const parent = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-alice",
      senderName: "Alice",
      content: "Let's discuss the API v2 migration strategy",
    });

    const reply = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-bob",
      senderName: "Bob",
      content: "We should start with backwards-compatible route aliases",
      parentId: parent.id,
    });

    assertEqual(reply.parentId, parent.id);
    assertEqual(reply.channelId, channel.id);
  });

  test("R3.2: Should automatically increment parent threadCount and set lastReplyAt", async () => {
    const channel = engine.createChannel("questions");
    const parent = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-carol",
      senderName: "Carol",
      content: "What is the timeline for the mobile release?",
    });

    assertEqual(parent.threadCount, 0);
    assertEqual(parent.lastReplyAt, null);

    const reply = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-lead",
      senderName: "Product Lead",
      content: "Targeting end of month for internal beta testing",
      parentId: parent.id,
    });

    const updatedParent = engine.messages.get(parent.id);
    assertExists(updatedParent);
    assertEqual(updatedParent.threadCount, 1);
    assertExists(updatedParent.lastReplyAt);
    assertTrue(new Date(updatedParent.lastReplyAt).getTime() >= new Date(reply.createdAt).getTime());
  });

  test("R3.3: Should segregate thread replies from main channel feed queries", async () => {
    const channel = engine.createChannel("standup");
    const root1 = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-1",
      senderName: "User 1",
      content: "Root message 1",
    });
    const root2 = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-2",
      senderName: "User 2",
      content: "Root message 2",
    });

    // Send replies to root1
    await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-3",
      senderName: "User 3",
      content: "Reply to root 1",
      parentId: root1.id,
    });

    const mainFeedMessages = engine.getMessages(channel.id, true);
    assertEqual(mainFeedMessages.length, 2, "Main feed should only contain root messages");
    assertEqual(mainFeedMessages[0].id, root1.id);
    assertEqual(mainFeedMessages[1].id, root2.id);
  });

  test("R3.4: Should retrieve thread replies in strict chronological order for side panel", async () => {
    const channel = engine.createChannel("debugging");
    const parent = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-dev",
      senderName: "Dev",
      content: "Investigating 500 errors on /api/auth",
    });

    const reply1 = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-sre",
      senderName: "SRE",
      content: "Step 1: Check Redis connection pool",
      parentId: parent.id,
    });
    const reply2 = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-db",
      senderName: "DBA",
      content: "Step 2: Check Postgres connection limit",
      parentId: parent.id,
    });

    const replies = engine.getThreadReplies(parent.id);
    assertEqual(replies.length, 2);
    assertEqual(replies[0].id, reply1.id);
    assertEqual(replies[1].id, reply2.id);
    assertTrue(
      new Date(replies[0].createdAt).getTime() <= new Date(replies[1].createdAt).getTime()
    );
  });

  test("R3.5: Should accumulate reply counts accurately for multiple participants in a thread", async () => {
    const channel = engine.createChannel("brainstorming");
    const parent = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-lead",
      senderName: "Lead",
      content: "Ideas for the company hackathon theme?",
    });

    for (let i = 1; i <= 5; i++) {
      await engine.sendMessage({
        channelId: channel.id,
        senderId: `user-${i}`,
        senderName: `Hacker ${i}`,
        content: `Idea #${i}: Autonomous agents on edge`,
        parentId: parent.id,
      });
    }

    const updatedParent = engine.messages.get(parent.id);
    assertExists(updatedParent);
    assertEqual(updatedParent.threadCount, 5);
  });

  test("R3.6: Should support thread replies inside direct message conversations", async () => {
    const dm = await engine.getOrCreateDmChannel("user-alice", "user-bob", "Bob");
    const parent = await engine.sendMessage({
      channelId: dm.id,
      senderId: "user-alice",
      senderName: "Alice",
      content: "Can you send the contract draft?",
    });

    const reply = await engine.sendMessage({
      channelId: dm.id,
      senderId: "user-bob",
      senderName: "Bob",
      content: "Attached in the email, let me know if you need changes",
      parentId: parent.id,
    });

    const dmFeed = engine.getMessages(dm.id, true);
    assertEqual(dmFeed.length, 1);
    assertEqual(dmFeed[0].threadCount, 1);

    const dmReplies = engine.getThreadReplies(parent.id);
    assertEqual(dmReplies.length, 1);
    assertEqual(dmReplies[0].id, reply.id);
  });
}
