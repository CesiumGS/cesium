// @ts-check

import Frozen from "../Core/Frozen.js";
import BufferPrimitiveMaterial from "./BufferPrimitiveMaterial.js";

/** @import Color from "../Core/Color.js"; */
/** @import BufferPoint from "./BufferPoint.js"; */

/**
 * @typedef {object} BufferPointMaterialOptions
 * @property {Color} [color=Color.WHITE] Color of fill.
 * @property {Color} [outlineColor=Color.WHITE] Color of outline.
 * @property {number} [outlineWidth=0.0] Width of outline, 0-255px.
 * @property {number} [size=1.0] Size of point, 0-255px.
 */

/**
 * Material description for a {@link BufferPoint}.
 *
 * <p>BufferPointMaterial objects are {@link Packable|packable}, stored
 * when calling {@link BufferPoint#setMaterial}. Subsequent changes to the
 * material will not affect the point until setMaterial() is called again.</p>
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 * @extends BufferPrimitiveMaterial
 */
class BufferPointMaterial extends BufferPrimitiveMaterial {
  /** @ignore */
  static Layout = {
    ...BufferPrimitiveMaterial.Layout,
    SIZE_U8: BufferPrimitiveMaterial.Layout.__BYTE_LENGTH,
    __BYTE_LENGTH: BufferPrimitiveMaterial.Layout.__BYTE_LENGTH + 4,
  };

  /**
   * @type {BufferPointMaterial}
   * @ignore
   */
  static DEFAULT_MATERIAL = Object.freeze(new BufferPointMaterial());

  /**
   * @param {BufferPointMaterialOptions} [options]
   */
  constructor(options = Frozen.EMPTY_OBJECT) {
    super(options);

    /**
     * Size of point, 0-255px.
     * @type {number}
     */
    this.size = options.size ?? 1;
  }

  /**
   * @override
   * @param {BufferPointMaterial} material
   * @param {DataView} view
   * @param {number} byteOffset
   * @override
   */
  static pack(material, view, byteOffset) {
    super.pack(material, view, byteOffset);
    view.setUint8(this.Layout.SIZE_U8 + byteOffset, material.size);
  }

  /**
   * @override
   * @param {DataView} view
   * @param {number} byteOffset
   * @param {BufferPointMaterial} result
   * @returns {BufferPointMaterial}
   * @override
   */
  static unpack(view, byteOffset, result) {
    super.unpack(view, byteOffset, result);
    result.size = view.getUint8(this.Layout.SIZE_U8 + byteOffset);
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
    return { ...super.toJSON(), size: this.size };
  }
}

export default BufferPointMaterial;
