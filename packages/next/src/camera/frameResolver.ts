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
