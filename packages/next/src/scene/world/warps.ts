// A world's warp context (plan §13.26, increments 1 and 4): draws under an
// anchor whose route to the view's render root crosses a warp are drawn
// warped. The app defines a warp frame and puts the rig on it; nothing is
// set per item. Until a draw's first fit exists it is held hidden, so
// unwarped content never flashes; a stale fit stays drawn while a refit
// runs, within a per-frame budget.
//
// Where the route is evaluated (`WarpAt`, scene/warpAnchor.ts):
//
// - "vertex" (the default): per vertex, by a fit of the route over each
//   draw's bounding sphere (a lattice term of weight 1, scene/warpFit.ts).
//   A globe's terrain tile under a height-scale warp (`Warp.heightScale`)
//   is exact instead, with no fit: its vertices carry `h·n̂` and the route's
//   term is that attribute times (k − 1).
// - "anchor": once, at the draw's origin. The draw moves rigidly by the
//   route there, with the rotation of its Jacobian and no scale. An
//   anchored draw's term is an exact one-cell lattice, so it costs the
//   vertex stage what a fit does and nothing to fit.
//
// Billboards are always anchored: their placement moves the billboard's
// anchor, and its corners stay pixels on screen. Instanced draws are
// anchored per instance: each instance's origin goes through the route on
// the CPU, in slices within the frame's budget, and its matrix is rewritten
// (the instance table's, which the cull and vertex stages already read), so
// a warp costs them nothing. Point sets and instances written by the GPU (a
// `ModelPool`'s) are carried through the route by their `PointSource`'s
// frame kernel (a hidden carrier draw is fitted like any draw, and the
// kernel evaluates its lattice at each point before writing the anchor the
// cull, the quads and the pool read), not placed themselves. A point set no
// source owns is drawn at its anchor's place, unwarped: its cull reads
// positions the placement doesn't reach.
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
  withScalesAt,
  withoutScales,
  type HeightScale,
  type Route,
  type Warp,
  type WarpScale,
} from "../../camera/route.ts";
import { HEIGHT_NORMAL_ATTRIBUTE } from "../../globe/heightNormal.ts";
import { invertAffine, mat4, multiply } from "../../math/mat4.ts";
import {
  CENTER_WORD,
  FLAGS_WORD,
  INSTANCE_COUNT_WORD,
  INSTANCE_FIRST_WORD,
  INSTANCE_WORDS,
  RADIUS_WORD,
  RECORD_WORDS,
  RecordFlags,
  TRANSFORM_WORD,
  VIEW_MASK_WORD,
  readInstanceMatrix,
  writeInstance,
} from "../../render/layout.ts";
import { checkPlacement, type Placement } from "../placement.ts";
import {
  anchorCorrector,
  anchorLattice,
  correctedInstance,
  invert3,
  linearPart,
  type WarpAt,
} from "../warpAnchor.ts";
import {
  drawnBounds,
  routeMap,
  scaledBounds,
  scaledImage,
  type DrawnMap,
  type ScaledImage,
} from "../warpBounds.ts";
import { affinePart, fitLatticeSteps, routeDisplacement } from "../warpFit.ts";
import {
  WarpFitCache,
  type FitJob,
  type FitSteps,
  type WarpFit,
} from "../warpFitCache.ts";
import { WorldCurvedClips } from "./curvedClips.ts";
import { checkTerms, termsOf } from "../warpEvaluate.ts";
import {
  MAX_WARP_TERMS,
  constantWeight,
  type CubicLattice,
  type TermWeight,
  type WarpTerms,
  type WeightedTerm,
} from "../warpTerms.ts";
import type { World } from "../World.ts";
import type { TileWarp, WarpedPoints } from "../../streaming/tileWarp.ts";
import { setPlacement } from "./placements.ts";
import { WorldRoutes, type RoutedAnchor } from "./routes.ts";
import { drawMatrix } from "./transforms.ts";
import type { DrawHandle, TransformHandle } from "./types.ts";

/** What a frame's fits may cost by default, ms (`Engine.warpBudgetMs`). */
export const WARP_BUDGET_MS = 4;

/** The tolerance's floor, m: a fit is never asked to beat a millimetre. */
const TOLERANCE_FLOOR = 1e-3;

/** What a fit hears of the tile's geometric error: `geometricError / 64`, 0.25 px at a 16 px threshold. */
const GEOMETRIC_ERROR_SHARE = 1 / 64;

/** One warped anchor: its route, and what its draws' fits were made for. */
interface AnchorWarp {
  route: Route;
  /**
   * Names the fits this route's draws need: it changes when the warps'
   * revisions or the scales a fit follows do, and comes back when they do. The
   * same for two routes whose displacements are the same, whatever their
   * roots.
   */
  stamp: number;
  /** Names what a fit's displacement is made of apart from the stamp's revisions and scales: its warps and the rigid steps before the last of them. The cache's variant. */
  shape: number;
  /** What a fit depends on: its warps and the rigid steps before the last of them, and the revisions the warps had. */
  signature: {
    warps: Warp[];
    inverse: boolean[];
    prefix: number[];
    revisions: number[];
  };
  /** The matrix the anchor is placed by: the route's rigid steps composed. */
  affine: Float64Array;
  /** The single scaled warp's parameter, when one fit of its unit displacement serves every scale. */
  linear: WarpScale | undefined;
  /** What a fit runs on: the unit route when `linear`, else the route with its scales as they were at `stamp`. */
  fitRoute: Route;
  /** The scales of the route's scaled warps at `stamp`, in step order (refit mode). */
  scales: number[];
  /**
   * Changes when the route's displacement or a scale does, which an anchored
   * draw is evaluated for (its rotation isn't linear in a scale, so a slider
   * redoes it: one route evaluation a draw, with no fit). Named like `stamp`.
   */
  pointStamp: number;
  /** The route with its scales as they were at `pointStamp`: what anchored draws are evaluated on. */
  pointRoute: Route;
  /** The route is one height-scale warp then rigid steps: terrain carrying `h·n̂` is exaggerated exactly. */
  height: HeightScale | undefined;
  /** The route compiled (scene/world/routes.ts), when every warp has a smooth spec the compiler takes: draws it can serve are routed, not fitted. Reflects the last `frame`. */
  routed: RoutedAnchor | undefined;
}

/** What a draw is: a mesh drawn once, a billboard (placed at its anchor), or instances (each placed by its own origin). */
type DrawKind = "mesh" | "billboard" | "instances";

/** An instanced draw's matrices as they were before the route moved them, and where the pass over them is. */
interface InstanceState {
  /** The instances' own matrices (column-major 4×4, float32), as the application wrote them. */
  base: Float32Array;
  /** The next instance a pass moves, and the anchor stamp it moves them for. */
  next: number;
  stamp: number;
  /** The draw's matrix to its anchor, and its linear part's inverse, for the pass. */
  readonly matrix: Float64Array;
}

