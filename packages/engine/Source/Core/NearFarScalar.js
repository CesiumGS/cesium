import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";

/**
 * Represents a scalar value's lower and upper bound at a near distance and far distance in eye space.
 * @alias NearFarScalar
 * @constructor
 *
 * @param {number} [near=0.0] The lower bound of the camera range.
 * @param {number} [nearValue=0.0] The value at the lower bound of the camera range.
 * @param {number} [far=1.0] The upper bound of the camera range.
 * @param {number} [farValue=0.0] The value at the upper bound of the camera range.
 *
 * @see Packable
 */
function NearFarScalar(near, nearValue, far, farValue) {
  /**
   * The lower bound of the camera range.
   * @type {number}
   * @default 0.0
   */
  this.near = defaultValue(near, 0.0);
  /**
   * The value at the lower bound of the camera range.
   * @type {number}
   * @default 0.0
   */
  this.nearValue = defaultValue(nearValue, 0.0);
  /**
   * The upper bound of the camera range.
   * @type {number}
   * @default 1.0
   */
  this.far = defaultValue(far, 1.0);
  /**
   * The value at the upper bound of the camera range.
   * @type {number}
   * @default 0.0
   */
  this.farValue = defaultValue(farValue, 0.0);
}

/**
 * Duplicates a NearFarScalar instance.
 *
 * @param {NearFarScalar} nearFarScalar The NearFarScalar to duplicate.
 * @param {NearFarScalar} [result] The object onto which to store the result.
 * @returns {NearFarScalar} The modified result parameter or a new NearFarScalar instance if one was not provided. (Returns undefined if nearFarScalar is undefined)
 */
NearFarScalar.clone = function (nearFarScalar, result) {
  if (!defined(nearFarScalar)) {
    return undefined;
  }

  if (!defined(result)) {
    return new NearFarScalar(
      nearFarScalar.near,
      nearFarScalar.nearValue,
      nearFarScalar.far,
      nearFarScalar.farValue
    );
  }

  result.near = nearFarScalar.near;
  result.nearValue = nearFarScalar.nearValue;
  result.far = nearFarScalar.far;
  result.farValue = nearFarScalar.farValue;
  return result;
};

/**
 * The number of elements used to pack the object into an array.
 * @type {number}
 */
NearFarScalar.packedLength = 4;

/**
 * Stores the provided instance into the provided array.
 *
 * @param {NearFarScalar} value The value to pack.
 * @param {number[]} array The array to pack into.
 * @param {number} [startingIndex=0] The index into the array at which to start packing the elements.
 *
 * @returns {number[]} The array that was packed into
 */
NearFarScalar.pack = function (value, array, startingIndex) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(value)) {
    throw new DeveloperError("value is required");
  }
  if (!defined(array)) {
    throw new DeveloperError("array is required");
  }
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  array[startingIndex++] = value.near;
  array[startingIndex++] = value.nearValue;
  array[startingIndex++] = value.far;
  array[startingIndex] = value.farValue;

  return array;
};

/**
 * Retrieves an instance from a packed array.
 *
 * @param {number[]} array The packed array.
 * @param {number} [startingIndex=0] The starting index of the element to be unpacked.
 * @param {NearFarScalar} [result] The object into which to store the result.
 * @returns {NearFarScalar} The modified result parameter or a new NearFarScalar instance if one was not provided.
 */
NearFarScalar.unpack = function (array, startingIndex, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(array)) {
    throw new DeveloperError("array is required");
  }
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  if (!defined(result)) {
    result = new NearFarScalar();
  }
  result.near = array[startingIndex++];
  result.nearValue = array[startingIndex++];
  result.far = array[startingIndex++];
  result.farValue = array[startingIndex];
  return result;
};

/**
 * Compares the provided NearFarScalar and returns <code>true</code> if they are equal,
 * <code>false</code> otherwise.
 *
 * @param {NearFarScalar} [left] The first NearFarScalar.
 * @param {NearFarScalar} [right] The second NearFarScalar.
 * @returns {boolean} <code>true</code> if left and right are equal; otherwise <code>false</code>.
 */
NearFarScalar.equals = function (left, right) {
  return (
    left === right ||
    (defined(left) &&
      defined(right) &&
      left.near === right.near &&
      left.nearValue === right.nearValue &&
      left.far === right.far &&
      left.farValue === right.farValue)
  );
};

/**
 * Duplicates this instance.
 *
 * @param {NearFarScalar} [result] The object onto which to store the result.
 * @returns {NearFarScalar} The modified result parameter or a new NearFarScalar instance if one was not provided.
 */
NearFarScalar.prototype.clone = function (result) {
  return NearFarScalar.clone(this, result);
};

/**
 * Compares this instance to the provided NearFarScalar and returns <code>true</code> if they are equal,
 * <code>false</code> otherwise.
 *
 * @param {NearFarScalar} [right] The right hand side NearFarScalar.
 * @returns {boolean} <code>true</code> if left and right are equal; otherwise <code>false</code>.
 */
NearFarScalar.prototype.equals = function (right) {
  return NearFarScalar.equals(this, right);
};
export default NearFarScalar;
