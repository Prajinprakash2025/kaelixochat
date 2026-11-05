/**
 * Tier 2: Boundary & Corner Cases - R1: Attachments Boundary Conditions
 * Exercises edge cases: zero-byte files, maximum size limits, path sanitization, and invalid inputs.
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

export function registerTier2R1Tests(engine: KaelixoTestEngine) {
  setTestContext(2, "R1 Boundary: Attachments Boundary Conditions");

  test("R1-B.1: Should reject zero-byte file upload", async () => {
    const channel = engine.createChannel("test-channel");
    await assertRejects(
      async () => {
        await engine.uploadAttachment(
          { name: "empty.txt", size: 0, type: "text/plain" },
          channel.id
        );
      },
      "Zero-byte file should be rejected"
    );
  });

  test("R1-B.2: Should reject file exceeding maximum allowed size threshold (50MB)", async () => {
    const channel = engine.createChannel("test-channel");
    const oversized = 50 * 1024 * 1024 + 1; // 50MB + 1 byte
    await assertRejects(
      async () => {
        await engine.uploadAttachment(
          { name: "huge_video.raw", size: oversized, type: "video/mp4" },
          channel.id
        );
      },
      "Oversized file should be rejected"
    );
  });

  test("R1-B.3: Should reject attachment with blank or empty filename", async () => {
    const channel = engine.createChannel("test-channel");
    await assertRejects(
      async () => {
        await engine.uploadAttachment(
          { name: "   ", size: 1024, type: "image/png" },
          channel.id
        );
      },
      "Blank filename should be rejected"
    );
  });

  test("R1-B.4: Should reject attachment with negative file size", async () => {
    const channel = engine.createChannel("test-channel");
    await assertRejects(
      async () => {
        await engine.uploadAttachment(
          { name: "corrupted.bin", size: -100, type: "application/octet-stream" },
          channel.id
        );
      },
      "Negative file size should be rejected"
    );
  });

  test("R1-B.5: Should sanitize dangerous characters and directory traversal tokens in filename", async () => {
    const channel = engine.createChannel("security-test");
    const dangerousName = "../../etc/shadow.png";

    const attachment = await engine.uploadAttachment(
      { name: dangerousName, size: 2048, type: "image/png" },
      channel.id
    );

    assertFalse(attachment.storagePath.includes(".."), "Storage path must not contain directory traversal tokens");
    assertTrue(attachment.storagePath.startsWith(`${channel.id}/`), "Storage path must be confined to channel folder");
  });

  test("R1-B.6: Should reject sending message with empty text and no attachments", async () => {
    const channel = engine.createChannel("empty-test");
    await assertRejects(
      async () => {
        await engine.sendMessage({
          channelId: channel.id,
          senderId: "user-1",
          senderName: "User 1",
          content: "   ", // whitespace only
          attachments: [],
        });
      },
      "Empty message with no attachments should be rejected"
    );
  });
}
