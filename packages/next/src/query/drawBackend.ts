/**
 * The query interface's draws engine for 5a (spec section 7.10): rays
 * against the triangles of the world's draws under the query's anchor,
 * brute force on the GPU (`World.castRays`, one dispatch and one readback
 * per world, anchor and view mask for every query in the batch). A
 * hardware ray-query engine replaces this backend, not the callers.
 *
 * The cast meets only what is drawn. Where a streamed tileset's content
 * isn't drawn yet, or only a coarser tile stands in, nothing was tested,
 * so those spans are unknown, never clear (`untestedSpans`).
 */
import type { CastOptions, CastRay, World } from "../scene/World.ts";
import type { Tile } from "../streaming/Tile.ts";
import type {
  RayAnswer,
  RayBackend,
  RayQuery,
  UnknownSpan,
} from "./queries.ts";

/** Where a query's rays are cast: the world, and the cast's anchor and views. */
export interface DrawRoute {
  readonly world: Pick<World, "castRays">;
  readonly options: CastOptions;
  /** Groups queries into one cast: equal keys, one dispatch. */
  readonly key: string;
  /**
   * The roots of the streamed tilesets under the cast's anchor: where the
   * ray crosses their tiles that aren't drawn, it can't tell.
   */
  readonly tilesets?: readonly Tile[];
}

const ALL_VIEWS = 0xffffffff;
/** Tiles visited per ray at most; past it the rest of a root is unknown. */
const MAX_VISITS = 100_000;

/** The draws backend: each batch's rays cast together per route. */
export function drawBackend(
  routeFor: (query: RayQuery) => DrawRoute,
): RayBackend {
  return {
    answer: async (queries) => {
      const out: RayAnswer[][] = queries.map(() => []);
      const groups = new Map<
        string,
        {
          route: DrawRoute;
          rays: CastRay[];
          slots: [number, number, number, UnknownSpan[]][];
        }
      >();
      queries.forEach((query, q) => {
        const route = routeFor(query);
        query.rays.forEach((ray, r) => {
          const d = [0, 1, 2].map((i) => ray.to[i]! - ray.from[i]!);
          const length = Math.hypot(d[0]!, d[1]!, d[2]!);
          const finite =
            Number.isFinite(length) &&
            [0, 1, 2].every((i) => Number.isFinite(ray.from[i]!));
          if (!finite) {
            out[q]![r] = {
              verdict: "unknown",
              unknown: [{ from: 0, to: 1, reason: "unsupported" }],
              accuracy: { note: "endpoints are not finite; nothing cast" },
            };
            return;
          }
          if (length === 0) {
            out[q]![r] = {
              verdict: "clear",
              unknown: [],
              accuracy: { note: "a zero-length ray meets nothing" },
            };
            return;
          }
          let group = groups.get(route.key);
          if (!group) {
            group = { route, rays: [], slots: [] };
            groups.set(route.key, group);
          }
          const untested = untestedSpans(
            route.tilesets ?? [],
            ray.from,
            ray.to,
            route.options.viewMask ?? ALL_VIEWS,
          );
          group.slots.push([q, r, length, untested]);
          group.rays.push({
            origin: ray.from,
            direction: d.map((x) => x / length),
            maxDistance: length,
          });
        });
      });
      await Promise.all(
        [...groups.values()].map(async ({ route, rays, slots }) => {
          const hits = await route.world.castRays(rays, route.options);
          hits.forEach((distance, i) => {
            const [q, r, length, untested] = slots[i]!;
            const ray = queries[q]!.rays[r]!;
            out[q]![r] = drawAnswer(ray, rays[i]!, distance, length, untested);
          });
        }),
      );
      return out;
    },
  };
}

function drawAnswer(
  ray: RayQuery["rays"][number],
  cast: CastRay,
  distance: number | undefined,
  length: number,
  untested: readonly UnknownSpan[],
): RayAnswer {
  const bounds =
    "tiles not drawn are bounded by their bounding spheres, so their spans may run wider than the tiles";
  if (distance === undefined) {
    if (untested.length > 0) {
      const share = untested.reduce((n, s) => n + (s.to - s.from), 0);
      return {
        verdict: "unknown",
        unknown: untested,
        accuracy: {
          note: `clear of the draws drawn now (ray cast on the GPU against their triangles), but ${percent(share)}% of the ray crosses tiles not drawn yet (not loaded, out of view, or a coarser tile standing in), untested there; ${bounds}`,
        },
      };
    }
    return {
      verdict: "clear",
      unknown: [],
      accuracy: {
        note: "clear of the draws (ray cast on the GPU against their triangles); every streamed tile it crosses is drawn at the selection's error",
      },
    };
  }
  const t = distance / length;
  const position = new Float64Array(3);
  for (let i = 0; i < 3; i++) {
    position[i] = ray.from[i]! + distance * cast.direction[i]!;
  }
  // Untested content before the hit could block it sooner; beyond it,
  // nothing matters.
  const before = untested
    .filter((s) => s.from < t)
    .map((s) => (s.to > t ? { ...s, to: t } : s));
  return {
    verdict: "blocked",
    hit: { t, position },
    unknown: before,
    accuracy: {
      note: `the nearest draw's triangle, ray cast on the GPU in 32-bit floats${before.length > 0 ? `; tiles not drawn yet before it are untested, so it may be blocked sooner; ${bounds}` : ""}`,
    },
  };
}

