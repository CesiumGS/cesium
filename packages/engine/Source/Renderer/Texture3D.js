import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import createGuid from "../Core/createGuid.js";
import Frozen from "../Core/Frozen.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import PixelFormat from "../Core/PixelFormat.js";
import ContextLimits from "./ContextLimits.js";
import MipmapHint from "./MipmapHint.js";
import PixelDatatype from "./PixelDatatype.js";
import Sampler from "./Sampler.js";
import TextureMagnificationFilter from "./TextureMagnificationFilter.js";
import TextureMinificationFilter from "./TextureMinificationFilter.js";

/**
 * @typedef {object} Texture3D.Source
 * @property {number} width The width (in pixels) of the 3D texture source data.
 * @property {number} height The height (in pixels) of the 3D texture source data.
 * @property {number} depth The depth (in pixels) of the 3D texture source data.
 * @property {TypedArray|DataView} arrayBufferView The source data for a 3D texture. The type of each element needs to match the pixelDatatype.
 * @property {TypedArray|DataView} [mipLevels] An array of mip level data. Each element in the array should be a TypedArray or DataView that matches the pixelDatatype.
 */

/**
 * @typedef {object} Texture3D.ConstructorOptions
 *
 * @property {Context} context
 * @property {Texture3D.Source} [source] The source for texel values to be loaded into the 3D texture.
 * @property {PixelFormat} [pixelFormat=PixelFormat.RGBA] The format of each pixel, i.e., the number of components it has and what they represent.
 * @property {PixelDatatype} [pixelDatatype=PixelDatatype.UNSIGNED_BYTE] The data type of each pixel.
 * @property {boolean} [flipY=true] If true, the source values will be read as if the y-axis is inverted (y=0 at the top).
 * @property {boolean} [skipColorSpaceConversion=false] If true, color space conversions will be skipped when reading the texel values.
 * @property {Sampler} [sampler] Information about how to sample the 3D texture.
 * @property {number} [width] The width (in pixels) of the 3D texture. If not supplied, must be available from the source.
 * @property {number} [height] The height (in pixels) of the 3D texture. If not supplied, must be available from the source.
 * @property {number} [depth] The depth (in pixels) of the 3D texture. If not supplied, must be available from the source.
 * @property {boolean} [preMultiplyAlpha] If true, the alpha channel will be multiplied into the other channels.
 * @property {string} [id] A unique identifier for the 3D texture. If this is not given, then a GUID will be created.
 *
 * @private
 */

/**
 * A wrapper for a {@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLTexture|WebGLTexture}
 * to abstract away the verbose GL calls associated with setting up a texture3D.
 *
 * @alias Texture3D
 * @constructor
 *
 * @param {Texture3D.ConstructorOptions} options
 * @private
 */
