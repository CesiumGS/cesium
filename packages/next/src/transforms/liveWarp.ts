// The base of the live smooth-frame helpers (plan §13.37): a revision, and the
// frames to invalidate when the helper changes. `verticalExaggeration`,
// `heightOffset` (georeference), `scaleAbout`, `blend` and `fromFunction`
// build on it; each returns a `SmoothFrameSpec` for `smoothFrame`.
import type { SmoothFrameSpec, Warp } from "../camera/route.ts";

/**
 * A `SmoothFrameSpec` that can change: `changed()` says its inputs did. It
 * bumps `revision`, so every route through it is refitted, and invalidates
 * the frames built on it (`smoothFrame(name, parent, spec)`), which wakes
 * whoever watches the frames resolver.
 */
export interface ChangeableWarp extends SmoothFrameSpec {
  changed(): void;
}

/** What `liveWarp` stands in for the ends of a warp with: only `name` is read, in messages. */
export const NO_FRAME = { name: "(unattached)" };

/** The base of the helpers' specs: a revision, and the frames to invalidate. */
export abstract class LiveWarp implements ChangeableWarp {
  private own = 1;
  private readonly frames = new Set<{ invalidate(): void }>();

  get revision(): number {
    return this.own;
  }

  abstract forward(
    p: ArrayLike<number>,
    out: Float64Array,
    jacobian?: Float64Array,
  ): Float64Array;

  attach(frame: { invalidate(): void }): void {
    this.frames.add(frame);
  }

  changed(): void {
    this.own++;
    for (const frame of this.frames) {
      frame.invalidate();
    }
  }

  /** The helper's inputs' own changes, for a getter that sums revisions. */
  protected get ownRevision(): number {
    return this.own;
  }
}

/** `spec` as a `Warp` between no frames, for `warpForward` and `warpInverse`: it reads `spec` live. */
export function liveWarp(spec: SmoothFrameSpec): Warp {
  return {
    from: NO_FRAME,
    to: NO_FRAME,
    get revision() {
      return spec.revision;
    },
    get domain() {
      return spec.domain;
    },
    get accuracy() {
      return spec.accuracy;
    },
    get description() {
      return spec.description;
    },
    get scale() {
      return spec.scale;
    },
    get smooth() {
      return spec.smooth;
    },
    forward: (p, out, jacobian) => spec.forward(p, out, jacobian),
    ...(spec.inverse !== undefined && {
      inverse: (q: ArrayLike<number>, out: Float64Array) =>
        spec.inverse!(q, out),
    }),
  };
}
