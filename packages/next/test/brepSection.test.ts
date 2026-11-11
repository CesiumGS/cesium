// The b-rep section (src/brep/section.ts): the cap faces of a solid cut by
// planes, against analytic cross sections.
import { describe, expect, it } from "vitest";
import { validateBrep } from "../src/brep/validate.ts";
import { sectionBrep } from "../src/brep/section.ts";
import { faceTrim } from "../src/brep/tessellate.ts";
import {
  boxBrep,
  cappedCylinderBrep,
  nurbsCylinderBrep,
} from "./brepFixtures.ts";
import { boxMinusCylinderBrep, sphereBrep } from "./brepSectionFixtures.ts";

const Z = [0, 0, 1] as const;

describe("sectionBrep: a box", () => {
  it("cut square to z is its rectangle, one loop of four lines, valid", () => {
    const result = sectionBrep(boxBrep(), [{ point: [0, 0, 1.5], normal: Z }]);
    expect(result.faces).toHaveLength(1);
    expect(result.faces[0]!.area).toBeCloseTo(6, 9);
    expect(result.faces[0]!.holes).toBe(0);
    expect(result.report.openChains).toEqual([]);
    expect(result.report.methods).toEqual({ "plane ∩ plane = line": 4 });
    expect(validateBrep(result.form!)).toEqual([]);
    expect(result.form!.faceReversed[0]).toBe(0);
    // An axis-aligned rectangle needs no trim.
    expect(faceTrim(result.form!, 0)!.trimmed).toBe(false);
  });

  it("cut aslant has the area of the oblique section", () => {
    // The plane x + z = 3 through a 2 × 3 × 4 box: a rectangle 3 m wide
    // (y) by the length of the cut in the x–z plane, where x runs 0 to 2.
    const n = [1, 0, 1];
    const result = sectionBrep(boxBrep(), [{ point: [0, 0, 3], normal: n }]);
    expect(result.faces).toHaveLength(1);
    expect(result.faces[0]!.area).toBeCloseTo(3 * 2 * Math.SQRT2, 9);
    expect(validateBrep(result.form!)).toEqual([]);
  });

  it("through its corners is the diagonal rectangle", () => {
    // x + y = 2 contains the edge at x = 2, y = 0 and the vertical edges (0, 2).
    const result = sectionBrep(boxBrep(), [
      { point: [0, 2, 0], normal: [1, 1, 0] },
    ]);
    expect(result.faces).toHaveLength(1);
    expect(result.faces[0]!.area).toBeCloseTo(4 * Math.hypot(2, 2), 3);
    expect(result.report.openChains).toEqual([]);
  });

  it("on a face is nudged into the solid and still makes the cap", () => {
    const result = sectionBrep(boxBrep(), [{ point: [0, 0, 4], normal: Z }]);
    expect(result.report.nudged).toBe(1);
    expect(result.faces).toHaveLength(1);
    expect(result.faces[0]!.area).toBeCloseTo(6, 6);
  });

  it("misses it: no cap", () => {
    const result = sectionBrep(boxBrep(), [{ point: [0, 0, 9], normal: Z }]);
    expect(result.form).toBeUndefined();
    expect(result.faces).toEqual([]);
  });

  it("limited by the other sides of a clip box makes a smaller cap", () => {
    // Cut at z = 1.5, limited to x ≤ 1 and y ≤ 2: 1 × 2.
    const result = sectionBrep(boxBrep(), [
      {
        point: [0, 0, 1.5],
        normal: Z,
        limits: [
          { point: [1, 0, 0], normal: [1, 0, 0] },
          { point: [0, 2, 0], normal: [0, 1, 0] },
        ],
      },
    ]);
    expect(result.faces).toHaveLength(1);
    expect(result.faces[0]!.area).toBeCloseTo(2, 9);
    expect(validateBrep(result.form!)).toEqual([]);
  });
});

