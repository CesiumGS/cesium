// A signed distance field as a geometry (brep 3): the f-rep slot of the query
// interface. Rays sphere-trace, closest points project down the gradient, and
// segment distances are sampled. The field is evaluated in its own
// coordinates as given: `origin` in the options is accepted and ignored, as
// the field has no large coordinates of its own to centre on. `clips` apply to
// rays (a hit they remove is marched past); closest points and segment
// distances don't take them yet.
import type { QueryRay } from "../query/queries.ts";
import type {
  ClosestPoint,
  ClosestPointOptions,
  DisplayMesh,
  EntityInfo,
  EntityRef,
  GeometryAccuracy,
  GeometryBounds,
  GeometryQueries,
  GeometryRayAnswer,
  RayHitOptions,
  SegmentDistance,
} from "./query.ts";

/** A signed distance, m, negative inside: a true distance or a lower bound on it (1-Lipschitz). */
export interface DistanceField {
  distance(x: number, y: number, z: number): number;
  readonly min: ArrayLike<number>;
  readonly max: ArrayLike<number>;
  /** How far `distance` may be off, m (default 0). */
  readonly error?: number;
}

export interface SdfGeometryOptions {
  /** Default 256. */
  readonly maxSteps?: number;
  /** Hit when the distance is below this, m (default 1e-4). */
  readonly epsilon?: number;
  readonly version?: number;
}

const FACE: EntityRef = { kind: "face", index: 0 };
const PROJECTIONS = 8;
const REFINE_STEPS = 20;
const INV_PHI = (Math.sqrt(5) - 1) / 2;

