import Cartesian3 from "./Cartesian3.js";
import Cartographic from "./Cartographic.js";
import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import CesiumMath from "./Math.js";
import scaleToGeodeticSurface from "./scaleToGeodeticSurface.js";

function initialize(ellipsoid, x, y, z) {
  x = defaultValue(x, 0.0);
  y = defaultValue(y, 0.0);
  z = defaultValue(z, 0.0);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number.greaterThanOrEquals("x", x, 0.0);
  Check.typeOf.number.greaterThanOrEquals("y", y, 0.0);
  Check.typeOf.number.greaterThanOrEquals("z", z, 0.0);
  //>>includeEnd('debug');

  ellipsoid._radii = new Cartesian3(x, y, z);

  ellipsoid._radiiSquared = new Cartesian3(x * x, y * y, z * z);

  ellipsoid._radiiToTheFourth = new Cartesian3(
    x * x * x * x,
    y * y * y * y,
    z * z * z * z
  );

  ellipsoid._oneOverRadii = new Cartesian3(
    x === 0.0 ? 0.0 : 1.0 / x,
    y === 0.0 ? 0.0 : 1.0 / y,
    z === 0.0 ? 0.0 : 1.0 / z
  );

  ellipsoid._oneOverRadiiSquared = new Cartesian3(
    x === 0.0 ? 0.0 : 1.0 / (x * x),
    y === 0.0 ? 0.0 : 1.0 / (y * y),
    z === 0.0 ? 0.0 : 1.0 / (z * z)
  );

  ellipsoid._minimumRadius = Math.min(x, y, z);

  ellipsoid._maximumRadius = Math.max(x, y, z);

  ellipsoid._centerToleranceSquared = CesiumMath.EPSILON1;

  if (ellipsoid._radiiSquared.z !== 0) {
    ellipsoid._squaredXOverSquaredZ =
      ellipsoid._radiiSquared.x / ellipsoid._radiiSquared.z;
  }
}

/**
 * A quadratic surface defined in Cartesian coordinates by the equation
 * <code>(x / a)^2 + (y / b)^2 + (z / c)^2 = 1</code>.  Primarily used
 * by Cesium to represent the shape of planetary bodies.
 *
 * Rather than constructing this object directly, one of the provided
 * constants is normally used.
 * @alias Ellipsoid
 * @constructor
 *
 * @param {Number} [x=0] The radius in the x direction.
 * @param {Number} [y=0] The radius in the y direction.
 * @param {Number} [z=0] The radius in the z direction.
 *
 * @exception {DeveloperError} All radii components must be greater than or equal to zero.
 *
 * @see Ellipsoid.fromCartesian3
 * @see Ellipsoid.WGS84
 * @see Ellipsoid.UNIT_SPHERE
 */
function Ellipsoid(x, y, z) {
  this._radii = undefined;
  this._radiiSquared = undefined;
  this._radiiToTheFourth = undefined;
  this._oneOverRadii = undefined;
  this._oneOverRadiiSquared = undefined;
  this._minimumRadius = undefined;
  this._maximumRadius = undefined;
  this._centerToleranceSquared = undefined;
  this._squaredXOverSquaredZ = undefined;

  initialize(this, x, y, z);
}

Object.defineProperties(Ellipsoid.prototype, {
  /**
   * Gets the radii of the ellipsoid.
   * @memberof Ellipsoid.prototype
   * @type {Cartesian3}
   * @readonly
   */
  radii: {
    get: function () {
      return this._radii;
    },
  },
  /**
   * Gets the squared radii of the ellipsoid.
   * @memberof Ellipsoid.prototype
   * @type {Cartesian3}
   * @readonly
   */
  radiiSquared: {
    get: function () {
      return this._radiiSquared;
    },
  },
  /**
   * Gets the radii of the ellipsoid raise to the fourth power.
   * @memberof Ellipsoid.prototype
   * @type {Cartesian3}
   * @readonly
   */
  radiiToTheFourth: {
    get: function () {
      return this._radiiToTheFourth;
    },
  },
  /**
   * Gets one over the radii of the ellipsoid.
   * @memberof Ellipsoid.prototype
   * @type {Cartesian3}
   * @readonly
   */
  oneOverRadii: {
    get: function () {
      return this._oneOverRadii;
    },
  },
  /**
   * Gets one over the squared radii of the ellipsoid.
   * @memberof Ellipsoid.prototype
   * @type {Cartesian3}
   * @readonly
   */
  oneOverRadiiSquared: {
    get: function () {
      return this._oneOverRadiiSquared;
    },
  },
  /**
   * Gets the minimum radius of the ellipsoid.
   * @memberof Ellipsoid.prototype
   * @type {Number}
   * @readonly
   */
  minimumRadius: {
    get: function () {
      return this._minimumRadius;
    },
  },
  /**
   * Gets the maximum radius of the ellipsoid.
   * @memberof Ellipsoid.prototype
   * @type {Number}
   * @readonly
   */
  maximumRadius: {
    get: function () {
      return this._maximumRadius;
    },
  },
});

