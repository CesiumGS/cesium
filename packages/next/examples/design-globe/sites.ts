// The design globe's portfolio, as data (plan 4b Task 12; the plan's call
// 19): seven sites, each in its own national CRS and height system, and a
// building on a site grid beside the corridor. Since Task 17b the seven are
// a scale ladder (owner, 2026-11-07: infrastructure "big enough to show
// that the reprojection error is real and matters"): from a single
// building through a city block, a port, a solar farm, an airport and a
// campus to a 30 km pole line, each a `PortfolioModel` on one flat design
// plane. The generator (scripts/designTiles.mjs) builds a rigid and a
// reprojected tileset for each, and a rigid one for the site-grid building.
//
// A site's `grids` are exactly the grids its frame's operation reads, as
// `EngineeringFrame.load` resolves it from PROJ-data 1.25.0's catalog and
// proj.db 9.7.1 (checked by test/data/designGlobeSites.test.ts). Where PROJ
// ranks a candidate ahead of the one a reader might expect, the site follows
// PROJ (stated on the site), except a NAVD88 height, which reads GEOID18,
// NGS's current model: where PROJ ranks a superseded geoid (GEOID99,
// GEOID03) ahead of it, the site pins GEOID18's operation. Origins and
// models are in each CRS's own units, in normalized axis order (easting
// first); heights are in the CRS's height system.
//
// Erasable TypeScript only (no enums, no parameter properties): the Node
// generator imports this file directly.
import type { AreaOfInterest, CrsRef } from "../../src/engineering/crs.ts";
import type { EngineeringFrameDefinition } from "../../src/engineering/EngineeringFrame.ts";
import type { PlacementMode } from "../../src/streaming/designPlacement.ts";
import { EARTH } from "../../src/scene/Body.ts";
import {
  CORRIDOR_ALIGNMENT,
  CORRIDOR_CRS,
  CORRIDOR_PIPELINE,
} from "./corridor.ts";

/** One building, a box per storey (the site-grid building, and Amsterdam's). */
export interface BuildingModel {
  readonly kind: "building";
  /** Along design east and north, design units. */
  readonly width: number;
  readonly depth: number;
  readonly stories: number;
  readonly storyHeight: number;
}

/** A district of city blocks between streets, its buildings from `seed`. */
export interface BlockModel {
  readonly kind: "block";
  /** Blocks along the grid's direction and across it. */
  readonly blocksAlong: number;
  readonly blocksAcross: number;
  /** A block's size along and across, and a street's width, design units. */
  readonly blockLength: number;
  readonly blockWidth: number;
  readonly street: number;
  /** The street grid's direction, radians counterclockwise from design east. */
  readonly angle: number;
  readonly seed: number;
}

/** A container port: basin, quay, crane apron, yard and a back strip. */
export interface PortModel {
  readonly kind: "port";
  /** Along the quay, design units. */
  readonly quayLength: number;
  /** Across, from the sea inward: the basin, the apron, the yard. */
  readonly basinWidth: number;
  readonly apronDepth: number;
  readonly yardDepth: number;
  /** Rows of stacking blocks in the yard, and the roads between them. */
  readonly yardRows: number;
  readonly yardRoad: number;
  /** The deck above the sea, design units. */
  readonly deckHeight: number;
  /** Ship-to-shore cranes on the quay. */
  readonly cranes: number;
  /** The quay's direction, radians counterclockwise from design east. */
  readonly angle: number;
  readonly seed: number;
}

/** A solar farm: blocks of fixed-tilt tables facing south, in east-west rows. */
export interface SolarFarmModel {
  readonly kind: "solarFarm";
  readonly blocksEast: number;
  readonly blocksNorth: number;
  /** A block along east and north, and a road's width, design units. */
  readonly blockLength: number;
  readonly blockWidth: number;
  readonly road: number;
  /** Row to row, a table's length along its row, the gap between tables. */
  readonly rowPitch: number;
  readonly tableLength: number;
  readonly tableGap: number;
  /** A table's slant width, its tilt (radians), and its low edge's height. */
  readonly tableWidth: number;
  readonly tilt: number;
  readonly lowEdge: number;
}

