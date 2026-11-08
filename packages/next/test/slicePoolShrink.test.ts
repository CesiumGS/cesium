// The imagery slices' default size per layer, and the pool shrinking when a
// layer leaves (it stayed at 2048 layers, 716 MB, after the Viewer switched
// from the ellipsoid to Cesium World Terrain).
import { beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_IMAGERY_SLICES } from "../src/globe/GlobeImagery.ts";
import { SlicePool } from "../src/globe/SlicePool.ts";
import { packImagery } from "../src/render/layout.ts";
import type { ModelPlacement } from "../src/scene/gltfModel.ts";
import type { World } from "../src/scene/World.ts";
import type { Tile } from "../src/streaming/Tile.ts";
import { installGpuGlobals } from "./fakeGpu.ts";
import {
  compositingLayer,
  fakeWorld,
  holder,
  layer,
  recordingDevice,
  tile,
  type Copy,
} from "./sliceFakes.ts";

describe("imagery slices: the default per layer", () => {
  beforeAll(() => installGpuGlobals());

  it("is 256 a layer: 512 for the default pair, not 1024", () => {
    const world = fakeWorld();
    const surface = layer(world);
    expect(DEFAULT_IMAGERY_SLICES).toBe(256);
    expect(SlicePool.usage(world)!.capacity).toBe(256);
    const lights = layer(world);
    expect(SlicePool.usage(world)!.capacity).toBe(512);
    lights.destroy();
    surface.destroy();
    expect(SlicePool.usage(world)).toBeUndefined();
  });

  it("covers the measured views without growing", () => {
    // Measured flights drew at most 61 tiles in a view. Here each draws
    // with an ancestor's slice while its own composites (16 of them), and
    // every one gets its own slice at the default size, with room left.
    const world = fakeWorld();
    const imagery = compositingLayer(world, recordingDevice([]));
    const internals = imagery as unknown as {
      slices: Map<Tile, { slice: number; used: number }>;
      jobs: Map<Tile, unknown>;
    };
    const parents = Array.from({ length: 16 }, (_, i) => tile(4, i, 0));
    for (const p of parents) {
      internals.slices.set(p, {
        slice: imagery["pool"].take()!,
        used: 0,
      });
    }
    const drawn = Array.from({ length: 61 }, (_, i) => {
      const p = parents[i % 16]!;
      return tile(5, 2 * p.globe!.x + (i >> 4), 0, p);
    });
    const wanted = new Map(drawn.map((t, i) => [t, i]));
    let peak = 0;
    for (let frame = 0; frame < 10; frame++) {
      imagery.update(wanted);
      peak = Math.max(peak, imagery.needed);
    }
    expect(peak).toBe(61 + 16);
    expect(internals.jobs.size).toBe(0);
    expect(drawn.every((t) => internals.slices.has(t))).toBe(true);
    expect(SlicePool.usage(world)!.capacity).toBe(DEFAULT_IMAGERY_SLICES);
    // At most 30% of the default: growth (at 90%) is far off.
    expect(peak / DEFAULT_IMAGERY_SLICES).toBeLessThan(0.31);
    imagery.destroy();
  });
});

