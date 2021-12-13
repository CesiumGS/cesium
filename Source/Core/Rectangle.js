import Cartographic from "./Cartographic.js";
import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import Ellipsoid from "./Ellipsoid.js";
import CesiumMath from "./Math.js";

/**
 * A two dimensional region specified as longitude and latitude coordinates.
 *
 * @alias Rectangle
 * @constructor
 *
 * @param {Number} [west=0.0] The westernmost longitude, in radians, in the range [-Pi, Pi].
 * @param {Number} [south=0.0] The southernmost latitude, in radians, in the range [-Pi/2, Pi/2].
 * @param {Number} [east=0.0] The easternmost longitude, in radians, in the range [-Pi, Pi].
 * @param {Number} [north=0.0] The northernmost latitude, in radians, in the range [-Pi/2, Pi/2].
 *
 * @see Packable
 */
function Rectangle(west, south, east, north) {
  /**
   * The westernmost longitude in radians in the range [-Pi, Pi].
   *
   * @type {Number}
   * @default 0.0
   */
  this.west = defaultValue(west, 0.0);

  /**
   * The southernmost latitude in radians in the range [-Pi/2, Pi/2].
   *
   * @type {Number}
   * @default 0.0
   */
  this.south = defaultValue(south, 0.0);

  /**
   * The easternmost longitude in radians in the range [-Pi, Pi].
   *
   * @type {Number}
   * @default 0.0
   */
  this.east = defaultValue(east, 0.0);

  /**
   * The northernmost latitude in radians in the range [-Pi/2, Pi/2].
   *
   * @type {Number}
   * @default 0.0
   */
  this.north = defaultValue(north, 0.0);
}

Object.defineProperties(Rectangle.prototype, {
  /**
   * Gets the width of the rectangle in radians.
   * @memberof Rectangle.prototype
   * @type {Number}
   * @readonly
   */
  width: {
    get: function () {
      return Rectangle.computeWidth(this);
    },
  },

  /**
   * Gets the height of the rectangle in radians.
   * @memberof Rectangle.prototype
   * @type {Number}
   * @readonly
   */
  height: {
    get: function () {
      return Rectangle.computeHeight(this);
    },
  },
});

/**
 * The number of elements used to pack the object into an array.
 * @type {Number}
 */
Rectangle.packedLength = 4;

/**
 * Stores the provided instance into the provided array.
 *
 * @param {Rectangle} value The value to pack.
 * @param {Number[]} array The array to pack into.
 * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
 *
 * @returns {Number[]} The array that was packed into
 */
Rectangle.pack = function (value, array, startingIndex) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("value", value);
  Check.defined("array", array);
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  array[startingIndex++] = value.west;
  array[startingIndex++] = value.south;
  array[startingIndex++] = value.east;
  array[startingIndex] = value.north;

  return array;
};

/**
 * Retrieves an instance from a packed array.
 *
 * @param {Number[]} array The packed array.
 * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
 * @param {Rectangle} [result] The object into which to store the result.
 * @returns {Rectangle} The modified result parameter or a new Rectangle instance if one was not provided.
 */
Rectangle.unpack = function (array, startingIndex, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("array", array);
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  if (!defined(result)) {
    result = new Rectangle();
  }

  result.west = array[startingIndex++];
  result.south = array[startingIndex++];
  result.east = array[startingIndex++];
  result.north = array[startingIndex];
  return result;
};

/**
 * Computes the width of a rectangle in radians.
 * @param {Rectangle} rectangle The rectangle to compute the width of.
 * @returns {Number} The width.
 */
Rectangle.computeWidth = function (rectangle) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("rectangle", rectangle);
  //>>includeEnd('debug');
  var east = rectangle.east;
  var west = rectangle.west;
  if (east < west) {
    east += CesiumMath.TWO_PI;
  }
  return east - west;
};

/**
 * Computes the height of a rectangle in radians.
 * @param {Rectangle} rectangle The rectangle to compute the height of.
 * @returns {Number} The height.
 */
Rectangle.computeHeight = function (rectangle) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("rectangle", rectangle);
  //>>includeEnd('debug');
  return rectangle.north - rectangle.south;
};

