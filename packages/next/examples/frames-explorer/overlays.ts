// Overlay geometry for the frames explorer (R3): pure builders that return
// line-list geometry in the engine's Earth-fixed meters, and a thin adapter
// that draws it.
//
// Every builder returns a `Geometry`: `positions` (float64, three numbers per
// vertex) and `colors` (RGBA bytes, sRGB, four per vertex), vertices in pairs,
// one pair per line segment. The PROJ-dependent builders (`designGrid`,
// `trueNorthLines`, `rigidVsExact`, `distortion`, `trajectoryPath`) run in a
// Web Worker (R13): they touch no DOM and no GPU, take plain data or objects
// the worker builds itself (an `EngineeringFrame` from a `CrsRef`), and return
// typed arrays whose buffers can be transferred.
//
// `World` is imported as a type only, so a worker that loads this module never
// loads the renderer.
import {
  RigidPlacement,
  type EngineeringFrame,
} from "../../src/engineering/EngineeringFrame.ts";
import { gridFactors } from "../../src/engineering/factors.ts";
import { frameTransform, type Frame } from "../../src/frames/Frame.ts";
import type { Frames } from "../../src/frames/frames.ts";
import { rotationPart } from "../../src/frames/matrix.ts";
import type { Ellipsoid } from "../../src/math/ellipsoid.ts";
import type { MeshData } from "../../src/scene/meshes.ts";
import type { DrawHandle, MeshHandle, World } from "../../src/scene/World.ts";
import { Instant } from "../../src/time/Instant.ts";
import type { Trajectory } from "../../src/trajectory/Trajectory.ts";

/** Straight sRGB bytes: red, green, blue, alpha. */
export type Rgba = readonly [number, number, number, number];

/** Line-list geometry: vertices in pairs, Earth-fixed meters, transferable. */
export interface Geometry {
  /** x, y, z per vertex, meters. */
  positions: Float64Array;
  /** R, G, B, A bytes per vertex (sRGB). */
  colors: Uint8Array;
}

/** A design extent: the lower and upper (E, N) corners, in design units. */
export interface Extent {
  min: [number, number];
  max: [number, number];
}

/** What the design-space builders read of an `EngineeringFrame`. */
export interface DesignFrameLike {
  readonly body: { readonly ellipsoid: Ellipsoid };
  toGeodetic(design: ArrayLike<number>): {
    longitude: number;
    latitude: number;
    height: number;
  };
  toBodyFixed(design: ArrayLike<number>, out?: Float64Array): Float64Array;
}

/** The axes' colors: x red, y green, z blue (R16). */
export const AXIS_COLORS: readonly Rgba[] = [
  [255, 64, 64, 255],
  [64, 220, 64, 255],
  [64, 128, 255, 255],
];

/** Round-trip marker colors: within 0.1 x tolerance, within tolerance, beyond. */
export const MARKER_COLORS = {
  green: [46, 204, 113, 255],
  amber: [255, 176, 32, 255],
  red: [235, 64, 52, 255],
} as const satisfies Record<string, Rgba>;

const GRID_COLOR: Rgba = [255, 196, 64, 255];
const TRUE_NORTH_COLOR: Rgba = [64, 200, 255, 255];
const EXACT_COLOR: Rgba = [64, 220, 120, 255];
const RIGID_COLOR: Rgba = [255, 90, 90, 255];
const TRAJECTORY_COLOR: Rgba = [200, 140, 255, 255];
const TISSOT_COLOR: Rgba = [255, 120, 200, 255];

/** Combined-factor contours the page draws, in parts per million. */
export const DEFAULT_CONTOURS_PPM: readonly number[] = [
  -400, -100, -50, -10, 10, 50, 100, 400,
];

/** Growing line-list geometry. */
class Lines {
  readonly points: number[] = [];
  readonly colors: number[] = [];

  segment(a: ArrayLike<number>, b: ArrayLike<number>, color: Rgba): void {
    this.points.push(a[0]!, a[1]!, a[2]!, b[0]!, b[1]!, b[2]!);
    this.colors.push(...color, ...color);
  }

  geometry(): Geometry {
    return {
      positions: Float64Array.from(this.points),
      colors: Uint8Array.from(this.colors),
    };
  }
}

function positive(name: string, value: number): void {
  if (!(Number.isFinite(value) && value > 0)) {
    throw new RangeError(
      `${name} must be a positive number of design units, got ${value}`,
    );
  }
}

/** min, min + step, ... up to max (to a rounding of 1e-9 steps). */
function gridValues(min: number, max: number, step: number): number[] {
  const count = Math.floor((max - min) / step + 1e-9);
  return Array.from({ length: count + 1 }, (_, i) => min + i * step);
}

/** How many `segment`-sized pieces cover `length` (at least one). */
const pieces = (length: number, segment: number): number =>
  Math.max(1, Math.ceil(length / segment - 1e-9));

/**
 * Three segments from the frame's origin along its x (red), y (green) and z
 * (blue) axes, as ITRF coordinates at `instant`. The axes are the columns of
 * the rotation part of `frameTransform(frame, itrf)`: the directions' own
 * sense, not the transposed matrix (Review Focus 3).
 *
 * `biasExaggeration` (EME2000 only, display only, R4) turns the frame's
 * rotation against EARTH_ICRF, the 23 mas frame bias, by that many times its
 * angle about its own axis: 1 is the true frame.
 */
