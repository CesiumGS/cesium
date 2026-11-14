// The body as an occluder (`streaming/occluders.ts`). Horizon culling's
// ellipsoid is the body's shape as 1.x knows it; under a warp the drawn Earth
// is another shape, so this occluder takes its shape from the drawn terrain.
//
// Premise. The globe's drawn terrain (with the bare ellipsoid under it, which
// counts as part of it) is a closed, opaque surface around the body's centre.
// If the camera is outside it, whatever lies inside it is hidden. Scaled space
// is the one where the body's ellipsoid is the unit sphere (x ⊘ radii, as
// 1.x's EllipsoidalOccluder): the ellipsoid of scale s is the sphere of radius
// s there. If every point of the drawn terrain that the camera could see has a
// scaled norm of at least s, the surface encloses the ellipsoid of scale s,
// which is an occluder for the camera by the usual horizon test, with the
// radii times s.
//
// The scale s is a lower bound of the terrain's scaled norm over the cap
// the camera can see of it:
//   a. s_global: the lower bound over a cover of the whole tile tree;
//   b. the cap: the points within the angle the s_global ellipsoid's horizon
//      makes at the camera. The ellipsoid of scale s ≥ s_global shows no
//      more than that, so the cap holds everything the camera sees of the
//      surface (padded for the radii's difference from a sphere's);
//   c. s: the lower bound over the tiles meeting that cap. One pass only.
//
// Per-tile lower bounds are a min-hierarchy: a tile's bound is the smallest
// of its four children's when it has them (a child with no data of its own is
// drawn from its parent, whose bound then counts), else its own. A tile's own
// bound is exact once its heights are resident (its vertices, and the bottoms
// of its skirts, through the warp's map, less the most a triangle's chord dips
// under the surface it connects), otherwise that of its drawn volume (the box
// or sphere the warp carries its volume to, nearest point to the centre).
// Exact bounds are made within a time budget a pass; a tile without one keeps
// its volume's bound until the next.
//
// It is on only while the premise holds: the globe is shown with no regions
// (cuts, translucent ground), the warp can map points, and the camera is
// outside the surface (its scaled norm exceeds s). Otherwise `hidden` is false.
import { Ellipsoid } from "../math/ellipsoid.ts";
import {
  horizonCullingPointOn,
  isScaledSpacePointVisibleOn,
} from "../math/horizon.ts";
import type { Vec3 } from "../math/vec3.ts";
import type { BodyShape, Occluder } from "../streaming/occluders.ts";
import type { SelectionView } from "../streaming/Stepwise.ts";
import type { Tile } from "../streaming/Tile.ts";
import { drawnTile, type TileWarp } from "../streaming/tileWarp.ts";
import type { TileVolume } from "../streaming/volumes.ts";
import { flatTerrainHeights, type TerrainHeights } from "./quantizedMesh.ts";
import { ELLIPSOID_LEVEL_ZERO_ERROR } from "./TerrainSource.ts";
import { COVER_LEVEL } from "./baseLevels.ts";
import { soundError } from "./terrainRefit.ts";

const ellipsoid = Ellipsoid.WGS84;
const RADII = ellipsoid.radii;
const R_MIN = Math.min(...RADII);

/** Time for exact bounds in a pass, ms. */
/** Main-thread time a call may spend on a view's bound, ms. */
const BUDGET_MS = 1;
/** Vertices a bound reads between looks at the clock. */
const CHUNK = 256;
/** A triangle's chord dips by up to this times the standard sagitta under the drawn (stretched) surface: margin for the warp's stretch along the surface. */
const CHORD_MARGIN = 1.1;
/** The camera's cell for a kept cap, rad. */
const CELL = 0.02;
/** The ellipsoid's flat tiles stand for their subtrees from this level (finer ones only raise a bound). */
const FLAT_LEVELS = 6;

