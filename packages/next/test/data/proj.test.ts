// PROJ from the frames data store (scripts/frameData.mjs, role `proj`), loaded
// natively in Node. Excluded from `vitest run`; `npm run test:data` runs it.
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import { loadProj } from "../../src/engineering/proj.ts";
import { PROJ_FILE_SHA256 } from "../../src/engineering/projPins.ts";
import { sha256Hex } from "../../src/io/sha256.ts";
import fixture from "../fixtures/frames/proj.json";

const base = `${join(framesDataDirectory(), "proj")}/`;
/** The grids this file's PROJ loads: none (Node, like the browser, loads only grids it names; Task 21). */
const GRIDS: string[] = [];

// California zone 3 (NAD83, GRS80), metres: grid (1900000, 600000) → lon/lat in radians.
const PIPELINE =
  "+proj=pipeline +step +inv +proj=lcc +lat_0=36.5 +lon_0=-120.5 +lat_1=38.4333333333333 +lat_2=37.0666666666667 +x_0=2000000 +y_0=500000 +ellps=GRS80";
// uv run --with pyproj python -c "from pyproj import Transformer; print(Transformer.from_pipeline('<PIPELINE>').transform(1900000.0, 600000.0, 0.0, 0.0, radians=True))"
const PYPROJ = [-2.1228337044992345, 0.6526766953124016];

describe("PROJ (native, from the store)", () => {
  it("is in the store, hashed in the manifest", () => {
    const manifest = JSON.parse(
      readFileSync(join(framesDataDirectory(), "manifest.json"), "utf8"),
    ) as { files: { file: string; role: string; sha256: string }[] };
    const proj = manifest.files.filter((f) => f.role === "proj");
    for (const name of ["proj.db", "proj_capi.mjs", "proj_capi.wasm"]) {
      expect(proj.map((f) => f.file)).toContain(`proj/${name}`);
    }
    for (const f of proj) {
      expect(existsSync(join(framesDataDirectory(), f.file))).toBe(true);
      expect(f.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("loads once per base", async () => {
    const a = await loadProj({ base, grids: GRIDS });
    expect(await loadProj({ base, grids: GRIDS })).toBe(a);
  });

  it("reports each CRS's axis unit from PROJ", async () => {
    const P = await loadProj({ base, grids: GRIDS });
    const axis = (code: string) =>
      P.proj_cs_get_axis_info(
        P.proj_crs_get_coordinate_system(P.proj_create(code)),
        0,
      );
    const ftUS = axis("EPSG:2227");
    expect(ftUS.unit_conv_factor).toBe(0.30480060960121924);
    expect(ftUS.unit_name).toBe("US survey foot");
    expect(axis("EPSG:2223").unit_conv_factor).toBe(0.3048);
  });

  it("transforms a pinned pipeline like pyproj, to 1e-6 m", async () => {
    const P = await loadProj({ base, grids: GRIDS });
    const pipeline = P.proj_create(PIPELINE);
    const out = P.proj_trans(
      pipeline,
      P.PJ_FWD,
      P.proj_coord(1900000, 600000, 0, 0),
    );
    const R = 6378137;
    expect(Math.abs(out.v[0]! - PYPROJ[0]!) * R).toBeLessThan(1e-6);
    expect(Math.abs(out.v[1]! - PYPROJ[1]!) * R).toBeLessThan(1e-6);
    const back = P.proj_trans(pipeline, P.PJ_INV, out);
    expect(back.v[0]).toBeCloseTo(1900000, 6);
    expect(back.v[1]).toBeCloseTo(600000, 6);
  });

  it("is the PROJ the fixture's references were checked against", async () => {
    const P = await loadProj({ base, grids: GRIDS });
    expect(P.proj_info().release).toMatch(/^Rel\. 9\.7\.1,/);
    expect(
      (fixture as { engineProjVersion?: string }).engineProjVersion,
      "regenerate test/fixtures/frames/proj.json with scripts/frameFixtures.py proj (plan 4a carried forward)",
    ).toBe(P.proj_info().version);
  });
});

describe("PROJ's Node files, checked before they load", () => {
  const temporary: string[] = [];
  afterAll(() => {
    for (const dir of temporary) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  /** A copy of the store's binding and proj.db, with `name` changed if given. */
  function copyOfBase(name?: "proj.db" | "proj_capi.node"): string {
    const dir = mkdtempSync(join(tmpdir(), "proj-pinned-"));
    temporary.push(dir);
    for (const file of ["proj_capi.node", "proj.db"]) {
      copyFileSync(join(base, file), join(dir, file));
    }
    if (name) {
      const bytes = readFileSync(join(dir, name));
      bytes[bytes.length >> 1]! ^= 0xff;
      writeFileSync(join(dir, name), bytes);
    }
    return `${dir}/`;
  }

  const manifestSha256 = (file: string) =>
    (
      JSON.parse(
        readFileSync(join(framesDataDirectory(), "manifest.json"), "utf8"),
      ) as { files: { file: string; sha256: string }[] }
    ).files.find((f) => f.file === file)!.sha256;

  it("refuses a proj.db that doesn't match its pin", async () => {
    const dir = copyOfBase("proj.db");
    const got = await sha256Hex(readFileSync(join(dir, "proj.db")));
    await expect(loadProj({ base: dir, grids: GRIDS })).rejects.toThrow(
      `PROJ: proj.db SHA-256 mismatch (expected ${PROJ_FILE_SHA256["proj.db"]}, got ${got})`,
    );
  });

  it("refuses a proj_capi.node that doesn't match setup's manifest", async () => {
    const dir = copyOfBase("proj_capi.node");
    const got = await sha256Hex(readFileSync(join(dir, "proj_capi.node")));
    await expect(loadProj({ base: dir, grids: GRIDS })).rejects.toThrow(
      `PROJ: proj_capi.node SHA-256 mismatch (expected ${manifestSha256("proj/proj_capi.node")}, got ${got})`,
    );
  });

  it("needs the store's manifest, wherever the base is", async () => {
    const dir = copyOfBase();
    const empty = mkdtempSync(join(tmpdir(), "frames-empty-"));
    temporary.push(empty);
    const saved = process.env.FRAMES_DATA_DIR;
    process.env.FRAMES_DATA_DIR = empty;
    try {
      await expect(loadProj({ base: dir, grids: GRIDS })).rejects.toThrow(
        /manifest\.json.*run `npm run setup`/,
      );
    } finally {
      if (saved === undefined) {
        delete process.env.FRAMES_DATA_DIR;
      } else {
        process.env.FRAMES_DATA_DIR = saved;
      }
    }
  });
});
