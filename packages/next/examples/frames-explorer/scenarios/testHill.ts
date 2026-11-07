// A test hill (Task 7): loaded terrain the line of sight can be checked
// against by hand. One drawn tile, a level sea with a straight ridge across
// it along a meridian, a tent in section whose crest lies on a grid line,
// so the drawn surface's crest height is the ridge's exactly. The mast and
// the buoy stand on the sea either side of it; by hand the sight line is
// blocked when it passes the crest's meridian below the crest. The catalog
// (frame-tree.body-frame.sight-over-hill) and the tests trace the same hill
// through the library's `terrainLineOfSight`.
import { EARTH_MEAN_RADIUS } from "../units.ts";
import type {
  TerrainRayTarget,
  TerrainRayTile,
} from "../../../src/globe/terrainRay.ts";
import { LEVEL_ZERO_ERROR } from "../../../src/globe/TerrainSource.ts";
import { Ellipsoid } from "../../../src/math/ellipsoid.ts";

type Rectangle = TerrainRayTile["rectangle"];
type TerrainHeights = TerrainRayTile["heights"];

const Q = 32767;
const deg = Math.PI / 180;

export interface TestHill {
  target: TerrainRayTarget;
  /** The crest's longitude (radians, as drawn) and its height (m). */
  crest: { longitude: number; height: number };
  /** The sea's height (m). */
  sea: number;
  /** A point on the sea `east` m east of the crest at the hill's latitude, `up` m above it (Earth-fixed). */
  at(east: number, up: number): Float64Array;
}

/**
 * A ridge `height` m above a sea at `sea` m, its crest along the meridian
 * through (`longitude`, `latitude`) degrees, falling to the sea over
 * `halfWidth` m either side, on one tile `span` m square. A
 * height of 0 is a level sea: flat ground to aim a camera at.
 */
export function testHill(options: {
  longitude: number;
  latitude: number;
  height: number;
  sea?: number;
  halfWidth?: number;
  span?: number;
  /** The tile's level (default 16): its geometric error, as the drawn globe's. */
  level?: number;
}): TestHill {
  const sea = options.sea ?? 0;
  const span = options.span ?? 30_000;
  const halfWidth = options.halfWidth ?? 600;
  const n = 101;
  const R = EARTH_MEAN_RADIUS;
  const lat = options.latitude * deg;
  const dLon = span / (R * Math.cos(lat));
  const dLat = span / R;
  const rectangle: Rectangle = {
    west: options.longitude * deg - dLon / 2,
    east: options.longitude * deg + dLon / 2,
    south: lat - dLat / 2,
    north: lat + dLat / 2,
  };
  const lonOf = (u: number) =>
    rectangle.west + (u / Q) * (rectangle.east - rectangle.west);
  const line = (i: number) => Math.round((i / (n - 1)) * Q);
  // The crest on the middle grid line, as quantized.
  const crestLon = lonOf(line((n - 1) / 2));
  const metresPerRadian = R * Math.cos(lat);
  const ridge = (lon: number) =>
    sea +
    options.height *
      Math.max(0, 1 - (Math.abs(lon - crestLon) * metresPerRadian) / halfWidth);
  const count = n * n;
  const u = new Uint16Array(count);
  const v = new Uint16Array(count);
  const metres = new Float64Array(count);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      u[k] = line(i);
      v[k] = line(j);
      metres[k] = ridge(lonOf(u[k]!));
    }
  }
  const minimumHeight = sea;
  const maximumHeight = sea + options.height;
  const h = new Uint16Array(count);
  for (let k = 0; k < count; k++) {
    h[k] =
      options.height > 0
        ? Math.round(((metres[k]! - minimumHeight) / options.height) * Q)
        : 0;
  }
  const triangles = new Uint32Array((n - 1) * (n - 1) * 6);
  let t = 0;
  for (let j = 0; j + 1 < n; j++) {
    for (let i = 0; i + 1 < n; i++) {
      const a = j * n + i;
      triangles.set([a, a + 1, a + n, a + 1, a + n + 1, a + n], t);
      t += 6;
    }
  }
  const heights: TerrainHeights = {
    u,
    v,
    h,
    triangles,
    minimumHeight,
    maximumHeight,
  };
  const level = options.level ?? 16;
  const tile = {
    rectangle,
    heights,
    level,
    geometricError: LEVEL_ZERO_ERROR / 2 ** level,
  };
  const target: TerrainRayTarget = {
    ellipsoid: Ellipsoid.WGS84,
    maximumHeight: maximumHeight + 100,
    patchAt: (longitude, latitude) =>
      longitude >= rectangle.west &&
      longitude <= rectangle.east &&
      latitude >= rectangle.south &&
      latitude <= rectangle.north
        ? { rectangle, tile }
        : {
            // Beyond the tile: one patch of unknown terrain to the antipode.
            rectangle: unknownAround(rectangle, longitude, latitude),
            unknown: "not drawn",
          },
  };
  return {
    target,
    crest: { longitude: crestLon, height: maximumHeight },
    sea,
    at: (east, up) =>
      Ellipsoid.WGS84.cartographicToCartesian(
        {
          longitude: crestLon + east / metresPerRadian,
          latitude: lat,
          height: sea + up,
        },
        new Float64Array(3),
      ),
  };
}

/** A rectangle outside `r` holding (`lon`, `lat`): the band west, east, south or north of it. */
function unknownAround(r: Rectangle, lon: number, lat: number): Rectangle {
  if (lon < r.west) {
    return {
      west: -Math.PI,
      east: r.west,
      south: -Math.PI / 2,
      north: Math.PI / 2,
    };
  }
  if (lon > r.east) {
    return {
      west: r.east,
      east: Math.PI,
      south: -Math.PI / 2,
      north: Math.PI / 2,
    };
  }
  return lat < r.south
    ? { west: r.west, east: r.east, south: -Math.PI / 2, north: r.south }
    : { west: r.west, east: r.east, south: r.north, north: Math.PI / 2 };
}

/**
 * By hand: where the straight segment `from`–`to` (Earth-fixed) crosses the
 * meridian `longitude` (radians), its height above the ellipsoid there, m:
 * the crossing is linear in the segment's parameter, p(t)·(−sin λ, cos λ, 0) = 0.
 */
export function heightOverMeridian(
  from: ArrayLike<number>,
  to: ArrayLike<number>,
  longitude: number,
): number | undefined {
  const w = [-Math.sin(longitude), Math.cos(longitude)];
  const f = from[0]! * w[0]! + from[1]! * w[1]!;
  const g = to[0]! * w[0]! + to[1]! * w[1]!;
  if (f === g) {
    return undefined;
  }
  const t = f / (f - g);
  if (t < 0 || t > 1) {
    return undefined;
  }
  const p = Float64Array.of(
    from[0]! + t * (to[0]! - from[0]!),
    from[1]! + t * (to[1]! - from[1]!),
    from[2]! + t * (to[2]! - from[2]!),
  );
  return Ellipsoid.WGS84.cartesianToCartographic(p, {
    longitude: 0,
    latitude: 0,
    height: 0,
  })?.height;
}
