import Cartesian3 from "./Cartesian3.js";
import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import Matrix4 from "./Matrix4.js";

/**
 * Represents a ray that extends infinitely from the provided origin in the provided direction.
 * @alias Ray
 * @constructor
 *
 * @param {Cartesian3} [origin=Cartesian3.ZERO] The origin of the ray.
 * @param {Cartesian3} [direction=Cartesian3.ZERO] The direction of the ray.
 */
function Ray(origin, direction) {
  direction = Cartesian3.clone(defaultValue(direction, Cartesian3.ZERO));
  if (!Cartesian3.equals(direction, Cartesian3.ZERO)) {
    Cartesian3.normalize(direction, direction);
  }

  /**
   * The origin of the ray.
   * @type {Cartesian3}
   * @default {@link Cartesian3.ZERO}
   */
  this.origin = Cartesian3.clone(defaultValue(origin, Cartesian3.ZERO));

  /**
   * The direction of the ray.
   * @type {Cartesian3}
   */
  this.direction = direction;
}

/**
 * Duplicates a Ray instance.
 *
 * @param {Ray} ray The ray to duplicate.
 * @param {Ray} [result] The object onto which to store the result.
 * @returns {Ray} The modified result parameter or a new Ray instance if one was not provided. (Returns undefined if ray is undefined)
 */
Ray.clone = function (ray, result) {
  if (!defined(ray)) {
    return undefined;
  }
  if (!defined(result)) {
    return new Ray(ray.origin, ray.direction);
  }
  result.origin = Cartesian3.clone(ray.origin);
  result.direction = Cartesian3.clone(ray.direction);
  return result;
};

/**
 * Computes the point along the ray given by r(t) = o + t*d,
 * where o is the origin of the ray and d is the direction.
 *
 * @param {Ray} ray The ray.
 * @param {number} t A scalar value.
 * @param {Cartesian3} [result] The object in which the result will be stored.
 * @returns {Cartesian3} The modified result parameter, or a new instance if none was provided.
 *
 * @example
 * //Get the first intersection point of a ray and an ellipsoid.
 * const intersection = Cesium.IntersectionTests.rayEllipsoid(ray, ellipsoid);
 * const point = Cesium.Ray.getPoint(ray, intersection.start);
 */
Ray.getPoint = function (ray, t, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("ray", ray);
  Check.typeOf.number("t", t);
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new Cartesian3();
  }

  result = Cartesian3.multiplyByScalar(ray.direction, t, result);
  return Cartesian3.add(ray.origin, result, result);
};

/**
 * Transforms the ray by the given transformation matrix. The resulting ray's direction is not garunteed to be normalized.
 *
 * @param {Ray} ray The ray.
 * @param {Matrix4} transform The transformation matrix.
 * @param {Ray} [result] The transformed ray.
 * @returns {Ray} The transformed ray.
 */
Ray.transform = function (ray, transform, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("ray", ray);
  Check.typeOf.object("transform", transform);
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new Ray();
  }

  result.origin = Matrix4.multiplyByPoint(transform, ray.origin, result.origin);
  result.direction = Matrix4.multiplyByPointAsVector(
    transform,
    ray.direction,
    result.direction
  );

  return result;
};

export default Ray;
