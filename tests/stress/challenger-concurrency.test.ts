import { spawn } from "child_process";
import { createClient } from "../../src/lib/supabase/client";

if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // env file optional
  }
}

const supabase = createClient();

async function runEmpiricalChallenge() {
  console.log("======================================================================");
  console.log("    EMPIRICAL CHALLENGER 2: DB CONSTRAINT & CONCURRENCY VERIFICATION  ");
  console.log("======================================================================\n");

  let testPassed = true;

  // 1. Resolve default organization ID
  const { data: orgData, error: orgErr } = await supabase
    .from("organizations")
    .select("id")
    .limit(1)
    .single();

  if (orgErr || !orgData?.id) {
    throw new Error(`Failed to query organization: ${orgErr?.message}`);
  }
  const orgId = orgData.id;
  console.log(`[CHALLENGE 1] Using Organization ID: ${orgId}`);

  // Test 1: Direct SQL / Client insertion duplicate test to verify 23505
  const testDmKey = `dm:challenger_test_${Date.now()}_u1:u2`;
  console.log(`[CHALLENGE 1] Testing direct duplicate insertion for ${testDmKey}...`);

  const insertPayload1 = {
    organization_id: orgId,
    name: testDmKey,
    topic: "Challenger 2 Direct Constraint Test 1",
    is_private: true,
    is_dm: true,
  };

  const res1 = await supabase.from("channels").insert(insertPayload1).select("id").single();
  if (res1.error || !res1.data?.id) {
    console.error("  ✗ FAIL: Initial insert failed:", res1.error);
    testPassed = false;
  } else {
    console.log(`  ✓ Initial insert succeeded with ID: ${res1.data.id}`);
  }

  // Attempt duplicate insert with exact same organization_id and name, is_dm=true
  const insertPayload2 = {
    organization_id: orgId,
    name: testDmKey,
    topic: "Challenger 2 Direct Constraint Test 2 (Should Fail)",
    is_private: true,
    is_dm: true,
  };

  const res2 = await supabase.from("channels").insert(insertPayload2).select("id").single();
  if (!res2.error) {
    console.error("  ✗ FAIL: Duplicate insert succeeded! Expected 23505 unique violation.");
    testPassed = false;
  } else {
    console.log(`  ✓ Duplicate insert correctly failed with code: ${res2.error.code}, message: "${res2.error.message}"`);
    if (res2.error.code !== "23505") {
      console.warn(`    WARNING: Error code was ${res2.error.code}, expected 23505.`);
    } else {
      console.log(`  ✓ Verified PostgreSQL code 23505 (unique_violation)!`);
    }
    if (res2.error.message.includes("idx_channels_dm_name")) {
      console.log(`  ✓ Verified constraint/index name 'idx_channels_dm_name' in error message!`);
    }
  }

  // Test 2: Verify partial index behavior: non-DM with same name should NOT collide
  console.log(`\n[CHALLENGE 2] Testing partial index scope: non-DM with same name...`);
  const insertPayloadNonDm = {
    organization_id: orgId,
    name: testDmKey,
    topic: "Challenger 2 Non-DM Channel with same name",
    is_private: false,
    is_dm: false,
  };
  const resNonDm = await supabase.from("channels").insert(insertPayloadNonDm).select("id").single();
  if (resNonDm.error) {
    console.warn(`  Non-DM insert result: ${resNonDm.error.message}`);
  } else {
    console.log(`  ✓ Non-DM with same name inserted cleanly (ID: ${resNonDm.data.id}). Partial index confirmed!`);
    // Cleanup non-dm channel
    await supabase.from("channels").delete().eq("id", resNonDm.data.id);
  }

  // Cleanup test 1 channel
  if (res1.data?.id) {
    await supabase.from("channels").delete().eq("id", res1.data.id);
  }

  // Test 3: Multi-worker process concurrency test (10 independent child processes)
  console.log(`\n[CHALLENGE 3] Testing multi-process concurrency with 10 parallel workers...`);
  const freshUserA = `worker_test_a_${Date.now()}`;
  const freshUserB = `worker_test_b_${Date.now()}`;

  const workerPromises = Array.from({ length: 10 }, (_, i) => {
    return new Promise<{ workerId: number; uuid: string | null; error?: string }>((resolve) => {
      const child = spawn("npx", ["tsx", "tests/stress/concurrency-worker.ts", freshUserA, freshUserB, `User B ${i}`], {
        shell: true,
        cwd: process.cwd(),
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (d) => (stdout += d.toString()));
      child.stderr.on("data", (d) => (stderr += d.toString()));

      child.on("close", (code) => {
        if (code !== 0) {
          resolve({ workerId: i, uuid: null, error: stderr || stdout });
        } else {
          const match = stdout.match(/RESOLVED_UUID:([a-f0-9-]+)/i);
          resolve({ workerId: i, uuid: match ? match[1] : null, error: match ? undefined : stdout });
        }
      });
    });
  });

  const workerResults = await Promise.all(workerPromises);
  const resolvedUuids = workerResults.map((r) => r.uuid).filter(Boolean) as string[];
  const failedWorkers = workerResults.filter((r) => !r.uuid);

  console.log(`  Total Workers: 10`);
  console.log(`  Successful Resolutions: ${resolvedUuids.length}`);
  console.log(`  Failed Workers: ${failedWorkers.length}`);

  if (failedWorkers.length > 0) {
    console.error("  ✗ FAIL: One or more workers encountered errors:");
    for (const f of failedWorkers) {
      console.error(`    Worker ${f.workerId}: ${f.error}`);
    }
    testPassed = false;
  }

  const distinctUuids = Array.from(new Set(resolvedUuids));
  console.log(`  Distinct UUIDs resolved across 10 processes: ${distinctUuids.length}`);
  console.log(`  Resolved UUID: ${distinctUuids[0]}`);

  if (distinctUuids.length !== 1) {
    console.error(`  ✗ FAIL: Race condition! Workers returned ${distinctUuids.length} different UUIDs:`, distinctUuids);
    testPassed = false;
  } else {
    console.log(`  ✓ PASS: All 10 independent processes coalesced to the exact same UUID!`);
  }

  // Verify in database that exactly ONE row exists for this DM key
  const { data: dbRows, error: dbErr } = await supabase
    .from("channels")
    .select("id, name, is_dm")
    .eq("is_dm", true)
    .ilike("name", `%${freshUserA}%`);

  if (dbErr) {
    console.error("  ✗ DB query error:", dbErr);
    testPassed = false;
  } else {
    console.log(`  Live DB rows found for this DM key: ${dbRows?.length}`);
    if (dbRows?.length === 1 && dbRows[0].id === distinctUuids[0]) {
      console.log(`  ✓ PASS: Exactly 1 channel row exists in DB matching the resolved UUID!`);
    } else {
      console.error(`  ✗ FAIL: Expected exactly 1 DB row with ID ${distinctUuids[0]}, got:`, dbRows);
      testPassed = false;
    }
  }

  // Cleanup test DM channel created by workers
  if (dbRows && dbRows.length > 0) {
    for (const row of dbRows) {
      await supabase.from("channels").delete().eq("id", row.id);
      console.log(`  Cleaned up temporary worker test channel: ${row.id}`);
    }
  }

  // Test 4: Live database duplicate check
  console.log(`\n[CHALLENGE 4] Auditing live database for any duplicate DM channels...`);
  const { data: dupData, error: dupErr } = await supabase
    .from("channels")
    .select("name")
    .eq("is_dm", true);

  if (dupErr) {
    console.error("  ✗ Failed to query channels:", dupErr);
    testPassed = false;
  } else {
    const counts = new Map<string, number>();
    for (const row of dupData || []) {
      counts.set(row.name, (counts.get(row.name) || 0) + 1);
    }
    const duplicates = Array.from(counts.entries()).filter(([_, count]) => count > 1);
    console.log(`  Total DM channels currently in DB: ${dupData?.length}`);
    console.log(`  Duplicate DM channel groups: ${duplicates.length}`);
    if (duplicates.length > 0) {
      console.error("  ✗ FAIL: Found duplicate DM channels in DB:", duplicates);
      testPassed = false;
    } else {
      console.log(`  ✓ PASS: Zero duplicate DM channels in database!`);
    }
  }

  console.log("\n======================================================================");
  if (testPassed) {
    console.log("            ALL EMPIRICAL CHALLENGER TESTS PASSED (100%)              ");
  } else {
    console.log("            EMPIRICAL CHALLENGER TESTS ENCOUNTERED FAILURES           ");
  }
  console.log("======================================================================\n");

  if (!testPassed) {
    process.exit(1);
  }
}

runEmpiricalChallenge().catch((err) => {
  console.error("Unhandled challenger error:", err);
  process.exit(1);
});