/**
 * Duplicates an Ellipsoid instance.
 *
 * @param {Ellipsoid} ellipsoid The ellipsoid to duplicate.
 * @param {Ellipsoid} [result] The object onto which to store the result, or undefined if a new
 *                    instance should be created.
 * @returns {Ellipsoid} The cloned Ellipsoid. (Returns undefined if ellipsoid is undefined)
 */
Ellipsoid.clone = function (ellipsoid, result) {
  if (!defined(ellipsoid)) {
    return undefined;
  }
  var radii = ellipsoid._radii;

  if (!defined(result)) {
    return new Ellipsoid(radii.x, radii.y, radii.z);
  }

  Cartesian3.clone(radii, result._radii);
  Cartesian3.clone(ellipsoid._radiiSquared, result._radiiSquared);
  Cartesian3.clone(ellipsoid._radiiToTheFourth, result._radiiToTheFourth);
  Cartesian3.clone(ellipsoid._oneOverRadii, result._oneOverRadii);
  Cartesian3.clone(ellipsoid._oneOverRadiiSquared, result._oneOverRadiiSquared);
  result._minimumRadius = ellipsoid._minimumRadius;
  result._maximumRadius = ellipsoid._maximumRadius;
  result._centerToleranceSquared = ellipsoid._centerToleranceSquared;

  return result;
};

/**
 * Computes an Ellipsoid from a Cartesian specifying the radii in x, y, and z directions.
 *
 * @param {Cartesian3} [cartesian=Cartesian3.ZERO] The ellipsoid's radius in the x, y, and z directions.
 * @param {Ellipsoid} [result] The object onto which to store the result, or undefined if a new
 *                    instance should be created.
 * @returns {Ellipsoid} A new Ellipsoid instance.
 *
 * @exception {DeveloperError} All radii components must be greater than or equal to zero.
 *
 * @see Ellipsoid.WGS84
 * @see Ellipsoid.UNIT_SPHERE
 */
Ellipsoid.fromCartesian3 = function (cartesian, result) {
  if (!defined(result)) {
    result = new Ellipsoid();
  }

  if (!defined(cartesian)) {
    return result;
  }

  initialize(result, cartesian.x, cartesian.y, cartesian.z);
  return result;
};

/**
 * An Ellipsoid instance initialized to the WGS84 standard.
 *
 * @type {Ellipsoid}
 * @constant
 */
Ellipsoid.WGS84 = Object.freeze(
  new Ellipsoid(6378137.0, 6378137.0, 6356752.3142451793)
);

/**
 * An Ellipsoid instance initialized to radii of (1.0, 1.0, 1.0).
 *
 * @type {Ellipsoid}
 * @constant
 */
Ellipsoid.UNIT_SPHERE = Object.freeze(new Ellipsoid(1.0, 1.0, 1.0));

/**
 * An Ellipsoid instance initialized to a sphere with the lunar radius.
 *
 * @type {Ellipsoid}
 * @constant
 */
Ellipsoid.MOON = Object.freeze(
  new Ellipsoid(
    CesiumMath.LUNAR_RADIUS,
    CesiumMath.LUNAR_RADIUS,
    CesiumMath.LUNAR_RADIUS
  )
);

/**
 * Duplicates an Ellipsoid instance.
 *
 * @param {Ellipsoid} [result] The object onto which to store the result, or undefined if a new
 *                    instance should be created.
 * @returns {Ellipsoid} The cloned Ellipsoid.
 */
Ellipsoid.prototype.clone = function (result) {
  return Ellipsoid.clone(this, result);
};

/**
 * The number of elements used to pack the object into an array.
 * @type {Number}
 */
Ellipsoid.packedLength = Cartesian3.packedLength;

