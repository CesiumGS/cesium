// Dyno's Work board reads the tracker through human-in-the-lead's read API
// (`hitld work query --json`, version 3) and its commands (`work claims`,
// `work check`, `work show`), never the item files. This is the one adapter
// between the two: it runs hitld, checks the version, and shapes its answers
// into the board's snapshot (bench/suite/work.ts reads it). The board's
// rollups (ready and blocked counts per project and long outcome, open
// needs, who needs what, the dependencies between projects) are derived
// here from those answers, so the board needs no tracker logic of its own.
//
// The reads that aren't hitld's come from git: the state history behind
// the Flow view (the read API has none yet), from `git log` of the item
// files' `state:` lines (and the `status:` lines from before CS-521); and,
// for the live run (readLive), which items are done on an hitld/* branch
// and not on the main branch, and whether hitld holds a batch for the owner.
//
// queryWork and readLive read everything, every time. The dev server reads
// through boardReader instead (CS-704), which keeps each read until what it
// reads changes, so a warm request runs no hitld process at all.
//
// hitld is the dev dependency pinned in package.json. Nothing read from it
// is executed or evaluated; hitld and git run with fixed arguments only.

import { execFileSync, spawn } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

/** The read API version this adapter understands. */
export const API_VERSION = 3;

/** The tracker's ID form: only these are looked up. */
const ID_PATTERN = /^CS-[1-9]\d*$/;

/**
 * Raised when hitld is missing, answers in another version, or fails.
 * `reason` is "missing", "version" or "failed"; the message is the detail,
 * for the dev server's log.
 */
export class HitldUnavailable extends Error {
  constructor(reason, message) {
    super(message);
    this.reason = reason;
  }
}

/** What the page may be told for each reason: fixed words, never hitld's output. */
export const UNAVAILABLE_TEXT = {
  missing:
    "hitld isn't installed: run pnpm install in the repository (human-in-the-lead is a dev dependency of the workspace root)",
  version: `hitld's read API isn't version ${API_VERSION}, the version Dyno's board reads; install the release package.json pins`,
  failed: "hitld couldn't read the tracker; see the dev server's log",
};

/** The pinned hitld's entry point, or a reason it can't be used. */
export function hitldPath() {
  const missing = new HitldUnavailable("missing", UNAVAILABLE_TEXT.missing);
  let bin;
  try {
    const pkg = createRequire(import.meta.url).resolve(
      "human-in-the-lead/package.json",
    );
    bin = join(dirname(pkg), "core", "bin", "hitld.mjs");
  } catch {
    throw missing;
  }
  // The resolution is cached; the file may have gone since.
  if (!existsSync(bin)) {
    throw missing;
  }
  return bin;
}

/**
 * Run one hitld command in `root`: its exit code, and what it wrote. hitld
 * exits 1 when a command finds a problem, with its JSON answer on stdout
 * all the same, so the code alone isn't a failure.
 */
function runHitld(bin, root, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [bin, ...args], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const out = [];
    const err = [];
    child.stdout.on("data", (d) => out.push(d));
    child.stderr.on("data", (d) => err.push(d));
    child.on("error", () =>
      reject(new HitldUnavailable("failed", "hitld couldn't be started")),
    );
    child.on("close", (code) =>
      resolve({
        code,
        stdout: Buffer.concat(out).toString("utf8"),
        stderr: Buffer.concat(err).toString("utf8"),
      }),
    );
  });
}

/** Run one hitld command in `root` and parse its JSON answer. */
async function hitld(root, args) {
  const { stdout, stderr } = await runHitld(hitldPath(), root, args);
  if (!stdout.trim()) {
    // The line that says why goes to the dev server's log; the rest is a stack.
    const why =
      stderr
        .trim()
        .split("\n")
        .find((l) => /error/i.test(l)) ?? stderr.trim().split("\n")[0];
    throw new HitldUnavailable(
      "failed",
      `hitld ${args.slice(0, 2).join(" ")} failed: ${why}`,
    );
  }
  return JSON.parse(stdout);
}

/** Refuse an answer in a read API version this adapter doesn't read. */
export function checkVersion(answer) {
  if (answer.api_version !== API_VERSION) {
    throw new HitldUnavailable(
      "version",
      `hitld's read API is version ${String(answer.api_version)}; Dyno's board reads version ${API_VERSION}`,
    );
  }
  return answer;
}

const git = (root, args) => {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 1 << 28,
    }).trim();
  } catch {
    return undefined;
  }
};

/** "CS-170" → 170. */
const idNumber = (id) => Number(String(id).replace(/^\D+-/, "")) || 0;
const byNumber = (a, b) => idNumber(a.id) - idNumber(b.id);

const ITEM = "item";

/**
 * A proposal's text (its body), which holds its header (CS-686); only
 * proposals carry theirs, to keep the snapshot small. `bodies` holds the
 * proposals' bodies by ID (readProposals).
 */
const proposalText = (e, bodies) =>
  e.state === "proposed" && bodies.get(e.id)
    ? String(bodies.get(e.id)).trim()
    : undefined;
const isOpen = (e) => e.state !== "done" && e.state !== "dropped";

/** Every entity, without bodies: `hitld work query --json`. */
export const readEntities = async (root) =>
  checkVersion(await hitld(root, ["work", "query", "--json"]));

/**
 * The proposals with their bodies, the only text the board shows
 * (`hitld work query --state proposed --bodies --json`).
 */
export const readProposals = async (root) =>
  checkVersion(
    await hitld(root, [
      "work",
      "query",
      "--state",
      "proposed",
      "--bodies",
      "--json",
    ]),
  );

/**
 * The items ready to start: `hitld work query --ready --json`. It reads
 * every branch's claims, as `hitld work claims` does, so the board derives
 * the same list from the claims it reads anyway (readyOf), and asks this
 * only when those couldn't be read.
 */
export const readReady = async (root) =>
  checkVersion(await hitld(root, ["work", "query", "--ready", "--json"]));

/** hitld's version: `hitld version`. */
export const readVersion = (root) => hitld(root, ["version"]);

/**
 * The check's problems (`hitld work check`): schema, references, cycles,
 * and the classification of every file in the tree, which is most of its
 * time.
 */
export const readCheck = async (root) =>
  (await hitld(root, ["work", "check"])).problems ?? [];

/**
 * The items ready to start, as hitld's `work query --ready` finds them:
 * planned, every need done, and claimed on no branch (`claimed`, the IDs
 * `hitld work claims` lists, claimedOf).
 */
export function readyOf(all, claimed) {
  const state = new Map(all.entities.map((e) => [e.id, e.state]));
  return new Set(
    all.entities
      .filter(
        (e) =>
          e.entity === ITEM &&
          e.state === "planned" &&
          (e.needs ?? []).every((n) => state.get(n) === "done") &&
          !claimed.has(e.id),
      )
      .map((e) => e.id),
  );
}

/** Every item a branch claims (readClaims' answer), stale claims included. */
export const claimedOf = (claims) =>
  new Set([...claims.list, ...claims.stale].map((c) => c.id));

/** Progress counts over a set of items. */
function progressOf(items, ready, blocked) {
  const c = {
    total: 0,
    done: 0,
    dropped: 0,
    in_progress: 0,
    ready: 0,
    blocked: 0,
    proposed: 0,
  };
  for (const it of items) {
    c.total++;
    if (it.state === "done") {
      c.done++;
    } else if (it.state === "dropped") {
      c.dropped++;
    } else if (it.state === "in-progress") {
      c.in_progress++;
    } else if (ready.has(it.id)) {
      c.ready++;
    } else if (blocked.has(it.id)) {
      c.blocked++;
    }
    if (it.state === "proposed") {
      c.proposed++;
    }
  }
  return c;
}

/**
 * The board's snapshot of the tracker on `root`'s branch, from hitld:
 * every item with its derived readiness and links, the milestones, the
 * projects and long outcomes with their progress, the dependencies between
 * projects, and the check's problems. `elsewhere` (claimsElsewhere's
 * answer), `history` (stateHistory's) and `live` (readLive's) are read by
 * the caller, which may cache them.
 */
export async function queryWork(
  root,
  { elsewhere = [], history = [], live } = {},
) {
  const [all, proposals, claims, problems, version] = await Promise.all([
    readEntities(root),
    readProposals(root),
    live?.claims.ok ? live.claims : readClaims(root),
    readCheck(root),
    readVersion(root),
  ]);
  return boardOf(
    root,
    {
      all,
      proposals,
      ready: readyOf(all, claimedOf(claims)),
      problems,
      version,
    },
    { elsewhere, history, live },
  );
}

/**
 * The board's snapshot from hitld's answers (readEntities, readProposals,
 * readCheck and readVersion), the ready items (readyOf, or readReady's
 * IDs), and the reads the caller made of the rest (queryWork's). `pending`
 * names the sources an answer goes without because they are still being
 * read (boardReader).
 */
