// A world's warp context (plan §13.26, increment 1): draws under an anchor
// whose route to the view's render root crosses a warp are drawn warped, per
// vertex, by a fit of the route's displacement over each draw's bounding
// sphere (a lattice term of weight 1, scene/warpFit.ts). The app defines a
// warp frame and puts the rig on it; nothing is set per item. Until a draw's
// first fit exists it is held hidden, so unwarped content never flashes; a
// stale fit stays drawn while a refit runs, within a per-frame budget.
//
// One context per world, fitted for the root of the world's first view.
// Another view of the world with a different root would need terms per view
// (a follow-up): the engine warns once and the others show the first's.
//
// A route term is evaluated at the undeformed position. Combined with a
// morph (a dual position) this is first-order: the two displacements add,
// where exact folding would carry the route through the morphed point
// (later).
import type { FrameKey } from "../../camera/frameResolver.ts";
import {
  warpScaleOf,
  withFrozenScales,
  withoutScales,
  type Route,
  type Warp,
  type WarpScale,
} from "../../camera/route.ts";
import { mat4, multiply } from "../../math/mat4.ts";
import {
  CENTER_WORD,
  FLAGS_WORD,
  INSTANCE_COUNT_WORD,
  RADIUS_WORD,
  RECORD_WORDS,
  RecordFlags,
  TRANSFORM_WORD,
} from "../../render/layout.ts";
import { checkPlacement, type Placement } from "../placement.ts";
import { affinePart, fitLattice, routeDisplacement } from "../warpFit.ts";
import { WarpFitCache } from "../warpFitCache.ts";
import { checkTerms, termsOf } from "../warpEvaluate.ts";
import {
  MAX_WARP_TERMS,
  constantWeight,
  type CubicLattice,
  type TermWeight,
  type WarpTerms,
} from "../warpTerms.ts";
import type { World } from "../World.ts";
import { setPlacement } from "./placements.ts";
import { drawMatrix } from "./transforms.ts";
import type { DrawHandle } from "./types.ts";

/** What a frame's fits may cost by default, ms (`Engine.warpBudgetMs`). */
export const WARP_BUDGET_MS = 4;

/** The tolerance's floor, m: a fit is never asked to beat a millimetre. */
const TOLERANCE_FLOOR = 1e-3;

/** What a fit hears of the tile's geometric error: `geometricError / 64`, 0.25 px at a 16 px threshold. */
const GEOMETRIC_ERROR_SHARE = 1 / 64;

/** One warped anchor: its route, and what its draws' fits were made for. */
interface AnchorWarp {
  route: Route;
  /** Goes up when the fits made are out of date; never repeats. */
  stamp: number;
  /** What a fit depends on: its warps and the rigid steps before the last of them. */
  signature: { warps: Warp[]; inverse: boolean[]; prefix: number[] };
  /** The matrix the anchor is placed by: the route's rigid steps composed. */
  affine: Float64Array;
  /** The single scaled warp's parameter, when one fit of its unit displacement serves every scale. */
  linear: WarpScale | undefined;
  /** What a fit runs on: the unit route when `linear`, else the route with its scales as they were at `stamp`. */
  fitRoute: Route;
  /** The scales of the route's scaled warps at `stamp`, in step order (refit mode). */
  scales: number[];
}

/** One draw under a warped anchor. */
interface DrawWarp {
  readonly generation: number;
  readonly slot: number;
  readonly key: string;
  /** Hidden since it was found, until its first fit lands. */
  held: boolean;
  /** Whether the draw asked to be hidden (`World.setVisible`). */
  userHidden: boolean;
  /** What the draw is placed by of its own (an item's dual position), besides the route. */
  user: Placement | WarpTerms | undefined;
  /** The lattice drawn now, and the weight it goes with. */
  applied: CubicLattice | undefined;
  weight: TermWeight;
  /** The anchor stamp whose fit is requested, and the one `applied` is for (−1: an older one). */
  requested: number;
  appliedStamp: number;
  /** The draw's matrix to its anchor when its fit was requested. */
  readonly matrix: Float64Array;
}

