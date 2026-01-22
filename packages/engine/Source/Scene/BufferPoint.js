// @ts-check

import BufferPrimitive from "./BufferPrimitive.js";
import Cartesian3 from "../Core/Cartesian3.js";
import assert from "../Core/assert.js";
import BufferPrimitiveCollection from "./BufferPrimitiveCollection.js";

/** @import BufferPointCollection from "./BufferPointCollection.js"; */

const { ERR_CAPACITY } = BufferPrimitiveCollection.Error;

const scratchCartesian = new Cartesian3();

/**
 * BufferPoint.
 *
 * Represented as one (1) position.
 *
 * See: https://datatracker.ietf.org/doc/html/rfc7946#section-3.1.2
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 * @extends BufferPrimitive
 */
class BufferPoint extends BufferPrimitive {
  /**
   * @type {BufferPointCollection}
   * @ignore
   */
  _collection = null;

  static Layout = {
    ...BufferPrimitive.Layout,

    /**
     * Offset in position array to current point vertex, number of VEC3 elements.
     * @type {number}
     */
    POSITION_OFFSET_U32: BufferPrimitive.Layout.__BYTE_LENGTH,

    /** @type {number} */
    __BYTE_LENGTH: BufferPrimitive.Layout.__BYTE_LENGTH + 4,
  };

  /**
   * @param {BufferPoint} point
   * @param {BufferPoint} result
   * @return {BufferPoint}
   */
  static clone(point, result) {
    super.clone(point, result);
    result.setPosition(point.getPosition(scratchCartesian));
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

  /////////////////////////////////////////////////////////////////////////////
  // DEBUG

  /** @override */
  toJSON() {
    return {
      ...super.toJSON(),
      position: Cartesian3.pack(this.getPosition(scratchCartesian), []),
    };
  }
}

export default BufferPoint;
