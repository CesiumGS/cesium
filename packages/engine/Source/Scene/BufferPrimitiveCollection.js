// @ts-check

import BoundingSphere from "../Core/BoundingSphere.js";
import Color from "../Core/Color.js";
import Cartesian3 from "../Core/Cartesian3.js";
import DeveloperError from "../Core/DeveloperError.js";
import Frozen from "../Core/Frozen.js";
import BufferPrimitive from "./BufferPrimitive.js";
import assert from "../Core/assert.js";

/** @import { TypedArray } from "../Core/globalTypes.js"; */

/**
 * @typedef {object} BufferPrimitiveOptions
 * @property {boolean} [show=true]
 * @property {Color} [color=Color.WHITE]
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */

/**
 * Collection of primitives held in ArrayBuffer storage for performance and memory optimization.
 *
 * To get the full performance benefit of using a BufferPrimitiveCollection containing "N" primitives,
 * be careful to avoid allocating "N" instances of any related JavaScript object. {@link BufferPrimitive},
 * {@link Color}, {@link Cartesian3}, and other objects can all be reused when working with large collections. See
 * {@linkcode BufferPrimitiveCollection#add} and {@linkcode BufferPrimitiveCollection#get}.
 *
 * @abstract
 * @template T extends BufferPrimitive
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @example
 * const primitive = new BufferPrimitive();
 * const collection = new BufferPrimitiveCollection({ ... });
 * collection.add({ ... }, primitive);
 * collection.add({ ... }, primitive);
 * collection.add({ ... }, primitive);
 *
 * for (let i = 0; i < collection.primitiveCount; i++) {
 *   collection.get(i, primitive);
 *   primitive.setColor( ... );
 * }
 *
 * @see BufferPrimitive
 * @see BufferPointCollection
 * @see BufferPolylineCollection
 * @see BufferPolygonCollection
 */
class BufferPrimitiveCollection {
  static DEFAULT_COUNT = 1024;

  static Error = {
    ERR_RESIZE: "BufferPrimitive range cannot be resized after initialization.",
    ERR_CAPACITY: "BufferPrimitiveCollection capacity exceeded.",
    ERR_MULTIPLE_OF_FOUR:
      "BufferPrimitive byte length must be a multiple of 4.",
  };

  /**
   * @param {object} options
   * @param {number} [options.primitiveCountMax=BufferPrimitiveCollection.DEFAULT_COUNT]
   * @param {number} [options.vertexCountMax=BufferPrimitiveCollection.DEFAULT_COUNT]
   * @param {boolean} [options.show=true]
   * @param {boolean} [options.debugShowBoundingVolume=false]
   */
  constructor(options = Frozen.EMPTY_OBJECT) {
    /**
     * Determines if primitives in this collection will be shown.
     * @type {boolean}
     * @default true
     */
    this.show = options.show ?? true;

    /**
     * Bounding volume for all primitives in the collection, including both
     * shown and hidden primitives.
     * @type {BoundingSphere}
     */
    this.boundingVolume = new BoundingSphere();

    /**
     * This property is for debugging only; it is not for production use nor is it optimized.
     * <p>
     * Draws the bounding sphere for each draw command in the primitive.
     * </p>
     *
     * @type {boolean}
     * @default false
     */
    this.debugShowBoundingVolume = options.debugShowBoundingVolume ?? false;

    /**
     * @type {number}
     * @protected
     * @ignore
     */
    this._primitiveCount = 0;

    /**
     * @type {number}
     * @protected
     * @ignore
     */
    this._primitiveCountMax =
      options.primitiveCountMax ?? BufferPrimitiveCollection.DEFAULT_COUNT;

    /**
     * @type {ArrayBuffer}
     * @protected
     * @ignore
     */
    this._primitiveBuffer = null;

    /**
     * @type {DataView<ArrayBuffer>}
     * @ignore
     */
    this._primitiveView = null;

    /**
     * @type {number}
     * @ignore
     */
    this._positionCount = 0;

    /**
     * @type {number}
     * @protected
     * @ignore
     */
    this._positionCountMax =
      options.vertexCountMax ?? BufferPrimitiveCollection.DEFAULT_COUNT;

    /**
     * @type {ArrayBuffer}
     * @protected
     * @ignore
     */
    this._positionBuffer = null;

    /**
     * @type {Float64Array<ArrayBuffer>}
     * @ignore
     */
    this._positionF64 = null;

    // Potentially-dirty primitives are tracked as a contiguous range, with
    // 'clean' primitives potentially within the range. Individual primitive
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

    this._allocatePrimitiveBuffer();
    this._allocatePositionBuffer();
  }

  /**
   * Accessing `this.constructor` can cause JSDoc builds to fail, so use this
   * protected getter function instead.
   * @protected
   * @return {typeof BufferPrimitiveCollection}
   * @ignore
   */
  _getCollectionClass() {
    DeveloperError.throwInstantiationError();
  }

