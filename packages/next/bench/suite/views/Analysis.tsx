import "./analysis.css";
import {
  Button,
  Link,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  getRouteApi,
  Link as RouterLink,
  useNavigate,
} from "@tanstack/react-router";
import { useId, useMemo } from "react";
import { lineChart } from "../charts.mjs";
import {
  cellKey,
  cellTitle,
  geomean,
  metricInfo,
  type Summary,
  when,
} from "../data.ts";
import { ratio } from "../stats.mjs";
import {
  Chart,
  Choice,
  Empty,
  formatChange,
  Page,
  Section,
  Toolbar,
  useRuns,
} from "./common.tsx";

/**
 * Dyno's Analysis (DESIGN.md, Workbench): two tabs. Sweeps: a run that
 * varied one parameter (`cli.mjs run --sweep`) or ran several CesiumJS
 * releases (`--releases`), each metric against the parameter's values,
 * one line per swept configuration, the baseline as a dashed reference.
 * Machines: the latest ordinary run on each machine, candidate against
 * baseline per headline metric.
 */

const route = getRouteApi("/analysis");
const ALL = "*";

/** Metric names for chart titles and columns (sentence case, units implied). */
const NAMES: Record<string, string> = {
  cpuP50: "CPU time per frame",
  gpuP50: "GPU time per frame",
  frameP95: "Frame time, 95th percentile",
  settleMs: "Time to settle",
  bytes: "Bytes downloaded",
  heapBytes: "JS heap",
  flipEnd: "Image difference (FLIP)",
};
const nameOf = (metric: string) => NAMES[metric] ?? metricInfo(metric)[1];
/** "a", "a and b", "a, b and c". */
const listOf = (items: string[]) =>
  items.length < 2
    ? (items[0] ?? "")
    : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;

/** The sweep's charts, grouped as people read them. */
const SWEEP_GROUPS: Array<[string, string[]]> = [
  ["Frame time", ["cpuP50", "gpuP50", "frameP95"]],
  ["Loading and memory", ["settleMs", "bytes", "heapBytes"]],
  ["Image", ["flipEnd"]],
];

/** Shorter column headings for the machines table. */
const COLUMN_NAMES: Record<string, string> = {
  cpuP50: "CPU per frame",
  gpuP50: "GPU per frame",
  frameP95: "Frame time p95",
  bytes: "Bytes",
};
/** "Edge 155" from "Microsoft Edge 155.0.4283.62". */
const browserOf = (s: Summary) =>
  s.browser?.replace(/^Microsoft /, "").replace(/(\d+)(\.\d+)+$/, "$1");

/** The machines table's metrics, and how each one's change reads. */
const MACHINE_METRICS: Array<[string, string | undefined]> = [
  ["cpuP50", undefined],
  ["gpuP50", undefined],
  ["frameP95", undefined],
  ["settleMs", undefined],
  ["bytes", "data"],
  ["heapBytes", "memory"],
];

