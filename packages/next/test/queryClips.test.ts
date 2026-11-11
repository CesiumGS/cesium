// Every ray query respects clips (plan §13.26, clip decision 8): a hit where
// the clips remove the surface is passed over and the first kept hit is the
// answer, in each backend (the drawn terrain, the GPU draw cast, a tileset's
// geometry, a distance field); "none" ignores clips; a query with a view
// takes the view's by default.
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { ClipFilter } from "../src/geometry/query.ts";
import { sdfGeometry, type DistanceField } from "../src/geometry/sdf.ts";
import { castTilesetRays, type RayTile } from "../src/query/geometryBackend.ts";
import type { RayQuery } from "../src/query/queries.ts";
import { terrainQueries } from "../src/query/terrainBackend.ts";
import type { Engine } from "../src/scene/Engine.ts";
import { OffscreenTarget } from "../src/scene/renderTarget.ts";
import type { ClipSet } from "../src/scene/world/clips.ts";
import { castPastClips } from "../src/scene/world/rays.ts";
import type { CastOptions, CastRay } from "../src/scene/world/types.ts";
import { MOON } from "../src/scene/Body.ts";
import { obb, sphereFromObb } from "../src/streaming/volumes.ts";
import { fakeEngine } from "./fakeGpu.ts";
import { A, at, gridTile, strip, stripTarget } from "./terrainRayFixtures.ts";

/** Keeps the points the test accepts. */
const keeping = (keeps: (p: ArrayLike<number>) => boolean): ClipFilter => ({
  keeps,
});

describe("the drawn terrain", () => {
  const HALF = 20000 / A;
  const W = 3000 / A;
  const SIGMA = 3000 / A;
  const hill = (lon: number, lat: number): number =>
    300 * Math.exp(-(lon * lon + lat * lat) / (2 * SIGMA * SIGMA));
  const target = () => {
    const rects = strip(-HALF * 1.01, HALF * 1.01, 8, -W, W);
    return stripTarget(
      rects.map((rectangle) => ({
        rectangle,
        tile: gridTile(rectangle, 33, hill, 14),
      })),
    );
  };
  /** Along the equator, 100 m up: it meets the hill's west flank, then its east one. */
  const through: RayQuery = {
    anchor: undefined,
    seconds: 0,
    targets: ["terrain"],
    rays: [{ from: at(-HALF, 0, 100), to: at(HALF, 0, 100) }],
  };
  /** Keeps the east of the prime meridian: the west flank is removed. */
  const east = keeping((p) => p[1]! > 0);

  it("returns the first kept hit: behind the removed west flank, the east one", async () => {
    const plain = (await terrainQueries(target()).castRays(through)).rays[0]!;
    const clipped = (
      await terrainQueries(target(), { clips: () => east }).castRays(through)
    ).rays[0]!;
    expect(plain.verdict).toBe("blocked");
    expect(plain.hit!.t).toBeLessThan(0.5);
    expect(clipped.verdict).toBe("blocked");
    expect(clipped.hit!.t).toBeGreaterThan(0.5);
    expect(clipped.hit!.position[1]).toBeGreaterThan(0);
    // The hill is symmetric: the kept hit mirrors the first.
    expect(clipped.hit!.t).toBeCloseTo(1 - plain.hit!.t, 3);
  });

  it("is clear when the clips remove every hit, and unaffected by `clips: none`", async () => {
    const clipsFor = (q: RayQuery) =>
      q.clips === "none" ? undefined : keeping(() => false);
    const queries = terrainQueries(target(), { clips: clipsFor });
    const removed = (await queries.castRays(through)).rays[0]!;
    expect(removed.verdict).not.toBe("blocked");
    expect(removed.hit).toBeUndefined();
    const none = (await queries.castRays({ ...through, clips: "none" }))
      .rays[0]!;
    expect(none.verdict).toBe("blocked");
    expect(none.hit!.t).toBeLessThan(0.5);
  });
});

