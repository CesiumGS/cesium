import Cartesian2 from "../Core/Cartesian2.js";
import Check from "../Core/Check.js";
import createGuid from "../Core/createGuid.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import CesiumMath from "../Core/Math.js";
import PixelFormat from "../Core/PixelFormat.js";
import ContextLimits from "./ContextLimits.js";
import MipmapHint from "./MipmapHint.js";
import PixelDatatype from "./PixelDatatype.js";
import Sampler from "./Sampler.js";
import TextureMagnificationFilter from "./TextureMagnificationFilter.js";
import TextureMinificationFilter from "./TextureMinificationFilter.js";

/**
 * @typedef {object} Texture.ConstructorOptions
 *
 * @property {Context} context
 * @property {object} [source] The source for texel values to be loaded into the texture.
 * @property {PixelFormat} [pixelFormat=PixelFormat.RGBA] The format of each pixel, i.e., the number of components it has and what they represent.
 * @property {PixelDatatype} [pixelDatatype=PixelDatatype.UNSIGNED_BYTE] The data type of each pixel.
 * @property {boolean} [flipY=true] If true, the source values will be read as if the y-axis is inverted (y=0 at the top).
 * @property {boolean} [skipColorSpaceConversion=false] If true, color space conversions will be skipped when reading the texel values.
 * @property {Sampler} [sampler] Information about how to sample the cubemap texture.
 * @property {number} [width] The pixel width of the texture. If not supplied, must be available from the source.
 * @property {number} [height] The pixel height of the texture. If not supplied, must be available from the source.
 * @property {boolean} [preMultiplyAlpha] If true, the alpha channel will be multiplied into the other channels.
 *
 * @private
 */

/**
 * A wrapper for a {@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLTexture|WebGLTexture}
 * to abstract away the verbose GL calls associated with setting up a texture.
 *
 * @alias Texture
 * @constructor
 *
 * @param {Texture.ConstructorOptions} options
 * @private
 */
