/**
 * The Work board's model (views/Work.tsx): it reads the tracker through
 * its read API on the dev server (scripts/workBoard.mjs, the one adapter
 * between this board and human-in-the-lead's read API) and never parses an item
 * file itself. Filters, columns and counts are pure, for tests.
 */

import type {
  ItemKind,
  State,
  WorkContainer,
  WorkElsewhere,
  WorkFound,
  WorkItem,
  WorkItemText,
  WorkLive,
  WorkMilestone,
  WorkQueueState,
  WorkSnapshot,
} from "../../scripts/workBoard.mjs";

export type {
  WorkFound,
  WorkMilestone,
  ItemKind,
  State,
  WorkContainer,
  WorkElsewhere,
  WorkItem,
  WorkItemText,
  WorkLive,
  WorkQueueState,
  WorkSnapshot,
};

/** The read API's version this board understands. */
export const READS_API_VERSION = 3;

/** Why the board can't show the tracker. */
export class WorkUnavailable extends Error {}

async function getJson(url: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store" });
  } catch (e) {
    throw new WorkUnavailable(`the dev server didn't answer (${String(e)})`);
  }
  if (response.status === 404) {
    throw new WorkUnavailable(
      "this server has no tracker API: the board reads the tracker through Dyno's dev server (npm run dev in packages/next)",
    );
  }
  if (response.status === 503) {
    // hitld is missing, or answers in another read API version.
    const why = (await response.json().catch(() => ({}))) as { error?: string };
    throw new WorkUnavailable(
      why.error ?? "human-in-the-lead's hitld couldn't be read",
    );
  }
  if (!response.ok) {
    throw new WorkUnavailable(`the tracker API answered ${response.status}`);
  }
  return response.json();
}

function checkVersion(v: { api_version?: unknown }) {
  if (v.api_version !== READS_API_VERSION) {
    throw new WorkUnavailable(
      `human-in-the-lead's read API is version ${String(v.api_version)}; this board reads version ${READS_API_VERSION}`,
    );
  }
}

/**
 * The snapshot of the tracker on the dev server's branch, as the board
 * shows it: without dropped milestones (withoutDropped).
 */
export async function loadWork(): Promise<WorkSnapshot> {
  const snapshot = (await getJson("/work-api/query.json")) as WorkSnapshot;
  checkVersion(snapshot);
  return withoutDropped(snapshot);
}

/** Every item whose file or project mentions all the words. */
export async function findWork(q: string): Promise<WorkFound> {
  const found = (await getJson(
    `/work-api/find.json?q=${encodeURIComponent(q)}`,
  )) as WorkFound;
  checkVersion(found);
  return found;
}

/** One item's text. */
export async function loadItemText(id: string): Promise<WorkItemText> {
  const text = (await getJson(
    `/work-api/item/${encodeURIComponent(id)}.json`,
  )) as WorkItemText;
  checkVersion(text);
  return text;
}

// ------------------------------------------------------------ the lifecycle

export const STATES: readonly State[] = [
  "proposed",
  "planned",
  "in-progress",
  "done",
  "dropped",
];
/** How the board names each state (human-in-the-lead's display labels). */
export const STATE_NAMES: Record<State, string> = {
  proposed: "Proposed",
  planned: "Planned",
  "in-progress": "In progress",
  done: "Done",
  dropped: "Dropped",
};
export const KINDS: readonly ItemKind[] = ["work", "decision", "external"];
export const KIND_NAMES: Record<ItemKind, string> = {
  work: "Work",
  decision: "Decision",
  external: "External",
};

export const isOpen = (it: WorkItem) =>
  it.state !== "done" && it.state !== "dropped";

/**
 * The snapshot as the board shows it: dropped milestones taken out, so no
 * roadmap, lane, scope or count holds one. Long outcomes (milestones with
 * no parent) were retired on 2026-11-17 and are all dropped; the board
 * reads none of them.
 */
export function withoutDropped(s: WorkSnapshot): WorkSnapshot {
  const dropped = new Set(
    s.milestones.filter((m) => m.state === "dropped").map((m) => m.id),
  );
  if (!dropped.size) {
    return s;
  }
  return {
    ...s,
    milestones: s.milestones.filter((m) => !dropped.has(m.id)),
    items: s.items.map((it) =>
      it.milestones.some((m) => dropped.has(m))
        ? { ...it, milestones: it.milestones.filter((m) => !dropped.has(m)) }
        : it,
    ),
  };
}

/** Work to do, as against a decision or a wait on another party. */
export const isWork = (it: WorkItem) => it.kind === "work";

/**
 * A release item (human-in-the-lead's format): the work item that makes a
 * release, carrying the version it makes. What it needs, milestones and
 * items, is what the release waits for: its gates.
 */
export const isReleaseItem = (it: WorkItem | undefined): boolean =>
  !!it && it.kind === "work" && !!it.release;

// ------------------------------------------------------------ kinds

/**
 * The six kinds of entity the board shows. Each has one encoding, a glyph
 * and a color, drawn the same way in every view and in the pane
 * (`KindMark` in views/Work.tsx, `--kind-*` in work.css; DESIGN.md,
 * "Kinds"). The glyph alone carries the kind; the color repeats it. A
 * release is a work item with a `release` version, shown as its own kind.
 */
export const ENTITY_KINDS = [
  "project",
  "milestone",
  "work",
  "decision",
  "external",
  "release",
] as const;
export type EntityKind = (typeof ENTITY_KINDS)[number];
export const ENTITY_KIND_NAMES: Record<EntityKind, string> = {
  project: "Project",
  milestone: "Milestone",
  work: "Work item",
  decision: "Decision",
  external: "External",
  release: "Release",
};
/** What each kind is, in a sentence (the legend's tips). */
export const ENTITY_KIND_TIPS: Record<EntityKind, string> = {
  project: "A project: one plan's work, holding its milestones and items",
  milestone: "A milestone: an outcome, true once the items it names are done",
  work: "A work item: something an agent or a person does",
  decision: "A decision: a question its decider answers",
  external: "External: a wait on a party outside the project",
  release:
    "A release: the item that makes a version, once what it needs is done",
};

/** An item's kind on the board: a release item is a release. */
export const itemKindOf = (it: WorkItem): EntityKind =>
  isReleaseItem(it) ? "release" : it.kind;

/** The kind of every ID in the snapshot: projects, milestones and items. */
export function kindsOf(s: WorkSnapshot): Map<string, EntityKind> {
  const out = new Map<string, EntityKind>();
  for (const p of s.projects) {
    out.set(p.id, "project");
  }
  for (const m of s.milestones) {
    out.set(m.id, "milestone");
  }
  for (const it of s.items) {
    out.set(it.id, itemKindOf(it));
  }
  return out;
}

/**
 * The open releases that need an item or a milestone, directly or through
 * the milestones it is in: what it gates. Ordered by number.
 */
export function releasesGatedBy(s: WorkSnapshot, id: string): WorkItem[] {
  const via = new Set([
    id,
    ...(s.items.find((it) => it.id === id)?.milestones ?? []),
  ]);
  return s.items
    .filter(
      (it) =>
        isReleaseItem(it) &&
        isOpen(it) &&
        it.id !== id &&
        it.needs.some((n) => via.has(n)),
    )
    .sort((a, b) => idNumber(a.id) - idNumber(b.id));
}

/** "CS-170" → 170, for ordering by number. */
export const idNumber = (id: string) => Number(id.replace(/^\D+-/, "")) || 0;

// ------------------------------------------------------------ the owner

/** Open decisions the owner answers. */
export const isOwnerDecision = (it: WorkItem) =>
  it.kind === "decision" && it.decider === "owner" && isOpen(it);

/**
 * What waits on the owner: open decisions the owner answers, and the open
 * items that need one of them.
 */
export function waitingOnOwner(s: WorkSnapshot): Set<string> {
  const decisions = new Set(s.items.filter(isOwnerDecision).map((it) => it.id));
  const out = new Set(decisions);
  for (const it of s.items) {
    if (isOpen(it) && it.open_needs.some((n) => decisions.has(n))) {
      out.add(it.id);
    }
  }
  return out;
}

// ------------------------------------------------------------ filters

export interface WorkFilter {
  project?: string;
  /** Kinds shown; empty or absent shows every kind. */
  kinds?: readonly ItemKind[];
  /** Only what waits on the owner. */
  owner?: boolean;
  /** Words in the ID, title, project, claim or party. */
  q?: string;
}

/** The items a filter keeps, in the snapshot's order. */
export function filterItems(s: WorkSnapshot, f: WorkFilter): WorkItem[] {
  const projectOf = new Map(s.projects.map((p) => [p.id, p]));
  const owner = f.owner ? waitingOnOwner(s) : undefined;
  const q = f.q?.trim().toLowerCase();
  return s.items.filter((it) => {
    const project = it.project ? projectOf.get(it.project) : undefined;
    if (f.project && it.project !== f.project) {
      return false;
    }
    if (f.kinds?.length && !f.kinds.includes(it.kind)) {
      return false;
    }
    if (owner && !owner.has(it.id)) {
      return false;
    }
    if (q) {
      const words = [
        it.id,
        it.title,
        project?.title,
        it.claimed_by,
        it.waiting_on,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return q.split(/\s+/).every((w) => words.includes(w));
    }
    return true;
  });
}

// ------------------------------------------------------------ in flight

/** Claims elsewhere (other worktrees and branches), by item. */
export type InFlight = ReadonlyMap<string, readonly WorkElsewhere[]>;

export function inFlightOf(s: WorkSnapshot): InFlight {
  const out = new Map<string, WorkElsewhere[]>();
  for (const c of s.elsewhere ?? []) {
    out.set(c.id, [...(out.get(c.id) ?? []), c]);
  }
  return out;
}

// ------------------------------------------------------------ the live run

/** One item being worked on now, and since when. */
export interface LiveWork {
  id: string;
  item?: WorkItem;
  /** The dispatch, or the claim's `claimed_by`. */
  who?: string;
  /** The branch. */
  where?: string;
  /** On the branch the board reads. */
  here: boolean;
  /**
   * When the work started (ms): its dispatch's start in the ledger, or its
   * claim commit; never the day-bucketed stage history.
   */
  since?: number;
  /**
   * "dispatch": a dispatch in flight in hitld's ledger. "claim": a claim
   * commit with no dispatch in flight. "branch": in progress on this
   * branch, with no claim commit found (not committed, or claims unread).
   */
  from: "dispatch" | "claim" | "branch";
}

/** One item done on a branch and not merged. */
export interface LiveUnmerged {
  id: string;
  item?: WorkItem;
  branches: string[];
  queue: WorkQueueState;
  checkBranch?: string;
  /** When it was closed (ms). */
  closed: number;
}

export interface LiveRun {
  /**
   * "active": a run whose lease an orchestrator holds. "free": its lease
   * expired or was released. "none": no run state, and a ledger to trust
   * that by. "unknown": no run state, and no ledger either (a missing
   * store reads the same as no run). "unread": run status failed.
   */
  state: "active" | "free" | "none" | "unknown" | "unread";
  id?: string;
  started?: number;
  session?: string;
  renewed?: number;
  released?: number;
}

export interface LiveSource {
  source: string;
  /** When it was read (ms). */
  at: number;
  ok: boolean;
  why?: string;
}

/** The In progress box: what is moving now, and what the board can't see. */
export interface LiveBox {
  working: LiveWork[];
  unmerged: LiveUnmerged[];
  run: LiveRun;
  /** What the figures leave out, or can't tell, in plain sentences. */
  notes: string[];
  /** Every source, with when it was read, or why it couldn't be. */
  sources: LiveSource[];
  /** A source couldn't be read: the box can't say nothing is in progress. */
  blind: boolean;
}

const msOf = (iso?: string) => {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? t : undefined;
};

/** "CS-174" or "CS-174, CS-175 and 2 more". */
const idsText = (ids: readonly string[]) => {
  const u = [...new Set(ids)];
  return u.length > 3
    ? `${u.slice(0, 2).join(", ")} and ${u.length - 2} more`
    : u.length > 1
      ? `${u.slice(0, -1).join(", ")} and ${u.at(-1)}`
      : (u[0] ?? "");
};

/**
 * The In progress box from the snapshot's live read (scripts/workBoard.mjs
 * readLive): every item a dispatch in flight works on, with its dispatch
 * and how long since it started; every other open claim, timed from its
 * claim commit; the items done on a branch and not merged, with where the
 * merge queue has each; the active run and the orchestrator holding its
 * lease. Stale claims (on branches main has moved past) are left out and
 * counted in a note. `ids` limits the rows to a scope; the run and the
 * notes about sources stay whole.
 */
export function liveBoxOf(s: WorkSnapshot, ids?: ReadonlySet<string>): LiveBox {
  const live: WorkLive | undefined = s.live;
  const itemOf = new Map(s.items.map((i) => [i.id, i]));
  const inScope = (id: string) => !ids || ids.has(id);
  const notes: string[] = [];
  const sources: LiveSource[] = [];
  const source = (x: {
    source: string;
    read_at: string;
    ok: boolean;
    why?: string;
  }) =>
    sources.push({
      source: x.source,
      at: msOf(x.read_at) ?? 0,
      ok: x.ok,
      why: x.ok ? undefined : x.why,
    });
  if (!live) {
    // A dev server from before CS-547: only the snapshot's claims.
    const working: LiveWork[] = [
      ...s.items
        .filter((it) => it.state === "in-progress" && isWork(it))
        .map((it) => ({
          id: it.id,
          item: it,
          who: it.claimed_by,
          where: s.branch,
          here: true,
          from: "branch" as const,
        })),
      ...(s.elsewhere ?? []).map((c) => ({
        id: c.id,
        item: itemOf.get(c.id),
        who: c.claimed_by,
        where: c.where,
        here: false,
        since: msOf(c.at),
        from: "claim" as const,
      })),
    ].filter((w) => inScope(w.id));
    return {
      working,
      unmerged: [],
      run: { state: "unread" },
      notes: [
        "This dev server doesn't read hitld's ledger or run: restart it to see dispatches, the run and branches done but not merged.",
      ],
      sources: [],
      blind: true,
    };
  }
  for (const x of [live.run, live.ledger, live.claims, live.unmerged]) {
    source(x);
  }

  // The run and the orchestrator holding its lease.
  const r = live.run;
  const run: LiveRun = !r.ok
    ? { state: "unread" }
    : !r.run
      ? { state: live.ledger.ok ? "none" : "unknown" }
      : {
          state: r.lease && !r.lease.free ? "active" : "free",
          id: r.run.id,
          started: msOf(r.run.started_at),
          session: r.lease?.session,
          renewed: msOf(r.lease?.renewed_at),
          released: msOf(r.lease?.released_at),
        };

  // Dispatches in flight, then claims with no dispatch, then this branch.
  const working: LiveWork[] = [];
  const dispatches = live.ledger.ok ? live.ledger.dispatches : [];
  for (const d of dispatches) {
    working.push({
      id: d.item,
      item: itemOf.get(d.item),
      who: d.dispatch,
      where: d.branch,
      here: Boolean(d.branch && d.branch === s.branch),
      since: msOf(d.started_at),
      from: "dispatch",
    });
  }
  const claims = live.claims.ok ? live.claims.list : [];
  const undispatched: string[] = [];
  for (const c of claims) {
    const d = working.find(
      (w) => w.from === "dispatch" && w.id === c.id && w.who === c.claimed_by,
    );
    if (d) {
      d.where ??= c.where;
      d.here ||= c.here;
      continue;
    }
    working.push({
      id: c.id,
      item: itemOf.get(c.id),
      who: c.claimed_by,
      where: c.where,
      here: c.here,
      since: msOf(c.at),
      from: "claim",
    });
    undispatched.push(c.id);
  }
  for (const it of s.items) {
    if (
      it.state === "in-progress" &&
      isWork(it) &&
      !working.some((w) => w.id === it.id && w.here)
    ) {
      working.push({
        id: it.id,
        item: it,
        who: it.claimed_by,
        where: s.branch,
        here: true,
        from: "branch",
      });
    }
  }
  const order = (t?: number) => t ?? Number.POSITIVE_INFINITY;
  const shown = working
    .filter((w) => inScope(w.id))
    .sort((a, b) => order(a.since) - order(b.since));

  const unmerged: LiveUnmerged[] = (live.unmerged.ok ? live.unmerged.list : [])
    .filter((u) => inScope(u.id))
    .map((u) => ({
      id: u.id,
      item: itemOf.get(u.id),
      branches: u.branches,
      queue: u.queue,
      checkBranch: u.check_branch,
      closed: msOf(u.closed_at) ?? 0,
    }))
    .sort((a, b) => a.closed - b.closed);

  // What the figures leave out, or can't tell.
  if (live.ledger.ok && undispatched.length) {
    const n = undispatched.length;
    notes.push(
      `${idsText(undispatched)} ${n === 1 ? "has a claim" : "have claims"} with no dispatch in flight in hitld's ledger: a session set up outside hitld dispatch, or one whose dispatch has ended. ${n === 1 ? "Its age runs" : "Their ages run"} from the claim commit.`,
    );
  }
  if (shown.some((w) => w.from === "branch") && live.claims.ok) {
    notes.push(
      "An item in progress on this branch with no claim commit hasn't been committed yet, so its age can't be told.",
    );
  }
  if (live.claims.ok && live.claims.stale.length) {
    const stale = live.claims.stale.map((c) => c.id);
    const branches = new Set(live.claims.stale.map((c) => c.where)).size;
    notes.push(
      `Left out: ${idsText(stale)}, in progress only on ${branches === 1 ? "a branch" : `${branches} branches`} ${live.main_branch} has already moved past.`,
    );
  }
  if (live.ledger.ok && live.ledger.problems) {
    notes.push(
      `hitld couldn't read ${live.ledger.problems} ${live.ledger.problems === 1 ? "line" : "lines"} of its ledger; a dispatch recorded there may be missing.`,
    );
  }
  if (live.claims.ok) {
    notes.push(
      "Another machine's claims show only once its bundle is fetched.",
    );
  }
  return {
    working: shown,
    unmerged,
    run,
    notes,
    sources,
    blind: sources.some((x) => !x.ok),
  };
}

/** How the box names where the merge queue has a finished item. */
export function queueText(u: Pick<LiveUnmerged, "queue" | "checkBranch">): {
  text: string;
  tone?: "attention" | "info";
} {
  switch (u.queue) {
    case "held":
      return { text: "waits for the owner's yes", tone: "attention" };
    case "checking":
      return {
        text: `being checked on ${u.checkBranch ?? "a merge-check branch"}, outside hitld's merge queue`,
        tone: "info",
      };
    case "queued":
      return { text: "in hitld's merge queue", tone: "info" };
    case "rejected":
      return {
        text: "turned down by the merge queue; see hitld ledger tail",
        tone: "attention",
      };
    default:
      return { text: "not in hitld's merge queue" };
  }
}

/**
 * The status the board shows: In progress when claimed here or on any
 * other branch whose claim hasn't merged yet; else the file's status.
 */
export function boardStatus(it: WorkItem, flight?: InFlight): State {
  return isOpen(it) && flight?.has(it.id) ? "in-progress" : it.state;
}

/**
 * The owner's queue: open decisions the owner answers, each with the
 * open items that need it, most waited-on first.
 */
export function ownerQueue(
  s: WorkSnapshot,
  items: readonly WorkItem[],
): Array<{ decision: WorkItem; waiting: WorkItem[] }> {
  const itemOf = new Map(s.items.map((i) => [i.id, i]));
  return items
    .filter(isOwnerDecision)
    .map((decision) => ({
      decision,
      waiting: decision.needed_by
        .map((id) => itemOf.get(id))
        .filter((x): x is WorkItem => !!x),
    }))
    .sort(
      (a, b) =>
        b.waiting.length - a.waiting.length ||
        Number(b.decision.ready) - Number(a.decision.ready) ||
        idNumber(a.decision.id) - idNumber(b.decision.id),
    );
}

/** Items (or proposals) grouped by project, in the snapshot's project order. */
export function byProject<T extends { project?: string }>(
  s: WorkSnapshot,
  items: readonly T[],
): Array<{ project: WorkContainer | undefined; items: T[] }> {
  const groups = new Map<string, T[]>();
  for (const it of items) {
    const key = it.project ?? "";
    groups.set(key, [...(groups.get(key) ?? []), it]);
  }
  const order = new Map(s.projects.map((p, i) => [p.id, i]));
  return [...groups]
    .sort(
      ([a], [b]) =>
        (order.get(a) ?? Infinity) - (order.get(b) ?? Infinity) ||
        idNumber(a) - idNumber(b),
    )
    .map(([id, group]) => ({
      project: s.projects.find((p) => p.id === id),
      items: group,
    }));
}

// ------------------------------------------------------------ proposals

/**
 * A proposal's header (CS-686): where it came from, why now and what it
 * unblocks, a rough size, who decides, and the date it was filed. An item
 * keeps it in its text, as the paragraph that starts `**Proposal**`:
 *
 *   **Proposal** (CS-686). Source: … Why now: … Rough size: … Decider: …
 *   Filed: 2026-11-18.
 *
 * A field the paragraph leaves out is absent.
 */
export interface ProposalHeader {
  source?: string;
  why?: string;
  size?: string;
  decider?: string;
  date?: string;
}

/** The header's fields, each under the labels it is written with. */
const HEADER_LABELS: Record<string, keyof ProposalHeader> = {
  Source: "source",
  "Why now": "why",
  Why: "why",
  "Rough size": "size",
  Size: "size",
  Decider: "decider",
  Filed: "date",
  Date: "date",
};
const HEADER_LABEL =
  /(?<=^|[\s.;)])(Source|Why now|Why|Rough size|Size|Decider|Filed|Date):\s*/g;

