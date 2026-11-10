// A triangle mesh as a geometry (brep 3): the query interface over positions,
// indices and a placing matrix. Triangles that cannot be a surface (an index
// past the vertex count, a repeated corner, no area) are skipped by every
// query. Vertices are placed in float64 as `m·p + (t − origin)`, so a mesh
// far from the coordinates' origin keeps its precision when given an origin.
import type { QueryRay } from "../query/queries.ts";
import type {
  ClosestPoint,
  ClosestPointOptions,
  DisplayMesh,
  EntityInfo,
  EntityRef,
  GeometryAccuracy,
  GeometryBounds,
  GeometryQueries,
  GeometryRayAnswer,
  RayHitOptions,
  SegmentDistance,
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

/** The distance between two segments. */
export function segmentSegment(p1: V3, q1: V3, p2: V3, q2: V3): number {
  const d1 = sub(q1, p1);
  const d2 = sub(q2, p2);
  const r = sub(p1, p2);
  const a = dot(d1, d1);
  const e = dot(d2, d2);
  const f = dot(d2, r);
  const clamp = (x: number) => Math.min(1, Math.max(0, x));
  let s: number;
  let t: number;
  if (a <= 1e-18 && e <= 1e-18) {
    return Math.hypot(...r);
  }
  if (a <= 1e-18) {
    s = 0;
    t = clamp(f / e);
  } else {
    const c = dot(d1, r);
    if (e <= 1e-18) {
      t = 0;
      s = clamp(-c / a);
    } else {
      const b = dot(d1, d2);
      const denom = a * e - b * b;
      s = denom > 1e-18 ? clamp((b * f - c * e) / denom) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = clamp(-c / a);
      } else if (t > 1) {
        t = 1;
        s = clamp((b - c) / a);
      }
    }
  }
  const x: V3 = [p1[0] + d1[0] * s, p1[1] + d1[1] * s, p1[2] + d1[2] * s];
  const y: V3 = [p2[0] + d2[0] * t, p2[1] + d2[1] * t, p2[2] + d2[2] * t];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

/** Where a point's closest point on a triangle lies: a corner (0 to 2), a side (0 to 2, side k runs corner k to k + 1) or the interior. */
export type TriangleRegion =
  | { readonly region: "vertex"; readonly corner: number }
  | { readonly region: "edge"; readonly side: number }
  | { readonly region: "face" };

/** The closest point on a triangle to `p`, and the Voronoi region it lies in (Ericson, "Real-Time Collision Detection" 5.1.5). */
export function closestOnTriangle(
  p: V3,
  a: V3,
  b: V3,
  c: V3,
): { readonly point: V3 } & TriangleRegion {
  const ab = sub(b, a);
  const ac = sub(c, a);
  const ap = sub(p, a);
  const d1 = dot(ab, ap);
  const d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) {
    return { point: a, region: "vertex", corner: 0 };
  }
  const bp = sub(p, b);
  const d3 = dot(ab, bp);
  const d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) {
    return { point: b, region: "vertex", corner: 1 };
  }
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v = d1 / (d1 - d3);
    return {
      point: [a[0] + v * ab[0], a[1] + v * ab[1], a[2] + v * ab[2]],
      region: "edge",
      side: 0,
    };
  }
  const cp = sub(p, c);
  const d5 = dot(ab, cp);
  const d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) {
    return { point: c, region: "vertex", corner: 2 };
  }
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w = d2 / (d2 - d6);
    return {
      point: [a[0] + w * ac[0], a[1] + w * ac[1], a[2] + w * ac[2]],
      region: "edge",
      side: 2,
    };
  }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
    return {
      point: [
        b[0] + w * (c[0] - b[0]),
        b[1] + w * (c[1] - b[1]),
        b[2] + w * (c[2] - b[2]),
      ],
      region: "edge",
      side: 1,
    };
  }
  const denom = 1 / (va + vb + vc);
  const v = vb * denom;
  const w = vc * denom;
  return {
    point: [
      a[0] + ab[0] * v + ac[0] * w,
      a[1] + ab[1] * v + ac[1] * w,
      a[2] + ab[2] * v + ac[2] * w,
    ],
    region: "face",
  };
}