/** A runway: its two ends' designations and its place in the airport's frame. */
export interface AirportRunway {
  /** The end flown along the airport's azimuth first ("16R"), then the other. */
  readonly designations: readonly [string, string];
  readonly length: number;
  readonly width: number;
  /** The centreline's offset to the left of the azimuth, and its middle along it. */
  readonly across: number;
  readonly along: number;
}

/** An airport: parallel runways, their taxiways, and the terminal between. */
export interface AirportModel {
  readonly kind: "airport";
  /** The runways' direction (a "16" end's heading), radians clockwise from grid north. */
  readonly azimuth: number;
  readonly runways: readonly AirportRunway[];
  /** A parallel taxiway's offset from its runway, and a taxiway's width. */
  readonly taxiwayOffset: number;
  readonly taxiwayWidth: number;
  /** The terminal's hall along the runways, its depth, and its piers either side. */
  readonly terminal: {
    readonly length: number;
    readonly depth: number;
    readonly piers: number;
  };
  readonly seed: number;
}

/** A campus: a grid of superblocks between roads on one site plan. */
export interface CampusModel {
  readonly kind: "campus";
  /** Along design east and north, design units. */
  readonly width: number;
  readonly depth: number;
  /** A superblock's side, and a road's width. */
  readonly superBlock: number;
  readonly road: number;
  readonly seed: number;
}

/** An overhead pole line along a route of straight legs. */
export interface PoleLineModel {
  readonly kind: "poleLine";
  /** The route's corners, design units from the site's origin. */
  readonly route: readonly (readonly [number, number])[];
  /** Pole to pole (each leg in whole spans), a pole's height, the cross-arm. */
  readonly span: number;
  readonly poleHeight: number;
  readonly armLength: number;
  /** The conductors' sag at mid-span, and the wayleave strip's width. */
  readonly sag: number;
  readonly wayleave: number;
}

/**
 * A portfolio site's model, by kind, in design units (the CRS's own) and
 * radians. Every one is on one flat design plane at the origin's height, so
 * a rigid placement of it errs at d from its anchor by the curvature it
 * ignores (d²/2R, below the plane), the combined scale factor k it ignores
 * (d·|1 − 1/k|, along it) and the geoid's slope: the scale factor
 * dominates the small models, the curvature the large ones (the generator's
 * `answers.sites[id].terms`).
 */
export type PortfolioModel =
  | BuildingModel
  | BlockModel
  | PortModel
  | SolarFarmModel
  | AirportModel
  | CampusModel
  | PoleLineModel;

export interface PortfolioSite<M extends PortfolioModel = PortfolioModel> {
  /** Unique; names its generated tilesets (`portfolio-<id>-rigid/` and `-reprojected/`, or `site-building/`). */
  readonly id: string;
  readonly name: string;
  /** Where it is, in words. */
  readonly place: string;
  /** Its civil time zone, by IANA name: the time controls show its clock. */
  readonly timeZone: string;
  readonly frame: EngineeringFrameDefinition;
  /**
   * In design coordinates (the frame's units): a building's corner (it
   * extends `width` east and `depth` north); any other model's middle, at
   * its ground's height.
   */
  readonly origin: [number, number, number];
  readonly model: M;
  /** The grids the frame's operation reads (PROJ-data catalog names). */
  readonly grids: readonly string[];
}

/**
 * The design point a rigid placement of the site's model is exact at: its
 * footprint's middle at its ground's height.
 */
export function modelAnchor(site: PortfolioSite): [number, number, number] {
  const [e, n, u] = site.origin;
  return site.model.kind === "building"
    ? [e + site.model.width / 2, n + site.model.depth / 2, u]
    : [e, n, u];
}

/**
 * The model's footprint as the four design corners of a rectangle that
 * holds it, at its ground's height, counterclockwise: for ordering,
 * framing and areas of interest (the generator's answers have the exact
 * extent).
 */
