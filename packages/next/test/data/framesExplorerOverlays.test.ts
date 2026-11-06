// The frames explorer's overlay geometry (examples/frames-explorer/overlays.ts)
// over real PROJ-backed engineering frames. `npm run test:data` runs it; the
// pure cases are in test/framesExplorerOverlays.test.ts.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import {
  designGrid,
  distortion,
  rigidSeparation,
  rigidVsExact,
  triad,
  trueNorthLines,
} from "../../examples/frames-explorer/overlays.ts";
import type { CrsRef } from "../../src/engineering/crs.ts";
import {
  EngineeringFrame,
  RigidPlacement,
} from "../../src/engineering/EngineeringFrame.ts";
import { gridFactors } from "../../src/engineering/factors.ts";
import { loadProj, type ProjApi } from "../../src/engineering/proj.ts";
import { Ephemeris } from "../../src/ephemeris/Ephemeris.ts";
import { createFrames } from "../../src/frames/frames.ts";
import { EARTH } from "../../src/scene/Body.ts";
import { EarthOrientationParameters } from "../../src/time/eop.ts";
import { Instant } from "../../src/time/Instant.ts";
import { LeapSeconds } from "../../src/time/leapSeconds.ts";

const base = `${join(framesDataDirectory(), "proj")}/`;
let proj: ProjApi;
beforeAll(async () => {
  proj = await loadProj({ base });
});

const epsg = (wkid: number): CrsRef => ({
  format: "wkid",
  authority: "EPSG",
  wkid,
});
const frameOf = (wkid: number, site?: EngineeringFrame["definition"]["site"]) =>
  EngineeringFrame.create(
    {
      name: `EPSG:${wkid}`,
      body: EARTH,
      crs: epsg(wkid),
      ...(site && { site }),
    },
    proj,
  );
const vertex = (g: { positions: Float64Array }, i: number) =>
  Array.from(g.positions.subarray(3 * i, 3 * i + 3));
const sub = (a: number[], b: number[]) => a.map((x, i) => x - b[i]!);
const norm = (a: number[]) => Math.hypot(...a);
/** The angle between two vectors, radians. */
const angle = (a: number[], b: number[]) => {
  const cross = [
    a[1]! * b[2]! - a[2]! * b[1]!,
    a[2]! * b[0]! - a[0]! * b[2]!,
    a[0]! * b[1]! - a[1]! * b[0]!,
  ];
  return Math.atan2(norm(cross), a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!);
};

describe("designGrid and trueNorthLines on UTM zone 10N", () => {
  const frame = () => frameOf(32610);
  // 200 km east of the central meridian, near 37 degrees north.
  const extent = {
    min: [700_000, 4_100_000] as [number, number],
    max: [703_000, 4_103_000] as [number, number],
  };

  it("every designGrid vertex is toBodyFixed of its E and N, to 1e-9 m", () => {
    const f = frame();
    const g = designGrid(f, extent, 1000, 500);
    // 4 E lines and 4 N lines of 6 segments each, as pairs.
    expect(g.positions.length / 3).toBe(2 * 8 * 6);
    // The first E line: E = 700000, N 4100000 to 4103000 in 500 m steps.
    for (let s = 0; s < 6; s++) {
      for (const [v, n] of [
        [2 * s, 4_100_000 + 500 * s],
        [2 * s + 1, 4_100_000 + 500 * (s + 1)],
      ] as const) {
        const want = f.toBodyFixed([700_000, n, 0]);
        const got = vertex(g, v);
        for (let c = 0; c < 3; c++) {
          expect(Math.abs(got[c]! - want[c]!)).toBeLessThan(1e-9);
        }
      }
    }
  });

  it("every trueNorthLines vertex has its line's longitude to 1e-12 rad", () => {
    const f = frame();
    const g = trueNorthLines(f, extent, 1000, 500);
    expect(g.positions.length / 3).toBe(2 * 4 * 6);
    for (let i = 0; i < g.positions.length / 3; i++) {
      const line = Math.floor(i / 12);
      const want = f.toGeodetic([
        700_000 + 1000 * line,
        4_100_000,
        0,
      ]).longitude;
      const [x, y] = vertex(g, i);
      expect(Math.abs(Math.atan2(y!, x!) - want)).toBeLessThan(1e-12);
    }
  });

  it("the grid line leans from the meridian by the grid convergence, to 1e-5 rad", () => {
    const f = frame();
    const grid = designGrid(f, extent, 3000, 1000);
    const north = trueNorthLines(f, extent, 3000, 1000);
    // Both start at (700000, 4100000) and head north: segment 0 of each.
    const gridDirection = sub(vertex(grid, 1), vertex(grid, 0));
    const trueDirection = sub(vertex(north, 1), vertex(north, 0));
    expect(norm(sub(vertex(grid, 0), vertex(north, 0)))).toBeLessThan(1e-6);
    const gamma = gridFactors(f, [700_000, 4_100_000, 0]).convergence;
    expect(Math.abs(gamma)).toBeGreaterThan(0.01);
    expect(
      Math.abs(angle(gridDirection, trueDirection) - Math.abs(gamma)),
    ).toBeLessThan(1e-5);
  });
});

