// The design globe's corridor, as data (plan 4b Task 12; the plan's call 16):
// a 164,042 ftUS (50 km) highway in NAD83(2011) / California zone 3 (ftUS)
// with NAVD88 heights in ftUS, EPSG:6420+6360. Its alignment has three
// spiralled curves and a profile of grades and parabolas fitted to the real
// ground, with viaducts and tunnels where the ground is too far from it. The
// generator (scripts/designTiles.mjs) builds the tilesets and the exact
// answers from these values.
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
 * +8,000 (left), each entered and left by a clothoid spiral.
 *
 * Its profile is a design vertical alignment fitted to the real ground:
 * USGS 3DEP ground heights (NAVD88 metres, from 3DEP's elevation service,
 * no token) at 330 points every 500 ftUS along the horizontal alignment,
 * sampled 2026-11-07 by scripts/corridorGround.mjs, which also made the fit
 * (the samples are not in the repo). The fit, as a highway designer would
 * set it for a 65 mph freeway: grades from 0.3% (so the road drains) to
 * 6%, to 0.01%; PVIs on whole stations, each with a symmetric parabolic
 * vertical curve of at least AASHTO's least K for stopping sight distance
 * (crest 193, sag 157, ft per percent of grade change; 2018 Green Book), in
 * whole 100 ft; the ends tied in to the ground; Huber's loss against the
 * ground (40 ftUS), so that it follows the ground where a road can and
 * leaves to a structure what it can't. Its PVIs (station, elevation in
 * ftUS, the grades either side, the curve and its K):
 *
 *        100+00    316.70  (start)
 *        190+00    825.20  +5.65% to −1.88%, crest 1,500 ft, K 199
 *        340+00    543.20  −1.88% to +4.52%, sag 1,100 ft, K 172
 *        520+00  1,356.80  +4.52% to −5.97%, crest 2,100 ft, K 200
 *        640+00    640.40  −5.97% to −5.99%, crest 200 ft, K 10,000
 *        700+00    281.00  −5.99% to +2.77%, sag 1,400 ft, K 160
 *        760+00    447.20  +2.77% to −5.95%, crest 1,700 ft, K 195
 *        790+00    268.70  −5.95% to +5.98%, sag 1,900 ft, K 159
 *        910+00    986.30  +5.98% to +1.66%, crest 900 ft, K 208
 *       1000+00  1,135.70  +1.66% to −5.98%, crest 1,500 ft, K 196
 *       1090+00    597.50  −5.98% to +0.37%, sag 1,000 ft, K 157
 *       1210+00    641.90  +0.37% to +1.38%, sag 200 ft, K 198
 *       1390+00    890.30  +1.38% to −2.24%, crest 700 ft, K 193
 *       1480+00    688.70  −2.24% to −3.07%, crest 200 ft, K 241
 *       1600+00    320.30  −3.07% to +0.33%, sag 600 ft, K 176
 *       1740+42    366.64  (end)
 *
 * (The PVI at 640+00 bends the grade by 0.02%: the fit kept it, with both
 * its grades at the 6% limit.)
 *
 * The ground is steep hills crossed against their grain, so no profile
 * within 6% can follow it: against the samples the fit's largest fill is
 * 300.1 ftUS (91.5 m, at station 64,500) and its largest cut 679.9 ftUS
 * (207.2 m, at station 89,500), and both are structures (`STRUCTURES`).
 * Outside them, on earthwork, the fill reaches 47.9 ftUS (14.6 m) and the
 * cut 79.7 ftUS (24.3 m). Its RMS against the ground is 168.2 ftUS.
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
    startElevation: 316.7,
    segments: [
      { kind: "grade", length: 8250, grade: 0.0565 },
      {
        kind: "parabola",
        length: 1500,
        startGrade: 0.0565,
        endGrade: -0.0188,
      },
      { kind: "grade", length: 13_700, grade: -0.0188 },
      {
        kind: "parabola",
        length: 1100,
        startGrade: -0.0188,
        endGrade: 0.0452,
      },
      { kind: "grade", length: 16_400, grade: 0.0452 },
      {
        kind: "parabola",
        length: 2100,
        startGrade: 0.0452,
        endGrade: -0.0597,
      },
      { kind: "grade", length: 10_850, grade: -0.0597 },
      {
        kind: "parabola",
        length: 200,
        startGrade: -0.0597,
        endGrade: -0.0599,
      },
      { kind: "grade", length: 5200, grade: -0.0599 },
      {
        kind: "parabola",
        length: 1400,
        startGrade: -0.0599,
        endGrade: 0.0277,
      },
      { kind: "grade", length: 4450, grade: 0.0277 },
      {
        kind: "parabola",
        length: 1700,
        startGrade: 0.0277,
        endGrade: -0.0595,
      },
      { kind: "grade", length: 1200, grade: -0.0595 },
      {
        kind: "parabola",
        length: 1900,
        startGrade: -0.0595,
        endGrade: 0.0598,
      },
      { kind: "grade", length: 10_600, grade: 0.0598 },
      {
        kind: "parabola",
        length: 900,
        startGrade: 0.0598,
        endGrade: 0.0166,
      },
      { kind: "grade", length: 7800, grade: 0.0166 },
      {
        kind: "parabola",
        length: 1500,
        startGrade: 0.0166,
        endGrade: -0.0598,
      },
      { kind: "grade", length: 7750, grade: -0.0598 },
      {
        kind: "parabola",
        length: 1000,
        startGrade: -0.0598,
        endGrade: 0.0037,
      },
      { kind: "grade", length: 11_400, grade: 0.0037 },
      {
        kind: "parabola",
        length: 200,
        startGrade: 0.0037,
        endGrade: 0.0138,
      },
      { kind: "grade", length: 17_550, grade: 0.0138 },
      {
        kind: "parabola",
        length: 700,
        startGrade: 0.0138,
        endGrade: -0.0224,
      },
      { kind: "grade", length: 8550, grade: -0.0224 },
      {
        kind: "parabola",
        length: 200,
        startGrade: -0.0224,
        endGrade: -0.0307,
      },
      { kind: "grade", length: 11_600, grade: -0.0307 },
      {
        kind: "parabola",
        length: 600,
        startGrade: -0.0307,
        endGrade: 0.0033,
      },
      { kind: "grade", length: 13_742, grade: 0.0033 },
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
    /** About every 120 ft between the bridge's ends (which are abutments). */
    readonly stations: readonly number[];
    /** Each pier goes down to the profile's elevation minus this. */
    readonly belowProfile: number;
  };
}

