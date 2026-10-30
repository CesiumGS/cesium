// @ts-check

import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import WebGLConstants from "./WebGLConstants.js";

/** @import {TypedArray} from "./typedArrayTypes.js"; */

/**
 * Writes a primitive's vertex indices into a result array at an offset.
 *
 * @callback PrimitiveReader
 * @param {number} primitiveIndex The index of the primitive.
 * @param {number[]|TypedArray} result The array to write the vertex indices into.
 * @param {number} [offset=0] The index in result at which to write the first vertex index.
 * @returns {number[]|TypedArray} The result array.
 * @private
 */

/**
 * The type of a geometric primitive, i.e., points, lines, and triangles.
 *
 * @enum {number}
 */
const PrimitiveType = {
  /**
   * Points primitive where each vertex (or index) is a separate point.
   *
   * @type {number}
   * @constant
   */
  POINTS: WebGLConstants.POINTS,

  /**
   * Lines primitive where each two vertices (or indices) is a line segment.  Line segments are not necessarily connected.
   *
   * @type {number}
   * @constant
   */
  LINES: WebGLConstants.LINES,

  /**
   * Line loop primitive where each vertex (or index) after the first connects a line to
   * the previous vertex, and the last vertex implicitly connects to the first.
   *
   * @type {number}
   * @constant
   */
  LINE_LOOP: WebGLConstants.LINE_LOOP,

  /**
   * Line strip primitive where each vertex (or index) after the first connects a line to the previous vertex.
   *
   * @type {number}
   * @constant
   */
  LINE_STRIP: WebGLConstants.LINE_STRIP,

  /**
   * Triangles primitive where each three vertices (or indices) is a triangle.  Triangles do not necessarily share edges.
   *
   * @type {number}
   * @constant
   */
  TRIANGLES: WebGLConstants.TRIANGLES,

  /**
   * Triangle strip primitive where each vertex (or index) after the first two connect to
   * the previous two vertices forming a triangle.  For example, this can be used to model a wall.
   *
   * @type {number}
   * @constant
   */
  TRIANGLE_STRIP: WebGLConstants.TRIANGLE_STRIP,

  /**
   * Triangle fan primitive where each vertex (or index) after the first two connect to
   * the previous vertex and the first vertex forming a triangle.  For example, this can be used
   * to model a cone or circle.
   *
   * @type {number}
   * @constant
   */
  TRIANGLE_FAN: WebGLConstants.TRIANGLE_FAN,
};

/**
 * @private
 * @param {PrimitiveType} primitiveType
 */
// @ts-expect-error https://github.com/CesiumGS/cesium/issues/13420
PrimitiveType.isLines = function (primitiveType) {
  return (
    primitiveType === PrimitiveType.LINES ||
    primitiveType === PrimitiveType.LINE_LOOP ||
    primitiveType === PrimitiveType.LINE_STRIP
  );
};

/**
 * @private
 * @param {PrimitiveType} primitiveType
 */
// @ts-expect-error https://github.com/CesiumGS/cesium/issues/13420
PrimitiveType.isTriangles = function (primitiveType) {
  return (
    primitiveType === PrimitiveType.TRIANGLES ||
    primitiveType === PrimitiveType.TRIANGLE_STRIP ||
    primitiveType === PrimitiveType.TRIANGLE_FAN
  );
};

/**
 * @private
 * @param {PrimitiveType} primitiveType
 */
// @ts-expect-error https://github.com/CesiumGS/cesium/issues/13420
PrimitiveType.validate = function (primitiveType) {
  return (
    primitiveType === PrimitiveType.POINTS ||
    primitiveType === PrimitiveType.LINES ||
    primitiveType === PrimitiveType.LINE_LOOP ||
    primitiveType === PrimitiveType.LINE_STRIP ||
    primitiveType === PrimitiveType.TRIANGLES ||
    primitiveType === PrimitiveType.TRIANGLE_STRIP ||
    primitiveType === PrimitiveType.TRIANGLE_FAN
  );
};

/**
 * Gets the number of vertices in each primitive: 1 for points, 2 for lines,
 * and 3 for triangles.
 *
 * @private
 * @param {PrimitiveType} primitiveType
 * @returns {number}
 */
