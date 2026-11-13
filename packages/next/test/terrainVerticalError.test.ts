// A terrain tile's error under a height profile is vertical: seen at most by
// sin θ, θ the angle between the view ray and the local up (`tileWarp.ts`).
import { describe, expect, it } from "vitest";
import {
  sinThetaMax,
  terrainDrawnError,
  type DrawnTile,
} from "../src/streaming/tileWarp.ts";
import type { Tile } from "../src/streaming/Tile.ts";
import { at } from "./terrainRayFixtures.ts";

const LON = 0.3;
const LAT = 0.2;
const rectangle = {
  west: LON - 0.0005,
  east: LON + 0.0005,
  south: LAT - 0.0005,
  north: LAT + 0.0005,
};
const centre = at(LON, LAT, 0);
const sphere = { center: centre, radius: 4000 };
const key = {};

const tile = (error: number) =>
  ({ geometricError: error, globe: { rectangle } }) as unknown as Tile;
const drawn = (extra: Partial<DrawnTile>): DrawnTile =>
  ({
    volume: { kind: "sphere", sphere },
    sigmaMax: 10,
    fit: 0,
    ...extra,
  }) as DrawnTile;

describe("direction-aware vertical error", () => {
  const distance = 200_000;
  const above = at(LON, LAT, distance);
  // Level with the tile, along the local east.
  const east = [-Math.sin(LON), Math.cos(LON), 0];
  const beside = Float64Array.from(
    [0, 1, 2].map((i) => centre[i]! + east[i]! * distance),
  );

  it("sees a top-down view far smaller than an edge-on one", () => {
    const top = sinThetaMax(above, sphere, rectangle, key);
    const edge = sinThetaMax(beside, sphere, rectangle, key);
    expect(top).toBeLessThan(0.05);
    expect(edge).toBeGreaterThan(0.99);
    const warped = drawn({ slopeMax: 10 });
    const a = terrainDrawnError(tile(100), warped, above);
    const b = terrainDrawnError(tile(100), warped, beside);
    expect(a).toBeLessThan(b / 20);
    expect(b).toBeLessThanOrEqual(100 * 10 + 1e-9);
  });

  it("is conservative: never below the sampled sin θ over the tile", () => {
    const view = Float64Array.from([
      centre[0]! + 30_000,
      centre[1]! + 40_000,
      centre[2]! + 20_000,
    ]);
    const bound = sinThetaMax(view, sphere, rectangle, {});
    let worst = 0;
    for (let i = 0; i <= 8; i++) {
      for (let j = 0; j <= 8; j++) {
        const lon =
          rectangle.west + ((rectangle.east - rectangle.west) * i) / 8;
        const lat =
          rectangle.south + ((rectangle.north - rectangle.south) * j) / 8;
        const p = at(lon, lat, 0);
        const d = [0, 1, 2].map((k) => p[k]! - view[k]!);
        const n = [
          Math.cos(lat) * Math.cos(lon),
          Math.cos(lat) * Math.sin(lon),
          Math.sin(lat),
        ];
        const len = Math.hypot(...d);
        const dot = (d[0]! * n[0]! + d[1]! * n[1]! + d[2]! * n[2]!) / len;
        worst = Math.max(worst, Math.sqrt(1 - dot * dot));
      }
    }
    expect(bound).toBeGreaterThanOrEqual(worst - 1e-12);
  });

  it("is 1 with the viewer inside the tile's sphere", () => {
    expect(sinThetaMax(centre, sphere, rectangle, {})).toBe(1);
  });

  it("without a height profile, is the isotropic σ_max formula as before", () => {
    const plain = drawn({ fit: 2 });
    expect(terrainDrawnError(tile(100), plain, above)).toBe(100 * 10 + 2);
    expect(terrainDrawnError(tile(100), plain, beside)).toBe(100 * 10 + 2);
  });
});