/** A tunnel: the road under the ground from one portal to the other. */
export interface Tunnel {
  readonly fromStation: number;
  readonly toStation: number;
}

/** A structure along the mainline, in order of station. */
export type Structure =
  | ({ readonly kind: "viaduct" } & Bridge)
  | ({ readonly kind: "tunnel" } & Tunnel);

const PIER_SPACING = 120;

/**
 * A viaduct from `from` to `to`: a 1.5 ft deck and 4×4 ft piers at offsets
 * ±20, in equal spans of about 120 ft, each down to the profile less
 * `belowProfile` (its deepest fill against the ground and 15 ftUS more, in
 * whole 5 ftUS: below the ground the terrain hides the rest).
 */
const viaduct = (from: number, to: number, belowProfile: number): Structure => {
  const spans = Math.max(1, Math.round((to - from) / PIER_SPACING));
  return {
    kind: "viaduct",
    fromStation: from,
    toStation: to,
    deckThickness: 1.5,
    piers: {
      width: 4,
      depth: 4,
      offsets: [-20, 20],
      stations: Array.from(
        { length: spans - 1 },
        (_, i) => from + ((to - from) * (i + 1)) / spans,
      ),
      belowProfile,
    },
  };
};

const tunnel = (from: number, to: number): Structure => ({
  kind: "tunnel",
  fromStation: from,
  toStation: to,
});

/**
 * The mainline's structures (scripts/corridorGround.mjs, with the profile):
 * a viaduct where the profile is more than 50 ftUS over the sampled ground
 * and a tunnel where it is more than 80 ftUS under it. Each sample stands
 * for half the way to its neighbours, and a viaduct reaches on to where the
 * ground meets the road; structures of a kind within 1,500 ft are joined
 * over ground on their own side of the road; their ends are in whole
 * 100 ft. 18 viaducts (58,300 ft) and 19 tunnels (50,500 ft): 66% of the
 * 164,042 ft.
 */
