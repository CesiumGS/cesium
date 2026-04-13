// @ts-check

import Frozen from "../Core/Frozen.js";
import BufferPrimitiveMaterial from "./BufferPrimitiveMaterial.js";

/** @import Color from "../Core/Color.js"; */
/** @import BufferPolygon from "./BufferPolygon.js"; */

/**
 * @typedef {object} BufferPolygonMaterialOptions
 * @property {Color} [color=Color.WHITE] Color of fill.
 * @property {Color} [outlineColor=Color.WHITE] Color of outline.
 * @property {number} [outlineWidth=0.0] Width of outline, 0-255px.
 */

/**
 * Material description for a {@link BufferPolygon}.
 *
 * <p>BufferPolygonMaterial objects are {@link Packable|packable}, stored
 * when calling {@link BufferPolygon#setMaterial}. Subsequent changes to the
 * material will not affect the polygon until setMaterial() is called again.</p>
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 * @extends BufferPrimitiveMaterial
 */
class BufferPolygonMaterial extends BufferPrimitiveMaterial {
  /**
   * @type {BufferPolygonMaterial}
   * @ignore
   */
  static DEFAULT_MATERIAL = Object.freeze(new BufferPolygonMaterial());

  /**
   * @param {BufferPolygonMaterialOptions} [options]
   */
  constructor(options = Frozen.EMPTY_OBJECT) {
    super(options);
  }
}

export default BufferPolygonMaterial;
