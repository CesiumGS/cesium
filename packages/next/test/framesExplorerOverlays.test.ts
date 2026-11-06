// The frames explorer's overlay geometry (examples/frames-explorer/overlays.ts)
// over synthetic frames and stub design frames: the builders are pure, so
// everything here is checked against hand computations. The PROJ-backed cases
// (a real EngineeringFrame, Tissot's indicatrix, rigid against exact) are in
// test/data/framesExplorerOverlays.test.ts.
import { describe, expect, it } from "vitest";
import {
  AXIS_COLORS,
  MARKER_COLORS,
  contourSegments,
  dashedLine,
  designGrid,
  overlayMesh,
  polyline,
  roundTripMarkers,
  segments,
  adaptivePath,
  trajectoryPath,
  triad,
  trueNorthLines,
  type DesignFrameLike,
} from "../examples/frames-explorer/overlays.ts";
import { Frame, frameTransform } from "../src/frames/Frame.ts";
import { createFrames } from "../src/frames/frames.ts";
import { rotationPart, toParentMatrix } from "../src/frames/matrix.ts";
import { frameBias } from "../src/time/erfa/bias.ts";
import { Ellipsoid } from "../src/math/ellipsoid.ts";
import { Instant } from "../src/time/Instant.ts";
import type { Trajectory } from "../src/trajectory/Trajectory.ts";
import { SAMPLE, syntheticFrameData } from "./syntheticFrames.ts";

const frames = createFrames(syntheticFrameData(SAMPLE));

// The bias cases need frames with realistic edges, which the synthetic
// ephemeris does not give: EARTH_ICRF a root, EME2000 turned from it by the
// IAU 2006 frame bias, and ITRF a fixed rotation (about an arbitrary axis) of it.
const scene = (() => {
  const earthIcrf = Frame.root("EARTH_ICRF");
  const eme2000 = Frame.constant(
    "EME2000",
    earthIcrf,
    toParentMatrix(frameBias(), undefined, new Float64Array(16)),
  );
  const a = [0.36, 0.48, 0.8]; // a unit axis
  const phi = 0.7;
  const c = Math.cos(phi);
  const s = Math.sin(phi);
  const t = 1 - c;
  // Column-major rotation about `a`, ITRF to EARTH_ICRF.
  const m = [
    c + t * a[0]! * a[0]!,
    t * a[0]! * a[1]! + s * a[2]!,
    t * a[0]! * a[2]! - s * a[1]!,
    0,
    t * a[0]! * a[1]! - s * a[2]!,
    c + t * a[1]! * a[1]!,
    t * a[1]! * a[2]! + s * a[0]!,
    0,
    t * a[0]! * a[2]! + s * a[1]!,
    t * a[1]! * a[2]! - s * a[0]!,
    c + t * a[2]! * a[2]!,
    0,
    1000,
    2000,
    3000,
    1,
  ];
  const itrf = Frame.constant("ITRF", earthIcrf, m);
  return { earthIcrf, eme2000, itrf };
})();
const vertex = (g: { positions: Float64Array }, i: number) =>
  Array.from(g.positions.subarray(3 * i, 3 * i + 3));

