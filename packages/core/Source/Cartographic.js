import Cartesian3 from "./Cartesian3.js";
import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import CesiumMath from "./Math.js";
import scaleToGeodeticSurface from "./scaleToGeodeticSurface.js";

/**
 * A position defined by longitude, latitude, and height.
 * @alias Cartographic
 * @constructor
 *
 * @param {number} [longitude=0.0] The longitude, in radians.
 * @param {number} [latitude=0.0] The latitude, in radians.
 * @param {number} [height=0.0] The height, in meters, above the ellipsoid.
 *
 * @see Ellipsoid
 */
function Cartographic(longitude, latitude, height) {
  /**
   * The longitude, in radians.
   * @type {number}
   * @default 0.0
   */
  this.longitude = defaultValue(longitude, 0.0);

  /**
   * The latitude, in radians.
   * @type {number}
   * @default 0.0
   */
  this.latitude = defaultValue(latitude, 0.0);

  /**
   * The height, in meters, above the ellipsoid.
   * @type {number}
   * @default 0.0
   */
  this.height = defaultValue(height, 0.0);
}

/**
 * Creates a new Cartographic instance from longitude and latitude
 * specified in radians.
 *
 * @param {number} longitude The longitude, in radians.
 * @param {number} latitude The latitude, in radians.
 * @param {number} [height=0.0] The height, in meters, above the ellipsoid.
 * @param {Cartographic} [result] The object onto which to store the result.
 * @returns {Cartographic} The modified result parameter or a new Cartographic instance if one was not provided.
 */
Cartographic.fromRadians = function (longitude, latitude, height, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("longitude", longitude);
  Check.typeOf.number("latitude", latitude);
  //>>includeEnd('debug');

  height = defaultValue(height, 0.0);

  if (!defined(result)) {
    return new Cartographic(longitude, latitude, height);
  }

  result.longitude = longitude;
  result.latitude = latitude;
  result.height = height;
  return result;
};

/**
 * Creates a new Cartographic instance from longitude and latitude
 * specified in degrees.  The values in the resulting object will
 * be in radians.
 *
 * @param {number} longitude The longitude, in degrees.
 * @param {number} latitude The latitude, in degrees.
 * @param {number} [height=0.0] The height, in meters, above the ellipsoid.
 * @param {Cartographic} [result] The object onto which to store the result.
 * @returns {Cartographic} The modified result parameter or a new Cartographic instance if one was not provided.
 */
Cartographic.fromDegrees = function (longitude, latitude, height, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("longitude", longitude);
  Check.typeOf.number("latitude", latitude);
  //>>includeEnd('debug');

  longitude = CesiumMath.toRadians(longitude);
  latitude = CesiumMath.toRadians(latitude);

  return Cartographic.fromRadians(longitude, latitude, height, result);
};

const cartesianToCartographicN = new Cartesian3();
const cartesianToCartographicP = new Cartesian3();
const cartesianToCartographicH = new Cartesian3();

// To avoid circular dependencies, these are set by Ellipsoid when Ellipsoid.default is set.
Cartographic._ellipsoidOneOverRadii = new Cartesian3(
  1.0 / 6378137.0,
  1.0 / 6378137.0,
  1.0 / 6356752.3142451793,
);
Cartographic._ellipsoidOneOverRadiiSquared = new Cartesian3(
  1.0 / (6378137.0 * 6378137.0),
  1.0 / (6378137.0 * 6378137.0),
  1.0 / (6356752.3142451793 * 6356752.3142451793),
);
Cartographic._ellipsoidCenterToleranceSquared = CesiumMath.EPSILON1;

/**
 * Creates a new Cartographic instance from a Cartesian position. The values in the
 * resulting object will be in radians.
 *
 * @param {Cartesian3} cartesian The Cartesian position to convert to cartographic representation.
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.default] The ellipsoid on which the position lies.
 * @param {Cartographic} [result] The object onto which to store the result.
 * @returns {Cartographic} The modified result parameter, new Cartographic instance if none was provided, or undefined if the cartesian is at the center of the ellipsoid.
 */
Cartographic.fromCartesian = function (cartesian, ellipsoid, result) {
  const oneOverRadii = defined(ellipsoid)
    ? ellipsoid.oneOverRadii
    : Cartographic._ellipsoidOneOverRadii;
  const oneOverRadiiSquared = defined(ellipsoid)
    ? ellipsoid.oneOverRadiiSquared
    : Cartographic._ellipsoidOneOverRadiiSquared;
  const centerToleranceSquared = defined(ellipsoid)
    ? ellipsoid._centerToleranceSquared
    : Cartographic._ellipsoidCenterToleranceSquared;

  //`cartesian is required.` is thrown from scaleToGeodeticSurface
  const p = scaleToGeodeticSurface(
    cartesian,
    oneOverRadii,
    oneOverRadiiSquared,
    centerToleranceSquared,
    cartesianToCartographicP,
  );

  if (!defined(p)) {
    return undefined;
  }

  let n = Cartesian3.multiplyComponents(
    p,
    oneOverRadiiSquared,
    cartesianToCartographicN,
  );
  n = Cartesian3.normalize(n, n);

  const h = Cartesian3.subtract(cartesian, p, cartesianToCartographicH);

  const longitude = Math.atan2(n.y, n.x);
  const latitude = Math.asin(n.z);
  const height =
    CesiumMath.sign(Cartesian3.dot(h, cartesian)) * Cartesian3.magnitude(h);

  if (!defined(result)) {
    return new Cartographic(longitude, latitude, height);
  }
  result.longitude = longitude;
  result.latitude = latitude;
  result.height = height;
  return result;
};

