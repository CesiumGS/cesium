// The engine's own b-rep render form (overall plan §13.33): plain typed
// arrays, so it moves between workers without copying and a host with its
// own kernel can write it directly. Every surface is analytic, with a fixed
// parameterization, or a list of rational Bézier patches. Lengths are metres
// and angles are radians. A draft before the placement review.

/**
 * Surface kinds. Analytic kinds use the parameterizations below; Bézier
 * surfaces are lists of patches. With frame origin `o`, axes `x` and `y`, and
 * `z = x × y` (u and v in radians where angular, metres otherwise):
 *
 * - Plane: `P = o + u·x + v·y`.
 * - Cylinder: `P = o + r(cos u·x + sin u·y) + v·z`.
 * - Cone: `P = o + (r + v·tan a)(cos u·x + sin u·y) + v·z`.
 * - Sphere: `P = o + r(cos v(cos u·x + sin u·y) + sin v·z)`. u is longitude, v latitude.
 * - Torus: `P = o + (R + r·cos v)(cos u·x + sin u·y) + r·sin v·z`.
 * - Bézier: the patch whose domain holds (u, v). The patch's local parameters
 *   are `s = (u − u0)/(u1 − u0)` and `t = (v − v0)/(v1 − v0)`. A point on a
 *   shared boundary takes the lower-index patch.
 */
export const enum SurfaceKind {
  Plane = 0,
  Cylinder = 1,
  Cone = 2,
  Sphere = 3,
  Torus = 4,
  Bezier = 5,
}

/** Rational Bézier curve segments of degree 1 to 3, in 2D or 3D. */
export interface BezierCurves {
  /** Per segment, 1 to 3. */
  readonly degree: Uint8Array;
  /** Per segment: its first control point (in points, not floats). */
  readonly first: Uint32Array;
  /** (dimension + 1) per point, homogeneous: x·w, y·w, (z·w,) w; w > 0. */
  readonly points: Float64Array;
}

/** A boundary representation as typed arrays. */
export interface BrepForm {
  /** The content version: goes up when the geometry changes. */
  readonly version: number;

  // Surfaces, one entry each.
  readonly surfaceKind: Uint8Array;
  /** 9 per surface: origin (3, m), x axis (3), y axis (3), unit and orthogonal; z = x × y. Unused for Bézier. */
  readonly surfaceFrame: Float64Array;
  /** 2 per surface: Cylinder [r, 0]; Cone [r at v = 0, half-angle]; Sphere [r, 0]; Torus [major R, minor r]; else 0. Metres and radians. */
  readonly surfaceParams: Float64Array;
  /** 2 per surface: [first patch, patch count]; Bézier only, else [0, 0]. */
  readonly surfacePatches: Uint32Array;

  // Rational Bézier patches.
  /** 2 per patch: degree in u, degree in v (1 to 7). */
  readonly patchDegree: Uint8Array;
  /** Per patch: index of its first control point in patchPoints (in points, not floats). Points run u fastest. */
  readonly patchFirst: Uint32Array;
  /** 4 per control point, homogeneous: x·w, y·w, z·w, w (w > 0). Metres. */
  readonly patchPoints: Float64Array;
  /** 4 per patch: u0, u1, v0, v1, its span in its surface's parameter space. */
  readonly patchDomain: Float64Array;

  // Faces.
  readonly faceSurface: Uint32Array;
  /** 1 when the face's outward normal is −(∂u × ∂v), else 0. */
  readonly faceReversed: Uint8Array;
  /** 2 per face: [first loop, loop count]. A face's first loop is its outer loop. */
  readonly faceLoops: Uint32Array;

  /** 2 per loop: [first use, use count]. Uses run in order around the loop: outer loops counter-clockwise in (u, v), inner loops clockwise. */
  readonly loopUses: Uint32Array;

  // Edge uses (coedges).
  readonly useEdge: Uint32Array;
  /** 1 when the use runs from the edge's end vertex to its start. */
  readonly useReversed: Uint8Array;
  /** 2 per use: [first segment, segment count] in curves2. Already in the use's direction. */
  readonly usePcurve: Uint32Array;

  // Edges.
  /** 2 per edge: start vertex, end vertex. */
  readonly edgeVertices: Uint32Array;
  /** 2 per edge: [first segment, segment count] in curves3, start to end. */
  readonly edgeCurve: Uint32Array;
  /** Per edge: how far its curve and its uses' images may be apart, m. */
  readonly edgeTolerance: Float32Array;

  // Vertices.
  /** 3 per vertex, m. */
  readonly vertexPosition: Float64Array;
  /** Per vertex: how far the vertex may be from its edges' ends, m. */
  readonly vertexTolerance: Float32Array;

  /** Curve segments in 2D (u, v), rational Bézier, degree 1 to 3. */
  readonly curves2: BezierCurves;
  /** Curve segments in 3D, rational Bézier, degree 1 to 3. */
  readonly curves3: BezierCurves;

  /** Stable source IDs: faces, then edges, then vertices. An empty string means none. */
  readonly ids: readonly string[];
}

/** The number of faces. */
export function faceCount(form: BrepForm): number {
  return form.faceSurface.length;
}

/** The number of edges. */
export function edgeCount(form: BrepForm): number {
  return form.edgeVertices.length / 2;
}

/** The number of vertices. */
export function vertexCount(form: BrepForm): number {
  return form.vertexPosition.length / 3;
}

/** The number of surfaces. */
export function surfaceCount(form: BrepForm): number {
  return form.surfaceKind.length;
}
