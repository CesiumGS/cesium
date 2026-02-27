// @ts-check

import BufferPrimitive from "./BufferPrimitive.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Color from "../Core/Color.js";
import assert from "../Core/assert.js";
import BufferPrimitiveCollection from "./BufferPrimitiveCollection.js";

/** @import BufferPointCollection from "./BufferPointCollection.js"; */

const { ERR_CAPACITY } = BufferPrimitiveCollection.Error;

const scratchCartesian = new Cartesian3();
const scratchColor = new Color();

/**
 * View bound to the underlying buffer data of a {@link BufferPointCollection}.
 *
 * <p>BufferPoint instances are {@link https://en.wikipedia.org/wiki/Flyweight_pattern|flyweights}:
 * a single BufferPoint instance can be temporarily bound to any conceptual
 * "point" in a BufferPointCollection, allowing very large collections to be
 * iterated and updated with a minimal memory footprint.</p>
 *
 * Represented as one (1) position.
 *
 * @see BufferPointCollection
 * @see BufferPrimitive
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
     * @ignore
     */
    POSITION_OFFSET_U32: BufferPrimitive.Layout.__BYTE_LENGTH,

    /**
     * @type {number}
     * @ignore
     */
    PIXEL_SIZE_U8: BufferPrimitive.Layout.__BYTE_LENGTH + 4,

    /**
     * @type {number}
     * @ignore
     */
    OUTLINE_WIDTH_U8: BufferPrimitive.Layout.__BYTE_LENGTH + 5,

    /**
     * @type {number}
     * @ignore
     */
    OUTLINE_COLOR_U32: BufferPrimitive.Layout.__BYTE_LENGTH + 8,

    /**
     * @type {number}
     * @ignore
     */
    __BYTE_LENGTH: BufferPrimitive.Layout.__BYTE_LENGTH + 12,
  };

  /////////////////////////////////////////////////////////////////////////////
  // LIFECYCLE

  /**
   * Copies data from source point to result.
   *
   * @param {BufferPoint} point
   * @param {BufferPoint} result
   * @return {BufferPoint}
   * @override
   */
  static clone(point, result) {
    super.clone(point, result);
    result.setPosition(point.getPosition(scratchCartesian));
    return result;
  }

  /////////////////////////////////////////////////////////////////////////////
  // GEOMETRY

  /**
   * Offset in collection position array to position of this point, number
   * of VEC3 elements.
   *
   * @type {number}
   * @readonly
   * @ignore
   */
  get vertexOffset() {
    return this._getUint32(BufferPoint.Layout.POSITION_OFFSET_U32);
  }

  /**
   * Count of positions (vertices) in this primitive. Always 1.
   *
   * @type {number}
   * @readonly
   */
  get vertexCount() {
    return 1;
  }

  /**
   * Gets the position of this point.
   *
   * @param {Cartesian3} [result]
   * @returns {Cartesian3}
   */
  getPosition(result) {
    const positionF64 = this._collection._positionF64;
    return Cartesian3.fromArray(positionF64, this.vertexOffset * 3, result);
  }

  /**
   * Sets the position of this point.
   *
   * @param {Cartesian3} position
   */
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
  // ACCESSORS

  /** @type {number} */
  get pixelSize() {
    return this._getUint8(BufferPoint.Layout.PIXEL_SIZE_U8);
  }

  set pixelSize(pixelSize) {
    this._setUint8(BufferPoint.Layout.PIXEL_SIZE_U8, pixelSize);
  }

  /** @type {number} */
  get outlineWidth() {
    return this._getUint8(BufferPoint.Layout.OUTLINE_WIDTH_U8);
  }

  set outlineWidth(outlineWidth) {
    this._setUint8(BufferPoint.Layout.OUTLINE_WIDTH_U8, outlineWidth);
  }

  /**
   * @param {Color} result
   * @returns {Color}
   */
  getOutlineColor(result) {
    return Color.fromRgba(
      this._getUint32(BufferPoint.Layout.OUTLINE_COLOR_U32),
      result,
    );
  }

  /**
   * Updates the color of primitive.
   * @param {Color} color
   */
  setOutlineColor(color) {
    this._setUint32(BufferPoint.Layout.OUTLINE_COLOR_U32, color.toRgba());
  }

  /////////////////////////////////////////////////////////////////////////////
  // DEBUG

  /**
   * Returns a JSON-serializable object representing the point. This encoding
   * is not memory-efficient, and should generally be used for debugging and
   * testing.
   *
   * @returns {Object} JSON-serializable object.
   * @override
   */
  toJSON() {
    return {
      ...super.toJSON(),
      position: Cartesian3.pack(this.getPosition(), []),
      pixelSize: this.pixelSize,
      outlineWidth: this.outlineWidth,
      outlineColor: this.getColor(scratchColor).toCssHexString(),
    };
  }
}

export default BufferPoint;
