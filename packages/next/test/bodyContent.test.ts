// Plan 5c, Task 2: clamping, heights, models, point sources and height
// captures take their body from their anchor. A model clamped under the
// Moon's anchor casts its rays there, on the Moon's ellipsoid, against the
// Moon's collision tilesets and never the globe; the Earth's are as before.
// The fake engine of test/fakeGpu.ts; tilesets are stubs as height clamping
// sees them (test/earthAnchor.test.ts).
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { GltfAsset } from "../src/io/gltfTypes.ts";
import { Ellipsoid, fromDegrees } from "../src/math/ellipsoid.ts";
import * as m4 from "../src/math/mat4.ts";
import * as v3 from "../src/math/vec3.ts";
import { EARTH, MOON } from "../src/scene/Body.ts";
import type { Engine } from "../src/scene/Engine.ts";
import type { World } from "../src/scene/World.ts";
import type { AnchorHandle } from "../src/scene/world/types.ts";
import type { Tileset3D } from "../src/streaming/Tileset3D.ts";
import { PointSource } from "../src/vector/PointSource.ts";
import { VectorLayer } from "../src/vector/VectorLayer.ts";
import { fakeEngine } from "./fakeGpu.ts";

const RAD = Math.PI / 180;
/** The place the tests stand on: 10° E, 20° N. */
const LON = 10 * RAD;
const LAT = 20 * RAD;

/** One triangle, one draw, the default material (as test/earthAnchor.test.ts). */
function triangle(): GltfAsset {
  return {
    meshes: [
      {
        positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
        indices: new Uint32Array([0, 1, 2]),
      },
    ],
    materials: [],
    textures: [],
    images: [],
    draws: [{ mesh: 0, material: -1, matrix: m4.mat4() }],
    featureTables: [],
    warnings: [],
  };
}

/** A tileset as height clamping and height samples use one. */
function stubTileset(
  world: World,
  anchor: AnchorHandle,
  url: string,
  options: { globe?: boolean } = {},
): Tileset3D {
  return {
    world,
    anchor,
    url,
    show: true,
    enableCollision: true,
    isGlobe: options.globe === true,
    changedAt: 1,
    onHeightsChanged: () => () => {},
    exactHeight: () => undefined,
    surfaceHeight: () => undefined,
    terrainClipped: () => false,
    // The globe's draws are slot 5.
    ownsDraw: (draw: number) => options.globe === true && draw === 5,
    queryRays: async () => ({ draws: [], release: () => {} }),
  } as unknown as Tileset3D;
}

/** The ray the plan describes: 10,000 m above the ellipsoid, down its normal. */
function expectedRay(ellipsoid: Ellipsoid, height = 10_000) {
  const at = { longitude: LON, latitude: LAT, height: 0 };
  const up = ellipsoid.geodeticSurfaceNormalCartographic(at, v3.vec3());
  return {
    origin: ellipsoid.cartographicToCartesian({ ...at, height }, v3.vec3()),
    direction: v3.negate(v3.vec3(), up),
  };
}

function expectClose(
  actual: ArrayLike<number>,
  expected: ArrayLike<number>,
  tolerance: number,
): void {
  expect(actual.length).toBe(expected.length);
  for (let i = 0; i < expected.length; i++) {
    expect(Math.abs(actual[i]! - expected[i]!)).toBeLessThanOrEqual(tolerance);
  }
}

let engine: Engine;
const added: Tileset3D[] = [];

beforeAll(async () => {
  engine = await fakeEngine();
});

afterEach(() => {
  for (const t of added.splice(0)) {
    engine.tilesets.splice(engine.tilesets.indexOf(t), 1);
  }
});

/**
 * Ticks the shared clamping past the interval between casts (it is the
 * engine's, so earlier tests count), in one synchronous run: the first tick
 * that may cast does, and the cast in flight holds the rest back.
 */
function updateClamping(): void {
  for (let i = 0; i < 12; i++) {
    engine.clamping.update();
  }
}

function addTileset(t: Tileset3D): Tileset3D {
  engine.tilesets.push(t);
  added.push(t);
  return t;
}

