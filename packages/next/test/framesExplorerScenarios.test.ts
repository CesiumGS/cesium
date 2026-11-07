// The BIM site's and the corridor's answer math, by hand (Task 6a): the
// rigid-against-exact gap's formula against textbook radii and the 31.4 m
// headline, the BIM site's setups per CRS, the corridor's station words, and
// the dragged point's knobs; and looking up from the Earth (Task 6b): the
// pointing's words, the dish's and the Moon's scenes, and the terrain line
// of sight's words, never "clear" unproven. Pure: no PROJ (the evaluators through it are
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
import {
  DSN_STATIONS,
  READY,
  SACRAMENTO,
  SCENES,
} from "../examples/frames-explorer/scenarios/scenes.ts";
import {
  BIM_CRS,
  BIM_LINE,
  BIM_PLACES,
  areaText,
  covers,
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
import {
  azimuthElevation,
  compassPoint,
  pointingText,
} from "../examples/frames-explorer/scenarios/pointing.ts";
import {
  OBSERVER_LIFT,
  placeObserver,
  terrainSightText,
} from "../examples/frames-explorer/sightLines.ts";
import type { TerrainLineOfSight } from "../src/measure/terrainLineOfSight.ts";
import { moonCut, rayPlacement } from "../examples/frames-explorer/skyRay.ts";
import { MOON_RADIUS } from "../examples/frames-explorer/scenarios/occultation.ts";
import { Ellipsoid, fromDegrees } from "../src/math/ellipsoid.ts";

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

  it("is the drop d²/2R and the chord d³/3R² alone on a ground-scaled grid, and the drop and the parts along at right angles otherwise", () => {
    const flat = rigidGapByHand({
      d: 20_000,
      radius: 6_400_000,
      siteScale: 1.00005,
      gridScale: 1.00005,
    });
    expect(flat.drop).toBeCloseTo(31.25, 12);
    // 8e12 / (3 × 4.096e13) m.
    expect(flat.along).toBeCloseTo(0.065104166666, 9);
    expect(flat.gap).toBeCloseTo(Math.hypot(31.25, flat.along), 12);
    const scaled = rigidGapByHand({
      d: 20_000,
      radius: 6_400_000,
      siteScale: 1,
      gridScale: 0.9999,
    });
    expect(scaled.along).toBeCloseTo(
      20_000 * (1 / 0.9999 - 1) + scaled.chord,
      9,
    );
    expect(scaled.gap).toBeCloseTo(Math.hypot(31.25, scaled.along), 12);
  });

  it("gives the BIM site's 31.4 m at its checked setup: California zone 3's scale at the site (0.99992918, from PROJ's factors), θ = 12.5°, s = 1.0000375, 37.7462° N", () => {
    const { place, rotation, scale } = bimSite(spec("bim-site").checked.knobs);
    expect([place.id, rotation, scale]).toEqual([
      "san-francisco",
      12.5,
      1.0000375,
    ]);
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
    // The scale's part, 2.17 m, and the chord's, d³/3R² = 0.065 m: 2.23 m,
    // the inset's "2.23 m along" (fix 1 reconciled the 0.06 m).
    expect(g.chord).toBeCloseTo(20_000 ** 3 / (3 * radius ** 2), 12);
    expect(g.chord).toBeCloseTo(0.065, 3);
    expect(g.along).toBeCloseTo(2.23, 2);
    expect(formatAnswer(g.gap, "m")).toBe("31.4 m");
  });
});

