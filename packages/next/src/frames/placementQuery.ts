// The per-draw placement query (spec section 8.2): which placement applies
// to a draw in a view, the render root it is computed for, and why. With
// per-vertex placement, it is the seam a later tessellation engine
// consumes (section 8.4): a query, not only what the frames module pushes
// into the core.
import type { FrameKey } from "../camera/frameResolver.ts";
import type { Route } from "../camera/route.ts";
import type { Placement } from "../scene/placement.ts";
import type { View } from "../scene/View.ts";
import type { World } from "../scene/World.ts";
import type { TermWeight, WarpTerm, WarpTerms } from "../scene/warpTerms.ts";
import type { DrawHandle } from "../scene/world/types.ts";
import type { FramesResolver } from "./resolver.ts";

/** What `placementOf` answers. */
export interface DrawPlacementInfo {
  /**
   * The draw's placement's kind (`"affine"`: its transform alone): the kind
   * it was set as, or for terms set directly, the nearest: a lone absolute
   * attribute is `"dual"`, a lone lattice `"fitted"`, else `"blend"`.
   */
  readonly kind: Placement["kind"];
  /** The view's render root, which the placement is computed for. */
  readonly root: FrameKey;
  /**
   * Why, in words: the per-vertex terms (their coordinate operations, where
   * stated), then the draw's transform from the reference frame its
   * content is in to the render root.
   */
  readonly operation?: string;
  /**
   * The placement's own error, meters: 0 for the transform alone, else the
   * lattices' stated bounds weighted by `|w|`. Undefined where a term is an
   * attribute (a dual position), whose points are the content's only at
   * its weight 0 or 1.
   */
  readonly errorBound?: number;
  /**
   * Whether `errorBound` is an estimate (a lattice's was measured at
   * samples, not proven) rather than a bound. Absent where there is no
   * `errorBound`.
   */
  readonly estimate?: boolean;
  /**
   * Whether it can be evaluated at points the content never had: false
   * where a term is an attribute (plan 5a's ruling 4).
   */
  readonly resamplable: boolean;
  /**
   * The terms the GPU sums, `p + Σ wᵢ·Dᵢ(p)` (plan 13.26): none for the
   * transform alone. Each has its weight now, and a lattice its cells per
   * axis and stated error, an attribute its name.
   */
  readonly terms: readonly {
    readonly kind: "lattice" | "attribute";
    /** Its weight now: its scale times its factors' values. */
    readonly weight: number;
    /** A lattice's cells per axis. */
    readonly cells?: number;
    /** A lattice's stated error, meters. */
    readonly errorBound?: number;
    /** True where `errorBound` was measured rather than proven. */
    readonly estimate?: boolean;
    /** An attribute's name (`MeshData.attributes`). */
    readonly semantic?: string;
    /** An attribute that holds a position, not a displacement. */
    readonly absolute?: boolean;
  }[];
  /**
   * Where the draw's anchor reaches the render root across a warp (plan
   * 13.26): the warps crossed in order, whether any is a presentation (the
   * draw is then drawn where it is not), and the state of the draw's fit.
   * Its lattice, `terms`' last entry, has the cells, error and estimate.
   * Absent for a rigid route.
   */
  readonly route?: {
    readonly warps: readonly {
      readonly description: string;
      readonly presentation: boolean;
      /** The route goes from the warp's `to` back to its `from`. */
      readonly inverse: boolean;
      /** The warp's scale now, when it has one (1: the warp as stated). */
      readonly scale?: number;
    }[];
    readonly presentation: boolean;
    /** The route's revision; a fit is redone when it changes. */
    readonly revision: number;
    /**
     * "fitted": drawn at the current fit; "stale": an older fit is drawn
     * while a refit runs; "pending": hidden until its first fit; "unwarped":
     * a billboard, point or instanced draw, which has no per-vertex
     * placement and is drawn at its anchor's affine place.
     */
    readonly fit: "fitted" | "stale" | "pending" | "unwarped";
  };
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
  const through = routeOf(view.anchorRoute(anchor), world.warps.status(draw));
  const placed = world.scene.drawPlacements[draw.index];
  if (!placed) {
    return {
      kind: "affine",
      root,
      operation: through
        ? `${transform}, across ${through.warps.map((w) => w.description).join(", then ")} (${through.fit})`
        : transform,
      ...(through ? {} : { errorBound: 0 }),
      resamplable: true,
      terms: [],
      ...(through && { route: through }),
    };
  }
  const terms = placed.terms;
  const weights = terms.map(({ weight }) => weightOf(weight));
  const info: DrawPlacementInfo = {
    kind: placed.placement?.kind ?? kindOf(terms),
    root,
    operation: `${terms.map(({ term }, i) => describe(term, weights[i]!)).join(" plus ")}, then ${transform}`,
    resamplable: terms.every(({ term }) => term.kind !== "attribute"),
    ...(through && { route: through }),
    terms: terms.map(({ term }, i) =>
      term.kind === "cubic"
        ? {
            kind: "lattice",
            weight: weights[i]!,
            cells: term.cells,
            errorBound: term.errorBound,
            estimate: term.estimate,
          }
        : {
            kind: "attribute",
            weight: weights[i]!,
            semantic: term.semantic,
            absolute: term.absolute,
          },
    ),
  };
  if (terms.some(({ term }) => term.kind === "attribute")) {
    return info;
  }
  let error = 0;
  let estimate = false;
  terms.forEach(({ term }, i) => {
    if (term.kind === "cubic") {
      error += Math.abs(weights[i]!) * term.errorBound;
      estimate ||= term.estimate;
    }
  });
  return { ...info, errorBound: error, estimate };
}

/** The route a draw's anchor is placed by across warps, as the query reports it; undefined for a rigid one. */
function routeOf(
  route: Route | undefined,
  status: { readonly state: "fitted" | "stale" | "pending" } | undefined,
): NonNullable<DrawPlacementInfo["route"]> | undefined {
  if (!route) {
    return undefined;
  }
  return {
    warps: route.steps.flatMap((step) =>
      step.kind === "warp"
        ? [
            {
              description:
                step.warp.description ??
                `${step.warp.from.name} to ${step.warp.to.name}`,
              presentation: step.warp.presentation,
              inverse: step.inverse,
              ...(step.warp.scale && { scale: step.warp.scale.value }),
            },
          ]
        : [],
    ),
    presentation: route.presentation,
    revision: route.revision,
    fit: status?.state ?? "unwarped",
  };
}

/** The public kind nearest to terms set directly. */
function kindOf(terms: WarpTerms): Placement["kind"] {
  const only = terms.length === 1 ? terms[0]!.term : undefined;
  if (only?.kind === "attribute" && only.absolute) {
    return "dual";
  }
  return only?.kind === "cubic" ? "fitted" : "blend";
}

function describe(term: WarpTerm, weight: number): string {
  if (term.kind === "attribute") {
    return term.absolute
      ? `a dual position (${term.semantic}) at t = ${weight}`
      : `a displacement attribute (${term.semantic}) weighted ${weight}`;
  }
  const lattice = `a fitted operation (${term.operation ?? "a polynomial of order 3 over the tile"}; ${term.estimate ? "about" : "within"} ${term.errorBound} m)`;
  return weight === 1 ? lattice : `${lattice} weighted ${weight}`;
}

/** A term's weight now (the frames layer's copy of scene/warpEvaluate.ts's: it imports no core values). */
function weightOf(weight: TermWeight): number {
  let w = weight.scale;
  for (const f of weight.factors) {
    w *= f.offset + f.slope * f.parameter.value;
  }
  return w;
}
