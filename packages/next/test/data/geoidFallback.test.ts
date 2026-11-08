// Opt-in geoid fallbacks, depth axes and tidal datums (plan 4b Task 7; the
// plan's calls 9 and 11).
//
// PROJ starts with no grids, and grids come from the store's `grids/`
// through a GridSource, as the browser gets them. A file of its own, so a
// PROJ of its own (Vitest's forks pool isolates each file). The cases share
// one PROJ: what one loads, the next one has. `npm run test:data` runs it,
// after `npm run setup -- --grids portfolio,tests`; the EGM2008 case also
// needs `--grids egm2008`, and skips without it.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import { listOperations, type CrsRef } from "../../src/engineering/crs.ts";
import {
  EngineeringFrame,
  RigidPlacement,
  type EngineeringFrameDefinition,
} from "../../src/engineering/EngineeringFrame.ts";
import {
  gridSource,
  loadedGrids,
  loadProj,
  type GridSource,
} from "../../src/engineering/proj.ts";
import type { ProjApi } from "../../src/engineering/projApi.ts";
import { EARTH } from "../../src/scene/Body.ts";

const base = `${join(framesDataDirectory(), "proj")}/`;
const grids = `${join(framesDataDirectory(), "grids")}/`;

let shared: Promise<{ P: ProjApi; source: GridSource }> | undefined;
const setup = () =>
  (shared ??= (async () => ({
    P: await loadProj({ base, grids: [] }),
    source: await gridSource({ base: grids }),
  }))());

const WGS84_3D: CrsRef = { format: "wkid", authority: "EPSG", wkid: 4979 };
const EGM96_GRID = "us_nga_egm96_15.tif";
const EGM2008_GRID = "us_nga_egm08_25.tif";

/** Metres between two geodetic positions' horizontal parts, near enough. */
function horizontalMetres(
  a: { longitude: number; latitude: number },
  b: { longitude: number; latitude: number },
): number {
  const r = EARTH.ellipsoid.maximumRadius;
  return Math.hypot(
    (a.longitude - b.longitude) * r * Math.cos(a.latitude),
    (a.latitude - b.latitude) * r,
  );
}

// Jakarta: SRGI2013 / UTM zone 48S (EPSG:9488) with INAGeoid2020 v1 heights
// (EPSG:9471). proj.db's transformation 9305 reads INAGEOID2020v1.gtx, which
// PROJ-data 1.25.0 doesn't have (the pre-flight ruling that replaced São
// Paulo, which proj.db can't build).
const JAKARTA: CrsRef = {
  format: "wkid",
  authority: "EPSG",
  wkid: 9488,
  vcsWkid: 9471,
};
const JAKARTA_EGM96: CrsRef = { ...JAKARTA, vcsWkid: 5773 };
const JAKARTA_GRID = "INAGEOID2020v1.gtx";
// Central Jakarta, about 106.85° E, 6.21° S.
const JAKARTA_POINT = [704_000, 9_313_000, 0];

const jakarta = (
  extra: Partial<EngineeringFrameDefinition> = {},
): EngineeringFrameDefinition => ({
  name: "Jakarta",
  body: EARTH,
  crs: JAKARTA,
  ...extra,
});

