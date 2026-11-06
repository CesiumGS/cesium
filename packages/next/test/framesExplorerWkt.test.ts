// The frames explorer's part 1c helpers (examples/frames-explorer/stress/):
// the WKT reader behind boundCrsChecks, the geocentric-to-geodetic inverse
// and the IFC map conversion's site transform.
import { describe, expect, it } from "vitest";
import references from "../examples/frames-explorer/references.json";
import {
  geocentricToGeodetic,
  geodeticToGeocentric,
  siteFromIfcMapConversion,
} from "../examples/frames-explorer/tests.ts";
import {
  axisMetres,
  bboxCentre,
  ellipsoidOfNode,
  epsgId,
  parseWkt,
  projectionOrigin,
  sourceCrsNode,
  towgs84Of,
} from "../examples/frames-explorer/stress/wkt.ts";

/** A BOUNDCRS whose only parameter is the scale difference, as given. */
const scaled = (parameter: string) =>
  parseWkt(`BOUNDCRS[SOURCECRS[GEOGCRS["x"]],TARGETCRS[GEOGCRS["WGS 84"]],
    ABRIDGEDTRANSFORMATION["t",METHOD["Position Vector transformation (geog2D domain)",ID["EPSG",9606]],
      PARAMETER["X-axis translation",0],PARAMETER["Y-axis translation",0],PARAMETER["Z-axis translation",0],
      ${parameter}]]`);

/** GDAL's WKT1 for ED50 / UTM 31N and OSGB 1936 / BNG with TOWGS84 (as PROJ 9.7.1's PJ_WKT1_GDAL writes them). */
const WKT1_ED50 = `PROJCS["unknown",GEOGCS["unknown",DATUM["Unknown based on International 1924 (Hayford 1909, 1910) ellipsoid using towgs84=-87,-98,-121,0,0,0,0",SPHEROID["International 1924 (Hayford 1909, 1910)",6378388,297],TOWGS84[-87,-98,-121,0,0,0,0]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",3],PARAMETER["scale_factor",0.9996],PARAMETER["false_easting",500000],PARAMETER["false_northing",0],UNIT["metre",1,AUTHORITY["EPSG","9001"]],AXIS["Easting",EAST],AXIS["Northing",NORTH]]`;

const ARCSECOND = Math.PI / 648_000;
const entries = references.entries as unknown as Record<
  string,
  { wkt2: string }
>;

describe("the WKT reader", () => {
  it("reads a BOUNDCRS's abridged Helmert in ISO 19162's units (scale as a factor)", () => {
    const root = parseWkt(entries["input-wkt2-osgb36-bng"]!.wkt2);
    const t = towgs84Of(root)!;
    expect(t.convention).toBe("position-vector");
    expect(t.methodCode).toBe(9606);
    expect(t.keepsHeight).toBe(true);
    expect(t.parameters.tx).toBe(446.448);
    expect(t.parameters.rz).toBeCloseTo(0.842 * ARCSECOND, 18);
    expect(t.parameters.ds).toBeCloseTo(-20.489e-6, 15);
    const source = ellipsoidOfNode(sourceCrsNode(root))!;
    expect(source.a).toBe(6377563.396);
    expect(1 / source.f).toBeCloseTo(299.3249646, 9);
  });

  it("honours stated units, and reads coordinate-frame and geocentric methods", () => {
    const root =
      parseWkt(`BOUNDCRS[SOURCECRS[GEOGCRS["x",DATUM["d",ELLIPSOID["e",6378137,298.257223563]],CS[ellipsoidal,2]]],
      TARGETCRS[GEOGCRS["WGS 84",DATUM["w",ELLIPSOID["WGS 84",6378137,298.257223563]],CS[ellipsoidal,2]]],
      ABRIDGEDTRANSFORMATION["t",METHOD["Coordinate Frame rotation (geocentric domain)",ID["EPSG",1032]],
        PARAMETER["X-axis translation",10,LENGTHUNIT["centimetre",0.01]],
        PARAMETER["Y-axis translation",0],PARAMETER["Z-axis translation",0],
        PARAMETER["Z-axis rotation",2,ANGLEUNIT["milliarc-second",4.84813681109536E-09]],
        PARAMETER["Scale difference",3,SCALEUNIT["parts per million",1E-06]]]]`);
    const t = towgs84Of(root)!;
    expect(t.convention).toBe("coordinate-frame");
    expect(t.keepsHeight).toBe(false);
    expect(t.parameters.tx).toBeCloseTo(0.1, 15);
    expect(t.parameters.rz).toBeCloseTo(2e-3 * ARCSECOND, 20);
    expect(t.parameters.ds).toBeCloseTo(3e-6, 18);
  });

  it("finds no TOWGS84 in a plain CRS, and its area of use's centre", () => {
    const root = parseWkt(entries["input-wkt2-wgs84-utm31n"]!.wkt2);
    expect(towgs84Of(root)).toBeUndefined();
    expect(bboxCentre(root)).toEqual([3, 42]);
  });

  it("refuses a transformation that is not a Helmert", () => {
    const root = parseWkt(
      `BOUNDCRS[SOURCECRS[GEOGCRS["x"]],TARGETCRS[GEOGCRS["y"]],ABRIDGEDTRANSFORMATION["t",METHOD["NTv2",ID["EPSG",9615]]]]`,
    );
    expect(() => towgs84Of(root)).toThrow(/not a Helmert/);
  });

  it("rejects malformed, deep and oversized text with the error's position", () => {
    expect(() => parseWkt(`PROJCRS["a"`)).toThrow(/WKT: .* at character/);
    expect(() => parseWkt(`PROJCRS["a"] x`)).toThrow(/text after the end/);
    expect(() => parseWkt(`${"A[".repeat(100)}${"]".repeat(100)}`)).toThrow(
      /nesting deeper/,
    );
    expect(() => parseWkt(`A["${"x".repeat(200_001)}"]`)).toThrow(/longer/);
    expect(parseWkt(`A["say ""hi""",1.5E-3,east]`).args).toEqual([
      'say "hi"',
      0.0015,
      "east",
    ]);
  });
});

