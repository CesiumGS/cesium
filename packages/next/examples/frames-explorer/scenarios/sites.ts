// The BIM site and the corridor on the ground (spec scenarios 5 and 6): the
// design CRSs the BIM site's knob chooses between, its site grid (an IFC map
// conversion: an origin in the CRS, a rotation and a scale), the 400 km
// rigid-against-exact line along the site grid's x axis, and the catalog's
// clothoid road on the measurement site's grid. Plain data and a few pure
// functions: the worker's evaluators (bimSite.ts, corridor.ts) and the page
// (scenes.ts, the overlays, the camera, the point's drag) read the same ones.
//
// Light imports only (scenes.ts's rule): the page never bundles the catalog.
import {
  Alignment,
  type AlignmentDefinition,
} from "../../../src/engineering/alignment.ts";
import type { CrsRef } from "../../../src/engineering/crs.ts";
import type { SiteTransform } from "../../../src/engineering/EngineeringFrame.ts";
import type { EngineeringSetup } from "../overlayConfig.ts";
import type { KnobState } from "./spec.ts";

const deg = Math.PI / 180;

/** US survey feet per metre (1200/3937 m to the foot, by definition). */
export const FTUS_PER_M = 3937 / 1200;

export type BimCrsId = "ca-zone-3" | "utm-10n" | "low-distortion";

/** A design CRS the BIM site can be delivered in, and where its site is. */
export interface BimCrs {
  id: BimCrsId;
  /** The engineering frame's name ("California zone 3"). */
  name: string;
  code: string;
  /** Two-dimensional: heights are ellipsoidal, so the exact line lies on the ellipsoid. */
  crs: CrsRef;
  /** Design units per metre. */
  unitsPerMeter: number;
  unit: "ftUS" | "m";
  /** The site origin in the CRS (design E, N), as the model's map conversion gives it. */
  origin: readonly [number, number];
  /** The origin on WGS 84, degrees, for the camera (to a few metres). */
  place: { longitude: number; latitude: number; where: string };
}

/** The California site (the catalog's SITE_ORIGIN, stress/shared.ts), near San Francisco. */
const SAN_FRANCISCO = {
  longitude: -122.442726,
  latitude: 37.746199,
  where: "San Francisco",
};

export const BIM_CRS: Readonly<Record<BimCrsId, BimCrs>> = {
  "ca-zone-3": {
    id: "ca-zone-3",
    name: "California zone 3",
    code: "EPSG:6420",
    crs: { format: "wkid", authority: "EPSG", wkid: 6420 },
    unitsPerMeter: FTUS_PER_M,
    unit: "ftUS",
    origin: [6_000_000, 2_100_000],
    place: SAN_FRANCISCO,
  },
  "utm-10n": {
    id: "utm-10n",
    name: "UTM zone 10N",
    code: "EPSG:32610",
    crs: { format: "wkid", authority: "EPSG", wkid: 32610 },
    unitsPerMeter: 1,
    unit: "m",
    // The same ground point as California zone 3's origin, to the
    // millimetre (test/data/framesExplorerScenarios checks it through PROJ).
    origin: [549_095.54, 4_177_802.068],
    place: SAN_FRANCISCO,
  },
  "low-distortion": {
    id: "low-distortion",
    name: "OCRS Portland zone",
    code: "EPSG:6854",
    crs: { format: "wkid", authority: "EPSG", wkid: 6854 },
    unitsPerMeter: 1,
    unit: "m",
    // The zone's own origin (its false easting and northing), in Portland:
    // a low-distortion zone covers about 60 km, so the site moves there.
    origin: [100_000, 50_000],
    place: { longitude: -122.75, latitude: 45.5, where: "Portland, Oregon" },
  },
};

/** The site grid's frame name in the tree. */
export const BIM_SITE_GRID = "BIM site grid";

/** The rigid and exact line along the site grid's x axis: its length and the inset's mark, metres. */
export const BIM_LINE = { length: 400_000, mark: 20_000 } as const;

/** The BIM site at `knobs`: its CRS and its site grid (the map conversion). */
export function bimSite(knobs: KnobState): {
  crs: BimCrs;
  site: SiteTransform;
  rotation: number;
  scale: number;
} {
  const crs = BIM_CRS[String(knobs.crs) as BimCrsId] ?? BIM_CRS["ca-zone-3"];
  const rotation = Number(knobs.rotation);
  const scale = Number(knobs.scale);
  return {
    crs,
    site: {
      origin: [crs.origin[0], crs.origin[1], 0],
      rotation: rotation * deg,
      scale,
    },
    rotation,
    scale,
  };
}

