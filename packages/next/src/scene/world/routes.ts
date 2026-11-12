// Compiled routes in the renderer (plan 2026-11-12, task 4, part b). A draw
// under an anchor whose route to the render root crosses only smooth steps the
// compiler takes (`Warp.smooth`, src/transform/compile.ts) is drawn by that
// compiled route instead of a fit (scene/warpFit.ts): its batch has the
// route's pipeline variant (scene/routeVariant.ts), and its record's
// placement block holds the draw's data for the route's `tgRoute`:
//
//  - per route (anchor): the compiled program, shared by every route of its
//    shape, and a block of uniform rows (`RouteUniforms`: the affine 3×3s and
//    the parameter values, rewritten when a slider moves and nothing else);
//  - per draw: its centre in model space, its model-to-anchor linear part and
//    the route's value at its centre in hi and lo (`DrawCentre`). The CPU
//    makes it in float64, once per draw while the route's matrices and
//    centre-dependent parameters stay as they are. When they change (a
//    parameter that is not a uniform, a time-varying place), a df64 compute
//    pass in the frame's cull pass makes them for the draws the views show
//    (`World.addFrameCompute`), the others when they come into view; a route
//    with linear normals (per-draw CPU data) has none, and the CPU makes them
//    again;
//  - per vertex: the residual, in the route's pipeline variant.
//
// Fits stay for what the compiler refuses (a warp with no smooth spec, JS
// outside the subset, an inverse step), draws with terms of their own, patch
// draws, point sets, billboards and instances, a world with curved clips, and
// a route whose pipelines failed to compile. The draw's culling sphere is the
// route's image of its own, from interval evaluation of the IR
// (transform/bounds.ts).
import {
  warpScaleOf,
  withScalesAt,
  type Route as CameraRoute,
  type Warp,
} from "../../camera/route.ts";
import {
  NO_PLACEMENT,
  RECORD_WORDS,
  VIEW_MASK_WORD,
} from "../../render/layout.ts";
import {
  compileRoute,
  type CompiledRoute,
  type ParamRecord,
} from "../../transform/compile.ts";
import type { ParamRange } from "../../transform/interval.ts";
import {
  ROUTE_BODY,
  ROUTE_KIND,
  ROUTE_OWN_ROWS,
  ROUTE_POINTER_ROWS,
  routeBlockRows,
  routeCentreRow,
  routeVariantOf,
  type RouteVariant,
} from "../routeVariant.ts";
import {
  drawnBounds,
  roundUp32,
  routeMap,
  type DrawnMap,
} from "../warpBounds.ts";
import { affinePart } from "../warpFit.ts";
import type { World } from "../World.ts";
import { setDrawRoute } from "./draws.ts";
import { setPlacement } from "./placements.ts";
import { bridgeRoute, normalise, type BridgedRoute } from "./routeBridge.ts";
import type { DrawHandle } from "./types.ts";

/** The pipelines a routed draw needs before it is shown: the opaque pass's and the depth prepass's, one- and double-sided. */
const WARM_KEYS = [
  "opaque",
  "opaqueDoubleSided",
  "depth",
  "depthDoubleSided",
] as const;

/** Draws whose records the CPU makes in one go before a compute pass is worth its setup. */
const GPU_MIN_DRAWS = 16;

/** A view's camera route for an anchor: the view's id (the position of its bit in view masks) and its route to the view's root. */
export interface ViewCamera {
  readonly id: number;
  readonly camera: CameraRoute;
}

/**
 * What a routed anchor holds of one view: its route to the view's root, as
 * the compiled program reads it. Views of one anchor share the program and
 * the draws' records (the route's value at each draw's centre), and differ
 * in what is a uniform: the matrices after the last warp (a root) and the
 * values of parameters that are uniforms (a slider set per view).
 */
export interface RoutedView {
  readonly id: number;
  readonly bridged: BridgedRoute;
  /** This view's uniforms: their first row in the placements buffer, and their floats. */
  readonly uniformRow: number;
  readonly uniforms: Float32Array;
  /** The parameter values the uniforms were made at. */
  values: ParamRecord;
  /** The anchor's place in this view (the route's rigid steps composed), for spheres. */
  affine: Float64Array;
  /** The scaled parameters' ranges in this view, by key. */
  ranges: Record<string, ParamRange>;
  /** The camera route as the last frame had it, and the maps a draw's sphere is bounded through (made again when `sphereVersion` moves). */
  camera: CameraRoute;
  maps: DrawnMap[];
  mapsVersion: number;
}

/**
 * One routed anchor: the compiled route and the data its draws read. The
 * fields of the route's first view (`primaryView`) are the anchor's own;
 * `others` are the views whose route has the same shape and the same
 * data in a draw's record (`centreSignature`), with uniforms of their own.
 */
