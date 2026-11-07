// The design globe's corridor, as data (plan 4b Task 12; the plan's call 16):
// a 164,042 ftUS (50 km) highway in NAD83(2011) / California zone 3 (ftUS)
// with NAVD88 heights in ftUS, EPSG:6420+6360. Its alignment has three
// spiralled curves and a profile of grades and parabolas, and it carries a
// bridge on its long tangent. The generator (scripts/designTiles.mjs) builds
// the tilesets and the exact answers from these values.
//
// Every length, station, offset and elevation is in US survey feet. The
// sign conventions are alignment.ts's: azimuths in radians clockwise from
// grid north; a positive radius curves left; offsets are positive to the
// right of the direction of travel; a grade is rise over run.
//
// Erasable TypeScript only (no enums, no parameter properties): the Node
// generator imports this file directly.
import type { AlignmentDefinition } from "../../src/engineering/alignment.ts";
import type { AreaOfInterest, CrsRef } from "../../src/engineering/crs.ts";
import type { EngineeringFrameDefinition } from "../../src/engineering/EngineeringFrame.ts";
import { EARTH } from "../../src/scene/Body.ts";

/** NAD83(2011) / California zone 3 (ftUS) + NAVD88 height (ftUS). */
export const CORRIDOR_CRS: CrsRef = {
  format: "wkid",
  authority: "EPSG",
  wkid: 6420,
  vcsWkid: 6360,
};

/**
 * The mainline: 164,042 ftUS from (6,080,000, 2,110,000) at azimuth 100°,
 * stations 10,000 to 174,042. Curves of +5,000 (left), −3,000 (right) and
 * +8,000 (left), each entered and left by a clothoid spiral, and a profile
 * that climbs at +2%, runs at −0.5% over the long tangent (and the bridge),
 * climbs at +3% and levels off at 910 ftUS from station 92,500.
 */
export const CORRIDOR_ALIGNMENT: AlignmentDefinition = {
  name: "Mainline",
  start: [6_080_000, 2_110_000],
  startAzimuth: (100 * Math.PI) / 180,
  startStation: 10_000,
  horizontal: [
    { kind: "line", length: 20_000 },
    { kind: "spiral", length: 500, startRadius: Infinity, endRadius: 5_000 },
    { kind: "arc", length: 6_000, radius: 5_000 },
    { kind: "spiral", length: 500, startRadius: 5_000, endRadius: Infinity },
    { kind: "line", length: 30_000 },
    { kind: "spiral", length: 600, startRadius: Infinity, endRadius: -3_000 },
    { kind: "arc", length: 8_000, radius: -3_000 },
    { kind: "spiral", length: 600, startRadius: -3_000, endRadius: Infinity },
    { kind: "line", length: 40_000 },
    { kind: "spiral", length: 400, startRadius: Infinity, endRadius: 8_000 },
    { kind: "arc", length: 10_000, radius: 8_000 },
    { kind: "spiral", length: 400, startRadius: 8_000, endRadius: Infinity },
    { kind: "line", length: 47_042 },
  ],
  vertical: {
    startStation: 10_000,
    startElevation: 120,
    segments: [
      { kind: "grade", length: 15_000, grade: 0.02 },
      { kind: "parabola", length: 2_000, startGrade: 0.02, endGrade: -0.005 },
      { kind: "grade", length: 40_000, grade: -0.005 },
      { kind: "parabola", length: 3_000, startGrade: -0.005, endGrade: 0.03 },
      { kind: "grade", length: 20_000, grade: 0.03 },
      { kind: "parabola", length: 2_500, startGrade: 0.03, endGrade: 0 },
      { kind: "grade", length: 81_542, grade: 0 },
    ],
  },
};

/** A paved strip of the cross-section: a shoulder or the lanes. */
export interface SectionStrip {
  readonly kind: "shoulder" | "lanes";
  readonly name: string;
  /** Its edges' offsets, `from` < `to`, positive to the right. */
  readonly from: number;
  readonly to: number;
  /**
   * Rise per unit of distance away from the centreline: −0.02 falls 2%
   * outward, on either side.
   */
  readonly crossSlope: number;
}

/**
 * A concrete barrier: a symmetric trapezoid standing level on the surface
 * at its base, centred on `offset`.
 */
export interface SectionBarrier {
  readonly name: string;
  readonly offset: number;
  readonly baseWidth: number;
  readonly topWidth: number;
  readonly height: number;
}

/**
 * The typical section: offsets positive to the right; heights relative to
 * the profile (the profile grade line is at offset 0, under the median).
 */
export interface CrossSection {
  /** In order of offset, left to right. */
  readonly strips: readonly SectionStrip[];
  readonly barriers: readonly SectionBarrier[];
}

