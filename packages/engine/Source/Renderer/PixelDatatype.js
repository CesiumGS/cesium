import WebGLConstants from "../Core/WebGLConstants.js";

/**
 * The data type of a pixel.
 *
 * @enum {number}
 * @see PostProcessStage
 */
const PixelDatatype = {
  UNSIGNED_BYTE: WebGLConstants.UNSIGNED_BYTE,
  UNSIGNED_SHORT: WebGLConstants.UNSIGNED_SHORT,
  UNSIGNED_INT: WebGLConstants.UNSIGNED_INT,
  FLOAT: WebGLConstants.FLOAT,
  HALF_FLOAT: WebGLConstants.HALF_FLOAT_OES,
  UNSIGNED_INT_24_8: WebGLConstants.UNSIGNED_INT_24_8,
  UNSIGNED_SHORT_4_4_4_4: WebGLConstants.UNSIGNED_SHORT_4_4_4_4,
  UNSIGNED_SHORT_5_5_5_1: WebGLConstants.UNSIGNED_SHORT_5_5_5_1,
  UNSIGNED_SHORT_5_6_5: WebGLConstants.UNSIGNED_SHORT_5_6_5,
};

/**
  @private
*/
PixelDatatype.toWebGLConstant = function (pixelDatatype, context) {
  switch (pixelDatatype) {
    case PixelDatatype.UNSIGNED_BYTE:
      return WebGLConstants.UNSIGNED_BYTE;
    case PixelDatatype.UNSIGNED_SHORT:
      return WebGLConstants.UNSIGNED_SHORT;
    case PixelDatatype.UNSIGNED_INT:
      return WebGLConstants.UNSIGNED_INT;
    case PixelDatatype.FLOAT:
      return WebGLConstants.FLOAT;
    case PixelDatatype.HALF_FLOAT:
      return context.webgl2
        ? WebGLConstants.HALF_FLOAT
        : WebGLConstants.HALF_FLOAT_OES;
    case PixelDatatype.UNSIGNED_INT_24_8:
      return WebGLConstants.UNSIGNED_INT_24_8;
    case PixelDatatype.UNSIGNED_SHORT_4_4_4_4:
      return WebGLConstants.UNSIGNED_SHORT_4_4_4_4;
    case PixelDatatype.UNSIGNED_SHORT_5_5_5_1:
      return WebGLConstants.UNSIGNED_SHORT_5_5_5_1;
    case PixelDatatype.UNSIGNED_SHORT_5_6_5:
      return PixelDatatype.UNSIGNED_SHORT_5_6_5;
  }
};

/**
  @private
*/
PixelDatatype.isPacked = function (pixelDatatype) {
  return (
    pixelDatatype === PixelDatatype.UNSIGNED_INT_24_8 ||
    pixelDatatype === PixelDatatype.UNSIGNED_SHORT_4_4_4_4 ||
    pixelDatatype === PixelDatatype.UNSIGNED_SHORT_5_5_5_1 ||
    pixelDatatype === PixelDatatype.UNSIGNED_SHORT_5_6_5
  );
};

/**
  @private
*/
PixelDatatype.sizeInBytes = function (pixelDatatype) {
  switch (pixelDatatype) {
    case PixelDatatype.UNSIGNED_BYTE:
      return 1;
    case PixelDatatype.UNSIGNED_SHORT:
    case PixelDatatype.UNSIGNED_SHORT_4_4_4_4:
    case PixelDatatype.UNSIGNED_SHORT_5_5_5_1:
    case PixelDatatype.UNSIGNED_SHORT_5_6_5:
    case PixelDatatype.HALF_FLOAT:
      return 2;
    case PixelDatatype.UNSIGNED_INT:
    case PixelDatatype.FLOAT:
    case PixelDatatype.UNSIGNED_INT_24_8:
      return 4;
  }
};

/**
  @private
*/
PixelDatatype.validate = function (pixelDatatype) {
  return (
    pixelDatatype === PixelDatatype.UNSIGNED_BYTE ||
    pixelDatatype === PixelDatatype.UNSIGNED_SHORT ||
    pixelDatatype === PixelDatatype.UNSIGNED_INT ||
    pixelDatatype === PixelDatatype.FLOAT ||
    pixelDatatype === PixelDatatype.HALF_FLOAT ||
    pixelDatatype === PixelDatatype.UNSIGNED_INT_24_8 ||
    pixelDatatype === PixelDatatype.UNSIGNED_SHORT_4_4_4_4 ||
    pixelDatatype === PixelDatatype.UNSIGNED_SHORT_5_5_5_1 ||
    pixelDatatype === PixelDatatype.UNSIGNED_SHORT_5_6_5
  );
};

/**
 * Determine which TypedArray class should be used for a given PixelDatatype.
 *
 * @param {PixelDatatype} pixelDatatype The pixel datatype.
 * @returns {function} The constructor for the appropriate TypedArray class.
 *
 * @private
 */
PixelDatatype.getTypedArrayConstructor = function (pixelDatatype) {
  const sizeInBytes = PixelDatatype.sizeInBytes(pixelDatatype);
  if (sizeInBytes === Uint8Array.BYTES_PER_ELEMENT) {
    return Uint8Array;
  } else if (sizeInBytes === Uint16Array.BYTES_PER_ELEMENT) {
    return Uint16Array;
  } else if (
    sizeInBytes === Float32Array.BYTES_PER_ELEMENT &&
    pixelDatatype === PixelDatatype.FLOAT
  ) {
    return Float32Array;
  }
  return Uint32Array;
};

export default Object.freeze(PixelDatatype);
