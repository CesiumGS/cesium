export {
  affine,
  smooth,
  switchEdge,
  TransformGraph,
  TransformNode,
  type AffineEdge,
  type ChosenEdge,
  type Edge,
  type Params,
  type PlainEdge,
  type SmoothEdge,
  type SmoothForward,
  type SmoothInverse,
  type SmoothSpec,
  type SwitchEdge,
  type ViewId,
} from "./graph.ts";
export {
  routeBetween,
  Route,
  type AffineStep,
  type RouteOptions,
  type RouteStep,
  type SmoothStep,
} from "./route.ts";
// The IR a smooth edge's function is parsed into (never evaluated as
// source): float64 evaluation, derivatives as programs, intervals, WGSL.
export {
  parseTransform,
  TransformParseError,
  type TransformSource,
} from "./parse.ts";
export { evaluate, type ParamValues } from "./evaluate.ts";
export {
  hessian,
  hessianProgram,
  jacobian,
  jacobianProgram,
  parameterDerivatives,
  parameterProgram,
} from "./ad.ts";
export {
  evaluateInterval,
  type Box,
  type Interval,
  type ParamRange,
} from "./interval.ts";
export { toWgsl, type WgslOptions } from "./wgsl.ts";
export type { IrProgram } from "./ir.ts";
// The compiler: a route's shape to fused WGSL with float64 centre constants.
export {
  clearCompileCache,
  compileRoute,
  type CompileOptions,
  type CompileResult,
  type CompiledRoute,
  type ParamRecord,
  type RecordLayout,
  type Refusal,
} from "./compile.ts";
