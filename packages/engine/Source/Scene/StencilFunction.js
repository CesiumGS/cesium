import WebGLConstants from "../Core/WebGLConstants.js";

/**
 * Determines the function used to compare stencil values for the stencil test.
 *
 * @enum {number}
 */
const StencilFunction = {
  /**
   * The stencil test never passes.
   *
   * @type {number}
   * @constant
   */
  NEVER: WebGLConstants.NEVER,

  /**
   * The stencil test passes when the masked reference value is less than the masked stencil value.
   *
   * @type {number}
   * @constant
   */
  LESS: WebGLConstants.LESS,

  /**
   * The stencil test passes when the masked reference value is equal to the masked stencil value.
   *
   * @type {number}
   * @constant
   */
  EQUAL: WebGLConstants.EQUAL,

  /**
   * The stencil test passes when the masked reference value is less than or equal to the masked stencil value.
   *
   * @type {number}
   * @constant
   */
  LESS_OR_EQUAL: WebGLConstants.LEQUAL,

  /**
   * The stencil test passes when the masked reference value is greater than the masked stencil value.
   *
   * @type {number}
   * @constant
   */
  GREATER: WebGLConstants.GREATER,

  /**
   * The stencil test passes when the masked reference value is not equal to the masked stencil value.
   *
   * @type {number}
   * @constant
   */
  NOT_EQUAL: WebGLConstants.NOTEQUAL,

  /**
   * The stencil test passes when the masked reference value is greater than or equal to the masked stencil value.
   *
   * @type {number}
   * @constant
   */
  GREATER_OR_EQUAL: WebGLConstants.GEQUAL,

  /**
   * The stencil test always passes.
   *
   * @type {number}
   * @constant
   */
  ALWAYS: WebGLConstants.ALWAYS,
};
export default Object.freeze(StencilFunction);
