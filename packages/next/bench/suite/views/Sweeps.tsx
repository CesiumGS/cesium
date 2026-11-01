import { Grid } from "@radix-ui/themes";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { lineChart } from "../charts.mjs";
import {
  cellKey,
  cellTitle,
  geomean,
  metricInfo,
  type Summary,
} from "../data.ts";
import {
  Chart,
  Choice,
  Empty,
  Field,
  Lede,
  Toolbar,
  useRuns,
} from "./common.tsx";

/**
 * Dyno's Sweeps view (plan §16.9, Explore): a run that varied one
 * parameter (`cli.mjs run --sweep`) or ran several CesiumJS releases
 * (`--releases`), each metric against the parameter's values, one line
 * per swept configuration, with the baseline as a reference line.
 */

/** The headline metrics, and image quality: what a cheaper setting gives up. */
const KEYS = [
  "cpuP50",
  "gpuP50",
  "frameP95",
  "settleMs",
  "bytes",
  "heapBytes",
  "flipEnd",
];
const ALL = "*";

const route = getRouteApi("/sweeps");

interface SweepAxis {
  param: string;
  /** Per value (in order): the configuration ids that ran it. */
  points: Array<{ label: string; configs: string[] }>;
  lines: string[];
  baseline?: string;
}

interface Sweep {
  param: string;
  values: Array<string | number>;
  configs: string[];
}

/** The axis a run swept, if any: a parameter, or CesiumJS releases. */
function axisOf(s: Summary): SweepAxis | undefined {
  const sweep = s.sweep as Sweep | undefined;
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

export function Sweeps() {
  const { summaries } = useRuns();
  const search = route.useSearch();
  const navigate = useNavigate({ from: "/sweeps" });
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
    if (!picked) {
      return [];
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
    return KEYS.map((metric) => {
      const [, name, unit, scale] = metricInfo(metric);
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
      return {
        metric,
        html: lineChart({
          title: name,
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
      };
    });
  }, [picked, scene]);

  if (!picked) {
    return (
      <Empty title="No sweeps yet.">
        Run <code>cli.mjs run --sweep maximumScreenSpaceError=8,16,32</code> (or{" "}
        <code>render.pixelRatio=1,2</code>,{" "}
        <code>policy=budgeted,legacy1x</code>), or sweep releases with{" "}
        <code>--releases 1.120.0..1.146.0</code>.
      </Empty>
    );
  }
  const { s, axis } = picked;

  return (
    <div className="sweeps">
      <Toolbar>
        <Field label="Sweep">
          <Choice
            value={s.name}
            options={sweeps.map(
              (x) =>
                [
                  x.s.name,
                  `${new Date(x.s.date).toLocaleString()} · ${x.axis.param} · ${x.s.note || x.s.subject || ""}`,
                ] as const,
            )}
            onChange={(sweep) =>
              navigate({
                search: (prev) => ({ ...prev, sweep, scene: undefined }),
                replace: true,
              })
            }
          />
        </Field>
        <Field label="Scene">
          <Choice
            value={scene}
            options={[
              [ALL, "All scenes (geometric mean)"] as const,
              ...keys.map(
                (k) =>
                  [
                    k,
                    cellTitle(s.scenes.find((c) => cellKey(c) === k)!),
                  ] as const,
              ),
            ]}
            onChange={(k) =>
              navigate({
                search: (prev) => ({
                  ...prev,
                  scene: k === ALL ? undefined : k,
                }),
                replace: true,
              })
            }
          />
        </Field>
      </Toolbar>
      <Lede>
        Each metric against {axis.param};{" "}
        {scene === ALL
          ? "the geometric mean over scenes"
          : "this scene's median"}{" "}
        per value
        {axis.baseline ? `, with ${axis.baseline} as the dashed reference` : ""}
        .
      </Lede>
      <Grid columns="repeat(auto-fill, minmax(380px, 1fr))" gap="3">
        {charts.map((c) => (
          <Chart key={c.metric} html={c.html} />
        ))}
      </Grid>
    </div>
  );
}
