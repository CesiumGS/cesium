// @ts-check

import Color from "../Core/Color.js";

/** @import BufferFeatureCollection from './BufferFeatureCollection.js'; */

/**
 * @abstract
 * @experimental
 */
class BufferFeature {
  /**
   * @type {BufferFeatureCollection<BufferFeature>}
   * @protected
   */
  _collection = null;

  /**
   * @type {number}
   * @protected
   */
  _index = -1;

  /**
   * @type {number}
   * @protected
   */
  _byteOffset = -1;

  /** @ignore */
  static Layout = {
    /**
     * Integer ID of this feature, unique in collection.
     * @type {number}
     */
    FEATURE_ID_U32: 0,

    /**
     * Boolean (0 or 1) flag indicating whether feature is shown.
     * @type {number}
     */
    SHOW_U8: 4,

    /**
     * Boolean (0 or 1) flag indicating whether feature is dirty.
     * @type {number}
     */
    DIRTY_U8: 5,

    /**
     * Color of feature, as integer RGBA.
     * @type {number}
     */
    COLOR_U32: 8,

    /** @type {number} */
    __BYTE_LENGTH: 12,
  };

  static DEFAULT_COUNT = 1024;

  static ERR_NOT_IMPLEMENTED = "Not implemented."; // TODO(dev)
  static ERR_INSTANTIATION =
    "This function defines an interface and should not be called directly.";
  static ERR_RESIZE =
    "Feature buffer range cannot be resized after initialization.";
  static ERR_CAPACITY = "Collection buffer capacity exceeded.";
  static ERR_MULTIPLE_OF_FOUR = "Feature byte length must be a multiple of 4.";

  constructor() {}

  /////////////////////////////////////////////////////////////////////////////
  // LIFECYCLE

  /**
   * @param {unknown} collection
   * @param {number} index
   * @param {BufferFeature} result
   * @returns {BufferFeature}
   */
  static fromCollection(collection, index, result) {
    result._collection = /** @type {BufferFeatureCollection<BufferFeature>} */ (
      collection
    );
    result._index = index;
    result._byteOffset = index * BufferFeature.Layout.__BYTE_LENGTH;
    return result;
  }

  /**
   * @returns {boolean}
   * @protected
   */
  _isResizable() {
    return this._index === this._collection.featureCount - 1;
  }

  /////////////////////////////////////////////////////////////////////////////
  // ACCESSORS

  /** @type {number} */
  get featureId() {
    return this._getUint32(BufferFeature.Layout.FEATURE_ID_U32);
  }

  /** @type {boolean} */
  get show() {
    return this._getUint8(BufferFeature.Layout.SHOW_U8) === 1;
  }

  set show(show) {
    this._setUint8(BufferFeature.Layout.SHOW_U8, show ? 1 : 0);
  }

  /**
   * @type {boolean}
   * @ignore
   */
  get _dirty() {
    return this._getUint8(BufferFeature.Layout.DIRTY_U8) === 1;
  }

  set _dirty(dirty) {
    // Avoid `._setUint8()` here, which would infinitely loop `._dirty = true`.
    this._collection._featureView.setUint8(
      this._byteOffset + BufferFeature.Layout.DIRTY_U8,
      dirty ? 1 : 0,
    );

    // A 'dirty' feature is responsible for notifying the collection. Applying
    // updates and marking the feature 'clean' will be handled by the collection,
    // so we don't notify the collection here in that case.
    if (dirty) {
      this._collection._makeDirty(this._index);
    }
  }

  /**
   * @param {Color} result
   * @returns {Color}
   */
  getColor(result) {
    return Color.fromRgba(
      this._getUint32(BufferFeature.Layout.COLOR_U32),
      result,
    );
  }

  /**
   * @param {Color} color
   */
  setColor(color) {
    this._setUint32(BufferFeature.Layout.COLOR_U32, color.toRgba());
  }

  /////////////////////////////////////////////////////////////////////////////
  // DATAVIEW ACCESSORS

  /**
   * @param {number} itemByteOffset
   * @returns {number}
   * @ignore
   */
  _getUint8(itemByteOffset) {
    return this._collection._featureView.getUint8(
      this._byteOffset + itemByteOffset,
    );
  }

  /**
   * @param {number} itemByteOffset
   * @param {number} itemValue
   * @ignore
   */
  _setUint8(itemByteOffset, itemValue) {
    this._collection._featureView.setUint8(
      this._byteOffset + itemByteOffset,
      itemValue,
    );
    this._dirty = true;
  }

  /**
   * @param {number} itemByteOffset
   * @returns {number}
   * @ignore
   */
  _getUint32(itemByteOffset) {
    return this._collection._featureView.getUint32(
      this._byteOffset + itemByteOffset,
      true,
    );
  }

  /**
   * @param {number} itemByteOffset
   * @param {number} itemValue
   * @ignore
   */
  _setUint32(itemByteOffset, itemValue) {
    this._collection._featureView.setUint32(
      this._byteOffset + itemByteOffset,
      itemValue,
      true,
    );
    this._dirty = true;
  }

  /**
   * @param {number} itemByteOffset
   * @returns {number}
   * @ignore
   */
  _getFloat32(itemByteOffset) {
    return this._collection._featureView.getFloat32(
      this._byteOffset + itemByteOffset,
      true,
    );
  }

  /**
   * @param {number} itemByteOffset
   * @param {number} itemValue
   * @ignore
   */
  _setFloat32(itemByteOffset, itemValue) {
    this._collection._featureView.setFloat32(
      this._byteOffset + itemByteOffset,
      itemValue,
      true,
    );
    this._dirty = true;
  }
}

export default BufferFeature;