function Texture3D(options) {
  options = options ?? Frozen.EMPTY_OBJECT;

  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.context", options.context);
  //>>includeEnd('debug');

  const {
    context,
    source,
    pixelFormat = PixelFormat.RGBA,
    pixelDatatype = PixelDatatype.UNSIGNED_BYTE,
    flipY = true,
    skipColorSpaceConversion = false,
    sampler = new Sampler(),
  } = options;

  if (!context.webgl2) {
    throw new DeveloperError(
      "WebGL1 does not support texture3D. Please use a WebGL2 context.",
    );
  }

  let { width, height, depth } = options;
  if (defined(source)) {
    // Make sure we are using the element's intrinsic width and height where available
    if (!defined(width)) {
      width = source.width;
    }
    if (!defined(height)) {
      height = source.height;
    }
    // depth is not used for 2D textures, but is required for 3D textures
    if (!defined(depth)) {
      depth = source.depth;
    }
  }

  // Use premultiplied alpha for opaque textures should perform better on Chrome:
  // http://media.tojicode.com/webglCamp4/#20
  const preMultiplyAlpha =
    options.preMultiplyAlpha ||
    pixelFormat === PixelFormat.RGB ||
    pixelFormat === PixelFormat.LUMINANCE;

  const internalFormat = PixelFormat.toInternalFormat(
    pixelFormat,
    pixelDatatype,
    context,
  );

  const isCompressed = PixelFormat.isCompressedFormat(internalFormat);

  //>>includeStart('debug', pragmas.debug);
  if (!defined(width) || !defined(height) || !defined(depth)) {
    throw new DeveloperError(
      "options requires a source field to create an initialized texture3D or width, height and depth fields to create a blank texture3D.",
    );
  }

  Check.typeOf.number.greaterThan("width", width, 0);

  if (width > ContextLimits.maximumTextureSize) {
    throw new DeveloperError(
      `Width must be less than or equal to the maximum texture3D size (${ContextLimits.maximumTextureSize}).  Check maximumTextureSize.`,
    );
  }

  Check.typeOf.number.greaterThan("height", height, 0);

  if (height > ContextLimits.maximumTextureSize) {
    throw new DeveloperError(
      `Height must be less than or equal to the maximum texture3D size (${ContextLimits.maximumTextureSize}).  Check maximumTextureSize.`,
    );
  }

  Check.typeOf.number.greaterThan("depth", depth, 0);

  if (depth > ContextLimits.maximumTextureSize) {
    throw new DeveloperError(
      `Depth must be less than or equal to the maximum texture3D size (${ContextLimits.maximumTextureSize}).  Check maximumTextureSize.`,
    );
  }

  if (!PixelFormat.validate(pixelFormat)) {
    throw new DeveloperError("Invalid options.pixelFormat.");
  }

  if (!isCompressed && !PixelDatatype.validate(pixelDatatype)) {
    throw new DeveloperError("Invalid options.pixelDatatype.");
  }

  if (
    pixelFormat === PixelFormat.DEPTH_COMPONENT &&
    pixelDatatype !== PixelDatatype.UNSIGNED_SHORT &&
    pixelDatatype !== PixelDatatype.UNSIGNED_INT
  ) {
    throw new DeveloperError(
      "When options.pixelFormat is DEPTH_COMPONENT, options.pixelDatatype must be UNSIGNED_SHORT or UNSIGNED_INT.",
    );
  }

  if (
    pixelFormat === PixelFormat.DEPTH_STENCIL &&
    pixelDatatype !== PixelDatatype.UNSIGNED_INT_24_8
  ) {
    throw new DeveloperError(
      "When options.pixelFormat is DEPTH_STENCIL, options.pixelDatatype must be UNSIGNED_INT_24_8.",
    );
  }

  if (pixelDatatype === PixelDatatype.FLOAT && !context.floatingPointTexture) {
    throw new DeveloperError(
      "When options.pixelDatatype is FLOAT, this WebGL implementation must support the OES_texture_float extension.  Check context.floatingPointTexture.",
    );
  }

  if (
    pixelDatatype === PixelDatatype.HALF_FLOAT &&
    !context.halfFloatingPointTexture
  ) {
    throw new DeveloperError(
      "When options.pixelDatatype is HALF_FLOAT, this WebGL implementation must support the OES_texture_half_float extension. Check context.halfFloatingPointTexture.",
    );
  }

  if (PixelFormat.isDepthFormat(pixelFormat)) {
    if (defined(source)) {
      throw new DeveloperError(
        "When options.pixelFormat is DEPTH_COMPONENT or DEPTH_STENCIL, source cannot be provided.",
      );
    }

    if (!context.depthTexture) {
      throw new DeveloperError(
        "When options.pixelFormat is DEPTH_COMPONENT or DEPTH_STENCIL, this WebGL implementation must support WEBGL_depth_texture.  Check context.depthTexture.",
      );
    }
  }

  if (isCompressed) {
    throw new DeveloperError(
      "Texture3D does not currently support compressed formats.",
    );
  }
  //>>includeEnd('debug');

  const gl = context._gl;

  const sizeInBytes = PixelFormat.texture3DSizeInBytes(
    pixelFormat,
    pixelDatatype,
    width,
    height,
    depth,
  );

  this._id = options.id ?? createGuid();
  this._context = context;
  this._textureFilterAnisotropic = context._textureFilterAnisotropic;
  this._textureTarget = gl.TEXTURE_3D;
  this._texture = gl.createTexture();
  this._internalFormat = internalFormat;
  this._pixelFormat = pixelFormat;
  this._pixelDatatype = pixelDatatype;
  this._width = width;
  this._height = height;
  this._depth = depth;
  this._dimensions = new Cartesian3(width, height, depth);
  this._hasMipmap = false;
  this._sizeInBytes = sizeInBytes;
  this._preMultiplyAlpha = preMultiplyAlpha;
  this._flipY = flipY;
  this._initialized = false;
  this._sampler = undefined;

  this._sampler = sampler;
  setupSampler(this, sampler);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(this._textureTarget, this._texture);

  if (defined(source)) {
    if (skipColorSpaceConversion) {
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    } else {
      gl.pixelStorei(
        gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,
        gl.BROWSER_DEFAULT_WEBGL,
      );
    }
    if (!defined(source.arrayBufferView)) {
      throw new DeveloperError(
        "For Texture3D, options.source.arrayBufferView must be defined",
      );
    }

    loadBufferSource(this, source);

    this._initialized = true;
  } else {
    loadNull(this);
  }

  gl.bindTexture(this._textureTarget, null);
}

