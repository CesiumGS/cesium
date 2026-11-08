// Terrain clipped under the designs (owner's feedback F11, with Cesium
// World Terrain): each site's footprint and the corridor's strip, so the
// ground never pokes through a flat design surface. The regions are
// polygons in geodetic degrees (the globe's `addTerrainClip`), from the
// design's own outline carried through the site's reprojected placement
// (where the design truly is), padded by rigid's error there so the rigid
// placement, drawn up to that far away, is clear of the ground too.
// Pure but for `syncTerrainClips`, so test/designGlobeTerrainClips.test.ts
// runs it in Node.
import type { Alignment } from "../../src/engineering/alignment.ts";
import { Ellipsoid } from "../../src/math/ellipsoid.ts";
import type { Tileset3D } from "../../src/streaming/Tileset3D.ts";

/** A polygon vertex, degrees (the globe's `TerrainClipPosition`). */
export interface ClipVertex {
  readonly longitude: number;
  readonly latitude: number;
}

/** Design point to body-fixed metres, as a placement draws it. */
export type Displayed = (design: ArrayLike<number>) => ArrayLike<number>;

const DEG = 180 / Math.PI;

/** A body-fixed point's longitude and latitude, degrees. */
export function geodeticOf(p: ArrayLike<number>): ClipVertex {
  const c = Ellipsoid.WGS84.cartesianToCartographic(Float64Array.from(p), {
    longitude: 0,
    latitude: 0,
    height: 0,
  });
  if (c === undefined) {
    throw new Error("terrain clip: a point at the Earth's centre");
  }
  return { longitude: c.longitude * DEG, latitude: c.latitude * DEG };
}

/**
 * A site's footprint (its design corners, counterclockwise, at its
 * ground) as a polygon on the globe, each corner pushed `pad` design units
 * further out from the footprint's middle.
 */
export function footprintRegion(
  corners: readonly (readonly [number, number, number])[],
  displayed: Displayed,
  pad: number,
): ClipVertex[] {
  const n = corners.length;
  const cx = corners.reduce((s, c) => s + c[0], 0) / n;
  const cy = corners.reduce((s, c) => s + c[1], 0) / n;
  return corners.map(([e, north, h]) => {
    const dx = e - cx;
    const dy = north - cy;
    const l = Math.hypot(dx, dy) || 1;
    return geodeticOf(
      displayed([e + (dx / l) * pad, north + (dy / l) * pad, h]),
    );
  });
}

/**
 * A buffered line: the route's left side from its start to its end, then
 * its right side back, each point `pad(point)` design units out from the
 * route (mitred at its corners) and the ends squared off that far past the
 * end points, a vertex every `step` design units along each leg. For a
 * model laid along a line (London's pole line), whose footprint's
 * rectangle would clip far more ground than it stands on.
 */
export function routeRegion(
  route: readonly (readonly [number, number, number])[],
  displayed: Displayed,
  pad: (design: readonly [number, number, number]) => number,
  step: number,
): ClipVertex[] {
  if (route.length < 2) {
    throw new RangeError("routeRegion: a route needs two points");
  }
  const left: [number, number, number][] = [];
  const right: [number, number, number][] = [];
  const legs = route.length - 1;
  const along = (k: number): [number, number] => {
    const [a, b] = [route[k]!, route[k + 1]!];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  };
  for (let k = 0; k < legs; k++) {
    const [a, b] = [route[k]!, route[k + 1]!];
    const u = along(k);
    const pieces = Math.max(
      1,
      Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step),
    );
    // A corner is its leg-in's last point; the first leg also has its start.
    for (let i = k === 0 ? 0 : 1; i <= pieces; i++) {
      const t = i / pieces;
      const p: [number, number, number] = [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
      ];
      const r = pad(p);
      // Left of the direction of travel, mitred at a corner.
      let normal: [number, number] = [-u[1], u[0]];
      let reach = r;
      let [e, n] = [p[0], p[1]];
      if (i === pieces && k < legs - 1) {
        const w = along(k + 1);
        const bisector = [-u[1] - w[1], u[0] + w[0]];
        const l = Math.hypot(bisector[0]!, bisector[1]!);
        normal = [bisector[0]! / l, bisector[1]! / l];
        reach = r / (normal[0] * -u[1] + normal[1] * u[0]);
      }
      if (k === 0 && i === 0) {
        [e, n] = [e - u[0] * r, n - u[1] * r];
      }
      if (k === legs - 1 && i === pieces) {
        [e, n] = [e + u[0] * r, n + u[1] * r];
      }
      left.push([e + normal[0] * reach, n + normal[1] * reach, p[2]]);
      right.push([e - normal[0] * reach, n - normal[1] * reach, p[2]]);
    }
  }
  return [...left, ...right.reverse()].map((d) => geodeticOf(displayed(d)));
}

