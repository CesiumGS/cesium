// EngineeringFrame's site transform and placement over a stub PROJ whose
// operation is the identity on (longitude, latitude, height) in degrees and
// metres, so the design coordinates are the geographic ones.
import { describe, expect, it } from "vitest";
import {
  EngineeringFrame,
  RigidPlacement,
  designPoint,
  type EngineeringFrameDefinition,
} from "../src/engineering/EngineeringFrame.ts";
import type { ProjApi } from "../src/engineering/projApi.ts";
import { EARTH } from "../src/scene/Body.ts";
import { Ellipsoid } from "../src/math/ellipsoid.ts";

const stub = (metersPerUnit = 1): ProjApi =>
  ({
    proj_create: () => ({}),
    proj_get_name: () => "stub",
    proj_as_proj_string: () => "+proj=noop",
    proj_get_type: () => 0,
    PJ_TYPE_COMPOUND_CRS: 1,
    PJ_FWD: 1,
    PJ_INV: -1,
    proj_crs_get_coordinate_system: () => ({}),
    proj_cs_get_axis_count: () => 2,
    proj_cs_get_axis_info: () => ({
      unit_name: "stub unit",
      unit_conv_factor: metersPerUnit,
    }),
    proj_coord: (x: number, y: number, z: number, t: number) => ({
      v: [x, y, z, t],
    }),
    proj_trans: (_: unknown, __: unknown, c: { v: number[] }) => c,
  }) as unknown as ProjApi;

const definition = (
  extra: Partial<EngineeringFrameDefinition> = {},
): EngineeringFrameDefinition => ({
  name: "stub",
  body: EARTH,
  crs: { format: "wkid", authority: "EPSG", wkid: 4326 },
  pipeline: "+proj=noop",
  ...extra,
});

describe("EngineeringFrame site transform (R6)", () => {
  it("rotates counterclockwise from grid east and scales: (1,0,0) at 90 degrees, s = 2", () => {
    const frame = EngineeringFrame.create(
      definition({
        site: { origin: [10, 20, 5], rotation: Math.PI / 2, scale: 2 },
      }),
      stub(),
    );
    const p = frame.projected([1, 0, 0]);
    expect(p[0]).toBeCloseTo(10, 12);
    expect(p[1]).toBeCloseTo(22, 12);
    expect(p[2]).toBe(5);
    // Height is not scaled.
    expect(frame.projected([0, 0, 7])[2]).toBe(12);
  });

  it("round trips exactly, in both directions", () => {
    const frame = EngineeringFrame.create(
      definition({
        site: {
          origin: [6_000_000, 2_100_000, 3],
          rotation: (12.5 * Math.PI) / 180,
          scale: 1.0000375,
        },
      }),
      stub(),
    );
    for (const design of [
      [0, 0, 0],
      [50_000, -30_000, 12],
      [-1e5, 7.5e4, -3],
    ]) {
      const back = frame.fromProjected(frame.projected(design));
      for (let i = 0; i < 3; i++) {
        expect(Math.abs(back[i]! - design[i]!)).toBeLessThan(1e-9);
      }
    }
    const projected = [6_050_000, 2_130_000, 9];
    const there = frame.projected(frame.fromProjected(projected));
    for (let i = 0; i < 3; i++) {
      expect(Math.abs(there[i]! - projected[i]!)).toBeLessThan(1e-9);
    }
  });

  it("without a site, design coordinates are the CRS's", () => {
    const frame = EngineeringFrame.create(definition(), stub());
    expect(Array.from(frame.projected([1, 2, 3]))).toEqual([1, 2, 3]);
    expect(Array.from(frame.fromProjected([1, 2, 3]))).toEqual([1, 2, 3]);
  });

  it("rejects a site scale that is not positive", () => {
    expect(() =>
      EngineeringFrame.create(
        definition({ site: { origin: [0, 0, 0], rotation: 0, scale: 0 } }),
        stub(),
      ),
    ).toThrow(/scale/);
  });
});

describe("EngineeringFrame body and geodetic chain", () => {
  it("places a design point on the body's ellipsoid and back", () => {
    const frame = EngineeringFrame.create(definition(), stub());
    const p = frame.toBodyFixed([-75, 40, 100]);
    const g = frame.toGeodetic([-75, 40, 100]);
    expect(g.longitude).toBeCloseTo((-75 * Math.PI) / 180, 14);
    expect(g.latitude).toBeCloseTo((40 * Math.PI) / 180, 14);
    expect(g.height).toBe(100);
    const back = frame.fromBodyFixed(p);
    expect(Math.abs(back[0]! + 75)).toBeLessThan(1e-9);
    expect(Math.abs(back[1]! - 40)).toBeLessThan(1e-9);
    expect(Math.abs(back[2]! - 100)).toBeLessThan(1e-6);
  });

  it("throws for a body with no geographic CRS, naming it", () => {
    const mars = {
      name: "Mars",
      ellipsoid: new Ellipsoid(3396190, 3396190, 3376200),
    };
    expect(() =>
      EngineeringFrame.create(definition({ body: mars }), stub()),
    ).toThrow(/Mars/);
  });

  it("takes units from the CRS", () => {
    const frame = EngineeringFrame.create(definition(), stub(0.3048));
    expect(frame.units.metersPerUnit).toBe(0.3048);
    expect(frame.units.horizontalUnitName).toBe("stub unit");
  });

  it("makes a design point carrying its frame", () => {
    const frame = EngineeringFrame.create(definition(), stub());
    const source = [1, 2];
    const point = designPoint(frame, source);
    expect(point.engineeringFrame).toBe(frame);
    expect(Array.from(point.design)).toEqual([1, 2, 0]);
    source[0] = 9;
    expect(point.design[0]).toBe(1);
  });
});

describe("RigidPlacement over the stub", () => {
  it("is exact at the anchor, inverts exactly, and its matrix agrees", () => {
    const frame = EngineeringFrame.create(definition(), stub(2));
    const anchor = [-75, 40, 10];
    const placement = RigidPlacement.at(frame, anchor);
    const at = placement.toBodyFixed(anchor);
    const exact = frame.toBodyFixed(anchor);
    for (let i = 0; i < 3; i++) {
      expect(Math.abs(at[i]! - exact[i]!)).toBeLessThan(1e-6);
    }
    const design = [anchor[0]! + 2000, anchor[1]! - 1500, anchor[2]! + 30];
    const back = placement.fromBodyFixed(placement.toBodyFixed(design));
    for (let i = 0; i < 3; i++) {
      expect(Math.abs(back[i]! - design[i]!)).toBeLessThan(1e-6);
    }
    const m = placement.matrix;
    const viaMatrix = [0, 1, 2].map(
      (r) =>
        m[r]! * design[0]! +
        m[4 + r]! * design[1]! +
        m[8 + r]! * design[2]! +
        m[12 + r]!,
    );
    const direct = placement.toBodyFixed(design);
    for (let i = 0; i < 3; i++) {
      expect(Math.abs(viaMatrix[i]! - direct[i]!)).toBeLessThan(1e-6);
    }
  });
});