export function triad(
  frames: Pick<Frames, "itrf" | "earthIcrf" | "eme2000">,
  frame: Frame,
  instant: Instant,
  length: number,
  options: { biasExaggeration?: number } = {},
): Geometry {
  const m = frameTransform(frame, frames.itrf, instant);
  let R = rotationPart(m);
  const k = options.biasExaggeration;
  if (k !== undefined && frame === frames.eme2000) {
    if (!(Number.isFinite(k) && k >= 0)) {
      throw new RangeError(
        `triad: biasExaggeration must be a finite factor of 0 or more, got ${k}`,
      );
    }
    // R = P Q with Q the bias (EME2000 to EARTH_ICRF) and P the rest of the
    // way to ITRF; the exaggerated frame is P Q_k.
    const Q = rotationPart(frameTransform(frame, frames.earthIcrf, instant));
    const P = rotationPart(
      frameTransform(frames.earthIcrf, frames.itrf, instant),
    );
    R = multiply3(P, exaggerate(Q, k));
  }
  const out = new Lines();
  const origin = [m[12]!, m[13]!, m[14]!];
  for (let axis = 0; axis < 3; axis++) {
    out.segment(
      origin,
      [
        origin[0]! + length * R[axis]!,
        origin[1]! + length * R[3 + axis]!,
        origin[2]! + length * R[6 + axis]!,
      ],
      AXIS_COLORS[axis]!,
    );
  }
  return out.geometry();
}

/** The row-major product A B. */
function multiply3(A: ArrayLike<number>, B: ArrayLike<number>): Float64Array {
  const out = new Float64Array(9);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      out[3 * r + c] =
        A[3 * r]! * B[c]! +
        A[3 * r + 1]! * B[3 + c]! +
        A[3 * r + 2]! * B[6 + c]!;
    }
  }
  return out;
}

/** The rotation `Q` (row-major) turned by `factor` times its angle, about its own axis. */
function exaggerate(Q: ArrayLike<number>, factor: number): Float64Array {
  const vx = Q[7]! - Q[5]!;
  const vy = Q[2]! - Q[6]!;
  const vz = Q[3]! - Q[1]!;
  const sin = Math.hypot(vx, vy, vz) / 2;
  if (sin === 0) {
    return Float64Array.from(Q as ArrayLike<number>);
  }
  const angle = Math.atan2(sin, (Q[0]! + Q[4]! + Q[8]! - 1) / 2);
  const a = [vx / (2 * sin), vy / (2 * sin), vz / (2 * sin)];
  const phi = angle * factor;
  const c = Math.cos(phi);
  const s = Math.sin(phi);
  const t = 1 - c;
  // Rodrigues: c I + s [a]x + t a aT.
  return Float64Array.from([
    c + t * a[0]! * a[0]!,
    t * a[0]! * a[1]! - s * a[2]!,
    t * a[0]! * a[2]! + s * a[1]!,
    t * a[1]! * a[0]! + s * a[2]!,
    c + t * a[1]! * a[1]!,
    t * a[1]! * a[2]! - s * a[0]!,
    t * a[2]! * a[0]! - s * a[1]!,
    t * a[2]! * a[1]! + s * a[0]!,
    c + t * a[2]! * a[2]!,
  ]);
}

/**
 * Lines of constant design E and N across `extent`, every `step` design units,
 * each sampled every `segment` units (rounded up to cover the line, ending
 * exactly on the extent) and mapped by `toBodyFixed` at height 0.
 *
 * Order: the E lines first (ascending E), each as segment pairs along
 * ascending N, then the N lines (ascending N) along ascending E. A line with
 * no length is not drawn. With `skipEvery` (an integer k ≥ 2), every k-th
 * line counted from the extent's corner (the 0th, kth, ...) is left out: the
 * minor lines of a grid whose major lines are drawn apart.
 */
export function designGrid(
  frame: DesignFrameLike,
  extent: Extent,
  step: number,
  segment: number,
  options: { skipEvery?: number } = {},
): Geometry {
  positive("designGrid: step", step);
  positive("designGrid: segment", segment);
  const skip = options.skipEvery;
  if (skip !== undefined && !(Number.isInteger(skip) && skip >= 2)) {
    throw new RangeError(
      `designGrid: skipEvery must be an integer of at least 2, got ${skip}`,
    );
  }
  const kept = (_: number, i: number) => skip === undefined || i % skip !== 0;
  const out = new Lines();
  const { min, max } = extent;
  const along = (
    fixed: (t: number) => [number, number],
    from: number,
    to: number,
  ) => {
    if (!(to > from)) {
      return;
    }
    const n = pieces(to - from, segment);
    let previous = frame.toBodyFixed([...fixed(from), 0]);
    for (let s = 1; s <= n; s++) {
      const here = frame.toBodyFixed([
        ...fixed(from + ((to - from) * s) / n),
        0,
      ]);
      out.segment(previous, here, GRID_COLOR);
      previous = here;
    }
  };
  for (const e of gridValues(min[0], max[0], step).filter(kept)) {
    along((n) => [e, n], min[1], max[1]);
  }
  for (const n of gridValues(min[1], max[1], step).filter(kept)) {
    along((e) => [e, n], min[0], max[0]);
  }
  return out.geometry();
}

