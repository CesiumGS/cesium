// A frame whose edge to its parent is smooth, not a 4×4 (plan §13.37, the
// transform graph's `smooth` node): its coordinates map UP to the parent's by
// `spec.forward`, the scene-graph direction. A deformer is placed over the
// content it deforms: an "Earth content (exaggerated)" frame under ITRF whose
// forward is the exaggeration, with terrain, tilesets, models and pins placed
// in it keeping their true coordinates, and a camera at ITRF seeing them drawn
// through the edge. What is not under the frame (the Moon) is untouched. The
// frames resolver composes routes through it as warp steps (`FrameResolver.
// route`), forward where the route goes up and inverse where it goes down;
// anything that needs one matrix across it (`frameTransform`,
// `FrameResolver.resolve`) throws `NonRigidRouteError`.
//
// `switchFrame` is the same with the edge chosen per view (a variant set): a
// smooth spec for each view, or none (the identity), so every view still sees
// a tree.
import {
  NonRigidRouteError,
  type SmoothFrameSpec,
  type Warp,
} from "../camera/route.ts";
import { identity } from "../math/mat4.ts";
import type { ViewId } from "../transform/graph.ts";
import { Frame } from "./Frame.ts";
import type { FrameAccuracy } from "./frameAccuracy.ts";

export type { SmoothFrameSpec };

/**
 * A child of `parent` placed by a smooth edge: `p_parent = warp.forward(p)`,
 * `p` in this frame. `warp` is live: it reads `spec` on every call, so
 * changing the spec's `revision` (a counter the application owns) is seen by
 * routes at once. Say so with `invalidate()` too, which also wakes whoever
 * `watch`es the frames resolver. The frame's accuracy is the warp's
 * `accuracy.sigma` (1σ); a warp stating only a `bound` has no accuracy stated
 * here, as a bound is not a σ; a warp stating neither is exact by definition
 * (an `accuracy` with only a note says the accuracy is unknown).
 */
export class SmoothFrame<N extends string = string> extends Frame<N> {
  readonly warp: Warp;
  private readonly listeners = new Set<() => void>();
  private readonly spec: SmoothFrameSpec;

