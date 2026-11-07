// The PROJ-data catalog and the grids in the frames data store
// (scripts/frameData.mjs `ensureGrids`, roles `gridCatalog` and `grid`).
// Excluded from `vitest run`; `npm run test:data` runs it.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GridCatalog } from "../../src/engineering/gridCatalog.ts";
import { PROJ_DATA_CATALOG } from "../../src/engineering/projPins.ts";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import { GRID_SETS } from "../../scripts/gridSets.mjs";

const store = framesDataDirectory();
const grids = join(store, "grids");
const sha = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");
const manifest = JSON.parse(
  readFileSync(join(store, "manifest.json"), "utf8"),
) as { files: { file: string; role: string; sha256: string }[] };
const catalog = GridCatalog.parse(
  readFileSync(join(grids, "files.geojson"), "utf8"),
  readFileSync(join(grids, "copyright_and_licenses.csv"), "utf8"),
);

describe("the grid store", () => {
  it("holds the pinned catalog: 458 entries", () => {
    const bytes = readFileSync(join(grids, "files.geojson"));
    expect(bytes.length).toBe(PROJ_DATA_CATALOG.catalogBytes);
    expect(sha(bytes)).toBe(PROJ_DATA_CATALOG.catalogSha256);
    const licenses = readFileSync(join(grids, "copyright_and_licenses.csv"));
    expect(sha(licenses)).toBe(PROJ_DATA_CATALOG.licensesSha256);
    expect(catalog.entries.size).toBe(458);
  });

  it("lists the catalog in the manifest, hashed, as role gridCatalog", () => {
    const listed = manifest.files.filter((f) => f.role === "gridCatalog");
    expect(listed.map((f) => f.file).sort()).toEqual([
      "grids/copyright_and_licenses.csv",
      "grids/files.geojson",
    ]);
    for (const f of listed) {
      expect(sha(readFileSync(join(store, f.file)))).toBe(f.sha256);
    }
  });

  it("also puts the catalog beside proj.db", () => {
    for (const name of ["files.geojson", "copyright_and_licenses.csv"]) {
      expect(sha(readFileSync(join(store, "proj", name)))).toBe(
        sha(readFileSync(join(grids, name))),
      );
    }
  });

  it("knows the size of the EGM96 grid", () => {
    expect(catalog.get("us_nga_egm96_15.tif")?.bytes).toBe(2_710_815);
    const listed = manifest.files.find(
      (f) => f.file === "grids/us_nga_egm96_15.tif",
    );
    expect(listed?.role).toBe("grid");
    expect(statSync(join(grids, "us_nga_egm96_15.tif")).size).toBe(2_710_815);
  });

  it("stores every grid of the portfolio and tests sets, as the catalog says", () => {
    for (const name of [...GRID_SETS.portfolio, ...GRID_SETS.tests]) {
      const entry = catalog.get(name);
      expect(entry, `${name} is in the catalog`).toBeDefined();
      expect(entry?.removed, `${name} is not removed`).toBe(false);
      const path = join(grids, name);
      expect(existsSync(path), `${name} is stored`).toBe(true);
      const bytes = readFileSync(path);
      expect(bytes.length, `${name} size`).toBe(entry?.bytes);
      expect(sha(bytes), `${name} hash`).toBe(entry?.sha256);
      const listed = manifest.files.find((f) => f.file === `grids/${name}`);
      expect(listed?.role, `${name} in the manifest`).toBe("grid");
      expect(listed?.sha256).toBe(entry?.sha256);
    }
  });
});