export function modelFootprint(
  site: PortfolioSite,
): [number, number, number][] {
  const m = site.model;
  const [e, n, u] = modelAnchor(site);
  let half: [number, number];
  let angle = 0;
  switch (m.kind) {
    case "building":
      half = [m.width / 2, m.depth / 2];
      break;
    case "block":
      half = [
        (m.blocksAlong * m.blockLength + (m.blocksAlong + 1) * m.street) / 2,
        (m.blocksAcross * m.blockWidth + (m.blocksAcross + 1) * m.street) / 2,
      ];
      angle = m.angle;
      break;
    case "port":
      half = [
        m.quayLength / 2,
        (PORT_BREAKWATER +
          m.basinWidth +
          m.apronDepth +
          m.yardDepth +
          PORT_BACK_STRIP) /
          2,
      ];
      angle = m.angle;
      break;
    case "solarFarm":
      half = [
        (m.blocksEast * m.blockLength + (m.blocksEast + 1) * m.road) / 2,
        (m.blocksNorth * m.blockWidth + (m.blocksNorth + 1) * m.road) / 2,
      ];
      break;
    case "airport": {
      const ends = m.runways.flatMap((r) => [
        Math.abs(r.along - r.length / 2),
        Math.abs(r.along + r.length / 2),
      ]);
      half = [
        Math.max(...ends) + 150,
        Math.max(...m.runways.map((r) => Math.abs(r.across))) + 200,
      ];
      angle = Math.PI / 2 - m.azimuth;
      break;
    }
    case "campus":
      half = [(m.width + m.road) / 2, (m.depth + m.road) / 2];
      break;
    case "poleLine":
      half = [
        Math.max(...m.route.map((p) => Math.abs(p[0]))) + m.wayleave,
        Math.max(...m.route.map((p) => Math.abs(p[1]))) + m.wayleave,
      ];
      break;
  }
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([a, b]) => [
    e + c * a! * half[0] - s * b! * half[1],
    n + s * a! * half[0] + c * b! * half[1],
    u,
  ]);
}

/**
 * A model laid along a line rather than over an area: its route at its
 * ground's height (design units, absolute) and how far its foundations reach
 * either side and past its ends. London's pole line: the wayleave strip, 6 m
 * either side, which holds every pole and the stays at its angle and end
 * poles, anchored 6 m out (scripts/designTiles/poleLineMesh.mjs). Undefined
 * for a model that covers its footprint.
 */
export function modelRoute(site: PortfolioSite):
  | {
      readonly points: readonly [number, number, number][];
      readonly halfWidth: number;
    }
  | undefined {
  const m = site.model;
  if (m.kind !== "poleLine") {
    return undefined;
  }
  const [e, n, u] = site.origin;
  return {
    points: m.route.map(([de, dn]) => [e + de, n + dn, u]),
    halfWidth: m.wayleave / 2,
  };
}

/** The port's breakwater and back strip, across, metres (scripts/designTiles/portMesh.mjs). */
export const PORT_BREAKWATER = 30;
export const PORT_BACK_STRIP = 150;

const wkid = (horizontal: number, vertical: number): CrsRef => ({
  format: "wkid",
  authority: "EPSG",
  wkid: horizontal,
  vcsWkid: vertical,
});

/**
 * An area around a site's origin (degrees, longitude then latitude), 0.03°
 * each way unless its model needs more.
 */
const around = (
  longitude: number,
  latitude: number,
  halfLongitude = 0.03,
  halfLatitude = 0.03,
): AreaOfInterest => ({
  west: longitude - halfLongitude,
  south: latitude - halfLatitude,
  east: longitude + halfLongitude,
  north: latitude + halfLatitude,
});

const EGM96_GRID = "us_nga_egm96_15.tif";
const GEOID18_GRID = "us_noaa_g2018u0.tif";

/**
 * NAD83(2011) / Arizona Central (ft) + NAVD88 height (ft), EPSG:6405+8228, to
 * WGS 84 (EPSG:4979) through GEOID18: PROJ's "Inverse of SPCS83 Arizona
 * Central zone (international foot) + Conversion from NAVD88 height (ft) to
 * NAVD88 height + Inverse of NAD83(2011) to NAVD88 height (3) + NAD83(2011)
 * to WGS 84 (1)", stated ±2.015 m, as proj.db 9.7.1 writes it within the
 * Phoenix site's area (recorded 2026-11-07). GEOID18 is defined on
 * NAD83(2011), the CRS's own datum, so no horizontal grid is needed.
 */