describe("the GPU draw cast", () => {
  /** Surfaces along +x at these distances, for a ray starting at x = 0 (the ray's own coordinates). */
  const surfaces = [10, 20, 30];
  const fakeCast = (log: number[] = []) => {
    return async (rays: readonly CastRay[]) => {
      log.push(rays.length);
      return rays.map((ray) => {
        const first = surfaces
          .map((s) => s - ray.origin[0]!)
          .find((d) => d >= 0 && d <= ray.maxDistance);
        return first;
      });
    };
  };
  const ray = (maxDistance = 100): CastRay => ({
    origin: Float64Array.of(0, 0, 0),
    direction: Float64Array.of(1, 0, 0),
    maxDistance,
  });

  it("returns the first kept hit, casting again from behind each removed one", async () => {
    const log: number[] = [];
    const [a] = await castPastClips(
      [ray()],
      keeping((p) => p[0]! >= 25),
      fakeCast(log),
    );
    expect(a).toBeCloseTo(30, 9);
    expect(log).toEqual([1, 1, 1]);
  });

  it("keeps a hit the clips keep, with one cast; and none kept is no hit", async () => {
    const log: number[] = [];
    const [near] = await castPastClips(
      [ray()],
      keeping(() => true),
      fakeCast(log),
    );
    expect(near).toBe(10);
    expect(log).toEqual([1]);
    const [gone] = await castPastClips(
      [ray()],
      keeping(() => false),
      fakeCast(),
    );
    expect(gone).toBeUndefined();
    // Beyond the ray's reach the kept surface isn't there.
    const [short] = await castPastClips(
      [ray(25)],
      keeping((p) => p[0]! >= 25),
      fakeCast(),
    );
    expect(short).toBeUndefined();
  });

  it("recasts only the rays still searching, each from its own start", async () => {
    const log: number[] = [];
    const a = ray();
    const b: CastRay = {
      origin: Float64Array.of(0, 5, 0),
      direction: Float64Array.of(1, 0, 0),
      maxDistance: 100,
    };
    // `b` is cast where nothing is hit (its origin is past every surface).
    const fakeSingle = (r: CastRay) =>
      surfaces.map((s) => s - r.origin[0]!).find((d) => d >= 0);
    const cast = async (rays: readonly CastRay[]) => {
      log.push(rays.length);
      return rays.map((r) => (r.origin[1] === 5 ? undefined : fakeSingle(r)));
    };
    const out = await castPastClips(
      [a, b],
      keeping((p) => p[0]! > 15),
      cast,
    );
    expect(out[0]).toBeCloseTo(20, 9);
    expect(out[1]).toBeUndefined();
    expect(log).toEqual([2, 1]);
  });

  it("refuses a ray that crosses endless removed surfaces", async () => {
    const endless = async (rays: readonly CastRay[]) => rays.map(() => 0.5);
    await expect(
      castPastClips(
        [ray(1e9)],
        keeping(() => false),
        endless,
      ),
    ).rejects.toThrow(/more than 256 surfaces/);
  });
});

