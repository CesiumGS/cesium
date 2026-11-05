import { tdbMinusTt } from "./erfa/dtdb.ts";
import type { LeapSeconds } from "./leapSeconds.ts";

/** Unix ms of 2000-01-01T12:00:00, J2000 read as if TT were UTC-labelled. */
const J2000_UNIX_MS = 946_728_000_000;
/** TT - TAI, seconds (fixed by definition). */
const TT_MINUS_TAI = 32.184;
const JD_J2000 = 2_451_545.0;

/**
 * A point in time on the TT scale, stored as TT seconds past J2000
 * (JD 2451545.0 TT). Ephemerides and Earth orientation are defined in
 * uniform time scales, while `Clock` keeps UTC milliseconds, which jump at
 * leap seconds; `Instant` is the uniform value those models take.
 */
export class Instant {
  readonly tt: number;

  // A plain field, not a parameter property: scripts/frameData.mjs imports
  // this file under Node's type stripping, which rejects those.
  private constructor(tt: number) {
    this.tt = tt;
  }

  /**
   * From UTC milliseconds since 1970. The integer ms subtraction comes
   * first so the large epoch offset does not cost precision.
   */
  static fromUtc(utcMs: number, leap: LeapSeconds): Instant {
    return new Instant(
      (utcMs - J2000_UNIX_MS) / 1000 + leap.taiMinusUtc(utcMs) + TT_MINUS_TAI,
    );
  }

  /** From TT seconds past J2000. */
  static fromTt(tt: number): Instant {
    return new Instant(tt);
  }

  /**
   * To UTC milliseconds since 1970, rounded to the millisecond. TAI-UTC
   * depends on UTC, so it is evaluated at a first guess and again at the
   * result, which settles a time next to a leap-second boundary.
   */
  toUtc(leap: LeapSeconds): number {
    const tai = this.tai();
    let utc = J2000_UNIX_MS + (tai - leap.taiMinusUtc(J2000_UNIX_MS)) * 1000;
    utc = J2000_UNIX_MS + (tai - leap.taiMinusUtc(utc)) * 1000;
    utc = J2000_UNIX_MS + (tai - leap.taiMinusUtc(utc)) * 1000;
    return Math.round(utc);
  }

  /** TAI seconds past J2000 (TT - 32.184 s). */
  tai(): number {
    return this.tt - TT_MINUS_TAI;
  }

  /** Two-part Julian date (TT) for ERFA-style calls: `[2451545.0, days]`. */
  jdTt(): [number, number] {
    return [JD_J2000, this.tt / 86_400];
  }

  /**
   * TDB seconds past J2000, which is SPICE's ephemeris time (ET). TDB - TT
   * is the geocentric ERFA series, about 1.7 ms at most.
   */
  tdb(): number {
    return this.tt + tdbMinusTt(...this.jdTt());
  }
}
