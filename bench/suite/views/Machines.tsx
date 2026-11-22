import "./machines.css";
import {
  Link,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "@tanstack/react-router";
import { useMemo } from "react";
import { engineLabel } from "../engines.mjs";
import { cellKey, geomean, type Summary, when } from "../data.ts";
import { ratio } from "../stats.mjs";
import { Empty, formatChange, useRuns } from "./common.tsx";

/**
 * Machines (in the Overview, DESIGN.md): the latest ordinary run on each
 * machine, candidate against baseline per headline metric, as a geometric
 * mean over scenes. How each engine scales across GPUs shows where it is
 * bound. Moved here from Analysis (CS-403).
 */

/** Shorter column headings for the machines table. */
const COLUMN_NAMES: Record<string, string> = {
  cpuP50: "CPU per frame",
  gpuP50: "GPU per frame",
  frameP95: "Frame time p95",
  settleMs: "Time to settle",
  bytes: "Bytes",
  heapBytes: "JS heap",
  bufferBytes: "Buffers",
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
  ["bufferBytes", "memory"],
];

/** The machines table, or what to run when there is nothing to compare. */
export function Machines() {
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
      {rows.length === 1 && (
        <Typography
          variant="body-sm"
          color="textSecondary"
          render={<p />}
          className="machines-note"
        >
          One machine so far. Runs from others appear here once their results
          are in the results directory.
        </Typography>
      )}
      <div className="machines-table">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Machine</TableCell>
              <TableCell>Latest run</TableCell>
              {MACHINE_METRICS.map(([k]) => (
                <TableCell key={k} className="num">
                  {COLUMN_NAMES[k] ?? k}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(({ s, base, cand, ratios, runs }) => (
              <TableRow key={s.hardware}>
                <TableCell render={<th scope="row" />}>
                  <Typography variant="body-md" className="machines-machine">
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
                    className="machines-nowrap"
                  >
                    {when(s)}
                  </Link>
                  <Typography
                    variant="caption-md"
                    color="textSecondary"
                    className="machines-block"
                  >
                    {engineLabel(cand)} against {engineLabel(base)}
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
                          title={`×${g.toFixed(2)} (${engineLabel(cand)} / ${engineLabel(base)})`}
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
