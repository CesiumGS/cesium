import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";

/**
 * Determines visibility based on the distance to the camera.
 *
 * @alias DistanceDisplayCondition
 * @constructor
 *
 * @param {number} [near=0.0] The smallest distance in the interval where the object is visible.
 * @param {number} [far=Number.MAX_VALUE] The largest distance in the interval where the object is visible.
 *
 * @example
 * // Make a billboard that is only visible when the distance to the camera is between 10 and 20 meters.
 * billboard.distanceDisplayCondition = new Cesium.DistanceDisplayCondition(10.0, 20.0);
 */
function DistanceDisplayCondition(near, far) {
  near = near ?? 0.0;
  this._near = near;

  far = far ?? Number.MAX_VALUE;
  this._far = far;
}

Object.defineProperties(DistanceDisplayCondition.prototype, {
  /**
   * The smallest distance in the interval where the object is visible.
   * @memberof DistanceDisplayCondition.prototype
   * @type {number}
   * @default 0.0
   */
  near: {
    get: function () {
      return this._near;
    },
    set: function (value) {
      this._near = value;
    },
  },
  /**
   * The largest distance in the interval where the object is visible.
   * @memberof DistanceDisplayCondition.prototype
   * @type {number}
   * @default Number.MAX_VALUE
   */
  far: {
    get: function () {
      return this._far;
    },
    set: function (value) {
      this._far = value;
    },
  },
});

/**
 * The number of elements used to pack the object into an array.
 * @type {number}
 */
DistanceDisplayCondition.packedLength = 2;

/**
 * Stores the provided instance into the provided array.
 *
 * @param {DistanceDisplayCondition} value The value to pack.
 * @param {number[]} array The array to pack into.
 * @param {number} [startingIndex=0] The index into the array at which to start packing the elements.
 *
 * @returns {number[]} The array that was packed into
 */
DistanceDisplayCondition.pack = function (value, array, startingIndex) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(value)) {
    throw new DeveloperError("value is required");
  }
  if (!defined(array)) {
    throw new DeveloperError("array is required");
  }
  //>>includeEnd('debug');

  startingIndex = startingIndex ?? 0;

  array[startingIndex++] = value.near;
  array[startingIndex] = value.far;

  return array;
};

/**
 * Retrieves an instance from a packed array.
 *
 * @param {number[]} array The packed array.
 * @param {number} [startingIndex=0] The starting index of the element to be unpacked.
 * @param {DistanceDisplayCondition} [result] The object into which to store the result.
 * @returns {DistanceDisplayCondition} The modified result parameter or a new DistanceDisplayCondition instance if one was not provided.
 */
DistanceDisplayCondition.unpack = function (array, startingIndex, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(array)) {
    throw new DeveloperError("array is required");
  }
  //>>includeEnd('debug');

  startingIndex = startingIndex ?? 0;

  if (!defined(result)) {
    result = new DistanceDisplayCondition();
  }
  result.near = array[startingIndex++];
  result.far = array[startingIndex];
  return result;
};

/**
 * Determines if two distance display conditions are equal.
 *
 * @param {DistanceDisplayCondition} [left] A distance display condition.
 * @param {DistanceDisplayCondition} [right] Another distance display condition.
 * @return {boolean} Whether the two distance display conditions are equal.
 */
DistanceDisplayCondition.equals = function (left, right) {
  return (
    left === right ||
    (defined(left) &&
      defined(right) &&
      left.near === right.near &&
      left.far === right.far)
  );
};

/**
 * Duplicates a distance display condition instance.
 *
 * @param {DistanceDisplayCondition} [value] The distance display condition to duplicate.
 * @param {DistanceDisplayCondition} [result] The result onto which to store the result.
 * @return {DistanceDisplayCondition} The duplicated instance.
 */
DistanceDisplayCondition.clone = function (value, result) {
  if (!defined(value)) {
    return undefined;
  }

  if (!defined(result)) {
    result = new DistanceDisplayCondition();
  }

  result.near = value.near;
  result.far = value.far;
  return result;
};

/**
 * Duplicates this instance.
 *
 * @param {DistanceDisplayCondition} [result] The result onto which to store the result.
 * @return {DistanceDisplayCondition} The duplicated instance.
 */
DistanceDisplayCondition.prototype.clone = function (result) {
  return DistanceDisplayCondition.clone(this, result);
};

/**
 * Determines if this distance display condition is equal to another.
 *
 * @param {DistanceDisplayCondition} [other] Another distance display condition.
 * @return {boolean} Whether this distance display condition is equal to the other.
 */
DistanceDisplayCondition.prototype.equals = function (other) {
  return DistanceDisplayCondition.equals(this, other);
};
export default DistanceDisplayCondition;
