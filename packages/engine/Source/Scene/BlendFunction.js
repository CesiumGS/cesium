import WebGLConstants from "../Core/WebGLConstants.js";

/**
 * Determines how blending factors are computed.
 *
 * @enum {number}
 */
const BlendFunction = {
  /**
   * The blend factor is zero.
   *
   * @type {number}
   * @constant
   */
  ZERO: WebGLConstants.ZERO,

  /**
   * The blend factor is one.
   *
   * @type {number}
   * @constant
   */
  ONE: WebGLConstants.ONE,

  /**
   * The blend factor is the source color.
   *
   * @type {number}
   * @constant
   */
  SOURCE_COLOR: WebGLConstants.SRC_COLOR,

  /**
   * The blend factor is one minus the source color.
   *
   * @type {number}
   * @constant
   */
  ONE_MINUS_SOURCE_COLOR: WebGLConstants.ONE_MINUS_SRC_COLOR,

  /**
   * The blend factor is the destination color.
   *
   * @type {number}
   * @constant
   */
  DESTINATION_COLOR: WebGLConstants.DST_COLOR,

  /**
   * The blend factor is one minus the destination color.
   *
   * @type {number}
   * @constant
   */
  ONE_MINUS_DESTINATION_COLOR: WebGLConstants.ONE_MINUS_DST_COLOR,

  /**
   * The blend factor is the source alpha.
   *
   * @type {number}
   * @constant
   */
  SOURCE_ALPHA: WebGLConstants.SRC_ALPHA,

  /**
   * The blend factor is one minus the source alpha.
   *
   * @type {number}
   * @constant
   */
  ONE_MINUS_SOURCE_ALPHA: WebGLConstants.ONE_MINUS_SRC_ALPHA,

  /**
   * The blend factor is the destination alpha.
   *
   * @type {number}
   * @constant
   */
  DESTINATION_ALPHA: WebGLConstants.DST_ALPHA,

  /**
   * The blend factor is one minus the destination alpha.
   *
   * @type {number}
   * @constant
   */
  ONE_MINUS_DESTINATION_ALPHA: WebGLConstants.ONE_MINUS_DST_ALPHA,

  /**
   * The blend factor is the constant color.
   *
   * @type {number}
   * @constant
   */
  CONSTANT_COLOR: WebGLConstants.CONSTANT_COLOR,

  /**
   * The blend factor is one minus the constant color.
   *
   * @type {number}
   * @constant
   */
  ONE_MINUS_CONSTANT_COLOR: WebGLConstants.ONE_MINUS_CONSTANT_COLOR,

  /**
   * The blend factor is the constant alpha.
   *
   * @type {number}
   * @constant
   */
  CONSTANT_ALPHA: WebGLConstants.CONSTANT_ALPHA,

  /**
   * The blend factor is one minus the constant alpha.
   *
   * @type {number}
   * @constant
   */
  ONE_MINUS_CONSTANT_ALPHA: WebGLConstants.ONE_MINUS_CONSTANT_ALPHA,

  /**
   * The blend factor is the saturated source alpha.
   *
   * @type {number}
   * @constant
   */
  SOURCE_ALPHA_SATURATE: WebGLConstants.SRC_ALPHA_SATURATE,
};
export default Object.freeze(BlendFunction);
