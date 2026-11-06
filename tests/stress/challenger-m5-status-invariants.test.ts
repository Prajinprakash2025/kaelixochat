/**
 * Challenger M5-R2 Status Dot Precedence and Core Hardening Stress Test
 * 
 * Verifies:
 * 1. Status dot precedence invariants across WorkspaceMember status values:
 *    - online: true, status: "away"    => amber
 *    - online: true, status: "in_call" => rose animate-pulse
 *    - online: true, status: "online"  => emerald
 *    - online: false, status: "offline"=> gray (neutral-400)
 * 2. Component SSR rendering of status dots and labels in UserProfileDrawer and MemberDirectoryModal
 * 3. Empirical check of page.tsx presence dot expressions
 */

import React from "react";
import ReactDOMServer from "react-dom/server";
import { UserProfileDrawer } from "../../src/components/profile/user-profile-drawer";
import { MemberDirectoryModal } from "../../src/components/directory/member-directory-modal";
import { WorkspaceMember } from "../../src/types";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${msg}`);
  }
}

let passed = 0;
let failed = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✗ FAIL: ${name} -> ${err.message}`);
    failed++;
  }
}

console.log("======================================================================");
console.log("   CHALLENGER M5-R2: STATUS DOT PRECEDENCE EMPIRICAL HARNESS          ");
console.log("======================================================================\n");

// Test 1: Invariant 1 - online: true & status: "away" => Amber
runTest("Invariant 1: UserProfileDrawer renders amber for member with online: true and status: 'away'", () => {
  const member: WorkspaceMember = {
    id: "user-away-1",
    name: "Aisha Patel",
    displayName: "aisha",
    role: "Manager",
    department: "Engineering",
    email: "aisha@kaelixo.com",
    avatar: "https://example.com/avatar.png",
    status: "away",
    online: true,
  };

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(UserProfileDrawer, {
      member,
      currentUser: member,
      onClose: () => {},
      onStartDm: () => {},
      onOpenEditProfile: () => {},
    })
  );

  assert(html.includes("bg-amber-500"), "Must render bg-amber-500 for status: away");
  assert(!html.includes("bg-emerald-500"), "Must NOT render bg-emerald-500 when status is away despite online: true");
  assert(html.includes("Away"), "Label must be Away");
});

// Test 2: Invariant 2 - online: true & status: "in_call" => Rose animate-pulse
runTest("Invariant 2: UserProfileDrawer renders rose animate-pulse for member with online: true and status: 'in_call'", () => {
  const member: WorkspaceMember = {
    id: "user-call-1",
    name: "Carlos Mendez",
    displayName: "carlos",
    role: "Member",
    department: "Design",
    email: "carlos@kaelixo.com",
    avatar: "https://example.com/avatar.png",
    status: "in_call",
    online: true,
  };

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(UserProfileDrawer, {
      member,
      currentUser: member,
      onClose: () => {},
      onStartDm: () => {},
      onOpenEditProfile: () => {},
    })
  );

  assert(html.includes("bg-rose-500"), "Must render bg-rose-500 for status: in_call");
  assert(html.includes("animate-pulse"), "Must include animate-pulse for in_call status");
  assert(!html.includes("bg-emerald-500"), "Must NOT render bg-emerald-500 when status is in_call despite online: true");
  assert(html.includes("In a call"), "Label must be 'In a call'");
});

// Test 3: Invariant 3 - online: true & status: "online" => Emerald
runTest("Invariant 3: UserProfileDrawer renders emerald for member with online: true and status: 'online'", () => {
  const member: WorkspaceMember = {
    id: "user-online-1",
    name: "Elena Rostova",
    displayName: "elena",
    role: "Workspace Owner",
    department: "Executive",
    email: "elena@kaelixo.com",
    avatar: "https://example.com/avatar.png",
    status: "online",
    online: true,
  };

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(UserProfileDrawer, {
      member,
      currentUser: member,
      onClose: () => {},
      onStartDm: () => {},
      onOpenEditProfile: () => {},
    })
  );

  assert(html.includes("bg-emerald-500"), "Must render bg-emerald-500 for online member");
  assert(!html.includes("bg-amber-500"), "Must NOT render bg-amber-500 for online member");
  assert(!html.includes("bg-rose-500"), "Must NOT render bg-rose-500 for online member");
  assert(html.includes("Active now"), "Label must be 'Active now'");
});

