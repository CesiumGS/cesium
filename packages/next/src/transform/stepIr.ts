// A smooth edge's function as IR programs, for the queries that read its
// derivatives: J (accuracy, bounds), H (bounds, chord error) and the ranges
// the parameters may take. Parsed from `spec.source` once per spec; a spec
// with none, or a source outside the subset, has no IR and its queries fall
// back on the function's own Jacobian or on sampling.
import { hessianProgram, jacobianProgram, parameterProgram } from "./ad.ts";
import { evaluate } from "./evaluate.ts";
import type { Params, SmoothSpec } from "./graph.ts";
import type { IrProgram } from "./ir.ts";
import { parseTransform } from "./parse.ts";

/** Ops whose derivative jumps (a kink) or whose value does (a step). */
const KINKS: ReadonlySet<string> = new Set([
  "abs",
  "min",
  "max",
  "select",
  "clamp",
  "sign",
]);
const STEPS: ReadonlySet<string> = new Set(["floor", "ceil", "fract"]);

export interface StepIr {
  /** 3 outputs. */
  readonly value: IrProgram;
  /** J, row-major (`3 * i + j`): 9 outputs. */
  readonly jacobian: IrProgram;
  /** H (`9 * i + 3 * j + k`): 27 outputs, built on first use. */
  hessian(): IrProgram;
  /** The derivatives along parameters (`3 * n + i`), for the names given. */
  parameters(names: readonly string[]): IrProgram;
  /** The function has an op whose derivative may jump: H doesn't bound how J changes. */
  readonly kinked: boolean;
  /** The function has an op whose value may jump (floor, fract): no derivative bound holds. */
  readonly discontinuous: boolean;
}

const cache = new WeakMap<SmoothSpec, StepIr | null>();

/** The IR of a smooth edge's function, or undefined when it has none to give. */
export function stepIr(spec: SmoothSpec): StepIr | undefined {
  const known = cache.get(spec);
  if (known !== undefined) {
    return known ?? undefined;
  }
  let made: StepIr | null = null;
  if (spec.source !== undefined) {
    try {
      const value = parseTransform(spec.source);
      if (value.outputs.length === 3) {
        let hessian: IrProgram | undefined;
        const parameters = new Map<string, IrProgram>();
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
          kinked: value.nodes.some((n) => KINKS.has(n.op)),
          discontinuous: value.nodes.some((n) => STEPS.has(n.op)),
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
  spec: SmoothSpec,
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
