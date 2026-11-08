import {
  MOON_PA_TO_ME,
  frameRotation,
  multiply3 as multiply,
} from "../frames/lunarConstants.ts";
import { Instant } from "../time/Instant.ts";
import { chebyshev } from "./chebyshev.ts";
import { readPack, type PackSegment } from "./pack.ts";

export { MOON_PA_TO_ME };

/** Earth/Moon mass ratio of DE440 (EMRAT, from the header constants). */
export const EMRAT = 81.300568221497215;

/** An ISO time to the second for a TDB time, treating TT as UTC + 69.184 s (messages only). */
function iso(tdb: number): string {
  if (!Number.isFinite(tdb)) {
    return String(tdb);
  }
  const ms = 946_728_000_000 + (Instant.fromTt(tdb).tt - 69.184) * 1000;
  return `${new Date(ms).toISOString().slice(0, 19)}Z`;
}

interface Located {
  segment: PackSegment;
  records: Float64Array;
}

/**
 * The Sun, the Earth-Moon barycenter, the Earth and the Moon from JPL's DE440,
 * and the Moon's orientation from the lunar PCK, read from the packs
 * `npm run setup` writes (src/ephemeris/pack.ts). Positions are meters and
 * velocities m/s in ICRF, relative to the solar system barycenter, as
 * `[x, y, z, vx, vy, vz]`.
 *
 * An instant outside the loaded span throws; nothing is extrapolated.
 */
export class Ephemeris {
  /** The span all loaded segments cover, TDB seconds past J2000. */
  readonly span: [number, number];
  private readonly sunSegment: Located;
  private readonly embSegment: Located;
  private readonly moonSegment: Located;
  private readonly paSegment: Located;
  private readonly scratch = new Float64Array(6);
  private readonly scratch2 = new Float64Array(6);
  private readonly euler = new Float64Array(6);
  private readonly rotation = new Float64Array(9);
  private readonly rotation2 = new Float64Array(9);

  private constructor(sun: Located, emb: Located, moon: Located, pa: Located) {
    this.sunSegment = sun;
    this.embSegment = emb;
    this.moonSegment = moon;
    this.paSegment = pa;
    const all = [sun, emb, moon, pa].map((l) => l.segment);
    this.span = [
      Math.max(...all.map((s) => s.start)),
      Math.min(...all.map((s) => s.end)),
    ];
  }

  /** From the planets pack (sun, emb, moon) and the lunar orientation pack (moonPa). */
  static fromPacks(planets: ArrayBuffer, moon: ArrayBuffer): Ephemeris {
    const find = (pack: ReturnType<typeof readPack>, name: string): Located => {
      // Setup names a segment split in the source `name`, `name#2`, ...;
      // reading across pieces is not implemented, so refuse rather than
      // silently use the first piece's shorter span.
      const pieces = pack.manifest.segments
        .map((s) => s.name)
        .filter((n) => n === name || n.startsWith(`${name}#`));
      if (pieces.length > 1) {
        throw new Error(
          `ephemeris: the pack splits "${name}" into pieces (${pieces.join(", ")}); multi-piece segments are not supported yet`,
        );
      }
      const segment = pack.manifest.segments.find((s) => s.name === name);
      if (!segment) {
        throw new Error(`ephemeris: the pack has no "${name}" segment`);
      }
      return {
        segment,
        records: pack.data.subarray(
          segment.offset,
          segment.offset + segment.count * segment.recordSize,
        ),
      };
    };
    const planetPack = readPack(planets);
    const moonPack = readPack(moon);
    return new Ephemeris(
      find(planetPack, "sun"),
      find(planetPack, "emb"),
      find(planetPack, "moon"),
      find(moonPack, "moonPa"),
    );
  }

  /** Whether the instant lies inside `span`, so the other methods will not throw for it. */
  contains(instant: Instant): boolean {
    const tdb = instant.tdb();
    return tdb >= this.span[0] && tdb <= this.span[1];
  }

  /** The Sun's center. */
  sun(instant: Instant, out: Float64Array = new Float64Array(6)): Float64Array {
    return this.state(this.sunSegment, instant, out);
  }

  /** The Earth-Moon barycenter. */
  earthMoonBarycenter(
    instant: Instant,
    out: Float64Array = new Float64Array(6),
  ): Float64Array {
    return this.state(this.embSegment, instant, out);
  }

