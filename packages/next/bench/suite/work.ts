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
  WorkItem,
  WorkItemText,
  WorkSnapshot,
} from "../../scripts/work/query.mjs";

export type {
  ItemKind,
  Status,
  WorkContainer,
  WorkElsewhere,
  WorkItem,
  WorkItemText,
  WorkSnapshot,
};

/** The read API's version this board understands. */
export const READS_API_VERSION = 1;

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
      const words = [
        it.id,
        it.title,
        project?.title,
        it.claimed,
        it.party,
        it.milestone,
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
  Waiting: "Waiting on items",
  Ready: "Ready",
  "In flight": "In flight",
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