describe("triad (Review Focus 3: transposition)", () => {
  const instant = Instant.fromTdb(60);
  const L = 1000;

  it("ITRF's axes are the identity directions, in the engine's axis colors", () => {
    const g = triad(frames, frames.itrf, instant, L);
    expect(g.positions).toBeInstanceOf(Float64Array);
    expect(g.colors).toBeInstanceOf(Uint8Array);
    expect(g.positions.length).toBe(18);
    expect(g.colors.length).toBe(24);
    for (let axis = 0; axis < 3; axis++) {
      expect(vertex(g, 2 * axis)).toEqual([0, 0, 0]);
      const tip = [0, 0, 0];
      tip[axis] = L;
      expect(vertex(g, 2 * axis + 1)).toEqual(tip);
      for (const v of [2 * axis, 2 * axis + 1]) {
        expect(Array.from(g.colors.subarray(4 * v, 4 * v + 4))).toEqual([
          ...AXIS_COLORS[axis]!,
        ]);
      }
    }
  });

  it("GCRF's axes are the columns of the rotation part of frameTransform(gcrf, itrf)", () => {
    const g = triad(frames, frames.gcrf, instant, L);
    const m = frameTransform(frames.gcrf, frames.itrf, instant);
    const R = rotationPart(m); // row-major: v_itrf = R v_gcrf
    for (let axis = 0; axis < 3; axis++) {
      // Column `axis` of R: R[row * 3 + axis].
      const column = [R[axis]!, R[3 + axis]!, R[6 + axis]!];
      const origin = vertex(g, 2 * axis);
      const tip = vertex(g, 2 * axis + 1);
      for (let i = 0; i < 3; i++) {
        // The origin is the frame's origin in ITRF: the matrix's translation.
        expect(origin[i]).toBeCloseTo(m[12 + i]!, 12);
        expect((tip[i]! - origin[i]!) / L).toBeCloseTo(column[i]!, 12);
      }
    }
    // The transposed (row) reading is a different direction: the test would
    // catch a builder that used it.
    const row = [R[0]!, R[1]!, R[2]!];
    const x = vertex(g, 1);
    const o = vertex(g, 0);
    expect(Math.abs((x[1]! - o[1]!) / L - row[1]!)).toBeGreaterThan(1e-6);
  });

  it("puts a frame whose origin is far away at that origin, to float64", () => {
    const moon = Frame.constant(
      "FAR",
      scene.earthIcrf,
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 3.8440004567e8, -1.5e7, 2.2e7, 1],
    );
    const g = triad(scene, moon, instant, L);
    const m = frameTransform(moon, scene.itrf, instant);
    expect(vertex(g, 0)).toEqual([m[12]!, m[13]!, m[14]!]);
    expect(Math.abs(vertex(g, 0)[0]!)).toBeGreaterThan(1e8);
    // The tip is L away from it along the first column, at that magnitude.
    expect(
      Math.hypot(...vertex(g, 1).map((x, i) => x - vertex(g, 0)[i]!)),
    ).toBeCloseTo(L, 6);
  });

  describe("the frame bias, exaggerated for display only (R4)", () => {
    // The angle of the rotation taking one triad's axes to another's.
    const axes = (g: { positions: Float64Array }) => {
      const out: number[][] = [];
      for (let axis = 0; axis < 3; axis++) {
        const o = vertex(g, 2 * axis);
        const t = vertex(g, 2 * axis + 1);
        out.push([0, 1, 2].map((i) => (t[i]! - o[i]!) / L));
      }
      return out; // rows are the axes (columns of R)
    };
    function relativeAngle(a: number[][], b: number[][]): number {
      // Rrel = Aᵀ B with A, B having the axes as columns: Rrel[i][j] = a_i · b_j
      const dot = (u: number[], v: number[]) =>
        u[0]! * v[0]! + u[1]! * v[1]! + u[2]! * v[2]!;
      const r = (i: number, j: number) => dot(a[i]!, b[j]!);
      const sin =
        Math.hypot(r(2, 1) - r(1, 2), r(0, 2) - r(2, 0), r(1, 0) - r(0, 1)) / 2;
      return Math.atan2(sin, (r(0, 0) + r(1, 1) + r(2, 2) - 1) / 2);
    }

    // The bias itself: the rotation of EME2000 against EARTH_ICRF.
    const bias = (() => {
      const R = rotationPart(
        frameTransform(scene.eme2000, scene.earthIcrf, instant),
      );
      const sin = Math.hypot(R[7]! - R[5]!, R[2]! - R[6]!, R[3]! - R[1]!) / 2;
      return Math.atan2(sin, (R[0]! + R[4]! + R[8]! - 1) / 2);
    })();

    it("is about 23 mas (the plan's frame bias)", () => {
      expect(bias).toBeGreaterThan(1.0e-7);
      expect(bias).toBeLessThan(1.3e-7);
    });

    it("1 is the true frame; k rotates the axes by (k - 1) times the bias about the bias's own axis", () => {
      const plain = triad(scene, scene.eme2000, instant, L);
      const one = triad(scene, scene.eme2000, instant, L, {
        biasExaggeration: 1,
      });
      for (let i = 0; i < plain.positions.length; i++) {
        expect(one.positions[i]).toBeCloseTo(plain.positions[i]!, 6);
      }
      for (const k of [1000, 1e5]) {
        const big = triad(scene, scene.eme2000, instant, L, {
          biasExaggeration: k,
        });
        const angle = relativeAngle(axes(plain), axes(big));
        expect(angle / ((k - 1) * bias)).toBeCloseTo(1, 6);
      }
    });

    it("leaves the origin, and every other frame, alone", () => {
      const k = triad(scene, scene.eme2000, instant, L, {
        biasExaggeration: 1e6,
      });
      const plain = triad(scene, scene.eme2000, instant, L);
      expect(vertex(k, 0)).toEqual(vertex(plain, 0));
      const g = triad(frames, frames.gcrf, instant, L, {
        biasExaggeration: 1e6,
      });
      expect(g.positions).toEqual(
        triad(frames, frames.gcrf, instant, L).positions,
      );
    });
  });
});

/**
 * A design frame that maps (E, N, height) to a spherical body-fixed position
 * of radius 6.4e6 m, with E, N in meters from (lon0, lat0): enough to check
 * what the builders sample, without PROJ.
 */
const R_STUB = 6.4e6;
const sphere = new Ellipsoid(R_STUB, R_STUB, R_STUB);
const stub: DesignFrameLike = {
  body: { ellipsoid: sphere },
  toGeodetic(design) {
    const [e, n, h] = [design[0]!, design[1]!, design[2] ?? 0];
    return {
      longitude: 0.3 + e / (R_STUB * Math.cos(0.5)),
      latitude: 0.5 + n / R_STUB,
      height: h,
    };
  },
  toBodyFixed(design, out = new Float64Array(3)) {
    return sphere.cartographicToCartesian(stub.toGeodetic(design), out);
  },
};

describe("designGrid", () => {
  const extent = {
    min: [100, 200] as [number, number],
    max: [400, 300] as [number, number],
  };

  it("has the vertex count its extent, step and segment give", () => {
    // E lines at 100, 200, 300, 400 (4), each over N 200..300 in 4 segments of 25;
    // N lines at 200, 300 (2), each over E 100..400 in 12 segments of 25.
    const g = designGrid(stub, extent, 100, 25);
    const eLines = 4;
    const nLines = 2;
    expect(g.positions.length / 3).toBe(2 * (eLines * 4 + nLines * 12));
    expect(g.colors.length / 4).toBe(g.positions.length / 3);
  });

  it("every vertex is toBodyFixed of its grid E and N, height 0", () => {
    const g = designGrid(stub, extent, 100, 25);
    const expected: [number, number][] = [];
    // E lines first (ascending E), each as segment pairs along N; then N lines.
    for (const e of [100, 200, 300, 400]) {
      for (let s = 0; s < 4; s++) {
        expected.push([e, 200 + 25 * s], [e, 200 + 25 * (s + 1)]);
      }
    }
    for (const n of [200, 300]) {
      for (let s = 0; s < 12; s++) {
        expected.push([100 + 25 * s, n], [100 + 25 * (s + 1), n]);
      }
    }
    expect(g.positions.length / 3).toBe(expected.length);
    expected.forEach(([e, n], i) => {
      const want = stub.toBodyFixed([e, n, 0]);
      const got = vertex(g, i);
      for (let c = 0; c < 3; c++) {
        expect(Math.abs(got[c]! - want[c]!)).toBeLessThan(1e-9);
      }
    });
  });

  it("leaves out every skipEvery-th line from the extent's corner (the minor lines without the major)", () => {
    // Lines every 50: E 100, 150, ..., 400 (7), N 200, 250, 300 (3). Every
    // second one from the corner (100, 200) is a major line: left out.
    const g = designGrid(stub, extent, 50, 25, { skipEvery: 2 });
    const expected: [number, number][] = [];
    for (const e of [150, 250, 350]) {
      for (let s = 0; s < 4; s++) {
        expected.push([e, 200 + 25 * s], [e, 200 + 25 * (s + 1)]);
      }
    }
    for (const n of [250]) {
      for (let s = 0; s < 12; s++) {
        expected.push([100 + 25 * s, n], [100 + 25 * (s + 1), n]);
      }
    }
    expect(g.positions.length / 3).toBe(expected.length);
    expected.forEach(([e, n], i) => {
      const want = stub.toBodyFixed([e, n, 0]);
      const got = vertex(g, i);
      for (let c = 0; c < 3; c++) {
        expect(Math.abs(got[c]! - want[c]!)).toBeLessThan(1e-9);
      }
    });
    expect(() => designGrid(stub, extent, 50, 25, { skipEvery: 0.5 })).toThrow(
      /skipEvery/,
    );
  });

  it("rounds a segment that does not divide the extent up, ending exactly on the extent", () => {
    const g = designGrid(stub, { min: [0, 0], max: [100, 0] }, 100, 30);
    // The N line over E 0..100: ceil(100 / 30) = 4 segments, the last ending at 100.
    const last = g.positions.length / 3 - 1;
    const want = stub.toBodyFixed([100, 0, 0]);
    for (let c = 0; c < 3; c++) {
      expect(Math.abs(vertex(g, last)[c]! - want[c]!)).toBeLessThan(1e-9);
    }
  });

  it("rejects a step or segment that is not a positive number", () => {
    expect(() => designGrid(stub, extent, 0, 25)).toThrow(/step/);
    expect(() => designGrid(stub, extent, 100, -1)).toThrow(/segment/);
    expect(() => designGrid(stub, extent, NaN, 25)).toThrow(/step/);
  });
});

