// Mesh caps (plan §13.26, "Clip planes and caps: decided by the owner", item
// 6; increment 8b). Mesh caps are real geometry, because content may be open
// meshes: each tile's triangles are cut by the clip plane, the cuts are
// segments keyed by element (feature) ID, segments are joined into loops per
// element across every tile (ends snapped within a tolerance tied to the
// tiles' geometric error), closed loops are triangulated into caps (holes
// included), and chains that do not close are kept as section lines, which a
// report says.
//
// The cut is on the CPU here: a tile's mesh is read once per clip and
// revision, and the work is one pass over its triangles. A compute pass would
// need the tile's buffers and a readback of the segments, and the assembly
// across tiles is CPU anyway; the pass is the later step, behind the same
// `TileSection` the assembly reads.
//
// Lengths are metres. The plane's normal is the cap's outward normal: an outer
// loop is counter-clockwise viewed from it, which is the order a closed mesh
// with outward winding gives.
import type { MeshData } from "../meshes.ts";
import {
  planeFrame,
  type P2,
  type SectionPlane,
} from "../../brep/sectionCurves.ts";
import { clipLoops, type Loop } from "../../brep/sectionLoops.ts";
import { line2 } from "../../brep/sectionFit.ts";

/** One tile's triangles, as the cap pass reads them. */
export interface MeshCapTile {
  /** Names the tile in the cache. */
  readonly id: string | number;
  /** Goes up when the tile's geometry changes. */
  readonly revision: number;
  /** 3 per vertex, in the tile's own coordinates. */
  readonly positions: ArrayLike<number>;
  /** Triangles, counter-clockwise seen from outside. */
  readonly indices: ArrayLike<number>;
  /** Per-vertex element IDs (a triangle takes its first vertex's); every vertex is element 0 without. */
  readonly featureIds?: ArrayLike<number>;
  /** The tile's coordinates in the clip's frame, column-major 4 × 4 (default: the same). */
  readonly matrix?: ArrayLike<number>;
  /** How far the tile's mesh may be from the surface it stands for, m: it sets how closely its segments' ends join those of another tile. */
  readonly geometricError?: number;
}

/** The plane the caps lie on: a point and the cap's outward normal, in the clip's frame, with the limits of a clip box. */
export interface MeshCapPlane {
  readonly point: ArrayLike<number>;
  readonly normal: ArrayLike<number>;
  /** Half-spaces the cap is limited to: `normal · (p − point) ≤ 0` is kept. */
  readonly limits?: readonly {
    readonly point: ArrayLike<number>;
    readonly normal: ArrayLike<number>;
  }[];
}

/** What one tile's cut gives: directed segments in the plane's (u, v), by element. */
export interface TileSection {
  readonly tile: string | number;
  readonly revision: number;
  /** 4 per segment: ax, ay, bx, by, in the plane's (u, v), the solid's inside on the left. */
  readonly segments: Float64Array;
  /** Per segment: its element ID. */
  readonly features: Uint32Array;
  /** The geometric error of the tile that made them, m. */
  readonly geometricError: number;
  /** The tile's size (its box's diagonal in the clip's frame), m. */
  readonly size: number;
  /** Triangles the plane crossed. */
  readonly crossed: number;
}

const IDENTITY = Float64Array.from([
  1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
]);

/** The plane as the section frame, with its own axes. */
export function meshPlane(plane: MeshCapPlane): SectionPlane {
  return planeFrame(plane.point, plane.normal);
}

