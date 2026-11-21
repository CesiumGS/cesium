import "./workFlow.css";
import {
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Tooltip,
  Typography,
} from "@mui/material";
import { svgCopy } from "@stratakit/icons/copy";
import { svgInfo } from "@stratakit/icons/info";
import { Icon } from "@stratakit/mui";
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { FlowAnswer } from "../../../scripts/workBoard.mjs";
import { toast } from "../toast.ts";
import { flowOf, type WorkSnapshot } from "../work.ts";
import {
  FLOW_GROUPS,
  type FlowBucket,
  type FlowGroupId,
  type FlowMetric,
  type FlowView as FlowModel,
  flowText,
  flowViewOf,
  tokensText,
  unitText,
} from "../workFlow.ts";
import { releaseViewOf } from "../workModel.ts";
import {
  FlowChart,
  ItemRef,
  ReleasePicker,
  type WorkViewDef,
  type WorkViewProps,
} from "./Work.tsx";

// ---------------------------------------------------------------- read

type Read =
  | { state: "reading"; kept?: FlowAnswer }
  | { state: "read"; answer: FlowAnswer }
  | { state: "failed"; error: string; kept?: FlowAnswer };

/** The board's Flow read: `/work-api/flow.json`, again whenever the snapshot is. */
function useFlowAnswer(generated: string): Read {
  const [read, setRead] = useState<Read>({ state: "reading" });
  useEffect(() => {
    const ctl = new AbortController();
    setRead((r) => ({
      state: "reading",
      kept: r.state === "read" ? r.answer : r.kept,
    }));
    fetch("/work-api/flow.json", { signal: ctl.signal })
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as
          FlowAnswer | { error?: string };
        if (!res.ok || !("history" in body)) {
          setRead((r) => ({
            state: "failed",
            error:
              (body as { error?: string }).error ??
              `The board's read answered ${res.status}: see the dev server's log`,
            kept: r.state === "reading" ? r.kept : undefined,
          }));
          return;
        }
        setRead({ state: "read", answer: body });
      })
      .catch((e: unknown) => {
        if ((e as Error).name === "AbortError") {
          return;
        }
        setRead({
          state: "failed",
          error:
            "The board's read endpoint can't be reached: it runs on Dyno's dev server only",
        });
      });
    return () => ctl.abort();
  }, [generated]);
  return read;
}

const dayWords = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
};

/** Under reduced motion, a jump to a measure is instant. */
const reduced = () =>
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

const rowId = (id: string) => `work-flow-m-${id}`;

// ---------------------------------------------------------------- view

/**
 * The Flow view (CS-752; DESIGN.md, "The Flow view"): how well the
 * system and the owner work together. Exceptions lead (the measures out
 * of their band), then four figures for "how is it going", then every
 * measure in its group with its trend over runs, its band where one is
 * set and one line on what to do. A measure that can't be told yet says
 * why, in its group's last lines. Read from the board's endpoint; nothing
 * is changed from here.
 */