/**
 * Load texel data from a buffer into a texture3D.
 *
 * @param {Texture3D} texture3D The texture3D to which texel values will be loaded.
 * @param {Texture3D.Source} source The source for texel values to be loaded into the texture3D.
 *
 * @private
 */
function loadBufferSource(texture3D, source) {
  const context = texture3D._context;
  const gl = context._gl;
  const textureTarget = texture3D._textureTarget;
  const internalFormat = texture3D._internalFormat;

  const { width, height, depth, pixelFormat, pixelDatatype, flipY } = texture3D;

  const unpackAlignment = PixelFormat.alignmentInBytes(
    pixelFormat,
    pixelDatatype,
    width,
  );
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, unpackAlignment);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

  const { arrayBufferView } = source;
  if (flipY) {
    console.warn("texture3D.flipY is not supported.");
  }

  let levels = 1;
  if (source.mipLevels && source.mipLevels.length) {
    levels = source.mipLevels.length + 1;
  }
  gl.texStorage3D(textureTarget, levels, internalFormat, width, height, depth);

  gl.texSubImage3D(
    textureTarget,
    0,
    0,
    0,
    0,
    width,
    height,
    depth,
    pixelFormat,
    PixelDatatype.toWebGLConstant(pixelDatatype, context),
    arrayBufferView,
  );

  if (levels > 1) {
    let mipWidth = width;
    let mipHeight = height;
    let mipDepth = depth;
    for (let i = 0; i < source.mipLevels.length; ++i) {
      mipWidth = nextMipSize(mipWidth);
      mipHeight = nextMipSize(mipHeight);
      mipDepth = nextMipSize(mipDepth);
      gl.texSubImage3D(
        textureTarget,
        i + 1,
        0,
        0,
        0,
        mipWidth,
        mipHeight,
        mipDepth,
        pixelFormat,
        PixelDatatype.toWebGLConstant(pixelDatatype, context),
        source.mipLevels[i],
      );
    }
  }
}

/**
 * Compute a dimension of the image for the next mip level.
 *
 * @param {number} currentSize The size of the current mip level.
 * @returns {number} The size of the next mip level.
 *
 * @private
 */
function nextMipSize(currentSize) {
  const nextSize = Math.floor(currentSize / 2) | 0;
  return Math.max(nextSize, 1);
}

/**
 * Allocate a texture3D in GPU memory, without providing any image data.
 *
 * @param {Texture3D} texture3D The texture3D to be initialized with null values.
 *
 * @private
 */
function loadNull(texture3D) {
  const context = texture3D._context;

  context._gl.texImage3D(
    texture3D._textureTarget,
    0,
    texture3D._internalFormat,
    texture3D._width,
    texture3D._height,
    texture3D._depth,
    0,
    texture3D._pixelFormat,
    PixelDatatype.toWebGLConstant(texture3D._pixelDatatype, context),
    null,
  );
}

/**
 * This function is identical to using the Texture3D constructor except that it can be
 * replaced with a mock/spy in tests.
 * @private
 */
Texture3D.create = function (options) {
  return new Texture3D(options);
};

Object.defineProperties(Texture3D.prototype, {
  /**
   * A unique id for the texture3D
   * @memberof Texture3D.prototype
   * @type {string}
   * @readonly
   * @private
   */
  id: {
    get: function () {
      return this._id;
    },
  },
  /**
   * The sampler to use when sampling this texture3D.
   * Create a sampler by calling {@link Sampler}.  If this
   * parameter is not specified, a default sampler is used.  The default sampler clamps texture3D
   * coordinates in both directions, uses linear filtering for both magnification and minification,
   * and uses a maximum anisotropy of 1.0.
   * @memberof Texture3D.prototype
   * @type {Sampler}
   * @private
   */
  sampler: {
    get: function () {
      return this._sampler;
    },
    set: function (sampler) {
      setupSampler(this, sampler);
      this._sampler = sampler;
    },
  },
  pixelFormat: {
    get: function () {
      return this._pixelFormat;
    },
  },
  pixelDatatype: {
    get: function () {
      return this._pixelDatatype;
    },
  },
  dimensions: {
    get: function () {
      return this._dimensions;
    },
  },
  preMultiplyAlpha: {
    get: function () {
      return this._preMultiplyAlpha;
    },
  },
  flipY: {
    get: function () {
      return this._flipY;
    },
  },
  width: {
    get: function () {
      return this._width;
    },
  },
  height: {
    get: function () {
      return this._height;
    },
  },
  depth: {
    get: function () {
      return this._depth;
    },
  },
  sizeInBytes: {
    get: function () {
      if (this._hasMipmap) {
        return Math.floor((this._sizeInBytes * 8) / 7);
      }
      return this._sizeInBytes;
    },
  },
  _target: {
    get: function () {
      return this._textureTarget;
    },
  },
});

