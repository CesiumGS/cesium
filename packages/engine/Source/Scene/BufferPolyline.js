// @ts-check

import BoundingSphere from "../Core/BoundingSphere.js";
import BufferPrimitive from "./BufferPrimitive.js";
import assert from "../Core/assert.js";
import BufferPrimitiveCollection from "./BufferPrimitiveCollection.js";

/** @import BufferPolylineCollection from "./BufferPolylineCollection.js"; */

const { ERR_RESIZE, ERR_CAPACITY } = BufferPrimitiveCollection.Error;

/**
 * BufferPolyline.
 *
 * Represented as two (2) or more positions.
 *
 * See: https://datatracker.ietf.org/doc/html/rfc7946#section-3.1.4
 *
 * @extends BufferPrimitive
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class BufferPolyline extends BufferPrimitive {
  /**
   * @type {BufferPolylineCollection}
   * @ignore
   */
  _collection = null;

  static Layout = {
    ...BufferPrimitive.Layout,

    /**
     * Bounding sphere for polygon.
     * @type {number}
     */
    BOUNDING_SPHERE: BufferPrimitive.Layout.__BYTE_LENGTH,

    /**
     * Width of polyline, 0–255.
     * @type {number}
     */
    WIDTH_U8:
      BufferPrimitive.Layout.__BYTE_LENGTH + BoundingSphere.packedLength,

    /**
     * Offset in position array to first vertex in polyline, number of VEC3 elements.
     * @type {number}
     */
    POSITION_OFFSET_U32:
      BufferPrimitive.Layout.__BYTE_LENGTH + BoundingSphere.packedLength + 4,

    /**
     * Count of positions (vertices) in this polyline, number of VEC3 elements.
     * @type {number}
     */
    POSITION_COUNT_U32:
      BufferPrimitive.Layout.__BYTE_LENGTH + BoundingSphere.packedLength + 8,

    /** @type {number} */
    __BYTE_LENGTH:
      BufferPrimitive.Layout.__BYTE_LENGTH + BoundingSphere.packedLength + 12,
  };

  /////////////////////////////////////////////////////////////////////////////
  // LIFECYCLE

  /**
   * @param {BufferPolyline} polyline
   * @param {BufferPolyline} result
   * @return {BufferPolyline}
   * @override
   */
  static clone(polyline, result) {
    super.clone(polyline, result);
    // TODO(memory): Causes unnecessary memory allocation during sort(). Should
    // `getPositions()` return ArrayView pointing into collection memory?
    const scratchPositions = new Float64Array(polyline.vertexCount * 3);
    result.setPositions(polyline.getPositions(scratchPositions));
    result.width = polyline.width;
    return result;
  }

  /////////////////////////////////////////////////////////////////////////////
  // GEOMETRY

  /** @type {number} */
  get vertexOffset() {
    return this._getUint32(BufferPolyline.Layout.POSITION_OFFSET_U32);
  }

  /** @type {number} */
  get vertexCount() {
    return this._getUint32(BufferPolyline.Layout.POSITION_COUNT_U32);
  }

  /**
   * @param {Float64Array} result
   * return {Float64Array}
   */
  getPositions(result) {
    const { vertexOffset, vertexCount } = this;
    const positionF64 = this._collection._positionF64;
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

  /** @type {number} */
  get width() {
    return this._getUint8(BufferPolyline.Layout.WIDTH_U8);
  }

  set width(width) {
    this._setUint8(BufferPolyline.Layout.WIDTH_U8, width);
  }

  /////////////////////////////////////////////////////////////////////////////
  // DEBUG

  /** @override */
  toJSON() {
    const positions = this.getPositions(new Float64Array(this.vertexCount * 3));
    return {
      ...super.toJSON(),
      positions: Array.from(positions),
      width: this.width,
    };
  }
}

export default BufferPolyline;