export interface RoutedAnchor {
  /** Names this route's shape and data: a draw requested for another is requested again. */
  readonly id: number;
  readonly slot: number;
  readonly bridged: BridgedRoute;
  readonly compiled: CompiledRoute;
  readonly variant: RouteVariant;
  /** The id of the view the route was made from. */
  readonly primaryView: number;
  /** The route's pointer table: its first row in the placements buffer. It holds, for each view id, the first row of that view's uniforms. */
  readonly pointerRow: number;
  /** The primary view's uniforms: their first row in the placements buffer, and their floats here. */
  readonly uniformRow: number;
  readonly uniformRows: number;
  readonly uniforms: Float32Array;
  /** The parameter values the uniforms and the draws' records were made at. */
  values: ParamRecord;
  /** Goes up when what a draw's record depends on changed: the route's matrices, or a centre-dependent parameter. */
  version: number;
  /** Goes up when a draw's culling sphere changes with the route: `version`, or a parameter without a range. */
  sphereVersion: number;
  /** The anchor's place (the route's rigid steps composed), for spheres. */
  affine: Float64Array;
  /** The route's own scaled parameters' ranges (a slider's `range`), by key: spheres hold for all of them. */
  ranges: Record<string, ParamRange>;
  /** The camera route as the last frame had it, and the maps a draw's sphere is bounded through (made again when `sphereVersion` moves). */
  camera: CameraRoute;
  maps: DrawnMap[];
  mapsVersion: number;
  /** The other views that draw the anchor by this route, by view id. */
  readonly others: Map<number, RoutedView>;
  /** Draws are remade by the compute pass: set when records went stale. */
  gpuStale: boolean;
}

/** One draw under a routed anchor. */
interface RoutedDraw {
  readonly index: number;
  readonly generation: number;
  anchor: RoutedAnchor;
  /** The draw's matrix to its anchor, and its bounding sphere in model space as it was before the route. */
  readonly matrix: Float64Array;
  readonly center: Float64Array;
  radius: number;
  /** Its block in the placements buffer (first row), and how many rows it has. */
  at: number;
  rows: number;
  /** The `version` and `sphereVersion` its record and sphere were made at (-1: not yet). */
  recordVersion: number;
  sphereVersion: number;
  /** The record was last written by the GPU: the table's copy is behind it. */
  gpu: boolean;
}

export class WorldRoutes {
  readonly #anchors = new Map<number, RoutedAnchor>();
  /** Slots whose route was refused, and the shape it was refused for (asked again when it changes). */
  readonly #refused = new Map<number, { shape: string; reason: string }>();
  readonly #failed = new Set<string>();
  readonly #draws = new Map<number, RoutedDraw>();
  /** Draws whose block or record the CPU is to write. */
  readonly #queue = new Set<number>();
  readonly #said = new Set<string>();
  #nextId = 1;
  #gpu: GpuCentres | undefined;

  constructor(private readonly world: World) {}

  /** Draws under a routed anchor. */
  get size(): number {
    return this.#draws.size;
  }

  /** Whether draws still wait for their data. */
  get pending(): boolean {
    return this.#queue.size > 0;
  }

  /** The routed anchor of a slot, if its route is compiled. */
  anchorOf(slot: number): RoutedAnchor | undefined {
    return this.#anchors.get(slot);
  }

  /** Why the slot's route is not compiled, when it isn't. */
  refusal(slot: number): string | undefined {
    return this.#refused.get(slot)?.reason;
  }

  /** Whether the draw is drawn by a compiled route. */
  has(index: number): boolean {
    return this.#draws.has(index);
  }

  /** The route of the draw, if it is routed. */
  routeOf(index: number): RoutedAnchor | undefined {
    return this.#draws.get(index)?.anchor;
  }