describe("the BIM site's setups", () => {
  it("puts the site grid at the site's origin in the CRS, rotated and scaled by the knobs", () => {
    const s = bimSite({
      site: "san-francisco",
      crs: "utm-10n",
      rotation: -30,
      scale: 0.99996,
    });
    expect(s.crs).toBe(BIM_CRS["utm-10n"]);
    expect(s.site!.origin).toEqual([549_095.54, 4_177_802.068, 0]);
    expect(s.site!.rotation).toBeCloseTo((-30 * Math.PI) / 180, 15);
    expect(s.site!.scale).toBe(0.99996);
    // The same CRS at Portland: the same knobs, another origin.
    const p = bimSite({
      site: "portland",
      crs: "utm-10n",
      rotation: -30,
      scale: 0.99996,
    });
    expect(p.place).toBe(BIM_PLACES.portland);
    expect(p.site!.origin).toEqual([519_531.699, 5_038_526.897, 0]);
  });

  it("keeps the site and the CRS apart: a CRS whose area of use doesn't cover the site places nothing, and says so (fix 1)", () => {
    expect(covers(BIM_CRS["ca-zone-3"], BIM_PLACES.portland)).toBe(false);
    expect(covers(BIM_CRS["low-distortion"], BIM_PLACES["san-francisco"])).toBe(
      false,
    );
    for (const place of Object.values(BIM_PLACES)) {
      expect(covers(BIM_CRS["utm-10n"], place), place.id).toBe(true);
    }
    const knobs = {
      site: "portland",
      crs: "ca-zone-3",
      rotation: 12.5,
      scale: 1,
    };
    const s = bimSite(knobs);
    expect(s.site).toBeUndefined();
    expect(s.place.id).toBe("portland");
    expect(s.crs.id).toBe("ca-zone-3");
    const e = bimEngineering(knobs);
    expect(e.outside).toBe(
      "California zone 3 (EPSG:6420) doesn't cover Portland, Oregon",
    );
    // The camera still goes to the site, not to the CRS's own area.
    expect(e.look.slice(0, 2)).toEqual([-122.75, 45.5]);
    expect(areaText(BIM_CRS["ca-zone-3"])).toBe(
      "123.02°W–117.83°W, 36.73°N–38.71°N",
    );
    // Covered: nothing outside.
    expect(
      bimEngineering({ ...knobs, crs: "utm-10n" }).outside,
    ).toBeUndefined();
  });

  it("draws the 400 km line along the site grid's x axis in design units, the inset's mark at 20 km, and the design grid around the origin", () => {
    for (const [id, site] of [
      ["ca-zone-3", "san-francisco"],
      ["utm-10n", "san-francisco"],
      ["utm-10n", "portland"],
      ["low-distortion", "portland"],
    ] as const) {
      const crs = BIM_CRS[id];
      const knobs = { site, crs: id, rotation: 12.5, scale: 1.0000375 };
      const e = bimEngineering(knobs);
      const u = crs.unitsPerMeter;
      expect(e.rigid.from).toEqual([0, 0]);
      expect(e.rigid.to[0] / u).toBeCloseTo(400_000, 6);
      expect(e.rigid.to[1]).toBe(0);
      expect(e.rigid.mark / u).toBeCloseTo(20_000, 9);
      expect(e.rigid.frame.site).toEqual(bimSite(knobs).site);
      // The grid covers the origin, 100 km each way at least, on 10 km lines.
      const [E, N] = crs.origins[site]!;
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
      "moon-from-here",
      "stand-on-moon",
      "dish-tracks",
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
    expect(spec("bim-site").proof).toEqual(
      expect.arrayContaining([
        "rigid-placement-budget.site-gap.drop",
        "rigid-placement-budget.site-gap.along",
      ]),
    );
    expect(spec("bim-site").knobs.map((k) => k.id)).toEqual([
      "site",
      "crs",
      "rotation",
      "scale",
    ]);
  });
});

describe("looking up from the Earth (Task 6b)", () => {
  it("reads azimuth clockwise from north and elevation from the horizon, in east-north-up", () => {
    const r = (az: number, el: number) => {
      const a = (az * Math.PI) / 180;
      const e = (el * Math.PI) / 180;
      return [
        Math.cos(e) * Math.sin(a),
        Math.cos(e) * Math.cos(a),
        Math.sin(e),
      ];
    };
    for (const [az, el] of [
      [0, 10],
      [90, 0],
      [255.765536226, 18.65479342],
      [359.5, -30],
    ] as const) {
      const got = azimuthElevation(r(az, el));
      expect(got.azimuth).toBeCloseTo(az, 9);
      expect(got.elevation).toBeCloseTo(el, 9);
    }
    // Due east, straight up the elevation's 90°.
    expect(azimuthElevation([1, 0, 0]).azimuth).toBe(90);
    expect(azimuthElevation([0, 0, 1]).elevation).toBe(90);
  });

  it("names the compass point and says below the horizon in words", () => {
    expect(compassPoint(255.77)).toBe("WSW");
    expect(compassPoint(359)).toBe("N");
    expect(compassPoint(74.2)).toBe("ENE");
    expect(pointingText(255.765536, 18.654793)).toBe(
      "18.65° up at azimuth 255.77° (WSW)",
    );
    expect(pointingText(120, -5.5)).toBe(
      "5.50° below the horizon at azimuth 120.00° (ESE)",
    );
  });

  it("puts the dish on its station and the Moon's view on Sacramento, each on the terrain globe, with the site camera", () => {
    const dish = SCENES["dish-tracks"]!;
    for (const id of ["DSS-14", "DSS-43", "DSS-63"] as const) {
      const k = { station: id };
      const s = DSN_STATIONS[id];
      expect(dish.earthSites!(k)).toEqual([s]);
      expect(dish.triads(k)).toEqual([s.name]);
      expect(dish.drawIn).toBeTypeOf("function");
      expect((dish.drawIn as (k: object) => string)(k)).toBe(s.name);
      expect(dish.look!(k)).toMatchObject({
        longitude: s.longitude,
        latitude: s.latitude,
      });
    }
    expect(dish.camera).toBe("site");
    expect(spec("dish-tracks").globe).toBe("terrain");
    expect(spec("dish-tracks").title).toBe("A dish tracks Orion");
    const moon = SCENES["moon-from-here"]!;
    expect(moon.earthSites!({})).toEqual([SACRAMENTO]);
    expect(moon.drawIn).toBe(SACRAMENTO.name);
    expect(moon.routeEnds?.start.title).toMatch(/MOON_ICRF/);
    expect(spec("moon-from-here").globe).toBe("terrain");
    expect(spec("moon-from-here").proof).toEqual([
      "space.moon-from-sacramento.range",
      "space.moon-from-sacramento.direction",
      "frame-tree.compositions.itrf-moon-icrf",
    ]);
  });
});

describe("the terrain line of sight's words (Task 6b, Review Focus 2)", () => {
  const result = (r: Partial<TerrainLineOfSight>): TerrainLineOfSight => ({
    clear: undefined,
    unknownFraction: 0,
    accuracy: { meters: 16, note: "exact against the drawn terrain" },
    ...r,
  });

  it("says clear only when the library says clear, with the clearance and the terrain's accuracy", () => {
    const v = terrainSightText(
      "o",
      "Orion",
      result({ clear: true, minClearance: 1234 }),
    );
    expect(v.state).toBe("clear");
    expect(v.text).toMatch(/clear, by 1\.2 km/);
    expect(v.accuracy).toBe("exact against the drawn terrain");
  });

  it("never says clear over unknown terrain, nor within the terrain's error", () => {
    const unknown = terrainSightText(
      "o",
      "Orion",
      result({ clear: undefined, unknownFraction: 0.3 }),
    );
    expect(unknown.state).toBe("unknown");
    expect(unknown.text).toMatch(/unknown over 30% of the path/);
    expect(unknown.text).not.toMatch(/is clear/);
    const close = terrainSightText(
      "o",
      "Orion",
      result({ clear: undefined, minClearance: 4 }),
    );
    expect(close.state).toBe("may-block");
    expect(close.text).toMatch(/may block/);
    const blocked = terrainSightText("o", "Orion", result({ clear: false }));
    expect(blocked.state).toBe("blocked");
    const waiting = terrainSightText(
      "o",
      "the Moon",
      undefined,
      "this view has no terrain globe",
    );
    expect(waiting.state).toBe("waiting");
    expect(waiting.text).toMatch(/no terrain globe/);
  });

  it("lifts an observer below the drawn ground onto it, and leaves one above it", () => {
    const at = (h: number) =>
      Array.from(
        Ellipsoid.WGS84.cartographicToCartesian(
          fromDegrees(148.98, -35.4, h),
          new Float64Array(3),
        ),
      );
    const line = { from: at(0), to: at(100_000) };
    const below = placeObserver(line, () => 40);
    expect(below.lifted).toBeCloseTo(40 + OBSERVER_LIFT, 6);
    const geo = Ellipsoid.WGS84.cartesianToCartographic(
      Float64Array.from(below.from),
      { longitude: 0, latitude: 0, height: 0 },
    )!;
    expect(geo.height).toBeCloseTo(40 + OBSERVER_LIFT, 6);
    // The ray keeps its direction: both ends move together.
    expect(below.to[2]! - below.from[2]!).toBeCloseTo(
      line.to[2]! - line.from[2]!,
      6,
    );
    const above = placeObserver({ from: at(689), to: at(5000) }, () => 600);
    expect(above.lifted).toBe(0);
    expect(placeObserver(line, () => undefined).lifted).toBe(0);
  });
});

describe("the dish's lines from orbit (Task 6b, the owner's ask)", () => {
  it("cuts a line at the Moon's near limb, and leaves one that passes it", () => {
    const origin = [0, 0, 0];
    const d = [1, 0, 0];
    // The Moon 384,400 km along x: a line straight at it stops one radius short.
    expect(moonCut(origin, d, 4e8, [3.844e8, 0, 0])).toBeCloseTo(
      3.844e8 - MOON_RADIUS,
      3,
    );
    // Off to the side by more than a radius: clear.
    expect(moonCut(origin, d, 4e8, [3.844e8, 2e6, 0])).toBeUndefined();
    // Beyond the line's end (Orion nearer than the Moon): clear.
    expect(moonCut(origin, d, 3e8, [3.844e8, 0, 0])).toBeUndefined();
  });

  it("places a unit line along the direction, scaled to its length", () => {
    const d = [0.6, 0.8, 0];
    const m = rayPlacement([1, 2, 3], d, 10);
    // z goes to d × length; the other two axes are square to it.
    expect([m[8], m[9], m[10]]).toEqual([6, 8, 0]);
    expect(m[0]! * d[0]! + m[1]! * d[1]! + m[2]! * d[2]!).toBeCloseTo(0, 12);
    expect(m[4]! * d[0]! + m[5]! * d[1]! + m[6]! * d[2]!).toBeCloseTo(0, 12);
    expect([m[12], m[13], m[14]]).toEqual([1, 2, 3]);
  });

  it("has a view knob that switches the camera and Orion's path, and draws every dish from orbit", () => {
    const dish = SCENES["dish-tracks"]!;
    expect(dish.cameraFor!({ station: "DSS-43", view: "dish" })).toBe("site");
    expect(dish.cameraFor!({ station: "DSS-43", view: "orbit" })).toBe(
      "earthMoon",
    );
    expect(dish.orion!({ view: "dish" })).toBeUndefined();
    expect(dish.orion!({ view: "orbit" })).toBe("GCRF");
    expect(dish.skyRay!.all!({ view: "orbit" })).toHaveLength(3);
    expect(dish.skyRay!.all!({ view: "dish" })).toBeUndefined();
    const view = spec("dish-tracks").knobs.find((k) => k.id === "view")!;
    expect(view.view).toBe(true);
  });
});
