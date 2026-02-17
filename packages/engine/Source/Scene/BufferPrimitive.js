// @ts-check

import Color from "../Core/Color.js";

/** @import BufferPrimitiveCollection from './BufferPrimitiveCollection.js'; */

const scratchColor = new Color();

/**
 * View bound to the underlying buffer data of a {@link BufferPrimitiveCollection}. Abstract.
 *
 * <p>BufferPrimitive instances are intended to be reused when iterating over large collections,
 * and temporarily bound to a primitive index while performing read/write operations on that primitive,
 * before being rebound to the next primitive, using the
 * {@link https://en.wikipedia.org/wiki/Flyweight_pattern|flyweight pattern}.</p>
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
 * @see BufferPrimitiveCollection
 * @see BufferPoint
 * @see BufferPolyline
 * @see BufferPolygon
 *
 * @abstract
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class BufferPrimitive {
  /**
   * Collecton containing the primitive(s) for which this instance currently
   * provides a view.
   *
   * @type {BufferPrimitiveCollection<BufferPrimitive>}
   * @ignore
   */
  _collection = null;

  /**
   * Index of the primitive for which this instance currently provides a view.
   *
   * @type {number}
   * @ignore
   */
  _index = -1;

  /**
   * Byte offset, into the collection's primitive buffer, of the primitive for
   * which this instance currently provides a view.
   *
   * @type {number}
   * @ignore
   */
  _byteOffset = -1;

  /**
   * Binary layout for this primitive type in collection's primitive buffer.
   * Each `Layout.MY_KEY_U32` entry is an offset in bytes, relative to the
   * start offset of the primitive, with the suffix indicating the data type
   * stored at that offset.
   *
   * The final entry, `__BYTE_LENGTH`, is not a pointer into a buffer — its
   * literal value is the total byte length of one primitive in the primitive
   * buffer, exclusive of other buffers.
   *
   * @ignore
   */
  static Layout = {
    /**
     * Feature ID associated with the primitive; not required to be unique.
     * @type {number}
     */
    FEATURE_ID_U32: 0,

    /**
     * Boolean (0 or 1) flag indicating whether primitive is shown.
     * @type {number}
     */
    SHOW_U8: 4,

    /**
     * Boolean (0 or 1) flag indicating whether primitive is dirty.
     * @type {number}
     */
    DIRTY_U8: 5,

    /**
     * Color of primitive, as integer RGBA.
     * @type {number}
     */
    COLOR_U32: 8,

    /**
     * Byte length of one primitive in the primitive buffer, exclusive of
     * other buffers. Literal value, not a pointer.
     * @type {number}
     */
    __BYTE_LENGTH: 12,
  };

  /////////////////////////////////////////////////////////////////////////////
  // LIFECYCLE

  /**
   * Copies data from source primitive to result. If the result primitive is not
   * new (the last primitive in the collection) then source and result primitives
   * must have the same vertex counts.
   *
   * @param {BufferPrimitive} primitive
   * @param {BufferPrimitive} result
   * @returns {BufferPrimitive}
   */
  static clone(primitive, result) {
    result.featureId = primitive.featureId;
    result.show = primitive.show;
    result.setColor(primitive.getColor(scratchColor));
    return result;
  }

  /**
   * Returns true if this primitive's memory footprint is resizable. Only the
   * newest (most recently created) primitive in a collection can be resized,
   * to guarantee fast and stable performance.
   *
   * @returns {boolean}
   * @protected
   * @ignore
   */
  _isResizable() {
    return this._index === this._collection.primitiveCount - 1;
  }

  /////////////////////////////////////////////////////////////////////////////
  // ACCESSORS

  /**
   * Feature ID associated with the primitive; not required to be unique.
   * @type {number}
   */
  get featureId() {
    return this._getUint32(BufferPrimitive.Layout.FEATURE_ID_U32);
  }

  set featureId(featureId) {
    this._setUint32(BufferPrimitive.Layout.FEATURE_ID_U32, featureId);
  }

  /**
   * Whether primitive is shown.
   * @type {boolean}
   */
  get show() {
    return this._getUint8(BufferPrimitive.Layout.SHOW_U8) === 1;
  }

  set show(show) {
    this._setUint8(BufferPrimitive.Layout.SHOW_U8, show ? 1 : 0);
  }

  /**
   * Whether the primitive requires an update on next render. Renderers should
   * _not_ iterate over all primitives each frame, but must instead inspect
   * only the dirty range of the parent collection. This flag is managed
   * automatically, by primitive setters and collection renderers.
   *
   * @type {boolean}
   * @ignore
   *
   * @see BufferPrimitiveCollection#_dirtyOffset
   * @see BufferPrimitiveCollection#_dirtyCount
   */
  get _dirty() {
    return this._getUint8(BufferPrimitive.Layout.DIRTY_U8) === 1;
  }

  set _dirty(dirty) {
    // Avoid `._setUint8()` here, which would infinitely loop `._dirty = true`.
    this._collection._primitiveView.setUint8(
      this._byteOffset + BufferPrimitive.Layout.DIRTY_U8,
      dirty ? 1 : 0,
    );

    // A 'dirty' primitive is responsible for notifying the collection. Applying
    // updates and marking the primitive 'clean' will be handled by the collection,
    // so we don't notify the collection here in that case.
    if (dirty) {
      this._collection._makeDirty(this._index);
    }
  }

  /**
   * Returns the color of primitive.
   * @param {Color} result
   * @returns {Color}
   */
  getColor(result) {
    return Color.fromRgba(
      this._getUint32(BufferPrimitive.Layout.COLOR_U32),
      result,
    );
  }

  /**
   * Updates the color of primitive.
   * @param {Color} color
   */
  setColor(color) {
    this._setUint32(BufferPrimitive.Layout.COLOR_U32, color.toRgba());
  }

  /////////////////////////////////////////////////////////////////////////////
  // BUFFER ACCESSORS

  /**
   * @param {number} itemByteOffset
   * @returns {number}
   * @ignore
   */
  _getUint8(itemByteOffset) {
    return this._collection._primitiveView.getUint8(
      this._byteOffset + itemByteOffset,
    );
  }

  /**
   * @param {number} itemByteOffset
   * @param {number} itemValue
   * @ignore
   */
  _setUint8(itemByteOffset, itemValue) {
    this._collection._primitiveView.setUint8(
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
    return this._collection._primitiveView.getUint32(
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
    this._collection._primitiveView.setUint32(
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
    return this._collection._primitiveView.getFloat32(
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
    this._collection._primitiveView.setFloat32(
      this._byteOffset + itemByteOffset,
      itemValue,
      true,
    );
    this._dirty = true;
  }

  /////////////////////////////////////////////////////////////////////////////
  // DEBUG

  /**
   * Returns a JSON-serializable object representing the primitive. This encoding
   * is not memory-efficient, and should generally be used for debugging and
   * testing — not for production applications.
   *
   * @returns {Object} JSON-serializable object.
   */
  toJSON() {
    return {
      featureId: this.featureId,
      show: this.show,
      color: this.getColor(scratchColor).toCssHexString(),
      dirty: this._dirty,
    };
  }
}

export default BufferPrimitive;
