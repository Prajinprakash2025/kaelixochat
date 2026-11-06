/**
 * Adversarial Stress & Corner-Case Suite for Milestone 4
 * Author: Milestone 4 Reviewer (reviewer_m4_1: reviewer, critic)
 * Target: Kaelixo Milestone 4 Features (Features 19, 20, 21, 22, 25, 26, 27, 29)
 */

import {
  isWorkspaceOwner,
  isDepartmentHead,
  isDepartmentManager,
  canAddMember,
  getAddMemberDepartmentScope,
  canRemoveMember,
  formatRoleLabel,
} from "../../src/utils/permissions";
import { formatDbMessage, teardownChannel } from "../../src/utils/realtime";
import {
  WorkspaceMember,
  Department,
  Message,
  Channel,
  Notification,
} from "../../src/types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

let passed = 0;
let total = 0;

function test(name: string, fn: () => void | Promise<void>) {
  total++;
  try {
    const res = fn();
    if (res instanceof Promise) {
      throw new Error("Async test encountered; use async wrapper");
    }
    passed++;
    console.log(`  ✓ PASS: ${name}`);
  } catch (err: any) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
    throw err;
  }
}

async function testAsync(name: string, fn: () => Promise<void>) {
  total++;
  try {
    await fn();
    passed++;
    console.log(`  ✓ PASS: ${name}`);
  } catch (err: any) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
    throw err;
  }
}

