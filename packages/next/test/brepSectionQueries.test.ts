// The cap form joins the b-rep family (plan §13.26, item 5): its faces
// tessellate, are queried by `brepGeometry` and are picked like any form's.
import { describe, expect, it } from "vitest";
import { sectionBrep } from "../src/brep/section.ts";
import { tessellateBrep } from "../src/brep/tessellate.ts";
import { brepGeometry } from "../src/geometry/brep.ts";
import { boxMinusCylinderBrep } from "./brepSectionFixtures.ts";

describe("the cap form of a block with a bore", () => {
  const caps = sectionBrep(boxMinusCylinderBrep(), [
    { point: [0, 0, 1], normal: [0, 0, 1] },
  ]).form!;

  it("tessellates to the cap's area, the bore left open", () => {
    const mesh = tessellateBrep(caps, { tolerance: 1e-4 });
    const { positions, indices } = mesh.faces;
    let area = 0;
    for (let t = 0; t < indices.length; t += 3) {
      const p = [0, 1, 2].map((k) => indices[t + k]! * 3);
      const e1 = [0, 1, 2].map(
        (k) => positions[p[1]! + k]! - positions[p[0]! + k]!,
      );
      const e2 = [0, 1, 2].map(
        (k) => positions[p[2]! + k]! - positions[p[0]! + k]!,
      );
      area +=
        Math.hypot(
          e1[1]! * e2[2]! - e1[2]! * e2[1]!,
          e1[2]! * e2[0]! - e1[0]! * e2[2]!,
          e1[0]! * e2[1]! - e1[1]! * e2[0]!,
        ) / 2;
    }
    expect(area).toBeGreaterThan(0.99 * (16 - Math.PI * 0.25));
    expect(area).toBeLessThan(1.001 * (16 - Math.PI * 0.25));
  });

  it("is hit by a ray on the solid's part of the plane, and missed through the bore", () => {
    const exact = brepGeometry(caps);
    const down = (x: number, y: number) =>
      exact.rayHit({
        from: Float64Array.of(x, y, 3),
        to: Float64Array.of(x, y, -1),
      });
    const hit = down(0.5, 0.5);
    expect(hit.verdict).toBe("hit");
    if (hit.verdict === "hit") {
      expect(hit.hit.position[2]).toBeCloseTo(1, 9);
      expect(hit.hit.entity).toEqual({ kind: "face", index: 0 });
    }
    // The bore's axis, at (2, 2): no cap there.
    expect(down(2, 2).verdict).toBe("miss");
  });

  it("names its faces, and the closest point is on the cap", () => {
    expect(caps.ids[0]).toBe("cap:0:0");
    const exact = brepGeometry(caps);
    const near = exact.closestPoint([1, 1, 1.4], { kinds: ["face"] });
    expect(near!.entity).toEqual({ kind: "face", index: 0 });
    expect(near!.distance).toBeCloseTo(0.4, 9);
  });
});
