import { DiffApplier } from "./DiffApplier";
import { DiffParser } from "./DiffParser";
import { DiffMatcher } from "./DiffMatcher";
import { MatchStrategy } from "./types";

/**
 * Example 1: Basic Usage - Applying diffs in order
 */
export function example1_basicUsage() {
  const sourceCode = `function greet(name) {
  console.log("Hello " + name);
}

function farewell(name) {
  console.log("Goodbye " + name);
}`;

  const aiResponse = `I'll update the greeting functions to use template literals:

<<<SEARCH>>>
console.log("Hello " + name);
<<<REPLACE>>>
console.log(\`Hello \${name}\`);
<<<END>>>

<<<SEARCH>>>
console.log("Goodbye " + name);
<<<REPLACE>>>
console.log(\`Goodbye \${name}\`);
<<<END>>>`;

  // Parse the AI response
  const parsedDiffs = DiffParser.parseDiffBlocks(aiResponse);
  const diffs = parsedDiffs.map((pd) => pd.block);

  // Apply the diffs
  const applier = new DiffApplier();
  const result = applier.applyDiffs(sourceCode, diffs);

  console.log("Example 1: Basic Usage");
  console.log("Success:", result.success);
  console.log("Applied:", result.appliedDiffs.length, "diffs");
  console.log("\nModified Code:");
  console.log(result.modifiedCode);
  console.log(`\n${"=".repeat(80)}\n`);
}

/**
 * Example 2: Order-Invariant Application (KEY FEATURE!)
 * AI models often return diffs in the wrong order
 */
export function example2_outOfOrderDiffs() {
  const sourceCode = `function foo() {
  console.log("foo");
}

function bar() {
  console.log("bar");
}

function baz() {
  console.log("baz");
}`;

  // AI returns diffs in WRONG order: middle, last, first
  const aiResponse = `Here are the updates:

<<<SEARCH>>>
console.log("bar");
<<<REPLACE>>>
console.log("BAR - updated");
<<<END>>>

<<<SEARCH>>>
console.log("baz");
<<<REPLACE>>>
console.log("BAZ - updated");
<<<END>>>

<<<SEARCH>>>
console.log("foo");
<<<REPLACE>>>
console.log("FOO - updated");
<<<END>>>`;

  const parsedDiffs = DiffParser.parseDiffBlocks(aiResponse);
  const diffs = parsedDiffs.map((pd) => pd.block);

  const applier = new DiffApplier();
  const result = applier.applyDiffs(sourceCode, diffs);

  console.log("Example 2: Order-Invariant Application");
  console.log("Success:", result.success);
  console.log(
    "\nDiffs were provided in order: bar (line 6), baz (line 10), foo (line 2)",
  );
  console.log("Algorithm detected actual positions and applied correctly!");
  console.log("\nModified Code:");
  console.log(result.modifiedCode);
  console.log("\nSummary:");
  console.log(DiffApplier.getSummary(result));
  console.log(`\n${"=".repeat(80)}\n`);
}

/**
 * Example 3: Dry-Run Mode - Validate before applying
 */
