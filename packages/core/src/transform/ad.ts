// Forward-mode differentiation of a transform's program, on Cesium IR's AD
// pass (`src/ir/ad.ts`): a tangent of every equation along one input lane or
// parameter, built as new equations, so the result is a program like any
// other (evaluated in float64, run through intervals, or emitted as WGSL for
// normals and the compiler's bounds). An equation that doesn't depend on the
// input has no tangent (zero), so the extra equations stay few. J is three
// such passes (one per position lane); H is forward over forward.

import {
  derivativeName,
  hessianProgram as cirHessian,
  jacobianProgram as cirJacobian,
  parameterProgram as cirParameters,
} from "../ir/ad.ts";
import { Builder } from "../ir/builder.ts";
import type { Id, Program } from "../ir/types.ts";
import { evaluate, type ParamValues } from "./evaluate.ts";
import { POSITION } from "./program.ts";

const outputNames = (p: Program) => p.outputs.map((o) => o.name);

function idOf(p: Program, name: string): Id {
  const o = p.outputs.find((x) => x.name === name);
  if (!o) {
    throw new Error(`no output '${name}'`);
  }
  return o.id;
}

/** J as a program of 9 outputs, row-major: `3 * i + j` is d out_i / d p_j. */
export function jacobianProgram(program: Program): Program {
  const names = outputNames(program);
  const j = cirJacobian(program, POSITION, names);
  const b = Builder.from(j);
  const out: Record<string, Id> = {};
  names.forEach((name, i) => {
    for (let c = 0; c < 3; c++) {
      out[`e${3 * i + c}`] = idOf(
        j,
        derivativeName(name, { input: POSITION, lane: c }),
      );
    }
  });
  return b.program(out);
}

/**
 * H as a program of 27 outputs: `9 * i + 3 * j + k` is d² out_i / d p_j d p_k.
 * Forward over forward: each of J's columns, differentiated again.
 */
export function hessianProgram(program: Program): Program {
  const names = outputNames(program);
  const h = cirHessian(program, POSITION, names);
  const b = Builder.from(h);
  const out: Record<string, Id> = {};
  names.forEach((name, i) => {
    for (let j = 0; j < 3; j++) {
      for (let m = 0; m < 3; m++) {
        out[`e${9 * i + 3 * j + m}`] = idOf(
          h,
          derivativeName(
            name,
            { input: POSITION, lane: j },
            { input: POSITION, lane: m },
          ),
        );
      }
    }
  });
  return b.program(out);
}

/**
 * The derivatives along parameters as a program: for each name in order,
 * the 3 outputs' derivatives, so `3 * n + i` is d out_i / d names[n]. A
 * name the program doesn't read has zero derivatives.
 */
export function parameterProgram(
  program: Program,
  names: readonly string[],
): Program {
  const outs = outputNames(program);
  const known = names.filter((n) => program.inputs.some((i) => i.name === n));
  const d = cirParameters(program, known, outs);
  const b = Builder.from(d);
  const zero = b.const(0);
  const out: Record<string, Id> = {};
  names.forEach((name, n) => {
    outs.forEach((o, i) => {
      out[`e${3 * n + i}`] = known.includes(name)
        ? idOf(d, derivativeName(o, { input: name }))
        : zero;
    });
  });
  return b.program(out);
}

const cache = new WeakMap<Program, Map<string, Program>>();

function derived(program: Program, key: string, build: () => Program): Program {
  let byKey = cache.get(program);
  if (!byKey) {
    byKey = new Map();
    cache.set(program, byKey);
  }
  let result = byKey.get(key);
  if (!result) {
    result = build();
    byKey.set(key, result);
  }
  return result;
}

/** J at `p`, row-major (`3 * i + j`), in float64. */
export function jacobian(
  program: Program,
  p: ArrayLike<number>,
  params: ParamValues = {},
): number[] {
  return evaluate(
    derived(program, "J", () => jacobianProgram(program)),
    p,
    params,
  );
}

/** H at `p` (`9 * i + 3 * j + k`), in float64. */
export function hessian(
  program: Program,
  p: ArrayLike<number>,
  params: ParamValues = {},
): number[] {
  return evaluate(
    derived(program, "H", () => hessianProgram(program)),
    p,
    params,
  );
}

/** The derivatives along `names` at `p` (`3 * n + i`), in float64. */
export function parameterDerivatives(
  program: Program,
  names: readonly string[],
  p: ArrayLike<number>,
  params: ParamValues = {},
): number[] {
  return evaluate(
    derived(program, `P:${names.join(",")}`, () =>
      parameterProgram(program, names),
    ),
    p,
    params,
  );
}
