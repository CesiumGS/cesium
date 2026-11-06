// EngineeringFrame against real PROJ and the frames data store (plan 4a task
// 3). `npm run test:data` runs it.
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import { crsUnits, type CrsRef } from "../../src/engineering/crs.ts";
import {
  EngineeringFrame,
  RigidPlacement,
  type SiteTransform,
} from "../../src/engineering/EngineeringFrame.ts";
import { loadProj } from "../../src/engineering/proj.ts";
import { EARTH, MOON } from "../../src/scene/Body.ts";

const base = `${join(framesDataDirectory(), "proj")}/`;
const US_FOOT = 0.3048006096012192;
const distance = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);

const california: CrsRef = {
  format: "wkid",
  authority: "EPSG",
  wkid: 6420,
  vcsWkid: 6360,
};
const site: SiteTransform = {
  origin: [6_000_000, 2_100_000, 0],
  rotation: (12.5 * Math.PI) / 180,
  scale: 1.0000375,
};
const FALSE_EASTING = 6_561_666.667; // ftUS, zone 3's central meridian

async function californiaFrame() {
  const P = await loadProj({ base });
  return EngineeringFrame.create(
    { name: "CA3", body: EARTH, crs: california, site },
    P,
  );
}

describe("Earth: NAD83(2011) / California zone 3 ftUS + NAVD88 ftUS", () => {
  it("takes its units from PROJ: the US survey foot", async () => {
    const frame = await californiaFrame();
    expect(frame.units.metersPerUnit).toBeCloseTo(US_FOOT, 15);
    expect(frame.units.metersPerVerticalUnit).toBeCloseTo(US_FOOT, 15);
    expect(frame.operation.grids).toContain("us_noaa_g2018u0.tif");
  });

  it("round trips within 1e-4 m along 50 km and 100 km from the central meridian", async () => {
    const frame = await californiaFrame();
    const length = 164_042; // ftUS, 50 km
    const designs: number[][] = [];
    for (let i = 0; i <= 20; i++) {
      designs.push([(i * length) / 20, (i * length) / 40, 25]);
    }
    // 100 km east of the central meridian (328,084 ftUS), at the site's northing.
    designs.push(
      Array.from(frame.fromProjected([FALSE_EASTING + 328_084, 2_100_000, 25])),
    );
    let worst = 0;
    for (const design of designs) {
      const p = frame.toBodyFixed(design);
      const back = frame.fromBodyFixed(p);
      for (let i = 0; i < 2; i++) {
        worst = Math.max(worst, Math.abs(back[i]! - design[i]!) * US_FOOT);
      }
      worst = Math.max(worst, Math.abs(back[2]! - design[2]!) * US_FOOT);
    }
    expect(worst).toBeLessThan(1e-4);
  });

  it("converts a design height from ftUS: 100 ftUS is 30.48006 m above the geoid-referenced zero", async () => {
    const frame = await californiaFrame();
    const low = frame.toGeodetic([0, 0, 0]);
    const high = frame.toGeodetic([0, 0, 100]);
    expect(high.height - low.height).toBeCloseTo(100 * US_FOOT, 6);
    // The geoid separation: well away from zero in California (about -33 m).
    expect(low.height).toBeLessThan(-25);
    expect(low.height).toBeGreaterThan(-45);
  });

  it("places a point on the Earth: longitude and latitude in California", async () => {
    const frame = await californiaFrame();
    const g = frame.toGeodetic([0, 0, 0]);
    expect((g.longitude * 180) / Math.PI).toBeLessThan(-118);
    expect((g.longitude * 180) / Math.PI).toBeGreaterThan(-123);
    expect((g.latitude * 180) / Math.PI).toBeGreaterThan(35);
    expect((g.latitude * 180) / Math.PI).toBeLessThan(39);
  });
});