async function runAll() {
  console.log("======================================================================");
  console.log("       MILESTONE 4 REVIEWER ADVERSARIAL STRESS TEST SUITE            ");
  console.log("======================================================================\n");

  // --- SECTION 1: Permissions Engine Adversarial Stress Testing ---
  console.log("--- [Section 1] Permissions & RBAC Guard Rails (R7 / Features 25 & 26) ---");

  const owner: WorkspaceMember = {
    id: "usr-owner-1",
    name: "Owner Alice",
    email: "alice@kaelixo.com",
    avatar: "",
    role: "Workspace Owner",
    department: "management",
    status: "online",
  };

  const devManager: WorkspaceMember = {
    id: "usr-dev-mgr",
    name: "Manager Bob",
    email: "bob@kaelixo.com",
    avatar: "",
    role: "Manager",
    department: "dev",
    status: "online",
  };

  const devMember: WorkspaceMember = {
    id: "usr-dev-mem-1",
    name: "Dev Charlie",
    email: "charlie@kaelixo.com",
    avatar: "",
    role: "Member",
    department: "dev",
    status: "online",
  };

  const teachingManager: WorkspaceMember = {
    id: "usr-teach-mgr",
    name: "Teacher Head Dana",
    email: "dana@kaelixo.com",
    avatar: "",
    role: "Department Head",
    department: "teaching",
    status: "online",
  };

  const teachingMember: WorkspaceMember = {
    id: "usr-teach-mem-1",
    name: "Teacher Eve",
    email: "eve@kaelixo.com",
    avatar: "",
    role: "Member",
    department: "teaching",
    status: "online",
  };

  test("P1.1: Role normalization handles diverse casings, aliases, and whitespace", () => {
    assert(isWorkspaceOwner({ ...owner, role: "owner" as any }), "lowercase owner");
    assert(isWorkspaceOwner({ ...owner, role: "  WORKSPACE OWNER  " as any }), "whitespace owner");
    assert(isWorkspaceOwner({ ...owner, role: "admin" as any }), "admin alias");
    assert(!isWorkspaceOwner({ ...owner, role: "member" as any }), "member is not owner");
    assert(!isWorkspaceOwner(null), "null user is not owner");
    assert(!isWorkspaceOwner(undefined), "undefined user is not owner");
    assert(!isWorkspaceOwner({ ...owner, role: "" as any }), "empty role is not owner");

    assert(isDepartmentHead({ ...devManager, role: "Department Head" as any }), "department head");
    assert(isDepartmentHead({ ...devManager, role: "manager" as any }), "lowercase manager");
    assert(isDepartmentHead({ ...devManager, role: "lead" as any }), "lead alias");
    assert(isDepartmentManager(devManager), "isDepartmentManager alias matches");
    assert(!isDepartmentHead(devMember), "dev member is not head");
    assert(!isDepartmentHead(null), "null is not head");
  });

  test("P1.2: canAddMember grants authority only to Owners and Managers", () => {
    assert(canAddMember(owner), "Owner can add member");
    assert(canAddMember(devManager), "Manager can add member");
    assert(canAddMember(teachingManager), "Department Head can add member");
    assert(!canAddMember(devMember), "Standard Member CANNOT add member");
    assert(!canAddMember(teachingMember), "Standard Member CANNOT add member");
    assert(!canAddMember(null), "Null user cannot add member");
  });

  test("P1.3: canRemoveMember blocks self-removal and owner-removal universally", () => {
    // Self removal
    const selfResOwner = canRemoveMember(owner, owner);
    assert(!selfResOwner.allowed && Boolean(selfResOwner.reason?.includes("own account")), "Owner cannot remove self");

    const selfResMgr = canRemoveMember(devManager, devManager);
    assert(!selfResMgr.allowed && Boolean(selfResMgr.reason?.includes("own account")), "Manager cannot remove self");

    const selfResMem = canRemoveMember(devMember, devMember);
    assert(!selfResMem.allowed && Boolean(selfResMem.reason?.includes("own account")), "Member cannot remove self");

    // Owner removal
    const otherOwner: WorkspaceMember = { ...owner, id: "usr-owner-2", name: "Co-Owner" };
    const removeOwnerRes = canRemoveMember(owner, otherOwner);
    assert(!removeOwnerRes.allowed && Boolean(removeOwnerRes.reason?.includes("cannot be removed")), "Cannot remove Workspace Owner");

    const mgrRemoveOwnerRes = canRemoveMember(devManager, owner);
    assert(!mgrRemoveOwnerRes.allowed, "Manager cannot remove Workspace Owner");
  });

  test("P1.4: Department Manager cross-department boundary isolation", () => {
    // Dev Manager removing dev member: ALLOWED
    assert(canRemoveMember(devManager, devMember).allowed, "Dev Manager CAN remove dev member");

    // Dev Manager removing teaching member: BLOCKED
    const crossDeptRes = canRemoveMember(devManager, teachingMember);
    assert(!crossDeptRes.allowed, "Dev Manager CANNOT remove teaching member");
    assert(Boolean(crossDeptRes.reason?.includes("assigned department")), "Reason specifies department restriction");

    // Dev Manager removing peer manager in same or other dept: BLOCKED
    const peerMgrRes = canRemoveMember(devManager, teachingManager);
    assert(!peerMgrRes.allowed, "Dev Manager CANNOT remove peer manager in other dept");

    const sameDeptPeerMgr: WorkspaceMember = {
      ...devManager,
      id: "usr-dev-mgr-2",
      role: "Manager",
      department: "dev",
    };
    const sameDeptPeerRes = canRemoveMember(devManager, sameDeptPeerMgr);
    assert(!sameDeptPeerRes.allowed, "Dev Manager CANNOT remove peer manager in same dept");
  });

  test("P1.5: Department scope lock calculation for Add Member Modal", () => {
    const depts: Department[] = [
      { id: "1", name: "All Channels", code: "all", description: "", icon: "", color: "" },
      { id: "2", name: "Development", code: "dev", description: "", icon: "", color: "" },
      { id: "3", name: "Teaching", code: "teaching", description: "", icon: "", color: "" },
    ];

    const ownerScope = getAddMemberDepartmentScope(owner, depts);
    assert(!ownerScope.isLocked, "Owner scope is unlocked");
    assert(ownerScope.allowedDepartments.length === 2, "Owner sees both non-all depts");

    const mgrScope = getAddMemberDepartmentScope(devManager, depts);
    assert(mgrScope.isLocked, "Manager scope is locked");
    assert(mgrScope.allowedDepartments.length === 1, "Manager only gets 1 dept");
    assert(mgrScope.allowedDepartments[0].code === "dev", "Manager gets dev dept");
    assert(mgrScope.defaultDepartment === "dev", "Default dept is dev");
  });

  test("P1.6: formatRoleLabel returns clean Title Case Enterprise English labels", () => {
    assert(formatRoleLabel("owner") === "Workspace Owner", "owner -> Workspace Owner");
    assert(formatRoleLabel("admin") === "Admin", "admin -> Admin");
    assert(formatRoleLabel("manager") === "Manager", "manager -> Manager");
    assert(formatRoleLabel("department head") === "Department Head", "dept head label");
    assert(formatRoleLabel("member") === "Member", "member -> Member");
    assert(formatRoleLabel(undefined) === "Member", "undefined -> Member");
    assert(formatRoleLabel("") === "Member", "empty string -> Member");
  });

  // --- SECTION 2: Search & Jump-To Logic (Feature 19 / R4) ---
  console.log("\n--- [Section 2] Search Aggregation & Jump-To (Feature 19 / R4) ---");

  const mockChannels: Channel[] = [
    { id: "ch-general", name: "general", isPrivate: false, isDm: false },
    { id: "ch-dev", name: "dev", isPrivate: true, isDm: false },
    { id: "ch-dm-bob", name: "dm:bob", isPrivate: true, isDm: true, recipientName: "Bob" },
  ];

  const mockMessages: Record<string, Message[]> = {
    "ch-general": [
      {
        id: "msg-1",
        channelId: "ch-general",
        sender: devMember,
        senderName: "Dev Charlie",
        content: "Welcome to Kaelixo launch sprint!",
        createdAt: "10:00 AM",
        reactions: [],
      },
      {
        id: "msg-2",
        channelId: "ch-general",
        sender: owner,
        senderName: "Owner Alice",
        content: "Please review the quarterly roadmap PDF",
        attachments: [
          {
            id: "att-1",
            name: "Quarterly_Roadmap_2026.pdf",
            size: 1048576,
            type: "application/pdf",
            url: "https://example.com/roadmap.pdf",
            storagePath: "ch-general/roadmap.pdf",
          },
        ],
        createdAt: "10:05 AM",
        reactions: [],
      },
    ],
    "ch-dev": [
      {
        id: "msg-3",
        channelId: "ch-dev",
        sender: devManager,
        senderName: "Manager Bob",
        content: "Bug in auth session token refresh",
        parentId: "msg-root-1",
        createdAt: "11:00 AM",
        reactions: [],
      },
    ],
  };

  test("S2.1: Search matches across content, sender name, and attachment names", () => {
    // Simulating search-modal filter logic
    const search = (q: string) => {
      const lower = q.toLowerCase().trim();
      if (!lower) return [];
      const matches: { msg: Message; chId: string }[] = [];
      for (const [chId, msgs] of Object.entries(mockMessages)) {
        for (const msg of msgs) {
          const contentMatch = msg.content?.toLowerCase().includes(lower);
          const senderMatch = msg.senderName?.toLowerCase().includes(lower);
          const attMatch = msg.attachments?.some((a) => a.name.toLowerCase().includes(lower));
          if (contentMatch || senderMatch || attMatch) {
            matches.push({ msg, chId });
          }
        }
      }
      return matches;
    };

    // 1. Content match
    const r1 = search("launch sprint");
    assert(r1.length === 1 && r1[0].msg.id === "msg-1", "Matches content correctly");

    // 2. Sender name match
    const r2 = search("Alice");
    assert(r2.length === 1 && r2[0].msg.id === "msg-2", "Matches sender name correctly");

    // 3. Attachment filename match
    const r3 = search("Roadmap_2026");
    assert(r3.length === 1 && r3[0].msg.id === "msg-2", "Matches attachment filename");

    // 4. Thread reply preservation
    const r4 = search("auth session");
    assert(r4.length === 1 && r4[0].msg.parentId === "msg-root-1", "Preserves parentId in search results");

    // 5. Special regex characters safety (should not throw regex error)
    const r5 = search(".*+?[]()^$");
    assert(r5.length === 0, "Handles regex tokens safely without error");

    // 6. Empty query
    assert(search("").length === 0, "Empty query returns empty array");
    assert(search("   ").length === 0, "Whitespace query returns empty array");
  });

  // --- SECTION 3: Real-Time Presence & Message Formatting (Feature 20) ---
  console.log("\n--- [Section 3] Real-Time Presence & Message Normalization (Feature 20) ---");

  test("R3.1: formatDbMessage safely handles missing fields, JSON attachments, and defaults", () => {
    const rawRow = {
      id: "raw-msg-1",
      channel_id: "ch-1",
      sender_id: "u-99",
      sender_name: "John Doe",
      content: "Hello world",
      created_at: "2026-11-06T10:00:00Z",
      attachments: JSON.stringify([
        { id: "a1", name: "test.png", size: 100, type: "image/png", url: "http://x", storagePath: "p" },
      ]),
      parent_id: "p-1",
      reply_count: 5,
      is_pinned: 1,
      is_edited: true,
      is_deleted: false,
    };

    const formatted = formatDbMessage(rawRow);
    assert(formatted.id === "raw-msg-1", "ID preserved");
    assert(formatted.senderId === "u-99", "senderId formatted");
    assert(formatted.senderName === "John Doe", "senderName formatted");
    assert(formatted.attachments?.length === 1, "attachments parsed from JSON string");
    assert(formatted.parentId === "p-1", "parentId parsed");
    assert(formatted.threadCount === 5, "reply_count mapped to threadCount");
    assert(formatted.isPinned === true, "is_pinned truthy boolean conversion");
    assert(formatted.isEdited === true, "is_edited preserved");
    assert(formatted.isDeleted === false, "is_deleted preserved");
  });

  test("R3.2: teardownChannel handles null/undefined gracefully without throwing", () => {
    teardownChannel(null);
    assert(true, "teardownChannel(null) succeeds safely");
  });

  // --- SECTION 4: In-App Notifications Engine (Feature 21) ---
  console.log("\n--- [Section 4] In-App Notifications Filtering & State (Feature 21) ---");

  test("N4.1: Notification Center tab filtering and unread count integrity", () => {
    const notifs: Notification[] = [
      {
        id: "n-1",
        userId: "u-curr",
        type: "mention",
        channelId: "ch-1",
        content: "Hey @user check this",
        read: false,
        isRead: false,
        createdAt: "1m ago",
      },
      {
        id: "n-2",
        userId: "u-curr",
        type: "dm",
        channelId: "ch-2",
        content: "Direct ping",
        read: true,
        isRead: true,
        createdAt: "5m ago",
      },
      {
        id: "n-3",
        userId: "u-curr",
        type: "thread_reply",
        channelId: "ch-1",
        content: "Thread reply to your question",
        read: false,
        isRead: false,
        createdAt: "10m ago",
      },
    ];

    // Unread count
    const unreadCount = notifs.filter((n) => n.read === false || n.isRead === false).length;
    assert(unreadCount === 2, "Accurate unread count of 2");

    // All tab
    assert(notifs.length === 3, "All tab shows 3");

    // Mentions tab
    const mentions = notifs.filter((n) => n.type === "mention");
    assert(mentions.length === 1 && mentions[0].id === "n-1", "Mentions tab filters accurately");

    // Unread tab
    const unread = notifs.filter((n) => n.read === false || n.isRead === false);
    assert(unread.length === 2 && !unread.some((n) => n.id === "n-2"), "Unread tab filters accurately");
  });

  // --- SECTION 5: Add Member Validation & Duplicates ---
  console.log("\n--- [Section 5] Add Member Validation & Duplicates (Feature 26 / R7) ---");

  test("M5.1: Email regex and duplicate rejection", () => {
    const existingEmails = ["alice@kaelixo.com", "bob@kaelixo.com"];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    assert(emailRegex.test("valid.user@company.com"), "Valid email passes");
    assert(!emailRegex.test("invalid-email"), "Plain string fails");
    assert(!emailRegex.test("missing@domain"), "Missing TLD fails");
    assert(!emailRegex.test("spaces in@email.com"), "Spaces fail");

    const isDup = (email: string) =>
      existingEmails.some((e) => e.trim().toLowerCase() === email.trim().toLowerCase());

    assert(isDup("alice@kaelixo.com"), "Exact duplicate detected");
    assert(isDup("ALICE@KAELIXO.COM"), "Case-insensitive duplicate detected");
    assert(!isDup("charlie@kaelixo.com"), "New unique email accepted");
  });

  // --- SECTION 6: Integrity Violations & Facade Check ---
  console.log("\n--- [Section 6] Active Integrity & Non-Trivial Implementation Check ---");

  test("I6.1: Verify real business logic and no hardcoded test return shortcuts", () => {
    // Assert that permissions check doesn't hardcode specific IDs
    const fakeMember: WorkspaceMember = {
      id: "random-uuid-9999",
      name: "Random Name",
      email: "random@kaelixo.com",
      avatar: "",
      role: "Member",
      department: "dev",
      status: "online",
    };
    const fakeManager: WorkspaceMember = {
      id: "random-uuid-8888",
      name: "Random Mgr",
      email: "mgr@kaelixo.com",
      avatar: "",
      role: "Manager",
      department: "dev",
      status: "online",
    };
    assert(canRemoveMember(fakeManager, fakeMember).allowed, "Dynamic evaluation works on arbitrary member instances");
    assert(!canRemoveMember(fakeMember, fakeManager).allowed, "Dynamic rejection works on arbitrary member instances");
  });

  console.log("\n======================================================================");
  console.log(`HARNESS EXECUTION SUMMARY: ${passed}/${total} PASSED (${((passed / total) * 100).toFixed(1)}%)`);
  console.log("======================================================================");

  if (passed !== total) {
    process.exit(1);
  }
}

runAll().catch((err) => {
  console.error("FATAL ERROR IN ADVERSARIAL TEST HARNESS:", err);
  process.exit(1);
});
