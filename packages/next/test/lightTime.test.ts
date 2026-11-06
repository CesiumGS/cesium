import { describe, expect, it } from "vitest";
import type { Ephemeris } from "../src/ephemeris/Ephemeris.ts";
import { Frame } from "../src/frames/Frame.ts";
import { createFrames } from "../src/frames/frames.ts";
import { framePoint } from "../src/frames/local.ts";
import { toParentMatrix } from "../src/frames/matrix.ts";
import { C, GM_SUN } from "../src/measure/constants.ts";
import { apparentDirection, solveLightTime } from "../src/measure/lightTime.ts";
import { positionIn, velocityIn } from "../src/measure/motion.ts";
import { Instant } from "../src/time/Instant.ts";
import { Trajectory } from "../src/trajectory/Trajectory.ts";
import { writeSpk } from "./spkWriter.ts";
import { syntheticFrameData } from "./syntheticFrames.ts";

const frames = createFrames(syntheticFrameData());
const at = (tdb: number): Instant => Instant.fromTdb(tdb);
const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const AU = 1.495978707e11;
const SUN_RADIUS = 6.957e8;

/** A frame translated from `parent` to `origin(tdb)`, with its axes. */
const movingFrame = (
  name: string,
  parent: Frame,
  origin: (tdb: number) => number[],
): Frame =>
  new Frame(name, parent, (instant, out) =>
    toParentMatrix(IDENTITY, origin(instant.tdb()), out),
  );

/**
 * An SSB-centred SPK (ICRF axes) from `start` km at `velocity` km/s and
 * constant `acceleration` km/s² (t in TDB seconds), epochs TDB [from, to].
 */
function constantVelocity(
  from: number,
  to: number,
  start: readonly number[],
  velocity: readonly number[],
  acceleration: readonly number[] = [0, 0, 0],
): Trajectory<"probe"> {
  const n = Math.round((to - from) / 10) + 1;
  const epochs = Float64Array.from({ length: n }, (_, i) => from + i * 10);
  const states = new Float64Array(n * 6);
  epochs.forEach((t, i) => {
    for (let k = 0; k < 3; k++) {
      states[i * 6 + k] =
        start[k]! + velocity[k]! * t + 0.5 * acceleration[k]! * t * t;
      states[i * 6 + 3 + k] = velocity[k]! + acceleration[k]! * t;
    }
  });
  const spk = writeSpk({
    kind: "SPK",
    segments: [
      {
        target: 1000,
        center: 0,
        frame: 1,
        type: 13,
        epochs,
        states,
        degree: 3,
      },
    ],
  });
  return Trajectory.fromSpk([spk], 1000, frames, {
    name: "probe",
    accuracy: "precise",
    j2000: "icrf",
  });
}

