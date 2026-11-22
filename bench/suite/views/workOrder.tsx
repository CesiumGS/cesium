import "./workOrder.css";
import {
  IconButton,
  Link,
  Popover,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { svgInfo } from "@stratakit/icons/info";
import { Icon } from "@stratakit/mui";
import {
  type KeyboardEvent,
  type ReactNode,
  useId,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  boardStatus,
  dayKey,
  type InFlight,
  idNumber,
  isOpen,
  NO_RELEASE,
  type Plan,
  planOf,
  type Stage,
  STAGE_NAMES,
  stageOf,
  shortVersion,
  workCardOf,
  type WorkSnapshot,
} from "../work.ts";
import { type SizeLeft, sizeOf, tokensText } from "../workModel.ts";
import { useChartTokens } from "./common.tsx";
import { HoverCard, WorkCardBody } from "./HoverCard.tsx";
import {
  ItemRef,
  KindMark,
  ReleasePicker,
  type WorkViewDef,
  type WorkViewProps,
} from "./Work.tsx";

/*
 * The Order view (CS-749; DESIGN.md, "The Order view"): the planner's
 * sequence for one release, interleaved across projects, with each item's
 * size. It replaces the Plan view (CS-692) and keeps its ID, so old
 * `roadmap=plan` links open it. There is no executor-slot setting: how
 * many items run at once is read from what runs did, shown as a range and
 * labeled as history.
 */

// ------------------------------------------------------------ concurrency, from history

/** How many work items runs have had in progress at once, from history. */
export interface Concurrency {
  /** The fewest and the most at once on any day with work in progress. */
  low: number;
  high: number;
  /** The median day's most at once, rounded up: what the order plans with. */
  typical: number;
  /** Days with work in progress, and the first and last of them ("2026-11-14"). */
  days: number;
  first: string;
  last: string;
  /** Finished spans the history can time: claimed in one commit, closed in a later one. */
  timed: number;
  /** Claimed and closed at one commit time (landed as one merge): no span to time. */
  untimed: number;
  /** Work items in progress now. */
  now: number;
}

const DAY = 86_400_000;

/** The local midnight that starts the day holding `t`. */
const dayStart = (t: number) => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};
/** The next local midnight after the one at `t` (days of 23 or 25 hours too). */
const nextDay = (t: number) => dayStart(t + DAY + 3_600_000 * 2);

/**
 * How many work items runs had in progress at once, read from the
 * board's history (each item's committed state changes) and its claims:
 * a span runs from an item's In progress to its next state, and work in
 * progress now runs to `now`. A span that starts and ends at one commit
 * time (claimed and closed in one merge) can't be timed: it is counted
 * apart, never as concurrency. Each day with work in progress gives its
 * most at once; the range is the fewest and the most of those, and the
 * typical is their median, rounded up. Undefined when nothing has run.
 */
export function concurrencyOf(
  s: WorkSnapshot,
  flight: InFlight | undefined,
  now: number,
): Concurrency | undefined {
  const itemOf = new Map(s.items.map((i) => [i.id, i]));
  const isWorkId = (id: string) => {
    const it = itemOf.get(id);
    return !it || it.kind === "work";
  };
  const spans: Array<[number, number]> = [];
  let timed = 0;
  let untimed = 0;
  const openFrom = new Map<string, number>();
  for (const e of s.history) {
    if (!isWorkId(e.id)) {
      continue;
    }
    const t = Date.parse(e.at);
    if (!Number.isFinite(t)) {
      continue;
    }
    const from = openFrom.get(e.id);
    if (e.state === "in-progress") {
      if (from === undefined) {
        openFrom.set(e.id, t);
      }
      continue;
    }
    if (from === undefined) {
      continue;
    }
    openFrom.delete(e.id);
    if (t > from) {
      spans.push([from, t]);
      timed += 1;
    } else {
      untimed += 1;
    }
  }
  // Work in progress now: from its In progress here, else its claim.
  let inProgress = 0;
  for (const it of s.items) {
    if (it.kind !== "work" || !isOpen(it)) {
      continue;
    }
    if (boardStatus(it, flight) !== "in-progress") {
      continue;
    }
    inProgress += 1;
    const claims = (flight?.get(it.id) ?? [])
      .map((w) => (w.at ? Date.parse(w.at) : NaN))
      .filter(Number.isFinite);
    const from = Math.min(openFrom.get(it.id) ?? Infinity, ...claims, now);
    spans.push([from, Math.max(from, now)]);
  }
  if (!spans.length) {
    return undefined;
  }

  // A sweep: ends before starts at one instant, so back to back isn't two.
  const marks = spans
    .flatMap(([a, b]): Array<[number, number]> => [
      [a, 1],
      [b, -1],
    ])
    .sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  const peaks: number[] = [];
  const dayKeys: string[] = [];
  let k = 0;
  let count = 0;
  const end = Math.max(...spans.map(([, b]) => b));
  for (let d = dayStart(marks[0]![0]); d <= end; d = nextDay(d)) {
    const until = nextDay(d);
    let peak = count;
    // A span still open at `now` counts on now's day.
    while (k < marks.length && marks[k]![0] < until) {
      count += marks[k]![1];
      peak = Math.max(peak, count);
      k += 1;
    }
    if (peak > 0) {
      peaks.push(peak);
      dayKeys.push(dayKey(d));
    }
  }
  if (!peaks.length) {
    return undefined;
  }
  const sorted = [...peaks].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  const median =
    sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  return {
    low: sorted[0]!,
    high: sorted.at(-1)!,
    typical: Math.max(1, Math.ceil(median)),
    days: peaks.length,
    first: dayKeys[0]!,
    last: dayKeys.at(-1)!,
    timed,
    untimed,
    now: inProgress,
  };
}

