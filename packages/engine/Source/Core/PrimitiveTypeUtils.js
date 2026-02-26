// @ts-check

import PrimitiveType from "./PrimitiveType.js";

/** @ignore */
export default class PrimitiveTypeUtils {
  /**
   * @param {PrimitiveType} primitiveType
   * @returns {boolean}
   */
  static isLines(primitiveType) {
    return (
      primitiveType === PrimitiveType.LINES ||
      primitiveType === PrimitiveType.LINE_LOOP ||
      primitiveType === PrimitiveType.LINE_STRIP
    );
  }

  /**
   * @param {PrimitiveType} primitiveType
   * @returns {boolean}
   */
  static isTriangles(primitiveType) {
    return (
      primitiveType === PrimitiveType.TRIANGLES ||
      primitiveType === PrimitiveType.TRIANGLE_STRIP ||
      primitiveType === PrimitiveType.TRIANGLE_FAN
    );
  }

  /**
   * @param {PrimitiveType} primitiveType
   * @returns {boolean}
   */
  static validate(primitiveType) {
    return (
      primitiveType === PrimitiveType.POINTS ||
      primitiveType === PrimitiveType.LINES ||
      primitiveType === PrimitiveType.LINE_LOOP ||
      primitiveType === PrimitiveType.LINE_STRIP ||
      primitiveType === PrimitiveType.TRIANGLES ||
      primitiveType === PrimitiveType.TRIANGLE_STRIP ||
      primitiveType === PrimitiveType.TRIANGLE_FAN
    );
  }
}
