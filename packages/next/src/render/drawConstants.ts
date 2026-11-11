import { MirroredTable } from "../scene/MirroredTable.ts";
import type { RenderContext } from "../scene/RenderContext.ts";
import {
  BATCH_WORD,
  CASTER_MASK_WORD,
  CENTER_WORD,
  CLIP_BLOCK_WORD,
  COLOR_WORD,
  FLAGS_WORD,
  IMAGERY_SLICE_WORD,
  INSTANCE_COUNT_WORD,
  LIGHTS_SLICE_WORD,
  MATERIAL_INDEX_WORD,
  PLACEHOLDER_MASK_WORD,
  PLACEMENT_WORD,
  RADIUS_WORD,
  RECORD_WORDS,
  RecordFlags,
  TERRAIN_CLIP_WORD,
  VIEW_MASK_WORD,
  writeDrawRecord,
  type DrawRecordData,
} from "./layout.ts";

/**
 * The per-draw constants seam (plan 5a's call 37): a world's draw records,
 * on the CPU and in their GPU table. Every write of a record goes through
 * this class, and the shaders read a record only through Slang
 * `drawRecord(index)` (cullTables.slang, surface.slang, raycast.slang).
 * A record's placement word points into the world's placements buffer
 * (scene/placementTable.ts), the per-draw data placements add.
 * Immediates or push constants, or another layout of the per-draw data,
 * would replace this class and that one function, not their callers
 * (CESIUM2_WEBGPU_PLAN.md §7.1, "design for it; don't build it").
 *
 * The records are the layout's (`writeDrawRecord`, render/layout.ts): this
 * class changes no byte of them. Each write marks its row for the next
 * upload; what else a change means to the world (its version, the views to
 * draw again) stays the world's.
 */
export class DrawConstants {
  private readonly table: MirroredTable;

  constructor(ctx: RenderContext, capacity: number, gpuRows: number) {
    this.table = new MirroredTable(
      ctx,
      "records",
      RECORD_WORDS,
      capacity,
      gpuRows,
    );
  }

  /** The records' words as unsigned integers, to read. */
  get u32(): ArrayLike<number> {
    return this.table.u32;
  }

  /** The records' words as floats, to read. */
  get f32(): ArrayLike<number> {
    return this.table.f32;
  }

  /** The GPU table (replaced by `growGpu`). */
  get buffer(): GPUBuffer {
    return this.table.buffer;
  }

  /** Rows on the CPU. */
  get rows(): number {
    return this.table.rows;
  }

  /** Room for rows below `count` on the CPU; true when it grew. */
  reserve(count: number): boolean {
    return this.table.reserve(count);
  }

  /** A larger GPU table holding the old one's rows. */
  growGpu(rows: number): void {
    this.table.growGpu(rows);
  }

  /** Marks a row for the next upload. */
  mark(index: number): void {
    this.table.mark(index);
  }

  /** Uploads the marked rows; a scatter may be encoded into `pass`. */
  upload(pass: GPUComputePassEncoder): void {
    this.table.upload(pass);
  }

  destroy(): void {
    this.table.destroy();
  }

  /** Writes a whole record (`writeDrawRecord`). */
  write(index: number, data: DrawRecordData): void {
    writeDrawRecord(this.table.f32, this.table.u32, index, data);
    this.table.mark(index);
  }

  /** The draw's tint, linear RGBA (a missing component 1). */
  setColor(index: number, color: ArrayLike<number>): void {
    const o = index * RECORD_WORDS + COLOR_WORD;
    for (let i = 0; i < 4; i++) {
      this.table.f32[o + i] = color[i] ?? 1;
    }
    this.table.mark(index);
  }

  /** `RecordFlags`; true when they changed. */
  setFlags(index: number, flags: number): boolean {
    return this.setWord(index, FLAGS_WORD, flags);
  }

  /** The views that draw the record, a bit each; true when it changed. */
  setViewMask(index: number, mask: number): boolean {
    return this.setWord(index, VIEW_MASK_WORD, mask);
  }

  /** The views whose shadow cascades alone draw it; true when it changed. */
  setCasterMask(index: number, mask: number): boolean {
    return this.setWord(index, CASTER_MASK_WORD, mask);
  }

