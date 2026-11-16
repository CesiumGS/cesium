// Where a warped anchor's tiles are drawn (docs/design/geometry-through-placement-review.md, increment 3). Under
// an anchor whose route to the view's root crosses a warp, a tile is drawn
// where the route takes its content, not where its bounding volume says:
// selection (distance, the frustum, the screen-space error, the viewer's
// request volume, shadow casters' reach, the dynamic screen-space error) runs
// on the drawn volume. The scene supplies the map as a `TileWarp`, which
// keeps streaming free of frames and routes; this module makes and caches the
// volumes.
import type { Vec3 } from "../math/vec3.ts";
import type { DrawHandle } from "../scene/world/types.ts";
import type { Tile } from "./Tile.ts";
import {
  obb,
  regionFromJson,
  sphereFromObb,
  volumeObb,
  type TileVolume,
} from "./volumes.ts";

/** How many maps (views reaching an anchor by routes of different shape) a tile keeps drawn volumes for besides the one last asked. */
const MAPS_PER_TILE = 3;

/** What a map did to some points: their images' bounding sphere and the Jacobian's singular values there. */
export interface WarpedPoints {
  readonly center: Vec3;
  /** Including the bulge between the samples (`spacing`): an estimate. */
  readonly radius: number;
  readonly sigmaMin: number;
  readonly sigmaMax: number;
  /** An estimate of the map's second-derivative norm over the samples. */
  readonly secondDerivative: number;
  /**
   * What `TileWarp.rebound` takes to make these again for the scale as it
   * is later; present only for a map that is affine in its scale.
   */
  readonly image?: object;
}

/** Points' images over the interval of scales a map holds for (`TileWarp.images`). */
export interface TileImages {
  readonly at: Float64Array;
  readonly delta: Float64Array;
  readonly span: number;
}

/** A tileset's anchor's route, as selection uses it (`World.tileWarp`). */
export interface TileWarp {
  /** Goes up whenever the map changes (the route, a scaled warp's value past a bucket): drawn volumes made under an older one are remade. */
  readonly version: number;
  /**
   * Goes up when only the scale a map is affine in has moved past a bucket
   * (`version` stays): volumes made from an `image` are made again by
   * `rebound`, with no map evaluated. Absent where the map isn't affine in
   * its scale.
   */
  readonly scaleVersion?: number;
  /** Goes up whenever a fit lands or goes: the tiles' fit errors are read again. */
  readonly fitVersion: number;
  /** The route's own error exponent (`Warp.lodExponent`), where one of its warps sets it; it wins over the view's. */
  readonly lodExponent?: number;
  /**
   * `points` (n × 3, flat, in the tileset's coordinates) carried through
   * the map into the same coordinates, bounded, with its stretch there.
   * `spacing`, the distance between neighboring samples, pads the radius
   * by the image's bulge between them, (1/8)·M₂·spacing². Estimates, from
   * the samples only.
   */
  bounds(points: ArrayLike<number>, spacing?: number): WarpedPoints;
  /**
   * The box (`center`, half `axes` as columns, column-major 3×3, in the
   * tileset's coordinates) carried through the map by declared bounds, with
   * no map sampled: a box holding its image, sound where the bounds are, and
   * the largest stretch. Undefined where the map has a step with no declared
   * bound; the volume is then carried by `bounds`' samples.
   */
  box?(
    center: ArrayLike<number>,
    axes: ArrayLike<number>,
  ): { center: Vec3; axes: Float64Array; sigmaMax: number } | undefined;
  /**
   * `points` (n × 3, flat, in the tileset's coordinates) carried through the
   * map, in the same coordinates, for every scale the bounds hold for: point
   * i drawn at `at[i] + t·delta[i]` for t in [0, `span`] (affine in t where
   * the map is affine in its scale; between the ends of its bucket
   * otherwise: an estimate there). Undefined where the map fails at a point.
   * For a bound over the drawn surface (`globe/bodyOccluder.ts`).
   */
  images?(points: ArrayLike<number>): TileImages | undefined;
  /** What `bounds` gave, for the scale as it is now: the `image` it came with, taken again. */
  rebound?(image: object): WarpedPoints;
  /** The worst error (m) of the fits drawing these draws against the route; 0 where there is none yet. */
  fitError(draws: readonly DrawHandle[]): number;
  /**
   * Present where the map is a height profile on the ellipsoid
   * (`HeightScale.profile`), which carries a geodetic region to a region of
   * the same longitudes and latitudes: the drawn heights of heights in
   * [`min`, `max`] (closed form, for the scale's bucket) and the most the map
   * stretches there (σ_max), so a region's drawn volume needs no samples.
   * `slopeMax` is the profile's largest dh′/dh over those heights: how much it
   * stretches a vertical length, which is all a terrain tile's error is.
   */
  heightRange?(
    min: number,
    max: number,
  ): { min: number; max: number; sigmaMax: number; slopeMax: number };
}

