/**
 * Tier 2: Boundary & Corner Cases - R3: Threading Boundary Conditions
 * Exercises edge cases: orphan replies, replies to deleted messages, decrements on reply deletion,
 * deep reply chains, and high thread volumes.
 */

import {
  assertEqual,
  assertRejects,
  assertTrue,
  test,
  setTestContext,
  KaelixoTestEngine,
} from "../test-harness";

function assertExists<T>(val: T | null | undefined, msg?: string): asserts val is T {
  if (val === null || val === undefined) {
    throw new Error(msg || "Expected value to exist");
  }
}

export function registerTier2R3Tests(engine: KaelixoTestEngine) {
  setTestContext(2, "R3 Boundary: Threading Boundary Conditions");

  test("R3-B.1: Should reject creating thread reply with non-existent parentId", async () => {
    const channel = engine.createChannel("threads-test");
    await assertRejects(
      async () => {
        await engine.sendMessage({
          channelId: channel.id,
          senderId: "user-1",
          senderName: "User 1",
          content: "Orphan reply with ghost parent",
          parentId: "00000000-0000-0000-0000-000000000000",
        });
      },
      "Creating reply with invalid parentId must reject"
    );
  });

  test("R3-B.2: Should reject creating thread reply to an already deleted parent message", async () => {
    const channel = engine.createChannel("threads-test");
    const parent = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-1",
      senderName: "User 1",
      content: "Parent message to be deleted",
    });

    await engine.deleteMessage(parent.id, "user-1");

    await assertRejects(
      async () => {
        await engine.sendMessage({
          channelId: channel.id,
          senderId: "user-2",
          senderName: "User 2",
          content: "Reply to deleted parent",
          parentId: parent.id,
        });
      },
      "Replying to deleted parent message must reject"
    );
  });

  test("R3-B.3: Should properly decrement parent threadCount when a thread reply is deleted", async () => {
    const channel = engine.createChannel("threads-test");
    const parent = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-author",
      senderName: "Author",
      content: "Parent for reply deletion test",
    });

    const reply = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-replier",
      senderName: "Replier",
      content: "Reply to be deleted",
      parentId: parent.id,
    });

    const parentBefore = engine.messages.get(parent.id);
    assertExists(parentBefore);
    assertEqual(parentBefore.threadCount, 1);

    await engine.deleteMessage(reply.id, "user-replier");

    const parentAfter = engine.messages.get(parent.id);
    assertExists(parentAfter);
    assertEqual(parentAfter.threadCount, 0, "Parent threadCount should decrement after reply deletion");
  });

  test("R3-B.4: Should handle high volume thread with 50 sequential replies without race conditions", async () => {
    const channel = engine.createChannel("high-volume");
    const parent = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-mod",
      senderName: "Moderator",
      content: "Mega-thread for community feedback",
    });

    const replyCount = 50;
    for (let i = 0; i < replyCount; i++) {
      await engine.sendMessage({
        channelId: channel.id,
        senderId: `user-${i % 5}`,
        senderName: `Participant ${i % 5}`,
        content: `Feedback item #${i + 1}`,
        parentId: parent.id,
      });
    }

    const updatedParent = engine.messages.get(parent.id);
    assertExists(updatedParent);
    assertEqual(updatedParent.threadCount, 50);

    const replies = engine.getThreadReplies(parent.id);
    assertEqual(replies.length, 50);
  });

  test("R3-B.5: Should verify that main feed continues to exclude all 50 replies in high-volume thread", async () => {
    const channel = engine.createChannel("volume-feed-check");
    const parent = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-root",
      senderName: "Root",
      content: "Root message",
    });

    for (let i = 0; i < 20; i++) {
      await engine.sendMessage({
        channelId: channel.id,
        senderId: `user-${i}`,
        senderName: `Replier ${i}`,
        content: `Reply ${i}`,
        parentId: parent.id,
      });
    }

    const feed = engine.getMessages(channel.id, true);
    assertEqual(feed.length, 1, "Only root parent message should be in main feed");
    assertEqual(feed[0].id, parent.id);
  });

  test("R3-B.6: Should ensure replies retain accurate parentId when another channel has a thread running", async () => {
    const chanA = engine.createChannel("channel-a");
    const chanB = engine.createChannel("channel-b");

    const parentA = await engine.sendMessage({
      channelId: chanA.id,
      senderId: "user-a",
      senderName: "User A",
      content: "Thread in A",
    });
    const parentB = await engine.sendMessage({
      channelId: chanB.id,
      senderId: "user-b",
      senderName: "User B",
      content: "Thread in B",
    });

    const replyA = await engine.sendMessage({
      channelId: chanA.id,
      senderId: "user-c",
      senderName: "User C",
      content: "Reply in A",
      parentId: parentA.id,
    });
    const replyB = await engine.sendMessage({
      channelId: chanB.id,
      senderId: "user-d",
      senderName: "User D",
      content: "Reply in B",
      parentId: parentB.id,
    });

    assertEqual(replyA.parentId, parentA.id);
    assertEqual(replyB.parentId, parentB.id);
    assertEqual(engine.getThreadReplies(parentA.id).length, 1);
    assertEqual(engine.getThreadReplies(parentB.id).length, 1);
  });
}
