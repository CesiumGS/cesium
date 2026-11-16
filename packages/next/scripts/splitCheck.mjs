#!/usr/bin/env node
// Checks that splitting the old overall plan kept its content (2026-11-13).
//
//   node scripts/splitCheck.mjs [--from <rev>] [--mode lines|tokens]
//
// The old file is `git show <rev>:CESIUM2_WEBGPU_PLAN.md` (default: the last
// commit before the split, found by its message). The new layout is the
// working tree's CESIUM2_WEBGPU_PLAN.md, docs/decisions, docs/design,
// docs/history and packages/next/work.
//
// - lines: every non-blank line of the old file appears in the new layout
//   (headings compared without their section numbers and levels). Lines of
//   the old milestone section M7 to M13 and the follow-ups table became work
//   items and were rewritten, so they are checked by tokens instead.
// - tokens: every number, code span and link target of the old file appears
//   at least as often in the new layout. Numbers that were section numbers
//   (after a section sign) or parts of old milestone names are left out,
//   since references were rewritten. Use this mode once references change.
//
// Both modes also report heading and table-row counts before and after.

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const mode = option("--mode", "lines");
const from =
  option("--from") ??
  `${execFileSync(
    "git",
    ["log", "--format=%H", "-1", "--grep=^docs: split the overall plan"],
    { cwd: root, encoding: "utf8" },
  ).trim()}^`;
if (from === "^") {
  console.error("no split commit found; pass --from <rev>");
  process.exit(2);
}

const old = execFileSync("git", ["show", `${from}:CESIUM2_WEBGPU_PLAN.md`], {
  cwd: root,
  encoding: "utf8",
  maxBuffer: 1 << 26,
}).split("\n");

function walk(dir) {
  let out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      out = out.concat(walk(p));
    } else if (name.endsWith(".md")) {
      out.push(p);
    }
  }
  return out;
}
const newFiles = [
  join(root, "CESIUM2_WEBGPU_PLAN.md"),
  ...["docs/decisions", "docs/design", "docs/history", "packages/next/work"]
    .map((d) => join(root, d))
    .flatMap(walk),
];
const fresh = newFiles.flatMap((f) => readFileSync(f, "utf8").split("\n"));

// The old ranges that became work items.
const rewritten = new Set();
let inRange = false;
for (const [i, l] of old.entries()) {
  if (/^### M7 /.test(l) || /^## 14\. /.test(l)) {
    inRange = true;
  } else if (/^## (7|15)\. /.test(l)) {
    inRange = false;
  }
  if (inRange) {
    rewritten.add(i);
  }
}

const isHeading = (l) => /^#{1,6} /.test(l);
const norm = (l) =>
  isHeading(l)
    ? l
        .replace(/^#+ +/, "")
        .replace(/^\d+(?:\.\d+)*\.? +/, "")
        .trim()
    : l.trim();
const skip = (l) => /^\s*$/.test(l) || /^-{3,}$/.test(l.trim());

const headings = (ls) => {
  let fence = false;
  let n = 0;
  for (const l of ls) {
    if (/^\s*(```|~~~)/.test(l)) {
      fence = !fence;
    } else if (!fence && isHeading(l)) {
      n++;
    }
  }
  return n;
};
const rows = (ls) =>
  ls.filter((l) => /^\|/.test(l) && !/^\|[\s|:-]+\|$/.test(l)).length;

function multiset(items) {
  const m = new Map();
  for (const x of items) {
    m.set(x, (m.get(x) ?? 0) + 1);
  }
  return m;
}

const OLD_NAME = /\b(?:IR-G?|JP-|LT-|MX-|SR-|WF-|W|R|M|G)[0-9]+[a-d]?\b/g;
function tokens(line) {
  const l = isHeading(line) ? norm(line) : line;
  const t = l.replace(/§ ?[0-9]+(?:\.[0-9]+)*/g, " ").replace(OLD_NAME, " ");
  const out = [];
  for (const m of t.matchAll(/`[^`]+`/g)) {
    out.push(m[0]);
  }
  for (const m of t.matchAll(/\]\(([^)]+)\)/g)) {
    out.push(`link:${m[1].split("/").pop()}`);
  }
  for (const m of t
    .replace(/`[^`]+`/g, " ")
    .matchAll(/(?<![\w.-])[0-9][0-9,]*(?:\.[0-9]+)?(?![\w-])/g)) {
    out.push(m[0]);
  }
  return out;
}

const problems = [];
if (mode === "lines") {
  const have = multiset(fresh.filter((l) => !skip(l)).map(norm));
  for (const [i, l] of old.entries()) {
    if (skip(l) || rewritten.has(i)) {
      continue;
    }
    const k = norm(l);
    const n = have.get(k) ?? 0;
    if (n > 0) {
      have.set(k, n - 1);
    } else {
      problems.push(`old line ${i + 1} not found: ${l.slice(0, 160)}`);
    }
  }
}
// Tokens: everything in tokens mode, the rewritten ranges in lines mode.
{
  const have = multiset(fresh.flatMap(tokens));
  for (const [i, l] of old.entries()) {
    if (mode === "lines" && !rewritten.has(i)) {
      continue;
    }
    for (const t of tokens(l)) {
      const n = have.get(t) ?? 0;
      if (n > 0) {
        have.set(t, n - 1);
      } else {
        problems.push(`old line ${i + 1}: "${t}" not found in the new layout`);
      }
    }
  }
}

for (const p of problems) {
  console.log(p);
}
console.log(
  `old: ${old.length} lines, ${headings(old)} headings, ${rows(old)} table rows (${rewritten.size} lines became work items)`,
);
console.log(
  `new: ${fresh.length} lines in ${newFiles.length} files, ${headings(fresh)} headings, ${rows(fresh)} table rows`,
);
console.log(
  problems.length
    ? `${problems.length} problem(s)`
    : `${mode}: everything accounted for`,
);
process.exitCode = problems.length ? 1 : 0;