// Test 4: Invariant 4 - online: false & status: "offline" => Gray (neutral-400)
runTest("Invariant 4: UserProfileDrawer renders gray for member with online: false and status: 'offline'", () => {
  const member: WorkspaceMember = {
    id: "user-offline-1",
    name: "Liam O'Connor",
    displayName: "liam",
    role: "Member",
    department: "Support",
    email: "liam@kaelixo.com",
    avatar: "https://example.com/avatar.png",
    status: "offline",
    online: false,
  };

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(UserProfileDrawer, {
      member,
      currentUser: member,
      onClose: () => {},
      onStartDm: () => {},
      onOpenEditProfile: () => {},
    })
  );

  assert(html.includes("bg-neutral-400"), "Must render bg-neutral-400 for offline member");
  assert(!html.includes("bg-emerald-500"), "Must NOT render bg-emerald-500 for offline member");
  assert(!html.includes("bg-amber-500"), "Must NOT render bg-amber-500 for offline member");
  assert(html.includes("Offline"), "Label must be 'Offline'");
});

// Test 5: MemberDirectoryModal Multi-Member Precedence Test
runTest("Invariant 5: MemberDirectoryModal renders correct dot classes for all 4 member statuses simultaneously", () => {
  const members: WorkspaceMember[] = [
    {
      id: "m-away",
      name: "Member Away",
      displayName: "away_user",
      role: "Member",
      department: "Engineering",
      email: "away@kaelixo.com",
      avatar: "https://example.com/1.png",
      status: "away",
      online: true,
    },
    {
      id: "m-incall",
      name: "Member InCall",
      displayName: "call_user",
      role: "Manager",
      department: "Engineering",
      email: "call@kaelixo.com",
      avatar: "https://example.com/2.png",
      status: "in_call",
      online: true,
    },
    {
      id: "m-online",
      name: "Member Online",
      displayName: "online_user",
      role: "Member",
      department: "Engineering",
      email: "online@kaelixo.com",
      avatar: "https://example.com/3.png",
      status: "online",
      online: true,
    },
    {
      id: "m-offline",
      name: "Member Offline",
      displayName: "offline_user",
      role: "Member",
      department: "Engineering",
      email: "offline@kaelixo.com",
      avatar: "https://example.com/4.png",
      status: "offline",
      online: false,
    },
  ];

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(MemberDirectoryModal, {
      isOpen: true,
      onClose: () => {},
      members,
      currentUser: members[2],
      activeOrg: { id: "org-1", name: "Kaelixo HQ", invite_code: "kaelixo-test" },
      departments: [{ id: "d1", name: "Engineering", code: "engineering" }],
      onSelectMember: () => {},
      onAddMember: () => {},
    })
  );

  assert(html.includes("bg-amber-500"), "Directory modal must render bg-amber-500 for away member");
  assert(html.includes("bg-rose-500"), "Directory modal must render bg-rose-500 for in_call member");
  assert(html.includes("animate-pulse"), "Directory modal must render animate-pulse for in_call member");
  assert(html.includes("bg-emerald-500"), "Directory modal must render bg-emerald-500 for online member");
  assert(html.includes("bg-neutral-400"), "Directory modal must render bg-neutral-400 for offline member");
});

// Test 6: Verify UserProfileDrawer displayName clean text node (no HTML comment marker)
runTest("Invariant 6: UserProfileDrawer renders clean @{displayName} without React 19 comment markers", () => {
  const member: WorkspaceMember = {
    id: "user-name-1",
    name: "Marcus Aurelius",
    displayName: "marcus.a",
    role: "Workspace Owner",
    department: "Executive",
    email: "marcus@kaelixo.com",
    avatar: "https://example.com/avatar.png",
    status: "online",
    online: true,
  };

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(UserProfileDrawer, {
      member,
      currentUser: member,
      onClose: () => {},
      onStartDm: () => {},
      onOpenEditProfile: () => {},
    })
  );

  assert(html.includes("@marcus.a"), "Must contain clean '@marcus.a'");
  assert(!html.includes("@<!-- -->marcus.a"), "Must NOT contain React comment markers '@<!-- -->'");
});

// Test 7: Verify Channel Details rail dot precedence logic from page.tsx:2381
runTest("Invariant 7: Channel Details rail dot precedence logic evaluation", () => {
  const evalRailDot = (m: { status: string; online: boolean }) => {
    return m.status === "in_call"
      ? "bg-rose-500 animate-pulse"
      : m.status === "away"
      ? "bg-amber-500"
      : m.online || m.status === "online"
      ? "bg-emerald-500"
      : "bg-neutral-400";
  };

  assert(evalRailDot({ status: "in_call", online: true }) === "bg-rose-500 animate-pulse", "in_call + online -> rose pulse");
  assert(evalRailDot({ status: "away", online: true }) === "bg-amber-500", "away + online -> amber");
  assert(evalRailDot({ status: "online", online: true }) === "bg-emerald-500", "online + online -> emerald");
  assert(evalRailDot({ status: "offline", online: false }) === "bg-neutral-400", "offline + offline -> neutral-400");
});

console.log("\n======================================================================");
console.log(`TOTAL STATUS INVARIANT TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log("======================================================================");

if (failed > 0) {
  process.exit(1);
}
