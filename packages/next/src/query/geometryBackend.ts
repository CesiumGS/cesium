// Rays against a tileset's retained geometry, clipped to its body's terrain
// band (frames 5b, Task 8): in the tileset's anchor coordinates, float64. The
// segment is first clipped to the band: above it, clear; below it, blocked.
// Inside the band, drawn tiles are tested triangle by triangle; a stand-in
// tile, an undrawn span and a miss within a tile's geometric error are
// undecided, each with its reason.
import type { Ellipsoid } from "../math/ellipsoid.ts";
import { volumeObb, type Obb, type TileVolume } from "../streaming/volumes.ts";
import { crossing } from "./ellipsoidBackend.ts";
import type { QueryRay, RayAnswer, UnknownSpan } from "./queries.ts";

/** What a ray reads of a tile: `Tile` satisfies it. */
export interface RayTile {
  readonly children: readonly RayTile[];
  readonly volume: TileVolume;
  readonly geometry?: readonly {
    readonly positions: Float32Array;
    readonly indices: Uint32Array;
    readonly matrix: Float64Array;
  }[];
  readonly viewMask: number;
  readonly standInMask: number;
  readonly geometricError: number;
}

/** What a ray reads of a tileset: `Tileset3D` satisfies it. */
export interface RayTileset {
  readonly retainGeometry: boolean;
  readonly root: RayTile;
}

/** What `castTilesetRays` needs beyond the tileset. */
export interface TilesetRayOptions {
  /** The body's terrain band, m above `ellipsoid`: clear above it, blocked below it. */
  readonly band?: { readonly min: number; readonly max: number };
  readonly ellipsoid?: Ellipsoid;
  /** Hits this close (m) to either end are the observer's own ground (default 1 mm). */
  readonly endTolerance?: number;
}

type V3 = [number, number, number];

const sub = (a: ArrayLike<number>, b: ArrayLike<number>): V3 => [
  a[0]! - b[0]!,
  a[1]! - b[1]!,
  a[2]! - b[2]!,
];
const dot = (a: ArrayLike<number>, b: ArrayLike<number>): number =>
  a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
const cross = (a: ArrayLike<number>, b: ArrayLike<number>): V3 => [
  a[1]! * b[2]! - a[2]! * b[1]!,
  a[2]! * b[0]! - a[0]! * b[2]!,
  a[0]! * b[1]! - a[1]! * b[0]!,
];

/** The part of the segment `[0, 1]` inside `obb` grown by `grow` m, or undefined. */
function overlap(
  from: ArrayLike<number>,
  d: ArrayLike<number>,
  obb: Obb,
  grow: number,
): [number, number] | undefined {
  let lo = 0;
  let hi = 1;
  const rel = sub(from, obb.center);
  for (let k = 0; k < 3; k++) {
    const h = obb.halfAxes;
    const axis: V3 = [h[k * 3]!, h[k * 3 + 1]!, h[k * 3 + 2]!];
    const half = Math.hypot(axis[0], axis[1], axis[2]);
    if (!(half > 0)) {
      continue;
    }
    const u: V3 = [axis[0] / half, axis[1] / half, axis[2] / half];
    const s = dot(rel, u);
    const v = dot(d, u);
    const extent = half + grow;
    if (Math.abs(v) < 1e-300) {
      if (Math.abs(s) > extent) {
        return undefined;
      }
      continue;
    }
    let t0 = (-extent - s) / v;
    let t1 = (extent - s) / v;
    if (t0 > t1) {
      [t0, t1] = [t1, t0];
    }
    lo = Math.max(lo, t0);
    hi = Math.min(hi, t1);
    if (lo > hi) {
      return undefined;
    }
  }
  return [lo, hi];
}

