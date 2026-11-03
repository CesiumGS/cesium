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
  atmosphere: EARTH_ATMOSPHERE,
};