/**
 * The header in a proposal's text, or undefined when it has none: the
 * first paragraph that starts `**Proposal**`, read field by field. Each
 * field runs to the next label; a trailing period is dropped.
 */
export function proposalHeaderOf(text?: string): ProposalHeader | undefined {
  const para = (text ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .find((p) => p.startsWith("**Proposal**"));
  if (!para) {
    return undefined;
  }
  const line = para.replace(/\s+/g, " ");
  const marks = [...line.matchAll(HEADER_LABEL)];
  const header: ProposalHeader = {};
  marks.forEach((m, i) => {
    const key = HEADER_LABELS[m[1]!]!;
    const from = m.index! + m[0].length;
    const to = marks[i + 1]?.index ?? line.length;
    const value = line.slice(from, to).trim().replace(/\.$/, "").trim();
    if (value && header[key] === undefined) {
      header[key] = value;
    }
  });
  return header;
}

/** A proposal's text says what done is: it has a "Done when" section. */
export const saysDoneWhen = (text?: string) =>
  /^#{2,3}\s+Done when\b/m.test(text ?? "");

/**
 * Where a proposal stands in the flow (CS-686): new to discuss, being
 * shaped, ready for the owner's yes, or a "later" copy awaiting review.
 *
 * - **shaping**: an open decision or study comes before the commit.
 * - **later**: no header yet, so nobody has made its case for now: the
 *   "later" copies of design lists and older filings, kept for the owner's
 *   review (CS-680 gives each the header).
 * - **ready**: a header, and shaped (an item's text has a "Done when"; a
 *   milestone has nothing left to shape), with nothing open before the
 *   commit but the decider's yes.
 * - **discuss**: a header but not shaped yet: the owner commits, drops or
 *   sends it to shaping.
 */
export type ProposalStage = "discuss" | "shaping" | "ready" | "later";
export const PROPOSAL_STAGES: readonly ProposalStage[] = [
  "discuss",
  "shaping",
  "ready",
  "later",
];

/** One proposed item or milestone, as the Proposals view shows it. */
export interface Proposal {
  id: string;
  title: string;
  project?: string;
  /** The proposed item, or else the proposed milestone. */
  item?: WorkItem;
  milestone?: WorkMilestone;
  header?: ProposalHeader;
  stage: ProposalStage;
  /** Who says yes: the header's decider, or the owner when it names none. */
  decider: string;
  /** The open decisions and studies a commit waits for, by ID. */
  first: string[];
  /**
   * What starting it waits for, not committing it: an item's other open
   * needs. A secondary detail.
   */
  startsAfter: string[];
  /** Committed work (planned or in progress) that needs it, by ID. */
  neededBy: string[];
}

/** The owner decides a proposal whose header names no decider. */
export const DEFAULT_DECIDER = "the owner";

const isCommitted = (st: State) => st === "planned" || st === "in-progress";

/**
 * A need that comes before a commit, not before the start: an open
 * decision (anyone's) or an open study (a learning milestone). An item
 * that is a study but not a learning milestone isn't marked as one in the
 * tracker, so it counts as other work.
 */
function decidesFirst(
  id: string,
  itemOf: ReadonlyMap<string, WorkItem>,
  msOf: ReadonlyMap<string, WorkMilestone>,
): boolean {
  const it = itemOf.get(id);
  if (it) {
    return it.kind === "decision" && isOpen(it);
  }
  const m = msOf.get(id);
  return !!m && m.learning && m.state !== "done" && m.state !== "dropped";
}

/**
 * The proposals among `items` and `milestones`, each with its header, its
 * stage, what a commit needs and what committed work needs it: by stage,
 * milestones first, then the most waited on first, then by ID.
 */
export function proposalsOf(
  s: WorkSnapshot,
  items: readonly WorkItem[],
  /** The proposed milestones to show (the scope's). */
  milestones: readonly WorkMilestone[] = s.milestones,
  /** How many open items wait on each, for the order. */
  weight?: ReadonlyMap<string, number>,
): Proposal[] {
  const itemOf = new Map(s.items.map((i) => [i.id, i]));
  const msOf = new Map(s.milestones.map((m) => [m.id, m]));
  const openId = (id: string) => {
    const e = itemOf.get(id) ?? msOf.get(id);
    return !!e && e.state !== "done" && e.state !== "dropped";
  };
  // Committed work that names each: items by their needs, milestones by
  // their constraints.
  const committedBy = new Map<string, string[]>();
  const add = (need: string, by: string) =>
    committedBy.set(need, [...(committedBy.get(need) ?? []), by]);
  for (const it of s.items) {
    if (isCommitted(it.state)) {
      for (const n of it.needs) {
        add(n, it.id);
      }
    }
  }
  for (const m of s.milestones) {
    if (isCommitted(m.state)) {
      for (const c of m.constraints) {
        add(c.id, m.id);
      }
    }
  }
  const stageOf = (
    header: ProposalHeader | undefined,
    first: string[],
    shaped: boolean,
  ): ProposalStage =>
    first.length ? "shaping" : !header ? "later" : shaped ? "ready" : "discuss";
  const out: Proposal[] = [];
  for (const it of items) {
    if (it.state !== "proposed") {
      continue;
    }
    const header = proposalHeaderOf(it.text);
    const first = it.open_needs.filter((n) => decidesFirst(n, itemOf, msOf));
    out.push({
      id: it.id,
      title: it.title,
      project: it.project,
      item: it,
      header,
      stage: stageOf(header, first, saysDoneWhen(it.text)),
      decider: header?.decider ?? DEFAULT_DECIDER,
      first,
      startsAfter: it.open_needs.filter((n) => !first.includes(n)),
      neededBy: committedBy.get(it.id) ?? [],
    });
  }
  for (const m of milestones) {
    if (m.state !== "proposed") {
      continue;
    }
    const header = proposalHeaderOf(m.text);
    const first = m.constraints
      .map((c) => c.id)
      .filter((id) => openId(id) && decidesFirst(id, itemOf, msOf));
    out.push({
      id: m.id,
      title: m.title,
      project: m.project,
      milestone: m,
      header,
      stage: stageOf(header, first, m.to_shape.length === 0),
      decider: header?.decider ?? DEFAULT_DECIDER,
      first,
      startsAfter: [],
      neededBy: committedBy.get(m.id) ?? [],
    });
  }
  return out.sort(
    (a, b) =>
      PROPOSAL_STAGES.indexOf(a.stage) - PROPOSAL_STAGES.indexOf(b.stage) ||
      // A proposed milestone heads its project's proposals: the bigger bet.
      Number(!!b.milestone) - Number(!!a.milestone) ||
      (weight?.get(b.id) ?? 0) - (weight?.get(a.id) ?? 0) ||
      idNumber(a.id) - idNumber(b.id),
  );
}

/**
 * The proposals waiting on the owner, for Your move: the current "to
 * discuss" batch (the oldest filed first, at most `batch`, as CS-686
 * brings about five at a time) and every one ready for a yes.
 */
export function proposalsForOwner(
  proposals: readonly Proposal[],
  batch = 5,
): Proposal[] {
  const filed = (p: Proposal) => p.header?.date ?? p.item?.created ?? "";
  const discuss = proposals
    .filter((p) => p.stage === "discuss")
    .sort(
      (a, b) =>
        filed(a).localeCompare(filed(b)) || idNumber(a.id) - idNumber(b.id),
    )
    .slice(0, batch);
  return [...discuss, ...proposals.filter((p) => p.stage === "ready")];
}

/** "the owner" → "the owner's"; "Ines" → "Ines'". */
export const possessive = (who: string) =>
  `${who}${who.endsWith("s") ? "'" : "'s"}`;

// ------------------------------------------------------------ no milestone

/**
 * The open states, as the No milestone view filters by them. An item
 * claimed on another branch counts as in progress (boardStatus).
 */
export const OPEN_STATES = ["proposed", "planned", "in-progress"] as const;
export type OpenState = (typeof OPEN_STATES)[number];
/**
 * The kinds the No milestone view filters by: a release item is a work
 * item, kept apart because it sits above milestones by design (it needs
 * them), so leaving releases out leaves only what should find a milestone.
 */
export const LOOSE_KINDS = [
  "work",
  "release",
  "decision",
  "external",
] as const satisfies readonly EntityKind[];
export type LooseKind = (typeof LOOSE_KINDS)[number];

/** What the No milestone view keeps; empty or absent keeps everything. */
export interface LooseFilter {
  kinds?: readonly LooseKind[];
  states?: readonly OpenState[];
}

/** An open item's state on the board, as one of the open states. */
export const openStateOf = (it: WorkItem, flight?: InFlight): OpenState =>
  boardStatus(it, flight) as OpenState;

/**
 * The open items among `items` that no milestone's constraints name: no
 * milestone of the snapshot (dropped ones are gone already, and long
 * outcomes are none) holds them. In progress first, then planned, then
 * proposed, each by number: committed work that has no milestone is the
 * likeliest to be a gap in the plan.
 */
export function noMilestoneOf(
  s: WorkSnapshot,
  items: readonly WorkItem[],
  flight?: InFlight,
): WorkItem[] {
  const milestones = new Set(s.milestones.map((m) => m.id));
  const rank = (it: WorkItem) =>
    OPEN_STATES.length - 1 - OPEN_STATES.indexOf(openStateOf(it, flight));
  return items
    .filter((it) => isOpen(it) && !it.milestones.some((m) => milestones.has(m)))
    .sort((a, b) => rank(a) - rank(b) || idNumber(a.id) - idNumber(b.id));
}

/** The items a No milestone filter keeps, in their order. */
export function filterLoose(
  items: readonly WorkItem[],
  f: LooseFilter,
  flight?: InFlight,
): WorkItem[] {
  return items.filter(
    (it) =>
      (!f.kinds?.length || f.kinds.includes(itemKindOf(it) as LooseKind)) &&
      (!f.states?.length || f.states.includes(openStateOf(it, flight))),
  );
}

/**
 * How many of `items` each filter choice would keep, given the other
 * filter: a kind's count under the states chosen, a state's under the
 * kinds chosen, so each count says what choosing it adds.
 */
export function looseCounts(
  items: readonly WorkItem[],
  f: LooseFilter,
  flight?: InFlight,
): { kinds: Record<LooseKind, number>; states: Record<OpenState, number> } {
  const kinds = Object.fromEntries(LOOSE_KINDS.map((k) => [k, 0])) as Record<
    LooseKind,
    number
  >;
  const states = Object.fromEntries(OPEN_STATES.map((k) => [k, 0])) as Record<
    OpenState,
    number
  >;
  for (const it of filterLoose(items, { states: f.states }, flight)) {
    kinds[itemKindOf(it) as LooseKind] += 1;
  }
  for (const it of filterLoose(items, { kinds: f.kinds }, flight)) {
    states[openStateOf(it, flight)] += 1;
  }
  return { kinds, states };
}

// ------------------------------------------------------------ counts

/** The badge's words for an item's state on a card. */
export function stateOf(
  it: WorkItem,
  flight?: InFlight,
): {
  text: string;
  tone: "success" | "warning" | "info" | "secondary";
} {
  if (boardStatus(it, flight) === "in-progress") {
    return { text: "In progress", tone: "info" };
  }
  if (it.ready) {
    return { text: "Ready", tone: "success" };
  }
  if (it.blocked) {
    const n = it.open_needs.length;
    return { text: `Waits on ${n}`, tone: "secondary" };
  }
  return { text: STATE_NAMES[it.state], tone: "secondary" };
}

/** Item IDs in text ("needs CS-391"), for links in an item's body. */
export const ID_IN_TEXT = /\bCS-[1-9]\d*\b/g;

// ------------------------------------------------------------ whose move

/**
 * Who acts next on an open item (the distinction the page is built on,
 * since it is the one someone acts on):
 *
 * - the owner: an open decision the owner answers, or a Proposed item
 *   with nothing open before it (the owner commits it, or not);
 * - agents: ready work, and work in flight here or on another branch;
 * - outside: a wait on another party;
 * - items: waiting on other items to finish (nobody can act on it yet).
 */
export type Actor = "owner" | "agents" | "outside" | "items";

export function nextActor(it: WorkItem, flight?: InFlight): Actor | undefined {
  if (!isOpen(it)) {
    return undefined;
  }
  if (boardStatus(it, flight) === "in-progress") {
    return it.kind === "external" ? "outside" : "agents";
  }
  if (it.open_needs.length) {
    return "items";
  }
  if (it.kind === "external") {
    return "outside";
  }
  if (isOwnerDecision(it) || it.state === "proposed") {
    return "owner";
  }
  return "agents";
}

// ------------------------------------------------------------ flow

/** The stages work flows through, in order (Dropped leaves the flow). */
export const STAGES = [
  "Proposed",
  "Waiting",
  "Ready",
  "In flight",
  "Done",
] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_NAMES: Record<Stage, string> = {
  Proposed: "Proposed",
  Waiting: "Blocked",
  Ready: "Ready",
  "In flight": "In progress",
  Done: "Done",
};

/** An item's stage now (undefined once Dropped). */
export function stageOf(it: WorkItem, flight?: InFlight): Stage | undefined {
  const status = boardStatus(it, flight);
  return status === "dropped"
    ? undefined
    : status === "proposed"
      ? "Proposed"
      : status === "in-progress"
        ? "In flight"
        : status === "done"
          ? "Done"
          : it.open_needs.length
            ? "Waiting"
            : "Ready";
}

/**
 * Work someone is doing: work items In progress, here or on another
 * branch. A decision or an outside wait In progress is being discussed
 * or waits for an answer; nobody here holds it.
 */
export function workInProgress(
  items: readonly WorkItem[],
  flight?: InFlight,
): WorkItem[] {
  return items.filter(
    (it) => isWork(it) && stageOf(it, flight) === "In flight",
  );
}

/**
 * How many open items wait on each item, directly or through others: the
 * weight of everything behind it (cost of delay, until items carry one).
 */
export function unblocksOf(s: WorkSnapshot): Map<string, number> {
  const itemOf = new Map(s.items.map((i) => [i.id, i]));
  const memo = new Map<string, Set<string>>();
  const behind = (id: string, seen: Set<string>): Set<string> => {
    const known = memo.get(id);
    if (known) {
      return known;
    }
    const out = new Set<string>();
    if (seen.has(id)) {
      return out; // a cycle: the check reports it
    }
    seen.add(id);
    for (const d of itemOf.get(id)?.needed_by ?? []) {
      out.add(d);
      for (const x of behind(d, seen)) {
        out.add(x);
      }
    }
    seen.delete(id);
    memo.set(id, out);
    return out;
  };
  return new Map(s.items.map((i) => [i.id, behind(i.id, new Set()).size]));
}

const DAY = 86_400_000;
/** "Nov 14" style day keys are local days. */
const dayStart = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export interface Flow {
  /** The first day with history, and each day since (local midnights). */
  days: number[];
  /** Items in each stage at the end of each day; the last is now. */
  stocks: Record<Stage, number[]>;
  /** Items that entered or left each stage over the last `window` days. */
  arrived: Record<Stage, number>;
  left: Record<Stage, number>;
  window: number;
  /** When each open item entered its current stage (ms). */
  since: Map<string, number>;
  /** Days from Planned to Done for items finished in the window. */
  leadDays: number[];
  /** Items made in the window, after the tracker's first day (its import). */
  created: number;
}

/**
 * The tracker's stocks and flows, replayed from the status history: each
 * item's stage at the end of every day since the history begins, with
 * readiness from its needs' statuses that day. The last point is now, from
 * the snapshot (uncommitted changes and claims elsewhere included).
 */
export function flowOf(
  s: WorkSnapshot,
  items: readonly WorkItem[],
  {
    now = Date.now(),
    window = 7,
    flight,
  }: { now?: number; window?: number; flight?: InFlight } = {},
): Flow {
  const events = new Map<string, Array<{ t: number; state: State }>>();
  for (const e of s.history ?? []) {
    const list = events.get(e.id) ?? [];
    list.push({ t: Date.parse(e.at), state: e.state });
    events.set(e.id, list);
  }
  const first = Math.min(now, ...[...events.values()].map((l) => l[0]!.t));
  const days: number[] = [];
  for (let d = dayStart(first); d <= dayStart(now); d += DAY) {
    days.push(d);
  }
  const statusAt = (id: string, t: number): State | undefined => {
    let at: State | undefined;
    for (const e of events.get(id) ?? []) {
      if (e.t > t) {
        break;
      }
      at = e.state;
    }
    return at;
  };
  const itemOf = new Map(s.items.map((i) => [i.id, i]));
  const stageAt = (it: WorkItem, t: number): Stage | undefined => {
    const st = statusAt(it.id, t);
    if (!st || st === "dropped") {
      return undefined;
    }
    if (st === "planned") {
      const open = it.needs.some((n) => {
        const need = itemOf.get(n);
        return need ? statusAt(n, t) !== "done" : true;
      });
      return open ? "Waiting" : "Ready";
    }
    return st === "in-progress"
      ? "In flight"
      : st === "proposed"
        ? "Proposed"
        : "Done";
  };
  const empty = () =>
    Object.fromEntries(STAGES.map((x) => [x, 0])) as Record<Stage, number>;
  const stocks = Object.fromEntries(
    STAGES.map((x) => [x, days.map(() => 0)]),
  ) as Record<Stage, number[]>;
  const arrived = empty();
  const left = empty();
  const since = new Map<string, number>();
  const leadDays: number[] = [];
  const cutoff = now - window * DAY;
  // Flows are counted at every commit in the window (an item can arrive
  // and leave in one day). New items count from the day after the
  // history's first: that day is the tracker's import, not work arriving.
  const importDay = dayStart(first) + DAY;
  let created = 0;
  const moments = [
    ...new Set([...events.values()].flatMap((l) => l.map((e) => e.t))),
  ]
    .sort((a, b) => a - b)
    .filter((t) => t > first && t > cutoff);
  for (const it of items) {
    // Each day's end, then now from the snapshot.
    const path = days.map((d, i) =>
      i === days.length - 1 ? stageOf(it, flight) : stageAt(it, d + DAY - 1),
    );
    path.forEach((stage, i) => {
      if (stage) {
        stocks[stage][i]!++;
      }
    });
    let before = stageAt(it, Math.max(first, cutoff));
    for (const [n, t] of [...moments, now].entries()) {
      const after = n === moments.length ? stageOf(it, flight) : stageAt(it, t);
      // Moves between stages only: an item's creation is counted in
      // `created`, and its import isn't counted at all.
      if (after !== before && before) {
        left[before]++;
        if (after) {
          arrived[after]++;
        }
      }
      before = after;
    }
    const current = path.at(-1);
    if (current && current !== "Done") {
      let i = path.length - 1;
      while (i > 0 && path[i - 1] === current) {
        i--;
      }
      since.set(it.id, i === 0 ? first : days[i]!);
    }
    const list = events.get(it.id) ?? [];
    if (list[0] && list[0].t >= importDay && list[0].t >= cutoff) {
      created++;
    }
    const done = list.find((e) => e.state === "done");
    const planned = list.find(
      (e) => e.state === "planned" || e.state === "in-progress",
    );
    if (done && planned && done.t >= cutoff) {
      leadDays.push((done.t - planned.t) / DAY);
    }
  }
  return { days, stocks, arrived, left, window, since, leadDays, created };
}

/** A duration in words: "3 days", "5 hours", "under an hour". */
export function ageText(ms: number): string {
  if (ms < DAY) {
    const h = Math.floor(ms / 3_600_000);
    return h < 1 ? "under an hour" : `${h} ${h === 1 ? "hour" : "hours"}`;
  }
  const d = ms / DAY;
  return d < 1
    ? "under a day"
    : `${Math.floor(d)} ${Math.floor(d) === 1 ? "day" : "days"}`;
}

/**
 * How long ago, to the minute while under a day: "just now", "12 minutes
 * ago", "3 hours ago", "2 days ago". For live figures, where an hour's
 * granularity would hide what just started.
 */
export function agoText(ms: number): string {
  const m = Math.floor(Math.max(0, ms) / 60_000);
  if (m < 1) {
    return "just now";
  }
  if (m < 60) {
    return `${m} ${m === 1 ? "minute" : "minutes"} ago`;
  }
  const h = Math.floor(m / 60);
  if (h < 24) {
    return `${h} ${h === 1 ? "hour" : "hours"} ago`;
  }
  const d = Math.floor(h / 24);
  return `${d} ${d === 1 ? "day" : "days"} ago`;
}

export const median = (xs: readonly number[]): number | undefined => {
  if (!xs.length) {
    return undefined;
  }
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1]! + s[m]!) / 2;
};