/** Cuts a tile's triangles by the plane. */
export function sectionTile(
  tile: MeshCapTile,
  plane: SectionPlane,
): TileSection {
  const m = tile.matrix ?? IDENTITY;
  const vertices = tile.positions.length / 3;
  const d = new Float64Array(vertices);
  const u = new Float64Array(vertices);
  const v = new Float64Array(vertices);
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  const o = plane.origin;
  for (let i = 0; i < vertices; i++) {
    const x = tile.positions[i * 3]!;
    const y = tile.positions[i * 3 + 1]!;
    const z = tile.positions[i * 3 + 2]!;
    const px = m[0]! * x + m[4]! * y + m[8]! * z + m[12]!;
    const py = m[1]! * x + m[5]! * y + m[9]! * z + m[13]!;
    const pz = m[2]! * x + m[6]! * y + m[10]! * z + m[14]!;
    const rx = px - o[0];
    const ry = py - o[1];
    const rz = pz - o[2];
    d[i] = plane.z[0] * rx + plane.z[1] * ry + plane.z[2] * rz;
    u[i] = plane.x[0] * rx + plane.x[1] * ry + plane.x[2] * rz;
    v[i] = plane.y[0] * rx + plane.y[1] * ry + plane.y[2] * rz;
    lo[0] = Math.min(lo[0]!, px);
    lo[1] = Math.min(lo[1]!, py);
    lo[2] = Math.min(lo[2]!, pz);
    hi[0] = Math.max(hi[0]!, px);
    hi[1] = Math.max(hi[1]!, py);
    hi[2] = Math.max(hi[2]!, pz);
  }
  const size = vertices
    ? Math.hypot(hi[0]! - lo[0]!, hi[1]! - lo[1]!, hi[2]! - lo[2]!)
    : 0;
  const segments: number[] = [];
  const features: number[] = [];
  /** The crossing of an edge, from its lower-indexed end so both triangles agree bit for bit. */
  const crossing = (a: number, b: number): P2 => {
    const first = a < b ? a : b;
    const second = a < b ? b : a;
    const s = d[first]! / (d[first]! - d[second]!);
    return [
      u[first]! + s * (u[second]! - u[first]!),
      v[first]! + s * (v[second]! - v[first]!),
    ];
  };
  const triangles = Math.floor(tile.indices.length / 3);
  let crossed = 0;
  for (let t = 0; t < triangles; t++) {
    const i0 = tile.indices[t * 3]!;
    const i1 = tile.indices[t * 3 + 1]!;
    const i2 = tile.indices[t * 3 + 2]!;
    const above = [d[i0]! > 0, d[i1]! > 0, d[i2]! > 0];
    const count = Number(above[0]) + Number(above[1]) + Number(above[2]);
    if (count === 0 || count === 3) {
      continue;
    }
    // The vertex alone on its side, and the other two.
    const lone = above[0] === above[1] ? i2 : above[0] === above[2] ? i1 : i0;
    const others = [i0, i1, i2].filter((i) => i !== lone);
    let a = crossing(lone, others[0]!);
    let b = crossing(lone, others[1]!);
    // The triangle's normal, in the plane's axes: only its in-plane part matters.
    const e1x = u[i1]! - u[i0]!;
    const e1y = v[i1]! - v[i0]!;
    const e1z = d[i1]! - d[i0]!;
    const e2x = u[i2]! - u[i0]!;
    const e2y = v[i2]! - v[i0]!;
    const e2z = d[i2]! - d[i0]!;
    const nx = e1y * e2z - e1z * e2y;
    const ny = e1z * e2x - e1x * e2z;
    // The inside is on the left of the cut: along z × n = (−ny, nx).
    if ((b[0] - a[0]) * -ny + (b[1] - a[1]) * nx < 0) {
      [a, b] = [b, a];
    }
    if (a[0] === b[0] && a[1] === b[1]) {
      continue;
    }
    segments.push(a[0], a[1], b[0], b[1]);
    features.push(tile.featureIds ? tile.featureIds[i0]! : 0);
    crossed++;
  }
  return {
    tile: tile.id,
    revision: tile.revision,
    segments: Float64Array.from(segments),
    features: Uint32Array.from(features),
    geometricError: tile.geometricError ?? 0,
    size,
    crossed,
  };
}

// --- assembly across tiles ----------------------------------------------------------

/** What assembling a plane's segments made of one element. */
export interface ElementCap {
  /** The element's ID (the segments' feature ID). */
  readonly feature: number;
  /** Closed loops, filled: regions (an outer loop and its holes) made. */
  readonly regions: number;
  /** Loops that are holes of a region. */
  readonly holes: number;
  /** Chains that do not close, drawn as section lines. */
  readonly openChains: number;
  /** The filled area, m². */
  readonly area: number;
  /** The element's loops ran clockwise (an inside-out mesh): they were turned over. */
  readonly flipped: boolean;
}

