#!/usr/bin/env node
// Creates a work item with the next free CS number. See
// docs/superpowers/plans/2026-11-13-work-tracker.md, section 4.
//
//   node scripts/work/new.mjs --kind work --project CS-7 --title "…" \
//     [--needs CS-1,CS-2] [--status Planned|Proposed] \
//     [--decided-by owner] [--party "Cesium ion"] \
//     [--initiative CS-1 --lead owner --plan docs/…md] [--dry-run]
//   node scripts/work/new.mjs --kind capability|learning \
//     (--project CS-7 | --initiative CS-1) --title "<the outcome, named>" \
//     [--outcome "…"] [--status Proposed]
//
// Milestones follow human-in-the-lead's format: named by their outcome,
// never numbered; their constraints (`needs: CS-n c1`) are added at
// shaping. Items no longer take a milestone or a priority.
//
// The number is one more than the highest taken in this checkout, in every
// worktree's working copy and on every local and remote-tracking branch.
// Prints the ID and the repository-relative path. Stages nothing.

import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  FOLDER,
  KINDS,
  STATUSES,
  WORK_DIR,
  allocate,
  renderItem,
  slugify,
  takenNumbers,
} from "./lib.mjs";

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const fail = (msg) => {
  console.error(msg);
  process.exit(2);
};

const kind = option("kind") ?? "work";
const titleText = option("title");
if (!KINDS.includes(kind)) {
  fail(`--kind must be one of ${KINDS.join(", ")}`);
}
if (!titleText) {
  fail("--title is required");
}
const status = option("status") ?? "Planned";
if (
  !STATUSES.includes(status) ||
  ["Done", "Dropped", "In progress"].includes(status)
) {
  fail(
    "--status must be Planned or Proposed (claim and close by editing the file)",
  );
}
const isItem = ["work", "decision", "external"].includes(kind);
if (isItem && !option("project")) {
  fail("--project CS-<n> is required for an item");
}
const isMilestone = ["capability", "learning"].includes(kind);
if (isMilestone && !option("project") === !option("initiative")) {
  fail("a milestone takes one of --project CS-<n> or --initiative CS-<n>");
}
if (kind === "project" && !option("initiative")) {
  fail("--initiative CS-<n> is required for a project");
}
if (kind === "external" && !option("party")) {
  fail("--party is required for an external item (who we wait on)");
}

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();
const today = new Date().toLocaleDateString("sv"); // YYYY-MM-DD, local
const data = {
  id: "",
  title: titleText,
  kind,
  status,
  created: today,
  project: isItem || isMilestone ? option("project") : undefined,
  needs: option("needs")
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  "decided-by":
    kind === "decision" ? (option("decided-by") ?? "owner") : undefined,
  party: kind === "external" ? option("party") : undefined,
  initiative:
    kind === "project" || isMilestone ? option("initiative") : undefined,
  outcome: isMilestone ? option("outcome") : undefined,
  lead: ["project", "initiative"].includes(kind)
    ? (option("lead") ?? "owner")
    : undefined,
  plan: kind === "project" ? option("plan") : undefined,
};
const BODY = {
  work: "\n## Done when\n\n\n",
  decision:
    "\n## Question\n\n\n## Options and recommendation\n\n\n## Answer\n\nOpen.\n",
  external: "\n## Waiting on\n\n\n",
  project: "\n## Summary\n\n\n",
  initiative: "\n## Goal\n\n\n",
  capability: "\n## Why\n\n\n## Done when\n\n\n## Notes\n\n",
  learning: "\n## Why\n\n\n## Done when\n\n\n## Notes\n\n",
};
const slug = slugify(titleText);

if (args.includes("--dry-run")) {
  const n = Math.max(0, ...takenNumbers(root)) + 1;
  data.id = `CS-${n}`;
  console.log(`${WORK_DIR}/${FOLDER[kind]}/CS-${n}-${slug}.md (dry run)`);
  process.stdout.write(renderItem(data, BODY[kind]));
} else {
  const { id, path } = allocate(
    root,
    (n) => {
      data.id = `CS-${n}`;
      const rel = `${WORK_DIR}/${FOLDER[kind]}/CS-${n}-${slug}.md`;
      mkdirSync(dirname(join(root, rel)), { recursive: true });
      // Exclusive create: fails if another session wrote this name first.
      writeFileSync(join(root, rel), renderItem(data, BODY[kind]), {
        flag: "wx",
      });
      return rel;
    },
    (rel) => rmSync(join(root, rel)),
  );
  console.log(`${id}\t${path}`);
}
