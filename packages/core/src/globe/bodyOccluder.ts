// The body as an occluder (`streaming/occluders.ts`). Horizon culling's
// ellipsoid is the body's shape as 1.x knows it; under a curvilinear map the drawn Earth
// is another shape, so this occluder takes its shape from the drawn terrain.
//
// Premise. The globe's drawn terrain (with the bare ellipsoid under it, which
// counts as part of it) is a closed, opaque surface around the body's center.
// If the camera is outside it, whatever lies inside it is hidden. Scaled space
// is the one where the body's ellipsoid is the unit sphere (x ⊘ radii, as
// 1.x's EllipsoidalOccluder): the ellipsoid of scale s is the sphere of radius
// s there. If every point of the drawn terrain that the camera could see has a
// scaled norm of at least s, the surface encloses the ellipsoid of scale s,
// which is an occluder for the camera by the usual horizon test, with the
// radii times s.
//
// Which s. The ball of scaled radius R is a sound occluder for a camera at
// scaled distance c > R when the drawn terrain that the camera could see of
// it lies at scaled radius R or more, that is, over the cap of angular
// radius acos(R / c) about the camera's direction (padded for the radii's
// difference from a sphere's and for the camera's cell). As R grows the cap
// shrinks, so the smallest bound over it does not fall: the largest R with
// (smallest bound over cap(R)) >= R is found by bisection, each test a walk
// over the tiles meeting the cap. Every R that passes is sound on its own,
// so each is handed out as soon as it is found.
//
// Skirts are left out of these bounds. The occluder only has to lie inside
// the closed, opaque surface the tops of the tiles make; skirts are extra
// geometry hung below that surface to hide cracks, and they do not change
// whether the surface encloses the ball: a ray that slips through a hairline
// crack at the surface meets the skirt curtains there, far above the ball.
// (Skirts stay in the tiles' cull volumes, as everywhere.)
//
// Per-tile lower bounds are a min-hierarchy: a tile's bound is the smallest
// of its four children's when it has them (a child with no data of its own is
// drawn from its parent, whose bound then counts), else its own. A tile's own
// bound is exact once its heights are resident (its vertices through the
// curvilinear map's map, less the most a triangle's chord dips under the shell its
// vertices lie on). Without resident heights it is the nearest loaded
// ancestor's, less the most a tile below it can dip under its mesh: the
// ancestor's geometric error, stretched along the normal by the curvilinear map there.
// Exact bounds are made where they bind, in chunks within a time budget a
// tick (`BoundJob`).
//
// It is on only while the premise holds: the globe is shown with no regions
// (cuts, translucent ground), the curvilinear map can map points, and the camera is
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
import {
  drawnTile,
  type TileCurvilinearMap,
} from "../streaming/tileCurvilinearMap.ts";
import type { TileVolume } from "../streaming/volumes.ts";
import { flatTerrainHeights, type TerrainHeights } from "./quantizedMesh.ts";
import { soundError } from "./terrainRefit.ts";

const ellipsoid = Ellipsoid.WGS84;
const RADII = ellipsoid.radii;
const R_MIN = Math.min(...RADII);

/** Time for exact bounds in a pass, ms. */
/** Main-thread time a call may spend on a view's bound, ms. */
const BUDGET_MS = 1;
/** How close to the largest sound radius the bisection goes (scaled units, about 600 m). */
const TOLERANCE = 1e-4;
/** Vertices a bound reads between looks at the clock. */
const CHUNK = 256;
/** A triangle's chord dips by up to this times the standard sagitta under the drawn (stretched) surface: margin for the curvilinear map's stretch along the surface. */
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
  /** The smallest scaled norm of the tile's surface (tops, not skirts). */
  readonly value: number;
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
 * the job isn't canceled) and whether the walk is `done`. The results
 * rise: each is the largest radius found sound so far. `cancel()` abandons it
 * (a curvilinear map, camera-cell or unload change): its results are void. `place`
 * names what it was made for; `signature` the tiles it started from.
 */
export class BoundJob {
  private readonly steps: Generator<void, void>;
  private canceled = false;
  private result: number | undefined;
  private fresh = false;
  private deadline = 0;
  constructor(
    owner: BodyOccluder,
    curvilinearMap: TileCurvilinearMap,
    readonly place: string,
    readonly signature: number,
    center: Vec3,
    top: number,
    start: number,
  ) {
    this.steps = owner.walk(
      curvilinearMap,
      center,
      top,
      start,
      (s) => {
        this.result = s;
        this.fresh = true;
      },
      () => performance.now() >= this.deadline,
    );
  }

