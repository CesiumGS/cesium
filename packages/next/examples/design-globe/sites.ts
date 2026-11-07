// The design globe's portfolio, as data (plan 4b Task 12; the plan's call
// 19): a small building at each of seven sites, each in its own national
// CRS and height system, and one on a site grid beside the corridor. The
// generator (scripts/designTiles.mjs) builds a rigid tileset for each.
//
// A site's `grids` are exactly the grids its frame's operation reads, as
// `EngineeringFrame.load` resolves it from PROJ-data 1.25.0's catalog and
// proj.db 9.7.1 (checked by test/data/designGlobeSites.test.ts). Where PROJ
// ranks a candidate ahead of the one a reader might expect, the site follows
// PROJ (stated on the site). Origins and models are in each CRS's own units,
// in normalized axis order (easting first); heights are in the CRS's height
// system.
//
// Erasable TypeScript only (no enums, no parameter properties): the Node
// generator imports this file directly.
import type { AreaOfInterest, CrsRef } from "../../src/engineering/crs.ts";
import type { EngineeringFrameDefinition } from "../../src/engineering/EngineeringFrame.ts";
import type { PlacementMode } from "../../src/engineering/placement.ts";
import { EARTH } from "../../src/scene/Body.ts";
import { CORRIDOR_ALIGNMENT, CORRIDOR_CRS } from "./corridor.ts";

export interface PortfolioSite {
  /** Unique; names its generated tileset (`portfolio-<id>/`, or `site-building/`). */
  readonly id: string;
  readonly name: string;
  /** Where it is, in words. */
  readonly place: string;
  readonly frame: EngineeringFrameDefinition;
  /** The building's corner, in design coordinates (the frame's units). */
  readonly origin: [number, number, number];
  /** A box: width along design east, depth along design north, in design units. */
  readonly model: {
    readonly width: number;
    readonly depth: number;
    readonly stories: number;
    readonly storyHeight: number;
  };
  /** The grids the frame's operation reads (PROJ-data catalog names). */
  readonly grids: readonly string[];
}

const wkid = (horizontal: number, vertical: number): CrsRef => ({
  format: "wkid",
  authority: "EPSG",
  wkid: horizontal,
  vcsWkid: vertical,
});

/** About 0.03° around a site's origin (degrees, longitude then latitude). */
const around = (longitude: number, latitude: number): AreaOfInterest => ({
  west: longitude - 0.03,
  south: latitude - 0.03,
  east: longitude + 0.03,
  north: latitude + 0.03,
});

const EGM96_GRID = "us_nga_egm96_15.tif";

/**
 * The site-grid building: 200 × 120 ftUS, three stories of 13 ft, on a site
 * grid of the corridor's CRS 2,000 ftUS east and 1,500 ftUS north of the
 * alignment's start, rotated 12.5° and scaled by 1.0000375 (a ground-to-grid
 * factor). Rigid by design: curvature doesn't matter over 200 ft.
 *
 * Its grids are those PROJ's best candidate for EPSG:6420+6360 reads (1.14
 * m): NADCON5 from NAD83(2011) back to NAD83(HARN), and GEOID99 for NAVD88
 * (`us_noaa_g1999u05.tif`). PROJ ranks it ahead of the GEOID18 operation
 * (2.015 m, `us_noaa_g2018u0.tif`) by stated accuracy; `load` takes it.
 */
