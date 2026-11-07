// Structured PROJ pipelines: parsing, formatting and grids (no PROJ needed).
import { describe, expect, it } from "vitest";
import {
  formatPipeline,
  parsePipeline,
  pipelineGrids,
  pipelineVerticalGrids,
  pipelineVerticalShifts,
} from "../src/engineering/pipeline.ts";

const TWO_GRIDS =
  "+proj=pipeline +step +proj=hgridshift +grids=@a.tif,b.tif +step +proj=vgridshift +geoidgrids=us_noaa_g2018u0.tif +multiplier=1";

describe("pipelineGrids", () => {
  it("finds grids and geoid grids in every step, with optional ones marked", () => {
    expect(pipelineGrids(parsePipeline(TWO_GRIDS))).toEqual([
      { name: "a.tif", optional: true, key: "grids" },
      { name: "b.tif", optional: false, key: "grids" },
      { name: "us_noaa_g2018u0.tif", optional: false, key: "geoidgrids" },
    ]);
  });

  it("reads a deformation's or an xyzgridshift's +xy_grids and +z_grids", () => {
    expect(
      pipelineGrids(
        parsePipeline(
          "+proj=deformation +xy_grids=a.tif +z_grids=@b.tif +dt=1",
        ),
      ),
    ).toEqual([
      { name: "a.tif", optional: false, key: "xy_grids" },
      { name: "b.tif", optional: true, key: "z_grids" },
    ]);
  });

  it("drops PROJ's null grid and reads nadgrids", () => {
    const grids = pipelineGrids(
      parsePipeline("+proj=hgridshift +nadgrids=@null,conus"),
    );
    expect(grids).toEqual([
      { name: "conus", optional: false, key: "nadgrids" },
    ]);
  });

  it("reads a tinshift's +file (a catalog .json entry)", () => {
    const grids = pipelineGrids(
      parsePipeline(
        "+proj=pipeline +step +proj=axisswap +order=2,1 +step +proj=tinshift +file=fi_nls_ykj_etrs35fin.json +step +proj=axisswap +order=2,1",
      ),
    );
    expect(grids).toEqual([
      { name: "fi_nls_ykj_etrs35fin.json", optional: false, key: "file" },
    ]);
  });

  it("reads a defmodel's +model (a catalog .json entry)", () => {
    const grids = pipelineGrids(
      parsePipeline(
        "+proj=pipeline +step +proj=cart +ellps=GRS80 +step +proj=defmodel +model=nz_linz_nzgd2000-20180701.json +step +inv +proj=cart +ellps=GRS80",
      ),
    );
    expect(grids).toEqual([
      { name: "nz_linz_nzgd2000-20180701.json", optional: false, key: "model" },
    ]);
  });
});

describe("pipelineVerticalGrids", () => {
  it("is a vgridshift's grids and any geoidgrids, once each: not a horizontal or 3D shift's", () => {
    expect(pipelineVerticalGrids(parsePipeline(TWO_GRIDS))).toEqual([
      "us_noaa_g2018u0.tif",
    ]);
    const nadcon5 =
      "+proj=pipeline +step +inv +proj=gridshift +no_z_transform +grids=n5.tif +step +proj=vgridshift +grids=us_noaa_g1999u05.tif,@b.tif +multiplier=1 +step +proj=hgridshift +grids=h.tif +step +inv +proj=vgridshift +grids=us_noaa_g1999u05.tif";
    expect(pipelineVerticalGrids(parsePipeline(nadcon5))).toEqual([
      "us_noaa_g1999u05.tif",
      "b.tif",
    ]);
    expect(
      pipelineVerticalGrids(
        parsePipeline("+proj=pipeline +step +proj=hgridshift +grids=h.tif"),
      ),
    ).toEqual([]);
  });
});

describe("pipelineVerticalShifts", () => {
  it("keys each vertical grid by its step's +inv and +multiplier", () => {
    const shifts = (text: string) =>
      pipelineVerticalShifts(parsePipeline(text));
    const g = "us_noaa_g2018u0.tif";
    expect(
      shifts(`+proj=pipeline +step +proj=vgridshift +grids=${g} +multiplier=1`),
    ).toEqual([`${g} x1`]);
    expect(shifts(`+proj=pipeline +step +proj=vgridshift +grids=${g}`)).toEqual(
      [`${g} x1`],
    );
    expect(
      shifts(
        `+proj=pipeline +step +inv +proj=vgridshift +grids=${g} +multiplier=1`,
      ),
    ).toEqual([`inv ${g} x1`]);
    expect(
      shifts(
        `+proj=pipeline +step +proj=vgridshift +grids=${g} +multiplier=-1`,
      ),
    ).toEqual([`${g} x-1`]);
    expect(
      shifts("+proj=pipeline +step +proj=hgridshift +grids=h.tif"),
    ).toEqual([]);
  });
});

