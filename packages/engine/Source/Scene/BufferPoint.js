// @ts-check

import BufferFeature from "./BufferFeature.js";
import Cartesian3 from "../Core/Cartesian3.js";
import assert from "../Core/assert.js";

/** @import BufferPointCollection from "./BufferPointCollection.js"; */

const { ERR_CAPACITY } = BufferFeature;

/**
 * BufferPoint.
 *
 * Represented as one (1) position.
 *
 * See: https://datatracker.ietf.org/doc/html/rfc7946#section-3.1.2
 *
 * @experimental
 */
class BufferPoint extends BufferFeature {
  /** @ignore */
  static Layout = {
    ...BufferFeature.Layout,

    /**
     * Offset in position array to current point vertex, number of VEC3 elements.
     * @type {number}
     */
    POSITION_OFFSET_U32: BufferFeature.Layout.__BYTE_LENGTH,

    /** @type {number} */
    __BYTE_LENGTH: BufferFeature.Layout.__BYTE_LENGTH + 4,
  };

  /**
   * @param {BufferPointCollection} collection
   * @param {number} index
   * @param {BufferPoint} result
   * @returns {BufferPoint}
   * @override
   */
  static fromCollection(collection, index, result = new BufferPoint()) {
    super.fromCollection(collection, index, result);
    result._byteOffset = index * BufferPoint.Layout.__BYTE_LENGTH;
    return result;
  }

  /////////////////////////////////////////////////////////////////////////////
  // GEOMETRY

  /**
   * @param {Cartesian3} result
   * @returns {Cartesian3}
   */
  getPosition(result) {
    const vertexOffset = this._getUint32(
      BufferPoint.Layout.POSITION_OFFSET_U32,
    );
    return Cartesian3.fromArray(
      this._collection._positionF64,
      vertexOffset * 3,
      result,
    );
  }

  /** @param {Cartesian3} position */
  setPosition(position) {
    const collection = /** @type {BufferPointCollection} */ (this._collection);
    const vertexOffset = this._getUint32(
      BufferPoint.Layout.POSITION_OFFSET_U32,
    );

    //>>includeStart('debug', pragmas.debug);
    assert(vertexOffset < collection.vertexCountMax, ERR_CAPACITY);
    //>>includeEnd('debug');

    this._collection._positionF64[vertexOffset * 3] = position.x;
    this._collection._positionF64[vertexOffset * 3 + 1] = position.y;
    this._collection._positionF64[vertexOffset * 3 + 2] = position.z;

    collection._makeDirtyBoundingVolume();
  }
}

export default BufferPoint;
