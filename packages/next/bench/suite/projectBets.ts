/**
 * The Projects view's model (CS-748; DESIGN.md, "The Projects view"):
 * each project as a bet. A row per project says where its milestones
 * land (the releases, in ladder order), how much of what it promises is
 * checked (its milestones' "done when" clauses), what it has spent
 * against its appetite once estimates exist, and the open decisions it
 * holds. Rows sort by the project's next release. Pure, for tests; the
 * view is `views/Projects.tsx` (ProjectBetsView).
 */

import {
  idNumber,
  type InFlight,
  isOpen,
  isWork,
  NO_RELEASE,
  releaseBandsOf,
  releaseClosuresOf,
  type Stage,
  shortVersion,
  stageOf,
  type WorkItem,
  type WorkMilestone,
  type WorkSnapshot,
} from "./work.ts";
import {
  type ClauseRow,
  clausesOf,
  tokensText as tokens,
} from "./workModel.ts";

/** A release column: one per open release in ladder order, then No release. */
export interface BetColumn {
  /** The release item's ID, or `NO_RELEASE`. */
  id: string;
  /** "alpha.1"; "None" for the last column. */
  short: string;
  title: string;
  proposed: boolean;
}

/** Tokens against appetite: read only when the records carry them. */
export interface BetSpend {
  /** Its milestones' appetites together, when any has one. */
  appetite?: number;
  /** Its work items, and how many of them carry an estimate. */
  items: number;
  estimated: number;
  /**
   * The estimates as a range: the sum of those there are, to that plus
   * each unestimated item at their median. Absent with no estimate.
   */
  estimate?: { low: number; high: number };
  /** Tokens spent, once the ledger records any. */
  spent?: number;
}

/** One of a milestone's items, as its open milestone lists it. */
export interface BetItem {
  id: string;
  title: string;
  kind: WorkItem["kind"];
  stage?: Stage;
  /** The clause it is linked to ("c1"), "c?" when none yet. */
  clause: string;
}

/** A milestone of the project, as a row under it. */
export interface BetMilestone {
  id: string;
  title: string;
  outcome?: string;
  proposed: boolean;
  done: boolean;
  /** Its column: the release that first needs it (`columns`' index). */
  column: number;
  clauses: ClauseRow[];
  /** Clauses checked, of `clauses.length`. */
  checked: number;
  /** Its items, open first in stage order, then done. */
  items: BetItem[];
  /** Its items done, of all. */
  progress: { done: number; total: number };
  /** Open decisions on its way: its items' and what they wait on, any project's. */
  decisions: string[];
  spend: BetSpend;
}

/** One of the project's own open decisions: a badge on its row. */
export interface BetDecision {
  id: string;
  title: string;
  /** The owner decides it (no decider named is the owner too). */
  owner: boolean;
  /** Nothing it needs is open: it can be answered now. */
  answerable: boolean;
  proposed: boolean;
}

/** A project as a bet: a row of the view. */
export interface ProjectBet {
  id: string;
  title: string;
  proposed: boolean;
  /** The column of its next release; absent when no milestone of it is open. */
  next?: number;
  /** Its next milestone's outcome: the first open one in the planner's order. */
  nextOutcome?: { id: string; text: string };
  /** Open milestones per column. */
  lands: number[];
  /** Its open milestones by column, in the planner's order; then its done ones. */
  milestones: BetMilestone[];
  /** Progress by clauses, over every milestone, done ones too. */
  clauses: {
    checked: number;
    /** Items done, the milestone's check not passed yet. */
    check: number;
    total: number;
    /** Milestones with no "done when" clause yet. */
    unshaped: number;
    /** One per milestone, in row order: its clauses and how many are checked. */
    segments: Array<{
      id: string;
      total: number;
      checked: number;
      check: number;
    }>;
  };
  decisions: BetDecision[];
  spend: BetSpend;
}

/** A run of rows with one next release. */
export interface BetGroup {
  /** The column index, or -1 for projects with no open milestone. */
  column: number;
  label: string;
  projects: ProjectBet[];
}

export interface ProjectBets {
  columns: BetColumn[];
  /** Every row, in order: by next release, then the planner's order. */
  rows: ProjectBet[];
  groups: BetGroup[];
  /** Some record carries an appetite, an estimate or tokens spent. */
  hasSpend: boolean;
}

const isOwner = (who?: string) => !who || who === "owner";

