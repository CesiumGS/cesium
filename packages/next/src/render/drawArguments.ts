import type { DrawConstants } from "./drawConstants.ts";
import {
  BATCH_WORD,
  INDIRECT_SIZE,
  PATCH_CHUNK_CELLS,
  RECORD_WORDS,
} from "./layout.ts";

/** What a batch's draw needs to know of it (scene/world/types.ts `Batch`). */
export interface ArgumentBatch {
  /** Its row in the batch table and the draw arguments. */
  readonly index: number;
  /** Its first slot in the item lists. */
  readonly itemBase: number;
  /** Its draw items (records without instances, and instances). */
  readonly items: number;
  /** A point set: six vertices per point, without indices. */
  readonly points: boolean;
  /**
   * A patch draw (`PatchDraw`): the arguments are an indexed draw's over
   * the patch chunk's indices (`patchIndices`), one instance a chunk of
   * cells, which are `chunks`, the draw's own list.
   */
  readonly patches: boolean;
  readonly chunks: GPUBuffer | undefined;
  readonly mesh: { readonly indexCount: number; readonly firstIndex: number };
}

/** The indices of one chunk of PATCH_CHUNK_CELLS² cells over its (n + 1)² vertices, row by row: each cell's two triangles, counter-clockwise in (i, j). */
export function patchChunkIndices(cells = PATCH_CHUNK_CELLS): Uint16Array {
  const stride = cells + 1;
  const indices = new Uint16Array(cells * cells * 6);
  let at = 0;
  for (let j = 0; j < cells; j++) {
    for (let i = 0; i < cells; i++) {
      const a = j * stride + i;
      const b = a + 1;
      const c = a + stride + 1;
      const d = a + stride;
      indices.set([a, b, c, a, c, d], at);
      at += 6;
    }
  }
  return indices;
}

/**
 * The draw-arguments seam (plan 5a's call 37): a world's indirect draw
 * arguments, the item lists its batches draw from, and the one place its
 * content draws are issued (`drawBatch`). A record's pointer to its
 * arguments is its batch (`slotOf`): no record word is added for it. On
 * the GPU the cull kernels reach the arguments only through cullTables.slang's
 * accessors (`argumentSlot`, `countInstance`, `storeIndexedArguments`,
 * `storeArgument`). This class is the only CPU writer of its buffers; the
 * world binds them (`buffer`, `itemList`) in the cull's groups.
 *
 * Today each batch is one draw, its items bound as a vertex buffer at the
 * batch's slice of the list. Multi-draw indirect (the first instance in
 * the arguments, one list bound once) or GPU-driven submission replaces
 * this class's emulation, not its callers (CESIUM2_WEBGPU_PLAN.md §7.1,
 * "design for it; don't build it").
 */
export class DrawArguments {
  private arguments: GPUBuffer;
  private items: GPUBuffer;
  private direct: GPUBuffer;
  /** The one index buffer every patch chunk draws over. */
  private readonly patchIndices: GPUBuffer;

