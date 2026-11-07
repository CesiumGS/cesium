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
    { name: "A", accuracy: 1.14, missingGrids: ["a.tif"] },
    { name: "B", accuracy: 2.015, missingGrids: ["b.tif"] },
    { name: "C", accuracy: 3, missingGrids: ["c.tif"] },
    { name: "D", missingGrids: ["d.tif"] },
  ];

  it("keeps only a strictly smaller stated accuracy: not an equal, larger or unstated one", () => {
    expect(betterThan(2.015, skipped).map((c) => c.name)).toEqual(["A"]);
    expect(betterThan(1, skipped)).toEqual([]);
  });

  it("keeps every one, in PROJ's order, when the chosen operation states none", () => {
    expect(betterThan(undefined, skipped).map((c) => c.name)).toEqual([
      "A",
      "B",
      "C",
      "D",
    ]);
  });
});