/** The nearest-rank percentile (0 to 100), or nothing for no values. */
export const percentile = (
  xs: readonly number[],
  p: number,
): number | undefined => {
  if (!xs.length) {
    return undefined;
  }
  const s = [...xs].sort((a, b) => a - b);
  return s[
    Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1))
  ];
};

/** One finished thing on a chart over time: when it finished and how long it took (ms). */
export interface MeasurePoint {
  id: string;
  t: number;
  v: number;
  /** Still open: `t` is now and `v` how long it has waited so far. */
  open?: boolean;
}

/**
 * The measures human-in-the-lead uses in place of velocity (its design,
 * part 11.1), as far as the tracker's history holds them, each with its
 * history for a chart. Durations are in milliseconds. Token measures need
 * its ledger and are left out.
 */
export interface Measures {
  /** Planned to Done, over every item finished since the history began. */
  lead: number[];
  leadPoints: MeasurePoint[];
  /** Owner decisions: asked (created) to answered (Done). */
  decisionLatency: number[];
  /** Owner decisions still open: how long each has been asked. */
  decisionsOpen: number[];
  /** Answered decisions at their answer, and open ones now at their age. */
  decisionPoints: MeasurePoint[];
  /** Open items that wait on an open owner decision, directly. */
  blocked: { items: number; decisions: number; itemDays: number };
  /** The same count at the end of each of the flow's days (the last is now). */
  blockedDaily: number[];
  /** Items carrying a token estimate (`estimate_tokens`). */
  estimated: number;
}

export function measuresOf(
  s: WorkSnapshot,
  items: readonly WorkItem[],
  flow: Flow,
  now = Date.now(),
): Measures {
  const events = new Map<string, Array<{ t: number; state: State }>>();
  for (const e of s.history ?? []) {
    const list = events.get(e.id) ?? [];
    list.push({ t: Date.parse(e.at), state: e.state });
    events.set(e.id, list);
  }
  for (const list of events.values()) {
    list.sort((a, b) => a.t - b.t);
  }
  const statusAt = (id: string, t: number): State | undefined => {
    let at: State | undefined;
    for (const e of events.get(id) ?? []) {
      if (e.t > t) {
        break;
      }
      at = e.state;
    }
    return at;
  };
  const itemOf = new Map(s.items.map((i) => [i.id, i]));
  const lead: number[] = [];
  const leadPoints: MeasurePoint[] = [];
  const decisionLatency: number[] = [];
  const decisionsOpen: number[] = [];
  const decisionPoints: MeasurePoint[] = [];
  for (const it of items) {
    const list = events.get(it.id) ?? [];
    const done = list.find((e) => e.state === "done");
    const planned = list.find(
      (e) => e.state === "planned" || e.state === "in-progress",
    );
    if (done && planned) {
      lead.push(done.t - planned.t);
      leadPoints.push({ id: it.id, t: done.t, v: done.t - planned.t });
    }
    if (it.kind === "decision" && it.decider === "owner") {
      // Asked when it was made: its creation date, or its first commit.
      const made = it.created ? Date.parse(`${it.created}T00:00`) : NaN;
      const asked = Number.isNaN(made) ? list[0]?.t : made;
      if (asked === undefined) {
        continue;
      }
      if (it.state === "done" && done) {
        const v = Math.max(0, done.t - asked);
        decisionLatency.push(v);
        decisionPoints.push({ id: it.id, t: done.t, v });
      } else if (isOpen(it)) {
        decisionsOpen.push(now - asked);
        decisionPoints.push({ id: it.id, t: now, v: now - asked, open: true });
      }
    }
  }
  const isOpenStatus = (st?: State) =>
    st !== undefined && st !== "done" && st !== "dropped";
  // Items waiting on an open owner decision at a moment, from the history.
  const blockedAt = (t: number) =>
    items.filter(
      (it) =>
        isOpenStatus(statusAt(it.id, t)) &&
        it.needs.some((n) => {
          const need = itemOf.get(n);
          return need && isOwnerDecision(need) && isOpenStatus(statusAt(n, t));
        }),
    ).length;
  const behind = new Set<string>();
  let blockedItems = 0;
  let itemDays = 0;
  for (const it of items) {
    if (!isOpen(it)) {
      continue;
    }
    const on = it.open_needs.filter((n) => {
      const need = itemOf.get(n);
      return need && isOwnerDecision(need) && isOpen(need);
    });
    if (on.length) {
      blockedItems++;
      on.forEach((n) => behind.add(n));
      itemDays += (now - (flow.since.get(it.id) ?? now)) / DAY;
    }
  }
  return {
    lead,
    leadPoints,
    decisionLatency,
    decisionsOpen,
    decisionPoints,
    blocked: { items: blockedItems, decisions: behind.size, itemDays },
    blockedDaily: flow.days.map((d, i) =>
      i === flow.days.length - 1 ? blockedItems : blockedAt(d + DAY - 1),
    ),
    estimated: items.filter(
      (it) =>
        (it as { estimate_tokens?: unknown }).estimate_tokens !== undefined,
    ).length,
  };
}

/**
 * A milestone's critical path: the longest chain of needs among its
 * constraints (all of them, done or not), and how much of it is done.
 */
export function criticalPathOf(
  m: WorkMilestone,
  itemOf: ReadonlyMap<string, WorkItem>,
): { path: WorkItem[]; done: number } {
  const ids = new Set(m.constraints.map((c) => c.id));
  const memo = new Map<string, WorkItem[]>();
  const longest = (id: string, seen: Set<string>): WorkItem[] => {
    const hit = memo.get(id);
    if (hit) {
      return hit;
    }
    const it = itemOf.get(id);
    if (!it || seen.has(id)) {
      return [];
    }
    seen.add(id);
    let best: WorkItem[] = [];
    for (const n of it.needs) {
      if (ids.has(n)) {
        const p = longest(n, seen);
        if (p.length > best.length) {
          best = p;
        }
      }
    }
    seen.delete(id);
    const path = [...best, it];
    memo.set(id, path);
    return path;
  };
  let path: WorkItem[] = [];
  for (const id of ids) {
    const p = longest(id, new Set());
    if (p.length > path.length) {
      path = p;
    }
  }
  return { path, done: path.filter((it) => it.state === "done").length };
}

// ------------------------------------------------------------ dependencies

export interface DependencyMatrix {
  /**
   * The projects that wait on or are waited on by another, ordered so a
   * project comes after the ones it needs where it can (a cycle keeps
   * what's left in the order found): marks then sit below the diagonal,
   * and one above it is a project waiting on one listed after it.
   */
  order: string[];
  /** "waiting|needed" → the waiting project's open items that need it. */
  cells: Map<string, string[]>;
  /** Projects in the scope that wait on no other and none waits on. */
  alone: string[];
}

/**
 * Projects against projects (a design structure matrix): each cell counts
 * the open items of the row's project that need an open item of the
 * column's project.
 */
export function dependencyMatrix(
  s: WorkSnapshot,
  items: readonly WorkItem[],
): DependencyMatrix {
  const itemOf = new Map(s.items.map((i) => [i.id, i]));
  const cells = new Map<string, string[]>();
  for (const it of items) {
    if (!isOpen(it) || !it.project) {
      continue;
    }
    for (const n of it.open_needs) {
      const q = itemOf.get(n)?.project;
      if (q && q !== it.project) {
        const key = `${it.project}|${q}`;
        const list = cells.get(key) ?? [];
        if (!list.includes(it.id)) {
          list.push(it.id);
        }
        cells.set(key, list);
      }
    }
  }
  const involved = new Set([...cells.keys()].flatMap((k) => k.split("|")));
  const needs = new Map<string, Set<string>>();
  for (const k of cells.keys()) {
    const [from, to] = k.split("|") as [string, string];
    needs.set(from, (needs.get(from) ?? new Set()).add(to));
  }
  // Upstream first: Kahn's order over "needs", the project order as tie-break.
  const projectOrder = s.projects
    .map((p) => p.id)
    .filter((id) => involved.has(id));
  const order: string[] = [];
  const placed = new Set<string>();
  while (order.length < projectOrder.length) {
    const next =
      projectOrder.find(
        (id) =>
          !placed.has(id) &&
          [...(needs.get(id) ?? [])].every((n) => placed.has(n)),
      ) ?? projectOrder.find((id) => !placed.has(id))!;
    order.push(next);
    placed.add(next);
  }
  const scoped = new Set(items.map((i) => i.project).filter(Boolean));
  return {
    order,
    cells,
    alone: s.projects
      .map((p) => p.id)
      .filter((id) => scoped.has(id) && !involved.has(id)),
  };
}