function Texture(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

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

  let { width, height } = options;
  if (defined(source)) {
    // Make sure we are using the element's intrinsic width and height where available
    if (!defined(width)) {
      width = source.videoWidth ?? source.naturalWidth ?? source.width;
    }
    if (!defined(height)) {
      height = source.videoHeight ?? source.naturalHeight ?? source.height;
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
  if (!defined(width) || !defined(height)) {
    throw new DeveloperError(
      "options requires a source field to create an initialized texture or width and height fields to create a blank texture.",
    );
  }

  Check.typeOf.number.greaterThan("width", width, 0);

  if (width > ContextLimits.maximumTextureSize) {
    throw new DeveloperError(
      `Width must be less than or equal to the maximum texture size (${ContextLimits.maximumTextureSize}).  Check maximumTextureSize.`,
    );
  }

  Check.typeOf.number.greaterThan("height", height, 0);

  if (height > ContextLimits.maximumTextureSize) {
    throw new DeveloperError(
      `Height must be less than or equal to the maximum texture size (${ContextLimits.maximumTextureSize}).  Check maximumTextureSize.`,
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
    if (!defined(source) || !defined(source.arrayBufferView)) {
      throw new DeveloperError(
        "When options.pixelFormat is compressed, options.source.arrayBufferView must be defined.",
      );
    }

    if (PixelFormat.isDXTFormat(internalFormat) && !context.s3tc) {
      throw new DeveloperError(
        "When options.pixelFormat is S3TC compressed, this WebGL implementation must support the WEBGL_compressed_texture_s3tc extension. Check context.s3tc.",
      );
    } else if (PixelFormat.isPVRTCFormat(internalFormat) && !context.pvrtc) {
      throw new DeveloperError(
        "When options.pixelFormat is PVRTC compressed, this WebGL implementation must support the WEBGL_compressed_texture_pvrtc extension. Check context.pvrtc.",
      );
    } else if (PixelFormat.isASTCFormat(internalFormat) && !context.astc) {
      throw new DeveloperError(
        "When options.pixelFormat is ASTC compressed, this WebGL implementation must support the WEBGL_compressed_texture_astc extension. Check context.astc.",
      );
    } else if (PixelFormat.isETC2Format(internalFormat) && !context.etc) {
      throw new DeveloperError(
        "When options.pixelFormat is ETC2 compressed, this WebGL implementation must support the WEBGL_compressed_texture_etc extension. Check context.etc.",
      );
    } else if (PixelFormat.isETC1Format(internalFormat) && !context.etc1) {
      throw new DeveloperError(
        "When options.pixelFormat is ETC1 compressed, this WebGL implementation must support the WEBGL_compressed_texture_etc1 extension. Check context.etc1.",
      );
    } else if (PixelFormat.isBC7Format(internalFormat) && !context.bc7) {
      throw new DeveloperError(
        "When options.pixelFormat is BC7 compressed, this WebGL implementation must support the EXT_texture_compression_bptc extension. Check context.bc7.",
      );
    }

    if (
      PixelFormat.compressedTextureSizeInBytes(
        internalFormat,
        width,
        height,
      ) !== source.arrayBufferView.byteLength
    ) {
      throw new DeveloperError(
        "The byte length of the array buffer is invalid for the compressed texture with the given width and height.",
      );
    }
  }
  //>>includeEnd('debug');

  const gl = context._gl;

  const sizeInBytes = isCompressed
    ? PixelFormat.compressedTextureSizeInBytes(pixelFormat, width, height)
    : PixelFormat.textureSizeInBytes(pixelFormat, pixelDatatype, width, height);

  this._id = createGuid();
  this._context = context;
  this._textureFilterAnisotropic = context._textureFilterAnisotropic;
  this._textureTarget = gl.TEXTURE_2D;
  this._texture = gl.createTexture();
  this._internalFormat = internalFormat;
  this._pixelFormat = pixelFormat;
  this._pixelDatatype = pixelDatatype;
  this._width = width;
  this._height = height;
  this._dimensions = new Cartesian2(width, height);
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
    if (defined(source.arrayBufferView)) {
      const isCompressed = PixelFormat.isCompressedFormat(internalFormat);
      if (isCompressed) {
        loadCompressedBufferSource(this, source);
      } else {
        loadBufferSource(this, source);
      }
    } else if (defined(source.framebuffer)) {
      loadFramebufferSource(this, source);
    } else {
      loadImageSource(this, source);
    }
    this._initialized = true;
  } else {
    loadNull(this);
  }

  gl.bindTexture(this._textureTarget, null);
}

/**
 * Load compressed texel data from a buffer into a texture.
 *
 * @param {Texture} texture The texture to which texel values will be loaded.
 * @param {object} source The source for texel values to be loaded into the texture.
 *
 * @private
 */
function loadCompressedBufferSource(texture, source) {
  const context = texture._context;
  const gl = context._gl;
  const textureTarget = texture._textureTarget;
  const internalFormat = texture._internalFormat;

  const { width, height } = texture;

  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

  gl.compressedTexImage2D(
    textureTarget,
    0,
    internalFormat,
    width,
    height,
    0,
    source.arrayBufferView,
  );

  if (defined(source.mipLevels)) {
    let mipWidth = width;
    let mipHeight = height;
    for (let i = 0; i < source.mipLevels.length; ++i) {
      mipWidth = nextMipSize(mipWidth);
      mipHeight = nextMipSize(mipHeight);
      gl.compressedTexImage2D(
        textureTarget,
        i + 1,
        internalFormat,
        mipWidth,
        mipHeight,
        0,
        source.mipLevels[i],
      );
    }
  }
}

/**
 * Load texel data from a buffer into a texture.
 *
 * @param {Texture} texture The texture to which texel values will be loaded.
 * @param {object} source The source for texel values to be loaded into the texture.
 *
 * @private
 */
function loadBufferSource(texture, source) {
  const context = texture._context;
  const gl = context._gl;
  const textureTarget = texture._textureTarget;
  const internalFormat = texture._internalFormat;

  const { width, height, pixelFormat, pixelDatatype, flipY } = texture;

  const unpackAlignment = PixelFormat.alignmentInBytes(
    pixelFormat,
    pixelDatatype,
    width,
  );
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, unpackAlignment);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

  let arrayBufferView = source.arrayBufferView;
  if (flipY) {
    arrayBufferView = PixelFormat.flipY(
      arrayBufferView,
      pixelFormat,
      pixelDatatype,
      width,
      height,
    );
  }
  gl.texImage2D(
    textureTarget,
    0,
    internalFormat,
    width,
    height,
    0,
    pixelFormat,
    PixelDatatype.toWebGLConstant(pixelDatatype, context),
    arrayBufferView,
  );

  if (defined(source.mipLevels)) {
    let mipWidth = width;
    let mipHeight = height;
    for (let i = 0; i < source.mipLevels.length; ++i) {
      mipWidth = nextMipSize(mipWidth);
      mipHeight = nextMipSize(mipHeight);
      gl.texImage2D(
        textureTarget,
        i + 1,
        internalFormat,
        mipWidth,
        mipHeight,
        0,
        pixelFormat,
        PixelDatatype.toWebGLConstant(pixelDatatype, context),
        source.mipLevels[i],
      );
    }
  }
}

/**
 * Load texel data from a framebuffer into a texture.
 *
 * @param {Texture} texture The texture to which texel values will be loaded.
 * @param {object} source The source for texel values to be loaded into the texture.
 *
 * @private
 */
function loadFramebufferSource(texture, source) {
  const context = texture._context;
  const gl = context._gl;

  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

  if (source.framebuffer !== context.defaultFramebuffer) {
    source.framebuffer._bind();
  }

  gl.copyTexImage2D(
    texture._textureTarget,
    0,
    texture._internalFormat,
    source.xOffset,
    source.yOffset,
    texture.width,
    texture.height,
    0,
  );

  if (source.framebuffer !== context.defaultFramebuffer) {
    source.framebuffer._unBind();
  }
}

/**
 * Load texel data from an Image into a texture.
 *
 * @param {Texture} texture The texture to which texel values will be loaded.
 * @param {ImageData|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement} source The source for texel values to be loaded into the texture.
 *
 * @private
 */
function loadImageSource(texture, source) {
  const context = texture._context;
  const gl = context._gl;

  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, texture.preMultiplyAlpha);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, texture.flipY);

  gl.texImage2D(
    texture._textureTarget,
    0,
    texture._internalFormat,
    texture.pixelFormat,
    PixelDatatype.toWebGLConstant(texture.pixelDatatype, context),
    source,
  );
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
 * Allocate a texture in GPU memory, without providing any image data.
 *
 * @param {Texture} texture The texture to be initialized with null values.
 *
 * @private
 */
