// Kinks and steps, per output: the ops whose derivative jumps (a kink: a
// Hessian doesn't bound how the Jacobian changes) or whose value does (a
// step: no derivative bound holds). Today's list (`src/transform/stepIr.ts`),
// with KHR_interactivity's ops that today's IR lacks: `saturate` is a kink,
// and `trunc`, `round` and `rem` are steps. `sign` stays among the kinks, as
// today.

import type { Id, Program } from "./types.ts";

export const KINK_OPS: ReadonlySet<string> = new Set([
  "math/abs",
  "math/min",
  "math/max",
  "math/select",
  "math/clamp",
  "math/saturate",
  "math/sign",
]);

export const STEP_OPS: ReadonlySet<string> = new Set([
  "math/floor",
  "math/ceil",
  "math/fract",
  "math/trunc",
  "math/round",
  "math/rem",
]);

export interface OutputKinks {
  /** Equations an output reads whose derivative may jump. */
  readonly kinks: readonly Id[];
  /** Equations an output reads whose value may jump. */
  readonly steps: readonly Id[];
}

/** For each output (by name), the kinks and steps it reads, in program order. */
export function kinks(p: Program): Record<string, OutputKinks> {
  const out: Record<string, OutputKinks> = {};
  for (const o of p.outputs) {
    const reached = new Uint8Array(p.eqns.length);
    const stack = [o.id];
    while (stack.length > 0) {
      const id = stack.pop()!;
      if (!reached[id]) {
        reached[id] = 1;
        stack.push(...p.eqns[id]!.args);
      }
    }
    const k: Id[] = [];
    const s: Id[] = [];
    p.eqns.forEach((e, id) => {
      if (reached[id]) {
        if (KINK_OPS.has(e.op)) {
          k.push(id);
        }
        if (STEP_OPS.has(e.op)) {
          s.push(id);
        }
      }
    });
    out[o.name] = { kinks: k, steps: s };
  }
  return out;
}
