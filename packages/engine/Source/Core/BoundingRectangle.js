import Cartesian2 from "./Cartesian2.js";
import Cartographic from "./Cartographic.js";
import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import Ellipsoid from "./Ellipsoid.js";
import GeographicProjection from "./GeographicProjection.js";
import Intersect from "./Intersect.js";
import Rectangle from "./Rectangle.js";

/**
 * A bounding rectangle given by a corner, width and height.
 * @alias BoundingRectangle
 * @constructor
 *
 * @param {number} [x=0.0] The x coordinate of the rectangle.
 * @param {number} [y=0.0] The y coordinate of the rectangle.
 * @param {number} [width=0.0] The width of the rectangle.
 * @param {number} [height=0.0] The height of the rectangle.
 *
 * @see BoundingSphere
 * @see Packable
 */
function BoundingRectangle(x, y, width, height) {
  /**
   * The x coordinate of the rectangle.
   * @type {number}
   * @default 0.0
   */
  this.x = defaultValue(x, 0.0);

  /**
   * The y coordinate of the rectangle.
   * @type {number}
   * @default 0.0
   */
  this.y = defaultValue(y, 0.0);

  /**
   * The width of the rectangle.
   * @type {number}
   * @default 0.0
   */
  this.width = defaultValue(width, 0.0);

  /**
   * The height of the rectangle.
   * @type {number}
   * @default 0.0
   */
  this.height = defaultValue(height, 0.0);
}

/**
 * The number of elements used to pack the object into an array.
 * @type {number}
 */
BoundingRectangle.packedLength = 4;

/**
 * Stores the provided instance into the provided array.
 *
 * @param {BoundingRectangle} value The value to pack.
 * @param {number[]} array The array to pack into.
 * @param {number} [startingIndex=0] The index into the array at which to start packing the elements.
 *
 * @returns {number[]} The array that was packed into
 */
BoundingRectangle.pack = function (value, array, startingIndex) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("value", value);
  Check.defined("array", array);
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  array[startingIndex++] = value.x;
  array[startingIndex++] = value.y;
  array[startingIndex++] = value.width;
  array[startingIndex] = value.height;

  return array;
};

/**
 * Retrieves an instance from a packed array.
 *
 * @param {number[]} array The packed array.
 * @param {number} [startingIndex=0] The starting index of the element to be unpacked.
 * @param {BoundingRectangle} [result] The object into which to store the result.
 * @returns {BoundingRectangle} The modified result parameter or a new BoundingRectangle instance if one was not provided.
 */
BoundingRectangle.unpack = function (array, startingIndex, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("array", array);
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  if (!defined(result)) {
    result = new BoundingRectangle();
  }
  result.x = array[startingIndex++];
  result.y = array[startingIndex++];
  result.width = array[startingIndex++];
  result.height = array[startingIndex];
  return result;
};

/**
 * Computes a bounding rectangle enclosing the list of 2D points.
 * The rectangle is oriented with the corner at the bottom left.
 *
 * @param {Cartesian2[]} positions List of points that the bounding rectangle will enclose.  Each point must have <code>x</code> and <code>y</code> properties.
 * @param {BoundingRectangle} [result] The object onto which to store the result.
 * @returns {BoundingRectangle} The modified result parameter or a new BoundingRectangle instance if one was not provided.
 */
BoundingRectangle.fromPoints = function (positions, result) {
  if (!defined(result)) {
    result = new BoundingRectangle();
  }

  if (!defined(positions) || positions.length === 0) {
    result.x = 0;
    result.y = 0;
    result.width = 0;
    result.height = 0;
    return result;
  }

  const length = positions.length;

  let minimumX = positions[0].x;
  let minimumY = positions[0].y;

  let maximumX = positions[0].x;
  let maximumY = positions[0].y;

  for (let i = 1; i < length; i++) {
    const p = positions[i];
    const x = p.x;
    const y = p.y;

    minimumX = Math.min(x, minimumX);
    maximumX = Math.max(x, maximumX);
    minimumY = Math.min(y, minimumY);
    maximumY = Math.max(y, maximumY);
  }

  result.x = minimumX;
  result.y = minimumY;
  result.width = maximumX - minimumX;
  result.height = maximumY - minimumY;
  return result;
};

const defaultProjection = new GeographicProjection();
const fromRectangleLowerLeft = new Cartographic();
const fromRectangleUpperRight = new Cartographic();
/**
 * Computes a bounding rectangle from a rectangle.
 *
 * @param {Rectangle} rectangle The valid rectangle used to create a bounding rectangle.
 * @param {object} [projection=GeographicProjection] The projection used to project the rectangle into 2D.
 * @param {BoundingRectangle} [result] The object onto which to store the result.
 * @returns {BoundingRectangle} The modified result parameter or a new BoundingRectangle instance if one was not provided.
 */
BoundingRectangle.fromRectangle = function (rectangle, projection, result) {
  if (!defined(result)) {
    result = new BoundingRectangle();
  }

  if (!defined(rectangle)) {
    result.x = 0;
    result.y = 0;
    result.width = 0;
    result.height = 0;
    return result;
  }

  defaultProjection._ellipsoid = Ellipsoid.default;
  projection = defaultValue(projection, defaultProjection);

  const lowerLeft = projection.project(
    Rectangle.southwest(rectangle, fromRectangleLowerLeft)
  );
  const upperRight = projection.project(
    Rectangle.northeast(rectangle, fromRectangleUpperRight)
  );

  Cartesian2.subtract(upperRight, lowerLeft, upperRight);

  result.x = lowerLeft.x;
  result.y = lowerLeft.y;
  result.width = upperRight.x;
  result.height = upperRight.y;
  return result;
};

