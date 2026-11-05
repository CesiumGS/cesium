const DAY_MS = 86_400_000;
/** The modified Julian date of 1970-01-01 (the Unix epoch). */
const MJD_OF_UNIX_EPOCH = 40_587;

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/**
 * The leap-second table: TAI-UTC as a step function of UTC. Built from the
 * IERS `Leap_Second.dat` (Bulletin C) because the table is only valid until
 * the file's expiry date, after which a new leap second may have been
 * announced; `expires` lets callers notice that instead of silently drifting
 * by a second.
 */
export class LeapSeconds {
  /** UTC ms at which the table stops being authoritative. */
  readonly expires: number;
  readonly #starts: Float64Array;
  readonly #offsets: Float64Array;

  private constructor(
    starts: Float64Array,
    offsets: Float64Array,
    expires: number,
  ) {
    this.#starts = starts;
    this.#offsets = offsets;
    this.expires = expires;
  }

  /**
   * Parse `Leap_Second.dat`. Data lines are `MJD day month year TAI-UTC`;
   * the `#File expires on <d> <Month> <yyyy>` comment gives the expiry.
   */
  static fromIers(text: string): LeapSeconds {
    const rows: [number, number][] = [];
    let expires = Number.NaN;
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (line.startsWith("#")) {
        const m = /file expires on\s+(\d+)\s+([A-Za-z]+)\s+(\d{4})/i.exec(line);
        if (m !== null) {
          const month = MONTHS.indexOf(m[2]!.toLowerCase());
          if (month >= 0) {
            expires = Date.UTC(Number(m[3]), month, Number(m[1]));
          }
        }
        continue;
      }
      const f = line.split(/\s+/);
      if (f.length < 5) {
        continue;
      }
      const mjd = Number(f[0]);
      const offset = Number(f[4]);
      if (!Number.isFinite(mjd) || !Number.isFinite(offset)) {
        continue;
      }
      rows.push([(mjd - MJD_OF_UNIX_EPOCH) * DAY_MS, offset]);
    }
    if (rows.length === 0) {
      throw new Error("Leap_Second.dat has no data rows");
    }
    if (Number.isNaN(expires)) {
      throw new Error("Leap_Second.dat has no '#File expires on' line");
    }
    rows.sort((a, b) => a[0] - b[0]);
    return new LeapSeconds(
      Float64Array.from(rows, (r) => r[0]),
      Float64Array.from(rows, (r) => r[1]),
      expires,
    );
  }

  /**
   * TAI-UTC in seconds at a UTC time (ms since 1970). Before the first
   * entry (1972) it returns the first value; the pre-1972 rubber seconds are
   * out of scope.
   */
  taiMinusUtc(utcMs: number): number {
    const s = this.#starts;
    let lo = 0;
    let hi = s.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (s[mid]! <= utcMs) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    return this.#offsets[lo]!;
  }

  /**
   * TAI-UTC in seconds at a TAI time, given as `taiMs`: TAI milliseconds on
   * the same scale as UTC ms since 1970 (a UTC ms plus 1000 * TAI-UTC). Unlike
   * `taiMinusUtc` it is exact inside a leap second, where UTC ms cannot name
   * the instant: a step row applies from its own TAI start, `start + 1000 *
   * offset`, so the second 23:59:60 still reads the old offset.
   */
  taiMinusUtcAtTai(taiMs: number): number {
    const s = this.#starts;
    const o = this.#offsets;
    let lo = 0;
    let hi = s.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (s[mid]! + o[mid]! * 1000 <= taiMs) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    return o[lo]!;
  }

  /** Whether the table is past its expiry at a UTC time. */
  isExpired(utcMs: number): boolean {
    return utcMs > this.expires;
  }
}
