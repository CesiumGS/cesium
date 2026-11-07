// What each frame the app defines states about its own accuracy (the
// owner's follow-up, 2026-11-07: "even if we have to estimate, as this is
// illustrative code"). One figure per frame, given to the library's `Frame`
// (`FrameOptions.accuracy`) and shown on the tree's edge, so the walk
// (`pointAccuracy`, composed.ts) and the answer state the same thing.
//
// A published figure where one exists, cited; otherwise an estimate,
// labelled "estimated, illustrative" with its reasoning in one line. A
// point the app chooses (a site at given coordinates, a knob's value) is
// exact by definition: nothing measures it. Every figure is 1σ.
//
// Light imports only: the page and the worker both read these.
import type { EdgeAccuracy } from "../tree.ts";

const deg = Math.PI / 180;

/** The Earth's mean radius, m: how far a station's axes tilt for its position's error. */
const EARTH_RADIUS = 6_371_000;

/** A DSN station's position, 1σ, m (published: DSN 810-005, module 301, Rev. P, Table 7's note). */
export const DSN_STATION_METERS = 0.1;

/**
 * A 70 m DSN station's east-north-up frame, placed from NAIF's station SPK
 * (DSN 810-005's ITRF93 position with its plate motion). Published: Table
 * 7 of module 301 (Rev. P, May 2026) gives each 70 m antenna's location
 * uncertainty at its VLBI epoch as 24 to 35 mm (1σ) per component, and its
 * note says these have since grown to as much as 0.1 m (1σ): earthquakes
 * and plate velocities integrated over the years. The frame's axes are the
 * ellipsoid's east, north and up at that place, so they tilt with its
 * error: 0.1 m over the Earth's radius.
 */
export const DSN_STATION_ACCURACY: EdgeAccuracy = {
  meters: DSN_STATION_METERS,
  radians: DSN_STATION_METERS / EARTH_RADIUS,
  note: "published: DSN 810-005, module 301 (Rev. P), Table 7: 24 to 35 mm (1σ) per component at the VLBI epoch, grown to as much as 0.1 m (1σ) since, its note says; the axes tilt with the place, 0.1 m over the Earth's radius",
  short: "published: DSN 810-005 301, Table 7 (0.1 m, 1σ)",
};

/**
 * Sacramento's east-north-up frame: the point the app names (38.5816° N,
 * 121.4944° W, h = 0 on WGS 84), the one JPL Horizons was asked for, and
 * its axes are that point's. Nothing measures it.
 */
export const SACRAMENTO_ACCURACY: EdgeAccuracy = {
  byDefinition: true,
  note: "exact by definition: the site is the point it names (38.5816° N, 121.4944° W, h = 0 on WGS 84), the point Horizons' table is for, with that point's east, north and up",
  short: "exact by definition: the site is the point it names",
};

/**
 * The lunar site's east-north-up frame: the point the latitude knob names
 * on the IAU Moon sphere (0° longitude, h = 0), with that point's axes.
 * Nothing measures it; a real lander's site would carry its map's error.
 */
export const LUNAR_SITE_ACCURACY: EdgeAccuracy = {
  byDefinition: true,
  note: "exact by definition: the site is the point the knob names on the IAU Moon sphere (0° longitude, h = 0), with that point's east, north and up; a real site would carry its map's error",
  short: "exact by definition: the site is the point the knob names",
};

/** The drone's position and attitude, 1σ (estimated, illustrative). */
export const DRONE_SIGMA = { meters: 2, radians: 1 * deg } as const;

/**
 * The drone's body, from its synthetic flight line: what a consumer drone
 * would know of itself (estimated, illustrative): its GNSS receiver's
 * position, about 2 m, and its attitude, about 1° (its compass heading;
 * pitch and roll are finer).
 */
export const DRONE_ACCURACY: EdgeAccuracy = {
  ...DRONE_SIGMA,
  note: "estimated, illustrative: a consumer GNSS receiver's position, about 2 m, and a consumer drone's attitude, about 1° (its compass heading; pitch and roll are finer); the track itself is synthetic",
  short: "estimated, illustrative: 2 m and 1°",
};

/** The camera mount: the gimbal's offset and its tilt, the knob's value. */
export const CAMERA_MOUNT_ACCURACY: EdgeAccuracy = {
  byDefinition: true,
  note: "exact by definition: the gimbal's offset and tilt as set (the knob)",
  short: "exact by definition: the gimbal as set",
};

/** The ship's position and heading, 1σ (estimated, illustrative). */
export const SHIP_SIGMA = { meters: 10, radians: 1 * deg } as const;

/**
 * The ship's body, from its synthetic track and sea state: what a ship
 * reports of itself (estimated, illustrative): its AIS position, about 10
 * m, and its gyrocompass heading, about 1°.
 */
export const SHIP_ACCURACY: EdgeAccuracy = {
  ...SHIP_SIGMA,
  note: "estimated, illustrative: an AIS position, about 10 m, and a gyrocompass heading, about 1°; the track and the sea state themselves are synthetic",
  short: "estimated, illustrative: 10 m and 1°",
};

/** The mast sensor: the mast's height, the knob's value. */
export const MAST_ACCURACY: EdgeAccuracy = {
  byDefinition: true,
  note: "exact by definition: the mast's height as set (the knob)",
  short: "exact by definition: the mast as set",
};

/** MOON_ME's orientation error, 1σ, rad (estimated, illustrative). */
export const MOON_ME_RADIANS = 3e-7;

/**
 * MOON_ME's orientation (DE440's integrated libration), which the library
 * leaves "not stated": DE440 publishes no orientation uncertainty (Park et
 * al. 2021, AJ 161:105, §2.4). Estimated, illustrative, from the two
 * figures that bound its size: DE440's mean-Earth frame differs from
 * DE421's by up to 3.07 × 10⁻⁷ rad over 2000–2040 (NAIF
 * moon_de440_250416.tf), and unmodelled tidal libration is a few
 * milliarcseconds (the DE421 and DE430 memos; 1 mas is about 8 mm at the
 * surface). 3 × 10⁻⁷ rad is about 0.5 m at the surface. The explorer's
 * tree and walk state it; the library's MOON_ME still states none.
 */
export const MOON_ME_ACCURACY: EdgeAccuracy = {
  radians: MOON_ME_RADIANS,
  note: "estimated, illustrative: DE440 publishes no orientation uncertainty for its libration (Park et al. 2021, AJ 161:105, §2.4); its mean-Earth frame differs from DE421's by up to 3.07 × 10⁻⁷ rad over 2000–2040 (NAIF moon_de440_250416.tf) and unmodelled tidal libration is a few mas (about 8 mm per mas at the surface), so 3 × 10⁻⁷ rad, about 0.5 m at the surface",
  short: "estimated, illustrative: 3 × 10⁻⁷ rad (about 0.5 m at the surface)",
};
