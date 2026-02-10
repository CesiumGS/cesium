// @ts-check

import BoundingSphere from "../Core/BoundingSphere.js";
import Color from "../Core/Color.js";
import Cartesian3 from "../Core/Cartesian3.js";
import DeveloperError from "../Core/DeveloperError.js";
import Frozen from "../Core/Frozen.js";
import Feature3D from "./Feature3D.js";

const { ERR_INSTANTIATION, ERR_NOT_IMPLEMENTED } = Feature3D;

/**
 * @typedef {object} Feature3DOptions
 * @property {boolean} [show=true]
 * @property {Color} [color=Color.WHITE]
 */

/**
 * @abstract
 * @template T extends Feature3D
 */
class Feature3DCollection {
  /**
   * @param {object} options
   * @param {number} [options.maxFeatureCount=Feature3D.DEFAULT_COUNT]
   * @param {number} [options.maxVertexCount=Feature3D.DEFAULT_COUNT]
   * @param {boolean} [options.show=true]
   * @param {boolean} [options.debugShowBoundingVolume=false]
   */
  constructor(options = Frozen.EMPTY_OBJECT) {
    // Public.

    /** @type {boolean} */
    this.show = options.show ?? true;

    /** @type {boolean} */
    this.debugShowBoundingVolume = options.debugShowBoundingVolume ?? false;

    // Protected.

    /** @type {number} */
    this._version = 0;

    /** @type {BoundingSphere} */
    this._boundingVolume = new BoundingSphere();

    /** @type {number} */
    this._nextFeatureId = 0;

    /** @type {number} */
    this._featureCount = 0;
    /** @type {number} */
    this._featureCountMax = options.maxFeatureCount ?? Feature3D.DEFAULT_COUNT;
    /** @type {ArrayBuffer} */
    this._featureBuffer = null;
    /** @type {DataView<ArrayBuffer>} */
    this._featureView = null;

    this._allocateFeatureBuffer();

    /** @type {number} */
    this._positionCount = 0;
    /** @type {number} */
    this._positionCountMax = options.maxVertexCount ?? Feature3D.DEFAULT_COUNT;
    /** @type {ArrayBuffer} */
    this._positionBuffer = null;
    /** @type {Float64Array<ArrayBuffer>} */
    this._positionF64 = null;

    this._allocatePositionBuffer();

    // Potentially-dirty features are tracked as a contiguous range, with
    // 'clean' features potentially within the range. Individual feature
    // 'dirty' flags are source-of-truth.

    /** @type {number} */
    this._dirtyOffset = 0;
    /** @type {number} */
    this._dirtyCount = 0;
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
    const featureLayout = /** @type {typeof Feature3D.Layout} */ (
      this._getFeatureLayout()
    );
    const featureBufferByteLength =
      this._featureCountMax * featureLayout.__BYTE_LENGTH;

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
   * @param {Function} sortFn
   */
  toSorted(sortFn) {
    throw new DeveloperError(ERR_NOT_IMPLEMENTED);
  }

  /**
   * @param {Feature3DCollection<T>} collection
   * @param {Feature3DCollection<T>} result
   * @template T extends Feature3D
   */
  static clone(collection, result) {
    throw new DeveloperError(ERR_NOT_IMPLEMENTED);
  }

  updateBoundingVolume() {
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
      this._boundingVolume,
    );
  }

  /////////////////////////////////////////////////////////////////////////////
  // FEATURE LIFECYCLE

  /**
   * @param {Feature3DOptions} options
   * @param {Feature3D} result
   * @returns {Feature3D}
   */
  add(options = Frozen.EMPTY_OBJECT, result) {
    const FeatureClass = /** @type {typeof Feature3D} */ (
      this._getFeatureClass()
    );
    result = FeatureClass.fromCollection(this, this._featureCount++, result);
    result._setUint32(Feature3D.Layout.FEATURE_ID_U32, this._nextFeatureId++);
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
    if (index < this._dirtyOffset) {
      this._dirtyCount += this._dirtyOffset - index;
      this._dirtyOffset = index;
    } else if (index >= this._dirtyOffset + this._dirtyCount) {
      this._dirtyCount = index - this._dirtyOffset;
    }
  }

  /////////////////////////////////////////////////////////////////////////////
  // RENDER

  /** @param {object} frameState */
  update(frameState) {
    throw new DeveloperError(ERR_NOT_IMPLEMENTED);
  }

  /////////////////////////////////////////////////////////////////////////////
  // ACCESSORS

  /** @type {number} */
  get length() {
    return this._featureCount;
  }

  /** @type {number} */
  get byteLength() {
    return this._featureBuffer.byteLength + this._positionBuffer.byteLength;
  }
}

export default Feature3DCollection;
