import { evaluate as cirEvaluate } from "../ir/evaluate.ts";
import { cirOf } from "../ir/fromTodayIr.ts";
import type { Program, Value } from "../ir/types.ts";
import type { IrProgram } from "./ir.ts";
import { POSITION } from "./program.ts";

/** Parameter values by name. */
export type ParamValues = Readonly<Record<string, number>>;

/** Cesium IR, or today's form until the front end builds Cesium IR (CS-53). */
export type AnyProgram = Program | IrProgram;

/** The program as Cesium IR. */
export const asCir = (program: AnyProgram): Program =>
  "eqns" in program ? program : cirOf(program);

/**
 * The program's outputs at position `p`, in float64: the same arithmetic as
 * the function the program was parsed from, for cross-checking a parse.
 * Cesium IR's evaluator does the arithmetic; a bool output is 0 or 1.
 */
export function evaluate(
  program: AnyProgram,
  p: ArrayLike<number>,
  params: ParamValues = {},
): number[] {
  const cir = asCir(program);
  const inputs: Record<string, Value> = { [POSITION]: [p[0]!, p[1]!, p[2]!] };
  for (const e of cir.eqns) {
    if (e.op === "input") {
      const name = cir.inputs[e.index!]!.name;
      if (name !== POSITION) {
        const value = params[name];
        if (value === undefined) {
          throw new Error(`parameter '${name}' has no value`);
        }
        inputs[name] = value;
      }
    }
  }
  const values = cirEvaluate(cir, inputs);
  return cir.outputs.map((o) => {
    const v = values[o.name];
    return typeof v === "boolean" ? (v ? 1 : 0) : (v as number);
  });
}
