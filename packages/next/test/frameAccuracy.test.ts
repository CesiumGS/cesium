// A frame's stated accuracy and `pointAccuracy`, the first-order composer
// (Task 7b): every figure 1σ, rotation errors scaled by the lever arm,
// root-sum-square, and an unstated edge named, never dropped.
import { describe, expect, it } from "vitest";
import { Frame } from "../src/frames/Frame.ts";
import { NOT_STATED } from "../src/frames/frameAccuracy.ts";
import {
  BUILT_IN_ACCURACY,
  DE440_EARTH_MOON_METERS,
} from "../src/frames/frames.ts";
import { eastNorthUpFrame, framePoint } from "../src/frames/local.ts";
import { dominantTerm, pointAccuracy } from "../src/frames/pointAccuracy.ts";
import { Ellipsoid } from "../src/math/ellipsoid.ts";
import { Instant } from "../src/time/Instant.ts";

const instant = Instant.fromTdb(0);

/** A translation by `t` (column-major 4×4). */
const shift = (t: readonly [number, number, number]) => [
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
  t[0],
  t[1],
  t[2],
  1,
];

describe("Frame's accuracy option", () => {
  it("is not stated when left out", () => {
    const root = Frame.root("R");
    const f = Frame.constant("A", root, shift([1, 0, 0]));
    expect(f.accuracy(instant)).toEqual(NOT_STATED);
  });

  it("returns a fixed accuracy, and a function's at the instant", () => {
    const root = Frame.root("R");
    const fixed = Frame.constant("A", root, shift([1, 0, 0]), {
      accuracy: { meters: 0.002, note: "survey" },
    });
    expect(fixed.accuracy(instant)).toEqual({ meters: 0.002, note: "survey" });
    const drifting = new Frame("B", root, () => {}, {
      accuracy: (at) => ({ radians: 1e-9 * (1 + at.tdb()), note: "drifts" }),
    });
    expect(drifting.accuracy(Instant.fromTdb(1)).radians).toBeCloseTo(2e-9);
  });

  it("refuses 0, NaN, a negative figure, or figures on an exact edge, naming the frame", () => {
    const root = Frame.root("R");
    const make = (accuracy: object) => () =>
      Frame.constant("Bad", root, shift([0, 0, 0]), {
        accuracy: accuracy as never,
      });
    expect(make({ meters: 0, note: "" })).toThrow(/"Bad".*meters/);
    expect(make({ radians: Number.NaN, note: "" })).toThrow(/radians/);
    expect(make({ meters: -1, note: "" })).toThrow(RangeError);
    expect(make({ byDefinition: true, meters: 1, note: "" })).toThrow(
      /exact by definition/,
    );
    const late = new Frame("Late", root, () => {}, {
      accuracy: () => ({ meters: Number.POSITIVE_INFINITY, note: "" }),
    });
    expect(() => late.accuracy(instant)).toThrow(/"Late"/);
  });

  it("hands out frozen accuracies, never the caller's object or a shared mutable one", () => {
    const root = Frame.root("R");
    const given = { meters: 0.002, note: "survey" };
    const f = Frame.constant("A", root, shift([1, 0, 0]), { accuracy: given });
    const a = f.accuracy(instant);
    expect(Object.isFrozen(a)).toBe(true);
    expect(Object.isFrozen(given)).toBe(false);
    expect(() => {
      (a as { meters?: number }).meters = 1;
    }).toThrow(TypeError);
    expect(Object.isFrozen(NOT_STATED)).toBe(true);
    expect(Object.isFrozen(BUILT_IN_ACCURACY)).toBe(true);
    for (const v of Object.values(BUILT_IN_ACCURACY)) {
      expect(Object.isFrozen(v)).toBe(true);
    }
    // DE440's 0.01 m, defined once.
    expect(BUILT_IN_ACCURACY.GCRF.meters).toBe(DE440_EARTH_MOON_METERS);
    const g = new Frame("B", root, () => {}, {
      accuracy: () => ({ radians: 1e-9, note: "fn" }),
    });
    expect(Object.isFrozen(g.accuracy(instant))).toBe(true);
  });

  it("passes through eastNorthUpFrame", () => {
    const root = Frame.root("ITRF");
    const enu = eastNorthUpFrame(
      "Pad",
      root,
      Ellipsoid.WGS84,
      [6378137, 0, 0],
      {
        accuracy: { byDefinition: true, note: "defined here" },
      },
    );
    expect(enu.accuracy(instant).byDefinition).toBe(true);
  });
});

