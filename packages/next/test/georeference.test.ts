// The tileset declaration, EXT_engineering_frame (plan 4b task 11): parsing
// only. Each malformed case of Review Focus 3 that a parse can find throws a
// GeoreferenceError naming its JSON path; the anchor case needs PROJ and is
// test/data/georeferenceTileset.test.ts's.
import { describe, expect, it } from "vitest";
import {
  ENGINEERING_FRAME_EXTENSION,
  GeoreferenceError,
  readGeoreference,
} from "../src/engineering/georeference.ts";
import { EARTH, MOON } from "../src/scene/Body.ts";

const ROOT = "extensions.EXT_engineering_frame";

/** A rigid, wkid-format declaration (the corridor's shape). */
function rigid(): Record<string, unknown> {
  return {
    name: "Mainline",
    crs: {
      format: "wkid",
      extensions: {
        EXT_geospatial_crs_wkid: {
          authority: "EPSG",
          wkid: 6420,
          vcsWkid: 6360,
        },
      },
    },
    site: {
      origin: [6_000_000, 2_100_000, 0],
      rotation: 0.25,
      scale: 1.0000375,
    },
    areaOfInterest: { west: -122.5, south: 37.5, east: -121.5, north: 38.2 },
    alignments: [
      {
        name: "Mainline",
        start: [6_080_000, 2_110_000],
        startAzimuth: 1.745,
        startStation: 10_000,
        horizontal: [
          { kind: "line", length: 1000 },
          { kind: "spiral", length: 500, startRadius: null, endRadius: 5000 },
          { kind: "arc", length: 800, radius: 5000 },
          { kind: "spiral", length: 500, startRadius: 5000, endRadius: null },
        ],
        vertical: {
          startStation: 10_000,
          startElevation: 120,
          segments: [
            { kind: "grade", length: 1000, grade: 0.01 },
            {
              kind: "parabola",
              length: 800,
              startGrade: 0.01,
              endGrade: -0.02,
            },
          ],
        },
      },
    ],
    placement: { mode: "rigid", anchor: [6_080_000, 2_110_000, 100] },
  };
}

const tileset = (declaration: unknown) => ({
  asset: { version: "1.1" },
  geometricError: 100,
  root: { geometricError: 0, boundingVolume: { sphere: [0, 0, 0, 1] } },
  extensionsUsed: [ENGINEERING_FRAME_EXTENSION],
  extensions: { [ENGINEERING_FRAME_EXTENSION]: declaration },
});

/** The GeoreferenceError reading `declaration` throws. */
function failure(declaration: unknown): GeoreferenceError {
  try {
    readGeoreference(tileset(declaration));
  } catch (error) {
    expect(error).toBeInstanceOf(GeoreferenceError);
    return error as GeoreferenceError;
  }
  throw new Error("expected a GeoreferenceError");
}