function loadNull(texture) {
  const context = texture._context;

  context._gl.texImage2D(
    texture._textureTarget,
    0,
    texture._internalFormat,
    texture._width,
    texture._height,
    0,
    texture._pixelFormat,
    PixelDatatype.toWebGLConstant(texture._pixelDatatype, context),
    null,
  );
}

/**
 * This function is identical to using the Texture constructor except that it can be
 * replaced with a mock/spy in tests.
 * @private
 */
Texture.create = function (options) {
  return new Texture(options);
};

/**
 * Creates a texture, and copies a subimage of the framebuffer to it.  When called without arguments,
 * the texture is the same width and height as the framebuffer and contains its contents.
 *
 * @param {object} options Object with the following properties:
 * @param {Context} options.context The context in which the Texture gets created.
 * @param {PixelFormat} [options.pixelFormat=PixelFormat.RGB] The texture's internal pixel format.
 * @param {number} [options.framebufferXOffset=0] An offset in the x direction in the framebuffer where copying begins from.
 * @param {number} [options.framebufferYOffset=0] An offset in the y direction in the framebuffer where copying begins from.
 * @param {number} [options.width=canvas.clientWidth] The width of the texture in texels.
 * @param {number} [options.height=canvas.clientHeight] The height of the texture in texels.
 * @param {Framebuffer} [options.framebuffer=defaultFramebuffer] The framebuffer from which to create the texture.  If this
 *        parameter is not specified, the default framebuffer is used.
 * @returns {Texture} A texture with contents from the framebuffer.
 *
 * @exception {DeveloperError} Invalid pixelFormat.
 * @exception {DeveloperError} pixelFormat cannot be DEPTH_COMPONENT, DEPTH_STENCIL or a compressed format.
 * @exception {DeveloperError} framebufferXOffset must be greater than or equal to zero.
 * @exception {DeveloperError} framebufferYOffset must be greater than or equal to zero.
 * @exception {DeveloperError} framebufferXOffset + width must be less than or equal to canvas.clientWidth.
 * @exception {DeveloperError} framebufferYOffset + height must be less than or equal to canvas.clientHeight.
 *
 *
 * @example
 * // Create a texture with the contents of the framebuffer.
 * const t = Texture.fromFramebuffer({
 *     context : context
 * });
 *
 * @see Sampler
 *
 * @private
 */
