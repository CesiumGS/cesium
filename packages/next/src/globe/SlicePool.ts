import { MAX_IMAGERY_SLICES } from "../render/layout.ts";
import type { World } from "../scene/World.ts";

/**
 * Growth on need: a layer's slices grow by a step (its first request) when
 * this frame's need passes this fraction of them.
 */
export const SLICE_GROW_AT = 0.9;
/**
 * And shrink by a step when the need stays below this fraction of the size
 * one step smaller, for `SLICE_SHRINK_AFTER` updates in a row. Growing at
 * 90% of the size and shrinking at 50% of the next size down leaves a wide
 * band in which nothing changes, so a need near either threshold doesn't
 * grow and shrink back.
 */
export const SLICE_SHRINK_AT = 0.5;
/** Updates in a row (about 10 seconds at 60 frames a second). */
export const SLICE_SHRINK_AFTER = 600;

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
 * A layer's slices also follow its need (`demand`): past 90% of what it
 * has, they grow by whole steps (its first request) up to the ceiling, and
 * they shrink back a step at a time, never below the first request, once
 * the need has stayed below half the smaller size for 600 updates.
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
    pool.users.set(user, { base: slices, asked: slices, low: 0 });
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
  /**
   * Its layers: the slices each first asked for (`base`, also the growth
   * step), has now (`asked`), and updates in a row with a low need.
   */
  private readonly users = new Map<
    SliceUser,
    { base: number; asked: number; low: number }
  >();
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
    for (const { asked } of this.users.values()) {
      wanted += asked;
    }
    return wanted;
  }

  /**
   * A user's share, its slices of the capacity: past it, the user recycles
   * its own slices first.
   */
  share(user: SliceUser): number {
    const asked = this.users.get(user)?.asked ?? 0;
    return Math.floor((asked * this.capacity) / Math.max(1, this.wanted));
  }

  /** The slices a user has now (grown or not), or 0 for a stranger. */
  asked(user: SliceUser): number {
    return this.users.get(user)?.asked ?? 0;
  }

  /**
   * A user's need this frame (`SliceUser.needed`), once per update: grows
   * its slices when the need passes 90% of them, shrinks them a step when
   * it has stayed low (`SLICE_SHRINK_AT`, `SLICE_SHRINK_AFTER`).
   */
  demand(user: SliceUser, needed: number): void {
    const d = this.users.get(user);
    if (!d) {
      return;
    }
    if (needed > SLICE_GROW_AT * d.asked) {
      d.low = 0;
      // Whole steps, the last one cut at the ceiling.
      const room = this.ceiling - (this.wanted - d.asked);
      let asked = d.asked;
      while (needed > SLICE_GROW_AT * asked && asked < room) {
        asked = Math.min(asked + d.base, room);
      }
      if (asked > d.asked) {
        d.asked = asked;
        this.reserve(this.wanted);
      }
      return;
    }
    const smaller = d.asked - d.base;
    if (smaller < d.base || needed >= SLICE_SHRINK_AT * smaller) {
      d.low = 0;
      return;
    }
    if (++d.low < SLICE_SHRINK_AFTER) {
      return;
    }
    d.low = 0;
    d.asked = smaller;
    this.shrink();
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
      ([user, { asked }]) =>
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
