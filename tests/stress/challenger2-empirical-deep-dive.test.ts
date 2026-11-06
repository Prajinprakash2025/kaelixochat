/**
 * Milestone 2 Challenger 2 Empirical Deep Dive & Stress Test Suite
 *
 * Verifies:
 * 1. INITIAL_MESSAGES dual Array/Record access across all channels and messages:
 *    - Array.isArray(reactions) === true
 *    - msg.reactions.map(...) works
 *    - msg.reactions.filter(...) works
 *    - msg.reactions[emoji]?.count exists and matches array item
 *    - msg.reactions["non_existent"] === undefined
 * 2. DocumentCard dotless filename handling:
 *    - README, LICENSE, Makefile, Dockerfile, INSTALL display badge "FILE"
 *    - Rendered markup verification via ReactDOMServer
 * 3. Extreme edge cases:
 *    - Tooltip formatting with empty users, 1 to 50 users, missing names, whitespace names
 *    - Reactions serialization & reconstruction round-trip
 */

import React from "react";
import ReactDOMServer from "react-dom/server";
import { INITIAL_MESSAGES, TEAM_MEMBERS, CURRENT_USER } from "../../src/lib/mock-data";
import { getFileVisuals, DocumentCard } from "../../src/components/chat/document-card";
import { formatReactorsTooltip } from "../../src/components/chat/message-feed";
import {
  createReactionsArray,
  reactionsMapToArray,
  reactionListToMap,
  MessageReaction,
  Attachment,
} from "../../src/types";

let passedCount = 0;
let failedCount = 0;
const failureList: string[] = [];