/**
 * The meridians through the extent, as true north: for each grid E, a line of
 * constant geodetic longitude from the latitude of (E, min N) to that of
 * (E, max N), at height 0 on the body's ellipsoid and sampled like the grid's
 * N lines. Against the grid's own lines it shows the convergence.
 * `exaggeration` (display only, ruling F32) leans each line from the grid's
 * line through the same E by that many times its true offset: 1, the
 * default, is the true line.
 */
export function trueNorthLines(
  frame: DesignFrameLike,
  extent: Extent,
  step: number,
  segment: number,
  options: { exaggeration?: number } = {},
): Geometry {
  positive("trueNorthLines: step", step);
  positive("trueNorthLines: segment", segment);
  const k = options.exaggeration ?? 1;
  if (!(Number.isFinite(k) && k > 0)) {
    throw new RangeError(
      `trueNorthLines: exaggeration must be a positive factor, got ${k}`,
    );
  }
  const out = new Lines();
  const { min, max } = extent;
  if (!(max[1] > min[1])) {
    return out.geometry();
  }
  const n = pieces(max[1] - min[1], segment);
  const ellipsoid = frame.body.ellipsoid;
  for (const e of gridValues(min[0], max[0], step)) {
    const south = frame.toGeodetic([e, min[1], 0]);
    const north = frame.toGeodetic([e, max[1], 0]);
    let previous: Float64Array | undefined;
    for (let s = 0; s <= n; s++) {
      const here = ellipsoid.cartographicToCartesian(
        {
          longitude: south.longitude,
          latitude:
            south.latitude + ((north.latitude - south.latitude) * s) / n,
          height: 0,
        },
        new Float64Array(3),
      );
      if (k !== 1) {
        // Display only (ruling F32): the line's lean away from grid north,
        // `k` times: the grid line's point at the same fraction, plus k
        // times the true-north line's offset from it.
        const grid = frame.toBodyFixed([
          e,
          min[1] + ((max[1] - min[1]) * s) / n,
          0,
        ]);
        for (let c = 0; c < 3; c++) {
          here[c] = grid[c]! + k * (here[c]! - grid[c]!);
        }
      }
      if (previous) {
        out.segment(previous, here, TRUE_NORTH_COLOR);
      }
      previous = here;
    }
  }
  return out.geometry();
}

/**
 * The separation, meters, of rigid placement from the exact placement at a
 * design point: the one definition the explorer uses, in `rigidVsExact` and in
 * the stress catalog's rigid placement budget (ruling F1).
 */
export function rigidSeparation(
  rigid: { toBodyFixed(design: ArrayLike<number>): ArrayLike<number> },
  frame: { toBodyFixed(design: ArrayLike<number>): ArrayLike<number> },
  design: ArrayLike<number>,
): number {
  const a = rigid.toBodyFixed(design);
  const b = frame.toBodyFixed(design);
  return Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);
}

/**
 * The design line from `from` to `to` (E, N, height 0), `samples` segments
 * long, through the frame's exact `toBodyFixed` and through the rigid
 * placement anchored at `from` (`RigidPlacement.at`), as polylines of
 * `samples + 1` points (x, y, z each, meters), and the distance between them at
 * `to`, `sagAtEnd` (meters). They coincide at `from` by construction.
 */
export function rigidVsExact(
  frame: EngineeringFrame,
  from: readonly [number, number],
  to: readonly [number, number],
  samples: number,
): { exact: Float64Array; rigid: Float64Array; sagAtEnd: number } {
  if (!(Number.isInteger(samples) && samples >= 1)) {
    throw new RangeError(
      `rigidVsExact: samples must be a whole number of segments, 1 or more, got ${samples}`,
    );
  }
  const placement = RigidPlacement.at(frame, [from[0], from[1], 0]);
  const exact = new Float64Array(3 * (samples + 1));
  const rigid = new Float64Array(3 * (samples + 1));
  for (let i = 0; i <= samples; i++) {
    const design = [
      from[0] + ((to[0] - from[0]) * i) / samples,
      from[1] + ((to[1] - from[1]) * i) / samples,
      0,
    ];
    exact.set(frame.toBodyFixed(design), 3 * i);
    rigid.set(placement.toBodyFixed(design), 3 * i);
  }
  return {
    exact,
    rigid,
    sagAtEnd: rigidSeparation(placement, frame, [to[0], to[1], 0]),
  };
}

/** A polyline of points (x, y, z each) as segment pairs in one color. */
export function polyline(points: Float64Array, color: Rgba): Geometry {
  const out = new Lines();
  for (let i = 1; i < points.length / 3; i++) {
    out.segment(
      points.subarray(3 * (i - 1), 3 * i),
      points.subarray(3 * i, 3 * i + 3),
      color,
    );
  }
  return out.geometry();
}

/** The colors the page draws `rigidVsExact`'s two polylines in. */
export const RIGID_VS_EXACT_COLORS = { exact: EXACT_COLOR, rigid: RIGID_COLOR };

/**
 * Small three-axis crosses of side `size` (meters) at each result's position:
 * green when its round-trip error is at most a tenth of its tolerance, amber
 * when at most the tolerance, red otherwise (an error that is not a number is
 * red).
 */