/**
 * The spans of the segment `from`–`to` (fractions) over streamed content
 * the cast doesn't test in the views of `viewMask`: tiles whose content
 * isn't drawn there ("notLoaded": not loaded, cached but out of view), and
 * tiles drawn only as a coarser stand-in or placeholder while finer ones
 * load, with what isn't drawn under them ("notRefined"). A drawn tile the
 * selection didn't refine is tested at the selection's error: its finer
 * tiles aren't needed. Each tile is bounded by its bounding sphere, in the
 * anchor's coordinates (as the tileset places it). Per reason, merged.
 */
export function untestedSpans(
  roots: readonly Tile[],
  from: ArrayLike<number>,
  to: ArrayLike<number>,
  viewMask: number,
): UnknownSpan[] {
  const mask = viewMask >>> 0;
  const found: Record<"notLoaded" | "notRefined", [number, number][]> = {
    notLoaded: [],
    notRefined: [],
  };
  const dx = to[0]! - from[0]!;
  const dy = to[1]! - from[1]!;
  const dz = to[2]! - from[2]!;
  const a = dx * dx + dy * dy + dz * dz;
  if (!(a > 0)) {
    return [];
  }
  /** Where the segment is inside `tile`'s bounding sphere, if anywhere. */
  const crossed = (tile: Tile): [number, number] | undefined => {
    const { center: c, radius } = tile.volume.sphere;
    const ox = from[0]! - c[0]!;
    const oy = from[1]! - c[1]!;
    const oz = from[2]! - c[2]!;
    const b = 2 * (dx * ox + dy * oy + dz * oz);
    const k = ox * ox + oy * oy + oz * oz - radius * radius;
    const disc = b * b - 4 * a * k;
    if (disc < 0) {
      return undefined;
    }
    const root = Math.sqrt(disc);
    const t0 = Math.max(0, (-b - root) / (2 * a));
    const t1 = Math.min(1, (-b + root) / (2 * a));
    return t0 < t1 ? [t0, t1] : undefined;
  };
  const refinedIn = (tile: Tile): boolean => {
    for (let bit = 0; bit < 32; bit++) {
      if ((mask & (1 << bit)) !== 0 && tile.views[bit]?.refines) {
        return true;
      }
    }
    return false;
  };
  let visits = 0;
  const visit = (tile: Tile, coarse: boolean, span: [number, number]) => {
    const reason = coarse ? "notRefined" : "notLoaded";
    if (++visits > MAX_VISITS) {
      found[reason].push(span);
      return;
    }
    const children = (under: boolean) => {
      for (const child of tile.children) {
        const s = crossed(child);
        if (s) {
          visit(child, under, s);
        }
      }
    };
    const drawn =
      tile.renderable &&
      tile.state === "ready" &&
      tile.placement !== undefined &&
      (tile.appliedMask & mask) !== 0;
    if (drawn) {
      if ((tile.standInMask & mask) !== 0) {
        found.notRefined.push(span); // drawn whole for finer tiles loading
      } else if ((tile.placeholderMask & mask) !== 0) {
        children(true); // drawn round holes its finer tiles fill
      } else if (tile.refine === "ADD" && refinedIn(tile)) {
        children(coarse); // its children add content the view wants
      }
      return;
    }
    if (!tile.renderable) {
      if (tile.state !== "ready" && tile.state !== "failed") {
        found[reason].push(span); // an external tileset not loaded yet
      } else {
        children(coarse); // empty: what's under it holds the content
      }
      return;
    }
    if (tile.residentBelow > 0) {
      children(coarse); // refined past it: finer tiles are loaded
      return;
    }
    found[reason].push(span);
  };
  for (const root of roots) {
    const s = crossed(root);
    if (s) {
      visit(root, false, s);
    }
  }
  const out: UnknownSpan[] = [];
  for (const reason of ["notLoaded", "notRefined"] as const) {
    const spans = found[reason].sort((p, q) => p[0] - q[0]);
    let current: [number, number] | undefined;
    for (const s of spans) {
      if (current && s[0] <= current[1]) {
        current[1] = Math.max(current[1], s[1]);
      } else {
        if (current) {
          out.push({ from: current[0], to: current[1], reason });
        }
        current = [s[0], s[1]];
      }
    }
    if (current) {
      out.push({ from: current[0], to: current[1], reason });
    }
  }
  return out.sort((p, q) => p.from - q.from || p.to - q.to);
}

/** A share as a whole percent that is never 0 or 100 unless it is. */
function percent(fraction: number): string {
  const p = fraction * 100;
  if (p <= 0 || p >= 100) {
    return p <= 0 ? "0" : "100";
  }
  return String(Math.min(99, Math.max(1, Math.round(p))));
}
