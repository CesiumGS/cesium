import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import WebGLConstants from "./WebGLConstants.js";

type TypedArray = Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array;

/**
 * WebGL component datatypes interface.
 */
interface ComponentDatatypeInterface {
  readonly BYTE: number;
  readonly UNSIGNED_BYTE: number;
  readonly SHORT: number;
  readonly UNSIGNED_SHORT: number;
  readonly INT: number;
  readonly UNSIGNED_INT: number;
  readonly FLOAT: number;
  readonly DOUBLE: number;
  getSizeInBytes: (componentDatatype: number) => number;
  fromTypedArray: (array: TypedArray) => number;
  validate: (componentDatatype: number) => boolean;
  createTypedArray: (componentDatatype: number, valuesOrLength: number | number[]) => TypedArray;
  createArrayBufferView: (componentDatatype: number, buffer: ArrayBuffer, byteOffset?: number, length?: number) => TypedArray;
  fromName: (name: string) => number;
}

/**
 * WebGL component datatypes.  Components are intrinsics,
 * which form attributes, which form vertices.
 *
 * @enum {number}
 */
const ComponentDatatype: ComponentDatatypeInterface = {
  /**
   * 8-bit signed byte corresponding to <code>gl.BYTE</code> and the type
   * of an element in <code>Int8Array</code>.
   */
  BYTE: WebGLConstants.BYTE,

  /**
   * 8-bit unsigned byte corresponding to <code>UNSIGNED_BYTE</code> and the type
   * of an element in <code>Uint8Array</code>.
   */
  UNSIGNED_BYTE: WebGLConstants.UNSIGNED_BYTE,

  /**
   * 16-bit signed short corresponding to <code>SHORT</code> and the type
   * of an element in <code>Int16Array</code>.
   */
  SHORT: WebGLConstants.SHORT,

  /**
   * 16-bit unsigned short corresponding to <code>UNSIGNED_SHORT</code> and the type
   * of an element in <code>Uint16Array</code>.
   */
  UNSIGNED_SHORT: WebGLConstants.UNSIGNED_SHORT,

  /**
   * 32-bit signed int corresponding to <code>INT</code> and the type
   * of an element in <code>Int32Array</code>.
   */
  INT: WebGLConstants.INT,

  /**
   * 32-bit unsigned int corresponding to <code>UNSIGNED_INT</code> and the type
   * of an element in <code>Uint32Array</code>.
   */
  UNSIGNED_INT: WebGLConstants.UNSIGNED_INT,

  /**
   * 32-bit floating-point corresponding to <code>FLOAT</code> and the type
   * of an element in <code>Float32Array</code>.
   */
  FLOAT: WebGLConstants.FLOAT,

  /**
   * 64-bit floating-point corresponding to <code>gl.DOUBLE</code> (in Desktop OpenGL;
   * this is not supported in WebGL, and is emulated in Cesium via {@link GeometryPipeline.encodeAttribute})
   * and the type of an element in <code>Float64Array</code>.
   */
  DOUBLE: WebGLConstants.DOUBLE,

  /**
   * Returns the size, in bytes, of the corresponding datatype.
   */
  getSizeInBytes: function (componentDatatype: number): number {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(componentDatatype)) {
      throw new DeveloperError("value is required.");
    }
    //>>includeEnd('debug');

    switch (componentDatatype) {
      case ComponentDatatype.BYTE:
        return Int8Array.BYTES_PER_ELEMENT;
      case ComponentDatatype.UNSIGNED_BYTE:
        return Uint8Array.BYTES_PER_ELEMENT;
      case ComponentDatatype.SHORT:
        return Int16Array.BYTES_PER_ELEMENT;
      case ComponentDatatype.UNSIGNED_SHORT:
        return Uint16Array.BYTES_PER_ELEMENT;
      case ComponentDatatype.INT:
        return Int32Array.BYTES_PER_ELEMENT;
      case ComponentDatatype.UNSIGNED_INT:
        return Uint32Array.BYTES_PER_ELEMENT;
      case ComponentDatatype.FLOAT:
        return Float32Array.BYTES_PER_ELEMENT;
      case ComponentDatatype.DOUBLE:
        return Float64Array.BYTES_PER_ELEMENT;
      //>>includeStart('debug', pragmas.debug);
      default:
        throw new DeveloperError("componentDatatype is not a valid value.");
      //>>includeEnd('debug');
    }
  },

  /**
   * Gets the {@link ComponentDatatype} for the provided TypedArray instance.
   */
  fromTypedArray: function (array: TypedArray): number {
    if (array instanceof Int8Array) {
      return ComponentDatatype.BYTE;
    }
    if (array instanceof Uint8Array) {
      return ComponentDatatype.UNSIGNED_BYTE;
    }
    if (array instanceof Int16Array) {
      return ComponentDatatype.SHORT;
    }
    if (array instanceof Uint16Array) {
      return ComponentDatatype.UNSIGNED_SHORT;
    }
    if (array instanceof Int32Array) {
      return ComponentDatatype.INT;
    }
    if (array instanceof Uint32Array) {
      return ComponentDatatype.UNSIGNED_INT;
    }
    if (array instanceof Float32Array) {
      return ComponentDatatype.FLOAT;
    }
    if (array instanceof Float64Array) {
      return ComponentDatatype.DOUBLE;
    }

    //>>includeStart('debug', pragmas.debug);
    throw new DeveloperError(
      "array must be an Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, or Float64Array."
    );
    //>>includeEnd('debug');
  },

  /**
   * Validates that the provided component datatype is a valid {@link ComponentDatatype}
   */
  validate: function (componentDatatype: number): boolean {
    return (
      defined(componentDatatype) &&
      (componentDatatype === ComponentDatatype.BYTE ||
        componentDatatype === ComponentDatatype.UNSIGNED_BYTE ||
        componentDatatype === ComponentDatatype.SHORT ||
        componentDatatype === ComponentDatatype.UNSIGNED_SHORT ||
        componentDatatype === ComponentDatatype.INT ||
        componentDatatype === ComponentDatatype.UNSIGNED_INT ||
        componentDatatype === ComponentDatatype.FLOAT ||
        componentDatatype === ComponentDatatype.DOUBLE)
    );
  },

  /**
   * Creates a typed array corresponding to component data type.
   */
  createTypedArray: function (
    componentDatatype: number,
    valuesOrLength: number | number[]
  ): TypedArray {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(componentDatatype)) {
      throw new DeveloperError("componentDatatype is required.");
    }
    if (!defined(valuesOrLength)) {
      throw new DeveloperError("valuesOrLength is required.");
    }
    //>>includeEnd('debug');

    switch (componentDatatype) {
      case ComponentDatatype.BYTE:
        return new Int8Array(valuesOrLength as any);
      case ComponentDatatype.UNSIGNED_BYTE:
        return new Uint8Array(valuesOrLength as any);
      case ComponentDatatype.SHORT:
        return new Int16Array(valuesOrLength as any);
      case ComponentDatatype.UNSIGNED_SHORT:
        return new Uint16Array(valuesOrLength as any);
      case ComponentDatatype.INT:
        return new Int32Array(valuesOrLength as any);
      case ComponentDatatype.UNSIGNED_INT:
        return new Uint32Array(valuesOrLength as any);
      case ComponentDatatype.FLOAT:
        return new Float32Array(valuesOrLength as any);
      case ComponentDatatype.DOUBLE:
        return new Float64Array(valuesOrLength as any);
      //>>includeStart('debug', pragmas.debug);
      default:
        throw new DeveloperError("componentDatatype is not a valid value.");
      //>>includeEnd('debug');
    }
  },

  /**
   * Creates a typed view of an array of bytes.
   */
  createArrayBufferView: function (
    componentDatatype: number,
    buffer: ArrayBuffer,
    byteOffset?: number,
    length?: number
  ): TypedArray {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(componentDatatype)) {
      throw new DeveloperError("componentDatatype is required.");
    }
    if (!defined(buffer)) {
      throw new DeveloperError("buffer is required.");
    }
    //>>includeEnd('debug');

    byteOffset = byteOffset ?? 0;
    length =
      length ??
      (buffer.byteLength - byteOffset) /
        ComponentDatatype.getSizeInBytes(componentDatatype);

    switch (componentDatatype) {
      case ComponentDatatype.BYTE:
        return new Int8Array(buffer, byteOffset, length);
      case ComponentDatatype.UNSIGNED_BYTE:
        return new Uint8Array(buffer, byteOffset, length);
      case ComponentDatatype.SHORT:
        return new Int16Array(buffer, byteOffset, length);
      case ComponentDatatype.UNSIGNED_SHORT:
        return new Uint16Array(buffer, byteOffset, length);
      case ComponentDatatype.INT:
        return new Int32Array(buffer, byteOffset, length);
      case ComponentDatatype.UNSIGNED_INT:
        return new Uint32Array(buffer, byteOffset, length);
      case ComponentDatatype.FLOAT:
        return new Float32Array(buffer, byteOffset, length);
      case ComponentDatatype.DOUBLE:
        return new Float64Array(buffer, byteOffset, length);
      //>>includeStart('debug', pragmas.debug);
      default:
        throw new DeveloperError("componentDatatype is not a valid value.");
      //>>includeEnd('debug');
    }
  },

  /**
   * Get the ComponentDatatype from its name.
   */
  fromName: function (name: string): number {
    switch (name) {
      case "BYTE":
        return ComponentDatatype.BYTE;
      case "UNSIGNED_BYTE":
        return ComponentDatatype.UNSIGNED_BYTE;
      case "SHORT":
        return ComponentDatatype.SHORT;
      case "UNSIGNED_SHORT":
        return ComponentDatatype.UNSIGNED_SHORT;
      case "INT":
        return ComponentDatatype.INT;
      case "UNSIGNED_INT":
        return ComponentDatatype.UNSIGNED_INT;
      case "FLOAT":
        return ComponentDatatype.FLOAT;
      case "DOUBLE":
        return ComponentDatatype.DOUBLE;
      //>>includeStart('debug', pragmas.debug);
      default:
        throw new DeveloperError("name is not a valid value.");
      //>>includeEnd('debug');
    }
  },
};

export default Object.freeze(ComponentDatatype) as ComponentDatatypeInterface;
