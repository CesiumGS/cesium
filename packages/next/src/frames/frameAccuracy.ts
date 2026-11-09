// A reference frame's stated accuracy (plan 4b, Task 7b: "the library
// composes; the app only declares"). `pointAccuracy` (pointAccuracy.ts)
// composes it, beyond first order since 5b: confidence levels, shared
// sources, a rotation axis and a covariance.

import { eigenSymmetric, trace } from "./covariance.ts";

/**
 * What a figure's size means: `"1σ"` (the default), `"95%"` (needs a
 * `distribution`, `"normal"`) or `"max"` (a hard bound; needs
 * `"uniform"`). Anything else is refused when composed, naming the edge.
 */
export type Confidence = "1σ" | "95%" | "max";

/**
 * A source of error that several edges share. `"linear"`: same-id figures
 * on one leg of a route add their signed square-root factors, and on
 * opposite legs subtract. `"difference"`: the figure bounds a difference
 * between two edges: a route that crosses such edges on both legs counts
 * the largest once, and one that crosses them on one leg only is not
 * stated, saying why.
 */
export interface SharedSource {
  readonly id: string;
  readonly rule: "linear" | "difference";
}

/** One figure of an edge's accuracy. */
export interface AccuracyFigure {
  /** A position error, m. */
  meters?: number;
  /** A rotation error, rad. */
  radians?: number;
  confidence?: Confidence;
  distribution?: "normal" | "uniform";
  /** A unit vector in the reference frame's own axes, for `radians`: the rotation is about it. */
  axis?: readonly [number, number, number];
  /** A row-major 3×3 position covariance, m², 1σ, in the reference frame's own axes. */
  covariance?: ArrayLike<number>;
  source?: SharedSource;
  /** A short name for the figure ("UT1", "polar motion"). */
  term?: string;
  /** The figure is a prediction (it grows with age). */
  predicted?: boolean;
  /** The figure is an estimate, not a published value. */
  estimated?: boolean;
  note?: string;
}

/**
 * A reference frame's edge to its parent, as accurate as it is stated to be
 * (1σ unless a figure says otherwise):
 *
 * - `meters`, a position error: the whole frame may sit this far from where
 *   its edge puts it (a survey, a link's length tolerance);
 * - `radians`, a rotation error about the frame's own origin (an encoder,
 *   the Earth's orientation): a point `d` metres from that origin (or from
 *   its `axis`) moves by up to `radians × d`;
 * - `byDefinition`, the edge is a convention with no error to state (an
 *   adopted constant, a frame defined at a chosen point); `meters` and
 *   `radians` are then absent;
 * - `simulated`, the edge makes no claim (a simulated span).
 *
 * With none of these the accuracy is not stated, and `note` says why.
 * `note` always says where the figure comes from. A figure is never 0, NaN
 * or negative (the constructor throws, naming the frame). `parts` are
 * further figures on the same edge.
 */
export interface FrameAccuracy extends AccuracyFigure {
  byDefinition?: true;
  simulated?: true;
  parts?: readonly AccuracyFigure[];
  note: string;
}

/** A frame built without an accuracy: not stated. */
export const NOT_STATED: Readonly<FrameAccuracy> = Object.freeze({
  note: "not stated: the frame was built without an accuracy",
});

/** Whether `a` states no size at all (not stated, not known). */
export const isUnstated = (a: FrameAccuracy): boolean =>
  a.byDefinition !== true &&
  a.simulated !== true &&
  a.meters === undefined &&
  a.radians === undefined &&
  a.covariance === undefined &&
  (a.parts === undefined || a.parts.length === 0);

/** The figure's fields checked; throws a `RangeError` naming `frame`. */
function checkedFigure(frame: string, f: AccuracyFigure): void {
  for (const key of ["meters", "radians"] as const) {
    const v = f[key];
    if (v !== undefined && !(Number.isFinite(v) && v > 0)) {
      throw new RangeError(
        `Frame "${frame}": accuracy.${key} must be a finite positive number (1σ), not ${v}; state an exact edge with byDefinition`,
      );
    }
  }
  if (f.axis !== undefined) {
    const n = Math.hypot(f.axis[0], f.axis[1], f.axis[2]);
    if (!(Math.abs(n - 1) <= 1e-9)) {
      throw new RangeError(
        `Frame "${frame}": accuracy.axis must be a unit vector (its length is ${n})`,
      );
    }
  }
  const c = f.covariance;
  if (c !== undefined) {
    if (c.length !== 9 || Array.from(c).some((v) => !Number.isFinite(v))) {
      throw new RangeError(
        `Frame "${frame}": accuracy.covariance must be 9 finite numbers (a row-major 3×3)`,
      );
    }
    for (const [i, j] of [
      [0, 1],
      [0, 2],
      [1, 2],
    ] as const) {
      const x = c[i * 3 + j]!;
      const y = c[j * 3 + i]!;
      if (Math.abs(x - y) > 1e-9 * Math.max(1, Math.abs(x), Math.abs(y))) {
        throw new RangeError(
          `Frame "${frame}": accuracy.covariance must be symmetric`,
        );
      }
    }
    const { values } = eigenSymmetric(c);
    const scale = Math.max(Math.abs(values[0]!), 1e-300);
    if (values[2]! < -1e-9 * scale) {
      throw new RangeError(
        `Frame "${frame}": accuracy.covariance must be positive semi-definite`,
      );
    }
    if (f.confidence !== undefined && f.confidence !== "1σ") {
      throw new RangeError(
        `Frame "${frame}": accuracy.covariance is at 1σ, not ${f.confidence}`,
      );
    }
    const root = Math.sqrt(trace(c));
    if (f.meters !== undefined && Math.abs(f.meters - root) > 1e-9 * root) {
      throw new RangeError(
        `Frame "${frame}": accuracy.meters (${f.meters}) disagrees with the covariance's √trace (${root})`,
      );
    }
  }
}

