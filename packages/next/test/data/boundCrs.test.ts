// A WKT2 BOUNDCRS reference (what GDAL and iModel export for a datum with
// TOWGS84) as an engineering frame's CRS, against real PROJ. `npm run
// test:data` runs it.
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import { crsUnits, type CrsRef } from "../../src/engineering/crs.ts";
import { EngineeringFrame } from "../../src/engineering/EngineeringFrame.ts";
import { gridFactors } from "../../src/engineering/factors.ts";
import { loadProj } from "../../src/engineering/proj.ts";
import { EARTH } from "../../src/scene/Body.ts";

const base = `${join(framesDataDirectory(), "proj")}/`;
// Lambert-93 (EPSG:2154) with a TOWGS84 translation that makes the datum
// operation visible (a real one is metres; this one is ~11 m).
const LAMBERT93 =
  "+proj=lcc +lat_0=46.5 +lon_0=3 +lat_1=49 +lat_2=44 +x_0=700000 +y_0=6600000 +ellps=GRS80 +units=m +no_defs +type=crs";
const SHIFT = [10, 5, 2];
const design = [700_000, 6_600_000, 100];

async function frames() {
  const P = await loadProj({ base });
  const bound = P.proj_create(
    `${LAMBERT93} +towgs84=${SHIFT.join(",")},0,0,0,0`,
  );
  const wkt2 = P.proj_as_wkt(bound, P.PJ_WKT2_2019);
  const ref: CrsRef = { format: "wkt2", wkt2 };
  const make = (crs: CrsRef) =>
    EngineeringFrame.create({ name: "f", body: EARTH, crs }, P);
  return {
    P,
    ref,
    wkt2,
    bound: make(ref),
    plain: make({ format: "wkid", authority: "EPSG", wkid: 2154 }),
  };
}

describe("WKT2 BOUNDCRS reference", () => {
  it("is a BOUNDCRS", async () => {
    const { P, wkt2 } = await frames();
    expect(wkt2).toMatch(/^BOUNDCRS\[/);
    expect(P.proj_get_type(P.proj_create(wkt2))).toBe(P.PJ_TYPE_BOUND_CRS);
  });

  it("reads units from the CRS it wraps", async () => {
    const { P, ref, bound } = await frames();
    const units = crsUnits(P, ref);
    expect(units.projected).toBe(true);
    expect(units.horizontalUnitName).toBe("metre");
    expect(units.metersPerUnit).toBe(1);
    expect(bound.units).toEqual(units);
  });

  it("gridFactors match the unbound CRS's (same projection)", async () => {
    const { bound, plain } = await frames();
    const a = gridFactors(bound, design);
    const b = gridFactors(plain, design);
    expect(a.pointScale).toBeGreaterThan(0.99);
    expect(a.pointScale).toBeLessThan(1);
    expect(Math.abs(a.pointScale - b.pointScale)).toBeLessThan(1e-12);
    expect(Math.abs(a.convergence - b.convergence)).toBeLessThan(1e-12);
  });

  it("round-trips design to body-fixed and back", async () => {
    const { bound } = await frames();
    const back = bound.fromBodyFixed(bound.toBodyFixed(design));
    for (let i = 0; i < 3; i++) {
      expect(Math.abs(back[i]! - design[i]!)).toBeLessThan(1e-4);
    }
  });

  it("records the bound TOWGS84 transformation as its operation", async () => {
    const { bound, plain } = await frames();
    expect(bound.operation.pipeline).toMatch(/\+proj=helmert/);
    expect(bound.operation.pipeline).toMatch(/\+x=10\b/);
    expect(plain.operation.pipeline).not.toMatch(/\+x=10\b/);
    // PROJ pushes the height around a 2D CRS's datum step, so the TOWGS84
    // translation moves the point horizontally: by its east and north parts at
    // the point (the geocentric (x, y, z) rotated to the local frame).
    const { longitude: lon, latitude: lat } = plain.toGeodetic(design);
    const [x, y, z] = SHIFT as [number, number, number];
    const east = -Math.sin(lon) * x + Math.cos(lon) * y;
    const north =
      -Math.sin(lat) * Math.cos(lon) * x -
      Math.sin(lat) * Math.sin(lon) * y +
      Math.cos(lat) * z;
    const a = bound.toBodyFixed(design);
    const b = plain.toBodyFixed(design);
    const shift = Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);
    expect(Math.abs(shift - Math.hypot(east, north))).toBeLessThan(0.01);
    expect(shift).toBeGreaterThan(5);
  });
});

// PROJ pushes the height around a geocentric Helmert in a 2D CRS: the forward
// runs the geocentric step at the input height on the source ellipsoid, the
// inverse at the same height on WGS84, though the height moved by dh. Left
// alone the round trip is off by millimetres; the recorded inverse refines
// itself against the forward.
describe("realistic datum shifts round-trip exactly", () => {
  const heights = [0, 100, 1000];
  const cases: [string, string, number[]][] = [
    [
      "Tokyo TOWGS84",
      "+proj=tmerc +lat_0=0 +lon_0=141 +k=0.9996 +x_0=500000 +y_0=0 +ellps=bessel +towgs84=-146.414,507.337,680.507,0,0,0,0 +units=m +no_defs +type=crs",
      [500_000, 3_900_000],
    ],
    [
      "ED50 / UTM 31N TOWGS84",
      "+proj=utm +zone=31 +ellps=intl +towgs84=-87,-98,-121,0,0,0,0 +units=m +no_defs +type=crs",
      [500_000, 4_650_000],
    ],
    [
      "OSGB 1936 7-parameter",
      "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs +type=crs",
      [400_000, 300_000],
    ],
  ];
  for (const [label, definition, [e, n]] of cases) {
    it(`${label}: design to body-fixed and back within 1e-6 m at h = 0, 100, 1000`, async () => {
      const P = await loadProj({ base });
      const wkt2 = P.proj_as_wkt(P.proj_create(definition), P.PJ_WKT2_2019);
      const frame = EngineeringFrame.create(
        { name: "f", body: EARTH, crs: { format: "wkt2", wkt2 } },
        P,
      );
      for (const h of heights) {
        const d = [e!, n!, h];
        const back = frame.fromBodyFixed(frame.toBodyFixed(d));
        for (let i = 0; i < 3; i++) {
          expect(Math.abs(back[i]! - d[i]!)).toBeLessThan(1e-6);
        }
      }
    });
  }
});
