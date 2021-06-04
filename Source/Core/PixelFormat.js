import PixelDatatype from "../Renderer/PixelDatatype.js";
import WebGLConstants from "./WebGLConstants.js";

/**
 * The format of a pixel, i.e., the number of components it has and what they represent.
 *
 * @enum {Number}
 */
var PixelFormat = {
  /**
   * A pixel format containing a depth value.
   *
   * @type {Number}
   * @constant
   */
  DEPTH_COMPONENT: WebGLConstants.DEPTH_COMPONENT,

  /**
   * A pixel format containing a depth and stencil value, most often used with {@link PixelDatatype.UNSIGNED_INT_24_8}.
   *
   * @type {Number}
   * @constant
   */
  DEPTH_STENCIL: WebGLConstants.DEPTH_STENCIL,

  /**
   * A pixel format containing an alpha channel.
   *
   * @type {Number}
   * @constant
   */
  ALPHA: WebGLConstants.ALPHA,

  /**
   * A pixel format containing red, green, and blue channels.
   *
   * @type {Number}
   * @constant
   */
  RGB: WebGLConstants.RGB,

  /**
   * A pixel format containing red, green, blue, and alpha channels.
   *
   * @type {Number}
   * @constant
   */
  RGBA: WebGLConstants.RGBA,

  /**
   * A pixel format containing a luminance (intensity) channel.
   *
   * @type {Number}
   * @constant
   */
  LUMINANCE: WebGLConstants.LUMINANCE,

  /**
   * A pixel format containing luminance (intensity) and alpha channels.
   *
   * @type {Number}
   * @constant
   */
  LUMINANCE_ALPHA: WebGLConstants.LUMINANCE_ALPHA,

  /**
   * A pixel format containing red, green, and blue channels that is DXT1 compressed.
   *
   * @type {Number}
   * @constant
   */
  RGB_DXT1: WebGLConstants.COMPRESSED_RGB_S3TC_DXT1_EXT,

  /**
   * A pixel format containing red, green, blue, and alpha channels that is DXT1 compressed.
   *
   * @type {Number}
   * @constant
   */
  RGBA_DXT1: WebGLConstants.COMPRESSED_RGBA_S3TC_DXT1_EXT,

  /**
   * A pixel format containing red, green, blue, and alpha channels that is DXT3 compressed.
   *
   * @type {Number}
   * @constant
   */
  RGBA_DXT3: WebGLConstants.COMPRESSED_RGBA_S3TC_DXT3_EXT,

  /**
   * A pixel format containing red, green, blue, and alpha channels that is DXT5 compressed.
   *
   * @type {Number}
   * @constant
   */
  RGBA_DXT5: WebGLConstants.COMPRESSED_RGBA_S3TC_DXT5_EXT,

  /**
   * A pixel format containing red, green, and blue channels that is PVR 4bpp compressed.
   *
   * @type {Number}
   * @constant
   */
  RGB_PVRTC_4BPPV1: WebGLConstants.COMPRESSED_RGB_PVRTC_4BPPV1_IMG,

  /**
   * A pixel format containing red, green, and blue channels that is PVR 2bpp compressed.
   *
   * @type {Number}
   * @constant
   */
  RGB_PVRTC_2BPPV1: WebGLConstants.COMPRESSED_RGB_PVRTC_2BPPV1_IMG,

  /**
   * A pixel format containing red, green, blue, and alpha channels that is PVR 4bpp compressed.
   *
   * @type {Number}
   * @constant
   */
  RGBA_PVRTC_4BPPV1: WebGLConstants.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG,

  /**
   * A pixel format containing red, green, blue, and alpha channels that is PVR 2bpp compressed.
   *
   * @type {Number}
   * @constant
   */
  RGBA_PVRTC_2BPPV1: WebGLConstants.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG,

  /**
   * A pixel format containing red, green, blue, and alpha channels that is ASTC compressed.
   *
   * @type {Number}
   * @constant
   */
  RGBA_ASTC: WebGLConstants.COMPRESSED_RGBA_ASTC_4x4_WEBGL,

  /**
   * A pixel format containing red, green, and blue channels that is ETC1 compressed.
   *
   * @type {Number}
   * @constant
   */
  RGB_ETC1: WebGLConstants.COMPRESSED_RGB_ETC1_WEBGL,

  /**
   * A pixel format containing red, green, blue, and alpha channels that is BC7 compressed.
   *
   * @type {Number}
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
      return 3;
    case PixelFormat.RGBA:
      return 4;
    case PixelFormat.LUMINANCE_ALPHA:
      return 2;
    case PixelFormat.ALPHA:
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
    pixelFormat === PixelFormat.RGB ||
    pixelFormat === PixelFormat.RGBA ||
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
    pixelFormat === PixelFormat.RGBA_BC7
  );
};

/**
 * @private
 */
PixelFormat.isColorFormat = function (pixelFormat) {
  return (
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
PixelFormat.isBC7Format = function (pixelFormat) {
  return pixelFormat === PixelFormat.RGBA_BC7;
};

/**
 * @private
 */
PixelFormat.compressedTextureSizeInBytes = function (
  pixelFormat,
  width,
  height
) {
  switch (pixelFormat) {
    case PixelFormat.RGB_DXT1:
    case PixelFormat.RGBA_DXT1:
    case PixelFormat.RGB_ETC1:
      return Math.floor((width + 3) / 4) * Math.floor((height + 3) / 4) * 8;

    case PixelFormat.RGBA_DXT3:
    case PixelFormat.RGBA_DXT5:
    case PixelFormat.RGBA_ASTC:
      return Math.floor((width + 3) / 4) * Math.floor((height + 3) / 4) * 16;

    case PixelFormat.RGB_PVRTC_4BPPV1:
    case PixelFormat.RGBA_PVRTC_4BPPV1:
      return Math.floor((Math.max(width, 8) * Math.max(height, 8) * 4 + 7) / 8);

    case PixelFormat.RGB_PVRTC_2BPPV1:
    case PixelFormat.RGBA_PVRTC_2BPPV1:
      return Math.floor(
        (Math.max(width, 16) * Math.max(height, 8) * 2 + 7) / 8
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
  height
) {
  var componentsLength = PixelFormat.componentsLength(pixelFormat);
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
PixelFormat.alignmentInBytes = function (pixelFormat, pixelDatatype, width) {
  var mod =
    PixelFormat.textureSizeInBytes(pixelFormat, pixelDatatype, width, 1) % 4;
  return mod === 0 ? 4 : mod === 2 ? 2 : 1;
};

/**
 * @private
 */
PixelFormat.createTypedArray = function (
  pixelFormat,
  pixelDatatype,
  width,
  height
) {
  var constructor;
  var sizeInBytes = PixelDatatype.sizeInBytes(pixelDatatype);
  if (sizeInBytes === Uint8Array.BYTES_PER_ELEMENT) {
    constructor = Uint8Array;
  } else if (sizeInBytes === Uint16Array.BYTES_PER_ELEMENT) {
    constructor = Uint16Array;
  } else if (
    sizeInBytes === Float32Array.BYTES_PER_ELEMENT &&
    pixelDatatype === PixelDatatype.FLOAT
  ) {
    constructor = Float32Array;
  } else {
    constructor = Uint32Array;
  }

  var size = PixelFormat.componentsLength(pixelFormat) * width * height;
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
  height
) {
  if (height === 1) {
    return bufferView;
  }
  var flipped = PixelFormat.createTypedArray(
    pixelFormat,
    pixelDatatype,
    width,
    height
  );
  var numberOfComponents = PixelFormat.componentsLength(pixelFormat);
  var textureWidth = width * numberOfComponents;
  for (var i = 0; i < height; ++i) {
    var row = i * width * numberOfComponents;
    var flippedRow = (height - i - 1) * width * numberOfComponents;
    for (var j = 0; j < textureWidth; ++j) {
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
      case PixelFormat.R:
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
      case PixelFormat.R:
        return WebGLConstants.R16F;
    }
  }

  return pixelFormat;
};

export default Object.freeze(PixelFormat);
