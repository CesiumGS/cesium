import { describe, expect, it } from "vitest";
import { Frame } from "../src/frames/Frame.ts";
import { createFrames } from "../src/frames/frames.ts";
import { framePoint } from "../src/frames/local.ts";
import { accuracyOf } from "../src/measure/accuracy.ts";
import { EARTH_ROTATION_RATE } from "../src/measure/constants.ts";
import { Instant } from "../src/time/Instant.ts";
import type { EarthOrientationParameters, EopSample } from "../src/time/eop.ts";
import { LeapSeconds } from "../src/time/leapSeconds.ts";
import { Trajectory } from "../src/trajectory/Trajectory.ts";
import { parseOem } from "../src/trajectory/oem.ts";
import { writeSpk } from "./spkWriter.ts";
import { SAMPLE, syntheticFrameData } from "./syntheticFrames.ts";

const leap = LeapSeconds.builtIn();
const ARCSEC = Math.PI / (180 * 3600);
const DAY_MS = 86_400_000;
const instant = Instant.fromTdb(0);
const utcMs = instant.toUtc(leap);

/** Frames over a stub EOP: `sample` everywhere, last observed `ageDays` before the instant. */
function framesWith(sample: EopSample, ageDays = 0) {
  const data = syntheticFrameData(sample);
  data.eop = {
    atInstant: () => sample,
    first: Date.UTC(2000, 0, 1),
    last: Date.UTC(2030, 0, 1),
    lastObserved: utcMs - ageDays * DAY_MS,
  } as unknown as EarthOrientationParameters;
  return createFrames(data);
}

const range = (n: number, step: number): Float64Array =>
  Float64Array.from({ length: n }, (_, i) => i * step);

function spkTrajectory(
  frames: ReturnType<typeof createFrames>,
  options: {
    name: string;
    accuracy: "precise" | "approximate";
    positionSigma?: number;
    coordinateScale?: "tdb" | "unknown";
    /** SPK frame id: 1 is J2000 (so earthIcrf), 13000 is ITRF. */
    frame?: number;
  },
) {
  const { frame = 1, ...rest } = options;
  const epochs = range(11, 60);
  const states = new Float64Array(epochs.length * 6);
  for (let i = 0; i < epochs.length; i++) {
    states[i * 6] = 1000;
  }
  const file = writeSpk({
    kind: "SPK",
    segments: [
      {
        target: 1000,
        center: 399,
        frame,
        type: 13,
        epochs,
        states,
        degree: 1,
      },
    ],
  });
  return Trajectory.fromSpk([file], 1000, frames, {
    ...rest,
    j2000: "icrf",
  });
}

function oemTrajectory(
  frames: ReturnType<typeof createFrames>,
  positionSigma?: number,
) {
  const stamp = (s: number): string =>
    new Date(Date.UTC(2000, 0, 1, 12) + s * 1000).toISOString();
  const rows = Array.from(
    { length: 11 },
    (_, i) => `${stamp(i * 60)} 400000 0 0 0 0 0`,
  );
  const text = [
    "CCSDS_OEM_VERS = 2.0",
    "CREATION_DATE = 2026-04-01T00:00:00",
    "ORIGINATOR = TEST",
    "META_START",
    "OBJECT_NAME = ORION",
    "OBJECT_ID = 2026-001A",
    "CENTER_NAME = EARTH",
    "REF_FRAME = ICRF",
    "TIME_SYSTEM = TDB",
    `START_TIME = ${stamp(0)}`,
    `STOP_TIME = ${stamp(600)}`,
    "INTERPOLATION = LAGRANGE",
    "INTERPOLATION_DEGREE = 1",
    "META_STOP",
    ...rows,
    "",
  ].join("\n");
  return Trajectory.fromOem(parseOem(text, leap), frames, {
    name: "Orion",
    accuracy: "precise",
    ...(positionSigma === undefined ? {} : { positionSigma }),
  });
}

const eop = (r: ReturnType<typeof accuracyOf>) =>
  r.terms.filter((t) => t.source === "earthOrientation");

