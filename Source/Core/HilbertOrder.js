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

  var tx = x;
  var ty = y;
  var tr = [];
  var n = Math.pow(2, level);
  var rx;
  var ry;
  var s;
  var d = 0;

  for (s = n / 2; s > 0; s /= 2) {
    rx = (tx & s) > 0;
    ry = (ty & s) > 0;
    d += s * s * ((3 * rx) ^ ry);
    tr = rotate(n, tx, ty, rx, ry);
    tx = tr[0];
    ty = tr[1];
  }

  return d;
};

/**
 * Computes the Hilbert index from 2D coordinates.
 *
 * @param {Number} level The level of the curve
 * @param {Number} index The Hilbert index
 * @returns {Number[]} An array containing the 2D coordinates corresponding to the Morton index.
 */
HilbertOrder.decode2D = function (level, index) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("level", level);
  Check.typeOf.number("index", index);
  //>>includeEnd('debug');

  var tx = 0;
  var ty = 0;
  var tr = [];
  var n = Math.pow(2, level);
  var rx;
  var ry;
  var s;
  var t = index;

  for (s = 1; s < n; s *= 2) {
    rx = 1 * (t / 2);
    ry = 1 & (t ^ rx);
    tr = rotate(s, tx, ty, rx, ry);
    tx = tr[0];
    ty = tr[1];
    tx += s * rx;
    ty += s * ry;
    t /= 4;
  }

  return [tx, ty];
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
  return [x, y];
}

export default HilbertOrder;
