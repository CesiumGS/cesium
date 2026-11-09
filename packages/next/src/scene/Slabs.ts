import { RangeAllocator } from "../gpu/RangeAllocator.ts";

/**
 * A world's geometry in slabs (CESIUM2_WEBGPU_PLAN.md §13.15, "Arena
 * slabs", after Bevy's mesh allocator): each slab is a vertex buffer and an
 * index buffer, each at most one storage binding (the device's
 * `maxStorageBufferBindingSize`, and a cap), suballocated by range.
 *
 * - A slab starts small and doubles (a copy into a larger buffer) up to its
 *   cap; a new slab opens only when no slab can grow to fit, within the
 *   world's budget. So a device whose largest binding is 128 MiB (a quarter
 *   of Android devices) still holds as much geometry as the budget allows.
 * - Everything a draw reads by arena offset (its mesh's streams, its
 *   instances' streams, its feature table's columns, a point set's anchors
 *   and lists) lives in its mesh's slab: offsets are slab-relative, and a
 *   batch (one mesh) binds its slab's group.
 * - A range larger than a slab's cap (a ten-million-point set is about
 *   280 MB) gets a slab of its own, made at that size at once (no doubling,
 *   no copy), if it fits the device's largest binding and the budget.
 * - An emptied slab other than the first is destroyed, a dedicated one
 *   included, so its memory returns.
 *
 * Bindless: with buffer arrays (or device addresses) a draw could name its
 * slab by index in its record and every slab stay bound at once; the
 * per-batch group switch then goes away, and nothing else changes.
 */
export interface Slab {
  readonly id: number;
  vertexBuffer: GPUBuffer;
  indexBuffer: GPUBuffer;
  readonly vertex: RangeAllocator;
  readonly index: RangeAllocator;
  /** The draw group binding this slab's vertex buffer (World). */
  drawGroup?: GPUBindGroup;
  /** Bumped when its buffers are replaced (grown). */
  generation: number;
}

export interface SlabOptions {
  /** Bytes of vertex data across slabs (the world's budget). */
  vertexBudget: number;
  indexBudget: number;
  /** The most one slab's vertex or index buffer grows to by doubling. */
  slabCap: number;
  /**
   * The device's largest storage binding (default `slabCap`): the most a
   * dedicated slab for one oversized range may hold.
   */
  bindingBytes?: number;
  /** A new slab's first sizes (it doubles from there). */
  initialVertexBytes?: number;
  initialIndexBytes?: number;
}

const STORAGE_COPY =
  GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;

export class Slabs {
  readonly slabs: Array<Slab | undefined> = [];
  private nextGeneration = 1;
  private readonly initialVertex: number;
  private readonly initialIndex: number;

  constructor(
    private readonly device: GPUDevice,
    readonly options: SlabOptions,
    /**
     * Before a slab's buffers are replaced: queued writes to them must land
     * first (World.flushUploads), as the copy reads them.
     */
    private readonly beforeReplace: () => void,
    /** After: its draw group and whatever else binds it are rebuilt. */
    private readonly replaced: (slab: Slab) => void,
  ) {
    const cap = options.slabCap;
    this.initialVertex = align(
      Math.min(
        cap,
        options.vertexBudget,
        options.initialVertexBytes ?? 16 << 20,
      ),
    );
    this.initialIndex = align(
      Math.min(cap, options.indexBudget, options.initialIndexBytes ?? 8 << 20),
    );
    this.open();
  }

  /** The first slab, which always exists. */
  get first(): Slab {
    return this.slabs[0]!;
  }

  get(id: number): Slab {
    const slab = this.slabs[id];
    if (!slab) {
      throw new Error(`World: no slab ${id}`);
    }
    return slab;
  }

  /** Bytes in use and capacity (the budget) across slabs. */
  get vertexUsed(): number {
    return this.sum((s) => s.vertex.used);
  }
  get indexUsed(): number {
    return this.sum((s) => s.index.used);
  }
  /** Bytes the slabs' buffers hold now (allocated GPU memory). */
  get allocatedBytes(): number {
    return this.sum((s) => s.vertexBuffer.size + s.indexBuffer.size);
  }

