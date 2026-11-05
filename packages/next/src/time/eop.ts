const ARCSEC_TO_RAD = Math.PI / (180 * 3600);
const MS_PER_DAY = 86_400_000;
/** MJD of the Unix epoch (1970-01-01). */
const MJD_UNIX_EPOCH = 40_587;

/** Earth orientation values at one instant, in radians and seconds. */
export interface EopSample {
  /** UT1 - UTC, seconds. */
  ut1MinusUtc: number;
  /** Polar motion, radians. */
  xp: number;
  yp: number;
  /** Celestial pole offsets, radians. */
  dX: number;
  dY: number;
  /** The nearest tabulated row is a prediction, not a measurement. */
  predicted: boolean;
  /** The instant is outside the table, so the values are held or zero. */
  degraded: boolean;
}

/**
 * Earth orientation parameters from CelesTrak's `EOP-All.csv`, with 4-point
 * Lagrange interpolation between daily rows.
 */
export class EarthOrientationParameters {
  /** First tabulated instant, UTC ms. */
  readonly first: number;
  /** Last tabulated instant, UTC ms. */
  readonly last: number;

  private constructor(
    private readonly mjd: Float64Array,
    private readonly x: Float64Array, // arcsec
    private readonly y: Float64Array, // arcsec
    private readonly dx: Float64Array, // arcsec
    private readonly dy: Float64Array, // arcsec
    private readonly ut1Tai: Float64Array, // UT1-UTC - DAT, s
    private readonly dat: Float64Array, // TAI-UTC, s
    private readonly predictedRow: Uint8Array,
  ) {
    this.first = (mjd[0]! - MJD_UNIX_EPOCH) * MS_PER_DAY;
    this.last = (mjd[mjd.length - 1]! - MJD_UNIX_EPOCH) * MS_PER_DAY;
  }

  /** Parse by header name, so column order does not matter. */
  static fromCelestrakCsv(text: string): EarthOrientationParameters {
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (lines.length < 2) {
      throw new Error("EOP CSV has no data rows");
    }
    const header = lines[0]!.split(",").map((h) => h.trim());
    const col = (name: string): number => {
      const i = header.indexOf(name);
      if (i < 0) {
        throw new Error(`EOP CSV is missing column ${name}`);
      }
      return i;
    };
    const cMjd = col("MJD");
    const cX = col("X");
    const cY = col("Y");
    const cUt = col("UT1-UTC");
    const cDx = col("DX");
    const cDy = col("DY");
    const cDat = col("DAT");
    const cType = col("DATA_TYPE");

    const rows = lines.slice(1).map((line) => {
      const f = line.split(",").map((s) => s.trim());
      const num = (i: number): number => {
        // Empty cells (e.g. DX/DY on some rows) mean no offset.
        const v = f[i]! === "" ? 0 : Number(f[i]!);
        if (!Number.isFinite(v)) {
          throw new Error(`EOP CSV has a bad number: ${f[i]!}`);
        }
        return v;
      };
      return {
        mjd: num(cMjd),
        x: num(cX),
        y: num(cY),
        ut: num(cUt),
        dx: num(cDx),
        dy: num(cDy),
        dat: num(cDat),
        predicted: f[cType]! === "P",
      };
    });
    rows.sort((a, b) => a.mjd - b.mjd);

    return new EarthOrientationParameters(
      Float64Array.from(rows, (r) => r.mjd),
      Float64Array.from(rows, (r) => r.x),
      Float64Array.from(rows, (r) => r.y),
      Float64Array.from(rows, (r) => r.dx),
      Float64Array.from(rows, (r) => r.dy),
      Float64Array.from(rows, (r) => r.ut - r.dat),
      Float64Array.from(rows, (r) => r.dat),
      Uint8Array.from(rows, (r) => (r.predicted ? 1 : 0)),
    );
  }

  /** Earth orientation at a UTC instant (ms since 1970). */
  at(utcMs: number): EopSample {
    const mjd = utcMs / MS_PER_DAY + MJD_UNIX_EPOCH;
    const n = this.mjd.length;
    if (mjd < this.mjd[0]!) {
      return {
        ut1MinusUtc: 0,
        xp: 0,
        yp: 0,
        dX: 0,
        dY: 0,
        predicted: false,
        degraded: true,
      };
    }
    if (mjd >= this.mjd[n - 1]!) {
      const k = n - 1;
      return this.row(k, mjd > this.mjd[k]!);
    }

    // Row at or before the instant.
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (this.mjd[mid]! <= mjd) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    if (mjd === this.mjd[lo]!) {
      return this.row(lo, false);
    }

    // Four points around the interval, shifted inward at the table edges.
    const start = Math.max(0, Math.min(lo - 1, n - 4));
    const count = Math.min(4, n);
    const w = lagrangeWeights(this.mjd, start, count, mjd);
    const dot = (v: Float64Array): number => {
      let s = 0;
      for (let i = 0; i < count; i++) {
        s += w[i]! * v[start + i]!;
      }
      return s;
    };
    return {
      // UT1-TAI is continuous across leap seconds; add back the DAT of the day.
      ut1MinusUtc: dot(this.ut1Tai) + this.dat[lo]!,
      xp: dot(this.x) * ARCSEC_TO_RAD,
      yp: dot(this.y) * ARCSEC_TO_RAD,
      dX: dot(this.dx) * ARCSEC_TO_RAD,
      dY: dot(this.dy) * ARCSEC_TO_RAD,
      predicted:
        this.predictedRow[lo]! === 1 || this.predictedRow[lo + 1]! === 1,
      degraded: false,
    };
  }

  private row(k: number, degraded: boolean): EopSample {
    return {
      ut1MinusUtc: this.ut1Tai[k]! + this.dat[k]!,
      xp: this.x[k]! * ARCSEC_TO_RAD,
      yp: this.y[k]! * ARCSEC_TO_RAD,
      dX: this.dx[k]! * ARCSEC_TO_RAD,
      dY: this.dy[k]! * ARCSEC_TO_RAD,
      predicted: this.predictedRow[k]! === 1,
      degraded,
    };
  }
}

function lagrangeWeights(
  xs: Float64Array,
  start: number,
  count: number,
  x: number,
): number[] {
  const w: number[] = [];
  for (let i = 0; i < count; i++) {
    let p = 1;
    for (let j = 0; j < count; j++) {
      if (j !== i) {
        p *= (x - xs[start + j]!) / (xs[start + i]! - xs[start + j]!);
      }
    }
    w.push(p);
  }
  return w;
}
