// Measurement graphics drawn through the route (CESIUM2_WEBGPU_PLAN.md
// §13.26, placement increment 6): a measurement's lines, polylines, area
// outlines and labels are content in true coordinates, drawn through the same
// route as everything else. A straight true segment draws as a curve under a
// warp, so each is sampled adaptively until the drawn polyline is within a
// fraction of a pixel of the routed curve, and sampled again when the route,
// a warp's scale or the camera's pixel size changes. Labels anchor at routed
// points, never at a point carried by the route's affine part.
import {
  routeForward,
  routeIsRigid,
  warpScaleOf,
  type Route,
} from "../camera/route.ts";
import { distanceToSegment } from "./drawn.ts";

/**
 * What a pixel measures where the graphics are drawn: the render-space
 * camera (the route's base) and the view's height in CSS pixels.
 */
export interface ScreenScale {
  readonly position: ArrayLike<number>;
  readonly direction: ArrayLike<number>;
  /** The vertical field of view, rad. */
  readonly fovy: number;
  /** The view's height in CSS pixels. */
  readonly height: number;
  /** Metres: nothing nearer is drawn (default 0.1). */
  readonly near?: number;
}

/** What `sampleSegment` and `DrawnCurve` take. */
export interface CurveOptions {
  /** CSS pixels the drawn polyline may stray from the routed curve; default 0.5. */
  readonly tolerancePx?: number;
  /** Where pixels are measured. Without it, `toleranceMeters` is the tolerance. */
  readonly screen?: ScreenScale;
  /** Metres, used without `screen`; default 1 mm. */
  readonly toleranceMeters?: number;
  /** The deepest a segment is halved; default 24. */
  readonly maxDepth?: number;
  /** The most samples one segment may take, a bound on a pathological route; default 65,536. */
  readonly maxSamples?: number;
}

const DEFAULTS = {
  tolerancePx: 0.5,
  toleranceMeters: 1e-3,
  maxDepth: 24,
  maxSamples: 65_536,
} as const;

/** Interior points tested per piece. Three catch an S-curve whose midpoint sits on its chord. */
const TESTS = [0.25, 0.5, 0.75] as const;
/** A piece is halved at least this many times when the route bends (a warp's curve may leave its chord at its middle only). */
const MIN_DEPTH = 2;

/** Metres one pixel measures at `q` for `screen`. */
function pixelSize(screen: ScreenScale, q: ArrayLike<number>): number {
  const e = screen.position;
  const d = screen.direction;
  const z =
    (q[0]! - e[0]!) * d[0]! + (q[1]! - e[1]!) * d[1]! + (q[2]! - e[2]!) * d[2]!;
  const depth = Math.max(z, screen.near ?? 0.1);
  return (2 * depth * Math.tan(screen.fovy / 2)) / screen.height;
}

/**
 * The route's image of the true segment `a` → `b` as a polyline: render-space
 * points (flat, float64) from the image of `a` to the image of `b`, refined
 * until the drawn pieces are within the tolerance of the curve. For each
 * piece the images of three interior points are tested against its chord
 * (the distance to the chord, which parametrization doesn't enter), at the
 * pixel size where each is. A rigid route is its two ends.
 *
 * What is guaranteed: the sampled points are on the routed curve exactly,
 * and the tested interior points are within the tolerance of their chords.
 * Between tested points a curve with a bend finer than a quarter of a piece
 * could leave a chord by more; the second derivative of a route over a
 * piece is smooth for the warps the engine fits (`secondDerivativeBound`).
 */