export interface MeshCapReport {
  /** Tiles that took part. */
  readonly tiles: number;
  /** Tiles whose triangles the plane crossed. */
  readonly tilesCrossed: number;
  /** The snap radius used, m. */
  readonly snap: number;
  readonly closedLoops: number;
  /** Chains that did not close (drawn as lines), and why they may not have. */
  readonly openChains: number;
  /** Open chains with an end within 100 snaps of another's: tiles at different levels of detail that did not meet. */
  readonly nearMisses: number;
  readonly elements: readonly ElementCap[];
  /** Loops whose triangulation left the loop's area uncovered by more than 1%. */
  readonly triangulationShortfalls: number;
}

export interface MeshCapGeometry {
  /** The caps, as a mesh in the clip's frame less `origin`; undefined when nothing closed. */
  readonly triangles: MeshData | undefined;
  /** The chains that did not close, as a line-list mesh in the same frame; undefined when none. */
  readonly lines: MeshData | undefined;
  /** Where the meshes' coordinates are measured from, in the clip's frame. */
  readonly origin: readonly [number, number, number];
  readonly plane: SectionPlane;
  readonly report: MeshCapReport;
}

export interface AssembleOptions {
  /**
   * The ends of segments within this distance, m, are one point. Default: the
   * greatest of 1% of the largest geometric error among the tiles, 1e-6 of
   * the largest tile, and 1e-9.
   */
  readonly snap?: number;
  /** The element a feature ID of 0xffffffff gives (no feature) is element `none` (default 0). */
  readonly none?: number;
}

interface Chain {
  readonly points: P2[];
  readonly closed: boolean;
}

/** Joins directed segments (4 numbers each) into loops and chains; ends within `snap` are one node. */
export function joinSegments(
  segments: readonly number[],
  snap: number,
): { chains: Chain[]; nodes: number } {
  const count = segments.length / 4;
  const nodeX: number[] = [];
  const nodeY: number[] = [];
  const cells = new Map<string, number[]>();
  const cell = (x: number) => Math.floor(x / snap);
  const nodeOf = (x: number, y: number): number => {
    const cx = cell(x);
    const cy = cell(y);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const id of cells.get(`${cx + dx},${cy + dy}`) ?? []) {
          if (Math.hypot(nodeX[id]! - x, nodeY[id]! - y) <= snap) {
            return id;
          }
        }
      }
    }
    const id = nodeX.length;
    nodeX.push(x);
    nodeY.push(y);
    const key = `${cx},${cy}`;
    const list = cells.get(key);
    if (list) {
      list.push(id);
    } else {
      cells.set(key, [id]);
    }
    return id;
  };
  const from: number[] = [];
  const to: number[] = [];
  for (let i = 0; i < count; i++) {
    const a = nodeOf(segments[i * 4]!, segments[i * 4 + 1]!);
    const b = nodeOf(segments[i * 4 + 2]!, segments[i * 4 + 3]!);
    if (a !== b) {
      from.push(a);
      to.push(b);
    }
  }
  const out: number[][] = nodeX.map(() => []);
  const incoming = new Int32Array(nodeX.length);
  from.forEach((a, e) => {
    out[a]!.push(e);
    incoming[to[e]!]!++;
  });
  const used = new Uint8Array(from.length);
  const chains: Chain[] = [];
  const walk = (startEdge: number, closeAt: number | undefined): Chain => {
    const points: P2[] = [[nodeX[from[startEdge]!]!, nodeY[from[startEdge]!]!]];
    let e = startEdge;
    let closed = false;
    for (;;) {
      used[e] = 1;
      const at = to[e]!;
      if (at === closeAt) {
        closed = true;
        break;
      }
      points.push([nodeX[at]!, nodeY[at]!]);
      const candidates = out[at]!.filter((c) => !used[c]);
      if (candidates.length === 0) {
        break;
      }
      // The right-most turn keeps the loops of a pinched region apart.
      let best = candidates[0]!;
      if (candidates.length > 1) {
        const px = nodeX[at]! - nodeX[from[e]!]!;
        const py = nodeY[at]! - nodeY[from[e]!]!;
        let bestAngle = Infinity;
        for (const c of candidates) {
          const qx = nodeX[to[c]!]! - nodeX[at]!;
          const qy = nodeY[to[c]!]! - nodeY[at]!;
          const angle = Math.atan2(px * qy - py * qx, px * qx + py * qy);
          if (angle < bestAngle) {
            bestAngle = angle;
            best = c;
          }
        }
      }
      e = best;
    }
    return { points, closed };
  };
  // Paths first, from the nodes where more segments leave than arrive.
  for (let n = 0; n < nodeX.length; n++) {
    for (let excess = out[n]!.length - incoming[n]!; excess > 0; excess--) {
      const e = out[n]!.find((c) => !used[c]);
      if (e === undefined) {
        break;
      }
      chains.push(walk(e, undefined));
    }
  }
  // What is left closes on itself.
  for (let e = 0; e < from.length; e++) {
    if (!used[e]) {
      chains.push(walk(e, from[e]));
    }
  }
  return { chains, nodes: nodeX.length };
}

