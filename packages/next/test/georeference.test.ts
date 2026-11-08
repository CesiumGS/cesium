// The tileset declaration, BENTLEY_engineering_frame (plan 4b task 11, and
// its composition with ESRI_crs, EXT_geospatial_crs_source,
// 3DTILES_ellipsoid and BENTLEY_alignments): parsing
// only. Each malformed case of Review Focus 3 that a parse can find throws a
// GeoreferenceError naming its JSON path; the anchor case needs PROJ and is
// test/data/georeferenceTileset.test.ts's.
import { describe, expect, it } from "vitest";
import {
  CORRIDOR_ALIGNMENT,
  CORRIDOR_PIPELINE,
} from "../examples/design-globe/corridor.ts";
import type { AlignmentDefinition } from "../src/engineering/alignment.ts";
import {
  ALIGNMENTS_EXTENSION,
  ENGINEERING_FRAME_EXTENSION,
  GeoreferenceError,
  RENAMED_WARNING,
  alignmentsExtension,
  checkDeclaredGrids,
} from "../src/engineering/georeference.ts";
import { GridCatalog } from "../src/engineering/gridCatalog.ts";
import { HOSTILE_GRID_NAMES } from "./hostileGridNames.ts";
import { formatPipeline, parsePipeline } from "../src/engineering/pipeline.ts";
import { readGeoreference } from "../src/engineering/georeferenceTileset.ts";
import { EARTH, MOON } from "../src/scene/Body.ts";

