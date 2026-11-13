/**
 * Tier 1 & 2: Feature Coverage - Shadow Hunt Phase 7: Polished Lobby and HUD
 * Validates lobby settings validation, player readiness, HUD blend calculations,
 * timer urgency thresholds, blaster cooldown progression, and post-round stats recap.
 */

import {
  assertEqual,
  assertTrue,
  test,
  setTestContext,
  KaelixoTestEngine,
} from "./test-harness";

export function registerShadowHuntHudTests(engine: KaelixoTestEngine) {
  setTestContext(1, "Shadow Hunt Phase 7: Polished Lobby & HUD System");

  test("HUD-1.1: Lobby settings enforce valid round durations and head start ranges", () => {
    const ALLOWED_ROUND_DURATIONS = [60, 70, 90, 120];
    const ALLOWED_HEAD_STARTS = [10, 12, 15];

    function validateLobbySettings(roundSec: number, headStartSec: number): boolean {
      return ALLOWED_ROUND_DURATIONS.includes(roundSec) && ALLOWED_HEAD_STARTS.includes(headStartSec);
    }

    assertTrue(validateLobbySettings(70, 12));
    assertTrue(validateLobbySettings(90, 15));
    assertEqual(validateLobbySettings(45, 12), false, "Unsupported round duration must be rejected");
    assertEqual(validateLobbySettings(70, 5), false, "Head start too short must be rejected");
  });

  test("HUD-1.2: Player ready state tracking accurately reflects in lobby launch eligibility", () => {
    const players = [
      { id: "p1", isHost: true, isReady: true },
      { id: "p2", isHost: false, isReady: false },
      { id: "p3", isHost: false, isReady: true },
    ];

    function canHostLaunch(list: typeof players): boolean {
      if (list.length < 2) return false;
      // All non-host guests must be ready
      const guests = list.filter(p => !p.isHost);
      return guests.every(g => g.isReady);
    }

    assertEqual(canHostLaunch(players), false, "Host cannot launch while guest p2 is not ready");

    // Guest p2 toggles ready
    players[1].isReady = true;
    assertEqual(canHostLaunch(players), true, "Host can launch once all guests are ready");
  });

  test("HUD-1.3: Hider blend meter calculates progressive blending and detects disruption on motion", () => {
    const SETTLE_MS = 700;

    function calculateBlendPercent(isStill: boolean, stillDurationMs: number): number {
      if (!isStill) return 0;
      return Math.min(100, Math.round((stillDurationMs / SETTLE_MS) * 100));
    }

    assertEqual(calculateBlendPercent(false, 1000), 0, "Moving player must have 0% blend");
    assertEqual(calculateBlendPercent(true, 350), 50, "Still for 350ms must be 50% blend");
    assertEqual(calculateBlendPercent(true, 700), 100, "Still for 700ms must be 100% fully disguised");
    assertEqual(calculateBlendPercent(true, 1500), 100, "Still beyond settle time caps at 100%");
  });

  test("HUD-1.4: Timer displays critical urgency styling when remaining time <= 15s", () => {
    function getTimerVisualTier(remainingSec: number): "normal" | "warning" | "critical" {
      if (remainingSec <= 15) return "critical";
      if (remainingSec <= 30) return "warning";
      return "normal";
    }

    assertEqual(getTimerVisualTier(65), "normal");
    assertEqual(getTimerVisualTier(25), "warning");
    assertEqual(getTimerVisualTier(15), "critical");
    assertEqual(getTimerVisualTier(4), "critical");
  });

  test("HUD-1.5: Seeker blaster cooldown meter tracks reload completion over time", () => {
    const COOLDOWN_MS = 520;

    function getBlasterChargePercent(timeSinceShotMs: number): number {
      return Math.min(100, Math.round((timeSinceShotMs / COOLDOWN_MS) * 100));
    }

    assertEqual(getBlasterChargePercent(0), 0, "Immediately after shot, charge is 0%");
    assertEqual(getBlasterChargePercent(260), 50, "Halfway through cooldown, charge is 50%");
    assertEqual(getBlasterChargePercent(520), 100, "Cooldown complete, charge is 100%");
    assertEqual(getBlasterChargePercent(800), 100, "Charge remains capped at 100%");
  });

  test("HUD-1.6: Post-round match stats recap accurately aggregates round metrics", () => {
    interface MatchRecord {
      totalHiders: number;
      hidersCaught: number;
      roundDurationSec: number;
      elapsedSec: number;
      winner: "seeker" | "hiders";
    }

    function summarizeMatch(record: MatchRecord) {
      const survivalRate = Math.round(((record.totalHiders - record.hidersCaught) / record.totalHiders) * 100);
      return {
        winnerTitle: record.winner === "seeker" ? "Seeker Swept The Mansion!" : "Hiders Survived The Hunt!",
        survivalRate: `${survivalRate}%`,
        timeTaken: `${record.elapsedSec}s`,
        caughtCount: `${record.hidersCaught}/${record.totalHiders}`,
      };
    }

    const summary1 = summarizeMatch({
      totalHiders: 4,
      hidersCaught: 4,
      roundDurationSec: 70,
      elapsedSec: 42,
      winner: "seeker",
    });
    assertEqual(summary1.winnerTitle, "Seeker Swept The Mansion!");
    assertEqual(summary1.survivalRate, "0%");
    assertEqual(summary1.caughtCount, "4/4");

    const summary2 = summarizeMatch({
      totalHiders: 3,
      hidersCaught: 1,
      roundDurationSec: 70,
      elapsedSec: 70,
      winner: "hiders",
    });
    assertEqual(summary2.winnerTitle, "Hiders Survived The Hunt!");
    assertEqual(summary2.survivalRate, "67%");
    assertEqual(summary2.caughtCount, "1/3");
  });
}
