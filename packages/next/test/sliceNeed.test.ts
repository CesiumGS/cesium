// What a frame needs of the imagery slices: the inspector's meter warns on
// it, not on how many hold imagery (the slices are an LRU cache, so "used"
// fills to capacity within about 10 seconds of flying, by design).
import { beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_IMAGERY_SLICES } from "../src/globe/GlobeImagery.ts";
import { SlicePool } from "../src/globe/SlicePool.ts";
import type { Tile } from "../src/streaming/Tile.ts";
import { fakeDevice, installGpuGlobals } from "./fakeGpu.ts";
import { fakeWorld, holder, layer, tile } from "./sliceFakes.ts";

describe("imagery slices: what a frame needs", () => {
  beforeAll(() => installGpuGlobals());

  it("counts slices drawn with, once each, and tiles waiting for one", () => {
    const world = fakeWorld();
    const imagery = layer(world);
    const internals = imagery as unknown as {
      slices: Map<Tile, { slice: number; used: number }>;
    };
    const parent = tile(3, 4, 2);
    const a = tile(4, 8, 4, parent);
    const b = tile(4, 9, 4, parent);
    const c = tile(4, 8, 5, parent);
    const own = tile(4, 0, 0);
    // The parent's slice, and one tile with its own.
    internals.slices.set(parent, { slice: 7, used: 0 });
    internals.slices.set(own, { slice: 3, used: 0 });
    // Plenty cached that this frame doesn't want.
    for (let i = 0; i < 100; i++) {
      internals.slices.set(tile(10, i, 0), { slice: 20 + i, used: 0 });
    }
    // a, b and c draw with the parent's slice while theirs composite.
    imagery.update(
      new Map([
        [a, 1],
        [b, 2],
        [c, 3],
        [own, 4],
      ]),
    );
    // Slices 7 and 3, and three tiles waiting for their own.
    expect(imagery.needed).toBe(5);
    const usage = SlicePool.usage(world)!;
    expect(usage.needed).toBe(5);
    expect(usage.capacity).toBe(DEFAULT_IMAGERY_SLICES);
    imagery.destroy();
  });

  it("sums the layers sharing the pool", () => {
    const device = fakeDevice({});
    const world = fakeWorld();
    const one = holder(device, world, 8);
    const two = holder(device, world, 8);
    one.needed = 3;
    two.needed = 4;
    expect(SlicePool.usage(world)!.needed).toBe(7);
  });

  it("the meter warns on the need, not on a full cache", async () => {
    // Imported here: the widgets read WebGPU's globals as they load.
    const { imagerySlicesRow } = await import("../widgets/engine.ts");
    // A full cache with a small need: the state of every flight after
    // 10 seconds, which read past 90% and warned.
    const cached = imagerySlicesRow({
      needed: 70,
      used: 512,
      capacity: 512,
      ceiling: 2048,
    });
    expect(cached.used / cached.capacity!).toBeLessThan(0.9);
    expect(cached.text).toBe("70 needed of 512 · 512 cached");
    // A need near capacity: imagery would thrash, so it warns.
    const thrashing = imagerySlicesRow({
      needed: 480,
      used: 512,
      capacity: 512,
      ceiling: 2048,
    });
    expect(thrashing.used / thrashing.capacity!).toBeGreaterThan(0.9);
    // Out of memory, the row says growth stopped, and why.
    const stopped = imagerySlicesRow({
      needed: 480,
      used: 512,
      capacity: 512,
      ceiling: 2048,
      warning: "imagery slices: out of GPU memory",
    });
    expect(stopped.text).toContain("stopped growing");
    expect(stopped.detail).toContain("out of GPU memory");
  });
});
