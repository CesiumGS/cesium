// What needs Cesium IR installs itself in lazyIr.ts when this loads: this
// aggregate has the IR passes at once, as the startup code (which doesn't import
// it) has them only after `loadIr()`.
import "./irPasses.ts";
export {
  affine,
  curvilinear,
  switchEdge,
  TransformGraph,
  TransformNode,
  type AffineEdge,
  type ChosenEdge,
  type Edge,
  type Params,
  type PlainEdge,
  type CurvilinearEdge,
  type CurvilinearForward,
  type CurvilinearInverse,
  type CurvilinearSpec,
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
  type CurvilinearStep,
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
// Cesium IR, which a curvilinear edge's function is parsed into (never
// evaluated as source): float64 evaluation, derivatives as programs,
// intervals, WGSL.
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
// The compiler: a route's shape to fused WGSL with float64 center constants.
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
