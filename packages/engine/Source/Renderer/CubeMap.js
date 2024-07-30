import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import CesiumMath from "../Core/Math.js";
import PixelFormat from "../Core/PixelFormat.js";
import ContextLimits from "./ContextLimits.js";
import CubeMapFace from "./CubeMapFace.js";
import MipmapHint from "./MipmapHint.js";
import PixelDatatype from "./PixelDatatype.js";
import Sampler from "./Sampler.js";
import TextureMagnificationFilter from "./TextureMagnificationFilter.js";
import TextureMinificationFilter from "./TextureMinificationFilter.js";

/**
 * @typedef CubeMap.ConstructorOptions
 *
 * @property {Context} context
 * @property {object} [source] The source for texel values to be loaded into the texture
 * @property {PixelFormat} [pixelFormat=PixelFormat.RGBA] The format of each pixel, i.e., the number of components it has and what they represent.
 * @property {PixelDatatype} [pixelDatatype=PixelDatatype.UNSIGNED_BYTE] The data type of each pixel.
 * @property {boolean} [flipY=true] If true, the source values will be read as if the y-axis is inverted (y=0 at the top).
 * @property {boolean} [skipColorSpaceConversion=false] If true, color space conversions will be skipped when reading the texel values.
 * @property {Sampler} [sampler] Information about how to sample the cubemap texture.
 * @property {number} [width] The pixel width of the texture. If not supplied, must be available from the source. Must be equal to height.
 * @property {number} [height] The pixel height of the texture. If not supplied, must be available from the source. Must be equal to width.
 * @property {boolean} [preMultiplyAlpha] If true, the alpha channel will be multiplied into the other channels.
 *
 * @private
 */

/**
 * A wrapper for a {@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLTexture|WebGLTexture}
 * used as a cube map, to abstract away the verbose GL calls associated with setting up a texture.
 *
 * @alias CubeMap
 * @constructor
 *
 * @param {CubeMap.ConstructorOptions} options An object describing initialization options.
 * @private
 */
function CubeMap(options) {
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

  // Use premultiplied alpha for opaque textures should perform better on Chrome:
  // http://media.tojicode.com/webglCamp4/#20
  const preMultiplyAlpha =
    options.preMultiplyAlpha ||
    pixelFormat === PixelFormat.RGB ||
    pixelFormat === PixelFormat.LUMINANCE;

  let { width, height } = options;

  const faceNames = CubeMap.faceNames;

  if (defined(source)) {
    //>>includeStart('debug', pragmas.debug);
    if (!faceNames.every((faceName) => defined(source[faceName]))) {
      throw new DeveloperError(
        `options.source requires faces ${faceNames.join(", ")}.`
      );
    }
    //>>includeEnd('debug');

    ({ width, height } = source[faceNames[0]]);

    //>>includeStart('debug', pragmas.debug);
    for (let i = 1; i < 6; ++i) {
      const face = source[faceNames[i]];
      if (Number(face.width) !== width || Number(face.height) !== height) {
        throw new DeveloperError(
          "Each face in options.source must have the same width and height."
        );
      }
    }
    //>>includeEnd('debug');
  }

  const size = width;

  //>>includeStart('debug', pragmas.debug);
  if (!defined(width) || !defined(height)) {
    throw new DeveloperError(
      "options requires a source field to create an initialized cube map or width and height fields to create a blank cube map."
    );
  }

  if (width !== height) {
    throw new DeveloperError("Width must equal height.");
  }

  if (size <= 0) {
    throw new DeveloperError("Width and height must be greater than zero.");
  }

  if (size > ContextLimits.maximumCubeMapSize) {
    throw new DeveloperError(
      `Width and height must be less than or equal to the maximum cube map size (${ContextLimits.maximumCubeMapSize}). Check maximumCubeMapSize.`
    );
  }

  if (!PixelFormat.validate(pixelFormat)) {
    throw new DeveloperError("Invalid options.pixelFormat.");
  }

  if (PixelFormat.isDepthFormat(pixelFormat)) {
    throw new DeveloperError(
      "options.pixelFormat cannot be DEPTH_COMPONENT or DEPTH_STENCIL."
    );
  }

  if (!PixelDatatype.validate(pixelDatatype)) {
    throw new DeveloperError("Invalid options.pixelDatatype.");
  }

  if (pixelDatatype === PixelDatatype.FLOAT && !context.floatingPointTexture) {
    throw new DeveloperError(
      "When options.pixelDatatype is FLOAT, this WebGL implementation must support the OES_texture_float extension."
    );
  }

  if (
    pixelDatatype === PixelDatatype.HALF_FLOAT &&
    !context.halfFloatingPointTexture
  ) {
    throw new DeveloperError(
      "When options.pixelDatatype is HALF_FLOAT, this WebGL implementation must support the OES_texture_half_float extension."
    );
  }
  //>>includeEnd('debug');

  const sizeInBytes =
    PixelFormat.textureSizeInBytes(pixelFormat, pixelDatatype, size, size) * 6;
  const internalFormat = PixelFormat.toInternalFormat(
    pixelFormat,
    pixelDatatype,
    context
  );

  const gl = context._gl;
  const textureTarget = gl.TEXTURE_CUBE_MAP;
  const texture = gl.createTexture();

  this._context = context;
  this._textureFilterAnisotropic = context._textureFilterAnisotropic;
  this._textureTarget = textureTarget;
  this._texture = texture;
  this._pixelFormat = pixelFormat;
  this._pixelDatatype = pixelDatatype;
  this._size = size;
  this._hasMipmap = false;
  this._sizeInBytes = sizeInBytes;
  this._preMultiplyAlpha = preMultiplyAlpha;
  this._flipY = flipY;

  const initialized = defined(source);
  function constructFace(targetFace) {
    return new CubeMapFace(
      context,
      texture,
      textureTarget,
      targetFace,
      internalFormat,
      pixelFormat,
      pixelDatatype,
      size,
      preMultiplyAlpha,
      flipY,
      initialized
    );
  }
  this._positiveX = constructFace(gl.TEXTURE_CUBE_MAP_POSITIVE_X);
  this._negativeX = constructFace(gl.TEXTURE_CUBE_MAP_NEGATIVE_X);
  this._positiveY = constructFace(gl.TEXTURE_CUBE_MAP_POSITIVE_Y);
  this._negativeY = constructFace(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y);
  this._positiveZ = constructFace(gl.TEXTURE_CUBE_MAP_POSITIVE_Z);
  this._negativeZ = constructFace(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z);

  this._sampler = sampler;
  setupSampler(this, sampler);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(textureTarget, texture);

  if (skipColorSpaceConversion) {
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  } else {
    gl.pixelStorei(
      gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,
      gl.BROWSER_DEFAULT_WEBGL
    );
  }

  for (let i = 0; i < faceNames.length; i++) {
    const faceName = faceNames[i];
    loadFace(this[faceName], source?.[faceName], 0);
  }

  gl.bindTexture(textureTarget, null);
}

