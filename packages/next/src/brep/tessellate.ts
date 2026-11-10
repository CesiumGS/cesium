// A small CPU tessellator for the b-rep render form (overall plan §13.33). It
// turns a BrepForm into ordinary meshes: shaded faces and edges as lines. It
// serves a host that loads no WebAssembly and the gallery example. It is not
// the reference: the exact float64 evaluation is the ground truth for chordal
// error. Each face's (u, v) domain is cut into a uniform grid whose density
// comes from a chordal-error bound. Triangles whose centre falls outside the
// face's trim are dropped, and the edges drawn on top hide the jagged trim.
// Lengths are metres and angles are radians.
import {
  evaluateCurve2,
  evaluateCurve3,
  evaluateSurface,
  faceNormal,
} from "./evaluate.ts";
import { SurfaceKind, type BrepForm } from "./form.ts";

export interface TessellateOptions {
  /** The largest chordal error allowed, m. */
  readonly tolerance: number;
  /** The most grid cells per side of a face's domain (default 128). */
  readonly maxGrid?: number;
  /** Grid cells per side for a trimmed face, so the trim reads (default 48). */
  readonly trimGrid?: number;
}

export interface BrepMesh {
  /** Positions are relative to this, m (the centre of the mesh's bounds). */
  readonly origin: Float64Array;
  /** Every face, unwelded between faces: featureIds holds each vertex's face index. */
  readonly faces: {
    readonly positions: Float32Array;
    readonly normals: Float32Array;
    readonly indices: Uint32Array;
    readonly featureIds: Uint32Array;
  };
  /** Every edge as a line list: featureIds holds each vertex's edge index. */
  readonly edges: {
    readonly positions: Float32Array;
    readonly indices: Uint32Array;
    readonly featureIds: Uint32Array;
  };
  /** The largest chordal error the bounds allow, m: the tolerance, or more where maxGrid capped a face. */
  readonly error: number;
}

const DEFAULT_MAX_GRID = 128;
const DEFAULT_TRIM_GRID = 48;
/** Points per pcurve segment when a loop is polygonized. */
const POLYGON_SAMPLES = 16;
/** The most lines one edge segment gets. */
const MAX_EDGE_LINES = 256;
/** Spike B's safety factor of 2 for rational weights, times its 0.75 bound. */
const PATCH_BOUND = 2 * 0.75;
/** The chordal sag of a curve segment is at most this times its largest second difference, per line squared. */
const CURVE_BOUND = 0.125;

/** How many cells one direction needs, and the chordal error m a given cell count leaves. */
interface Demand {
  readonly cells: number;
  readonly errorAt: (cells: number) => number;
}

const NO_CURVATURE: Demand = { cells: 1, errorAt: () => 0 };

/** A growing list of typed-array pieces, joined at the end. */
class Chunks<T extends Float64Array | Uint32Array> {
  readonly pieces: T[] = [];
  length = 0;
  add(piece: T): void {
    this.pieces.push(piece);
    this.length += piece.length;
  }
}

function join<T extends Float64Array | Uint32Array>(
  chunks: Chunks<T>,
  make: (length: number) => T,
): T {
  const out = make(chunks.length);
  let at = 0;
  for (const piece of chunks.pieces) {
    out.set(piece as never, at);
    at += piece.length;
  }
  return out;
}