/** A 32-inch (2.67 ft) concrete barrier, 2 ft at the base and 0.5 at the top. */
const barrier = (name: string, offset: number): SectionBarrier => ({
  name,
  offset,
  baseWidth: 2,
  topWidth: 0.5,
  height: 2.67,
});

/** The right half's strips, from the median outward. */
const RIGHT: readonly SectionStrip[] = [
  {
    kind: "shoulder",
    name: "inner shoulder",
    from: 1,
    to: 5,
    crossSlope: -0.04,
  },
  { kind: "lanes", name: "lanes", from: 5, to: 29, crossSlope: -0.02 },
  {
    kind: "shoulder",
    name: "outer shoulder",
    from: 29,
    to: 39,
    crossSlope: -0.04,
  },
];

/**
 * A divided highway, two 12 ft lanes each way: a median barrier at 0, inner
 * shoulders 1–5 at −4%, lanes 5–29 at −2%, outer shoulders 29–39 at −4% and
 * outer barriers 39–41, mirrored on the left.
 */
export const CROSS_SECTION: CrossSection = {
  strips: [
    ...RIGHT.map((strip) => ({
      ...strip,
      name: `left ${strip.name}`,
      from: -strip.to,
      to: -strip.from,
    })).reverse(),
    ...RIGHT.map((strip) => ({ ...strip, name: `right ${strip.name}` })),
  ],
  barriers: [
    barrier("left outer barrier", -40),
    barrier("median barrier", 0),
    barrier("right outer barrier", 40),
  ],
};

/** How far the section reaches either side: the outer barriers' outer faces. */
const SECTION_HALF_WIDTH = 41;

/**
 * The section's surface height relative to the profile at an offset: 0
 * under the median barrier (|offset| ≤ 1), falling outward by each strip's
 * cross slope, and level under the outer barriers (39 to 41). Throws a
 * RangeError beyond ±41.
 */
export function sectionSurface(offset: number): number {
  const distance = Math.abs(offset);
  if (!(distance <= SECTION_HALF_WIDTH)) {
    throw new RangeError(
      `sectionSurface: offset ${offset} is outside the section (±${SECTION_HALF_WIDTH})`,
    );
  }
  let height = 0;
  for (const strip of RIGHT) {
    const run = Math.min(distance, strip.to) - strip.from;
    if (run > 0) {
      height += strip.crossSlope * run;
    }
  }
  return height;
}

export interface Bridge {
  readonly fromStation: number;
  readonly toStation: number;
  /** The deck's thickness under the section's surface. */
  readonly deckThickness: number;
  readonly piers: {
    /** Across the alignment. */
    readonly width: number;
    /** Along the alignment. */
    readonly depth: number;
    /** Each pier line's offset. */
    readonly offsets: readonly number[];
    /** Every 120 ft between the bridge's ends (which are abutments). */
    readonly stations: readonly number[];
    /** Each pier goes down to the profile's elevation minus this. */
    readonly belowProfile: number;
  };
}

const PIER_SPACING = 120;

/**
 * The bridge: stations 60,000 to 61,200 on the long tangent, a 1.5 ft deck,
 * and 4×4 ft piers at offsets ±20 every 120 ft, down to the profile −25.
 */
export const BRIDGE: Bridge = {
  fromStation: 60_000,
  toStation: 61_200,
  deckThickness: 1.5,
  piers: {
    width: 4,
    depth: 4,
    offsets: [-20, 20],
    stations: Array.from(
      { length: (61_200 - 60_000) / PIER_SPACING - 1 },
      (_, i) => 60_000 + PIER_SPACING * (i + 1),
    ),
    belowProfile: 25,
  },
};

/**
 * Station ticks: a mark every 100 ft of station, on each outer shoulder at
 * offset ±35, 0.5 ft along the alignment by 4 ft across it, drawn 0.03 ft
 * above the surface (so it doesn't fight the surface for depth). A tick's
 * point, the one exact snapping gives, is its centre on that raised face.
 */
export const TICKS = {
  interval: 100,
  offsets: [-35, 35],
  along: 0.5,
  across: 4,
  raise: 0.03,
} as const;

/** The rigid placement's anchor: the middle of the alignment. */
export const ANCHOR_STATION = 92_021;

/**
 * Around the route, in degrees: the extent of its section (offsets ±41),
 * −122.167 to −121.872 E and 37.662 to 37.858 N (from PROJ, 2026-11-07),
 * with about 0.02° to spare. It runs from the Oakland hills east-southeast
 * toward the Livermore valley.
 */
const CORRIDOR_AREA: AreaOfInterest = {
  west: -122.19,
  south: 37.64,
  east: -121.85,
  north: 37.88,
};

