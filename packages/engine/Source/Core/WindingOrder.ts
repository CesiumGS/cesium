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
 * @private
 */
WindingOrder.validate = function (windingOrder) {
  return (
    windingOrder === WindingOrder.CLOCKWISE ||
    windingOrder === WindingOrder.COUNTER_CLOCKWISE
  );
};

export default Object.freeze(WindingOrder);
