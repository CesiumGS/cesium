// A world's draw data on the CPU, renderer-neutral: what a device draws from.
// The records, the batches' keys, the transform and instance tables and the
// materials, with their change logs. The scene's other half is `WorldScene`;
// each device's copy is its `WorldMirror` (WebGPU's: `WorldRaster`).
import type { Batch } from "./types.ts";
import type { DrawConstants } from "../../render/drawConstants.ts";
import type { CpuTable } from "../CpuTable.ts";
import type { RangeAllocator } from "../../gpu/RangeAllocator.ts";

/** One per world, made once with it, and filled by its constructor. */
export class WorldDraws {
  // Per-slot CPU tables (records, transforms, instances, materials) start
  // small and grow as slots are used; the GPU tables are full size (a
  // 65536-draw world's CPU tables held 37 MB on NYC, r39).
  /**
   * The draw records (the per-draw constants seam): every
   * record write goes through it.
   */
  drawConstants!: DrawConstants;
  /** The records' words, to read (written through `drawConstants`). */
  get recordsU32(): ArrayLike<number> {
    return this.drawConstants.u32;
  }
  get recordsF32(): ArrayLike<number> {
    return this.drawConstants.f32;
  }
  /** Generation per draw slot (`DrawHandle.generation`). */
  drawGeneration!: Uint32Array;
  /** Transform a draw owns (placed by origin and model), or -1. */
  drawOwnedTransform!: Int32Array;

  // The transform table: float64 local and world matrices on the CPU
  // (`WorldScene`), composed parents first; these rows hold the world
  // matrices as a device reads them.
  transforms!: CpuTable;

  // The instance table: ranges owned by instanced draws.
  instances!: CpuTable;
  instanceAllocator!: RangeAllocator;
  /** Instance slots in use or freed below the highest (cull dispatch size). */
  instanceHighWater = 0;
  /**
   * Records, transforms, instances or placements changed since the device
   * last copied them: its next tick uploads.
   */
  uploadsPending = false;
  materialsF32!: Float32Array;
  materialsU32!: Uint32Array;
  /** The materials changed since the device last copied them. */
  materialsDirty = false;
  readonly batches = new Map<string, Batch>();
  readonly batchList: Batch[] = [];
  /** Emptied batches, reused (index kept) so live records stay valid. */
  readonly freeBatches: Batch[] = [];
  readonly drawBatches: Array<Batch | undefined> = [];
  readonly freeSlots: number[] = [];
  drawCount = 0;
  /**
   * A batch gained its first shown record or lost its last (`Batch.shown`):
   * the bundles are recorded again, without rewriting the batch table.
   */
  batchesShownChanged = false;
}