Texture.fromFramebuffer = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.context", options.context);
  //>>includeEnd('debug');

  const context = options.context;
  const gl = context._gl;
  const {
    pixelFormat = PixelFormat.RGB,
    framebufferXOffset = 0,
    framebufferYOffset = 0,
    width = gl.drawingBufferWidth,
    height = gl.drawingBufferHeight,
    framebuffer,
  } = options;

  //>>includeStart('debug', pragmas.debug);
  if (!PixelFormat.validate(pixelFormat)) {
    throw new DeveloperError("Invalid pixelFormat.");
  }
  if (
    PixelFormat.isDepthFormat(pixelFormat) ||
    PixelFormat.isCompressedFormat(pixelFormat)
  ) {
    throw new DeveloperError(
      "pixelFormat cannot be DEPTH_COMPONENT, DEPTH_STENCIL or a compressed format.",
    );
  }
  Check.defined("options.context", context);
  Check.typeOf.number.greaterThanOrEquals(
    "framebufferXOffset",
    framebufferXOffset,
    0,
  );
  Check.typeOf.number.greaterThanOrEquals(
    "framebufferYOffset",
    framebufferYOffset,
    0,
  );
  if (framebufferXOffset + width > gl.drawingBufferWidth) {
    throw new DeveloperError(
      "framebufferXOffset + width must be less than or equal to drawingBufferWidth",
    );
  }
  if (framebufferYOffset + height > gl.drawingBufferHeight) {
    throw new DeveloperError(
      "framebufferYOffset + height must be less than or equal to drawingBufferHeight.",
    );
  }
  //>>includeEnd('debug');

  const texture = new Texture({
    context: context,
    width: width,
    height: height,
    pixelFormat: pixelFormat,
    source: {
      framebuffer: defined(framebuffer)
        ? framebuffer
        : context.defaultFramebuffer,
      xOffset: framebufferXOffset,
      yOffset: framebufferYOffset,
      width: width,
      height: height,
    },
  });

  return texture;
};

Object.defineProperties(Texture.prototype, {
  /**
   * A unique id for the texture
   * @memberof Texture.prototype
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
   * The sampler to use when sampling this texture.
   * Create a sampler by calling {@link Sampler}.  If this
   * parameter is not specified, a default sampler is used.  The default sampler clamps texture
   * coordinates in both directions, uses linear filtering for both magnification and minification,
   * and uses a maximum anisotropy of 1.0.
   * @memberof Texture.prototype
   * @type {object}
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
  sizeInBytes: {
    get: function () {
      if (this._hasMipmap) {
        return Math.floor((this._sizeInBytes * 4) / 3);
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
 * Set up a sampler for use with a texture
 * @param {Texture} texture The texture to be sampled by this sampler
 * @param {Sampler} sampler Information about how to sample the texture
 * @private
 */
function setupSampler(texture, sampler) {
  let { minificationFilter, magnificationFilter } = sampler;

  const mipmap = [
    TextureMinificationFilter.NEAREST_MIPMAP_NEAREST,
    TextureMinificationFilter.NEAREST_MIPMAP_LINEAR,
    TextureMinificationFilter.LINEAR_MIPMAP_NEAREST,
    TextureMinificationFilter.LINEAR_MIPMAP_LINEAR,
  ].includes(minificationFilter);

  const context = texture._context;
  const pixelFormat = texture._pixelFormat;
  const pixelDatatype = texture._pixelDatatype;

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

  // WebGL 2 depth texture only support nearest filtering. See section 3.8.13 OpenGL ES 3 spec
  if (context.webgl2) {
    if (PixelFormat.isDepthFormat(pixelFormat)) {
      minificationFilter = TextureMinificationFilter.NEAREST;
      magnificationFilter = TextureMagnificationFilter.NEAREST;
    }
  }

  const gl = context._gl;
  const target = texture._textureTarget;

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(target, texture._texture);
  gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, minificationFilter);
  gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, magnificationFilter);
  gl.texParameteri(target, gl.TEXTURE_WRAP_S, sampler.wrapS);
  gl.texParameteri(target, gl.TEXTURE_WRAP_T, sampler.wrapT);
  if (defined(texture._textureFilterAnisotropic)) {
    gl.texParameteri(
      target,
      texture._textureFilterAnisotropic.TEXTURE_MAX_ANISOTROPY_EXT,
      sampler.maximumAnisotropy,
    );
  }
  gl.bindTexture(target, null);
}

