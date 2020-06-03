import WebGLConstants from "../Core/WebGLConstants.js";

/**
 * The data type of a pixel.
 * <br/>定义像素的数据类型
 * <br/>参考：{@link https://blog.csdn.net/w450468524/article/details/51649065 glTexImage2D 中 format internalformat type 参数的含义}
 * 、{@link https://stackovrflow.com/questions/34497195/difference-between-format-and-internalformat Difference between format and internalformat}
 * @enum {Number}
 * @readonly
 * @see PostProcessStage
 *
 * @namespace PixelDatatype
 */
var PixelDatatype = {
  /**@readonly */
  UNSIGNED_BYTE: WebGLConstants.UNSIGNED_BYTE,
  /**@readonly */
  UNSIGNED_SHORT: WebGLConstants.UNSIGNED_SHORT,
  /**@readonly */
  UNSIGNED_INT: WebGLConstants.UNSIGNED_INT,
  /**@readonly */
  FLOAT: WebGLConstants.FLOAT,
  /**@readonly */
  HALF_FLOAT: WebGLConstants.HALF_FLOAT_OES,
  /**@readonly */
  UNSIGNED_INT_24_8: WebGLConstants.UNSIGNED_INT_24_8,
  /**@readonly */
  UNSIGNED_SHORT_4_4_4_4: WebGLConstants.UNSIGNED_SHORT_4_4_4_4,
  /**@readonly */
  UNSIGNED_SHORT_5_5_5_1: WebGLConstants.UNSIGNED_SHORT_5_5_5_1,
  /**@readonly */
  UNSIGNED_SHORT_5_6_5: WebGLConstants.UNSIGNED_SHORT_5_6_5,
};

/**
 * 判定是否已从显存传入内存
 * @param {PixelDatatype} pixelDatatype 像素数据类型
 * @returns 已传入返回true，否则返回false
 * @readonly
 * @private
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
 * 获取对应像素数据类型的子节大小
 * @param {PixelDatatype} pixelDatatype 像素数据类型
 * @returns 返回对应的子节大小
 * @readonly
 * @private
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
 * 判定是否为像素数据类型中的一种
 * @param {PixelDatatype} pixelDatatype 像素数据类型
 * @returns 是其中一种返回true,否则返回false
 * @readonly
 * @private
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
