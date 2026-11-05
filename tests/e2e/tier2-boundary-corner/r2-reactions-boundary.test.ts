/**
 * Tier 2: Boundary & Corner Cases - R2: Emoji Reactions Boundary Conditions
 * Exercises edge cases: complex multibyte unicode emojis, blank emojis, non-existent messages,
 * deleted messages, and rapid toggling.
 */

import {
  assertEqual,
  assertRejects,
  assertTrue,
  assertFalse,
  test,
  setTestContext,
  KaelixoTestEngine,
} from "../test-harness";

export function registerTier2R2Tests(engine: KaelixoTestEngine) {
  setTestContext(2, "R2 Boundary: Emoji Reactions Boundary Conditions");

  test("R2-B.1: Should correctly handle complex multibyte unicode emojis (family, flags, skin tones)", async () => {
    const channel = engine.createChannel("unicode-test");
    const message = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-1",
      senderName: "User 1",
      content: "Testing unicode reaction support",
    });

    const complexEmojis = [
      "👨‍👩‍👧‍👦", // family emoji with zero-width joiners
      "👍🏽",     // emoji with skin tone modifier
      "🏳️‍🌈",     // rainbow flag sequence
      "🔥",      // standard surrogate pair
    ];

    for (const emoji of complexEmojis) {
      const res = await engine.toggleReaction(message.id, "user-tester", "Tester", emoji);
      assertTrue(res.added);
      assertEqual(res.summary.count, 1);
      assertEqual(res.summary.users[0], "user-tester");
    }

    const updated = engine.messages.get(message.id);
    for (const emoji of complexEmojis) {
      assertTrue(emoji in (updated?.reactions || {}));
    }
  });

  test("R2-B.2: Should reject empty or whitespace-only emoji reactions", async () => {
    const channel = engine.createChannel("validation-test");
    const message = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-1",
      senderName: "User 1",
      content: "Valid message content",
    });

    await assertRejects(
      async () => {
        await engine.toggleReaction(message.id, "user-1", "User 1", "");
      },
      "Empty emoji string should be rejected"
    );

    await assertRejects(
      async () => {
        await engine.toggleReaction(message.id, "user-1", "User 1", "   ");
      },
      "Whitespace-only emoji should be rejected"
    );
  });

  test("R2-B.3: Should reject reaction on non-existent message ID", async () => {
    await assertRejects(
      async () => {
        await engine.toggleReaction("non-existent-msg-id", "user-1", "User 1", "👍");
      },
      "Reaction to non-existent message should throw error"
    );
  });

  test("R2-B.4: Should reject reaction on an already deleted message", async () => {
    const channel = engine.createChannel("deletion-test");
    const message = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-1",
      senderName: "User 1",
      content: "Message to be deleted",
    });

    await engine.deleteMessage(message.id, "user-1");

    await assertRejects(
      async () => {
        await engine.toggleReaction(message.id, "user-2", "User 2", "👍");
      },
      "Reacting to deleted message must be rejected"
    );
  });

  test("R2-B.5: Should maintain accurate counts across rapid consecutive toggles by same user", async () => {
    const channel = engine.createChannel("stress-test");
    const message = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-author",
      senderName: "Author",
      content: "Rapid reaction toggle test",
    });

    // 10 alternating toggles: Add, Remove, Add, Remove, ...
    for (let i = 0; i < 10; i++) {
      const res = await engine.toggleReaction(message.id, "user-clicker", "Clicker", "🎉");
      const shouldBeAdded = i % 2 === 0;
      assertEqual(res.added, shouldBeAdded);
      assertEqual(res.summary.count, shouldBeAdded ? 1 : 0);
    }

    const finalMsg = engine.messages.get(message.id);
    assertFalse("🎉" in (finalMsg?.reactions || {}));
  });

  test("R2-B.6: Should prevent count from ever becoming negative on edge-case unreacts", async () => {
    const channel = engine.createChannel("edge-case");
    const message = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-1",
      senderName: "User 1",
      content: "Testing non-negative bounds",
    });

    // Directly test toggle with non-reacted user
    const res = await engine.toggleReaction(message.id, "user-ghost", "Ghost", "👻");
    assertTrue(res.summary.count >= 0);
    assertEqual(res.summary.count, 1);
  });
}
