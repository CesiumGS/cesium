import Cartesian3 from "./Cartesian3.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import CesiumMath from "./Math.js";

const scaleToGeodeticSurfaceIntersection = new Cartesian3();
const scaleToGeodeticSurfaceGradient = new Cartesian3();

/**
 * Scales the provided Cartesian position along the geodetic surface normal
 * so that it is on the surface of this ellipsoid.  If the position is
 * at the center of the ellipsoid, this function returns undefined.
 *
 * @param {Cartesian3} cartesian The Cartesian position to scale.
 * @param {Cartesian3} oneOverRadii One over radii of the ellipsoid.
 * @param {Cartesian3} oneOverRadiiSquared One over radii squared of the ellipsoid.
 * @param {number} centerToleranceSquared Tolerance for closeness to the center.
 * @param {Cartesian3} [result] The object onto which to store the result.
 * @returns {Cartesian3} The modified result parameter, a new Cartesian3 instance if none was provided, or undefined if the position is at the center.
 *
 * @function scaleToGeodeticSurface
 *
 * @private
 */
function scaleToGeodeticSurface(
  cartesian,
  oneOverRadii,
  oneOverRadiiSquared,
  centerToleranceSquared,
  result,
) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(cartesian)) {
    throw new DeveloperError("cartesian is required.");
  }
  if (!defined(oneOverRadii)) {
    throw new DeveloperError("oneOverRadii is required.");
  }
  if (!defined(oneOverRadiiSquared)) {
    throw new DeveloperError("oneOverRadiiSquared is required.");
  }
  if (!defined(centerToleranceSquared)) {
    throw new DeveloperError("centerToleranceSquared is required.");
  }
  //>>includeEnd('debug');

  const positionX = cartesian.x;
  const positionY = cartesian.y;
  const positionZ = cartesian.z;

  const oneOverRadiiX = oneOverRadii.x;
  const oneOverRadiiY = oneOverRadii.y;
  const oneOverRadiiZ = oneOverRadii.z;

  const x2 = positionX * positionX * oneOverRadiiX * oneOverRadiiX;
  const y2 = positionY * positionY * oneOverRadiiY * oneOverRadiiY;
  const z2 = positionZ * positionZ * oneOverRadiiZ * oneOverRadiiZ;

  // Compute the squared ellipsoid norm.
  const squaredNorm = x2 + y2 + z2;
  const ratio = Math.sqrt(1.0 / squaredNorm);

  // As an initial approximation, assume that the radial intersection is the projection point.
  const intersection = Cartesian3.multiplyByScalar(
    cartesian,
    ratio,
    scaleToGeodeticSurfaceIntersection,
  );

  // If the position is near the center, the iteration will not converge.
  if (squaredNorm < centerToleranceSquared) {
    return !isFinite(ratio)
      ? undefined
      : Cartesian3.clone(intersection, result);
  }

  const oneOverRadiiSquaredX = oneOverRadiiSquared.x;
  const oneOverRadiiSquaredY = oneOverRadiiSquared.y;
  const oneOverRadiiSquaredZ = oneOverRadiiSquared.z;

  // Use the gradient at the intersection point in place of the true unit normal.
  // The difference in magnitude will be absorbed in the multiplier.
  const gradient = scaleToGeodeticSurfaceGradient;
  gradient.x = intersection.x * oneOverRadiiSquaredX * 2.0;
  gradient.y = intersection.y * oneOverRadiiSquaredY * 2.0;
  gradient.z = intersection.z * oneOverRadiiSquaredZ * 2.0;

  // Compute the initial guess at the normal vector multiplier, lambda.
  let lambda =
    ((1.0 - ratio) * Cartesian3.magnitude(cartesian)) /
    (0.5 * Cartesian3.magnitude(gradient));
  let correction = 0.0;

  let func;
  let denominator;
  let xMultiplier;
  let yMultiplier;
  let zMultiplier;
  let xMultiplier2;
  let yMultiplier2;
  let zMultiplier2;
  let xMultiplier3;
  let yMultiplier3;
  let zMultiplier3;

  do {
    lambda -= correction;

    xMultiplier = 1.0 / (1.0 + lambda * oneOverRadiiSquaredX);
    yMultiplier = 1.0 / (1.0 + lambda * oneOverRadiiSquaredY);
    zMultiplier = 1.0 / (1.0 + lambda * oneOverRadiiSquaredZ);

    xMultiplier2 = xMultiplier * xMultiplier;
    yMultiplier2 = yMultiplier * yMultiplier;
    zMultiplier2 = zMultiplier * zMultiplier;

    xMultiplier3 = xMultiplier2 * xMultiplier;
    yMultiplier3 = yMultiplier2 * yMultiplier;
    zMultiplier3 = zMultiplier2 * zMultiplier;

    func = x2 * xMultiplier2 + y2 * yMultiplier2 + z2 * zMultiplier2 - 1.0;

    // "denominator" here refers to the use of this expression in the velocity and acceleration
    // computations in the sections to follow.
    denominator =
      x2 * xMultiplier3 * oneOverRadiiSquaredX +
      y2 * yMultiplier3 * oneOverRadiiSquaredY +
      z2 * zMultiplier3 * oneOverRadiiSquaredZ;

    const derivative = -2.0 * denominator;

    correction = func / derivative;
  } while (Math.abs(func) > CesiumMath.EPSILON12);

  if (!defined(result)) {
    return new Cartesian3(
      positionX * xMultiplier,
      positionY * yMultiplier,
      positionZ * zMultiplier,
    );
  }
  result.x = positionX * xMultiplier;
  result.y = positionY * yMultiplier;
  result.z = positionZ * zMultiplier;
  return result;
}
export default scaleToGeodeticSurface;
