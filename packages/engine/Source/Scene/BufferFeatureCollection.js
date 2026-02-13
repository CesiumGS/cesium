// @ts-check

import BoundingSphere from "../Core/BoundingSphere.js";
import Color from "../Core/Color.js";
import Cartesian3 from "../Core/Cartesian3.js";
import DeveloperError from "../Core/DeveloperError.js";
import Frozen from "../Core/Frozen.js";
import BufferFeature from "./BufferFeature.js";
import assert from "../Core/assert.js";

/** @import { TypedArray } from "../Core/globalTypes.js"; */

const {
  ERR_CAPACITY,
  ERR_INSTANTIATION,
  ERR_NOT_IMPLEMENTED,
  ERR_MULTIPLE_OF_FOUR,
} = BufferFeature;

/**
 * @typedef {object} BufferFeatureOptions
 * @property {boolean} [show=true]
 * @property {Color} [color=Color.WHITE]
 * @experimental
 */

/**
 * @abstract
 * @template T extends BufferFeature
 * @experimental
 */
class BufferFeatureCollection {
  /**
   * @param {object} options
   * @param {number} [options.maxFeatureCount=BufferFeature.DEFAULT_COUNT]
   * @param {number} [options.maxVertexCount=BufferFeature.DEFAULT_COUNT]
   * @param {boolean} [options.show=true]
   * @param {boolean} [options.debugShowBoundingVolume=false]
   */
  constructor(options = Frozen.EMPTY_OBJECT) {
    /** @type {boolean} */
    this.show = options.show ?? true;

    /** @type {BoundingSphere} */
    this.boundingVolume = new BoundingSphere();

    /** @type {boolean} */
    this.debugShowBoundingVolume = options.debugShowBoundingVolume ?? false;

    /**
     * @type {number}
     * @protected
     */
    this._featureCount = 0;

    /**
     * @type {number}
     * @protected
     */
    this._featureCountMax =
      options.maxFeatureCount ?? BufferFeature.DEFAULT_COUNT;

    /**
     * @type {ArrayBuffer}
     * @protected
     */
    this._featureBuffer = null;

    /**
     * @type {DataView<ArrayBuffer>}
     * @ignore
     */
    this._featureView = null;

    /**
     * @type {number}
     * @ignore
     */
    this._positionCount = 0;

    /**
     * @type {number}
     * @protected
     */
    this._positionCountMax =
      options.maxVertexCount ?? BufferFeature.DEFAULT_COUNT;

    /**
     * @type {ArrayBuffer}
     * @protected
     */
    this._positionBuffer = null;

    /**
     * @type {Float64Array<ArrayBuffer>}
     * @ignore
     */
    this._positionF64 = null;

    // Potentially-dirty features are tracked as a contiguous range, with
    // 'clean' features potentially within the range. Individual feature
    // 'dirty' flags are source-of-truth.

    /**
     * @type {number}
     * @ignore
     */
    this._dirtyOffset = 0;

    /**
     * @type {number}
     * @ignore
     */
    this._dirtyCount = 0;

    /**
     * @type {boolean}
     * @ignore
     */
    this._dirtyBoundingVolume = false;

    this._allocateFeatureBuffer();
    this._allocatePositionBuffer();
  }

  /**
   * @protected
   * @return {unknown}
   */
  _getFeatureClass() {
    throw new DeveloperError(ERR_INSTANTIATION);
  }

  /**
   * @protected
   * @return {unknown}
   */
  _getFeatureLayout() {
    throw new DeveloperError(ERR_INSTANTIATION);
  }

  /////////////////////////////////////////////////////////////////////////////
  // COLLECTION LIFECYCLE

  /** @private */
  _allocateFeatureBuffer() {
    const layout = /** @type {typeof BufferFeature.Layout} */ (
      this._getFeatureLayout()
    );

    //>>includeStart('debug', pragmas.debug);
    assert(layout.__BYTE_LENGTH % 4 === 0, ERR_MULTIPLE_OF_FOUR);
    //>>includeEnd('debug');

    const featureBufferByteLength =
      this._featureCountMax * layout.__BYTE_LENGTH;

    this._featureBuffer = new ArrayBuffer(featureBufferByteLength);
    this._featureView = new DataView(this._featureBuffer);
  }