describe("geoid fallback: Jakarta, EPSG:9488+9471", () => {
  it("PROJ's best operation reads INAGEOID2020v1.gtx, which the catalog lacks", async () => {
    const { P, source } = await setup();
    const candidates = listOperations(P, JAKARTA, WGS84_3D);
    const best = candidates.find((c) => !c.ballpark)!;
    expect(best.name).toContain("SRGI2013 to INAGeoid2020 v1 height (1)");
    expect(best.missingGrids).toEqual([JAKARTA_GRID]);
    expect(source.catalog.get(JAKARTA_GRID)).toBeUndefined();
    // Every other candidate is a ballpark.
    expect(candidates.filter((c) => !c.ballpark)).toHaveLength(1);
    // The horizontal CRS alone resolves with no grid.
    const horizontal = listOperations(
      P,
      { format: "wkid", authority: "EPSG", wkid: 9488 },
      WGS84_3D,
    );
    expect(horizontal[0]!.ballpark).toBe(false);
    expect(horizontal[0]!.gridsNeeded).toEqual([]);
  });

  it("without geoidFallback, load throws, naming the missing grid", async () => {
    const { P, source } = await setup();
    await expect(
      EngineeringFrame.load(jakarta(), { proj: P, grids: source }),
    ).rejects.toThrow(/INAGEOID2020v1\.gtx/);
    expect(loadedGrids(P).has(EGM96_GRID)).toBe(false);
  });

  it('with "EGM96", load fetches EGM96 and reads design heights as EGM96 heights', async () => {
    const { P, source } = await setup();
    const frame = await EngineeringFrame.load(
      jakarta({ geoidFallback: "EGM96" }),
      { proj: P, grids: source },
    );
    expect(frame.fallback).toEqual({
      model: "EGM96",
      replacedVertical: 9471,
      missingGrids: [JAKARTA_GRID],
    });
    expect(frame.fallback!.sigma).toBeUndefined();
    expect(loadedGrids(P).has(EGM96_GRID)).toBe(true);
    expect(frame.operation.grids).toEqual([EGM96_GRID]);
    expect(frame.gridCredits).toEqual([source.catalog.credit(EGM96_GRID)]);
    // The definition is the caller's; the operation is the fallback's.
    expect(frame.definition.crs).toEqual(JAKARTA);

    const direct = EngineeringFrame.create(
      { name: "Jakarta EGM96", body: EARTH, crs: JAKARTA_EGM96 },
      P,
    );
    expect(direct.fallback).toBeUndefined();
    expect(frame.operation.pipeline).toBe(direct.operation.pipeline);
    const a = frame.toGeodetic(JAKARTA_POINT);
    const b = direct.toGeodetic(JAKARTA_POINT);
    expect(horizontalMetres(a, b)).toBeLessThan(1e-9);
    expect(Math.abs(a.height - b.height)).toBeLessThan(1e-9);
    // EGM96's separation at Jakarta is a few metres or more: a real geoid,
    // not a ballpark's zero.
    expect(Math.abs(a.height)).toBeGreaterThan(1);

    // Design → body-fixed → design.
    const back = frame.fromBodyFixed(frame.toBodyFixed(JAKARTA_POINT));
    for (let i = 0; i < 3; i++) {
      expect(Math.abs(back[i]! - JAKARTA_POINT[i]!)).toBeLessThan(1e-4);
    }
  });

  it("records fallbackSigma; create (with EGM96 loaded) applies the same fallback", async () => {
    const { P } = await setup();
    const frame = EngineeringFrame.create(
      jakarta({ geoidFallback: "EGM96", fallbackSigma: 0.5 }),
      P,
    );
    expect(frame.fallback).toEqual({
      model: "EGM96",
      replacedVertical: 9471,
      missingGrids: [JAKARTA_GRID],
      sigma: 0.5,
      sigmaSource: "app",
    });
    // A tileset's declaration states it (declaredDefinition).
    const declared = EngineeringFrame.create(
      jakarta({
        geoidFallback: "EGM96",
        fallbackSigma: 0.5,
        fallbackSigmaSource: "declaration",
      }),
      P,
    );
    expect(declared.fallback?.sigmaSource).toBe("declaration");
  });

  it("a CRS that resolves takes no fallback", async () => {
    const { P } = await setup();
    const frame = EngineeringFrame.create(
      {
        name: "Jakarta EGM96 asked",
        body: EARTH,
        crs: JAKARTA_EGM96,
        geoidFallback: "EGM2008",
      },
      P,
    );
    expect(frame.fallback).toBeUndefined();
    expect(frame.operation.grids).toEqual([EGM96_GRID]);
  });

  it.skipIf(!existsSync(join(grids, EGM2008_GRID)))(
    'with "EGM2008" (opt-in: setup --grids egm2008), load fetches EGM2008',
    async () => {
      const { P, source } = await setup();
      const frame = await EngineeringFrame.load(
        jakarta({ geoidFallback: "EGM2008" }),
        { proj: P, grids: source },
      );
      expect(frame.fallback).toEqual({
        model: "EGM2008",
        replacedVertical: 9471,
        missingGrids: [JAKARTA_GRID],
      });
      expect(frame.operation.grids).toEqual([EGM2008_GRID]);
      const direct = EngineeringFrame.create(
        {
          name: "Jakarta EGM2008",
          body: EARTH,
          crs: { ...JAKARTA, vcsWkid: 3855 },
        },
        P,
      );
      const a = frame.toGeodetic(JAKARTA_POINT);
      const b = direct.toGeodetic(JAKARTA_POINT);
      expect(horizontalMetres(a, b)).toBeLessThan(1e-9);
      expect(Math.abs(a.height - b.height)).toBeLessThan(1e-9);
    },
  );
});