/** What `WorldWarps.status` says of a draw. */
export interface DrawWarpStatus {
  /** The route that places the draw's anchor. */
  readonly route: Route;
  /** "fitted": drawn at the current fit; "stale": an older fit is drawn while a refit runs; "pending": hidden until its first fit. */
  readonly state: "fitted" | "stale" | "pending";
}

export class WorldWarps {
  /** Entries leave with their draws (`drawRemoved`), so no cap evicts a fit a draw still waits for. */
  readonly cache = new WarpFitCache(2 ** 30);
  readonly #anchors = new Map<number, AnchorWarp>();
  readonly #draws = new Map<number, DrawWarp>();
  /** Draws whose current fit is not yet drawn. */
  readonly #waiting = new Set<number>();
  /** Tiles' geometric errors by draw index, for the fit's tolerance. */
  readonly #errors = new Map<number, number>();
  #root: FrameKey | undefined;
  #rootName = "";
  #rootId = 0;
  #clock = 0;
  #transformRevision = -1;
  readonly #scratch = new Float64Array(16);

  constructor(private readonly world: World) {}

  /** Fits queued and not yet run. */
  get pending(): number {
    return this.cache.pending;
  }

  /** Draws drawn warped now. */
  get size(): number {
    return this.#draws.size;
  }

  /** Whether any anchor is placed across a warp. */
  get active(): boolean {
    return this.#anchors.size > 0;
  }

  /** The tile's geometric error (m), which sets the tolerance of the draw's fit: `max(1 mm, error / 64)`. */
  setGeometricError(handle: DrawHandle, error: number): void {
    if (!this.world.hasDraw(handle)) {
      return;
    }
    if (Number.isFinite(error) && error > 0) {
      this.#errors.set(handle.index, error);
    } else {
      this.#errors.delete(handle.index);
    }
  }

  /** @internal A twin draws the same mesh on the same transform: the same tolerance. */
  inherit(source: DrawHandle, twin: DrawHandle): void {
    const error = this.#errors.get(source.index);
    if (error !== undefined) {
      this.#errors.set(twin.index, error);
    }
  }

  /** How the draw is warped and where its fit is, if it is. */
  status(handle: DrawHandle): DrawWarpStatus | undefined {
    const d = this.#state(handle);
    const route = d && this.#anchors.get(d.slot)?.route;
    if (!d || !route) {
      return undefined;
    }
    return {
      route,
      state:
        d.appliedStamp === d.requested && d.applied
          ? "fitted"
          : d.applied
            ? "stale"
            : "pending",
    };
  }

  /** A draw was added: hidden at once when its anchor is warped, before any frame can draw it. */
  drawAdded(handle: DrawHandle): void {
    if (this.#anchors.size === 0) {
      return;
    }
    this.#register(handle.index, handle.generation);
  }

  /** A draw is being removed: its fit is forgotten. */
  drawRemoved(handle: DrawHandle): void {
    this.#errors.delete(handle.index);
    const d = this.#draws.get(handle.index);
    if (d) {
      this.#draws.delete(handle.index);
      this.#waiting.delete(handle.index);
      this.cache.forget(d.key);
    }
  }

  /**
   * `World.setPlacement` for a draw drawn warped: its own placement is kept
   * and combined with the route's term. True when it took it (the draw is
   * warped); false leaves it to the world.
   */
  setUser(
    handle: DrawHandle,
    placement: Placement | WarpTerms | undefined,
  ): boolean {
    const d = this.#state(handle);
    if (!d) {
      return false;
    }
    let user: Placement | WarpTerms | undefined;
    if (placement === undefined) {
      user = undefined;
    } else if (isTerms(placement)) {
      checkTerms("setPlacement", placement);
      user = placement;
    } else {
      checkPlacement("setPlacement", placement);
      user = placement.kind === "affine" ? undefined : placement;
    }
    if (ownTerms(user).length >= MAX_WARP_TERMS) {
      throw new RangeError(
        `setPlacement: a draw drawn warped by its route has room for ${MAX_WARP_TERMS - 1} terms of its own, its route's being one of ${MAX_WARP_TERMS}.`,
      );
    }
    const before = d.user;
    d.user = user;
    if (d.applied) {
      try {
        this.#compose(handle.index, d);
      } catch (error) {
        d.user = before;
        throw error;
      }
    }
    return true;
  }

