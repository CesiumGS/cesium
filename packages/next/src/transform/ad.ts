// Forward-mode differentiation of a transform's program, on Cesium IR's AD
// pass (`src/ir/ad.ts`): a tangent of every equation along one input lane or
// parameter, built as new equations, so the result is a program like any
// other (evaluated in float64, run through intervals, or emitted as WGSL for
// normals and the compiler's bounds). An equation that doesn't depend on the
// input has no tangent (zero), so the extra equations stay few. J is three
// such passes (one per position lane); H is forward over forward.

import {
  hessian as cirHessian,
  hessianProgram as cirHessianProgram,
  jacobian as cirJacobian,
  jacobianProgram as cirJacobianProgram,
  parameterDerivatives as cirParameterDerivatives,
  parameterProgram as cirParameterProgram,
} from "../ir/fromTodayIr.ts";
import type { ParamValues } from "./evaluate.ts";
import type { IrProgram } from "./ir.ts";

/** J as a program of 9 outputs, row-major: `3 * i + j` is d out_i / d p_j. */
export function jacobianProgram(program: IrProgram): IrProgram {
  return cirJacobianProgram(program) as IrProgram;
}

/**
 * H as a program of 27 outputs: `9 * i + 3 * j + k` is d² out_i / d p_j d p_k.
 * Forward over forward: each of J's columns, differentiated again.
 */
export function hessianProgram(program: IrProgram): IrProgram {
  return cirHessianProgram(program) as IrProgram;
}

/**
 * The derivatives along parameters as a program: for each name in order,
 * the 3 outputs' derivatives, so `3 * n + i` is d out_i / d names[n].
 */
export function parameterProgram(
  program: IrProgram,
  names: readonly string[],
): IrProgram {
  return cirParameterProgram(program, names) as IrProgram;
}

/** J at `p`, row-major (`3 * i + j`), in float64. */
export function jacobian(
  program: IrProgram,
  p: ArrayLike<number>,
  params: ParamValues = {},
): number[] {
  return cirJacobian(program, p, params);
}

/** H at `p` (`9 * i + 3 * j + k`), in float64. */
export function hessian(
  program: IrProgram,
  p: ArrayLike<number>,
  params: ParamValues = {},
): number[] {
  return cirHessian(program, p, params);
}

/** The derivatives along `names` at `p` (`3 * n + i`), in float64. */
export function parameterDerivatives(
  program: IrProgram,
  names: readonly string[],
  p: ArrayLike<number>,
  params: ParamValues = {},
): number[] {
  return cirParameterDerivatives(program, names, p, params);
}