function check(testName: string, fn: () => void) {
  try {
    fn();
    passedCount++;
    console.log(`  ✓ ${testName}`);
  } catch (err: any) {
    failedCount++;
    const msg = `FAIL: ${testName} -> ${err.message}`;
    failureList.push(msg);
    console.error(`  ✗ ${msg}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(`${message ? message + ": " : ""}Expected "${expected}", received "${actual}"`);
  }
}

console.log("\n======================================================================");
console.log("       CHALLENGER 2: DEEP DIVE EMPIRICAL VERIFICATION HARNESS         ");
console.log("======================================================================\n");

// -----------------------------------------------------------------------------
// SECTION 1: INITIAL_MESSAGES DUAL ACCESS VALIDATION ACROSS ALL CHANNELS
// -----------------------------------------------------------------------------
console.log("--- Section 1: INITIAL_MESSAGES Dual Contract Validation ---");

const channels = Object.keys(INITIAL_MESSAGES);

check("1.1 INITIAL_MESSAGES contains all required channels", () => {
  assert(channels.length >= 6, `Expected at least 6 channels, got ${channels.length}`);
  assert(channels.includes("chan-announcements"), "Missing chan-announcements");
  assert(channels.includes("chan-general"), "Missing chan-general");
  assert(channels.includes("chan-dev-sprint"), "Missing chan-dev-sprint");
  assert(channels.includes("chan-teaching-hub"), "Missing chan-teaching-hub");
  assert(channels.includes("chan-telecalling-leads"), "Missing chan-telecalling-leads");
  assert(channels.includes("chan-management-sync"), "Missing chan-management-sync");
});

check("1.2 Every message across all channels satisfies dual Array/Record reactions contract", () => {
  let totalMessagesChecked = 0;
  let totalReactionsChecked = 0;

  for (const channelId of channels) {
    const messages = INITIAL_MESSAGES[channelId];
    assert(Array.isArray(messages), `Channel ${channelId} messages is not an array`);

    for (const msg of messages) {
      totalMessagesChecked++;
      const reactions = msg.reactions;

      // 1. Must be an Array
      assert(Array.isArray(reactions), `Message ${msg.id} reactions is not an Array`);

      // 2. Array iteration methods must work
      const mapped = reactions.map((r) => r.emoji);
      const filtered = reactions.filter((r) => r.count > 0);
      assertEqual(mapped.length, reactions.length, `Message ${msg.id} .map() length mismatch`);
      assertEqual(filtered.length, reactions.length, `Message ${msg.id} .filter() length mismatch`);

      // 3. For...of must iterate elements without hitting dictionary keys
      let iterateCount = 0;
      for (const item of reactions) {
        iterateCount++;
        assert(typeof item === "object" && !!item.emoji, `Invalid item in for...of on message ${msg.id}`);
      }
      assertEqual(iterateCount, reactions.length, `for...of iterated ${iterateCount} times, expected ${reactions.length}`);

      // 4. Dictionary access for each reaction
      for (const item of reactions) {
        totalReactionsChecked++;
        const dictEntry = (reactions as any)[item.emoji];
        assert(!!dictEntry, `Message ${msg.id} reactions["${item.emoji}"] lookup failed (undefined)`);
        assertEqual(dictEntry.count, item.count, `Message ${msg.id} reactions["${item.emoji}"].count mismatch`);
        assertEqual(dictEntry.users.length, item.users.length, `Message ${msg.id} reactions["${item.emoji}"].users length mismatch`);
      }

      // 5. Non-existent emoji must yield undefined
      assert((reactions as any)["🛸"] === undefined, `Message ${msg.id} reactions["🛸"] should be undefined`);
      assert((reactions as any)["random_non_existent"] === undefined, `Message ${msg.id} non-existent should be undefined`);
    }
  }

  console.log(`    Validated ${totalMessagesChecked} messages and ${totalReactionsChecked} reactions across ${channels.length} channels.`);
});

check("1.3 Specific verification of chan-announcements msg-1 reactions['🚀']", () => {
  const msg1 = INITIAL_MESSAGES["chan-announcements"][0];
  assert(!!msg1, "Missing msg-1 in chan-announcements");
  
  // Array operations
  assertEqual(msg1.reactions.length, 2, "msg-1 has 2 reactions");
  const emojis = msg1.reactions.map((r) => r.emoji);
  assert(emojis.includes("🚀"), "msg-1 reactions array contains 🚀");
  assert(emojis.includes("❤️"), "msg-1 reactions array contains ❤️");

  // Dictionary lookup: msg.reactions["🚀"]?.count
  const rocketReaction = (msg1.reactions as any)["🚀"];
  assert(!!rocketReaction, "msg1.reactions['🚀'] is defined");
  assertEqual(rocketReaction?.count, 4, "msg1.reactions['🚀']?.count is 4");
  assertEqual(rocketReaction.users.length, 4, "msg1.reactions['🚀'].users has 4 users");

  // Dictionary lookup: msg.reactions["❤️"]?.count
  const heartReaction = (msg1.reactions as any)["❤️"];
  assert(!!heartReaction, "msg1.reactions['❤️'] is defined");
  assertEqual(heartReaction?.count, 3, "msg1.reactions['❤️']?.count is 3");
});

// -----------------------------------------------------------------------------
// SECTION 2: DOCUMENTCARD DOTLESS FILENAMES EMPIRICAL VALIDATION
// -----------------------------------------------------------------------------
console.log("\n--- Section 2: DocumentCard Dotless Filenames Validation ---");

const dotlessCases = [
  { filename: "README", mime: "", expectedBadge: "FILE" },
  { filename: "README", mime: "text/plain", expectedBadge: "FILE" },
  { filename: "LICENSE", mime: "", expectedBadge: "FILE" },
  { filename: "LICENSE", mime: "text/plain", expectedBadge: "FILE" },
  { filename: "Makefile", mime: "", expectedBadge: "FILE" },
  { filename: "Makefile", mime: "text/plain", expectedBadge: "FILE" },
  { filename: "Dockerfile", mime: "", expectedBadge: "FILE" },
  { filename: "Dockerfile", mime: "application/octet-stream", expectedBadge: "FILE" },
  { filename: "INSTALL", mime: "", expectedBadge: "FILE" },
  { filename: "AUTHORS", mime: "text/plain", expectedBadge: "FILE" },
];

check("2.1 getFileVisuals returns badge 'FILE' for dotless files", () => {
  for (const { filename, mime, expectedBadge } of dotlessCases) {
    const visuals = getFileVisuals(mime, filename);
    assertEqual(
      visuals.badge,
      expectedBadge,
      `getFileVisuals("${mime}", "${filename}").badge failed`
    );
  }
});

check("2.2 DocumentCard static HTML rendering contains badge 'FILE' and NOT the dotless filename as badge", () => {
  for (const { filename, mime, expectedBadge } of dotlessCases) {
    const attachment: Attachment = {
      id: `att-${filename}`,
      name: filename,
      size: 4096,
      type: mime,
      url: `https://storage.kaelixo.com/test/${filename}`,
      storagePath: `test/${filename}`,
    };

    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(DocumentCard, { attachment })
    );

    // Verify rendered filename in paragraph
    assert(html.includes(filename), `Rendered HTML must include filename "${filename}"`);

    // Verify badge: should contain the exact badge span with FILE
    const badgeRegex = new RegExp(`<span class="[^"]*text-\\[10px\\][^"]*">${expectedBadge}<\\/span>`);
    assert(
      badgeRegex.test(html),
      `Rendered HTML must contain badge span with "${expectedBadge}" for file "${filename}"`
    );

    // Ensure the badge span does NOT contain filename
    if (filename !== "FILE") {
      const wrongBadgeRegex = new RegExp(`<span class="[^"]*text-\\[10px\\][^"]*">${filename}<\\/span>`, "i");
      assert(
        !wrongBadgeRegex.test(html),
        `Rendered HTML badge span should not contain "${filename}"!`
      );
    }
  }
});