describe("solveLightTime", () => {
  it("gives exactly d / c between two points fixed in ICRF", () => {
    const receiver = framePoint(frames.icrf, [1e7, 2e7, -3e7]);
    const transmitter = framePoint(frames.icrf, [1e7 + 3e8, 2e7, -3e7]);
    const s = solveLightTime(
      receiver,
      transmitter,
      at(10),
      "reception",
      frames,
      [],
    );
    expect(Math.abs(s.lightTime - 3e8 / C)).toBeLessThan(1e-15);
    expect(s.reception.tdb()).toBe(at(10).tdb());
    expect(
      Math.abs(s.reception.tdb() - s.emission.tdb() - 3e8 / C),
    ).toBeLessThan(1e-12);
    expect(Array.from(s.receiverPosition)).toEqual([1e7, 2e7, -3e7]);
    expect(Array.from(s.transmitterPosition)).toEqual([1e7 + 3e8, 2e7, -3e7]);
  });

  it("solves c·lt = d + v·lt for a receiver receding at 1 km/s", () => {
    const te = at(0);
    const t0 = te.tdb();
    const v = 1000;
    const d = 3e8;
    const moving = movingFrame("RECEDING", frames.icrf, (t) => [
      d + v * (t - t0),
      0,
      0,
    ]);
    const s = solveLightTime(
      framePoint(moving, [0, 0, 0]),
      framePoint(frames.icrf, [0, 0, 0]),
      te,
      "emission",
      frames,
      [],
    );
    expect(Math.abs(s.lightTime - d / (C - v))).toBeLessThan(1e-15);
    expect(s.emission.tdb()).toBe(t0);
  });

  it("adds the Shapiro delay of a path grazing the Sun, as the closed form", () => {
    // A stub ephemeris: the Sun at rest at the origin, the Earth and Moon far.
    const state =
      (...values: number[]) =>
      (_instant: Instant, out: Float64Array = new Float64Array(6)) => {
        out.set(values);
        return out;
      };
    const sunAtRest = createFrames({
      ...syntheticFrameData(),
      ephemeris: {
        sun: state(0, 0, 0, 0, 0, 0),
        earth: state(1e13, 0, 0, 0, 0, 0),
        moon: state(1e13, 1e9, 0, 0, 0, 0),
      } as unknown as Ephemeris,
    });
    const transmitter = framePoint(sunAtRest.icrf, [-AU, SUN_RADIUS, 0]);
    const receiver = framePoint(sunAtRest.icrf, [AU, SUN_RADIUS, 0]);
    const solve = (shapiro: readonly ("sun" | "earth" | "moon")[]) =>
      solveLightTime(
        receiver,
        transmitter,
        at(0),
        "reception",
        sunAtRest,
        shapiro,
      ).lightTime;
    const r = Math.hypot(AU, SUN_RADIUS);
    const rho = 2 * AU;
    const closed =
      ((2 * GM_SUN) / C ** 3) * Math.log((r + r + rho) / (r + r - rho));
    const delay = solve(["sun"]) - solve([]);
    console.log(
      `Shapiro delay grazing the Sun: ${delay} s (closed form ${closed} s)`,
    );
    expect(closed).toBeGreaterThan(1.1e-4);
    expect(closed).toBeLessThan(1.3e-4);
    expect(Math.abs(delay - closed)).toBeLessThan(1e-9);
  });

  it("throws when the emission falls before a trajectory's data", () => {
    const probe = constantVelocity(-100, 100, [1000, 0, 0], [1, 0, 0]);
    const transmitter = framePoint(probe.frame, [0, 0, 0]);
    // One light second from the probe, received just after its data starts.
    const t = at(-99.5);
    const p = positionIn(transmitter, frames.icrf, t);
    const receiver = framePoint(frames.icrf, [p[0]! + 3e8, p[1]!, p[2]!]);
    expect(() =>
      solveLightTime(receiver, transmitter, t, "reception", frames, []),
    ).toThrow(/outside its data/);
  });

  it("refuses a point that carries its own instant (R9)", () => {
    const fixed = framePoint(frames.icrf, [0, 0, 0]);
    const moment = framePoint(frames.icrf, [3e8, 0, 0], at(0));
    expect(() =>
      solveLightTime(fixed, moment, at(0), "reception", frames, []),
    ).toThrow(/own instant/);
    expect(() =>
      solveLightTime(moment, fixed, at(0), "reception", frames, []),
    ).toThrow(/own instant/);
  });
});

