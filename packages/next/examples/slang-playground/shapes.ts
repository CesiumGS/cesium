import type { MeshData } from "../../src/index.ts";

/**
 * Shader-ball shapes for the playground, z up, in meters: a UV sphere and a
 * plane, with normals, texture coordinates (0 to 1) and tangents (xyz and
 * handedness), so shaders that read UVs or perturb normals work on them.
 */

/** A sphere of radius 1 around the origin: `rings` by `segments` quads. */
export function sphere(rings = 64, segments = 128): MeshData {
  const count = (rings + 1) * (segments + 1);
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const tangents = new Float32Array(count * 4);
  let v = 0;
  for (let r = 0; r <= rings; r++) {
    const theta = (r / rings) * Math.PI; // from the north pole
    for (let s = 0; s <= segments; s++, v++) {
      const phi = (s / segments) * 2 * Math.PI;
      const x = Math.sin(theta) * Math.cos(phi);
      const y = Math.sin(theta) * Math.sin(phi);
      const z = Math.cos(theta);
      positions.set([x, y, z], v * 3);
      normals.set([x, y, z], v * 3);
      uvs.set([s / segments, r / rings], v * 2);
      // Along increasing u (east), right-handed with the normal.
      tangents.set([-Math.sin(phi), Math.cos(phi), 0, 1], v * 4);
    }
  }
  const indices = new Uint32Array(rings * segments * 6);
  let i = 0;
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segments; s++) {
      const a = r * (segments + 1) + s;
      const b = a + segments + 1;
      // Counter-clockwise seen from outside.
      indices.set([a, b, a + 1, a + 1, b, b + 1], i);
      i += 6;
    }
  }
  return { positions, normals, uvs, tangents, indices };
}

/** A square of side 2 in the xy plane, facing +z, `n` by `n` quads. */
export function plane(n = 64): MeshData {
  const count = (n + 1) * (n + 1);
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const tangents = new Float32Array(count * 4);
  let v = 0;
  for (let j = 0; j <= n; j++) {
    for (let k = 0; k <= n; k++, v++) {
      positions.set([(k / n) * 2 - 1, (j / n) * 2 - 1, 0], v * 3);
      normals.set([0, 0, 1], v * 3);
      uvs.set([k / n, 1 - j / n], v * 2);
      tangents.set([1, 0, 0, 1], v * 4);
    }
  }
  const indices = new Uint32Array(n * n * 6);
  let i = 0;
  for (let j = 0; j < n; j++) {
    for (let k = 0; k < n; k++) {
      const a = j * (n + 1) + k;
      const b = a + n + 1;
      indices.set([a, a + 1, b, a + 1, b + 1, b], i);
      i += 6;
    }
  }
  return { positions, normals, uvs, tangents, indices };
}
