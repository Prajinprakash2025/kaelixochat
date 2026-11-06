/**
 * Milestone 2 Challenger 2 Empirical Stress Test Harness
 *
 * Challenges:
 * 1. EmojiPicker: 5 categories, search filter, special multibyte unicode, and caret-aware insertion.
 * 2. Hover action bar: 5 quick reactions, SmilePlus trigger, active state.
 * 3. Reaction chips: aggregate counting, toggle-on/toggle-off, active user highlight, and reactor tooltip formatting.
 * 4. Dual Array/Record access contract (msg.reactions.map AND msg.reactions["🎉"]).
 * 5. Mock data & serialization integrity.
 */

import React from "react";
import ReactDOMServer from "react-dom/server";
import { formatReactorsTooltip, MessageFeed } from "../../src/components/chat/message-feed";
import { EmojiPicker } from "../../src/components/chat/emoji-picker";
import {
  Message,
  WorkspaceMember,
  MessageReaction,
  MessageReactionsArray,
  reactionsMapToArray,
  reactionListToMap,
} from "../../src/types";
import { INITIAL_MESSAGES, TEAM_MEMBERS, CURRENT_USER } from "../../src/lib/mock-data";

interface TestReport {
  name: string;
  category: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const reports: TestReport[] = [];

function recordTest(category: string, name: string, fn: () => void) {
  try {
    fn();
    reports.push({ category, name, passed: true });
    console.log(`  ✓ [${category}] ${name}`);
  } catch (err: any) {
    reports.push({ category, name, passed: false, error: err.message, details: err.stack });
    console.error(`  ✗ [${category}] ${name}`);
    console.error(`    Error: ${err.message}`);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(msg);
  }
}

function assertEqual<T>(actual: T, expected: T, msg?: string) {
  if (actual !== expected) {
    throw new Error(`${msg ? msg + ": " : ""}Expected "${expected}", got "${actual}"`);
  }
}

// Replicate createReactionsArray from src/app/page.tsx
function createReactionsArray(items: MessageReaction[] = []): MessageReactionsArray {
  const arr = [...items] as MessageReactionsArray;
  for (const item of items) {
    (arr as any)[item.emoji] = { count: item.count, users: item.users };
  }
  return arr;
}

console.log("\n======================================================================");
console.log("    CHALLENGER M2_2: EMPIRICAL HARNESS FOR EMOJIS, REACTIONS & REALTIME");
console.log("======================================================================\n");

// ==============================================================================
// 1. EMOJIPICKER & CARET INSERTION TESTS
// ==============================================================================

recordTest("EmojiPicker", "1.1: Verify exactly 5 categories are present in component markup", () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(EmojiPicker, { onSelectEmoji: () => {}, onClose: () => {} })
  );
  assert(html.includes("Smileys"), "Expected category 'Smileys' in markup");
  assert(html.includes("Gestures"), "Expected category 'Gestures' in markup");
  assert(html.includes("People"), "Expected category 'People' in markup");
  assert(html.includes("Objects"), "Expected category 'Objects' in markup");
  assert(html.includes("Symbols"), "Expected category 'Symbols' in markup");
});

recordTest("EmojiPicker", "1.2: Check for presence of flags or skin-tone emojis in picker data", () => {
  // Check rendered HTML for flag emojis or skin tones
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(EmojiPicker, { onSelectEmoji: () => {}, onClose: () => {} })
  );
  // Test whether standard flags (e.g. 🏳️‍🌈, 🏁, 🇺🇸) or skin tones (e.g. 👍🏽) exist in EmojiPicker default categories
  const hasFlag = html.includes("🏳️‍🌈") || html.includes("🏁") || html.includes("🇺🇸");
  const hasSkinTone = html.includes("👍🏽") || html.includes("👋🏽") || html.includes("🧑🏽");
  console.log(`    Note: EmojiPicker contains flags: ${hasFlag}, contains skin tone variants: ${hasSkinTone}`);
  // EMOJI_DATA has ZWJ technologist (🧑‍💻) and variation selectors (✌️, 🕵️), but no flag/skin tone categories
});

