import "./results.css";
import {
  Alert,
  Button,
  CircularProgress,
  Link,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ALERT_METRICS, detectAlerts } from "../changepoints.mjs";
import { METRICS } from "../report.mjs";
import { catalog, geomean, metricInfo, short, type Summary } from "../data.ts";
import type { Budget } from "../schema.ts";
import { formatChange, Page, Section, useRuns } from "./common.tsx";
import {
  Change,
  dateOf,
  HEADLINES,
  headline,
  pairOf,
  sceneChanges,
  sceneCount,
  Status,
  ValidityStatus,
  validityOf,
  VerdictStatus,
  verdictOf,
} from "./runParts.tsx";

/**
 * The Overview (DESIGN.md): where 2.0 stands against 1.x in the latest
 * ordinary run (sweeps vary the configurations), whether that run can be
 * trusted, which budgets it meets, and what needs a look: untriaged
 * regressions, images to review, invalid runs. Then the latest runs.
 * Every item links to the view that explains it.
 */

/** Words for metrics whose change isn't "faster" or "slower". */
const NOUNS: Record<string, string> = {
  bytes: "data",
  heapBytes: "memory",
  requests: "requests",
  over100: "hitches",
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const metricName = (key: string) => {
  const h = HEADLINES.find((x) => x.key === key);
  if (h) {
    return h.label;
  }
  const label = METRICS.find((m) => m[0] === key)?.[1] ?? key;
  return label.charAt(0).toUpperCase() + label.slice(1);
};

// ------------------------------------------------------------ budgets

interface CheckedBudget {
  budget: Budget;
  baseline: string;
  scenes: Array<{ title: string; value: number; ok: boolean }>;
  missed: number;
}

/**
 * The catalog's budgets checked against a run's summary, as
 * scorecard.mjs `checkBudgets` does against full results: per budget
 * and scene, the configuration's median (or its ratio to the
 * baseline's) against the limit.
 */
function checkBudgets(s: Summary, budgets: Budget[]): CheckedBudget[] {
  const baseline = s.baseline ?? s.configs[0] ?? "1.x";
  return budgets
    .filter((b) => s.configs.includes(b.config))
    .map((budget) => {
      const scenes: CheckedBudget["scenes"] = [];
      for (const cell of s.scenes) {
        const scenario = cell.scenario ?? "cold-orbit";
        if (
          cell.config !== budget.config ||
          (budget.scenes && !budget.scenes.includes(cell.scene)) ||
          (budget.scenario && budget.scenario !== scenario)
        ) {
          continue;
        }
        const median = cell.metrics[budget.metric]?.median;
        if (median === undefined || !Number.isFinite(median)) {
          continue;
        }
        const base = s.scenes.find(
          (c) =>
            c.config === baseline &&
            c.scene === cell.scene &&
            (c.scenario ?? "cold-orbit") === scenario,
        )?.metrics[budget.metric]?.median;
        const value =
          budget.maxRatio !== undefined
            ? base !== undefined && base > 0
              ? median / base
              : undefined
            : median;
        if (value === undefined) {
          continue;
        }
        const limit = budget.maxRatio ?? budget.max ?? Infinity;
        scenes.push({
          title: `${cell.title}${scenario !== "cold-orbit" ? ` · ${scenario}` : ""}`,
          value,
          ok: value <= limit + 1e-9,
        });
      }
      return {
        budget,
        baseline,
        scenes,
        missed: scenes.filter((x) => !x.ok).length,
      };
    });
}

/** A budget's value with its unit ("×0.41", "18 ms", "2"). */
function budgetValue(b: Budget, value: number) {
  if (b.maxRatio !== undefined) {
    return `×${value.toPrecision(2)}`;
  }
  const [, , unit, scale] = metricInfo(b.metric) ?? [b.metric, "", "", 1];
  const v = value / scale;
  const text = v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2);
  return unit ? `${text} ${unit}` : String(Math.round(v * 100) / 100);
}