/**
 * The order's plan: the planner's sequence with as many slots as runs
 * typically had at once. The hover card's slip line reads this same plan
 * (Work.tsx's card scope), so the card and the Order view agree.
 */
export function orderPlanOf(
  s: WorkSnapshot,
  {
    proposals = false,
    flight,
    concurrency,
  }: { proposals?: boolean; flight?: InFlight; concurrency?: Concurrency } = {},
): Plan {
  return planOf(s, { slots: concurrency?.typical ?? 1, proposals, flight });
}

// ------------------------------------------------------------ the order of one release

/** One item in a release's order. */
export interface OrderRow {
  id: string;
  title: string;
  /** Its place in the release's order, from 1. */
  rank: number;
  /** How much of the release's work comes before it, in the plan's unit. */
  at: number;
  /** Its size in the plan's unit: its estimate, or one item. */
  size: number;
  /** Its own token estimate, when it has one. */
  estimate?: number;
  stage?: Stage;
  proposed: boolean;
  project?: string;
  /** The release's milestone that holds it. */
  milestone?: string;
  /**
   * Why no milestone of this release holds it: "later", a later release's
   * milestone holds it and this release's work needs it (pulled in);
   * "none", no milestone holds it.
   */
  loose?: "later" | "none";
  /** Open decisions and outside waits before it, assumed answered in time. */
  held: string[];
  /** Started before its needs to break a loop of needs (a tracker error). */
  loop: boolean;
  /** Among the first ready items in the order: what starts next. */
  next: boolean;
}

/** A project's lane: its items in the release's order. */
export interface OrderLane {
  /** The project's ID; absent for items in no project. */
  project?: string;
  title: string;
  ids: string[];
}

export interface OrderView {
  release: { id: string; version: string; short: string; proposed: boolean };
  unit: Plan["unit"];
  rows: OrderRow[];
  /** One lane per project, in the order each project's first item comes. */
  lanes: OrderLane[];
  /** The whole order's length in the plan's unit. */
  total: number;
  size: SizeLeft;
  /** Earlier releases, whose work comes first in the order, and how much. */
  before: Array<{ id: string; short: string; items: number }>;
  /** The distinct gates its rows wait on, and how many rows wait on one. */
  gates: { decisions: string[]; outside: string[]; rows: number };
  /** How many of its milestones have nothing left to sequence. */
  idle: string[];
  /** How many ready items the order says start next: runs' most at once. */
  nextCount: number;
}

/**
 * One release's order (`orderPlanOf`'s band for it): every item worked in
 * the release, in the order the planner starts them, with its stage, its
 * project, the release milestone that holds it, its gates, and where it
 * sits in the sequence. "Starts next" marks the first ready items, as
 * many as runs have had at once at most (`concurrency.high`, or one).
 */
