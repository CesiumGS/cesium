import Check from "./Check.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";

/**
 * Morton Order (aka Z-Order Curve) helper functions.
 * @see {@link https://en.wikipedia.org/wiki/Z-order_curve}
 * @see {@link http://graphics.stanford.edu/~seander/bithacks.html#InterleaveBMN}
 *
 * @namespace MortonOrder
 */
var MortonOrder = {};

/**
 * @private
 * @param {Number} v
 */
function insertSpacingBetweenBits(v) {
  v = (v | (v << 8)) & 0x00ff00ff;
  v = (v | (v << 4)) & 0x0f0f0f0f;
  v = (v | (v << 2)) & 0x33333333;
  v = (v | (v << 1)) & 0x55555555;
  return v;
}

/**
 * @private
 * @param {Number} v
 */
function removeSpacingBetweenBits(v) {
  v = v & 0x55555555;
  v = (v | (v >> 1)) & 0x33333333;
  v = (v | (v >> 2)) & 0x0f0f0f0f;
  v = (v | (v >> 4)) & 0x00ff00ff;
  v = (v | (v >> 8)) & 0x0000ffff;
  return v;
}

/**
 * Computes the Morton index from 2D coordinates. This is equivalent to interleaving their bits.
 * The maximum allowed input is (2^16)-1 due to 32-bit bitwise operator limitation in Javascript.
 *
 * @param {Number} x The X coordinate in the range [0, (2^16)-1].
 * @param {Number} y The Y coordinate in the range [0, (2^16)-1].
 * @returns {Number} The 1D morton index.
 */
MortonOrder.encode2D = function (x, y) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("x", x);
  Check.typeOf.number("y", y);
  if (x < 0 || x > 65535 || y < 0 || y > 65535) {
    throw new DeveloperError("inputs must be between 0 and (2^16)-1");
  }
  //>>includeEnd('debug');

  return (
    (insertSpacingBetweenBits(x) | (insertSpacingBetweenBits(y) << 1)) >>> 0
  );
};

/**
 * Computes the 2D coordinates from a Morton index. This is equivalent to deinterleaving their bits.
 * The maximum allowed input is (2^32)-1 due to 32-bit bitwise operator limitation in Javascript.
 *
 * @param {Number} mortonIndex The Morton index in the range [0, (2^32)-1].
 * @param {Number[]} [result] The array onto which to store the result.
 * @returns {Number[]} An array containing the 2D coordinates correspoding to the Morton index.
 */
MortonOrder.decode2D = function (mortonIndex, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("mortonIndex", mortonIndex);
  if (mortonIndex < 0 || mortonIndex > 4294967295) {
    throw new DeveloperError("input must be between 0 and (2^32)-1");
  }
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new Array(2);
  }

  result[0] = removeSpacingBetweenBits(mortonIndex);
  result[1] = removeSpacingBetweenBits(mortonIndex >> 1);
  return result;
};
export default MortonOrder;