export function roundTripMarkers(
  results: readonly {
    position: ArrayLike<number>;
    error: number;
    tolerance: number;
  }[],
  size: number,
): Geometry {
  const out = new Lines();
  const h = size / 2;
  for (const { position: p, error, tolerance } of results) {
    const color =
      error <= 0.1 * tolerance
        ? MARKER_COLORS.green
        : error <= tolerance
          ? MARKER_COLORS.amber
          : MARKER_COLORS.red;
    for (let axis = 0; axis < 3; axis++) {
      const a = [p[0]!, p[1]!, p[2]!];
      const b = [p[0]!, p[1]!, p[2]!];
      a[axis] = a[axis]! - h;
      b[axis] = b[axis]! + h;
      out.segment(a, b, color);
    }
  }
  return out.geometry();
}

/**
 * The trajectory's origin sampled every `step` seconds over [t0, t1] in
 * `drawIn`, each sample mapped to ITRF with `drawIn`'s placement at the one
 * instant `at` (so GCRF shows Orion's figure-eight and MOON_ME the swing around
 * the far side). Samples the trajectory doesn't cover are skipped and no
 * segment crosses the gap.
 */
export function trajectoryPath(
  trajectory: Pick<Trajectory, "frame" | "contains">,
  drawIn: Frame,
  frames: Pick<Frames, "itrf">,
  t0: Instant,
  t1: Instant,
  step: number,
  at: Instant,
  options: { color?: Rgba } = {},
): Geometry {
  positive("trajectoryPath: step", step);
  const color = options.color ?? TRAJECTORY_COLOR;
  const placement = frameTransform(drawIn, frames.itrf, at);
  const start = t0.tdb();
  const count = Math.floor((t1.tdb() - start) / step + 1e-9);
  const out = new Lines();
  const inDrawIn = new Float64Array(16);
  let previous: number[] | undefined;
  for (let i = 0; i <= count; i++) {
    const instant = Instant.fromTdb(start + i * step);
    if (!trajectory.contains(instant)) {
      previous = undefined;
      continue;
    }
    frameTransform(trajectory.frame, drawIn, instant, inDrawIn);
    const x = inDrawIn[12]!;
    const y = inDrawIn[13]!;
    const z = inDrawIn[14]!;
    const here = [
      placement[0]! * x +
        placement[4]! * y +
        placement[8]! * z +
        placement[12]!,
      placement[1]! * x +
        placement[5]! * y +
        placement[9]! * z +
        placement[13]!,
      placement[2]! * x +
        placement[6]! * y +
        placement[10]! * z +
        placement[14]!,
    ];
    if (previous) {
      out.segment(previous, here, color);
    }
    previous = here;
  }
  return out.geometry();
}

/** How `adaptivePath` refines: a coarse step, then splits where the chord leaves the curve. */
export interface AdaptiveOptions {
  /** The coarse step, seconds: every span is sampled at least this often. */
  step: number;
  /**
   * The largest departure a segment may have from the curve, as a fraction of
   * its distance from `drawIn`'s origin (1e-3: 1 km at 1,000 km).
   */
  tolerance: number;
  /** No interval is split below this, seconds. */
  minStep: number;
  /** At most this many samples (frame evaluations), the coarse ones included. */
  maxSamples: number;
  /** A departure below this many meters is never split (default 1 m). */
  floor?: number;
  /** Stop refining once this many milliseconds have passed (the worker's budget). */
  budgetMs?: number;
  /** The clock for `budgetMs`, milliseconds (default `performance.now`). */
  now?: () => number;
}

/** What `adaptivePath` did: how many samples, its finest segment and whether a budget stopped it. */
export interface Sampling {
  samples: number;
  /** The shortest segment's span, seconds. */
  finest: number;
  /** Set when a budget ran out before every segment met the tolerance. */
  capped?: "samples" | "time";
}

/**
 * `trajectoryPath` with an adaptive step: each span of the trajectory's data
 * (its `spans`, else the instants `contains` accepts) is sampled every
 * `options.step` seconds, then the interval whose midpoint departs most from
 * its chord, against `options.tolerance` times its distance from `drawIn`'s
 * origin, is halved, and again, until every interval meets the tolerance, an
 * interval would be shorter than `minStep`, or a budget (`maxSamples`,
 * `budgetMs`) runs out. The coarse samples always come first, so a capped
 * path is still whole, only coarser. Every sample is drawn: an interval's
 * midpoint splits its chord in two. No segment crosses a gap in the data.
 *
 * Returns the geometry, each vertex's instant (TDB seconds, `times`) and
 * `sampling`.
 */
