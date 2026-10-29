import * as v3 from "../math/vec3.ts";
import type { Ellipsoid } from "../math/ellipsoid.ts";
import type { Vec3 } from "../math/vec3.ts";

/** Interleaved position/normal vertices (float32) plus uint32 indices. */
export interface MeshData {
  vertices: Float32Array;
  indices: Uint32Array;
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
  const vertices = new Float32Array(faces.length * 4 * 6);
  const indices = new Uint32Array(faces.length * 6);
  faces.forEach(([n, u, w], f) => {
    const corners = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ] as const;
    corners.forEach(([a, b], c) => {
      const o = (f * 4 + c) * 6;
      for (let i = 0; i < 3; i++) {
        vertices[o + i] = 0.5 * (n[i]! + a * u[i]! + b * w[i]!);
        vertices[o + 3 + i] = n[i]!;
      }
    });
    const base = f * 4;
    indices.set([base, base + 1, base + 2, base, base + 2, base + 3], f * 6);
  });
  return { vertices, indices };
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
  const vertices = new Float32Array(n * n * 6);
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
      const o = (j * n + i) * 6;
      vertices[o] = p[0]! - origin[0]!;
      vertices[o + 1] = p[1]! - origin[1]!;
      vertices[o + 2] = p[2]! - origin[2]!;
      vertices[o + 3] = normal[0]!;
      vertices[o + 4] = normal[1]!;
      vertices[o + 5] = normal[2]!;
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
  return { vertices, indices, origin, radius };
}