describe("parsePipeline", () => {
  it("reads a pipeline into steps, inverse flags and globals", () => {
    expect(
      parsePipeline(
        "+proj=pipeline +ellps=GRS80 +step +inv +proj=utm +zone=11 +step +proj=noop",
      ),
    ).toEqual({
      globals: { ellps: "GRS80" },
      steps: [
        { operation: "utm", inverse: true, params: { zone: "11" } },
        { operation: "noop" },
      ],
    });
  });

  it("reads a lone operation as one step", () => {
    expect(parsePipeline("+proj=utm +zone=11 +south")).toEqual({
      steps: [{ operation: "utm", params: { zone: "11", south: true } }],
    });
  });

  it("throws on malformed input", () => {
    expect(() => parsePipeline("")).toThrow(/no \+proj|empty/);
    expect(() =>
      parsePipeline("+proj=pipeline +step +step +proj=noop"),
    ).toThrow(/empty/);
    expect(() => parsePipeline("+proj=pipeline")).toThrow(/no steps/);
    expect(() => parsePipeline("proj=utm +zone=11")).toThrow(/"proj=utm"/);
    expect(() => parsePipeline("+zone=11")).toThrow(/no \+proj/);
    expect(() => parsePipeline("+proj=utm +zone=1 +zone=2")).toThrow(/repeats/);
    expect(() => parsePipeline("+step +proj=utm")).toThrow(/pipeline/);
  });
});

describe("formatPipeline", () => {
  it("writes a pipeline and round-trips PROJ's spelling", () => {
    expect(formatPipeline(parsePipeline(TWO_GRIDS))).toBe(TWO_GRIDS);
    const withGlobals =
      "+proj=pipeline +ellps=GRS80 +step +inv +proj=utm +zone=11 +step +proj=unitconvert +xy_in=rad +xy_out=deg";
    expect(formatPipeline(parsePipeline(withGlobals))).toBe(withGlobals);
  });

  it("writes one step with no globals without the wrapper", () => {
    expect(
      formatPipeline({
        steps: [{ operation: "utm", params: { zone: "11", R: "1737400" } }],
      }),
    ).toBe("+proj=utm +zone=11 +R=1737400");
  });

  it("refuses a bad key or value, naming the token", () => {
    expect(() =>
      formatPipeline({
        steps: [{ operation: "utm", params: { zone: "1 1" } }],
      }),
    ).toThrow(/"1 1"/);
    expect(() =>
      formatPipeline({
        steps: [{ operation: "utm", params: { zone: "+1" } }],
      }),
    ).toThrow(/"\+1"/);
    expect(() =>
      formatPipeline({
        steps: [{ operation: "utm", params: { "z one": "1" } }],
      }),
    ).toThrow(/"z one"/);
    expect(() =>
      formatPipeline({ steps: [{ operation: "utm", params: { proj: "x" } }] }),
    ).toThrow(/\+proj/);
    expect(() => formatPipeline({ steps: [{ operation: "u tm" }] })).toThrow(
      /"u tm"/,
    );
    expect(() => formatPipeline({ steps: [] })).toThrow(/no steps/);
  });
});

describe("values come from an allowlist", () => {
  it("refuses a quote that would hide a step from PROJ, in both directions", () => {
    expect(() =>
      formatPipeline({
        steps: [
          { operation: "unitconvert", params: { title: '"x' } },
          { operation: "affine", params: { xoff: "1000", title: 'y"' } },
        ],
      }),
    ).toThrow(/"\\"x"/);
    expect(() =>
      parsePipeline(
        '+proj=pipeline +step +proj=unitconvert +title="x +step +proj=affine +xoff=1000 +title=y"',
      ),
    ).toThrow(/"x/);
    expect(() => parsePipeline("+proj=utm +zone=1;2")).toThrow(/1;2/);
  });

  it("refuses values that are not strings or true", () => {
    expect(() =>
      formatPipeline({
        steps: [
          { operation: "utm", params: { zone: 11 as unknown as string } },
        ],
      }),
    ).toThrow(/11/);
    expect(() =>
      formatPipeline({
        steps: [{ operation: "utm", params: { f: false as unknown as true } }],
      }),
    ).toThrow(/false/);
  });
});
