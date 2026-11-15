#!/usr/bin/env node
// Brings the tracker to human-in-the-lead's file format, with the same two
// named steps as its `hitld work migrate`, so that tool finds nothing left
// to do when it is installed:
//
//   milestone-entities  each project's `milestones` list and each item's
//                       `milestone` key become milestone files in
//                       work/milestones/, with those items as constraints
//                       marked `c?` for shaping to link to clauses;
//   retire-priority     removes `priority` (order is derived), noting the
//                       old value in the item's text.
//
//   node scripts/work/migrate.mjs [--dry-run] [--only <step>]
//
// A step returns no changes for files already in the new format, so a
// second run does nothing. Files are edited line by line, so nothing else
// in them moves. It writes, and never commits.

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  WORK_DIR,
  allocate,
  buildGraph,
  loadWorkTree,
  renderItem,
  slugify,
  takenNumbers,
} from "./lib.mjs";

const args = process.argv.slice(2);
const dry = args.includes("--dry-run");
const only = args.includes("--only")
  ? args[args.indexOf("--only") + 1]
  : undefined;
const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();
const today = new Date().toLocaleDateString("sv");

const read = (rel) => readFileSync(join(root, rel), "utf8");
const write = (rel, text) => {
  if (dry) {
    console.log(`would edit ${rel}`);
  } else {
    writeFileSync(join(root, rel), text);
  }
};
/** Removes a key's line from the frontmatter, and its list lines under it. */
function dropKey(text, key) {
  const lines = text.split("\n");
  const end = lines.indexOf("---", 1);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (i > 0 && i < end && lines[i].startsWith(`${key}:`)) {
      while (i + 1 < end && /^\s+-\s/.test(lines[i + 1])) {
        i++;
      }
      continue;
    }
    out.push(lines[i]);
  }
  return out.join("\n");
}

/** "5c the second body" → "The second body": milestones are named by outcome, never numbered. */
const milestoneTitle = (name) => {
  const t = String(name)
    .replace(/^\d+[a-z]?\s+/i, "")
    .trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

const steps = {
  "milestone-entities"() {
    const items = loadWorkTree(root);
    const g = buildGraph(items);
    let changed = 0;
    for (const p of g.projects) {
      const names = [p.data.milestones ?? []].flat().map(String);
      for (const name of names) {
        const members = g.items.filter(
          (it) => it.data.project === p.data.id && it.data.milestone === name,
        );
        const title = milestoneTitle(name);
        const data = {
          id: "",
          title,
          kind: "capability",
          status: p.data.status === "Proposed" ? "Proposed" : "Planned",
          created: today,
          project: p.data.id,
          needs: members.map((it) => `${it.data.id} c?`),
        };
        const body = `
## Why

To shape: the outcome for users, in one sentence.

## Done when

To shape: clauses (c1, c2…), each checkable, and the independent check.

## Notes

Migrated on ${today} from the milestone "${name}" of ${p.data.id} (its \`milestones\` list and its items' \`milestone\` key). Its ${members.length} items are constraints marked \`c?\` until shaping links each to a clause.
`;
        if (dry) {
          const n = Math.max(0, ...takenNumbers(root)) + 1 + changed;
          console.log(
            `would create ${WORK_DIR}/milestones/CS-${n}-${slugify(title)}.md (${members.length} constraints)`,
          );
        } else {
          const { id, path } = allocate(
            root,
            (n) => {
              data.id = `CS-${n}`;
              const rel = `${WORK_DIR}/milestones/CS-${n}-${slugify(title)}.md`;
              mkdirSync(dirname(join(root, rel)), { recursive: true });
              writeFileSync(join(root, rel), renderItem(data, body), {
                flag: "wx",
              });
              return rel;
            },
            (rel) => rmSync(join(root, rel)),
          );
          console.log(`${id}\t${path}\t(${members.length} constraints)`);
        }
        changed++;
      }
      if (names.length) {
        write(p.path, dropKey(read(p.path), "milestones"));
      }
    }
    for (const it of items) {
      if (it.data?.milestone !== undefined) {
        write(it.path, dropKey(read(it.path), "milestone"));
        changed++;
      }
    }
    return changed;
  },
  "retire-priority"() {
    let changed = 0;
    for (const it of loadWorkTree(root)) {
      const was = it.data?.priority;
      if (was === undefined) {
        continue;
      }
      let text = dropKey(read(it.path), "priority");
      text = `${text.replace(/\n+$/, "")}\n\nWas \`priority: ${was}\` until ${today}; order now comes from what each item unblocks.\n`;
      write(it.path, text);
      changed++;
    }
    return changed;
  },
};

for (const [name, step] of Object.entries(steps)) {
  if (only && only !== name) {
    continue;
  }
  const n = step();
  console.log(
    `${name}: ${n ? `${n} change(s)${dry ? " (dry run)" : ""}` : "nothing to do"}`,
  );
}