/**
 * The site grid's x axis's azimuth, degrees clockwise from grid north: 90°
 * less the rotation (counterclockwise from grid east). True north differs
 * by the convergence there (about a degree), which the camera ignores.
 */
export const siteAxisAzimuth = (rotation: number): number => 90 - rotation;

/** WGS 84's defining constants: a, m, and 1/f (NIMA TR8350.2). */
export const WGS84_A = 6_378_137;
export const WGS84_E2 = ((f: number) => f * (2 - f))(1 / 298.257223563);

/**
 * The radius of curvature of the ellipsoid (a, e²) at `latitude` (degrees)
 * in the direction `azimuth` (degrees from north), by Euler's theorem:
 * 1/R = cos²α/M + sin²α/N, M the meridian's and N the prime vertical's.
 */
export function normalRadius(
  a: number,
  e2: number,
  latitude: number,
  azimuth: number,
): number {
  const s = Math.sin(latitude * deg);
  const w = Math.sqrt(1 - e2 * s * s);
  const n = a / w;
  const m = (a * (1 - e2)) / w ** 3;
  const c = Math.cos(azimuth * deg);
  return 1 / ((c * c) / m + (1 - c * c) / n);
}

/**
 * The gap between rigid and exact placement `d` metres along a site grid's
 * axis, by hand (R11): the drop, the ellipsoid curving away under the
 * tangent plane, d²/2R in the axis's direction; and the part along it, the
 * site scale against the grid's scale that rigid placement ignores,
 * d (s/k − 1); at right angles, so the gap is their root sum square.
 */
export function rigidGapByHand(input: {
  d: number;
  radius: number;
  siteScale: number;
  gridScale: number;
}): { drop: number; along: number; gap: number } {
  const drop = (input.d * input.d) / (2 * input.radius);
  const along = input.d * (input.siteScale / input.gridScale - 1);
  return { drop, along, gap: Math.hypot(drop, along) };
}

/**
 * The catalog's clothoid road (measurement.clothoid): a tangent, a clothoid
 * in, a left arc of radius 800, a clothoid out and a tangent, eastbound
 * from (1000, 1000), stations 0 to 2000, in design units. The corridor puts
 * it on the measurement site's grid, so its units are US survey feet.
 */
export const CLOTHOID_ROAD: AlignmentDefinition = {
  name: "Clothoid road",
  start: [1000, 1000],
  startAzimuth: Math.PI / 2,
  startStation: 0,
  horizontal: [
    { kind: "line", length: 500 },
    { kind: "spiral", length: 300, startRadius: Infinity, endRadius: 800 },
    { kind: "arc", length: 400, radius: 800 },
    { kind: "spiral", length: 300, startRadius: 800, endRadius: Infinity },
    { kind: "line", length: 500 },
  ],
};

/** The measurement site the corridor sits on: California zone 3, θ = 12.5°, s = 1.0000375 (the catalog's). */
export const CORRIDOR_SITE: SiteTransform = {
  origin: [6_000_000, 2_100_000, 0],
  rotation: 12.5 * deg,
  scale: 1.0000375,
};

/** The corridor's site grid's frame name in the tree. */
export const CORRIDOR_SITE_GRID = "Measurement site grid";

/** "6+50.00": a station in hundreds of feet and the rest, as US road plans print it. */
export function stationText(station: number): string {
  const hundredths = Math.round(station * 100);
  const sign = hundredths < 0 ? "−" : "";
  const abs = Math.abs(hundredths);
  const hundreds = Math.floor(abs / 10_000);
  const rest = ((abs % 10_000) / 100).toFixed(2).padStart(5, "0");
  return `${sign}${hundreds}+${rest}`;
}

/** "15.00 ft right", "2.50 ft left", "on the centreline". */
export function offsetText(offset: number): string {
  const r = Math.round(offset * 100) / 100;
  if (r === 0) {
    return "on the centreline";
  }
  return `${Math.abs(r).toFixed(2)} ft ${r > 0 ? "right" : "left"}`;
}

/**
 * A point `e` metres east and `n` north of (`longitude`, `latitude`), degrees,
 * on a sphere of the Earth's mean radius: for the camera only.
 */