interface Options {
  readonly root: Tile;
  /** The globe is the ellipsoid's flat tiles, with no heights of its own. */
  readonly flat: boolean;
  /** Whether the premise holds for the globe itself now (shown, no regions). */
  enabled(): boolean;
  /** Occluders sharing the anchor that bound the same surface (the ellipsoid under terrain). */
  partners?(): readonly BodyOccluder[];
  /** Time for a call's walks and exact bounds, ms (default 1). */
  readonly budgetMs?: number;
  /** Counts the tiles unloaded: a bound made before one may be too high. Absent: nothing is reused across calls. */
  unloads?(): number;
  /** Changes whenever tiles load, unload or appear (what a kept bound was made from). Absent: nothing is kept between calls. */
  signature?(): number;
}

interface Exact {
  readonly key: string;
  readonly heights: TerrainHeights;
  /** With the skirts' bottoms: what the tile drawn by itself reaches. */
  readonly value: number;
  /** Its surface without them: what finer tiles under it are held to. */
  readonly tops: number;
}

interface ViewState {
  /** The scale in force, from a finished or first-yielded job. */
  current?: { place: string; signature: number; scale: number };
  job?: BoundJob;
}

/**
 * The bound as a resumable job. `step(budgetMs)` runs it for at most about
 * that long and returns the best scale so far: `s` (set when a result is
 * ready, a sound lower bound the moment it is, never to be retracted while
 * the job isn't cancelled) and whether the walk is `done`. The first result
 * is the global bound (coarse), the last the cap's. `cancel()` abandons it
 * (a warp, camera-cell or unload change): its results are void. `place`
 * names what it was made for; `signature` the tiles it started from.
 */
export class BoundJob {
  private readonly steps: Generator<void, void>;
  private cancelled = false;
  private result: number | undefined;
  private fresh = false;
  private deadline = 0;
  constructor(
    owner: BodyOccluder,
    warp: TileWarp,
    readonly place: string,
    readonly signature: number,
    centre: Vec3,
    top: number,
  ) {
    this.steps = owner.walk(
      warp,
      centre,
      top,
      (s) => {
        this.result = s;
        this.fresh = true;
      },
      () => performance.now() >= this.deadline,
    );
  }

  step(budgetMs: number): { s?: number; done: boolean } {
    if (this.cancelled) {
      return { done: true };
    }
    this.deadline = performance.now() + budgetMs;
    this.fresh = false;
    const next = this.steps.next();
    const done = next.done === true;
    return this.fresh && this.result !== undefined
      ? { s: this.result, done }
      : { done };
  }

  cancel(): void {
    this.cancelled = true;
    this.steps.return();
  }
}

interface Prepared {
  /** The scale this occluder's own surface supports; undefined: none. */
  own: number | undefined;
}

let flatHeights: TerrainHeights | undefined;

export class BodyOccluder implements Occluder {
  private readonly bounds = new WeakMap<Tile, Exact>();
  private readonly prepared = new Map<number, Prepared>();
  private readonly states = new Map<number, ViewState>();
  private keyNow = "";

  constructor(private readonly options: Options) {}

  prepare(view: SelectionView): void {
    this.prepared.set(view.id, { own: this.compute(view) });
  }

  hidden(bound: TileVolume, view: SelectionView): boolean {
    const scale = this.scaleFor(view);
    if (scale === undefined) {
      return false;
    }
    const radii = [RADII[0]! * scale, RADII[1]! * scale, RADII[2]! * scale];
    const point = occludeePoint(bound, radii);
    return (
      point !== undefined &&
      !isScaledSpacePointVisibleOn(radii, view.position, point)
    );
  }

  /** The scale of the ellipsoid that hides what is inside it from `view`'s camera: the smallest of this surface's and its partners'; undefined where none is proven. */
  scaleFor(view: SelectionView): number | undefined {
    let scale = this.prepared.get(view.id)?.own;
    for (const partner of this.options.partners?.() ?? []) {
      if (partner === this) {
        continue;
      }
      const other = partner.ownFor(view);
      if (other === undefined) {
        return undefined;
      }
      scale = scale === undefined ? undefined : Math.min(scale, other);
    }
    return scale;
  }

