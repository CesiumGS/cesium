// The axis Analysis plots for a run (views/Analysis.tsx), apart from the
// page so tests can read it without a browser: a swept setting, from
// either form of the sweep record (settings.mjs, readSweep), or CesiumJS
// releases.
import type { Summary } from "../data.ts";
import { compareEngines, engineLabel, isRelease } from "../engines.mjs";
import { pointSuffix, readSweep, type SweepRecord } from "../settings.mjs";

export interface SweepAxis {
  /** The x axis: a setting's id, or "CesiumJS release". */
  param: string;
  /** The values along it, in order. */
  xNames: string[];
  /**
   * One line per swept engine and combination of the other axes: its
   * name and, per x value, the configuration that ran it.
   */
  lines: Array<{ label: string; configs: Array<string | undefined> }>;
  baseline?: string;
}

/**
 * The axis a run swept, if any: a setting (the record's first axis, any
 * form, settings.mjs), or CesiumJS releases. With several axes, each
 * combination of the others is a line; a reference outside the grid is
 * left to the sweep view (CS-395).
 */
export function axisOf(s: Summary): SweepAxis | undefined {
  const sweep = readSweep(s.sweep);
  if (sweep?.axes.length) {
    const [first, ...others] = sweep.axes as [
      SweepRecord["axes"][number],
      ...SweepRecord["axes"],
    ];
    const grid = sweep.points.filter(
      (p) => !(sweep.reference?.outside && p.reference),
    );
    const otherIds = others.map((a) => a.id);
    const lines = new Map<string, SweepAxis["lines"][number]>();
    const engines = sweep.engines.length ? sweep.engines : [undefined];
    for (const point of grid) {
      const x = first.values.indexOf(point.coords[first.id]!);
      if (x < 0) {
        continue;
      }
      const rest = Object.fromEntries(
        otherIds.map((id) => [id, point.coords[id]!]),
      );
      engines.forEach((engine, i) => {
        const key = JSON.stringify([engine, rest]);
        if (!lines.has(key)) {
          lines.set(key, {
            label: engine
              ? engineLabel(`${engine}${pointSuffix(rest, otherIds)}`)
              : otherIds.map((id) => `${id} ${rest[id]}`).join(", "),
            configs: first.values.map(() => undefined),
          });
        }
        const suffix = pointSuffix(
          point.coords,
          sweep.axes.map((a) => a.id),
        );
        lines.get(key)!.configs[x] =
          (engine
            ? point.configs.find((c) => c === `${engine}${suffix}`)
            : undefined) ?? point.configs[i];
      });
    }
    return {
      param: first.id,
      xNames: first.values.map(String),
      lines: [...lines.values()],
      ...(s.baseline ? { baseline: s.baseline } : {}),
    };
  }
  // Several CesiumJS releases in one run: a release sweep.
  const releases = s.configs.filter(isRelease).sort(compareEngines);
  if (releases.length >= 2) {
    return {
      param: "CesiumJS release",
      xNames: releases.map((c) => engineLabel(c)),
      lines: [{ label: "CesiumJS", configs: releases }],
      baseline: s.candidate,
    };
  }
  return undefined;
}
