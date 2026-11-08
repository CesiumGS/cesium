// The camera layer's view of reference frames (spec section 7.2). The core
// names reference frames only through these; the frames module implements
// them over its catalog, and the core's own resolver over its transform
// table. Plan 5a's call 14: `FrameUnavailableError` lives here, so the camera
// layer recognises "not ready" from any resolver.

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
   * Throws `FrameUnavailableError` when it can't answer yet.
   */
  resolve(
    frame: FrameKey,
    base: FrameKey,
    seconds: number,
    out: Float64Array,
  ): Float64Array;
  /** How fast `frame` moves in `base` at `seconds`, written into `out`. */
  motion?(
    frame: FrameKey,
    base: FrameKey,
    seconds: number,
    out: FrameMotion,
  ): FrameMotion;
  /**
   * Goes up when the inputs of the route from `frame` to `base` change
   * (data arriving, a transform set), never with time alone: the camera
   * layer skips a tick's work while the time, the root and every route's
   * revision stay as they were.
   */
  routeRevision(frame: FrameKey, base: FrameKey): number;
}
