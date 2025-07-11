import PixelDatatype from "../Renderer/PixelDatatype.js";
import WebGLConstants from "./WebGLConstants.js";

/**
 * The format of a pixel, i.e., the number of components it has and what they represent.
 *
 * @enum {number}
 */
const PixelFormat = {
  /**
   * A pixel format containing a depth value.
   *
   * @type {number}
   * @constant
   */
  DEPTH_COMPONENT: WebGLConstants.DEPTH_COMPONENT,

  /**
   * A pixel format containing a depth and stencil value, most often used with {@link PixelDatatype.UNSIGNED_INT_24_8}.
   *
   * @type {number}
   * @constant
   */
  DEPTH_STENCIL: WebGLConstants.DEPTH_STENCIL,

  /**
   * A pixel format containing an alpha channel.
   *
   * @type {number}
   * @constant
   */
  ALPHA: WebGLConstants.ALPHA,

  /**
   * A pixel format containing a red channel
   *
   * @type {number}
   * @constant
   */
  RED: WebGLConstants.RED,

  /**
   * A pixel format containing red and green channels.
   *
   * @type {number}
   * @constant
   */
  RG: WebGLConstants.RG,

  /**
   * A pixel format containing red, green, and blue channels.
   *
   * @type {number}
   * @constant
   */
  RGB: WebGLConstants.RGB,

  /**
   * A pixel format containing red, green, blue, and alpha channels.
   *
   * @type {number}
   * @constant
   */
  RGBA: WebGLConstants.RGBA,

  /**
   * A pixel format containing a red channel as an integer.
   * @type {number}
   * @constant
   */
  RED_INTEGER: WebGLConstants.RED_INTEGER,

  /**
   * A pixel format containing red and green channels as integers.
   * @type {number}
   * @constant
   */
  RG_INTEGER: WebGLConstants.RG_INTEGER,

  /**
   * A pixel format containing red, green, and blue channels as integers.
   * @type {number}
   * @constant
   */
  RGB_INTEGER: WebGLConstants.RGB_INTEGER,

  /**
   * A pixel format containing red, green, blue, and alpha channels as integers.
   * @type {number}
   * @constant
   */
  RGBA_INTEGER: WebGLConstants.RGBA_INTEGER,

  /**
   * A pixel format containing a luminance (intensity) channel.
   *
   * @type {number}
   * @constant
   */
  LUMINANCE: WebGLConstants.LUMINANCE,

  /**
   * A pixel format containing luminance (intensity) and alpha channels.
   *
   * @type {number}
   * @constant
   */
  LUMINANCE_ALPHA: WebGLConstants.LUMINANCE_ALPHA,

  /**
   * A pixel format containing red, green, and blue channels that is DXT1 compressed.
   *
   * @type {number}
   * @constant
   */
  RGB_DXT1: WebGLConstants.COMPRESSED_RGB_S3TC_DXT1_EXT,

  /**
   * A pixel format containing red, green, blue, and alpha channels that is DXT1 compressed.
   *
   * @type {number}
   * @constant
   */
  RGBA_DXT1: WebGLConstants.COMPRESSED_RGBA_S3TC_DXT1_EXT,

  /**
   * A pixel format containing red, green, blue, and alpha channels that is DXT3 compressed.
   *
   * @type {number}
   * @constant
   */
  RGBA_DXT3: WebGLConstants.COMPRESSED_RGBA_S3TC_DXT3_EXT,

  /**
   * A pixel format containing red, green, blue, and alpha channels that is DXT5 compressed.
   *
   * @type {number}
   * @constant
   */
  RGBA_DXT5: WebGLConstants.COMPRESSED_RGBA_S3TC_DXT5_EXT,

  /**
   * A pixel format containing red, green, and blue channels that is PVR 4bpp compressed.
   *
   * @type {number}
   * @constant
   */
  RGB_PVRTC_4BPPV1: WebGLConstants.COMPRESSED_RGB_PVRTC_4BPPV1_IMG,

  /**
   * A pixel format containing red, green, and blue channels that is PVR 2bpp compressed.
   *
   * @type {number}
   * @constant
   */
  RGB_PVRTC_2BPPV1: WebGLConstants.COMPRESSED_RGB_PVRTC_2BPPV1_IMG,

  /**
   * A pixel format containing red, green, blue, and alpha channels that is PVR 4bpp compressed.
   *
   * @type {number}
   * @constant
   */
  RGBA_PVRTC_4BPPV1: WebGLConstants.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG,

  /**
   * A pixel format containing red, green, blue, and alpha channels that is PVR 2bpp compressed.
   *
   * @type {number}
   * @constant
   */
  RGBA_PVRTC_2BPPV1: WebGLConstants.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG,

  /**
   * A pixel format containing red, green, blue, and alpha channels that is ASTC compressed.
   *
   * @type {number}
   * @constant
   */
  RGBA_ASTC: WebGLConstants.COMPRESSED_RGBA_ASTC_4x4_WEBGL,

  /**
   * A pixel format containing red, green, and blue channels that is ETC1 compressed.
   *
   * @type {number}
   * @constant
   */
  RGB_ETC1: WebGLConstants.COMPRESSED_RGB_ETC1_WEBGL,

  /**
   * A pixel format containing red, green, and blue channels that is ETC2 compressed.
   *
   * @type {number}
   * @constant
   */
  RGB8_ETC2: WebGLConstants.COMPRESSED_RGB8_ETC2,

  /**
   * A pixel format containing red, green, blue, and alpha channels that is ETC2 compressed.
   *
   * @type {number}
   * @constant
   */
  RGBA8_ETC2_EAC: WebGLConstants.COMPRESSED_RGBA8_ETC2_EAC,

  /**
   * A pixel format containing red, green, blue, and alpha channels that is BC7 compressed.
   *
   * @type {number}
   * @constant
   */
  RGBA_BC7: WebGLConstants.COMPRESSED_RGBA_BPTC_UNORM,
};