describe("accuracyOf", () => {
  it("states measured Earth orientation for two ITRF points", () => {
    const frames = framesWith(SAMPLE);
    // Moderate points: ITRF coordinates are what the terms are computed in,
    // whatever the stub's tiny rotation does to them.
    const a = framePoint(frames.itrf, [6378137, 0, 0]);
    const b = framePoint(frames.itrf, [0, 3e6, 4e6]);
    const r = accuracyOf(a, b, instant, frames, { signal: false });
    const terms = eop(r);
    expect(terms).toHaveLength(2);
    for (const [term, p] of [
      [terms[0]!, a.position],
      [terms[1]!, b.position],
    ] as const) {
      const rho = Math.hypot(p[0]!, p[1]!);
      const full = Math.hypot(p[0]!, p[1]!, p[2]!);
      const expected = Math.hypot(
        3.5e-5 * EARTH_ROTATION_RATE * rho,
        1e-4 * ARCSEC * full,
      );
      expect(Math.abs(term.meters! - expected)).toBeLessThan(1e-12);
    }
  });

  it("uses Bulletin A for predicted Earth orientation", () => {
    const frames = framesWith({ ...SAMPLE, predicted: true }, 30);
    const a = framePoint(frames.itrf, [6378137, 0, 0]);
    const r = accuracyOf(a, a, instant, frames, { signal: false });
    const sigmaT = 0.00025 * 30 ** 0.75;
    const sigmaP = 0.00068 * 30 ** 0.8 * ARCSEC;
    const expected = Math.hypot(
      sigmaT * EARTH_ROTATION_RATE * 6378137,
      sigmaP * 6378137,
    );
    for (const term of eop(r)) {
      expect(Math.abs(term.meters! - expected)).toBeLessThan(1e-9);
      expect(term.note).toContain("Bulletin A");
    }
    // Older predictions are less certain.
    const older = framesWith({ ...SAMPLE, predicted: true }, 60);
    const o = accuracyOf(
      framePoint(older.itrf, [6378137, 0, 0]),
      framePoint(older.itrf, [6378137, 0, 0]),
      instant,
      older,
      { signal: false },
    );
    expect(eop(o)[0]!.meters!).toBeGreaterThan(eop(r)[0]!.meters!);
  });

  it("makes meters undefined for a trajectory with no sigma, naming it", () => {
    const frames = framesWith(SAMPLE);
    const traj = spkTrajectory(frames, { name: "Orion", accuracy: "precise" });
    const r = accuracyOf(
      framePoint(traj.frame, [0, 0, 0]),
      framePoint(frames.itrf, [6378137, 0, 0]),
      Instant.fromTdb(100),
      frames,
      { signal: false },
    );
    const term = r.terms.find((t) => t.source === "trajectory")!;
    expect(term.meters).toBeUndefined();
    expect(term.note).toContain('"Orion"');
    expect(r.meters).toBeUndefined();
  });

  it("says approximate in the note of an approximate trajectory", () => {
    const frames = framesWith(SAMPLE);
    const traj = spkTrajectory(frames, {
      name: "Rough",
      accuracy: "approximate",
    });
    const r = accuracyOf(
      framePoint(traj.frame, [0, 0, 0]),
      framePoint(traj.frame, [1, 0, 0]),
      Instant.fromTdb(100),
      frames,
      { signal: false },
    );
    const term = r.terms.find((t) => t.source === "trajectory")!;
    expect(term.meters).toBeUndefined();
    expect(term.note).toContain("approximate");
    expect(r.meters).toBeUndefined();
  });

  it("adds a given positionSigma in RSS", () => {
    const frames = framesWith(SAMPLE);
    const traj = spkTrajectory(frames, {
      name: "Orion",
      accuracy: "precise",
      positionSigma: 50,
    });
    const p = framePoint(traj.frame, [0, 0, 0]);
    const r = accuracyOf(p, p, Instant.fromTdb(100), frames, { signal: false });
    const terms = r.terms.filter((t) => t.source === "trajectory");
    expect(terms).toHaveLength(2);
    expect(terms.every((t) => t.meters === 50)).toBe(true);
    const rss = Math.sqrt(r.terms.reduce((s, t) => s + t.meters! ** 2, 0));
    expect(r.meters).toBeCloseTo(rss, 9);
    expect(r.meters!).toBeGreaterThan(70);
  });

  it("adds a coordinate scale term for an OEM end", () => {
    const frames = framesWith(SAMPLE);
    const traj = oemTrajectory(frames, 1);
    const p = framePoint(traj.frame, [0, 0, 0]);
    const r = accuracyOf(
      p,
      framePoint(frames.itrf, [6378137, 0, 0]),
      Instant.fromTdb(100),
      frames,
      {
        signal: false,
      },
    );
    const scale = r.terms.filter((t) => t.source === "coordinateScale");
    expect(scale).toHaveLength(1);
    expect(scale[0]!.meters).toBeCloseTo(10, 6);
  });

  const scaleTerms = (r: ReturnType<typeof accuracyOf>) =>
    r.terms.filter((t) => t.source === "coordinateScale");
  const at = (traj: Trajectory) => framePoint(traj.frame, [0, 0, 0]);
  const run = (
    frames: ReturnType<typeof createFrames>,
    a: ReturnType<typeof at>,
    b: ReturnType<typeof at>,
  ) => accuracyOf(a, b, Instant.fromTdb(100), frames, { signal: false });

  it("adds a coordinate scale term for an SPK end under earthIcrf by default", () => {
    // The SPK is NAIF's conversion of an OEM, so it inherits the ambiguity.
    const frames = framesWith(SAMPLE);
    const spk = spkTrajectory(frames, {
      name: "S",
      accuracy: "precise",
      positionSigma: 1,
    });
    expect(spk.coordinateScale).toBe("unknown");
    const scale = scaleTerms(run(frames, at(spk), at(spk)));
    expect(scale).toHaveLength(2);
    expect(scale[0]!.meters).toBeCloseTo(2.5e-8 * 1e6, 9);
  });

  it("leaves the term out when the trajectory says its scale is TDB", () => {
    const frames = framesWith(SAMPLE);
    const spk = spkTrajectory(frames, {
      name: "S",
      accuracy: "precise",
      positionSigma: 1,
      coordinateScale: "tdb",
    });
    expect(spk.coordinateScale).toBe("tdb");
    expect(scaleTerms(run(frames, at(spk), at(spk)))).toHaveLength(0);
  });

  it("gives an ITRF station SPK no coordinate scale term", () => {
    const frames = framesWith(SAMPLE);
    const dss = spkTrajectory(frames, {
      name: "DSS",
      accuracy: "precise",
      positionSigma: 0.01,
      frame: 13000,
    });
    expect(dss.reference).toBe(frames.itrf);
    expect(scaleTerms(run(frames, at(dss), at(dss)))).toHaveLength(0);
  });

  it("adds the ephemeris term only when the ends meet at ICRF", () => {
    const frames = framesWith(SAMPLE);
    const a = framePoint(frames.itrf, [6378137, 0, 0]);
    const b = framePoint(frames.itrf, [0, 6378137, 0]);
    const same = accuracyOf(a, b, instant, frames, { signal: false });
    expect(same.terms.some((t) => t.source === "ephemeris")).toBe(false);
    expect(same.terms.some((t) => t.source === "relativity")).toBe(false);

    const moon = framePoint(frames.moonMe, [1737400, 0, 0]);
    const r = accuracyOf(a, moon, instant, frames, { signal: false });
    expect(r.terms.find((t) => t.source === "ephemeris")!.meters).toBe(0.01);
    const rel = r.terms.filter((t) => t.source === "relativity");
    expect(rel).toHaveLength(1);
    expect(rel[0]!.meters).toBe(0.03);
    expect(r.meters).toBeDefined();
  });

  it("states the ephemeris unknown for heliocentric geometry", () => {
    const frames = framesWith(SAMPLE);
    const a = framePoint(frames.itrf, [6378137, 0, 0]);
    const sun = framePoint(frames.hcrs, [1e9, 0, 0]);
    for (const [x, y] of [
      [sun, a],
      [a, sun],
      [framePoint(frames.icrf, [0, 0, 0]), a],
    ] as const) {
      const r = accuracyOf(x, y, instant, frames, { signal: false });
      const term = r.terms.find((t) => t.source === "ephemeris")!;
      expect(term.meters).toBeUndefined();
      expect(term.note).toBe(
        "heliocentric or barycentric geometry: DE440's absolute accuracy is not stated here",
      );
      expect(r.meters).toBeUndefined();
    }
    // Earth-Moon geometry, through gcrf, earthIcrf, eme2000 and moonIcrf, keeps 0.01 m.
    for (const f of [frames.gcrf, frames.earthIcrf, frames.eme2000]) {
      const r = accuracyOf(
        framePoint(f, [1e8, 0, 0]),
        framePoint(frames.moonIcrf, [0, 0, 0]),
        instant,
        frames,
        { signal: false },
      );
      expect(r.terms.find((t) => t.source === "ephemeris")!.meters).toBe(0.01);
    }
  });

  it("adds a light-time term when signalling", () => {
    const frames = framesWith(SAMPLE);
    const a = framePoint(frames.itrf, [6378137, 0, 0]);
    const r = accuracyOf(a, a, instant, frames, { signal: true });
    expect(r.terms.find((t) => t.source === "lightTime")!.meters).toBe(0.001);
  });

  it("warns past the leap-second table's expiry", () => {
    const frames = framesWith(SAMPLE);
    const a = framePoint(frames.itrf, [6378137, 0, 0]);
    expect(
      accuracyOf(a, a, instant, frames, { signal: false }).warnings,
    ).toEqual([]);
    const late = Instant.fromUtc(leap.expires + DAY_MS, leap);
    const w = accuracyOf(a, a, late, frames, { signal: false }).warnings;
    expect(w).toHaveLength(1);
    expect(w[0]).toContain("leap second");
  });

  it("never states a predicted sample better than a measured one", () => {
    const base = framesWith(SAMPLE);
    const m = framePoint(base.itrf, [6378137, 0, 0]);
    const measured = eop(accuracyOf(m, m, instant, base, { signal: false }))[0]!
      .meters!;
    for (const age of [0, -1]) {
      const frames = framesWith({ ...SAMPLE, predicted: true }, age);
      const a = framePoint(frames.itrf, [6378137, 0, 0]);
      const t = eop(accuracyOf(a, a, instant, frames, { signal: false }))[0]!;
      expect(t.meters!).toBeGreaterThanOrEqual(measured);
      expect(t.meters!).toBeGreaterThan(0);
    }
  });

  it("leaves Earth orientation unknown outside the EOP table", () => {
    const frames = framesWith({ ...SAMPLE, degraded: true });
    const a = framePoint(frames.itrf, [6378137, 0, 0]);
    const r = accuracyOf(a, a, instant, frames, { signal: false });
    const terms = eop(r);
    expect(terms).toHaveLength(2);
    expect(terms.every((t) => t.meters === undefined)).toBe(true);
    expect(terms[0]!.note).toContain("outside the EOP table");
    expect(r.meters).toBeUndefined();
  });

  it("applies the trajectory terms to a point in a local frame under it", () => {
    const frames = framesWith(SAMPLE);
    const local = (traj: Trajectory) =>
      new Frame("antenna", traj.frame, (_i, out) => {
        out.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 2, 0, 0, 1]);
      });
    const bare = oemTrajectory(frames);
    const p = framePoint(local(bare), [0, 0, 0]);
    const q = framePoint(frames.itrf, [6378137, 0, 0]);
    const r = accuracyOf(p, q, Instant.fromTdb(100), frames, { signal: false });
    const term = r.terms.find((t) => t.source === "trajectory")!;
    expect(term.meters).toBeUndefined();
    expect(term.note).toContain('"Orion"');
    expect(r.meters).toBeUndefined();
    expect(r.terms.some((t) => t.source === "coordinateScale")).toBe(true);

    const sigma = oemTrajectory(frames, 50);
    const s = accuracyOf(
      framePoint(local(sigma), [0, 0, 0]),
      q,
      Instant.fromTdb(100),
      frames,
      { signal: false },
    );
    expect(s.terms.find((t) => t.source === "trajectory")!.meters).toBe(50);
    expect(s.meters!).toBeGreaterThan(50);
  });
});