const area2 = (points: readonly P2[]): number => {
  let twice = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    twice += points[j]![0] * points[i]![1] - points[i]![0] * points[j]![1];
  }
  return twice / 2;
};

const insideRing = (ring: readonly P2[], p: P2): boolean => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!;
    const b = ring[j]!;
    if (
      a[1] > p[1] !== b[1] > p[1] &&
      p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
    ) {
      inside = !inside;
    }
  }
  return inside;
};

/** A ring as a loop of straight pieces, for the half-plane cut. */
function ringLoop(ring: readonly P2[]): Loop {
  const segs = ring.map((p, i) => line2(p, ring[(i + 1) % ring.length]!));
  return [{ segs, face: -1 }];
}

function loopRing(loop: Loop): P2[] {
  const out: P2[] = [];
  for (const piece of loop) {
    for (const seg of piece.segs) {
      out.push([seg.pts[0]! / seg.pts[2]!, seg.pts[1]! / seg.pts[2]!]);
    }
  }
  return out;
}

/** The parts of a polyline inside the half-plane n·p + c ≤ 0. */
function clipChain(points: readonly P2[], n: P2, c: number): P2[][] {
  const side = (p: P2) => n[0] * p[0] + n[1] * p[1] + c;
  const out: P2[][] = [];
  let current: P2[] = [];
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const sa = side(a);
    const sb = side(b);
    if (sa <= 0 && current.length === 0) {
      current.push(a);
    }
    if (sa <= 0 && sb <= 0) {
      current.push(b);
    } else if (sa <= 0 !== sb <= 0) {
      const s = sa / (sa - sb);
      const x: P2 = [a[0] + s * (b[0] - a[0]), a[1] + s * (b[1] - a[1])];
      if (sa <= 0) {
        current.push(x);
        out.push(current);
        current = [];
      } else {
        current = [x, b];
      }
    }
  }
  if (current.length > 1) {
    out.push(current);
  }
  return out.filter((p) => p.length > 1);
}

/** Cuts the plane's limits: loops by `clipLoops`, chains by their segments. */
function limited(
  plane: SectionPlane,
  limits: MeshCapPlane["limits"],
  rings: P2[][],
  chains: P2[][],
): { rings: P2[][]; chains: P2[][] } {
  let loops: Loop[] = rings.map(ringLoop);
  let lines = chains;
  for (const limit of limits ?? []) {
    const n = limit.normal;
    const length = Math.hypot(n[0]!, n[1]!, n[2]!);
    const c =
      (n[0]! * (plane.origin[0] - limit.point[0]!) +
        n[1]! * (plane.origin[1] - limit.point[1]!) +
        n[2]! * (plane.origin[2] - limit.point[2]!)) /
      length;
    const nx =
      (n[0]! * plane.x[0] + n[1]! * plane.x[1] + n[2]! * plane.x[2]) / length;
    const ny =
      (n[0]! * plane.y[0] + n[1]! * plane.y[1] + n[2]! * plane.y[2]) / length;
    const m = Math.hypot(nx, ny);
    if (m < 1e-9) {
      if (c > 0) {
        loops = [];
        lines = [];
      }
      continue;
    }
    loops = clipLoops(loops, [nx / m, ny / m], c / m).loops;
    lines = lines.flatMap((p) => clipChain(p, [nx / m, ny / m], c / m));
  }
  return { rings: loops.map(loopRing), chains: lines };
}

