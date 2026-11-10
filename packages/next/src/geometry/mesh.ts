// A triangle mesh as a geometry (brep 3): the query interface over positions,
// indices and a placing matrix. Triangles that cannot be a surface (an index
// past the vertex count, a repeated corner, no area) are skipped by every
// query. Vertices are placed in float64 as `m·p + (t − origin)`, so a mesh
// far from the coordinates' origin keeps its precision when given an origin.
import type { QueryRay } from "../query/queries.ts";
import type {
  DisplayMesh,
  EntityInfo,
  EntityRef,
  GeometryAccuracy,
  GeometryBounds,
  GeometryQueries,
  GeometryRayAnswer,
  RayHitOptions,
} from "./query.ts";

export interface MeshSource {
  readonly positions: Float32Array;
  readonly indices: Uint32Array;
  /** Column-major 4x4 placing `positions` (default identity). `TileGeometry` satisfies this type. */
  readonly matrix?: Float64Array;
  /** One feature ID per vertex: a hit's entity takes its first corner's. */
  readonly featureIds?: Uint32Array;
}

export interface MeshGeometryOptions {
  /** How far the mesh may be from what it stands for, m (default 0: the mesh is the geometry). */
  readonly error?: number;
  readonly note?: string;
  readonly version?: number;
}

export type V3 = [number, number, number];

export const sub = (a: ArrayLike<number>, b: ArrayLike<number>): V3 => [
  a[0]! - b[0]!,
  a[1]! - b[1]!,
  a[2]! - b[2]!,
];
export const dot = (a: ArrayLike<number>, b: ArrayLike<number>): number =>
  a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
export const cross = (a: ArrayLike<number>, b: ArrayLike<number>): V3 => [
  a[1]! * b[2]! - a[2]! * b[1]!,
  a[2]! * b[0]! - a[0]! * b[2]!,
  a[0]! * b[1]! - a[1]! * b[0]!,
];

/** The segment's parameter at the triangle (Möller–Trumbore), or undefined. */
export function hitTriangle(
  from: ArrayLike<number>,
  d: ArrayLike<number>,
  a: V3,
  b: V3,
  c: V3,
): number | undefined {
  const e1 = sub(b, a);
  const e2 = sub(c, a);
  const p = cross(d, e2);
  const det = dot(e1, p);
  if (Math.abs(det) < 1e-18) {
    return undefined;
  }
  const inv = 1 / det;
  const s = sub(from, a);
  const u = dot(s, p) * inv;
  if (u < 0 || u > 1) {
    return undefined;
  }
  const q = cross(s, e1);
  const v = dot(d, q) * inv;
  if (v < 0 || u + v > 1) {
    return undefined;
  }
  const t = dot(e2, q) * inv;
  return t >= 0 && t <= 1 ? t : undefined;
}

const IDENTITY = Float64Array.from([
  1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
]);

