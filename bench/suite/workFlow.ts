/**
 * The Flow view's model (CS-752; DESIGN.md, "The Flow view"): how well
 * the system and the owner work together, as measures over runs. Pure:
 * it reads the board's `/work-api/flow.json` answer (scripts/workBoard.mjs,
 * readFlow) and a few of the snapshot's fields, and says plainly where a
 * measure can't be told yet rather than drawing an empty chart.
 *
 * Its sources and what each can tell:
 *   - hitld's ledger: runs, dispatches and their tokens and estimates,
 *     reports, verifications, merges, questions asked, sent and answered,
 *     calls logged, leases and abandoned dispatches.
 *   - The tracker's history: when each item was planned, claimed (the
 *     claim commit's author date), done (the close commit's author date)
 *     and merged (the close commit's committer date: a branch replayed
 *     onto main takes a new one), and when each decision was asked.
 *   - The items' text: a decision's options, its recommendation and its
 *     reversibility (its door), and a proposal's source.
 *   - The policy: the bands it sets, else hitld rc.1's defaults.
 * hitld's trust record (worth-asking ratings, reversals, overrules and
 * each answer's latency_ms and took_recommendation) has no reader the
 * board may run: `hitld rights trust` is the owner's, from the primary
 * checkout. The measures that need it say so.
 */
import type {
  FlowAnswer,
  FlowEntity,
  FlowEvent,
  WorkMilestone,
} from "../../scripts/workBoard.mjs";

export const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const WEEK_MS = 7 * DAY_MS;

// --------------------------------------------------------------- types

export type FlowGroupId =
  "cost" | "throughput" | "latency" | "quality" | "owner" | "machine";

export const FLOW_GROUPS: ReadonlyArray<{
  id: FlowGroupId;
  name: string;
  question: string;
}> = [
  {
    id: "cost",
    name: "Cost",
    question: "What the work takes, and what redoing it takes",
  },
  {
    id: "throughput",
    name: "Throughput",
    question: "How much gets done, and how long each step takes",
  },
  {
    id: "latency",
    name: "Latencies",
    question: "Where work waits: on you, on the merge, on the orchestrator",
  },
  {
    id: "quality",
    name: "Quality",
    question: "How often work lands right the first time",
  },
  {
    id: "owner",
    name: "You and the system",
    question: "How the system spends your attention, and how you answer",
  },
  {
    id: "machine",
    name: "The machine",
    question: "Whether the machine and the harness hold the work up",
  },
];

/** A span the trends are drawn over: a run, or a week when no run is recorded. */
export interface FlowBucket {
  key: string;
  /** Short, for an axis: "Nov 16 #1". */
  label: string;
  /** In words, for a tip: "Run 2026-11-16-1, Nov 16 03:15 to 05:28". */
  title: string;
  start: number;
  end: number;
  /** The run's executor cap, when its scope set one. */
  maxExecutors?: number;
}

/** One bucket's value; `v` is absent when nothing in it can say. */
export interface FlowPoint {
  v?: number;
  n: number;
}

export type FlowUnit = "count" | "ms" | "share" | "tokens" | "ratio";

/** A band set by the policy (or hitld's default), shaping or a run's scope. */
export interface FlowBand {
  lo?: number;
  hi?: number;
  /** "At most 10 a digest". */
  words: string;
  /** "hitld default", "policy", "the run's scope", "shaping". */
  source: string;
}

/** An item behind a measure, shown with its title. */
export interface FlowRef {
  id: string;
  /** What about it: "waiting 2 days". */
  words: string;
}

export interface FlowMetric {
  id: string;
  group: FlowGroupId;
  name: string;
  /** How it is read: its sources and their limits (the info tip). */
  how: string;
  unit: FlowUnit;
  better: "lower" | "higher" | "neither";
  /** Why it can't be told yet, and what would tell it. */
  notYet?: string;
  /** The headline, in words with units. */
  value?: string;
  /** Its basis: how many, over what. */
  sub?: string;
  /** One point per bucket. */
  series: FlowPoint[];
  band?: FlowBand;
  /** Out of its band now: in words. */
  out?: string;
  /** One line: what to do when it is out of band, or moves the wrong way. */
  act: string;
  refs?: FlowRef[];
  /** A split of the headline: by door, by delivery, by cause. */
  split?: Array<{ name: string; value: string; n: number }>;
  /** The shell's scope doesn't narrow it: it is the run's, not an item's. */
  runWide?: boolean;
}

export interface FlowMilestoneCost {
  id: string;
  /** Tokens known on its merged items. */
  tokens: number;
  /** Its items with tokens known, of its items. */
  known: number;
  items: number;
  appetite?: number;
  clauses: Array<{
    clause: string;
    tokens: number;
    known: number;
    items: number;
  }>;
}

export interface FlowHeadline {
  mergedWeek: number;
  mergedWeekBefore: number;
  inProgress: number;
  decisionMs?: number;
  decisionsAnswered: number;
  decisionsOpen: number;
  firstPass?: { passed: number; of: number };
  tokensMedian?: number;
  tokensKnown: number;
  merged: number;
}

export interface FlowView {
  buckets: FlowBucket[];
  /** The buckets are runs from the ledger; else weeks. */
  byRuns: boolean;
  metrics: FlowMetric[];
  /** The metrics out of their band now: the exceptions that lead. */
  outOfBand: FlowMetric[];
  headline: FlowHeadline;
  /** Sources that couldn't be read, in words. */
  unread: string[];
  /** When the history was read (the answer's read_at). */
  readAt: string;
}

export interface FlowOptions {
  /** Now, for tests. */
  now?: number;
  /** The shell's scope: the items it narrows to (every item when absent). */
  inScope?: (id: string) => boolean;
  /** Work in flight now (the shell's claims and dispatches), by item. */
  inFlight?: readonly string[];
  /** The snapshot's milestones: clauses, constraints and appetites. */
  milestones?: readonly WorkMilestone[];
}

// ------------------------------------------------------------- helpers

const t = (iso: string | undefined) => {
  if (!iso) {
    return undefined;
  }
  const v = Date.parse(iso);
  return Number.isNaN(v) ? undefined : v;
};

export function median(xs: readonly number[]): number | undefined {
  if (!xs.length) {
    return undefined;
  }
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1]! + s[m]!) / 2;
}

/** The value at a share `q` (0 to 1) of the sorted values, nearest rank. */
export function quantile(xs: readonly number[], q: number): number | undefined {
  if (!xs.length) {
    return undefined;
  }
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))];
}

/** A duration in words, as precise as it is useful: "40 s", "12 min", "3.4 h", "2.1 days". */
export function durationText(ms: number): string {
  const a = Math.abs(ms);
  if (a < 60_000) {
    return `${Math.round(a / 1000)} s`;
  }
  if (a < HOUR_MS) {
    return `${Math.round(a / 60_000)} min`;
  }
  if (a < DAY_MS) {
    const h = a / HOUR_MS;
    return `${h < 10 ? h.toFixed(1) : Math.round(h)} h`;
  }
  const d = a / DAY_MS;
  return `${d < 10 ? d.toFixed(1) : Math.round(d)} ${d < 1.05 ? "day" : "days"}`;
}

/** Tokens in words: "261k tokens", "1.6M tokens". */
export function tokensText(n: number, unit = true): string {
  const w =
    n >= 1e6
      ? `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`
      : n >= 1e3
        ? `${Math.round(n / 1e3)}k`
        : String(Math.round(n));
  return unit ? `${w} tokens` : w;
}

export const shareText = (passed: number, of: number) =>
  of ? `${Math.round((100 * passed) / of)}%` : "—";

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