export function example3_dryRunValidation() {
  const sourceCode = `const x = 1;
const y = 2;
const z = 3;`;

  const aiResponse = `<<<SEARCH>>>
const x = 1;
<<<REPLACE>>>
const x = 100;
<<<END>>>

<<<SEARCH>>>
const nonexistent = 999;
<<<REPLACE>>>
const nonexistent = 0;
<<<END>>>`;

  const parsedDiffs = DiffParser.parseDiffBlocks(aiResponse);
  const diffs = parsedDiffs.map((pd) => pd.block);

  const applier = new DiffApplier();

  // Validate first
  const validation = applier.validateDiffs(sourceCode, diffs);

  console.log("Example 3: Dry-Run Validation");
  console.log("Validation Result:");
  console.log("  Valid:", validation.valid);
  console.log(
    "  Matched:",
    validation.matchedDiffs,
    "/",
    validation.totalDiffs,
  );
  console.log("  Unmatched:", validation.unmatchedDiffs.length);

  if (validation.unmatchedDiffs.length > 0) {
    console.log("\nUnmatched Diffs:");
    validation.unmatchedDiffs.forEach((unmatched) => {
      console.log(`  - Diff ${unmatched.inputIndex}: ${unmatched.reason}`);
    });
  }

  // Apply in non-strict mode to continue past errors
  const result = applier.applyDiffs(sourceCode, diffs, { strict: false });

  console.log("\nApply Result (non-strict mode):");
  console.log("  Success:", result.success);
  console.log("  Applied:", result.appliedDiffs.length, "diffs");
  console.log("  Errors:", result.errors.length);
  console.log("\nModified Code:");
  console.log(result.modifiedCode);
  console.log(`\n${"=".repeat(80)}\n`);
}

/**
 * Example 4: Conflict Detection
 */
export function example4_conflictDetection() {
  const sourceCode = `const x = 1;
const y = 2;`;

  // These diffs overlap!
  const aiResponse = `<<<SEARCH>>>
const x = 1;
const y = 2;
<<<REPLACE>>>
const x = 100;
const y = 200;
<<<END>>>

<<<SEARCH>>>
const y = 2;
<<<REPLACE>>>
const y = 999;
<<<END>>>`;

  const parsedDiffs = DiffParser.parseDiffBlocks(aiResponse);
  const diffs = parsedDiffs.map((pd) => pd.block);

  const applier = new DiffApplier();
  const result = applier.applyDiffs(sourceCode, diffs);

  console.log("Example 4: Conflict Detection");
  console.log("Success:", result.success);

  if (result.validation?.conflicts.length ?? 0 > 0) {
    console.log("\nConflicts Detected:");
    result.validation!.conflicts.forEach((conflict, idx) => {
      console.log(`  ${idx + 1}. ${conflict.type}: ${conflict.description}`);
    });
  }

  console.log("\nErrors:");
  result.errors.forEach((error) => {
    console.log(`  - [${error.type}] ${error.message}`);
  });
  console.log(`\n${"=".repeat(80)}\n`);
}

/**
 * Example 5: Fuzzy Matching - Handle minor differences
 */
export function example5_fuzzyMatching() {
  const sourceCode = `function   calculateTotal(  items  )   {
  let  total  =  0;
  for (const item of items) {
    total += item.price;
  }
  return total;
}`;

  // AI's search block has different whitespace
  const aiResponse = `<<<SEARCH>>>
function calculateTotal(items) {
let total = 0;
<<<REPLACE>>>
function calculateTotal(items) {
let total = 0;
console.log('Calculating total for', items.length, 'items');
<<<END>>>`;

  const parsedDiffs = DiffParser.parseDiffBlocks(aiResponse);
  const diffs = parsedDiffs.map((pd) => pd.block);

  const applier = new DiffApplier();
  const result = applier.applyDiffs(sourceCode, diffs, {
    matchOptions: {
      strategies: [
        MatchStrategy.EXACT,
        MatchStrategy.WHITESPACE_NORMALIZED,
        MatchStrategy.FUZZY,
      ],
      minConfidence: 0.85,
    },
  });

  console.log("Example 5: Fuzzy Matching");
  console.log("Success:", result.success);

  if (result.appliedDiffs.length > 0) {
    console.log("\nMatching Strategy Used:");
    result.appliedDiffs.forEach((applied) => {
      console.log(
        `  - ${applied.matchResult.strategy} (confidence: ${applied.matchResult.confidence.toFixed(2)})`,
      );
    });
  }

  console.log("\nModified Code:");
  console.log(result.modifiedCode);
  console.log(`\n${"=".repeat(80)}\n`);
}

/**
 * Example 6: Large-Scale Refactoring
 */