describe("clamping on a body", () => {
  it("a model clamped under the Moon's anchor casts from 10,000 m above the Moon's ellipsoid, against the Moon's tilesets, never the globe", () => {
    const world = engine.createWorld();
    const moon = world.bodyAnchor(MOON);
    const earth = world.bodyAnchor(EARTH);
    const cast = vi
      .spyOn(world, "castRays")
      .mockImplementation(async (rays) => rays.map(() => undefined));
    addTileset(stubTileset(world, moon, "https://tiles.test/moon.json"));
    addTileset(stubTileset(world, earth, "https://tiles.test/earth.json"));
    addTileset(
      stubTileset(world, earth, "https://tiles.test/globe.json", {
        globe: true,
      }),
    );
    const model = engine.uploadModel(world, triangle(), {
      releaseSourceData: false,
    });
    const placed = model.place({
      at: { longitude: 10, latitude: 20 },
      heightReference: "clampToGround",
      anchor: moon,
    });
    try {
      updateClamping();
      const clampCasts = cast.mock.calls.filter(([, o]) => o?.collisionOnly);
      expect(clampCasts).toHaveLength(1);
      const [rays, options] = clampCasts[0]!;
      expect(options).toMatchObject({ anchor: moon, collisionOnly: true });
      // The world's ground, whatever a view's clips show.
      expect(options?.clips).toBeUndefined();
      // The globe's draws stay out, whatever their collision flag.
      expect(options?.exclude?.(5)).toBe(true);
      expect(options?.exclude?.(6)).toBe(false);
      expect(rays).toHaveLength(1);
      const want = expectedRay(Ellipsoid.MOON);
      expectClose(rays[0]!.origin, want.origin, 1e-6);
      expectClose(rays[0]!.direction, want.direction, 1e-12);
      // Along the Moon's normal: the origin is the sphere's radius plus 10 km out.
      expect(v3.length(Array.from(rays[0]!.origin) as never)).toBeCloseTo(
        1_737_400 + 10_000,
        6,
      );
      // Its clamp is the Moon's.
      expect(placed.clamp?.options.anchor).toBe(moon);
    } finally {
      placed.remove();
      model.release();
    }
  });

  it("content on the Moon is not cast against an Earth collision tileset", () => {
    const world = engine.createWorld();
    const moon = world.bodyAnchor(MOON);
    const cast = vi
      .spyOn(world, "castRays")
      .mockImplementation(async (rays) => rays.map(() => undefined));
    addTileset(
      stubTileset(
        world,
        world.bodyAnchor(EARTH),
        "https://tiles.test/earth-only.json",
      ),
    );
    const model = engine.uploadModel(world, triangle(), {
      releaseSourceData: false,
    });
    const placed = model.place({
      at: { longitude: 10, latitude: 20 },
      heightReference: "clampToGround",
      anchor: moon,
    });
    try {
      updateClamping();
      expect(cast.mock.calls.filter(([, o]) => o?.collisionOnly)).toEqual([]);
    } finally {
      placed.remove();
      model.release();
    }
  });

  it("Earth content casts as before: in the Earth's anchor, on WGS 84", () => {
    const world = engine.createWorld();
    const earth = world.bodyAnchor(EARTH);
    const cast = vi
      .spyOn(world, "castRays")
      .mockImplementation(async (rays) => rays.map(() => undefined));
    addTileset(stubTileset(world, earth, "https://tiles.test/earth-a.json"));
    const model = engine.uploadModel(world, triangle(), {
      releaseSourceData: false,
    });
    const placed = model.place({
      at: { longitude: 10, latitude: 20 },
      heightReference: "clampToGround",
    });
    try {
      updateClamping();
      const [rays, options] = cast.mock.calls.find(
        ([, o]) => o?.collisionOnly,
      )!;
      expect(options?.anchor).toBe(earth);
      const want = expectedRay(Ellipsoid.WGS84);
      expectClose(rays[0]!.origin, want.origin, 1e-6);
      expectClose(rays[0]!.direction, want.direction, 1e-12);
    } finally {
      placed.remove();
      model.release();
    }
  });

  it("an anchor with no body refuses a height reference, naming it", () => {
    const world = engine.createWorld();
    const site = world.addAnchor("site");
    expect(() =>
      engine.clamping.add(world, world.addTransform(m4.mat4(), site), {
        heightReference: "clampToGround",
        longitude: 0,
        latitude: 0,
        height: 0,
        anchor: site,
      }),
    ).toThrow(/HeightClamping: site has no body/);
    // "none" is no clamp: it only keeps the place.
    const none = engine.clamping.add(
      world,
      world.addTransform(m4.mat4(), site),
      {
        heightReference: "none",
        longitude: 0,
        latitude: 0,
        height: 0,
        anchor: site,
      },
    );
    none.remove();
  });
});

