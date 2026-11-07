// The Earth-orientation sigma (R7): what the GCRF to ITRF edge can claim at
// an instant, from the EOP table's measured or predicted rows. Here so the
// built-in frame tree states it on its ITRF edge (frames.ts) and
// `accuracyOf` scales it to metres (measure/accuracy.ts) from one source.
import type { FrameData } from "../ephemeris/loadFrameData.ts";
import type { Instant } from "../time/Instant.ts";

const ARCSEC_TO_RAD = Math.PI / (180 * 3600);
const MS_PER_DAY = 86_400_000;
/** Measured UT1 - UTC, s (spec section 4). */
const UT1_MEASURED_S = 35e-6;
/** Measured polar motion, arcsec: 0.1 mas, a conservative call. */
const POLAR_MEASURED_ARCSEC = 1e-4;

/** The Earth-orientation sigma at an instant, or why it is not known. */
export type EarthOrientationSigma =
  | { degraded: true; span: string }
  | {
      degraded: false;
      /** 1σ UT1 - UTC, s. */
      ut1Seconds: number;
      /** 1σ polar motion, rad. */
      polarRadians: number;
      predicted: boolean;
      /** Days past the table's last observed row (0 when measured). */
      ageDays: number;
    };

/**
 * The Earth-orientation sigmas at `instant`: measured UT1 35 µs and polar
 * motion 0.1 mas; a predicted sample grows with its age `d` in days past the
 * last observed row by IERS Bulletin A (polar 0.00068 · d^0.80 arcsec, UT1
 * 0.00025 · d^0.75 s), never below the measured values. `degraded` when the
 * instant is outside the EOP table (`span` is the table's ISO UTC range).
 */
export function earthOrientationSigma(
  frames: { readonly data: Pick<FrameData, "eop" | "leapSeconds"> },
  instant: Instant,
): EarthOrientationSigma {
  const { eop, leapSeconds } = frames.data;
  const sample = eop.atInstant(instant, leapSeconds);
  if (sample.degraded) {
    const iso = (ms: number): string => new Date(ms).toISOString();
    return { degraded: true, span: `${iso(eop.first)} to ${iso(eop.last)}` };
  }
  let ut1Seconds = UT1_MEASURED_S;
  let polarRadians = POLAR_MEASURED_ARCSEC * ARCSEC_TO_RAD;
  let ageDays = 0;
  if (sample.predicted) {
    ageDays = Math.max(
      0,
      (instant.toUtc(leapSeconds) - eop.lastObserved) / MS_PER_DAY,
    );
    ut1Seconds = Math.max(ut1Seconds, 0.00025 * ageDays ** 0.75);
    polarRadians = Math.max(
      polarRadians,
      0.00068 * ageDays ** 0.8 * ARCSEC_TO_RAD,
    );
  }
  return {
    degraded: false,
    ut1Seconds,
    polarRadians,
    predicted: sample.predicted,
    ageDays,
  };
}