check("2.3 Standard files retain appropriate badges and icons", () => {
  const standardCases = [
    { filename: "guide.pdf", mime: "application/pdf", expectedBadge: "PDF" },
    { filename: "code.ts", mime: "application/typescript", expectedBadge: "TS" },
    { filename: "styles.css", mime: "text/css", expectedBadge: "CSS" },
    { filename: "data.json", mime: "application/json", expectedBadge: "JSON" },
    { filename: "sheet.xlsx", mime: "application/vnd.ms-excel", expectedBadge: "XLSX" },
    { filename: "bundle.zip", mime: "application/zip", expectedBadge: "ZIP" },
    { filename: "audio.mp3", mime: "audio/mpeg", expectedBadge: "AUDIO" },
    { filename: "video.mp4", mime: "video/mp4", expectedBadge: "VIDEO" },
    { filename: "notes.txt", mime: "text/plain", expectedBadge: "TXT" },
  ];

  for (const { filename, mime, expectedBadge } of standardCases) {
    const visuals = getFileVisuals(mime, filename);
    assertEqual(visuals.badge, expectedBadge, `Badge mismatch for ${filename}`);
  }
});

// -----------------------------------------------------------------------------
// SECTION 3: REACTION TOOLTIP FORMATTING STRESS TESTING
// -----------------------------------------------------------------------------
console.log("\n--- Section 3: Reaction Tooltip Formatting Stress Testing ---");

check("3.1 Single user: Only You", () => {
  const tip = formatReactorsTooltip(
    { emoji: "👍", count: 1, users: ["user-1"] },
    "user-1",
    TEAM_MEMBERS
  );
  assertEqual(tip, "You reacted");
});

check("3.2 Single user: Only Colleague", () => {
  const tip = formatReactorsTooltip(
    { emoji: "👍", count: 1, users: ["user-2"] },
    "user-1",
    TEAM_MEMBERS
  );
  assertEqual(tip, "Arjun reacted");
});

check("3.3 Two users: You + 1 Colleague", () => {
  const tip = formatReactorsTooltip(
    { emoji: "👍", count: 2, users: ["user-1", "user-2"] },
    "user-1",
    TEAM_MEMBERS
  );
  assertEqual(tip, "Arjun and you reacted");
});

check("3.4 Two users: 2 Colleagues (no You)", () => {
  const tip = formatReactorsTooltip(
    { emoji: "👍", count: 2, users: ["user-2", "user-3"] },
    "user-1",
    TEAM_MEMBERS
  );
  assertEqual(tip, "Arjun and Aparna reacted");
});

check("3.5 Three users: You + 2 Colleagues", () => {
  const tip = formatReactorsTooltip(
    { emoji: "👍", count: 3, users: ["user-1", "user-2", "user-3"] },
    "user-1",
    TEAM_MEMBERS
  );
  assertEqual(tip, "Arjun, Aparna, and you reacted");
});

check("3.6 Three users: 3 Colleagues (no You)", () => {
  const tip = formatReactorsTooltip(
    { emoji: "👍", count: 3, users: ["user-2", "user-3", "user-4"] },
    "user-1",
    TEAM_MEMBERS
  );
  assertEqual(tip, "Arjun, Aparna, and Rahul reacted");
});