export const PHOENIX_PIPELINE =
  "+proj=pipeline +step +proj=unitconvert +xy_in=ft +xy_out=m +step +inv +proj=tmerc +lat_0=31 +lon_0=-111.916666666667 +k=0.9999 +x_0=213360 +y_0=0 +ellps=GRS80 +step +proj=unitconvert +z_in=ft +z_out=m +step +proj=vgridshift +grids=us_noaa_g2018u0.tif +multiplier=1 +step +proj=unitconvert +xy_in=rad +xy_out=deg";

/**
 * The site-grid building: 200 × 120 ftUS, three stories of 13 ft, on a site
 * grid of the corridor's CRS 2,000 ftUS east and 1,500 ftUS north of the
 * alignment's start, rotated 12.5° and scaled by 1.0000375 (a ground-to-grid
 * factor). Rigid by design: curvature doesn't matter over 200 ft.
 *
 * It pins the corridor's GEOID18 operation (`CORRIDOR_PIPELINE`), so its one
 * grid is `us_noaa_g2018u0.tif`: PROJ ranks NADCON5 with GEOID99 or GEOID03
 * (1.14 m) ahead of it by stated accuracy, but both geoids are superseded
 * for NAVD88.
 */
export const SITE_BUILDING: PortfolioSite<BuildingModel> = {
  id: "site-building",
  name: "Site-grid building",
  place: "Beside the corridor's start, Oakland hills, California",
  timeZone: "America/Los_Angeles",
  frame: {
    name: "Site-grid building",
    body: EARTH,
    crs: CORRIDOR_CRS,
    pipeline: CORRIDOR_PIPELINE,
    site: {
      origin: [
        CORRIDOR_ALIGNMENT.start[0] + 2_000,
        CORRIDOR_ALIGNMENT.start[1] + 1_500,
        0,
      ],
      rotation: (12.5 * Math.PI) / 180,
      scale: 1.0000375,
    },
    areaOfInterest: around(-122.16, 37.782),
  },
  // Its corner at the ground's height there, NAVD88 ftUS: the hillside is
  // about 291.6 m above NAVD88 (Cesium World Terrain's 259.3 m above the
  // ellipsoid, less GEOID18's −32.2 m). At 0 it stood 290 m underground,
  // drawn through the ellipsoid globe's coarse tiles, whose chords sag
  // below the ellipsoid by more than the geoid's 32 m (feedback F3).
  origin: [0, 0, 956],
  model: {
    kind: "building",
    width: 200,
    depth: 120,
    stories: 3,
    storyHeight: 13,
  },
  grids: [GEOID18_GRID],
};

/**
 * Call 19's seven sites, in its order, each with its rung of the scale
 * ladder (Task 17b; `LADDER` is them smallest first). Every model is at a
 * place where it belongs, in the CRS and height system a project there
 * uses.
 */