/** A tile's volume where its draws put it. */
export interface DrawnTile {
  /** The bounding sphere of its volume's image, as a volume. An estimate from its center and corners. */
  readonly volume: TileVolume;
  /** The largest singular value of the map's Jacobian over the volume, estimated at its center and corners: how much the map stretches a geometric error. */
  readonly sigmaMax: number;
  /**
   * Under a height profile only: the largest dh′/dh over the tile's heights
   * (`TileWarp.heightRange`), the stretch of a vertical length, with the
   * horizontal stretch taken as 1 (`terrainDrawnError`).
   */
  readonly slopeMax?: number;
  /**
   * Under a height scale on terrain: the drawn surface alone, without the
   * skirts `volume` reaches (a curtain hides cracks and needs no detail).
   * Selection measures its distance to this, and culls with `volume`.
   */
  readonly surface?: TileVolume;
  /** The fit's error (m), added to the stretched geometric error. */
  fit: number;
}

/** A volume carried through a map, and how to carry it again for the scale as it is later, where the map allows. */
interface Carried {
  readonly volume: TileVolume;
  readonly sigmaMax: number;
  readonly slopeMax?: number;
  /** `DrawnTile.surface`. */
  readonly surface?: TileVolume;
  readonly remake?: () => Carried;
}

/** What a tile keeps of its drawn volumes, for one map and the volumes they were made from. */
export interface DrawnCache {
  readonly warp: TileWarp;
  readonly version: number;
  /** The warp's `scaleVersion` the volumes were made at. */
  scaleVersion: number;
  readonly basis: TileVolume;
  drawn: DrawnTile;
  /** Makes `drawn` again for a moved scale. */
  remake?: () => Carried;
  fitVersion: number;
  content?: {
    basis: TileVolume;
    volume: TileVolume;
    remake?: () => Carried;
  };
  request?: {
    basis: TileVolume;
    volume: TileVolume;
    remake?: () => Carried;
  };
}

/**
 * The sample points of a volume, flat, and the largest distance between
 * neighboring ones. A box (or a region's box): a 3 × 3 × 3 grid, its corners,
 * edge midpoints, face centers and center, spaced by the half axes. A sphere:
 * its center and 6 points on its axes, spaced by the radius.
 */
function samples(volume: TileVolume): { points: number[]; spacing: number } {
  const box = volumeObb(volume);
  const points: number[] = [];
  if (box) {
    const c = box.center;
    const h = box.halfAxes;
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        for (let k = -1; k <= 1; k++) {
          points.push(
            c[0]! + i * h[0]! + j * h[3]! + k * h[6]!,
            c[1]! + i * h[1]! + j * h[4]! + k * h[7]!,
            c[2]! + i * h[2]! + j * h[5]! + k * h[8]!,
          );
        }
      }
    }
    // A cell of the grid is one half axis on a side: its diagonal bounds
    // the distance from any point of the box to a sample.
    const spacing = Math.hypot(
      Math.hypot(h[0]!, h[1]!, h[2]!),
      Math.hypot(h[3]!, h[4]!, h[5]!),
      Math.hypot(h[6]!, h[7]!, h[8]!),
    );
    return { points, spacing };
  }
  const { center: c, radius: r } = volume.sphere;
  points.push(c[0]!, c[1]!, c[2]!);
  for (let a = 0; a < 3; a++) {
    for (const s of [-1, 1]) {
      const p = [c[0]!, c[1]!, c[2]!];
      p[a] = p[a]! + s * r;
      points.push(p[0]!, p[1]!, p[2]!);
    }
  }
  return { points, spacing: r };
}