describe("readGeoreference", () => {
  it("names the extension EXT_engineering_frame", () => {
    expect(ENGINEERING_FRAME_EXTENSION).toBe("EXT_engineering_frame");
  });

  it("gives undefined when the extension is absent", () => {
    expect(readGeoreference({ asset: { version: "1.1" } })).toBeUndefined();
    expect(readGeoreference({ extensions: {} })).toBeUndefined();
    expect(
      readGeoreference({ extensions: { EXT_other: { a: 1 } } }),
    ).toBeUndefined();
    expect(readGeoreference(undefined)).toBeUndefined();
    expect(readGeoreference("tileset")).toBeUndefined();
  });

  it("reads a rigid wkid declaration", () => {
    const g = readGeoreference(tileset(rigid()))!;
    expect(g.name).toBe("Mainline");
    expect(g.body).toBe(EARTH);
    expect(g.crs).toEqual({
      format: "wkid",
      authority: "EPSG",
      wkid: 6420,
      vcsWkid: 6360,
    });
    expect(g.site).toEqual({
      origin: [6_000_000, 2_100_000, 0],
      rotation: 0.25,
      scale: 1.0000375,
    });
    expect(g.areaOfInterest).toEqual({
      west: -122.5,
      south: 37.5,
      east: -121.5,
      north: 38.2,
    });
    expect(g.placement).toEqual({
      mode: "rigid",
      anchor: [6_080_000, 2_110_000, 100],
    });
    const a = g.alignments![0]!;
    expect(a.name).toBe("Mainline");
    expect(a.start).toEqual([6_080_000, 2_110_000]);
    // JSON has no Infinity: a spiral's null radius is a tangent end.
    expect(a.horizontal[1]).toEqual({
      kind: "spiral",
      length: 500,
      startRadius: Infinity,
      endRadius: 5000,
    });
    expect(a.horizontal[3]).toMatchObject({ endRadius: Infinity });
    expect(a.vertical!.segments).toHaveLength(2);
  });

  it("reads a reprojected wkt2 declaration on the Moon", () => {
    const wkt2 = 'PROJCRS["Moon local",BASEGEOGCRS["Moon (2015)"]]';
    const g = readGeoreference(
      tileset({
        body: "MOON",
        crs: {
          format: "wkt2",
          extensions: { EXT_geospatial_crs_wkt2: { wkt2 } },
        },
        placement: { mode: "reprojected" },
      }),
    )!;
    expect(g.body).toBe(MOON);
    expect(g.crs).toEqual({ format: "wkt2", wkt2 });
    expect(g.placement).toEqual({ mode: "reprojected" });
    expect(g.name).toBeUndefined();
    expect(g.site).toBeUndefined();
    expect(g.alignments).toBeUndefined();
    expect(g.areaOfInterest).toBeUndefined();
  });

  it("reads the wkid companion's epoch, a decimal-year string in the draft", () => {
    const declaration = rigid();
    const crs = declaration.crs as {
      extensions: { EXT_geospatial_crs_wkid: Record<string, unknown> };
    };
    crs.extensions.EXT_geospatial_crs_wkid = {
      authority: "EPSG",
      wkid: 7912,
      epoch: "2019.81",
    };
    expect(readGeoreference(tileset(declaration))!.crs).toEqual({
      format: "wkid",
      authority: "EPSG",
      wkid: 7912,
      epoch: 2019.81,
    });
  });

  it("ignores unknown extra fields", () => {
    const declaration: Record<string, unknown> = {
      ...rigid(),
      comment: "made by hand",
      extras: { a: 1 },
      placement: { mode: "reprojected", anchor: "ignored", note: 1 },
    };
    (declaration.crs as Record<string, unknown>).something = true;
    const g = readGeoreference(tileset(declaration))!;
    expect(g.placement).toEqual({ mode: "reprojected" });
    expect(g.crs).toEqual({
      format: "wkid",
      authority: "EPSG",
      wkid: 6420,
      vcsWkid: 6360,
    });
    expect(Object.keys(g)).not.toContain("comment");
  });

  describe("refuses, naming the path (Review Focus 3)", () => {
    it("an unknown placement mode", () => {
      const e = failure({ ...rigid(), placement: { mode: "warped" } });
      expect(e.path).toBe(`${ROOT}.placement.mode`);
      expect(e.message).toContain(`${ROOT}.placement.mode`);
      expect(e.message).toContain('"rigid" or "reprojected"');
    });

    it("an unknown CRS format", () => {
      const e = failure({
        ...rigid(),
        crs: { format: "projjson", extensions: {} },
      });
      expect(e.path).toBe(`${ROOT}.crs.format`);
      expect(e.message).toContain(`${ROOT}.crs.format`);
    });

    it("a missing crs", () => {
      const declaration = rigid();
      delete declaration.crs;
      const e = failure(declaration);
      expect(e.path).toBe(`${ROOT}.crs`);
      expect(e.message).toContain(`${ROOT}.crs`);
    });

    it("a format whose companion is missing", () => {
      const e = failure({
        ...rigid(),
        crs: { format: "wkt2", extensions: {} },
      });
      expect(e.path).toBe(`${ROOT}.crs.extensions.EXT_geospatial_crs_wkt2`);
    });

    it("NaN in a site transform", () => {
      for (const site of [
        { origin: [6e6, Number.NaN, 0], rotation: 0, scale: 1 },
        { origin: [6e6, 2e6, 0], rotation: Number.NaN, scale: 1 },
        { origin: [6e6, 2e6, 0], rotation: 0, scale: Number.NaN },
      ]) {
        const e = failure({ ...rigid(), site });
        expect(e.path).toMatch(/^extensions\.EXT_engineering_frame\.site\./);
        expect(e.message).toContain(e.path);
        expect(e.message).toContain("finite");
      }
      expect(
        failure({
          ...rigid(),
          site: { origin: [6e6, Number.NaN, 0], rotation: 0, scale: 1 },
        }).path,
      ).toBe(`${ROOT}.site.origin[1]`);
    });

    it("a WKT2 over 65,536 characters", () => {
      const wkt = (n: number) =>
        `PROJCRS["${"x".repeat(n - 'PROJCRS[""]'.length)}"]`;
      const declaration = (n: number) => ({
        crs: {
          format: "wkt2",
          extensions: { EXT_geospatial_crs_wkt2: { wkt2: wkt(n) } },
        },
        placement: { mode: "reprojected" },
      });
      expect(wkt(65_536)).toHaveLength(65_536);
      expect(readGeoreference(tileset(declaration(65_536)))!.crs).toEqual({
        format: "wkt2",
        wkt2: wkt(65_536),
      });
      const e = failure(declaration(65_537));
      expect(e.path).toBe(
        `${ROOT}.crs.extensions.EXT_geospatial_crs_wkt2.wkt2`,
      );
      expect(e.message).toContain("65,536");
      // The untrusted text isn't echoed back.
      expect(e.message.length).toBeLessThan(300);
    });

    it("more than 64 alignments", () => {
      const one = (rigid().alignments as unknown[])[0] as Record<
        string,
        unknown
      >;
      const many = (n: number) =>
        Array.from({ length: n }, (_, i) => ({ ...one, name: `A${i}` }));
      expect(
        readGeoreference(tileset({ ...rigid(), alignments: many(64) }))!
          .alignments,
      ).toHaveLength(64);
      const e = failure({ ...rigid(), alignments: many(65) });
      expect(e.path).toBe(`${ROOT}.alignments`);
      expect(e.message).toContain("64");
    });

    it("non-finite numbers anywhere they are read", () => {
      const anchor = failure({
        ...rigid(),
        placement: { mode: "rigid", anchor: [1, Infinity, 0] },
      });
      expect(anchor.path).toBe(`${ROOT}.placement.anchor[1]`);
      const declaration = rigid();
      const alignment = (
        declaration.alignments as Record<string, unknown>[]
      )[0]!;
      (alignment.horizontal as Record<string, unknown>[])[2]!.radius = "5000";
      expect(failure(declaration).path).toBe(
        `${ROOT}.alignments[0].horizontal[2].radius`,
      );
      expect(
        failure({
          ...rigid(),
          areaOfInterest: { west: 0, south: 0, east: Number.NaN, north: 1 },
        }).path,
      ).toBe(`${ROOT}.areaOfInterest.east`);
    });

    it("a rigid placement without an anchor, and a missing placement", () => {
      expect(failure({ ...rigid(), placement: { mode: "rigid" } }).path).toBe(
        `${ROOT}.placement.anchor`,
      );
      const declaration = rigid();
      delete declaration.placement;
      expect(failure(declaration).path).toBe(`${ROOT}.placement`);
    });

    it("an unknown body, and a wkid that isn't an integer", () => {
      expect(failure({ ...rigid(), body: "MARS" }).path).toBe(`${ROOT}.body`);
      const declaration = rigid();
      (
        declaration.crs as {
          extensions: { EXT_geospatial_crs_wkid: Record<string, unknown> };
        }
      ).extensions.EXT_geospatial_crs_wkid.wkid = 6420.5;
      expect(failure(declaration).path).toBe(
        `${ROOT}.crs.extensions.EXT_geospatial_crs_wkid.wkid`,
      );
    });

    it("an authority that isn't a registry name", () => {
      const declaration = rigid();
      (
        declaration.crs as {
          extensions: { EXT_geospatial_crs_wkid: Record<string, unknown> };
        }
      ).extensions.EXT_geospatial_crs_wkid.authority = "EPSG:4326 +proj=x";
      expect(failure(declaration).path).toBe(
        `${ROOT}.crs.extensions.EXT_geospatial_crs_wkid.authority`,
      );
    });

    it("a declaration that isn't an object", () => {
      expect(failure("rigid").path).toBe(ROOT);
      expect(failure(null).path).toBe(ROOT);
    });
  });
});
