// resolveOperation's error reporting, over a stub PROJ (no data needed).
import { describe, expect, it } from "vitest";
import { betterThan, resolveOperation } from "../src/engineering/crs.ts";
import type { ProjApi } from "../src/engineering/projApi.ts";

const ref = { format: "wkid", authority: "EPSG", wkid: 2227 } as const;

const stub = (operations: () => unknown): ProjApi =>
  ({
    proj_create: () => ({}),
    // Quiet while listing (crs.ts lowers the log level, then restores it).
    proj_log_level: () => 0,
    PJ_LOG_NONE: 0,
    proj_get_name: () => "candidate A",
    proj_as_proj_string: () => null,
    proj_normalize_for_visualization: (o: unknown) => o,
    proj_create_operation_factory_context: () => ({}),
    proj_operation_factory_context_set_grid_availability_use: () => undefined,
    PROJ_GRID_AVAILABILITY_IGNORED: 2,
    proj_create_operations: operations,
    proj_coordoperation_get_grid_used_count: () => 0,
    proj_coordoperation_is_instantiable: () => true,
    proj_coordoperation_get_accuracy: () => 1,
    PJ_PROJ_5: 0,
  }) as unknown as ProjApi;

describe("resolveOperation errors", () => {
  it("attaches PROJ's error as the cause when the candidate list fails", () => {
    const failure = new Error("Error getting list");
    const proj = stub(() => {
      throw failure;
    });
    try {
      resolveOperation(proj, ref, "EPSG:4979");
      expect.unreachable();
    } catch (error) {
      expect((error as Error).message).toMatch(/no usable operation/);
      expect((error as Error).cause).toBe(failure);
    }
  });

  it("names candidates with no PROJ string in the final error", () => {
    const proj = stub(() => ({ length: () => 1, get: () => ({}) }));
    expect(() => resolveOperation(proj, ref, "EPSG:4979")).toThrow(
      /no usable operation from EPSG:2227 to EPSG:4979; candidate A could not be expressed as a PROJ string/,
    );
  });
});

describe("betterThan: which skipped candidates are better (Task 8 fix 1)", () => {
  const skipped = [
    { name: "A", accuracy: 1.14, missingGrids: ["a.tif"], verticalShifts: [] },
    { name: "B", accuracy: 2.015, missingGrids: ["b.tif"], verticalShifts: [] },
    { name: "C", accuracy: 3, missingGrids: ["c.tif"], verticalShifts: [] },
    { name: "D", missingGrids: ["d.tif"], verticalShifts: [] },
  ];
  const chosen = (accuracy: number | undefined) => ({
    accuracy,
    verticalShifts: [],
  });

  it("keeps only a strictly smaller stated accuracy: not an equal, larger or unstated one", () => {
    expect(betterThan(chosen(2.015), skipped).map((c) => c.name)).toEqual([
      "A",
    ]);
    expect(betterThan(chosen(1), skipped)).toEqual([]);
  });

  it("keeps every one, in PROJ's order, when the chosen operation states none", () => {
    expect(betterThan(chosen(undefined), skipped).map((c) => c.name)).toEqual([
      "A",
      "B",
      "C",
      "D",
    ]);
  });
});

describe("betterThan: a better candidate keeps the chosen operation's geoid", () => {
  const GEOID18 = "us_noaa_g2018u0.tif";
  const GEOID99 = "us_noaa_g1999u05.tif";
  const chosen = { accuracy: 2.015, verticalShifts: [GEOID18] };

  it("isn't better with another geoid grid and a smaller stated accuracy; is with the same grid", () => {
    const skipped = [
      {
        name: "other geoid",
        accuracy: 1.14,
        missingGrids: ["nadcon5.tif", GEOID99],
        verticalShifts: [GEOID99],
      },
      {
        name: "same geoid",
        accuracy: 1.14,
        missingGrids: ["nadcon5.tif"],
        verticalShifts: [GEOID18],
      },
    ];
    expect(betterThan(chosen, skipped).map((c) => c.name)).toEqual([
      "same geoid",
    ]);
  });

  it("isn't better with no geoid grid where the chosen reads one, or with one where it reads none", () => {
    const none = {
      name: "none",
      accuracy: 1,
      missingGrids: ["a.tif"],
      verticalShifts: [],
    };
    expect(betterThan(chosen, [none])).toEqual([]);
    expect(
      betterThan({ accuracy: 2, verticalShifts: [] }, [
        { ...none, verticalShifts: [GEOID18] },
      ]),
    ).toEqual([]);
  });

  it("compares the grids as a set, and never keeps a ballpark", () => {
    const two = { accuracy: 2, verticalShifts: ["x.tif", "y.tif"] };
    const reordered = {
      name: "reordered",
      accuracy: 1,
      missingGrids: ["h.tif"],
      verticalShifts: ["y.tif", "x.tif"],
    };
    expect(betterThan(two, [reordered]).map((c) => c.name)).toEqual([
      "reordered",
    ]);
    expect(betterThan(two, [{ ...reordered, ballpark: true }])).toEqual([]);
  });

  it("for a ballpark chosen, which has no geoid to keep, keeps every non-ballpark candidate whatever its geoid", () => {
    const skipped = [
      {
        name: "GEOID99",
        accuracy: 1.14,
        missingGrids: ["a.tif"],
        verticalShifts: [GEOID99],
      },
      {
        name: "GEOID18",
        accuracy: 2.015,
        missingGrids: ["b.tif"],
        verticalShifts: [GEOID18],
      },
      { name: "unstated", missingGrids: ["c.tif"], verticalShifts: [] },
      {
        name: "ballpark",
        missingGrids: ["d.tif"],
        verticalShifts: [],
        ballpark: true,
      },
    ];
    expect(
      betterThan(
        { accuracy: undefined, ballpark: true, verticalShifts: [] },
        skipped,
      ).map((c) => c.name),
    ).toEqual(["GEOID99", "GEOID18", "unstated"]);
  });

  it("with no stated accuracy for the chosen, still keeps only the same geoid", () => {
    const skipped = [
      { name: "other", missingGrids: ["a.tif"], verticalShifts: [GEOID99] },
      { name: "same", missingGrids: ["b.tif"], verticalShifts: [GEOID18] },
    ];
    expect(
      betterThan(
        { accuracy: undefined, verticalShifts: [GEOID18] },
        skipped,
      ).map((c) => c.name),
    ).toEqual(["same"]);
  });
});