/**
 * Copy new image data into this texture, from a source {@link ImageData}, {@link HTMLImageElement}, {@link HTMLCanvasElement}, or {@link HTMLVideoElement}.
 * or an object with width, height, and arrayBufferView properties.
 * @param {object} options Object with the following properties:
 * @param {object} options.source The source {@link ImageData}, {@link HTMLImageElement}, {@link HTMLCanvasElement}, or {@link HTMLVideoElement},
 *                        or an object with width, height, and arrayBufferView properties.
 * @param {number} [options.xOffset=0] The offset in the x direction within the texture to copy into.
 * @param {number} [options.yOffset=0] The offset in the y direction within the texture to copy into.
 * @param {boolean} [options.skipColorSpaceConversion=false] If true, any custom gamma or color profiles in the texture will be ignored.
 *
 * @exception {DeveloperError} Cannot call copyFrom when the texture pixel format is DEPTH_COMPONENT or DEPTH_STENCIL.
 * @exception {DeveloperError} Cannot call copyFrom with a compressed texture pixel format.
 * @exception {DeveloperError} xOffset must be greater than or equal to zero.
 * @exception {DeveloperError} yOffset must be greater than or equal to zero.
 * @exception {DeveloperError} xOffset + source.width must be less than or equal to width.
 * @exception {DeveloperError} yOffset + source.height must be less than or equal to height.
 * @exception {DeveloperError} This texture was destroyed, i.e., destroy() was called.
 *
 * @example
 * texture.copyFrom({
 *  source: {
 *   width : 1,
 *   height : 1,
 *   arrayBufferView : new Uint8Array([255, 0, 0, 255])
 *  }
 * });
 */