describe("trueNorthLines", () => {
  it("every vertex of a meridian has its line's longitude to 1e-12 rad", () => {
    const extent = {
      min: [100, 200] as [number, number],
      max: [400, 5200] as [number, number],
    };
    const g = trueNorthLines(stub, extent, 100, 500);
    // One meridian per grid E: 100, 200, 300, 400; 10 segments each.
    expect(g.positions.length / 3).toBe(4 * 10 * 2);
    for (let i = 0; i < g.positions.length / 3; i++) {
      const line = Math.floor(i / 20);
      const want = stub.toGeodetic([100 + 100 * line, 200, 0]).longitude;
      const [x, y] = vertex(g, i);
      expect(Math.abs(Math.atan2(y!, x!) - want)).toBeLessThan(1e-12);
    }
  });

  it("spans the latitudes of the grid line it starts on, on the surface (height 0)", () => {
    const extent = {
      min: [100, 200] as [number, number],
      max: [100, 5200] as [number, number],
    };
    const g = trueNorthLines(stub, extent, 100, 5000);
    const first = vertex(g, 0);
    const last = vertex(g, g.positions.length / 3 - 1);
    const lat = (v: number[]) => Math.atan2(v[2]!, Math.hypot(v[0]!, v[1]!));
    // The stub's body is a sphere, so geocentric latitude is geodetic.
    expect(lat(first)).toBeCloseTo(stub.toGeodetic([100, 200, 0]).latitude, 12);
    expect(lat(last)).toBeCloseTo(stub.toGeodetic([100, 5200, 0]).latitude, 12);
  });
});

describe("trueNorthLines' convergence exaggeration (F32)", () => {
  const extent = {
    min: [100, 200] as [number, number],
    max: [400, 5200] as [number, number],
  };

  it("draws the true line at 1, the default", () => {
    const a = trueNorthLines(stub, extent, 100, 500);
    const b = trueNorthLines(stub, extent, 100, 500, { exaggeration: 1 });
    expect(Array.from(b.positions)).toEqual(Array.from(a.positions));
  });

  it("leans each vertex from the grid line k times its true offset", () => {
    const k = 20;
    const truth = trueNorthLines(stub, extent, 100, 500);
    const leaned = trueNorthLines(stub, extent, 100, 500, { exaggeration: k });
    expect(leaned.positions.length).toBe(truth.positions.length);
    // Line 0 (E 100), 10 segments: vertex 2s + 1 is sample s + 1.
    for (let s = 0; s < 10; s++) {
      const i = 2 * s + 1;
      const grid = stub.toBodyFixed([100, 200 + 500 * (s + 1), 0]);
      const t = vertex(truth, i);
      const l = vertex(leaned, i);
      for (let c = 0; c < 3; c++) {
        const want = grid[c]! + k * (t[c]! - grid[c]!);
        expect(Math.abs(l[c]! - want)).toBeLessThan(1e-6);
      }
    }
    // It starts where the grid line does: the lean is zero at min N.
    const start = stub.toBodyFixed([100, 200, 0]);
    const first = vertex(leaned, 0);
    for (let c = 0; c < 3; c++) {
      expect(Math.abs(first[c]! - start[c]!)).toBeLessThan(1e-6);
    }
  });

  it("rejects a factor that is not positive", () => {
    expect(() =>
      trueNorthLines(stub, extent, 100, 500, { exaggeration: 0 }),
    ).toThrow(/exaggeration/);
  });
});

