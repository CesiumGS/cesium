// The imagery slices grow with the frame's need and shrink back once it
// stays low (SlicePool.demand), so the smaller default (256 a layer) never
// costs imagery: a full-screen view gets every drawn tile a slice, and a
// need hovering near either threshold doesn't grow and shrink back. Also:
// a frozen tileset re-points its imagery after the pool shrank.
import { beforeAll, describe, expect, it } from "vitest";
import {
  SLICE_SHRINK_AFTER,
  SlicePool,
  type SliceUser,
} from "../src/globe/SlicePool.ts";
import type { GlobeImagery } from "../src/globe/GlobeImagery.ts";
import { packImagery } from "../src/render/layout.ts";
import type { ModelPlacement } from "../src/scene/gltfModel.ts";
import type { World } from "../src/scene/World.ts";
import type { Tile } from "../src/streaming/Tile.ts";
import { fakeDevice, installGpuGlobals } from "./fakeGpu.ts";
import { fakeWorld, holder, layer, provider, tile } from "./sliceFakes.ts";

type Internals = {
  slices: Map<Tile, { slice: number; used: number }>;
  sources: Map<string, unknown>;
  jobs: Map<Tile, unknown>;
  pipelines?: object;
};

/**
 * A layer whose one source tile (level 0) is ready, so every job
 * composites, at the per-frame pass budget (23 tiles a frame).
 */
function compositingLayer(world: World, device: GPUDevice): GlobeImagery {
  const imagery = layer(world, device, { ...provider, maximumLevel: 0 });
  const internals = imagery as unknown as Internals;
  internals.pipelines = { fill: {}, composite: {}, downsample: {} };
  internals.sources.set("0/0/0", {
    state: "ready",
    used: 0,
    texture: device.createTexture({
      size: [256, 256],
      format: "rgba8unorm",
      usage: 0,
    }),
  });
  return imagery;
}

describe("imagery slices grow with the need", () => {
  beforeAll(() => installGpuGlobals());

  it("a full-screen 2560×1440 view gets every drawn tile a slice", () => {
    // About 4 times the report's 61 tiles: 244 drawn, children of 61 tiles
    // whose slices stand in while theirs composite, in both layers (the
    // surface and night lights). Flying, 40 more tiles are loading, and
    // their imagery loads alongside (after the drawn tiles').
    const device = fakeDevice({});
    const world = fakeWorld();
    const layers = [
      compositingLayer(world, device),
      compositingLayer(world, device),
    ];
    const pool = SlicePool.usage(world)!;
    expect(pool.capacity).toBe(512);
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
      const internals = imagery as unknown as Internals;
      for (const p of parents) {
        internals.slices.set(p, {
          slice: (imagery as unknown as { pool: SlicePool }).pool.take()!,
          used: 0,
        });
      }
    }
    const wanted = new Map([
      ...children.map((t, i) => [t, i] as const),
      ...loading.map((t, i) => [t, 1e15 + i] as const),
    ]);
    let peak = 0;
    for (let frame = 0; frame < 40; frame++) {
      for (const imagery of layers) {
        imagery.update(wanted);
      }
      peak = Math.max(peak, SlicePool.usage(world)!.needed);
    }
    // At the default sizes the need didn't fit: 345 a layer (284 tiles and
    // 61 stand-ins), 690 in all, against 512.
    expect(peak).toBe(690);
    // Every tile has its own slice; none waits.
    for (const imagery of layers) {
      const internals = imagery as unknown as Internals;
      expect(internals.jobs.size).toBe(0);
      for (const t of [...children, ...loading]) {
        expect(internals.slices.has(t)).toBe(true);
      }
      expect(imagery.needed).toBe(284);
    }
    // Each layer grew a step: 512 each.
    expect(SlicePool.usage(world)!.capacity).toBe(1024);
    for (const imagery of layers) {
      imagery.destroy();
    }
  });

  it("grows by whole steps, the last cut at the ceiling", () => {
    const world = fakeWorld();
    const device = fakeDevice({ maxTextureArrayLayers: 600 });
    const h = holder(device, world, 256);
    h.pool.demand(h, 231);
    expect(h.pool.capacity).toBe(512);
    h.pool.demand(h, 1000);
    expect(h.pool.capacity).toBe(600);
    expect(h.pool.asked(h)).toBe(600);
  });
});