/** Tokens against appetite over a set of items and milestones. */
export function spendOf(
  items: readonly WorkItem[],
  milestones: readonly WorkMilestone[],
): BetSpend {
  const work = items.filter((it) => isWork(it) && it.state !== "dropped");
  const est = work
    .map((it) => it.estimate_tokens)
    .filter((t): t is number => typeof t === "number" && t > 0);
  const spentOn = work
    .map((it) => it.tokens_spent)
    .filter((t): t is number => typeof t === "number" && t >= 0);
  const appetites = milestones
    .map((m) => m.appetite_tokens)
    .filter((t): t is number => typeof t === "number" && t > 0);
  let estimate: BetSpend["estimate"];
  if (est.length) {
    const sorted = [...est].sort((a, b) => a - b);
    const mid = sorted.length >> 1;
    const median =
      sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
    const low = est.reduce((a, b) => a + b, 0);
    estimate = { low, high: low + (work.length - est.length) * median };
  }
  return {
    appetite: appetites.length
      ? appetites.reduce((a, b) => a + b, 0)
      : undefined,
    items: work.length,
    estimated: est.length,
    estimate,
    spent: spentOn.length ? spentOn.reduce((a, b) => a + b, 0) : undefined,
  };
}

/** The record says something about tokens: an appetite, an estimate or spend. */
export const hasTokens = (sp: BetSpend) =>
  sp.appetite !== undefined || sp.estimated > 0 || sp.spent !== undefined;

const STAGE_RANK = new Map<Stage | undefined, number>([
  ["In flight", 0],
  ["Ready", 1],
  ["Waiting", 2],
  ["Proposed", 3],
  ["Done", 4],
  [undefined, 5],
]);

/**
 * Every open project as a bet, sorted by its next release (the earliest
 * release that needs one of its open milestones; `releaseBandsOf`), then
 * by where the planner reaches its first milestone, then by number.
 * Projects with no open milestone come last, as their own group.
 * Proposed milestones, decisions and projects count only when
 * `proposals`.
 */
