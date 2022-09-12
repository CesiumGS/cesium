import Check from "./Check.js";
import DeveloperError from "./DeveloperError.js";

/**
 * Hilbert Order helper functions.
 *
 * @namespace HilbertOrder
 */
const HilbertOrder = {};

/**
 * Computes the Hilbert index at the given level from 2D coordinates.
 *
 * @param {Number} level The level of the curve
 * @param {Number} x The X coordinate
 * @param {Number} y The Y coordinate
 * @returns {Number} The Hilbert index.
 * @private
 */
HilbertOrder.encode2D = function (level, x, y) {
  const n = Math.pow(2, level);
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("level", level);
  Check.typeOf.number("x", x);
  Check.typeOf.number("y", y);
  if (level < 1) {
    throw new DeveloperError("Hilbert level cannot be less than 1.");
  }
  if (x < 0 || x >= n || y < 0 || y >= n) {
    throw new DeveloperError("Invalid coordinates for given level.");
  }
  //>>includeEnd('debug');

  const p = {
    x: x,
    y: y,
  };
  let rx,
    ry,
    s,
    // eslint-disable-next-line no-undef
    index = BigInt(0);

  for (s = n / 2; s > 0; s /= 2) {
    rx = (p.x & s) > 0 ? 1 : 0;
    ry = (p.y & s) > 0 ? 1 : 0;
    // eslint-disable-next-line no-undef
    index += BigInt(((3 * rx) ^ ry) * s * s);
    rotate(n, p, rx, ry);
  }

  return index;
};

/**
 * Computes the 2D coordinates from the Hilbert index at the given level.
 *
 * @param {Number} level The level of the curve
 * @param {BigInt} index The Hilbert index
 * @returns {Number[]} An array containing the 2D coordinates ([x, y]) corresponding to the Morton index.
 * @private
 */
HilbertOrder.decode2D = function (level, index) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("level", level);
  Check.typeOf.bigint("index", index);
  if (level < 1) {
    throw new DeveloperError("Hilbert level cannot be less than 1.");
  }
  // eslint-disable-next-line no-undef
  if (index < BigInt(0) || index >= BigInt(Math.pow(4, level))) {
    throw new DeveloperError(
      "Hilbert index exceeds valid maximum for given level."
    );
  }
  //>>includeEnd('debug');

  const n = Math.pow(2, level);
  const p = {
    x: 0,
    y: 0,
  };
  let rx, ry, s, t;

  for (s = 1, t = index; s < n; s *= 2) {
    // eslint-disable-next-line no-undef
    rx = 1 & Number(t / BigInt(2));
    // eslint-disable-next-line no-undef
    ry = 1 & Number(t ^ BigInt(rx));
    rotate(s, p, rx, ry);
    p.x += s * rx;
    p.y += s * ry;
    // eslint-disable-next-line no-undef
    t /= BigInt(4);
  }

  return [p.x, p.y];
};

/**
 * @private
 */
function rotate(n, p, rx, ry) {
  if (ry !== 0) {
    return;
  }

  if (rx === 1) {
    p.x = n - 1 - p.x;
    p.y = n - 1 - p.y;
  }

  const t = p.x;
  p.x = p.y;
  p.y = t;
}

export default HilbertOrder;