const ROOT = "extensions.BENTLEY_engineering_frame";

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
  it("names the extension BENTLEY_engineering_frame", () => {
    expect(ENGINEERING_FRAME_EXTENSION).toBe("BENTLEY_engineering_frame");
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
        expect(e.path).toMatch(
          /^extensions\.BENTLEY_engineering_frame\.site\./,
        );
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

    it("a wkt2 that isn't WKT2 (a parser differential)", () => {
      const declaration = (wkt2: string) => ({
        crs: {
          format: "wkt2",
          extensions: { EXT_geospatial_crs_wkt2: { wkt2 } },
        },
        placement: { mode: "reprojected" },
      });
      const path = `${ROOT}.crs.extensions.EXT_geospatial_crs_wkt2.wkt2`;
      for (const wkt2 of [
        // A PROJ string, a code, PROJJSON, a URN: proj_create takes them all.
        "+proj=longlat +datum=WGS84 +type=crs",
        "EPSG:4326",
        '{"type":"GeographicCRS","name":"WGS 84"}',
        "urn:ogc:def:crs:EPSG::4326",
        // WKT1.
        'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]]]',
        // WKT2-lookalikes carrying PROJ-string parameters.
        'PROJCRS["x",BASEGEOGCRS["y"] +nadgrids=@null]',
        'BOUNDCRS["x",REMARK["+nadgrids=conus"]]',
        'GEOGCRS["x" +towgs84=0,0,0]',
      ]) {
        const e = failure(declaration(wkt2));
        expect(e.path).toBe(path);
        expect(e.message).toContain(path);
        expect(e.message).toMatch(/must be WKT2?:/);
      }
      // WKT2's keywords are case-insensitive, may be long-form, take "(" and
      // whitespace; a "+" inside a quoted name, or before a digit, is no
      // PROJ parameter.
      for (const wkt2 of [
        'geogcrs ["WGS 84 + extras",ELLIPSOID["x",6378137,298.257223563]]',
        'GEOGRAPHICCRS("a ""quoted"" +b name",X[1E+3])',
        'COMPOUNDCRS["h + v",PROJCRS["h"],VERTCRS["v"]]',
      ]) {
        expect(readGeoreference(tileset(declaration(wkt2)))!.crs).toEqual({
          format: "wkt2",
          wkt2,
        });
      }
      // Stored trimmed: a BOM, NBSP or whitespace around it is gone, so the
      // string checked is the string PROJ parses.
      const wkt2 = 'GEOGCRS["x",ELLIPSOID["x",6378137,298.257223563]]';
      for (const around of ["\uFEFF", "\u00A0", " \n\t"]) {
        expect(
          readGeoreference(tileset(declaration(`${around}${wkt2}${around}`)))!
            .crs,
        ).toEqual({ format: "wkt2", wkt2 });
      }
      // Nothing but white space is no WKT2 at all.
      for (const blank of ["  ", "\uFEFF \u00A0"]) {
        const e = failure(declaration(blank));
        expect(e.path).toBe(path);
        expect(e.message).toContain("non-empty string");
      }
    });

    it("an epoch that isn't the draft's decimal-year string", () => {
      for (const epoch of [2019.81, "-2019", "2019.81x"]) {
        const declaration = rigid();
        (
          declaration.crs as {
            extensions: { EXT_geospatial_crs_wkid: Record<string, unknown> };
          }
        ).extensions.EXT_geospatial_crs_wkid.epoch = epoch;
        expect(failure(declaration).path).toBe(
          `${ROOT}.crs.extensions.EXT_geospatial_crs_wkid.epoch`,
        );
      }
    });

    it("alignment elements: a zero length or radius, and too many", () => {
      const withElement = (element: Record<string, unknown>) => {
        const declaration = rigid();
        const alignment = (
          declaration.alignments as Record<string, unknown>[]
        )[0]!;
        (alignment.horizontal as unknown[])[0] = element;
        return declaration;
      };
      expect(failure(withElement({ kind: "line", length: 0 })).path).toBe(
        `${ROOT}.alignments[0].horizontal[0].length`,
      );
      expect(
        failure(withElement({ kind: "arc", length: 10, radius: 0 })).path,
      ).toBe(`${ROOT}.alignments[0].horizontal[0].radius`);
      expect(
        failure(
          withElement({
            kind: "spiral",
            length: 10,
            startRadius: null,
            endRadius: 0,
          }),
        ).path,
      ).toBe(`${ROOT}.alignments[0].horizontal[0].endRadius`);
      const declaration = rigid();
      const alignment = (
        declaration.alignments as Record<string, unknown>[]
      )[0]!;
      alignment.horizontal = Array.from({ length: 4097 }, () => ({
        kind: "line",
        length: 1,
      }));
      expect(failure(declaration).path).toBe(
        `${ROOT}.alignments[0].horizontal`,
      );
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

describe("the declared operation: pipeline, geoidFallback, fallbackSigma", () => {
  const GEOID18 = "us_noaa_g2018u0.tif";
  /** A catalog of GEOID18, and a grid PROJ-data has removed. */
  const catalog = GridCatalog.parse(
    JSON.stringify({
      type: "FeatureCollection",
      features: [GEOID18, "xx_removed.tif"].map((name) => ({
        type: "Feature",
        properties: {
          name,
          url: `https://cdn.proj.org/${name}`,
          sha256sum: "a".repeat(64),
          file_size: 1,
          source: "NOAA",
          ...(name === "xx_removed.tif" && { version_removed: "1.20" }),
        },
      })),
    }),
  );
  const withXyz = GridCatalog.parse(
    JSON.stringify({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            name: "fr_ign_gr3df97a.tif",
            url: "https://cdn.proj.org/fr_ign_gr3df97a.tif",
            sha256sum: "b".repeat(64),
            file_size: 1,
          },
        },
      ],
    }),
  );
  const withPipeline = (pipeline: unknown) => ({ ...rigid(), pipeline });
  /** CORRIDOR_PIPELINE with its geoid grid renamed. */
  const naming = (grid: string) => CORRIDOR_PIPELINE.replace(GEOID18, grid);

  it("reads a pinned pipeline, written as formatPipeline writes it", () => {
    const g = readGeoreference(tileset(withPipeline(CORRIDOR_PIPELINE)))!;
    expect(g.pipeline).toBe(formatPipeline(parsePipeline(CORRIDOR_PIPELINE)));
    expect(() => checkDeclaredGrids(g, catalog)).not.toThrow();
  });

  it("reads an xyzgridshift whose grid is in the catalog", () => {
    const xyz =
      "+proj=pipeline +step +proj=cart +ellps=GRS80 +step +inv +proj=xyzgridshift +grids=fr_ign_gr3df97a.tif +grid_ref=output_crs +ellps=clrk80ign +step +inv +proj=cart +ellps=clrk80ign";
    const g = readGeoreference(tileset(withPipeline(xyz)))!;
    expect(g.pipeline).toBe(formatPipeline(parsePipeline(xyz)));
    expect(() => checkDeclaredGrids(g, withXyz)).not.toThrow();
    expect(() => checkDeclaredGrids(g, catalog)).toThrow(GeoreferenceError);
  });

  it("reads a geoid fallback and its sigma", () => {
    const g = readGeoreference(
      tileset({ ...rigid(), geoidFallback: "EGM96", fallbackSigma: 0.5 }),
    )!;
    expect(g.geoidFallback).toBe("EGM96");
    expect(g.fallbackSigma).toBe(0.5);
    expect(g.pipeline).toBeUndefined();
    expect(() => checkDeclaredGrids(g, undefined)).not.toThrow();
  });

  describe("refuses, naming the field", () => {
    it("a path in a grid name", () => {
      for (const grid of [
        "/etc/hosts",
        "../proj.db",
        "sub/us_noaa_g2018u0.tif",
      ]) {
        const error = failure(withPipeline(naming(grid)));
        expect(error.path, grid).toBe(`${ROOT}.pipeline`);
        expect(error.message).toMatch(/a path|plain file name/);
      }
    });

    it("a path in any grid parameter, xy_grids and z_grids included", () => {
      for (const payload of [
        "+proj=deformation +xy_grids=/etc/hosts +z_grids=../../../etc/passwd +dt=1",
        "+proj=xyzgridshift +xy_grids=/etc/hosts +z_grids=/etc/hosts",
        "+proj=pipeline +step +proj=deformation +xy_grids=a.tif +z_grids=sub/b.tif +dt=1",
      ]) {
        const error = failure(withPipeline(payload));
        expect(error.path, payload).toBe(`${ROOT}.pipeline`);
      }
    });

    // The one rule's names (hostileGridNames.ts), as every path refuses them.
    it.each(HOSTILE_GRID_NAMES)("a grid named %j", (grid) => {
      expect(failure(withPipeline(naming(grid))).path).toBe(`${ROOT}.pipeline`);
    });

    it("a grid name that isn't a plain file name, without a path", () => {
      const error = failure(withPipeline(naming("@@x.tif")));
      expect(error.path).toBe(`${ROOT}.pipeline`);
      expect(error.message).toMatch(/plain file name/);
    });

    it("a ':', a '..' or a path in any parameter's value", () => {
      for (const value of ["a:b", "x..y", "/x", "a/b"]) {
        const error = failure(
          withPipeline(
            `+proj=pipeline +step +proj=unitconvert +xy_in=${value} +xy_out=m`,
          ),
        );
        expect(error.path, value).toBe(`${ROOT}.pipeline`);
      }
      // A backslash never passes the value allowlist.
      expect(
        failure(
          withPipeline("+proj=pipeline +step +proj=unitconvert +xy_in=a\\b"),
        ).path,
      ).toBe(`${ROOT}.pipeline`);
    });

    it("an operation or a parameter a declaration may not use", () => {
      for (const payload of [
        "+proj=pipeline +step +proj=tinshift +file=fi_nls_ykj_etrs35fin.json",
        "+proj=pipeline +step +proj=unitconvert +xy_in=m +xy_out=m +secret=1",
      ]) {
        expect(failure(withPipeline(payload)).message, payload).toMatch(
          /may not use/,
        );
      }
    });

    it("a grid the catalog lacks, or has removed", () => {
      for (const grid of ["us_noaa_g2012bu0.tif", "xx_removed.tif"]) {
        const g = readGeoreference(tileset(withPipeline(naming(grid))))!;
        let error: unknown;
        try {
          checkDeclaredGrids(g, catalog);
        } catch (e) {
          error = e;
        }
        expect(error, grid).toBeInstanceOf(GeoreferenceError);
        expect((error as GeoreferenceError).path).toBe(`${ROOT}.pipeline`);
      }
    });

    it("a pipeline whose grids no catalog can check", () => {
      const g = readGeoreference(tileset(withPipeline(CORRIDOR_PIPELINE)))!;
      expect(() => checkDeclaredGrids(g, undefined)).toThrow(GeoreferenceError);
    });

    it("an oversized pipeline, or one of too many steps", () => {
      const long = `${CORRIDOR_PIPELINE} +step +proj=noop${" ".repeat(4_096)}`;
      expect(failure(withPipeline(long)).path).toBe(`${ROOT}.pipeline`);
      const steps = `+proj=pipeline${" +step +proj=noop".repeat(33)}`;
      expect(steps.length).toBeLessThan(4_096);
      expect(failure(withPipeline(steps)).message).toMatch(/33 steps/);
    });

    it("a pipeline that isn't one, or isn't a string", () => {
      for (const bad of [
        "+init=epsg:4326",
        "proj=pipeline",
        "+proj=pipeline +step +proj=noop +init=epsg:4326",
        "+proj=pipeline +step +proj=noop +x=a'b",
        42,
        "",
      ]) {
        expect(failure(withPipeline(bad)).path, String(bad)).toBe(
          `${ROOT}.pipeline`,
        );
      }
    });

    it("an unknown fallback, a bad sigma, or a fallback with a pipeline", () => {
      expect(failure({ ...rigid(), geoidFallback: "EGM84" }).path).toBe(
        `${ROOT}.geoidFallback`,
      );
      for (const sigma of [-1, 0, Number.NaN, "1"]) {
        expect(
          failure({ ...rigid(), geoidFallback: "EGM96", fallbackSigma: sigma })
            .path,
        ).toBe(`${ROOT}.fallbackSigma`);
      }
      expect(failure({ ...rigid(), fallbackSigma: 1 }).path).toBe(
        `${ROOT}.fallbackSigma`,
      );
      expect(
        failure({
          ...rigid(),
          pipeline: CORRIDOR_PIPELINE,
          geoidFallback: "EGM96",
        }).path,
      ).toBe(`${ROOT}.geoidFallback`);
    });
  });
});

describe("untrusted WKT2 that names files, numeric bounds and empty grid lists", () => {
  /** A vertical BOUNDCRS whose geoid file is `file` (the S1 payload's shape). */
  const boundCrs = (file: string) =>
    `BOUNDCRS[SOURCECRS[VERTCRS["NAVD88 height",VDATUM["North American Vertical Datum 1988"],CS[vertical,1],AXIS["gravity-related height (H)",up,LENGTHUNIT["metre",1]]]],TARGETCRS[GEOGCRS["NAD83(2011)",DATUM["NAD83 (National Spatial Reference System 2011)",ELLIPSOID["GRS 1980",6378137,298.257222101,LENGTHUNIT["metre",1]]],CS[ellipsoidal,3],AXIS["geodetic latitude (Lat)",north,ANGLEUNIT["degree",0.0174532925199433]],AXIS["geodetic longitude (Lon)",east,ANGLEUNIT["degree",0.0174532925199433]],AXIS["ellipsoidal height (h)",up,LENGTHUNIT["metre",1]]]],ABRIDGEDTRANSFORMATION["NAVD88 height to NAD83(2011) height",METHOD["Geographic3D to GravityRelatedHeight (gtx)",ID["EPSG",9665]],PARAMETERFILE["Geoid (height correction) model file","${file}"]]]`;
  const withWkt2 = (wkt2: string) => ({
    ...rigid(),
    crs: { format: "wkt2", extensions: { EXT_geospatial_crs_wkt2: { wkt2 } } },
  });
  const WKT2_PATH = `${ROOT}.crs.extensions.EXT_geospatial_crs_wkt2.wkt2`;
  const catalog = GridCatalog.parse(
    JSON.stringify({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            name: "us_noaa_g2018u0.tif",
            url: "https://cdn.proj.org/us_noaa_g2018u0.tif",
            sha256sum: "a".repeat(64),
            file_size: 1,
          },
        },
      ],
    }),
  );

  it("refuses a PARAMETERFILE that names a path (the S1 payload), naming the WKT2", () => {
    for (const file of [
      "/etc/hosts",
      "../../us_noaa_g2018u0.tif",
      "C:\\x.tif",
      "https://example.com/a.tif",
      "",
    ]) {
      const error = failure(withWkt2(boundCrs(file)));
      expect(error.path, file).toBe(WKT2_PATH);
      expect(error.message, file).toMatch(/PARAMETERFILE/);
    }
  });

  // The one rule's names (hostileGridNames.ts), as every path refuses them.
  it.each(HOSTILE_GRID_NAMES)("refuses a PARAMETERFILE naming %j", (file) => {
    const error = failure(withWkt2(boundCrs(file)));
    expect(error.path).toBe(WKT2_PATH);
    expect(error.message).toMatch(/PARAMETERFILE/);
  });

  it("holds a PARAMETERFILE's plain name to the catalog", () => {
    const known = readGeoreference(
      tileset(withWkt2(boundCrs("us_noaa_g2018u0.tif"))),
    )!;
    expect(() => checkDeclaredGrids(known, catalog)).not.toThrow();
    const unknown = readGeoreference(
      tileset(withWkt2(boundCrs("us_noaa_g2012bu0.tif"))),
    )!;
    expect(() => checkDeclaredGrids(unknown, catalog)).toThrow(/catalog/);
    expect(() => checkDeclaredGrids(known, undefined)).toThrow(
      GeoreferenceError,
    );
  });

  it("refuses a WKT EXTENSION and a PARAMETERFILE it can't read", () => {
    const extension = boundCrs("us_noaa_g2018u0.tif").replace(
      'ID["EPSG",9665]]',
      'ID["EPSG",9665]],EXTENSION["PROJ4_GRIDS","x.tif"]',
    );
    expect(failure(withWkt2(extension)).path).toBe(WKT2_PATH);
    const unreadable = boundCrs("us_noaa_g2018u0.tif").replace(
      'PARAMETERFILE["Geoid (height correction) model file",',
      "PARAMETERFILE[1,",
    );
    expect(failure(withWkt2(unreadable)).path).toBe(WKT2_PATH);
  });

  it("refuses non-finite or out-of-bounds numbers in a declared pipeline", () => {
    for (const step of [
      "+proj=helmert +x=1e999",
      "+proj=helmert +x=NaN",
      "+proj=helmert +x=2e9",
      "+proj=helmert +rx=2e6",
      "+proj=helmert +s=-2e6",
      "+proj=lcc +lat_0=9e999 +ellps=GRS80",
      "+proj=helmert +x=1,2",
      "+proj=tmerc +towgs84=1,2,3,NaN",
    ]) {
      const error = failure({
        ...rigid(),
        pipeline: `+proj=pipeline +step ${step}`,
      });
      expect(error.path, step).toBe(`${ROOT}.pipeline`);
    }
    // Sane values pass.
    expect(
      readGeoreference(
        tileset({
          ...rigid(),
          pipeline:
            "+proj=pipeline +step +proj=helmert +x=-0.991 +y=1.9072 +z=0.5129 +rx=-0.02579 +s=0.0015 +convention=coordinate_frame",
        }),
      )!.pipeline,
    ).toContain("helmert");
  });

  it("refuses a grid list naming nothing", () => {
    for (const grids of [
      "@",
      ",us_noaa_g2018u0.tif",
      "us_noaa_g2018u0.tif,",
      "a,,b",
    ]) {
      const error = failure({
        ...rigid(),
        pipeline: `+proj=pipeline +step +proj=vgridshift +grids=${grids} +multiplier=1`,
      });
      expect(error.path, grids).toBe(`${ROOT}.pipeline`);
    }
  });
});

