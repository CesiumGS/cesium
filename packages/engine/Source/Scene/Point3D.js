// @ts-check

import Feature3D from "./Feature3D.js";
import Cartesian3 from "../Core/Cartesian3.js";
import assert from "../Core/assert.js";

/** @import Point3DCollection from "./Point3DCollection.js"; */

const { ERR_CAPACITY } = Feature3D;

/**
 * Point3D.
 *
 * Represented as one (1) position.
 *
 * See: https://datatracker.ietf.org/doc/html/rfc7946#section-3.1.2
 */
class Point3D extends Feature3D {
  static Layout = {
    ...Feature3D.Layout,

    /**
     * Offset in position array to current point vertex, number of VEC3 elements.
     * @type {number}
     */
    POSITION_OFFSET_U32: Feature3D.Layout.__BYTE_LENGTH,

    /** @type {number} */
    __BYTE_LENGTH: Feature3D.Layout.__BYTE_LENGTH + 4,
  };

  /**
   * @param {Point3DCollection} collection
   * @param {number} index
   * @param {Point3D} result
   * @returns {Point3D}
   * @override
   */
  static fromCollection(collection, index, result = new Point3D()) {
    super.fromCollection(collection, index, result);
    result._byteOffset = index * Point3D.Layout.__BYTE_LENGTH;
    return result;
  }

  /////////////////////////////////////////////////////////////////////////////
  // GEOMETRY

  /**
   * @param {Cartesian3} result
   * @returns {Cartesian3}
   */
  getPosition(result) {
    const vertexOffset = this._getUint32(Point3D.Layout.POSITION_OFFSET_U32);
    return Cartesian3.fromArray(
      this._collection._positionF64,
      vertexOffset * 3,
      result,
    );
  }

  /** @param {Cartesian3} position */
  setPosition(position) {
    const collection = /** @type {Point3DCollection} */ (this._collection);
    const vertexOffset = this._getUint32(Point3D.Layout.POSITION_OFFSET_U32);

    //>>includeStart('debug', pragmas.debug);
    assert(vertexOffset < collection._positionCountMax, ERR_CAPACITY);
    //>>includeEnd('debug');

    this._collection._positionF64[vertexOffset * 3] = position.x;
    this._collection._positionF64[vertexOffset * 3 + 1] = position.y;
    this._collection._positionF64[vertexOffset * 3 + 2] = position.z;
  }
}

export default Point3D;
