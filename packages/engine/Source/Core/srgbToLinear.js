import Check from "./Check.js";

/**
 * Converts the value from sRGB color space to linear color space.
 *
 * @function
 *
 * @param {number} value The color value in sRGB color space.
 * @returns {number} Returns the color value in linear color space.
 *
 * @example
 * const srgbColor = [0.5, 0.5, 0.5];
 * const linearColor = srgbColor.map(function (c) {
 *     return Cesium.srgbToLinear(c);
 * });
 */
function srgbToLinear(value) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("value", value);
  //>>includeEnd('debug');

  if (value <= 0.04045) {
    // eslint-disable-next-line no-loss-of-precision
    return value * 0.07739938080495356037151702786378;
  }
  return Math.pow(
    // eslint-disable-next-line no-loss-of-precision
    (value + 0.055) * 0.94786729857819905213270142180095,
    2.4
  );
}
export default srgbToLinear;
