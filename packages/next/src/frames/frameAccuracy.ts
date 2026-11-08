// A frame's stated accuracy (plan 4b, Task 7b: "the library composes; the
// app only declares"). `pointAccuracy` (pointAccuracy.ts) composes it.
//
// Every figure is 1σ. Confidence levels, correlated terms and per-direction
// error ellipsoids are plan 5 (CESIUM2_WEBGPU_PLAN.md §13.14).

/**
 * A frame's edge to its parent, as accurate as it is stated to be (1σ):
 *
 * - `meters`, a position error: the whole frame may sit this far from where
 *   its edge puts it (a survey, a link's length tolerance);
 * - `radians`, a rotation error about the frame's own origin (an encoder,
 *   the Earth's orientation): a point `d` metres from that origin moves by
 *   up to `radians × d`;
 * - `byDefinition`, the edge is a convention with no error to state (an
 *   adopted constant, a frame defined at a chosen point); `meters` and
 *   `radians` are then absent.
 *
 * With none of the three the accuracy is not stated, and `note` says why.
 * `note` always says where the figure comes from. A figure is never 0, NaN
 * or negative (the constructor throws, naming the frame).
 */
export interface FrameAccuracy {
  meters?: number;
  radians?: number;
  byDefinition?: true;
  note: string;
}

/** A frame built without an accuracy: not stated. */
export const NOT_STATED: Readonly<FrameAccuracy> = Object.freeze({
  note: "not stated: the frame was built without an accuracy",
});

/** Whether `a` states no size at all (not stated, not known). */
export const isUnstated = (a: FrameAccuracy): boolean =>
  a.byDefinition !== true && a.meters === undefined && a.radians === undefined;

/**
 * `a` checked, as a frozen copy (a shared accuracy can't be changed by a
 * reader): each figure finite and positive, and `byDefinition` alone.
 * Throws a `RangeError` naming `frame` otherwise.
 */
export function checkedAccuracy(
  frame: string,
  a: Readonly<FrameAccuracy>,
): Readonly<FrameAccuracy> {
  for (const key of ["meters", "radians"] as const) {
    const v = a[key];
    if (v !== undefined && !(Number.isFinite(v) && v > 0)) {
      throw new RangeError(
        `Frame "${frame}": accuracy.${key} must be a finite positive number (1σ), not ${v}; state an exact edge with byDefinition`,
      );
    }
  }
  if (
    a.byDefinition === true &&
    (a.meters !== undefined || a.radians !== undefined)
  ) {
    throw new RangeError(
      `Frame "${frame}": an accuracy that is exact by definition states no meters or radians`,
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
