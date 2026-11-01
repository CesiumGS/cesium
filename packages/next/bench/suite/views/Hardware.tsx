import { Table, Text } from "@radix-ui/themes";
import { useMemo } from "react";
import { cellKey, geomean, metricInfo } from "../data.ts";
import { ratio } from "../stats.mjs";
import { Empty, Lede, useRuns } from "./common.tsx";

/**
 * Dyno's Hardware view (plan §16.9, Explore): the same comparison across
 * machines: per hardware class, the latest run's candidate over baseline
 * per headline metric.
 */

const KEYS = ["cpuP50", "gpuP50", "frameP95", "settleMs", "bytes", "heapBytes"];

export function Hardware() {
  const { summaries } = useRuns();
  const rows = useMemo(() => {
    // Sweeps vary the configurations; compare ordinary runs only.
    const plain = summaries.filter((s) => !s.sweep);
    const classes = [...new Set(plain.map((s) => s.hardware))];
    return classes.map((h) => {
      const s = plain.findLast((x) => x.hardware === h)!;
      const base = s.baseline ?? s.configs[0]!;
      const cand = s.candidate ?? s.configs.find((c) => c !== base) ?? base;
      const ratios = KEYS.map((metric) => {
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
      <Empty title="No runs yet.">
        Run <code>node packages/next/bench/suite/cli.mjs run</code> on each
        machine (a sweep doesn't count: it varies the configurations).
      </Empty>
    );
  }

  return (
    <div className="hardware">
      <Lede>
        The candidate over the baseline on each machine (the latest run per
        hardware class, geometric mean across scenes; ▼ better, ▲ worse). Runs
        on more machines (§16.8, v3) fill this in; scaling across GPUs shows
        where each engine is bound.
      </Lede>
      <Table.Root variant="surface" size="1">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Hardware</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Comparison</Table.ColumnHeaderCell>
            {KEYS.map((k) => (
              <Table.ColumnHeaderCell key={k} justify="end">
                {metricInfo(k)[1]}
              </Table.ColumnHeaderCell>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rows.map(({ s, base, cand, ratios, runs }) => (
            <Table.Row key={s.hardware}>
              <Table.RowHeaderCell>
                <Text as="div" weight="medium">
                  {s.hardware}
                </Text>
                <Text as="div" size="1" color="gray">
                  {s.browser ?? ""} · {runs} runs · latest{" "}
                  {new Date(s.date).toLocaleDateString()}
                </Text>
              </Table.RowHeaderCell>
              <Table.Cell>
                {cand} / {base}
              </Table.Cell>
              {ratios.map((g, i) => (
                <Table.Cell
                  key={KEYS[i]}
                  justify="end"
                  className={
                    g === undefined
                      ? undefined
                      : g < 0.95
                        ? "better"
                        : g > 1.05
                          ? "worse"
                          : undefined
                  }
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {g === undefined
                    ? "–"
                    : `${g < 0.95 ? "▼ " : g > 1.05 ? "▲ " : ""}×${g.toFixed(2)}`}
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </div>
  );
}
