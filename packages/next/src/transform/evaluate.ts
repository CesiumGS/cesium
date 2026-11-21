import { evaluate as cirEvaluate } from "../ir/fromTodayIr.ts";
import type { IrProgram } from "./ir.ts";

/** Parameter values by name. */
export type ParamValues = Readonly<Record<string, number>>;

/**
 * The program's outputs at position `p`, in float64: the same arithmetic as
 * the function the program was parsed from, for cross-checking a parse.
 * Cesium IR's evaluator does the arithmetic.
 */
export function evaluate(
  program: IrProgram,
  p: ArrayLike<number>,
  params: ParamValues = {},
): number[] {
  return cirEvaluate(program, p, params);
}
