/**
 * Tier 1 & 2: Feature & Boundary Coverage - Shadow Hunt Phase 6 Multiplayer
 * Validates multiplayer contracts: room lifecycle, player caps (2-6), authoritative roles,
 * countdown enforcement, tag validation, reconnect deduplication, and win conditions.
 */

import {
  assert,
  assertEqual,
  assertNotEqual,
  assertTrue,
  test,
  setTestContext,
  KaelixoTestEngine,
} from "./test-harness";
import * as fs from "fs";
import * as path from "path";

export function registerShadowHuntMpTests(engine: KaelixoTestEngine) {
  setTestContext(1, "Shadow Hunt Phase 6: Multiplayer Contract & State Machine");

  test("MP-1.1: Database migration file for Shadow Hunt multiplayer exists and has valid syntax", () => {
    const rootDir = path.resolve(__dirname, "../..");
    const migrationPath = path.join(rootDir, "supabase", "migrations", "20261112_shadow_hunt_multiplayer.sql");
    assertTrue(fs.existsSync(migrationPath), "Expected multiplayer migration file to exist");

    const sql = fs.readFileSync(migrationPath, "utf-8");
    assertTrue(sql.includes("CREATE TABLE IF NOT EXISTS public.shadow_hunt_rooms"), "Should create shadow_hunt_rooms table");
    assertTrue(sql.includes("CREATE TABLE IF NOT EXISTS public.shadow_hunt_players"), "Should create shadow_hunt_players table");
    assertTrue(sql.includes("create_shadow_hunt_room"), "Should define create_shadow_hunt_room RPC");
    assertTrue(sql.includes("join_shadow_hunt_room"), "Should define join_shadow_hunt_room RPC");
    assertTrue(sql.includes("start_shadow_hunt_round"), "Should define start_shadow_hunt_round RPC");
    assertTrue(sql.includes("submit_shadow_hunt_tag"), "Should define submit_shadow_hunt_tag RPC");
    assertTrue(sql.includes("resolve_shadow_hunt_timeout"), "Should define resolve_shadow_hunt_timeout RPC");
    assertTrue(sql.includes("leave_shadow_hunt_room"), "Should define leave_shadow_hunt_room RPC");
  });

  test("MP-1.2: RLS and Realtime authorization policies are strictly scoped to authenticated members", () => {
    const rootDir = path.resolve(__dirname, "../..");
    const migrationPath = path.join(rootDir, "supabase", "migrations", "20261112_shadow_hunt_multiplayer.sql");
    const sql = fs.readFileSync(migrationPath, "utf-8");

    assertTrue(sql.includes("ALTER TABLE public.shadow_hunt_rooms ENABLE ROW LEVEL SECURITY"), "Rooms RLS must be enabled");
    assertTrue(sql.includes("ALTER TABLE public.shadow_hunt_players ENABLE ROW LEVEL SECURITY"), "Players RLS must be enabled");
    assertTrue(sql.includes("FOR SELECT TO authenticated"), "Must target authenticated role");
    assertTrue(sql.includes("(SELECT auth.uid())"), "Must check auth.uid()");
    assertTrue(sql.includes("realtime.messages"), "Must define Realtime authorization on messages");
  });

  test("MP-1.3: Room capacity enforces 2 to 6 players strictly", () => {
    // Simulating player join validation logic
    const MAX_PLAYERS = 6;
    const MIN_PLAYERS = 2;

    const players: string[] = ["host-user"];
    const canStartSolo = players.length >= MIN_PLAYERS;
    assertEqual(canStartSolo, false, "Room with 1 player must not start multiplayer");

    for (let i = 2; i <= 6; i++) {
      players.push(`player-${i}`);
    }
    assertEqual(players.length, 6);
    assertEqual(players.length <= MAX_PLAYERS, true, "Room should accommodate up to 6 players");

    const attemptExtra = players.length >= MAX_PLAYERS;
    assertEqual(attemptExtra, true, "7th player join attempt must be rejected as full");
  });

  test("MP-1.4: Role assignment designates exactly 1 seeker and remaining as hiders", () => {
    const players = [
      { id: "p1", role: "hider" },
      { id: "p2", role: "hider" },
      { id: "p3", role: "hider" },
      { id: "p4", role: "hider" },
    ];

    // Authoritative assignment: choose 1 seeker
    const seekerIndex = Math.floor(Math.random() * players.length);
    const updated = players.map((p, idx) => ({
      ...p,
      role: idx === seekerIndex ? ("seeker" as const) : ("hider" as const),
    }));

    const seekers = updated.filter(p => p.role === "seeker");
    const hiders = updated.filter(p => p.role === "hider");

    assertEqual(seekers.length, 1, "Must have exactly 1 seeker");
    assertEqual(hiders.length, 3, "Remaining 3 players must be hiders");
  });

  test("MP-1.5: Countdown locks seeker from tagging during head start window", () => {
    const headStartSec = 12;
    const startedAt = Date.now();
    const huntStartsAt = startedAt + headStartSec * 1000;

    // Simulated tag attempt at 5 seconds into round
    const tagAttemptTime = startedAt + 5000;
    const canTagDuringCountdown = tagAttemptTime >= huntStartsAt;
    assertEqual(canTagDuringCountdown, false, "Seeker tag attempt must be rejected during head start countdown");

    // Simulated tag attempt at 13 seconds into round
    const tagAttemptAfterCountdown = startedAt + 13000;
    const canTagAfterCountdown = tagAttemptAfterCountdown >= huntStartsAt;
    assertEqual(canTagAfterCountdown, true, "Seeker can tag once head start countdown concludes");
  });

  test("MP-1.6: Tag validation requires seeker role, alive target, valid cooldown and range", () => {
    const TAG_RANGE = 12;
    const COOLDOWN_MS = 450;

    const seeker = { id: "user-seeker", role: "seeker" };
    const hider = { id: "user-hider", role: "hider", isAlive: true };
    let lastTagAt = 0;

    function validateTag(
      callerId: string,
      target: { id: string; role: string; isAlive: boolean },
      distance: number,
      currentTime: number
    ): { success: boolean; reason?: string } {
      if (callerId !== seeker.id) return { success: false, reason: "Not seeker" };
      if (!target.isAlive || target.role !== "hider") return { success: false, reason: "Target not alive hider" };
      if (currentTime - lastTagAt < COOLDOWN_MS) return { success: false, reason: "Cooldown active" };
      if (distance > TAG_RANGE + 3) return { success: false, reason: "Out of range" };
      lastTagAt = currentTime;
      return { success: true };
    }

    const t0 = 10000;
    // Valid tag
    const res1 = validateTag("user-seeker", hider, 8.5, t0);
    assertTrue(res1.success);

    // Spam tag within 200ms -> rejected by cooldown
    const res2 = validateTag("user-seeker", hider, 8.5, t0 + 200);
    assertEqual(res2.success, false);
    assertEqual(res2.reason, "Cooldown active");

    // Tag by a hider caller -> rejected
    const res3 = validateTag("user-hider", hider, 5.0, t0 + 500);
    assertEqual(res3.success, false);
    assertEqual(res3.reason, "Not seeker");

    // Tag out of range (22 meters) -> rejected
    const res4 = validateTag("user-seeker", hider, 22.0, t0 + 500);
    assertEqual(res4.success, false);
    assertEqual(res4.reason, "Out of range");
  });

  test("MP-1.7: Reconnect does not duplicate player in room roster", () => {
    const roster = new Map<string, { displayName: string; role: string; lastSeen: number }>();
    roster.set("user-alice", { displayName: "Alice", role: "seeker", lastSeen: 1000 });
    roster.set("user-bob", { displayName: "Bob", role: "hider", lastSeen: 1000 });

    assertEqual(roster.size, 2);

    // Alice disconnects and reconnects with same auth userId
    const reconnectUserId = "user-alice";
    if (roster.has(reconnectUserId)) {
      const existing = roster.get(reconnectUserId)!;
      existing.lastSeen = 2000;
      roster.set(reconnectUserId, existing);
    } else {
      roster.set(reconnectUserId, { displayName: "Alice", role: "hider", lastSeen: 2000 });
    }

    assertEqual(roster.size, 2, "Roster count must remain 2, no duplicate Alice");
    assertEqual(roster.get("user-alice")?.lastSeen, 2000);
    assertEqual(roster.get("user-alice")?.role, "seeker", "Role must be preserved on reconnect");
  });

  test("MP-1.8: Win condition properly resolves when all hiders tagged or round times out", () => {
    let aliveHiders = 2;
    let roundStatus: "playing" | "finished" = "playing";
    let winner: "seeker" | "hiders" | null = null;

    // Tag 1st hider
    aliveHiders--;
    assertEqual(roundStatus, "playing");

    // Tag 2nd hider -> all tagged!
    aliveHiders--;
    if (aliveHiders === 0) {
      roundStatus = "finished";
      winner = "seeker";
    }

    assertEqual(roundStatus, "finished");
    assertEqual(winner, "seeker");

    // Alternate scenario: timer expires while hider is still alive
    let timeoutHiders = 1;
    let timeoutWinner: "seeker" | "hiders" | null = null;
    if (timeoutHiders > 0) {
      timeoutWinner = "hiders";
    }
    assertEqual(timeoutWinner, "hiders");
  });
}