recordTest("EmojiPicker", "1.3: Caret-aware insertion logic simulation (mid-string, start, end, selection)", () => {
  function simulateInsertEmoji(
    content: string,
    selectionStart: number,
    selectionEnd: number,
    emoji: string
  ): { newContent: string; newCursorPos: number } {
    const start = selectionStart;
    const end = selectionEnd;
    const newContent = content.substring(0, start) + emoji + content.substring(end);
    const newCursorPos = start + emoji.length;
    return { newContent, newCursorPos };
  }

  // Case A: Insertion at start
  const r1 = simulateInsertEmoji("Hello World", 0, 0, "👋");
  assertEqual(r1.newContent, "👋Hello World", "Insertion at index 0");
  assertEqual(r1.newCursorPos, "👋".length, "Cursor pos after emoji");

  // Case B: Insertion in middle
  const r2 = simulateInsertEmoji("Hello World", 5, 5, " 🎉 ");
  assertEqual(r2.newContent, "Hello 🎉  World", "Insertion at index 5");

  // Case C: Insertion replacing selection range
  const r3 = simulateInsertEmoji("Hello [REPLACE ME] World", 6, 18, "🚀");
  assertEqual(r3.newContent, "Hello 🚀 World", "Replacement of selection range");
  assertEqual(r3.newCursorPos, 6 + "🚀".length);

  // Case D: Complex multibyte ZWJ emoji (technologist 🧑‍💻)
  const z = "🧑‍💻"; // 5 code units: \uD83E\uDDD1 \u200D \uD83D\uDCBB
  const r4 = simulateInsertEmoji("Code: ", 6, 6, z);
  assertEqual(r4.newContent, "Code: 🧑‍💻");
  assertEqual(r4.newCursorPos, 6 + z.length);
});

// ==============================================================================
// 2. HOVER ACTION BAR TESTS
// ==============================================================================

recordTest("HoverBar", "2.1: Exactly 5 quick reactions in hover action bar", () => {
  const quickEmojis = ["👍", "❤️", "😂", "🎉", "🚀"];
  assertEqual(quickEmojis.length, 5, "Expected 5 quick reactions");

  const msg: Message = {
    id: "test-msg-1",
    channelId: "c1",
    sender: CURRENT_USER,
    content: "Testing hover action bar",
    createdAt: "12:00 PM",
    reactions: createReactionsArray([]),
  };

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(MessageFeed, {
      messages: [msg],
      currentUser: CURRENT_USER,
      onAddReaction: () => {},
    })
  );

  for (const q of quickEmojis) {
    assert(html.includes(`React with ${q}`), `Expected quick reaction button for ${q}`);
  }
  assert(html.includes("Add Reaction"), "Expected SmilePlus Add Reaction button");
});

recordTest("HoverBar", "2.2: Active user reaction highlighting in hover action bar", () => {
  const msgWithReaction: Message = {
    id: "test-msg-2",
    channelId: "c1",
    sender: CURRENT_USER,
    content: "Hover active state test",
    createdAt: "12:00 PM",
    reactions: createReactionsArray([
      { emoji: "🎉", count: 1, users: [CURRENT_USER.id] },
    ]),
  };

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(MessageFeed, {
      messages: [msgWithReaction],
      currentUser: CURRENT_USER,
      onAddReaction: () => {},
    })
  );

  // When CURRENT_USER reacted with 🎉, the button has bg-indigo-100 class
  assert(html.includes("bg-indigo-100"), "Expected active user highlight on 🎉 quick button");
});

// ==============================================================================
// 3. REACTION CHIPS & TOOLTIP FORMATTING TESTS
// ==============================================================================

recordTest("ReactionChips", "3.1: Aggregate counting and active user highlight on chips", () => {
  const msg: Message = {
    id: "test-msg-3",
    channelId: "c1",
    sender: CURRENT_USER,
    content: "Chips test",
    createdAt: "12:00 PM",
    reactions: createReactionsArray([
      { emoji: "🚀", count: 7, users: [CURRENT_USER.id, "user-2", "user-3"] },
      { emoji: "🔥", count: 2, users: ["user-2", "user-3"] },
    ]),
  };

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(MessageFeed, {
      messages: [msg],
      currentUser: CURRENT_USER,
      onAddReaction: () => {},
    })
  );

  assert(html.includes("7"), "Chip count 7 displayed");
  assert(html.includes("2"), "Chip count 2 displayed");
  // Active chip should have indigo ring
  assert(html.includes("ring-indigo-400/30"), "Active chip has ring highlight");
});