CubeMap.faceNames = Object.freeze([
  "positiveX",
  "negativeX",
  "positiveY",
  "negativeY",
  "positiveZ",
  "negativeZ",
]);

/**
 * Creates a CubeMap, using a texel data source that includes pre-generated mipmaps.
 *
 * @param {CubeMap.ConstructorOptions} options An object describing initialization options.
 * @returns {CubeMap}
 *
 * @private
 */
CubeMap.fromMipmaps = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const { source, skipColorSpaceConversion } = options;

  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.source", source);

  if (!Array.isArray(source)) {
    throw new DeveloperError(`options.source must be an array`);
  }
  const faceSize = source[0].positiveX.width;
  const mipCount = Math.log2(faceSize) + 1;
  if (source.length !== mipCount) {
    throw new DeveloperError(`all mip levels must be defined`);
  }
  // TODO: Verify that the structure of each mip level matches the first.
  //>>includeEnd('debug');

  options.source = source[0];
  const cubeMap = new CubeMap(options);

  const gl = cubeMap._context._gl;
  const texture = cubeMap._texture;
  const textureTarget = cubeMap._textureTarget;

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(textureTarget, texture);

  if (skipColorSpaceConversion) {
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  } else {
    gl.pixelStorei(
      gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,
      gl.BROWSER_DEFAULT_WEBGL
    );
  }

  const faceNames = CubeMap.faceNames;
  for (let mipLevel = 1; mipLevel < source.length; mipLevel++) {
    const mipSource = source[mipLevel];
    for (let j = 0; j < faceNames.length; j++) {
      const faceName = faceNames[j];
      loadFace(cubeMap[faceName], mipSource[faceName], mipLevel);
    }
  }

  gl.bindTexture(textureTarget, null);

  cubeMap._hasMipmap = true;

  return cubeMap;
};

/**
 * Load texel data into one face of a cube map.
 *
 * @param {CubeMapFace} cubeMapFace The face to which texel values will be loaded.
 * @param {object} [source] The source for texel values to be loaded into the texture.
 * @param {number} mipLevel The mip level to which the texel values will be loaded.
 *
 * @private
 */
