// Each view's clip table for a tick (scene/world/clips.ts): the view's clip
// sets placed into its shading axes, camera-relative, in float64, packed and
// uploaded into a buffer of the view's own, which the view's passes copy into
// the shared one before they draw (`clipTablePass`).
import { FrameUnavailableError } from "../../camera/frameResolver.ts";
import { packCapFaces } from "../../scene/world/capFaces.ts";
import {
  CLIP_TABLE_BYTES,
  CLIP_TABLE_ROWS,
  ghostRange,
  packClipTable,
  planClip,
  type ClipSet,
  type ClipViewPlacement,
  type PlannedClip,
} from "../../scene/world/clips.ts";
import type { Engine } from "../../scene/Engine.ts";
import type { View } from "../../scene/View.ts";
import type { ViewFrame } from "./viewFrameData.ts";

/** Rasterizer side: what a view's clip table reads. */
export type ClipTableEngine = Pick<Engine, "bodyCamera" | "cameras" | "ctx">;

const scratch = new Float32Array(CLIP_TABLE_ROWS * 4);

/** What a view's clips are placed by this tick. */
function placementOf(
  engine: Pick<ClipTableEngine, "cameras">,
  view: View,
): ClipViewPlacement {
  const world = view.world;
  const body = view.bodyAnchor;
  return {
    resolver: engine.cameras.resolver(world),
    seconds: engine.cameras.clock(world)?.seconds ?? 0,
    root: engine.cameras.root(view),
    body: body ?? world.root,
    bodyPlacement: view.anchorPlacement(body),
    bodyRoute: view.anchorRoute(body),
  };
}

/**
 * The view's clip sets that are curved surfaces in it (planClip's `curved`):
 * what the world fits a field for (`WorldCurvedClips.frame`). A set that
 * can't be placed is left to `writeClips` to report.
 */
export function curvedClipSets(
  engine: Pick<ClipTableEngine, "cameras">,
  view: View,
): ClipSet[] {
  const sets = view.clipSets();
  if (sets.length === 0) {
    return [];
  }
  const placement = placementOf(engine, view);
  const curved: ClipSet[] = [];
  for (const set of sets) {
    try {
      if (planClip(set, placement).space === "curved") {
        curved.push(set);
      }
    } catch {
      // reported by writeClips
    }
  }
  return curved;
}

/**
 * Places `view`'s clips for this tick and uploads its table; sets
 * `frame.clipBytes` (0 for none). A clip that can't be placed (its frame is
 * unavailable) is left out and reported, once, as the camera layer reports a
 * frame it can't resolve. The view's curved sets are one table row: their
 * field is the world's (`WorldCurvedClips`), a draw's fitted distance; when
 * the world's field is another view's, they are left out and reported.
 */
export function writeClips(
  engine: ClipTableEngine,
  view: View,
  frame: ViewFrame,
): void {
  const sets = view.clipSets();
  frame.clipBytes = 0;
  frame.capFaces = 0;
  view.capFaces = 0;
  view.capNote = undefined;
  frame.clipGhost = undefined;
  if (sets.length === 0) {
    return;
  }
  const world = view.world;
  const placement = placementOf(engine, view);
  const plans: PlannedClip[] = [];
  const curved: PlannedClip[] = [];
  for (const set of sets) {
    try {
      const plan = planClip(set, placement);
      (plan.space === "curved" ? curved : plans).push(plan);
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
  if (curved.length > 0) {
    if (world.warps.curved.serves(curved.map((p) => p.set))) {
      plans.push(curved[0]!);
    } else {
      engine.ctx.errors.report(
        "camera",
        `the curved clip${curved.length === 1 ? "" : "s"} in ${curved.map((p) => p.set.frame.name).join(", ")} ${curved.length === 1 ? "is" : "are"} left out of a view this tick: the world's draws carry one curved field, which is not this view's yet.`,
      );
    }
  }
  if (plans.length === 0) {
    return;
  }
  const camera = engine.bodyCamera(view).position;
  const bytes = packClipTable(plans, camera, scratch);
  frame.clipGhost = ghostRange(plans, camera);
  // The caps' faces after the sets' rows (`packCapFaces`), when the view has caps.
  const caps = view.clipCaps
    ? packCapFaces(
        plans,
        camera,
        view.clipCaps,
        scratch,
        bytes / 16,
        CLIP_TABLE_ROWS,
      )
    : undefined;
  view.capFaces = caps?.faces ?? 0;
  view.capNote = caps?.note;
  frame.capFaces = view.capFaces;
  const total = bytes + (caps ? caps.rows * 16 : 0);
  const device = engine.ctx.device;
  frame.clipBuffer ??= device.createBuffer({
    label: "view.clips",
    size: CLIP_TABLE_BYTES,
    usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(frame.clipBuffer, 0, scratch, 0, total / 4);
  frame.clipBytes = total;
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
