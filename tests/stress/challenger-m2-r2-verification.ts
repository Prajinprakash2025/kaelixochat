import { formatReactorsTooltip } from "../../src/components/chat/message-feed";
import { WorkspaceMember } from "../../src/types";

// Setup mock workspace members
const MEMBERS: WorkspaceMember[] = [
  { id: "u-you", name: "Current User", email: "you@example.com", role: "member", department: "DEV", avatar: "/avatar.png", status: "online" },
  { id: "u-alice", name: "Alice Adams", email: "alice@example.com", role: "member", department: "DEV", avatar: "/avatar.png", status: "online" },
  { id: "u-bob", name: "Bob Builder", email: "bob@example.com", role: "member", department: "DEV", avatar: "/avatar.png", status: "online" },
  { id: "u-charlie", name: "Charlie Chaplin", email: "charlie@example.com", role: "member", department: "DEV", avatar: "/avatar.png", status: "online" },
  { id: "u-dave", name: "Dave Davidson", email: "dave@example.com", role: "member", department: "DEV", avatar: "/avatar.png", status: "offline" },
  { id: "u-eve", name: "Eve Evans", email: "eve@example.com", role: "member", department: "DEV", avatar: "/avatar.png", status: "offline" },
];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, msg: string) {
  totalTests++;
  if (!condition) {
    failedTests++;
    console.error(`  ✗ FAIL: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  passedTests++;
  console.log(`  ✓ PASS: ${msg}`);
}

console.log("======================================================================");
console.log("   CHALLENGER M2 R2: DEEP EMPIRICAL PERMUTATION & STRESS HARNESS      ");
console.log("======================================================================\n");

// -----------------------------------------------------------------------------
// Section 1: Tooltip Permutations with hasYou = true (1 to 6+ reactors)
// -----------------------------------------------------------------------------
console.log("--- [Section 1] Tooltip Permutations: hasYou = true ---");

{
  // 1 reactor: You
  const tip1 = formatReactorsTooltip({ emoji: "👍", count: 1, users: ["u-you"] }, "u-you", MEMBERS);
  assert(tip1 === "You reacted", `1 reactor (You) -> "${tip1}"`);

  // 2 reactors: You + Alice
  const tip2 = formatReactorsTooltip({ emoji: "👍", count: 2, users: ["u-you", "u-alice"] }, "u-you", MEMBERS);
  assert(tip2 === "Alice and you reacted", `2 reactors (You + 1) -> "${tip2}"`);

  // 3 reactors: You + Alice + Bob
  const tip3 = formatReactorsTooltip({ emoji: "👍", count: 3, users: ["u-you", "u-alice", "u-bob"] }, "u-you", MEMBERS);
  assert(tip3 === "Alice, Bob, and you reacted", `3 reactors (You + 2) -> "${tip3}"`);

  // 4 reactors: You + Alice + Bob + Charlie
  const tip4 = formatReactorsTooltip({ emoji: "👍", count: 4, users: ["u-you", "u-alice", "u-bob", "u-charlie"] }, "u-you", MEMBERS);
  assert(tip4 === "Alice, Bob, you, and 1 other reacted", `4 reactors (You + 3) -> "${tip4}"`);

  // 5 reactors: You + Alice + Bob + Charlie + Dave
  const tip5 = formatReactorsTooltip({ emoji: "👍", count: 5, users: ["u-you", "u-alice", "u-bob", "u-charlie", "u-dave"] }, "u-you", MEMBERS);
  assert(tip5 === "Alice, Bob, you, and 2 others reacted", `5 reactors (You + 4) -> "${tip5}"`);

  // 6 reactors: You + Alice + Bob + Charlie + Dave + Eve
  const tip6 = formatReactorsTooltip({ emoji: "👍", count: 6, users: ["u-you", "u-alice", "u-bob", "u-charlie", "u-dave", "u-eve"] }, "u-you", MEMBERS);
  assert(tip6 === "Alice, Bob, you, and 3 others reacted", `6 reactors (You + 5) -> "${tip6}"`);

  // 10 reactors: You + 9 others
  const extraUsers = ["u-you", "u-alice", "u-bob", "u-charlie", "u-dave", "u-eve", "u-f", "u-g", "u-h", "u-i"];
  const tip10 = formatReactorsTooltip({ emoji: "👍", count: 10, users: extraUsers }, "u-you", MEMBERS);
  assert(tip10 === "Alice, Bob, you, and 7 others reacted", `10 reactors (You + 9) -> "${tip10}"`);
}

// -----------------------------------------------------------------------------
// Section 2: Tooltip Permutations with hasYou = false (1 to 6+ reactors)
// -----------------------------------------------------------------------------
console.log("\n--- [Section 2] Tooltip Permutations: hasYou = false ---");

{
  // 0 reactors (empty fallback)
  const tip0 = formatReactorsTooltip({ emoji: "👍", count: 0, users: [] }, "u-you", MEMBERS);
  assert(tip0 === "Someone reacted", `0 reactors -> "${tip0}"`);

  // 1 reactor: Alice
  const tip1 = formatReactorsTooltip({ emoji: "👍", count: 1, users: ["u-alice"] }, "u-you", MEMBERS);
  assert(tip1 === "Alice reacted", `1 reactor (Alice) -> "${tip1}"`);

  // 2 reactors: Alice + Bob
  const tip2 = formatReactorsTooltip({ emoji: "👍", count: 2, users: ["u-alice", "u-bob"] }, "u-you", MEMBERS);
  assert(tip2 === "Alice and Bob reacted", `2 reactors (Alice + Bob) -> "${tip2}"`);

  // 3 reactors: Alice + Bob + Charlie
  const tip3 = formatReactorsTooltip({ emoji: "👍", count: 3, users: ["u-alice", "u-bob", "u-charlie"] }, "u-you", MEMBERS);
  assert(tip3 === "Alice, Bob, and Charlie reacted", `3 reactors (Alice + Bob + Charlie) -> "${tip3}"`);

  // 4 reactors: Alice + Bob + Charlie + Dave
  const tip4 = formatReactorsTooltip({ emoji: "👍", count: 4, users: ["u-alice", "u-bob", "u-charlie", "u-dave"] }, "u-you", MEMBERS);
  assert(tip4 === "Alice, Bob, and 2 others reacted", `4 reactors -> "${tip4}"`);

  // 5 reactors: Alice + Bob + Charlie + Dave + Eve
  const tip5 = formatReactorsTooltip({ emoji: "👍", count: 5, users: ["u-alice", "u-bob", "u-charlie", "u-dave", "u-eve"] }, "u-you", MEMBERS);
  assert(tip5 === "Alice, Bob, and 3 others reacted", `5 reactors -> "${tip5}"`);

  // 10 reactors: 10 colleagues
  const extraUsers = ["u-alice", "u-bob", "u-charlie", "u-dave", "u-eve", "u-f", "u-g", "u-h", "u-i", "u-j"];
  const tip10 = formatReactorsTooltip({ emoji: "👍", count: 10, users: extraUsers }, "u-you", MEMBERS);
  assert(tip10 === "Alice, Bob, and 8 others reacted", `10 reactors -> "${tip10}"`);
}

// -----------------------------------------------------------------------------
// Section 3: Mathematical Conservation of Reactors across N = 1..20
// -----------------------------------------------------------------------------
console.log("\n--- [Section 3] Mathematical Conservation Law Verification ---");

{
  for (let n = 1; n <= 20; n++) {
    // Test with hasYou = true
    const usersWithYou = ["u-you", ...Array.from({ length: n - 1 }, (_, i) => `user-colleague-${i + 1}`)];
    const tipWithYou = formatReactorsTooltip(
      { emoji: "🚀", count: n, users: usersWithYou },
      "u-you",
      MEMBERS
    );
    
    // Parse total people represented in tipWithYou
    let countInTip = 0;
    if (tipWithYou === "You reacted") {
      countInTip = 1;
    } else if (tipWithYou.endsWith("and you reacted")) {
      // 2 or 3 people
      const names = tipWithYou.replace(" and you reacted", "").split(", ");
      countInTip = names.length + 1; // names + you
    } else if (tipWithYou.includes("you, and ")) {
      // 4+ people: "Name1, Name2, you, and X other(s) reacted"
      const match = tipWithYou.match(/and (\d+) others? reacted/);
      assert(match !== null, `Format match for n=${n}: "${tipWithYou}"`);
      const others = parseInt(match![1], 10);
      countInTip = 2 + 1 + others; // Name1 + Name2 + you + others
    }
    assert(countInTip === n, `Conservation for hasYou=true, n=${n}: countInTip (${countInTip}) === n (${n})`);

    // Test with hasYou = false
    const usersWithoutYou = Array.from({ length: n }, (_, i) => `user-colleague-${i + 1}`);
    const tipWithoutYou = formatReactorsTooltip(
      { emoji: "🚀", count: n, users: usersWithoutYou },
      "u-you",
      MEMBERS
    );
    
    let countInTipWithout = 0;
    if (n === 1) {
      assert(tipWithoutYou.endsWith(" reacted") && !tipWithoutYou.includes("others"), `n=1 format: ${tipWithoutYou}`);
      countInTipWithout = 1;
    } else if (n === 2) {
      assert(tipWithoutYou.includes(" and "), `n=2 format: ${tipWithoutYou}`);
      countInTipWithout = 2;
    } else if (n === 3) {
      assert(tipWithoutYou.includes(", ") && tipWithoutYou.includes("and "), `n=3 format: ${tipWithoutYou}`);
      countInTipWithout = 3;
    } else {
      const match = tipWithoutYou.match(/and (\d+) others reacted/);
      assert(match !== null, `Format match for n=${n} (without you): "${tipWithoutYou}"`);
      const others = parseInt(match![1], 10);
      countInTipWithout = 2 + others; // Name1 + Name2 + others
    }
    assert(countInTipWithout === n, `Conservation for hasYou=false, n=${n}: countInTipWithout (${countInTipWithout}) === n (${n})`);
  }
}

// -----------------------------------------------------------------------------
// Section 4: reaction.userNames fallback & Index Offset Stress Tests
// -----------------------------------------------------------------------------
console.log("\n--- [Section 4] reaction.userNames Fallback & Index Alignment ---");

{
  // Permutation A: currentUserId at index 0
  const reactionA = {
    emoji: "🎉",
    count: 3,
    users: ["u-you", "ext-1", "ext-2"],
    userNames: ["MySelf", "ReactorOne", "ReactorTwo"],
  };
  const tipA = formatReactorsTooltip(reactionA, "u-you", []);
  assert(
    tipA === "ReactorOne, ReactorTwo, and you reacted",
    `Permutation A (You at 0): "${tipA}" -> ReactorOne & ReactorTwo preserved`
  );

  // Permutation B: currentUserId at middle index 1
  const reactionB = {
    emoji: "🎉",
    count: 3,
    users: ["ext-1", "u-you", "ext-2"],
    userNames: ["ReactorOne", "MySelf", "ReactorTwo"],
  };
  const tipB = formatReactorsTooltip(reactionB, "u-you", []);
  assert(
    tipB === "ReactorOne, ReactorTwo, and you reacted",
    `Permutation B (You at 1): "${tipB}" -> ReactorOne & ReactorTwo preserved`
  );

  // Permutation C: currentUserId at last index 2
  const reactionC = {
    emoji: "🎉",
    count: 3,
    users: ["ext-1", "ext-2", "u-you"],
    userNames: ["ReactorOne", "ReactorTwo", "MySelf"],
  };
  const tipC = formatReactorsTooltip(reactionC, "u-you", []);
  assert(
    tipC === "ReactorOne, ReactorTwo, and you reacted",
    `Permutation C (You at 2): "${tipC}" -> ReactorOne & ReactorTwo preserved`
  );

  // Permutation D: 4 users with currentUserId in middle (index 2)
  const reactionD = {
    emoji: "🎉",
    count: 4,
    users: ["ext-1", "ext-2", "u-you", "ext-3"],
    userNames: ["ReactorOne", "ReactorTwo", "MySelf", "ReactorThree"],
  };
  const tipD = formatReactorsTooltip(reactionD, "u-you", []);
  assert(
    tipD === "ReactorOne, ReactorTwo, you, and 1 other reacted",
    `Permutation D (4 users, You at index 2): "${tipD}"`
  );

  // Permutation E: reaction.userNames with whitespace and empty strings
  const reactionE = {
    emoji: "🎉",
    count: 3,
    users: ["u-you", "user-fallbackName", "nonuser-unknown"],
    userNames: ["", "  CleanedName  ", "   "],
  };
  const tipE = formatReactorsTooltip(reactionE, "u-you", []);
  // "user-fallbackName" has trimmed userNames "CleanedName".
  // "nonuser-unknown" has whitespace-only userNames, falls back past user- prefix to "Someone".
  assert(
    tipE === "CleanedName, Someone, and you reacted",
    `Permutation E (Whitespace handling and fallback chain): "${tipE}"`
  );

  // Permutation F: memberMap precedence over userNames
  const reactionF = {
    emoji: "🎉",
    count: 2,
    users: ["u-you", "u-alice"],
    userNames: ["Self", "OverriddenName"],
  };
  const tipF = formatReactorsTooltip(reactionF, "u-you", MEMBERS);
  assert(
    tipF === "Alice and you reacted",
    `Permutation F (memberMap takes precedence over userNames): "${tipF}"`
  );

  // Permutation G: userNames shorter than users array
  const reactionG = {
    emoji: "🎉",
    count: 3,
    users: ["u-you", "user-dan", "ext-anon"],
    userNames: ["Self"], // only 1 entry for 3 users
  };
  const tipG = formatReactorsTooltip(reactionG, "u-you", []);
  assert(
    tipG === "Dan, Someone, and you reacted",
    `Permutation G (userNames array under-indexed): "${tipG}"`
  );

  // Permutation H: userNames is undefined
  const reactionH = {
    emoji: "🎉",
    count: 2,
    users: ["u-you", "user-sam"],
  };
  const tipH = formatReactorsTooltip(reactionH, "u-you", []);
  assert(
    tipH === "Sam and you reacted",
    `Permutation H (userNames is undefined, uses user- prefix): "${tipH}"`
  );

  // Permutation I: ID without user- prefix and no memberMap and no userNames
  const reactionI = {
    emoji: "🎉",
    count: 2,
    users: ["u-you", "raw-guid-1234"],
  };
  const tipI = formatReactorsTooltip(reactionI, "u-you", []);
  assert(
    tipI === "Someone and you reacted",
    `Permutation I (Unknown raw ID falls back to Someone): "${tipI}"`
  );
}

// -----------------------------------------------------------------------------
// Section 5: DocumentCard Dotless and Edge Filenames
// -----------------------------------------------------------------------------
console.log("\n--- [Section 5] DocumentCard Filename Extension Parsing ---");

{
  const { extractFileExtension } = require("../../src/utils/storage");
  
  assert(extractFileExtension("README") === "", `extractFileExtension("README") returns ""`);
  assert(extractFileExtension("Dockerfile") === "", `extractFileExtension("Dockerfile") returns ""`);
  assert(extractFileExtension(".gitignore") === "gitignore", `extractFileExtension(".gitignore") returns "gitignore"`);
  assert(extractFileExtension("archive.tar.gz") === "gz", `extractFileExtension("archive.tar.gz") returns "gz"`);
  assert(extractFileExtension("my.presentation.slides.PDF") === "pdf", `extractFileExtension("...PDF") returns "pdf"`);
}

// -----------------------------------------------------------------------------
// Execution Summary
// -----------------------------------------------------------------------------
console.log("\n======================================================================");
console.log("                        EXECUTION SUMMARY                             ");
console.log("======================================================================");
console.log(`Total Assertions Checked: ${totalTests}`);
console.log(`Passed:                   ${passedTests}`);
console.log(`Failed:                   ${failedTests}`);
console.log(`Success Rate:             ${((passedTests / totalTests) * 100).toFixed(1)}%`);
console.log("======================================================================\n");

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log("ALL CHALLENGER M2 R2 VERIFICATION CHECKS PASSED EMPIRICALLY!\n");
}