  /**
   * A slab with room for `vertexBytes` of vertex ranges and `indexBytes` of
   * indices (as one range each at most; growing if needed), or undefined
   * when none can make room within the budget.
   */
  pick(vertexBytes: number, indexBytes: number): Slab | undefined {
    for (const slab of this.slabs) {
      if (slab && this.reserve(slab, vertexBytes, indexBytes)) {
        return slab;
      }
    }
    if (this.refusal(vertexBytes, indexBytes) !== undefined) {
      return undefined;
    }
    // An oversized range's slab is its size, aligned, from the start.
    const { slabCap } = this.options;
    const slab = this.open(
      vertexBytes > slabCap ? align(vertexBytes) : this.initialVertex,
      indexBytes > slabCap ? align(indexBytes) : this.initialIndex,
    );
    return this.reserve(slab, vertexBytes, indexBytes) ? slab : undefined;
  }

  /**
   * Why `pick` can't open a slab for these sizes, naming the bytes asked
   * for and the limit (a device's binding or the world's budget); undefined
   * when it could.
   */
  refusal(vertexBytes: number, indexBytes: number): string | undefined {
    const { vertexBudget, indexBudget } = this.options;
    const binding = this.binding;
    if (vertexBytes > binding || indexBytes > binding) {
      return `a range of ${Math.max(vertexBytes, indexBytes).toLocaleString("en-US")} bytes is more than the device's largest storage binding, ${binding.toLocaleString("en-US")} bytes`;
    }
    const vertexNeed =
      this.vertexAllocated + Math.max(vertexBytes, this.initialVertex);
    if (vertexNeed > vertexBudget) {
      return `${vertexBytes.toLocaleString("en-US")} bytes of vertex data with ${this.vertexAllocated.toLocaleString("en-US")} allocated is more than the budget, ${vertexBudget.toLocaleString("en-US")} bytes`;
    }
    const indexNeed =
      this.indexAllocated + Math.max(indexBytes, this.initialIndex);
    if (indexNeed > indexBudget) {
      return `${indexBytes.toLocaleString("en-US")} bytes of indices with ${this.indexAllocated.toLocaleString("en-US")} allocated is more than the budget, ${indexBudget.toLocaleString("en-US")} bytes`;
    }
    return undefined;
  }

  private get binding(): number {
    return Math.max(this.options.slabCap, this.options.bindingBytes ?? 0);
  }

  /** A vertex range in `slab` (growing it), or undefined. */
  allocateVertex(slab: Slab, bytes: number): number | undefined {
    return (
      slab.vertex.allocate(bytes) ??
      (this.reserve(slab, bytes, 0) ? slab.vertex.allocate(bytes) : undefined)
    );
  }

  /** An index range in `slab` (growing it), or undefined. */
  allocateIndex(slab: Slab, bytes: number): number | undefined {
    return (
      slab.index.allocate(bytes) ??
      (this.reserve(slab, 0, bytes) ? slab.index.allocate(bytes) : undefined)
    );
  }

  releaseVertex(slab: Slab, offset: number, bytes: number): void {
    slab.vertex.release(offset, bytes);
    this.tidy(slab);
  }

  releaseIndex(slab: Slab, offset: number, bytes: number): void {
    slab.index.release(offset, bytes);
    this.tidy(slab);
  }

  destroy(): void {
    for (const slab of this.slabs) {
      slab?.vertexBuffer.destroy();
      slab?.indexBuffer.destroy();
    }
    this.slabs.length = 0;
  }

  private get vertexAllocated(): number {
    return this.sum((s) => s.vertexBuffer.size);
  }
  private get indexAllocated(): number {
    return this.sum((s) => s.indexBuffer.size);
  }

  private sum(f: (slab: Slab) => number): number {
    let total = 0;
    for (const slab of this.slabs) {
      if (slab) {
        total += f(slab);
      }
    }
    return total;
  }

