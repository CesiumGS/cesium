// One explicit grid set in Node (plan 4b Task 3): PROJ starts with no grids,
// and a grid counts only once loadGrids has checked it against the PROJ-data
// catalog and staged it where PROJ looks. `npm run test:data` runs it.
//
// Each data test file gets a PROJ of its own: Vitest 5.1's default pool is
// `forks` with `isolate: true` (checked 2026-11-07: the resolved config of
// this package's vite.config.ts says so, and three files run together each
// logged a different process.pid and none saw another's globals or
// process.env), so grids this file loads never reach another file's PROJ,
// and its one-base-per-process rule is per file.
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import { listOperations, resolveOperation } from "../../src/engineering/crs.ts";
import {
  gridSource,
  loadedGrids,
  loadGrids,
  loadProj,
} from "../../src/engineering/proj.ts";
import { sha256Hex } from "../../src/io/sha256.ts";
import {
  HOSTILE_GRID_NAMES,
  RESERVED_GRID_NAMES,
} from "../hostileGridNames.ts";

const base = `${join(framesDataDirectory(), "proj")}/`;
const grids = `${join(framesDataDirectory(), "grids")}/`;
const OSGM15 = "uk_os_OSGM15_GB.tif";
const OSTN15 = "uk_os_OSTN15_NTv2_OSGBtoETRS.tif";
const GEOID18 = "us_noaa_g2018u0.tif";

const BNG_ODN = {
  format: "wkid",
  authority: "EPSG",
  wkid: 27700,
  vcsWkid: 5701,
} as const;
const WGS84_3D = { format: "wkid", authority: "EPSG", wkid: 4979 } as const;

const missing = (P: Awaited<ReturnType<typeof loadProj>>) =>
  new Set(listOperations(P, BNG_ODN, WGS84_3D).flatMap((c) => c.missingGrids));

describe("the staging directory (Node)", () => {
  // First in the file: the sweep runs at the process's first load.
  it("is the process's own, holds checked copies, and the first load sweeps those of ended processes", async () => {
    // A process that has ended, and one that runs (this one's parent).
    const ended = spawnSync(process.execPath, ["-e", ""]).pid!;
    const stale = mkdtempSync(join(tmpdir(), "cesium-proj-"));
    writeFileSync(join(stale, "owner"), String(ended));
    const running = mkdtempSync(join(tmpdir(), "cesium-proj-"));
    writeFileSync(join(running, "owner"), String(process.ppid));
    try {
      const P = await loadProj({ base, grids: [] });
      expect(existsSync(stale)).toBe(false);
      expect(existsSync(running)).toBe(true);
      // PROJ_DATA is a fresh directory owned by this process, holding copies
      // of proj.db and the binding, and no grid until one is loaded.
      const staging = process.env.PROJ_DATA!;
      expect(staging).toMatch(/[\\/]cesium-proj-[^\\/]+$/);
      expect(readFileSync(join(staging, "owner"), "utf8")).toBe(
        String(process.pid),
      );
      expect(readdirSync(staging).sort()).toEqual([
        "owner",
        "proj.db",
        "proj_capi.node",
      ]);
      expect(P.proj_grid_info(GEOID18).filename).toBe("");
    } finally {
      rmSync(stale, { recursive: true, force: true });
      rmSync(running, { recursive: true, force: true });
    }
  });
});

