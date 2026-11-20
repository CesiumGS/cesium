/**
 * The Work page's views and its Release view, as pure functions for tests
 * (CS-744; DESIGN.md, "The view shell"). The tracker's own model stays in
 * work.ts; this file adds what the shell and the views built on it share:
 * how views mount, and what is left in a release and what holds it.
 */

import {
  idNumber,
  type InFlight,
  isOpen,
  isReleaseItem,
  isWork,
  releaseBandsOf,
  releaseClosuresOf,
  releaseLadderOf,
  shortVersion,
  stageOf,
  type WorkItem,
  type WorkMilestone,
  type WorkSnapshot,
} from "./work.ts";

// ------------------------------------------------------------ the shell

/**
 * Where a view's tab sits: in the page's tab row, in the roadmap's view
 * row, or behind the roadmap's "Older views" menu.
 */
export type ViewPlace = "page" | "roadmap" | "older";

/** What the shell needs to place a view; the view's own parts ride along. */
export interface ViewEntry {
  /** Its search value (`view=` on the page, `roadmap=` on the roadmap): a short slug. */
  id: string;
  place: ViewPlace;
  /** Its place in the row: lower first. */
  order: number;
  /** The views it retires: a built-in or older view with one of these IDs goes. */
  replaces?: readonly string[];
}

/** A view's ID: a lowercase slug, as the route accepts it. */
export const VIEW_ID = /^[a-z][a-z0-9-]{0,23}$/;

/**
 * The views the shell shows, by place and in order. A mounted view with a
 * built-in view's ID takes its place; one that `replaces` other IDs
 * retires them (an older view whose replacement has landed). Two mounted
 * views with one ID, or an ID that isn't a slug, are problems: the first
 * by file name stays, the other is left out and named.
 */
export function mountViews<T extends ViewEntry>(
  builtIn: readonly T[],
  mounted: readonly T[],
): { page: T[]; roadmap: T[]; older: T[]; problems: string[] } {
  const problems: string[] = [];
  const added = new Map<string, T>();
  for (const v of mounted) {
    if (!VIEW_ID.test(v.id)) {
      problems.push(`A view's ID "${v.id}" isn't a lowercase slug`);
    } else if (added.has(v.id)) {
      problems.push(`Two views use the ID "${v.id}"`);
    } else {
      added.set(v.id, v);
    }
  }
  const retired = new Set([...added.values()].flatMap((v) => v.replaces ?? []));
  const all = [
    ...builtIn.filter((v) => !added.has(v.id) && !retired.has(v.id)),
    ...[...added.values()].filter((v) => !retired.has(v.id)),
  ];
  const at = (place: ViewPlace) =>
    all
      .filter((v) => v.place === place)
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  return {
    page: at("page"),
    roadmap: at("roadmap"),
    older: at("older"),
    problems,
  };
}

/** The view chosen: the one asked for when it is shown, else the first. */
export function pickView<T extends { id: string }>(
  views: readonly T[],
  id: string | undefined,
): T | undefined {
  return views.find((v) => v.id === id) ?? views[0];
}

// ------------------------------------------------------------ releases

/** A release the picker offers. */
export interface ReleaseChoice {
  id: string;
  /** "2.0.0-alpha.1". */
  version: string;
  /** "alpha.1"; a final release keeps its number, "2.0.0". */
  short: string;
  title: string;
  proposed: boolean;
}

/**
 * The open releases in ladder order (alpha.1 first), proposed ones only
 * when asked for. Their first is the default.
 */
export function releaseChoicesOf(
  s: WorkSnapshot,
  proposals: boolean,
): ReleaseChoice[] {
  return releaseLadderOf(s, proposals).map((r) => {
    const version = r.release ?? r.title;
    return {
      id: r.id,
      version,
      short: shortVersion(version),
      title: r.title,
      proposed: r.state === "proposed",
    };
  });
}

/** The release asked for when it is offered, else the first (alpha.1). */
export function pickRelease(
  choices: readonly ReleaseChoice[],
  id: string | undefined,
): ReleaseChoice | undefined {
  return choices.find((r) => r.id === id) ?? choices[0];
}

/**
 * A size, in items now and in tokens once estimates exist. Tokens are a
 * range: `low` sums the estimates there are, and `high` adds each item
 * without one at the median of those estimates. Both equal when every
 * item has one. Never a time.
 */
export interface SizeLeft {
  items: number;
  tokens?: { low: number; high: number; estimated: number };
}