/**
 * Creates a rectangle given the boundary longitude and latitude in degrees.
 *
 * @param {Number} [west=0.0] The westernmost longitude in degrees in the range [-180.0, 180.0].
 * @param {Number} [south=0.0] The southernmost latitude in degrees in the range [-90.0, 90.0].
 * @param {Number} [east=0.0] The easternmost longitude in degrees in the range [-180.0, 180.0].
 * @param {Number} [north=0.0] The northernmost latitude in degrees in the range [-90.0, 90.0].
 * @param {Rectangle} [result] The object onto which to store the result, or undefined if a new instance should be created.
 * @returns {Rectangle} The modified result parameter or a new Rectangle instance if none was provided.
 *
 * @example
 * var rectangle = Cesium.Rectangle.fromDegrees(0.0, 20.0, 10.0, 30.0);
 */
Rectangle.fromDegrees = function (west, south, east, north, result) {
  west = CesiumMath.toRadians(defaultValue(west, 0.0));
  south = CesiumMath.toRadians(defaultValue(south, 0.0));
  east = CesiumMath.toRadians(defaultValue(east, 0.0));
  north = CesiumMath.toRadians(defaultValue(north, 0.0));

  if (!defined(result)) {
    return new Rectangle(west, south, east, north);
  }

  result.west = west;
  result.south = south;
  result.east = east;
  result.north = north;

  return result;
};

/**
 * Creates a rectangle given the boundary longitude and latitude in radians.
 *
 * @param {Number} [west=0.0] The westernmost longitude in radians in the range [-Math.PI, Math.PI].
 * @param {Number} [south=0.0] The southernmost latitude in radians in the range [-Math.PI/2, Math.PI/2].
 * @param {Number} [east=0.0] The easternmost longitude in radians in the range [-Math.PI, Math.PI].
 * @param {Number} [north=0.0] The northernmost latitude in radians in the range [-Math.PI/2, Math.PI/2].
 * @param {Rectangle} [result] The object onto which to store the result, or undefined if a new instance should be created.
 * @returns {Rectangle} The modified result parameter or a new Rectangle instance if none was provided.
 *
 * @example
 * var rectangle = Cesium.Rectangle.fromRadians(0.0, Math.PI/4, Math.PI/8, 3*Math.PI/4);
 */
Rectangle.fromRadians = function (west, south, east, north, result) {
  if (!defined(result)) {
    return new Rectangle(west, south, east, north);
  }

  result.west = defaultValue(west, 0.0);
  result.south = defaultValue(south, 0.0);
  result.east = defaultValue(east, 0.0);
  result.north = defaultValue(north, 0.0);

  return result;
};

/**
 * Creates the smallest possible Rectangle that encloses all positions in the provided array.
 *
 * @param {Cartographic[]} cartographics The list of Cartographic instances.
 * @param {Rectangle} [result] The object onto which to store the result, or undefined if a new instance should be created.
 * @returns {Rectangle} The modified result parameter or a new Rectangle instance if none was provided.
 */
Rectangle.fromCartographicArray = function (cartographics, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("cartographics", cartographics);
  //>>includeEnd('debug');

  var west = Number.MAX_VALUE;
  var east = -Number.MAX_VALUE;
  var westOverIDL = Number.MAX_VALUE;
  var eastOverIDL = -Number.MAX_VALUE;
  var south = Number.MAX_VALUE;
  var north = -Number.MAX_VALUE;

  for (var i = 0, len = cartographics.length; i < len; i++) {
    var position = cartographics[i];
    west = Math.min(west, position.longitude);
    east = Math.max(east, position.longitude);
    south = Math.min(south, position.latitude);
    north = Math.max(north, position.latitude);

    var lonAdjusted =
      position.longitude >= 0
        ? position.longitude
        : position.longitude + CesiumMath.TWO_PI;
    westOverIDL = Math.min(westOverIDL, lonAdjusted);
    eastOverIDL = Math.max(eastOverIDL, lonAdjusted);
  }

  if (east - west > eastOverIDL - westOverIDL) {
    west = westOverIDL;
    east = eastOverIDL;

    if (east > CesiumMath.PI) {
      east = east - CesiumMath.TWO_PI;
    }
    if (west > CesiumMath.PI) {
      west = west - CesiumMath.TWO_PI;
    }
  }

  if (!defined(result)) {
    return new Rectangle(west, south, east, north);
  }

  result.west = west;
  result.south = south;
  result.east = east;
  result.north = north;
  return result;
};

