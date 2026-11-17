// Plan 5c, Task 1: tile volumes and horizon culling on a body's ellipsoid.
import { describe, expect, it } from "vitest";
import Cartesian3 from "cesium-oracle/Cartesian3.js";
import Ellipsoid from "cesium-oracle/Ellipsoid.js";
import OrientedBoundingBox from "cesium-oracle/OrientedBoundingBox.js";
import Rectangle from "cesium-oracle/Rectangle.js";
import { Ellipsoid as NextEllipsoid } from "../src/math/ellipsoid.ts";
import {
  aboveHorizon,
  obbFromRectangle,
  regionFromJson,
  sphereFromObb,
  volumeFromJson,
  volumeOccludee,
  type TileVolume,
} from "../src/streaming/volumes.ts";

const MOON_RADIUS = 1_737_400;
const tileOf = (volume: TileVolume) => ({ volume });
const regionTile = (json: number[], ellipsoid = NextEllipsoid.MOON) => {
  const region = regionFromJson(json, ellipsoid);
  return tileOf({ kind: "region", region, sphere: sphereFromObb(region.obb) });
};

describe("volumes and horizon culling on a body's ellipsoid", () => {
  it("WGS 84 is the default: today's volumes, occludees and horizon tests exactly", () => {
    const json = [0.2, -0.3, 0.45, 0.1, -50, 1200];
    const r = regionFromJson(json);
    expect(r).toEqual(regionFromJson(json, NextEllipsoid.WGS84));
    const volume: TileVolume = {
      kind: "region",
      region: r,
      sphere: sphereFromObb(r.obb),
    };
    expect(volumeOccludee(volume)).toEqual(
      volumeOccludee(volume, NextEllipsoid.WGS84),
    );
    for (const eye of [
      Float64Array.of(2e7, 1e6, 3e6),
      Float64Array.of(-2e7, 1e6, 3e6),
      Float64Array.of(6_400_000, 100_000, 0),
    ]) {
      expect(aboveHorizon(tileOf(volume), eye)).toBe(
        aboveHorizon(tileOf(volume), eye, NextEllipsoid.WGS84),
      );
    }
  });

  it("an OBB on the Moon matches 1.x's on Ellipsoid.MOON", () => {
    for (const r of [
      [0, 0, 0.1, 0.1, 0, 1000],
      [-0.4, 0.2, -0.1, 0.9, -500, 4000],
      [1, -0.8, 1.3, -0.2, 0, 9000],
      [2.5, -0.3, 5.9, 0.4, -9000, 10_000],
      [0.1, 0.3, 3.9, 1.2, 0, 800],
    ] as const) {
      const ours = obbFromRectangle(
        r[0],
        r[1],
        r[2],
        r[3],
        r[4],
        r[5],
        NextEllipsoid.MOON,
      );
      const theirs = OrientedBoundingBox.fromRectangle(
        new Rectangle(r[0], r[1], r[2], r[3]),
        r[4],
        r[5],
        Ellipsoid.MOON,
      );
      const center = Cartesian3.pack(theirs.center, []);
      for (let k = 0; k < 3; k++) {
        expect(ours.center[k]).toBeCloseTo(center[k]!, 5);
      }
      for (let k = 0; k < 9; k++) {
        expect(ours.halfAxes[k]).toBeCloseTo(theirs.halfAxes[k]!, 5);
      }
    }
  });

  it("reads a region on the Moon's sphere", () => {
    const r = regionFromJson([0, 0, 0.1, 0.1, 0, 1000], NextEllipsoid.MOON);
    expect(Math.hypot(...r.southwestCorner)).toBeCloseTo(MOON_RADIUS, 6);
    const volume = volumeFromJson(
      { region: [0, 0, 0.1, 0.1, 0, 1000] },
      new Float64Array(16),
      NextEllipsoid.MOON,
    );
    expect(volume?.kind).toBe("region");
    if (volume?.kind === "region") {
      expect(Math.hypot(...volume.region.southwestCorner)).toBeCloseTo(
        MOON_RADIUS,
        6,
      );
    }
  });

  it("culls the Moon's far side against the Moon's limb", () => {
    const far = regionTile([Math.PI - 0.1, -0.1, Math.PI, 0.1, 0, 1000]);
    const near = regionTile([-0.1, -0.1, 0.1, 0.1, 0, 1000]);
    const eye = Float64Array.of(MOON_RADIUS + 10_000_000, 0, 0);
    expect(aboveHorizon(far, eye, NextEllipsoid.MOON)).toBe(false);
    expect(aboveHorizon(near, eye, NextEllipsoid.MOON)).toBe(true);
  });

  it("an eye below the Moon's ellipsoid culls nothing it can see", () => {
    // Review Focus 1: 500 m under the surface, the tile overhead, and one
    // whose own floor is below the eye. (As in 1.x, a tile far to the side
    // is below the eye's plane and is culled: the crust hides it anyway.)
    const eye = Float64Array.of(MOON_RADIUS - 500, 0, 0);
    const overhead = regionTile([-0.001, -0.001, 0.001, 0.001, 0, 100]);
    const deep = regionTile([-0.01, -0.01, 0.01, 0.01, -2000, 100]);
    for (const tile of [overhead, deep]) {
      expect(aboveHorizon(tile, eye, NextEllipsoid.MOON)).toBe(true);
    }
  });
});