  /**
   * Brings the slot's compiled route to the camera routes as they are now
   * (their rigid matrices, their warps' parameters, a slider), making it when
   * there is none or its shape changed. `views` are the views that draw the
   * anchor by routes of one shape (`WorldVariants` groups them; a route of
   * another shape has an anchor key and draws of its own), the first one the
   * route is made from: a later view whose route has the same shape and the
   * same data in a draw's record (`centreSignature`) is drawn by the same
   * program with uniforms of its own (its root, a parameter set for it), and
   * one that doesn't is reported once and drawn as the first is. Returns the
   * route, or undefined when it can't be compiled (`refusal` says why; said
   * once).
   */
  sync(
    slot: number,
    views: readonly ViewCamera[],
    report: (message: string) => void,
  ): RoutedAnchor | undefined {
    const first = views[0]!;
    const camera = first.camera;
    const held = this.#anchors.get(slot);
    let anchor: RoutedAnchor;
    if (held && held.primaryView === first.id && held.bridged.matches(camera)) {
      this.#refresh(held, camera);
      anchor = held;
    } else {
      const shape = shapeOf(camera);
      if (!held && this.#refused.get(slot)?.shape === shape) {
        return undefined;
      }
      if (held) {
        this.#drop(slot);
      }
      const made = this.#make(slot, first);
      if ("reason" in made) {
        this.#refused.set(slot, { shape, reason: made.reason });
        if (made.say) {
          this.#say(
            `refused:${slot}:${made.reason}`,
            `warp: ${camera.frame.name} to ${camera.base.name} is fitted, not compiled: ${made.reason}.`,
            report,
          );
        }
        return undefined;
      }
      this.#refused.delete(slot);
      anchor = made;
    }
    this.#syncViews(anchor, views.slice(1), report);
    return anchor;
  }

  /** The slot is no longer warped: its routed draws go back as they were. */
  release(slot: number): void {
    this.#drop(slot);
    this.#refused.delete(slot);
  }

  /** The world is gone. */
  clear(): void {
    this.#anchors.clear();
    this.#refused.clear();
    this.#draws.clear();
    this.#queue.clear();
    this.#gpu = undefined;
  }

  /**
   * Whether the route's pipelines are made: "pending" while they compile (the
   * draws stay hidden, as for a fit), "failed" when the module didn't compile
   * (`fail`: its draws are fitted).
   */
  pipelines(anchor: RoutedAnchor): "ready" | "pending" | "failed" {
    const { shaders } = this.world.ctx;
    let state: "ready" | "pending" = "ready";
    for (const key of WARM_KEYS) {
      const made = shaders.pipeline(
        undefined,
        key,
        this.world.shaderReady,
        anchor.variant,
      );
      if (made) {
        continue;
      }
      if (!shaders.pending(undefined, key, anchor.variant)) {
        return "failed";
      }
      state = "pending";
    }
    return state;
  }

  /** The route's pipelines failed: it is refused from now on, and its draws are fitted. */
  fail(anchor: RoutedAnchor, report: (message: string) => void): void {
    this.#failed.add(anchor.variant.key);
    this.#say(
      `failed:${anchor.variant.key}`,
      `warp: a compiled route's pipelines did not compile; its draws are fitted instead.`,
      report,
    );
    this.#drop(anchor.slot);
    this.#refused.set(anchor.slot, {
      shape: "",
      reason: "its pipelines did not compile",
    });
  }

  /**
   * Routes the draw: its block is made and written within `run`'s budget.
   * `matrix` takes its model space to the anchor's; `center` and `radius` are
   * its bounding sphere in model space as it is before any route.
   */
  request(
    index: number,
    generation: number,
    anchor: RoutedAnchor,
    matrix: Float64Array,
    center: ArrayLike<number>,
    radius: number,
  ): void {
    let d = this.#draws.get(index);
    if (!d || d.generation !== generation) {
      d = {
        index,
        generation,
        anchor,
        matrix: new Float64Array(16),
        center: new Float64Array(3),
        radius,
        at: -1,
        rows: 0,
        recordVersion: -1,
        sphereVersion: -1,
        gpu: false,
      };
      this.#draws.set(index, d);
    }
    if (d.anchor !== anchor) {
      this.#freeBlock(d);
    }
    d.anchor = anchor;
    d.matrix.set(matrix);
    d.center.set([center[0]!, center[1]!, center[2]!]);
    d.radius = radius;
    d.recordVersion = -1;
    d.sphereVersion = -1;
    this.#queue.add(index);
  }

  /** Whether the draw's data is written and current. */
  placed(index: number): boolean {
    const d = this.#draws.get(index);
    return (
      d !== undefined &&
      d.at >= 0 &&
      !this.#queue.has(index) &&
      d.recordVersion >= 0
    );
  }

  /** The draw's bounding sphere in model space as it was before its route (its record holds the drawn one). */
  base(index: number): { center: Float64Array; radius: number } | undefined {
    const d = this.#draws.get(index);
    return d ? { center: d.center, radius: d.radius } : undefined;
  }

  /** The draw is being removed: its block is freed (its record goes with it). */
  forget(index: number): void {
    const d = this.#draws.get(index);
    if (d) {
      this.#freeBlock(d);
      this.#draws.delete(index);
      this.#queue.delete(index);
    }
  }

  /** The draw leaves its route: it is drawn as it was before it. */
  unroute(index: number): void {
    const d = this.#draws.get(index);
    if (!d) {
      return;
    }
    this.#draws.delete(index);
    this.#queue.delete(index);
    this.#restore(d);
  }

  /** The placements table's buffer was replaced: what the GPU wrote is gone from its CPU copy, so those draws are written again. */
  tableReplaced(): void {
    for (const [index, d] of this.#draws) {
      if (d.gpu && d.at >= 0) {
        this.#queue.add(index);
      }
    }
  }

  /**
   * The frame's step within `budgetMs`: writes queued draws' blocks, then
   * remakes spheres that follow a changed route. Returns the indices of
   * draws whose block was written now.
   */
  run(budgetMs: number): number[] {
    const placed: number[] = [];
    const deadline = performance.now() + budgetMs;
    let first = true;
    for (const index of [...this.#queue]) {
      if (!first && performance.now() >= deadline) {
        break;
      }
      first = false;
      this.#queue.delete(index);
      const d = this.#draws.get(index);
      if (d && this.world.hasDraw(handleOf(d))) {
        this.#place(d);
        placed.push(index);
      }
    }
    for (const [index, d] of this.#draws) {
      if (!first && performance.now() >= deadline) {
        break;
      }
      if (
        d.at >= 0 &&
        !this.#queue.has(index) &&
        d.sphereVersion !== d.anchor.sphereVersion
      ) {
        first = false;
        this.#setSphere(d);
      }
    }
    return placed;
  }

  // ---------------------------------------------------------------- internals

  /**
   * The routed anchor made for the slot, or why it can't be: `say` when the
   * route had smooth specs and the compiler still refused it (a warp with none
   * is the usual case, and fitted without a word).
   */
  #make(
    slot: number,
    first: ViewCamera,
  ): RoutedAnchor | { reason: string; say: boolean } {
    const camera = first.camera;
    if (this.world.warps.curved.active) {
      return {
        reason:
          "the world's curved clips carry their field on the fitted lattices",
        say: false,
      };
    }
    const bridged = bridgeRoute(camera);
    if ("reason" in bridged) {
      return { reason: bridged.reason, say: false };
    }
    const compiled = compileRoute(bridged.route, {
      normals: "auto",
      centreRows: true,
    });
    if (!compiled.ok) {
      return { reason: compiled.reason, say: true };
    }
    if (this.#failed.has(compiled.key)) {
      return { reason: "its pipelines did not compile", say: false };
    }
    const table = this.world.raster.placementTable;
    const uniformRows = compiled.uniformsLayout.floats / 4;
    const anchor: RoutedAnchor = {
      id: this.#nextId++,
      slot,
      bridged,
      compiled,
      variant: routeVariantOf(compiled),
      primaryView: first.id,
      pointerRow: table.allocateRows(ROUTE_POINTER_ROWS),
      uniformRow: table.allocateRows(uniformRows),
      uniformRows,
      uniforms: new Float32Array(compiled.uniformsLayout.floats),
      values: compiled.paramValues(bridged.route),
      version: 0,
      sphereVersion: 0,
      affine: affinePart(camera),
      ranges: rangesOf(camera, compiled),
      camera,
      maps: sphereMaps(camera),
      mapsVersion: 0,
      others: new Map(),
      gpuStale: false,
    };
    this.#anchors.set(slot, anchor);
    this.#writeUniforms(anchor);
    this.#writePointers(anchor);
    // Asks for the pipelines now, so they compile while the draws are made.
    void this.pipelines(anchor);
    return anchor;
  }

  /** Reads the live matrices and parameters; what changed is written or marked. */
  #refresh(anchor: RoutedAnchor, camera: CameraRoute): void {
    anchor.camera = camera;
    const { matrices, params } = anchor.bridged.refresh(camera);
    if (!matrices && !params) {
      return;
    }
    const values = anchor.compiled.paramValues(anchor.bridged.route);
    const ranges = rangesOf(camera, anchor.compiled);
    const centred = new Set(anchor.compiled.dynamicParams);
    let record = matrices;
    let sphere = matrices || !sameRanges(ranges, anchor.ranges);
    for (const key of Object.keys(values)) {
      if (values[key] === anchor.values[key]) {
        continue;
      }
      record ||= centred.has(key);
      sphere ||= !(key in ranges);
    }
    anchor.values = values;
    anchor.ranges = ranges;
    if (matrices) {
      anchor.affine = affinePart(camera);
    }
    if (record) {
      anchor.version++;
      this.#invalidate(anchor);
    }
    if (sphere || record) {
      anchor.sphereVersion++;
    }
    this.#writeUniforms(anchor);
    // Every view draws again: a slider moved the uniforms.
    this.world.version++;
    this.world.changedViews = 0xffffffff;
  }

  /**
   * Brings the other views' data to their camera routes: a view new to the
   * anchor is made (its uniforms in the placements buffer, its pointer set),
   * one that went is dropped, and one whose route is not the anchor's in
   * shape or in what a draw's record holds is left out, and said once.
   */
  #syncViews(
    anchor: RoutedAnchor,
    views: readonly ViewCamera[],
    report: (message: string) => void,
  ): void {
    const wanted = new Set(views.map((v) => v.id));
    for (const id of [...anchor.others.keys()]) {
      if (!wanted.has(id)) {
        this.#dropView(anchor, id);
      }
    }
    const primary = centreSignature(anchor.bridged, anchor.compiled);
    for (const { id, camera } of views) {
      const held = anchor.others.get(id);
      if (held?.bridged.matches(camera)) {
        this.#refreshView(anchor, held, camera, primary);
        continue;
      }
      if (held) {
        this.#dropView(anchor, id);
      }
      const made = this.#makeView(anchor, id, camera, primary);
      if (typeof made === "string") {
        this.#say(
          `view:${anchor.slot}:${id}:${made}`,
          `warp: view ${id}'s route for ${camera.frame.name} to ${camera.base.name} ${made}; it shows view ${anchor.primaryView}'s route (views whose routes have the same shape share a draw: only a root and a parameter that is a uniform may differ between them).`,
          report,
        );
        continue;
      }
      anchor.others.set(id, made);
      this.#writeUniforms(anchor, made);
      this.#writePointers(anchor);
      this.world.version++;
      this.world.changedViews = 0xffffffff;
    }
  }

  /** The data of one more view of the anchor, or the words for why its route can't share the anchor's. */
  #makeView(
    anchor: RoutedAnchor,
    id: number,
    camera: CameraRoute,
    primary: string,
  ): RoutedView | string {
    const bridged = bridgeRoute(camera);
    if ("reason" in bridged) {
      return `can't be bridged (${bridged.reason})`;
    }
    const compiled = compileRoute(bridged.route, {
      normals: "auto",
      centreRows: true,
    });
    if (!compiled.ok || compiled.key !== anchor.compiled.key) {
      return "differs in structure";
    }
    if (centreSignature(bridged, compiled) !== primary) {
      return "differs in what a draw's record is made from (a matrix before the last warp, or a parameter that isn't a uniform)";
    }
    const table = this.world.raster.placementTable;
    return {
      id,
      bridged,
      uniformRow: table.allocateRows(anchor.uniformRows),
      uniforms: new Float32Array(anchor.compiled.uniformsLayout.floats),
      values: compiled.paramValues(bridged.route),
      affine: affinePart(camera),
      ranges: rangesOf(camera, compiled),
      camera,
      maps: sphereMaps(camera),
      mapsVersion: anchor.sphereVersion,
    };
  }

  /** Reads one more view's live matrices and parameters. */
  #refreshView(
    anchor: RoutedAnchor,
    view: RoutedView,
    camera: CameraRoute,
    primary: string,
  ): void {
    view.camera = camera;
    const { matrices, params } = view.bridged.refresh(camera);
    if (!matrices && !params) {
      return;
    }
    if (centreSignature(view.bridged, anchor.compiled) !== primary) {
      // Its record would no longer be right for it: it is dropped (and made
      // again, or said, by the next frame's `#syncViews`).
      this.#dropView(anchor, view.id);
      return;
    }
    const values = anchor.compiled.paramValues(view.bridged.route);
    const ranges = rangesOf(camera, anchor.compiled);
    let sphere = matrices || !sameRanges(ranges, view.ranges);
    for (const key of Object.keys(values)) {
      sphere ||= values[key] !== view.values[key] && !(key in ranges);
    }
    view.values = values;
    view.ranges = ranges;
    if (matrices) {
      view.affine = affinePart(camera);
    }
    if (sphere) {
      anchor.sphereVersion++;
    }
    this.#writeUniforms(anchor, view);
    this.world.version++;
    this.world.changedViews = 0xffffffff;
  }

  /** The view's data goes: its views point at the anchor's own again. */
  #dropView(anchor: RoutedAnchor, id: number): void {
    const view = anchor.others.get(id);
    if (!view) {
      return;
    }
    anchor.others.delete(id);
    this.world.raster.placementTable.releaseRows(
      view.uniformRow,
      anchor.uniformRows,
    );
    this.#writePointers(anchor);
    anchor.sphereVersion++;
    this.world.version++;
    this.world.changedViews = 0xffffffff;
  }

  /** Writes the route's uniforms for the anchor's own view, or for `view`. */
  #writeUniforms(anchor: RoutedAnchor, view?: RoutedView): void {
    const bridged = view?.bridged ?? anchor.bridged;
    const uniforms = view?.uniforms ?? anchor.uniforms;
    const row = view?.uniformRow ?? anchor.uniformRow;
    anchor.compiled.fillUniforms(bridged.route, uniforms);
    const table = this.world.raster.placementTable;
    table.rowWords(row, anchor.uniformRows).f32.set(uniforms);
    table.upload(row, anchor.uniformRows);
  }

  /** Writes the pointer table: each view id's first uniform row (a view with none of its own reads the anchor's). */
  #writePointers(anchor: RoutedAnchor): void {
    const table = this.world.raster.placementTable;
    const { u32 } = table.rowWords(anchor.pointerRow, ROUTE_POINTER_ROWS);
    u32.fill(anchor.uniformRow);
    for (const [id, view] of anchor.others) {
      u32[id] = view.uniformRow;
    }
    table.upload(anchor.pointerRow, ROUTE_POINTER_ROWS);
  }

  /** The anchor's draws' records are stale: the compute pass remakes them, or the CPU does. */
  #invalidate(anchor: RoutedAnchor): void {
    let count = 0;
    for (const d of this.#draws.values()) {
      count += d.anchor === anchor && d.at >= 0 ? 1 : 0;
    }
    if (anchor.compiled.centreConstantsWgsl && count >= GPU_MIN_DRAWS) {
      if (!this.#gpu) {
        this.#gpu = new GpuCentres(this.world);
        this.world.addFrameCompute((pass) => this.#encode(pass));
      }
      anchor.gpuStale = true;
      return;
    }
    for (const [index, d] of this.#draws) {
      if (d.anchor === anchor && d.at >= 0) {
        d.recordVersion = -1;
        this.#queue.add(index);
      }
    }
  }

  /** Writes the draw's block, its centre constants and sphere, and gives it its route's pipelines. */
  #place(d: RoutedDraw): void {
    const { world } = this;
    const handle = handleOf(d);
    const anchor = d.anchor;
    const table = world.raster.placementTable;
    const compiled = anchor.compiled;
    // A fit's placement goes: the draw's block is the route's.
    if (world.scene.drawPlacements[d.index]) {
      setPlacement(world, handle, undefined);
    }
    const rows = routeBlockRows(compiled);
    if (d.at < 0) {
      d.at = table.allocateRows(rows);
      d.rows = rows;
    }
    const { f32, u32 } = table.rowWords(d.at, rows);
    const m = d.matrix;
    u32[0] = 1;
    u32[4] = ROUTE_KIND;
    f32[5] = 1;
    u32[6] = ROUTE_BODY;
    u32[7] = anchor.pointerRow;
    const body = ROUTE_BODY * 4;
    f32[body] = d.center[0]!;
    f32[body + 1] = d.center[1]!;
    f32[body + 2] = d.center[2]!;
    // The draw's linear part, a column a row.
    for (let c = 0; c < 3; c++) {
      for (let r = 0; r < 3; r++) {
        f32[body + 4 + 4 * c + r] = m[4 * c + r]!;
      }
    }
    // The route's value at the draw's centre, in float64.
    const at = new Float64Array(3);
    transformPoint(m, d.center, at);
    const start = (ROUTE_BODY + ROUTE_OWN_ROWS) * 4;
    compiled.centreConstants(
      at,
      anchor.values,
      anchor.bridged.route,
      f32.subarray(start, start + compiled.perDrawLayout.floats),
    );
    table.upload(d.at, rows);
    d.gpu = false;
    d.recordVersion = anchor.version;
    world.raster.drawConstants.setPlacement(d.index, d.at);
    this.#setSphere(d);
    setDrawRoute(world, handle, anchor.variant);
    world.scene.contentRevision_++;
    world.markDirty(d.index);
  }

  /**
   * The record's culling sphere: the route's image of the draw's own, in
   * model space, for every view that draws the anchor by this route (the
   * smallest ball holding each view's image).
   */
  #setSphere(d: RoutedDraw): void {
    const { world } = this;
    const anchor = d.anchor;
    const m = d.matrix;
    const scale = Math.max(
      Math.hypot(m[0]!, m[1]!, m[2]!),
      Math.hypot(m[4]!, m[5]!, m[6]!),
      Math.hypot(m[8]!, m[9]!, m[10]!),
      1e-12,
    );
    d.sphereVersion = anchor.sphereVersion;
    if (anchor.mapsVersion !== anchor.sphereVersion) {
      anchor.maps = sphereMaps(anchor.camera);
      anchor.mapsVersion = anchor.sphereVersion;
    }
    const views: Array<Pick<RoutedView, "maps" | "affine">> = [anchor];
    for (const view of anchor.others.values()) {
      if (view.mapsVersion !== anchor.sphereVersion) {
        view.maps = sphereMaps(view.camera);
        view.mapsVersion = anchor.sphereVersion;
      }
      views.push(view);
    }
    const centre = new Float64Array(3);
    transformPoint(m, d.center, centre);
    // The ball's centre and its six axis points, carried through the route's maps (at the ends of the scale's range): an estimate from samples, as selection's drawn volumes are.
    const r = d.radius * scale;
    const points = [centre[0]!, centre[1]!, centre[2]!];
    for (let a = 0; a < 3; a++) {
      for (const s of [-1, 1]) {
        const p = [centre[0]!, centre[1]!, centre[2]!];
        p[a] = p[a]! + s * r;
        points.push(p[0]!, p[1]!, p[2]!);
      }
    }
    // Each view's image, as a ball in model space: its centre's offset from the draw's own, and its radius.
    const balls: Array<{ shift: Float64Array; radius: number }> = [];
    for (const view of views) {
      let ball: { center: Float64Array; radius: number } | undefined;
      try {
        ball = drawnBounds(view.maps, points, r);
      } catch {
        ball = undefined;
      }
      // Where the transform alone puts the centre, and the drawn centre's offset from it, in model space.
      const placed = new Float64Array(3);
      transformPoint(view.affine, centre, placed);
      const shift = ball
        ? solve3(
            multiply3(view.affine, m),
            Float64Array.of(
              ball.center[0]! - placed[0]!,
              ball.center[1]! - placed[1]!,
              ball.center[2]! - placed[2]!,
            ),
          )
        : undefined;
      if (!ball || !shift || !Number.isFinite(ball.radius)) {
        balls.length = 0;
        break;
      }
      balls.push({ shift, radius: (ball.radius * 1.01) / scale });
    }
    const index = d.index;
    if (balls.length === 0) {
      // Undefined somewhere in a ball (a height at the body's centre): no sphere that holds, so none culls it.
      world.raster.drawConstants.setBounds(index, d.center, 3e38);
      world.raster.uploadsPending = true;
      return;
    }
    const merged = balls.reduce(mergeBalls);
    let rounding = 0;
    const next = [0, 1, 2].map((a) => {
      const exact = d.center[a]! + merged.shift[a]!;
      const rounded = Math.fround(exact);
      rounding += (rounded - exact) ** 2;
      return rounded;
    });
    const radius = roundUp32(merged.radius + Math.sqrt(rounding));
    world.raster.drawConstants.setBounds(index, next, radius);
    world.raster.uploadsPending = true;
    world.version++;
    world.changedViews |=
      world.raster.recordsU32[index * RECORD_WORDS + VIEW_MASK_WORD]!;
  }

  #freeBlock(d: RoutedDraw): void {
    if (d.at >= 0) {
      this.world.raster.placementTable.releaseRows(d.at, d.rows);
      d.at = -1;
      d.rows = 0;
    }
  }

  /** The draw's record goes back as it was before the route. */
  #restore(d: RoutedDraw): void {
    const { world } = this;
    this.#freeBlock(d);
    const handle = handleOf(d);
    if (!world.hasDraw(handle)) {
      return;
    }
    world.raster.drawConstants.setPlacement(d.index, NO_PLACEMENT);
    world.raster.drawConstants.setBounds(d.index, d.center, d.radius);
    setDrawRoute(world, handle, undefined);
    world.scene.contentRevision_++;
    world.markDirty(d.index);
  }

  /** The slot's route goes: its draws are restored (and asked for again, as fits or routed anew). */
  #drop(slot: number): void {
    const anchor = this.#anchors.get(slot);
    if (!anchor) {
      return;
    }
    this.#anchors.delete(slot);
    for (const [index, d] of [...this.#draws]) {
      if (d.anchor === anchor) {
        this.#draws.delete(index);
        this.#queue.delete(index);
        this.#restore(d);
      }
    }
    const table = this.world.raster.placementTable;
    for (const view of anchor.others.values()) {
      table.releaseRows(view.uniformRow, anchor.uniformRows);
    }
    table.releaseRows(anchor.pointerRow, ROUTE_POINTER_ROWS);
    table.releaseRows(anchor.uniformRow, anchor.uniformRows);
  }

  #say(
    key: string,
    message: string,
    report: ((message: string) => void) | undefined,
  ): void {
    if (report && !this.#said.has(key)) {
      this.#said.add(key);
      report(message);
    }
  }

  /**
   * One dispatch for each anchor whose records went stale: the draws the
   * views show now (their view mask is set by selection before the frame
   * encodes); the others stay stale until they are shown.
   */
  #encode(pass: GPUComputePassEncoder): void {
    const raster = this.world.raster;
    for (const anchor of this.#anchors.values()) {
      if (!anchor.gpuStale) {
        continue;
      }
      const draws: RoutedDraw[] = [];
      let waiting = 0;
      for (const [index, d] of this.#draws) {
        if (
          d.anchor !== anchor ||
          d.at < 0 ||
          d.recordVersion === anchor.version ||
          this.#queue.has(index)
        ) {
          continue;
        }
        if (raster.recordsU32[index * RECORD_WORDS + VIEW_MASK_WORD] !== 0) {
          draws.push(d);
        } else {
          waiting++;
        }
      }
      anchor.gpuStale = waiting > 0;
      if (draws.length === 0) {
        continue;
      }
      if (!this.#gpu!.dispatch(pass, anchor, draws)) {
        // The pipeline is being made: the CPU writes these records meanwhile.
        for (const d of draws) {
          d.recordVersion = -1;
          this.#queue.add(d.index);
        }
        this.world.ctx.wake();
        continue;
      }
      for (const d of draws) {
        d.recordVersion = anchor.version;
        d.gpu = true;
      }
    }
  }
}

