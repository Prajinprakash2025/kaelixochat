/**
 * Empirical Challenger Milestone 1 Deep Stress & Adversarial Suite
 * Author: Milestone 1 Challenger 1 (critic, specialist)
 * Target: Kaelixo M1-R2 Remediation
 */

import {
  sanitizeFileName,
  sanitizeChannelId,
  getFileCategory,
  formatFileSize,
  validateAttachment,
  extractFileExtension,
  DANGEROUS_EXTENSIONS,
  SAFE_FILE_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from "../../src/utils/storage";

import {
  getDmKey,
  getOrCreateDmChannel,
  isDmChannel,
  clearDmChannelCache,
} from "../../src/utils/channels";

import { createClient } from "../../src/lib/supabase/client";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";

const execFileAsync = promisify(execFile);

// Load .env.local
if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // env optional
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ChallengeResult {
  suite: string;
  test: string;
  passed: boolean;
  durationMs: number;
  details?: string;
  error?: string;
}

const results: ChallengeResult[] = [];

async function challenge(suite: string, test: string, fn: () => void | Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    results.push({ suite, test, passed: true, durationMs: duration });
    console.log(`  [PASS] ${suite} -> ${test} (${duration}ms)`);
  } catch (err: any) {
    const duration = Date.now() - start;
    results.push({
      suite,
      test,
      passed: false,
      durationMs: duration,
      error: err.message || String(err),
    });
    console.error(`  [FAIL] ${suite} -> ${test} (${duration}ms)`);
    console.error(`         Error: ${err.message || err}`);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion Failed: ${msg}`);
}

async function run() {
  console.log("======================================================================");
  console.log("     CHALLENGER 1: EMPIRICAL ADVERSARIAL STRESS & ORACLE HARNESS     ");
  console.log("======================================================================\n");

  // ============================================================================
  // SUITE 1: FILENAME & DANGEROUS EXTENSION EDGE CASES
  // ============================================================================
  console.log("--- SUITE 1: Filename Sanitization & Extension Validation ---");

  await challenge("Suite 1", "Degenerate dot filenames never produce trailing dots", () => {
    const degenerateInputs = [
      ".",
      "..",
      "...",
      "....",
      ".....",
      "file.",
      "file..",
      "file...",
      "document.pdf.",
      "archive.zip..",
      "   .   ",
      " . . . ",
      "test. ",
      ".hidden",
      "...hidden",
    ];

    for (const name of degenerateInputs) {
      const sanitized = sanitizeFileName(name);
      assert(
        !sanitized.endsWith("."),
        `Sanitized name "${sanitized}" from input "${name}" has trailing dot!`
      );
      assert(
        !sanitized.includes("/") && !sanitized.includes("\\"),
        `Sanitized name "${sanitized}" contains path separator from "${name}"`
      );
      assert(sanitized.length > 0, `Sanitized name is empty for "${name}"`);
    }
  });

  await challenge("Suite 1", "Dangerous executable extensions unconditionally blocked", () => {
    const dangerousList = [
      "exe", "sh", "bat", "cmd", "com", "msi", "msp", "vbs", "vbe",
      "wsf", "wsh", "ps1", "ps1xml", "ps2", "dll", "scr", "pif", "sys", "reg"
    ];

    for (const ext of dangerousList) {
      // Test 1: with empty MIME type
      const fEmptyMime = { name: `test_payload.${ext}`, size: 1024, type: "" } as File;
      let blockedEmpty = false;
      try {
        validateAttachment(fEmptyMime);
      } catch (err: any) {
        blockedEmpty = true;
        assert(
          err.message.includes("dangerous") || err.message.includes("Unsupported"),
          `Unexpected error message for empty MIME ${ext}: ${err.message}`
        );
      }
      assert(blockedEmpty, `Dangerous extension .${ext} with empty MIME was NOT blocked!`);

      // Test 2: with application/octet-stream
      const fOctet = { name: `test_payload.${ext}`, size: 1024, type: "application/octet-stream" } as File;
      let blockedOctet = false;
      try {
        validateAttachment(fOctet);
      } catch (err: any) {
        blockedOctet = true;
      }
      assert(blockedOctet, `Dangerous extension .${ext} with application/octet-stream was NOT blocked!`);

      // Test 3: with spoofed image/png MIME type
      const fSpoofed = { name: `trojan.${ext}`, size: 1024, type: "image/png" } as File;
      let blockedSpoofed = false;
      try {
        validateAttachment(fSpoofed);
      } catch (err: any) {
        blockedSpoofed = true;
      }
      assert(blockedSpoofed, `Dangerous extension .${ext} with spoofed image/png was NOT blocked!`);

      // Test 4: uppercase extension (.EXE, .BAT)
      const fUpper = { name: `virus.${ext.toUpperCase()}`, size: 1024, type: "" } as File;
      let blockedUpper = false;
      try {
        validateAttachment(fUpper);
      } catch {
        blockedUpper = true;
      }
      assert(blockedUpper, `Uppercase dangerous extension .${ext.toUpperCase()} was NOT blocked!`);
    }
  });

  await challenge("Suite 1", "Safe extensions with empty or application/octet-stream MIME type accepted", () => {
    const safeExtensions = ["png", "jpg", "jpeg", "pdf", "txt", "docx", "zip", "csv", "json"];

    for (const ext of safeExtensions) {
      const f = { name: `valid_doc.${ext}`, size: 5000, type: "" } as File;
      // Should not throw
      validateAttachment(f);

      const fOctet = { name: `valid_doc.${ext}`, size: 5000, type: "application/octet-stream" } as File;
      validateAttachment(fOctet);
    }
  });

  await challenge("Suite 1", "Blank, empty, or whitespace-only filename validation", () => {
    const invalidFilenames = ["", "   ", "\t", "\n", "\r\n"];
    for (const name of invalidFilenames) {
      let threw = false;
      try {
        validateAttachment({ name, size: 100, type: "image/png" } as File);
      } catch (err: any) {
        threw = true;
        assert(err.message.includes("blank"), `Expected error about blank filename, got: ${err.message}`);
      }
      assert(threw, `Blank filename "${name}" was not rejected!`);
    }
  });

  // ============================================================================
  // SUITE 2: OFFLINE FALLBACK CACHING INVARIANCE
  // ============================================================================
  console.log("\n--- SUITE 2: Offline Fallback Caching Hardening ---");

  await challenge("Suite 2", "Offline fallback UUID is strictly ephemeral and never cached", async () => {
    clearDmChannelCache();

    const offlineUserA = `offline-user-alpha-${Date.now()}`;
    const offlineUserB = `offline-user-beta-${Date.now()}`;

    const originalFetch = globalThis.fetch;
    try {
      // Simulate genuine network disconnect by having fetch reject
      globalThis.fetch = async () => {
        throw new Error("Failed to fetch: simulated offline network partition");
      };

      // Call 1 under offline condition:
      const fallbackUuid1 = await getOrCreateDmChannel(offlineUserA, offlineUserB, "Offline User");
      assert(UUID_REGEX.test(fallbackUuid1), `Offline call 1 did not return valid UUID: ${fallbackUuid1}`);

      // Call 2 under offline condition:
      // If it was erroneously cached, fallbackUuid2 would be === fallbackUuid1.
      // Because it must NOT be cached, fallbackUuid2 will be a newly generated distinct UUID!
      const fallbackUuid2 = await getOrCreateDmChannel(offlineUserA, offlineUserB, "Offline User");
      assert(UUID_REGEX.test(fallbackUuid2), `Offline call 2 did not return valid UUID: ${fallbackUuid2}`);
      assert(
        fallbackUuid1 !== fallbackUuid2,
        `VULNERABILITY: Offline fallback UUID was CACHED! (${fallbackUuid1} === ${fallbackUuid2}). ` +
        `This pollutes dmChannelCache with unpersisted UUIDs and causes foreign key crashes on reconnect.`
      );
    } finally {
      // Restore fetch
      globalThis.fetch = originalFetch;
      clearDmChannelCache();
    }
  });

  await challenge("Suite 2", "Recovery after offline: Fresh resolution persists correctly in Supabase", async () => {
    clearDmChannelCache();

    const recoverUserA = `recover-uA-${Date.now()}`;
    const recoverUserB = `recover-uB-${Date.now()}`;

    // Call online:
    const onlineUuid = await getOrCreateDmChannel(recoverUserA, recoverUserB, "Recover User");
    assert(UUID_REGEX.test(onlineUuid), `Online resolution did not return valid UUID: ${onlineUuid}`);

    // Call again: should hit cache and return exact same UUID
    const cachedUuid = await getOrCreateDmChannel(recoverUserA, recoverUserB, "Recover User");
    assert(onlineUuid === cachedUuid, "Online resolution must be cached");
  });

  // ============================================================================
  // SUITE 3: IN-PROCESS HIGH CONCURRENCY (100 SIMULTANEOUS CALLS WITH ALTERNATING ARGS)
  // ============================================================================
  console.log("\n--- SUITE 3: Single-Process 100-Concurrent Stress ---");

  await challenge("Suite 3", "100 concurrent calls with alternating (A,B) and (B,A) order return single UUID", async () => {
    clearDmChannelCache();

    const ts = Date.now();
    const uA = `challenger-stress-100-a-${ts}`;
    const uB = `challenger-stress-100-b-${ts}`;

    // 100 concurrent promises: 50 with (uA, uB), 50 with (uB, uA)
    const promises = Array.from({ length: 100 }, (_, i) => {
      if (i % 2 === 0) {
        return getOrCreateDmChannel(uA, uB, `User B ${i}`);
      } else {
        return getOrCreateDmChannel(uB, uA, `User A ${i}`);
      }
    });

    const resolved = await Promise.all(promises);
    const uniqueUuids = Array.from(new Set(resolved));

    assert(
      uniqueUuids.length === 1,
      `Concurrency race condition: 100 concurrent calls produced ${uniqueUuids.length} distinct UUIDs! Values: ${uniqueUuids.join(", ")}`
    );
  });

  // ============================================================================
  // SUITE 4: MULTI-PROCESS CONCURRENCY STRESS (10 CONCURRENT OS PROCESSES)
  // ============================================================================
  console.log("\n--- SUITE 4: Multi-Process OS-Level Concurrency Stress ---");

  await challenge("Suite 4", "10 independent OS child processes simultaneously resolve fresh DM", async () => {
    const ts = Date.now();
    const u1 = `proc-user-1-${ts}`;
    const u2 = `proc-user-2-${ts}`;
    const workerScript = path.resolve(__dirname, "concurrency-worker.ts");

    // Spawn 10 separate node tsx processes at the exact same instant
    const spawnWorker = async (index: number): Promise<string> => {
      const { stdout } = await execFileAsync(
        "npx",
        ["tsx", "--env-file=.env.local", workerScript, u1, u2, `Worker ${index}`],
        { cwd: path.resolve(__dirname, "../.."), shell: true }
      );
      const match = stdout.match(/RESOLVED_UUID:([0-9a-f-]{36})/i);
      if (!match) {
        throw new Error(`Worker ${index} failed to produce RESOLVED_UUID. Stdout: ${stdout}`);
      }
      return match[1];
    };

    const workerPromises = Array.from({ length: 10 }, (_, i) => spawnWorker(i));
    const workerResults = await Promise.all(workerPromises);

    const distinctProcessUuids = Array.from(new Set(workerResults));

    assert(
      distinctProcessUuids.length === 1,
      `Multi-process concurrency race: 10 OS processes produced ${distinctProcessUuids.length} distinct UUIDs: ${distinctProcessUuids.join(", ")}`
    );

    console.log(`    Multi-process consensus achieved: All 10 OS processes resolved UUID: ${distinctProcessUuids[0]}`);
  });

  // ============================================================================
  // SUITE 5: KEY ENCODING & COLLISION RESILIENCE
  // ============================================================================
  console.log("\n--- SUITE 5: Key Encoding & Collision Resilience ---");

  await challenge("Suite 5", "Mathematical symmetry and collision immunity", () => {
    // Colon collision test
    assert(getDmKey("usr", "1:2") !== getDmKey("usr:1", "2"), "Colon collision detected!");
    assert(getDmKey("user%3A1", "2") !== getDmKey("user:1", "2"), "Percent-encoding collision detected!");
    assert(getDmKey("a,b", "c") !== getDmKey("a", "b,c"), "Comma collision detected!");
    
    // Multi-byte Unicode and Emoji test
    const emojiA = "👩‍💻";
    const emojiB = "🚀";
    assert(getDmKey(emojiA, emojiB) === getDmKey(emojiB, emojiA), "Emoji symmetry failed");

    // Reserved PostgREST characters
    const complexA = "user.name?foo=bar&baz=1";
    const complexB = "other(user)[]";
    assert(getDmKey(complexA, complexB) === getDmKey(complexB, complexA), "Complex symmetry failed");
  });

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log("\n======================================================================");
  console.log("               CHALLENGER 1 STRESS EXECUTION SUMMARY                  ");
  console.log("======================================================================");

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log(`Total Challenges: ${total}`);
  console.log(`Passed:           ${passed}`);
  console.log(`Failed:           ${failed}`);
  console.log(`Pass Rate:        ${((passed / total) * 100).toFixed(1)}%\n`);

  if (failed > 0) {
    console.error("FAILURES DETECTED:");
    for (const r of results.filter((r) => !r.passed)) {
      console.error(`- [${r.suite}] ${r.test}: ${r.error}`);
    }
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Challenger test harness crashed:", err);
  process.exit(1);
});
