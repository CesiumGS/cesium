import { NO_PLACEMENT, attributeHash } from "../render/layout.ts";
import {
  PLACEMENT_TERMS,
  type FittedOperation,
  type Placement,
} from "./placement.ts";

/**
 * A world's placements buffer (plan 5a's call 42): one storage buffer of
 * float4 rows, bound in the draw group (group 1, binding 7) for the vertex
 * stage only, read in Slang only by shaders/placement.slang. It holds:
 *
 * - placement parameters, one float each, four to a row
 *   (`PlacementParameter`): a morph writes one float, 4 bytes, a tick;
 * - each placed draw's block, which its record's `placement` word points
 *   at (the row of its header).
 *
 * A block's header row holds words: its kind (`PLACEMENT_KIND`), its
 * parameter's float (dual, blend), and the dual attribute's name hash
 * (`attributeHash`), or a blend's two fitted bodies' rows (`NO_PLACEMENT`
 * for the identity). A fitted body is `FITTED_ROWS` rows: the center and
 * 1/scale, then each term's x, y, z coefficients. A fitted block's body
 * follows its header; a blend's bodies follow its header, `from` first.
 *
 * Every write goes to the buffer at once (`queue.writeBuffer`), in queue
 * order with the frames that read it. Nothing here writes a vertex buffer
 * (spec section 7.6).
 */
export class PlacementTable {
  private f32: Float32Array;
  private u32: Uint32Array;
  private bufferRows: number;
  private gpu: GPUBuffer;
  /** Rows handed out (blocks and parameter rows), from row 0. */
  private used = 0;
  /** Freed blocks by size in rows, for reuse. */
  private readonly freeBlocks = new Map<number, number[]>();
  /** Parameter floats not in use (word indices). */
  private readonly freeSlots: number[] = [];

  /**
   * `replaced` runs after the buffer is replaced by a larger one, so the
   * groups binding it are rebuilt.
   */
  constructor(
    private readonly device: GPUDevice,
    private readonly replaced: () => void,
    rows = 64,
  ) {
    this.bufferRows = rows;
    this.f32 = new Float32Array(rows * 4);
    this.u32 = new Uint32Array(this.f32.buffer);
    this.gpu = this.create(rows);
  }

  /** The GPU buffer (replaced as it grows: `replaced`). */
  get buffer(): GPUBuffer {
    return this.gpu;
  }

  /** Bytes of the GPU buffer. */
  get bytes(): number {
    return this.bufferRows * 16;
  }

  /** A float for a parameter (its word index), set to `value`. */
  allocateParameter(value: number): number {
    if (this.freeSlots.length === 0) {
      const row = this.allocate(1);
      for (let c = 3; c >= 0; c--) {
        this.freeSlots.push(row * 4 + c);
      }
    }
    const word = this.freeSlots.pop()!;
    this.setParameter(word, value);
    return word;
  }

  /** A parameter's float is free for reuse. */
  releaseParameter(word: number): void {
    this.freeSlots.push(word);
  }

  /** A parameter's float: one 4-byte write. */
  setParameter(word: number, value: number): void {
    this.f32[word] = value;
    this.device.queue.writeBuffer(this.gpu, word * 4, this.f32, word, 1);
  }

  /** A parameter's float as the GPU holds it. */
  parameter(word: number): number {
    return this.f32[word]!;
  }

  /**
   * Writes `placement`'s block (any kind but affine) and returns its
   * header row. `slotOf` gives a parameter's word.
   */
  add(placement: Placement, slotOf: (p: { value: number }) => number): number {
    const rows = blockRows(placement);
    const at = this.allocate(rows);
    this.pack(placement, at, slotOf);
    this.device.queue.writeBuffer(
      this.gpu,
      at * 16,
      this.f32,
      at * 4,
      rows * 4,
    );
    return at;
  }

  /** Frees the block at `at` of `placement`'s size, for reuse. */
  remove(at: number, placement: Placement): void {
    const rows = blockRows(placement);
    let list = this.freeBlocks.get(rows);
    if (!list) {
      list = [];
      this.freeBlocks.set(rows, list);
    }
    list.push(at);
  }

