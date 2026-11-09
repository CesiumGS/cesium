import { MAX_IMAGERY_SLICES } from "../scene/contentLimits.ts";

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
/**
 * Ticks a growth's error scope may take to resolve (about 2 seconds at 60
 * frames a second). Browsers always resolve it; past this the pending
 * array is freed and growth stops as after an out-of-memory error.
 */
export const SLICE_GROWTH_TIMEOUT = 120;
/**
 * Ticks after growth stopped (out of memory, or a scope that timed out)
 * before it tries once more (about 10 seconds at 60 frames a second). A
 * second failure stops it for the pool's life.
 */
export const SLICE_GROWTH_RETRY_AFTER = 600;

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

/** What the pool asks of a world: to bind its array of slices. */
export interface SliceWorld {
  setImageryArray(view: GPUTextureView | undefined): void;
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
 * - Growing on need allocates the larger array inside an out-of-memory
 *   error scope and switches to it once the scope reports no error: at
 *   most one growth is in flight, so at most one whole-array copy a frame.
 *   On an error, or a scope still open after 120 ticks, the pool stays at
 *   its size and says so once (`usage().warning`). It tries once more
 *   after 600 ticks; a second failure stops growth for the pool's life.
 * - At the ceiling, layers short of slices take whole steps from layers
 *   holding more than their part of it, parts in proportion to need.
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
  private static readonly pools = new WeakMap<SliceWorld, SlicePool>();