describe("one explicit grid set (Node)", () => {
  it("starts with no grids, and counts OSGM15 and OSTN15 once loadGrids loads them", async () => {
    const P = await loadProj({ base, grids: [] });
    expect(loadedGrids(P).size).toBe(0);
    expect(missing(P)).toContain(OSGM15);
    expect(() => resolveOperation(P, BNG_ODN, "EPSG:4979")).toThrow(
      new RegExp(OSGM15.replace(/\./g, "\\.")),
    );

    await loadGrids(P, await gridSource({ base: grids }), [OSGM15, OSTN15]);
    expect([...loadedGrids(P)].sort()).toEqual([OSGM15, OSTN15].sort());
    expect(missing(P)).not.toContain(OSGM15);
    expect(missing(P)).not.toContain(OSTN15);
    // Staged, as copies PROJ finds there.
    expect(P.proj_grid_info(OSGM15).filename).toBe(
      join(process.env.PROJ_DATA!, OSGM15),
    );
    // PROJ had cached both as unavailable when it first looked; the recorded
    // operation reads them now.
    const op = resolveOperation(P, BNG_ODN, "EPSG:4979");
    expect(op.grids).toEqual(expect.arrayContaining([OSGM15, OSTN15]));
    expect(op.ballpark).toBe(false);
    // ODN height 0 becomes an ellipsoidal height: OSGM15 puts the geoid about
    // 46 m above the ellipsoid near Greenwich (E 538000, N 177000).
    const out = op.forward([538000, 177000, 0]);
    expect(out[2]).toBeGreaterThan(40);
    expect(out[2]).toBeLessThan(55);
  });

  it("loads no grid when grids is omitted: Node has no legacy default, so it sees exactly the grids listed (plan call 5, Task 21)", async () => {
    // GEOID18 is in base and in setup's manifest, which the legacy default
    // read; nothing in this file loads it.
    const P = await loadProj({ base });
    expect(loadedGrids(P).has(GEOID18)).toBe(false);
    expect(
      listOperations(
        P,
        { format: "wkid", authority: "EPSG", wkid: 6420, vcsWkid: 6360 },
        WGS84_3D,
      ).flatMap((c) => c.missingGrids),
    ).toContain(GEOID18);
  });

  it("keeps a grid that sits in base but wasn't named out of PROJ's reach", async () => {
    // GEOID18 is in the store's proj/, beside proj.db, but this PROJ was
    // loaded with grids: [], so it reads from its own staging directory.
    const P = await loadProj({ base, grids: [] });
    expect(loadedGrids(P).has(GEOID18)).toBe(false);
    const navd88 = listOperations(
      P,
      { format: "wkid", authority: "EPSG", wkid: 6420, vcsWkid: 6360 },
      WGS84_3D,
    ).flatMap((c) => c.missingGrids);
    expect(navd88).toContain(GEOID18);
  });

  it("refuses the one rule's names (PROJ's own in any case, a trailing dot), before reading anything (Node)", async () => {
    const P = await loadProj({ base, grids: [] });
    const before = readdirSync(process.env.PROJ_DATA!).sort();
    // An overridden catalog listing one of them can't be a grid source.
    const dir = mkdtempSync(join(tmpdir(), "frames-reserved-grids-"));
    try {
      const encode = (text: string) => new TextEncoder().encode(text);
      const licenses = "filename,license\n";
      writeFileSync(join(dir, "copyright_and_licenses.csv"), licenses);
      for (const name of HOSTILE_GRID_NAMES) {
        const catalog = JSON.stringify({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {
                name,
                url: `https://cdn.proj.org/${name}`,
                sha256sum: "0".repeat(64),
                file_size: 1,
                source: "Stub Agency",
              },
              geometry: null,
            },
          ],
        });
        writeFileSync(join(dir, "files.geojson"), catalog);
        await expect(
          gridSource({
            base: dir,
            catalogSha256: await sha256Hex(encode(catalog)),
            licensesSha256: await sha256Hex(encode(licenses)),
            version: "0.0-test",
          }),
          name,
        ).rejects.toThrow(/^grid catalog: feature 0 is named /);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    // And the real catalog's source refuses each by name.
    const source = await gridSource({ base: grids });
    for (const name of HOSTILE_GRID_NAMES) {
      await expect(loadGrids(P, source, [name]), name).rejects.toThrow(
        RESERVED_GRID_NAMES.includes(name)
          ? `PROJ: ${name} is the name of one of PROJ's own files, not a grid's`
          : `PROJ: ${JSON.stringify(name)} is not a plain grid file name`,
      );
    }
    expect(readdirSync(process.env.PROJ_DATA!).sort()).toEqual(before);
    const loaded = loadedGrids(P);
    expect(HOSTILE_GRID_NAMES.filter((name) => loaded.has(name))).toEqual([]);
  });

  it("refuses a grid whose bytes don't match the catalog, leaving nothing staged or loaded (Review Focus 2)", async () => {
    const P = await loadProj({ base, grids: [] });
    const CONUS = "us_noaa_conus.tif";
    // A grid source of the real catalog, with a corrupted copy of a grid.
    const dir = mkdtempSync(join(tmpdir(), "frames-bad-grids-"));
    try {
      for (const name of ["files.geojson", "copyright_and_licenses.csv"]) {
        copyFileSync(join(grids, name), join(dir, name));
      }
      const good = readFileSync(join(grids, CONUS));
      const bad = Uint8Array.from(good);
      bad[bad.length >> 1]! ^= 0xff;
      writeFileSync(join(dir, CONUS), bad);
      const source = await gridSource({ base: dir });
      const expected = source.catalog.get(CONUS)!.sha256;
      await expect(loadGrids(P, source, [CONUS])).rejects.toThrow(
        `PROJ: ${CONUS} SHA-256 mismatch (expected ${expected}, got ${await sha256Hex(bad)})`,
      );
      const staged = readdirSync(process.env.PROJ_DATA!);
      expect(staged).not.toContain(CONUS);
      expect(staged.filter((name) => name.endsWith(".partial"))).toEqual([]);
      expect(loadedGrids(P).has(CONUS)).toBe(false);
      expect(P.proj_grid_info(CONUS).filename).toBe("");
      // Truncated, too.
      writeFileSync(join(dir, CONUS), good.subarray(0, 1000));
      await expect(loadGrids(P, source, [CONUS])).rejects.toThrow(
        new RegExp(
          `^PROJ: ${CONUS.replace(/\./g, "\\.")} is 1000 bytes, not the catalog's`,
        ),
      );
      expect(readdirSync(process.env.PROJ_DATA!)).not.toContain(CONUS);
      // The right bytes load on a retry.
      writeFileSync(join(dir, CONUS), good);
      await loadGrids(P, source, [CONUS]);
      expect(loadedGrids(P).has(CONUS)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