describe("sectionBrep: a capped cylinder (r = 1, h = 3)", () => {
  it("square to its axis is the disc, with exact circle edges", () => {
    const result = sectionBrep(cappedCylinderBrep(), [
      { point: [0, 0, 1.2], normal: Z },
    ]);
    expect(result.faces).toHaveLength(1);
    expect(result.faces[0]!.area).toBeCloseTo(Math.PI, 9);
    expect(result.report.methods).toEqual({ "plane ∩ cylinder = ellipse": 1 });
    expect(result.report.fitError).toBe(0);
    expect(validateBrep(result.form!)).toEqual([]);
  });

  it("aslant is the ellipse, within the cylinder's ends", () => {
    // A plane at 30° to the axis, through the axis at z = 1.5: the ellipse has semi-axes 1 and 1/sin(60°)... tilt of the normal from z by 30° gives 1/cos(30°).
    const tilt = Math.PI / 6;
    const result = sectionBrep(cappedCylinderBrep(), [
      { point: [0, 0, 1.5], normal: [Math.sin(tilt), 0, Math.cos(tilt)] },
    ]);
    expect(result.faces).toHaveLength(1);
    expect(result.faces[0]!.area).toBeCloseTo(Math.PI / Math.cos(tilt), 8);
    expect(validateBrep(result.form!)).toEqual([]);
  });

  it("steeply across a cap makes the ellipse cut by the planar caps", () => {
    // A steep plane meets the top cap: the section is a D-shape, ellipse
    // part below z = 3, then a straight chord along the cap.
    const normal = [Math.sin(1.2), 0, Math.cos(1.2)];
    const result = sectionBrep(cappedCylinderBrep(), [
      { point: [0, 0, 2.9], normal },
    ]);
    expect(result.faces).toHaveLength(1);
    expect(result.report.openChains).toEqual([]);
    expect(result.report.methods["plane ∩ plane = line"]).toBeGreaterThan(0);
    expect(validateBrep(result.form!)).toEqual([]);
    // The area below the chord: integrate numerically over the disc.
    let area = 0;
    const N = 4000;
    for (let i = 0; i < N; i++) {
      const x = -1 + ((i + 0.5) * 2) / N;
      const span = 2 * Math.sqrt(Math.max(0, 1 - x * x));
      // The plane: z = 2.9 − x tan(1.2); it stays within [0, 3] where valid.
      const z = 2.9 - x * Math.tan(1.2);
      const inside = z >= 0 && z <= 3;
      // The plane's section at x is the segment of y over the disc, if its z is in range.
      area += inside ? (span * (2 / N)) / Math.cos(1.2) : 0;
    }
    expect(result.faces[0]!.area).toBeCloseTo(area, 2);
  });

  it("parallel to the axis is a rectangle, two lines on the wall", () => {
    const result = sectionBrep(cappedCylinderBrep(), [
      { point: [0.5, 0, 0], normal: [1, 0, 0] },
    ]);
    expect(result.faces).toHaveLength(1);
    expect(result.faces[0]!.area).toBeCloseTo(2 * Math.sqrt(1 - 0.25) * 3, 9);
    expect(validateBrep(result.form!)).toEqual([]);
  });

  it("through the cylinder face of NURBS patches (SMLib's form) is the same disc", () => {
    const result = sectionBrep(
      nurbsCylinderBrep(),
      [{ point: [0, 0, 0.7], normal: Z }],
      { tolerance: 1e-6 },
    );
    expect(result.report.openChains).toEqual([]);
    expect(result.faces.length).toBeGreaterThan(0);
  });
});

describe("sectionBrep: a sphere", () => {
  it("is a circle: the disc, exact", () => {
    const r = 2;
    const result = sectionBrep(sphereBrep(r), [
      { point: [0, 0.3, 0.9], normal: [0, 0, 1] },
    ]);
    expect(result.faces).toHaveLength(1);
    expect(result.faces[0]!.area).toBeCloseTo(Math.PI * (r * r - 0.81), 8);
    expect(result.report.methods).toEqual({ "plane ∩ sphere = circle": 1 });
    expect(validateBrep(result.form!)).toEqual([]);
  });

  it("through a pole's seam at an angle", () => {
    const r = 1.5;
    const n = [0.6, 0, 0.8];
    const d = 0.4;
    const result = sectionBrep(sphereBrep(r), [
      { point: [n[0]! * d, 0, n[2]! * d], normal: n },
    ]);
    expect(result.faces[0]!.area).toBeCloseTo(Math.PI * (r * r - d * d), 8);
    expect(validateBrep(result.form!)).toEqual([]);
  });
});