  step(budgetMs: number): { s?: number; done: boolean } {
    if (this.canceled) {
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
    this.canceled = true;
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
          center: [0, 0, 0] as unknown as Vec3,
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
   * one curvilinear map, one camera cell and the unloads so far; any change of those
   * cancels it, and the scale is off until its first result. Loading only
   * raises a bound, so a scale already made stays sound as tiles load, and
   * a new job (for the tiles now loaded) replaces it only when it ends.
   */
  private compute(view: SelectionView): number | undefined {
    const curvilinearMap = view.curvilinearMap;
    if (!curvilinearMap?.images || !this.options.enabled()) {
      return undefined;
    }
    const key = `${curvilinearMap.version}:${curvilinearMap.scaleVersion ?? 0}`;
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
      const center = [
        Math.cos(lat * CELL) * Math.cos(lon * CELL),
        Math.cos(lat * CELL) * Math.sin(lon * CELL),
        Math.sin(lat * CELL),
      ] as unknown as Vec3;
      state.job = new BoundJob(
        this,
        curvilinearMap,
        place,
        signature,
        center,
        top,
        state.current?.place === place ? state.current.scale : 0,
      );
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
   * The resumable walk (`BoundJob`): bisection for the largest sound radius
   * in [`start`, `top`] (`start`, from an earlier job for this cell, is
   * tested first). `yield` hands control back at a node when the budget is
   * spent.
   */
  *walk(
    curvilinearMap: TileCurvilinearMap,
    center: Vec3,
    top: number,
    start: number,
    publish: (s: number) => void,
    expired: () => boolean,
  ): Generator<void, void> {
    this.keyNow = `${curvilinearMap.version}:${curvilinearMap.scaleVersion ?? 0}`;
    let low = 0;
    let high = top;
    if (
      start > 0 &&
      (yield* this.sound(start, curvilinearMap, center, top, expired))
    ) {
      low = start;
      publish(start);
    }
    while (high - low > TOLERANCE) {
      const mid = (low + high) / 2;
      if (yield* this.sound(mid, curvilinearMap, center, top, expired)) {
        low = mid;
        publish(mid);
      } else {
        high = mid;
      }
    }
  }

  /**
   * Whether the ball of scaled radius `radius` is sound: the smallest bound
   * over the cap it leaves the camera is at least `radius`. Walks over what is
   * made already and, while that falls short, makes the exact bound of the
   * tile that sets it (or of its nearest loaded ancestor that has none yet),
   * until it passes or nothing that sets it can be made more exact.
   */
  private *sound(
    radius: number,
    curvilinearMap: TileCurvilinearMap,
    center: Vec3,
    top: number,
    expired: () => boolean,
  ): Generator<void, boolean> {
    if (!(radius < top)) {
      return false;
    }
    // The cap is taken about the camera's cell, grown to hold every camera in
    // it and for the radii's difference from a sphere's.
    const angle = Math.min(
      Math.PI,
      Math.acos(Math.min(1, radius / top)) * 1.02 + 1e-4 + CELL * 1.5,
    );
    const cap = { direction: center, cos: Math.cos(angle) };
    for (;;) {
      const found = yield* this.peekBound(
        this.options.root,
        curvilinearMap,
        cap,
        expired,
      );
      if (found.value >= radius) {
        return true;
      }
      const target = this.unmade(found.tile, curvilinearMap);
      if (!target) {
        return false;
      }
      yield* this.resident(target, curvilinearMap, expired);
      if (expired()) {
        yield;
      }
    }
  }

  /**
   * The tile at or above `tile`, nearest the root, with resident heights and
   * no bound made yet: refining from the top, a coarse bound serves every
   * tile under it before any finer one is made.
   */
  private unmade(
    tile: Tile | undefined,
    _CurvilinearMap: TileCurvilinearMap,
  ): Tile | undefined {
    let found: Tile | undefined;
    for (let t = tile; t?.globe; t = t.parent) {
      const source = t.globe.upsampledFrom ?? t;
      if (
        (source.globe?.heights ?? (this.options.flat ? true : undefined)) &&
        this.cached(t) === undefined
      ) {
        found = t;
      }
    }
    return found;
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
    curvilinearMap: TileCurvilinearMap,
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
      return { value: this.peekOwn(tile, curvilinearMap), tile };
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
          const r = yield* this.peekBound(kid, curvilinearMap, cap, expired);
          if (r.value < best.value) {
            best = r;
          }
        }
      }
      if (fills) {
        const own = this.peekOwn(tile, curvilinearMap);
        if (own < best.value) {
          best = { value: own, tile };
        }
      }
      return best;
    }
    return { value: this.peekOwn(tile, curvilinearMap), tile };
  }