  /**
   * @protected
   * @return {typeof BufferPrimitive}
   * @ignore
   */
  _getPrimitiveClass() {
    DeveloperError.throwInstantiationError();
  }

  /**
   * @protected
   * @return {typeof BufferPrimitive.Layout}
   * @ignore
   */
  _getPrimitiveLayout() {
    DeveloperError.throwInstantiationError();
  }

  /////////////////////////////////////////////////////////////////////////////
  // COLLECTION LIFECYCLE

  /** @private */
  _allocatePrimitiveBuffer() {
    const layout = this._getPrimitiveLayout();

    //>>includeStart('debug', pragmas.debug);
    const { ERR_MULTIPLE_OF_FOUR } = BufferPrimitiveCollection.Error;
    assert(layout.__BYTE_LENGTH % 4 === 0, ERR_MULTIPLE_OF_FOUR);
    //>>includeEnd('debug');

    const primitiveBufferByteLength =
      this._primitiveCountMax * layout.__BYTE_LENGTH;

    this._primitiveBuffer = new ArrayBuffer(primitiveBufferByteLength);
    this._primitiveView = new DataView(this._primitiveBuffer);
  }

  /** @private */
  _allocatePositionBuffer() {
    const positionBufferByteLength =
      this._positionCountMax * 3 * Float64Array.BYTES_PER_ELEMENT;
    this._positionBuffer = new ArrayBuffer(positionBufferByteLength);
    this._positionF64 = new Float64Array(this._positionBuffer);
  }

  /**
   * Returns true if this object was destroyed; otherwise, false.
   *
   * @returns {boolean} True if this object was destroyed; otherwise, false.
   */
  isDestroyed() {
    return false;
  }

  /**
   * Sorts primitives of the collection.
   *
   * Because sorting changes the indices (but not the feature IDs) of primitives
   * in the collection, the function also returns an array mapping from previous
   * index to new index. When sorting repeatedly, the array can be reused and
   * passed as the 'result' argument for each call.
   *
   * @param {Function} sortFn
   * @param {Uint32Array} result
   * @returns {Uint32Array} Mapping from previous index to new index.
   */
  sort(sortFn, result = new Uint32Array(this.primitiveCount)) {
    const PrimitiveClass = this._getPrimitiveClass();
    const CollectionClass = this._getCollectionClass();

    const { primitiveCount } = this;

    const a = new PrimitiveClass();
    const b = new PrimitiveClass();

    // Mapping from NEW index to PREVIOUS index.
    const dstSrcMap = new Uint32Array(primitiveCount);
    for (let i = 0; i < primitiveCount; i++) {
      dstSrcMap[i] = i;
    }
    dstSrcMap.sort((indexA, indexB) =>
      sortFn(this.get(indexA, a), this.get(indexB, b)),
    );

    // Mapping from PREVIOUS index to NEW index.
    for (let i = 0; i < primitiveCount; i++) {
      result[dstSrcMap[i]] = i;
    }

    // Copy primitives to temporary collection, in sort order.
    const tmp = CollectionClass._cloneEmpty(this);
    for (let i = 0; i < primitiveCount; i++) {
      const src = this.get(dstSrcMap[i], a);
      const dst = tmp.add({}, b);
      PrimitiveClass.clone(src, dst);
    }

    // Assign buffers from temporary collection onto this one.
    CollectionClass._assignBuffers(tmp, this);
    this._dirtyOffset = 0;
    this._dirtyCount = primitiveCount;

    return result;
  }

  /**
   * Duplicates the contents of this collection into the result collection.
   * Result collection is not resized, and must contain enough space for all
   * primitives in the source collection. Existing primitives in the result
   * collection will be overwritten.
   *
   * Useful when allocating more space for a collection that has reached its
   * capacity, and efficiently transferring features to the new collection.
   *
   * @example
   * const result = new BufferPrimitiveCollection({ /* larger allocation *\/ });
   * BufferPrimitiveCollection.clone(collection, result);
   *
   * @param {BufferPrimitiveCollection<T>} collection
   * @param {BufferPrimitiveCollection<T>} result
   * @template T extends BufferPrimitive
   */
  static clone(collection, result) {
    //>>includeStart('debug', pragmas.debug);
    const { ERR_CAPACITY } = BufferPrimitiveCollection.Error;
    assert(collection.primitiveCount <= result.primitiveCountMax, ERR_CAPACITY);
    assert(collection.vertexCount <= result.vertexCountMax, ERR_CAPACITY);
    //>>includeEnd('debug');

    const layout = collection._getPrimitiveLayout();

    this._copySubDataView(
      collection._primitiveView,
      result._primitiveView,
      collection.primitiveCount * layout.__BYTE_LENGTH,
    );

    this._copySubArray(
      collection._positionF64,
      result._positionF64,
      collection.vertexCount * 4,
    );

    result.show = collection.show;
    result.debugShowBoundingVolume = collection.debugShowBoundingVolume;
    result._primitiveCount = collection._primitiveCount;
    result._positionCount = collection._positionCount;

    result._dirtyOffset = 0;
    result._dirtyCount = result.primitiveCount;

    collection.boundingVolume.clone(result.boundingVolume);

    return result;
  }