/** The segment's parameter at the triangle (Möller–Trumbore), or undefined. */
function hitTriangle(
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
function segmentSegment(p1: V3, q1: V3, p2: V3, q2: V3): number {
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

/** The distance from a point to a triangle (Ericson's closest point). */
function pointTriangle(p: V3, a: V3, b: V3, c: V3): number {
  const ab = sub(b, a);
  const ac = sub(c, a);
  const ap = sub(p, a);
  const d1 = dot(ab, ap);
  const d2 = dot(ac, ap);
  let q: V3;
  if (d1 <= 0 && d2 <= 0) {
    q = a;
  } else {
    const bp = sub(p, b);
    const d3 = dot(ab, bp);
    const d4 = dot(ac, bp);
    if (d3 >= 0 && d4 <= d3) {
      q = b;
    } else {
      const vc = d1 * d4 - d3 * d2;
      if (vc <= 0 && d1 >= 0 && d3 <= 0) {
        const v = d1 / (d1 - d3);
        q = [a[0] + v * ab[0], a[1] + v * ab[1], a[2] + v * ab[2]];
      } else {
        const cp = sub(p, c);
        const d5 = dot(ab, cp);
        const d6 = dot(ac, cp);
        if (d6 >= 0 && d5 <= d6) {
          q = c;
        } else {
          const vb = d5 * d2 - d1 * d6;
          if (vb <= 0 && d2 >= 0 && d6 <= 0) {
            const w = d2 / (d2 - d6);
            q = [a[0] + w * ac[0], a[1] + w * ac[1], a[2] + w * ac[2]];
          } else {
            const va = d3 * d6 - d5 * d4;
            if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
              const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
              q = [
                b[0] + w * (c[0] - b[0]),
                b[1] + w * (c[1] - b[1]),
                b[2] + w * (c[2] - b[2]),
              ];
            } else {
              const denom = 1 / (va + vb + vc);
              const v = vb * denom;
              const w = vc * denom;
              q = [
                a[0] + ab[0] * v + ac[0] * w,
                a[1] + ab[1] * v + ac[1] * w,
                a[2] + ab[2] * v + ac[2] * w,
              ];
            }
          }
        }
      }
    }
  }
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

/** The distance from a segment to a triangle it does not cross. */
function segmentTriangle(p: V3, q: V3, a: V3, b: V3, c: V3): number {
  return Math.min(
    pointTriangle(p, a, b, c),
    pointTriangle(q, a, b, c),
    segmentSegment(p, q, a, b),
    segmentSegment(p, q, b, c),
    segmentSegment(p, q, c, a),
  );
}

const positionAt = (ray: QueryRay, t: number): Float64Array =>
  Float64Array.from(
    [0, 1, 2],
    (i) => ray.from[i]! + t * (ray.to[i]! - ray.from[i]!),
  );

function merge(spans: [number, number][]): [number, number][] {
  const sorted = [...spans].sort((x, y) => x[0] - y[0]);
  const out: [number, number][] = [];
  for (const s of sorted) {
    const last = out.at(-1);
    if (last && s[0] <= last[1]) {
      last[1] = Math.max(last[1], s[1]);
    } else {
      out.push([s[0], s[1]]);
    }
  }
  return out;
}

/**
 * Each ray against `tileset`'s retained geometry (plan 5b's call 32), in its
 * anchor's coordinates. A tileset that keeps no triangles answers `unknown`
 * with `"unsupported"`. The answer's accuracy is the largest geometric
 * error among the drawn tiles the ray crosses.
 */
export function castTilesetRays(
  tileset: RayTileset,
  rays: readonly QueryRay[],
  options: TilesetRayOptions = {},
): RayAnswer[] {
  if (!tileset.retainGeometry) {
    return rays.map(() => ({
      verdict: "unknown" as const,
      unknown: [{ from: 0, to: 1, reason: "unsupported" as const }],
      accuracy: { note: "the tileset keeps no triangles (retainGeometry)" },
    }));
  }
  const tolerance = options.endTolerance ?? 1e-3;
  const { band, ellipsoid } = options;
  const radii = ellipsoid?.radii;
  return rays.map((ray) => {
    const d = sub(ray.to, ray.from);
    const span = Math.hypot(...d);
    // The band: the part of the segment between the lowest and highest
    // terrain. Above it is clear; entering the lower shell is blocked.
    let lo = 0;
    let hi = 1;
    let below: number | undefined;
    if (band && radii) {
      const outer = crossing(
        ray.from,
        ray.to,
        Array.from(radii, (r) => r + band.max),
      );
      if (outer === undefined || outer.exit < 0 || outer.entry > 1) {
        return {
          verdict: "clear" as const,
          unknown: [],
          accuracy: {
            note: "above the body's highest terrain: no terrain to meet",
          },
        };
      }
      lo = Math.max(0, outer.entry);
      hi = Math.min(1, outer.exit);
      const inner = crossing(
        ray.from,
        ray.to,
        Array.from(radii, (r) => r + band.min),
      );
      if (inner !== undefined && inner.exit >= 0 && inner.entry <= 1) {
        below = Math.max(lo, inner.entry);
        if (below <= lo && inner.startsInside) {
          below = 0;
        }
        hi = Math.min(hi, below);
      }
    }
    const unknown: UnknownSpan[] = [];
    const covered: [number, number][] = [];
    let hit: number | undefined;
    let error = 0;
    const visit = (tile: RayTile): void => {
      const box = volumeObb(tile.volume);
      let grown: [number, number] | undefined = [lo, hi];
      if (box) {
        grown = overlap(ray.from, d, box, tile.geometricError);
        if (grown === undefined) {
          return;
        }
        grown = [Math.max(grown[0], lo), Math.min(grown[1], hi)];
        if (!(grown[0] <= grown[1])) {
          return;
        }
      }
      const drawn = tile.viewMask !== 0;
      const standIn = tile.standInMask !== 0;
      if (standIn) {
        const own = box ? overlap(ray.from, d, box, 0) : [lo, hi];
        if (own) {
          covered.push([Math.max(own[0]!, lo), Math.min(own[1]!, hi)]);
          unknown.push({
            from: Math.max(own[0]!, lo),
            to: Math.min(own[1]!, hi),
            reason: "notRefined",
          });
        }
      } else if (drawn && tile.geometry && tile.geometry.length > 0) {
        const own = box ? overlap(ray.from, d, box, 0) : [lo, hi];
        if (own) {
          covered.push([Math.max(own[0]!, lo), Math.min(own[1]!, hi)]);
        }
        error = Math.max(error, tile.geometricError);
        let nearest: number | undefined;
        let near = Infinity;
        for (const g of tile.geometry) {
          const m = g.matrix;
          const p = g.positions;
          const world = (i: number): V3 => {
            const x = p[i * 3]!;
            const y = p[i * 3 + 1]!;
            const z = p[i * 3 + 2]!;
            return [
              m[0]! * x + m[4]! * y + m[8]! * z + m[12]!,
              m[1]! * x + m[5]! * y + m[9]! * z + m[13]!,
              m[2]! * x + m[6]! * y + m[10]! * z + m[14]!,
            ];
          };
          for (let k = 0; k + 2 < g.indices.length; k += 3) {
            const a = world(g.indices[k]!);
            const b = world(g.indices[k + 1]!);
            const c = world(g.indices[k + 2]!);
            const t = hitTriangle(ray.from, d, a, b, c);
            if (
              t !== undefined &&
              t >= lo &&
              t <= hi &&
              t * span >= tolerance &&
              (1 - t) * span >= tolerance
            ) {
              nearest = nearest === undefined ? t : Math.min(nearest, t);
            } else if (tile.geometricError > 0) {
              const to: V3 = [ray.to[0]!, ray.to[1]!, ray.to[2]!];
              const from: V3 = [ray.from[0]!, ray.from[1]!, ray.from[2]!];
              near = Math.min(near, segmentTriangle(from, to, a, b, c));
            }
          }
        }
        if (nearest !== undefined) {
          hit = hit === undefined ? nearest : Math.min(hit, nearest);
        } else if (near < tile.geometricError) {
          unknown.push({
            from: grown[0],
            to: grown[1],
            reason: "withinError",
          });
        }
      }
      for (const child of tile.children) {
        visit(child);
      }
    };
    visit(tileset.root);
    // Where the band is not covered by a drawn tile: not loaded (the whole
    // segment, without a band).
    const rootBox = volumeObb(tileset.root.volume);
    const inRoot: [number, number] | undefined =
      band && radii && rootBox ? overlap(ray.from, d, rootBox, 0) : [0, 1];
    if (inRoot) {
      let at = Math.max(lo, inRoot[0]!);
      const end = Math.min(hi, inRoot[1]!);
      for (const [from, to] of merge(covered)) {
        if (from > at) {
          unknown.push({
            from: at,
            to: Math.min(from, end),
            reason: "notLoaded",
          });
        }
        at = Math.max(at, to);
      }
      if (at < end) {
        unknown.push({ from: at, to: end, reason: "notLoaded" });
      }
    }
    unknown.sort((a, b) => a.from - b.from || a.to - b.to);
    const noteOf = (extra: string): string =>
      error > 0
        ? `${extra}the drawn tiles' geometric error`
        : extra || "the drawn tiles' geometry";
    const accuracy = {
      ...(error > 0 && { meters: error }),
      note: noteOf(""),
    };
    // The nearest block: a triangle, or the lower edge of the band.
    const blockAt =
      hit !== undefined && (below === undefined || hit <= below) ? hit : below;
    if (blockAt !== undefined) {
      return {
        verdict: "blocked" as const,
        hit: { t: blockAt, position: positionAt(ray, blockAt) },
        unknown: unknown.filter((u) => u.from < blockAt),
        accuracy:
          hit === blockAt
            ? accuracy
            : {
                note: "below the body's lowest terrain: blocked without tiles",
              },
      };
    }
    return {
      verdict: unknown.length > 0 ? ("unknown" as const) : ("clear" as const),
      unknown,
      accuracy,
    };
  });
}