  /**
   * `live`: whether a record slot holds a draw (a removed draw's record
   * keeps its last batch word, which may name another batch by then).
   */
  constructor(
    private readonly device: GPUDevice,
    private readonly constants: DrawConstants,
    private readonly live: (record: number) => boolean,
    batchRows: number,
    items: number,
  ) {
    this.arguments = this.createArguments(batchRows);
    [this.items, this.direct] = this.createLists(items);
    const indices = patchChunkIndices();
    this.patchIndices = device.createBuffer({
      label: "world.patchIndices",
      size: Math.ceil(indices.byteLength / 4) * 4,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(this.patchIndices, 0, indices);
  }

  /**
   * Five 32-bit words a batch (`drawIndexedIndirect`): index count,
   * instance count (counted by the cull, cleared per view), first index,
   * base vertex, first instance. A point set's first four read as a
   * non-indexed draw's. Replaced by `growBatches`.
   */
  get buffer(): GPUBuffer {
    return this.arguments;
  }

  /**
   * Visible draw items, compacted per batch by the cull kernels. Replaced
   * by `growItems`.
   */
  get itemList(): GPUBuffer {
    return this.items;
  }

  /**
   * The byte offset in `buffer` of draw record `record`'s batch's
   * arguments: the record's pointer to its indirect arguments (its batch
   * word). A RangeError for a slot that holds no draw.
   */
  slotOf(record: number): number {
    if (
      !Number.isInteger(record) ||
      record < 0 ||
      record >= this.constants.rows ||
      !this.live(record)
    ) {
      throw new RangeError(`slotOf: no draw in record ${record}`);
    }
    return (
      this.constants.u32[record * RECORD_WORDS + BATCH_WORD]! * INDIRECT_SIZE
    );
  }

  /** Arguments for `rows` batches (the old ones are rewritten per view). */
  growBatches(rows: number): void {
    this.arguments.destroy();
    this.arguments = this.createArguments(rows);
  }

  /** Item lists for `items` items (rewritten by the cull and the batches). */
  growItems(items: number): void {
    this.items.destroy();
    this.direct.destroy();
    [this.items, this.direct] = this.createLists(items);
  }

  /**
   * The "direct" list: every batch's items at its slice (`itemBase`), as
   * the batches were last laid out.
   */
  writeDirect(list: Uint32Array): void {
    this.device.queue.writeBuffer(this.direct, 0, list);
  }

  /**
   * Clears the first `batches` batches' arguments before a view's cull,
   * which counts into their instance counts and writes the rest.
   */
  clear(encoder: GPUCommandEncoder, batches: number): void {
    encoder.clearBuffer(
      this.arguments,
      0,
      Math.max(INDIRECT_SIZE, batches * INDIRECT_SIZE),
    );
  }

  /**
   * A batch's draw, after its slab, pipeline and groups are bound: its
   * slice of the item list, then indexed, or for a point set six vertices
   * per point without indices. "direct" draws every item without the
   * cull's arguments (point sets and patch draws draw only as a view's
   * cull and dice listed them: their chunks are the instances). Returns
   * whether it replaced the bound index buffer (a patch draw binds the one
   * all chunks share): the caller binds its slab's again before the next
   * draw that reads one.
   */
  drawBatch(
    pass: GPURenderPassEncoder | GPURenderBundleEncoder,
    batch: ArgumentBatch,
    direct: boolean,
    pick = false,
  ): boolean {
    if (batch.patches) {
      if (!direct && batch.chunks) {
        pass.setVertexBuffer(0, batch.chunks);
        pass.setIndexBuffer(this.patchIndices, "uint16");
        pass.drawIndexedIndirect(this.arguments, batch.index * INDIRECT_SIZE);
        return true;
      }
      return false;
    }
    pass.setVertexBuffer(
      0,
      direct ? this.direct : this.items,
      batch.itemBase * 4,
    );
    const { mesh } = batch;
    if (batch.points) {
      if (!direct) {
        pass.drawIndirect(this.arguments, batch.index * INDIRECT_SIZE);
      }
    } else if (pick) {
      // The pick variant's vertex stage reads its own indices: the same
      // arguments as a non-indexed draw's (the base vertex and first
      // instance are 0), `indexCount` vertices from `firstIndex`.
      if (direct) {
        pass.draw(mesh.indexCount, batch.items, mesh.firstIndex, 0);
      } else {
        pass.drawIndirect(this.arguments, batch.index * INDIRECT_SIZE);
      }
    } else if (direct) {
      pass.drawIndexed(mesh.indexCount, batch.items, mesh.firstIndex, 0, 0);
    } else {
      pass.drawIndexedIndirect(this.arguments, batch.index * INDIRECT_SIZE);
    }
    return false;
  }

  destroy(): void {
    this.arguments.destroy();
    this.items.destroy();
    this.direct.destroy();
    this.patchIndices.destroy();
  }

  private createArguments(rows: number): GPUBuffer {
    return this.device.createBuffer({
      label: "world.indirect",
      size: rows * INDIRECT_SIZE,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.INDIRECT |
        GPUBufferUsage.COPY_SRC |
        GPUBufferUsage.COPY_DST,
    });
  }

  private createLists(items: number): [GPUBuffer, GPUBuffer] {
    return [
      this.device.createBuffer({
        label: "world.itemList",
        size: items * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX,
      }),
      this.device.createBuffer({
        label: "world.directList",
        size: items * 4,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      }),
    ];
  }
}