  /** The occluder's shape for `view`, for a depth pyramid to rasterize: the body's ellipsoid scaled by `s`. */
  shape(view: SelectionView): BodyShape | undefined {
    const s = this.scaleFor(view);
    return s === undefined
      ? undefined
      : {
          centre: [0, 0, 0] as unknown as Vec3,
          radii: [
            RADII[0]! * s,
            RADII[1]! * s,
            RADII[2]! * s,
          ] as unknown as Vec3,
        };
  }

  /** This surface's scale for `view` (not its partners'), as `prepare` made it. */
  ownFor(view: SelectionView): number | undefined {
    const p = this.prepared.get(view.id);
    return p ? p.own : this.compute(view);
  }

  /**
   * The scheduling adapter: drives a view's `BoundJob` for `BUDGET_MS` a
   * call, and answers with the best sound scale so far. A job belongs to
   * one warp, one camera cell and the unloads so far; any change of those
   * cancels it, and the scale is off until its first result. Loading only
   * raises a bound, so a scale already made stays sound as tiles load, and
   * a new job (for the tiles now loaded) replaces it only when it ends.
   */
  private compute(view: SelectionView): number | undefined {
    const warp = view.warp;
    if (!warp?.images || !this.options.enabled()) {
      return undefined;
    }
    const key = `${warp.version}:${warp.scaleVersion ?? 0}`;
    this.keyNow = key;
    const signature = this.options.signature?.() ?? NaN;
    const unloads = this.options.unloads?.() ?? NaN;
    const camera = view.position;
    const c = scaledNorm(camera);
    const direction = unit(camera);
    const lon = Math.round(Math.atan2(direction[1]!, direction[0]!) / CELL);
    const lat = Math.round(Math.asin(direction[2]!) / CELL);
    const top = Math.ceil(c * 1e4) / 1e4;
    const place = `${lon},${lat},${top}|${key}|${unloads}`;
    let state = this.states.get(view.id);
    if (!state) {
      state = {};
      this.states.set(view.id, state);
    }
    if (state.current && state.current.place !== place) {
      state.current = undefined;
    }
    if (state.job && state.job.place !== place) {
      state.job.cancel();
      state.job = undefined;
    }
    if (
      !state.job &&
      (!state.current || state.current.signature !== signature)
    ) {
      const centre = [
        Math.cos(lat * CELL) * Math.cos(lon * CELL),
        Math.cos(lat * CELL) * Math.sin(lon * CELL),
        Math.sin(lat * CELL),
      ] as unknown as Vec3;
      state.job = new BoundJob(this, warp, place, signature, centre, top);
    }
    if (state.job) {
      const result = state.job.step(this.options.budgetMs ?? BUDGET_MS);
      if (result.s !== undefined) {
        // Each result is a sound bound of its own, so the largest is.
        state.current = {
          place,
          signature: state.job.signature,
          scale: Math.max(result.s, state.current?.scale ?? 0),
        };
      }
      if (result.done) {
        state.job = undefined;
      }
    }
    const scale = state.current?.scale;
    return scale !== undefined && c > scale && scale > 0 ? scale : undefined;
  }