  /**
   * The world's pool, created on first use at `size` texels a side, with
   * room for `slices` more for `user`.
   */
  static acquire(
    device: GPUDevice,
    world: SliceWorld,
    size: number,
    slices: number,
    user: SliceUser,
  ): SlicePool {
    let pool = SlicePool.pools.get(world);
    if (!pool || pool.destroyed) {
      pool = new SlicePool(device, world, size);
      SlicePool.pools.set(world, pool);
    }
    if (!Number.isInteger(slices) || slices <= 0) {
      throw new RangeError(
        `SlicePool: slices must be a positive integer, not ${slices}`,
      );
    }
    pool.reserve(pool.wanted + slices);
    pool.users.set(user, { base: slices, asked: slices, low: 0, need: 0 });
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
   * - `warning`: why it stopped growing below the ceiling (out of memory,
   *   or an error scope that didn't resolve).
   */
  static usage(world: SliceWorld):
    | {
        needed: number;
        used: number;
        capacity: number;
        ceiling: number;
        warning?: string;
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
      ...(pool.warning ? { warning: pool.warning } : {}),
    };
  }

  texture: GPUTexture;
  /** Layers in the array. */
  capacity = 0;
  private free: number[] = [];
  /**
   * Its layers: the slices each first asked for (`base`, also the growth
   * step), has now (`asked`), updates in a row with a low need, and the
   * last need it reported.
   */
  private readonly users = new Map<
    SliceUser,
    { base: number; asked: number; low: number; need: number }
  >();
  private destroyed = false;
  /** The most it may grow to: the ceiling, or less after out of memory. */
  private limit: number;
  /** The larger array being allocated (`grow`), and the tick it began. */
  private pending?: { texture: GPUTexture; target: number; since: number };
  /** Bumped by every resize, so a growth that resolves late is dropped. */
  private version = 0;
  /**
   * Ticks: updates of the first user (every layer updates once a frame).
   * Times growth's error scopes and its retry.
   */
  private tick = 0;
  /** After growth stopped: the tick to try again at, while a retry is left. */
  private retryAt?: number;
  private retried = false;
  /** Why growth stopped below the ceiling, once it has. */
  private warning?: string;
  readonly mipLevelCount: number;

  private constructor(
    private readonly device: GPUDevice,
    private readonly world: SliceWorld,
    readonly size: number,
  ) {
    this.mipLevelCount = Math.log2(size) + 1;
    this.texture = this.create(1);
    this.limit = this.ceiling;
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
   * its own slices first. Below what it asked for only at the ceiling, or
   * while a larger array is allocated.
   */
  share(user: SliceUser): number {
    const asked = this.users.get(user)?.asked ?? 0;
    return Math.min(
      asked,
      Math.floor((asked * this.capacity) / Math.max(1, this.wanted)),
    );
  }

  /** The slices a user has now (grown or not), or 0 for a stranger. */
  asked(user: SliceUser): number {
    return this.users.get(user)?.asked ?? 0;
  }

  /** A larger array is being allocated: shares may lag what was asked. */
  get resizing(): boolean {
    return this.pending !== undefined;
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
    if (this.users.keys().next().value === user) {
      this.advance();
    }
    d.need = needed;
    if (needed > SLICE_GROW_AT * d.asked) {
      d.low = 0;
      this.raise(user, d, needed);
      this.grow();
      return;
    }
    // Whole steps down, so a growth cut at the ceiling returns to the base.
    const smaller = Math.max(d.base, Math.ceil(d.asked / d.base - 1) * d.base);
    if (d.asked <= d.base || needed >= SLICE_SHRINK_AT * smaller) {
      d.low = 0;
      this.grow();
      return;
    }
    if (++d.low < SLICE_SHRINK_AFTER) {
      this.grow();
      return;
    }
    d.low = 0;
    d.asked = smaller;
    this.shrink();
  }

  /**
   * More slices for a user whose need passed 90% of them: whole steps up to
   * what the need wants, within the room under the limit. Where the limit
   * binds, steps taken from users holding more than their part.
   */
  private raise(
    user: SliceUser,
    d: { base: number; asked: number; low: number; need: number },
    needed: number,
  ): void {
    let want = d.asked;
    while (needed > SLICE_GROW_AT * want) {
      want += d.base;
    }
    const room = this.limit - (this.wanted - d.asked);
    if (room > d.asked) {
      d.asked = Math.min(want, room);
    }
    if (d.asked >= want) {
      return;
    }
    // Each user's part of the limit, in proportion to need, at least its
    // first request.
    let total = 0;
    for (const u of this.users.values()) {
      total += u.need;
    }
    const part = (u: { base: number; need: number }) =>
      Math.max(u.base, Math.floor((this.limit * u.need) / Math.max(1, total)));
    const mine = Math.min(want, part(d));
    while (d.asked + d.base <= mine) {
      let donor: typeof d | undefined;
      for (const [other, o] of this.users) {
        if (other !== user && o.asked - d.base >= Math.max(o.base, part(o))) {
          donor = o;
          break;
        }
      }
      if (!donor) {
        break;
      }
      // The donor gives back what's over its share on its next update.
      donor.asked -= d.base;
      donor.low = 0;
      d.asked += d.base;
    }
  }

  /**
   * One tick: times out a growth whose error scope hasn't resolved, and
   * lifts the limit for the one retry once its cool-down is over.
   */
  private advance(): void {
    this.tick++;
    const pending = this.pending;
    if (pending && this.tick - pending.since >= SLICE_GROWTH_TIMEOUT) {
      // Freed now; its scope, if it ever resolves, finds it stale.
      this.pending = undefined;
      pending.texture.destroy();
      this.stopGrowing(
        `the error scope growing to ${pending.target} layers didn't resolve in ${SLICE_GROWTH_TIMEOUT} ticks`,
      );
    }
    if (this.retryAt !== undefined && this.tick >= this.retryAt) {
      this.retryAt = undefined;
      this.retried = true;
      this.limit = this.ceiling;
    }
  }

  /**
   * Toward what the users asked for (within the limit): a larger array is
   * allocated inside an out-of-memory error scope, and switched to once the
   * scope reports no error. One at a time.
   */
  private grow(): void {
    if (this.pending || this.destroyed) {
      return;
    }
    const target = Math.min(this.wanted, this.limit);
    if (target <= this.capacity) {
      return;
    }
    const version = this.version;
    this.device.pushErrorScope("out-of-memory");
    const texture = this.create(target);
    const pending = { texture, target, since: this.tick };
    this.pending = pending;
    const settle = (error: unknown) => {
      if (this.pending !== pending) {
        // Timed out: already freed.
        return;
      }
      this.pending = undefined;
      // Resized meanwhile (a layer joined or left), or no longer wanted
      // this large: dropped, asked again later. An error for a size no
      // longer asked for says nothing about the next.
      if (
        this.destroyed ||
        version !== this.version ||
        target > Math.min(this.wanted, this.limit)
      ) {
        texture.destroy();
        return;
      }
      if (error) {
        texture.destroy();
        this.stopGrowing(`out of GPU memory growing to ${target} layers`);
        return;
      }
      if (this.retried) {
        this.warning = undefined;
      }
      this.switchTo(texture, target);
    };
    void this.device.popErrorScope().then(settle, settle);
  }

  /**
   * Growth failed (out of memory, or a scope that timed out): stay at this
   * size, scale the users' slices to fit it, and warn once. It tries once
   * more after `SLICE_GROWTH_RETRY_AFTER` ticks.
   */
  private stopGrowing(why: string): void {
    const wanted = this.wanted;
    this.limit = this.capacity;
    for (const d of this.users.values()) {
      d.asked = Math.floor((d.asked * this.capacity) / wanted);
    }
    this.warning ??= `imagery slices: ${why}; staying at ${this.capacity}`;
    if (!this.retried) {
      this.retryAt = this.tick + SLICE_GROWTH_RETRY_AFTER;
    }
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
      // Even when nothing shrinks: a growth pending for the leaver's
      // slices is dropped, not switched to.
      this.version++;
      this.shrink();
      return;
    }
    this.destroyed = true;
    // Unbind before destroying: the world's draw bind group names the array,
    // and a destroyed texture in a submit fails the whole frame.
    this.world.setImageryArray(undefined);
    this.texture.destroy();
  }

  /** Room for `layers` slices (within the limit), copying what's there. */
  private reserve(layers: number): void {
    const target = Math.min(layers, this.limit);
    if (target <= this.capacity) {
      return;
    }
    this.switchTo(this.create(target), target);
  }

  /** Switches to a larger array of `target` layers, copying what's there. */
  private switchTo(texture: GPUTexture, target: number): void {
    this.version++;
    const old = this.texture;
    const oldCapacity = this.capacity;
    this.texture = texture;
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
    const target = Math.min(wanted, this.limit);
    if (target >= this.capacity) {
      return;
    }
    this.version++;
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
