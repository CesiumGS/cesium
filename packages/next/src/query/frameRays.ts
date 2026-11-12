// Rays through the frame tree (frames 5b, Task 7): a query with a reference
// frame is carried into each target's anchor through the world's frame
// resolver, answered there (by the anchor-level backends, the ellipsoid, or a
// tileset's geometry), and its hits carried back into the reference frame
// asked for. Float64 on the CPU throughout. This is core: it knows the
// resolver's interface, not the frames module.
import {
  FrameUnavailableError,
  type FrameKey,
  type FrameResolver,
} from "../camera/frameResolver.ts";
import { resolveRoute, routeForward, routeIsRigid } from "../camera/route.ts";
import { C } from "../math/constants.ts";
import type { World } from "../scene/World.ts";
import type { AnchorHandle } from "../scene/world/types.ts";
import type { Tileset3D } from "../streaming/Tileset3D.ts";
import { castEllipsoid, castImpostor } from "./ellipsoidBackend.ts";
import {
  combineRayAnswers,
  unsupported,
  type QueryAnswer,
  type QueryRay,
  type RayAnswer,
  type RayQuery,
  type RayTarget,
  type SpatialQueries,
} from "./queries.ts";

/** What `castFrameRays` needs of its engine. */
export interface FrameRayHost {
  readonly world: World;
  readonly resolver: FrameResolver;
  /** The anchor-level queries (`"terrain"` and `"draws"`, in an anchor's coordinates). */
  readonly anchorQueries: SpatialQueries;
  /**
   * A tileset's answers for rays in its anchor's coordinates, or none when
   * this engine has no such backend (Task 8).
   */
  readonly tilesetRays?: (
    tileset: Tileset3D,
    rays: readonly QueryRay[],
    query: RayQuery,
  ) => RayAnswer[];
}

const unknownRoute = (message: string, count: number): RayAnswer[] =>
  Array.from({ length: count }, () => ({
    verdict: "unknown" as const,
    unknown: [{ from: 0, to: 1, reason: "route" as const }],
    accuracy: { note: message },
  }));

const abortReason = (signal: AbortSignal | undefined): unknown =>
  signal?.reason ?? new DOMException("aborted", "AbortError");

/** `m · p` for a column-major affine `m`. */
function apply(
  m: ArrayLike<number>,
  p: ArrayLike<number>,
  out: Float64Array = new Float64Array(3),
): Float64Array {
  const x = p[0]!;
  const y = p[1]!;
  const z = p[2]!;
  out[0] = m[0]! * x + m[4]! * y + m[8]! * z + m[12]!;
  out[1] = m[1]! * x + m[5]! * y + m[9]! * z + m[13]!;
  out[2] = m[2]! * x + m[6]! * y + m[10]! * z + m[14]!;
  return out;
}

/** A carrier of points between two frames (`carrier`); `smooth` when its route crosses a smooth edge. */
type Carrier = ((p: ArrayLike<number>) => Float64Array) & {
  smooth?: true;
};

/**
 * A carrier of points of `from` into `to` at `seconds`, in float64: a rigid
 * route by its matrix, a route across smooth edges point by point
 * (`routeForward`; a ray is carried by its two ends, so it stays straight in
 * `to`, which is the frame the query is answered in).
 */
function carrier(
  resolver: FrameResolver,
  from: FrameKey,
  to: FrameKey,
  seconds: number,
): Carrier {
  const route = resolveRoute(resolver, from, to, seconds);
  const first = route.steps[0]!;
  if (first.kind === "rigid" && routeIsRigid(route)) {
    const m = first.matrix;
    return (p) => apply(m, p);
  }
  const carry: Carrier = (p) => routeForward(route, p);
  carry.smooth = true;
  return carry;
}

/**
 * The scene time each ray places `anchor` at: `seconds` when geometric, else
 * `seconds − τ`, with τ the light time from the ray's start to its closest
 * point to the anchor's origin, iterated twice (plan 5b's call 29).
 */