  /** @private */
  _allocatePositionBuffer() {
    const positionBufferByteLength =
      this._positionCountMax * 3 * Float64Array.BYTES_PER_ELEMENT;
    this._positionBuffer = new ArrayBuffer(positionBufferByteLength);
    this._positionF64 = new Float64Array(this._positionBuffer);
  }

  isDestroyed() {
    return false;
  }

  destroy() {
    throw new DeveloperError(ERR_NOT_IMPLEMENTED);
  }

  /**
   * Sorts features of the collection.
   * @param {Function} sortFn
   * @param {Uint32Array} result
   * @returns {Uint32Array} Mapping from previous index to new index.
   */
  sort(sortFn, result = new Uint32Array(this.featureCount)) {
    const FeatureClass = /** @type {typeof BufferFeature} */ (
      this._getFeatureClass()
    );
    const CollectionClass = /** @type {typeof BufferFeatureCollection} */ (
      this.constructor
    );

    const { featureCount } = this;

    const a = new FeatureClass();
    const b = new FeatureClass();

    // Mapping from NEW index to PREVIOUS index.
    const dstSrcMap = new Uint32Array(featureCount);
    for (let i = 0; i < featureCount; i++) {
      dstSrcMap[i] = i;
    }
    dstSrcMap.sort((indexA, indexB) =>
      sortFn(
        FeatureClass.fromCollection(this, indexA, a),
        FeatureClass.fromCollection(this, indexB, b),
      ),
    );

    // Mapping from PREVIOUS index to NEW index.
    for (let i = 0; i < featureCount; i++) {
      result[dstSrcMap[i]] = i;
    }

    // Copy features to temporary collection, in sort order.
    const tmp = CollectionClass._cloneEmpty(this);
    for (let i = 0; i < featureCount; i++) {
      const src = FeatureClass.fromCollection(this, dstSrcMap[i], a);
      const dst = tmp.add({}, b);
      FeatureClass.clone(src, dst);
    }

    // Assign buffers from temporary collection onto this one.
    CollectionClass._assignBuffers(tmp, this);
    this._dirtyOffset = 0;
    this._dirtyCount = featureCount;

    return result;
  }

  /**
   * @param {BufferFeatureCollection<T>} collection
   * @param {BufferFeatureCollection<T>} result
   * @template T extends BufferFeature
   */
  static clone(collection, result) {
    //>>includeStart('debug', pragmas.debug);
    assert(collection.featureCount <= result.featureCountMax, ERR_CAPACITY);
    assert(collection.vertexCount <= result.vertexCountMax, ERR_CAPACITY);
    //>>includeEnd('debug');

    const layout = /** @type {typeof BufferFeature.Layout} */ (
      collection._getFeatureLayout()
    );

    this._copySubDataView(
      collection._featureView,
      result._featureView,
      collection.featureCount * layout.__BYTE_LENGTH,
    );

    this._copySubArray(
      collection._positionF64,
      result._positionF64,
      collection.vertexCount * 4,
    );

    result.show = collection.show;
    result.debugShowBoundingVolume = collection.debugShowBoundingVolume;
    result._featureCount = collection._featureCount;
    result._positionCount = collection._positionCount;

    result._dirtyOffset = 0;
    result._dirtyCount = result.featureCount;

    collection.boundingVolume.clone(result.boundingVolume);

    return result;
  }

  /**
   * @param {BufferFeatureCollection<T>} collection
   * @returns {BufferFeatureCollection<T>}
   * @template T extends BufferFeature
   * @protected
   * @abstract
   * @ignore
   */
  static _cloneEmpty(collection) {
    throw new DeveloperError(ERR_INSTANTIATION);
  }

  /**
   * Assigns buffers from source collection to target collection, without
   * validation or side effects. Callers must handle any validation, dirty
   * flag updates, etc.
   *
   * @param {BufferFeatureCollection<T>} src
   * @param {BufferFeatureCollection<T>} dst
   * @template T extends BufferFeature
   * @protected
   * @ignore
   */
  static _assignBuffers(src, dst) {
    dst._featureBuffer = src._featureBuffer;
    dst._featureView = src._featureView;

    dst._positionBuffer = src._positionBuffer;
    dst._positionF64 = src._positionF64;
  }

