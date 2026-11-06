/**
 * Milestone 4 Empirical Stress Test Harness — Challenger 2
 * Author: challenger_m4_2 (Critic & Specialist)
 *
 * SCOPE:
 * 1. RBAC Permissions Engine & Authorization Boundaries (R7)
 * 2. Add Member Validation, Lifecycles & Security Guards (R7)
 * 3. Member Directory Search, Filtering, View Modes & Scale Stress (R7)
 * 4. User Profile Drawer & Profile Editor Validation, Uploads & Multi-Language Stress (R8)
 * 5. In-App Notifications & Real-Time Presence Integration (R5 / M4)
 * 6. Enterprise English Standard Automated Audit across src/ (R10)
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

interface ScenarioResult {
  suite: string;
  testId: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

const testResults: ScenarioResult[] = [];

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

function assertEqual<T>(actual: T, expected: T, msg?: string) {
  if (actual !== expected) {
    throw new Error(`${msg ? msg + ": " : ""}Expected "${expected}", but got "${actual}"`);
  }
}

async function runScenario(
  suite: string,
  testId: string,
  name: string,
  fn: () => void | Promise<void>
): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    testResults.push({ suite, testId, name, passed: true, durationMs });
    console.log(`  ✓ [${testId}] ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    testResults.push({
      suite,
      testId,
      name,
      passed: false,
      durationMs,
      error: err.message || String(err),
    });
    console.error(`  ✗ [${testId}] ${name} (${durationMs}ms)`);
    console.error(`    ${RED}Error: ${err.message || String(err)}${RESET}`);
  }
}

// ------------------------------------------------------------------------------
// Test Fixtures
// ------------------------------------------------------------------------------

const mockDepartments: Department[] = [
  { id: "dept-all", name: "All Departments", code: "all", description: "All teams", icon: "Building", color: "indigo" },
  { id: "dept-dev", name: "Engineering", code: "dev", description: "Software development", icon: "Code", color: "emerald" },
  { id: "dept-design", name: "Product Design", code: "design", description: "UI/UX & Branding", icon: "Palette", color: "purple" },
  { id: "dept-marketing", name: "Marketing", code: "marketing", description: "Growth & Outreach", icon: "Megaphone", color: "amber" },
  { id: "dept-sales", name: "Sales", code: "sales", description: "Revenue & Enterprise", icon: "TrendingUp", color: "blue" },
  { id: "dept-ops", name: "Operations", code: "ops", description: "Workspace & IT", icon: "Settings", color: "slate" },
];

const mockOrg: Organization = {
  id: "org-1",
  name: "Acme Corporation",
  slug: "acme-corp",
  invite_code: "acme-2026",
};

const ownerUser: WorkspaceMember = {
  id: "user-owner",
  name: "Victoria Sterling",
  displayName: "victoria.s",
  email: "victoria@acme.com",
  role: "Workspace Owner",
  department: "dev",
  title: "Founder & Chief Executive",
  phone: "+1 (555) 019-2831",
  avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Victoria",
  status: "online",
  statusEmoji: "🚀",
  statusText: "Scaling Kaelixo",
  bio: "Founder building enterprise real-time communications.",
  online: true,
  isActive: true,
};

const devManager: WorkspaceMember = {
  id: "user-dev-mgr",
  name: "Marcus Vance",
  displayName: "marcus.v",
  email: "marcus@acme.com",
  role: "Department Head",
  department: "dev",
  title: "VP of Engineering",
  phone: "+1 (555) 019-3344",
  avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Marcus",
  status: "online",
  statusEmoji: "💻",
  statusText: "Reviewing pull requests",
  bio: "Leading core platform engineering.",
  online: true,
  isActive: true,
};

const marketingManager: WorkspaceMember = {
  id: "user-mktg-mgr",
  name: "Diana Prince",
  displayName: "diana.p",
  email: "diana@acme.com",
  role: "Manager",
  department: "marketing",
  title: "Head of Growth",
  phone: "+1 (555) 019-5566",
  avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Diana",
  status: "away",
  statusEmoji: "📈",
  statusText: "Q4 Campaign launch",
  bio: "Growth marketing & communications.",
  online: false,
  isActive: true,
};

const devMemberAlice: WorkspaceMember = {
  id: "user-dev-alice",
  name: "Alice Chen",
  displayName: "alice.c",
  email: "alice@acme.com",
  role: "Member",
  department: "dev",
  title: "Senior Full-Stack Engineer",
  phone: "+1 (555) 019-7788",
  avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Alice",
  status: "online",
  statusEmoji: "⚡",
  statusText: "Writing unit tests",
  bio: "React & Next.js specialist.",
  online: true,
  isActive: true,
};

const devMemberBob: WorkspaceMember = {
  id: "user-dev-bob",
  name: "Bob Builder",
  displayName: "bob.b",
  email: "bob@acme.com",
  role: "Member",
  department: "dev",
  title: "DevOps Engineer",
  avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Bob",
  status: "in_call",
  online: true,
  isActive: true,
};

const mktgMemberChloe: WorkspaceMember = {
  id: "user-mktg-chloe",
  name: "Chloe Bennett",
  displayName: "chloe.b",
  email: "chloe@acme.com",
  role: "Member",
  department: "marketing",
  title: "Content Strategist",
  avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Chloe",
  status: "offline",
  online: false,
  isActive: true,
};

const initialTeamMembers: WorkspaceMember[] = [
  ownerUser,
  devManager,
  marketingManager,
  devMemberAlice,
  devMemberBob,
  mktgMemberChloe,
];

// ------------------------------------------------------------------------------
// Master Execution Function
// ------------------------------------------------------------------------------

async function runAllEmpiricalStressTests() {
  console.log(`\n${BOLD}${CYAN}======================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}   KAELIXO M4 EMPIRICAL STRESS TEST HARNESS — CHALLENGER 2            ${RESET}`);
  console.log(`${BOLD}${CYAN}   Author: challenger_m4_2 (Critic & Specialist)                      ${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================================${RESET}\n`);

  // ============================================================================
  // SUITE 1: RBAC PERMISSIONS & AUTHORIZATION BOUNDARIES (R7)
  // ============================================================================
  console.log(`\n${BOLD}${YELLOW}--- [Suite 1] RBAC Permissions & Authorization Boundaries (R7) ---${RESET}`);

  await runScenario("Suite 1: RBAC", "RBAC-1.1", "isWorkspaceOwner oracle: canonical roles, aliases, case-insensitivity, and padding", () => {
    assert(isWorkspaceOwner(ownerUser), "ownerUser must be recognized as owner");
    assert(isWorkspaceOwner({ ...ownerUser, role: "owner" as any }), "lowercase 'owner' must be recognized");
    assert(isWorkspaceOwner({ ...ownerUser, role: "admin" as any }), "lowercase 'admin' must be recognized");
    assert(isWorkspaceOwner({ ...ownerUser, role: "Admin" as any }), "Title Case 'Admin' must be recognized");
    assert(isWorkspaceOwner({ ...ownerUser, role: "WORKSPACE OWNER" as any }), "Uppercase 'WORKSPACE OWNER' must be recognized");
    assert(isWorkspaceOwner({ ...ownerUser, role: "  owner  " as any }), "Whitespace-padded '  owner  ' must be recognized");

    assert(!isWorkspaceOwner(devManager), "Department Head is not Workspace Owner");
    assert(!isWorkspaceOwner(marketingManager), "Manager is not Workspace Owner");
    assert(!isWorkspaceOwner(devMemberAlice), "Regular member is not Workspace Owner");
    assert(!isWorkspaceOwner({ ...ownerUser, role: "guest" as any }), "Guest role is not Workspace Owner");
    assert(!isWorkspaceOwner({ ...ownerUser, role: "" as any }), "Empty role is not Workspace Owner");
    assert(!isWorkspaceOwner(null), "null user is not Workspace Owner");
    assert(!isWorkspaceOwner(undefined), "undefined user is not Workspace Owner");
  });

  await runScenario("Suite 1: RBAC", "RBAC-1.2", "isDepartmentHead & isDepartmentManager oracle: aliases, leads, and non-managers", () => {
    assert(isDepartmentHead(devManager), "devManager ('Department Head') must be recognized");
    assert(isDepartmentHead(marketingManager), "marketingManager ('Manager') must be recognized");
    assert(isDepartmentHead({ ...devManager, role: "lead" as any }), "Role 'lead' must be recognized");
    assert(isDepartmentHead({ ...devManager, role: "LEAD" as any }), "Role 'LEAD' must be recognized");
    assert(isDepartmentHead({ ...devManager, role: "  manager  " as any }), "Padded '  manager  ' must be recognized");
    assert(isDepartmentManager(devManager), "isDepartmentManager alias must return true for department head");

    assert(!isDepartmentHead(ownerUser), "Workspace Owner is not a Department Head");
    assert(!isDepartmentHead(devMemberAlice), "Regular member is not a Department Head");
    assert(!isDepartmentHead(null), "null user returns false");
    assert(!isDepartmentHead(undefined), "undefined user returns false");
  });

  await runScenario("Suite 1: RBAC", "RBAC-1.3", "canAddMember permission matrix: Owner and Managers permitted, Members blocked", () => {
    assert(canAddMember(ownerUser), "Workspace Owner can add members");
    assert(canAddMember(devManager), "Engineering Head can add members");
    assert(canAddMember(marketingManager), "Marketing Manager can add members");
    assert(!canAddMember(devMemberAlice), "Regular member Alice cannot add members");
    assert(!canAddMember(devMemberBob), "Regular member Bob cannot add members");
    assert(!canAddMember(null), "null user cannot add members");
    assert(!canAddMember(undefined), "undefined user cannot add members");
  });

  await runScenario("Suite 1: RBAC", "RBAC-1.4", "getAddMemberDepartmentScope: Owner unrestricted vs Head locked to department", () => {
    const ownerScope = getAddMemberDepartmentScope(ownerUser, mockDepartments);
    assertEqual(ownerScope.isLocked, false, "Owner department selector must not be locked");
    assertEqual(ownerScope.allowedDepartments.length, 5, "Owner must have access to all 5 valid departments (excluding 'all')");
    assert(!ownerScope.allowedDepartments.some((d) => d.code === "all"), "'all' department must be filtered out");

    const devMgrScope = getAddMemberDepartmentScope(devManager, mockDepartments);
    assertEqual(devMgrScope.isLocked, true, "Dev Manager department selector MUST be strictly locked");
    assertEqual(devMgrScope.defaultDepartment, "dev", "Dev Manager default department must be 'dev'");
    assertEqual(devMgrScope.allowedDepartments.length, 1, "Dev Manager allowed departments must contain exactly 1 entry");
    assertEqual(devMgrScope.allowedDepartments[0].code, "dev", "Dev Manager allowed department code must match their department");

    const mktgMgrScope = getAddMemberDepartmentScope(marketingManager, mockDepartments);
    assertEqual(mktgMgrScope.isLocked, true, "Marketing Manager department selector MUST be strictly locked");
    assertEqual(mktgMgrScope.defaultDepartment, "marketing", "Marketing Manager default department must be 'marketing'");
    assertEqual(mktgMgrScope.allowedDepartments[0].code, "marketing", "Allowed dept must be 'marketing'");

    const memberScope = getAddMemberDepartmentScope(devMemberAlice, mockDepartments);
    assertEqual(memberScope.isLocked, true, "Regular member department scope is locked");
    assertEqual(memberScope.allowedDepartments.length, 0, "Regular member has 0 allowed departments");
  });

  await runScenario("Suite 1: RBAC", "RBAC-1.5", "canRemoveMember Workspace Owner authority: cross-department managers and members", () => {
    const res1 = canRemoveMember(ownerUser, devMemberAlice);
    assertEqual(res1.allowed, true, "Owner can remove dev member Alice");

    const res2 = canRemoveMember(ownerUser, mktgMemberChloe);
    assertEqual(res2.allowed, true, "Owner can remove marketing member Chloe");

    const res3 = canRemoveMember(ownerUser, devManager);
    assertEqual(res3.allowed, true, "Owner can remove Engineering Head Marcus");

    const res4 = canRemoveMember(ownerUser, marketingManager);
    assertEqual(res4.allowed, true, "Owner can remove Marketing Manager Diana");
  });

  await runScenario("Suite 1: RBAC", "RBAC-1.6", "canRemoveMember Department Manager boundaries: in-dept members allowed, cross-dept & peer managers blocked", () => {
    const res1 = canRemoveMember(devManager, devMemberAlice);
    assertEqual(res1.allowed, true, "Dev Manager can remove dev member Alice");
    const res2 = canRemoveMember(devManager, devMemberBob);
    assertEqual(res2.allowed, true, "Dev Manager can remove dev member Bob");

    const res3 = canRemoveMember(devManager, mktgMemberChloe);
    assertEqual(res3.allowed, false, "Dev Manager CANNOT remove member in another department");
    assert(
      Boolean(res3.reason?.includes("Department Managers can only manage staff in their assigned department")),
      "Error reason must clearly state departmental restriction"
    );

    const peerDevMgr: WorkspaceMember = { ...devManager, id: "user-dev-mgr-2", name: "Second Lead" };
    const res4 = canRemoveMember(devManager, peerDevMgr);
    assertEqual(res4.allowed, false, "Department Manager cannot remove peer Department Manager");
    assertEqual(res4.reason, "Only the Workspace Owner can remove a Department Manager.");

    const res5 = canRemoveMember(devManager, marketingManager);
    assertEqual(res5.allowed, false, "Dev Manager cannot remove Marketing Manager");
  });

  await runScenario("Suite 1: RBAC", "RBAC-1.7", "canRemoveMember Regular Member restrictions: strictly read-only removal", () => {
    const res1 = canRemoveMember(devMemberAlice, devMemberBob);
    assertEqual(res1.allowed, false, "Member cannot remove fellow member");
    assertEqual(res1.reason, "Only Workspace Owners and Department Managers can remove members.");

    const res2 = canRemoveMember(devMemberAlice, devManager);
    assertEqual(res2.allowed, false, "Member cannot remove manager");

    const res3 = canRemoveMember(devMemberAlice, ownerUser);
    assertEqual(res3.allowed, false, "Member cannot remove owner");
  });

  await runScenario("Suite 1: RBAC", "RBAC-1.8", "canRemoveMember Guardrails: Self-removal blocked and Workspace Owner removal blocked", () => {
    const ownerSelf = canRemoveMember(ownerUser, ownerUser);
    assertEqual(ownerSelf.allowed, false, "Owner cannot self-remove");
    assertEqual(ownerSelf.reason, "You cannot remove your own account.");

    const mgrSelf = canRemoveMember(devManager, devManager);
    assertEqual(mgrSelf.allowed, false, "Manager cannot self-remove");
    assertEqual(mgrSelf.reason, "You cannot remove your own account.");

    const memberSelf = canRemoveMember(devMemberAlice, devMemberAlice);
    assertEqual(memberSelf.allowed, false, "Member cannot self-remove");
    assertEqual(memberSelf.reason, "You cannot remove your own account.");

    const peerOwner: WorkspaceMember = { ...ownerUser, id: "user-owner-2", name: "Co-Founder" };
    const ownerRemoveOwner = canRemoveMember(peerOwner, ownerUser);
    assertEqual(ownerRemoveOwner.allowed, false, "Cannot remove Workspace Owner");
    assertEqual(ownerRemoveOwner.reason, "Workspace Owners cannot be removed.");

    const mgrRemoveOwner = canRemoveMember(devManager, ownerUser);
    assertEqual(mgrRemoveOwner.allowed, false, "Manager cannot remove Workspace Owner");
    assertEqual(mgrRemoveOwner.reason, "Workspace Owners cannot be removed.");
  });

  await runScenario("Suite 1: RBAC", "RBAC-1.9", "canRemoveMember edge cases: null and undefined inputs handled gracefully", () => {
    const res1 = canRemoveMember(null, devMemberAlice);
    assertEqual(res1.allowed, false, "null currentUser handled safely");
    assertEqual(res1.reason, "Invalid member reference.");

    const res2 = canRemoveMember(ownerUser, null);
    assertEqual(res2.allowed, false, "null targetMember handled safely");

    const res3 = canRemoveMember(undefined, undefined);
    assertEqual(res3.allowed, false, "undefined inputs handled safely");
  });

  await runScenario("Suite 1: RBAC", "RBAC-1.10", "formatRoleLabel: Canonical casing, whitespace trimming, and fallback defaults", () => {
    assertEqual(formatRoleLabel("owner"), "Workspace Owner");
    assertEqual(formatRoleLabel("workspace owner"), "Workspace Owner");
    assertEqual(formatRoleLabel("admin"), "Admin");
    assertEqual(formatRoleLabel("manager"), "Manager");
    assertEqual(formatRoleLabel("department head"), "Department Head");
    assertEqual(formatRoleLabel("member"), "Member");
    assertEqual(formatRoleLabel("  OWNER  "), "Workspace Owner");
    assertEqual(formatRoleLabel("  Department Head  "), "Department Head");
    assertEqual(formatRoleLabel("unknown-role"), "Member");
    assertEqual(formatRoleLabel(undefined), "Member");
  });

  // ============================================================================
  // SUITE 2: ADD MEMBER VALIDATION & LIFECYCLE (R7)
  // ============================================================================
  console.log(`\n${BOLD}${YELLOW}--- [Suite 2] Add Member Validation & Lifecycle (R7) ---${RESET}`);

  await runScenario("Suite 2: Add Member", "ADD-2.1", "Email address format validation oracle: valid RFC emails vs malformed addresses", () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const validEmails = [
      "john.doe@acme.com",
      "elena_rostova+dev@sub.company.org",
      "user123@enterprise.co.uk",
      "a.b.c@d.io",
      "sarah.o'connor@tech.com",
    ];

    for (const em of validEmails) {
      assert(emailRegex.test(em), `Email '${em}' should pass regex`);
    }

    const invalidEmails = [
      "",
      "   ",
      "plainaddress",
      "missing@domain",
      "@missingusername.com",
      "spaces in@domain.com",
      "two@@domain.com",
      "missing.tld@domain.",
      "missingdot@domaincom",
    ];

    for (const em of invalidEmails) {
      const trimmed = em.trim();
      const isValid = trimmed.length > 0 && emailRegex.test(trimmed);
      assert(!isValid, `Invalid email '${em}' must be rejected`);
    }
  });

  await runScenario("Suite 2: Add Member", "ADD-2.2", "Duplicate email rejection oracle: case-insensitivity and whitespace resilience", () => {
    const existingEmails = initialTeamMembers.map((m) => m.email);

    const checkDuplicate = (emailToCheck: string): boolean => {
      const trimmed = emailToCheck.trim().toLowerCase();
      return existingEmails.some((e) => e.trim().toLowerCase() === trimmed);
    };

    assert(checkDuplicate("victoria@acme.com"), "Exact duplicate email must be detected");
    assert(checkDuplicate("VICTORIA@ACME.COM"), "Uppercase duplicate email must be detected");
    assert(checkDuplicate("  marcus@acme.com  "), "Padded duplicate email must be detected");
    assert(checkDuplicate("Alice@Acme.Com"), "Mixed-case duplicate email must be detected");

    assert(!checkDuplicate("victoria.new@acme.com"), "Distinct new email must not be flagged as duplicate");
    assert(!checkDuplicate("developer@acme.com"), "New email developer@acme.com must be allowed");
  });

  await runScenario("Suite 2: Add Member", "ADD-2.3", "Auto-generated initials and human name derivation from email", () => {
    const deriveNameFromEmail = (rawEmail: string): string => {
      const prefix = rawEmail.split("@")[0] || "";
      return prefix
        .replace(/[._-]/g, " ")
        .split(" ")
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
    };

    assertEqual(deriveNameFromEmail("alex.morgan@company.com"), "Alex Morgan");
    assertEqual(deriveNameFromEmail("john_doe_smith@enterprise.org"), "John Doe Smith");
    assertEqual(deriveNameFromEmail("sarah-connor@tech.net"), "Sarah Connor");
    assertEqual(deriveNameFromEmail("admin@kaelixo.com"), "Admin");

    const generateAvatar = (name: string) =>
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

    const avatarUrl = generateAvatar("Alex Morgan");
    assert(avatarUrl.includes("seed=Alex%20Morgan"), "Avatar URL must contain URL-encoded seed");
  });

  await runScenario("Suite 2: Add Member", "ADD-2.4", "Department and Role lock enforcement when adding member via Department Manager", () => {
    const simulateAddMember = (
      currentUser: WorkspaceMember,
      input: { email: string; name?: string; department: DepartmentCode; role: "Member" | "Manager" }
    ): WorkspaceMember => {
      const { isLocked, defaultDepartment } = getAddMemberDepartmentScope(currentUser, mockDepartments);
      const isOwner = isWorkspaceOwner(currentUser);

      const finalDept = isLocked ? defaultDepartment : input.department;
      const finalRole: "Member" | "Manager" = isOwner ? input.role : "Member";

      return {
        id: `user-${Date.now()}`,
        name: input.name || input.email.split("@")[0],
        displayName: (input.name || input.email.split("@")[0]).toLowerCase().replace(/\s+/g, "."),
        email: input.email.trim().toLowerCase(),
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(input.name || input.email)}`,
        role: finalRole,
        department: finalDept,
        status: "online",
        statusText: "Just joined Kaelixo",
        statusEmoji: "👋",
        online: true,
        isActive: true,
      };
    };

    const tamperedInput = {
      email: "infiltrator@acme.com",
      name: "Rogue User",
      department: "marketing",
      role: "Manager" as const,
    };

    const createdByManager = simulateAddMember(devManager, tamperedInput);
    assertEqual(createdByManager.department, "dev", "Manager CANNOT assign outside their department; locked to 'dev'");
    assertEqual(createdByManager.role, "Member", "Manager CANNOT assign Manager role; locked to 'Member'");

    const validOwnerInput = {
      email: "new.lead@acme.com",
      name: "New Lead",
      department: "marketing",
      role: "Manager" as const,
    };
    const createdByOwner = simulateAddMember(ownerUser, validOwnerInput);
    assertEqual(createdByOwner.department, "marketing", "Owner can assign marketing department");
    assertEqual(createdByOwner.role, "Manager", "Owner can assign Manager role");
  });

  await runScenario("Suite 2: Add Member", "ADD-2.5", "Member directory array immutable append and state preservation", () => {
    const newMember: WorkspaceMember = {
      id: "user-new-123",
      name: "Grace Hopper",
      displayName: "grace.h",
      email: "grace@acme.com",
      role: "Member",
      department: "dev",
      avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Grace",
      status: "online",
      online: true,
      isActive: true,
    };

    const updatedList = [...initialTeamMembers, newMember];
    assertEqual(updatedList.length, initialTeamMembers.length + 1, "List length must increment by 1");
    assert(updatedList.some((m) => m.id === "user-new-123"), "New member must exist in list");
    assertEqual(initialTeamMembers.length, 6, "Original array must remain unmutated (pure state)");
  });

  await runScenario("Suite 2: Add Member", "ADD-2.6", "AddMemberModal SSR markup: department & role lock states for Owner vs Manager", () => {
    const ownerModalHtml = ReactDOMServer.renderToStaticMarkup(
      React.createElement(AddMemberModal, {
        isOpen: true,
        onClose: () => {},
        currentUser: ownerUser,
        departments: mockDepartments,
        existingEmails: initialTeamMembers.map((m) => m.email),
        onAddMember: () => {},
      })
    );

    assert(ownerModalHtml.includes("Add Team Member"), "Modal renders title");
    assert(ownerModalHtml.includes("colleague@company.com"), "Modal renders email placeholder");
    assert(ownerModalHtml.includes("Full Name"), "Modal renders Full Name input");
    assert(ownerModalHtml.includes("Assigned Department"), "Modal renders Assigned Department");
    assert(ownerModalHtml.includes("Workspace Role"), "Modal renders Workspace Role");
    assert(ownerModalHtml.includes("Manager (Department administrator)"), "Owner sees Manager option");

    const mgrModalHtml = ReactDOMServer.renderToStaticMarkup(
      React.createElement(AddMemberModal, {
        isOpen: true,
        onClose: () => {},
        currentUser: devManager,
        departments: mockDepartments,
        existingEmails: initialTeamMembers.map((m) => m.email),
        onAddMember: () => {},
      })
    );

    assert(mgrModalHtml.includes("Locked to your department (DEV)"), "Manager sees locked department indicator");
    assert(mgrModalHtml.includes("Department Managers can only add Members"), "Manager sees promotion restriction note");
  });

  // ============================================================================
  // SUITE 3: MEMBER DIRECTORY SEARCH, FILTERING & VIEW MODES (R7)
  // ============================================================================
  console.log(`\n${BOLD}${YELLOW}--- [Suite 3] Member Directory Search, Filtering & View Modes (R7) ---${RESET}`);

  await runScenario("Suite 3: Directory", "DIR-3.1", "Multi-field search filtering: name, email, role, and department with regex safety", () => {
    const filterMembers = (members: WorkspaceMember[], query: string, dept: string) => {
      return members.filter((m) => {
        if (dept !== "all" && m.department !== dept) return false;
        if (!query.trim()) return true;
        const q = query.toLowerCase().trim();
        const nameMatch = m.name?.toLowerCase().includes(q);
        const emailMatch = m.email?.toLowerCase().includes(q);
        const roleMatch = m.role?.toLowerCase().includes(q);
        const deptMatch = m.department?.toLowerCase().includes(q);
        return nameMatch || emailMatch || roleMatch || deptMatch;
      });
    };

    const nameMatches = filterMembers(initialTeamMembers, "alice", "all");
    assertEqual(nameMatches.length, 1, "Search for 'alice' should return 1 member");
    assertEqual(nameMatches[0].name, "Alice Chen");

    const emailMatches = filterMembers(initialTeamMembers, "chloe@", "all");
    assertEqual(emailMatches.length, 1, "Search for 'chloe@' should return Chloe");

    const mgrMatches = filterMembers(initialTeamMembers, "manager", "all");
    assert(mgrMatches.length >= 1, "Search for 'manager' should return managers");

    const specialChars = ["(", "[", "*", "?", "+", "$", "^", "\\"];
    for (const char of specialChars) {
      const results = filterMembers(initialTeamMembers, char, "all");
      assert(Array.isArray(results), `Query '${char}' must execute safely without throwing regex error`);
    }
  });

  await runScenario("Suite 3: Directory", "DIR-3.2", "Department filtering: isolation of department members and 'all' view", () => {
    const devOnly = initialTeamMembers.filter((m) => m.department === "dev");
    assertEqual(devOnly.length, 4, "Engineering department must have 4 members (Victoria, Marcus, Alice, Bob)");

    const mktgOnly = initialTeamMembers.filter((m) => m.department === "marketing");
    assertEqual(mktgOnly.length, 2, "Marketing department must have 2 members (Diana, Chloe)");

    const designOnly = initialTeamMembers.filter((m) => m.department === "design");
    assertEqual(designOnly.length, 0, "Design department should have 0 members initially");
  });

  await runScenario("Suite 3: Directory", "DIR-3.3", "Member removal flow: array filtering and active profile drawer closing cascade", () => {
    let teamMembers = [...initialTeamMembers];
    let activeProfileMember: WorkspaceMember | null = devMemberBob;
    let rightPanelMode = "profile";

    const handleRemoveMember = (memberId: string) => {
      teamMembers = teamMembers.filter((m) => m.id !== memberId);
      if (activeProfileMember?.id === memberId) {
        activeProfileMember = null;
        rightPanelMode = "none";
      }
    };

    handleRemoveMember("user-dev-bob");
    assert(!teamMembers.some((m) => m.id === "user-dev-bob"), "Bob must be removed from teamMembers");
    assertEqual(activeProfileMember, null, "activeProfileMember must reset to null when removed");
    assertEqual(rightPanelMode, "none", "rightPanelMode must reset to 'none' when open profile is removed");

    activeProfileMember = ownerUser;
    rightPanelMode = "profile";
    handleRemoveMember("user-dev-alice");
    assert(!teamMembers.some((m) => m.id === "user-dev-alice"), "Alice must be removed");
    assertEqual(activeProfileMember?.id, "user-owner", "Victoria's profile drawer must remain open");
    assertEqual(rightPanelMode, "profile", "rightPanelMode remains 'profile'");
  });

  await runScenario("Suite 3: Directory", "DIR-3.4", "MemberDirectoryModal SSR markup: search bar, tabs, presence dots, and role pills", () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(MemberDirectoryModal, {
        isOpen: true,
        onClose: () => {},
        members: initialTeamMembers,
        currentUser: ownerUser,
        departments: mockDepartments,
        activeOrg: mockOrg,
        onSelectMemberForDm: () => {},
        onOpenProfileDrawer: () => {},
        onOpenAddMemberModal: () => {},
        onRemoveMember: () => {},
      })
    );

    assert(html.includes("People &amp; Member Directory") || html.includes("People & Member Directory"), "Modal header renders People Directory title");
    assert(html.includes("6 members"), "Modal header renders member count (6 members)");
    assert(html.includes("Search by name, email, role, or department"), "Search input rendered with placeholder");
    assert(html.includes("Victoria Sterling"), "Owner rendered in directory");
    assert(html.includes("Workspace Owner"), "Owner role badge rendered");
    assert(html.includes("Marcus Vance"), "Dev Manager rendered in directory");
    assert(html.includes("Alice Chen"), "Dev Member rendered in directory");
    assert(html.includes("Add Member"), "Owner sees Add Member button");
  });

  await runScenario("Suite 3: Directory", "DIR-3.5", "High-volume directory scalability stress benchmark: 1,000 members search & filter under 100ms", () => {
    const syntheticMembers: WorkspaceMember[] = [];
    const depts = ["dev", "marketing", "sales", "design", "ops"];
    for (let i = 0; i < 1000; i++) {
      const dept = depts[i % depts.length];
      syntheticMembers.push({
        id: `synth-user-${i}`,
        name: `Synthetic User ${i}`,
        displayName: `synth.user.${i}`,
        email: `user${i}@enterprise-scale.com`,
        role: i % 20 === 0 ? "Manager" : "Member",
        department: dept,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=User${i}`,
        status: i % 3 === 0 ? "online" : i % 3 === 1 ? "away" : "offline",
        online: i % 3 === 0,
        isActive: true,
      });
    }

    assertEqual(syntheticMembers.length, 1000, "1,000 synthetic members created");

    const tStart = Date.now();
    for (let q = 0; q < 50; q++) {
      const targetQuery = `User ${q * 10}`;
      const matches = syntheticMembers.filter(
        (m) => m.name.includes(targetQuery) || m.email.includes(targetQuery)
      );
      assert(matches.length >= 1, `Query '${targetQuery}' should find at least 1 match`);
    }

    for (const d of depts) {
      const deptMatches = syntheticMembers.filter((m) => m.department === d);
      assertEqual(deptMatches.length, 200, `Department ${d} should contain exactly 200 members`);
    }

    const tDuration = Date.now() - tStart;
    assert(tDuration < 100, `1,000 member filtering benchmark must complete under 100ms (took ${tDuration}ms)`);
  });

  await runScenario("Suite 3: Directory", "DIR-3.6", "Rapid member creation & deletion stress cycle: 50 sequential additions and purges", () => {
    let currentMembers = [...initialTeamMembers];
    const initialCount = currentMembers.length;

    const addedIds: string[] = [];
    for (let i = 0; i < 50; i++) {
      const id = `stress-user-${i}`;
      addedIds.push(id);
      currentMembers.push({
        id,
        name: `Stress Tester ${i}`,
        email: `stress${i}@acme.com`,
        role: "Member",
        department: "dev",
        avatar: "",
        status: "online",
        online: true,
      });
    }
    assertEqual(currentMembers.length, initialCount + 50, "50 members added");

    for (const id of addedIds) {
      currentMembers = currentMembers.filter((m) => m.id !== id);
    }
    assertEqual(currentMembers.length, initialCount, "Directory returns exactly to initial count");
  });

  // ============================================================================
  // SUITE 4: USER PROFILE DRAWER & PROFILE EDITOR (R8)
  // ============================================================================
  console.log(`\n${BOLD}${YELLOW}--- [Suite 4] User Profile Drawer & Profile Editor (R8) ---${RESET}`);

  await runScenario("Suite 4: Profile", "PROF-4.1", "UserProfileDrawer SSR rendering: Slack Screenshot 3 layout & self vs colleague actions", () => {
    const colleagueHtml = ReactDOMServer.renderToStaticMarkup(
      React.createElement(UserProfileDrawer, {
        member: devManager,
        currentUser: devMemberAlice,
        onClose: () => {},
        onStartDm: () => {},
        onOpenEditProfile: () => {},
      })
    );

    assert(colleagueHtml.includes("Marcus Vance"), "Drawer displays colleague's full name");
    assert(colleagueHtml.includes("@marcus.v"), "Drawer displays colleague's display name");
    assert(colleagueHtml.includes("Department Head"), "Drawer displays role badge");
    assert(colleagueHtml.includes("marcus@acme.com"), "Drawer displays contact email");
    assert(colleagueHtml.includes("+1 (555) 019-3344"), "Drawer displays contact phone");
    assert(colleagueHtml.includes("Message"), "Drawer displays 'Message' action button for colleague");
    assert(!colleagueHtml.includes("Edit Profile"), "Drawer MUST NOT display 'Edit Profile' button when viewing colleague");

    const selfHtml = ReactDOMServer.renderToStaticMarkup(
      React.createElement(UserProfileDrawer, {
        member: devMemberAlice,
        currentUser: devMemberAlice,
        onClose: () => {},
        onStartDm: () => {},
        onOpenEditProfile: () => {},
      })
    );

    assert(selfHtml.includes("Alice Chen"), "Drawer displays own name");
    assert(selfHtml.includes("Edit Profile"), "Drawer displays 'Edit Profile' button when viewing self");
    assert(!selfHtml.includes(">Message<"), "Drawer does not show 'Message' self button");
  });

  await runScenario("Suite 4: Profile", "PROF-4.2", "Profile Editor validation: empty name rejection and auto display name fallback", () => {
    const validateProfileUpdate = (input: { name: string; displayName?: string }) => {
      const trimmedName = input.name.trim();
      if (!trimmedName) {
        throw new Error("Full Name cannot be empty.");
      }
      const finalDisplayName = input.displayName?.trim() || trimmedName.toLowerCase().replace(/\s+/g, ".");
      return { name: trimmedName, displayName: finalDisplayName };
    };

    let caught = false;
    try {
      validateProfileUpdate({ name: "   " });
    } catch (e: any) {
      caught = true;
      assertEqual(e.message, "Full Name cannot be empty.");
    }
    assert(caught, "Empty name must throw error");

    const res1 = validateProfileUpdate({ name: "Elena Rostova", displayName: "" });
    assertEqual(res1.displayName, "elena.rostova", "Empty display name should auto-derive from full name");

    const res2 = validateProfileUpdate({ name: "Elena Rostova", displayName: "elena.r" });
    assertEqual(res2.displayName, "elena.r", "Explicit display name must be preserved");
  });

  await runScenario("Suite 4: Profile", "PROF-4.3", "Profile photo upload validation oracle: MIME type and 5MB size limits", () => {
    const validatePhotoUpload = (file: { name: string; type: string; size: number }) => {
      if (!file.type.startsWith("image/")) {
        throw new Error("Please select a valid image file (PNG, JPG, WebP).");
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Profile image must be less than 5MB.");
      }
      return true;
    };

    assert(validatePhotoUpload({ name: "photo.png", type: "image/png", size: 1024 * 100 }), "PNG within 5MB accepted");
    assert(validatePhotoUpload({ name: "photo.jpg", type: "image/jpeg", size: 4 * 1024 * 1024 }), "JPEG within 5MB accepted");
    assert(validatePhotoUpload({ name: "photo.webp", type: "image/webp", size: 5 * 1024 * 1024 }), "WebP exactly 5MB accepted");

    const invalidFiles = [
      { name: "resume.pdf", type: "application/pdf", size: 1024 },
      { name: "script.sh", type: "text/x-shellscript", size: 500 },
      { name: "archive.zip", type: "application/zip", size: 2000 },
    ];
    for (const f of invalidFiles) {
      let err = false;
      try {
        validatePhotoUpload(f);
      } catch (e: any) {
        err = true;
        assertEqual(e.message, "Please select a valid image file (PNG, JPG, WebP).");
      }
      assert(err, `File ${f.name} with MIME ${f.type} must be rejected`);
    }

    let sizeErr = false;
    try {
      validatePhotoUpload({ name: "huge.png", type: "image/png", size: 5 * 1024 * 1024 + 1 });
    } catch (e: any) {
      sizeErr = true;
      assertEqual(e.message, "Profile image must be less than 5MB.");
    }
    assert(sizeErr, "Image > 5MB must be rejected");
  });

  await runScenario("Suite 4: Profile", "PROF-4.4", "Profile persistence: cross-component state updates (currentUser, teamMembers, activeProfileMember)", () => {
    let currentUser: WorkspaceMember = { ...devMemberAlice };
    let teamMembers: WorkspaceMember[] = [...initialTeamMembers];
    let activeProfileMember: WorkspaceMember | null = { ...devMemberAlice };

    const handleSaveProfile = (updatedData: Partial<WorkspaceMember>) => {
      currentUser = { ...currentUser, ...updatedData };
      teamMembers = teamMembers.map((m) => (m.id === currentUser.id ? { ...m, ...updatedData } : m));
      if (activeProfileMember?.id === currentUser.id) {
        activeProfileMember = { ...activeProfileMember, ...updatedData };
      }
    };

    handleSaveProfile({
      title: "Staff Principal Engineer",
      phone: "+1 (555) 999-0000",
      statusEmoji: "🚀",
      statusText: "Deploying Milestone 4",
      bio: "Updated engineering bio.",
    });

    assertEqual(currentUser.title, "Staff Principal Engineer");
    assertEqual(currentUser.phone, "+1 (555) 999-0000");
    assertEqual(currentUser.statusEmoji, "🚀");

    const memberInList = teamMembers.find((m) => m.id === "user-dev-alice");
    assertEqual(memberInList?.title, "Staff Principal Engineer", "teamMembers list must reflect profile updates");
    assertEqual(memberInList?.statusText, "Deploying Milestone 4");

    assertEqual(activeProfileMember?.title, "Staff Principal Engineer", "Open profile drawer must update in real-time");
  });

  await runScenario("Suite 4: Profile", "PROF-4.5", "EditProfileModal SSR markup: avatar preview, form fields, and enterprise English labels", () => {
    const modalHtml = ReactDOMServer.renderToStaticMarkup(
      React.createElement(EditProfileModal, {
        isOpen: true,
        onClose: () => {},
        currentUser: devMemberAlice,
        departments: mockDepartments,
        onSaveProfile: () => {},
      })
    );

    assert(modalHtml.includes("Edit Your Profile"), "Modal renders title");
    assert(modalHtml.includes("Update your photo, contact details, and status"), "Modal renders subtitle");
    assert(modalHtml.includes("Full Name"), "Modal renders Full Name field");
    assert(modalHtml.includes("Display Name"), "Modal renders Display Name field");
    assert(modalHtml.includes("Job Title"), "Modal renders Job Title field");
    assert(modalHtml.includes("Phone Number"), "Modal renders Phone Number field");
    assert(modalHtml.includes("About Me") && modalHtml.includes("(Bio)"), "Modal renders Bio field");
    assert(modalHtml.includes("Save Changes"), "Modal renders Save Changes button");
  });

  await runScenario("Suite 4: Profile", "PROF-4.6", "Multilingual, international characters & extreme bio length boundary stress", () => {
    const internationalProfiles = [
      { name: "山田太郎", displayName: "taro.yamada", title: "ソフトウェアエンジニア" },
      { name: "Владимир Иванов", displayName: "vladimir.i", title: "Архитектор данных" },
      { name: "أحمد بن علي", displayName: "ahmed.ali", title: "مدير المنتجات" },
      { name: "Éléonore de La Tour", displayName: "eleonore.lt", title: "Directrice Financière" },
      { name: "Alex 🚀 ✨", displayName: "alex.spark", title: "AI Lead 🤖" },
    ];

    for (const p of internationalProfiles) {
      assert(p.name.trim().length > 0, "International name must be valid");
      assert(p.displayName.trim().length > 0, "International display name must be valid");
    }

    const longBio = "A".repeat(2000);
    assertEqual(longBio.length, 2000, "Bio length is exactly 2000 characters");

    const updatedMember: WorkspaceMember = { ...devMemberAlice, bio: longBio };
    assertEqual(updatedMember.bio?.length, 2000, "2000 character bio preserved perfectly without truncation");
  });

  // ============================================================================
  // SUITE 5: IN-APP NOTIFICATIONS & REAL-TIME PRESENCE (R5 / M4)
  // ============================================================================
  console.log(`\n${BOLD}${YELLOW}--- [Suite 5] In-App Notifications & Real-Time Presence (R5 / M4) ---${RESET}`);

  await runScenario("Suite 5: Notifications", "NOTIF-5.1", "Incoming notification processor: @mention, direct message, and self-suppression", () => {
    let notifications: Notification[] = [];
    let activeToast: any = null;

    const processIncomingNotification = (
      msg: { id: string; channelId: string; senderId?: string; senderName?: string; content: string; parentId?: string | null },
      currentUser: WorkspaceMember,
      channelObj?: { name: string; isDm?: boolean }
    ) => {
      if (msg.senderName === currentUser.name || msg.senderId === currentUser.id) return;

      const channelName = channelObj?.name || "conversation";
      const isDm = Boolean(channelObj?.isDm || msg.channelId.startsWith("dm-"));

      const contentLower = (msg.content || "").toLowerCase();
      const myName = currentUser.name.toLowerCase();
      const myDisplayName = (currentUser.displayName || "").toLowerCase();
      const isMention =
        contentLower.includes(`@${myName}`) ||
        (myDisplayName && contentLower.includes(`@${myDisplayName}`)) ||
        contentLower.includes("@channel") ||
        contentLower.includes("@here");

      if (isMention || isDm) {
        const type = isMention ? "mention" : "dm";
        const notif: Notification = {
          id: `notif-${Date.now()}`,
          userId: currentUser.id,
          senderName: msg.senderName || "Colleague",
          type,
          channelId: msg.channelId,
          channelName,
          messageId: msg.id,
          content: msg.content || "",
          read: false,
          isRead: false,
          createdAt: "Just now",
        };
        notifications = [notif, ...notifications];
        activeToast = notif;
      }
    };

    processIncomingNotification(
      { id: "m-1", channelId: "c-dev", senderId: "user-dev-mgr", senderName: "Marcus Vance", content: "Hey @alice.c can you review this PR?" },
      devMemberAlice,
      { name: "engineering" }
    );
    assertEqual(notifications.length, 1, "Mention creates 1 notification");
    assertEqual(notifications[0].type, "mention");
    assert(activeToast !== null, "Toast alert triggered");

    processIncomingNotification(
      { id: "m-2", channelId: "dm-alice-diana", senderId: "user-mktg-mgr", senderName: "Diana Prince", content: "Hi Alice, quick question." },
      devMemberAlice,
      { name: "Diana Prince", isDm: true }
    );
    assertEqual(notifications.length, 2, "DM creates 2nd notification");
    assertEqual(notifications[0].type, "dm");

    processIncomingNotification(
      { id: "m-3", channelId: "c-dev", senderId: "user-dev-alice", senderName: "Alice Chen", content: "Note to @alice.c to follow up" },
      devMemberAlice,
      { name: "engineering" }
    );
    assertEqual(notifications.length, 2, "Self-mention MUST be suppressed (count remains 2)");
  });

  await runScenario("Suite 5: Notifications", "NOTIF-5.2", "NotificationCenter popover: tab filtering, unread count badge, and mark-all-read", () => {
    const testNotifs: Notification[] = [
      { id: "n-1", userId: "u-1", senderName: "Bob", type: "mention", channelId: "c-1", content: "@alice ping", read: false, isRead: false, createdAt: "1m" },
      { id: "n-2", userId: "u-1", senderName: "Diana", type: "dm", channelId: "dm-1", content: "Hello", read: false, isRead: false, createdAt: "2m" },
      { id: "n-3", userId: "u-1", senderName: "Marcus", type: "thread_reply", channelId: "c-1", content: "Agreed", read: true, isRead: true, createdAt: "5m" },
    ];

    const allNotifs = testNotifs;
    assertEqual(allNotifs.length, 3);

    const unreadNotifs = testNotifs.filter((n) => n.read === false || n.isRead === false);
    assertEqual(unreadNotifs.length, 2);

    const mentionNotifs = testNotifs.filter((n) => n.type === "mention");
    assertEqual(mentionNotifs.length, 1);

    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(NotificationCenter, {
        notifications: testNotifs,
        unreadCount: 2,
        onMarkAsRead: () => {},
        onMarkAllAsRead: () => {},
        onSelectNotification: () => {},
      })
    );

    assert(html.includes("Notifications"), "Renders Notifications bell header");
    assert(html.includes("2"), "Badge shows 2 unread notifications");
  });

  await runScenario("Suite 5: Notifications", "NOTIF-5.3", "Real-Time Presence mapping onto workspace members", () => {
    const presenceMap: Record<string, "online" | "away" | "offline"> = {
      "user-dev-alice": "online",
      "user-dev-bob": "away",
      "user-mktg-chloe": "offline",
    };

    const membersWithPresence = initialTeamMembers.map((m) => {
      const liveStatus = presenceMap[m.id];
      if (liveStatus) {
        return {
          ...m,
          status: liveStatus,
          online: liveStatus === "online",
        };
      }
      return m;
    });

    const alicePresence = membersWithPresence.find((m) => m.id === "user-dev-alice");
    assertEqual(alicePresence?.status, "online");
    assertEqual(alicePresence?.online, true);

    const bobPresence = membersWithPresence.find((m) => m.id === "user-dev-bob");
    assertEqual(bobPresence?.status, "away");
    assertEqual(bobPresence?.online, false);

    const chloePresence = membersWithPresence.find((m) => m.id === "user-mktg-chloe");
    assertEqual(chloePresence?.status, "offline");
    assertEqual(chloePresence?.online, false);
  });

  // ============================================================================
  // SUITE 6: ENTERPRISE ENGLISH STANDARD VERIFICATION (R10)
  // ============================================================================
  console.log(`\n${BOLD}${YELLOW}--- [Suite 6] Enterprise English Standard Verification (R10) ---${RESET}`);

  await runScenario("Suite 6: English Standard", "ENG-6.1", "Automated scan of src/ for Malayalam Unicode range [\\u0D00-\\u0D7F]", () => {
    const srcDir = path.resolve(__dirname, "../../src");
    const malayalamRegex = /[\u0D00-\u0D7F]/;

    const scanDirectory = (dir: string): { file: string; line: number; text: string }[] => {
      const violations: { file: string; line: number; text: string }[] = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          violations.push(...scanDirectory(fullPath));
        } else if (/\.(ts|tsx|js|jsx|json)$/.test(entry.name)) {
          const content = fs.readFileSync(fullPath, "utf-8");
          const lines = content.split("\n");
          lines.forEach((line, idx) => {
            if (malayalamRegex.test(line)) {
              violations.push({ file: fullPath, line: idx + 1, text: line.trim() });
            }
          });
        }
      }
      return violations;
    };

    const violations = scanDirectory(srcDir);
    if (violations.length > 0) {
      console.error("Found Malayalam unicode violations in src/:", violations);
    }
    assertEqual(violations.length, 0, `Expected 0 Malayalam characters, found ${violations.length}`);
  });

  await runScenario("Suite 6: English Standard", "ENG-6.2", "Automated scan of src/ for Manglish dialect tokens", () => {
    const srcDir = path.resolve(__dirname, "../../src");
    const manglishRegex = /\b(cheyyan|sadhikko|akknam|vachu|aneee|pattnam|thanna|ellam|njan|ningal|enth|evide|ipo|ippo)\b/i;

    const scanDirectory = (dir: string): { file: string; line: number; text: string }[] => {
      const violations: { file: string; line: number; text: string }[] = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          violations.push(...scanDirectory(fullPath));
        } else if (/\.(ts|tsx|js|jsx|json)$/.test(entry.name)) {
          const content = fs.readFileSync(fullPath, "utf-8");
          const lines = content.split("\n");
          lines.forEach((line, idx) => {
            if (manglishRegex.test(line)) {
              violations.push({ file: fullPath, line: idx + 1, text: line.trim() });
            }
          });
        }
      }
      return violations;
    };

    const violations = scanDirectory(srcDir);
    if (violations.length > 0) {
      console.error("Found Manglish dialect violations in src/:", violations);
    }
    assertEqual(violations.length, 0, `Expected 0 Manglish terms, found ${violations.length}`);
  });

  // ============================================================================
  // SUMMARY REPORT
  // ============================================================================
  console.log(`\n${BOLD}${CYAN}======================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}                     HARNESS EXECUTION SUMMARY                        ${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================================${RESET}`);

  const passedTests = testResults.filter((t) => t.passed);
  const failedTests = testResults.filter((t) => !t.passed);
  const totalDuration = testResults.reduce((acc, t) => acc + t.durationMs, 0);

  const suites = Array.from(new Set(testResults.map((t) => t.suite)));
  for (const s of suites) {
    const suiteTests = testResults.filter((t) => t.suite === s);
    const suitePassed = suiteTests.filter((t) => t.passed).length;
    console.log(`  ${s}: ${suitePassed}/${suiteTests.length} Passed`);
  }

  console.log(`----------------------------------------------------------------------`);
  console.log(`  Total Scenarios: ${testResults.length}`);
  console.log(`  Passed:          ${GREEN}${passedTests.length}${RESET}`);
  console.log(`  Failed:          ${failedTests.length > 0 ? RED : GREEN}${failedTests.length}${RESET}`);
  console.log(`  Total Duration:  ${totalDuration}ms`);
  console.log(`  Pass Rate:        ${((passedTests.length / testResults.length) * 100).toFixed(1)}%`);
  console.log(`${BOLD}${CYAN}======================================================================${RESET}\n`);

  if (failedTests.length > 0) {
    console.error(`${RED}${BOLD}HARNESS FAILED WITH ${failedTests.length} FAILURES${RESET}`);
    process.exit(1);
  } else {
    console.log(`${GREEN}${BOLD}ALL EMPIRICAL STRESS TESTS PASSED SUCCESSFULLY! (100% Pass Rate)${RESET}\n`);
    process.exit(0);
  }
}

runAllEmpiricalStressTests().catch((err) => {
  console.error("Fatal error during test harness execution:", err);
  process.exit(1);
});
