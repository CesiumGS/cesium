import { Math as CesiumMath } from "@cesium/core";

/**
 * Defines different modes for blending between a target color and a primitive's source color.
 *
 * HIGHLIGHT multiplies the source color by the target color
 * REPLACE replaces the source color with the target color
 * MIX blends the source color and target color together
 *
 * @enum {number}
 *
 * @see Model.colorBlendMode
 */
const ColorBlendMode = {
  HIGHLIGHT: 0,
  REPLACE: 1,
  MIX: 2,
};

/**
 * Get the color blend value for a color blend mode, where 0 is a highlight and 1 is a full replacement.
 *
 * @param {ColorBlendMode} colorBlendMode The color blend mode.
 * @param {number} colorBlendAmount The color blend amount, used when the mode is <code>MIX</code>.
 * @returns {number} The color blend value.
 *
 * @private
 */
ColorBlendMode.getColorBlend = function (colorBlendMode, colorBlendAmount) {
  if (colorBlendMode === ColorBlendMode.HIGHLIGHT) {
    return 0.0;
  } else if (colorBlendMode === ColorBlendMode.REPLACE) {
    return 1.0;
  } else if (colorBlendMode === ColorBlendMode.MIX) {
    // The value 0.0 is reserved for highlight, so clamp to just above 0.0.
    return CesiumMath.clamp(colorBlendAmount, CesiumMath.EPSILON4, 1.0);
  }
};

Object.freeze(ColorBlendMode);

export default ColorBlendMode;
