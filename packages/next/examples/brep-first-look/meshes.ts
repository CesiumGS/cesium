// Mesh helpers of the B-reps gallery example: what the display modes draw
// from a tessellation (its triangle edges, per-triangle normals) and how its
// lines are lifted off the faces. Positions are relative to the mesh's own
// origin, as the tessellator's are, and lengths are metres in the b-rep's own
// units.
import {
  evaluateCurve2,
  faceNormal,
  type BrepForm,
  type BrepMesh,
} from "../../src/brep/index.ts";

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

/** One use of an edge by a face: the face, its pcurve segments and its direction. */
interface EdgeUse {
  face: number;
  first: number;
  count: number;
  reversed: boolean;
}

/** The uses of every edge, by edge index. */
function edgeUses(form: BrepForm): EdgeUse[][] {
  const uses: EdgeUse[][] = Array.from(
    { length: form.edgeVertices.length / 2 },
    () => [],
  );
  for (let face = 0; face < form.faceSurface.length; face++) {
    const firstLoop = form.faceLoops[face * 2]!;
    for (
      let l = firstLoop;
      l < firstLoop + form.faceLoops[face * 2 + 1]!;
      l++
    ) {
      const firstUse = form.loopUses[l * 2]!;
      for (let u = firstUse; u < firstUse + form.loopUses[l * 2 + 1]!; u++) {
        uses[form.useEdge[u]!]!.push({
          face,
          first: form.usePcurve[u * 2]!,
          count: form.usePcurve[u * 2 + 1]!,
          reversed: form.useReversed[u] === 1,
        });
      }
    }
  }
  return uses;
}

/**
 * The b-rep edges as drawn: each point of the tessellated polyline lifted by
 * `lift` along the sum of the normals of the faces that use the edge, taken
 * where the use's pcurve is at the same fraction of the polyline's length.
 * A box's edge lifts diagonally, clear of both faces. Lines take no depth
 * bias, so this is what keeps them in view.
 */
export function liftedEdges(
  form: BrepForm,
  mesh: BrepMesh,
  lift: number,
): LineMesh {
  const { positions, indices, featureIds } = mesh.edges;
  const lifted = Float32Array.from(positions);
  const uses = edgeUses(form);
  const count = featureIds.length;
  for (let start = 0; start < count;) {
    const edge = featureIds[start]!;
    let end = start;
    while (end < count && featureIds[end] === edge) {
      end++;
    }
    // Fractions along the run, by chord length.
    const along = new Float64Array(end - start);
    for (let i = start + 1; i < end; i++) {
      along[i - start] =
        along[i - start - 1]! +
        Math.hypot(
          positions[i * 3]! - positions[i * 3 - 3]!,
          positions[i * 3 + 1]! - positions[i * 3 - 2]!,
          positions[i * 3 + 2]! - positions[i * 3 - 1]!,
        );
    }
    const total = along[end - start - 1]!;
    for (let i = start; i < end; i++) {
      const s = total > 0 ? along[i - start]! / total : 0;
      let x = 0;
      let y = 0;
      let z = 0;
      for (const use of uses[edge]!) {
        const f = use.reversed ? 1 - s : s;
        const scaled = Math.min(f * use.count, use.count - 1e-9);
        const segment = Math.floor(scaled);
        const uv = evaluateCurve2(
          form,
          use.first + segment,
          scaled - segment,
        ).position;
        const n = faceNormal(form, use.face, uv[0]!, uv[1]!);
        if (n) {
          x += n[0]!;
          y += n[1]!;
          z += n[2]!;
        }
      }
      const length = Math.hypot(x, y, z);
      if (length > 0) {
        lifted[i * 3] = lifted[i * 3]! + (x / length) * lift;
        lifted[i * 3 + 1] = lifted[i * 3 + 1]! + (y / length) * lift;
        lifted[i * 3 + 2] = lifted[i * 3 + 2]! + (z / length) * lift;
      }
    }
    start = end;
  }
  return {
    positions: lifted,
    indices: Uint32Array.from(indices),
    featureIds: Uint32Array.from(featureIds),
  };
}