/**
 * The longest chains of open items, each item needing the one before:
 * for every item nothing open precedes (a chain's start), the longest
 * path from it, longest first. The first is the critical path by count,
 * until items carry a size.
 */
export function longestChains(items: readonly WorkItem[]): WorkItem[][] {
  const open = new Map(items.filter(isOpen).map((i) => [i.id, i]));
  const memo = new Map<string, string[]>();
  const from = (id: string, seen: Set<string>): string[] => {
    const known = memo.get(id);
    if (known) {
      return known;
    }
    if (seen.has(id)) {
      return [id]; // a cycle: the check reports it
    }
    seen.add(id);
    let best: string[] = [];
    for (const d of open.get(id)?.needed_by ?? []) {
      if (open.has(d)) {
        const tail = from(d, seen);
        if (tail.length > best.length) {
          best = tail;
        }
      }
    }
    seen.delete(id);
    const path = [id, ...best];
    memo.set(id, path);
    return path;
  };
  const chains: WorkItem[][] = [];
  for (const [id, it] of open) {
    if (!it.open_needs.some((n) => open.has(n))) {
      const path = from(id, new Set());
      if (path.length > 1) {
        chains.push(path.map((x) => open.get(x)!));
      }
    }
  }
  return chains.sort(
    (a, b) => b.length - a.length || idNumber(a[0]!.id) - idNumber(b[0]!.id),
  );
}

// ------------------------------------------------------------ the roadmap

export interface RoadmapRow {
  /** The milestone or release gate. */
  id: string;
  title: string;
  /** Its items in each stage. */
  counts: Record<Stage, number>;
  /** The others it waits on, with the open items behind each wait. */
  waitsOn: Array<{ id: string; items: string[] }>;
  /** Its step in the order: 1 waits on nothing outside its group, … */
  step: number;
  /** Those that wait on each other (one group per loop); alone, one. */
  group: string[];
}

/**
 * Orders groups of items (milestones, and release gates) by the needs between
 * their items, plus any explicit waits (a milestone that needs another).
 * Those that wait on each other, directly or round a loop, form one group
 * (a strongly connected component) and move together; a group's step is
 * one more than the latest step of any group it waits on.
 */
export function orderOf(
  entities: ReadonlyArray<{
    id: string;
    title: string;
    members: readonly string[];
    needs?: readonly string[];
  }>,
  s: WorkSnapshot,
  items: readonly WorkItem[],
  flight?: InFlight,
): RoadmapRow[] {
  const ids = entities.map((e) => e.id);
  const holders = new Map<string, string[]>();
  for (const e of entities) {
    for (const m of e.members) {
      holders.set(m, [...(holders.get(m) ?? []), e.id]);
    }
  }
  const scoped = new Set(items.map((i) => i.id));
  const itemOf = new Map(s.items.map((i) => [i.id, i]));
  const waits = new Map(ids.map((id) => [id, new Map<string, string[]>()]));
  const counts = new Map(
    ids.map((id) => [
      id,
      Object.fromEntries(STAGES.map((st) => [st, 0])) as Record<Stage, number>,
    ]),
  );
  for (const e of entities) {
    // The bars count work. Decisions and outside waits hold an entity up
    // but aren't its work, so they count only where it holds no work (a
    // milestone that is the decision, say).
    const inScope = e.members
      .map((m) => itemOf.get(m))
      .filter((it): it is WorkItem => !!it && scoped.has(it.id));
    const counted = inScope.some(isWork) ? inScope.filter(isWork) : inScope;
    for (const it of counted) {
      const st = stageOf(it, flight);
      if (st) {
        counts.get(e.id)![st]++;
      }
    }
    for (const m of e.members) {
      const it = itemOf.get(m);
      if (!it || !scoped.has(m)) {
        continue;
      }
      if (!isOpen(it)) {
        continue;
      }
      for (const n of it.open_needs) {
        for (const b of holders.get(n) ?? []) {
          if (b !== e.id && !(holders.get(m) ?? []).includes(b)) {
            const list = waits.get(e.id)!.get(b) ?? [];
            if (!list.includes(m)) {
              list.push(m);
            }
            waits.get(e.id)!.set(b, list);
          }
        }
      }
    }
    for (const b of e.needs ?? []) {
      if (waits.has(b) && !waits.get(e.id)!.has(b)) {
        waits.get(e.id)!.set(b, []);
      }
    }
  }
  // Groups: Tarjan's strongly connected components over "waits on".
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const groupOf = new Map<string, string[]>();
  let next = 0;
  const strong = (v: string) => {
    index.set(v, next);
    low.set(v, next++);
    stack.push(v);
    onStack.add(v);
    for (const w of waits.get(v)!.keys()) {
      if (!index.has(w)) {
        strong(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v)!, index.get(w)!));
      }
    }
    if (low.get(v) === index.get(v)) {
      const group: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        group.push(w);
      } while (w !== v);
      group.sort((x, y) => idNumber(x) - idNumber(y));
      for (const x of group) {
        groupOf.set(x, group);
      }
    }
  };
  for (const id of ids) {
    if (!index.has(id)) {
      strong(id);
    }
  }
  const stepOf = new Map<string[], number>();
  const step = (group: string[]): number => {
    const known = stepOf.get(group);
    if (known !== undefined) {
      return known;
    }
    let n = 1;
    for (const x of group) {
      for (const b of waits.get(x)!.keys()) {
        const other = groupOf.get(b)!;
        if (other !== group) {
          n = Math.max(n, step(other) + 1);
        }
      }
    }
    stepOf.set(group, n);
    return n;
  };
  return entities
    .map((e) => ({
      id: e.id,
      title: e.title,
      counts: counts.get(e.id)!,
      waitsOn: [...waits.get(e.id)!].map(([id, list]) => ({ id, items: list })),
      step: step(groupOf.get(e.id)!),
      group: groupOf.get(e.id)!,
    }))
    .sort(
      (a, b) =>
        a.step - b.step ||
        idNumber(a.group[0]!) - idNumber(b.group[0]!) ||
        idNumber(a.id) - idNumber(b.id),
    );
}

/**
 * The snapshot without its proposed milestones: committed work, which is
 * what the roadmap shows unless proposals are asked for.
 */
export function committedOnly(s: WorkSnapshot): WorkSnapshot {
  return s.milestones.some((m) => m.state === "proposed")
    ? { ...s, milestones: s.milestones.filter((m) => m.state !== "proposed") }
    : s;
}

/**
 * A proposed milestone's bar: one gray stretch, all of it proposed, so it
 * can't be read as committed work whatever its items' stages. A committed
 * milestone's counts come back as they are.
 */
export function barCounts(
  counts: Record<Stage, number>,
  proposed: boolean,
): Record<Stage, number> {
  if (!proposed) {
    return counts;
  }
  const all = STAGES.reduce((n, st) => n + counts[st], 0);
  return { Proposed: all, Waiting: 0, Ready: 0, "In flight": 0, Done: 0 };
}

/**
 * Milestones in the order they can be reached (human-in-the-lead's
 * milestone graph), from their constraints' needs and their own needs on
 * other milestones. Done and dropped milestones are left out.
 */
export function milestoneRoadmapOf(
  s: WorkSnapshot,
  items: readonly WorkItem[],
  flight?: InFlight,
  /** Proposed milestones too: bets not yet made. */
  proposals = false,
): RoadmapRow[] {
  const ids = new Set(s.milestones.map((m) => m.id));
  const held = new Set(
    s.milestones.flatMap((m) => m.constraints.map((c) => c.id)),
  );
  return orderOf(
    [
      ...s.milestones
        .filter(
          (m) =>
            m.state !== "done" &&
            m.state !== "dropped" &&
            (proposals || m.state !== "proposed"),
        )
        .map((m) => ({
          id: m.id,
          title: m.title,
          members: m.constraints.map((c) => c.id).filter((id) => !ids.has(id)),
          needs: m.constraints.map((c) => c.id).filter((id) => ids.has(id)),
        })),
      // Each open release item is a gate: it waits on the milestones it
      // needs, and on the items it needs, directly or through their
      // milestones. Needed items no milestone holds go in with it, so what
      // they wait on places the gate too.
      ...s.items
        .filter(
          (it) =>
            isReleaseItem(it) &&
            isOpen(it) &&
            (proposals || it.state !== "proposed"),
        )
        .map((it) => ({
          id: it.id,
          title: it.title,
          members: [
            it.id,
            ...it.needs.filter((id) => !ids.has(id) && !held.has(id)),
          ],
          needs: it.needs.filter((id) => ids.has(id)),
        })),
    ],
    s,
    items,
    flight,
  );
}

// ------------------------------------------------------------ releases

/**
 * A release on the roadmap: a flag placed after the last milestone it
 * needs. A release whose milestones aren't chosen yet has no place, and
 * says why, rather than a guessed one.
 */
export interface ReleaseFlag {
  /** The release item. */
  id: string;
  /** The version it makes ("2.0.0-alpha.1"). */
  version: string;
  title: string;
  /** A proposed release, not committed yet (shown only with proposals). */
  proposed?: boolean;
  /**
   * The open milestones its release item needs itself (CS-685): exactly
   * the milestones it names, never those it reaches through their items.
   */
  feeds: string[];
  /** The releases it needs: those that come before it. */
  after: string[];
  /**
   * The milestones that place it: those it waits on that finish last. In
   * a view in steps, these can be milestones it doesn't need itself (a
   * closure violation); with release bands, they close its band.
   */
  last: string[];
  /**
   * Where it falls: the end of the last milestone it needs, in the view's
   * measure (a step, or tokens). Absent when it has no place, or when the
   * milestones that place it are outside the view.
   */
  at?: number;
  /**
   * Why it has no place yet: the open decisions it needs (which
   * milestones it needs, say), and the releases it needs that have none
   * either. Both empty: it names no milestone at all yet.
   */
  unplaced?: { decisions: string[]; releases: string[] };
}

/**
 * The open release items as flags, in the order they fall. `rows` is the
 * milestone roadmap with its release gates (`milestoneRoadmapOf`), which
 * says what each waits on; `endOf` gives where a milestone ends in the
 * view (undefined for one the view leaves out).
 */
export function releaseFlagsOf(
  s: WorkSnapshot,
  rows: readonly RoadmapRow[],
  endOf: (milestone: string) => number | undefined,
): ReleaseFlag[] {
  const itemOf = new Map(s.items.map((i) => [i.id, i]));
  const msIds = new Set(s.milestones.map((m) => m.id));
  const rowOf = new Map(rows.map((r) => [r.id, r]));
  const upstreamOf = (id: string) => {
    const seen = new Set<string>();
    const stack = [id];
    while (stack.length) {
      for (const w of rowOf.get(stack.pop()!)?.waitsOn ?? []) {
        if (!seen.has(w.id) && w.id !== id) {
          seen.add(w.id);
          stack.push(w.id);
        }
      }
    }
    return seen;
  };
  const unplacedMemo = new Map<string, ReleaseFlag["unplaced"]>();
  const unplacedOf = (id: string, feeds: string[]): ReleaseFlag["unplaced"] => {
    if (unplacedMemo.has(id)) {
      return unplacedMemo.get(id);
    }
    unplacedMemo.set(id, undefined); // a loop of releases ends here
    const it = itemOf.get(id)!;
    const open = it.needs
      .map((n) => itemOf.get(n))
      .filter((n): n is WorkItem => !!n && isOpen(n));
    const decisions = open
      .filter((n) => n.kind === "decision")
      .map((n) => n.id);
    const releases = open
      .filter(
        (n) =>
          isReleaseItem(n) &&
          !!unplacedOf(
            n.id,
            [...upstreamOf(n.id)].filter((x) => msIds.has(x)),
          ),
      )
      .map((n) => n.id);
    const out =
      decisions.length || releases.length || !feeds.length
        ? { decisions, releases }
        : undefined;
    unplacedMemo.set(id, out);
    return out;
  };
  const msOf = new Map(s.milestones.map((m) => [m.id, m]));
  const flags = rows
    .filter((r) => isReleaseItem(itemOf.get(r.id)))
    .map((r): ReleaseFlag => {
      const it = itemOf.get(r.id)!;
      // Placed by everything it waits on; it lists only what it names.
      const upstream = [...upstreamOf(r.id)]
        .filter((x) => msIds.has(x))
        .sort((a, b) => idNumber(a) - idNumber(b));
      const feeds = it.needs
        .filter((n) => {
          const m = msOf.get(n);
          return !!m && m.state !== "done" && m.state !== "dropped";
        })
        .sort((a, b) => idNumber(a) - idNumber(b));
      const unplaced = unplacedOf(r.id, upstream);
      const ends = upstream
        .map((f) => [f, endOf(f)] as const)
        .filter((e): e is readonly [string, number] => e[1] !== undefined);
      const at =
        unplaced || !ends.length
          ? undefined
          : Math.max(...ends.map(([, e]) => e));
      return {
        id: r.id,
        version: it.release ?? r.title,
        title: r.title,
        ...(it.state === "proposed" ? { proposed: true } : {}),
        feeds,
        after: it.needs
          .filter((n) => isReleaseItem(itemOf.get(n)))
          .sort((a, b) => idNumber(a) - idNumber(b)),
        last:
          at === undefined
            ? []
            : ends.filter(([, e]) => e === at).map(([f]) => f),
        at,
        unplaced,
      };
    });
  return flags.sort(
    (a, b) =>
      (a.at ?? Infinity) - (b.at ?? Infinity) ||
      idNumber(a.id) - idNumber(b.id),
  );
}

// ------------------------------------------------------------ release closure

/**
 * The closure rule (CS-685; the owner, 2026-11-17): a release needs
 * milestones only, and every open item a milestone it needs pulls in,
 * directly or through other items, belongs to a milestone the same
 * release needs, or to no milestone. A release needs what the releases
 * before it need too. A break is fixed in the tracker, by moving the item
 * or splitting its milestone, never explained away on screen.
 */
export interface ClosureViolation {
  /** The release whose milestones pull it in. */
  release: string;
  /** What it pulls in: an item, or a milestone a milestone names. */
  item: string;
  /**
   * How: "item", an item in a milestone the release doesn't need;
   * "milestone", a milestone the release doesn't need named by one it
   * does; "direct", an item the release needs itself rather than through
   * a milestone.
   */
  kind: "item" | "milestone" | "direct";
  /**
   * The milestones that hold the item, none of them one the release
   * needs (for "milestone", the milestone itself). Empty for a direct
   * need on an item no milestone holds.
   */
  milestones: string[];
  /** The needs from the release to it, the release first and it last. */
  path: string[];
}

/** One release as the closure rule reads it. */
export interface ReleaseClosure {
  id: string;
  version: string;
  title: string;
  proposed: boolean;
  /** The open milestones it names. */
  milestones: string[];
  /** The releases it names: those that come before it. */
  after: string[];
  /** Its milestones and those of every release before it. */
  closure: Set<string>;
  violations: ClosureViolation[];
}

/**
 * The open releases in ladder order (alpha.1, beta.1, rc.1, 2.0.0): each
 * after the releases it needs, by number where nothing orders them.
 */
export function releaseLadderOf(
  s: WorkSnapshot,
  /** Proposed releases too. */
  proposals = true,
): WorkItem[] {
  const open = s.items
    .filter(
      (it) =>
        isReleaseItem(it) &&
        isOpen(it) &&
        (proposals || it.state !== "proposed"),
    )
    .sort((a, b) => idNumber(a.id) - idNumber(b.id));
  const ids = new Set(open.map((it) => it.id));
  const out: WorkItem[] = [];
  const placed = new Set<string>();
  while (out.length < open.length) {
    // The first by number whose earlier releases are all placed; a loop
    // of releases (a tracker error) breaks at its lowest number.
    const next =
      open.find(
        (it) =>
          !placed.has(it.id) &&
          it.needs.every((n) => !ids.has(n) || placed.has(n)),
      ) ?? open.find((it) => !placed.has(it.id))!;
    placed.add(next.id);
    out.push(next);
  }
  return out;
}

/**
 * Each open release's milestones and the breaks of the closure rule
 * below them, in ladder order. Reads the snapshot as given: pass
 * `committedOnly(s)` for committed work alone, where a proposed
 * milestone's items count as in no milestone.
 */