  /** The block's words as uploaded (for tests and the spike). */
  words(at: number, rows: number): { f32: Float32Array; u32: Uint32Array } {
    return {
      f32: this.f32.subarray(at * 4, (at + rows) * 4),
      u32: this.u32.subarray(at * 4, (at + rows) * 4),
    };
  }

  destroy(): void {
    this.gpu.destroy();
  }

  private create(rows: number): GPUBuffer {
    return this.device.createBuffer({
      label: "world.placements",
      size: rows * 16,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
  }

  private allocate(rows: number): number {
    const reused = this.freeBlocks.get(rows)?.pop();
    if (reused !== undefined) {
      return reused;
    }
    const at = this.used;
    if (at + rows > this.bufferRows) {
      this.grow(at + rows);
    }
    this.used += rows;
    return at;
  }

  /** A buffer for at least `rows` rows, holding the old one's words. */
  private grow(rows: number): void {
    let size = this.bufferRows;
    while (size < rows) {
      size *= 2;
    }
    const f32 = new Float32Array(size * 4);
    f32.set(this.f32);
    this.f32 = f32;
    this.u32 = new Uint32Array(f32.buffer);
    this.gpu.destroy();
    this.bufferRows = size;
    this.gpu = this.create(size);
    this.device.queue.writeBuffer(this.gpu, 0, this.f32, 0, this.used * 4);
    this.replaced();
  }

  private pack(
    placement: Placement,
    at: number,
    slotOf: (p: { value: number }) => number,
  ): void {
    const u32 = this.u32;
    const h = at * 4;
    u32.fill(0, h, h + 4);
    switch (placement.kind) {
      case "dual":
        u32[h] = PLACEMENT_KIND.dual;
        u32[h + 1] = slotOf(placement.t);
        u32[h + 2] = attributeHash(placement.semantic);
        return;
      case "fitted":
        u32[h] = PLACEMENT_KIND.fitted;
        this.packFitted(placement, at + 1);
        return;
      case "blend": {
        u32[h] = PLACEMENT_KIND.blend;
        u32[h + 1] = slotOf(placement.t);
        let body = at + 1;
        u32[h + 2] = NO_PLACEMENT;
        u32[h + 3] = NO_PLACEMENT;
        if (placement.from !== "identity") {
          u32[h + 2] = body;
          this.packFitted(placement.from, body);
          body += FITTED_ROWS;
        }
        if (placement.to !== "identity") {
          u32[h + 3] = body;
          this.packFitted(placement.to, body);
        }
        return;
      }
      case "affine":
        throw new Error("PlacementTable: the affine placement has no block.");
    }
  }

  private packFitted(f: FittedOperation, at: number): void {
    const o = at * 4;
    const f32 = this.f32;
    f32[o] = f.center[0]!;
    f32[o + 1] = f.center[1]!;
    f32[o + 2] = f.center[2]!;
    f32[o + 3] = 1 / f.scale;
    for (let k = 0; k < PLACEMENT_TERMS; k++) {
      const r = o + 4 + k * 4;
      f32[r] = f.coefficients[3 * k]!;
      f32[r + 1] = f.coefficients[3 * k + 1]!;
      f32[r + 2] = f.coefficients[3 * k + 2]!;
      f32[r + 3] = 0;
    }
  }
}

/** Header kinds (shaders/placement.slang `PLACEMENT_DUAL`…). */
export const PLACEMENT_KIND = { dual: 1, fitted: 2, blend: 3 } as const;

/** Rows of a fitted body: the center and 1/scale, then a row per term. */
export const FITTED_ROWS = 1 + PLACEMENT_TERMS;

/** Rows of `placement`'s block (0 for affine). */
export function blockRows(placement: Placement): number {
  switch (placement.kind) {
    case "affine":
      return 0;
    case "dual":
      return 1;
    case "fitted":
      return 1 + FITTED_ROWS;
    case "blend":
      return (
        1 +
        (placement.from === "identity" ? 0 : FITTED_ROWS) +
        (placement.to === "identity" ? 0 : FITTED_ROWS)
      );
  }
}
