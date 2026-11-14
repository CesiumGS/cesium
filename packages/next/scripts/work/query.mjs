// The tracker's read API for Dyno's Work board: one versioned JSON
// snapshot of the work items on this checkout's branch, and one item's
// text. The board reads only this shape (bench/suite/work.ts), never the
// item files.
//
// This file is the adapter. Today it reads the files through lib.mjs, so
// the board can't disagree with views.mjs. When the human-in-the-lead
// plugin's `hitld work query --json` (and `hitld work show --json`) land,
// only this file changes: run those, map their output onto the same
// shape, and keep `API_VERSION` unless a field is removed or retyped.
//
// Nothing read from an item is executed or evaluated (lib.mjs parses a
// small subset of YAML); git is run with fixed arguments only.

import { execFileSync } from "node:child_process";
import {
  ID_PATTERN,
  buildGraph,
  checkItems,
  listPlaces,
  loadPlaces,
  loadWorkTree,
  progress,
  projectDeps,
} from "./lib.mjs";

/** Raised when a field is removed or retyped; adding one keeps it. */
export const API_VERSION = 1;

const git = (root, args) => {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return undefined;
  }
};

/** Lists may be absent, a scalar or a list in the files. */
const list = (v) =>
  v === undefined || v === null || v === "" ? [] : Array.isArray(v) ? v : [v];

const counts = (c) => ({
  total: c.total,
  done: c.done,
  dropped: c.dropped,
  in_progress: c.inProgress,
  ready: c.ready,
  blocked: c.blocked,
  proposed: c.proposed,
});

/**
 * The snapshot: every item with what the tracker derives for it (ready,
 * blocked, open needs, who needs it), the projects and initiatives with
 * their progress, the dependencies between projects, the check's
 * problems, and `elsewhere` (claimsElsewhere's answer, read by the
 * caller, which may cache it). `root` is the repository root.
 */
export function queryWork(root, { elsewhere = [] } = {}) {
  const items = loadWorkTree(root);
  const g = buildGraph(items);
  const item = (it) => {
    const d = it.data;
    return {
      id: d.id,
      title: d.title,
      kind: d.kind,
      status: d.status,
      priority: d.priority,
      project: d.project,
      milestone: d.milestone,
      needs: list(d.needs),
      claimed: d.claimed,
      reason: d.reason,
      decided_by: d["decided-by"],
      party: d.party,
      created: d.created,
      path: it.path,
      ready: g.isReady(it),
      blocked: g.isBlocked(it),
      open_needs: g.openNeeds(it),
      needed_by: g.dependents(d.id).map((x) => x.data.id),
    };
  };
  const container = (it, members) => ({
    id: it.data.id,
    title: it.data.title,
    status: it.data.status,
    lead: it.data.lead,
    plan: it.data.plan,
    initiative: it.data.initiative,
    reason: it.data.reason,
    path: it.path,
    progress: counts(progress(g, members)),
  });
  return {
    api_version: API_VERSION,
    source: "files (packages/next/scripts/work/lib.mjs)",
    branch: git(root, ["rev-parse", "--abbrev-ref", "HEAD"]),
    commit: git(root, ["rev-parse", "--short", "HEAD"]),
    generated: new Date().toISOString(),
    items: g.items.map(item),
    projects: g.projects.map((p) => container(p, g.itemsOf(p.data.id))),
    initiatives: g.initiatives.map((i) =>
      container(
        i,
        g.projectsOf(i.data.id).flatMap((p) => g.itemsOf(p.data.id)),
      ),
    ),
    project_deps: projectDeps(g),
    elsewhere,
    problems: checkItems(items, { root }),
  };
}

/**
 * Work in flight elsewhere: items In progress in another worktree or on
 * another local branch, where this checkout's copy says otherwise (its
 * claim hasn't merged yet). One entry per place, as `views.mjs claims`
 * finds them. Other machines' claims arrive only with a bundle or a push.
 */
export function claimsElsewhere(root) {
  const here = buildGraph(loadWorkTree(root));
  const top = git(root, ["rev-parse", "--show-toplevel"]);
  // Detached checkouts are benchmark snapshots (.bench/), not work.
  const places = listPlaces(root).filter(
    (p) => p.path !== top && !p.where.startsWith("detached"),
  );
  const out = [];
  const seen = new Set();
  for (const { where, items } of loadPlaces(root, places)) {
    for (const it of items) {
      const d = it.data;
      if (!d?.id || d.status !== "In progress") {
        continue;
      }
      const mine = here.get(d.id)?.data;
      if (mine && mine.status === d.status && mine.claimed === d.claimed) {
        continue;
      }
      const key = `${d.id}|${d.claimed}|${where}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      out.push({
        id: d.id,
        claimed: d.claimed,
        where: where.replace(/ \(worktree\)$/, ""),
        worktree: where.endsWith("(worktree)"),
      });
    }
  }
  return out;
}

/**
 * One item's text (its body, without the frontmatter), or undefined for
 * an ID the tracker doesn't have. Only IDs of the tracker's form are
 * looked up, so a request can't name a file.
 */
export function showItem(root, id) {
  if (!ID_PATTERN.test(id)) {
    return undefined;
  }
  const it = buildGraph(loadWorkTree(root)).get(id);
  return it
    ? { api_version: API_VERSION, id, path: it.path, body: it.body.trim() }
    : undefined;
}
