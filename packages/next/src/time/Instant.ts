import { tdbMinusTt } from "./erfa/dtdb.ts";
import type { LeapSeconds } from "./leapSeconds.ts";

/** Unix ms of 2000-01-01T12:00:00, J2000 read as if TT were UTC-labelled. */
const J2000_UNIX_MS = 946_728_000_000;
/** TT - TAI, seconds (fixed by definition). */
const TT_MINUS_TAI = 32.184;
const JD_J2000 = 2_451_545.0;
const DAY_MS = 86_400_000;
const ISO_PATTERN =
  /^(\d{4})-(?:(\d{2})-(\d{2})|(\d{3}))T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?Z?$/;

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
   * From TDB seconds past J2000 (SPICE's ET), inverting `tdb()`: Newton
   * steps on TT (TDB - TT is below 2 ms and its rate below 1e-9, so three
   * converge), then a search of the float64 neighbours of TT for the one
   * whose `tdb()` is nearest `et`. The result's `tdb()` is `et` exactly or
   * within an ulp: TT and TDB share a binade nearly everywhere, but not every
   * TDB is reachable from some TT.
   */
  static fromTdb(et: number): Instant {
    let tt = et;
    for (let i = 0; i < 3; i++) {
      tt += et - new Instant(tt).tdb();
    }
    if (!Number.isFinite(tt)) {
      return new Instant(tt);
    }
    const ulp = 2 ** (Math.floor(Math.log2(Math.abs(tt) || 1)) - 52);
    let best = tt;
    let bestError = Math.abs(new Instant(tt).tdb() - et);
    for (let k = -4; k <= 4 && bestError > 0; k++) {
      const candidate = tt + k * ulp;
      const error = Math.abs(new Instant(candidate).tdb() - et);
      if (error < bestError) {
        best = candidate;
        bestError = error;
      }
    }
    return new Instant(best);
  }

  /**
   * From an ISO 8601 style time tag, `YYYY-MM-DDThh:mm:ss[.f...]` or the
   * day-of-year form `YYYY-DDDThh:mm:ss[.f...]`, with an optional trailing
   * `Z`, read in the given time scale. Every fraction digit counts: it is
   * parsed as a decimal, not through `Date`.
   *
   * For UTC the calendar is UTC, and second 60 is accepted only at the end of
   * a day that ends with an inserted leap second per `leap`. For TAI, TT and
   * TDB the calendar is a plain count of days and seconds from J2000 in that
   * scale, with no leap seconds, so `2000-01-01T12:00:00` in TT is TT 0.
   */
  static fromIso(
    text: string,
    scale: "UTC" | "TAI" | "TT" | "TDB",
    leap: LeapSeconds,
  ): Instant {
    const m = ISO_PATTERN.exec(text.trim());
    if (m === null) {
      throw new Error(`Invalid ISO time "${text}"`);
    }
    const year = Number(m[1]);
    const hour = Number(m[5]);
    const minute = Number(m[6]);
    const second = Number(m[7]);
    const fraction = m[8] === undefined ? 0 : Number(`0.${m[8]}`);
    let month = 0;
    let day: number;
    if (m[4] === undefined) {
      month = Number(m[2]) - 1;
      day = Number(m[3]);
      if (month < 0 || month > 11) {
        throw new Error(`Invalid month in ISO time "${text}"`);
      }
      const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      if (day < 1 || day > daysInMonth) {
        throw new Error(`Invalid date in ISO time "${text}"`);
      }
    } else {
      const doy = Number(m[4]);
      const daysInYear = new Date(Date.UTC(year + 1, 0, 1)).getTime();
      const yearStart = Date.UTC(year, 0, 1);
      if (doy < 1 || doy > (daysInYear - yearStart) / DAY_MS) {
        throw new Error(`Invalid day of year in ISO time "${text}"`);
      }
      day = doy; // Date.UTC rolls the day of month over into later months.
    }
    if (hour > 23 || minute > 59 || second > 60) {
      throw new Error(`Invalid time of day in ISO time "${text}"`);
    }
    const dayMs = Date.UTC(year, month, day);
    const wholeMs =
      dayMs + ((hour * 60 + minute) * 60 + Math.min(second, 59)) * 1000;
    if (scale === "UTC") {
      let extra = fraction;
      if (second === 60) {
        const next = dayMs + DAY_MS;
        const inserted =
          hour === 23 &&
          minute === 59 &&
          leap.taiMinusUtc(next) - leap.taiMinusUtc(next - 1000) === 1;
        if (!inserted) {
          throw new Error(`No leap second at the end of the day in "${text}"`);
        }
        extra += 1;
      }
      return new Instant(Instant.fromUtc(wholeMs, leap).tt + extra);
    }
    if (second === 60) {
      throw new Error(`Second 60 is only valid in UTC: "${text}"`);
    }
    const seconds = (wholeMs - J2000_UNIX_MS) / 1000 + fraction;
    switch (scale) {
      case "TT":
        return new Instant(seconds);
      case "TAI":
        return new Instant(seconds + TT_MINUS_TAI);
      case "TDB":
        return Instant.fromTdb(seconds);
    }
  }

  /**
   * To UTC milliseconds since 1970, rounded to the millisecond. TAI-UTC is
   * read at the TAI instant itself (`taiMinusUtcAtTai`), so the result is
   * exact and never decreases. TAI is rounded to the millisecond first: TAI-UTC
   * is whole seconds, so that rounds UTC the same way, and the step test below
   * is then exact rather than at the mercy of a few-ulp error at the boundary.
   * UTC ms cannot name the inserted second 23:59:60, so inside it the result
   * holds at 23:59:59.999, the last millisecond before the step.
   */
  toUtc(leap: LeapSeconds): number {
    const taiMs = Math.round(J2000_UNIX_MS + this.tai() * 1000);
    const dat = leap.taiMinusUtcAtTai(taiMs);
    const utc = taiMs - 1000 * dat;
    if (leap.taiMinusUtc(utc) !== dat) {
      // Inside an inserted second: `utc` already reads the next day. Leap
      // seconds end a UTC day, so the step is at the day boundary.
      return Math.floor(utc / DAY_MS) * DAY_MS - 1;
    }
    return utc;
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