Texture.prototype.copyFrom = function (options) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("options", options);
  //>>includeEnd('debug');

  const {
    xOffset = 0,
    yOffset = 0,
    source,
    skipColorSpaceConversion = false,
  } = options;

  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.source", source);
  if (PixelFormat.isDepthFormat(this._pixelFormat)) {
    throw new DeveloperError(
      "Cannot call copyFrom when the texture pixel format is DEPTH_COMPONENT or DEPTH_STENCIL.",
    );
  }
  if (PixelFormat.isCompressedFormat(this._pixelFormat)) {
    throw new DeveloperError(
      "Cannot call copyFrom with a compressed texture pixel format.",
    );
  }
  Check.typeOf.number.greaterThanOrEquals("xOffset", xOffset, 0);
  Check.typeOf.number.greaterThanOrEquals("yOffset", yOffset, 0);
  Check.typeOf.number.lessThanOrEquals(
    "xOffset + options.source.width",
    xOffset + source.width,
    this._width,
  );
  Check.typeOf.number.lessThanOrEquals(
    "yOffset + options.source.height",
    yOffset + source.height,
    this._height,
  );
  //>>includeEnd('debug');

  const context = this._context;
  const gl = context._gl;
  const target = this._textureTarget;

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(target, this._texture);

  let { width, height } = source;
  const arrayBufferView = source.arrayBufferView;

  // Make sure we are using the element's intrinsic width and height where available
  if (defined(source.videoWidth) && defined(source.videoHeight)) {
    width = source.videoWidth;
    height = source.videoHeight;
  } else if (defined(source.naturalWidth) && defined(source.naturalHeight)) {
    width = source.naturalWidth;
    height = source.naturalHeight;
  }

  const textureWidth = this._width;
  const textureHeight = this._height;
  const internalFormat = this._internalFormat;
  const pixelFormat = this._pixelFormat;
  const pixelDatatype = this._pixelDatatype;

  const preMultiplyAlpha = this._preMultiplyAlpha;
  const flipY = this._flipY;

  let unpackAlignment = 4;
  if (defined(arrayBufferView)) {
    unpackAlignment = PixelFormat.alignmentInBytes(
      pixelFormat,
      pixelDatatype,
      width,
    );
  }
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, unpackAlignment);

  if (skipColorSpaceConversion) {
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  } else {
    gl.pixelStorei(
      gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,
      gl.BROWSER_DEFAULT_WEBGL,
    );
  }

  let uploaded = false;
  if (!this._initialized) {
    let pixels;
    if (
      xOffset === 0 &&
      yOffset === 0 &&
      width === textureWidth &&
      height === textureHeight
    ) {
      // initialize the entire texture
      if (defined(arrayBufferView)) {
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        if (flipY) {
          pixels = PixelFormat.flipY(
            arrayBufferView,
            pixelFormat,
            pixelDatatype,
            textureWidth,
            textureHeight,
          );
        } else {
          pixels = arrayBufferView;
        }
      } else {
        // Only valid for DOM-Element uploads
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, preMultiplyAlpha);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);
        pixels = source;
      }
      uploaded = true;
    } else {
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      // initialize the entire texture to zero
      pixels = PixelFormat.createTypedArray(
        pixelFormat,
        pixelDatatype,
        textureWidth,
        textureHeight,
      );
    }
    gl.texImage2D(
      target,
      0,
      internalFormat,
      textureWidth,
      textureHeight,
      0,
      pixelFormat,
      PixelDatatype.toWebGLConstant(pixelDatatype, context),
      pixels,
    );
    this._initialized = true;
  }

  if (!uploaded) {
    let pixels;
    if (defined(arrayBufferView)) {
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

      if (flipY) {
        pixels = PixelFormat.flipY(
          arrayBufferView,
          pixelFormat,
          pixelDatatype,
          width,
          height,
        );
      } else {
        pixels = arrayBufferView;
      }
    } else {
      // Only valid for DOM-Element uploads
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, preMultiplyAlpha);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);
      pixels = source;
    }
    gl.texSubImage2D(
      target,
      0,
      xOffset,
      yOffset,
      width,
      height,
      pixelFormat,
      PixelDatatype.toWebGLConstant(pixelDatatype, context),
      pixels,
    );
  }

  gl.bindTexture(target, null);
};

/**
 * @param {number} [xOffset=0] The offset in the x direction within the texture to copy into.
 * @param {number} [yOffset=0] The offset in the y direction within the texture to copy into.
 * @param {number} [framebufferXOffset=0] optional
 * @param {number} [framebufferYOffset=0] optional
 * @param {number} [width=width] optional
 * @param {number} [height=height] optional
 *
 * @exception {DeveloperError} Cannot call copyFromFramebuffer when the texture pixel format is DEPTH_COMPONENT or DEPTH_STENCIL.
 * @exception {DeveloperError} Cannot call copyFromFramebuffer when the texture pixel data type is FLOAT.
 * @exception {DeveloperError} Cannot call copyFromFramebuffer when the texture pixel data type is HALF_FLOAT.
 * @exception {DeveloperError} Cannot call copyFrom with a compressed texture pixel format.
 * @exception {DeveloperError} This texture was destroyed, i.e., destroy() was called.
 * @exception {DeveloperError} xOffset must be greater than or equal to zero.
 * @exception {DeveloperError} yOffset must be greater than or equal to zero.
 * @exception {DeveloperError} framebufferXOffset must be greater than or equal to zero.
 * @exception {DeveloperError} framebufferYOffset must be greater than or equal to zero.
 * @exception {DeveloperError} xOffset + width must be less than or equal to width.
 * @exception {DeveloperError} yOffset + height must be less than or equal to height.
 */