export function sampleSegment(
  route: Route,
  a: ArrayLike<number>,
  b: ArrayLike<number>,
  options: CurveOptions = {},
): Float64Array {
  const first = routeForward(route, a);
  const last = routeForward(route, b);
  if (routeIsRigid(route)) {
    return Float64Array.of(...first, ...last);
  }
  const tolerance = (q: ArrayLike<number>): number =>
    options.screen
      ? (options.tolerancePx ?? DEFAULTS.tolerancePx) *
        pixelSize(options.screen, q)
      : (options.toleranceMeters ?? DEFAULTS.toleranceMeters);
  const maxDepth = options.maxDepth ?? DEFAULTS.maxDepth;
  const maxSamples = options.maxSamples ?? DEFAULTS.maxSamples;
  const out: number[] = [first[0]!, first[1]!, first[2]!];
  const p = new Float64Array(3);
  const at = (t: number): Float64Array => {
    p[0] = a[0]! + t * (b[0]! - a[0]!);
    p[1] = a[1]! + t * (b[1]! - a[1]!);
    p[2] = a[2]! + t * (b[2]! - a[2]!);
    return routeForward(route, p);
  };
  const go = (
    t0: number,
    q0: Float64Array,
    t1: number,
    q1: Float64Array,
    depth: number,
  ): void => {
    let split = depth < MIN_DEPTH;
    const interior: Float64Array[] = [];
    if (depth < maxDepth && out.length / 3 < maxSamples) {
      for (const f of TESTS) {
        const q = at(t0 + f * (t1 - t0));
        interior.push(q);
        if (distanceToSegment(q, q0, q1) > tolerance(q)) {
          split = true;
        }
      }
    } else {
      split = false;
    }
    if (!split) {
      out.push(q1[0]!, q1[1]!, q1[2]!);
      return;
    }
    const tm = (t0 + t1) / 2;
    const qm = interior[1] ?? at(tm);
    go(t0, q0, tm, qm, depth + 1);
    go(tm, qm, t1, q1, depth + 1);
  };
  go(0, first, 1, last, 0);
  return Float64Array.from(out);
}

/** A point of a curve: where it is drawn, and which way. */
export interface DrawnAnchor {
  /** The true point on the polyline, in the route's frame. */
  readonly truePosition: Float64Array;
  /** Where it is drawn (the route's base, float64, m): the route's image of `truePosition`, not an affine carry of it. */
  readonly position: Float64Array;
  /** The drawn curve's unit tangent there, toward the polyline's end (zero where it has no direction). */
  readonly tangent: Float64Array;
}

/** A curve's samples for one route and camera. */
export interface DrawnSamples {
  /** Render-space points, flat (x, y, z), float64: a closed curve repeats its first point at the end. */
  readonly positions: Float64Array;
  /** The first index (a point's number, not a float's) of each true vertex in `positions`. */
  readonly vertices: readonly number[];
  /** Metres: the drawn polyline's length. */
  readonly length: number;
  /** The route's revision they were made for. */
  readonly revision: number;
  /** The number of times the polyline has been sampled: it moves only when something it depends on does. */
  readonly generation: number;
}

/** What a sample depends on: the route's revision, each warp's scale, its rigid steps, and the camera's pixel size. */
function keyOf(route: Route, screen: ScreenScale | undefined): number[] {
  const key: number[] = [route.revision, route.steps.length];
  for (const step of route.steps) {
    if (step.kind === "rigid") {
      key.push(...step.matrix);
    } else {
      key.push(
        step.inverse ? -1 : 1,
        step.warp.revision,
        warpScaleOf(step.warp),
      );
    }
  }
  if (screen) {
    key.push(
      ...Array.from(screen.position),
      ...Array.from(screen.direction),
      screen.fovy,
      screen.height,
      screen.near ?? 0.1,
    );
  }
  return key;
}

const sameKey = (a: number[], b: number[]): boolean =>
  a.length === b.length && a.every((x, i) => Object.is(x, b[i]));

/**
 * A measurement's line, polyline or area outline, in true coordinates, drawn
 * through a route: `samples(route, screen)` gives the drawn polyline,
 * re-sampled only when the route's revision, a warp's scale (a slider writes
 * one float and changes no revision), a rigid step or the camera's pixel
 * size changes. Re-sampling is cheap: each segment takes tens of routed
 * points. A closed curve (an area's outline) draws its closing segment too.
 */
export class DrawnCurve {
  #key: number[] | undefined;
  #samples: DrawnSamples | undefined;
  #generation = 0;
  #points: Float64Array;

  constructor(
    /** The curve's true vertices (flat x, y, z) in the route's frame. */
    points: ArrayLike<number>,
    readonly closed = false,
    private readonly options: Omit<CurveOptions, "screen"> = {},
  ) {
    if (points.length % 3 !== 0 || points.length < 6) {
      throw new RangeError(
        "DrawnCurve: needs at least two vertices, as flat x, y, z",
      );
    }
    this.#points = Float64Array.from(points);
  }

  /** The true vertices, flat. */
  get points(): Float64Array {
    return this.#points;
  }

  /** Replaces the true vertices (an edited measurement). */
  setPoints(points: ArrayLike<number>): void {
    if (points.length % 3 !== 0 || points.length < 6) {
      throw new RangeError(
        "DrawnCurve: needs at least two vertices, as flat x, y, z",
      );
    }
    this.#points = Float64Array.from(points);
    this.#key = undefined;
  }