// A fallback keeps the CRS's vertical unit and direction: the operation takes
// the model's heights (metres, up). Before the DKLAT and GEOID18 grids are
// loaded (this file's PROJ never loads GEOID18), with EGM96 loaded above.
describe("geoid fallback: design depths and feet", () => {
  const DEPTH: CrsRef = {
    format: "wkid",
    authority: "EPSG",
    wkid: 25832,
    vcsWkid: 10550,
  };
  const KATTEGAT_EN = [653_000, 6_263_000];

  it("a depth CRS's fallback reads depth +10 as 10 m below the model's 0", async () => {
    const { P } = await setup();
    expect(loadedGrids(P).has("dk_sdfi_dklat_2023.tif")).toBe(false);
    const frame = EngineeringFrame.create(
      { name: "Kattegat", body: EARTH, crs: DEPTH, geoidFallback: "EGM96" },
      P,
    );
    expect(frame.fallback).toEqual({
      model: "EGM96",
      replacedVertical: 10550,
      missingGrids: ["dk_sdfi_dklat_2023.tif"],
    });
    expect(frame.units.verticalDirection).toBe("down");
    const direct = EngineeringFrame.create(
      {
        name: "Kattegat EGM96",
        body: EARTH,
        crs: { ...DEPTH, vcsWkid: 5773 },
      },
      P,
    );
    const at = (u: number) => [KATTEGAT_EN[0]!, KATTEGAT_EN[1]!, u];
    const h0 = frame.toGeodetic(at(0)).height;
    const h10 = frame.toGeodetic(at(10)).height;
    expect(Math.abs(h10 - (h0 - 10))).toBeLessThan(1e-6);
    // Depth 10 is EGM96 height -10.
    expect(Math.abs(h10 - direct.toGeodetic(at(-10)).height)).toBeLessThan(
      1e-9,
    );
    for (const u of [0, 10]) {
      const back = frame.fromBodyFixed(frame.toBodyFixed(at(u)));
      for (let i = 0; i < 3; i++) {
        expect(Math.abs(back[i]! - at(u)[i]!)).toBeLessThan(1e-4);
      }
    }
  });

  it("a ftUS CRS's fallback converts design feet to the model's metres", async () => {
    const { P } = await setup();
    // SPCS83 California zone 3 (ftUS) + NAVD88 height (ftUS), without
    // GEOID18.
    const crs: CrsRef = {
      format: "wkid",
      authority: "EPSG",
      wkid: 6420,
      vcsWkid: 6360,
    };
    const frame = EngineeringFrame.create(
      { name: "CA3", body: EARTH, crs, geoidFallback: "EGM96" },
      P,
    );
    // PROJ's best candidate (1.14 m, NADCON5 with GEOID99) is the one lacking.
    expect(frame.fallback?.missingGrids).toContain("us_noaa_g1999u05.tif");
    expect(frame.metersPerHeightUnit).toBeCloseTo(1200 / 3937, 15);
    const direct = EngineeringFrame.create(
      { name: "CA3 EGM96", body: EARTH, crs: { ...crs, vcsWkid: 5773 } },
      P,
    );
    const en = [6_000_000, 2_100_000];
    const h100 = frame.toGeodetic([en[0]!, en[1]!, 100]).height;
    const h0 = frame.toGeodetic([en[0]!, en[1]!, 0]).height;
    expect(Math.abs(h100 - h0 - 100 * (1200 / 3937))).toBeLessThan(1e-6);
    expect(
      Math.abs(
        h100 - direct.toGeodetic([en[0]!, en[1]!, 100 * (1200 / 3937)]).height,
      ),
    ).toBeLessThan(1e-9);
    const back = frame.fromBodyFixed(frame.toBodyFixed([en[0]!, en[1]!, 100]));
    expect(Math.abs(back[2]! - 100)).toBeLessThan(1e-4);
  });
});