  constructor(name: N, parent: Frame, spec: SmoothFrameSpec) {
    super(
      name,
      parent,
      () => {
        throw new NonRigidRouteError(name, parent.name);
      },
      { cache: false, accuracy: () => accuracyOf(spec) },
    );
    this.spec = spec;
    this.warp = warpOf(spec, this, parent);
    spec.attach?.(this);
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
 * A frame placed in `parent` by a smooth edge (`spec.forward`, this frame to
 * its parent), named `name`: `catalog.add(frame)` it, put content on it (an
 * anchor bound to it, a tileset, a globe) and routes through it carry the
 * warp as a step: forward from content up to the camera, inverse the other
 * way. Its `warp.from` is the frame and `warp.to` is `parent`.
 */
export function smoothFrame<N extends string>(
  name: N,
  parent: Frame,
  spec: SmoothFrameSpec,
): SmoothFrame<N> {
  return new SmoothFrame(name, parent, spec);
}

/** Whether `f`'s edge to its parent is smooth. */
export function isSmoothFrame(f: Frame): f is SmoothFrame {
  return f instanceof SmoothFrame;
}

/** What a switch takes for a view: a smooth edge, or `"identity"` (the frame is its parent's coordinates, rigidly). */
export type SwitchChoice = SmoothFrameSpec | "identity";

/** What `switchFrame` takes: a choice per view, and the one for a view not named. */
export interface SwitchFrameOptions {
  readonly byView: ReadonlyMap<ViewId, SwitchChoice>;
  readonly default?: SwitchChoice;
}

/**
 * A child of `parent` whose edge is chosen per view (`View` objects, or any
 * `ViewId`): each view sees the tree with its own choice, so a pixel's route,
 * and so its pick, is unambiguous. Routes asked without a view (`resolve`)
 * cannot cross it and throw `NonRigidRouteError`: ask `route(…, view)`.
 */
export class SwitchFrame<N extends string = string> extends Frame<N> {
  private readonly byView: ReadonlyMap<ViewId, SwitchChoice>;
  private readonly fallback: SwitchChoice | undefined;
  private readonly warps = new Map<SmoothFrameSpec, Warp>();
  private readonly listeners = new Set<() => void>();

  constructor(name: N, parent: Frame, options: SwitchFrameOptions) {
    super(name, parent, (_instant, out) => void identity(out), {
      cache: false,
      accuracy: () => accuracyOf(firstSpec(options)),
    });
    this.byView = options.byView;
    this.fallback = options.default;
    for (const choice of this.choices()) {
      if (choice !== "identity") {
        this.warps.set(choice, warpOf(choice, this, parent));
        choice.attach?.(this);
      }
    }
  }

  /**
   * The edge `view` sees: its warp, or undefined for the identity. Throws,
   * naming the frame, for a view with no choice and no default.
   */
  edgeFor(view: ViewId | undefined): Warp | undefined {
    const choice =
      (view !== undefined ? this.byView.get(view) : undefined) ?? this.fallback;
    if (choice === undefined) {
      throw new Error(
        `switch "${this.name}" has no choice for ${view === undefined ? "a route asked without a view" : "this view"} and no default`,
      );
    }
    return choice === "identity" ? undefined : this.warps.get(choice);
  }

  /** The distinct choices, the default included. */
  choices(): SwitchChoice[] {
    return [
      ...new Set([
        ...this.byView.values(),
        ...(this.fallback !== undefined ? [this.fallback] : []),
      ]),
    ];
  }

  /** What each named view sees (its warp, or undefined for the identity), and what the others do (null: no default). */
  edges(): {
    readonly byView: ReadonlyMap<ViewId, Warp | undefined>;
    readonly default: Warp | undefined | null;
  } {
    const warp = (c: SwitchChoice) =>
      c === "identity" ? undefined : this.warps.get(c);
    return {
      byView: new Map([...this.byView].map(([view, c]) => [view, warp(c)])),
      default: this.fallback === undefined ? null : warp(this.fallback),
    };
  }

  override get revision(): number {
    let sum = super.revision;
    for (const choice of this.choices()) {
      sum += choice === "identity" ? 0 : choice.revision;
    }
    return sum;
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

/** A frame whose edge to `parent` is chosen per view (`SwitchFrame`). */
export function switchFrame<N extends string>(
  name: N,
  parent: Frame,
  options: SwitchFrameOptions,
): SwitchFrame<N> {
  return new SwitchFrame(name, parent, options);
}

/** Whether `f`'s edge to its parent is a per-view switch. */
export function isSwitchFrame(f: Frame): f is SwitchFrame {
  return f instanceof SwitchFrame;
}

/**
 * The warp `f`'s edge is for `view`: a smooth frame's, a switch's choice,
 * undefined for any other frame and for a switch that chose the identity.
 */
export function smoothEdgeOf(
  f: Frame,
  view: ViewId | undefined,
): Warp | undefined {
  if (f instanceof SmoothFrame) {
    return f.warp;
  }
  return f instanceof SwitchFrame ? f.edgeFor(view) : undefined;
}

/** Whether `f`'s edge can be non-rigid for some view: a smooth frame or a switch. */
export function isNonRigidFrame(f: Frame): boolean {
  return f instanceof SmoothFrame || f instanceof SwitchFrame;
}

function firstSpec(options: SwitchFrameOptions): SmoothFrameSpec {
  for (const choice of [...options.byView.values(), options.default]) {
    if (choice !== undefined && choice !== "identity") {
      return choice;
    }
  }
  return {
    revision: 0,
    forward: (p, out) => {
      out.set(Array.from(p));
      return out;
    },
  };
}

/** `spec` as a `Warp` from `from` to its parent `to`: it reads `spec` live. */
function warpOf(spec: SmoothFrameSpec, from: Frame, to: Frame): Warp {
  const inverse = spec.inverse;
  return {
    from,
    to,
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
    get heightScale() {
      return spec.heightScale;
    },
    get smooth() {
      return spec.smooth;
    },
    forward: (p, out, jacobian) => spec.forward(p, out, jacobian),
    ...(inverse !== undefined && {
      inverse: (q: ArrayLike<number>, out: Float64Array) => inverse(q, out),
    }),
  };
}

function accuracyOf(spec: SmoothFrameSpec): FrameAccuracy {
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
  if (a !== undefined) {
    return { note: `${what}: ${a.note ?? "states no accuracy"}` };
  }
  return {
    byDefinition: true,
    note: `${what}: exact by definition (no accuracy stated)`,
  };
}
