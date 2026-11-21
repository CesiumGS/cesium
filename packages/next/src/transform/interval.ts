// Natural interval extension of a transform's program, on Cesium IR's
// interval pass (`src/ir/interval.ts`): bounds of the outputs over a box of
// positions and parameter ranges. Monotone ops map the endpoints (tight);
// sin, cos and tan find the extrema inside the interval by period checks;
// products and quotients take the extreme corners. Dependency between the
// operands is ignored (the usual overestimate of the natural extension).
// There is no outward rounding: the bounds are exact up to the final ulp.

import { evaluateInterval as cirEvaluateInterval } from "../ir/fromTodayIr.ts";
import type { Interval } from "../ir/interval.ts";
import type { IrProgram } from "./ir.ts";

export type { Interval } from "../ir/interval.ts";

export interface Box {
  readonly min: ArrayLike<number>;
  readonly max: ArrayLike<number>;
}

/** A parameter's range: a value, `[lo, hi]` or an interval. */
export type ParamRange = number | readonly [number, number] | Interval;

/** Bounds of each output of `program` over `box` and the parameter ranges. */
export function evaluateInterval(
  program: IrProgram,
  box: Box,
  params: Readonly<Record<string, ParamRange>> = {},
): Interval[] {
  return cirEvaluateInterval(program, box, params);
}
