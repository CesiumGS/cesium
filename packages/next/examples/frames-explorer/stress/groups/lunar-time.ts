// Lunar time: how much faster a clock on the Moon ticks than one on the
// Earth (space policy), against Ashby & Patla (2024).
import { type Frame, frameTransform } from "../../../../src/frames/Frame.ts";
import { properTimeRate } from "../../../../src/measure/doppler.ts";
import { Instant } from "../../../../src/time/Instant.ts";
import {
  citation,
  cited,
  onEarth,
  printed,
  sexagesimal,
  type NgsMark,
} from "../references.ts";
import { type StressCase, fmt } from "../runner.ts";
import { EFFECT, apply, stressCase, utc } from "../shared.ts";

/** One sample an hour (the plan's), s. */
const STEP = 3600;

/** The sidereal and synodic months, days (the Moon's mean orbital periods). */
const SIDEREAL_MONTH = 27.321661;

const SYNODIC_MONTH = 29.530589;

const START = "2026-01-01T00:00:00";

const DAY = 86_400;

const MICRO = 1e6;

const lunarTimeCase = stressCase(
  "lunar-time.moon-vs-earth",
  "lunar-time",
  "A clock on the lunar surface at the south pole against one at h = 0 at the California datasheet point: properTimeRate sampled hourly and averaged over a lunar month, in µs/day, against Ashby & Patla (2024)'s 56.02 µs/day within 2% (which covers the point-mass potentials)",
  [],
  async (ctx, base) => {
    const f = ctx.frames;
    const published = cited<{ rate: string }>("ashby-patla-2024");
    const expected = printed(published.rate.split(" ")[0]!).value;
    const radius =
      printed(cited<{ radiusKm: string }>("naif-moon-radius").radiusKm).value *
      1000;
    const mark = cited<NgsMark>("ngs-GU2195");
    const california = onEarth(
      sexagesimal(mark.longitude).value,
      sexagesimal(mark.latitude).value,
      0,
    );
    const pole = [0, 0, -radius];
    // Barycentric (ICRF) position and velocity of a point fixed in a frame:
    // the central difference over ±0.5 s, two transforms per sample.
    const position = new Float64Array(3);
    const velocity = new Float64Array(3);
    const state = (frame: Frame, p: ArrayLike<number>, tdb: number) => {
      const a = apply(
        frameTransform(frame, f.icrf, Instant.fromTdb(tdb - 0.5)),
        p,
      );
      const b = apply(
        frameTransform(frame, f.icrf, Instant.fromTdb(tdb + 0.5)),
        p,
      );
      for (let i = 0; i < 3; i++) {
        position[i] = (a[i]! + b[i]!) / 2;
        velocity[i] = b[i]! - a[i]!;
      }
    };
    const t0 = utc(ctx, START).tdb();
    const sidereal = Math.round((SIDEREAL_MONTH * DAY) / STEP);
    const synodic = Math.round((SYNODIC_MONTH * DAY) / STEP);
    let sum = 0;
    let siderealSum = 0;
    for (let i = 0; i < synodic; i++) {
      const tdb = t0 + i * STEP;
      const instant = Instant.fromTdb(tdb);
      state(f.moonMe, pole, tdb);
      const moon = properTimeRate(position, velocity, instant, f);
      state(f.itrf, california, tdb);
      const earth = properTimeRate(position, velocity, instant, f);
      sum += moon - earth;
      if (i < sidereal) {
        siderealSum += moon - earth;
      }
    }
    const rate = (sum / synodic) * DAY * MICRO;
    const siderealRate = (siderealSum / sidereal) * DAY * MICRO;
    return [
      {
        ...base,
        id: `${base.id}.synodic`,
        source: citation("ashby-patla-2024"),
        title: `Averaged over a synodic month (${SYNODIC_MONTH} days from ${START} UTC, ${synodic} hourly samples): the lunar clock gains on the Earth clock, against Ashby & Patla's ${published.rate}, within 2%`,
        pass: rate > 0,
        value: Math.abs(rate / expected - 1),
        tolerance: EFFECT,
        detail: `library ${fmt(rate, 6)} µs/day; Ashby & Patla ${published.rate} (selenoid against geoid)`,
        effect: {
          value: rate,
          unit: "µs/day",
          label: "how much faster a clock on the Moon ticks",
        },
        instant: t0,
      },
      {
        ...base,
        id: `${base.id}.sidereal`,
        source: citation("ashby-patla-2024"),
        title: `The same average over a sidereal month (${SIDEREAL_MONTH} days, ${sidereal} samples), shown, not judged: the Sun's tide and the Earth–Moon system's orbital motion vary with the synodic month, so a sidereal window leaves part of a cycle in the mean`,
        pass: true,
        displayOnly: true,
        detail: `${fmt(siderealRate, 6)} µs/day, ${fmt((siderealRate / expected - 1) * 100, 3)}% from Ashby & Patla; it moves with the window's start (56.6 to 58.1 µs/day for starts in 2026)`,
        effect: {
          value: siderealRate,
          unit: "µs/day",
          label: "the lunar clock's gain averaged over a sidereal month",
        },
        instant: t0,
      },
    ];
  },
);

export const lunarTimeCases: readonly StressCase[] = [lunarTimeCase];
