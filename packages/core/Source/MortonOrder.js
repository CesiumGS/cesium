import Check from "./Check.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";

/**
 * Morton Order (aka Z-Order Curve) helper functions.
 * @see {@link https://en.wikipedia.org/wiki/Z-order_curve}
 *
 * @namespace MortonOrder
 * @private
 */
const MortonOrder = {};

/**
 * Inserts one 0 bit of spacing between a number's bits. This is the opposite of removeOneSpacing.
 *
 * Example:
 *  input: 6
 *  input (binary):  110
 *  output (binary): 10100
 *                    ^ ^ (added)
 *  output: 20
 *
 * @private
 * @param {number} v A 16-bit unsigned integer.
 * @returns {number} A 32-bit unsigned integer.
 * @see {@link https://fgiesen.wordpress.com/2009/12/13/decoding-morton-codes/}
 * @private
 */
function insertOneSpacing(v) {
  v = (v ^ (v << 8)) & 0x00ff00ff;
  v = (v ^ (v << 4)) & 0x0f0f0f0f;
  v = (v ^ (v << 2)) & 0x33333333;
  v = (v ^ (v << 1)) & 0x55555555;
  return v;
}

/**
 * Inserts two 0 bits of spacing between a number's bits. This is the opposite of removeTwoSpacing.
 *
 * Example:
 *  input: 6
 *  input (binary):  110
 *  output (binary): 1001000
 *                    ^^ ^^ (added)
 *  output: 72
 *
 * @private
 * @param {number} v A 10-bit unsigned integer.
 * @returns {number} A 30-bit unsigned integer.
 * @see {@link https://fgiesen.wordpress.com/2009/12/13/decoding-morton-codes/}
 */
function insertTwoSpacing(v) {
  v = (v ^ (v << 16)) & 0x030000ff;
  v = (v ^ (v << 8)) & 0x0300f00f;
  v = (v ^ (v << 4)) & 0x030c30c3;
  v = (v ^ (v << 2)) & 0x09249249;
  return v;
}

/**
 * Removes one bit of spacing between bits. This is the opposite of insertOneSpacing.
 *
 * Example:
 *  input: 20
 *  input (binary):  10100
 *                    ^ ^ (removed)
 *  output (binary): 110
 *  output: 6
 *
 * @private
 * @param {number} v A 32-bit unsigned integer.
 * @returns {number} A 16-bit unsigned integer.
 * @see {@link https://fgiesen.wordpress.com/2009/12/13/decoding-morton-codes/}
 */
function removeOneSpacing(v) {
  v &= 0x55555555;
  v = (v ^ (v >> 1)) & 0x33333333;
  v = (v ^ (v >> 2)) & 0x0f0f0f0f;
  v = (v ^ (v >> 4)) & 0x00ff00ff;
  v = (v ^ (v >> 8)) & 0x0000ffff;
  return v;
}

/**
 * Removes two bits of spacing between bits. This is the opposite of insertTwoSpacing.
 *
 * Example:
 *  input: 72
 *  input (binary):  1001000
 *                    ^^ ^^ (removed)
 *  output (binary): 110
 *  output: 6
 *
 * @private
 * @param {number} v A 30-bit unsigned integer.
 * @returns {number} A 10-bit unsigned integer.
 * @see {@link https://fgiesen.wordpress.com/2009/12/13/decoding-morton-codes/}
 */
function removeTwoSpacing(v) {
  v &= 0x09249249;
  v = (v ^ (v >> 2)) & 0x030c30c3;
  v = (v ^ (v >> 4)) & 0x0300f00f;
  v = (v ^ (v >> 8)) & 0xff0000ff;
  v = (v ^ (v >> 16)) & 0x000003ff;
  return v;
}