describe("a tileset's geometry", () => {
  const R = 1_737_400;
  const slab = (z: number): RayTile["geometry"] => [
    {
      positions: Float32Array.from([
        0, -50, -50, 0, 50, -50, 0, 50, 50, 0, -50, 50,
      ]),
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
  const o = obb(
    Float64Array.from([R, 0, 0]),
    Float64Array.from([200, 0, 0, 0, 200, 0, 0, 0, 200]),
  );
  const root: RayTile = {
    children: [],
    viewMask: 1,
    standInMask: 0,
    geometricError: 0,
    volume: { kind: "box", obb: o, sphere: sphereFromObb(o) },
    // Two plates, 10 m and 30 m below the start: x = R + 90 and R + 70.
    geometry: [...slab(90)!, ...slab(70)!],
  };
  const tileset = { retainGeometry: true, root };
  const ask = (clips?: ClipFilter) =>
    castTilesetRays(tileset, [{ from: [R + 100, 0, 0], to: [R, 0, 0] }], {
      band: MOON.terrainBand!,
      ellipsoid: MOON.ellipsoid,
      ...(clips && { clips }),
    })[0]!;

  it("passes over a removed plate to the one behind it; none ignores the clips", () => {
    expect(ask().hit!.t).toBeCloseTo(0.1, 9);
    const clipped = ask(keeping((p) => p[0]! < R + 80));
    expect(clipped.verdict).toBe("blocked");
    expect(clipped.hit!.t).toBeCloseTo(0.3, 9);
  });
});

describe("a distance field", () => {
  const sphere: DistanceField = {
    distance: (x, y, z) => Math.hypot(x, y, z) - 1,
    min: [-1, -1, -1],
    max: [1, 1, 1],
  };
  const g = sdfGeometry(sphere);
  const ray = { from: [-3, 0, 0], to: [3, 0, 0] };

  it("marches past a removed entry to the exit, whose normal faces the start", () => {
    const plain = g.rayHit(ray);
    const clipped = g.rayHit(ray, { clips: keeping((p) => p[0]! > 0) });
    expect(plain.verdict === "hit" && plain.hit.t).toBeCloseTo(1 / 3, 3);
    expect(clipped.verdict).toBe("hit");
    if (clipped.verdict === "hit") {
      expect(clipped.hit.t).toBeCloseTo(2 / 3, 3);
      expect(clipped.hit.position[0]).toBeCloseTo(1, 3);
      expect(clipped.hit.normal[0]).toBeCloseTo(-1, 3);
    }
  });

  it("misses when the clips remove every surface, and from inside goes on to the exit", () => {
    expect(g.rayHit(ray, { clips: keeping(() => false) }).verdict).toBe("miss");
    const inside = g.rayHit(
      { from: [0, 0, 0], to: [3, 0, 0] },
      { clips: keeping((p) => p[0]! > 0.5) },
    );
    expect(inside.verdict).toBe("hit");
    if (inside.verdict === "hit") {
      expect(inside.hit.t).toBeCloseTo(1 / 3, 3);
    }
    expect(
      g.rayHit(
        { from: [0, 0, 0], to: [0, 0, 0] },
        { clips: keeping(() => false) },
      ).verdict,
    ).toBe("miss");
  });
});

describe("Engine.queries", () => {
  let engine: Engine;
  beforeAll(async () => {
    engine = await fakeEngine();
  });

  /** A world with a view cutting with a clip that keeps x ≤ 0 (a plane through the origin). */
  function scene() {
    const world = engine.createWorld();
    const set: ClipSet = {
      frame: world.root,
      shapes: [{ kind: "plane", point: [0, 0, 0], normal: [1, 0, 0] }],
    };
    const view = engine.addView({ target: new OffscreenTarget(8, 8), world });
    const clip = world.addClip(set);
    view.setClips([clip]);
    const casts: CastOptions[] = [];
    vi.spyOn(world, "castRays").mockImplementation(async (rays, options) => {
      casts.push(options ?? {});
      return rays.map(() => undefined);
    });
    const ask = (more: Partial<RayQuery> = {}): RayQuery => ({
      anchor: undefined,
      seconds: 0,
      rays: [{ from: [-5, 0, 0], to: [5, 0, 0] }],
      targets: ["draws"],
      ...more,
    });
    return { world, view, set, casts, ask, clip };
  }

  it("a query with a view takes the view's clips; none and the unset default of a world question take none", async () => {
    const s = scene();
    await engine.queries.castRays(s.ask({ view: s.view }));
    await engine.queries.castRays(s.ask({ view: s.view, clips: "none" }));
    await engine.queries.castRays(s.ask({ world: s.world }));
    const [viewDefault, none, world] = s.casts;
    expect(viewDefault!.clips!.keeps([-1, 0, 0])).toBe(true);
    expect(viewDefault!.clips!.keeps([1, 0, 0])).toBe(false);
    expect(none!.clips).toBeUndefined();
    expect(world!.clips).toBeUndefined();
    engine.removeWorld(s.world);
  });

  it("takes a set of its own, in the query's frame; a view without clips gives none", async () => {
    const s = scene();
    const keepEast: ClipSet = { ...s.set, keep: "outside" };
    await engine.queries.castRays(s.ask({ world: s.world, clips: keepEast }));
    await engine.queries.castRays(
      s.ask({ view: s.view, clips: [s.set, keepEast] }),
    );
    s.view.setClips([]);
    await engine.queries.castRays(s.ask({ view: s.view }));
    const [own, both, empty] = s.casts;
    expect(own!.clips!.keeps([1, 0, 0])).toBe(true);
    expect(own!.clips!.keeps([-1, 0, 0])).toBe(false);
    expect(both!.clips!.keeps([1, 0, 0])).toBe(false);
    expect(both!.clips!.keeps([-1, 0, 0])).toBe(false);
    expect(empty!.clips).toBeUndefined();
    engine.removeWorld(s.world);
  });

  it("carries a query's clips through the frame tree to the anchor's cast", async () => {
    const s = scene();
    await engine.queries.castRays(
      s.ask({ world: s.world, frame: s.world.root, clips: s.set }),
    );
    await engine.queries.castRays(
      s.ask({ view: s.view, world: s.world, frame: s.world.root }),
    );
    await engine.queries.castRays(
      s.ask({ world: s.world, frame: s.world.root }),
    );
    const [named, byView, none] = s.casts;
    expect(named!.clips!.keeps([1, 0, 0])).toBe(false);
    expect(byView!.clips!.keeps([1, 0, 0])).toBe(false);
    expect(none!.clips).toBeUndefined();
    engine.removeWorld(s.world);
  });

  it('refuses clips: "view" without a view', async () => {
    const s = scene();
    await expect(
      engine.queries.castRays(s.ask({ world: s.world, clips: "view" })),
    ).rejects.toThrow(/needs the query's view/);
    engine.removeWorld(s.world);
  });

  it("casts queries with different clips apart, and counts a view's clip changes in the revision", async () => {
    const s = scene();
    const a = await engine.queries.castRays(s.ask({ view: s.view }));
    s.casts.length = 0;
    await Promise.all([
      engine.queries.castRays(s.ask({ view: s.view })),
      engine.queries.castRays(s.ask({ view: s.view, clips: "none" })),
    ]);
    expect(s.casts).toHaveLength(2);
    s.view.setClips([]);
    const b = await engine.queries.castRays(s.ask({ view: s.view }));
    s.view.setClips([s.clip]);
    const c = await engine.queries.castRays(s.ask({ view: s.view }));
    expect(b.revision).toBeGreaterThan(a.revision);
    expect(c.revision).toBeGreaterThan(b.revision);
    const noClips = await engine.queries.castRays(
      s.ask({ view: s.view, clips: "none" }),
    );
    s.view.setClips([]);
    expect(
      (await engine.queries.castRays(s.ask({ view: s.view, clips: "none" })))
        .revision,
    ).toBe(noClips.revision);
    engine.removeWorld(s.world);
  });
});
