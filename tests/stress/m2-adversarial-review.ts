/**
 * Adversarial Stress & Corner-Case Suite for Milestone 2
 * Author: Milestone 2 Reviewer 2 (reviewer, critic)
 * Target: Kaelixo Milestone 2 Features
 */

import { formatReactorsTooltip } from "../../src/components/chat/message-feed";
import { getFileVisuals } from "../../src/components/chat/document-card";
import { isImageAttachment } from "../../src/components/chat/attachment-preview";
import {
  sanitizeFileName,
  sanitizeChannelId,
  formatFileSize,
  validateAttachment,
  extractFileExtension,
  isImageFile,
  getFileCategory,
  MAX_FILE_SIZE_BYTES,
} from "../../src/utils/storage";
import { reactionsMapToArray, Attachment } from "../../src/types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

let passed = 0;
let total = 0;

function test(name: string, fn: () => void) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  ✓ PASS: ${name}`);
  } catch (err: any) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
    throw err;
  }
}

console.log("======================================================================");
console.log("       MILESTONE 2 REVIEWER 2 ADVERSARIAL STRESS TEST SUITE           ");
console.log("======================================================================\n");

// --- SECTION 1: Tooltip Formatting Stress & Corner Cases ---
console.log("--- [Section 1] formatReactorsTooltip Formatting ---");

const testMembers = [
  { id: "u1", name: "Alice Smith", email: "a@test.com", avatar: "", role: "member" as const, department: "dev", status: "online" as const },
  { id: "u2", name: "Bob Jones", email: "b@test.com", avatar: "", role: "member" as const, department: "dev", status: "online" as const },
  { id: "u3", name: "Charlie Day", email: "c@test.com", avatar: "", role: "member" as const, department: "dev", status: "online" as const },
  { id: "u4", name: "Diana Prince", email: "d@test.com", avatar: "", role: "member" as const, department: "dev", status: "online" as const },
];

test("Tooltip 1.1: Current user reacted alone", () => {
  const res = formatReactorsTooltip({ emoji: "👍", count: 1, users: ["u1"] }, "u1", testMembers);
  assert(res === "You reacted", `Expected "You reacted", got "${res}"`);
});

test("Tooltip 1.2: Current user + 1 colleague", () => {
  const res = formatReactorsTooltip({ emoji: "👍", count: 2, users: ["u1", "u2"] }, "u1", testMembers);
  assert(res === "Bob and you reacted", `Expected "Bob and you reacted", got "${res}"`);
});

test("Tooltip 1.3: Current user + 2 colleagues", () => {
  const res = formatReactorsTooltip({ emoji: "👍", count: 3, users: ["u1", "u2", "u3"] }, "u1", testMembers);
  assert(res === "Bob, Charlie, and you reacted", `Expected "Bob, Charlie, and you reacted", got "${res}"`);
});

test("Tooltip 1.4: Current user + 3 colleagues (4 total)", () => {
  const res = formatReactorsTooltip({ emoji: "👍", count: 4, users: ["u1", "u2", "u3", "u4"] }, "u1", testMembers);
  assert(res === "Bob, Charlie, you, and 1 other reacted", `Expected "Bob, Charlie, you, and 1 other reacted", got "${res}"`);
});

test("Tooltip 1.5: 1 other user only (no current user)", () => {
  const res = formatReactorsTooltip({ emoji: "👍", count: 1, users: ["u2"] }, "u1", testMembers);
  assert(res === "Bob reacted", `Expected "Bob reacted", got "${res}"`);
});

test("Tooltip 1.6: 2 other users only (no current user)", () => {
  const res = formatReactorsTooltip({ emoji: "👍", count: 2, users: ["u2", "u3"] }, "u1", testMembers);
  assert(res === "Bob and Charlie reacted", `Expected "Bob and Charlie reacted", got "${res}"`);
});

test("Tooltip 1.7: 3 other users only (no current user)", () => {
  const res = formatReactorsTooltip({ emoji: "👍", count: 3, users: ["u2", "u3", "u4"] }, "u1", testMembers);
  assert(res === "Bob, Charlie, and Diana reacted", `Expected "Bob, Charlie, and Diana reacted", got "${res}"`);
});

test("Tooltip 1.8: Fallback for unknown user ID 'user-frank'", () => {
  const res = formatReactorsTooltip({ emoji: "👍", count: 1, users: ["user-frank"] }, "u1", testMembers);
  assert(res === "Frank reacted", `Expected "Frank reacted", got "${res}"`);
});

test("Tooltip 1.9: Fallback for completely unknown non-user prefix ID", () => {
  const res = formatReactorsTooltip({ emoji: "👍", count: 1, users: ["99999"] }, "u1", testMembers);
  assert(res === "Someone reacted", `Expected "Someone reacted", got "${res}"`);
});

// --- SECTION 2: DocumentCard Visuals & Category Mapping ---
console.log("\n--- [Section 2] DocumentCard Visuals Mapping ---");

test("Visuals 2.1: PDF by MIME and extension", () => {
  const v1 = getFileVisuals("application/pdf", "report.pdf");
  assert(v1.badge === "PDF", `Expected PDF badge, got ${v1.badge}`);
  const v2 = getFileVisuals("", "report.PDF");
  assert(v2.badge === "PDF", `Expected uppercase PDF badge, got ${v2.badge}`);
});

test("Visuals 2.2: Code files with varied extensions", () => {
  const vTs = getFileVisuals("text/plain", "server.ts");
  assert(vTs.badge === "TS", `Expected TS badge, got ${vTs.badge}`);
  const vPy = getFileVisuals("", "script.py");
  assert(vPy.badge === "PY", `Expected PY badge, got ${vPy.badge}`);
  const vSql = getFileVisuals("application/sql", "migration.sql");
  assert(vSql.badge === "SQL", `Expected SQL badge, got ${vSql.badge}`);
});

test("Visuals 2.3: Spreadsheets (CSV, XLSX, XLS)", () => {
  const vCsv = getFileVisuals("text/csv", "data.csv");
  assert(vCsv.badge === "CSV", `Expected CSV badge, got ${vCsv.badge}`);
  const vXlsx = getFileVisuals("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "budget.xlsx");
  assert(vXlsx.badge === "XLSX", `Expected XLSX badge, got ${vXlsx.badge}`);
});

test("Visuals 2.4: Word/Office documents", () => {
  const vDoc = getFileVisuals("application/msword", "letter.doc");
  assert(vDoc.badge === "DOC", `Expected DOC badge, got ${vDoc.badge}`);
});

test("Visuals 2.5: Archives (ZIP, TAR, GZ)", () => {
  const vZip = getFileVisuals("application/zip", "backup.zip");
  assert(vZip.badge === "ZIP", `Expected ZIP badge, got ${vZip.badge}`);
  const vTar = getFileVisuals("", "archive.tar.gz");
  assert(vTar.badge === "ZIP", `Expected ZIP badge, got ${vTar.badge}`);
});

test("Visuals 2.6: Audio and Video", () => {
  const vAudio = getFileVisuals("audio/mpeg", "recording.mp3");
  assert(vAudio.badge === "AUDIO", `Expected AUDIO badge, got ${vAudio.badge}`);
  const vVideo = getFileVisuals("video/mp4", "demo.mp4");
  assert(vVideo.badge === "VIDEO", `Expected VIDEO badge, got ${vVideo.badge}`);
});

test("Visuals 2.7: Generic unknown extension fallback", () => {
  const vUnknown = getFileVisuals("application/octet-stream", "blob.xyz");
  assert(vUnknown.badge === "XYZ", `Expected XYZ badge, got ${vUnknown.badge}`);
  const vNoExt = getFileVisuals("", "noextension");
  assert(vUnknown.badge.length > 0, `Badge should not be empty`);
});

// --- SECTION 3: Image vs Non-Image Attachment Identification ---
console.log("\n--- [Section 3] isImageAttachment Classification ---");

test("Image 3.1: Explicit image MIME types", () => {
  const imgTypes = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"];
  for (const t of imgTypes) {
    const att: Attachment = { id: "1", name: "file", size: 100, type: t, url: "http://test", storagePath: "p" };
    assert(isImageAttachment(att) === true, `Failed to identify image MIME ${t}`);
  }
});

test("Image 3.2: Missing MIME type but image extension fallback", () => {
  const imgNames = ["photo.png", "PIC.JPG", "art.JPEG", "anim.gif", "graphic.WEBP", "vector.SVG"];
  for (const name of imgNames) {
    const att: Attachment = { id: "1", name, size: 100, type: "", url: "http://test", storagePath: "p" };
    assert(isImageAttachment(att) === true, `Failed to identify image extension ${name}`);
  }
});

test("Image 3.3: Non-image documents correctly rejected", () => {
  const docNames = ["doc.pdf", "sheet.xlsx", "code.ts", "data.json", "archive.zip"];
  for (const name of docNames) {
    const att: Attachment = { id: "1", name, size: 100, type: "application/octet-stream", url: "http://test", storagePath: "p" };
    assert(isImageAttachment(att) === false, `Falsely classified document as image: ${name}`);
  }
});

// --- SECTION 4: Dual Reaction Model (Array & Dictionary Access) ---
console.log("\n--- [Section 4] Dual Reaction Model Access ---");

test("Reactions 4.1: reactionsMapToArray converts dictionary correctly", () => {
  const dict = {
    "👍": { count: 3, users: ["u1", "u2", "u3"] },
    "🎉": { count: 1, users: ["u4"] }
  };
  const list = reactionsMapToArray(dict);
  assert(list.length === 2, `Expected length 2, got ${list.length}`);
  assert(list.some((r: any) => r.emoji === "👍" && r.count === 3), "Missing thumbs up reaction");
  assert(list.some((r: any) => r.emoji === "🎉" && r.count === 1), "Missing party reaction");
});

test("Reactions 4.2: reactionsMapToArray handles array input transparently", () => {
  const arr = [
    { emoji: "🚀", count: 2, users: ["u1", "u2"] }
  ];
  const list = reactionsMapToArray(arr);
  assert(list.length === 1, `Expected length 1, got ${list.length}`);
  assert(list[0].emoji === "🚀", "Emoji mismatch");
});

test("Reactions 4.3: reactionsMapToArray handles null/undefined/empty", () => {
  assert(reactionsMapToArray(null as any).length === 0, "Expected empty array on null");
  assert(reactionsMapToArray(undefined).length === 0, "Expected empty array on undefined");
  assert(reactionsMapToArray({}).length === 0, "Expected empty array on empty object");
});

test("Reactions 4.4: Multibyte and complex unicode emojis supported", () => {
  const complexEmojis = ["👨‍👩‍👧‍👦", "🏳️‍🌈", "👍🏽", "❤️‍🔥", "🧘🏻‍♂️"];
  const dict: Record<string, any> = {};
  for (const e of complexEmojis) {
    dict[e] = { count: 1, users: ["u1"] };
  }
  const list = reactionsMapToArray(dict);
  assert(list.length === complexEmojis.length, "Failed to preserve all complex emojis");
  for (const e of complexEmojis) {
    assert(list.some((r: any) => r.emoji === e), `Complex emoji ${e} not found in output`);
  }
});

// --- SECTION 5: Attachment Validation & Boundary Conditions ---
console.log("\n--- [Section 5] Attachment Validation & Boundary Testing ---");

test("Storage 5.1: Exactly 25 MB file boundary passes", () => {
  const validFile = {
    name: "exact25mb.pdf",
    size: MAX_FILE_SIZE_BYTES,
    type: "application/pdf"
  } as File;
  validateAttachment(validFile);
});

test("Storage 5.2: 25 MB + 1 byte rejected", () => {
  const oversized = {
    name: "oversized.pdf",
    size: MAX_FILE_SIZE_BYTES + 1,
    type: "application/pdf"
  } as File;
  let rejected = false;
  try {
    validateAttachment(oversized);
  } catch (err: any) {
    rejected = true;
    assert(err.message.includes("exceeds"), `Expected exceeds message, got ${err.message}`);
  }
  assert(rejected, "25MB + 1 byte file was not rejected!");
});

test("Storage 5.3: Null byte in filename stripped without traversal", () => {
  const sanitized = sanitizeFileName("exploit\0.pdf.exe");
  assert(!sanitized.includes("\0"), "Null byte was not stripped");
  assert(sanitized.endsWith(".exe"), `Extension was not preserved properly: ${sanitized}`);
});

test("Storage 5.4: Directory traversal in channel ID sanitized", () => {
  const clean = sanitizeChannelId("../../../secret/channel");
  assert(!clean.includes("/") && !clean.includes("\\"), `Contains path separators: ${clean}`);
  assert(!clean.includes(".."), `Contains relative traversal: ${clean}`);
});

test("Storage 5.5: Non-ASCII and Unicode filenames handled cleanly", () => {
  const malayalam = sanitizeFileName("രേഖ_2026.pdf");
  assert(malayalam.endsWith(".pdf"), `Extension lost for non-ASCII: ${malayalam}`);
  assert(malayalam.length > 0, "Non-ASCII sanitized name is empty");
});

console.log("\n======================================================================");
console.log(`ALL ${passed}/${total} ADVERSARIAL STRESS TESTS PASSED SUCCESSFULLY! (100%)`);
console.log("======================================================================\n");
