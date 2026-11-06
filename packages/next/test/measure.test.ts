import { describe, expect, it } from "vitest";
import type { Ephemeris } from "../src/ephemeris/Ephemeris.ts";
import { createFrames } from "../src/frames/frames.ts";
import {
  eastNorthUpFrame,
  framePoint,
  type FramePoint,
} from "../src/frames/local.ts";
import { Frame } from "../src/frames/Frame.ts";
import { Ellipsoid } from "../src/math/ellipsoid.ts";
import { C } from "../src/measure/constants.ts";
import { measure, measureSpan } from "../src/measure/measure.ts";
import { surfaceDistance } from "../src/measure/surface.ts";
import { EARTH } from "../src/scene/Body.ts";
import { Instant } from "../src/time/Instant.ts";
import type { EarthOrientationParameters } from "../src/time/eop.ts";
import { Trajectory } from "../src/trajectory/Trajectory.ts";
import { writeSpk } from "./spkWriter.ts";
import { SAMPLE, syntheticFrameData } from "./syntheticFrames.ts";

/** Sun, Earth and Moon at rest, so the Earth's barycentric motion doesn't enter the light time. */
const AU = 1.495978707e11;
const rest =
  (x: number) =>
  (_i: Instant, out: Float64Array = new Float64Array(6)) => {
    out.set([x, 0, 0, 0, 0, 0]);
    return out;
  };
const real = syntheticFrameData().ephemeris;
const stub = Object.create(real) as Ephemeris;
Object.assign(stub, {
  sun: rest(0),
  earth: rest(AU),
  moon: rest(AU + 3.844e8),
});
const frames = createFrames({ ...syntheticFrameData(), ephemeris: stub });
const instant = Instant.fromTdb(0);
const station = framePoint(frames.itrf, [6378137, 0, 0]);

/** Visits every number in `value`, treating class instances as opaque. */
function numbers(value: unknown, out: number[] = []): number[] {
  if (typeof value === "number") {
    out.push(value);
  } else if (ArrayBuffer.isView(value)) {
    out.push(...Array.from(value as unknown as ArrayLike<number>));
  } else if (Array.isArray(value)) {
    value.forEach((v) => numbers(v, out));
  } else if (
    value !== null &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    Object.values(value).forEach((v) => numbers(v, out));
  }
  return out;
}

function spk(spans: readonly (readonly [number, number])[]) {
  return writeSpk({
    kind: "SPK",
    segments: spans.map(([from, to]) => {
      const epochs = Float64Array.from(
        { length: (to - from) / 10 + 1 },
        (_, i) => from + i * 10,
      );
      const states = new Float64Array(epochs.length * 6);
      for (let i = 0; i < epochs.length; i++) {
        states[i * 6] = 7000;
      }
      return {
        target: 1000,
        center: 399,
        frame: 1,
        type: 13 as const,
        epochs,
        states,
        degree: 1,
      };
    }),
  });
}