/**
 * Creates the smallest possible Rectangle that encloses all positions in the provided array.
 *
 * @param {Cartesian3[]} cartesians The list of Cartesian instances.
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid the cartesians are on.
 * @param {Rectangle} [result] The object onto which to store the result, or undefined if a new instance should be created.
 * @returns {Rectangle} The modified result parameter or a new Rectangle instance if none was provided.
 */
Rectangle.fromCartesianArray = function (cartesians, ellipsoid, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("cartesians", cartesians);
  //>>includeEnd('debug');
  ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

  var west = Number.MAX_VALUE;
  var east = -Number.MAX_VALUE;
  var westOverIDL = Number.MAX_VALUE;
  var eastOverIDL = -Number.MAX_VALUE;
  var south = Number.MAX_VALUE;
  var north = -Number.MAX_VALUE;

  for (var i = 0, len = cartesians.length; i < len; i++) {
    var position = ellipsoid.cartesianToCartographic(cartesians[i]);
    west = Math.min(west, position.longitude);
    east = Math.max(east, position.longitude);
    south = Math.min(south, position.latitude);
    north = Math.max(north, position.latitude);

    var lonAdjusted =
      position.longitude >= 0
        ? position.longitude
        : position.longitude + CesiumMath.TWO_PI;
    westOverIDL = Math.min(westOverIDL, lonAdjusted);
    eastOverIDL = Math.max(eastOverIDL, lonAdjusted);
  }

  if (east - west > eastOverIDL - westOverIDL) {
    west = westOverIDL;
    east = eastOverIDL;

    if (east > CesiumMath.PI) {
      east = east - CesiumMath.TWO_PI;
    }
    if (west > CesiumMath.PI) {
      west = west - CesiumMath.TWO_PI;
    }
  }

  if (!defined(result)) {
    return new Rectangle(west, south, east, north);
  }

  result.west = west;
  result.south = south;
  result.east = east;
  result.north = north;
  return result;
};

/**
 * Duplicates a Rectangle.
 *
 * @param {Rectangle} rectangle The rectangle to clone.
 * @param {Rectangle} [result] The object onto which to store the result, or undefined if a new instance should be created.
 * @returns {Rectangle} The modified result parameter or a new Rectangle instance if none was provided. (Returns undefined if rectangle is undefined)
 */
Rectangle.clone = function (rectangle, result) {
  if (!defined(rectangle)) {
    return undefined;
  }

  if (!defined(result)) {
    return new Rectangle(
      rectangle.west,
      rectangle.south,
      rectangle.east,
      rectangle.north
    );
  }

  result.west = rectangle.west;
  result.south = rectangle.south;
  result.east = rectangle.east;
  result.north = rectangle.north;
  return result;
};

/**
 * Compares the provided Rectangles componentwise and returns
 * <code>true</code> if they pass an absolute or relative tolerance test,
 * <code>false</code> otherwise.
 *
 * @param {Rectangle} [left] The first Rectangle.
 * @param {Rectangle} [right] The second Rectangle.
 * @param {Number} [absoluteEpsilon=0] The absolute epsilon tolerance to use for equality testing.
 * @returns {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
 */
Rectangle.equalsEpsilon = function (left, right, absoluteEpsilon) {
  absoluteEpsilon = defaultValue(absoluteEpsilon, 0);

  return (
    left === right ||
    (defined(left) &&
      defined(right) &&
      Math.abs(left.west - right.west) <= absoluteEpsilon &&
      Math.abs(left.south - right.south) <= absoluteEpsilon &&
      Math.abs(left.east - right.east) <= absoluteEpsilon &&
      Math.abs(left.north - right.north) <= absoluteEpsilon)
  );
};

/**
 * Duplicates this Rectangle.
 *
 * @param {Rectangle} [result] The object onto which to store the result.
 * @returns {Rectangle} The modified result parameter or a new Rectangle instance if none was provided.
 */