export function adaptivePath(
  trajectory: Pick<Trajectory, "frame" | "contains"> &
    Partial<Pick<Trajectory, "spans">>,
  drawIn: Frame,
  frames: Pick<Frames, "itrf">,
  t0: Instant,
  t1: Instant,
  options: AdaptiveOptions,
  at: Instant,
  style: { color?: Rgba } = {},
): Geometry & { times: Float64Array; sampling: Sampling } {
  positive("adaptivePath: step", options.step);
  positive("adaptivePath: minStep", options.minStep);
  if (!(Number.isFinite(options.tolerance) && options.tolerance > 0)) {
    throw new RangeError(
      `adaptivePath: tolerance must be a positive fraction, got ${options.tolerance}`,
    );
  }
  const color = style.color ?? TRAJECTORY_COLOR;
  const floor = options.floor ?? 1;
  const now = options.now ?? (() => performance.now());
  const started = options.budgetMs !== undefined ? now() : 0;
  const placement = frameTransform(drawIn, frames.itrf, at);
  const m = new Float64Array(16);
  let samples = 0;
  let capped: Sampling["capped"];
  /** The trajectory's origin in `drawIn` at `t` (TDB seconds). */
  const sample = (t: number): number[] => {
    samples++;
    frameTransform(trajectory.frame, drawIn, Instant.fromTdb(t), m);
    return [m[12]!, m[13]!, m[14]!];
  };
  const contained = (t: number) => trajectory.contains(Instant.fromTdb(t));
  /** Whether another sample fits the budgets; notes which one ran out. */
  const affordable = (count: number): boolean => {
    if (samples + count > options.maxSamples) {
      capped ??= "samples";
      return false;
    }
    if (options.budgetMs !== undefined && now() - started > options.budgetMs) {
      capped ??= "time";
      return false;
    }
    return true;
  };

  interface Interval {
    ta: number;
    tb: number;
    pa: number[];
    pb: number[];
    /** The midpoint, when sampled. */
    pm?: number[];
    /** The midpoint's departure from the chord, against the tolerance there (1 = at the limit). */
    ratio: number;
  }
  /** `iv` with its midpoint sampled and judged, or undefined when the midpoint is in a gap. */
  const judge = (iv: Interval): Interval | undefined => {
    const tm = (iv.ta + iv.tb) / 2;
    if (!contained(tm)) {
      return undefined;
    }
    const pm = sample(tm);
    const d = Math.hypot(
      pm[0]! - (iv.pa[0]! + iv.pb[0]!) / 2,
      pm[1]! - (iv.pa[1]! + iv.pb[1]!) / 2,
      pm[2]! - (iv.pa[2]! + iv.pb[2]!) / 2,
    );
    const limit = Math.max(
      floor,
      options.tolerance * Math.hypot(pm[0]!, pm[1]!, pm[2]!),
    );
    return { ...iv, pm, ratio: d / limit };
  };

  // The coarse pass: every span's knots, then each interval's midpoint.
  const start = t0.tdb();
  const end = t1.tdb();
  const spans: (readonly [number, number])[] = trajectory.spans
    ? trajectory.spans
        .map(([a, b]) => [Math.max(a, start), Math.min(b, end)] as const)
        .filter(([a, b]) => b >= a)
    : [[start, end]];
  const coarse: Interval[] = [];
  for (const [a, b] of spans) {
    const count = Math.floor((b - a) / options.step + 1e-9);
    const knots = Array.from(
      { length: count + 1 },
      (_, i) => a + i * options.step,
    );
    if (b - knots.at(-1)! > 1e-9 * options.step) {
      knots.push(b);
    }
    let previous: { t: number; p: number[] } | undefined;
    for (const t of knots) {
      if (!contained(t)) {
        previous = undefined;
        continue;
      }
      const p = sample(t);
      if (previous) {
        coarse.push({ ta: previous.t, tb: t, pa: previous.p, pb: p, ratio: 0 });
      }
      previous = { t, p };
    }
  }
  // A max-heap of intervals by ratio; intervals that can't split go to `done`.
  const heap: Interval[] = [];
  const done: Interval[] = [];
  const push = (iv: Interval) => {
    heap.push(iv);
    for (let i = heap.length - 1; i > 0;) {
      const parent = (i - 1) >> 1;
      if (heap[parent]!.ratio >= heap[i]!.ratio) {
        break;
      }
      [heap[parent], heap[i]] = [heap[i]!, heap[parent]!];
      i = parent;
    }
  };
  const pop = (): Interval => {
    const top = heap[0]!;
    const last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      for (let i = 0; ;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let big = i;
        if (l < heap.length && heap[l]!.ratio > heap[big]!.ratio) {
          big = l;
        }
        if (r < heap.length && heap[r]!.ratio > heap[big]!.ratio) {
          big = r;
        }
        if (big === i) {
          break;
        }
        [heap[big], heap[i]] = [heap[i]!, heap[big]!];
        i = big;
      }
    }
    return top;
  };
  /** Files a judged interval: refinable ones in the heap, the rest as done. */
  const file = (iv: Interval) => {
    if (iv.ratio > 1 && (iv.tb - iv.ta) / 2 >= 2 * options.minStep) {
      push(iv);
    } else {
      done.push(iv);
    }
  };
  for (const iv of coarse) {
    if (!affordable(1)) {
      done.push(iv);
      continue;
    }
    const judged = judge(iv);
    if (judged) {
      file(judged);
    }
  }
  // Refinement: halve the worst interval while the budgets allow.
  while (heap.length > 0 && affordable(2)) {
    const iv = pop();
    const tm = (iv.ta + iv.tb) / 2;
    for (const half of [
      { ta: iv.ta, tb: tm, pa: iv.pa, pb: iv.pm!, ratio: 0 },
      { ta: tm, tb: iv.tb, pa: iv.pm!, pb: iv.pb, ratio: 0 },
    ]) {
      const judged = judge(half);
      if (judged) {
        file(judged);
      }
    }
  }
  if (heap.length > 0) {
    capped ??= "samples";
  }
  done.push(...heap);
  done.sort((x, y) => x.ta - y.ta);

  const out = new Lines();
  const times: number[] = [];
  const place = (p: number[]) => [
    placement[0]! * p[0]! +
      placement[4]! * p[1]! +
      placement[8]! * p[2]! +
      placement[12]!,
    placement[1]! * p[0]! +
      placement[5]! * p[1]! +
      placement[9]! * p[2]! +
      placement[13]!,
    placement[2]! * p[0]! +
      placement[6]! * p[1]! +
      placement[10]! * p[2]! +
      placement[14]!,
  ];
  let finest = Infinity;
  const segment = (ta: number, tb: number, pa: number[], pb: number[]) => {
    out.segment(place(pa), place(pb), color);
    times.push(ta, tb);
    finest = Math.min(finest, tb - ta);
  };
  for (const iv of done) {
    if (iv.pm) {
      const tm = (iv.ta + iv.tb) / 2;
      segment(iv.ta, tm, iv.pa, iv.pm);
      segment(tm, iv.tb, iv.pm, iv.pb);
    } else {
      segment(iv.ta, iv.tb, iv.pa, iv.pb);
    }
  }
  return {
    ...out.geometry(),
    times: Float64Array.from(times),
    sampling: {
      samples,
      finest: Number.isFinite(finest) ? finest : 0,
      ...(capped !== undefined && { capped }),
    },
  };
}