/**
 * The df64 compute pass that remakes records (`CompiledRoute.centreConstantsWgsl`):
 * one pipeline for each route key, buffers made for a dispatch and freed when
 * the queue has run it (a pass is rare: a parameter or a place that changed).
 */
class GpuCentres {
  readonly #pipelines = new Map<string, GPUComputePipeline>();
  readonly #making = new Set<string>();
  #layout: GPUBindGroupLayout | undefined;

  constructor(private readonly world: World) {}

  /** Encodes the dispatch; false while the route's compute pipeline is made (nothing is encoded). */
  dispatch(
    pass: GPUComputePassEncoder,
    anchor: RoutedAnchor,
    draws: readonly RoutedDraw[],
  ): boolean {
    const { device } = this.world.ctx;
    const compiled = anchor.compiled;
    const compute = GPUShaderStage.COMPUTE;
    const layout = (this.#layout ??= device.createBindGroupLayout({
      label: "route.centres",
      entries: [
        { binding: 0, visibility: compute, buffer: { type: "uniform" } },
        {
          binding: 1,
          visibility: compute,
          buffer: { type: "read-only-storage" },
        },
        { binding: 2, visibility: compute, buffer: { type: "storage" } },
        {
          binding: 3,
          visibility: compute,
          buffer: { type: "read-only-storage" },
        },
      ],
    }));
    const pipeline = this.#pipelines.get(compiled.key);
    if (!pipeline) {
      this.#make(anchor, layout);
      return false;
    }
    const centres = draws.map((d) => {
      const at = new Float64Array(3);
      transformPoint(d.matrix, d.center, at);
      return at;
    });
    const buffers = [
      this.#upload(
        "uniforms",
        compiled.centreUniforms(
          anchor.bridged.route,
          draws.length,
          anchor.values,
        ),
        GPUBufferUsage.UNIFORM,
      ),
      this.#upload(
        "centres",
        compiled.packCentres(centres),
        GPUBufferUsage.STORAGE,
      ),
      this.#upload(
        "rows",
        Uint32Array.from(draws, (d) => routeCentreRow(d.at) * 4),
        GPUBufferUsage.STORAGE,
      ),
    ];
    const group = this.world.raster.placementTable.computeGroup(
      "route.centres",
      layout,
      2,
      [
        { binding: 0, resource: { buffer: buffers[0]! } },
        { binding: 1, resource: { buffer: buffers[1]! } },
        { binding: 3, resource: { buffer: buffers[2]! } },
      ],
    );
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, group);
    pass.dispatchWorkgroups(Math.ceil(draws.length / 64));
    void device.queue.onSubmittedWorkDone().then(() => {
      for (const buffer of buffers) {
        buffer.destroy();
      }
    });
    return true;
  }

  /**
   * Starts the route's compute pipeline, once: the module compiles off the
   * main thread (`createComputePipelineAsync`), and until it is made the
   * records are the CPU's. A pipeline that fails stays so.
   */
  #make(anchor: RoutedAnchor, layout: GPUBindGroupLayout): void {
    const { device } = this.world.ctx;
    const key = anchor.compiled.key;
    if (this.#making.has(key)) {
      return;
    }
    this.#making.add(key);
    const label = `route.centres ${anchor.variant.label}`;
    device
      .createComputePipelineAsync({
        label,
        layout: device.createPipelineLayout({ bindGroupLayouts: [layout] }),
        compute: {
          module: device.createShaderModule({
            label,
            code: anchor.compiled.centreConstantsWgsl!,
          }),
          entryPoint: "centreConstants",
        },
      })
      .then(
        (pipeline) => {
          this.#pipelines.set(key, pipeline);
          this.world.ctx.wake();
        },
        () => {},
      );
  }

  #upload(
    label: string,
    data: Float32Array | Uint32Array,
    usage: number,
  ): GPUBuffer {
    const { device } = this.world.ctx;
    const buffer = device.createBuffer({
      label: `route.centres.${label}`,
      size: Math.max(16, Math.ceil(data.byteLength / 4) * 4),
      usage: usage | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(buffer, 0, data as Float32Array<ArrayBuffer>);
    return buffer;
  }
}

function handleOf(d: RoutedDraw): DrawHandle {
  return { index: d.index, generation: d.generation, name: undefined };
}

/** What a camera route's compiled form depends on in its shape: its steps' kinds (rigid steps at each end and between warps, as `normalise` has them) and its warps' functions. */
function shapeOf(camera: CameraRoute): string {
  return normalise(camera.steps)
    .map((s) =>
      s.kind === "rigid"
        ? "r"
        : `${s.inverse ? "i" : "f"}${s.warp.smooth?.source ?? "?"}`,
    )
    .join(",");
}

/**
 * What a draw's record (its centre constants) is made from, which views of
 * one route must share: the rigid matrices before the last warp, and the
 * values of the parameters that aren't uniforms. What differs per view
 * without it is a uniform: the matrices after the last warp (a root) and
 * the values of the parameters that are.
 */
function centreSignature(
  bridged: BridgedRoute,
  compiled: CompiledRoute,
): string {
  const values = compiled.paramValues(bridged.route);
  return JSON.stringify([
    bridged.prefixMatrices().map((m) => Array.from(m)),
    compiled.dynamicParams.map((key) => values[key]),
  ]);
}

/** The smallest ball holding both: centres as offsets in model space. */
function mergeBalls(
  a: { shift: Float64Array; radius: number },
  b: { shift: Float64Array; radius: number },
): { shift: Float64Array; radius: number } {
  const d = Math.hypot(
    b.shift[0]! - a.shift[0]!,
    b.shift[1]! - a.shift[1]!,
    b.shift[2]! - a.shift[2]!,
  );
  if (d + b.radius <= a.radius) {
    return a;
  }
  if (d + a.radius <= b.radius) {
    return b;
  }
  const radius = (d + a.radius + b.radius) / 2;
  const t = (radius - a.radius) / d;
  return {
    shift: Float64Array.of(
      a.shift[0]! + (b.shift[0]! - a.shift[0]!) * t,
      a.shift[1]! + (b.shift[1]! - a.shift[1]!) * t,
      a.shift[2]! + (b.shift[2]! - a.shift[2]!) * t,
    ),
    radius,
  };
}

/**
 * The ranges of the scaled parameters a slider with a `range` moves, by the
 * compiled route's keys: `identity + s · (value − identity)` over the
 * range. A draw's sphere holds for all of them (a ranged slider walks no
 * draw); a scaled parameter without one is followed.
 */
function rangesOf(
  camera: CameraRoute,
  compiled: CompiledRoute,
): Record<string, ParamRange> {
  const ranges: Record<string, ParamRange> = {};
  let k = 0;
  for (const step of camera.steps) {
    if (step.kind !== "warp") {
      continue;
    }
    const info = compiled.steps[k++];
    const warp: Warp = step.warp;
    const range = warp.scale?.range;
    if (!info || !range) {
      continue;
    }
    for (const [name, identity] of Object.entries(
      warp.smooth?.identity ?? {},
    )) {
      const key = info.keys.get(name);
      if (key === undefined) {
        continue;
      }
      const value = warp.smooth!.params[name]!;
      const a = identity + range[0] * (value - identity);
      const b = identity + range[1] * (value - identity);
      ranges[key] = [Math.min(a, b), Math.max(a, b)];
    }
  }
  return ranges;
}

/** The maps a draw's sphere is bounded through: the route with its scales at the ends of their ranges, or at their values. */
function sphereMaps(camera: CameraRoute): DrawnMap[] {
  const at = (end: 0 | 1) => (warp: Warp) => {
    const range = warp.scale!.range;
    return range ? range[end] : warpScaleOf(warp);
  };
  const ranged = camera.steps.some(
    (s) => s.kind === "warp" && s.warp.scale?.range !== undefined,
  );
  return ranged
    ? [
        routeMap(withScalesAt(camera, at(0))),
        routeMap(withScalesAt(camera, at(1))),
      ]
    : [routeMap(withScalesAt(camera, at(0)))];
}

function sameRanges(
  a: Record<string, ParamRange>,
  b: Record<string, ParamRange>,
): boolean {
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => {
      const x = a[key] as readonly number[];
      const y = b[key] as readonly number[] | undefined;
      return y !== undefined && x[0] === y[0] && x[1] === y[1];
    })
  );
}

