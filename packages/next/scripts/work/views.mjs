#!/usr/bin/env node
// Views over the work items in packages/next/work/. Reads files only; runs
// nothing it reads. See docs/superpowers/plans/2026-11-13-work-tracker.md.
//
//   node scripts/work/views.mjs ready              Planned items whose needs are all Done
//   node scripts/work/views.mjs blocked            open items and what they wait on
//   node scripts/work/views.mjs claims             claims on other worktrees and branches
//   node scripts/work/views.mjs decisions [--who owner|all]   the decision backlog, by project
//   node scripts/work/views.mjs projects           the project dependency view
//   node scripts/work/views.mjs initiatives        the initiative rollup
//   node scripts/work/views.mjs lists [--write]    the item lists (README.md between markers)
//   node scripts/work/views.mjs mermaid items [--project CS-n] | mermaid projects
//   node scripts/work/views.mjs check [--branches] schema, IDs, needs, cycles, stale names

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  WORK_DIR,
  bareSectionRefs,
  buildGraph,
  checkItems,
  describeProgress,
  findClaims,
  findCollisions,
  itemRow,
  listPlaces,
  loadPlaces,
  loadWorkTree,
  mermaidItems,
  mermaidProjects,
  progress,
  projectDeps,
  renderLists,
  replaceBetweenMarkers,
  staleNames,
} from "./lib.mjs";

const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();
const args = process.argv.slice(2);
const cmd = args[0] ?? "ready";
const flag = (name) => args.includes(name);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const items = loadWorkTree(root);
const g = buildGraph(items);
const title = (id) => g.get(id)?.data.title ?? id;
const byProject = (its) => {
  const groups = new Map();
  for (const it of its) {
    const p = it.data.project;
    if (!groups.has(p)) {
      groups.set(p, []);
    }
    groups.get(p).push(it);
  }
  return [...groups];
};

function printGrouped(its, line) {
  for (const [n, [p, group]] of byProject(its).entries()) {
    if (n > 0) {
      console.log("");
    }
    console.log(`${p} ${title(p)}`);
    for (const it of group) {
      console.log(`  ${line(it)}`);
    }
  }
}

if (cmd === "ready") {
  const ready = g.items.filter(g.isReady);
  printGrouped(ready, (it) =>
    itemRow(g, it).split("\t").slice(0, 2).join("  "),
  );
  console.log(`\n${ready.length} ready`);
} else if (cmd === "blocked") {
  const blocked = g.items.filter(g.isBlocked);
  printGrouped(blocked, (it) => {
    const open = g.openNeeds(it).map((n) => `${n} ${title(n)}`);
    return `${it.data.id}  ${it.data.title}${it.data.status === "Proposed" ? " (proposed)" : ""}\n      ← ${open.join("\n        ")}`;
  });
  console.log(`\n${blocked.length} blocked`);
} else if (cmd === "claims") {
  const placed = loadPlaces(root, listPlaces(root));
  const claims = findClaims(items, placed);
  for (const c of claims) {
    const flagTwice = c.who.length > 1 ? "  ← claimed twice" : "";
    console.log(`${c.id}  ${c.title}\n      ${c.who.join("; ")}${flagTwice}`);
  }
  console.log(
    `${claims.length} claim(s) elsewhere. Claims aren't atomic: other machines' claims show only after a bundle.`,
  );
} else if (cmd === "decisions") {
  const who = option("--who", "owner");
  const open = g.items.filter(
    (it) =>
      it.data.kind === "decision" &&
      g.isOpen(it) &&
      (who === "all" || it.data["decided-by"] === who),
  );
  printGrouped(open, (it) => {
    const waits = g.dependents(it.data.id).map((d) => d.data.id);
    const first = g.openNeeds(it);
    const lines = [
      `${it.data.id}  ${it.data.title} (${it.data["decided-by"]})`,
    ];
    if (first.length) {
      lines.push(`      first needs ${first.join(", ")}`);
    }
    if (waits.length) {
      lines.push(`      waited on by ${waits.join(", ")}`);
    }
    return lines.join("\n");
  });
  console.log(`\n${open.length} open decision(s) for ${who}`);
} else if (cmd === "projects") {
  const deps = projectDeps(g);
  for (const p of g.projects) {
    const id = p.data.id;
    const c = progress(g, g.itemsOf(id));
    console.log(
      `${id} ${p.data.title} [${p.data.status}], led by ${p.data.lead}`,
    );
    console.log(`  ${describeProgress(c)}`);
    const on = deps.filter((e) => e.from === id);
    const by = deps.filter((e) => e.to === id);
    const fmt = (es, key) =>
      es.map((e) => `${e[key]} ${title(e[key])} (${e.count})`).join("; ") ||
      "nothing open";
    console.log(`  waits on: ${fmt(on, "to")}`);
    console.log(`  waited on by: ${fmt(by, "from")}`);
  }
} else if (cmd === "initiatives") {
  for (const ini of g.initiatives) {
    const projects = g.projectsOf(ini.data.id);
    const all = projects.flatMap((p) => g.itemsOf(p.data.id));
    console.log(`${ini.data.id} ${ini.data.title} [${ini.data.status}]`);
    for (const p of projects) {
      console.log(
        `  ${p.data.id} ${p.data.title}: ${describeProgress(progress(g, g.itemsOf(p.data.id)))}`,
      );
    }
    const decisions = all.filter(
      (it) => it.data.kind === "decision" && g.isOpen(it),
    );
    const external = all.filter(
      (it) => it.data.kind === "external" && g.isOpen(it),
    );
    console.log(`  all: ${describeProgress(progress(g, all))}`);
    console.log(
      `  open decisions: ${decisions.length}; waiting outside: ${external.length}`,
    );
  }
} else if (cmd === "lists") {
  if (flag("--write")) {
    const path = join(root, WORK_DIR, "README.md");
    const text = readFileSync(path, "utf8");
    writeFileSync(
      path,
      replaceBetweenMarkers(text, renderLists(g, { linkBase: "./" })),
    );
    console.log(`wrote ${WORK_DIR}/README.md`);
  } else {
    process.stdout.write(renderLists(g));
  }
} else if (cmd === "mermaid") {
  const what = args[1] ?? "items";
  process.stdout.write(
    what === "projects"
      ? mermaidProjects(g)
      : mermaidItems(g, option("--project")),
  );
} else if (cmd === "check") {
  const problems = checkItems(items, { root });
  for (const h of [...staleNames(root), ...bareSectionRefs(root)]) {
    problems.push(
      `${h.path}:${h.line}: ${h.name}: ${h.text.trim().slice(0, 140)}`,
    );
  }
  if (flag("--branches")) {
    const placed = loadPlaces(root, listPlaces(root, { remotes: true }));
    for (const c of findCollisions(placed)) {
      problems.push(
        `${c.id} is two different items: ${c.files.map((f) => `${f.file} on ${f.where.join(", ")}`).join("; ")}`,
      );
    }
  }
  for (const p of problems) {
    console.log(p);
  }
  console.log(
    problems.length
      ? `${problems.length} problem(s)`
      : `${items.length} files, no problems`,
  );
  process.exitCode = problems.length ? 1 : 0;
} else {
  console.error(`unknown view: ${cmd}`);
  process.exitCode = 2;
}
