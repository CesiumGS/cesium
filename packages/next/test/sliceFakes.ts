// Fakes for the imagery slice tests (test/sliceNeed.test.ts and
// test/slicePoolShrink.test.ts): a world, a recording device, a layer that
// holds slices, and GlobeImagery over a provider that never loads.
import { GlobeImagery } from "../src/globe/GlobeImagery.ts";
import type { ImageryProvider } from "../src/globe/ImageryProvider.ts";
import { SlicePool, type SliceUser } from "../src/globe/SlicePool.ts";
import type { WorkerPool } from "../src/io/WorkerPool.ts";
import type { RenderContext } from "../src/scene/RenderContext.ts";
import type { World } from "../src/scene/World.ts";
import type { RequestScheduler } from "../src/streaming/RequestScheduler.ts";
import type { Tile } from "../src/streaming/Tile.ts";
import { fakeDevice } from "./fakeGpu.ts";

/** A world that records binds; nothing else is needed of it here. */
export function fakeWorld(log: string[] = []): World {
  return {
    setImageryArray: (view: unknown) => {
      log.push(view === undefined ? "unbind" : "bind");
    },
    setImagery: () => {},
    setLights: () => {},
  } as unknown as World;
}

/** A device whose encoders record their texture copies. */
export function recordingDevice(copies: Array<{ from: number; to: number }>) {
  const device = fakeDevice({});
  (device as { createCommandEncoder: unknown }).createCommandEncoder = () => ({
    copyTextureToTexture: (
      source: { origin?: number[] },
      destination: { origin?: number[] },
      size: number[],
    ) => {
      copies.push({
        from: source.origin?.[2] ?? 0,
        to: destination.origin?.[2] ?? 0,
        ...(size[2] !== 1 ? { layers: size[2] } : {}),
      });
    },
    finish: () => ({}),
  });
  return device;
}

/** A layer that holds the slices it's given, most recent last given. */
export class Holder implements SliceUser {
  held: number[] = [];
  needed = 0;
  relocated?: ReadonlyMap<number, number>;
  pool!: SlicePool;
  heldSlices(): number[] {
    return [...this.held].reverse();
  }
  relocate(moved: ReadonlyMap<number, number>): void {
    this.relocated = moved;
    this.held = this.held.filter((s) => moved.has(s)).map((s) => moved.get(s)!);
  }
  take(n: number): void {
    for (let i = 0; i < n; i++) {
      this.held.push(this.pool.take()!);
    }
  }
  leave(): void {
    this.pool.give(this.held);
    this.held = [];
    this.pool.release(this);
  }
}

export function holder(
  device: GPUDevice,
  world: World,
  slices: number,
): Holder & { pool: SlicePool } {
  const h = new Holder();
  h.pool = SlicePool.acquire(device, world, 256, slices, h);
  return h;
}

const provider: ImageryProvider = {
  name: "test",
  tilingScheme: "webMercator",
  minimumLevel: 0,
  maximumLevel: 18,
  tileSize: 256,
  tileUrl: (x, y, level) => `https://imagery.test/${level}/${x}/${y}.png`,
  attributions: [],
};

/** Requests that never get a slot: sources stay unrequested. */
const requests = {
  register: () => {},
  unregister: () => {},
  tryAcquire: () => false,
  cancelled: () => {},
  release: () => {},
} as unknown as RequestScheduler;

export function layer(world: World, device = fakeDevice({})): GlobeImagery {
  return new GlobeImagery(
    { device } as unknown as RenderContext,
    world,
    provider,
    requests,
    {} as WorkerPool,
  );
}

/** A terrain tile stand-in: its quadtree address and rectangle. */
export function tile(level: number, x: number, y: number, parent?: Tile): Tile {
  const n = 2 ** level;
  const width = (2 * Math.PI) / n;
  const west = -Math.PI + x * width;
  return {
    parent,
    geometricError: 1e5 / n,
    globe: {
      level,
      x,
      y,
      rectangle: {
        west,
        east: west + width,
        north: 0.5 - y * 0.01,
        south: 0.49 - y * 0.01,
      },
    },
  } as unknown as Tile;
}
