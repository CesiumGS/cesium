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
 * The corridor's strip: its left edge from start to end, then its right
 * edge back, `halfWidth` design units either side of the centreline, a
 * vertex every `step` design units (and at both ends).
 */
export function stripRegion(
  alignment: Alignment,
  displayed: Displayed,
  halfWidth: number,
  step: number,
): ClipVertex[] {
  const stations: number[] = [];
  for (let s = alignment.startStation; s < alignment.endStation; s += step) {
    stations.push(s);
  }
  stations.push(alignment.endStation);
  const edge = (offset: number, at: readonly number[]) =>
    at.map((s) => geodeticOf(displayed(alignment.pointAt(s, offset))));
  return [
    ...edge(-halfWidth, stations),
    ...edge(halfWidth, [...stations].reverse()),
  ];
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
