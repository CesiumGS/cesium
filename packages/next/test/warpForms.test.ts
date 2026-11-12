// The closed-form warps the GPU fit evaluates (scene/warpForms.ts): their float64
// references against the engine's own height warps, a meridian arc, and the
// CPU fit of a form (the GPU fit's reference).
import { describe, expect, it } from "vitest";
import {
  verticalExaggeration,
  heightOffset,
} from "../src/georeference/heightWarps.ts";
import { Ellipsoid, cartographic } from "../src/math/ellipsoid.ts";
import {
  WGS84_RADII,
  ellipsoidFoot,
  formDisplacement,
  formForward,
  formMaxDisplacement,
  formWords,
  utmForm,
  type GpuWarpForm,
} from "../src/scene/warpForms.ts";
import {
  evaluateLattice,
  fitLatticeAt,
  fitSolveOperator,
} from "../src/scene/warpFit.ts";
import { PLACEMENT_MONOMIALS } from "../src/scene/placement.ts";

const WGS84 = Ellipsoid.WGS84;

function ecef(lonDeg: number, latDeg: number, h: number): Float64Array {
  return WGS84.cartographicToCartesian(
    cartographic((lonDeg * Math.PI) / 180, (latDeg * Math.PI) / 180, h),
    new Float64Array(3),
  );
}

describe("ellipsoidFoot", () => {
  it("finds the height and normal of a point", () => {
    const p = ecef(-100, 40, 1234.5);
    const n = new Float64Array(3);
    const h = ellipsoidFoot(WGS84_RADII, p, n);
    expect(h).toBeCloseTo(1234.5, 6);
    const want = WGS84.geodeticSurfaceNormal(
      WGS84.scaleToGeodeticSurface(p, new Float64Array(3))!,
      new Float64Array(3),
    )!;
    for (let a = 0; a < 3; a++) {
      expect(n[a]).toBeCloseTo(want[a]!, 10);
    }
  });
});

describe("heightLift", () => {
  it("is the engine's vertical exaggeration and height offset", () => {
    const exaggeration = verticalExaggeration({ factor: 7, baseHeight: 200 });
    const offset = heightOffset(35);
    const p = ecef(10, -33, 850);
    const q = new Float64Array(3);
    const mine = new Float64Array(3);
    exaggeration.forward(p, q);
    formForward({ kind: "heightLift", factor: 7, baseHeight: 200 }, p, mine);
    for (let a = 0; a < 3; a++) {
      expect(mine[a]).toBeCloseTo(q[a]!, 6);
    }
    offset.forward(p, q);
    formForward({ kind: "heightLift", factor: 1, offset: 35 }, p, mine);
    for (let a = 0; a < 3; a++) {
      expect(mine[a]).toBeCloseTo(q[a]!, 6);
    }
  });

  it("has a stated bound over a height range", () => {
    const form: GpuWarpForm = { kind: "heightLift", factor: 10, offset: -5 };
    expect(formMaxDisplacement(form, [0, 1000])).toBe(9000 - 5);
    expect(formMaxDisplacement(form, [-100, 50])).toBe(905);
    expect(
      formMaxDisplacement(
        { kind: "scaleAbout", center: [0, 0, 0], factors: [2, 2, 2] },
        [0, 1],
      ),
    ).toBeUndefined();
  });
});

describe("heightBump and scaleAbout", () => {
  it("bump lifts along the normal by a Gaussian", () => {
    const c = ecef(5, 5, 0);
    const p = ecef(5, 5.001, 100);
    const form: GpuWarpForm = {
      kind: "heightBump",
      center: c,
      amplitude: 50,
      sigma: 200,
    };
    const q = formForward(form, p, new Float64Array(3));
    const d = Math.hypot(p[0]! - c[0]!, p[1]! - c[1]!, p[2]! - c[2]!);
    const lift = 50 * Math.exp(-(d * d) / (2 * 200 * 200));
    expect(Math.hypot(q[0]! - p[0]!, q[1]! - p[1]!, q[2]! - p[2]!)).toBeCloseTo(
      lift,
      9,
    );
  });

  it("scaleAbout fixes its centre", () => {
    const form: GpuWarpForm = {
      kind: "scaleAbout",
      center: [1, 2, 3],
      factors: [2, 3, 4],
    };
    expect([...formForward(form, [1, 2, 3], new Float64Array(3))]).toEqual([
      1, 2, 3,
    ]);
    expect([...formForward(form, [2, 3, 4], new Float64Array(3))]).toEqual([
      3, 5, 7,
    ]);
  });
});

/** The meridian arc from the equator to latitude `phi` on the WGS84 ellipsoid, m, by Simpson's rule. */
function meridianArc(phi: number): number {
  const a = WGS84_RADII[0];
  const e2 = 1 - (WGS84_RADII[2] / a) ** 2;
  const m = (t: number) => (a * (1 - e2)) / (1 - e2 * Math.sin(t) ** 2) ** 1.5;
  const n = 2000;
  let sum = m(0) + m(phi);
  for (let i = 1; i < n; i++) {
    sum += m((phi * i) / n) * (i % 2 ? 4 : 2);
  }
  return (sum * phi) / (3 * n);
}

