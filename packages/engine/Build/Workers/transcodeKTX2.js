define(['./defaultValue-0a909f67', './Check-666ab1a0', './WebGLConstants-a8cc3e8c', './RuntimeError-06c93819', './createTaskProcessorWorker'], (function (defaultValue, Check, WebGLConstants, RuntimeError, createTaskProcessorWorker) { 'use strict';

  /**
   * The data type of a pixel.
   *
   * @enum {Number}
   * @see PostProcessStage
   */
  const PixelDatatype = {
    UNSIGNED_BYTE: WebGLConstants.WebGLConstants.UNSIGNED_BYTE,
    UNSIGNED_SHORT: WebGLConstants.WebGLConstants.UNSIGNED_SHORT,
    UNSIGNED_INT: WebGLConstants.WebGLConstants.UNSIGNED_INT,
    FLOAT: WebGLConstants.WebGLConstants.FLOAT,
    HALF_FLOAT: WebGLConstants.WebGLConstants.HALF_FLOAT_OES,
    UNSIGNED_INT_24_8: WebGLConstants.WebGLConstants.UNSIGNED_INT_24_8,
    UNSIGNED_SHORT_4_4_4_4: WebGLConstants.WebGLConstants.UNSIGNED_SHORT_4_4_4_4,
    UNSIGNED_SHORT_5_5_5_1: WebGLConstants.WebGLConstants.UNSIGNED_SHORT_5_5_5_1,
    UNSIGNED_SHORT_5_6_5: WebGLConstants.WebGLConstants.UNSIGNED_SHORT_5_6_5,
  };

  /**
    @private
  */
  PixelDatatype.toWebGLConstant = function (pixelDatatype, context) {
    switch (pixelDatatype) {
      case PixelDatatype.UNSIGNED_BYTE:
        return WebGLConstants.WebGLConstants.UNSIGNED_BYTE;
      case PixelDatatype.UNSIGNED_SHORT:
        return WebGLConstants.WebGLConstants.UNSIGNED_SHORT;
      case PixelDatatype.UNSIGNED_INT:
        return WebGLConstants.WebGLConstants.UNSIGNED_INT;
      case PixelDatatype.FLOAT:
        return WebGLConstants.WebGLConstants.FLOAT;
      case PixelDatatype.HALF_FLOAT:
        return context.webgl2
          ? WebGLConstants.WebGLConstants.HALF_FLOAT
          : WebGLConstants.WebGLConstants.HALF_FLOAT_OES;
      case PixelDatatype.UNSIGNED_INT_24_8:
        return WebGLConstants.WebGLConstants.UNSIGNED_INT_24_8;
      case PixelDatatype.UNSIGNED_SHORT_4_4_4_4:
        return WebGLConstants.WebGLConstants.UNSIGNED_SHORT_4_4_4_4;
      case PixelDatatype.UNSIGNED_SHORT_5_5_5_1:
        return WebGLConstants.WebGLConstants.UNSIGNED_SHORT_5_5_5_1;
      case PixelDatatype.UNSIGNED_SHORT_5_6_5:
        return PixelDatatype.UNSIGNED_SHORT_5_6_5;
    }
  };

  /**
    @private
  */
  PixelDatatype.isPacked = function (pixelDatatype) {
    return (
      pixelDatatype === PixelDatatype.UNSIGNED_INT_24_8 ||
      pixelDatatype === PixelDatatype.UNSIGNED_SHORT_4_4_4_4 ||
      pixelDatatype === PixelDatatype.UNSIGNED_SHORT_5_5_5_1 ||
      pixelDatatype === PixelDatatype.UNSIGNED_SHORT_5_6_5
    );
  };

  /**
    @private
  */
  PixelDatatype.sizeInBytes = function (pixelDatatype) {
    switch (pixelDatatype) {
      case PixelDatatype.UNSIGNED_BYTE:
        return 1;
      case PixelDatatype.UNSIGNED_SHORT:
      case PixelDatatype.UNSIGNED_SHORT_4_4_4_4:
      case PixelDatatype.UNSIGNED_SHORT_5_5_5_1:
      case PixelDatatype.UNSIGNED_SHORT_5_6_5:
      case PixelDatatype.HALF_FLOAT:
        return 2;
      case PixelDatatype.UNSIGNED_INT:
      case PixelDatatype.FLOAT:
      case PixelDatatype.UNSIGNED_INT_24_8:
        return 4;
    }
  };

  /**
    @private
  */
  PixelDatatype.validate = function (pixelDatatype) {
    return (
      pixelDatatype === PixelDatatype.UNSIGNED_BYTE ||
      pixelDatatype === PixelDatatype.UNSIGNED_SHORT ||
      pixelDatatype === PixelDatatype.UNSIGNED_INT ||
      pixelDatatype === PixelDatatype.FLOAT ||
      pixelDatatype === PixelDatatype.HALF_FLOAT ||
      pixelDatatype === PixelDatatype.UNSIGNED_INT_24_8 ||
      pixelDatatype === PixelDatatype.UNSIGNED_SHORT_4_4_4_4 ||
      pixelDatatype === PixelDatatype.UNSIGNED_SHORT_5_5_5_1 ||
      pixelDatatype === PixelDatatype.UNSIGNED_SHORT_5_6_5
    );
  };

  var PixelDatatype$1 = Object.freeze(PixelDatatype);

  /**
   * The format of a pixel, i.e., the number of components it has and what they represent.
   *
   * @enum {Number}
   */
  const PixelFormat = {
    /**
     * A pixel format containing a depth value.
     *
     * @type {Number}
     * @constant
     */
    DEPTH_COMPONENT: WebGLConstants.WebGLConstants.DEPTH_COMPONENT,

    /**
     * A pixel format containing a depth and stencil value, most often used with {@link PixelDatatype.UNSIGNED_INT_24_8}.
     *
     * @type {Number}
     * @constant
     */
    DEPTH_STENCIL: WebGLConstants.WebGLConstants.DEPTH_STENCIL,

    /**
     * A pixel format containing an alpha channel.
     *
     * @type {Number}
     * @constant
     */
    ALPHA: WebGLConstants.WebGLConstants.ALPHA,

    /**
     * A pixel format containing red, green, and blue channels.
     *
     * @type {Number}
     * @constant
     */
    RGB: WebGLConstants.WebGLConstants.RGB,

    /**
     * A pixel format containing red, green, blue, and alpha channels.
     *
     * @type {Number}
     * @constant
     */
    RGBA: WebGLConstants.WebGLConstants.RGBA,

    /**
     * A pixel format containing a luminance (intensity) channel.
     *
     * @type {Number}
     * @constant
     */
    LUMINANCE: WebGLConstants.WebGLConstants.LUMINANCE,

    /**
     * A pixel format containing luminance (intensity) and alpha channels.
     *
     * @type {Number}
     * @constant
     */
    LUMINANCE_ALPHA: WebGLConstants.WebGLConstants.LUMINANCE_ALPHA,

    /**
     * A pixel format containing red, green, and blue channels that is DXT1 compressed.
     *
     * @type {Number}
     * @constant
     */
    RGB_DXT1: WebGLConstants.WebGLConstants.COMPRESSED_RGB_S3TC_DXT1_EXT,

    /**
     * A pixel format containing red, green, blue, and alpha channels that is DXT1 compressed.
     *
     * @type {Number}
     * @constant
     */
    RGBA_DXT1: WebGLConstants.WebGLConstants.COMPRESSED_RGBA_S3TC_DXT1_EXT,

    /**
     * A pixel format containing red, green, blue, and alpha channels that is DXT3 compressed.
     *
     * @type {Number}
     * @constant
     */
    RGBA_DXT3: WebGLConstants.WebGLConstants.COMPRESSED_RGBA_S3TC_DXT3_EXT,

    /**
     * A pixel format containing red, green, blue, and alpha channels that is DXT5 compressed.
     *
     * @type {Number}
     * @constant
     */
    RGBA_DXT5: WebGLConstants.WebGLConstants.COMPRESSED_RGBA_S3TC_DXT5_EXT,

    /**
     * A pixel format containing red, green, and blue channels that is PVR 4bpp compressed.
     *
     * @type {Number}
     * @constant
     */
    RGB_PVRTC_4BPPV1: WebGLConstants.WebGLConstants.COMPRESSED_RGB_PVRTC_4BPPV1_IMG,

    /**
     * A pixel format containing red, green, and blue channels that is PVR 2bpp compressed.
     *
     * @type {Number}
     * @constant
     */
    RGB_PVRTC_2BPPV1: WebGLConstants.WebGLConstants.COMPRESSED_RGB_PVRTC_2BPPV1_IMG,

    /**
     * A pixel format containing red, green, blue, and alpha channels that is PVR 4bpp compressed.
     *
     * @type {Number}
     * @constant
     */
    RGBA_PVRTC_4BPPV1: WebGLConstants.WebGLConstants.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG,

    /**
     * A pixel format containing red, green, blue, and alpha channels that is PVR 2bpp compressed.
     *
     * @type {Number}
     * @constant
     */
    RGBA_PVRTC_2BPPV1: WebGLConstants.WebGLConstants.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG,

    /**
     * A pixel format containing red, green, blue, and alpha channels that is ASTC compressed.
     *
     * @type {Number}
     * @constant
     */
    RGBA_ASTC: WebGLConstants.WebGLConstants.COMPRESSED_RGBA_ASTC_4x4_WEBGL,

    /**
     * A pixel format containing red, green, and blue channels that is ETC1 compressed.
     *
     * @type {Number}
     * @constant
     */
    RGB_ETC1: WebGLConstants.WebGLConstants.COMPRESSED_RGB_ETC1_WEBGL,

    /**
     * A pixel format containing red, green, and blue channels that is ETC2 compressed.
     *
     * @type {Number}
     * @constant
     */
    RGB8_ETC2: WebGLConstants.WebGLConstants.COMPRESSED_RGB8_ETC2,

    /**
     * A pixel format containing red, green, blue, and alpha channels that is ETC2 compressed.
     *
     * @type {Number}
     * @constant
     */
    RGBA8_ETC2_EAC: WebGLConstants.WebGLConstants.COMPRESSED_RGBA8_ETC2_EAC,

    /**
     * A pixel format containing red, green, blue, and alpha channels that is BC7 compressed.
     *
     * @type {Number}
     * @constant
     */
    RGBA_BC7: WebGLConstants.WebGLConstants.COMPRESSED_RGBA_BPTC_UNORM,
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
    height
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
    let componentsLength = PixelFormat.componentsLength(pixelFormat);
    if (PixelDatatype$1.isPacked(pixelDatatype)) {
      componentsLength = 1;
    }
    return (
      componentsLength * PixelDatatype$1.sizeInBytes(pixelDatatype) * width * height
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
   */
  PixelFormat.createTypedArray = function (
    pixelFormat,
    pixelDatatype,
    width,
    height
  ) {
    let constructor;
    const sizeInBytes = PixelDatatype$1.sizeInBytes(pixelDatatype);
    if (sizeInBytes === Uint8Array.BYTES_PER_ELEMENT) {
      constructor = Uint8Array;
    } else if (sizeInBytes === Uint16Array.BYTES_PER_ELEMENT) {
      constructor = Uint16Array;
    } else if (
      sizeInBytes === Float32Array.BYTES_PER_ELEMENT &&
      pixelDatatype === PixelDatatype$1.FLOAT
    ) {
      constructor = Float32Array;
    } else {
      constructor = Uint32Array;
    }

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
    height
  ) {
    if (height === 1) {
      return bufferView;
    }
    const flipped = PixelFormat.createTypedArray(
      pixelFormat,
      pixelDatatype,
      width,
      height
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
      return WebGLConstants.WebGLConstants.DEPTH24_STENCIL8;
    }

    if (pixelFormat === PixelFormat.DEPTH_COMPONENT) {
      if (pixelDatatype === PixelDatatype$1.UNSIGNED_SHORT) {
        return WebGLConstants.WebGLConstants.DEPTH_COMPONENT16;
      } else if (pixelDatatype === PixelDatatype$1.UNSIGNED_INT) {
        return WebGLConstants.WebGLConstants.DEPTH_COMPONENT24;
      }
    }

    if (pixelDatatype === PixelDatatype$1.FLOAT) {
      switch (pixelFormat) {
        case PixelFormat.RGBA:
          return WebGLConstants.WebGLConstants.RGBA32F;
        case PixelFormat.RGB:
          return WebGLConstants.WebGLConstants.RGB32F;
        case PixelFormat.RG:
          return WebGLConstants.WebGLConstants.RG32F;
        case PixelFormat.R:
          return WebGLConstants.WebGLConstants.R32F;
      }
    }

    if (pixelDatatype === PixelDatatype$1.HALF_FLOAT) {
      switch (pixelFormat) {
        case PixelFormat.RGBA:
          return WebGLConstants.WebGLConstants.RGBA16F;
        case PixelFormat.RGB:
          return WebGLConstants.WebGLConstants.RGB16F;
        case PixelFormat.RG:
          return WebGLConstants.WebGLConstants.RG16F;
        case PixelFormat.R:
          return WebGLConstants.WebGLConstants.R16F;
      }
    }

    return pixelFormat;
  };

  var PixelFormat$1 = Object.freeze(PixelFormat);

  /**
   * Enum containing Vulkan Constant values by name.
   *
   * These match the constants from the {@link https://www.khronos.org/registry/vulkan/specs/1.2-extensions/html/vkspec.html#formats-definition|Vulkan 1.2 specification}.
   *
   * @enum {Number}
   * @private
   */
  const VulkanConstants = {
    VK_FORMAT_UNDEFINED: 0,
    VK_FORMAT_R4G4_UNORM_PACK8: 1,
    VK_FORMAT_R4G4B4A4_UNORM_PACK16: 2,
    VK_FORMAT_B4G4R4A4_UNORM_PACK16: 3,
    VK_FORMAT_R5G6B5_UNORM_PACK16: 4,
    VK_FORMAT_B5G6R5_UNORM_PACK16: 5,
    VK_FORMAT_R5G5B5A1_UNORM_PACK16: 6,
    VK_FORMAT_B5G5R5A1_UNORM_PACK16: 7,
    VK_FORMAT_A1R5G5B5_UNORM_PACK16: 8,
    VK_FORMAT_R8_UNORM: 9,
    VK_FORMAT_R8_SNORM: 10,
    VK_FORMAT_R8_USCALED: 11,
    VK_FORMAT_R8_SSCALED: 12,
    VK_FORMAT_R8_UINT: 13,
    VK_FORMAT_R8_SINT: 14,
    VK_FORMAT_R8_SRGB: 15,
    VK_FORMAT_R8G8_UNORM: 16,
    VK_FORMAT_R8G8_SNORM: 17,
    VK_FORMAT_R8G8_USCALED: 18,
    VK_FORMAT_R8G8_SSCALED: 19,
    VK_FORMAT_R8G8_UINT: 20,
    VK_FORMAT_R8G8_SINT: 21,
    VK_FORMAT_R8G8_SRGB: 22,
    VK_FORMAT_R8G8B8_UNORM: 23,
    VK_FORMAT_R8G8B8_SNORM: 24,
    VK_FORMAT_R8G8B8_USCALED: 25,
    VK_FORMAT_R8G8B8_SSCALED: 26,
    VK_FORMAT_R8G8B8_UINT: 27,
    VK_FORMAT_R8G8B8_SINT: 28,
    VK_FORMAT_R8G8B8_SRGB: 29,
    VK_FORMAT_B8G8R8_UNORM: 30,
    VK_FORMAT_B8G8R8_SNORM: 31,
    VK_FORMAT_B8G8R8_USCALED: 32,
    VK_FORMAT_B8G8R8_SSCALED: 33,
    VK_FORMAT_B8G8R8_UINT: 34,
    VK_FORMAT_B8G8R8_SINT: 35,
    VK_FORMAT_B8G8R8_SRGB: 36,
    VK_FORMAT_R8G8B8A8_UNORM: 37,
    VK_FORMAT_R8G8B8A8_SNORM: 38,
    VK_FORMAT_R8G8B8A8_USCALED: 39,
    VK_FORMAT_R8G8B8A8_SSCALED: 40,
    VK_FORMAT_R8G8B8A8_UINT: 41,
    VK_FORMAT_R8G8B8A8_SINT: 42,
    VK_FORMAT_R8G8B8A8_SRGB: 43,
    VK_FORMAT_B8G8R8A8_UNORM: 44,
    VK_FORMAT_B8G8R8A8_SNORM: 45,
    VK_FORMAT_B8G8R8A8_USCALED: 46,
    VK_FORMAT_B8G8R8A8_SSCALED: 47,
    VK_FORMAT_B8G8R8A8_UINT: 48,
    VK_FORMAT_B8G8R8A8_SINT: 49,
    VK_FORMAT_B8G8R8A8_SRGB: 50,
    VK_FORMAT_A8B8G8R8_UNORM_PACK32: 51,
    VK_FORMAT_A8B8G8R8_SNORM_PACK32: 52,
    VK_FORMAT_A8B8G8R8_USCALED_PACK32: 53,
    VK_FORMAT_A8B8G8R8_SSCALED_PACK32: 54,
    VK_FORMAT_A8B8G8R8_UINT_PACK32: 55,
    VK_FORMAT_A8B8G8R8_SINT_PACK32: 56,
    VK_FORMAT_A8B8G8R8_SRGB_PACK32: 57,
    VK_FORMAT_A2R10G10B10_UNORM_PACK32: 58,
    VK_FORMAT_A2R10G10B10_SNORM_PACK32: 59,
    VK_FORMAT_A2R10G10B10_USCALED_PACK32: 60,
    VK_FORMAT_A2R10G10B10_SSCALED_PACK32: 61,
    VK_FORMAT_A2R10G10B10_UINT_PACK32: 62,
    VK_FORMAT_A2R10G10B10_SINT_PACK32: 63,
    VK_FORMAT_A2B10G10R10_UNORM_PACK32: 64,
    VK_FORMAT_A2B10G10R10_SNORM_PACK32: 65,
    VK_FORMAT_A2B10G10R10_USCALED_PACK32: 66,
    VK_FORMAT_A2B10G10R10_SSCALED_PACK32: 67,
    VK_FORMAT_A2B10G10R10_UINT_PACK32: 68,
    VK_FORMAT_A2B10G10R10_SINT_PACK32: 69,
    VK_FORMAT_R16_UNORM: 70,
    VK_FORMAT_R16_SNORM: 71,
    VK_FORMAT_R16_USCALED: 72,
    VK_FORMAT_R16_SSCALED: 73,
    VK_FORMAT_R16_UINT: 74,
    VK_FORMAT_R16_SINT: 75,
    VK_FORMAT_R16_SFLOAT: 76,
    VK_FORMAT_R16G16_UNORM: 77,
    VK_FORMAT_R16G16_SNORM: 78,
    VK_FORMAT_R16G16_USCALED: 79,
    VK_FORMAT_R16G16_SSCALED: 80,
    VK_FORMAT_R16G16_UINT: 81,
    VK_FORMAT_R16G16_SINT: 82,
    VK_FORMAT_R16G16_SFLOAT: 83,
    VK_FORMAT_R16G16B16_UNORM: 84,
    VK_FORMAT_R16G16B16_SNORM: 85,
    VK_FORMAT_R16G16B16_USCALED: 86,
    VK_FORMAT_R16G16B16_SSCALED: 87,
    VK_FORMAT_R16G16B16_UINT: 88,
    VK_FORMAT_R16G16B16_SINT: 89,
    VK_FORMAT_R16G16B16_SFLOAT: 90,
    VK_FORMAT_R16G16B16A16_UNORM: 91,
    VK_FORMAT_R16G16B16A16_SNORM: 92,
    VK_FORMAT_R16G16B16A16_USCALED: 93,
    VK_FORMAT_R16G16B16A16_SSCALED: 94,
    VK_FORMAT_R16G16B16A16_UINT: 95,
    VK_FORMAT_R16G16B16A16_SINT: 96,
    VK_FORMAT_R16G16B16A16_SFLOAT: 97,
    VK_FORMAT_R32_UINT: 98,
    VK_FORMAT_R32_SINT: 99,
    VK_FORMAT_R32_SFLOAT: 100,
    VK_FORMAT_R32G32_UINT: 101,
    VK_FORMAT_R32G32_SINT: 102,
    VK_FORMAT_R32G32_SFLOAT: 103,
    VK_FORMAT_R32G32B32_UINT: 104,
    VK_FORMAT_R32G32B32_SINT: 105,
    VK_FORMAT_R32G32B32_SFLOAT: 106,
    VK_FORMAT_R32G32B32A32_UINT: 107,
    VK_FORMAT_R32G32B32A32_SINT: 108,
    VK_FORMAT_R32G32B32A32_SFLOAT: 109,
    VK_FORMAT_R64_UINT: 110,
    VK_FORMAT_R64_SINT: 111,
    VK_FORMAT_R64_SFLOAT: 112,
    VK_FORMAT_R64G64_UINT: 113,
    VK_FORMAT_R64G64_SINT: 114,
    VK_FORMAT_R64G64_SFLOAT: 115,
    VK_FORMAT_R64G64B64_UINT: 116,
    VK_FORMAT_R64G64B64_SINT: 117,
    VK_FORMAT_R64G64B64_SFLOAT: 118,
    VK_FORMAT_R64G64B64A64_UINT: 119,
    VK_FORMAT_R64G64B64A64_SINT: 120,
    VK_FORMAT_R64G64B64A64_SFLOAT: 121,
    VK_FORMAT_B10G11R11_UFLOAT_PACK32: 122,
    VK_FORMAT_E5B9G9R9_UFLOAT_PACK32: 123,
    VK_FORMAT_D16_UNORM: 124,
    VK_FORMAT_X8_D24_UNORM_PACK32: 125,
    VK_FORMAT_D32_SFLOAT: 126,
    VK_FORMAT_S8_UINT: 127,
    VK_FORMAT_D16_UNORM_S8_UINT: 128,
    VK_FORMAT_D24_UNORM_S8_UINT: 129,
    VK_FORMAT_D32_SFLOAT_S8_UINT: 130,
    VK_FORMAT_BC1_RGB_UNORM_BLOCK: 131,
    VK_FORMAT_BC1_RGB_SRGB_BLOCK: 132,
    VK_FORMAT_BC1_RGBA_UNORM_BLOCK: 133,
    VK_FORMAT_BC1_RGBA_SRGB_BLOCK: 134,
    VK_FORMAT_BC2_UNORM_BLOCK: 135,
    VK_FORMAT_BC2_SRGB_BLOCK: 136,
    VK_FORMAT_BC3_UNORM_BLOCK: 137,
    VK_FORMAT_BC3_SRGB_BLOCK: 138,
    VK_FORMAT_BC4_UNORM_BLOCK: 139,
    VK_FORMAT_BC4_SNORM_BLOCK: 140,
    VK_FORMAT_BC5_UNORM_BLOCK: 141,
    VK_FORMAT_BC5_SNORM_BLOCK: 142,
    VK_FORMAT_BC6H_UFLOAT_BLOCK: 143,
    VK_FORMAT_BC6H_SFLOAT_BLOCK: 144,
    VK_FORMAT_BC7_UNORM_BLOCK: 145,
    VK_FORMAT_BC7_SRGB_BLOCK: 146,
    VK_FORMAT_ETC2_R8G8B8_UNORM_BLOCK: 147,
    VK_FORMAT_ETC2_R8G8B8_SRGB_BLOCK: 148,
    VK_FORMAT_ETC2_R8G8B8A1_UNORM_BLOCK: 149,
    VK_FORMAT_ETC2_R8G8B8A1_SRGB_BLOCK: 150,
    VK_FORMAT_ETC2_R8G8B8A8_UNORM_BLOCK: 151,
    VK_FORMAT_ETC2_R8G8B8A8_SRGB_BLOCK: 152,
    VK_FORMAT_EAC_R11_UNORM_BLOCK: 153,
    VK_FORMAT_EAC_R11_SNORM_BLOCK: 154,
    VK_FORMAT_EAC_R11G11_UNORM_BLOCK: 155,
    VK_FORMAT_EAC_R11G11_SNORM_BLOCK: 156,
    VK_FORMAT_ASTC_4x4_UNORM_BLOCK: 157,
    VK_FORMAT_ASTC_4x4_SRGB_BLOCK: 158,
    VK_FORMAT_ASTC_5x4_UNORM_BLOCK: 159,
    VK_FORMAT_ASTC_5x4_SRGB_BLOCK: 160,
    VK_FORMAT_ASTC_5x5_UNORM_BLOCK: 161,
    VK_FORMAT_ASTC_5x5_SRGB_BLOCK: 162,
    VK_FORMAT_ASTC_6x5_UNORM_BLOCK: 163,
    VK_FORMAT_ASTC_6x5_SRGB_BLOCK: 164,
    VK_FORMAT_ASTC_6x6_UNORM_BLOCK: 165,
    VK_FORMAT_ASTC_6x6_SRGB_BLOCK: 166,
    VK_FORMAT_ASTC_8x5_UNORM_BLOCK: 167,
    VK_FORMAT_ASTC_8x5_SRGB_BLOCK: 168,
    VK_FORMAT_ASTC_8x6_UNORM_BLOCK: 169,
    VK_FORMAT_ASTC_8x6_SRGB_BLOCK: 170,
    VK_FORMAT_ASTC_8x8_UNORM_BLOCK: 171,
    VK_FORMAT_ASTC_8x8_SRGB_BLOCK: 172,
    VK_FORMAT_ASTC_10x5_UNORM_BLOCK: 173,
    VK_FORMAT_ASTC_10x5_SRGB_BLOCK: 174,
    VK_FORMAT_ASTC_10x6_UNORM_BLOCK: 175,
    VK_FORMAT_ASTC_10x6_SRGB_BLOCK: 176,
    VK_FORMAT_ASTC_10x8_UNORM_BLOCK: 177,
    VK_FORMAT_ASTC_10x8_SRGB_BLOCK: 178,
    VK_FORMAT_ASTC_10x10_UNORM_BLOCK: 179,
    VK_FORMAT_ASTC_10x10_SRGB_BLOCK: 180,
    VK_FORMAT_ASTC_12x10_UNORM_BLOCK: 181,
    VK_FORMAT_ASTC_12x10_SRGB_BLOCK: 182,
    VK_FORMAT_ASTC_12x12_UNORM_BLOCK: 183,
    VK_FORMAT_ASTC_12x12_SRGB_BLOCK: 184,
    VK_FORMAT_G8B8G8R8_422_UNORM: 1000156000,
    VK_FORMAT_B8G8R8G8_422_UNORM: 1000156001,
    VK_FORMAT_G8_B8_R8_3PLANE_420_UNORM: 1000156002,
    VK_FORMAT_G8_B8R8_2PLANE_420_UNORM: 1000156003,
    VK_FORMAT_G8_B8_R8_3PLANE_422_UNORM: 1000156004,
    VK_FORMAT_G8_B8R8_2PLANE_422_UNORM: 1000156005,
    VK_FORMAT_G8_B8_R8_3PLANE_444_UNORM: 1000156006,
    VK_FORMAT_R10X6_UNORM_PACK16: 1000156007,
    VK_FORMAT_R10X6G10X6_UNORM_2PACK16: 1000156008,
    VK_FORMAT_R10X6G10X6B10X6A10X6_UNORM_4PACK16: 1000156009,
    VK_FORMAT_G10X6B10X6G10X6R10X6_422_UNORM_4PACK16: 1000156010,
    VK_FORMAT_B10X6G10X6R10X6G10X6_422_UNORM_4PACK16: 1000156011,
    VK_FORMAT_G10X6_B10X6_R10X6_3PLANE_420_UNORM_3PACK16: 1000156012,
    VK_FORMAT_G10X6_B10X6R10X6_2PLANE_420_UNORM_3PACK16: 1000156013,
    VK_FORMAT_G10X6_B10X6_R10X6_3PLANE_422_UNORM_3PACK16: 1000156014,
    VK_FORMAT_G10X6_B10X6R10X6_2PLANE_422_UNORM_3PACK16: 1000156015,
    VK_FORMAT_G10X6_B10X6_R10X6_3PLANE_444_UNORM_3PACK16: 1000156016,
    VK_FORMAT_R12X4_UNORM_PACK16: 1000156017,
    VK_FORMAT_R12X4G12X4_UNORM_2PACK16: 1000156018,
    VK_FORMAT_R12X4G12X4B12X4A12X4_UNORM_4PACK16: 1000156019,
    VK_FORMAT_G12X4B12X4G12X4R12X4_422_UNORM_4PACK16: 1000156020,
    VK_FORMAT_B12X4G12X4R12X4G12X4_422_UNORM_4PACK16: 1000156021,
    VK_FORMAT_G12X4_B12X4_R12X4_3PLANE_420_UNORM_3PACK16: 1000156022,
    VK_FORMAT_G12X4_B12X4R12X4_2PLANE_420_UNORM_3PACK16: 1000156023,
    VK_FORMAT_G12X4_B12X4_R12X4_3PLANE_422_UNORM_3PACK16: 1000156024,
    VK_FORMAT_G12X4_B12X4R12X4_2PLANE_422_UNORM_3PACK16: 1000156025,
    VK_FORMAT_G12X4_B12X4_R12X4_3PLANE_444_UNORM_3PACK16: 1000156026,
    VK_FORMAT_G16B16G16R16_422_UNORM: 1000156027,
    VK_FORMAT_B16G16R16G16_422_UNORM: 1000156028,
    VK_FORMAT_G16_B16_R16_3PLANE_420_UNORM: 1000156029,
    VK_FORMAT_G16_B16R16_2PLANE_420_UNORM: 1000156030,
    VK_FORMAT_G16_B16_R16_3PLANE_422_UNORM: 1000156031,
    VK_FORMAT_G16_B16R16_2PLANE_422_UNORM: 1000156032,
    VK_FORMAT_G16_B16_R16_3PLANE_444_UNORM: 1000156033,
    VK_FORMAT_PVRTC1_2BPP_UNORM_BLOCK_IMG: 1000054000,
    VK_FORMAT_PVRTC1_4BPP_UNORM_BLOCK_IMG: 1000054001,
    VK_FORMAT_PVRTC2_2BPP_UNORM_BLOCK_IMG: 1000054002,
    VK_FORMAT_PVRTC2_4BPP_UNORM_BLOCK_IMG: 1000054003,
    VK_FORMAT_PVRTC1_2BPP_SRGB_BLOCK_IMG: 1000054004,
    VK_FORMAT_PVRTC1_4BPP_SRGB_BLOCK_IMG: 1000054005,
    VK_FORMAT_PVRTC2_2BPP_SRGB_BLOCK_IMG: 1000054006,
    VK_FORMAT_PVRTC2_4BPP_SRGB_BLOCK_IMG: 1000054007,
    VK_FORMAT_ASTC_4x4_SFLOAT_BLOCK_EXT: 1000066000,
    VK_FORMAT_ASTC_5x4_SFLOAT_BLOCK_EXT: 1000066001,
    VK_FORMAT_ASTC_5x5_SFLOAT_BLOCK_EXT: 1000066002,
    VK_FORMAT_ASTC_6x5_SFLOAT_BLOCK_EXT: 1000066003,
    VK_FORMAT_ASTC_6x6_SFLOAT_BLOCK_EXT: 1000066004,
    VK_FORMAT_ASTC_8x5_SFLOAT_BLOCK_EXT: 1000066005,
    VK_FORMAT_ASTC_8x6_SFLOAT_BLOCK_EXT: 1000066006,
    VK_FORMAT_ASTC_8x8_SFLOAT_BLOCK_EXT: 1000066007,
    VK_FORMAT_ASTC_10x5_SFLOAT_BLOCK_EXT: 1000066008,
    VK_FORMAT_ASTC_10x6_SFLOAT_BLOCK_EXT: 1000066009,
    VK_FORMAT_ASTC_10x8_SFLOAT_BLOCK_EXT: 1000066010,
    VK_FORMAT_ASTC_10x10_SFLOAT_BLOCK_EXT: 1000066011,
    VK_FORMAT_ASTC_12x10_SFLOAT_BLOCK_EXT: 1000066012,
    VK_FORMAT_ASTC_12x12_SFLOAT_BLOCK_EXT: 1000066013,
    VK_FORMAT_G8B8G8R8_422_UNORM_KHR: 1000156000,
    VK_FORMAT_B8G8R8G8_422_UNORM_KHR: 1000156001,
    VK_FORMAT_G8_B8_R8_3PLANE_420_UNORM_KHR: 1000156002,
    VK_FORMAT_G8_B8R8_2PLANE_420_UNORM_KHR: 1000156003,
    VK_FORMAT_G8_B8_R8_3PLANE_422_UNORM_KHR: 1000156004,
    VK_FORMAT_G8_B8R8_2PLANE_422_UNORM_KHR: 1000156005,
    VK_FORMAT_G8_B8_R8_3PLANE_444_UNORM_KHR: 1000156006,
    VK_FORMAT_R10X6_UNORM_PACK16_KHR: 1000156007,
    VK_FORMAT_R10X6G10X6_UNORM_2PACK16_KHR: 1000156008,
    VK_FORMAT_R10X6G10X6B10X6A10X6_UNORM_4PACK16_KHR: 1000156009,
    VK_FORMAT_G10X6B10X6G10X6R10X6_422_UNORM_4PACK16_KHR: 1000156010,
    VK_FORMAT_B10X6G10X6R10X6G10X6_422_UNORM_4PACK16_KHR: 1000156011,
    VK_FORMAT_G10X6_B10X6_R10X6_3PLANE_420_UNORM_3PACK16_KHR: 1000156012,
    VK_FORMAT_G10X6_B10X6R10X6_2PLANE_420_UNORM_3PACK16_KHR: 1000156013,
    VK_FORMAT_G10X6_B10X6_R10X6_3PLANE_422_UNORM_3PACK16_KHR: 1000156014,
    VK_FORMAT_G10X6_B10X6R10X6_2PLANE_422_UNORM_3PACK16_KHR: 1000156015,
    VK_FORMAT_G10X6_B10X6_R10X6_3PLANE_444_UNORM_3PACK16_KHR: 1000156016,
    VK_FORMAT_R12X4_UNORM_PACK16_KHR: 1000156017,
    VK_FORMAT_R12X4G12X4_UNORM_2PACK16_KHR: 1000156018,
    VK_FORMAT_R12X4G12X4B12X4A12X4_UNORM_4PACK16_KHR: 1000156019,
    VK_FORMAT_G12X4B12X4G12X4R12X4_422_UNORM_4PACK16_KHR: 1000156020,
    VK_FORMAT_B12X4G12X4R12X4G12X4_422_UNORM_4PACK16_KHR: 1000156021,
    VK_FORMAT_G12X4_B12X4_R12X4_3PLANE_420_UNORM_3PACK16_KHR: 1000156022,
    VK_FORMAT_G12X4_B12X4R12X4_2PLANE_420_UNORM_3PACK16_KHR: 1000156023,
    VK_FORMAT_G12X4_B12X4_R12X4_3PLANE_422_UNORM_3PACK16_KHR: 1000156024,
    VK_FORMAT_G12X4_B12X4R12X4_2PLANE_422_UNORM_3PACK16_KHR: 1000156025,
    VK_FORMAT_G12X4_B12X4_R12X4_3PLANE_444_UNORM_3PACK16_KHR: 1000156026,
    VK_FORMAT_G16B16G16R16_422_UNORM_KHR: 1000156027,
    VK_FORMAT_B16G16R16G16_422_UNORM_KHR: 1000156028,
    VK_FORMAT_G16_B16_R16_3PLANE_420_UNORM_KHR: 1000156029,
    VK_FORMAT_G16_B16R16_2PLANE_420_UNORM_KHR: 1000156030,
    VK_FORMAT_G16_B16_R16_3PLANE_422_UNORM_KHR: 1000156031,
    VK_FORMAT_G16_B16R16_2PLANE_422_UNORM_KHR: 1000156032,
    VK_FORMAT_G16_B16_R16_3PLANE_444_UNORM_KHR: 1000156033,
  };
  var VulkanConstants$1 = Object.freeze(VulkanConstants);

  const e=[171,75,84,88,32,50,48,187,13,10,26,10];var n,i,s,a,r,o,l,f;!function(t){t[t.NONE=0]="NONE",t[t.BASISLZ=1]="BASISLZ",t[t.ZSTD=2]="ZSTD",t[t.ZLIB=3]="ZLIB";}(n||(n={})),function(t){t[t.BASICFORMAT=0]="BASICFORMAT";}(i||(i={})),function(t){t[t.UNSPECIFIED=0]="UNSPECIFIED",t[t.ETC1S=163]="ETC1S",t[t.UASTC=166]="UASTC";}(s||(s={})),function(t){t[t.UNSPECIFIED=0]="UNSPECIFIED",t[t.SRGB=1]="SRGB";}(a||(a={})),function(t){t[t.UNSPECIFIED=0]="UNSPECIFIED",t[t.LINEAR=1]="LINEAR",t[t.SRGB=2]="SRGB",t[t.ITU=3]="ITU",t[t.NTSC=4]="NTSC",t[t.SLOG=5]="SLOG",t[t.SLOG2=6]="SLOG2";}(r||(r={})),function(t){t[t.ALPHA_STRAIGHT=0]="ALPHA_STRAIGHT",t[t.ALPHA_PREMULTIPLIED=1]="ALPHA_PREMULTIPLIED";}(o||(o={})),function(t){t[t.RGB=0]="RGB",t[t.RRR=3]="RRR",t[t.GGG=4]="GGG",t[t.AAA=15]="AAA";}(l||(l={})),function(t){t[t.RGB=0]="RGB",t[t.RGBA=3]="RGBA",t[t.RRR=4]="RRR",t[t.RRRG=5]="RRRG";}(f||(f={}));class U{constructor(){this.vkFormat=0,this.typeSize=1,this.pixelWidth=0,this.pixelHeight=0,this.pixelDepth=0,this.layerCount=0,this.faceCount=1,this.supercompressionScheme=n.NONE,this.levels=[],this.dataFormatDescriptor=[{vendorId:0,descriptorType:i.BASICFORMAT,versionNumber:2,descriptorBlockSize:40,colorModel:s.UNSPECIFIED,colorPrimaries:a.SRGB,transferFunction:a.SRGB,flags:o.ALPHA_STRAIGHT,texelBlockDimension:{x:4,y:4,z:1,w:1},bytesPlane:[],samples:[]}],this.keyValue={},this.globalData=null;}}class c{constructor(t,e,n,i){this._dataView=new DataView(t.buffer,t.byteOffset+e,n),this._littleEndian=i,this._offset=0;}_nextUint8(){const t=this._dataView.getUint8(this._offset);return this._offset+=1,t}_nextUint16(){const t=this._dataView.getUint16(this._offset,this._littleEndian);return this._offset+=2,t}_nextUint32(){const t=this._dataView.getUint32(this._offset,this._littleEndian);return this._offset+=4,t}_nextUint64(){const t=this._dataView.getUint32(this._offset,this._littleEndian)+2**32*this._dataView.getUint32(this._offset+4,this._littleEndian);return this._offset+=8,t}_skip(t){return this._offset+=t,this}_scan(t,e=0){const n=this._offset;let i=0;for(;this._dataView.getUint8(this._offset)!==e&&i<t;)i++,this._offset++;return i<t&&this._offset++,new Uint8Array(this._dataView.buffer,this._dataView.byteOffset+n,i)}}function _(t){return "undefined"!=typeof TextDecoder?(new TextDecoder).decode(t):Buffer.from(t).toString("utf8")}function p(t){const n=new Uint8Array(t.buffer,t.byteOffset,e.length);if(n[0]!==e[0]||n[1]!==e[1]||n[2]!==e[2]||n[3]!==e[3]||n[4]!==e[4]||n[5]!==e[5]||n[6]!==e[6]||n[7]!==e[7]||n[8]!==e[8]||n[9]!==e[9]||n[10]!==e[10]||n[11]!==e[11])throw new Error("Missing KTX 2.0 identifier.");const i=new U,s=17*Uint32Array.BYTES_PER_ELEMENT,a=new c(t,e.length,s,!0);i.vkFormat=a._nextUint32(),i.typeSize=a._nextUint32(),i.pixelWidth=a._nextUint32(),i.pixelHeight=a._nextUint32(),i.pixelDepth=a._nextUint32(),i.layerCount=a._nextUint32(),i.faceCount=a._nextUint32();const r=a._nextUint32();i.supercompressionScheme=a._nextUint32();const o=a._nextUint32(),l=a._nextUint32(),f=a._nextUint32(),h=a._nextUint32(),g=a._nextUint64(),p=a._nextUint64(),x=new c(t,e.length+s,3*r*8,!0);for(let e=0;e<r;e++)i.levels.push({levelData:new Uint8Array(t.buffer,t.byteOffset+x._nextUint64(),x._nextUint64()),uncompressedByteLength:x._nextUint64()});const u=new c(t,o,l,!0),y={vendorId:u._skip(4)._nextUint16(),descriptorType:u._nextUint16(),versionNumber:u._nextUint16(),descriptorBlockSize:u._nextUint16(),colorModel:u._nextUint8(),colorPrimaries:u._nextUint8(),transferFunction:u._nextUint8(),flags:u._nextUint8(),texelBlockDimension:{x:u._nextUint8()+1,y:u._nextUint8()+1,z:u._nextUint8()+1,w:u._nextUint8()+1},bytesPlane:[u._nextUint8(),u._nextUint8(),u._nextUint8(),u._nextUint8(),u._nextUint8(),u._nextUint8(),u._nextUint8(),u._nextUint8()],samples:[]},D=(y.descriptorBlockSize/4-6)/4;for(let t=0;t<D;t++)y.samples[t]={bitOffset:u._nextUint16(),bitLength:u._nextUint8(),channelID:u._nextUint8(),samplePosition:[u._nextUint8(),u._nextUint8(),u._nextUint8(),u._nextUint8()],sampleLower:u._nextUint32(),sampleUpper:u._nextUint32()};i.dataFormatDescriptor.length=0,i.dataFormatDescriptor.push(y);const b=new c(t,f,h,!0);for(;b._offset<h;){const t=b._nextUint32(),e=b._scan(t),n=_(e),s=b._scan(t-e.byteLength);i.keyValue[n]=n.match(/^ktx/i)?_(s):s,b._offset%4&&b._skip(4-b._offset%4);}if(p<=0)return i;const d=new c(t,g,p,!0),B=d._nextUint16(),w=d._nextUint16(),A=d._nextUint32(),S=d._nextUint32(),m=d._nextUint32(),L=d._nextUint32(),I=[];for(let t=0;t<r;t++)I.push({imageFlags:d._nextUint32(),rgbSliceByteOffset:d._nextUint32(),rgbSliceByteLength:d._nextUint32(),alphaSliceByteOffset:d._nextUint32(),alphaSliceByteLength:d._nextUint32()});const R=g+d._offset,E=R+A,T=E+S,O=T+m,P=new Uint8Array(t.buffer,t.byteOffset+R,A),C=new Uint8Array(t.buffer,t.byteOffset+E,S),F=new Uint8Array(t.buffer,t.byteOffset+T,m),G=new Uint8Array(t.buffer,t.byteOffset+O,L);return i.globalData={endpointCount:B,selectorCount:w,imageDescs:I,endpointsData:P,selectorsData:C,tablesData:F,extendedData:G},i}

  /* global require */

  const faceOrder = [
    "positiveX",
    "negativeX",
    "positiveY",
    "negativeY",
    "positiveZ",
    "negativeZ",
  ];

  // Flags
  const colorModelETC1S = 163;
  const colorModelUASTC = 166;

  let transcoderModule;
  function transcode(parameters, transferableObjects) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("transcoderModule", transcoderModule);
    //>>includeEnd('debug');

    const data = parameters.ktx2Buffer;
    const supportedTargetFormats = parameters.supportedTargetFormats;
    let header;
    try {
      header = p(data);
    } catch (e) {
      throw new RuntimeError.RuntimeError("Invalid KTX2 file.");
    }

    if (header.layerCount !== 0) {
      throw new RuntimeError.RuntimeError("KTX2 texture arrays are not supported.");
    }

    if (header.pixelDepth !== 0) {
      throw new RuntimeError.RuntimeError("KTX2 3D textures are unsupported.");
    }

    const dfd = header.dataFormatDescriptor[0];
    const result = new Array(header.levelCount);

    if (
      header.vkFormat === 0x0 &&
      (dfd.colorModel === colorModelETC1S || dfd.colorModel === colorModelUASTC)
    ) {
      // Compressed, initialize transcoder module
      transcodeCompressed(
        data,
        header,
        supportedTargetFormats,
        transcoderModule,
        transferableObjects,
        result
      );
    } else {
      transferableObjects.push(data.buffer);
      parseUncompressed(header, result);
    }

    return result;
  }

  // Parser for uncompressed
  function parseUncompressed(header, result) {
    const internalFormat =
      header.vkFormat === VulkanConstants$1.VK_FORMAT_R8G8B8_SRGB
        ? PixelFormat$1.RGB
        : PixelFormat$1.RGBA;
    let datatype;
    if (header.vkFormat === VulkanConstants$1.VK_FORMAT_R8G8B8A8_UNORM) {
      datatype = PixelDatatype$1.UNSIGNED_BYTE;
    } else if (
      header.vkFormat === VulkanConstants$1.VK_FORMAT_R16G16B16A16_SFLOAT
    ) {
      datatype = PixelDatatype$1.HALF_FLOAT;
    } else if (
      header.vkFormat === VulkanConstants$1.VK_FORMAT_R32G32B32A32_SFLOAT
    ) {
      datatype = PixelDatatype$1.FLOAT;
    }

    for (let i = 0; i < header.levels.length; ++i) {
      const level = {};
      result[i] = level;
      const levelBuffer = header.levels[i].levelData;

      const width = header.pixelWidth >> i;
      const height = header.pixelHeight >> i;
      const faceLength =
        width * height * PixelFormat$1.componentsLength(internalFormat);

      for (let j = 0; j < header.faceCount; ++j) {
        // multiply levelBuffer.byteOffset by the size in bytes of the pixel data type
        const faceByteOffset =
          levelBuffer.byteOffset + faceLength * header.typeSize * j;
        let faceView;
        if (!defaultValue.defined(datatype) || PixelDatatype$1.sizeInBytes(datatype) === 1) {
          faceView = new Uint8Array(
            levelBuffer.buffer,
            faceByteOffset,
            faceLength
          );
        } else if (PixelDatatype$1.sizeInBytes(datatype) === 2) {
          faceView = new Uint16Array(
            levelBuffer.buffer,
            faceByteOffset,
            faceLength
          );
        } else {
          faceView = new Float32Array(
            levelBuffer.buffer,
            faceByteOffset,
            faceLength
          );
        }

        level[faceOrder[j]] = {
          internalFormat: internalFormat,
          datatype: datatype,
          width: width,
          height: height,
          levelBuffer: faceView,
        };
      }
    }
  }

  function transcodeCompressed(
    data,
    header,
    supportedTargetFormats,
    transcoderModule,
    transferableObjects,
    result
  ) {
    const ktx2File = new transcoderModule.KTX2File(data);
    let width = ktx2File.getWidth();
    let height = ktx2File.getHeight();
    const levels = ktx2File.getLevels();
    const hasAlpha = ktx2File.getHasAlpha();

    if (!(width > 0) || !(height > 0) || !(levels > 0)) {
      ktx2File.close();
      ktx2File.delete();
      throw new RuntimeError.RuntimeError("Invalid KTX2 file");
    }

    let internalFormat, transcoderFormat;
    const dfd = header.dataFormatDescriptor[0];
    const BasisFormat = transcoderModule.transcoder_texture_format;

    // Determine target format based on platform support
    if (dfd.colorModel === colorModelETC1S) {
      if (supportedTargetFormats.etc) {
        internalFormat = hasAlpha
          ? PixelFormat$1.RGBA8_ETC2_EAC
          : PixelFormat$1.RGB8_ETC2;
        transcoderFormat = hasAlpha
          ? BasisFormat.cTFETC2_RGBA
          : BasisFormat.cTFETC1_RGB;
      } else if (supportedTargetFormats.etc1 && !hasAlpha) {
        internalFormat = PixelFormat$1.RGB_ETC1;
        transcoderFormat = BasisFormat.cTFETC1_RGB;
      } else if (supportedTargetFormats.s3tc) {
        internalFormat = hasAlpha ? PixelFormat$1.RGBA_DXT5 : PixelFormat$1.RGB_DXT1;
        transcoderFormat = hasAlpha
          ? BasisFormat.cTFBC3_RGBA
          : BasisFormat.cTFBC1_RGB;
      } else if (supportedTargetFormats.pvrtc) {
        internalFormat = hasAlpha
          ? PixelFormat$1.RGBA_PVRTC_4BPPV1
          : PixelFormat$1.RGB_PVRTC_4BPPV1;
        transcoderFormat = hasAlpha
          ? BasisFormat.cTFPVRTC1_4_RGBA
          : BasisFormat.cTFPVRTC1_4_RGB;
      } else if (supportedTargetFormats.astc) {
        internalFormat = PixelFormat$1.RGBA_ASTC;
        transcoderFormat = BasisFormat.cTFASTC_4x4_RGBA;
      } else if (supportedTargetFormats.bc7) {
        internalFormat = PixelFormat$1.RGBA_BC7;
        transcoderFormat = BasisFormat.cTFBC7_RGBA;
      } else {
        throw new RuntimeError.RuntimeError(
          "No transcoding format target available for ETC1S compressed ktx2."
        );
      }
    } else if (dfd.colorModel === colorModelUASTC) {
      if (supportedTargetFormats.astc) {
        internalFormat = PixelFormat$1.RGBA_ASTC;
        transcoderFormat = BasisFormat.cTFASTC_4x4_RGBA;
      } else if (supportedTargetFormats.bc7) {
        internalFormat = PixelFormat$1.RGBA_BC7;
        transcoderFormat = BasisFormat.cTFBC7_RGBA;
      } else if (supportedTargetFormats.s3tc) {
        internalFormat = hasAlpha ? PixelFormat$1.RGBA_DXT5 : PixelFormat$1.RGB_DXT1;
        transcoderFormat = hasAlpha
          ? BasisFormat.cTFBC3_RGBA
          : BasisFormat.cTFBC1_RGB;
      } else if (supportedTargetFormats.etc) {
        internalFormat = hasAlpha
          ? PixelFormat$1.RGBA8_ETC2_EAC
          : PixelFormat$1.RGB8_ETC2;
        transcoderFormat = hasAlpha
          ? BasisFormat.cTFETC2_RGBA
          : BasisFormat.cTFETC1_RGB;
      } else if (supportedTargetFormats.etc1 && !hasAlpha) {
        internalFormat = PixelFormat$1.RGB_ETC1;
        transcoderFormat = BasisFormat.cTFETC1_RGB;
      } else if (supportedTargetFormats.pvrtc) {
        internalFormat = hasAlpha
          ? PixelFormat$1.RGBA_PVRTC_4BPPV1
          : PixelFormat$1.RGB_PVRTC_4BPPV1;
        transcoderFormat = hasAlpha
          ? BasisFormat.cTFPVRTC1_4_RGBA
          : BasisFormat.cTFPVRTC1_4_RGB;
      } else {
        throw new RuntimeError.RuntimeError(
          "No transcoding format target available for UASTC compressed ktx2."
        );
      }
    }

    if (!ktx2File.startTranscoding()) {
      ktx2File.close();
      ktx2File.delete();
      throw new RuntimeError.RuntimeError("startTranscoding() failed");
    }

    for (let i = 0; i < header.levels.length; ++i) {
      const level = {};
      result[i] = level;
      width = header.pixelWidth >> i;
      height = header.pixelHeight >> i;

      // Since supercompressed cubemaps are unsupported, this function
      // does not iterate over KTX2 faces and assumes faceCount = 1.

      const dstSize = ktx2File.getImageTranscodedSizeInBytes(
        i, // level index
        0, // layer index
        0, // face index
        transcoderFormat.value
      );
      const dst = new Uint8Array(dstSize);

      const transcoded = ktx2File.transcodeImage(
        dst,
        i, // level index
        0, // layer index
        0, // face index
        transcoderFormat.value,
        0, // get_alpha_for_opaque_formats
        -1, // channel0
        -1 // channel1
      );

      if (!defaultValue.defined(transcoded)) {
        throw new RuntimeError.RuntimeError("transcodeImage() failed.");
      }

      transferableObjects.push(dst.buffer);

      level[faceOrder[0]] = {
        internalFormat: internalFormat,
        width: width,
        height: height,
        levelBuffer: dst,
      };
    }

    ktx2File.close();
    ktx2File.delete();
    return result;
  }

  function initWorker(compiledModule) {
    transcoderModule = compiledModule;
    transcoderModule.initializeBasis();

    self.onmessage = createTaskProcessorWorker(transcode);
    self.postMessage(true);
  }

  function transcodeKTX2(event) {
    const data = event.data;

    // Expect the first message to be to load a web assembly module
    const wasmConfig = data.webAssemblyConfig;
    if (defaultValue.defined(wasmConfig)) {
      // Require and compile WebAssembly module, or use fallback if not supported
      return require([wasmConfig.modulePath], function (mscBasisTranscoder) {
        if (defaultValue.defined(wasmConfig.wasmBinaryFile)) {
          if (!defaultValue.defined(mscBasisTranscoder)) {
            mscBasisTranscoder = self.MSC_TRANSCODER;
          }

          mscBasisTranscoder(wasmConfig).then(function (compiledModule) {
            initWorker(compiledModule);
          });
        } else {
          return mscBasisTranscoder().then(function (transcoder) {
            initWorker(transcoder);
          });
        }
      });
    }
  }

  return transcodeKTX2;

}));