recordTest("ReactionChips", "3.2: Tooltip formatting - Single user (You)", () => {
  const tip = formatReactorsTooltip(
    { emoji: "👍", count: 1, users: [CURRENT_USER.id] },
    CURRENT_USER.id,
    TEAM_MEMBERS
  );
  assertEqual(tip, "You reacted");
});

recordTest("ReactionChips", "3.3: Tooltip formatting - Two users (You + Alice)", () => {
  const tip = formatReactorsTooltip(
    { emoji: "👍", count: 2, users: [CURRENT_USER.id, "user-2"] },
    CURRENT_USER.id,
    TEAM_MEMBERS
  );
  assertEqual(tip, "Arjun and you reacted");
});

recordTest("ReactionChips", "3.4: Tooltip formatting - Three users (You + 2 others)", () => {
  const tip = formatReactorsTooltip(
    { emoji: "👍", count: 3, users: [CURRENT_USER.id, "user-2", "user-3"] },
    CURRENT_USER.id,
    TEAM_MEMBERS
  );
  assertEqual(tip, "Arjun, Aparna, and you reacted");
});

recordTest("ReactionChips", "3.5: EMPIRICAL CHALLENGE - Four users (You + 3 others: Arjun, Aparna, Rahul)", () => {
  // users: CURRENT_USER + 3 others = 4 total people.
  // Names shown: Arjun, Aparna, and you reacted?
  // Or "Arjun, Aparna, and 1 others reacted"?
  const tip = formatReactorsTooltip(
    { emoji: "👍", count: 4, users: [CURRENT_USER.id, "user-2", "user-3", "user-4"] },
    CURRENT_USER.id,
    TEAM_MEMBERS
  );
  console.log(`    Actual output for 4 people (You + 3 others): "${tip}"`);

  // Notice: Arjun is person 1, Aparna is person 2. That leaves Rahul (1 other).
  // If the string says "Arjun, Aparna, and 2 others reacted", that totals:
  // Arjun (1) + Aparna (1) + 2 others (2) + you (1) = 5 people!
  // But there were only 4 people!
  if (tip.includes("2 others")) {
    throw new Error(
      `BUG DETECTED in formatReactorsTooltip: Output was "${tip}". It says "2 others reacted" when there was only 1 remaining person (Rahul)! Total people rendered = 5, actual = 4.`
    );
  }
});

recordTest("ReactionChips", "3.6: EMPIRICAL CHALLENGE - Tooltip with userNames array misalignment", () => {
  // If memberMap does not contain the IDs, formatReactorsTooltip falls back to reaction.userNames[index]
  const reaction = {
    emoji: "🎉",
    count: 2,
    users: [CURRENT_USER.id, "custom-bob"],
    userNames: ["MySelf", "BobTheBuilder"],
  };

  const tip = formatReactorsTooltip(reaction, CURRENT_USER.id, []);
  console.log(`    Actual output for userNames fallback: "${tip}"`);
  // otherIds = ["custom-bob"] (index 0 in otherIds).
  // otherNames uses reaction.userNames[0], which is "MySelf" instead of "BobTheBuilder"!
  if (tip.includes("MySelf and you reacted")) {
    throw new Error(
      `BUG DETECTED in formatReactorsTooltip: Output was "${tip}". Index in otherNames accessed reaction.userNames[0] ("MySelf") instead of reaction.userNames[1] ("BobTheBuilder") due to user filter index offset!`
    );
  }
});

// ==============================================================================
// 4. DUAL ARRAY/RECORD ACCESS CONTRACT
// ==============================================================================

recordTest("DualContract", "4.1: MessageReactionsArray supports both .map() and ['🎉'] access", () => {
  const rawList: MessageReaction[] = [
    { emoji: "🎉", count: 5, users: ["u1", "u2", "u3", "u4", "u5"] },
    { emoji: "🚀", count: 2, users: ["u1", "u2"] },
  ];

  const reactions = createReactionsArray(rawList);

  // 1. Array methods
  assert(Array.isArray(reactions), "Expected reactions to be an Array");
  assertEqual(reactions.length, 2, "Array length must be 2");
  const mapped = reactions.map((r) => r.emoji);
  assertEqual(mapped.join(","), "🎉,🚀", "Array.map must work");

  // 2. Dictionary property access
  assert(reactions["🎉"] !== undefined, "Expected reactions['🎉'] to exist");
  assertEqual(reactions["🎉"].count, 5, "reactions['🎉'].count must be 5");
  assertEqual(reactions["🚀"].count, 2, "reactions['🚀'].count must be 2");
  assert(reactions["❤️"] === undefined, "Unreacted emoji must be undefined");
});

