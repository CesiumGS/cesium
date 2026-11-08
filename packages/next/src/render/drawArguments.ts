import type { DrawConstants } from "./drawConstants.ts";
import { BATCH_WORD, INDIRECT_SIZE, RECORD_WORDS } from "./layout.ts";

/** What a batch's draw needs to know of it (scene/World.ts `Batch`). */
export interface ArgumentBatch {
  /** Its row in the batch table and the draw arguments. */
  readonly index: number;
  /** Its first slot in the item lists. */
  readonly itemBase: number;
  /** Its draw items (records without instances, and instances). */
  readonly items: number;
  /** A point set: six vertices per point, without indices. */
  readonly points: boolean;
  readonly mesh: { readonly indexCount: number; readonly firstIndex: number };
}

/**
 * The draw-arguments seam (plan 5a's call 37): a world's indirect draw
 * arguments, the item lists its batches draw from, and the one place its
 * content draws are issued (`drawBatch`). A record's pointer to its
 * arguments is its batch (`slotOf`): no record word is added for it.
 *
 * Today each batch is one draw, its items bound as a vertex buffer at the
 * batch's slice of the list. Multi-draw indirect (the first instance in
 * the arguments, one list bound once) or GPU-driven submission replaces
 * this class's emulation, not its callers (CESIUM2_WEBGPU_PLAN.md §7.1,
 * "design for it; don't build it").
 */
export class DrawArguments {
  /**
   * Five 32-bit words a batch (`drawIndexedIndirect`): index count,
   * instance count (counted by the cull, cleared per view), first index,
   * base vertex, first instance. A point set's first four read as a
   * non-indexed draw's.
   */
  buffer: GPUBuffer;
  /** Visible draw items, compacted per batch by the cull kernels. */
  itemList: GPUBuffer;
  /** All draw items per batch, for "direct" submission. */
  directList: GPUBuffer;

  constructor(
    private readonly device: GPUDevice,
    private readonly constants: DrawConstants,
    batchRows: number,
    items: number,
  ) {
    this.buffer = this.createArguments(batchRows);
    [this.itemList, this.directList] = this.createLists(items);
  }

  /**
   * The byte offset in `buffer` of record `record`'s batch's arguments: the
   * record's pointer to its indirect arguments (its batch word).
   */
  slotOf(record: number): number {
    if (
      !Number.isInteger(record) ||
      record < 0 ||
      record >= this.constants.rows
    ) {
      throw new RangeError(`slotOf: no record ${record}`);
    }
    return (
      this.constants.u32[record * RECORD_WORDS + BATCH_WORD]! * INDIRECT_SIZE
    );
  }

  /** Arguments for `rows` batches (the old ones are rewritten per view). */
  growBatches(rows: number): void {
    this.buffer.destroy();
    this.buffer = this.createArguments(rows);
  }

  /** Item lists for `items` items (rewritten by the cull and the batches). */
  growItems(items: number): void {
    this.itemList.destroy();
    this.directList.destroy();
    [this.itemList, this.directList] = this.createLists(items);
  }

  /**
   * Clears the first `batches` batches' arguments before a view's cull,
   * which counts into their instance counts and writes the rest.
   */
  clear(encoder: GPUCommandEncoder, batches: number): void {
    encoder.clearBuffer(
      this.buffer,
      0,
      Math.max(INDIRECT_SIZE, batches * INDIRECT_SIZE),
    );
  }

  /**
   * A batch's draw, after its slab, pipeline and groups are bound: its
   * slice of the item list, then indexed, or for a point set six vertices
   * per point without indices. "direct" draws every item without the
   * cull's arguments (point sets draw only as a view's cull listed them).
   */
  drawBatch(
    pass: GPURenderPassEncoder | GPURenderBundleEncoder,
    batch: ArgumentBatch,
    direct: boolean,
  ): void {
    pass.setVertexBuffer(
      0,
      direct ? this.directList : this.itemList,
      batch.itemBase * 4,
    );
    const { mesh } = batch;
    if (batch.points) {
      if (!direct) {
        pass.drawIndirect(this.buffer, batch.index * INDIRECT_SIZE);
      }
    } else if (direct) {
      pass.drawIndexed(mesh.indexCount, batch.items, mesh.firstIndex, 0, 0);
    } else {
      pass.drawIndexedIndirect(this.buffer, batch.index * INDIRECT_SIZE);
    }
  }

  destroy(): void {
    this.buffer.destroy();
    this.itemList.destroy();
    this.directList.destroy();
  }

  private createArguments(rows: number): GPUBuffer {
    return this.device.createBuffer({
      label: "world.indirect",
      size: rows * INDIRECT_SIZE,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.INDIRECT |
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
