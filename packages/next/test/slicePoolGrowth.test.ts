// The imagery slices grow with the frame's need and shrink back once it
// stays low (SlicePool.demand), so the smaller default (256 a layer) never
// costs imagery:
// - a full-screen view gets every drawn tile a slice, one array copy a frame;
// - a need hovering near either threshold doesn't grow and shrink back;
// - steps come back down to the default, even after a growth cut at the
//   ceiling; at the ceiling, layers split it by need;
// - out of GPU memory, the pool stays at its size and warns once;
// - when one layer's update shrinks the pool, the others' draws are
//   pointed at their renumbered slices in the same frame.
import { beforeAll, describe, expect, it } from "vitest";
import {
  SLICE_GROWTH_RETRY_AFTER,
  SLICE_GROWTH_TIMEOUT,
  SLICE_SHRINK_AFTER,
  SlicePool,
} from "../src/globe/SlicePool.ts";
import { packImagery } from "../src/render/layout.ts";
import type { ModelPlacement } from "../src/scene/gltfModel.ts";
import type { World } from "../src/scene/World.ts";
import type { Tile } from "../src/streaming/Tile.ts";
import { fakeDevice, installGpuGlobals } from "./fakeGpu.ts";
import {
  compositingLayer,
  fakeWorld,
  holder,
  layer,
  recordingDevice,
  tile,
  type Holder,
} from "./sliceFakes.ts";

type Internals = {
  slices: Map<Tile, { slice: number; used: number }>;
  jobs: Map<Tile, unknown>;
  pool: SlicePool;
};
const inner = (imagery: unknown) => imagery as Internals;

/** Lets a growth's error scope resolve (it switches arrays then). */
const settle = () => new Promise((resolve) => setImmediate(resolve));

describe("imagery slices grow with the need", () => {
  beforeAll(() => installGpuGlobals());

  it("a full-screen 2560×1440 view gets every drawn tile a slice", async () => {
    // About 4 times the report's 61 tiles: 244 drawn, children of 61 tiles
    // whose slices stand in while theirs composite, in both layers (the
    // surface and night lights). Flying, 40 more tiles are loading, and
    // their imagery loads alongside (after the drawn tiles').
    const world = fakeWorld();
    const device = recordingDevice([]);
    const layers = [
      compositingLayer(world, device),
      compositingLayer(world, device, { role: "lights" }),
    ];
    expect(SlicePool.usage(world)!.capacity).toBe(512);
    const parents = Array.from({ length: 61 }, (_, i) =>
      tile(4, i % 16, Math.floor(i / 16)),
    );
    const children = parents.flatMap((p) => {
      const g = p.globe!;
      return [0, 1, 2, 3].map((k) =>
        tile(5, 2 * g.x + (k & 1), 2 * g.y + (k >> 1), p),
      );
    });
    expect(children.length).toBe(244);
    const loading = Array.from({ length: 40 }, (_, i) => tile(6, i, 40));
    for (const imagery of layers) {
      for (const p of parents) {
        inner(imagery).slices.set(p, {
          slice: inner(imagery).pool.take()!,
          used: 0,
        });
      }
    }
    const wanted = new Map([
      ...children.map((t, i) => [t, i] as const),
      ...loading.map((t, i) => [t, 1e15 + i] as const),
    ]);
    let peak = 0;
    const capacities = [512];
    for (let frame = 0; frame < 40; frame++) {
      for (const imagery of layers) {
        imagery.update(wanted);
      }
      peak = Math.max(peak, SlicePool.usage(world)!.needed);
      await settle();
      capacities.push(SlicePool.usage(world)!.capacity);
    }
    // At the default sizes the need didn't fit: 345 a layer (284 tiles and
    // 61 stand-ins), 690 in all, against 512.
    expect(peak).toBe(690);
    // Every tile has its own slice; none waits.
    for (const imagery of layers) {
      expect(inner(imagery).jobs.size).toBe(0);
      for (const t of [...children, ...loading]) {
        expect(inner(imagery).slices.has(t)).toBe(true);
      }
      expect(imagery.needed).toBe(284);
    }
    // One array copy a frame: the surface's growth, then the lights'.
    expect([...new Set(capacities)]).toEqual([512, 768, 1024]);
    expect(capacities.indexOf(1024) - capacities.indexOf(768)).toBe(1);
    for (const imagery of layers) {
      imagery.destroy();
    }
  });

  it("grows by whole steps, the last cut at the ceiling, and comes back down to the default", async () => {
    const world = fakeWorld();
    const device = fakeDevice({ maxTextureArrayLayers: 600 });
    const h = holder(device, world, 256);
    h.pool.demand(h, 231);
    await settle();
    expect(h.pool.capacity).toBe(512);
    h.pool.demand(h, 1000);
    await settle();
    expect(h.pool.capacity).toBe(600);
    expect(h.pool.asked(h)).toBe(600);
    // Down in whole steps: 600 to 512 (not 344), then 256.
    const sizes = new Set<number>();
    for (let i = 0; i < 3 * SLICE_SHRINK_AFTER; i++) {
      h.pool.demand(h, 10);
      sizes.add(h.pool.capacity);
    }
    expect([...sizes]).toEqual([600, 512, 256]);
  });

  it("refuses a slice count that isn't a positive integer", () => {
    const world = fakeWorld();
    for (const slices of [0, -4, 1.5, Number.NaN]) {
      expect(() => compositingLayer(world, fakeDevice({}), { slices })).toThrow(
        RangeError,
      );
    }
    expect(() => holder(fakeDevice({}), world, 0)).toThrow(
      /slices must be a positive integer/,
    );
  });
});