export function projectBetsOf(
  snap: WorkSnapshot,
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
): ProjectBets {
  const s = proposals
    ? snap
    : {
        ...snap,
        milestones: snap.milestones.filter((m) => m.state !== "proposed"),
      };
  const closures = releaseClosuresOf(s, proposals);
  const { bandOf } = releaseBandsOf(s, closures);
  const columns: BetColumn[] = [
    ...closures.map((c) => ({
      id: c.id,
      short: shortVersion(c.version),
      title: c.title,
      proposed: c.proposed,
    })),
    { id: NO_RELEASE, short: "None", title: "No release", proposed: false },
  ];
  const none = columns.length - 1;
  const itemOf = new Map(s.items.map((i) => [i.id, i]));
  const msOf = new Map(
    s.milestones.filter((m) => m.state !== "dropped").map((m) => [m.id, m]),
  );
  const isDone = (id: string) =>
    (itemOf.get(id) ?? msOf.get(id))?.state === "done";
  const counts = (it: WorkItem) =>
    isOpen(it) && (proposals || it.state !== "proposed");
  const rank = new Map((order ?? []).map((id, i) => [id, i]));
  const byPlan = (a: string, b: string) =>
    (rank.get(a) ?? Infinity) - (rank.get(b) ?? Infinity) ||
    idNumber(a) - idNumber(b);

  /** Open decisions on a milestone's way, through its items' open needs. */
  const decisionsOn = (m: WorkMilestone) => {
    const found = new Set<string>();
    const seen = new Set<string>();
    const queue = m.constraints.map((c) => c.id);
    while (queue.length) {
      const id = queue.shift()!;
      if (seen.has(id) || msOf.has(id)) {
        continue; // another milestone answers for its own work
      }
      seen.add(id);
      const it = itemOf.get(id);
      if (!it || !counts(it)) {
        continue;
      }
      if (it.kind === "decision") {
        found.add(id);
      }
      queue.push(...it.open_needs);
    }
    return [...found].sort((a, b) => idNumber(a) - idNumber(b));
  };

  const milestoneOf = (m: WorkMilestone): BetMilestone => {
    const { clauses } = clausesOf(m, isDone);
    const items = m.constraints
      .filter((c) => itemOf.has(c.id))
      .map((c): BetItem => {
        const it = itemOf.get(c.id)!;
        return {
          id: it.id,
          title: it.title,
          kind: it.kind,
          stage: stageOf(it, flight),
          clause: c.clause,
        };
      })
      .filter((it) => it.stage !== undefined)
      .filter((it) => proposals || it.stage !== "Proposed")
      .sort(
        (a, b) =>
          STAGE_RANK.get(a.stage)! - STAGE_RANK.get(b.stage)! ||
          idNumber(a.id) - idNumber(b.id),
      );
    const done = m.state === "done";
    return {
      id: m.id,
      title: m.title,
      outcome: m.outcome,
      proposed: m.state === "proposed",
      done,
      column: done ? none : (bandOf.get(m.id) ?? none),
      clauses,
      checked: clauses.filter((c) => c.status === "checked").length,
      items,
      progress: {
        done: items.filter((it) => it.stage === "Done").length,
        total: items.length,
      },
      decisions: done ? [] : decisionsOn(m),
      spend: spendOf(
        m.constraints.flatMap((c) => itemOf.get(c.id) ?? []),
        [m],
      ),
    };
  };

  const projects = s.projects.filter(
    (p) =>
      p.state !== "dropped" &&
      p.state !== "done" &&
      (proposals || p.state !== "proposed"),
  );
  const rows = projects.map((p): ProjectBet => {
    const mine = [...msOf.values()].filter((m) => m.project === p.id);
    const open = mine
      .filter((m) => m.state !== "done")
      .map(milestoneOf)
      .sort((a, b) => a.column - b.column || byPlan(a.id, b.id));
    const done = mine
      .filter((m) => m.state === "done")
      .map(milestoneOf)
      .sort((a, b) => idNumber(a.id) - idNumber(b.id));
    const milestones = [...open, ...done];
    const lands = columns.map(
      (_, k) => open.filter((m) => m.column === k).length,
    );
    const first = open[0];
    const segments = milestones.map((m) => ({
      id: m.id,
      total: m.clauses.length,
      checked: m.checked,
      check: m.clauses.filter((c) => c.status === "check").length,
    }));
    const decisions = s.items
      .filter(
        (it) => it.project === p.id && it.kind === "decision" && counts(it),
      )
      .map((it): BetDecision => ({
        id: it.id,
        title: it.title,
        owner: isOwner(it.decider),
        answerable: !it.open_needs.length,
        proposed: it.state === "proposed",
      }))
      .sort(
        (a, b) =>
          Number(b.owner) - Number(a.owner) ||
          Number(b.answerable) - Number(a.answerable) ||
          idNumber(a.id) - idNumber(b.id),
      );
    return {
      id: p.id,
      title: p.title,
      proposed: p.state === "proposed",
      next: first?.column,
      nextOutcome:
        first?.outcome !== undefined
          ? { id: first.id, text: first.outcome }
          : undefined,
      lands,
      milestones,
      clauses: {
        checked: segments.reduce((n, x) => n + x.checked, 0),
        check: segments.reduce((n, x) => n + x.check, 0),
        total: segments.reduce((n, x) => n + x.total, 0),
        unshaped: milestones.filter((m) => !m.clauses.length).length,
        segments,
      },
      decisions,
      spend: spendOf(
        s.items.filter((it) => it.project === p.id),
        mine,
      ),
    };
  });

  const firstRank = (r: ProjectBet) => {
    const m = r.milestones[0];
    return m && !m.done ? (rank.get(m.id) ?? Infinity) : Infinity;
  };
  rows.sort(
    (a, b) =>
      (a.next ?? Infinity) - (b.next ?? Infinity) ||
      firstRank(a) - firstRank(b) ||
      idNumber(a.id) - idNumber(b.id),
  );

  const groups: BetGroup[] = [];
  for (const r of rows) {
    const column = r.next ?? -1;
    let g = groups.at(-1);
    if (!g || g.column !== column) {
      g = {
        column,
        label:
          column < 0
            ? "No open milestone"
            : column === none
              ? "No release yet"
              : `Next in ${columns[column]!.short}`,
        projects: [],
      };
      groups.push(g);
    }
    g.projects.push(r);
  }

  return {
    columns,
    rows,
    groups,
    hasSpend: rows.some(
      (r) => hasTokens(r.spend) || r.milestones.some((m) => hasTokens(m.spend)),
    ),
  };
}

/**
 * The spend in words, plainly: what the records hold, and nothing drawn
 * that they don't. "No estimates yet" until an item carries one.
 */
export function spendWords(sp: BetSpend): { main: string; sub?: string } {
  const range = sp.estimate
    ? sp.estimate.low === sp.estimate.high
      ? tokens(sp.estimate.low)
      : `${tokens(sp.estimate.low)}–${tokens(sp.estimate.high)}`
    : undefined;
  if (sp.spent !== undefined) {
    return {
      main:
        sp.appetite !== undefined
          ? `${tokens(sp.spent)} of ${tokens(sp.appetite)}`
          : `${tokens(sp.spent)} spent`,
      sub: range
        ? `estimated ${range} (on ${sp.estimated} of ${sp.items})`
        : sp.appetite !== undefined
          ? "spent of appetite · no estimates yet"
          : "no appetite or estimates yet",
    };
  }
  if (range) {
    return {
      main:
        sp.appetite !== undefined
          ? `${range} of ${tokens(sp.appetite)}`
          : `${range} estimated`,
      sub: `estimates on ${sp.estimated} of ${sp.items} · nothing spent yet`,
    };
  }
  if (sp.appetite !== undefined) {
    return {
      main: `Appetite ${tokens(sp.appetite)}`,
      sub: "no estimates yet",
    };
  }
  return { main: "No estimates yet" };
}