describe("roundTripMarkers", () => {
  it("colors a result green at 0.05 x tolerance, amber at 0.5 x and red at 2 x", () => {
    const tolerance = 1e-4;
    const g = roundTripMarkers(
      [
        { position: [1e6, 2e6, 3e6], error: 0.05 * tolerance, tolerance },
        { position: [1e6, 2e6, 3e6], error: 0.5 * tolerance, tolerance },
        { position: [1e6, 2e6, 3e6], error: 2 * tolerance, tolerance },
      ],
      10,
    );
    // Three axes of two vertices each, per marker.
    expect(g.positions.length / 3).toBe(18);
    const colorOf = (marker: number) =>
      Array.from(g.colors.subarray(4 * 6 * marker, 4 * 6 * marker + 4));
    expect(colorOf(0)).toEqual([...MARKER_COLORS.green]);
    expect(colorOf(1)).toEqual([...MARKER_COLORS.amber]);
    expect(colorOf(2)).toEqual([...MARKER_COLORS.red]);
    expect(new Set([colorOf(0), colorOf(1), colorOf(2)].map(String)).size).toBe(
      3,
    );
    // Every vertex of a marker has its marker's color.
    for (let v = 0; v < 6; v++) {
      expect(
        Array.from(g.colors.subarray(4 * (12 + v), 4 * (12 + v) + 4)),
      ).toEqual(colorOf(2));
    }
  });

  it("draws a cross of the given size, centered on the position", () => {
    const g = roundTripMarkers(
      [{ position: [1e6, 2e6, 3e6], error: 0, tolerance: 1 }],
      10,
    );
    expect(vertex(g, 0)).toEqual([1e6 - 5, 2e6, 3e6]);
    expect(vertex(g, 1)).toEqual([1e6 + 5, 2e6, 3e6]);
    expect(vertex(g, 2)).toEqual([1e6, 2e6 - 5, 3e6]);
    expect(vertex(g, 5)).toEqual([1e6, 2e6, 3e6 + 5]);
  });

  it("the boundaries: exactly 0.1 x tolerance is green, exactly the tolerance amber", () => {
    const g = roundTripMarkers(
      [
        { position: [0, 0, 0], error: 0.1, tolerance: 1 },
        { position: [0, 0, 0], error: 1, tolerance: 1 },
        { position: [0, 0, 0], error: NaN, tolerance: 1 },
      ],
      1,
    );
    const colorOf = (marker: number) =>
      Array.from(g.colors.subarray(4 * 6 * marker, 4 * 6 * marker + 4));
    expect(colorOf(0)).toEqual([...MARKER_COLORS.green]);
    expect(colorOf(1)).toEqual([...MARKER_COLORS.amber]);
    // An error that is not a number is never shown as passing.
    expect(colorOf(2)).toEqual([...MARKER_COLORS.red]);
  });
});

describe("contourSegments (marching squares)", () => {
  // f(x, y) = 2x + 3y on a 4 x 4 grid of unit spacing, origin (0, 0).
  const nx = 4;
  const ny = 4;
  const field = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      field[j * nx + i] = 2 * i + 3 * j;
    }
  }

  it("puts the contour of a linear field at its hand-computed positions", () => {
    const level = 5.5;
    const s = contourSegments(field, nx, ny, [0, 0], [1, 1], level);
    // 2x + 3y = 5.5 crosses y=0 at x=2.75, y=1 at x=1.25, x=0 at y=11/6, and
    // the cell edges x=1, x=2 at y=7/6, y=1/2: four segments.
    const expected: [number, number, number, number][] = [
      [2.75, 0, 2, 0.5],
      [2, 0.5, 1.25, 1],
      [1.25, 1, 1, 7 / 6],
      [1, 7 / 6, 0, 11 / 6],
    ];
    expect(s.length).toBe(4 * expected.length);
    const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
    for (const [ax, ay, bx, by] of expected) {
      let found = false;
      for (let k = 0; k < s.length; k += 4) {
        const [px, py, qx, qy] = [s[k]!, s[k + 1]!, s[k + 2]!, s[k + 3]!];
        if (
          (near(px, ax) && near(py, ay) && near(qx, bx) && near(qy, by)) ||
          (near(px, bx) && near(py, by) && near(qx, ax) && near(qy, ay))
        ) {
          found = true;
        }
      }
      expect(found, `segment (${ax}, ${ay}) to (${bx}, ${by})`).toBe(true);
    }
    // And every endpoint is on the level set, to rounding.
    for (let k = 0; k < s.length; k += 2) {
      expect(Math.abs(2 * s[k]! + 3 * s[k + 1]! - level)).toBeLessThan(1e-9);
    }
  });

  it("honors the grid's origin and spacing", () => {
    const unit = contourSegments(field, nx, ny, [0, 0], [1, 1], 5.5);
    const s = contourSegments(field, nx, ny, [10, 20], [2, 4], 5.5);
    // x = 10 + 2 i, y = 20 + 4 j: every endpoint of the unit grid's contour
    // (the field is the same samples) is scaled and shifted the same way.
    expect(s).toHaveLength(unit.length);
    for (let k = 0; k < unit.length; k += 2) {
      expect(s[k]).toBeCloseTo(10 + 2 * unit[k]!, 9);
      expect(s[k + 1]).toBeCloseTo(20 + 4 * unit[k + 1]!, 9);
    }
  });

  it("returns nothing where the level is outside the field, and skips NaN cells", () => {
    expect(contourSegments(field, nx, ny, [0, 0], [1, 1], 100)).toHaveLength(0);
    expect(contourSegments(field, nx, ny, [0, 0], [1, 1], -1)).toHaveLength(0);
    const holed = Float64Array.from(field);
    holed[5] = NaN;
    const s = contourSegments(holed, nx, ny, [0, 0], [1, 1], 5.5);
    // The four cells around node 5 are skipped; the others still contour.
    expect(s.length).toBeLessThan(4 * 4);
    expect(s.every(Number.isFinite)).toBe(true);
  });

  it("joins a saddle consistently (no segment is lost)", () => {
    // One cell, diagonal corners high: 1 0 / 0 1, level 0.5: two segments.
    const saddle = Float64Array.from([1, 0, 0, 1]);
    expect(contourSegments(saddle, 2, 2, [0, 0], [1, 1], 0.5)).toHaveLength(8);
  });
});

