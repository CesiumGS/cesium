// Rays against a body's ellipsoid and against an impostor of it (frames 5b,
// Task 7), in the body's anchor coordinates. Pure geometry: no scene, no
// frames. A hit within `endTolerance` of either end is the observer's own
// ground (default 1 mm).
import type { QueryRay, RayAnswer } from "./queries.ts";

const OWN_GROUND = 1e-3;

/** Where a segment meets the ellipsoid with the given radii: entry and exit as fractions, or none. */
export interface Crossing {
  readonly entry: number;
  readonly exit: number;
  /** The segment starts inside the ellipsoid. */
  readonly startsInside: boolean;
}

export function crossing(
  from: ArrayLike<number>,
  to: ArrayLike<number>,
  radii: ArrayLike<number>,
): Crossing | undefined {
  // In the ellipsoid's own scaled space it is the unit sphere. The closest
  // approach to the centre first, then the half-chord about it: stable where
  // the quadratic's discriminant, millions of metres squared, is not.
  const f = [0, 0, 0];
  const d = [0, 0, 0];
  let dd = 0;
  let fd = 0;
  let ff = 0;
  for (let i = 0; i < 3; i++) {
    f[i] = from[i]! / radii[i]!;
    d[i] = (to[i]! - from[i]!) / radii[i]!;
    dd += d[i]! * d[i]!;
    fd += f[i]! * d[i]!;
    ff += f[i]! * f[i]!;
  }
  if (!(dd > 0)) {
    return undefined;
  }
  const t0 = -fd / dd;
  let p0 = 0;
  for (let i = 0; i < 3; i++) {
    const q = f[i]! + t0 * d[i]!;
    p0 += q * q;
  }
  if (p0 > 1) {
    return undefined;
  }
  const h = Math.sqrt(1 - p0) / Math.sqrt(dd);
  return { entry: t0 - h, exit: t0 + h, startsInside: ff < 1 };
}

const length = (from: ArrayLike<number>, to: ArrayLike<number>): number =>
  Math.hypot(to[0]! - from[0]!, to[1]! - from[1]!, to[2]! - from[2]!);

const clear = (accuracy: RayAnswer["accuracy"]): RayAnswer => ({
  verdict: "clear",
  unknown: [],
  accuracy,
});

function blockedAt(
  ray: QueryRay,
  t: number,
  accuracy: RayAnswer["accuracy"],
  unknown: RayAnswer["unknown"] = [],
): RayAnswer {
  const position = new Float64Array(3);
  for (let i = 0; i < 3; i++) {
    position[i] = ray.from[i]! + t * (ray.to[i]! - ray.from[i]!);
  }
  return { verdict: "blocked", hit: { t, position }, unknown, accuracy };
}

/**
 * Each ray against the ellipsoid with `radii` (m): blocked at its entry, or
 * at its start when it starts inside; clear otherwise. Exact for the
 * ellipsoid, and says it is not the terrain.
 */
export function castEllipsoid(
  rays: readonly QueryRay[],
  radii: ArrayLike<number>,
  endTolerance = OWN_GROUND,
): RayAnswer[] {
  const accuracy = {
    meters: 0,
    note: "the body's ellipsoid, not its terrain",
  };
  return rays.map((ray) => {
    const x = crossing(ray.from, ray.to, radii);
    if (x === undefined) {
      return clear(accuracy);
    }
    const span = length(ray.from, ray.to);
    if (x.startsInside) {
      return blockedAt(ray, 0, {
        ...accuracy,
        note: `${accuracy.note}: the ray starts inside it`,
      });
    }
    if (x.entry < 0 || x.entry > 1) {
      return clear(accuracy);
    }
    if (x.entry * span < endTolerance || (1 - x.entry) * span < endTolerance) {
      return clear(accuracy);
    }
    return blockedAt(ray, x.entry, accuracy);
  });
}

/**
 * Each ray against an impostor: the ellipsoid with `relief` (m, the larger
 * of its terrain band's two bounds) as the error. Blocked inside the
 * ellipsoid shrunk by the relief, clear outside the one grown by it, and
 * `withinError` between.
 */
export function castImpostor(
  rays: readonly QueryRay[],
  radii: ArrayLike<number>,
  relief: number,
  endTolerance = OWN_GROUND,
): RayAnswer[] {
  const accuracy = {
    meters: relief,
    note: `an impostor: the body's ellipsoid, with the relief of its terrain band (${relief} m) as the error`,
  };
  const shrunk = Array.from(radii, (r) => r - relief);
  const grown = Array.from(radii, (r) => r + relief);
  return rays.map((ray) => {
    const outer = crossing(ray.from, ray.to, grown);
    if (outer === undefined) {
      return clear(accuracy);
    }
    const lo = Math.max(0, outer.entry);
    const hi = Math.min(1, outer.exit);
    if (!(lo < hi)) {
      return clear(accuracy);
    }
    const inner = crossing(ray.from, ray.to, shrunk);
    const span = length(ray.from, ray.to);
    let entry: number | undefined;
    if (inner !== undefined) {
      if (inner.startsInside) {
        entry = 0;
      } else if (
        inner.entry >= 0 &&
        inner.entry <= 1 &&
        inner.entry * span >= endTolerance &&
        (1 - inner.entry) * span >= endTolerance
      ) {
        entry = inner.entry;
      }
    }
    if (entry === undefined) {
      return {
        verdict: "unknown",
        unknown: [{ from: lo, to: hi, reason: "withinError" }],
        accuracy,
      };
    }
    return blockedAt(
      ray,
      entry,
      accuracy,
      lo < entry ? [{ from: lo, to: entry, reason: "withinError" }] : [],
    );
  });
}
