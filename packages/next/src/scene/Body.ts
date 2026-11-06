import { Ellipsoid } from "../math/ellipsoid.ts";
import {
  EARTH as EARTH_ATMOSPHERE,
  solarIlluminanceOutside,
  type AtmosphereParameters,
} from "../atmosphere/model.ts";

/**
 * A planetary body: its shape and its atmosphere, if it has one (plan
 * §13.14). Views see a body's sky and light (`View.body`); content will
 * belong to a body (a tileset's `3DTILES_ellipsoid`, or 3D Tiles 2.0's
 * georeference), each in its own fixed frame. Earth only for now: the
 * engine builds Earth's atmosphere; the Moon and Mars follow with
 * per-body frames.
 */
export interface Body {
  readonly name: string;
  /** The reference ellipsoid: heights, normals, the horizon. */
  readonly ellipsoid: Ellipsoid;
  /**
   * Its NAIF integer id (399 Earth, 301 Moon), which names the body's fixed
   * frame in the frame tree (`Frames.bodyFixed`).
   */
  readonly naifId?: number;
  /** Its atmosphere; none: a black sky and the sun's light unfiltered. */
  readonly atmosphere?: Readonly<AtmosphereParameters>;
}

/**
 * The sun's illuminance at the Earth's distance outside any atmosphere,
 * lux (132.5 klx): the sunlight on a body without one.
 */
export const SOLAR_ILLUMINANCE = solarIlluminanceOutside();

/** The Earth: WGS84 and Bruneton's clear-sky atmosphere. */
export const EARTH: Body = {
  name: "Earth",
  ellipsoid: Ellipsoid.WGS84,
  naifId: 399,
  atmosphere: EARTH_ATMOSPHERE,
};

/** The Moon: a 1,737.4 km sphere and no atmosphere (a black sky). */
export const MOON: Body = {
  name: "Moon",
  ellipsoid: Ellipsoid.MOON,
  naifId: 301,
};
