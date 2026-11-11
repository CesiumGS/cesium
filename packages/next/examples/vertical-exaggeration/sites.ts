import type { Viewer } from "@cesium/next/widgets";
import { positionOf, type Place } from "./places.ts";

/** A place with the true height of the ground there, as far as the terrain has loaded. */
export interface Site {
  readonly place: Place;
  /** Metres above the WGS84 ellipsoid: the terrain's, true, whatever is drawn. Undefined until it loads. */
  height: number | undefined;
  /** Where it is in ITRF (m), at `height` (the ellipsoid's surface until it loads). */
  position: Float64Array;
}

/** Heights that differ by less than this, m, are the same: refinement under a metre moves nothing. */
const SETTLED = 0.25;

export function createSites(places: readonly Place[]): Site[] {
  return places.map((place) => ({
    place,
    height: undefined,
    position: positionOf(place, 0),
  }));
}

/**
 * Reads each site's ground height from the globe's terrain, again every
 * `interval` ms (finer tiles load for as long as the camera looks), and says
 * which sites moved. The heights are true ones: the globe samples its tiles
 * as they are, never as they are drawn. Returns what stops it.
 */
export function trackGround(
  viewer: Viewer,
  sites: readonly Site[],
  changed: (sites: readonly Site[]) => void,
  interval = 700,
): () => void {
  const read = () => {
    const globe = viewer.globe;
    if (!globe) {
      return;
    }
    const moved: Site[] = [];
    for (const site of sites) {
      const h = globe.surfaceHeight(
        (site.place.longitude * Math.PI) / 180,
        (site.place.latitude * Math.PI) / 180,
      );
      if (
        h !== undefined &&
        (site.height === undefined || Math.abs(h - site.height) > SETTLED)
      ) {
        site.height = h;
        site.position = positionOf(site.place, h);
        moved.push(site);
      }
    }
    if (moved.length > 0) {
      changed(moved);
    }
  };
  const timer = setInterval(read, interval);
  read();
  return () => clearInterval(timer);
}
