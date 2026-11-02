import "./results.css";
import { Alert, AlertTitle, IconButton, Link, Typography } from "@mui/material";
import { svgSwap } from "@stratakit/icons/swap";
import { Icon } from "@stratakit/mui";
import { getRouteApi, Link as RouterLink } from "@tanstack/react-router";
import { useMemo } from "react";
import { forestPlot } from "../charts.mjs";
import { METRICS } from "../report.mjs";
import { ratio } from "../stats.mjs";
import { cellKey, cellTitle, geomean, metricInfo } from "../data.ts";
import { engineLabel } from "../engines.mjs";
import {
  Chart,
  Chips,
  Choice,
  Empty,
  formatChange,
  Page,
  useRuns,
  useStored,
} from "./common.tsx";
import { HEADLINES, runOption } from "./runParts.tsx";

/**
 * Compare (DESIGN.md): two runs per scene, the commit-to-commit view,
 * reached from Runs (two selected), an alert or a link. One
 * configuration's candidate run over its baseline run, a forest plot per
 * metric with the geometric mean in words above it. Defaults to the two
 * latest ordinary runs (sweeps vary the configurations); warns when the
 * machines or render settings differ.
 */

const route = getRouteApi("/compare");
const DEFAULT_METRICS = [
  "settleMs",
  "cpuP50",
  "frameP95",
  "bytes",
  "heapBytes",
  "bufferBytes",
];
const NOUNS: Record<string, string> = {
  bytes: "data",
  heapBytes: "memory",
  bufferBytes: "memory",
  requests: "requests",
  over100: "hitches",
  over33: "slow frames",
  longFrames: "long frames",
};
const metricName = (key: string) => {
  const h = HEADLINES.find((x) => x.key === key);
  if (h) {
    return h.label;
  }
  const label = metricInfo(key)?.[1] ?? key;
  return label.charAt(0).toUpperCase() + label.slice(1);
};

