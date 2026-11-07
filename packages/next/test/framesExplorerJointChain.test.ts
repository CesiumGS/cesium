// The robot arm's joint frames (Task 7b): defined by the app through the
// public Frame API (scenarios/jointChain.ts), uncached so a knob moves them
// at the same instant, against the closed-form planar solution by hand
// (R11), and their stated accuracy composed by the library against the
// lever-arm rule worked by hand.
import { describe, expect, it } from "vitest";
import { Frame, frameTransform } from "../src/frames/Frame.ts";
import { convertPoint, framePoint } from "../src/frames/local.ts";
import { dominantTerm, pointAccuracy } from "../src/frames/pointAccuracy.ts";
import { Instant } from "../src/time/Instant.ts";
import {
  ARM,
  armFrames,
  largestFirst,
  toolAccuracyByHand,
  toolByHand,
  type ArmAngles,
} from "../examples/frames-explorer/scenarios/arm.ts";
import {
  jointChain,
  jointMatrix,
} from "../examples/frames-explorer/scenarios/jointChain.ts";
import {
  APP_CODE,
  sourceRegion,
} from "../examples/frames-explorer/panel/appCode.ts";

const instant = Instant.fromTdb(0);
const CHECKED: ArmAngles = { yaw: 20, shoulder: 35, elbow: -50, wrist: 0 };

const toolIn = (from: Frame, to: Frame) =>
  Array.from(convertPoint(framePoint(from, [0, 0, 0], instant), to).position);

describe("jointChain", () => {
  it("puts the tool at the sum of the offsets with every angle 0", () => {
    const root = Frame.root("Root");
    const chain = jointChain(root, [
      { name: "a", axis: "z", offset: [1, 2, 3], angle: () => 0 },
      { name: "b", axis: "y", offset: [4, 0, 0], angle: () => 0 },
      { name: "c", axis: "x", offset: [0, 5, 0], angle: () => 0 },
    ]);
    expect(chain.map((f) => f.name)).toEqual(["a", "b", "c"]);
    const p = toolIn(chain[2]!, root);
    expect(p[0]).toBeCloseTo(5, 12);
    expect(p[1]).toBeCloseTo(7, 12);
    expect(p[2]).toBeCloseTo(3, 12);
  });

  it("keeps each joint's rotation orthonormal within 1e-12", () => {
    const out = new Float64Array(16);
    for (const axis of ["x", "y", "z"] as const) {
      for (const angle of [0, 0.3, -2.1, Math.PI]) {
        jointMatrix(axis, angle, [1, 2, 3], out);
        for (let a = 0; a < 3; a++) {
          for (let b = 0; b < 3; b++) {
            let d = 0;
            for (let k = 0; k < 3; k++) {
              d += out[4 * a + k]! * out[4 * b + k]!;
            }
            expect(Math.abs(d - (a === b ? 1 : 0))).toBeLessThan(1e-12);
          }
        }
        // Right-handed: x × y = z.
        const [x, y, z] = [0, 1, 2].map((c) => [
          out[4 * c]!,
          out[4 * c + 1]!,
          out[4 * c + 2]!,
        ]) as [number[], number[], number[]];
        expect(x[1]! * y[2]! - x[2]! * y[1]!).toBeCloseTo(z[0]!, 12);
        expect(x[0]! * y[1]! - x[1]! * y[0]!).toBeCloseTo(z[2]!, 12);
      }
    }
  });

  it("follows a new angle at the same instant (uncached app frames)", () => {
    const itrf = Frame.root("ITRF");
    const arm = armFrames(itrf, CHECKED);
    const before = toolIn(arm.tool, itrf);
    arm.angles.elbow = -20;
    const after = toolIn(arm.tool, itrf);
    expect(Math.hypot(...after.map((x, i) => x - before[i]!))).toBeGreaterThan(
      1,
    );
    arm.angles.elbow = CHECKED.elbow;
    const back = toolIn(arm.tool, itrf);
    back.forEach((x, i) => expect(x).toBeCloseTo(before[i]!, 9));
  });
});

