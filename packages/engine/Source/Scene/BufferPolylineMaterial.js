// @ts-check

import Frozen from "../Core/Frozen.js";
import BufferPrimitiveMaterial from "./BufferPrimitiveMaterial.js";

/** @import Color from "../Core/Color.js"; */
/** @import BufferPolyline from "./BufferPolyline.js"; */

/**
 * @typedef {object} BufferPolylineMaterialOptions
 * @property {Color} [color=Color.WHITE] Color of fill.
 * @property {Color} [outlineColor=Color.WHITE] Color of outline.
 * @property {number} [outlineWidth=0.0] Width of outline, 0-255px.
 * @property {number} [width=1.0] Width of line, 0-255px.
 */

/**
 * Material description for a {@link BufferPolyline}.
 *
 * <p>BufferPolylineMaterial objects are {@link Packable|packable}, stored
 * when calling {@link BufferPolyline#setMaterial}. Subsequent changes to the
 * material will not affect the polyline until setMaterial() is called again.</p>
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 * @extends BufferPrimitiveMaterial
 */
class BufferPolylineMaterial extends BufferPrimitiveMaterial {
  /** @ignore */
  static Layout = {
    ...BufferPrimitiveMaterial.Layout,
    WIDTH_U8: BufferPrimitiveMaterial.Layout.__BYTE_LENGTH,
    __BYTE_LENGTH: BufferPrimitiveMaterial.Layout.__BYTE_LENGTH + 4,
  };

  /**
   * @type {BufferPolylineMaterial}
   * @ignore
   */
  static DEFAULT_MATERIAL = Object.freeze(new BufferPolylineMaterial());

  /**
   * @param {BufferPolylineMaterialOptions} [options]
   */
  constructor(options = Frozen.EMPTY_OBJECT) {
    super(options);

    /**
     * Width of polyline, 0–255px.
     * @type {number}
     */
    this.width = options.width ?? 1;
  }

  /**
   * @param {BufferPolylineMaterial} material
   * @param {DataView} view
   * @param {number} byteOffset
   * @override
   */
  static pack(material, view, byteOffset) {
    super.pack(material, view, byteOffset);
    view.setUint8(this.Layout.WIDTH_U8 + byteOffset, material.width);
  }

  /**
   * @param {DataView} view
   * @param {number} byteOffset
   * @param {BufferPolylineMaterial} result
   * @returns {BufferPolylineMaterial}
   * @override
   */
  static unpack(view, byteOffset, result) {
    super.unpack(view, byteOffset, result);
    result.width = view.getUint8(this.Layout.WIDTH_U8 + byteOffset);
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
    return { ...super.toJSON(), width: this.width };
  }
}

export default BufferPolylineMaterial;
