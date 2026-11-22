// Fakes for the imagery slice tests (test/sliceNeed.test.ts and
// test/slicePoolShrink.test.ts): a world, a recording device, a layer that
// holds slices, and GlobeImagery over a provider that never loads.
import { deviceCapacities } from "../packages/core/src/gpu/limits.ts";
import {
  GlobeImagery,
  type GlobeImageryOptions,
} from "../packages/core/src/globe/GlobeImagery.ts";
import type { ImageryProvider } from "../packages/core/src/globe/ImageryProvider.ts";
import {
  SlicePool,
  type SliceUser,
} from "../packages/core/src/globe/SlicePool.ts";
import type { WorkerPool } from "../packages/core/src/io/WorkerPool.ts";
import { WebGpuImagery } from "../packages/core/src/render/world/contentResources.ts";
import type { World } from "../packages/core/src/scene/World.ts";
import type { RequestScheduler } from "../packages/core/src/streaming/RequestScheduler.ts";
import type { Tile } from "../packages/core/src/streaming/Tile.ts";
import { checkTextureCopy, fakeDevice } from "./fakeGpu.ts";

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

/** The world's imagery on a (fake) WebGPU device, as its mirror makes it. */
export function imageryOn(device: GPUDevice, world: World): WebGpuImagery {
  return new WebGpuImagery(
    { device, capacities: deviceCapacities(device) },
    world,
  );
}

/** A texture copy, as `recordingDevice` records it. */
export interface Copy {
  from: number;
  to: number;
  layers: number;
  mip: number;
  width: number;
}

/**
 * A device whose encoders check their texture copies as WebGPU would
 * (`checkTextureCopy`) and record them.
 */
export function recordingDevice(copies: Copy[]): GPUDevice {
  const device = fakeDevice({});
  const encoder = device.createCommandEncoder.bind(device);
  (device as { createCommandEncoder: unknown }).createCommandEncoder = (
    d?: GPUCommandEncoderDescriptor,
  ) => {
    // The fake encoder answers everything; only its copies are recorded.
    const inner = encoder(d);
    inner.copyTextureToTexture = (
      source: GPUTexelCopyTextureInfo,
      destination: GPUTexelCopyTextureInfo,
      size: number[],
    ) => {
      checkTextureCopy(source, destination, size);
      copies.push({
        from: (source.origin as number[] | undefined)?.[2] ?? 0,
        to: (destination.origin as number[] | undefined)?.[2] ?? 0,
        layers: size[2] ?? 1,
        mip: source.mipLevel ?? 0,
        width: size[0]!,
      });
    };
    return inner;
  };
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
  h.pool = SlicePool.acquire(
    imageryOn(device, world),
    world,
    256,
    slices,
    h,
    deviceCapacities(device).textureArrayLayers,
  );
  return h;
}

export const provider: ImageryProvider = {
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
  canceled: () => {},
  release: () => {},
} as unknown as RequestScheduler;

export function layer(
  world: World,
  device = fakeDevice({}),
  source: ImageryProvider = provider,
): GlobeImagery {
  return new GlobeImagery(
    imageryOn(device, world),
    world,
    source,
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

/**
 * A layer whose one source tile (level 0) is ready, so every job
 * composites, at the per-frame pass budget (23 tiles a frame).
 */
export function compositingLayer(
  world: World,
  device: GPUDevice,
  options: GlobeImageryOptions = {},
): GlobeImagery {
  const imagery = new GlobeImagery(
    imageryOn(device, world),
    world,
    { ...provider, maximumLevel: 0 },
    requests,
    {} as WorkerPool,
    options,
  );
  const internals = imagery as unknown as {
    sources: Map<string, unknown>;
    compositor: { pipelines?: object };
  };
  internals.compositor.pipelines = {
    fill: {},
    composite: {},
    downsample: {},
  };
  // A source tile on the device, as `ImageryDevice.createSource` makes one.
  internals.sources.set("0/0/0", {
    state: "ready",
    used: 0,
    texture: {
      texture: device.createTexture({
        size: [256, 256],
        format: "rgba8unorm",
        usage: 0,
      }),
      destroy: () => {},
    },
  });
  return imagery;
}