export function releaseClosuresOf(
  s: WorkSnapshot,
  proposals = true,
): ReleaseClosure[] {
  const itemOf = new Map(s.items.map((i) => [i.id, i]));
  const msOf = new Map(
    s.milestones.filter((m) => m.state !== "dropped").map((m) => [m.id, m]),
  );
  const holders = new Map<string, string[]>();
  for (const m of msOf.values()) {
    for (const c of m.constraints) {
      if (!msOf.has(c.id)) {
        holders.set(c.id, [...(holders.get(c.id) ?? []), m.id]);
      }
    }
  }
  const openMs = (id: string) => {
    const m = msOf.get(id);
    return !!m && m.state !== "done";
  };
  const ladder = releaseLadderOf(s, proposals);
  const closureOf = new Map<string, Set<string>>();
  return ladder.map((r): ReleaseClosure => {
    const own = r.needs.filter((n) => msOf.has(n));
    const after = r.needs.filter((n) => isReleaseItem(itemOf.get(n)));
    const closure = new Set(own);
    for (const a of after) {
      for (const m of closureOf.get(a) ?? []) {
        closure.add(m);
      }
    }
    closureOf.set(r.id, closure);
    // Breadth first from the release, so each break comes with its
    // shortest path of needs.
    const violations: ClosureViolation[] = [];
    const from = new Map<string, string>([[r.id, ""]]);
    const queue: string[] = [];
    const pathTo = (id: string) => {
      const path = [id];
      for (let at = from.get(id)!; at; at = from.get(at)!) {
        path.unshift(at);
      }
      return path;
    };
    const visit = (id: string, via: string) => {
      if (!from.has(id)) {
        from.set(id, via);
        queue.push(id);
      }
    };
    for (const n of r.needs) {
      visit(n, r.id);
    }
    while (queue.length) {
      const id = queue.shift()!;
      const direct = from.get(id) === r.id;
      if (msOf.has(id)) {
        if (!openMs(id)) {
          continue;
        }
        if (!closure.has(id)) {
          violations.push({
            release: r.id,
            item: id,
            kind: "milestone",
            milestones: [id],
            path: pathTo(id),
          });
          continue;
        }
        for (const c of msOf.get(id)!.constraints) {
          visit(c.id, id);
        }
        continue;
      }
      const it = itemOf.get(id);
      // Done work pulls nothing in; an earlier release answers for its own.
      if (!it || !isOpen(it) || isReleaseItem(it)) {
        continue;
      }
      const held = holders.get(id) ?? [];
      const inside = held.some((m) => closure.has(m));
      if (direct) {
        violations.push({
          release: r.id,
          item: id,
          kind: "direct",
          milestones: held.filter((m) => !closure.has(m)),
          path: pathTo(id),
        });
        if (held.length && !inside) {
          continue;
        }
      } else if (held.length && !inside) {
        violations.push({
          release: r.id,
          item: id,
          kind: "item",
          milestones: held,
          path: pathTo(id),
        });
        continue;
      }
      for (const n of it.open_needs) {
        visit(n, id);
      }
    }
    return {
      id: r.id,
      version: r.release ?? r.title,
      title: r.title,
      proposed: r.state === "proposed",
      milestones: own.filter(openMs),
      after,
      closure,
      violations,
    };
  });
}

/** The band of the milestones no release needs. */
export const NO_RELEASE = "no-release";

/** One release band: the milestones a release is the first to need. */
export interface ReleaseBand {
  /** The release item, or `NO_RELEASE`. */
  id: string;
  /** Its version ("2.0.0-alpha.1"); "No release" for the last band. */
  name: string;
  /** Its open milestones, by number. */
  milestones: string[];
}

/**
 * The roadmap's release bands (CS-685; the owner, 2026-11-18: "a release
 * is just a special milestone"): one per release in ladder order, then
 * one for the milestones no release needs. Each open milestone sits in
 * the band of the earliest release that needs it.
 */
export function releaseBandsOf(
  s: WorkSnapshot,
  closures: readonly ReleaseClosure[],
): { bands: ReleaseBand[]; bandOf: Map<string, number> } {
  const bandOf = new Map<string, number>();
  const open = s.milestones
    .filter((m) => m.state !== "done" && m.state !== "dropped")
    .sort((a, b) => idNumber(a.id) - idNumber(b.id));
  for (const m of open) {
    const k = closures.findIndex((c) => c.closure.has(m.id));
    bandOf.set(m.id, k < 0 ? closures.length : k);
  }
  closures.forEach((c, k) => bandOf.set(c.id, k));
  const bands: ReleaseBand[] = [
    ...closures.map((c) => ({ id: c.id, name: c.version, milestones: [] })),
    { id: NO_RELEASE, name: "No release", milestones: [] as string[] },
  ];
  for (const m of open) {
    bands[bandOf.get(m.id)!]!.milestones.push(m.id);
  }
  return { bands, bandOf };
}

/**
 * The steps inside each band: a milestone's step counts only the waits on
 * milestones in its own band, since those in earlier bands are done by
 * the time its band begins (a wait on a later band is a closure
 * violation, and places nothing). Rows come from `orderOf`.
 */
export function bandStepsOf(
  rows: readonly RoadmapRow[],
  bandOf: ReadonlyMap<string, number>,
): Map<string, number> {
  const band = (id: string) => bandOf.get(id) ?? Infinity;
  const keyOf = (r: RoadmapRow) => `${band(r.id)}:${r.group.join()}`;
  const rowOf = new Map(rows.map((r) => [r.id, r]));
  const memo = new Map<string, number>();
  const stepOfKey = (key: string): number => {
    const known = memo.get(key);
    if (known !== undefined) {
      return known;
    }
    memo.set(key, 1); // a loop ends here
    let n = 1;
    for (const r of rows.filter((x) => keyOf(x) === key)) {
      for (const w of r.waitsOn) {
        const other = rowOf.get(w.id);
        if (other && band(w.id) === band(r.id) && keyOf(other) !== key) {
          n = Math.max(n, stepOfKey(keyOf(other)) + 1);
        }
      }
    }
    memo.set(key, n);
    return n;
  };
  return new Map(rows.map((r) => [r.id, stepOfKey(keyOf(r))]));
}

/** The map's id prefix for a project's items that no milestone holds. */
export const UNSHAPED = "unshaped-";
/** The prefix for lanes outside a focused release. */
const OUTSIDE = "outside-";

/**
 * A map entity's items: a milestone's constraints, a release item's own
 * item needs, or a project's items no milestone holds.
 */
export function mapEntityItems(s: WorkSnapshot, id: string): string[] {
  if (id.startsWith(UNSHAPED)) {
    const project = id.slice(UNSHAPED.length);
    const covered = new Set(
      s.milestones.flatMap((m) => m.constraints.map((c) => c.id)),
    );
    return s.items
      .filter(
        (it) => it.project === project && isOpen(it) && !covered.has(it.id),
      )
      .map((it) => it.id);
  }
  const release = s.items.find((it) => it.id === id);
  if (release && isReleaseItem(release)) {
    const ms = new Set(s.milestones.map((m) => m.id));
    return release.needs.filter((n) => !ms.has(n));
  }
  return (
    s.milestones.find((m) => m.id === id)?.constraints.map((c) => c.id) ?? []
  );
}

/** A map entity's name: the milestone's, or "<project>: not in a milestone yet". */
export function mapEntityTitle(s: WorkSnapshot, id: string): string {
  if (id.startsWith(UNSHAPED)) {
    const project = id.slice(UNSHAPED.length);
    return `${s.projects.find((p) => p.id === project)?.title ?? project}: not in a milestone yet`;
  }
  return (
    s.milestones.find((m) => m.id === id)?.title ??
    s.items.find((it) => it.id === id)?.title ??
    s.projects.find((p) => p.id === id)?.title ??
    id
  );
}

/** One milestone on the map: where it sits, how much of it is left, and why. */
export interface MapNode {
  id: string;
  title: string;
  lane: string;
  /** Its row within the lane, so bars that overlap stack. */
  sub: number;
  /** Earliest start and finish along the waits, in steps or tokens. */
  x0: number;
  x1: number;
  /** How far it can slip before it delays the last milestone (total slack). */
  slack: number;
  critical: boolean;
  counts: Record<Stage, number>;
  /** Open owner decisions it holds or its open items need directly. */
  decisions: number;
  /** Open waits on other parties it holds or its open items need directly. */
  outside: number;
  /**
   * Tokens left on its open items, and how many of them carry an estimate;
   * its budget (its appetite, or else every item's estimate together) and
   * what has been spent, once the ledger records it.
   */
  tokens: {
    left: number;
    estimated: number;
    open: number;
    appetite?: number;
    budget?: number;
    spent?: number;
  };
  /** Those that wait on each other (a loop), when it is in one. */
  loop?: string[];
  /** What placed it: the milestones it waits on that finish last. */
  after: string[];
  /** Under way (an item done or in flight) or not started yet. */
  started: boolean;
  /** A project's open items that no milestone holds yet. */
  unshaped: boolean;
  /**
   * An open decision of the owner's that no milestone holds (CS-683): its
   * id is the decision's, its title the question.
   */
  decision: boolean;
  /**
   * The items to name on it, most waited on first: a project's items in
   * no milestone, or the open items that wait on a decision. None for a
   * milestone.
   */
  items: string[];
  /** A proposed milestone: not committed yet (shown only when asked for). */
  proposed: boolean;
  /** Its release band (`MilestoneMap.bands`), when the map is in bands. */
  band?: number;
}

export interface MapEdge {
  from: string;
  to: string;
  /** The open items behind the wait; none when the milestone names the other itself. */
  items: string[];
  critical: boolean;
  /** A wait to or from work no milestone holds yet: context, not order. */
  soft?: boolean;
}

export interface MilestoneMap {
  nodes: MapNode[];
  edges: MapEdge[];
  /** Lanes; `outside` ones hold what a release in focus doesn't need. */
  lanes: Array<{ id: string; title: string; subs: number; outside: boolean }>;
  /** The end of the longest path: steps, or tokens. */
  total: number;
  /** The end slack is measured to: the release in focus, or `total`. */
  end: number;
  unit: "steps" | "tokens";
  /** The critical path's milestones, first to last. */
  path: string[];
  /** Whether any open item or milestone carries a token figure at all. */
  hasTokens: boolean;
  /** Milestones already done, most recent first: where the map begins. */
  done: Array<{ id: string; title: string }>;
  /** The release gates, to focus on. */
  gates: Array<{ id: string; title: string }>;
  /** The releases as flags along the top, after the milestones that feed each. */
  flags: MapFlag[];
  /** The release in focus, if any. */
  focus?: string;
  /** How the map is arranged: in release bands, or by steps alone. */
  arrange: Arrange;
  /**
   * The release bands, in ladder order, each with where it begins and
   * ends; none when the map is arranged by steps alone. A band no
   * milestone sits in is left out.
   */
  bands: Array<ReleaseBand & { x0: number; x1: number }>;
  /** Each open release's milestones and the closure rule's breaks. */
  closures: ReleaseClosure[];
}

/**
 * How the roadmap is arranged (CS-685): in release bands, each release's
 * milestones together and its flag closing them, or by steps alone, the
 * pure dependency view.
 */
export type Arrange = "release" | "steps";

/** A release's flag on the map, with its progress over what it needs. */
export interface MapFlag extends ReleaseFlag {
  progress: {
    milestones: number;
    milestonesDone: number;
    items: number;
    itemsDone: number;
    tokensLeft: number;
    decisions: number;
  };
}

/**
 * The milestones as a plan without dates: each placed at its earliest
 * start after everything it waits on (a forward pass, as in the critical
 * path method), measured in steps or in the tokens left on the way. A
 * backward pass gives each one's slack; the critical path is where the
 * slack is none. Milestones in a loop move together as one. Lanes are
 * their projects.
 */
