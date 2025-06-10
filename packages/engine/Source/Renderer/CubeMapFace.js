import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import PixelFormat from "../Core/PixelFormat.js";
import PixelDatatype from "./PixelDatatype.js";

/**
 * @private
 */
function CubeMapFace(
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
  initialized,
) {
  this._context = context;
  this._texture = texture;
  this._textureTarget = textureTarget;
  this._targetFace = targetFace;
  this._pixelDatatype = pixelDatatype;
  this._internalFormat = internalFormat;
  this._pixelFormat = pixelFormat;
  this._size = size;
  this._preMultiplyAlpha = preMultiplyAlpha;
  this._flipY = flipY;
  this._initialized = initialized;
}

Object.defineProperties(CubeMapFace.prototype, {
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
  _target: {
    get: function () {
      return this._targetFace;
    },
  },
});

/**
 * Copies texels from the source to the cubemap's face.
 * @param {object} options Object with the following properties:
 * @param {object} options.source The source {@link ImageData}, {@link HTMLImageElement}, {@link HTMLCanvasElement}, {@link HTMLVideoElement},
 *                              or an object with a width, height, and arrayBufferView properties.
 * @param {number} [options.xOffset=0] An offset in the x direction in the cubemap where copying begins.
 * @param {number} [options.yOffset=0] An offset in the y direction in the cubemap where copying begins.
 * @param {boolean} [options.skipColorSpaceConversion=false] If true, any custom gamma or color profiles in the texture will be ignored.
 * @exception {DeveloperError} xOffset must be greater than or equal to zero.
 * @exception {DeveloperError} yOffset must be greater than or equal to zero.
 * @exception {DeveloperError} xOffset + source.width must be less than or equal to width.
 * @exception {DeveloperError} yOffset + source.height must be less than or equal to height.
 * @exception {DeveloperError} This CubeMap was destroyed, i.e., destroy() was called.
 *
 * @example
 * // Create a cubemap with 1x1 faces, and make the +x face red.
 * const cubeMap = new CubeMap({
 *   context : context
 *   width : 1,
 *   height : 1
 * });
 * cubeMap.positiveX.copyFrom({
 *   source: {
 *     width : 1,
 *     height : 1,
 *     arrayBufferView : new Uint8Array([255, 0, 0, 255])
 *   }
 * });
 */
CubeMapFace.prototype.copyFrom = function (options) {
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
  Check.typeOf.number.greaterThanOrEquals("xOffset", xOffset, 0);
  Check.typeOf.number.greaterThanOrEquals("yOffset", yOffset, 0);
  if (xOffset + source.width > this._size) {
    throw new DeveloperError(
      "xOffset + options.source.width must be less than or equal to width.",
    );
  }
  if (yOffset + source.height > this._size) {
    throw new DeveloperError(
      "yOffset + options.source.height must be less than or equal to height.",
    );
  }
  //>>includeEnd('debug');

  const { width, height } = source;

  const gl = this._context._gl;
  const target = this._textureTarget;
  const targetFace = this._targetFace;

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(target, this._texture);

  let arrayBufferView = source.arrayBufferView;

  const size = this._size;
  const pixelFormat = this._pixelFormat;
  const internalFormat = this._internalFormat;
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
    if (xOffset === 0 && yOffset === 0 && width === size && height === size) {
      // initialize the entire texture
      if (defined(arrayBufferView)) {
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        if (flipY) {
          arrayBufferView = PixelFormat.flipY(
            arrayBufferView,
            pixelFormat,
            pixelDatatype,
            size,
            size,
          );
        }
        pixels = arrayBufferView;
      } else {
        // Only valid for DOM-Element uploads
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, preMultiplyAlpha);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);
        pixels = source;
      }
      uploaded = true;
    } else {
      // initialize the entire texture to zero
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      pixels = PixelFormat.createTypedArray(
        pixelFormat,
        pixelDatatype,
        size,
        size,
      );
    }
    gl.texImage2D(
      targetFace,
      0,
      internalFormat,
      size,
      size,
      0,
      pixelFormat,
      PixelDatatype.toWebGLConstant(pixelDatatype, this._context),
      pixels,
    );
    this._initialized = true;
  }

  if (!uploaded) {
    if (defined(arrayBufferView)) {
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

      if (flipY) {
        arrayBufferView = PixelFormat.flipY(
          arrayBufferView,
          pixelFormat,
          pixelDatatype,
          width,
          height,
        );
      }
      gl.texSubImage2D(
        targetFace,
        0,
        xOffset,
        yOffset,
        width,
        height,
        pixelFormat,
        PixelDatatype.toWebGLConstant(pixelDatatype, this._context),
        arrayBufferView,
      );
    } else {
      // Only valid for DOM-Element uploads
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, preMultiplyAlpha);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);

      // Source: ImageData, HTMLImageElement, HTMLCanvasElement, or HTMLVideoElement
      gl.texSubImage2D(
        targetFace,
        0,
        xOffset,
        yOffset,
        pixelFormat,
        PixelDatatype.toWebGLConstant(pixelDatatype, this._context),
        source,
      );
    }
  }

  gl.bindTexture(target, null);
};

