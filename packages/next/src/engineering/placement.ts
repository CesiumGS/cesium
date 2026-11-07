import { RigidPlacement, type EngineeringFrame } from "./EngineeringFrame.ts";

/** How a tileset's design coordinates become drawn positions. */
export type PlacementMode = "rigid" | "reprojected";

/**
 * Where a tileset's design coordinates are drawn, and the exact way back
 * (spec section 7.3). Plan 5 builds a tileset's two end states from these:
 * a rigid placement (one transform, sagging away from its anchor) and a
 * reprojected one (every vertex through the frame, no sag).
 */
export interface TilesetPlacement {
  readonly mode: PlacementMode;
  readonly frame: EngineeringFrame;
  /** The rigid transform; rigid placements only. */
  readonly rigid?: RigidPlacement;
  /** Body-fixed metres of a design point, as this placement draws it. */
  displayed(
    design: ArrayLike<number>,
    out?: Float64Array<ArrayBuffer>,
  ): Float64Array;
  /**
   * The design coordinates of a drawn position: the exact inverse of
   * `displayed`, so a measurement agrees with the CAD data in either mode.
   */
  designOf(
    position: ArrayLike<number>,
    out?: Float64Array<ArrayBuffer>,
  ): Float64Array;
  /**
   * `|displayed(design) - frame.toBodyFixed(design)|` in metres: how far this
   * placement draws the point from where it truly is. 0 when reprojected.
   */
  displayError(design: ArrayLike<number>): number;
}

/**
 * A rigid placement at `anchor` (design coordinates), as `ecefLocation` does:
 * exact at the anchor, sagging away from it.
 */
export function placeRigid(
  frame: EngineeringFrame,
  anchor: ArrayLike<number>,
): TilesetPlacement {
  const rigid = RigidPlacement.at(frame, anchor);
  const truth = new Float64Array(3);
  return {
    mode: "rigid",
    frame,
    rigid,
    displayed: (design, out = new Float64Array(3)) =>
      rigid.toBodyFixed(design, out),
    designOf: (position, out = new Float64Array(3)) =>
      rigid.fromBodyFixed(position, out),
    displayError(design) {
      const shown = rigid.toBodyFixed(design);
      frame.toBodyFixed(design, truth);
      return Math.hypot(
        shown[0]! - truth[0]!,
        shown[1]! - truth[1]!,
        shown[2]! - truth[2]!,
      );
    },
  };
}

/** A reprojected placement: every point goes through the frame itself. */
export function placeReprojected(frame: EngineeringFrame): TilesetPlacement {
  return {
    mode: "reprojected",
    frame,
    displayed: (design, out = new Float64Array(3)) =>
      frame.toBodyFixed(design, out),
    designOf: (position, out = new Float64Array(3)) =>
      frame.fromBodyFixed(position, out),
    displayError: () => 0,
  };
}
