import Cartesian3 from "./Cartesian3.js";
import Cartographic from "./Cartographic.js";
import Check from "./Check.js";
import defined from "./defined.js";
import Ellipsoid from "./Ellipsoid.js";
import CesiumMath from "./Math.js";
import Transforms from "./Transforms.js";
import Matrix4 from "./Matrix4.js";

/**
 * A two dimensional region specified as longitude and latitude coordinates.
 *
 * @alias Rectangle
 * @constructor
 *
 * @param {number} [west=0.0] The westernmost longitude, in radians, in the range [-Pi, Pi].
 * @param {number} [south=0.0] The southernmost latitude, in radians, in the range [-Pi/2, Pi/2].
 * @param {number} [east=0.0] The easternmost longitude, in radians, in the range [-Pi, Pi].
 * @param {number} [north=0.0] The northernmost latitude, in radians, in the range [-Pi/2, Pi/2].
 *
 * @see Packable
 */
function Rectangle(west, south, east, north) {
  /**
   * The westernmost longitude in radians in the range [-Pi, Pi].
   *
   * @type {number}
   * @default 0.0
   */
  this.west = west ?? 0.0;

  /**
   * The southernmost latitude in radians in the range [-Pi/2, Pi/2].
   *
   * @type {number}
   * @default 0.0
   */
  this.south = south ?? 0.0;

  /**
   * The easternmost longitude in radians in the range [-Pi, Pi].
   *
   * @type {number}
   * @default 0.0
   */
  this.east = east ?? 0.0;

  /**
   * The northernmost latitude in radians in the range [-Pi/2, Pi/2].
   *
   * @type {number}
   * @default 0.0
   */
  this.north = north ?? 0.0;
}

