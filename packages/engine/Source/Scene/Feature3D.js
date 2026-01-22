// @ts-check

import Color from "../Core/Color.js";

/** @import Feature3DCollection from './Feature3DCollection.js'; */

/** @abstract */
class Feature3D {
  /** @type {Feature3DCollection<Feature3D>} */
  _collection = null;

  /** @type {number} */
  _index = -1;

  /** @type {number} */
  _byteOffset = -1;

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

  static ERR_NOT_IMPLEMENTED = "Not implemented.";
  static ERR_INSTANTIATION =
    "This function defines an interface and should not be called directly.";
  static ERR_RESIZE =
    "Collection buffer size is immutable after initialization.";
  static ERR_CAPACITY = "Collection buffer capacity exceeded.";

  constructor() {}

  /////////////////////////////////////////////////////////////////////////////
  // LIFECYCLE

  /**
   * @param {unknown} collection
   * @param {number} index
   * @param {Feature3D} result
   * @returns {Feature3D}
   */
  static fromCollection(collection, index, result) {
    result._collection = /** @type {Feature3DCollection<Feature3D>} */ (
      collection
    );
    result._index = index;
    result._byteOffset = index * Feature3D.Layout.__BYTE_LENGTH;
    return result;
  }

  /**
   * @returns {boolean}
   * @protected
   */
  _isResizable() {
    return this._index === this._collection._featureCount - 1;
  }

  /////////////////////////////////////////////////////////////////////////////
  // ACCESSORS

  /** @type {number} */
  get featureId() {
    return this._getUint32(Feature3D.Layout.FEATURE_ID_U32);
  }

  /** @type {boolean} */
  get show() {
    return this._getUint8(Feature3D.Layout.SHOW_U8) === 1;
  }

  set show(show) {
    this._setUint8(Feature3D.Layout.SHOW_U8, show ? 1 : 0);
  }

  /** @type {boolean} */
  get _dirty() {
    return this._getUint8(Feature3D.Layout.DIRTY_U8) === 1;
  }

  set _dirty(dirty) {
    this._setUint8(Feature3D.Layout.DIRTY_U8, dirty ? 1 : 0);
  }

  /**
   * @param {Color} result
   * @returns {Color}
   */
  getColor(result) {
    return Color.fromRgba(this._getUint32(Feature3D.Layout.COLOR_U32), result);
  }

  /**
   * @param {Color} color
   */
  setColor(color) {
    this._setUint32(Feature3D.Layout.COLOR_U32, color.toRgba());
  }

  /////////////////////////////////////////////////////////////////////////////
  // DATAVIEW ACCESSORS

  /**
   * @param {number} itemByteOffset
   * @returns {number}
   */
  _getUint8(itemByteOffset) {
    return this._collection._featureView.getUint8(
      this._byteOffset + itemByteOffset,
    );
  }

  /**
   * @param {number} itemByteOffset
   * @param {number} itemValue
   */
  _setUint8(itemByteOffset, itemValue) {
    this._collection._featureView.setUint8(
      this._byteOffset + itemByteOffset,
      itemValue,
    );
  }

  /**
   * @param {number} itemByteOffset
   * @returns {number}
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
   */
  _setUint32(itemByteOffset, itemValue) {
    this._collection._featureView.setUint32(
      this._byteOffset + itemByteOffset,
      itemValue,
      true,
    );
  }

  /**
   * @param {number} itemByteOffset
   * @returns {number}
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
   */
  _setFloat32(itemByteOffset, itemValue) {
    this._collection._featureView.setFloat32(
      this._byteOffset + itemByteOffset,
      itemValue,
      true,
    );
  }
}

export default Feature3D;
