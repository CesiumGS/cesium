/**
 * @cesium/core/internal: the names @cesium/core's lockstep siblings import that its
 * entry point doesn't publish (CS-883). Outside the stable API: not for
 * applications, and it may change in any release.
 *
 * @internal
 * @packageDocumentation
 */
export {
  NonAffineRouteError,
  curvilinearForward,
  curvilinearInverse,
  curvilinearScaleOf,
  curvilinearValuesOf,
  routeForward,
  routeInverse,
  routeIsAffine,
} from "./camera/route.ts";
export type {
  CurvilinearFrameSpec,
  CurvilinearMap,
  CurvilinearScale,
  Route,
  RouteStep,
} from "./camera/route.ts";
export { sha256Hex } from "./io/sha256.ts";
export {
  C,
  EARTH_ROTATION_RATE,
  GM_EARTH,
  GM_MOON,
  GM_SUN,
  L_C,
} from "./math/constants.ts";
export {
  copy,
  identity,
  invertAffine,
  mat4,
  multiply,
  transformPoint,
} from "./math/mat4.ts";
export type { Mat4 } from "./math/mat4.ts";
export {
  eastNorthUpToFixedFrame,
  isOnPolarAxis,
  rigidMatrixError,
} from "./math/transforms.ts";
export { vec3 } from "./math/vec3.ts";
export type { Vec3 } from "./math/vec3.ts";
export { isCentered, projectThrough, projectToPixel } from "./scene/Camera.ts";
export { routeMap } from "./scene/curvilinearBounds.ts";
export type {
  CurvilinearTerm,
  CurvilinearTerms,
  TermWeight,
} from "./scene/curvilinearTerms.ts";
export { TilesetBodyError, tilesetBody } from "./streaming/tilesetBody.ts";
export {
  obbDistanceSquaredTo,
  sphereDistance,
  volumeObb,
} from "./streaming/volumes.ts";
export type { TileVolume } from "./streaming/volumes.ts";
export { congruence } from "./transform/accuracy.ts";
export type { EdgeAccuracy } from "./transform/accuracy.ts";
export {
  TransformGraph,
  TransformNode,
  affine,
  curvilinear,
  switchEdge,
} from "./transform/graph.ts";
export type {
  CurvilinearSpec,
  Edge,
  PlainEdge,
  ViewId,
} from "./transform/graph.ts";