describe("measure", () => {
  it("measures two ITRF points 10 km apart", () => {
    const b = framePoint(frames.itrf, [6378137, 6000, 8000]);
    const enu = eastNorthUpFrame(
      "ENU",
      frames.itrf,
      Ellipsoid.WGS84,
      station.position,
    );
    const m = measure(station, b, instant, frames, { deltaFrame: enu });
    expect(Math.abs(m.distance - 10000)).toBeLessThan(1e-6);
    expect(m.deltaFrame).toBe(enu);
    expect(Math.abs(m.delta[0]! - 6000)).toBeLessThan(1e-6);
    expect(Math.abs(m.delta[1]! - 8000)).toBeLessThan(1e-6);
    expect(Math.abs(m.delta[2]!)).toBeLessThan(1e-6);
    expect(m.overBody!.body).toBe(EARTH);
    const s = surfaceDistance(EARTH.ellipsoid, station.position, b.position);
    expect(Math.abs(m.overBody!.distance - s.distance)).toBeLessThan(1e-6);
    expect(m.overBody!.heightDifference).toBeCloseTo(s.heightDifference, 6);
    expect(m.lineOfSight!.clear).toBe(true);
    expect(m.accuracy.terms.length).toBeGreaterThan(0);
  });

  it("gives a signal whose range is the distance, along the Earth's axis", () => {
    // Perpendicular to the surface's rotation, so the Earth's spin adds only
    // second-order terms to the light time.
    const north = framePoint(frames.itrf, [6378137, 0, 10000]);
    const m = measure(station, north, instant, frames);
    expect(Math.abs(m.signal!.downlink.range - m.distance)).toBeLessThan(1e-3);
    expect(Math.abs(m.signal!.uplink.range - m.distance)).toBeLessThan(1e-3);
    expect(m.signal!.uplink.lightTime).toBeCloseTo(m.distance / C, 9);
  });

  it("defaults delta to a's frame and leaves overBody out across bodies", () => {
    const orion = Trajectory.fromSpk([spk([[-100, 100]])], 1000, frames, {
      name: "Orion",
      accuracy: "precise",
      j2000: "icrf",
    });
    const m = measure(
      station,
      framePoint(orion.frame, [0, 0, 0]),
      instant,
      frames,
    );
    expect(m.deltaFrame).toBe(station.frame);
    expect(m.overBody).toBeUndefined();
    expect(m.signal).toBeDefined();
  });

  it("gives coincident points distance 0, no signal and no NaN", () => {
    for (const b of [station, framePoint(frames.itrf, [6378137, 0.0002, 0])]) {
      const m = measure(station, b, instant, frames);
      expect(m.distance).toBe(0);
      expect(Array.from(m.delta)).toEqual([0, 0, 0]);
      expect(m.signal).toBeUndefined();
      expect(m.lineOfSight).toBeUndefined();
      expect(m.accuracy.warnings.join(" ")).toMatch(/coincide/);
      expect(numbers(m).some(Number.isNaN)).toBe(false);
    }
    expect(measure(station, station, instant, frames).distance).toBe(0);
  });

  it("leaves overBody out with a warning for a point at a body's center", () => {
    const center = framePoint(frames.itrf, [0, 0, 0]);
    for (const [a, b] of [
      [center, station],
      [station, center],
    ]) {
      for (const signal of [true, false]) {
        const m = measure(a!, b!, instant, frames, { signal });
        expect(Math.abs(m.distance - 6378137)).toBeLessThan(1e-6);
        expect(m.overBody).toBeUndefined();
        expect(m.accuracy.warnings.join(" ")).toMatch(/center/);
        expect(m.accuracy.terms.length).toBeGreaterThan(0);
        expect(m.signal !== undefined).toBe(signal);
      }
    }
    const m = measure(center, station, instant, frames);
    expect(m.signal!.downlink.range).toBeGreaterThan(0);
    expect(m.accuracy.meters).toBeDefined();
    // The Moon's center in MOON_ME, measured to a point on the Moon.
    const moonCenter = framePoint(frames.moonMe, [0, 0, 0]);
    const surface = framePoint(frames.moonMe, [1737400, 0, 0]);
    const lunar = measure(moonCenter, surface, instant, frames, {
      signal: false,
    });
    expect(lunar.overBody).toBeUndefined();
    expect(lunar.distance).toBeCloseTo(1737400, 6);
  });

  it("throws a clear error for non-finite input", () => {
    const b = framePoint(frames.itrf, [6378137, 6000, 8000]);
    const nan = framePoint(frames.itrf, [6378137, Number.NaN, 0]);
    expect(() => measure(station, nan, instant, frames)).toThrow(
      /non-finite coordinate/,
    );
    expect(() => measure(nan, b, instant, frames)).toThrow(
      /non-finite coordinate/,
    );
    expect(() =>
      measure(station, b, instant, frames, { frequency: Number.NaN }),
    ).toThrow(/frequency/);
    expect(() =>
      measure(station, b, Instant.fromTdb(Number.NaN), frames),
    ).toThrow(/finite instant/);
    expect(
      measure(station, b, instant, frames, { frequency: 8.4e9 }).distance,
    ).toBeGreaterThan(0);
  });

  it("gives a point with its own instant geometry only (R9)", () => {
    const moving = framePoint(frames.itrf, [6378137, 6000, 8000], instant);
    const m = measure(station, moving, instant, frames);
    expect(Math.abs(m.distance - 10000)).toBeLessThan(1e-6);
    expect(m.signal).toBeUndefined();
    expect(m.lineOfSight).toBeUndefined();
    expect(m.accuracy.warnings.join(" ")).toMatch(/b carries its own instant/);
    const other = measure(moving, station, instant, frames);
    expect(other.accuracy.warnings.join(" ")).toMatch(
      /a carries its own instant/,
    );
    expect(() => measure(moving, station, Instant.fromTdb(5), frames)).toThrow(
      /another instant/,
    );
  });

  it("codes each warning, in step with the text, so a reader can tell signal-only ones apart", () => {
    const moving = framePoint(frames.itrf, [6378137, 6000, 8000], instant);
    const m = measure(station, moving, instant, frames);
    expect(m.accuracy.warningCodes).toHaveLength(m.accuracy.warnings.length);
    const i = m.accuracy.warningCodes!.indexOf("own-instant-no-signal");
    expect(i).toBeGreaterThanOrEqual(0);
    expect(m.accuracy.warnings[i]).toMatch(/b carries its own instant/);
    const same = measure(station, station, instant, frames);
    expect(same.accuracy.warningCodes).toContain("coincident");
    const center = measure(
      framePoint(frames.itrf, [0, 0, 0]),
      station,
      instant,
      frames,
    );
    expect(center.accuracy.warningCodes).toContain("no-footprint");
    const plain = measure(
      station,
      framePoint(frames.itrf, [6378137, 6000, 8000]),
      instant,
      frames,
    );
    expect(plain.accuracy.warningCodes ?? []).toHaveLength(
      plain.accuracy.warnings.length,
    );
  });

  it("honours signal: false", () => {
    const m = measure(
      station,
      framePoint(frames.itrf, [6378137, 6000, 8000]),
      instant,
      frames,
      { signal: false },
    );
    expect(m.signal).toBeUndefined();
    expect(m.lineOfSight).toBeUndefined();
  });

  it("throws past the EOP predictions, naming the span (Review Focus 4)", () => {
    const data = syntheticFrameData({ ...SAMPLE, degraded: true });
    data.eop = {
      atInstant: () => ({ ...SAMPLE, degraded: true }),
      first: Date.UTC(2000, 0, 1),
      last: Date.UTC(2030, 0, 1),
    } as unknown as EarthOrientationParameters;
    const old = createFrames(data);
    const a = framePoint(old.itrf, [6378137, 0, 0]);
    const b = framePoint(old.itrf, [6378137, 6000, 8000]);
    expect(() => measure(a, b, instant, old)).toThrow(/2000-01-01.*2030-01-01/);
  });
});

