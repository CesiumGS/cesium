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
  fakeWorld,
  holder,
  layer,
  recordingDevice,
  tile,
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

  it("covers the measured views with margin", () => {
    // Measured flights drew at most 61 tiles in a view; each needs its own
    // slice, and while it composites, at worst an ancestor's too.
    const worstDrawn = 61;
    expect(2 * worstDrawn).toBeLessThan(DEFAULT_IMAGERY_SLICES / 2);
  });
});

describe("imagery slices: the pool shrinks when a layer leaves", () => {
  beforeAll(() => installGpuGlobals());

  it("to what the others asked for, their slices renumbered below it", () => {
    const copies: Array<{ from: number; to: number }> = [];
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
    expect(staying.held.every((s) => s < 4)).toBe(true);
    expect(new Set(staying.held).size).toBe(3);
    const moved = copies.filter((c) => c.from !== c.to);
    expect(moved.length).toBe(3 * pool.mipLevelCount);
    for (const [from, to] of staying.relocated!) {
      expect(moved).toContainEqual({ from, to });
    }
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
    // Its drawn tiles' draws still name the old slices: busy (its tileset
    // stays active) until the next update points them again.
    (imagery as unknown as { pipelines: object }).pipelines = {};
    expect(imagery.busy).toBe(true);
    imagery.update(new Map(tiles.map((t) => [t, 0])));
    expect(imagery.busy).toBe(false);
    // Pointed again, at its renumbered slice.
    const after = internals.slices.get(drawn)!.slice;
    expect(after).toBeLessThan(256);
    expect(pointed).toEqual([packImagery(before), packImagery(after)]);
    imagery.destroy();
  });
});