export function sizeOf(items: readonly WorkItem[]): SizeLeft {
  const est = items
    .map((it) => it.estimate_tokens)
    .filter((t): t is number => typeof t === "number" && t > 0);
  if (!est.length) {
    return { items: items.length };
  }
  const sorted = [...est].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  const median =
    sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  const low = est.reduce((a, b) => a + b, 0);
  return {
    items: items.length,
    tokens: {
      low,
      high: low + (items.length - est.length) * median,
      estimated: est.length,
    },
  };
}

/** "40k", "1.2M": a token count, short. */
export function tokensText(n: number): string {
  return n >= 1e6
    ? `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`
    : n >= 1e3
      ? `${Math.round(n / 1e3)}k`
      : `${Math.round(n)}`;
}

/** A size in words, labeled which: "12 items", "12 items · 40k–55k tokens (estimates on 9)". */
export function sizeText(size: SizeLeft): string {
  const items = `${size.items} ${size.items === 1 ? "item" : "items"}`;
  const t = size.tokens;
  if (!t) {
    return items;
  }
  const range =
    t.low === t.high
      ? `${tokensText(t.low)} tokens`
      : `${tokensText(t.low)}–${tokensText(t.high)} tokens`;
  return `${items} · ${range} (estimates on ${t.estimated} of ${size.items})`;
}

/**
 * One "done when" clause, as human-in-the-lead reads it (its
 * `unmet_clauses`): checked once every item linked to it is done and
 * the milestone's check has passed.
 */
export interface ClauseRow {
  clause: string;
  text: string;
  /**
   * "checked": its items done and the check passed; "check": its items
   * done, the check not passed yet; "open": items still open; "unlinked":
   * no item is linked to it yet, so nothing can show it met.
   */
  status: "checked" | "check" | "open" | "unlinked";
  /** Its open items. */
  open: string[];
}

/** One of the release's milestones, as a row. */
export interface ReleaseMilestone {
  id: string;
  title: string;
  outcome?: string;
  proposed: boolean;
  clauses: ClauseRow[];
  /** Clauses checked, of all. */
  checked: number;
  /** Open items linked to no clause yet ("c?"). */
  unlinked: string[];
  /** Its open work: the items it names and the open work they need, in this release. */
  left: SizeLeft;
  /** Of that work, what can start now. */
  ready: string[];
  /** The gates on its way. */
  gates: string[];
  /** What shaping still owes it. */
  toShape: string[];
}

/** A decision or an outside wait holding the release. */
export interface ReleaseGate {
  id: string;
  kind: "decision" | "external";
  title: string;
  /** Who answers it, or whom it waits on. */
  who?: string;
  /** When it entered its state (or was created): its age is from here. */
  since?: string;
  /** What happens if nobody answers, and by when; only when the record has them. */
  default?: string;
  deadline?: string;
  /** Its own needs are done: it can be answered now. */
  answerable: boolean;
  /** The release's milestones it holds. */
  milestones: string[];
  /** Open items in the release behind it, directly or through others. */
  behind: number;
}

/** Something wrong in the release's graph (DESIGN.md: the interim rule until CS-745). */
export interface ReleaseException {
  kind: "crossing" | "two-milestones";
  /** The item or milestone at fault. */
  id: string;
  /** The milestones involved. */
  milestones: string[];
  /** For a crossing: the needs from the release to it. */
  path: string[];
}

/** The rule the exceptions count follows until the Health view (CS-745) defines it. */
export const EXCEPTION_RULE =
  "Until the Health view defines exceptions, this counts the release's crossings (an item or milestone its milestones pull in from outside the release, or one it needs directly) and the open items two or more of its milestones name.";

export interface ReleaseView {
  release: ReleaseChoice;
  /** Earlier open releases, each with its open milestones: they come first. */
  earlier: Array<{ id: string; short: string; milestones: number }>;
  /** Its open milestones (those it is the first release to need), in the planner's order. */
  milestones: ReleaseMilestone[];
  /** The milestones it names that are done. */
  done: string[];
  /** Every open work item in the release, once. */
  left: SizeLeft;
  /** Gates: most behind first, then the oldest. */
  gates: ReleaseGate[];
  /** Open work in the release that can start now, most waiting behind first. */
  ready: string[];
  /** For each item ready now: the open items in the release behind it, directly or through others. */
  readyBehind: Record<string, number>;
  exceptions: ReleaseException[];
}

/** Optional fields a record may carry: read when present, never required. */
type MaybeTimed = { default?: unknown; deadline?: unknown };
const textField = (v: unknown) =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;