  /**
   * The record's batch and its bounding radius (the radius carries a
   * custom vertex stage's displacement, so it moves with the batch's
   * shader). The batch is also the record's slot in the draw arguments
   * (`DrawArguments.slotOf`).
   */
  setBatch(index: number, batch: number, radius: number): void {
    const o = index * RECORD_WORDS;
    this.table.u32[o + BATCH_WORD] = batch;
    this.table.f32[o + RADIUS_WORD] = radius;
    this.table.mark(index);
  }

  /**
   * The record's bounding radius alone (model units): its placement's
   * largest displacement follows the placement (`World.setPlacement`).
   */
  setRadius(index: number, radius: number): void {
    this.table.f32[index * RECORD_WORDS + RADIUS_WORD] = radius;
    this.table.mark(index);
  }

  /**
   * The record's bounding sphere's centre and radius (model units): a
   * placement moves it by the displacement at the centre
   * (`World.setPlacement`), which the cull kernel then tests.
   */
  setBounds(index: number, center: ArrayLike<number>, radius: number): void {
    const o = index * RECORD_WORDS;
    this.table.f32[o + CENTER_WORD] = center[0]!;
    this.table.f32[o + CENTER_WORD + 1] = center[1]!;
    this.table.f32[o + CENTER_WORD + 2] = center[2]!;
    this.table.f32[o + RADIUS_WORD] = radius;
    this.table.mark(index);
  }

  /**
   * The record's placement: its block's row in the world's placements
   * buffer (`NO_PLACEMENT`: none); true when it changed.
   */
  setPlacement(index: number, row: number): boolean {
    return this.setWord(index, PLACEMENT_WORD, row);
  }

  /** The record's material (`World.setDrawMaterial`). */
  setMaterial(index: number, material: number): void {
    this.setWord(index, MATERIAL_INDEX_WORD, material);
  }

  /** A removed draw's record: hidden, with no instances. */
  clear(index: number): void {
    const o = index * RECORD_WORDS;
    this.table.u32[o + FLAGS_WORD] = RecordFlags.hidden;
    this.table.u32[o + INSTANCE_COUNT_WORD] = 0;
    this.table.mark(index);
  }

  /**
   * A mixed-LOD placeholder's views and clip block (`packClip`; both 0:
   * none); true when they changed.
   */
  setPlaceholder(index: number, mask: number, clip: number): boolean {
    const o = index * RECORD_WORDS;
    const u32 = this.table.u32;
    if (
      u32[o + PLACEHOLDER_MASK_WORD] === mask >>> 0 &&
      u32[o + CLIP_BLOCK_WORD] === clip >>> 0
    ) {
      return false;
    }
    u32[o + PLACEHOLDER_MASK_WORD] = mask >>> 0;
    u32[o + CLIP_BLOCK_WORD] = clip >>> 0;
    this.table.mark(index);
    return true;
  }

  /** The terrain clip regions a globe tile tests; true when they changed. */
  setTerrainClip(index: number, mask: number): boolean {
    return this.setWord(index, TERRAIN_CLIP_WORD, mask);
  }

  /**
   * A globe tile's imagery (`packImagery`, 0: none), shown unlit when
   * `unlit` and there is imagery; true when the record changed.
   */
  setImagery(index: number, packed: number, unlit: boolean): boolean {
    const o = index * RECORD_WORDS;
    const u32 = this.table.u32;
    const flags = u32[o + FLAGS_WORD]!;
    const next =
      packed !== 0 && unlit
        ? flags | RecordFlags.unlit
        : flags & ~RecordFlags.unlit;
    if (u32[o + IMAGERY_SLICE_WORD] === packed >>> 0 && flags === next) {
      return false;
    }
    u32[o + IMAGERY_SLICE_WORD] = packed >>> 0;
    u32[o + FLAGS_WORD] = next;
    this.table.mark(index);
    return true;
  }

  /** A globe tile's night lights (`packImagery`, 0: none); true when changed. */
  setLights(index: number, packed: number): boolean {
    return this.setWord(index, LIGHTS_SLICE_WORD, packed);
  }

  private setWord(index: number, word: number, value: number): boolean {
    const at = index * RECORD_WORDS + word;
    if (this.table.u32[at] === value >>> 0) {
      return false;
    }
    this.table.u32[at] = value >>> 0;
    this.table.mark(index);
    return true;
  }
}