/** Tessellates every face and edge of a b-rep form. */
export function tessellateBrep(
  form: BrepForm,
  options: TessellateOptions,
): BrepMesh {
  const tolerance = options.tolerance;
  if (!(tolerance > 0 && Number.isFinite(tolerance))) {
    throw new Error(
      "tessellateBrep: tolerance must be a positive finite number",
    );
  }
  const maxGrid = Math.max(1, Math.floor(options.maxGrid ?? DEFAULT_MAX_GRID));
  const trimGrid = Math.max(
    1,
    Math.floor(options.trimGrid ?? DEFAULT_TRIM_GRID),
  );

  const facePositions = new Chunks<Float64Array>();
  const faceNormals = new Chunks<Float64Array>();
  const faceIndices = new Chunks<Uint32Array>();
  const faceIds = new Chunks<Uint32Array>();
  const edgePositions = new Chunks<Float64Array>();
  const edgeIndices = new Chunks<Uint32Array>();
  const edgeIds = new Chunks<Uint32Array>();
  let error = tolerance;

  const faces = form.faceSurface.length;
  let faceVertices = 0;
  for (let face = 0; face < faces; face++) {
    const done = tessellateFace(form, face, tolerance, maxGrid, trimGrid);
    if (!done) {
      continue;
    }
    error = Math.max(error, done.error);
    const count = done.positions.length / 3;
    facePositions.add(done.positions);
    faceNormals.add(done.normals);
    const indices = done.indices;
    for (let i = 0; i < indices.length; i++) {
      indices[i] = indices[i]! + faceVertices;
    }
    faceIndices.add(indices);
    faceIds.add(new Uint32Array(count).fill(face));
    faceVertices += count;
  }

  const edges = form.edgeVertices.length / 2;
  let edgeVertexCount = 0;
  for (let edge = 0; edge < edges; edge++) {
    const done = tessellateEdge(form, edge, tolerance);
    error = Math.max(error, done.error);
    const count = done.positions.length / 3;
    edgePositions.add(done.positions);
    const indices = done.indices;
    for (let i = 0; i < indices.length; i++) {
      indices[i] = indices[i]! + edgeVertexCount;
    }
    edgeIndices.add(indices);
    edgeIds.add(new Uint32Array(count).fill(edge));
    edgeVertexCount += count;
  }

  // The origin is the centre of the bounds of every emitted point.
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const chunks of [facePositions, edgePositions]) {
    for (const piece of chunks.pieces) {
      for (let i = 0; i < piece.length; i++) {
        const k = i % 3;
        min[k] = Math.min(min[k]!, piece[i]!);
        max[k] = Math.max(max[k]!, piece[i]!);
      }
    }
  }
  const origin = new Float64Array(3);
  for (let k = 0; k < 3; k++) {
    origin[k] = Number.isFinite(min[k]!) ? (min[k]! + max[k]!) / 2 : 0;
  }
  const relative = (chunks: Chunks<Float64Array>): Float32Array => {
    const out = new Float32Array(chunks.length);
    let at = 0;
    for (const piece of chunks.pieces) {
      for (let i = 0; i < piece.length; i++) {
        out[at + i] = piece[i]! - origin[i % 3]!;
      }
      at += piece.length;
    }
    return out;
  };
  const normals = join(faceNormals, (n) => new Float64Array(n));
  return {
    origin,
    faces: {
      positions: relative(facePositions),
      normals: Float32Array.from(normals),
      indices: join(faceIndices, (n) => new Uint32Array(n)),
      featureIds: join(faceIds, (n) => new Uint32Array(n)),
    },
    edges: {
      positions: relative(edgePositions),
      indices: join(edgeIndices, (n) => new Uint32Array(n)),
      featureIds: join(edgeIds, (n) => new Uint32Array(n)),
    },
    error,
  };
}

// Faces.

/** A face's (u, v) domain and trim. */
export interface FaceTrim {
  /** The (u, v) box of the outer loop's pcurve samples: u0, u1, v0, v1. */
  readonly domain: readonly [number, number, number, number];
  /** False when the loop is an axis-aligned rectangle that fills the box. */
  readonly trimmed: boolean;
  /** The loops as (u, v) polygons, interleaved, when trimmed; empty otherwise. */
  readonly loops: readonly Float64Array[];
  /** Whether (u, v) is inside the face's trim, by the even-odd rule the tessellator uses; true everywhere in the box when untrimmed. */
  contains(u: number, v: number): boolean;
}

