/**
 * Tier 4: Real-World Scenarios
 * Simulates end-to-end, multi-user, multi-step complete user journeys and workflows.
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

export function registerTier4Tests(engine: KaelixoTestEngine) {
  setTestContext(4, "Real-World Scenarios");

  test("Scenario 4.1: Team Channel Onboarding Workflow", async () => {
    // 1. Setup channel and users
    const channel = engine.createChannel("new-hires", false, "Onboarding discussion and Q&A");
    engine.setUserPresence("user-mentor", "Sarah Mentor", "online", "Available for questions");
    engine.setUserPresence("user-junior", "Alex Junior", "online", "First day at Kaelixo!");

    // 2. Mentor uploads welcome guide PDF to kaelixo-attachments
    const guidePdf = await engine.uploadAttachment(
      {
        name: "Kaelixo_Employee_Handbook_2026.pdf",
        size: 1024 * 1024 * 3, // 3MB
        type: "application/pdf",
      },
      channel.id
    );

    // 3. Mentor posts welcome message with attachment and @Alex mention
    const welcomeMsg = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-mentor",
      senderName: "Sarah Mentor",
      content: "Welcome to the team @AlexJunior! Please review the attached handbook.",
      attachments: [guidePdf],
    });

    // 4. Pin the handbook message to channel
    await engine.pinMessage(welcomeMsg.id, "user-mentor", "Sarah Mentor");

    // 5. Junior receives mention notification
    const alexNotifs = engine.getNotifications("user-junior");
    assertTrue(alexNotifs.some((n) => n.type === "mention"));

    // 6. Junior reacts with 🎉 to welcome message
    await engine.toggleReaction(welcomeMsg.id, "user-junior", "Alex Junior", "🎉");

    // 7. Junior asks a question in a thread reply
    const q1 = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-junior",
      senderName: "Alex Junior",
      content: "Thanks Sarah! Where can I request my AWS sandbox credentials?",
      parentId: welcomeMsg.id,
    });

    // 8. Mentor replies in the thread
    await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-mentor",
      senderName: "Sarah Mentor",
      content: "You can submit an IT ticket on the portal, I'll approve it right away.",
      parentId: welcomeMsg.id,
    });

    // 9. Verify channel state
    const mainFeed = engine.getMessages(channel.id, true);
    assertEqual(mainFeed.length, 1, "Main feed should only display root welcome message");
    assertEqual(mainFeed[0].threadCount, 2);
    assertTrue(mainFeed[0].isPinned === true);
    assertEqual(mainFeed[0].reactions?.["🎉"]?.count, 1);

    const pinnedDrawer = engine.getPinnedMessages(channel.id);
    assertEqual(pinnedDrawer.length, 1);
    assertEqual(pinnedDrawer[0].id, welcomeMsg.id);

    const threadReplies = engine.getThreadReplies(welcomeMsg.id);
    assertEqual(threadReplies.length, 2);
    assertEqual(threadReplies[0].id, q1.id);
  });

  test("Scenario 4.2: Incident Triage Workflow with Attachments, Pins, and Edits", async () => {
    // 1. Engineering team channel
    const channel = engine.createChannel("engineering-incidents");
    engine.setUserPresence("user-oncall", "Alice OnCall", "online");
    engine.setUserPresence("user-sre", "Bob SRE", "online");

    // 2. Incident alert posted and pinned
    const alertMsg = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-oncall",
      senderName: "Alice OnCall",
      content: "INCIDENT-402: Production database connections maxed out! Investigating now.",
    });
    await engine.pinMessage(alertMsg.id, "user-oncall", "Alice OnCall");

    // 3. SRE attaches log dump to thread reply
    const logFile = await engine.uploadAttachment(
      {
        name: "postgres_query_dump.log",
        size: 1024 * 512,
        type: "text/plain",
      },
      channel.id
    );

    const logReply = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-sre",
      senderName: "Bob SRE",
      content: "Found slow query holding locks. Query dump attached.",
      parentId: alertMsg.id,
      attachments: [logFile],
    });

    // 4. OnCall reacts with 👀 to indicate they are inspecting
    await engine.toggleReaction(logReply.id, "user-oncall", "Alice OnCall", "👀");

    // 5. SRE kills connection, fixes indexing, and posts resolution in thread
    const fixReply = await engine.sendMessage({
      channelId: channel.id,
      senderId: "user-sre",
      senderName: "Bob SRE",
      content: "Lock killed. Latency normal. Creating index now.",
      parentId: alertMsg.id,
    });

    // 6. OnCall edits root incident alert to indicate resolved status
    const resolvedMsg = await engine.editMessage(
      alertMsg.id,
      "user-oncall",
      "INCIDENT-402 [RESOLVED]: Connection pool normalized. Post-mortem scheduled."
    );
    assertTrue(resolvedMsg.isEdited === true);
    assertContains(resolvedMsg.content, "[RESOLVED]");

    // 7. Team celebrates in thread and unpins alert
    await engine.toggleReaction(fixReply.id, "user-oncall", "Alice OnCall", "🚀");
    await engine.unpinMessage(alertMsg.id);

    // 8. Assert final state
    const pinnedAfter = engine.getPinnedMessages(channel.id);
    assertEqual(pinnedAfter.length, 0);

    const threadReplies = engine.getThreadReplies(alertMsg.id);
    assertEqual(threadReplies.length, 2);
    assertEqual(threadReplies[0].attachments?.[0].name, "postgres_query_dump.log");
  });

  test("Scenario 4.3: Multi-User Direct Message Workflow with Reactions and File Sharing", async () => {
    // 1. Establish DM between Product Manager and UI Designer
    engine.setUserPresence("user-pm", "Paula PM", "online", "In roadmap meetings");
    engine.setUserPresence("user-designer", "David Designer", "online", "Figma mode");

    const dmChannel = await engine.getOrCreateDmChannel("user-pm", "user-designer", "David Designer");
    assertTrue(dmChannel.isDm === true);
    assertEqual(dmChannel.recipientId, "user-designer");

    // 2. PM sends direct message
    const msg1 = await engine.sendMessage({
      channelId: dmChannel.id,
      senderId: "user-pm",
      senderName: "Paula PM",
      content: "Hey David, could you export the mobile navigation specs?",
    });

    // Verify DM notification delivered to David
    const davidNotifs = engine.getNotifications("user-designer");
    assertTrue(davidNotifs.some((n) => n.type === "dm"));

    // 3. David uploads SVG mockup
    const mockupSvg = await engine.uploadAttachment(
      {
        name: "mobile_navigation_v3.svg",
        size: 45000,
        type: "image/svg+xml",
      },
      dmChannel.id
    );

    const msg2 = await engine.sendMessage({
      channelId: dmChannel.id,
      senderId: "user-designer",
      senderName: "David Designer",
      content: "Here are the exported specs with 48px touch targets.",
      attachments: [mockupSvg],
    });

    // 4. Paula reacts with ❤️ and 👍
    await engine.toggleReaction(msg2.id, "user-pm", "Paula PM", "❤️");
    await engine.toggleReaction(msg2.id, "user-pm", "Paula PM", "👍");

    // 5. David edits his message to include link to Figma
    await engine.editMessage(
      msg2.id,
      "user-designer",
      "Here are the exported specs with 48px touch targets. (Figma link: figma.com/file/123)"
    );

    // 6. Assert conversation state
    const dmFeed = engine.getMessages(dmChannel.id, true);
    assertEqual(dmFeed.length, 2);
    assertEqual(dmFeed[1].reactions?.["❤️"]?.count, 1);
    assertEqual(dmFeed[1].reactions?.["👍"]?.count, 1);
    assertTrue(dmFeed[1].isEdited === true);
    assertEqual(dmFeed[1].attachments?.[0].name, "mobile_navigation_v3.svg");
  });

  test("Scenario 4.4: Cross-Workspace Global Search and Jump-to Navigation", async () => {
    // 1. Create multiple channels and populate diverse content
    const general = engine.createChannel("general");
    const security = engine.createChannel("security-audits", true); // private
    const dm = await engine.getOrCreateDmChannel("user-lead", "user-ciso", "CISO");

    await engine.sendMessage({
      channelId: general.id,
      senderId: "user-lead",
      senderName: "Lead",
      content: "Reminder: SOC2 Type II audit commences on Monday",
    });

    const certPdf = await engine.uploadAttachment(
      { name: "SOC2_Compliance_Report_2026.pdf", size: 1024 * 1024, type: "application/pdf" },
      security.id
    );

    const auditMsg = await engine.sendMessage({
      channelId: security.id,
      senderId: "user-ciso",
      senderName: "CISO",
      content: "Confidential SOC2 compliance report ready for leadership",
      attachments: [certPdf],
    });
    await engine.pinMessage(auditMsg.id, "user-ciso", "CISO");

    await engine.sendMessage({
      channelId: dm.id,
      senderId: "user-lead",
      senderName: "Lead",
      content: "Did the auditor sign off on the SOC2 report?",
    });

    // 2. Global query for "SOC2"
    const soc2Results = engine.searchMessages("SOC2");
    assertEqual(soc2Results.length, 3, "Query 'SOC2' should match all 3 messages across channels and DMs");

    // 3. Search by attachment filename
    const reportResults = engine.searchMessages("Compliance_Report");
    assertEqual(reportResults.length, 1);
    assertEqual(reportResults[0].id, auditMsg.id);
    assertTrue(reportResults[0].isPinned === true);

    // 4. Channel-scoped filter
    const channelScoped = engine.searchMessages("SOC2", { channelId: general.id });
    assertEqual(channelScoped.length, 1);
    assertEqual(channelScoped[0].channelId, general.id);
  });
}