describe("trajectoryPath", () => {
  // An inertial frame I; a trajectory frame T moving at V (m/s) in I; a frame
  // Rot rotating about I's z at W rad/s; ITRF a fixed translation of I.
  const I = Frame.root("I");
  const V = [1000, 2000, 500];
  const W = 1e-3;
  const OFFSET = [1e6, 2e6, 3e6];
  const GAP = [2.5, 3.5];
  const trajectoryFrame = new Frame(
    "T",
    I,
    (instant, out) => {
      const t = instant.tdb();
      if (t > GAP[0]! && t < GAP[1]!) {
        throw new Error("the trajectory's state was read inside its gap");
      }
      out.fill(0);
      out[0] = out[5] = out[10] = out[15] = 1;
      out[12] = V[0]! * t;
      out[13] = V[1]! * t;
      out[14] = V[2]! * t;
    },
    { cache: false },
  );
  const trajectory = {
    frame: trajectoryFrame,
    contains: (instant: Instant) =>
      !(instant.tdb() > GAP[0]! && instant.tdb() < GAP[1]!),
  } as Pick<Trajectory, "frame" | "contains"> as Trajectory;
  const rot = new Frame(
    "Rot",
    I,
    (instant, out) => {
      const c = Math.cos(W * instant.tdb());
      const s = Math.sin(W * instant.tdb());
      out.fill(0);
      // Column-major: Rot -> I is a rotation about z by W t.
      out[0] = c;
      out[1] = s;
      out[4] = -s;
      out[5] = c;
      out[10] = 1;
      out[15] = 1;
    },
    { cache: false },
  );
  const itrf = Frame.constant("ITRF", I, [
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    OFFSET[0]!,
    OFFSET[1]!,
    OFFSET[2]!,
    1,
  ]);
  const fakeFrames = { itrf } as Pick<typeof frames, "itrf"> as typeof frames;
  const t0 = Instant.fromTdb(0);
  const t1 = Instant.fromTdb(5);
  const at = Instant.fromTdb(1000);

  // Hand computation: p in I at s is V s. ITRF = I - OFFSET.
  const inertial = (s: number) => V.map((v, i) => v * s - OFFSET[i]!);
  // In Rot at s: Rz(-W s) V s. Rot's placement at `at`: ITRF = Rz(W at) p - OFFSET.
  const rotating = (s: number) => {
    const p = V.map((v) => v * s);
    const a = -W * s;
    const q = [
      Math.cos(a) * p[0]! - Math.sin(a) * p[1]!,
      Math.sin(a) * p[0]! + Math.cos(a) * p[1]!,
      p[2]!,
    ];
    const b = W * at.tdb();
    return [
      Math.cos(b) * q[0]! - Math.sin(b) * q[1]! - OFFSET[0]!,
      Math.sin(b) * q[0]! + Math.cos(b) * q[1]! - OFFSET[1]!,
      q[2]! - OFFSET[2]!,
    ];
  };
  // Samples 0, 1, 2, [3 in the gap], 4, 5: segments (0,1), (1,2), (4,5).
  const SAMPLES = [0, 1, 2, 4, 5];
  const SEGMENTS: [number, number][] = [
    [0, 1],
    [1, 2],
    [3, 4],
  ];

  function check(
    g: { positions: Float64Array },
    expected: (s: number) => number[],
  ) {
    expect(g.positions.length / 3).toBe(2 * SEGMENTS.length);
    SEGMENTS.forEach(([a, b], k) => {
      for (const [v, s] of [
        [2 * k, SAMPLES[a]!],
        [2 * k + 1, SAMPLES[b]!],
      ] as const) {
        const want = expected(s);
        const got = vertex(g, v);
        for (let c = 0; c < 3; c++) {
          expect(Math.abs(got[c]! - want[c]!)).toBeLessThan(1e-6);
        }
      }
    });
  }

  it("draws in the inertial frame, matching a hand computation at three samples", () => {
    const g = trajectoryPath(trajectory, I, fakeFrames, t0, t1, 1, at);
    check(g, inertial);
  });

  it("draws in the rotating frame, a different path that also matches by hand", () => {
    const g = trajectoryPath(trajectory, rot, fakeFrames, t0, t1, 1, at);
    check(g, rotating);
    const inertialPath = trajectoryPath(
      trajectory,
      I,
      fakeFrames,
      t0,
      t1,
      1,
      at,
    );
    expect(g.positions).not.toEqual(inertialPath.positions);
    // Samples 1 and 5 differ by hundreds of meters at least.
    const rotated = vertex(g, 1);
    const plain = vertex(inertialPath, 1);
    expect(Math.hypot(...rotated.map((x, i) => x - plain[i]!))).toBeGreaterThan(
      10,
    );
  });

  it("skips samples in a gap without throwing, and draws no segment across it", () => {
    expect(() =>
      trajectoryPath(trajectory, I, fakeFrames, t0, t1, 0.5, at),
    ).not.toThrow();
    const g = trajectoryPath(trajectory, I, fakeFrames, t0, t1, 1, at);
    // No vertex is the sample at 3 s (inside the gap).
    const gapPoint = inertial(3);
    for (let i = 0; i < g.positions.length / 3; i++) {
      const v = vertex(g, i);
      expect(Math.hypot(...v.map((x, c) => x - gapPoint[c]!))).toBeGreaterThan(
        1,
      );
    }
    expect(g.colors.length / 4).toBe(g.positions.length / 3);
  });

  it("a path entirely in a gap is empty", () => {
    const g = trajectoryPath(
      trajectory,
      I,
      fakeFrames,
      Instant.fromTdb(2.6),
      Instant.fromTdb(3.4),
      0.1,
      at,
    );
    expect(g.positions).toHaveLength(0);
  });

  it("rejects a step that is not positive", () => {
    expect(() =>
      trajectoryPath(trajectory, I, fakeFrames, t0, t1, 0, at),
    ).toThrow(/step/);
  });
});