describe("velocityIn", () => {
  const velocity = [1.5, -0.5, 0.25];
  const probe = constantVelocity(-100, 100, [1000, -2000, 500], velocity);
  const point = framePoint(probe.frame, [1, 0, 0]);
  const want = velocity.map((v) => v * 1000);

  it("is the trajectory's velocity for a point 1 m off its origin", () => {
    const got = velocityIn(point, frames.icrf, at(20));
    for (let k = 0; k < 3; k++) {
      expect(Math.abs(got[k]! - want[k]!)).toBeLessThan(1e-6);
    }
  });

  it("falls back to one side at the trajectory's last and first epochs", () => {
    for (const t of [100, -100]) {
      const got = velocityIn(point, frames.icrf, at(t));
      for (let k = 0; k < 3; k++) {
        expect(Math.abs(got[k]! - want[k]!)).toBeLessThan(1e-6);
      }
    }
  });

  it("rethrows outside the data", () => {
    expect(() => velocityIn(point, frames.icrf, at(150))).toThrow(
      /outside its data/,
    );
  });

  it("is second order at a data edge: exact for constant acceleration", () => {
    // 9.4 m/s², Orion's order near the Earth: a two-point one-sided
    // difference would miss by a·h/2 = 2.35 m/s.
    const a = [0.0094, -0.003, 0.001];
    const accelerating = constantVelocity(
      -100,
      100,
      [1000, -2000, 500],
      velocity,
      a,
    );
    const p = framePoint(accelerating.frame, [1, 0, 0]);
    for (const t of [100, -100, 20]) {
      const got = velocityIn(p, frames.icrf, at(t));
      for (let k = 0; k < 3; k++) {
        const analytic = (velocity[k]! + a[k]! * t) * 1000;
        expect(Math.abs(got[k]! - analytic), `${t} s, axis ${k}`).toBeLessThan(
          1e-6,
        );
      }
    }
  });

  it("lets a programming error through instead of taking one side", () => {
    // Throws a TypeError past 10 s: only t + h fails, so a catch-all would
    // quietly take the one-sided difference.
    const broken = new Frame("BROKEN", frames.icrf, (instant, out) => {
      if (instant.tdb() > 10) {
        throw new TypeError("a bug in a frame");
      }
      return toParentMatrix(IDENTITY, [instant.tdb(), 0, 0], out);
    });
    expect(() =>
      velocityIn(framePoint(broken, [0, 0, 0]), frames.icrf, at(10)),
    ).toThrow(TypeError);
  });
});

describe("apparentDirection", () => {
  it("is the geometric direction for observers at rest, in the point's axes", () => {
    const receiver = framePoint(frames.icrf, [0, 0, 0]);
    const transmitter = framePoint(frames.icrf, [3e8, 4e8, 0]);
    const s = solveLightTime(
      receiver,
      transmitter,
      at(0),
      "reception",
      frames,
      [],
    );
    const u = apparentDirection(s, "receiver", receiver, frames);
    expect(Math.abs(u[0]! - 0.6)).toBeLessThan(1e-15);
    expect(Math.abs(u[1]! - 0.8)).toBeLessThan(1e-15);
    const back = apparentDirection(s, "transmitter", transmitter, frames);
    expect(Math.abs(back[0]! + 0.6)).toBeLessThan(1e-15);
    expect(Math.abs(back[1]! + 0.8)).toBeLessThan(1e-15);
    // A frame turned a quarter turn about z (toParentMatrix takes the
    // parent-to-child rotation): ICRF x is the frame's y, ICRF y its -x.
    const turned = new Frame("TURNED", frames.icrf, (_i, out) =>
      toParentMatrix([0, -1, 0, 1, 0, 0, 0, 0, 1], undefined, out),
    );
    const inTurned = apparentDirection(
      s,
      "receiver",
      framePoint(turned, [0, 0, 0]),
      frames,
    );
    expect(Math.abs(inTurned[0]! + 0.8)).toBeLessThan(1e-15);
    expect(Math.abs(inTurned[1]! - 0.6)).toBeLessThan(1e-15);
  });

  it("tilts toward the receiver's velocity by asin(v sin w / c), and away when transmitting", () => {
    const v = 30_000;
    const moving = movingFrame("ORBITING", frames.icrf, (t) => [0, v * t, 0]);
    const observer = framePoint(moving, [0, 0, 0]);
    const t = at(0);
    const o = positionIn(observer, frames.icrf, t);
    const star = framePoint(frames.icrf, [o[0]! + 3e8, o[1]!, o[2]!]);
    const received = solveLightTime(observer, star, t, "reception", frames, []);
    const u = apparentDirection(received, "receiver", observer, frames);
    // Geometric direction is +x; w = 90°, so phi = asin(v / c) toward +y.
    const phi = Math.asin(v / C);
    expect(Math.abs(u[0]! - Math.cos(phi))).toBeLessThan(1e-15);
    expect(Math.abs(u[1]! - Math.sin(phi))).toBeLessThan(1e-12);
    const sent = solveLightTime(star, observer, t, "emission", frames, []);
    const w = apparentDirection(sent, "transmitter", observer, frames);
    expect(Math.abs(w[1]! + Math.sin(phi))).toBeLessThan(1e-12);
  });
});