/**
 * Stores the provided instance into the provided array.
 *
 * @param {Ellipsoid} value The value to pack.
 * @param {Number[]} array The array to pack into.
 * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
 *
 * @returns {Number[]} The array that was packed into
 */
Ellipsoid.pack = function (value, array, startingIndex) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("value", value);
  Check.defined("array", array);
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  Cartesian3.pack(value._radii, array, startingIndex);

  return array;
};

/**
 * Retrieves an instance from a packed array.
 *
 * @param {Number[]} array The packed array.
 * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
 * @param {Ellipsoid} [result] The object into which to store the result.
 * @returns {Ellipsoid} The modified result parameter or a new Ellipsoid instance if one was not provided.
 */
Ellipsoid.unpack = function (array, startingIndex, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("array", array);
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  var radii = Cartesian3.unpack(array, startingIndex);
  return Ellipsoid.fromCartesian3(radii, result);
};

/**
 * Computes the unit vector directed from the center of this ellipsoid toward the provided Cartesian position.
 * @function
 *
 * @param {Cartesian3} cartesian The Cartesian for which to to determine the geocentric normal.
 * @param {Cartesian3} [result] The object onto which to store the result.
 * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
 */
Ellipsoid.prototype.geocentricSurfaceNormal = Cartesian3.normalize;

/**
 * Computes the normal of the plane tangent to the surface of the ellipsoid at the provided position.
 *
 * @param {Cartographic} cartographic The cartographic position for which to to determine the geodetic normal.
 * @param {Cartesian3} [result] The object onto which to store the result.
 * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
 */
Ellipsoid.prototype.geodeticSurfaceNormalCartographic = function (
  cartographic,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("cartographic", cartographic);
  //>>includeEnd('debug');

  var longitude = cartographic.longitude;
  var latitude = cartographic.latitude;
  var cosLatitude = Math.cos(latitude);

  var x = cosLatitude * Math.cos(longitude);
  var y = cosLatitude * Math.sin(longitude);
  var z = Math.sin(latitude);

  if (!defined(result)) {
    result = new Cartesian3();
  }
  result.x = x;
  result.y = y;
  result.z = z;
  return Cartesian3.normalize(result, result);
};

/**
 * Computes the normal of the plane tangent to the surface of the ellipsoid at the provided position.
 *
 * @param {Cartesian3} cartesian The Cartesian position for which to to determine the surface normal.
 * @param {Cartesian3} [result] The object onto which to store the result.
 * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
 */
Ellipsoid.prototype.geodeticSurfaceNormal = function (cartesian, result) {
  if (
    Cartesian3.equalsEpsilon(cartesian, Cartesian3.ZERO, CesiumMath.EPSILON14)
  ) {
    return undefined;
  }
  if (!defined(result)) {
    result = new Cartesian3();
  }
  result = Cartesian3.multiplyComponents(
    cartesian,
    this._oneOverRadiiSquared,
    result
  );
  return Cartesian3.normalize(result, result);
};

var cartographicToCartesianNormal = new Cartesian3();
var cartographicToCartesianK = new Cartesian3();

/**
 * Converts the provided cartographic to Cartesian representation.
 *
 * @param {Cartographic} cartographic The cartographic position.
 * @param {Cartesian3} [result] The object onto which to store the result.
 * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
 *
 * @example
 * //Create a Cartographic and determine it's Cartesian representation on a WGS84 ellipsoid.
 * var position = new Cesium.Cartographic(Cesium.Math.toRadians(21), Cesium.Math.toRadians(78), 5000);
 * var cartesianPosition = Cesium.Ellipsoid.WGS84.cartographicToCartesian(position);
 */
Ellipsoid.prototype.cartographicToCartesian = function (cartographic, result) {
  //`cartographic is required` is thrown from geodeticSurfaceNormalCartographic.
  var n = cartographicToCartesianNormal;
  var k = cartographicToCartesianK;
  this.geodeticSurfaceNormalCartographic(cartographic, n);
  Cartesian3.multiplyComponents(this._radiiSquared, n, k);
  var gamma = Math.sqrt(Cartesian3.dot(n, k));
  Cartesian3.divideByScalar(k, gamma, k);
  Cartesian3.multiplyByScalar(n, cartographic.height, n);

  if (!defined(result)) {
    result = new Cartesian3();
  }
  return Cartesian3.add(k, n, result);
};