describe("adaptivePath (Orion's drawing: finer near perigee, within a budget)", () => {
  // A Kepler ellipse in an inertial root I (ITRF = I): a = 1e8 m, e = 0.9,
  // period 1e5 s, perigee at t = 0. Its speed at perigee is about 19 times
  // its speed at apogee, so a uniform step that suits apogee facets perigee.
  const I = Frame.root("I");
  const A = 1e8;
  const E = 0.9;
  const PERIOD = 1e5;
  const B = A * Math.sqrt(1 - E * E);
  const kepler = (t: number): number[] => {
    const M = ((2 * Math.PI) / PERIOD) * t;
    let ecc = M;
    for (let k = 0; k < 60; k++) {
      ecc -= (ecc - E * Math.sin(ecc) - M) / (1 - E * Math.cos(ecc));
    }
    return [A * (Math.cos(ecc) - E), B * Math.sin(ecc), 0];
  };
  const GAP = [20_000, 21_000];
  const inGap = (t: number) => t > GAP[0]! && t < GAP[1]!;
  let evaluations = 0;
  const orbitFrame = new Frame(
    "K",
    I,
    (instant, out) => {
      const t = instant.tdb();
      if (inGap(t)) {
        throw new Error("the trajectory's state was read inside its gap");
      }
      evaluations++;
      const p = kepler(t);
      out.fill(0);
      out[0] = out[5] = out[10] = out[15] = 1;
      out[12] = p[0]!;
      out[13] = p[1]!;
      out[14] = p[2]!;
    },
    { cache: false },
  );
  // Its data spans, in TDB seconds, as a Trajectory's `spans`.
  const trajectory = {
    frame: orbitFrame,
    contains: (instant: Instant) => !inGap(instant.tdb()),
    spans: [
      [-PERIOD, GAP[0]!],
      [GAP[1]!, PERIOD],
    ],
  } as Pick<Trajectory, "frame" | "contains" | "spans"> as Trajectory;
  const itrf = Frame.constant(
    "ITRF",
    I,
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  );
  const fakeFrames = { itrf } as Pick<typeof frames, "itrf"> as typeof frames;
  // Half an orbit either side of perigee (t = -5e4 .. 5e4 s).
  const t0 = Instant.fromTdb(-PERIOD / 2);
  const t1 = Instant.fromTdb(PERIOD / 2);
  const at = Instant.fromTdb(0);
  const TOLERANCE = 1e-3;
  const options = {
    step: 2000,
    tolerance: TOLERANCE,
    minStep: 1,
    maxSamples: 100_000,
  };
  const dist = (a: number[], b: number[]) =>
    Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);
  /** Each segment's worst departure from the curve, against the tolerance at its midpoint (1 = at the limit). */
  const departures = (g: { positions: Float64Array }, times: Float64Array) => {
    const out: { ratio: number; dt: number; r: number }[] = [];
    for (let v = 0; v < times.length; v += 2) {
      const ta = times[v]!;
      const tb = times[v + 1]!;
      const pa = vertex(g, v);
      const pb = vertex(g, v + 1);
      let worst = 0;
      for (const f of [0.25, 0.5, 0.75]) {
        const t = ta + f * (tb - ta);
        const chord = pa.map((x, c) => x + f * (pb[c]! - x));
        worst = Math.max(worst, dist(chord, kepler(t)));
      }
      const r = Math.hypot(...kepler((ta + tb) / 2));
      out.push({ ratio: worst / (TOLERANCE * r), dt: tb - ta, r });
    }
    return out;
  };

  it("puts every vertex on the path, at its own time", () => {
    const g = adaptivePath(trajectory, I, fakeFrames, t0, t1, options, at);
    expect(g.times.length).toBe(g.positions.length / 3);
    expect(g.colors.length / 4).toBe(g.positions.length / 3);
    for (let v = 0; v < g.times.length; v++) {
      expect(dist(vertex(g, v), kepler(g.times[v]!))).toBeLessThan(1e-6);
    }
  });

  it("keeps every segment within the tolerance of the curve, where a uniform step doesn't", () => {
    const g = adaptivePath(trajectory, I, fakeFrames, t0, t1, options, at);
    const d = departures(g, g.times);
    expect(Math.max(...d.map((x) => x.ratio))).toBeLessThanOrEqual(1);
    expect(g.sampling.capped).toBeUndefined();
    // The same coarse step, uniform: faceted near perigee.
    const uniform = trajectoryPath(trajectory, I, fakeFrames, t0, t1, 2000, at);
    const times = Float64Array.from(
      { length: uniform.positions.length / 3 },
      (_, v) => -PERIOD / 2 + 2000 * (Math.floor(v / 2) + (v % 2)),
    );
    expect(
      Math.max(...departures(uniform, times).map((x) => x.ratio)),
    ).toBeGreaterThan(10);
  });

  it("steps finer near perigee than near apogee", () => {
    const g = adaptivePath(trajectory, I, fakeFrames, t0, t1, options, at);
    const d = departures(g, g.times);
    const near = d.filter((x) => x.r < 2 * A * (1 - E));
    const far = d.filter((x) => x.r > 0.9 * A * (1 + E));
    expect(near.length).toBeGreaterThan(0);
    expect(far.length).toBeGreaterThan(0);
    const longest = (xs: typeof d) => Math.max(...xs.map((x) => x.dt));
    expect(longest(near) * 10).toBeLessThan(longest(far));
    expect(g.sampling.finest).toBe(Math.min(...d.map((x) => x.dt)));
  });

  it("stops at its sample budget, and says so", () => {
    evaluations = 0;
    const g = adaptivePath(
      trajectory,
      I,
      fakeFrames,
      t0,
      t1,
      { ...options, maxSamples: 120 },
      at,
    );
    expect(evaluations).toBeLessThanOrEqual(120);
    expect(g.sampling.samples).toBeLessThanOrEqual(120);
    expect(g.sampling.capped).toBe("samples");
    // Still the whole path: the coarse samples come first.
    expect(Math.min(...g.times)).toBe(-PERIOD / 2);
    expect(Math.max(...g.times)).toBe(PERIOD / 2);
  });

  it("stops at its time budget, and says so", () => {
    let clock = 0;
    const g = adaptivePath(
      trajectory,
      I,
      fakeFrames,
      t0,
      t1,
      // Each look at the clock is 1 ms later: the budget runs out at once.
      { ...options, budgetMs: 5, now: () => clock++ },
      at,
    );
    expect(g.sampling.capped).toBe("time");
    expect(Math.min(...g.times)).toBe(-PERIOD / 2);
    expect(Math.max(...g.times)).toBe(PERIOD / 2);
  });

  it("never draws across a gap, nor reads inside one", () => {
    const g = adaptivePath(trajectory, I, fakeFrames, t0, t1, options, at);
    for (let v = 0; v < g.times.length; v += 2) {
      const a = g.times[v]!;
      const b = g.times[v + 1]!;
      expect(inGap(a) || inGap(b) || (a <= GAP[0]! && b >= GAP[1]!)).toBe(
        false,
      );
    }
  });

  it("rejects a tolerance or step that is not positive", () => {
    expect(() =>
      adaptivePath(
        trajectory,
        I,
        fakeFrames,
        t0,
        t1,
        { ...options, tolerance: 0 },
        at,
      ),
    ).toThrow(/tolerance/);
    expect(() =>
      adaptivePath(
        trajectory,
        I,
        fakeFrames,
        t0,
        t1,
        { ...options, step: -1 },
        at,
      ),
    ).toThrow(/step/);
  });
});