describe("pointAccuracy", () => {
  it("adds metre terms as a root sum square, and says so", () => {
    const root = Frame.root("R");
    const a = Frame.constant("A", root, shift([5, 0, 0]), {
      accuracy: { meters: 0.003, note: "a" },
    });
    const b = Frame.constant("B", a, shift([0, 5, 0]), {
      accuracy: { meters: 0.004, note: "b" },
    });
    const r = pointAccuracy(framePoint(b, [1, 2, 3], instant), root);
    expect(r.meters).toBeCloseTo(0.005, 15);
    expect(r.terms.map((t) => t.frame)).toEqual(["B", "A"]);
    expect(r.combination).toMatch(/root-sum-square/);
    expect(r.unboundedBy).toBeUndefined();
  });

  it("scales a rotation error by the point's distance from that frame's origin", () => {
    const root = Frame.root("R");
    // A joint at the root's [100, 0, 0], turning about its own origin.
    const joint = Frame.constant("Joint", root, shift([100, 0, 0]), {
      accuracy: { radians: 1e-4, note: "encoder" },
    });
    const link = Frame.constant("Link", joint, shift([0, 0, 5]), {
      accuracy: { byDefinition: true, note: "exact" },
    });
    const r = pointAccuracy(framePoint(link, [10, 0, 0], instant), root);
    const angular = r.terms.find((t) => t.kind === "angular")!;
    expect(angular.lever).toBeCloseTo(Math.hypot(10, 5), 12);
    expect(angular.meters).toBeCloseTo(1e-4 * Math.hypot(10, 5), 15);
    expect(r.terms.find((t) => t.frame === "Link")!.kind).toBe("exact");
    expect(r.meters).toBeCloseTo(1e-4 * Math.hypot(10, 5), 15);
    expect(dominantTerm(r)?.frame).toBe("Joint");
  });

  it("states both an edge's metres and its radians", () => {
    const root = Frame.root("R");
    const f = Frame.constant("F", root, shift([0, 0, 0]), {
      accuracy: { meters: 3e-4, radians: 1e-4, note: "both" },
    });
    const r = pointAccuracy(framePoint(f, [4, 0, 0], instant), root);
    expect(r.terms.map((t) => t.kind)).toEqual(["meters", "angular"]);
    expect(r.meters).toBeCloseTo(Math.hypot(3e-4, 4e-4), 15);
  });

  it("walks down the route too, with the point's lever in each frame", () => {
    const root = Frame.root("R");
    const a = Frame.constant("A", root, shift([3, 0, 0]), {
      accuracy: { radians: 1e-3, note: "a" },
    });
    // A point at the root's origin is 3 m from A's.
    const r = pointAccuracy(framePoint(root, [0, 0, 0], instant), a);
    const t = r.terms[0]!;
    expect(t.kind === "angular" ? t.lever : NaN).toBeCloseTo(3, 12);
    expect(r.meters).toBeCloseTo(3e-3, 15);
  });

  it("makes the total unbounded at an unstated edge, names the first, and keeps the rest", () => {
    const root = Frame.root("R");
    const a = Frame.constant("A", root, shift([1, 0, 0]), {
      accuracy: { meters: 0.01, note: "a" },
    });
    const b = Frame.constant("B", a, shift([1, 0, 0]));
    const c = Frame.constant("C", b, shift([1, 0, 0]));
    const r = pointAccuracy(framePoint(c, [0, 0, 0], instant), root);
    expect(r.meters).toBeUndefined();
    expect(r.unboundedBy).toBe("C");
    expect(r.terms.map((t) => [t.frame, t.kind, t.meters])).toEqual([
      ["C", "unstated", undefined],
      ["B", "unstated", undefined],
      ["A", "meters", 0.01],
    ]);
  });

  it("is exact for a point already in the frame asked for", () => {
    const root = Frame.root("R");
    const r = pointAccuracy(framePoint(root, [1, 2, 3], instant), root);
    expect(r.meters).toBe(0);
    expect(r.terms).toEqual([]);
  });

  it("throws across trees, and without an instant", () => {
    const a = Frame.root("A");
    const b = Frame.root("B");
    expect(() => pointAccuracy(framePoint(a, [0, 0, 0], instant), b)).toThrow(
      /no common ancestor/,
    );
    expect(() => pointAccuracy(framePoint(a, [0, 0, 0]), a)).toThrow(
      /no instant/,
    );
  });
});