function sphereVolume(center: Vec3, radius: number): TileVolume {
  return { kind: "sphere", sphere: { center, radius } };
}

/** The volume carried through `warp`: a box or region by its image's bounding sphere, a sphere by its center's image and σ_max · radius. A map that fails on a sample (not finite) leaves the volume where it is. */
function carried(volume: TileVolume, warp: TileWarp, below = 0): Carried {
  const made = carry(volume, warp, below);
  const c = made.volume.sphere;
  if (
    c &&
    Number.isFinite(c.radius) &&
    Number.isFinite(c.center[0]! + c.center[1]! + c.center[2]!) &&
    Number.isFinite(made.sigmaMax)
  ) {
    return made.remake
      ? { ...made, remake: () => carriedAgain(volume, made.remake!) }
      : made;
  }
  return { volume, sigmaMax: 1 };
}

/** `remake`'s volume, with `carried`'s check that it is finite. */
function carriedAgain(volume: TileVolume, remake: () => Carried): Carried {
  const made = remake();
  const c = made.volume.sphere;
  return c &&
    Number.isFinite(c.radius) &&
    Number.isFinite(c.center[0]! + c.center[1]! + c.center[2]!) &&
    Number.isFinite(made.sigmaMax)
    ? {
        ...made,
        ...(made.remake && {
          remake: () => carriedAgain(volume, made.remake!),
        }),
      }
    : { volume, sigmaMax: 1 };
}

/** A volume as a box: its own, or a sphere's cube. */
function holding(volume: TileVolume): {
  center: ArrayLike<number>;
  axes: ArrayLike<number>;
} {
  const box = volumeObb(volume);
  if (box) {
    return { center: box.center, axes: box.halfAxes };
  }
  const r = volume.kind === "sphere" ? volume.sphere.radius : NaN;
  return {
    center: volume.sphere.center,
    axes: [r, 0, 0, 0, r, 0, 0, 0, r],
  };
}

function padded<S extends { radius: number }>(sphere: S, by: number): S {
  return by > 0 ? { ...sphere, radius: sphere.radius + by } : sphere;
}

function carry(volume: TileVolume, warp: TileWarp, below = 0): Carried {
  if (volume.kind === "region" && warp.heightRange) {
    // A region's image under a height profile is the region over the drawn
    // heights: exact in height, nothing sampled.
    const r = volume.region;
    const image = warp.heightRange(r.minimumHeight, r.maximumHeight);
    const drawn = regionFromJson([
      r.west,
      r.south,
      r.east,
      r.north,
      image.min,
      image.max,
    ]);
    return {
      surface: { kind: "sphere", sphere: sphereFromObb(drawn.obb) },
      volume: {
        kind: "sphere",
        // Skirts hang below the region's lowest height, and the map stretches
        // that depth by at most slopeMax: the sphere reaches their tips.
        sphere: padded(sphereFromObb(drawn.obb), image.slopeMax * below),
      },
      sigmaMax: image.sigmaMax,
      slopeMax: image.slopeMax,
    };
  }
  if (warp.box) {
    const around = holding(volume);
    const made = warp.box(around.center, around.axes);
    if (made) {
      const box = obb(made.center, made.axes);
      return {
        volume: { kind: "box", obb: box, sphere: sphereFromObb(box) },
        sigmaMax: made.sigmaMax,
      };
    }
  }
  if (volume.kind === "sphere") {
    const c = volume.sphere.center;
    const r = volume.sphere.radius;
    const at = warp.bounds([c[0]!, c[1]!, c[2]!]);
    const around = warp.bounds(samples(volume).points, r);
    const make = (at: WarpedPoints, around: WarpedPoints): Carried => {
      const sigmaMax = Math.max(at.sigmaMax, around.sigmaMax);
      // |f(p) − f(c)| ≤ σ_max·r + ½·M₂·r² (an estimate, M₂ from the samples).
      const grown = sigmaMax * r + (around.secondDerivative * r * r) / 2;
      return {
        volume: sphereVolume(at.center, grown),
        sigmaMax,
        ...(warp.rebound &&
          at.image &&
          around.image && {
            remake: () =>
              make(warp.rebound!(at.image!), warp.rebound!(around.image!)),
          }),
      };
    };
    return make(at, around);
  }
  const { points, spacing } = samples(volume);
  const make = (image: WarpedPoints): Carried => ({
    volume: sphereVolume(image.center, image.radius),
    sigmaMax: image.sigmaMax,
    ...(warp.rebound &&
      image.image && { remake: () => make(warp.rebound!(image.image!)) }),
  });
  return make(warp.bounds(points, spacing));
}