/**
 * The domain of a face and its trim, as the tessellator reads them: the box
 * of the outer loop, and the even-odd rule over every loop's polygon (16
 * samples per pcurve segment). Undefined for a face with no loops or a
 * loop that has no finite extent.
 */
export function faceTrim(form: BrepForm, face: number): FaceTrim | undefined {
  const firstLoop = form.faceLoops[face * 2]!;
  const loopCount = form.faceLoops[face * 2 + 1]!;
  if (loopCount === 0) {
    return undefined;
  }
  // The domain: the (u, v) box of the outer loop's pcurve samples.
  const outerEdge = sampleLoop(form, firstLoop, POLYGON_SAMPLES + 1);
  let u0 = Infinity;
  let u1 = -Infinity;
  let v0 = Infinity;
  let v1 = -Infinity;
  for (let i = 0; i < outerEdge.length; i += 2) {
    u0 = Math.min(u0, outerEdge[i]!);
    u1 = Math.max(u1, outerEdge[i]!);
    v0 = Math.min(v0, outerEdge[i + 1]!);
    v1 = Math.max(v1, outerEdge[i + 1]!);
  }
  if (!(
    Number.isFinite(u0) &&
    Number.isFinite(u1) &&
    Number.isFinite(v0) &&
    Number.isFinite(v1)
  )) {
    return undefined;
  }
  const trimmed = isTrimmed(form, firstLoop, loopCount, u1 - u0, v1 - v0);
  const loops: Float64Array[] = [];
  if (trimmed) {
    for (let k = 0; k < loopCount; k++) {
      loops.push(sampleLoop(form, firstLoop + k, POLYGON_SAMPLES));
    }
  }
  return {
    domain: [u0, u1, v0, v1],
    trimmed,
    loops,
    contains: (u, v) =>
      trimmed
        ? insideEvenOdd(loops, u, v)
        : u >= u0 && u <= u1 && v >= v0 && v <= v1,
  };
}

interface FaceMesh {
  positions: Float64Array;
  normals: Float64Array;
  indices: Uint32Array;
  /** The chordal error m this face's grid allows beyond the tolerance, or 0. */
  error: number;
}

