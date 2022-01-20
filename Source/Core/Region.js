import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import Rectangle from "./Rectangle.js";

/**
 * Creates an instance of a Region.
 * A Region is a {@link Rectangle} with a minimum and maximum height.
 * @alias Region
 * @constructor
 *
 * @param {Rectangle} [rectangle=Rectangle.MAX_VALUE] The rectangle.
 * @param {Number} [minimumHeight=0.0] The minimum height.
 * @param {Number} [maximumHeight=0.0] The maximum height.
 *
 *
 * @example
 * // Create a Region using a rectangle and a minmum and maximum height.
 * var rectangle = new Cesium.Rectangle(0.0, 0.0, 1.0, 1.0);
 * var minimumHeight = 1.0;
 * var maximumHeight = 2.0;
 *
 * var region = new Cesium.Region(rectangle, minimumHeight, maximumHeight);
 *
 * @see Rectangle
 * @see BoundingSphere
 * @see BoundingRectangle
 */
function Region(rectangle, minimumHeight, maximumHeight) {
  /**
   * The rectangle.
   * @type {Rectangle}
   * @default {@link Rectangle.MAX_VALUE}
   */
  this.rectangle = Rectangle.clone(
    defaultValue(rectangle, Rectangle.MAX_VALUE)
  );
  /**
   * The minimum height.
   * @type {Number}
   * @default 0.0
   */
  this.minimumHeight = defaultValue(minimumHeight, 0.0);

  /**
   * The maximum height.
   * @type {Number}
   * @default 0.0
   */
  this.maximumHeight = defaultValue(maximumHeight, 0.0);
}

/**
 * Duplicates a Region instance.
 *
 * @param {Region} region The region to duplicate.
 * @param {Region} [result] The object onto which to store the result.
 * @returns {Region} The modified result parameter or a new Region instance if none was provided. (Returns undefined if region is undefined)
 */
Region.clone = function (region, result) {
  if (!defined(region)) {
    return undefined;
  }
  if (!defined(result)) {
    return new Region(
      region.rectangle,
      region.minimumHeight,
      region.maximumHeight
    );
  }
  Rectangle.clone(region.rectangle, result.rectangle);
  result.minimumHeight = region.minimumHeight;
  result.maximumHeight = region.maximumHeight;
  return result;
};

/**
 * Compares the provided Region componentwise and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {Region} left The first Region.
 * @param {Region} right The second Region.
 * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
 */
Region.equals = function (left, right) {
  return (
    left === right ||
    (defined(left) &&
      defined(right) &&
      Rectangle.equals(left.rectangle, right.rectangle) &&
      left.minimumHeight === right.minimumHeight &&
      left.maximumHeight === right.maximumHeight)
  );
};

/**
 * Duplicates this Region instance.
 *
 * @param {Region} [result] The object onto which to store the result.
 * @returns {Region} The modified result parameter or a new Region instance if one was not provided.
 */
Region.prototype.clone = function (result) {
  return Region.clone(this, result);
};

/**
 * Compares this Region against the provided Region componentwise and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {Region} [right] The right hand side Region.
 * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
 */
Region.prototype.equals = function (right) {
  return Region.equals(this, right);
};

export default Region;
