/**
 * Tier 2: Boundary & Corner Cases - R4: Message Management Boundary Conditions
 * Exercises edge cases: regex/SQL metacharacters in search queries, unauthorized edit/delete,
 * double deletion, blank edits, and pinning deleted messages.
 */

import {
  assertEqual,
  assertRejects,
  assertTrue,
  test,
  setTestContext,
  KaelixoTestEngine,
} from "../test-harness";

export function registerTier2R4Tests(engine: KaelixoTestEngine) {
  setTestContext(2, "R4 Boundary: Message Management Boundary Conditions");

  test("R4-B.1: Should safely handle search queries containing regex and wildcard meta-characters", async () => {
    const channel = engine.createChannel("search-edge");
    await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-1",
      senderName: "User 1",
      content: "Regex special string: [test].*+?^${}()|\\",
    });
    await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-2",
      senderName: "User 2",
      content: "SQL special string: SELECT * FROM users WHERE col LIKE '%_test%'",
    });

    // Substring queries containing regex tokens should match literally
    const r1 = engine.searchMessages("[test]");
    assertEqual(r1.length, 1);

    const r2 = engine.searchMessages("%_test%");
    assertEqual(r2.length, 1);

    const r3 = engine.searchMessages("*");
    assertTrue(r3.length >= 2);
  });

  test("R4-B.2: Should reject edit attempt by a non-author (authorization guard)", async () => {
    const channel = engine.createChannel("auth-test");
    const message = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-alice",
      senderName: "Alice",
      content: "Alice original text",
    });

    await assertRejects(
      async () => {
        await engine.editMessage(message.id, "user-bob", "Bob tampering with text");
      },
      "Non-author edit attempt must be rejected"
    );

    const checkMsg = engine.messages.get(message.id);
    assertEqual(checkMsg?.content, "Alice original text");
  });

  test("R4-B.3: Should reject delete attempt by a non-author (authorization guard)", async () => {
    const channel = engine.createChannel("auth-test");
    const message = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-alice",
      senderName: "Alice",
      content: "Alice original message to protect",
    });

    await assertRejects(
      async () => {
        await engine.deleteMessage(message.id, "user-mallory");
      },
      "Non-author delete attempt must be rejected"
    );

    const checkMsg = engine.messages.get(message.id);
    assertEqual(checkMsg?.isDeleted, false);
  });

  test("R4-B.4: Should reject double-delete on an already deleted message", async () => {
    const channel = engine.createChannel("delete-edge");
    const message = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-author",
      senderName: "Author",
      content: "Message to delete once",
    });

    await engine.deleteMessage(message.id, "user-author");

    await assertRejects(
      async () => {
        await engine.deleteMessage(message.id, "user-author");
      },
      "Deleting an already deleted message must be rejected"
    );
  });

  test("R4-B.5: Should reject pinning an already deleted message", async () => {
    const channel = engine.createChannel("pin-edge");
    const message = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-author",
      senderName: "Author",
      content: "Message doomed for deletion",
    });

    await engine.deleteMessage(message.id, "user-author");

    await assertRejects(
      async () => {
        await engine.pinMessage(message.id, "user-admin", "Admin");
      },
      "Pinning a deleted message must be rejected"
    );
  });

  test("R4-B.6: Should reject editing message to empty/blank text if no attachments exist", async () => {
    const channel = engine.createChannel("edit-edge");
    const message = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-author",
      senderName: "Author",
      content: "Initial non-empty content",
    });

    await assertRejects(
      async () => {
        await engine.editMessage(message.id, "user-author", "   ");
      },
      "Editing message to blank content without attachments must be rejected"
    );
  });
}
