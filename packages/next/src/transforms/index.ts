// The built-in generic curvilinear transforms (docs/design/transform-graph.md): each is a
// descriptor (float64 TS with its analytic Jacobian, the restricted-JS
// source the compiler parses, the linear parameters) and a constructor that
// returns the `curvilinear` edge for the graph.
export {
  checkParams,
  defaultParams,
  edgeOf,
  type Named,
  type ParamSpec,
  type TransformDescriptor,
} from "./descriptor.ts";
export {
  scaleAbout,
  scaleAboutDescriptor,
  scaleAboutEdge,
  type ScaleAbout,
  type ScaleAboutOptions,
} from "./scaleAbout.ts";
export {
  LiveCurvilinearMap,
  liveCurvilinearMap,
  type ChangeableCurvilinearMap,
} from "./liveCurvilinearMap.ts";
export { LiveEdge, liveEdge, type LiveEdgeOptions } from "./liveEdge.ts";
export { blend, type BlendedCurvilinearMap } from "./blend.ts";
export {
  fromFunction,
  type FromFunctionOptions,
  type FunctionCurvilinearMap,
  type PointFunction,
} from "./fromFunction.ts";
export { scaleAlongAxes, scaleAlongAxesDescriptor } from "./scaleAlongAxes.ts";
export { bump, bumpDescriptor } from "./bump.ts";
export { bend, bendDescriptor } from "./bend.ts";
export { twist, twistDescriptor } from "./twist.ts";
export { taper, taperDescriptor } from "./taper.ts";
export {
  displacementName,
  lattice,
  latticeDescriptor,
  type Degree,
} from "./lattice.ts";
export {
  radialDistortion,
  radialDistortionDescriptor,
} from "./radialDistortion.ts";
export {
  corridorUnroll,
  corridorUnrollDescriptor,
  type CorridorElement,
  type CorridorOptions,
} from "./corridorUnroll.ts";
export { velocityModel, velocityModelDescriptor } from "./velocityModel.ts";