/** `m · (p, 1)`, column-major 4×4. */
function transformPoint(
  m: ArrayLike<number>,
  p: ArrayLike<number>,
  out: Float64Array,
): void {
  const x = p[0]!;
  const y = p[1]!;
  const z = p[2]!;
  out[0] = m[0]! * x + m[4]! * y + m[8]! * z + m[12]!;
  out[1] = m[1]! * x + m[5]! * y + m[9]! * z + m[13]!;
  out[2] = m[2]! * x + m[6]! * y + m[10]! * z + m[14]!;
}

/** The linear part of `a · b` (column-major 4×4s) as a column-major 3×3. */
function multiply3(a: ArrayLike<number>, b: ArrayLike<number>): Float64Array {
  const out = new Float64Array(9);
  for (let c = 0; c < 3; c++) {
    for (let r = 0; r < 3; r++) {
      out[3 * c + r] =
        a[r]! * b[4 * c]! +
        a[4 + r]! * b[4 * c + 1]! +
        a[8 + r]! * b[4 * c + 2]!;
    }
  }
  return out;
}

/** `m⁻¹ v` for a column-major 3×3; undefined where it is singular. */
function solve3(m: Float64Array, v: Float64Array): Float64Array | undefined {
  const a = m[0]!;
  const d = m[1]!;
  const g = m[2]!;
  const b = m[3]!;
  const e = m[4]!;
  const h = m[5]!;
  const c = m[6]!;
  const f = m[7]!;
  const i = m[8]!;
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (!(Math.abs(det) > 0) || !Number.isFinite(det)) {
    return undefined;
  }
  const x = v[0]!;
  const y = v[1]!;
  const z = v[2]!;
  return Float64Array.of(
    ((e * i - f * h) * x + (c * h - b * i) * y + (b * f - c * e) * z) / det,
    ((f * g - d * i) * x + (a * i - c * g) * y + (c * d - a * f) * z) / det,
    ((d * h - e * g) * x + (b * g - a * h) * y + (a * e - b * d) * z) / det,
  );
}