// A lowest-astronomical-tide depth CRS with its PROJ-data grid. proj.db
// 9.7.1 relates Amersfoort / RD New + LAT NL depth (EPSG:28992+9287) only by
// ballparks (its grid's transformation is from ETRS89), so the brief's
// second choice: ETRS89 / UTM zone 32N + DKLAT(2023) depth
// (EPSG:25832+10550), through transformation 10563 and
// dk_sdfi_dklat_2023.tif.
const DKLAT: CrsRef = {
  format: "wkid",
  authority: "EPSG",
  wkid: 25832,
  vcsWkid: 10550,
};
const DKLAT_GRID = "dk_sdfi_dklat_2023.tif";
// The Kattegat, about 11.5° E, 56.5° N.
const KATTEGAT = [653_000, 6_263_000];

describe("depth axes: DKLAT(2023) depth, EPSG:25832+10550", () => {
  it("Amersfoort / RD New + LAT NL depth has only ballparks in proj.db 9.7.1", async () => {
    const { P } = await setup();
    const candidates = listOperations(
      P,
      { format: "wkid", authority: "EPSG", wkid: 28992, vcsWkid: 9287 },
      WGS84_3D,
    );
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((c) => c.ballpark)).toBe(true);
    // Its grid is on ETRS89, and the error says so.
    expect(() =>
      EngineeringFrame.create(
        {
          name: "RD + LAT",
          body: EARTH,
          crs: {
            format: "wkid",
            authority: "EPSG",
            wkid: 28992,
            vcsWkid: 9287,
          },
        },
        P,
      ),
    ).toThrow(
      /^LAT NL depth: its grids are defined on ETRS89, not on Amersfoort .*use a horizontal CRS on ETRS89, or the compound EPSG:4258\+9287/,
    );
  });

  it("depth +10 is 10 m below depth 0, and both round trip", async () => {
    const { P, source } = await setup();
    const frame = await EngineeringFrame.load(
      { name: "Kattegat", body: EARTH, crs: DKLAT },
      { proj: P, grids: source },
    );
    expect(frame.units.verticalDirection).toBe("down");
    expect(frame.operation.grids).toEqual([DKLAT_GRID]);
    expect(frame.operation.ballpark).toBe(false);
    expect(frame.gridCredits).toEqual([source.catalog.credit(DKLAT_GRID)]);
    const surface = [KATTEGAT[0]!, KATTEGAT[1]!, 0];
    const deep = [KATTEGAT[0]!, KATTEGAT[1]!, 10];
    const h0 = frame.toGeodetic(surface).height;
    const h10 = frame.toGeodetic(deep).height;
    expect(Math.abs(h10 - (h0 - 10))).toBeLessThan(1e-6);
    for (const design of [surface, deep]) {
      const back = frame.fromBodyFixed(frame.toBodyFixed(design));
      for (let i = 0; i < 3; i++) {
        expect(Math.abs(back[i]! - design[i]!)).toBeLessThan(1e-4);
      }
    }
  });

  it("a rigid placement's up axis points down, and it inverts exactly", async () => {
    const { P } = await setup();
    const frame = EngineeringFrame.create(
      { name: "Kattegat", body: EARTH, crs: DKLAT },
      P,
    );
    const surface = [KATTEGAT[0]!, KATTEGAT[1]!, 0];
    const deep = [KATTEGAT[0]!, KATTEGAT[1]!, 10];
    const placement = RigidPlacement.at(frame, surface);
    const rigid = placement.toBodyFixed(deep);
    // At the anchor's E, N the rigid depth agrees with the exact one.
    const exact = frame.toBodyFixed(deep);
    expect(
      Math.hypot(
        rigid[0]! - exact[0]!,
        rigid[1]! - exact[1]!,
        rigid[2]! - exact[2]!,
      ),
    ).toBeLessThan(1e-4);
    for (const design of [
      surface,
      deep,
      [KATTEGAT[0]! + 1500, KATTEGAT[1]! - 800, 25],
    ]) {
      const back = placement.fromBodyFixed(placement.toBodyFixed(design));
      for (let i = 0; i < 3; i++) {
        expect(Math.abs(back[i]! - design[i]!)).toBeLessThan(1e-9);
      }
    }
  });
});