/**
 * @private
 */
PixelFormat.componentsLength = function (pixelFormat) {
  switch (pixelFormat) {
    case PixelFormat.RGB:
    case PixelFormat.RGB_INTEGER:
      return 3;
    case PixelFormat.RGBA:
    case PixelFormat.RGBA_INTEGER:
      return 4;
    case PixelFormat.LUMINANCE_ALPHA:
    case PixelFormat.RG:
    case PixelFormat.RG_INTEGER:
      return 2;
    case PixelFormat.ALPHA:
    case PixelFormat.RED:
    case PixelFormat.RED_INTEGER:
    case PixelFormat.LUMINANCE:
      return 1;
    default:
      return 1;
  }
};

/**
 * @private
 */
PixelFormat.validate = function (pixelFormat) {
  return (
    pixelFormat === PixelFormat.DEPTH_COMPONENT ||
    pixelFormat === PixelFormat.DEPTH_STENCIL ||
    pixelFormat === PixelFormat.ALPHA ||
    pixelFormat === PixelFormat.RED ||
    pixelFormat === PixelFormat.RG ||
    pixelFormat === PixelFormat.RGB ||
    pixelFormat === PixelFormat.RGBA ||
    pixelFormat === PixelFormat.RED_INTEGER ||
    pixelFormat === PixelFormat.RG_INTEGER ||
    pixelFormat === PixelFormat.RGB_INTEGER ||
    pixelFormat === PixelFormat.RGBA_INTEGER ||
    pixelFormat === PixelFormat.LUMINANCE ||
    pixelFormat === PixelFormat.LUMINANCE_ALPHA ||
    pixelFormat === PixelFormat.RGB_DXT1 ||
    pixelFormat === PixelFormat.RGBA_DXT1 ||
    pixelFormat === PixelFormat.RGBA_DXT3 ||
    pixelFormat === PixelFormat.RGBA_DXT5 ||
    pixelFormat === PixelFormat.RGB_PVRTC_4BPPV1 ||
    pixelFormat === PixelFormat.RGB_PVRTC_2BPPV1 ||
    pixelFormat === PixelFormat.RGBA_PVRTC_4BPPV1 ||
    pixelFormat === PixelFormat.RGBA_PVRTC_2BPPV1 ||
    pixelFormat === PixelFormat.RGBA_ASTC ||
    pixelFormat === PixelFormat.RGB_ETC1 ||
    pixelFormat === PixelFormat.RGB8_ETC2 ||
    pixelFormat === PixelFormat.RGBA8_ETC2_EAC ||
    pixelFormat === PixelFormat.RGBA_BC7
  );
};

/**
 * @private
 */
PixelFormat.isColorFormat = function (pixelFormat) {
  return (
    pixelFormat === PixelFormat.RED ||
    pixelFormat === PixelFormat.ALPHA ||
    pixelFormat === PixelFormat.RGB ||
    pixelFormat === PixelFormat.RGBA ||
    pixelFormat === PixelFormat.LUMINANCE ||
    pixelFormat === PixelFormat.LUMINANCE_ALPHA
  );
};

/**
 * @private
 */
PixelFormat.isDepthFormat = function (pixelFormat) {
  return (
    pixelFormat === PixelFormat.DEPTH_COMPONENT ||
    pixelFormat === PixelFormat.DEPTH_STENCIL
  );
};

/**
 * @private
 */
