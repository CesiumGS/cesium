// Where a warped anchor's tiles are drawn (plan §13.26, increment 3). Under
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
import { volumeObb, type TileVolume } from "./volumes.ts";

/** What a map did to some points: their images' bounding sphere and the Jacobian's singular values there. */
export interface WarpedPoints {
  readonly center: Vec3;
  /** Including the bulge between the samples (`spacing`): an estimate. */
  readonly radius: number;
  readonly sigmaMin: number;
  readonly sigmaMax: number;
  /** An estimate of the map's second-derivative norm over the samples. */
  readonly secondDerivative: number;
}

/** A tileset's anchor's route, as selection uses it (`World.tileWarp`). */
export interface TileWarp {
  /** Goes up whenever the map changes (the route, a scaled warp's value past a bucket): drawn volumes made under an older one are remade. */
  readonly version: number;
  /** Goes up whenever a fit lands or goes: the tiles' fit errors are read again. */
  readonly fitVersion: number;
  /**
   * `points` (n × 3, flat, in the tileset's coordinates) carried through
   * the map into the same coordinates, bounded, with its stretch there.
   * `spacing`, the distance between neighbouring samples, pads the radius
   * by the image's bulge between them, (1/8)·M₂·spacing². Estimates, from
   * the samples only.
   */
  bounds(points: ArrayLike<number>, spacing?: number): WarpedPoints;
  /** The worst error (m) of the fits drawing these draws against the route; 0 where there is none yet. */
  fitError(draws: readonly DrawHandle[]): number;
}

/** A tile's volume where its draws put it. */
export interface DrawnTile {
  /** The bounding sphere of its volume's image, as a volume. An estimate from its centre and corners. */
  readonly volume: TileVolume;
  /** The largest singular value of the map's Jacobian over the volume, estimated at its centre and corners: how much the map stretches a geometric error. */
  readonly sigmaMax: number;
  /** The fit's error (m), added to the stretched geometric error. */
  fit: number;
}

/** What a tile keeps of its drawn volumes, for one map and the volumes they were made from. */
export interface DrawnCache {
  readonly warp: TileWarp;
  readonly version: number;
  readonly basis: TileVolume;
  readonly drawn: DrawnTile;
  fitVersion: number;
  content?: { basis: TileVolume; volume: TileVolume };
  request?: { basis: TileVolume; volume: TileVolume };
}

/**
 * The sample points of a volume, flat, and the largest distance between
 * neighbouring ones. A box (or a region's box): a 3 × 3 × 3 grid, its corners,
 * edge midpoints, face centres and centre, spaced by the half axes. A sphere:
 * its centre and 6 points on its axes, spaced by the radius.
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

/** The volume carried through `warp`: a box or region by its image's bounding sphere, a sphere by its centre's image and σ_max · radius. A map that fails on a sample (not finite) leaves the volume where it is. */
function carried(
  volume: TileVolume,
  warp: TileWarp,
): { volume: TileVolume; sigmaMax: number } {
  const made = carry(volume, warp);
  const c = made.volume.kind === "sphere" ? made.volume.sphere : undefined;
  return c &&
    Number.isFinite(c.radius) &&
    Number.isFinite(c.center[0]! + c.center[1]! + c.center[2]!) &&
    Number.isFinite(made.sigmaMax)
    ? made
    : { volume, sigmaMax: 1 };
}

function carry(
  volume: TileVolume,
  warp: TileWarp,
): { volume: TileVolume; sigmaMax: number } {
  if (volume.kind === "sphere") {
    const c = volume.sphere.center;
    const r = volume.sphere.radius;
    const at = warp.bounds([c[0]!, c[1]!, c[2]!]);
    const around = warp.bounds(samples(volume).points, r);
    const sigmaMax = Math.max(at.sigmaMax, around.sigmaMax);
    // |f(p) − f(c)| ≤ σ_max·r + ½·M₂·r² (an estimate, M₂ from the samples).
    const grown = sigmaMax * r + (around.secondDerivative * r * r) / 2;
    return { volume: sphereVolume(at.center, grown), sigmaMax };
  }
  const { points, spacing } = samples(volume);
  const image = warp.bounds(points, spacing);
  return {
    volume: sphereVolume(image.center, image.radius),
    sigmaMax: image.sigmaMax,
  };
}

/**
 * Where `tile`'s draws put its volume under `warp`, cached on the tile for
 * the map's version and the volume it came from (a padded or tightened
 * volume is a new object); the fit's error is read again when fits change.
 */
export function drawnTile(tile: Tile, warp: TileWarp): DrawnTile {
  const basis = tile.volume;
  let cache = tile.drawnCache;
  if (
    !cache ||
    cache.warp !== warp ||
    cache.version !== warp.version ||
    cache.basis !== basis
  ) {
    const { volume, sigmaMax } = carried(basis, warp);
    cache = {
      warp,
      version: warp.version,
      basis,
      drawn: { volume, sigmaMax, fit: 0 },
      fitVersion: -1,
    };
    tile.drawnCache = cache;
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
    cache.content = { basis, volume: carried(basis, warp).volume };
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
    cache.request = { basis, volume: carried(basis, warp).volume };
  }
  return cache.request.volume;
}
