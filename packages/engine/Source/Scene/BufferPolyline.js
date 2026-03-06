// @ts-check

import BufferPrimitive from "./BufferPrimitive.js";
import assert from "../Core/assert.js";
import BufferPrimitiveCollection from "./BufferPrimitiveCollection.js";
import defined from "../Core/defined.js";

/** @import BufferPolylineCollection from "./BufferPolylineCollection.js"; */

const { ERR_RESIZE, ERR_CAPACITY } = BufferPrimitiveCollection.Error;

/**
 * View bound to the underlying buffer data of a {@link BufferPolylineCollection}.
 *
 * <p>BufferPolyline instances are {@link https://en.wikipedia.org/wiki/Flyweight_pattern|flyweights}:
 * a single BufferPolyline instance can be temporarily bound to any conceptual
 * "polyline" in a BufferPolylineCollection, allowing very large collections to be
 * iterated and updated with a minimal memory footprint.</p>
 *
 * Represented as two (2) or more positions.
 *
 * @see BufferPolylineCollection
 * @see BufferPrimitive
 * @extends BufferPrimitive
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class BufferPolyline extends BufferPrimitive {
  /**
   * @type {BufferPolylineCollection}
   * @ignore
   */
  _collection = null;

  /** @ignore */
  static Layout = {
    ...BufferPrimitive.Layout,

    /**
     * Offset in position array to first vertex in polyline, number of VEC3 elements.
     * @type {number}
     * @ignore
     */
    POSITION_OFFSET_U32: BufferPrimitive.Layout.__BYTE_LENGTH,

    /**
     * Count of positions (vertices) in this polyline, number of VEC3 elements.
     * @type {number}
     * @ignore
     */
    POSITION_COUNT_U32: BufferPrimitive.Layout.__BYTE_LENGTH + 4,

    /**
     * Width of polyline, 0–255px.
     * @type {number}
     * @ignore
     */
    WIDTH_U8: BufferPrimitive.Layout.__BYTE_LENGTH + 8,

    /**
     * @type {number}
     * @ignore
     */
    __BYTE_LENGTH: BufferPrimitive.Layout.__BYTE_LENGTH + 12,
  };

  /////////////////////////////////////////////////////////////////////////////
  // LIFECYCLE

  /**
   * Copies data from source polyline to result. If the result polyline is not
   * new (the last polyline in the collection) then source and result polylines
   * must have the same vertex counts.
   *
   * @param {BufferPolyline} polyline
   * @param {BufferPolyline} result
   * @return {BufferPolyline}
   * @override
   */
  static clone(polyline, result) {
    super.clone(polyline, result);
    result.setPositions(polyline.getPositions());
    result.width = polyline.width;
    return result;
  }

  /////////////////////////////////////////////////////////////////////////////
  // GEOMETRY

  /**
   * Offset in collection position array to first vertex in polyline, number
   * of VEC3 elements.
   *
   * @type {number}
   * @readonly
   * @ignore
   */
  get vertexOffset() {
    return this._getUint32(BufferPolyline.Layout.POSITION_OFFSET_U32);
  }

  /**
   * Count of positions (vertices) in this polyline, number of VEC3 elements.
   *
   * @type {number}
   * @readonly
   */
  get vertexCount() {
    return this._getUint32(BufferPolyline.Layout.POSITION_COUNT_U32);
  }

  /**
   * Returns an array view of this polyline's vertex positions. If 'result'
   * argument is given, vertex positions are written to that array and returned.
   * Otherwise, returns an ArrayView on collection memory — changes to this array
   * will not trigger render updates, which requires `.setPositions()`.
   *
   * @param {Float64Array} [result]
   * return {Float64Array}
   */
  getPositions(result) {
    const { vertexOffset, vertexCount } = this;
    const positionF64 = this._collection._positionF64;

    if (!defined(result)) {
      const byteOffset =
        positionF64.byteOffset +
        vertexOffset * 3 * Float64Array.BYTES_PER_ELEMENT;
      return new Float64Array(positionF64.buffer, byteOffset, vertexCount * 3);
    }

    for (let i = 0; i < vertexCount; i++) {
      result[i * 3] = positionF64[(vertexOffset + i) * 3];
      result[i * 3 + 1] = positionF64[(vertexOffset + i) * 3 + 1];
      result[i * 3 + 2] = positionF64[(vertexOffset + i) * 3 + 2];
    }
    return result;
  }

  /** @param {Float64Array} positions */
  setPositions(positions) {
    const collection = this._collection;
    const vertexOffset = this.vertexOffset;
    const srcCount = this.vertexCount;
    const dstCount = positions.length / 3;
    const collectionCount = collection._positionCount + dstCount - srcCount;

    //>>includeStart('debug', pragmas.debug);
    assert(srcCount === dstCount || this._isResizable(), ERR_RESIZE);
    assert(collectionCount <= collection.vertexCountMax, ERR_CAPACITY);
    //>>includeEnd('debug');

    collection._positionCount = collectionCount;
    this._setUint32(BufferPolyline.Layout.POSITION_COUNT_U32, dstCount);

    const positionF64 = collection._positionF64;
    for (let i = 0; i < dstCount; i++) {
      positionF64[(vertexOffset + i) * 3] = positions[i * 3];
      positionF64[(vertexOffset + i) * 3 + 1] = positions[i * 3 + 1];
      positionF64[(vertexOffset + i) * 3 + 2] = positions[i * 3 + 2];
    }

    collection._makeDirtyBoundingVolume();
  }

  /////////////////////////////////////////////////////////////////////////////
  // ACCESSORS

  /**
   * Width of polyline, 0–255px.
   * @type {number}
   */
  get width() {
    return this._getUint8(BufferPolyline.Layout.WIDTH_U8);
  }

  set width(width) {
    this._setUint8(BufferPolyline.Layout.WIDTH_U8, width);
  }

  /////////////////////////////////////////////////////////////////////////////
  // DEBUG

  /**
   * Returns a JSON-serializable object representing the polyline. This encoding
   * is not memory-efficient, and should generally be used for debugging and
   * testing.
   *
   * @returns {Object} JSON-serializable object.
   * @override
   */
  toJSON() {
    return {
      ...super.toJSON(),
      positions: Array.from(this.getPositions()),
      width: this.width,
    };
  }
}

export default BufferPolyline;