describe("rigidVsExact", () => {
  // A ground-scaled site grid at 37 N, 123 W, as the stress catalog's rigid
  // placement budget builds it.
  function site() {
    const plain = frameOf(32610);
    const origin = plain.fromBodyFixed(
      EARTH.ellipsoid.cartographicToCartesian(
        {
          longitude: (-123 * Math.PI) / 180,
          latitude: (37 * Math.PI) / 180,
          height: 0,
        },
        new Float64Array(3),
      ),
    );
    const scale = gridFactors(plain, origin).combinedFactor;
    return frameOf(32610, {
      origin: [origin[0]!, origin[1]!, 0],
      rotation: 0,
      scale,
    });
  }

  it("a 10 km line sags 6.3 to 9.3 m (plan 4a's 7.8 m +- 1.5)", () => {
    const f = site();
    const { sagAtEnd } = rigidVsExact(f, [0, 0], [10_000, 0], 20);
    expect(sagAtEnd).toBeGreaterThan(6.3);
    expect(sagAtEnd).toBeLessThan(9.3);
  });

  it("the polylines coincide at `from` and exact[i] is toBodyFixed", () => {
    const f = site();
    const samples = 20;
    const r = rigidVsExact(f, [0, 0], [10_000, 0], samples);
    expect(r.exact).toHaveLength(3 * (samples + 1));
    expect(r.rigid).toHaveLength(3 * (samples + 1));
    expect(
      norm(
        sub(
          Array.from(r.exact.subarray(0, 3)),
          Array.from(r.rigid.subarray(0, 3)),
        ),
      ),
    ).toBeLessThan(1e-6);
    for (let i = 0; i <= samples; i++) {
      const want = f.toBodyFixed([(10_000 * i) / samples, 0, 0]);
      for (let c = 0; c < 3; c++) {
        expect(Math.abs(r.exact[3 * i + c]! - want[c]!)).toBeLessThan(1e-9);
      }
    }
    // The rigid line is the other one: it ends where RigidPlacement puts `to`.
    const rigid = RigidPlacement.at(f, [0, 0, 0]).toBodyFixed([10_000, 0, 0]);
    for (let c = 0; c < 3; c++) {
      expect(Math.abs(r.rigid[3 * samples + c]! - rigid[c]!)).toBeLessThan(
        1e-9,
      );
    }
    // And they differ at the end by sagAtEnd.
    expect(
      norm(
        sub(
          Array.from(r.exact.subarray(3 * samples)),
          Array.from(r.rigid.subarray(3 * samples)),
        ),
      ),
    ).toBeCloseTo(r.sagAtEnd, 9);
  });

  it("agrees with the stress catalog's rigid placement budget on the same frame (ruling F1)", () => {
    const f = site();
    // The budget's own separation, written out: the distance between the rigid
    // and the exact placement of the point x east of the origin.
    const rigid = RigidPlacement.at(f, [0, 0, 0]);
    for (const x of [100, 1000, 10_000, 20_000]) {
      const a = rigid.toBodyFixed([x, 0, 0]);
      const b = f.toBodyFixed([x, 0, 0]);
      const budget = Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);
      expect(rigidSeparation(rigid, f, [x, 0, 0])).toBe(budget);
      expect(rigidVsExact(f, [0, 0], [x, 0], 4).sagAtEnd).toBe(budget);
    }
  });

  it("rejects a sample count that is not a whole number of segments", () => {
    expect(() => rigidVsExact(site(), [0, 0], [1, 0], 0)).toThrow(/samples/);
    expect(() => rigidVsExact(site(), [0, 0], [1, 0], 2.5)).toThrow(/samples/);
  });
});

