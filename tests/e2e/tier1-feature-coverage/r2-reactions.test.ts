/**
 * Tier 1: Feature Coverage - R2: Interactive Emoji Picker and Real-Time Reactions
 * Validates baseline happy path for adding, removing, and aggregating emoji reactions on messages.
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
  test,
  setTestContext,
  KaelixoTestEngine,
} from "../test-harness";

export function registerTier1R2Tests(engine: KaelixoTestEngine) {
  setTestContext(1, "R2: Interactive Emoji Picker and Real-Time Reactions");

  test("R2.1: Should add emoji reaction to a message and record aggregate count of 1", async () => {
    const channel = engine.createChannel("general");
    const message = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-alice",
      senderName: "Alice",
      content: "Great job on the release!",
    });

    const res = await engine.toggleReaction(message.id, "user-bob", "Bob", "🎉");
    assertTrue(res.added, "Expected reaction to be added");
    assertEqual(res.summary.count, 1);
    assertEqual(res.summary.users[0], "user-bob");

    const updated = engine.messages.get(message.id);
    assertEqual(updated?.reactions?.["🎉"]?.count, 1);
    assertEqual(updated?.reactions?.["🎉"]?.users[0], "user-bob");
  });

  test("R2.2: Should aggregate multiple distinct users reacting with the same emoji", async () => {
    const channel = engine.createChannel("engineering");
    const message = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-lead",
      senderName: "Dev Lead",
      content: "All tests are passing in CI",
    });

    await engine.toggleReaction(message.id, "user-1", "Engineer 1", "🚀");
    await engine.toggleReaction(message.id, "user-2", "Engineer 2", "🚀");
    const res = await engine.toggleReaction(message.id, "user-3", "Engineer 3", "🚀");

    assertTrue(res.added);
    assertEqual(res.summary.count, 3);
    assertEqual(res.summary.users.length, 3);
  });

  test("R2.3: Should remove reaction when user clicks an already reacted emoji (toggle off)", async () => {
    const channel = engine.createChannel("announcements");
    const message = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-admin",
      senderName: "Admin",
      content: "Town hall tomorrow at 10 AM",
    });

    // Bob adds reaction
    await engine.toggleReaction(message.id, "user-bob", "Bob", "👍");
    // Bob clicks again to remove reaction
    const res = await engine.toggleReaction(message.id, "user-bob", "Bob", "👍");

    assertFalse(res.added, "Reaction toggle should remove existing reaction");
    assertEqual(res.summary.count, 0);

    const updated = engine.messages.get(message.id);
    assertFalse("👍" in (updated?.reactions || {}));
  });

  test("R2.4: Should decrement count and retain remaining users when one user unreacts", async () => {
    const channel = engine.createChannel("watercooler");
    const message = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-alice",
      senderName: "Alice",
      content: "Coffee break anyone?",
    });

    await engine.toggleReaction(message.id, "user-bob", "Bob", "☕");
    await engine.toggleReaction(message.id, "user-carol", "Carol", "☕");

    // Bob toggles off
    const res = await engine.toggleReaction(message.id, "user-bob", "Bob", "☕");
    assertFalse(res.added);
    assertEqual(res.summary.count, 1);
    assertEqual(res.summary.users[0], "user-carol");
  });

  test("R2.5: Should support multiple distinct emoji reactions on the same message", async () => {
    const channel = engine.createChannel("design");
    const message = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-designer",
      senderName: "Designer",
      content: "New logo concepts ready for feedback",
    });

    await engine.toggleReaction(message.id, "user-alice", "Alice", "❤️");
    await engine.toggleReaction(message.id, "user-bob", "Bob", "🔥");
    await engine.toggleReaction(message.id, "user-carol", "Carol", "👏");

    const updated = engine.messages.get(message.id);
    assertEqual(updated?.reactions?.["❤️"]?.count, 1);
    assertEqual(updated?.reactions?.["🔥"]?.count, 1);
    assertEqual(updated?.reactions?.["👏"]?.count, 1);
  });

  test("R2.6: Should support emoji reactions on direct messages", async () => {
    const dmChannel = await engine.getOrCreateDmChannel("user-alice", "user-bob", "Bob");
    const dmMessage = await engine.sendMessage({
      channelId: dmChannel.id,
      senderId: "user-alice",
      senderName: "Alice",
      content: "Hey Bob, did you review the PR?",
    });

    const res = await engine.toggleReaction(dmMessage.id, "user-bob", "Bob", "👀");
    assertTrue(res.added);
    assertEqual(res.summary.count, 1);
    assertEqual(res.summary.users[0], "user-bob");
  });
}
