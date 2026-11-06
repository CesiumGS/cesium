// resolveOperation's error reporting, over a stub PROJ (no data needed).
import { describe, expect, it } from "vitest";
import { resolveOperation } from "../src/engineering/crs.ts";
import type { ProjApi } from "../src/engineering/projApi.ts";

const ref = { format: "wkid", authority: "EPSG", wkid: 2227 } as const;

const stub = (operations: () => unknown): ProjApi =>
  ({
    proj_create: () => ({}),
    proj_get_name: () => "candidate A",
    proj_as_proj_string: () => null,
    proj_normalize_for_visualization: (o: unknown) => o,
    proj_create_operation_factory_context: () => ({}),
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
