// Each view's clip table for a tick (scene/world/clips.ts): the view's clip
// sets placed into its shading axes, camera-relative, in float64, packed and
// uploaded into a buffer of the view's own, which the view's passes copy into
// the shared one before they draw (`clipTablePass`).
import { FrameUnavailableError } from "../../camera/frameResolver.ts";
import {
  CLIP_TABLE_BYTES,
  CLIP_TABLE_ROWS,
  packClipTable,
  planClip,
  type PlannedClip,
} from "../../scene/world/clips.ts";
import type { Engine } from "../../scene/Engine.ts";
import type { View } from "../../scene/View.ts";
import type { ViewFrame } from "./viewFrameData.ts";

/** Rasterizer side: what a view's clip table reads. */
export type ClipTableEngine = Pick<Engine, "bodyCamera" | "cameras" | "ctx">;

const scratch = new Float32Array(CLIP_TABLE_ROWS * 4);

/**
 * Places `view`'s clips for this tick and uploads its table; sets
 * `frame.clipBytes` (0 for none). A clip that can't be placed (its frame is
 * unavailable, or it is a curved surface in this view) is left out and
 * reported, once, as the camera layer reports a frame it can't resolve.
 */
export function writeClips(
  engine: ClipTableEngine,
  view: View,
  frame: ViewFrame,
): void {
  const sets = view.clipSets();
  frame.clipBytes = 0;
  if (sets.length === 0) {
    return;
  }
  const world = view.world;
  const body = view.bodyAnchor;
  const placement = {
    resolver: engine.cameras.resolver(world),
    seconds: engine.cameras.clock(world)?.seconds ?? 0,
    root: engine.cameras.root(view),
    body: body ?? world.root,
    bodyPlacement: view.anchorPlacement(body),
    bodyRoute: view.anchorRoute(body),
  };
  const plans: PlannedClip[] = [];
  for (const set of sets) {
    try {
      const plan = planClip(set, placement);
      if ("curved" in plan) {
        engine.ctx.errors.report("camera", plan.curved);
      } else {
        plans.push(plan);
      }
    } catch (error) {
      const reason =
        error instanceof FrameUnavailableError
          ? `${error.message}`
          : error instanceof Error
            ? error.message
            : String(error);
      engine.ctx.errors.report(
        "camera",
        `a clip in ${set.frame.name} is left out of a view this tick: ${reason}`,
      );
    }
  }
  if (plans.length === 0) {
    return;
  }
  const bytes = packClipTable(plans, engine.bodyCamera(view).position, scratch);
  const device = engine.ctx.device;
  frame.clipBuffer ??= device.createBuffer({
    label: "view.clips",
    size: CLIP_TABLE_BYTES,
    usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(frame.clipBuffer, 0, scratch, 0, bytes / 4);
  frame.clipBytes = bytes;
}

/**
 * Copies the view's clip table into the shared one the clipped pipelines
 * read, before any of the view's passes that draw (the shadows pass, the
 * first, does it).
 */
export function encodeClipTable(
  engine: Pick<ClipTableEngine, "ctx">,
  enc: GPUCommandEncoder,
  frame: ViewFrame,
): void {
  if (frame.clipBytes > 0 && frame.clipBuffer) {
    enc.copyBufferToBuffer(
      frame.clipBuffer,
      0,
      engine.ctx.currentClipBuffer,
      0,
      frame.clipBytes,
    );
  }
}