  /**
   * Rebuilds collection bounding volume.
   * @protected
   * @ignore
   */
  _updateBoundingVolume() {
    // Exclude unused space in the position buffer.
    const vertices = new Float64Array(
      this._positionF64.buffer,
      this._positionF64.byteOffset,
      this._positionCount * 3,
    );
    BoundingSphere.fromVertices(
      vertices,
      Cartesian3.ZERO,
      4,
      this.boundingVolume,
    );

    this._dirtyBoundingVolume = false;
  }

  /////////////////////////////////////////////////////////////////////////////
  // FEATURE LIFECYCLE

  /**
   * @param {BufferFeatureOptions} options
   * @param {BufferFeature} result
   * @returns {BufferFeature}
   */
  add(options = Frozen.EMPTY_OBJECT, result) {
    const FeatureClass = /** @type {typeof BufferFeature} */ (
      this._getFeatureClass()
    );
    result = FeatureClass.fromCollection(this, this._featureCount++, result);
    result._setUint32(
      BufferFeature.Layout.FEATURE_ID_U32,
      this._featureCount - 1,
    );
    result._dirty = true;
    result.show = options.show ?? true;
    result.setColor(options.color ?? Color.WHITE);
    return result;
  }

  /**
   * Marks a feature at given index as 'dirty', to be updated on next render.
   * @param {number} index
   * @ignore
   */
  _makeDirty(index) {
    if (this._dirtyCount === 0) {
      this._dirtyCount = 1;
      this._dirtyOffset = index;
    } else if (index < this._dirtyOffset) {
      this._dirtyCount += this._dirtyOffset - index;
      this._dirtyOffset = index;
    } else if (index + 1 > this._dirtyOffset + this._dirtyCount) {
      this._dirtyCount = index + 1 - this._dirtyOffset;
    }
  }

  /**
   * Marks collection bounding volume as 'dirty', to be updated on next render.
   * @ignore
   */
  _makeDirtyBoundingVolume() {
    this._dirtyBoundingVolume = true;
  }

  /////////////////////////////////////////////////////////////////////////////
  // RENDER

  /** @param {object} frameState */
  update(frameState) {
    if (this._dirtyBoundingVolume) {
      this._updateBoundingVolume();
    }
  }

  /////////////////////////////////////////////////////////////////////////////
  // ACCESSORS

  /** @type {number} */
  get featureCount() {
    return this._featureCount;
  }

  /** @type {number} */
  get featureCountMax() {
    return this._featureCountMax;
  }

  /** @type {number} */
  get byteLength() {
    return this._featureBuffer.byteLength + this._positionBuffer.byteLength;
  }

  /** @type {number} */
  get vertexCount() {
    return this._positionCount;
  }

  /** @type {number} */
  get vertexCountMax() {
    return this._positionCountMax;
  }

  /////////////////////////////////////////////////////////////////////////////
  // UTILS

  /**
   * @param {TypedArray} src
   * @param {TypedArray} dst
   * @param {number} count
   * @ignore
   */
  static _copySubArray(src, dst, count) {
    for (let i = 0; i < count; i++) {
      dst[i] = src[i];
    }
  }

  /**
   * @param {DataView} src
   * @param {DataView} dst
   * @param {number} byteLength
   * @ignore
   */
  static _copySubDataView(src, dst, byteLength) {
    this._copySubArray(
      new Uint32Array(src.buffer, src.byteOffset, src.byteLength / 4),
      new Uint32Array(dst.buffer, dst.byteOffset, dst.byteLength / 4),
      byteLength / 4,
    );
  }

  /////////////////////////////////////////////////////////////////////////////
  // DEBUG

  /**
   * Returns a JSON-serializable array representing the collection. This encoding
   * is not memory-efficient, and should generally be used for debugging and
   * testing — not for production applications.
   *
   * @example
   * console.table(collection.toJSON());
   *
   * @returns {Object[]}
   * @experimental
   */
  toJSON() {
    const FeatureClass = /** @type {typeof BufferFeature} */ (
      this._getFeatureClass()
    );
    const feature = new FeatureClass();

    const results = [];
    for (let i = 0, il = this.featureCount; i < il; i++) {
      FeatureClass.fromCollection(this, i, feature);
      results.push(feature.toJSON());
    }

    return results;
  }
}

export default BufferFeatureCollection;