describe("the fit's solve operator (what the GPU fit uploads)", () => {
  it("recovers a cubic's coefficients from its values at the fit points", () => {
    const solve = fitSolveOperator();
    expect(solve).toHaveLength(20 * 125);
    const nodes = [-1, -Math.SQRT1_2, 0, Math.SQRT1_2, 1];
    const coefficients = Array.from({ length: 20 }, (_, k) => Math.sin(k + 1));
    const samples: number[] = [];
    for (const z of nodes) {
      for (const y of nodes) {
        for (const x of nodes) {
          samples.push(
            PLACEMENT_MONOMIALS.reduce(
              (sum, [a, b, c], k) =>
                sum + coefficients[k]! * x ** a * y ** b * z ** c,
              0,
            ),
          );
        }
      }
    }
    for (let k = 0; k < 20; k++) {
      let sum = 0;
      for (let s = 0; s < 125; s++) {
        sum += solve[k * 125 + s]! * samples[s]!;
      }
      expect(sum).toBeCloseTo(coefficients[k]!, 10);
    }
  });
});

describe("transverseMercator", () => {
  const zone = utmForm(31);

  it("puts the central meridian at k0 times the meridian arc", () => {
    for (const lat of [0, 12, 45, 60, 80]) {
      const q = formForward(zone, ecef(3, lat, 0), new Float64Array(3));
      expect(q[0]).toBeCloseTo(500000, 6);
      expect(q[1]).toBeCloseTo(0.9996 * meridianArc((lat * Math.PI) / 180), 5);
    }
    expect(0.9996 * meridianArc(Math.PI / 4)).toBeCloseTo(
      0.9996 * 4984944.378,
      2,
    );
  });

  it("keeps ellipsoidal height and is conformal", () => {
    const p = ecef(5.2, 47, 321);
    const q = formForward(zone, p, new Float64Array(3));
    expect(q[2]).toBeCloseTo(321, 6);
    // Conformal: the map's Jacobian on the surface is a rotation and a scale.
    const step = 2;
    const lon = (5.2 * Math.PI) / 180;
    const normal = new Float64Array(3);
    ellipsoidFoot(WGS84_RADII, p, normal);
    const east = [-Math.sin(lon), Math.cos(lon), 0];
    const north = [
      normal[1]! * east[2]! - normal[2]! * east[1]!,
      normal[2]! * east[0]! - normal[0]! * east[2]!,
      normal[0]! * east[1]! - normal[1]! * east[0]!,
    ].map((v) => -v);
    const move = (d: number[]) =>
      formForward(
        zone,
        [p[0]! + step * d[0]!, p[1]! + step * d[1]!, p[2]! + step * d[2]!],
        new Float64Array(3),
      );
    const qe = move(east);
    const qn = move(north);
    const de = [qe[0]! - q[0]!, qe[1]! - q[1]!];
    const dn = [qn[0]! - q[0]!, qn[1]! - q[1]!];
    const dot =
      (de[0]! * dn[0]! + de[1]! * dn[1]!) /
      (Math.hypot(...de) * Math.hypot(...dn));
    expect(Math.abs(dot)).toBeLessThan(1e-3);
    expect(Math.hypot(...de) / Math.hypot(...dn)).toBeCloseTo(1, 3);
    // The scale at 2.2 degrees from the meridian is close to k0 (1 + L²cos²φ/2).
    const L = (2.2 * Math.PI) / 180;
    const k = 0.9996 * (1 + (L * Math.cos((47 * Math.PI) / 180)) ** 2 / 2);
    expect(Math.hypot(...de) / 2).toBeCloseTo(k, 3);
  });

  it("is a displacement the lattice fits", () => {
    const origin = ecef(3.5, 45, 0);
    const d = formDisplacement(zone, origin);
    const fit = fitLatticeAt(d, { center: [0, 0, 0], scale: 3000 }, 2);
    expect(fit.errorBound).toBeLessThan(1e-3);
    const m = Float64Array.of(1200, -800, 300);
    const want = new Float64Array(3);
    d(m, want);
    const got = evaluateLattice(fit, m, new Float64Array(3));
    for (let a = 0; a < 3; a++) {
      expect(got[a]).toBeCloseTo(want[a]!, 2);
    }
  });

  it("packs the words the kernel reads", () => {
    const words = formWords(zone);
    expect(words).toHaveLength(64);
    // Slot 3 is e: hi and lo sum to it.
    const e = Math.sqrt(1 - (WGS84_RADII[2] / WGS84_RADII[0]) ** 2);
    expect(words[6]! + words[7]!).toBeCloseTo(e, 15);
    expect(words[26]! + words[27]!).toBe(500000);
  });
});
