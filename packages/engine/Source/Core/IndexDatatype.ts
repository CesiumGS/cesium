import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import CesiumMath from "./Math.js";
import WebGLConstants from "./WebGLConstants.js";

type IndexTypedArray = Uint8Array | Uint16Array | Uint32Array;

/**
 * WebGL index datatypes interface.
 */
interface IndexDatatypeInterface {
  readonly UNSIGNED_BYTE: number;
  readonly UNSIGNED_SHORT: number;
  readonly UNSIGNED_INT: number;
  getSizeInBytes: (indexDatatype: number) => number;
  fromSizeInBytes: (sizeInBytes: number) => number;
  validate: (indexDatatype: number) => boolean;
  createTypedArray: (numberOfVertices: number, indicesLengthOrArray: number | number[]) => Uint16Array | Uint32Array;
  createTypedArrayFromArrayBuffer: (numberOfVertices: number, sourceArray: ArrayBuffer, byteOffset: number, length?: number) => Uint16Array | Uint32Array;
  fromTypedArray: (array: IndexTypedArray) => number;
}

/**
 * Constants for WebGL index datatypes.  These corresponds to the
 * <code>type</code> parameter of {@link http://www.khronos.org/opengles/sdk/docs/man/xhtml/glDrawElements.xml|drawElements}.
 *
 * @enum {number}
 */
const IndexDatatype: IndexDatatypeInterface = {
  /**
   * 8-bit unsigned byte corresponding to <code>UNSIGNED_BYTE</code> and the type
   * of an element in <code>Uint8Array</code>.
   */
  UNSIGNED_BYTE: WebGLConstants.UNSIGNED_BYTE,

  /**
   * 16-bit unsigned short corresponding to <code>UNSIGNED_SHORT</code> and the type
   * of an element in <code>Uint16Array</code>.
   */
  UNSIGNED_SHORT: WebGLConstants.UNSIGNED_SHORT,

  /**
   * 32-bit unsigned int corresponding to <code>UNSIGNED_INT</code> and the type
   * of an element in <code>Uint32Array</code>.
   */
  UNSIGNED_INT: WebGLConstants.UNSIGNED_INT,

  /**
   * Returns the size, in bytes, of the corresponding datatype.
   */
  getSizeInBytes: function (indexDatatype: number): number {
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
  },

  /**
   * Gets the datatype with a given size in bytes.
   */
  fromSizeInBytes: function (sizeInBytes: number): number {
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
  },

  /**
   * Validates that the provided index datatype is a valid {@link IndexDatatype}.
   */
  validate: function (indexDatatype: number): boolean {
    return (
      defined(indexDatatype) &&
      (indexDatatype === IndexDatatype.UNSIGNED_BYTE ||
        indexDatatype === IndexDatatype.UNSIGNED_SHORT ||
        indexDatatype === IndexDatatype.UNSIGNED_INT)
    );
  },

  /**
   * Creates a typed array that will store indices, using either <code><Uint16Array</code>
   * or <code>Uint32Array</code> depending on the number of vertices.
   */
  createTypedArray: function (
    numberOfVertices: number,
    indicesLengthOrArray: number | number[]
  ): Uint16Array | Uint32Array {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(numberOfVertices)) {
      throw new DeveloperError("numberOfVertices is required.");
    }
    //>>includeEnd('debug');

    if (numberOfVertices >= CesiumMath.SIXTY_FOUR_KILOBYTES) {
      return new Uint32Array(indicesLengthOrArray as any);
    }

    return new Uint16Array(indicesLengthOrArray as any);
  },

  /**
   * Creates a typed array from a source array buffer.
   */
  createTypedArrayFromArrayBuffer: function (
    numberOfVertices: number,
    sourceArray: ArrayBuffer,
    byteOffset: number,
    length?: number
  ): Uint16Array | Uint32Array {
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
  },

  /**
   * Gets the {@link IndexDatatype} for the provided TypedArray instance.
   */
  fromTypedArray: function (array: IndexTypedArray): number {
    if (array instanceof Uint8Array) {
      return IndexDatatype.UNSIGNED_BYTE;
    }
    if (array instanceof Uint16Array) {
      return IndexDatatype.UNSIGNED_SHORT;
    }
    if (array instanceof Uint32Array) {
      return IndexDatatype.UNSIGNED_INT;
    }

    //>>includeStart('debug', pragmas.debug);
    throw new DeveloperError(
      "array must be a Uint8Array, Uint16Array, or Uint32Array."
    );
    //>>includeEnd('debug');
  },
};

export default Object.freeze(IndexDatatype) as IndexDatatypeInterface;
