// @ts-check

import BoundingSphere from "../Core/BoundingSphere.js";
import BufferFeature from "./BufferFeature.js";
import assert from "../Core/assert.js";

/** @import BufferPolylineCollection from "./BufferPolylineCollection.js"; */

const { ERR_RESIZE, ERR_CAPACITY } = BufferFeature;

/**
 * BufferPolyline.
 *
 * Represented as two (2) or more positions.
 *
 * See: https://datatracker.ietf.org/doc/html/rfc7946#section-3.1.4
 *
 * @experimental
 */
class BufferPolyline extends BufferFeature {
  static Layout = {
    ...BufferFeature.Layout,

    /**
     * Bounding sphere for polygon.
     * @type {number}
     */
    BOUNDING_SPHERE: BufferFeature.Layout.__BYTE_LENGTH,

    /**
     * Width of polyline, 0–255.
     * @type {number}
     */
    WIDTH_U8: BufferFeature.Layout.__BYTE_LENGTH + BoundingSphere.packedLength,

    /**
     * Offset in position array to first vertex in polyline, number of VEC3 elements.
     * @type {number}
     */
    POSITION_OFFSET_U32:
      BufferFeature.Layout.__BYTE_LENGTH + BoundingSphere.packedLength + 4,

    /**
     * Count of positions (vertices) in this polyline, number of VEC3 elements.
     * @type {number}
     */
    POSITION_COUNT_U32:
      BufferFeature.Layout.__BYTE_LENGTH + BoundingSphere.packedLength + 8,

    /** @type {number} */
    __BYTE_LENGTH:
      BufferFeature.Layout.__BYTE_LENGTH + BoundingSphere.packedLength + 12,
  };

  /////////////////////////////////////////////////////////////////////////////
  // LIFECYCLE

  /**
   * @param {BufferPolylineCollection} collection
   * @param {number} index
   * @param {BufferPolyline} result
   * @returns {BufferPolyline}
   * @override
   */
  static fromCollection(collection, index, result = new BufferPolyline()) {
    super.fromCollection(collection, index, result);
    result._byteOffset = index * BufferPolyline.Layout.__BYTE_LENGTH;
    return result;
  }

  /////////////////////////////////////////////////////////////////////////////
  // GEOMETRY

  /** @returns {number} */
  getPositionCount() {
    return this._getUint32(BufferPolyline.Layout.POSITION_COUNT_U32);
  }

  /**
   * @param {Float64Array} result
   * return {Float64Array}
   */
  getPositions(result) {
    const collection = this._collection;
    const vertexOffset = this._getUint32(
      BufferPolyline.Layout.POSITION_OFFSET_U32,
    );
    const vertexCount = this._getUint32(
      BufferPolyline.Layout.POSITION_COUNT_U32,
    );
    const positionF64 = collection._positionF64;
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
    const vertexOffset = this._getUint32(
      BufferPolyline.Layout.POSITION_OFFSET_U32,
    );
    const srcCount = this._getUint32(BufferPolyline.Layout.POSITION_COUNT_U32);
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

  /** @type {number} */
  get width() {
    return this._getUint8(BufferPolyline.Layout.WIDTH_U8);
  }

  set width(width) {
    this._setUint8(BufferPolyline.Layout.WIDTH_U8, width);
  }
}

export default BufferPolyline;
