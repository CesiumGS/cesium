import Cartesian3 from "./Cartesian3.js";
import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import CesiumMath from "./Math.js";
import scaleToGeodeticSurface from "./scaleToGeodeticSurface.js";

/**
 * A position defined by longitude, latitude, and height，but in degrees
 * @alias Coordinates
 * @constructor
 *
 * @param {Number} [longitude=0.0] The longitude, in degrees.
 * @param {Number} [latitude=0.0] The latitude, in degrees.
 * @param {Number} [height=0.0] The height, in meters, above the ellipsoid.
 *
 * @see Ellipsoid
 */
function Coordinates(longitude, latitude, height) {
  /**
   * The longitude, in degrees.
   * @type {Number}
   * @default 0.0
   */
  this.longitude = defaultValue(longitude, 0.0);

  /**
   * The latitude, in degrees.
   * @type {Number}
   * @default 0.0
   */
  this.latitude = defaultValue(latitude, 0.0);

  /**
   * The height, in meters, above the ellipsoid.
   * @type {Number}
   * @default 0.0
   */
  this.height = defaultValue(height, 0.0);
}

/**
 * Creates a new Cartographic instance from longitude and latitude
 * specified in degrees.
 *
 * @param {Number} longitude The longitude, in degrees.
 * @param {Number} latitude The latitude, in degrees.
 * @param {Number} [height=0.0] The height, in meters, above the ellipsoid.
 * @param {Coordinates} [result] The object onto which to store the result.
 * @returns {Coordinates} The modified result parameter or a new Cartographic instance if one was not provided.
 */
Coordinates.fromDegrees = function (longitude, latitude, height, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("longitude", longitude);
  Check.typeOf.number("latitude", latitude);
  //>>includeEnd('debug');

  height = defaultValue(height, 0.0);

  if (!defined(result)) {
    return new Coordinates(longitude, latitude, height);
  }

  result.longitude = longitude;
  result.latitude = latitude;
  result.height = height;
  return result;
};

/**
 * Creates a new Cartographic instance from longitude and latitude
 * specified in degrees.  The values in the resulting object will
 * be in degrees.
 *
 * @param {Number} longitude The longitude, in degrees.
 * @param {Number} latitude The latitude, in degrees.
 * @param {Number} [height=0.0] The height, in meters, above the ellipsoid.
 * @param {Coordinates} [result] The object onto which to store the result.
 * @returns {Coordinates} The modified result parameter or a new Cartographic instance if one was not provided.
 */
Coordinates.fromRadians = function (longitude, latitude, height, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("longitude", longitude);
  Check.typeOf.number("latitude", latitude);
  //>>includeEnd('debug');
  longitude = CesiumMath.toRadians(longitude);
  latitude = CesiumMath.toRadians(latitude);

  return Coordinates.fromDegrees(longitude, latitude, height, result);
};

var cartesianToCartographicN = new Cartesian3();
var cartesianToCartographicP = new Cartesian3();
var cartesianToCartographicH = new Cartesian3();
var wgs84OneOverRadii = new Cartesian3(
  1.0 / 6378137.0,
  1.0 / 6378137.0,
  1.0 / 6356752.3142451793
);
var wgs84OneOverRadiiSquared = new Cartesian3(
  1.0 / (6378137.0 * 6378137.0),
  1.0 / (6378137.0 * 6378137.0),
  1.0 / (6356752.3142451793 * 6356752.3142451793)
);
var wgs84CenterToleranceSquared = CesiumMath.EPSILON1;

/**
 * Creates a new Cartographic instance from a Cartesian position. The values in the
 * resulting object will be in degrees.
 *
 * @param {Cartesian3} cartesian The Cartesian position to convert to cartographic representation.
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the position lies.
 * @param {Coordinates} [result] The object onto which to store the result.
 * @returns {Coordinates} The modified result parameter, new Cartographic instance if none was provided, or undefined if the cartesian is at the center of the ellipsoid.
 */