/**
 * How far below its region's lowest height a terrain tile's mesh reaches:
 * its skirts hang at most 5 × the level's error (a tile upsampled from data
 * hangs its outer edges at the data tile's depth). The tile's volume leaves
 * them out; a drawn volume must not, or a skirt tip is culled while visible.
 */
function skirtBelow(tile: Tile): number {
  const g = tile.globe;
  const own = g?.refit?.levelError;
  if (g === undefined || own === undefined) {
    return 0;
  }
  const data = g.upsampledFrom?.globe;
  const outer = data?.refit?.levelError;
  if (data === undefined || outer === undefined) {
    return 5 * own;
  }
  // Only an edge on the data tile's boundary hangs the data tile's depth
  // (`skirtDepths`); the inner edges hang the tile's own.
  const span = 2 ** (g.level - data.level);
  const x0 = data.x * span;
  const y0 = data.y * span;
  const onBoundary =
    g.x === x0 || g.y === y0 || g.x === x0 + span - 1 || g.y === y0 + span - 1;
  return 5 * (onBoundary ? outer : own);
}

/**
 * Where `tile`'s draws put its volume under `warp`, cached on the tile for
 * the map's version and the volume it came from (a padded or tightened
 * volume is a new object); the fit's error is read again when fits change.
 * When only the scale the map is affine in moved (`TileWarp.scaleVersion`)
 * the volumes are made again from what the first bounds kept, with no map
 * evaluated.
 */
export function drawnTile(tile: Tile, warp: TileWarp): DrawnTile {
  const basis = tile.volume;
  const scaleVersion = warp.scaleVersion ?? 0;
  let cache = tile.drawnCache;
  if (cache && cache.warp !== warp) {
    // Another view's map: its cache comes forward, and this one is kept.
    const others = (tile.drawnOthers ??= []);
    const at = others.findIndex((c) => c.warp === warp);
    others.push(cache);
    cache = at >= 0 ? others.splice(at, 1)[0] : undefined;
    if (others.length > MAPS_PER_TILE) {
      others.shift();
    }
    tile.drawnCache = cache;
  }
  if (!cache || cache.version !== warp.version || cache.basis !== basis) {
    const { volume, sigmaMax, slopeMax, surface, remake } = carried(
      basis,
      warp,
      skirtBelow(tile),
    );
    cache = {
      warp,
      version: warp.version,
      scaleVersion,
      basis,
      drawn: {
        volume,
        sigmaMax,
        ...(slopeMax !== undefined && { slopeMax }),
        ...(surface && { surface }),
        fit: 0,
      },
      ...(remake && { remake }),
      fitVersion: -1,
    };
    tile.drawnCache = cache;
  } else if (cache.scaleVersion !== scaleVersion) {
    cache.scaleVersion = scaleVersion;
    const { volume, sigmaMax, slopeMax, surface, remake } =
      cache.remake?.() ?? carried(basis, warp, skirtBelow(tile));
    cache.drawn = {
      volume,
      sigmaMax,
      ...(slopeMax !== undefined && { slopeMax }),
      ...(surface && { surface }),
      fit: cache.drawn.fit,
    };
    cache.remake = remake;
    for (const key of ["content", "request"] as const) {
      const kept = cache[key];
      if (kept?.remake) {
        const again = kept.remake();
        cache[key] = {
          basis: kept.basis,
          volume: again.volume,
          ...(again.remake && { remake: again.remake }),
        };
      } else if (kept) {
        delete cache[key];
      }
    }
  }
  if (cache.fitVersion !== warp.fitVersion) {
    cache.fitVersion = warp.fitVersion;
    cache.drawn.fit = tile.placement ? warp.fitError(tile.placement.draws) : 0;
  }
  return cache.drawn;
}