describe("polyline", () => {
  it("turns n points into n - 1 segment pairs in one color", () => {
    const g = polyline(
      Float64Array.from([0, 0, 0, 1, 0, 0, 1, 1, 0]),
      [1, 2, 3, 255],
    );
    expect(Array.from(g.positions)).toEqual([
      0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0,
    ]);
    expect(Array.from(g.colors.subarray(0, 4))).toEqual([1, 2, 3, 255]);
    expect(g.colors.length).toBe(16);
  });
});

describe("dashedLine (the rigid line's dashes, as geometry: F30)", () => {
  it("cuts a straight line into pieces and keeps every other one, from the first", () => {
    const g = dashedLine([0, 0, 0], [10, 0, 0], 5, [255, 255, 255, 255]);
    // Pieces 0, 2 and 4 of five 2-unit pieces.
    expect(Array.from(g.positions)).toEqual([
      0, 0, 0, 2, 0, 0, 4, 0, 0, 6, 0, 0, 8, 0, 0, 10, 0, 0,
    ]);
    expect(g.colors.length).toBe(4 * 6);
  });

  it("keeps every dash on the line between its ends (straight in 3D)", () => {
    const a = [6_000_000, 2_000_000, 3_000_000];
    const b = [6_100_000, 2_300_000, 2_900_000];
    const g = dashedLine(a, b, 49, [1, 2, 3, 255]);
    const ab = b.map((v, i) => v - a[i]!);
    const len = Math.hypot(...ab);
    for (let v = 0; v < g.positions.length / 3; v++) {
      const ap = [0, 1, 2].map((c) => g.positions[3 * v + c]! - a[c]!);
      // The distance from the line: |ap × ab| / |ab|.
      const off =
        Math.hypot(
          ap[1]! * ab[2]! - ap[2]! * ab[1]!,
          ap[2]! * ab[0]! - ap[0]! * ab[2]!,
          ap[0]! * ab[1]! - ap[1]! * ab[0]!,
        ) / len;
      expect(off).toBeLessThan(1e-6);
    }
  });

  it("rejects a piece count that isn't a whole number, 1 or more", () => {
    expect(() => dashedLine([0, 0, 0], [1, 0, 0], 0, [0, 0, 0, 255])).toThrow(
      /pieces/,
    );
    expect(() => dashedLine([0, 0, 0], [1, 0, 0], 1.5, [0, 0, 0, 255])).toThrow(
      /pieces/,
    );
  });
});

describe("segments", () => {
  it("draws vertex pairs as they are, in one color", () => {
    const g = segments(
      Float64Array.from([0, 0, 0, 0, 0, 5, 1, 0, 0, 1, 0, 7]),
      [9, 9, 9, 255],
    );
    expect(Array.from(g.positions)).toEqual([
      0, 0, 0, 0, 0, 5, 1, 0, 0, 1, 0, 7,
    ]);
    expect(g.colors.length).toBe(16);
  });
});