describe("distortion", () => {
  const WGS84_F = 1 / 298.257223563;
  const E2 = WGS84_F * (2 - WGS84_F);
  const RADIUS = 1000;

  it("EPSG:3857 at 60 degrees: the parallel axis is sqrt(1 - e2 sin2 phi) / cos phi times the radius, to 1e-9", () => {
    const f = frameOf(3857);
    // Pseudo-Mercator's northing at 60 degrees: a ln tan(45 + 30 degrees).
    const a = 6378137;
    const n60 = a * Math.log(Math.tan(Math.PI / 4 + Math.PI / 6));
    const d = distortion(f, { min: [0, n60], max: [0, n60] }, 1000, {
      height: 0,
      contoursPpm: [],
      tissotRadius: RADIUS,
    });
    const centre = Array.from(f.toBodyFixed([0, n60, 0]));
    const sinPhi = Math.sin(Math.PI / 3);
    const w = 1 - E2 * sinPhi * sinPhi;
    const parallel = Math.sqrt(w) / Math.cos(Math.PI / 3);
    // Vertex 0 of the first ellipse (its first segment's start) is the
    // parallel axis's end.
    const axis = norm(sub(vertex(d.tissot, 0), centre));
    expect(Math.abs(axis / (RADIUS * parallel) - 1)).toBeLessThan(1e-9);
    // The meridian axis (a quarter of the way round: vertex 8 of 32), against
    // the hand formula h = w^(3/2) / ((1 - e2) cos phi) for the same map.
    const meridian = norm(sub(vertex(d.tissot, 2 * 8), centre));
    const h = w ** 1.5 / ((1 - E2) * Math.cos(Math.PI / 3));
    expect(Math.abs(meridian / (RADIUS * h) - 1)).toBeLessThan(1e-9);
    // Pseudo-Mercator is not conformal on the ellipsoid: h differs from k.
    expect(Math.abs(h / parallel - 1)).toBeGreaterThan(1e-3);
  });

  it("UTM zone 31N (conformal): h = k to 1e-10 and the axes are at right angles to 1e-10 rad (ruling F15)", () => {
    const f = frameOf(32631);
    const d = distortion(
      f,
      { min: [400_000, 4_900_000], max: [650_000, 5_100_000] },
      50_000,
      { height: 0, contoursPpm: [], tissotRadius: RADIUS },
    );
    // 6 x 5 nodes, one ellipse of 32 segments (64 vertices) each.
    expect(d.tissot.positions.length / 3).toBe(30 * 64);
    let worstRatio = 0;
    let worstAngle = 0;
    for (let node = 0; node < 30; node++) {
      const i = node * 64;
      // The ellipse's centre: the mean of the opposite vertices 0 and 16.
      const p0 = vertex(d.tissot, i);
      const p16 = vertex(d.tissot, i + 2 * 16);
      const centre = p0.map((x, c) => (x + p16[c]!) / 2);
      const k = norm(sub(p0, centre));
      const pm = vertex(d.tissot, i + 2 * 8);
      const hVec = sub(pm, centre);
      worstRatio = Math.max(worstRatio, Math.abs(norm(hVec) / k - 1));
      worstAngle = Math.max(
        worstAngle,
        Math.abs(angle(sub(p0, centre), hVec) - Math.PI / 2),
      );
      expect(Math.abs(k / RADIUS - 1)).toBeLessThan(5e-3);
    }
    expect(worstRatio).toBeLessThan(1e-10);
    expect(worstAngle).toBeLessThan(1e-10);
  });

  it("contours the combined factor: UTM 10N's 0 ppm lines are where k x elevation = 1, about 180 km from the central meridian", () => {
    const f = frameOf(32610);
    const d = distortion(
      f,
      { min: [250_000, 4_100_000], max: [750_000, 4_200_000] },
      10_000,
      { height: 0, contoursPpm: [-200, 0, 200], tissotRadius: 100 },
    );
    expect(d.contours.positions.length).toBeGreaterThan(0);
    // The hand formula: k = k0 (1 + x^2 / (2 R^2)) with x the ground distance
    // from the central meridian, so k = 1 at x = R sqrt(2 (1 / k0 - 1)), and
    // the grid distance is k0 x. R is the Gaussian radius, 6.37e6 m at 37 N.
    const k0 = 0.9996;
    const R = 6.37e6;
    const expected = k0 * R * Math.sqrt(2 * (1 / k0 - 1));
    // The 0 ppm contour's vertices are the segments with the 0 ppm color:
    // every vertex is at design E = 500000 +- expected, to a km or two.
    const zeroColor = [255, 255, 255, 255];
    let seen = 0;
    for (let v = 0; v < d.contours.positions.length / 3; v++) {
      const c = Array.from(d.contours.colors.subarray(4 * v, 4 * v + 4));
      if (String(c) !== String(zeroColor)) {
        continue;
      }
      const design = f.fromBodyFixed(vertex(d.contours, v));
      expect(Math.abs(Math.abs(design[0]! - 500_000) - expected)).toBeLessThan(
        1500,
      );
      seen++;
    }
    expect(seen).toBeGreaterThan(10);
    // The central meridian is at k0 = -400 ppm: no -200 contour crosses it.
    for (let v = 0; v < d.contours.positions.length / 3; v++) {
      const design = f.fromBodyFixed(vertex(d.contours, v));
      expect(Math.abs(design[0]! - 500_000)).toBeGreaterThan(50_000);
    }
    // Labels carry the ppm of the levels that drew something.
    expect(d.skipped).toBe(0);
    expect(d.labels.positions.length).toBe(3 * d.labels.ppm.length);
    expect(new Set(d.labels.ppm)).toEqual(new Set([-200, 0, 200]));
  });

  it("returns typed arrays a worker can transfer", () => {
    const f = frameOf(32610);
    const d = distortion(
      f,
      { min: [400_000, 4_000_000], max: [450_000, 4_050_000] },
      25_000,
      {
        height: 0,
        tissotRadius: 100,
      },
    );
    for (const buffer of [
      d.tissot.positions,
      d.tissot.colors,
      d.contours.positions,
      d.contours.colors,
      d.labels.positions,
      d.labels.ppm,
    ]) {
      expect(buffer.buffer).toBeInstanceOf(ArrayBuffer);
    }
  });
});

