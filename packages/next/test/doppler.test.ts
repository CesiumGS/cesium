import { describe, expect, it } from "vitest";
import type { Ephemeris } from "../src/ephemeris/Ephemeris.ts";
import { Frame } from "../src/frames/Frame.ts";
import { createFrames } from "../src/frames/frames.ts";
import { framePoint } from "../src/frames/local.ts";
import { toParentMatrix } from "../src/frames/matrix.ts";
import { C, GM_EARTH, GM_MOON, GM_SUN } from "../src/measure/constants.ts";
import { downlink, properTimeRate, uplink } from "../src/measure/doppler.ts";
import { solveLightTime } from "../src/measure/lightTime.ts";
import { velocityIn } from "../src/measure/motion.ts";
import { Instant } from "../src/time/Instant.ts";
import { syntheticFrameData } from "./syntheticFrames.ts";

const at = (tdb: number): Instant => Instant.fromTdb(tdb);
const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const AU = 1.495978707e11;
/** Away from the stub Sun, Earth and Moon, so the potentials are mild. */
const HALF = 0.5 * AU;

/** A stub ephemeris with the Sun, Earth and Moon at rest where given (ICRF, m). */
const SUN = [0, 0, 0];
const EARTH = [AU, 0, 0];
const MOON = [AU + 3.844e8, 0, 0];
const state =
  (p: number[]) =>
  (_i: Instant, out: Float64Array = new Float64Array(6)) => {
    out.set([p[0]!, p[1]!, p[2]!, 0, 0, 0]);
    return out;
  };
const frames = createFrames({
  ...syntheticFrameData(),
  ephemeris: {
    sun: state(SUN),
    earth: state(EARTH),
    moon: state(MOON),
  } as unknown as Ephemeris,
});

const movingFrame = (name: string, origin: (tdb: number) => number[]): Frame =>
  new Frame(name, frames.icrf, (instant, out) =>
    toParentMatrix(IDENTITY, origin(instant.tdb()), out),
  );

describe("properTimeRate", () => {
  it("is lower on the equator than at the geocenter by GM_Earth / (a c²)", () => {
    const v = [0, 0, 0];
    const a = 6378137;
    // Perpendicular to the Sun and Moon, so their gradients barely differ.
    const surface = properTimeRate([EARTH[0]!, a, 0], v, at(0), frames);
    const center = properTimeRate(EARTH, v, at(0), frames);
    expect(Math.abs(center - surface - GM_EARTH / (a * C ** 2))).toBeLessThan(
      1e-15,
    );
  });

  it("is 1 − U/c² − v²/2c² from the three GMs", () => {
    const position = [1.2e11, 3e10, -4e9];
    const velocity = [3e4, 1e4, 5e3];
    const d = (b: number[]) =>
      Math.hypot(
        position[0]! - b[0]!,
        position[1]! - b[1]!,
        position[2]! - b[2]!,
      );
    const U = GM_SUN / d(SUN) + GM_EARTH / d(EARTH) + GM_MOON / d(MOON);
    const v2 = velocity[0]! ** 2 + velocity[1]! ** 2 + velocity[2]! ** 2;
    const want = 1 - U / C ** 2 - v2 / (2 * C ** 2);
    expect(
      Math.abs(properTimeRate(position, velocity, at(0), frames) - want),
    ).toBeLessThan(1e-16);
  });
});

describe("downlink and uplink", () => {
  it("gives the ratio of proper-time rates for two points fixed in one uniformly translating frame", () => {
    const origin = (t: number) => [AU * 0.5 + 1 * t, 2e9, 0];
    const drifting = movingFrame("DRIFTING", origin);
    const transmitter = framePoint(drifting, [1e6, 0, 0]);
    const receiver = framePoint(drifting, [0, 0, 0]);
    const t = at(5);
    const leg = downlink(receiver, transmitter, t, frames, { shapiro: [] });
    const s = solveLightTime(receiver, transmitter, t, "reception", frames, []);
    const rate = (p: typeof receiver, instant: Instant, pos: Float64Array) =>
      properTimeRate(pos, velocityIn(p, frames.icrf, instant), instant, frames);
    const want =
      rate(transmitter, s.emission, s.transmitterPosition) /
      rate(receiver, s.reception, s.receiverPosition);
    // The receiver drifts 1 m/s for one light time (3 mm) after emission.
    expect(Math.abs(leg.range - 1e6)).toBeLessThan(1e-2);
    expect(Math.abs(leg.dopplerRatio - want)).toBeLessThan(1e-14);
    // The potentials differ across 1000 km, so this is not trivially 1.
    expect(Math.abs(want - 1)).toBeGreaterThan(1e-13);
    const up = uplink(transmitter, receiver, t, frames, { shapiro: [] });
    expect(Math.abs(up.range - 1e6)).toBeLessThan(1e-2);
  });

  it("has a range rate of 1000 m/s for the receiver receding at 1 km/s", () => {
    const t0 = 0;
    const d = 3e8;
    const receding = movingFrame("RECEDING", (t) => [
      HALF + d + 1000 * (t - t0),
      0,
      0,
    ]);
    const receiver = framePoint(receding, [0, 0, 0]);
    const transmitter = framePoint(frames.icrf, [HALF, 0, 0]);
    const leg = downlink(receiver, transmitter, at(t0), frames, {
      shapiro: [],
      frequency: 2216.5e6,
    });
    expect(Math.abs(leg.rangeRate - 1000)).toBeLessThan(1e-6);
    // Receding: the ratio is below 1, near 1 − v/c; the shift is negative.
    expect(leg.dopplerRatio).toBeLessThan(1);
    expect(leg.dopplerShift).toBeCloseTo((leg.dopplerRatio - 1) * 2216.5e6, 6);
    expect(leg.dopplerShift!).toBeLessThan(0);
  });

  it("leaves dopplerShift out without a frequency, and gives unit directions", () => {
    const receiver = framePoint(frames.icrf, [0, 0, 0]);
    const transmitter = framePoint(frames.icrf, [3e8, 4e8, 0]);
    const leg = downlink(receiver, transmitter, at(0), frames, { shapiro: [] });
    expect(leg.dopplerShift).toBeUndefined();
    expect(Math.abs(leg.receiverDirection[0]! - 0.6)).toBeLessThan(1e-12);
    expect(Math.abs(leg.receiverDirection[1]! - 0.8)).toBeLessThan(1e-12);
    expect(Math.abs(leg.transmitterDirection[0]! + 0.6)).toBeLessThan(1e-12);
    expect(Math.abs(leg.transmitterDirection[1]! + 0.8)).toBeLessThan(1e-12);
  });

  it("uses (1 + dlt/dt) in the uplink, so a receding receiver sees the ratio below 1 by v/c", () => {
    const receding = movingFrame("RECEDING2", (t) => [
      HALF + 3e8 + 1000 * t,
      0,
      0,
    ]);
    const leg = uplink(
      framePoint(frames.icrf, [HALF, 0, 0]),
      framePoint(receding, [0, 0, 0]),
      at(0),
      frames,
      { shapiro: [] },
    );
    // Uplink's range rate is v·c/(c − v), and the ratio is 1/(1 + rr/c)
    // times the rates, which agree here to ~1e-9.
    expect(Math.abs(leg.rangeRate - (1000 * C) / (C - 1000))).toBeLessThan(
      1e-5,
    );
    expect(
      Math.abs(leg.dopplerRatio - 1 / (1 + leg.rangeRate / C)),
    ).toBeLessThan(1e-8);
  });
});
