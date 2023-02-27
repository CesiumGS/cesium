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

export default Object.freeze(PixelDatatype);
