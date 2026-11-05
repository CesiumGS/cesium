import { MAX_IMAGERY_SLICES } from "../render/layout.ts";
import type { World } from "../scene/World.ts";

/**
 * A world's globe imagery slices: one `texture_2d_array` that every
 * imagery layer of the world composites into (surface imagery and night
 * lights alike), bound once for all of them (CESIUM2_WEBGPU_PLAN.md §13.15:
 * one array instead of one per layer keeps the fragment stage within the
 * base tier's 16 sampled textures).
 *
 * Capacity is data: the pool starts at what its first layer asks for and
 * grows (a copy into a larger array, then a rebind) as layers join, up to
 * the device's `maxTextureArrayLayers` and the 12 bits a record has for a
 * slice. Each layer recycles its own least recently used slices once it
 * holds its share, so a late layer (night lights resolve after the
 * imagery) still gets slices.
 *
 * Bindless: the pool is already a physical cache addressed by index (a
 * virtual-texture-like design); with resource tables its slices could
 * become separate textures named by index without changing its users.
 */
export class SlicePool {
  private static readonly pools = new WeakMap<World, SlicePool>();

  /** The world's pool, created on first use at `size` texels a side. */
  static acquire(
    device: GPUDevice,
    world: World,
    size: number,
    slices: number,
  ): SlicePool {
    let pool = SlicePool.pools.get(world);
    if (!pool || pool.destroyed) {
      pool = new SlicePool(device, world, size);
      SlicePool.pools.set(world, pool);
    }
    pool.users++;
    pool.reserve(pool.wanted + slices);
    pool.wanted += slices;
    return pool;
  }

  /**
   * A world's slices in use, the array's layers, and the most it may grow
   * to (the inspector's memory section), or undefined without imagery.
   */
  static usage(
    world: World,
  ): { used: number; capacity: number; ceiling: number } | undefined {
    const pool = SlicePool.pools.get(world);
    if (!pool || pool.destroyed) {
      return undefined;
    }
    return {
      used: pool.capacity - pool.free.length,
      capacity: pool.capacity,
      ceiling: pool.ceiling,
    };
  }

  texture: GPUTexture;
  /** Layers in the array. */
  capacity = 0;
  private readonly free: number[] = [];
  private users = 0;
  /** Slices the users asked for together (what the pool grows toward). */
  private wanted = 0;
  private destroyed = false;
  readonly mipLevelCount: number;

  private constructor(
    private readonly device: GPUDevice,
    private readonly world: World,
    readonly size: number,
  ) {
    this.mipLevelCount = Math.log2(size) + 1;
    this.texture = this.create(1);
  }

  /** The most slices any pool can have on this device. */
  get ceiling(): number {
    return Math.min(
      this.device.limits.maxTextureArrayLayers,
      MAX_IMAGERY_SLICES,
    );
  }

  /** A user's fair share: past it, the user recycles its own slices first. */
  get share(): number {
    return Math.floor(this.capacity / Math.max(1, this.users));
  }

  /** A free slice, or undefined when none is left. */
  take(): number | undefined {
    return this.free.pop();
  }

  /** Returns slices to the pool. */
  give(slices: Iterable<number>): void {
    for (const slice of slices) {
      this.free.push(slice);
    }
  }

  /** A user leaves with its slices (given back first); the last destroys. */
  release(slices: number): void {
    this.wanted = Math.max(0, this.wanted - slices);
    if (--this.users > 0) {
      return;
    }
    this.destroyed = true;
    // Unbind before destroying: the world's draw bind group names the array,
    // and a destroyed texture in a submit fails the whole frame.
    this.world.setImageryArray(undefined);
    this.texture.destroy();
  }

  /** Room for `layers` slices (within the ceiling), copying what's there. */
  private reserve(layers: number): void {
    const target = Math.min(layers, this.ceiling);
    if (target <= this.capacity) {
      return;
    }
    const old = this.texture;
    const oldCapacity = this.capacity;
    this.texture = this.create(target);
    if (oldCapacity > 0) {
      const encoder = this.device.createCommandEncoder({
        label: "globe.slices.grow",
      });
      for (let level = 0; level < this.mipLevelCount; level++) {
        const extent = Math.max(1, this.size >> level);
        encoder.copyTextureToTexture(
          { texture: old, mipLevel: level },
          { texture: this.texture, mipLevel: level },
          [extent, extent, oldCapacity],
        );
      }
      this.device.queue.submit([encoder.finish()]);
    }
    old.destroy();
    for (let i = target - 1; i >= oldCapacity; i--) {
      this.free.push(i);
    }
    this.capacity = target;
    this.world.setImageryArray(
      this.texture.createView({ dimension: "2d-array" }),
    );
  }

  private create(layers: number): GPUTexture {
    return this.device.createTexture({
      label: "globe.slices",
      size: [this.size, this.size, layers],
      format: "rgba8unorm",
      mipLevelCount: this.mipLevelCount,
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.STORAGE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.COPY_SRC,
    });
  }
}