export function milestoneMapOf(
  snapshot: WorkSnapshot,
  flight: InFlight | undefined,
  unit: "steps" | "tokens",
  /** A release gate to measure to: what it needs, and the rest apart. */
  focus?: string,
  /**
   * Proposed milestones (and release items) too, placed by their waits as
   * committed ones are. The roadmap is committed work by default.
   */
  proposals = false,
  /** In release bands, or by steps alone. */
  arrange: Arrange = "steps",
): MilestoneMap {
  const s = proposals ? snapshot : committedOnly(snapshot);
  const itemOf = new Map(s.items.map((i) => [i.id, i]));
  const msOf = new Map(s.milestones.map((m) => [m.id, m]));
  const projectOf = new Map(s.projects.map((p) => [p.id, p]));
  // Each project's open work that no milestone holds stands together as
  // one bar ("not in a milestone yet"), for context: placed after the
  // milestones they wait on, they never move a milestone (lumping a
  // project's items together would make loops its items don't have).
  // Each of the owner's open decisions that no milestone holds is a card of
  // its own in its project's lane, placed the same way (CS-683). Outside
  // waits no milestone holds stay off the map, in Waiting outside.
  const covered = new Set(
    s.milestones.flatMap((m) => m.constraints.map((c) => c.id)),
  );
  const loose = (it: WorkItem) =>
    !!it.project &&
    isOpen(it) &&
    !isReleaseItem(it) &&
    it.state !== "proposed" &&
    !covered.has(it.id);
  const unshaped = new Map<string, string[]>();
  const looseDecisions: WorkItem[] = [];
  for (const it of s.items) {
    if (loose(it) && isWork(it)) {
      const key = `${UNSHAPED}${it.project}`;
      unshaped.set(key, [...(unshaped.get(key) ?? []), it.id]);
    } else if (loose(it) && isOwnerDecision(it)) {
      looseDecisions.push(it);
    }
  }
  const decisionIds = new Set(looseDecisions.map((d) => d.id));
  // Names on a card, the most waited on first.
  const byWaiting = (ids: readonly string[]) =>
    [...ids].sort(
      (a, b) =>
        (itemOf.get(b)?.needed_by.length ?? 0) -
          (itemOf.get(a)?.needed_by.length ?? 0) || idNumber(a) - idNumber(b),
    );
  // What holds a bar up besides its work: the owner's open decisions and
  // open waits on other parties, held or needed directly by its items.
  const holdsOf = (ids: readonly string[]) => {
    const decisions = new Set<string>();
    const outside = new Set<string>();
    const note = (it: WorkItem | undefined) => {
      if (it && isOpen(it)) {
        if (isOwnerDecision(it)) {
          decisions.add(it.id);
        } else if (it.kind === "external") {
          outside.add(it.id);
        }
      }
    };
    for (const id of ids) {
      const it = itemOf.get(id);
      if (!it || !isOpen(it)) {
        continue;
      }
      note(it);
      for (const n of it.open_needs) {
        note(itemOf.get(n));
      }
    }
    return { decisions, outside };
  };
  const rows = milestoneRoadmapOf(s, s.items, flight, proposals);
  const closures = releaseClosuresOf(s, proposals);
  const { bands: bandList, bandOf } = releaseBandsOf(s, closures);
  const banded = arrange === "release";
  // The band a row sits in; one the bands don't know goes last.
  const bandIx = (id: string) =>
    banded ? (bandOf.get(id) ?? closures.length) : 0;
  const itemsIn = (id: string) =>
    unshaped.get(id) ??
    (decisionIds.has(id) ? [id] : undefined) ??
    msOf.get(id)?.constraints.map((c) => c.id) ??
    (isReleaseItem(itemOf.get(id))
      ? itemOf.get(id)!.needs.filter((n) => !msOf.has(n))
      : []);
  const shown = new Set(rows.map((r) => r.id));
  const tokensOf = (id: string) => {
    const m = msOf.get(id);
    const open = itemsIn(id)
      .map((c) => itemOf.get(c))
      .filter((it): it is WorkItem => !!it && isOpen(it));
    const est = open.filter((it) => it.estimate_tokens !== undefined);
    let left = est.reduce((n, it) => n + it.estimate_tokens!, 0);
    // An appetite with no estimates stands for the open share of it.
    if (!est.length && m?.appetite_tokens && m.progress.total) {
      left = (m.appetite_tokens * open.length) / m.progress.total;
    }
    const all = itemsIn(id)
      .map((c) => itemOf.get(c))
      .filter((it): it is WorkItem => !!it && it.state !== "dropped");
    const estimates = all.filter((it) => it.estimate_tokens !== undefined);
    const spentOn = all.filter((it) => it.tokens_spent !== undefined);
    return {
      left,
      estimated: est.length,
      open: open.length,
      appetite: m?.appetite_tokens,
      budget:
        m?.appetite_tokens ??
        (estimates.length
          ? estimates.reduce((n, it) => n + it.estimate_tokens!, 0)
          : undefined),
      spent: spentOn.length
        ? spentOn.reduce((n, it) => n + it.tokens_spent!, 0)
        : undefined,
    };
  };
  const hasTokens = rows.some((r) => {
    const t = tokensOf(r.id);
    return t.estimated > 0 || t.appetite !== undefined || t.spent !== undefined;
  });
  const cost = (id: string) => (unit === "steps" ? 1 : tokensOf(id).left);
  // Release gates are release items (human-in-the-lead's format): each
  // one waits on the milestones and items it needs. They take no room of
  // their own: each is a flag at the end of what it needs.
  const isGate = (id: string) => isReleaseItem(itemOf.get(id));
  // Groups (loops) in step order: a group's waits are its members' waits
  // outside it. In bands, a group is its loop's members in one band, and
  // it waits only on groups in its own band: what is in an earlier band
  // is done before its band begins, and a wait on a later band is a
  // closure violation, which places nothing.
  const keyOf = (r: RoadmapRow) => `${bandIx(r.id)}:${r.group.join()}`;
  const groupOf = new Map<string, string>();
  const rowsOf = new Map<string, RoadmapRow[]>();
  for (const r of rows) {
    groupOf.set(r.id, keyOf(r));
    rowsOf.set(keyOf(r), [...(rowsOf.get(keyOf(r)) ?? []), r]);
  }
  const bandOfGroup = (g: string) => Number(g.slice(0, g.indexOf(":")));
  const groups = [...rowsOf.keys()].sort(
    (a, b) =>
      bandOfGroup(a) - bandOfGroup(b) ||
      rowsOf.get(a)![0]!.step - rowsOf.get(b)![0]!.step,
  );
  const membersOf = (g: string) => rowsOf.get(g) ?? [];
  const predsOf = (g: string) => [
    ...new Set(
      membersOf(g).flatMap((r) =>
        r.waitsOn
          .map((w) => groupOf.get(w.id))
          .filter(
            (x): x is string =>
              !!x && x !== g && bandOfGroup(x) === bandOfGroup(g),
          ),
      ),
    ),
  ];
  const gCost = (g: string) => {
    const real = membersOf(g).filter((r) => !isGate(r.id));
    return unit === "steps"
      ? Math.min(1, real.length)
      : real.reduce((n, r) => n + cost(r.id), 0);
  };
  const es = new Map<string, number>();
  const ef = new Map<string, number>();
  // Each band begins where the one before it ends: its release.
  const bandStart = new Map<number, number>();
  const bandEnd = new Map<number, number>();
  let cursor = 0;
  for (const g of groups) {
    const b = bandOfGroup(g);
    if (!bandStart.has(b)) {
      bandStart.set(b, cursor);
      bandEnd.set(b, cursor);
    }
    const start = Math.max(
      bandStart.get(b)!,
      ...predsOf(g).map((p) => ef.get(p) ?? 0),
    );
    es.set(g, start);
    ef.set(g, start + gCost(g));
    bandEnd.set(b, Math.max(bandEnd.get(b)!, ef.get(g)!));
    cursor = bandEnd.get(b)!;
  }
  let total = Math.max(0, ...ef.values());
  // A release's cone is everything upstream of it, the milestones it
  // needs to be feature complete.
  const upstreamOf = (id: string) => {
    const seen = new Set<string>();
    const stack = [id];
    while (stack.length) {
      const at = stack.pop();
      const r = rows.find((x) => x.id === at);
      for (const w of r?.waitsOn ?? []) {
        if (!seen.has(w.id) && w.id !== id) {
          seen.add(w.id);
          stack.push(w.id);
        }
      }
    }
    return seen;
  };
  // A gate's progress: over the milestones it names, their items, and the
  // items it needs directly.
  const gateStats = (id: string) => {
    const ms = itemOf.get(id)!.needs.filter((x) => msOf.has(x));
    const items = new Set([...ms.flatMap((x) => itemsIn(x)), ...itemsIn(id)]);
    let done = 0;
    let left = 0;
    const decisions = new Set<string>();
    for (const i of items) {
      const it = itemOf.get(i);
      if (!it || it.state === "dropped") {
        continue;
      }
      if (it.state === "done") {
        done++;
      } else {
        left += it.estimate_tokens ?? 0;
        if (isOwnerDecision(it)) {
          decisions.add(it.id);
        }
        for (const n of it.open_needs) {
          const need = itemOf.get(n);
          if (need && isOwnerDecision(need) && isOpen(need)) {
            decisions.add(n);
          }
        }
      }
    }
    return {
      milestones: ms.length,
      milestonesDone: ms.filter((x) => msOf.get(x)?.state === "done").length,
      items: items.size,
      itemsDone: done,
      tokensLeft: left,
      decisions: decisions.size,
    };
  };
  // Where each milestone ends, and so where each release falls: by steps,
  // after the last milestone it waits on; in bands, closing its band.
  const endOf = (id: string) => {
    const g = groupOf.get(id);
    return g === undefined
      ? undefined
      : es.get(g)! + (unit === "steps" ? 1 : cost(id));
  };
  const flags: MapFlag[] = releaseFlagsOf(s, rows, endOf).map((f) => {
    const g = groupOf.get(f.id);
    if (!banded || f.unplaced || g === undefined) {
      return { ...f, progress: gateStats(f.id) };
    }
    const at = bandEnd.get(bandOfGroup(g))!;
    const eps = unit === "steps" ? 0 : 1e-6 * Math.max(1, total);
    return {
      ...f,
      at,
      last: f.feeds.filter((m) => Math.abs((endOf(m) ?? -1) - at) <= eps),
      progress: gateStats(f.id),
    };
  });
  const focusId = focus && rows.some((r) => r.id === focus) ? focus : undefined;
  // A release with no place yet sets nothing apart: what it needs isn't chosen.
  const placed = !flags.find((f) => f.id === focusId)?.unplaced;
  // In bands, a release needs its closure: its milestones, and the
  // releases before it with theirs.
  const closureCone = (id: string) => {
    const c = closures.find((x) => x.id === id);
    const before = new Set<string>();
    const walk = (r: string) => {
      for (const a of closures.find((x) => x.id === r)?.after ?? []) {
        if (!before.has(a)) {
          before.add(a);
          walk(a);
        }
      }
    };
    walk(id);
    return [...(c?.closure ?? []), ...before];
  };
  const cone =
    focusId && placed
      ? new Set([
          focusId,
          ...(banded ? closureCone(focusId) : upstreamOf(focusId)),
        ])
      : undefined;
  const coneGroups = cone
    ? new Set([...cone].map((id) => groupOf.get(id)!))
    : undefined;
  // The end the slack is measured to: the release, or the last of all.
  const end = cone ? ef.get(groupOf.get(focusId!)!)! : total;
  const succsOf = (g: string) =>
    groups.filter(
      (x) => predsOf(x).includes(g) && (!coneGroups || coneGroups.has(x)),
    );
  // Latest finish: the latest each can end without delaying the end
  // (total slack, not just the room before the next one starts).
  // In bands, the end of a group's own band: past it, its release slips.
  const lf = new Map<string, number>();
  for (const g of [...groups].reverse()) {
    if (coneGroups && !coneGroups.has(g)) {
      continue;
    }
    const succ = succsOf(g);
    lf.set(
      g,
      succ.length
        ? Math.min(...succ.map((x) => lf.get(x)! - gCost(x)))
        : banded
          ? Math.min(end, bandEnd.get(bandOfGroup(g))!)
          : end,
    );
  }
  const slackOf = (g: string) =>
    lf.has(g) ? lf.get(g)! - ef.get(g)! : Number.NaN;
  const eps = unit === "steps" ? 0 : 1e-6 * Math.max(1, total);
  // The critical path: from the end back along waits that leave no slack.
  const path: string[] = [];
  let at = cone
    ? groupOf.get(focusId!)
    : groups.find(
        (g) => Math.abs(ef.get(g)! - total) <= eps && slackOf(g) <= eps,
      );
  while (at) {
    path.unshift(
      ...membersOf(at)
        .map((r) => r.id)
        .filter((id) => !isGate(id)),
    );
    const here = at;
    at = predsOf(here).find(
      (p) => Math.abs(ef.get(p)! - es.get(here)!) <= eps && slackOf(p) <= eps,
    );
    // In bands, a path that reaches its band's start goes on from the end
    // of the band before: its release, and what closes it.
    if (!at && banded) {
      const b = bandOfGroup(here);
      const before = [...bandEnd.keys()]
        .filter((k) => k < b)
        .sort((x, y) => y - x)[0];
      if (
        before !== undefined &&
        Math.abs(es.get(here)! - bandStart.get(b)!) <= eps
      ) {
        const close = groups.filter(
          (g) =>
            bandOfGroup(g) === before &&
            Math.abs(ef.get(g)! - bandEnd.get(before)!) <= eps &&
            slackOf(g) <= eps,
        );
        // Its release first, which leads back to what closes the band.
        at =
          close.find((g) => membersOf(g).some((r) => isGate(r.id))) ?? close[0];
      }
    }
  }
  const onPath = new Set(path);
  // Lanes: projects, in order of their first milestone.
  const laneOf = (id: string) => {
    if (id.startsWith(UNSHAPED)) {
      return id.slice(UNSHAPED.length);
    }
    if (decisionIds.has(id)) {
      return itemOf.get(id)!.project!;
    }
    const m = msOf.get(id)!;
    const base = m.project ?? "";
    // With a release in focus, what it doesn't need moves to its own band.
    return cone && !cone.has(id) ? `${OUTSIDE}${base}` : base;
  };
  const laneTitle = (id: string): string =>
    id.startsWith(OUTSIDE)
      ? laneTitle(id.slice(OUTSIDE.length))
      : (projectOf.get(id)?.title ?? "No project");
  const nodes: MapNode[] = rows
    .filter((r) => !isGate(r.id))
    .map((r) => {
      const g = groupOf.get(r.id)!;
      const start = es.get(g)!;
      const own = unit === "steps" ? 1 : cost(r.id);
      const { decisions, outside } = holdsOf(itemsIn(r.id));
      return {
        id: r.id,
        title: r.title,
        lane: laneOf(r.id),
        sub: 0,
        x0: start,
        x1: start + own,
        slack: slackOf(g),
        critical: onPath.has(r.id),
        counts: r.counts,
        decisions: decisions.size,
        outside: outside.size,
        tokens: tokensOf(r.id),
        // In bands, a loop is its members in one band.
        loop: (() => {
          const loop = banded
            ? membersOf(g)
                .map((x) => x.id)
                .filter((id) => !isGate(id))
            : r.group;
          return loop.length > 1 ? loop : undefined;
        })(),
        started: r.counts.Done > 0 || r.counts["In flight"] > 0,
        unshaped: r.id.startsWith(UNSHAPED),
        decision: false,
        items: [],
        proposed: msOf.get(r.id)?.state === "proposed",
        ...(banded ? { band: bandIx(r.id) } : {}),
        // The waits that finish last set its start: those name why it is here.
        after: start
          ? r.waitsOn
              .map((w) => w.id)
              .filter((id) => {
                const pg = groupOf.get(id);
                return (
                  pg !== undefined &&
                  pg !== g &&
                  Math.abs(ef.get(pg)! - start) <= eps
                );
              })
          : [],
      };
    });
  // The unshaped bars: after the milestones their items wait on.
  const msItems = new Map(
    rows.map((r) => [
      r.id,
      new Set(
        (msOf.get(r.id)?.constraints ?? [])
          .map((c) => c.id)
          .filter((id) => {
            const it = itemOf.get(id);
            return it && isOpen(it);
          }),
      ),
    ]),
  );
  const softEdges: MapEdge[] = [];
  // A loose card starts after the milestones its items wait on, and its
  // waits to and from milestones are soft: context, not order.
  const placeLoose = (id: string, members: readonly string[]) => {
    const open = new Set(members);
    let start = 0;
    for (const r of rows) {
      const theirs = msItems.get(r.id)!;
      // It waits on a milestone when one of its items needs one of the milestone's.
      const waiting = members.filter((m) =>
        itemOf.get(m)!.open_needs.some((n) => theirs.has(n)),
      );
      if (waiting.length) {
        start = Math.max(start, ef.get(groupOf.get(r.id)!)!);
        softEdges.push({
          from: r.id,
          to: id,
          items: waiting,
          critical: false,
          soft: true,
        });
      }
      // A milestone waits on it when one of the milestone's items needs one of its.
      const needing = [...theirs].filter((m) =>
        itemOf.get(m)!.open_needs.some((n) => open.has(n)),
      );
      if (needing.length) {
        softEdges.push({
          from: id,
          to: r.id,
          items: needing,
          critical: false,
          soft: true,
        });
      }
    }
    if (!banded) {
      return start;
    }
    // In bands, it sits in the earliest band of what it feeds (in no
    // release's band when it feeds nothing), after what it waits on there.
    const fed = softEdges.filter((e) => e.from === id).map((e) => bandIx(e.to));
    const b = fed.length ? Math.min(...fed) : closures.length;
    const waited = softEdges
      .filter((e) => e.to === id && bandIx(e.from) <= b)
      .map((e) => ef.get(groupOf.get(e.from)!)!);
    const from = bandStart.get(b) ?? Math.max(0, ...bandEnd.values());
    start = Math.max(from, ...waited);
    // Inside its band, so it never crosses a release's line; the last
    // band widens to hold it.
    const own = unit === "steps" ? 1 : tokensOf(id).left;
    if (b < closures.length && bandEnd.has(b)) {
      start = Math.min(start, Math.max(from, bandEnd.get(b)! - own));
    } else {
      bandStart.set(b, bandStart.get(b) ?? from);
      bandEnd.set(b, Math.max(bandEnd.get(b) ?? from, start + own));
    }
    looseBand.set(id, b);
    return start;
  };
  const looseBand = new Map<string, number>();
  // Outside a release in focus unless one of the milestones it feeds is in.
  const looseLane = (id: string) =>
    cone && !softEdges.some((e) => e.from === id && cone.has(e.to))
      ? `${OUTSIDE}${laneOf(id)}`
      : laneOf(id);
  for (const [id, members] of unshaped) {
    const start = placeLoose(id, members);
    const counts = Object.fromEntries(STAGES.map((st) => [st, 0])) as Record<
      Stage,
      number
    >;
    for (const m of members) {
      const st = stageOf(itemOf.get(m)!, flight);
      if (st) {
        counts[st]++;
      }
    }
    const { decisions, outside } = holdsOf(members);
    const tokens = tokensOf(id);
    nodes.push({
      id,
      title: "Not in a milestone yet",
      lane: looseLane(id),
      sub: 0,
      x0: start,
      x1: start + (unit === "steps" ? 1 : tokens.left),
      slack: 0,
      critical: false,
      counts,
      decisions: decisions.size,
      outside: outside.size,
      tokens,
      started: counts.Done > 0 || counts["In flight"] > 0,
      unshaped: true,
      decision: false,
      items: byWaiting(members),
      proposed: false,
      after: [],
      ...(banded ? { band: looseBand.get(id) } : {}),
    });
  }
  // The owner's decisions in no milestone: the question, and what waits.
  for (const d of looseDecisions) {
    const start = placeLoose(d.id, [d.id]);
    const counts = Object.fromEntries(STAGES.map((st) => [st, 0])) as Record<
      Stage,
      number
    >;
    const st = stageOf(d, flight);
    if (st) {
      counts[st]++;
    }
    const tokens = tokensOf(d.id);
    nodes.push({
      id: d.id,
      title: d.title,
      lane: looseLane(d.id),
      sub: 0,
      x0: start,
      x1: start + (unit === "steps" ? 1 : tokens.left),
      slack: 0,
      critical: false,
      counts,
      decisions: 0,
      outside: holdsOf(d.open_needs).outside.size,
      tokens,
      started: false,
      unshaped: false,
      decision: true,
      ...(banded ? { band: looseBand.get(d.id) } : {}),
      items: byWaiting(
        d.needed_by.filter((n) => {
          const it = itemOf.get(n);
          return !!it && isOpen(it);
        }),
      ),
      proposed: false,
      after: [],
    });
  }
  // Lanes: projects with milestones first (by their first start), then
  // those not yet shaped into milestones, by project number; then, with a
  // release in focus, what it doesn't need.
  const shaped = new Set(
    nodes.filter((n) => !n.unshaped && !n.decision).map((n) => n.lane),
  );
  const band = (lane: string) => (lane.startsWith(OUTSIDE) ? 1 : 0);
  const laneIds = [
    ...new Set(
      [...nodes]
        .sort(
          (a, b) =>
            band(a.lane) - band(b.lane) ||
            Number(!shaped.has(a.lane)) - Number(!shaped.has(b.lane)) ||
            (shaped.has(a.lane)
              ? a.x0 - b.x0
              : a.lane.localeCompare(b.lane, "en", { numeric: true })),
        )
        .map((n) => n.lane),
    ),
  ];
  const lanes = laneIds.map((id) => {
    // Under way first, so what is moving sits at the top of its lane.
    const mine = nodes
      .filter((n) => n.lane === id)
      .sort((a, b) => a.x0 - b.x0 || Number(b.started) - Number(a.started));
    const ends: number[] = [];
    for (const n of mine) {
      let sub = ends.findIndex((e) => e <= n.x0 + eps);
      if (sub < 0) {
        sub = ends.length;
        ends.push(0);
      }
      ends[sub] = Math.max(n.x1, n.x0 + (unit === "steps" ? 1 : 0));
      n.sub = sub;
    }
    return {
      id,
      title: laneTitle(id),
      subs: Math.max(1, ends.length),
      outside: id.startsWith(OUTSIDE),
    };
  });
  const edges: MapEdge[] = rows
    .filter((r) => !isGate(r.id))
    .flatMap((r): MapEdge[] =>
      r.waitsOn
        .filter((w) => shown.has(w.id) && !isGate(w.id))
        .map((w) => ({
          from: w.id,
          to: r.id,
          items: w.items,
          critical:
            onPath.has(w.id) &&
            onPath.has(r.id) &&
            path.indexOf(w.id) < path.indexOf(r.id),
        })),
    );
  edges.push(...softEdges);
  const done = s.milestones
    .filter((m) => m.state === "done")
    .map((m) => ({ id: m.id, title: m.title }));
  // The last band may have widened for loose cards.
  if (banded) {
    total = Math.max(total, ...bandEnd.values());
  }
  const bands = banded
    ? bandList.flatMap((b, k) =>
        bandStart.has(k)
          ? [{ ...b, x0: bandStart.get(k)!, x1: bandEnd.get(k)! }]
          : [],
      )
    : [];
  return {
    nodes,
    edges,
    lanes,
    total,
    end,
    unit,
    path,
    hasTokens,
    done,
    gates: rows
      .filter((r) => isGate(r.id))
      .map((r) => ({ id: r.id, title: r.title })),
    flags,
    focus: focusId,
    arrange,
    bands,
    closures,
  };
}