export const PORTFOLIO: readonly PortfolioSite[] = [
  {
    id: "london",
    name: "London: a pole line",
    place:
      "Across mid-Essex farmland, north of Chelmsford, England: 30 km of 11 kV overhead line",
    timeZone: "Europe/London",
    frame: {
      name: "London: a pole line",
      body: EARTH,
      // OSGB36 / British National Grid + ODN height.
      crs: wkid(27700, 5701),
      areaOfInterest: around(0.389, 51.746, 0.25, 0.06),
    },
    origin: [565_000, 208_000, 40],
    // About 30.7 km end to end, poles every 50 m.
    model: {
      kind: "poleLine",
      route: [
        [-15_100, -2_800],
        [-7_600, -1_200],
        [-1_900, 0],
        [4_100, 1_000],
        [9_700, 2_300],
        [15_100, 2_800],
      ],
      span: 50,
      poleHeight: 11,
      armLength: 2.4,
      sag: 0.9,
      wayleave: 12,
    },
    // OSTN15 (horizontal) and OSGM15 (ODN), 1.038 m.
    grids: ["uk_os_OSGM15_GB.tif", "uk_os_OSTN15_NTv2_OSGBtoETRS.tif"],
  },
  {
    id: "sydney",
    name: "Sydney: an airport",
    place: "Mascot, Sydney, Australia, where Kingsford Smith airport is",
    timeZone: "Australia/Sydney",
    frame: {
      name: "Sydney: an airport",
      body: EARTH,
      // GDA2020 / MGA zone 56 + AHD height.
      crs: wkid(7856, 5711),
      areaOfInterest: around(151.18, -33.945),
    },
    origin: [331_800, 6_242_450, 6],
    // About 4 km: runways of 3,400 m and 2,400 m, 1,040 m apart.
    model: {
      kind: "airport",
      azimuth: (165 * Math.PI) / 180,
      runways: [
        {
          designations: ["16R", "34L"],
          length: 3_400,
          width: 45,
          across: -520,
          along: 0,
        },
        {
          designations: ["16L", "34R"],
          length: 2_400,
          width: 45,
          across: 520,
          along: -300,
        },
      ],
      taxiwayOffset: 180,
      taxiwayWidth: 23,
      terminal: { length: 520, depth: 70, piers: 3 },
      seed: 7856,
    },
    // AUSGeoid2020 (AHD), 3.15 m.
    grids: ["au_ga_AUSGeoid2020_20180201.tif"],
  },
  {
    id: "tokyo",
    name: "Tokyo: a city block",
    place: "Marunouchi, by Tokyo Station, Japan",
    timeZone: "Asia/Tokyo",
    frame: {
      name: "Tokyo: a city block",
      body: EARTH,
      // JGD2011 / Japan Plane Rectangular CS IX + JGD2011 (vertical) height.
      // The CRS's axes are northing first (X north, Y east); design
      // coordinates are in normalized order, easting first.
      crs: wkid(6677, 6695),
      areaOfInterest: around(139.756, 35.68),
    },
    origin: [-7_000, -35_500, 3],
    // About 1 km: five blocks by four, the street grid turned 0.3 rad.
    model: {
      kind: "block",
      blocksAlong: 5,
      blocksAcross: 4,
      blockLength: 130,
      blockWidth: 110,
      street: 24,
      angle: 0.3,
      seed: 6677,
    },
    // JPGEO2024, 1.03 m: PROJ ranks it ahead of GSIGEO2011 (no stated
    // accuracy), and it has been GSI's official geoid since 2025-04-01
    // (plan 4b Task 9).
    grids: ["jp_gsi_jpgeo2024.tif"],
  },
  {
    id: "amsterdam",
    name: "Amsterdam: a canal building",
    place: "Grachtengordel, Amsterdam, Netherlands",
    timeZone: "Europe/Amsterdam",
    frame: {
      name: "Amsterdam: a canal building",
      body: EARTH,
      // Amersfoort / RD New + NAP height.
      crs: wkid(28992, 5709),
      areaOfInterest: around(4.888, 52.37),
    },
    origin: [121_000, 487_000, 1],
    // About 60 m across its diagonal.
    model: {
      kind: "building",
      width: 52,
      depth: 30,
      stories: 5,
      storyHeight: 3.2,
    },
    // RDNAPTRANS2018: the RD correction grid and NLGEO2018 (NAP), 1.001 m.
    grids: ["nl_nsgi_nlgeo2018.tif", "nl_nsgi_rdtrans2018.tif"],
  },
  {
    id: "nairobi",
    name: "Nairobi: a campus",
    place:
      "On the Konza plain, Machakos County, Kenya, about 60 km south-east of Nairobi",
    timeZone: "Africa/Nairobi",
    frame: {
      name: "Nairobi: a campus",
      body: EARTH,
      // WGS 84 / UTM zone 37S + EGM96 height.
      crs: wkid(32737, 5773),
      areaOfInterest: around(37.139, -1.709, 0.07, 0.07),
    },
    origin: [293_000, 9_811_000, 1_640],
    // About 10 km: twelve superblocks by eight, 700 m each.
    model: {
      kind: "campus",
      width: 8_400,
      depth: 5_600,
      superBlock: 700,
      road: 30,
      seed: 32737,
    },
    // EGM96, 1 m.
    grids: [EGM96_GRID],
  },
  {
    id: "phoenix",
    name: "Phoenix: a solar farm",
    place:
      "The Gila River valley south of Phoenix, Arizona, on the zone's central meridian; in international feet, where the corridor is in US survey feet",
    timeZone: "America/Phoenix",
    frame: {
      name: "Phoenix: a solar farm",
      body: EARTH,
      // NAD83(2011) / Arizona Central (ft) + NAVD88 height (ft), both in
      // international feet (0.3048 m), a contrast with California's US
      // survey feet. NAD83(2011), not the original NAD83 of EPSG:2223: what
      // a contemporary Arizona project uses. The same projection, so the
      // same origin.
      crs: wkid(6405, 8228),
      pipeline: PHOENIX_PIPELINE,
      areaOfInterest: around(-111.917, 33.12),
    },
    // On the central meridian (the false easting, 700,000 ft), the zone's
    // centre line, at 33.12° N.
    origin: [700_000, 771_000, 1_250],
    // About 4 km (13,100 ft): eleven blocks by eight, tables tilted 25°.
    model: {
      kind: "solarFarm",
      blocksEast: 11,
      blocksNorth: 8,
      blockLength: 980,
      blockWidth: 800,
      road: 40,
      rowPitch: 22,
      tableLength: 98,
      tableGap: 4,
      tableWidth: 13.5,
      tilt: (25 * Math.PI) / 180,
      lowEdge: 2.5,
    },
    // Pinned to GEOID18 (`PHOENIX_PIPELINE`), as the California frames
    // are: PROJ's best candidate within the area, 1.14 m, is NADCON5 back
    // to NAD83(HARN) with GEOID99's tile 6, a superseded NAVD88 geoid,
    // ranked ahead of the GEOID18 operation (2.015 m) by stated accuracy.
    grids: [GEOID18_GRID],
  },
  {
    id: "jakarta",
    name: "Jakarta: a container port",
    place: "Tanjung Priok, North Jakarta, Indonesia",
    timeZone: "Asia/Jakarta",
    frame: {
      name: "Jakarta: a container port",
      body: EARTH,
      // SRGI2013 / UTM zone 48S + INAGeoid2020 v1 height. proj.db relates
      // the height only through INAGEOID2020v1.gtx, which PROJ-data lacks,
      // so the frame reads design heights as EGM96 heights (call 9), with
      // no stated accuracy for the swap (no fallbackSigma). It replaced São
      // Paulo: proj.db 9.7.1 has no Brazilian vertical CRS.
      crs: wkid(9488, 9471),
      areaOfInterest: around(106.889, -6.103),
      geoidFallback: "EGM96",
    },
    origin: [709_000, 9_325_000, 3],
    // About 3 km: a 2,600 m quay, the yard 820 m deep behind its apron.
    model: {
      kind: "port",
      quayLength: 2_600,
      basinWidth: 520,
      apronDepth: 70,
      yardDepth: 820,
      yardRows: 7,
      yardRoad: 18,
      deckHeight: 3,
      cranes: 12,
      angle: 0,
      seed: 9488,
    },
    grids: [EGM96_GRID],
  },
];

/**
 * The scale ladder (owner, 2026-11-07): the portfolio, smallest model
 * first, by the generator's measured extents. The airport (3.97 km) and the
 * solar farm (4.00 km) are both about 4 km; the farm's rigid error is the
 * larger, as Arizona Central's combined factor at the farm is 0.99985.
 */
export const LADDER: readonly PortfolioSite[] = [
  "amsterdam",
  "tokyo",
  "jakarta",
  "sydney",
  "phoenix",
  "nairobi",
  "london",
].map((id) => PORTFOLIO.find((s) => s.id === id)!);

/** A portfolio slot for a Cesium ion asset whose frame the app supplies. */
export interface IonSlot {
  readonly label: string;
  readonly ionAssetId?: number;
  readonly frame?: EngineeringFrameDefinition;
  readonly placement?: PlacementMode;
}

/**
 * The empty ion slots (held item 2): ion records no CRS for an asset, so
 * each needs its frame (CRS, units, site transform) and placement mode from
 * the owner before it can be filled.
 */
export const ION_SLOTS: readonly IonSlot[] = [
  { label: "Metrostation (share key)" },
  { label: "Your long iModel" },
];
