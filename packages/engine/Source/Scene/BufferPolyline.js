// @ts-check

import BufferPrimitive from "./BufferPrimitive.js";
import assert from "../Core/assert.js";
import BufferPrimitiveCollection from "./BufferPrimitiveCollection.js";
import defined from "../Core/defined.js";

/** @import { TypedArray, TypedArrayConstructor } from "../Core/globalTypes.js"; */
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
 * @see BufferPolylineMaterial
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
     * @type {number}
     * @ignore
     */
    __BYTE_LENGTH: BufferPrimitive.Layout.__BYTE_LENGTH + 8,
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
   * @param {TypedArray} [result]
   * return {TypedArray}
   */
  getPositions(result) {
    const { vertexOffset, vertexCount } = this;
    const positionView = this._collection._positionView;

    if (!defined(result)) {
      const byteOffset =
        positionView.byteOffset +
        vertexOffset * 3 * positionView.BYTES_PER_ELEMENT;
      const TypedArray = /** @type {TypedArrayConstructor} */ (
        positionView.constructor
      );
      return new TypedArray(
        /** @type {ArrayBuffer} */ (positionView.buffer),
        byteOffset,
        vertexCount * 3,
      );
    }

    for (let i = 0; i < vertexCount; i++) {
      result[i * 3] = positionView[(vertexOffset + i) * 3];
      result[i * 3 + 1] = positionView[(vertexOffset + i) * 3 + 1];
      result[i * 3 + 2] = positionView[(vertexOffset + i) * 3 + 2];
    }
    return result;
  }

  /** @param {TypedArray} positions */
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

    const positionView = collection._positionView;
    for (let i = 0; i < dstCount; i++) {
      positionView[(vertexOffset + i) * 3] = positions[i * 3];
      positionView[(vertexOffset + i) * 3 + 1] = positions[i * 3 + 1];
      positionView[(vertexOffset + i) * 3 + 2] = positions[i * 3 + 2];
    }

    collection._makeDirtyBoundingVolume();
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
    };
  }
}

export default BufferPolyline;
