import {
  Ellipsoid,
  eastNorthUpToFixedFrame,
  fromDegrees,
  mat4,
  vec3,
} from "@cesium/next";

/** A point or direction as three numbers. */
export type V3 = [number, number, number];

export const add = (a: ArrayLike<number>, b: ArrayLike<number>): V3 => [
  a[0]! + b[0]!,
  a[1]! + b[1]!,
  a[2]! + b[2]!,
];
export const sub = (a: ArrayLike<number>, b: ArrayLike<number>): V3 => [
  a[0]! - b[0]!,
  a[1]! - b[1]!,
  a[2]! - b[2]!,
];
export const scale = (a: ArrayLike<number>, s: number): V3 => [
  a[0]! * s,
  a[1]! * s,
  a[2]! * s,
];
export const dot = (a: ArrayLike<number>, b: ArrayLike<number>): number =>
  a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
export const cross = (a: ArrayLike<number>, b: ArrayLike<number>): V3 => [
  a[1]! * b[2]! - a[2]! * b[1]!,
  a[2]! * b[0]! - a[0]! * b[2]!,
  a[0]! * b[1]! - a[1]! * b[0]!,
];
export const length = (a: ArrayLike<number>): number =>
  Math.hypot(...(a as V3));
export const unit = (a: ArrayLike<number>): V3 => scale(a, 1 / length(a));

/**
 * The site the scene stands on: the sample tileset's place (Philadelphia),
 * where the model and the part are put beside it. Everything the example
 * keeps is in local metres, east, north and up at the site; `Site` takes it
 * to Earth-fixed coordinates, which is ITRF, the frame the clips are named
 * in, and back.
 */
export const SITE_DEGREES = { longitude: -75.6122, latitude: 40.0425 };

export interface Site {
  /** The site on the ellipsoid, Earth-fixed, m. */
  readonly origin: Float64Array;
  /** Unit east, north and up, Earth-fixed. */
  readonly axes: readonly [Float64Array, Float64Array, Float64Array];
  /** A local point, Earth-fixed. */
  world(local: ArrayLike<number>): Float64Array;
  /** An Earth-fixed point, local. */
  local(world: ArrayLike<number>): V3;
  /** A local direction, Earth-fixed. */
  worldDirection(local: ArrayLike<number>): Float64Array;
  /** An Earth-fixed direction, local. */
  localDirection(world: ArrayLike<number>): V3;
  /** A column-major matrix in local metres, as an Earth-fixed one. */
  matrix(local: ArrayLike<number>): Float64Array;
  /**
   * `matrix` without the site's translation: what `World.addBrep`'s `model`
   * is, with `origin` at the site.
   */
  rotation(local: ArrayLike<number>): Float64Array;
}

export function createSite(): Site {
  const origin = Ellipsoid.WGS84.cartographicToCartesian(
    fromDegrees(SITE_DEGREES.longitude, SITE_DEGREES.latitude, 0),
    vec3.vec3(),
  );
  const enu = eastNorthUpToFixedFrame(origin, Ellipsoid.WGS84, mat4.mat4());
  const axes = [0, 4, 8].map((c) =>
    Float64Array.of(enu[c]!, enu[c + 1]!, enu[c + 2]!),
  ) as [Float64Array, Float64Array, Float64Array];
  const [east, north, up] = axes;
  const worldDirection = (local: ArrayLike<number>) =>
    Float64Array.of(
      east[0]! * local[0]! + north[0]! * local[1]! + up[0]! * local[2]!,
      east[1]! * local[0]! + north[1]! * local[1]! + up[1]! * local[2]!,
      east[2]! * local[0]! + north[2]! * local[1]! + up[2]! * local[2]!,
    );
  const localDirection = (world: ArrayLike<number>): V3 => [
    dot(east, world),
    dot(north, world),
    dot(up, world),
  ];
  const rotation = (local: ArrayLike<number>) => {
    const out = new Float64Array(16);
    for (let c = 0; c < 4; c++) {
      const column = Float64Array.of(
        local[c * 4]!,
        local[c * 4 + 1]!,
        local[c * 4 + 2]!,
      );
      out.set(worldDirection(column), c * 4);
      out[c * 4 + 3] = local[c * 4 + 3]!;
    }
    return out;
  };
  return {
    origin,
    axes,
    world(local) {
      const d = worldDirection(local);
      return Float64Array.of(
        origin[0]! + d[0]!,
        origin[1]! + d[1]!,
        origin[2]! + d[2]!,
      );
    },
    local: (world) =>
      localDirection([
        world[0]! - origin[0]!,
        world[1]! - origin[1]!,
        world[2]! - origin[2]!,
      ]),
    worldDirection,
    localDirection,
    matrix(local) {
      const out = rotation(local);
      out[12] = out[12]! + origin[0]!;
      out[13] = out[13]! + origin[1]!;
      out[14] = out[14]! + origin[2]!;
      return out;
    },
    rotation,
  };
}

/**
 * A part placed at `at` (local metres), `size` times as big, as a
 * column-major matrix in local metres. `yUp` turns a glTF's Y-up axes to the
 * site's Z-up first (a quarter turn about x).
 */
export function placement(
  at: ArrayLike<number>,
  size: number,
  yUp = false,
): Float64Array {
  return Float64Array.of(
    size,
    0,
    0,
    0,
    0,
    yUp ? 0 : size,
    yUp ? size : 0,
    0,
    0,
    yUp ? -size : 0,
    yUp ? 0 : size,
    0,
    at[0]!,
    at[1]!,
    at[2]!,
    1,
  );
}
