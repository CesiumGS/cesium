import { MAX_IMAGERY_SLICES } from "../render/layout.ts";
import type { World } from "../scene/World.ts";

/** A layer using the pool (GlobeImagery). */
export interface SliceUser {
  /** Its slices, most recently used first. */
  heldSlices(): number[];
  /**
   * The pool shrank: each slice it keeps is renumbered (`moved`, old to
   * new), and those not in `moved` are no longer its.
   */
  relocate(moved: ReadonlyMap<number, number>): void;
  /** Slices its tiles need this frame (`SlicePool.usage`). */
  readonly needed: number;
}

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
 * slice. It shrinks back to what the remaining layers asked for when one
 * leaves: they keep their most recently used slices, renumbered into the
 * smaller array (`SliceUser.relocate`). Each layer recycles its own least
 * recently used slices once it holds its share, so a late layer (night
 * lights resolve after the imagery) still gets slices.
 *
 * The slices are a cache, so "used" reaches capacity soon after a flight
 * starts, by design. What a frame needs (`needed`: the slices its tiles
 * draw with or wait for) is what to hold against capacity: past it, layers
 * recycle slices they need again and imagery thrashes.
 *
 * Bindless: the pool is already a physical cache addressed by index (a
 * virtual-texture-like design); with resource tables its slices could
 * become separate textures named by index without changing its users.
 */
export class SlicePool {
  private static readonly pools = new WeakMap<World, SlicePool>();

  /**
   * The world's pool, created on first use at `size` texels a side, with
   * room for `slices` more for `user`.
   */
  static acquire(
    device: GPUDevice,
    world: World,
    size: number,
    slices: number,
    user: SliceUser,
  ): SlicePool {
    let pool = SlicePool.pools.get(world);
    if (!pool || pool.destroyed) {
      pool = new SlicePool(device, world, size);
      SlicePool.pools.set(world, pool);
    }
    pool.reserve(pool.wanted + slices);
    pool.users.set(user, slices);
    return pool;
  }

  /**
   * A world's slices for the inspector's memory section, or undefined
   * without imagery:
   * - `needed`: what this frame's tiles need, summed over layers. Warn as
   *   it nears `capacity`.
   * - `used`: slices holding imagery (cached). It reaches capacity by
   *   design.
   * - `capacity`: the array's layers; `ceiling`: the most it may grow to.
   */
  static usage(world: World):
    | {
        needed: number;
        used: number;
        capacity: number;
        ceiling: number;
      }
    | undefined {
    const pool = SlicePool.pools.get(world);
    if (!pool || pool.destroyed) {
      return undefined;
    }
    let needed = 0;
    for (const user of pool.users.keys()) {
      needed += user.needed;
    }
    return {
      needed,
      used: pool.capacity - pool.free.length,
      capacity: pool.capacity,
      ceiling: pool.ceiling,
    };
  }

  texture: GPUTexture;
  /** Layers in the array. */
  capacity = 0;
  private free: number[] = [];
  /** Its layers, and the slices each asked for. */
  private readonly users = new Map<SliceUser, number>();
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

  /** Slices the users asked for together (what the pool grows toward). */
  private get wanted(): number {
    let wanted = 0;
    for (const slices of this.users.values()) {
      wanted += slices;
    }
    return wanted;
  }

  /** A user's fair share: past it, the user recycles its own slices first. */
  get share(): number {
    return Math.floor(this.capacity / Math.max(1, this.users.size));
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

  /**
   * A user leaves, its slices given back first. The pool shrinks to what
   * the others asked for; the last user destroys it.
   */
  release(user: SliceUser): void {
    if (!this.users.delete(user)) {
      return;
    }
    if (this.users.size > 0) {
      this.shrink();
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
    for (let i = target - 1; i >= oldCapacity; i--) {
      this.free.push(i);
    }
    this.capacity = target;
    // The new array bound before the old is destroyed: never a bind group
    // naming a destroyed texture, even between two calls.
    this.world.setImageryArray(
      this.texture.createView({ dimension: "2d-array" }),
    );
    old.destroy();
  }

  /**
   * Down to what the users asked for (within the ceiling). Each keeps its
   * most recently used slices, up to its request: slices below the new
   * capacity stay where they are, and the others move into free slices
   * below it. One copy, then a rebind, as for growing.
   */
  private shrink(): void {
    const wanted = this.wanted;
    const target = Math.min(wanted, this.ceiling);
    if (target >= this.capacity) {
      return;
    }
    // Under the ceiling, each user's request scaled down to fit.
    const scale = target / wanted;
    const kept = [...this.users].map(
      ([user, asked]) =>
        [user, user.heldSlices().slice(0, Math.floor(asked * scale))] as const,
    );
    const staying = new Set<number>();
    for (const [, slices] of kept) {
      for (const slice of slices) {
        if (slice < target) {
          staying.add(slice);
        }
      }
    }
    const free: number[] = [];
    for (let i = target - 1; i >= 0; i--) {
      if (!staying.has(i)) {
        free.push(i);
      }
    }
    // Requests sum to at most `target`, so a free slice is always left.
    const moves: Array<[from: number, to: number]> = [];
    const renumbered = kept.map(([user, slices]) => {
      const moved = new Map<number, number>();
      for (const slice of slices) {
        const to = slice < target ? slice : free.pop()!;
        moved.set(slice, to);
        if (to !== slice) {
          moves.push([slice, to]);
        }
      }
      return [user, moved] as const;
    });
    const old = this.texture;
    this.texture = this.create(target);
    const encoder = this.device.createCommandEncoder({
      label: "globe.slices.shrink",
    });
    for (let level = 0; level < this.mipLevelCount; level++) {
      const extent = Math.max(1, this.size >> level);
      encoder.copyTextureToTexture(
        { texture: old, mipLevel: level },
        { texture: this.texture, mipLevel: level },
        [extent, extent, target],
      );
      for (const [from, to] of moves) {
        encoder.copyTextureToTexture(
          { texture: old, mipLevel: level, origin: [0, 0, from] },
          { texture: this.texture, mipLevel: level, origin: [0, 0, to] },
          [extent, extent, 1],
        );
      }
    }
    this.device.queue.submit([encoder.finish()]);
    this.free = free;
    this.capacity = target;
    this.world.setImageryArray(
      this.texture.createView({ dimension: "2d-array" }),
    );
    old.destroy();
    for (const [user, moved] of renumbered) {
      user.relocate(moved);
    }
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