describe("overlayMesh (what the adapter hands to World.addMesh)", () => {
  /** A short line at `center`, 1 km long. */
  const line = (center: number[]) => ({
    positions: Float64Array.from([
      center[0]! - 500,
      center[1]!,
      center[2]!,
      center[0]! + 500,
      center[1]! + 0.123456789,
      center[2]! + 0.5,
    ]),
    colors: Uint8Array.from([255, 0, 0, 255, 0, 128, 255, 255]),
  });

  for (const [name, center] of [
    ["Earth's surface", [6.378137123e6, 1.2e5, 3.4e5]],
    ["the Moon", [3.8440004567e8, 1.5e6, -2e6]],
  ] as const) {
    it(`keeps the large part in a float64 origin at ${name}, so float32 vertices do not jitter`, () => {
      const g = line([...center]);
      const { mesh, origin } = overlayMesh(g)[0]!;
      expect(mesh.topology).toBe("line-list");
      expect(mesh.positions).toBeInstanceOf(Float32Array);
      expect(Array.from(mesh.indices)).toEqual([0, 1]);
      // origin + vertex reconstructs the position to far better than float32
      // of the full coordinate would (0.5 m at the surface, 16 m at the Moon).
      let worst = 0;
      let naive = 0;
      for (let v = 0; v < 2; v++) {
        for (let c = 0; c < 3; c++) {
          worst = Math.max(
            worst,
            Math.abs(
              origin[c]! + mesh.positions[3 * v + c]! - g.positions[3 * v + c]!,
            ),
          );
          naive = Math.max(
            naive,
            Math.abs(
              Math.fround(g.positions[3 * v + c]!) - g.positions[3 * v + c]!,
            ),
          );
        }
      }
      expect(worst).toBeLessThan(1e-3);
      expect(naive).toBeGreaterThan(worst * 100);
      // The vertices themselves are small (kilometers), not Earth-sized.
      expect(
        Math.max(...Array.from(mesh.positions).map((x) => Math.abs(x))),
      ).toBeLessThan(1e3);
    });
  }

  it("converts sRGB bytes to the mesh's linear float colors", () => {
    const { mesh } = overlayMesh(line([6.378e6, 0, 0]))[0]!;
    const c = mesh.colors!;
    expect(c).toBeInstanceOf(Float32Array);
    expect(Array.from(c.subarray(0, 4))).toEqual([1, 0, 0, 1]);
    // 128 / 255 in sRGB is 0.2158605 linear.
    expect(c[5]).toBeCloseTo(0.2158605, 6);
    expect(Array.from(c.subarray(4, 8))).toEqual([0, c[5], 1, 1]);
  });

  it("is empty for empty geometry", () => {
    expect(
      overlayMesh({
        positions: new Float64Array(0),
        colors: new Uint8Array(0),
      }),
    ).toEqual([]);
  });

  describe("chunks long geometry so float32 offsets stay small", () => {
    // A polyline from near the Earth out past the Moon, 4e8 m long.
    const build = (stepM: number) => {
      const n = Math.round(4e8 / stepM);
      const points: number[] = [];
      const colors: number[] = [];
      const at = (i: number) => [
        6.4e6 + i * stepM,
        1234.567 + 3e5 * Math.sin(i / 700),
        -89.1 + 2e5 * Math.cos(i / 900),
      ];
      for (let i = 0; i < n; i++) {
        points.push(...at(i), ...at(i + 1));
        colors.push(10, 20, 30, 255, 10, 20, 30, 255);
      }
      return {
        n,
        at,
        g: {
          positions: Float64Array.from(points),
          colors: Uint8Array.from(colors),
        },
      };
    };
    const reassemble = (chunks: ReturnType<typeof overlayMesh>) =>
      chunks.flatMap(({ mesh, origin }) =>
        Array.from(mesh.positions).map((x, i) => origin[i % 3]! + x),
      );

    it("every chunk's local offsets are within 1e5 m, and the chunks reassemble the input to 1e-2 m", () => {
      const { g } = build(5e4);
      const chunks = overlayMesh(g);
      expect(chunks.length).toBeGreaterThan(3000);
      for (const { mesh } of chunks) {
        expect(mesh.topology).toBe("line-list");
        for (const x of mesh.positions) {
          expect(Math.abs(x)).toBeLessThanOrEqual(1e5);
        }
      }
      const back = reassemble(chunks);
      expect(back).toHaveLength(g.positions.length);
      let worst = 0;
      for (let i = 0; i < back.length; i++) {
        worst = Math.max(worst, Math.abs(back[i]! - g.positions[i]!));
      }
      expect(worst).toBeLessThanOrEqual(1e-2);
    });

    it("cuts a segment longer than a chunk, keeping its endpoints and total length", () => {
      const { g, n } = build(2e6);
      const chunks = overlayMesh(g);
      for (const { mesh } of chunks) {
        for (const x of mesh.positions) {
          expect(Math.abs(x)).toBeLessThanOrEqual(1e5);
        }
      }
      const back = reassemble(chunks);
      expect(back.length).toBeGreaterThan(g.positions.length);
      for (let c = 0; c < 3; c++) {
        expect(Math.abs(back[c]! - g.positions[c]!)).toBeLessThan(1e-2);
        expect(
          Math.abs(
            back[back.length - 3 + c]! -
              g.positions[g.positions.length - 3 + c]!,
          ),
        ).toBeLessThan(1e-2);
      }
      const length = (p: ArrayLike<number>) => {
        let total = 0;
        for (let i = 0; i + 5 < p.length; i += 6) {
          total += Math.hypot(
            p[i + 3]! - p[i]!,
            p[i + 4]! - p[i + 1]!,
            p[i + 5]! - p[i + 2]!,
          );
        }
        return total;
      };
      expect(Math.abs(length(back) - length(g.positions))).toBeLessThan(1);
      expect(n).toBe(200);
    });

    it("takes a larger extent for a path whose own accuracy is coarser (Orion: 1e7 m chunks)", () => {
      const { g } = build(5e4);
      const chunks = overlayMesh(g, { extent: 1e7 });
      // 4e8 m of path in chunks of at most 1e7 m: about 40, not 4,000.
      expect(chunks.length).toBeLessThan(60);
      expect(chunks.length).toBeGreaterThanOrEqual(40);
      for (const { mesh } of chunks) {
        for (const x of mesh.positions) {
          expect(Math.abs(x)).toBeLessThanOrEqual(5e6);
        }
      }
      // float32 offsets of up to 5e6 m: half-metre steps, well within the
      // path's own ±10 m.
      const back = reassemble(chunks);
      let worst = 0;
      for (let i = 0; i < back.length; i++) {
        worst = Math.max(worst, Math.abs(back[i]! - g.positions[i]!));
      }
      expect(worst).toBeLessThanOrEqual(0.5);
      expect(() => overlayMesh(g, { extent: 0 })).toThrow(/extent/);
    });

    it("the colors follow the chunks", () => {
      const chunks = overlayMesh(build(2e6).g);
      for (const { mesh } of chunks) {
        expect(mesh.colors!.length).toBe((mesh.positions.length / 3) * 4);
        expect(mesh.colors![3]).toBe(1);
      }
    });
  });

  it("rejects colors that do not match the vertices", () => {
    expect(() =>
      overlayMesh({
        positions: new Float64Array(6),
        colors: new Uint8Array(4),
      }),
    ).toThrow(/colors/);
    expect(() =>
      overlayMesh({
        positions: new Float64Array(9),
        colors: new Uint8Array(12),
      }),
    ).toThrow(/pairs/);
  });
});

describe("the builders are pure and worker-safe (R13)", () => {
  it("overlays.ts imports nothing but the library and imports no DOM or World at runtime", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(
      new URL("../examples/frames-explorer/overlays.ts", import.meta.url),
      "utf8",
    );
    // `World` may be imported as a type only: a worker never loads it.
    expect(source).not.toMatch(/import\s+(?!type\b)[^;]*scene\/World/);
    expect(source).not.toMatch(/\b(document|window|HTMLElement)\b/);
  });
});
