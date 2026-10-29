import * as v3 from "../math/vec3.ts";
import type { Ellipsoid } from "../math/ellipsoid.ts";
import type { Vec3 } from "../math/vec3.ts";

/**
 * Mesh geometry as separate float32 attribute streams plus uint32 indices.
 * Streams are uploaded as-is and pulled by the vertex shader.
 */
export interface MeshData {
  positions: Float32Array;
  normals?: Float32Array;
  uvs?: Float32Array;
  /** Linear RGBA. */
  colors?: Float32Array;
  tangents?: Float32Array;
  indices: Uint32Array;
  /** Per-vertex local feature IDs (0xffffffff: no feature). */
  featureIds?: Uint32Array;
  /** Size of the local feature-ID space (default 1: the whole draw). */
  featureCount?: number;
  /** Default "triangle-list". Lines are drawn unlit, like 1.x. */
  topology?: "triangle-list" | "line-list";
}

/** A unit cube centered at the origin, with flat per-face normals. */
export function createBox(): MeshData {
  const faces: Array<[Vec3, Vec3, Vec3]> = [
    // normal, u axis, v axis
    [v3.vec3(1, 0, 0), v3.vec3(0, 1, 0), v3.vec3(0, 0, 1)],
    [v3.vec3(-1, 0, 0), v3.vec3(0, 0, 1), v3.vec3(0, 1, 0)],
    [v3.vec3(0, 1, 0), v3.vec3(0, 0, 1), v3.vec3(1, 0, 0)],
    [v3.vec3(0, -1, 0), v3.vec3(1, 0, 0), v3.vec3(0, 0, 1)],
    [v3.vec3(0, 0, 1), v3.vec3(1, 0, 0), v3.vec3(0, 1, 0)],
    [v3.vec3(0, 0, -1), v3.vec3(0, 1, 0), v3.vec3(1, 0, 0)],
  ];
  const positions = new Float32Array(faces.length * 4 * 3);
  const normals = new Float32Array(faces.length * 4 * 3);
  const indices = new Uint32Array(faces.length * 6);
  faces.forEach(([n, u, w], f) => {
    const corners = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ] as const;
    corners.forEach(([a, b], c) => {
      const o = (f * 4 + c) * 3;
      for (let i = 0; i < 3; i++) {
        positions[o + i] = 0.5 * (n[i]! + a * u[i]! + b * w[i]!);
        normals[o + i] = n[i]!;
      }
    });
    const base = f * 4;
    indices.set([base, base + 1, base + 2, base, base + 2, base + 3], f * 6);
  });
  return { positions, normals, indices };
}

export interface SurfacePatch extends MeshData {
  /** Float64 Earth-fixed center the vertices are relative to. */
  origin: Vec3;
  radius: number;
}

/**
 * A lat/lon grid patch of the ellipsoid surface. Vertices are stored relative
 * to the patch center so they stay small in float32.
 */
export function createSurfacePatch(
  ellipsoid: Ellipsoid,
  west: number,
  south: number,
  east: number,
  north: number,
  segments: number,
): SurfacePatch {
  const origin = ellipsoid.cartographicToCartesian(
    { longitude: (west + east) / 2, latitude: (south + north) / 2, height: 0 },
    v3.vec3(),
  );
  const n = segments + 1;
  const positions = new Float32Array(n * n * 3);
  const normals = new Float32Array(n * n * 3);
  const uvs = new Float32Array(n * n * 2);
  const p = v3.vec3();
  const normal = v3.vec3();
  const carto = { longitude: 0, latitude: 0, height: 0 };
  let radius = 0;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      carto.longitude = west + ((east - west) * i) / segments;
      carto.latitude = south + ((north - south) * j) / segments;
      ellipsoid.cartographicToCartesian(carto, p);
      ellipsoid.geodeticSurfaceNormalCartographic(carto, normal);
      const k = j * n + i;
      positions[k * 3] = p[0]! - origin[0]!;
      positions[k * 3 + 1] = p[1]! - origin[1]!;
      positions[k * 3 + 2] = p[2]! - origin[2]!;
      normals.set(normal, k * 3);
      uvs[k * 2] = i / segments;
      uvs[k * 2 + 1] = 1 - j / segments;
      radius = Math.max(radius, v3.distance(p, origin));
    }
  }
  const indices = new Uint32Array(segments * segments * 6);
  let k = 0;
  for (let j = 0; j < segments; j++) {
    for (let i = 0; i < segments; i++) {
      const a = j * n + i;
      const b = a + 1;
      const c = a + n;
      const d = c + 1;
      indices.set([a, b, d, a, d, c], k);
      k += 6;
    }
  }
  return { positions, normals, uvs, indices, origin, radius };
}