/**
 * `a` checked, as a frozen copy (a shared accuracy can't be changed by a
 * reader): each figure finite and positive, `byDefinition` alone, an axis a
 * unit vector, a covariance symmetric, positive semi-definite, at 1σ and
 * agreeing with `meters`, and `simulated` with no figure. Throws a
 * `RangeError` naming `frame` otherwise.
 */
export function checkedAccuracy(
  frame: string,
  a: Readonly<FrameAccuracy>,
): Readonly<FrameAccuracy> {
  checkedFigure(frame, a);
  for (const part of a.parts ?? []) {
    checkedFigure(frame, part);
  }
  const figures =
    a.meters !== undefined ||
    a.radians !== undefined ||
    a.covariance !== undefined ||
    (a.parts?.length ?? 0) > 0;
  if (a.byDefinition === true && figures) {
    throw new RangeError(
      `Frame "${frame}": an accuracy that is exact by definition states no meters or radians`,
    );
  }
  if (a.simulated === true && (figures || a.byDefinition === true)) {
    throw new RangeError(
      `Frame "${frame}": a simulated accuracy makes no claim, so it states no figure`,
    );
  }
  return Object.isFrozen(a) ? a : Object.freeze({ ...a });
}

/** `table` with each entry frozen, and itself: shared accuracies can't be changed by a reader. */
export function deepFreeze<T extends Record<string, object>>(
  table: T,
): Readonly<T> {
  for (const v of Object.values(table)) {
    Object.freeze(v);
  }
  return Object.freeze(table);
}

/**
 * DE440's stated accuracy for the Earth's and the Moon's positions, m: its
 * Earth-Moon fit to lunar laser ranging (Park et al. 2021, AJ 161:105). The
 * one definition; `accuracyOf` (measure) and the built-in edges read it.
 */
export const DE440_EARTH_MOON_METERS = 0.01;

const EPHEMERIS: FrameAccuracy = Object.freeze({
  meters: DE440_EARTH_MOON_METERS,
  note: "DE440 Earth-Moon fit to lunar laser ranging (stated model accuracy)",
});

/**
 * Each built-in edge's stated accuracy (1σ), by frame name: the one source
 * the tree, `pointAccuracy` and the explorer read (Task 7b). ITRF's drifts
 * with the instant (`itrfAccuracy`).
 */
export const BUILT_IN_ACCURACY = deepFreeze({
  HCRS: {
    note: "not stated: heliocentric geometry has no stated absolute accuracy (DE440's 0.01 m is its Earth-Moon fit)",
  },
  EARTH_ICRF: EPHEMERIS,
  MOON_ICRF: EPHEMERIS,
  GCRF: EPHEMERIS,
  EME2000: {
    byDefinition: true,
    note: "exact by definition: the IAU 2006 frame bias is a set of adopted constants",
  },
  // Lunar orientation: DE440 publishes no angular uncertainty for its
  // libration angles (Park et al. 2021, AJ 161:105); its lunar laser ranging
  // range residual is never its orientation accuracy.
  MOON_ME: {
    note: "not stated: DE440's integrated libration angles have no published orientation uncertainty. Its recent lunar laser ranging range residuals are about 1.3 cm rms (Park et al. 2021, AJ 161:105, §5.1), a fit to ranges, not an orientation accuracy; its mean-Earth frame differs from DE421's by up to 0.53 m over 2000–2040 (NAIF moon_de440_250416.tf)",
  },
  MOON_PA: {
    byDefinition: true,
    note: "exact by definition for DE440: adopted constants (Park et al. 2021 §2.4 eq. 19). Its realisation of the mean-Earth frame differs from DE421's by up to 0.53 m (2000–2040) (NAIF moon_de440_250416.tf); the longitude angle is gravity-field limited to about 1″ (about 8 m) (DE421 IOM 335-JW,DB,WF-20080314-001, p. 10)",
  },
} as const satisfies Record<string, FrameAccuracy>);