/**
 * Set up a sampler for use with a texture3D
 * @param {Texture3D} texture3D The texture3D to be sampled by this sampler
 * @param {Sampler} sampler Information about how to sample the texture3D
 * @private
 */
function setupSampler(texture3D, sampler) {
  let { minificationFilter, magnificationFilter } = sampler;

  const mipmap = [
    TextureMinificationFilter.NEAREST_MIPMAP_NEAREST,
    TextureMinificationFilter.NEAREST_MIPMAP_LINEAR,
    TextureMinificationFilter.LINEAR_MIPMAP_NEAREST,
    TextureMinificationFilter.LINEAR_MIPMAP_LINEAR,
  ].includes(minificationFilter);

  const context = texture3D._context;
  const pixelFormat = texture3D._pixelFormat;
  const pixelDatatype = texture3D._pixelDatatype;

  // float textures only support nearest filtering unless the linear extensions are supported
  if (
    (pixelDatatype === PixelDatatype.FLOAT && !context.textureFloatLinear) ||
    (pixelDatatype === PixelDatatype.HALF_FLOAT &&
      !context.textureHalfFloatLinear)
  ) {
    // override the sampler's settings
    minificationFilter = mipmap
      ? TextureMinificationFilter.NEAREST_MIPMAP_NEAREST
      : TextureMinificationFilter.NEAREST;
    magnificationFilter = TextureMagnificationFilter.NEAREST;
  }

  // WebGL 2 depth texture3D only support nearest filtering. See section 3.8.13 OpenGL ES 3 spec
  if (PixelFormat.isDepthFormat(pixelFormat)) {
    minificationFilter = TextureMinificationFilter.NEAREST;
    magnificationFilter = TextureMagnificationFilter.NEAREST;
  }

  const gl = context._gl;
  const target = texture3D._textureTarget;

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(target, texture3D._texture);
  gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, minificationFilter);
  gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, magnificationFilter);
  gl.texParameteri(target, gl.TEXTURE_WRAP_R, sampler.wrapR);
  gl.texParameteri(target, gl.TEXTURE_WRAP_S, sampler.wrapS);
  gl.texParameteri(target, gl.TEXTURE_WRAP_T, sampler.wrapT);
  if (defined(texture3D._textureFilterAnisotropic)) {
    gl.texParameteri(
      target,
      texture3D._textureFilterAnisotropic.TEXTURE_MAX_ANISOTROPY_EXT,
      sampler.maximumAnisotropy,
    );
  }
  gl.bindTexture(target, null);
}

/**
 * @param {MipmapHint} [hint=MipmapHint.DONT_CARE] optional.
 * @private
 * @exception {DeveloperError} Cannot call generateMipmap when the texture3D pixel format is DEPTH_COMPONENT or DEPTH_STENCIL.
 * @exception {DeveloperError} Cannot call generateMipmap when the texture3D pixel format is a compressed format.
 * @exception {DeveloperError} hint is invalid.
 * @exception {DeveloperError} This texture3D's width must be a power of two to call generateMipmap() in a WebGL1 context.
 * @exception {DeveloperError} This texture3D's height must be a power of two to call generateMipmap() in a WebGL1 context.
 * @exception {DeveloperError} This texture3D was destroyed, i.e., destroy() was called.
 */
Texture3D.prototype.generateMipmap = function (hint) {
  hint = hint ?? MipmapHint.DONT_CARE;

  //>>includeStart('debug', pragmas.debug);
  if (PixelFormat.isDepthFormat(this._pixelFormat)) {
    throw new DeveloperError(
      "Cannot call generateMipmap when the texture3D pixel format is DEPTH_COMPONENT or DEPTH_STENCIL.",
    );
  }
  if (PixelFormat.isCompressedFormat(this._pixelFormat)) {
    throw new DeveloperError(
      "Cannot call generateMipmap with a compressed pixel format.",
    );
  }

  if (!MipmapHint.validate(hint)) {
    throw new DeveloperError("hint is invalid.");
  }
  //>>includeEnd('debug');

  this._hasMipmap = true;

  const gl = this._context._gl;
  const target = this._textureTarget;

  gl.hint(gl.GENERATE_MIPMAP_HINT, hint);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(target, this._texture);
  gl.generateMipmap(target);
  gl.bindTexture(target, null);
};

Texture3D.prototype.isDestroyed = function () {
  return false;
};

Texture3D.prototype.destroy = function () {
  this._context._gl.deleteTexture(this._texture);
  return destroyObject(this);
};
export default Texture3D;