Rectangle.prototype.clone = function (result) {
  return Rectangle.clone(this, result);
};

/**
 * Compares the provided Rectangle with this Rectangle componentwise and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {Rectangle} [other] The Rectangle to compare.
 * @returns {Boolean} <code>true</code> if the Rectangles are equal, <code>false</code> otherwise.
 */
Rectangle.prototype.equals = function (other) {
  return Rectangle.equals(this, other);
};

/**
 * Compares the provided rectangles and returns <code>true</code> if they are equal,
 * <code>false</code> otherwise.
 *
 * @param {Rectangle} [left] The first Rectangle.
 * @param {Rectangle} [right] The second Rectangle.
 * @returns {Boolean} <code>true</code> if left and right are equal; otherwise <code>false</code>.
 */
Rectangle.equals = function (left, right) {
  return (
    left === right ||
    (defined(left) &&
      defined(right) &&
      left.west === right.west &&
      left.south === right.south &&
      left.east === right.east &&
      left.north === right.north)
  );
};

/**
 * Compares the provided Rectangle with this Rectangle componentwise and returns
 * <code>true</code> if they are within the provided epsilon,
 * <code>false</code> otherwise.
 *
 * @param {Rectangle} [other] The Rectangle to compare.
 * @param {Number} [epsilon=0] The epsilon to use for equality testing.
 * @returns {Boolean} <code>true</code> if the Rectangles are within the provided epsilon, <code>false</code> otherwise.
 */
Rectangle.prototype.equalsEpsilon = function (other, epsilon) {
  return Rectangle.equalsEpsilon(this, other, epsilon);
};

/**
 * Checks a Rectangle's properties and throws if they are not in valid ranges.
 *
 * @param {Rectangle} rectangle The rectangle to validate
 *
 * @exception {DeveloperError} <code>north</code> must be in the interval [<code>-Pi/2</code>, <code>Pi/2</code>].
 * @exception {DeveloperError} <code>south</code> must be in the interval [<code>-Pi/2</code>, <code>Pi/2</code>].
 * @exception {DeveloperError} <code>east</code> must be in the interval [<code>-Pi</code>, <code>Pi</code>].
 * @exception {DeveloperError} <code>west</code> must be in the interval [<code>-Pi</code>, <code>Pi</code>].
 */
Rectangle.validate = function (rectangle) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("rectangle", rectangle);

  var north = rectangle.north;
  Check.typeOf.number.greaterThanOrEquals(
    "north",
    north,
    -CesiumMath.PI_OVER_TWO
  );
  Check.typeOf.number.lessThanOrEquals("north", north, CesiumMath.PI_OVER_TWO);

  var south = rectangle.south;
  Check.typeOf.number.greaterThanOrEquals(
    "south",
    south,
    -CesiumMath.PI_OVER_TWO
  );
  Check.typeOf.number.lessThanOrEquals("south", south, CesiumMath.PI_OVER_TWO);

  var west = rectangle.west;
  Check.typeOf.number.greaterThanOrEquals("west", west, -Math.PI);
  Check.typeOf.number.lessThanOrEquals("west", west, Math.PI);

  var east = rectangle.east;
  Check.typeOf.number.greaterThanOrEquals("east", east, -Math.PI);
  Check.typeOf.number.lessThanOrEquals("east", east, Math.PI);
  //>>includeEnd('debug');
};

/**
 * Computes the southwest corner of a rectangle.
 *
 * @param {Rectangle} rectangle The rectangle for which to find the corner
 * @param {Cartographic} [result] The object onto which to store the result.
 * @returns {Cartographic} The modified result parameter or a new Cartographic instance if none was provided.
 */
Rectangle.southwest = function (rectangle, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("rectangle", rectangle);
  //>>includeEnd('debug');

  if (!defined(result)) {
    return new Cartographic(rectangle.west, rectangle.south);
  }
  result.longitude = rectangle.west;
  result.latitude = rectangle.south;
  result.height = 0.0;
  return result;
};

/**
 * Computes the northwest corner of a rectangle.
 *
 * @param {Rectangle} rectangle The rectangle for which to find the corner
 * @param {Cartographic} [result] The object onto which to store the result.
 * @returns {Cartographic} The modified result parameter or a new Cartographic instance if none was provided.
 */
