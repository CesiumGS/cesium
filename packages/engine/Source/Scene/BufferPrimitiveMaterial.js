// @ts-check

import Color from "../Core/Color.js";
import Frozen from "../Core/Frozen.js";

/** @import Packable from "../Core/Packable.js"; */
/** @import BufferPrimitive from "./BufferPrimitive.js"; */

/**
 * @typedef {object} BufferPrimitiveMaterialOptions
 * @property {Color} [color=Color.WHITE] Color of fill.
 * @property {Color} [outlineColor=Color.WHITE] Color of outline.
 * @property {number} [outlineWidth=0.0] Width of outline, 0-255px.
 */

/**
 * Material description for a {@link BufferPrimitive}. Abstract.
 *
 * <p>BufferPrimitiveMaterial objects are {@link Packable|packable}, stored
 * when calling {@link BufferPrimitive#setMaterial}. Subsequent changes to the
 * material will not affect the primitive until setMaterial() is called again.</p>
 *
 * @see BufferPointMaterial
 * @see BufferPolylineMaterial
 * @see BufferPolygonMaterial
 * @see Packable
 *
 * @abstract
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class BufferPrimitiveMaterial {
  /** @ignore */
  static Layout = {
    COLOR_U32: 0,
    OUTLINE_COLOR_U32: 4,
    OUTLINE_WIDTH_U8: 8,
    __BYTE_LENGTH: 12,
  };

  /**
   * @type {BufferPrimitiveMaterial}
   * @ignore
   */
  static DEFAULT_MATERIAL;

  /**
   * @param {BufferPrimitiveMaterialOptions} [options]
   */
  constructor(options = Frozen.EMPTY_OBJECT) {
    /**
     * Color of fill.
     * @type {Color}
     */
    this.color = Color.clone(options.color ?? Color.WHITE);

    /**
     * Color of outline.
     * @type {Color}
     */
    this.outlineColor = Color.clone(options.outlineColor ?? Color.WHITE);

    /**
     * Width of outline, 0-255px.
     * @type {number}
     */
    this.outlineWidth = options.outlineWidth ?? 0;
  }

  /** @type {number} */
  static get packedLength() {
    return this.Layout.__BYTE_LENGTH;
  }

  /**
   * Stores the provided material into the provided array.
   *
   * @param {BufferPrimitiveMaterial} material
   * @param {DataView} view
   * @param {number} byteOffset
   */
  static pack(material, view, byteOffset) {
    view.setUint32(
      this.Layout.COLOR_U32 + byteOffset,
      material.color.toRgba(),
      true,
    );
    view.setUint32(
      this.Layout.OUTLINE_COLOR_U32 + byteOffset,
      material.outlineColor.toRgba(),
      true,
    );
    view.setUint8(
      this.Layout.OUTLINE_WIDTH_U8 + byteOffset,
      material.outlineWidth,
    );
  }

  /**
   * Retrieves a material from a packed array.
   *
   * @param {DataView} view The packed array.
   * @param {number} byteOffset Starting index of the element to be unpacked.
   * @param {BufferPrimitiveMaterial} result Material into which results are unpacked.
   * @returns {BufferPrimitiveMaterial} Modified result material, with results unpacked.
   */
  static unpack(view, byteOffset, result) {
    Color.fromRgba(
      view.getUint32(this.Layout.COLOR_U32 + byteOffset, true),
      result.color,
    );
    Color.fromRgba(
      view.getUint32(this.Layout.OUTLINE_COLOR_U32 + byteOffset, true),
      result.outlineColor,
    );
    result.outlineWidth = view.getUint8(
      this.Layout.OUTLINE_WIDTH_U8 + byteOffset,
    );
    return result;
  }

  /////////////////////////////////////////////////////////////////////////////
  // DEBUG

  /**
   * Returns a JSON-serializable object representing the material. This encoding
   * is not memory-efficient, and should generally be used for debugging and
   * testing.
   *
   * @returns {Object} JSON-serializable object.
   */
  toJSON() {
    return {
      color: this.color.toCssHexString(),
      outlineColor: this.outlineColor.toCssHexString(),
      outlineWidth: this.outlineWidth,
    };
  }
}

export default BufferPrimitiveMaterial;
