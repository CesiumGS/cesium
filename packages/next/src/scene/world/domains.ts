// What a pick needs of a world to give a hit's point in the content's own
// domain (CESIUM2_WEBGPU_PLAN.md §13.26, increment 5; scene/pickDomain.ts):
// where a patch draw's faces come from, and an instance's matrix.
import type { PickHint, RefinedPick } from "../../geometry/brep.ts";
import {
  INSTANCE_COUNT_WORD,
  INSTANCE_FIRST_WORD,
  INSTANCE_WORDS,
  RECORD_WORDS,
} from "../../render/layout.ts";
import type { World } from "../World.ts";
import type { DrawHandle } from "./types.ts";

/**
 * Where a patch draw's faces are exact (provisional): the b-rep whose faces
 * its patches draw, which refines a pick's (face, u, v) into the face's own
 * point (`BrepGeometry.refinePick`). `World.addBrep` sets it for each patch
 * draw it makes.
 */
export interface PatchPickSource {
  /** `BrepGeometry.refinePick` of the geometry the patches were made from. */
  refinePick(face: number, hint: PickHint): RefinedPick | undefined;
  /**
   * The draw's model space is the geometry's placed coordinates less this
   * (`addBrep` places the draw at the form's centre, so the GPU keeps
   * float32 precision).
   */
  readonly origin: ArrayLike<number>;
}

/** What `instanceAffine` reads of a world. */
export type InstanceWorld = Pick<World, "hasDraw"> & {
  readonly raster: Pick<World["raster"], "instances" | "recordsU32">;
};

/**
 * The affine matrix of instance `instance` of `draw` (the instance among the
 * draw's, as the cull numbers them), by row: 12 floats, `p' = rows · (p, 1)`.
 * Undefined for a draw without instances, or one that doesn't have it.
 */
export function instanceAffine(
  world: InstanceWorld,
  draw: DrawHandle,
  instance: number,
): Float32Array | undefined {
  if (!world.hasDraw(draw)) {
    return undefined;
  }
  const o = draw.index * RECORD_WORDS;
  const count = world.raster.recordsU32[o + INSTANCE_COUNT_WORD]!;
  if (count === 0 || instance >= count) {
    return undefined;
  }
  const first = world.raster.recordsU32[o + INSTANCE_FIRST_WORD]!;
  const at = (first + instance) * INSTANCE_WORDS;
  return world.raster.instances.f32.subarray(at, at + 12);
}