describe("composed with ESRI_crs, EXT_geospatial_crs_source, 3DTILES_ellipsoid and BENTLEY_alignments", () => {
  const WKID = {
    format: "wkid",
    extensions: {
      EXT_geospatial_crs_wkid: { authority: "EPSG", wkid: 6420, vcsWkid: 6360 },
    },
  };
  const UTM_WKT2 =
    'PROJCRS["WGS 84 / UTM zone 11N",BASEGEOGCRS["WGS 84",DATUM["World Geodetic System 1984",ELLIPSOID["WGS 84",6378137,298.257223563]]],CONVERSION["UTM zone 11N",METHOD["Transverse Mercator"]],CS[Cartesian,2]]';
  /** A declaration without its own crs (or the old in-frame alignments). */
  const withoutCrs = () => {
    const d = rigid();
    delete d.crs;
    delete d.alignments;
    return d;
  };
  /** A tileset with the declaration and other top-level extensions. */
  const composed = (
    declaration: unknown,
    others: Record<string, unknown>,
    root?: Record<string, unknown>,
  ) => ({
    ...tileset(declaration),
    ...(root && { root }),
    extensions: { [ENGINEERING_FRAME_EXTENSION]: declaration, ...others },
  });
  const refusal = (json: unknown): GeoreferenceError => {
    try {
      readGeoreference(json);
    } catch (error) {
      expect(error).toBeInstanceOf(GeoreferenceError);
      return error as GeoreferenceError;
    }
    throw new Error("expected a GeoreferenceError");
  };

  describe("the source CRS", () => {
    it("reads it from ESRI_crs alone: an EPSG wkid and vcsWkid", () => {
      const g = readGeoreference(
        composed(withoutCrs(), { ESRI_crs: { wkid: 6420, vcsWkid: 6360 } }),
      )!;
      expect(g.crs).toEqual({
        format: "wkid",
        authority: "EPSG",
        wkid: 6420,
        vcsWkid: 6360,
      });
      expect(g.sources.crs).toBe("extensions.ESRI_crs");
      expect(g.warnings).toEqual([]);
    });

    it("reads ESRI_crs's wkids above 32767 as ESRI's, each code on its own", () => {
      expect(
        readGeoreference(
          composed(withoutCrs(), { ESRI_crs: { wkid: 102100 } }),
        )!.crs,
      ).toEqual({ format: "wkid", authority: "ESRI", wkid: 102100 });
      // EPSG horizontal, ESRI vertical, as Esri writes them.
      expect(
        readGeoreference(
          composed(withoutCrs(), {
            ESRI_crs: { wkid: 32610, vcsWkid: 115700 },
          }),
        )!.crs,
      ).toEqual({
        format: "wkid",
        authority: "EPSG",
        wkid: 32610,
        vcsWkid: 115700,
        vcsAuthority: "ESRI",
      });
      expect(
        refusal(composed(withoutCrs(), { ESRI_crs: { vcsWkid: 6360 } })).path,
      ).toBe("extensions.ESRI_crs.wkid");
      expect(
        refusal(composed(withoutCrs(), { ESRI_crs: { wkid: 1.5 } })).path,
      ).toBe("extensions.ESRI_crs.wkid");
    });

    it("reads our crs's vcsAuthority (a proposal), so EPSG:32610 + ESRI:115700 agrees with ESRI_crs", () => {
      const declared = (companion: Record<string, unknown>) => ({
        ...withoutCrs(),
        crs: {
          format: "wkid",
          extensions: { EXT_geospatial_crs_wkid: companion },
        },
      });
      const esriVertical = {
        authority: "EPSG",
        wkid: 32610,
        vcsWkid: 115700,
        vcsAuthority: "ESRI",
      };
      const expected = {
        format: "wkid",
        authority: "EPSG",
        wkid: 32610,
        vcsWkid: 115700,
        vcsAuthority: "ESRI",
      };
      expect(readGeoreference(tileset(declared(esriVertical)))!.crs).toEqual(
        expected,
      );
      // Beside ESRI_crs's same pair: one CRS, not a disagreement.
      const both = readGeoreference(
        composed(declared(esriVertical), {
          ESRI_crs: { wkid: 32610, vcsWkid: 115700 },
        }),
      )!;
      expect(both.crs).toEqual(expected);
      expect(both.otherCrs ?? []).toEqual([]);
      // wkid's own registry is the default, so not kept.
      expect(
        readGeoreference(
          tileset(declared({ ...esriVertical, vcsAuthority: "epsg" })),
        )!.crs,
      ).toEqual({
        format: "wkid",
        authority: "EPSG",
        wkid: 32610,
        vcsWkid: 115700,
      });
      const at = `${ROOT}.crs.extensions.EXT_geospatial_crs_wkid.vcsAuthority`;
      for (const bad of ["", "ESRI/x", 7, "E".repeat(33)]) {
        expect(
          refusal(tileset(declared({ ...esriVertical, vcsAuthority: bad })))
            .path,
          String(bad),
        ).toBe(at);
      }
      const noVertical = { ...esriVertical, vcsWkid: undefined };
      expect(refusal(tileset(declared(noVertical))).path).toBe(at);
    });

    it("reads ESRI_crs's wkt2 through the same screening, and refuses its WKT1 and both forms", () => {
      const g = readGeoreference(
        composed(withoutCrs(), { ESRI_crs: { wkt2: ` ${UTM_WKT2}\n` } }),
      )!;
      expect(g.crs).toEqual({ format: "wkt2", wkt2: UTM_WKT2 });
      expect(g.sources.wkt2).toBe("extensions.ESRI_crs.wkt2");
      for (const wkt2 of [
        "+proj=utm +zone=11 +datum=WGS84 +type=crs",
        "EPSG:32611",
        'GEOGCS["WGS 84"]',
        "x".repeat(65_537),
        "",
      ]) {
        expect(
          refusal(composed(withoutCrs(), { ESRI_crs: { wkt2 } })).path,
          wkt2.slice(0, 20),
        ).toBe("extensions.ESRI_crs.wkt2");
      }
      expect(
        refusal(composed(withoutCrs(), { ESRI_crs: { wkt: 'PROJCS["x"]' } }))
          .path,
      ).toBe("extensions.ESRI_crs.wkt");
      const both = refusal(
        composed(withoutCrs(), { ESRI_crs: { wkid: 32611, wkt2: UTM_WKT2 } }),
      );
      expect(both.path).toBe("extensions.ESRI_crs");
      expect(both.message).toMatch(/mutually exclusive/);
    });

    it("holds ESRI_crs's WKT2 PARAMETERFILEs to plain names and the catalog", () => {
      const parameterFile = (file: string) =>
        `BOUNDCRS[SOURCECRS[VERTCRS["H",VDATUM["V"],CS[vertical,1],AXIS["h",up,LENGTHUNIT["metre",1]]]],TARGETCRS[GEOGCRS["G",DATUM["D",ELLIPSOID["GRS 1980",6378137,298.257222101]],CS[ellipsoidal,3]]],ABRIDGEDTRANSFORMATION["t",METHOD["m"],PARAMETERFILE["Geoid (height correction) model file","${file}"]]]`;
      expect(
        refusal(
          composed(withoutCrs(), {
            ESRI_crs: { wkt2: parameterFile("/etc/hosts") },
          }),
        ).path,
      ).toBe("extensions.ESRI_crs.wkt2");
      const g = readGeoreference(
        composed(withoutCrs(), {
          ESRI_crs: { wkt2: parameterFile("us_noaa_g2012bu0.tif") },
        }),
      )!;
      const error = (() => {
        try {
          checkDeclaredGrids(g, undefined);
        } catch (e) {
          return e as GeoreferenceError;
        }
        throw new Error("expected a refusal");
      })();
      expect(error.path).toBe("extensions.ESRI_crs.wkt2");
    });

    it("reads it from EXT_geospatial_crs_source alone, in either companion", () => {
      const g = readGeoreference(
        composed(withoutCrs(), { EXT_geospatial_crs_source: WKID }),
      )!;
      expect(g.crs).toEqual({
        format: "wkid",
        authority: "EPSG",
        wkid: 6420,
        vcsWkid: 6360,
      });
      expect(g.sources.crs).toBe("extensions.EXT_geospatial_crs_source");
      const w = readGeoreference(
        composed(withoutCrs(), {
          EXT_geospatial_crs_source: {
            format: "wkt2",
            extensions: { EXT_geospatial_crs_wkt2: { wkt2: UTM_WKT2 } },
          },
        }),
      )!;
      expect(w.crs).toEqual({ format: "wkt2", wkt2: UTM_WKT2 });
      expect(w.sources.wkt2).toBe(
        "extensions.EXT_geospatial_crs_source.extensions.EXT_geospatial_crs_wkt2.wkt2",
      );
      expect(
        refusal(
          composed(withoutCrs(), {
            EXT_geospatial_crs_source: {
              format: "wkt2",
              extensions: {
                EXT_geospatial_crs_wkt2: { wkt2: "+proj=longlat" },
              },
            },
          }),
        ).path,
      ).toBe(
        "extensions.EXT_geospatial_crs_source.extensions.EXT_geospatial_crs_wkt2.wkt2",
      );
    });

    it("prefers EXT_geospatial_crs_source, then ESRI_crs, when they agree with ours", () => {
      const g = readGeoreference(
        composed(rigid(), {
          EXT_geospatial_crs_source: WKID,
          ESRI_crs: { wkid: 6420, vcsWkid: 6360 },
        }),
      )!;
      expect(g.sources.crs).toBe("extensions.EXT_geospatial_crs_source");
      const e = readGeoreference(
        composed(rigid(), { ESRI_crs: { wkid: 6420, vcsWkid: 6360 } }),
      )!;
      expect(e.sources.crs).toBe("extensions.ESRI_crs");
    });

    it("keeps our epoch beside ESRI_crs, which can't state one", () => {
      const declaration = rigid();
      declaration.crs = {
        format: "wkid",
        extensions: {
          EXT_geospatial_crs_wkid: {
            authority: "EPSG",
            wkid: 7912,
            epoch: "2019.81",
          },
        },
      };
      const g = readGeoreference(
        composed(declaration, { ESRI_crs: { wkid: 7912 } }),
      )!;
      expect(g.crs).toEqual({
        format: "wkid",
        authority: "EPSG",
        wkid: 7912,
        epoch: 2019.81,
      });
    });

    it("keeps a CRS that isn't the same declaration for PROJ to judge", () => {
      // Same declaration: nothing for PROJ.
      expect(
        readGeoreference(
          composed(rigid(), { ESRI_crs: { wkid: 6420, vcsWkid: 6360 } }),
        )!.otherCrs,
      ).toBeUndefined();
      // Other codes, and a code beside a WKT2: kept with their paths
      // (georeferenceTileset's checkCrsAgreement asks PROJ).
      const codes = readGeoreference(
        composed(rigid(), { ESRI_crs: { wkid: 2227, vcsWkid: 6360 } }),
      )!;
      expect(codes.sources.crs).toBe("extensions.ESRI_crs");
      expect(codes.otherCrs).toEqual([
        {
          crs: {
            format: "wkid",
            authority: "EPSG",
            wkid: 6420,
            vcsWkid: 6360,
          },
          path: `${ROOT}.crs`,
        },
      ]);
      const draft = readGeoreference(
        composed(rigid(), {
          EXT_geospatial_crs_source: {
            format: "wkt2",
            extensions: { EXT_geospatial_crs_wkt2: { wkt2: UTM_WKT2 } },
          },
        }),
      )!;
      expect(draft.sources.wkt2).toBe(
        "extensions.EXT_geospatial_crs_source.extensions.EXT_geospatial_crs_wkt2.wkt2",
      );
      expect(draft.otherCrs!.map((o) => o.path)).toEqual([`${ROOT}.crs`]);
      // A kept WKT2 is screened, and its PARAMETERFILEs held to the catalog.
      const theirs = readGeoreference(
        composed(withoutCrs(), {
          EXT_geospatial_crs_source: WKID,
          ESRI_crs: { wkt2: UTM_WKT2 },
        }),
      )!;
      expect(theirs.otherCrs).toEqual([
        {
          crs: { format: "wkt2", wkt2: UTM_WKT2 },
          path: "extensions.ESRI_crs",
          wkt2Path: "extensions.ESRI_crs.wkt2",
        },
      ]);
    });

    it("refuses two epochs that differ, naming both paths", () => {
      const epoch = (e: string) => ({
        format: "wkid",
        extensions: {
          EXT_geospatial_crs_wkid: { authority: "EPSG", wkid: 7912, epoch: e },
        },
      });
      expect(
        refusal(
          composed(
            { ...rigid(), crs: epoch("2019.81") },
            { EXT_geospatial_crs_source: epoch("2010.0") },
          ),
        ).path,
      ).toBe(`${ROOT}.crs`);
      const both = refusal(
        composed(
          { ...rigid(), crs: epoch("2019.81") },
          { EXT_geospatial_crs_source: epoch("2010.0") },
        ),
      );
      expect(both.message).toContain("extensions.EXT_geospatial_crs_source");
      expect(both.message).toMatch(
        /at epoch 2019\.81 against .* at epoch 2010/,
      );
    });

    it("refuses a declaration with no CRS anywhere", () => {
      expect(refusal(composed(withoutCrs(), {})).path).toBe(`${ROOT}.crs`);
    });
  });

  describe("the body", () => {
    it("reads 3DTILES_ellipsoid for the Earth (WGS 84, and GRS 1980 within 1 cm)", () => {
      for (const radii of [
        [6378137.0, 6378137.0, 6356752.3142451793],
        [6378137.0, 6378137.0, 6356752.314140356],
      ]) {
        const g = readGeoreference(
          composed(withoutCrs(), {
            ESRI_crs: { wkid: 6420 },
            "3DTILES_ellipsoid": { body: "Earth", radii },
          }),
        )!;
        expect(g.body).toBe(EARTH);
        expect(g.sources.body).toBe("extensions.3DTILES_ellipsoid");
      }
    });

    it("reads 3DTILES_ellipsoid for the Moon", () => {
      const declaration = {
        crs: {
          format: "wkt2",
          extensions: {
            EXT_geospatial_crs_wkt2: {
              wkt2: 'PROJCRS["Moon local",BASEGEOGCRS["Moon (2015)"]]',
            },
          },
        },
        placement: { mode: "reprojected" },
      };
      const g = readGeoreference(
        composed(declaration, {
          "3DTILES_ellipsoid": {
            body: "Moon",
            radii: [1737400.0, 1737400.0, 1737400.0],
          },
        }),
      )!;
      expect(g.body).toBe(MOON);
      // Agreeing with ours is fine.
      expect(
        readGeoreference(
          composed(
            { ...declaration, body: "MOON" },
            {
              "3DTILES_ellipsoid": {
                body: "Moon",
                radii: [1737400, 1737400, 1737400],
              },
            },
          ),
        )!.body,
      ).toBe(MOON);
    });

    it("refuses an unknown ellipsoid, naming it", () => {
      const mars = refusal(
        composed(rigid(), {
          "3DTILES_ellipsoid": {
            body: "Mars",
            radii: [3396190, 3396190, 3376200],
          },
        }),
      );
      expect(mars.path).toBe("extensions.3DTILES_ellipsoid.radii");
      expect(mars.message).toMatch(/neither the Earth's .* nor the Moon's/);
      // Clarke 1866: an Earth ellipsoid, but not the engine's.
      expect(
        refusal(
          composed(rigid(), {
            "3DTILES_ellipsoid": {
              body: "Earth",
              radii: [6378206.4, 6378206.4, 6356583.8],
            },
          }),
        ).path,
      ).toBe("extensions.3DTILES_ellipsoid.radii");
      expect(
        refusal(composed(rigid(), { "3DTILES_ellipsoid": { body: "none" } }))
          .path,
      ).toBe("extensions.3DTILES_ellipsoid.body");
      expect(
        refusal(
          composed(rigid(), {
            "3DTILES_ellipsoid": {
              body: "Moon",
              radii: [6378137, 6378137, 6356752.3142451793],
            },
          }),
        ).path,
      ).toBe("extensions.3DTILES_ellipsoid.body");
      expect(
        refusal(composed(rigid(), { "3DTILES_ellipsoid": { body: "Earth" } }))
          .path,
      ).toBe("extensions.3DTILES_ellipsoid.radii");
      // Ours says the Moon; theirs has the Earth's radii.
      const both = refusal(
        composed(
          { ...rigid(), body: "MOON" },
          {
            "3DTILES_ellipsoid": {
              radii: [6378137, 6378137, 6356752.3142451793],
            },
          },
        ),
      );
      expect(both.path).toBe(`${ROOT}.body`);
      expect(both.message).toContain("extensions.3DTILES_ellipsoid");
    });
  });

  describe("the area of interest", () => {
    const at = (lon: number, lat: number) => {
      const l = (lon * Math.PI) / 180;
      const p = (lat * Math.PI) / 180;
      const c = EARTH.ellipsoid.cartographicToCartesian(
        { longitude: l, latitude: p, height: 0 },
        new Float64Array(3),
      );
      return Array.from(c);
    };
    const withoutArea = () => {
      const d = rigid();
      delete d.areaOfInterest;
      return d;
    };

    it("derives it from a root region", () => {
      const d = Math.PI / 180;
      const g = readGeoreference(
        composed(
          withoutArea(),
          {},
          {
            geometricError: 0,
            boundingVolume: {
              region: [-122.5 * d, 37.5 * d, -121.5 * d, 38.2 * d, 0, 100],
            },
          },
        ),
      )!;
      expect(g.sources.areaOfInterest).toBe("root.boundingVolume");
      expect(g.areaOfInterest!.west).toBeCloseTo(-122.5, 12);
      expect(g.areaOfInterest!.north).toBeCloseTo(38.2, 12);
    });

    it("derives it from a root box through the root transform", () => {
      // A 10 km box (half axes 5 km) at (-122°, 37.8°), placed by a translation.
      const centre = at(-122, 37.8);
      const g = readGeoreference(
        composed(
          withoutArea(),
          {},
          {
            geometricError: 0,
            transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, ...centre, 1],
            boundingVolume: {
              box: [0, 0, 0, 5000, 0, 0, 0, 5000, 0, 0, 0, 5000],
            },
          },
        ),
      )!;
      const a = g.areaOfInterest!;
      expect(a.west).toBeLessThan(-122);
      expect(a.east).toBeGreaterThan(-122);
      expect(a.south).toBeLessThan(37.8);
      expect(a.north).toBeGreaterThan(37.8);
      expect(a.east - a.west).toBeLessThan(0.3);
      expect(a.north - a.south).toBeLessThan(0.3);
    });

    it("keeps one span across the antimeridian, and derives none for a global sphere", () => {
      const g = readGeoreference(
        composed(
          withoutArea(),
          {},
          {
            geometricError: 0,
            boundingVolume: { sphere: [...at(180, -17), 10_000] },
          },
        ),
      )!;
      expect(g.areaOfInterest!.west).toBeGreaterThan(179);
      expect(g.areaOfInterest!.east).toBeLessThan(-179);
      const global = readGeoreference(
        composed(
          withoutArea(),
          {},
          { geometricError: 0, boundingVolume: { sphere: [0, 0, 0, 7e6] } },
        ),
      )!;
      expect(global.areaOfInterest).toBeUndefined();
      expect(global.sources.areaOfInterest).toBeUndefined();
    });

    it("derives none from a box in local metres without a transform, and warns once", () => {
      const g = readGeoreference(
        composed(
          withoutArea(),
          {},
          {
            geometricError: 0,
            boundingVolume: {
              box: [100, 50, 0, 10, 0, 0, 0, 10, 0, 0, 0, 10],
            },
          },
        ),
      )!;
      expect(g.areaOfInterest).toBeUndefined();
      expect(g.sources.areaOfInterest).toBeUndefined();
      const about = g.warnings.filter((w) => w.includes("root.boundingVolume"));
      expect(about).toHaveLength(1);
      expect(about[0]).toMatch(/isn't near the Earth's surface/);
    });

    it("derives one from a large ECEF sphere at the surface, and on the Moon", () => {
      // A 50 km sphere about a city: its samples are 50 km up, but it is
      // at the surface.
      const city = readGeoreference(
        composed(
          withoutArea(),
          {},
          {
            geometricError: 0,
            boundingVolume: { sphere: [...at(-0.127, 51.503), 50_000] },
          },
        ),
      )!;
      expect(city.areaOfInterest!.west).toBeLessThan(-0.127);
      expect(city.areaOfInterest!.east).toBeGreaterThan(-0.127);
      expect(
        city.warnings.filter((w) => w.includes("root.boundingVolume")),
      ).toEqual([]);
      // A 2 km box at (23.47°, 0.67°) on the Moon (Apollo 11's site).
      const d = Math.PI / 180;
      const site = Array.from(
        MOON.ellipsoid.cartographicToCartesian(
          { longitude: 23.47 * d, latitude: 0.67 * d, height: 0 },
          new Float64Array(3),
        ),
      );
      const moon = readGeoreference(
        composed(
          {
            crs: {
              format: "wkt2",
              extensions: {
                EXT_geospatial_crs_wkt2: {
                  wkt2: 'PROJCRS["Moon local",BASEGEOGCRS["Moon (2015)"]]',
                },
              },
            },
            placement: { mode: "reprojected" },
          },
          {
            "3DTILES_ellipsoid": {
              body: "Moon",
              radii: [1737400, 1737400, 1737400],
            },
          },
          {
            geometricError: 0,
            transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, ...site, 1],
            boundingVolume: {
              box: [0, 0, 0, 1000, 0, 0, 0, 1000, 0, 0, 0, 1000],
            },
          },
        ),
      )!;
      expect(moon.body).toBe(MOON);
      const a = moon.areaOfInterest!;
      expect(a.west).toBeLessThan(23.47);
      expect(a.east).toBeGreaterThan(23.47);
      expect(a.south).toBeLessThan(0.67);
      expect(a.north).toBeGreaterThan(0.67);
      // 1 km on a 1,737.4 km sphere is about 0.033°.
      expect(a.east - a.west).toBeLessThan(0.15);
      // The same box read on the Earth's ellipsoid is far below its surface.
      expect(
        readGeoreference(
          composed(
            withoutArea(),
            {},
            {
              geometricError: 0,
              transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, ...site, 1],
              boundingVolume: {
                box: [0, 0, 0, 1000, 0, 0, 0, 1000, 0, 0, 0, 1000],
              },
            },
          ),
        )!.areaOfInterest,
      ).toBeUndefined();
    });

    it("keeps ours as an override", () => {
      const g = readGeoreference(
        composed(
          rigid(),
          {},
          {
            geometricError: 0,
            boundingVolume: { region: [0, 0, 0.1, 0.1, 0, 1] },
          },
        ),
      )!;
      expect(g.areaOfInterest).toEqual({
        west: -122.5,
        south: 37.5,
        east: -121.5,
        north: 38.2,
      });
      expect(g.sources.areaOfInterest).toBe(`${ROOT}.areaOfInterest`);
    });
  });

  describe("the old name", () => {
    it("warns about EXT_engineering_frame but loads it, naming its paths", () => {
      const json = {
        ...tileset(rigid()),
        extensions: { EXT_engineering_frame: rigid() },
      };
      const g = readGeoreference(json)!;
      expect(g.name).toBe("Mainline");
      expect(g.warnings).toContain(RENAMED_WARNING);
      expect(RENAMED_WARNING).toBe(
        "EXT_engineering_frame is renamed BENTLEY_engineering_frame",
      );
      expect(g.sources.declaration).toBe("extensions.EXT_engineering_frame");
      expect(
        refusal({
          extensions: {
            EXT_engineering_frame: { ...rigid(), placement: { mode: "x" } },
          },
        }).path,
      ).toBe("extensions.EXT_engineering_frame.placement.mode");
    });

    it("refuses both names at once", () => {
      expect(
        refusal({
          extensions: {
            EXT_engineering_frame: rigid(),
            BENTLEY_engineering_frame: rigid(),
          },
        }).path,
      ).toBe("extensions.EXT_engineering_frame");
    });
  });

  describe("BENTLEY_alignments", () => {
    const definitions: AlignmentDefinition[] = [
      CORRIDOR_ALIGNMENT,
      {
        name: "Ramp",
        start: [6_081_000.25, 2_109_500.5],
        startAzimuth: -0.3,
        startStation: 0,
        horizontal: [
          { kind: "line", length: 100 },
          {
            kind: "spiral",
            length: 50,
            startRadius: Infinity,
            endRadius: -300,
          },
          { kind: "arc", length: 75.5, radius: -300 },
          {
            kind: "spiral",
            length: 50,
            startRadius: -300,
            endRadius: -Infinity,
          },
        ],
        vertical: {
          startStation: 0,
          startElevation: 12.5,
          segments: [
            { kind: "grade", length: 100, grade: 0.03 },
            {
              kind: "parabola",
              length: 175.5,
              startGrade: 0.03,
              endGrade: -0.01,
            },
          ],
        },
      },
    ];

    it("round-trips AlignmentDefinitions through IFC 4.3's segment types", () => {
      const extension = JSON.parse(
        JSON.stringify(alignmentsExtension(definitions)),
      );
      const horizontal = extension.alignments[1].horizontal;
      expect(horizontal.map((h: { type: string }) => h.type)).toEqual([
        "LINE",
        "CLOTHOID",
        "CIRCULARARC",
        "CLOTHOID",
      ]);
      expect(horizontal[1].startRadius).toBeNull();
      expect(
        extension.alignments[1].vertical.segments.map(
          (v: { type: string }) => v.type,
        ),
      ).toEqual(["CONSTANTGRADIENT", "PARABOLICARC"]);
      const withoutAlignments = rigid();
      delete withoutAlignments.alignments;
      const g = readGeoreference(
        composed(withoutAlignments, { [ALIGNMENTS_EXTENSION]: extension }),
      )!;
      expect(g.alignments).toEqual(
        definitions.map((d) => ({
          ...d,
          // A tangent end reads back as +Infinity (JSON's null has no sign);
          // the alignment treats either as a tangent.
          horizontal: d.horizontal.map((h) =>
            h.kind === "spiral"
              ? {
                  ...h,
                  startRadius: Number.isFinite(h.startRadius)
                    ? h.startRadius
                    : Infinity,
                  endRadius: Number.isFinite(h.endRadius)
                    ? h.endRadius
                    : Infinity,
                }
              : h,
          ),
        })),
      );
      expect(g.sources.alignments).toBe("extensions.BENTLEY_alignments");
      expect(g.warnings).toEqual([]);
    });

    it("reads an IFC tangent end written 0 as null is, and still refuses an arc's 0", () => {
      const withoutAlignments = rigid();
      delete withoutAlignments.alignments;
      const extension = {
        alignments: [
          {
            name: "IFC",
            start: [0, 0],
            startAzimuth: 0,
            startStation: 0,
            horizontal: [
              { type: "LINE", length: 10 },
              { type: "CLOTHOID", length: 20, startRadius: 0, endRadius: 300 },
              { type: "CIRCULARARC", length: 30, radius: 300 },
              { type: "CLOTHOID", length: 20, startRadius: 300, endRadius: 0 },
            ],
          },
        ],
      };
      const g = readGeoreference(
        composed(withoutAlignments, { [ALIGNMENTS_EXTENSION]: extension }),
      )!;
      expect(g.alignments![0]!.horizontal[1]).toEqual({
        kind: "spiral",
        length: 20,
        startRadius: Infinity,
        endRadius: 300,
      });
      expect(g.alignments![0]!.horizontal[3]).toMatchObject({
        endRadius: Infinity,
      });
      (extension.alignments[0]!.horizontal[2] as { radius: number }).radius = 0;
      expect(
        refusal(
          composed(withoutAlignments, { [ALIGNMENTS_EXTENSION]: extension }),
        ).path,
      ).toBe(
        "extensions.BENTLEY_alignments.alignments[0].horizontal[2].radius",
      );
    });

    it("reads the old in-frame alignments with a warning, and refuses both", () => {
      const g = readGeoreference(tileset(rigid()))!;
      expect(g.alignments).toHaveLength(1);
      expect(g.sources.alignments).toBe(`${ROOT}.alignments`);
      expect(g.warnings.join("\n")).toMatch(
        /alignments is moved to extensions\.BENTLEY_alignments/,
      );
      expect(
        refusal(
          composed(rigid(), {
            [ALIGNMENTS_EXTENSION]: alignmentsExtension(definitions),
          }),
        ).path,
      ).toBe(`${ROOT}.alignments`);
    });

    it("refuses an unknown segment type or a bad field, naming its path, and more than 64", () => {
      const withoutAlignments = rigid();
      delete withoutAlignments.alignments;
      const bad = (mutate: (a: Record<string, unknown>) => void) => {
        const extension = JSON.parse(
          JSON.stringify(alignmentsExtension([CORRIDOR_ALIGNMENT])),
        );
        mutate(extension.alignments[0]);
        return refusal(
          composed(withoutAlignments, { [ALIGNMENTS_EXTENSION]: extension }),
        ).path;
      };
      const A = "extensions.BENTLEY_alignments.alignments[0]";
      expect(
        bad((a) => {
          (a.horizontal as Record<string, unknown>[])[0]!.type = "CUBIC";
        }),
      ).toBe(`${A}.horizontal[0].type`);
      expect(
        bad((a) => {
          (a.horizontal as Record<string, unknown>[])[0]!.type = "line";
        }),
      ).toBe(`${A}.horizontal[0].type`);
      expect(
        bad((a) => {
          (
            (a.vertical as Record<string, unknown>).segments as Record<
              string,
              unknown
            >[]
          )[0]!.type = "CIRCULARARC";
        }),
      ).toBe(`${A}.vertical.segments[0].type`);
      expect(
        bad((a) => {
          a.startAzimuth = "north";
        }),
      ).toBe(`${A}.startAzimuth`);
      const many = alignmentsExtension(
        Array.from({ length: 65 }, () => CORRIDOR_ALIGNMENT),
      );
      expect(
        refusal(composed(withoutAlignments, { [ALIGNMENTS_EXTENSION]: many }))
          .path,
      ).toBe("extensions.BENTLEY_alignments.alignments");
    });
  });
});