PixelFormat.isCompressedFormat = function (pixelFormat) {
  return (
    pixelFormat === PixelFormat.RGB_DXT1 ||
    pixelFormat === PixelFormat.RGBA_DXT1 ||
    pixelFormat === PixelFormat.RGBA_DXT3 ||
    pixelFormat === PixelFormat.RGBA_DXT5 ||
    pixelFormat === PixelFormat.RGB_PVRTC_4BPPV1 ||
    pixelFormat === PixelFormat.RGB_PVRTC_2BPPV1 ||
    pixelFormat === PixelFormat.RGBA_PVRTC_4BPPV1 ||
    pixelFormat === PixelFormat.RGBA_PVRTC_2BPPV1 ||
    pixelFormat === PixelFormat.RGBA_ASTC ||
    pixelFormat === PixelFormat.RGB_ETC1 ||
    pixelFormat === PixelFormat.RGB8_ETC2 ||
    pixelFormat === PixelFormat.RGBA8_ETC2_EAC ||
    pixelFormat === PixelFormat.RGBA_BC7
  );
};

/**
 * @private
 */
PixelFormat.isDXTFormat = function (pixelFormat) {
  return (
    pixelFormat === PixelFormat.RGB_DXT1 ||
    pixelFormat === PixelFormat.RGBA_DXT1 ||
    pixelFormat === PixelFormat.RGBA_DXT3 ||
    pixelFormat === PixelFormat.RGBA_DXT5
  );
};

/**
 * @private
 */
PixelFormat.isPVRTCFormat = function (pixelFormat) {
  return (
    pixelFormat === PixelFormat.RGB_PVRTC_4BPPV1 ||
    pixelFormat === PixelFormat.RGB_PVRTC_2BPPV1 ||
    pixelFormat === PixelFormat.RGBA_PVRTC_4BPPV1 ||
    pixelFormat === PixelFormat.RGBA_PVRTC_2BPPV1
  );
};

/**
 * @private
 */
PixelFormat.isASTCFormat = function (pixelFormat) {
  return pixelFormat === PixelFormat.RGBA_ASTC;
};

/**
 * @private
 */
PixelFormat.isETC1Format = function (pixelFormat) {
  return pixelFormat === PixelFormat.RGB_ETC1;
};

/**
 * @private
 */
PixelFormat.isETC2Format = function (pixelFormat) {
  return (
    pixelFormat === PixelFormat.RGB8_ETC2 ||
    pixelFormat === PixelFormat.RGBA8_ETC2_EAC
  );
};

/**
 * @private
 */
PixelFormat.isBC7Format = function (pixelFormat) {
  return pixelFormat === PixelFormat.RGBA_BC7;
};

/**
 * @private
 */
PixelFormat.compressedTextureSizeInBytes = function (
  pixelFormat,
  width,
  height,
) {
  switch (pixelFormat) {
    case PixelFormat.RGB_DXT1:
    case PixelFormat.RGBA_DXT1:
    case PixelFormat.RGB_ETC1:
    case PixelFormat.RGB8_ETC2:
      return Math.floor((width + 3) / 4) * Math.floor((height + 3) / 4) * 8;

    case PixelFormat.RGBA_DXT3:
    case PixelFormat.RGBA_DXT5:
    case PixelFormat.RGBA_ASTC:
    case PixelFormat.RGBA8_ETC2_EAC:
      return Math.floor((width + 3) / 4) * Math.floor((height + 3) / 4) * 16;

    case PixelFormat.RGB_PVRTC_4BPPV1:
    case PixelFormat.RGBA_PVRTC_4BPPV1:
      return Math.floor((Math.max(width, 8) * Math.max(height, 8) * 4 + 7) / 8);

    case PixelFormat.RGB_PVRTC_2BPPV1:
    case PixelFormat.RGBA_PVRTC_2BPPV1:
      return Math.floor(
        (Math.max(width, 16) * Math.max(height, 8) * 2 + 7) / 8,
      );

    case PixelFormat.RGBA_BC7:
      return Math.ceil(width / 4) * Math.ceil(height / 4) * 16;

    default:
      return 0;
  }
};

/**
 * @private
 */
PixelFormat.textureSizeInBytes = function (
  pixelFormat,
  pixelDatatype,
  width,
  height,
) {
  let componentsLength = PixelFormat.componentsLength(pixelFormat);
  if (PixelDatatype.isPacked(pixelDatatype)) {
    componentsLength = 1;
  }
  return (
    componentsLength * PixelDatatype.sizeInBytes(pixelDatatype) * width * height
  );
};

/**
 * @private
 */
PixelFormat.texture3DSizeInBytes = function (
  pixelFormat,
  pixelDatatype,
  width,
  height,
  depth,
) {
  let componentsLength = PixelFormat.componentsLength(pixelFormat);
  if (PixelDatatype.isPacked(pixelDatatype)) {
    componentsLength = 1;
  }
  return (
    componentsLength *
    PixelDatatype.sizeInBytes(pixelDatatype) *
    width *
    height *
    depth
  );
};

/**
 * @private
 */