Rectangle.northwest = function (rectangle, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("rectangle", rectangle);
  //>>includeEnd('debug');

  if (!defined(result)) {
    return new Cartographic(rectangle.west, rectangle.north);
  }
  result.longitude = rectangle.west;
  result.latitude = rectangle.north;
  result.height = 0.0;
  return result;
};

/**
 * Computes the northeast corner of a rectangle.
 *
 * @param {Rectangle} rectangle The rectangle for which to find the corner
 * @param {Cartographic} [result] The object onto which to store the result.
 * @returns {Cartographic} The modified result parameter or a new Cartographic instance if none was provided.
 */
Rectangle.northeast = function (rectangle, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("rectangle", rectangle);
  //>>includeEnd('debug');

  if (!defined(result)) {
    return new Cartographic(rectangle.east, rectangle.north);
  }
  result.longitude = rectangle.east;
  result.latitude = rectangle.north;
  result.height = 0.0;
  return result;
};

/**
 * Computes the southeast corner of a rectangle.
 *
 * @param {Rectangle} rectangle The rectangle for which to find the corner
 * @param {Cartographic} [result] The object onto which to store the result.
 * @returns {Cartographic} The modified result parameter or a new Cartographic instance if none was provided.
 */
Rectangle.southeast = function (rectangle, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("rectangle", rectangle);
  //>>includeEnd('debug');

  if (!defined(result)) {
    return new Cartographic(rectangle.east, rectangle.south);
  }
  result.longitude = rectangle.east;
  result.latitude = rectangle.south;
  result.height = 0.0;
  return result;
};

/**
 * Computes the center of a rectangle.
 *
 * @param {Rectangle} rectangle The rectangle for which to find the center
 * @param {Cartographic} [result] The object onto which to store the result.
 * @returns {Cartographic} The modified result parameter or a new Cartographic instance if none was provided.
 */
Rectangle.center = function (rectangle, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("rectangle", rectangle);
  //>>includeEnd('debug');

  var east = rectangle.east;
  var west = rectangle.west;

  if (east < west) {
    east += CesiumMath.TWO_PI;
  }

  var longitude = CesiumMath.negativePiToPi((west + east) * 0.5);
  var latitude = (rectangle.south + rectangle.north) * 0.5;

  if (!defined(result)) {
    return new Cartographic(longitude, latitude);
  }

  result.longitude = longitude;
  result.latitude = latitude;
  result.height = 0.0;
  return result;
};

/**
 * Computes the intersection of two rectangles.  This function assumes that the rectangle's coordinates are
 * latitude and longitude in radians and produces a correct intersection, taking into account the fact that
 * the same angle can be represented with multiple values as well as the wrapping of longitude at the
 * anti-meridian.  For a simple intersection that ignores these factors and can be used with projected
 * coordinates, see {@link Rectangle.simpleIntersection}.
 *
 * @param {Rectangle} rectangle On rectangle to find an intersection
 * @param {Rectangle} otherRectangle Another rectangle to find an intersection
 * @param {Rectangle} [result] The object onto which to store the result.
 * @returns {Rectangle|undefined} The modified result parameter, a new Rectangle instance if none was provided or undefined if there is no intersection.
 */
Rectangle.intersection = function (rectangle, otherRectangle, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("rectangle", rectangle);
  Check.typeOf.object("otherRectangle", otherRectangle);
  //>>includeEnd('debug');

  var rectangleEast = rectangle.east;
  var rectangleWest = rectangle.west;

  var otherRectangleEast = otherRectangle.east;
  var otherRectangleWest = otherRectangle.west;

  if (rectangleEast < rectangleWest && otherRectangleEast > 0.0) {
    rectangleEast += CesiumMath.TWO_PI;
  } else if (otherRectangleEast < otherRectangleWest && rectangleEast > 0.0) {
    otherRectangleEast += CesiumMath.TWO_PI;
  }

  if (rectangleEast < rectangleWest && otherRectangleWest < 0.0) {
    otherRectangleWest += CesiumMath.TWO_PI;
  } else if (otherRectangleEast < otherRectangleWest && rectangleWest < 0.0) {
    rectangleWest += CesiumMath.TWO_PI;
  }

  var west = CesiumMath.negativePiToPi(
    Math.max(rectangleWest, otherRectangleWest)
  );
  var east = CesiumMath.negativePiToPi(
    Math.min(rectangleEast, otherRectangleEast)
  );

  if (
    (rectangle.west < rectangle.east ||
      otherRectangle.west < otherRectangle.east) &&
    east <= west
  ) {
    return undefined;
  }

  var south = Math.max(rectangle.south, otherRectangle.south);
  var north = Math.min(rectangle.north, otherRectangle.north);

  if (south >= north) {
    return undefined;
  }

  if (!defined(result)) {
    return new Rectangle(west, south, east, north);
  }
  result.west = west;
  result.south = south;
  result.east = east;
  result.north = north;
  return result;
};