Coordinates.fromCartesian = function (cartesian, ellipsoid, result) {
  var oneOverRadii = defined(ellipsoid)
    ? ellipsoid.oneOverRadii
    : wgs84OneOverRadii;
  var oneOverRadiiSquared = defined(ellipsoid)
    ? ellipsoid.oneOverRadiiSquared
    : wgs84OneOverRadiiSquared;
  var centerToleranceSquared = defined(ellipsoid)
    ? ellipsoid._centerToleranceSquared
    : wgs84CenterToleranceSquared;

  //`cartesian is required.` is thrown from scaleToGeodeticSurface
  var p = scaleToGeodeticSurface(
    cartesian,
    oneOverRadii,
    oneOverRadiiSquared,
    centerToleranceSquared,
    cartesianToCartographicP
  );

  if (!defined(p)) {
    return undefined;
  }

  var n = Cartesian3.multiplyComponents(
    p,
    oneOverRadiiSquared,
    cartesianToCartographicN
  );
  n = Cartesian3.normalize(n, n);

  var h = Cartesian3.subtract(cartesian, p, cartesianToCartographicH);

  var longitude = Math.atan2(n.y, n.x);
  var latitude = Math.asin(n.z);
  var height =
    CesiumMath.sign(Cartesian3.dot(h, cartesian)) * Cartesian3.magnitude(h);

  if (!defined(result)) {
    return new Coordinates(
      CesiumMath.toDegrees(longitude),
      CesiumMath.toDegrees(latitude),
      height
    );
  }
  result.longitude = CesiumMath.toDegrees(longitude);
  result.latitude = CesiumMath.toDegrees(latitude);
  result.height = height;
  return result;
};

/**
 * Creates a new Cartesian3 instance from a Cartographic input. The values in the inputted
 * object should be in degrees.
 *
 * @param {Coordinates} coordinates Input to be converted into a Cartesian3 output.
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the position lies.
 * @param {Cartesian3} [result] The object onto which to store the result.
 * @returns {Cartesian3} The position
 */
Coordinates.toCartesian = function (coordinates, ellipsoid, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("cartographic", coordinates);
  //>>includeEnd('debug');

  return Cartesian3.fromDegrees(
    coordinates.longitude,
    coordinates.latitude,
    coordinates.height,
    ellipsoid,
    result
  );
};

/**
 * Duplicates a Cartographic instance.
 *
 * @param {Coordinates} coordinates The cartographic to duplicate.
 * @param {Coordinates} [result] The object onto which to store the result.
 * @returns {Coordinates} The modified result parameter or a new Cartographic instance if one was not provided. (Returns undefined if cartographic is undefined)
 */
Coordinates.clone = function (coordinates, result) {
  if (!defined(coordinates)) {
    return undefined;
  }
  if (!defined(result)) {
    return new Coordinates(
      coordinates.longitude,
      coordinates.latitude,
      coordinates.height
    );
  }
  result.longitude = coordinates.longitude;
  result.latitude = coordinates.latitude;
  result.height = coordinates.height;
  return result;
};

/**
 * Compares the provided cartographics componentwise and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {Coordinates} [left] The first cartographic.
 * @param {Coordinates} [right] The second cartographic.
 * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
 */
Coordinates.equals = function (left, right) {
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
 * @param {Coordinates} [left] The first cartographic.
 * @param {Coordinates} [right] The second cartographic.
 * @param {Number} [epsilon=0] The epsilon to use for equality testing.
 * @returns {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
 */
Coordinates.equalsEpsilon = function (left, right, epsilon) {
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
 * @type {Coordinates}
 * @constant
 */
Coordinates.ZERO = Object.freeze(new Coordinates(0.0, 0.0, 0.0));

/**
 * Duplicates this instance.
 *
 * @param {Coordinates} [result] The object onto which to store the result.
 * @returns {Coordinates} The modified result parameter or a new Cartographic instance if one was not provided.
 */
Coordinates.prototype.clone = function (result) {
  return Coordinates.clone(this, result);
};

/**
 * Compares the provided against this cartographic componentwise and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {Coordinates} [right] The second cartographic.
 * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
 */
Coordinates.prototype.equals = function (right) {
  return Coordinates.equals(this, right);
};

/**
 * Compares the provided against this cartographic componentwise and returns
 * <code>true</code> if they are within the provided epsilon,
 * <code>false</code> otherwise.
 *
 * @param {Coordinates} [right] The second cartographic.
 * @param {Number} [epsilon=0] The epsilon to use for equality testing.
 * @returns {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
 */
Coordinates.prototype.equalsEpsilon = function (right, epsilon) {
  return Coordinates.equalsEpsilon(this, right, epsilon);
};

/**
 * Creates a string representing this cartographic in the format '(longitude, latitude, height)'.
 *
 * @returns {String} A string representing the provided cartographic in the format '(longitude, latitude, height)'.
 */
Coordinates.prototype.toString = function () {
  return "(" + this.longitude + ", " + this.latitude + ", " + this.height + ")";
};
export default Coordinates;
