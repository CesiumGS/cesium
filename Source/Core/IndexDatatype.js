import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import CesiumMath from "./Math.js";
import WebGLConstants from "./WebGLConstants.js";

/**
 * Constants for WebGL index datatypes.  These corresponds to the
 * <code>type</code> parameter of {@link http://www.khronos.org/opengles/sdk/docs/man/xhtml/glDrawElements.xml|drawElements}.
 *
 * @enum {Number}
 */
var IndexDatatype = {
  /**
   * 8-bit unsigned byte corresponding to <code>UNSIGNED_BYTE</code> and the type
   * of an element in <code>Uint8Array</code>.
   *
   * @type {Number}
   * @constant
   */
  UNSIGNED_BYTE: WebGLConstants.UNSIGNED_BYTE,

  /**
   * 16-bit unsigned short corresponding to <code>UNSIGNED_SHORT</code> and the type
   * of an element in <code>Uint16Array</code>.
   *
   * @type {Number}
   * @constant
   */
  UNSIGNED_SHORT: WebGLConstants.UNSIGNED_SHORT,

  /**
   * 32-bit unsigned int corresponding to <code>UNSIGNED_INT</code> and the type
   * of an element in <code>Uint32Array</code>.
   *
   * @type {Number}
   * @constant
   */
  UNSIGNED_INT: WebGLConstants.UNSIGNED_INT,
};

/**
 * Returns the size, in bytes, of the corresponding datatype.
 *
 * @param {IndexDatatype} indexDatatype The index datatype to get the size of.
 * @returns {Number} The size in bytes.
 *
 * @example
 * // Returns 2
 * var size = Cesium.IndexDatatype.getSizeInBytes(Cesium.IndexDatatype.UNSIGNED_SHORT);
 */
IndexDatatype.getSizeInBytes = function (indexDatatype) {
  switch (indexDatatype) {
    case IndexDatatype.UNSIGNED_BYTE:
      return Uint8Array.BYTES_PER_ELEMENT;
    case IndexDatatype.UNSIGNED_SHORT:
      return Uint16Array.BYTES_PER_ELEMENT;
    case IndexDatatype.UNSIGNED_INT:
      return Uint32Array.BYTES_PER_ELEMENT;
  }

  //>>includeStart('debug', pragmas.debug);
  throw new DeveloperError(
    "indexDatatype is required and must be a valid IndexDatatype constant."
  );
  //>>includeEnd('debug');
};

/**
 * Gets the datatype with a given size in bytes.
 *
 * @param {Number} sizeInBytes The size of a single index in bytes.
 * @returns {IndexDatatype} The index datatype with the given size.
 */
IndexDatatype.fromSizeInBytes = function (sizeInBytes) {
  switch (sizeInBytes) {
    case 2:
      return IndexDatatype.UNSIGNED_SHORT;
    case 4:
      return IndexDatatype.UNSIGNED_INT;
    case 1:
      return IndexDatatype.UNSIGNED_BYTE;
    //>>includeStart('debug', pragmas.debug);
    default:
      throw new DeveloperError(
        "Size in bytes cannot be mapped to an IndexDatatype"
      );
    //>>includeEnd('debug');
  }
};

/**
 * Validates that the provided index datatype is a valid {@link IndexDatatype}.
 *
 * @param {IndexDatatype} indexDatatype The index datatype to validate.
 * @returns {Boolean} <code>true</code> if the provided index datatype is a valid value; otherwise, <code>false</code>.
 *
 * @example
 * if (!Cesium.IndexDatatype.validate(indexDatatype)) {
 *   throw new Cesium.DeveloperError('indexDatatype must be a valid value.');
 * }
 */
IndexDatatype.validate = function (indexDatatype) {
  return (
    defined(indexDatatype) &&
    (indexDatatype === IndexDatatype.UNSIGNED_BYTE ||
      indexDatatype === IndexDatatype.UNSIGNED_SHORT ||
      indexDatatype === IndexDatatype.UNSIGNED_INT)
  );
};

/**
 * Creates a typed array that will store indices, using either <code><Uint16Array</code>
 * or <code>Uint32Array</code> depending on the number of vertices.
 *
 * @param {Number} numberOfVertices Number of vertices that the indices will reference.
 * @param {Number|Array} indicesLengthOrArray Passed through to the typed array constructor.
 * @returns {Uint16Array|Uint32Array} A <code>Uint16Array</code> or <code>Uint32Array</code> constructed with <code>indicesLengthOrArray</code>.
 *
 * @example
 * this.indices = Cesium.IndexDatatype.createTypedArray(positions.length / 3, numberOfIndices);
 */
IndexDatatype.createTypedArray = function (
  numberOfVertices,
  indicesLengthOrArray
) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(numberOfVertices)) {
    throw new DeveloperError("numberOfVertices is required.");
  }
  //>>includeEnd('debug');

  if (numberOfVertices >= CesiumMath.SIXTY_FOUR_KILOBYTES) {
    return new Uint32Array(indicesLengthOrArray);
  }

  return new Uint16Array(indicesLengthOrArray);
};

/**
 * Creates a typed array from a source array buffer.  The resulting typed array will store indices, using either <code><Uint16Array</code>
 * or <code>Uint32Array</code> depending on the number of vertices.
 *
 * @param {Number} numberOfVertices Number of vertices that the indices will reference.
 * @param {ArrayBuffer} sourceArray Passed through to the typed array constructor.
 * @param {Number} byteOffset Passed through to the typed array constructor.
 * @param {Number} length Passed through to the typed array constructor.
 * @returns {Uint16Array|Uint32Array} A <code>Uint16Array</code> or <code>Uint32Array</code> constructed with <code>sourceArray</code>, <code>byteOffset</code>, and <code>length</code>.
 *
 */
IndexDatatype.createTypedArrayFromArrayBuffer = function (
  numberOfVertices,
  sourceArray,
  byteOffset,
  length
) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(numberOfVertices)) {
    throw new DeveloperError("numberOfVertices is required.");
  }
  if (!defined(sourceArray)) {
    throw new DeveloperError("sourceArray is required.");
  }
  if (!defined(byteOffset)) {
    throw new DeveloperError("byteOffset is required.");
  }
  //>>includeEnd('debug');

  if (numberOfVertices >= CesiumMath.SIXTY_FOUR_KILOBYTES) {
    return new Uint32Array(sourceArray, byteOffset, length);
  }

  return new Uint16Array(sourceArray, byteOffset, length);
};
export default Object.freeze(IndexDatatype);