  /**
   * The resumable walk (`BoundJob`): first the global bound over the base
   * levels (yielded at once: a coarse but sound scale), then the cap's
   * bound. `yield` hands control back at a node when the budget is spent.
   */
  *walk(
    warp: TileWarp,
    centre: Vec3,
    top: number,
    publish: (s: number) => void,
    expired: () => boolean,
  ): Generator<void, void> {
    this.keyNow = `${warp.version}:${warp.scaleVersion ?? 0}`;
    const root = this.options.root;
    const global = yield* this.cover(root, warp, expired);
    publish(global);
    const angle = Math.min(
      Math.PI,
      Math.acos(Math.min(1, global / top)) * 1.02 + 1e-4 + CELL * 1.5,
    );
    const cap = { direction: centre, cos: Math.cos(angle) };
    // Refine what binds: walk over what is already known (cheap), publish
    // the smallest bound, then make the exact bound of the tile that sets it
    // (or of its nearest loaded ancestor that has none yet) and walk again.
    // Each walk's result is at least the last's, since an exact bound is
    // never below the one derived from a tile above; it ends where nothing
    // that sets the bound can be made more exact.
    for (;;) {
      const found = yield* this.peekBound(root, warp, cap, expired);
      publish(found.value);
      const target = this.unmade(found.tile, warp);
      if (!target) {
        return;
      }
      yield* this.resident(target, warp, expired);
      if (expired()) {
        yield;
      }
    }
  }

  /** The nearest tile at or above `tile` with resident heights and no bound made yet. */
  private unmade(tile: Tile | undefined, warp: TileWarp): Tile | undefined {
    for (let t = tile; t?.globe; t = t.parent) {
      const source = t.globe.upsampledFrom ?? t;
      if (
        (source.globe?.heights ?? (this.options.flat ? true : undefined)) &&
        this.cached(t) === undefined
      ) {
        return t;
      }
    }
    return undefined;
  }

  /** A bound made already for `tile`, if still good. */
  private cached(tile: Tile): Exact | undefined {
    const source = tile.globe?.upsampledFrom ?? tile;
    const heights =
      source.globe?.heights ??
      (this.options.flat ? (flatHeights ??= flatTerrainHeights()) : undefined);
    const kept = this.bounds.get(tile);
    return kept && kept.key === this.keyNow && kept.heights === heights
      ? kept
      : undefined;
  }

  /** `bound` over what is made already: the smallest, and the tile whose own bound it is. */
  private *peekBound(
    tile: Tile,
    warp: TileWarp,
    cap: { direction: Vec3; cos: number },
    expired: () => boolean,
  ): Generator<void, { value: number; tile: Tile | undefined }> {
    if (expired()) {
      yield;
    }
    if (!meetsCap(tile, cap)) {
      return { value: Infinity, tile: undefined };
    }
    if (
      tile.globe &&
      (this.options.flat
        ? tile.globe.level >= FLAT_LEVELS
        : tile.residentBelow === 0 &&
          !tile.globe.heights &&
          !tile.globe.upsampledFrom)
    ) {
      return { value: this.peekOwn(tile, warp), tile };
    }
    const kids = tile.children;
    if (kids.length > 0 && (kids.length === 4 || tile.globe === undefined)) {
      let best: { value: number; tile: Tile | undefined } = {
        value: Infinity,
        tile: undefined,
      };
      let fills = false;
      for (const kid of kids) {
        if (kid.fillFromParent) {
          fills = true;
        } else {
          const r = yield* this.peekBound(kid, warp, cap, expired);
          if (r.value < best.value) {
            best = r;
          }
        }
      }
      if (fills) {
        const own = this.peekOwn(tile, warp);
        if (own < best.value) {
          best = { value: own, tile };
        }
      }
      return best;
    }
    return { value: this.peekOwn(tile, warp), tile };
  }

  /** `own` from the bounds made already: the tile's own, else the nearest ancestor's less its error (0 with none). */
  private peekOwn(tile: Tile, warp: TileWarp): number {
    const mine = this.cached(tile);
    if (mine) {
      return mine.value;
    }
    for (let a = tile.parent; a?.globe; a = a.parent) {
      const base = this.cached(a);
      if (base) {
        return this.derived(
          a,
          base.tops,
          tile.globe?.level ?? a.globe.level + 1,
          warp,
        );
      }
    }
    return 0;
  }