/**
 * Creates a new Cartesian3 instance from a Cartographic input. The values in the inputted
 * object should be in radians.
 *
 * @param {Cartographic} cartographic Input to be converted into a Cartesian3 output.
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.default] The ellipsoid on which the position lies.
 * @param {Cartesian3} [result] The object onto which to store the result.
 * @returns {Cartesian3} The position
 */
Cartographic.toCartesian = function (cartographic, ellipsoid, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("cartographic", cartographic);
  //>>includeEnd('debug');

  return Cartesian3.fromRadians(
    cartographic.longitude,
    cartographic.latitude,
    cartographic.height,
    ellipsoid,
    result,
  );
};

/**
 * Duplicates a Cartographic instance.
 *
 * @param {Cartographic} cartographic The cartographic to duplicate.
 * @param {Cartographic} [result] The object onto which to store the result.
 * @returns {Cartographic} The modified result parameter or a new Cartographic instance if one was not provided. (Returns undefined if cartographic is undefined)
 */
Cartographic.clone = function (cartographic, result) {
  if (!defined(cartographic)) {
    return undefined;
  }
  if (!defined(result)) {
    return new Cartographic(
      cartographic.longitude,
      cartographic.latitude,
      cartographic.height,
    );
  }
  result.longitude = cartographic.longitude;
  result.latitude = cartographic.latitude;
  result.height = cartographic.height;
  return result;
};

/**
 * Compares the provided cartographics componentwise and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {Cartographic} [left] The first cartographic.
 * @param {Cartographic} [right] The second cartographic.
 * @returns {boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
 */
Cartographic.equals = function (left, right) {
  return (
    left === right ||
    (defined(left) &&
      defined(right) &&
      left.longitude === right.longitude &&
      left.latitude === right.latitude &&
      left.height === right.height)
  );
};

/**
 * Compares the provided cartographics componentwise and returns
 * <code>true</code> if they are within the provided epsilon,
 * <code>false</code> otherwise.
 *
 * @param {Cartographic} [left] The first cartographic.
 * @param {Cartographic} [right] The second cartographic.
 * @param {number} [epsilon=0] The epsilon to use for equality testing.
 * @returns {boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
 */
Cartographic.equalsEpsilon = function (left, right, epsilon) {
  epsilon = defaultValue(epsilon, 0);

  return (
    left === right ||
    (defined(left) &&
      defined(right) &&
      Math.abs(left.longitude - right.longitude) <= epsilon &&
      Math.abs(left.latitude - right.latitude) <= epsilon &&
      Math.abs(left.height - right.height) <= epsilon)
  );
};

/**
 * An immutable Cartographic instance initialized to (0.0, 0.0, 0.0).
 *
 * @type {Cartographic}
 * @constant
 */
Cartographic.ZERO = Object.freeze(new Cartographic(0.0, 0.0, 0.0));

/**
 * Duplicates this instance.
 *
 * @param {Cartographic} [result] The object onto which to store the result.
 * @returns {Cartographic} The modified result parameter or a new Cartographic instance if one was not provided.
 */
Cartographic.prototype.clone = function (result) {
  return Cartographic.clone(this, result);
};

/**
 * Compares the provided against this cartographic componentwise and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {Cartographic} [right] The second cartographic.
 * @returns {boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
 */
Cartographic.prototype.equals = function (right) {
  return Cartographic.equals(this, right);
};

/**
 * Compares the provided against this cartographic componentwise and returns
 * <code>true</code> if they are within the provided epsilon,
 * <code>false</code> otherwise.
 *
 * @param {Cartographic} [right] The second cartographic.
 * @param {number} [epsilon=0] The epsilon to use for equality testing.
 * @returns {boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
 */
Cartographic.prototype.equalsEpsilon = function (right, epsilon) {
  return Cartographic.equalsEpsilon(this, right, epsilon);
};

/**
 * Creates a string representing this cartographic in the format '(longitude, latitude, height)'.
 *
 * @returns {string} A string representing the provided cartographic in the format '(longitude, latitude, height)'.
 */
Cartographic.prototype.toString = function () {
  return `(${this.longitude}, ${this.latitude}, ${this.height})`;
};
export default Cartographic;
