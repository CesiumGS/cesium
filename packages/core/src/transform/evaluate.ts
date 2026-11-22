import { evaluate as cirEvaluate } from "../ir/evaluate.ts";
import type { Program, Value } from "../ir/types.ts";
import { POSITION } from "./program.ts";

/** Parameter values by name. */
export type ParamValues = Readonly<Record<string, number>>;

/**
 * The program's outputs at position `p`, in float64: the same arithmetic as
 * the function the program was parsed from, for cross-checking a parse.
 * Cesium IR's evaluator does the arithmetic; a bool output is 0 or 1.
 */
export function evaluate(
  program: Program,
  p: ArrayLike<number>,
  params: ParamValues = {},
): number[] {
  const inputs: Record<string, Value> = { [POSITION]: [p[0]!, p[1]!, p[2]!] };
  for (const e of program.eqns) {
    if (e.op === "input") {
      const name = program.inputs[e.index!]!.name;
      if (name !== POSITION) {
        const value = params[name];
        if (value === undefined) {
          throw new Error(`parameter '${name}' has no value`);
        }
        inputs[name] = value;
      }
    }
  }
  const values = cirEvaluate(program, inputs);
  return program.outputs.map((o) => {
    const v = values[o.name];
    return typeof v === "boolean" ? (v ? 1 : 0) : (v as number);
  });
}
