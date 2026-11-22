import "./analysis.css";
import { Button, Link, Typography } from "@mui/material";
import {
  getRouteApi,
  Link as RouterLink,
  useNavigate,
} from "@tanstack/react-router";
import { useMemo } from "react";
import { lineChart } from "../charts.mjs";
import { engineLabel } from "../engines.mjs";
import { axisOf, type SweepAxis } from "./sweepAxis.ts";
import {
  cellKey,
  cellTitle,
  geomean,
  metricInfo,
  type Summary,
  when,
} from "../data.ts";
import {
  Chart,
  Choice,
  Empty,
  Page,
  Section,
  Toolbar,
  useRuns,
} from "./common.tsx";

/**
 * Dyno's Analysis (DESIGN.md, Experiment): sweeps. A run that varied one
 * parameter (`cli.mjs run --sweep`) or ran several CesiumJS releases
 * (`--releases`), each metric against the parameter's values, one line
 * per swept configuration, the baseline as a dashed reference. Studies
 * replace this page (CS-405); Machines moved into the Overview.
 */

const route = getRouteApi("/_runs/analysis");
const ALL = "*";

/** Metric names for chart titles and columns (sentence case, units implied). */
const NAMES: Record<string, string> = {
  cpuP50: "CPU time per frame",
  gpuP50: "GPU time per frame",
  frameP95: "Frame time, 95th percentile",
  settleMs: "Time to settle",
  bytes: "Bytes downloaded",
  heapBytes: "JS heap",
  bufferBytes: "Buffers",
  flipEnd: "Image difference (FLIP)",
  motionFlip: "Quality in motion (FLIP)",
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
  ["Loading and memory", ["settleMs", "bytes", "heapBytes", "bufferBytes"]],
  ["Image", ["flipEnd", "motionFlip"]],
];

export function Analysis() {
  return (
    <Page
      title="Analysis"
      description="What a parameter or a CesiumJS release does to every metric."
      help={
        <p>
          A run that varied one parameter runs each configuration once per value
          (<code>--sweep maximumScreenSpaceError=8,16,32</code>); a run of
          several 1.x releases (<code>--releases 1.120.0..1.146.0</code>) sweeps
          the release. Each chart is one metric against the values. How each
          machine compares is on the{" "}
          <Link render={<RouterLink to="/overview" hash="machines" />}>
            Overview
          </Link>
          .
        </p>
      }
    >
      <Sweeps />
    </Page>
  );
}

// ------------------------------------------------------------ sweeps

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
    const { xNames } = axis;
    for (const [, metrics] of SWEEP_GROUPS) {
      for (const metric of metrics) {
        const [, , unit, scale] = metricInfo(metric);
        const series = axis.lines.map((line, i) => ({
          label: line.label,
          color: `var(--series-${Math.min(4, i + 2)})`,
          points: line.configs.map((config, x) => {
            const v = config === undefined ? undefined : value(config, metric);
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
                      label: engineLabel(axis.baseline!),
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
          node bench/suite/cli.mjs run --sweep maximumScreenSpaceError=8,16,32
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
        {axis.param} at {listOf(axis.xNames)} on{" "}
        {listOf(axis.lines.map((l) => l.label))}
        {axis.baseline
          ? `, against ${engineLabel(axis.baseline)} (dashed)`
          : ""}
        . Each point is{" "}
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