describe("sampleHeightMostDetailed on a body", () => {
  it("casts in the Moon's anchor on the Moon's ellipsoid with a body", async () => {
    const world = engine.createWorld();
    const moon = world.bodyAnchor(MOON);
    const cast = vi
      .spyOn(world, "castRays")
      .mockImplementation(async (rays) => rays.map(() => undefined));
    const tiles = stubTileset(world, moon, "https://tiles.test/moon-s.json");
    await engine.sampleHeightMostDetailed(
      world,
      [{ longitude: LON, latitude: LAT }],
      { tilesets: [tiles], body: MOON },
    );
    expect(cast).toHaveBeenCalledTimes(1);
    const [rays, options] = cast.mock.calls[0]!;
    expect(options).toMatchObject({ anchor: moon });
    const want = expectedRay(Ellipsoid.MOON);
    expectClose(rays[0]!.origin, want.origin, 1e-6);
    expectClose(rays[0]!.direction, want.direction, 1e-12);
    expect(rays[0]!.maxDistance).toBe(22_000);
    // Tilesets under another body's anchor are refused, naming both.
    const earthTiles = stubTileset(
      world,
      world.bodyAnchor(EARTH),
      "https://tiles.test/earth-s.json",
    );
    await expect(
      engine.sampleHeightMostDetailed(world, [{ longitude: 0, latitude: 0 }], {
        tilesets: [earthTiles],
        body: MOON,
      }),
    ).rejects.toThrow(/is under Earth, not the Moon's anchor/);
  });

  it("with no body casts as today: the Earth's rays toEqual WGS 84's", async () => {
    const world = engine.createWorld();
    const earth = world.bodyAnchor(EARTH);
    const cast = vi
      .spyOn(world, "castRays")
      .mockImplementation(async (rays) => rays.map(() => undefined));
    const tiles = stubTileset(world, earth, "https://tiles.test/earth-t.json");
    await engine.sampleHeightMostDetailed(
      world,
      [{ longitude: LON, latitude: LAT }],
      { tilesets: [tiles] },
    );
    const [rays, options] = cast.mock.calls[0]!;
    expect(options).toMatchObject({ anchor: earth });
    const up = Ellipsoid.WGS84.geodeticSurfaceNormalCartographic(
      { longitude: LON, latitude: LAT, height: 0 },
      v3.vec3(),
    );
    expect(rays).toEqual([
      {
        origin: Ellipsoid.WGS84.cartographicToCartesian(
          { longitude: LON, latitude: LAT, height: 10_000 },
          v3.vec3(),
        ),
        direction: v3.negate(v3.vec3(), up),
        maxDistance: 22_000,
      },
    ]);
  });
});

describe("placement on a body", () => {
  it("a model placed at (10° E, 20° N, 0 m) under the Moon's anchor stands on the Moon's ellipsoid", () => {
    const world = engine.createWorld();
    const moon = world.bodyAnchor(MOON);
    const model = engine.uploadModel(world, triangle(), {
      releaseSourceData: false,
    });
    try {
      const placed = model.place({
        at: { longitude: 10, latitude: 20, height: 0 },
        anchor: moon,
      });
      const m = world.localMatrix(placed.transform);
      const want = Ellipsoid.MOON.cartographicToCartesian(
        fromDegrees(10, 20, 0),
        v3.vec3(),
      );
      expectClose([m[12]!, m[13]!, m[14]!], want, 1e-6);
      // Its up axis (the frame's z) is the Moon's normal there.
      const up = Ellipsoid.MOON.geodeticSurfaceNormal(want, v3.vec3())!;
      expectClose([m[8]!, m[9]!, m[10]!], up, 1e-12);
      // The Earth's ellipsoid would have put it kilometers away.
      const earth = Ellipsoid.WGS84.cartographicToCartesian(
        fromDegrees(10, 20, 0),
        v3.vec3(),
      );
      expect(
        v3.distance(v3.vec3(m[12]!, m[13]!, m[14]!), earth),
      ).toBeGreaterThan(1e6);
    } finally {
      model.release();
    }
  });

  it("a point source's up axis and a height capture's are the Moon's normal there", () => {
    const world = engine.createWorld();
    const moon = world.bodyAnchor(MOON);
    const origin = Ellipsoid.MOON.cartographicToCartesian(
      fromDegrees(10, 20, 0),
      v3.vec3(),
    );
    const up = Ellipsoid.MOON.geodeticSurfaceNormal(origin, v3.vec3())!;
    const source = new PointSource(engine, world, {
      capacity: 4,
      origin,
      anchor: moon,
    });
    try {
      expect(source.anchor).toBe(moon);
      expectClose(
        [source.frame[8]!, source.frame[9]!, source.frame[10]!],
        up,
        1e-12,
      );
    } finally {
      source.destroy();
    }
    const capture = engine.addHeightCapture(world, {
      origin,
      halfExtent: 100,
      size: 4,
      anchor: moon,
    });
    try {
      expectClose(capture.axes[2], up, 1e-12);
    } finally {
      engine.removeHeightCapture(capture);
    }
  });
});

describe("Earth-only content under another body's anchor", () => {
  it("addTerrain, addEllipsoid and a vector layer each refuse the Moon's anchor, naming it and the Earth", async () => {
    const world = engine.createWorld();
    const moon = world.bodyAnchor(MOON);
    expect(() => engine.addEllipsoid(world, { anchor: moon })).toThrow(
      /addEllipsoid: Moon is an anchor on the Moon, not the Earth;.*the Earth's/,
    );
    await expect(
      engine.addTerrain(world, "https://tiles.test/terrain/", {
        anchor: moon,
      }),
    ).rejects.toThrow(
      /addTerrain: Moon is an anchor on the Moon, not the Earth/,
    );
    const source = new PointSource(engine, world, {
      capacity: 4,
      origin: Ellipsoid.MOON.cartographicToCartesian(
        fromDegrees(10, 20, 0),
        v3.vec3(),
      ),
      anchor: moon,
    });
    try {
      await expect(
        VectorLayer.create(engine, world, {
          source,
          style: { layers: [{ shape: "circle", size: 8 }] },
          slots: 2,
        }),
      ).rejects.toThrow(
        /VectorLayer: Moon is an anchor on the Moon, not the Earth/,
      );
    } finally {
      source.destroy();
    }
  });
});