/**
 * How far apart two body-fixed points are across the ground: their
 * separation less its part along the ellipsoid's normal at `b` (metres).
 * The part of rigid's error a terrain clip must reach past; the rest is up
 * or down.
 */
export function horizontalApart(
  a: ArrayLike<number>,
  b: ArrayLike<number>,
): number {
  const up = Ellipsoid.WGS84.geodeticSurfaceNormal(
    Float64Array.from(b),
    new Float64Array(3),
  );
  const d = [a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!];
  if (up === undefined) {
    return Math.hypot(d[0]!, d[1]!, d[2]!);
  }
  const v = d[0]! * up[0]! + d[1]! * up[1]! + d[2]! * up[2]!;
  return Math.hypot(d[0]! - v * up[0]!, d[1]! - v * up[1]!, d[2]! - v * up[2]!);
}

/** A station range the strip leaves the ground in (a viaduct, a tunnel). */
export interface StripGap {
  readonly fromStation: number;
  readonly toStation: number;
}

/**
 * How far either side of the centreline the strip reaches over a gap,
 * design units: a sliver (about 3 mm across in US survey feet), so that one
 * simple polygon clips the earthwork either side and, in effect, none of the
 * ground under a viaduct or over a tunnel. (A region is one simple polygon,
 * and a world has 32: one region per stretch of earthwork wouldn't fit.)
 */
export const STRIP_SLIVER = 0.005;

/**
 * The corridor's strip: its left edge from start to end, then its right
 * edge back, `halfWidth` design units either side of the centreline, a
 * vertex every `step` design units (and at both ends). Over each of `gaps`
 * it narrows to STRIP_SLIVER, with a vertex every 4 `step`s, so the
 * ground under a viaduct and over a tunnel stays.
 */
export function stripRegion(
  alignment: Alignment,
  displayed: Displayed,
  halfWidth: number,
  step: number,
  gaps: readonly StripGap[] = [],
): ClipVertex[] {
  const inGap = (s: number) =>
    gaps.some((g) => s > g.fromStation && s < g.toStation);
  const stations = new Set<number>();
  for (let s = alignment.startStation; s < alignment.endStation; s += step) {
    if (
      !inGap(s) ||
      Math.round((s - alignment.startStation) / step) % 4 === 0
    ) {
      stations.add(s);
    }
  }
  stations.add(alignment.endStation);
  for (const g of gaps) {
    for (const s of [g.fromStation, g.toStation]) {
      if (s >= alignment.startStation && s <= alignment.endStation) {
        stations.add(s);
      }
    }
  }
  // [station, half-width]: at a gap's end, its earthwork width and its
  // sliver at the one station, in the order the edge meets them.
  const along: [number, number][] = [];
  for (const s of [...stations].sort((a, b) => a - b)) {
    // A gap at either end of the alignment has no earthwork past it.
    const opens =
      s > alignment.startStation && gaps.some((g) => g.fromStation === s);
    const closes =
      s < alignment.endStation && gaps.some((g) => g.toStation === s);
    if (opens && closes) {
      along.push([s, STRIP_SLIVER]);
    } else if (opens) {
      along.push([s, halfWidth], [s, STRIP_SLIVER]);
    } else if (closes) {
      along.push([s, STRIP_SLIVER], [s, halfWidth]);
    } else {
      const atEnd = gaps.some((g) => g.fromStation === s || g.toStation === s);
      along.push([s, inGap(s) || atEnd ? STRIP_SLIVER : halfWidth]);
    }
  }
  const edge = (side: -1 | 1, at: readonly [number, number][]) =>
    at.map(([s, w]) => geodeticOf(displayed(alignment.pointAt(s, side * w))));
  return [...edge(-1, along), ...edge(1, [...along].reverse())];
}

/** The regions clipped now, by site, so a site placed again replaces its own. */
const added = new WeakMap<Tileset3D, Map<string, unknown>>();

/**
 * Clips `globe`'s terrain inside `polygon`, for `site` (replacing what
 * was clipped for it before). Returns why it couldn't, if it couldn't
 * (the globe refuses some regions, saying why); nothing is clipped then.
 */
export function syncTerrainClip(
  globe: Tileset3D,
  site: string,
  polygon: readonly ClipVertex[] | undefined,
): string | undefined {
  let mine = added.get(globe);
  if (mine === undefined) {
    mine = new Map();
    added.set(globe, mine);
  }
  const before = mine.get(site);
  if (before !== undefined) {
    globe.removeTerrainClip(
      before as Parameters<typeof globe.removeTerrainClip>[0],
    );
    mine.delete(site);
  }
  if (polygon === undefined) {
    return undefined;
  }
  try {
    mine.set(site, globe.addTerrainClip({ polygon }));
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/** Draws `globe`'s terrain everywhere again (the page is leaving). */
export function clearTerrainClips(globe: Tileset3D): void {
  for (const site of [...(added.get(globe)?.keys() ?? [])]) {
    syncTerrainClip(globe, site, undefined);
  }
}