/**
 * Marching squares: the segments of the `level` contour of `field`, samples at
 * `origin + (i * spacing[0], j * spacing[1])` stored row by row (`field[j * nx
 * + i]`). Returns x1, y1, x2, y2 per segment, in the field's own coordinates.
 * A cell with a NaN corner is skipped; a saddle is resolved by the cell's
 * average.
 */
export function contourSegments(
  field: ArrayLike<number>,
  nx: number,
  ny: number,
  origin: readonly [number, number],
  spacing: readonly [number, number],
  level: number,
): Float64Array {
  const out: number[] = [];
  for (let j = 0; j + 1 < ny; j++) {
    for (let i = 0; i + 1 < nx; i++) {
      // Corners counterclockwise from (i, j): bottom-left, bottom-right,
      // top-right, top-left.
      const v = [
        field[j * nx + i]!,
        field[j * nx + i + 1]!,
        field[(j + 1) * nx + i + 1]!,
        field[(j + 1) * nx + i]!,
      ];
      if (v.some((x) => Number.isNaN(x))) {
        continue;
      }
      const cx = [i, i + 1, i + 1, i];
      const cy = [j, j, j + 1, j + 1];
      // Edge e joins corner e and corner (e + 1) % 4; its crossing, if any.
      const crossing: ([number, number] | undefined)[] = [0, 1, 2, 3].map(
        (e) => {
          const a = e;
          const b = (e + 1) % 4;
          if (v[a]! >= level === v[b]! >= level) {
            return undefined;
          }
          const t = (level - v[a]!) / (v[b]! - v[a]!);
          return [
            origin[0] + (cx[a]! + t * (cx[b]! - cx[a]!)) * spacing[0],
            origin[1] + (cy[a]! + t * (cy[b]! - cy[a]!)) * spacing[1],
          ];
        },
      );
      const hit = [0, 1, 2, 3].filter((e) => crossing[e]);
      const join = (a: number, b: number) =>
        out.push(...crossing[a]!, ...crossing[b]!);
      if (hit.length === 2) {
        join(hit[0]!, hit[1]!);
      } else if (hit.length === 4) {
        const centre = (v[0]! + v[1]! + v[2]! + v[3]!) / 4;
        if (centre >= level === v[0]! >= level) {
          join(0, 1);
          join(2, 3);
        } else {
          join(3, 0);
          join(1, 2);
        }
      }
    }
  }
  return Float64Array.from(out);
}

const contourColor = (ppm: number): Rgba =>
  ppm < 0
    ? [64, 128, 255, 255]
    : ppm > 0
      ? [255, 96, 64, 255]
      : [255, 255, 255, 255];

/** The RangeErrors `gridFactors` throws where a projection has no scale. */
const NO_SCALE =
  /outside the projection's domain|is at a pole|singular point of the projection/;

/** How many Tissot vertices an ellipse has. */
const TISSOT_SEGMENTS = 32;

/**
 * The distortion of a projected frame over `extent`, sampled every `step`
 * design units at `options.height`:
 *  - `tissot`: at each node the indicatrix, a small ellipse of `tissotRadius`
 *    meters on the ground drawn in the tangent plane, with semi-axes
 *    `tissotRadius x k` along the parallel (east) and `tissotRadius x h` along
 *    the meridian's image, which is the meridian-parallel angle θ′ from east
 *    toward north. A conformal projection gives a circle, an equal-area one an
 *    ellipse of the same area. Vertex 0 of each ellipse is its parallel
 *    axis's end.
 *  - `contours`: the combined factor's contours at `contoursPpm` (default
 *    ±10, ±50, ±100, ±400 ppm; k x elevation factor - 1), by marching squares
 *    over the sampled factor.
 *  - `labels`: positions (x, y, z each) on those contours with their ppm
 *    values.
 * A node where PROJ has no scale (a pole) has no ellipse and no contour.
 */
