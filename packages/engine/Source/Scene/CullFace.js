import WebGLConstants from "../Core/WebGLConstants.js";

/**
 * Determines which triangles, if any, are culled.
 *
 * @enum {number}
 */
const CullFace = {
  /**
   * Front-facing triangles are culled.
   *
   * @type {number}
   * @constant
   */
  FRONT: WebGLConstants.FRONT,

  /**
   * Back-facing triangles are culled.
   *
   * @type {number}
   * @constant
   */
  BACK: WebGLConstants.BACK,

  /**
   * Both front-facing and back-facing triangles are culled.
   *
   * @type {number}
   * @constant
   */
  FRONT_AND_BACK: WebGLConstants.FRONT_AND_BACK,
};
export default Object.freeze(CullFace);
