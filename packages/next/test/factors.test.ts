// gridFactors rejects PROJ's non-answers (plan 4a task 4), with a stub PROJ:
// PROJ's coordinate service's factors (projGridFactors), through a frame.
import { describe, expect, it } from "vitest";
import type { EngineeringFrame } from "../src/engineering/EngineeringFrame.ts";
import { gridFactors, projGridFactors } from "../src/engineering/factors.ts";
import type { ProjApi } from "../src/engineering/projApi.ts";

function stubFrame(factors: Record<string, number>): EngineeringFrame {
  const object = {};
  const proj = {
    PJ_INV: 1,
    PJ_PROJ_5: 1,
    PJ_TYPE_COMPOUND_CRS: 1,
    proj_create: () => object,
    proj_get_name: () => "stub CRS",
    proj_get_type: () => 0,
    proj_crs_get_coordoperation: () => object,
    proj_normalize_for_visualization: () => object,
    proj_coordoperation_get_method_info: () => ({
      method_name: "Mercator (variant A)",
      method_auth_name: "EPSG",
      method_code: "9804",
    }),
    proj_crs_get_geodetic_crs: () => object,
    proj_get_ellipsoid: () => object,
    proj_ellipsoid_get_parameters: () => ({
      semi_major_metre: 6378137,
      semi_minor_metre: 6356752.314140356,
    }),
    proj_coord: (x: number, y: number) => ({ v: [x, y, 0, 0] }),
    proj_trans: () => ({ v: [0.1, 0.2, 0, 0] }),
    proj_factors: () => factors,
  } as unknown as ProjApi;
  return {
    coordinates: {
      gridFactors: projGridFactors(
        proj,
        { format: "wkid", authority: "EPSG", wkid: 3395 },
        1,
        () => 0,
      ),
    },
    projected: () => new Float64Array([1, 2, 0]),
  } as unknown as EngineeringFrame;
}

describe("gridFactors at a singular point", () => {
  const good = {
    parallel_scale: 1.0001,
    meridional_scale: 1.0001,
    meridian_convergence: 0.01,
  };
  it("passes valid factors through", () => {
    expect(gridFactors(stubFrame(good), [1, 2, 0]).pointScale).toBe(1.0001);
  });
  it("throws for zero scale, non-finite scale and non-finite convergence", () => {
    for (const bad of [
      { ...good, parallel_scale: 0 },
      { ...good, parallel_scale: Number.NaN },
      { ...good, parallel_scale: -1 },
      { ...good, meridian_convergence: Number.POSITIVE_INFINITY },
    ]) {
      expect(() => gridFactors(stubFrame(bad), [1, 2, 0])).toThrow(RangeError);
    }
  });
});