/** A value of a unit in words, for a chart's tip and the headline. */
export function unitText(unit: FlowUnit, v: number): string {
  switch (unit) {
    case "ms":
      return durationText(v);
    case "share":
      return `${Math.round(v * 100)}%`;
    case "tokens":
      return tokensText(v);
    case "ratio":
      return `${v.toFixed(v < 10 ? 1 : 0)}×`;
    default:
      return String(Math.round(v * 10) / 10);
  }
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const dayText = (ms: number) => {
  const d = new Date(ms);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
};
const clockText = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** Below this many, a measure says its values are too few to call. */
export const FEW = 5;

// ------------------------------------------------------------- buckets

/**
 * The spans the trends are drawn over: each run the ledger records, from
 * its start to the next run's (the last to now); without a ledger, the
 * last eight weeks.
 */
export function bucketsOf(
  events: readonly FlowEvent[],
  now: number,
): { buckets: FlowBucket[]; byRuns: boolean } {
  const runs = events
    .filter((e) => e.event === "run-started" && e.run)
    .map((e) => ({ e, at: t(e.at)! }))
    .filter((r) => r.at !== undefined)
    .sort((a, b) => a.at - b.at);
  if (runs.length) {
    return {
      byRuns: true,
      buckets: runs.map((r, i) => {
        const end = runs[i + 1]?.at ?? now;
        // Its label from its ID (hitld dates a run's ID in UTC), else its start.
        const id = /^(\d{4})-(\d{2})-(\d{2})-(\d+)$/.exec(r.e.run!);
        const sameDay = dayText(end) === dayText(r.at);
        return {
          key: r.e.run!,
          label: id
            ? `${MONTHS[Number(id[2]) - 1]} ${Number(id[3])} #${id[4]}`
            : dayText(r.at),
          title: `Run ${r.e.run}, ${dayText(r.at)} ${clockText(r.at)} to ${
            i + 1 < runs.length
              ? `${sameDay ? "" : `${dayText(end)} `}${clockText(end)}`
              : "now"
          }`,
          start: r.at,
          end,
          ...(r.e.max_executors !== undefined
            ? { maxExecutors: r.e.max_executors }
            : {}),
        };
      }),
    };
  }
  const buckets: FlowBucket[] = [];
  for (let i = 7; i >= 0; i--) {
    const end = now - i * WEEK_MS;
    const start = end - WEEK_MS;
    buckets.push({
      key: `w${i}`,
      label: dayText(start),
      title: `The week from ${dayText(start)} to ${dayText(end)}`,
      start,
      end,
    });
  }
  return { buckets, byRuns: false };
}

/** The bucket a moment falls in, or -1 before the first. */
const bucketAt = (buckets: readonly FlowBucket[], at: number) => {
  for (let i = buckets.length - 1; i >= 0; i--) {
    if (at >= buckets[i]!.start) {
      return at <= buckets[i]!.end || i === buckets.length - 1 ? i : -1;
    }
  }
  return -1;
};

/** Values placed in their buckets, reduced per bucket. */
function seriesOf(
  buckets: readonly FlowBucket[],
  values: ReadonlyArray<{ at: number; v: number }>,
  reduce: (vs: number[]) => number | undefined,
): FlowPoint[] {
  const per: number[][] = buckets.map(() => []);
  for (const x of values) {
    const i = bucketAt(buckets, x.at);
    if (i >= 0) {
      per[i]!.push(x.v);
    }
  }
  return per.map((vs) => ({
    v: vs.length ? reduce(vs) : undefined,
    n: vs.length,
  }));
}

/** Counts per bucket: every bucket has a value, zero included. */
function countsOf(
  buckets: readonly FlowBucket[],
  ats: readonly number[],
): FlowPoint[] {
  const per = buckets.map(() => 0);
  for (const at of ats) {
    const i = bucketAt(buckets, at);
    if (i >= 0) {
      per[i]!++;
    }
  }
  return per.map((n) => ({ v: n, n }));
}

/** Shares per bucket of values that are 1 (passed) or 0. */
const shareOf = (vs: number[]) =>
  vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : undefined;

// ----------------------------------------------------------- timelines

/** One item's dates, from the tracker's history. */
export interface ItemTimes {
  id: string;
  added?: number;
  planned?: number;
  /** Its first claim (author date). */
  claimed?: number;
  /** How many commits claimed it (a second is a claim again). */
  claims: number;
  /** Its close (author date). */
  done?: number;
  /** Its close landing on this branch (committer date). */
  merged?: number;
}

/** Each item's dates, from the tracker's history (oldest first). */
export function timesOf(answer: FlowAnswer): Map<string, ItemTimes> {
  const out = new Map<string, ItemTimes>();
  const of = (id: string) => {
    let x = out.get(id);
    if (!x) {
      x = { id, claims: 0 };
      out.set(id, x);
    }
    return x;
  };
  for (const c of answer.history.commits) {
    const authored = t(c.authored);
    const committed = t(c.committed);
    if (authored === undefined || committed === undefined) {
      continue;
    }
    for (const f of c.files) {
      const x = of(f.id);
      if (f.added) {
        x.added ??= authored;
      }
      if (f.state === "planned") {
        x.planned ??= authored;
      } else if (f.state === "in-progress") {
        x.claimed ??= authored;
        x.claims++;
      } else if (f.state === "done") {
        x.done = authored;
        x.merged = committed;
      } else if (f.state === "proposed" && x.done === undefined) {
        x.planned = undefined;
      }
    }
  }
  return out;
}

// --------------------------------------------------------------- ledger

interface Dispatch {
  id: string;
  item: string;
  at: number;
  started?: number;
  reported?: number;
  tokens?: number;
  estimate?: number;
}

interface LedgerFacts {
  events: FlowEvent[];
  dispatches: Dispatch[];
  byItem: Map<string, Dispatch[]>;
  verified: Array<{ item: string; at: number; pass: boolean; commit?: string }>;
  tokensOf: Map<string, number>;
  asked: Map<string, number>;
  answered: Map<string, { at: number; byDefault: boolean }>;
  sent: Map<string, { at: number; delivery: string }>;
  merged: Map<string, number>;
}

function ledgerFacts(events: readonly FlowEvent[]): LedgerFacts {
  const dispatches = new Map<string, Dispatch>();
  const f: LedgerFacts = {
    events: [...events],
    dispatches: [],
    byItem: new Map(),
    verified: [],
    tokensOf: new Map(),
    asked: new Map(),
    answered: new Map(),
    sent: new Map(),
    merged: new Map(),
  };
  for (const e of events) {
    const at = t(e.at);
    if (at === undefined) {
      continue;
    }
    if (e.event === "dispatched" && e.dispatch && e.item) {
      const d: Dispatch = {
        id: e.dispatch,
        item: e.item,
        at,
        ...(e.estimate_tokens ? { estimate: e.estimate_tokens } : {}),
      };
      dispatches.set(e.dispatch, d);
      f.dispatches.push(d);
      f.byItem.set(e.item, [...(f.byItem.get(e.item) ?? []), d]);
    } else if (e.event === "started" && e.dispatch) {
      const d = dispatches.get(e.dispatch);
      if (d && d.started === undefined) {
        d.started = at;
      }
    } else if (e.event === "reported" && e.dispatch) {
      const d = dispatches.get(e.dispatch);
      if (d) {
        d.reported ??= at;
        if (typeof e.tokens === "number" && e.tokens > 0) {
          d.tokens = (d.tokens ?? 0) + e.tokens;
        }
      }
      if (e.item && typeof e.tokens === "number" && e.tokens > 0) {
        f.tokensOf.set(e.item, (f.tokensOf.get(e.item) ?? 0) + e.tokens);
      }
    } else if (e.event === "verified" && e.item) {
      f.verified.push({
        item: e.item,
        at,
        pass: e.result === "pass",
        ...(e.commit ? { commit: e.commit } : {}),
      });
    } else if (e.event === "asked" && e.decision) {
      if (!f.asked.has(e.decision)) {
        f.asked.set(e.decision, at);
      }
    } else if (e.event === "sent" && e.decision) {
      if (!f.sent.has(e.decision)) {
        f.sent.set(e.decision, { at, delivery: e.delivery ?? "unknown" });
      }
    } else if (e.event === "answered" && e.decision) {
      f.answered.set(e.decision, { at, byDefault: e.via === "default" });
    } else if (e.event === "merged" && e.item) {
      f.merged.set(e.item, at);
    }
  }
  return f;
}

/** The items a "Merge CS-n" decision names in its title. */
export function mergeDecisionItems(title: string): string[] {
  const m = /^Merge\s+((?:CS-[1-9]\d*)(?:(?:,\s*|\s+and\s+)CS-[1-9]\d*)*)/.exec(
    title,
  );
  return m ? [...m[1]!.matchAll(/CS-[1-9]\d*/g)].map((x) => x[0]) : [];
}

/** The option a decision's answer chose: its letter, when the answer starts with one. */
const answerLetter = (d: FlowEntity) =>
  /^([A-Z])(?:[.):\s]|$)/.exec(d.answer?.trim() ?? "")?.[1];

