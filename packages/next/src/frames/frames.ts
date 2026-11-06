import { MOON_PA_TO_ME } from "../ephemeris/Ephemeris.ts";
import { C, GM_MOON, GM_SUN, L_C } from "../measure/constants.ts";
import type { FrameData } from "../ephemeris/loadFrameData.ts";
import { EARTH, MOON, type Body } from "../scene/Body.ts";
import { celestialToTerrestrial } from "../time/earthOrientation.ts";
import { frameBias } from "../time/erfa/bias.ts";
import { Frame } from "./Frame.ts";
import { toParentMatrix } from "./matrix.ts";

/**
 * The built-in frame tree, from `createFrames`. Positions only (R11).
 *
 * Two Earth-centred inertial frames (frames 3, R1). `earthIcrf` is TDB-
 * compatible, joined to `icrf` by a plain translation: SPK and OEM data are
 * barycentric differences, which SPICE subtracts and never scales. `gcrf` is
 * the true GCRS, TT-compatible, joined to `icrf` by the affine map of IERS
 * Conventions 2010 (TN36) eq. 11.19,
 *
 *   r_TDB = r_TT (1 - U/c² - L_C) - ½ (V · r_TT) V / c²
 *
 * with U the potential at the geocenter excluding the Earth (Sun and Moon;
 * the other planets add about 2e-12, 1 mm at the Moon) and V the Earth's
 * barycentric velocity. ITRF coordinates are TT-compatible, so `itrf` sits
 * under `gcrf`. The scale is 2.5e-8 of the distance: 9.5 m at the Moon plus
 * up to 1.9 m of Lorentz term. The Moon's edge stays Newtonian (R2).
 * Frame transforms throw outside the ephemeris span (R3); the ITRF edge
 * also throws past the EOP table's predictions, where UT1 would otherwise
 * drift silently.
 */
export interface Frames {
  /** The International Celestial Reference Frame, the root. */
  readonly icrf: Frame<"ICRF">;
  /** The Sun's center, ICRF axes. */
  readonly hcrs: Frame<"HCRS">;
  /** The Earth's center, ICRF axes, TT-compatible: the GCRS, scaled from ICRF by eq. 11.19. */
  readonly gcrf: Frame<"GCRF">;
  /** The Earth's center, ICRF axes, TDB-compatible: ICRF translated by the Earth. Carries SPK and OEM data. */
  readonly earthIcrf: Frame<"EARTH_ICRF">;
  /** The Earth's center, mean equator and equinox of J2000 (EARTH_ICRF rotated by the frame bias). */
  readonly eme2000: Frame<"EME2000">;
  /** The Moon's center, ICRF axes. */
  readonly moonIcrf: Frame<"MOON_ICRF">;
  /** The International Terrestrial Reference Frame: Earth-fixed, by IAU 2006/2000A and the EOP. */
  readonly itrf: Frame<"ITRF">;
  /** The Moon's mean Earth / polar axes: Moon-fixed, from the lunar PCK. */
  readonly moonMe: Frame<"MOON_ME">;
  /** The Moon's principal axes. */
  readonly moonPa: Frame<"MOON_PA">;
  /**
   * The frame fixed to `body`: `itrf` for NAIF id 399, `moonMe` for 301.
   * Throws, naming the body, for any other.
   */
  bodyFixed(body: Body): Frame;
  /**
   * The body whose fixed frame `frame` is, or descends from: `EARTH` under
   * `itrf`, `MOON` under `moonMe` (so `moonPa` too). `undefined` otherwise.
   */
  bodyOf(frame: Frame): Body | undefined;
  /** The data the tree reads. */
  readonly data: FrameData;
}

const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1];

const distance = (a: Float64Array, b: Float64Array): number =>
  Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);