function tessellateFace(
  form: BrepForm,
  face: number,
  tolerance: number,
  maxGrid: number,
  trimGrid: number,
): FaceMesh | undefined {
  const trim = faceTrim(form, face);
  if (!trim) {
    return undefined;
  }
  const [u0, u1, v0, v1] = trim.domain;
  const trimmed = trim.trimmed;
  const loops = trim.loops;

  const surface = form.faceSurface[face]!;
  const demand = curvature(form, surface, [u0, u1, v0, v1], tolerance);
  let error = 0;
  const cellsFor = (d: Demand, span: number): number => {
    const wanted = trimmed ? Math.max(d.cells, trimGrid) : d.cells;
    if (d.cells > maxGrid) {
      error = Math.max(error, d.errorAt(maxGrid));
    }
    return span > 0 ? Math.min(wanted, maxGrid) : 1;
  };
  const nu = cellsFor(demand.u, u1 - u0);
  const nv = cellsFor(demand.v, v1 - v0);

  // The grid's vertices.
  const stride = nu + 1;
  const us = new Float64Array(nu + 1);
  const vs = new Float64Array(nv + 1);
  for (let i = 0; i <= nu; i++) {
    us[i] = i === nu ? u1 : u0 + ((u1 - u0) * i) / nu;
  }
  for (let j = 0; j <= nv; j++) {
    vs[j] = j === nv ? v1 : v0 + ((v1 - v0) * j) / nv;
  }

  // Each cell is two triangles, counter-clockwise in (u, v) so that they face
  // along ∂u × ∂v, or the other way round for a reversed face.
  const reversed = form.faceReversed[face] === 1;
  const kept: number[] = [];
  const centre = (a: number, b: number, c: number): [number, number] => [
    (us[a % stride]! + us[b % stride]! + us[c % stride]!) / 3,
    (vs[Math.floor(a / stride)]! +
      vs[Math.floor(b / stride)]! +
      vs[Math.floor(c / stride)]!) /
      3,
  ];
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const a = j * stride + i;
      const b = a + 1;
      const c = a + stride + 1;
      const d = a + stride;
      for (const t of [
        [a, b, c],
        [a, c, d],
      ] as const) {
        if (trimmed) {
          const [cu, cv] = centre(t[0], t[1], t[2]);
          if (!insideEvenOdd(loops, cu, cv)) {
            continue;
          }
        }
        if (reversed) {
          kept.push(t[0], t[2], t[1]);
        } else {
          kept.push(t[0], t[1], t[2]);
        }
      }
    }
  }

  // Only the vertices a kept triangle uses are emitted.
  const local = new Int32Array(stride * (nv + 1)).fill(-1);
  const used: number[] = [];
  for (let k = 0; k < kept.length; k++) {
    const g = kept[k]!;
    if (local[g]! < 0) {
      local[g] = used.length;
      used.push(g);
    }
  }
  const positions = new Float64Array(used.length * 3);
  const normals = new Float64Array(used.length * 3);
  const undefinedNormal = new Uint8Array(used.length);
  for (let k = 0; k < used.length; k++) {
    const g = used[k]!;
    const u = us[g % stride]!;
    const v = vs[Math.floor(g / stride)]!;
    positions.set(evaluateSurface(form, surface, u, v).position, k * 3);
    const n = faceNormal(form, face, u, v);
    if (n) {
      normals.set(n, k * 3);
    } else {
      undefinedNormal[k] = 1;
    }
  }
  const indices = new Uint32Array(kept.length);
  for (let k = 0; k < kept.length; k++) {
    indices[k] = local[kept[k]!]!;
  }

  // Where the normal is undefined, as at a pole, take the sum of the kept
  // triangles' geometric normals around the vertex. The winding above already
  // agrees with the face's sense, so the sum does too.
  if (undefinedNormal.some((flag) => flag === 1)) {
    for (let t = 0; t < indices.length; t += 3) {
      const ia = indices[t]!;
      const ib = indices[t + 1]!;
      const ic = indices[t + 2]!;
      const g = triangleNormal(positions, ia, ib, ic);
      for (const i of [ia, ib, ic]) {
        if (undefinedNormal[i] === 1) {
          normals[i * 3] = normals[i * 3]! + g[0]!;
          normals[i * 3 + 1] = normals[i * 3 + 1]! + g[1]!;
          normals[i * 3 + 2] = normals[i * 3 + 2]! + g[2]!;
        }
      }
    }
    for (let i = 0; i < used.length; i++) {
      if (undefinedNormal[i] !== 1) {
        continue;
      }
      const length = Math.hypot(
        normals[i * 3]!,
        normals[i * 3 + 1]!,
        normals[i * 3 + 2]!,
      );
      if (length > 0) {
        for (let k = 0; k < 3; k++) {
          normals[i * 3 + k] = normals[i * 3 + k]! / length;
        }
      } else {
        // Every triangle around the vertex is degenerate: any unit vector is finite.
        normals.set([0, 0, 1], i * 3);
      }
    }
  }
  return { positions, normals, indices, error };
}

/** The area-weighted geometric normal of a triangle, from its winding. */
function triangleNormal(
  positions: Float64Array,
  a: number,
  b: number,
  c: number,
): [number, number, number] {
  const ex = positions[b * 3]! - positions[a * 3]!;
  const ey = positions[b * 3 + 1]! - positions[a * 3 + 1]!;
  const ez = positions[b * 3 + 2]! - positions[a * 3 + 2]!;
  const fx = positions[c * 3]! - positions[a * 3]!;
  const fy = positions[c * 3 + 1]! - positions[a * 3 + 1]!;
  const fz = positions[c * 3 + 2]! - positions[a * 3 + 2]!;
  return [ey * fz - ez * fy, ez * fx - ex * fz, ex * fy - ey * fx];
}

