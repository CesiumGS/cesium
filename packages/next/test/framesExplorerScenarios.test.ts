// The BIM site's and the corridor's answer math, by hand (Task 6a): the
// rigid-against-exact gap's formula against textbook radii and the 31.4 m
// headline, the BIM site's setups per CRS, the corridor's station words, and
// the dragged point's knobs. Pure: no PROJ (the evaluators through it are
// test/data/framesExplorerScenarios.test.ts's).
import { describe, expect, it } from "vitest";
import { Alignment } from "../src/engineering/alignment.ts";
import { formatAnswer } from "../examples/frames-explorer/panel/answerText.ts";
import {
  knobText,
  snapToStep,
  stepDigits,
} from "../examples/frames-explorer/panel/knobText.ts";
import { knobsAt } from "../examples/frames-explorer/pointDrag.ts";
import { READY, SCENES } from "../examples/frames-explorer/scenarios/scenes.ts";
import {
  BIM_CRS,
  BIM_LINE,
  CLOTHOID_ROAD,
  WGS84_A,
  WGS84_E2,
  bimEngineering,
  bimSite,
  normalRadius,
  offsetText,
  rigidGapByHand,
  siteAxisAzimuth,
  stationText,
} from "../examples/frames-explorer/scenarios/sites.ts";
import { SCENARIOS } from "../examples/frames-explorer/scenarios/specs.ts";

const spec = (id: string) => SCENARIOS.find((s) => s.id === id)!;

describe("the rigid-against-exact gap, by hand", () => {
  it("takes the meridian's radius north and the prime vertical's east (WGS 84 at 45°: M 6,367,381.8 m, N 6,388,838.3 m)", () => {
    expect(normalRadius(WGS84_A, WGS84_E2, 45, 0)).toBeCloseTo(6_367_381.8, 0);
    expect(normalRadius(WGS84_A, WGS84_E2, 45, 90)).toBeCloseTo(6_388_838.3, 0);
    // Between the two at 45° of azimuth, by Euler's theorem.
    const m = 6_367_381.8;
    const n = 6_388_838.3;
    expect(normalRadius(WGS84_A, WGS84_E2, 45, 45)).toBeCloseTo(
      1 / (0.5 / m + 0.5 / n),
      0,
    );
  });

  it("is the drop d²/2R alone on a ground-scaled grid, and the drop and the scale's part at right angles otherwise", () => {
    const flat = rigidGapByHand({
      d: 20_000,
      radius: 6_400_000,
      siteScale: 1.00005,
      gridScale: 1.00005,
    });
    expect(flat.drop).toBeCloseTo(31.25, 12);
    expect(flat.along).toBeCloseTo(0, 12);
    expect(flat.gap).toBeCloseTo(31.25, 12);
    const scaled = rigidGapByHand({
      d: 20_000,
      radius: 6_400_000,
      siteScale: 1,
      gridScale: 0.9999,
    });
    expect(scaled.along).toBeCloseTo(20_000 * (1 / 0.9999 - 1), 9);
    expect(scaled.gap).toBeCloseTo(Math.hypot(31.25, scaled.along), 12);
  });

  it("gives the BIM site's 31.4 m at its checked setup: California zone 3's scale at the site (0.99992918, from PROJ's factors), θ = 12.5°, s = 1.0000375, 37.7462° N", () => {
    const { rotation, scale } = bimSite(spec("bim-site").checked.knobs);
    expect([rotation, scale]).toEqual([12.5, 1.0000375]);
    const radius = normalRadius(
      WGS84_A,
      WGS84_E2,
      37.746199,
      siteAxisAzimuth(rotation),
    );
    // The prime vertical at 37.75° is 6,386.2 km and the meridian 6,359.4
    // km; the axis runs 77.5° from north, so cos² 0.047 of the way to M.
    expect(radius).toBeCloseTo(
      // cos 77.5° = sin 12.5° (0.2181662 rad).
      1 /
        (Math.sin(0.2181662) ** 2 / 6_359_400 +
          Math.cos(0.2181662) ** 2 / 6_386_170),
      -3,
    );
    const g = rigidGapByHand({
      d: BIM_LINE.mark,
      radius,
      siteScale: scale,
      gridScale: 0.99992918,
    });
    expect(g.drop).toBeCloseTo(31.32, 2);
    expect(g.along).toBeCloseTo(2.17, 2);
    expect(formatAnswer(g.gap, "m")).toBe("31.4 m");
  });
});

