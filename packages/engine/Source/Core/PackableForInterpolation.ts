import DeveloperError from "./DeveloperError.js";

/**
 * Static interface for {@link Packable} types which are interpolated in a
 * different representation than their packed value.  These methods and
 * properties are expected to be defined on a constructor function.
 *
 * @namespace PackableForInterpolation
 *
 * @see Packable
 */
const PackableForInterpolation = {
  /**
   * The number of elements used to store the object into an array in its interpolatable form.
   * @type {number}
   */
  packedInterpolationLength: undefined,

  /**
   * Converts a packed array into a form suitable for interpolation.
   * @function
   *
   * @param {number[]} packedArray The packed array.
   * @param {number} [startingIndex=0] The index of the first element to be converted.
   * @param {number} [lastIndex=packedArray.length] The index of the last element to be converted.
   * @param {number[]} [result] The object into which to store the result.
   */
  convertPackedArrayForInterpolation: DeveloperError.throwInstantiationError,

  /**
   * Retrieves an instance from a packed array converted with {@link PackableForInterpolation.convertPackedArrayForInterpolation}.
   * @function
   *
   * @param {number[]} array The array previously packed for interpolation.
   * @param {number[]} sourceArray The original packed array.
   * @param {number} [startingIndex=0] The startingIndex used to convert the array.
   * @param {number} [lastIndex=packedArray.length] The lastIndex used to convert the array.
   * @param {object} [result] The object into which to store the result.
   * @returns {object} The modified result parameter or a new Object instance if one was not provided.
   */
  unpackInterpolationResult: DeveloperError.throwInstantiationError,
};
export default PackableForInterpolation;