/** The tile's content volume where its draws put it (as `drawnTile`); undefined without one. */
export function drawnContentVolume(
  tile: Tile,
  warp: TileWarp,
): TileVolume | undefined {
  const basis = tile.contentVolume;
  if (!basis) {
    return undefined;
  }
  drawnTile(tile, warp); // makes the cache this one lives in
  const cache = tile.drawnCache!;
  if (cache.content?.basis !== basis) {
    const { volume, remake } = carried(basis, warp);
    cache.content = { basis, volume, ...(remake && { remake }) };
  }
  return cache.content.volume;
}

/**
 * The tile's viewer request volume carried through `warp`, as `drawnTile`
 * carries the bounding volume: the camera is where things are drawn, so it is
 * tested against where the request volume is drawn. Always a bounding sphere
 * of the image (a box or region: of its samples' images), so it is larger than
 * the carried volume itself: conservative, a tile may count the viewer as
 * inside a little before it is. Undefined without a request volume.
 */
export function drawnRequestVolume(
  tile: Tile,
  warp: TileWarp,
): TileVolume | undefined {
  const basis = tile.requestVolume;
  if (!basis) {
    return undefined;
  }
  drawnTile(tile, warp);
  const cache = tile.drawnCache!;
  if (cache.request?.basis !== basis) {
    const { volume, remake } = carried(basis, warp);
    cache.request = { basis, volume, ...(remake && { remake }) };
  }
  return cache.request.volume;
}

/** The angle (radians) between two unit vectors. */
function angleBetween(a: Vec3, b: Vec3): number {
  return Math.acos(
    Math.min(1, Math.max(-1, a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!)),
  );
}

/** The geodetic up at (longitude, latitude) radians: a unit vector. */
function up(longitude: number, latitude: number): Vec3 {
  const c = Math.cos(latitude);
  return [
    c * Math.cos(longitude),
    c * Math.sin(longitude),
    Math.sin(latitude),
  ] as unknown as Vec3;
}

/** How far the tile's up differs across it: the largest angle from its center's to a corner's or an edge midpoint's (cached on the tile's globe data). */
const spreads = new WeakMap<object, { up: Vec3; spread: number }>();

function upSpread(
  rectangle: {
    west: number;
    south: number;
    east: number;
    north: number;
  },
  key: object,
): { up: Vec3; spread: number } {
  let known = spreads.get(key);
  if (!known) {
    const lon = (rectangle.west + rectangle.east) / 2;
    const lat = (rectangle.south + rectangle.north) / 2;
    const center = up(lon, lat);
    let spread = 0;
    for (const l of [rectangle.west, lon, rectangle.east]) {
      for (const t of [rectangle.south, lat, rectangle.north]) {
        spread = Math.max(spread, angleBetween(center, up(l, t)));
      }
    }
    known = { up: center, spread };
    spreads.set(key, known);
  }
  return known;
}

/**
 * The largest sin θ over a terrain tile, θ the angle between the line from
 * the viewer to a point of the tile and the local up there. A vertical
 * length L at distance d seen at θ covers about L·sin θ / d of the view, so
 * this is how much of a vertical error shows. Conservative: the line to any
 * point of the tile lies within the angle the tile's bounding sphere
 * subtends of the line to its center, and its up within the tile's angular
 * spread of its center's, so θ lies within their sum of the center's;
 * 1 where the viewer is inside the sphere (or that sum reaches a right
 * angle).
 */
