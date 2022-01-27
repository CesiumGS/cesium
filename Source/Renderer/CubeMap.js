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
 * @private
 */
function CubeMap(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.context", options.context);
  //>>includeEnd('debug');

  const context = options.context;
  const source = options.source;
  let width;
  let height;

  if (defined(source)) {
    const faces = [
      source.positiveX,
      source.negativeX,
      source.positiveY,
      source.negativeY,
      source.positiveZ,
      source.negativeZ,
    ];

    //>>includeStart('debug', pragmas.debug);
    if (
      !faces[0] ||
      !faces[1] ||
      !faces[2] ||
      !faces[3] ||
      !faces[4] ||
      !faces[5]
    ) {
      throw new DeveloperError(
        "options.source requires positiveX, negativeX, positiveY, negativeY, positiveZ, and negativeZ faces."
      );
    }
    //>>includeEnd('debug');

    width = faces[0].width;
    height = faces[0].height;

    //>>includeStart('debug', pragmas.debug);
    for (let i = 1; i < 6; ++i) {
      if (
        Number(faces[i].width) !== width ||
        Number(faces[i].height) !== height
      ) {
        throw new DeveloperError(
          "Each face in options.source must have the same width and height."
        );
      }
    }
    //>>includeEnd('debug');
  } else {
    width = options.width;
    height = options.height;
  }

  const size = width;
  const pixelDatatype = defaultValue(
    options.pixelDatatype,
    PixelDatatype.UNSIGNED_BYTE
  );
  const pixelFormat = defaultValue(options.pixelFormat, PixelFormat.RGBA);
  const internalFormat = PixelFormat.toInternalFormat(
    pixelFormat,
    pixelDatatype,
    context
  );

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
      "Width and height must be less than or equal to the maximum cube map size (" +
        ContextLimits.maximumCubeMapSize +
        ").  Check maximumCubeMapSize."
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

  // Use premultiplied alpha for opaque textures should perform better on Chrome:
  // http://media.tojicode.com/webglCamp4/#20
  const preMultiplyAlpha =
    options.preMultiplyAlpha ||
    pixelFormat === PixelFormat.RGB ||
    pixelFormat === PixelFormat.LUMINANCE;
  const flipY = defaultValue(options.flipY, true);
  const skipColorSpaceConversion = defaultValue(
    options.skipColorSpaceConversion,
    false
  );

  const gl = context._gl;
  const textureTarget = gl.TEXTURE_CUBE_MAP;
  const texture = gl.createTexture();

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(textureTarget, texture);

  function createFace(
    target,
    sourceFace,
    preMultiplyAlpha,
    flipY,
    skipColorSpaceConversion
  ) {
    let arrayBufferView = sourceFace.arrayBufferView;
    if (!defined(arrayBufferView)) {
      arrayBufferView = sourceFace.bufferView;
    }

    let unpackAlignment = 4;
    if (defined(arrayBufferView)) {
      unpackAlignment = PixelFormat.alignmentInBytes(
        pixelFormat,
        pixelDatatype,
        width
      );
    }

    gl.pixelStorei(gl.UNPACK_ALIGNMENT, unpackAlignment);

    if (skipColorSpaceConversion) {
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    } else {
      gl.pixelStorei(
        gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,
        gl.BROWSER_DEFAULT_WEBGL
      );
    }

    if (defined(arrayBufferView)) {
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

      if (flipY) {
        arrayBufferView = PixelFormat.flipY(
          arrayBufferView,
          pixelFormat,
          pixelDatatype,
          size,
          size
        );
      }
      gl.texImage2D(
        target,
        0,
        internalFormat,
        size,
        size,
        0,
        pixelFormat,
        PixelDatatype.toWebGLConstant(pixelDatatype, context),
        arrayBufferView
      );
    } else {
      // Only valid for DOM-Element uploads
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, preMultiplyAlpha);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);

      // Source: ImageData, HTMLImageElement, HTMLCanvasElement, or HTMLVideoElement
      gl.texImage2D(
        target,
        0,
        internalFormat,
        pixelFormat,
        PixelDatatype.toWebGLConstant(pixelDatatype, context),
        sourceFace
      );
    }
  }

  if (defined(source)) {
    createFace(
      gl.TEXTURE_CUBE_MAP_POSITIVE_X,
      source.positiveX,
      preMultiplyAlpha,
      flipY,
      skipColorSpaceConversion
    );
    createFace(
      gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
      source.negativeX,
      preMultiplyAlpha,
      flipY,
      skipColorSpaceConversion
    );
    createFace(
      gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
      source.positiveY,
      preMultiplyAlpha,
      flipY,
      skipColorSpaceConversion
    );
    createFace(
      gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
      source.negativeY,
      preMultiplyAlpha,
      flipY,
      skipColorSpaceConversion
    );
    createFace(
      gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
      source.positiveZ,
      preMultiplyAlpha,
      flipY,
      skipColorSpaceConversion
    );
    createFace(
      gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
      source.negativeZ,
      preMultiplyAlpha,
      flipY,
      skipColorSpaceConversion
    );
  } else {
    gl.texImage2D(
      gl.TEXTURE_CUBE_MAP_POSITIVE_X,
      0,
      internalFormat,
      size,
      size,
      0,
      pixelFormat,
      PixelDatatype.toWebGLConstant(pixelDatatype, context),
      null
    );
    gl.texImage2D(
      gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
      0,
      internalFormat,
      size,
      size,
      0,
      pixelFormat,
      PixelDatatype.toWebGLConstant(pixelDatatype, context),
      null
    );
    gl.texImage2D(
      gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
      0,
      internalFormat,
      size,
      size,
      0,
      pixelFormat,
      PixelDatatype.toWebGLConstant(pixelDatatype, context),
      null
    );
    gl.texImage2D(
      gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
      0,
      internalFormat,
      size,
      size,
      0,
      pixelFormat,
      PixelDatatype.toWebGLConstant(pixelDatatype, context),
      null
    );
    gl.texImage2D(
      gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
      0,
      internalFormat,
      size,
      size,
      0,
      pixelFormat,
      PixelDatatype.toWebGLConstant(pixelDatatype, context),
      null
    );
    gl.texImage2D(
      gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
      0,
      internalFormat,
      size,
      size,
      0,
      pixelFormat,
      PixelDatatype.toWebGLConstant(pixelDatatype, context),
      null
    );
  }
  gl.bindTexture(textureTarget, null);

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
  this._sampler = undefined;

  const initialized = defined(source);
  this._positiveX = new CubeMapFace(
    context,
    texture,
    textureTarget,
    gl.TEXTURE_CUBE_MAP_POSITIVE_X,
    internalFormat,
    pixelFormat,
    pixelDatatype,
    size,
    preMultiplyAlpha,
    flipY,
    initialized
  );
  this._negativeX = new CubeMapFace(
    context,
    texture,
    textureTarget,
    gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
    internalFormat,
    pixelFormat,
    pixelDatatype,
    size,
    preMultiplyAlpha,
    flipY,
    initialized
  );
  this._positiveY = new CubeMapFace(
    context,
    texture,
    textureTarget,
    gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
    internalFormat,
    pixelFormat,
    pixelDatatype,
    size,
    preMultiplyAlpha,
    flipY,
    initialized
  );
  this._negativeY = new CubeMapFace(
    context,
    texture,
    textureTarget,
    gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
    internalFormat,
    pixelFormat,
    pixelDatatype,
    size,
    preMultiplyAlpha,
    flipY,
    initialized
  );
  this._positiveZ = new CubeMapFace(
    context,
    texture,
    textureTarget,
    gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
    internalFormat,
    pixelFormat,
    pixelDatatype,
    size,
    preMultiplyAlpha,
    flipY,
    initialized
  );
  this._negativeZ = new CubeMapFace(
    context,
    texture,
    textureTarget,
    gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
    internalFormat,
    pixelFormat,
    pixelDatatype,
    size,
    preMultiplyAlpha,
    flipY,
    initialized
  );

  this.sampler = defined(options.sampler) ? options.sampler : new Sampler();
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
      let minificationFilter = sampler.minificationFilter;
      let magnificationFilter = sampler.magnificationFilter;

      const mipmap =
        minificationFilter ===
          TextureMinificationFilter.NEAREST_MIPMAP_NEAREST ||
        minificationFilter ===
          TextureMinificationFilter.NEAREST_MIPMAP_LINEAR ||
        minificationFilter ===
          TextureMinificationFilter.LINEAR_MIPMAP_NEAREST ||
        minificationFilter === TextureMinificationFilter.LINEAR_MIPMAP_LINEAR;

      const context = this._context;
      const pixelDatatype = this._pixelDatatype;

      // float textures only support nearest filtering unless the linear extensions are supported, so override the sampler's settings
      if (
        (pixelDatatype === PixelDatatype.FLOAT &&
          !context.textureFloatLinear) ||
        (pixelDatatype === PixelDatatype.HALF_FLOAT &&
          !context.textureHalfFloatLinear)
      ) {
        minificationFilter = mipmap
          ? TextureMinificationFilter.NEAREST_MIPMAP_NEAREST
          : TextureMinificationFilter.NEAREST;
        magnificationFilter = TextureMagnificationFilter.NEAREST;
      }

      const gl = context._gl;
      const target = this._textureTarget;

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(target, this._texture);
      gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, minificationFilter);
      gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, magnificationFilter);
      gl.texParameteri(target, gl.TEXTURE_WRAP_S, sampler.wrapS);
      gl.texParameteri(target, gl.TEXTURE_WRAP_T, sampler.wrapT);
      if (defined(this._textureFilterAnisotropic)) {
        gl.texParameteri(
          target,
          this._textureFilterAnisotropic.TEXTURE_MAX_ANISOTROPY_EXT,
          sampler.maximumAnisotropy
        );
      }
      gl.bindTexture(target, null);

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