recordTest("DualContract", "4.2: Toggling reaction maintains dual array/record consistency", () => {
  let list: MessageReaction[] = [
    { emoji: "🎉", count: 1, users: ["user-1"] },
  ];
  let reactions = createReactionsArray(list);

  assertEqual(reactions["🎉"].count, 1);
  assertEqual(reactions.length, 1);

  // Add a second user to 🎉
  list = [{ emoji: "🎉", count: 2, users: ["user-1", "user-2"] }];
  reactions = createReactionsArray(list);
  assertEqual(reactions["🎉"].count, 2);
  assertEqual(reactions.length, 1);

  // Remove 🎉 completely (count drops to 0)
  list = [];
  reactions = createReactionsArray(list);
  assertEqual(reactions.length, 0);
  assert(reactions["🎉"] === undefined, "Removed emoji must be undefined in dictionary lookup");
  assert(!("🎉" in reactions), "Removed emoji must not be in object keys");
});

recordTest("DualContract", "4.3: EMPIRICAL CHALLENGE - Mock data INITIAL_MESSAGES dual access", () => {
  const firstMsg = INITIAL_MESSAGES["chan-announcements"]?.[0];
  assert(!!firstMsg, "Expected first message in chan-announcements");

  // In INITIAL_MESSAGES, msg-1 has reactions: [{ emoji: "🚀", count: 4, ... }]
  // Test if it supports array .map()
  assert(Array.isArray(firstMsg.reactions), "firstMsg.reactions is an array");
  assertEqual(firstMsg.reactions.length, 2, "Has 2 reactions");

  // Test if it supports dictionary access msg.reactions['🚀']
  const dictRocket = (firstMsg.reactions as any)["🚀"];
  console.log(`    INITIAL_MESSAGES reactions['🚀']:`, dictRocket);
  if (!dictRocket) {
    throw new Error(
      `BUG DETECTED in INITIAL_MESSAGES: firstMsg.reactions['🚀'] is undefined! Mock messages were initialized as plain Array literals instead of calling createReactionsArray(), breaking the dual access contract for initial/mock state.`
    );
  }
});

recordTest("DualContract", "4.4: Serialization & Deserialization (JSON.stringify / JSON.parse)", () => {
  const original = createReactionsArray([
    { emoji: "👍", count: 3, users: ["u1", "u2", "u3"] },
  ]);

  const jsonStr = JSON.stringify(original);
  const parsed = JSON.parse(jsonStr);

  // Note: JSON.stringify on Array drops named properties like arr['👍']
  const survivesStringify = parsed["👍"] !== undefined;
  console.log(`    Note: Named properties survive JSON round-trip: ${survivesStringify}`);
  // In JS, JSON.stringify([{}]) produces array only; when parsed back it lacks ['👍'].
  // Therefore, any reactions received over the wire or loaded from DB must be re-wrapped with createReactionsArray().
  const rewrapped = createReactionsArray(parsed);
  assert(rewrapped["👍"] !== undefined, "Re-wrapped reactions restore dictionary access");
});

// ==============================================================================
// SUMMARY REPORT
// ==============================================================================

console.log("\n======================================================================");
console.log("                           EXECUTION SUMMARY                          ");
console.log("======================================================================\n");

const total = reports.length;
const passed = reports.filter((r) => r.passed).length;
const failed = reports.filter((r) => !r.passed).length;

console.log(`Total Scenarios: ${total}`);
console.log(`Passed:          ${passed}`);
console.log(`Failed:          ${failed}`);
console.log(`Success Rate:    ${((passed / total) * 100).toFixed(1)}%\n`);

if (failed > 0) {
  console.log("FAILED CHALLENGES / VULNERABILITIES:");
  reports
    .filter((r) => !r.passed)
    .forEach((r, idx) => {
      console.log(`\n${idx + 1}. [${r.category}] ${r.name}`);
      console.log(`   ${r.error}`);
    });
}