function placementTimes(
  query: RayQuery,
  resolver: FrameResolver,
  frame: FrameKey,
  anchor: FrameKey,
): number[] {
  if (query.correction !== "lightTime") {
    return query.rays.map(() => query.seconds);
  }
  return query.rays.map((ray) => {
    let tau = 0;
    for (let i = 0; i < 2; i++) {
      const origin = carrier(
        resolver,
        anchor,
        frame,
        query.seconds - tau,
      )(ORIGIN);
      const dx = ray.to[0]! - ray.from[0]!;
      const dy = ray.to[1]! - ray.from[1]!;
      const dz = ray.to[2]! - ray.from[2]!;
      const d2 = dx * dx + dy * dy + dz * dz;
      const t =
        d2 > 0
          ? Math.min(
              1,
              Math.max(
                0,
                ((origin[0]! - ray.from[0]!) * dx +
                  (origin[1]! - ray.from[1]!) * dy +
                  (origin[2]! - ray.from[2]!) * dz) /
                  d2,
              ),
            )
          : 0;
      tau = (t * Math.sqrt(d2)) / C;
    }
    return query.seconds - tau;
  });
}

const ORIGIN = [0, 0, 0] as const;

/**
 * One target in one anchor: the rays carried in, answered, and the hits
 * carried to `reportIn`, with the route's accuracy added to the target's.
 */
async function inAnchor(
  query: RayQuery,
  host: FrameRayHost,
  frame: FrameKey,
  reportIn: FrameKey,
  target: RayTarget,
  anchor: FrameKey,
  answer: (
    rays: QueryRay[],
    times: number[],
  ) => Promise<RayAnswer[]> | RayAnswer[],
): Promise<RayAnswer[]> {
  const { resolver } = host;
  const times = placementTimes(query, resolver, frame, anchor);
  // One route per distinct time (a geometric query has one).
  const carrierAt = (from: FrameKey, to: FrameKey) => {
    const bySeconds = new Map<number, Carrier>();
    return (s: number): Carrier => {
      let c = bySeconds.get(s);
      if (!c) {
        c = carrier(resolver, from, to, s);
        bySeconds.set(s, c);
      }
      return c;
    };
  };
  const into = carrierAt(frame, anchor);
  let carriedPointwise = false;
  const rays: QueryRay[] = query.rays.map((ray, i) => {
    const carry = into(times[i]!);
    carriedPointwise ||= carry.smooth === true;
    return { from: carry(ray.from), to: carry(ray.to) };
  });
  const answers = await answer(rays, times);
  const back = reportIn !== anchor ? carrierAt(anchor, reportIn) : undefined;
  return answers.map((a, i) => {
    const s = times[i]!;
    const ray = query.rays[i]!;
    // The route's accuracy at the hit (or at the start), in the rays' frame.
    const t = a.hit?.t ?? 0;
    const point = [
      ray.from[0]! + t * (ray.to[0]! - ray.from[0]!),
      ray.from[1]! + t * (ray.to[1]! - ray.from[1]!),
      ray.from[2]! + t * (ray.to[2]! - ray.from[2]!),
    ];
    const route = resolver.accuracy?.(point, frame, anchor, s) ?? {
      meters: 0,
      note: "the transform table states no error",
    };
    const own = a.accuracy;
    const meters =
      route.meters === undefined
        ? undefined
        : own.meters === undefined
          ? undefined
          : Math.hypot(route.meters, own.meters);
    const accuracy = {
      ...(meters !== undefined && { meters }),
      note: `route: ${route.note}; target: ${own.note}${carriedPointwise ? "; the route crosses a smooth edge, so each ray is carried by its ends and is straight in the target's frame" : ""}`,
    };
    if (!a.hit) {
      return { ...a, accuracy };
    }
    let position = a.hit.position;
    if (back) {
      position = back(s)(position);
    }
    return {
      ...a,
      accuracy,
      hit: { ...a.hit, position, frame: reportIn, target, seconds: s },
    };
  });
}

/** The anchors of `world` a target lives in. */
function anchorsFor(world: World, name: "terrain" | "draws"): FrameKey[] {
  const all = world.anchors;
  return name === "terrain"
    ? all.filter((a) => a.body !== undefined)
    : [world.root, ...all];
}