describe("imagery slices at the ceiling", () => {
  beforeAll(() => installGpuGlobals());

  it("layers needing the same split it evenly, whichever updates first", async () => {
    // A 1024-layer device, both layers needing 2000: the first to update
    // grew into all the room, and the second stayed at 256.
    const device = fakeDevice({ maxTextureArrayLayers: 1024 });
    const world = fakeWorld();
    const a = holder(device, world, 256);
    const b = holder(device, world, 256);
    a.pool.demand(a, 2000);
    b.pool.demand(b, 2000);
    await settle();
    expect([a.pool.asked(a), a.pool.asked(b), a.pool.capacity]).toEqual([
      512, 512, 1024,
    ]);
    // Steady, frame after frame: nothing moves.
    for (let i = 0; i < 100; i++) {
      a.pool.demand(a, 2000);
      b.pool.demand(b, 2000);
    }
    expect([a.pool.asked(a), a.pool.asked(b)]).toEqual([512, 512]);
  });

  it("in proportion to need, never below the default", async () => {
    const device = fakeDevice({ maxTextureArrayLayers: 1024 });
    const world = fakeWorld();
    const a = holder(device, world, 256);
    const b = holder(device, world, 256);
    // b first needs little, so a may take the room...
    b.pool.demand(b, 10);
    a.pool.demand(a, 3000);
    await settle();
    expect([a.pool.asked(a), a.pool.asked(b)]).toEqual([768, 256]);
    // ...while b's part, a quarter of the need, is its default...
    b.pool.demand(b, 1000);
    a.pool.demand(a, 3000);
    expect([a.pool.asked(a), a.pool.asked(b)]).toEqual([768, 256]);
    // ...and gives a step back once b needs as much as a.
    b.pool.demand(b, 3000);
    a.pool.demand(a, 3000);
    expect([a.pool.asked(a), a.pool.asked(b)]).toEqual([512, 512]);
  });

  it("a layer over its share gives the slices back, farthest first", async () => {
    // Two imagery layers on a 1024-layer device, each drawing 600 tiles:
    // the surface grows first, then hands a step to the lights.
    const world = fakeWorld();
    const device = fakeDevice({ maxTextureArrayLayers: 1024 });
    const surface = compositingLayer(world, device);
    const lights = compositingLayer(world, device, { role: "lights" });
    const tiles = Array.from({ length: 600 }, (_, i) => tile(8, i, 7));
    const wanted = new Map(tiles.map((t, i) => [t, i]));
    for (let frame = 0; frame < 60; frame++) {
      surface.update(wanted);
      lights.update(wanted);
      await settle();
    }
    expect(SlicePool.usage(world)!.capacity).toBe(1024);
    expect(inner(surface).slices.size).toBe(512);
    expect(inner(lights).slices.size).toBe(512);
    // The nearest tiles keep theirs.
    expect(tiles.slice(0, 512).every((t) => inner(surface).slices.has(t))).toBe(
      true,
    );
    surface.destroy();
    lights.destroy();
  });
});

