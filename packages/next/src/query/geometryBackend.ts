// Rays against a tileset's retained geometry, clipped to its body's terrain
// band (frames 5b, Task 8): in the tileset's anchor coordinates, float64. The
// segment is first clipped to the band: above it, clear; below it, blocked.
// Inside the band, drawn tiles are tested triangle by triangle; a stand-in
// tile, an undrawn span and a miss within a tile's geometric error are
// undecided, each with its reason.
import type { Ellipsoid } from "../math/ellipsoid.ts";
import { volumeObb, type Obb, type TileVolume } from "../streaming/volumes.ts";
import { dot, meshGeometry, sub, type V3 } from "../geometry/mesh.ts";
import type { ClipFilter } from "../geometry/query.ts";
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
  /**
   * Clips applied (`clipFilter`, scene/world/clips.ts), in the tileset's
   * anchor coordinates: a hit where they remove the surface is passed over.
   * Picks and snaps pass their view's; world questions pass none.
   */
  readonly clips?: ClipFilter;
}

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
          const mesh = meshGeometry(g);
          const answer = mesh.rayHit(ray, {
            tMin: Math.max(lo, tolerance / span),
            tMax: Math.min(hi, 1 - tolerance / span),
            ...(options.clips && { clips: options.clips }),
          });
          if (answer.verdict === "hit") {
            nearest =
              nearest === undefined
                ? answer.hit.t
                : Math.min(nearest, answer.hit.t);
          }
        }
        if (nearest === undefined && tile.geometricError > 0) {
          for (const g of tile.geometry) {
            near = Math.min(
              near,
              meshGeometry(g).segmentDistance(ray.from, ray.to, {
                ...(options.clips && { clips: options.clips }),
              }).distance,
            );
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