/**
 * The fewest waits that tie a group of milestones into a loop: removing
 * them, smallest first (by how many items make each wait), until what is
 * left of the group has an order. Each comes with the items behind it.
 */
export function loopTies(
  rows: readonly RoadmapRow[],
  group: readonly string[],
): Array<{ from: string; to: string; items: string[] }> {
  if (group.length < 2) {
    return [];
  }
  const inGroup = new Set(group);
  const edges = rows
    .filter((r) => inGroup.has(r.id))
    .flatMap((r) =>
      r.waitsOn
        .filter((w) => inGroup.has(w.id))
        .map((w) => ({ from: r.id, to: w.id, items: w.items })),
    )
    .sort((a, b) => a.items.length - b.items.length);
  const acyclic = (kept: typeof edges) => {
    const out = new Map<string, string[]>();
    for (const e of kept) {
      out.set(e.from, [...(out.get(e.from) ?? []), e.to]);
    }
    const state = new Map<string, number>();
    const cyclic = (v: string): boolean => {
      state.set(v, 1);
      for (const w of out.get(v) ?? []) {
        if (state.get(w) === 1 || (!state.has(w) && cyclic(w))) {
          return true;
        }
      }
      state.set(v, 2);
      return false;
    };
    return group.every((v) => state.has(v) || !cyclic(v));
  };
  const removed: typeof edges = [];
  let kept = [...edges];
  // Greedy: drop the smallest wait that sits on a loop, until none is left.
  // A wait sits on a loop if its target can reach back to its source
  // through the other waits.
  const onLoop = (e: (typeof edges)[number], among: typeof edges) => {
    const without = among.filter((x) => x !== e);
    const reach = (v: string, seen: Set<string>): boolean =>
      v === e.from ||
      without.some(
        (x) => x.from === v && !seen.has(x.to) && reach(x.to, seen.add(x.to)),
      );
    return reach(e.to, new Set([e.to]));
  };
  while (!acyclic(kept)) {
    const now = kept;
    const i = now.findIndex((e) => onLoop(e, now));
    removed.push(kept[i]!);
    kept = kept.filter((_, j) => j !== i);
  }
  return removed;
}

/**
 * The roadmap's zoom (CS-683), as Figma's: the levels the keys and buttons
 * step through, from a whole map at a glance to a milestone up close.
 * The zoom is semantic: it scales where things sit and how big they are,
 * never the text, which keeps its size and drops detail as a card shrinks.
 */
export const ZOOM_LEVELS: readonly number[] = [
  0.05, 0.1, 0.15, 0.25, 0.33, 0.5, 0.67, 0.8, 1, 1.25, 1.5, 2, 3, 4,
];
export const ZOOM_MIN = ZOOM_LEVELS[0]!;
export const ZOOM_MAX = ZOOM_LEVELS[ZOOM_LEVELS.length - 1]!;

/** A zoom kept in range, rounded so the level reads as a whole percent. */
export function clampZoom(z: number): number {
  if (!Number.isFinite(z)) {
    return 1;
  }
  return Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z)) * 1000) / 1000;
}

/** The next level in or out from a zoom (the + and − keys). */
export function zoomStep(z: number, dir: 1 | -1): number {
  const eps = 1e-6;
  const next =
    dir > 0
      ? ZOOM_LEVELS.find((l) => l > z + eps)
      : [...ZOOM_LEVELS].reverse().find((l) => l < z - eps);
  return next ?? (dir > 0 ? ZOOM_MAX : ZOOM_MIN);
}

/**
 * Where a point of the content lands at another zoom, along one axis:
 * what sits before `fixed` (the lane names, the step headers) keeps its
 * place, and the rest scales from there.
 */
export function zoomAbout(
  at: number,
  fixed: number,
  from: number,
  to: number,
): number {
  return at <= fixed ? at : fixed + ((at - fixed) * to) / from;
}

/**
 * The zoom that fits the whole content in the view: the content's size at
 * zoom 1 against the view's, past the parts that don't scale.
 */
export function fitZoom(
  view: { w: number; h: number },
  content: { w: number; h: number },
  fixed: { x: number; y: number },
  /** "across" for content that zooms across only (the Plan view's rows keep their height). */
  axes: "both" | "across" = "both",
): number {
  const across = (view.w - fixed.x) / Math.max(1, content.w - fixed.x);
  const down =
    axes === "across"
      ? 1
      : (view.h - fixed.y) / Math.max(1, content.h - fixed.y);
  // Down to the next thousandth, so the content fits, never one pixel over.
  return clampZoom(Math.floor(Math.min(1, across, down) * 1000) / 1000);
}

/**
 * How much a card can show at its size on screen, so text is drawn at
 * full size or not at all: everything, its name on one line, or only its
 * mark and bar.
 */
export function cardDetail(w: number, h: number): "full" | "name" | "mark" {
  return h >= 60 && w >= 120 ? "full" : h >= 24 && w >= 64 ? "name" : "mark";
}

// ------------------------------------------------------------ the Plan view

/** The most executor slots the Plan view will sequence for. */
export const SLOTS_MAX = 8;

/** A slot count from the URL, kept in range: 1 when it can't be read. */
export function clampSlots(n: unknown): number {
  const k = Math.round(Number(n));
  return Number.isFinite(k) && k >= 1 ? Math.min(SLOTS_MAX, k) : 1;
}

/** One item as the Plan view sequences it (CS-692). */
export interface PlanItem {
  id: string;
  /** Where its work starts and finishes across, in the plan's unit. */
  start: number;
  finish: number;
  /** Its size in the plan's unit: its estimate, the default, or one. */
  size: number;
  /** False when it has no token estimate and took the default size. */
  sized: boolean;
  /** The executor slot that works it, from 0. */
  slot: number;
  /** The release band it is worked in: its milestone's, or earlier if work there needs it. */
  band: number;
  /** Its place in the planner's queue, from 0. */
  rank: number;
  /**
   * Its open needs the plan doesn't sequence (decisions, outside waits,
   * proposed work while proposals are hidden): assumed answered in time.
   */
  held: string[];
  /** Started before its needs to break a loop of needs (a tracker error). */
  loop?: boolean;
}

/** A milestone's bar: from its first item's start to its last item's finish. */
export interface PlanMilestone {
  id: string;
  title: string;
  band: number;
  proposed: boolean;
  /** Its items the plan sequences, in the order they start. */
  items: string[];
  start: number;
  finish: number;
}

/** One release's rows, or the last band's: the milestones it is first to need. */
export interface PlanBand {
  /** The release item, or `NO_RELEASE`. */
  id: string;
  name: string;
  /** Its milestones with work to sequence, in the order they start. */
  milestones: string[];
  /** Its open milestones with nothing left to sequence (only decisions or waits, say). */
  idle: string[];
  /**
   * Items worked in this band that no milestone of the band holds: in no
   * milestone, or pulled in by this band's work from a later band's
   * milestone (a break of the closure rule).
   */
  loose: string[];
  /** Every item worked in the band, in the order they start. */
  items: string[];
  /** The span of its items' work; both 0 when it has none. */
  start: number;
  finish: number;
}

/** A release's marker: where the last item it needs finishes, and why there. */
export interface PlanRelease {
  id: string;
  version: string;
  title: string;
  /** Its band. */
  band: number;
  proposed: boolean;
  /** Where its last needed item finishes; absent when it names no milestone yet. */
  at?: number;
  /** The open items it needs, through its milestones and the releases before it. */
  needed: string[];
  /** The needed item that finishes last. */
  last?: string;
  /**
   * What sets its finish: the chain of needs that ends at `last`, each
   * step back the need that finished latest, earliest first.
   */
  chain: string[];
  /** The chain's own size; the rest of `at` is other work in the slots. */
  chainSize: number;
}

export interface Plan {
  /** Across: tokens when any item has an estimate; else item count. */
  unit: "tokens" | "items";
  slots: number;
  items: Map<string, PlanItem>;
  /** Every sequenced item, by start, then the queue's order. */
  order: string[];
  bands: PlanBand[];
  milestones: Map<string, PlanMilestone>;
  /** Open releases in ladder order. */
  releases: PlanRelease[];
  /** Where the last item finishes. */
  total: number;
  /** How many items took the default size, and that size in the unit. */
  defaulted: number;
  defaultSize: number;
}

/**
 * The Plan view (CS-692): what gets built when, with no dates. The open
 * work items are worked by `slots` executor slots (the run's
 * `max_executors`) in the planner's order, each starting once the items
 * it needs are finished. The planner's order is hitld's queue rule
 * (`orderQueue` in its dispatch/queue.mjs): most open items unblocked
 * first, then the smaller estimate, then the ID; work already in progress
 * goes first, and the release bands (CS-685) come before all of it, so
 * an earlier release's work is preferred over a later one's. An item a
 * band's work needs is worked in that band. Across is cumulative tokens
 * per slot, or item count when no item carries an estimate. Decisions
 * and outside waits take no slot: the items behind them list them as
 * `held`, and the plan assumes they are answered in time.
 */
export function planOf(
  snap: WorkSnapshot,
  {
    slots = 1,
    proposals = false,
    flight,
  }: { slots?: number; proposals?: boolean; flight?: InFlight } = {},
): Plan {
  const s = proposals ? snap : committedOnly(snap);
  const n = clampSlots(slots);
  const itemOf = new Map(s.items.map((i) => [i.id, i]));
  const sequenced = s.items.filter(
    (it) =>
      isOpen(it) &&
      isWork(it) &&
      !isReleaseItem(it) &&
      (proposals || it.state !== "proposed"),
  );
  const inPlan = new Set(sequenced.map((i) => i.id));

  // Sizes: tokens when any item has an estimate, the rest at the median.
  const known = sequenced
    .map((i) => i.estimate_tokens)
    .filter((t): t is number => t !== undefined && t > 0);
  const unit: Plan["unit"] = known.length ? "tokens" : "items";
  const defaultSize =
    unit === "tokens" ? Math.max(1, Math.round(median(known)!)) : 1;
  const sizedOf = (it: WorkItem) =>
    unit === "tokens" && !!it.estimate_tokens && it.estimate_tokens > 0;
  const sizeOf = (it: WorkItem) =>
    sizedOf(it) ? it.estimate_tokens! : defaultSize;

  // hitld's unblocks: the open items behind an item, through needs.
  const dependents = new Map<string, string[]>();
  for (const it of s.items) {
    if (isOpen(it)) {
      for (const d of it.needs) {
        dependents.set(d, [...(dependents.get(d) ?? []), it.id]);
      }
    }
  }
  const unblocks = new Map<string, number>();
  for (const it of sequenced) {
    const seen = new Set<string>();
    const stack = [...(dependents.get(it.id) ?? [])];
    while (stack.length) {
      const d = stack.pop()!;
      if (!seen.has(d)) {
        seen.add(d);
        stack.push(...(dependents.get(d) ?? []));
      }
    }
    unblocks.set(it.id, seen.size);
  }

  // Bands: an item's milestone's, or earlier where earlier work needs it.
  const closures = releaseClosuresOf(s, proposals);
  const { bands: rawBands, bandOf } = releaseBandsOf(s, closures);
  const lastBand = rawBands.length - 1;
  const band = new Map<string, number>();
  for (const it of sequenced) {
    band.set(
      it.id,
      Math.min(
        lastBand,
        ...it.milestones.map((m) => bandOf.get(m) ?? lastBand),
      ),
    );
  }
  closures.forEach((c, k) => {
    for (const nd of itemOf.get(c.id)?.needs ?? []) {
      if (inPlan.has(nd)) {
        band.set(nd, Math.min(band.get(nd)!, k));
      }
    }
  });
  const needsIn = new Map(
    sequenced.map((it) => [
      it.id,
      it.needs.filter((nd) => inPlan.has(nd) && nd !== it.id),
    ]),
  );
  for (let changed = true; changed;) {
    changed = false;
    for (const it of sequenced) {
      for (const nd of needsIn.get(it.id)!) {
        if (band.get(nd)! > band.get(it.id)!) {
          band.set(nd, band.get(it.id)!);
          changed = true;
        }
      }
    }
  }

  // The queue: in progress first, then by band, then hitld's rule.
  const running = (it: WorkItem) => boardStatus(it, flight) === "in-progress";
  const queue = [...sequenced].sort(
    (a, b) =>
      Number(running(b)) - Number(running(a)) ||
      band.get(a.id)! - band.get(b.id)! ||
      unblocks.get(b.id)! - unblocks.get(a.id)! ||
      sizeOf(a) - sizeOf(b) ||
      idNumber(a.id) - idNumber(b.id),
  );
  const rank = new Map(queue.map((it, k) => [it.id, k]));

  // List scheduling: whenever a slot is free, it takes the first item in
  // the queue whose needs are all finished.
  const items = new Map<string, PlanItem>();
  const slotFree = Array.from({ length: n }, () => 0);
  let pending = queue;
  let t = 0;
  const held = (it: WorkItem) =>
    it.needs.filter((nd) => {
      const x = itemOf.get(nd);
      return !!x && isOpen(x) && !inPlan.has(nd) && !isReleaseItem(x);
    });
  const begin = (it: WorkItem, slot: number, loop: boolean) => {
    const size = sizeOf(it);
    items.set(it.id, {
      id: it.id,
      start: t,
      finish: t + size,
      size,
      sized: sizedOf(it),
      slot,
      band: band.get(it.id)!,
      rank: rank.get(it.id)!,
      held: held(it),
      ...(loop ? { loop: true } : {}),
    });
    slotFree[slot] = t + size;
    pending = pending.filter((x) => x !== it);
  };
  const isReady = (it: WorkItem) =>
    needsIn.get(it.id)!.every((nd) => {
      const p = items.get(nd);
      return !!p && p.finish <= t;
    });
  while (pending.length) {
    for (let k = 0; k < n && pending.length; k++) {
      if (slotFree[k]! <= t) {
        const pick = pending.find(isReady);
        if (!pick) {
          break;
        }
        begin(pick, k, false);
      }
    }
    if (!pending.length) {
      break;
    }
    const now = t;
    const later = slotFree.filter((f) => f > now);
    if (later.length) {
      t = Math.min(...later);
    } else {
      // Nothing running and nothing ready: a loop of needs. The first in
      // the queue starts anyway, so the plan still covers it.
      begin(pending[0]!, slotFree.indexOf(Math.min(...slotFree)), true);
    }
  }
  const order = [...items.values()]
    .sort((a, b) => a.start - b.start || a.rank - b.rank)
    .map((p) => p.id);
  const byStart = (ids: Iterable<string>) =>
    [...ids].sort(
      (a, b) =>
        items.get(a)!.start - items.get(b)!.start ||
        items.get(a)!.rank - items.get(b)!.rank,
    );

  // Milestones: each from its first item's start to its last item's finish.
  const milestones = new Map<string, PlanMilestone>();
  const open = s.milestones.filter(
    (m) => m.state !== "done" && m.state !== "dropped",
  );
  for (const m of open) {
    const here = byStart(
      new Set(m.constraints.map((c) => c.id).filter((id) => inPlan.has(id))),
    );
    if (!here.length) {
      continue;
    }
    milestones.set(m.id, {
      id: m.id,
      title: m.title,
      band: bandOf.get(m.id) ?? lastBand,
      proposed: m.state === "proposed",
      items: here,
      start: Math.min(...here.map((id) => items.get(id)!.start)),
      finish: Math.max(...here.map((id) => items.get(id)!.finish)),
    });
  }
  const bands: PlanBand[] = rawBands.map((b, k) => {
    const worked = byStart(order.filter((id) => items.get(id)!.band === k));
    const msHere = b.milestones.filter((m) => milestones.has(m));
    const holds = new Set(msHere.flatMap((m) => milestones.get(m)!.items));
    return {
      id: b.id,
      name: b.name,
      milestones: msHere.sort(
        (x, y) =>
          milestones.get(x)!.start - milestones.get(y)!.start ||
          milestones.get(x)!.finish - milestones.get(y)!.finish ||
          idNumber(x) - idNumber(y),
      ),
      idle: b.milestones.filter((m) => !milestones.has(m)),
      loose: worked.filter((id) => !holds.has(id)),
      items: worked,
      start: worked.length
        ? Math.min(...worked.map((id) => items.get(id)!.start))
        : 0,
      finish: worked.length
        ? Math.max(...worked.map((id) => items.get(id)!.finish))
        : 0,
    };
  });

  // Releases: each where the last item it needs finishes.
  const msOf = new Map(s.milestones.map((m) => [m.id, m]));
  const neededOf = (rid: string) => {
    const out = new Set<string>();
    const seen = new Set<string>();
    const stack = [...(itemOf.get(rid)?.needs ?? [])];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);
      const m = msOf.get(id);
      if (m) {
        if (m.state !== "dropped") {
          stack.push(...m.constraints.map((c) => c.id));
        }
        continue;
      }
      const it = itemOf.get(id);
      if (!it || !isOpen(it)) {
        continue;
      }
      if (inPlan.has(id)) {
        out.add(id);
      }
      stack.push(...it.needs);
    }
    return byStart(out);
  };
  const releases = closures.map((c, k): PlanRelease => {
    const needed = neededOf(c.id);
    const base = {
      id: c.id,
      version: c.version,
      title: c.title,
      band: k,
      proposed: c.proposed,
      needed,
    };
    if (!needed.length) {
      return c.milestones.length || c.after.length
        ? { ...base, at: 0, chain: [], chainSize: 0 }
        : { ...base, chain: [], chainSize: 0 };
    }
    const at = Math.max(...needed.map((id) => items.get(id)!.finish));
    const last = needed.find((id) => items.get(id)!.finish === at)!;
    const chain = [last];
    for (let cur = last; ;) {
      const before = needsIn.get(cur)!;
      if (!before.length) {
        break;
      }
      cur = before.reduce((a, b) =>
        items.get(b)!.finish > items.get(a)!.finish ? b : a,
      );
      chain.unshift(cur);
    }
    return {
      ...base,
      at,
      last,
      chain,
      chainSize: chain.reduce((sum, id) => sum + items.get(id)!.size, 0),
    };
  });

  return {
    unit,
    slots: n,
    items,
    order,
    bands,
    milestones,
    releases,
    total: Math.max(0, ...[...items.values()].map((p) => p.finish)),
    defaulted: sequenced.filter((it) => !sizedOf(it)).length,
    defaultSize,
  };
}

