// PROJ from the frames data store (scripts/frameData.mjs, role `proj`), loaded
// natively in Node. Excluded from `vitest run`; `npm run test:data` runs it.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import { loadProj } from "../../src/engineering/proj.ts";

const base = `${join(framesDataDirectory(), "proj")}/`;

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
    const a = await loadProj({ base });
    expect(await loadProj({ base })).toBe(a);
  });

  it("reports each CRS's axis unit from PROJ", async () => {
    const P = await loadProj({ base });
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
    const P = await loadProj({ base });
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
});
