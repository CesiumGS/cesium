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

  /** @ignore */
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

  /////////////////////////////////////////////////////////////////////////////
  // LIFECYCLE

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
   * @type {number}
   * @readonly
   */
  get vertexOffset() {
    return this._getUint32(BufferPoint.Layout.POSITION_OFFSET_U32);
  }

  /**
   * @type {number}
   * @readonly
   */
  get vertexCount() {
    return 1;
  }

  /**
   * @param {Cartesian3} [result]
   * @returns {Cartesian3}
   */
  getPosition(result) {
    const positionF64 = this._collection._positionF64;
    return Cartesian3.fromArray(positionF64, this.vertexOffset * 3, result);
  }

  /** @param {Cartesian3} position */
  setPosition(position) {
    const collection = this._collection;
    const vertexOffset = this.vertexOffset;

    //>>includeStart('debug', pragmas.debug);
    assert(vertexOffset < collection.vertexCountMax, ERR_CAPACITY);
    //>>includeEnd('debug');

    collection._positionF64[vertexOffset * 3] = position.x;
    collection._positionF64[vertexOffset * 3 + 1] = position.y;
    collection._positionF64[vertexOffset * 3 + 2] = position.z;

    collection._makeDirtyBoundingVolume();
  }

  /////////////////////////////////////////////////////////////////////////////
  // DEBUG

  /** @override */
  toJSON() {
    return {
      ...super.toJSON(),
      position: Cartesian3.pack(this.getPosition(), []),
    };
  }
}

export default BufferPoint;
