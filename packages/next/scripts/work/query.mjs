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

/**
 * Raised when a field is removed or retyped; adding one keeps it.
 * 2 (2026-11-14): items lost `priority` and `milestone` (retired by
 * human-in-the-lead's format); `milestones` added.
 */
export const API_VERSION = 2;

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
 * problems, `elsewhere` (claimsElsewhere's answer) and `history`
 * (statusHistory's), both read by the caller, which may cache them.
 * `root` is the repository root.
 */
/** A token count from the files (a string there), or nothing. */
const tokens = (v) => (v === undefined ? undefined : Number(v));

export function queryWork(root, { elsewhere = [], history = [] } = {}) {
  const items = loadWorkTree(root);
  const g = buildGraph(items);
  const item = (it) => {
    const d = it.data;
    return {
      id: d.id,
      title: d.title,
      kind: d.kind,
      status: d.status,
      project: d.project,
      needs: list(d.needs),
      claimed: d.claimed,
      reason: d.reason,
      decided_by: d["decided-by"],
      party: d.party,
      created: d.created,
      estimate_tokens: tokens(d.estimate_tokens),
      path: it.path,
      ready: g.isReady(it),
      blocked: g.isBlocked(it),
      open_needs: g.openNeeds(it),
      needed_by: g.dependents(d.id).map((x) => x.data.id),
      milestones: g.milestonesOf(d.id).map((m) => m.data.id),
    };
  };
  const milestone = (m) => {
    const d = m.data;
    const list = (v) => [v ?? []].flat().map(String);
    const constraints = list(d.needs).map((e) => {
      const [id, clause = "c?"] = e.split(/\s+/);
      return { id, clause };
    });
    const items = constraints.filter((c) =>
      g.isItem(g.get(c.id) ?? { data: {} }),
    );
    const done = items.filter(
      (c) => g.get(c.id)?.data.status === "Done",
    ).length;
    const results = list(d.check_results);
    const passed = /^(pass|verdict) /.test(results.at(-1) ?? "");
    const doneWhen = list(d.done_when).map((c) => {
      const [, clause, text] = c.match(/^(c\d+): (.*)$/) ?? [];
      return { clause, text };
    });
    const toShape = [
      !d.outcome && "outcome",
      !doneWhen.length && "clauses",
      !d.check && "check",
      constraints.some((c) => c.clause === "c?") && "links",
    ].filter(Boolean);
    return {
      id: d.id,
      title: d.title,
      kind: d.kind,
      status: d.status,
      project: d.project,
      initiative: d.initiative ?? g.get(d.project)?.data.initiative,
      outcome: d.outcome,
      done_when: doneWhen,
      constraints,
      serves: list(d.serves).map((e) => {
        const [id, ...kv] = e.split(/\s+/);
        const f = Object.fromEntries(kv.map((x) => x.split("=")));
        return { id, value: Number(f.value), confidence: Number(f.confidence) };
      }),
      check: d.check,
      check_results: results,
      appetite_tokens: tokens(d.appetite_tokens),
      path: m.path,
      progress: { done, total: items.length },
      check_due: items.length > 0 && done === items.length && !passed,
      to_shape: toShape,
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
    milestones: g.milestones.map(milestone),
    project_deps: projectDeps(g),
    elsewhere,
    history,
    problems: checkItems(items, { root }),
  };
}

/**
 * The status history of the items on this branch, from git: one event
 * per commit that set an item's status (its creation included), oldest
 * first, with the commit's date. Read in one `git log`; uncommitted
 * changes aren't history yet (the snapshot has the current state).
 */
export function statusHistory(root) {
  const log = git(root, [
    "log",
    "-p",
    "-U0",
    "--reverse",
    "--no-merges",
    "--format=@@commit %cI",
    "--",
    "packages/next/work/items",
  ]);
  const events = [];
  let at;
  let id;
  for (const line of (log ?? "").split("\n")) {
    if (line.startsWith("@@commit ")) {
      at = line.slice(9).trim();
    } else if (line.startsWith("diff --git ")) {
      id = /\/(CS-[1-9]\d*)[-.][^/]*$/.exec(line)?.[1];
    } else if (id && at && line.startsWith("+status: ")) {
      events.push({ id, at, status: line.slice(9).trim() });
    }
  }
  return events;
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
 * Full-text search over every item: its whole file, frontmatter (status,
 * kind, priority, who decides, reason, needs, dates and the rest) and
 * text alike, plus its project's title. Every word must appear, in any
 * case. Each match says where it was found, with a short snippet around
 * the first word. At most `limit` matches, best first: a title match
 * before a metadata match before a text-only one.
 */
export function findItems(root, q, limit = 200) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 8);
  if (!words.length) {
    return { api_version: API_VERSION, q, matches: [] };
  }
  const g = buildGraph(loadWorkTree(root));
  const matches = [];
  for (const it of g.items) {
    const d = it.data;
    const project = g.get(d.project)?.data.title ?? "";
    const title = `${d.id} ${d.title}`.toLowerCase();
    const meta = Object.entries(d)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
      .join("\n");
    const all = `${title}\n${project}\n${meta}\n${it.body}`.toLowerCase();
    if (!words.every((w) => all.includes(w))) {
      continue;
    }
    const where = words.every((w) => title.includes(w))
      ? "title"
      : words.every((w) =>
            `${title}\n${project}\n${meta}`.toLowerCase().includes(w),
          )
        ? "metadata"
        : "text";
    // A snippet around the first word, from the text or the metadata.
    const source = where === "text" ? it.body : `${meta}\n${it.body}`;
    const at = source.toLowerCase().indexOf(words[0]);
    const snippet =
      where === "title" || at < 0
        ? undefined
        : `${at > 40 ? "…" : ""}${source
            .slice(Math.max(0, at - 40), at + 80)
            .replace(/\s+/g, " ")
            .trim()}${at + 80 < source.length ? "…" : ""}`;
    matches.push({ id: d.id, where, snippet });
  }
  const rank = { title: 0, metadata: 1, text: 2 };
  matches.sort((a, b) => rank[a.where] - rank[b.where]);
  return { api_version: API_VERSION, q, matches: matches.slice(0, limit) };
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
