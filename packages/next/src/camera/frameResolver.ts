// The camera layer's view of reference frames (spec section 7.2). The core
// names reference frames only through these; the frames module implements
// them over its catalog, and the core's own resolver over its transform
// table. Plan 5a's call 14: `FrameUnavailableError` lives here, so the camera
// layer recognises "not ready" from any resolver.
import type { AnchorHandle } from "../scene/world/types.ts";
import type { ViewId } from "../transform/graph.ts";
import type { Route } from "./route.ts";

/** Anything that names a reference frame. A frames-module `Frame` satisfies it. */
export interface FrameKey {
  readonly name: string;
}

/**
 * A reference frame that can't answer yet, or can't answer at this instant:
 *
 * - `"loading"`: its data is still on the way and it has no stand-in;
 * - `"failed"`: its data failed to load and it has no stand-in;
 * - `"outsideData"`: the instant lies outside the span its data covers.
 *
 * Rendering falls back on it (the view keeps its last good placement);
 * measuring lets it throw.
 */
export class FrameUnavailableError extends Error {
  /** The reference frame's name. */
  readonly frame: string;
  readonly reason: "loading" | "failed" | "outsideData";

  constructor(
    frame: string,
    reason: "loading" | "failed" | "outsideData",
    message?: string,
    options?: ErrorOptions,
  ) {
    super(message ?? defaultMessage(frame, reason), options);
    this.name = "FrameUnavailableError";
    this.frame = frame;
    this.reason = reason;
  }
}

function defaultMessage(
  frame: string,
  reason: "loading" | "failed" | "outsideData",
): string {
  switch (reason) {
    case "loading":
      return `${frame}: its data is still loading`;
    case "failed":
      return `${frame}: its data failed to load`;
    case "outsideData":
      return `${frame}: the instant is outside its data`;
  }
}

/** How fast a reference frame moves in a base: m/s and rad/s, in the base's axes. */
export interface FrameMotion {
  readonly velocity: Float64Array;
  readonly angularVelocity: Float64Array;
}

/**
 * "Where is reference frame A in reference frame B at this scene time, and
 * how fast is it moving?" (spec section 7.2). The core's own answers over
 * its transform table (`tableResolver`); the frames module's over its
 * catalog; a host's over its own services.
 */
export interface FrameResolver {
  /**
   * `frame`'s place in `base` at scene `seconds` (UTC seconds since 1970):
   * `out` such that p_base = out · p_frame, column-major float64, metres.
   * Throws `FrameUnavailableError` when it can't answer yet, and
   * `NonRigidRouteError` when the route crosses a warp (a non-rigid edge
   * has no 4×4; ask `route`).
   */
  resolve(
    frame: FrameKey,
    base: FrameKey,
    seconds: number,
    out: Float64Array,
  ): Float64Array;
  /**
   * The path from `frame` to `base` at scene `seconds`: rigid steps and warp
   * steps in order (`Route`), a warp step forward where the route goes up
   * from a frame to its parent. A route that crosses no smooth edge is one
   * rigid step with `resolve`'s matrix. `view` is the view the route is for,
   * which a switch frame chooses its edge by (any object, a name or a
   * number); without one a switch uses its default. Throws
   * `FrameUnavailableError` as `resolve` does. A resolver without it has only
   * rigid routes (`resolveRoute`).
   */
  route?(
    frame: FrameKey,
    base: FrameKey,
    seconds: number,
    view?: ViewId,
  ): Route;
  /**
   * Binds `anchor` to `frame`: content under the anchor is in `frame`'s
   * coordinates (a frame of a smooth edge draws it through the edge). A
   * resolver over a frame catalog has it; the transform table's has not.
   */
  bindAnchor?(anchor: AnchorHandle, frame: FrameKey): void;
  /** The frame `anchor` is bound to, if any. */
  binding?(anchor: AnchorHandle): FrameKey | undefined;
  /**
   * How fast `frame` moves in `base` at `seconds`, written into `out`. A
   * resolver may throw `NonRigidRouteError` for a route that crosses a warp.
   */
  motion?(
    frame: FrameKey,
    base: FrameKey,
    seconds: number,
    out: FrameMotion,
  ): FrameMotion;
  /**
   * How accurately a point in `frame` (metres, in its axes) is placed in
   * `base` at `seconds`, 1σ: `meters` is `undefined` when the route states
   * none, and `note` says why or from what. Without it a route is taken as
   * exact: "the transform table states no error". Across a warp, the warp's
   * `accuracy.sigma` joins the 1σ composition; a warp that states only a
   * `bound` leaves `meters` undefined (a bound is not a σ) and the note
   * names it.
   */
  accuracy?(
    point: ArrayLike<number>,
    frame: FrameKey,
    base: FrameKey,
    seconds: number,
  ): { readonly meters: number | undefined; readonly note: string };
  /**
   * Goes up when the inputs of the route from `frame` to `base` change
   * (data arriving, a transform set), never with time alone: the camera
   * layer skips a tick's work while the time, the root and every route's
   * revision stay as they were. It counts the `revision` of each warp on
   * the route, so a warp's changing bumps it.
   */
  routeRevision(frame: FrameKey, base: FrameKey): number;
  /**
   * Calls `listener` when a route's revision may have gone up without the
   * clock moving (data arriving, a binding changed, a warp frame defined or
   * its revision changed). The camera layer
   * watches its resolvers so that on-demand rendering wakes for it.
   * Returns a remover.
   */
  watch?(listener: () => void): () => void;
}
