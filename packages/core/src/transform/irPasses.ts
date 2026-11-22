// What the engine's startup code asks of Cesium IR, in one module (CS-794): the
// route compiler, a curvilinear edge's autodiff Jacobian, and a function's
// parse. It imports `src/ir` and the passes built on it, and is loaded by
// `loadIr()` (lazyIr.ts) when a curvilinear map first needs one of them. It
// installs itself there when evaluated, so importing it by path (the aggregate
// `index.ts`, a test) has the same effect.
import { jacobian } from "./ad.ts";
import { compileRoute } from "./compile.ts";
import { installIrPasses } from "./lazyIr.ts";
import { parseTransform, TransformParseError } from "./parse.ts";
import { adJacobian } from "./stepIr.ts";

export const passes = {
  /** A route's shape to fused WGSL, or why it can't be (compile.ts). */
  compileRoute,
  /** J of a curvilinear spec's IR at a point, column-major, or undefined without IR. */
  adJacobian,
  /** J of a program at a point, row-major (ad.ts). */
  jacobian,
  /** A function's source into a program; throws `TransformParseError` outside the subset. */
  parseTransform,
  TransformParseError,
};

export type IrPasses = typeof passes;

installIrPasses(passes);
