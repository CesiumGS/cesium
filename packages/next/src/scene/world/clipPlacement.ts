// Where a view's clips are placed this tick, and which of its clip sets are
// curved surfaces in it: scene logic over the camera layer and the view,
// shared by the WebGPU clip table (render/view/clipTable.ts) and the world's
// curvilinear clip fits.
import type { Engine } from "../Engine.ts";
import type { View } from "../View.ts";
import { planClip, type ClipSet, type ClipViewPlacement } from "./clips.ts";

/** What a view's clips are placed by this tick. */
export function placementOf(
  engine: Pick<Engine, "cameras">,
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
  };
}

/**
 * The view's clip sets that are curved surfaces in it (planClip's `curvilinear`):
 * what the world fits a field for (`WorldCurvilinearClips.frame`). A set that
 * can't be placed is left to `writeClips` to report.
 */
export function curvilinearClipSets(
  engine: Pick<Engine, "cameras">,
  view: View,
): ClipSet[] {
  const sets = view.clipSets();
  if (sets.length === 0) {
    return [];
  }
  const placement = placementOf(engine, view);
  const curvilinear: ClipSet[] = [];
  for (const set of sets) {
    try {
      if (planClip(set, placement).space === "curvilinear") {
        curvilinear.push(set);
      }
    } catch {
      // reported by writeClips
    }
  }
  return curvilinear;
}