Object.defineProperties(Rectangle.prototype, {
  /**
   * Gets the width of the rectangle in radians.
   * @memberof Rectangle.prototype
   * @type {number}
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
   * @type {number}
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
 * @type {number}
 */
Rectangle.packedLength = 4;

/**
 * Stores the provided instance into the provided array.
 *
 * @param {Rectangle} value The value to pack.
 * @param {number[]} array The array to pack into.
 * @param {number} [startingIndex=0] The index into the array at which to start packing the elements.
 *
 * @returns {number[]} The array that was packed into
 */
Rectangle.pack = function (value, array, startingIndex) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("value", value);
  Check.defined("array", array);
  //>>includeEnd('debug');

  startingIndex = startingIndex ?? 0;

  array[startingIndex++] = value.west;
  array[startingIndex++] = value.south;
  array[startingIndex++] = value.east;
  array[startingIndex] = value.north;

  return array;
};

/**
 * Retrieves an instance from a packed array.
 *
 * @param {number[]} array The packed array.
 * @param {number} [startingIndex=0] The starting index of the element to be unpacked.
 * @param {Rectangle} [result] The object into which to store the result.
 * @returns {Rectangle} The modified result parameter or a new Rectangle instance if one was not provided.
 */
Rectangle.unpack = function (array, startingIndex, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("array", array);
  //>>includeEnd('debug');

  startingIndex = startingIndex ?? 0;

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
 * @returns {number} The width.
 */
Rectangle.computeWidth = function (rectangle) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("rectangle", rectangle);
  //>>includeEnd('debug');
  let east = rectangle.east;
  const west = rectangle.west;
  if (east < west) {
    east += CesiumMath.TWO_PI;
  }
  return east - west;
};

/**
 * Computes the height of a rectangle in radians.
 * @param {Rectangle} rectangle The rectangle to compute the height of.
 * @returns {number} The height.
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
 * @param {number} [west=0.0] The westernmost longitude in degrees in the range [-180.0, 180.0].
 * @param {number} [south=0.0] The southernmost latitude in degrees in the range [-90.0, 90.0].
 * @param {number} [east=0.0] The easternmost longitude in degrees in the range [-180.0, 180.0].
 * @param {number} [north=0.0] The northernmost latitude in degrees in the range [-90.0, 90.0].
 * @param {Rectangle} [result] The object onto which to store the result, or undefined if a new instance should be created.
 * @returns {Rectangle} The modified result parameter or a new Rectangle instance if none was provided.
 *
 * @example
 * const rectangle = Cesium.Rectangle.fromDegrees(0.0, 20.0, 10.0, 30.0);
 */
Rectangle.fromDegrees = function (west, south, east, north, result) {
  west = CesiumMath.toRadians(west ?? 0.0);
  south = CesiumMath.toRadians(south ?? 0.0);
  east = CesiumMath.toRadians(east ?? 0.0);
  north = CesiumMath.toRadians(north ?? 0.0);

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
 * @param {number} [west=0.0] The westernmost longitude in radians in the range [-Math.PI, Math.PI].
 * @param {number} [south=0.0] The southernmost latitude in radians in the range [-Math.PI/2, Math.PI/2].
 * @param {number} [east=0.0] The easternmost longitude in radians in the range [-Math.PI, Math.PI].
 * @param {number} [north=0.0] The northernmost latitude in radians in the range [-Math.PI/2, Math.PI/2].
 * @param {Rectangle} [result] The object onto which to store the result, or undefined if a new instance should be created.
 * @returns {Rectangle} The modified result parameter or a new Rectangle instance if none was provided.
 *
 * @example
 * const rectangle = Cesium.Rectangle.fromRadians(0.0, Math.PI/4, Math.PI/8, 3*Math.PI/4);
 */
Rectangle.fromRadians = function (west, south, east, north, result) {
  if (!defined(result)) {
    return new Rectangle(west, south, east, north);
  }

  result.west = west ?? 0.0;
  result.south = south ?? 0.0;
  result.east = east ?? 0.0;
  result.north = north ?? 0.0;

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

  let west = Number.MAX_VALUE;
  let east = -Number.MAX_VALUE;
  let westOverIDL = Number.MAX_VALUE;
  let eastOverIDL = -Number.MAX_VALUE;
  let south = Number.MAX_VALUE;
  let north = -Number.MAX_VALUE;

  for (let i = 0, len = cartographics.length; i < len; i++) {
    const position = cartographics[i];
    west = Math.min(west, position.longitude);
    east = Math.max(east, position.longitude);
    south = Math.min(south, position.latitude);
    north = Math.max(north, position.latitude);

    const lonAdjusted =
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
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.default] The ellipsoid the cartesians are on.
 * @param {Rectangle} [result] The object onto which to store the result, or undefined if a new instance should be created.
 * @returns {Rectangle} The modified result parameter or a new Rectangle instance if none was provided.
 */
Rectangle.fromCartesianArray = function (cartesians, ellipsoid, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("cartesians", cartesians);
  //>>includeEnd('debug');
  ellipsoid = ellipsoid ?? Ellipsoid.default;

  let west = Number.MAX_VALUE;
  let east = -Number.MAX_VALUE;
  let westOverIDL = Number.MAX_VALUE;
  let eastOverIDL = -Number.MAX_VALUE;
  let south = Number.MAX_VALUE;
  let north = -Number.MAX_VALUE;

  for (let i = 0, len = cartesians.length; i < len; i++) {
    const position = ellipsoid.cartesianToCartographic(cartesians[i]);
    west = Math.min(west, position.longitude);
    east = Math.max(east, position.longitude);
    south = Math.min(south, position.latitude);
    north = Math.max(north, position.latitude);

    const lonAdjusted =
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

const fromBoundingSphereMatrixScratch = new Cartesian3();
const fromBoundingSphereEastScratch = new Cartesian3();
const fromBoundingSphereNorthScratch = new Cartesian3();
const fromBoundingSphereWestScratch = new Cartesian3();
const fromBoundingSphereSouthScratch = new Cartesian3();
const fromBoundingSpherePositionsScratch = new Array(5);
for (let n = 0; n < fromBoundingSpherePositionsScratch.length; ++n) {
  fromBoundingSpherePositionsScratch[n] = new Cartesian3();
}
/**
 * Create a rectangle from a bounding sphere, ignoring height.
 *
 *
 * @param {BoundingSphere} boundingSphere The bounding sphere.
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.default] The ellipsoid.
 * @param {Rectangle} [result] The object onto which to store the result, or undefined if a new instance should be created.
 * @returns {Rectangle} The modified result parameter or a new Rectangle instance if none was provided.
 */
Rectangle.fromBoundingSphere = function (boundingSphere, ellipsoid, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("boundingSphere", boundingSphere);
  //>>includeEnd('debug');

  const center = boundingSphere.center;
  const radius = boundingSphere.radius;

  if (!defined(ellipsoid)) {
    ellipsoid = Ellipsoid.default;
  }

  if (!defined(result)) {
    result = new Rectangle();
  }

  if (Cartesian3.equals(center, Cartesian3.ZERO)) {
    Rectangle.clone(Rectangle.MAX_VALUE, result);
    return result;
  }

  const fromENU = Transforms.eastNorthUpToFixedFrame(
    center,
    ellipsoid,
    fromBoundingSphereMatrixScratch,
  );
  const east = Matrix4.multiplyByPointAsVector(
    fromENU,
    Cartesian3.UNIT_X,
    fromBoundingSphereEastScratch,
  );
  Cartesian3.normalize(east, east);
  const north = Matrix4.multiplyByPointAsVector(
    fromENU,
    Cartesian3.UNIT_Y,
    fromBoundingSphereNorthScratch,
  );
  Cartesian3.normalize(north, north);

  Cartesian3.multiplyByScalar(north, radius, north);
  Cartesian3.multiplyByScalar(east, radius, east);

  const south = Cartesian3.negate(north, fromBoundingSphereSouthScratch);
  const west = Cartesian3.negate(east, fromBoundingSphereWestScratch);

  const positions = fromBoundingSpherePositionsScratch;

  // North
  let corner = positions[0];
  Cartesian3.add(center, north, corner);

  // West
  corner = positions[1];
  Cartesian3.add(center, west, corner);

  // South
  corner = positions[2];
  Cartesian3.add(center, south, corner);

  // East
  corner = positions[3];
  Cartesian3.add(center, east, corner);

  positions[4] = center;

  return Rectangle.fromCartesianArray(positions, ellipsoid, result);
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
      rectangle.north,
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
 * @param {number} [absoluteEpsilon=0] The absolute epsilon tolerance to use for equality testing.
 * @returns {boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
 */
Rectangle.equalsEpsilon = function (left, right, absoluteEpsilon) {
  absoluteEpsilon = absoluteEpsilon ?? 0;

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
 * @returns {boolean} <code>true</code> if the Rectangles are equal, <code>false</code> otherwise.
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
 * @returns {boolean} <code>true</code> if left and right are equal; otherwise <code>false</code>.
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
 * @param {number} [epsilon=0] The epsilon to use for equality testing.
 * @returns {boolean} <code>true</code> if the Rectangles are within the provided epsilon, <code>false</code> otherwise.
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
 * @private
 */
Rectangle._validate = function (rectangle) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("rectangle", rectangle);

  const north = rectangle.north;
  Check.typeOf.number.greaterThanOrEquals(
    "north",
    north,
    -CesiumMath.PI_OVER_TWO,
  );
  Check.typeOf.number.lessThanOrEquals("north", north, CesiumMath.PI_OVER_TWO);

  const south = rectangle.south;
  Check.typeOf.number.greaterThanOrEquals(
    "south",
    south,
    -CesiumMath.PI_OVER_TWO,
  );
  Check.typeOf.number.lessThanOrEquals("south", south, CesiumMath.PI_OVER_TWO);

  const west = rectangle.west;
  Check.typeOf.number.greaterThanOrEquals("west", west, -Math.PI);
  Check.typeOf.number.lessThanOrEquals("west", west, Math.PI);

  const east = rectangle.east;
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

  let east = rectangle.east;
  const west = rectangle.west;

  if (east < west) {
    east += CesiumMath.TWO_PI;
  }

  const longitude = CesiumMath.negativePiToPi((west + east) * 0.5);
  const latitude = (rectangle.south + rectangle.north) * 0.5;

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

  let rectangleEast = rectangle.east;
  let rectangleWest = rectangle.west;

  let otherRectangleEast = otherRectangle.east;
  let otherRectangleWest = otherRectangle.west;

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

  const west = CesiumMath.negativePiToPi(
    Math.max(rectangleWest, otherRectangleWest),
  );
  const east = CesiumMath.negativePiToPi(
    Math.min(rectangleEast, otherRectangleEast),
  );

  if (
    (rectangle.west < rectangle.east ||
      otherRectangle.west < otherRectangle.east) &&
    east <= west
  ) {
    return undefined;
  }

  const south = Math.max(rectangle.south, otherRectangle.south);
  const north = Math.min(rectangle.north, otherRectangle.north);

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

  const west = Math.max(rectangle.west, otherRectangle.west);
  const south = Math.max(rectangle.south, otherRectangle.south);
  const east = Math.min(rectangle.east, otherRectangle.east);
  const north = Math.min(rectangle.north, otherRectangle.north);

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

  let rectangleEast = rectangle.east;
  let rectangleWest = rectangle.west;

  let otherRectangleEast = otherRectangle.east;
  let otherRectangleWest = otherRectangle.west;

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

  const west = CesiumMath.negativePiToPi(
    Math.min(rectangleWest, otherRectangleWest),
  );
  const east = CesiumMath.negativePiToPi(
    Math.max(rectangleEast, otherRectangleEast),
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
 * @returns {boolean} true if the provided cartographic is inside the rectangle, false otherwise.
 */
Rectangle.contains = function (rectangle, cartographic) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("rectangle", rectangle);
  Check.typeOf.object("cartographic", cartographic);
  //>>includeEnd('debug');

  let longitude = cartographic.longitude;
  const latitude = cartographic.latitude;

  const west = rectangle.west;
  let east = rectangle.east;

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

const subsampleLlaScratch = new Cartographic();
/**
 * Samples a rectangle so that it includes a list of Cartesian points suitable for passing to
 * {@link BoundingSphere#fromPoints}.  Sampling is necessary to account
 * for rectangles that cover the poles or cross the equator.
 *
 * @param {Rectangle} rectangle The rectangle to subsample.
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.default] The ellipsoid to use.
 * @param {number} [surfaceHeight=0.0] The height of the rectangle above the ellipsoid.
 * @param {Cartesian3[]} [result] The array of Cartesians onto which to store the result.
 * @returns {Cartesian3[]} The modified result parameter or a new Array of Cartesians instances if none was provided.
 */
Rectangle.subsample = function (rectangle, ellipsoid, surfaceHeight, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("rectangle", rectangle);
  //>>includeEnd('debug');

  ellipsoid = ellipsoid ?? Ellipsoid.default;
  surfaceHeight = surfaceHeight ?? 0.0;

  if (!defined(result)) {
    result = [];
  }
  let length = 0;

  const north = rectangle.north;
  const south = rectangle.south;
  const east = rectangle.east;
  const west = rectangle.west;

  const lla = subsampleLlaScratch;
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

  for (let i = 1; i < 8; ++i) {
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
 * Computes a subsection of a rectangle from normalized coordinates in the range [0.0, 1.0].
 *
 * @param {Rectangle} rectangle The rectangle to subsection.
 * @param {number} westLerp The west interpolation factor in the range [0.0, 1.0]. Must be less than or equal to eastLerp.
 * @param {number} southLerp The south interpolation factor in the range [0.0, 1.0]. Must be less than or equal to northLerp.
 * @param {number} eastLerp The east interpolation factor in the range [0.0, 1.0]. Must be greater than or equal to westLerp.
 * @param {number} northLerp The north interpolation factor in the range [0.0, 1.0]. Must be greater than or equal to southLerp.
 * @param {Rectangle} [result] The object onto which to store the result.
 * @returns {Rectangle} The modified result parameter or a new Rectangle instance if none was provided.
 */
Rectangle.subsection = function (
  rectangle,
  westLerp,
  southLerp,
  eastLerp,
  northLerp,
  result,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("rectangle", rectangle);
  Check.typeOf.number.greaterThanOrEquals("westLerp", westLerp, 0.0);
  Check.typeOf.number.lessThanOrEquals("westLerp", westLerp, 1.0);
  Check.typeOf.number.greaterThanOrEquals("southLerp", southLerp, 0.0);
  Check.typeOf.number.lessThanOrEquals("southLerp", southLerp, 1.0);
  Check.typeOf.number.greaterThanOrEquals("eastLerp", eastLerp, 0.0);
  Check.typeOf.number.lessThanOrEquals("eastLerp", eastLerp, 1.0);
  Check.typeOf.number.greaterThanOrEquals("northLerp", northLerp, 0.0);
  Check.typeOf.number.lessThanOrEquals("northLerp", northLerp, 1.0);

  Check.typeOf.number.lessThanOrEquals("westLerp", westLerp, eastLerp);
  Check.typeOf.number.lessThanOrEquals("southLerp", southLerp, northLerp);
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new Rectangle();
  }

  // This function doesn't use CesiumMath.lerp because it has floating point precision problems
  // when the start and end values are the same but the t changes.

  if (rectangle.west <= rectangle.east) {
    const width = rectangle.east - rectangle.west;
    result.west = rectangle.west + westLerp * width;
    result.east = rectangle.west + eastLerp * width;
  } else {
    const width = CesiumMath.TWO_PI + rectangle.east - rectangle.west;
    result.west = CesiumMath.negativePiToPi(rectangle.west + westLerp * width);
    result.east = CesiumMath.negativePiToPi(rectangle.west + eastLerp * width);
  }
  const height = rectangle.north - rectangle.south;
  result.south = rectangle.south + southLerp * height;
  result.north = rectangle.south + northLerp * height;

  // Fix floating point precision problems when t = 1
  if (westLerp === 1.0) {
    result.west = rectangle.east;
  }
  if (eastLerp === 1.0) {
    result.east = rectangle.east;
  }
  if (southLerp === 1.0) {
    result.south = rectangle.north;
  }
  if (northLerp === 1.0) {
    result.north = rectangle.north;
  }

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
    CesiumMath.PI_OVER_TWO,
  ),
);
export default Rectangle;