/** One draw under a warped anchor. */
interface DrawWarp {
  readonly index: number;
  readonly generation: number;
  readonly slot: number;
  readonly kind: DrawKind;
  /** The cache's key for the draw's fit: it changes with `at`, so a fit of the other kind is never taken. */
  key: string;
  /** What the draw asked (`World.setWarpAt`); a billboard or an instanced draw is anchored whatever it asked. */
  choice: WarpAt;
  /** The transform whose origin an anchored draw moves about: its own when undefined. */
  origin: TransformHandle | undefined;
  /** Hidden since it was found, until its first fit lands. */
  held: boolean;
  /** Whether the draw asked to be hidden (`World.setVisible`). */
  userHidden: boolean;
  /** What the draw is placed by of its own (an item's dual position), besides the route. */
  user: Placement | WarpTerms | undefined;
  /** The lattice drawn now (a fit or an anchored draw's), if the route's term is one. */
  applied: CubicLattice | undefined;
  /** The route's term drawn now and its weight: `applied`, or terrain's exact `h·n̂`. */
  routeTerm: WeightedTerm | undefined;
  /** The route's term is terrain's exact height term: nothing was fitted. */
  exact: boolean;
  /** The draw is drawn by its anchor's compiled route (scene/world/routes.ts): nothing was fitted. */
  routed: boolean;
  /** An instanced draw's moves. */
  readonly instances: InstanceState | undefined;
  /** The anchor stamp whose fit is requested, and the one `applied` is for (−1: an older one). */
  requested: number;
  /** The route stamp the draw was last asked its term at: a later ask is a refit, a placing again or a move. */
  askedStamp: number | undefined;
  appliedStamp: number;
  /** The draw's matrix to its anchor when its fit was requested. */
  readonly matrix: Float64Array;
  /** Where an anchored draw's origin was when its term was requested, in its anchor's coordinates. */
  readonly originAt: Float64Array;
}

/** What `WorldWarps.status` says of a draw. */
export interface DrawWarpStatus {
  /** The route that places the draw's anchor. */
  readonly route: Route;
  /** "fitted": drawn at the current fit; "stale": an older fit is drawn while a refit runs; "pending": hidden until its first fit. An instanced draw is "fitted" once every instance has been moved by the current route. */
  readonly state: "fitted" | "stale" | "pending";
  /** Where the route is evaluated for the draw (`WarpAt`). */
  readonly at: WarpAt;
  /** Terrain drawn by its exact height term, with no fit. */
  readonly exact: boolean;
  /** Drawn by its anchor's compiled route (the transform graph's), with no fit. */
  readonly routed: boolean;
}

/**
 * What the world's warps have done (`World.warpStats`; provisional): the
 * counts since the world was made, and how its warped draws stand now.
 */
export interface WarpStats {
  /** Per-vertex fits made: one for each tile or draw as it first appears under a warp. The slider adds none (one fit of the unit displacement serves every scale). */
  readonly fitsRun: number;
  /** Per-vertex fits asked for a draw already fitted, because its route changed (the warp itself did, or a scale that can't be fitted once). */
  readonly refits: number;
  /** Anchored draws (billboards, a model kept upright) placed: one route evaluation each, not a fit. */
  readonly placed: number;
  /** Anchored or instanced draws placed again by a route change or a slider move. */
  readonly replaced: number;
  /** Draws asked for again with their route as it was: their transform moved, or `setWarpAt` changed where they are placed. A fit or a placing, by the draw's kind. */
  readonly moved: number;
  /** Fits asked for and not yet run. */
  readonly pending: number;
  /** The draws under a warped anchor, by how they stand: "exact" is terrain drawn by its height term with no fit (also counted in its fitted, stale or pending state). */
  readonly draws: {
    readonly total: number;
    readonly fitted: number;
    readonly stale: number;
    readonly pending: number;
    readonly exact: number;
    /** Drawn by a compiled route: counted in its fitted, stale or pending state too. */
    readonly routed: number;
  };
}

/** The height a terrain tile's `h·n̂` was made on, and the most it holds (`World.setDrawHeightNormal`). */
export interface HeightNormalInfo {
  readonly radii: readonly [number, number, number];
  readonly maxDistance: number;
}

/** Instances moved per check of the clock, and at least per frame. */
const INSTANCE_CHUNK = 256;

/** A draw a compiled route serves is requested at this plus the route's id: stamps from `#name` count up from 1 and never reach it. */
const ROUTED_STAMP = 2 ** 30;

/** The shapes of route a draw's fits are kept for. */
const SHAPES_PER_DRAW = 4;

/** Names kept for shapes and versions; past it they are dropped, and fits are made again rather than reused. */
const MAX_NAMES = 4096;

/** A scale without a range is bounded in buckets of this many to the unit: its drawn volumes are made for the bucket's two ends. */
const SCALE_BUCKETS = 64;

/**
 * A scale with a range is bounded in this many buckets over it, the same
 * way. Selection's drawn volumes hold for the whole bucket the value is in,
 * not the whole range: at the range's top a tile's screen-space error is
 * stretched by the most the warp can do, which, held for a slider at the
 * bottom, has the tileset refine and load far past what is drawn.
 */
const RANGE_BUCKETS = 16;

/** A scaled warp's bucket now: a key for it, and the ends of the values it holds for. */
function scaleBucket(warp: Warp): { key: string; low: number; high: number } {
  const value = warpScaleOf(warp);
  const range = warp.scale!.range;
  if (range && value >= range[0] && value <= range[1]) {
    const span = range[1] - range[0];
    if (!(span > 0)) {
      return { key: "r", low: range[0], high: range[1] };
    }
    const bucket = Math.min(
      RANGE_BUCKETS - 1,
      Math.floor(((value - range[0]) / span) * RANGE_BUCKETS),
    );
    return {
      key: `r${bucket}`,
      low: range[0] + (span * bucket) / RANGE_BUCKETS,
      high: range[0] + (span * (bucket + 1)) / RANGE_BUCKETS,
    };
  }
  const bucket = Math.floor(value * SCALE_BUCKETS);
  return {
    key: String(bucket),
    low: bucket / SCALE_BUCKETS,
    high: (bucket + 1) / SCALE_BUCKETS,
  };
}

/** What selection reads of one warped anchor (`World.tileWarp`): drawn bounds from its route, remade when the route or a scale's bucket changes. */
class AnchorTileWarp implements TileWarp {
  version = 0;
  scaleVersion = 0;
  #key = "";
  #identity = "";
  #maps: DrawnMap[] = [];
  /**
   * A route of one scaled warp among rigid steps is affine in the scale: its
   * map at scale 0 and at scale 1, from which the bounds for any interval of
   * the scale follow (`scaledImage`), so a slider that crosses a bucket
   * remakes no tile's map evaluations.
   */
  #affine: { base: DrawnMap; full: DrawnMap } | undefined;
  /** The scale values the drawn volumes hold for (the bucket the value is in). */
  #low = 0;
  #high = 1;

  constructor(private readonly warps: WorldWarps) {}

  get fitVersion(): number {
    return this.warps.fitVersion;
  }