/**
 * Whether a decision's answer took its recommendation, read from its
 * text: undefined when it states none, names no option it can match, or
 * the answer names no option.
 */
export function tookRecommendation(d: FlowEntity): boolean | undefined {
  const letter = answerLetter(d);
  if (!d.recommended || !d.options?.length || !letter) {
    return undefined;
  }
  const rec = d.recommended.toLowerCase();
  const byLetter = /^\(?([A-Z])[.,):\s]/.exec(d.recommended)?.[1];
  const chosen =
    byLetter && d.options.some((o) => o.letter === byLetter)
      ? byLetter
      : d.options.find((o) => o.label && rec.startsWith(o.label.toLowerCase()))
          ?.letter;
  return chosen ? chosen === letter : undefined;
}

// --------------------------------------------------------------- view

/**
 * The Flow view: every measure in its group, its trend over the buckets,
 * its band where one is set and the exceptions that lead.
 */
export function flowViewOf(
  answer: FlowAnswer,
  opts: FlowOptions = {},
): FlowView {
  const now = opts.now ?? Date.now();
  const inScope = opts.inScope ?? (() => true);
  const led = answer.ledger.ok ? ledgerFacts(answer.ledger.events) : undefined;
  const events = led?.events ?? [];
  const { buckets, byRuns } = bucketsOf(events, now);
  const first = buckets[0]?.start ?? now;
  const times = timesOf(answer);
  const entity = new Map(answer.entities.map((e) => [e.id, e]));
  const unread: string[] = [];
  if (!answer.ledger.ok) {
    unread.push(
      `${answer.ledger.why}: the trends are by week, and what only the ledger records can't be told`,
    );
  }
  if (!answer.history.ok) {
    unread.push(answer.history.why ?? "the tracker's history couldn't be read");
  }
  if (answer.history.truncated) {
    unread.push(
      "the tracker's history is longer than the board reads: the oldest commits are left out",
    );
  }
  const runWord = byRuns ? "run" : "week";
  const lastRun = buckets.at(-1);
  const metrics: FlowMetric[] = [];
  // An item shows once in a measure's refs, at its first (largest) place.
  const add = (m: FlowMetric) =>
    metrics.push(
      m.refs
        ? {
            ...m,
            refs: m.refs.filter(
              (r, i, all) => all.findIndex((x) => x.id === r.id) === i,
            ),
          }
        : m,
    );
  const ledgerNotYet = led
    ? undefined
    : "hitld's ledger couldn't be read, and only it records this";

  // The work: work items in scope, with their dates.
  const work = answer.entities.filter(
    (e) => e.kind === "work" && inScope(e.id),
  );
  const workTimes = work
    .map((e) => times.get(e.id))
    .filter((x): x is ItemTimes => !!x);
  const mergedWork = workTimes.filter(
    (x) => x.merged !== undefined && entity.get(x.id)?.state === "done",
  );
  const mergedIn = (from: number, to: number) =>
    mergedWork.filter((x) => x.merged! >= from && x.merged! < to);
  const tokensOf = led?.tokensOf ?? new Map<string, number>();

  // ------------------------------------------------------------ cost
  const withTokens = mergedWork.filter(
    (x) => tokensOf.has(x.id) && x.merged! >= first,
  );
  const mergedSince = mergedWork.filter((x) => x.merged! >= first);
  add({
    id: "tokens-per-item",
    group: "cost",
    name: "Tokens per merged item",
    how: "All the tokens an item's dispatches reported (the work, retries and reviews), for items merged since the first run. Only dispatches the ledger records report tokens; executors started by hand don't yet.",
    unit: "tokens",
    better: "lower",
    ...(ledgerNotYet
      ? { notYet: ledgerNotYet }
      : !withTokens.length
        ? {
            notYet: `None of the ${plural(mergedSince.length, "item")} merged since the first run has tokens recorded: an executor's report records them in the ledger`,
          }
        : {
            value: tokensText(
              median(withTokens.map((x) => tokensOf.get(x.id)!))!,
            ),
            sub: `Median of ${withTokens.length}; tokens are known for ${withTokens.length} of ${plural(mergedSince.length, "item")} merged since the first run`,
          }),
    series: seriesOf(
      buckets,
      withTokens.map((x) => ({ at: x.merged!, v: tokensOf.get(x.id)! })),
      (vs) => median(vs),
    ),
    act: "If it climbs, look at the largest items' reports for retries and reviews before cutting scope.",
    refs: withTokens
      .sort((a, b) => tokensOf.get(b.id)! - tokensOf.get(a.id)!)
      .slice(0, 3)
      .map((x) => ({ id: x.id, words: tokensText(tokensOf.get(x.id)!) })),
  });

  const appetites = (opts.milestones ?? []).filter(
    (m) => (m.appetite_tokens ?? 0) > 0 && inScope(m.id),
  );
  const spendOf = (m: WorkMilestone) =>
    m.constraints.reduce((sum, c) => sum + (tokensOf.get(c.id) ?? 0), 0);
  const over = appetites.filter((m) => spendOf(m) > m.appetite_tokens!);
  add({
    id: "appetite",
    group: "cost",
    name: "Spend against appetite",
    how: "Tokens known on a milestone's items against the appetite set when it was shaped (appetite_tokens).",
    unit: "share",
    better: "lower",
    ...(!appetites.length
      ? {
          notYet:
            "No milestone has an appetite set yet: shaping sets appetite_tokens",
        }
      : {
          value: over.length
            ? `${plural(over.length, "milestone")} over`
            : "Within appetite",
          sub: `${plural(appetites.length, "milestone")} with an appetite; tokens only count where the ledger has them`,
          band: { hi: 1, words: "At most its appetite", source: "shaping" },
          ...(over.length
            ? { out: `${plural(over.length, "milestone")} past its appetite` }
            : {}),
        }),
    series: buckets.map(() => ({ n: 0 })),
    act: "Past its appetite: stop and reshape the milestone with the owner before spending more.",
    refs: over.map((m) => ({
      id: m.id,
      words: `${tokensText(spendOf(m))} of ${tokensText(m.appetite_tokens!, false)}`,
    })),
  });

  add({
    id: "money",
    group: "cost",
    name: "Money",
    how: "Spend in money, per item and per release.",
    unit: "count",
    better: "lower",
    notYet: "No price per token is recorded anywhere the board reads",
    series: [],
    act: "",
  });

  const dispatchesInScope = (led?.dispatches ?? []).filter((d) =>
    inScope(d.item),
  );
  const firstOf = new Map<string, Dispatch>();
  for (const d of dispatchesInScope) {
    if (!firstOf.has(d.item)) {
      firstOf.set(d.item, d);
    }
  }
  const redone = dispatchesInScope.filter((d) => firstOf.get(d.item) !== d);
  const failed = (led?.verified ?? []).filter(
    (v) => !v.pass && inScope(v.item),
  );
  const reverts = answer.reverts
    .map((r) => ({ ...r, ms: t(r.at)! }))
    .filter((r) => r.ms >= first && (!r.work_item || inScope(r.work_item)));
  const reclaimed = workTimes.filter((x) => x.claims > 1);
  const reworkTokens = redone.reduce((s, d) => s + (d.tokens ?? 0), 0);
  const allTokens = dispatchesInScope.reduce((s, d) => s + (d.tokens ?? 0), 0);
  add({
    id: "rework",
    group: "cost",
    name: "Rework",
    how: "Dispatches after an item's first (after a failed check, a stall or an abandon), with their tokens; items claimed again; reverts. A rebase leaves no record, so it isn't counted.",
    unit: "share",
    better: "lower",
    ...(ledgerNotYet
      ? { notYet: ledgerNotYet }
      : {
          value: `${redone.length} of ${plural(dispatchesInScope.length, "dispatch", "dispatches")}`,
          sub: [
            reworkTokens
              ? `${tokensText(reworkTokens)}, ${shareText(reworkTokens, allTokens)} of the tokens known`
              : undefined,
            plural(failed.length, "failed check"),
            plural(reverts.length, "revert"),
            reclaimed.length
              ? plural(
                  reclaimed.length,
                  "item claimed again",
                  "items claimed again",
                )
              : undefined,
          ]
            .filter(Boolean)
            .join(" · "),
        }),
    series: seriesOf(
      buckets,
      dispatchesInScope.map((d) => ({
        at: d.at,
        v: firstOf.get(d.item) === d ? 0 : 1,
      })),
      shareOf,
    ),
    act: "If the share climbs, read the failed checks first: a brief that misses the done-when costs more than a slow merge.",
  });

  // ------------------------------------------------------ throughput
  const weekStart = now - WEEK_MS;
  const thisWeek = mergedIn(weekStart, now + 1);
  const weekBefore = mergedIn(weekStart - WEEK_MS, weekStart);
  add({
    id: "merged",
    group: "throughput",
    name: "Items merged",
    how: `Work items whose close landed on this branch, by when it landed (the close commit's committer date); each ${runWord}'s count.`,
    unit: "count",
    better: "higher",
    value: `${thisWeek.length} in the last 7 days`,
    sub: `${weekBefore.length} the 7 days before`,
    series: countsOf(
      buckets,
      mergedWork.map((x) => x.merged!),
    ),
    act: "If it falls while work in progress holds, the queue is stuck somewhere: look at the merge wait and your decisions.",
    refs: [...thisWeek]
      .sort((a, b) => b.merged! - a.merged!)
      .slice(0, 3)
      .map((x) => ({ id: x.id, words: dayText(x.merged!) })),
  });

  const clauses: Array<{ at?: number; done: boolean }> = [];
  for (const m of opts.milestones ?? []) {
    if (!inScope(m.id)) {
      continue;
    }
    const byClause = new Map<string, string[]>();
    for (const c of m.constraints) {
      if (c.clause !== "c?") {
        byClause.set(c.clause, [...(byClause.get(c.clause) ?? []), c.id]);
      }
    }
    for (const ids of byClause.values()) {
      const ts = ids.map((id) => times.get(id));
      const done = ids.every((id) => entity.get(id)?.state === "done");
      const at =
        done && ts.every((x) => x?.merged !== undefined)
          ? Math.max(...ts.map((x) => x!.merged!))
          : undefined;
      clauses.push({ at, done });
    }
  }
  const clausesDone = clauses.filter((c) => c.done);
  add({
    id: "clauses",
    group: "throughput",
    name: "Milestone clauses done",
    how: "A clause is done here once every item linked to it has merged, by when the last one did. A milestone's own check isn't counted (Release says which have passed). Clauses with no item linked yet (c?) are left out.",
    unit: "count",
    better: "higher",
    ...(!clauses.length
      ? { notYet: "No milestone has an item linked to a clause yet" }
      : {
          value: `${clausesDone.filter((c) => (c.at ?? 0) >= weekStart).length} in the last 7 days`,
          sub: `${clausesDone.length} of ${plural(clauses.length, "linked clause")} done`,
        }),
    series: countsOf(
      buckets,
      clausesDone.filter((c) => c.at !== undefined).map((c) => c.at!),
    ),
    act: "If items merge but clauses don't, work is spreading across milestones: finish one before starting the next.",
  });

  const flying = (opts.inFlight ?? []).filter(inScope);
  const wipAt = (at: number) =>
    workTimes.filter(
      (x) =>
        x.claimed !== undefined && x.claimed <= at && (x.done ?? Infinity) > at,
    ).length;
  const cap = lastRun?.maxExecutors;
  add({
    id: "wip",
    group: "throughput",
    name: "Work in progress",
    how: `Items claimed and not yet closed: now, from the claims and dispatches in flight; at the end of each ${runWord}, from the claim and close commits' author dates. The band is the current run's executor cap, when its scope set one.`,
    unit: "count",
    better: "neither",
    value: `${flying.length} now`,
    sub:
      byRuns && cap !== undefined
        ? `The run allows ${cap} at once`
        : "No executor cap recorded for this run",
    series: buckets.map((b) => {
      const v = wipAt(Math.min(b.end, now));
      return { v, n: v };
    }),
    ...(cap !== undefined
      ? {
          band: {
            hi: cap,
            words: `At most ${cap} at once`,
            source: "the run's scope",
          },
          ...(flying.length > cap
            ? { out: `${flying.length} in progress, the cap is ${cap}` }
            : {}),
        }
      : {}),
    act: "Over the cap: finish or unclaim work before starting more.",
    refs: flying.slice(0, 3).map((id) => ({ id, words: "in progress" })),
  });

  const span = (
    id: string,
    name: string,
    how: string,
    pairs: Array<{ id: string; at: number; ms: number }>,
    act: string,
    empty: string,
  ) => {
    const ms = pairs.map((p) => p.ms);
    add({
      id,
      group: "throughput",
      name,
      how,
      unit: "ms",
      better: "lower",
      ...(!pairs.length
        ? { notYet: empty }
        : {
            value: durationText(median(ms)!),
            sub: `Median of ${pairs.length}${pairs.length >= FEW ? `; 90th percentile ${durationText(quantile(ms, 0.9)!)}` : "; too few to call"}`,
          }),
      series: seriesOf(
        buckets,
        pairs.map((p) => ({ at: p.at, v: p.ms })),
        (vs) => median(vs),
      ),
      act,
      refs: [...pairs]
        .sort((a, b) => b.ms - a.ms)
        .slice(0, 3)
        .map((p) => ({ id: p.id, words: durationText(p.ms) })),
    });
  };
  span(
    "planned-claimed",
    "Planned to claimed",
    "From an item becoming planned (or its creation) to its claim commit, by when it was claimed, for claims since the first run.",
    workTimes
      .filter((x) => x.claimed !== undefined && x.claimed >= first)
      .map((x) => ({
        id: x.id,
        at: x.claimed!,
        ms: x.claimed! - (x.planned ?? x.added ?? x.claimed!),
      }))
      .filter((p) => p.ms >= 0),
    "If it grows, ready work is waiting for a slot: check the run's executor cap and what holds the queue.",
    "No item has been claimed since the first run",
  );
  span(
    "claimed-done",
    "Claimed to done",
    "From an item's claim commit to its close commit, by their author dates: how long the executor worked on it.",
    workTimes
      .filter(
        (x) =>
          x.claimed !== undefined && x.done !== undefined && x.done >= first,
      )
      .map((x) => ({ id: x.id, at: x.done!, ms: x.done! - x.claimed! }))
      .filter((p) => p.ms >= 0),
    "If it grows, items are too large for one dispatch: split them at shaping.",
    "No claimed item has closed since the first run",
  );
  span(
    "done-merged",
    "Done to merged",
    "From an item's close (written on its branch) to the close landing on this branch: the checks, your merge decision and the replay. Items closed on this branch directly are left out.",
    workTimes
      .filter(
        (x) =>
          x.claimed !== undefined && x.done !== undefined && x.merged! >= first,
      )
      .map((x) => ({ id: x.id, at: x.merged!, ms: x.merged! - x.done! }))
      .filter((p) => p.ms >= 0),
    "If it grows, finished work is waiting: look at the merge wait and your open merge decisions.",
    "No item has merged from a branch since the first run",
  );

  // -------------------------------------------------------- latencies
  const decisions = answer.entities.filter(
    (e) =>
      e.kind === "decision" &&
      (e.decider ?? "owner") === "owner" &&
      inScope(e.id),
  );
  const askedOf = (d: FlowEntity) =>
    led?.asked.get(d.id) ?? times.get(d.id)?.added ?? t(d.created);
  const answeredOf = (d: FlowEntity) => {
    const l = led?.answered.get(d.id);
    return l ? (l.byDefault ? undefined : l.at) : t(d.answered_at);
  };
  const answeredRows = decisions
    .filter((d) => d.state === "done" && d.answered_by !== "default")
    .map((d) => ({ d, asked: askedOf(d), answered: answeredOf(d) }))
    .filter(
      (r): r is { d: FlowEntity; asked: number; answered: number } =>
        r.asked !== undefined &&
        r.answered !== undefined &&
        r.answered >= r.asked,
    )
    .filter((r) => r.answered >= first);
  const dms = answeredRows.map((r) => r.answered - r.asked);
  const splitBy = (
    key: (d: FlowEntity) => string,
    names: Record<string, string>,
  ) =>
    Object.entries(names)
      .map(([k, name]) => {
        const xs = answeredRows
          .filter((r) => key(r.d) === k)
          .map((r) => r.answered - r.asked);
        return {
          name,
          n: xs.length,
          value: xs.length ? durationText(median(xs)!) : "—",
        };
      })
      .filter((x) => x.n);
  const open = decisions
    .filter((d) => d.state === "planned" || d.state === "proposed")
    .map((d) => ({ id: d.id, ms: now - (askedOf(d) ?? now) }))
    .sort((a, b) => b.ms - a.ms);
  add({
    id: "decision-latency",
    group: "latency",
    name: "Your decision time",
    how: "From a decision being asked (the ledger's asked event, else the commit that filed it) to its answer, for answers since the first run; decisions a default took are left out. Its door is read from the decision's Reversibility line; now or digest from the ledger's sent event.",
    unit: "ms",
    better: "lower",
    ...(!answeredRows.length
      ? { notYet: "No decision has been answered since the first run" }
      : {
          value: durationText(median(dms)!),
          sub: `Median of ${answeredRows.length} answered; ${open.length} open${open[0] ? `, the oldest asked ${durationText(open[0].ms)} ago` : ""}`,
          split: [
            ...splitBy((d) => d.door ?? "none", {
              "two-way": "Two-way door",
              "one-way": "One-way door",
              mixed: "Both",
              none: "Door not stated",
            }),
            ...splitBy((d) => led?.sent.get(d.id)?.delivery ?? "none", {
              now: "Sent now",
              digest: "Sent in a digest",
              none: "Not recorded as sent",
            }),
          ],
        }),
    series: seriesOf(
      buckets,
      answeredRows.map((r) => ({ at: r.answered, v: r.answered - r.asked })),
      (vs) => median(vs),
    ),
    act: "If two-way doors wait as long as one-way ones, give them defaults and deadlines so they can go in a digest.",
    refs: open
      .slice(0, 3)
      .map((o) => ({ id: o.id, words: `waiting ${durationText(o.ms)}` })),
  });

  const readyAt = new Map<string, number>();
  for (const d of answer.entities) {
    if (d.kind !== "decision") {
      continue;
    }
    const at = askedOf(d);
    for (const id of mergeDecisionItems(d.title)) {
      if (at !== undefined && at < (readyAt.get(id) ?? Infinity)) {
        readyAt.set(id, at);
      }
    }
  }
  for (const v of led?.verified ?? []) {
    if (v.pass && v.at < (readyAt.get(v.item) ?? Infinity)) {
      readyAt.set(v.item, v.at);
    }
  }
  const mergeWait = mergedWork
    .filter((x) => readyAt.has(x.id) && x.merged! >= first)
    .map((x) => ({
      id: x.id,
      at: x.merged!,
      ms: x.merged! - readyAt.get(x.id)!,
    }))
    .filter((p) => p.ms >= 0);
  {
    const ms = mergeWait.map((p) => p.ms);
    add({
      id: "merge-wait",
      group: "latency",
      name: "Merge-ready to merged",
      how: "From work being ready to merge (its merge decision asked, or a passing verification in the ledger, whichever came first) to its close landing on this branch.",
      unit: "ms",
      better: "lower",
      ...(!mergeWait.length
        ? {
            notYet:
              "No merged item has a merge decision or a verification to start from",
          }
        : {
            value: durationText(median(ms)!),
            sub: `Median of ${mergeWait.length}${mergeWait.length < FEW ? "; too few to call" : ""}`,
          }),
      series: seriesOf(
        buckets,
        mergeWait.map((p) => ({ at: p.at, v: p.ms })),
        (vs) => median(vs),
      ),
      act: "If it grows, finished work queues for your yes: batch merge decisions into one question.",
      refs: [...mergeWait]
        .sort((a, b) => b.ms - a.ms)
        .slice(0, 3)
        .map((p) => ({ id: p.id, words: durationText(p.ms) })),
    });
  }

  const ledgerSpan = (
    id: string,
    name: string,
    how: string,
    all: Array<{ id: string; at: number; ms: number }>,
    act: string,
    empty: string,
    extra?: string,
  ) => {
    // Two events written in the same second were recorded together after
    // the fact: they can't tell the wait between them.
    const together = all.filter((p) => p.ms < 1000).length;
    const pairs = all.filter((p) => p.ms >= 1000);
    const ms = pairs.map((p) => p.ms);
    const togetherWords = together
      ? `${together} of ${all.length} were recorded in the same second, after the fact, and are left out`
      : undefined;
    add({
      id,
      group: "latency",
      name,
      how,
      unit: "ms",
      better: "lower",
      ...(ledgerNotYet
        ? { notYet: ledgerNotYet }
        : !all.length
          ? { notYet: empty }
          : !pairs.length
            ? {
                notYet: `The ledger recorded all ${all.length} in the same second as each other, after the fact, so the wait can't be told`,
              }
            : {
                value: durationText(median(ms)!),
                sub: [
                  `Median of ${pairs.length}${pairs.length < FEW ? "; too few to call" : ""}`,
                  togetherWords,
                  extra,
                ]
                  .filter(Boolean)
                  .join(". "),
              }),
      series: seriesOf(
        buckets,
        pairs.map((p) => ({ at: p.at, v: p.ms })),
        (vs) => median(vs),
      ),
      act,
      refs: [...pairs]
        .sort((a, b) => b.ms - a.ms)
        .slice(0, 3)
        .map((p) => ({ id: p.id, words: durationText(p.ms) })),
    });
  };
  const byHand = workTimes.filter(
    (x) =>
      x.claimed !== undefined && x.claimed >= first && !led?.byItem.has(x.id),
  ).length;
  ledgerSpan(
    "setup-started",
    "Set up to started",
    "From an executor's dispatch to its start, as the ledger records them: what the harness's turn rule costs.",
    dispatchesInScope
      .filter((d) => d.started !== undefined)
      .map((d) => ({ id: d.item, at: d.started!, ms: d.started! - d.at }))
      .filter((p) => p.ms >= 0),
    "If it grows, executors wait to be started: start the sessions an orchestrator set up as soon as the owner approves.",
    "No dispatch has a start recorded",
    byHand
      ? `${plural(byHand, "claim")} since the first run started by hand, outside the ledger`
      : undefined,
  );
  const reports: Array<{ id: string; at: number; ms: number }> = [];
  for (const d of dispatchesInScope) {
    if (d.reported === undefined) {
      continue;
    }
    const v = led!.verified.find(
      (x) => x.item === d.item && x.at >= d.reported!,
    );
    if (v) {
      reports.push({ id: d.item, at: v.at, ms: v.at - d.reported });
    }
  }
  ledgerSpan(
    "report-verified",
    "Report waiting for review",
    "From an executor's report to the orchestrator's verification of it: how long a finished executor sits idle.",
    reports,
    "If it grows, the orchestrator is behind: it should verify reports before dispatching more.",
    "No report has a verification after it",
  );
  add({
    id: "check-time",
    group: "latency",
    name: "Check run time",
    how: "How long the merge gates' checks run.",
    unit: "ms",
    better: "lower",
    notYet:
      "The merge queue records no check durations: the ledger's verified event carries no time spent",
    series: [],
    act: "",
  });

  // --------------------------------------------------------- quality
  const decisionsFor = new Map<string, FlowEntity[]>();
  for (const d of answer.entities) {
    if (d.kind === "decision") {
      for (const id of mergeDecisionItems(d.title)) {
        decisionsFor.set(id, [...(decisionsFor.get(id) ?? []), d]);
      }
    }
  }
  const firstPassRows = mergedWork
    .filter((x) => x.merged! >= first)
    .map((x) => {
      const ds = led?.byItem.get(x.id) ?? [];
      const fails = (led?.verified ?? []).filter(
        (v) => v.item === x.id && !v.pass,
      );
      const md = decisionsFor.get(x.id) ?? [];
      if (!ds.length && !md.length) {
        return undefined;
      }
      const held = md.some((d) => {
        const l = answerLetter(d);
        const label = d.options?.find((o) => o.letter === l)?.label ?? "";
        return d.state === "done" && l !== undefined && !/^merge/i.test(label);
      });
      const pass = ds.length <= 1 && !fails.length && md.length <= 1 && !held;
      return { id: x.id, at: x.merged!, pass };
    })
    .filter((r): r is { id: string; at: number; pass: boolean } => !!r);
  const passed = firstPassRows.filter((r) => r.pass).length;
  add({
    id: "first-pass",
    group: "quality",
    name: "First-pass merge rate",
    how: "Of items merged since the first run with a dispatch or a merge decision on record: merged with one dispatch, no failed check, and one merge decision answered to merge.",
    unit: "share",
    better: "higher",
    ...(!firstPassRows.length
      ? {
          notYet: "No merged item has a dispatch or a merge decision on record",
        }
      : {
          value: shareText(passed, firstPassRows.length),
          sub: `${passed} of ${plural(firstPassRows.length, "item")}${firstPassRows.length < FEW ? "; too few to call" : ""}`,
        }),
    series: seriesOf(
      buckets,
      firstPassRows.map((r) => ({ at: r.at, v: r.pass ? 1 : 0 })),
      shareOf,
    ),
    act: "If it falls, read what failed the second rounds: a missing done-when, or a check the executor didn't run.",
    refs: firstPassRows
      .filter((r) => !r.pass)
      .slice(-3)
      .map((r) => ({ id: r.id, words: "needed another round" })),
  });

  const verifiedInScope = (led?.verified ?? []).filter((v) => inScope(v.item));
  const fails = verifiedInScope
    .filter((v) => !v.pass)
    .map((v) => {
      const next = verifiedInScope.find(
        (x) => x.item === v.item && x.at > v.at && x.pass,
      );
      const cause = !next
        ? "open"
        : next.commit && v.commit && next.commit === v.commit
          ? "rerun"
          : "real";
      return { ...v, cause };
    });
  const causeCount = (c: string) => fails.filter((f) => f.cause === c).length;
  add({
    id: "check-failures",
    group: "quality",
    name: "Check failures",
    how: "Failed verifications in the ledger. A failure the next passing check of the same commit cleared is counted as passed on a rerun (load or a flake); one cleared only by a new commit, as real.",
    unit: "count",
    better: "lower",
    ...(ledgerNotYet
      ? { notYet: ledgerNotYet }
      : {
          value: `${fails.length} since the first run`,
          sub: `Of ${plural(verifiedInScope.length, "check")}`,
          split: [
            {
              name: "Real: a new commit fixed it",
              value: String(causeCount("real")),
              n: causeCount("real"),
            },
            {
              name: "Passed on a rerun",
              value: String(causeCount("rerun")),
              n: causeCount("rerun"),
            },
            {
              name: "Not passed yet",
              value: String(causeCount("open")),
              n: causeCount("open"),
            },
          ].filter((x) => x.n),
        }),
    series: countsOf(
      buckets,
      fails.map((f) => f.at),
    ),
    act: "If reruns pass often, the machine is loaded: run heavy jobs one at a time through the gate.",
  });

  const followUps = answer.entities
    .filter((e) => e.follows?.length && e.follows.some(inScope))
    .map((e) => ({
      id: e.id,
      at: times.get(e.id)?.added ?? t(e.created),
      from: e.follows!,
    }))
    .filter(
      (f): f is { id: string; at: number; from: string[] } =>
        f.at !== undefined && f.at >= first,
    );
  add({
    id: "follow-ups",
    group: "quality",
    name: "Follow-ups per merged item",
    how: "Items filed whose Source line names another item's report or review, against the items merged in the same span.",
    unit: "ratio",
    better: "neither",
    ...(!mergedSince.length
      ? { notYet: "No item has merged since the first run" }
      : {
          value: (followUps.length / mergedSince.length).toFixed(2),
          sub: `${plural(followUps.length, "follow-up")} for ${plural(mergedSince.length, "item")} merged`,
        }),
    series: buckets.map((b) => {
      const f = followUps.filter((x) => x.at >= b.start && x.at < b.end).length;
      const m = mergedIn(b.start, b.end + 1).length;
      return m ? { v: f / m, n: m } : { n: 0 };
    }),
    act: "Many follow-ups per item: done-whens are too loose; few: check that reports still name what they couldn't show.",
    refs: followUps
      .slice(-3)
      .map((f) => ({ id: f.id, words: `from ${f.from.join(", ")}` })),
  });

  const estimates: Array<{ id: string; at: number; v: number }> = [];
  for (const x of mergedWork) {
    const est =
      led?.byItem.get(x.id)?.[0]?.estimate ?? entity.get(x.id)?.estimate_tokens;
    const act = tokensOf.get(x.id);
    if (est && act) {
      estimates.push({ id: x.id, at: x.merged!, v: act / est });
    }
  }
  {
    const rs = estimates.map((e) => e.v);
    add({
      id: "estimates",
      group: "quality",
      name: "Estimate accuracy",
      how: "Tokens spent over tokens estimated, for merged items with both: 1× is on the estimate. The spread is the middle half of the ratios.",
      unit: "ratio",
      better: "neither",
      ...(!estimates.length
        ? {
            notYet:
              "No merged item has both an estimate and tokens spent recorded",
          }
        : {
            value: `${median(rs)!.toFixed(1)}× the estimate`,
            sub:
              estimates.length < FEW
                ? `${plural(estimates.length, "item")}: too few to call`
                : `${plural(estimates.length, "item")}; middle half ${quantile(rs, 0.25)!.toFixed(1)}× to ${quantile(rs, 0.75)!.toFixed(1)}×`,
          }),
      series: seriesOf(
        buckets,
        estimates.map((e) => ({ at: e.at, v: e.v })),
        (vs) => median(vs),
      ),
      act: "Far from 1×: tell the planner, so its estimates for that kind of item move.",
    });
  }

  const ledgerReverts = events.filter(
    (e) => e.event === "reverted" && (!e.item || inScope(e.item)),
  );
  add({
    id: "defects",
    group: "quality",
    name: "Defects after merge",
    how: "Reverts on this branch's history and in the ledger since the first run. A defect fixed by a new commit without a revert (a red main fixed in place) isn't recorded in any field yet.",
    unit: "count",
    better: "lower",
    value: `${reverts.length + ledgerReverts.length} since the first run`,
    sub: "Reverts only; a fix in place isn't counted",
    series: countsOf(buckets, [
      ...reverts.map((r) => r.ms),
      ...ledgerReverts.map((e) => t(e.at)!),
    ]),
    act: "Any: find which check would have caught it, and add it to the merge gates.",
  });

  // ---------------------------------------------- you and the system
  const sentDigest = events
    .filter((e) => e.event === "sent" && e.delivery === "digest")
    .map((e) => t(e.at)!)
    .sort((a, b) => a - b);
  const digests: Array<{ at: number; n: number }> = [];
  for (const at of sentDigest) {
    const last = digests.at(-1);
    if (last && at - last.at < 2 * 60_000) {
      last.n++;
    } else {
      digests.push({ at, n: 1 });
    }
  }
  const perDigest = led ? answer.policy.decisions_per_digest_max : undefined;
  const lastDigests = digests.filter((d) => lastRun && d.at >= lastRun.start);
  const overDigest = perDigest
    ? lastDigests.filter((d) => d.n > perDigest.value)
    : [];
  add({
    id: "per-digest",
    group: "owner",
    name: "Questions per digest",
    how: "Decisions sent to you together in one digest (the ledger's sent events a couple of minutes apart). The band is the attention policy's decisions_per_digest_max.",
    unit: "count",
    better: "lower",
    runWide: true,
    ...(ledgerNotYet
      ? { notYet: ledgerNotYet }
      : !digests.length
        ? {
            notYet:
              "No digest is recorded as sent: hitld rights digest --mark records one when it goes out",
          }
        : {
            value: `${median(digests.map((d) => d.n))} a digest`,
            sub: `Median of ${plural(digests.length, "digest")}; the most in one, ${Math.max(...digests.map((d) => d.n))}`,
            band: {
              hi: perDigest!.value,
              words: `At most ${perDigest!.value} a digest`,
              source: perDigest!.source,
            },
            ...(overDigest.length
              ? {
                  out: `${plural(overDigest.length, "digest")} this run over ${perDigest!.value}`,
                }
              : {}),
          }),
    series: seriesOf(
      buckets,
      digests.map((d) => ({ at: d.at, v: d.n })),
      (vs) => Math.max(...vs),
    ),
    act: "Over the band: let defaults take the two-way doors, and hold the rest for the next digest.",
  });

  const sentNow = events
    .filter((e) => e.event === "sent" && e.delivery === "now")
    .map((e) => t(e.at)!)
    .sort((a, b) => a - b);
  const perDay = answer.policy.interrupts_per_day_max;
  const lastDay = sentNow.filter((at) => at > now - DAY_MS).length;
  const busiestDay = (ats: number[]) => {
    let best = 0;
    for (let i = 0, j = 0; i < ats.length; i++) {
      while (ats[i]! - ats[j]! >= DAY_MS) {
        j++;
      }
      best = Math.max(best, i - j + 1);
    }
    return best;
  };
  add({
    id: "interrupts",
    group: "owner",
    name: "Interrupts per day",
    how: "Questions sent to you at once rather than in a digest (the ledger's sent events with delivery now), in any 24 hours. The band is the attention policy's interrupts_per_day_max. A question asked in a session you're in isn't recorded as sent.",
    unit: "count",
    better: "lower",
    runWide: true,
    ...(ledgerNotYet
      ? { notYet: ledgerNotYet }
      : {
          value: `${lastDay} in the last 24 hours`,
          sub: `The busiest day since the first run had ${busiestDay(sentNow)}`,
          band: {
            hi: perDay.value,
            words: `At most ${perDay.value} a day`,
            source: perDay.source,
          },
          ...(lastDay > perDay.value
            ? {
                out: `${lastDay} in the last 24 hours, the band is ${perDay.value}`,
              }
            : {}),
        }),
    series: buckets.map((b) => {
      const v = busiestDay(sentNow.filter((at) => at >= b.start && at < b.end));
      return { v, n: v };
    }),
    act: "Over the band: send what can wait in the digest; only one-way doors with a deadline go now.",
  });

  const silence = answer.policy.silence_max_hours;
  const lastDigest = digests.at(-1)?.at;
  const runActive = events.some((e) => (t(e.at) ?? 0) > now - DAY_MS);
  const quietMs = lastDigest !== undefined ? now - lastDigest : undefined;
  add({
    id: "digest-silence",
    group: "owner",
    name: "Time since the last digest",
    how: "How long since a digest was last recorded as sent, while a run is active. The band is the digest policy's silence_max_hours. A digest sent without hitld rights digest --mark isn't recorded.",
    unit: "ms",
    better: "lower",
    runWide: true,
    ...(ledgerNotYet
      ? { notYet: ledgerNotYet }
      : quietMs === undefined
        ? {
            notYet:
              "No digest is recorded as sent: hitld rights digest --mark records one when it goes out",
          }
        : {
            value: durationText(quietMs),
            sub: runActive
              ? "A run is active"
              : "No run activity in the last day",
            band: {
              hi: silence.value * HOUR_MS,
              words: `At most ${silence.value} h while a run is active`,
              source: silence.source,
            },
            ...(runActive && quietMs > silence.value * HOUR_MS
              ? { out: `No digest recorded for ${durationText(quietMs)}` }
              : {}),
          }),
    series: buckets.map((b) => {
      const v = digests.filter((d) => d.at >= b.start && d.at < b.end).length;
      return { v, n: v };
    }),
    act: "Past the band: send a digest (hitld rights digest), and mark it (--mark) so it's recorded.",
  });

  const recRows = answeredRows
    .map((r) => ({ ...r, took: tookRecommendation(r.d) }))
    .filter((r): r is typeof r & { took: boolean } => r.took !== undefined);
  const took = recRows.filter((r) => r.took).length;
  const stampMs = answer.policy.rubber_stamp_seconds.value * 1000;
  const quick = recRows.filter((r) => {
    const sent = led?.sent.get(r.d.id)?.at;
    return r.took && sent !== undefined && r.answered - sent <= stampMs;
  }).length;
  add({
    id: "took-recommendation",
    group: "owner",
    name: "Recommendation taken",
    how: `How often your answer chose the option the question recommended, read from each decision's text (its "Recommended:" line against the option its answer names). Quick: taken within ${answer.policy.rubber_stamp_seconds.value} s of being sent (the trust policy's rubber_stamp_seconds). hitld's trust record has this per answer, but the board can't read it.`,
    unit: "share",
    better: "neither",
    ...(!recRows.length
      ? {
          notYet:
            "No answered decision states a recommendation its answer can be matched against",
        }
      : {
          value: shareText(took, recRows.length),
          sub: `${took} of ${plural(recRows.length, "answer")} whose recommendation can be matched${quick ? `; ${quick} quick` : ""}`,
        }),
    series: seriesOf(
      buckets,
      recRows.map((r) => ({ at: r.answered, v: r.took ? 1 : 0 })),
      shareOf,
    ),
    act: "Near 100% with quick answers: the system could decide these itself; near 0%: its recommendations miss what you weigh.",
    refs: recRows
      .filter((r) => !r.took)
      .slice(-3)
      .map((r) => ({ id: r.d.id, words: "answered against it" })),
  });

  const defaulted = decisions.filter(
    (d) => led?.answered.get(d.id)?.byDefault || d.answered_by === "default",
  );
  add({
    id: "defaults",
    group: "owner",
    name: "Defaults applied",
    how: "Decisions no one answered by their deadline, which took their default (the ledger's answered events by default, or answered_by default).",
    unit: "count",
    better: "neither",
    value: `${defaulted.length} since the tracker began`,
    sub: "Each can be reversed from the digest",
    series: countsOf(
      buckets,
      defaulted.map(
        (d) => led?.answered.get(d.id)?.at ?? t(d.answered_at) ?? 0,
      ),
    ),
    act: "Many: the deadlines are too short, or the questions didn't need you.",
    refs: defaulted
      .slice(-3)
      .map((d) => ({ id: d.id, words: "took its default" })),
  });

  const logged = events.filter((e) => e.event === "logged");
  add({
    id: "calls",
    group: "owner",
    name: "Calls made without asking",
    how: "Calls an orchestrator or executor made and logged instead of asking (the ledger's logged events). Read beside reversals: calls you reverse are the ones that should have been asked.",
    unit: "count",
    better: "neither",
    runWide: true,
    ...(ledgerNotYet
      ? { notYet: ledgerNotYet }
      : {
          value: `${logged.length} since the first run`,
          sub: lastRun
            ? `${logged.filter((e) => (t(e.at) ?? 0) >= lastRun.start).length} this ${runWord}`
            : undefined,
        }),
    series: countsOf(
      buckets,
      logged.map((e) => t(e.at)!),
    ),
    act: "If you reverse many of them, narrow what the system may decide alone.",
  });

  const trustWhy =
    "Only hitld's trust record has it, and the board can't read it: hitld rights trust is the owner's, from the primary checkout";
  for (const [id, name, how] of [
    [
      "worth-asking",
      "Worth asking",
      "Your ratings of whether a question was worth asking (hitld rights rate).",
    ],
    [
      "reversals",
      "Reversals and overrules",
      "Calls and precedent applications you reversed (hitld rights reverse, rights overrule).",
    ],
  ] as const) {
    add({
      id,
      group: "owner",
      name,
      how,
      unit: "count",
      better: "lower",
      notYet: trustWhy,
      series: [],
      act: "",
      runWide: true,
    });
  }
  add({
    id: "corrections",
    group: "owner",
    name: "Corrections you give",
    how: "Corrections you give the chief of staff or an orchestrator.",
    unit: "count",
    better: "lower",
    notYet: "No record holds them: they live in the sessions' conversations",
    series: [],
    act: "",
    runWide: true,
  });

  // ---------------------------------------------------- the machine
  const releases = events.filter((e) => e.event === "lease-released");
  const expiries = releases.filter((e) => e.reason && e.reason !== "handover");
  add({
    id: "leases",
    group: "machine",
    name: "Lease expiries",
    how: `Orchestrator leases released for any reason but a hand-over (expired, retired). A lease expires after ${durationText(answer.policy.lease_expiry_seconds.value * 1000)} without renewal (run.lease_expiry_seconds, ${answer.policy.lease_expiry_seconds.source}).`,
    unit: "count",
    better: "lower",
    runWide: true,
    ...(ledgerNotYet
      ? { notYet: ledgerNotYet }
      : {
          value: `${expiries.length} since the first run`,
          sub: `${plural(releases.length - expiries.length, "hand-over")}`,
        }),
    series: countsOf(
      buckets,
      expiries.map((e) => t(e.at)!),
    ),
    act: "Any: an orchestrator ended without a hand-over; check that its successor reconciled the work in flight.",
  });
  const stalls = events.filter(
    (e) =>
      (e.event === "abandoned" ||
        e.event === "unclaimed" ||
        e.event === "stalled") &&
      (!e.item || inScope(e.item)),
  );
  add({
    id: "stalls",
    group: "machine",
    name: "Stalls and abandons",
    how: "Dispatches the watchdog or a resume abandoned or unclaimed, and stalls it recorded.",
    unit: "count",
    better: "lower",
    ...(ledgerNotYet
      ? { notYet: ledgerNotYet }
      : {
          value: `${stalls.length} since the first run`,
          sub: `Of ${plural(dispatchesInScope.length, "dispatch", "dispatches")}`,
        }),
    series: countsOf(
      buckets,
      stalls.map((e) => t(e.at)!),
    ),
    act: "Any: read the dispatch's last report; a stall that repeats on one kind of item needs a smaller brief.",
    refs: stalls
      .filter((e) => e.item)
      .slice(-3)
      .map((e) => ({ id: e.item!, words: e.event })),
  });
  add({
    id: "contention",
    group: "machine",
    name: "Contention",
    how: "Heavy jobs running at once, the machine's load and the waits at the heavy-job gate.",
    unit: "count",
    better: "lower",
    notYet:
      "The gate's waits and the machine's load aren't recorded where the board reads; dyno status shows the machine now",
    series: [],
    act: "",
    runWide: true,
  });
  add({
    id: "refusals",
    group: "machine",
    name: "Harness refusals",
    how: "Tool calls or starts the harness refused.",
    unit: "count",
    better: "lower",
    notYet: "The harness records no refusals in the ledger",
    series: [],
    act: "",
    runWide: true,
  });

  // -------------------------------------------------------- headline
  const fp = metrics.find((m) => m.id === "first-pass");
  const headline: FlowHeadline = {
    mergedWeek: thisWeek.length,
    mergedWeekBefore: weekBefore.length,
    inProgress: flying.length,
    ...(dms.length ? { decisionMs: median(dms) } : {}),
    decisionsAnswered: answeredRows.length,
    decisionsOpen: open.length,
    ...(fp && !fp.notYet
      ? { firstPass: { passed, of: firstPassRows.length } }
      : {}),
    ...(withTokens.length
      ? { tokensMedian: median(withTokens.map((x) => tokensOf.get(x.id)!)) }
      : {}),
    tokensKnown: withTokens.length,
    merged: mergedSince.length,
  };

  return {
    buckets,
    byRuns,
    metrics,
    outOfBand: metrics.filter((m) => m.out),
    headline,
    unread,
    readAt: answer.read_at,
  };
}