/**
 * Converts the provided array of cartographics to an array of Cartesians.
 *
 * @param {Cartographic[]} cartographics An array of cartographic positions.
 * @param {Cartesian3[]} [result] The object onto which to store the result.
 * @returns {Cartesian3[]} The modified result parameter or a new Array instance if none was provided.
 *
 * @example
 * //Convert an array of Cartographics and determine their Cartesian representation on a WGS84 ellipsoid.
 * var positions = [new Cesium.Cartographic(Cesium.Math.toRadians(21), Cesium.Math.toRadians(78), 0),
 *                  new Cesium.Cartographic(Cesium.Math.toRadians(21.321), Cesium.Math.toRadians(78.123), 100),
 *                  new Cesium.Cartographic(Cesium.Math.toRadians(21.645), Cesium.Math.toRadians(78.456), 250)];
 * var cartesianPositions = Cesium.Ellipsoid.WGS84.cartographicArrayToCartesianArray(positions);
 */
Ellipsoid.prototype.cartographicArrayToCartesianArray = function (
  cartographics,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("cartographics", cartographics);
  //>>includeEnd('debug')

  var length = cartographics.length;
  if (!defined(result)) {
    result = new Array(length);
  } else {
    result.length = length;
  }
  for (var i = 0; i < length; i++) {
    result[i] = this.cartographicToCartesian(cartographics[i], result[i]);
  }
  return result;
};

var cartesianToCartographicN = new Cartesian3();
var cartesianToCartographicP = new Cartesian3();
var cartesianToCartographicH = new Cartesian3();

/**
 * Converts the provided cartesian to cartographic representation.
 * The cartesian is undefined at the center of the ellipsoid.
 *
 * @param {Cartesian3} cartesian The Cartesian position to convert to cartographic representation.
 * @param {Cartographic} [result] The object onto which to store the result.
 * @returns {Cartographic} The modified result parameter, new Cartographic instance if none was provided, or undefined if the cartesian is at the center of the ellipsoid.
 *
 * @example
 * //Create a Cartesian and determine it's Cartographic representation on a WGS84 ellipsoid.
 * var position = new Cesium.Cartesian3(17832.12, 83234.52, 952313.73);
 * var cartographicPosition = Cesium.Ellipsoid.WGS84.cartesianToCartographic(position);
 */
Ellipsoid.prototype.cartesianToCartographic = function (cartesian, result) {
  //`cartesian is required.` is thrown from scaleToGeodeticSurface
  var p = this.scaleToGeodeticSurface(cartesian, cartesianToCartographicP);

  if (!defined(p)) {
    return undefined;
  }

  var n = this.geodeticSurfaceNormal(p, cartesianToCartographicN);
  var h = Cartesian3.subtract(cartesian, p, cartesianToCartographicH);

  var longitude = Math.atan2(n.y, n.x);
  var latitude = Math.asin(n.z);
  var height =
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
 * Converts the provided array of cartesians to an array of cartographics.
 *
 * @param {Cartesian3[]} cartesians An array of Cartesian positions.
 * @param {Cartographic[]} [result] The object onto which to store the result.
 * @returns {Cartographic[]} The modified result parameter or a new Array instance if none was provided.
 *
 * @example
 * //Create an array of Cartesians and determine their Cartographic representation on a WGS84 ellipsoid.
 * var positions = [new Cesium.Cartesian3(17832.12, 83234.52, 952313.73),
 *                  new Cesium.Cartesian3(17832.13, 83234.53, 952313.73),
 *                  new Cesium.Cartesian3(17832.14, 83234.54, 952313.73)]
 * var cartographicPositions = Cesium.Ellipsoid.WGS84.cartesianArrayToCartographicArray(positions);
 */
Ellipsoid.prototype.cartesianArrayToCartographicArray = function (
  cartesians,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("cartesians", cartesians);
  //>>includeEnd('debug');

  var length = cartesians.length;
  if (!defined(result)) {
    result = new Array(length);
  } else {
    result.length = length;
  }
  for (var i = 0; i < length; ++i) {
    result[i] = this.cartesianToCartographic(cartesians[i], result[i]);
  }
  return result;
};

/**
 * Scales the provided Cartesian position along the geodetic surface normal
 * so that it is on the surface of this ellipsoid.  If the position is
 * at the center of the ellipsoid, this function returns undefined.
 *
 * @param {Cartesian3} cartesian The Cartesian position to scale.
 * @param {Cartesian3} [result] The object onto which to store the result.
 * @returns {Cartesian3} The modified result parameter, a new Cartesian3 instance if none was provided, or undefined if the position is at the center.
 */
Ellipsoid.prototype.scaleToGeodeticSurface = function (cartesian, result) {
  return scaleToGeodeticSurface(
    cartesian,
    this._oneOverRadii,
    this._oneOverRadiiSquared,
    this._centerToleranceSquared,
    result
  );
};

/**
 * Scales the provided Cartesian position along the geocentric surface normal
 * so that it is on the surface of this ellipsoid.
 *
 * @param {Cartesian3} cartesian The Cartesian position to scale.
 * @param {Cartesian3} [result] The object onto which to store the result.
 * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
 */
Ellipsoid.prototype.scaleToGeocentricSurface = function (cartesian, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("cartesian", cartesian);
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new Cartesian3();
  }

  var positionX = cartesian.x;
  var positionY = cartesian.y;
  var positionZ = cartesian.z;
  var oneOverRadiiSquared = this._oneOverRadiiSquared;

  var beta =
    1.0 /
    Math.sqrt(
      positionX * positionX * oneOverRadiiSquared.x +
        positionY * positionY * oneOverRadiiSquared.y +
        positionZ * positionZ * oneOverRadiiSquared.z
    );

  return Cartesian3.multiplyByScalar(cartesian, beta, result);
};

