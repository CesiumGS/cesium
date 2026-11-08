import type {
  CoordinateOperation,
  ResolvedCoordinates,
} from "../frames/coordinates.ts";
import { cartographic } from "../math/ellipsoid.ts";
import { EARTH, type Body } from "../scene/Body.ts";
import type { DesignPlacement } from "../streaming/designPlacement.ts";
import type { RecordedOperation } from "./crs.ts";
import { EngineeringFrame, RigidPlacement } from "./EngineeringFrame.ts";

/**
 * The hit tileset's warning when its placement can't invert a pick (and a
 * hosted placement's error without the host's coordinates).
 */
export const DESIGN_NOT_INVERTED =
  "a pick on this tileset has no design coordinates: its placement can't invert the hit (outside the operation's domain, or at the body's centre)";

/**
 * Where a tileset's design coordinates are drawn, and the exact way back
 * (spec section 7.3), through an engineering frame. Plan 5 builds a
 * tileset's two end states from these: a rigid placement (one transform,
 * sagging away from its anchor) and a reprojected one (every vertex through
 * the frame, no sag). `frameName` is the frame's definition's name, and
 * `displayError(design)` is `|displayed(design) - frame.toBodyFixed(design)|`.
 * `O` is the frame's operation type (`EngineeringFrame`).
 */
export interface TilesetPlacement<
  O extends CoordinateOperation = RecordedOperation,
> extends DesignPlacement {
  readonly frame: EngineeringFrame<O>;
  /** The rigid transform; rigid placements only. */
  readonly rigid?: RigidPlacement<O>;
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
): TilesetPlacement<CoordinateOperation> | undefined {
  const frame: unknown = (placement as Partial<TilesetPlacement> | undefined)
    ?.frame;
  return frame instanceof EngineeringFrame
    ? (placement as TilesetPlacement<CoordinateOperation>)
    : undefined;
}

/**
 * A rigid placement at `anchor` (design coordinates), as `ecefLocation` does:
 * exact at the anchor, sagging away from it.
 */
export function placeRigid<O extends CoordinateOperation>(
  frame: EngineeringFrame<O>,
  anchor: ArrayLike<number>,
): TilesetPlacement<O> {
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
export function placeReprojected<O extends CoordinateOperation>(
  frame: EngineeringFrame<O>,
): TilesetPlacement<O> {
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

const DEGREES_PER_RADIAN = 180 / Math.PI;

/**
 * A hosted placement (spec section 7.9): the producer or the host
 * reprojected the content, and the engine doesn't reproduce the operation.
 * The content is drawn as delivered: `displayed` is the identity on its
 * body-fixed metres, and `displayError` is 0 (the host's reprojection
 * error is the host's to state).
 *
 * Design coordinates come only from the host's coordinate service: given
 * `coordinates` (a `CoordinateService`'s answer for the content's design
 * CRS on `body`, the Earth by default), `designOf` takes a position
 * through `body`'s ellipsoid to longitude, latitude and height and through
 * the host's operation's inverse to the CRS's own coordinates (no site
 * transform). Without it, or where the operation answers a non-finite
 * number, `designOf` throws `DESIGN_NOT_INVERTED`, so a pick on the content
 * reports true values only. Not an engineering placement
 * (`engineeringPlacement` gives undefined): it names no engineering frame,
 * so `pickDesign` and snapping give it no design points; the frames
 * module's pick interpreter does, through its `placements` callback.
 */
export function placeHosted(
  frameName: string,
  coordinates?: ResolvedCoordinates,
  body: Body = EARTH,
): DesignPlacement {
  const operation = coordinates?.operation;
  return {
    mode: "hosted",
    frameName,
    displayed: (position, out = new Float64Array(3)) => {
      out[0] = position[0]!;
      out[1] = position[1]!;
      out[2] = position[2] ?? 0;
      return out;
    },
    designOf: (position, out = new Float64Array(3)) => {
      if (operation === undefined) {
        throw new Error(DESIGN_NOT_INVERTED);
      }
      const geodetic = body.ellipsoid.cartesianToCartographic(
        Float64Array.from([position[0]!, position[1]!, position[2] ?? 0]),
        cartographic(),
      );
      if (geodetic === undefined) {
        throw new RangeError(DESIGN_NOT_INVERTED);
      }
      operation.inverse(
        [
          geodetic.longitude * DEGREES_PER_RADIAN,
          geodetic.latitude * DEGREES_PER_RADIAN,
          geodetic.height,
        ],
        out,
      );
      if (!(
        Number.isFinite(out[0]) &&
        Number.isFinite(out[1]) &&
        Number.isFinite(out[2])
      )) {
        throw new RangeError(DESIGN_NOT_INVERTED);
      }
      return out;
    },
    displayError: () => 0,
  };
}
