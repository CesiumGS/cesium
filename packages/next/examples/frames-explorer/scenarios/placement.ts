// A design grid read off a local placement on the page (Task 7): the
// drone's footprint, traced on the page, has no PROJ there (R13), so the
// worker hands over a linear map exact at one point (drone.ts
// `localPlacement`). Light imports only: the page reads it.
import { Ellipsoid } from "../../../src/math/ellipsoid.ts";

/** Easting and northing of Earth-fixed `p` from a local placement: moved to its height along its normal first. */
export function onGrid(
  placement: { toDesign: readonly number[]; height: number },
  p: ArrayLike<number>,
): [number, number] {
  const g = Ellipsoid.WGS84.cartesianToCartographic(Float64Array.from(p), {
    longitude: 0,
    latitude: 0,
    height: 0,
  })!;
  const q = Ellipsoid.WGS84.cartographicToCartesian(
    { ...g, height: placement.height },
    new Float64Array(3),
  );
  const m = placement.toDesign;
  return [
    m[0]! * q[0]! + m[4]! * q[1]! + m[8]! * q[2]! + m[12]!,
    m[1]! * q[0]! + m[5]! * q[1]! + m[9]! * q[2]! + m[13]!,
  ];
}