/**
 * EPSG:6420+6360 to WGS 84 (EPSG:4979) through GEOID18
 * (`us_noaa_g2018u0.tif`), NGS's current model for NAVD88: PROJ's
 * "Inverse of SPCS83 California zone 3 (US survey foot) + Conversion from
 * NAVD88 height (ftUS) to NAVD88 height + Inverse of NAD83(2011) to NAVD88
 * height (3) + NAD83(2011) to WGS 84 (1)", stated ±2.015 m, as proj.db 9.7.1
 * writes it (recorded 2026-11-07; the same within the corridor's area and
 * without one). The design globe's California frames pin it: PROJ ranks two
 * operations ahead of it at ±1.14 m, NADCON5 back to NAD83(HARN) with
 * GEOID99 or GEOID03, both superseded for NAVD88, and `load` would take the
 * first (about 95 MB more of grids). Pinned, it keeps the ±2.015 m PROJ
 * states for it: it is PROJ's own candidate (`matchedCandidate`).
 */
export const CORRIDOR_PIPELINE =
  "+proj=pipeline +step +proj=unitconvert +xy_in=us-ft +xy_out=m +step +inv +proj=lcc +lat_0=36.5 +lon_0=-120.5 +lat_1=38.4333333333333 +lat_2=37.0666666666667 +x_0=2000000.0001016 +y_0=500000.0001016 +ellps=GRS80 +step +proj=unitconvert +z_in=us-ft +z_out=m +step +proj=vgridshift +grids=us_noaa_g2018u0.tif +multiplier=1 +step +proj=unitconvert +xy_in=rad +xy_out=deg";

/**
 * The corridor's engineering frame: the CRS's own grid, no site transform,
 * NAVD88 through GEOID18 (`CORRIDOR_PIPELINE`).
 */
export function corridorFrame(): EngineeringFrameDefinition {
  return {
    name: "Highway corridor",
    body: EARTH,
    crs: CORRIDOR_CRS,
    pipeline: CORRIDOR_PIPELINE,
    alignments: [CORRIDOR_ALIGNMENT],
    areaOfInterest: CORRIDOR_AREA,
  };
}

/** Degrees, minutes and seconds to radians: west and south negative. */
const dmsRadians = (
  degrees: number,
  minutes: number,
  seconds: number,
  sign: 1 | -1,
) => (sign * (degrees + minutes / 60 + seconds / 3600) * Math.PI) / 180;

/**
 * A real NGS survey mark near the corridor's far end (owner, 2026-11-07),
 * from its datasheet as NGS published it: GOLD CREEK (HS5109), a 1946
 * triangulation station disk in a concrete monument on a low hill south of
 * Dublin, recovered in good condition on 2023-07-28. Its NAD83(2011)
 * position was adjusted by NGS in June 2012 (epoch 2010.00); its network
 * accuracy is 0.68 cm horizontal and 2.78 cm ellipsoidal (95%). It is the
 * only mark with a NAD83(2011) position within 1,500 ftUS of the
 * centreline from station 137,000 to the end (NGS Data Explorer's radial
 * searches, 2026-11-07; the others there are NAD 83(1986) bench marks with
 * scaled positions). It lies about 501 ftUS left of the centreline at about
 * station 154,395, some 19,650 ftUS before the end.
 *
 * The values are the datasheet's, verbatim in `published`; `geodetic` is
 * the published position in radians, converted exactly from its degrees,
 * minutes and seconds.
 */
export const SURVEY_MARK = {
  pid: "HS5109",
  name: "GOLD CREEK",
  datasheetUrl: "https://www.ngs.noaa.gov/cgi-bin/ds_mark.prl?PidBox=HS5109",
  retrieved: "2026-11-07",
  geodetic: {
    latitude: dmsRadians(37, 41, 7.22359, 1),
    longitude: dmsRadians(121, 55, 59.92453, -1),
    ellipsoidHeight: 139.916,
  },
  /** Zone 3, US survey feet ("sFT" on the datasheet). */
  publishedSpc: { easting: 6_146_924.9, northing: 2_075_186.11 },
  /** NAD83(2011) X, Y and Z (metres), as the datasheet computes them. */
  publishedXyz: [-2_673_203.826, -4_289_120.954, 3_877_949.143],
  published: {
    position:
      "NAD 83(2011) POSITION- 37 41 07.22359(N) 121 55 59.92453(W)   ADJUSTED",
    ellipsoidHeight:
      "NAD 83(2011) ELLIP HT-   139.916 (meters)        (06/27/12)   ADJUSTED",
    spc: "SPC CA 3     - 2,075,186.11  6,146,924.90   sFT  0.99992983   -0 52 39.1",
  },
} as const;