  /**
   * A lower bound of everything the globe can draw, from the base levels
   * alone: each tile at the cover level (or shallower with no children) by
   * what it draws itself and what any tile under it is held to. Coarse, so
   * the cap it makes is large, which only makes the cap sound. Its tiles'
   * skirts are left out (a coarse tile's, stretched by the warp, are
   * thousands of km deep and would void it): the cap's walk, over the tiles
   * the camera can see, counts them.
   */
  private *cover(
    tile: Tile,
    warp: TileWarp,
    expired: () => boolean,
  ): Generator<void, number> {
    if (expired()) {
      yield;
    }
    const level = tile.globe?.level ?? -1;
    const kids = tile.children;
    if (tile.globe && (level >= COVER_LEVEL || kids.length === 0)) {
      return Math.min(
        yield* this.own(tile, warp, expired, false),
        yield* this.below(tile, warp, expired),
      );
    }
    if (kids.length > 0 && (kids.length === 4 || tile.globe === undefined)) {
      let lowest = Infinity;
      for (const kid of kids) {
        lowest = Math.min(
          lowest,
          kid.fillFromParent
            ? yield* this.own(tile, warp, expired, false)
            : yield* this.cover(kid, warp, expired),
        );
      }
      return lowest;
    }
    return Math.min(
      yield* this.own(tile, warp, expired, false),
      yield* this.below(tile, warp, expired),
    );
  }

  /** What every tile strictly under `tile` is held to: its own mesh's tops less the error and a finer skirt (or what its nearest loaded ancestor gives). */
  private *below(
    tile: Tile,
    warp: TileWarp,
    expired: () => boolean,
  ): Generator<void, number> {
    const here = yield* this.resident(tile, warp, expired);
    return here && tile.globe
      ? this.derived(tile, here.tops, tile.globe.level + 1, warp)
      : yield* this.own(tile, warp, expired);
  }

  /** The bound under ancestor `a` (tops `tops`) for a tile of `level`: the error and that level's skirt, stretched along the normal. */
  private derived(
    a: Tile,
    tops: number,
    level: number,
    warp: TileWarp,
  ): number {
    const drawn = drawnTile(a, warp);
    const stretch = Math.max(1, drawn.slopeMax ?? drawn.sigmaMax);
    const error = soundError(a.globe!.refit);
    const skirt =
      (5 * ELLIPSOID_LEVEL_ZERO_ERROR) / 2 ** Math.max(0, level - 1);
    return Math.max(0, tops - ((error + skirt) * stretch) / R_MIN);
  }

  /**
   * A tile's own bound. Its own mesh's exact bound where its heights are
   * resident (and the time allows). Otherwise the nearest loaded ancestor's
   * exact bound less the most the full-resolution surface can dip below that
   * ancestor's mesh: its geometric error (a bound on the deviation, the
   * refit's where measured), stretched along the normal by the warp there.
   * Nothing loaded above: 0, which culls nothing.
   */
  private *own(
    tile: Tile,
    warp: TileWarp,
    expired: () => boolean,
    withSkirts = true,
  ): Generator<void, number> {
    const mine = yield* this.resident(tile, warp, expired);
    if (mine !== undefined) {
      return withSkirts ? mine.value : mine.tops;
    }
    for (let a = tile.parent; a?.globe; a = a.parent) {
      const base = yield* this.resident(a, warp, expired);
      if (base !== undefined) {
        return this.derived(
          a,
          base.tops,
          tile.globe?.level ?? a.globe.level + 1,
          warp,
        );
      }
    }
    return 0;
  }

  /** The exact bound of a tile's own mesh, cached; undefined without resident heights . */
  private *resident(
    tile: Tile,
    warp: TileWarp,
    expired: () => boolean,
  ): Generator<void, Exact | undefined> {
    const source = tile.globe?.upsampledFrom ?? tile;
    const heights =
      source.globe?.heights ??
      (this.options.flat ? (flatHeights ??= flatTerrainHeights()) : undefined);
    if (!heights || !source.globe) {
      return undefined;
    }
    const kept = this.bounds.get(tile);
    if (kept && kept.key === this.keyNow && kept.heights === heights) {
      return kept;
    }
    const value = yield* exactBound(source, heights, warp, expired);
    if (value === undefined) {
      return undefined;
    }
    const made = {
      key: this.keyNow,
      heights,
      value: value.all,
      tops: value.tops,
    };
    this.bounds.set(tile, made);
    return made;
  }
}

