// Structured pipelines against PROJ (plan 4b task 5): the pipelines PROJ
// itself records for every pyproj fixture case round-trip through
// parsePipeline and formatPipeline, and a pinned `Pipeline` object resolves
// like the same pinned string. `npm run test:data` runs it.
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import { resolveOperation, type CrsRef } from "../../src/engineering/crs.ts";
import {
  formatPipeline,
  parsePipeline,
} from "../../src/engineering/pipeline.ts";
import { loadProj } from "../../src/engineering/proj.ts";
import fixture from "../fixtures/frames/proj.json";

const base = `${join(framesDataDirectory(), "proj")}/`;
/** The grids this file's PROJ loads: Node, like the browser, loads none unless named (Task 21). */
const GRIDS = ["us_noaa_g2018u0.tif"];
const GEOID = "us_noaa_g2018u0.tif";

interface Case {
  name: string;
  source: string;
  target: string;
}
const cases = (fixture as { cases: Case[] }).cases;

const ref = (code: string): CrsRef => {
  const [authority, rest] = code.split(":") as [string, string];
  const [wkid, vcsWkid] = rest.split("+").map(Number) as [number, number?];
  return vcsWkid === undefined
    ? { format: "wkid", authority, wkid }
    : { format: "wkid", authority, wkid, vcsWkid };
};

const normalized = (s: string) => s.trim().replace(/\s+/g, " ");

describe("the pipelines PROJ records", () => {
  for (const c of cases) {
    it(`round-trips: ${c.name}`, async () => {
      const P = await loadProj({ base, grids: GRIDS });
      const op = resolveOperation(P, ref(c.source), c.target);
      expect(formatPipeline(parsePipeline(op.pipeline))).toBe(
        normalized(op.pipeline),
      );
    });
  }

  it("records the optional grids of the operation", async () => {
    const P = await loadProj({ base, grids: GRIDS });
    const op = resolveOperation(
      P,
      { format: "wkid", authority: "EPSG", wkid: 6420, vcsWkid: 6360 },
      "EPSG:4979",
    );
    expect(op.grids).toContain(GEOID);
    expect(op.optionalGrids).toEqual([]);
  });
});

describe("a pinned pipeline", () => {
  const source: CrsRef = { format: "wkid", authority: "EPSG", wkid: 32611 };

  it("resolves the same as an object and as a string", async () => {
    const P = await loadProj({ base, grids: GRIDS });
    const text =
      "+proj=pipeline +step +inv +proj=utm +zone=11 +ellps=WGS84 +step +proj=unitconvert +xy_in=rad +xy_out=deg";
    const fromString = resolveOperation(P, source, "EPSG:4979", {
      pipeline: text,
    });
    const fromObject = resolveOperation(P, source, "EPSG:4979", {
      pipeline: {
        steps: [
          {
            operation: "utm",
            inverse: true,
            params: { zone: "11", ellps: "WGS84" },
          },
          {
            operation: "unitconvert",
            params: { xy_in: "rad", xy_out: "deg" },
          },
        ],
      },
    });
    expect(fromObject.pipeline).toBe(fromString.pipeline);
    expect(fromObject.grids).toEqual(fromString.grids);
    const xyz = [500000, 4000000, 10];
    expect([...fromObject.forward(xyz)]).toEqual([...fromString.forward(xyz)]);
  });

  it("throws, naming a geoid grid that is not loaded", async () => {
    const P = await loadProj({ base, grids: GRIDS });
    expect(() =>
      resolveOperation(P, source, "EPSG:4979", {
        pipeline: {
          steps: [
            {
              operation: "vgridshift",
              params: { geoidgrids: "not_a_loaded_grid.tif", multiplier: "1" },
            },
          ],
        },
      }),
    ).toThrow(/needs not_a_loaded_grid\.tif, which is not loaded/);
  });

  it("refuses a quote that would hide a step from PROJ", async () => {
    const P = await loadProj({ base, grids: GRIDS });
    expect(() =>
      resolveOperation(P, source, "EPSG:4979", {
        pipeline:
          '+proj=pipeline +step +inv +proj=utm +zone=11 +step +proj=unitconvert +title="x +step +proj=affine +xoff=1000 +title=y"',
      }),
    ).toThrow(/"x/);
  });

  it("counts a grid named optional and required as required", async () => {
    const P = await loadProj({ base, grids: GRIDS });
    expect(() =>
      resolveOperation(P, source, "EPSG:4979", {
        pipeline:
          "+proj=pipeline +step +proj=hgridshift +grids=@g_missing.tif +step +proj=vgridshift +grids=g_missing.tif +multiplier=1",
      }),
    ).toThrow(/needs g_missing\.tif, which is not loaded/);
  });

  it("does not require a missing optional grid", async () => {
    const P = await loadProj({ base, grids: GRIDS });
    const op = resolveOperation(P, source, "EPSG:4979", {
      pipeline: `+proj=pipeline +step +proj=vgridshift +grids=@not_a_loaded_grid.tif,@null +multiplier=1`,
    });
    expect(op.optionalGrids).toEqual(["not_a_loaded_grid.tif"]);
  });
});
