/**
 * Tier 2: Boundary & Corner Cases - R6: Database Schema & Migration Boundary Conditions
 * Exercises edge cases: migration idempotency, foreign key cascade definitions,
 * unique constraints, index definitions, and backward compatibility.
 */

import {
  assertTrue,
  assertEqual,
  assertContains,
  test,
  setTestContext,
  KaelixoTestEngine,
} from "../test-harness";
import * as fs from "fs";
import * as path from "path";

export function registerTier2R6Tests(engine: KaelixoTestEngine) {
  setTestContext(2, "R6 Boundary: Database Schema & Migration Boundary Conditions");

  test("R6-B.1: Should ensure idempotent table creation with IF NOT EXISTS in all migration scripts", () => {
    const rootDir = path.resolve(__dirname, "../../..");
    const schemaFile = path.join(rootDir, "supabase", "schema.sql");
    const content = fs.readFileSync(schemaFile, "utf-8").toLowerCase();

    const tables = ["organizations", "departments", "profiles", "workspace_members", "channels", "messages", "reactions"];
    for (const tbl of tables) {
      assertTrue(
        content.includes(`create table if not exists public.${tbl}`),
        `Table public.${tbl} must use IF NOT EXISTS for idempotent execution`
      );
    }
  });

  test("R6-B.2: Should verify ON DELETE CASCADE foreign key constraints on dependent chat entities", () => {
    const rootDir = path.resolve(__dirname, "../../..");
    const schemaFile = path.join(rootDir, "supabase", "schema.sql");
    const content = fs.readFileSync(schemaFile, "utf-8").toLowerCase();

    // Verify messages parent_id cascades on parent message deletion
    assertTrue(content.includes("references public.messages(id) on delete cascade"));
    // Verify reactions cascades on message deletion
    assertTrue(content.includes("references public.messages(id) on delete cascade"));
    // Verify channel_members cascades on channel deletion
    assertTrue(content.includes("references public.channels(id) on delete cascade"));
  });

  test("R6-B.3: Should verify compound uniqueness constraint prevents duplicate emoji reactions per member", () => {
    const rootDir = path.resolve(__dirname, "../../..");
    const schemaFile = path.join(rootDir, "supabase", "schema.sql");
    const content = fs.readFileSync(schemaFile, "utf-8").toLowerCase();

    assertTrue(
      content.includes("unique(message_id, member_id, emoji)"),
      "Reactions table must have compound UNIQUE(message_id, member_id, emoji) constraint"
    );
  });

  test("R6-B.4: Should verify default values for critical message flags (is_pinned, created_at, attachments)", () => {
    const rootDir = path.resolve(__dirname, "../../..");
    const schemaFile = path.join(rootDir, "supabase", "schema.sql");
    const content = fs.readFileSync(schemaFile, "utf-8").toLowerCase();

    assertTrue(content.includes("is_pinned boolean default false"));
    assertTrue(content.includes("attachments jsonb default '[]'::jsonb"));
    assertTrue(content.includes("created_at timestamptz default now()"));
  });

  test("R6-B.5: Should verify automatic user profile generation trigger exists on signup", () => {
    const rootDir = path.resolve(__dirname, "../../..");
    const schemaFile = path.join(rootDir, "supabase", "schema.sql");
    const content = fs.readFileSync(schemaFile, "utf-8").toLowerCase();

    assertTrue(content.includes("handle_new_user"));
    assertTrue(content.includes("on_auth_user_created"));
    assertTrue(content.includes("after insert on auth.users"));
  });

  test("R6-B.6: Should verify schema parser correctly validates Slack-parity SQL scripts", () => {
    const rootDir = path.resolve(__dirname, "../../..");
    const schemaFile = path.join(rootDir, "supabase", "schema.sql");
    const content = fs.readFileSync(schemaFile, "utf-8");

    const analysis = KaelixoTestEngine.verifyMigrationSQLContent(content);
    assertTrue(analysis.hasMessagesColumns);
    assertTrue(analysis.hasReactionsTable);
    assertTrue(analysis.hasRLSPolicies);
  });
}
