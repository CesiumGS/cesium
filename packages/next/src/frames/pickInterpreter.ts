// The frames module's pick interpreter (spec section 7.9; plan 5a, Task 15;
// closes plan 3's R8): a core pick (`View.pickPoint`) tagged with its
// reference frame, its body, its body-fixed position, design coordinates
// where the content has a placement, and its composed accuracy.
import type { FrameKey } from "../camera/frameResolver.ts";
import type { Body } from "../scene/Body.ts";
import type { CorePick, PickInterpreter } from "../scene/pick.ts";
import type { AnchorHandle, DrawHandle } from "../scene/World.ts";
import type { DesignPlacement } from "../streaming/designPlacement.ts";
import type { FrameCatalog } from "./catalog.ts";
import { Frame } from "./Frame.ts";
import { convertPoint, framePoint } from "./local.ts";
import { pointAccuracy, type PointAccuracy } from "./pointAccuracy.ts";
import type { FramesResolver } from "./resolver.ts";

/** A picked point tagged with its reference frame (`createFramesPickInterpreter`). */
export interface FramedPoint {
  /**
   * The reference frame the point is in: the hit draw's anchor's binding
   * (ITRF under the Earth's anchor), else the render root's.
   */
  readonly frame: Frame;
  /** The body whose fixed reference frame `frame` is or descends from. */
  readonly body?: Body;
  /** The point in the body's fixed reference frame (ITRF, MOON_ME), m. */
  readonly bodyFixed?: Float64Array;
  /**
   * Design coordinates, where the hit draw's content has a placement
   * (`placements`) that can invert the point.
   */
  readonly design?: {
    readonly placement: DesignPlacement;
    readonly coordinates: Float64Array;
  };
  /**
   * How accurately the drawn point is where `frame` says, composed along
   * the route it was drawn through (`pointAccuracy` from `frame` to the
   * render root's reference frame, at the pick's instant): no terms, 0 m,
   * when the point is in the render root's own reference frame.
   */
  readonly accuracy: PointAccuracy;
  /**
   * The point in `frame` (any reference frame of the catalog's tree), at
   * the pick's instant. Throws as `frameTransform` does (a reference frame
   * that can't answer at that instant).
   */
  in(frame: Frame): Float64Array;
}

/** Options of `createFramesPickInterpreter`. */
export interface FramesPickInterpreterOptions {
  /** The design placement of a draw's content, if it has one (a tileset's `placement`). */
  placements?(draw: DrawHandle): DesignPlacement | undefined;
}

/**
 * The frames module's `PickInterpreter`: turns a core pick into a point
 * tagged with its reference frame, through `resolver`'s anchor bindings, at
 * the pick's scene seconds (`resolver.instant`).
 *
 * - The point's reference frame is the hit draw's anchor's binding, with
 *   its coordinates `anchorPosition`. Content under an unbound anchor, or
 *   under none, sits in the render root's reference frame (the resolver
 *   puts an unbound end at the root's origin), with `position`.
 * - Undefined when neither names a reference frame (the transform table's
 *   root as the render root, under no bound anchor).
 * - A placement that can't invert the point (`designOf` throws) gives the
 *   point without design coordinates.
 */
export function createFramesPickInterpreter(
  resolver: FramesResolver,
  catalog: FrameCatalog,
  options: FramesPickInterpreterOptions = {},
): PickInterpreter<FramedPoint> {
  /** The reference frame a frame key names through the resolver, if any. */
  const frameOf = (key: FrameKey | undefined): Frame | undefined => {
    if (key instanceof Frame) {
      return key;
    }
    if (key !== undefined && "slot" in key) {
      return resolver.binding(key as AnchorHandle);
    }
    return undefined;
  };
  return {
    interpret(pick: CorePick): FramedPoint | undefined {
      const root = frameOf(pick.root);
      let frame = frameOf(pick.anchor);
      let coordinates = pick.anchorPosition;
      if (!frame) {
        frame = root;
        coordinates = pick.position;
      }
      if (!frame) {
        return undefined;
      }
      const instant = resolver.instant(pick.seconds);
      const point = framePoint(frame, coordinates, instant);
      const body = catalog.bodyOf(frame);
      let bodyFixed: Float64Array | undefined;
      if (body) {
        const fixed = catalog.bodyFixed(body);
        bodyFixed =
          fixed === frame
            ? Float64Array.from(coordinates)
            : convertPoint(point, fixed).position;
      }
      let design: FramedPoint["design"];
      const placement =
        pick.draw && options.placements
          ? options.placements(pick.draw)
          : undefined;
      if (placement && bodyFixed) {
        try {
          design = {
            placement,
            coordinates: placement.designOf(bodyFixed),
          };
        } catch {
          // The placement can't invert this point (outside its operation's
          // domain): the true values stand, without design coordinates.
        }
      }
      return {
        frame,
        ...(body !== undefined && { body }),
        ...(bodyFixed !== undefined && { bodyFixed }),
        ...(design !== undefined && { design }),
        accuracy: pointAccuracy(point, root ?? frame),
        in: (target: Frame) => convertPoint(point, target).position,
      };
    },
  };
}