describe("imagery slices out of GPU memory", () => {
  beforeAll(() => installGpuGlobals());

  it("stay at their size, stop growing, and warn once", async () => {
    const device = fakeDevice({});
    const scopes: string[] = [];
    let fail = true;
    (device as { pushErrorScope: unknown }).pushErrorScope = (f: string) =>
      void scopes.push(f);
    (device as { popErrorScope: unknown }).popErrorScope = () =>
      Promise.resolve(fail ? { message: "out of memory" } : null);
    const world = fakeWorld();
    const h = holder(device, world, 256);
    const array = h.pool.texture;
    h.pool.demand(h, 300);
    await settle();
    expect(scopes).toEqual(["out-of-memory"]);
    expect(h.pool.capacity).toBe(256);
    expect(h.pool.texture).toBe(array);
    expect(h.pool.asked(h)).toBe(256);
    const warning = SlicePool.usage(world)!.warning;
    expect(warning).toMatch(/out of GPU memory growing to 512 layers/);
    // No more attempts during the cool-down, even once memory would allow
    // it; one warning.
    fail = false;
    for (let i = 1; i < SLICE_GROWTH_RETRY_AFTER; i++) {
      h.pool.demand(h, 300);
    }
    await settle();
    expect(scopes.length).toBe(1);
    expect(h.pool.capacity).toBe(256);
    expect(SlicePool.usage(world)!.warning).toBe(warning);
    // Then one retry, which succeeds here: grown, and the warning gone.
    h.pool.demand(h, 300);
    await settle();
    expect(scopes.length).toBe(2);
    expect(h.pool.capacity).toBe(512);
    expect(SlicePool.usage(world)!.warning).toBeUndefined();
  });

  it("a second failure stops growth for the pool's life", async () => {
    const device = fakeDevice({});
    let attempts = 0;
    (device as { popErrorScope: unknown }).popErrorScope = () => {
      attempts++;
      return Promise.resolve({ message: "out of memory" });
    };
    const h = holder(device, fakeWorld(), 256);
    for (let i = 0; i < 4 * SLICE_GROWTH_RETRY_AFTER; i++) {
      h.pool.demand(h, 300);
      await settle();
    }
    expect(attempts).toBe(2);
    expect(h.pool.capacity).toBe(256);
  });
});

