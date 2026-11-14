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

const PRIORITY_RANK = { urgent: 0, high: 1, medium: 2, low: 3 } as const;

/**
 * The order cards take in a column: ready before blocked, then by
 * priority, then what unblocks the most, then by number.
 */
export function byUrgency(a: WorkItem, b: WorkItem): number {
  return (
    Number(b.ready) - Number(a.ready) ||
    (PRIORITY_RANK[a.priority ?? "low"] ?? 4) -
      (PRIORITY_RANK[b.priority ?? "low"] ?? 4) ||
    b.needed_by.length - a.needed_by.length ||
    idNumber(a.id) - idNumber(b.id)
  );
}

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

/** The board's columns: each status with its items, most urgent first. */
export function columnsOf(
  items: readonly WorkItem[],
  flight?: InFlight,
): Array<{ status: Status; items: WorkItem[] }> {
  return STATUSES.map((status) => ({
    status,
    items: items
      .filter((it) => boardStatus(it, flight) === status)
      .sort(byUrgency),
  }));
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

export interface WorkCounts {
  /** Open decisions the owner answers (whether or not claimed). */
  owner: number;
  ready: number;
  inProgress: number;
  blocked: number;
  done: number;
  /** Everything but Dropped. */
  live: number;
}

/**
 * The views' counts over a set of items (`views.mjs` counts the same;
 * work claimed elsewhere counts as in progress, not ready or blocked).
 */
export function countsOf(
  items: readonly WorkItem[],
  flight?: InFlight,
): WorkCounts {
  const here = (it: WorkItem) => !flight?.has(it.id);
  return {
    owner: items.filter(isOwnerDecision).length,
    ready: items.filter((it) => it.ready && here(it)).length,
    inProgress: items.filter((it) => boardStatus(it, flight) === "In progress")
      .length,
    blocked: items.filter((it) => it.blocked && here(it)).length,
    done: items.filter((it) => it.status === "Done").length,
    live: items.filter((it) => it.status !== "Dropped").length,
  };
}

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
