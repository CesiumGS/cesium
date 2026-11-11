// Whether a world's draws would show what they should (provisional): the
// pipelines and textures their custom shaders need are made, and their
// patch draws have been diced, in the frames recorded and encoded so far.
import type { WorldRaster } from "../../render/world/worldRaster.ts";
import type { DrawHandle } from "./types.ts";

export interface ReadyWorld {
  readonly raster: Pick<
    WorldRaster,
    "bundle" | "drawBatches" | "patchDraws" | "pipelineGaps"
  >;
}

/**
 * True when, as of the last frame, no bundle drew `draws` (default: every
 * draw) with a stand-in, and every patch draw of them a view shows was
 * diced. A draw added since the last frame isn't covered: ask after one.
 */
export function drawsReady(
  world: ReadyWorld,
  draws?: readonly DrawHandle[],
): boolean {
  const { raster } = world;
  // Recorded afresh by the next frame: the gaps are not current.
  if (!raster.bundle) {
    return false;
  }
  const wanted =
    draws && new Set(draws.map((d) => raster.drawBatches[d.index]));
  for (const gaps of raster.pipelineGaps.values()) {
    for (const batch of gaps) {
      if (!wanted || wanted.has(batch)) {
        return false;
      }
    }
  }
  for (const draw of raster.patchDraws.values()) {
    if (
      draw.batch.shown > 0 &&
      !draw.diced &&
      (!wanted || wanted.has(draw.batch))
    ) {
      return false;
    }
  }
  return true;
}
