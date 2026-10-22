import WebGLConstants from "./WebGLConstants.js";

/**
 * Winding order defines the order of vertices for a triangle to be considered front-facing.
 *
 * @enum {number}
 */
const WindingOrder = {
  /**
   * Vertices are in clockwise order.
   *
   * @type {number}
   * @constant
   */
  CLOCKWISE: WebGLConstants.CW,

  /**
   * Vertices are in counter-clockwise order.
   *
   * @type {number}
   * @constant
   */
  COUNTER_CLOCKWISE: WebGLConstants.CCW,
};

/**
 * Determine whether a value is a valid winding order.
 *
 * @param {WindingOrder} windingOrder The winding order.
 * @returns {boolean} <code>true</code> if the winding order is valid; otherwise, <code>false</code>.
 *
 * @private
 */
WindingOrder.validate = function (windingOrder) {
  return (
    windingOrder === WindingOrder.CLOCKWISE ||
    windingOrder === WindingOrder.COUNTER_CLOCKWISE
  );
};

Object.freeze(WindingOrder);

export default WindingOrder;