PixelFormat.alignmentInBytes = function (pixelFormat, pixelDatatype, width) {
  const mod =
    PixelFormat.textureSizeInBytes(pixelFormat, pixelDatatype, width, 1) % 4;
  return mod === 0 ? 4 : mod === 2 ? 2 : 1;
};

/**
 * @private
 * @param {PixelFormat} pixelFormat The pixel format.
 * @param {PixelDatatype} pixelDatatype The pixel datatype.
 * @param {Number} width The width of the texture.
 * @param {Number} height The height of the texture.
 * @returns {TypedArray} The typed array.
 */
PixelFormat.createTypedArray = function (
  pixelFormat,
  pixelDatatype,
  width,
  height,
) {
  const constructor = PixelDatatype.getTypedArrayConstructor(pixelDatatype);
  const size = PixelFormat.componentsLength(pixelFormat) * width * height;
  return new constructor(size);
};

/**
 * @private
 */
PixelFormat.flipY = function (
  bufferView,
  pixelFormat,
  pixelDatatype,
  width,
  height,
) {
  if (height === 1) {
    return bufferView;
  }
  const flipped = PixelFormat.createTypedArray(
    pixelFormat,
    pixelDatatype,
    width,
    height,
  );
  const numberOfComponents = PixelFormat.componentsLength(pixelFormat);
  const textureWidth = width * numberOfComponents;
  for (let i = 0; i < height; ++i) {
    const row = i * width * numberOfComponents;
    const flippedRow = (height - i - 1) * width * numberOfComponents;
    for (let j = 0; j < textureWidth; ++j) {
      flipped[flippedRow + j] = bufferView[row + j];
    }
  }
  return flipped;
};

/**
 * @private
 */
PixelFormat.toInternalFormat = function (pixelFormat, pixelDatatype, context) {
  // WebGL 1 require internalFormat to be the same as PixelFormat
  if (!context.webgl2) {
    return pixelFormat;
  }

  // Convert pixelFormat to correct internalFormat for WebGL 2
  if (pixelFormat === PixelFormat.DEPTH_STENCIL) {
    return WebGLConstants.DEPTH24_STENCIL8;
  }

  if (pixelFormat === PixelFormat.DEPTH_COMPONENT) {
    if (pixelDatatype === PixelDatatype.UNSIGNED_SHORT) {
      return WebGLConstants.DEPTH_COMPONENT16;
    } else if (pixelDatatype === PixelDatatype.UNSIGNED_INT) {
      return WebGLConstants.DEPTH_COMPONENT24;
    }
  }

  if (pixelDatatype === PixelDatatype.FLOAT) {
    switch (pixelFormat) {
      case PixelFormat.RGBA:
        return WebGLConstants.RGBA32F;
      case PixelFormat.RGB:
        return WebGLConstants.RGB32F;
      case PixelFormat.RG:
        return WebGLConstants.RG32F;
      case PixelFormat.RED:
        return WebGLConstants.R32F;
    }
  }

  if (pixelDatatype === PixelDatatype.HALF_FLOAT) {
    switch (pixelFormat) {
      case PixelFormat.RGBA:
        return WebGLConstants.RGBA16F;
      case PixelFormat.RGB:
        return WebGLConstants.RGB16F;
      case PixelFormat.RG:
        return WebGLConstants.RG16F;
      case PixelFormat.RED:
        return WebGLConstants.R16F;
    }
  }

  if (pixelDatatype === PixelDatatype.UNSIGNED_BYTE) {
    switch (pixelFormat) {
      case PixelFormat.RGBA:
        return WebGLConstants.RGBA8;
      case PixelFormat.RGB:
        return WebGLConstants.RGB8;
      case PixelFormat.RG:
        return WebGLConstants.RG8;
      case PixelFormat.RED:
        return WebGLConstants.R8;
    }
  }

  if (pixelDatatype === PixelDatatype.INT) {
    switch (pixelFormat) {
      case PixelFormat.RGBA_INTEGER:
        return WebGLConstants.RGBA32I;
      case PixelFormat.RGB_INTEGER:
        return WebGLConstants.RGB32I;
      case PixelFormat.RG_INTEGER:
        return WebGLConstants.RG32I;
      case PixelFormat.RED_INTEGER:
        return WebGLConstants.R32I;
    }
  }

  if (pixelDatatype === PixelDatatype.UNSIGNED_INT) {
    switch (pixelFormat) {
      case PixelFormat.RGBA_INTEGER:
        return WebGLConstants.RGBA32UI;
      case PixelFormat.RGB_INTEGER:
        return WebGLConstants.RGB32UI;
      case PixelFormat.RG_INTEGER:
        return WebGLConstants.RG32UI;
      case PixelFormat.RED_INTEGER:
        return WebGLConstants.R32UI;
    }
  }

  return pixelFormat;
};

export default Object.freeze(PixelFormat);