export function distortion(
  frame: EngineeringFrame,
  extent: Extent,
  step: number,
  options: {
    height: number;
    contoursPpm?: readonly number[];
    tissotRadius: number;
  },
): {
  tissot: Geometry;
  contours: Geometry;
  labels: { positions: Float64Array; ppm: Float64Array };
  /** Nodes with no scale (poles, outside the domain, singular), left out of all three. */
  skipped: number;
} {
  positive("distortion: step", step);
  positive("distortion: tissotRadius", options.tissotRadius);
  const { min, max } = extent;
  const xs = gridValues(min[0], max[0], step);
  const ys = gridValues(min[1], max[1], step);
  const nx = xs.length;
  const ny = ys.length;
  const field = new Float64Array(nx * ny).fill(NaN);
  let skipped = 0;
  const tissot = new Lines();
  const r = options.tissotRadius;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const design = [xs[i]!, ys[j]!, options.height];
      let factors;
      try {
        factors = gridFactors(frame, design);
      } catch (error) {
        // Only PROJ having no scale here (a pole, outside the projection's
        // domain, a singular point) skips the node; anything else is a bug.
        if (error instanceof RangeError && NO_SCALE.test(error.message)) {
          skipped++;
          continue;
        }
        throw error;
      }
      field[j * nx + i] = (factors.combinedFactor - 1) * 1e6;
      const centre = frame.toBodyFixed(design);
      const { longitude: lon, latitude: lat } = frame.toGeodetic(design);
      const east = [-Math.sin(lon), Math.cos(lon), 0];
      const north = [
        -Math.sin(lat) * Math.cos(lon),
        -Math.sin(lat) * Math.sin(lon),
        Math.cos(lat),
      ];
      const k = factors.pointScale;
      const h = factors.meridionalScale;
      const theta = factors.meridianParallelAngle;
      const ring: number[][] = [];
      for (let s = 0; s < TISSOT_SEGMENTS; s++) {
        const t = (2 * Math.PI * s) / TISSOT_SEGMENTS;
        // The image of the ground circle's point at angle t, in (east, north).
        const ex = r * (k * Math.cos(t) + h * Math.sin(t) * Math.cos(theta));
        const ny2 = r * h * Math.sin(t) * Math.sin(theta);
        ring.push([
          centre[0]! + ex * east[0]! + ny2 * north[0]!,
          centre[1]! + ex * east[1]! + ny2 * north[1]!,
          centre[2]! + ex * east[2]! + ny2 * north[2]!,
        ]);
      }
      for (let s = 0; s < TISSOT_SEGMENTS; s++) {
        tissot.segment(
          ring[s]!,
          ring[(s + 1) % TISSOT_SEGMENTS]!,
          TISSOT_COLOR,
        );
      }
    }
  }
  const contours = new Lines();
  const labelPositions: number[] = [];
  const labelValues: number[] = [];
  for (const ppm of options.contoursPpm ?? DEFAULT_CONTOURS_PPM) {
    const segments = contourSegments(
      field,
      nx,
      ny,
      [xs[0]!, ys[0]!],
      [step, step],
      ppm,
    );
    const count = segments.length / 4;
    const place = (x: number, y: number) =>
      frame.toBodyFixed([x, y, options.height]);
    for (let s = 0; s < count; s++) {
      contours.segment(
        place(segments[4 * s]!, segments[4 * s + 1]!),
        place(segments[4 * s + 2]!, segments[4 * s + 3]!),
        contourColor(ppm),
      );
    }
    // Up to three labels per level, a quarter, half and three quarters of the
    // way along its segments.
    const chosen = new Set(
      count === 0
        ? []
        : [0.25, 0.5, 0.75].map((f) =>
            Math.min(count - 1, Math.floor(f * count)),
          ),
    );
    for (const s of chosen) {
      const p = place(
        (segments[4 * s]! + segments[4 * s + 2]!) / 2,
        (segments[4 * s + 1]! + segments[4 * s + 3]!) / 2,
      );
      labelPositions.push(p[0]!, p[1]!, p[2]!);
      labelValues.push(ppm);
    }
  }
  return {
    skipped,
    tissot: tissot.geometry(),
    contours: contours.geometry(),
    labels: {
      positions: Float64Array.from(labelPositions),
      ppm: Float64Array.from(labelValues),
    },
  };
}