/**
 * Computes a simple intersection of two rectangles.  Unlike {@link Rectangle.intersection}, this function
 * does not attempt to put the angular coordinates into a consistent range or to account for crossing the
 * anti-meridian.  As such, it can be used for rectangles where the coordinates are not simply latitude
 * and longitude (i.e. projected coordinates).
 *
 * @param {Rectangle} rectangle On rectangle to find an intersection
 * @param {Rectangle} otherRectangle Another rectangle to find an intersection
 * @param {Rectangle} [result] The object onto which to store the result.
 * @returns {Rectangle|undefined} The modified result parameter, a new Rectangle instance if none was provided or undefined if there is no intersection.
 */
Rectangle.simpleIntersection = function (rectangle, otherRectangle, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("rectangle", rectangle);
  Check.typeOf.object("otherRectangle", otherRectangle);
  //>>includeEnd('debug');

  var west = Math.max(rectangle.west, otherRectangle.west);
  var south = Math.max(rectangle.south, otherRectangle.south);
  var east = Math.min(rectangle.east, otherRectangle.east);
  var north = Math.min(rectangle.north, otherRectangle.north);

  if (south >= north || west >= east) {
    return undefined;
  }

  if (!defined(result)) {
    return new Rectangle(west, south, east, north);
  }

  result.west = west;
  result.south = south;
  result.east = east;
  result.north = north;
  return result;
};

/**
 * Computes a rectangle that is the union of two rectangles.
 *
 * @param {Rectangle} rectangle A rectangle to enclose in rectangle.
 * @param {Rectangle} otherRectangle A rectangle to enclose in a rectangle.
 * @param {Rectangle} [result] The object onto which to store the result.
 * @returns {Rectangle} The modified result parameter or a new Rectangle instance if none was provided.
 */
Rectangle.union = function (rectangle, otherRectangle, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("rectangle", rectangle);
  Check.typeOf.object("otherRectangle", otherRectangle);
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new Rectangle();
  }

  var rectangleEast = rectangle.east;
  var rectangleWest = rectangle.west;

  var otherRectangleEast = otherRectangle.east;
  var otherRectangleWest = otherRectangle.west;

  if (rectangleEast < rectangleWest && otherRectangleEast > 0.0) {
    rectangleEast += CesiumMath.TWO_PI;
  } else if (otherRectangleEast < otherRectangleWest && rectangleEast > 0.0) {
    otherRectangleEast += CesiumMath.TWO_PI;
  }

  if (rectangleEast < rectangleWest && otherRectangleWest < 0.0) {
    otherRectangleWest += CesiumMath.TWO_PI;
  } else if (otherRectangleEast < otherRectangleWest && rectangleWest < 0.0) {
    rectangleWest += CesiumMath.TWO_PI;
  }

  var west = CesiumMath.negativePiToPi(
    Math.min(rectangleWest, otherRectangleWest)
  );
  var east = CesiumMath.negativePiToPi(
    Math.max(rectangleEast, otherRectangleEast)
  );

  result.west = west;
  result.south = Math.min(rectangle.south, otherRectangle.south);
  result.east = east;
  result.north = Math.max(rectangle.north, otherRectangle.north);

  return result;
};