describe("imagery slices: the pool shrinks when a layer leaves", () => {
  beforeAll(() => installGpuGlobals());

  it("to what the others asked for, their slices renumbered below it", () => {
    const copies: Copy[] = [];
    const log: string[] = [];
    const device = recordingDevice(copies);
    const world = fakeWorld(log);
    // Each layer takes from the slices its joining added: the leaving
    // layer 0 to 3, the staying one 4 to 6.
    const leaving = holder(device, world, 4);
    leaving.take(4);
    const staying = holder(device, world, 4);
    staying.take(3);
    expect(staying.held).toEqual([4, 5, 6]);
    const before = staying.pool.texture;
    let destroyed = false;
    before.destroy = () => {
      destroyed = true;
      log.push("destroy old");
    };
    copies.length = 0;
    log.length = 0;
    leaving.leave();
    const pool = staying.pool;
    expect(pool.capacity).toBe(4);
    expect(destroyed).toBe(true);
    // The smaller array is bound before the old one is destroyed.
    expect(log).toEqual(["bind", "destroy old"]);
    // Every kept slice is in the new array, each where its copy went.
    // Each copy was checked as WebGPU would (recordingDevice): within both
    // arrays' layers and each mip's extent, formats and usages matching.
    expect(staying.held.every((s) => s < 4)).toBe(true);
    expect(new Set(staying.held).size).toBe(3);
    for (let mip = 0; mip < pool.mipLevelCount; mip++) {
      const width = Math.max(1, 256 >> mip);
      const atMip = copies.filter((c) => c.mip === mip);
      // The slices below the new size, whole, then each moved slice.
      expect(atMip[0]).toEqual({ from: 0, to: 0, layers: 4, mip, width });
      const moves = atMip.slice(1).map(({ from, to }) => [from, to]);
      expect(moves).toEqual([...staying.relocated!]);
      expect(atMip.slice(1).every((c) => c.layers === 1)).toBe(true);
      expect(atMip.every((c) => c.width === width)).toBe(true);
    }
    expect(copies.length).toBe(4 * pool.mipLevelCount);
    // One slice is left free, and the layer can take it.
    expect(pool.take()).toBeDefined();
    expect(pool.take()).toBeUndefined();
    expect(SlicePool.usage(world)!.used).toBe(4);
  });

  it("keeps a layer's most recently used slices, up to its request", () => {
    const device = recordingDevice([]);
    const world = fakeWorld();
    const leaving = holder(device, world, 4);
    leaving.take(2);
    // The staying layer took more than it asked for (free slices were
    // left): it keeps its two most recent, 2 and 5.
    const staying = holder(device, world, 2);
    staying.take(3);
    expect(staying.held).toEqual([4, 5, 2]);
    leaving.leave();
    expect(staying.pool.capacity).toBe(2);
    expect([...staying.relocated!.keys()]).toEqual([2, 5]);
    expect(staying.held.sort()).toEqual([0, 1]);
  });

  it("returns the default pair's 179 MB after the Viewer switches globes", () => {
    // The new globe's layers join before the old ones leave: 1024 layers
    // at the switch, back to 512 after (it stayed at 2048, 716 MB, with
    // the old default).
    const device = recordingDevice([]);
    const world = fakeWorld();
    const oldSurface = layer(world, device);
    const oldLights = layer(world, device);
    const newSurface = layer(world, device);
    const newLights = layer(world, device);
    expect(SlicePool.usage(world)!.capacity).toBe(1024);
    oldSurface.destroy();
    oldLights.destroy();
    const usage = SlicePool.usage(world)!;
    expect(usage.capacity).toBe(512);
    // 349 KB a slice with its mips: 179 MB for the pair, 179 MB returned.
    const sliceBytes = (256 * 256 * 4 * 4) / 3;
    expect(Math.round((512 * sliceBytes) / 1e6)).toBe(179);
    newSurface.destroy();
    newLights.destroy();
  });

  it("a remaining layer's tiles keep their slices, renumbered", () => {
    const device = recordingDevice([]);
    // The imagery each draw is pointed at.
    const pointed: number[] = [];
    const world = {
      ...fakeWorld(),
      setImagery: (_draw: unknown, packed: number) => void pointed.push(packed),
    } as unknown as World;
    const leaving = holder(device, world, 256);
    leaving.take(256);
    const imagery = layer(world, device);
    const internals = imagery as unknown as {
      slices: Map<Tile, { slice: number; used: number }>;
    };
    // The layer's slices sit above the 256 the pool shrinks to.
    const tiles = [tile(5, 1, 1), tile(5, 2, 1), tile(5, 3, 1)];
    tiles.forEach((t, i) => {
      internals.slices.set(t, {
        slice: imagery["pool"].take()!,
        used: i,
      });
    });
    expect([...internals.slices.values()].every((s) => s.slice >= 256)).toBe(
      true,
    );
    // The first tile is drawn: its draw points at its slice.
    const drawn = tiles[0]!;
    (drawn as { placement?: unknown }).placement = {
      draws: [{}],
    } as unknown as ModelPlacement;
    imagery.update(new Map([[drawn, 0]]));
    const before = internals.slices.get(drawn)!.slice;
    expect(pointed).toEqual([packImagery(before)]);
    leaving.leave();
    expect(SlicePool.usage(world)!.capacity).toBe(256);
    const slices = [...internals.slices.values()].map((s) => s.slice);
    expect(slices.length).toBe(3);
    expect(slices.every((s) => s < 256)).toBe(true);
    expect(new Set(slices).size).toBe(3);
    // Pointed again at once, at its renumbered slice, with no update: a
    // frozen tileset's draws are right too.
    const after = internals.slices.get(drawn)!.slice;
    expect(after).toBeLessThan(256);
    expect(pointed).toEqual([packImagery(before), packImagery(after)]);
    imagery.destroy();
  });
});