/**
 * Computes the Morton index from 2D coordinates. This is equivalent to interleaving their bits.
 * The inputs must be 16-bit unsigned integers (resulting in 32-bit Morton index) due to 32-bit bitwise operator limitation in JavaScript.
 *
 * @param {number} x The X coordinate in the range [0, (2^16)-1].
 * @param {number} y The Y coordinate in the range [0, (2^16)-1].
 * @returns {number} The Morton index.
 * @private
 */
MortonOrder.encode2D = function (x, y) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("x", x);
  Check.typeOf.number("y", y);
  if (x < 0 || x > 65535 || y < 0 || y > 65535) {
    throw new DeveloperError("inputs must be 16-bit unsigned integers");
  }
  //>>includeEnd('debug');

  // Note: JavaScript bitwise operations return signed 32-bit integers, so the
  // final result needs to be reintepreted as an unsigned integer using >>> 0.
  // This is not needed for encode3D because the result is guaranteed to be at most
  // 30 bits and thus will always be interpreted as an unsigned value.
  return (insertOneSpacing(x) | (insertOneSpacing(y) << 1)) >>> 0;
};

/**
 * Computes the 2D coordinates from a Morton index. This is equivalent to deinterleaving their bits.
 * The input must be a 32-bit unsigned integer (resulting in 16 bits per coordinate) due to 32-bit bitwise operator limitation in JavaScript.
 *
 * @param {number} mortonIndex The Morton index in the range [0, (2^32)-1].
 * @param {number[]} [result] The array onto which to store the result.
 * @returns {number[]} An array containing the 2D coordinates correspoding to the Morton index.
 * @private
 */
MortonOrder.decode2D = function (mortonIndex, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("mortonIndex", mortonIndex);
  if (mortonIndex < 0 || mortonIndex > 4294967295) {
    throw new DeveloperError("input must be a 32-bit unsigned integer");
  }
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new Array(2);
  }

  result[0] = removeOneSpacing(mortonIndex);
  result[1] = removeOneSpacing(mortonIndex >> 1);
  return result;
};

/**
 * Computes the Morton index from 3D coordinates. This is equivalent to interleaving their bits.
 * The inputs must be 10-bit unsigned integers (resulting in 30-bit Morton index) due to 32-bit bitwise operator limitation in JavaScript.
 *
 * @param {number} x The X coordinate in the range [0, (2^10)-1].
 * @param {number} y The Y coordinate in the range [0, (2^10)-1].
 * @param {number} z The Z coordinate in the range [0, (2^10)-1].
 * @returns {number} The Morton index.
 * @private
 */
MortonOrder.encode3D = function (x, y, z) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("x", x);
  Check.typeOf.number("y", y);
  Check.typeOf.number("z", z);
  if (x < 0 || x > 1023 || y < 0 || y > 1023 || z < 0 || z > 1023) {
    throw new DeveloperError("inputs must be 10-bit unsigned integers");
  }
  //>>includeEnd('debug');

  return (
    insertTwoSpacing(x) |
    (insertTwoSpacing(y) << 1) |
    (insertTwoSpacing(z) << 2)
  );
};

/**
 * Computes the 3D coordinates from a Morton index. This is equivalent to deinterleaving their bits.
 * The input must be a 30-bit unsigned integer (resulting in 10 bits per coordinate) due to 32-bit bitwise operator limitation in JavaScript.
 *
 * @param {number} mortonIndex The Morton index in the range [0, (2^30)-1].
 * @param {number[]} [result] The array onto which to store the result.
 * @returns {number[]} An array containing the 3D coordinates corresponding to the Morton index.
 * @private
 */
MortonOrder.decode3D = function (mortonIndex, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("mortonIndex", mortonIndex);
  if (mortonIndex < 0 || mortonIndex > 1073741823) {
    throw new DeveloperError("input must be a 30-bit unsigned integer");
  }
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new Array(3);
  }

  result[0] = removeTwoSpacing(mortonIndex);
  result[1] = removeTwoSpacing(mortonIndex >> 1);
  result[2] = removeTwoSpacing(mortonIndex >> 2);
  return result;
};

export default MortonOrder;