export function offsetPlace(
  longitude: number,
  latitude: number,
  e: number,
  n: number,
): { longitude: number; latitude: number } {
  const R = 6_371_008.8;
  return {
    longitude: longitude + e / (R * Math.cos(latitude * deg)) / deg,
    latitude: latitude + n / R / deg,
  };
}

/** Lines on a 10 km grid around `origin` (design units), `half` metres each way, snapped to the grid. */
function gridAround(
  origin: readonly [number, number],
  unitsPerMeter: number,
  half: number,
): EngineeringSetup["gridExtent"] {
  const step = 10_000;
  const lo = (v: number) =>
    Math.floor((v / unitsPerMeter - half) / step) * step * unitsPerMeter;
  const hi = (v: number) =>
    Math.ceil((v / unitsPerMeter + half) / step) * step * unitsPerMeter;
  return {
    min: [lo(origin[0]), lo(origin[1])],
    max: [hi(origin[0]), hi(origin[1])],
  };
}

/** "θ = 12.5°, s = 1.0000375". */
const siteWords = (rotation: number, scale: number) =>
  `θ = ${rotation.toString().replace("-", "−")}°, s = ${scale}`;

/**
 * The BIM site's overlays at `knobs` (stops 3 and 4, absorbed): the CRS's
 * design grid with true north, 100 km each way of the site; the site grid,
 * 10 km each way of its origin; and the 400 km rigid-and-exact line along
 * the site grid's x axis from its origin, the inset's mark at 20 km.
 */
export function bimEngineering(knobs: KnobState): EngineeringSetup {
  const { crs, site, rotation, scale } = bimSite(knobs);
  const u = crs.unitsPerMeter;
  const half = 10_000 * u;
  return {
    name: crs.name,
    crs: crs.crs,
    unitsPerMeter: u,
    gridExtent: gridAround(crs.origin, u, 100_000),
    site: {
      transform: site,
      extent: { min: [-half, -half], max: [half, half] },
      step: 2000 * u,
      segment: 100 * u,
      label: `BIM site grid (${siteWords(rotation, scale)})`,
    },
    rigid: {
      frame: {
        name: `${crs.name} site`,
        body: "earth",
        crs: crs.crs,
        site,
      },
      from: [0, 0],
      to: [BIM_LINE.length * u, 0],
      mark: BIM_LINE.mark * u,
      origin: "the BIM site's origin",
      direction: "along the site grid's x axis",
      start: {
        longitude: crs.place.longitude,
        latitude: crs.place.latitude,
        azimuth: siteAxisAzimuth(rotation),
      },
    },
    gridLabel: `${crs.name} design grid, with true north`,
    look: [crs.place.longitude, crs.place.latitude, 180_000],
  };
}

/** The road's middle (station 1000) in the site grid, design units. */
const ROAD_MIDDLE = new Alignment(CLOTHOID_ROAD).pointAt(1000, 0);

/** The road's middle on WGS 84, degrees: for the camera only (to a few tens of metres). */
export function corridorPlace(): { longitude: number; latitude: number } {
  const ca = BIM_CRS["ca-zone-3"];
  const m = CORRIDOR_SITE.scale / ca.unitsPerMeter;
  const [e, n] = [ROAD_MIDDLE[0]! * m, ROAD_MIDDLE[1]! * m];
  const c = Math.cos(CORRIDOR_SITE.rotation);
  const s = Math.sin(CORRIDOR_SITE.rotation);
  return offsetPlace(
    ca.place.longitude,
    ca.place.latitude,
    c * e - s * n,
    s * e + c * n,
  );
}

/**
 * The corridor's overlays: the measurement site's grid around the road,
 * 250 ft lines (the road is 2,000 ft long, its ticks every 100 ft); California zone 3's design grid
 * and the rigid line as by default (the scene doesn't draw them).
 */
export function corridorEngineering(
  defaults: EngineeringSetup,
): EngineeringSetup {
  const place = corridorPlace();
  return {
    ...defaults,
    name: BIM_CRS["ca-zone-3"].name,
    crs: BIM_CRS["ca-zone-3"].crs,
    site: {
      transform: CORRIDOR_SITE,
      extent: { min: [500, 500], max: [3500, 2500] },
      step: 250,
      segment: 25,
      label: `Measurement site grid (${siteWords(12.5, CORRIDOR_SITE.scale)}), 250 ft lines`,
    },
    look: [place.longitude, place.latitude, 1600],
  };
}