describe("sectionBrep: a box minus a cylinder", () => {
  it("makes a square with a hole: the area is the square less the disc", () => {
    const result = sectionBrep(boxMinusCylinderBrep(), [
      { point: [0, 0, 1], normal: Z },
    ]);
    expect(result.report.openChains).toEqual([]);
    expect(result.faces).toHaveLength(1);
    expect(result.faces[0]!.holes).toBe(1);
    expect(result.faces[0]!.area).toBeCloseTo(16 - Math.PI * 0.25, 8);
    expect(validateBrep(result.form!)).toEqual([]);
    // Outer counter-clockwise, hole clockwise.
    const trim = faceTrim(result.form!, 0)!;
    expect(trim.loops).toHaveLength(2);
    expect(trim.contains(0.5, 0.5)).toBe(true);
    expect(trim.contains(0, 0)).toBe(true);
  });

  it("through the bore sideways is two rectangles", () => {
    const result = sectionBrep(boxMinusCylinderBrep(), [
      { point: [0, 2, 0], normal: [0, 1, 0] },
    ]);
    expect(result.faces).toHaveLength(2);
    const total = result.faces.reduce((s, f) => s + f.area, 0);
    expect(total).toBeCloseTo((4 - 1) * 2, 4);
  });
});

describe("sectionBrep: curved sections cut by a clip box's sides", () => {
  it("a disc limited to one side is a half disc, its edge a line and an arc", () => {
    const result = sectionBrep(cappedCylinderBrep(), [
      {
        point: [0, 0, 1.5],
        normal: Z,
        limits: [{ point: [0, 0, 0], normal: [1, 0, 0] }],
      },
    ]);
    expect(result.faces).toHaveLength(1);
    expect(result.faces[0]!.area).toBeCloseTo(Math.PI / 2, 9);
    expect(result.report.openChains).toEqual([]);
    expect(validateBrep(result.form!)).toEqual([]);
  });

  it("limited on two sides is a quarter disc", () => {
    const result = sectionBrep(cappedCylinderBrep(), [
      {
        point: [0, 0, 1.5],
        normal: Z,
        limits: [
          { point: [0, 0, 0], normal: [1, 0, 0] },
          { point: [0, 0, 0], normal: [0, 1, 0] },
        ],
      },
    ]);
    expect(result.faces[0]!.area).toBeCloseTo(Math.PI / 4, 9);
    expect(validateBrep(result.form!)).toEqual([]);
  });

  it("a bore cut through its middle by a limit leaves a half annulus' worth: the hole is cut too", () => {
    // The block's section at z = 1 limited to x ≤ 2: a 2 × 4 half, less half of the bore.
    const result = sectionBrep(boxMinusCylinderBrep(), [
      {
        point: [0, 0, 1],
        normal: Z,
        limits: [{ point: [2, 0, 0], normal: [1, 0, 0] }],
      },
    ]);
    expect(result.faces).toHaveLength(1);
    expect(result.faces[0]!.area).toBeCloseTo(8 - (Math.PI * 0.25) / 2, 4);
    expect(result.faces[0]!.holes).toBe(0);
    expect(validateBrep(result.form!)).toEqual([]);
  });

  it("a limit outside the section removes it, and one beyond it leaves it whole", () => {
    const outside = sectionBrep(cappedCylinderBrep(), [
      {
        point: [0, 0, 1.5],
        normal: Z,
        limits: [{ point: [5, 0, 0], normal: [-1, 0, 0] }],
      },
    ]);
    expect(outside.form).toBeUndefined();
    const beyond = sectionBrep(cappedCylinderBrep(), [
      {
        point: [0, 0, 1.5],
        normal: Z,
        limits: [{ point: [5, 0, 0], normal: [1, 0, 0] }],
      },
    ]);
    expect(beyond.faces[0]!.area).toBeCloseTo(Math.PI, 9);
  });
});