export function sinThetaMax(
  position: ArrayLike<number>,
  sphere: { center: ArrayLike<number>; radius: number },
  rectangle: { west: number; south: number; east: number; north: number },
  key: object,
): number {
  const dx = sphere.center[0]! - position[0]!;
  const dy = sphere.center[1]! - position[1]!;
  const dz = sphere.center[2]! - position[2]!;
  const d = Math.hypot(dx, dy, dz);
  if (!(d > sphere.radius)) {
    return 1;
  }
  const { up: n, spread } = upSpread(rectangle, key);
  const cos = (dx * n[0]! + dy * n[1]! + dz * n[2]!) / d;
  const theta = Math.acos(Math.min(1, Math.max(-1, cos)));
  const s = Math.asin(sphere.radius / d) + spread;
  // sin is largest at the end of [θ − s, θ + s] nearest a right angle.
  if (theta - s <= Math.PI / 2 && theta + s >= Math.PI / 2) {
    return 1;
  }
  return Math.sin(theta + s < Math.PI / 2 ? theta + s : theta - s);
}

/**
 * A terrain tile's geometric error as it is drawn, plus its fit's. Under a
 * height profile (`drawn.slopeMax`) the error is vertical: stretched by the
 * profile's largest dh′/dh with the horizontal stretch taken as 1, and seen
 * at most by sin θ (`sinThetaMax`). Under any other warp, the isotropic
 * σ_max, as for any content. The stretch s is used as s^α (`alpha`, the
 * error exponent: 1 is exact as drawn, 0 treats the warp as absent).
 */
export function terrainDrawnError(
  tile: Tile,
  drawn: DrawnTile,
  position: ArrayLike<number>,
  error = tile.geometricError,
  alpha = 1,
): number {
  return error * terrainStretch(tile, drawn, position, alpha) + drawn.fit;
}

/** The factor `terrainDrawnError` multiplies a geometric error by: s^α, s the direction-aware or isotropic stretch. */
export function terrainStretch(
  tile: Tile,
  drawn: DrawnTile,
  position: ArrayLike<number>,
  alpha = 1,
): number {
  const rectangle = tile.globe?.rectangle;
  const sphere = drawn.volume.sphere;
  let s: number;
  if (drawn.slopeMax === undefined || !rectangle || !sphere) {
    s = drawn.sigmaMax;
  } else {
    s = drawn.slopeMax * sinThetaMax(position, sphere, rectangle, tile.globe!);
  }
  return alpha === 1 ? s : s ** alpha;
}

/**
 * The default error exponent α (`View.lodExponent`, `Warp.lodExponent`):
 * 0.3, chosen by the owner on 2026-11-13 from the α sweep
 * (`scripts/alphaSweep.mjs`). At ×4 and ×10 exaggeration, α 0.25 and 0.5
 * differed from the exact image (α 1) by less than the run-to-run noise
 * (about 2% of pixels), with a quarter to a fifth of α 1's terrain tiles.
 */
export const DEFAULT_LOD_EXPONENT = 0.3;

/** The error exponent selection uses for a view: the route's own where set, else the view's, else `DEFAULT_LOD_EXPONENT`. */
export function lodExponentOf(view: {
  readonly warp?: { readonly lodExponent?: number };
  readonly lodExponent?: number;
}): number {
  const a = view.warp?.lodExponent ?? view.lodExponent ?? DEFAULT_LOD_EXPONENT;
  return Math.min(1, Math.max(0, a));
}

/**
 * Whether refining `tile` can still reduce its geometric (vertical) error:
 * false for a globe tile upsampled from a data ancestor (`globe.upsampledFrom`,
 * `fillFromParent`), and for one whose children all are (no data below it).
 * Anything else, including tiles whose children aren't known yet, can.
 */
export function geometryRefines(tile: Tile): boolean {
  const g = tile.globe;
  if (!g) {
    return true;
  }
  if (tile.fillFromParent || g.upsampledFrom !== undefined) {
    return false;
  }
  return !(
    tile.children.length > 0 && tile.children.every((c) => c.fillFromParent)
  );
}