describe("design height without a vertical axis, and geographic CRSs", () => {
  it("EPSG:6420 alone passes design height through in CRS units (no geoid)", async () => {
    const P = await loadProj({ base });
    const frame = EngineeringFrame.create(
      {
        name: "2D",
        body: EARTH,
        crs: { format: "wkid", authority: "EPSG", wkid: 6420 },
      },
      P,
    );
    expect(frame.units.metersPerVerticalUnit).toBeUndefined();
    const g = frame.toGeodetic([FALSE_EASTING, 1_640_416.667, 100]);
    expect(Math.abs(g.height - 100 * 0.30480060960121924)).toBeLessThan(1e-9);
    const back = frame.fromBodyFixed(
      frame.toBodyFixed([FALSE_EASTING, 1_640_416.667, 100]),
    );
    expect(Math.abs(back[2]! - 100) * US_FOOT).toBeLessThan(1e-6);
  });

  it("rejects a geographic CRS", async () => {
    const P = await loadProj({ base });
    for (const wkid of [4326, 4269]) {
      expect(() =>
        EngineeringFrame.create(
          {
            name: "geo",
            body: EARTH,
            crs: { format: "wkid", authority: "EPSG", wkid },
          },
          P,
        ),
      ).toThrow(/needs a projected CRS/);
    }
  });
});

describe("US survey foot against the international foot (R5)", () => {
  it("EPSG:2227 and EPSG:2223 report their own units", async () => {
    const P = await loadProj({ base });
    const us = crsUnits(P, { format: "wkid", authority: "EPSG", wkid: 2227 });
    const intl = crsUnits(P, { format: "wkid", authority: "EPSG", wkid: 2223 });
    expect(us.metersPerUnit).toBeCloseTo(US_FOOT, 15);
    expect(intl.metersPerUnit).toBe(0.3048);
    expect(us.metersPerUnit / intl.metersPerUnit - 1).toBeCloseTo(2.0e-6, 10);
  });

  // EPSG:2227 (California 3, NAD83) and EPSG:2223 (Arizona Central) are
  // different projections, so the same numbers are not comparable. The pair is
  // one projection in both units: EPSG:6420 (NAD83(2011) / California zone 3,
  // ftUS) and its WKT2 with only the axes' unit changed to the international
  // foot (the conversion's parameters keep their own ftUS unit, so the map is
  // identical). Points 1 km from the false origin, same numeric coordinates.
  it("the same numbers differ by the 2 ppm scale, and each round trips", async () => {
    const P = await loadProj({ base });
    const wkt = P.proj_as_wkt(P.proj_create("EPSG:6420"), P.PJ_WKT2_2019);
    // Only the coordinate system's axes change unit.
    const cs = wkt.indexOf("CS[");
    const international =
      wkt.slice(0, cs) +
      wkt
        .slice(cs)
        .replaceAll(
          'LENGTHUNIT["US survey foot",0.304800609601219]',
          'LENGTHUNIT["foot",0.3048]',
        );
    expect(international).not.toBe(wkt);
    const usFrame = EngineeringFrame.create(
      {
        name: "ftUS",
        body: EARTH,
        crs: { format: "wkid", authority: "EPSG", wkid: 6420 },
      },
      P,
    );
    const ftFrame = EngineeringFrame.create(
      { name: "ft", body: EARTH, crs: { format: "wkt2", wkt2: international } },
      P,
    );
    expect(usFrame.units.metersPerUnit).toBeCloseTo(US_FOOT, 15);
    expect(ftFrame.units.metersPerUnit).toBe(0.3048);

    const origin = [FALSE_EASTING, 1_640_416.667, 0];
    // 1000 m in design units of each frame.
    const along = (frame: EngineeringFrame) => [
      origin[0]! + 1000 / frame.units.metersPerUnit,
      origin[1]!,
      0,
    ];
    // The same numeric coordinates, in both frames.
    const numbers = [origin[0]! + 3280.84, origin[1]!, 0];
    const dUs = distance(
      usFrame.toBodyFixed(numbers),
      usFrame.toBodyFixed(origin),
    );
    const dFt = distance(
      ftFrame.toBodyFixed(numbers),
      ftFrame.toBodyFixed(origin),
    );
    const ratio = dUs / dFt;
    expect(Math.abs(ratio - 1 - 2.0e-6)).toBeLessThan(2.0e-6 * 1e-2);
    expect(Math.abs(ratio / (1 + 2.0e-6) - 1)).toBeLessThan(1e-7);
    // 1 km: the frames' own 1000 m points are 1000 m apart (grid), each way.
    for (const frame of [usFrame, ftFrame]) {
      const p = frame.toBodyFixed(along(frame));
      const o = frame.toBodyFixed(origin);
      expect(Math.abs(distance(p, o) - 1000) / 1000).toBeLessThan(2e-4);
      const back = frame.fromBodyFixed(p);
      for (let i = 0; i < 3; i++) {
        expect(
          Math.abs(back[i]! - along(frame)[i]!) * frame.units.metersPerUnit,
        ).toBeLessThan(1e-4);
      }
    }
  });
});

