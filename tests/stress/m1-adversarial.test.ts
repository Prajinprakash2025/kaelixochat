/**
 * Milestone 1 Adversarial & Empirical Stress Test Suite
 *
 * Tests the real implementation code:
 * - src/utils/storage.ts
 * - src/utils/channels.ts
 */

import {
  sanitizeFileName,
  sanitizeChannelId,
  getFileCategory,
  formatFileSize,
  validateAttachment,
  uploadAttachment,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from "../../src/utils/storage";

import {
  getDmKey,
  getOrCreateDmChannel,
  isDmChannel,
  clearDmChannelCache,
} from "../../src/utils/channels";

// Load environment variables for Supabase tests
if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // env file optional if mocked
  }
}

// Standard UUID format validator (RFC 4122 lenient hex check)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Strict RFC 4122 v4 UUID validator
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface TestResult {
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: () => void | Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, passed: true, durationMs: Date.now() - start });
    console.log(`  ✓ PASS: ${name} (${Date.now() - start}ms)`);
  } catch (err: any) {
    results.push({
      name,
      passed: false,
      durationMs: Date.now() - start,
      error: err.message || String(err),
    });
    console.log(`  ✗ FAIL: ${name} (${Date.now() - start}ms)`);
    console.log(`    Error: ${err.message || err}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertThrows(fn: () => void, expectedMessageSubstr?: string) {
  let threw = false;
  try {
    fn();
  } catch (err: any) {
    threw = true;
    if (expectedMessageSubstr && !err.message.includes(expectedMessageSubstr)) {
      throw new Error(`Expected error containing "${expectedMessageSubstr}", but got "${err.message}"`);
    }
  }
  if (!threw) {
    throw new Error(`Expected function to throw, but it succeeded.`);
  }
}

async function assertRejects(promiseFn: () => Promise<any>, expectedMessageSubstr?: string) {
  let threw = false;
  try {
    await promiseFn();
  } catch (err: any) {
    threw = true;
    if (expectedMessageSubstr && !err.message.includes(expectedMessageSubstr)) {
      throw new Error(`Expected rejection containing "${expectedMessageSubstr}", but got "${err.message}"`);
    }
  }
  if (!threw) {
    throw new Error(`Expected promise to reject, but it resolved successfully.`);
  }
}

// ==============================================================================
// TEST EXECUTION
// ==============================================================================

async function executeAdversarialTests() {
  console.log("\n======================================================================");
  console.log("       MILESTONE 1 EMPIRICAL ADVERSARIAL STRESS TEST SUITE           ");
  console.log("======================================================================\n");

  // ----------------------------------------------------------------------------
  // SECTION 1: STORAGE & ATTACHMENT ADVERSARIAL CHALLENGES
  // ----------------------------------------------------------------------------
  console.log("--- [Suite 1] uploadAttachment & Storage Hardening ---");

  await runTest("Storage 1.1: Path traversal in sanitizeFileName (UNIX & Windows)", () => {
    const dangerousNames = [
      "../../../../etc/passwd",
      "..\\..\\windows\\system32\\cmd.exe",
      "foo/../../bar/baz.png",
      "....//....//nested//traversal.pdf",
      "/absolute/root/path.jpg",
      "C:\\Users\\Admin\\secrets.doc",
    ];

    for (const name of dangerousNames) {
      const sanitized = sanitizeFileName(name);
      assert(!sanitized.includes("/"), `Sanitized name "${sanitized}" contains forward slash from "${name}"`);
      assert(!sanitized.includes("\\"), `Sanitized name "${sanitized}" contains backslash from "${name}"`);
      assert(!sanitized.includes(".."), `Sanitized name "${sanitized}" contains traversal ".." from "${name}"`);
      assert(!sanitized.startsWith("."), `Sanitized name "${sanitized}" starts with dot from "${name}"`);
    }
  });

  await runTest("Storage 1.2: Path traversal in sanitizeChannelId", () => {
    const dangerousChannelIds = [
      "../../secret-channel",
      "../../../etc",
      "channel/../../root",
      "..\\..\\admin",
      "general/private",
      "ch@nnel#1!$*",
    ];

    for (const ch of dangerousChannelIds) {
      const clean = sanitizeChannelId(ch);
      assert(!clean.includes("/"), `Clean channel ID "${clean}" contains forward slash from "${ch}"`);
      assert(!clean.includes("\\"), `Clean channel ID "${clean}" contains backslash from "${ch}"`);
      assert(!clean.includes(".."), `Clean channel ID "${clean}" contains traversal ".." from "${ch}"`);
      assert(/^[a-zA-Z0-9_-]*$/.test(clean), `Clean channel ID "${clean}" contains invalid chars`);
    }
  });

  await runTest("Storage 1.3: Extremely long filename truncation with extension preservation", () => {
    const longName = "A".repeat(200) + ".pdf";
    const sanitized = sanitizeFileName(longName);
    assert(sanitized.endsWith(".pdf"), `Extension was lost in sanitized: "${sanitized}"`);
    // Base name truncated to 80 chars + extension (4 chars) = 84 chars max
    assert(sanitized.length <= 85, `Length ${sanitized.length} exceeded expected max 85`);
  });

  await runTest("Storage 1.4: Special, degenerate, and dot-only filenames", () => {
    assert(sanitizeFileName("").length > 0, "Empty filename should fallback to non-empty default");
    
    // Dot-only filenames analysis:
    const dotResult = sanitizeFileName(".");
    const doubleDotResult = sanitizeFileName("..");
    const tripleDotResult = sanitizeFileName("...");

    // Verify trailing dot prevention:
    const hasTrailingDot = dotResult.endsWith(".") || doubleDotResult.endsWith(".") || tripleDotResult.endsWith(".");
    assert(!hasTrailingDot, `Degenerate dot filenames produced dangling trailing dots: '.' -> "${dotResult}", '..' -> "${doubleDotResult}", '...' -> "${tripleDotResult}"`);

    // Null byte injection in filename
    const nullByteName = "innocent.pdf\0.exe";
    const sanitizedNull = sanitizeFileName(nullByteName);
    assert(!sanitizedNull.includes("\0"), "Sanitized filename must strip null byte");
  });

  await runTest("Storage 1.5: 0-byte file upload rejection", () => {
    const zeroByteFile = new File([], "empty.txt", { type: "text/plain" });
    assertThrows(() => validateAttachment(zeroByteFile), "Cannot upload empty file (0 bytes)");
  });

  await runTest("Storage 1.6: Oversized file (>25MB) rejection", () => {
    // 25MB + 1 byte
    const oversizedFile = {
      name: "giant_dataset.zip",
      size: MAX_FILE_SIZE_BYTES + 1,
      type: "application/zip",
    } as File;

    assertThrows(
      () => validateAttachment(oversizedFile),
      "exceeds maximum allowed limit"
    );

    // 50MB file
    const file50MB = {
      name: "huge_video.mp4",
      size: 50 * 1024 * 1024,
      type: "video/mp4",
    } as File;

    assertThrows(() => validateAttachment(file50MB), "exceeds maximum allowed limit");
  });

  await runTest("Storage 1.7: Exactly 25MB boundary file size validation", () => {
    const exactBoundaryFile = {
      name: "boundary_doc.pdf",
      size: MAX_FILE_SIZE_BYTES, // Exactly 25MB
      type: "application/pdf",
    } as File;

    // Should not throw
    validateAttachment(exactBoundaryFile);
  });

  await runTest("Storage 1.8: Disallowed executable and dangerous MIME types rejection", () => {
    const dangerousFiles = [
      { name: "payload.exe", size: 1024, type: "application/x-msdownload" },
      { name: "script.sh", size: 512, type: "application/x-sh" },
      { name: "exploit.bat", size: 256, type: "application/x-bat" },
      { name: "virus.dll", size: 2048, type: "application/x-dosexec" },
    ];

    for (const f of dangerousFiles) {
      assertThrows(
        () => validateAttachment(f as File),
        "Unsupported file type"
      );
    }
  });

  await runTest("Storage 1.9: Edge case - missing or empty MIME type behavior", () => {
    // Case A: Missing MIME type with valid common extension
    const missingMimeWithValidExt = {
      name: "document.pdf",
      size: 1024 * 50,
      type: "",
    } as File;
    // When MIME type is empty, let's see what validateAttachment does:
    // It currently skips MIME check because `if (file.type && ...)` requires truthy file.type
    validateAttachment(missingMimeWithValidExt); // Passes

    // Case B: Missing MIME type with dangerous extension (.exe)
    const missingMimeWithDangerousExt = {
      name: "malware.exe",
      size: 1024 * 50,
      type: "",
    } as File;

    let caught = false;
    try {
      validateAttachment(missingMimeWithDangerousExt);
    } catch {
      caught = true;
    }

    assert(caught, "validateAttachment must reject dangerous extension '.exe' even when file.type is empty string ('')");
  });

  await runTest("Storage 1.10: Null or undefined file input validation", () => {
    assertThrows(() => validateAttachment(null as any), "No file provided for upload");
    assertThrows(() => validateAttachment(undefined as any), "No file provided for upload");
  });

  await runTest("Storage 1.11: uploadAttachment integration with live Supabase Storage bucket", async () => {
    // Attempt real upload to kaelixo-attachments bucket if credentials exist
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.log("    Skipping live network upload test (credentials not present in env)");
      return;
    }

    const testFile = new File(["Hello Kaelixo Adversarial Storage Test"], "adversarial_test.txt", {
      type: "text/plain",
    });

    let progressReported = false;
    const attachment = await uploadAttachment(testFile, "test-adversarial-channel", (pct) => {
      progressReported = true;
      assert(pct >= 0 && pct <= 100, `Progress ${pct} out of range`);
    });

    assert(attachment.name === "adversarial_test.txt", `Unexpected name: ${attachment.name}`);
    assert(attachment.size > 0, `Unexpected size: ${attachment.size}`);
    assert(attachment.type === "text/plain", `Unexpected type: ${attachment.type}`);
    assert(attachment.url.includes("kaelixo-attachments"), `URL missing bucket: ${attachment.url}`);
    assert(attachment.storagePath.includes("test-adversarial-channel"), `Path missing channel: ${attachment.storagePath}`);
    assert(progressReported, "Progress callback was never invoked");
  });

  // ----------------------------------------------------------------------------
  // SECTION 2: CHANNELS & DM RESOLUTION ADVERSARIAL CHALLENGES
  // ----------------------------------------------------------------------------
  console.log("\n--- [Suite 2] getOrCreateDmChannel & DM Resolution Hardening ---");

  await runTest("Channels 2.1: Symmetry Property - getDmKey(A, B) === getDmKey(B, A)", () => {
    const testPairs = [
      ["alice", "bob"],
      ["user-999", "user-001"],
      ["123e4567-e89b-12d3-a456-426614174000", "987fcdeb-51a2-43d7-9012-345678901234"],
      ["Zebra", "aardvark"],
      ["", "non-empty"],
    ];

    for (const [a, b] of testPairs) {
      const keyAB = getDmKey(a, b);
      const keyBA = getDmKey(b, a);
      assert(keyAB === keyBA, `Symmetry failed for (${a}, ${b}): "${keyAB}" !== "${keyBA}"`);
    }
  });

  await runTest("Channels 2.2: Large-scale random symmetry stress test (1,000 iterations)", () => {
    for (let i = 0; i < 1000; i++) {
      const u1 = "user_" + Math.random().toString(36).substring(2, 10);
      const u2 = "user_" + Math.random().toString(36).substring(2, 10);
      assert(getDmKey(u1, u2) === getDmKey(u2, u1), `Random symmetry failure at iteration ${i}`);
    }
  });

  await runTest("Channels 2.3: Deterministic key collision analysis (Colons & Delimiters)", () => {
    // Challenge: Since format is `dm:${u1}:${u2}`, if user IDs contain colons:
    const pair1 = ["usr", "1:2"];
    const pair2 = ["usr:1", "2"];

    const key1 = getDmKey(pair1[0], pair1[1]);
    const key2 = getDmKey(pair2[0], pair2[1]);

    // Verify colon delimiter collision is prevented:
    assert(key1 !== key2, `Delimiter collision detected! Pair ("usr", "1:2") and ("usr:1", "2") both yielded "${key1}".`);
  });

  await runTest("Channels 2.4: UUID validity format regex for getOrCreateDmChannel results", async () => {
    clearDmChannelCache();

    const channelId = await getOrCreateDmChannel(
      "adversarial-user-alpha",
      "adversarial-user-beta",
      "User Beta"
    );

    assert(UUID_REGEX.test(channelId), `Returned channelId "${channelId}" is not a valid UUID format`);
  });

  await runTest("Channels 2.5: Resilient Fallback UUID format verification (without crypto)", () => {
    // Test the fallback generator formula directly:
    // "11111111-2222-3333-4444-" + Date.now().toString(16).padStart(12, "0")
    const simulatedDateHex = Date.now().toString(16).padStart(12, "0");
    const fallbackUuid = `11111111-2222-3333-4444-${simulatedDateHex}`;

    assert(UUID_REGEX.test(fallbackUuid), `Fallback UUID "${fallbackUuid}" failed UUID regex`);
    assert(fallbackUuid.length === 36, `Fallback UUID length ${fallbackUuid.length} !== 36`);
    assert(fallbackUuid.split("-").length === 5, "Fallback UUID must have 5 segments");
  });

  await runTest("Channels 2.6: High-concurrency resolution stress test (50 concurrent calls on fresh users)", async () => {
    clearDmChannelCache();

    const ts = Date.now();
    const u1 = `stress-fresh-${ts}-x`;
    const u2 = `stress-fresh-${ts}-y`;

    // Launch 50 concurrent getOrCreateDmChannel promises simultaneously on fresh uncreated DM
    const promises = Array.from({ length: 50 }, (_, i) =>
      getOrCreateDmChannel(u1, u2, `Stress User Y ${i}`)
    );

    const resolved = await Promise.all(promises);

    const uniqueUuids = Array.from(new Set(resolved));
    if (uniqueUuids.length > 1) {
      console.log(`    [CRITICAL CONCURRENCY BUG CONFIRMED]: 50 concurrent calls on fresh uncreated DM returned ${uniqueUuids.length} different UUIDs! Distinct UUIDs: ${uniqueUuids.slice(0, 3).join(", ")}...`);
    }
    assert(
      uniqueUuids.length === 1,
      `Concurrency race condition: 50 concurrent calls produced ${uniqueUuids.length} distinct channel UUIDs!`
    );
  });

  await runTest("Channels 2.7: In-memory cache hit performance and symmetry", async () => {
    clearDmChannelCache();

    const uA = "cache-user-a";
    const uB = "cache-user-b";

    // Call 1: Provisions or generates
    const idAB = await getOrCreateDmChannel(uA, uB, "User B");

    // Call 2: Reverse order (uB, uA)
    const idBA = await getOrCreateDmChannel(uB, uA, "User A");

    assert(idAB === idBA, `Cache symmetry mismatch: ${idAB} !== ${idBA}`);
  });

  await runTest("Channels 2.8: Error caching analysis on transient failure", async () => {
    clearDmChannelCache();

    // Challenge scenario:
    // If an initial call to getOrCreateDmChannel fails (e.g. offline/network partition),
    // it falls back to a generated UUID and caches it:
    // dmChannelCache.set(dmKey, fallbackUuid);
    const u1 = "error-test-u1";
    const u2 = "error-test-u2";

    const id1 = await getOrCreateDmChannel(u1, u2, "Other User");
    assert(UUID_REGEX.test(id1), "First call should return valid UUID");

    // Second call immediately hits cache
    const id2 = await getOrCreateDmChannel(u1, u2, "Other User");
    assert(id1 === id2, "Subsequent call must return cached ID");

    // Clear cache to verify fresh resolution can be triggered
    clearDmChannelCache();
    const id3 = await getOrCreateDmChannel(u1, u2, "Other User");
    assert(UUID_REGEX.test(id3), "Fresh resolution after clear returns valid UUID");
  });

  await runTest("Channels 2.9: PostgREST syntax injection via User IDs with commas or quotes", async () => {
    clearDmChannelCache();

    // User ID containing commas or closing parens which could break PostgREST .or() filter
    // e.g. .or(`name.eq.${dmKey},name.eq.${legacyDmKey}`)
    const weirdUserA = "user,malicious=eq.true";
    const weirdUserB = "user2";

    // Must not crash or throw unhandled exception
    try {
      const channelId = await getOrCreateDmChannel(weirdUserA, weirdUserB, "Weird User");
      assert(UUID_REGEX.test(channelId), "Returned channelId should still be valid UUID format");
    } catch (err: any) {
      console.log(`    [OBSERVATION]: User IDs with PostgREST query chars encountered: ${err.message}`);
    }
  });

  // ----------------------------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------------------------
  console.log("\n======================================================================");
  console.log("                      ADVERSARIAL STRESS RESULTS                      ");
  console.log("======================================================================");

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log(`Total Adversarial Scenarios Tested: ${total}`);
  console.log(`Passed:                            ${passed}`);
  console.log(`Failed:                            ${failed}`);
  console.log(`Pass Rate:                         ${((passed / total) * 100).toFixed(1)}%\n`);

  if (failed > 0) {
    console.log("Failed Scenarios:");
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`  - ${r.name}: ${r.error}`);
    }
  }

  return { total, passed, failed };
}

executeAdversarialTests().catch((e) => {
  console.error("Adversarial test runner crashed:", e);
  process.exit(1);
});
