// @ts-check

import assert from "../Core/assert.js";
import BufferPrimitive from "./BufferPrimitive.js";
import BoundingSphere from "../Core/BoundingSphere.js";
import BufferPrimitiveCollection from "./BufferPrimitiveCollection.js";
import defined from "../Core/defined.js";

/** @import BufferPolygonCollection from "./BufferPolygonCollection.js"; */

const { ERR_CAPACITY, ERR_RESIZE } = BufferPrimitiveCollection.Error;

/**
 * BufferPolygon.
 *
 * Represented as one (1) external linear ring of four (4) or more
 * positions, where first and last position are the same. May optionally
 * define one or more internal linear rings ("holes") within the polygon.
 * Stores a precomputed triangulation, including one or more triangles.
 * Holes and triangles are stored as indices into the positions array.
 *
 * See: https://datatracker.ietf.org/doc/html/rfc7946#section-3.1.6
 *
 * @extends BufferPrimitive
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class BufferPolygon extends BufferPrimitive {
  /**
   * @type {BufferPolygonCollection}
   * @ignore
   */
  _collection = null;

  /**
   * @type {BoundingSphere}
   * @protected
   */
  _boundingSphere = new BoundingSphere();

  static Layout = {
    ...BufferPrimitive.Layout,

    /**
     * Bounding sphere for polygon.
     * @type {number}
     */
    BOUNDING_SPHERE: BufferPrimitive.Layout.__BYTE_LENGTH,

    /**
     * Offset in position array to first vertex in polygon, number of VEC3 elements.
     * @type {number}
     */
    POSITION_OFFSET_U32:
      BufferPrimitive.Layout.__BYTE_LENGTH + BoundingSphere.packedLength,

    /**
     * Count of positions (vertices) in this polygon, number of VEC3 elements.
     * @type {number}
     */
    POSITION_COUNT_U32:
      BufferPrimitive.Layout.__BYTE_LENGTH + BoundingSphere.packedLength + 4,

    /**
     * Offset in holes array to first hole in polygon, number of integer elements.
     * @type {number}
     */
    HOLE_OFFSET_U32:
      BufferPrimitive.Layout.__BYTE_LENGTH + BoundingSphere.packedLength + 8,

    /**
     * Count of holes (indices) in this polygon, number of integer elements.
     * @type {number}
     */
    HOLE_COUNT_U32:
      BufferPrimitive.Layout.__BYTE_LENGTH + BoundingSphere.packedLength + 12,

    /**
     * Offset in triangles array to first triangle in polygon, number of VEC3 elements.
     * @type {number}
     */
    TRIANGLE_OFFSET_U32:
      BufferPrimitive.Layout.__BYTE_LENGTH + BoundingSphere.packedLength + 16,

    /**
     * Count of triangles (3x uint32) in this polygon, number of VEC3 elements.
     * @type {number}
     */
    TRIANGLE_COUNT_U32:
      BufferPrimitive.Layout.__BYTE_LENGTH + BoundingSphere.packedLength + 20,

    /** @type {number} */
    __BYTE_LENGTH:
      BufferPrimitive.Layout.__BYTE_LENGTH + BoundingSphere.packedLength + 24,
  };

  /////////////////////////////////////////////////////////////////////////////
  // LIFECYCLE

  /**
   * @param {BufferPolygon} polygon
   * @param {BufferPolygon} result
   * @return {BufferPolygon}
   * @override
   */
  static clone(polygon, result) {
    super.clone(polygon, result);
    result.setPositions(polygon.getPositions());
    result.setHoles(polygon.getHoles());
    result.setTriangles(polygon.getTriangles());
    return result;
  }

  /////////////////////////////////////////////////////////////////////////////
  // GEOMETRY

  /** @type {number} */
  get vertexOffset() {
    return this._getUint32(BufferPolygon.Layout.POSITION_OFFSET_U32);
  }

  /** @type {number} */
  get vertexCount() {
    return this._getUint32(BufferPolygon.Layout.POSITION_COUNT_U32);
  }

  /**
   * Returns an array view of this polygon's vertex positions. If 'result'
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
    const collectionCount = collection.vertexCount + dstCount - srcCount;

    //>>includeStart('debug', pragmas.debug);
    assert(srcCount === dstCount || this._isResizable(), ERR_RESIZE);
    assert(collectionCount <= collection.vertexCountMax, ERR_CAPACITY);
    //>>includeEnd('debug');

    collection._positionCount = collectionCount;
    this._setUint32(BufferPolygon.Layout.POSITION_COUNT_U32, dstCount);

    const positionF64 = collection._positionF64;
    for (let i = 0; i < dstCount; i++) {
      positionF64[(vertexOffset + i) * 3] = positions[i * 3];
      positionF64[(vertexOffset + i) * 3 + 1] = positions[i * 3 + 1];
      positionF64[(vertexOffset + i) * 3 + 2] = positions[i * 3 + 2];
    }

    collection._makeDirtyBoundingVolume();
  }

  /** @type {number} */
  get holeOffset() {
    return this._getUint32(BufferPolygon.Layout.HOLE_OFFSET_U32);
  }

  /** @type {number} */
  get holeCount() {
    return this._getUint32(BufferPolygon.Layout.HOLE_COUNT_U32);
  }

  /**
   * Returns an array view of this polygon's hole indices. If 'result'
   * argument is given, hole indices are written to that array and returned.
   * Otherwise, returns an ArrayView on collection memory — changes to this array
   * will not trigger render updates, which requires `.setHoles()`.
   *
   * @param {Uint32Array} [result]
   * @returns {Uint32Array}
   */
  getHoles(result) {
    const { holeOffset, holeCount } = this;
    const holeIndexU32 = this._collection._holeIndexU32;

    if (!defined(result)) {
      const byteOffset =
        holeIndexU32.byteOffset + holeOffset * Uint32Array.BYTES_PER_ELEMENT;
      return new Uint32Array(holeIndexU32.buffer, byteOffset, holeCount);
    }

    for (let i = 0; i < holeCount; i++) {
      result[i] = holeIndexU32[holeOffset + i];
    }
    return result;
  }

  /** @param {Uint32Array} holes */
  setHoles(holes) {
    const collection = this._collection;
    const holeOffset = this.holeOffset;
    const srcCount = this.holeCount;
    const dstCount = holes.length;
    const collectionCount = collection.holeCount + dstCount - srcCount;

    //>>includeStart('debug', pragmas.debug);
    assert(srcCount === dstCount || this._isResizable(), ERR_RESIZE);
    assert(collectionCount <= collection.holeCountMax, ERR_CAPACITY);
    //>>includeEnd('debug');

    collection._holeCount = collectionCount;
    this._setUint32(BufferPolygon.Layout.HOLE_COUNT_U32, dstCount);

    const holeIndexU32 = collection._holeIndexU32;
    for (let i = 0; i < dstCount; i++) {
      holeIndexU32[holeOffset + i] = holes[i];
    }

    collection._makeDirtyBoundingVolume();
  }

  /** @type {number} */
  get triangleOffset() {
    return this._getUint32(BufferPolygon.Layout.TRIANGLE_OFFSET_U32);
  }

  /** @type {number} */
  get triangleCount() {
    return this._getUint32(BufferPolygon.Layout.TRIANGLE_COUNT_U32);
  }

  /**
   * Returns an array view of this polygon's triangle indices. If 'result'
   * argument is given, triangle indices are written to that array and returned.
   * Otherwise, returns an ArrayView on collection memory — changes to this array
   * will not trigger render updates, which requires `.setTriangles()`.
   *
   * @param {Uint32Array} [result]
   * @returns {Uint32Array}
   */
  getTriangles(result) {
    const { triangleOffset, triangleCount } = this;
    const indices = this._collection._triangleIndexU32;

    if (!defined(result)) {
      const byteOffset =
        indices.byteOffset + triangleOffset * 3 * Uint32Array.BYTES_PER_ELEMENT;
      return new Uint32Array(indices.buffer, byteOffset, triangleCount * 3);
    }

    for (let i = 0; i < triangleCount; i++) {
      result[i * 3] = indices[(triangleOffset + i) * 3];
      result[i * 3 + 1] = indices[(triangleOffset + i) * 3 + 1];
      result[i * 3 + 2] = indices[(triangleOffset + i) * 3 + 2];
    }
    return result;
  }

  /** @param {Uint32Array} indices */
  setTriangles(indices) {
    const collection = this._collection;
    const triangleOffset = this.triangleOffset;
    const srcCount = this.triangleCount;
    const dstCount = indices.length / 3;
    const collectionCount = collection.triangleCount + dstCount - srcCount;

    //>>includeStart('debug', pragmas.debug);
    assert(srcCount === dstCount || this._isResizable(), ERR_RESIZE);
    assert(collectionCount <= collection.triangleCountMax, ERR_CAPACITY);
    //>>includeEnd('debug');

    collection._triangleCount += dstCount - srcCount;
    this._setUint32(BufferPolygon.Layout.TRIANGLE_COUNT_U32, dstCount);

    const dstIndices = collection._triangleIndexU32;
    for (let i = 0; i < dstCount; i++) {
      dstIndices[(triangleOffset + i) * 3] = indices[i * 3];
      dstIndices[(triangleOffset + i) * 3 + 1] = indices[i * 3 + 1];
      dstIndices[(triangleOffset + i) * 3 + 2] = indices[i * 3 + 2];
    }

    collection._makeDirtyBoundingVolume();
  }

  /////////////////////////////////////////////////////////////////////////////
  // DEBUG

  /** @override */
  toJSON() {
    return {
      ...super.toJSON(),
      positions: Array.from(
        this.getPositions(new Float64Array(this.vertexCount * 3)),
      ),
      holes: Array.from(this.getHoles(new Uint32Array(this.holeCount))),
      triangles: Array.from(
        this.getHoles(new Uint32Array(this.triangleCount * 3)),
      ),
    };
  }
}

export default BufferPolygon;