/**
 * Answers a query carried through the frame tree. A target whose route the
 * resolver can't answer answers `unknown` with `"route"` for its rays; the
 * other targets still answer. Rejects with the signal's reason when
 * aborted, and when `query.world` is missing.
 */
export async function castFrameRays(
  query: RayQuery,
  host: FrameRayHost,
  signal?: AbortSignal,
): Promise<QueryAnswer> {
  if (signal?.aborted) {
    throw abortReason(signal);
  }
  const { world } = host;
  const frame: FrameKey = query.frame ?? query.anchor ?? world.root;
  const reportIn = query.reportIn ?? frame;
  const parts: RayAnswer[][] = [];
  for (const target of query.targets) {
    if (signal?.aborted) {
      throw abortReason(signal);
    }
    try {
      parts.push(
        await answerTarget(query, host, frame, reportIn, target, signal),
      );
    } catch (error) {
      if (signal?.aborted) {
        throw abortReason(signal);
      }
      // A route that isn't there yet is not an error of the query: that
      // target answers unknown, and the others still answer.
      const message =
        error instanceof FrameUnavailableError
          ? `${error.message} (${error.reason})`
          : error instanceof Error
            ? error.message
            : String(error);
      parts.push(unknownRoute(message, query.rays.length));
    }
  }
  return {
    rays: query.rays.map((_, r) =>
      parts.length === 0
        ? unsupported(undefined)
        : combineRayAnswers(
            parts.map((p) => p[r]!),
            query.targets,
          ),
    ),
    revision: world.contentRevision,
    final: true,
  };
}

async function answerTarget(
  query: RayQuery,
  host: FrameRayHost,
  frame: FrameKey,
  reportIn: FrameKey,
  target: RayTarget,
  signal: AbortSignal | undefined,
): Promise<RayAnswer[]> {
  const { world } = host;
  const count = query.rays.length;
  if (typeof target === "string") {
    const anchors = anchorsFor(world, target);
    if (anchors.length === 0) {
      return query.rays.map(() => unsupported(target));
    }
    const perAnchor: RayAnswer[][] = [];
    for (const anchor of anchors) {
      try {
        perAnchor.push(
          await inAnchor(
            query,
            host,
            frame,
            reportIn,
            target,
            anchor,
            async (rays) => {
              const asked: RayQuery = {
                anchor:
                  anchor === world.root ? undefined : (anchor as AnchorHandle),
                seconds: query.seconds,
                rays,
                targets: [target],
                ...(query.view && { view: query.view }),
                ...(query.clips !== undefined && { clips: query.clips }),
                ...(query.terrain && { terrain: query.terrain }),
                world,
              };
              return (
                await host.anchorQueries.castRays(
                  asked,
                  signal ? { signal } : {},
                )
              ).rays as RayAnswer[];
            },
          ),
        );
      } catch (error) {
        if (signal?.aborted) {
          throw abortReason(signal);
        }
        // One anchor's route failing leaves the others; all failing is
        // the route's failure.
        if (perAnchor.length === 0 && anchor === anchors.at(-1)) {
          throw error;
        }
      }
    }
    return query.rays.map((_, r) =>
      combineRayAnswers(
        perAnchor.map((a) => a[r]!),
        perAnchor.map(() => target),
      ),
    );
  }
  if (target.kind === "body" || target.kind === "impostor") {
    const anchor = world.bodyAnchor(target.body);
    const radii = target.body.ellipsoid.radii;
    const band = target.body.terrainBand;
    const relief = band ? Math.max(Math.abs(band.min), Math.abs(band.max)) : 0;
    return inAnchor(query, host, frame, reportIn, target, anchor, (rays) =>
      target.kind === "body"
        ? castEllipsoid(rays, radii)
        : castImpostor(rays, radii, relief),
    );
  }
  // A tileset: its retained geometry, in its anchor's coordinates.
  const tileset = target.tileset;
  if (!host.tilesetRays) {
    return query.rays.map(() => unsupported(target));
  }
  const anchor: FrameKey = tileset.anchor ?? world.root;
  return inAnchor(query, host, frame, reportIn, target, anchor, (rays) =>
    host.tilesetRays!(tileset, rays, query),
  ).then((answers) => (answers.length === count ? answers : []));
}
