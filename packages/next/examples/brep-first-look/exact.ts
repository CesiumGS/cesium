// What a pick on a face asks of the exact surface: the point of the surface
// nearest a point near it, found by Gauss–Newton in (u, v) from the nearest
// tessellation vertex. It previews the exact queries of the overall plan's
// step 7. Lengths are metres in the b-rep's own units.
import {
  evaluateSurface,
  faceNormal,
  faceTrim,
  type BrepForm,
  type BrepMesh,
} from "../../src/brep/index.ts";

/** The most Gauss–Newton iterations. */
export const MAX_ITERATIONS = 10;

/** The nearest point of a face's surface to a point, and how it was found. */
export interface ExactPoint {
  u: number;
  v: number;
  /** On the surface, m. */
  position: [number, number, number];
  /** The unit outward normal there, or undefined at a pole. */
  normal: [number, number, number] | undefined;
  /** From the given point to `position`, m. */
  distance: number;
  iterations: number;
}

/** The (u, v) of the face's tessellation vertex nearest a point in b-rep coordinates, m. */
export function nearestVertexUv(
  mesh: BrepMesh,
  face: number,
  point: ArrayLike<number>,
): [number, number] | undefined {
  const { positions, uvs, featureIds } = mesh.faces;
  let best = -1;
  let bestDistance = Infinity;
  for (let i = 0; i < featureIds.length; i++) {
    if (featureIds[i] !== face) {
      continue;
    }
    const d = Math.hypot(
      positions[i * 3]! + mesh.origin[0]! - point[0]!,
      positions[i * 3 + 1]! + mesh.origin[1]! - point[1]!,
      positions[i * 3 + 2]! + mesh.origin[2]! - point[2]!,
    );
    if (d < bestDistance) {
      bestDistance = d;
      best = i;
    }
  }
  return best < 0 ? undefined : [uvs[best * 2]!, uvs[best * 2 + 1]!];
}

/**
 * Gauss–Newton on |S(u, v) − p|² from `start`, using the surface's ∂u and
 * ∂v, for at most 10 iterations, with (u, v) clamped to the face's domain.
 * Where ∂u and ∂v are parallel (a pole) the step is damped instead.
 */
export function nearestOnFace(
  form: BrepForm,
  face: number,
  point: ArrayLike<number>,
  start: readonly [number, number],
): ExactPoint | undefined {
  const trim = faceTrim(form, face);
  if (!trim) {
    return undefined;
  }
  const [u0, u1, v0, v1] = trim.domain;
  const surface = form.faceSurface[face]!;
  const clamp = (x: number, lo: number, hi: number) =>
    Math.min(Math.max(x, lo), hi);
  let u = clamp(start[0], u0, u1);
  let v = clamp(start[1], v0, v1);
  const residual = (a: number, b: number) => {
    const s = evaluateSurface(form, surface, a, b);
    const r = [
      s.position[0]! - point[0]!,
      s.position[1]! - point[1]!,
      s.position[2]! - point[2]!,
    ];
    return { s, r, norm: Math.hypot(r[0]!, r[1]!, r[2]!) };
  };
  let now = residual(u, v);
  let iterations = 0;
  while (iterations < MAX_ITERATIONS) {
    iterations++;
    const { du, dv } = now.s;
    const dot = (a: ArrayLike<number>, b: ArrayLike<number>) =>
      a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
    const a = dot(du, du);
    const b = dot(du, dv);
    const c = dot(dv, dv);
    const gu = dot(du, now.r);
    const gv = dot(dv, now.r);
    // Damp a nearly singular normal matrix.
    const damping = 1e-9 * Math.max(a, c, 1e-300);
    const det = (a + damping) * (c + damping) - b * b;
    if (!(Math.abs(det) > 0)) {
      break;
    }
    const stepU = -((c + damping) * gu - b * gv) / det;
    const stepV = -((a + damping) * gv - b * gu) / det;
    // Halve the step until the point is no further off.
    let scale = 1;
    let next = now;
    let nu = u;
    let nv = v;
    for (let tries = 0; tries < 6; tries++) {
      nu = clamp(u + stepU * scale, u0, u1);
      nv = clamp(v + stepV * scale, v0, v1);
      next = residual(nu, nv);
      if (next.norm <= now.norm) {
        break;
      }
      scale /= 2;
    }
    if (next.norm > now.norm) {
      break;
    }
    const moved = Math.hypot(nu - u, nv - v);
    u = nu;
    v = nv;
    now = next;
    if (moved < 1e-12 * Math.max(1, u1 - u0, v1 - v0)) {
      break;
    }
  }
  const n = faceNormal(form, face, u, v);
  return {
    u,
    v,
    position: [now.s.position[0]!, now.s.position[1]!, now.s.position[2]!],
    normal: n ? [n[0]!, n[1]!, n[2]!] : undefined,
    distance: now.norm,
    iterations,
  };
}

/** The area, m², of a face's triangles in a tessellation. */
export function faceArea(mesh: BrepMesh, face: number): number {
  const { positions, indices, featureIds } = mesh.faces;
  let twice = 0;
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t]!;
    if (featureIds[a] !== face) {
      continue;
    }
    const b = indices[t + 1]!;
    const c = indices[t + 2]!;
    const ex = positions[b * 3]! - positions[a * 3]!;
    const ey = positions[b * 3 + 1]! - positions[a * 3 + 1]!;
    const ez = positions[b * 3 + 2]! - positions[a * 3 + 2]!;
    const fx = positions[c * 3]! - positions[a * 3]!;
    const fy = positions[c * 3 + 1]! - positions[a * 3 + 1]!;
    const fz = positions[c * 3 + 2]! - positions[a * 3 + 2]!;
    twice += Math.hypot(
      ey * fz - ez * fy,
      ez * fx - ex * fz,
      ex * fy - ey * fx,
    );
  }
  return twice / 2;
}

/** The length, m, of an edge's polyline in a tessellation. */
export function edgeLength(mesh: BrepMesh, edge: number): number {
  const { positions, indices, featureIds } = mesh.edges;
  let length = 0;
  for (let i = 0; i < indices.length; i += 2) {
    const a = indices[i]!;
    if (featureIds[a] !== edge) {
      continue;
    }
    const b = indices[i + 1]!;
    length += Math.hypot(
      positions[b * 3]! - positions[a * 3]!,
      positions[b * 3 + 1]! - positions[a * 3 + 1]!,
      positions[b * 3 + 2]! - positions[a * 3 + 2]!,
    );
  }
  return length;
}