  bounds(points: ArrayLike<number>, spacing?: number): WarpedPoints {
    try {
      const affine = this.#affine;
      if (affine) {
        const image = scaledImage(affine.base, affine.full, points, spacing);
        return { ...scaledBounds(image, this.#low, this.#high), image };
      }
      return drawnBounds(this.#maps, points, spacing);
    } catch {
      // A map undefined at a sample (a height warp at the body's centre,
      // which a hemisphere's box reaches): not finite, so the volume stays
      // where it is (`tileWarp.ts` carried).
      return {
        center: [NaN, NaN, NaN] as unknown as WarpedPoints["center"],
        radius: NaN,
        sigmaMin: NaN,
        sigmaMax: NaN,
        secondDerivative: NaN,
      };
    }
  }

  rebound(image: object): WarpedPoints {
    return {
      ...scaledBounds(image as ScaledImage, this.#low, this.#high),
      image,
    };
  }

  fitError(draws: readonly DrawHandle[]): number {
    return this.warps.fitError(draws);
  }

  /**
   * Remakes the maps when the anchor's route changed or a scaled warp
   * left its bucket: the map to the anchor's coordinates (`A⁻¹ · route`,
   * `A` its place), at the ends of each scale's bucket (`scaleBucket`). With
   * several scales the ends are taken together: an estimate. A route that is
   * affine in its one scale keeps its maps across buckets, and `scaleVersion`
   * says the bucket moved.
   */
  refresh(route: Route, stamp: number): void {
    const parts: string[] = [`${stamp}`];
    const buckets = new Map<Warp, { key: string; low: number; high: number }>();
    for (const s of route.steps) {
      if (s.kind === "warp" && s.warp.scale) {
        const bucket = scaleBucket(s.warp);
        parts.push(bucket.key);
        buckets.set(s.warp, bucket);
      }
    }
    const only = route.steps.find((s) => s.kind === "warp" && s.warp.scale);
    const affine =
      buckets.size === 1 &&
      only?.kind === "warp" &&
      !only.inverse &&
      route.steps.every((s) => s === only || s.kind === "rigid");
    const identity = affine ? `${stamp}:a` : parts.join(":");
    const key = affine ? `${identity}:${parts[1]}` : identity;
    if (key === this.#key) {
      return;
    }
    this.#key = key;
    if (affine) {
      const bucket = buckets.get(only.warp)!;
      this.#low = bucket.low;
      this.#high = bucket.high;
      this.scaleVersion++;
      if (identity === this.#identity) {
        return;
      }
      this.#identity = identity;
      this.version++;
      const after = invertAffine(mat4(), affinePart(route));
      this.#maps = [];
      this.#affine = {
        base: routeMap(
          withScalesAt(route, () => 0),
          after,
        ),
        full: routeMap(
          withScalesAt(route, () => 1),
          after,
        ),
      };
      return;
    }
    this.#identity = identity;
    this.#affine = undefined;
    this.version++;
    const after = invertAffine(mat4(), affinePart(route));
    if (parts.length === 1) {
      this.#maps = [routeMap(route, after)];
      return;
    }
    const end = (high: boolean) => (warp: Warp) => {
      const bucket = buckets.get(warp)!;
      return high ? bucket.high : bucket.low;
    };
    this.#maps = [
      routeMap(withScalesAt(route, end(false)), after),
      routeMap(withScalesAt(route, end(true)), after),
    ];
  }
}

export class WorldWarps {
  /**
   * Fits by draw and route shape. Entries leave with their draws
   * (`drawRemoved`), so no cap evicts a fit a draw still waits for; a draw
   * keeps the last few shapes it was fitted for, to come back to.
   */
  readonly cache = new WarpFitCache(2 ** 30, SHAPES_PER_DRAW);
  readonly #anchors = new Map<number, AnchorWarp>();
  readonly #tileWarps = new Map<number, AnchorTileWarp>();
  /** Goes up when a draw's fit is drawn or forgotten (`TileWarp.fitVersion`). */
  fitVersion = 0;
  readonly #draws = new Map<number, DrawWarp>();
  /** Draws whose current fit is not yet drawn. */
  readonly #waiting = new Set<number>();
  /** Tiles' geometric errors by draw index, for the fit's tolerance. */
  readonly #errors = new Map<number, number>();
  /** What draws asked of `World.setWarpAt`, by draw index. */
  readonly #choices = new Map<
    number,
    { generation: number; at: WarpAt; origin: TransformHandle | undefined }
  >();
  /** Terrain tiles' `h·n̂` by draw index (`setHeightNormal`). */
  readonly #heightNormals = new Map<
    number,
    { generation: number; info: HeightNormalInfo }
  >();
  /** Draws whose instances the GPU writes (`markGpuInstances`), by draw index. */
  readonly #gpuInstanced = new Map<number, number>();
  /** Point meshes a PointSource owns (markSourced). */
  readonly #sources = new Set<number>();
  /** Warned of already: a message is said once. */
  readonly #said = new Set<string>();
  /** The last frame's report, for what is said between frames. */
  #report: ((message: string) => void) | undefined;
  /** Instanced draws with a pass over their instances under way. */
  readonly #instancePasses = new Set<number>();
  /** Draws let go of when their anchor stopped being warped, with what their fits were made for: a fit is taken up again only if the draw is as it was. */
  readonly #released = new Map<
    number,
    {
      generation: number;
      key: string;
      matrix: Float64Array;
      origin: Float64Array;
      fits: WarpFit[];
    }
  >();
  /** Names for route shapes and versions (`#name`). */
  readonly #names = new Map<string, number>();
  #clock = 0;
  #transformRevision = -1;
  readonly #scratch = new Float64Array(16);
  /** A curved clip's field on the draws' lattices (curvedClips.ts). */
  readonly curved: WorldCurvedClips;
  /** Compiled routes: the draws they draw instead of fits (routes.ts). */
  readonly routes: WorldRoutes;
  /** Routed draws waiting for their block and pipelines. */
  readonly #routedWaiting = new Set<number>();

  constructor(private readonly world: World) {
    this.curved = new WorldCurvedClips(
      world,
      (index) => this.#errors.get(index) ?? 0,
    );
    this.routes = new WorldRoutes(world);
  }

  /** Fits queued and not yet run. */
  get pending(): number {
    return this.cache.pending;
  }

  readonly #counts = {
    fitsRun: 0,
    refits: 0,
    placed: 0,
    replaced: 0,
    moved: 0,
  };

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

  /**
   * Where the route is evaluated for the draw (`WarpAt`): `"vertex"` by
   * default, `"anchor"` to keep its shape, moving it rigidly by the route at
   * `origin`'s origin (the transform's own when undefined). Billboards and
   * instanced draws are anchored whatever is asked. A draw not under a warped
   * anchor remembers it. Changing it refits the draw.
   */
  setWarpAt(handle: DrawHandle, at: WarpAt, origin?: TransformHandle): void {
    if (!this.world.hasDraw(handle)) {
      return;
    }
    if (at !== "vertex" && at !== "anchor") {
      throw new RangeError(
        `setWarpAt: "${String(at)}" is not "vertex" or "anchor".`,
      );
    }
    const before = this.#choices.get(handle.index);
    if (
      before?.generation === handle.generation &&
      before.at === at &&
      before.origin === origin
    ) {
      return;
    }
    if (at === "vertex" && origin === undefined) {
      this.#choices.delete(handle.index);
    } else {
      this.#choices.set(handle.index, {
        generation: handle.generation,
        at,
        origin,
      });
    }
    const d = this.#state(handle);
    if (d) {
      d.choice = at;
      d.origin = origin;
      this.#rekey(handle.index, d);
    }
  }

  /** What the draw asked of `setWarpAt` (`"vertex"` unless it asked otherwise), and what it is drawn as: a billboard or an instanced draw is anchored. */
  warpAt(
    handle: DrawHandle,
  ): { choice: WarpAt; effective: WarpAt } | undefined {
    if (!this.world.hasDraw(handle)) {
      return undefined;
    }
    const choice = this.#choiceOf(handle.index, handle.generation).at;
    const d = this.#state(handle);
    return { choice, effective: d ? effectiveAt(d.kind, d.choice) : choice };
  }

  /**
   * @internal A terrain tile's draw carries `h·n̂` per vertex
   * (`HEIGHT_NORMAL_ATTRIBUTE`) made on the ellipsoid `radii`, and none of
   * them is longer than `maxDistance`: under a height-scale warp on the same
   * ellipsoid it is exaggerated exactly, with no fit.
   */
  setHeightNormal(handle: DrawHandle, info: HeightNormalInfo): void {
    if (!this.world.hasDraw(handle)) {
      return;
    }
    this.#heightNormals.set(handle.index, {
      generation: handle.generation,
      info,
    });
    const d = this.#state(handle);
    if (d && d.requested >= 0) {
      d.requested = -1;
    }
  }

  /**
   * The height-scale warp that places the anchor in `slot`, if its route is
   * one: a globe there wants its tiles to carry `h·n̂`. Reflects the last
   * `frame`.
   */
  heightScaleAt(slot: number): HeightScale | undefined {
    return this.#anchors.get(slot)?.height;
  }

  /**
   * @internal The point set is a `PointSource`'s: its frame kernel carries
   * the points through the route, so the draws of the set are not placed.
   */
  markSourced(mesh: { readonly id: number }): void {
    this.#sources.add(mesh.id);
  }

  /**
   * @internal The draw's instances are written by the GPU (a `ModelPool`'s):
   * they are placed by their source's frame kernel (`markSourced`), which
   * writes the anchors the pool reads, so the draw itself is not.
   */
  markGpuInstances(handle: DrawHandle): void {
    if (!this.world.hasDraw(handle)) {
      return;
    }
    this.#gpuInstanced.set(handle.index, handle.generation);
    // Found already (its anchor was warped as it was added): given back.
    const d = this.#state(handle);
    if (d) {
      this.#draws.delete(handle.index);
      this.#waiting.delete(handle.index);
      this.#instancePasses.delete(handle.index);
      this.cache.forget(d.key);
      if (d.instances) {
        this.#restoreInstances(handle.index, d);
      }
      this.#setHidden(handle.index, d.userHidden);
    }
  }

  /**
   * @internal `World.setInstance` wrote instance `instance` of the draw: it
   * is the application's matrix again, so the route moves it afresh.
   */
  instanceChanged(handle: DrawHandle, instance: number): void {
    const d = this.#state(handle);
    const state = d?.instances;
    if (!d || !state || instance >= state.base.length / 16) {
      return;
    }
    const raster = this.world.raster;
    const slot =
      raster.recordsU32[handle.index * RECORD_WORDS + INSTANCE_FIRST_WORD]! +
      instance;
    const m = readInstanceMatrix(
      raster.instances.f32,
      slot,
      new Float64Array(16),
    );
    for (let k = 0; k < 16; k++) {
      state.base[instance * 16 + k] = m[k]!;
    }
    // A pass under way moves it when it gets there; one that has been past it
    // moves it again now.
    if (instance >= state.next) {
      return;
    }
    const anchor = this.#anchors.get(d.slot);
    if (anchor) {
      this.#moveInstances(handle.index, d, anchor, instance, instance + 1);
    }
  }

  /**
   * What selection reads of the anchor in `slot` (0: the world's root), when
   * its route crosses a warp: the drawn bounds of volumes and the stretch of
   * errors. Undefined for an anchor placed rigidly. Reflects the last
   * `frame`.
   */
  tileWarp(slot: number): TileWarp | undefined {
    const anchor = this.#anchors.get(slot);
    if (!anchor) {
      this.#tileWarps.delete(slot);
      return undefined;
    }
    let warp = this.#tileWarps.get(slot);
    if (!warp) {
      warp = new AnchorTileWarp(this);
      this.#tileWarps.set(slot, warp);
    }
    warp.refresh(anchor.route, anchor.stamp);
    return warp;
  }

  /** The worst error (m) of the fits now drawn for `draws` against their route, and of their curved clips' fields; 0 where none is drawn. */
  fitError(draws: readonly DrawHandle[]): number {
    let worst = 0;
    for (const handle of draws) {
      const applied = this.#state(handle)?.applied;
      // A failed fit is drawn as no warp: its bound is a sentinel.
      if (applied && applied.errorBound < Number.MAX_VALUE) {
        worst = Math.max(worst, applied.errorBound);
      }
      if (this.world.hasDraw(handle)) {
        worst = Math.max(worst, this.curved.errorOf(handle.index));
      }
    }
    return worst;
  }

  /**
   * Counts a draw asked for its term again: by a changed route stamp (a
   * refit, or for an anchored or instanced draw, placing it again), or with
   * the route as it was (`moved`: its transform moved, or it was set to be
   * placed elsewhere).
   */
  #countAsk(d: DrawWarp, stamp: number, anchored: boolean): void {
    const before = d.askedStamp;
    d.askedStamp = stamp;
    if (before === undefined) {
      return;
    }
    const stats = this.#counts;
    if (before === stamp) {
      stats.moved++;
    } else if (anchored) {
      stats.replaced++;
    } else {
      stats.refits++;
    }
  }

  /** How a draw's term stands: drawn at the current one, at an older one, or not yet. */
  #stateOf(d: DrawWarp): DrawWarpStatus["state"] {
    const drawn = d.instances
      ? d.appliedStamp >= 0
      : d.routeTerm !== undefined || d.routed;
    return d.appliedStamp === d.requested && drawn
      ? "fitted"
      : drawn
        ? "stale"
        : "pending";
  }

  /** The work done for warped draws, and how they stand (`World.warpStats`). */
  stats(): WarpStats {
    const draws = {
      total: 0,
      fitted: 0,
      stale: 0,
      pending: 0,
      exact: 0,
      routed: 0,
    };
    for (const d of this.#draws.values()) {
      draws.total++;
      draws[this.#stateOf(d)]++;
      if (d.exact) {
        draws.exact++;
      }
      if (d.routed) {
        draws.routed++;
      }
    }
    return {
      ...this.#counts,
      pending: this.cache.pending,
      draws,
    };
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
      state: this.#stateOf(d),
      at: effectiveAt(d.kind, d.choice),
      exact: d.exact,
      routed: d.routed,
    };
  }

  /** A draw was added: hidden at once when its anchor is warped, before any frame can draw it. */
  drawAdded(handle: DrawHandle): void {
    this.curved.drawAdded(handle);
    if (this.#anchors.size === 0) {
      return;
    }
    this.#register(handle.index, handle.generation);
  }

  /** A draw is being removed: its fit is forgotten. */
  drawRemoved(handle: DrawHandle): void {
    this.curved.drawRemoved(handle);
    this.#errors.delete(handle.index);
    this.#choices.delete(handle.index);
    this.#heightNormals.delete(handle.index);
    this.#gpuInstanced.delete(handle.index);
    this.#released.delete(handle.index);
    for (const at of ["vertex", "anchor"]) {
      this.cache.forget(`${handle.index}:${handle.generation}:${at}`);
    }
    const d = this.#draws.get(handle.index);
    this.routes.forget(handle.index);
    this.#routedWaiting.delete(handle.index);
    if (d) {
      this.fitVersion++;
      this.#draws.delete(handle.index);
      this.#waiting.delete(handle.index);
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
    if (d.kind !== "mesh" && placement !== undefined) {
      throw new Error(
        d.kind === "billboard"
          ? "setPlacement: a billboard or point draw's positions are offsets on screen; it has no per-vertex placement."
          : "setPlacement: an instanced draw has no per-vertex placement: it would move a mesh's vertices before each instance's matrix, and not the instances.",
      );
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
    if (d.routeTerm) {
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
    this.#report = report;
    this.#sync(root, routes);
    if (this.#anchors.size === 0 && this.#draws.size === 0) {
      return false;
    }
    for (const [slot, anchor] of this.#anchors) {
      anchor.routed = this.routes.sync(slot, anchor.route, report);
    }
    this.#track();
    for (const [index, d] of this.#draws) {
      const anchor = this.#anchors.get(d.slot);
      if (anchor && d.requested !== this.#stampOf(d, anchor)) {
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
      const lattice = this.cache.current(
        d.key,
        String(anchor.shape),
        d.requested,
      );
      if (lattice) {
        this.#waiting.delete(index);
        this.#adopt(index, d, anchor, lattice, d.requested, report);
      }
    }
    const routing = this.#stepRouted(budgetMs, report);
    return this.#runInstances(budgetMs) || this.cache.pending > 0 || routing;
  }

  /**
   * Compiled routes' step: draws requested are written within `budgetMs`
   * (routes.ts), and one whose block is written and whose route's pipelines
   * are made is drawn (it was held hidden until now, as for a fit). A route
   * whose pipelines failed is refused: its draws are fitted. True while any
   * wait.
   */
  #stepRouted(budgetMs: number, report: (message: string) => void): boolean {
    this.routes.run(budgetMs);
    let busy = this.routes.pending;
    for (const index of [...this.#routedWaiting]) {
      const d = this.#draws.get(index);
      const anchor = d && this.#anchors.get(d.slot);
      const routed = anchor?.routed;
      if (!d || !anchor || !routed) {
        this.#routedWaiting.delete(index);
        continue;
      }
      if (!this.routes.placed(index)) {
        busy = true;
        continue;
      }
      const state = this.routes.pipelines(routed);
      if (state === "failed") {
        this.routes.fail(routed, report);
        anchor.routed = undefined;
        this.#routedWaiting.clear();
        return true;
      }
      if (state === "pending") {
        busy = true;
        continue;
      }
      this.#routedWaiting.delete(index);
      d.routed = true;
      d.applied = undefined;
      d.exact = false;
      d.routeTerm = undefined;
      d.appliedStamp = d.requested;
      this.fitVersion++;
      this.#show(index, d);
    }
    return busy;
  }

  /** The world is gone: nothing is kept. */
  clear(): void {
    this.curved.clear();
    this.routes.clear();
    this.cache.clear();
    this.#anchors.clear();
    this.#tileWarps.clear();
    this.#draws.clear();
    this.#waiting.clear();
    this.#routedWaiting.clear();
    this.#errors.clear();
    this.#choices.clear();
    this.#heightNormals.clear();
    this.#gpuInstanced.clear();
    this.#released.clear();
    this.#names.clear();
  }

  // ------------------------------------------------------------------ steps

  /** The stamp a draw's fit is requested at: its anchor's, or for an anchored draw the one that also follows scales. A draw its anchor's compiled route serves has the route's, which a slider or a parameter changing does not move. */
  #stampOf(d: DrawWarp, anchor: AnchorWarp): number {
    if (this.#routable(d, anchor)) {
      return ROUTED_STAMP + anchor.routed!.id;
    }
    return effectiveAt(d.kind, d.choice) === "anchor"
      ? anchor.pointStamp
      : anchor.stamp;
  }

  /**
   * Whether the anchor's compiled route draws the draw: a mesh placed per
   * vertex, with no terms of its own, that no exact term serves (terrain's
   * `h·n̂`), and not a patch draw (its dice kernel reads the lattices), a point
   * set or a billboard.
   */
  #routable(d: DrawWarp, anchor: AnchorWarp): boolean {
    if (
      !anchor.routed ||
      d.kind !== "mesh" ||
      effectiveAt(d.kind, d.choice) !== "vertex" ||
      ownTerms(d.user).length > 0
    ) {
      return false;
    }
    const flags =
      this.world.raster.recordsU32[d.index * RECORD_WORDS + FLAGS_WORD]!;
    if (flags & (RecordFlags.patches | RecordFlags.points)) {
      return false;
    }
    const held = this.#heightNormals.get(d.index);
    return !(held && held.generation === d.generation && anchor.height);
  }

  /** The draw's choice (`setWarpAt`) if it is still the draw's. */
  #choiceOf(
    index: number,
    generation: number,
  ): { at: WarpAt; origin: TransformHandle | undefined } {
    const c = this.#choices.get(index);
    return c && c.generation === generation
      ? c
      : { at: "vertex", origin: undefined };
  }

  /** The draw's kind changed what it is fitted as: its cache entry is for the old kind. */
  #rekey(index: number, d: DrawWarp): void {
    this.cache.forget(d.key);
    this.#waiting.delete(index);
    d.key = `${index}:${d.generation}:${effectiveAt(d.kind, d.choice)}`;
    d.requested = -1;
  }

  /** Brings the warped anchors up to date with `routes` and `root`. */
  #sync(root: FrameKey | undefined, routes: ReadonlyArray<Route | undefined>) {
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
        const signature = signatureOf(route);
        if (same(signature, held.signature)) {
          // The same warps, with the same rigid steps before the last, at
          // the same revisions, placed again (as another root's route
          // is): what follows the last warp is not in a fit (it cancels),
          // so the fits stay and nothing is redone; `affine` stays the
          // one they were made with.
          held.route = route;
        } else {
          now = this.#anchorWarp(route, signature);
          this.#anchors.set(slot, now);
        }
      }
      if (now!.scales.length > 0) {
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
  #anchorWarp(route: Route, signature = signatureOf(route)): AnchorWarp {
    const linear = this.#linearScale(route);
    const scaled = route.steps.flatMap((s) =>
      s.kind === "warp" && s.warp.scale ? [warpScaleOf(s.warp)] : [],
    );
    const shape = this.#name(`s${shapeOf(signature)}`);
    const anchor: AnchorWarp = {
      route,
      stamp: 0,
      shape,
      signature,
      affine: affinePart(route),
      linear,
      fitRoute: linear ? withoutScales(route) : withFrozenScales(route),
      scales: scaled,
      pointStamp: 0,
      pointRoute: withFrozenScales(route),
      height: heightScaleOf(route),
      routed: undefined,
    };
    this.#restamp(anchor, true);
    return anchor;
  }

  /** Names `key`, the same each time while it is remembered. */
  #name(key: string): number {
    let name = this.#names.get(key);
    if (name === undefined) {
      if (this.#names.size >= MAX_NAMES) {
        this.#names.clear();
      }
      name = ++this.#clock;
      this.#names.set(key, name);
    }
    return name;
  }

  /**
   * Names the anchor's fits' version and its anchored draws': the shape, the
   * warps' revisions and the scales a fit (or a placing) follows. A state the
   * anchor was in before has its name again, so what was fitted for it is
   * current.
   */
  #restamp(anchor: AnchorWarp, fits: boolean): void {
    const base = `${anchor.shape}:${anchor.signature.revisions.join(",")}`;
    const scales = anchor.scales.join(",");
    if (fits) {
      anchor.stamp = this.#name(
        anchor.linear ? `f${base}` : `f${base}:${scales}`,
      );
    }
    anchor.pointStamp = this.#name(`p${base}:${scales}`);
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

  /**
   * A scale changed: anchored draws are evaluated again (their rotation is
   * not linear in it), and where it is not a weight (`linear`) the fits are
   * redone too, as for a revision.
   */
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
      anchor.pointRoute = withFrozenScales(anchor.route);
      if (!anchor.linear) {
        anchor.fitRoute = withFrozenScales(anchor.route);
      }
      this.#restamp(anchor, !anchor.linear);
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
    const count = raster.recordsU32[o + INSTANCE_COUNT_WORD]!;
    // A point set's cull reads positions a placement doesn't reach, and a
    // pool's instances are written by the GPU: a `PointSource` carries its
    // points through the route in the pass that writes them (its carrier
    // draw, which is a mesh draw to these rules), so neither draw is
    // placed. A point set no source owns is drawn at its anchor's affine
    // place, unwarped, and the engine says so once.
    if (flags & RecordFlags.points) {
      const mesh = raster.drawBatches[index]!.mesh;
      if (!this.#sources.has(mesh.id)) {
        this.#say(
          "points",
          "warp: a point set no PointSource owns is drawn at its anchor's place, unwarped: its cull reads positions the placement doesn't reach.",
        );
      }
      return;
    }
    if (count > 0 && this.#gpuInstanced.get(index) === generation) {
      return;
    }
    const kind: DrawKind =
      count > 0
        ? "instances"
        : flags & RecordFlags.billboard
          ? "billboard"
          : "mesh";
    const own = this.world.scene.drawPlacements[index];
    const choice = this.#choiceOf(index, generation);
    const d: DrawWarp = {
      index,
      generation,
      slot,
      kind,
      key: "",
      choice: choice.at,
      origin: choice.origin,
      held: true,
      userHidden: (flags & RecordFlags.hidden) !== 0,
      user: own ? (own.placement ?? own.terms) : undefined,
      applied: undefined,
      routeTerm: undefined,
      exact: false,
      routed: false,
      instances:
        kind === "instances"
          ? {
              base: this.#captureInstances(index, count),
              next: 0,
              stamp: -1,
              matrix: new Float64Array(16),
            }
          : undefined,
      requested: -1,
      askedStamp: undefined,
      appliedStamp: -1,
      matrix: new Float64Array(16),
      originAt: new Float64Array(3),
    };
    d.key = `${index}:${generation}:${effectiveAt(kind, d.choice)}`;
    this.#draws.set(index, d);
    this.#setHidden(index, true);
    this.#checkReleased(index, d);
  }

  /** A draw found again keeps its fits only if it is where and as it was when they were made. */
  #checkReleased(index: number, d: DrawWarp): void {
    const kept = this.#released.get(index);
    if (!kept) {
      return;
    }
    this.#released.delete(index);
    const handle = this.#handle(index, d);
    const m = drawMatrix(this.world, handle, this.#scratch);
    let as = kept.generation === d.generation && kept.key === d.key && !!m;
    if (as && differs(m!, kept.matrix)) {
      as = false;
    }
    if (as && effectiveAt(d.kind, d.choice) === "anchor") {
      const at = this.#originOf(index, d);
      as = !!at && at.every((v, i) => v === kept.origin[i]);
    }
    if (as) {
      for (const fit of kept.fits) {
        this.cache.restore(d.key, fit);
      }
    }
  }

  /** An instanced draw's matrices as the application wrote them (the instance table's). */
  #captureInstances(index: number, count: number): Float32Array {
    const raster = this.world.raster;
    const first =
      raster.recordsU32[index * RECORD_WORDS + INSTANCE_FIRST_WORD]!;
    const base = new Float32Array(count * 16);
    const m = new Float64Array(16);
    for (let k = 0; k < count; k++) {
      readInstanceMatrix(raster.instances.f32, first + k, m);
      base.set(m, k * 16);
    }
    return base;
  }

  /** Reports `message` once, with the frame's report. */
  #say(key: string, message: string): void {
    if (this.#report && !this.#said.has(key)) {
      this.#said.add(key);
      this.#report(message);
    }
  }

  /** The anchor is no longer warped: its draws go back as they were. */
  #releaseSlot(slot: number): void {
    for (const [index, d] of [...this.#draws]) {
      if (d.slot !== slot) {
        continue;
      }
      this.#unroute(index, d);
      this.#draws.delete(index);
      this.#waiting.delete(index);
      // Its fits are kept for if the anchor is warped again (a re-root back),
      // out of the cache, which holds nothing for an unwarped draw.
      const fits = this.cache.take(d.key);
      if (fits.length > 0 && d.requested >= 0 && !d.instances) {
        this.#released.set(index, {
          generation: d.generation,
          key: d.key,
          matrix: d.matrix.slice(),
          origin: d.originAt.slice(),
          fits,
        });
      }
      const handle = this.#handle(index, d);
      if (this.world.hasDraw(handle)) {
        if (d.instances) {
          this.#restoreInstances(index, d);
        } else {
          setPlacement(this.world, handle, d.user);
        }
        this.#setHidden(index, d.userHidden);
      }
    }
    this.routes.release(slot);
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
        this.#outdated(d);
        continue;
      }
      // An anchored draw moves about another transform's origin.
      if (d.origin && !d.instances) {
        const at = this.#originOf(index, d);
        if (
          at &&
          (at[0] !== d.originAt[0] ||
            at[1] !== d.originAt[1] ||
            at[2] !== d.originAt[2])
        ) {
          this.#outdated(d);
        }
      }
    }
  }

  /**
   * The draw's term was made for a matrix or an origin it no longer has: it is
   * asked for again, and the fit held for the route's stamp is dropped, which
   * the cache would otherwise hand back as current (the stamp is the same).
   */
  #outdated(d: DrawWarp): void {
    d.requested = -1;
    this.cache.forget(d.key);
  }

  /** The origin an anchored draw moves about, in its anchor's coordinates (float64): its origin transform's, or its own. */
  #originOf(index: number, d: DrawWarp): Float64Array | undefined {
    const m = d.origin
      ? this.world.transformAlive(d.origin)
        ? this.world.worldMatrix(d.origin, new Float64Array(16))
        : undefined
      : drawMatrix(this.world, this.#handle(index, d), new Float64Array(16));
    return m ? Float64Array.of(m[12]!, m[13]!, m[14]!) : undefined;
  }

  /** The draw leaves a compiled route (it is fitted, or drawn by its exact term): its block and variant go. */
  #unroute(index: number, d: DrawWarp): void {
    if (d.routed || this.routes.has(index)) {
      this.routes.unroute(index);
      this.#routedWaiting.delete(index);
      d.routed = false;
    }
  }

  /**
   * Asks for the draw's term at the anchor's stamp: terrain's exact height
   * term, which needs no fit; the compiled route's draw (no fit: its data is
   * written within the frame's budget); an anchored draw's lattice or a
   * vertex fit, both through the cache, drawn at once if it is ready (or a
   * stale one is); or an instanced draw's pass.
   */
  #request(
    index: number,
    d: DrawWarp,
    anchor: AnchorWarp,
    report: (message: string) => void,
  ): void {
    const handle = this.#handle(index, d);
    const at = effectiveAt(d.kind, d.choice);
    const stamp = this.#stampOf(d, anchor);
    const matrix = drawMatrix(this.world, handle, new Float64Array(16))!;
    d.matrix.set(matrix);
    d.requested = stamp;
    if (d.instances) {
      this.#countAsk(d, stamp, true);
      d.instances.next = 0;
      d.instances.stamp = stamp;
      d.instances.matrix.set(matrix);
      this.#instancePasses.add(index);
      return;
    }
    const record = this.world.raster;
    const o = index * RECORD_WORDS;
    const own = this.world.scene.drawPlacements[index];
    // A routed draw's record holds its drawn sphere: its own is the route's.
    const routedBase = this.routes.base(index);
    const center = routedBase
      ? [...routedBase.center]
      : own
        ? [...own.center]
        : [0, 1, 2].map((i) => record.recordsF32[o + CENTER_WORD + i]!);
    const radius =
      routedBase?.radius ?? own?.base ?? record.recordsF32[o + RADIUS_WORD]!;
    const exact =
      at === "vertex" ? this.#exactTerm(index, d, anchor, matrix) : undefined;
    if (exact) {
      this.#unroute(index, d);
      this.cache.forget(d.key);
      this.#waiting.delete(index);
      this.#adoptTerm(index, d, exact, undefined, stamp, report);
      return;
    }
    if (anchor.routed && this.#routable(d, anchor)) {
      // The compiled route draws it: no fit. Held until its block is written and its pipelines are made.
      this.cache.forget(d.key);
      this.#waiting.delete(index);
      this.routes.request(
        index,
        d.generation,
        anchor.routed,
        matrix,
        center,
        radius,
      );
      this.#routedWaiting.add(index);
      return;
    }
    this.#unroute(index, d);
    const geometricError = this.#errors.get(index) ?? 0;
    const tolerance = Math.max(
      TOLERANCE_FLOOR,
      geometricError * GEOMETRIC_ERROR_SHARE,
    );
    const operation = describeRoute(anchor.route);
    const { fitRoute, affine, pointRoute } = anchor;
    let produce: FitJob;
    if (at === "anchor") {
      const origin =
        this.#originOf(index, d) ??
        Float64Array.of(matrix[12]!, matrix[13]!, matrix[14]!);
      d.originAt.set(origin);
      produce = () =>
        anchorFit(
          pointRoute,
          affine,
          matrix,
          origin,
          center,
          radius,
          operation,
          report,
        );
    } else {
      produce = () =>
        fitDraw(
          fitRoute,
          affine,
          matrix,
          center,
          radius,
          tolerance,
          operation,
          report,
        );
    }
    const stats = this.#counts;
    const run = produce;
    produce = () => {
      if (at === "anchor") {
        stats.placed++;
      } else {
        stats.fitsRun++;
      }
      return run();
    };
    this.#countAsk(d, stamp, at === "anchor");
    const stale = this.cache.request(
      d.key,
      String(anchor.shape),
      stamp,
      produce,
    );
    const current = this.cache.current(d.key, String(anchor.shape), stamp);
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

  /**
   * Terrain's exact term: the draw's `h·n̂` attribute times the factor's
   * weight, when the route is a height-scale warp on the ellipsoid the
   * attribute was made on and the draw's model is a translation (so the
   * attribute's metres are the model's). Undefined otherwise: the draw is
   * fitted like any.
   */
  #exactTerm(
    index: number,
    d: DrawWarp,
    anchor: AnchorWarp,
    matrix: Float64Array,
  ): WeightedTerm | undefined {
    const height = anchor.height;
    const held = this.#heightNormals.get(index);
    if (!height || !held || held.generation !== d.generation) {
      return undefined;
    }
    const { radii, maxDistance } = held.info;
    if (
      !sameRadii(radii, height.radii) ||
      (height.baseHeight ?? 0) !== 0 ||
      !isTranslation(matrix)
    ) {
      return undefined;
    }
    const mesh = this.world.raster.drawBatches[index]!.mesh;
    const components = this.world.scene.meshRanges
      .get(mesh.id)
      ?.named?.get(HEIGHT_NORMAL_ATTRIBUTE);
    if (components === undefined || components < 3) {
      return undefined;
    }
    // (factor − 1) times the scale in force: a world's parameter is read by
    // the GPU as a weight; any other scale is a constant, redone when it
    // changes.
    const k = height.factor - 1;
    let weight: TermWeight;
    if (anchor.linear) {
      weight = {
        scale: k,
        factors: [{ parameter: anchor.linear, offset: 0, slope: 1 }],
      };
    } else {
      const s = anchor.scales.length > 0 ? anchor.scales[0]! : 1;
      weight = constantWeight(k * s);
    }
    return {
      term: {
        kind: "attribute",
        semantic: HEIGHT_NORMAL_ATTRIBUTE,
        absolute: false,
        maxDistance,
      },
      weight,
    };
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
      const weight: TermWeight =
        anchor.linear && effectiveAt(d.kind, d.choice) === "vertex"
          ? {
              scale: 1,
              factors: [{ parameter: anchor.linear, offset: 0, slope: 1 }],
            }
          : constantWeight(1);
      this.#adoptTerm(
        index,
        d,
        { term: lattice, weight },
        lattice,
        stamp,
        report,
      );
      return;
    }
    d.appliedStamp = stamp;
    this.#show(index, d);
  }

  /** Draws `term` as the draw's route term. */
  #adoptTerm(
    index: number,
    d: DrawWarp,
    term: WeightedTerm,
    lattice: CubicLattice | undefined,
    stamp: number,
    report: (message: string) => void,
  ): void {
    d.applied = lattice;
    d.exact = lattice === undefined;
    d.routeTerm = term;
    this.fitVersion++;
    try {
      this.#compose(index, d);
    } catch (error) {
      report(
        `warp: a draw's fit could not be drawn: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    d.appliedStamp = stamp;
    this.#show(index, d);
  }

  /** Shows the draw if its first term has landed. */
  #show(index: number, d: DrawWarp): void {
    if (d.held) {
      d.held = false;
      this.#setHidden(index, d.userHidden);
    }
  }

  /** Sets the draw's terms: its own, then its route's. A billboard takes its route's lattice alone, at its anchor. */
  #compose(index: number, d: DrawWarp): void {
    const own = d.kind === "billboard" ? [] : ownTerms(d.user);
    const terms: WarpTerms = [...own, d.routeTerm!];
    setPlacement(this.world, this.#handle(index, d), terms, {
      anchored: d.kind === "billboard",
    });
  }

  /**
   * Moves the instances of draws with a pass under way, within `budgetMs`
   * (one chunk of one draw at least, so a pass always goes on); true while
   * any remain. A pass that has moved every instance shows its draw.
   */
  #runInstances(budgetMs: number): boolean {
    if (this.#instancePasses.size === 0) {
      return false;
    }
    const deadline = performance.now() + budgetMs;
    let first = true;
    for (const index of [...this.#instancePasses]) {
      const d = this.#draws.get(index);
      const anchor = d && this.#anchors.get(d.slot);
      const state = d?.instances;
      if (!d || !anchor || !state) {
        this.#instancePasses.delete(index);
        continue;
      }
      const count = state.base.length / 16;
      while (state.next < count && (first || performance.now() < deadline)) {
        const to = Math.min(count, state.next + INSTANCE_CHUNK);
        this.#moveInstances(index, d, anchor, state.next, to);
        state.next = to;
        first = false;
      }
      if (state.next >= count) {
        this.#instancePasses.delete(index);
        d.appliedStamp = state.stamp;
        this.fitVersion++;
        this.#show(index, d);
      }
    }
    return this.#instancePasses.size > 0;
  }

  /**
   * Instances `from` to `to` of the draw drawn at the route's image of their
   * origins (`correctedInstance`): their own matrices, the application's,
   * are in `base`, and the instance table gets the moved ones.
   */
  #moveInstances(
    index: number,
    d: DrawWarp,
    anchor: AnchorWarp,
    from: number,
    to: number,
  ): void {
    const state = d.instances!;
    const raster = this.world.raster;
    const { f32, u32 } = raster.instances;
    const first =
      raster.recordsU32[index * RECORD_WORDS + INSTANCE_FIRST_WORD]!;
    const wd = state.matrix;
    const l = linearPart(wd);
    const lInverse = invert3(l);
    if (!lInverse) {
      return;
    }
    const corrector = anchorCorrector(anchor.pointRoute, anchor.affine);
    const base = new Float64Array(16);
    const out = new Float64Array(16);
    const f = new Float64Array(3);
    for (let k = from; k < to; k++) {
      for (let j = 0; j < 16; j++) {
        base[j] = state.base[k * 16 + j]!;
      }
      // The instance's origin in the anchor's coordinates: the draw's matrix times its own.
      f[0] =
        wd[0]! * base[12]! + wd[4]! * base[13]! + wd[8]! * base[14]! + wd[12]!;
      f[1] =
        wd[1]! * base[12]! + wd[5]! * base[13]! + wd[9]! * base[14]! + wd[13]!;
      f[2] =
        wd[2]! * base[12]! + wd[6]! * base[13]! + wd[10]! * base[14]! + wd[14]!;
      const correction = corrector(f);
      const m = correction
        ? correctedInstance(base, l, lInverse, correction, out)
        : base;
      const slot = first + k;
      const w = slot * INSTANCE_WORDS;
      writeInstance(
        f32,
        u32,
        slot,
        m,
        0,
        u32[w + 12]!,
        u32[w + 13]!,
        u32[w + 14]!,
        u32[w + 15]!,
      );
      raster.instances.mark(slot);
    }
    this.world.version++;
    this.world.changedViews |=
      raster.recordsU32[index * RECORD_WORDS + VIEW_MASK_WORD]!;
  }

  /** An instanced draw's instances go back to the application's matrices. */
  #restoreInstances(index: number, d: DrawWarp): void {
    const state = d.instances!;
    const raster = this.world.raster;
    const { f32, u32 } = raster.instances;
    const first =
      raster.recordsU32[index * RECORD_WORDS + INSTANCE_FIRST_WORD]!;
    const count = state.base.length / 16;
    const m = new Float64Array(16);
    for (let k = 0; k < count; k++) {
      m.set(state.base.subarray(k * 16, k * 16 + 16));
      const slot = first + k;
      const w = slot * INSTANCE_WORDS;
      writeInstance(
        f32,
        u32,
        slot,
        m,
        0,
        u32[w + 12]!,
        u32[w + 13]!,
        u32[w + 14]!,
        u32[w + 15]!,
      );
      raster.instances.mark(slot);
    }
    this.#instancePasses.delete(index);
    this.world.version++;
    this.world.changedViews |=
      raster.recordsU32[index * RECORD_WORDS + VIEW_MASK_WORD]!;
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

/** What a fit depends on in a route: its warps (at their revisions) and the rigid steps before the last of them. */
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
    revisions: [],
  };
  route.steps.forEach((s, i) => {
    if (s.kind === "warp") {
      signature.warps.push(s.warp);
      signature.inverse.push(s.inverse);
      signature.revisions.push(s.warp.revision);
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
      (w, i) =>
        w === b.warps[i] &&
        a.inverse[i] === b.inverse[i] &&
        a.revisions[i] === b.revisions[i],
    ) &&
    a.prefix.length === b.prefix.length &&
    a.prefix.every((v, i) => v === b.prefix[i])
  );
}

const warpIds = new WeakMap<Warp, number>();
let warpIdCount = 0;

/** The signature without its revisions, as a string: two routes with it have displacements of one kind, refitted when a revision moves. */
function shapeOf(signature: AnchorWarp["signature"]): string {
  const warps = signature.warps.map((w, i) => {
    let id = warpIds.get(w);
    if (id === undefined) {
      id = ++warpIdCount;
      warpIds.set(w, id);
    }
    return `${id}${signature.inverse[i] ? "i" : "f"}`;
  });
  return `${warps.join(",")}|${signature.prefix.join(",")}`;
}

function differs(a: Float64Array, b: Float64Array): boolean {
  for (let i = 0; i < 16; i++) {
    if (a[i] !== b[i]) {
      return true;
    }
  }
  return false;
}

/** How a draw is warped: a mesh as it chose, a billboard or instances at their anchors. */
function effectiveAt(kind: DrawKind, choice: WarpAt): WarpAt {
  return kind === "mesh" ? choice : "anchor";
}

/** The route is one forward height-scale warp, and only rigid steps follow it. */
function heightScaleOf(route: Route): HeightScale | undefined {
  const [first, ...rest] = route.steps;
  if (
    !first ||
    first.kind !== "warp" ||
    first.inverse ||
    first.warp.heightScale === undefined
  ) {
    return undefined;
  }
  return rest.every((s) => s.kind === "rigid")
    ? first.warp.heightScale
    : undefined;
}

/** Whether two ellipsoids' radii agree to a millimetre. */
function sameRadii(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): boolean {
  return a.every((r, i) => Math.abs(r - b[i]!) <= 1e-3);
}

/** Whether a column-major 4×4's linear part is the identity (a pure translation). */
function isTranslation(m: Float64Array): boolean {
  const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const linear = [
    m[0]!,
    m[1]!,
    m[2]!,
    m[4]!,
    m[5]!,
    m[6]!,
    m[8]!,
    m[9]!,
    m[10]!,
  ];
  return linear.every((v, i) => Math.abs(v - identity[i]!) <= 1e-12);
}

/**
 * The lattice of one anchored draw (`anchorLattice`): the route's image of
 * `origin` and its rotation there, as the displacement of the draw's model
 * coordinates over its bounding sphere. Exact, so it is made at once.
 */
function anchorFit(
  route: Route,
  anchorAffine: Float64Array,
  matrix: Float64Array,
  origin: Float64Array,
  center: number[],
  radius: number,
  operation: string,
  report: (message: string) => void,
): CubicLattice {
  const scale = Math.max(radius, 1e-3);
  const correction = anchorCorrector(route, anchorAffine)(origin);
  const lattice = correction
    ? anchorLattice(correction, matrix, origin, { center, scale }, operation)
    : undefined;
  if (lattice) {
    return lattice;
  }
  report(
    `warp: ${operation} is not finite or not invertible at an anchored draw's origin; the draw is drawn unwarped`,
  );
  return {
    kind: "cubic",
    center,
    scale,
    cells: 1,
    coefficients: new Float64Array(60),
    errorBound: Number.MAX_VALUE,
    estimate: true,
    operation: `anchor failed: ${operation}`,
  };
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
function* fitDraw(
  route: Route,
  anchorAffine: Float64Array,
  matrix: Float64Array,
  center: number[],
  radius: number,
  tolerance: number,
  operation: string,
  report: (message: string) => void,
): FitSteps {
  const scale = Math.max(radius, 1e-3);
  try {
    const metres = Math.hypot(matrix[0]!, matrix[1]!, matrix[2]!) || 1;
    const affine = multiply(mat4(), anchorAffine, matrix);
    const fit = yield* fitLatticeSteps(
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
