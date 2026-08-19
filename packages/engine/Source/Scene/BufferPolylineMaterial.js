// @ts-check

import defined from "../Core/defined.js";
import Frozen from "../Core/Frozen.js";
import BufferPrimitiveMaterial from "./BufferPrimitiveMaterial.js";

/** @import Color from "../Core/Color.js"; */
/** @import BufferPolyline from "./BufferPolyline.js"; */

const WIDTH_UNITS_DEFAULT = 0;
const WIDTH_UNITS_PIXELS = 1;
const WIDTH_UNITS_METERS = 2;

/**
 * @typedef {object} BufferPolylineMaterialOptions
 * @property {Color} [color=Color.WHITE] Color of fill.
 * @property {Color} [outlineColor=Color.WHITE] Color of outline.
 * @property {number} [outlineWidth=0.0] Width of outline, 0-255px.
 * @property {number} [width=1.0] Width of line.
 * @property {boolean} [widthInMeters] Whether <code>width</code> is in meters on the ground rather
 *   than in screen pixels. Defaults to {@link VectorProvider#widthInMeters}.
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
    WIDTH_F32: BufferPrimitiveMaterial.Layout.__BYTE_LENGTH,
    WIDTH_UNITS_U8: BufferPrimitiveMaterial.Layout.__BYTE_LENGTH + 4,
    __BYTE_LENGTH: BufferPrimitiveMaterial.Layout.__BYTE_LENGTH + 8,
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
     * Width of polyline, in the unit selected by {@link BufferPolylineMaterial#widthInMeters}.
     * @type {number}
     */
    this.width = options.width ?? 1;

    /**
     * Whether {@link BufferPolylineMaterial#width} is in meters on the ground rather than in
     * screen pixels. When <code>undefined</code>, the scene-wide default,
     * {@link VectorProvider#widthInMeters}, applies.
     *
     * @type {boolean|undefined}
     */
    this.widthInMeters = options.widthInMeters;
  }

  /**
   * @param {BufferPolylineMaterial} material
   * @param {DataView} view
   * @param {number} byteOffset
   * @override
   */
  static pack(material, view, byteOffset) {
    super.pack(material, view, byteOffset);
    view.setFloat32(this.Layout.WIDTH_F32 + byteOffset, material.width, true);
    view.setUint8(
      this.Layout.WIDTH_UNITS_U8 + byteOffset,
      packWidthUnits(material.widthInMeters),
    );
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
    result.width = view.getFloat32(this.Layout.WIDTH_F32 + byteOffset, true);
    result.widthInMeters = unpackWidthUnits(
      view.getUint8(this.Layout.WIDTH_UNITS_U8 + byteOffset),
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
      ...super.toJSON(),
      width: this.width,
      widthInMeters: this.widthInMeters,
    };
  }
}

/**
 * @param {boolean|undefined} widthInMeters
 * @returns {number}
 * @private
 */
function packWidthUnits(widthInMeters) {
  if (!defined(widthInMeters)) {
    return WIDTH_UNITS_DEFAULT;
  }
  return widthInMeters ? WIDTH_UNITS_METERS : WIDTH_UNITS_PIXELS;
}

/**
 * @param {number} widthUnits
 * @returns {boolean|undefined}
 * @private
 */
function unpackWidthUnits(widthUnits) {
  if (widthUnits === WIDTH_UNITS_DEFAULT) {
    return undefined;
  }
  return widthUnits === WIDTH_UNITS_METERS;
}

export default BufferPolylineMaterial;
