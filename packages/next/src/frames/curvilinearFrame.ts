// A frame whose edge to its parent is curvilinear, not a 4×4 (docs/design/transform-graph.md, the
// transform graph's `curvilinear` node): its coordinates map UP to the parent's by
// `spec.forward`, the scene-graph direction. A curvilinear frame is placed over the
// content it deforms: an "Earth content (exaggerated)" frame under ITRF whose
// forward is the exaggeration, with terrain, tilesets, models and pins placed
// in it keeping their true coordinates, and a camera at ITRF seeing them drawn
// through the edge. What is not under the frame (the Moon) is untouched. The
// frames resolver composes routes through it as curvilinear steps (`FrameResolver.
// route`), forward where the route goes up and inverse where it goes down;
// anything that needs one matrix across it (`frameTransform`,
// `FrameResolver.resolve`) throws `NonAffineRouteError`.
//
// `switchFrame` is the same with the edge chosen per view (a variant set): a
// curvilinear spec for each view, or none (the identity), so every view still sees
// a tree.
import {
  NonAffineRouteError,
  type CurvilinearFrameSpec,
  type CurvilinearMap,
} from "../../../core/src/camera/route.ts";
import { identity } from "../../../core/src/math/mat4.ts";
import type { ViewId } from "../../../core/src/transform/graph.ts";
import { Frame } from "./Frame.ts";
import type { FrameAccuracy } from "./frameAccuracy.ts";

export type { CurvilinearFrameSpec };

/**
 * A child of `parent` placed by a curvilinear edge: `p_parent = curvilinearMap.forward(p)`,
 * `p` in this frame. `curvilinearMap` is live: it reads `spec` on every call, so
 * changing the spec's `revision` (a counter the application owns) is seen by
 * routes at once. Say so with `invalidate()` too, which also wakes whoever
 * `watch`es the frames resolver. The frame's accuracy is the curvilinear map's
 * `accuracy.sigma` (1σ); a curvilinear map stating only a `bound` has no accuracy stated
 * here, as a bound is not a σ; a curvilinear map stating neither is exact by definition
 * (an `accuracy` with only a note says the accuracy is unknown).
 */
export class CurvilinearFrame<N extends string = string> extends Frame<N> {
  readonly curvilinearMap: CurvilinearMap;
  private readonly listeners = new Set<() => void>();
  private readonly spec: CurvilinearFrameSpec;

  constructor(name: N, parent: Frame, spec: CurvilinearFrameSpec) {
    super(
      name,
      parent,
      () => {
        throw new NonAffineRouteError(name, parent.name);
      },
      { cache: false, accuracy: () => accuracyOf(spec) },
    );
    this.spec = spec;
    this.curvilinearMap = curvilinearMapOf(spec, this, parent);
    spec.attach?.(this);
  }

