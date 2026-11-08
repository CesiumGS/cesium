import type { FrameData } from "../ephemeris/loadFrameData.ts";
import { EARTH, MOON, type Body } from "../scene/Body.ts";
import { EME2000_TO_PARENT, MOON_PA_TO_PARENT } from "./analytic.ts";
import {
  bodyEdge,
  gcrfEdge,
  itrfAccuracy,
  itrfEdge,
  moonMeEdge,
} from "./edges.ts";
import { Frame } from "./Frame.ts";
import { BUILT_IN_ACCURACY } from "./frameAccuracy.ts";

export { BUILT_IN_ACCURACY, DE440_EARTH_MOON_METERS } from "./frameAccuracy.ts";

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

/** The built-in frame tree over loaded frames data. */
export function createFrames(data: FrameData): Frames {
  const icrf = Frame.root("ICRF");
  const atBody = <N extends "HCRS" | "EARTH_ICRF" | "MOON_ICRF">(name: N) =>
    new Frame(name, icrf, bodyEdge(name, data), {
      accuracy: BUILT_IN_ACCURACY[name],
    });
  const hcrs = atBody("HCRS");
  const earthIcrf = atBody("EARTH_ICRF");
  const moonIcrf = atBody("MOON_ICRF");
  const gcrf = new Frame("GCRF", icrf, gcrfEdge(data), {
    accuracy: BUILT_IN_ACCURACY.GCRF,
  });
  const eme2000 = Frame.constant("EME2000", earthIcrf, EME2000_TO_PARENT, {
    accuracy: BUILT_IN_ACCURACY.EME2000,
  });
  const itrf = new Frame("ITRF", gcrf, itrfEdge(data), {
    accuracy: (instant) => itrfAccuracy(data, instant),
  });
  const moonMe = new Frame("MOON_ME", moonIcrf, moonMeEdge(data), {
    accuracy: BUILT_IN_ACCURACY.MOON_ME,
  });
  const moonPa = Frame.constant("MOON_PA", moonMe, MOON_PA_TO_PARENT, {
    accuracy: BUILT_IN_ACCURACY.MOON_PA,
  });

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
