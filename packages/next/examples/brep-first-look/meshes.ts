// Mesh helpers of the B-reps gallery example: what the display modes draw
// from a tessellation (its triangle edges, per-triangle normals) and how its
// lines are lifted off the faces. Positions are relative to the mesh's own
// origin, as the tessellator's are, and lengths are metres in the b-rep's own
// units.
import type { BrepForm, BrepMesh } from "../../src/brep/index.ts";

/** How the faces are drawn. */
export type DisplayMode = "shaded" | "shadedWire" | "flatWire" | "wire";

/** A line list with the face or edge each vertex belongs to. */
export interface LineMesh {
  positions: Float32Array;
  indices: Uint32Array;
  featureIds: Uint32Array;
}

/** The largest extent of the bounds of a set of positions, m. */
export function boundsSize(positions: Float32Array): number {
  if (positions.length === 0) {
    return 0;
  }
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i++) {
    const k = i % 3;
    min[k] = Math.min(min[k]!, positions[i]!);
    max[k] = Math.max(max[k]!, positions[i]!);
  }
  return Math.max(max[0]! - min[0]!, max[1]! - min[1]!, max[2]! - min[2]!);
}

/** The bounds of the faces of some meshes together, m in the b-rep's units (each mesh's origin added back). */
export function meshBounds(
  meshes: ReadonlyArray<{
    faces: { positions: Float32Array };
    origin: ArrayLike<number>;
  }>,
): { min: [number, number, number]; max: [number, number, number] } {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const { faces, origin } of meshes) {
    const p = faces.positions;
    for (let i = 0; i < p.length; i++) {
      const k = i % 3;
      const v = p[i]! + origin[k]!;
      min[k] = Math.min(min[k]!, v);
      max[k] = Math.max(max[k]!, v);
    }
  }
  return { min, max };
}

/**
 * The tessellation's triangle edges, each once per face, as a line list on
 * the face's own vertices, lifted by `lift` along their normals so that the
 * lines don't fight the faces for depth.
 */
export function wireLines(mesh: BrepMesh, lift: number): LineMesh {
  const { positions, normals, indices, featureIds } = mesh.faces;
  const count = positions.length / 3;
  const seen = new Set<number>();
  const lines: number[] = [];
  const add = (a: number, b: number) => {
    const key = Math.min(a, b) * count + Math.max(a, b);
    if (!seen.has(key)) {
      seen.add(key);
      lines.push(a, b);
    }
  };
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t]!;
    const b = indices[t + 1]!;
    const c = indices[t + 2]!;
    add(a, b);
    add(b, c);
    add(c, a);
  }
  const lifted = new Float32Array(positions.length);
  for (let i = 0; i < positions.length; i++) {
    lifted[i] = positions[i]! + normals[i]! * lift;
  }
  return {
    positions: lifted,
    indices: Uint32Array.from(lines),
    featureIds: Uint32Array.from(featureIds),
  };
}

/** The faces with every triangle on its own vertices and its geometric normal: flat shading. */
export function flatFaces(mesh: BrepMesh): {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  featureIds: Uint32Array;
} {
  const { positions, normals, indices, featureIds } = mesh.faces;
  const triangles = indices.length / 3;
  const outPositions = new Float32Array(triangles * 9);
  const outNormals = new Float32Array(triangles * 9);
  const outIds = new Uint32Array(triangles * 3);
  const outIndices = new Uint32Array(triangles * 3);
  for (let t = 0; t < triangles; t++) {
    const ia = indices[t * 3]!;
    const ib = indices[t * 3 + 1]!;
    const ic = indices[t * 3 + 2]!;
    const p = (i: number, k: number) => positions[i * 3 + k]!;
    const ex = p(ib, 0) - p(ia, 0);
    const ey = p(ib, 1) - p(ia, 1);
    const ez = p(ib, 2) - p(ia, 2);
    const fx = p(ic, 0) - p(ia, 0);
    const fy = p(ic, 1) - p(ia, 1);
    const fz = p(ic, 2) - p(ia, 2);
    let nx = ey * fz - ez * fy;
    let ny = ez * fx - ex * fz;
    let nz = ex * fy - ey * fx;
    const length = Math.hypot(nx, ny, nz);
    if (length > 0) {
      nx /= length;
      ny /= length;
      nz /= length;
    } else {
      // A sliver at a pole: the vertex's own normal will do.
      nx = normals[ia * 3]!;
      ny = normals[ia * 3 + 1]!;
      nz = normals[ia * 3 + 2]!;
    }
    [ia, ib, ic].forEach((source, k) => {
      const at = t * 3 + k;
      outPositions.set(positions.subarray(source * 3, source * 3 + 3), at * 3);
      outNormals.set([nx, ny, nz], at * 3);
      outIds[at] = featureIds[source]!;
      outIndices[at] = at;
    });
  }
  return {
    positions: outPositions,
    normals: outNormals,
    indices: outIndices,
    featureIds: outIds,
  };
}

/**
 * The b-rep edges as drawn: the tessellated polylines themselves, on the
 * faces' boundaries. They are not moved off the faces: the pipeline pulls
 * every line toward the camera in depth alone (`vsLines`), so an edge wins
 * the depth test without shifting on screen, as a lift along the faces'
 * normals did (diagonally off a box's edge, further the closer the camera).
 */
export function edgeLines(mesh: BrepMesh): LineMesh {
  const { positions, indices, featureIds } = mesh.edges;
  return {
    positions: Float32Array.from(positions),
    indices: Uint32Array.from(indices),
    featureIds: Uint32Array.from(featureIds),
  };
}

/** `edgeLines`, for callers that still pass the lift it no longer applies. */
export function liftedEdges(
  _form: BrepForm,
  mesh: BrepMesh,
  _lift?: number,
): LineMesh {
  return edgeLines(mesh);
}