  /** It has no matrix: throws `NonAffineRouteError`. */
  override toParent(): never {
    throw new NonAffineRouteError(this.name, this.parent!.name);
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
 * A frame placed in `parent` by a curvilinear edge (`spec.forward`, this frame to
 * its parent), named `name`: `catalog.add(frame)` it, put content on it (an
 * anchor bound to it, a tileset, a globe) and routes through it carry the
 * curvilinear map as a step: forward from content up to the camera, inverse the other
 * way. Its `curvilinearMap.from` is the frame and `curvilinearMap.to` is `parent`.
 */
export function curvilinearFrame<N extends string>(
  name: N,
  parent: Frame,
  spec: CurvilinearFrameSpec,
): CurvilinearFrame<N> {
  return new CurvilinearFrame(name, parent, spec);
}

/** Whether `f`'s edge to its parent is curvilinear. */
export function isCurvilinearFrame(f: Frame): f is CurvilinearFrame {
  return f instanceof CurvilinearFrame;
}

/** What a switch takes for a view: a curvilinear edge, or `"identity"` (the frame is its parent's coordinates, rigidly). */
export type SwitchChoice = CurvilinearFrameSpec | "identity";

/** What `switchFrame` takes: a choice per view, and the one for a view not named. */
export interface SwitchFrameOptions {
  readonly byView: ReadonlyMap<ViewId, SwitchChoice>;
  readonly default?: SwitchChoice;
}

/**
 * A child of `parent` whose edge is chosen per view (`View` objects, or any
 * `ViewId`): each view sees the tree with its own choice, so a pixel's route,
 * and so its pick, is unambiguous. Routes asked without a view (`resolve`)
 * cannot cross it and throw `NonAffineRouteError`: ask `route(…, view)`.
 */
export class SwitchFrame<N extends string = string> extends Frame<N> {
  private readonly byView: ReadonlyMap<ViewId, SwitchChoice>;
  private readonly fallback: SwitchChoice | undefined;
  private readonly curvilinearMaps = new Map<
    CurvilinearFrameSpec,
    CurvilinearMap
  >();
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
        this.curvilinearMaps.set(
          choice,
          curvilinearMapOf(choice, this, parent),
        );
        choice.attach?.(this);
      }
    }
  }

  /**
   * The edge `view` sees: its curvilinear map, or undefined for the identity. Throws,
   * naming the frame, for a view with no choice and no default.
   */
  edgeFor(view: ViewId | undefined): CurvilinearMap | undefined {
    const choice =
      (view !== undefined ? this.byView.get(view) : undefined) ?? this.fallback;
    if (choice === undefined) {
      throw new Error(
        `switch "${this.name}" has no choice for ${view === undefined ? "a route asked without a view" : "this view"} and no default`,
      );
    }
    return choice === "identity" ? undefined : this.curvilinearMaps.get(choice);
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

  /** What each named view sees (its curvilinear map, or undefined for the identity), and what the others do (null: no default). */
  edges(): {
    readonly byView: ReadonlyMap<ViewId, CurvilinearMap | undefined>;
    readonly default: CurvilinearMap | undefined | null;
  } {
    const curvilinearMap = (c: SwitchChoice) =>
      c === "identity" ? undefined : this.curvilinearMaps.get(c);
    return {
      byView: new Map(
        [...this.byView].map(([view, c]) => [view, curvilinearMap(c)]),
      ),
      default:
        this.fallback === undefined ? null : curvilinearMap(this.fallback),
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
 * The curvilinear map `f`'s edge is for `view`: a curvilinear frame's, a switch's choice,
 * undefined for any other frame and for a switch that chose the identity.
 */
export function curvilinearEdgeOf(
  f: Frame,
  view: ViewId | undefined,
): CurvilinearMap | undefined {
  if (f instanceof CurvilinearFrame) {
    return f.curvilinearMap;
  }
  return f instanceof SwitchFrame ? f.edgeFor(view) : undefined;
}

/** Whether `f`'s edge can be non-affine for some view: a curvilinear frame or a switch. */
export function isNonAffineFrame(f: Frame): boolean {
  return f instanceof CurvilinearFrame || f instanceof SwitchFrame;
}

function firstSpec(options: SwitchFrameOptions): CurvilinearFrameSpec {
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

/** `spec` as a `CurvilinearMap` from `from` to its parent `to`: it reads `spec` live. */
function curvilinearMapOf(
  spec: CurvilinearFrameSpec,
  from: Frame,
  to: Frame,
): CurvilinearMap {
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
    get lodExponent() {
      return spec.lodExponent;
    },
    get curvilinear() {
      return spec.curvilinear;
    },
    forward: (p, out, jacobian) => spec.forward(p, out, jacobian),
    ...(inverse !== undefined && {
      inverse: (q: ArrayLike<number>, out: Float64Array) => inverse(q, out),
    }),
  };
}

function accuracyOf(spec: CurvilinearFrameSpec): FrameAccuracy {
  const a = spec.accuracy;
  const what = spec.description ?? "a curvilinear map";
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