  /** Whether the draw is drawn warped by its route. */
  has(handle: DrawHandle): boolean {
    return this.#state(handle) !== undefined;
  }

  /** The placement the draw was given (`World.drawPlacement`), apart from its route's term. */
  userPlacement(handle: DrawHandle): Placement | undefined {
    const user = this.#state(handle)?.user;
    return user !== undefined && !isTerms(user) ? user : undefined;
  }

  /** `World.setVisible` for a draw held hidden by its fit: remembered, applied when it is fitted. True when it took it. */
  setVisible(handle: DrawHandle, visible: boolean): boolean {
    const d = this.#state(handle);
    if (!d) {
      return false;
    }
    d.userHidden = !visible;
    if (!d.held) {
      this.#setHidden(handle.index, d.userHidden);
    }
    return true;
  }

  /**
   * The frame's step, after the camera layer placed the anchors: `routes`
   * (by anchor slot, `View.anchorRoutes`) are the anchors placed across a
   * warp for the view whose render root is `root` (undefined: no view). Draws
   * under them are found and held; new, stale or moved ones are requested;
   * fits run for up to `budgetMs`, and what they make is drawn. Returns
   * whether fits are still pending (the loop stays awake).
   */
  frame(
    root: FrameKey | undefined,
    routes: ReadonlyArray<Route | undefined>,
    budgetMs: number,
    report: (message: string) => void,
  ): boolean {
    this.#sync(root, routes);
    if (this.#anchors.size === 0 && this.#draws.size === 0) {
      return false;
    }
    this.#track();
    for (const [index, d] of this.#draws) {
      const anchor = this.#anchors.get(d.slot);
      if (anchor && d.requested !== anchor.stamp) {
        this.#request(index, d, anchor, report);
      }
    }
    if (this.cache.pending > 0) {
      this.cache.run(budgetMs);
    }
    for (const index of [...this.#waiting]) {
      const d = this.#draws.get(index);
      const anchor = d && this.#anchors.get(d.slot);
      if (!d || !anchor) {
        this.#waiting.delete(index);
        continue;
      }
      const lattice = this.cache.current(d.key, this.#rootName, d.requested);
      if (lattice) {
        this.#waiting.delete(index);
        this.#adopt(index, d, anchor, lattice, d.requested, report);
      }
    }
    return this.cache.pending > 0;
  }

  /** The world is gone: nothing is kept. */
  clear(): void {
    this.cache.clear();
    this.#anchors.clear();
    this.#draws.clear();
    this.#waiting.clear();
    this.#errors.clear();
  }

  // ------------------------------------------------------------------ steps

  /** Brings the warped anchors up to date with `routes` and `root`. */
  #sync(root: FrameKey | undefined, routes: ReadonlyArray<Route | undefined>) {
    const rootChanged = root !== this.#root;
    if (rootChanged) {
      this.#root = root;
      this.#rootName = `r${++this.#rootId}`;
    }
    if (this.#anchors.size === 0 && !routes.some(isRoute)) {
      return; // nothing is warped: the common frame costs this
    }
    const fresh: number[] = [];
    for (let slot = 0; slot < routes.length; slot++) {
      const route = root === undefined ? undefined : routes[slot];
      const held = this.#anchors.get(slot);
      if (!route) {
        if (held) {
          this.#anchors.delete(slot);
          this.#releaseSlot(slot);
        }
        continue;
      }
      let now = held;
      if (!held) {
        now = this.#anchorWarp(route);
        this.#anchors.set(slot, now);
        fresh.push(slot);
      } else if (held.route !== route) {
        if (
          route.revision !== held.route.revision ||
          !same(signatureOf(route), held.signature)
        ) {
          now = this.#anchorWarp(route);
          this.#anchors.set(slot, now);
        } else {
          // The same warp placed again: what follows its last warp is not
          // in a fit (it cancels), so the fits stay; `affine` stays the
          // one they were made with.
          held.route = route;
        }
      }
      if (rootChanged && now === held) {
        now!.stamp = ++this.#clock;
      }
      if (!now!.linear && now!.scales.length > 0) {
        this.#followScales(now!);
      }
    }
    for (const slot of [...this.#anchors.keys()]) {
      if (slot >= routes.length) {
        this.#anchors.delete(slot);
        this.#releaseSlot(slot);
      }
    }
    if (fresh.length > 0) {
      this.#scan(new Set(fresh));
    }
  }

  /** A route's warp state: its fit route, and whether one unit fit serves every scale. */
  #anchorWarp(route: Route): AnchorWarp {
    const linear = this.#linearScale(route);
    const scaled = route.steps.flatMap((s) =>
      s.kind === "warp" && s.warp.scale ? [warpScaleOf(s.warp)] : [],
    );
    return {
      route,
      stamp: ++this.#clock,
      signature: signatureOf(route),
      affine: affinePart(route),
      linear,
      fitRoute: linear ? withoutScales(route) : withFrozenScales(route),
      scales: scaled,
    };
  }

  /**
   * The parameter of the route's only scaled warp, when the displacement is
   * exactly linear in it: that warp goes forward and only rigid steps follow
   * (the affine part treats warps as identity, so `D = s · D₁`), and the
   * parameter is the world's, so the GPU reads it as a weight.
   */
  #linearScale(route: Route): WarpScale | undefined {
    let at = -1;
    for (let i = 0; i < route.steps.length; i++) {
      const s = route.steps[i]!;
      if (s.kind === "warp" && s.warp.scale) {
        if (at >= 0) {
          return undefined;
        }
        at = i;
      }
    }
    if (at < 0) {
      return undefined;
    }
    const step = route.steps[at]!;
    if (step.kind !== "warp" || step.inverse) {
      return undefined;
    }
    for (let i = at + 1; i < route.steps.length; i++) {
      if (route.steps[i]!.kind !== "rigid") {
        return undefined;
      }
    }
    return this.world.scene.parameters.has(step.warp.scale!)
      ? step.warp.scale
      : undefined;
  }

