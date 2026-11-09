// Where a view's Moon is, and which light casts its shadows.
import { Ellipsoid } from "../math/ellipsoid.ts";
import * as v3 from "../math/vec3.ts";
import type { Vec3 } from "../math/vec3.ts";
import type { Engine } from "./Engine.ts";
import type { View } from "./View.ts";

/** Scene side: the Moon's place and the shadow light. */
export type LightSourceEngine = Pick<
  Engine,
  "icrfToFixed" | "moonAxes" | "moonPosition" | "sunDirection"
>;

/** The Moon as a view sees it (`moonFrom`). */
const scratchMoon = {
  direction: v3.vec3(),
  sinRadius: 0,
  meridian: v3.vec3(),
  north: v3.vec3(),
  toSun: v3.vec3(),
  phaseAngle: 0,
  earthRadius: 0,
  airShare: 0,
};

/** The Earth's mean radius, m (its size from the Moon: earthshine). */
const EARTH_RADIUS = 6_371_009;
/** The mean distance to the sun, m (IAU 2012). */
const ASTRONOMICAL_UNIT = 1.495978707e11;
/** The ecliptic's tilt to the equator (J2000), radians. */
const OBLIQUITY = (23.4392911 * Math.PI) / 180;
const scratchShadowUp = v3.vec3();
const scratchMoonAxis = v3.vec3();

/**
 * The Moon as a camera at `position` (Earth-fixed, m) sees it, for the
 * sky, and its light, for the scene; undefined without `moonPosition`.
 */
export function moonFrom(
  engine: LightSourceEngine,
  position: Vec3,
): typeof scratchMoon | undefined {
  const moon = engine.moonPosition;
  if (!moon) {
    return undefined;
  }
  const m = scratchMoon;
  const toward = v3.sub(m.direction, moon, position);
  const distance = v3.length(toward);
  v3.scale(toward, toward, 1 / distance);
  const axes = engine.moonAxes;
  const north = m.north;
  if (axes) {
    for (let i = 0; i < 3; i++) {
      m.meridian[i] = axes[i]!;
      north[i] = axes[i + 3]!;
    }
  } else {
    // Its face toward the Earth's center; its pole the ecliptic's (1.5°
    // off), turned to Earth-fixed axes and square to the face's axis.
    v3.normalize(m.meridian, v3.negate(m.meridian, moon));
    const r = engine.icrfToFixed;
    const ey = -Math.sin(OBLIQUITY);
    const ez = Math.cos(OBLIQUITY);
    for (let i = 0; i < 3; i++) {
      north[i] = r[i * 3 + 1]! * ey + r[i * 3 + 2]! * ez;
    }
    v3.normalize(
      north,
      v3.sub(
        north,
        north,
        v3.scale(scratchMoonAxis, m.meridian, v3.dot(north, m.meridian)),
      ),
    );
  }
  // Toward the sun from the Moon (the sun's direction is the Earth's).
  const sun = engine.sunDirection;
  for (let i = 0; i < 3; i++) {
    m.toSun[i] = sun[i]! * ASTRONOMICAL_UNIT - moon[i]!;
  }
  v3.normalize(m.toSun, m.toSun);
  m.sinRadius = Math.min(Ellipsoid.MOON.maximumRadius / distance, 1);
  m.earthRadius = Math.min(EARTH_RADIUS / v3.length(moon), 1);
  m.phaseAngle = Math.acos(Math.min(Math.max(-v3.dot(m.toSun, toward), -1), 1));
  return m;
}

/**
 * The light `view`'s shadows follow from `position` (its body camera's):
 * the sun's, or at night the Moon's when it's up; undefined when the view
 * has no shadows or neither is up. `moon` is the Moon from there.
 */
export function shadowLight(
  engine: LightSourceEngine,
  view: View,
  position: Vec3,
  moon: { readonly direction: Vec3 } | undefined,
): { direction: Vec3; moon: boolean } | undefined {
  if (!view.shadows || view.lighting.sunIlluminance === 0) {
    return undefined;
  }
  const up = v3.normalize(scratchShadowUp, position);
  if (v3.dot(up, engine.sunDirection) > -0.05) {
    return { direction: engine.sunDirection, moon: false };
  }
  return moon !== undefined && v3.dot(up, moon.direction) > 0
    ? { direction: moon.direction, moon: true }
    : undefined;
}
