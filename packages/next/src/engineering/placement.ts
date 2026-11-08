import type { DesignPlacement } from "../streaming/designPlacement.ts";
import { EngineeringFrame, RigidPlacement } from "./EngineeringFrame.ts";

/**
 * Where a tileset's design coordinates are drawn, and the exact way back
 * (spec section 7.3), through an engineering frame. Plan 5 builds a
 * tileset's two end states from these: a rigid placement (one transform,
 * sagging away from its anchor) and a reprojected one (every vertex through
 * the frame, no sag). `frameName` is the frame's definition's name, and
 * `displayError(design)` is `|displayed(design) - frame.toBodyFixed(design)|`.
 */
export interface TilesetPlacement extends DesignPlacement {
  readonly frame: EngineeringFrame;
  /** The rigid transform; rigid placements only. */
  readonly rigid?: RigidPlacement;
}

/**
 * A tileset's placement as a `TilesetPlacement`: `placement` itself when its
 * `frame` is an `EngineeringFrame` (one `placeRigid`, `placeReprojected` or
 * `georeferenceTileset` built, or an application's), else undefined. Picks
 * and snaps get design points only through such a placement; any other
 * `DesignPlacement` draws and inverts, but names no engineering frame.
 */
export function engineeringPlacement(
  placement: DesignPlacement | undefined,
): TilesetPlacement | undefined {
  const frame: unknown = (placement as Partial<TilesetPlacement> | undefined)
    ?.frame;
  return frame instanceof EngineeringFrame
    ? (placement as TilesetPlacement)
    : undefined;
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
    frameName: frame.definition.name,
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
    frameName: frame.definition.name,
    frame,
    displayed: (design, out = new Float64Array(3)) =>
      frame.toBodyFixed(design, out),
    designOf: (position, out = new Float64Array(3)) =>
      frame.fromBodyFixed(position, out),
    displayError: () => 0,
  };
}