/** `source` as a geometry: kind `"mesh"`, exact up to `options.error`. */
export function meshGeometry(
  source: MeshSource,
  options: MeshGeometryOptions = {},
): GeometryQueries {
  const { positions, indices, featureIds } = source;
  const matrix = source.matrix ?? IDENTITY;
  const error = options.error ?? 0;
  const accuracy: GeometryAccuracy = {
    meters: error,
    exact: error === 0,
    note: options.note ?? "the mesh as stored (float32 positions)",
  };
  const vertexCount = Math.floor(positions.length / 3);
  const triangleCount = Math.floor(indices.length / 3);

  // The triangles that can be a surface: indices in range, three distinct
  // corners, and a nonzero area in the mesh's own coordinates.
  const usable = new Uint8Array(triangleCount);
  for (let t = 0; t < triangleCount; t++) {
    const i = indices[3 * t]!;
    const j = indices[3 * t + 1]!;
    const k = indices[3 * t + 2]!;
    if (
      i >= vertexCount ||
      j >= vertexCount ||
      k >= vertexCount ||
      i === j ||
      j === k ||
      i === k
    ) {
      continue;
    }
    const n = cross(
      sub(positions.subarray(3 * j), positions.subarray(3 * i)),
      sub(positions.subarray(3 * k), positions.subarray(3 * i)),
    );
    if (n[0] * n[0] + n[1] * n[1] + n[2] * n[2] > 0) {
      usable[t] = 1;
    }
  }

  /** Every vertex placed, relative to `origin` (none: the matrix's own translation). */
  const place = (origin?: ArrayLike<number>): Float64Array => {
    const m = matrix;
    const tx = m[12]! - (origin?.[0] ?? 0);
    const ty = m[13]! - (origin?.[1] ?? 0);
    const tz = m[14]! - (origin?.[2] ?? 0);
    const out = new Float64Array(vertexCount * 3);
    for (let v = 0; v < vertexCount; v++) {
      const x = positions[3 * v]!;
      const y = positions[3 * v + 1]!;
      const z = positions[3 * v + 2]!;
      out[3 * v] = m[0]! * x + m[4]! * y + m[8]! * z + tx;
      out[3 * v + 1] = m[1]! * x + m[5]! * y + m[9]! * z + ty;
      out[3 * v + 2] = m[2]! * x + m[6]! * y + m[10]! * z + tz;
    }
    return out;
  };
  const corner = (placed: Float64Array, v: number): V3 => [
    placed[3 * v]!,
    placed[3 * v + 1]!,
    placed[3 * v + 2]!,
  ];
  const faceRef = (t: number): EntityRef =>
    featureIds === undefined
      ? { kind: "face", index: t }
      : { kind: "face", index: t, feature: featureIds[indices[3 * t]!]! };

  const bounds = (): GeometryBounds => {
    const placed = place();
    const min = new Float64Array([Infinity, Infinity, Infinity]);
    const max = new Float64Array([-Infinity, -Infinity, -Infinity]);
    for (let t = 0; t < triangleCount; t++) {
      if (!usable[t]) {
        continue;
      }
      for (let c = 0; c < 3; c++) {
        const v = indices[3 * t + c]!;
        for (let a = 0; a < 3; a++) {
          min[a] = Math.min(min[a]!, placed[3 * v + a]!);
          max[a] = Math.max(max[a]!, placed[3 * v + a]!);
        }
      }
    }
    if (min[0]! > max[0]!) {
      // No surface: an empty box at the mesh's own origin.
      const at = Float64Array.from([matrix[12]!, matrix[13]!, matrix[14]!]);
      return { min: at, max: Float64Array.from(at), accuracy };
    }
    return { min, max, accuracy };
  };

  const rayHit = (ray: QueryRay, o: RayHitOptions = {}): GeometryRayAnswer => {
    const origin = o.origin;
    const tMin = o.tMin ?? 0;
    const tMax = o.tMax ?? 1;
    const placed = place(origin);
    const from: V3 = [
      ray.from[0]! - (origin?.[0] ?? 0),
      ray.from[1]! - (origin?.[1] ?? 0),
      ray.from[2]! - (origin?.[2] ?? 0),
    ];
    const d = sub(ray.to, ray.from);
    let best: number | undefined;
    let bestTriangle = -1;
    for (let t = 0; t < triangleCount; t++) {
      if (!usable[t]) {
        continue;
      }
      const hit = hitTriangle(
        from,
        d,
        corner(placed, indices[3 * t]!),
        corner(placed, indices[3 * t + 1]!),
        corner(placed, indices[3 * t + 2]!),
      );
      if (hit === undefined || hit < tMin || hit > tMax) {
        continue;
      }
      if (best === undefined || hit < best) {
        best = hit;
        bestTriangle = t;
        if (o.anyHit) {
          break;
        }
      }
    }
    if (best === undefined) {
      return { verdict: "miss", accuracy };
    }
    const a = corner(placed, indices[3 * bestTriangle]!);
    const b = corner(placed, indices[3 * bestTriangle + 1]!);
    const c = corner(placed, indices[3 * bestTriangle + 2]!);
    const n = cross(sub(b, a), sub(c, a));
    const length = Math.hypot(n[0], n[1], n[2]);
    const flip = dot(n, d) > 0 ? -1 : 1;
    const normal = Float64Array.from(n, (x) => (flip * x) / length);
    const position = Float64Array.from(
      [0, 1, 2],
      (i) => from[i]! + best! * d[i]! + (origin?.[i] ?? 0),
    );
    return {
      verdict: "hit",
      hit: {
        t: best,
        position,
        normal,
        entity: faceRef(bestTriangle),
        accuracy,
      },
    };
  };

  const display = (): DisplayMesh => ({
    positions,
    indices,
    matrix,
    error,
  });

  const later = (): never => {
    throw new Error("meshGeometry: not yet");
  };

  return {
    kind: "mesh",
    version: options.version ?? 0,
    bounds,
    rayHit,
    closestPoint: later,
    segmentDistance: later,
    entity: later as (ref: EntityRef) => EntityInfo | undefined,
    display,
  };
}
