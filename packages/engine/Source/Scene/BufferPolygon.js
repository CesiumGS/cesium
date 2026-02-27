// @ts-check

import assert from "../Core/assert.js";
import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
import BufferPrimitive from "./BufferPrimitive.js";
import BufferPrimitiveCollection from "./BufferPrimitiveCollection.js";

/** @import BufferPolygonCollection from "./BufferPolygonCollection.js"; */

const { ERR_CAPACITY, ERR_RESIZE } = BufferPrimitiveCollection.Error;

/**
 * View bound to the underlying buffer data of a {@link BufferPolygonCollection}.
 *
 * <p>BufferPolygon instances are {@link https://en.wikipedia.org/wiki/Flyweight_pattern|flyweights}:
 * a single BufferPolygon instance can be temporarily bound to any conceptual
 * "polygon" in a BufferPolygonCollection, allowing very large collections to be
 * iterated and updated with a minimal memory footprint.</p>
 *
 * <p>Represented as one (1) external linear ring of three (3) or more positions.
 * May optionally define one or more internal linear rings ("holes") within the
 * polygon. Each hole is represented as a single index into the positions array,
 * where the vertex at that index is the start of an internal linear ring that
 * continues along the following vertices until reaching either the vertex
 * index of the next hole, or the end of the vertex list. Stores a precomputed
 * triangulation, represented as three vertex indices per triangle.</p>
 *
 * @see BufferPolygonCollection
 * @see BufferPrimitive
 * @extends BufferPrimitive
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class BufferPolygon extends BufferPrimitive {
  /**
   * @type {BufferPolygonCollection}
   * @ignore
   */
  _collection = null;

  /** @ignore */
  static Layout = {
    ...BufferPrimitive.Layout,

    /**
     * Offset in collection position array to first vertex in polygon, number
     * of VEC3 elements.
     * @type {number}
     * @ignore
     */
    POSITION_OFFSET_U32: BufferPrimitive.Layout.__BYTE_LENGTH,

    /**
     * Count of positions (vertices) in this polygon, number of VEC3 elements.
     * @type {number}
     * @ignore
     */
    POSITION_COUNT_U32: BufferPrimitive.Layout.__BYTE_LENGTH + 4,

    /**
     * Offset in collection holes array to first hole in polygon, number of
     * integer elements.
     * @type {number}
     * @ignore
     */
    HOLE_OFFSET_U32: BufferPrimitive.Layout.__BYTE_LENGTH + 8,

    /**
     * Count of holes (indices) in this polygon.
     * @type {number}
     * @ignore
     */
    HOLE_COUNT_U32: BufferPrimitive.Layout.__BYTE_LENGTH + 12,

    /**
     * Offset in collection triangles array to first triangle in polygon,
     * number of VEC3 elements.
     * @type {number}
     * @ignore
     */
    TRIANGLE_OFFSET_U32: BufferPrimitive.Layout.__BYTE_LENGTH + 16,

    /**
     * Count of triangles in this polygon, number of VEC3 elements.
     * @type {number}
     * @ignore
     */
    TRIANGLE_COUNT_U32: BufferPrimitive.Layout.__BYTE_LENGTH + 20,

    /**
     * @type {number}
     * @ignore
     */
    __BYTE_LENGTH: BufferPrimitive.Layout.__BYTE_LENGTH + 24,
  };

  /////////////////////////////////////////////////////////////////////////////
  // LIFECYCLE

  /**
   * Copies data from source polygon to result. If the result polygon is not
   * new (the last polygon in the collection) then source and result polygons
   * must have the same vertex counts, hole counts, and triangle counts.
   *
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

  /**
   * Offset in collection position array to first vertex in polygon, number
   * of VEC3 elements.
   *
   * @type {number}
   * @readonly
   * @ignore
   */
  get vertexOffset() {
    return this._getUint32(BufferPolygon.Layout.POSITION_OFFSET_U32);
  }

  /**
   * Count of positions (vertices) in this polygon, including both outer ring and
   * internal rings (holes), number of VEC3 elements.
   *
   * @type {number}
   * @readonly
   */
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
    return this._getPositionsRange(this.vertexOffset, this.vertexCount, result);
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

  /**
   * Offset in collection position array to first vertex in polygon's outer
   * linear ring, number of VEC3 elements.
   *
   * @type {number}
   * @readonly
   */
  get outerVertexOffset() {
    return this.vertexOffset;
  }

  /**
   * Count of positions (vertices) in this polygon's outer linear ring, number
   * of VEC3 elements.
   *
   * @type {number}
   * @readonly
   */
  get outerVertexCount() {
    if (this.holeCount > 0) {
      return this.getHoles()[0];
    }
    return this.vertexCount;
  }

  /**
   * Returns an array view of this polygon's outer linear ring vertex positions.
   * If 'result' argument is given, vertex positions are written to that array
   * and returned. Otherwise, returns an ArrayView on collection memory —
   * changes to this array will not trigger render updates, which requires
   * `.setPositions()`.
   *
   * @param {Float64Array} [result]
   * @returns {Float64Array}
   */
  getOuterPositions(result) {
    return this._getPositionsRange(
      this.outerVertexOffset,
      this.outerVertexCount,
      result,
    );
  }

  /**
   * Offset in collection holes array to first hole in polygon, number of
   * integer elements.
   *
   * @type {number}
   * @readonly
   * @ignore
   */
  get holeOffset() {
    return this._getUint32(BufferPolygon.Layout.HOLE_OFFSET_U32);
  }

  /**
   * Count of holes (indices) in this polygon.
   *
   * @type {number}
   * @readonly
   */
  get holeCount() {
    return this._getUint32(BufferPolygon.Layout.HOLE_COUNT_U32);
  }

  /**
   * Gets this polygon's hole indices, with each hole represented as a single
   * offset into this polygon's positions array. Each hole implicitly
   * continues along an internal linear ring from that vertex offset until
   * reaching either the end of the positions array, or the next hole offset.
   *
   * If 'result' argument is given, hole indices are written to that array and
   * returned. Otherwise, returns an ArrayView on collection memory — changes
   * to this array will not trigger render updates, which requires `.setHoles()`.
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

  /**
   * Sets this polygon's hole indices, with holes represented as a single
   * offset into this polygon's positions array. Each hole implicitly
   * continues along an internal linear ring from that vertex offset until
   * reaching either the end of the positions array, or the next hole offset.
   *
   * @param {Uint32Array} holes
   */
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

  /**
   * Returns the number of (VEC3) vertices in the specified hole.
   *
   * @param {number} holeIndex
   * @returns {number}
   */
  getHoleVertexCount(holeIndex) {
    const holes = this.getHoles();

    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number.greaterThanOrEquals("holeIndex", holeIndex, 0);
    Check.typeOf.number.lessThan("holeIndex", holeIndex, holes.length);
    //>>includeEnd('debug');

    const holeVertexOffset = holes[holeIndex];
    return holeIndex === holes.length - 1
      ? this.vertexCount - holeVertexOffset
      : holes[holeIndex + 1] - holeVertexOffset;
  }

  /**
   * Returns an array view of the inner linear ring vertex positions for the
   * specified hole. If 'result' argument is given, vertex positions are written
   * to that array and returned. Otherwise, returns an ArrayView on collection
   * memory — changes to this array will not trigger render updates, which
   * requires `.setPositions()`.
   *
   * @param {number} holeIndex
   * @param {Float64Array} [result]
   * return {Float64Array}
   */
  getHolePositions(holeIndex, result) {
    const holes = this.getHoles();

    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number.greaterThanOrEquals("holeIndex", holeIndex, 0);
    Check.typeOf.number.lessThan("holeIndex", holeIndex, holes.length);
    //>>includeEnd('debug');

    const holeVertexOffset = holes[holeIndex];
    const holeVertexCount = this.getHoleVertexCount(holeIndex);
    return this._getPositionsRange(holeVertexOffset, holeVertexCount, result);
  }

  /**
   * Internal helper for accessing vertex positions. If 'result' argument is
   * given, the requested range of vertices are written to the result array
   * and returned. Otherwise, returns an ArrayView on collection memory.
   *
   * @param {number} vertexOffset
   * @param {number} vertexCount
   * @param {Float64Array} [result]
   * @returns {Float64Array}
   * @private
   */
  _getPositionsRange(vertexOffset, vertexCount, result) {
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

  /**
   * Offset in collection triangles array to first triangle in polygon,
   * number of VEC3 elements.
   * @type {number}
   * @readonly
   * @ignore
   */
  get triangleOffset() {
    return this._getUint32(BufferPolygon.Layout.TRIANGLE_OFFSET_U32);
  }

  /**
   * Count of triangles in this polygon, number of VEC3 elements.
   *
   * @type {number}
   * @readonly
   */
  get triangleCount() {
    return this._getUint32(BufferPolygon.Layout.TRIANGLE_COUNT_U32);
  }

  /**
   * Returns an array view of this polygon's triangle indices, represented as
   * three vertex indices per triangle.
   *
   * If 'result' argument is given, triangle indices are written to that array
   * and returned. Otherwise, returns an ArrayView on collection memory —
   * changes to this array will not trigger render updates, which requires
   * `.setTriangles()`.
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

  /**
   * Sets this polygon's triangle indices, represented as three vertex indices
   * per triangle.
   *
   * @param {Uint32Array} indices
   */
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

  /**
   * Returns a JSON-serializable object representing the polygon. This encoding
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
      holes: Array.from(this.getHoles()),
      triangles: Array.from(this.getTriangles()),
    };
  }
}

export default BufferPolygon;
