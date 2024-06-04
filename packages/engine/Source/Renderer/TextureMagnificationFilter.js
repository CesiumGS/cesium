import WebGLConstants from "../Core/WebGLConstants.js";

/**
 * Enumerates all possible filters used when magnifying WebGL textures.
 *
 * @enum {number}
 *
 * @see TextureMinificationFilter
 */
const TextureMagnificationFilter = {
  /**
   * Samples the texture by returning the closest pixel.
   *
   * @type {number}
   * @constant
   */
  NEAREST: WebGLConstants.NEAREST,
  /**
   * Samples the texture through bi-linear interpolation of the four nearest pixels. This produces smoother results than <code>NEAREST</code> filtering.
   *
   * @type {number}
   * @constant
   */
  LINEAR: WebGLConstants.LINEAR,
};

/**
 * Validates the given <code>textureMinificationFilter</code> with respect to the possible enum values.
 * @param textureMagnificationFilter
 * @returns {boolean} <code>true</code> if <code>textureMagnificationFilter</code> is valid.
 *
 * @private
 */
TextureMagnificationFilter.validate = function (textureMagnificationFilter) {
  return (
    textureMagnificationFilter === TextureMagnificationFilter.NEAREST ||
    textureMagnificationFilter === TextureMagnificationFilter.LINEAR
  );
};

export default Object.freeze(TextureMagnificationFilter);