  /**
   * Whether `slab` has (or grows to have) a free range of each size:
   * buffers double, copied, up to the cap and the budget.
   */
  private reserve(
    slab: Slab,
    vertexBytes: number,
    indexBytes: number,
  ): boolean {
    const { slabCap, vertexBudget, indexBudget } = this.options;
    const target = (
      allocator: RangeAllocator,
      bytes: number,
      allocated: number,
      budget: number,
    ): number | undefined => {
      if (bytes === 0 || allocator.largestFree >= align(bytes)) {
        return allocator.capacity;
      }
      // Room at the end (a free tail grows with the buffer) and doubling.
      let size = allocator.capacity;
      while (size < slabCap && freeTail(allocator, size) < align(bytes)) {
        size = Math.min(slabCap, size * 2);
      }
      if (freeTail(allocator, size) < align(bytes)) {
        return undefined;
      }
      return allocated - allocator.capacity + size <= budget ? size : undefined;
    };
    const v = target(
      slab.vertex,
      vertexBytes,
      this.vertexAllocated,
      vertexBudget,
    );
    const i = target(slab.index, indexBytes, this.indexAllocated, indexBudget);
    if (v === undefined || i === undefined) {
      return false;
    }
    if (v > slab.vertex.capacity || i > slab.index.capacity) {
      this.grow(slab, v, i);
    }
    return true;
  }

  private grow(slab: Slab, vertexBytes: number, indexBytes: number): void {
    this.beforeReplace();
    const encoder = this.device.createCommandEncoder({
      label: "world.slab.grow",
    });
    const old: GPUBuffer[] = [];
    if (vertexBytes > slab.vertex.capacity) {
      const next = this.createVertex(slab.id, vertexBytes);
      encoder.copyBufferToBuffer(
        slab.vertexBuffer,
        0,
        next,
        0,
        slab.vertex.capacity,
      );
      old.push(slab.vertexBuffer);
      slab.vertexBuffer = next;
      slab.vertex.grow(vertexBytes);
    }
    if (indexBytes > slab.index.capacity) {
      const next = this.createIndex(slab.id, indexBytes);
      encoder.copyBufferToBuffer(
        slab.indexBuffer,
        0,
        next,
        0,
        slab.index.capacity,
      );
      old.push(slab.indexBuffer);
      slab.indexBuffer = next;
      slab.index.grow(indexBytes);
    }
    this.device.queue.submit([encoder.finish()]);
    for (const b of old) {
      b.destroy(); // released once the copy has run
    }
    slab.generation = this.nextGeneration++;
    this.replaced(slab);
  }

  private open(
    vertexBytes = this.initialVertex,
    indexBytes = this.initialIndex,
  ): Slab {
    let id = this.slabs.findIndex((s) => s === undefined);
    if (id < 0) {
      id = this.slabs.length;
    }
    const slab: Slab = {
      id,
      vertexBuffer: this.createVertex(id, vertexBytes),
      indexBuffer: this.createIndex(id, indexBytes),
      vertex: new RangeAllocator(vertexBytes, 4),
      index: new RangeAllocator(indexBytes, 4),
      generation: this.nextGeneration++,
    };
    this.slabs[id] = slab;
    if (id > 0) {
      this.replaced(slab);
    }
    return slab;
  }

  /** Closes `slab` if it is empty and not the first (after releases). */
  tidy(slab: Slab): void {
    if (slab.id === 0 || slab.vertex.used > 0 || slab.index.used > 0) {
      return;
    }
    this.beforeReplace();
    slab.vertexBuffer.destroy();
    slab.indexBuffer.destroy();
    this.slabs[slab.id] = undefined;
    slab.generation = this.nextGeneration++;
    this.replaced(slab);
  }

  private createVertex(id: number, size: number): GPUBuffer {
    return this.device.createBuffer({
      label: `world.slab${id}.vertices`,
      size,
      // COPY_SRC: harnesses read back what kernels write (point anchors),
      // and the slab copies itself when it grows.
      usage: STORAGE_COPY,
    });
  }

  private createIndex(id: number, size: number): GPUBuffer {
    return this.device.createBuffer({
      label: `world.slab${id}.indices`,
      size,
      // STORAGE: ray casts read triangles (`castRays`).
      usage: GPUBufferUsage.INDEX | STORAGE_COPY,
    });
  }
}

function align(bytes: number): number {
  return Math.ceil(bytes / 4) * 4;
}

/** The free range at the end of `allocator` once its space is `size`. */
function freeTail(allocator: RangeAllocator, size: number): number {
  return allocator.tailFree + (size - allocator.capacity);
}
