/**
 * Tier 1: Feature Coverage - R4: Search, Pinned Messages, and Message Management
 * Validates baseline happy path for cross-channel search, pinning, unpinning, editing, and deleting.
 */

import {
  assertEqual,
  assertTrue,
  assertFalse,
  assertContains,
  test,
  setTestContext,
  KaelixoTestEngine,
} from "../test-harness";

function assertExists<T>(val: T | null | undefined, msg?: string): asserts val is T {
  if (val === null || val === undefined) {
    throw new Error(msg || "Expected value to exist");
  }
}

export function registerTier1R4Tests(engine: KaelixoTestEngine) {
  setTestContext(1, "R4: Search, Pinned Messages, and Message Management");

  test("R4.1: Should perform cross-channel and DM text search returning matching messages", async () => {
    const chan1 = engine.createChannel("dev");
    const chan2 = engine.createChannel("ops");
    const dm = await engine.getOrCreateDmChannel("user-alice", "user-bob", "Bob");

    await engine.sendMessage({
      channelId: chan1.id,
      senderId: "user-alice",
      senderName: "Alice",
      content: "Deploying Kubernetes cluster 1.30",
    });
    await engine.sendMessage({
      channelId: chan2.id,
      senderId: "user-sre",
      senderName: "SRE",
      content: "Cluster monitoring setup complete",
    });
    await engine.sendMessage({
      channelId: dm.id,
      senderId: "user-bob",
      senderName: "Bob",
      content: "Did the cluster deployment succeed?",
    });

    const results = engine.searchMessages("cluster");
    assertEqual(results.length, 3, "Expected 3 search results across channels and DMs");
  });

  test("R4.2: Should pin message in a channel and record pin metadata", async () => {
    const channel = engine.createChannel("announcements");
    const message = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-alice",
      senderName: "Alice Lead",
      content: "Welcome to the new workspace! Please read guidelines.",
    });

    const pinnedMsg = await engine.pinMessage(message.id, "user-alice", "Alice Lead");
    assertTrue(pinnedMsg.isPinned === true);
    assertEqual(pinnedMsg.pinnedByName, "Alice Lead");
    assertExists(pinnedMsg.pinnedAt);
  });

  test("R4.3: Should unpin previously pinned message and clear pin state", async () => {
    const channel = engine.createChannel("releases");
    const message = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-rel",
      senderName: "Release Bot",
      content: "v1.2.0 is currently rolling out",
    });

    await engine.pinMessage(message.id, "user-rel", "Release Bot");
    const unpinned = await engine.unpinMessage(message.id);

    assertFalse(unpinned.isPinned === true);
    assertEqual(unpinned.pinnedAt, null);
    assertEqual(unpinned.pinnedByName, null);
  });

  test("R4.4: Should fetch all pinned messages for a channel in reverse chronological order", async () => {
    const channel = engine.createChannel("onboarding");
    const m1 = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-hr",
      senderName: "HR",
      content: "First pinned rule",
    });
    const m2 = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-hr",
      senderName: "HR",
      content: "Second pinned rule",
    });

    await engine.pinMessage(m1.id, "user-hr", "HR");
    // Small delay to ensure timestamp progression
    await new Promise((resolve) => setTimeout(resolve, 5));
    await engine.pinMessage(m2.id, "user-hr", "HR");

    const pinnedList = engine.getPinnedMessages(channel.id);
    assertEqual(pinnedList.length, 2);
    assertEqual(pinnedList[0].id, m2.id, "Newest pinned message should appear first");
    assertEqual(pinnedList[1].id, m1.id);
  });

  test("R4.5: Should allow author to edit sent message and apply (edited) tag", async () => {
    const channel = engine.createChannel("qa");
    const message = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-alice",
      senderName: "Alice",
      content: "Bug found in auth flow: error 400",
    });

    const updated = await engine.editMessage(
      message.id,
      "user-alice",
      "Bug found in auth flow: error 401 Unauthorized"
    );

    assertTrue(updated.isEdited === true);
    assertExists(updated.editedAt);
    assertEqual(updated.content, "Bug found in auth flow: error 401 Unauthorized");
  });

  test("R4.6: Should allow author to delete message and replace content with tombstone", async () => {
    const channel = engine.createChannel("general");
    const message = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-bob",
      senderName: "Bob",
      content: "Accidental sensitive message snippet",
    });

    const result = await engine.deleteMessage(message.id, "user-bob");
    assertTrue(result.success);
    assertTrue(result.tombstone.isDeleted === true);
    assertContains(result.tombstone.content, "deleted");
    assertExists(result.tombstone.deletedAt);
  });
}