  /** `own` from the bounds made already: the tile's own, else the nearest ancestor's less its error (0 with none). */
  private peekOwn(tile: Tile, curvilinearMap: TileCurvilinearMap): number {
    const mine = this.cached(tile);
    if (mine) {
      return mine.value;
    }
    for (let a = tile.parent; a?.globe; a = a.parent) {
      const base = this.cached(a);
      if (base) {
        return this.derived(a, base.value, curvilinearMap);
      }
    }
    return 0;
  }

  /** The bound under ancestor `a` (its bound `tops`): its error, stretched along the normal. */
  private derived(
    a: Tile,
    tops: number,
    curvilinearMap: TileCurvilinearMap,
  ): number {
    const drawn = drawnTile(a, curvilinearMap);
    const stretch = Math.max(1, drawn.slopeMax ?? drawn.sigmaMax);
    const error = soundError(a.globe!.refit);
    return Math.max(0, tops - (error * stretch) / R_MIN);
  }

  /** The exact bound of a tile's own mesh, cached; undefined without resident heights . */
  private *resident(
    tile: Tile,
    curvilinearMap: TileCurvilinearMap,
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
    const value = yield* exactBound(source, heights, curvilinearMap, expired);
    if (value === undefined) {
      return undefined;
    }
    const made = { key: this.keyNow, heights, value };
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

/** Whether the tile's volume can lie within the cap (a direction and the cosine of its angle): its bounding sphere, seen from the center, padded. */
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
  // The sphere's angular radius from the center, as seen at its center's
  // distance: asin(r / d), padded by the flattening's skew.
  const reach = Math.asin(Math.min(1, radius / distance)) * 1.02 + 1e-4;
  return angle - reach <= Math.acos(Math.min(1, Math.max(-1, cap.cos)));
}

/**
 * The bound from a tile's resident vertices: each, through the curvilinear map's map,
 * the smallest scaled norm over the scale's span, less what the chord of a
 * triangle dips under the shell its vertices lie on (below). Undefined where
 * the curvilinear map can't map them.
 */
function* exactBound(
  tile: Tile,
  heights: TerrainHeights,
  curvilinearMap: TileCurvilinearMap,
  expired: () => boolean,
): Generator<void, number | undefined> {
  const g = tile.globe!;
  const r = g.rectangle;
  const n = heights.u.length;
  const span = heights.maximumHeight - heights.minimumHeight;
  const carto = { longitude: 0, latitude: 0, height: 0 };
  const out = new Float64Array(3);
  let lowest = Infinity;
  // In chunks of vertices, handing control back between them when the
  // call's time is spent.
  for (let from = 0; from < n; from += CHUNK) {
    const to = Math.min(n, from + CHUNK);
    const points = new Float64Array((to - from) * 3);
    for (let i = from; i < to; i++) {
      carto.longitude = r.west + (heights.u[i]! / 32767) * (r.east - r.west);
      carto.latitude = r.south + (heights.v[i]! / 32767) * (r.north - r.south);
      carto.height = heights.minimumHeight + (heights.h[i]! / 32767) * span;
      ellipsoid.cartographicToCartesian(carto, out);
      points.set(out, (i - from) * 3);
    }
    const images = curvilinearMap.images?.(points);
    if (!images) {
      return undefined;
    }
    for (let i = 0; i < to - from; i++) {
      lowest = Math.min(lowest, lowestAlong(images, i));
    }
    if (expired()) {
      yield;
    }
  }
  if (!Number.isFinite(lowest)) {
    return undefined;
  }
  // The longest triangle edge, as an angle at the body's center (an edge
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
  return lowest * keep;
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

/** A tile's horizon-occlusion point for an occluding ellipsoid of `radii`: from its volume's eight corners (a sphere's cube's), undefined where it can't be culled (near the center, or facing all ways). */
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
