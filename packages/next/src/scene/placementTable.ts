import { attributeHash } from "../render/layout.ts";
import { PLACEMENT_TERMS } from "./placement.ts";
import { latticeDisplacement } from "./warpEvaluate.ts";
import type { WarpTerms } from "./warpTerms.ts";

/**
 * A world's placements buffer (plan 5a's call 42): one storage buffer of
 * float4 rows, bound in the draw group (group 1, binding 7) for the vertex
 * stage, in the cull's group (group 1, binding 7, for a placed record's
 * order-0 offset) and in a point source's frame kernel (group 1, binding 7),
 * read in Slang only by shaders/placement.slang. It holds:
 *
 * - placement parameters, one float each, four to a row
 *   (`PlacementParameter`): a morph writes one float, 4 bytes, a tick;
 * - each placed draw's block (`WarpTerms`, plan 13.26), which its record's
 *   `placement` word points at (the row of its header).
 *
 * A block is, in rows (words are u32 unless marked f32; `at` is its first row):
 *
 * - `at`: the header, `[term count (1 to 3), 0, 0, 0]`;
 * - `at + 1 + 3i`: term `i`'s row, `[kind | factors << 8, weight scale
 *   (f32), a, b]`, with `kind` a `WARP_KIND`: a lattice has `a` the row of
 *   its body from `at` and `b` its cells per axis; an attribute has `a` the
 *   name's hash (`attributeHash`) and `b` 1 if it is absolute (it holds a
 *   position: the displacement is it minus the point's), else 0;
 * - the two rows after it, the weight's factors, `[parameter's word,
 *   offset (f32), slope (f32), 0]`, the factor's value `offset + slope ·
 *   parameter`: only `factors` of them are read, the others are zero. The
 *   weight is the scale times the factors' values;
 * - then each lattice's body, in term order: a row `[center xyz (f32), 1 /
 *   scale (f32)]`, two rows `[x, y, z, 0]` (f32) holding the lattice's
 *   displacement at its center as hi then lo parts (the cull kernel adds
 *   it, summed exactly, to the draw's camera-relative translation: plan
 *   13.26's flaw 3; the cells hold the lattice less this constant), then
 *   `cells³ × 20` rows, `[x, y, z, 0]` (f32), cell `(iz · cells + iy) ·
 *   cells + ix` term `k` at row `3 + cell · 20 + k` (`CubicLattice`). A
 *   row's `w` is the lattice's clip field when it has one (`ClipField`, a
 *   curved clip's signed distance), else 0.
 *
 * A lattice of one cell is a body of 23 rows; of eight, 10,243.
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

  /** Writes `terms`' block and returns its header row. `slotOf` gives a parameter's word. */
  add(terms: WarpTerms, slotOf: (p: { value: number }) => number): number {
    const rows = blockRows(terms);
    const at = this.allocate(rows);
    this.pack(terms, at, slotOf);
    this.device.queue.writeBuffer(
      this.gpu,
      at * 16,
      this.f32,
      at * 4,
      rows * 4,
    );
    return at;
  }

  /** Frees the block at `at` of `terms`' size, for reuse. */
  remove(at: number, terms: WarpTerms): void {
    const rows = blockRows(terms);
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
    terms: WarpTerms,
    at: number,
    slotOf: (p: { value: number }) => number,
  ): void {
    const u32 = this.u32;
    const f32 = this.f32;
    const h = at * 4;
    u32.fill(0, h, h + (1 + TERM_ROWS * terms.length) * 4);
    u32[h] = terms.length;
    let body = 1 + TERM_ROWS * terms.length;
    terms.forEach(({ term, weight }, i) => {
      const t = (at + 1 + TERM_ROWS * i) * 4;
      u32[t] =
        (term.kind === "cubic" ? WARP_KIND.lattice : WARP_KIND.attribute) |
        (weight.factors.length << 8);
      f32[t + 1] = weight.scale;
      weight.factors.forEach((factor, j) => {
        const r = t + 4 + 4 * j;
        u32[r] = slotOf(factor.parameter);
        f32[r + 1] = factor.offset;
        f32[r + 2] = factor.slope;
      });
      if (term.kind === "attribute") {
        u32[t + 2] = attributeHash(term.semantic);
        u32[t + 3] = term.absolute ? 1 : 0;
        return;
      }
      u32[t + 2] = body;
      u32[t + 3] = term.cells;
      const o = (at + body) * 4;
      f32[o] = term.center[0]!;
      f32[o + 1] = term.center[1]!;
      f32[o + 2] = term.center[2]!;
      f32[o + 3] = 1 / term.scale;
      // The displacement at the center goes to the cull kernel as hi and lo
      // (placement.slang `placementOffset`); the cells keep what is left.
      const constant = latticeDisplacement(
        term,
        term.center,
        new Float64Array(3),
      );
      for (let a = 0; a < 3; a++) {
        const hi = Math.fround(constant[a]!);
        f32[o + 4 + a] = hi;
        f32[o + 8 + a] = Math.fround(constant[a]! - hi);
      }
      const rows = term.cells ** 3 * PLACEMENT_TERMS;
      const clip = term.clip?.coefficients;
      for (let k = 0; k < rows; k++) {
        const r = o + LATTICE_HEAD_ROWS * 4 + k * 4;
        const order0 = k % PLACEMENT_TERMS === 0;
        for (let a = 0; a < 3; a++) {
          f32[r + a] =
            term.coefficients[3 * k + a]! - (order0 ? constant[a]! : 0);
        }
        f32[r + 3] = clip ? clip[k]! : 0;
      }
      body += latticeRows(term.cells);
    });
  }
}

/** Term kinds in a term's row (shaders/placement.slang `WARP_LATTICE`…). */
export const WARP_KIND = { lattice: 1, attribute: 2 } as const;

/** Rows of a term: its row and its two factors'. */
export const TERM_ROWS = 3;

/** Rows of a lattice's body before its cells: the center and 1 / scale, then its value at the center as hi and lo. */
export const LATTICE_HEAD_ROWS = 3;

/** Rows of a lattice's body: its head, then a row per cell and term. */
export function latticeRows(cells: number): number {
  return LATTICE_HEAD_ROWS + cells ** 3 * PLACEMENT_TERMS;
}

/** Rows of `terms`' block. */
export function blockRows(terms: WarpTerms): number {
  let rows = 1 + TERM_ROWS * terms.length;
  for (const { term } of terms) {
    if (term.kind === "cubic") {
      rows += latticeRows(term.cells);
    }
  }
  return rows;
}
