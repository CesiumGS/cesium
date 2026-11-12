// Picks and measurements in any node of a transform graph (plan 2026-11-12,
// task 5). A point of the content sits at a node; `pointIn` carries it to
// another node through the route between them, in float64, from the point
// itself (a pick's domain point), never from where it was drawn. True and
// drawn are just two named nodes: the content's own, and the camera's. The
// frames side (`frames/pickIn.ts`) bridges today's picks to these.
import {
  accuracyAlong,
  type AccuracyOptions,
  type RouteAccuracy,
  type SigmaIn,
} from "./accuracy.ts";
import type { TransformNode, ViewId } from "./graph.ts";
import { routeBetween, type Route } from "./route.ts";

/** A point of a node's own coordinates (metres), with its own 1σ when known. */
export interface NodePoint {
  readonly node: TransformNode;
  readonly position: ArrayLike<number>;
  /** A magnitude in metres, a σ per axis, or a covariance: `accuracyAlong`'s `sigmaIn`. */
  readonly sigma?: SigmaIn;
}

export interface PointInOptions {
  /** The view whose switch choices and parameter values the route follows. */
  readonly view?: ViewId;
  /** The instant a time-varying edge is evaluated at (default 0). */
  readonly seconds?: number;
  /** What affine edges add to the accuracy (`FrameGraph.accuracy`). */
  readonly accuracy?: AccuracyOptions;
}

export interface PointIn {
  /** The point in `node`'s coordinates, m, float64. */
  readonly position: Float64Array;
  readonly node: TransformNode;
  /** The route it was carried by. */
  readonly route: Route;
  /** The route's Jacobian at the point, column-major. */
  readonly jacobian: Float64Array;
  /** [σ_min, σ_max] of that Jacobian: lengths in `node` over lengths at the point's own node, at least and at most. */
  readonly stretch: readonly [number, number];
  /** What the position can claim: the point's σ carried, plus each edge's own. */
  readonly accuracy: RouteAccuracy;
}

/** The smallest and largest singular values of a column-major 3×3. */
export function singularRange(j: ArrayLike<number>): [number, number] {
  const s = new Float64Array(9);
  for (let a = 0; a < 3; a++) {
    for (let b = 0; b < 3; b++) {
      s[a * 3 + b] =
        j[a * 3]! * j[b * 3]! +
        j[a * 3 + 1]! * j[b * 3 + 1]! +
        j[a * 3 + 2]! * j[b * 3 + 2]!;
    }
  }
  const q = (s[0]! + s[4]! + s[8]!) / 3;
  const off = s[1]! ** 2 + s[2]! ** 2 + s[5]! ** 2;
  let high: number;
  let low: number;
  if (off === 0) {
    high = Math.max(s[0]!, s[4]!, s[8]!);
    low = Math.min(s[0]!, s[4]!, s[8]!);
  } else {
    const p2 = (s[0]! - q) ** 2 + (s[4]! - q) ** 2 + (s[8]! - q) ** 2 + 2 * off;
    const p = Math.sqrt(p2 / 6);
    const b00 = (s[0]! - q) / p;
    const b11 = (s[4]! - q) / p;
    const b22 = (s[8]! - q) / p;
    const b01 = s[1]! / p;
    const b02 = s[2]! / p;
    const b12 = s[5]! / p;
    const det =
      b00 * (b11 * b22 - b12 * b12) -
      b01 * (b01 * b22 - b12 * b02) +
      b02 * (b01 * b12 - b11 * b02);
    const phi = Math.acos(Math.min(1, Math.max(-1, det / 2))) / 3;
    high = q + 2 * p * Math.cos(phi);
    low = q + 2 * p * Math.cos(phi + (2 * Math.PI) / 3);
  }
  return [Math.sqrt(Math.max(low, 0)), Math.sqrt(Math.max(high, 0))];
}

/**
 * `point` in `node`: the route from the point's node, evaluated in float64
 * (a smooth edge by its function, an undone one by its inverse), with its
 * Jacobian's stretch and the accuracy carried along it.
 */
export function pointIn(
  point: NodePoint,
  node: TransformNode,
  options: PointInOptions = {},
): PointIn {
  const route = routeBetween(point.node, node, {
    ...(options.view !== undefined && { view: options.view }),
    ...(options.seconds !== undefined && { seconds: options.seconds }),
  });
  const accuracy = accuracyAlong(
    route,
    point.position,
    point.sigma ?? 0,
    options.accuracy,
  );
  return {
    position: accuracy.position,
    node,
    route,
    jacobian: accuracy.jacobian,
    stretch: singularRange(accuracy.jacobian),
    accuracy,
  };
}

export interface MeasureInOptions extends PointInOptions {
  /**
   * Metres the routed path of a straight segment may stray from the polyline
   * that measures it, in `node`; default 1 mm.
   */
  readonly pathTolerance?: number;
}

/** What a set of points measure in a node. */
export interface MeasureIn {
  readonly node: TransformNode;
  /** Each point in `node`. */
  readonly positions: readonly Float64Array[];
  /** The straight distance between the first and last point, m. */
  readonly distance: number;
  /** 1σ of `distance`, m, when the points' accuracies are all known; the two ends' errors along the line, independent. */
  readonly distanceSigma: number;
  /** The polyline through the points, m. */
  readonly length: number;
  /**
   * The length of the polyline of the images of the straight segments
   * between consecutive points, where both ends are at one node (a straight
   * segment of the content is a curve in `node` when a smooth edge is on the
   * route); the chord where they are not. m.
   */
  readonly pathLength: number;
  /** With three or more points: the area of the polygon through them, closed, as the vector area's magnitude (a planar polygon's area), m². */
  readonly area: number | undefined;
  /** Each point's accuracy in `node`. */
  readonly accuracies: readonly RouteAccuracy[];
}

