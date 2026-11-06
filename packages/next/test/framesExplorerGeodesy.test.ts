// The frames explorer's hand-coded Helmert (examples/frames-explorer/stress/
// geodesy.ts), which part 1c's bound-CRS checks reuse: the Ordnance Survey's
// published worked example, and EPSG's approximate reversal against the exact
// inverse.
import { describe, expect, it } from "vitest";
import references from "../examples/frames-explorer/references.json";
import {
  helmert,
  inverseHelmert,
  reversedHelmert,
  type HelmertParameters,
} from "../examples/frames-explorer/tests.ts";

const ARCSECOND = Math.PI / 648_000;
const example = references.entries["os-helmert-example"];
/** "- 446.448 m" as printed: the sign may stand apart from the number. */
const value = (text: string) =>
  Number(text.replace(/^([+-])\s+/, "$1").split(/\s+/)[0]);
const p = example.parameters;
// ETRS89 to OSGB36, OS guide Annexe D (its matrix D2 is the position vector
// convention).
const osgb: HelmertParameters = {
  tx: value(p.tX),
  ty: value(p.tY),
  tz: value(p.tZ),
  rx: value(p.rX) * ARCSECOND,
  ry: value(p.rY) * ARCSECOND,
  rz: value(p.rZ) * ARCSECOND,
  ds: value(p.s) * 1e-6,
};
const source = example.sourceXYZ.map(Number);
const target = example.targetXYZ.map(Number);
const pv = { convention: "position-vector" } as const;
const distance = (a: readonly number[], b: readonly number[]) =>
  Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);

describe("the hand-coded Helmert", () => {
  it("reproduces the Ordnance Survey's Annexe D example within half a unit of its last digit plus its inputs'", () => {
    const out = helmert(source, osgb, pv);
    for (let i = 0; i < 3; i++) {
      expect(Math.abs(out[i]! - target[i]!), `axis ${i}`).toBeLessThan(
        0.0005 + 0.0005,
      );
    }
  });

  it("inverts exactly, where EPSG's reversal (signs reversed) misses by about |dS·T| + |r × T|", () => {
    const forward = helmert(source, osgb, pv);
    const exact = inverseHelmert(forward, osgb, pv);
    const approximate = helmert(forward, reversedHelmert(osgb), pv);
    expect(distance(exact, source)).toBeLessThan(1e-9);
    const miss = distance(approximate, source);
    // |dS·T| for 20.5 ppm and a 716 m shift is 1.5 cm; |r × T| adds 0.3 cm.
    const t = Math.hypot(osgb.tx, osgb.ty, osgb.tz);
    const r = [osgb.rx, osgb.ry, osgb.rz];
    const rxT = Math.hypot(
      r[1]! * osgb.tz - r[2]! * osgb.ty,
      r[2]! * osgb.tx - r[0]! * osgb.tz,
      r[0]! * osgb.ty - r[1]! * osgb.tx,
    );
    const bound = Math.abs(osgb.ds) * t + rxT;
    expect(miss).toBeGreaterThan(0.01);
    expect(miss).toBeLessThan(0.02);
    expect(miss).toBeLessThan(bound * 1.01);
  });

  it("inverts the coordinate frame and time-dependent forms exactly too", () => {
    const options = {
      convention: "coordinate-frame",
      rates: {
        tx: 1e-3,
        ty: -2e-3,
        tz: 1e-3,
        rx: 1e-9,
        ry: -2e-9,
        rz: 3e-9,
        ds: 1e-9,
      },
      referenceEpoch: 2010,
      epoch: 2026,
    } as const;
    const forward = helmert(source, osgb, options);
    expect(
      distance(inverseHelmert(forward, osgb, options), source),
    ).toBeLessThan(1e-9);
  });
});