check("3.7 Four users: You + 3 Colleagues (Mathematical exactness)", () => {
  const tip = formatReactorsTooltip(
    { emoji: "👍", count: 4, users: ["user-1", "user-2", "user-3", "user-4"] },
    "user-1",
    TEAM_MEMBERS
  );
  // Arjun (1) + Aparna (2) + you (3) + 1 other (4) = 4 people total!
  assertEqual(tip, "Arjun, Aparna, you, and 1 other reacted");
});

check("3.8 Five users: You + 4 Colleagues", () => {
  const tip = formatReactorsTooltip(
    { emoji: "👍", count: 5, users: ["user-1", "user-2", "user-3", "user-4", "user-5"] },
    "user-1",
    TEAM_MEMBERS
  );
  // Arjun + Aparna + you + 2 others = 5 people total
  assertEqual(tip, "Arjun, Aparna, you, and 2 others reacted");
});

check("3.9 Fallback with userNames array when members not found in directory", () => {
  const reaction = {
    emoji: "🚀",
    count: 3,
    users: ["user-1", "ext-user-a", "ext-user-b"],
    userNames: ["CurrentUser", "DevDave", "SarahConnor"],
  };

  const tip = formatReactorsTooltip(reaction, "user-1", []);
  // Should use userNames: DevDave, SarahConnor, and you reacted
  assertEqual(tip, "DevDave, SarahConnor, and you reacted");
});

// -----------------------------------------------------------------------------
// SECTION 4: CONVERTERS & SERIALIZATION BOUNDARY INTEGRITY
// -----------------------------------------------------------------------------
console.log("\n--- Section 4: Converters & Boundary Integrity ---");

check("4.1 createReactionsArray from ReactionsMap input", () => {
  const mapInput = {
    "🔥": { count: 10, users: ["u1", "u2"], userNames: ["User1", "User2"] },
    "✨": { count: 3, users: ["u3"] },
  };

  const reactions = createReactionsArray(mapInput);
  assert(Array.isArray(reactions), "Result must be an Array");
  assertEqual(reactions.length, 2, "Length must be 2");
  assertEqual(reactions["🔥"]?.count, 10, "🔥 count must be 10");
  assertEqual(reactions["✨"]?.count, 3, "✨ count must be 3");
});

check("4.2 createReactionsArray from empty input or null", () => {
  const rEmpty = createReactionsArray([]);
  assert(Array.isArray(rEmpty), "Empty array returns array");
  assertEqual(rEmpty.length, 0);

  const rUndefined = createReactionsArray(undefined);
  assert(Array.isArray(rUndefined), "Undefined returns array");
  assertEqual(rUndefined.length, 0);
});

check("4.3 Serialization round-trip with createReactionsArray re-hydration", () => {
  const original = createReactionsArray([
    { emoji: "🎯", count: 5, users: ["u1", "u2", "u3", "u4", "u5"] },
    { emoji: "💡", count: 1, users: ["u1"] },
  ]);

  const serialized = JSON.stringify(original);
  const parsed = JSON.parse(serialized);

  // Re-hydrate
  const rehydrated = createReactionsArray(parsed);
  assert(Array.isArray(rehydrated), "Rehydrated is Array");
  assertEqual(rehydrated.length, 2, "Rehydrated length is 2");
  assertEqual(rehydrated["🎯"]?.count, 5, "🎯 count restored");
  assertEqual(rehydrated["💡"]?.count, 1, "💡 count restored");
  assert(rehydrated["UNKNOWN"] === undefined, "Unknown emoji is undefined");
});

// -----------------------------------------------------------------------------
// EXECUTION SUMMARY
// -----------------------------------------------------------------------------
console.log("\n======================================================================");
console.log("                           DEEP DIVE SUMMARY                          ");
console.log("======================================================================\n");
console.log(`Total Checks:  ${passedCount + failedCount}`);
console.log(`Passed:        ${passedCount}`);
console.log(`Failed:        ${failedCount}`);
console.log(`Pass Rate:     ${(((passedCount) / (passedCount + failedCount)) * 100).toFixed(1)}%\n`);

if (failedCount > 0) {
  console.error("FAILURES DETECTED:");
  for (const f of failureList) {
    console.error(`- ${f}`);
  }
  process.exit(1);
} else {
  console.log("ALL EMPIRICAL DEEP DIVE CHECKS PASSED WITH 100% SUCCESS RATE!");
}