// ------------------------------------------------------------ to look at

interface AlertGroup {
  id: string;
  metric: string;
  config: string;
  change: number;
  scenes: string[];
  from: { commit: string; run: string };
  to: { commit: string; run: string; date: string };
}
interface ImageReview {
  run: string;
  date?: string;
  checks: Array<{ key: string; title: string; status: string }>;
}

/**
 * Untriaged regressions (grouped by change across scenes, as the shell
 * and the Alerts view count them) and images to review in the latest
 * image check; undefined while loading.
 */
function useAttention(summaries: Summary[]) {
  const [alerts, setAlerts] = useState<AlertGroup[]>();
  const [images, setImages] = useState<ImageReview | null>();
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let triage: Record<string, { status?: string }> = {};
      try {
        const r = await fetch("/bench-results/triage.json");
        triage = r.ok ? await r.json() : {};
      } catch {
        // Nothing triaged yet.
      }
      // Change-point detection takes a moment: after the first paint.
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (cancelled) {
        return;
      }
      const groups = new Map<string, AlertGroup & { changes: number[] }>();
      for (const a of detectAlerts(summaries, ALERT_METRICS)) {
        if (
          a.kind !== "regression" ||
          (triage[a.id]?.status ?? "new") !== "new"
        ) {
          continue;
        }
        const id = `${a.metric}|${a.config}|${a.range.from.commit}|${a.range.to.commit}`;
        const g = groups.get(id) ?? {
          id,
          metric: a.metric,
          config: a.config,
          change: 1,
          changes: [],
          scenes: [],
          from: { commit: a.range.from.commit, run: a.range.from.run },
          to: {
            commit: a.range.to.commit,
            run: a.range.to.run,
            date: a.range.to.date,
          },
        };
        g.changes.push(a.change);
        g.scenes.push(a.title);
        groups.set(id, g);
      }
      if (!cancelled) {
        setAlerts(
          [...groups.values()].map(({ changes, ...g }) => ({
            ...g,
            change: geomean(changes) ?? 1,
          })),
        );
      }
    })();
    void (async () => {
      try {
        const list = await (
          await fetch("/bench-results/images/index.json")
        ).json();
        const run = list.runs?.[0] as string | undefined;
        if (!run) {
          throw new Error("no image checks");
        }
        const data = await (await fetch(`/bench-results/images/${run}`)).json();
        const checks = (
          data.checks as Array<{
            key: string;
            title?: string;
            status: string;
            approved?: boolean;
            review?: unknown;
          }>
        )
          .filter(
            (c) =>
              (c.status === "changed" || c.status === "new") &&
              !c.approved &&
              !c.review,
          )
          .map((c) => ({
            key: c.key,
            title: c.title ?? c.key,
            status: c.status,
          }));
        if (!cancelled) {
          setImages({ run, date: data.date, checks });
        }
      } catch {
        if (!cancelled) {
          setImages(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [summaries]);
  return { alerts, images };
}

// ------------------------------------------------------------ view

export function Overview() {
  const { summaries } = useRuns();
  const plain = useMemo(() => summaries.filter((s) => !s.sweep), [summaries]);
  const latest = plain.at(-1) ?? summaries.at(-1);
  const previous = plain.at(-2);
  const recent = useMemo(
    () => [...summaries].reverse().slice(0, 5),
    [summaries],
  );
  const { alerts, images } = useAttention(summaries);

  const tiles = useMemo(
    () =>
      latest
        ? HEADLINES.map((h) => {
            const changes = sceneChanges(latest, h.key, { intervals: true });
            return {
              ...h,
              ratio: geomean(changes.map((c) => c.value)),
              scenes: changes.length,
              better: changes.filter((c) => c.separated && c.value < 1).length,
              worse: changes.filter((c) => c.separated && c.value > 1).length,
              before: previous ? headline(previous, h.key).ratio : undefined,
            };
          })
        : [],
    [latest, previous],
  );
  const budgets = useMemo(
    () => (latest ? checkBudgets(latest, catalog.budgets ?? []) : []),
    [latest],
  );
  const invalid = useMemo(
    () =>
      [...summaries]
        .reverse()
        .slice(0, 10)
        .filter((s) => (s.validity?.invalid ?? 0) > 0),
    [summaries],
  );

  if (!latest) {
    return null;
  }
  const { base, cand } = pairOf(latest);
  const run = latest.name;

  return (
    <Page
      title="Overview"
      description="Where 2.0 stands against 1.x in the latest run, and what needs a look."
      help={
        <>
          <p>
            The headline numbers come from the latest run that isn't a sweep:
            its candidate configuration over its baseline, per scene, as a
            geometric mean across scenes. Hover a number for the raw ratio.
          </p>
          <p>
            Better and worse count scenes whose 95% interval excludes no change.
            Budgets are the catalog's limits (plan §5).
          </p>
        </>
      }
      actions={
        <>
          {previous && (
            <Button
              variant="outlined"
              nativeButton={false}
              render={
                <RouterLink
                  to="/compare"
                  search={{ a: previous.name, b: run }}
                />
              }
            >
              Compare with previous run
            </Button>
          )}
          <Button
            color="primary"
            nativeButton={false}
            render={<RouterLink to="/runs/$run" params={{ run }} />}
          >
            Open report
          </Button>
        </>
      }
    >
      <div className="res-run-line">
        <VerdictStatus verdict={verdictOf(latest)} />
        <ValidityStatus s={latest} />
        <Typography variant="body-sm" color="textSecondary" render={<p />}>
          Latest run{" "}
          <Link render={<RouterLink to="/runs/$run" params={{ run }} />}>
            {dateOf(latest)}
          </Link>{" "}
          · <span className="res-mono">{short(latest)}</span>
          {latest.note || latest.subject
            ? ` · ${latest.note || latest.subject}`
            : ""}{" "}
          · {latest.hardware} · {plural(sceneCount(latest), "scene")} ×{" "}
          {plural(latest.repetitions, "rep")}
        </Typography>
      </div>

      {!cand && (
        <Alert severity="info" className="res-gap">
          The latest run measured only {base}. Run 1.x and 2.0 together to
          compare them.
        </Alert>
      )}

      <ul
        className="res-tiles"
        aria-label={`${cand ?? "Candidate"} against ${base}`}
      >
        {tiles.map((t) => {
          const c = formatChange(t.ratio, { noun: t.noun });
          return (
            <li key={t.key}>
              <RouterLink
                to="/runs/$run"
                params={{ run }}
                className="res-tile"
                aria-label={`${t.label}: ${c.text}. Open the run's report.`}
              >
                <Typography variant="caption-lg" color="textSecondary">
                  {t.label}
                </Typography>
                <span
                  className={`res-tile-value ${c.tone}`}
                  title={
                    t.ratio
                      ? `×${t.ratio.toPrecision(2)}, geometric mean of ${t.scenes} scenes`
                      : undefined
                  }
                >
                  {c.text}
                </span>
                <Typography variant="caption-md" color="textSecondary">
                  {t.scenes
                    ? `${t.better} better, ${t.worse} worse of ${plural(t.scenes, "scene")}`
                    : "Not measured"}
                </Typography>
                {t.before !== undefined && (
                  <Typography variant="caption-md" color="textTertiary">
                    Previous run:{" "}
                    {formatChange(t.before, { noun: t.noun }).text}
                  </Typography>
                )}
              </RouterLink>
            </li>
          );
        })}
      </ul>
      <Typography
        variant="caption-md"
        color="textTertiary"
        render={<p />}
        className="res-tiles-note"
      >
        {cand ?? "Candidate"} against {base}, geometric mean across scenes.
      </Typography>

      <div className="res-columns">
        <Section
          title="Budgets"
          description={
            budgets.length
              ? `${budgets.filter((b) => b.missed === 0 && b.scenes.length).length} of ${budgets.length} met`
              : undefined
          }
        >
          {budgets.length ? (
            <Table size="small" className="res-table">
              <TableHead>
                <TableRow>
                  <TableCell>Budget</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Over the limit</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {budgets.map((b) => {
                  const over = b.scenes
                    .filter((x) => !x.ok)
                    .sort((x, y) => y.value - x.value);
                  const limit = b.budget.maxRatio ?? b.budget.max;
                  return (
                    <TableRow key={b.budget.id}>
                      <TableCell render={<th scope="row" />}>
                        {b.budget.label}
                        <Typography
                          variant="caption-md"
                          color="textSecondary"
                          render={<div />}
                        >
                          {b.budget.config}
                          {b.budget.maxRatio !== undefined
                            ? ` vs ${b.baseline}`
                            : ""}
                          {limit !== undefined
                            ? ` · limit ${budgetValue(b.budget, limit)}`
                            : ""}
                        </Typography>
                      </TableCell>
                      <TableCell className="res-nowrap">
                        {!b.scenes.length ? (
                          <Status tone="secondary">Not measured</Status>
                        ) : b.missed ? (
                          <Status tone="error">
                            Missed in {b.missed} of {b.scenes.length}
                          </Status>
                        ) : (
                          <Status tone="success">
                            {b.scenes.length === 1
                              ? "Met"
                              : `Met in all ${b.scenes.length}`}
                          </Status>
                        )}
                      </TableCell>
                      <TableCell className="res-over">
                        {over.length
                          ? over
                              .slice(0, 3)
                              .map(
                                (x) =>
                                  `${x.title} ${budgetValue(b.budget, x.value)}`,
                              )
                              .join(" · ") + (over.length > 3 ? " …" : "")
                          : "–"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <Typography variant="body-sm" color="textSecondary" render={<p />}>
              No catalog budget applies to this run's configurations (
              {latest.configs.join(", ")}). Budgets name the configuration they
              hold for, such as 2.0.
            </Typography>
          )}
        </Section>

        <Section title="To look at">
          <ToLookAt
            alerts={alerts}
            images={images}
            invalid={invalid}
            fewRuns={plain.length < 6}
          />
        </Section>
      </div>

      <Section
        title="Recent runs"
        actions={<Link render={<RouterLink to="/runs" />}>All runs</Link>}
      >
        <Table size="small" className="res-table">
          <TableHead>
            <TableRow>
              <TableCell>When</TableCell>
              <TableCell>Note</TableCell>
              <TableCell>Verdict</TableCell>
              <TableCell align="right">CPU per frame</TableCell>
              <TableCell align="right">Time to settle</TableCell>
              <TableCell align="right">Frame p95</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {recent.map((s) => (
              <TableRow key={s.name}>
                <TableCell render={<th scope="row" />} className="res-nowrap">
                  <Link
                    render={
                      <RouterLink to="/runs/$run" params={{ run: s.name }} />
                    }
                    title={s.date}
                  >
                    {dateOf(s)}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="res-clamp">
                    {s.note || s.subject || "No note"}
                  </div>
                  <Typography variant="caption-md" color="textSecondary">
                    <span className="res-mono">{short(s)}</span>
                  </Typography>
                </TableCell>
                <TableCell className="res-nowrap">
                  {s.sweep ? (
                    <Status tone="info">Sweep</Status>
                  ) : (
                    <VerdictStatus verdict={verdictOf(s)} />
                  )}
                </TableCell>
                {["cpuP50", "settleMs", "frameP95"].map((key) => {
                  const h = headline(s, key);
                  return (
                    <TableCell key={key} align="right" className="num">
                      <Change
                        ratio={h.ratio}
                        detail={`geometric mean of ${plural(h.scenes, "scene")}`}
                      />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>
    </Page>
  );
}

function ToLookAt({
  alerts,
  images,
  invalid,
  fewRuns,
}: {
  alerts: AlertGroup[] | undefined;
  images: ImageReview | null | undefined;
  invalid: Summary[];
  /** Too few runs for change points: say alerts are still to come. */
  fewRuns: boolean;
}) {
  const loading = alerts === undefined || images === undefined;
  const reviews = images?.checks ?? [];
  const nothing =
    !loading && !alerts.length && !reviews.length && !invalid.length;
  return (
    <ul className="res-todo">
      {alerts?.slice(0, 5).map((a) => {
        const c = formatChange(a.change, { noun: NOUNS[a.metric] });
        return (
          <li key={a.id}>
            <Status tone="error">Regression</Status>
            <div>
              <Link render={<RouterLink to="/alerts" />}>
                {metricName(a.metric)} {c.text} in {a.config}
              </Link>
              <Typography
                variant="caption-md"
                color="textSecondary"
                render={<div />}
              >
                {a.scenes.length === 1
                  ? a.scenes[0]
                  : plural(a.scenes.length, "scene")}{" "}
                · between{" "}
                <span className="res-mono">{a.from.commit.slice(0, 7)}</span>{" "}
                and <span className="res-mono">{a.to.commit.slice(0, 7)}</span>{" "}
                ·{" "}
                <Link
                  render={
                    <RouterLink
                      to="/compare"
                      search={{ a: a.from.run, b: a.to.run, config: a.config }}
                    />
                  }
                >
                  Compare runs
                </Link>
              </Typography>
            </div>
          </li>
        );
      })}
      {alerts && alerts.length > 5 && (
        <li>
          <span />
          <Link render={<RouterLink to="/alerts" />}>
            {alerts.length - 5} more regressions to triage
          </Link>
        </li>
      )}
      {images && reviews.length > 0 && (
        <li>
          <Status tone="warning">Review</Status>
          <div>
            <Link
              render={<RouterLink to="/images" search={{ run: images.run }} />}
            >
              {reviews.length === 1
                ? "1 image changed or new"
                : `${reviews.length} images changed or new`}
            </Link>
            <Typography
              variant="caption-md"
              color="textSecondary"
              render={<div />}
            >
              {reviews.slice(0, 4).map((c, i) => (
                <span key={c.key}>
                  {i > 0 && " · "}
                  <Link
                    render={
                      <RouterLink
                        to="/images"
                        search={{ run: images.run, check: c.key }}
                      />
                    }
                  >
                    {c.title}
                  </Link>{" "}
                  ({c.status})
                </span>
              ))}
              {reviews.length > 4 ? " …" : ""}
            </Typography>
          </div>
        </li>
      )}
      {invalid.map((s) => (
        <li key={s.name}>
          <Status tone="error">Invalid</Status>
          <div>
            <Link
              render={<RouterLink to="/runs/$run" params={{ run: s.name }} />}
            >
              Run of {dateOf(s)}
            </Link>
            <Typography
              variant="caption-md"
              color="textSecondary"
              render={<div />}
            >
              {s.validity!.invalid} of{" "}
              {s.validity!.valid + s.validity!.warning + s.validity!.invalid}{" "}
              measurements invalid
              {validityOf(s) === "invalid" ? ", none valid" : ""}
              {s.note ? ` · ${s.note}` : ""}
            </Typography>
          </div>
        </li>
      ))}
      {loading && (
        <li className="res-todo-loading" role="status">
          <CircularProgress size={16} />
          <Typography variant="body-sm" color="textSecondary">
            Checking for regressions and image changes…
          </Typography>
        </li>
      )}
      {nothing && (
        <li>
          <Status tone="success">All clear</Status>
          <Typography variant="body-sm" color="textSecondary">
            No untriaged regressions, images to review or invalid runs.
            {fewRuns
              ? " Regression alerts start after about six runs of a scene."
              : ""}
          </Typography>
        </li>
      )}
    </ul>
  );
}