// ---------------------------------------------------------------- text

/**
 * The summary to share: how it is going, in a few lines, titles in
 * place of IDs. Token counts only when `tokens` is set (the owner allows
 * it); never hosts, sessions, dispatches or the text of logged calls,
 * which the view doesn't read.
 */
export function flowText(
  v: FlowView,
  {
    titleOf,
    tokens = false,
    asOf,
    scope,
  }: {
    titleOf: (id: string) => string;
    tokens?: boolean;
    /** "Nov 21 (commit 93abdd2)". */
    asOf: string;
    /** The scope's name, when one is set. */
    scope?: string;
  },
): string {
  const h = v.headline;
  const m = (id: string) => v.metrics.find((x) => x.id === id);
  // Plain text: a title's code marks go.
  const title = (id: string) => titleOf(id).replaceAll("`", "");
  const lower = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
  const lines = [
    `How the work is going${scope ? ` in ${scope}` : ""}, as of ${asOf}:`,
  ];
  const merged = m("merged");
  const recent = (merged?.refs ?? []).map((r) => title(r.id));
  lines.push(
    `- Merged: ${plural(h.mergedWeek, "item")} in the last 7 days (${h.mergedWeekBefore} the week before); ${h.inProgress} in progress now.`,
  );
  if (recent.length) {
    lines.push(`- Lately: ${recent.join("; ")}.`);
  }
  if (h.decisionMs !== undefined) {
    lines.push(
      `- Decisions: ${durationText(h.decisionMs)} from asked to answered (median of ${h.decisionsAnswered}); ${h.decisionsOpen} open.`,
    );
  }
  if (h.firstPass) {
    lines.push(
      `- First pass: ${h.firstPass.passed} of ${h.firstPass.of} merged items landed on their first round.`,
    );
  }
  const md = m("merge-wait");
  if (md?.value) {
    lines.push(`- Ready to merged: ${md.value} (median).`);
  }
  if (tokens) {
    lines.push(
      h.tokensMedian !== undefined
        ? `- Tokens: ${tokensText(h.tokensMedian)} per merged item (median; known for ${h.tokensKnown} of ${h.merged}).`
        : `- Tokens: not recorded for any item merged since the first run.`,
    );
  }
  lines.push(
    v.outOfBand.length
      ? `- Out of band: ${v.outOfBand.map((x) => `${x.name.toLowerCase()} (${lower(x.out!)})`).join("; ")}.`
      : "- Nothing with a band is out of it.",
  );
  const notYet = v.metrics.filter(
    (x) => x.notYet && (tokens || x.group !== "cost"),
  );
  if (notYet.length) {
    lines.push(
      `- Can't be told yet: ${notYet.map((x) => x.name.toLowerCase()).join(", ")}.`,
    );
  }
  return lines.join("\n");
}