export const STRUCTURES: readonly Structure[] = [
  tunnel(12_700, 14_800),
  viaduct(15_100, 18_000, 245),
  viaduct(18_700, 19_800, 110),
  tunnel(19_800, 20_800),
  viaduct(21_700, 23_300, 240),
  tunnel(23_700, 27_300),
  viaduct(27_700, 29_500, 230),
  tunnel(29_700, 31_300),
  viaduct(31_700, 36_300, 185),
  tunnel(36_300, 36_800),
  tunnel(39_200, 40_300),
  tunnel(41_700, 43_300),
  viaduct(43_700, 47_300, 215),
  tunnel(47_700, 52_800),
  viaduct(53_500, 54_300, 90),
  tunnel(54_300, 59_800),
  viaduct(60_000, 69_300, 320),
  viaduct(73_200, 74_800, 85),
  tunnel(75_700, 78_800),
  viaduct(80_700, 85_800, 195),
  tunnel(86_700, 92_300),
  viaduct(92_700, 97_000, 250),
  tunnel(97_200, 101_300),
  viaduct(103_700, 107_300, 200),
  viaduct(108_700, 109_300, 95),
  tunnel(109_700, 110_800),
  tunnel(111_700, 114_300),
  viaduct(114_600, 115_800, 120),
  tunnel(115_800, 117_800),
  viaduct(117_800, 122_300, 260),
  tunnel(123_700, 127_800),
  viaduct(128_700, 135_000, 275),
  tunnel(135_700, 138_800),
  viaduct(142_200, 144_400, 125),
  tunnel(144_700, 145_300),
  viaduct(145_600, 148_800, 215),
  tunnel(149_200, 151_300),
];

/** The viaducts, in order of station. */
export const VIADUCTS: readonly Bridge[] = STRUCTURES.filter(
  (s): s is { kind: "viaduct" } & Bridge => s.kind === "viaduct",
);

/**
 * The bridge the answers measure across: the viaduct on the long tangent,
 * stations 43,700 to 47,300.
 */
export const BRIDGE: Bridge = VIADUCTS.find((v) => v.fromStation === 43_700)!;

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

/**
 * The rigid placement's anchor: as near the middle of the alignment (station
 * 92,021, in a tunnel) as the ring around it is in the open. The nearest
 * earthwork, 92,300 to 92,700 between a portal and a viaduct, is a sidehill
 * cut: the ground stands over the ring on both sides. The next, 85,800 to
 * 86,700 between a viaduct and a portal, is on fill at 86,300 (3DEP's
 * ground 21 ftUS under the road there, and under it 100 ftUS either side;
 * sampled every 50 ftUS, 2026-11-07), so the ring and the end of Fly along
 * are on open road. It is 5,721 ftUS before the middle: the far ends are
 * 13.7 km (the start) and 21.9 km (the end) from it.
 */
export const ANCHOR_STATION = 86_300;

/**
 * The 10,000 ft pair's ends, on the first tangent (stations 10,000 to
 * 30,000): both on earthwork, where 3DEP's ground meets the profile within
 * 3 ftUS (sampled every 100 ftUS, 2026-11-07).
 */
export const PAIR_STATIONS = [11_200, 21_200] as const;

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
 * A real NGS survey mark toward the corridor's far end (owner, 2026-11-07),
 * from its datasheet as NGS published it: GOLD CREEK (HS5109), a 1946
 * triangulation station disk in a concrete monument on a low hill south of
 * Dublin, recovered in good condition on 2023-07-28. Its NAD83(2011)
 * position was adjusted by NGS in June 2012 (epoch 2010.00); its network
 * accuracy is 0.68 cm horizontal and 2.78 cm ellipsoidal (95%). It is the
 * only mark with a NAD83(2011) position within 1,500 ftUS of the
 * centreline from station 137,000 to the end (NGS Data Explorer's radial
 * searches, 2026-11-07; the others there are NAD 83(1986) bench marks with
 * scaled or hand-held positions). It lies about 501 ftUS left of the centreline at about
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
