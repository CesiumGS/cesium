// @ts-check

import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian3 from "../Core/Cartesian3.js";
import DeveloperError from "../Core/DeveloperError.js";
import Frozen from "../Core/Frozen.js";
import Matrix4 from "../Core/Matrix4.js";
import assert from "../Core/assert.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defined from "../Core/defined.js";
import Check from "../Core/Check.js";

/** @import { Destroyable, TypedArray, TypedArrayConstructor } from "../Core/globalTypes.js"; */
/** @import BufferPrimitive from "./BufferPrimitive.js"; */
/** @import BufferPrimitiveMaterial from "./BufferPrimitiveMaterial.js"; */

/**
 * @typedef {object} BufferPrimitiveOptions
 * @property {boolean} [show=true]
 * @property {BufferPrimitiveMaterial} [material]
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */

/**
 * Collection of primitives held in ArrayBuffer storage for performance and memory optimization.
 *
 * <p>To get the full performance benefit of using a BufferPrimitiveCollection containing "N" primitives,
 * be careful to avoid allocating "N" instances of any related JavaScript object. {@link BufferPrimitive},
 * {@link Color}, {@link Cartesian3}, and other objects can all be reused when working with large collections,
 * using the {@link https://en.wikipedia.org/wiki/Flyweight_pattern|flyweight pattern}.</p>
 *
 * @abstract
 * @template T extends BufferPrimitive
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @see BufferPrimitive
 * @see BufferPrimitiveMaterial
 * @see BufferPointCollection
 * @see BufferPolylineCollection
 * @see BufferPolygonCollection
 */
class BufferPrimitiveCollection {
  /**
   * Default capacity of buffers on new collections. A quantity of elements:
   * number of vertices in the vertex buffer, primitives in the primitive
   * buffer, etc. This value is arbitrary, and collections cannot be resized,
   * so specific per-buffer capacities should be provided in the collection
   * constructor when available.
   *
   * @type {number}
   * @readonly
   * @static
   */
  static DEFAULT_CAPACITY = 1024;

  /** @ignore */
  static Error = {
    ERR_RESIZE: "BufferPrimitive range cannot be resized after initialization.",
    ERR_CAPACITY: "BufferPrimitiveCollection capacity exceeded.",
    ERR_MULTIPLE_OF_FOUR:
      "BufferPrimitive byte length must be a multiple of 4.",
    ERR_OUT_OF_RANGE: "BufferPrimitive buffer access out of range.",
  };

  /**
   * Resources managed by the collection's renderer. Collections may have multiple renderer
   * implementations, so the collection should be ignorant of the renderer's implementation
   * and context data. A collection only has one renderer active at a time.
   *
   * @type {Destroyable|null}
   * @ignore
   */
  _renderContext = null;

  /**
   * @param {object} options
   * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] Transforms geometry from model to world coordinates.
   * @param {number} [options.primitiveCountMax=BufferPrimitiveCollection.DEFAULT_CAPACITY]
   * @param {number} [options.vertexCountMax=BufferPrimitiveCollection.DEFAULT_CAPACITY]
   * @param {boolean} [options.show=true]
   * @param {ComponentDatatype} [options.positionDatatype=ComponentDatatype.DOUBLE]
   * @param {boolean} [options.allowPicking=false] When <code>true</code>, primitives are pickable with {@link Scene#pick}. When <code>false</code>, memory and initialization cost are lower.
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
     * Transforms geometry from model to world coordinates.
     * @type {Matrix4}
     * @default Matrix4.IDENTITY
     */
    this.modelMatrix = Matrix4.clone(options.modelMatrix ?? Matrix4.IDENTITY);

    /**
     * Local bounding volume for all primitives in the collection, including both
     * shown and hidden primitives.
     * @type {BoundingSphere}
     */
    this.boundingVolume = new BoundingSphere();

    /**
     * World bounding volume for all primitives in the collection, including both
     * shown and hidden primitives.
     * @type {BoundingSphere}
     */
    this.boundingVolumeWC = new BoundingSphere();

    /**
     * When <code>true</code>, primitives are pickable with {@link Scene#pick}.
     * When <code>false</code>, memory and initialization cost are lower.
     * @type {boolean}
     * @readonly
     * @ignore
     * @default false
     */
    this._allowPicking = options.allowPicking ?? false;

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
      options.primitiveCountMax ?? BufferPrimitiveCollection.DEFAULT_CAPACITY;

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
      options.vertexCountMax ?? BufferPrimitiveCollection.DEFAULT_CAPACITY;