  /** A scale that is not a weight changed: the fits are redone, as for a revision. */
  #followScales(anchor: AnchorWarp): void {
    let k = 0;
    let changed = false;
    for (const s of anchor.route.steps) {
      if (s.kind === "warp" && s.warp.scale) {
        const v = warpScaleOf(s.warp);
        changed ||= v !== anchor.scales[k];
        anchor.scales[k++] = v;
      }
    }
    if (changed) {
      anchor.stamp = ++this.#clock;
      anchor.fitRoute = withFrozenScales(anchor.route);
    }
  }

  /** Draws under the slots, not yet drawn warped, are found. */
  #scan(slots: ReadonlySet<number>): void {
    const raster = this.world.raster;
    for (let index = 0; index < raster.drawCount; index++) {
      if (raster.drawBatches[index] === undefined || this.#draws.has(index)) {
        continue;
      }
      const t = raster.recordsU32[index * RECORD_WORDS + TRANSFORM_WORD]!;
      if (slots.has(this.world.scene.transformAnchor[t]!)) {
        this.#register(index, raster.drawGeneration[index]!);
      }
    }
  }

  /** Holds the draw hidden and notes it, when its anchor is warped and it can be. */
  #register(index: number, generation: number): void {
    const raster = this.world.raster;
    if (this.#draws.has(index) || raster.drawBatches[index] === undefined) {
      return;
    }
    const o = index * RECORD_WORDS;
    const slot =
      this.world.scene.transformAnchor[raster.recordsU32[o + TRANSFORM_WORD]!]!;
    if (!this.#anchors.has(slot)) {
      return;
    }
    const flags = raster.recordsU32[o + FLAGS_WORD]!;
    // These draws have no per-vertex placement (setPlacement refuses them):
    // they are drawn at their anchor's affine place, unwarped.
    if (
      flags & (RecordFlags.billboard | RecordFlags.points) ||
      raster.recordsU32[o + INSTANCE_COUNT_WORD]! > 0
    ) {
      return;
    }
    const own = this.world.scene.drawPlacements[index];
    this.#draws.set(index, {
      generation,
      slot,
      key: `${index}:${generation}`,
      held: true,
      userHidden: (flags & RecordFlags.hidden) !== 0,
      user: own ? (own.placement ?? own.terms) : undefined,
      applied: undefined,
      weight: constantWeight(1),
      requested: -1,
      appliedStamp: -1,
      matrix: new Float64Array(16),
    });
    this.#setHidden(index, true);
  }

  /** The anchor is no longer warped: its draws go back as they were. */
  #releaseSlot(slot: number): void {
    for (const [index, d] of [...this.#draws]) {
      if (d.slot !== slot) {
        continue;
      }
      this.#draws.delete(index);
      this.#waiting.delete(index);
      this.cache.forget(d.key);
      const handle = this.#handle(index, d);
      if (this.world.hasDraw(handle)) {
        setPlacement(this.world, handle, d.user);
        this.#setHidden(index, d.userHidden);
      }
    }
  }

  /** Draws whose transforms moved are fitted again (their matrix to the anchor is in the fit). */
  #track(): void {
    const revision = this.world.scene.transformRevision_;
    if (revision === this.#transformRevision) {
      return;
    }
    this.#transformRevision = revision;
    for (const [index, d] of this.#draws) {
      if (d.requested < 0) {
        continue;
      }
      const m = drawMatrix(this.world, this.#handle(index, d), this.#scratch);
      if (m && differs(m, d.matrix)) {
        d.requested = -1;
      }
    }
  }

  /** Asks for the draw's fit at the anchor's stamp; drawn at once if it is ready, or a stale one is. */
  #request(
    index: number,
    d: DrawWarp,
    anchor: AnchorWarp,
    report: (message: string) => void,
  ): void {
    const handle = this.#handle(index, d);
    const record = this.world.raster;
    const o = index * RECORD_WORDS;
    const center = [0, 1, 2].map(
      (i) => record.recordsF32[o + CENTER_WORD + i]!,
    );
    const radius =
      this.world.scene.drawPlacements[index]?.base ??
      record.recordsF32[o + RADIUS_WORD]!;
    const matrix = drawMatrix(this.world, handle, new Float64Array(16))!;
    d.matrix.set(matrix);
    const stamp = anchor.stamp;
    const { fitRoute, affine } = anchor;
    const geometricError = this.#errors.get(index) ?? 0;
    const tolerance = Math.max(
      TOLERANCE_FLOOR,
      geometricError * GEOMETRIC_ERROR_SHARE,
    );
    const operation = describeRoute(anchor.route);
    d.requested = stamp;
    const stale = this.cache.request(d.key, this.#rootName, stamp, () =>
      fitDraw(
        fitRoute,
        affine,
        matrix,
        center,
        radius,
        tolerance,
        operation,
        report,
      ),
    );
    const current = this.cache.current(d.key, this.#rootName, stamp);
    if (current) {
      this.#waiting.delete(index);
      this.#adopt(index, d, anchor, current, stamp, report);
      return;
    }
    this.#waiting.add(index);
    if (stale && stale !== d.applied) {
      this.#adopt(index, d, anchor, stale, -1, report);
    }
  }

  /** Draws `lattice` as the draw's route term, and shows the draw if it was held. */
  #adopt(
    index: number,
    d: DrawWarp,
    anchor: AnchorWarp,
    lattice: CubicLattice,
    stamp: number,
    report: (message: string) => void,
  ): void {
    if (lattice !== d.applied) {
      d.applied = lattice;
      d.weight = anchor.linear
        ? {
            scale: 1,
            factors: [{ parameter: anchor.linear, offset: 0, slope: 1 }],
          }
        : constantWeight(1);
      try {
        this.#compose(index, d);
      } catch (error) {
        report(
          `warp: a draw's fit could not be drawn: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    d.appliedStamp = stamp;
    if (d.held) {
      d.held = false;
      this.#setHidden(index, d.userHidden);
    }
  }

  /** Sets the draw's terms: its own, then its route's lattice. */
  #compose(index: number, d: DrawWarp): void {
    const own = ownTerms(d.user);
    const terms: WarpTerms = [...own, { term: d.applied!, weight: d.weight }];
    setPlacement(this.world, this.#handle(index, d), terms);
  }

  #setHidden(index: number, hidden: boolean): void {
    const raster = this.world.raster;
    const o = index * RECORD_WORDS + FLAGS_WORD;
    const flags = raster.recordsU32[o]!;
    const next = hidden
      ? flags | RecordFlags.hidden
      : flags & ~RecordFlags.hidden;
    if (next !== flags) {
      raster.drawConstants.setFlags(index, next);
      this.world.markDirty(index);
    }
  }

  #handle(index: number, d: DrawWarp): DrawHandle {
    return { index, generation: d.generation, name: undefined };
  }

  #state(handle: DrawHandle): DrawWarp | undefined {
    const d = this.#draws.get(handle.index);
    return d && d.generation === handle.generation ? d : undefined;
  }
}

const isRoute = (route: Route | undefined): boolean => route !== undefined;

/** `WarpTerms` as opposed to a public `Placement`. */
function isTerms(placement: Placement | WarpTerms): placement is WarpTerms {
  return Array.isArray(placement);
}

/** The terms a draw's own placement makes (none for none, or an identity). */
function ownTerms(user: Placement | WarpTerms | undefined): WarpTerms {
  if (user === undefined) {
    return [];
  }
  return isTerms(user) ? user : (termsOf(user) ?? []);
}

/** What a fit depends on in a route. */
function signatureOf(route: Route): AnchorWarp["signature"] {
  let last = -1;
  route.steps.forEach((s, i) => {
    if (s.kind === "warp") {
      last = i;
    }
  });
  const signature: AnchorWarp["signature"] = {
    warps: [],
    inverse: [],
    prefix: [],
  };
  route.steps.forEach((s, i) => {
    if (s.kind === "warp") {
      signature.warps.push(s.warp);
      signature.inverse.push(s.inverse);
    } else if (i < last) {
      signature.prefix.push(...s.matrix);
    }
  });
  return signature;
}

function same(a: AnchorWarp["signature"], b: AnchorWarp["signature"]): boolean {
  return (
    a.warps.length === b.warps.length &&
    a.warps.every(
      (w, i) => w === b.warps[i] && a.inverse[i] === b.inverse[i],
    ) &&
    a.prefix.length === b.prefix.length &&
    a.prefix.every((v, i) => v === b.prefix[i])
  );
}

function differs(a: Float64Array, b: Float64Array): boolean {
  for (let i = 0; i < 16; i++) {
    if (a[i] !== b[i]) {
      return true;
    }
  }
  return false;
}

/** The route's warps in words, for a fit's `operation`. */
function describeRoute(route: Route): string {
  const warps = route.steps.flatMap((s) =>
    s.kind === "warp"
      ? [
          `${s.warp.description ?? `${s.warp.from.name} to ${s.warp.to.name}`}${s.inverse ? " (inverse)" : ""}`,
        ]
      : [],
  );
  return `${route.frame.name} to ${route.base.name}: ${warps.join(", then ")}`;
}

/**
 * The fit of one draw: the route's displacement over its bounding sphere in
 * model space, to `tolerance` metres. `matrix` is the draw's model-to-anchor
 * matrix and `anchorAffine` the anchor's place; the lattice's error is
 * returned in metres, as it is measured in the model's units.
 */
function fitDraw(
  route: Route,
  anchorAffine: Float64Array,
  matrix: Float64Array,
  center: number[],
  radius: number,
  tolerance: number,
  operation: string,
  report: (message: string) => void,
): CubicLattice {
  const scale = Math.max(radius, 1e-3);
  try {
    const metres = Math.hypot(matrix[0]!, matrix[1]!, matrix[2]!) || 1;
    const affine = multiply(mat4(), anchorAffine, matrix);
    const fit = fitLattice(
      routeDisplacement(route, matrix, affine),
      { center, scale },
      { tolerance: tolerance / metres, operation },
    );
    return metres === 1 ? fit : { ...fit, errorBound: fit.errorBound * metres };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    report(
      `warp: the fit of ${operation} failed (${message}); the draw is drawn unwarped`,
    );
    return {
      kind: "cubic",
      center,
      scale,
      cells: 1,
      coefficients: new Float64Array(60),
      errorBound: Number.MAX_VALUE,
      estimate: true,
      operation: `fit failed: ${message}`,
    };
  }
}
