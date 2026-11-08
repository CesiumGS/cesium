/**
 * The query interface's draws engine for 5a (spec section 7.10): rays
 * against the triangles of the world's draws under the query's anchor,
 * brute force on the GPU (`World.castRays`, one dispatch and one readback
 * per world, anchor and view mask for every query in the batch). A
 * hardware ray-query engine replaces this backend, not the callers.
 */
import type { CastOptions, CastRay, World } from "../scene/World.ts";
import type { RayAnswer, RayBackend, RayQuery } from "./queries.ts";

/** Where a query's rays are cast: the world, and the cast's anchor and views. */
export interface DrawRoute {
  readonly world: Pick<World, "castRays">;
  readonly options: CastOptions;
  /** Groups queries into one cast: equal keys, one dispatch. */
  readonly key: string;
}

/** The draws backend: each batch's rays cast together per route. */
export function drawBackend(
  routeFor: (query: RayQuery) => DrawRoute,
): RayBackend {
  return {
    answer: async (queries) => {
      const out: RayAnswer[][] = queries.map(() => []);
      const groups = new Map<
        string,
        { route: DrawRoute; rays: CastRay[]; slots: [number, number, number][] }
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
          group.slots.push([q, r, length]);
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
            const [q, r, length] = slots[i]!;
            const ray = queries[q]!.rays[r]!;
            out[q]![r] = drawAnswer(ray, rays[i]!, distance, length);
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
): RayAnswer {
  if (distance === undefined) {
    return {
      verdict: "clear",
      unknown: [],
      accuracy: {
        note: "clear of the draws loaded now (ray cast on the GPU against their triangles); content not yet loaded is not tested",
      },
    };
  }
  const position = new Float64Array(3);
  for (let i = 0; i < 3; i++) {
    position[i] = ray.from[i]! + distance * cast.direction[i]!;
  }
  return {
    verdict: "blocked",
    hit: { t: distance / length, position },
    unknown: [],
    accuracy: {
      note: "the nearest draw's triangle, ray cast on the GPU in 32-bit floats",
    },
  };
}
