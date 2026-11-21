// A curvilinear edge's function as IR programs, for the queries that read its
// derivatives: J (accuracy, bounds), H (bounds, chord error) and the ranges
// the parameters may take. Parsed from `spec.source` once per spec; a spec
// with none, or a source outside the subset, has no IR and its queries fall
// back on the function's own Jacobian or on sampling.
import { kinks } from "../ir/kinks.ts";
import type { Program } from "../ir/types.ts";
import { hessianProgram, jacobianProgram, parameterProgram } from "./ad.ts";
import { evaluate } from "./evaluate.ts";
import type { Params, CurvilinearSpec } from "./graph.ts";
import { parseTransform } from "./parse.ts";

export interface StepIr {
  /** 3 outputs. */
  readonly value: Program;
  /** J, row-major (`3 * i + j`): 9 outputs. */
  readonly jacobian: Program;
  /** H (`9 * i + 3 * j + k`): 27 outputs, built on first use. */
  hessian(): Program;
  /** The derivatives along parameters (`3 * n + i`), for the names given. */
  parameters(names: readonly string[]): Program;
  /** The function has an op whose derivative may jump: H doesn't bound how J changes. */
  readonly kinked: boolean;
  /** The function has an op whose value may jump (floor, fract): no derivative bound holds. */
  readonly discontinuous: boolean;
}

const cache = new WeakMap<CurvilinearSpec, StepIr | null>();

/** The IR of a curvilinear edge's function, or undefined when it has none to give. */
export function stepIr(spec: CurvilinearSpec): StepIr | undefined {
  const known = cache.get(spec);
  if (known !== undefined) {
    return known ?? undefined;
  }
  let made: StepIr | null = null;
  if (spec.source !== undefined) {
    try {
      const value = parseTransform(spec.source);
      if (value.outputs.length === 3) {
        // Cesium IR's kinks pass: the ops whose derivative or value jumps.
        const outputs = Object.values(kinks(value));
        let hessian: Program | undefined;
        const parameters = new Map<string, Program>();
        made = {
          value,
          jacobian: jacobianProgram(value),
          hessian: () => (hessian ??= hessianProgram(value)),
          parameters(names) {
            const key = names.join(",");
            let program = parameters.get(key);
            if (!program) {
              program = parameterProgram(value, names);
              parameters.set(key, program);
            }
            return program;
          },
          kinked: outputs.some((o) => o.kinks.length > 0),
          discontinuous: outputs.some((o) => o.steps.length > 0),
        };
      }
    } catch {
      made = null;
    }
  }
  cache.set(spec, made);
  return made ?? undefined;
}

/** J of the spec's IR at `p`, column-major, or undefined without IR. */
export function adJacobian(
  spec: CurvilinearSpec,
  p: ArrayLike<number>,
  params: Params,
  out: Float64Array,
): Float64Array | undefined {
  const ir = stepIr(spec);
  if (!ir) {
    return undefined;
  }
  const rows = evaluate(ir.jacobian, p, params);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      out[3 * j + i] = rows[3 * i + j]!;
    }
  }
  return out;
}