// @ts-expect-error https://github.com/CesiumGS/cesium/issues/13420
PrimitiveType.getVerticesPerPrimitive = function (primitiveType) {
  switch (primitiveType) {
    case PrimitiveType.POINTS:
      return 1;
    case PrimitiveType.LINES:
    case PrimitiveType.LINE_LOOP:
    case PrimitiveType.LINE_STRIP:
      return 2;
    case PrimitiveType.TRIANGLES:
    case PrimitiveType.TRIANGLE_STRIP:
    case PrimitiveType.TRIANGLE_FAN:
      return 3;
  }

  throw new DeveloperError(`Unsupported primitiveType: ${primitiveType}`);
};

/**
 * Gets the number of points, lines, or triangles formed by an index stream.
 * Strips, fans, and loops count each line or triangle they form.
 *
 * @private
 * @param {PrimitiveType} primitiveType
 * @param {number} indexCount The number of indices, or vertices if the geometry isn't indexed.
 * @returns {number}
 */
// @ts-expect-error https://github.com/CesiumGS/cesium/issues/13420
PrimitiveType.getPrimitiveCount = function (primitiveType, indexCount) {
  switch (primitiveType) {
    case PrimitiveType.POINTS:
      return indexCount;
    case PrimitiveType.LINES:
      return Math.floor(indexCount / 2);
    case PrimitiveType.LINE_LOOP:
      return indexCount < 2 ? 0 : indexCount;
    case PrimitiveType.LINE_STRIP:
      return Math.max(indexCount - 1, 0);
    case PrimitiveType.TRIANGLES:
      return Math.floor(indexCount / 3);
    case PrimitiveType.TRIANGLE_STRIP:
    case PrimitiveType.TRIANGLE_FAN:
      return Math.max(indexCount - 2, 0);
  }

  throw new DeveloperError(`Unsupported primitiveType: ${primitiveType}`);
};

/**
 * Creates a function that writes a primitive's vertex indices into a result
 * array. Strips, fans, and loops read as separate lines or triangles.
 *
 * @private
 * @param {PrimitiveType} primitiveType
 * @param {number} indexCount The number of indices, or vertices if the geometry isn't indexed.
 * @param {Uint8Array|Uint16Array|Uint32Array} [indices] The indices, or undefined if the geometry isn't indexed, so its vertices are used in order.
 * @returns {PrimitiveReader}
 */
// @ts-expect-error https://github.com/CesiumGS/cesium/issues/13420
PrimitiveType.createPrimitiveReader = function (
  primitiveType,
  indexCount,
  indices,
) {
  /** @type {function(number): number} */
  const readIndex = defined(indices) ? (i) => indices[i] : (i) => i;

  switch (primitiveType) {
    case PrimitiveType.POINTS:
      return (i, result, offset = 0) => {
        result[offset] = readIndex(i);
        return result;
      };

    case PrimitiveType.LINES:
      return (i, result, offset = 0) => {
        result[offset] = readIndex(i * 2);
        result[offset + 1] = readIndex(i * 2 + 1);
        return result;
      };

    // The last line connects back to the first vertex.
    case PrimitiveType.LINE_LOOP:
      return (i, result, offset = 0) => {
        result[offset] = readIndex(i);
        result[offset + 1] = readIndex((i + 1) % indexCount);
        return result;
      };

    case PrimitiveType.LINE_STRIP:
      return (i, result, offset = 0) => {
        result[offset] = readIndex(i);
        result[offset + 1] = readIndex(i + 1);
        return result;
      };

    case PrimitiveType.TRIANGLES:
      return (i, result, offset = 0) => {
        result[offset] = readIndex(i * 3);
        result[offset + 1] = readIndex(i * 3 + 1);
        result[offset + 2] = readIndex(i * 3 + 2);
        return result;
      };

    // Odd triangles swap their last two vertices to keep a consistent winding.
    case PrimitiveType.TRIANGLE_STRIP:
      return (i, result, offset = 0) => {
        const odd = i & 1;
        result[offset] = readIndex(i);
        result[offset + 1] = readIndex(i + 1 + odd);
        result[offset + 2] = readIndex(i + 2 - odd);
        return result;
      };

    case PrimitiveType.TRIANGLE_FAN:
      return (i, result, offset = 0) => {
        result[offset] = readIndex(0);
        result[offset + 1] = readIndex(i + 1);
        result[offset + 2] = readIndex(i + 2);
        return result;
      };
  }

  throw new DeveloperError(`Unsupported primitiveType: ${primitiveType}`);
};

Object.freeze(PrimitiveType);

export default PrimitiveType;
