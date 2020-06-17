import WebGLConstants from "../Core/WebGLConstants.js";

/**
 * The data type of a pixel.
 *
 * @enum {Number}
 * @see PostProcessStage
 */
var PixelDatatype = {
  UNSIGNED_BYTE: 0,
  UNSIGNED_SHORT: 1,
  UNSIGNED_INT: 2,
  FLOAT: 3,
  HALF_FLOAT: 4,
  UNSIGNED_INT_24_8: 5,
  UNSIGNED_SHORT_4_4_4_4: 6,
  UNSIGNED_SHORT_5_5_5_1: 7,
  UNSIGNED_SHORT_5_6_5: 8,
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
