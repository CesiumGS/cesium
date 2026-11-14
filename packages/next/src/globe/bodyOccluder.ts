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

const ellipsoid = Ellipsoid.WGS84;
const RADII = ellipsoid.radii;
const R_MAX = Math.max(...RADII);
const R_MIN = Math.min(...RADII);

/** Time for exact bounds in a pass, ms. */
const EXACT_MS = 2;
/** A triangle's chord dips by up to this times the standard sagitta under the drawn (stretched) surface: margin for the warp's stretch along the surface. */
const CHORD_MARGIN = 1.2;

interface Options {
  readonly root: Tile;
  /** The globe is the ellipsoid's flat tiles, with no heights of its own. */
  readonly flat: boolean;
  /** Whether the premise holds for the globe itself now (shown, no regions). */
  enabled(): boolean;
  /** Occluders sharing the anchor that bound the same surface (the ellipsoid under terrain). */
  partners?(): readonly BodyOccluder[];
}

interface Exact {
  readonly key: string;
  readonly heights: TerrainHeights | undefined;
  readonly value: number;
  readonly exact: boolean;
}

interface Prepared {
  /** The scale this occluder's own surface supports; undefined: none. */
  own: number | undefined;
}

let flatHeights: TerrainHeights | undefined;

export class BodyOccluder implements Occluder {
  private readonly bounds = new WeakMap<Tile, Exact>();
  private readonly prepared = new Map<number, Prepared>();
  private spent = 0;
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

  private compute(view: SelectionView): number | undefined {
    const warp = view.warp;
    if (!warp?.images || !this.options.enabled()) {
      return undefined;
    }
    this.keyNow = `${warp.version}:${warp.scaleVersion ?? 0}`;
    this.spent = performance.now() + EXACT_MS;
    const root = this.options.root;
    const camera = view.position;
    const c = scaledNorm(camera);
    const global = this.bound(root, warp, undefined, undefined);
    if (!(c > global)) {
      return undefined;
    }
    const angle = Math.min(
      Math.PI,
      Math.acos(Math.min(1, global / c)) * 1.02 + 1e-4,
    );
    const cap = { direction: unit(camera), cos: Math.cos(angle) };
    const scale = this.bound(root, warp, cap, undefined);
    return c > scale && scale > 0 ? scale : undefined;
  }

  /**
   * The lower bound of the scaled norm of the surface drawn by `tile` and
   * below, over the tiles meeting `cap` when given.
   */
  private bound(
    tile: Tile,
    warp: TileWarp,
    cap: { direction: Vec3; cos: number } | undefined,
    _unused: undefined,
  ): number {
    if (cap && !meetsCap(tile, cap)) {
      return Infinity;
    }
    const kids = tile.children;
    const isRoot = tile.globe === undefined;
    if (kids.length > 0 && (kids.length === 4 || isRoot)) {
      let lowest = Infinity;
      let fills = false;
      for (const kid of kids) {
        if (kid.fillFromParent) {
          fills = true;
        } else {
          lowest = Math.min(lowest, this.bound(kid, warp, cap, undefined));
        }
      }
      if (fills) {
        lowest = Math.min(lowest, this.own(tile, warp));
      }
      return lowest;
    }
    return this.own(tile, warp);
  }

