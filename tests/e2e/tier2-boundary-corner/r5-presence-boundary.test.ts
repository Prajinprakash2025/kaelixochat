/**
 * Tier 2: Boundary & Corner Cases - R5: Presence & Notifications Boundary Conditions
 * Exercises edge cases: self-mentions, non-existent mentions, multi-mentions, duplicate mentions,
 * and rapid presence state transitions.
 */

import {
  assertEqual,
  assertTrue,
  test,
  setTestContext,
  KaelixoTestEngine,
} from "../test-harness";

export function registerTier2R5Tests(engine: KaelixoTestEngine) {
  setTestContext(2, "R5 Boundary: Presence & Notifications Boundary Conditions");

  test("R5-B.1: Should suppress self-mention notification when author mentions themselves", async () => {
    engine.setUserPresence("user-alice", "Alice", "online");
    const channel = engine.createChannel("self-mention");

    await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-alice",
      senderName: "Alice",
      content: "Note to self: @Alice remember to update documentation",
    });

    const aliceNotifs = engine.getNotifications("user-alice");
    assertEqual(aliceNotifs.length, 0, "Author should not receive notification for mentioning themselves");
  });

  test("R5-B.2: Should safely ignore mention of non-existent user without error", async () => {
    engine.setUserPresence("user-alice", "Alice", "online");
    const channel = engine.createChannel("phantom-mention");

    // Mention user who has never joined or set presence
    await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-alice",
      senderName: "Alice",
      content: "Hello @NonExistentUser12345, are you there?",
    });

    // Should complete cleanly without crashing
    const aliceNotifs = engine.getNotifications("user-alice");
    assertEqual(aliceNotifs.length, 0);
  });

  test("R5-B.3: Should deliver distinct notifications for multiple different users mentioned in one message", async () => {
    engine.setUserPresence("user-1", "Bob", "online");
    engine.setUserPresence("user-2", "Carol", "online");
    engine.setUserPresence("user-3", "Dave", "online");
    const channel = engine.createChannel("group-mention");

    await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-lead",
      senderName: "Lead",
      content: "P0 issue alert! Paging @Bob, @Carol, and @Dave immediately",
    });

    assertEqual(engine.getNotifications("user-1").length, 1);
    assertEqual(engine.getNotifications("user-2").length, 1);
    assertEqual(engine.getNotifications("user-3").length, 1);
  });

  test("R5-B.4: Should deduplicate multiple mentions of the same user in a single message", async () => {
    engine.setUserPresence("user-target", "TargetUser", "online");
    const channel = engine.createChannel("dup-mention");

    await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-sender",
      senderName: "Sender",
      content: "Hey @TargetUser, did you see this? @TargetUser please respond!",
    });

    const notifs = engine.getNotifications("user-target");
    assertEqual(notifs.length, 1, "Duplicate mentions in one message must only generate one notification");
  });

  test("R5-B.5: Should record last status accurately during rapid presence state transitions", async () => {
    const transitions: Array<"online" | "away" | "in_call" | "offline"> = [
      "online",
      "away",
      "in_call",
      "online",
      "away",
      "offline",
    ];

    for (const st of transitions) {
      engine.setUserPresence("user-flip", "FlipUser", st, `State is ${st}`);
    }

    const finalPresence = engine.getUserPresence("user-flip");
    assertEqual(finalPresence?.status, "offline");
    assertEqual(finalPresence?.statusText, "State is offline");
  });

  test("R5-B.6: Should not generate DM notification when sender messages themselves in DM channel", async () => {
    // Attempting to create DM channel with self should reject
    let threw = false;
    try {
      await engine.getOrCreateDmChannel("user-self", "user-self", "Self");
    } catch {
      threw = true;
    }
    assertTrue(threw, "Self-DM channel creation must be guarded");
  });
}