// NAD83(2011) / UTM zone 18N + MLLW depth: proj.db has no transformation
// for MLLW (NOAA's VDatum surfaces aren't in PROJ-data; call 11).
const MLLW: CrsRef = {
  format: "wkid",
  authority: "EPSG",
  wkid: 6347,
  vcsWkid: 5866,
};
const MLLW_MESSAGE =
  /MLLW depth: no PROJ-data grid relates it to the ellipsoid/;

describe("tidal datums with no grid: MLLW depth, EPSG:6347+5866", () => {
  const mllw = (
    extra: Partial<EngineeringFrameDefinition> = {},
  ): EngineeringFrameDefinition => ({
    name: "New York Harbor",
    body: EARTH,
    crs: MLLW,
    ...extra,
  });

  it("create and load throw, naming the datum", async () => {
    const { P, source } = await setup();
    expect(() => EngineeringFrame.create(mllw(), P)).toThrow(MLLW_MESSAGE);
    // It says what was checked.
    expect(() => EngineeringFrame.create(mllw(), P)).toThrow(
      /as far as proj\.db shows: it lists no grid transformation by its name .* and no geoid model for it/,
    );
    await expect(
      EngineeringFrame.load(mllw(), { proj: P, grids: source }),
    ).rejects.toThrow(MLLW_MESSAGE);
  });

  it("a geoid fallback doesn't apply: the datum has no grid, not a missing one", async () => {
    const { P } = await setup();
    const make = () =>
      EngineeringFrame.create(mllw({ geoidFallback: "EGM96" }), P);
    expect(make).toThrow(MLLW_MESSAGE);
    // And it says why the fallback wasn't taken.
    expect(make).toThrow(
      /geoidFallback "EGM96" doesn't apply: the CRS doesn't fail for missing grids/,
    );
  });

  it("a height system whose grids are on another datum is told apart: WGS 84 / UTM + NAVD88", async () => {
    const { P } = await setup();
    // GEOID18 (in PROJ-data) relates NAVD88 to NAD83(2011), not to WGS 84.
    const navd88 = (vcsWkid: number) => () =>
      EngineeringFrame.create(
        {
          name: "UTM 11N + NAVD88",
          body: EARTH,
          crs: { format: "wkid", authority: "EPSG", wkid: 32611, vcsWkid },
        },
        P,
      );
    expect(navd88(5703)).toThrow(
      /^NAVD88 height: its grids are defined on NAD83\(2011\)[^;]*, not on WGS 84 .*use a horizontal CRS on NAD83\(2011\), or the compound EPSG:6318\+5703 \(best: NAD83\(2011\) to NAVD88 height \(3\), 0\.015 m\)/,
    );
    // In ftUS, through NAVD88 height's conversion.
    expect(navd88(6360)).toThrow(
      /^NAVD88 height \(ftUS\): its grids are defined on NAD83\(2011\).*the compound EPSG:6318\+6360/,
    );
    expect(navd88(6360)).not.toThrow(/no PROJ-data grid/);
  });

  it("an area of interest beyond the vertical grid's area is told apart from grids on another datum: BNG + ODN", async () => {
    const { P } = await setup();
    // PROJ relates British National Grid + ODN to WGS 84 through OSTN15 and
    // OSGM15 (1.038 m), whose area of use starts at 49.93° N. A box that
    // reaches 49.86° N leaves only ballparks: the area is why (plan 4b Task
    // 9 found this; the message said ODN's grids weren't on OSGB36).
    const bngOdn: CrsRef = {
      format: "wkid",
      authority: "EPSG",
      wkid: 27700,
      vcsWkid: 5701,
    };
    const make = (south: number) => () =>
      EngineeringFrame.create(
        {
          name: "Cornwall",
          body: EARTH,
          crs: bngOdn,
          areaOfInterest: { west: -5.4, south, east: -5.0, north: 50.2 },
        },
        P,
      );
    expect(make(49.86)).toThrow(
      /^ODN height: no accurate operation from EPSG:27700\+5701 covers the area of interest \(W -5\.4000°, S 49\.8600°, E -5\.0000°, N 50\.2000°\); PROJ's best without the area, Inverse of British National Grid \+ OSGB36 to ETRS89 \(2\) \+ Inverse of ETRS89 to ODN height \(2\) \+ ETRS89 to WGS 84 \(1\) \(1\.038 m\), applies to W -7\.0600°, S 49\.9300°, E 1\.8000°, N 58\.7100°\. PROJ offers only a ballpark operation/,
    );
    expect(make(49.86)).not.toThrow(/its grids are defined on/);
    // A box as floats arrive (49.8600000001) prints to 4 decimals.
    expect(make(49.8600000001)).toThrow(/S 49\.8600°, E/);
    // Inside the area, the frame resolves once its grids are loaded; without
    // them the error is PROJ's own, naming the grids.
    expect(make(49.95)).toThrow(/missing: .*uk_os_/);
  });

  it("a non-EPSG vertical CRS, which the name search can't vouch for, keeps the generic message", async () => {
    const { P } = await setup();
    // ESRI:105703 is NAVD88_height_(ftUS) (EPSG's datum 5103): GEOID18
    // relates it to NAD83(2011), but proj.db names its transformations
    // after EPSG's CRSs, so a search under ESRI finds none.
    const wkt = (code: string) =>
      P.proj_as_wkt(P.proj_create(code), P.PJ_WKT2_2019);
    const crs: CrsRef = {
      format: "wkt2",
      wkt2: `COMPOUNDCRS["WGS 84 / UTM zone 11N + NAVD88_height_(ftUS)",${wkt("EPSG:32611")},${wkt("ESRI:105703")}]`,
    };
    const make =
      (extra: Partial<EngineeringFrameDefinition> = {}) =>
      () =>
        EngineeringFrame.create(
          { name: "UTM 11N + ESRI NAVD88", body: EARTH, crs, ...extra },
          P,
        );
    expect(make()).toThrow(/^PROJ offers only a ballpark operation/);
    expect(make()).not.toThrow(/no PROJ-data grid/);
    // A fallback's reason is appended to the same error, its class kept.
    let thrown: unknown;
    try {
      make({ geoidFallback: "EGM96" })();
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toMatch(
      /^PROJ offers only a ballpark operation.*\(geoidFallback "EGM96" doesn't apply: the CRS isn't an EPSG code with a vcsWkid\)$/s,
    );
    expect((thrown as Error).cause).toBeUndefined();
  });

  it("allowBallpark still accepts the ballpark, with no accuracy", async () => {
    const { P } = await setup();
    const frame = EngineeringFrame.create(mllw({ allowBallpark: true }), P);
    expect(frame.operation.ballpark).toBe(true);
    expect(frame.operation.accuracy).toBeUndefined();
    expect(frame.units.verticalDirection).toBe("down");
  });
});