export function sdfGeometry(
  field: DistanceField,
  options: SdfGeometryOptions = {},
): GeometryQueries {
  const maxSteps = options.maxSteps ?? 256;
  const epsilon = options.epsilon ?? 1e-4;
  if (!(Number.isFinite(epsilon) && epsilon > 0)) {
    throw new Error("sdfGeometry: epsilon must be a positive finite number");
  }
  if (!(Number.isInteger(maxSteps) && maxSteps >= 1)) {
    throw new Error("sdfGeometry: maxSteps must be a positive integer");
  }
  const error = field.error ?? 0;
  const lo = [field.min[0]!, field.min[1]!, field.min[2]!] as const;
  const hi = [field.max[0]!, field.max[1]!, field.max[2]!] as const;
  const f = (x: number, y: number, z: number): number =>
    field.distance(x, y, z);

  const hitAccuracy: GeometryAccuracy = {
    meters: epsilon + error,
    exact: false,
    note: "sphere-traced to the distance field's epsilon",
  };

  /** The unit gradient by central differences (step epsilon); undefined where it is flat. */
  const gradient = (
    x: number,
    y: number,
    z: number,
  ): [number, number, number] | undefined => {
    const gx = f(x + epsilon, y, z) - f(x - epsilon, y, z);
    const gy = f(x, y + epsilon, z) - f(x, y - epsilon, z);
    const gz = f(x, y, z + epsilon) - f(x, y, z - epsilon);
    const n = Math.hypot(gx, gy, gz);
    return n > 0 ? [gx / n, gy / n, gz / n] : undefined;
  };

  const bounds = (): GeometryBounds => ({
    min: Float64Array.from(lo),
    max: Float64Array.from(hi),
    accuracy: { meters: 0, exact: true, note: "the field's declared box" },
  });

  const rayHit = (ray: QueryRay, o: RayHitOptions = {}): GeometryRayAnswer => {
    const from = ray.from;
    const dx = ray.to[0]! - from[0]!;
    const dy = ray.to[1]! - from[1]!;
    const dz = ray.to[2]! - from[2]!;
    const length = Math.hypot(dx, dy, dz);
    const miss: GeometryRayAnswer = { verdict: "miss", accuracy: hitAccuracy };
    let t0 = o.tMin ?? 0;
    let t1 = o.tMax ?? 1;

    const hitAt = (t: number, dist = 0): GeometryRayAnswer => {
      const px = from[0]! + t * dx;
      const py = from[1]! + t * dy;
      const pz = from[2]! + t * dz;
      const n = gradient(px, py, pz);
      const normal = new Float64Array(3);
      if (n && length > 0) {
        // Turned to face the ray's start.
        const s = n[0] * dx + n[1] * dy + n[2] * dz > 0 ? -1 : 1;
        normal[0] = s * n[0];
        normal[1] = s * n[1];
        normal[2] = s * n[2];
      } else if (length > 0) {
        normal[0] = -dx / length;
        normal[1] = -dy / length;
        normal[2] = -dz / length;
      } else if (n) {
        normal.set(n);
      }
      return {
        verdict: "hit",
        hit: {
          t,
          position: Float64Array.of(px, py, pz),
          normal,
          entity: FACE,
          // Starting inside, the surface may be as far as the depth.
          accuracy:
            dist < 0
              ? {
                  ...hitAccuracy,
                  meters: Math.max(epsilon, -dist) + error,
                  note: "the ray starts inside the field: the surface is within the depth of the start",
                }
              : hitAccuracy,
        },
      };
    };

    if (length === 0) {
      // No direction to march: only a start inside the field is a hit.
      const inside = f(from[0]!, from[1]!, from[2]!);
      return inside < 0 && (!o.clips || o.clips.keeps(from))
        ? hitAt(t0, inside)
        : miss;
    }

    // Clip [t0, t1] to the bounds box (slab test).
    const d = [dx, dy, dz] as const;
    for (let i = 0; i < 3; i++) {
      const a = from[i]!;
      if (d[i] === 0) {
        if (a < lo[i]! || a > hi[i]!) {
          return miss;
        }
        continue;
      }
      let s0 = (lo[i]! - a) / d[i]!;
      let s1 = (hi[i]! - a) / d[i]!;
      if (s0 > s1) {
        [s0, s1] = [s1, s0];
      }
      t0 = Math.max(t0, s0);
      t1 = Math.min(t1, s1);
    }
    if (t0 > t1) {
      return miss;
    }

    // Sphere-trace in metres along the segment: t += distance / length. A hit
    // the clips remove isn't there: the march steps past it and goes on, by
    // |distance| from then on (inside the field the distance is negative, and
    // the next surface is where it comes back to zero).
    const point = new Float64Array(3);
    const kept = (at: number): boolean => {
      if (!o.clips) {
        return true;
      }
      point[0] = from[0]! + at * dx;
      point[1] = from[1]! + at * dy;
      point[2] = from[2]! + at * dz;
      return o.clips.keeps(point);
    };
    let passed = false;
    let t = t0;
    for (let step = 0; step < maxSteps; step++) {
      const dist = f(from[0]! + t * dx, from[1]! + t * dy, from[2]! + t * dz);
      if (passed ? Math.abs(dist) < epsilon : dist < epsilon) {
        if (kept(t)) {
          return hitAt(t, t === t0 ? dist : 0);
        }
        passed = true;
        t += (2 * epsilon) / length;
        if (t > t1) {
          return miss;
        }
        continue;
      }
      t += (passed ? Math.abs(dist) : dist) / length;
      if (t > t1) {
        return miss;
      }
    }
    return {
      verdict: "unknown",
      reason: "notConverged",
      accuracy: hitAccuracy,
    };
  };

  const closestPoint = (
    point: ArrayLike<number>,
    o: ClosestPointOptions = {},
  ): ClosestPoint | undefined => {
    if (o.kinds && !o.kinds.includes("face")) {
      return undefined;
    }
    let x = point[0]!;
    let y = point[1]!;
    let z = point[2]!;
    let d = f(x, y, z);
    if (!Number.isFinite(d)) {
      return undefined;
    }
    for (let i = 0; i < PROJECTIONS && Math.abs(d) >= epsilon; i++) {
      const n = gradient(x, y, z);
      if (!n) {
        return undefined;
      }
      x -= d * n[0];
      y -= d * n[1];
      z -= d * n[2];
      d = f(x, y, z);
    }
    if (!Number.isFinite(d)) {
      return undefined;
    }
    const converged = Math.abs(d) < epsilon;
    const distance = Math.hypot(x - point[0]!, y - point[1]!, z - point[2]!);
    if (o.maxDistance !== undefined && distance > o.maxDistance) {
      return undefined;
    }
    const n = gradient(x, y, z);
    const accuracy: GeometryAccuracy = converged
      ? {
          ...hitAccuracy,
          note: "on the surface to the field's epsilon; the nearest point only if the field is a true distance",
        }
      : {
          meters: Math.abs(d) + error,
          exact: false,
          note: `not converged after ${PROJECTIONS} projections: the point is within |distance| of the surface`,
        };
    return {
      position: Float64Array.of(x, y, z),
      distance,
      entity: FACE,
      ...(n ? { normal: Float64Array.from(n) } : {}),
      accuracy,
    };
  };

  const segmentDistance = (
    from: ArrayLike<number>,
    to: ArrayLike<number>,
  ): SegmentDistance => {
    const dx = to[0]! - from[0]!;
    const dy = to[1]! - from[1]!;
    const dz = to[2]! - from[2]!;
    const length = Math.hypot(dx, dy, dz);
    const at = (s: number): number => {
      const u = length > 0 ? s / length : 0;
      return Math.abs(
        f(from[0]! + u * dx, from[1]! + u * dy, from[2]! + u * dz),
      );
    };
    // March by the distance seen (at least epsilon), keeping the smallest.
    let best = Infinity;
    let bestAt = 0;
    let bestStep = epsilon;
    let s = 0;
    let reached = false;
    for (let i = 0; i < maxSteps; i++) {
      const d = at(s);
      if (!Number.isFinite(d)) {
        break;
      }
      const step = Math.max(d, epsilon);
      if (d < best) {
        best = d;
        bestAt = s;
        bestStep = step;
      }
      if (best < epsilon || s >= length) {
        reached = true;
        break;
      }
      s = Math.min(s + step, length);
    }
    if (best === Infinity) {
      return {
        distance: NaN,
        accuracy: {
          meters: Infinity,
          exact: false,
          note: "the field gave no finite distance along the segment",
        },
      };
    }
    // Refine within one step on either side of the smallest.
    let a = Math.max(0, bestAt - bestStep);
    let b = Math.min(length, bestAt + bestStep);
    let c = b - (b - a) * INV_PHI;
    let e = a + (b - a) * INV_PHI;
    let fc = at(c);
    let fe = at(e);
    for (let i = 0; i < REFINE_STEPS; i++) {
      if (fc < fe) {
        b = e;
        e = c;
        fe = fc;
        c = b - (b - a) * INV_PHI;
        fc = at(c);
      } else {
        a = c;
        c = e;
        fc = fe;
        e = a + (b - a) * INV_PHI;
        fe = at(e);
      }
    }
    const distance = Math.min(best, fc, fe);
    return {
      distance,
      accuracy: reached
        ? {
            meters: epsilon + error,
            exact: false,
            note: "sampled along the segment and refined: an upper bound on the least distance",
          }
        : {
            // The unsampled rest may come anywhere from 0 to the best seen.
            meters: distance + error,
            exact: false,
            note: "the march ran out of steps before the end of the segment: an upper bound on the least distance, which may be anywhere from 0 to it",
          },
    };
  };

  const entity = (ref: EntityRef): EntityInfo | undefined =>
    ref.kind === "face" && ref.index === 0
      ? { ref: FACE, points: [], faces: [FACE] }
      : undefined;

  // F-reps draw by ray marching on the GPU, later: no triangles.
  const display = (_tolerance: number): DisplayMesh | undefined => undefined;

  return {
    kind: "frep",
    version: options.version ?? 0,
    bounds,
    rayHit,
    closestPoint,
    segmentDistance,
    entity,
    display,
  };
}
