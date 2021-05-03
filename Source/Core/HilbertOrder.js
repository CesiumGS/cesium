import Check from "./Check.js";

/**
 * Hilbert Order helper functions.
 * @see {@link https://en.wikipedia.org/wiki/Hilbert_curve}
 *
 * @namespace HilbertOrder
 */
var HilbertOrder = {};

/**
 * Computes the Hilbert index from 2D coordinates.
 *
 * @param {Number} level The level of the curve
 * @param {Number} x The X coordinate
 * @param {Number} y The Y coordinate
 * @returns {Number} The Hilbert index.
 */
HilbertOrder.encode2D = function (level, x, y) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("level", level);
  Check.typeOf.number("x", x);
  Check.typeOf.number("y", y);
  //>>includeEnd('debug');

  var n = 2 ** level;
  var rx;
  var ry;
  var s;
  var d;

  for (s = n / 2; s > 0; s /= 2) {
    rx = (x & s) > 0;
    ry = (y & s) > 0;
    d += s * s * ((3 * rx) ^ ry);
    rotate(n, x, y, rx, ry);
  }

  return d;
};

/**
 * @private
 */
function rotate(n, x, y, rx, ry) {
  if (ry === 0) {
    if (rx === 1) {
      x = n - 1 - x;
      y = n - 1 - y;
    }
    var temp = x;
    x = y;
    y = temp;
  }
}

export default HilbertOrder;