// ------------------------------------------------------------ the hover card (CS-696)

const slackCache = new WeakMap<Plan, Map<string, Map<string, number>>>();

/**
 * How far each sequenced item's finish can slip before a release's
 * finish moves, in the plan's unit, read off the Plan view's own
 * sequence: a backward pass over what follows each item, the items that
 * need it and the next item in its slot. Infinity where its delay can't
 * reach the release. An approximation: the planner would refill a slot
 * another way once something slips, hence "about" in the card's words.
 */
export function planSlackOf(
  plan: Plan,
  s: WorkSnapshot,
  release: string,
): Map<string, number> {
  let byRelease = slackCache.get(plan);
  if (!byRelease) {
    byRelease = new Map();
    slackCache.set(plan, byRelease);
  }
  const cached = byRelease.get(release);
  if (cached) {
    return cached;
  }
  const out = new Map<string, number>();
  byRelease.set(release, out);
  const r = plan.releases.find((x) => x.id === release);
  if (!r || r.at === undefined) {
    return out;
  }
  const needed = new Set(r.needed);
  const itemOf = new Map(s.items.map((i) => [i.id, i]));
  const after = new Map<string, string[]>();
  const add = (from: string, to: string) =>
    after.set(from, [...(after.get(from) ?? []), to]);
  for (const id of plan.items.keys()) {
    for (const nd of itemOf.get(id)?.needs ?? []) {
      if (nd !== id && plan.items.has(nd)) {
        add(nd, id);
      }
    }
  }
  const bySlot = new Map<number, string[]>();
  for (const id of plan.order) {
    const k = plan.items.get(id)!.slot;
    bySlot.set(k, [...(bySlot.get(k) ?? []), id]);
  }
  for (const ids of bySlot.values()) {
    ids.forEach((id, k) => k > 0 && add(ids[k - 1]!, id));
  }
  // Latest finish, from the last start back.
  const latest = new Map<string, number>();
  const back = [...plan.order].sort(
    (a, b) =>
      plan.items.get(b)!.start - plan.items.get(a)!.start ||
      plan.items.get(b)!.rank - plan.items.get(a)!.rank,
  );
  for (const id of back) {
    let lf = needed.has(id) ? r.at : Infinity;
    for (const j of after.get(id) ?? []) {
      const lj = latest.get(j);
      if (lj !== undefined) {
        lf = Math.min(lf, lj - plan.items.get(j)!.size);
      }
    }
    latest.set(id, lf);
    out.set(id, Math.max(0, lf - plan.items.get(id)!.finish));
  }
  return out;
}

/** A blocker the card names: open, and the owner's decisions set apart. */
export interface CardBlocker {
  id: string;
  title: string;
  kind: EntityKind;
  /** An open decision of the owner's, anywhere up the chain. */
  owner: boolean;
}

/** How a mark stands against its release in the Plan view's sequence. */
export interface CardSlip {
  /** The release item, and its version. */
  release: string;
  version: string;
  /** No room: any delay moves the release. */
  sets: boolean;
  /** The room, in the plan's unit. */
  room: number;
  unit: Plan["unit"];
  /** For the small bar: where its tightest item finishes, the latest it may, and the release's finish. */
  finish: number;
  latest: number;
  at: number;
}

/** What the shared hover card says about one mark (CS-696). */
export interface WorkCard {
  id: string;
  kind: EntityKind;
  title: string;
  /** Its stage, one chip; undefined once dropped. */
  stage?: Stage;
  /** The release it belongs to. */
  release?: { id: string; version: string };
  /** For a set of items: how many are at each stage. */
  counts?: Record<Stage, number>;
  /** Open blockers, the owner's decisions first. */
  blockers: CardBlocker[];
  slip?: CardSlip;
  /** One muted line for what isn't known, in place of lines that would only say so. */
  note?: string;
}

/** How many blockers the card names before "+N more". */
export const CARD_BLOCKERS = 2;

const emptyCounts = (): Record<Stage, number> =>
  Object.fromEntries(STAGES.map((st) => [st, 0])) as Record<Stage, number>;

/** A set's one stage: done when all are, else the furthest along anything open is. */
export function setStageOf(
  counts: Record<Stage, number>,
  proposed = false,
): Stage | undefined {
  const total = STAGES.reduce((n, st) => n + counts[st], 0);
  if (!total) {
    return proposed ? "Proposed" : undefined;
  }
  if (counts.Done === total) {
    return "Done";
  }
  if (proposed) {
    return "Proposed";
  }
  return (["In flight", "Ready", "Waiting", "Proposed"] as const).find(
    (st) => counts[st] > 0,
  );
}

/** "2.0.0-beta.1" → "beta.1": a prerelease by its tag. */
export const shortVersion = (v: string) => v.replace(/^\d+\.\d+\.\d+-/, "");

/** An amount in the plan's unit: "12 items", "40k tokens". */
export function planAmountText(unit: Plan["unit"], v: number): string {
  if (unit === "items") {
    const n = Math.round(v);
    return `${n} ${n === 1 ? "item" : "items"}`;
  }
  const t =
    v >= 1e6
      ? `${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}M`
      : v >= 1e3
        ? `${Math.round(v / 1e3)}k`
        : `${Math.round(v)}`;
  return `${t} tokens`;
}

/** The card's slip line. Never "critical path", never a time. */
export function slipText(slip: CardSlip): string {
  const v = shortVersion(slip.version);
  return slip.sets
    ? `Sets ${v}'s finish: any delay moves ${v}`
    : `Room to slip: about ${planAmountText(slip.unit, slip.room)} before ${v} moves`;
}

/** The words under a progress bar, each beside its color: "3 done · 2 ready". */
export function stageWords(
  counts: Record<Stage, number>,
): Array<{ st: Stage; text: string }> {
  return (["Done", "In flight", "Ready", "Waiting", "Proposed"] as const)
    .filter((st) => counts[st] > 0)
    .map((st) => ({
      st,
      text: `${counts[st]} ${STAGE_NAMES[st].toLowerCase()}`,
    }));
}

/**
 * Open blockers of a set of items: the open needs of its blocked items,
 * and every open decision of the owner's up their chains. The owner's
 * come first, by number; then what lies outside the set before what the
 * set waits on of its own; each of those decisions others answer, then
 * outside waits, then work, by number.
 */
export function cardBlockersOf(
  s: WorkSnapshot,
  members: readonly string[],
  flight?: InFlight,
): CardBlocker[] {
  const itemOf = new Map(s.items.map((i) => [i.id, i]));
  const msOf = new Map(s.milestones.map((m) => [m.id, m]));
  const inSet = new Set(members);
  const direct = new Set<string>();
  for (const id of members) {
    const it = itemOf.get(id);
    if (it && stageOf(it, flight) === "Waiting") {
      for (const nd of it.open_needs) {
        direct.add(nd);
      }
    }
  }
  // The owner's decisions anywhere up the blocked items' chains.
  const owner = new Set<string>();
  const seen = new Set<string>();
  const stack = [...direct];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    const it = itemOf.get(id);
    if (!it) {
      continue;
    }
    if (isOwnerDecision(it)) {
      owner.add(id);
    }
    if (isOpen(it)) {
      stack.push(...it.open_needs);
    }
  }
  const kindRank = (k: EntityKind) =>
    k === "decision" ? 0 : k === "external" ? 1 : 2;
  const blocker = (id: string): CardBlocker => {
    const it = itemOf.get(id);
    const m = msOf.get(id);
    return {
      id,
      title: it?.title ?? m?.title ?? id,
      kind: it ? itemKindOf(it) : m ? "milestone" : "work",
      owner: owner.has(id),
    };
  };
  const others = [...direct]
    .filter((id) => !owner.has(id))
    .map(blocker)
    .sort(
      (a, b) =>
        Number(inSet.has(a.id)) - Number(inSet.has(b.id)) ||
        kindRank(a.kind) - kindRank(b.kind) ||
        idNumber(a.id) - idNumber(b.id),
    );
  return [
    ...[...owner].sort((a, b) => idNumber(a) - idNumber(b)).map(blocker),
    ...others,
  ];
}

/**
 * The label of one progress-bar segment: its count and stage in words,
 * and for the blocked, what they wait on ("2 blocked: waiting on CS-118
 * and CS-55").
 */
export function segmentLabel(
  s: WorkSnapshot,
  st: Stage,
  members: readonly string[],
  flight?: InFlight,
): string {
  const itemOf = new Map(s.items.map((i) => [i.id, i]));
  const here = members.filter((id) => {
    const it = itemOf.get(id);
    return it && stageOf(it, flight) === st;
  });
  const head = `${here.length} ${STAGE_NAMES[st].toLowerCase()}`;
  if (st !== "Waiting") {
    return head;
  }
  const waits = [
    ...new Set(here.flatMap((id) => itemOf.get(id)!.open_needs)),
  ].sort((a, b) => idNumber(a) - idNumber(b));
  if (!waits.length) {
    return head;
  }
  const named = waits.slice(0, CARD_BLOCKERS);
  const more = waits.length - named.length;
  const list =
    more > 0
      ? `${named.join(", ")} and ${more} more`
      : named.length === 2
        ? `${named[0]} and ${named[1]}`
        : named[0]!;
  return `${head}: waiting on ${list}`;
}

/**
 * The hover card for any mark on the Work page (CS-696): a work item, a
 * milestone, a release, a project, or a set of items given outright (a
 * Projects cell). The plan is the Plan view's, so the slip line measures
 * against the same sequence and units the Plan view draws.
 */
export function workCardOf(
  s: WorkSnapshot,
  id: string,
  {
    flight,
    plan,
    items,
    release,
    title: named,
  }: {
    flight?: InFlight;
    plan?: Plan;
    /** Its name, for a set given outright that the tracker has no entity for. */
    title?: string;
    /** The set the mark stands for, when not the entity's own (a Projects cell). */
    items?: readonly string[];
    /** The release it is measured against, when the mark says (a Projects column). */
    release?: string;
  } = {},
): WorkCard | undefined {
  const itemOf = new Map(s.items.map((i) => [i.id, i]));
  const it = itemOf.get(id);
  const m = s.milestones.find((x) => x.id === id);
  const p = s.projects.find((x) => x.id === id);
  if (!it && !m && !p && !items) {
    return undefined;
  }
  const kind: EntityKind = it ? itemKindOf(it) : m ? "milestone" : "project";
  const title = named ?? (it ?? m ?? p)?.title ?? id;
  const isItem = !!it && kind !== "release" && !items;
  const workOf = (ids: Iterable<string>) =>
    [...ids].filter((x) => {
      const w = itemOf.get(x);
      return !!w && !isReleaseItem(w);
    });
  const members: string[] = items
    ? [...items]
    : isItem
      ? [id]
      : m
        ? workOf(m.constraints.map((c) => c.id))
        : kind === "release"
          ? workOf(
              it!.needs.flatMap((nd) => {
                const mm = s.milestones.find((x) => x.id === nd);
                return mm ? mm.constraints.map((c) => c.id) : [nd];
              }),
            )
          : workOf(s.items.filter((x) => x.project === id).map((x) => x.id));
  const counts = emptyCounts();
  for (const x of members) {
    const st = stageOf(itemOf.get(x)!, flight);
    if (st) {
      counts[st]++;
    }
  }
  const stage = isItem
    ? stageOf(it!, flight)
    : setStageOf(counts, m?.state === "proposed" || it?.state === "proposed");

  // The release it belongs to: the mark's, its band in the plan, or the first it gates.
  const bandName = (k: number | undefined) => {
    const b = k === undefined ? undefined : plan?.bands[k];
    return b && b.id !== NO_RELEASE ? { id: b.id, version: b.name } : undefined;
  };
  const versionOf = (rid: string) => {
    const r = itemOf.get(rid);
    return r ? { id: rid, version: r.release ?? r.title } : undefined;
  };
  const rel =
    kind === "release"
      ? undefined
      : release
        ? release === NO_RELEASE
          ? undefined
          : versionOf(release)
        : (bandName(
            isItem
              ? plan?.items.get(id)?.band
              : m
                ? plan?.milestones.get(id)?.band
                : undefined,
          ) ??
          (kind === "project"
            ? undefined
            : (() => {
                const g = releasesGatedBy(s, id)[0];
                return g && versionOf(g.id);
              })()));

  // Room to slip, against that release, from the set's tightest item.
  let slip: CardSlip | undefined;
  let tight: string | undefined;
  const pr = rel && plan?.releases.find((r) => r.id === rel.id);
  if (plan && pr && pr.at !== undefined) {
    const slack = planSlackOf(plan, s, pr.id);
    for (const x of members) {
      const v = slack.get(x);
      if (v !== undefined && Number.isFinite(v)) {
        if (tight === undefined || v < slack.get(tight)!) {
          tight = x;
        }
      }
    }
    if (tight) {
      const room = slack.get(tight)!;
      const fin = plan.items.get(tight)!.finish;
      slip = {
        release: pr.id,
        version: pr.version,
        sets: room <= 1e-9,
        room,
        unit: plan.unit,
        finish: fin,
        latest: fin + room,
        at: pr.at,
      };
    }
  }
  const note = !slip
    ? undefined
    : plan!.unit === "items"
      ? "No item has a token estimate yet, so room is counted in items."
      : !plan!.items.get(tight!)!.sized
        ? "No token estimate for its tightest item: sized at the median of the rest."
        : undefined;

  return {
    id,
    kind,
    title,
    stage,
    release: rel,
    counts: isItem ? undefined : counts,
    blockers: cardBlockersOf(s, members, flight),
    slip,
    note,
  };
}