  /**
   * The polyline through `route`, drawn with `screen`'s pixels (metres
   * without it). The same object while nothing it depends on changed.
   */
  samples(route: Route, screen?: ScreenScale): DrawnSamples {
    const key = keyOf(route, screen);
    if (this.#samples && this.#key && sameKey(this.#key, key)) {
      return this.#samples;
    }
    const pts = this.#points;
    const n = pts.length / 3;
    const segments = this.closed ? n : n - 1;
    const out: number[] = [];
    const vertices: number[] = [];
    let length = 0;
    for (let s = 0; s < segments; s++) {
      const a = pts.subarray(3 * s, 3 * s + 3);
      const b =
        this.closed && s === n - 1
          ? pts.subarray(0, 3)
          : pts.subarray(3 * (s + 1), 3 * (s + 1) + 3);
      const piece = sampleSegment(route, a, b, {
        ...this.options,
        ...(screen && { screen }),
      });
      // A segment starts where the last ended: its first point is not repeated.
      vertices.push(out.length / 3);
      for (let i = s === 0 ? 0 : 3; i < piece.length; i += 3) {
        out.push(piece[i]!, piece[i + 1]!, piece[i + 2]!);
      }
      for (let i = 3; i < piece.length; i += 3) {
        length += Math.hypot(
          piece[i]! - piece[i - 3]!,
          piece[i + 1]! - piece[i - 2]!,
          piece[i + 2]! - piece[i - 1]!,
        );
      }
    }
    if (!this.closed) {
      vertices.push(out.length / 3 - 1);
    }
    this.#key = key;
    this.#samples = {
      positions: Float64Array.from(out),
      vertices,
      length,
      revision: route.revision,
      generation: ++this.#generation,
    };
    return this.#samples;
  }

  /**
   * The point `fraction` (0..1) of the way along the curve's true length,
   * with where `route` draws it: where a label belongs (a segment's middle
   * is 0.5). The position is the route's image of the true point, exact; the
   * tangent is a central difference of it.
   */
  anchorAt(route: Route, fraction = 0.5): DrawnAnchor {
    return anchorAlong(route, this.#points, fraction, this.closed);
  }
}

/** `fraction` of the way along a polyline's true length, drawn through `route`. */
export function anchorAlong(
  route: Route,
  points: ArrayLike<number>,
  fraction = 0.5,
  closed = false,
): DrawnAnchor {
  const n = Math.floor(points.length / 3);
  const lengths: number[] = [];
  let total = 0;
  const count = closed ? n : n - 1;
  for (let s = 0; s < count; s++) {
    const i = 3 * s;
    const j = 3 * ((s + 1) % n);
    const l = Math.hypot(
      points[j]! - points[i]!,
      points[j + 1]! - points[i + 1]!,
      points[j + 2]! - points[i + 2]!,
    );
    lengths.push(l);
    total += l;
  }
  const target = Math.min(1, Math.max(0, fraction)) * total;
  let s = 0;
  let before = 0;
  while (s < count - 1 && before + lengths[s]! < target) {
    before += lengths[s]!;
    s++;
  }
  const f = lengths[s]! > 0 ? Math.min(1, (target - before) / lengths[s]!) : 0;
  const i = 3 * s;
  const j = 3 * ((s + 1) % n);
  const at = (t: number) =>
    Float64Array.of(
      points[i]! + t * (points[j]! - points[i]!),
      points[i + 1]! + t * (points[j + 1]! - points[i + 1]!),
      points[i + 2]! + t * (points[j + 2]! - points[i + 2]!),
    );
  const truePosition = at(f);
  const position = routeForward(route, truePosition);
  // Along the segment: a step of a fraction of a millimetre in each direction,
  // clamped to the segment, so the tangent is the route's derivative there.
  const h = lengths[s]! > 0 ? Math.min(0.5, 1e-3 / lengths[s]!) : 0;
  const lo = routeForward(route, at(Math.max(0, f - h)));
  const hi = routeForward(route, at(Math.min(1, f + h)));
  const tangent = Float64Array.of(
    hi[0]! - lo[0]!,
    hi[1]! - lo[1]!,
    hi[2]! - lo[2]!,
  );
  const length = Math.hypot(tangent[0]!, tangent[1]!, tangent[2]!);
  if (length > 0) {
    tangent[0] = tangent[0]! / length;
    tangent[1] = tangent[1]! / length;
    tangent[2] = tangent[2]! / length;
  }
  return { truePosition, position, tangent };
}
