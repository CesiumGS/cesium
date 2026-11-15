/**
 * The Work board's model (views/Work.tsx): it reads the tracker through
 * its read API on the dev server (scripts/work/query.mjs, the one adapter
 * between this board and the tracker's files) and never parses an item
 * file itself. Filters, columns and counts are pure, for tests.
 */

import type {
  ItemKind,
  Status,
  WorkContainer,
  WorkElsewhere,
  WorkFound,
  WorkItem,
  WorkItemText,
  WorkMilestone,
  WorkSnapshot,
} from "../../scripts/work/query.mjs";

export type {
  WorkFound,
  WorkMilestone,
  ItemKind,
  Status,
  WorkContainer,
  WorkElsewhere,
  WorkItem,
  WorkItemText,
  WorkSnapshot,
};

/** The read API's version this board understands. */
export const READS_API_VERSION = 2;

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
  if (!response.ok) {
    throw new WorkUnavailable(`the tracker API answered ${response.status}`);
  }
  return response.json();
}

function checkVersion(v: { api_version?: unknown }) {
  if (v.api_version !== READS_API_VERSION) {
    throw new WorkUnavailable(
      `the tracker API is version ${String(v.api_version)}; this board reads version ${READS_API_VERSION}`,
    );
  }
}

/** The snapshot of the tracker on the dev server's branch. */
export async function loadWork(): Promise<WorkSnapshot> {
  const snapshot = (await getJson("/work-api/query.json")) as WorkSnapshot;
  checkVersion(snapshot);
  return snapshot;
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

export const STATUSES: readonly Status[] = [
  "Proposed",
  "Planned",
  "In progress",
  "Done",
  "Dropped",
];
export const KINDS: readonly ItemKind[] = ["work", "decision", "external"];
export const KIND_NAMES: Record<ItemKind, string> = {
  work: "Work",
  decision: "Decision",
  external: "External",
};

export const isOpen = (it: WorkItem) =>
  it.status !== "Done" && it.status !== "Dropped";

/** Work to do, as against a decision or a wait on another party. */
export const isWork = (it: WorkItem) => it.kind === "work";

/**
 * A release item (human-in-the-lead's format): the work item that makes a
 * release, carrying the version it makes. What it needs, milestones and
 * items, is what the release waits for: its gates.
 */
export const isReleaseItem = (it: WorkItem | undefined): boolean =>
  !!it && it.kind === "work" && !!it.release;

/** "CS-170" → 170, for ordering by number. */
export const idNumber = (id: string) => Number(id.replace(/^\D+-/, "")) || 0;

// ------------------------------------------------------------ the owner

/** Open decisions the owner answers. */
export const isOwnerDecision = (it: WorkItem) =>
  it.kind === "decision" && it.decided_by === "owner" && isOpen(it);

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
  initiative?: string;
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
    if (f.initiative && project?.initiative !== f.initiative) {
      return false;
    }
    if (f.kinds?.length && !f.kinds.includes(it.kind)) {
      return false;
    }
    if (owner && !owner.has(it.id)) {
      return false;
    }
    if (q) {
      const words = [it.id, it.title, project?.title, it.claimed, it.party]
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

/**
 * The status the board shows: In progress when claimed here or on any
 * other branch whose claim hasn't merged yet; else the file's status.
 */
export function boardStatus(it: WorkItem, flight?: InFlight): Status {
  return isOpen(it) && flight?.has(it.id) ? "In progress" : it.status;
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

/** Items grouped by project, in the snapshot's project order. */
export function byProject(
  s: WorkSnapshot,
  items: readonly WorkItem[],
): Array<{ project: WorkContainer | undefined; items: WorkItem[] }> {
  const groups = new Map<string, WorkItem[]>();
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
 * What stands between a proposal and committing to it: nothing ("free"),
 * an open decision of the owner's it needs ("decision"), or other open
 * items it needs ("items").
 */
export type ProposalGate = "free" | "decision" | "items";
export const PROPOSAL_GATES: readonly ProposalGate[] = [
  "free",
  "decision",
  "items",
];

export function proposalGate(
  it: WorkItem,
  itemOf: ReadonlyMap<string, WorkItem>,
): ProposalGate {
  if (
    it.open_needs.some((n) => {
      const need = itemOf.get(n);
      return !!need && isOwnerDecision(need);
    })
  ) {
    return "decision";
  }
  return it.open_needs.length ? "items" : "free";
}

/** One project's proposals, as the Proposals view groups them. */
export interface ProposalGroup {
  project?: WorkContainer;
  /** Every open item in the project is proposed: the project is the bet. */
  whole: boolean;
  /** Its proposed milestones, each with the proposed items it holds. */
  milestones: Array<{ milestone: WorkMilestone; items: WorkItem[] }>;
  /** Its proposed items that no proposed milestone holds. */
  items: WorkItem[];
  /** Its proposed items, in all. */
  count: number;
}

/**
 * The proposals among `items`, by project: whole projects first (they are
 * the bigger bets), then the most proposals first. Inside a group, what
 * can be committed now comes first, then what waits on a decision, then
 * what waits on other items; the most waited on first within each.
 */
export function proposalsOf(
  s: WorkSnapshot,
  items: readonly WorkItem[],
  /** The proposed milestones to show (the scope's). */
  milestones: readonly WorkMilestone[] = s.milestones,
  /** How many open items wait on each, for the order. */
  weight?: ReadonlyMap<string, number>,
): ProposalGroup[] {
  const itemOf = new Map(s.items.map((i) => [i.id, i]));
  const proposed = items.filter((it) => isOpen(it) && it.status === "Proposed");
  const rank = (it: WorkItem) =>
    PROPOSAL_GATES.indexOf(proposalGate(it, itemOf));
  const order = (list: WorkItem[]) =>
    list.sort(
      (a, b) =>
        rank(a) - rank(b) ||
        (weight?.get(b.id) ?? 0) - (weight?.get(a.id) ?? 0) ||
        idNumber(a.id) - idNumber(b.id),
    );
  const byKey = new Map<string, WorkItem[]>();
  for (const it of proposed) {
    const key = it.project ?? "";
    byKey.set(key, [...(byKey.get(key) ?? []), it]);
  }
  const bets = milestones.filter((m) => m.status === "Proposed");
  for (const m of bets) {
    const key = m.project ?? "";
    byKey.set(key, byKey.get(key) ?? []);
  }
  const groups: ProposalGroup[] = [];
  for (const [key, group] of byKey) {
    const project = s.projects.find((p) => p.id === key);
    const inGroup = new Set(group.map((it) => it.id));
    const held = new Set<string>();
    const ms = bets
      .filter((m) => (m.project ?? "") === key)
      .sort((a, b) => idNumber(a.id) - idNumber(b.id))
      .map((milestone) => {
        const its = milestone.constraints
          .map((c) => itemOf.get(c.id))
          .filter((it): it is WorkItem => !!it && inGroup.has(it.id));
        for (const it of its) {
          held.add(it.id);
        }
        return { milestone, items: order(its) };
      });
    const open = s.items.filter((it) => it.project === key && isOpen(it));
    groups.push({
      project,
      whole:
        !!project &&
        open.length > 0 &&
        open.every((it) => it.status === "Proposed"),
      milestones: ms,
      items: order(group.filter((it) => !held.has(it.id))),
      count: group.length,
    });
  }
  return groups.sort(
    (a, b) =>
      Number(b.whole) - Number(a.whole) ||
      b.count - a.count ||
      idNumber(a.project?.id ?? "") - idNumber(b.project?.id ?? ""),
  );
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
  if (boardStatus(it, flight) === "In progress") {
    return { text: "In progress", tone: "info" };
  }
  if (it.ready) {
    return { text: "Ready", tone: "success" };
  }
  if (it.blocked) {
    const n = it.open_needs.length;
    return { text: `Waits on ${n}`, tone: "secondary" };
  }
  return { text: it.status, tone: "secondary" };
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
  if (boardStatus(it, flight) === "In progress") {
    return it.kind === "external" ? "outside" : "agents";
  }
  if (it.open_needs.length) {
    return "items";
  }
  if (it.kind === "external") {
    return "outside";
  }
  if (isOwnerDecision(it) || it.status === "Proposed") {
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
  return status === "Dropped"
    ? undefined
    : status === "Proposed"
      ? "Proposed"
      : status === "In progress"
        ? "In flight"
        : status === "Done"
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
  const events = new Map<string, Array<{ t: number; status: Status }>>();
  for (const e of s.history ?? []) {
    const list = events.get(e.id) ?? [];
    list.push({ t: Date.parse(e.at), status: e.status });
    events.set(e.id, list);
  }
  const first = Math.min(now, ...[...events.values()].map((l) => l[0]!.t));
  const days: number[] = [];
  for (let d = dayStart(first); d <= dayStart(now); d += DAY) {
    days.push(d);
  }
  const statusAt = (id: string, t: number): Status | undefined => {
    let at: Status | undefined;
    for (const e of events.get(id) ?? []) {
      if (e.t > t) {
        break;
      }
      at = e.status;
    }
    return at;
  };
  const itemOf = new Map(s.items.map((i) => [i.id, i]));
  const stageAt = (it: WorkItem, t: number): Stage | undefined => {
    const st = statusAt(it.id, t);
    if (!st || st === "Dropped") {
      return undefined;
    }
    if (st === "Planned") {
      const open = it.needs.some((n) => {
        const need = itemOf.get(n);
        return need ? statusAt(n, t) !== "Done" : true;
      });
      return open ? "Waiting" : "Ready";
    }
    return st === "In progress" ? "In flight" : st;
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
    const done = list.find((e) => e.status === "Done");
    const planned = list.find(
      (e) => e.status === "Planned" || e.status === "In progress",
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
  const events = new Map<string, Array<{ t: number; status: Status }>>();
  for (const e of s.history ?? []) {
    const list = events.get(e.id) ?? [];
    list.push({ t: Date.parse(e.at), status: e.status });
    events.set(e.id, list);
  }
  for (const list of events.values()) {
    list.sort((a, b) => a.t - b.t);
  }
  const statusAt = (id: string, t: number): Status | undefined => {
    let at: Status | undefined;
    for (const e of events.get(id) ?? []) {
      if (e.t > t) {
        break;
      }
      at = e.status;
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
    const done = list.find((e) => e.status === "Done");
    const planned = list.find(
      (e) => e.status === "Planned" || e.status === "In progress",
    );
    if (done && planned) {
      lead.push(done.t - planned.t);
      leadPoints.push({ id: it.id, t: done.t, v: done.t - planned.t });
    }
    if (it.kind === "decision" && it.decided_by === "owner") {
      // Asked when it was made: its creation date, or its first commit.
      const made = it.created ? Date.parse(`${it.created}T00:00`) : NaN;
      const asked = Number.isNaN(made) ? list[0]?.t : made;
      if (asked === undefined) {
        continue;
      }
      if (it.status === "Done" && done) {
        const v = Math.max(0, done.t - asked);
        decisionLatency.push(v);
        decisionPoints.push({ id: it.id, t: done.t, v });
      } else if (isOpen(it)) {
        decisionsOpen.push(now - asked);
        decisionPoints.push({ id: it.id, t: now, v: now - asked, open: true });
      }
    }
  }
  const isOpenStatus = (st?: Status) =>
    st !== undefined && st !== "Done" && st !== "Dropped";
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
  return { path, done: path.filter((it) => it.status === "Done").length };
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
  /** The initiative or milestone. */
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
 * Orders groups of items (initiatives, or milestones) by the needs between
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

/** Initiatives in the order their work can happen. */
export function roadmapOf(
  s: WorkSnapshot,
  items: readonly WorkItem[],
  flight?: InFlight,
): RoadmapRow[] {
  const projectsOf = (ini: string) =>
    new Set(s.projects.filter((p) => p.initiative === ini).map((p) => p.id));
  return orderOf(
    s.initiatives.map((i) => {
      const ps = projectsOf(i.id);
      return {
        id: i.id,
        title: i.title,
        members: s.items
          .filter((it) => ps.has(it.project ?? ""))
          .map((it) => it.id),
      };
    }),
    s,
    items,
    flight,
  );
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
            m.status !== "Done" &&
            m.status !== "Dropped" &&
            (proposals || m.status !== "Proposed"),
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
            (proposals || it.status !== "Proposed"),
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

/** The map's id prefix for a project's items that no milestone holds. */
export const UNSHAPED = "unshaped-";
/** The map's lane for release gates, and the prefix for lanes outside a focused release. */
const RELEASES = "releases";
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
  /** A release gate (it needs only milestones), with its progress over them. */
  gate?: {
    milestones: number;
    milestonesDone: number;
    items: number;
    itemsDone: number;
    tokensLeft: number;
    decisions: number;
  };
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
  /** The release in focus, if any. */
  focus?: string;
}

/**
 * The milestones as a plan without dates: each placed at its earliest
 * start after everything it waits on (a forward pass, as in the critical
 * path method), measured in steps or in the tokens left on the way. A
 * backward pass gives each one's slack; the critical path is where the
 * slack is none. Milestones in a loop move together as one. Lanes are
 * their projects (or initiatives).
 */
export function milestoneMapOf(
  snapshot: WorkSnapshot,
  flight: InFlight | undefined,
  unit: "steps" | "tokens",
  /** A release gate to measure to: what it needs, and the rest apart. */
  focus?: string,
): MilestoneMap {
  // The roadmap is committed work; proposals are the Proposals view's.
  const s = {
    ...snapshot,
    milestones: snapshot.milestones.filter((m) => m.status !== "Proposed"),
  };
  const itemOf = new Map(s.items.map((i) => [i.id, i]));
  const msOf = new Map(s.milestones.map((m) => [m.id, m]));
  const projectOf = new Map(s.projects.map((p) => [p.id, p]));
  // Each project's open work that no milestone holds stands together as
  // one bar ("not in a milestone yet"), for context: placed after the
  // milestones they wait on, they never move a milestone (lumping a
  // project's items together would make loops its items don't have).
  // Decisions and outside waits no milestone holds stay off the map: they
  // are in Your move and Waiting outside.
  const covered = new Set(
    s.milestones.flatMap((m) => m.constraints.map((c) => c.id)),
  );
  const unshaped = new Map<string, string[]>();
  for (const it of s.items) {
    if (
      it.project &&
      isOpen(it) &&
      isWork(it) &&
      !isReleaseItem(it) &&
      it.status !== "Proposed" &&
      !covered.has(it.id)
    ) {
      const key = `${UNSHAPED}${it.project}`;
      unshaped.set(key, [...(unshaped.get(key) ?? []), it.id]);
    }
  }
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
  const rows = milestoneRoadmapOf(s, s.items, flight, true);
  const itemsIn = (id: string) =>
    unshaped.get(id) ??
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
      .filter((it): it is WorkItem => !!it && it.status !== "Dropped");
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
  // Groups (loops) in step order: a group's waits are its members' waits outside it.
  const groupOf = new Map<string, string>();
  for (const r of rows) {
    groupOf.set(r.id, r.group.join());
  }
  const groups = [...new Set(rows.map((r) => r.group.join()))].sort(
    (a, b) =>
      rows.find((r) => r.group.join() === a)!.step -
      rows.find((r) => r.group.join() === b)!.step,
  );
  const membersOf = (g: string) => rows.filter((r) => r.group.join() === g);
  const predsOf = (g: string) => [
    ...new Set(
      membersOf(g).flatMap((r) =>
        r.waitsOn
          .map((w) => groupOf.get(w.id))
          .filter((x): x is string => !!x && x !== g),
      ),
    ),
  ];
  const gCost = (g: string) =>
    unit === "steps" ? 1 : membersOf(g).reduce((n, r) => n + cost(r.id), 0);
  const es = new Map<string, number>();
  const ef = new Map<string, number>();
  for (const g of groups) {
    const start = Math.max(0, ...predsOf(g).map((p) => ef.get(p) ?? 0));
    es.set(g, start);
    ef.set(g, start + gCost(g));
  }
  const total = Math.max(0, ...ef.values());
  // Release gates: milestones that need only other milestones. Each one's
  // cone is everything upstream of it, the milestones it needs to be
  // feature complete.
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
  // Release gates are release items (human-in-the-lead's format): each
  // one waits on the milestones and items it needs.
  const isGate = (id: string) => isReleaseItem(itemOf.get(id));
  // A gate's progress: over the milestones it needs, their items, and the
  // items it needs directly.
  const gateStats = (id: string) => {
    const ms = [...upstreamOf(id)].filter((x) => !isGate(x));
    const items = new Set([...ms.flatMap((x) => itemsIn(x)), ...itemsIn(id)]);
    let done = 0;
    let left = 0;
    const decisions = new Set<string>();
    for (const i of items) {
      const it = itemOf.get(i);
      if (!it || it.status === "Dropped") {
        continue;
      }
      if (it.status === "Done") {
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
      milestonesDone: ms.filter((x) => msOf.get(x)?.status === "Done").length,
      items: items.size,
      itemsDone: done,
      tokensLeft: left,
      decisions: decisions.size,
    };
  };
  const focusId = focus && rows.some((r) => r.id === focus) ? focus : undefined;
  const cone = focusId ? new Set([focusId, ...upstreamOf(focusId)]) : undefined;
  const coneGroups = cone
    ? new Set([...cone].map((id) => groupOf.get(id)!))
    : undefined;
  // The end the slack is measured to: the release, or the last of all.
  const end = focusId ? ef.get(groupOf.get(focusId)!)! : total;
  const succsOf = (g: string) =>
    groups.filter(
      (x) => predsOf(x).includes(g) && (!coneGroups || coneGroups.has(x)),
    );
  // Latest finish: the latest each can end without delaying the end
  // (total slack, not just the room before the next one starts).
  const lf = new Map<string, number>();
  for (const g of [...groups].reverse()) {
    if (coneGroups && !coneGroups.has(g)) {
      continue;
    }
    const succ = succsOf(g);
    lf.set(
      g,
      succ.length ? Math.min(...succ.map((x) => lf.get(x)! - gCost(x))) : end,
    );
  }
  const slackOf = (g: string) =>
    lf.has(g) ? lf.get(g)! - ef.get(g)! : Number.NaN;
  const eps = unit === "steps" ? 0 : 1e-6 * Math.max(1, total);
  // The critical path: from the end back along waits that leave no slack.
  const path: string[] = [];
  let at = focusId
    ? groupOf.get(focusId)
    : groups.find(
        (g) => Math.abs(ef.get(g)! - total) <= eps && slackOf(g) <= eps,
      );
  while (at) {
    path.unshift(...membersOf(at).map((r) => r.id));
    const here = at;
    at = predsOf(here).find(
      (p) => Math.abs(ef.get(p)! - es.get(here)!) <= eps && slackOf(p) <= eps,
    );
  }
  const onPath = new Set(path);
  // Lanes: projects (or initiatives), in order of their first milestone.
  const laneOf = (id: string) => {
    if (id.startsWith(UNSHAPED)) {
      return id.slice(UNSHAPED.length);
    }
    if (isGate(id)) {
      return RELEASES;
    }
    const m = msOf.get(id)!;
    const base = m.project ?? m.initiative ?? "";
    // With a release in focus, what it doesn't need moves to its own band.
    return cone && !cone.has(id) ? `${OUTSIDE}${base}` : base;
  };
  const laneTitle = (id: string): string =>
    id === RELEASES
      ? "Releases"
      : id.startsWith(OUTSIDE)
        ? laneTitle(id.slice(OUTSIDE.length))
        : (projectOf.get(id)?.title ??
          s.initiatives.find((i) => i.id === id)?.title ??
          "No project");
  const nodes: MapNode[] = rows.map((r) => {
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
      loop: r.group.length > 1 ? r.group : undefined,
      started: r.counts.Done > 0 || r.counts["In flight"] > 0,
      unshaped: r.id.startsWith(UNSHAPED),
      gate: isGate(r.id) ? gateStats(r.id) : undefined,
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
  for (const [id, members] of unshaped) {
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
      lane:
        cone && !softEdges.some((e) => e.from === id && cone.has(e.to))
          ? `${OUTSIDE}${laneOf(id)}`
          : laneOf(id),
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
      after: [],
    });
  }
  // Lanes: projects with milestones first (by their first start), then
  // those not yet shaped into milestones, in their initiatives' order;
  // then the releases; then, with a release in focus, what it doesn't need.
  const shaped = new Set(nodes.filter((n) => !n.unshaped).map((n) => n.lane));
  const band = (lane: string) =>
    lane.startsWith(OUTSIDE) ? 2 : lane === RELEASES ? 1 : 0;
  const iniRank = (lane: string) =>
    s.initiatives.findIndex((i) => i.id === projectOf.get(lane)?.initiative);
  const laneIds = [
    ...new Set(
      [...nodes]
        .sort(
          (a, b) =>
            band(a.lane) - band(b.lane) ||
            Number(!shaped.has(a.lane)) - Number(!shaped.has(b.lane)) ||
            (shaped.has(a.lane)
              ? a.x0 - b.x0
              : iniRank(a.lane) - iniRank(b.lane) ||
                a.lane.localeCompare(b.lane)),
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
  const edges: MapEdge[] = rows.flatMap((r): MapEdge[] =>
    r.waitsOn
      .filter((w) => shown.has(w.id))
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
    .filter((m) => m.status === "Done")
    .map((m) => ({ id: m.id, title: m.title }));
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
    focus: focusId,
  };
}

/**
 * The fewest waits that tie a group of initiatives into a loop: removing
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
