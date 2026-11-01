import { Callout, Flex, Text } from "@radix-ui/themes";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { getRouteApi } from "@tanstack/react-router";
import { useMemo } from "react";
import { forestPlot } from "../charts.mjs";
import { METRICS } from "../report.mjs";
import { ratio } from "../stats.mjs";
import { cellKey, cellTitle, metricInfo, runLabel, titleOf } from "../data.ts";
import {
  Chart,
  Chips,
  Choice,
  Empty,
  Field,
  Lede,
  Toolbar,
  useRuns,
  useStored,
} from "./common.tsx";

/**
 * Compare (plan §16.9): two runs side by side per scene, the
 * commit-to-commit regression view. Defaults to the two latest ordinary
 * runs (sweeps vary the configurations) and offers the configurations
 * both runs have; warns when the machines or render settings differ.
 */

const route = getRouteApi("/compare");
const HEADLINE = ["settleMs", "cpuP50", "frameP95", "bytes", "heapBytes"];

export function Compare() {
  const { summaries } = useRuns();
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const [metrics, setMetrics] = useStored<string[]>("bench.metrics", HEADLINE);

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
        : (configs.at(-1) ?? "2.0");

  const charts = useMemo(() => {
    if (!sa || !sb) {
      return [];
    }
    const sceneIds = [
      ...new Set([...sa.scenes, ...sb.scenes].map((c) => cellKey(c))),
    ];
    return metrics
      .filter((key) => METRICS.some((m) => m[0] === key))
      .map((key) => {
        const [, name] = metricInfo(key);
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
            label: cb
              ? cellTitle(cb)
              : ca
                ? cellTitle(ca)
                : titleOf(summaries, id),
            ratio: r?.value !== undefined ? r : undefined,
            note: !ca
              ? "not in the baseline run"
              : !cb
                ? "not in this run"
                : "no data",
          };
        });
        return {
          key,
          html: forestPlot({
            title: `${name}: candidate relative to baseline (${config})`,
            rows,
            baseline: "baseline run",
            candidate: "candidate run",
          }),
        };
      });
  }, [sa, sb, config, metrics, summaries]);

  if (summaries.length < 2) {
    return (
      <Empty title="Compare needs two runs.">
        Run the suite again after a change:{" "}
        <code>
          node packages/next/bench/suite/cli.mjs run --note "what changed"
        </code>
      </Empty>
    );
  }
  const setSearch = (patch: Record<string, string>) =>
    void navigate({ search: (s) => ({ ...s, ...patch }), replace: true });
  const runs = newestFirst.map((s) => [s.name, runLabel(s)] as const);
  const ra = JSON.stringify(sa?.render ?? null);
  const rb = JSON.stringify(sb?.render ?? null);
  const cautions = [
    ...(sa && sb && sa.hardware !== sb.hardware
      ? ["the runs are from different machines"]
      : []),
    ...(ra !== rb
      ? [
          `the runs used different render settings (${ra === "null" ? "not recorded" : ra} vs ${rb === "null" ? "not recorded" : rb}); differences may come from the settings, not the code`,
        ]
      : []),
  ];
  return (
    <>
      <Toolbar>
        <Field label="Baseline run">
          <Choice
            value={a}
            options={runs}
            onChange={(v) => setSearch({ a: v })}
          />
        </Field>
        <Field label="Candidate run">
          <Choice
            value={b}
            options={runs}
            onChange={(v) => setSearch({ b: v })}
          />
        </Field>
        <Field label="Configuration">
          <Choice
            value={config}
            options={configs}
            onChange={(v) => setSearch({ config: v })}
          />
        </Field>
      </Toolbar>
      <Flex mb="3">
        <Chips
          label="Metrics"
          options={METRICS.map(([k, l]) => [k, l] as const)}
          value={metrics}
          onChange={setMetrics}
        />
      </Flex>
      {sa && sb && (
        <Lede>
          {config} in the candidate run relative to the baseline run, per scene.
          Hardware: {sa.hardware}
          {sa.hardware !== sb.hardware ? ` vs ${sb.hardware}` : ""}.
        </Lede>
      )}
      {cautions.length > 0 && (
        <Callout.Root color="amber" mb="3" role="note">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>
            <Text weight="medium">Compare with care:</Text>{" "}
            {cautions.join("; ")}.
          </Callout.Text>
        </Callout.Root>
      )}
      {charts.map((c) => (
        <Chart key={c.key} html={c.html} />
      ))}
    </>
  );
}