describe("the robot arm", () => {
  it("turns the tool about the pad's up axis with a 90° base yaw", () => {
    const itrf = Frame.root("ITRF");
    const at0 = armFrames(itrf, { ...CHECKED, yaw: 0 });
    const at90 = armFrames(itrf, { ...CHECKED, yaw: 90 });
    const p0 = toolIn(at0.tool, at0.base);
    const p90 = toolIn(at90.tool, at90.base);
    // East becomes north; up stays.
    expect(p90[0]).toBeCloseTo(-p0[1]!, 9);
    expect(p90[1]).toBeCloseTo(p0[0]!, 9);
    expect(p90[2]).toBeCloseTo(p0[2]!, 9);
    expect(p0[1]).toBeCloseTo(0, 9);
  });

  it.each([
    CHECKED,
    { yaw: 0, shoulder: 0, elbow: 0, wrist: 0 },
    { yaw: -135, shoulder: 80, elbow: -150, wrist: 70 },
  ])(
    "matches the closed-form planar solution at %o within 1e-9 m",
    (angles) => {
      const itrf = Frame.root("ITRF");
      const arm = armFrames(itrf, angles);
      const ours = toolIn(arm.tool, arm.base);
      const hand = toolByHand(angles);
      expect(Math.hypot(...ours.map((x, i) => x - hand[i]!))).toBeLessThan(
        1e-9,
      );
    },
  );

  it.each([
    ["the checked pose", CHECKED],
    ["fully extended", { yaw: 20, shoulder: 0, elbow: 0, wrist: 0 }],
  ])(
    "composes the tool's accuracy as the hand lever-arm rule at %s, within 1 nm",
    (_name, angles) => {
      const itrf = Frame.root("ITRF");
      const arm = armFrames(itrf, angles);
      const ours = pointAccuracy(
        framePoint(arm.tool, [0, 0, 0], instant),
        itrf,
      );
      const hand = toolAccuracyByHand(angles);
      expect(ours.meters).toBeDefined();
      expect(Math.abs(ours.meters! - hand.meters)).toBeLessThan(1e-9);
      const lever = (name: string) => {
        const t = ours.terms.find(
          (x) => x.frame === name && x.kind === "angular",
        );
        return t?.kind === "angular" ? t.lever : NaN;
      };
      expect(lever(ARM.shoulder)).toBeCloseTo(hand.levers.shoulder, 9);
      expect(lever(ARM.elbow)).toBeCloseTo(hand.levers.elbow, 9);
      expect(lever(ARM.wrist)).toBeCloseTo(hand.levers.wrist, 9);
      // The pad's frame is exact by definition; the ITRF root has no edge.
      expect(ours.terms.at(-1)).toMatchObject({
        frame: "LC-39A pad ENU",
        kind: "exact",
      });
    },
  );

  it("grows as the arm extends, and the dominant term moves from the base survey to the encoders", () => {
    const itrf = Frame.root("ITRF");
    const at = (angles: ArmAngles) =>
      pointAccuracy(
        framePoint(armFrames(itrf, angles).tool, [0, 0, 0], instant),
        itrf,
      );
    const stowed = at({ yaw: 20, shoulder: 80, elbow: -150, wrist: 0 });
    const extended = at({ yaw: 20, shoulder: 0, elbow: 0, wrist: 0 });
    expect(extended.meters!).toBeGreaterThan(stowed.meters!);
    expect(dominantTerm(stowed)?.frame).toBe(ARM.base);
    expect(dominantTerm(extended)?.kind).toBe("angular");
  });

  it("builds the same tool place from the same angles, every time (the page's and the worker's)", () => {
    const itrf = Frame.root("ITRF");
    const a = frameTransform(armFrames(itrf, CHECKED).tool, itrf, instant);
    const b = frameTransform(armFrames(itrf, CHECKED).tool, itrf, instant);
    expect(Array.from(a)).toEqual(Array.from(b));
  });
});

describe("the app code under the answer", () => {
  it("is the source's own joint-frame region, as text, dedented", () => {
    const code = APP_CODE["robot-arm"]!.code;
    const lines = code.split("\n");
    expect(lines[0]).toBe("const frame = new Frame(");
    expect(code).toMatch(/cache: false/);
    expect(code).toMatch(/accuracy: joint\.accuracy/);
    expect(lines.length).toBeGreaterThanOrEqual(5);
    expect(lines.length).toBeLessThanOrEqual(10);
    expect(lines.every((l) => !l.startsWith(" ") || l.startsWith("  "))).toBe(
      true,
    );
  });

  it("throws for a region the source doesn't have", () => {
    expect(() => sourceRegion("// nothing", "joint-frame")).toThrow(
      /no region/,
    );
  });
});

describe("the answer's breakdown order", () => {
  it("puts unstated terms first, then the largest, and never compares NaN", () => {
    const terms = [
      { label: "a", meters: 0.001 },
      { label: "u1" },
      { label: "b", meters: 0.003 },
      { label: "u2", meters: undefined },
      { label: "c", meters: 0 },
    ];
    expect([...terms].sort(largestFirst).map((t) => t.label)).toEqual([
      "u1",
      "u2",
      "b",
      "a",
      "c",
    ]);
    expect(largestFirst({}, {})).toBe(0);
    expect(Number.isNaN(largestFirst({}, { meters: 1 }))).toBe(false);
  });
});