describe("imagery slices don't thrash", () => {
  beforeAll(() => installGpuGlobals());

  /** Capacity changes over a need sequence. */
  function changes(user: SliceUser & { pool: SlicePool }, needs: number[]) {
    const sizes: number[] = [];
    for (const n of needs) {
      const before = user.pool.capacity;
      user.pool.demand(user, n);
      if (user.pool.capacity !== before) {
        sizes.push(user.pool.capacity);
      }
    }
    return sizes;
  }

  it("a need hovering at the growth threshold grows once", () => {
    // 90% of 256 is 230.4: 225 and 235 alternate across it.
    const h = holder(fakeDevice({}), fakeWorld(), 256);
    const needs = Array.from({ length: 3000 }, (_, i) => (i % 2 ? 235 : 225));
    expect(changes(h, needs)).toEqual([512]);
  });

  it("a need hovering at the shrink threshold never shrinks", () => {
    // Grown to 512: it shrinks below half of 256, 128. 120 and 135
    // alternate across it, so it is never low 600 updates in a row.
    const h = holder(fakeDevice({}), fakeWorld(), 256);
    h.pool.demand(h, 300);
    const needs = Array.from({ length: 3000 }, (_, i) => (i % 2 ? 135 : 120));
    expect(changes(h, needs)).toEqual([]);
    expect(h.pool.capacity).toBe(512);
  });

  it("shrinks a step after the need stayed low 600 updates, never below the default", () => {
    const h = holder(fakeDevice({}), fakeWorld(), 256);
    h.pool.demand(h, 700);
    expect(h.pool.capacity).toBe(1024);
    const low = (n: number) => Array.from({ length: n }, () => 50);
    expect(changes(h, low(SLICE_SHRINK_AFTER - 1))).toEqual([]);
    expect(changes(h, low(1))).toEqual([768]);
    expect(changes(h, low(2 * SLICE_SHRINK_AFTER))).toEqual([512, 256]);
    expect(changes(h, low(5 * SLICE_SHRINK_AFTER))).toEqual([]);
    // Any frame that isn't low starts the count again.
    h.pool.demand(h, 300);
    expect(h.pool.capacity).toBe(512);
    const broken = [...low(SLICE_SHRINK_AFTER - 1), 200, ...low(10)];
    expect(changes(h, broken)).toEqual([]);
  });

  it("a layer's share follows what it has", () => {
    // The grown layer may hold its 512; the other keeps its 256.
    const device = fakeDevice({});
    const world = fakeWorld();
    const surface = holder(device, world, 256);
    const lights = holder(device, world, 256);
    surface.pool.demand(surface, 300);
    expect(surface.pool.capacity).toBe(768);
    expect(surface.pool.share(surface)).toBe(512);
    expect(surface.pool.share(lights)).toBe(256);
  });
});

describe("a frozen tileset after the pool shrank", () => {
  beforeAll(() => installGpuGlobals());

  it("re-points its drawn tiles and settles", () => {
    const pointed: number[] = [];
    const world = {
      ...fakeWorld(),
      setImagery: (_d: unknown, packed: number) => void pointed.push(packed),
    } as unknown as World;
    const device = fakeDevice({});
    const leaving = holder(device, world, 256);
    leaving.take(256);
    const imagery = layer(world, device);
    const internals = imagery as unknown as Internals;
    internals.pipelines = {};
    const drawn = tile(5, 1, 1);
    (drawn as { placement?: unknown }).placement = {
      draws: [{}],
    } as unknown as ModelPlacement;
    internals.slices.set(drawn, {
      slice: (imagery as unknown as { pool: SlicePool }).pool.take()!,
      used: 0,
    });
    imagery.update(new Map([[drawn, 0]]));
    const before = internals.slices.get(drawn)!.slice;
    expect(before).toBeGreaterThanOrEqual(256);
    // The pool shrinks while the tileset is frozen: no update comes, only
    // the frozen tileset's refresh.
    leaving.leave();
    expect(imagery.busy).toBe(true);
    imagery.refresh();
    const after = internals.slices.get(drawn)!.slice;
    expect(after).toBeLessThan(256);
    expect(pointed).toEqual([packImagery(before), packImagery(after)]);
    expect(imagery.busy).toBe(false);
    // Nothing to do when nothing moved.
    imagery.refresh();
    expect(pointed.length).toBe(2);
    imagery.destroy();
  });
});