/**
 * The (u, v) points of a loop, interleaved, `perSegment` per pcurve segment
 * from t = 0 in steps of 1 / 16. 17 per segment includes each segment's end.
 */
function sampleLoop(
  form: BrepForm,
  loop: number,
  perSegment: number,
): Float64Array {
  const firstUse = form.loopUses[loop * 2]!;
  const useCount = form.loopUses[loop * 2 + 1]!;
  const points: number[] = [];
  for (let use = firstUse; use < firstUse + useCount; use++) {
    const first = form.usePcurve[use * 2]!;
    const count = form.usePcurve[use * 2 + 1]!;
    for (let segment = first; segment < first + count; segment++) {
      for (let k = 0; k < perSegment; k++) {
        const p = evaluateCurve2(form, segment, k / POLYGON_SAMPLES).position;
        points.push(p[0]!, p[1]!);
      }
    }
  }
  return Float64Array.from(points);
}

/**
 * A face isn't trimmed when it has no inner loops and every outer pcurve
 * segment is degree 1 and axis-aligned in (u, v). One more check than that
 * rule: the loop must also fill its box, so an L-shaped loop of axis-aligned
 * segments is still trimmed.
 */
function isTrimmed(
  form: BrepForm,
  firstLoop: number,
  loopCount: number,
  width: number,
  height: number,
): boolean {
  if (loopCount > 1) {
    return true;
  }
  const firstUse = form.loopUses[firstLoop * 2]!;
  const useCount = form.loopUses[firstLoop * 2 + 1]!;
  const c = form.curves2;
  for (let use = firstUse; use < firstUse + useCount; use++) {
    const first = form.usePcurve[use * 2]!;
    const count = form.usePcurve[use * 2 + 1]!;
    for (let segment = first; segment < first + count; segment++) {
      if (c.degree[segment] !== 1) {
        return true;
      }
      const p = c.first[segment]! * 3;
      const xa = c.points[p]! / c.points[p + 2]!;
      const ya = c.points[p + 1]! / c.points[p + 2]!;
      const xb = c.points[p + 3]! / c.points[p + 5]!;
      const yb = c.points[p + 4]! / c.points[p + 5]!;
      const scale = Math.max(
        1,
        Math.abs(xa),
        Math.abs(xb),
        Math.abs(ya),
        Math.abs(yb),
      );
      const flat =
        Math.abs(xa - xb) <= 1e-9 * scale || Math.abs(ya - yb) <= 1e-9 * scale;
      if (!flat) {
        return true;
      }
    }
  }
  // The shoelace area of the loop against its box.
  const polygon = sampleLoop(form, firstLoop, POLYGON_SAMPLES);
  let twice = 0;
  const n = polygon.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    twice +=
      polygon[j * 2]! * polygon[i * 2 + 1]! -
      polygon[i * 2]! * polygon[j * 2 + 1]!;
  }
  const box = width * height;
  return !(Math.abs(Math.abs(twice) / 2 - box) <= 1e-9 * Math.max(box, 1e-300));
}