describe("the BIM site's setups", () => {
  it("puts the site grid at the CRS's origin, rotated and scaled by the knobs", () => {
    const s = bimSite({ crs: "utm-10n", rotation: -30, scale: 0.99996 });
    expect(s.crs).toBe(BIM_CRS["utm-10n"]);
    expect(s.site.origin).toEqual([549_095.54, 4_177_802.068, 0]);
    expect(s.site.rotation).toBeCloseTo((-30 * Math.PI) / 180, 15);
    expect(s.site.scale).toBe(0.99996);
  });

  it("draws the 400 km line along the site grid's x axis in design units, the inset's mark at 20 km, and the design grid around the origin", () => {
    for (const id of ["ca-zone-3", "utm-10n", "low-distortion"] as const) {
      const crs = BIM_CRS[id];
      const e = bimEngineering({ crs: id, rotation: 12.5, scale: 1.0000375 });
      const u = crs.unitsPerMeter;
      expect(e.rigid.from).toEqual([0, 0]);
      expect(e.rigid.to[0] / u).toBeCloseTo(400_000, 6);
      expect(e.rigid.to[1]).toBe(0);
      expect(e.rigid.mark / u).toBeCloseTo(20_000, 9);
      expect(e.rigid.frame.site).toEqual(
        bimSite({ crs: id, rotation: 12.5, scale: 1.0000375 }).site,
      );
      // The grid covers the origin, 100 km each way at least, on 10 km lines.
      const [E, N] = crs.origin;
      expect(e.gridExtent.min[0]).toBeLessThanOrEqual(E - 100_000 * u);
      expect(e.gridExtent.max[1]).toBeGreaterThanOrEqual(N + 100_000 * u);
      expect((e.gridExtent.min[0] / u / 10_000) % 1).toBeCloseTo(0, 6);
      expect(e.site.label).toBe("BIM site grid (θ = 12.5°, s = 1.0000375)");
    }
  });

  it("names the knobs' choices shortly on their buttons, and shows the scale to its step", () => {
    const crs = spec("bim-site").knobs.find((k) => k.id === "crs")!;
    expect(crs.options!.map((o) => o.short)).toEqual([
      "CA zone 3",
      "UTM 10N",
      "Portland LDP",
    ]);
    const scale = spec("bim-site").knobs.find((k) => k.id === "scale")!;
    expect(stepDigits(scale.step!)).toBe(7);
    expect(knobText(scale, 1.0000375)).toBe("1.0000375");
    // A slider's value lands on the checked value exactly, so the setup
    // reads as checked again.
    expect(snapToStep(1.0000375 + 1e-12, scale.step!)).toBe(1.0000375);
    expect(stepDigits(0.5)).toBe(1);
    expect(stepDigits(1)).toBe(0);
  });
});

describe("the corridor's words and its point", () => {
  it("prints stations as US road plans do, and offsets by side", () => {
    expect(stationText(650)).toBe("6+50.00");
    expect(stationText(0)).toBe("0+00.00");
    expect(stationText(1999.996)).toBe("20+00.00");
    expect(stationText(1234.5)).toBe("12+34.50");
    expect(offsetText(15)).toBe("15.00 ft right");
    expect(offsetText(-2.5)).toBe("2.50 ft left");
    expect(offsetText(0.001)).toBe("on the centreline");
  });

  it("reads the knobs off a dragged point through the local placement, snapped to their steps, and nothing off the road's ends", () => {
    const road = new Alignment(CLOTHOID_ROAD);
    const knobs = spec("corridor").knobs;
    // The design plane itself as "ITRF": the identity placement.
    const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    const p = road.pointAt(650.2, 14.8);
    expect(knobsAt([p[0]!, p[1]!, 0], identity, knobs)).toEqual({
      station: 650,
      offset: 15,
    });
    // Out past ±50 ft: the offset knob's range.
    const far = road.pointAt(1000, -80);
    expect(knobsAt([far[0]!, far[1]!, 0], identity, knobs)?.offset).toBe(-50);
    // Before the start.
    expect(knobsAt([0, 1000, 0], identity, knobs)).toBeUndefined();
  });
});

describe("the strip", () => {
  it("shows the BIM site and the corridor, in the strip's order, each on the ellipsoid with its engineering overlays", () => {
    expect(READY).toEqual([
      "one-path",
      "earth-turns",
      "stand-on-moon",
      "bim-site",
      "corridor",
    ]);
    expect(SCENES["bim-site"]!.engineering!.overlays).toEqual([
      "designGrid",
      "siteGrid",
      "rigidVsExact",
    ]);
    expect(SCENES.corridor!.engineering!.overlays).toEqual(["siteGrid"]);
    expect(spec("bim-site").globe).toBe("ellipsoid");
    expect(spec("corridor").proof).toEqual(["measurement.clothoid"]);
    expect(spec("bim-site").proof).toContain("rigid-placement-budget.site-gap");
  });
});
