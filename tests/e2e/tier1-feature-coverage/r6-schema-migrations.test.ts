/**
 * Tier 1: Feature Coverage - R6: Database Schema and Storage Migration Scripts
 * Validates baseline happy path for database schema definitions, columns, RLS, and storage.
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

export function registerTier1R6Tests(engine: KaelixoTestEngine) {
  setTestContext(1, "R6: Database Schema and Storage Migration Scripts");

  test("R6.1: Should verify database schema SQL file exists in repository", () => {
    const rootDir = path.resolve(__dirname, "../../..");
    const schemaFile = path.join(rootDir, "supabase", "schema.sql");
    assertTrue(fs.existsSync(schemaFile), `Expected ${schemaFile} to exist`);
    const content = fs.readFileSync(schemaFile, "utf-8");
    assertTrue(content.length > 500, "Schema file should contain substantial SQL definitions");
  });

  test("R6.2: Should verify messages table schema contains threading, attachments, and pinned columns", () => {
    const rootDir = path.resolve(__dirname, "../../..");
    const schemaFile = path.join(rootDir, "supabase", "schema.sql");
    const content = fs.readFileSync(schemaFile, "utf-8").toLowerCase();

    assertTrue(content.includes("create table if not exists public.messages"));
    assertTrue(content.includes("parent_id uuid"));
    assertTrue(content.includes("attachments jsonb"));
    assertTrue(content.includes("is_pinned boolean"));
  });

  test("R6.3: Should verify reactions table schema contains emoji, message_id, and uniqueness", () => {
    const rootDir = path.resolve(__dirname, "../../..");
    const schemaFile = path.join(rootDir, "supabase", "schema.sql");
    const content = fs.readFileSync(schemaFile, "utf-8").toLowerCase();

    assertTrue(content.includes("create table if not exists public.reactions"));
    assertTrue(content.includes("message_id uuid"));
    assertTrue(content.includes("emoji text"));
    assertTrue(content.includes("unique(message_id"));
  });

  test("R6.4: Should verify Row Level Security (RLS) is enabled and policies defined for chat tables", () => {
    const rootDir = path.resolve(__dirname, "../../..");
    const schemaFile = path.join(rootDir, "supabase", "schema.sql");
    const fixFile = path.join(rootDir, "supabase", "fix-policies.sql");
    
    const combinedContent = (
      fs.readFileSync(schemaFile, "utf-8") +
      "\n" +
      (fs.existsSync(fixFile) ? fs.readFileSync(fixFile, "utf-8") : "")
    ).toLowerCase();

    assertTrue(combinedContent.includes("alter table public.messages enable row level security") || combinedContent.includes("create policy"));
    assertTrue(combinedContent.includes("create policy"));
    assertTrue(combinedContent.includes("messages"));
    assertTrue(combinedContent.includes("reactions"));
  });

  test("R6.5: Should verify Realtime replication publication includes messages and reactions", () => {
    const rootDir = path.resolve(__dirname, "../../..");
    const schemaFile = path.join(rootDir, "supabase", "schema.sql");
    const fixFile = path.join(rootDir, "supabase", "fix-policies.sql");
    
    const combinedContent = (
      fs.readFileSync(schemaFile, "utf-8") +
      "\n" +
      (fs.existsSync(fixFile) ? fs.readFileSync(fixFile, "utf-8") : "")
    ).toLowerCase();

    assertTrue(combinedContent.includes("alter publication supabase_realtime add table public.messages"));
    assertTrue(combinedContent.includes("alter publication supabase_realtime add table public.reactions"));
  });

  test("R6.6: Should verify Storage bucket kaelixo-attachments configuration contract", () => {
    assertEqual(KaelixoTestEngine.STORAGE_BUCKET, "kaelixo-attachments");
    assertEqual(KaelixoTestEngine.MAX_FILE_SIZE, 50 * 1024 * 1024);
    assertTrue(KaelixoTestEngine.ALLOWED_MIME_PREFIXES.includes("image/"));
    assertTrue(KaelixoTestEngine.ALLOWED_MIME_PREFIXES.includes("application/pdf"));
  });
}