// --- triangulation -----------------------------------------------------------------------

/**
 * Triangulates a region: an outer ring (counter-clockwise) and holes (clockwise).
 * Holes are bridged to the outer ring, then ears are cut. Returns the points and
 * the triangles' indices into them (counter-clockwise).
 */
export function triangulateRegion(
  outer: readonly P2[],
  holes: readonly (readonly P2[])[],
): { points: P2[]; indices: number[] } {
  const points: P2[] = [...outer];
  let ring = outer.map((_, i) => i);
  const holeRings = holes.map((h) => {
    const base = points.length;
    points.push(...h);
    return h.map((_, i) => base + i);
  });
  // Holes from the rightmost, so each is bridged to what is already merged.
  const order = holeRings
    .map((h, k) => ({ h, x: Math.max(...h.map((i) => points[i]![0])), k }))
    .sort((a, b) => b.x - a.x);
  const edgesOf = (r: readonly number[]): [number, number][] =>
    r.map((_, i) => [r[i]!, r[(i + 1) % r.length]!]);
  const crosses = (a: P2, b: P2, c: P2, d: P2): boolean => {
    const o = (p: P2, q: P2, r: P2) =>
      (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
    const d1 = o(a, b, c);
    const d2 = o(a, b, d);
    const d3 = o(c, d, a);
    const d4 = o(c, d, b);
    return d1 * d2 < 0 && d3 * d4 < 0;
  };
  const pending = order.map((o) => o.h);
  for (let k = 0; k < order.length; k++) {
    const hole = order[k]!.h;
    pending.shift();
    // The hole's rightmost vertex, bridged to the nearest ring vertex it sees.
    let hv = 0;
    hole.forEach((id, i) => {
      if (points[id]![0] > points[hole[hv]!]![0]) {
        hv = i;
      }
    });
    const hp = points[hole[hv]!]!;
    const blockers = [
      ...edgesOf(ring),
      ...pending.flatMap(edgesOf),
      ...edgesOf(hole),
    ];
    const candidates = ring
      .map((id, i) => ({
        i,
        d: Math.hypot(points[id]![0] - hp[0], points[id]![1] - hp[1]),
      }))
      .sort((a, b) => a.d - b.d);
    let chosen = candidates[0]!.i;
    for (const c of candidates) {
      const cp = points[ring[c.i]!]!;
      const free = blockers.every(
        ([a, b]) => !crosses(hp, cp, points[a]!, points[b]!),
      );
      if (free) {
        const mid: P2 = [(hp[0] + cp[0]) / 2, (hp[1] + cp[1]) / 2];
        const inside =
          insideRing(
            ring.map((id) => points[id]!),
            mid,
          ) &&
          !pending.concat([hole]).some((h) =>
            insideRing(
              h.map((id) => points[id]!),
              mid,
            ),
          );
        if (inside) {
          chosen = c.i;
          break;
        }
      }
    }
    const rotated = [...hole.slice(hv), ...hole.slice(0, hv)];
    ring = [
      ...ring.slice(0, chosen + 1),
      ...rotated,
      rotated[0]!,
      ring[chosen]!,
      ...ring.slice(chosen + 1),
    ];
  }
  return { points, indices: earClip(points, ring) };
}

/** Ear clipping of a weakly simple counter-clockwise ring of point indices. */
function earClip(points: readonly P2[], ringIds: readonly number[]): number[] {
  const n = ringIds.length;
  const prev = Array.from({ length: n }, (_, i) => (i + n - 1) % n);
  const next = Array.from({ length: n }, (_, i) => (i + 1) % n);
  const pt = (i: number) => points[ringIds[i]!]!;
  const cross = (a: P2, b: P2, c: P2) =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const same = (a: P2, b: P2) => a[0] === b[0] && a[1] === b[1];
  const triangles: number[] = [];
  let remaining = n;
  let at = 0;
  let stuck = 0;
  const isEar = (i: number): boolean => {
    const a = pt(prev[i]!);
    const b = pt(i);
    const c = pt(next[i]!);
    if (cross(a, b, c) <= 0) {
      return false;
    }
    // No other vertex of the ring inside, those at the triangle's own corners aside.
    for (let j = next[next[i]!]!; j !== prev[i]!; j = next[j]!) {
      const p = pt(j);
      if (same(p, a) || same(p, b) || same(p, c)) {
        continue;
      }
      if (cross(a, b, p) >= 0 && cross(b, c, p) >= 0 && cross(c, a, p) >= 0) {
        return false;
      }
    }
    return true;
  };
  const cut = (i: number) => {
    triangles.push(ringIds[prev[i]!]!, ringIds[i]!, ringIds[next[i]!]!);
    next[prev[i]!] = next[i]!;
    prev[next[i]!] = prev[i]!;
    remaining--;
  };
  while (remaining > 3) {
    if (isEar(at)) {
      const following = next[at]!;
      cut(at);
      at = following;
      stuck = 0;
      continue;
    }
    at = next[at]!;
    stuck++;
    if (stuck > remaining) {
      // No ear: drop a vertex with no area to it, or the least bad one, so the ring ends.
      let drop = -1;
      let i = at;
      for (let k = 0; k < remaining; k++, i = next[i]!) {
        if (Math.abs(cross(pt(prev[i]!), pt(i), pt(next[i]!))) < 1e-18) {
          drop = i;
          break;
        }
      }
      if (drop >= 0) {
        next[prev[drop]!] = next[drop]!;
        prev[next[drop]!] = prev[drop]!;
        remaining--;
        at = next[drop]!;
      } else {
        const following = next[at]!;
        cut(at);
        at = following;
      }
      stuck = 0;
    }
  }
  if (remaining === 3 && cross(pt(prev[at]!), pt(at), pt(next[at]!)) > 0) {
    cut(at);
  }
  return triangles;
}

// --- the caps -------------------------------------------------------------------------------

/**
 * Assembles the tiles' segments for a plane into caps and section lines. Each
 * element's loops are filled; chains that do not close become lines.
 */
export function assembleMeshCaps(
  sections: readonly TileSection[],
  plane: MeshCapPlane,
  options: AssembleOptions = {},
): MeshCapGeometry {
  const frame = meshPlane(plane);
  let largestError = 0;
  let largestTile = 0;
  for (const s of sections) {
    largestError = Math.max(largestError, s.geometricError);
    largestTile = Math.max(largestTile, s.size);
  }
  const snap =
    options.snap ?? Math.max(0.01 * largestError, 1e-6 * largestTile, 1e-9);
  const byFeature = new Map<number, number[]>();
  for (const s of sections) {
    for (let i = 0; i < s.features.length; i++) {
      const f = s.features[i]!;
      const key = f === 0xffffffff ? (options.none ?? 0) : f;
      let list = byFeature.get(key);
      if (!list) {
        list = [];
        byFeature.set(key, list);
      }
      list.push(
        s.segments[i * 4]!,
        s.segments[i * 4 + 1]!,
        s.segments[i * 4 + 2]!,
        s.segments[i * 4 + 3]!,
      );
    }
  }
  const positions: number[] = [];
  const normals: number[] = [];
  const featureIds: number[] = [];
  const indices: number[] = [];
  const linePositions: number[] = [];
  const lineFeatures: number[] = [];
  const lineIndices: number[] = [];
  const elements: ElementCap[] = [];
  let closedLoops = 0;
  let openChains = 0;
  let nearMisses = 0;
  let shortfalls = 0;
  const ends: P2[] = [];
  const lift = (p: P2): [number, number, number] => [
    p[0] * frame.x[0] + p[1] * frame.y[0],
    p[0] * frame.x[1] + p[1] * frame.y[1],
    p[0] * frame.x[2] + p[1] * frame.y[2],
  ];
  for (const [feature, segments] of [...byFeature].sort(
    (a, b) => a[0] - b[0],
  )) {
    const { chains } = joinSegments(segments, snap);
    let rings = chains
      .filter((c) => c.closed && c.points.length >= 3)
      .map((c) => c.points);
    const open = chains
      .filter((c) => !c.closed && c.points.length >= 2)
      .map((c) => c.points);
    // A mesh wound inside out has only clockwise loops: turn them over.
    const total = rings.reduce((s, r) => s + area2(r), 0);
    const flipped = rings.length > 0 && total < 0;
    if (flipped) {
      rings = rings.map((r) => r.slice().reverse());
    }
    const cut = limited(frame, plane.limits, rings, open);
    rings = cut.rings;
    const lines = cut.chains;
    // Nest: counter-clockwise rings are outer, clockwise ones holes of the smallest ring holding them.
    const infos = rings.map((r) => ({ ring: r, area: area2(r) }));
    const outers = infos
      .filter((r) => r.area > 0)
      .map((r) => ({ ...r, holes: [] as P2[][] }));
    let holes = 0;
    for (const h of infos.filter((r) => r.area < 0)) {
      let best: (typeof outers)[number] | undefined;
      for (const o of outers) {
        if (
          o.area > -h.area &&
          insideRing(o.ring, h.ring[0]!) &&
          (!best || o.area < best.area)
        ) {
          best = o;
        }
      }
      if (best) {
        best.holes.push(h.ring);
        holes++;
      }
    }
    let filled = 0;
    for (const o of outers) {
      const tri = triangulateRegion(o.ring, o.holes);
      const base = positions.length / 3;
      for (const p of tri.points) {
        positions.push(...lift(p));
        normals.push(frame.z[0], frame.z[1], frame.z[2]);
        featureIds.push(feature);
      }
      for (const index of tri.indices) {
        indices.push(base + index);
      }
      let covered = 0;
      for (let t = 0; t < tri.indices.length; t += 3) {
        covered += area2([
          tri.points[tri.indices[t]!]!,
          tri.points[tri.indices[t + 1]!]!,
          tri.points[tri.indices[t + 2]!]!,
        ]);
      }
      const want = o.area + o.holes.reduce((s, h) => s + area2(h), 0);
      if (Math.abs(covered - want) > 0.01 * Math.abs(want)) {
        shortfalls++;
      }
      filled += want;
    }
    for (const line of lines) {
      const base = linePositions.length / 3;
      for (const p of line) {
        linePositions.push(...lift(p));
        lineFeatures.push(feature);
      }
      for (let i = 0; i + 1 < line.length; i++) {
        lineIndices.push(base + i, base + i + 1);
      }
      ends.push(line[0]!, line[line.length - 1]!);
    }
    closedLoops += rings.length;
    openChains += lines.length;
    elements.push({
      feature,
      regions: outers.length,
      holes,
      openChains: lines.length,
      area: filled,
      flipped,
    });
  }
  // Open ends that have another's close by: tiles at different LODs that did not meet.
  for (let i = 0; i < ends.length; i++) {
    for (let j = i + 1; j < ends.length; j++) {
      if (
        Math.hypot(ends[i]![0] - ends[j]![0], ends[i]![1] - ends[j]![1]) <=
        100 * snap
      ) {
        nearMisses++;
        break;
      }
    }
  }
  const featureCount = Math.max(0, ...featureIds, ...lineFeatures) + 1;
  const triangles: MeshData | undefined = indices.length
    ? {
        positions: Float32Array.from(positions),
        normals: Float32Array.from(normals),
        indices: Uint32Array.from(indices),
        featureIds: Uint32Array.from(featureIds),
        featureCount,
      }
    : undefined;
  const linesMesh: MeshData | undefined = lineIndices.length
    ? {
        positions: Float32Array.from(linePositions),
        indices: Uint32Array.from(lineIndices),
        featureIds: Uint32Array.from(lineFeatures),
        featureCount,
        topology: "line-list",
      }
    : undefined;
  return {
    triangles,
    lines: linesMesh,
    origin: [frame.origin[0], frame.origin[1], frame.origin[2]],
    plane: frame,
    report: {
      tiles: sections.length,
      tilesCrossed: sections.filter((s) => s.crossed > 0).length,
      snap,
      closedLoops,
      openChains,
      nearMisses,
      elements,
      triangulationShortfalls: shortfalls,
    },
  };
}