function loadFace(cubeMapFace, source, mipLevel) {
  const targetFace = cubeMapFace._targetFace;
  const size = Math.max(Math.floor(cubeMapFace._size / 2 ** mipLevel), 1);
  const pixelFormat = cubeMapFace._pixelFormat;
  const pixelDatatype = cubeMapFace._pixelDatatype;
  const internalFormat = cubeMapFace._internalFormat;
  const flipY = cubeMapFace._flipY;
  const preMultiplyAlpha = cubeMapFace._preMultiplyAlpha;
  const context = cubeMapFace._context;
  const gl = context._gl;

  if (!defined(source)) {
    gl.texImage2D(
      targetFace,
      mipLevel,
      internalFormat,
      size,
      size,
      0,
      pixelFormat,
      PixelDatatype.toWebGLConstant(pixelDatatype, context),
      null
    );
    return;
  }

  const { arrayBufferView = source.bufferView } = source;

  let unpackAlignment = 4;
  if (defined(arrayBufferView)) {
    unpackAlignment = PixelFormat.alignmentInBytes(
      pixelFormat,
      pixelDatatype,
      size
    );
  }
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, unpackAlignment);

  let pixels;
  if (defined(arrayBufferView)) {
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    if (flipY) {
      pixels = PixelFormat.flipY(
        arrayBufferView,
        pixelFormat,
        pixelDatatype,
        size,
        size
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

  gl.texImage2D(
    targetFace,
    mipLevel,
    internalFormat,
    size,
    size,
    0,
    pixelFormat,
    PixelDatatype.toWebGLConstant(pixelDatatype, context),
    pixels
  );
}

Object.defineProperties(CubeMap.prototype, {
  positiveX: {
    get: function () {
      return this._positiveX;
    },
  },
  negativeX: {
    get: function () {
      return this._negativeX;
    },
  },
  positiveY: {
    get: function () {
      return this._positiveY;
    },
  },
  negativeY: {
    get: function () {
      return this._negativeY;
    },
  },
  positiveZ: {
    get: function () {
      return this._positiveZ;
    },
  },
  negativeZ: {
    get: function () {
      return this._negativeZ;
    },
  },
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
  width: {
    get: function () {
      return this._size;
    },
  },
  height: {
    get: function () {
      return this._size;
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

  _target: {
    get: function () {
      return this._textureTarget;
    },
  },
});

/**
 * Set up a sampler for use with a cube map.
 * @param {CubeMap} cubeMap The cube map containing the texture to be sampled by this sampler.
 * @param {Sampler} sampler Information about how to sample the cubemap texture.
 * @private
 */
function setupSampler(cubeMap, sampler) {
  let { minificationFilter, magnificationFilter } = sampler;

  const mipmap = [
    TextureMinificationFilter.NEAREST_MIPMAP_NEAREST,
    TextureMinificationFilter.NEAREST_MIPMAP_LINEAR,
    TextureMinificationFilter.LINEAR_MIPMAP_NEAREST,
    TextureMinificationFilter.LINEAR_MIPMAP_LINEAR,
  ].includes(minificationFilter);

  const context = cubeMap._context;
  const pixelDatatype = cubeMap._pixelDatatype;

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

  const gl = context._gl;
  const target = cubeMap._textureTarget;

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(target, cubeMap._texture);
  gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, minificationFilter);
  gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, magnificationFilter);
  gl.texParameteri(target, gl.TEXTURE_WRAP_S, sampler.wrapS);
  gl.texParameteri(target, gl.TEXTURE_WRAP_T, sampler.wrapT);
  if (defined(cubeMap._textureFilterAnisotropic)) {
    gl.texParameteri(
      target,
      cubeMap._textureFilterAnisotropic.TEXTURE_MAX_ANISOTROPY_EXT,
      sampler.maximumAnisotropy
    );
  }
  gl.bindTexture(target, null);
}

/**
 * Generates a complete mipmap chain for each cubemap face.
 *
 * @param {MipmapHint} [hint=MipmapHint.DONT_CARE] A performance vs. quality hint.
 *
 * @exception {DeveloperError} hint is invalid.
 * @exception {DeveloperError} This CubeMap's width must be a power of two to call generateMipmap().
 * @exception {DeveloperError} This CubeMap's height must be a power of two to call generateMipmap().
 * @exception {DeveloperError} This CubeMap was destroyed, i.e., destroy() was called.
 *
 * @example
 * // Generate mipmaps, and then set the sampler so mipmaps are used for
 * // minification when the cube map is sampled.
 * cubeMap.generateMipmap();
 * cubeMap.sampler = new Sampler({
 *   minificationFilter : Cesium.TextureMinificationFilter.NEAREST_MIPMAP_LINEAR
 * });
 */
CubeMap.prototype.generateMipmap = function (hint) {
  hint = defaultValue(hint, MipmapHint.DONT_CARE);

  //>>includeStart('debug', pragmas.debug);
  if (this._size > 1 && !CesiumMath.isPowerOfTwo(this._size)) {
    throw new DeveloperError(
      "width and height must be a power of two to call generateMipmap()."
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

CubeMap.prototype.isDestroyed = function () {
  return false;
};

CubeMap.prototype.destroy = function () {
  this._context._gl.deleteTexture(this._texture);
  this._positiveX = destroyObject(this._positiveX);
  this._negativeX = destroyObject(this._negativeX);
  this._positiveY = destroyObject(this._positiveY);
  this._negativeY = destroyObject(this._negativeY);
  this._positiveZ = destroyObject(this._positiveZ);
  this._negativeZ = destroyObject(this._negativeZ);
  return destroyObject(this);
};
export default CubeMap;