/** The distance from a point to a triangle. */
export function pointTriangle(p: V3, a: V3, b: V3, c: V3): number {
  const { point: q } = closestOnTriangle(p, a, b, c);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

/** The distance from a segment to a triangle it does not cross. */
export function segmentTriangle(p: V3, q: V3, a: V3, b: V3, c: V3): number {
  return Math.min(
    pointTriangle(p, a, b, c),
    pointTriangle(q, a, b, c),
    segmentSegment(p, q, a, b),
    segmentSegment(p, q, b, c),
    segmentSegment(p, q, c, a),
  );
}

/** The closest point on the segment `a`-`b` to `p`, and its parameter (0 at `a`, 1 at `b`). */
function pointSegment(p: V3, a: V3, b: V3): { point: V3; s: number } {
  const ab = sub(b, a);
  const len = dot(ab, ab);
  const s = len > 0 ? Math.min(1, Math.max(0, dot(sub(p, a), ab) / len)) : 0;
  return { point: [a[0] + s * ab[0], a[1] + s * ab[1], a[2] + s * ab[2]], s };
}

const edgeKey = (i: number, j: number): string =>
  i < j ? `${i}:${j}` : `${j}:${i}`;

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
  const faceRef = (t: number): EntityRef => {
    const feature = featureIds?.[indices[3 * t]!];
    return {
      kind: "face",
      index: t,
      ...(feature !== undefined && { feature }),
    };
  };

  const edgeRef = (t: number, side: number): EntityRef => {
    const face = faceRef(t);
    return {
      kind: "edge",
      index: 3 * t + side,
      ...(face.feature !== undefined && { feature: face.feature }),
    };
  };
  const vertexRef = (v: number): EntityRef => {
    const feature = featureIds?.[v];
    return {
      kind: "vertex",
      index: v,
      ...(feature !== undefined && { feature }),
    };
  };
  /** True when the placed triangle has no normal (a singular matrix). */
  const flat = (a: V3, b: V3, c: V3): boolean => {
    const n = cross(sub(b, a), sub(c, a));
    return !(Math.hypot(n[0], n[1], n[2]) > 0);
  };

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
    const to: V3 = [
      ray.to[0]! - (origin?.[0] ?? 0),
      ray.to[1]! - (origin?.[1] ?? 0),
      ray.to[2]! - (origin?.[2] ?? 0),
    ];
    const d = sub(to, from);
    let best: number | undefined;
    let bestTriangle = -1;
    for (let t = 0; t < triangleCount; t++) {
      if (!usable[t]) {
        continue;
      }
      const ta = corner(placed, indices[3 * t]!);
      const tb = corner(placed, indices[3 * t + 1]!);
      const tc = corner(placed, indices[3 * t + 2]!);
      const hit = hitTriangle(from, d, ta, tb, tc);
      if (
        hit === undefined ||
        !(hit >= tMin && hit <= tMax) ||
        flat(ta, tb, tc)
      ) {
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

  const toRelative = (
    point: ArrayLike<number>,
    origin?: ArrayLike<number>,
  ): V3 => [
    point[0]! - (origin?.[0] ?? 0),
    point[1]! - (origin?.[1] ?? 0),
    point[2]! - (origin?.[2] ?? 0),
  ];

  const closestPoint = (
    point: ArrayLike<number>,
    o: ClosestPointOptions = {},
  ): ClosestPoint | undefined => {
    const kinds = o.kinds ?? ["face", "edge", "vertex"];
    const wantFace = kinds.includes("face");
    const wantEdge = kinds.includes("edge");
    const wantVertex = kinds.includes("vertex");
    if (!wantFace && !wantEdge && !wantVertex) {
      return undefined;
    }
    const origin = o.origin;
    const placed = place(origin);
    const p = toRelative(point, origin);
    let best = Infinity;
    let at: V3 | undefined;
    let entity: EntityRef | undefined;
    let face = -1;
    const offer = (q: V3, ref: EntityRef, t: number): void => {
      const dist = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
      if (dist < best) {
        best = dist;
        at = q;
        entity = ref;
        face = t;
      }
    };
    for (let t = 0; t < triangleCount; t++) {
      if (!usable[t]) {
        continue;
      }
      const ids = [indices[3 * t]!, indices[3 * t + 1]!, indices[3 * t + 2]!];
      const [a, b, c] = ids.map((v) => corner(placed, v)) as [V3, V3, V3];
      if (flat(a, b, c)) {
        continue;
      }
      const cs = [a, b, c];
      if (wantFace) {
        // The most specific kind allowed: a vertex or an edge of the face
        // lies on the face itself.
        const r = closestOnTriangle(p, a, b, c);
        if (r.region === "vertex" && wantVertex) {
          offer(r.point, vertexRef(ids[r.corner]!), t);
        } else if (r.region === "vertex" && wantEdge) {
          // A corner ends two sides: take side 0 for corners 0 and 1, side 1 for corner 2.
          offer(r.point, edgeRef(t, r.corner === 2 ? 1 : 0), t);
        } else if (r.region === "edge" && wantEdge) {
          offer(r.point, edgeRef(t, r.side), t);
        } else {
          offer(r.point, faceRef(t), t);
        }
        continue;
      }
      for (let side = 0; side < 3; side++) {
        const next = (side + 1) % 3;
        if (wantEdge) {
          const { point: q, s } = pointSegment(p, cs[side]!, cs[next]!);
          if (wantVertex && (s === 0 || s === 1)) {
            offer(q, vertexRef(ids[s === 0 ? side : next]!), t);
          } else {
            offer(q, edgeRef(t, side), t);
          }
        } else {
          offer(cs[side]!, vertexRef(ids[side]!), t);
        }
      }
    }
    if (at === undefined || entity === undefined) {
      return undefined;
    }
    if (o.maxDistance !== undefined && best > o.maxDistance) {
      return undefined;
    }
    const position = Float64Array.from(
      [0, 1, 2],
      (i) => at![i]! + (origin?.[i] ?? 0),
    );
    if (entity.kind !== "face") {
      return { position, distance: best, entity, accuracy };
    }
    const a = corner(placed, indices[3 * face]!);
    const n = cross(
      sub(corner(placed, indices[3 * face + 1]!), a),
      sub(corner(placed, indices[3 * face + 2]!), a),
    );
    const length = Math.hypot(n[0], n[1], n[2]);
    const flip = dot(n, sub(p, a)) < 0 ? -1 : 1;
    const normal = Float64Array.from(n, (x) => (flip * x) / length);
    return { position, distance: best, entity, normal, accuracy };
  };

  const segmentDistance = (
    from: ArrayLike<number>,
    to: ArrayLike<number>,
    o: { readonly origin?: ArrayLike<number> } = {},
  ): SegmentDistance => {
    const placed = place(o.origin);
    const p = toRelative(from, o.origin);
    const q = toRelative(to, o.origin);
    const d = sub(q, p);
    let best = Infinity;
    for (let t = 0; t < triangleCount && best > 0; t++) {
      if (!usable[t]) {
        continue;
      }
      const a = corner(placed, indices[3 * t]!);
      const b = corner(placed, indices[3 * t + 1]!);
      const c = corner(placed, indices[3 * t + 2]!);
      best = Math.min(
        best,
        hitTriangle(p, d, a, b, c) !== undefined
          ? 0
          : segmentTriangle(p, q, a, b, c),
      );
    }
    return { distance: best, accuracy };
  };

  // Which usable faces use each edge (keyed by the sorted vertex pair) and
  // each vertex: built on the first `entity` call.
  let edgeFaces: Map<string, number[]> | undefined;
  let vertexFaces: Map<number, number[]> | undefined;
  const topology = (): void => {
    if (edgeFaces !== undefined) {
      return;
    }
    edgeFaces = new Map();
    vertexFaces = new Map();
    for (let t = 0; t < triangleCount; t++) {
      if (!usable[t]) {
        continue;
      }
      for (let side = 0; side < 3; side++) {
        const i = indices[3 * t + side]!;
        const j = indices[3 * t + ((side + 1) % 3)]!;
        const key = edgeKey(i, j);
        edgeFaces.set(key, [...(edgeFaces.get(key) ?? []), t]);
        vertexFaces.set(i, [...(vertexFaces.get(i) ?? []), t]);
      }
    }
  };

  const entity = (ref: EntityRef): EntityInfo | undefined => {
    if (!Number.isInteger(ref.index)) {
      return undefined;
    }
    const placed = place();
    const point = (v: number): Float64Array =>
      Float64Array.from(corner(placed, v));
    if (ref.kind === "face") {
      if (!usable[ref.index]) {
        return undefined;
      }
      const t = ref.index;
      return {
        ref: faceRef(t),
        points: [0, 1, 2].map((c) => point(indices[3 * t + c]!)),
        faces: [faceRef(t)],
      };
    }
    topology();
    if (ref.kind === "edge") {
      const t = Math.floor(ref.index / 3);
      if (!(ref.index >= 0) || !usable[t]) {
        return undefined;
      }
      const side = ref.index % 3;
      const i = indices[3 * t + side]!;
      const j = indices[3 * t + ((side + 1) % 3)]!;
      return {
        ref: edgeRef(t, side),
        points: [point(i), point(j)],
        faces: edgeFaces!.get(edgeKey(i, j))!.map(faceRef),
      };
    }
    const faces = vertexFaces!.get(ref.index);
    if (faces === undefined) {
      return undefined;
    }
    return {
      ref: vertexRef(ref.index),
      points: [point(ref.index)],
      faces: faces.map(faceRef),
    };
  };

  return {
    kind: "mesh",
    version: options.version ?? 0,
    bounds,
    rayHit,
    closestPoint,
    segmentDistance,
    entity,
    display,
  };
}