function scaledNorm(p: ArrayLike<number>): number {
  return Math.hypot(p[0]! / RADII[0]!, p[1]! / RADII[1]!, p[2]! / RADII[2]!);
}

function unit(p: ArrayLike<number>): Vec3 {
  const n = Math.hypot(p[0]!, p[1]!, p[2]!) || 1;
  return [p[0]! / n, p[1]! / n, p[2]! / n] as unknown as Vec3;
}

/** Whether the tile's volume can lie within the cap (a direction and the cosine of its angle): its bounding sphere, seen from the centre, padded. */
function meetsCap(tile: Tile, cap: { direction: Vec3; cos: number }): boolean {
  const { center, radius } = tile.volume.sphere;
  const distance = Math.hypot(center[0]!, center[1]!, center[2]!);
  if (!(distance > radius)) {
    return true;
  }
  const along =
    (center[0]! * cap.direction[0]! +
      center[1]! * cap.direction[1]! +
      center[2]! * cap.direction[2]!) /
    distance;
  const angle = Math.acos(Math.min(1, Math.max(-1, along)));
  // The sphere's angular radius from the centre, as seen at its centre's
  // distance: asin(r / d), padded by the flattening's skew.
  const reach = Math.asin(Math.min(1, radius / distance)) * 1.02 + 1e-4;
  return angle - reach <= Math.acos(Math.min(1, Math.max(-1, cap.cos)));
}

/**
 * The bound from a tile's resident vertices: each, and the bottom of the
 * skirt under each edge vertex, through the warp's map, the smallest scaled
 * norm over the scale's span, less what the chord of a triangle dips under
 * its vertices' shell. Undefined where the warp can't map them.
 */
function* exactBound(
  tile: Tile,
  heights: TerrainHeights,
  warp: TileWarp,
  expired: () => boolean,
): Generator<void, { all: number; tops: number } | undefined> {
  const g = tile.globe!;
  const r = g.rectangle;
  const n = heights.u.length;
  const skirt =
    (5 * ELLIPSOID_LEVEL_ZERO_ERROR) / 2 ** Math.max(0, g.level - 1);
  const span = heights.maximumHeight - heights.minimumHeight;
  const carto = { longitude: 0, latitude: 0, height: 0 };
  const out = new Float64Array(3);
  let lowest = Infinity;
  let tops = Infinity;
  // In chunks of vertices, handing control back between them when the
  // call's time is spent.
  for (let from = 0; from < n; from += CHUNK) {
    const to = Math.min(n, from + CHUNK);
    const points = new Float64Array((to - from) * 6);
    const isSkirt = new Uint8Array((to - from) * 2);
    let count = 0;
    for (let i = from; i < to; i++) {
      const u = heights.u[i]!;
      const v = heights.v[i]!;
      carto.longitude = r.west + (u / 32767) * (r.east - r.west);
      carto.latitude = r.south + (v / 32767) * (r.north - r.south);
      carto.height = heights.minimumHeight + (heights.h[i]! / 32767) * span;
      ellipsoid.cartographicToCartesian(carto, out);
      points.set(out, count * 3);
      count++;
      if (u === 0 || u === 32767 || v === 0 || v === 32767) {
        carto.height -= skirt;
        ellipsoid.cartographicToCartesian(carto, out);
        points.set(out, count * 3);
        isSkirt[count] = 1;
        count++;
      }
    }
    const images = warp.images?.(points.subarray(0, count * 3));
    if (!images) {
      return undefined;
    }
    for (let i = 0; i < count; i++) {
      const norm = lowestAlong(images, i);
      lowest = Math.min(lowest, norm);
      if (!isSkirt[i]) {
        tops = Math.min(tops, norm);
      }
    }
    if (expired()) {
      yield;
    }
  }
  if (!Number.isFinite(lowest) || !Number.isFinite(tops)) {
    return undefined;
  }
  // The longest triangle edge, as an angle at the body's centre (an edge
  // runs at most that far along the surface), bounds how far the chord
  // between its ends dips under the shell they lie on: its middle is at
  // least cos(angle / 2) of the ends' radius.
  let edge = 0;
  const t = heights.triangles;
  const width = r.east - r.west;
  const depth = r.north - r.south;
  for (let k = 0; k + 2 < t.length; k += 3) {
    for (let e = 0; e < 3; e++) {
      const a = t[k + e]!;
      const b = t[k + ((e + 1) % 3)]!;
      edge = Math.max(
        edge,
        Math.hypot(
          ((heights.u[a]! - heights.u[b]!) / 32767) * width,
          ((heights.v[a]! - heights.v[b]!) / 32767) * depth,
        ),
      );
    }
    if ((k & 8191) === 0 && k > 0 && expired()) {
      yield;
    }
  }
  // The stretch along the surface and the body's flattening: a margin.
  const half = Math.min(Math.PI, edge * CHORD_MARGIN) / 2;
  const keep = Math.max(0, Math.cos(half));
  return { all: lowest * keep, tops: tops * keep };
}

