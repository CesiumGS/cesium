// The b-rep section on cones, tori and Bézier patches: surfaces whose section
// is marched and fitted (src/brep/section.ts), against the area of a numeric
// count over the plane.
import { describe, expect, it } from "vitest";
import { sectionBrep } from "../src/brep/section.ts";
import { validateBrep } from "../src/brep/validate.ts";
import {
  coneFrustumBrep,
  nurbsCappedCylinderBrep,
  sectionArea,
  torusBrep,
} from "./brepSectionFixtures.ts";

const Z = [0, 0, 1] as const;

describe("sectionBrep: a cone frustum", () => {
  const r0 = 1;
  const a = 0.3;
  const inside = (p: number[]) =>
    p[2]! >= 0 &&
    p[2]! <= 2 &&
    Math.hypot(p[0]!, p[1]!) <= r0 + p[2]! * Math.tan(a);

  it("square to its axis is a circle, exact", () => {
    const result = sectionBrep(coneFrustumBrep(), [
      { point: [0, 0, 1.1], normal: Z },
    ]);
    const rho = r0 + 1.1 * Math.tan(a);
    expect(result.faces[0]!.area).toBeCloseTo(Math.PI * rho * rho, 8);
    expect(result.report.methods).toEqual({
      "plane ⟂ cone axis = circle": 1,
    });
    expect(validateBrep(result.form!)).toEqual([]);
  });

  it("aslant is a conic, marched and fitted within the tolerance", () => {
    const normal = [Math.sin(0.5), 0, Math.cos(0.5)];
    const point = [0, 0, 1];
    const result = sectionBrep(coneFrustumBrep(), [{ point, normal }], {
      tolerance: 1e-6,
    });
    expect(result.report.openChains).toEqual([]);
    expect(result.faces).toHaveLength(1);
    expect(
      result.report.methods["analytic surface, marched and fitted"],
    ).toBeGreaterThan(0);
    expect(result.report.fitError).toBeLessThan(1e-6);
    expect(result.faces[0]!.area).toBeCloseTo(
      sectionArea(point, normal, 2.5, inside),
      1,
    );
    expect(validateBrep(result.form!)).toEqual([]);
  });

  it("aslant through a disc end is the conic cut straight by the end", () => {
    const normal = [Math.sin(0.9), 0, Math.cos(0.9)];
    const point = [0, 0, 0.3];
    const result = sectionBrep(coneFrustumBrep(), [{ point, normal }], {
      tolerance: 1e-6,
    });
    expect(result.report.openChains).toEqual([]);
    expect(result.faces[0]!.area).toBeCloseTo(
      sectionArea(point, normal, 3, inside),
      1,
    );
    expect(validateBrep(result.form!)).toEqual([]);
  });
});

describe("sectionBrep: a torus (R = 3, r = 1)", () => {
  const R = 3;
  const r = 1;
  const inside = (p: number[]) =>
    (Math.hypot(p[0]!, p[1]!) - R) ** 2 + p[2]! ** 2 <= r * r;

  it("square to its axis is an annulus: two circles", () => {
    const h = 0.6;
    const result = sectionBrep(torusBrep(R, r), [
      { point: [0, 0, h], normal: Z },
    ]);
    const k = Math.sqrt(r * r - h * h);
    expect(result.faces).toHaveLength(1);
    expect(result.faces[0]!.holes).toBe(1);
    expect(result.faces[0]!.area).toBeCloseTo(4 * Math.PI * R * k, 8);
    expect(validateBrep(result.form!)).toEqual([]);
  });

  it("tilted is a quartic, marched and fitted", () => {
    const normal = [Math.sin(0.15), 0, Math.cos(0.15)];
    const point = [0, 0, 0.25];
    const result = sectionBrep(torusBrep(R, r), [{ point, normal }], {
      tolerance: 1e-6,
    });
    expect(result.report.openChains).toEqual([]);
    expect(result.report.fitError).toBeLessThan(1e-6);
    const total = result.faces.reduce((s, f) => s + f.area, 0);
    expect(total).toBeCloseTo(sectionArea(point, normal, 4.5, inside, 2400), 1);
    expect(validateBrep(result.form!)).toEqual([]);
  });

  it("steeply through the tube is closed loops", () => {
    const normal = [Math.sin(1.3), 0, Math.cos(1.3)];
    const point = [2.2, 0, 0];
    const result = sectionBrep(torusBrep(R, r), [{ point, normal }], {
      tolerance: 1e-6,
    });
    expect(result.report.openChains).toEqual([]);
    const total = result.faces.reduce((s, f) => s + f.area, 0);
    expect(total).toBeCloseTo(sectionArea(point, normal, 4.5, inside, 2400), 1);
  });
});

describe("sectionBrep: a capped cylinder of NURBS patches", () => {
  it("square to its axis is the disc, found by marching, within the tolerance", () => {
    const result = sectionBrep(
      nurbsCappedCylinderBrep(),
      [{ point: [0, 0, 0.7], normal: Z }],
      { tolerance: 1e-6 },
    );
    expect(result.report.openChains).toEqual([]);
    expect(result.faces).toHaveLength(1);
    expect(result.faces[0]!.area).toBeCloseTo(Math.PI * 0.25, 6);
    expect(
      result.report.methods["Bézier patch, marched and fitted"],
    ).toBeGreaterThan(0);
    expect(validateBrep(result.form!)).toEqual([]);
  });

  it("aslant joins the section across the patches", () => {
    const tilt = 0.5;
    const result = sectionBrep(
      nurbsCappedCylinderBrep(),
      [{ point: [0, 0, 1], normal: [Math.sin(tilt), 0, Math.cos(tilt)] }],
      { tolerance: 1e-6 },
    );
    expect(result.report.openChains).toEqual([]);
    expect(result.faces[0]!.area).toBeCloseTo(
      (Math.PI * 0.25) / Math.cos(tilt),
      5,
    );
    expect(validateBrep(result.form!)).toEqual([]);
  });
});