/**
 * Transforms a Cartesian X, Y, Z position to the ellipsoid-scaled space by multiplying
 * its components by the result of {@link Ellipsoid#oneOverRadii}.
 *
 * @param {Cartesian3} position The position to transform.
 * @param {Cartesian3} [result] The position to which to copy the result, or undefined to create and
 *        return a new instance.
 * @returns {Cartesian3} The position expressed in the scaled space.  The returned instance is the
 *          one passed as the result parameter if it is not undefined, or a new instance of it is.
 */
Ellipsoid.prototype.transformPositionToScaledSpace = function (
  position,
  result
) {
  if (!defined(result)) {
    result = new Cartesian3();
  }

  return Cartesian3.multiplyComponents(position, this._oneOverRadii, result);
};

/**
 * Transforms a Cartesian X, Y, Z position from the ellipsoid-scaled space by multiplying
 * its components by the result of {@link Ellipsoid#radii}.
 *
 * @param {Cartesian3} position The position to transform.
 * @param {Cartesian3} [result] The position to which to copy the result, or undefined to create and
 *        return a new instance.
 * @returns {Cartesian3} The position expressed in the unscaled space.  The returned instance is the
 *          one passed as the result parameter if it is not undefined, or a new instance of it is.
 */
Ellipsoid.prototype.transformPositionFromScaledSpace = function (
  position,
  result
) {
  if (!defined(result)) {
    result = new Cartesian3();
  }

  return Cartesian3.multiplyComponents(position, this._radii, result);
};

/**
 * Compares this Ellipsoid against the provided Ellipsoid componentwise and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {Ellipsoid} [right] The other Ellipsoid.
 * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
 */
Ellipsoid.prototype.equals = function (right) {
  return (
    this === right ||
    (defined(right) && Cartesian3.equals(this._radii, right._radii))
  );
};

/**
 * Creates a string representing this Ellipsoid in the format '(radii.x, radii.y, radii.z)'.
 *
 * @returns {String} A string representing this ellipsoid in the format '(radii.x, radii.y, radii.z)'.
 */
Ellipsoid.prototype.toString = function () {
  return this._radii.toString();
};

/**
 * Computes a point which is the intersection of the surface normal with the z-axis.
 *
 * @param {Cartesian3} position the position. must be on the surface of the ellipsoid.
 * @param {Number} [buffer = 0.0] A buffer to subtract from the ellipsoid size when checking if the point is inside the ellipsoid.
 *                                In earth case, with common earth datums, there is no need for this buffer since the intersection point is always (relatively) very close to the center.
 *                                In WGS84 datum, intersection point is at max z = +-42841.31151331382 (0.673% of z-axis).
 *                                Intersection point could be outside the ellipsoid if the ratio of MajorAxis / AxisOfRotation is bigger than the square root of 2
 * @param {Cartesian3} [result] The cartesian to which to copy the result, or undefined to create and
 *        return a new instance.
 * @returns {Cartesian3 | undefined} the intersection point if it's inside the ellipsoid, undefined otherwise
 *
 * @exception {DeveloperError} position is required.
 * @exception {DeveloperError} Ellipsoid must be an ellipsoid of revolution (radii.x == radii.y).
 * @exception {DeveloperError} Ellipsoid.radii.z must be greater than 0.
 */
