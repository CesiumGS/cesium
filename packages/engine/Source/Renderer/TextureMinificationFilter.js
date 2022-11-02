import WebGLConstants from "../Core/WebGLConstants.js";

/**
 * Enumerates all possible filters used when minifying WebGL textures.
 *
 * @enum {Number}
 *
 * @see TextureMagnificationFilter
 */
const TextureMinificationFilter = {
  /**
   * Samples the texture by returning the closest pixel.
   *
   * @type {Number}
   * @constant
   */
  NEAREST: WebGLConstants.NEAREST,
  /**
   * Samples the texture through bi-linear interpolation of the four nearest pixels. This produces smoother results than <code>NEAREST</code> filtering.
   *
   * @type {Number}
   * @constant
   */
  LINEAR: WebGLConstants.LINEAR,
  /**
   * Selects the nearest mip level and applies nearest sampling within that level.
   * <p>
   * Requires that the texture has a mipmap. The mip level is chosen by the view angle and screen-space size of the texture.
   * </p>
   *
   * @type {Number}
   * @constant
   */
  NEAREST_MIPMAP_NEAREST: WebGLConstants.NEAREST_MIPMAP_NEAREST,
  /**
   * Selects the nearest mip level and applies linear sampling within that level.
   * <p>
   * Requires that the texture has a mipmap. The mip level is chosen by the view angle and screen-space size of the texture.
   * </p>
   *
   * @type {Number}
   * @constant
   */
  LINEAR_MIPMAP_NEAREST: WebGLConstants.LINEAR_MIPMAP_NEAREST,
  /**
   * Read texture values with nearest sampling from two adjacent mip levels and linearly interpolate the results.
   * <p>
   * This option provides a good balance of visual quality and speed when sampling from a mipmapped texture.
   * </p>
   * <p>
   * Requires that the texture has a mipmap. The mip level is chosen by the view angle and screen-space size of the texture.
   * </p>
   *
   * @type {Number}
   * @constant
   */
  NEAREST_MIPMAP_LINEAR: WebGLConstants.NEAREST_MIPMAP_LINEAR,
  /**
   * Read texture values with linear sampling from two adjacent mip levels and linearly interpolate the results.
   * <p>
   * This option provides a good balance of visual quality and speed when sampling from a mipmapped texture.
   * </p>
   * <p>
   * Requires that the texture has a mipmap. The mip level is chosen by the view angle and screen-space size of the texture.
   * </p>
   * @type {Number}
   * @constant
   */
  LINEAR_MIPMAP_LINEAR: WebGLConstants.LINEAR_MIPMAP_LINEAR,
};

/**
 * Validates the given <code>textureMinificationFilter</code> with respect to the possible enum values.
 *
 * @private
 *
 * @param textureMinificationFilter
 * @returns {Boolean} <code>true</code> if <code>textureMinificationFilter</code> is valid.
 */
TextureMinificationFilter.validate = function (textureMinificationFilter) {
  return (
    textureMinificationFilter === TextureMinificationFilter.NEAREST ||
    textureMinificationFilter === TextureMinificationFilter.LINEAR ||
    textureMinificationFilter ===
      TextureMinificationFilter.NEAREST_MIPMAP_NEAREST ||
    textureMinificationFilter ===
      TextureMinificationFilter.LINEAR_MIPMAP_NEAREST ||
    textureMinificationFilter ===
      TextureMinificationFilter.NEAREST_MIPMAP_LINEAR ||
    textureMinificationFilter === TextureMinificationFilter.LINEAR_MIPMAP_LINEAR
  );
};

export default Object.freeze(TextureMinificationFilter);
