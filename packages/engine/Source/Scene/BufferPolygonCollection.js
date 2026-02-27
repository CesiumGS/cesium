// @ts-check

import defined from "../Core/defined.js";
import BufferPrimitiveCollection from "./BufferPrimitiveCollection.js";
import BufferPolygon from "./BufferPolygon.js";
import Frozen from "../Core/Frozen.js";
import assert from "../Core/assert.js";

/** @import Color from "../Core/Color.js"; */
/** @import FrameState from "./FrameState.js" */

const { ERR_CAPACITY } = BufferPrimitiveCollection.Error;

/**
 * @typedef {object} BufferPolygonOptions
 * @property {boolean} [show=true]
 * @property {Color} [color=Color.WHITE]
 * @property {Float64Array} [positions]
 * @property {Uint32Array} [holes]
 * @property {Uint32Array} [triangles]
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */

/**
 * @extends BufferPrimitiveCollection<BufferPolygon>
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class BufferPolygonCollection extends BufferPrimitiveCollection {
  /**
   * @param {object} options
   * @param {number} [options.primitiveCountMax=BufferPrimitiveCollection.DEFAULT_CAPACITY]
   * @param {number} [options.vertexCountMax=BufferPrimitiveCollection.DEFAULT_CAPACITY]
   * @param {number} [options.holeCountMax=BufferPrimitiveCollection.DEFAULT_CAPACITY]
   * @param {number} [options.triangleCountMax=BufferPrimitiveCollection.DEFAULT_CAPACITY]
   * @param {boolean} [options.show=true]
   * @param {boolean} [options.debugShowBoundingVolume=false]
   */
  constructor(options = Frozen.EMPTY_OBJECT) {
    super(options);

    /**
     * @type {number}
     * @ignore
     */
    this._holeCount = 0;

    /**
     * @type {number}
     * @protected
     * @ignore
     */
    this._holeCountMax =
      options.holeCountMax ?? BufferPrimitiveCollection.DEFAULT_CAPACITY;

    /**
     * @type {ArrayBuffer}
     * @protected
     * @ignore
     */
    this._holeIndexBuffer = null;

    /**
     * @type {Uint32Array<ArrayBuffer>}
     * @ignore
     */
    this._holeIndexU32 = null;

    /**
     * @type {number}
     * @ignore
     */
    this._triangleCount = 0;

    /**
     * @type {number}
     * @protected
     * @ignore
     */
    this._triangleCountMax =
      options.triangleCountMax ?? BufferPrimitiveCollection.DEFAULT_CAPACITY;

    /**
     * @type {ArrayBuffer}
     * @protected
     * @ignore
     */
    this._triangleIndexBuffer = null;

    /**
     * @type {Uint32Array<ArrayBuffer>}
     * @ignore
     */
    this._triangleIndexU32 = null;

    this._allocateHoleIndexBuffer();
    this._allocateTriangleIndexBuffer();
  }

  _getCollectionClass() {
    return BufferPolygonCollection;
  }

  _getPrimitiveClass() {
    return BufferPolygon;
  }

  /////////////////////////////////////////////////////////////////////////////
  // COLLECTION LIFECYCLE

  /**
   * @private
   * @ignore
   */
  _allocateHoleIndexBuffer() {
    const holeIndexBufferByteLength =
      this._holeCountMax * Uint32Array.BYTES_PER_ELEMENT;
    this._holeIndexBuffer = new ArrayBuffer(holeIndexBufferByteLength);
    this._holeIndexU32 = new Uint32Array(this._holeIndexBuffer);
  }

  /**
   * @private
   * @ignore
   */
  _allocateTriangleIndexBuffer() {
    const triangleIndexBufferByteLength =
      this._triangleCountMax * 3 * Uint32Array.BYTES_PER_ELEMENT;
    this._triangleIndexBuffer = new ArrayBuffer(triangleIndexBufferByteLength);
    this._triangleIndexU32 = new Uint32Array(this._triangleIndexBuffer);
  }

  /**
   * @param {BufferPolygonCollection} collection
   * @param {BufferPolygonCollection} result
   * @returns {BufferPolygonCollection}
   */
  static clone(collection, result) {
    super.clone(collection, result);

    //>>includeStart('debug', pragmas.debug);
    assert(collection.holeCount <= result.holeCountMax, ERR_CAPACITY);
    assert(collection.triangleCount <= result.triangleCountMax, ERR_CAPACITY);
    //>>includeEnd('debug');

    this._copySubArray(
      collection._holeIndexU32,
      result._holeIndexU32,
      collection.holeCount,
    );

    this._copySubArray(
      collection._triangleIndexU32,
      result._triangleIndexU32,
      collection._triangleCount * 3,
    );

    result._holeCount = collection._holeCount;
    result._triangleCount = collection._triangleCount;

    return result;
  }

  /**
   * @param {BufferPolygonCollection} collection
   * @returns {BufferPolygonCollection}
   * @override
   * @ignore
   */
  static _cloneEmpty(collection) {
    return new BufferPolygonCollection({
      primitiveCountMax: collection.primitiveCountMax,
      vertexCountMax: collection.vertexCountMax,
      holeCountMax: collection.holeCountMax,
      triangleCountMax: collection.triangleCountMax,
    });
  }

  /**
   * @param {BufferPolygonCollection} src
   * @param {BufferPolygonCollection} dst
   * @override
   * @ignore
   */
  static _replaceBuffers(src, dst) {
    super._replaceBuffers(src, dst);

    dst._holeIndexBuffer = src._holeIndexBuffer;
    dst._holeIndexU32 = src._holeIndexU32;

    dst._triangleIndexBuffer = src._triangleIndexBuffer;
    dst._triangleIndexU32 = src._triangleIndexU32;
  }

  /////////////////////////////////////////////////////////////////////////////
  // PRIMITIVE LIFECYCLE

  /**
   * @param {BufferPolygonOptions} options
   * @param {BufferPolygon} result
   * @returns {BufferPolygon}
   * @override
   */
  add(options, result = new BufferPolygon()) {
    super.add(options, result);

    const vertexOffset = this._positionCount;
    result._setUint32(BufferPolygon.Layout.POSITION_OFFSET_U32, vertexOffset);
    result._setUint32(BufferPolygon.Layout.POSITION_COUNT_U32, 0);

    const holeOffset = this._holeCount;
    result._setUint32(BufferPolygon.Layout.HOLE_OFFSET_U32, holeOffset);
    result._setUint32(BufferPolygon.Layout.HOLE_COUNT_U32, 0);

    const triangleOffset = this._triangleCount;
    result._setUint32(BufferPolygon.Layout.TRIANGLE_OFFSET_U32, triangleOffset);
    result._setUint32(BufferPolygon.Layout.TRIANGLE_COUNT_U32, 0);

    if (defined(options.positions)) {
      result.setPositions(options.positions);
    }

    if (defined(options.holes)) {
      result.setHoles(options.holes);
    }

    if (defined(options.triangles)) {
      result.setTriangles(options.triangles);
    }

    return result;
  }

  /////////////////////////////////////////////////////////////////////////////
  // RENDER

  /**
   * @param {FrameState} frameState
   * @ignore
   */
  update(frameState) {
    super.update(frameState);
  }

  /////////////////////////////////////////////////////////////////////////////
  // ACCESSORS

  /**
   * @type {number}
   * @readonly
   */
  get byteLength() {
    return (
      super.byteLength +
      this._holeIndexBuffer.byteLength +
      this._triangleIndexBuffer.byteLength
    );
  }

  /**
   * @type {number}
   * @readonly
   */
  get holeCount() {
    return this._holeCount;
  }

  /**
   * @type {number}
   * @readonly
   * @default {@link BufferPrimitiveCollection.DEFAULT_CAPACITY}
   */
  get holeCountMax() {
    return this._holeCountMax;
  }

  /**
   * @type {number}
   * @readonly
   */
  get triangleCount() {
    return this._triangleCount;
  }

  /**
   * @type {number}
   * @readonly
   * @default {@link BufferPrimitiveCollection.DEFAULT_CAPACITY}
   */
  get triangleCountMax() {
    return this._triangleCountMax;
  }
}
export default BufferPolygonCollection;