/**
 * Duplicates a BoundingRectangle instance.
 *
 * @param {BoundingRectangle} rectangle The bounding rectangle to duplicate.
 * @param {BoundingRectangle} [result] The object onto which to store the result.
 * @returns {BoundingRectangle} The modified result parameter or a new BoundingRectangle instance if one was not provided. (Returns undefined if rectangle is undefined)
 */
BoundingRectangle.clone = function (rectangle, result) {
  if (!defined(rectangle)) {
    return undefined;
  }

  if (!defined(result)) {
    return new BoundingRectangle(
      rectangle.x,
      rectangle.y,
      rectangle.width,
      rectangle.height
    );
  }

  result.x = rectangle.x;
  result.y = rectangle.y;
  result.width = rectangle.width;
  result.height = rectangle.height;
  return result;
};

/**
 * Computes a bounding rectangle that is the union of the left and right bounding rectangles.
 *
 * @param {BoundingRectangle} left A rectangle to enclose in bounding rectangle.
 * @param {BoundingRectangle} right A rectangle to enclose in a bounding rectangle.
 * @param {BoundingRectangle} [result] The object onto which to store the result.
 * @returns {BoundingRectangle} The modified result parameter or a new BoundingRectangle instance if one was not provided.
 */
BoundingRectangle.union = function (left, right, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("left", left);
  Check.typeOf.object("right", right);
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new BoundingRectangle();
  }

  const lowerLeftX = Math.min(left.x, right.x);
  const lowerLeftY = Math.min(left.y, right.y);
  const upperRightX = Math.max(left.x + left.width, right.x + right.width);
  const upperRightY = Math.max(left.y + left.height, right.y + right.height);

  result.x = lowerLeftX;
  result.y = lowerLeftY;
  result.width = upperRightX - lowerLeftX;
  result.height = upperRightY - lowerLeftY;
  return result;
};

/**
 * Computes a bounding rectangle by enlarging the provided rectangle until it contains the provided point.
 *
 * @param {BoundingRectangle} rectangle A rectangle to expand.
 * @param {Cartesian2} point A point to enclose in a bounding rectangle.
 * @param {BoundingRectangle} [result] The object onto which to store the result.
 * @returns {BoundingRectangle} The modified result parameter or a new BoundingRectangle instance if one was not provided.
 */
BoundingRectangle.expand = function (rectangle, point, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("rectangle", rectangle);
  Check.typeOf.object("point", point);
  //>>includeEnd('debug');

  result = BoundingRectangle.clone(rectangle, result);

  const width = point.x - result.x;
  const height = point.y - result.y;

  if (width > result.width) {
    result.width = width;
  } else if (width < 0) {
    result.width -= width;
    result.x = point.x;
  }

  if (height > result.height) {
    result.height = height;
  } else if (height < 0) {
    result.height -= height;
    result.y = point.y;
  }

  return result;
};

/**
 * Determines if two rectangles intersect.
 *
 * @param {BoundingRectangle} left A rectangle to check for intersection.
 * @param {BoundingRectangle} right The other rectangle to check for intersection.
 * @returns {Intersect} <code>Intersect.INTERSECTING</code> if the rectangles intersect, <code>Intersect.OUTSIDE</code> otherwise.
 */
BoundingRectangle.intersect = function (left, right) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("left", left);
  Check.typeOf.object("right", right);
  //>>includeEnd('debug');

  const leftX = left.x;
  const leftY = left.y;
  const rightX = right.x;
  const rightY = right.y;
  if (
    !(
      leftX > rightX + right.width ||
      leftX + left.width < rightX ||
      leftY + left.height < rightY ||
      leftY > rightY + right.height
    )
  ) {
    return Intersect.INTERSECTING;
  }

  return Intersect.OUTSIDE;
};

/**
 * Compares the provided BoundingRectangles componentwise and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {BoundingRectangle} [left] The first BoundingRectangle.
 * @param {BoundingRectangle} [right] The second BoundingRectangle.
 * @returns {boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
 */
BoundingRectangle.equals = function (left, right) {
  return (
    left === right ||
    (defined(left) &&
      defined(right) &&
      left.x === right.x &&
      left.y === right.y &&
      left.width === right.width &&
      left.height === right.height)
  );
};

/**
 * Duplicates this BoundingRectangle instance.
 *
 * @param {BoundingRectangle} [result] The object onto which to store the result.
 * @returns {BoundingRectangle} The modified result parameter or a new BoundingRectangle instance if one was not provided.
 */
BoundingRectangle.prototype.clone = function (result) {
  return BoundingRectangle.clone(this, result);
};

/**
 * Determines if this rectangle intersects with another.
 *
 * @param {BoundingRectangle} right A rectangle to check for intersection.
 * @returns {Intersect} <code>Intersect.INTERSECTING</code> if the rectangles intersect, <code>Intersect.OUTSIDE</code> otherwise.
 */
BoundingRectangle.prototype.intersect = function (right) {
  return BoundingRectangle.intersect(this, right);
};

/**
 * Compares this BoundingRectangle against the provided BoundingRectangle componentwise and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {BoundingRectangle} [right] The right hand side BoundingRectangle.
 * @returns {boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
 */
BoundingRectangle.prototype.equals = function (right) {
  return BoundingRectangle.equals(this, right);
};
export default BoundingRectangle;