export function FlowView(p: WorkViewProps) {
  const { s, items, scoped, msInScope, flight } = p;
  const read = useFlowAnswer(s.generated);
  const answer = read.state === "read" ? read.answer : read.kept;
  const inFlight = useMemo(
    () => [
      ...new Set([
        ...flight.keys(),
        ...s.items.filter((i) => i.state === "in-progress").map((i) => i.id),
      ]),
    ],
    [flight, s.items],
  );
  const inScope = useMemo(() => {
    if (!scoped) {
      return undefined;
    }
    const ids = new Set(items.map((i) => i.id));
    return (id: string) => ids.has(id) || msInScope(id);
  }, [scoped, items, msInScope]);
  const view = useMemo(
    () =>
      answer
        ? flowViewOf(answer, {
            inScope,
            inFlight,
            milestones: s.milestones,
          })
        : undefined,
    [answer, inScope, inFlight, s.milestones],
  );
  const titleOf = useMemo(() => {
    const own = new Map(answer?.entities.map((e) => [e.id, e.title]));
    const snap = new Map(
      [...s.items, ...s.milestones, ...s.projects].map((x) => [x.id, x.title]),
    );
    return (id: string) => snap.get(id) ?? own.get(id) ?? id;
  }, [answer, s]);

  const [tokens, setTokens] = useState(false);
  const [showText, setShowText] = useState<string>();
  const asOf = answer
    ? `${dayWords(answer.read_at)} (commit ${answer.head.short.slice(0, 7)})`
    : "";
  const copy = () => {
    if (!view) {
      return;
    }
    const text = flowText(view, {
      titleOf,
      tokens,
      asOf,
      scope: scoped ? "this scope" : undefined,
    });
    navigator.clipboard.writeText(text).then(
      () => {
        setShowText(undefined);
        toast("Copied the summary");
      },
      () => {
        setShowText(text);
        toast(
          "The browser refused to copy: the summary is selected below, so copy it with the keyboard",
          "bad",
        );
      },
    );
  };

  const jump = (id: string) => {
    const el = document.getElementById(rowId(id));
    el?.scrollIntoView({
      behavior: reduced() ? "instant" : "smooth",
      block: "center",
    });
    el?.focus({ preventScroll: true });
  };

  return (
    <div
      className={`work-flow${read.state === "reading" && answer ? " reading" : ""}`}
    >
      <div className="work-flow-head">
        <Typography
          variant="body-sm"
          color="textSecondary"
          render={<p />}
          className="work-flow-asof"
        >
          {answer ? (
            <>
              As of {asOf}
              {view?.byRuns
                ? `, over ${view.buckets.length} runs since ${view.buckets[0]!.label.replace(/ #\d+$/, "")}`
                : ", by week: no run is recorded"}
              {scoped
                ? ". Narrowed to the scope where a measure is an item's."
                : "."}
            </>
          ) : (
            "Reading the ledger and the tracker's history"
          )}
        </Typography>
        <div className="work-flow-share">
          <FormControlLabel
            className="work-flow-tokens"
            control={
              <Checkbox
                checked={tokens}
                onChange={(e) => setTokens(e.target.checked)}
              />
            }
            label="With token counts"
          />
          <Button
            variant="outlined"
            size="small"
            startIcon={<Icon href={svgCopy} />}
            onClick={copy}
            disabled={!view}
            title="A short summary for a stakeholder, with titles in place of IDs; token counts only when checked"
          >
            Copy as text
          </Button>
        </div>
      </div>
      {showText !== undefined && (
        <SelectedText text={showText} onClose={() => setShowText(undefined)} />
      )}

      {read.state === "failed" && !answer && (
        <Typography variant="body-md" color="error" render={<p />}>
          {read.error}
        </Typography>
      )}
      {!answer && read.state === "reading" && (
        <div className="work-flow-loading" role="status">
          <CircularProgress size={18} />
          <Typography variant="body-sm" color="textSecondary">
            Reading the ledger and the tracker's history
          </Typography>
        </div>
      )}

      {view && (
        <>
          {view.unread.map((u) => (
            <Typography
              key={u}
              variant="caption-md"
              color="textSecondary"
              render={<p />}
              className="work-flow-note"
            >
              {u.charAt(0).toUpperCase() + u.slice(1)}.
            </Typography>
          ))}
          <Figures view={view} onJump={jump} />
          <Exceptions view={view} onJump={jump} />
          {FLOW_GROUPS.map((g) => (
            <GroupCard
              key={g.id}
              group={g.id}
              view={view}
              scoped={scoped}
              after={
                g.id === "cost" ? (
                  <CostByMilestone p={p} answer={answer!} titleOf={titleOf} />
                ) : undefined
              }
            />
          ))}
          <StagesCard s={s} p={p} />
        </>
      )}
    </div>
  );
}

