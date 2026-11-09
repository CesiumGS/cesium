// The per-draw placement query (spec section 8.2): which placement applies
// to a draw in a view, the render root it is computed for, and why. With
// per-vertex placement, it is the seam a later tessellation engine
// consumes (section 8.4): a query, not only what the frames module pushes
// into the core.
import type { FrameKey } from "../camera/frameResolver.ts";
import type { FittedOperation, Placement } from "../scene/placement.ts";
import type { View } from "../scene/View.ts";
import type { World } from "../scene/World.ts";
import type { DrawHandle } from "../scene/world/types.ts";
import type { FramesResolver } from "./resolver.ts";

/** What `placementOf` answers. */
export interface DrawPlacementInfo {
  /** The draw's placement's kind (`"affine"`: its transform alone). */
  readonly kind: Placement["kind"];
  /** The view's render root, which the placement is computed for. */
  readonly root: FrameKey;
  /**
   * Why, in words: the per-vertex term (its coordinate operation, where
   * stated), then the draw's transform from the reference frame its
   * content is in to the render root.
   */
  readonly operation?: string;
  /**
   * The placement's own error, meters: 0 for the transform alone, a
   * fitted operation's stated bound, and for a blend its ends' bounds
   * weighted by `|1 − t|` and `|t|`. Undefined for a dual position, whose
   * points are the content's only at `t = 0` or `t = 1`.
   */
  readonly errorBound?: number;
  /**
   * Whether it can be evaluated at points the content never had: false
   * for a dual position only (plan 5a's ruling 4).
   */
  readonly resamplable: boolean;
}

/**
 * Which placement applies to `draw` in `view`, for which render root, and
 * why (spec section 8.2's query). `resolver` names the reference frame the
 * draw's anchor is bound to. Undefined for a removed draw, or a view of
 * another world.
 */
export function placementOf(
  world: World,
  draw: DrawHandle,
  view: View,
  resolver: FramesResolver,
): DrawPlacementInfo | undefined {
  if (view.world !== world || !world.hasDraw(draw)) {
    return undefined;
  }
  const root = view.renderRoot?.() ?? world.root;
  const anchor = world.drawAnchor(draw);
  const content = anchor
    ? (resolver.binding(anchor)?.name ?? anchor.name)
    : world.root.name;
  const transform = `the draw's transform from ${content} to the render root, ${root.name}`;
  const placement = world.drawPlacement(draw);
  if (!placement || placement.kind === "affine") {
    return {
      kind: "affine",
      root,
      operation: transform,
      errorBound: 0,
      resamplable: true,
    };
  }
  switch (placement.kind) {
    case "dual":
      return {
        kind: "dual",
        root,
        operation: `a dual position (${placement.semantic}) at t = ${placement.t.value}, then ${transform}`,
        resamplable: false,
      };
    case "fitted":
      return {
        kind: "fitted",
        root,
        operation: `${fitted(placement)}, then ${transform}`,
        errorBound: placement.errorBound,
        resamplable: true,
      };
    case "blend": {
      const t = placement.t.value;
      const error = (e: "identity" | FittedOperation) =>
        e === "identity" ? 0 : e.errorBound;
      return {
        kind: "blend",
        root,
        operation: `a blend at t = ${t} of ${end(placement.from)} and ${end(placement.to)}, then ${transform}`,
        errorBound:
          Math.abs(1 - t) * error(placement.from) +
          Math.abs(t) * error(placement.to),
        resamplable: true,
      };
    }
  }
}

function fitted(f: FittedOperation): string {
  return `a fitted operation (${f.operation ?? "a polynomial of order 3 over the tile"}; within ${f.errorBound} m)`;
}

function end(e: "identity" | FittedOperation): string {
  return e === "identity" ? "the identity" : fitted(e);
}