/** When an item entered its current state, else when it was created. */
export function sinceOf(s: WorkSnapshot, it: WorkItem): string | undefined {
  for (let i = s.history.length - 1; i >= 0; i--) {
    const e = s.history[i]!;
    if (e.id === it.id) {
      return e.state === it.state ? e.at : (it.created ?? e.at);
    }
  }
  return it.created;
}

const passed = (m: WorkMilestone) =>
  m.state === "done" || /^(pass|answered) /.test(m.check_results.at(-1) ?? "");

/** A milestone's clauses, checked or not, and its open items linked to none. */
export function clausesOf(
  m: WorkMilestone,
  isDone: (id: string) => boolean,
): { clauses: ClauseRow[]; unlinked: string[] } {
  const ok = passed(m);
  const clauses = m.done_when.map((c): ClauseRow => {
    const linked = m.constraints.filter((x) => x.clause === c.clause);
    const open = linked.filter((x) => !isDone(x.id)).map((x) => x.id);
    return {
      clause: c.clause,
      text: c.text,
      status: open.length
        ? "open"
        : m.state === "done"
          ? "checked"
          : !linked.length
            ? "unlinked"
            : ok
              ? "checked"
              : "check",
      open,
    };
  });
  const unlinked = m.constraints
    .filter((x) => x.clause === "c?" && !isDone(x.id))
    .map((x) => x.id);
  return { clauses, unlinked };
}

/**
 * What is left in one release and what holds it (CS-744): its open
 * milestones, each with its clauses and the work left on its way; the
 * decisions and outside waits on that work (its gates); what can start
 * now; and its exceptions. Its milestones are those it is the first
 * release to need (an earlier release's milestones are that release's).
 * The work on a milestone's way is what it names and, through their
 * needs, the open items they wait on, stopping at milestones of other
 * releases. Proposed milestones and items count only when `proposals`.
 */
