// Rays against a tileset's retained geometry (frames 5b, Task 8), clipped to
// the body's terrain band. Tiles are plain objects with the fields a ray reads.
import { describe, expect, it } from "vitest";
import {
  castTilesetRays,
  type RayTile,
  type RayTileset,
} from "../src/query/geometryBackend.ts";
import type { QueryRay } from "../src/query/queries.ts";
import { MOON } from "../src/scene/Body.ts";
import {
  obb,
  sphereFromObb,
  type TileVolume,
} from "../src/streaming/volumes.ts";

const R = 1_737_400;
const BAND = MOON.terrainBand!;
const options = { band: BAND, ellipsoid: MOON.ellipsoid };

/** A box volume of half-size `h` about `c`. */
function box(c: [number, number, number], h: number): TileVolume {
  const o = obb(
    Float64Array.from(c),
    Float64Array.from([h, 0, 0, 0, h, 0, 0, 0, h]),
  );
  return { kind: "box", obb: o, sphere: sphereFromObb(o) };
}

/** A flat triangle fan: a horizontal square of half-size `h` at height `z` over x = R. */
function slab(z: number, h: number): RayTile["geometry"] {
  // A square in the plane x = R + z, spanning y and z in [-h, h].
  const positions = Float32Array.from([0, -h, -h, 0, h, -h, 0, h, h, 0, -h, h]);
  return [
    {
      positions,
      indices: Uint32Array.from([0, 1, 2, 0, 2, 3]),
      matrix: Float64Array.from([
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        R + z,
        0,
        0,
        1,
      ]),
    },
  ];
}

function tile(overrides: Partial<RayTile> & Pick<RayTile, "volume">): RayTile {
  return {
    children: [],
    viewMask: 1,
    standInMask: 0,
    geometricError: 0,
    ...overrides,
  };
}
const tileset = (root: RayTile, retainGeometry = true): RayTileset => ({
  retainGeometry,
  root,
});

/** A ray along +X over the tile, from `x0` to `x1` (anchor coordinates). */
const along = (x0: number, x1: number, y = 0): QueryRay => ({
  from: [x0, y, 0],
  to: [x1, y, 0],
});

describe("castTilesetRays", () => {
  const drawn = (error = 0) =>
    tileset(
      tile({
        volume: box([R, 0, 0], 20_000),
        geometry: slab(0, 5_000),
        geometricError: error,
      }),
    );

  it("a ray into a drawn tile's triangle is blocked at the analytic hit", () => {
    const [a] = castTilesetRays(
      drawn(),
      [along(R + 3_000, R - 3_000)],
      options,
    );
    expect(a!.verdict).toBe("blocked");
    expect(a!.hit!.position[0]).toBeCloseTo(R, 6);
    expect(a!.hit!.t).toBeCloseTo(0.5, 12);
    expect(a!.unknown).toEqual([]);
  });

  it("a ray 0.5 m above a tile whose geometric error is 2 m is unknown, withinError; 5 m above, clear", () => {
    // A ray along the slab's plane, 0.5 m above it: it never crosses it.
    const ray = (above: number): QueryRay => ({
      from: [R + above, -3_000, 0],
      to: [R + above, 3_000, 0],
    });
    const [near, far] = castTilesetRays(drawn(2), [ray(0.5), ray(5)], options);
    expect(near!.verdict).toBe("unknown");
    expect(near!.unknown.map((u) => u.reason)).toContain("withinError");
    expect(far!.verdict).toBe("clear");
    expect(near!.accuracy.meters).toBe(2);
  });

  it("a ray across a span with no drawn tile is unknown, notLoaded; across a stand-in tile, notRefined", () => {
    const undrawn = tileset(
      tile({
        volume: box([R, 0, 0], 20_000),
        geometry: slab(0, 5_000),
        viewMask: 0,
      }),
    );
    // Along the slab's plane, away from its triangles, inside the root.
    const flat: QueryRay = {
      from: [R + 100, -3_000, 0],
      to: [R + 100, 3_000, 0],
    };
    const [a] = castTilesetRays(undrawn, [flat], options);
    expect(a!.verdict).toBe("unknown");
    expect(a!.unknown.map((u) => u.reason)).toEqual(["notLoaded"]);
    const standIn = tileset(
      tile({
        volume: box([R, 0, 0], 20_000),
        geometry: slab(0, 5_000),
        standInMask: 1,
      }),
    );
    const [b] = castTilesetRays(standIn, [flat], options);
    expect(b!.verdict).toBe("unknown");
    expect(b!.unknown.map((u) => u.reason)).toContain("notRefined");
  });

  it("a ray from a site to the Earth leaves the band: clear above it, only the span below undecided", () => {
    // From 30 km up, in to 5 km up: above 10.8 km the band says clear; the
    // span below, with no drawn tile there, is notLoaded.
    const ray = along(R + 30_000, R + 5_000, 50_000);
    const [a] = castTilesetRays(
      tileset(tile({ volume: box([R, 50_000, 0], 20_000), viewMask: 0 })),
      [ray],
      options,
    );
    expect(a!.verdict).toBe("unknown");
    for (const u of a!.unknown) {
      // Fractions of the segment: the first 25 km - 10.8 km of 25 km is clear.
      expect(u.from).toBeGreaterThan((30_000 - 10_800) / 25_000 - 0.02);
    }
    const above = castTilesetRays(
      drawn(),
      [along(R + 40_000, R + 20_000)],
      options,
    )[0]!;
    expect(above.verdict).toBe("clear");
  });

  it("a ray that dips below the lowest terrain is blocked there without tiles", () => {
    const [a] = castTilesetRays(
      tileset(tile({ volume: box([R, 0, 0], 20_000), viewMask: 0 })),
      [along(R + 5_000, R - 30_000)],
      options,
    );
    expect(a!.verdict).toBe("blocked");
    // The lower edge of the band is 9,200 m below the ellipsoid.
    expect(a!.hit!.position[0]).toBeCloseTo(R - 9_200, 3);
    expect(a!.accuracy.note).toMatch(/lowest terrain/);
  });

  it("a tileset without retained geometry answers unsupported", () => {
    const [a] = castTilesetRays(
      drawn(),
      [along(R + 100, R - 100)].slice(0, 1),
      options,
    );
    expect(a!.verdict).toBe("blocked");
    const [b] = castTilesetRays(
      tileset(drawn().root, false),
      [along(R + 100, R - 100)],
      options,
    );
    expect(b!.verdict).toBe("unknown");
    expect(b!.unknown[0]!.reason).toBe("unsupported");
    expect(b!.accuracy.note).toMatch(/retainGeometry/);
  });

  it("without a band every span the tiles don't cover is notLoaded", () => {
    const [a] = castTilesetRays(drawn(), [along(R + 50_000, R + 40_000)], {});
    expect(a!.verdict).toBe("unknown");
    expect(a!.unknown[0]!.reason).toBe("notLoaded");
  });
});