Ellipsoid.prototype.getSurfaceNormalIntersectionWithZAxis = function (
  position,
  buffer,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("position", position);

  if (
    !CesiumMath.equalsEpsilon(
      this._radii.x,
      this._radii.y,
      CesiumMath.EPSILON15
    )
  ) {
    throw new DeveloperError(
      "Ellipsoid must be an ellipsoid of revolution (radii.x == radii.y)"
    );
  }

  Check.typeOf.number.greaterThan("Ellipsoid.radii.z", this._radii.z, 0);
  //>>includeEnd('debug');

  buffer = defaultValue(buffer, 0.0);

  var squaredXOverSquaredZ = this._squaredXOverSquaredZ;

  if (!defined(result)) {
    result = new Cartesian3();
  }

  result.x = 0.0;
  result.y = 0.0;
  result.z = position.z * (1 - squaredXOverSquaredZ);

  if (Math.abs(result.z) >= this._radii.z - buffer) {
    return undefined;
  }

  return result;
};

var abscissas = [
  0.14887433898163,
  0.43339539412925,
  0.67940956829902,
  0.86506336668898,
  0.97390652851717,
  0.0,
];
var weights = [
  0.29552422471475,
  0.26926671930999,
  0.21908636251598,
  0.14945134915058,
  0.066671344308684,
  0.0,
];

/**
 * Compute the 10th order Gauss-Legendre Quadrature of the given definite integral.
 *
 * @param {Number} a The lower bound for the integration.
 * @param {Number} b The upper bound for the integration.
 * @param {Ellipsoid~RealValuedScalarFunction} func The function to integrate.
 * @returns {Number} The value of the integral of the given function over the given domain.
 *
 * @private
 */
function gaussLegendreQuadrature(a, b, func) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("a", a);
  Check.typeOf.number("b", b);
  Check.typeOf.func("func", func);
  //>>includeEnd('debug');

  // The range is half of the normal range since the five weights add to one (ten weights add to two).
  // The values of the abscissas are multiplied by two to account for this.
  var xMean = 0.5 * (b + a);
  var xRange = 0.5 * (b - a);

  var sum = 0.0;
  for (var i = 0; i < 5; i++) {
    var dx = xRange * abscissas[i];
    sum += weights[i] * (func(xMean + dx) + func(xMean - dx));
  }

  // Scale the sum to the range of x.
  sum *= xRange;
  return sum;
}

/**
 * A real valued scalar function.
 * @callback Ellipsoid~RealValuedScalarFunction
 *
 * @param {Number} x The value used to evaluate the function.
 * @returns {Number} The value of the function at x.
 *
 * @private
 */

/**
 * Computes an approximation of the surface area of a rectangle on the surface of an ellipsoid using
 * Gauss-Legendre 10th order quadrature.
 *
 * @param {Rectangle} rectangle The rectangle used for computing the surface area.
 * @returns {Number} The approximate area of the rectangle on the surface of this ellipsoid.
 */
Ellipsoid.prototype.surfaceArea = function (rectangle) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("rectangle", rectangle);
  //>>includeEnd('debug');
  var minLongitude = rectangle.west;
  var maxLongitude = rectangle.east;
  var minLatitude = rectangle.south;
  var maxLatitude = rectangle.north;

  while (maxLongitude < minLongitude) {
    maxLongitude += CesiumMath.TWO_PI;
  }

  var radiiSquared = this._radiiSquared;
  var a2 = radiiSquared.x;
  var b2 = radiiSquared.y;
  var c2 = radiiSquared.z;
  var a2b2 = a2 * b2;
  return gaussLegendreQuadrature(minLatitude, maxLatitude, function (lat) {
    // phi represents the angle measured from the north pole
    // sin(phi) = sin(pi / 2 - lat) = cos(lat), cos(phi) is similar
    var sinPhi = Math.cos(lat);
    var cosPhi = Math.sin(lat);
    return (
      Math.cos(lat) *
      gaussLegendreQuadrature(minLongitude, maxLongitude, function (lon) {
        var cosTheta = Math.cos(lon);
        var sinTheta = Math.sin(lon);
        return Math.sqrt(
          a2b2 * cosPhi * cosPhi +
            c2 *
              (b2 * cosTheta * cosTheta + a2 * sinTheta * sinTheta) *
              sinPhi *
              sinPhi
        );
      })
    );
  });
};

export default Ellipsoid;
