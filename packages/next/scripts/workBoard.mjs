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
// for the live run (readLive), which items are done on a branch and not on
// the main branch, and whether hitld holds a batch for the owner.
//
// hitld is the dev dependency pinned in package.json. Nothing read from it
// is executed or evaluated; hitld and git run with fixed arguments only.

import { execFileSync, spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

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
    "hitld isn't installed: run npm install in the repository (human-in-the-lead is a dev dependency of packages/next)",
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
 * proposals carry theirs, to keep the snapshot small.
 */
const proposalText = (e) =>
  e.state === "proposed" && e.body ? String(e.body).trim() : undefined;
const isOpen = (e) => e.state !== "done" && e.state !== "dropped";

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
  const [all, readyAnswer, check, version] = await Promise.all([
    // With the bodies: a proposal's text carries its header (CS-686).
    hitld(root, ["work", "query", "--json", "--bodies"]),
    hitld(root, ["work", "query", "--ready", "--json"]),
    hitld(root, ["work", "check"]),
    hitld(root, ["version"]),
  ]);
  checkVersion(all);
  checkVersion(readyAnswer);
  const ready = new Set(readyAnswer.entities.map((e) => e.id));
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
    text: proposalText(e),
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
      text: proposalText(m),
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
    source: `hitld work query --json --bodies (human-in-the-lead ${version.version})`,
    hitld_version: version.version,
    branch: git(root, ["rev-parse", "--abbrev-ref", "HEAD"]),
    commit: git(root, ["rev-parse", "--short", "HEAD"]),
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
    problems: check.problems ?? [],
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

/** The ledger is read whole: the merge queue is a fold over all of it. */
const LEDGER_ALL = "1000000";

/** The main branch, from the project's hitld policy; "main" without one. */
export function mainBranchOf(root) {
  try {
    const policy = JSON.parse(
      readFileSync(join(root, ".human-in-the-lead", "policy.json"), "utf8"),
    );
    const name = policy?.merge?.main_branch;
    return typeof name === "string" && name ? name : "main";
  } catch {
    return "main";
  }
}

/**
 * The merge queue's view of each item, folded from the ledger's events:
 * "queued" after a passing `verified` (the orchestrator queued its branch),
 * "rejected" after a failing one, gone after `merged` or `reverted` (as
 * hitld's own run state folds them).
 */
export function queueOf(events) {
  const out = new Map();
  for (const e of events ?? []) {
    if (!e?.item) {
      continue;
    }
    if (e.event === "verified") {
      out.set(e.item, {
        state: e.result === "pass" ? "queued" : "rejected",
        at: e.at,
      });
    } else if (e.event === "merged" || e.event === "reverted") {
      out.delete(e.item);
    }
  }
  return out;
}

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

/** A branch an orchestrator checks a finished branch on by hand. */
const isCheckBranch = (b) => /-merge-check$/.test(b);

/**
 * Items done on a local branch and not on the main branch, each with the
 * branches that close it and where the merge queue has it: "held" (in the
 * batch hitld holds for the owner's yes), "checking" (on a merge-check
 * branch), "queued" or "rejected" (the ledger's fold, queueOf), or "none".
 * Read from git: the main branch's states, and the commits on branches
 * that main doesn't have which set an item done. Main's copy decides, so a
 * branch merged by a rebase (its own commits never reach main) drops out
 * once main shows the item done.
 */
export function unmergedOf(root, main, queue = new Map()) {
  const mainRef = `refs/heads/${main}`;
  if (!git(root, ["rev-parse", "--verify", "-q", mainRef])) {
    throw new Error(`no branch ${main}`);
  }
  const onMain = statesOn(root, mainRef);
  const pending = closesIn(root, ["--branches", "--not", mainRef]).filter(
    (c) => onMain.get(c.id) !== "done",
  );
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
        "refs/heads",
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
};

/**
 * The live run, as hitld and git show it now, each source with when it was
 * read, or why it couldn't be: the run and the orchestrator holding its
 * lease (`hitld run status`), the dispatches in flight
 * (`hitld ledger in-flight`), the merge queue folded from the ledger
 * (`hitld ledger tail`), the claims (`hitld work claims`), and the items
 * done on a branch and not merged (git). Reads only. `store` points hitld
 * at another private store (tests point it at a missing one). The host
 * names hitld records are left out: the page names sessions, not machines.
 */
export async function readLive(root, { store } = {}) {
  const at = () => new Date().toISOString();
  const withStore = (args) => (store ? [...args, "--store", store] : args);
  const main = mainBranchOf(root);
  const attempt = async (source, why, read) => {
    try {
      return { source, read_at: at(), ok: true, ...(await read()) };
    } catch (e) {
      if (e instanceof HitldUnavailable && e.reason !== "failed") {
        throw e; // hitld missing or in another version: the board says so
      }
      return { source, read_at: at(), ok: false, why };
    }
  };
  // The three hitld reads run at once; git's needs the ledger's events.
  let events = [];
  const [run, ledger, claims] = await Promise.all([
    attempt("hitld run status", LIVE_UNREAD.run, async () => {
      const a = await hitld(root, withStore(["run", "status"]));
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
    }),
    attempt(
      "hitld ledger in-flight and ledger tail",
      LIVE_UNREAD.ledger,
      async () => {
        const [flight, tail] = await Promise.all([
          hitld(root, withStore(["ledger", "in-flight"])),
          hitld(root, withStore(["ledger", "tail", "--limit", LEDGER_ALL])),
        ]);
        if (!flight.ok || !tail.ok) {
          throw new Error("ledger");
        }
        events = tail.events ?? [];
        return {
          events: Number(tail.total ?? events.length),
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
    ),
    attempt("hitld work claims", LIVE_UNREAD.claims, async () =>
      readClaims(root),
    ),
  ]);
  if (ledger.ok && ledger.events === 0) {
    Object.assign(ledger, { ok: false, why: LIVE_UNREAD.empty });
  }
  const unmerged = await attempt(
    `git: local branches against ${main}`,
    LIVE_UNREAD.git,
    async () => ({ list: unmergedOf(root, main, queueOf(events)) }),
  );
  return { read_at: at(), main_branch: main, run, ledger, claims, unmerged };
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
