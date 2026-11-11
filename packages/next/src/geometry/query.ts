// What a geometry answers, whatever it is made of (a triangle mesh, a b-rep).
// Rays, closest points, distances and topology come back in placed
// coordinates, m, float64, each with the accuracy of the answer. The
// scene-level queries in `src/query/queries.ts` sit above this.
import type { QueryRay } from "../query/queries.ts";

export type GeometryKind = "mesh" | "brep" | "frep";
export type EntityKind = "face" | "edge" | "vertex";

/** A face, edge or vertex of one geometry. `feature`: the source's feature ID, when it has one. */
export interface EntityRef {
  readonly kind: EntityKind;
  readonly index: number;
  readonly feature?: number;
}

/** How far an answer may be from the geometry the object stands for. */
export interface GeometryAccuracy {
  readonly meters: number;
  readonly exact: boolean;
  /** The composed terms (model tolerance, representation error, edge tolerance) and how the answer was found. */
  readonly note: string;
  /** How the answer was found, on its own (b-reps: "closed form, cylinder", "Newton on Bézier patch", …). */
  readonly route?: string;
}

export interface GeometryBounds {
  readonly min: Float64Array;
  readonly max: Float64Array;
  readonly accuracy: GeometryAccuracy;
}

export interface RayHitOptions {
  /** The part of the segment searched, as fractions from `from` to `to` (defaults 0 and 1, inclusive). */
  readonly tMin?: number;
  readonly tMax?: number;
  /** Where the arithmetic is centred, for precision far from the coordinates' origin. Inputs and outputs stay in placed coordinates. */
  readonly origin?: ArrayLike<number>;
  /** Stop at the first hit found, not the nearest. */
  readonly anyHit?: boolean;
}

export interface GeometryHit {
  readonly t: number;
  readonly position: Float64Array;
  /** Unit normal, turned to face the ray's start. */
  readonly normal: Float64Array;
  readonly entity: EntityRef;
  /** The face's surface parameters, where it has them (b-reps). */
  readonly uv?: readonly [number, number];
  readonly accuracy: GeometryAccuracy;
}

export type GeometryRayAnswer =
  | { readonly verdict: "hit"; readonly hit: GeometryHit }
  | { readonly verdict: "miss"; readonly accuracy: GeometryAccuracy }
  | {
      readonly verdict: "unknown";
      readonly reason: "notConverged" | "unsupported";
      readonly accuracy: GeometryAccuracy;
    };

export interface ClosestPointOptions {
  /** Which kinds of entity may be the answer (default all three). */
  readonly kinds?: readonly EntityKind[];
  /** Answer undefined when the closest point is farther than this, m. */
  readonly maxDistance?: number;
  readonly origin?: ArrayLike<number>;
}

export interface ClosestPoint {
  readonly position: Float64Array;
  readonly distance: number;
  readonly entity: EntityRef;
  readonly normal?: Float64Array;
  readonly uv?: readonly [number, number];
  /** Along an edge (b-reps): 0 at its start to 1 at its end, by curve segments of equal share. */
  readonly t?: number;
  readonly accuracy: GeometryAccuracy;
}

export interface SegmentDistance {
  readonly distance: number;
  readonly accuracy: GeometryAccuracy;
}

/** An entity's corner points, and the faces that use it (a face lists itself). */
export interface EntityInfo {
  readonly ref: EntityRef;
  readonly points: readonly Float64Array[];
  readonly faces: readonly EntityRef[];
}

export interface DisplayMesh {
  readonly positions: Float32Array;
  readonly indices: Uint32Array;
  readonly matrix: Float64Array;
  /** How far these triangles may be from the geometry, m. */
  readonly error: number;
}

export interface GeometryQueries {
  readonly kind: GeometryKind;
  /** The content version: goes up when the geometry changes. */
  readonly version: number;
  bounds(): GeometryBounds;
  rayHit(ray: QueryRay, options?: RayHitOptions): GeometryRayAnswer;
  closestPoint(
    point: ArrayLike<number>,
    options?: ClosestPointOptions,
  ): ClosestPoint | undefined;
  /** The least distance from the segment to the surface, in m; `Infinity` when there is no geometry. */
  segmentDistance(
    from: ArrayLike<number>,
    to: ArrayLike<number>,
    options?: { readonly origin?: ArrayLike<number> },
  ): SegmentDistance;
  entity(ref: EntityRef): EntityInfo | undefined;
  /** Triangles within `tolerance` m, or undefined when it draws only on the GPU. */
  display(tolerance: number): DisplayMesh | undefined;
}
