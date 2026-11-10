// Geometry queries per object (overall plan §13.33): one interface that a
// mesh, a b-rep and an implicit surface each answer, with the accuracy of
// every answer. Meshes and distance fields today; b-reps next. A draft
// before the API review.
export type {
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
  meshGeometry,
  type MeshGeometryOptions,
  type MeshSource,
} from "./mesh.ts";
export {
  sdfGeometry,
  type DistanceField,
  type SdfGeometryOptions,
} from "./sdf.ts";
