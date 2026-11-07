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
    expect(frame.fallback).toEqual({ model: "EGM96", replacedVertical: 9471 });
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
      sigma: 0.5,
    });
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
    await expect(
      EngineeringFrame.load(mllw(), { proj: P, grids: source }),
    ).rejects.toThrow(MLLW_MESSAGE);
  });

  it("a geoid fallback doesn't apply: the datum has no grid, not a missing one", async () => {
    const { P } = await setup();
    expect(() =>
      EngineeringFrame.create(mllw({ geoidFallback: "EGM96" }), P),
    ).toThrow(MLLW_MESSAGE);
  });

  it("allowBallpark still accepts the ballpark, with no accuracy", async () => {
    const { P } = await setup();
    const frame = EngineeringFrame.create(mllw({ allowBallpark: true }), P);
    expect(frame.operation.ballpark).toBe(true);
    expect(frame.operation.accuracy).toBeUndefined();
    expect(frame.units.verticalDirection).toBe("down");
  });
});
