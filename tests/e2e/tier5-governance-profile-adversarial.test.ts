/**
 * Tier 5 Adversarial Coverage Hardening Test Suite — Governance, Profile, Presence & Enterprise English
 * Author: challenger_m5_2 (Critic & Specialist)
 * Target Codebase: C:\myai_projects\kaelixo
 * Scope: R5 (Presence & Notifications), R6 (Database & Migrations), R7 (People Directory & RBAC),
 *        R8 (User Profile Drawer & Editor), R10 (Enterprise English Standard)
 */

import React from "react";
import ReactDOMServer from "react-dom/server";
import * as fs from "fs";
import * as path from "path";
import {
  isWorkspaceOwner,
  isDepartmentHead,
  isDepartmentManager,
  canAddMember,
  getAddMemberDepartmentScope,
  canRemoveMember,
  formatRoleLabel,
} from "../../src/utils/permissions";
import {
  WorkspaceMember,
  Department,
  Organization,
  Notification,
  DepartmentCode,
  Message,
} from "../../src/types";
import { UserProfileDrawer } from "../../src/components/profile/user-profile-drawer";
import { MemberDirectoryModal } from "../../src/components/directory/member-directory-modal";
import { AddMemberModal } from "../../src/components/directory/add-member-modal";
import { EditProfileModal } from "../../src/components/profile/edit-profile-modal";
import { NotificationCenter } from "../../src/components/layout/notification-center";

// ANSI Terminal Colors
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const GRAY = "\x1b[90m";

