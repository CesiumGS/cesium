// Natural interval extension of a transform's program, on Cesium IR's
// interval pass (`src/ir/interval.ts`): bounds of the outputs over a box of
// positions and parameter ranges. Monotone ops map the endpoints (tight);
// sin, cos and tan find the extrema inside the interval by period checks;
// products and quotients take the extreme corners. Dependency between the
// operands is ignored (the usual overestimate of the natural extension).
// There is no outward rounding: the bounds are exact up to the final ulp.

import {
  evaluateInterval as cirEvaluateInterval,
  type Interval,
  type Range,
} from "../ir/interval.ts";
import { asCir, type AnyProgram } from "./evaluate.ts";
import { POSITION } from "./program.ts";

export type { Interval } from "../ir/interval.ts";

export interface Box {
  readonly min: ArrayLike<number>;
  readonly max: ArrayLike<number>;
}

/** A parameter's range: a value, `[lo, hi]` or an interval. */
export type ParamRange = number | readonly [number, number] | Interval;

/** Bounds of each output of `program` over `box` and the parameter ranges. */
export function evaluateInterval(
  program: AnyProgram,
  box: Box,
  params: Readonly<Record<string, ParamRange>> = {},
): Interval[] {
  const cir = asCir(program);
  const ranges: Record<string, Range> = {
    [POSITION]: [0, 1, 2].map((i) => ({ lo: box.min[i]!, hi: box.max[i]! })),
  };
  for (const e of cir.eqns) {
    if (e.op !== "input") {
      continue;
    }
    const name = cir.inputs[e.index!]!.name;
    if (name === POSITION) {
      continue;
    }
    const r = params[name];
    if (r === undefined) {
      throw new Error(`parameter '${name}' has no range`);
    }
    ranges[name] =
      typeof r === "number"
        ? r
        : Array.isArray(r)
          ? { lo: r[0]!, hi: r[1]! }
          : (r as Interval);
  }
  const bounds = cirEvaluateInterval(cir, ranges);
  return cir.outputs.map((o) => bounds[o.name]![0]!);
}