export function boardOf(
  root,
  { all, proposals, ready, problems, version },
  { elsewhere = [], history = [], live, pending, branch, commit } = {},
) {
  const bodies = new Map(
    proposals.entities.filter((e) => e.body).map((e) => [e.id, e.body]),
  );
  const entities = [...all.entities].sort(byNumber);
  const byId = new Map(entities.map((e) => [e.id, e]));
  const rawItems = entities.filter((e) => e.entity === ITEM);
  const projects = entities.filter((e) => e.entity === "project");
  const allMilestones = entities.filter((e) => e.entity === "milestone");
  const longOutcomes = allMilestones.filter((m) => !m.parent);
  const milestones = allMilestones.filter((m) => m.parent);

  // A need counts as open until it is done (a dropped need stays open, as
  // it always has on the board: the item that needs it must be reshaped).
  const openNeeds = (e) =>
    (e.needs ?? []).filter((n) => byId.get(n)?.state !== "done");
  // Blocked, as the board has always counted it: planned or proposed, with
  // a need still open. (hitld's `--blocked` counts planned items only; the
  // board also shows a proposal that waits on something as waiting.)
  const blocked = new Set(
    entities
      .filter(
        (e) =>
          e.entity === ITEM &&
          (e.state === "planned" || e.state === "proposed") &&
          openNeeds(e).length > 0,
      )
      .map((e) => e.id),
  );
  const neededBy = new Map();
  for (const it of rawItems) {
    if (!isOpen(it)) {
      continue;
    }
    for (const n of it.needs ?? []) {
      neededBy.set(n, [...(neededBy.get(n) ?? []), it.id]);
    }
  }

  // The long outcome a milestone serves, and through its milestones, a
  // project's. A project with no milestone reaches no long outcome.
  const longOf = new Map();
  for (const lo of longOutcomes) {
    for (const c of lo.constraints ?? []) {
      if (!longOf.has(c.id)) {
        longOf.set(c.id, lo.id);
      }
    }
  }
  const projectLong = new Map();
  for (const m of milestones) {
    const lo = longOf.get(m.id);
    if (lo && !projectLong.has(m.parent)) {
      projectLong.set(m.parent, lo);
    }
  }

  const items = rawItems.map((e) => ({
    id: e.id,
    title: e.title,
    kind: e.kind,
    state: e.state,
    project: e.parent,
    needs: e.needs ?? [],
    claimed_by: e.claimed_by,
    reason: e.reason,
    decider: e.decider,
    waiting_on: e.waiting_on,
    created: e.created,
    estimate_tokens: e.estimate_tokens,
    release: e.kind === "work" && e.release ? String(e.release) : undefined,
    path: e.path,
    ready: ready.has(e.id),
    blocked: blocked.has(e.id),
    open_needs: openNeeds(e),
    needed_by: neededBy.get(e.id) ?? [],
    milestones: e.constraint_of ?? [],
    text: proposalText(e, bodies),
  }));
  const itemsOf = (projectIds) =>
    items.filter((it) => projectIds.has(it.project));

  const milestone = (m) => {
    const constraints = (m.constraints ?? []).map((c) => ({
      id: c.id,
      clause: c.clause ?? "c?",
    }));
    const itemConstraints = constraints.filter(
      (c) => byId.get(c.id)?.entity === ITEM,
    );
    const done = itemConstraints.filter(
      (c) => byId.get(c.id)?.state === "done",
    ).length;
    const results = (m.check_results ?? []).map((r) =>
      typeof r === "string"
        ? r
        : `${r.result} ${r.date} ${r.role}: ${r.evidence}`,
    );
    const passed = /^(pass|answered) /.test(results.at(-1) ?? "");
    const doneWhen = (m.done_when ?? []).map((c) => ({
      clause: c.id,
      text: c.text,
    }));
    const check = m.check ? `${m.check.kind} ${m.check.target}` : undefined;
    return {
      id: m.id,
      title: m.title,
      kind: "milestone",
      learning: m.check?.kind === "study",
      state: m.state,
      project: m.parent,
      long_outcome: longOf.get(m.id),
      outcome: m.outcome,
      done_when: doneWhen,
      constraints,
      contributions: (m.contributions ?? []).map((c) => ({
        id: c.id,
        value: Number(c.value),
        confidence: Number(c.confidence),
      })),
      check,
      check_results: results,
      appetite_tokens: m.appetite_tokens ?? undefined,
      path: m.path,
      progress: { done, total: itemConstraints.length },
      check_due:
        itemConstraints.length > 0 &&
        done === itemConstraints.length &&
        !passed,
      text: proposalText(m, bodies),
      to_shape: [
        !m.outcome && "outcome",
        !doneWhen.length && "clauses",
        !check && "check",
        constraints.some((c) => c.clause === "c?") && "links",
      ].filter(Boolean),
    };
  };

  const container = (e, members, longOutcome) => ({
    id: e.id,
    title: e.title,
    state: e.state,
    owner: e.owner,
    plan: e.plan,
    long_outcome: longOutcome,
    reason: e.reason,
    path: e.path,
    progress: progressOf(members, ready, blocked),
  });

  // project_deps: `from` waits on `to` through `count` open needs.
  const edges = new Map();
  for (const it of items) {
    if (!isOpen(it)) {
      continue;
    }
    for (const n of it.needs) {
      const t = byId.get(n);
      if (!t || t.entity !== ITEM || !isOpen(t) || t.parent === it.project) {
        continue;
      }
      const key = `${it.project}→${t.parent}`;
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }

  return {
    api_version: API_VERSION,
    source: `hitld work query --json, the proposals with their bodies (human-in-the-lead ${version.version})`,
    hitld_version: version.version,
    branch: branch ?? git(root, ["rev-parse", "--abbrev-ref", "HEAD"]),
    commit: commit ?? git(root, ["rev-parse", "--short", "HEAD"]),
    generated: new Date().toISOString(),
    items,
    projects: projects.map((p) =>
      container(p, itemsOf(new Set([p.id])), projectLong.get(p.id)),
    ),
    long_outcomes: longOutcomes.map((lo) =>
      container(
        lo,
        itemsOf(
          new Set(
            projects
              .filter((p) => projectLong.get(p.id) === lo.id)
              .map((p) => p.id),
          ),
        ),
        undefined,
      ),
    ),
    milestones: milestones.map(milestone),
    project_deps: [...edges].map(([k, count]) => {
      const [from, to] = k.split("→");
      return { from, to, count };
    }),
    elsewhere,
    history,
    live,
    problems: problems ?? [],
    ...(pending?.length ? { pending } : {}),
  };
}

/**
 * The rail's count and the palette's list, from every entity without
 * bodies (readEntities): the decisions the owner can answer now (open, and
 * every need done, as the board counts them), and each item's ID, title
 * and kind. One hitld read, none of the live run's.
 */
export function countOf(all) {
  const byId = new Map(all.entities.map((e) => [e.id, e]));
  const items = all.entities.filter((e) => e.entity === ITEM).sort(byNumber);
  return {
    api_version: API_VERSION,
    owner_decisions: items.filter(
      (e) =>
        e.kind === "decision" &&
        e.decider === "owner" &&
        isOpen(e) &&
        (e.needs ?? []).every((n) => byId.get(n)?.state === "done"),
    ).length,
    items: items.map((e) => ({ id: e.id, title: e.title, kind: e.kind })),
  };
}

/** Values from before CS-521 (`status:`), in human-in-the-lead's names. */
const LEGACY_STATES = {
  Proposed: "proposed",
  Planned: "planned",
  "In progress": "in-progress",
  Done: "done",
  Dropped: "dropped",
};

/**
 * The state history of the items on this branch, from git: one event per
 * commit that set an item's state (its creation included), oldest first,
 * with the commit's date. `status:` lines from before CS-521 are read in
 * human-in-the-lead's names; a `state:` line that only renames the item's
 * last state (the migration) isn't an event. Read in one `git log`;
 * uncommitted changes aren't history yet (the snapshot has the current
 * state).
 */
export function stateHistory(root) {
  const log = git(root, [
    "log",
    "-p",
    "-U0",
    "--reverse",
    "--no-merges",
    "--format=@@commit %cI",
    "--",
    "work/items",
    // Before CS-835 the tracker was here; its history still is.
    "packages/next/work/items",
  ]);
  const events = [];
  const last = new Map();
  let at;
  let id;
  for (const line of (log ?? "").split("\n")) {
    if (line.startsWith("@@commit ")) {
      at = line.slice(9).trim();
    } else if (line.startsWith("diff --git ")) {
      id = /\/(CS-[1-9]\d*)[-.][^/]*$/.exec(line)?.[1];
    } else if (id && at && line.startsWith("+status: ")) {
      const state = LEGACY_STATES[line.slice(9).trim()];
      if (state) {
        events.push({ id, at, state });
        last.set(id, state);
      }
    } else if (id && at && line.startsWith("+state: ")) {
      const state = line.slice(8).trim();
      if (last.get(id) !== state) {
        events.push({ id, at, state });
        last.set(id, state);
      }
    }
  }
  return events;
}

/**
 * Every open claim, from `hitld work claims`, this branch's included, each
 * with its claim commit's date. A claim hitld finds no claim commit for
 * sits on a branch whose copy of the item main has already moved past (a
 * branch merged long ago still showing the item in progress, as CS-174's
 * did): it is stale, and kept apart, never shown as work in progress.
 * Other machines' claims arrive only with a bundle.
 */
export async function readClaims(root) {
  const answer = await hitld(root, ["work", "claims"]);
  if (!answer.ok) {
    throw new HitldUnavailable("failed", "hitld work claims failed");
  }
  const here = git(root, ["rev-parse", "--abbrev-ref", "HEAD"]);
  const inWorktree = new Set(
    (git(root, ["worktree", "list", "--porcelain"]) ?? "")
      .split("\n")
      .filter((l) => l.startsWith("branch refs/heads/"))
      .map((l) => l.slice("branch refs/heads/".length)),
  );
  const list = [];
  const stale = [];
  for (const c of answer.claims ?? []) {
    for (const claim of c.claims ?? []) {
      const where = claim.branch ?? claim.ref;
      const entry = {
        id: c.id,
        claimed_by: claim.claimant === "?" ? undefined : claim.claimant,
        where,
        worktree: inWorktree.has(claim.branch),
        here: claim.branch === here,
        at: claim.at ?? undefined,
        source: claim.source,
      };
      (claim.commit ? list : stale).push(entry);
    }
  }
  return { list, stale };
}

/** Claims on other branches, without this branch's or the stale ones. */
export const elsewhereOf = (claims) =>
  claims.list
    .filter((c) => !c.here)
    .map(({ id, claimed_by, where, worktree, at }) => ({
      id,
      claimed_by,
      where,
      worktree,
      at,
    }));

/**
 * Work in flight elsewhere: claims on other branches (and in fetched
 * bundles) that this branch's copy hasn't merged, from `hitld work claims`.
 * One entry per claim; stale claims (readClaims) aren't work in flight.
 */
export async function claimsElsewhere(root) {
  return elsewhereOf(await readClaims(root));
}

// ------------------------------------------------------------ the live run

/** The ledger is read whole the first time: the merge queue is a fold over all of it. */
const LEDGER_ALL = "1000000";

/**
 * After that, only its latest events are asked for: when the event before
 * the new ones is the last one read, only the new ones are folded in;
 * otherwise (more new events than this, or a ledger that changed under
 * them) it is read whole again.
 */
export const LEDGER_RECENT = 64;

/** The main branch, from the project's hitld policy; "main" without one. */
export function mainBranchOf(root) {
  return policyOf(root)?.merge?.main_branch || "main";
}

/** The project's hitld policy, or undefined. */
function policyOf(root) {
  try {
    const policy = JSON.parse(
      readFileSync(join(root, ".human-in-the-lead", "policy.json"), "utf8"),
    );
    return policy && typeof policy === "object" ? policy : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The project's private store, where hitld keeps its ledger and run
 * state, as hitld finds it (its library's privateStorePath), or undefined.
 */
async function storeOf(root) {
  const id = policyOf(root)?.project?.id;
  if (typeof id !== "string") {
    return undefined;
  }
  try {
    const lib = await import(
      pathToFileURL(join(dirname(hitldPath()), "..", "lib", "index.mjs")).href
    );
    return lib.privateStorePath(id);
  } catch {
    return undefined;
  }
}

/**
 * Fold ledger events into `queue`, the merge queue's view of each item:
 * "queued" after a passing `verified` (the orchestrator queued its
 * branch), "rejected" after a failing one, gone after `merged` or
 * `reverted` (as hitld's own run state folds them).
 */
export function foldQueue(queue, events) {
  for (const e of events ?? []) {
    if (!e?.item) {
      continue;
    }
    if (e.event === "verified") {
      queue.set(e.item, {
        state: e.result === "pass" ? "queued" : "rejected",
        at: e.at,
      });
    } else if (e.event === "merged" || e.event === "reverted") {
      queue.delete(e.item);
    }
  }
  return queue;
}

/** The merge queue folded from all of the ledger's events (foldQueue). */
export const queueOf = (events) => foldQueue(new Map(), events);

/** Commits that close an item (`+state: done`) in `range`, newest first. */
function closesIn(root, range) {
  const log = git(root, [
    "log",
    ...range,
    "--no-merges",
    "-p",
    "-U0",
    "--format=@@commit %H %cI",
    "--",
    "work/items",
    // Before CS-835 the tracker was here; its history still is.
    "packages/next/work/items",
  ]);
  const out = [];
  let commit;
  let at;
  let id;
  for (const line of (log ?? "").split("\n")) {
    if (line.startsWith("@@commit ")) {
      [commit, at] = line.slice(9).trim().split(" ");
    } else if (line.startsWith("diff --git ")) {
      id = /\/(CS-[1-9]\d*)[-.][^/]*$/.exec(line)?.[1];
    } else if (id && commit && line.trim() === "+state: done") {
      out.push({ id, commit, at });
    }
  }
  return out;
}

/** Each item's state on `ref`, from its file's `state:` line, in one read. */
function statesOn(root, ref) {
  const out = new Map();
  const lines = git(root, [
    "grep",
    "-e",
    "^state: ",
    ref,
    "--",
    "work/items",
    // Before CS-835 the tracker was here; its history still is.
    "packages/next/work/items",
  ]);
  for (const line of (lines ?? "").split("\n")) {
    const m = /\/(CS-[1-9]\d*)[-.][^/:]*:state: (\S+)/.exec(line);
    if (m) {
      out.set(m[1], m[2]);
    }
  }
  return out;
}

/** The ref that keeps a held batch while it waits for the owner (hitld's). */
const HELD_REF = "refs/hitld/merge-held";

/** The branches hitld's executors and merge checks work on. */
const HITLD_BRANCHES = "refs/heads/hitld/";

/** A branch an orchestrator checks a finished branch on by hand. */
const isCheckBranch = (b) => /-merge-check$/.test(b);

/**
 * Items done on an hitld/* branch and not on the main branch, each with
 * the branches that close it and where the merge queue has it: "held" (in
 * the batch hitld holds for the owner's yes), "checking" (on a merge-check
 * branch), "queued" or "rejected" (the ledger's fold, queueOf), or "none".
 * Read from git: the main branch's states, and the commits on hitld/*
 * branches that main doesn't have which set an item done. Only hitld/*
 * branches: executors and merge checks work there, and other branches
 * (sessions, backups, spikes) would make the scan grow with them. Main's
 * copy decides, so a branch merged by a rebase (its own commits never
 * reach main) drops out once main shows the item done.
 */
export function unmergedOf(root, main, queue = new Map()) {
  const mainRef = `refs/heads/${main}`;
  if (!git(root, ["rev-parse", "--verify", "-q", mainRef])) {
    throw new Error(`no branch ${main}`);
  }
  const onMain = statesOn(root, mainRef);
  const pending = closesIn(root, [
    `--glob=${HITLD_BRANCHES}*`,
    "--not",
    mainRef,
  ]).filter((c) => onMain.get(c.id) !== "done");
  const held = git(root, ["rev-parse", "--verify", "-q", HELD_REF])
    ? new Set(closesIn(root, [`${mainRef}..${HELD_REF}`]).map((c) => c.id))
    : new Set();
  const byId = new Map();
  for (const c of pending) {
    const branches = (
      git(root, [
        "for-each-ref",
        "--contains",
        c.commit,
        "--format=%(refname:short)",
        HITLD_BRANCHES,
      ]) ?? ""
    )
      .split("\n")
      .filter(Boolean);
    const known = byId.get(c.id);
    if (known) {
      known.branches = [...new Set([...known.branches, ...branches])];
      continue;
    }
    byId.set(c.id, { id: c.id, closed_at: c.at, branches });
  }
  return [...byId.values()]
    .filter((u) => u.branches.length)
    .map((u) => {
      const check = u.branches.find(isCheckBranch);
      const q = queue.get(u.id);
      return {
        ...u,
        branches: u.branches.filter((b) => !isCheckBranch(b)),
        queue: held.has(u.id)
          ? "held"
          : check
            ? "checking"
            : (q?.state ?? "none"),
        check_branch: check,
      };
    })
    .sort(byNumber);
}

/** What the page may be told when a live source can't be read. */
export const LIVE_UNREAD = {
  run: "hitld run status couldn't be read",
  ledger: "hitld's ledger couldn't be read",
  empty:
    "hitld's ledger is empty or wasn't found, so nothing it would record can be seen",
  claims: "hitld work claims couldn't be read",
  git: "the branches couldn't be compared with the main branch",
  reading:
    "still being read for the first time since the dev server started; the board fills this in when it's in",
};

const withStore = (store, args) => (store ? [...args, "--store", store] : args);

/** One live source, with when it was read, or why it couldn't be. */
async function attempt(source, why, read) {
  const at = () => new Date().toISOString();
  try {
    return { source, read_at: at(), ok: true, ...(await read()) };
  } catch (e) {
    if (e instanceof HitldUnavailable && e.reason !== "failed") {
      throw e; // hitld missing or in another version: the board says so
    }
    return { source, read_at: at(), ok: false, why };
  }
}

/**
 * The run and the orchestrator holding its lease (`hitld run status`).
 * The host names hitld records are left out: the page names sessions, not
 * machines.
 */
export const liveRun = (root, store) =>
  attempt("hitld run status", LIVE_UNREAD.run, async () => {
    const a = await hitld(root, withStore(store, ["run", "status"]));
    if (!a.ok && a.error !== "no-run") {
      throw new Error(a.error);
    }
    const lease = a.lease
      ? {
          session: a.lease.session,
          renewed_at: a.lease.renewed_at,
          expired: Boolean(a.lease.expired),
          free: Boolean(a.lease.free),
          released_at: a.lease.released?.at ?? undefined,
        }
      : undefined;
    return {
      run:
        a.ok && a.run
          ? { id: a.run.id, started_at: a.run.started_at }
          : undefined,
      lease,
      in_flight: a.ok ? Number(a.in_flight ?? 0) : 0,
      waiting_to_merge: a.ok ? Number(a.waiting_to_merge ?? 0) : 0,
    };
  });

/**
 * The ledger's events folded into the merge queue (foldQueue): the whole
 * ledger without `prev`; with `prev` (an earlier answer's `fold`), only
 * the events after it, when the ledger still holds them as read
 * (LEDGER_RECENT). `read` is how many events this read folded in.
 */
async function ledgerFold(root, store, prev) {
  if (prev?.total) {
    const tail = await hitld(
      root,
      withStore(store, ["ledger", "tail", "--limit", String(LEDGER_RECENT)]),
    );
    if (!tail.ok) {
      throw new Error("ledger");
    }
    const events = tail.events ?? [];
    const total = Number(tail.total ?? 0);
    const fresh = total - prev.total;
    if (
      fresh >= 0 &&
      fresh < events.length &&
      events[events.length - fresh - 1]?.id === prev.lastId
    ) {
      return {
        total,
        lastId: events.at(-1)?.id,
        queue: foldQueue(
          new Map(prev.queue),
          events.slice(events.length - fresh),
        ),
        read: fresh,
      };
    }
  }
  const tail = await hitld(
    root,
    withStore(store, ["ledger", "tail", "--limit", LEDGER_ALL]),
  );
  if (!tail.ok) {
    throw new Error("ledger");
  }
  const events = tail.events ?? [];
  return {
    total: Number(tail.total ?? events.length),
    lastId: events.at(-1)?.id,
    queue: queueOf(events),
    read: events.length,
  };
}

/**
 * The dispatches in flight (`hitld ledger in-flight`) and the merge queue
 * folded from the ledger (`hitld ledger tail`, ledgerFold): `source` for
 * the page, `fold` to fold the next read onto, undefined when the ledger
 * couldn't be read.
 */
export async function liveLedger(root, store, prev) {
  let fold;
  const source = await attempt(
    "hitld ledger in-flight and ledger tail",
    LIVE_UNREAD.ledger,
    async () => {
      const [flight, folded] = await Promise.all([
        hitld(root, withStore(store, ["ledger", "in-flight"])),
        ledgerFold(root, store, prev),
      ]);
      if (!flight.ok) {
        throw new Error("ledger");
      }
      fold = folded;
      return {
        events: folded.total,
        problems: (flight.ledger_problems ?? []).length,
        dispatches: (flight.in_flight ?? []).map((d) => ({
          dispatch: d.dispatch,
          item: d.item,
          role: d.role ?? undefined,
          tier: d.tier ?? undefined,
          mode: d.mode ?? undefined,
          branch: d.branch ?? undefined,
          started_at: d.started_at,
        })),
      };
    },
  );
  if (source.ok && source.events === 0) {
    Object.assign(source, { ok: false, why: LIVE_UNREAD.empty });
  }
  return { source, fold };
}

/** The claims (`hitld work claims`, readClaims). */
export const liveClaims = (root) =>
  attempt("hitld work claims", LIVE_UNREAD.claims, () => readClaims(root));

/** Items done on an hitld/* branch and not merged (git, unmergedOf). */
export const liveUnmerged = (root, main, queue) =>
  attempt(
    `git: hitld/* branches against ${main}`,
    LIVE_UNREAD.git,
    async () => ({
      list: unmergedOf(root, main, queue),
    }),
  );

/**
 * The live run, as hitld and git show it now, each source with when it was
 * read, or why it couldn't be: the run and the orchestrator holding its
 * lease (`hitld run status`), the dispatches in flight
 * (`hitld ledger in-flight`), the merge queue folded from the ledger
 * (`hitld ledger tail`), the claims (`hitld work claims`), and the items
 * done on an hitld/* branch and not merged (git). Reads only, all of it,
 * every time (boardReader keeps them instead). `store` points hitld at
 * another private store (tests point it at a missing one).
 */
export async function readLive(root, { store } = {}) {
  const main = mainBranchOf(root);
  // The three hitld reads run at once; git's needs the ledger's events.
  const [run, ledger, claims] = await Promise.all([
    liveRun(root, store),
    liveLedger(root, store),
    liveClaims(root),
  ]);
  const unmerged = await liveUnmerged(root, main, ledger.fold?.queue);
  return {
    read_at: new Date().toISOString(),
    main_branch: main,
    run,
    ledger: ledger.source,
    claims,
    unmerged,
  };
}

// ------------------------------------------------------------ kept reads

/**
 * One read kept until what it reads changes. `key()` says so cheaply (a
 * commit, a file's size and time, the tips of some branches); `read()`
 * reads. `get()` answers at once with the kept value while its key holds
 * and it is no older than `maxAgeMs`. When the key changes or the value
 * ages, `get()` still answers with the kept value (`fresh: false`) while
 * one read runs behind it, unless `wait` is set; with no value yet, it
 * answers with the read's promise. `onChange` hears of each read whose
 * answer differs from the one kept before it (`same` decides).
 */
export function keptRead({
  key,
  read,
  maxAgeMs = Infinity,
  wait = false,
  same = (a, b) => JSON.stringify(a) === JSON.stringify(b),
  onChange,
}) {
  let kept; // { key, value, at }
  let running; // { key, promise }
  const start = (k) => {
    if (running?.key === k) {
      return running.promise;
    }
    // A read behind a kept value starts after the answer goes out: some
    // reads run git synchronously (unmergedOf, stateHistory).
    const promise = new Promise((r) => setTimeout(r, 0))
      .then(() => read(kept?.value))
      .then((value) => {
        const changed = !kept || !same(kept.value, value);
        kept = { key: k, value, at: Date.now() };
        if (running?.promise === promise) {
          running = undefined;
        }
        if (changed) {
          onChange?.();
        }
        return value;
      })
      .catch((e) => {
        if (running?.promise === promise) {
          running = undefined;
        }
        throw e;
      });
    // A failed read in the background is tried again on the next get().
    promise.catch(() => {});
    running = { key: k, promise };
    return promise;
  };
  return {
    get() {
      const k = key();
      if (kept && kept.key === k && Date.now() - kept.at <= maxAgeMs) {
        return { value: kept.value, fresh: true };
      }
      const promise = start(k);
      if (kept && !wait) {
        return { value: kept.value, fresh: false };
      }
      return { promise };
    },
  };
}

/** A file's size and modification time, as a key: "" when it's missing. */
function fileKey(path) {
  try {
    const s = statSync(path);
    return `${s.size}:${s.mtimeMs}`;
  } catch {
    return "";
  }
}

/** How long the run's status is kept at most: its lease ages by the clock. */
const RUN_MS = 30_000;

/** How long a git read behind a key is shared (boardReader). */
const KEY_MS = 250;

/** How long a first request waits for the slow sources before answering. */
export const FIRST_WAIT_MS = 1500;

/**
 * The board's reads, each kept until what it reads changes (keptRead), for
 * the dev server: the tracker's entities and ready list and hitld's
 * version (per commit and change to an item file), the state history (per
 * commit), the check (per commit and change to any file the dev server
 * watches), the run's status (per change to the ledger or the run state,
 * and every 30 s for its lease), the ledger (per change to it, read
 * incrementally, ledgerFold), the claims (per change to any ref or
 * worktree), and the unmerged items (per change to an hitld/* branch, the
 * main branch, the held batch or the merge queue).
 *
 *   query({ waitMs })  the snapshot. Warm, every read is kept and no hitld
 *                      process runs. A read whose key changed is answered
 *                      from what was kept while it reads again behind it,
 *                      except the tracker's own, which is waited for. On the
 *                      first request, the slow sources (the check, the run,
 *                      the ledger, the claims, the unmerged items) are waited
 *                      for at most `waitMs` (later requests don't wait for
 *                      them); any still reading then are named
 *                      in the snapshot's `pending`, and their place says so.
 *   count()            the rail's count and the palette's list (countOf):
 *                      the entities' read only.
 *   changed(file)      a file the dev server watches changed.
 *
 * `onChange` hears when a read behind an answer brings something new, so
 * the dev server can tell open pages to read again.
 */
export function boardReader(root, { store: storeOption, onChange } = {}) {
  const main = mainBranchOf(root);
  let workGeneration = 0;
  let treeGeneration = 0;
  let store = storeOption;
  const storeReady = storeOption
    ? Promise.resolve()
    : storeOf(root).then((s) => {
        store = s;
      });
  // The keys' git reads, shared by every read of one request (and of any
  // other within KEY_MS), so a warm request runs each git command once.
  const keyReads = new Map();
  const gitKey = (args) => {
    const k = args.join("\0");
    const hit = keyReads.get(k);
    if (hit && Date.now() - hit.at < KEY_MS) {
      return hit.value;
    }
    const value = git(root, args) ?? "";
    keyReads.set(k, { value, at: Date.now() });
    return value;
  };
  /** The commit checked out, then the branch's name. */
  const where = () => gitKey(["rev-parse", "HEAD", "--abbrev-ref", "HEAD"]);
  const head = () => where().split("\n")[0] ?? "";
  const workKey = () => `${head()} ${workGeneration}`;
  const ledgerKey = () =>
    store ? fileKey(join(store, "ledger.jsonl")) : String(Math.random());
  const changed = () => onChange?.();
  let answered = false;

  const entities = keptRead({
    key: workKey,
    read: () => readEntities(root),
    wait: true,
  });
  const proposals = keptRead({
    key: workKey,
    read: () => readProposals(root),
    wait: true,
  });
  const version = keptRead({
    key: head,
    read: () => readVersion(root),
    wait: true,
  });
  const history = keptRead({
    key: head,
    read: async () => stateHistory(root),
    wait: true,
  });
  const check = keptRead({
    key: () => `${head()} ${treeGeneration}`,
    read: () => readCheck(root),
    onChange: changed,
  });
  /** Live sources compare without when they were read. */
  const sameSource = (a, b) =>
    JSON.stringify({ ...a, read_at: 0 }) ===
    JSON.stringify({ ...b, read_at: 0 });
  const run = keptRead({
    key: () =>
      `${ledgerKey()} ${store ? fileKey(join(store, "run-state.json")) : ""}`,
    read: async () => {
      await storeReady;
      return liveRun(root, store);
    },
    maxAgeMs: RUN_MS,
    same: sameSource,
    onChange: changed,
  });
  const ledger = keptRead({
    key: ledgerKey,
    read: async (prev) => {
      await storeReady;
      return liveLedger(root, store, prev?.fold);
    },
    same: (a, b) => sameSource(a.source, b.source),
    onChange: changed,
  });
  // Every ref (claims are read from local, remote-tracking and bundle refs)
  // and every worktree's branch.
  const refsKey = () =>
    `${gitKey(["for-each-ref", "--format=%(objectname) %(refname)"])}\n${gitKey(["worktree", "list", "--porcelain"])}`;
  const claims = keptRead({
    key: refsKey,
    read: () => liveClaims(root),
    same: sameSource,
    onChange: changed,
  });
  // hitld's own ready list, only when the claims couldn't be read.
  const hitldReady = keptRead({
    key: () => `${workKey()}\n${refsKey()}`,
    read: () => readReady(root),
    wait: true,
  });
  const unmerged = keptRead({
    key: () =>
      `${gitKey(["for-each-ref", "--format=%(objectname) %(refname)", HITLD_BRANCHES, `refs/heads/${main}`, HELD_REF])}\n${ledgerKey()}`,
    read: async () => {
      // The merge queue comes from the ledger's fold.
      const l = ledger.get();
      const folded = l.value ?? (await l.promise);
      return liveUnmerged(root, main, folded.fold?.queue);
    },
    same: sameSource,
    onChange: changed,
  });

  /**
   * A live source kept while its key holds is current as of the key's
   * check: its `read_at` says so (the ledger's read keeps its source in
   * `source`).
   */
  const confirmed = (v) => {
    const now = new Date().toISOString();
    if (v && typeof v.source === "object") {
      return { ...v, source: { ...v.source, read_at: now } };
    }
    return v && typeof v.read_at === "string" ? { ...v, read_at: now } : v;
  };

  /** A kept read's value now, or after at most `until` (ms since epoch), or `fallback`. */
  const valueBy = async (got, until, fallback) => {
    if ("value" in got) {
      return got.fresh ? confirmed(got.value) : got.value;
    }
    const left = until - Date.now();
    const timeout = Symbol("timeout");
    const value = await Promise.race([
      got.promise,
      new Promise((r) => setTimeout(() => r(timeout), Math.max(0, left))),
    ]);
    return value === timeout ? fallback : value;
  };

  return {
    changed(file) {
      treeGeneration++;
      if (/\/work\/.*\.md$/.test(file.split("\\").join("/"))) {
        workGeneration++;
      }
    },
    async count() {
      const e = entities.get();
      return countOf(e.value ?? (await e.promise));
    },
    async query({ waitMs = FIRST_WAIT_MS } = {}) {
      await storeReady;
      // Only the first request waits for the slow sources; a page reading
      // again while they still read hears at once that they still are.
      const until = Date.now() + (answered ? 0 : waitMs);
      answered = true;
      // The slow sources start first, so they read while the tracker does.
      const slow = {
        check: check.get(),
        run: run.get(),
        ledger: ledger.get(),
        claims: claims.get(),
      };
      const fast = [entities, proposals, version, history].map((r) => {
        const got = r.get();
        return got.value ?? got.promise;
      });
      const [all, proposalsAnswer, versionAnswer, events] =
        await Promise.all(fast);
      const pending = [];
      const reading = (source) => {
        pending.push(source);
        return {
          source,
          read_at: new Date().toISOString(),
          ok: false,
          why: LIVE_UNREAD.reading,
        };
      };
      const NONE = Symbol("none");
      const [problems, runSource, ledgerRead, claimsSource] = await Promise.all(
        [
          valueBy(slow.check, until, NONE),
          valueBy(slow.run, until, NONE),
          valueBy(slow.ledger, until, NONE),
          valueBy(slow.claims, until, NONE),
        ],
      );
      const unmergedSource =
        ledgerRead === NONE ? NONE : await valueBy(unmerged.get(), until, NONE);
      if (problems === NONE) {
        pending.push("hitld work check");
      }
      const live = {
        read_at: new Date().toISOString(),
        main_branch: main,
        run: runSource === NONE ? reading("hitld run status") : runSource,
        ledger:
          ledgerRead === NONE
            ? reading("hitld ledger in-flight and ledger tail")
            : ledgerRead.source,
        claims:
          claimsSource === NONE ? reading("hitld work claims") : claimsSource,
        unmerged:
          unmergedSource === NONE
            ? reading(`git: hitld/* branches against ${main}`)
            : unmergedSource,
      };
      // Ready: planned, every need done, claimed on no branch. While the
      // claims are still being read, no claim takes an item out yet.
      let ready;
      if (claimsSource === NONE) {
        ready = readyOf(all, new Set());
      } else if (claimsSource.ok) {
        ready = readyOf(all, claimedOf(claimsSource));
      } else {
        const got = hitldReady.get();
        const answer = got.value ?? (await got.promise);
        ready = new Set(answer.entities.map((e) => e.id));
      }
      return boardOf(
        root,
        {
          all,
          proposals: proposalsAnswer,
          ready,
          problems: problems === NONE ? [] : problems,
          version: versionAnswer,
        },
        {
          elsewhere:
            claimsSource !== NONE && claimsSource.ok
              ? elsewhereOf(claimsSource)
              : [],
          history: events,
          live,
          pending,
          branch: where().split("\n")[1],
          commit: gitKey(["rev-parse", "--short", "HEAD"]),
        },
      );
    },
  };
}

/**
 * Full-text search over every item: its record and its text alike, plus
 * its project's title. Every word must appear, in any case. Each match says
 * where it was found, with a short snippet around the first word. At most
 * `limit` matches, best first: a title match before a metadata match before
 * a text-only one.
 */
export async function findItems(root, q, limit = 200) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 8);
  if (!words.length) {
    return { api_version: API_VERSION, q, matches: [] };
  }
  const answer = checkVersion(
    await hitld(root, ["work", "query", "--bodies", "--json"]),
  );
  const byId = new Map(answer.entities.map((e) => [e.id, e]));
  const skip = new Set(["body", "version", "entity", "path"]);
  const matches = [];
  for (const e of [...answer.entities].sort(byNumber)) {
    if (e.entity !== ITEM) {
      continue;
    }
    const project = byId.get(e.parent)?.title ?? "";
    const title = `${e.id} ${e.title}`.toLowerCase();
    const meta = Object.entries(e)
      .filter(([k, v]) => !skip.has(k) && v !== null && v !== undefined)
      .map(
        ([k, v]) =>
          `${k}: ${Array.isArray(v) ? v.map((x) => (typeof x === "object" ? JSON.stringify(x) : x)).join(", ") : v}`,
      )
      .join("\n");
    const body = e.body ?? "";
    const all = `${title}\n${project}\n${meta}\n${body}`.toLowerCase();
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
    const source = where === "text" ? body : `${meta}\n${body}`;
    const at = source.toLowerCase().indexOf(words[0]);
    const snippet =
      where === "title" || at < 0
        ? undefined
        : `${at > 40 ? "…" : ""}${source
            .slice(Math.max(0, at - 40), at + 80)
            .replace(/\s+/g, " ")
            .trim()}${at + 80 < source.length ? "…" : ""}`;
    matches.push({ id: e.id, where, snippet });
  }
  const rank = { title: 0, metadata: 1, text: 2 };
  matches.sort((a, b) => rank[a.where] - rank[b.where]);
  return { api_version: API_VERSION, q, matches: matches.slice(0, limit) };
}

/**
 * One item's text (its body, without the front matter), from
 * `hitld work show`, or undefined for an ID the tracker doesn't have. Only
 * IDs of the tracker's form are looked up, so a request can't name a file.
 */
export async function showItem(root, id) {
  if (!ID_PATTERN.test(id)) {
    return undefined;
  }
  const answer = await hitld(root, ["work", "show", id, "--json"]);
  if (!answer.ok || !answer.entity) {
    return undefined;
  }
  checkVersion(answer);
  return {
    api_version: API_VERSION,
    id,
    path: answer.entity.path,
    body: String(answer.entity.body ?? "").trim(),
  };
}

// ---------------------------------------------------------------------------
// What changed since a point (CS-747): the Since-you-last-looked view's read.
//
// Self-contained: it shares no state with boardReader, so the Flow view's
// reader (CS-752) and this one change apart. It reads git only, never
// hitld's store: the tracker's files in two trees (the point's and HEAD's),
// and the mainline commits between them. Every ref or date it is given is
// checked against a fixed form before it reaches git, and git runs with
// argument arrays, never through a shell.

/** The tracker's folders, repository-relative. */
const WORK_PATHS = [
  "work/items",
  "work/milestones",
  "work/projects",
  // Before CS-835 the tracker was here; its history still is.
  "packages/next/work/items",
  "packages/next/work/milestones",
  "packages/next/work/projects",
];

/** A commit as given in a URL: hex, 7 to 40 digits. */
export const COMMIT_FORM = /^[0-9a-f]{7,40}$/;

/** A date as given in a URL: a day, or a time with an optional zone. */
export const DATE_FORM =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?)?$/;

/** At most this many mainline commits are read between the point and HEAD. */
export const CHANGES_MAX_COMMITS = 1500;

/** How many points' reads are kept (per HEAD). */
const CHANGES_KEPT = 8;

/** The front-matter keys the view reads: the rest stay in the files. */
const CHANGE_KEYS = new Set([
  "id",
  "title",
  "kind",
  "state",
  "project",
  "needs",
  "constraints",
  "decider",
  "waiting_on",
  "answer",
  "answered_at",
  "answered_by",
  "rationale",
  "reason",
  "release",
  // Before CS-521 the tracker wrote `status:` in its own names.
  "status",
]);

/** Why a point can't be read: fixed words for the page. */
export const CHANGES_REFUSED = {
  form: "Give a commit (7 to 40 hex digits) or a date (YYYY-MM-DD)",
  commit: "No such commit in this repository",
  ancestor:
    "That commit isn't in this branch's history: pick one on the branch Dyno is served from",
  date: "No commit on this branch is that old",
};

/** Refused with fixed words (the reason's key in CHANGES_REFUSED). */
export class ChangesRefused extends Error {
  constructor(reason) {
    super(CHANGES_REFUSED[reason]);
    this.reason = reason;
  }
}

/**
 * Run git with an argument array (never a shell), optionally writing
 * `input` to it: its exit code and output.
 */
export function gitRun(root, args, input) {
  return new Promise((resolve) => {
    const child = spawn("git", args, {
      cwd: root,
      stdio: [input === undefined ? "ignore" : "pipe", "pipe", "ignore"],
    });
    const out = [];
    child.stdout.on("data", (d) => out.push(d));
    child.on("error", () => resolve({ code: -1, stdout: "" }));
    child.on("close", (code) =>
      resolve({ code, stdout: Buffer.concat(out).toString("utf8") }),
    );
    if (input !== undefined) {
      child.stdin.on("error", () => {});
      child.stdin.end(input);
    }
  });
}

/** A YAML scalar as the tracker writes one: plain, "double" or 'single' quoted. */
function scalarOf(raw) {
  const v = raw.trim();
  if (v.startsWith('"') && v.endsWith('"') && v.length >= 2) {
    try {
      return JSON.parse(v);
    } catch {
      return v.slice(1, -1);
    }
  }
  if (v.startsWith("'") && v.endsWith("'") && v.length >= 2) {
    return v.slice(1, -1).replaceAll("''", "'");
  }
  return v;
}

/** A flow list, `[a, b, "c, d"]`, split on the commas outside quotes. */
function flowListOf(raw) {
  const inner = raw.trim().slice(1, -1);
  const out = [];
  let cur = "";
  let quote = "";
  for (const ch of inner) {
    if (quote) {
      cur += ch;
      if (ch === quote) {
        quote = "";
      }
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map(scalarOf).filter((x) => x !== "");
}

/**
 * The front matter keys the view reads from one tracker file, and the
 * lead paragraph of its text (at most 400 characters). Top-level
 * `key: value` lines only: block lists (a milestone's done_when) are
 * skipped. Nothing read is executed or evaluated.
 */
export function frontMatterOf(text) {
  const lines = String(text).split("\n");
  if (lines[0]?.trim() !== "---") {
    return undefined;
  }
  const fm = {};
  let i = 1;
  for (; i < lines.length && lines[i].trim() !== "---"; i++) {
    const m = /^([a-z_]+):(.*)$/.exec(lines[i]);
    if (!m || !CHANGE_KEYS.has(m[1])) {
      continue;
    }
    const raw = m[2].trim();
    fm[m[1]] =
      raw.startsWith("[") && raw.endsWith("]")
        ? flowListOf(raw)
        : scalarOf(raw);
  }
  if (typeof fm.id !== "string" || !ID_PATTERN.test(fm.id)) {
    return undefined;
  }
  if (fm.status !== undefined) {
    fm.state ??= LEGACY_STATES[fm.status] ?? String(fm.status).toLowerCase();
    delete fm.status;
  }
  // The lead: the first paragraph of the text that isn't a heading.
  const body = lines.slice(i + 1).join("\n");
  const lead = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .find((p) => p && !p.startsWith("#"));
  const short = (p) => {
    const flat = p.replace(/\s+/g, " ").trim();
    return flat.length > 400 ? `${flat.slice(0, 399)}…` : flat;
  };
  if (lead) {
    fm.lead = short(lead);
  }
  if (fm.kind === "decision" && typeof fm.answer === "string") {
    // An answer of one letter names an option: its line, in words.
    const letter = /^[A-Z]$/.exec(fm.answer.trim())?.[0];
    const option =
      letter &&
      body
        .split("\n")
        .find((l) =>
          new RegExp(`^\\s*[-*]\\s+(\\*\\*)?${letter}[.):]`).test(l),
        );
    if (option) {
      fm.answer_option = short(
        option.replace(/^\s*[-*]\s+/, "").replaceAll("**", ""),
      );
    }
    // The text's Answer section, when it says more than its placeholder.
    const section = /^## Answer\s*\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(
      body,
    )?.[1];
    const said = section
      ?.split(/\n\s*\n/)
      .map((x) => x.trim())
      .find(Boolean);
    if (said && !/^Recorded in the front matter/.test(said)) {
      fm.answer_note = short(said);
    }
  }
  return fm;
}

/** What the view compares of a file: its keys in a fixed order, without its text. */
const fieldsKey = (fm) =>
  fm
    ? JSON.stringify(
        Object.keys(fm)
          // Read from the text, not the record: a text edit isn't a change.
          .filter((k) => !["lead", "answer_option", "answer_note"].includes(k))
          .sort()
          .map((k) => [k, fm[k]]),
      )
    : "";

/** `git ls-tree` of the tracker's folders at a commit: path → blob. */
async function treeOf(run, root, commit) {
  const { stdout } = await run(root, [
    "ls-tree",
    "-r",
    "-z",
    commit,
    "--",
    ...WORK_PATHS,
  ]);
  const out = new Map();
  for (const rec of stdout.split("\0")) {
    const m = /^\d+ blob ([0-9a-f]+)\t(.+\.md)$/.exec(rec);
    if (m) {
      out.set(m[2], m[1]);
    }
  }
  return out;
}

/** Many blobs' text in one `git cat-file --batch`: blob → text. */
async function blobsOf(run, root, blobs) {
  const out = new Map();
  if (!blobs.length) {
    return out;
  }
  const { stdout } = await run(
    root,
    ["cat-file", "--batch"],
    `${blobs.join("\n")}\n`,
  );
  const buf = Buffer.from(stdout, "utf8");
  let at = 0;
  while (at < buf.length) {
    const nl = buf.indexOf(10, at);
    if (nl < 0) {
      break;
    }
    const head = buf.subarray(at, nl).toString("utf8").split(" ");
    if (head[1] !== "blob") {
      at = nl + 1;
      continue;
    }
    const size = Number(head[2]);
    out.set(head[0], buf.subarray(nl + 1, nl + 1 + size).toString("utf8"));
    at = nl + 1 + size + 1;
  }
  return out;
}

const COMMIT_MARK = "\x1e@@commit ";
const FIELD = "\x1f";

/**
 * The mainline commits from `base` to `head` that change the tracker,
 * newest first: each with its message and, per tracker file, the
 * front-matter keys its diff sets (`+key:` lines). Merges are read
 * against their first parent, so a merged branch's change sits on its
 * merge commit.
 */
async function logOf(run, root, base, head) {
  const { stdout } = await run(root, [
    "log",
    "--first-parent",
    "--diff-merges=first-parent",
    `--max-count=${CHANGES_MAX_COMMITS + 1}`,
    "-p",
    "-U0",
    "--no-color",
    "--no-ext-diff",
    `--format=${COMMIT_MARK}%H${FIELD}%h${FIELD}%cI${FIELD}%P${FIELD}%B${FIELD}`,
    `${base}..${head}`,
    "--",
    ...WORK_PATHS,
  ]);
  const commits = [];
  for (const chunk of stdout.split(COMMIT_MARK).slice(1)) {
    const [sha, short, at, parents, message, rest] = chunk.split(FIELD);
    const files = new Map();
    let id;
    for (const line of (rest ?? "").split("\n")) {
      if (line.startsWith("diff --git ")) {
        id = /\/(CS-[1-9]\d*)[-.][^/]*$/.exec(line)?.[1];
        if (id && !files.has(id)) {
          files.set(id, new Set());
        }
      } else if (id && /^\+[a-z_]+:/.test(line) && !line.startsWith("+++")) {
        const key = line.slice(1, line.indexOf(":"));
        if (CHANGE_KEYS.has(key)) {
          files.get(id).add(key === "status" ? "state" : key);
        }
      }
    }
    const text = (message ?? "").trim();
    const nl = text.indexOf("\n");
    const subject = nl < 0 ? text : text.slice(0, nl);
    const bodyLines = nl < 0 ? [] : text.slice(nl + 1).split("\n");
    const trailers = {};
    const kept = [];
    for (const l of bodyLines) {
      const t =
        /^(Work-Item|Dispatch|Agent-Role|Agent-Model|Agent-Effort|Co-Authored-By):\s*(.*)$/.exec(
          l,
        );
      if (t) {
        trailers[t[1]] = t[2].trim();
      } else {
        kept.push(l);
      }
    }
    commits.push({
      sha,
      short,
      at,
      parents: parents.trim() ? parents.trim().split(" ").length : 0,
      subject,
      body: kept.join("\n").trim(),
      work_item: ID_PATTERN.test(trailers["Work-Item"] ?? "")
        ? trailers["Work-Item"]
        : undefined,
      files: [...files].map(([fid, keys]) => ({ id: fid, keys: [...keys] })),
    });
  }
  const truncated = commits.length > CHANGES_MAX_COMMITS;
  return { commits: commits.slice(0, CHANGES_MAX_COMMITS), truncated };
}

/**
 * How many commits from `base` to `head` carry each Work-Item trailer,
 * merged branches' commits included: the work behind each merge.
 */
async function workItemsOf(run, root, base, head) {
  // Read from the whole message: a trailer block followed by another
  // paragraph (Co-Authored-By) is no trailer block to git.
  const { stdout } = await run(root, [
    "log",
    `--max-count=${CHANGES_MAX_COMMITS * 4}`,
    "--format=%x1e%B",
    `${base}..${head}`,
  ]);
  const out = {};
  for (const message of stdout.split("\x1e")) {
    const ids = new Set(
      [...message.matchAll(/^Work-Item:[ \t]*(CS-[1-9]\d*)[ \t]*$/gm)].map(
        (m) => m[1],
      ),
    );
    for (const id of ids) {
      out[id] = (out[id] ?? 0) + 1;
    }
  }
  return out;
}

/** A commit's sha, short sha, date and subject. */
async function commitRefOf(run, root, commit) {
  const { stdout } = await run(root, [
    "show",
    "-s",
    `--format=%H${FIELD}%h${FIELD}%cI${FIELD}%s`,
    commit,
  ]);
  const [sha, short, at, subject] = stdout.trim().split(FIELD);
  return { sha, short, at, subject };
}

/**
 * The point as a commit on HEAD's history: a commit given (checked to be
 * an ancestor of HEAD), or the last mainline commit before a date.
 * Throws ChangesRefused with fixed words.
 */
export async function pointOf(run, root, head, point) {
  if (point.commit !== undefined) {
    const c = String(point.commit).toLowerCase();
    if (!COMMIT_FORM.test(c)) {
      throw new ChangesRefused("form");
    }
    const got = await run(root, [
      "rev-parse",
      "--verify",
      "--quiet",
      "--end-of-options",
      `${c}^{commit}`,
    ]);
    const sha = got.stdout.trim();
    if (got.code !== 0 || !/^[0-9a-f]{40,64}$/.test(sha)) {
      throw new ChangesRefused("commit");
    }
    const anc = await run(root, ["merge-base", "--is-ancestor", sha, head]);
    if (anc.code !== 0) {
      throw new ChangesRefused("ancestor");
    }
    return sha;
  }
  if (point.date !== undefined) {
    const d = String(point.date);
    if (!DATE_FORM.test(d) || Number.isNaN(Date.parse(d))) {
      throw new ChangesRefused("form");
    }
    // In one form git reads exactly: "2026-11-13 08:00:00 +0000". A day
    // alone is its midnight in UTC; the page sends its own midnight.
    const utc = new Date(Date.parse(d))
      .toISOString()
      .replace("T", " ")
      .replace(/\.\d+Z$/, " +0000");
    const got = await run(root, [
      "rev-list",
      "-1",
      "--first-parent",
      `--before=${utc}`,
      head,
    ]);
    const sha = got.stdout.trim();
    if (got.code !== 0 || !/^[0-9a-f]{40,64}$/.test(sha)) {
      throw new ChangesRefused("date");
    }
    return sha;
  }
  throw new ChangesRefused("form");
}

/**
 * What changed in the tracker from a point to HEAD, read from git:
 *
 *   base, head   the two commits, each with its date and subject
 *   base_files   how many tracker files the point had (0: it began after)
 *   entities     every tracker file whose fields differ between them, its
 *                front matter (the keys the view reads, and its text's
 *                lead) before and after; and every release item, both
 *                sides, so the view can tell each milestone's release
 *   commits      the mainline commits between them that change the
 *                tracker, newest first, with their messages and the keys
 *                each sets per file; `truncated` past CHANGES_MAX_COMMITS
 *   work_items   how many commits carry each Work-Item trailer, merged
 *                branches' included
 *
 * The diff itself is the view's (bench/suite/workChanges.ts). Ten git
 * processes, none of them hitld's.
 */
export async function readChanges(root, point, { run = gitRun } = {}) {
  const headGot = await run(root, ["rev-parse", "--verify", "HEAD"]);
  const head = headGot.stdout.trim();
  return changesAt(run, root, head, point);
}

async function changesAt(run, root, head, point) {
  const base = await pointOf(run, root, head, point);
  const [baseRef, headRef, before, after, log, workItems] = await Promise.all([
    commitRefOf(run, root, base),
    commitRefOf(run, root, head),
    treeOf(run, root, base),
    treeOf(run, root, head),
    logOf(run, root, base, head),
    workItemsOf(run, root, base, head),
  ]);
  const idOf = (path) => /\/(CS-[1-9]\d*)[-.][^/]*$/.exec(path)?.[1];
  // Every file by ID, both sides: a file renamed keeps its ID.
  const sides = new Map();
  for (const [side, tree] of [
    ["before", before],
    ["after", after],
  ]) {
    for (const [path, blob] of tree) {
      const id = idOf(path);
      if (id) {
        const e = sides.get(id) ?? { id };
        e[side] = { path, blob };
        sides.set(id, e);
      }
    }
  }
  const changed = [...sides.values()].filter(
    (e) => e.before?.blob !== e.after?.blob,
  );
  // Release items can't be told from a tree; every file at both sides is
  // one cat-file batch either way, and only the changed and the releases
  // go back to the page.
  const blobs = new Set();
  for (const e of sides.values()) {
    if (e.before) {
      blobs.add(e.before.blob);
    }
    if (e.after) {
      blobs.add(e.after.blob);
    }
  }
  const text = await blobsOf(run, root, [...blobs]);
  const fmOf = (side) =>
    side ? frontMatterOf(text.get(side.blob) ?? "") : undefined;
  const changedIds = new Set(changed.map((e) => e.id));
  const entities = [];
  for (const e of [...sides.values()].sort(byNumber)) {
    const b = fmOf(e.before);
    const a = fmOf(e.after);
    const isRelease = !!(b?.release || a?.release);
    // A file rewritten without a change to what the view reads (the move
    // onto human-in-the-lead's format) isn't a change.
    const differs = changedIds.has(e.id) && fieldsKey(b) !== fieldsKey(a);
    if (differs || isRelease) {
      entities.push({
        id: e.id,
        path: (e.after ?? e.before).path,
        ...(b ? { before: b } : {}),
        ...(a ? { after: a } : {}),
      });
    }
  }
  return {
    api_version: API_VERSION,
    point:
      point.commit !== undefined
        ? { commit: String(point.commit) }
        : { date: String(point.date) },
    base: baseRef,
    head: headRef,
    base_files: before.size,
    entities,
    commits: log.commits,
    work_items: workItems,
    truncated: log.truncated,
  };
}

/**
 * The dev server's reader for `/work-api/changes.json` (CS-747), within
 * CS-704's read budget: a point's read is kept while HEAD holds (the
 * last CHANGES_KEPT points), so a warm request runs one `git rev-parse`
 * and nothing else. Uncommitted changes aren't history yet.
 */
export function changesReader(root, { run = gitRun } = {}) {
  const kept = new Map(); // `${head} ${point}` → Promise
  let headAt = { value: "", at: 0 };
  const headOf = async () => {
    if (Date.now() - headAt.at < KEY_MS && headAt.value) {
      return headAt.value;
    }
    const got = await run(root, ["rev-parse", "--verify", "HEAD"]);
    headAt = { value: got.stdout.trim(), at: Date.now() };
    return headAt.value;
  };
  return {
    async read(point) {
      const head = await headOf();
      const k = `${head} ${point.commit !== undefined ? `c:${point.commit}` : `d:${point.date}`}`;
      let p = kept.get(k);
      if (!p) {
        p = changesAt(run, root, head, point);
        kept.set(k, p);
        // A refusal or failure isn't kept: the next request tries again.
        p.catch(() => kept.delete(k));
        while (kept.size > CHANGES_KEPT) {
          kept.delete(kept.keys().next().value);
        }
      } else {
        // Most recently used last.
        kept.delete(k);
        kept.set(k, p);
      }
      return p;
    },
  };
}

// ------------- How well the system and the owner work together (CS-752)
//
// The Flow view's read (`/work-api/flow.json`): hitld's ledger, as
// `hitld ledger tail` gives it, cut to the fields the view's measures
// need; the items' fields and the few lines of their text the measures
// read (a decision's recommendation and reversibility, a proposal's
// source); and the tracker's history with both of each commit's dates.
// The author date is when the work was written, the committer date when
// it landed on this branch: a branch replayed onto main keeps the first
// and takes a new second, so the two tell claimed and done from merged.
// It takes nothing from the URL. git and hitld run with argument arrays;
// nothing read is executed or evaluated.

/** At most this many commits of the tracker's history are read. */
export const FLOW_MAX_COMMITS = 4000;

/** How many reverts are read at most. */
const FLOW_MAX_REVERTS = 200;

/**
 * The hitld policy settings that set a band, with rc.1's defaults (its
 * schemas/policy/*.schema.json) for those the project's policy leaves
 * out. Each band says which it came from.
 */
export const FLOW_POLICY = {
  decisions_per_digest_max: ["attention", 10],
  interrupts_per_day_max: ["attention", 6],
  silence_max_hours: ["digests", 48],
  lease_expiry_seconds: ["run", 1800],
  rubber_stamp_seconds: ["trust", 60],
};

/** The ledger's fields the measures read; the rest (notes, text, hosts, sessions, briefs) stay in the ledger. */
const FLOW_EVENT_KEYS = [
  "event",
  "at",
  "run",
  "item",
  "decision",
  "dispatch",
  "tier",
  "model",
  "estimate_tokens",
  "tokens",
  "duration_ms",
  "result",
  "commit",
  "delivery",
  "via",
  "reason",
  "step",
];

/** The front-matter keys the Flow view reads from an item. */
const FLOW_KEYS = new Set([
  "id",
  "title",
  "kind",
  "state",
  "project",
  "created",
  "decider",
  "answer",
  "answered_at",
  "answered_by",
  "answered_via",
  "claimed_by",
  "estimate_tokens",
  "release",
  "status",
]);

/** Why a source couldn't be read: fixed words for the page. */
export const FLOW_UNREAD = {
  ledger: "hitld's ledger couldn't be read",
  empty: "hitld's ledger is empty or wasn't found",
  git: "the tracker's history couldn't be read",
};

/** One ledger event cut to FLOW_EVENT_KEYS, its values checked for type. */
export function flowEventOf(e) {
  if (!e || typeof e !== "object" || typeof e.event !== "string") {
    return undefined;
  }
  const out = {};
  for (const k of FLOW_EVENT_KEYS) {
    const v = e[k];
    if (typeof v === "string") {
      out[k] = v.slice(0, 80);
    } else if (typeof v === "number" && Number.isFinite(v)) {
      out[k] = v;
    }
  }
  if (e.event === "run-started" && Number.isFinite(e.scope?.max_executors)) {
    out.max_executors = e.scope.max_executors;
  }
  return typeof out.at === "string" ? out : undefined;
}

/**
 * An item's fields for the Flow view, from its file's text: the
 * FLOW_KEYS of its front matter, and from its text a decision's options
 * (letter and label), the option it recommends, its reversibility (the
 * door: "one-way", "two-way" or "mixed") and the item a proposal was
 * filed from (its "Source:" line naming another item). Nothing read is
 * executed or evaluated.
 */
export function flowFieldsOf(text) {
  const lines = String(text).split("\n");
  if (lines[0]?.trim() !== "---") {
    return undefined;
  }
  const fm = {};
  let i = 1;
  for (; i < lines.length && lines[i].trim() !== "---"; i++) {
    const m = /^([a-z_]+):(.*)$/.exec(lines[i]);
    if (!m || !FLOW_KEYS.has(m[1])) {
      continue;
    }
    const raw = m[2].trim();
    fm[m[1]] =
      raw.startsWith("[") && raw.endsWith("]")
        ? flowListOf(raw)
        : scalarOf(raw);
  }
  if (typeof fm.id !== "string" || !ID_PATTERN.test(fm.id)) {
    return undefined;
  }
  if (fm.status !== undefined) {
    fm.state ??= LEGACY_STATES[fm.status] ?? String(fm.status).toLowerCase();
    delete fm.status;
  }
  if (fm.estimate_tokens !== undefined) {
    const n = Number(fm.estimate_tokens);
    if (Number.isFinite(n) && n > 0) {
      fm.estimate_tokens = n;
    } else {
      delete fm.estimate_tokens;
    }
  }
  const body = lines.slice(i + 1);
  const cut = (s, n = 160) => {
    const flat = s.replace(/\s+/g, " ").replaceAll("**", "").trim();
    return flat.length > n ? `${flat.slice(0, n - 1)}…` : flat;
  };
  if (typeof fm.answer === "string") {
    fm.answer = cut(fm.answer);
  }
  if (fm.kind === "decision") {
    const options = [];
    for (const l of body) {
      const m = /^\s*[-*]\s+(?:\*\*)?([A-Z])[.):](?:\*\*)?\s*(.*)$/.exec(l);
      if (m && !options.some((o) => o.letter === m[1])) {
        // Its label: the words before its first colon or full stop.
        const label = /^([^:.]{1,120})[:.]/.exec(m[2])?.[1] ?? m[2];
        options.push({ letter: m[1], label: cut(label, 120) });
      }
    }
    if (options.length) {
      fm.options = options;
    }
    const rec = body
      .map(
        (l) =>
          /^\s*(?:[-*]\s+)?(?:\*\*)?Recommended:?(?:\*\*)?:?\s*(.+)$/.exec(
            l,
          )?.[1],
      )
      .find(Boolean);
    if (rec) {
      fm.recommended = cut(rec);
    }
    const door = body
      .map((l) => /Reversibility:\s*([^\n]+)$/.exec(l)?.[1])
      .find(Boolean);
    if (door) {
      const one = /one-way/i.test(door);
      const two = /two-way/i.test(door);
      fm.door =
        one && two ? "mixed" : one ? "one-way" : two ? "two-way" : undefined;
      if (!fm.door) {
        delete fm.door;
      }
    }
  } else {
    const source = body.find((l) => /^Source:/.test(l.trim()));
    const from = source
      ? [...source.matchAll(/\b(CS-[1-9]\d*)(?:'s| report| review)/g)].map(
          (m) => m[1],
        )
      : [];
    if (from.length) {
      fm.follows = [...new Set(from)].filter((x) => x !== fm.id);
    }
  }
  return fm;
}

const FLOW_MARK = "\x1e@@flow ";

/**
 * The tracker's history on HEAD, oldest first: each commit that changes an
 * item file, with its author and committer dates, its subject, its
 * Work-Item trailer (read from the whole message), and per item what its
 * diff sets: `state` (legacy `status:` lines in hitld's names) and
 * whether it adds the file. Merges are left out: a branch's commits carry
 * their own changes.
 */
async function flowLogOf(run, root, head) {
  const { code, stdout } = await run(root, [
    "log",
    "--no-merges",
    `--max-count=${FLOW_MAX_COMMITS + 1}`,
    "-p",
    "-U0",
    "--no-color",
    "--no-ext-diff",
    `--format=${FLOW_MARK}%h${FIELD}%aI${FIELD}%cI${FIELD}%B${FIELD}`,
    head,
    "--",
    "work/items",
    // Before CS-835 the tracker was here; its history still is.
    "packages/next/work/items",
  ]);
  if (code !== 0) {
    throw new Error("log");
  }
  const commits = [];
  for (const chunk of stdout.split(FLOW_MARK).slice(1)) {
    const [short, authored, committed, message, rest] = chunk.split(FIELD);
    const text = (message ?? "").trim();
    const work = /^Work-Item:[ \t]*(CS-[1-9]\d*)[ \t]*$/m.exec(text)?.[1];
    const files = new Map();
    let id;
    let added = false;
    for (const line of (rest ?? "").split("\n")) {
      if (line.startsWith("diff --git ")) {
        id = /\/(CS-[1-9]\d*)[-.][^/]*$/.exec(line)?.[1];
        added = false;
      } else if (id && line.startsWith("new file mode")) {
        added = true;
        files.set(id, { ...files.get(id), id, added: true });
      } else if (id && line.startsWith("+state: ")) {
        files.set(id, {
          ...files.get(id),
          id,
          added,
          state: line.slice(8).trim(),
        });
      } else if (id && line.startsWith("+status: ")) {
        const state = LEGACY_STATES[line.slice(9).trim()];
        if (state) {
          files.set(id, { ...files.get(id), id, added, state });
        }
      }
    }
    if (!files.size) {
      continue;
    }
    commits.push({
      short,
      authored,
      committed,
      subject: (text.split("\n")[0] ?? "").slice(0, 200),
      ...(work ? { work_item: work } : {}),
      files: [...files.values()],
    });
  }
  const truncated = commits.length > FLOW_MAX_COMMITS;
  return { commits: commits.slice(0, FLOW_MAX_COMMITS).reverse(), truncated };
}

/** The reverts on HEAD's history (subjects starting "Revert"), newest first. */
async function flowRevertsOf(run, root, head) {
  const { code, stdout } = await run(root, [
    "log",
    "--no-merges",
    `--max-count=${FLOW_MAX_REVERTS}`,
    "--grep=^Revert",
    `--format=${FLOW_MARK}%h${FIELD}%cI${FIELD}%B`,
    head,
  ]);
  if (code !== 0) {
    return [];
  }
  return stdout
    .split(FLOW_MARK)
    .slice(1)
    .map((chunk) => {
      const [short, at, message] = chunk.split(FIELD);
      const text = (message ?? "").trim();
      const work = /^Work-Item:[ \t]*(CS-[1-9]\d*)[ \t]*$/m.exec(text)?.[1];
      return {
        short,
        at,
        subject: (text.split("\n")[0] ?? "").slice(0, 200),
        ...(work ? { work_item: work } : {}),
      };
    });
}

/** The bands' settings: the project's policy where it sets them, else hitld rc.1's defaults. */
export function flowPolicyOf(policy) {
  const out = {};
  for (const [key, [section, fallback]] of Object.entries(FLOW_POLICY)) {
    const v = policy?.[section]?.[key];
    out[key] =
      typeof v === "number" && Number.isFinite(v)
        ? { value: v, source: "policy" }
        : { value: fallback, source: "hitld default" };
  }
  return out;
}

/** The ledger's events (`hitld ledger tail`), cut to FLOW_EVENT_KEYS. */
export async function flowLedger(root, store) {
  try {
    const tail = await hitld(
      root,
      withStore(store, ["ledger", "tail", "--limit", LEDGER_ALL]),
    );
    if (!tail.ok) {
      return { ok: false, why: FLOW_UNREAD.ledger };
    }
    const events = (tail.events ?? []).map(flowEventOf).filter(Boolean);
    return events.length
      ? { ok: true, events }
      : { ok: false, why: FLOW_UNREAD.empty };
  } catch (e) {
    if (e instanceof HitldUnavailable && e.reason !== "failed") {
      throw e;
    }
    return { ok: false, why: FLOW_UNREAD.ledger };
  }
}

/**
 * The Flow view's read, everything at once: HEAD, the items at HEAD (one
 * ls-tree, one cat-file batch), the tracker's history, the reverts, the
 * ledger and the policy's bands. `ledger(root)` is injectable for tests.
 */
export async function readFlow(
  root,
  { run = gitRun, ledger = (r) => flowLedger(r) } = {},
) {
  const headGot = await run(root, ["rev-parse", "--verify", "HEAD"]);
  const head = headGot.stdout.trim();
  return flowAt(run, root, head, ledger);
}

async function flowAt(run, root, head, ledger) {
  const items = async () => {
    const tree = await treeOf(run, root, head);
    const paths = [...tree].filter(([p]) => p.startsWith(WORK_PATHS[0]));
    const text = await blobsOf(
      run,
      root,
      paths.map(([, b]) => b),
    );
    return paths
      .map(([, b]) => flowFieldsOf(text.get(b) ?? ""))
      .filter(Boolean)
      .sort(byNumber);
  };
  const history = flowLogOf(run, root, head).then(
    (h) => ({ ok: true, ...h }),
    () => ({ ok: false, why: FLOW_UNREAD.git, commits: [], truncated: false }),
  );
  const [headRef, entities, log, reverts, led] = await Promise.all([
    commitRefOf(run, root, head),
    items(),
    history,
    flowRevertsOf(run, root, head),
    ledger(root),
  ]);
  return {
    api_version: API_VERSION,
    read_at: new Date().toISOString(),
    head: headRef,
    entities,
    history: log,
    reverts,
    ledger: led,
    policy: flowPolicyOf(policyOf(root)),
  };
}

/**
 * The dev server's reader for `/work-api/flow.json` (CS-752), within
 * CS-704's read budget: the read is kept while HEAD and the ledger file
 * hold, so a warm request runs one `git rev-parse` and one stat.
 * `ledgerKey()` says when the ledger changed (the store's ledger.jsonl's
 * size and time by default).
 */
export function flowReader(root, { run = gitRun, ledger, ledgerKey } = {}) {
  let store;
  const storeReady = storeOf(root).then(
    (s) => {
      store = s;
    },
    () => {},
  );
  const read = ledger ?? ((r) => flowLedger(r, store));
  const keyOfLedger =
    ledgerKey ?? (() => (store ? fileKey(join(store, "ledger.jsonl")) : ""));
  let kept;
  let headAt = { value: "", at: 0 };
  const headOf = async () => {
    if (Date.now() - headAt.at < KEY_MS && headAt.value) {
      return headAt.value;
    }
    const got = await run(root, ["rev-parse", "--verify", "HEAD"]);
    headAt = { value: got.stdout.trim(), at: Date.now() };
    return headAt.value;
  };
  return {
    async read() {
      if (!ledger) {
        await storeReady;
      }
      const head = await headOf();
      const k = `${head} ${keyOfLedger()}`;
      if (kept?.key !== k) {
        const p = flowAt(run, root, head, read);
        kept = { key: k, p };
        // A failure isn't kept: the next request tries again.
        p.catch(() => {
          if (kept?.p === p) {
            kept = undefined;
          }
        });
      }
      return kept.p;
    },
  };
}