describe("triad against the real frames, a physical check", () => {
  const dir = framesDataDirectory();
  const bytes = (file: string): ArrayBuffer => {
    const b = readFileSync(join(dir, file));
    return b.buffer.slice(
      b.byteOffset,
      b.byteOffset + b.byteLength,
    ) as ArrayBuffer;
  };
  const leapSeconds = LeapSeconds.builtIn();
  const frames = createFrames({
    leapSeconds,
    eop: EarthOrientationParameters.fromCelestrakCsv(
      readFileSync(join(dir, "EOP-All.csv"), "utf8"),
    ),
    ephemeris: Ephemeris.fromPacks(
      bytes("planets-de440-2000-2050.pack"),
      bytes("moon-pa-de440-2000-2050.pack"),
    ),
    warnings: [],
  });

  it("GCRF's z axis lands within 0.5 degrees of ITRF's z axis in 2026 (the pole has moved about 0.15 degrees since J2000)", () => {
    const instant = Instant.fromUtc(Date.UTC(2026, 5, 1, 12), leapSeconds);
    const L = 1000;
    const g = triad(frames, frames.gcrf, instant, L);
    const tip = vertex(g, 5);
    const z = sub(tip, vertex(g, 4)).map((x) => x / L);
    // Precession (about 20 arcsec a year) plus nutation and polar motion.
    const degrees = (angle(z, [0, 0, 1]) * 180) / Math.PI;
    expect(degrees).toBeLessThan(0.5);
    expect(degrees).toBeGreaterThan(0.05);
    // x and y lie near the equatorial plane, rotated by the Earth's spin
    // (any angle), so their z components are small.
    for (const axis of [1, 3]) {
      const v = sub(vertex(g, axis), vertex(g, axis - 1));
      expect(Math.abs(v[2]! / L)).toBeLessThan(0.01);
    }
  });
});

describe("distortion skips only nodes PROJ has no scale at", () => {
  const options = { height: 0, contoursPpm: [], tissotRadius: 1000 };

  it("EPSG:3857 nodes at the pole (gridFactors throws there) are counted, and only the other nodes get an ellipse", () => {
    const f = frameOf(3857);
    // Northings of 0, 5e8 and 1e9 m: the last two are the pole to float64.
    const d = distortion(f, { min: [0, 0], max: [0, 1e9] }, 5e8, options);
    expect(d.skipped).toBeGreaterThan(0);
    expect(d.skipped).toBeLessThan(3);
    expect(d.tissot.positions.length / 3).toBe((3 - d.skipped) * 64);
    // The surviving node is the equator one, with a unit-sized ellipse.
    const first = vertex(d.tissot, 0);
    const centre = Array.from(f.toBodyFixed([0, 0, 0]));
    expect(norm(sub(first, centre))).toBeCloseTo(1000, 3);
  });

  // A frame whose first step throws the given RangeError at one node.
  const throwing = (message: string, northing: number) => {
    const f = frameOf(32610);
    return Object.create(f, {
      projected: {
        value: (design: ArrayLike<number>) => {
          if (design[1] === northing) {
            throw new RangeError(message);
          }
          return f.projected(design);
        },
      },
    }) as EngineeringFrame;
  };
  const extent = { min: [500_000, 4_000_000], max: [500_000, 4_200_000] } as {
    min: [number, number];
    max: [number, number];
  };

  it("each of the three gridFactors messages skips its node", () => {
    for (const message of [
      "gridFactors: (1, 2) is outside the projection's domain",
      "gridFactors: (1, 2) is at a pole, where X's scales are not defined",
      "gridFactors: PROJ has no scale factor at (1, 2): a singular point of the projection",
    ]) {
      const d = distortion(
        throwing(message, 4_100_000),
        extent,
        100_000,
        options,
      );
      expect(d.skipped).toBe(1);
      expect(d.tissot.positions.length / 3).toBe(2 * 64);
    }
  });

  it("a RangeError with any other message is rethrown, not counted", () => {
    expect(() =>
      distortion(
        throwing("something else went wrong", 4_100_000),
        extent,
        100_000,
        options,
      ),
    ).toThrow(/something else went wrong/);
  });
});
