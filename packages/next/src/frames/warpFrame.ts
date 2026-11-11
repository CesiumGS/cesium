// A frame whose edge to its parent is a warp, not a 4×4 (plan §13.26, the
// second review): an application's vertical exaggeration, or a coordinate
// operation with no rigid form. The frames resolver composes routes through
// it as warp steps (`FrameResolver.route`); anything that needs one matrix
// across it (`frameTransform`, `FrameResolver.resolve`) throws
// `NonRigidRouteError`.
import { NonRigidRouteError, type Warp } from "../camera/route.ts";
import { Frame } from "./Frame.ts";
import type { FrameAccuracy } from "./frameAccuracy.ts";

/** A `Warp` without its ends: `from` is the parent and `to` the new frame. */
export type WarpSpec = Omit<Warp, "from" | "to">;

/**
 * A child of `parent` placed by a warp: `p_child = warp.forward(p_parent)`.
 * `warp` is live: it reads `spec` on every call, so changing the spec's
 * `revision` (a counter the application owns) is seen by routes at once.
 * Say so with `invalidate()` too, which also wakes whoever `watch`es the
 * frames resolver. The frame's accuracy is the warp's `accuracy.sigma` (1σ);
 * a warp stating only a `bound` has no accuracy stated here, as a bound is
 * not a σ; a warp stating neither is exact by definition.
 */
export class WarpFrame<N extends string = string> extends Frame<N> {
  readonly warp: Warp;
  private readonly listeners = new Set<() => void>();
  private readonly spec: WarpSpec;

  constructor(name: N, parent: Frame, spec: WarpSpec) {
    super(
      name,
      parent,
      () => {
        throw new NonRigidRouteError(name, parent.name);
      },
      { cache: false, accuracy: () => accuracyOf(spec) },
    );
    this.spec = spec;
    const inverse = spec.inverse;
    this.warp = {
      from: parent,
      to: this,
      get presentation() {
        return spec.presentation;
      },
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
      forward: (p, out, jacobian) => spec.forward(p, out, jacobian),
      ...(inverse !== undefined && {
        inverse: (q: ArrayLike<number>, out: Float64Array) => inverse(q, out),
      }),
    };
  }

  /** It has no matrix: throws `NonRigidRouteError`. */
  override toParent(): never {
    throw new NonRigidRouteError(this.name, this.parent!.name);
  }

  override get revision(): number {
    return super.revision + this.spec.revision;
  }

  override invalidate(): void {
    super.invalidate();
    for (const listener of this.listeners) {
      listener();
    }
  }

  /** Calls `listener` after `invalidate()`; returns a remover. */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

/**
 * A frame placed in `parent` by a warp (`spec.forward`, parent to child),
 * named `name`: `catalog.add(frame)` it, put a rig or content on it, and
 * routes through it carry the warp as a step. Its `warp.from` is `parent`
 * and `warp.to` the frame.
 */
export function warpFrame<N extends string>(
  name: N,
  parent: Frame,
  spec: WarpSpec,
): WarpFrame<N> {
  return new WarpFrame(name, parent, spec);
}

/** Whether `f`'s edge to its parent is a warp. */
export function isWarpFrame(f: Frame): f is WarpFrame {
  return f instanceof WarpFrame;
}

function accuracyOf(spec: WarpSpec): FrameAccuracy {
  const a = spec.accuracy;
  const what = spec.description ?? "a warp";
  if (a?.sigma !== undefined) {
    return {
      meters: a.sigma,
      note:
        a.note ??
        `${what}: stated 1σ ${a.sigma} m${a.bound !== undefined ? `, worst case ${a.bound} m` : ""}`,
    };
  }
  if (a?.bound !== undefined) {
    return {
      note: `${what}: states only a worst-case bound of ${a.bound} m, which is not a 1σ${a.note !== undefined ? ` (${a.note})` : ""}`,
    };
  }
  return {
    byDefinition: true,
    note: `${what}: exact by definition (no accuracy stated)`,
  };
}