  /**
   * @param {BufferPrimitiveCollection<T>} collection
   * @returns {BufferPrimitiveCollection<T>}
   * @template T extends BufferPrimitive
   * @protected
   * @abstract
   * @ignore
   */
  static _cloneEmpty(collection) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Assigns buffers from source collection to target collection, without
   * validation or side effects. Callers must handle any validation, dirty
   * flag updates, etc.
   *
   * @param {BufferPrimitiveCollection<T>} src
   * @param {BufferPrimitiveCollection<T>} dst
   * @template T extends BufferPrimitive
   * @protected
   * @ignore
   */
  static _assignBuffers(src, dst) {
    dst._primitiveBuffer = src._primitiveBuffer;
    dst._primitiveView = src._primitiveView;

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
  // PRIMITIVE LIFECYCLE

  /**
   * Makes the given {@link BufferPrimitive} a view onto this collection's
   * primitive at the given index, for use when reading/writing primitive
   * properties. When iterating over a large collection, prefer to reuse
   * the same BufferPrimitive instance throughout the loop — rebinding
   * an existing instance to a different primitive is cheap, and avoids
   * allocating in-memory objects for every object.
   *
   * @example
   * const primitive = new BufferPrimitive();
   * for (let i = 0; i < collection.primitiveCount; i++) {
   *   collection.get(i, primitive);
   *   primitive.setColor(Color.RED);
   * }
   *
   * @param {number} index
   * @param {BufferPrimitive} result
   * @returns {BufferPrimitive} The BufferPrimitive instance passed as the
   * 'result' argument, now bound to the specified primitive index.
   */
  get(index, result) {
    result._collection = this;
    result._index = index;
    result._byteOffset = index * this._getPrimitiveLayout().__BYTE_LENGTH;
    return result;
  }

  /**
   * Adds a new primitive to the collection, with the specified options. A
   * {@link BufferPrimitive} instance is linked to the new primitive, using
   * the 'result' argument if given, or a new instance if not. For repeated
   * calls, prefer to reuse a single BufferPrimitive instance rather than
   * allocating a new instance on each call.
   *
   * @example
   * const primitive = new BufferPrimitive();
   * const colors = [Color.RED, Color.GREEN, Color.BLUE];
   *
   * for (const color of colors) {
   *   collection.add({color}, primitive);
   *
   *   primitive.featureId = 123;
   * }
   *
   * @param {BufferPrimitiveOptions} options
   * @param {BufferPrimitive} result
   * @returns {BufferPrimitive}
   */
  add(options = Frozen.EMPTY_OBJECT, result) {
    result = this.get(this._primitiveCount++, result);
    result._setUint32(
      BufferPrimitive.Layout.FEATURE_ID_U32,
      this._primitiveCount - 1,
    );
    result._dirty = true;
    result.show = options.show ?? true;
    result.setColor(options.color ?? Color.WHITE);
    return result;
  }

  /**
   * Marks primitive at given index as 'dirty', to be updated on next render.
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

  /**
   * Number of primitives added to the collection.
   * @type {number}
   */
  get primitiveCount() {
    return this._primitiveCount;
  }

  /**
   * Maximum number of primitives that may be added to the collection, including
   * those already added and counted in {@link primitiveCount}.
   * @type {number}
   */
  get primitiveCountMax() {
    return this._primitiveCountMax;
  }

  /**
   * Total byte length of buffers owned by this collection. Includes any unused
   * space allocated by {@link primitiveCountMax}, even if no primitives have
   * yet been added in that space.
   * @type {number}
   */
  get sizeInBytes() {
    return this._primitiveBuffer.byteLength + this._positionBuffer.byteLength;
  }

  /**
   * Number of vertices added to the collection.
   * @type {number}
   */
  get vertexCount() {
    return this._positionCount;
  }

  /**
   * Maximum number of vertices that may be added to the collection, including
   * those already added and counted in {@link vertexCount}.
   * @type {number}
   */
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
   * @returns {Array<Object>} List of JSON-serializable objects, one for each
   * primitive in the collection.
   */
  toJSON() {
    const PrimitiveClass = this._getPrimitiveClass();
    const primitive = new PrimitiveClass();

    const results = [];
    for (let i = 0, il = this.primitiveCount; i < il; i++) {
      this.get(i, primitive);
      results.push(primitive.toJSON());
    }

    return results;
  }
}

export default BufferPrimitiveCollection;
