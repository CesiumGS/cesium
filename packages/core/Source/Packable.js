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
const Packable = {
  /**
   * The number of elements used to pack the object into an array.
   * @type {number}
   */
  packedLength: undefined,

  /**
   * Stores the provided instance into the provided array.
   * @function
   *
   * @param {*} value The value to pack.
   * @param {number[]} array The array to pack into.
   * @param {number} [startingIndex=0] The index into the array at which to start packing the elements.
   */
  pack: DeveloperError.throwInstantiationError,

  /**
   * Retrieves an instance from a packed array.
   * @function
   *
   * @param {number[]} array The packed array.
   * @param {number} [startingIndex=0] The starting index of the element to be unpacked.
   * @param {object} [result] The object into which to store the result.
   * @returns {object} The modified result parameter or a new Object instance if one was not provided.
   */
  unpack: DeveloperError.throwInstantiationError,
};
export default Packable;