    /**
     * @type {TypedArray}
     * @ignore
     */
    this._positionView = null;

    /**
     * @type {DataView<ArrayBuffer>}
     * @ignore
     */
    this._materialView = null;

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
    this._allocatePositionBuffer(
      // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
      options.positionDatatype ?? ComponentDatatype.DOUBLE,
    );
    this._allocateMaterialBuffer();
  }

  /**
   * Accessing `this.constructor` can cause JSDoc builds to fail, so use this
   * protected getter function instead.
   * @protected
   * @return {*}
   * @ignore
   */
  _getCollectionClass() {
    DeveloperError.throwInstantiationError();
  }

  /**
   * @protected
   * @return {*}
   * @ignore
   */
  _getPrimitiveClass() {
    DeveloperError.throwInstantiationError();
  }

  /**
   * @return {*}
   * @ignore
   */
  _getMaterialClass() {
    DeveloperError.throwInstantiationError();
  }

  /////////////////////////////////////////////////////////////////////////////
  // COLLECTION LIFECYCLE

  /**
   * @private
   * @ignore
   */
  _allocatePrimitiveBuffer() {
    const layout = this._getPrimitiveClass().Layout;

    //>>includeStart('debug', pragmas.debug);
    const { ERR_MULTIPLE_OF_FOUR } = BufferPrimitiveCollection.Error;
    assert(layout.__BYTE_LENGTH % 4 === 0, ERR_MULTIPLE_OF_FOUR);
    //>>includeEnd('debug');

    this._primitiveView = new DataView(
      new ArrayBuffer(this._primitiveCountMax * layout.__BYTE_LENGTH),
    );
  }

  /**
   * @param {ComponentDatatype} datatype
   * @private
   * @ignore
   */
  _allocatePositionBuffer(datatype) {
    // @ts-expect-error Requires https://github.com/CesiumGS/cesium/pull/13203.
    this._positionView = ComponentDatatype.createTypedArray(
      datatype,
      this._positionCountMax * 3,
    );
  }

  /**
   * @private
   * @ignore
   */
  _allocateMaterialBuffer() {
    const MaterialClass = this._getMaterialClass();
    this._materialView = new DataView(
      new ArrayBuffer(this._primitiveCountMax * MaterialClass.packedLength),
    );
  }

  /**
   * Returns true if this object was destroyed; otherwise, false.
   *
   * @returns {boolean} True if this object was destroyed; otherwise, false.
   */
  isDestroyed() {
    return false;
  }

  /** Destroys collection and its GPU resources. */
  destroy() {
    if (defined(this._renderContext)) {
      this._renderContext.destroy();
      this._renderContext = undefined;
      this._dirtyOffset = 0;
      this._dirtyCount = this.primitiveCount;
    }
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
    CollectionClass._replaceBuffers(tmp, this);
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
   * <p>Useful when allocating more space for a collection that has reached its
   * capacity, and efficiently transferring features to the new collection.</p>
   *
   * @example
   * const result = new BufferPrimitiveCollection({ ... }); // allocate larger 'result' collection
   * BufferPrimitiveCollection.clone(collection, result);   // copy primitives from 'collection' into 'result'
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

    const layout = collection._getPrimitiveClass().Layout;
    const MaterialClass = collection._getMaterialClass();
    const PrimitiveClass = collection._getPrimitiveClass();

    this._copySubDataView(
      collection._primitiveView,
      result._primitiveView,
      collection.primitiveCount * layout.__BYTE_LENGTH,
    );

    this._copySubArray(
      collection._positionView,
      result._positionView,
      collection.vertexCount * 3,
    );

    this._copySubDataView(
      collection._materialView,
      result._materialView,
      collection.primitiveCount * MaterialClass.packedLength,
    );

    result.show = collection.show;
    result.debugShowBoundingVolume = collection.debugShowBoundingVolume;
    result._primitiveCount = collection._primitiveCount;
    result._positionCount = collection._positionCount;

    // Unset PickIds.
    const primitive = new PrimitiveClass();
    for (let i = 0, il = result.primitiveCount; i < il; i++) {
      result.get(i, primitive)._pickId = 0;
    }

    result._dirtyOffset = 0;
    result._dirtyCount = result.primitiveCount;

    collection.boundingVolume.clone(result.boundingVolume);

    return result;
  }

  /**
   * Returns an empty collection with the same buffer sizes as this collection.
   * Internal utility for operations requiring a working copy of memory.
   *
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
  static _replaceBuffers(src, dst) {
    dst._primitiveView = src._primitiveView;
    dst._positionView = src._positionView;
    dst._materialView = src._materialView;
  }

  /**
   * Rebuilds collection bounding volume.
   * @protected
   * @ignore
   */
  _updateBoundingVolume() {
    const TypedArray = /** @type {TypedArrayConstructor} */ (
      this._positionView.constructor
    );

    // Exclude unused space in the position buffer.
    const vertices = new TypedArray(
      /** @type {ArrayBuffer} */ (this._positionView.buffer),
      this._positionView.byteOffset,
      this._positionCount * 3,
    );

    BoundingSphere.fromVertices(
      vertices,
      Cartesian3.ZERO,
      3,
      this.boundingVolume,
    );
    BoundingSphere.transform(
      this.boundingVolume,
      this.modelMatrix,
      this.boundingVolumeWC,
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
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number.greaterThanOrEquals("index", index, 0);
    Check.typeOf.number.lessThan("index", index, this._primitiveCount);
    //>>includeEnd('debug');

    result._collection = this;
    result._index = index;
    result._byteOffset = index * this._getPrimitiveClass().Layout.__BYTE_LENGTH;
    return result;
  }

  /**
   * Adds a new primitive to the collection, with the specified options. A
   * {@link BufferPrimitive} instance is linked to the new primitive, using
   * the 'result' argument if given, or a new instance if not. For repeated
   * calls, prefer to reuse a single BufferPrimitive instance rather than
   * allocating a new instance on each call.
   *
   * @param {BufferPrimitiveOptions} options
   * @param {BufferPrimitive} result
   * @returns {BufferPrimitive}
   */
  add(options = Frozen.EMPTY_OBJECT, result) {
    //>>includeStart('debug', pragmas.debug);
    const { ERR_CAPACITY } = BufferPrimitiveCollection.Error;
    assert(this.primitiveCount < this.primitiveCountMax, ERR_CAPACITY);
    //>>includeEnd('debug');

    const MaterialClass = this._getMaterialClass();

    result = this.get(this._primitiveCount++, result);
    result.featureId = this._primitiveCount - 1;
    result.show = options.show ?? true;
    result.setMaterial(options.material ?? MaterialClass.DEFAULT_MATERIAL);
    result._pickId = 0; // unset
    result._dirty = true;
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
   * Number of primitives in collection. Must be <= {@link primitiveCountMax}.
   *
   * @type {number}
   * @readonly
   */
  get primitiveCount() {
    return this._primitiveCount;
  }

  /**
   * Maximum number of primitives this collection can contain. Must be >=
   * {@link primitiveCount}.
   *
   * @type {number}
   * @readonly
   * @default {@link BufferPrimitiveCollection.DEFAULT_CAPACITY}
   */
  get primitiveCountMax() {
    return this._primitiveCountMax;
  }

  /**
   * Total byte length of buffers owned by this collection. Includes any unused
   * space allocated by {@link primitiveCountMax}, even if no primitives have
   * yet been added in that space.
   *
   * @type {number}
   * @readonly
   */
  get byteLength() {
    return (
      this._primitiveView.byteLength +
      this._positionView.byteLength +
      this._materialView.byteLength
    );
  }

  /**
   * Number of vertices in collection. Must be <= {@link vertexCountMax}.
   *
   * @type {number}
   * @readonly
   */
  get vertexCount() {
    return this._positionCount;
  }

  /**
   * Maximum number of vertices this collection can contain. Must be >=
   * {@link vertexCount}.
   *
   * @type {number}
   * @readonly
   * @default {@link BufferPrimitiveCollection.DEFAULT_CAPACITY}
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
   * @protected
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
   * @protected
   * @ignore
   */
  static _copySubDataView(src, dst, byteLength) {
    // No need to match the original array type, just copy in 4-byte chunks.
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
   * testing.
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
      results.push(this.get(i, primitive).toJSON());
    }

    return results;
  }
}

export default BufferPrimitiveCollection;