  /**
   * The Earth's center. DE440's 301/3 segment is the Moon relative to the
   * barycenter, and EMB = (EMRAT * Earth + Moon) / (EMRAT + 1), so
   * Earth = EMB - (Moon - EMB) / EMRAT.
   */
  earth(
    instant: Instant,
    out: Float64Array = new Float64Array(6),
  ): Float64Array {
    const tdb = this.checked(instant);
    const emb = chebyshev(
      this.embSegment.records,
      this.embSegment.segment.recordSize,
      this.embSegment.segment.init,
      this.embSegment.segment.intervalLength,
      tdb,
      this.scratch,
    );
    const m = this.moonWrtEmb(tdb);
    for (let i = 0; i < 6; i++) {
      out[i] = (emb[i]! - m[i]! / EMRAT) * 1000;
    }
    return out;
  }

  /** The Moon's center. */
  moon(
    instant: Instant,
    out: Float64Array = new Float64Array(6),
  ): Float64Array {
    const tdb = this.checked(instant);
    const emb = chebyshev(
      this.embSegment.records,
      this.embSegment.segment.recordSize,
      this.embSegment.segment.init,
      this.embSegment.segment.intervalLength,
      tdb,
      this.scratch,
    );
    const m = this.moonWrtEmb(tdb);
    for (let i = 0; i < 6; i++) {
      out[i] = (emb[i]! + m[i]!) * 1000;
    }
    return out;
  }

  /** The Moon relative to the Earth: (Moon - EMB) * (1 + EMRAT) / EMRAT. */
  moonFromEarth(
    instant: Instant,
    out: Float64Array = new Float64Array(6),
  ): Float64Array {
    const m = this.moonWrtEmb(this.checked(instant));
    const k = (1000 * (1 + EMRAT)) / EMRAT;
    for (let i = 0; i < 6; i++) {
      out[i] = m[i]! * k;
    }
    return out;
  }

  /**
   * The PCK's Euler angles `[phi, theta, psi]` in radians (and their rates per
   * second in `out[3..5]`), as stored: psi is not wrapped and runs to thousands
   * of radians over the span.
   */
  moonEulerAngles(
    instant: Instant,
    out: Float64Array = new Float64Array(6),
  ): Float64Array {
    const tdb = this.checked(instant);
    const { segment, records } = this.paSegment;
    return chebyshev(
      records,
      segment.recordSize,
      segment.init,
      segment.intervalLength,
      tdb,
      out,
    );
  }

  /**
   * The rotation from ICRF to the Moon's principal axes (MOON_PA_DE440),
   * row-major: `pa = M * icrf`. The PCK stores the Euler angles (phi, theta,
   * psi) with `M = [psi]3 [theta]1 [phi]3` (rotations of the axes), as
   * NAIF's PCK Required Reading defines them.
   */
  moonPrincipalAxes(
    instant: Instant,
    out: Float64Array = new Float64Array(9),
  ): Float64Array {
    const e = this.moonEulerAngles(instant, this.euler);
    const t = this.rotation;
    multiply(frameRotation(1, e[1]!), frameRotation(3, e[0]!), t);
    return multiply(frameRotation(3, e[2]!), t, out);
  }

  /** The rotation from ICRF to the mean Earth / polar axes: `MOON_PA_TO_ME * moonPrincipalAxes`. */
  moonMeanEarth(
    instant: Instant,
    out: Float64Array = new Float64Array(9),
  ): Float64Array {
    const pa = this.moonPrincipalAxes(instant, this.rotation2);
    return multiply(MOON_PA_TO_ME, pa, out);
  }

  private state(
    located: Located,
    instant: Instant,
    out: Float64Array,
  ): Float64Array {
    const tdb = this.checked(instant);
    const { segment, records } = located;
    chebyshev(
      records,
      segment.recordSize,
      segment.init,
      segment.intervalLength,
      tdb,
      out,
    );
    for (let i = 0; i < 6; i++) {
      out[i] = out[i]! * 1000;
    }
    return out;
  }

  private moonWrtEmb(tdb: number): Float64Array {
    const { segment, records } = this.moonSegment;
    return chebyshev(
      records,
      segment.recordSize,
      segment.init,
      segment.intervalLength,
      tdb,
      this.scratch2,
    );
  }

  /** The instant's TDB seconds, or an error when it lies outside the span. */
  private checked(instant: Instant): number {
    const tdb = instant.tdb();
    // As contains(), without evaluating TDB - TT a second time.
    if (!(tdb >= this.span[0] && tdb <= this.span[1])) {
      throw new Error(
        `ephemeris: ${iso(tdb)} is outside the loaded span ${iso(this.span[0])}–${iso(this.span[1])} (npm run setup -- --frames-span)`,
      );
    }
    return tdb;
  }
}