export const SITE_BUILDING: PortfolioSite = {
  id: "site-building",
  name: "Site-grid building",
  place: "Beside the corridor's start, Oakland hills, California",
  frame: {
    name: "Site-grid building",
    body: EARTH,
    crs: CORRIDOR_CRS,
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
  origin: [0, 0, 0],
  model: { width: 200, depth: 120, stories: 3, storyHeight: 13 },
  grids: [
    "us_noaa_g1999u05.tif",
    "us_noaa_nadcon5_nad83_2007_nad83_2011_conus.tif",
    "us_noaa_nadcon5_nad83_fbn_nad83_2007_conus.tif",
    "us_noaa_nadcon5_nad83_harn_nad83_fbn_conus.tif",
  ],
};

/** Call 19's seven sites, in its order. */
export const PORTFOLIO: readonly PortfolioSite[] = [
  {
    id: "london",
    name: "London site",
    place: "Strand, City of Westminster, United Kingdom",
    frame: {
      name: "London site",
      body: EARTH,
      // OSGB36 / British National Grid + ODN height.
      crs: wkid(27700, 5701),
      areaOfInterest: around(-0.127, 51.503),
    },
    origin: [530_000, 180_000, 15],
    model: { width: 60, depth: 40, stories: 8, storyHeight: 3.5 },
    // OSTN15 (horizontal) and OSGM15 (ODN), 1.038 m.
    grids: ["uk_os_OSGM15_GB.tif", "uk_os_OSTN15_NTv2_OSGBtoETRS.tif"],
  },
  {
    id: "sydney",
    name: "Sydney site",
    place: "Circular Quay, Sydney, Australia",
    frame: {
      name: "Sydney site",
      body: EARTH,
      // GDA2020 / MGA zone 56 + AHD height.
      crs: wkid(7856, 5711),
      areaOfInterest: around(151.206, -33.859),
    },
    origin: [334_000, 6_252_000, 10],
    model: { width: 50, depth: 30, stories: 12, storyHeight: 3.4 },
    // AUSGeoid2020 (AHD), 3.15 m.
    grids: ["au_ga_AUSGeoid2020_20180201.tif"],
  },
  {
    id: "tokyo",
    name: "Tokyo site",
    place: "Marunouchi, by Tokyo Station, Japan",
    frame: {
      name: "Tokyo site",
      body: EARTH,
      // JGD2011 / Japan Plane Rectangular CS IX + JGD2011 (vertical) height.
      // The CRS's axes are northing first (X north, Y east); design
      // coordinates are in normalized order, easting first.
      crs: wkid(6677, 6695),
      areaOfInterest: around(139.756, 35.68),
    },
    origin: [-7_000, -35_500, 3],
    model: { width: 40, depth: 40, stories: 15, storyHeight: 3.3 },
    // JPGEO2024, 1.03 m: PROJ ranks it ahead of GSIGEO2011 (no stated
    // accuracy), and it has been GSI's official geoid since 2025-04-01
    // (plan 4b Task 9).
    grids: ["jp_gsi_jpgeo2024.tif"],
  },
  {
    id: "amsterdam",
    name: "Amsterdam site",
    place: "Grachtengordel, Amsterdam, Netherlands",
    frame: {
      name: "Amsterdam site",
      body: EARTH,
      // Amersfoort / RD New + NAP height.
      crs: wkid(28992, 5709),
      areaOfInterest: around(4.888, 52.37),
    },
    origin: [121_000, 487_000, 1],
    model: { width: 70, depth: 25, stories: 5, storyHeight: 3.2 },
    // RDNAPTRANS2018: the RD correction grid and NLGEO2018 (NAP), 1.001 m.
    grids: ["nl_nsgi_nlgeo2018.tif", "nl_nsgi_rdtrans2018.tif"],
  },
  {
    id: "nairobi",
    name: "Nairobi site",
    place: "Central Business District, Nairobi, Kenya",
    frame: {
      name: "Nairobi site",
      body: EARTH,
      // WGS 84 / UTM zone 37S + EGM96 height.
      crs: wkid(32737, 5773),
      areaOfInterest: around(36.816, -1.293),
    },
    origin: [257_000, 9_857_000, 1_660],
    model: { width: 45, depth: 30, stories: 6, storyHeight: 3.5 },
    // EGM96, 1 m.
    grids: [EGM96_GRID],
  },
  {
    id: "phoenix",
    name: "Phoenix site",
    place: "Tempe, Phoenix metro, Arizona, on the zone's central meridian",
    frame: {
      name: "Phoenix site",
      body: EARTH,
      // NAD83 / Arizona Central (ft) + NAVD88 height (ft), both in
      // international feet.
      crs: wkid(2223, 8228),
      areaOfInterest: around(-111.917, 33.419),
    },
    // On the central meridian (the false easting, 700,000 ft), the zone's
    // centre line, at the latitude of the Phoenix metro (33.42° N).
    origin: [700_000, 880_000, 1_160],
    model: { width: 180, depth: 140, stories: 4, storyHeight: 13 },
    // PROJ's best candidate within the area, 1.1 m: Arizona's HPGN grid
    // from NAD83 to NAD83(HARN), and GEOID99's tile 6 for NAVD88. PROJ ranks
    // it ahead of NADCON5 with GEOID03 (1.14 m) and the GEOID18 operation
    // (2.115 m) by stated accuracy; `load` takes it.
    grids: ["us_noaa_azhpgn.tif", "us_noaa_g1999u06.tif"],
  },
  {
    id: "jakarta",
    name: "Jakarta site",
    place: "Menteng, Central Jakarta, Indonesia",
    frame: {
      name: "Jakarta site",
      body: EARTH,
      // SRGI2013 / UTM zone 48S + INAGeoid2020 v1 height. proj.db relates
      // the height only through INAGEOID2020v1.gtx, which PROJ-data lacks,
      // so the frame reads design heights as EGM96 heights (call 9), with
      // no stated accuracy for the swap (no fallbackSigma). It replaced São
      // Paulo: proj.db 9.7.1 has no Brazilian vertical CRS.
      crs: wkid(9488, 9471),
      areaOfInterest: around(106.826, -6.203),
      geoidFallback: "EGM96",
    },
    origin: [702_000, 9_314_000, 8],
    model: { width: 50, depth: 35, stories: 10, storyHeight: 3.5 },
    grids: [EGM96_GRID],
  },
];

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
