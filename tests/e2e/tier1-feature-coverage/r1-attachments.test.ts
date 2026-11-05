/**
 * Tier 1: Feature Coverage - R1: In-Chat File and Media Sharing
 * Validates baseline happy path for attachment uploads, preview metadata, progress, and standalone sending.
 */

import {
  assertEqual,
  assertTrue,
  assertContains,
  test,
  setTestContext,
  KaelixoTestEngine,
} from "../test-harness";

export function registerTier1R1Tests(engine: KaelixoTestEngine) {
  setTestContext(1, "R1: In-Chat File and Media Sharing");

  test("R1.1: Should upload image attachment to kaelixo-attachments bucket and generate public URL", async () => {
    const channel = engine.createChannel("general");
    const file = {
      name: "screenshot.png",
      size: 1024 * 150, // 150 KB
      type: "image/png",
    };

    const attachment = await engine.uploadAttachment(file, channel.id);
    assertEqual(attachment.name, "screenshot.png");
    assertEqual(attachment.size, 1024 * 150);
    assertEqual(attachment.type, "image/png");
    assertContains(attachment.url, "kaelixo-attachments");
    assertContains(attachment.storagePath, channel.id);
  });

  test("R1.2: Should upload PDF document and preserve file metadata for download card", async () => {
    const channel = engine.createChannel("project-specs");
    const file = {
      name: "Q4_Roadmap.pdf",
      size: 1024 * 1024 * 2.5, // 2.5 MB
      type: "application/pdf",
    };

    const attachment = await engine.uploadAttachment(file, channel.id);
    assertEqual(attachment.name, "Q4_Roadmap.pdf");
    assertEqual(attachment.size, 1024 * 1024 * 2.5);
    assertEqual(attachment.type, "application/pdf");
    assertTrue(attachment.url.startsWith("https://"));
  });

  test("R1.3: Should allow sending standalone attachment message without text content", async () => {
    const channel = engine.createChannel("design-review");
    const attachment = await engine.uploadAttachment(
      { name: "mockup.png", size: 500000, type: "image/png" },
      channel.id
    );

    const message = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-alice",
      senderName: "Alice Designer",
      content: "", // empty text content
      attachments: [attachment],
    });

    assertEqual(message.attachments?.length, 1);
    assertEqual(message.attachments?.[0].name, "mockup.png");
    assertEqual(message.content, "");
  });

  test("R1.4: Should support attaching multiple files to a single message", async () => {
    const channel = engine.createChannel("marketing");
    const att1 = await engine.uploadAttachment(
      { name: "banner1.jpg", size: 200000, type: "image/jpeg" },
      channel.id
    );
    const att2 = await engine.uploadAttachment(
      { name: "report.pdf", size: 800000, type: "application/pdf" },
      channel.id
    );

    const message = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-bob",
      senderName: "Bob Marketer",
      content: "Here are the campaign assets for review",
      attachments: [att1, att2],
    });

    assertEqual(message.attachments?.length, 2);
    assertEqual(message.attachments?.[0].id, att1.id);
    assertEqual(message.attachments?.[1].id, att2.id);
  });

  test("R1.5: Should trigger upload progress callback during upload sequence", async () => {
    const channel = engine.createChannel("media");
    const progressUpdates: number[] = [];

    await engine.uploadAttachment(
      { name: "video_clip.mp4", size: 1024 * 1024 * 5, type: "video/mp4" },
      channel.id,
      (percent) => {
        progressUpdates.push(percent);
      }
    );

    assertTrue(progressUpdates.length >= 3, "Expected multiple progress updates");
    assertEqual(progressUpdates[progressUpdates.length - 1], 100, "Final progress must reach 100%");
  });

  test("R1.6: Should ensure channel-scoped isolation in storage object path", async () => {
    const channelA = engine.createChannel("channel-a");
    const channelB = engine.createChannel("channel-b");

    const attA = await engine.uploadAttachment(
      { name: "doc.pdf", size: 1000, type: "application/pdf" },
      channelA.id
    );
    const attB = await engine.uploadAttachment(
      { name: "doc.pdf", size: 1000, type: "application/pdf" },
      channelB.id
    );

    assertTrue(attA.storagePath.startsWith(`${channelA.id}/`));
    assertTrue(attB.storagePath.startsWith(`${channelB.id}/`));
    assertTrue(attA.storagePath !== attB.storagePath, "Paths in different channels must be distinct");
  });
}