  /** A tile's own bound: exact where its heights are resident (and the time allows), else its drawn volume's. */
  private own(tile: Tile, warp: TileWarp): number {
    const source = tile.globe?.upsampledFrom ?? tile;
    const heights =
      source.globe?.heights ??
      (this.options.flat ? (flatHeights ??= flatTerrainHeights()) : undefined);
    const kept = this.bounds.get(tile);
    if (
      kept &&
      kept.key === this.keyNow &&
      kept.heights === heights &&
      (kept.exact || heights === undefined || performance.now() >= this.spent)
    ) {
      return kept.value;
    }
    if (heights && source.globe && performance.now() < this.spent) {
      const value = exactBound(source, heights, warp);
      if (value !== undefined) {
        this.bounds.set(tile, {
          key: this.keyNow,
          heights,
          value,
          exact: true,
        });
        return value;
      }
    }
    const value =
      regionBound(tile, warp) ?? volumeBound(drawnTile(tile, warp).volume);
    this.bounds.set(tile, {
      key: this.keyNow,
      heights,
      value,
      exact: false,
    });
    return value;
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

/** A lower bound of the scaled norm over a volume: its nearest point to the centre, over the largest radius. */
function volumeBound(volume: TileVolume): number {
  if (volume.kind === "sphere") {
    const { center, radius } = volume.sphere;
    return (
      Math.max(0, Math.hypot(center[0]!, center[1]!, center[2]!) - radius) /
      R_MAX
    );
  }
  const box = volume.kind === "box" ? volume.obb : volume.region.obb;
  const c = box.center;
  const h = box.halfAxes;
  // Nearest point of the box to the origin (axes orthogonal): clamp the
  // origin's coordinates along each.
  const p = [c[0]!, c[1]!, c[2]!];
  for (let a = 0; a < 3; a++) {
    const ax = h[a * 3]!;
    const ay = h[a * 3 + 1]!;
    const az = h[a * 3 + 2]!;
    const len2 = ax * ax + ay * ay + az * az;
    if (len2 === 0) {
      continue;
    }
    const t = Math.min(
      1,
      Math.max(-1, -(c[0]! * ax + c[1]! * ay + c[2]! * az) / len2),
    );
    p[0]! += t * ax;
    p[1]! += t * ay;
    p[2]! += t * az;
  }
  return Math.hypot(p[0]!, p[1]!, p[2]!) / R_MAX;
}

/**
 * A lower bound from the tile's region alone: a grid of points over its
 * rectangle at three heights through the warp's map, less what a surface
 * between the grid's points dips under their shell (an estimate of the
 * map, as `TileWarp.bounds` is). Tighter than the drawn volume's sphere or
 * box, which for a tile of hundreds of km is a few percent of the radius.
 */
function regionBound(tile: Tile, warp: TileWarp): number | undefined {
  const volume = tile.volume;
  if (volume.kind !== "region" || !warp.images) {
    return undefined;
  }
  const r = volume.region;
  const steps = 4;
  const heights = [
    r.minimumHeight,
    (r.minimumHeight + r.maximumHeight) / 2,
    r.maximumHeight,
  ];
  const points = new Float64Array((steps + 1) ** 2 * 3 * 3);
  const out = new Float64Array(3);
  let count = 0;
  for (const height of heights) {
    for (let j = 0; j <= steps; j++) {
      for (let i = 0; i <= steps; i++) {
        ellipsoid.cartographicToCartesian(
          {
            longitude: r.west + ((r.east - r.west) * i) / steps,
            latitude: r.south + ((r.north - r.south) * j) / steps,
            height,
          },
          out,
        );
        points.set(out, count * 3);
        count++;
      }
    }
  }
  const images = warp.images(points);
  if (!images) {
    return undefined;
  }
  let lowest = Infinity;
  for (let i = 0; i < count; i++) {
    lowest = Math.min(lowest, lowestAlong(images, i));
  }
  const cell =
    R_MAX * Math.hypot(r.east - r.west, r.north - r.south) * (1.5 / steps);
  const dip = (CHORD_MARGIN * cell * cell) / (8 * R_MIN) / R_MIN;
  return Number.isFinite(lowest) ? Math.max(0, lowest - dip) : undefined;
}

/**
 * The bound from a tile's resident vertices: each, and the bottom of the
 * skirt under each edge vertex, through the warp's map, the smallest scaled
 * norm over the scale's span, less what the chord of a triangle dips under
 * its vertices' shell. Undefined where the warp can't map them.
 */
function exactBound(
  tile: Tile,
  heights: TerrainHeights,
  warp: TileWarp,
): number | undefined {
  const g = tile.globe!;
  const r = g.rectangle;
  const n = heights.u.length;
  const skirt =
    (5 * ELLIPSOID_LEVEL_ZERO_ERROR) / 2 ** Math.max(0, g.level - 1);
  const span = heights.maximumHeight - heights.minimumHeight;
  const points = new Float64Array(n * 6);
  const carto = { longitude: 0, latitude: 0, height: 0 };
  const out = new Float64Array(3);
  let count = 0;
  for (let i = 0; i < n; i++) {
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
      count++;
    }
  }
  const images = warp.images?.(points.subarray(0, count * 3));
  if (!images) {
    return undefined;
  }
  let lowest = Infinity;
  for (let i = 0; i < count; i++) {
    lowest = Math.min(lowest, lowestAlong(images, i));
  }
  if (!Number.isFinite(lowest)) {
    return undefined;
  }
  // The longest edge of a triangle, as a fraction of the tile, bounds the
  // chord's dip under the surface its vertices lie on.
  let edge = 0;
  const t = heights.triangles;
  for (let k = 0; k + 2 < t.length; k += 3) {
    for (let e = 0; e < 3; e++) {
      const a = t[k + e]!;
      const b = t[k + ((e + 1) % 3)]!;
      edge = Math.max(
        edge,
        Math.abs(heights.u[a]! - heights.u[b]!),
        Math.abs(heights.v[a]! - heights.v[b]!),
      );
    }
  }
  const chord =
    (edge / 32767) *
    R_MAX *
    Math.hypot(r.east - r.west, r.north - r.south) *
    1.5;
  const dip = (CHORD_MARGIN * chord * chord) / (8 * R_MIN) / R_MIN;
  return Math.max(0, lowest - dip);
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