export function orderViewOf(
  s: WorkSnapshot,
  plan: Plan,
  releaseId: string,
  {
    flight,
    concurrency,
  }: { flight?: InFlight; concurrency?: Concurrency } = {},
): OrderView | undefined {
  const r = plan.releases.find((x) => x.id === releaseId);
  if (!r) {
    return undefined;
  }
  const band = plan.bands[r.band];
  const ids = band?.items ?? [];
  const itemOf = new Map(s.items.map((i) => [i.id, i]));
  const holder = new Map<string, string>();
  for (const m of band?.milestones ?? []) {
    for (const id of plan.milestones.get(m)!.items) {
      if (!holder.has(id)) {
        holder.set(id, m);
      }
    }
  }
  const nextCount = Math.max(1, concurrency?.high ?? 1);
  let nextLeft = nextCount;
  let at = 0;
  const rows = ids.map((id, k): OrderRow => {
    const it = itemOf.get(id)!;
    const p = plan.items.get(id)!;
    const stage = stageOf(it, flight);
    const milestone = holder.get(id);
    const next = stage === "Ready" && nextLeft > 0;
    if (next) {
      nextLeft -= 1;
    }
    const row: OrderRow = {
      id,
      title: it.title,
      rank: k + 1,
      at,
      size: p.size,
      ...(it.estimate_tokens && it.estimate_tokens > 0
        ? { estimate: it.estimate_tokens }
        : {}),
      stage,
      proposed: it.state === "proposed",
      ...(it.project ? { project: it.project } : {}),
      ...(milestone
        ? { milestone }
        : { loose: it.milestones.length ? "later" : "none" }),
      held: p.held,
      loop: !!p.loop,
      next,
    };
    at += p.size;
    return row;
  });

  const lanes: OrderLane[] = [];
  const laneOf = new Map<string, OrderLane>();
  for (const row of rows) {
    const key = row.project ?? "";
    let lane = laneOf.get(key);
    if (!lane) {
      lane = {
        ...(row.project ? { project: row.project } : {}),
        title: row.project
          ? (s.projects.find((p) => p.id === row.project)?.title ?? row.project)
          : "No project",
        ids: [],
      };
      laneOf.set(key, lane);
      lanes.push(lane);
    }
    lane.ids.push(row.id);
  }

  const gateIds = [...new Set(rows.flatMap((x) => x.held))].sort(
    (a, b) => idNumber(a) - idNumber(b),
  );
  const isDecision = (id: string) => itemOf.get(id)?.kind === "decision";
  const version = r.version;
  return {
    release: {
      id: r.id,
      version,
      short: shortVersion(version),
      proposed: r.proposed,
    },
    unit: plan.unit,
    rows,
    lanes,
    total: at,
    size: sizeOf(ids.map((id) => itemOf.get(id)!)),
    before: plan.releases
      .filter((x) => x.band < r.band && x.id !== NO_RELEASE)
      .map((x) => ({
        id: x.id,
        short: shortVersion(x.version),
        items: plan.bands[x.band]?.items.length ?? 0,
      }))
      .filter((x) => x.items > 0),
    gates: {
      decisions: gateIds.filter(isDecision),
      outside: gateIds.filter((id) => !isDecision(id)),
      rows: rows.filter((x) => x.held.length).length,
    },
    idle: band?.idle ?? [],
    nextCount,
  };
}

// ------------------------------------------------------------ the view

const stageClass = (st?: Stage) =>
  st ? `stage-${st.toLowerCase().replace(/\s+/g, "-")}` : "";

/** A row's gates in words: "waits on 2 decisions and 1 outside party". */
function heldText(row: OrderRow, s: WorkSnapshot): string {
  const kinds = row.held.map(
    (id) => s.items.find((i) => i.id === id)?.kind ?? "decision",
  );
  const d = kinds.filter((k) => k === "decision").length;
  const o = kinds.length - d;
  const parts = [
    d ? `${d} ${d === 1 ? "decision" : "decisions"}` : "",
    o ? `${o} outside ${o === 1 ? "party" : "parties"}` : "",
  ].filter(Boolean);
  return `Waits on ${parts.join(" and ")}`;
}

/**
 * The Order view: pick a release, and it shows the order the planner
 * takes its work in, a lane per project so the interleaving shows, then
 * the same order as a list with each item's size and what it waits on.
 */