Texture.prototype.copyFromFramebuffer = function (
  xOffset,
  yOffset,
  framebufferXOffset,
  framebufferYOffset,
  width,
  height,
) {
  xOffset = defaultValue(xOffset, 0);
  yOffset = defaultValue(yOffset, 0);
  framebufferXOffset = defaultValue(framebufferXOffset, 0);
  framebufferYOffset = defaultValue(framebufferYOffset, 0);
  width = defaultValue(width, this._width);
  height = defaultValue(height, this._height);

  //>>includeStart('debug', pragmas.debug);
  if (PixelFormat.isDepthFormat(this._pixelFormat)) {
    throw new DeveloperError(
      "Cannot call copyFromFramebuffer when the texture pixel format is DEPTH_COMPONENT or DEPTH_STENCIL.",
    );
  }
  if (this._pixelDatatype === PixelDatatype.FLOAT) {
    throw new DeveloperError(
      "Cannot call copyFromFramebuffer when the texture pixel data type is FLOAT.",
    );
  }
  if (this._pixelDatatype === PixelDatatype.HALF_FLOAT) {
    throw new DeveloperError(
      "Cannot call copyFromFramebuffer when the texture pixel data type is HALF_FLOAT.",
    );
  }
  if (PixelFormat.isCompressedFormat(this._pixelFormat)) {
    throw new DeveloperError(
      "Cannot call copyFrom with a compressed texture pixel format.",
    );
  }

  Check.typeOf.number.greaterThanOrEquals("xOffset", xOffset, 0);
  Check.typeOf.number.greaterThanOrEquals("yOffset", yOffset, 0);
  Check.typeOf.number.greaterThanOrEquals(
    "framebufferXOffset",
    framebufferXOffset,
    0,
  );
  Check.typeOf.number.greaterThanOrEquals(
    "framebufferYOffset",
    framebufferYOffset,
    0,
  );
  Check.typeOf.number.lessThanOrEquals(
    "xOffset + width",
    xOffset + width,
    this._width,
  );
  Check.typeOf.number.lessThanOrEquals(
    "yOffset + height",
    yOffset + height,
    this._height,
  );
  //>>includeEnd('debug');

  const gl = this._context._gl;
  const target = this._textureTarget;

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(target, this._texture);
  gl.copyTexSubImage2D(
    target,
    0,
    xOffset,
    yOffset,
    framebufferXOffset,
    framebufferYOffset,
    width,
    height,
  );
  gl.bindTexture(target, null);
  this._initialized = true;
};

/**
 * @param {MipmapHint} [hint=MipmapHint.DONT_CARE] optional.
 *
 * @exception {DeveloperError} Cannot call generateMipmap when the texture pixel format is DEPTH_COMPONENT or DEPTH_STENCIL.
 * @exception {DeveloperError} Cannot call generateMipmap when the texture pixel format is a compressed format.
 * @exception {DeveloperError} hint is invalid.
 * @exception {DeveloperError} This texture's width must be a power of two to call generateMipmap() in a WebGL1 context.
 * @exception {DeveloperError} This texture's height must be a power of two to call generateMipmap() in a WebGL1 context.
 * @exception {DeveloperError} This texture was destroyed, i.e., destroy() was called.
 */
Texture.prototype.generateMipmap = function (hint) {
  hint = defaultValue(hint, MipmapHint.DONT_CARE);

  //>>includeStart('debug', pragmas.debug);
  if (PixelFormat.isDepthFormat(this._pixelFormat)) {
    throw new DeveloperError(
      "Cannot call generateMipmap when the texture pixel format is DEPTH_COMPONENT or DEPTH_STENCIL.",
    );
  }
  if (PixelFormat.isCompressedFormat(this._pixelFormat)) {
    throw new DeveloperError(
      "Cannot call generateMipmap with a compressed pixel format.",
    );
  }
  if (!this._context.webgl2) {
    if (this._width > 1 && !CesiumMath.isPowerOfTwo(this._width)) {
      throw new DeveloperError(
        "width must be a power of two to call generateMipmap() in a WebGL1 context.",
      );
    }
    if (this._height > 1 && !CesiumMath.isPowerOfTwo(this._height)) {
      throw new DeveloperError(
        "height must be a power of two to call generateMipmap() in a WebGL1 context.",
      );
    }
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

Texture.prototype.isDestroyed = function () {
  return false;
};

Texture.prototype.destroy = function () {
  this._context._gl.deleteTexture(this._texture);
  return destroyObject(this);
};
export default Texture;