/**
 * Distances, lengths and areas of `points` in `node`: each point is carried
 * to `node` through its route in float64 and measured there. A measurement
 * in the content's own node is a true one; in the camera's, a drawn one.
 */
export function measureIn(
  points: readonly NodePoint[],
  node: TransformNode,
  options: MeasureInOptions = {},
): MeasureIn {
  if (points.length < 1) {
    throw new RangeError("measureIn: at least one point");
  }
  const carried = points.map((p) => pointIn(p, node, options));
  const positions = carried.map((c) => c.position);
  const chord = (a: ArrayLike<number>, b: ArrayLike<number>) =>
    Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!, b[2]! - a[2]!);
  let length = 0;
  let pathLength = 0;
  for (let i = 1; i < points.length; i++) {
    const segment = chord(positions[i - 1]!, positions[i]!);
    length += segment;
    pathLength +=
      points[i - 1]!.node === points[i]!.node
        ? pathOf(
            routeBetween(points[i]!.node, node, {
              ...(options.view !== undefined && { view: options.view }),
              ...(options.seconds !== undefined && {
                seconds: options.seconds,
              }),
            }),
            points[i - 1]!.position,
            points[i]!.position,
            options.pathTolerance ?? 1e-3,
          )
        : segment;
  }
  const first = positions[0]!;
  const last = positions[positions.length - 1]!;
  const distance = chord(first, last);
  let distanceSigma = 0;
  if (distance > 0) {
    const u = [0, 1, 2].map((a) => (last[a]! - first[a]!) / distance);
    const along = (c: Float64Array): number => {
      let s = 0;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          s += u[i]! * c[i * 3 + j]! * u[j]!;
        }
      }
      return s;
    };
    distanceSigma = Math.sqrt(
      Math.max(
        along(carried[0]!.accuracy.covariance) +
          (points.length > 1
            ? along(carried[carried.length - 1]!.accuracy.covariance)
            : 0),
        0,
      ),
    );
  }
  let area: number | undefined;
  if (positions.length >= 3) {
    let nx = 0;
    let ny = 0;
    let nz = 0;
    for (let i = 0; i < positions.length; i++) {
      const a = positions[i]!;
      const b = positions[(i + 1) % positions.length]!;
      nx += a[1]! * b[2]! - a[2]! * b[1]!;
      ny += a[2]! * b[0]! - a[0]! * b[2]!;
      nz += a[0]! * b[1]! - a[1]! * b[0]!;
    }
    area = 0.5 * Math.hypot(nx, ny, nz);
  }
  return {
    node,
    positions,
    distance,
    distanceSigma,
    length,
    pathLength,
    area,
    accuracies: carried.map((c) => c.accuracy),
  };
}

/** The length of the route's image of the straight segment a→b: refined until three interior points of each piece are within `tolerance` of its chord. */
function pathOf(
  route: Route,
  a: ArrayLike<number>,
  b: ArrayLike<number>,
  tolerance: number,
): number {
  const at = (t: number): Float64Array =>
    route.forward([
      a[0]! + t * (b[0]! - a[0]!),
      a[1]! + t * (b[1]! - a[1]!),
      a[2]! + t * (b[2]! - a[2]!),
    ]);
  const distance = (p: Float64Array, q: Float64Array) =>
    Math.hypot(q[0]! - p[0]!, q[1]! - p[1]!, q[2]! - p[2]!);
  const toSegment = (q: Float64Array, p0: Float64Array, p1: Float64Array) => {
    const e = [p1[0]! - p0[0]!, p1[1]! - p0[1]!, p1[2]! - p0[2]!];
    const l2 = e[0]! ** 2 + e[1]! ** 2 + e[2]! ** 2;
    const f =
      l2 > 0
        ? Math.min(
            1,
            Math.max(
              0,
              ((q[0]! - p0[0]!) * e[0]! +
                (q[1]! - p0[1]!) * e[1]! +
                (q[2]! - p0[2]!) * e[2]!) /
                l2,
            ),
          )
        : 0;
    return Math.hypot(
      q[0]! - p0[0]! - f * e[0]!,
      q[1]! - p0[1]! - f * e[1]!,
      q[2]! - p0[2]! - f * e[2]!,
    );
  };
  const go = (
    t0: number,
    q0: Float64Array,
    t1: number,
    q1: Float64Array,
    depth: number,
  ): number => {
    let worst = 0;
    const mid = [0.25, 0.5, 0.75].map((f) => {
      const q = at(t0 + f * (t1 - t0));
      worst = Math.max(worst, toSegment(q, q0, q1));
      return q;
    });
    if (worst <= tolerance || depth >= 30) {
      let sum = 0;
      let prev = q0;
      for (const q of [...mid, q1]) {
        sum += distance(prev, q);
        prev = q;
      }
      return Math.max(sum, distance(q0, q1));
    }
    const tm = (t0 + t1) / 2;
    return (
      go(t0, q0, tm, mid[1]!, depth + 1) + go(tm, mid[1]!, t1, q1, depth + 1)
    );
  };
  return go(0, at(0), 1, at(1), 0);
}