/** The even-odd rule over every loop's polygon. */
function insideEvenOdd(
  loops: readonly Float64Array[],
  u: number,
  v: number,
): boolean {
  let inside = false;
  for (const polygon of loops) {
    const n = polygon.length / 2;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygon[i * 2]!;
      const yi = polygon[i * 2 + 1]!;
      const xj = polygon[j * 2]!;
      const yj = polygon[j * 2 + 1]!;
      if (yi > v !== yj > v && u < ((xj - xi) * (v - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
  }
  return inside;
}

// Grid density.

/** The cells needed per direction for chordal error, over the (u, v) box. */
function curvature(
  form: BrepForm,
  surface: number,
  box: readonly [number, number, number, number],
  tolerance: number,
): { u: Demand; v: Demand } {
  const [u0, u1, v0, v1] = box;
  const kind = form.surfaceKind[surface] as SurfaceKind;
  const p0 = Math.abs(form.surfaceParams[surface * 2]!);
  const p1 = form.surfaceParams[surface * 2 + 1]!;
  switch (kind) {
    case SurfaceKind.Plane:
      return { u: NO_CURVATURE, v: NO_CURVATURE };
    case SurfaceKind.Cylinder:
      return { u: chord(p0, u1 - u0, tolerance), v: NO_CURVATURE };
    case SurfaceKind.Cone: {
      // The radius grows along v, so the box's largest radius sets the density.
      const t = Math.tan(p1);
      const radius = Math.max(Math.abs(p0 + v0 * t), Math.abs(p0 + v1 * t));
      return { u: chord(radius, u1 - u0, tolerance), v: NO_CURVATURE };
    }
    case SurfaceKind.Sphere:
      return {
        u: chord(p0, u1 - u0, tolerance),
        v: chord(p0, v1 - v0, tolerance),
      };
    case SurfaceKind.Torus:
      return {
        u: chord(p0 + Math.abs(p1), u1 - u0, tolerance),
        v: chord(Math.abs(p1), v1 - v0, tolerance),
      };
    case SurfaceKind.Bezier:
      return bezierDemand(form, surface, box, tolerance);
    default:
      throw new Error(`tessellateBrep: unknown surface kind ${kind}`);
  }
}

/** A circular arc of the given radius, m, and span, rad: the smallest n with r(1 − cos(span / 2n)) ≤ tolerance. */
function chord(radius: number, span: number, tolerance: number): Demand {
  const sag = (n: number): number => 2 * radius * Math.sin(span / (4 * n)) ** 2;
  if (!(span > 0 && radius > 0)) {
    return NO_CURVATURE;
  }
  // r(1 − cos(a)) = 2r·sin²(a / 2), so sin(span / 4n) ≤ √(tolerance / 2r).
  const s = Math.sqrt(tolerance / (2 * radius));
  const cells = s >= 1 ? 1 : Math.max(1, Math.ceil(span / (4 * Math.asin(s))));
  return { cells, errorAt: sag };
}

function bezierDemand(
  form: BrepForm,
  surface: number,
  box: readonly [number, number, number, number],
  tolerance: number,
): { u: Demand; v: Demand } {
  const [u0, u1, v0, v1] = box;
  const first = form.surfacePatches[surface * 2]!;
  const count = form.surfacePatches[surface * 2 + 1]!;
  const eps = 1e-9;
  const spanU = u1 - u0;
  const spanV = v1 - v0;
  const startsU = new Set<string>();
  const startsV = new Set<string>();
  let largestU = 0;
  let largestV = 0;
  for (let patch = first; patch < first + count; patch++) {
    const pu0 = form.patchDomain[patch * 4]!;
    const pu1 = form.patchDomain[patch * 4 + 1]!;
    const pv0 = form.patchDomain[patch * 4 + 2]!;
    const pv1 = form.patchDomain[patch * 4 + 3]!;
    // A patch counts when the box covers more than a sliver of it.
    if (pu1 <= u0 + eps * spanU || pu0 >= u1 - eps * spanU) {
      continue;
    }
    if (pv1 <= v0 + eps * spanV || pv0 >= v1 - eps * spanV) {
      continue;
    }
    startsU.add(pu0.toPrecision(12));
    startsV.add(pv0.toPrecision(12));
    const [du, dv] = patchSecondDifferences(form, patch);
    largestU = Math.max(largestU, du);
    largestV = Math.max(largestV, dv);
  }
  const demand = (largest: number, patches: number): Demand => {
    const perPatch = Math.max(
      1,
      Math.ceil(Math.sqrt((PATCH_BOUND * largest) / tolerance)),
    );
    const along = Math.max(1, patches);
    return {
      cells: perPatch * along,
      errorAt: (cells) => (PATCH_BOUND * largest) / (cells / along) ** 2,
    };
  };
  return {
    u: demand(largestU, startsU.size),
    v: demand(largestV, startsV.size),
  };
}

/** A patch's largest second difference of divided control points, m, along u and along v. */
function patchSecondDifferences(
  form: BrepForm,
  patch: number,
): [number, number] {
  const degreeU = form.patchDegree[patch * 2]!;
  const degreeV = form.patchDegree[patch * 2 + 1]!;
  const first = form.patchFirst[patch]!;
  const pts = form.patchPoints;
  const at = (i: number, j: number, k: number): number => {
    const p = (first + j * (degreeU + 1) + i) * 4;
    return pts[p + k]! / pts[p + 3]!;
  };
  const second = (i: number, j: number, di: number, dj: number): number =>
    Math.hypot(
      at(i + di, j + dj, 0) - 2 * at(i, j, 0) + at(i - di, j - dj, 0),
      at(i + di, j + dj, 1) - 2 * at(i, j, 1) + at(i - di, j - dj, 1),
      at(i + di, j + dj, 2) - 2 * at(i, j, 2) + at(i - di, j - dj, 2),
    );
  let largestU = 0;
  let largestV = 0;
  for (let j = 0; j <= degreeV; j++) {
    for (let i = 1; i < degreeU; i++) {
      largestU = Math.max(largestU, second(i, j, 1, 0));
    }
  }
  for (let j = 1; j < degreeV; j++) {
    for (let i = 0; i <= degreeU; i++) {
      largestV = Math.max(largestV, second(i, j, 0, 1));
    }
  }
  return [largestU, largestV];
}

// Edges.

function tessellateEdge(
  form: BrepForm,
  edge: number,
  tolerance: number,
): { positions: Float64Array; indices: Uint32Array; error: number } {
  const firstSegment = form.edgeCurve[edge * 2]!;
  const segmentCount = form.edgeCurve[edge * 2 + 1]!;
  const positions: number[] = [];
  const indices: number[] = [];
  let error = 0;
  for (
    let segment = firstSegment;
    segment < firstSegment + segmentCount;
    segment++
  ) {
    let lines = 1;
    if (form.curves3.degree[segment]! > 1) {
      const d = curveSecondDifference(form, segment);
      lines = Math.ceil(Math.sqrt((CURVE_BOUND * d) / tolerance));
      if (lines > MAX_EDGE_LINES) {
        error = Math.max(error, (CURVE_BOUND * d) / MAX_EDGE_LINES ** 2);
      }
      lines = Math.min(MAX_EDGE_LINES, Math.max(1, lines));
    }
    const base = positions.length / 3;
    for (let k = 0; k <= lines; k++) {
      const p = evaluateCurve3(form, segment, k / lines).position;
      positions.push(p[0]!, p[1]!, p[2]!);
      if (k > 0) {
        indices.push(base + k - 1, base + k);
      }
    }
  }
  return {
    positions: Float64Array.from(positions),
    indices: Uint32Array.from(indices),
    error,
  };
}

/** A 3D curve segment's largest second difference of divided control points, m. */
function curveSecondDifference(form: BrepForm, segment: number): number {
  const degree = form.curves3.degree[segment]!;
  const first = form.curves3.first[segment]!;
  const pts = form.curves3.points;
  const at = (i: number, k: number): number => {
    const p = (first + i) * 4;
    return pts[p + k]! / pts[p + 3]!;
  };
  let largest = 0;
  for (let i = 1; i < degree; i++) {
    largest = Math.max(
      largest,
      Math.hypot(
        at(i + 1, 0) - 2 * at(i, 0) + at(i - 1, 0),
        at(i + 1, 1) - 2 * at(i, 1) + at(i - 1, 1),
        at(i + 1, 2) - 2 * at(i, 2) + at(i - 1, 2),
      ),
    );
  }
  return largest;
}
