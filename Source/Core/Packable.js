import DeveloperError from "./DeveloperError.js";

/**
 * Static interface for types which can store their values as packed
 * elements in an array.  These methods and properties are expected to be
 * defined on a constructor function.
 *
 * @interface Packable
 *
 * @see PackableForInterpolation
 */
var Packable = {
  /**
   * The number of elements used to pack the object into an array.
   * @type {Number}
   */
  packedLength: undefined,

  /**
   * Stores the provided instance into the provided array.
   * @function
   *
   * @param {*} value The value to pack.
   * @param {Number[]} array The array to pack into.
   * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
   */
  pack: DeveloperError.throwInstantiationError,

  /**
   * Retrieves an instance from a packed array.
   * @function
   *
   * @param {Number[]} array The packed array.
   * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
   * @param {Object} [result] The object into which to store the result.
   * @returns {Object} The modified result parameter or a new Object instance if one was not provided.
   */
  unpack: DeveloperError.throwInstantiationError,
};
export default Packable;