describe("measureSpan", () => {
  const orion = Trajectory.fromSpk(
    [spk([[-100, -30]]), spk([[30, 100]])],
    1000,
    frames,
    { name: "Orion", accuracy: "precise", j2000: "icrf" },
  );
  const b: FramePoint = framePoint(orion.frame, [0, 0, 0]);

  it("records a sample in a gap as an error and carries on (Review Focus 1)", () => {
    const samples = measureSpan(
      station,
      b,
      Instant.fromTdb(-60),
      Instant.fromTdb(60),
      20,
      frames,
    );
    expect(samples.map((s) => s.instant.tdb())).toEqual([
      -60, -40, -20, 0, 20, 40, 60,
    ]);
    for (const s of samples) {
      const t = s.instant.tdb();
      if (t > -30 && t < 30) {
        expect(s.measurement).toBeUndefined();
        expect(s.error).toMatch(/outside its data/);
      } else {
        expect(s.error).toBeUndefined();
        expect(s.measurement!.signal).toBeDefined();
      }
    }
  });

  it("records a light path that leaves the data", () => {
    // Orion is inside its segment at t = 30.001, but the downlink left it
    // about 2 ms earlier, in the gap: no extrapolation.
    const [sample] = measureSpan(
      station,
      b,
      Instant.fromTdb(30.001),
      Instant.fromTdb(30.001),
      1,
      frames,
    );
    expect(sample!.measurement).toBeUndefined();
    expect(sample!.error).toMatch(/outside its data/);
  });

  it("rejects non-finite input and too many samples before running any", () => {
    const t = Instant.fromTdb(0);
    const nan = Instant.fromTdb(Number.NaN);
    const inf = Instant.fromTdb(Infinity);
    expect(() => measureSpan(station, b, t, nan, 1, frames)).toThrow(/stop/);
    expect(() => measureSpan(station, b, t, inf, 1, frames)).toThrow(/stop/);
    expect(() => measureSpan(station, b, nan, t, 1, frames)).toThrow(/start/);
    expect(() => measureSpan(station, b, t, t, Number.NaN, frames)).toThrow(
      /step/,
    );
    expect(() => measureSpan(station, b, t, t, Infinity, frames)).toThrow(
      /step/,
    );
    const bad = framePoint(frames.itrf, [Number.NaN, 0, 0]);
    expect(() => measureSpan(bad, b, t, t, 1, frames)).toThrow(/non-finite/);
    expect(() =>
      measureSpan(station, b, t, t, 1, frames, { frequency: Number.NaN }),
    ).toThrow(/frequency/);
    // 1e7 samples: it must throw at once, not run them.
    const started = performance.now();
    expect(() =>
      measureSpan(station, b, t, Instant.fromTdb(1e7 - 1), 1, frames),
    ).toThrow(/1,?000,?000|limit/);
    expect(performance.now() - started).toBeLessThan(100);
  });

  it("propagates a TypeError raised inside a sample", () => {
    const broken = new Frame("broken", frames.itrf, () => {
      throw new TypeError("a programming error");
    });
    const t = Instant.fromTdb(0);
    expect(() =>
      measureSpan(station, framePoint(broken, [0, 0, 0]), t, t, 1, frames),
    ).toThrow(TypeError);
    const failing = new Frame("failing", frames.itrf, () => {
      throw new Error("outside the data");
    });
    const [sample] = measureSpan(
      station,
      framePoint(failing, [0, 0, 0]),
      t,
      t,
      1,
      frames,
    );
    expect(sample!.error).toBe("outside the data");
  });

  it("rejects a non-positive step and a stop before the start", () => {
    const t = Instant.fromTdb(0);
    expect(() => measureSpan(station, b, t, t, 0, frames)).toThrow(/step/);
    expect(() =>
      measureSpan(station, b, t, Instant.fromTdb(-1), 1, frames),
    ).toThrow(/stop/);
  });
});
