/**
 * Tier 1: Feature Coverage - R5: Member Presence and Notifications
 * Validates baseline happy path for real-time presence indicators and in-app notifications.
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
  test,
  setTestContext,
  KaelixoTestEngine,
} from "../test-harness";

export function registerTier1R5Tests(engine: KaelixoTestEngine) {
  setTestContext(1, "R5: Member Presence and Notifications");

  test("R5.1: Should set and retrieve member presence status", async () => {
    const presence = engine.setUserPresence("user-alice", "Alice", "online", "Working on sprint tasks");
    assertEqual(presence.userId, "user-alice");
    assertEqual(presence.status, "online");
    assertEqual(presence.statusText, "Working on sprint tasks");

    const retrieved = engine.getUserPresence("user-alice");
    assertEqual(retrieved?.status, "online");
  });

  test("R5.2: Should list active presence for all workspace members", async () => {
    engine.setUserPresence("user-1", "Alice", "online");
    engine.setUserPresence("user-2", "Bob", "away");
    engine.setUserPresence("user-3", "Carol", "offline");

    const allPresences = engine.getAllPresence();
    assertTrue(allPresences.length >= 3);
    const statuses = allPresences.map((p) => p.status);
    assertTrue(statuses.includes("online"));
    assertTrue(statuses.includes("away"));
    assertTrue(statuses.includes("offline"));
  });

  test("R5.3: Should generate in-app notification when a user is mentioned with @username", async () => {
    engine.setUserPresence("user-alice", "Alice", "online");
    engine.setUserPresence("user-bob", "Bob", "online");

    const channel = engine.createChannel("project-kickoff");
    await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-alice",
      senderName: "Alice",
      content: "Hey @Bob, please check the system architecture diagram",
    });

    const bobNotifs = engine.getNotifications("user-bob");
    assertEqual(bobNotifs.length, 1);
    assertEqual(bobNotifs[0].type, "mention");
    assertEqual(bobNotifs[0].senderName, "Alice");
    assertFalse(bobNotifs[0].isRead);
  });

  test("R5.4: Should generate direct message notification for DM recipient", async () => {
    engine.setUserPresence("user-alice", "Alice", "online");
    engine.setUserPresence("user-bob", "Bob", "online");

    const dm = await engine.getOrCreateDmChannel("user-alice", "user-bob", "Bob");
    await engine.sendMessage({
      channelId: dm.id,
      senderId: "user-alice",
      senderName: "Alice",
      content: "Hi Bob, are you free for a quick sync?",
    });

    const bobNotifs = engine.getNotifications("user-bob");
    const dmNotifs = bobNotifs.filter((n) => n.type === "dm");
    assertEqual(dmNotifs.length, 1);
    assertEqual(dmNotifs[0].senderId, "user-alice");
    assertEqual(dmNotifs[0].channelId, dm.id);
  });

  test("R5.5: Should generate thread reply notification for the parent message author", async () => {
    engine.setUserPresence("user-alice", "Alice", "online");
    engine.setUserPresence("user-bob", "Bob", "online");

    const channel = engine.createChannel("general");
    const parent = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-alice",
      senderName: "Alice",
      content: "Who has access to the staging cluster?",
    });

    await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-bob",
      senderName: "Bob",
      content: "I do, sending you the credentials now",
      parentId: parent.id,
    });

    const aliceNotifs = engine.getNotifications("user-alice");
    const threadNotifs = aliceNotifs.filter((n) => n.type === "thread_reply");
    assertEqual(threadNotifs.length, 1);
    assertEqual(threadNotifs[0].senderId, "user-bob");
  });

  test("R5.6: Should mark notification as read and decrement unread notification count", async () => {
    engine.setUserPresence("user-carol", "Carol", "online");
    const channel = engine.createChannel("alerts");

    await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-alice",
      senderName: "Alice",
      content: "Alert for @Carol: CPU threshold reached",
    });

    assertEqual(engine.getUnreadNotificationCount("user-carol"), 1);

    const notifs = engine.getNotifications("user-carol");
    engine.markNotificationRead(notifs[0].id);

    assertEqual(engine.getUnreadNotificationCount("user-carol"), 0);
  });
}