export function Compare() {
  const { summaries } = useRuns();
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const [metrics, setMetrics] = useStored<string[]>(
    "bench.metrics",
    DEFAULT_METRICS,
  );

  const newestFirst = useMemo(() => [...summaries].reverse(), [summaries]);
  const plain = newestFirst.filter((s) => !s.sweep);
  const exists = (n: string | undefined) =>
    n !== undefined && summaries.some((s) => s.name === n);
  const a = exists(search.a) ? search.a! : (plain[1] ?? newestFirst[1])?.name;
  const b = exists(search.b) ? search.b! : (plain[0] ?? newestFirst[0])?.name;
  const sa = summaries.find((s) => s.name === a);
  const sb = summaries.find((s) => s.name === b);

  // Configurations both runs have (falling back to either run's).
  const both = (sa?.configs ?? []).filter((c) => sb?.configs.includes(c));
  const configs = both.length
    ? both
    : [...new Set([...(sa?.configs ?? []), ...(sb?.configs ?? [])])];
  const config =
    search.config && configs.includes(search.config)
      ? search.config
      : sb?.candidate && configs.includes(sb.candidate)
        ? sb.candidate
        : (configs.at(-1) ?? "");

  // Scenes of this configuration in each run: compared where both have them.
  const scenes = useMemo(() => {
    const of = (s: typeof sa) =>
      new Map(
        (s?.scenes ?? [])
          .filter((c) => c.config === config)
          .map((c) => [cellKey(c), cellTitle(c)] as const),
      );
    const inA = of(sa);
    const inB = of(sb);
    return {
      both: [...inB.keys()].filter((k) => inA.has(k)),
      onlyA: [...inA].filter(([k]) => !inB.has(k)).map(([, t]) => t),
      onlyB: [...inB].filter(([k]) => !inA.has(k)).map(([, t]) => t),
    };
  }, [sa, sb, config]);

  const charts = useMemo(() => {
    if (!sa || !sb || !scenes.both.length) {
      return [];
    }
    const sceneIds = scenes.both;
    // In the order of the metric list, not the order they were picked.
    return METRICS.filter(([key]) => metrics.includes(key)).map(([key]) => {
      const rows = sceneIds.map((id) => {
        const ca = sa.scenes.find(
          (c) => cellKey(c) === id && c.config === config,
        );
        const cb = sb.scenes.find(
          (c) => cellKey(c) === id && c.config === config,
        );
        const r =
          ca && cb
            ? ratio(
                ca.metrics[key]?.values ?? [],
                cb.metrics[key]?.values ?? [],
              )
            : undefined;
        return {
          label: cellTitle(cb ?? ca!),
          ratio: r?.value !== undefined ? r : undefined,
          note: "not measured",
        };
      });
      const measured = rows.flatMap((r) => (r.ratio ? [r.ratio] : []));
      return {
        key,
        overall: geomean(measured.map((r) => r.value!)),
        scenes: measured.length,
        better: measured.filter((r) => r.separated && r.value! < 1).length,
        worse: measured.filter((r) => r.separated && r.value! > 1).length,
        html: forestPlot({
          title: `${metricName(key)} per scene, ${engineLabel(config)}: candidate run relative to baseline run`,
          rows,
          baseline: "baseline run",
          candidate: "candidate run",
        }),
      };
    });
  }, [sa, sb, config, metrics, scenes]);

  const back = <Link render={<RouterLink to="/runs" />}>Runs</Link>;
  if (summaries.length < 2) {
    return (
      <Page title="Compare runs" back={back}>
        <Empty title="Compare needs two runs.">
          Run the suite again after a change:{" "}
          <code>
            node packages/next/bench/suite/cli.mjs run --note "what changed"
          </code>
        </Empty>
      </Page>
    );
  }
  const setSearch = (patch: Record<string, string | undefined>) =>
    void navigate({ search: (s) => ({ ...s, ...patch }), replace: true });
  const runs = newestFirst.map(runOption);
  const ra = JSON.stringify(sa?.render ?? null);
  const rb = JSON.stringify(sb?.render ?? null);
  const cautions = [
    ...(sa && sb && sa.hardware !== sb.hardware
      ? [`They ran on different machines (${sa.hardware}; ${sb.hardware}).`]
      : []),
    ...(ra !== rb
      ? [
          `They used different render settings (${ra === "null" ? "not recorded" : ra}; ${rb === "null" ? "not recorded" : rb}): differences may come from the settings, not the code.`,
        ]
      : []),
    ...(a === b ? ["Both pickers name the same run."] : []),
  ];

  return (
    <Page
      title="Compare runs"
      description="How one configuration changed from one run to another, scene by scene."
      back={back}
      help={
        <>
          <p>
            Each row is a scene: the candidate run's median over the baseline
            run's, with its 95% bootstrap interval. A scene counts as better or
            worse only when the interval excludes no change.
          </p>
          <p>
            The change above each chart is the geometric mean across scenes
            measured in both runs. Hover it for the raw ratio.
          </p>
        </>
      }
      actions={
        <IconButton
          label="Swap baseline and candidate"
          variant="outlined"
          onClick={() => setSearch({ a: b, b: a })}
        >
          <Icon href={svgSwap} />
        </IconButton>
      }
      toolbar={
        <>
          <Choice
            label="Baseline run"
            value={a}
            options={runs}
            minWidth={260}
            onChange={(v) => setSearch({ a: v })}
          />
          <Choice
            label="Candidate run"
            value={b}
            options={runs}
            minWidth={260}
            onChange={(v) => setSearch({ b: v })}
          />
          <Choice
            label="Configuration"
            value={config}
            options={configs.map((c) => [c, engineLabel(c)] as const)}
            onChange={(v) => setSearch({ config: v })}
          />
          <Chips
            label="Metrics"
            options={METRICS.map(([k]) => [k, metricName(k)] as const)}
            value={metrics}
            onChange={setMetrics}
          />
        </>
      }
    >
      {cautions.length > 0 && (
        <Alert severity="warning" className="res-gap">
          <AlertTitle>Compare with care</AlertTitle>
          {cautions.join(" ")}
        </Alert>
      )}
      {(scenes.onlyA.length > 0 || scenes.onlyB.length > 0) &&
        scenes.both.length > 0 && (
          <Typography
            variant="body-sm"
            color="textSecondary"
            render={<p />}
            className="res-gap"
          >
            Compared in {scenes.both.length} of{" "}
            {scenes.both.length + scenes.onlyA.length + scenes.onlyB.length}{" "}
            scenes.
            {scenes.onlyA.length > 0 &&
              ` Only in the baseline run: ${scenes.onlyA.join(", ")}.`}
            {scenes.onlyB.length > 0 &&
              ` Only in the candidate run: ${scenes.onlyB.join(", ")}.`}
          </Typography>
        )}
      {!scenes.both.length ? (
        <Empty
          title={`These runs share no scene measured with ${engineLabel(config)}.`}
        >
          Pick another configuration, or runs of the same scenes.
        </Empty>
      ) : (
        !charts.length && (
          <Empty title="No metric selected.">
            Pick one or more metrics above to see them per scene.
          </Empty>
        )
      )}
      {charts.map((c) => {
        const change = formatChange(c.overall, { noun: NOUNS[c.key] });
        return (
          <section key={c.key} className="res-metric">
            <div className="res-metric-head">
              <Typography variant="subtitle-md" render={<h2 />}>
                {metricName(c.key)}
              </Typography>
              <Typography variant="body-md">
                <span
                  className={`change ${change.tone}`}
                  title={
                    c.overall
                      ? `×${c.overall.toPrecision(2)}, geometric mean of ${c.scenes} scenes`
                      : undefined
                  }
                >
                  {change.text}
                </span>
              </Typography>
              <Typography variant="body-sm" color="textSecondary">
                {c.scenes
                  ? `${c.better} better, ${c.worse} worse of ${c.scenes} ${c.scenes === 1 ? "scene" : "scenes"}`
                  : "Not measured in both runs"}
              </Typography>
            </div>
            <Chart html={c.html} className="chart-host res-chart" />
          </section>
        );
      })}
    </Page>
  );
}
