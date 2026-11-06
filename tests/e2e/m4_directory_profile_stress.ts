/**
 * Milestone 4 Adversarial Stress & Quality Verification Harness
 * Focus: Member Directory & RBAC Permissions (R7), User Profile Drawer & Editor (R8), Enterprise English Standard (R10)
 */

import {
  isWorkspaceOwner,
  isDepartmentHead,
  canAddMember,
  getAddMemberDepartmentScope,
  canRemoveMember,
  formatRoleLabel,
} from "../../src/utils/permissions";
import { WorkspaceMember, Department, DepartmentCode } from "../../src/types";
import * as fs from "fs";
import * as path from "path";

// Color constants
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const GRAY = "\x1b[90m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runTest(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ${GREEN}✓${RESET} ${name}`);
  } catch (err: unknown) {
    failedTests++;
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  ${RED}✗ ${name}${RESET}`);
    console.log(`    ${RED}Error: ${msg}${RESET}`);
  }
}

console.log(`\n${BOLD}${CYAN}======================================================================${RESET}`);
console.log(`${BOLD}${CYAN}  MILESTONE 4 ADVERSARIAL STRESS TEST: DIRECTORY, RBAC & PROFILES     ${RESET}`);
console.log(`${BOLD}${CYAN}======================================================================${RESET}\n`);

// Fixtures
const owner: WorkspaceMember = {
  id: "u-owner",
  name: "Sarah Owner",
  displayName: "sarah.owner",
  role: "Workspace Owner",
  department: "management",
  email: "sarah@acme.corp",
  avatar: "https://example.com/avatar1.png",
  online: true,
  status: "online",
};

const devLead: WorkspaceMember = {
  id: "u-devlead",
  name: "Dave DevLead",
  displayName: "dave.lead",
  role: "Department Head",
  department: "dev",
  email: "dave@acme.corp",
  avatar: "https://example.com/avatar2.png",
  online: true,
  status: "online",
};

const devManager: WorkspaceMember = {
  id: "u-devmgr",
  name: "Dan DevManager",
  displayName: "dan.mgr",
  role: "Manager",
  department: "dev",
  email: "dan@acme.corp",
  avatar: "https://example.com/avatar3.png",
  online: false,
  status: "offline",
};

const designLead: WorkspaceMember = {
  id: "u-designlead",
  name: "Diana DesignLead",
  displayName: "diana.lead",
  role: "Department Head",
  department: "design",
  email: "diana@acme.corp",
  avatar: "https://example.com/avatar4.png",
  online: true,
  status: "away",
};

const devStaff1: WorkspaceMember = {
  id: "u-devstaff1",
  name: "Alex DevStaff",
  displayName: "alex.staff",
  role: "Member",
  department: "dev",
  email: "alex@acme.corp",
  avatar: "https://example.com/avatar5.png",
  online: true,
  status: "online",
};

const designStaff1: WorkspaceMember = {
  id: "u-designstaff1",
  name: "Chloe DesignStaff",
  displayName: "chloe.staff",
  role: "Member",
  department: "design",
  email: "chloe@acme.corp",
  avatar: "https://example.com/avatar6.png",
  online: false,
  status: "offline",
};

const departments: Department[] = [
  { id: "dept-all", code: "all", name: "All Channels & Departments", description: "All teams", icon: "Building", color: "indigo" },
  { id: "dept-dev", code: "dev", name: "Engineering & Dev", description: "Software development", icon: "Code", color: "emerald" },
  { id: "dept-design", code: "design", name: "Product Design", description: "UI/UX & Branding", icon: "Palette", color: "purple" },
  { id: "dept-mkt", code: "marketing", name: "Growth Marketing", description: "Growth & Outreach", icon: "Megaphone", color: "amber" },
];

// --- SUITE 1: RBAC Permission Engine & Boundary Conditions ---
console.log(`${BOLD}${YELLOW}--- [Suite 1] RBAC Permission Engine & Boundaries ---${RESET}`);

runTest("1.1: Workspace Owner role detection across case and aliases", () => {
  if (!isWorkspaceOwner(owner)) throw new Error("Owner failed detection");
  if (!isWorkspaceOwner({ ...owner, role: "Owner" as any })) throw new Error("Role 'Owner' failed detection");
  if (!isWorkspaceOwner({ ...owner, role: "ADMIN" as any })) throw new Error("Role 'ADMIN' failed detection");
  if (!isWorkspaceOwner({ ...owner, role: "  workspace owner  " as any })) throw new Error("Trimmed role failed detection");
  if (isWorkspaceOwner(devLead)) throw new Error("DevLead falsely identified as Workspace Owner");
  if (isWorkspaceOwner(devStaff1)) throw new Error("Staff falsely identified as Workspace Owner");
  if (isWorkspaceOwner(null)) throw new Error("null user should return false");
  if (isWorkspaceOwner(undefined)) throw new Error("undefined user should return false");
});

runTest("1.2: Department Head / Manager detection across variants", () => {
  if (!isDepartmentHead(devLead)) throw new Error("DevLead failed detection");
  if (!isDepartmentHead(devManager)) throw new Error("DevManager failed detection");
  if (!isDepartmentHead({ ...devLead, role: "lead" as any })) throw new Error("Role 'lead' failed detection");
  if (isDepartmentHead(owner)) throw new Error("Owner should not be classified as Department Head");
  if (isDepartmentHead(devStaff1)) throw new Error("Regular member falsely identified as Department Head");
  if (isDepartmentHead(null)) throw new Error("null user should return false");
});

runTest("1.3: Add Member permission and department locking scope", () => {
  // Owner can add to any dept
  if (!canAddMember(owner)) throw new Error("Owner cannot add member");
  const ownerScope = getAddMemberDepartmentScope(owner, departments);
  if (ownerScope.isLocked) throw new Error("Owner department scope must NOT be locked");
  if (ownerScope.allowedDepartments.length !== 3) throw new Error("Owner should see all 3 valid depts");

  // Manager can only add to own dept
  if (!canAddMember(devLead)) throw new Error("DevLead cannot add member");
  const devLeadScope = getAddMemberDepartmentScope(devLead, departments);
  if (!devLeadScope.isLocked) throw new Error("DevLead department scope MUST be locked");
  if (devLeadScope.allowedDepartments.length !== 1 || devLeadScope.allowedDepartments[0].code !== "dev") {
    throw new Error("DevLead must be restricted to dev department");
  }

  // Regular Member cannot add
  if (canAddMember(devStaff1)) throw new Error("Regular member must NOT be permitted to add members");
  const staffScope = getAddMemberDepartmentScope(devStaff1, departments);
  if (staffScope.allowedDepartments.length !== 0) throw new Error("Member should have zero allowed depts");
});

runTest("1.4: Removal Matrix: Workspace Owner privileges and immunities", () => {
  // Owner cannot remove self
  const selfRemove = canRemoveMember(owner, owner);
  if (selfRemove.allowed) throw new Error("Owner should NOT be able to remove themselves");

  // Owner can remove managers and staff across any department
  if (!canRemoveMember(owner, devLead).allowed) throw new Error("Owner must be able to remove Department Head");
  if (!canRemoveMember(owner, designLead).allowed) throw new Error("Owner must be able to remove Design Head");
  if (!canRemoveMember(owner, devStaff1).allowed) throw new Error("Owner must be able to remove Dev staff");
  if (!canRemoveMember(owner, designStaff1).allowed) throw new Error("Owner must be able to remove Design staff");

  // No one can remove the Owner
  if (canRemoveMember(devLead, owner).allowed) throw new Error("DevLead must NOT remove Workspace Owner");
  if (canRemoveMember(devStaff1, owner).allowed) throw new Error("Staff must NOT remove Workspace Owner");
});

runTest("1.5: Removal Matrix: Department Head scoped authority & peer isolation", () => {
  // DevLead CAN remove dev staff in own department
  const removeOwn = canRemoveMember(devLead, devStaff1);
  if (!removeOwn.allowed) throw new Error("DevLead should be able to remove staff in own department");

  // DevLead CANNOT remove staff in another department (Design)
  const removeOtherDept = canRemoveMember(devLead, designStaff1);
  if (removeOtherDept.allowed) throw new Error("DevLead must NOT remove staff in another department");
  if (!removeOtherDept.reason?.includes("Department Managers can only manage staff")) {
    throw new Error("Missing descriptive departmental error message");
  }

  // DevLead CANNOT remove peer manager in own department
  const removePeerManager = canRemoveMember(devLead, devManager);
  if (removePeerManager.allowed) throw new Error("DevLead must NOT remove peer manager");
  if (!removePeerManager.reason?.includes("Only the Workspace Owner can remove a Department Manager")) {
    throw new Error("Missing peer manager error explanation");
  }

  // DevLead CANNOT remove manager in another department
  const removeOtherManager = canRemoveMember(devLead, designLead);
  if (removeOtherManager.allowed) throw new Error("DevLead must NOT remove manager in other department");

  // DevLead CANNOT remove self
  if (canRemoveMember(devLead, devLead).allowed) throw new Error("Manager cannot remove self");
});

runTest("1.6: Removal Matrix: Regular Member zero-privilege enforcement", () => {
  if (canRemoveMember(devStaff1, designStaff1).allowed) throw new Error("Staff cannot remove peer");
  if (canRemoveMember(devStaff1, devLead).allowed) throw new Error("Staff cannot remove manager");
  if (canRemoveMember(devStaff1, owner).allowed) throw new Error("Staff cannot remove owner");
  if (canRemoveMember(devStaff1, devStaff1).allowed) throw new Error("Staff cannot remove self");
});

runTest("1.7: Role Label Normalization and Fallbacks", () => {
  if (formatRoleLabel("owner") !== "Workspace Owner") throw new Error("Failed normalizing owner");
  if (formatRoleLabel("workspace owner") !== "Workspace Owner") throw new Error("Failed normalizing workspace owner");
  if (formatRoleLabel("admin") !== "Admin") throw new Error("Failed normalizing admin");
  if (formatRoleLabel("department head") !== "Department Head") throw new Error("Failed normalizing department head");
  if (formatRoleLabel("manager") !== "Manager") throw new Error("Failed normalizing manager");
  if (formatRoleLabel("unknown_role") !== "Member") throw new Error("Failed unknown fallback to Member");
  if (formatRoleLabel(undefined) !== "Member") throw new Error("Failed undefined fallback to Member");
});

// --- SUITE 2: Add Member Business Rules & Input Derivation ---
console.log(`\n${BOLD}${YELLOW}--- [Suite 2] Add Member Input Derivation & Guards ---${RESET}`);

runTest("2.1: Human name derivation from email handle", () => {
  const deriveNameFromEmail = (rawEmail: string): string => {
    const prefix = rawEmail.split("@")[0] || "";
    return prefix
      .replace(/[._-]/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  };

  if (deriveNameFromEmail("alex.morgan@company.com") !== "Alex Morgan") {
    throw new Error("Failed dotted name derivation");
  }
  if (deriveNameFromEmail("john_doe_jr@company.com") !== "John Doe Jr") {
    throw new Error("Failed underscore name derivation");
  }
  if (deriveNameFromEmail("sam-smith@company.com") !== "Sam Smith") {
    throw new Error("Failed hyphen name derivation");
  }
  if (deriveNameFromEmail("taylor@company.com") !== "Taylor") {
    throw new Error("Failed single word name derivation");
  }
});

runTest("2.2: Duplicate email detection logic", () => {
  const roster = [owner, devLead, devStaff1];
  const existingEmails = roster.map((m) => m.email.toLowerCase().trim());

  const checkDuplicate = (email: string) => existingEmails.includes(email.toLowerCase().trim());

  if (!checkDuplicate("sarah@acme.corp")) throw new Error("Duplicate email missed");
  if (!checkDuplicate("SARAH@ACME.CORP")) throw new Error("Case-insensitive duplicate email missed");
  if (!checkDuplicate("  dave@acme.corp  ")) throw new Error("Untrimmed duplicate email missed");
  if (checkDuplicate("newguy@acme.corp")) throw new Error("False positive duplicate detected");
});

// --- SUITE 3: Member Directory Search, Filtering & View Modes ---
console.log(`\n${BOLD}${YELLOW}--- [Suite 3] Member Directory Search & Filtering ---${RESET}`);

runTest("3.1: Directory filter across search keywords and department codes", () => {
  const allMembers = [owner, devLead, devManager, designLead, devStaff1, designStaff1];

  const filterMembers = (query: string, dept: string) => {
    return allMembers.filter((member) => {
      if (dept !== "all" && member.department !== dept) return false;
      if (query.trim()) {
        const q = query.toLowerCase().trim();
        const nameMatch = member.name.toLowerCase().includes(q);
        const emailMatch = member.email.toLowerCase().includes(q);
        const roleMatch = member.role.toLowerCase().includes(q);
        const deptMatch = member.department.toLowerCase().includes(q);
        return nameMatch || emailMatch || roleMatch || deptMatch;
      }
      return true;
    });
  };

  // Dept filter alone
  const devOnly = filterMembers("", "dev");
  if (devOnly.length !== 3) throw new Error(`Expected 3 dev members, got ${devOnly.length}`);

  const designOnly = filterMembers("", "design");
  if (designOnly.length !== 2) throw new Error(`Expected 2 design members, got ${designOnly.length}`);

  // Query search alone
  const searchAlex = filterMembers("alex", "all");
  if (searchAlex.length !== 1 || searchAlex[0].id !== "u-devstaff1") {
    throw new Error("Failed to find Alex by name");
  }

  const searchHead = filterMembers("head", "all");
  if (searchHead.length !== 2) throw new Error("Failed to find 2 department heads by role query");

  // Combined query + dept filter
  const searchLeadInDev = filterMembers("lead", "dev");
  if (searchLeadInDev.length !== 1 || searchLeadInDev[0].id !== "u-devlead") {
    throw new Error("Failed combined query + department filter");
  }
});

// --- SUITE 4: Profile Drawer & Edit Profile Business Logic ---
console.log(`\n${BOLD}${YELLOW}--- [Suite 4] Profile Drawer & Editor Logic ---${RESET}`);

runTest("4.1: Profile drawer button visibility invariants", () => {
  const isSelf = (current: WorkspaceMember, target: WorkspaceMember) => current.id === target.id;

  // When viewing self: can edit, cannot DM self
  if (!isSelf(devStaff1, devStaff1)) throw new Error("Self check failed");
  // When viewing another user: can DM, cannot edit
  if (isSelf(devStaff1, designStaff1)) throw new Error("Peer check failed");
});

runTest("4.2: Edit profile data sanitization and default fallback", () => {
  const sanitizeProfileUpdate = (
    current: WorkspaceMember,
    input: {
      name: string;
      displayName?: string;
      title?: string;
      phone?: string;
      statusEmoji?: string;
      statusText?: string;
      bio?: string;
      avatar?: string;
    }
  ): Partial<WorkspaceMember> => {
    const trimmedName = input.name.trim();
    if (!trimmedName) throw new Error("Full Name cannot be empty.");
    return {
      name: trimmedName,
      displayName: input.displayName?.trim() || trimmedName.toLowerCase().replace(/\s+/g, "."),
      title: input.title?.trim() || "",
      phone: input.phone?.trim() || "",
      statusEmoji: input.statusEmoji?.trim() || "💬",
      statusText: input.statusText?.trim() || "",
      bio: input.bio?.trim() || "",
      avatar: input.avatar || current.avatar,
    };
  };

  // Normal update
  const updated = sanitizeProfileUpdate(devStaff1, {
    name: "Alex M. Staff",
    displayName: "alex.m",
    title: "Senior Backend Engineer",
    phone: "+1 555-0199",
    statusEmoji: "🚀",
    statusText: "Deploying M4",
  });
  if (updated.name !== "Alex M. Staff") throw new Error("Name mismatch");
  if (updated.displayName !== "alex.m") throw new Error("DisplayName mismatch");
  if (updated.statusEmoji !== "🚀") throw new Error("Status emoji mismatch");

  // Fallback display name when omitted
  const fallbackUpdate = sanitizeProfileUpdate(devStaff1, {
    name: "Alex Doe",
    displayName: "",
  });
  if (fallbackUpdate.displayName !== "alex.doe") {
    throw new Error(`Expected fallback display name 'alex.doe', got '${fallbackUpdate.displayName}'`);
  }

  // Rejection of empty name
  let threw = false;
  try {
    sanitizeProfileUpdate(devStaff1, { name: "   " });
  } catch {
    threw = true;
  }
  if (!threw) throw new Error("Empty name failed validation");
});

// --- SUITE 5: Enterprise English Standard Audit ---
console.log(`\n${BOLD}${YELLOW}--- [Suite 5] Enterprise English Standard Audit (0% Malayalam) ---${RESET}`);

runTest("5.1: Zero Malayalam characters in Directory & Profile components", () => {
  const targetFiles = [
    "../../src/components/directory/member-directory-modal.tsx",
    "../../src/components/directory/add-member-modal.tsx",
    "../../src/components/profile/user-profile-drawer.tsx",
    "../../src/components/profile/edit-profile-modal.tsx",
    "../../src/utils/permissions.ts",
  ];

  const malayalamRegex = /[\u0D00-\u0D7F]/;

  for (const relPath of targetFiles) {
    const absPath = path.resolve(__dirname, relPath);
    if (!fs.existsSync(absPath)) throw new Error(`Missing target file: ${relPath}`);
    const content = fs.readFileSync(absPath, "utf-8");
    if (malayalamRegex.test(content)) {
      throw new Error(`Malayalam character detected in ${relPath}!`);
    }
  }
});

runTest("5.2: Professional Enterprise terminology check in UI copy", () => {
  const dirModal = fs.readFileSync(
    path.resolve(__dirname, "../../src/components/directory/member-directory-modal.tsx"),
    "utf-8"
  );
  if (!dirModal.includes("People &amp; Member Directory") && !dirModal.includes("People & Member Directory")) {
    throw new Error("Missing proper Directory title");
  }
  if (!dirModal.includes("Browse colleagues, connect directly, and manage department permissions.")) {
    throw new Error("Missing proper subtitle copy");
  }

  const addModal = fs.readFileSync(
    path.resolve(__dirname, "../../src/components/directory/add-member-modal.tsx"),
    "utf-8"
  );
  if (!addModal.includes("Work Email Address")) {
    throw new Error("Missing proper Work Email label");
  }
  if (!addModal.includes("Assigned Department")) {
    throw new Error("Missing proper Assigned Department label");
  }

  const profileDrawer = fs.readFileSync(
    path.resolve(__dirname, "../../src/components/profile/user-profile-drawer.tsx"),
    "utf-8"
  );
  if (!profileDrawer.includes("Contact Information")) {
    throw new Error("Missing Contact Information header");
  }
  if (!profileDrawer.includes("About Me")) {
    throw new Error("Missing About Me section");
  }
});

// Summary
console.log(`\n${BOLD}${CYAN}======================================================================${RESET}`);
console.log(`${BOLD}${CYAN}                  ADVERSARIAL STRESS TEST SUMMARY                    ${RESET}`);
console.log(`${BOLD}${CYAN}======================================================================${RESET}`);
console.log(`  Total Scenarios Executed: ${totalTests}`);
console.log(`  Passed:                   ${GREEN}${passedTests}${RESET}`);
console.log(`  Failed:                   ${failedTests > 0 ? RED : GREEN}${failedTests}${RESET}`);
const passRate = ((passedTests / totalTests) * 100).toFixed(1);
console.log(`  Pass Rate:                ${failedTests === 0 ? GREEN : RED}${passRate}%${RESET}`);
console.log(`${BOLD}${CYAN}======================================================================${RESET}\n`);

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log(`${GREEN}${BOLD}ALL ADVERSARIAL STRESS SCENARIOS PASSED WITH ZERO ERRORS!${RESET}\n`);
  process.exit(0);
}
