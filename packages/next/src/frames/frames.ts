import { MOON_PA_TO_ME } from "../ephemeris/Ephemeris.ts";
import type { FrameData } from "../ephemeris/loadFrameData.ts";
import type { Body } from "../scene/Body.ts";
import { celestialToTerrestrial } from "../time/earthOrientation.ts";
import { frameBias } from "../time/erfa/bias.ts";
import { Frame } from "./Frame.ts";
import { toParentMatrix } from "./matrix.ts";

/**
 * The built-in frame tree, from `createFrames`. Positions only (R11), and
 * Newtonian: the GCRF origin is the Earth's barycentric position with no
 * TT/TDB scaling or Lorentz term (R2). Frame transforms throw outside the
 * ephemeris span (R3); the ITRF edge also throws past the EOP table's
 * predictions, where UT1 would otherwise drift silently.
 */
export interface Frames {
  /** The International Celestial Reference Frame, the root. */
  readonly icrf: Frame<"ICRF">;
  /** The Sun's center, ICRF axes. */
  readonly hcrs: Frame<"HCRS">;
  /** The Earth's center, ICRF axes. */
  readonly gcrf: Frame<"GCRF">;
  /** The Earth's center, mean equator and equinox of J2000 (GCRF rotated by the frame bias). */
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
  /** The data the tree reads. */
  readonly data: FrameData;
}

const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1];

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
  const gcrf = atBody("GCRF", (i, o) => ephemeris.earth(i, o))();
  const moonIcrf = atBody("MOON_ICRF", (i, o) => ephemeris.moon(i, o))();

  const eme2000 = Frame.constant(
    "EME2000",
    gcrf,
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
    data,
  };
}