/** The built-in frame tree over loaded frames data. */
export function createFrames(data: FrameData): Frames {
  const { ephemeris, eop, leapSeconds } = data;
  const state = new Float64Array(6);
  const rotation = new Float64Array(9);

  const icrf = Frame.root("ICRF");
  const atBody =
    <N extends string>(
      name: N,
      position: (
        instant: Parameters<typeof ephemeris.sun>[0],
        out: Float64Array,
      ) => Float64Array,
    ) =>
    () =>
      new Frame(name, icrf, (instant, out) =>
        toParentMatrix(IDENTITY, position(instant, state), out),
      );
  const hcrs = atBody("HCRS", (i, o) => ephemeris.sun(i, o))();
  const earthIcrf = atBody("EARTH_ICRF", (i, o) => ephemeris.earth(i, o))();
  const moonIcrf = atBody("MOON_ICRF", (i, o) => ephemeris.moon(i, o))();

  // GCRF to ICRF, eq. 11.19: p_icrf = earth + k·r - ½ (V · r) V / c², with
  // k = 1 - U/c² - L_C. The one affine, non-rigid edge, so its Mat4 is
  // written directly rather than through toParentMatrix.
  const earthState = new Float64Array(6);
  const sunState = new Float64Array(6);
  const moonState = new Float64Array(6);
  const gcrf = new Frame("GCRF", icrf, (instant, out) => {
    ephemeris.earth(instant, earthState);
    ephemeris.sun(instant, sunState);
    ephemeris.moon(instant, moonState);
    const u =
      GM_SUN / distance(earthState, sunState) +
      GM_MOON / distance(earthState, moonState);
    const k = 1 - u / (C * C) - L_C;
    for (let col = 0; col < 3; col++) {
      for (let row = 0; row < 3; row++) {
        out[col * 4 + row] =
          (row === col ? k : 0) -
          (0.5 * earthState[3 + row]! * earthState[3 + col]!) / (C * C);
      }
      out[col * 4 + 3] = 0;
    }
    out[12] = earthState[0]!;
    out[13] = earthState[1]!;
    out[14] = earthState[2]!;
    out[15] = 1;
  });

  const eme2000 = Frame.constant(
    "EME2000",
    earthIcrf,
    toParentMatrix(frameBias(), undefined, new Float64Array(16)),
  );
  const itrf = new Frame("ITRF", gcrf, (instant, out) => {
    const sample = eop.atInstant(instant, leapSeconds);
    if (sample.degraded) {
      // UT1 - UTC drifts about a millisecond a day once the table's
      // predictions end: hundreds of meters at the equator within a year.
      const iso = (ms: number) => new Date(ms).toISOString();
      throw new Error(
        `ITRF: the EOP table covers ${iso(eop.first)} to ${iso(eop.last)} and its predictions end there; measurements past it need newer EOP data (npm run setup refreshes it)`,
      );
    }
    return toParentMatrix(
      celestialToTerrestrial(instant, sample, rotation),
      undefined,
      out,
    );
  });
  const moonMe = new Frame("MOON_ME", moonIcrf, (instant, out) =>
    toParentMatrix(ephemeris.moonMeanEarth(instant, rotation), undefined, out),
  );
  // MOON_PA_TO_ME is me = M · pa; the child (pa) from the parent (me) is Mᵀ.
  const meToPa = new Float64Array(9);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      meToPa[3 * i + j] = MOON_PA_TO_ME[3 * j + i]!;
    }
  }
  const moonPa = Frame.constant(
    "MOON_PA",
    moonMe,
    toParentMatrix(meToPa, undefined, new Float64Array(16)),
  );

  return {
    icrf,
    hcrs,
    gcrf,
    earthIcrf,
    eme2000,
    moonIcrf,
    itrf,
    moonMe,
    moonPa,
    bodyFixed(body: Body): Frame {
      if (body.naifId === 399) {
        return itrf;
      }
      if (body.naifId === 301) {
        return moonMe;
      }
      throw new Error(
        `frames: "${body.name}" has no fixed frame in the built-in tree (NAIF id ${body.naifId ?? "unset"})`,
      );
    },
    bodyOf(frame: Frame): Body | undefined {
      for (let f: Frame | undefined = frame; f; f = f.parent) {
        if (f === itrf) {
          return EARTH;
        }
        if (f === moonMe) {
          return MOON;
        }
      }
      return undefined;
    },
    data,
  };
}
