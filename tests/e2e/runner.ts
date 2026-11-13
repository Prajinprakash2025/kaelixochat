/**
 * Kaelixo Slack-Parity E2E Test Suite - Master Runner
 * Programmatic, zero-external-setup test runner executing Tiers 1-4.
 */

import { KaelixoTestEngine, clearRegistry, executeAllTests, setBeforeEach } from "./test-harness";
import { registerTier1R1Tests } from "./tier1-feature-coverage/r1-attachments.test";
import { registerTier1R2Tests } from "./tier1-feature-coverage/r2-reactions.test";
import { registerTier1R3Tests } from "./tier1-feature-coverage/r3-threads.test";
import { registerTier1R4Tests } from "./tier1-feature-coverage/r4-message-management.test";
import { registerTier1R5Tests } from "./tier1-feature-coverage/r5-presence-notifications.test";
import { registerTier1R6Tests } from "./tier1-feature-coverage/r6-schema-migrations.test";

import { registerTier2R1Tests } from "./tier2-boundary-corner/r1-attachments-boundary.test";
import { registerTier2R2Tests } from "./tier2-boundary-corner/r2-reactions-boundary.test";
import { registerTier2R3Tests } from "./tier2-boundary-corner/r3-threads-boundary.test";
import { registerTier2R4Tests } from "./tier2-boundary-corner/r4-management-boundary.test";
import { registerTier2R5Tests } from "./tier2-boundary-corner/r5-presence-boundary.test";
import { registerTier2R6Tests } from "./tier2-boundary-corner/r6-schema-boundary.test";

import { registerTier3Tests } from "./tier3-cross-feature/cross-feature-combinations.test";
import { registerTier4Tests } from "./tier4-real-world/real-world-scenarios.test";
import { registerShadowHuntMpTests } from "./shadow-hunt-mp.test";
import { registerShadowHuntHudTests } from "./shadow-hunt-hud.test";

// ANSI Terminal Colors
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const GRAY = "\x1b[90m";

async function run() {
  console.log(`\n${BOLD}${CYAN}======================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}       KAELIXO SLACK-PARITY COMPLETE E2E TEST RUNNER (TIERS 1-4)      ${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================================${RESET}\n`);

  const engine = new KaelixoTestEngine();
  clearRegistry();
  setBeforeEach(() => engine.reset());

  // Register Tier 1: Feature Coverage (R1 - R6)
  registerTier1R1Tests(engine);
  registerTier1R2Tests(engine);
  registerTier1R3Tests(engine);
  registerTier1R4Tests(engine);
  registerTier1R5Tests(engine);
  registerTier1R6Tests(engine);
  registerShadowHuntMpTests(engine);
  registerShadowHuntHudTests(engine);

  // Register Tier 2: Boundary & Corner Cases (R1 - R6)
  registerTier2R1Tests(engine);
  registerTier2R2Tests(engine);
  registerTier2R3Tests(engine);
  registerTier2R4Tests(engine);
  registerTier2R5Tests(engine);
  registerTier2R6Tests(engine);

  // Register Tier 3: Cross-Feature Combinations
  registerTier3Tests(engine);

  // Register Tier 4: Real-World Scenarios
  registerTier4Tests(engine);

  console.log(`${GRAY}Initialized test registry. Executing hermetic test suites...${RESET}\n`);

  const { results, summary } = await executeAllTests();

  // Group and display by tier and suite
  let currentTier = -1;
  let currentSuite = "";

  for (const r of results) {
    if (r.tier !== currentTier) {
      currentTier = r.tier;
      const tierInfo = summary.tiers[currentTier];
      console.log(`\n${BOLD}${YELLOW}--- [Tier ${currentTier}] ${tierInfo?.name || ""} ---${RESET}`);
    }

    if (r.suite !== currentSuite) {
      currentSuite = r.suite;
      console.log(`  ${BOLD}${CYAN}• Suite: ${currentSuite}${RESET}`);
    }

    if (r.passed) {
      console.log(`    ${GREEN}✓${RESET} ${r.name} ${GRAY}(${r.durationMs}ms)${RESET}`);
    } else {
      console.log(`    ${RED}✗ ${r.name} (${r.durationMs}ms)${RESET}`);
      console.log(`      ${RED}Error: ${r.error}${RESET}`);
    }
  }

  // Final Summary Report
  console.log(`\n${BOLD}${CYAN}======================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}                           TEST EXECUTION SUMMARY                     ${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================================${RESET}`);

  for (const tierId of [1, 2, 3, 4]) {
    const t = summary.tiers[tierId];
    if (t) {
      const statusColor = t.failed === 0 ? GREEN : RED;
      console.log(
        `  ${BOLD}Tier ${tierId}${RESET} (${t.name}): ${statusColor}${t.passed}/${t.total} Passed${RESET}`
      );
    }
  }

  console.log(`----------------------------------------------------------------------`);
  console.log(`  ${BOLD}Total Tests Run:${RESET}  ${summary.total}`);
  console.log(`  ${BOLD}Passed:${RESET}          ${GREEN}${summary.passed}${RESET}`);
  console.log(`  ${BOLD}Failed:${RESET}          ${summary.failed > 0 ? RED : GREEN}${summary.failed}${RESET}`);
  console.log(`  ${BOLD}Total Duration:${RESET}  ${summary.durationMs}ms`);
  const passPercent = ((summary.passed / summary.total) * 100).toFixed(1);
  console.log(`  ${BOLD}Pass Rate:${RESET}        ${summary.failed === 0 ? GREEN : RED}${passPercent}%${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================================${RESET}\n`);

  if (summary.failed > 0) {
    console.error(`${RED}${BOLD}E2E TEST RUN FAILED: ${summary.failed} test(s) encountered errors.${RESET}\n`);
    process.exit(1);
  } else {
    console.log(`${GREEN}${BOLD}ALL E2E TESTS PASSED SUCCESSFULLY! (100% Pass Rate)${RESET}\n`);
    process.exit(0);
  }
}

run().catch((err) => {
  console.error(`${RED}Fatal runner exception: ${err}${RESET}`);
  process.exit(1);
});
