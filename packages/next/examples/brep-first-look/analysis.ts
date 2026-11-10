// The CAD analysis views of the B-reps gallery example: colours by surface
// kind, iso lines and normal whiskers. Positions are relative to a mesh's
// origin, as the tessellator's are, and lengths are metres in the b-rep's
// own units.
import {
  evaluateSurface,
  faceNormal,
  faceTrim,
  type BrepForm,
  type BrepMesh,
} from "../../src/brep/index.ts";
import type { LineMesh } from "./meshes.ts";

/** The names of the surface kinds, by `SurfaceKind` value. */
export const KIND_NAMES = [
  "Plane",
  "Cylinder",
  "Cone",
  "Sphere",
  "Torus",
  "Bézier",
] as const;

/**
 * The tint of each surface kind, by `SurfaceKind` value, from the Okabe–Ito
 * palette: a categorical palette chosen to stay distinguishable under the
 * common kinds of colour blindness, and to read on a light or a dark ground.
 * The faces are lit, so lightness varies too, and the legend names each.
 */
export const KIND_COLORS = [
  "#56B4E9", // plane: sky blue
  "#E69F00", // cylinder: orange
  "#009E73", // cone: bluish green
  "#CC79A7", // sphere: reddish purple
  "#F0E442", // torus: yellow
  "#D55E00", // Bézier: vermillion
] as const;

/** A "#rrggbb" colour as linear RGB, the engine's tint space. */
export function linearOf(hex: string): [number, number, number] {
  const channel = (at: number) => {
    const s = parseInt(hex.slice(at, at + 2), 16) / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return [channel(1), channel(3), channel(5)];
}

/** Iso lines per direction, and the samples each is drawn through. */
export const ISO_LINES = 8;
export const ISO_SAMPLES = 64;

/**
 * For each face, 8 u-lines and 8 v-lines across its domain (at the middles
 * of 8 equal bands, clear of the boundary), each sampled at 64 points
 * through `evaluateSurface`. A segment is kept only where its (u, v) midpoint
 * is inside the face's trim, by the tessellator's own even-odd test. The
 * lines are lifted by `lift` along the face's normal, off the faces.
 */
export function isoLines(
  form: BrepForm,
  origin: ArrayLike<number>,
  lift: number,
): LineMesh {
  const positions: number[] = [];
  const indices: number[] = [];
  const featureIds: number[] = [];
  for (let face = 0; face < form.faceSurface.length; face++) {
    const trim = faceTrim(form, face);
    if (!trim) {
      continue;
    }
    const surface = form.faceSurface[face]!;
    const [u0, u1, v0, v1] = trim.domain;
    const point = (u: number, v: number): number[] => {
      const p = evaluateSurface(form, surface, u, v).position;
      const n = faceNormal(form, face, u, v);
      return [0, 1, 2].map((k) => p[k]! + (n ? n[k]! * lift : 0) - origin[k]!);
    };
    for (const along of ["u", "v"] as const) {
      for (let i = 0; i < ISO_LINES; i++) {
        const t = (i + 0.5) / ISO_LINES;
        const at = (s: number): [number, number] =>
          along === "u"
            ? [u0 + (u1 - u0) * t, v0 + (v1 - v0) * s]
            : [u0 + (u1 - u0) * s, v0 + (v1 - v0) * t];
        let last = -1;
        for (let k = 0; k < ISO_SAMPLES - 1; k++) {
          const a = at(k / (ISO_SAMPLES - 1));
          const b = at((k + 1) / (ISO_SAMPLES - 1));
          if (!trim.contains((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)) {
            last = -1;
            continue;
          }
          if (last < 0) {
            last = positions.length / 3;
            positions.push(...point(a[0], a[1]));
            featureIds.push(face);
          }
          const next = positions.length / 3;
          positions.push(...point(b[0], b[1]));
          featureIds.push(face);
          indices.push(last, next);
          last = next;
        }
      }
    }
  }
  return {
    positions: Float32Array.from(positions),
    indices: Uint32Array.from(indices),
    featureIds: Uint32Array.from(featureIds),
  };
}

/**
 * Short whiskers along the face normal at a subsample of the tessellation's
 * vertices: about `budget` in all, shared between the faces by their vertex
 * counts, at least one each. They are `length` long. The normals are the
 * tessellator's, which are `faceNormal` at each vertex's (u, v) except at a
 * pole, where they are averaged from the triangles.
 */
export function normalWhiskers(
  mesh: BrepMesh,
  budget: number,
  length: number,
): LineMesh {
  const { positions, normals, featureIds } = mesh.faces;
  const count = featureIds.length;
  const out: number[] = [];
  const ids: number[] = [];
  const indices: number[] = [];
  for (let start = 0; start < count;) {
    const face = featureIds[start]!;
    let end = start;
    while (end < count && featureIds[end] === face) {
      end++;
    }
    const wanted = Math.max(1, Math.round((budget * (end - start)) / count));
    const step = Math.max(1, Math.floor((end - start) / wanted));
    for (let i = start + Math.floor(step / 2); i < end; i += step) {
      const at = out.length / 3;
      for (let k = 0; k < 3; k++) {
        out.push(positions[i * 3 + k]!);
      }
      for (let k = 0; k < 3; k++) {
        out.push(positions[i * 3 + k]! + normals[i * 3 + k]! * length);
      }
      ids.push(face, face);
      indices.push(at, at + 1);
    }
    start = end;
  }
  return {
    positions: Float32Array.from(out),
    indices: Uint32Array.from(indices),
    featureIds: Uint32Array.from(ids),
  };
}
