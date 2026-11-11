// Geometry queries per object (overall plan §13.33): one interface that a
// mesh, a b-rep and an implicit surface each answer, with the accuracy of
// every answer. Meshes, b-reps and distance fields. A draft before the API
// review.
export type {
  ClipFilter,
  ClosestPoint,
  ClosestPointOptions,
  DisplayMesh,
  EntityInfo,
  EntityKind,
  EntityRef,
  GeometryAccuracy,
  GeometryBounds,
  GeometryHit,
  GeometryKind,
  GeometryQueries,
  GeometryRayAnswer,
  RayHitOptions,
  SegmentDistance,
} from "./query.ts";
export {
  brepGeometry,
  type BrepGeometry,
  type BrepGeometryOptions,
  type PickHint,
  type RefinedPick,
} from "./brep.ts";
export {
  meshGeometry,
  type MeshGeometryOptions,
  type MeshSource,
} from "./mesh.ts";
export {
  sdfGeometry,
  type DistanceField,
  type SdfGeometryOptions,
} from "./sdf.ts";
