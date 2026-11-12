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
  type EdgeVisit,
  type RouteOptions,
  type RouteStep,
  type SmoothStep,
} from "./route.ts";
// Queries on a route: accuracy along it, Taylor-model bounds over a box,
// and the chord error of a straight edge.
export {
  accuracyAlong,
  congruence,
  isotropic,
  type AccuracyOptions,
  type AccuracyPart,
  type EdgeAccuracy,
  type EdgeQuery,
  type RouteAccuracy,
  type SigmaIn,
} from "./accuracy.ts";
export {
  chordErrorBound,
  taylorBounds,
  type BoundsBox,
  type TaylorBounds,
  type TaylorOptions,
  type TaylorRefusal,
} from "./taylorBounds.ts";
export {
  chordError,
  curvatureAt,
  curvatureOver,
  subdivisionFor,
} from "./curvature.ts";
export {
  measureIn,
  pointIn,
  singularRange,
  type MeasureIn,
  type MeasureInOptions,
  type NodePoint,
  type PointIn,
  type PointInOptions,
} from "./queries.ts";
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