const srgbToLinear = (byte: number): number => {
  const c = byte / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** The largest extent, meters per axis, of one chunk of an overlay's mesh. */
export const CHUNK_EXTENT = 1e5;

/** One uploaded mesh of an overlay, and the float64 origin of its draw. */
export interface OverlayChunk {
  mesh: MeshData;
  origin: Float64Array;
}

/**
 * The meshes `addOverlay` uploads, each with the float64 origin of its draw.
 * A mesh is float32, which near the Earth (6.4e6 m) has half-meter steps and
 * at the Moon (3.8e8 m) tens of meters, so the large part cannot ride in the
 * vertices. And one origin is not enough for a long geometry: a 4e8 m path
 * has local offsets of 2e8 m, again 16 m steps. So the segments are split
 * into runs (in order) whose bounding box is at most `extent` (by default
 * `CHUNK_EXTENT`) on every
 * axis, each with its own mesh holding offsets from its box's center and its
 * own origin. A segment longer than that is cut into equal pieces first
 * (its colors interpolated). `World` carries each draw's transform as a hi/lo
 * split and subtracts the camera in float64, so a chunk draws exact to its
 * vertices' float32 step (a few millimeters) and does not move with the
 * camera. Empty for empty geometry.
 */
export function overlayMesh(
  geometry: Geometry,
  options: {
    /**
     * The largest chunk, meters per axis (default `CHUNK_EXTENT`). A long
     * path far from the Earth, whose own accuracy is meters (Orion's), can
     * take 1e7 m: half-metre float32 steps, and a hundredth of the draws.
     */
    extent?: number;
  } = {},
): OverlayChunk[] {
  const { positions, colors } = geometry;
  const extent = options.extent ?? CHUNK_EXTENT;
  if (!(Number.isFinite(extent) && extent > 0)) {
    throw new RangeError(
      `overlayMesh: extent must be a positive number of meters, got ${extent}`,
    );
  }
  if (positions.length % 3 !== 0) {
    throw new RangeError(
      `overlayMesh: positions hold ${positions.length} numbers, not a whole number of vertices`,
    );
  }
  const vertices = positions.length / 3;
  if (colors.length !== 4 * vertices) {
    throw new RangeError(
      `overlayMesh: ${vertices} vertices need ${4 * vertices} bytes of colors, got ${colors.length}`,
    );
  }
  if (vertices % 2 !== 0) {
    throw new RangeError(
      `overlayMesh: a line list is vertex pairs, got ${vertices} vertices`,
    );
  }
  const chunks: OverlayChunk[] = [];
  let points: number[] = [];
  let bytes: number[] = [];
  let lo = [Infinity, Infinity, Infinity];
  let hi = [-Infinity, -Infinity, -Infinity];
  const flush = () => {
    if (points.length > 0) {
      chunks.push(buildChunk(points, bytes, lo, hi));
    }
    points = [];
    bytes = [];
    lo = [Infinity, Infinity, Infinity];
    hi = [-Infinity, -Infinity, -Infinity];
  };
  for (let v = 0; v < vertices; v += 2) {
    const a = positions.subarray(3 * v, 3 * v + 3);
    const b = positions.subarray(3 * v + 3, 3 * v + 6);
    const span = Math.max(
      Math.abs(b[0]! - a[0]!),
      Math.abs(b[1]! - a[1]!),
      Math.abs(b[2]! - a[2]!),
    );
    const n = Math.max(1, Math.ceil(span / extent));
    const at = (k: number, c: number) =>
      k === 0 ? a[c]! : k === n ? b[c]! : a[c]! + ((b[c]! - a[c]!) * k) / n;
    const byteAt = (k: number, c: number) =>
      Math.round(
        colors[4 * v + c]! +
          ((colors[4 * v + 4 + c]! - colors[4 * v + c]!) * k) / n,
      );
    for (let k = 0; k < n; k++) {
      const piece = [0, 1].flatMap((end) =>
        [0, 1, 2].map((c) => at(k + end, c)),
      );
      const nlo = lo.map((x, c) => Math.min(x, piece[c]!, piece[3 + c]!));
      const nhi = hi.map((x, c) => Math.max(x, piece[c]!, piece[3 + c]!));
      if (points.length > 0 && nhi.some((x, c) => x - nlo[c]! > extent)) {
        flush();
        lo = [0, 1, 2].map((c) => Math.min(piece[c]!, piece[3 + c]!));
        hi = [0, 1, 2].map((c) => Math.max(piece[c]!, piece[3 + c]!));
      } else {
        lo = nlo;
        hi = nhi;
      }
      points.push(...piece);
      for (const end of [k, k + 1]) {
        for (let c = 0; c < 4; c++) {
          bytes.push(byteAt(end, c));
        }
      }
    }
  }
  flush();
  return chunks;
}

function buildChunk(
  points: number[],
  bytes: number[],
  lo: number[],
  hi: number[],
): OverlayChunk {
  const origin = new Float64Array(3).map((_, c) => (lo[c]! + hi[c]!) / 2);
  const local = new Float32Array(points.length);
  for (let i = 0; i < points.length; i++) {
    local[i] = points[i]! - origin[i % 3]!;
  }
  const linear = new Float32Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    linear[i] = i % 4 === 3 ? bytes[i]! / 255 : srgbToLinear(bytes[i]!);
  }
  const indices = new Uint32Array(points.length / 3);
  for (let i = 0; i < indices.length; i++) {
    indices[i] = i;
  }
  return {
    mesh: { positions: local, colors: linear, indices, topology: "line-list" },
    origin,
  };
}

/**
 * Draws geometry as unlit line-list meshes in `world` (R3), Earth-fixed, one
 * per chunk (see `overlayMesh`). Returns a remover (idempotent) that removes
 * every chunk, and registers it in `scope`. Geometry with no vertices draws
 * nothing.
 */
export function addOverlay(
  world: World,
  geometry: Geometry,
  scope: DisposableStack,
): () => void {
  return addOverlayChunks(world, overlayMesh(geometry), scope);
}

/**
 * `addOverlay` for chunks `overlayMesh` already made, such as the ones the
 * compute worker sends (R13).
 */
export function addOverlayChunks(
  world: World,
  chunks: readonly OverlayChunk[],
  scope: DisposableStack,
): () => void {
  const added: { mesh: MeshHandle; draw: DrawHandle }[] = [];
  let removed = false;
  const remove = () => {
    if (!removed) {
      removed = true;
      for (const { mesh, draw } of added.splice(0)) {
        world.removeDraw(draw);
        world.removeMesh(mesh);
      }
    }
  };
  try {
    for (const chunk of chunks) {
      const mesh = world.addMesh(chunk.mesh);
      try {
        const draw = world.addDraw({
          mesh,
          origin: chunk.origin,
          unlit: true,
          name: "frames explorer overlay",
        });
        added.push({ mesh, draw });
      } catch (error) {
        world.removeMesh(mesh);
        throw error;
      }
    }
  } catch (error) {
    remove();
    throw error;
  }
  scope.defer(remove);
  return remove;
}