export function OrderView(p: WorkViewProps) {
  const { s, flight, proposals, release, releases, onRelease } = p;
  const concurrency = useMemo(
    () => concurrencyOf(s, flight, Date.now()),
    [s, flight],
  );
  const plan = useMemo(
    () => orderPlanOf(s, { proposals, flight, concurrency }),
    [s, proposals, flight, concurrency],
  );
  const model = useMemo(
    () =>
      release
        ? orderViewOf(s, plan, release.id, { flight, concurrency })
        : undefined,
    [s, plan, release, flight, concurrency],
  );
  if (!release || !model) {
    return (
      <div className="work-card">
        <Typography variant="body-md" render={<p />} className="work-empty">
          No release is open. A release is a work item with a version, which
          needs the milestones it ships; make one with{" "}
          <code>npx hitld work new</code>.
        </Typography>
      </div>
    );
  }
  return (
    <OrderBody
      p={p}
      model={model}
      plan={plan}
      concurrency={concurrency}
      picker={
        <ReleasePicker
          releases={releases}
          release={release}
          onRelease={onRelease}
        />
      }
    />
  );
}

function OrderBody({
  p,
  model,
  plan,
  concurrency,
  picker,
}: {
  p: WorkViewProps;
  model: OrderView;
  plan: Plan;
  concurrency?: Concurrency;
  picker: ReactNode;
}) {
  const { s, scoped, items, selected } = p;
  const inScope = useMemo(() => new Set(items.map((i) => i.id)), [items]);
  const rows = scoped
    ? model.rows.filter((r) => inScope.has(r.id))
    : model.rows;
  const lanes = scoped
    ? model.lanes
        .map((l) => ({ ...l, ids: l.ids.filter((id) => inScope.has(id)) }))
        .filter((l) => l.ids.length)
    : model.lanes;
  const short = model.release.short;
  const next = rows.filter((r) => r.next);
  const held = rows.filter((r) => r.held.length);
  const pulled = rows.filter((r) => r.loose === "later");
  const unheld = rows.filter((r) => r.loose === "none");
  const loops = rows.filter((r) => r.loop);
  const estimated = model.size.tokens?.estimated ?? 0;
  const projects = lanes.filter((l) => l.project).length;

  return (
    <div className="work-order">
      <div className="work-order-head">
        {picker}
        <OrderHelp model={model} concurrency={concurrency} />
      </div>

      <dl
        className="work-order-stats"
        aria-label={`${short}'s order at a glance`}
      >
        <Stat
          name="In order"
          value={String(rows.length)}
          detail={`items · ${projects} ${projects === 1 ? "project" : "projects"}`}
        />
        <Stat
          name="Size"
          value={
            model.size.tokens
              ? model.size.tokens.low === model.size.tokens.high
                ? tokensText(model.size.tokens.low)
                : `${tokensText(model.size.tokens.low)}–${tokensText(model.size.tokens.high)}`
              : String(model.size.items)
          }
          detail={
            model.size.tokens
              ? `tokens · estimates on ${estimated} of ${model.size.items}`
              : "items · no token estimates yet"
          }
        />
        <Stat
          name="At once, in history"
          value={
            concurrency
              ? concurrency.low === concurrency.high
                ? String(concurrency.low)
                : `${concurrency.low}–${concurrency.high}`
              : "–"
          }
          detail={
            concurrency
              ? `items · over ${concurrency.days} ${concurrency.days === 1 ? "day" : "days"} of runs`
              : "no run history yet"
          }
        />
        <Stat
          name="Starts next"
          value={String(next.length)}
          detail="ready, first in order"
          tone={next.length ? "ready" : undefined}
        />
        <Stat
          name="Wait on a gate"
          value={String(held.length)}
          detail={`items · ${model.gates.decisions.length} ${model.gates.decisions.length === 1 ? "decision" : "decisions"} · ${model.gates.outside.length} outside`}
          tone={held.length ? "attention" : undefined}
        />
      </dl>

      <Notes
        p={p}
        model={model}
        concurrency={concurrency}
        rows={rows}
        pulled={pulled.length}
        unheld={unheld.length}
        loops={loops.length}
      />

      <div className="work-dash">
        <section
          className="work-card span-12"
          aria-labelledby="work-order-lanes-h"
        >
          <header className="work-card-head">
            <span className="work-card-titles">
              <Typography
                variant="subtitle-md"
                render={<h2 />}
                id="work-order-lanes-h"
              >
                By project
              </Typography>
            </span>
          </header>
          <Legend proposals={p.proposals} />
          {rows.length ? (
            <Lanes
              s={s}
              flight={p.flight}
              plan={plan}
              model={model}
              rows={rows}
              lanes={lanes}
              selected={selected}
              onOpen={p.openItem}
            />
          ) : (
            <Typography variant="body-sm" render={<p />} className="work-empty">
              {scoped
                ? `None of ${short}'s work is in the scope.`
                : `${short} has no work left to order.`}
            </Typography>
          )}
        </section>

        <section
          className="work-card span-12"
          aria-labelledby="work-order-list-h"
        >
          <header className="work-card-head">
            <span className="work-card-titles">
              <Typography
                variant="subtitle-md"
                render={<h2 />}
                id="work-order-list-h"
              >
                The sequence
              </Typography>
            </span>
          </header>
          {rows.length > 0 && (
            <Sequence
              s={s}
              rows={rows}
              selected={selected}
              showSize={!!model.size.tokens}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({
  name,
  value,
  detail,
  tone,
}: {
  name: string;
  value: string;
  detail: string;
  tone?: "attention" | "ready";
}) {
  return (
    <div className="work-order-stat">
      <dt>{name}</dt>
      <dd>
        <span className={`work-order-stat-value ${tone ?? ""}`}>{value}</span>
        <span className="work-order-stat-detail">{detail}</span>
      </dd>
    </div>
  );
}

/** What comes first, and what the figures leave out: one line each. */
function Notes({
  p,
  model,
  concurrency,
  rows,
  pulled,
  unheld,
  loops,
}: {
  p: WorkViewProps;
  model: OrderView;
  concurrency?: Concurrency;
  rows: OrderRow[];
  pulled: number;
  unheld: number;
  loops: number;
}) {
  const lines: ReactNode[] = [];
  if (model.before.length) {
    lines.push(
      <>
        Comes after{" "}
        {model.before.map((b, i) => (
          <span key={b.id}>
            {i > 0 && (i === model.before.length - 1 ? " and " : ", ")}
            <Link
              render={<button type="button" />}
              onClick={() => p.onRelease(b.id)}
            >
              {b.short}
            </Link>{" "}
            ({b.items} {b.items === 1 ? "item" : "items"})
          </span>
        ))}
        : the planner takes that work first.
      </>,
    );
  }
  if (pulled) {
    lines.push(
      `${pulled} ${pulled === 1 ? "item is" : "items are"} in a later release's milestone, pulled in because ${model.release.short}'s work needs ${pulled === 1 ? "it" : "them"}.`,
    );
  }
  if (unheld) {
    lines.push(
      `${unheld} ${unheld === 1 ? "item is" : "items are"} in no milestone.`,
    );
  }
  if (loops) {
    lines.push(
      `${loops} ${loops === 1 ? "item starts" : "items start"} before ${loops === 1 ? "its" : "their"} needs to break a loop of needs: a tracker error the Health view names.`,
    );
  }
  if (concurrency?.untimed) {
    lines.push(
      `History times ${concurrency.timed} finished ${concurrency.timed === 1 ? "item" : "items"}; ${concurrency.untimed} more were claimed and closed at one commit time, so the range leaves them out.`,
    );
  }
  if (p.scoped) {
    lines.push(
      `The scope shows ${rows.length} of ${model.rows.length} items, in the release's order.`,
    );
  }
  if (!lines.length) {
    return null;
  }
  return (
    <ul className="work-order-notes">
      {lines.map((l, i) => (
        <Typography
          key={i}
          variant="caption-md"
          color="textSecondary"
          render={<li />}
        >
          {l}
        </Typography>
      ))}
    </ul>
  );
}

/** Every color and mark the lanes use, each with its label. */
function Legend({ proposals }: { proposals: boolean }) {
  const stages: Stage[] = ["Waiting", "Ready", "In flight"];
  if (proposals) {
    stages.unshift("Proposed");
  }
  return (
    <ul className="work-order-legend" aria-label="Key to the lanes">
      {stages.map((st) => (
        <li key={st}>
          <span
            className={`work-order-swatch ${stageClass(st)}${st === "Proposed" ? " proposed" : ""}`}
            aria-hidden="true"
          />
          {STAGE_NAMES[st]}
        </li>
      ))}
      <li>
        <span className="work-order-swatch gate decision" aria-hidden="true" />
        Waits on a decision
      </li>
      <li>
        <span className="work-order-swatch gate external" aria-hidden="true" />
        Waits on an outside party
      </li>
      <li>
        <span className="work-order-swatch next" aria-hidden="true" />
        Starts next
      </li>
    </ul>
  );
}

/** How to read the order: the info button beside the release picker. */
function OrderHelp({
  model,
  concurrency,
}: {
  model: OrderView;
  concurrency?: Concurrency;
}) {
  const tokens = useChartTokens();
  const still = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const head = useId();
  return (
    <>
      <IconButton
        size="small"
        label="How to read the order"
        aria-haspopup="dialog"
        aria-expanded={!!anchor}
        onClick={(e) => setAnchor(e.currentTarget)}
        className="work-order-info"
      >
        <Icon href={svgInfo} />
      </IconButton>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        transitionDuration={still ? 0 : "auto"}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            className: `work-order-pop ${tokens}`,
            role: "dialog",
            "aria-labelledby": head,
          } as object,
        }}
      >
        <Typography variant="body-md" render={<h3 />} id={head}>
          Reading the order
        </Typography>
        <Typography variant="body-sm" render={<p />}>
          The order is the sequence the planner takes {model.release.short}
          &apos;s work in. Each lane is a project; across is how much of the
          release&apos;s work comes before an item, so the lanes show how the
          projects interleave. There are no dates and no durations: a place in
          the order says what comes first, never when.
        </Typography>
        <Typography variant="body-sm" render={<p />}>
          The planner takes work already in progress first, then an earlier
          release&apos;s work before a later one&apos;s, then hitld&apos;s queue
          rule: the item that unblocks the most open work, then the smaller
          estimate, then the lower ID. An item starts only once the items it
          needs are done. Decisions and outside waits are not in the order: the
          items behind them are marked, and the order assumes they are answered
          in time.
        </Typography>
        <Typography variant="body-sm" render={<p />}>
          Sizes are items now, and tokens as a range once estimates exist: the
          sum of the estimates, to that plus each unestimated item at their
          median.
        </Typography>
        <Typography variant="body-sm" render={<p />}>
          How many items run at once is history, not a setting:{" "}
          {concurrency
            ? `on each of the ${concurrency.days} ${concurrency.days === 1 ? "day" : "days"} with work in progress, from ${concurrency.first} to ${concurrency.last}, the most items in progress at once was ${concurrency.low === concurrency.high ? concurrency.low : `between ${concurrency.low} and ${concurrency.high}`}. The order plans with ${concurrency.typical} at once, the typical day's most, and marks the first ${model.nextCount} ready ${model.nextCount === 1 ? "item" : "items"} as starting next: the most runs have had at once.`
            : "no run has history yet, so the order plans one at a time."}{" "}
          The hover card&apos;s room to slip is measured on this same order.
        </Typography>
      </Popover>
    </>
  );
}

/**
 * The lanes' one active bar, shared by the pointer and the keyboard, so
 * at most one card is open: the bar under the pointer, else the focused
 * bar while focus is in the lanes. Escape closes the open card until the
 * pointer or the focus moves on.
 */
export interface BarState {
  hover?: string;
  /** The lanes' tab stop: the bar focused last. */
  cursor?: string;
  focused: boolean;
  /** The card Escape closed. */
  closed?: string;
}
export type BarEvent =
  | { type: "hover"; id: string }
  | { type: "leave" }
  /** `visible`: focus came from the keyboard (`:focus-visible`), not a click. */
  | { type: "focus"; id: string; visible: boolean }
  | { type: "move"; id: string }
  | { type: "blur" }
  | { type: "escape" };
export const BAR_IDLE: BarState = { focused: false };

export function barReducer(st: BarState, e: BarEvent): BarState {
  switch (e.type) {
    case "hover":
      return { ...st, hover: e.id, closed: undefined };
    case "leave":
      return { ...st, hover: undefined, closed: undefined };
    case "focus":
      return st.focused === e.visible && st.cursor === e.id
        ? st
        : { ...st, focused: e.visible, cursor: e.id, closed: undefined };
    case "move":
      return {
        ...st,
        cursor: e.id,
        focused: true,
        hover: undefined,
        closed: undefined,
      };
    case "blur":
      return { ...st, focused: false, closed: undefined };
    case "escape":
      return { ...st, closed: openBarOf(st) };
  }
}

/** The bar whose card is open, if any: one at most. */
export function openBarOf(st: BarState, first?: string): string | undefined {
  const active = st.hover ?? (st.focused ? (st.cursor ?? first) : undefined);
  return active !== undefined && active !== st.closed ? active : undefined;
}

/**
 * The lanes: a project per row, each item a bar at its place in the
 * order, filled by its stage. One tab stop; the arrow keys walk the
 * order (left and right) or the lanes (up and down), Home and End jump
 * to its ends, and Enter opens the item. The pointer and the keyboard
 * share one active bar, so exactly one card is open at a time.
 */
function Lanes({
  s,
  flight,
  plan,
  model,
  rows,
  lanes,
  selected,
  onOpen,
}: {
  s: WorkSnapshot;
  flight: InFlight;
  plan: Plan;
  model: OrderView;
  rows: OrderRow[];
  lanes: OrderLane[];
  selected?: string;
  onOpen: (id: string) => void;
}) {
  const rowOf = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
  const order = rows.map((r) => r.id);
  const [bar, send] = useReducer(barReducer, BAR_IDLE);
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const tabStop = bar.cursor && rowOf.has(bar.cursor) ? bar.cursor : order[0];
  const open = openBarOf(bar, order[0]);
  const total = Math.max(1e-9, model.total);
  // At least 6 px a bar, 3 px narrow: a long release scrolls sideways in its box.
  const bars = total / Math.max(1e-9, plan.defaultSize);
  const minTrack = Math.ceil(bars * 6);
  const minNarrow = Math.ceil(bars * 3);

  const move = (id: string | undefined) => {
    if (!id) {
      return;
    }
    send({ type: "move", id });
    refs.current.get(id)?.focus();
  };
  const laneIndex = (id: string) => lanes.findIndex((l) => l.ids.includes(id));
  /** The bar in another lane nearest across to this one. */
  const nearest = (id: string, lane: number) => {
    const l = lanes[lane];
    if (!l) {
      return undefined;
    }
    const at = rowOf.get(id)!.at;
    return l.ids.reduce((a, b) =>
      Math.abs(rowOf.get(b)!.at - at) < Math.abs(rowOf.get(a)!.at - at) ? b : a,
    );
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const id = tabStop;
    if (!id) {
      return;
    }
    const k = order.indexOf(id);
    const go: Record<string, () => string | undefined> = {
      ArrowRight: () => order[Math.min(order.length - 1, k + 1)],
      ArrowLeft: () => order[Math.max(0, k - 1)],
      Home: () => order[0],
      End: () => order.at(-1),
      ArrowDown: () => nearest(id, laneIndex(id) + 1),
      ArrowUp: () => nearest(id, laneIndex(id) - 1),
    };
    const to = go[e.key];
    if (to) {
      e.preventDefault();
      move(to() ?? id);
    }
  };

  return (
    <div
      className="work-order-lanes"
      role="group"
      aria-label={`${model.release.short}'s order, a lane per project. Arrow keys move along the order, up and down between lanes; Enter opens an item.`}
      onKeyDown={onKey}
      onPointerLeave={() => send({ type: "leave" })}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          send({ type: "blur" });
        }
      }}
    >
      <div className="work-order-scroll">
        <div
          className="work-order-grid"
          style={{
            ["--work-order-track-min" as string]: `${minTrack}px`,
            ["--work-order-track-narrow" as string]: `${minNarrow}px`,
          }}
        >
          {lanes.map((l) => (
            <div className="work-order-lane" key={l.project ?? "none"}>
              <div className="work-order-lane-name">
                {l.project ? (
                  <ItemRef id={l.project} title={l.title} card={false} />
                ) : (
                  <span className="work-order-lane-none">{l.title}</span>
                )}
                <span className="work-order-lane-count">{l.ids.length}</span>
              </div>
              <div className="work-order-track">
                {l.ids.map((id) => {
                  const r = rowOf.get(id)!;
                  const isOpenCard = open === id;
                  return (
                    <HoverCard
                      key={id}
                      open={isOpenCard}
                      onClose={() => send({ type: "escape" })}
                      placement="top-start"
                      card={
                        isOpenCard ? (
                          <BarCard
                            s={s}
                            flight={flight}
                            plan={plan}
                            row={r}
                            release={model.release.id}
                            short={model.release.short}
                          />
                        ) : null
                      }
                    >
                      <button
                        type="button"
                        ref={(el) => {
                          if (el) {
                            refs.current.set(id, el);
                          } else {
                            refs.current.delete(id);
                          }
                        }}
                        tabIndex={id === tabStop ? 0 : -1}
                        className={`work-order-bar ${stageClass(r.stage)}${r.proposed ? " proposed" : ""}${r.held.length ? ` gate ${heldKind(r, s)}` : ""}${r.next ? " next" : ""}${id === selected ? " selected" : ""}${isOpenCard ? " active" : ""}`}
                        style={{
                          left: `${(r.at / total) * 100}%`,
                          width: `${(r.size / total) * 100}%`,
                        }}
                        aria-label={`${r.rank}. ${r.id} ${r.title}, ${r.stage ? STAGE_NAMES[r.stage] : "open"}${r.held.length ? `, ${heldText(r, s).toLowerCase()}` : ""}${r.next ? ", starts next" : ""}`}
                        onPointerEnter={() => send({ type: "hover", id })}
                        onFocus={(e) =>
                          send({
                            type: "focus",
                            id,
                            visible: e.currentTarget.matches(":focus-visible"),
                          })
                        }
                        onClick={() => onOpen(id)}
                      />
                    </HoverCard>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The gate kind a bar's cap shows: a decision's ink wins over an outside wait's. */
function heldKind(r: OrderRow, s: WorkSnapshot): "decision" | "external" {
  return r.held.some(
    (id) => s.items.find((i) => i.id === id)?.kind === "decision",
  )
    ? "decision"
    : "external";
}

/** A bar's card: the shared card, its footer saying where the bar sits in the order. */
function BarCard({
  s,
  flight,
  plan,
  row,
  release,
  short,
}: {
  s: WorkSnapshot;
  flight: InFlight;
  plan: Plan;
  row: OrderRow;
  release: string;
  short: string;
}) {
  const card = workCardOf(s, row.id, { flight, plan, release });
  return card ? (
    <WorkCardBody
      card={card}
      footer={`${row.rank === 1 ? "First" : `#${row.rank}`} in ${short}'s order${row.next ? ", starts next" : ""} · Click or Enter for details`}
    />
  ) : null;
}

/** The order as a list: rank, stage, item, project, and what it waits on. */
function Sequence({
  s,
  rows,
  selected,
  showSize,
}: {
  s: WorkSnapshot;
  rows: OrderRow[];
  selected?: string;
  showSize: boolean;
}) {
  const projectTitle = useMemo(
    () => new Map(s.projects.map((p) => [p.id, p.title])),
    [s],
  );
  const width = String(rows.at(-1)?.rank ?? 1).length;
  return (
    <ol
      className={`work-order-seq${showSize ? " has-size" : ""}`}
      style={{ ["--work-order-rank" as string]: `${width + 1}ch` }}
    >
      {rows.map((r) => (
        <li
          key={r.id}
          className={`work-order-row${r.id === selected ? " selected" : ""}${r.proposed ? " proposed" : ""}`}
        >
          <span className="work-order-rank" aria-hidden="true">
            {r.rank}
          </span>
          <span
            className={`work-order-swatch ${stageClass(r.stage)}`}
            title={r.stage ? STAGE_NAMES[r.stage] : undefined}
            aria-hidden="true"
          />
          <span className="visually-hidden">
            {r.rank}. {r.stage ? STAGE_NAMES[r.stage] : ""}
          </span>
          <span className="work-order-item">
            <ItemRef id={r.id} title={r.title} />
          </span>
          <span
            className="work-order-project"
            title={r.project ? projectTitle.get(r.project) : undefined}
          >
            {r.project
              ? (projectTitle.get(r.project) ?? r.project)
              : "No project"}
          </span>
          {showSize && (
            <span className="work-order-size">
              {r.estimate !== undefined
                ? `${tokensText(r.estimate)}`
                : "no estimate"}
            </span>
          )}
          <span className="work-order-tags">
            {r.next && <span className="work-order-tag next">Starts next</span>}
            {r.held.length > 0 && (
              <span
                className="work-order-tag held"
                title={`${heldText(r, s)}: ${r.held.join(", ")}, assumed answered in time`}
              >
                <KindMark kind={heldKind(r, s)} named={false} />
                {heldText(r, s)}
              </span>
            )}
            {r.loose === "later" && (
              <span className="work-order-tag">Pulled in</span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}

export const workView: WorkViewDef = {
  // The Plan view's ID: old `roadmap=plan` links open the Order view.
  id: "plan",
  label: "Order",
  question: "In what order the planner takes a release's work, and how much",
  place: "roadmap",
  order: 40,
  proposals: true,
  Component: OrderView,
};