describe("Moon: IAU 2015 south polar", () => {
  const south: CrsRef = { format: "wkid", authority: "IAU_2015", wkid: 30135 };

  it("round trips within 1e-4 m and lies on the sphere at the design height", async () => {
    const P = await loadProj({ base });
    const frame = EngineeringFrame.create(
      { name: "Moon south", body: MOON, crs: south },
      P,
    );
    expect(frame.units.metersPerUnit).toBe(1);
    let worst = 0;
    for (const design of [
      [0, 0, 0],
      [12_345.6, -23_456.7, 100],
      [-450_000, 300_000, -250],
      [1e5, 1e5, 5000],
    ]) {
      const p = frame.toBodyFixed(design);
      expect(
        Math.abs(Math.hypot(p[0]!, p[1]!, p[2]!) - (1_737_400 + design[2]!)),
      ).toBeLessThan(1e-6);
      const back = frame.fromBodyFixed(p);
      for (let i = 0; i < 3; i++) {
        worst = Math.max(worst, Math.abs(back[i]! - design[i]!));
      }
    }
    expect(worst).toBeLessThan(1e-4);
    // The pole itself.
    const pole = frame.toBodyFixed([0, 0, 0]);
    expect(pole[2]).toBeCloseTo(-1_737_400, 6);
  });
});

describe("RigidPlacement", () => {
  const anchor = [0, 0, 0];

  it("equals toBodyFixed at the anchor and inverts its own forward exactly", async () => {
    const frame = await californiaFrame();
    const placement = RigidPlacement.at(frame, anchor);
    const exact = frame.toBodyFixed(anchor);
    expect(distance(placement.toBodyFixed(anchor), exact)).toBeLessThan(1e-6);
    let worst = 0;
    for (const design of [
      [0, 0, 0],
      [32_808, 0, 10],
      [-20_000, 15_000, -5],
      [0, 90_000, 30],
    ]) {
      const back = placement.fromBodyFixed(placement.toBodyFixed(design));
      for (let i = 0; i < 3; i++) {
        worst = Math.max(worst, Math.abs(back[i]! - design[i]!) * US_FOOT);
      }
    }
    expect(worst).toBeLessThan(1e-9);
    // The matrix is the same map.
    const m = placement.matrix;
    const d = [32_808, 5000, 10];
    const viaMatrix = [0, 1, 2].map(
      (r) => m[r]! * d[0]! + m[4 + r]! * d[1]! + m[8 + r]! * d[2]! + m[12 + r]!,
    );
    expect(distance(viaMatrix, placement.toBodyFixed(d))).toBeLessThan(1e-6);
  });

  it("sags 7.8 m (+-1.5) from toBodyFixed at 10 km along grid east", async () => {
    const frame = await californiaFrame();
    const placement = RigidPlacement.at(frame, anchor);
    const east = [anchor[0]! + 10_000 / US_FOOT, anchor[1]!, anchor[2]!];
    const sag = distance(placement.toBodyFixed(east), frame.toBodyFixed(east));
    expect(Math.abs(sag - 7.8)).toBeLessThan(1.5);
  });

  it("grid north at the anchor follows the operation (site rotation included)", async () => {
    const frame = await californiaFrame();
    const placement = RigidPlacement.at(frame, anchor);
    const step = 500 / US_FOOT;
    // 500 m along design north is, to 1e-3 rad of direction, the placement's north.
    const o = frame.toBodyFixed(anchor);
    const n = frame.toBodyFixed([anchor[0]!, anchor[1]! + step, anchor[2]!]);
    const r = placement.toBodyFixed([
      anchor[0]!,
      anchor[1]! + step,
      anchor[2]!,
    ]);
    const along = [n[0]! - o[0]!, n[1]! - o[1]!, n[2]! - o[2]!];
    const rigid = [r[0]! - o[0]!, r[1]! - o[1]!, r[2]! - o[2]!];
    const cos =
      (along[0]! * rigid[0]! + along[1]! * rigid[1]! + along[2]! * rigid[2]!) /
      (Math.hypot(...along) * Math.hypot(...rigid));
    expect(Math.acos(Math.min(1, cos))).toBeLessThan(2e-4);
  });
});