/**
 * Copies texels from the framebuffer to the cubemap's face.
 * @param {number} [xOffset=0] An offset in the x direction in the cubemap where copying begins.
 * @param {number} [yOffset=0] An offset in the y direction in the cubemap where copying begins.
 * @param {number} [framebufferXOffset=0] An offset in the x direction in the framebuffer where copying begins from.
 * @param {number} [framebufferYOffset=0] An offset in the y direction in the framebuffer where copying begins from.
 * @param {number} [width=CubeMap's width] The width of the subimage to copy.
 * @param {number} [height=CubeMap's height] The height of the subimage to copy.
 * @throws {DeveloperError} Cannot call copyFromFramebuffer when the texture pixel data type is FLOAT.
 * @throws {DeveloperError} Cannot call copyFromFramebuffer when the texture pixel data type is HALF_FLOAT.
 * @throws {DeveloperError} This CubeMap was destroyed, i.e., destroy() was called.
 * @throws {DeveloperError} xOffset must be greater than or equal to zero.
 * @throws {DeveloperError} yOffset must be greater than or equal to zero.
 * @throws {DeveloperError} framebufferXOffset must be greater than or equal to zero.
 * @throws {DeveloperError} framebufferYOffset must be greater than or equal to zero.
 * @throws {DeveloperError} xOffset + source.width must be less than or equal to width.
 * @throws {DeveloperError} yOffset + source.height must be less than or equal to height.
 * @throws {DeveloperError} This CubeMap was destroyed, i.e., destroy() was called.
 * @example
 * // Copy the framebuffer contents to the +x cube map face.
 * cubeMap.positiveX.copyFromFramebuffer();
 */
CubeMapFace.prototype.copyFromFramebuffer = function (
  xOffset,
  yOffset,
  framebufferXOffset,
  framebufferYOffset,
  width,
  height,
) {
  xOffset = xOffset ?? 0;
  yOffset = yOffset ?? 0;
  framebufferXOffset = framebufferXOffset ?? 0;
  framebufferYOffset = framebufferYOffset ?? 0;
  width = width ?? this._size;
  height = height ?? this._size;

  //>>includeStart('debug', pragmas.debug);
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
  if (xOffset + width > this._size) {
    throw new DeveloperError(
      "xOffset + source.width must be less than or equal to width.",
    );
  }
  if (yOffset + height > this._size) {
    throw new DeveloperError(
      "yOffset + source.height must be less than or equal to height.",
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
  //>>includeEnd('debug');

  const gl = this._context._gl;
  const target = this._textureTarget;

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(target, this._texture);
  gl.copyTexSubImage2D(
    this._targetFace,
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
 * Copies texels from the framebuffer to the cubemap's face mipmap.
 * @param {number} [xOffset=0] An offset in the x direction in the framebuffer where copying begins from.
 * @param {number} [yOffset=0] An offset in the y direction in the framebuffer where copying begins from.
 * @param {number} [width=CubeMap's width] The width of the subimage to copy.
 * @param {number} [height=CubeMap's height] The height of the subimage to copy.
 * @param {number} [level=0] The level of detail. Level 0 is the base image level and level n is the n-th mipmap reduction level.
 * @throws {DeveloperError} Cannot call copyFromFramebuffer when the texture pixel data type is FLOAT.
 * @throws {DeveloperError} Cannot call copyFromFramebuffer when the texture pixel data type is HALF_FLOAT.
 * @throws {DeveloperError} This CubeMap was destroyed, i.e., destroy() was called.
 * @throws {DeveloperError} xOffset must be greater than or equal to zero.
 * @throws {DeveloperError} yOffset must be greater than or equal to zero.
 * @throws {DeveloperError} framebufferXOffset must be greater than or equal to zero.
 * @throws {DeveloperError} framebufferYOffset must be greater than or equal to zero.
 * @throws {DeveloperError} xOffset + source.width must be less than or equal to width.
 * @throws {DeveloperError} yOffset + source.height must be less than or equal to height.
 * @throws {DeveloperError} This CubeMap was destroyed, i.e., destroy() was called.
 *
 * @example
 * // Copy the framebuffer contents to the +x cube map face.
 * cubeMap.positiveX.copyFromFramebuffer();
 */
CubeMapFace.prototype.copyMipmapFromFramebuffer = function (
  xOffset,
  yOffset,
  width,
  height,
  level,
) {
  xOffset = xOffset ?? 0;
  yOffset = yOffset ?? 0;
  width = width ?? this._size;
  height = height ?? this._size;
  level = level ?? 0;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number.greaterThanOrEquals("xOffset", xOffset, 0);
  Check.typeOf.number.greaterThanOrEquals("yOffset", yOffset, 0);

  if (xOffset + width > this._size) {
    throw new DeveloperError(
      "xOffset + source.width must be less than or equal to width.",
    );
  }
  if (yOffset + height > this._size) {
    throw new DeveloperError(
      "yOffset + source.height must be less than or equal to height.",
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
  //>>includeEnd('debug');

  const gl = this._context._gl;
  const target = this._textureTarget;

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(target, this._texture);
  gl.copyTexImage2D(
    this._targetFace,
    level,
    this._internalFormat,
    xOffset,
    yOffset,
    width,
    height,
    0,
  );
  gl.bindTexture(target, null);
  this._initialized = true;
};
export default CubeMapFace;