export function Analysis() {
  const search = route.useSearch();
  const navigate = useNavigate({ from: "/analysis" });
  const id = useId();
  const tab = search.tab ?? "sweeps";
  return (
    <Page
      title="Analysis"
      description="What a parameter or a CesiumJS release does to every metric, and how each machine compares."
      help={
        <>
          <p>
            <b>Sweeps</b>: a run that varied one parameter runs each
            configuration once per value (
            <code>--sweep maximumScreenSpaceError=8,16,32</code>); a run of
            several 1.x releases (<code>--releases 1.120.0..1.146.0</code>)
            sweeps the release. Each chart is one metric against the values.
          </p>
          <p>
            <b>Machines</b>: the same comparison on each machine the suite ran
            on. How each engine scales across GPUs shows where it is bound.
          </p>
        </>
      }
    >
      <Tabs
        value={tab}
        size="small"
        className="analysis-tabs"
        onChange={(_, next: string) =>
          void navigate({
            search: (prev) => ({
              ...prev,
              tab: next === "machines" ? ("machines" as const) : undefined,
            }),
          })
        }
      >
        <Tab
          value="sweeps"
          label="Sweeps"
          id={`${id}-sweeps`}
          aria-controls={`${id}-panel`}
        />
        <Tab
          value="machines"
          label="Machines"
          id={`${id}-machines`}
          aria-controls={`${id}-panel`}
        />
      </Tabs>
      <div
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-${tab}`}
        className="analysis-panel"
      >
        {tab === "machines" ? <Machines /> : <Sweeps />}
      </div>
    </Page>
  );
}

// ------------------------------------------------------------ sweeps

interface SweepAxis {
  param: string;
  /** Per value (in order): the configuration ids that ran it. */
  points: Array<{ label: string; configs: string[] }>;
  lines: string[];
  baseline?: string;
}

interface SweepInfo {
  param: string;
  values: Array<string | number>;
  configs: string[];
}

/** The axis a run swept, if any: a parameter, or CesiumJS releases. */
function axisOf(s: Summary): SweepAxis | undefined {
  const sweep = s.sweep as SweepInfo | undefined;
  if (sweep) {
    return {
      param: sweep.param,
      points: sweep.values.map((v) => ({
        label: String(v),
        configs: sweep.configs.map((c) => `${c}[${sweep.param}=${v}]`),
      })),
      lines: sweep.configs,
      baseline: s.baseline,
    };
  }
  const releases = s.configs
    .filter((c) => /^1\.x@\d+\.\d+\.\d+$/.test(c))
    .sort((a, b) => {
      const k = (c: string) => c.slice(4).split(".").map(Number);
      const [x, y] = [k(a), k(b)];
      return x[0]! - y[0]! || x[1]! - y[1]! || x[2]! - y[2]!;
    });
  if (releases.length >= 2) {
    return {
      param: "CesiumJS release",
      points: releases.map((c) => ({ label: c.slice(4), configs: [c] })),
      lines: ["1.x"],
      baseline: s.configs.includes("2.0") ? "2.0" : undefined,
    };
  }
  return undefined;
}

function Sweeps() {
  const { summaries } = useRuns();
  const search = route.useSearch();
  const navigate = useNavigate({ from: "/analysis" });
  // Newest first.
  const sweeps = useMemo(
    () =>
      summaries
        .map((s) => ({ s, axis: axisOf(s) }))
        .filter((x): x is { s: Summary; axis: SweepAxis } => !!x.axis)
        .reverse(),
    [summaries],
  );
  const picked = sweeps.find((x) => x.s.name === search.sweep) ?? sweeps[0];
  const keys = useMemo(
    () => (picked ? [...new Set(picked.s.scenes.map(cellKey))] : []),
    [picked],
  );
  const scene =
    search.scene && keys.includes(search.scene) ? search.scene : ALL;

  const charts = useMemo(() => {
    const out = new Map<string, string>();
    if (!picked) {
      return out;
    }
    const { s, axis } = picked;
    const value = (config: string, metric: string) => {
      const medians = s.scenes
        .filter(
          (c) => c.config === config && (scene === ALL || cellKey(c) === scene),
        )
        .map((c) => c.metrics[metric]?.median)
        .filter((v): v is number => Number.isFinite(v) && v! > 0);
      return scene === ALL ? geomean(medians) : medians[0];
    };
    const xNames = axis.points.map((p) => p.label);
    for (const [, metrics] of SWEEP_GROUPS) {
      for (const metric of metrics) {
        const [, , unit, scale] = metricInfo(metric);
        const series = axis.lines.map((line, i) => ({
          label: line,
          color: `var(--series-${Math.min(4, i + 2)})`,
          points: axis.points.map((p, x) => {
            const config =
              p.configs.find((c) => c.startsWith(line)) ?? p.configs[0]!;
            const v = value(config, metric);
            return [x, v === undefined ? null : v / scale] as [
              number,
              number | null,
            ];
          }),
        }));
        const base = axis.baseline ? value(axis.baseline, metric) : undefined;
        out.set(
          metric,
          lineChart({
            title: nameOf(metric),
            xLabel: axis.param,
            unit,
            xNames,
            series,
            refs:
              base !== undefined
                ? [
                    {
                      y: base / scale,
                      label: axis.baseline,
                      color: "var(--series-1)",
                      dash: "6 4",
                    },
                  ]
                : [],
            width: 520,
            height: 170,
          }),
        );
      }
    }
    return out;
  }, [picked, scene]);

  if (!picked) {
    return (
      <Empty title="No sweeps yet">
        A sweep runs each configuration once per value of a parameter. From the
        repository root, run{" "}
        <code>
          node packages/next/bench/suite/cli.mjs run --sweep
          maximumScreenSpaceError=8,16,32
        </code>
        , or compare 1.x releases with <code>--releases 1.120.0..1.146.0</code>.
      </Empty>
    );
  }
  const { s, axis } = picked;
  const sceneCount = keys.length;

  return (
    <>
      <Toolbar>
        <Choice
          label="Sweep"
          minWidth={320}
          value={s.name}
          options={sweeps.map(
            (x) =>
              [
                x.s.name,
                `${when(x.s)} · ${x.axis.param}${x.s.note ? ` · ${x.s.note}` : ""}`,
              ] as const,
          )}
          onChange={(sweep) =>
            void navigate({
              search: (prev) => ({ ...prev, sweep, scene: undefined }),
              replace: true,
            })
          }
        />
        <Choice
          label="Scene"
          minWidth={240}
          value={scene}
          options={[
            [ALL, `All ${sceneCount} scenes (geometric mean)`] as const,
            ...keys.map(
              (k) =>
                [
                  k,
                  cellTitle(s.scenes.find((c) => cellKey(c) === k)!),
                ] as const,
            ),
          ]}
          onChange={(k) =>
            void navigate({
              search: (prev) => ({
                ...prev,
                scene: k === ALL ? undefined : k,
              }),
              replace: true,
            })
          }
        />
        <Button
          variant="outlined"
          size="small"
          className="analysis-toolbar-end"
          render={<RouterLink to="/runs/$run" params={{ run: s.name }} />}
          nativeButton={false}
        >
          Open the run's report
        </Button>
      </Toolbar>
      <Typography
        variant="body-sm"
        color="textSecondary"
        render={<p />}
        className="analysis-note"
      >
        {axis.param} at {listOf(axis.points.map((p) => p.label))} on{" "}
        {listOf(axis.lines)}
        {axis.baseline ? `, against ${axis.baseline} (dashed)` : ""}. Each point
        is{" "}
        {scene === ALL
          ? `the geometric mean over ${sceneCount} scenes`
          : "this scene's median"}
        .
      </Typography>
      {SWEEP_GROUPS.map(([title, metrics]) => (
        <Section key={title} title={title}>
          <div className="analysis-charts">
            {metrics.map((m) => (
              <Chart
                key={m}
                html={charts.get(m) ?? ""}
                className="analysis-chart"
              />
            ))}
          </div>
        </Section>
      ))}
    </>
  );
}

// ------------------------------------------------------------ machines

function Machines() {
  const { summaries } = useRuns();
  const rows = useMemo(() => {
    // Sweeps vary the configurations; compare ordinary runs only.
    const plain = summaries.filter((s) => !s.sweep);
    const machines = [...new Set(plain.map((s) => s.hardware))];
    return machines.map((h) => {
      const s = plain.findLast((x) => x.hardware === h)!;
      const base = s.baseline ?? s.configs[0]!;
      const cand = s.candidate ?? s.configs.find((c) => c !== base) ?? base;
      const ratios = MACHINE_METRICS.map(([metric]) => {
        const values: number[] = [];
        for (const c of s.scenes.filter((x) => x.config === cand)) {
          const b = s.scenes.find(
            (x) => x.config === base && cellKey(x) === cellKey(c),
          );
          const r =
            b &&
            ratio(
              b.metrics[metric]?.values ?? [],
              c.metrics[metric]?.values ?? [],
            );
          if (r?.value) {
            values.push(r.value);
          }
        }
        return geomean(values);
      });
      return {
        s,
        base,
        cand,
        ratios,
        runs: summaries.filter((x) => x.hardware === h).length,
      };
    });
  }, [summaries]);

  if (!rows.length) {
    return (
      <Empty title="No runs to compare yet">
        Machines compare ordinary runs (a sweep varies the configurations, so it
        doesn't count). On each machine, run{" "}
        <code>node packages/next/bench/suite/cli.mjs run</code>.
      </Empty>
    );
  }

  return (
    <>
      <Typography
        variant="body-sm"
        color="textSecondary"
        render={<p />}
        className="analysis-note"
      >
        The latest run on each machine: the candidate against the baseline,
        geometric mean over scenes.
        {rows.length === 1 &&
          " One machine so far; runs from others appear here once their results are in the results directory."}
      </Typography>
      <div className="analysis-table">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Machine</TableCell>
              <TableCell>Latest run</TableCell>
              {MACHINE_METRICS.map(([k]) => (
                <TableCell key={k} className="num">
                  {COLUMN_NAMES[k] ?? nameOf(k)}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(({ s, base, cand, ratios, runs }) => (
              <TableRow key={s.hardware}>
                <TableCell render={<th scope="row" />}>
                  <Typography variant="body-md" className="analysis-machine">
                    {s.hardware}
                  </Typography>
                  <Typography variant="caption-md" color="textSecondary">
                    {[browserOf(s), `${runs} ${runs === 1 ? "run" : "runs"}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Link
                    render={
                      <RouterLink to="/runs/$run" params={{ run: s.name }} />
                    }
                    className="analysis-nowrap"
                  >
                    {when(s)}
                  </Link>
                  <Typography
                    variant="caption-md"
                    color="textSecondary"
                    className="analysis-block"
                  >
                    {cand} against {base}
                  </Typography>
                </TableCell>
                {ratios.map((g, i) => {
                  const [metric, noun] = MACHINE_METRICS[i]!;
                  const change = formatChange(g, { noun });
                  return (
                    <TableCell key={metric} className="num">
                      {g === undefined ? (
                        <span className="none">–</span>
                      ) : (
                        <Tooltip
                          title={`×${g.toFixed(2)} (${cand} / ${base})`}
                          describeChild
                        >
                          <span className={change.tone}>{change.text}</span>
                        </Tooltip>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