/** The smallest scaled norm of image `i` over the span of scales: the norm is convex along the line, so its minimum is where the derivative vanishes, clamped. */
function lowestAlong(
  images: { at: Float64Array; delta: Float64Array; span: number },
  i: number,
): number {
  const { at, delta, span } = images;
  const ax = at[i * 3]! / RADII[0]!;
  const ay = at[i * 3 + 1]! / RADII[1]!;
  const az = at[i * 3 + 2]! / RADII[2]!;
  const dx = delta[i * 3]! / RADII[0]!;
  const dy = delta[i * 3 + 1]! / RADII[1]!;
  const dz = delta[i * 3 + 2]! / RADII[2]!;
  const d2 = dx * dx + dy * dy + dz * dz;
  let t = 0;
  if (d2 > 0 && span > 0) {
    t = Math.min(span, Math.max(0, -(ax * dx + ay * dy + az * dz) / d2));
  }
  return Math.hypot(ax + t * dx, ay + t * dy, az + t * dz);
}

/** A tile's horizon-occlusion point for an occluding ellipsoid of `radii`: from its volume's eight corners (a sphere's cube's), undefined where it can't be culled (near the centre, or facing all ways). */
function occludeePoint(
  volume: TileVolume,
  radii: readonly number[],
): Vec3 | undefined {
  const corners: number[] = [];
  let center: ArrayLike<number>;
  if (volume.kind === "sphere") {
    const { center: c, radius: r } = volume.sphere;
    center = c;
    for (let i = 0; i < 8; i++) {
      corners.push(
        c[0]! + (i & 1 ? r : -r),
        c[1]! + (i & 2 ? r : -r),
        c[2]! + (i & 4 ? r : -r),
      );
    }
  } else {
    const { center: c, halfAxes: h } =
      volume.kind === "box" ? volume.obb : volume.region.obb;
    center = c;
    for (let i = 0; i < 8; i++) {
      const sx = i & 1 ? 1 : -1;
      const sy = i & 2 ? 1 : -1;
      const sz = i & 4 ? 1 : -1;
      corners.push(
        c[0]! + sx * h[0]! + sy * h[3]! + sz * h[6]!,
        c[1]! + sx * h[1]! + sy * h[4]! + sz * h[7]!,
        c[2]! + sx * h[2]! + sy * h[5]! + sz * h[8]!,
      );
    }
  }
  if (Math.hypot(center[0]!, center[1]!, center[2]!) < 0.1 * R_MIN) {
    return undefined;
  }
  return horizonCullingPointOn(radii, center, corners);
}