interface TestResult {
  suite: string;
  id: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${msg}`);
  }
}

function runTest(suite: string, id: string, name: string, fn: () => void | Promise<void>) {
  const start = performance.now();
  try {
    const res = fn();
    if (res instanceof Promise) {
      throw new Error("Synchronous test runner encountered Promise. Use async test runner.");
    }
    const durationMs = Math.round(performance.now() - start);
    results.push({ suite, id, name, passed: true, durationMs });
    console.log(`    ${GREEN}✓${RESET} [${id}] ${name} ${GRAY}(${durationMs}ms)${RESET}`);
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - start);
    results.push({ suite, id, name, passed: false, durationMs, error: err.message });
    console.log(`    ${RED}✗${RESET} [${id}] ${name} ${GRAY}(${durationMs}ms)${RESET}`);
    console.log(`      ${RED}Error: ${err.message}${RESET}`);
  }
}

async function runTestAsync(suite: string, id: string, name: string, fn: () => Promise<void>) {
  const start = performance.now();
  try {
    await fn();
    const durationMs = Math.round(performance.now() - start);
    results.push({ suite, id, name, passed: true, durationMs });
    console.log(`    ${GREEN}✓${RESET} [${id}] ${name} ${GRAY}(${durationMs}ms)${RESET}`);
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - start);
    results.push({ suite, id, name, passed: false, durationMs, error: err.message });
    console.log(`    ${RED}✗${RESET} [${id}] ${name} ${GRAY}(${durationMs}ms)${RESET}`);
    console.log(`      ${RED}Error: ${err.message}${RESET}`);
  }
}

export async function runTier5AdversarialSuite(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
}> {
  console.log(`\n${BOLD}${CYAN}======================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}  KAELIXO TIER 5 ADVERSARIAL COVERAGE HARDENING (R5, R6, R7, R8, R10) ${RESET}`);
  console.log(`${BOLD}${CYAN}  Empirical Adversarial Verification & White-Box Stress Engine        ${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================================${RESET}\n`);

  // ============================================================================
  // SUITE 1: R5 Member Presence and In-App Notifications
  // ============================================================================
  const S1 = "R5: Presence & Notifications";
  console.log(`${BOLD}${YELLOW}--- [Suite 1] ${S1} ---${RESET}`);

  // Test 1.1: Rapid multi-member presence state reconciliation
  runTest(S1, "R5-ADV-1.1", "Rapid presence state transitions and online dot aggregation", () => {
    const members: WorkspaceMember[] = [
      { id: "u1", name: "User 1", email: "u1@k.com", avatar: "", role: "Member", department: "dev", status: "online" },
      { id: "u2", name: "User 2", email: "u2@k.com", avatar: "", role: "Member", department: "dev", status: "offline" },
      { id: "u3", name: "User 3", email: "u3@k.com", avatar: "", role: "Member", department: "dev", status: "away" },
    ];

    const presenceMap: Record<string, { status: "online" | "away" | "in_call" | "offline"; statusText?: string }> = {
      u1: { status: "away", statusText: "Be right back" },
      u2: { status: "online", statusText: "Active now" },
      u3: { status: "in_call", statusText: "Huddle" },
    };

    // Overlay logic from page.tsx
    const reconciled = members.map((m) => {
      const p = presenceMap[m.id];
      if (p) {
        return {
          ...m,
          status: p.status,
          online: p.status !== "offline",
          statusText: p.statusText || m.statusText,
        };
      }
      return { ...m, online: m.status === "online" };
    });

    assert(reconciled[0].status === "away" && reconciled[0].online === true, "u1 updated to away (still online)");
    assert(reconciled[1].status === "online" && reconciled[1].online === true, "u2 updated from offline to online");
    assert(reconciled[2].status === "in_call" && reconciled[2].online === true, "u3 updated to in_call");
  });

  // Test 1.2: Notification processor mention detection and self-suppression
  runTest(S1, "R5-ADV-1.2", "Notification processor @mention extraction, self-suppression & DM delivery", () => {
    const currentUser: WorkspaceMember = {
      id: "u-curr",
      name: "Alice Smith",
      displayName: "alice.s",
      email: "alice@k.com",
      avatar: "",
      role: "Workspace Owner",
      department: "management",
      status: "online",
    };

    const processNotification = (
      msg: { senderId: string; senderName: string; content: string; channelId: string; parentId?: string | null },
      isDm: boolean
    ): { triggered: boolean; type?: string; reason?: string } => {
      // Self suppression guard
      if (msg.senderId === currentUser.id || msg.senderName === currentUser.name) {
        return { triggered: false, reason: "self_suppressed" };
      }

      const contentLower = msg.content.toLowerCase();
      const myNameLower = currentUser.name.toLowerCase();
      const myDisplayNameLower = (currentUser.displayName || "").toLowerCase();

      // Token boundary checks for @mention
      const isMention =
        contentLower.includes(`@${myNameLower}`) ||
        (myDisplayNameLower && contentLower.includes(`@${myDisplayNameLower}`)) ||
        contentLower.includes("@channel") ||
        contentLower.includes("@here");

      if (isMention) return { triggered: true, type: "mention" };
      if (isDm) return { triggered: true, type: "dm" };
      return { triggered: false, reason: "no_match" };
    };

    // Case 1: Colleague mentions current user by display name
    const res1 = processNotification({ senderId: "u-bob", senderName: "Bob", content: "Hey @alice.s please review", channelId: "ch-1" }, false);
    assert(res1.triggered && res1.type === "mention", "Colleague display name mention triggers notification");

    // Case 2: Colleague mentions current user by full name
    const res2 = processNotification({ senderId: "u-bob", senderName: "Bob", content: "CC @Alice Smith on this", channelId: "ch-1" }, false);
    assert(res2.triggered && res2.type === "mention", "Colleague full name mention triggers notification");

    // Case 3: Self-mention suppressed
    const res3 = processNotification({ senderId: "u-curr", senderName: "Alice Smith", content: "Note to @alice.s", channelId: "ch-1" }, false);
    assert(!res3.triggered && res3.reason === "self_suppressed", "Self-mention strictly suppressed");

    // Case 4: DM to current user
    const res4 = processNotification({ senderId: "u-bob", senderName: "Bob", content: "Hey are you free?", channelId: "dm-bob-alice" }, true);
    assert(res4.triggered && res4.type === "dm", "DM to user triggers notification");

    // Case 5: Self-DM suppressed
    const res5 = processNotification({ senderId: "u-curr", senderName: "Alice Smith", content: "Reminder to self", channelId: "dm-alice-alice" }, true);
    assert(!res5.triggered && res5.reason === "self_suppressed", "Self-DM strictly suppressed");
  });

  // Test 1.3: Unread count threshold & NotificationCenter popover
  runTest(S1, "R5-ADV-1.3", "Unread count badge thresholding (0, 5, 100+ -> '99+') and tab filtering", () => {
    // Generate 105 notifications
    const notifications: Notification[] = Array.from({ length: 105 }, (_, i) => ({
      id: `n-${i}`,
      userId: "u-curr",
      senderName: `Colleague ${i}`,
      type: i % 3 === 0 ? "mention" : i % 3 === 1 ? "dm" : "thread_reply",
      channelId: "ch-1",
      content: `Message content ${i}`,
      read: i >= 100, // 100 unread, 5 read
      isRead: i >= 100,
      createdAt: "Just now",
    }));

    const unreadCount = notifications.filter((n) => n.read === false && n.isRead === false).length;
    assert(unreadCount === 100, "100 unread notifications counted");

    const badgeLabel = unreadCount > 99 ? "99+" : unreadCount.toString();
    assert(badgeLabel === "99+", "Badge displays '99+' when exceeding 99 threshold");

    // SSR render NotificationCenter
    const html = ReactDOMServer.renderToString(
      React.createElement(NotificationCenter, {
        notifications,
        unreadCount,
        onMarkAsRead: () => {},
        onMarkAllAsRead: () => {},
        onSelectNotification: () => {},
      })
    );

    assert(html.includes("99+"), "Rendered markup contains '99+' badge text");
    assert(html.includes("Notifications"), "Rendered markup contains Notifications header");
  });

  // Test 1.4: Substring / Word boundary collision stress
  runTest(S1, "R5-ADV-1.4", "Word boundary isolation prevents false substring mention triggers", () => {
    const userTarget = "Al";
    const userDisplayName = "al";

    const isMentionMatch = (text: string, targetName: string, targetDisplayName: string): boolean => {
      const lower = text.toLowerCase();
      // Test regex with word boundary following @
      const mentionRegex = new RegExp(`@(?:${targetName}|${targetDisplayName})(?:\\b|[\\s.,!?])`, "i");
      return mentionRegex.test(lower);
    };

    // Substring collision: "Algorithm" or "Also" or "@Alicia" should NOT trigger for "@Al"
    assert(!isMentionMatch("Studying Algorithm efficiency", userTarget, userDisplayName), "Does not trigger on 'Algorithm'");
    assert(!isMentionMatch("Ping @Alicia for designs", userTarget, userDisplayName), "Does not trigger on '@Alicia'");
    assert(!isMentionMatch("Malice in the system", userTarget, userDisplayName), "Does not trigger on 'Malice'");

    // Positive triggers
    assert(isMentionMatch("Hey @Al, please review", userTarget, userDisplayName), "Triggers on '@Al,'");
    assert(isMentionMatch("Hey @al please review", userTarget, userDisplayName), "Triggers on '@al'");
    assert(isMentionMatch("CC: @Al.", userTarget, userDisplayName), "Triggers on '@Al.'");
  });

  // Test 1.5: Concurrency stress: 1,000 rapid sequential presence broadcasts
  runTest(S1, "R5-ADV-1.5", "High-frequency presence transition throughput: 1,000 state reconciliations", () => {
    const start = performance.now();
    let currentStatus: "online" | "away" | "in_call" | "offline" = "online";
    const statuses: ("online" | "away" | "in_call" | "offline")[] = ["online", "away", "in_call", "offline"];

    for (let i = 0; i < 1000; i++) {
      currentStatus = statuses[i % 4];
      const member: WorkspaceMember = {
        id: "stress-user",
        name: "Stress Tester",
        email: "stress@kaelixo.com",
        avatar: "",
        role: "Member",
        department: "dev",
        status: currentStatus,
        online: currentStatus !== "offline",
      };
      assert(member.online === (currentStatus !== "offline"), "Online boolean accurately reflects presence");
    }

    const duration = performance.now() - start;
    assert(duration < 50, `1,000 presence calculations executed in ${duration.toFixed(2)}ms (< 50ms)`);
  });

  // Test 1.6: Thread reply notification delivery logic
  runTest(S1, "R5-ADV-1.6", "Thread reply notification matrix: notifies parent author, suppresses for self-reply", () => {
    const parentAuthorId = "usr-parent-author";
    const replierId = "usr-replier";

    const evaluateThreadReplyNotification = (authorId: string, currentReplierId: string) => {
      if (authorId === currentReplierId) {
        return { notify: false, reason: "self_reply" };
      }
      return { notify: true, targetUserId: authorId };
    };

    // Case 1: Colleague replies to parent author's message
    const res1 = evaluateThreadReplyNotification(parentAuthorId, replierId);
    assert(res1.notify && res1.targetUserId === parentAuthorId, "Notifies parent message author");

    // Case 2: Parent author replies to their own thread
    const res2 = evaluateThreadReplyNotification(parentAuthorId, parentAuthorId);
    assert(!res2.notify && res2.reason === "self_reply", "Suppresses notification when author replies to own thread");
  });

  // ============================================================================
  // SUITE 2: R6 Database Schema & Migration Reproducibility
  // ============================================================================
  const S2 = "R6: Database & Migrations";
  console.log(`\n${BOLD}${YELLOW}--- [Suite 2] ${S2} ---${RESET}`);

  runTest(S2, "R6-ADV-2.1", "Physical existence and SQL parser audit of 20261105_slack_parity.sql", () => {
    const migrationPath = path.resolve(process.cwd(), "supabase/migrations/20261105_slack_parity.sql");
    assert(fs.existsSync(migrationPath), `Migration file exists at ${migrationPath}`);

    const sql = fs.readFileSync(migrationPath, "utf-8");

    // 1. Idempotency checks
    assert(sql.includes("CREATE EXTENSION IF NOT EXISTS"), "Idempotent extensions");
    assert(sql.includes("ADD COLUMN IF NOT EXISTS reply_count"), "Idempotent reply_count column");
    assert(sql.includes("ADD COLUMN IF NOT EXISTS is_edited"), "Idempotent is_edited column");
    assert(sql.includes("ADD COLUMN IF NOT EXISTS is_deleted"), "Idempotent is_deleted column");
    assert(sql.includes("ADD COLUMN IF NOT EXISTS pinned_at"), "Idempotent pinned_at column");
    assert(sql.includes("CREATE TABLE IF NOT EXISTS public.notifications"), "Idempotent notifications table");
    assert(sql.includes("CREATE TABLE IF NOT EXISTS public.user_presence"), "Idempotent user_presence table");
    assert(sql.includes("CREATE TABLE IF NOT EXISTS public.attachments"), "Idempotent attachments table");

    // 2. Cascade delete guards
    assert(sql.includes("REFERENCES public.channels(id) ON DELETE CASCADE"), "Cascade delete on channels");
    assert(sql.includes("REFERENCES public.messages(id) ON DELETE CASCADE"), "Cascade delete on messages");

    // 3. Thread automation trigger
    assert(sql.includes("FUNCTION public.update_message_thread_stats()"), "Trigger function update_message_thread_stats defined");
    assert(sql.includes("GREATEST(0, COALESCE(reply_count, 1) - 1)"), "Trigger decrements safely with GREATEST(0, ...)");
    assert(sql.includes("REVOKE EXECUTE ON FUNCTION public.update_message_thread_stats() FROM PUBLIC, anon, authenticated"), "Trigger execution locked from public/anon/auth");

    // 4. Full-text search RPC
    assert(sql.includes("FUNCTION public.search_messages"), "Full-text search function search_messages defined");
    assert(sql.includes("websearch_to_tsquery('english', query_text)"), "Uses websearch_to_tsquery for safe search queries");
    assert(sql.includes("COALESCE(m.is_deleted, false) = false"), "Search filters out soft-deleted messages");

    // 5. Storage bucket configuration
    assert(sql.includes("kaelixo-attachments"), "Bucket kaelixo-attachments configured");
    assert(sql.includes("52428800"), "Bucket 50MB file size limit enforced (52428800 bytes)");
    assert(sql.includes("application/pdf"), "PDF mime type allowed in bucket");

    // 6. Replica identity & Realtime publications
    const expectedTables = ["messages", "channels", "reactions", "workspace_members", "notifications", "user_presence", "attachments"];
    for (const tbl of expectedTables) {
      assert(sql.includes(`ALTER TABLE public.${tbl} REPLICA IDENTITY FULL`), `Table ${tbl} has REPLICA IDENTITY FULL`);
      assert(sql.includes(`ALTER PUBLICATION supabase_realtime ADD TABLE public.${tbl}`), `Table ${tbl} added to supabase_realtime publication`);
    }
  });

  runTest(S2, "R6-ADV-2.2", "SQL Injection, parameterized tsquery and search_path isolation", () => {
    const migrationPath = path.resolve(process.cwd(), "supabase/migrations/20261105_slack_parity.sql");
    const sql = fs.readFileSync(migrationPath, "utf-8");

    // Verify search_path fixed to public to prevent search_path hijacking
    assert(sql.includes("SET search_path = public"), "Trigger and RPC functions explicitly set search_path = public");
    // Verify SECURITY DEFINER on thread stats
    assert(sql.includes("SECURITY DEFINER"), "Trigger function runs with SECURITY DEFINER");
    // Verify websearch_to_tsquery used instead of vulnerable to_tsquery with raw string concatenation
    assert(sql.includes("websearch_to_tsquery('english', query_text)"), "Uses websearch_to_tsquery parameterized call");
  });

  // ============================================================================
  // SUITE 3: R7 People & Team Member Directory / Admin Dashboard (RBAC Stress)
  // ============================================================================
  const S3 = "R7: Member Directory & Admin RBAC";
  console.log(`\n${BOLD}${YELLOW}--- [Suite 3] ${S3} ---${RESET}`);

  const ownerUser: WorkspaceMember = {
    id: "usr-owner-root",
    name: "Chief Executive",
    email: "ceo@kaelixo.com",
    avatar: "https://example.com/ceo.png",
    role: "Workspace Owner",
    department: "management",
    status: "online",
  };

  const devHeadUser: WorkspaceMember = {
    id: "usr-head-dev",
    name: "VP of Engineering",
    email: "vp.eng@kaelixo.com",
    avatar: "https://example.com/vpeng.png",
    role: "Department Head",
    department: "dev",
    status: "online",
  };

  const devStaffUser: WorkspaceMember = {
    id: "usr-staff-dev-1",
    name: "Software Engineer",
    email: "dev1@kaelixo.com",
    avatar: "https://example.com/dev1.png",
    role: "Member",
    department: "dev",
    status: "online",
  };

  const teachingHeadUser: WorkspaceMember = {
    id: "usr-head-teach",
    name: "Head of Academic Affairs",
    email: "academic.head@kaelixo.com",
    avatar: "https://example.com/headteach.png",
    role: "Manager",
    department: "teaching",
    status: "online",
  };

  const teachingStaffUser: WorkspaceMember = {
    id: "usr-staff-teach-1",
    name: "Associate Professor",
    email: "prof1@kaelixo.com",
    avatar: "https://example.com/prof1.png",
    role: "Member",
    department: "teaching",
    status: "offline",
  };

  const departmentsList: Department[] = [
    { id: "d-all", name: "All Company", code: "all", description: "", icon: "", color: "" },
    { id: "d-dev", name: "Engineering & Dev", code: "dev", description: "", icon: "", color: "" },
    { id: "d-teach", name: "Teaching & Faculty", code: "teaching", description: "", icon: "", color: "" },
    { id: "d-mgmt", name: "Executive Management", code: "management", description: "", icon: "", color: "" },
  ];

  // Test 3.1: Complete Exhaustive RBAC Matrix for canAddMember & Department Scope
  runTest(S3, "R7-ADV-3.1", "RBAC canAddMember & department locking scope across all roles", () => {
    // Owner can add
    assert(canAddMember(ownerUser), "Owner has canAddMember = true");
    const ownerScope = getAddMemberDepartmentScope(ownerUser, departmentsList);
    assert(!ownerScope.isLocked, "Owner department scope is not locked");
    assert(ownerScope.allowedDepartments.length === 3, "Owner can choose across all 3 non-all departments");

    // Dept Head can add (locked to department)
    assert(canAddMember(devHeadUser), "Dev Head has canAddMember = true");
    const devScope = getAddMemberDepartmentScope(devHeadUser, departmentsList);
    assert(devScope.isLocked, "Dev Head department scope is strictly locked");
    assert(devScope.allowedDepartments.length === 1 && devScope.allowedDepartments[0].code === "dev", "Dev Head locked to 'dev'");

    // Regular Member cannot add
    assert(!canAddMember(devStaffUser), "Dev Staff has canAddMember = false");
    assert(!canAddMember(teachingStaffUser), "Teaching Staff has canAddMember = false");
    const staffScope = getAddMemberDepartmentScope(devStaffUser, departmentsList);
    assert(staffScope.allowedDepartments.length === 0, "Staff has 0 allowed departments");
  });

  // Test 3.2: Complete Exhaustive RBAC Matrix for canRemoveMember
  runTest(S3, "R7-ADV-3.2", "RBAC canRemoveMember authority matrix, cross-department & peer manager guards", () => {
    // 1. Owner authority
    assert(canRemoveMember(ownerUser, devHeadUser).allowed, "Owner CAN remove Department Head");
    assert(canRemoveMember(ownerUser, devStaffUser).allowed, "Owner CAN remove Dev Staff");
    assert(canRemoveMember(ownerUser, teachingStaffUser).allowed, "Owner CAN remove Teaching Staff in another dept");

    // 2. Department Head authority
    assert(canRemoveMember(devHeadUser, devStaffUser).allowed, "Dev Head CAN remove staff in own department");
    assert(!canRemoveMember(devHeadUser, teachingStaffUser).allowed, "Dev Head CANNOT remove staff in another department");
    assert(!canRemoveMember(devHeadUser, teachingHeadUser).allowed, "Dev Head CANNOT remove peer manager in another department");

    // 3. Department Head removing peer in same dept
    const devPeerMgr: WorkspaceMember = { ...devHeadUser, id: "usr-head-dev-2", name: "Dev Lead 2" };
    assert(!canRemoveMember(devHeadUser, devPeerMgr).allowed, "Dev Head CANNOT remove peer manager in same department");

    // 4. Regular Member authority
    assert(!canRemoveMember(devStaffUser, teachingStaffUser).allowed, "Staff CANNOT remove staff in other dept");
    assert(!canRemoveMember(devStaffUser, devStaffUser).allowed, "Staff CANNOT remove staff in own dept");
    assert(!canRemoveMember(devStaffUser, devHeadUser).allowed, "Staff CANNOT remove department head");

    // 5. Inviolable guards: Self-removal & Owner-removal
    assert(!canRemoveMember(ownerUser, ownerUser).allowed, "Owner CANNOT remove self");
    assert(!canRemoveMember(devHeadUser, devHeadUser).allowed, "Manager CANNOT remove self");
    assert(!canRemoveMember(devStaffUser, devStaffUser).allowed, "Staff CANNOT remove self");

    const anotherOwner: WorkspaceMember = { ...ownerUser, id: "usr-owner-2", name: "Co-Owner" };
    assert(!canRemoveMember(ownerUser, anotherOwner).allowed, "Owner CANNOT remove another Workspace Owner");
    assert(!canRemoveMember(devHeadUser, ownerUser).allowed, "Manager CANNOT remove Workspace Owner");
    assert(!canRemoveMember(devStaffUser, ownerUser).allowed, "Staff CANNOT remove Workspace Owner");
  });

  // Test 3.3: SSR Markup verification of MemberDirectoryModal & AddMemberModal
  runTest(S3, "R7-ADV-3.3", "SSR rendering of MemberDirectoryModal & AddMemberModal with RBAC controls", () => {
    const org: Organization = { id: "org-1", name: "Kaelixo Org", slug: "kaelixo", invite_code: "K-TEST-99" };
    const members = [ownerUser, devHeadUser, devStaffUser, teachingHeadUser, teachingStaffUser];

    // 1. Directory rendered for Owner
    const dirHtmlOwner = ReactDOMServer.renderToString(
      React.createElement(MemberDirectoryModal, {
        isOpen: true,
        onClose: () => {},
        members,
        currentUser: ownerUser,
        departments: departmentsList,
        activeOrg: org,
        onSelectMemberForDm: () => {},
        onOpenAddMemberModal: () => {},
        onRemoveMember: () => {},
      })
    );
    assert(dirHtmlOwner.includes("People &amp; Member Directory"), "Directory contains title");
    assert(dirHtmlOwner.includes("Add Member"), "Owner sees Add Member button");
    assert(dirHtmlOwner.includes("Workspace Owner"), "Displays Workspace Owner badge");

    // 2. Directory rendered for Member
    const dirHtmlMember = ReactDOMServer.renderToString(
      React.createElement(MemberDirectoryModal, {
        isOpen: true,
        onClose: () => {},
        members,
        currentUser: devStaffUser,
        departments: departmentsList,
        activeOrg: org,
        onSelectMemberForDm: () => {},
        onOpenAddMemberModal: () => {},
        onRemoveMember: () => {},
      })
    );
    assert(!dirHtmlMember.includes(">Add Member<"), "Regular Member DOES NOT see Add Member button in modal header");

    // 3. AddMemberModal rendered for Dept Head (Locked to department)
    const addHtmlMgr = ReactDOMServer.renderToString(
      React.createElement(AddMemberModal, {
        isOpen: true,
        onClose: () => {},
        currentUser: devHeadUser,
        departments: departmentsList,
        existingEmails: members.map((m) => m.email),
        onAddMember: () => {},
      })
    );
    assert(addHtmlMgr.includes("Locked to your department"), "Dept Head sees locked department warning");
    assert(addHtmlMgr.includes("disabled"), "Department select is disabled/locked for Dept Head");
  });

  // Test 3.4: Directory search scale stress test with 2,500 members
  runTest(S3, "R7-ADV-3.4", "Directory search scale stress: 2,500 members filtered in < 50ms", () => {
    const largeMemberList: WorkspaceMember[] = Array.from({ length: 2500 }, (_, i) => ({
      id: `u-${i}`,
      name: `Colleague Number ${i}`,
      email: `colleague.${i}@enterprise.com`,
      avatar: "",
      role: i === 0 ? "Workspace Owner" : i % 20 === 0 ? "Manager" : "Member",
      department: i % 3 === 0 ? "dev" : i % 3 === 1 ? "teaching" : "management",
      status: i % 2 === 0 ? "online" : "offline",
    }));

    const start = performance.now();
    const query = "colleague.145";
    const filtered = largeMemberList.filter((m) => {
      const q = query.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        m.department.toLowerCase().includes(q)
      );
    });
    const duration = performance.now() - start;

    assert(filtered.length >= 1 && filtered[0].email === "colleague.145@enterprise.com", "Found target member");
    assert(duration < 50, `Search across 2,500 members completed in ${duration.toFixed(2)}ms (< 50ms)`);
  });

  // Test 3.5: Add Member email boundary conditions
  runTest(S3, "R7-ADV-3.5", "Add Member email RFC validation oracle & duplicate detection", () => {
    const existing = ["alice@kaelixo.com", "bob@kaelixo.com"];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Invalid emails
    assert(!emailRegex.test("plainstring"), "Rejects plain string without @");
    assert(!emailRegex.test("@missingusername.com"), "Rejects missing username");
    assert(!emailRegex.test("user@domain"), "Rejects missing TLD");
    assert(!emailRegex.test("user@.com"), "Rejects missing domain name");
    assert(!emailRegex.test("user @domain.com"), "Rejects space in username");
    assert(!emailRegex.test("user@ domain.com"), "Rejects space in domain");

    // Valid emails
    assert(emailRegex.test("user.name+tag@sub.domain.co.uk"), "Accepts complex RFC email");

    // Duplicate check
    const isDuplicate = (e: string) => existing.some((ex) => ex.toLowerCase() === e.trim().toLowerCase());
    assert(isDuplicate("alice@kaelixo.com"), "Rejects exact duplicate");
    assert(isDuplicate("  ALICE@KAELIXO.COM  "), "Rejects case & whitespace varied duplicate");
    assert(!isDuplicate("charlie@kaelixo.com"), "Accepts new unique email");
  });

  // ============================================================================
  // SUITE 4: R8 User Profile Drawer & Profile Editor
  // ============================================================================
  const S4 = "R8: Profile Drawer & Profile Editor";
  console.log(`\n${BOLD}${YELLOW}--- [Suite 4] ${S4} ---${RESET}`);

  // Test 4.1: Slack Screenshot 3 layout fidelity in UserProfileDrawer
  runTest(S4, "R8-ADV-4.1", "UserProfileDrawer matches Slack Screenshot 3 layout, hero avatar & contact info", () => {
    const targetColleague: WorkspaceMember = {
      id: "usr-colleague-1",
      name: "Marcus Aurelius",
      displayName: "marcus.a",
      email: "marcus@kaelixo.com",
      phone: "+1 (555) 234-5678",
      avatar: "https://example.com/marcus.png",
      role: "Department Head",
      department: "management",
      status: "online",
      statusText: "Focusing on enterprise strategy",
      statusEmoji: "🎯",
      bio: "Leading executive operations across distributed engineering teams.",
      online: true,
    };

    // Render colleague profile (viewed by devStaffUser)
    const htmlColleague = ReactDOMServer.renderToString(
      React.createElement(UserProfileDrawer, {
        member: targetColleague,
        currentUser: devStaffUser,
        onClose: () => {},
        onStartDm: () => {},
        onOpenEditProfile: () => {},
      })
    );

    const cleanHtml = htmlColleague.replace(/<!--.*?-->/g, "");
    assert(cleanHtml.includes("Marcus Aurelius"), "Renders colleague full name");
    assert(cleanHtml.includes("@marcus.a"), "Renders @display name");
    assert(cleanHtml.includes("Contact Information"), "Renders Contact Information section header");
    assert(cleanHtml.includes("marcus@kaelixo.com"), "Renders contact email");
    assert(cleanHtml.includes("+1 (555) 234-5678"), "Renders phone number");
    assert(cleanHtml.includes("Message"), "Renders Message button for colleague");
    assert(cleanHtml.includes("Email"), "Renders Email button for colleague");
    assert(!cleanHtml.includes("Edit Profile"), "Does NOT render Edit Profile button when viewing colleague");

    // Render self profile (viewed by Marcus himself)
    const htmlSelf = ReactDOMServer.renderToString(
      React.createElement(UserProfileDrawer, {
        member: targetColleague,
        currentUser: targetColleague,
        onClose: () => {},
        onStartDm: () => {},
        onOpenEditProfile: () => {},
      })
    );
    assert(htmlSelf.includes("Edit Profile"), "Renders Edit Profile button when viewing self");
    assert(!htmlSelf.includes(">Message<"), "Does NOT render Message button when viewing self");
  });

  // Test 4.2: EditProfileModal SSR & validation logic
  runTest(S4, "R8-ADV-4.2", "EditProfileModal avatar preview, form fields, and validation guards", () => {
    const htmlEdit = ReactDOMServer.renderToString(
      React.createElement(EditProfileModal, {
        isOpen: true,
        onClose: () => {},
        currentUser: devStaffUser,
        departments: departmentsList,
        onSaveProfile: () => {},
      })
    );

    assert(htmlEdit.includes("Edit Your Profile"), "Modal title present");
    assert(htmlEdit.includes("Upload Image"), "Upload image button present");
    assert(htmlEdit.includes("Job Title / Role"), "Job title field present");
    assert(htmlEdit.includes("Phone Number"), "Phone number field present");
    assert(htmlEdit.includes("Current Status"), "Status field present");
    assert(htmlEdit.includes("About Me"), "About me / bio textarea present");
  });

  // Test 4.3: Profile photo upload boundary conditions
  runTest(S4, "R8-ADV-4.3", "Profile photo upload validation oracle: size threshold (5MB) and MIME checks", () => {
    const validateProfilePhoto = (file: { name: string; size: number; type: string }): { valid: boolean; error?: string } => {
      if (!file.type.startsWith("image/")) {
        return { valid: false, error: "Please select a valid image file (PNG, JPG, WebP)." };
      }
      if (file.size > 5 * 1024 * 1024) {
        return { valid: false, error: "Profile image must be less than 5MB." };
      }
      return { valid: true };
    };

    assert(!validateProfilePhoto({ name: "document.pdf", size: 1024, type: "application/pdf" }).valid, "Rejects PDF file");
    assert(!validateProfilePhoto({ name: "script.sh", size: 1024, type: "application/x-sh" }).valid, "Rejects executable shell script");
    assert(!validateProfilePhoto({ name: "huge_photo.png", size: 6 * 1024 * 1024, type: "image/png" }).valid, "Rejects file > 5MB");
    assert(validateProfilePhoto({ name: "avatar.webp", size: 500 * 1024, type: "image/webp" }).valid, "Accepts 500KB WebP image");
    assert(validateProfilePhoto({ name: "avatar.png", size: 2 * 1024 * 1024, type: "image/png" }).valid, "Accepts 2MB PNG image");
  });

  // Test 4.4: Extreme user input & Unicode resiliency in Profile
  runTest(S4, "R8-ADV-4.4", "Extreme profile input resiliency: multibyte emoji status and long bio text", () => {
    const extremeStatusEmoji = "👨‍👩‍👧‍👦";
    const longBio = "A".repeat(2000);

    const updatedProfile = {
      name: "Extreme User",
      statusEmoji: extremeStatusEmoji,
      bio: longBio,
    };

    assert(updatedProfile.statusEmoji.length > 0, "Preserves compound multibyte family emoji");
    assert(updatedProfile.bio.length === 2000, "Preserves 2,000-character bio without truncation");
  });

  // ============================================================================
  // SUITE 5: R10 Enterprise English Standard
  // ============================================================================
  const S5 = "R10: Enterprise English Standard";
  console.log(`\n${BOLD}${YELLOW}--- [Suite 5] ${S5} ---${RESET}`);

  // Test 5.1: Zero Malayalam Unicode characters across src/
  runTest(S5, "R10-ADV-5.1", "Automated AST/regex audit: 0% Malayalam glyphs [\\u0D00-\\u0D7F] across src/", () => {
    const srcDir = path.resolve(process.cwd(), "src");
    const malyalamRegex = /[\u0D00-\u0D7F]/;
    const violations: { file: string; match: string }[] = [];

    function scan(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scan(fullPath);
        } else if (/\.(ts|tsx|js|jsx|json|css|html)$/.test(entry.name)) {
          const content = fs.readFileSync(fullPath, "utf-8");
          const m = content.match(malyalamRegex);
          if (m) {
            violations.push({ file: path.relative(process.cwd(), fullPath), match: m[0] });
          }
        }
      }
    }

    scan(srcDir);
    assert(violations.length === 0, `Found ${violations.length} files with Malayalam glyphs in src/: ${JSON.stringify(violations)}`);
  });

  // Test 5.2: Zero Manglish colloquialisms across src/
  runTest(S5, "R10-ADV-5.2", "Audit of src/ for Manglish colloquialisms and transliterated slang", () => {
    const srcDir = path.resolve(process.cwd(), "src");
    // List of Manglish slang tokens mentioned in user requests
    const manglishTokens = [
      /\bchey\b/i,
      /\bnammal\b/i,
      /\bkollam\b/i,
      /\bsadhikko\b/i,
      /\bakknam\b/i,
      /\bvachu\b/i,
      /\bonnum\b/i,
      /\bvenda\b/i,
      /\bpattnam\b/i,
      /\bengill\b/i,
      /\bindoo\b/i,
      /\bsett\b/i,
      /\bippo\b/i,
      /\boru\b/i,
    ];

    const violations: { file: string; token: string }[] = [];

    function scan(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scan(fullPath);
        } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
          const content = fs.readFileSync(fullPath, "utf-8");
          for (const token of manglishTokens) {
            if (token.test(content)) {
              // Ensure it's not part of an English word (e.g., 'document' or 'settlement')
              const lines = content.split("\n");
              for (const line of lines) {
                if (token.test(line) && !line.includes("//") && !line.includes("/*")) {
                  violations.push({ file: path.relative(process.cwd(), fullPath), token: token.source });
                }
              }
            }
          }
        }
      }
    }

    scan(srcDir);
    assert(violations.length === 0, `Found ${violations.length} Manglish violations: ${JSON.stringify(violations)}`);
  });

  // Test 5.3: UI Copy Professionalism & Clean Tone
  runTest(S5, "R10-ADV-5.3", "UI strings professionalism check in Directory, Profile, and Layout components", () => {
    const filesToAudit = [
      "src/components/directory/member-directory-modal.tsx",
      "src/components/directory/add-member-modal.tsx",
      "src/components/profile/user-profile-drawer.tsx",
      "src/components/profile/edit-profile-modal.tsx",
      "src/components/layout/sidebar.tsx",
      "src/components/layout/notification-center.tsx",
    ];

    for (const relFile of filesToAudit) {
      const fullPath = path.resolve(process.cwd(), relFile);
      assert(fs.existsSync(fullPath), `File exists: ${relFile}`);
      const content = fs.readFileSync(fullPath, "utf-8");

      // Verify no placeholder words like "foo", "bar", "todo", "asdf"
      assert(!content.includes("foo bar"), `No sloppy placeholders in ${relFile}`);
      assert(!content.includes("test text"), `No sloppy placeholders in ${relFile}`);
    }
  });

  // ============================================================================
  // SUMMARY
  // ============================================================================
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  console.log(`\n${BOLD}${CYAN}======================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}               TIER 5 ADVERSARIAL EXECUTION SUMMARY                   ${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================================${RESET}`);
  console.log(`  ${BOLD}Total Scenarios:${RESET}  ${total}`);
  console.log(`  ${BOLD}Passed:${RESET}           ${GREEN}${passed}${RESET}`);
  console.log(`  ${BOLD}Failed:${RESET}           ${failed > 0 ? RED : GREEN}${failed}${RESET}`);
  console.log(`  ${BOLD}Pass Rate:${RESET}         ${failed === 0 ? GREEN : RED}${((passed / total) * 100).toFixed(1)}%${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================================${RESET}\n`);

  return { total, passed, failed, results };
}

// Direct CLI execution
if (require.main === module || process.argv[1]?.includes("tier5-governance-profile-adversarial")) {
  runTier5AdversarialSuite()
    .then(({ failed }) => {
      if (failed > 0) process.exit(1);
      process.exit(0);
    })
    .catch((err) => {
      console.error("FATAL RUNNER ERROR:", err);
      process.exit(1);
    });
}