/**
 * Computes a rectangle by enlarging the provided rectangle until it contains the provided cartographic.
 *
 * @param {Rectangle} rectangle A rectangle to expand.
 * @param {Cartographic} cartographic A cartographic to enclose in a rectangle.
 * @param {Rectangle} [result] The object onto which to store the result.
 * @returns {Rectangle} The modified result parameter or a new Rectangle instance if one was not provided.
 */
Rectangle.expand = function (rectangle, cartographic, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("rectangle", rectangle);
  Check.typeOf.object("cartographic", cartographic);
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new Rectangle();
  }

  result.west = Math.min(rectangle.west, cartographic.longitude);
  result.south = Math.min(rectangle.south, cartographic.latitude);
  result.east = Math.max(rectangle.east, cartographic.longitude);
  result.north = Math.max(rectangle.north, cartographic.latitude);

  return result;
};

/**
 * Returns true if the cartographic is on or inside the rectangle, false otherwise.
 *
 * @param {Rectangle} rectangle The rectangle
 * @param {Cartographic} cartographic The cartographic to test.
 * @returns {Boolean} true if the provided cartographic is inside the rectangle, false otherwise.
 */
Rectangle.contains = function (rectangle, cartographic) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("rectangle", rectangle);
  Check.typeOf.object("cartographic", cartographic);
  //>>includeEnd('debug');

  var longitude = cartographic.longitude;
  var latitude = cartographic.latitude;

  var west = rectangle.west;
  var east = rectangle.east;

  if (east < west) {
    east += CesiumMath.TWO_PI;
    if (longitude < 0.0) {
      longitude += CesiumMath.TWO_PI;
    }
  }
  return (
    (longitude > west ||
      CesiumMath.equalsEpsilon(longitude, west, CesiumMath.EPSILON14)) &&
    (longitude < east ||
      CesiumMath.equalsEpsilon(longitude, east, CesiumMath.EPSILON14)) &&
    latitude >= rectangle.south &&
    latitude <= rectangle.north
  );
};

var subsampleLlaScratch = new Cartographic();
/**
 * Samples a rectangle so that it includes a list of Cartesian points suitable for passing to
 * {@link BoundingSphere#fromPoints}.  Sampling is necessary to account
 * for rectangles that cover the poles or cross the equator.
 *
 * @param {Rectangle} rectangle The rectangle to subsample.
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid to use.
 * @param {Number} [surfaceHeight=0.0] The height of the rectangle above the ellipsoid.
 * @param {Cartesian3[]} [result] The array of Cartesians onto which to store the result.
 * @returns {Cartesian3[]} The modified result parameter or a new Array of Cartesians instances if none was provided.
 */
Rectangle.subsample = function (rectangle, ellipsoid, surfaceHeight, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("rectangle", rectangle);
  //>>includeEnd('debug');

  ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
  surfaceHeight = defaultValue(surfaceHeight, 0.0);

  if (!defined(result)) {
    result = [];
  }
  var length = 0;

  var north = rectangle.north;
  var south = rectangle.south;
  var east = rectangle.east;
  var west = rectangle.west;

  var lla = subsampleLlaScratch;
  lla.height = surfaceHeight;

  lla.longitude = west;
  lla.latitude = north;
  result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
  length++;

  lla.longitude = east;
  result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
  length++;

  lla.latitude = south;
  result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
  length++;

  lla.longitude = west;
  result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
  length++;

  if (north < 0.0) {
    lla.latitude = north;
  } else if (south > 0.0) {
    lla.latitude = south;
  } else {
    lla.latitude = 0.0;
  }

  for (var i = 1; i < 8; ++i) {
    lla.longitude = -Math.PI + i * CesiumMath.PI_OVER_TWO;
    if (Rectangle.contains(rectangle, lla)) {
      result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
      length++;
    }
  }

  if (lla.latitude === 0.0) {
    lla.longitude = west;
    result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
    length++;
    lla.longitude = east;
    result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
    length++;
  }
  result.length = length;
  return result;
};

/**
 * The largest possible rectangle.
 *
 * @type {Rectangle}
 * @constant
 */
Rectangle.MAX_VALUE = Object.freeze(
  new Rectangle(
    -Math.PI,
    -CesiumMath.PI_OVER_TWO,
    Math.PI,
    CesiumMath.PI_OVER_TWO
  )
);
export default Rectangle;
