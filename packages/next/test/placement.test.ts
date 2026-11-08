// TilesetPlacement over the stub PROJ (plan 4b task 10): a depth-positive
// height axis goes through RigidPlacement's down column.
import { describe, expect, it } from "vitest";
import { EngineeringFrame } from "../src/engineering/EngineeringFrame.ts";
import {
  engineeringPlacement,
  placeRigid,
} from "../src/engineering/placement.ts";
import type { ProjApi } from "../src/engineering/projApi.ts";
import { EARTH } from "../src/scene/Body.ts";

const stub = (): ProjApi =>
  ({
    proj_create: () => ({}),
    proj_get_name: () => "stub",
    proj_as_proj_string: () => "+proj=noop",
    proj_get_type: () => 2,
    PJ_TYPE_PROJECTED_CRS: 2,
    PJ_TYPE_COMPOUND_CRS: 1,
    PJ_FWD: 1,
    PJ_INV: -1,
    proj_crs_get_coordinate_system: () => ({}),
    proj_cs_get_axis_count: () => 3,
    proj_cs_get_axis_info: (_: unknown, index: number) => ({
      unit_name: "stub unit",
      unit_conv_factor: index === 2 ? 0.3048 : 1,
      direction: index === 2 ? "down" : index === 0 ? "east" : "north",
    }),
    proj_coord: (x: number, y: number, z: number, t: number) => ({
      v: [x, y, z, t],
    }),
    proj_trans: (_: unknown, __: unknown, c: { v: number[] }) => c,
  }) as unknown as ProjApi;

describe("placeRigid with a depth axis", () => {
  it("draws design depth +10 below the anchor and inverts it", () => {
    const frame = EngineeringFrame.create(
      {
        name: "d",
        body: EARTH,
        crs: { format: "wkid", authority: "EPSG", wkid: 4326 },
        pipeline: "+proj=noop",
      },
      stub(),
    );
    const p = placeRigid(frame, [0, 0, 0]);
    const o = p.displayed([0, 0, 0]);
    const deep = p.displayed([0, 0, 10]);
    const up = EARTH.ellipsoid.geodeticSurfaceNormal(o, new Float64Array(3))!;
    const along =
      (deep[0]! - o[0]!) * up[0]! +
      (deep[1]! - o[1]!) * up[1]! +
      (deep[2]! - o[2]!) * up[2]!;
    expect(along).toBeCloseTo(-3.048, 9);
    expect(p.designOf(deep)[2]).toBeCloseTo(10, 6);
  });
});

describe("engineeringPlacement", () => {
  const draws = {
    mode: "reprojected" as const,
    frameName: "site",
    displayed: (d: ArrayLike<number>) => Float64Array.from(d),
    designOf: (p: ArrayLike<number>) => Float64Array.from(p),
    displayError: () => 0,
  };

  it("is the placement itself when its frame is an EngineeringFrame", () => {
    const frame = Object.create(EngineeringFrame.prototype) as EngineeringFrame;
    const placement = { ...draws, frame };
    expect(engineeringPlacement(placement)).toBe(placement);
  });

  it("is undefined for no placement, no frame, or a frame of another kind", () => {
    expect(engineeringPlacement(undefined)).toBeUndefined();
    expect(engineeringPlacement(draws)).toBeUndefined();
    const lookalike = { ...draws, frame: { name: "site" } };
    expect(engineeringPlacement(lookalike)).toBeUndefined();
  });
});