describe("imagery slices: growth races (the re-review's probes)", () => {
  beforeAll(() => installGpuGlobals());

  it("a layer leaving while a growth is pending drops the growth", async () => {
    // Two 256-slice layers; one asks for 512, so a growth to 768 is
    // pending; the other leaves, and 512 is all that's asked for.
    const device = fakeDevice({});
    const world = fakeWorld();
    const a = holder(device, world, 256);
    const b = holder(device, world, 256);
    a.pool.demand(a, 400);
    expect(a.pool.resizing).toBe(true);
    b.leave();
    await settle();
    expect(SlicePool.usage(world)!.capacity).toBe(512);
    expect(a.pool.asked(a)).toBe(512);
    expect(a.pool.resizing).toBe(false);
  });

  it("an out-of-memory error after a shrink doesn't cap the pool", async () => {
    // Four layers (1024); a growth to 1280 is pending when two leave and
    // the pool shrinks to 768. The error, for a size no longer asked for,
    // is dropped: a later need still grows the pool.
    const device = fakeDevice({});
    let fail: ((e: unknown) => void) | undefined;
    (device as { popErrorScope: unknown }).popErrorScope = () =>
      new Promise((resolve) => {
        fail = resolve;
      });
    const world = fakeWorld();
    const a = holder(device, world, 256);
    const b = holder(device, world, 256);
    const c = holder(device, world, 256);
    const d = holder(device, world, 256);
    a.pool.demand(a, 400);
    c.leave();
    d.leave();
    fail!({ message: "out of memory" });
    await settle();
    expect(SlicePool.usage(world)!.capacity).toBe(768);
    expect(SlicePool.usage(world)!.warning).toBeUndefined();
    (device as { popErrorScope: unknown }).popErrorScope = () =>
      Promise.resolve(null);
    b.pool.demand(b, 600);
    await settle();
    expect(SlicePool.usage(world)!.capacity).toBeGreaterThan(768);
  });

  it("a scope that never resolves times out, frees its array and warns", async () => {
    const device = fakeDevice({});
    let scopes = 0;
    (device as { popErrorScope: unknown }).popErrorScope = () => {
      scopes++;
      return new Promise(() => {});
    };
    const created: GPUTexture[] = [];
    const freed = new Set<GPUTexture>();
    const create = device.createTexture.bind(device);
    (device as { createTexture: unknown }).createTexture = (
      d: GPUTextureDescriptor,
    ) => {
      const texture = create(d);
      texture.destroy = () => void freed.add(texture);
      created.push(texture);
      return texture;
    };
    const world = fakeWorld();
    const h = holder(device, world, 256);
    h.pool.demand(h, 400);
    const array = created.at(-1)!;
    expect(h.pool.resizing).toBe(true);
    for (let i = 1; i < SLICE_GROWTH_TIMEOUT; i++) {
      h.pool.demand(h, 400);
    }
    expect(h.pool.resizing).toBe(true);
    expect(freed.has(array)).toBe(false);
    h.pool.demand(h, 400);
    const usage = SlicePool.usage(world)!;
    // Not resizing any more, so layers over their share trim again.
    expect(h.pool.resizing).toBe(false);
    expect(freed.has(array)).toBe(true);
    expect(usage.capacity).toBe(256);
    expect(usage.warning).toMatch(/didn't resolve in 120 ticks/);
    // One retry after the cool-down, which hangs too; then no more.
    for (let i = 0; i < 4 * SLICE_GROWTH_RETRY_AFTER; i++) {
      h.pool.demand(h, 400);
    }
    expect(scopes).toBe(2);
    expect(h.pool.resizing).toBe(false);
  });
});

describe("imagery slices: the hand-over at the ceiling", () => {
  beforeAll(() => installGpuGlobals());

  it("spreads over updates, slices never shared and draws always right", async () => {
    // The re-review's fair.test.ts: two layers on a 1024-layer device, the
    // need swinging between them. After every frame: no slice held by both
    // layers or held and free, none past capacity, every drawn tile's
    // record naming its slice; and the donor gives up at most 16 drawn
    // tiles' slices a frame.
    const device = fakeDevice({ maxTextureArrayLayers: 1024 });
    const records = new Map<unknown, number>();
    const world = {
      ...fakeWorld(),
      setImagery: (d: unknown, p: number) => void records.set(d, p),
      setLights: (d: unknown, p: number) => void records.set(d, p),
    } as unknown as World;
    const surface = compositingLayer(world, device);
    const lights = compositingLayer(world, device, { role: "lights" });
    const tiles = (n: number, y: number) =>
      Array.from({ length: n }, (_, i) => {
        const t = tile(8, i, y);
        (t as { placement?: unknown }).placement = {
          draws: [{ t }],
        } as unknown as ModelPlacement;
        return t;
      });
    const a = tiles(900, 1);
    const b = tiles(900, 2);
    const layers = [surface, lights];
    let problems = 0;
    let worstLoss = 0;
    const run = async (wa: Tile[], wb: Tile[], frames: number) => {
      const wanted = [
        new Map(wa.map((t, i) => [t, i])),
        new Map(wb.map((t, i) => [t, i])),
      ];
      for (let f = 0; f < frames; f++) {
        const before = layers.map(
          (l, i) =>
            new Set(
              [...wanted[i]!.keys()].filter((t) => inner(l).slices.has(t)),
            ),
        );
        layers.forEach((l, i) => l.update(wanted[i]!));
        const pool = inner(surface).pool;
        const free = new Set<number>(
          (pool as unknown as { free: number[] }).free,
        );
        const owner = new Map<number, number>();
        for (const [i, l] of layers.entries()) {
          for (const s of inner(l).slices.values()) {
            if (owner.has(s.slice) || free.has(s.slice)) {
              problems++;
            }
            if (s.slice >= pool.capacity) {
              problems++;
            }
            owner.set(s.slice, i);
          }
          let lost = 0;
          for (const t of wanted[i]!.keys()) {
            const s = inner(l).slices.get(t);
            if (
              records.get(t.placement!.draws[0]) !==
              (s ? packImagery(s.slice) : 0)
            ) {
              problems++;
            }
            if (before[i]!.has(t) && !s) {
              lost++;
            }
          }
          worstLoss = Math.max(worstLoss, lost);
        }
        await settle();
      }
    };
    await run(a.slice(0, 700), b.slice(0, 700), 120);
    await run(a.slice(0, 900), b.slice(0, 300), 200);
    await run(a.slice(0, 300), b.slice(0, 900), 200);
    expect(problems).toBe(0);
    // Spread out: 16 drawn tiles a frame at most (it was 44 at once).
    expect(worstLoss).toBeGreaterThan(0);
    expect(worstLoss).toBeLessThanOrEqual(16);
    // And it completes: the lights layer ends holding its larger part.
    expect(inner(lights).slices.size).toBeGreaterThan(512);
    surface.destroy();
    lights.destroy();
  }, 60_000);
});

describe("imagery slices don't thrash", () => {
  beforeAll(() => installGpuGlobals());

  /** Capacity changes over a need sequence, growth settled each time. */
  async function changes(user: Holder, needs: number[]) {
    const sizes: number[] = [];
    for (const n of needs) {
      const before = user.pool.capacity;
      user.pool.demand(user, n);
      if (user.pool.resizing) {
        await settle();
      }
      if (user.pool.capacity !== before) {
        sizes.push(user.pool.capacity);
      }
    }
    return sizes;
  }

  it("a need hovering at the growth threshold grows once", async () => {
    // 90% of 256 is 230.4: 225 and 235 alternate across it.
    const h = holder(fakeDevice({}), fakeWorld(), 256);
    const needs = Array.from({ length: 3000 }, (_, i) => (i % 2 ? 235 : 225));
    expect(await changes(h, needs)).toEqual([512]);
  });

  it("a need hovering at the shrink threshold never shrinks", async () => {
    // Grown to 512: it shrinks below half of 256, 128. 120 and 135
    // alternate across it, so it is never low 600 updates in a row.
    const h = holder(fakeDevice({}), fakeWorld(), 256);
    expect(await changes(h, [300])).toEqual([512]);
    const needs = Array.from({ length: 3000 }, (_, i) => (i % 2 ? 135 : 120));
    expect(await changes(h, needs)).toEqual([]);
    expect(h.pool.capacity).toBe(512);
  });

  it("shrinks a step after the need stayed low 600 updates, never below the default", async () => {
    const h = holder(fakeDevice({}), fakeWorld(), 256);
    expect(await changes(h, [700])).toEqual([1024]);
    const low = (n: number) => Array.from({ length: n }, () => 50);
    expect(await changes(h, low(SLICE_SHRINK_AFTER - 1))).toEqual([]);
    expect(await changes(h, low(1))).toEqual([768]);
    expect(await changes(h, low(2 * SLICE_SHRINK_AFTER))).toEqual([512, 256]);
    expect(await changes(h, low(5 * SLICE_SHRINK_AFTER))).toEqual([]);
    // Any frame that isn't low starts the count again.
    expect(await changes(h, [300])).toEqual([512]);
    const broken = [...low(SLICE_SHRINK_AFTER - 1), 200, ...low(10)];
    expect(await changes(h, broken)).toEqual([]);
  });

  it("a layer's share follows what it has", async () => {
    // The grown layer may hold its 512; the other keeps its 256.
    const device = fakeDevice({});
    const world = fakeWorld();
    const surface = holder(device, world, 256);
    const lights = holder(device, world, 256);
    surface.pool.demand(surface, 300);
    await settle();
    expect(surface.pool.capacity).toBe(768);
    expect(surface.pool.share(surface)).toBe(512);
    expect(surface.pool.share(lights)).toBe(256);
  });
});

describe("a shrink in one layer's update", () => {
  beforeAll(() => installGpuGlobals());

  it("points the other layers' draws at their new slices in the same frame", async () => {
    // From the branch review's probe: both layers grow for a full-screen
    // view, then the camera settles on 20 tiles whose surface slices are
    // 512 and up. Their low-need counts reach 600 on the same frame; the
    // surface shrinks the pool first, then the lights layer shrinks it
    // again, moving the surface's slices after the surface had updated.
    const surfaceRecords = new Map<unknown, number>();
    const lightsRecords = new Map<unknown, number>();
    const world = {
      ...fakeWorld(),
      setImagery: (draw: unknown, packed: number) =>
        void surfaceRecords.set(draw, packed),
      setLights: (draw: unknown, packed: number) =>
        void lightsRecords.set(draw, packed),
    } as unknown as World;
    const device = recordingDevice([]);
    const surface = compositingLayer(world, device);
    const lights = compositingLayer(world, device, { role: "lights" });
    const big = Array.from({ length: 450 }, (_, i) => tile(6, i, 3));
    for (const t of big) {
      (t as { placement?: unknown }).placement = {
        draws: [{ t }],
      } as unknown as ModelPlacement;
    }
    const wantedBig = new Map(big.map((t, i) => [t, i]));
    for (let frame = 0; frame < 40; frame++) {
      surface.update(wantedBig);
      lights.update(wantedBig);
      await settle();
    }
    expect(SlicePool.usage(world)!.capacity).toBe(1024);
    const small = big
      .filter((t) => (inner(surface).slices.get(t)?.slice ?? 0) >= 512)
      .slice(0, 20);
    expect(small.length).toBe(20);
    const wantedSmall = new Map(small.map((t, i) => [t, i]));
    const pointsRight = (imagery: unknown, records: Map<unknown, number>) =>
      small.every((t) => {
        const s = inner(imagery).slices.get(t);
        const draw = t.placement!.draws[0];
        return records.get(draw) === (s ? packImagery(s.slice) : 0);
      });
    const capacities: number[] = [];
    let wrongFrames = 0;
    for (let frame = 0; frame < 2 * SLICE_SHRINK_AFTER + 100; frame++) {
      surface.update(wantedSmall);
      lights.update(wantedSmall);
      const capacity = SlicePool.usage(world)!.capacity;
      if (capacities.at(-1) !== capacity) {
        capacities.push(capacity);
      }
      if (
        !pointsRight(surface, surfaceRecords) ||
        !pointsRight(lights, lightsRecords)
      ) {
        wrongFrames++;
      }
    }
    expect(capacities).toEqual([1024, 512]);
    expect(wrongFrames).toBe(0);
    surface.destroy();
    lights.destroy();
  });

  it("re-points a layer that doesn't update (a frozen tileset)", () => {
    const pointed: number[] = [];
    const world = {
      ...fakeWorld(),
      setImagery: (_d: unknown, packed: number) => void pointed.push(packed),
    } as unknown as World;
    const device = recordingDevice([]);
    const leaving = holder(device, world, 256);
    leaving.take(256);
    const imagery = layer(world, device);
    const drawn = tile(5, 1, 1);
    (drawn as { placement?: unknown }).placement = {
      draws: [{}],
    } as unknown as ModelPlacement;
    inner(imagery).slices.set(drawn, {
      slice: inner(imagery).pool.take()!,
      used: 0,
    });
    imagery.update(new Map([[drawn, 0]]));
    const before = inner(imagery).slices.get(drawn)!.slice;
    expect(before).toBeGreaterThanOrEqual(256);
    // The pool shrinks; this layer's tileset is frozen and doesn't update.
    leaving.leave();
    const after = inner(imagery).slices.get(drawn)!.slice;
    expect(after).toBeLessThan(256);
    expect(pointed).toEqual([packImagery(before), packImagery(after)]);
    imagery.destroy();
  });
});