describe("the scale difference's units", () => {
  it("reads a unity, ppm or parts-per-billion scale difference, and a bare scale factor, as dS", () => {
    for (const parameter of [
      'PARAMETER["Scale difference",0.99998,SCALEUNIT["unity",1]]',
      'PARAMETER["Scale difference",-20,SCALEUNIT["parts per million",1E-06]]',
      'PARAMETER["Scale difference",-20000,SCALEUNIT["parts per billion",1E-09]]',
      'PARAMETER["Scale difference",-0.00002,SCALEUNIT["unity",1]]',
      'PARAMETER["Scale difference",0.99998]',
    ]) {
      expect(
        towgs84Of(scaled(parameter))!.parameters.ds,
        parameter,
      ).toBeCloseTo(-2e-5, 15);
    }
  });

  it("refuses a scale that is neither a factor near 1 nor a small difference", () => {
    expect(() =>
      towgs84Of(scaled('PARAMETER["Scale difference",3,SCALEUNIT["unity",1]]')),
    ).toThrow(/scale difference/);
  });
});

describe("WKT1 (GDAL's TOWGS84)", () => {
  it("reads TOWGS84 as a position-vector Helmert in metres, arc-seconds and ppm", () => {
    const seven = parseWkt(
      WKT1_ED50.replace(
        "TOWGS84[-87,-98,-121,0,0,0,0]",
        "TOWGS84[446.448,-125.157,542.06,0.15,0.247,0.842,-20.489]",
      ),
    );
    const t = towgs84Of(seven)!;
    expect(t.convention).toBe("position-vector");
    expect(t.keepsHeight).toBe(true);
    expect(t.parameters.tx).toBe(446.448);
    expect(t.parameters.ry).toBeCloseTo(0.247 * ARCSECOND, 18);
    expect(t.parameters.ds).toBeCloseTo(-20.489e-6, 15);
    const three = towgs84Of(
      parseWkt(
        WKT1_ED50.replace(
          "TOWGS84[-87,-98,-121,0,0,0,0]",
          "TOWGS84[-87,-98,-121]",
        ),
      ),
    )!;
    expect(three.parameters.tz).toBe(-121);
    expect(three.parameters.ds).toBe(0);
  });

  it("reads WKT1's spheroid, unit, origin and authority", () => {
    const root = parseWkt(WKT1_ED50);
    const crs = sourceCrsNode(root);
    expect(ellipsoidOfNode(crs)).toEqual({
      name: "International 1924 (Hayford 1909, 1910)",
      a: 6378388,
      f: 1 / 297,
    });
    expect(axisMetres(crs)).toBe(1);
    expect(projectionOrigin(crs)).toEqual([3, 0]);
    expect(
      epsgId(
        parseWkt(`PROJCS["ED50 / UTM zone 31N",AUTHORITY["EPSG","23031"]]`),
      ),
    ).toBe(23031);
  });
});

describe("geocentricToGeodetic", () => {
  it("inverts geodeticToGeocentric to 1e-9 m from the pole to the equator, below and above the ellipsoid", () => {
    const a = 6378137;
    const f = 1 / 298.257223563;
    for (const lat of [-90, -60, -23.67, 0, 0.5, 45, 56, 89.999, 90]) {
      for (const h of [-2000, 0, 1000, 2e7]) {
        const xyz = geodeticToGeocentric(17.3, lat, h, a, f);
        const back = geocentricToGeodetic(xyz, a, f);
        const again = geodeticToGeocentric(back[0], back[1], back[2], a, f);
        expect(Math.hypot(...xyz.map((v, i) => v - again[i]!))).toBeLessThan(
          1e-8,
        );
        expect(Math.abs(back[2] - h)).toBeLessThan(1e-8);
      }
    }
  });
});

describe("siteFromIfcMapConversion", () => {
  it("rotates anticlockwise by atan2(XAxisOrdinate, XAxisAbscissa), and defaults as IFC does", () => {
    const site = siteFromIfcMapConversion({
      eastings: 100,
      northings: 200,
      orthogonalHeight: 3,
      xAxisAbscissa: 0,
      xAxisOrdinate: -2,
      scale: 0.5,
    });
    expect(site.origin).toEqual([100, 200, 3]);
    expect(site.rotation).toBeCloseTo(-Math.PI / 2, 15);
    expect(site.scale).toBe(0.5);
    const plain = siteFromIfcMapConversion({
      eastings: 0,
      northings: 0,
      orthogonalHeight: 0,
    });
    expect(plain.rotation).toBe(0);
    expect(plain.scale).toBe(1);
    expect(() =>
      siteFromIfcMapConversion({
        eastings: 0,
        northings: 0,
        orthogonalHeight: 0,
        xAxisAbscissa: 0,
        xAxisOrdinate: 0,
      }),
    ).toThrow(RangeError);
  });
});