export function releaseViewOf(
  snap: WorkSnapshot,
  releaseId: string | undefined,
  {
    proposals = false,
    flight,
    order,
  }: {
    proposals?: boolean;
    flight?: InFlight;
    /** The planner's order of milestones (planOf's bands), when known. */
    order?: readonly string[];
  } = {},
): ReleaseView | undefined {
  const s = proposals
    ? snap
    : {
        ...snap,
        milestones: snap.milestones.filter((m) => m.state !== "proposed"),
      };
  const choices = releaseChoicesOf(s, proposals);
  const release = pickRelease(choices, releaseId);
  if (!release) {
    return undefined;
  }
  const itemOf = new Map(s.items.map((i) => [i.id, i]));
  const msOf = new Map(
    s.milestones.filter((m) => m.state !== "dropped").map((m) => [m.id, m]),
  );
  const isDone = (id: string) =>
    (itemOf.get(id) ?? msOf.get(id))?.state === "done";
  const counts = (it: WorkItem) =>
    isOpen(it) && (proposals || it.state !== "proposed");

  const closures = releaseClosuresOf(s, proposals);
  const { bands, bandOf } = releaseBandsOf(s, closures);
  const k = closures.findIndex((c) => c.id === release.id);
  const own = new Set(bands[k]?.milestones ?? []);
  const rank = new Map((order ?? []).map((id, i) => [id, i]));
  const ownList = [...own].sort(
    (a, b) =>
      (rank.get(a) ?? Infinity) - (rank.get(b) ?? Infinity) ||
      idNumber(a) - idNumber(b),
  );

  /** Everything open on the way to `start`, within this release. */
  const reachOf = (start: readonly string[]) => {
    const seen = new Set<string>();
    const queue = [...start];
    while (queue.length) {
      const id = queue.shift()!;
      if (seen.has(id)) {
        continue;
      }
      const m = msOf.get(id);
      if (m) {
        // Another release's milestone answers for its own work.
        if (m.state === "done" || (!own.has(id) && bandOf.has(id))) {
          continue;
        }
        seen.add(id);
        queue.push(...m.constraints.map((c) => c.id));
        continue;
      }
      const it = itemOf.get(id);
      if (!it || !counts(it) || isReleaseItem(it)) {
        continue;
      }
      seen.add(id);
      queue.push(...it.open_needs);
    }
    return seen;
  };

  const releaseItem = itemOf.get(release.id)!;
  const directItems = releaseItem.needs.filter((n) => itemOf.has(n));
  const all = reachOf([...ownList, ...directItems]);
  const reachOfMs = new Map(ownList.map((id) => [id, reachOf([id])]));
  const openItems = [...all]
    .map((id) => itemOf.get(id))
    .filter((it): it is WorkItem => !!it);
  const work = openItems.filter(isWork);

  // What waits behind each item, inside the release.
  const behind = new Map<string, Set<string>>();
  const waitersOf = new Map<string, string[]>();
  for (const it of openItems) {
    for (const n of it.open_needs) {
      waitersOf.set(n, [...(waitersOf.get(n) ?? []), it.id]);
    }
  }
  const behindOf = (id: string) => {
    const known = behind.get(id);
    if (known) {
      return known;
    }
    const out = new Set<string>();
    const queue = [...(waitersOf.get(id) ?? [])];
    while (queue.length) {
      const w = queue.shift()!;
      if (!out.has(w)) {
        out.add(w);
        queue.push(...(waitersOf.get(w) ?? []));
      }
    }
    behind.set(id, out);
    return out;
  };

  const isReady = (it: WorkItem) =>
    isWork(it) && !isReleaseItem(it) && stageOf(it, flight) === "Ready";
  const ready = work
    .filter(isReady)
    .sort(
      (a, b) =>
        behindOf(b.id).size - behindOf(a.id).size ||
        idNumber(a.id) - idNumber(b.id),
    )
    .map((it) => it.id);

  const gates = openItems
    .filter(
      (it): it is WorkItem & { kind: "decision" | "external" } =>
        it.kind === "decision" || it.kind === "external",
    )
    .map((it): ReleaseGate => {
      const extra = it as WorkItem & MaybeTimed;
      return {
        id: it.id,
        kind: it.kind,
        title: it.title,
        who: it.kind === "decision" ? it.decider : it.waiting_on,
        since: sinceOf(s, it),
        default: textField(extra.default),
        deadline: textField(extra.deadline),
        answerable: !it.open_needs.length,
        milestones: ownList.filter((m) => reachOfMs.get(m)!.has(it.id)),
        behind: [...behindOf(it.id)].filter(
          (id) => itemOf.get(id)?.kind === "work",
        ).length,
      };
    })
    .sort(
      (a, b) =>
        b.behind - a.behind ||
        b.milestones.length - a.milestones.length ||
        (a.since ?? "").localeCompare(b.since ?? "") ||
        idNumber(a.id) - idNumber(b.id),
    );

  const milestones = ownList.map((id): ReleaseMilestone => {
    const m = msOf.get(id)!;
    const { clauses, unlinked } = clausesOf(m, isDone);
    const reach = [...reachOfMs.get(id)!];
    const mine = reach
      .map((x) => itemOf.get(x))
      .filter((it): it is WorkItem => !!it && isWork(it));
    return {
      id,
      title: m.title,
      outcome: m.outcome,
      proposed: m.state === "proposed",
      clauses,
      checked: clauses.filter((c) => c.status === "checked").length,
      unlinked,
      left: sizeOf(mine),
      ready: ready.filter((r) => reach.includes(r)),
      gates: gates.filter((g) => reach.includes(g.id)).map((g) => g.id),
      toShape: m.to_shape,
    };
  });

  // Exceptions, by the interim rule (EXCEPTION_RULE).
  const closure = closures[k];
  const exceptions: ReleaseException[] = (closure?.violations ?? []).map(
    (v) => ({
      kind: "crossing",
      id: v.item,
      milestones: v.milestones,
      path: v.path,
    }),
  );
  const namedBy = new Map<string, string[]>();
  for (const id of ownList) {
    for (const c of msOf.get(id)!.constraints) {
      const it = itemOf.get(c.id);
      if (it && counts(it)) {
        const by = namedBy.get(c.id) ?? [];
        if (!by.includes(id)) {
          namedBy.set(c.id, [...by, id]);
        }
      }
    }
  }
  for (const [id, by] of namedBy) {
    if (by.length > 1) {
      exceptions.push({ kind: "two-milestones", id, milestones: by, path: [] });
    }
  }

  const earlier = closures.slice(0, Math.max(0, k)).map((c, i) => ({
    id: c.id,
    short: shortVersion(c.version),
    milestones: bands[i]?.milestones.length ?? 0,
  }));

  return {
    release,
    earlier: earlier.filter((e) => e.milestones > 0),
    milestones,
    done: releaseItem.needs.filter((n) => msOf.get(n)?.state === "done"),
    left: sizeOf(work),
    gates,
    ready,
    readyBehind: Object.fromEntries(ready.map((id) => [id, behindOf(id).size])),
    exceptions: exceptions.filter(
      (e, i) =>
        exceptions.findIndex((x) => x.kind === e.kind && x.id === e.id) === i,
    ),
  };
}
