// Occluders: what can prove a tile's bound hidden, so selection neither draws
// nor fetches it. Horizon culling is the first: the body's own drawn terrain
// is a closed opaque shell, and whatever lies inside it is hidden from a
// camera outside (`globe/bodyOccluder.ts`). The depth pyramid's cull is
// another (the view's own drawn depth, `ViewOcclusion`), and registers here
// too.
//
// An occluder never guesses: `hidden` is true only when it PROVES the bound
// hidden from the view's camera, so an occluder that can't say (not
// prepared, off, the camera inside) answers false. A view carries a list
// (`SelectionView.occluders`); a bound is hidden if ANY of them says so.
// `prepare` runs once per view per selection pass, before any `hidden`,
// for work that depends on the camera (the body occluder's cap query).
import type { Vec3 } from "../math/vec3.ts";
import type { SelectionView } from "./Stepwise.ts";
import type { TileVolume } from "./volumes.ts";

export interface Occluder {
  /** Once per view and selection pass, before its `hidden` calls. */
  prepare(view: SelectionView): void;
  /**
   * True only when `bound` (a tile's volume where it is drawn, in the
   * view's anchor coordinates) is proven hidden from the view's camera.
   */
  hidden(bound: TileVolume, view: SelectionView): boolean;
}

/** An occluder that is a scaled copy of the body's ellipsoid (a depth pyramid can rasterize it). */
export interface BodyShape {
  readonly centre: Vec3;
  /** The radii (x, y, z), m, of the ellipsoid that hides what is inside it. */
  readonly radii: Vec3;
}

/** Whether any of `occluders` proves `bound` hidden from `view`. */
export function hiddenBy(
  occluders: readonly Occluder[] | undefined,
  bound: TileVolume,
  view: SelectionView,
): boolean {
  if (occluders) {
    for (const occluder of occluders) {
      if (occluder.hidden(bound, view)) {
        return true;
      }
    }
  }
  return false;
}