export function example6_largeScaleRefactoring() {
  const sourceCode = `import React from 'react';

export function UserProfile({ user }) {
  return (
    <div className="profile">
      <h1>{user.name}</h1>
      <p>{user.email}</p>
      <button onClick={() => console.log('Edit')}>
        Edit Profile
      </button>
    </div>
  );
}

export function UserSettings({ user }) {
  return (
    <div className="settings">
      <h2>Settings for {user.name}</h2>
      <input type="text" defaultValue={user.email} />
    </div>
  );
}`;

  // Multiple changes across the file
  const aiResponse = `I'll add TypeScript types and update the components:

<<<SEARCH>>>
import React from 'react';
<<<REPLACE>>>
import React from 'react';

interface User {
  id: string;
  name: string;
  email: string;
}

interface UserProfileProps {
  user: User;
  onEdit?: () => void;
}

interface UserSettingsProps {
  user: User;
  onChange?: (field: string, value: string) => void;
}
<<<END>>>

<<<SEARCH>>>
export function UserProfile({ user }) {
<<<REPLACE>>>
export function UserProfile({ user, onEdit }: UserProfileProps) {
<<<END>>>

<<<SEARCH>>>
onClick={() => console.log('Edit')}
<<<REPLACE>>>
onClick={onEdit || (() => console.log('Edit'))}
<<<END>>>

<<<SEARCH>>>
export function UserSettings({ user }) {
<<<REPLACE>>>
export function UserSettings({ user, onChange }: UserSettingsProps) {
<<<END>>>`;

  const parsedDiffs = DiffParser.parseDiffBlocks(aiResponse);
  const diffs = parsedDiffs.map((pd) => pd.block);

  const applier = new DiffApplier();
  const result = applier.applyDiffs(sourceCode, diffs);

  console.log("Example 6: Large-Scale Refactoring");
  console.log("Success:", result.success);
  console.log("Applied:", result.appliedDiffs.length, "diffs");

  console.log("\nDiff Application Order:");
  result.appliedDiffs.forEach((applied, idx) => {
    console.log(
      `  ${idx + 1}. Lines ${applied.matchResult.startLine}-${applied.matchResult.endLine} (input index: ${applied.inputIndex})`,
    );
  });

  console.log("\nModified Code:");
  console.log(result.modifiedCode);
  console.log(`\n${"=".repeat(80)}\n`);
}

/**
 * Example 7: Custom Matcher with Specific Strategies
 */
export function example7_customMatcher() {
  const sourceCode = `const config = {
  api: "https://api.example.com",
  timeout: 5000
};`;

  const aiResponse = `<<<SEARCH>>>
api: "https://api.example.com",
timeout: 5000
<<<REPLACE>>>
api: "https://api.example.com",
timeout: 5000,
retries: 3,
cache: true
<<<END>>>`;

  const parsedDiffs = DiffParser.parseDiffBlocks(aiResponse);
  const diffs = parsedDiffs.map((pd) => pd.block);

  // Create custom matcher with specific strategies
  const customMatcher = new DiffMatcher();
  const applier = new DiffApplier(customMatcher);

  const result = applier.applyDiffs(sourceCode, diffs, {
    matchOptions: {
      strategies: [MatchStrategy.WHITESPACE_NORMALIZED],
      caseSensitive: true,
    },
  });

  console.log("Example 7: Custom Matcher");
  console.log("Success:", result.success);
  console.log("\nModified Code:");
  console.log(result.modifiedCode);
  console.log(`\n${"=".repeat(80)}\n`);
}

/**
 * Run all examples
 * Uncomment the following to execute examples:
 */
export function runAllExamples() {
  console.log("DiffApplier Examples\n");
  console.log(`${"=".repeat(80)}\n`);

  example1_basicUsage();
  example2_outOfOrderDiffs();
  example3_dryRunValidation();
  example4_conflictDetection();
  example5_fuzzyMatching();
  example6_largeScaleRefactoring();
  example7_customMatcher();

  console.log("All examples completed!");
}