/** The four figures for "how is it going", each a number and a line under it. */
function Figures({
  view,
  onJump,
}: {
  view: FlowModel;
  onJump: (id: string) => void;
}) {
  const h = view.headline;
  const figures: Array<{
    key: string;
    name: string;
    value: string;
    detail: string;
    jump: string;
    tone?: "attention";
  }> = [
    {
      key: "merged",
      name: "Merged",
      value: String(h.mergedWeek),
      detail: `In the last 7 days; ${h.mergedWeekBefore} the week before`,
      jump: "merged",
    },
    {
      key: "decisions",
      name: "Your decision time",
      value:
        h.decisionMs !== undefined
          ? unitText("ms", h.decisionMs)
          : "Can't tell",
      detail: `Median of ${h.decisionsAnswered}; ${h.decisionsOpen} open`,
      jump: "decision-latency",
    },
    {
      key: "first",
      name: "First-pass merges",
      value: h.firstPass
        ? `${Math.round((100 * h.firstPass.passed) / Math.max(1, h.firstPass.of))}%`
        : "Can't tell",
      detail: h.firstPass
        ? `${h.firstPass.passed} of ${h.firstPass.of} on the first round`
        : "No merge on record yet",
      jump: "first-pass",
    },
    {
      key: "out",
      name: "Out of band",
      value: String(view.outOfBand.length),
      detail: view.outOfBand.length
        ? view.outOfBand.map((m) => m.name).join(", ")
        : "Every measure with a band is in it",
      jump: view.outOfBand[0]?.id ?? "",
      tone: view.outOfBand.length ? "attention" : undefined,
    },
  ];
  return (
    <dl className="work-flow-stats">
      {figures.map((f) => (
        <div key={f.key} className={`work-flow-stat ${f.tone ?? ""}`}>
          <dt>{f.name}</dt>
          <dd>
            {f.jump ? (
              <button
                type="button"
                className="work-flow-stat-value"
                onClick={() => onJump(f.jump)}
                aria-label={`${f.name}: ${f.value}. Go to the measure`}
              >
                {f.value}
              </button>
            ) : (
              <span className="work-flow-stat-value">{f.value}</span>
            )}
            <span className="work-flow-stat-detail">{f.detail}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** The measures out of their band: the exceptions lead, each with what to do. */
function Exceptions({
  view,
  onJump,
}: {
  view: FlowModel;
  onJump: (id: string) => void;
}) {
  if (!view.outOfBand.length) {
    return null;
  }
  return (
    <section
      className="work-card work-flow-exceptions"
      aria-labelledby="work-flow-out-h"
    >
      <header className="work-card-head">
        <span className="work-card-titles">
          <Typography
            variant="subtitle-md"
            render={<h2 />}
            id="work-flow-out-h"
          >
            Needs a look
          </Typography>
          <Typography variant="caption-md" color="textSecondary">
            Measures outside their band now
          </Typography>
        </span>
      </header>
      <ul className="work-flow-out-list">
        {view.outOfBand.map((m) => (
          <li key={m.id} className="work-flow-out">
            <span className="work-flow-out-mark" aria-hidden="true" />
            <span className="work-flow-out-text">
              <Typography variant="body-md" render={<h3 />}>
                <button
                  type="button"
                  className="work-flow-link"
                  onClick={() => onJump(m.id)}
                >
                  {m.name}
                </button>
                <span className="work-flow-out-what">: {m.out}</span>
              </Typography>
              <Typography variant="body-sm" color="textSecondary">
                {m.band?.words} ({m.band?.source}). {m.act}
              </Typography>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** One group's measures: those that can be told, then those that can't yet. */
function GroupCard({
  group,
  view,
  scoped,
  after,
}: {
  group: FlowGroupId;
  view: FlowModel;
  scoped: boolean;
  after?: ReactNode;
}) {
  const g = FLOW_GROUPS.find((x) => x.id === group)!;
  const ms = view.metrics.filter((m) => m.group === group);
  const told = ms.filter((m) => !m.notYet);
  const notYet = ms.filter((m) => m.notYet);
  const hId = `work-flow-${group}-h`;
  return (
    <section className="work-card work-flow-group" aria-labelledby={hId}>
      <header className="work-card-head">
        <span className="work-card-titles">
          <Typography variant="subtitle-md" render={<h2 />} id={hId}>
            {g.name}
          </Typography>
          <Typography variant="caption-md" color="textSecondary">
            {g.question}
          </Typography>
        </span>
      </header>
      {told.length > 0 && (
        <ul className="work-flow-rows">
          {told.map((m) => (
            <MetricRow
              key={m.id}
              m={m}
              buckets={view.buckets}
              scoped={scoped}
            />
          ))}
        </ul>
      )}
      {after}
      {notYet.length > 0 && (
        <div className="work-flow-notyet">
          <Typography variant="body-sm" render={<h3 />}>
            Can't be told yet
          </Typography>
          <ul>
            {notYet.map((m) => (
              <li key={m.id} id={rowId(m.id)} tabIndex={-1}>
                <span className="work-flow-notyet-name">{m.name}</span>
                <span className="work-flow-notyet-why">{m.notYet}.</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/** An info mark that shows how a measure is read, on hover or focus. */
function HowTip({ name, text }: { name: string; text: string }) {
  return (
    <Tooltip title={text} placement="top">
      <button
        type="button"
        className="work-flow-how"
        aria-label={`How ${name.toLowerCase()} is read: ${text}`}
      >
        <Icon href={svgInfo} />
      </button>
    </Tooltip>
  );
}

/**
 * One measure: its name and how it is read, its value and basis, its
 * trend over runs with its band, the items behind it and one line on
 * what to do.
 */
function MetricRow({
  m,
  buckets,
  scoped,
}: {
  m: FlowMetric;
  buckets: readonly FlowBucket[];
  scoped: boolean;
}) {
  return (
    <li
      className={`work-flow-row${m.out ? " out" : ""}`}
      id={rowId(m.id)}
      tabIndex={-1}
    >
      <div className="work-flow-row-name">
        <span className="work-flow-row-title">
          <Typography variant="body-md" render={<h3 />}>
            {m.name}
          </Typography>
          <HowTip name={m.name} text={m.how} />
        </span>
        <Typography
          variant="caption-md"
          color="textSecondary"
          render={<p />}
          className="work-flow-act"
        >
          {m.act}
          {scoped && m.runWide && " Run-wide: the scope doesn't narrow it."}
        </Typography>
      </div>
      <div className="work-flow-row-value">
        <span className="work-flow-value">{m.value}</span>
        {m.sub && <span className="work-flow-sub">{m.sub}</span>}
        {m.split && m.split.length > 0 && (
          <dl className="work-flow-split">
            {m.split.map((x) => (
              <div key={x.name}>
                <dt>{x.name}</dt>
                <dd>
                  {x.value}
                  {x.value !== String(x.n) && (
                    <span className="work-flow-n"> ({x.n})</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {m.refs && m.refs.length > 0 && (
          <ul className="work-flow-refs">
            {m.refs.map((r) => (
              <li key={r.id}>
                <ItemRef id={r.id} />
                <span className="work-flow-ref-words">{r.words}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="work-flow-row-trend">
        <Spark m={m} buckets={buckets} />
        <span className="work-flow-band">
          {m.band
            ? `Band: ${m.band.words.charAt(0).toLowerCase()}${m.band.words.slice(1)} (${m.band.source})`
            : "No band set"}
        </span>
      </div>
    </li>
  );
}

/**
 * A measure's trend over the buckets: a dot per bucket with a value,
 * joined, and its band's edge dashed. Points out of the band take the
 * attention color. One stop for the keyboard (a slider over the runs):
 * ← and → step through them, Home and End jump to the first and the last,
 * and the caption's reserved line reads the run picked; the pointer does
 * the same on hover. A screen reader gets every run's value in its
 * description.
 */
function Spark({
  m,
  buckets,
}: {
  m: FlowMetric;
  buckets: readonly FlowBucket[];
}) {
  const [at, setAt] = useState<number>();
  const ref = useRef<SVGSVGElement>(null);
  const descId = `work-flow-spark-${m.id}`;
  const w = 220;
  const h = 44;
  const pad = 6;
  const n = buckets.length;
  const vals = m.series.map((p) => p.v);
  const defined = vals.filter((v): v is number => v !== undefined);
  const hi = m.band?.hi;
  // Durations span seconds to days: a log scale keeps one long wait from
  // flattening the rest.
  const log = m.unit === "ms";
  const f = (v: number) => (log ? Math.log10(1 + v / 1000) : v);
  const max = Math.max(
    m.unit === "share" ? 1 : 1e-9,
    ...defined.map(f),
    hi !== undefined ? f(hi) * 1.15 : 0,
  );
  const x = (i: number) =>
    n < 2 ? w / 2 : pad + (i * (w - 2 * pad)) / (n - 1);
  const y = (v: number) => h - pad - ((h - 2 * pad) * f(v)) / max;
  const valueAt = (i: number) => {
    const v = vals[i];
    const k = m.series[i]?.n ?? 0;
    return v === undefined
      ? "nothing to tell"
      : `${unitText(m.unit, v)}${k && m.unit !== "count" ? ` (of ${k})` : ""}`;
  };
  const readAt = (i: number) => `${buckets[i]!.label}: ${valueAt(i)}`;
  const byWhat =
    buckets.length > 0 && buckets[0]!.key.startsWith("w") ? "week" : "run";
  if (!defined.length) {
    return (
      <span className="work-flow-spark-empty">
        Nothing to draw over the runs yet
      </span>
    );
  }
  const segments: string[] = [];
  let cur = "";
  vals.forEach((v, i) => {
    if (v === undefined) {
      if (cur) {
        segments.push(cur);
      }
      cur = "";
      return;
    }
    cur += `${cur ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
  });
  if (cur) {
    segments.push(cur);
  }
  const outOf = (v: number) =>
    (hi !== undefined && v > hi) || (m.band?.lo !== undefined && v < m.band.lo);
  const follow = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r?.width) {
      return;
    }
    const px = ((clientX - r.left) / r.width) * w;
    let best = 0;
    for (let i = 1; i < n; i++) {
      if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) {
        best = i;
      }
    }
    setAt(best);
  };
  const keys = (e: KeyboardEvent) => {
    const now = at ?? n - 1;
    const next =
      e.key === "ArrowLeft" || e.key === "ArrowDown"
        ? Math.max(0, now - 1)
        : e.key === "ArrowRight" || e.key === "ArrowUp"
          ? Math.min(n - 1, now + 1)
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? n - 1
              : undefined;
    if (next !== undefined) {
      e.preventDefault();
      setAt(next);
    }
  };
  return (
    <figure className="work-flow-spark">
      <svg
        ref={ref}
        viewBox={`0 0 ${w} ${h}`}
        tabIndex={0}
        role="slider"
        aria-label={`${m.name} by ${byWhat}${log ? ", on a log scale" : ""}`}
        aria-describedby={descId}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, n - 1)}
        aria-valuenow={at ?? n - 1}
        aria-valuetext={readAt(at ?? n - 1)}
        onKeyDown={keys}
        onFocus={() => setAt((a) => a ?? n - 1)}
        onBlur={() => setAt(undefined)}
        onPointerMove={(e) => follow(e.clientX)}
        onPointerLeave={() => {
          if (document.activeElement !== ref.current) {
            setAt(undefined);
          }
        }}
      >
        <line
          className="work-flow-spark-base"
          x1={pad}
          x2={w - pad}
          y1={h - pad}
          y2={h - pad}
        />
        {hi !== undefined && (
          <line
            className="work-flow-spark-band"
            x1={pad}
            x2={w - pad}
            y1={y(hi)}
            y2={y(hi)}
          />
        )}
        {at !== undefined && (
          <line
            className="work-flow-spark-cursor"
            x1={x(at)}
            x2={x(at)}
            y1={2}
            y2={h - pad}
          />
        )}
        {segments.map((d) => (
          <path key={d} className="work-flow-spark-line" d={d} />
        ))}
        {vals.map((v, i) =>
          v === undefined ? null : (
            <circle
              key={buckets[i]!.key}
              className={`work-flow-spark-dot${outOf(v) ? " out" : ""}`}
              cx={x(i)}
              cy={y(v)}
              r={i === (at ?? n - 1) ? 3.2 : 2.4}
            />
          ),
        )}
      </svg>
      <span id={descId} className="work-flow-visually-hidden">
        {buckets.map((_, i) => readAt(i)).join("; ")}
      </span>
      <figcaption className="work-flow-spark-axis" aria-hidden="true">
        {at !== undefined ? (
          <span className="work-flow-spark-read" title={buckets[at]!.title}>
            {readAt(at)}
          </span>
        ) : (
          <>
            <span>{buckets[0]?.label}</span>
            {log && <span>log scale</span>}
            <span>{buckets.at(-1)?.label}</span>
          </>
        )}
      </figcaption>
    </figure>
  );
}

/**
 * Tokens by milestone in the release picked: what each milestone's
 * merged items took, with how many have tokens recorded, and its
 * appetite when shaping set one. Says plainly when none is recorded.
 */
function CostByMilestone({
  p,
  answer,
  titleOf,
}: {
  p: WorkViewProps;
  answer: FlowAnswer;
  titleOf: (id: string) => string;
}) {
  const { s, release, releases, onRelease, msInScope, scoped } = p;
  const tokensOf = useMemo(() => {
    const out = new Map<string, number>();
    if (answer.ledger.ok) {
      for (const e of answer.ledger.events) {
        if (e.event === "reported" && e.item && (e.tokens ?? 0) > 0) {
          out.set(e.item, (out.get(e.item) ?? 0) + e.tokens!);
        }
      }
    }
    return out;
  }, [answer]);
  const rows = useMemo(() => {
    if (!release) {
      return [];
    }
    const rv = releaseViewOf(s, release.id, { proposals: p.proposals });
    if (!rv) {
      return [];
    }
    const ids = [...rv.milestones.map((m) => m.id), ...rv.done];
    return ids
      .map((id) => s.milestones.find((m) => m.id === id))
      .filter(
        (m): m is NonNullable<typeof m> => !!m && (!scoped || msInScope(m.id)),
      )
      .map((m) => {
        const items = [...new Set(m.constraints.map((c) => c.id))];
        const known = items.filter((id) => tokensOf.has(id));
        const byClause = new Map<
          string,
          { tokens: number; known: number; items: number }
        >();
        for (const c of m.constraints) {
          const k = byClause.get(c.clause) ?? { tokens: 0, known: 0, items: 0 };
          k.items++;
          if (tokensOf.has(c.id)) {
            k.known++;
            k.tokens += tokensOf.get(c.id)!;
          }
          byClause.set(c.clause, k);
        }
        return {
          id: m.id,
          items: items.length,
          known: known.length,
          tokens: known.reduce((a, id) => a + tokensOf.get(id)!, 0),
          appetite: m.appetite_tokens,
          clauses: [...byClause].filter(([, k]) => k.known),
        };
      });
  }, [s, release, p.proposals, tokensOf, scoped, msInScope]);
  const anyKnown = rows.some((r) => r.known);
  const total = rows.reduce((a, r) => a + r.tokens, 0);
  return (
    <div className="work-flow-bymilestone">
      <div className="work-flow-bymilestone-head">
        <Typography variant="body-sm" render={<h3 />}>
          By milestone in {release?.short ?? "a release"}
        </Typography>
        {releases.length > 1 && (
          <ReleasePicker
            releases={releases}
            release={release}
            onRelease={onRelease}
          />
        )}
      </div>
      {!rows.length ? (
        <Typography variant="body-sm" color="textSecondary" render={<p />}>
          No milestone in this release{scoped ? " is in the scope" : ""}.
        </Typography>
      ) : !anyKnown ? (
        <Typography variant="body-sm" color="textSecondary" render={<p />}>
          Can't be told yet: none of {release?.short}'s{" "}
          {rows.reduce((a, r) => a + r.items, 0)} linked items has tokens
          recorded. An executor's report records them in hitld's ledger;
          executors started by hand don't yet.
        </Typography>
      ) : (
        <>
          <Typography variant="caption-md" color="textSecondary" render={<p />}>
            {tokensText(total)} known in all; a milestone's figure counts only
            its items with tokens recorded.
          </Typography>
          <ul className="work-flow-ms">
            {rows
              .filter((r) => r.known)
              .map((r) => (
                <li key={r.id}>
                  <ItemRef id={r.id} title={titleOf(r.id)} />
                  <span className="work-flow-ms-tokens">
                    {r.known ? tokensText(r.tokens) : "—"}
                  </span>
                  <span className="work-flow-ms-known">
                    {r.known} of {r.items} {r.items === 1 ? "item" : "items"}
                    {r.appetite
                      ? ` · appetite ${tokensText(r.appetite, false)}`
                      : ""}
                  </span>
                  {r.clauses.length > 0 && (
                    <span className="work-flow-ms-clauses">
                      {r.clauses
                        .map(
                          ([c, k]) =>
                            `${c === "c?" ? "no clause" : c} ${tokensText(k.tokens, false)}`,
                        )
                        .join(" · ")}
                    </span>
                  )}
                </li>
              ))}
          </ul>
          {rows.some((r) => !r.known) && (
            <Typography
              variant="caption-md"
              color="textSecondary"
              render={<p />}
            >
              {(() => {
                const rest = rows.filter((r) => !r.known);
                return `${rest.length} more ${rest.length === 1 ? "milestone has" : "milestones have"} no tokens recorded on any of ${rest.length === 1 ? "its" : "their"} ${rest.reduce((a, r) => a + r.items, 0)} items.`;
              })()}
            </Typography>
          )}
        </>
      )}
    </div>
  );
}

/** The cumulative flow chart (CS-698), moved here from the old Flow tab. */
function StagesCard({ s, p }: { s: WorkSnapshot; p: WorkViewProps }) {
  const flow = useMemo(
    () => flowOf(s, p.items, { flight: p.flight }),
    [s, p.items, p.flight],
  );
  const itemOf = useMemo(() => new Map(s.items.map((i) => [i.id, i])), [s]);
  return (
    <section
      className="work-card work-flow-stages"
      aria-labelledby="work-flow-stages-h"
    >
      <header className="work-card-head">
        <span className="work-card-titles">
          <Typography
            variant="subtitle-md"
            render={<h2 />}
            id="work-flow-stages-h"
          >
            Items in each stage, day by day
          </Typography>
          <Typography variant="caption-md" color="textSecondary">
            {`A band that widens is a queue growing; choose a day to list what moved, or a stage to list it. ${flow.created} ${flow.created === 1 ? "item" : "items"} new in the last ${flow.window} days.`}
          </Typography>
        </span>
      </header>
      <FlowChart
        flow={flow}
        itemOf={itemOf}
        onStage={(st) => p.openList(`stage:${st}`)}
        onDay={(key) => p.openList(`day:${key}`)}
      />
    </section>
  );
}

/** When the browser refuses the clipboard: the summary, selected for the keyboard's copy. */
function SelectedText({
  text,
  onClose,
}: {
  text: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, [text]);
  return (
    <div className="work-flow-text">
      <textarea
        ref={ref}
        readOnly
        value={text}
        rows={Math.min(14, text.split("\n").length)}
        aria-label="The summary, selected: copy it with the keyboard"
      />
      <Button variant="text" size="small" onClick={onClose}>
        Done
      </Button>
    </div>
  );
}

export const workView: WorkViewDef = {
  id: "flow",
  label: "Flow",
  question:
    "How well the system and you work together: cost, throughput, latencies and quality",
  place: "page",
  order: 70,
  proposals: false,
  replaces: [],
  Component: FlowView,
};
